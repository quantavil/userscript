import { afterEach, describe, expect, it, vi } from 'vitest';
import { createChesscomAdapter } from '../src/sites/chesscom.js';
import { resetCapturedChesscomController } from '../src/sites/chesscom-bridge.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

afterEach(() => {
  resetCapturedChesscomController();
});

describe('Chess.com adapter events', () => {
  it('ignores bot overlays and unrelated body mutations', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);

    fixture.notify([
      mutation('childList', fixture.body, { addedNodes: [], removedNodes: [] }),
      mutation('attributes', fixture.overlay),
    ]);
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies once for an accepted move and deduplicates repeated Move events', () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);

    fixture.setFen(AFTER_E4);
    fixture.emitMove();
    fixture.emitMove();

    expect(listener).toHaveBeenCalledOnce();
  });

  it('notifies on board and game replacement and on result transitions', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);

    const replacementBoard = makeBoard(makeGame());
    fixture.replaceBoard(replacementBoard);
    fixture.notify([mutation('childList', fixture.body, { addedNodes: [replacementBoard], removedNodes: [] })]);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);

    fixture.replaceGame(makeGame());
    fixture.notify([mutation('attributes', replacementBoard as unknown as Element, { attributeName: 'data-game-id' })]);
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);

    fixture.setFinished(true);
    fixture.notify([mutation('childList', fixture.result, { addedNodes: [], removedNodes: [] })]);
    await flush();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('notifies when the active clock changes', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);

    fixture.setClock('0:59');
    fixture.notify([
      mutation('characterData', { nodeType: 3, parentElement: fixture.clockTextElement } as unknown as Element),
    ]);
    await flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: 59_000 } });
  });
});

function flush(): Promise<void> {
  return Promise.resolve();
}

function mutation(type: string, target: Element, extra: Record<string, unknown> = {}): MutationRecord {
  return { type, target, ...extra } as unknown as MutationRecord;
}

function makePage() {
  const observers: ((records: MutationRecord[]) => void)[] = [];
  let fen = START_FEN;
  let finished = false;
  let clockText = '1:00';
  let game = makeGame(() => fen);
  let board = makeBoard(game);
  const clockRoot = fakeElement({ clockRoot: true });
  const clockTextElement = fakeElement({ clockRoot });
  const overlay = fakeElement({ overlay: true });
  const result = fakeElement({ result: true });
  const body = fakeElement();
  const page = {
    document: {
      body,
      querySelectorAll: () => [board],
      querySelector: (selector: string) => {
        if (selector.includes('clock-player-turn')) return { ...clockTextElement, textContent: clockText };
        if (selector.includes('game-over-modal-content')) return finished ? result : null;
        return null;
      },
    },
    MutationObserver: class {
      constructor(callback: (records: MutationRecord[]) => void) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  };
  return {
    page,
    body: body as unknown as Element,
    overlay: overlay as unknown as Element,
    result: result as unknown as Element,
    clockTextElement: clockTextElement as unknown as Element,
    notify(records: MutationRecord[]) {
      for (const observer of observers) observer(records);
    },
    setFen(value: string) {
      fen = value;
    },
    emitMove() {
      game.emitMove();
    },
    replaceBoard(value: ReturnType<typeof makeBoard>) {
      board = value;
      game = board.game as ReturnType<typeof makeGame>;
    },
    replaceGame(value: ReturnType<typeof makeGame>) {
      game = value;
      board.game = game;
    },
    setFinished(value: boolean) {
      finished = value;
    },
    setClock(value: string) {
      clockText = value;
    },
  };
}

function makeGame(readFen: () => string = () => START_FEN) {
  let moveListener: (() => void) | null = null;
  return {
    id: 'game-one',
    getFEN: readFen,
    getPlayingAs: () => 1,
    getTurn: () => (readFen().split(' ')[1] === 'b' ? 2 : 1),
    getOptions: () => ({ flipped: false, isWhiteOnBottom: true, id: 'game-one' }),
    getState: () => 'Idle',
    isGameOver: () => false,
    on: (_event: string, listener: () => void) => {
      moveListener = listener;
    },
    off: () => {
      moveListener = null;
    },
    emitMove: () => moveListener?.(),
  };
}

function makeBoard(game: ReturnType<typeof makeGame>) {
  return Object.assign(fakeElement({ board: true }), {
    game,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } },
    getClientRects: () => [{ width: 400, height: 400 }],
    getBoundingClientRect: () => ({ width: 400, height: 400 }),
    getAttribute: (name: string) => (name === 'orientation' ? 'white' : null),
    classList: { contains: () => false },
  });
}

function fakeElement(options: { board?: boolean; overlay?: boolean; clockRoot?: unknown; result?: boolean } = {}) {
  const current = {
    nodeType: 1,
    parentElement: null as unknown,
    matches: (selector: string) => options.board === true && selector.includes('.board'),
    querySelector: () => null,
    closest(selector: string) {
      if (options.overlay && selector.includes('data-gabibot-overlay')) return current;
      if (options.board && selector.includes('.board')) return current;
      if (options.clockRoot && selector.includes('.clock-player-turn')) return options.clockRoot;
      if (options.clockRoot === true && selector.includes('.clock-player-turn')) return current;
      if (options.result && selector.includes('.game-over-modal-content')) return current;
      return null;
    },
  };
  return current;
}
