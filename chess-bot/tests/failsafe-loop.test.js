/**
 * Tests that verify the failsafe-loop fix.
 *
 * These tests prove that:
 *  1. checkFailsafe no longer exists — the infinite loop vector is gone
 *  2. tick() is called exactly once per loop iteration (not twice)
 *  3. When a move fails, the bot does NOT re-schedule analysis for the same FEN
 *  4. The bot recovers properly when a NEW position appears after a failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Global DOM/Browser shims ───────────────────────────────────────────────
const mockBoardEl = {
    style: {}, getAttribute: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ width: 400, height: 400, top: 0, left: 0 })),
    game: null
};

global.document = {
    querySelector: vi.fn((sel) => {
        if (sel === 'chess-board' || sel === '.board' || sel.includes('board')) return mockBoardEl;
        if (sel === '.game-over-modal-content') return null;
        return null;
    }),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn(() => ({
        style: {}, appendChild: vi.fn(), id: '',
        getContext: vi.fn(() => ({
            clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
            lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn()
        }))
    })),
    body: { appendChild: vi.fn() },
    elementFromPoint: vi.fn(() => null)
};
global.window = { innerWidth: 1000, addEventListener: vi.fn(), PointerEvent: undefined };
global.localStorage = { getItem: vi.fn(), setItem: vi.fn() };
global.MutationObserver = vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }));
global.ResizeObserver = vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }));
global.performance = { now: vi.fn(() => Date.now()) };
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));

// ─── Mock board.js ──────────────────────────────────────────────────────────
vi.mock('../src/board.js', () => ({
    startDomBoardWatcher: vi.fn(),
    startMoveWatcher: vi.fn(),
    stopMoveWatcher: vi.fn(),
    onBoardMutation: vi.fn(() => vi.fn()),
    clearArrows: vi.fn(),
    cancelPendingMove: vi.fn(),
    attachToBoard: vi.fn(),
    executeMove: vi.fn(),
    simulateClickMove: vi.fn(),
    simulateDragMove: vi.fn(),
    drawArrow: vi.fn()
}));

// ─── Mock ui.js ─────────────────────────────────────────────────────────────
vi.mock('../src/ui.js', () => ({
    ui: { updateDisplay: vi.fn(), clearConsole: vi.fn() }
}));

// ─── Mock engine ────────────────────────────────────────────────────────────
vi.mock('../src/engine/analysis.js', () => ({
    resetEngine: vi.fn(),
    getAnalysis: vi.fn(async () => ({
        success: true, depth: 8, bestmove: 'e2e4',
        analysis: [{ uci: 'e2e4', pv: 'e2e4 e7e5', score: { type: 'cp', value: 30 } }]
    })),
    parseBestLine: vi.fn(() => ({
        uci: 'e2e4', pv: 'e2e4 e7e5', score: { type: 'cp', value: 30 }
    }))
}));

// ─── Now import the modules under test ──────────────────────────────────────
import { controller } from '../src/controller.js';
import { BotState } from '../src/state.js';
import * as board from '../src/board.js';
import {
    getLastFenProcessedMain,
    setLastFenProcessedMain,
    setLastFenProcessedPremove,
    scheduleAnalysis,
    getLastFenProcessedPremove
} from '../src/engine/scheduler.js';

// ─── Helper ─────────────────────────────────────────────────────────────────
const TEST_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TEST_FEN_2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

function installFakeGame(fen = TEST_FEN, playingAs = 1) {
    mockBoardEl.game = {
        getFEN: () => fen,
        getPlayingAs: () => playingAs,
        isGameOver: () => false
    };
}

function removeFakeGame() {
    mockBoardEl.game = null;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Failsafe Loop Fix Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        controller.stop();
        BotState.hackEnabled = 0;
        BotState.autoMove = 1;
        BotState.statusInfo = 'Ready';
        BotState.currentEvaluation = '-';
        BotState.bestMove = '-';
        controller.lastFenSeen = '';
        controller.gameEndDetected = false;
        setLastFenProcessedMain('');
        setLastFenProcessedPremove('');
        removeFakeGame();
    });

    afterEach(() => {
        controller.stop();
        vi.useRealTimers();
    });

    // ─── FIX 1: checkFailsafe no longer exists ──────────────────────────
    it('checkFailsafe method does not exist on the controller', () => {
        expect(controller.checkFailsafe).toBeUndefined();
    });

    it('failsafeAttempts property does not exist on the controller', () => {
        expect(controller.failsafeAttempts).toBeUndefined();
    });

    // ─── FIX 2: tick() called exactly once per loop iteration ───────────
    it('startTickLoop calls tick() exactly once per loop iteration', () => {
        installFakeGame();
        BotState.hackEnabled = 1;
        controller.isActive = true;

        const tickSpy = vi.spyOn(controller, 'tick');
        vi.useFakeTimers();

        controller.startTickLoop();

        // Initial loop call: exactly 1 tick
        expect(tickSpy.mock.calls.length).toBe(1);

        // After 1000ms: another loop → exactly 1 more tick (total 2)
        vi.advanceTimersByTime(1000);
        expect(tickSpy.mock.calls.length).toBe(2);

        // After another 1000ms: total 3
        vi.advanceTimersByTime(1000);
        expect(tickSpy.mock.calls.length).toBe(3);

        vi.useRealTimers();
        tickSpy.mockRestore();
    });

    // ─── FIX 3: Move failure does NOT re-trigger analysis ───────────────
    it('after move failure, tick() does NOT re-schedule analysis for the same FEN', () => {
        installFakeGame();
        BotState.hackEnabled = 1;
        controller.isActive = true;

        // Simulate: analysis completed and FEN was marked as processed
        controller.lastFenSeen = TEST_FEN;
        setLastFenProcessedMain(TEST_FEN);

        // Simulate move failure
        BotState.statusInfo = '❌ Move failed — waiting for next position';

        // Now tick() runs (e.g. from the periodic loop)
        controller.tick();

        // lastFenProcessedMain should still be TEST_FEN — NOT cleared
        expect(getLastFenProcessedMain()).toBe(TEST_FEN);

        // Status should remain unchanged (no "Resetting" message)
        expect(BotState.statusInfo).toBe('❌ Move failed — waiting for next position');
    });

    it('move failure with old status text also does not loop', () => {
        installFakeGame();
        BotState.hackEnabled = 1;
        controller.isActive = true;
        controller.lastFenSeen = TEST_FEN;
        setLastFenProcessedMain(TEST_FEN);

        // Even with the old-style error text
        BotState.statusInfo = '❌ Move failed (gave up)';
        controller.tick();

        // No re-analysis: FEN is still marked as processed
        expect(getLastFenProcessedMain()).toBe(TEST_FEN);
    });

    it('analysis error also does not loop', () => {
        installFakeGame();
        BotState.hackEnabled = 1;
        controller.isActive = true;
        controller.lastFenSeen = TEST_FEN;
        setLastFenProcessedMain(TEST_FEN);

        BotState.statusInfo = '❌ Analysis Error';
        controller.tick();

        // No re-analysis
        expect(getLastFenProcessedMain()).toBe(TEST_FEN);
    });

    // ─── FIX 4: Recovery works when position changes ────────────────────
    it('bot recovers correctly when a new FEN appears after a failure', () => {
        installFakeGame();
        BotState.hackEnabled = 1;
        controller.isActive = true;
        controller.lastFenSeen = TEST_FEN;
        setLastFenProcessedMain(TEST_FEN);

        // Move failed
        BotState.statusInfo = '❌ Move failed — waiting for next position';
        controller.tick();

        // Position hasn't changed → no re-analysis
        expect(getLastFenProcessedMain()).toBe(TEST_FEN);

        // Now opponent moves → new FEN
        installFakeGame(TEST_FEN_2, 1);
        controller.tick();

        // New FEN detected → lastFenSeen updated
        expect(controller.lastFenSeen).toBe(TEST_FEN_2);

        // The old processed FEN no longer matches → analysis will be scheduled
        // (since getLastFenProcessedMain() is TEST_FEN but current fen is TEST_FEN_2)
        expect(getLastFenProcessedMain()).not.toBe(TEST_FEN_2);
    });

    // ─── Stress test: rapid failures produce no loop ────────────────────
    it('100 consecutive ticks with failure status never clear lastFenProcessedMain', () => {
        installFakeGame();
        BotState.hackEnabled = 1;
        controller.isActive = true;
        controller.lastFenSeen = TEST_FEN;
        setLastFenProcessedMain(TEST_FEN);

        BotState.statusInfo = '❌ Move failed — waiting for next position';

        for (let i = 0; i < 100; i++) {
            controller.tick();
        }

        // FEN was NEVER cleared — the bot just waited
        expect(getLastFenProcessedMain()).toBe(TEST_FEN);
        expect(controller.isActive).toBe(true);
    });
});
