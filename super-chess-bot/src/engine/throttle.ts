/**
 * Elo Throttling & Blunder Shield ("Co-Pilot") move selection.
 * Blends Stockfish output into natural human rating targets while preventing
 * catastrophic tactical blunders.
 */

import type { MultiPvLine } from './uci-client.js';

export interface ThrottleOptions {
  targetElo: number; // 0 for unrestricted (3000+), or 800 - 2800
  blunderShield: boolean;
  sideToMove?: 'w' | 'b';
  randomFn?: () => number;
}

export interface SelectedMoveOutcome {
  uci: string;
  rank: number;
  cpLoss: number;
  shieldApplied: boolean;
}

/**
 * Convert Evaluation to centipawns from side to move's perspective.
 * In UCI protocol, Stockfish evaluations (cp and mate) are always relative to the side to move.
 */
function scoreToCentipawns(line: MultiPvLine): number {
  if (typeof line.evaluation.mate === 'number') {
    // Mate in N moves
    return line.evaluation.mate > 0 ? 10_000 - line.evaluation.mate * 100 : -10_000 - line.evaluation.mate * 100;
  }
  return line.evaluation.cp ?? 0;
}

/**
 * Selects a move from candidate Multi-PV lines according to target Elo,
 * subject to Blunder Shield constraints.
 */
export function selectThrottledMove(lines: MultiPvLine[], options: ThrottleOptions): SelectedMoveOutcome {
  if (!lines || lines.length === 0) {
    return { uci: '', rank: 1, cpLoss: 0, shieldApplied: false };
  }

  const bestLine = lines[0];
  const bestUci = bestLine.uci || (bestLine.pv ? bestLine.pv.split(/\s+/)[0] : '');

  // If unthrottled or only 1 line available, play best move
  if (!options.targetElo || options.targetElo <= 0 || lines.length === 1) {
    return { uci: bestUci, rank: 1, cpLoss: 0, shieldApplied: false };
  }

  const { targetElo, blunderShield, randomFn = Math.random } = options;
  const bestScore = scoreToCentipawns(bestLine);

  // Compute temperature T (in centipawns) inversely proportional to target Elo
  // High Elo -> small T (tight selection around best move)
  // Low Elo -> larger T (probabilistic selection across candidate moves)
  const normalizedElo = Math.min(1, Math.max(0, (targetElo - 800) / 2000));
  const temperature = Math.max(12, Math.round(160 * (1 - normalizedElo)));

  // Blunder shield limits maximum centipawn loss allowed
  // Standard blunder threshold is 150 centipawns (1.5 pawns)
  const maxAllowedCpLoss = blunderShield ? Math.min(150, Math.max(45, (1 - normalizedElo) * 150)) : 400;

  let shieldTriggered = false;
  const eligibleCandidates: { line: MultiPvLine; rank: number; cpLoss: number; weight: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const uci = line.uci || (line.pv ? line.pv.split(/\s+/)[0] : '');
    if (!uci) continue;

    const score = scoreToCentipawns(line);
    const cpLoss = Math.max(0, bestScore - score);

    // Blunder Shield check: reject candidate if it blunders mate or exceeds threshold
    if (blunderShield && i > 0) {
      // Reject any candidate that walks into mate. No comparison against the best move is made
      // here: `i > 0` already exempts `lines[0]`, so if the best move is also mated the candidate
      // is still the worse option and the fallback below returns the best move either way.
      if (typeof line.evaluation.mate === 'number' && line.evaluation.mate < 0) {
        shieldTriggered = true;
        continue;
      }
      if (cpLoss > maxAllowedCpLoss) {
        shieldTriggered = true;
        continue;
      }
    }

    const weight = Math.exp(-cpLoss / temperature);
    eligibleCandidates.push({ line, rank: i + 1, cpLoss, weight });
  }

  if (eligibleCandidates.length === 0) {
    return { uci: bestUci, rank: 1, cpLoss: 0, shieldApplied: shieldTriggered };
  }

  // Sample using cumulative weights
  const totalWeight = eligibleCandidates.reduce((acc, c) => acc + c.weight, 0);
  const r = randomFn() * totalWeight;
  let running = 0;

  for (const candidate of eligibleCandidates) {
    running += candidate.weight;
    if (r <= running) {
      const chosenUci = candidate.line.uci || (candidate.line.pv ? candidate.line.pv.split(/\s+/)[0] : '');
      return {
        uci: chosenUci,
        rank: candidate.rank,
        cpLoss: candidate.cpLoss,
        shieldApplied: shieldTriggered,
      };
    }
  }

  return { uci: bestUci, rank: 1, cpLoss: 0, shieldApplied: shieldTriggered };
}
