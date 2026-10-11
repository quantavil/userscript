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

