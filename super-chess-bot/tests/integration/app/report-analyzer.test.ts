import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { replaySanLine } from '../../../src/chess/position.js';
import { UciClient } from '../../../src/engine/uci-client.js';
import { setActiveSite } from '../../../src/sites/active.js';
import type { GameSnapshot, SiteAdapter } from '../../../src/sites/types.js';

const analyze = vi.fn();

vi.mock('../../../src/engine/service.js', () => ({
  getAnalysis: (...args: unknown[]) => analyze(...args),
}));

const { cancelGameReport, gameReportSignal, resetGameReport, runGameReport } = await import(
  '../../../src/game/report/analyzer.js'
);

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 2';

function move(ply: number, turn: 'w' | 'b', uci: string, san: string, fen: string) {
  return { ply, uci, san, turn, elapsedMs: null, fen, timestamp: 0 };
}

function siteWithPhase(phase: GameSnapshot['phase'], variant?: string): SiteAdapter {
  return {
    read: () => ({
      kind: 'game',
      snapshot: { phase, variant, gameId: 'g', fen: START_FEN } as unknown as GameSnapshot,
    }),
  } as SiteAdapter;
}

/** The pass refuses to run without a finished game, so every case needs one unless it tests that. */
function finishedGame(): void {
  setActiveSite(siteWithPhase('finished'));
}

beforeEach(() => {
  finishedGame();
});

afterEach(() => {
  setActiveSite(null);
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

  it('drives the search by depth, not by a fixed duration', () => {
    // A time budget of 0 is what makes the engine send `go depth N` with no `movetime`,
    // so raising the report depth actually buys depth.
    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    return runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'depth-26', 26).then(() => {
      for (const call of analyze.mock.calls) {
        expect(call[1]).toBe(26);
        expect(call[2]).toBe(0);
      }
    });
  });

  it('asks for a single candidate line, because only the evaluation is read', async () => {
    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'multipv');
    expect(analyze.mock.calls.map((call) => call[7])).toEqual([1, 1]);
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
    // The paired accuracy must agree with the verdict.
    expect(report?.white.accuracy).toBeLessThan(50);
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
    // The cap keeps accuracy inside the displayed band.
    expect(report?.white.accuracy).toBeGreaterThanOrEqual(0);
    expect(report?.white.accuracy).toBeLessThanOrEqual(100);
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
    expect(gameReportSignal.value.error).toBeNull();
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

  it('stops the pass when the search signal aborts', async () => {
    // The engine call must actually receive the abort signal, or a canceled game keeps searching.
    const signals: AbortSignal[] = [];
    let calls = 0;
    analyze.mockImplementation(async (_fen: string, _depth: number, _time: number, signal: AbortSignal) => {
      calls++;
      signals.push(signal);
      if (calls === 2) cancelGameReport();
      return { evaluation: { cp: 0 } };
    });

    await runGameReport(
      [move(1, 'w', 'e2e4', 'e4', AFTER_E4), move(2, 'b', 'e7e5', 'e5', AFTER_E5)],
      START_FEN,
      'aborted-signal',
    );

    expect(calls).toBe(2);
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(gameReportSignal.value.running).toBe(false);
    expect(gameReportSignal.value.report).toBeNull();
  });

  it('surfaces an engine failure instead of silently returning to idle', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    analyze.mockRejectedValue(new Error('engine down'));

    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'game-a');

    expect(gameReportSignal.value.running).toBe(false);
    expect(gameReportSignal.value.report).toBeNull();
    expect(gameReportSignal.value.error).toContain('engine down');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('clears a previous error once a later pass succeeds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    analyze.mockRejectedValueOnce(new Error('temporary'));
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'retry-after-error');
    expect(gameReportSignal.value.error).not.toBeNull();

    analyze.mockResolvedValue({ evaluation: { cp: 0 } });
    await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'retry-after-error');
    expect(gameReportSignal.value.error).toBeNull();
    expect(gameReportSignal.value.done).toBe(true);
    warn.mockRestore();
  });
});

it('refuses live reports even with an explicit eligible callback', async () => {
  setActiveSite(siteWithPhase('live'));
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'live', 18, false, {
    isEligible: () => true,
  });
  expect(analyze).not.toHaveBeenCalled();
  expect(gameReportSignal.value.running).toBe(false);
});

it('refuses reports when there is no site adapter at all', async () => {
  setActiveSite(null);
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'no-site');
  expect(analyze).not.toHaveBeenCalled();
  expect(gameReportSignal.value.running).toBe(false);
});

it('stops before the next search when eligibility changes', async () => {
  let eligible = true;
  analyze.mockImplementation(async () => {
    eligible = false;
    return { evaluation: { cp: 0 } };
  });
  await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'changed', 18, false, {
    isEligible: () => eligible,
  });
  expect(analyze).toHaveBeenCalledTimes(1);
  expect(gameReportSignal.value.running).toBe(false);
  expect(gameReportSignal.value.done).toBe(false);
});

it('carries a supported variant into every report search', async () => {
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'variant', 18, false, {
    variant: 'chess960',
  });
  expect(analyze.mock.calls.map((call) => call[6])).toEqual(['chess960', 'chess960']);
});

it('allows the same report to retry after cancellation', async () => {
  analyze.mockImplementationOnce(async () => {
    cancelGameReport();
    return { evaluation: { cp: 0 } };
  });
  const moves = [move(1, 'w', 'e2e4', 'e4', AFTER_E4)];
  await runGameReport(moves, START_FEN, 'retry');
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport(moves, START_FEN, 'retry');
  expect(gameReportSignal.value.done).toBe(true);
});

it('does not turn a failed empty evaluation into perfect accuracy and permits retry', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const moves = [move(1, 'w', 'e2e4', 'e4', AFTER_E4)];
  analyze.mockResolvedValue({ success: false, bestmove: '', evaluation: {} });
  await runGameReport(moves, START_FEN, 'failed');
  expect(gameReportSignal.value.report).toBeNull();
  expect(gameReportSignal.value.done).toBe(false);
  analyze.mockResolvedValue({ success: true, evaluation: { cp: 0 } });
  await runGameReport(moves, START_FEN, 'failed');
  expect(gameReportSignal.value.done).toBe(true);
  warn.mockRestore();
});

it('accepts a terminal no-move mate-zero evaluation as a loss for the side to move', async () => {
  analyze.mockResolvedValueOnce({ success: true, evaluation: { cp: 0 } });
  analyze.mockResolvedValueOnce({ success: false, bestmove: '(none)', evaluation: { mate: 0 } });
  await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'terminal');
  expect(gameReportSignal.value.done).toBe(true);
  expect(gameReportSignal.value.report?.white.acpl).toBe(0);
});

it('keeps one active pass when the same report is requested again', async () => {
  let finish!: (value: { evaluation: { cp: number } }) => void;
  analyze.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  const moves = [move(1, 'w', 'e2e4', 'e4', AFTER_E4)];
  const pending = runGameReport(moves, START_FEN, 'pending');
  await runGameReport(moves, START_FEN, 'pending');
  expect(analyze).toHaveBeenCalledTimes(1);
  finish({ evaluation: { cp: 0 } });
  await pending;
  expect(gameReportSignal.value.done).toBe(true);
});

it('permits retry when a forced reanalysis fails after an earlier success', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const moves = [move(1, 'w', 'e2e4', 'e4', AFTER_E4)];
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport(moves, START_FEN, 'force-retry');
  analyze.mockRejectedValueOnce(new Error('temporary failure'));
  await runGameReport(moves, START_FEN, 'force-retry', 18, true);
  expect(gameReportSignal.value.done).toBe(false);
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport(moves, START_FEN, 'force-retry');
  expect(gameReportSignal.value.done).toBe(true);
  warn.mockRestore();
});

it('refuses report searches in an ongoing round replay view', async () => {
  setActiveSite(siteWithPhase('replay'));
  analyze.mockResolvedValue({ evaluation: { cp: 0 } });
  await runGameReport([move(1, 'w', 'e2e4', 'e4', AFTER_E4)], START_FEN, 'replay', 18, false, {
    isEligible: () => true,
  });
  expect(analyze).not.toHaveBeenCalled();
});

it('finishes the supplied 52-ply game when the final engine response has no PV', async () => {
  const sans =
    'e4 d5 e5 c5 c3 f6 d4 cxd4 cxd4 Qa5+ Nc3 fxe5 dxe5 d4 Qxd4 Nc6 Bb5 Qxb5 Nxb5 Nxd4 Nxd4 b6 Be3 Ba6 Ngf3 Rc8 Kd2 e6 Nxe6 Bb4+ Kd1 Ke7 Nxg7 Nh6 Bxh6 Rhd8+ Nd2 Kf7 Nf5 Kg6 g4 Bb7 Rg1 Bf3+ Ke1 Rc2 Rd1 Bxd2+ Rxd2 Rc1+ Rd1 Rcxd1#'.split(
      ' ',
    );
  const replay = replaySanLine(START_FEN, sans);
  if (!replay) throw new Error('Invalid supplied game fixture');
  const terminal = '3r4/p6p/1p4kB/4PN2/6P1/5b2/PP3P1P/3rK1R1 w - - 0 27';
  expect(replay.fens.at(-1)).toBe(terminal);
  const worker = {
    onmessage: null as ((event: { data: string }) => void) | null,
    onerror: null,
    terminate() {},
    postMessage(command: string) {
      queueMicrotask(() => {
        const emit = (data: string) => this.onmessage?.({ data });
        if (command === 'uci') emit('uciok');
        if (command === 'isready') emit('readyok');
        if (command.startsWith('go ')) {
          emit('info depth 0 score mate 0');
          emit('bestmove (none)');
        }
      });
    },
  };
  const client = new UciClient(() => worker);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    analyze.mockImplementation((fen: string, depth: number, time: number, signal: AbortSignal) =>
      fen === terminal
        ? client.analyze(fen, depth, time, signal)
        : Promise.resolve({ success: true, evaluation: { cp: 0 } }),
    );
    const moves = replay.history.moves.map((uci, i) =>
      move(i + 1, i % 2 === 0 ? 'w' : 'b', uci, sans[i], replay.fens[i + 1]),
    );
    await runGameReport(moves, START_FEN, 'supplied-checkmate');
    expect(gameReportSignal.value.error).toBeNull();
    expect(gameReportSignal.value.done).toBe(true);
    expect(gameReportSignal.value.report).toMatchObject({
      analyzed: 52,
      total: 52,
      white: { moveCount: 26 },
      black: { moveCount: 26 },
    });
  } finally {
    client.dispose();
    warn.mockRestore();
  }
});
