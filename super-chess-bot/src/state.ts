import { DEFAULT_SETTINGS, loadSettings } from './settings.js';
import type { BotState as BotStateInterface, SettingsData } from './types/chess';
import { debounce } from './utils.js';

export {
  GAME_CACHE_TTL,
  getBoard,
  getFen,
  getGame,
  getPlayerColor,
  getSideToMove,
  invalidateGameCache,
  isBoardFlipped,
  isPlayersTurn,
  pa,
} from './sites/chesscom-state.js';

// Encapsulated state (avoid global pollution)
export const BotState: BotStateInterface = {
  hackEnabled: 0,
  botPower: 30, // High depth cap; the move-time budget normally ends search.
  moveTime: 100, // Single search deadline (ms)
  autoMove: 1,
  currentEvaluation: '-',
  bestMove: '-',
  principalVariation: '-',
  statusInfo: 'Ready',
  recoveryAction: null,
  ponderEnabled: 1,
  autoRematch: 0,
  moveMethod: 'click', // 'click' or 'drag'
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
        ponderEnabled: BotState.ponderEnabled,
        autoRematch: BotState.autoRematch,
        moveMethod: BotState.moveMethod,
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
