import { afterEach, describe, expect, it, vi } from 'vitest';

const analyze = vi.fn();

vi.mock('../src/engine/analysis.js', () => ({
  getAnalysis: (...args: unknown[]) => analyze(...args),
}));

const { cancelGameReport, gameReportSignal, resetGameReport, runGameReport } = await import(
  '../src/report/analyzer.js'
);

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

function move(ply: number, turn: 'w' | 'b', uci: string, san: string, fen: string) {
  return { ply, uci, san, turn, elapsedMs: null, fen, timestamp: 0 };
}

afterEach(() => {
  cancelGameReport();
  resetGameReport();
  analyze.mockReset();
});

describe('game report analysis pass', () => {
  it('searches the root plus every resulting position exactly once', async () => {
    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    await runGameReport(
      [move(1, 'w', 'e2e4', 'e4', AFTER_E4), move(2, 'b', 'e7e5', 'e5', AFTER_E5)],
      START_FEN,
      'game-a',
    );

    expect(analyze).toHaveBeenCalledTimes(3);
    expect(analyze.mock.calls.map((call) => call[0])).toEqual([START_FEN, AFTER_E4, AFTER_E5]);
  });

  it('carries the preceding plies into each position so repetition state is respected', async () => {
    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');

    expect(analyze.mock.calls[0][4]).toEqual({ startFen: START_FEN, moves: [] });
    expect(analyze.mock.calls[1][4]).toEqual({ startFen: START_FEN, moves: ['e2e4'] });
  });

  it('scores a move that hangs material as a blunder for the mover', async () => {
    // Position 0 is +30 with the mover to move. The resulting position is +400 with the opponent
    // to move, which is -400 for the mover: a 430cp giveaway.
    analyze.mockResolvedValueOnce({ evaluation: { cp: 30 } });
    analyze.mockResolvedValueOnce({ evaluation: { cp: 400 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');

    const report = gameReportSignal.value.report;
    expect(report?.white.blunder).toBe(1);
    expect(report?.white.acpl).toBeCloseTo(430, 0);
  });

  it('scores an equal move as perfect and adds no damage counts', async () => {
    // The same underlying position reports the negated value for the other side to move, so
    // +25 then -25 is no change for the mover at all.
    analyze.mockResolvedValueOnce({ evaluation: { cp: 25 } });
    analyze.mockResolvedValueOnce({ evaluation: { cp: -25 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');

    const report = gameReportSignal.value.report;
    expect(report?.white.accuracy).toBeGreaterThan(99);
    expect(report && report.white.inaccuracy + report.white.mistake + report.white.blunder).toBe(0);
  });

  it('treats a mate score as a capped evaluation rather than an unbounded one', async () => {
    // Winning in 3, then handing the opponent a win in 3: the loss saturates at the cap.
    analyze.mockResolvedValueOnce({ evaluation: { mate: 3 } });
    analyze.mockResolvedValueOnce({ evaluation: { mate: 3 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');

    const report = gameReportSignal.value.report;
    expect(report?.white.acpl).toBe(1000);
    expect(report?.white.blunder).toBe(1);
    expect(Number.isFinite(report?.white.accuracy)).toBe(true);
  });

  it('does not re-run for a game it has already scored', async () => {
    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    const moves = [move(1, 'w', 'e2e4', 'e4', AFTER_E4)];
    await runGameReport(moves, START_FEN, 'game-a');
    await runGameReport(moves, START_FEN, 'game-a');

    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('re-runs when the game gains another ply', async () => {
    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');
    await runGameReport(
      [move(1, 'w', 'e2e4', 'e4', AFTER_E4), move(2, 'b', 'e7e5', 'e5', AFTER_E5)],
      START_FEN,
      'game-a',
    );

    expect(analyze).toHaveBeenCalledTimes(5);
  });

  it('publishes an empty report rather than an error when there are no moves', async () => {
    await runGameReport([], START_FEN, 'game-a');

    expect(gameReportSignal.value.report).toBeNull();
    expect(gameReportSignal.value.running).toBe(false);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('stops cleanly when a search is aborted mid-pass', async () => {
    let calls = 0;
    analyze.mockImplementation(async () => {
      calls++;
      if (calls === 2) cancelGameReport();
      return { evaluation: { cp: 0 } };
    });

    await runGameReport(
      [move(1, 'w', 'e2e4', 'e4', AFTER_E4), move(2, 'b', 'e7e5', 'e5', AFTER_E5)],
      START_FEN,
      'game-a',
    );

    expect(gameReportSignal.value.running).toBe(false);
    expect(gameReportSignal.value.report).toBeNull();
  });

  it('swallows an engine failure instead of leaving the panel in a running state', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    analyze.mockRejectedValue(new Error('engine down'));

    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');

    expect(gameReportSignal.value.running).toBe(false);
    expect(gameReportSignal.value.report).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
