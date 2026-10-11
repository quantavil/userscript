import {
  cancelPendingMove,
  clearArrows,
  confirmSiteMove,
  drawArrow,
  drawMultiPvArrows,
  getMoveRevision,
} from '../board.js';
import { getSite } from '../sites/index.js';
import type { GameSnapshot, MoveRequest, SiteAdapter } from '../sites/types.js';
import { BotState, pa } from '../state.js';
import type { Evaluation } from '../types/chess';
import { ui } from '../ui.js';
import { scoreToDisplay } from '../utils.js';
import type { AnalysisResult, BestLine, PositionHistory } from './analysis.js';
import {
  cancelPonder,
  countLegalMoves,
  getAnalysis,
  hasLegalMoves,
  parseBestLine,
  ponderPosition,
  predictFen,
} from './analysis.js';
import { lookupBookMove } from './book.js';
import { formatMove } from './san.js';
import { isTablebaseEligible, lookupTablebase, type TablebaseResponse } from './tablebase.js';
import { selectThrottledMove } from './throttle.js';
import { calculateMoveDelay } from './timing.js';

let revision = 0;
let active: AbortController | null = null;
let processed: { kind: string; fen: string; identity: object } | null = null;
let anticipatedPonder: { fromFen: string; targetFen: string; history?: PositionHistory } | null = null;
let pendingConfirmation: { identity: object; requestController: AbortController } | null = null;
const confirmationSettledListeners = new Set<() => void>();

function delayMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function scoreForWhite(score: Evaluation, sideToMove: string | undefined): Evaluation {
  if (sideToMove !== 'b') return score;
  return {
    ...(typeof score.cp === 'number' ? { cp: -score.cp } : {}),
    ...(typeof score.mate === 'number' ? { mate: -score.mate } : {}),
  };
}

function matchingSnapshot(site: SiteAdapter, identity: object, fen: string): GameSnapshot | null {
  const read = site.read();
  if (
    read.kind !== 'game' ||
    read.snapshot.identity !== identity ||
    read.snapshot.fen !== fen ||
    read.snapshot.phase !== 'live'
  )
    return null;
  return read.snapshot;
}

export function isMoveConfirmationPending(identity: object): boolean {
  return pendingConfirmation?.identity === identity && !pendingConfirmation.requestController.signal.aborted;
}

export function onMoveConfirmationSettled(listener: () => void): () => void {
  confirmationSettledListeners.add(listener);
  return () => confirmationSettledListeners.delete(listener);
}

export function cancelAnalysis(preservePonderFen?: string): void {
  revision++;
  active?.abort();
  active = null;
  processed = null;
  if (pendingConfirmation) pendingConfirmation.requestController.abort();
  pendingConfirmation = null;
  if (!anticipatedPonder || anticipatedPonder.fromFen !== preservePonderFen) anticipatedPonder = null;
  cancelPonder(preservePonderFen);
  cancelPendingMove();
}

function searchBudget(snapshot: GameSnapshot, fen?: string): number {
  const configured = Math.max(25, BotState.moveTime);
  const baseBudget =
    snapshot.remainingMs === null
      ? configured
      : Math.max(1, Math.floor(Math.min(configured, snapshot.remainingMs / 40) - 12));

  if (BotState.timingMode === 'fixed' || !fen) return baseBudget;

  const legalCount = countLegalMoves(fen);
  if (legalCount === 1) {
    return Math.max(25, Math.min(baseBudget, Math.round(baseBudget * 0.2)));
  }

  return baseBudget;
}

function requestPly(snapshot: GameSnapshot): number | null {
  return snapshot.history ? snapshot.history.moves.length + 1 : null;
}

function requestHistory(snapshot: GameSnapshot): PositionHistory | undefined {
  return snapshot.history ? { startFen: snapshot.history.startFen, moves: [...snapshot.history.moves] } : undefined;
}

export async function scheduleAnalysis(kind: string, fen: string): Promise<void> {
  const site = getSite();
  if (!BotState.hackEnabled || !site) return;
  const read = site.read();
  if (read.kind !== 'game') return;
  const snapshot = read.snapshot;
  if (snapshot.phase !== 'live' || snapshot.fen !== fen) return;
  if (kind === 'main' && snapshot.sideToMove !== snapshot.playerColor) return;
  if (kind === 'main' && !snapshot.inputReady) return;
  const wasProcessed = processed?.kind === kind && processed.fen === fen && processed.identity === snapshot.identity;
  if (wasProcessed) return;

  active?.abort();
  if (kind !== 'main' && !BotState.ponderEnabled) {
    cancelPonder();
    anticipatedPonder = null;
    processed = { kind, fen, identity: snapshot.identity };
    return;
  }
  cancelPonder(fen);
  const id = ++revision;
  const ctrl = new AbortController();
  processed = { kind, fen, identity: snapshot.identity };
  const inputRevision = getMoveRevision();
  const identity = snapshot.identity;
  const positionIsCurrent = () =>
    id === revision && !ctrl.signal.aborted && !!BotState.hackEnabled && !!matchingSnapshot(site, identity, fen);
  const current = () => positionIsCurrent() && inputRevision === getMoveRevision();
  if (!current()) return;
  active = ctrl;
  try {
    const started = performance.now();
    const budget = kind === 'main' ? searchBudget(snapshot, fen) : Math.max(25, BotState.moveTime);
    BotState.statusInfo = kind === 'main' ? 'Analyzing...' : 'Pondering...';
    ui.updateDisplay(pa());
    const history = requestHistory(snapshot);

    const anticipated = anticipatedPonder;
    if (kind !== 'main') {
      anticipatedPonder = null;
      if (anticipated?.fromFen === fen && ponderPosition(anticipated.targetFen, BotState.botPower, anticipated.history))
        return;
    } else {
      anticipatedPonder = null;
    }

    const bookMove = kind === 'main' && BotState.openingBook ? lookupBookMove(fen, BotState.openingStyle) : null;
    let result: AnalysisResult;
    let best: BestLine | null = null;
    let isTablebase = false;
    let tbDisplay = '';

    if (bookMove) {
      result = {
        success: true,
        bestmove: bookMove,
        depth: 99,
        pv: bookMove,
        evaluation: { cp: 20 },
      };
      best = {
        uci: bookMove,
        pv: bookMove,
        score: { cp: 20 },
      };
    } else {
      const isTbEligible = kind === 'main' && hasLegalMoves(fen) !== false && isTablebaseEligible(fen);
      let tbResult: TablebaseResponse | null = null;

      if (isTbEligible) {
        const tbTimeout = Math.min(1500, Math.max(100, Math.floor((snapshot.remainingMs ?? 60000) / 4)));
        const tbPromise = lookupTablebase(fen, ctrl.signal, tbTimeout).catch(() => null);
        const analysisPromise = getAnalysis(fen, BotState.botPower, budget, ctrl.signal, history);

        const winner = await Promise.race([
          tbPromise.then((tb) => (tb?.success ? { kind: 'tb' as const, tb } : null)),
          analysisPromise.then((analysis) => ({ kind: 'analysis' as const, analysis })),
        ]);

        if (winner?.kind === 'tb') {
          tbResult = winner.tb;
          result = {
            success: true,
            bestmove: tbResult.bestMove,
            depth: 99,
            pv: tbResult.pv,
            evaluation: tbResult.evaluation,
          };
        } else if (winner?.kind === 'analysis') {
          result = winner.analysis;
          const graceMs = Math.min(200, Math.max(0, Math.floor((snapshot.remainingMs ?? 60000) / 20)));
          if (graceMs > 0) {
            const fastTb = await Promise.race([tbPromise, delayMs(graceMs, ctrl.signal).then(() => null)]);
            if (fastTb?.success) tbResult = fastTb;
          }
        } else {
          result = await analysisPromise;
        }
      } else {
        result = await getAnalysis(fen, BotState.botPower, budget, ctrl.signal, history);
      }

      if (!current()) return;

      if (tbResult?.success) {
        isTablebase = true;
        tbDisplay = tbResult.displayEval;
        best = {
          uci: tbResult.bestMove,
          pv: tbResult.pv,
          score: tbResult.evaluation,
        };
      } else {
        best = parseBestLine(result);
        if (!best) {
          if (result.bestmove === '(none)' && hasLegalMoves(fen) === false) {
            BotState.statusInfo = 'Terminal position';
            ui.updateDisplay(pa());
            return;
          }
          throw new Error('Engine returned no legal move');
        }
      }
    }
    if (kind !== 'main') {
      const predicted = predictFen(fen, best.uci);
      if (predicted) {
        const predictedHistory = history ? { ...history, moves: [...history.moves, best.uci] } : undefined;
        ponderPosition(predicted, BotState.botPower, predictedHistory);
      }
      return;
    }

    if (!bookMove && !isTablebase && best.multiPv && best.multiPv.length > 1 && BotState.targetElo > 0) {
      const throttled = selectThrottledMove(best.multiPv, {
        targetElo: BotState.targetElo,
        blunderShield: !!BotState.blunderShield,
        sideToMove: snapshot.sideToMove,
      });
      if (throttled.uci && throttled.uci !== best.uci) {
        best.uci = throttled.uci;
      }
    }

    const currentPosition = matchingSnapshot(site, identity, fen);
    const nextFen = predictFen(fen, best.uci);
    if (!nextFen || fen.split(' ')[1] !== snapshot.playerColor)
      throw new Error('Engine move failed position validation');

    const pvMoves = best.pv.split(/\s+/);
    const predictedReply = pvMoves[0] === best.uci ? pvMoves[1] : undefined;
    const targetFen = predictedReply ? predictFen(nextFen, predictedReply) : null;
    if (BotState.ponderEnabled && targetFen) {
      anticipatedPonder = {
        fromFen: nextFen,
        targetFen,
        ...(history ? { history: { ...history, moves: [...history.moves, best.uci, predictedReply as string] } } : {}),
      };
    }

    BotState.bestMove = best.uci;
    BotState.principalVariation = best.pv;
    BotState.multiPvLines = best.multiPv?.map((line) => ({
      ...line,
      evaluation: scoreForWhite(line.evaluation, snapshot.sideToMove),
    }));
    BotState.currentEvaluation = bookMove
      ? 'Book'
      : isTablebase
        ? tbDisplay
        : scoreToDisplay(scoreForWhite(best.score, snapshot.sideToMove));
    if (!bookMove) {
      const whiteScore = scoreForWhite(best.score, snapshot.sideToMove);
      let numEval = 0;
      if (typeof whiteScore.mate === 'number') {
        numEval = whiteScore.mate > 0 ? 10 : -10;
      } else if (typeof whiteScore.cp === 'number') {
        numEval = whiteScore.cp / 100;
      }
      BotState.evalHistory = [...(BotState.evalHistory ?? []), numEval].slice(-40);
    }
    BotState.statusInfo = bookMove
      ? `Ready · Book · ${Math.round(performance.now() - started)} ms`
      : isTablebase
        ? `Ready · Tablebase · ${Math.round(performance.now() - started)} ms`
        : `Ready · D${result.depth} · ${Math.round(performance.now() - started)} ms`;

    if (best.multiPv && best.multiPv.length > 0) {
      drawMultiPvArrows(best.multiPv);
    } else {
      clearArrows();
      drawArrow(best.uci.slice(0, 2), best.uci.slice(2, 4), 'rgba(100,255,100,0.7)', 3);
    }
    ui.updateDisplay(pa());
    if (!BotState.autoMove || !current() || !currentPosition?.inputReady) return;

    if (BotState.timingMode === 'dynamic') {
      const candidateScores = best.multiPv?.map((line) => {
        if (typeof line.evaluation.mate === 'number') return line.evaluation.mate > 0 ? 1000 : -1000;
        return line.evaluation.cp ?? 0;
      });
      const delay = calculateMoveDelay({
        baseTimeMs: bookMove ? 150 : budget,
        remainingMs: snapshot.remainingMs,
        legalMovesCount: countLegalMoves(fen),
        candidateScores,
      });
      const elapsed = performance.now() - started;
      const remainingWait = Math.max(0, delay - elapsed);
      if (remainingWait > 0) {
        await delayMs(remainingWait, ctrl.signal);
        if (!current()) return;
      }
    }

    const requestController = new AbortController();
    const abortRequest = () => requestController.abort();
    ctrl.signal.addEventListener('abort', abortRequest, { once: true });
    const moveRequest: MoveRequest = {
      identity,
      fromFen: fen,
      uci: best.uci,
      expectedFen: nextFen,
      expectedPly: requestPly(snapshot),
      signal: requestController.signal,
      isCurrent: () => current() && matchingSnapshot(site, identity, fen)?.inputReady === true,
    };
    pendingConfirmation = { identity, requestController };
    const confirmation = confirmSiteMove(moveRequest, site);
    let initiated = false;
    let accepted = false;
    try {
      initiated = await site.submitMove(moveRequest);
      if (!initiated) {
        requestController.abort();
        accepted = false;
      } else {
        accepted = await confirmation;
      }
    } finally {
      ctrl.signal.removeEventListener('abort', abortRequest);
      requestController.abort();
      if (pendingConfirmation?.requestController === requestController) {
        pendingConfirmation = null;
        for (const listener of [...confirmationSettledListeners]) {
          try {
            listener();
          } catch (error) {
            console.error('Super Chess Bot: confirmation listener failed.', error);
          }
        }
      }
    }
    if (accepted) {
      BotState.recoveryAction = null;
      ui.log(formatMove(fen, best.uci), 'move');
    } else if (positionIsCurrent()) {
      anticipatedPonder = null;
      clearArrows();
      BotState.bestMove = '-';
      BotState.currentEvaluation = '-';
      BotState.principalVariation = '-';
      if (inputRevision !== getMoveRevision()) {
        BotState.recoveryAction = 'resume';
        BotState.statusInfo = 'Paused after board interaction';
      } else {
        BotState.recoveryAction = 'retry';
        BotState.statusInfo = initiated ? 'Move was not confirmed' : 'Move input failed';
        if (BotState.autoRetry && BotState.hackEnabled) {
          triggerAutoRetry(fen);
        }
      }
      ui.updateDisplay(pa());
    }
  } catch (error) {
    if (!current() || ctrl.signal.aborted) return;
    clearArrows();
    BotState.bestMove = '-';
    BotState.currentEvaluation = '-';
    BotState.principalVariation = '-';
    BotState.recoveryAction = 'retry';
    BotState.statusInfo = error instanceof Error ? error.message : 'Engine failed';
    if (BotState.autoRetry && BotState.hackEnabled) {
      triggerAutoRetry(fen);
    }
    ui.updateDisplay(pa());
  } finally {
    if (active === ctrl) active = null;
  }
}

function triggerAutoRetry(failedFen: string): void {
  setTimeout(() => {
    if (BotState.recoveryAction === 'retry' && BotState.hackEnabled) {
      if (processed?.fen === failedFen) {
        processed = null;
      }
      BotState.recoveryAction = null;
      void scheduleAnalysis('main', failedFen);
    }
  }, 300);
}
