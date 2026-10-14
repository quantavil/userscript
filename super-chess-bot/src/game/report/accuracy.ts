/**
 * Move quality metrics for the post-game report.
 *
 * These follow Lichess's published, open formulas rather than Chess.com's proprietary ones, so
 * the numbers land close to the site but are not identical. Accuracy and the damage verdict are
 * both derived from the win percentage a move gave away, which is the same quantity Lichess
 * uses, so the two can never disagree. Everything here is a pure function of engine
 * evaluations, and the panel labels the output as a local estimate for that reason.
 */

import { REPORT_CPL_CAP } from '../../engine/config.js';

/** Centipawn evaluations are capped before conversion so a won position cannot swing wildly. */
export const CPL_CAP = REPORT_CPL_CAP;

/** Lichess win-probability curve. `cp` is centipawns from the mover's point of view. */
export function winPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Per-move accuracy from the win percentage the move gave away. */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  return 103.1668 * Math.exp(-0.04354 * (wpBefore - wpAfter)) - 3.1669;
}

/**
 * Clamp a raw accuracy score into the reportable 0-100 band.
 *
 * The published curve is asymptotic, so extreme win-percentage swings produce values below 0 or
 * slightly above 100. A displayed accuracy never shows either.
 */
export function clampAccuracy(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export type MoveVerdict = 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/** Win-percentage points a move may give up before the next verdict applies. */
const VERDICT_WP_DROP: Record<MoveVerdict, number> = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 20,
  blunder: Number.POSITIVE_INFINITY,
};

/** Classify by the win percentage the move surrendered. A move that improves the position is excellent. */
export function classifyByWinPercentLoss(wpLoss: number): MoveVerdict {
  const loss = Math.max(0, wpLoss);
  for (const verdict of ['excellent', 'good', 'inaccuracy', 'mistake'] as const) {
    if (loss <= VERDICT_WP_DROP[verdict]) return verdict;
  }
  return 'blunder';
}

export interface AnalyzedPly {
  /** 1-based ply index. */
  ply: number;
  color: 'w' | 'b';
  san: string;
  /** Centipawn loss for the mover, already capped. */
  cpLoss: number;
  /** 0-100 score for this single move. */
  accuracy: number;
  verdict: MoveVerdict;
}
