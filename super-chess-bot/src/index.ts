import { controller } from './controller.js';
import { warmEngine } from './engine/analysis.js';
import { getSite } from './sites/index.js';
import type { SiteCapabilities } from './sites/types.js';
import { BotState, pa } from './state.js';
import { buildUI, ui } from './ui.js';

async function init(): Promise<void> {
  const page = window as Window & { __GABIBOT_RUNNING__?: boolean };
  if (page.__GABIBOT_RUNNING__) return;
  page.__GABIBOT_RUNNING__ = true;
  try {
    BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);
    const site = getSite();
    const actions = {
      setEnabled: (enabled: boolean) => controller.setEnabled(enabled),
      refreshSettings: () => controller.refreshSettings(),
      recover: () => controller.recover(),
    };
    await buildUI(actions, site?.capabilities as SiteCapabilities | undefined);
    controller.init();
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
    if (!site) {
      BotState.statusInfo = 'Unsupported site';
      ui.updateDisplay(pa());
      return;
    }
  } catch (error) {
    page.__GABIBOT_RUNNING__ = false;
    BotState.statusInfo = error instanceof Error ? error.message : 'Initialization failed';
    BotState.recoveryAction = 'retry';
    ui.updateDisplay(1);
  }
}
void init();
