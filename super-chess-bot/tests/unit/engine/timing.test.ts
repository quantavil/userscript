import { describe, expect, it } from 'vite-plus/test';
import { calculateMoveDelay, computeShannonEntropy, sampleExGaussian } from '../../../src/engine/timing.js';

describe('engine timing math & ex-gaussian distribution', () => {
  describe('sampleExGaussian', () => {
    it('generates non-negative latency samples', () => {
      for (let i = 0; i < 50; i++) {
        const sample = sampleExGaussian(100, 20, 50);
        expect(sample).toBeGreaterThanOrEqual(0);
      }
    });

    it('works deterministically with custom random function', () => {
      // Deterministic PRNG
      let seed = 0.5;
      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      const val1 = sampleExGaussian(200, 30, 40, pseudoRandom);
      seed = 0.5;
      const val2 = sampleExGaussian(200, 30, 40, pseudoRandom);
      expect(val1).toBeCloseTo(val2, 4);
    });

    it('handles zero parameters gracefully', () => {
      const sample = sampleExGaussian(0, 0, 0, () => 0.5);
      expect(sample).toBe(0);
    });
  });

  describe('computeShannonEntropy', () => {
    it('returns 0 for empty or single candidate evaluations', () => {
      expect(computeShannonEntropy([])).toBe(0);
      expect(computeShannonEntropy([50])).toBe(0);
    });

    it('returns near 1.0 (maximum entropy) when candidate moves have equal evaluations', () => {
      const entropy = computeShannonEntropy([100, 100, 100]);
      expect(entropy).toBeCloseTo(1.0, 2);
    });

    it('returns very low entropy when one move is overwhelmingly better', () => {
      const entropy = computeShannonEntropy([800, -300, -400]);
      expect(entropy).toBeLessThan(0.05);
    });

    it('handles invalid or non-finite numbers safely', () => {
      expect(computeShannonEntropy([Number.NaN, Number.POSITIVE_INFINITY])).toBe(0);
      const entropy = computeShannonEntropy([50, 50, Number.NaN]);
      expect(entropy).toBeCloseTo(1.0, 2);
    });
  });

  describe('calculateMoveDelay', () => {
    it('produces quick responses on forced moves (1 legal move)', () => {
      const delay = calculateMoveDelay({
        baseTimeMs: 1000,
        remainingMs: 60000,
        legalMovesCount: 1,
        randomFn: () => 0.5,
      });

      // On a forced move with base 1000ms, should be capped tightly (< 300ms)
      expect(delay).toBeLessThan(300);
      expect(delay).toBeGreaterThanOrEqual(25);
    });

    it('scales move delay higher on complex positions with high entropy and branching', () => {
      const forced = calculateMoveDelay({
        baseTimeMs: 500,
        remainingMs: 60000,
        legalMovesCount: 1,
        randomFn: () => 0.5,
      });

      const complex = calculateMoveDelay({
        baseTimeMs: 500,
        remainingMs: 60000,
        legalMovesCount: 30,
        candidateScores: [50, 50, 48], // high entropy
        randomFn: () => 0.5,
      });

      expect(complex).toBeGreaterThan(forced);
    });

    it('strictly respects low remaining clock times', () => {
      // With only 1000ms left on clock, remainingMs/25 = 40ms ceiling
      const delay = calculateMoveDelay({
        baseTimeMs: 500,
        remainingMs: 1000,
        legalMovesCount: 20,
        randomFn: () => 0.5,
      });

      expect(delay).toBeLessThanOrEqual(40);
    });

    it('caps delay to avoid exceeding 3x base budget', () => {
      const delay = calculateMoveDelay({
        baseTimeMs: 100,
        remainingMs: 100000,
        legalMovesCount: 35,
        randomFn: () => 0.99, // high exponential tail
      });

      expect(delay).toBeLessThanOrEqual(300);
    });
  });
});
