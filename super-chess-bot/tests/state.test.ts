import { afterEach, describe, expect, it, vi } from 'vitest';
import { setActiveSite } from '../src/sites/active.js';
import {
  getBoard,
  getFen,
  getGame,
  getPlayerColor,
  invalidateGameCache,
  isBoardFlipped,
  isPlayersTurn,
  pa,
} from '../src/state.js';

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateGameCache();
  setActiveSite(null);
});

function makeBoard(game: unknown, { visible = true, size = 400 } = {}) {
  return {
    game,
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({ display: visible ? 'block' : 'none', visibility: 'visible' }),
      },
    },
    getClientRects: () => (visible ? [{ width: size, height: size }] : []),
    getBoundingClientRect: () => ({ width: size, height: size }),
  };
}

function boardDocument(boards: unknown[]) {
  return {
    querySelector: () => boards[0] ?? null,
    querySelectorAll: () => boards,
  };
}

describe('active Chess.com board selection', () => {
  it('skips a hidden first match and selects the visible game board', () => {
    const hiddenGame = { getFEN: () => 'hidden position' };
    const activeGame = { getFEN: () => 'active position' };
    const hidden = makeBoard(hiddenGame, { visible: false });
    const active = makeBoard(activeGame);
    vi.stubGlobal('document', boardDocument([hidden, active]));

    expect(getBoard()).toBe(active);
    expect(getGame()).toBe(activeGame);
  });

  it('prefers a visible board with a game API over an earlier display board', () => {
    const displayBoard = makeBoard(null, { size: 600 });
    const game = { getFEN: () => 'active position' };
    const active = makeBoard(game, { size: 400 });
    vi.stubGlobal('document', boardDocument([displayBoard, active]));

    expect(getBoard()).toBe(active);
    expect(getGame()).toBe(game);
  });
});

describe('snapshot-derived compatibility helpers', () => {
  it('uses the active site snapshot for color, turn, FEN, and orientation', () => {
    const snapshot = {
      identity: {},
      gameId: 'pychess-one',
      board: {} as HTMLElement,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      playerColor: 'b' as const,
      sideToMove: 'b' as const,
      orientation: 'black' as const,
      phase: 'live' as const,
      inputReady: true,
      remainingMs: 60_000,
    };
    setActiveSite({
      id: 'pychess',
      capabilities: { input: 'selection' },
      read: () => ({ kind: 'game', snapshot }),
      subscribe: () => () => {},
      submitMove: async () => false,
      cancelInput() {},
    });

    expect(getFen()).toBe(snapshot.fen);
    expect(getPlayerColor()).toBe('b');
    expect(isPlayersTurn()).toBe(true);
    expect(isBoardFlipped()).toBe(true);
    expect(pa()).toBe(2);
  });
});
