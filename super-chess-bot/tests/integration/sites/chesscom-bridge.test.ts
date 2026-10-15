import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  getCapturedChesscomController,
  installChesscomControllerBridge,
  resetCapturedChesscomController,
  setCapturedChesscomController,
} from '../../../src/sites/chesscom/bridge.js';

afterEach(() => {
  resetCapturedChesscomController();
});

function boardPrototype() {
  return {
    init(this: { game?: unknown }, ..._args: unknown[]) {
      return this.game;
    },
    createGame(this: { game?: unknown }, ..._args: unknown[]) {
      this.game = { marker: 'created-controller' };
    },
  };
}

function makePage({
  constructorPrototype = boardPrototype(),
  boards = [],
}: {
  constructorPrototype?: object;
  boards?: { game?: unknown }[];
} = {}) {
  const defineMock = vi.fn();
  const registry = {
    define: defineMock,
    get: (name: string) => (name === 'wc-chess-board' ? { prototype: constructorPrototype } : undefined),
  };
  const page = {
    customElements: registry,
    document: { querySelectorAll: () => boards },
  } as unknown as Window & { customElements: CustomElementRegistry };
  return { page, defineMock };
}

describe('Chess.com board controller bridge', () => {
  it('captures the controller returned by the board init method', () => {
    const controller = { marker: 'init-controller' };
    const proto = boardPrototype();
    const { page } = makePage({ constructorPrototype: proto });
    const captured = vi.fn();

    expect(installChesscomControllerBridge(page, captured)).toBe(true);
    const result = (proto as { init: (this: { game?: unknown }) => unknown }).init.call({
      game: controller,
    });

    expect(result).toBe(controller);
    expect(captured).toHaveBeenCalledWith(controller);
    expect(getCapturedChesscomController()).toBe(controller);
  });

  it('captures the game installed by createGame', () => {
    const proto = boardPrototype();
    const { page } = makePage({ constructorPrototype: proto });
    const captured = vi.fn();

    installChesscomControllerBridge(page, captured);
    const owner: { game?: unknown } = {};
    (proto as { createGame: (this: { game?: unknown }) => void }).createGame.call(owner);

    expect(captured).toHaveBeenCalledWith({ marker: 'created-controller' });
    expect(getCapturedChesscomController()).toEqual({ marker: 'created-controller' });
  });

  it('intercepts later wc-chess-board definitions', () => {
    const { page, defineMock } = makePage({ constructorPrototype: {} });
    const captured = vi.fn();

    installChesscomControllerBridge(page, captured);
    const lateProto = boardPrototype();
    const lateConstructor = { prototype: lateProto };
    page.customElements.define('wc-chess-board', lateConstructor as unknown as CustomElementConstructor);

    const controller = { marker: 'late-controller' };
    (lateProto as { init: (this: { game?: unknown }) => unknown }).init.call({ game: controller });

    expect(defineMock).toHaveBeenCalledOnce();
    expect(captured).toHaveBeenCalledWith(controller);
  });

  it('leaves other custom element definitions alone', () => {
    const { page } = makePage();
    const captured = vi.fn();

    installChesscomControllerBridge(page, captured);
    const otherProto = boardPrototype();
    page.customElements.define('other-element', {
      prototype: otherProto,
    } as unknown as CustomElementConstructor);
    (otherProto as { init: (this: { game?: unknown }) => unknown }).init.call({
      game: { marker: 'other' },
    });

    expect(captured).not.toHaveBeenCalled();
  });

  it('sweeps an already-hydrated board on late installs', () => {
    const controller = { marker: 'hydrated-controller', getFEN: () => 'fen' };
    const { page } = makePage({ boards: [{ game: controller }] });
    const captured = vi.fn();

    expect(installChesscomControllerBridge(page, captured)).toBe(true);

    expect(captured).toHaveBeenCalledWith(controller);
  });

  it('stores and replaces the stable module reference', () => {
    expect(getCapturedChesscomController()).toBeNull();
    setCapturedChesscomController({ marker: 'one' });
    expect(getCapturedChesscomController()).toEqual({ marker: 'one' });
    setCapturedChesscomController({ marker: 'two' });
    expect(getCapturedChesscomController()).toEqual({ marker: 'two' });
    resetCapturedChesscomController();
    expect(getCapturedChesscomController()).toBeNull();
  });
});
