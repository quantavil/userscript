/**
 * Move quality metrics for the post-game report.
 *
 * These follow Lichess's published, open formulas rather than Chess.com's proprietary ones, so
 * the numbers land close to the site but are not identical. Everything here is a pure function
 * of engine evaluations, and the panel labels the output as a local estimate for that reason.
 */

/** Centipawn evaluations are capped before conversion so a won position cannot swing wildly. */
export const CPL_CAP = 1000;

/** Lichess win-probability curve. `cp` is centipawns from the mover's point of view. */
export function winPercent(cp: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Per-move accuracy from the win percentage the move gave away. */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  return 103.1668 * Math.exp(-0.04354 * (wpBefore - wpAfter)) - 3.1669;
}

export type MoveVerdict = 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

const VERDICT_CPL: Record<MoveVerdict, { max: number; label: string }> = {
  excellent: { max: 10, label: 'Excellent' },
  good: { max: 25, label: 'Good' },
  inaccuracy: { max: 50, label: 'Inaccuracy' },
  mistake: { max: 100, label: 'Mistake' },
  blunder: { max: Number.POSITIVE_INFINITY, label: 'Blunder' },
};

/** Classify by centipawn loss. A move that improves the position is always excellent. */
export function classifyByLoss(cpLoss: number): MoveVerdict {
  const loss = Math.max(0, cpLoss);
  if (loss <= VERDICT_CPL.excellent.max) return 'excellent';
  if (loss <= VERDICT_CPL.good.max) return 'good';
  if (loss <= VERDICT_CPL.inaccuracy.max) return 'inaccuracy';
  if (loss <= VERDICT_CPL.mistake.max) return 'mistake';
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
