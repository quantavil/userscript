import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBoard, getGame, invalidateGameCache } from '../src/state.js';

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateGameCache();
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
