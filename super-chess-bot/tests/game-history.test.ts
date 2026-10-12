import { parsePgn } from 'chessops/pgn';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameHistoryTracker } from '../src/game-history.js';
import type { GameSnapshot } from '../src/sites/types.js';

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
