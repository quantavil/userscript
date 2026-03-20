
import { BotState, PositionCache, getGame, getFen, isPlayersTurn, pa, invalidateGameCache, Settings } from './state.js';
import { sleep } from './utils.js';
import { clearArrows, cancelPendingMove, startDomBoardWatcher, startMoveWatcher, stopMoveWatcher, onBoardMutation } from './board.js';
import { ui } from './ui.js';
import { scheduleAnalysis, getLastFenProcessedMain, getLastFenProcessedPremove, setLastFenProcessedPremove, setLastFenProcessedMain } from './engine/scheduler.js';
import { resetEngine } from './engine/analysis.js';

class BotController {
    constructor() {
        this.isActive = false;
        this.tickTimer = null;
        this.checkInterval = null;

        // Loop state
        this.lastFenSeen = '';

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

            // Redundancy interval — main triggers come from board mutation observer
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
            // Log opponent's move when position changes to our turn
            if (this.lastFenSeen && isPlayersTurn(game)) {
                ui.log('♟ Opponent moved', 'info');
            }
            this.lastFenSeen = fen;
            cancelPendingMove();
            clearArrows();
        }

        // 4. Analysis Logic
        if (isPlayersTurn(game)) {
            // Schedule main analysis if this position hasn't been processed yet
            if (getLastFenProcessedMain() !== fen) {
                scheduleAnalysis('main', fen, () => this.tick());
            }
            // If already processed, just wait — the position will change
            // when it's the opponent's turn or a new game starts.
        } else {
            // Ponder / Premove logic
            // Always ponder during opponent's turn to keep TT hot
            if (getLastFenProcessedPremove() !== fen) {
                scheduleAnalysis('premove', fen);
            } else {
                this.setStatus(BotState.premoveEnabled ? 'Waiting for opponent...' : 'Pondering...');
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

    // checkFailsafe was removed — it was the root cause of the infinite
    // fail→reset→fail loop. When a move fails, the bot now simply waits
    // for the board position to change (opponent move / new game).
    // See tests/failsafe-loop.test.js for the proof.

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

            // Clear terminal for fresh game logs
            ui.clearConsole();

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
                { name: 'Accept', sel: 'button[data-cy="game-over-modal-rematch-button"], .game-over-buttons-button', text: 'Accept' },
                { name: 'Rematch', sel: '[data-cy="sidebar-game-over-rematch-button"]' },
                { name: 'New 1 Min Modal', sel: '[data-cy="game-over-modal-new-game-button"]' },
                { name: 'New 1 Min', sel: '[data-cy="sidebar-game-over-new-game-button"]' },
                { name: 'Arena Next', sel: '[data-cy="next-arena-game-button"]' },
                { name: 'Arena Request', sel: '[data-cy="request-arena-game"]' }
            ];

            for (const action of actions) {
                const btns = document.querySelectorAll(action.sel);
                for (const btn of btns) {
                    if (btn && btn.offsetParent !== null) {
                        if (action.text && !btn.textContent.toLowerCase().includes(action.text.toLowerCase())) {
                            continue;
                        }
                        console.log(`GabiBot: Clicking ${action.name}`);
                        btn.click();
                        return;
                    }
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
