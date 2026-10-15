import { describe, expect, it } from 'vite-plus/test';
import {
  CPL_CAP,
  clampAccuracy,
  classifyByWinPercentLoss,
  type MoveVerdict,
  moveAccuracy,
  winPercent,
} from '../../../src/game/report/accuracy.js';
import { buildGameReport } from '../../../src/game/report/aggregate.js';

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

  it('lets the raw curve leave the reportable band at the extremes', () => {
    // Guards the premise of clampAccuracy: without it these would be the reported values.
    expect(moveAccuracy(100, 0)).toBeLessThan(0);
    expect(moveAccuracy(0, 100)).toBeGreaterThan(100);
  });

  it('clamps accuracy into the 0-100 band the report displays', () => {
    expect(clampAccuracy(moveAccuracy(95, 0))).toBe(0);
    expect(clampAccuracy(moveAccuracy(0, 95))).toBe(100);
    expect(clampAccuracy(88.5)).toBe(88.5);
  });
});

describe('move classification', () => {
  it('buckets by win percentage surrendered at the documented thresholds', () => {
    expect(classifyByWinPercentLoss(0)).toBe('excellent');
    expect(classifyByWinPercentLoss(2)).toBe('excellent');
    expect(classifyByWinPercentLoss(2.01)).toBe('good');
    expect(classifyByWinPercentLoss(5)).toBe('good');
    expect(classifyByWinPercentLoss(5.01)).toBe('inaccuracy');
    expect(classifyByWinPercentLoss(10)).toBe('inaccuracy');
    expect(classifyByWinPercentLoss(10.01)).toBe('mistake');
    expect(classifyByWinPercentLoss(20)).toBe('mistake');
    expect(classifyByWinPercentLoss(20.01)).toBe('blunder');
    expect(classifyByWinPercentLoss(99)).toBe('blunder');
  });

  it('treats an improving move as excellent rather than a negative loss', () => {
    expect(classifyByWinPercentLoss(-40)).toBe('excellent');
  });

  it('cannot disagree with the accuracy it is paired with', () => {
    // The same quantity drives both, so a 100cp giveaway from a won position is never a
    // "mistake" while its accuracy still reads as near-perfect.
    const before = winPercent(900);
    const after = winPercent(800);
    const accuracy = clampAccuracy(moveAccuracy(before, after));
    expect(accuracy).toBeGreaterThan(90);
    expect(classifyByWinPercentLoss(before - after)).not.toBe('mistake');
    expect(classifyByWinPercentLoss(before - after)).not.toBe('blunder');
  });
});

describe('report aggregation', () => {
  const ply = (
    plyNumber: number,
    color: 'w' | 'b',
    cpLoss: number,
    accuracy: number,
    verdict: MoveVerdict = 'excellent',
  ) => ({ ply: plyNumber, color, san: 'e4', cpLoss, accuracy, verdict });

  it('splits counts, average loss, and accuracy by color', () => {
    const report = buildGameReport(
      [
        ply(1, 'w', 0, 100),
        ply(2, 'b', 30, 88, 'inaccuracy'),
        ply(3, 'w', 150, 55, 'blunder'),
        ply(4, 'b', 60, 74, 'mistake'),
      ],
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
    // A capped evaluation is what keeps the win-percentage curve inside its documented range.
    expect(CPL_CAP).toBeGreaterThan(0);
    expect(winPercent(CPL_CAP)).toBeLessThan(100);
    expect(winPercent(-CPL_CAP)).toBeGreaterThan(0);
  });
});
