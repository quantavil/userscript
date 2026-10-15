import { describe, expect, it } from 'vite-plus/test';
import { MAX_THROTTLED_ELO, selectThrottledMove, type ThrottleOptions } from '../../../src/engine/throttle.js';
import type { MultiPvLine } from '../../../src/engine/uci-client.js';
import { evaluationToCentipawns } from '../../../src/shared/chess.js';

describe('elo throttling & blunder shield move selection', () => {
  const dummyLines: MultiPvLine[] = [
    { multipv: 1, uci: 'e2e4', evaluation: { cp: 40 }, depth: 20, pv: 'e2e4 e7e5' },
    { multipv: 2, uci: 'd2d4', evaluation: { cp: 30 }, depth: 20, pv: 'd2d4 d7d5' },
    { multipv: 3, uci: 'c2c4', evaluation: { cp: 20 }, depth: 20, pv: 'c2c4 c7c5' },
  ];

  it('returns empty string for empty lines array', () => {
    const outcome = selectThrottledMove([], { targetElo: 1500, blunderShield: true });
    expect(outcome.uci).toBe('');
    expect(outcome.rank).toBe(1);
  });

  it('plays rank 1 move when targetElo is 0 (unrestricted engine strength)', () => {
    const outcome = selectThrottledMove(dummyLines, { targetElo: 0, blunderShield: true });
    expect(outcome.uci).toBe('e2e4');
    expect(outcome.rank).toBe(1);
    expect(outcome.shieldApplied).toBe(false);
  });

  it('plays rank 1 move when targetElo is >= MAX_THROTTLED_ELO (3200)', () => {
    const outcome = selectThrottledMove(dummyLines, {
      targetElo: MAX_THROTTLED_ELO,
      blunderShield: true,
    });
    expect(outcome.uci).toBe('e2e4');
    expect(outcome.rank).toBe(1);
    expect(outcome.shieldApplied).toBe(false);
  });

  it('plays rank 1 move when targetElo exceeds 3200', () => {
    const outcome = selectThrottledMove(dummyLines, { targetElo: 3500, blunderShield: true });
    expect(outcome.uci).toBe('e2e4');
    expect(outcome.rank).toBe(1);
    expect(outcome.shieldApplied).toBe(false);
  });

  it('differentiates move selection probabilities across high Elo targets below 3200', () => {
    const outcome3000 = selectThrottledMove(dummyLines, {
      targetElo: 3000,
      blunderShield: true,
      randomFn: () => 0.99,
    });
    // At 3000 Elo, blunder threshold is 13 cp, so c2c4 (20 cp loss) is shielded out
    expect(outcome3000.rank).toBe(2);
    expect(outcome3000.shieldApplied).toBe(true);

    const outcome3200 = selectThrottledMove(dummyLines, {
      targetElo: 3200,
      blunderShield: true,
      randomFn: () => 0.99,
    });
    // At 3200 Elo, unthrottled maximum strength always plays best move
    expect(outcome3200.rank).toBe(1);
    expect(outcome3200.shieldApplied).toBe(false);
  });

  it('probabilistically selects sub-optimal candidate move on lower Elo targets', () => {
    const options: ThrottleOptions = {
      targetElo: 1000,
      blunderShield: true,
      randomFn: () => 0.99, // Force selection of lower-ranked candidate
    };

    const outcome = selectThrottledMove(dummyLines, options);
    // At low Elo with randomFn=0.99, should pick line #2 or #3
    expect(outcome.rank).toBeGreaterThanOrEqual(2);
    expect(outcome.cpLoss).toBeGreaterThan(0);
  });

  it('blunder shield filters out catastrophic blunder lines', () => {
    const blunderLines: MultiPvLine[] = [
      { multipv: 1, uci: 'e2e4', evaluation: { cp: 50 }, depth: 20, pv: 'e2e4' },
      { multipv: 2, uci: 'g2g4', evaluation: { cp: -400 }, depth: 20, pv: 'g2g4' }, // huge blunder
    ];

    const options: ThrottleOptions = {
      targetElo: 1000,
      blunderShield: true,
      randomFn: () => 0.99,
    };

    const outcome = selectThrottledMove(blunderLines, options);
    // Huge blunder (450 cp loss) should be shielded out, forcing best move
    expect(outcome.uci).toBe('e2e4');
    expect(outcome.rank).toBe(1);
    expect(outcome.shieldApplied).toBe(true);
  });

  it('blunder shield filters out lines with mate against', () => {
    const mateLines: MultiPvLine[] = [
      { multipv: 1, uci: 'e2e4', evaluation: { cp: 10 }, depth: 20, pv: 'e2e4' },
      { multipv: 2, uci: 'f2f3', evaluation: { mate: -2 }, depth: 20, pv: 'f2f3' }, // gets mated in 2
    ];

    const outcome = selectThrottledMove(mateLines, {
      targetElo: 1200,
      blunderShield: true,
      randomFn: () => 0.99,
    });

    expect(outcome.uci).toBe('e2e4');
    expect(outcome.shieldApplied).toBe(true);
  });

  it('allows larger centipawn loss when blunder shield is disabled', () => {
    const blunderLines: MultiPvLine[] = [
      { multipv: 1, uci: 'e2e4', evaluation: { cp: 50 }, depth: 20, pv: 'e2e4' },
      { multipv: 2, uci: 'g2g4', evaluation: { cp: -200 }, depth: 20, pv: 'g2g4' }, // 250 cp loss
    ];

    const outcome = selectThrottledMove(blunderLines, {
      targetElo: 900,
      blunderShield: false,
      randomFn: () => 0.99,
    });

    expect(outcome.uci).toBe('g2g4');
    expect(outcome.rank).toBe(2);
  });

  it('correctly evaluates candidate lines from side to move perspective', () => {
    const blackLines: MultiPvLine[] = [
      { multipv: 1, uci: 'c7c5', evaluation: { cp: 50 }, depth: 20, pv: 'c7c5' }, // Best move for side to move (+0.50)
      { multipv: 2, uci: 'e7e5', evaluation: { cp: -200 }, depth: 20, pv: 'e7e5' }, // Blunder for side to move (-2.00)
    ];

    const outcome = selectThrottledMove(blackLines, {
      targetElo: 1200,
      blunderShield: true,
      sideToMove: 'b',
      randomFn: () => 0.99,
    });

    // Blunder shield should protect against candidate line 2 (-2.00 cp) and choose best move
    expect(outcome.uci).toBe('c7c5');
    expect(outcome.rank).toBe(1);
    expect(outcome.shieldApplied).toBe(true);
  });

  it('clamps deep mate evaluations without inverting signs', () => {
    expect(evaluationToCentipawns({ mate: 105 })).toBeGreaterThanOrEqual(9000);
    expect(evaluationToCentipawns({ mate: -105 })).toBeLessThanOrEqual(-9000);
    expect(evaluationToCentipawns({ mate: 105 })).toBe(9000);
    expect(evaluationToCentipawns({ mate: -105 })).toBe(-9000);
  });

  it('correctly treats deep mate scores (> 100 plies) as winning without sign inversion', () => {
    const deepMateLines: MultiPvLine[] = [
      { multipv: 1, uci: 'e2e4', evaluation: { mate: 105 }, depth: 20, pv: 'e2e4' },
      { multipv: 2, uci: 'd2d4', evaluation: { cp: 100 }, depth: 20, pv: 'd2d4' },
    ];
    const outcome = selectThrottledMove(deepMateLines, {
      targetElo: 1500,
      blunderShield: true,
      randomFn: () => 0.99,
    });
    expect(outcome.uci).toBe('e2e4');
    expect(outcome.shieldApplied).toBe(true);
  });

  it('returns pv and evaluation matching the chosen candidate line', () => {
    const outcome = selectThrottledMove(dummyLines, {
      targetElo: 1000,
      blunderShield: true,
      randomFn: () => 0.99,
    });
    const chosen = dummyLines.find((l) => l.uci === outcome.uci);
    expect(chosen).toBeDefined();
    expect(outcome.pv).toBe(chosen?.pv);
    expect(outcome.evaluation).toEqual(chosen?.evaluation);
  });
});
