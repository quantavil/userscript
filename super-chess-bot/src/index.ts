import { controller } from './controller.js';
import { warmEngine } from './engine/analysis.js';
import { toggleGhostMode } from './panel.js';
import { getSite } from './sites/index.js';
import type { SiteCapabilities } from './sites/types.js';
import { BotState, pa } from './state.js';
import { buildUI, ui } from './ui.js';

function registerMenuCommands(actions: {
  setEnabled: (enabled: boolean) => void;
  refreshSettings: () => void;
  recover: () => void;
}): void {
  const register =
    typeof GM_registerMenuCommand === 'function'
      ? GM_registerMenuCommand
      : typeof (window as unknown as { GM_registerMenuCommand?: typeof GM_registerMenuCommand })
            .GM_registerMenuCommand === 'function'
        ? (window as unknown as { GM_registerMenuCommand?: typeof GM_registerMenuCommand }).GM_registerMenuCommand
        : null;

  if (register) {
    register('♟ Toggle Ghost Mode', () => {
      toggleGhostMode(actions);
    });
    register('♟ Toggle Bot Automation', () => {
      actions.setEnabled(!BotState.hackEnabled);
    });
  }

  const page = window as Window & { __SCB_TOGGLE_GHOST__?: () => boolean };
  page.__SCB_TOGGLE_GHOST__ = () => toggleGhostMode(actions);
}

async function init(): Promise<void> {
  const page = window as Window & { __SCB_ACTIVE__?: boolean };
  if (page.__SCB_ACTIVE__) return;
  page.__SCB_ACTIVE__ = true;
  try {
    BotState.onUpdateDisplay = (playingAs) => ui.updateDisplay(playingAs);
    const site = getSite();
    await waitForDocumentBody();
    const actions = {
      setEnabled: (enabled: boolean) => controller.setEnabled(enabled),
      refreshSettings: () => controller.refreshSettings(),
      recover: () => controller.recover(),
    };
    await buildUI(actions, site?.capabilities as SiteCapabilities | undefined);
    registerMenuCommands(actions);
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
    page.__SCB_ACTIVE__ = false;
    BotState.statusInfo = error instanceof Error ? error.message : 'Initialization failed';
    BotState.recoveryAction = 'retry';
    ui.updateDisplay(1);
  }
}

function waitForDocumentBody(): Promise<void> {
  if (typeof document === 'undefined' || document.body || document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

void init();
