import { BotState, PositionCache, getGame, getFen, isPlayersTurn, pa, invalidateGameCache, Settings, getPlayerColor } from './state.js';
import { sleep } from './utils.js';
import { clearArrows, cancelPendingMove, startDomBoardWatcher, startMoveWatcher, stopMoveWatcher, onBoardMutation } from './board.js';
import { ui } from './ui.js';
import { scheduleAnalysis, getLastFenProcessedMain, getLastFenProcessedPremove, setLastFenProcessedPremove, setLastFenProcessedMain } from './engine/scheduler.js';
import { resetEngine } from './engine/analysis.js';
import { formatMove } from './engine/san.js';

class BotController {
    isActive: boolean;
    tickTimer: ReturnType<typeof setTimeout> | null;
    checkInterval: ReturnType<typeof setInterval> | null;

    // Loop state
    lastFenSeen: string;
    lastOpponentMove: string | null;
    gameStarted: boolean;

    // Game end state
    gameEndDetected: boolean;

    // Observer cleanup
    mutationCleanup: (() => boolean) | null;

    constructor() {
        this.isActive = false;
        this.tickTimer = null;
        this.checkInterval = null;

        // Loop state
        this.lastFenSeen = '';
        this.lastOpponentMove = null;
        this.gameStarted = false;

        // Game end state
        this.gameEndDetected = false;

        // Observer cleanup
        this.mutationCleanup = null;
    }

    init(): void {
        // Start minimal watchers (settings, DOM)
        this.startSettingsWatcher();
        startDomBoardWatcher();

        // Initial state check
        if (BotState.hackEnabled) {
            this.start();
        }
    }

    start(): void {
        if (this.isActive) return;
        this.isActive = true;

        BotState.statusInfo = 'Ready';
        ui.updateDisplay(pa());

        this.startTickLoop();
        this.startGameCheckLoop();
    }

    stop(): void {
        if (!this.isActive) return;
        this.isActive = false;

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

    toggle(): void {
        if (this.isActive) this.stop();
        else this.start();
    }

    // --- Main Logic Loop ---

    startTickLoop(): void {
        this.stopTickLoop();

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

            // Redundancy interval
            this.tickTimer = setTimeout(loop, 1000);
        };

        loop();
    }

    stopTickLoop(): void {
        if (this.tickTimer) clearTimeout(this.tickTimer);
        this.tickTimer = null;

        stopMoveWatcher();
        if (this.mutationCleanup) {
            this.mutationCleanup();
            this.mutationCleanup = null;
        }
    }

    tick(): void {
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
            if (!this.gameStarted) {
                this.gameStarted = true;
                const playerColor = getPlayerColor(game);
                const color = playerColor === 'w' ? 'White' : 'Black';
                ui.log(`Bot is playing ${color}`, 'status');
            }

            // Log opponent's move when position changes to our turn
            if (this.lastFenSeen && isPlayersTurn(game)) {
                const oppMove = this.extractLastMove(this.lastFenSeen, fen);
                if (oppMove) {
                    ui.log(formatMove(this.lastFenSeen, oppMove), 'opponent');
                } else {
                    ui.log('...', 'opponent');
                }
            }
            this.lastFenSeen = fen;
            cancelPendingMove();
            clearArrows();
        }

        // 4. Analysis Logic
        if (isPlayersTurn(game)) {
            if (getLastFenProcessedMain() !== fen) {
                scheduleAnalysis('main', fen, () => this.tick());
            }
        } else {
            if (getLastFenProcessedPremove() !== fen) {
                scheduleAnalysis('premove', fen);
            } else {
                this.setStatus(BotState.premoveEnabled ? 'Waiting for opponent...' : 'Pondering...');
            }
        }
    }

    handleInternalGameOver(): void {
        if (BotState.statusInfo !== 'Game finished') {
            BotState.currentEvaluation = 'GAME OVER';
            BotState.bestMove = '-';
            BotState.principalVariation = 'Game ended';
            BotState.statusInfo = 'Game finished';
            clearArrows();
            ui.updateDisplay(pa());
        }
    }

    setStatus(msg: string): void {
        if (BotState.statusInfo !== msg) {
            BotState.statusInfo = msg;
            ui.updateDisplay(pa());
        }
    }

    /**
     * Extract the last move from FEN change (opponent's move)
     * Returns UCI notation
     */
    extractLastMove(prevFen: string, newFen: string): string | null {
        try {
            const game = getGame();
            if (game) {
                const parseMove = (m: any): string | null => {
                    if (!m) return null;
                    if (typeof m === 'string') return m;
                    if (typeof m === 'object') {
                        if (typeof m.uci === 'string') return m.uci;
                        if (typeof m.from === 'string' && typeof m.to === 'string') {
                            return m.from + m.to + (m.promo || m.promotion || '');
                        }
                    }
                    return null;
                };

                if (game.getLastMove) {
                    const lastMove = game.getLastMove();
                    const uci = parseMove(lastMove);
                    if (uci) return uci;
                }
                if (game.getMoveHistory) {
                    const history = game.getMoveHistory();
                    if (history && history.length > 0) {
                        const last = history[history.length - 1];
                        const uci = parseMove(last?.move || last);
                        if (uci) return uci;
                    }
                }
            }

            return null;
        } catch {
            return null;
        }
    }

    // --- Game Check Loop ---

    startGameCheckLoop(): void {
        this.stopGameCheckLoop();
        this.checkInterval = setInterval(() => this.checkGameState(), 1000);
    }

    stopGameCheckLoop(): void {
        if (this.checkInterval) clearInterval(this.checkInterval);
        this.checkInterval = null;
    }

    checkGameState(): void {
        const gameOverModal = document.querySelector('.game-over-modal-content');

        if (gameOverModal && !this.gameEndDetected) {
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

        if (!gameOverModal && this.gameEndDetected) {
            this.gameEndDetected = false;
            this.gameStarted = false;

            setLastFenProcessedMain('');
            setLastFenProcessedPremove('');
            this.lastFenSeen = '';
            this.lastOpponentMove = null;

            resetEngine();
            ui.clearConsole();

            const playerColor = getPlayerColor(getGame());
            const color = playerColor === 'w' ? 'White' : 'Black';
            ui.log(`Bot is playing ${color}`, 'status');

            BotState.statusInfo = 'Ready';
            ui.updateDisplay(pa());

            setTimeout(() => this.tick(), 500);
        }
    }

    handleAutoRematch(): void {
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
                for (const btn of btns as any) {
                    if (btn && btn.offsetParent !== null) {
                        if (action.text && !btn.textContent.toLowerCase().includes(action.text.toLowerCase())) {
                            continue;
                        }
                        btn.click();
                        return;
                    }
                }
            }
        }, 1500);
    }

    // --- Settings / State Watcher ---

    startSettingsWatcher(): void {
        let lastHackEnabled = BotState.hackEnabled;

        setInterval(() => {
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
