import type { AnalyzedPly, MoveVerdict } from './accuracy.js';

export interface PlayerReport {
  accuracy: number;
  acpl: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  moveCount: number;
}

export interface GameReport {
  white: PlayerReport;
  black: PlayerReport;
  analyzed: number;
  total: number;
}

function emptyPlayer(): PlayerReport {
  return { accuracy: 0, acpl: 0, inaccuracy: 0, mistake: 0, blunder: 0, moveCount: 0 };
}

/**
 * Average move accuracy for a set of plies.
 *
 * This is a plain mean of per-move scores. Lichess uses a harmonic mean, which weights a single
 * bad move more heavily; the arithmetic mean is easier to reason about and matches the
 * "percent of quality moves" reading most players have of a percentage like this.
 */
function meanAccuracy(plies: readonly AnalyzedPly[]): number {
  if (plies.length === 0) return 0;
  const total = plies.reduce((sum, ply) => sum + ply.accuracy, 0);
  return total / plies.length;
}

function buildPlayer(plies: readonly AnalyzedPly[]): PlayerReport {
  if (plies.length === 0) return emptyPlayer();
  const counts: Record<MoveVerdict, number> = {
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  let lossTotal = 0;
  for (const ply of plies) {
    counts[ply.verdict]++;
    lossTotal += ply.cpLoss;
  }
  return {
    accuracy: meanAccuracy(plies),
    acpl: lossTotal / plies.length,
    inaccuracy: counts.inaccuracy,
    mistake: counts.mistake,
    blunder: counts.blunder,
    moveCount: plies.length,
  };
}

/** Aggregate analyzed plies into the per-player report the panel renders. */
export function buildGameReport(plies: readonly AnalyzedPly[], total: number): GameReport | null {
  if (plies.length === 0) return null;
  return {
    white: buildPlayer(plies.filter((ply) => ply.color === 'w')),
    black: buildPlayer(plies.filter((ply) => ply.color === 'b')),
    analyzed: plies.length,
    total,
  };
}
