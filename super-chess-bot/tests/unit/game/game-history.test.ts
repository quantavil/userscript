import { parsePgn } from 'chessops/pgn';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { GameHistoryTracker } from '../../../src/game/history.js';
import type { GameSnapshot } from '../../../src/sites/types.js';

function createMockSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    identity: {},
    gameId: 'game-1',
    board: {} as HTMLElement,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playerColor: 'b',
    sideToMove: 'w',
    orientation: 'black',
    phase: 'live',
    inputReady: false,
    incrementMs: 0,
    remainingMs: 180000,
    whiteRemainingMs: 180000,
    blackRemainingMs: 180000,
    ...overrides,
  };
}

describe('GameHistoryTracker', () => {
  let tracker: GameHistoryTracker;

  beforeEach(() => {
    tracker = new GameHistoryTracker();
  });

  it('initializes with empty move history', () => {
    expect(tracker.getMoves()).toEqual([]);
    expect(tracker.getMovePairs()).toEqual([]);
  });

  it('records incremental moves with wall-clock elapsed time', () => {
    const baseTime = 1000;
    tracker.reset('game-1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', baseTime);

    // Turn 1: White plays e4 after 1200ms
    const snap1 = createMockSnapshot({
      remainingMs: null,
      whiteRemainingMs: null,
      blackRemainingMs: null,
      history: {
        startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['e2e4'],
      },
      sideToMove: 'b',
    });
    tracker.updateFromSnapshot(snap1, baseTime + 1200);

    const moves1 = tracker.getMoves();
    expect(moves1.length).toBe(1);
    expect(moves1[0]?.ply).toBe(1);
    expect(moves1[0]?.turn).toBe('w');
    expect(moves1[0]?.san).toBe('e4');
    expect(moves1[0]?.elapsedMs).toBe(1200);

    // Turn 2: Black plays e5 after 800ms
    const snap2 = createMockSnapshot({
      remainingMs: null,
      whiteRemainingMs: null,
      blackRemainingMs: null,
      history: {
        startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['e2e4', 'e7e5'],
      },
      sideToMove: 'w',
    });
    tracker.updateFromSnapshot(snap2, baseTime + 1200 + 800);

    const moves2 = tracker.getMoves();
    expect(moves2.length).toBe(2);
    expect(moves2[1]?.ply).toBe(2);
    expect(moves2[1]?.turn).toBe('b');
    expect(moves2[1]?.san).toBe('e5');
    expect(moves2[1]?.elapsedMs).toBe(800);
  });

  it('calculates elapsed time using clock deltas when site clocks decrease', () => {
    const baseTime = 1000;
    tracker.reset('game-1', undefined, baseTime);

    // Initial state: White has 180,000 ms
    tracker.updateFromSnapshot(
      createMockSnapshot({
        whiteRemainingMs: 180000,
        blackRemainingMs: 180000,
      }),
      baseTime,
    );

    // White moves e4, clock dropped from 180,000 to 177,600 (delta = 2400 ms)
    tracker.updateFromSnapshot(
      createMockSnapshot({
        history: {
          startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: ['e2e4'],
        },
        whiteRemainingMs: 177600,
        blackRemainingMs: 180000,
        sideToMove: 'b',
      }),
      baseTime + 2600, // even if wall-clock jitter says 2600ms, clock delta 2400ms takes priority
    );

    const moves = tracker.getMoves();
    expect(moves.length).toBe(1);
    expect(moves[0]?.san).toBe('e4');
    expect(moves[0]?.elapsedMs).toBe(2400);
  });

  it('correctly constructs MovePairView rows for the UI scoresheet', () => {
    tracker.reset('game-1');
    const snap = createMockSnapshot({
      history: {
        startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['e2e4', 'e7e5', 'g1f3'],
      },
    });
    tracker.updateFromSnapshot(snap);

    const pairs = tracker.getMovePairs();
    expect(pairs.length).toBe(2);
    expect(pairs[0]?.moveNumber).toBe(1);
    expect(pairs[0]?.white?.san).toBe('e4');
    expect(pairs[0]?.black?.san).toBe('e5');

    expect(pairs[1]?.moveNumber).toBe(2);
    expect(pairs[1]?.white?.san).toBe('Nf3');
    expect(pairs[1]?.black).toBeUndefined();
  });

  it('exports valid PGN directly with exportPgn()', () => {
    tracker.reset('game-1');
    tracker.updateFromSnapshot(
      createMockSnapshot({
        history: {
          startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
        },
      }),
    );

    const pgn = tracker.exportPgn('Lichess');
    expect(pgn).toContain('[Site "Lichess"]');
    expect(pgn).toContain('1. e4 1... e5 2. Nf3 2... Nc6');
    expect(pgn).toContain('{ Warning: Move timings and evaluations are client-side browser telemetry estimates. } *');

    const parsed = parsePgn(pgn);
    expect(parsed.length).toBe(1);
  });
});

describe('game history reliability', () => {
  const root = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('measures the whole turn across intermediate clock snapshots', () => {
    const tracker = new GameHistoryTracker();
    tracker.reset('game-1', root, 0);
    tracker.updateFromSnapshot(createMockSnapshot(), 0);
    tracker.updateFromSnapshot(createMockSnapshot({ whiteRemainingMs: 179000 }), 1000);
    tracker.updateFromSnapshot(
      createMockSnapshot({
        whiteRemainingMs: 177000,
        history: { startFen: root, moves: ['e2e4'] },
      }),
      3200,
    );
    expect(tracker.getMoves()[0]?.elapsedMs).toBe(3000);
  });
  it('adds known increment and calculates clock delta without increment when prevClock >= currClock', () => {
    for (const [incrementMs, expected] of [
      [2000, 3000],
      [0, 1000],
      [undefined, 1000],
    ] as const) {
      const tracker = new GameHistoryTracker();
      tracker.reset('game-1', root, 0);
      tracker.updateFromSnapshot(createMockSnapshot({ incrementMs }), 0);
      tracker.updateFromSnapshot(
        createMockSnapshot({
          incrementMs,
          whiteRemainingMs: 179000,
          history: { startFen: root, moves: ['e2e4'] },
        }),
        3200,
      );
      expect(tracker.getMoves()[0]?.elapsedMs).toBe(expected);
    }
  });
  it('falls back to wall time when clock increased without increment', () => {
    const tracker = new GameHistoryTracker();
    tracker.reset('game-1', root, 0);
    tracker.updateFromSnapshot(createMockSnapshot({ incrementMs: 0, whiteRemainingMs: 178000 }), 0);
    tracker.updateFromSnapshot(
      createMockSnapshot({
        incrementMs: 0,
        whiteRemainingMs: 180000,
        history: { startFen: root, moves: ['e2e4'] },
      }),
      3200,
    );
    expect(tracker.getMoves()[0]?.elapsedMs).toBe(3200);
  });
  it('includes observed game result in exported PGN', () => {
    const tracker = new GameHistoryTracker();
    tracker.reset('game-1', root, 0);
    tracker.updateFromSnapshot(
      createMockSnapshot({
        result: '1-0',
        phase: 'finished',
        history: { startFen: root, moves: ['e2e4'] },
      }),
      1000,
    );
    expect(tracker.getResult()).toBe('1-0');
    const pgn = tracker.exportPgn('Chess.com', tracker.getResult() ?? undefined);
    expect(pgn).toContain('[Result "1-0"]');
    expect(pgn.trim()).toMatch(/1-0$/);
  });
  it('starts a black-root scoresheet at its true fullmove number', () => {
    const root = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 17';
    const tracker = new GameHistoryTracker();
    tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: root, moves: ['e7e5', 'e2e4'] } }));
    const pairs = tracker.getMovePairs();
    expect(pairs.map((pair) => pair.moveNumber)).toEqual([17, 18]);
    expect(pairs[0]?.white).toBeUndefined();
    expect(pairs[0]?.black?.san).toBe('e5');
    expect(tracker.exportPgn()).toContain('17... e5 18. e4');
  });
  it('does not record an illegal replay as a duplicate FEN', () => {
    const tracker = new GameHistoryTracker();
    tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: root, moves: ['e2e4', 'e7e4'] } }));
    expect(tracker.getMoves().map((move) => move.san)).toEqual(['e4']);
  });
  it('rebuilds a corrected history rather than keeping a stale prefix', () => {
    const tracker = new GameHistoryTracker();
    tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: root, moves: ['e2e4', 'e7e5'] } }));
    tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: root, moves: ['d2d4'] } }));
    expect(tracker.getMoves().map((move) => move.san)).toEqual(['d4']);
  });
  it('replays moves using the preserved standard rules', () => {
    const root = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const tracker = new GameHistoryTracker();
    tracker.reset('game-1', root, 0, 'standard');
    tracker.updateFromSnapshot(
      createMockSnapshot({ variant: 'standard', history: { startFen: root, moves: ['g1f3'] } }),
      500,
    );
    expect(tracker.getMoves()[0]?.san).toBe('Nf3');
    expect(tracker.getMoves()[0]?.fen).toContain('5N2');
  });
});

it('does not substitute standard chess for an invalid root position', () => {
  const tracker = new GameHistoryTracker();
  tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: 'invalid', moves: ['e2e4'] } }));
  expect(tracker.getMoves()).toEqual([]);
});
// A root where the two supported variants disagree about castling, so "did the tracker switch
// rules" is observable rather than implied by a SAN string that both variants produce.
// White is to move and its king starts on c1, so castling is only expressible if the tracker
// applied the right rules.
const CASTLE_ROOT = 'r3k2r/8/8/8/8/8/8/R1K4R w KQkq - 0 1';
const CASTLE_END = 'r4rk1/8/8/8/8/8/8/R4RK1 w - - 2 2';
const ORTHODOX_CASTLE = ['c1g1', 'e8g8'];
const CHESS960_CASTLE = ['c1h1', 'e8g8'];

it('replays castling under the configured rules and rebuilds when the variant changes', () => {
  const tracker = new GameHistoryTracker();
  tracker.reset('game-1', CASTLE_ROOT, 0, 'standard');
  tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: CASTLE_ROOT, moves: ORTHODOX_CASTLE } }));
  expect(tracker.getMoves().map((move) => move.san)).toEqual(['O-O', 'O-O']);

  // Under Chess960 the same move is the king's own rook square, and the stale prefix must go.
  tracker.updateFromSnapshot(
    createMockSnapshot({
      variant: 'chess960',
      history: { startFen: CASTLE_ROOT, moves: CHESS960_CASTLE },
    }),
  );
  expect(tracker.getMoves().map((move) => move.uci)).toEqual(CHESS960_CASTLE);
  expect(tracker.getMoves().at(-1)?.fen).toBe(CASTLE_END);
});

it('preserves the configured variant across snapshots that omit it', () => {
  const tracker = new GameHistoryTracker();
  tracker.reset('game-1', CASTLE_ROOT, 0, 'chess960');
  // No variant on the snapshot: the configured rules must still be the ones applied.
  tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: CASTLE_ROOT, moves: CHESS960_CASTLE } }));
  expect(tracker.getMoves().map((move) => move.uci)).toEqual(CHESS960_CASTLE);
  expect(tracker.getMoves().at(-1)?.fen).toBe(CASTLE_END);
});
it('keeps recorded history when an intermediate snapshot omits history', () => {
  const tracker = new GameHistoryTracker();
  const root = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  tracker.updateFromSnapshot(createMockSnapshot({ history: { startFen: root, moves: ['e2e4'] } }));
  tracker.updateFromSnapshot(createMockSnapshot());
  expect(tracker.getMoves().map((move) => move.san)).toEqual(['e4']);
});
