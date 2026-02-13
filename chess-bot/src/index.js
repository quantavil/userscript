
import { BotState, PositionCache, getGame, getFen, getPlayerColor, isPlayersTurn, pa, invalidateGameCache } from './state.js';
import { qs, qsa, waitForElement, debounce, sleep } from './utils.js';
import { attachToBoard, startDomBoardWatcher, clearArrows, cancelPendingMove, detachFromBoard } from './board.js';
import { ui, buildUI } from './ui.js';
import { scheduleAnalysis, getLastFenProcessedMain, setLastFenProcessedMain, getLastFenProcessedPremove, setLastFenProcessedPremove, getLastPremoveFen, setLastPremoveFen, getLastPremoveUci, setLastPremoveUci } from './engine.js';

(async function () {
    'use strict';

    // Single-instance guard
    if (window.__GABIBOT_RUNNING__) {
        console.log('GabiBot: Already running, skipping init.');
        return;
    }
    window.__GABIBOT_RUNNING__ = true;

    console.log('GabiBot: Script loaded, waiting for board...');

    // Global loop state
    let tickTimer = null;
    let gameStartInterval = null;
    let gameEndInterval = null;
    let lastFenSeen = '';

    // Main init
    async function init() {
        try {
            // Wire up UI updates from deep logic
            BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);

            const board = await waitForElement('.board, chess-board, .board-layout-vertical, .board-layout-horizontal').catch(() => null);
            await buildUI();
            attachToBoard(board || qs('chess-board') || qs('.board') || qs('[class*="board"]'));
            startDomBoardWatcher();
            startAutoWatchers();

            // Start loop watcher
            startStateWatcher();

            console.log('GabiBot: Initialized.');
        } catch (error) {
            console.error('GabiBot Error:', error);
            alert('GabiBot: Could not find chess board. Please refresh or check console.');
        }
    }

    // Tick loop logic
    function tick() {
        if (!BotState.hackEnabled) return;

        const game = getGame();
        if (!game) return;

        if (game.isGameOver && game.isGameOver()) {
            BotState.currentEvaluation = 'GAME OVER';
            BotState.bestMove = '-';
            BotState.principalVariation = 'Game ended';
            BotState.statusInfo = 'Game finished';
            clearArrows();
            ui.updateDisplay(pa());
            return;
        }

        const fen = getFen(game);
        if (!fen) return;

        if (fen !== lastFenSeen) {
            lastFenSeen = fen;
            cancelPendingMove();
            clearArrows();
            setLastPremoveFen('');
            setLastPremoveUci('');
        }

        if (isPlayersTurn(game)) {
            if (getLastFenProcessedMain() !== fen) {
                scheduleAnalysis('main', fen, () => tick()); // Pass tick as callback
            }
        } else {
            if (BotState.premoveEnabled) {
                if (getLastFenProcessedPremove() !== fen) {
                    scheduleAnalysis('premove', fen);
                } else {
                    // Update Premove chance display if needed
                    const chanceEl = qs('[name="premoveChance"] .itemState');
                    if (chanceEl && BotState.currentPremoveChance !== undefined) {
                        chanceEl.textContent = `${Math.round(BotState.currentPremoveChance)}%`;
                    }

                    BotState.statusInfo = (getLastPremoveUci() && getLastPremoveFen() === fen) ? 'Waiting (premove ready)...' : 'Waiting for opponent...';
                    ui.updateDisplay(pa());
                }
            } else {
                const chanceEl = qs('[name="premoveChance"] .itemState');
                if (chanceEl) chanceEl.textContent = '0%';

                BotState.statusInfo = 'Waiting for opponent...';
                ui.updateDisplay(pa());
            }
        }
    }

    function startTickLoop() {
        stopTickLoop();
        const interval = Math.max(150, 1100 - (Number(BotState.updateSpeed) || 8) * 100);

        const scheduleNext = () => {
            tickTimer = setTimeout(() => {
                tick();
                if (BotState.hackEnabled) scheduleNext();
            }, interval);
        };

        tick(); // Immediate first tick
        scheduleNext();
    }

    function stopTickLoop() {
        if (tickTimer) clearTimeout(tickTimer);
        tickTimer = null;
    }

    // React to enable/disable or speed changes
    function startStateWatcher() {
        let lastHackEnabled = BotState.hackEnabled;
        let lastUpdateSpeed = BotState.updateSpeed;
        let lastPremoveEnabled = BotState.premoveEnabled;

        setInterval(() => {
            if (BotState.hackEnabled !== lastHackEnabled) {
                lastHackEnabled = BotState.hackEnabled;
                if (BotState.hackEnabled) {
                    BotState.statusInfo = 'Ready';
                    ui.updateDisplay(pa());
                    startTickLoop();
                } else {
                    stopTickLoop();
                    // Clear cache
                    PositionCache.clear();
                    clearArrows();
                    cancelPendingMove();
                    BotState.statusInfo = 'Bot disabled';
                    BotState.currentEvaluation = '-';
                    BotState.bestMove = '-';
                    ui.updateDisplay(pa());
                }
                ui.Settings.save();
            }
            if (BotState.updateSpeed !== lastUpdateSpeed) {
                lastUpdateSpeed = BotState.updateSpeed;
                if (BotState.hackEnabled) startTickLoop();
            }
            if (BotState.premoveEnabled !== lastPremoveEnabled) {
                lastPremoveEnabled = BotState.premoveEnabled;
                if (BotState.hackEnabled) startTickLoop();
            }
        }, 200);

        // Initial check
        if (BotState.hackEnabled) startTickLoop();
    }

    function startAutoWatchers() {
        if (gameStartInterval) clearInterval(gameStartInterval);
        if (gameEndInterval) clearInterval(gameEndInterval);

        let gameEndDetected = false;

        gameEndInterval = setInterval(() => {
            const gameOverModal = qs('.game-over-modal-content');

            if (gameOverModal && !gameEndDetected) {
                console.log('GabiBot: Game over detected');

                clearArrows();
                cancelPendingMove();

                BotState.statusInfo = 'Game ended, preparing new game...';
                BotState.currentEvaluation = '-';
                BotState.bestMove = '-';
                ui?.updateDisplay(pa());

                gameEndDetected = true;

                if (BotState.autoRematch) {
                    console.log('GabiBot: Auto-rematch enabled');
                    setTimeout(() => {
                        const modal = qs('.game-over-modal-content');
                        if (!modal) return console.log('GabiBot: [2s] Modal closed');

                        const btn = qsa('button', modal).find(b =>
                            /rematch/i.test((b.textContent || '').trim()) ||
                            /rematch/i.test((b.getAttribute?.('aria-label') || '').trim())
                        );

                        if (btn) btn.click();
                    }, 2000);

                    setTimeout(() => {
                        const modal = qs('.game-over-modal-content');
                        if (!modal) return;
                        const btn = qsa('button', modal).find(b => /new.*\d+.*min/i.test(b.textContent || ''));
                        if (btn) btn.click();
                    }, 12000);

                    setTimeout(async () => {
                        const modal = qs('.game-over-modal-content');
                        if (!modal) return;
                        const closeBtn = qs('[aria-label="Close"]', modal);
                        if (closeBtn) { closeBtn.click(); await sleep(500); }

                        const tab = qs('[data-tab="newGame"]') ||
                            qsa('.tabs-tab').find(t => /new.*game/i.test(t.textContent || ''));

                        if (tab) {
                            tab.click(); await sleep(400);
                            const startBtn = qsa('button').find(b => /start.*game/i.test((b.textContent || '').trim()));
                            if (startBtn) startBtn.click();
                        }
                    }, 22000);
                }
            }

            if (!gameOverModal && gameEndDetected) {
                console.log('GabiBot: New game started, bot analyzing...');
                gameEndDetected = false;

                // Reset FEN tracking so first move of new game is always analyzed
                setLastFenProcessedMain('');
                setLastFenProcessedPremove('');
                setLastPremoveFen('');
                setLastPremoveUci('');
                lastFenSeen = '';

                if (BotState.hackEnabled) {
                    BotState.statusInfo = 'Ready';
                    ui?.updateDisplay(pa());
                    setTimeout(() => {
                        if (BotState.hackEnabled) tick();
                    }, 500);
                }
            }
        }, 1000);
    }

    // Kick off
    setTimeout(init, 3000);

})();
