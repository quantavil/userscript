
import { BotState, pa } from './state.js';
import { waitForElement } from './utils.js';
import { attachToBoard, startDomBoardWatcher } from './board.js';
import { ui, buildUI } from './ui.js';
import { controller } from './controller.js';

(async function () {
    'use strict';

    // Single-instance guard
    if (window.__GABIBOT_RUNNING__) {
        console.log('GabiBot: Already running, skipping init.');
        return;
    }
    window.__GABIBOT_RUNNING__ = true;

    console.log('GabiBot: Script loaded, waiting for board...');

    // Main init
    async function init() {
        try {
            // Wire up UI updates from deep logic
            BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);

            const board = await waitForElement('.board, chess-board, .board-layout-vertical, .board-layout-horizontal').catch(() => null);
            await buildUI();

            // Attach board logic
            const boardEl = board || document.querySelector('chess-board') || document.querySelector('.board') || document.querySelector('[class*="board"]');
            attachToBoard(boardEl);

            // Start the centralized controller
            controller.init();

            console.log('GabiBot: Initialized.');
        } catch (error) {
            console.error('GabiBot Error:', error);
            alert('GabiBot: Could not find chess board. Please refresh or check console.');
        }
    }

    // Kick off
    setTimeout(init, 3000);

})();
