import { DEFAULT_SETTINGS, loadSettings } from './settings.js';
import { getActiveSite } from './sites/active.js';
import type { BotState as BotStateInterface, SettingsData } from './types/chess';
import { debounce } from './utils.js';

function snapshot() {
  try {
    const read = getActiveSite()?.read();
    return read?.kind === 'game' ? read.snapshot : null;
  } catch {
    return null;
  }
}

export function getFen(): string | null {
  return snapshot()?.fen ?? null;
}

export function getPlayerColor(): string | null {
  return snapshot()?.playerColor ?? null;
}

export function getSideToMove(): string | null {
  return snapshot()?.sideToMove ?? null;
}

export function isPlayersTurn(): boolean {
  const current = snapshot();
  return current ? current.playerColor === current.sideToMove : false;
}

export function isBoardFlipped(): boolean {
  return snapshot()?.orientation === 'black';
}

export function pa(): number {
  return getPlayerColor() === 'b' ? 2 : 1;
}

let menuPositionGetter: (() => { top: string; left: string } | null) | null = null;

export function setMenuPositionGetter(getter: () => { top: string; left: string } | null): void {
  menuPositionGetter = getter;
}

// Encapsulated state (avoid global pollution)
export const BotState: BotStateInterface = {
  hackEnabled: 0,
  botPower: 30, // High depth cap; the move-time budget normally ends search.
  moveTime: 100, // Single search deadline (ms)
  timingMode: 'dynamic',
  autoMove: 1,
  openingBook: 1,
  openingStyle: 'balanced',
  currentEvaluation: '-',
  bestMove: '-',
  principalVariation: '-',
  statusInfo: 'Ready',
  recoveryAction: null,
  ponderEnabled: 1,
  targetElo: 0,
  blunderShield: 1,
  ghostMode: 0,
  autoRetry: 1,
  multiPvLines: undefined,
  evalHistory: [],
};

// Settings persistence
export const Settings = {
  save: debounce(() => {
    try {
      const position = menuPositionGetter?.() ?? null;
      const settings: SettingsData = {
        hackEnabled: 0,
        botPower: BotState.botPower,
        moveTime: BotState.moveTime,
        timingMode: BotState.timingMode,
        autoMove: BotState.autoMove,
        openingBook: BotState.openingBook,
        openingStyle: BotState.openingStyle,
        ponderEnabled: BotState.ponderEnabled,
        targetElo: BotState.targetElo,
        blunderShield: BotState.blunderShield,
        ghostMode: BotState.ghostMode,
        autoRetry: BotState.autoRetry,
        menuPosition: position,
      };
      localStorage.setItem('scb_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, 200),
  load(): SettingsData | null {
    try {
      const saved = localStorage.getItem('scb_settings');
      if (!saved) {
        BotState.hackEnabled = 0;
        return null;
      }
      const settings = loadSettings(saved);
      Object.assign(BotState, settings, { hackEnabled: 0 });
      return settings;
    } catch {
      Object.assign(BotState, DEFAULT_SETTINGS, { hackEnabled: 0 });
      return { ...DEFAULT_SETTINGS };
    }
  },
};
