/**
 * Ex-Gaussian reaction time distribution and Shannon entropy model.
 * Models human cognitive latency:
 * - Normal component N(mu, sigma^2): sensory & motor execution baseline.
 * - Exponential component Exp(1/tau): cognitive decision & search complexity.
 * - Shannon entropy H over candidate move evaluations: measures position ambiguity/indecision.
 */

export function sampleExGaussian(mu: number, sigma: number, tau: number, randomFn: () => number = Math.random): number {
  // Box-Muller transform for Gaussian component
  const u1 = Math.max(1e-7, randomFn());
  const u2 = Math.max(1e-7, randomFn());
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const normal = mu + Math.max(0, sigma) * z;

  // Exponential component (mean tau)
  const u3 = Math.max(1e-7, randomFn());
  const exponential = -Math.max(0, tau) * Math.log(u3);

  return Math.max(0, normal + exponential);
}

/**
 * Computes normalized Shannon entropy H in [0, 1] over centipawn scores of candidate moves.
 * When one move is vastly superior, H -> 0 (forced/obvious choice).
 * When candidate moves have nearly identical evaluations, H -> 1 (high decision dilemma).
 */
import {
  ENTROPY_TEMPERATURE_CP,
  FORCED_MOVE_MAX_DELAY_MS,
  MAX_DELAY_BUDGET_MULTIPLIER,
  MIN_HUMAN_DELAY_MS,
} from './config.js';

export function computeShannonEntropy(candidateCentipawns: number[]): number {
  if (!candidateCentipawns || candidateCentipawns.length <= 1) return 0;

  const validScores = candidateCentipawns.filter((s) => Number.isFinite(s));
  if (validScores.length <= 1) return 0;

  // Temperature parameter T in centipawns: controls softmax sharpness
  const T = ENTROPY_TEMPERATURE_CP;

  const maxScore = Math.max(...validScores);

  // Softmax with numerical stability
  const exponentials = validScores.map((score) => Math.exp((score - maxScore) / T));
  const sumExp = exponentials.reduce((acc, val) => acc + val, 0);
  if (sumExp <= 0) return 0;

  const probabilities = exponentials.map((exp) => exp / sumExp);

  // Shannon entropy: H = - sum(p * ln(p))
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 1e-7) {
      entropy -= p * Math.log(p);
    }
  }

  // Normalize by max possible entropy ln(N)
  const maxEntropy = Math.log(validScores.length);
  return maxEntropy > 0 ? Math.min(1, Math.max(0, entropy / maxEntropy)) : 0;
}

export interface MoveDelayOptions {
  baseTimeMs: number;
  remainingMs: number | null;
  legalMovesCount: number | null;
  candidateScores?: number[];
  randomFn?: () => number;
}

/**
 * Calculates a realistic human move delay using Ex-Gaussian distribution scaled by
 * branching factor and Shannon entropy over top candidate moves.
 */
export function calculateMoveDelay(options: MoveDelayOptions): number {
  const { baseTimeMs, remainingMs, legalMovesCount, candidateScores, randomFn } = options;
  const movesCount = legalMovesCount ?? 20;

  // Forced move (only 1 legal move)
  if (movesCount <= 1) {
    const mu = Math.min(FORCED_MOVE_MAX_DELAY_MS, Math.max(MIN_HUMAN_DELAY_MS, baseTimeMs * 0.25));
    const sigma = mu * 0.2;
    const tau = mu * 0.15;
    const sample = sampleExGaussian(mu, sigma, tau, randomFn);
    return boundDelay(sample, remainingMs, baseTimeMs);
  }

  // Branching factor normalized in [0, 1] relative to typical 35-ply branching
  const branchingFactor = Math.min(1, Math.max(0, Math.log(Math.max(1, movesCount)) / Math.log(35)));

  // Shannon entropy over candidate evaluations
  const entropy = candidateScores ? computeShannonEntropy(candidateScores) : 0.5;

  // Composite complexity factor C in [0, 1]
  const complexity = 0.55 * entropy + 0.45 * branchingFactor;

  // Scale Ex-Gaussian parameters with complexity
  // mu: motor execution + baseline read time
  const mu = baseTimeMs * (0.35 + 0.45 * complexity);
  // sigma: motor variability
  const sigma = baseTimeMs * (0.1 + 0.15 * complexity);
  // tau: cognitive struggle exponential tail
  const tau = baseTimeMs * (0.2 + 0.6 * complexity);

  const sample = sampleExGaussian(mu, sigma, tau, randomFn);
  return boundDelay(sample, remainingMs, baseTimeMs);
}

function boundDelay(delay: number, remainingMs: number | null, baseTimeMs: number): number {
  let bounded = Math.max(MIN_HUMAN_DELAY_MS, delay);

  // Strict clock safety: never exceed a reasonable fraction of remaining time
  if (remainingMs !== null && remainingMs > 0) {
    const clockCeiling = Math.max(MIN_HUMAN_DELAY_MS, Math.floor(remainingMs / 25));
    bounded = Math.min(bounded, clockCeiling);
  }

  // Cap at 3x base budget to prevent runaway delay
  const maxCeiling = Math.max(100, baseTimeMs * MAX_DELAY_BUDGET_MULTIPLIER);
  bounded = Math.min(bounded, maxCeiling);

  return Math.round(bounded);
}
