import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPychessAdapter } from '../src/sites/pychess.js';
import type { MoveRequest } from '../src/sites/types.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const CASTLING_START = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';

beforeEach(() => {
  class MockMouseEvent {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  }
  vi.stubGlobal('window', { PointerEvent: undefined });
  vi.stubGlobal('MouseEvent', MockMouseEvent);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PyChess legal selection input', () => {
  it('selects the source and legal destination in order without forcing or mutating the board', async () => {
    const fixture = makePage();
    const request = makeRequest(fixture, 'e2e4', AFTER_E4);

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(true);

    expect(fixture.selectionCalls).toEqual(['e2', 'e4']);
    expect(fixture.cg.move).not.toHaveBeenCalled();
    expect(fixture.cg.selectSquare).toHaveBeenCalledTimes(2);
    expect(fixture.cg.selectSquare).toHaveBeenNthCalledWith(1, 'e2');
    expect(fixture.cg.selectSquare).toHaveBeenNthCalledWith(2, 'e4');
  });

  it('rejects a chessops-legal move absent from PyChess legal destinations', async () => {
    const fixture = makePage({ destinations: new Map([['e2', ['e4']]]) });
    const request = makeRequest(fixture, 'e2e3', 'rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1');

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(false);
    expect(fixture.selectionCalls).toEqual([]);
  });

  it('does not submit on the opponent turn or with a stale request', async () => {
    const opponentTurn = makePage({ turnColor: 'black' });
    await expect(opponentTurn.adapter.submitMove(makeRequest(opponentTurn, 'e2e4', AFTER_E4))).resolves.toBe(false);
    expect(opponentTurn.selectionCalls).toEqual([]);

    const stale = makePage();
    const staleRequest = makeRequest(stale, 'e2e4', AFTER_E4);
    stale.replaceCg();
    await expect(stale.adapter.submitMove(staleRequest)).resolves.toBe(false);
    expect(stale.selectionCalls).toEqual([]);

    const changedFen = makePage();
    const request = makeRequest(changedFen, 'e2e4', AFTER_E4);
    changedFen.setAcceptedFen(AFTER_E4);
    await expect(changedFen.adapter.submitMove(request)).resolves.toBe(false);
    expect(changedFen.selectionCalls).toEqual([]);
  });

  it('does not use source-position currentness as an acknowledgement after destination selection', async () => {
    const fixture = makePage();
    const request = makeRequest(fixture, 'e2e4', AFTER_E4, () => !fixture.selectionCalls.includes('e4'));

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(true);
    expect(fixture.selectionCalls).toEqual(['e2', 'e4']);
  });

  it('does not select after the request is aborted', async () => {
    const fixture = makePage();
    const controller = new AbortController();
    const request = makeRequest(fixture, 'e2e4', AFTER_E4, () => true, controller.signal);
    controller.abort();

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(false);
    expect(fixture.selectionCalls).toEqual([]);
  });

  it('clears only an unfinished bot-owned source selection', async () => {
    const fixture = makePage();
    let checks = 0;
    const request = makeRequest(fixture, 'e2e4', AFTER_E4, () => ++checks < 2);

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(false);

    expect(fixture.selectionCalls).toEqual(['e2', null]);
  });

  it('preserves a later human selection during cancellation cleanup', async () => {
    const fixture = makePage();
    let checks = 0;
    const request = makeRequest(fixture, 'e2e4', AFTER_E4, () => {
      checks++;
      if (checks === 2) fixture.setHumanSelection('d2');
      return checks !== 2;
    });

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(false);

    expect(fixture.selectionCalls).toEqual(['e2']);
    expect(fixture.selected).toBe('d2');
  });

  it.each([
    ['e1g1', 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1', 'g1'],
    ['e1c1', 'r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1', 'c1'],
  ])('maps standard castling %s through PyChess legal destinations', async (uci, expectedFen, destination) => {
    const fixture = makePage({
      fen: CASTLING_START,
      initialFen: CASTLING_START,
      destinations: new Map([['e1', [destination]]]),
    });
    const request = makeRequest(fixture, uci, expectedFen);

    await expect(fixture.adapter.submitMove(request)).resolves.toBe(true);
    expect(fixture.selectionCalls).toEqual(['e1', destination]);
  });

  it('rejects a castle when the site destination map cannot represent the normalized move', async () => {
    const fixture = makePage({
      fen: CASTLING_START,
      initialFen: CASTLING_START,
      destinations: new Map([['e1', ['f1']]]),
    });

    await expect(
      fixture.adapter.submitMove(makeRequest(fixture, 'e1g1', 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1')),
    ).resolves.toBe(false);
    expect(fixture.selectionCalls).toEqual([]);
  });
});

describe('PyChess promotion selection', () => {
  it.each([
    ['q', 'Q6k/8/8/8/8/8/8/7K b - - 0 1'],
    ['r', 'R6k/8/8/8/8/8/8/7K b - - 0 1'],
    ['b', 'B6k/8/8/8/8/8/8/7K b - - 0 1'],
    ['n', 'N6k/8/8/8/8/8/8/7K b - - 0 1'],
  ])('chooses the exact visible %s role and restores ctrlKey with auto-promote on', async (role, expectedFen) => {
    await verifyPromotion(role, expectedFen, true, false);
  });

  it.each([
    ['q', 'Q6k/8/8/8/8/8/8/7K b - - 0 1'],
    ['r', 'R6k/8/8/8/8/8/8/7K b - - 0 1'],
    ['b', 'B6k/8/8/8/8/8/8/7K b - - 0 1'],
    ['n', 'N6k/8/8/8/8/8/8/7K b - - 0 1'],
  ])('chooses the exact visible %s role and restores ctrlKey with auto-promote off', async (role, expectedFen) => {
    await verifyPromotion(role, expectedFen, false, false);
  });

  it('restores a pre-existing ctrlKey after an underpromotion choice', async () => {
    await verifyPromotion('n', 'N6k/8/8/8/8/8/8/7K b - - 0 1', false, true);
  });

  it('does not click a hidden matching choice or a visible choice of the wrong color', async () => {
    vi.useFakeTimers();
    const startFen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
    const fixture = makePage({
      fen: startFen,
      initialFen: startFen,
      destinations: new Map([['a7', ['a8']]]),
      promotions: [
        { role: 'q', color: 'white', visible: false },
        { role: 'q', color: 'black', visible: true },
      ],
    });
    const request = makeRequest(fixture, 'a7a8q', 'Q6k/8/8/8/8/8/8/7K b - - 0 1');

    const submission = fixture.adapter.submitMove(request);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(submission).resolves.toBe(false);
    expect(fixture.promotionClicks).toEqual([]);
  });

  it('stops waiting for a chooser when the request is aborted', async () => {
    vi.useFakeTimers();
    const startFen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
    const fixture = makePage({
      fen: startFen,
      initialFen: startFen,
      destinations: new Map([['a7', ['a8']]]),
      promotions: [],
    });
    const controller = new AbortController();
    const request = makeRequest(fixture, 'a7a8n', 'N6k/8/8/8/8/8/8/7K b - - 0 1', () => true, controller.signal);

    const submission = fixture.adapter.submitMove(request);
    await vi.advanceTimersByTimeAsync(80);
    controller.abort();
    await vi.advanceTimersByTimeAsync(20);

    await expect(submission).resolves.toBe(false);
    expect(fixture.promotionClicks).toEqual([]);
  });

  it('cancels only its own promotion chooser and preserves it after trusted interaction', async () => {
    vi.useFakeTimers();
    const startFen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
    const fixture = makePage({
      fen: startFen,
      initialFen: startFen,
      destinations: new Map([['a7', ['a8']]]),
      promotions: [{ role: 'q', color: 'black', visible: true }],
    });
    const request = makeRequest(fixture, 'a7a8q', 'Q6k/8/8/8/8/8/8/7K b - - 0 1');
    const submission = fixture.adapter.submitMove(request);
    await vi.advanceTimersByTimeAsync(20);
    fixture.adapter.cancelInput();
    await vi.advanceTimersByTimeAsync(20);
    await expect(submission).resolves.toBe(false);
    expect(fixture.chooserCancelled).toBe(true);

    const second = makePage({
      fen: startFen,
      initialFen: startFen,
      destinations: new Map([['a7', ['a8']]]),
      promotions: [{ role: 'q', color: 'black', visible: true }],
    });
    const trustedRequest = makeRequest(second, 'a7a8q', 'Q6k/8/8/8/8/8/8/7K b - - 0 1');
    const trustedSubmission = second.adapter.submitMove(trustedRequest);
    await vi.advanceTimersByTimeAsync(20);
    second.emitTrustedInput();
    second.adapter.cancelInput();
    await vi.advanceTimersByTimeAsync(20);
    expect(second.chooserCancelled).toBe(false);
    await expect(trustedSubmission).resolves.toBe(false);
  });
});

async function verifyPromotion(role: string, expectedFen: string, autoPromote: boolean, initialCtrlKey: boolean) {
  const startFen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
  const fixture = makePage({
    fen: startFen,
    initialFen: startFen,
    destinations: new Map([['a7', ['a8']]]),
    promotions: ['q', 'r', 'b', 'n'].map((piece) => ({ role: piece, color: 'white', visible: true })),
    initialCtrlKey,
    autoPromote,
  });
  const setItem = vi.fn();
  vi.stubGlobal('localStorage', { setItem });
  const request = makeRequest(fixture, `a7a8${role}`, expectedFen);

  await expect(fixture.adapter.submitMove(request)).resolves.toBe(true);

  expect(fixture.promotionClicks).toEqual([role]);
  expect(fixture.ctrlKeyDuringPromotion).toBe(true);
  expect(fixture.cg.state.stats.ctrlKey).toBe(initialCtrlKey);
  expect(setItem).not.toHaveBeenCalled();
}

interface PromotionOption {
  role: string;
  color: 'white' | 'black';
  visible: boolean;
}

interface PageOptions {
  fen?: string;
  initialFen?: string;
  turnColor?: 'white' | 'black';
  destinations?: Map<string, string[]>;
  promotions?: PromotionOption[];
  initialCtrlKey?: boolean;
  autoPromote?: boolean;
}

function makePage(options: PageOptions = {}) {
  let fen = options.fen ?? START_FEN;
  let displayPlacement = fen.split(' ')[0];
  let chooserOpen = false;
  let selected: string | undefined;
  const selectionCalls: Array<string | null> = [];
  const promotionClicks: string[] = [];
  const promotionSpecs =
    options.promotions ?? ['q', 'r', 'b', 'n'].map((role) => ({ role, color: 'white' as const, visible: true }));
  let ctrlKeyDuringPromotion = false;
  let chooserCancelled = false;
  const boardListeners = new Map<string, Set<(event: Event) => void>>();

  const board = {
    isConnected: true,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } },
    getClientRects: () => [{ width: 400, height: 400 }],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    querySelectorAll: () => [],
    addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
      const listeners = boardListeners.get(name) ?? new Set<(event: Event) => void>();
      listeners.add(listener as (event: Event) => void);
      boardListeners.set(name, listeners);
    },
    removeEventListener(name: string, listener: EventListenerOrEventListenerObject) {
      boardListeners.get(name)?.delete(listener as (event: Event) => void);
    },
    dispatchEvent(event: Event) {
      for (const listener of boardListeners.get(event.type) ?? []) listener(event);
      return true;
    },
  };
  const promotionRoot = {
    isConnected: true,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } },
    getClientRects: () => [{ width: 200, height: 200 }],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    addEventListener() {},
    querySelectorAll: () => promotionSquares.map((square) => square.piece),
    contains: (element: unknown) => promotionSquares.includes(element as PromotionSquare),
    dispatchEvent(event: { type: string }) {
      if (event.type === 'click') {
        chooserOpen = false;
        chooserCancelled = true;
      }
      return true;
    },
    click() {
      chooserOpen = false;
      chooserCancelled = true;
    },
  };
  let promotionSquares: PromotionSquare[] = [];
  const pageDocument = {
    body: {
      id: 'pychess-variants',
      dataset: {
        view: 'round',
        gameid: 'Game1234',
        username: 'Anon-pZnxrQ3f',
        wplayer: 'Anon-pZnxrQ3f',
        bplayer: 'Fairy-Stockfish',
        variant: 'chess',
        chess960: 'False',
        corr: 'False',
        level: '7',
        initialfen: options.initialFen ?? '',
        status: '0',
        result: '*',
      },
    },
    defaultView: {
      getComputedStyle: (element: { visible?: boolean }) => ({
        display: element.visible === false ? 'none' : 'block',
        visibility: element.visible === false ? 'hidden' : 'visible',
      }),
    },
    querySelector(selector: string) {
      if (selector === '.round-app') return {};
      if (selector === '.round-app #mainboard cg-board') return board;
      if (selector === '#movelist .result' || selector === '.btn-controls.after') return null;
      if (selector === '#extension_choice') return chooserOpen ? promotionRoot : null;
      if (selector.startsWith('#clock') && selector.endsWith('.min')) return { textContent: '01' };
      if (selector.startsWith('#clock') && selector.endsWith('.sec')) return { textContent: '00' };
      return null;
    },
    querySelectorAll(selector: string) {
      if (selector === '#movelist move[ply]') return [];
      if (selector === '#extension_choice square > piece')
        return chooserOpen ? promotionSquares.map((square) => square.piece) : [];
      return [];
    },
    elementFromPoint(x: number, y: number) {
      return (
        promotionSquares.find((square) => {
          if (!square.visible) return false;
          const rect = square.getBoundingClientRect();
          return rect.left <= x && rect.left + rect.width > x && rect.top <= y && rect.top + rect.height > y;
        }) ?? board
      );
    },
  };

  const state = {
    get fen() {
      return fen;
    },
    turnColor: options.turnColor ?? 'white',
    orientation: 'white',
    movable: { color: 'white', dests: options.destinations ?? new Map([['e2', ['e4']]]) },
    dimensions: { width: 8, height: 8 },
    stats: { ctrlKey: options.initialCtrlKey ?? false },
    selectable: { selected: undefined as string | undefined },
    dom: { elements: { board } },
  };
  const cg = {
    state,
    move: vi.fn(),
    getFen: () => displayPlacement,
    selectSquare: vi.fn((key: string | null) => {
      selectionCalls.push(key);
      if (key === null) {
        selected = undefined;
        state.selectable.selected = undefined;
        return;
      }
      if (!selected) {
        selected = key;
        state.selectable.selected = key;
        return;
      }
      const destinations = state.movable.dests.get(selected) ?? [];
      if (!destinations.includes(key)) {
        selected = key;
        state.selectable.selected = key;
        return;
      }
      const uci = expectedUci ?? '';
      if (uci.length === 5 && options.autoPromote && state.stats.ctrlKey !== true) {
        displayPlacement = expectedPlacement;
        state.turnColor = state.turnColor === 'white' ? 'black' : 'white';
      } else if (uci.length === 5) {
        chooserOpen = true;
        ctrlKeyDuringPromotion = state.stats.ctrlKey === true;
        promotionSquares = makePromotionSquares(promotionSpecs, promotionClicks, promotionRoot, () => {
          chooserOpen = false;
          displayPlacement = expectedPlacement;
          state.turnColor = state.turnColor === 'white' ? 'black' : 'white';
        });
      } else {
        displayPlacement = expectedPlacement;
        state.turnColor = state.turnColor === 'white' ? 'black' : 'white';
      }
      selected = undefined;
      state.selectable.selected = undefined;
    }),
  };
  let expectedUci: string | undefined;
  let expectedPlacement = displayPlacement;
  const page: Record<string, unknown> = {
    location: { pathname: '/Game1234' },
    document: pageDocument,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    cg,
  };
  const adapter = createPychessAdapter(() => page as unknown as Window);

  return {
    page,
    cg,
    adapter,
    selectionCalls,
    promotionClicks,
    get selected() {
      return selected;
    },
    get ctrlKeyDuringPromotion() {
      return ctrlKeyDuringPromotion;
    },
    get chooserCancelled() {
      return chooserCancelled;
    },
    setHumanSelection(square: string) {
      selected = square;
      state.selectable.selected = square;
    },
    setAcceptedFen(nextFen: string) {
      fen = nextFen;
      displayPlacement = nextFen.split(' ')[0];
      state.turnColor = nextFen.split(' ')[1] === 'w' ? 'white' : 'black';
    },
    replaceCg() {
      page.cg = { ...cg, state };
    },
    emitTrustedInput() {
      board.dispatchEvent({ type: 'mousedown', isTrusted: true } as Event);
    },
    setExpected(uci: string, expectedFen: string) {
      expectedUci = uci;
      expectedPlacement = expectedFen.split(' ')[0];
    },
  };
}

interface PromotionSquare {
  visible: boolean;
  isConnected: boolean;
  parentElement: unknown;
  piece: {
    classList: { contains: (name: string) => boolean };
    parentElement: PromotionSquare;
    visible: boolean;
    isConnected: boolean;
    ownerDocument: PromotionSquare['ownerDocument'];
    getClientRects: () => { width: number; height: number }[];
    getBoundingClientRect: PromotionSquare['getBoundingClientRect'];
  };
  ownerDocument: {
    defaultView: { getComputedStyle: (element: PromotionSquare) => { display: string; visibility: string } };
  };
  getClientRects: () => { width: number; height: number }[];
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
  contains: (target: unknown) => boolean;
  closest: (selector: string) => unknown;
  dispatchEvent: (event: { type: string }) => boolean;
}

function makePromotionSquares(
  specs: PromotionOption[],
  clicks: string[],
  root: object,
  onPromotion: () => void,
): PromotionSquare[] {
  return specs.map(({ role, color, visible }, index) => {
    const roleClass =
      ({ q: 'q-piece', r: 'r-piece', b: 'b-piece', n: 'n-piece' } as Record<string, string>)[role] ?? role;
    const square: PromotionSquare = {
      visible,
      isConnected: true,
      parentElement: root,
      piece: {
        classList: { contains: (name) => name === roleClass || name === color },
        parentElement: undefined as unknown as PromotionSquare,
        visible,
        isConnected: true,
        ownerDocument: undefined as unknown as PromotionSquare['ownerDocument'],
        getClientRects: () => (visible ? [{ width: 30, height: 30 }] : []),
        getBoundingClientRect: () => ({ left: 110, top: 110 + index * 50, width: 30, height: 30 }),
      },
      ownerDocument: {
        defaultView: {
          getComputedStyle: (element) => ({
            display: element.visible ? 'block' : 'none',
            visibility: element.visible ? 'visible' : 'hidden',
          }),
        },
      },
      getClientRects: () => (visible ? [{ width: 50, height: 50 }] : []),
      getBoundingClientRect: () => ({ left: 100, top: 100 + index * 50, width: 50, height: 50 }),
      contains: (target) => target === square || target === square.piece,
      closest: (selector) => (selector === '#extension_choice' ? root : null),
      dispatchEvent: (event) => {
        if (event.type === 'click' && visible) {
          clicks.push(role);
          onPromotion();
        }
        return true;
      },
    };
    square.piece.parentElement = square;
    square.piece.ownerDocument = square.ownerDocument;
    return square;
  });
}

function makeRequest(
  fixture: ReturnType<typeof makePage>,
  uci: string,
  expectedFen: string,
  isCurrent: () => boolean = () => true,
  signal = new AbortController().signal,
): MoveRequest {
  const read = fixture.adapter.read();
  if (read.kind !== 'game') throw new Error('Test fixture is not a PyChess game');
  fixture.setExpected(uci, expectedFen);
  return {
    identity: read.snapshot.identity,
    fromFen: read.snapshot.fen,
    uci,
    expectedFen,
    expectedPly: 1,
    signal,
    isCurrent,
  };
}
