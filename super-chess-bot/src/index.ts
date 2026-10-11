import { attachToBoard } from './board.js';
import { controller } from './controller.js';
import { warmEngine } from './engine/analysis.js';
import { BotState, getBoard, pa } from './state.js';
import { buildUI, ui } from './ui.js';
import { waitForElement } from './utils.js';

async function init(): Promise<void> {
  const page = window as Window & { __GABIBOT_RUNNING__?: boolean };
  if (page.__GABIBOT_RUNNING__) return;
  page.__GABIBOT_RUNNING__ = true;
  try {
    BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);
    await buildUI({
      setEnabled: (enabled) => controller.setEnabled(enabled),
      refreshSettings: () => controller.refreshSettings(),
      recover: () => controller.recover(),
    });
    if (!BotState.hackEnabled) {
      BotState.statusInfo = 'Preparing Stockfish...';
      ui.updateDisplay(pa());
    }
    // Pay the WASM download and compilation cost before the game clock starts.
    void warmEngine().then(
      () => {
        if (BotState.hackEnabled) return;
        BotState.statusInfo = 'Ready';
        ui.updateDisplay(pa());
      },
      (error: unknown) => {
        if (BotState.hackEnabled) return;
        BotState.statusInfo =
          error instanceof Error ? `Stockfish warmup failed: ${error.message}` : 'Stockfish warmup failed';
        ui.updateDisplay(pa());
      },
    );
    await waitForElement('wc-chess-board, chess-board, .board');
    const board = getBoard();
    if (board) attachToBoard(board);
    controller.init();
  } catch (error) {
    page.__GABIBOT_RUNNING__ = false;
    BotState.statusInfo = error instanceof Error ? error.message : 'Initialization failed';
    BotState.recoveryAction = 'retry';
    ui.updateDisplay(1);
  }
}
void init();
