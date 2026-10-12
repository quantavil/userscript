import { describe, expect, it } from 'vitest';
import { type PychessObservation, parsePychessObservation } from '../src/sites/pychess-state.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E4_C5 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('PyChess accepted game state', () => {
  it('accepts orthodox start metadata with an empty initial FEN', () => {
    const result = parsePychessObservation(observation(), {});

    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.fen).toBe(START_FEN);
      expect(result.snapshot.history).toEqual({ startFen: START_FEN, moves: [] });
      expect(result.snapshot.inputReady).toBe(true);
    }
  });

  it('replays the accepted e4 c5 line and exposes each confirmed ply', () => {
    const result = parsePychessObservation(
      observation({
        state: {
          fen: AFTER_E4_C5,
          displayedPlacement: AFTER_E4_C5.split(' ')[0],
          turnColor: 'white',
          movableColor: 'white',
        },
        moves: [
          { ply: 1, san: 'e4', active: false },
          { ply: 2, san: 'c5', active: true },
        ],
      }),
      {},
    );

    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.history?.moves).toEqual(['e2e4', 'c7c5']);
      expect(result.snapshot.confirmedFens).toHaveLength(3);
      expect(result.snapshot.confirmedFens?.[2]).toBe(AFTER_E4_C5);
    }
  });

  it('blocks input while optimistic board pieces differ from the accepted FEN', () => {
    const result = parsePychessObservation(
      observation({ state: { fen: START_FEN, displayedPlacement: AFTER_E4.split(' ')[0], turnColor: 'black' } }),
      {},
    );

    expect(result.kind).toBe('game');
    if (result.kind === 'game') expect(result.snapshot.inputReady).toBe(false);
  });

  it('suspends input when browsing an earlier accepted ply', () => {
    const result = parsePychessObservation(
      observation({
        state: { fen: AFTER_E4, displayedPlacement: AFTER_E4.split(' ')[0], turnColor: 'black', movableColor: null },
        moves: [
          { ply: 1, san: 'e4', active: true },
          { ply: 2, san: 'c5', active: false },
        ],
      }),
      {},
    );

    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.phase).toBe('replay');
      expect(result.snapshot.history?.moves).toEqual(['e2e4']);
      expect(result.snapshot.inputReady).toBe(false);
    }
  });

  it.each([
    ['white', 'white', 60_000],
    ['white', 'black', 6_000],
    ['black', 'white', 6_000],
    ['black', 'black', 60_000],
  ] as const)('maps player %s independently from %s orientation', (color, orientation, expectedClock) => {
    const result = parsePychessObservation(
      observation({
        metadata: {
          whitePlayer: color === 'white' ? 'Anon–pZnxrQ3f' : 'Fairy-Stockfish',
          blackPlayer: color === 'black' ? 'Anon–pZnxrQ3f' : 'Fairy-Stockfish',
        },
        state: { orientation },
        clocks: {
          clock0: { min: '00', sec: '06.0', connecting: false },
          clock1: { min: '01', sec: '00', connecting: false },
        },
      }),
      {},
    );

    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.playerColor).toBe(color === 'white' ? 'w' : 'b');
      expect(result.snapshot.orientation).toBe(orientation);
      expect(result.snapshot.remainingMs).toBe(expectedClock);
    }
  });

  it('returns null for malformed clocks and suspends input while reconnecting', () => {
    const malformed = parsePychessObservation(
      observation({ clocks: { clock1: { min: 'x', sec: '00', connecting: false } } }),
      {},
    );
    const connecting = parsePychessObservation(
      observation({ clocks: { clock1: { min: '01', sec: '00', connecting: true } } }),
      {},
    );

    expect(malformed.kind).toBe('game');
    if (malformed.kind === 'game') expect(malformed.snapshot.remainingMs).toBeNull();
    expect(connecting.kind).toBe('game');
    if (connecting.kind === 'game') expect(connecting.snapshot.inputReady).toBe(false);
  });

  it('uses rendered terminal result despite stale body result metadata', () => {
    const result = parsePychessObservation(
      observation({ result: { text: '0-1', postgame: true }, metadata: { initialResult: '*', status: '-2' } }),
      {},
    );

    expect(result.kind).toBe('game');
    if (result.kind === 'game') expect(result.snapshot.phase).toBe('finished');
  });

  it('recognizes a terminal reload from a nonnegative status and terminal result', () => {
    const result = parsePychessObservation(observation({ metadata: { initialResult: '0-1', status: '0' } }), {});

    expect(result).toMatchObject({ kind: 'game', snapshot: { phase: 'finished' } });
  });

  it.each([
    ['negative live status', '-2'],
    ['missing status', null],
    ['malformed status', 'running'],
  ] as const)('does not infer a terminal reload from a stale result and %s', (_label, status) => {
    const result = parsePychessObservation(observation({ metadata: { initialResult: '0-1', status } }), {});

    expect(result).toMatchObject({ kind: 'game', snapshot: { phase: 'live' } });
  });

  it('accepts an aborted result only when postgame UI is present', () => {
    const live = parsePychessObservation(observation({ result: { text: '*', postgame: false } }), {});
    const aborted = parsePychessObservation(observation({ result: { text: '*', postgame: true } }), {});

    expect(live).toMatchObject({ kind: 'game', snapshot: { phase: 'live' } });
    expect(aborted).toMatchObject({ kind: 'game', snapshot: { phase: 'finished' } });
  });

  it('does not treat missing movable color by itself as game end', () => {
    const result = parsePychessObservation(observation({ state: { movableColor: null } }), {});

    expect(result.kind).toBe('game');
    if (result.kind === 'game') {
      expect(result.snapshot.phase).toBe('live');
      expect(result.snapshot.inputReady).toBe(false);
    }
  });

  it.each([
    ['missing game identity', { metadata: { gameId: null } }],
    ['conflicting URL identity', { metadata: { pathname: '/Other1234' } }],
    ['unknown player identity', { metadata: { username: 'guest' } }],
    ['missing variant', { metadata: { variant: '' } }],
    ['correspondence play', { metadata: { correspondence: 'True' } }],
    ['disconnected board', { board: { connected: false } }],
    ['foreign board', { board: { owned: false } }],
    ['invalid board width', { board: { width: 0 } }],
    ['malformed FEN', { state: { fen: 'not a fen' } }],
    [
      'noncontiguous SAN history',
      {
        moves: [
          { ply: 1, san: 'e4', active: false },
          { ply: 3, san: 'c5', active: true },
        ],
      },
    ],
  ])('rejects %s', (_name, changes) => {
    expect(parsePychessObservation(observation(changes), {})).not.toMatchObject({ kind: 'game' });
  });

  it('accepts any opponent, human or engine', () => {
    const human = parsePychessObservation(observation({ metadata: { blackPlayer: 'Human-Opponent' } }), {});
    expect(human.kind).toBe('game');

    const engine = parsePychessObservation(observation(), {});
    expect(engine.kind).toBe('game');
  });

  it('waits for accepted history when the movelist is truncated', () => {
    const result = parsePychessObservation(
      observation({
        state: { fen: AFTER_E4_C5, displayedPlacement: AFTER_E4_C5.split(' ')[0], turnColor: 'white' },
        moves: [{ ply: 1, san: 'e4', active: true }],
      }),
      {},
    );

    expect(result).toMatchObject({ kind: 'waiting' });
  });
});

function observation(changes: Record<string, unknown> = {}): PychessObservation {
  const base: PychessObservation = {
    metadata: {
      isRoundView: true,
      pathname: '/VwBeF2em',
      gameId: 'VwBeF2em',
      username: 'Anon–pZnxrQ3f',
      whitePlayer: 'Anon–pZnxrQ3f',
      blackPlayer: 'Fairy-Stockfish',
      variant: 'chess',
      chess960: 'False',
      correspondence: 'False',
      initialFen: '',
      status: '0',
      initialResult: '*',
    },
    board: { element: {} as HTMLElement, owned: true, connected: true, visible: true, width: 8, height: 8 },
    state: {
      fen: START_FEN,
      displayedPlacement: START_FEN.split(' ')[0],
      turnColor: 'white',
      movableColor: 'white',
      orientation: 'white',
    },
    moves: [],
    result: { text: null, postgame: false },
    clocks: {
      clock0: { min: '01', sec: '00', connecting: false },
      clock1: { min: '01', sec: '00', connecting: false },
    },
  };
  const merged = {
    ...base,
    ...changes,
    metadata: { ...base.metadata, ...(changes.metadata as object | undefined) },
    board: { ...base.board, ...(changes.board as object | undefined) },
    state: { ...base.state, ...(changes.state as object | undefined) },
    moves: changes.moves ?? base.moves,
    result: { ...base.result, ...(changes.result as object | undefined) },
    clocks: {
      ...base.clocks,
      ...(changes.clocks as object | undefined),
      clock0: { ...base.clocks.clock0, ...((changes.clocks as { clock0?: object } | undefined)?.clock0 ?? {}) },
      clock1: { ...base.clocks.clock1, ...((changes.clocks as { clock1?: object } | undefined)?.clock1 ?? {}) },
    },
  };
  return merged as PychessObservation;
}
