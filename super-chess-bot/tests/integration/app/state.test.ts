import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { BotState, clearRecommendation, isBoardFlipped } from '../../../src/app/state.js';
import { setActiveSite } from '../../../src/sites/active.js';
import { getBoard, getGame, invalidateGameCache } from '../../../src/sites/chesscom/snapshot.js';

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

describe('isBoardFlipped helper', () => {
  it('returns true when orientation is black and false when white', () => {
    const makeSnapshot = (orientation: 'black' | 'white') => ({
      identity: {},
      gameId: 'lichess-one',
      board: {} as HTMLElement,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      playerColor: 'b' as const,
      sideToMove: 'b' as const,
      orientation,
      phase: 'live' as const,
      inputReady: true,
      remainingMs: 60_000,
    });

    setActiveSite({
      id: 'lichess',
      read: () => ({ kind: 'game', snapshot: makeSnapshot('black') }),
      subscribe: () => () => {},
      submitMove: async () => false,
      cancelInput() {},
    });
    expect(isBoardFlipped()).toBe(true);

    setActiveSite({
      id: 'lichess',
      read: () => ({ kind: 'game', snapshot: makeSnapshot('white') }),
      subscribe: () => () => {},
      submitMove: async () => false,
      cancelInput() {},
    });
    expect(isBoardFlipped()).toBe(false);
  });

  it('returns false when no active site exists or read throws', () => {
    setActiveSite(null);
    expect(isBoardFlipped()).toBe(false);

    setActiveSite({
      id: 'lichess',
      read: () => {
        throw new Error('read failed');
      },
      subscribe: () => () => {},
      submitMove: async () => false,
      cancelInput() {},
    });
    expect(isBoardFlipped()).toBe(false);
  });
});

describe('clearRecommendation helper', () => {
  it('clears bestMove, currentEvaluation, principalVariation, and multiPvLines', () => {
    BotState.bestMove = 'e2e4';
    BotState.currentEvaluation = '+0.50';
    BotState.principalVariation = 'e2e4 e7e5';
    BotState.multiPvLines = [{ multipv: 1, depth: 20, evaluation: { cp: 50 }, pv: 'e2e4', uci: 'e2e4' }];

    clearRecommendation();

    expect(BotState.bestMove).toBe('-');
    expect(BotState.currentEvaluation).toBe('-');
    expect(BotState.principalVariation).toBe('-');
    expect(BotState.multiPvLines).toEqual([]);
  });
});
