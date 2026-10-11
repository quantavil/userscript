import { DEFAULT_SETTINGS, loadSettings } from './settings.js';
import { getActiveSite } from './sites/active.js';
import {
  GAME_CACHE_TTL,
  getBoard,
  getFen as getChesscomFen,
  getPlayerColor as getChesscomPlayerColor,
  getSideToMove as getChesscomSideToMove,
  getGame,
  invalidateGameCache,
  isBoardFlipped as isChesscomBoardFlipped,
  isPlayersTurn as isChesscomPlayersTurn,
} from './sites/chesscom-state.js';
import type { BotState as BotStateInterface, SettingsData } from './types/chess';
import { debounce } from './utils.js';

export { GAME_CACHE_TTL, getBoard, getGame, invalidateGameCache };

function snapshot() {
  try {
    const read = getActiveSite()?.read();
    return read?.kind === 'game' ? read.snapshot : null;
  } catch {
    return null;
  }
}

export function getFen(...args: [] | [game: Parameters<typeof getChesscomFen>[0]]): string | null {
  if (args.length > 0) return getChesscomFen(args[0]);
  return snapshot()?.fen ?? getChesscomFen(getGame());
}

export function getPlayerColor(...args: [] | [game: Parameters<typeof getChesscomPlayerColor>[0]]): string {
  if (args.length > 0) return getChesscomPlayerColor(args[0]);
  return snapshot()?.playerColor ?? getChesscomPlayerColor(getGame());
}

export function getSideToMove(...args: [] | [game: Parameters<typeof getChesscomSideToMove>[0]]): string | null {
  if (args.length > 0) return getChesscomSideToMove(args[0]);
  return snapshot()?.sideToMove ?? getChesscomSideToMove(getGame());
}

export function isPlayersTurn(...args: [] | [game: Parameters<typeof isChesscomPlayersTurn>[0]]): boolean {
  if (args.length > 0) return isChesscomPlayersTurn(args[0]);
  const current = snapshot();
  return current ? current.playerColor === current.sideToMove : isChesscomPlayersTurn(getGame());
}

export function isBoardFlipped(): boolean {
  const current = snapshot();
  return current ? current.orientation === 'black' : isChesscomBoardFlipped();
}

export function pa(): number {
  return getPlayerColor() === 'b' ? 2 : 1;
}

// Encapsulated state (avoid global pollution)
export const BotState: BotStateInterface = {
  hackEnabled: 0,
  botPower: 30, // High depth cap; the move-time budget normally ends search.
  moveTime: 100, // Single search deadline (ms)
  autoMove: 1,
  openingBook: 1,
  openingStyle: 'balanced',
  currentEvaluation: '-',
  bestMove: '-',
  principalVariation: '-',
  statusInfo: 'Ready',
  recoveryAction: null,
  ponderEnabled: 1,
};

// Settings persistence
export const Settings = {
  save: debounce(() => {
    try {
      const menuWrap = document.querySelector('#menuWrap') as HTMLElement | null;
      const settings: SettingsData = {
        hackEnabled: BotState.hackEnabled,
        botPower: BotState.botPower,
        moveTime: BotState.moveTime,
        autoMove: BotState.autoMove,
        openingBook: BotState.openingBook,
        openingStyle: BotState.openingStyle,
        ponderEnabled: BotState.ponderEnabled,
        menuPosition: menuWrap ? { top: menuWrap.style.top, left: menuWrap.style.left } : null,
      };
      localStorage.setItem('gabibot_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, 200),
  load(): SettingsData | null {
    try {
      const saved = localStorage.getItem('gabibot_settings');
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
