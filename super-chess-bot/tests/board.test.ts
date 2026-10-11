import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as board from '../src/board.js';
import type { MoveRequest, SiteAdapter } from '../src/sites/types.js';
import * as state from '../src/state.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const PYCHESS_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PYCHESS_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const PYCHESS_E4_C5 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('site move confirmation', () => {
  it('does not confirm an optimistic position without the expected accepted ply', async () => {
    const fixture = makeSiteFixture();
    fixture.setSnapshot({ fen: PYCHESS_E4, confirmedFens: [PYCHESS_START] });
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, PYCHESS_E4, 1), fixture.adapter);

    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBe(false);
    expect(fixture.listenerCount).toBe(0);
  });

  it('confirms the canonical server position at the expected ply', async () => {
    const fixture = makeSiteFixture();
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, PYCHESS_E4, 1), fixture.adapter);

    fixture.setSnapshot({ fen: PYCHESS_E4, confirmedFens: [PYCHESS_START, PYCHESS_E4] });
    fixture.notify();

    await expect(pending).resolves.toBe(true);
    expect(fixture.listenerCount).toBe(0);
  });

  it('confirms the bot move from history when the opponent replies before observation', async () => {
    const fixture = makeSiteFixture();
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, PYCHESS_E4, 1), fixture.adapter);

    fixture.setSnapshot({ fen: PYCHESS_E4_C5, confirmedFens: [PYCHESS_START, PYCHESS_E4, PYCHESS_E4_C5] });
    fixture.notify();

    await expect(pending).resolves.toBe(true);
  });

  it.each([
    ['halfmove counter', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 1 1'],
    ['castling rights', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQk - 0 1'],
  ])('rejects a server FEN with wrong %s at the expected ply', async (_field, wrongFen) => {
    const fixture = makeSiteFixture();
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, PYCHESS_E4, 1), fixture.adapter);

    fixture.setSnapshot({ fen: wrongFen, confirmedFens: [PYCHESS_START, wrongFen] });
    fixture.notify();

    await expect(pending).resolves.toBe(false);
  });

  it('distinguishes a legal en passant right from no en passant right', async () => {
    const start = '4k3/8/8/8/4p3/8/3P4/4K3 w - - 0 1';
    const expected = '4k3/8/8/8/3Pp3/8/8/4K3 b - d3 0 1';
    const fixture = makeSiteFixture(start);
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, expected, 1, start), fixture.adapter);

    fixture.setSnapshot({
      fen: expected.replace(' d3 ', ' - '),
      confirmedFens: [start, expected.replace(' d3 ', ' - ')],
    });
    fixture.notify();

    await expect(pending).resolves.toBe(false);
  });

  it('requires the expected ply and does not match an older repetition', async () => {
    const fixture = makeSiteFixture();
    const request = makeSiteRequest(fixture.identity, PYCHESS_E4, 2);
    const pending = board.confirmSiteMove(request, fixture.adapter);
    fixture.setSnapshot({ fen: PYCHESS_E4_C5, confirmedFens: [PYCHESS_START, PYCHESS_E4, PYCHESS_E4_C5] });
    fixture.notify();
    await expect(pending).resolves.toBe(false);

    const repetition = makeSiteFixture();
    const repeated = board.confirmSiteMove(makeSiteRequest(repetition.identity, PYCHESS_START, 1), repetition.adapter);
    repetition.setSnapshot({ fen: PYCHESS_START, confirmedFens: [PYCHESS_START, PYCHESS_E4, PYCHESS_START] });
    repetition.notify();
    await expect(repeated).resolves.toBe(false);
  });

  it('does not accept the target position from a replacement game', async () => {
    const fixture = makeSiteFixture();
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, PYCHESS_E4, 1), fixture.adapter);
    fixture.setSnapshot({
      identity: {},
      fen: PYCHESS_E4,
      confirmedFens: [PYCHESS_START, PYCHESS_E4],
    });
    fixture.notify();

    await expect(pending).resolves.toBe(false);
    expect(fixture.listenerCount).toBe(0);
  });

  it('settles on timeout and releases its subscription', async () => {
    const fixture = makeSiteFixture();
    const pending = board.confirmSiteMove(makeSiteRequest(fixture.identity, PYCHESS_E4, 1), fixture.adapter);
    expect(fixture.listenerCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toBe(false);
    expect(fixture.listenerCount).toBe(0);
  });

  it('checks once on abort so a fast accepted update is retained, then cleans up', async () => {
    const fixture = makeSiteFixture();
    const controller = new AbortController();
    const request = makeSiteRequest(fixture.identity, PYCHESS_E4, 1, PYCHESS_START, controller.signal);
    const pending = board.confirmSiteMove(request, fixture.adapter);
    fixture.setSnapshot({ fen: PYCHESS_E4, confirmedFens: [PYCHESS_START, PYCHESS_E4] });
    controller.abort();

    await expect(pending).resolves.toBe(true);
    expect(fixture.listenerCount).toBe(0);
  });

  it('settles false on an abort without a confirmed move and cleans up', async () => {
    const fixture = makeSiteFixture();
    const controller = new AbortController();
    const pending = board.confirmSiteMove(
      makeSiteRequest(fixture.identity, PYCHESS_E4, 1, PYCHESS_START, controller.signal),
      fixture.adapter,
    );
    controller.abort();

    await expect(pending).resolves.toBe(false);
    expect(fixture.listenerCount).toBe(0);
  });
});

function makeSiteFixture(startFen = PYCHESS_START) {
  let identity = {};
  let snapshot = {
    identity,
    gameId: 'game-one',
    board: {} as HTMLElement,
    fen: startFen,
    playerColor: 'w' as const,
    sideToMove: 'w' as const,
    orientation: 'white' as const,
    phase: 'live' as const,
    inputReady: true,
    remainingMs: 60_000,
    confirmedFens: [startFen],
  };
  const listeners = new Set<() => void>();
  const adapter: SiteAdapter = {
    id: 'pychess',
    capabilities: { input: 'selection' },
    read: () => ({ kind: 'game', snapshot }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async submitMove() {
      return false;
    },
    cancelInput() {},
  };
  return {
    adapter,
    get identity() {
      return identity;
    },
    get listenerCount() {
      return listeners.size;
    },
    setSnapshot(changes: Partial<typeof snapshot>) {
      if (changes.identity) identity = changes.identity;
      snapshot = { ...snapshot, ...changes, identity };
    },
    notify() {
      for (const listener of [...listeners]) listener();
    },
  };
}

function makeSiteRequest(
  identity: object,
  expectedFen: string,
  expectedPly: number,
  fromFen = PYCHESS_START,
  signal = new AbortController().signal,
): MoveRequest {
  return { identity, fromFen, uci: 'e2e4', expectedFen, expectedPly, signal, isCurrent: () => true };
}

function setupMockBoard(flipped = false, playerColor = 'w') {
  const whiteBar = { id: 'evaluationBarWhite', style: {} as Record<string, string> };
  const blackBar = { id: 'evaluationBarBlack', style: {} as Record<string, string> };
  const evalBarWrap = {
    id: 'evaluationBarWrap',
    style: {} as Record<string, string>,
    setAttribute: () => {},
    appendChild: (child: { id?: string }) => {
      if (child.id === 'evaluationBarWhite') Object.assign(child, whiteBar);
      if (child.id === 'evaluationBarBlack') Object.assign(child, blackBar);
    },
    remove: () => {},
    querySelector: (sel: string) => {
      if (sel === '#evaluationBarWhite') return whiteBar;
      if (sel === '#evaluationBarBlack') return blackBar;
      return null;
    },
  };
  const ctxCalls: string[] = [];
  const mockCtx = {
    beginPath: () => ctxCalls.push('beginPath'),
    moveTo: (x: number, y: number) => ctxCalls.push(`moveTo(${x},${y})`),
    lineTo: (x: number, y: number) => ctxCalls.push(`lineTo(${Math.round(x)},${Math.round(y)})`),
    arc: () => ctxCalls.push('arc'),
    fill: () => ctxCalls.push('fill'),
    stroke: () => ctxCalls.push('stroke'),
    closePath: () => ctxCalls.push('closePath'),
    set strokeStyle(_v: string) {},
    set fillStyle(_v: string) {},
    set lineWidth(_v: number) {},
    set lineCap(_v: string) {},
  };
  const mockCanvas = {
    id: 'arrowCanvas',
    width: 400,
    height: 400,
    getContext: () => mockCtx,
    style: {} as Record<string, string>,
    setAttribute: () => {},
    remove: () => {},
  };
  const mockBoard = {
    style: {} as Record<string, string>,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    appendChild: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal('getComputedStyle', () => ({ position: 'relative' }));
  let createdCount = 0;
  vi.stubGlobal('document', {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      if (tag === 'div') {
        createdCount++;
        if (createdCount === 1) return evalBarWrap;
        if (createdCount === 2) return whiteBar;
        return blackBar;
      }
      return { setAttribute: () => {}, style: {}, appendChild: () => {}, remove: () => {} };
    },
    getElementById: (id: string) => {
      if (id === 'evaluationBarWhite') return whiteBar;
      if (id === 'evaluationBarBlack') return blackBar;
      return null;
    },
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(state, 'isBoardFlipped').mockReturnValue(flipped);
  vi.spyOn(state, 'getPlayerColor').mockReturnValue(playerColor);

  board.attachToBoard(mockBoard as unknown as HTMLElement);
  return { whiteBar, blackBar, ctxCalls };
}

describe('evaluation bar', () => {
  it('anchors white bar to bottom when board is not flipped', () => {
    const { whiteBar, blackBar } = setupMockBoard(false, 'w');

    board.updateEvaluationBar('+1.50', 1);

    expect(whiteBar.style.bottom).toBe('0');
    expect(whiteBar.style.top).toBe('auto');
    expect(whiteBar.style.height).toBe('65%');
    expect(blackBar.style.top).toBe('0');
    expect(blackBar.style.bottom).toBe('auto');
    expect(blackBar.style.height).toBe('35%');
  });

  it('inverts evaluation bar anchors when board is flipped (black perspective)', () => {
    const { whiteBar, blackBar } = setupMockBoard(true, 'b');

    board.updateEvaluationBar('+1.50', 2);

    expect(blackBar.style.bottom).toBe('0');
    expect(blackBar.style.top).toBe('auto');
    expect(blackBar.style.height).toBe('35%');
    expect(whiteBar.style.top).toBe('0');
    expect(whiteBar.style.bottom).toBe('auto');
    expect(whiteBar.style.height).toBe('65%');
  });

  it('updates the attached overlay orientation from the site snapshot', () => {
    const { whiteBar, blackBar } = setupMockBoard(false, 'b');
    board.setBoardOrientation('black');

    board.updateEvaluationBar('+1.50', 2);

    expect(blackBar.style.bottom).toBe('0');
    expect(blackBar.style.height).toBe('35%');
    expect(whiteBar.style.top).toBe('0');
    expect(whiteBar.style.height).toBe('65%');
  });
});

describe('arrow rendering', () => {
  it('draws arrow with chevron arrowhead on canvas', () => {
    const { ctxCalls } = setupMockBoard(false, 'w');
    board.drawArrow('e2', 'e4', 'rgba(255,170,0,0.8)', 6);

    expect(ctxCalls).toContain('closePath');
    expect(ctxCalls.filter((c) => c === 'fill').length).toBe(2);
    expect(ctxCalls.filter((c) => c === 'stroke').length).toBe(1);
  });

  it('uses the latest site orientation to place arrow coordinates', () => {
    const { ctxCalls } = setupMockBoard(false, 'b');
    board.setBoardOrientation('black');
    board.drawArrow('e2', 'e4', 'rgba(255,170,0,0.8)', 6);

    expect(ctxCalls).toContain('moveTo(175,75)');
  });
});
