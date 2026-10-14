import type { Evaluation } from '../chess/types.js';

/**
 * Converts an Evaluation (cp or mate) to clamped centipawns from the side to move's perspective.
 *
 * Deep mate scores (|mate| > 100) clamp the mate distance penalty to prevent sign inversion
 * while still preferring faster mates.
 */
export function evaluationToCentipawns(evaluation: Evaluation, mateCap = 10_000): number {
  if (typeof evaluation?.mate === 'number') {
    const penalty = Math.min(1000, Math.abs(evaluation.mate) * 10);
    return evaluation.mate > 0 ? mateCap - penalty : -mateCap + penalty;
  }
  return evaluation?.cp ?? 0;
}
