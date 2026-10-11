import { GAME_CACHE_TTL } from './config.js';
import { DEFAULT_SETTINGS, loadSettings } from './settings.js';
import type { BotState as BotStateInterface, SettingsData } from './types/chess';
import { debounce } from './utils.js';

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

interface ChessGame {
  getFEN?: () => string;
  getPlayingAs?: () => number;
  isGameOver?: () => boolean;
  getHistoryFENs?: () => unknown;
  getHistorySANs?: () => unknown;
  on?: (event: string, listener: () => void) => void;
  off?: (event: string, listener: () => void) => void;
}

interface BoardElement extends HTMLElement {
  game?: ChessGame | null;
}

const BOARD_SELECTOR = 'wc-chess-board, chess-board, .board';

function pageDocument(): Document {
  return typeof unsafeWindow === 'undefined' ? document : unsafeWindow.document;
}

function hasGameApi(board: BoardElement): boolean {
  return typeof board.game?.getFEN === 'function';
}

function isVisibleBoard(board: HTMLElement): boolean {
  try {
    const view = board.ownerDocument?.defaultView;
    const style =
      view?.getComputedStyle(board) ?? (typeof getComputedStyle === 'function' ? getComputedStyle(board) : null);
    if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') return false;
    if (typeof board.getClientRects === 'function' && board.getClientRects().length === 0) return false;
    const rect = board.getBoundingClientRect?.();
    return !rect || (rect.width > 0 && rect.height > 0);
  } catch {
    return false;
  }
}

function boardArea(board: HTMLElement): number {
  const rect = board.getBoundingClientRect?.();
  return rect ? rect.width * rect.height : 0;
}

// Game helpers & Cache
let cachedGame: ChessGame | null = null;
let cachedGameTimestamp = 0;

/** Select the rendered game board, skipping hidden boards and display-only copies. */
export function getBoard(doc = pageDocument()): HTMLElement | null {
  const candidates =
    typeof doc.querySelectorAll === 'function'
      ? Array.from(doc.querySelectorAll<HTMLElement>(BOARD_SELECTOR))
      : [doc.querySelector<HTMLElement>(BOARD_SELECTOR)].filter((board): board is HTMLElement => !!board);
  const visible = candidates.filter(isVisibleBoard);
  visible.sort(
    (a, b) =>
      Number(hasGameApi(b as BoardElement)) - Number(hasGameApi(a as BoardElement)) || boardArea(b) - boardArea(a),
  );
  return visible[0] ?? null;
}

export const getGame = (): ChessGame | null => {
  const now = Date.now();
  if (cachedGame && now - cachedGameTimestamp < GAME_CACHE_TTL) {
    return cachedGame;
  }
  const board = getBoard(pageDocument()) as BoardElement | null;
  cachedGame = board?.game || null;
  cachedGameTimestamp = now;
  return cachedGame;
};

export const getFen = (game: ChessGame | null | undefined): string | null => {
  try {
    return game?.getFEN ? game.getFEN() : null;
  } catch {
    return null;
  }
};
export const getPlayerColor = (game: ChessGame | null | undefined): string => {
  try {
    return game?.getPlayingAs?.() === 2 ? 'b' : 'w';
  } catch {
    return 'w';
  }
};
export const getSideToMove = (game: ChessGame | null | undefined): string | null => {
  const fen = getFen(game);
  return fen ? fen.split(' ')[1] || null : null;
};
export const isPlayersTurn = (game: ChessGame | null | undefined): boolean => {
  const me = getPlayerColor(game);
  const sideToMove = getSideToMove(game);
  return me === sideToMove;
};
export const pa = (): number => getGame()?.getPlayingAs?.() ?? 1;

export function isBoardFlipped(): boolean {
  const el = getBoard();
  let flipped = false;

  try {
    const attr = el?.getAttribute?.('orientation');
    if (attr === 'black') flipped = true;
    else if (attr === 'white') flipped = false;
    else if (el?.classList?.contains('flipped')) flipped = true;
    else if (getGame()?.getPlayingAs?.() === 2) flipped = true;
  } catch {}

  return flipped;
}

export function invalidateGameCache(): void {
  cachedGame = null;
  cachedGameTimestamp = 0;
}
