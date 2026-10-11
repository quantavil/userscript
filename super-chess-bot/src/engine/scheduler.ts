import { cancelPendingMove, clearArrows, confirmSiteMove, drawArrow, getMoveRevision } from '../board.js';
import { getSite } from '../sites/index.js';
import type { GameSnapshot, MoveRequest, SiteAdapter } from '../sites/types.js';
import { BotState, pa } from '../state.js';
import type { Evaluation } from '../types/chess';
import { ui } from '../ui.js';
import { scoreToDisplay } from '../utils.js';
import type { AnalysisResult, BestLine, PositionHistory } from './analysis.js';
import { cancelPonder, getAnalysis, hasLegalMoves, parseBestLine, ponderPosition, predictFen } from './analysis.js';
import { lookupBookMove } from './book.js';
import { formatMove } from './san.js';

let revision = 0;
let active: AbortController | null = null;
let processed: { kind: string; fen: string; identity: object } | null = null;
let anticipatedPonder: { fromFen: string; targetFen: string; history?: PositionHistory } | null = null;
let pendingConfirmation: { identity: object; requestController: AbortController } | null = null;
const confirmationSettledListeners = new Set<() => void>();

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

function searchBudget(snapshot: GameSnapshot): number {
  const configured = Math.max(25, BotState.moveTime);
  if (snapshot.remainingMs === null) return configured;
  return Math.max(1, Math.floor(Math.min(configured, snapshot.remainingMs / 40) - 12));
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
    const budget = kind === 'main' ? searchBudget(snapshot) : Math.max(25, BotState.moveTime);
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
      result = await getAnalysis(fen, BotState.botPower, budget, ctrl.signal, history);
      if (!current()) return;
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
    if (kind !== 'main') {
      const predicted = predictFen(fen, best.uci);
      if (predicted) {
        const predictedHistory = history ? { ...history, moves: [...history.moves, best.uci] } : undefined;
        ponderPosition(predicted, BotState.botPower, predictedHistory);
      }
      return;
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
    BotState.currentEvaluation = bookMove ? 'Book' : scoreToDisplay(scoreForWhite(best.score, snapshot.sideToMove));
    BotState.statusInfo = bookMove
      ? `Ready · Book · ${Math.round(performance.now() - started)} ms`
      : `Ready · D${result.depth} · ${Math.round(performance.now() - started)} ms`;
    clearArrows();
    drawArrow(best.uci.slice(0, 2), best.uci.slice(2, 4), 'rgba(100,255,100,0.7)', 3);
    ui.updateDisplay(pa());
    if (!BotState.autoMove || !current() || !currentPosition?.inputReady) return;

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
    ui.updateDisplay(pa());
  } finally {
    if (active === ctrl) active = null;
  }
}
