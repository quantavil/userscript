import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as board from '../src/board.js';
import { findPromotionOption, type PromotionOptionLike, promotionPieceFromLabel } from '../src/promotion.js';
import { BotState, invalidateGameCache } from '../src/state.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';

interface Coordinates {
  x: number;
  y: number;
}

interface FakeMoveGame {
  listeners: Set<() => void>;
  getFEN(): string;
  getPlayingAs(): number;
  on(event: string, listener: () => void): void;
  off(event: string, listener: () => void): void;
}

interface FakeMouseEvent {
  type: string;
  clientX: number;
  clientY: number;
}

interface FakePromotionChoice {
  dataset: Record<string, string>;
  className: string;
  visible: boolean;
  textContent: string;
  getClientRects(): { length: number };
  getBoundingClientRect(): Coordinates & { left: number; top: number; width: number; height: number };
  getAttribute(name: string): string | null;
  click(): void;
  dispatchEvent(event: FakeMouseEvent): boolean;
}

interface FakeBoardElement {
  game: FakeMoveGame;
  style: Record<string, string>;
  classList: { contains(name: string): boolean };
  listeners: Map<string, Set<EventListener>>;
  getAttribute(name: string): string | null;
  getBoundingClientRect(): Coordinates & { left: number; top: number; width: number; height: number };
  appendChild(child: unknown): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

let currentFen = START_FEN;
let game: FakeMoveGame;
let boardEl: FakeBoardElement;
let target: { dispatchEvent(event: FakeMouseEvent): boolean };
let promotionChoices: FakePromotionChoice[];
let destination: Coordinates;
let onDestinationClick: (() => void) | undefined;
let selectedPromotion: string | null;
let frameId: number;
let pendingFrames: Map<number, ReturnType<typeof setTimeout>>;
let cancelFrameCalls: number[];

function squareCenter(square: string): Coordinates {
  return { x: ('abcdefgh'.indexOf(square[0]) + 0.5) * 50, y: (8 - Number(square[1]) + 0.5) * 50 };
}

function emitMove() {
  for (const listener of game.listeners) listener();
}

function promotionChoice(label: string, identifiers: Record<string, string> = {}, visible = true): FakePromotionChoice {
  const top = label === 'knight' ? 50 : label === 'rook' ? 100 : label === 'queen' ? 150 : 200;
  const rect = { x: 200, y: top, left: 200, top, width: 50, height: 50 };
  let pressed = false;
  return {
    dataset: identifiers,
    className: label === 'generic' ? 'promotion-piece' : `promotion-piece ${label}`,
    visible,
    textContent: '',
    getClientRects() {
      return { length: this.visible ? 1 : 0 };
    },
    getBoundingClientRect: () => rect,
    getAttribute(name) {
      if (name === 'aria-label') return label === 'generic' ? null : label;
      if (name === 'data-piece') return identifiers.piece ?? null;
      return null;
    },
    click() {},
    dispatchEvent(event) {
      const inside =
        this.visible &&
        event.clientX >= rect.left &&
        event.clientX < rect.left + rect.width &&
        event.clientY >= rect.top &&
        event.clientY < rect.top + rect.height;
      if (event.type === 'mousedown' && inside) pressed = true;
      if (event.type === 'mouseup' && inside && pressed) pressed = false;
      if (event.type === 'click' && inside && !pressed) {
        selectedPromotion = identifiers.id ? `${label}:${identifiers.id}` : label;
        if (label === 'knight' || label === 'queen') {
          currentFen = label === 'knight' ? 'N6k/8/8/8/8/8/8/8 b - - 0 1' : 'Q6k/8/8/8/8/8/8/8 b - - 0 1';
          emitMove();
        }
      }
      return true;
    },
  };
}

function installBrowserMocks(): void {
  class MockObserver {
    observe() {}
    disconnect() {}
  }
  class MockMouseEvent {
    readonly type: string;
    readonly clientX: number;
    readonly clientY: number;
    constructor(type: string, init: MouseEventInit = {}) {
      this.type = type;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
    }
  }
  const doc = {
    body: { appendChild() {} },
    createElement(tag: string) {
      const children: unknown[] = [];
      const element = {
        tag,
        id: '',
        style: {},
        children,
        setAttribute() {},
        appendChild(child: unknown) {
          children.push(child);
        },
        remove() {},
        getContext: () => ({ clearRect() {} }),
        querySelector: () => null,
      };
      return element;
    },
    querySelector(selector: string) {
      return selector.includes('board') ? (boardEl as unknown as Element) : null;
    },
    querySelectorAll(selector: string) {
      if (selector.includes('board')) return [boardEl] as unknown as NodeListOf<Element>;
      return promotionChoices as unknown as NodeListOf<Element>;
    },
    elementFromPoint(x: number, y: number) {
      const choice = promotionChoices.find((option) => {
        const rect = option.getBoundingClientRect();
        return (
          option.visible && x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height
        );
      });
      return (choice ?? target) as unknown as Element;
    },
  };
  target = {
    dispatchEvent(event) {
      if (event.type === 'click' && event.clientX === destination.x && event.clientY === destination.y) {
        onDestinationClick?.();
      }
      return true;
    },
  };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { PointerEvent: undefined });
  vi.stubGlobal('MouseEvent', MockMouseEvent);
  vi.stubGlobal('getComputedStyle', () => ({ position: 'relative' }));
  vi.stubGlobal('MutationObserver', MockObserver);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++frameId;
    pendingFrames.set(
      id,
      setTimeout(() => {
        pendingFrames.delete(id);
        callback(Date.now());
      }, 0),
    );
    return id;
  });
  cancelFrameCalls = [];
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    clearTimeout(pendingFrames.get(id));
    pendingFrames.delete(id);
    cancelFrameCalls.push(id);
  });
}

function emitTrustedBoardInput(): void {
  const event = new Event('mousedown');
  Object.defineProperty(event, 'isTrusted', { value: true });
  Object.defineProperty(event, 'button', { value: 0 });
  for (const listener of boardEl.listeners.get('mousedown') ?? []) listener(event);
}

function emitTrustedBoardRightClick(): void {
  const event = new Event('mousedown');
  Object.defineProperty(event, 'isTrusted', { value: true });
  Object.defineProperty(event, 'button', { value: 2 });
  for (const listener of boardEl.listeners.get('mousedown') ?? []) listener(event);
}

function emitSyntheticBoardInput(): void {
  const event = new Event('mousedown');
  for (const listener of boardEl.listeners.get('mousedown') ?? []) listener(event);
}

function setupGame(fen = START_FEN): void {
  currentFen = fen;
  game = {
    listeners: new Set(),
    getFEN: () => currentFen,
    getPlayingAs: () => 1,
    on(_event, listener) {
      this.listeners.add(listener);
    },
    off(_event, listener) {
      this.listeners.delete(listener);
    },
  };
  boardEl = {
    game,
    style: {},
    classList: { contains: () => false },
    listeners: new Map(),
    getAttribute: (name: string) => (name === 'orientation' ? 'white' : null),
    getBoundingClientRect: () => ({ x: 0, y: 0, left: 0, top: 0, width: 400, height: 400 }),
    appendChild() {},
    addEventListener(type, listener) {
      const callbacks = this.listeners.get(type) ?? new Set<EventListener>();
      callbacks.add(typeof listener === 'function' ? listener : (event) => listener.handleEvent(event));
      this.listeners.set(type, callbacks);
    },
    removeEventListener(type, listener) {
      const callbacks = this.listeners.get(type);
      if (!callbacks) return;
      for (const callback of callbacks) {
        if (callback === listener) callbacks.delete(callback);
      }
    },
  };
  invalidateGameCache();
}

function attachFakeBoard(): void {
  board.attachToBoard(boardEl as unknown as HTMLElement);
  board.startMoveWatcher();
}

beforeEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  currentFen = START_FEN;
  promotionChoices = [];
  selectedPromotion = null;
  frameId = 0;
  pendingFrames = new Map();
  onDestinationClick = undefined;
  setupGame();
  installBrowserMocks();
  attachFakeBoard();
  BotState.hackEnabled = 1;
  BotState.autoMove = 1;
  BotState.moveMethod = 'click';
  BotState.statusInfo = 'Ready';
});

afterEach(() => {
  board.stopMoveWatcher();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  board.attachToBoard(null);
  warn.mockRestore();
  vi.unstubAllGlobals();
});

describe('board move input', () => {
  it('notifies the controller when trusted human input interrupts board automation', async () => {
    const listener = vi.fn();
    const unsubscribe = board.onBoardInput(listener);

    emitTrustedBoardInput();

    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('ignores synthetic input so the bot does not pause on its own move events', () => {
    const listener = vi.fn();
    const unsubscribe = board.onBoardInput(listener);

    emitSyntheticBoardInput();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('ignores trusted right-click events so arrow drawing does not pause automation', () => {
    const listener = vi.fn();
    const unsubscribe = board.onBoardInput(listener);

    emitTrustedBoardRightClick();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('confirms the expected position even when the opponent replies before input finishes', async () => {
    destination = squareCenter('e4');
    const unsubscribe = board.onBoardMutation(() => {
      board.cancelPendingMove();
      BotState.statusInfo = 'Position changed';
    });
    onDestinationClick = () => {
      currentFen = AFTER_E4;
      emitMove();
      currentFen = AFTER_E5;
      emitMove();
    };

    await expect(board.executeMove('e2', 'e4', START_FEN, undefined, undefined, undefined, AFTER_E4)).resolves.toBe(
      true,
    );
    expect(BotState.statusInfo).toBe('Position changed');
    unsubscribe();
  });

  it('allows only one move input attempt for a position at a time', async () => {
    destination = squareCenter('e4');
    let destinationClicks = 0;
    onDestinationClick = () => {
      destinationClicks++;
      currentFen = AFTER_E4;
      emitMove();
    };

    const first = board.executeMove('e2', 'e4', START_FEN, undefined, undefined, undefined, AFTER_E4);
    const second = board.executeMove('e2', 'e4', START_FEN, undefined, undefined, undefined, AFTER_E4);

    await expect(second).resolves.toBe(false);
    await expect(first).resolves.toBe(true);
    expect(destinationClicks).toBe(1);
  });

  it('selects an exact knight option for an underpromotion instead of a generic promotion node', async () => {
    const startFen = '7k/P7/8/8/8/8/8/8 w - - 0 1';
    setupGame(startFen);
    attachFakeBoard();
    destination = squareCenter('a8');
    const generic = promotionChoice('generic');
    const knight = promotionChoice('knight', { piece: 'knight' });
    promotionChoices = [generic, knight];
    onDestinationClick = () => {};

    await expect(
      board.executeMove('a7', 'a8', startFen, 'n', undefined, undefined, 'N6k/8/8/8/8/8/8/8 b - - 0 1'),
    ).resolves.toBe(true);
    expect(selectedPromotion).toBe('knight');
  });

  it('waits for the promotion menu to open instead of clicking its hidden queen option', async () => {
    const startFen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
    setupGame(startFen);
    attachFakeBoard();
    destination = squareCenter('a8');
    const queen = promotionChoice('queen', { piece: 'queen', id: 'active' }, false);
    promotionChoices = [queen];
    onDestinationClick = () => {
      setTimeout(() => {
        queen.visible = true;
      }, 40);
    };

    await expect(
      board.executeMove('a7', 'a8', startFen, 'q', undefined, undefined, 'Q6k/8/8/8/8/8/8/8 b - - 0 1'),
    ).resolves.toBe(true);
    expect(selectedPromotion).toBe('queen:active');
  });

  it('clears submitting status and aborts confirmation when the move cannot be sent', async () => {
    destination = squareCenter('e4');
    const result = await board.executeMove('z9', 'e4', START_FEN);

    expect(result).toBe(false);
    expect(BotState.statusInfo).toBe('Move input failed');
    expect(cancelFrameCalls.length).toBeGreaterThan(0);
  });
});

describe('promotion option matching', () => {
  it('uses exact identifiers and names instead of letters inside generic classes', () => {
    const options: PromotionOptionLike[] = [
      { className: 'promotion-piece' },
      { getAttribute: (name) => (name === 'aria-label' ? 'Promote to Rook' : null) },
      { dataset: { piece: 'white-knight' }, className: 'promotion-piece' },
    ];

    expect(promotionPieceFromLabel('promotion-piece')).toBeNull();
    expect(findPromotionOption(options, 'r')).toBe(options[1]);
    expect(findPromotionOption(options, 'n')).toBe(options[2]);
    expect(findPromotionOption([options[0]], 'r')).toBeNull();
    expect(findPromotionOption([options[0]], 'n')).toBeNull();
  });

  it('rejects a promotion container whose label lists multiple piece choices', () => {
    const container: PromotionOptionLike = {
      getAttribute: (name) => (name === 'aria-label' ? 'Queen Rook Bishop Knight' : null),
    };

    expect(promotionPieceFromLabel('Queen Rook Bishop Knight')).toBeNull();
    expect(findPromotionOption([container], 'q')).toBeNull();
  });
});
