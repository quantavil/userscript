
import { BotState, PositionCache, getGame, getFen, isPlayersTurn, pa, invalidateGameCache, Settings } from './state.js';
import { sleep } from './utils.js';
import { clearArrows, cancelPendingMove, startDomBoardWatcher, startMoveWatcher, stopMoveWatcher, onBoardMutation } from './board.js';
import { ui } from './ui.js';
import { scheduleAnalysis, getLastFenProcessedMain, setLastFenProcessedMain, getLastFenProcessedPremove, setLastFenProcessedPremove } from './engine.js';

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

            // Dynamic interval based on speed setting
            const interval = Math.max(100, 1100 - (Number(BotState.updateSpeed) || 8) * 100);
            this.tickTimer = setTimeout(loop, interval);
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
        const now = Date.now();
        const backoffWait = Math.min(3000 * Math.pow(2, this.failsafeAttempts), 24000);

        if (now - this.fenFirstSeenTime > backoffWait) {
            console.log(`GabiBot: 🛡️ Failsafe triggered (${backoffWait}ms stuck), full reset. Attempt #${this.failsafeAttempts + 1}`);
            setLastFenProcessedMain('');
            cancelPendingMove();
            this.fenFirstSeenTime = now;
            this.failsafeAttempts++;
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
            console.log('GabiBot: Game over detected (UI)');
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
            console.log('GabiBot: New game started');
            this.gameEndDetected = false;

            // Reset tracking
            setLastFenProcessedMain('');
            setLastFenProcessedPremove('');
            this.lastFenSeen = '';

            BotState.statusInfo = 'Ready';
            ui.updateDisplay(pa());

            // Force immediate tick
            setTimeout(() => this.tick(), 500);
        }
    }

    handleAutoRematch() {
        console.log('GabiBot: Auto-rematch sequence initiated');
        // Sequence: Rematch -> New X min -> Close -> Tab -> Start
        setTimeout(() => {
            const modal = document.querySelector('.game-over-modal-content');
            if (!modal) return;
            const btn = Array.from(modal.querySelectorAll('button')).find(b =>
                /rematch/i.test((b.textContent || '').trim()) ||
                /rematch/i.test((b.getAttribute?.('aria-label') || '').trim())
            );
            if (btn) btn.click();
        }, 2000);

        setTimeout(() => {
            const modal = document.querySelector('.game-over-modal-content');
            if (!modal) return;
            const btn = Array.from(modal.querySelectorAll('button')).find(b => /new.*\d+.*min/i.test(b.textContent || ''));
            if (btn) btn.click();
        }, 12000);

        setTimeout(async () => {
            const modal = document.querySelector('.game-over-modal-content');
            if (modal) {
                const closeBtn = modal.querySelector('[aria-label="Close"]');
                if (closeBtn) { closeBtn.click(); await sleep(500); }
            }
            const tab = document.querySelector('[data-tab="newGame"]') || Array.from(document.querySelectorAll('.tabs-tab')).find(t => /new.*game/i.test(t.textContent || ''));
            if (tab) {
                tab.click(); await sleep(400);
                const startBtn = Array.from(document.querySelectorAll('button')).find(b => /start.*game/i.test((b.textContent || '').trim()));
                if (startBtn) startBtn.click();
            }
        }, 22000);
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

            // Check for speed change
            if (BotState.updateSpeed !== lastUpdateSpeed) {
                lastUpdateSpeed = BotState.updateSpeed;
                // Restart loop to apply new speed if active
                if (this.isActive) this.startTickLoop();
            }

            // Note: premoveEnabled doesn't need a restart, just used in tick()
        }, 200);
    }
}

export const controller = new BotController();
