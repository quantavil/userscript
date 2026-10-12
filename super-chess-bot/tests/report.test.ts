import { describe, expect, it } from 'vitest';
import { CPL_CAP, classifyByLoss, moveAccuracy, winPercent } from '../src/report/accuracy.js';
import { buildGameReport } from '../src/report/aggregate.js';

describe('accuracy math', () => {
  it('maps an equal position to an even win chance', () => {
    expect(winPercent(0)).toBeCloseTo(50, 6);
  });

  it('keeps the curve monotonic and bounded', () => {
    expect(winPercent(100)).toBeGreaterThan(winPercent(0));
    expect(winPercent(5000)).toBeLessThanOrEqual(100);
    expect(winPercent(-5000)).toBeGreaterThanOrEqual(0);
  });

  it('gives up accuracy in proportion to win chance surrendered', () => {
    // The published curve tops out at 99.9999, not exactly 100.
    expect(moveAccuracy(50, 50)).toBeCloseTo(100, 3);
    expect(moveAccuracy(80, 70)).toBeLessThan(100);
    expect(moveAccuracy(80, 70)).toBeGreaterThan(moveAccuracy(80, 40));
  });

  it('never reports accuracy below zero when a move throws the game', () => {
    expect(moveAccuracy(95, 0)).toBeLessThan(0);
  });
});

describe('move classification', () => {
  it('buckets by centipawn loss at the documented thresholds', () => {
    expect(classifyByLoss(0)).toBe('excellent');
    expect(classifyByLoss(10)).toBe('excellent');
    expect(classifyByLoss(11)).toBe('good');
    expect(classifyByLoss(25)).toBe('good');
    expect(classifyByLoss(26)).toBe('inaccuracy');
    expect(classifyByLoss(50)).toBe('inaccuracy');
    expect(classifyByLoss(51)).toBe('mistake');
    expect(classifyByLoss(100)).toBe('mistake');
    expect(classifyByLoss(101)).toBe('blunder');
  });

  it('treats an improving move as excellent rather than a negative loss', () => {
    expect(classifyByLoss(-40)).toBe('excellent');
  });
});

describe('report aggregation', () => {
  const ply = (plyNumber: number, color: 'w' | 'b', cpLoss: number, accuracy: number) => ({
    ply: plyNumber,
    color,
    san: 'e4',
    cpLoss,
    accuracy,
    verdict: classifyByLoss(cpLoss),
  });

  it('splits counts, average loss, and accuracy by color', () => {
    const report = buildGameReport(
      [ply(1, 'w', 0, 100), ply(2, 'b', 30, 88), ply(3, 'w', 150, 55), ply(4, 'b', 60, 74)],
      4,
    );

    expect(report?.white.moveCount).toBe(2);
    expect(report?.white.accuracy).toBeCloseTo(77.5, 5);
    expect(report?.white.acpl).toBeCloseTo(75, 5);
    expect(report?.white.blunder).toBe(1);
    expect(report?.black.moveCount).toBe(2);
    expect(report?.black.inaccuracy).toBe(1);
    expect(report?.black.mistake).toBe(1);
    expect(report?.total).toBe(4);
  });

  it('reports a zeroed side without collapsing the other one', () => {
    const report = buildGameReport([ply(1, 'w', 0, 100)], 2);

    expect(report?.black.moveCount).toBe(0);
    expect(report?.black.accuracy).toBe(0);
    expect(report?.white.accuracy).toBe(100);
  });

  it('returns nothing when there is nothing to score', () => {
    expect(buildGameReport([], 0)).toBeNull();
  });
});

describe('centipawn cap', () => {
  it('bounds an evaluation so a won position cannot report infinite loss', () => {
    expect(CPL_CAP).toBe(1000);
    expect(winPercent(CPL_CAP)).toBeLessThan(100);
  });
});
