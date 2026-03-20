
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as board from '../src/board.js';
import * as state from '../src/state.js';

// Setup Globals
global.document = {
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), getContext: vi.fn() })),
    body: { appendChild: vi.fn(), addEventListener: vi.fn() },
    elementFromPoint: vi.fn()
};

global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: vi.fn(),
    getComputedStyle: vi.fn(() => ({ position: 'static' })),
    PointerEvent: class { },
    MouseEvent: class { }
};

global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock MutationObserver
let observerCallback = null;
global.MutationObserver = class {
    constructor(cb) { observerCallback = cb; }
    observe(el, opts) { this.el = el; this.opts = opts; }
    disconnect() { observerCallback = null; }
    takeRecords() { return []; }
};

global.ResizeObserver = class {
    observe() { }
    disconnect() { }
};

describe('board.js', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        // Reset specific mocks
        global.document.querySelector.mockReset();
        board.stopMoveWatcher();
    });

    it('should start move watcher and attach observer', () => {
        const mockBoard = { style: {} };
        global.document.querySelector.mockReturnValue(mockBoard);

        vi.spyOn(state, 'getGame').mockReturnValue({ getFEN: () => 'start' });

        board.startMoveWatcher();

        expect(global.document.querySelector).toHaveBeenCalledWith('chess-board');
    });

    it('should notify listeners on board mutation', () => new Promise(done => {
        vi.useFakeTimers();
        const mockBoard = { style: {} };
        global.document.querySelector.mockReturnValue(mockBoard);
        vi.spyOn(state, 'getGame').mockReturnValue({ getFEN: () => 'start' });

        board.startMoveWatcher();

        const listener = vi.fn();
        const cleanup = board.onBoardMutation(listener);

        // Simulate mutation
        if (observerCallback) {
            observerCallback(); // Trigger debounce
            vi.advanceTimersByTime(200); // Wait for debounce (50ms in code)
        }

        expect(listener).toHaveBeenCalled();
        cleanup();
        vi.useRealTimers();
        done();
    }));

    it('waitForFenChange should resolve when FEN changes', async () => {
        vi.useFakeTimers();
        const initialFen = 'fen1';
        let currentFen = initialFen;

        // Mock getGame to return dynamic FEN
        vi.spyOn(state, 'getGame').mockImplementation(() => ({
            getFEN: () => currentFen
        }));

        const promise = board.waitForFenChange(initialFen, 1000);

        // 1. Advance time slightly (initial check)
        vi.advanceTimersByTime(50);

        // 2. Change FEN
        currentFen = 'fen2';

        // 3. Trigger observation/fallback loop
        if (observerCallback) observerCallback();
        vi.advanceTimersByTime(50); // Advance for debounce/raf

        await expect(promise).resolves.toBe(true);
        vi.useRealTimers();
    });
});
