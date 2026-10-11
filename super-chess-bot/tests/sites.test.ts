import stockfishPackage from 'stockfish/package.json' with { type: 'json' };
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { createChesscomAdapter } from '../src/sites/chesscom.js';
import { selectSite } from '../src/sites/index.js';
import { userscriptMetadata } from '../src/userscript-metadata.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('site adapter selection', () => {
  it('selects only exact Chess.com hostnames', () => {
    expect(selectSite('www.chess.com')?.id).toBe('chesscom');
    expect(selectSite('chess.com')?.id).toBe('chesscom');
    expect(selectSite('www.pychess.org')?.id).toBe('pychess');
    expect(selectSite('pychess.org')?.id).toBe('pychess');
    expect(selectSite('chess.com.example.test')).toBeNull();
    expect(selectSite('pychess.org.example.test')).toBeNull();
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
    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { identity: initial.snapshot.identity } });

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
});

describe('userscript package metadata', () => {
  it('includes both sites while preserving GPL and pinned Stockfish resources', () => {
    expect(userscriptMetadata.match).toEqual([
      'https://www.chess.com/play/computer*',
      'https://www.chess.com/game/*',
      'https://www.chess.com/play/online*',
      'https://www.pychess.org/*',
      'https://pychess.org/*',
    ]);
    expect(userscriptMetadata.license).toBe('GPL-3.0-or-later');
    expect(pkg.license).toBe('GPL-3.0-or-later');
    expect(userscriptMetadata.description).toBe(pkg.description);

    const worker = `https://unpkg.com/stockfish@${stockfishPackage.version}/bin/stockfish-${stockfishPackage.buildVersion}-lite-single`;
    expect(userscriptMetadata.resource).toEqual({
      'stockfish.js': `${worker}.js`,
      'stockfish.wasm': `${worker}.wasm`,
    });
  });
});

function makeBoard({ visible = true, game = makeGame() }: { visible?: boolean; game?: object } = {}) {
  return {
    game,
    isConnected: true,
    ownerDocument: {
      defaultView: { getComputedStyle: () => ({ display: visible ? 'block' : 'none', visibility: 'visible' }) },
    },
    getClientRects: () => (visible ? [{ width: 400, height: 400 }] : []),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    getAttribute: (name: string) => (name === 'orientation' ? 'white' : null),
    classList: { contains: () => false },
  };
}

function makeGame() {
  return { getFEN: () => START_FEN, getPlayingAs: () => 1, isGameOver: () => false };
}

function makePage(boards: () => unknown[]) {
  return {
    location: { hostname: 'www.chess.com' },
    document: {
      body: {},
      querySelector: (selector: string) => (selector.includes('game-over') ? null : (boards()[0] ?? null)),
      querySelectorAll: () => boards(),
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
  };
}
