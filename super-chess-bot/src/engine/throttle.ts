/**
 * Elo Throttling & Blunder Shield ("Co-Pilot") move selection.
 * Blends Stockfish output into natural human rating targets while preventing
 * catastrophic tactical blunders.
 */

import type { Evaluation } from '../chess/types.js';
import { evaluationToCentipawns } from '../shared/chess.js';
import { MAX_THROTTLED_ELO, MIN_THROTTLED_ELO } from './config.js';
import type { MultiPvLine } from './uci-client.js';

export { MAX_THROTTLED_ELO };

export interface ThrottleOptions {
  targetElo: number; // 0 or >= 3200 for unrestricted (~3500+), or 800 - 3150
  blunderShield: boolean;
  sideToMove?: 'w' | 'b';
  randomFn?: () => number;
}

export interface SelectedMoveOutcome {
  uci: string;
  rank: number;
  cpLoss: number;
  shieldApplied: boolean;
  pv: string;
  evaluation: Evaluation;
}

/**
 * Selects a move from candidate Multi-PV lines according to target Elo,
 * subject to Blunder Shield constraints.
 */
export function selectThrottledMove(lines: MultiPvLine[], options: ThrottleOptions): SelectedMoveOutcome {
  if (!lines || lines.length === 0) {
    return { uci: '', rank: 1, cpLoss: 0, shieldApplied: false, pv: '', evaluation: {} };
  }

  const bestLine = lines[0];
  const bestUci = bestLine.uci;

  // If unthrottled (0 or >= MAX_THROTTLED_ELO) or only 1 line available, play best move
  if (!options.targetElo || options.targetElo <= 0 || options.targetElo >= MAX_THROTTLED_ELO || lines.length === 1) {
    return {
      uci: bestUci,
      rank: 1,
      cpLoss: 0,
      shieldApplied: false,
      pv: bestLine.pv,
      evaluation: bestLine.evaluation,
    };
  }

  const { targetElo, blunderShield, randomFn = Math.random } = options;
  const bestScore = evaluationToCentipawns(bestLine.evaluation);

  // Compute temperature T (in centipawns) inversely proportional to target Elo
  // Domain: 800 (beginner) to 3200 (super-GM)
  const normalizedElo = Math.min(
    1,
    Math.max(0, (targetElo - MIN_THROTTLED_ELO) / (MAX_THROTTLED_ELO - MIN_THROTTLED_ELO)),
  );
  const temperature = Math.max(1, Math.round(160 * (1 - normalizedElo)));

  // Blunder shield limits maximum centipawn loss allowed
  // Standard blunder threshold scales from 150 centipawns down to 10 centipawns at near-max
  const maxAllowedCpLoss = blunderShield ? Math.min(150, Math.max(10, Math.round((1 - normalizedElo) * 150))) : 400;

  let shieldTriggered = false;
  const eligibleCandidates: { line: MultiPvLine; rank: number; cpLoss: number; weight: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const uci = line.uci;
    if (!uci) continue;

    const score = evaluationToCentipawns(line.evaluation);
    const cpLoss = Math.max(0, bestScore - score);

    // Blunder Shield check: reject candidate if it blunders mate or exceeds threshold
    if (blunderShield && i > 0) {
      // Reject any candidate that walks into mate. `i > 0` already exempts `lines[0]`, so no
      // comparison against the best move is needed.
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
    return {
      uci: bestUci,
      rank: 1,
      cpLoss: 0,
      shieldApplied: shieldTriggered,
      pv: bestLine.pv,
      evaluation: bestLine.evaluation,
    };
  }

  // Sample using cumulative weights
  const totalWeight = eligibleCandidates.reduce((acc, c) => acc + c.weight, 0);
  const r = randomFn() * totalWeight;
  let running = 0;

  for (const candidate of eligibleCandidates) {
    running += candidate.weight;
    if (r <= running) {
      const chosenUci = candidate.line.uci;
      return {
        uci: chosenUci,
        rank: candidate.rank,
        cpLoss: candidate.cpLoss,
        shieldApplied: shieldTriggered,
        pv: candidate.line.pv,
        evaluation: candidate.line.evaluation,
      };
    }
  }

  return {
    uci: bestUci,
    rank: 1,
    cpLoss: 0,
    shieldApplied: shieldTriggered,
    pv: bestLine.pv,
    evaluation: bestLine.evaluation,
  };
}
