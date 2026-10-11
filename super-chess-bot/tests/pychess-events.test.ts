import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPychessAdapter } from '../src/sites/pychess.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

afterEach(() => vi.restoreAllMocks());

describe('PyChess adapter events', () => {
  it('notifies when the server movelist acknowledges a move', async () => {
    const fixture = makePage();
    const adapter = createPychessAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);

    fixture.moves.push(makeMove(1, 'e4', true));
    fixture.notify('movelist');
    await flush();

    expect(listener).toHaveBeenCalledOnce();
  });

  it('deduplicates clock, animation, and overlay mutations when normalized state is unchanged', async () => {
    const fixture = makePage();
    const adapter = createPychessAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);

    fixture.setClock('clock1', '00', '59');
    fixture.notify('clock');
    await flush();
    fixture.notify('overlay');
    await flush();
    fixture.notify('animation');
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates listener errors so other listeners still receive changes', async () => {
    const fixture = makePage();
    const adapter = createPychessAdapter(() => fixture.page as unknown as Window);
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    const first = vi.fn(() => {
      throw new Error('listener failed');
    });
    const second = vi.fn();
    adapter.subscribe(first);
    adapter.subscribe(second);

    fixture.moves.push(makeMove(1, 'e4', true));
    fixture.notify('movelist');
    await flush();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(logger).toHaveBeenCalledOnce();
  });

  it('notifies on board or cg replacement and disconnects observers on unsubscribe', async () => {
    const fixture = makePage();
    const adapter = createPychessAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    const oldIdentity = adapter.read();

    fixture.replaceCg();
    fixture.notify('board');
    await flush();
    const changedCg = adapter.read();
    expect(listener).toHaveBeenCalledOnce();
    if (oldIdentity.kind === 'game' && changedCg.kind === 'game') {
      expect(changedCg.snapshot.identity).not.toBe(oldIdentity.snapshot.identity);
    }

    fixture.replaceBoard();
    fixture.notify('board');
    await flush();
    const newIdentity = adapter.read();
    expect(listener).toHaveBeenCalledTimes(2);
    if (changedCg.kind === 'game' && newIdentity.kind === 'game') {
      expect(newIdentity.snapshot.identity).not.toBe(changedCg.snapshot.identity);
    }

    unsubscribe();
    expect(fixture.observers.some((observer) => observer.disconnected)).toBe(true);
  });

  it('notifies when terminal UI appears without changing the FEN', async () => {
    const fixture = makePage();
    const adapter = createPychessAdapter(() => fixture.page as unknown as Window);
    const listener = vi.fn();
    adapter.subscribe(listener);
    fixture.setTerminal('0-1');
    fixture.notify('resultText');
    await flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(adapter.read()).toMatchObject({ kind: 'game', snapshot: { phase: 'finished', fen: START_FEN } });
  });
});

function flush(): Promise<void> {
  return Promise.resolve();
}

function makeMove(ply: number, san: string, active: boolean) {
  return {
    getAttribute: (name: string) => (name === 'ply' ? String(ply) : null),
    classList: { contains: (name: string) => name === 'active' && active },
    querySelector: (selector: string) => (selector === 'san' ? { textContent: san } : null),
  };
}

function makePage() {
  const observers: FakeObserver[] = [];
  const moves: ReturnType<typeof makeMove>[] = [];
  let board = makeBoard();
  let resultText: string | null = null;
  let postgame = false;
  const clockTexts = new Map<string, { min: string; sec: string; connecting: boolean }>([
    ['clock0', { min: '01', sec: '00', connecting: false }],
    ['clock1', { min: '01', sec: '00', connecting: false }],
  ]);
  const body = {
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
      initialfen: '',
      status: '0',
      result: '*',
    },
    querySelector: (selector: string) => query(selector),
  };
  const document = {
    body,
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
    querySelector: (selector: string) => query(selector),
    querySelectorAll: (selector: string) => (selector === '#movelist move[ply]' ? moves : []),
  };
  const page = {
    location: { pathname: '/Game1234' },
    document,
    MutationObserver: class extends FakeObserver {
      constructor(callback: (records: MutationRecord[]) => void) {
        super(callback);
        observers.push(this);
      }
    },
    cg: makeCg(board),
  };

  function query(selector: string): unknown {
    if (selector === '.round-app') return {};
    if (selector === '.round-app #mainboard cg-board' || selector === '#mainboard cg-board') return board;
    if (selector === '#movelist .result') return resultText ? { textContent: resultText } : null;
    if (selector === '.btn-controls.after') return postgame ? {} : null;
    if (selector.startsWith('#clock0') || selector.startsWith('#clock1')) {
      const clockId = selector.startsWith('#clock0') ? 'clock0' : 'clock1';
      const clock = clockTexts.get(clockId);
      if (!clock) return null;
      if (selector.endsWith('.min')) return { textContent: clock.min };
      if (selector.endsWith('.sec')) return { textContent: clock.sec };
      if (selector.includes('.connecting')) return clock.connecting ? {} : null;
      return {};
    }
    return null;
  }

  return {
    page,
    moves,
    observers,
    notify(kind: 'movelist' | 'clock' | 'overlay' | 'animation' | 'board' | 'resultText') {
      const target = {
        nodeType: 1,
        closest: (selector: string) => {
          if (kind === 'movelist' && selector.includes('#movelist')) return {};
          if (kind === 'animation' && selector.includes('#mainboard')) return {};
          if (kind === 'resultText' && selector.includes('#movelist')) return {};
          if (kind === 'overlay' && selector.includes('[data-gabibot-overlay]')) return {};
          return null;
        },
        matches: (selector: string) => kind === 'clock' && selector === '.clock',
        querySelector: () => null,
      };
      const changedNode = {
        nodeType: 1,
        matches: (selector: string) => kind === 'board' && selector === '.round-app',
        querySelector: () => null,
      };
      const record = {
        type:
          kind === 'clock' || kind === 'resultText'
            ? 'characterData'
            : kind === 'animation'
              ? 'attributes'
              : 'childList',
        attributeName: kind === 'animation' ? 'class' : null,
        target,
        addedNodes: kind === 'board' ? [changedNode] : [],
        removedNodes: [],
      } as unknown as MutationRecord;
      for (const observer of observers) observer.notify(record);
    },
    setClock(id: string, min: string, sec: string) {
      clockTexts.set(id, { min, sec, connecting: false });
    },
    setTerminal(value: string) {
      resultText = value;
      postgame = true;
    },
    replaceBoard() {
      board = makeBoard();
      page.cg = makeCg(board);
    },
    replaceCg() {
      page.cg = makeCg(board);
    },
  };
}

function makeBoard() {
  return {
    isConnected: true,
    style: {},
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } },
    getClientRects: () => [{ width: 400, height: 400 }],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    querySelectorAll: () => [],
  };
}

function makeCg(board: object) {
  return {
    getFen: () => START_FEN.split(' ')[0],
    selectSquare: vi.fn(),
    state: {
      fen: START_FEN,
      turnColor: 'white',
      orientation: 'white',
      movable: { color: 'white' },
      dimensions: { width: 8, height: 8 },
      dom: { elements: { board } },
    },
  };
}

class FakeObserver {
  disconnected = false;
  private callback: (records: MutationRecord[]) => void;

  constructor(callback: (records: MutationRecord[]) => void) {
    this.callback = callback;
  }

  observe() {}

  disconnect() {
    this.disconnected = true;
  }

  notify(record: MutationRecord) {
    this.callback([record]);
  }
}
