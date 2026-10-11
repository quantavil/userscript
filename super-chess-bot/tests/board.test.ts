import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as board from '../src/board.js';
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

describe('board move confirmation', () => {
  it('resolves when polling sees a changed FEN', async () => {
    let currentFen = 'fen1';
    vi.spyOn(state, 'getGame').mockImplementation(() => ({ getFEN: () => currentFen }));

    const confirmation = board.waitForFenChange('fen1', 1000);
    await vi.advanceTimersByTimeAsync(16);
    currentFen = 'fen2';
    await vi.advanceTimersByTimeAsync(16);

    await expect(confirmation).resolves.toBe(true);
  });

  it('confirms move when current FEN has advanced past expectedFen but expectedFen is in getHistoryFENs', async () => {
    let currentFen = 'fen1';
    const historyFENs = ['fen1'];
    vi.spyOn(state, 'getGame').mockImplementation(() => ({
      getFEN: () => currentFen,
      getHistoryFENs: () => historyFENs,
    }));

    const confirmation = board.waitForFenChange('fen1', 1000, 'fen2');
    await vi.advanceTimersByTimeAsync(16);
    // Opponent moved immediately: current FEN jumped from fen1 directly to fen3, but fen2 is recorded in history
    historyFENs.push('fen2', 'fen3');
    currentFen = 'fen3';
    await vi.advanceTimersByTimeAsync(16);

    await expect(confirmation).resolves.toBe(true);
  });
});

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
});

describe('arrow rendering', () => {
  it('draws arrow with chevron arrowhead on canvas', () => {
    const { ctxCalls } = setupMockBoard(false, 'w');
    board.drawArrow('e2', 'e4', 'rgba(255,170,0,0.8)', 6);

    expect(ctxCalls).toContain('closePath');
    expect(ctxCalls.filter((c) => c === 'fill').length).toBe(2);
    expect(ctxCalls.filter((c) => c === 'stroke').length).toBe(1);
  });
});
