import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createChesscomAdapter } from '../../../src/sites/chesscom/adapter.js';
import { resetCapturedChesscomController } from '../../../src/sites/chesscom/bridge.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
type TestMutationObserver = new (
  callback: (records: MutationRecord[]) => void,
) => {
  observe(target: Node): void;
  disconnect(): void;
};

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
    expect(fixture.moveListenerCount()).toBe(1);

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

    const replacementBoard = makeBoard(makeGame(), fixture.MutationObserver);
    fixture.replaceBoard(replacementBoard);
    fixture.notify([mutation('childList', fixture.body, { addedNodes: [replacementBoard], removedNodes: [] })]);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);

    fixture.replaceGame(makeGame());
    fixture.notify([
      mutation('attributes', replacementBoard as unknown as Element, {
        attributeName: 'data-game-id',
      }),
    ]);
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
      mutation('characterData', {
        nodeType: 3,
        parentElement: fixture.clockTextElement,
      } as unknown as Element),
    ]);
    await flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { remainingMs: 59_000 } });
  });

  it('notifies when a board style mutation settles an animating position', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    fixture.setGameState('Animating');
    adapter.subscribe(listener);

    fixture.setGameState('Idle');
    fixture.notify([mutation('attributes', fixture.board(), { attributeName: 'style' })]);
    await flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { inputReady: true } });
  });

  it('notifies when a data-piece mutation settles an animating position', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    fixture.setGameState('Animating');
    adapter.subscribe(listener);

    fixture.setGameState('Idle');
    fixture.notify([mutation('attributes', fixture.board(), { attributeName: 'data-piece' })]);
    await flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { inputReady: true } });
  });

  it('reattaches settling observation on board replacement and disconnects on unsubscribe', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    const originalBoard = fixture.board();
    expect(fixture.observerState().some((observer) => observer.target === (originalBoard as unknown as Node))).toBe(
      true,
    );

    const replacementBoard = makeBoard(makeGame(), fixture.MutationObserver);
    fixture.replaceBoard(replacementBoard);
    fixture.notify([mutation('childList', fixture.body, { addedNodes: [replacementBoard], removedNodes: [] })]);
    await flush();

    expect(fixture.observerState().some((observer) => observer.target === (replacementBoard as unknown as Node))).toBe(
      true,
    );
    expect(
      fixture.observerState().find((observer) => observer.target === (originalBoard as unknown as Node))?.disconnected,
    ).toBe(true);

    unsubscribe();
    expect(
      fixture
        .observerState()
        .filter((observer) => observer.target === (replacementBoard as unknown as Node))
        .every((observer) => observer.disconnected),
    ).toBe(true);
  });

  it('disconnects settling observation when the board becomes unavailable', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const unsubscribe = adapter.subscribe(vi.fn());
    const originalBoard = fixture.board();

    fixture.removeBoard();
    fixture.notify([mutation('childList', fixture.body, { addedNodes: [], removedNodes: [originalBoard] })]);
    await flush();

    expect(
      fixture.observerState().find((observer) => observer.target === (originalBoard as unknown as Node))?.disconnected,
    ).toBe(true);
    expect(adapter.read()).toMatchObject({ kind: 'waiting', reason: 'Waiting for board' });
    unsubscribe();
  });

  it('continues notifying independent subscribers when one listener throws', async () => {
    const fixture = makePage();
    const adapter = createChesscomAdapter(() => fixture.page as unknown as Window);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    fixture.setGameState('Animating');
    adapter.subscribe(() => {
      throw new Error('listener failed');
    });
    adapter.subscribe(second);

    fixture.setGameState('Idle');
    fixture.notify([mutation('attributes', fixture.board(), { attributeName: 'data-piece' })]);
    await flush();

    expect(second).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });
});

function flush(): Promise<void> {
  return Promise.resolve();
}

function mutation(type: string, target: Element, extra: Record<string, unknown> = {}): MutationRecord {
  return { type, target, ...extra } as unknown as MutationRecord;
}

function makePage() {
  const observers: {
    callback: (records: MutationRecord[]) => void;
    target?: Node;
    disconnected: boolean;
  }[] = [];
  let fen = START_FEN;
  let finished = false;
  let clockText = '1:00';
  let gameState = 'Idle';
  let game: ReturnType<typeof makeGame>;
  let board: ReturnType<typeof makeBoard> | null;
  const clockRoot = fakeElement({ clockRoot: true });
  const clockTextElement = fakeElement({ clockRoot });
  const overlay = fakeElement({ overlay: true });
  const result = fakeElement({ result: true });
  const body = fakeElement();
  class MockMutationObserver {
    private readonly registration: (typeof observers)[number];
    constructor(callback: (records: MutationRecord[]) => void) {
      this.registration = { callback, disconnected: false };
      observers.push(this.registration);
    }
    observe(target: Node) {
      this.registration.target = target;
    }
    disconnect() {
      this.registration.disconnected = true;
    }
  }
  const page = {
    document: {
      body,
      querySelectorAll: () => (board ? [board] : []),
      querySelector: (selector: string) => {
        if (selector.includes('clock-player-turn')) return { ...clockTextElement, textContent: clockText };
        if (selector.includes('game-over-modal-content')) return finished ? result : null;
        return null;
      },
    },
    MutationObserver: MockMutationObserver,
  };
  board = makeBoard(
    makeGame(
      () => fen,
      () => gameState,
    ),
    MockMutationObserver,
  );
  game = board.game as ReturnType<typeof makeGame>;
  return {
    page,
    body: body as unknown as Element,
    overlay: overlay as unknown as Element,
    result: result as unknown as Element,
    clockTextElement: clockTextElement as unknown as Element,
    MutationObserver: MockMutationObserver,
    board: () => board as unknown as Element,
    observerState: () => observers,
    moveListenerCount: () => game.listenerCount(),
    notify(records: MutationRecord[]) {
      for (const observer of observers) {
        if (!observer.disconnected) observer.callback(records);
      }
    },
    setFen(value: string) {
      fen = value;
    },
    emitMove() {
      game.emitMove();
    },
    replaceBoard(value: ReturnType<typeof makeBoard>) {
      board = value;
      game = value.game as ReturnType<typeof makeGame>;
    },
    removeBoard() {
      board = null;
    },
    replaceGame(value: ReturnType<typeof makeGame>) {
      game = value;
      if (board) board.game = game;
    },
    setFinished(value: boolean) {
      finished = value;
    },
    setClock(value: string) {
      clockText = value;
    },
    setGameState(value: string) {
      gameState = value;
    },
  };
}

function makeGame(readFen: () => string = () => START_FEN, readState: () => string = () => 'Idle') {
  const moveListeners = new Set<() => void>();
  return {
    id: 'game-one',
    getFEN: readFen,
    getPlayingAs: () => 1,
    getTurn: () => (readFen().split(' ')[1] === 'b' ? 2 : 1),
    getOptions: () => ({ flipped: false, isWhiteOnBottom: true, id: 'game-one' }),
    getState: readState,
    isGameOver: () => false,
    on: (_event: string, listener: () => void) => {
      moveListeners.add(listener);
    },
    off: (_event: string, listener: () => void) => {
      moveListeners.delete(listener);
    },
    emitMove: () => {
      for (const listener of [...moveListeners]) listener();
    },
    listenerCount: () => moveListeners.size,
  };
}

function makeBoard(game: ReturnType<typeof makeGame>, Observer: TestMutationObserver) {
  return Object.assign(fakeElement({ board: true }), {
    game,
    ownerDocument: {
      defaultView: {
        MutationObserver: Observer,
        getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
      },
    },
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
      if (options.overlay && (selector.includes('data-engine-layer') || selector.includes('data-scb-overlay')))
        return current;
      if (options.board && selector.includes('.board')) return current;
      if (options.clockRoot && selector.includes('.clock-player-turn')) return options.clockRoot;
      if (options.clockRoot === true && selector.includes('.clock-player-turn')) return current;
      if (options.result && selector.includes('.game-over-modal-content')) return current;
      return null;
    },
  };
  return current;
}
