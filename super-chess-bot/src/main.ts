import { controller } from './app/controller.js';
import { BotState } from './app/state.js';
import { warmEngine } from './engine/service.js';
import { flushSettingsOnUnload } from './settings/storage.js';
import { getSite } from './sites/registry.js';
import { buildUI, ui } from './ui/mount.js';
import { registerMenuCommands } from './userscript/menu.js';

let scbActive = false;

export function resetActiveStateForTesting(): void {
  scbActive = false;
}

async function init(): Promise<void> {
  if (scbActive) return;
  scbActive = true;
  try {
    BotState.onUpdateDisplay = () => ui.updateDisplay();
    const site = getSite();
    await waitForDocumentBody();
    const actions = {
      setEnabled: (enabled: boolean) => controller.setEnabled(enabled),
      refreshSettings: () => controller.refreshSettings(),
      recover: () => controller.recover(),
      generateReport: () => {
        void controller.generateReport();
      },
      cancelReport: () => controller.cancelReport(),
    };
    await buildUI(actions);
    flushSettingsOnUnload();
    registerMenuCommands(actions);
    controller.init();
    // The unsupported-site status must be settled before any async work starts, or a later
    // warmup resolution would overwrite it and the panel would claim to be ready.
    if (!site) {
      BotState.statusInfo = 'Unsupported site';
      ui.updateDisplay();
      return;
    }
    if (!BotState.hackEnabled) {
      BotState.statusInfo = 'Preparing Stockfish...';
      ui.updateDisplay();
    }
    // Pay the WASM download and compilation cost before the game clock starts.
    void warmEngine().then(
      () => {
        if (BotState.hackEnabled) return;
        BotState.statusInfo = 'Ready';
        ui.updateDisplay();
      },
      (error: unknown) => {
        if (BotState.hackEnabled) return;
        BotState.statusInfo =
          error instanceof Error ? `Stockfish warmup failed: ${error.message}` : 'Stockfish warmup failed';
        ui.updateDisplay();
      },
    );
  } catch (error) {
    scbActive = false;
    BotState.statusInfo = error instanceof Error ? error.message : 'Initialization failed';
    BotState.recoveryAction = 'retry';
    ui.updateDisplay();
  }
}

function waitForDocumentBody(): Promise<void> {
  if (typeof document === 'undefined' || document.body || document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

void init();
