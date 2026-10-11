import { pageDocument } from './types.js';

export const GAME_CACHE_TTL = 100;

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
let cachedGame: ChessGame | null = null;
let cachedGameTimestamp = 0;

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

/** Select the rendered Chess.com game board, skipping hidden/display-only copies. */
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

export function getGame(): ChessGame | null {
  const now = Date.now();
  if (cachedGame && now - cachedGameTimestamp < GAME_CACHE_TTL) return cachedGame;
  const board = getBoard(pageDocument()) as BoardElement | null;
  cachedGame = board?.game || null;
  cachedGameTimestamp = now;
  return cachedGame;
}

export const getFen = (game: ChessGame | null | undefined): string | null => {
  try {
    return game?.getFEN ? game.getFEN() : null;
  } catch {
    return null;
  }
};

/** Read the clock marked active by Chess.com and normalize it for the shared scheduler. */
export function getRemainingMs(doc: Pick<Document, 'querySelector'>): number | null {
  const text = doc
    .querySelector<HTMLElement>('.clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time')
    ?.textContent?.trim();
  if (!text) return null;

  let seconds: number;
  const minutesAndSeconds = /^(\d+):(\d{2}(?:\.\d+)?)$/.exec(text);
  if (minutesAndSeconds) {
    const minutes = Number(minutesAndSeconds[1]);
    const remainder = Number(minutesAndSeconds[2]);
    if (!Number.isFinite(minutes) || !Number.isFinite(remainder) || remainder >= 60) return null;
    seconds = minutes * 60 + remainder;
  } else if (/^\d+(?:\.\d+)?$/.test(text)) {
    seconds = Number(text);
  } else {
    return null;
  }

  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

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
