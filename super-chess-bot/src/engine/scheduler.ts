import { cancelPendingMove, clearArrows, drawArrow, executeMove, getMoveRevision } from '../board.js';
import { readPositionHistory } from '../history.js';
import { BotState, getFen, getGame, getPlayerColor, pa } from '../state.js';
import type { Evaluation } from '../types/chess';
import { ui } from '../ui.js';
import { scoreToDisplay } from '../utils.js';
import type { PositionHistory } from './analysis.js';
import { cancelPonder, getAnalysis, parseBestLine, ponderPosition, predictFen } from './analysis.js';
import { formatMove } from './san.js';

let revision = 0;
let active: AbortController | null = null;
let processed = '';
let anticipatedPonder: { fromFen: string; targetFen: string; history?: PositionHistory } | null = null;

function scoreForWhite(score: Evaluation, sideToMove: string | undefined): Evaluation {
  if (sideToMove !== 'b') return score;
  return {
    ...(typeof score.cp === 'number' ? { cp: -score.cp } : {}),
    ...(typeof score.mate === 'number' ? { mate: -score.mate } : {}),
  };
}

export function cancelAnalysis(preservePonderFen?: string): void {
  revision++;
  active?.abort();
  active = null;
  processed = '';
  if (!anticipatedPonder || anticipatedPonder.fromFen !== preservePonderFen) anticipatedPonder = null;
  cancelPonder(preservePonderFen);
  cancelPendingMove();
}

function searchBudget(): number {
  // Reserve input time once. Confirmation has its own bounded timeout.
  const configured = Math.max(10, BotState.moveTime);
  const clock = document
    .querySelector('.clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time')
    ?.textContent?.trim();
  let remaining = Infinity;
  if (clock) {
    if (/^\d+:\d{2}(?:\.\d+)?$/.test(clock)) {
      const [minutes, seconds] = clock.split(':').map(Number);
      remaining = (minutes * 60 + seconds) * 1000;
    } else if (/^\d+(?:\.\d+)?$/.test(clock)) {
      remaining = Number(clock) * 1000;
    }
  }
  return Math.max(1, Math.floor(Math.min(configured, remaining / 40) - 12));
}


export async function scheduleAnalysis(kind: string, fen: string): Promise<void> {
  const key = `${kind}:${fen}`;
  if (!BotState.hackEnabled || key === processed) return;
  const game = getGame();
  if (!game) return;
  active?.abort();
  if (kind !== 'main' && !BotState.ponderEnabled) {
    cancelPonder();
    anticipatedPonder = null;
    processed = key;
    return;
  }
  cancelPonder(fen);
  const id = ++revision;
  const ctrl = new AbortController();
  active = ctrl;
  processed = key;
  const inputRevision = getMoveRevision();
  const positionIsCurrent = () =>
    id === revision && !ctrl.signal.aborted && !!BotState.hackEnabled && getGame() === game && getFen(game) === fen;
  const current = () => positionIsCurrent() && inputRevision === getMoveRevision();
  if (!current()) return;
  try {
    const started = performance.now();
    const budget = searchBudget();
    BotState.statusInfo = kind === 'main' ? 'Analyzing...' : 'Pondering...';
    ui.updateDisplay(pa());
    const history = readPositionHistory(game, fen);

    const anticipated = anticipatedPonder;
    if (kind !== 'main' && anticipated?.fromFen === fen) {
      anticipatedPonder = null;
      if (ponderPosition(anticipated.targetFen, BotState.botPower, anticipated.history)) return;
    } else if (kind === 'main') {
      anticipatedPonder = null;
    }

    const result = await getAnalysis(fen, BotState.botPower, budget, ctrl.signal, history);
    if (!current()) return;
    const best = parseBestLine(result);
    if (!best) {
      if ((result as { bestmove?: string })?.bestmove === '(none)') {
        BotState.statusInfo = 'Terminal position';
        ui.updateDisplay(pa());
        return;
      }
      throw new Error('Engine returned no legal move');
    }
    if (kind !== 'main') {
      const predicted = predictFen(fen, best.uci);
      if (predicted) {
        const predictedHistory = history ? { ...history, moves: [...history.moves, best.uci] } : undefined;
        ponderPosition(predicted, BotState.botPower, predictedHistory);
      }
      return;
    }
    const nextFen = predictFen(fen, best.uci);
    if (!nextFen || fen.split(' ')[1] !== getPlayerColor(game))
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
    BotState.currentEvaluation = scoreToDisplay(scoreForWhite(best.score, fen.split(' ')[1]));
    BotState.statusInfo = `Ready · D${result.depth} · ${Math.round(performance.now() - started)} ms`;
    clearArrows();
    drawArrow(best.uci.slice(0, 2), best.uci.slice(2, 4), 'rgba(100,255,100,0.7)', 3);
    ui.updateDisplay(pa());
    if (!BotState.autoMove || !current()) return;
    const accepted = await executeMove(
      best.uci.slice(0, 2),
      best.uci.slice(2, 4),
      fen,
      best.uci[4],
      result.depth,
      undefined,
      nextFen,
    );
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
        if (!/^Move (?:input failed|not confirmed)/i.test(BotState.statusInfo)) {
          BotState.statusInfo = 'Move was not confirmed';
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
    ui.updateDisplay(pa());
    // No retry loop for the same position. Settings changes or a new position
    // explicitly reset ownership, allowing a controlled retry.
  } finally {
    if (active === ctrl) active = null;
  }
}
