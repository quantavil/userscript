import { cancelPendingMove, getMoveRevision } from '../board/input.js';
import { clearArrows, drawArrow, drawMultiPvArrows } from '../board/overlays.js';
import { formatMove } from '../chess/notation.js';
import { countLegalMoves, hasLegalMoves, parseRules, predictFen } from '../chess/position.js';
import type { Evaluation, MultiPvLine } from '../chess/types';
import { getVariantDefinition } from '../chess/variants.js';
import { lookupBookMove } from '../engine/book/lookup.js';
import {
  LIVE_MULTI_PV,
  MADMAN_DISCOVERY_MIN_BUDGET_MS,
  MADMAN_MULTI_PV,
  MAX_AUTOMATIC_RETRIES,
  PREMOVE_PONDER_BRANCHES,
  PREMOVE_PONDER_DEPTH,
} from '../engine/config.js';
import { MadmanPremoveCache, type MadmanPremoveEntry, prepareMadmanPremoves } from '../engine/madman-premove.js';
import { analyzeMadman } from '../engine/madman-search.js';
import {
  type ArmedPremoveMap,
  fenKey,
  isLegalMove,
  selectBookPremoveReplies,
  selectOpponentTurnPremove,
  selectOwnTurnChainPremove,
} from '../engine/premove.js';
import type { AnalysisResult, BestLine, PositionHistory } from '../engine/service.js';
import { cancelPonder, getAnalysis, parseBestLine, ponderPosition } from '../engine/service.js';
import { isTablebaseEligible, lookupTablebase, type TablebaseResponse } from '../engine/tablebase.js';
import { selectThrottledMove } from '../engine/throttle.js';
import { calculateMoveDelay } from '../engine/timing.js';
import { confirmSiteMove, type MoveConfirmation } from '../game/confirmation.js';
import { MAX_TARGET_ELO } from '../settings/schema.js';
import { scoreToDisplay } from '../shared/utils.js';
import { getSite } from '../sites/registry.js';
import type { GameSnapshot, MoveRequest, SiteAdapter } from '../sites/types.js';
import { ui } from '../ui/mount.js';
import { BotState, clearRecommendation } from './state.js';

let revision = 0;
let active: AbortController | null = null;
let processed: { kind: string; fen: string; identity: object } | null = null;
let anticipatedPonder: { fromFen: string; targetFen: string; history?: PositionHistory } | null = null;
let armedPremove: ArmedPremoveMap | null = null;
const madmanPremoves = new MadmanPremoveCache();
const madmanSettingsKey = () =>
  JSON.stringify([
    BotState.madmanMode,
    BotState.premove,
    BotState.botPower,
    BotState.moveTime,
    BotState.openingBook,
    BotState.ponderEnabled,
  ]);
let pendingConfirmation: { identity: object; requestController: AbortController } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryIdentity: object | null = null;
let lastEvalRecord: { identity: object; plyKey: string } | null = null;
const retryCounts = new Map<string, number>();

export function resetRecovery(): void {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
  retryIdentity = null;
  retryCounts.clear();
  madmanPremoves.clear();
  armedPremove = null;
}

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
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
  active?.abort();
  active = null;
  processed = null;
  if (!preservePonderFen) {
    armedPremove = null;
    madmanPremoves.clear();
  } else {
    madmanPremoves.preserve(preservePonderFen);
  }
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

  const legalCount = countLegalMoves(fen, snapshot.variant);
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
  if (retryIdentity !== snapshot.identity) {
    resetRecovery();
    retryIdentity = snapshot.identity;
    lastEvalRecord = null;
  }
  if (snapshot.phase !== 'live' || snapshot.fen !== fen) return;
  if (kind === 'main' && snapshot.sideToMove !== snapshot.playerColor) return;
  if (kind === 'main' && !snapshot.inputReady) return;
  const wasProcessed = processed?.kind === kind && processed.fen === fen && processed.identity === snapshot.identity;
  if (wasProcessed) return;

  active?.abort();
  if (kind !== 'main' && !BotState.ponderEnabled && !BotState.premove) {
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
  let moveDispatched = false;
  const retryKey = `${fen}|${snapshot.history?.startFen ?? ''}|${snapshot.history?.moves.join(' ') ?? ''}`;
  const positionIsCurrent = () =>
    id === revision && !ctrl.signal.aborted && !!BotState.hackEnabled && !!matchingSnapshot(site, identity, fen);
  const current = () => positionIsCurrent() && inputRevision === getMoveRevision();
  if (!current()) return;
  active = ctrl;
  try {
    const started = performance.now();
    const budget =
      kind === 'main' ? searchBudget(snapshot, fen) : BotState.premove ? 0 : Math.max(25, BotState.moveTime);
    BotState.statusInfo = kind === 'main' ? 'Analyzing...' : 'Pondering...';
    ui.updateDisplay();
    const history = requestHistory(snapshot);
    const madman = Boolean(BotState.madmanMode);
    const madmanContext = { identity, settings: madmanSettingsKey(), history, variant: snapshot.variant };
    if (!madman || !BotState.premove) madmanPremoves.clear();
    if (kind !== 'main' && madman && BotState.premove) {
      await prepareMadmanPremoves(fen, madmanContext, {
        captureMoves: madmanPremoves.captureHints(fen, madmanContext),
        depth: BotState.botPower,
        budget: BotState.moveTime,
        signal: ctrl.signal,
        current: () => current() && madmanSettingsKey() === madmanContext.settings,
        publish: (target, context, entry) => {
          if (current() && madmanSettingsKey() === madmanContext.settings)
            madmanPremoves.put(fen, target, context, entry);
        },
      });
      return;
    }
    let madmanLoss = 0;
    let madmanVerified = false;
    // Reserve discovery time only when there is room for a positive-time search.
    const primaryBudget =
      madman && kind === 'main' && budget >= MADMAN_DISCOVERY_MIN_BUDGET_MS
        ? Math.max(1, Math.floor(budget * 0.65))
        : budget;

    const anticipated = anticipatedPonder;
    if (kind !== 'main') {
      anticipatedPonder = null;
      if (
        !madman &&
        !BotState.premove &&
        anticipated?.fromFen === fen &&
        ponderPosition(anticipated.targetFen, BotState.botPower, anticipated.history)
      )
        return;
    } else {
      anticipatedPonder = null;
    }

    const isStandard = getVariantDefinition(snapshot.variant)?.id === 'standard';
    const suggestedBookMove =
      isStandard && kind === 'main' && BotState.openingBook
        ? lookupBookMove(fen, madman ? 'hyper-aggressive' : BotState.openingStyle)
        : null;
    const bookMove = madman ? null : suggestedBookMove;
    let premoveHit = false;
    let premoveMove: string | null = null;
    let madmanPremove: MadmanPremoveEntry | null = null;
    if (kind === 'main' && madman && BotState.premove) {
      madmanPremove = madmanPremoves.take(fen, madmanContext);
      if (madmanPremove) {
        premoveHit = true;
        premoveMove = madmanPremove.uci;
        madmanLoss = madmanPremove.cpLoss ?? 0;
      }
    }
    if (kind === 'main' && !madman && BotState.premove && armedPremove) {
      const key = fenKey(fen);
      const replyUci = armedPremove.byExpectedFen.get(key);
      armedPremove = null;
      if (replyUci && isLegalMove(fen, replyUci, snapshot.variant)) {
        premoveHit = true;
        premoveMove = replyUci;
      }
    } else if (kind === 'main') {
      armedPremove = null;
    }

    let result: AnalysisResult;
    let best: BestLine | null = null;
    let isTablebase = false;
    let tbDisplay = '';

    if (premoveHit && premoveMove) {
      result = {
        success: true,
        bestmove: premoveMove,
        depth: madmanPremove?.depth ?? 99,
        pv: madmanPremove?.pv ?? premoveMove,
        evaluation: madmanPremove?.evaluation ?? {},
      };
      best = {
        uci: premoveMove,
        pv: madmanPremove?.pv ?? premoveMove,
        score: madmanPremove?.evaluation ?? {},
      };
    } else if (bookMove) {
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
      const isTbEligible =
        isStandard && kind === 'main' && hasLegalMoves(fen, snapshot.variant) !== false && isTablebaseEligible(fen);
      let tbResult: TablebaseResponse | null = null;
      const remainingMs = snapshot.remainingMs;
      const slackMs =
        remainingMs !== undefined && remainingMs !== null
          ? Math.min(3000, Math.max(200, Math.floor(remainingMs / 20)))
          : undefined;

      const requestedMultiPv = madman
        ? MADMAN_MULTI_PV
        : kind === 'main'
          ? BotState.premove
            ? LIVE_MULTI_PV
            : undefined
          : BotState.premove
            ? PREMOVE_PONDER_BRANCHES
            : undefined;
      const requestedDepth = kind !== 'main' && BotState.premove ? PREMOVE_PONDER_DEPTH : BotState.botPower;
      const legalMoves = requestedMultiPv ? (countLegalMoves(fen, snapshot.variant) ?? undefined) : undefined;
      const onDepth =
        kind !== 'main' && !madman && BotState.premove
          ? (depth: number, lines: MultiPvLine[]) => {
              if (depth >= 1) {
                const armed = selectOpponentTurnPremove(fen, lines, snapshot.variant);
                if (armed) {
                  if (!armedPremove) {
                    armedPremove = armed;
                  } else {
                    for (const [k, v] of armed.byExpectedFen) {
                      armedPremove.byExpectedFen.set(k, v);
                    }
                  }
                }
              }
            }
          : undefined;

      if (isTbEligible) {
        const tbTimeout = Math.min(1500, Math.max(100, Math.floor((snapshot.remainingMs ?? 60000) / 4)));
        const lookupController = new AbortController();
        const analysisController = new AbortController();
        const abortBranches = () => {
          lookupController.abort();
          analysisController.abort();
        };
        ctrl.signal.addEventListener('abort', abortBranches, { once: true });
        if (ctrl.signal.aborted) abortBranches();
        const tbPromise = lookupTablebase(fen, lookupController.signal, tbTimeout).catch(() => null);
        const analysisPromise =
          requestedMultiPv !== undefined || legalMoves !== undefined || onDepth !== undefined
            ? getAnalysis(
                fen,
                BotState.botPower,
                primaryBudget,
                analysisController.signal,
                history,
                slackMs,
                snapshot.variant,
                requestedMultiPv,
                legalMoves,
                onDepth,
              )
            : getAnalysis(
                fen,
                BotState.botPower,
                primaryBudget,
                analysisController.signal,
                history,
                slackMs,
                snapshot.variant,
              );
        try {
          const winner = await Promise.any([
            tbPromise.then((tb) => {
              if (!tb?.success) throw new Error('Tablebase unavailable');
              return { kind: 'tb' as const, tb };
            }),
            analysisPromise.then((analysis) => {
              const line = parseBestLine(analysis);
              if (!line) throw new Error('Engine returned no legal move');
              return { kind: 'analysis' as const, analysis, line };
            }),
          ]).catch((error: unknown) => {
            if (error instanceof AggregateError && error.errors[1] instanceof Error) throw error.errors[1];
            throw error;
          });
          if (winner.kind === 'tb') {
            tbResult = winner.tb;
            result = {
              success: true,
              bestmove: tbResult.bestMove,
              depth: 99,
              pv: tbResult.pv,
              evaluation: tbResult.evaluation,
            };
          } else {
            result = winner.analysis;
            best = winner.line;
          }
        } finally {
          abortBranches();
          ctrl.signal.removeEventListener('abort', abortBranches);
        }
      } else {
        result =
          requestedMultiPv !== undefined || legalMoves !== undefined || onDepth !== undefined
            ? await getAnalysis(
                fen,
                requestedDepth,
                primaryBudget,
                ctrl.signal,
                history,
                slackMs,
                snapshot.variant,
                requestedMultiPv,
                legalMoves,
                onDepth,
              )
            : await getAnalysis(fen, requestedDepth, primaryBudget, ctrl.signal, history, slackMs, snapshot.variant);
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
        best = best ?? parseBestLine(result);
        if (!best) {
          if (result.bestmove === '(none)' && hasLegalMoves(fen, snapshot.variant) === false) {
            BotState.statusInfo = 'Terminal position';
            ui.updateDisplay();
            return;
          }
          throw new Error('Engine returned no legal move');
        }
      }
    }
    if (kind !== 'main') {
      if (!madman && BotState.premove && result.multiPv && result.multiPv.length > 0) {
        const armed = selectOpponentTurnPremove(fen, result.multiPv, snapshot.variant);
        if (armed) {
          if (!armedPremove) {
            armedPremove = armed;
          } else {
            for (const [k, v] of armed.byExpectedFen) {
              armedPremove.byExpectedFen.set(k, v);
            }
          }
        }
      }
      const predicted = predictFen(fen, best.uci, snapshot.variant);
      if (predicted) {
        const predictedHistory = history ? { ...history, moves: [...history.moves, best.uci] } : undefined;
        ponderPosition(predicted, BotState.botPower, predictedHistory);
      }
      return;
    }

    if (madman && !isTablebase && !premoveHit) {
      const selection = await analyzeMadman(fen, best, {
        depth: BotState.botPower,
        budget,
        deadline: started + budget,
        signal: ctrl.signal,
        history,
        variant: snapshot.variant,
        bookMove: suggestedBookMove,
        expectedCount: Math.min(MADMAN_MULTI_PV, countLegalMoves(fen, snapshot.variant) ?? MADMAN_MULTI_PV),
      });
      if (!current()) return;
      if (selection) {
        best.uci = selection.chosenLine.uci;
        best.pv = selection.chosenLine.pv;
        best.score = selection.chosenLine.evaluation;
        best.multiPv = selection.lines;
        madmanLoss = selection.cpLoss;
        madmanVerified = selection.verifiedOffer;
      }
    }

    if (
      !madman &&
      !bookMove &&
      !isTablebase &&
      best.multiPv &&
      best.multiPv.length > 1 &&
      BotState.targetElo > 0 &&
      BotState.targetElo < MAX_TARGET_ELO
    ) {
      const throttled = selectThrottledMove(best.multiPv, {
        targetElo: BotState.targetElo,
        blunderShield: !!BotState.blunderShield,
        sideToMove: snapshot.sideToMove,
      });
      if (throttled.uci && throttled.uci !== best.uci) {
        best.uci = throttled.uci;
        best.pv = throttled.pv;
        best.score = throttled.evaluation;
        const chosenIndex = best.multiPv.findIndex((line) => line.uci === throttled.uci);
        if (chosenIndex > 0) {
          const chosen = best.multiPv[chosenIndex];
          best.multiPv = [chosen, ...best.multiPv.filter((_, idx) => idx !== chosenIndex)];
        }
      }
    }

    if (!madman && BotState.premove && !premoveHit && !isTablebase && best.multiPv && best.multiPv.length > 0) {
      const chainResult = selectOwnTurnChainPremove(fen, best.multiPv, snapshot.variant);
      if (chainResult.bestMoveUci && chainResult.bestMoveUci !== best.uci) {
        best.uci = chainResult.bestMoveUci;
        const matchingPv = best.multiPv.find((line) => line.uci === chainResult.bestMoveUci);
        if (matchingPv) {
          best.pv = matchingPv.pv;
          best.score = matchingPv.evaluation;
        }
      }
      if (chainResult.armed) {
        armedPremove = chainResult.armed;
      }
    }

    const currentPosition = matchingSnapshot(site, identity, fen);
    const nextFen = predictFen(fen, best.uci, snapshot.variant);
    const isSupportedRules = !snapshot.variant || Boolean(parseRules(snapshot.variant));
    if ((isSupportedRules && !nextFen) || fen.split(' ')[1] !== snapshot.playerColor)
      throw new Error('Engine move failed position validation');

    if (
      !madman &&
      BotState.premove &&
      !premoveHit &&
      !isTablebase &&
      !armedPremove &&
      bookMove &&
      isStandard &&
      nextFen
    ) {
      const bookArmed = selectBookPremoveReplies(nextFen, BotState.openingStyle);
      if (bookArmed) {
        armedPremove = bookArmed;
      }
    }

    const pvMoves = best.pv.split(/\s+/);
    const predictedReply = pvMoves[0] === best.uci ? pvMoves[1] : undefined;
    const targetFen = predictedReply && nextFen ? predictFen(nextFen, predictedReply, snapshot.variant) : null;
    if (!madman && !BotState.premove && isStandard && BotState.ponderEnabled && targetFen && nextFen) {
      anticipatedPonder = {
        fromFen: nextFen,
        targetFen,
        ...(history ? { history: { ...history, moves: [...history.moves, best.uci, predictedReply as string] } } : {}),
      };
    }

    BotState.bestMove = best.uci;
    BotState.principalVariation = best.pv;
    if (best.multiPv && best.multiPv.length > 0) {
      BotState.multiPvLines = best.multiPv.map((line) => ({
        ...line,
        evaluation: scoreForWhite(line.evaluation, snapshot.sideToMove),
      }));
    }
    if (!premoveHit || madmanPremove) {
      BotState.currentEvaluation = bookMove
        ? 'Book'
        : isTablebase
          ? tbDisplay
          : scoreToDisplay(scoreForWhite(best.score, snapshot.sideToMove));
    }
    if (!bookMove && !premoveHit && (typeof best.score.cp === 'number' || typeof best.score.mate === 'number')) {
      const whiteScore = scoreForWhite(best.score, snapshot.sideToMove);
      let numEval = 0;
      if (typeof whiteScore.mate === 'number') {
        numEval = whiteScore.mate > 0 ? 10 : -10;
      } else if (typeof whiteScore.cp === 'number') {
        numEval = whiteScore.cp / 100;
      }
      const plyKey = snapshot.history ? `${snapshot.history.moves.length}` : fen;
      const currentHistory = BotState.evalHistory ?? [];
      if (lastEvalRecord?.identity === identity && lastEvalRecord.plyKey === plyKey && currentHistory.length > 0) {
        BotState.evalHistory = [...currentHistory.slice(0, -1), numEval];
      } else {
        BotState.evalHistory = [...currentHistory, numEval].slice(-40);
        lastEvalRecord = { identity, plyKey };
      }
    }
    BotState.statusInfo = premoveHit
      ? `Ready · Premove · ${Math.round(performance.now() - started)} ms`
      : bookMove
        ? `Ready · Book · ${Math.round(performance.now() - started)} ms`
        : isTablebase
          ? `Ready · Tablebase · ${Math.round(performance.now() - started)} ms`
          : `Ready · D${result.depth} · ${Math.round(performance.now() - started)} ms`;

    if (madman && !isTablebase) {
      BotState.statusInfo += ` · Madman${madmanPremove ? ` · ${madmanPremove.source}` : ''}${madmanLoss > 0 ? ` · -${Math.round(madmanLoss)} cp` : ''}${madmanVerified ? ' · bait checked' : ''}`;
    }
    if (best.multiPv && best.multiPv.length > 0) {
      drawMultiPvArrows(best.multiPv);
    } else {
      clearArrows();
      drawArrow(best.uci.slice(0, 2), best.uci.slice(2, 4), 'rgba(100,255,100,0.7)', 3);
    }
    ui.updateDisplay();
    if (!BotState.autoMove || !current() || !currentPosition?.inputReady) return;

    const isInstant = premoveHit || (BotState.premove && Boolean(bookMove));
    if (!isInstant && !(madman && BotState.premove) && BotState.timingMode === 'dynamic') {
      const candidateScores = best.multiPv?.map((line) => {
        if (typeof line.evaluation.mate === 'number') return line.evaluation.mate > 0 ? 1000 : -1000;
        return line.evaluation.cp ?? 0;
      });
      const delay = calculateMoveDelay({
        baseTimeMs: bookMove ? 150 : budget,
        remainingMs: snapshot.remainingMs,
        legalMovesCount: countLegalMoves(fen, snapshot.variant),
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
      expectedFen: nextFen ?? fen,
      expectedPly: requestPly(snapshot),
      variant: snapshot.variant,
      onDispatch: () => {
        moveDispatched = true;
      },
      signal: requestController.signal,
      isCurrent: () => current() && matchingSnapshot(site, identity, fen)?.inputReady === true,
    };
    pendingConfirmation = { identity, requestController };
    const confirmation = confirmSiteMove(moveRequest, site);
    let initiated = false;
    let observed: MoveConfirmation = { status: 'failed' };
    try {
      initiated = await site.submitMove(moveRequest);
      if (!initiated) {
        requestController.abort();
        observed = { status: 'failed' };
      } else {
        observed = await confirmation;
        if (
          observed.status !== 'failed' &&
          madman &&
          BotState.premove &&
          retryIdentity === identity &&
          madmanSettingsKey() === madmanContext.settings
        ) {
          madmanPremoves.seed(fen, best, madmanContext);
        }
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
    if (observed.status !== 'failed') {
      BotState.recoveryAction = null;
      const premoveTag = isInstant ? ' · premove' : '';
      ui.log(formatMove(fen, best.uci, snapshot.variant) + premoveTag, 'move');
    } else if (positionIsCurrent()) {
      anticipatedPonder = null;
      clearArrows();
      clearRecommendation();
      if (inputRevision !== getMoveRevision()) {
        BotState.recoveryAction = 'resume';
        BotState.statusInfo = 'Paused after board interaction';
      } else {
        BotState.recoveryAction = 'retry';
        BotState.statusInfo = initiated ? 'Move was not confirmed' : 'Move input failed';
        if (!initiated && !moveDispatched && BotState.autoRetry && BotState.hackEnabled) {
          triggerAutoRetry(fen, identity, retryKey, id);
        }
      }
      ui.updateDisplay();
    }
  } catch (error) {
    if (!current() || ctrl.signal.aborted) return;
    clearArrows();
    clearRecommendation();
    BotState.recoveryAction = 'retry';
    BotState.statusInfo = error instanceof Error ? error.message : 'Engine failed';
    if (!moveDispatched && BotState.autoRetry && BotState.hackEnabled) {
      triggerAutoRetry(fen, identity, retryKey, id);
    }
    ui.updateDisplay();
  } finally {
    if (active === ctrl) active = null;
  }
}

function triggerAutoRetry(failedFen: string, identity: object, key: string, failedRevision: number): void {
  const count = retryCounts.get(key) ?? 0;
  if (count >= MAX_AUTOMATIC_RETRIES) {
    BotState.statusInfo += ' · automatic retries exhausted';
    return;
  }
  retryCounts.set(key, count + 1);
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = setTimeout(
    () => {
      retryTimer = null;
      if (
        revision !== failedRevision ||
        retryIdentity !== identity ||
        !BotState.autoRetry ||
        !BotState.hackEnabled ||
        BotState.recoveryAction !== 'retry'
      )
        return;
      const site = getSite();
      if (!site || !matchingSnapshot(site, identity, failedFen)?.inputReady) return;
      if (processed?.fen === failedFen && processed.identity === identity) processed = null;
      BotState.recoveryAction = null;
      void scheduleAnalysis('main', failedFen);
    },
    300 * 2 ** count,
  );
}
