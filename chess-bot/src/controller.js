
import { BotState, PositionCache, getGame, getFen, isPlayersTurn, pa, invalidateGameCache, Settings } from './state.js';
import { sleep } from './utils.js';
import { clearArrows, cancelPendingMove, startDomBoardWatcher, startMoveWatcher, stopMoveWatcher, onBoardMutation } from './board.js';
import { ui } from './ui.js';
import { scheduleAnalysis, getLastFenProcessedMain, setLastFenProcessedMain, getLastFenProcessedPremove, setLastFenProcessedPremove } from './engine/scheduler.js';
import { resetEngine } from './engine/analysis.js';

class BotController {
    constructor() {
        this.isActive = false;
        this.tickTimer = null;
        this.checkInterval = null;

        // Loop state
        this.lastFenSeen = '';
        this.fenFirstSeenTime = 0;
        this.failsafeAttempts = 0;

        // Game end state
        this.gameEndDetected = false;

        // Observer cleanup
        this.mutationCleanup = null;
    }

    init() {
        // Start minimal watchers (settings, DOM)
        this.startSettingsWatcher();
        startDomBoardWatcher(); // Ensure board watcher is running

        // Initial state check
        if (BotState.hackEnabled) {
            this.start();
        }
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;

        console.log('GabiBot: Controller started.');
        BotState.statusInfo = 'Ready';
        ui.updateDisplay(pa());

        this.startTickLoop();
        this.startGameCheckLoop();
    }

    stop() {
        if (!this.isActive) return;
        this.isActive = false;

        console.log('GabiBot: Controller stopped.');
        this.stopTickLoop();
        this.stopGameCheckLoop();

        // Cleanup
        PositionCache.clear();
        clearArrows();
        cancelPendingMove();

        BotState.statusInfo = 'Bot disabled';
        BotState.currentEvaluation = '-';
        BotState.bestMove = '-';
        ui.updateDisplay(pa());
    }

    toggle() {
        if (this.isActive) this.stop();
        else this.start();
    }

    // --- Main Logic Loop ---

    startTickLoop() {
        this.stopTickLoop();

        // Start board observer from board.js
        startMoveWatcher();
        if (!this.mutationCleanup) {
            this.mutationCleanup = onBoardMutation(() => {
                if (!this.isActive || !BotState.hackEnabled) return;
                this.tick();
            });
        }

        const loop = () => {
            if (!this.isActive || !BotState.hackEnabled) return;

            this.tick();

            this.tick();

            // Fixed failsafe interval (1000ms) - primarily for redundancy
            this.tickTimer = setTimeout(loop, 1000);
        };

        loop();
    }

    stopTickLoop() {
        if (this.tickTimer) clearTimeout(this.tickTimer);
        this.tickTimer = null;

        stopMoveWatcher();
        if (this.mutationCleanup) {
            this.mutationCleanup();
            this.mutationCleanup = null;
        }
    }

    tick() {
        invalidateGameCache();
        const game = getGame();

        // 1. Check for basic game existence
        if (!game) return;

        // 2. Check for internal Game Over state
        if (game.isGameOver && game.isGameOver()) {
            this.handleInternalGameOver();
            return;
        }

        const fen = getFen(game);
        if (!fen) return;

        // 3. New FEN handling (reset state)
        if (fen !== this.lastFenSeen) {
            this.lastFenSeen = fen;
            this.fenFirstSeenTime = Date.now();
            this.failsafeAttempts = 0;
            cancelPendingMove();
            clearArrows();
        }

        // 4. Analysis Logic
        if (isPlayersTurn(game)) {
            // Failsafe for stuck state
            if (getLastFenProcessedMain() === fen) {
                this.checkFailsafe(fen);
            }

            // Schedule main analysis if needed
            if (getLastFenProcessedMain() !== fen) {
                // Pass a callback to re-tick immediately if move fails/completes fast
                scheduleAnalysis('main', fen, () => this.tick());
            }
        } else {
            // Premove logic
            if (BotState.premoveEnabled) {
                if (getLastFenProcessedPremove() !== fen) {
                    scheduleAnalysis('premove', fen);
                } else {
                    this.setStatus('Waiting for opponent...');
                }
            } else {
                this.setStatus('Waiting for opponent...');
            }
        }
    }

    handleInternalGameOver() {
        // Only update if we haven't already marked it
        if (BotState.statusInfo !== 'Game finished') {
            BotState.currentEvaluation = 'GAME OVER';
            BotState.bestMove = '-';
            BotState.principalVariation = 'Game ended';
            BotState.statusInfo = 'Game finished';
            clearArrows();
            ui.updateDisplay(pa());
        }
    }

    checkFailsafe(fen) {
        // Only trigger failsafe if the bot explicitly reports a failure
        // 'Move failed (gave up)' is set by board.js after all retries are exhausted.
        // 'Error' is set by analysis/scheduler on critical failures.
        const hasFailed = BotState.statusInfo.includes('Move failed') || BotState.statusInfo.includes('Error');

        if (hasFailed) {
            console.log(`GabiBot: 🛡️ Failsafe triggered (Status: ${BotState.statusInfo}). HARD RESET. Attempt #${this.failsafeAttempts + 1}`);

            // 1. Clear State
            setLastFenProcessedMain('');
            setLastFenProcessedPremove('');
            cancelPendingMove();
            clearArrows();

            // 2. True Reset (Re-hook observers)
            stopMoveWatcher();
            startMoveWatcher();
            startDomBoardWatcher();

            // 3. Reset Engine Memory
            resetEngine();

            // 4. Reset Timer & Increment Attempt
            this.fenFirstSeenTime = now;
            this.failsafeAttempts++;

            BotState.statusInfo = `⚠️ Resetting (${this.failsafeAttempts})`;
            ui.updateDisplay(pa());

            // 5. Force Tick
            setTimeout(() => this.tick(), 100);
        }
    }

    setStatus(msg) {
        if (BotState.statusInfo !== msg) {
            BotState.statusInfo = msg;
            ui.updateDisplay(pa());
        }
    }

    // --- Game Check Loop (Start/End detection) ---
    // Replaces gameStartInterval / gameEndInterval

    startGameCheckLoop() {
        this.stopGameCheckLoop();
        this.checkInterval = setInterval(() => this.checkGameState(), 1000);
    }

    stopGameCheckLoop() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = null;
    }

    checkGameState() {
        const gameOverModal = document.querySelector('.game-over-modal-content');

        // Game Over Detected via UI
        if (gameOverModal && !this.gameEndDetected) {
            // console.log('GabiBot: Game over detected (UI)');
            this.gameEndDetected = true;

            clearArrows();
            cancelPendingMove();

            BotState.statusInfo = 'Game ended, preparing new game...';
            BotState.currentEvaluation = '-';
            BotState.bestMove = '-';
            ui.updateDisplay(pa());

            if (BotState.autoRematch) {
                this.handleAutoRematch();
            }
        }

        // New Game Detected
        if (!gameOverModal && this.gameEndDetected) {
            // console.log('GabiBot: New game started');
            this.gameEndDetected = false;

            // Reset tracking
            setLastFenProcessedMain('');
            setLastFenProcessedPremove('');
            this.lastFenSeen = '';

            // Clear Engine Memory (TT) for fresh game
            resetEngine();

            BotState.statusInfo = 'Ready';
            ui.updateDisplay(pa());

            // Force immediate tick
            setTimeout(() => this.tick(), 500);
        }
    }

    handleAutoRematch() {
        console.log('GabiBot: Auto-queue sequence initiated');

        // Delay to allow game-over UI to settle
        setTimeout(() => {
            const actions = [
                { name: 'Rematch', sel: '[data-cy="sidebar-game-over-rematch-button"]' },
                { name: 'New 1 Min Modal', sel: '[data-cy="game-over-modal-new-game-button"]' },
                { name: 'New 1 Min', sel: '[data-cy="sidebar-game-over-new-game-button"]' },
                { name: 'Arena Next', sel: '[data-cy="next-arena-game-button"]' },
                { name: 'Arena Request', sel: '[data-cy="request-arena-game"]' }
            ];

            for (const { name, sel } of actions) {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null) {
                    console.log(`GabiBot: Clicking ${name}`);
                    btn.click();
                    return;
                }
            }
        }, 1500);
    }

    // --- Settings / State Watcher ---

    startSettingsWatcher() {
        let lastHackEnabled = BotState.hackEnabled;
        let lastUpdateSpeed = BotState.updateSpeed;

        setInterval(() => {
            // Check for enable/disable toggle
            if (BotState.hackEnabled !== lastHackEnabled) {
                lastHackEnabled = BotState.hackEnabled;
                if (BotState.hackEnabled) this.start();
                else this.stop();

                Settings.save();
            }

        }, 200);
    }
}

export const controller = new BotController();
