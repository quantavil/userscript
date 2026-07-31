// @ts-nocheck

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Setup Globals for Controller/State dependencies
const mockBoardEl = { style: {}, getAttribute: vi.fn() };
global.document = {
    querySelector: vi.fn((sel) => {
        if (sel === 'chess-board' || sel === '.board') return mockBoardEl;
        return null;
    }),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn() })),
    body: { appendChild: vi.fn() }
};
global.window = {
    innerWidth: 1000,
    addEventListener: vi.fn()
};
global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn()
};

// Now import controller
import { controller } from '../src/controller.js';
import * as board from '../src/board.js';
import { BotState, invalidateGameCache } from '../src/state.js';

// Mock dependencies
vi.mock('../src/board.js', () => ({
    startDomBoardWatcher: vi.fn(),
    startMoveWatcher: vi.fn(),
    stopMoveWatcher: vi.fn(),
    onBoardMutation: vi.fn(() => vi.fn()),
    clearArrows: vi.fn(),
    cancelPendingMove: vi.fn()
}));

vi.mock('../src/ui.js', () => ({
    ui: { updateDisplay: vi.fn(), clearConsole: vi.fn(), log: vi.fn() }
}));

describe('controller.js', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        controller.stop();
        BotState.hackEnabled = 0;
        invalidateGameCache();
        vi.useRealTimers();
    });

    it('should start when hackEnabled is true', () => {
        BotState.hackEnabled = 1;
        controller.start();
        expect(controller.isActive).toBe(true);
        // It should start the move watcher from board.js
        expect(board.startMoveWatcher).toHaveBeenCalled();
    });

    it('should stop when stop() is called', () => {
        BotState.hackEnabled = 1;
        controller.start();
        controller.stop();
        expect(controller.isActive).toBe(false);
        expect(board.stopMoveWatcher).toHaveBeenCalled();
    });

    it('should toggle state correctly', () => {
        BotState.hackEnabled = 1;
        controller.toggle();
        expect(controller.isActive).toBe(true);
        controller.toggle();
        expect(controller.isActive).toBe(false);
    });

    it('should handle game start/end detection loop', () => {
        vi.useFakeTimers();
        const spyInterval = vi.spyOn(global, 'setInterval');

        BotState.hackEnabled = 1;
        controller.start();
        expect(spyInterval).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('should extract last move correctly when it is an object', () => {
        mockBoardEl.game = {
            getLastMove: () => ({ from: 'e2', to: 'e4' }),
            getMoveHistory: () => []
        };
        const move = controller.extractLastMove();
        expect(move).toBe('e2e4');
        mockBoardEl.game = null;
    });

    it('should extract last move correctly when it is a string', () => {
        mockBoardEl.game = {
            getLastMove: () => 'd2d4',
            getMoveHistory: () => []
        };
        const move = controller.extractLastMove();
        expect(move).toBe('d2d4');
        mockBoardEl.game = null;
    });

    it('should extract last move correctly from history if getLastMove is not available', () => {
        mockBoardEl.game = {
            getMoveHistory: () => [{ move: { from: 'g1', to: 'f3' } }]
        };
        const move = controller.extractLastMove();
        expect(move).toBe('g1f3');
        mockBoardEl.game = null;
    });
});
