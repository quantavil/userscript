import { signal } from '@preact/signals';
import { getAnalysis } from '../engine/analysis.js';
import type { GameMoveRecord } from '../game-history.js';
import type { PositionHistory } from '../history.js';
import { type AnalyzedPly, CPL_CAP, classifyByLoss, moveAccuracy, winPercent } from './accuracy.js';
import { buildGameReport, type GameReport } from './aggregate.js';

/**
 * Fixed search budget for the report pass.
 *
 * This deliberately does not reuse `BotState.moveTime` or `BotState.botPower`: the live move
 * budget is tuned for speed under a game clock and usually stops in the low depths, which are
 * far too shallow to tell an inaccuracy from a mistake. The report wants a stable depth instead
 * of a stable duration.
 */
const REPORT_DEPTH = 18;
const REPORT_TIME_MS = 350;

export interface ReportProgress {
  running: boolean;
  done: boolean;
  analyzed: number;
  total: number;
  report: GameReport | null;
}

const initial: ReportProgress = { running: false, done: false, analyzed: 0, total: 0, report: null };
export const gameReportSignal = signal<ReportProgress>(initial);

let active: AbortController | null = null;
let lastKey = '';

/** Convert a side-to-move evaluation into centipawns from that same side's point of view. */
function toCp(score: { cp?: number; mate?: number }): number {
  if (typeof score.mate === 'number' && Number.isFinite(score.mate)) {
    return score.mate > 0 ? CPL_CAP : -CPL_CAP;
  }
  if (typeof score.cp === 'number' && Number.isFinite(score.cp)) {
    return Math.max(-CPL_CAP, Math.min(CPL_CAP, score.cp));
  }
  return 0;
}

/**
 * Score one ply from the mover's point of view.
 *
 * `before` is the engine's best evaluation while the mover is to move, so it is already the
 * mover's view. `after` comes from the position the move produced, where the opponent is to
 * move, so it is negated to come back to the mover's view.
 */
function scorePly(before: number, afterOpponentView: number) {
  const after = -afterOpponentView;
  const cpLoss = Math.max(0, Math.min(CPL_CAP, before - after));
  const wpBefore = winPercent(before);
  const wpAfter = winPercent(after);
  const accuracy = Math.min(100, Math.max(0, moveAccuracy(wpBefore, wpAfter)));
  return { cpLoss, accuracy, verdict: classifyByLoss(cpLoss) };
}

/**
 * Analyze every recorded ply and publish the aggregate report.
 *
 * This only runs once the round is no longer live, so it can never compete with move input for
 * the single serialized UCI client. Each ply needs the evaluation of the position it was played
 * from and the position it produced, so the pass searches every position in the line exactly
 * once and pairs the results afterwards.
 */
export async function runGameReport(
  moves: readonly GameMoveRecord[],
  startFen: string,
  gameId: string,
  depth = REPORT_DEPTH,
  force = false,
): Promise<void> {
  if (moves.length === 0) {
    gameReportSignal.value = initial;
    lastKey = '';
    return;
  }
  const key = `${gameId}:${moves.length}:${depth}`;
  if (key === lastKey && !force) return;
  lastKey = key;

  active?.abort();
  const ctrl = new AbortController();
  active = ctrl;
  gameReportSignal.value = { running: true, done: false, analyzed: 0, total: moves.length, report: null };

  // Position 0 is the root; position i is the position after move i.
  const positions: string[] = [startFen, ...moves.map((move) => move.fen)];
  const scores: number[] = [];

  try {
    for (let i = 0; i < positions.length; i++) {
      if (ctrl.signal.aborted) return;
      const history: PositionHistory = {
        startFen,
        moves: moves.slice(0, i).map((move) => move.uci),
      };
      const result = await getAnalysis(positions[i], depth, REPORT_TIME_MS, ctrl.signal, history);
      if (ctrl.signal.aborted) return;
      scores.push(toCp(result.evaluation));
      if (i > 0) {
        gameReportSignal.value = { ...gameReportSignal.value, analyzed: i };
      }
    }

    const plies: AnalyzedPly[] = [];
    for (let i = 0; i < moves.length; i++) {
      const record = moves[i];
      const before = scores[i];
      const after = scores[i + 1] ?? before;
      if (before === undefined || after === undefined) continue;
      const scored = scorePly(before, after);
      plies.push({
        ply: record.ply,
        color: record.turn,
        san: record.san,
        cpLoss: scored.cpLoss,
        accuracy: scored.accuracy,
        verdict: scored.verdict,
      });
    }

    const report = buildGameReport(plies, moves.length);
    if (ctrl.signal.aborted) return;
    gameReportSignal.value = { running: false, done: true, analyzed: plies.length, total: moves.length, report };
  } catch (error) {
    if (ctrl.signal.aborted) return;
    gameReportSignal.value = {
      running: false,
      done: false,
      analyzed: 0,
      total: moves.length,
      report: null,
    };
    console.warn('Super Chess Bot: game report analysis failed.', error);
  } finally {
    if (active === ctrl) active = null;
  }
}

/** Drop the cached report so the next game starts clean. */
export function resetGameReport(): void {
  active?.abort();
  active = null;
  lastKey = '';
  gameReportSignal.value = initial;
}

/** Abort an in-flight report, used when the bot is re-enabled or the board changes. */
export function cancelGameReport(): void {
  active?.abort();
  active = null;
  gameReportSignal.value = { ...gameReportSignal.value, running: false };
}
