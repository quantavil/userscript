import { BotState } from './state.js';
import { waitForElement } from './utils.js';
import { attachToBoard } from './board.js';
import { ui, buildUI } from './ui.js';
import { controller } from './controller.js';

(async function () {
    'use strict';

    // Single-instance guard
    if ((window as any).__GABIBOT_RUNNING__) {
        return;
    }
    (window as any).__GABIBOT_RUNNING__ = true;

    // Main init
    async function init() {
        try {
            // Wire up UI updates from deep logic
            BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);

            const board = await waitForElement('.board, chess-board, .board-layout-vertical, .board-layout-horizontal').catch(() => null);
            await buildUI();

            // Attach board logic
            const boardEl = board || document.querySelector('chess-board') || document.querySelector('.board') || document.querySelector('[class*="board"]');
            attachToBoard(boardEl as HTMLElement | null);

            // Start the centralized controller
            controller.init();
        } catch (error) {
            console.error('GabiBot Error:', error);
            alert('GabiBot: Could not find chess board. Please refresh or check console.');
        }
    }

    // Kick off
    setTimeout(init, 3000);

})();
