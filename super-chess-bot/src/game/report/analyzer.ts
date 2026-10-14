import { signal } from '@preact/signals';
import type { PositionHistory } from '../../chess/position.js';
import type { Evaluation } from '../../chess/types.js';
import { DEFAULT_REPORT_DEPTH, REPORT_MULTI_PV } from '../../engine/config.js';
import { getAnalysis } from '../../engine/service.js';
import { getActiveSite } from '../../sites/active.js';
import type { GameMoveRecord } from '../history.js';
import {
  type AnalyzedPly,
  CPL_CAP,
  clampAccuracy,
  classifyByWinPercentLoss,
  type MoveVerdict,
  moveAccuracy,
  winPercent,
} from './accuracy.js';
import { buildGameReport, type GameReport } from './aggregate.js';

const REPORT_DEPTH = DEFAULT_REPORT_DEPTH;

export interface ReportOptions {
  variant?: string;
  isEligible?: () => boolean;
}

export interface ReportProgress {
  running: boolean;
  done: boolean;
  analyzed: number;
  total: number;
  report: GameReport | null;
  /** Set when a pass fails, so the panel can offer a retry instead of looking idle. */
  error: string | null;
}

const initial: ReportProgress = { running: false, done: false, analyzed: 0, total: 0, report: null, error: null };
export const gameReportSignal = signal<ReportProgress>(initial);

let active: AbortController | null = null;
let lastKey = '';
let activeKey = '';

/** Convert a side-to-move evaluation into centipawns from that same side's point of view. */
function toCp(score: Evaluation): number | null {
  if (typeof score.mate === 'number' && Number.isFinite(score.mate)) {
    return score.mate > 0 ? CPL_CAP : -CPL_CAP;
  }
  if (typeof score.cp === 'number' && Number.isFinite(score.cp)) {
    return Math.max(-CPL_CAP, Math.min(CPL_CAP, score.cp));
  }
  return null;
}

/**
 * Score one ply from the mover's point of view.
 *
 * `before` is the engine's best evaluation while the mover is to move, so it is already the
 * mover's view. `after` comes from the position the move produced, where the opponent is to
 * move, so it is negated to come back to the mover's view.
 *
 * Verdict and accuracy are both derived from the win percentage the move gave away, so they
 * cannot disagree: a move that reads as a near-perfect move also never reads as a mistake.
 */
function scorePly(
  before: number,
  afterOpponentView: number,
): {
  cpLoss: number;
  accuracy: number;
  verdict: MoveVerdict;
} {
  const after = -afterOpponentView;
  const cpLoss = Math.max(0, Math.min(CPL_CAP, before - after));
  const wpBefore = winPercent(before);
  const wpAfter = winPercent(after);
  return {
    cpLoss,
    accuracy: clampAccuracy(moveAccuracy(wpBefore, wpAfter)),
    verdict: classifyByWinPercentLoss(wpBefore - wpAfter),
  };
}

/**
 * Analyze every recorded ply and publish the aggregate report.
 *
 * This only runs once the round is finished, so it can never compete with move input for
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
  options: ReportOptions = {},
): Promise<void> {
  const eligible = () => {
    const read = getActiveSite()?.read();
    // No adapter means the report was requested outside a supported game, which is never eligible.
    if (!read) return false;
    return read.kind === 'game' && read.snapshot.phase === 'finished' && (options.isEligible?.() ?? true);
  };
  if (!eligible()) {
    cancelGameReport();
    return;
  }
  if (moves.length === 0) {
    resetGameReport();
    return;
  }
  const key = JSON.stringify([gameId, startFen, options.variant, depth, moves.map((move) => [move.uci, move.fen])]);
  if ((key === lastKey || (active && key === activeKey)) && !force) return;
  lastKey = '';
  active?.abort();
  const ctrl = new AbortController();
  active = ctrl;
  activeKey = key;
  gameReportSignal.value = { running: true, done: false, analyzed: 0, total: moves.length, report: null, error: null };

  // Position 0 is the root; position i is the position after move i.
  const positions: string[] = [startFen, ...moves.map((move) => move.fen)];
  const scores: number[] = [];

  try {
    for (let i = 0; i < positions.length; i++) {
      if (ctrl.signal.aborted || !eligible()) return;
      const history: PositionHistory = {
        startFen,
        moves: moves.slice(0, i).map((move) => move.uci),
      };
      const result = await getAnalysis(
        positions[i],
        depth,
        0,
        ctrl.signal,
        history,
        undefined,
        options.variant,
        REPORT_MULTI_PV,
      );
      if (ctrl.signal.aborted || !eligible()) return;
      const score = toCp(result.evaluation);
      // Terminal positions legitimately have no bestmove, but still need a real
      // evaluation. A failed search or empty score cannot mean equality.
      if (score == null || (result.success === false && result.bestmove !== '(none)')) {
        throw new Error('Report position has no valid evaluation');
      }
      scores.push(score);
      if (i > 0) {
        gameReportSignal.value = { ...gameReportSignal.value, analyzed: i };
      }
    }

    const plies: AnalyzedPly[] = [];
    for (let i = 0; i < moves.length; i++) {
      const record = moves[i];
      const scored = scorePly(scores[i], scores[i + 1]);
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
    if (ctrl.signal.aborted || !eligible()) return;
    lastKey = key;
    gameReportSignal.value = {
      running: false,
      done: true,
      analyzed: plies.length,
      total: moves.length,
      report,
      error: null,
    };
  } catch (error) {
    if (ctrl.signal.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    gameReportSignal.value = {
      running: false,
      done: false,
      analyzed: 0,
      total: moves.length,
      report: null,
      error: `Report analysis failed: ${message}`,
    };
    console.warn('Super Chess Bot: game report analysis failed.', error);
  } finally {
    if (active === ctrl) {
      active = null;
      activeKey = '';
      if (!gameReportSignal.value.done) gameReportSignal.value = { ...gameReportSignal.value, running: false };
    }
  }
}

/** Drop the cached report so the next game starts clean. */
export function resetGameReport(): void {
  active?.abort();
  active = null;
  activeKey = '';
  lastKey = '';
  gameReportSignal.value = initial;
}

/** Abort an in-flight report, used when the bot is re-enabled or the board changes. */
export function cancelGameReport(): void {
  lastKey = '';
  active?.abort();
  active = null;
  activeKey = '';
  gameReportSignal.value = { ...gameReportSignal.value, running: false, error: null };
}
