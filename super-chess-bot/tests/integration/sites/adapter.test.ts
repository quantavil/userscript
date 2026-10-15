import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { invalidateGameCache, isBoardFlipped } from '../../../src/sites/chesscom/snapshot.js';
import { observeBoard } from '../../../src/sites/chesscom/watcher.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  invalidateGameCache();
});

describe('Chess.com board settling observer', () => {
  it('observes board presentation attributes and coalesces mutation bursts', async () => {
    const fixture = makeBoardObserver();
    const listener = vi.fn();
    const stop = observeBoard(fixture.board, listener);

    expect(fixture.observed).toMatchObject({
      target: fixture.board,
      options: {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-piece'],
      },
    });

    fixture.emit([attributeMutation('style', fakeElement())]);
    fixture.emit([attributeMutation('data-piece', fakeElement())]);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledOnce();

    fixture.emit([attributeMutation('data-piece', fakeElement())]);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('ignores bot-owned changes and disconnects without later callbacks', async () => {
    const fixture = makeBoardObserver();
    const listener = vi.fn();
    const stop = observeBoard(fixture.board, listener);

    fixture.emit([attributeMutation('style', fakeElement(true))]);
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();

    stop();
    expect(fixture.disconnect).toHaveBeenCalledOnce();
    fixture.emit([attributeMutation('style', fakeElement())]);
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
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

function makeBoardObserver() {
  let callback: ((records: MutationRecord[]) => void) | undefined;
  const disconnect = vi.fn();
  const observed: { target: Node; options?: MutationObserverInit } = { target: {} as Node };
  class Observer {
    constructor(next: (records: MutationRecord[]) => void) {
      callback = next;
    }
    observe(target: Node, options?: MutationObserverInit) {
      observed.target = target;
      observed.options = options;
    }
    disconnect() {
      disconnect();
    }
  }
  const board = {
    ownerDocument: { defaultView: { MutationObserver: Observer } },
  } as unknown as HTMLElement;
  return {
    board,
    observed,
    disconnect,
    emit(records: MutationRecord[]) {
      callback?.(records);
    },
  };
}

function attributeMutation(name: string, target: Element): MutationRecord {
  return { type: 'attributes', attributeName: name, target } as unknown as MutationRecord;
}

function fakeElement(botOwned = false): Element {
  const element = {
    nodeType: 1,
    parentNode: null,
    hasAttribute: (name: string) => botOwned && name === 'data-scb-overlay',
    closest: (selector: string) => (botOwned && selector.includes('data-scb-overlay') ? element : null),
  };
  return element as unknown as Element;
}

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
