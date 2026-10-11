import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachToBoard, onBoardMutation, startMoveWatcher, stopMoveWatcher } from '../src/board.js';
import { resetCapturedChesscomController } from '../src/sites/chesscom-bridge.js';
import { invalidateGameCache, isBoardFlipped } from '../src/state.js';

afterEach(() => {
  stopMoveWatcher();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  invalidateGameCache();
  resetCapturedChesscomController();
});
describe('board position subscription', () => {
  it('notifies immediately from Move and detaches the subscription', () => {
    const on = vi.fn();
    const off = vi.fn();
    const game = { on, off, getFEN: () => 'position' };
    const board = visibleBoard(game);
    vi.stubGlobal('document', boardDocument([board]));
    vi.stubGlobal(
      'MutationObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    startMoveWatcher();
    expect(on).toHaveBeenCalledWith('Move', expect.any(Function));
    const listener = vi.fn();
    const cleanup = onBoardMutation(listener);
    on.mock.calls[0][1]();
    expect(listener).toHaveBeenCalledOnce();
    cleanup();
    stopMoveWatcher();
    expect(off).toHaveBeenCalledWith('Move', on.mock.calls[0][1]);
  });
  it('coalesces fallback DOM mutations without a timer delay', async () => {
    let callback: ((records: MutationRecord[]) => void) | undefined;
    vi.stubGlobal('document', boardDocument([visibleBoard({ getFEN: () => 'position' })]));
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(cb: (records: MutationRecord[]) => void) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    startMoveWatcher();
    const listener = vi.fn();
    const cleanup = onBoardMutation(listener);
    const mutation = { type: 'attributes', target: { closest: () => null } } as unknown as MutationRecord;
    callback?.([mutation]);
    callback?.([mutation]);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledOnce();
    cleanup();
  });

  it('ignores mutations inside the evaluation overlay', async () => {
    let callback: ((records: MutationRecord[]) => void) | undefined;
    const game = { getFEN: () => 'position' };
    vi.stubGlobal('document', boardDocument([visibleBoard(game)]));
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(cb: (records: MutationRecord[]) => void) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    startMoveWatcher();
    const listener = vi.fn();
    const cleanup = onBoardMutation(listener);
    const target = { closest: () => ({}) };

    callback?.([{ type: 'attributes', target } as unknown as MutationRecord]);
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();

    callback?.([{ type: 'attributes', target: { closest: () => null } } as unknown as MutationRecord]);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledOnce();
    cleanup();
  });

  it('continues notifying listeners when one listener throws', () => {
    const game = { on: vi.fn(), off: vi.fn(), getFEN: () => 'position' };
    vi.stubGlobal('document', boardDocument([visibleBoard(game)]));
    vi.stubGlobal(
      'MutationObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    startMoveWatcher();
    const first = onBoardMutation(() => {
      throw new Error('listener failed');
    });
    const secondListener = vi.fn();
    const second = onBoardMutation(secondListener);

    game.on.mock.calls[0][1]();

    expect(secondListener).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    first();
    second();
  });

  it('disconnects the old board watcher when the board is detached', () => {
    const disconnect = vi.fn();
    vi.stubGlobal('document', boardDocument([visibleBoard({ getFEN: () => 'position' })]));
    vi.stubGlobal(
      'MutationObserver',
      class {
        observe() {}
        disconnect() {
          disconnectMock();
        }
      },
    );
    function disconnectMock() {
      disconnect();
    }

    startMoveWatcher();
    attachToBoard(null);

    expect(disconnect).toHaveBeenCalled();
  });

  it('reads board orientation from the captured controller options', () => {
    let flipped = false;
    const game = {
      getFEN: () => 'position',
      getPlayingAs: () => 1,
      getOptions: () => ({ flipped }),
    };
    vi.stubGlobal('document', boardDocument([visibleBoard(game)]));
    vi.spyOn(Date, 'now').mockReturnValue(10_000);

    expect(isBoardFlipped()).toBe(false);
    flipped = true;
    expect(isBoardFlipped()).toBe(true);
  });

  it('ignores DOM orientation attributes without controller options', () => {
    const board = {
      game: { getFEN: () => 'position', getPlayingAs: () => 1 },
      getAttribute: (name: string) => (name === 'orientation' ? 'black' : null),
      classList: { contains: () => true },
    };
    vi.stubGlobal('document', boardDocument([board]));
    vi.spyOn(Date, 'now').mockReturnValue(10_000);

    expect(isBoardFlipped()).toBe(false);
  });
});

function visibleBoard(game: unknown) {
  return {
    game,
    getClientRects: () => [{ width: 400, height: 400 }],
    getBoundingClientRect: () => ({ width: 400, height: 400 }),
    getAttribute: (name: string) => (name === 'orientation' ? 'white' : null),
    classList: { contains: () => false },
  };
}

function boardDocument(boards: unknown[]) {
  return {
    querySelector: () => boards[0] ?? null,
    querySelectorAll: () => boards,
  };
}
