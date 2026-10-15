import stockfishPackage from 'stockfish/package.json' with { type: 'json' };
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import pkg from '../../../package.json' with { type: 'json' };
import { createChesscomAdapter } from '../../../src/sites/chesscom/adapter.js';
import { resetCapturedChesscomController } from '../../../src/sites/chesscom/bridge.js';
import { selectSite as selectChesscomOnlySite } from '../../../src/sites/entries/chesscom-only.js';
import { selectSite } from '../../../src/sites/registry.js';
import {
  getUserscriptMetadata,
  STOCKFISH_JS_HASH,
  STOCKFISH_WASM_HASH,
  userscriptMetadata,
} from '../../../src/userscript/metadata.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const PROMO_FEN = '7k/P7/8/8/8/8/8/K7 w - - 0 1';

afterEach(() => {
  resetCapturedChesscomController();
});

describe('site adapter selection', () => {
  it('selects only exact Chess.com hostnames', () => {
    expect(selectSite('www.chess.com')?.id).toBe('chesscom');
    expect(selectSite('chess.com')?.id).toBe('chesscom');
    expect(selectSite('www.pychess.org')).toBeNull();
    expect(selectSite('pychess.org')).toBeNull();
    expect(selectSite('chess.com.example.test')).toBeNull();
    expect(selectSite('pychess.org.example.test')).toBeNull();
  });

  it('selects Lichess only on its exact hostnames', () => {
    const page = { document: { getElementById: () => null } } as unknown as Window;
    expect(selectSite('lichess.org', () => page)?.id).toBe('lichess');
    expect(selectSite('www.lichess.org', () => page)?.id).toBe('lichess');
    expect(selectSite('lichess.org.example.test')).toBeNull();
  });

  it('selects only exact Chess.com hostnames in the chesscom-only build', () => {
    expect(selectChesscomOnlySite('www.chess.com')?.id).toBe('chesscom');
    expect(selectChesscomOnlySite('chess.com')?.id).toBe('chesscom');
    expect(selectChesscomOnlySite('lichess.org')).toBeNull();
    expect(selectChesscomOnlySite('www.lichess.org')).toBeNull();
    expect(selectChesscomOnlySite('pychess.org')).toBeNull();
    expect(selectChesscomOnlySite('www.pychess.org')).toBeNull();
    expect(selectChesscomOnlySite('chess.com.example.test')).toBeNull();
  });

  it('keeps a stable game identity and changes it when the board is replaced', () => {
    const first = makeBoard();
    const second = makeBoard();
    let boards = [first];
    const page = makePage(() => boards);
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    const initial = adapter.read();
    expect(initial.kind).toBe('game');
    if (initial.kind !== 'game') return;
    expect(adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { identity: initial.snapshot.identity },
    });

    first.game = makeGame();
    const replacedGame = adapter.read();
    expect(replacedGame.kind).toBe('game');
    if (replacedGame.kind === 'game') expect(replacedGame.snapshot.identity).not.toBe(initial.snapshot.identity);

    boards = [second];
    const replaced = adapter.read();
    expect(replaced.kind).toBe('game');
    if (replaced.kind === 'game') expect(replaced.snapshot.identity).not.toBe(initial.snapshot.identity);
  });

  it('skips hidden Chess.com boards and detaches the Move subscription', () => {
    const on = vi.fn();
    const off = vi.fn();
    const hidden = makeBoard({ visible: false });
    const active = makeBoard({ game: { getFEN: () => START_FEN, getPlayingAs: () => 1, on, off } });
    const page = makePage(() => [hidden, active]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { board: active } });
    const unsubscribe = adapter.subscribe(() => {});
    expect(on).toHaveBeenCalledWith('Move', expect.any(Function));
    unsubscribe();
    expect(off).toHaveBeenCalledWith('Move', on.mock.calls[0][1]);
  });

  it.each([
    ['0:01.0', 1_000],
    ['2:30.5', 150_500],
    ['42.25', 42_250],
  ])('exposes the active Chess.com clock %s as remaining milliseconds', (clockText, expectedMs) => {
    const page = makePage(() => [makeBoard()], clockText);
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: expectedMs } });
  });

  it('ignores malformed active Chess.com clock text', () => {
    const page = makePage(() => [makeBoard()], '0:60.0');
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: null } });
  });

  it('reads active clock times in 0:ss and mm:ss.s formats via .move-time-content', () => {
    const board = makeBoard();
    const createPage = (text: string) => ({
      location: { hostname: 'www.chess.com' },
      document: {
        body: {},
        querySelector: (selector: string) => {
          if (selector.includes('move-time-content')) return { textContent: text };
          return selector.includes('game-over') ? null : board;
        },
        querySelectorAll: () => [board],
      },
      MutationObserver: class {
        observe() {}
        disconnect() {}
      },
    });

    const adapter1 = createChesscomAdapter(() => createPage('0:09.5') as unknown as Window);
    expect(adapter1.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: 9_500 } });

    const adapter2 = createChesscomAdapter(() => createPage('0:37') as unknown as Window);
    expect(adapter2.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: 37_000 } });
  });

  it('reads orientation from controller options instead of DOM attributes', () => {
    const board = makeBoard({ game: makeGame({ flipped: true }) });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { orientation: 'black' } });
  });

  it('preserves playerColor and reports phase finished when game ends and playingAs flips undefined', () => {
    let gameOver = false;
    let playingAs: number | undefined = 1;
    const game = makeGame();
    (game as unknown as { isGameOver: () => boolean }).isGameOver = () => gameOver;
    (game as unknown as { getPlayingAs: () => number | undefined }).getPlayingAs = () => playingAs;

    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    // Live state: playing as white
    expect(adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { phase: 'live', playerColor: 'w', inputReady: true },
    });

    // Game over: Chess.com flips getPlayingAs to undefined and isGameOver to true
    gameOver = true;
    playingAs = undefined;

    expect(adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { phase: 'finished', playerColor: 'w', inputReady: false },
    });
  });

  it('falls back to orientation when reading a game that is already finished on page load', () => {
    const game = makeGame({ flipped: true });
    (game as unknown as { isGameOver: () => boolean }).isGameOver = () => true;
    (game as unknown as { getPlayingAs: () => number | undefined }).getPlayingAs = () => undefined;

    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);

    expect(adapter.read()).toMatchObject({
      kind: 'game',
      snapshot: { phase: 'finished', playerColor: 'b', orientation: 'black', inputReady: false },
    });
  });
});

describe('Chess.com controller move submission', () => {
  it('submits through controller.move with an object payload and reports Move success', async () => {
    const game = makeControllerGame();
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;

    const submitted = await adapter.submitMove(makeMoveRequest(read.snapshot.identity, START_FEN, 'e2e4', AFTER_E4));

    expect(submitted).toBe(true);
    expect(game.isLegalMove).toHaveBeenCalledWith({ from: 'e2', to: 'e4' });
    expect(game.move).toHaveBeenCalledWith({ from: 'e2', to: 'e4', userGenerated: true });
  });

  it('lowercases the promotion character in the object payload', async () => {
    const game = makeControllerGame({ fen: PROMO_FEN });
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;

    const submitted = await adapter.submitMove(
      makeMoveRequest(read.snapshot.identity, PROMO_FEN, 'a7a8Q', 'Q6k/8/8/8/8/8/8/K7 b - - 0 1'),
    );

    expect(submitted).toBe(true);
    expect(game.isLegalMove).toHaveBeenCalledWith({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(game.move).toHaveBeenCalledWith({
      from: 'a7',
      to: 'a8',
      promotion: 'q',
      userGenerated: true,
    });
  });

  it('reports failure for IllegalMove results without DOM promotion handling', async () => {
    const game = makeControllerGame({ moveResult: { type: 'IllegalMove' } });
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;

    const submitted = await adapter.submitMove(makeMoveRequest(read.snapshot.identity, START_FEN, 'e2e4', AFTER_E4));

    expect(submitted).toBe(false);
    expect(game.move).toHaveBeenCalledOnce();
  });

  it('skips submission when the controller reports the move illegal', async () => {
    const game = makeControllerGame({ legal: false });
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;

    const submitted = await adapter.submitMove(makeMoveRequest(read.snapshot.identity, START_FEN, 'e2e5', AFTER_E4));

    expect(submitted).toBe(false);
    expect(game.move).not.toHaveBeenCalled();
  });

  it('resets a stuck promotion chooser before submitting', async () => {
    let state = 'PomotionAreaShowing';
    let closed = false;
    const game = makeControllerGame({
      state: () => state,
      renderer: {
        closePromotionWindow: () => {
          closed = true;
          state = 'Idle';
        },
      },
    });
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;
    expect(read.snapshot.inputReady).toBe(false);

    const submitted = await adapter.submitMove(makeMoveRequest(read.snapshot.identity, START_FEN, 'e2e4', AFTER_E4));

    expect(closed).toBe(true);
    expect(submitted).toBe(true);
    expect(game.move).toHaveBeenCalledWith({ from: 'e2', to: 'e4', userGenerated: true });
  });

  it('rejects moves for a stale position without touching the controller', async () => {
    const game = makeControllerGame();
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;

    const submitted = await adapter.submitMove(makeMoveRequest({}, START_FEN, 'e2e4', AFTER_E4));

    expect(submitted).toBe(false);
    expect(game.move).not.toHaveBeenCalled();
  });

  it('rejects moves when the accepted FEN no longer matches', async () => {
    const game = makeControllerGame();
    const board = makeBoard({ game });
    const page = makePage(() => [board]);
    const adapter = createChesscomAdapter(() => page as unknown as Window);
    const read = adapter.read();
    expect(read.kind).toBe('game');
    if (read.kind !== 'game') return;

    const submitted = await adapter.submitMove(makeMoveRequest(read.snapshot.identity, AFTER_E4, 'e7e5', AFTER_E4));

    expect(submitted).toBe(false);
    expect(game.move).not.toHaveBeenCalled();
  });
});

describe('userscript package metadata', () => {
  it('includes supported sites and document-start timing while preserving GPL and pinned Stockfish resources', () => {
    expect(userscriptMetadata.match).toEqual([
      'https://lichess.org/*',
      'https://www.lichess.org/*',
      'https://chess.com/*',
      'https://www.chess.com/*',
    ]);
    expect(userscriptMetadata.namespace).toBe('https://github.com/quantavil/userscript');
    expect(userscriptMetadata['run-at']).toBe('document-start');
    expect(userscriptMetadata['inject-into']).toBe('page');
    expect(userscriptMetadata.license).toBe('GPL-3.0-or-later');
    expect(pkg.license).toBe('GPL-3.0-or-later');
    expect(userscriptMetadata.description).toBe(pkg.description);

    const worker = `https://unpkg.com/stockfish@${stockfishPackage.version}/bin/stockfish-${stockfishPackage.buildVersion}-lite-single`;
    expect(userscriptMetadata.resource).toEqual({
      'stockfish.js': `${worker}.js#sha256=${STOCKFISH_JS_HASH}`,
      'stockfish.wasm': `${worker}.wasm#sha256=${STOCKFISH_WASM_HASH}`,
    });
  });

  it('provides dedicated Chess.com-only userscript metadata matching only Chess.com', () => {
    const meta = getUserscriptMetadata('chesscom');
    expect(meta.name).toBe('♟Super-chess-Bot (Chess.com)');
    expect(meta.namespace).toBe('https://github.com/quantavil/userscript');
    expect(meta.description).toBe('Local Stockfish analysis and move automation for Chess.com standard games');
    expect(meta.match).toEqual(['https://chess.com/*', 'https://www.chess.com/*']);
    expect(meta.license).toBe('GPL-3.0-or-later');
    expect(meta['run-at']).toBe('document-start');
    expect(meta['inject-into']).toBe('page');

    const worker = `https://unpkg.com/stockfish@${stockfishPackage.version}/bin/stockfish-${stockfishPackage.buildVersion}-lite-single`;
    expect(meta.resource).toEqual({
      'stockfish.js': `${worker}.js#sha256=${STOCKFISH_JS_HASH}`,
      'stockfish.wasm': `${worker}.wasm#sha256=${STOCKFISH_WASM_HASH}`,
    });
  });
});

function makeBoard({ visible = true, game = makeGame() }: { visible?: boolean; game?: object } = {}) {
  return {
    game,
    isConnected: true,
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({ display: visible ? 'block' : 'none', visibility: 'visible' }),
      },
    },
    getClientRects: () => (visible ? [{ width: 400, height: 400 }] : []),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    getAttribute: (name: string) => (name === 'orientation' ? 'white' : null),
    classList: { contains: () => false },
  };
}

function makeGame({ flipped = false }: { flipped?: boolean } = {}) {
  return {
    getFEN: () => START_FEN,
    getPlayingAs: () => 1,
    getTurn: () => 1,
    getOptions: () => ({ flipped, isWhiteOnBottom: !flipped, id: 'play-computer' }),
    getState: () => 'Idle',
    isGameOver: () => false,
  };
}

function makeControllerGame({
  fen = START_FEN,
  legal = true,
  moveResult = { type: 'Move' },
  state = () => 'Idle',
  renderer = {},
}: {
  fen?: string;
  legal?: boolean;
  moveResult?: { type: string };
  state?: () => string;
  renderer?: object;
} = {}) {
  return {
    getFEN: () => fen,
    getPlayingAs: () => 1,
    getTurn: () => (fen.split(' ')[1] === 'b' ? 2 : 1),
    getOptions: () => ({ flipped: false, isWhiteOnBottom: true, id: 'play-computer' }),
    getState: state,
    isGameOver: () => false,
    isLegalMove: vi.fn(() => legal),
    move: vi.fn(() => moveResult),
    getHistoryFENs: () => [START_FEN],
    getRenderer: () => renderer,
    on: vi.fn(),
    off: vi.fn(),
  };
}

function makeMoveRequest(identity: object, fromFen: string, uci: string, expectedFen: string) {
  return {
    identity,
    fromFen,
    uci,
    expectedFen,
    expectedPly: 1,
    signal: new AbortController().signal,
    isCurrent: () => true,
  };
}

function makePage(boards: () => unknown[], clockText: string | null = null) {
  return {
    location: { hostname: 'www.chess.com' },
    document: {
      body: {},
      querySelector: (selector: string) => {
        if (selector.includes('clock-player-turn')) return clockText === null ? null : { textContent: clockText };
        return selector.includes('game-over') ? null : (boards()[0] ?? null);
      },
      querySelectorAll: () => boards(),
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  };
}

it('marks dispatch before invoking the Chess.com move API', async () => {
  const game = makeControllerGame();
  const board = makeBoard({ game });
  const page = makePage(() => [board]);
  const adapter = createChesscomAdapter(() => page as unknown as Window);
  const read = adapter.read();
  if (read.kind !== 'game') throw new Error('missing fixture');
  const onDispatch = vi.fn();
  await adapter.submitMove({
    ...makeMoveRequest(read.snapshot.identity, START_FEN, 'e2e4', AFTER_E4),
    onDispatch,
  });
  expect(onDispatch).toHaveBeenCalledOnce();
  expect(onDispatch.mock.invocationCallOrder[0]).toBeLessThan(game.move.mock.invocationCallOrder[0]);
});
