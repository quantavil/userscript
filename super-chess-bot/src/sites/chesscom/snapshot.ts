import { isVisibleBoard } from '../common.js';
import { pageDocument } from '../types.js';
import { getCapturedChesscomController } from './bridge.js';

const GAME_CACHE_TTL = 100;

/** Internal Chess.com game controller surface used by the adapter. */
export interface ChessGame {
  id?: string | number;
  getFEN?: () => string;
  getPlayingAs?: () => number;
  getTurn?: () => number;
  getOptions?: () => { flipped?: boolean; isWhiteOnBottom?: boolean; id?: string; [key: string]: unknown };
  getState?: () => string;
  isAnimating?: () => boolean;
  isGameOver?: () => boolean;
  getResult?: () => unknown;
  isLegalMove?: (...args: unknown[]) => boolean;
  move?: (...args: unknown[]) => { type?: string; data?: unknown; [key: string]: unknown };
  getHistoryFENs?: () => unknown;
  getHistorySANs?: () => unknown;
  getFingerprints?: () => { startingFen?: unknown; [key: string]: unknown };
  getRenderer?: () => {
    closePromotionWindow?: () => void;
    openPromotionWindow?: (...args: unknown[]) => unknown;
    [key: string]: unknown;
  } | null;
  on?: (event: string, listener: () => void) => void;
  off?: (event: string, listener: () => void) => void;
}

interface BoardElement extends HTMLElement {
  game?: ChessGame | null;
}

/** State reported while a promotion chooser is open. Note the site's spelling. */
const PROMOTION_CHOOSER_STATE = 'PomotionAreaShowing';

const BOARD_SELECTOR = 'wc-chess-board, chess-board, .board';
let cachedGame: ChessGame | null = null;
let cachedGameTimestamp = 0;

function hasGameApi(board: BoardElement): boolean {
  return typeof board.game?.getFEN === 'function';
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

/** Prefer the captured board controller; fall back to the live board binding. */
export function getGame(): ChessGame | null {
  const captured = getCapturedChesscomController<ChessGame>();
  if (captured && typeof captured.getFEN === 'function') return captured;
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

/**
 * Read the game root position from the controller fingerprints.
 *
 * `getHistoryFENS()` is not a ply history: it holds only the current position, so it can
 * never supply index zero. The fingerprints object is the only source that carries the true
 * starting position, including for from-position games.
 */
export function getStartingFen(game: ChessGame | null | undefined): string | null {
  try {
    const starting = game?.getFingerprints?.()?.startingFen;
    return typeof starting === 'string' && starting.trim() ? starting : null;
  } catch {
    return null;
  }
}

export const CLOCK_SELECTOR =
  '.clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time, .clock-player-turn .move-time-content, .clock-player-turn.move-time-content';

const WHITE_CLOCK_SELECTOR =
  '.clock-white .clock-time-monospace, .clock-white .clock-time, .clock-white .move-time-content, .clock-white.move-time-content';

const BLACK_CLOCK_SELECTOR =
  '.clock-black .clock-time-monospace, .clock-black .clock-time, .clock-black .move-time-content, .clock-black.move-time-content';

export function parseClockText(text: string | null | undefined): number | null {
  if (!text) return null;
  const trimmed = text.trim();
  let seconds: number;
  const hms = /^(?:(\d+):)?(\d+):(\d{2}(?:\.\d+)?)$/.exec(trimmed);
  if (hms) {
    const hours = hms[1] ? Number(hms[1]) : 0;
    const minutes = Number(hms[2]);
    const remainder = Number(hms[3]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(remainder)) return null;
    if (hms[1] && minutes >= 60) return null;
    if (remainder >= 60) return null;
    seconds = hours * 3600 + minutes * 60 + remainder;
  } else if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    seconds = Number(trimmed);
  } else {
    return null;
  }
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

/** Read the clock marked active by Chess.com and normalize it for the shared scheduler. */
export function getRemainingMs(doc: Pick<Document, 'querySelector'>): number | null {
  const text = doc.querySelector<HTMLElement>(CLOCK_SELECTOR)?.textContent?.trim();
  return parseClockText(text);
}

/** Read the clock for a specific player color on Chess.com. */
export function getColorRemainingMs(doc: Pick<Document, 'querySelector'>, color: 'w' | 'b'): number | null {
  const selector = color === 'w' ? WHITE_CLOCK_SELECTOR : BLACK_CLOCK_SELECTOR;
  const text = doc.querySelector<HTMLElement>(selector)?.textContent?.trim();
  return parseClockText(text);
}

export const getSideToMove = (game: ChessGame | null | undefined): string | null => {
  try {
    const turn = game?.getTurn?.();
    if (turn === 1) return 'w';
    if (turn === 2) return 'b';
  } catch {
    // A missing turn API falls back to the position.
  }
  const fen = getFen(game);
  return fen ? fen.split(' ')[1] || null : null;
};

export const getOrientation = (game: ChessGame | null | undefined): 'white' | 'black' => {
  try {
    const options = game?.getOptions?.();
    if (options) {
      if (typeof options.flipped === 'boolean') return options.flipped ? 'black' : 'white';
      if (typeof options.isWhiteOnBottom === 'boolean') return options.isWhiteOnBottom ? 'white' : 'black';
    }
  } catch {
    // A missing options API falls back to the player color.
  }
  try {
    return game?.getPlayingAs?.() === 2 ? 'black' : 'white';
  } catch {
    return 'white';
  }
};

export function isBoardFlipped(): boolean {
  return getOrientation(getGame()) === 'black';
}

/** Validate a candidate move through the controller before submission. */
export function isLegalChesscomMove(
  game: ChessGame | null | undefined,
  from: string,
  to: string,
  promotion?: string,
): boolean {
  try {
    const checker = game?.isLegalMove;
    if (typeof checker !== 'function') return false;
    return checker.call(game, { from, to, ...(promotion ? { promotion } : {}) }) === true;
  } catch {
    return false;
  }
}

/** Close a stuck promotion chooser so the controller returns to `Idle`. */
export function resetStuckPromotionWindow(game: ChessGame | null | undefined): void {
  try {
    if (game?.getState?.() !== PROMOTION_CHOOSER_STATE) return;
    game?.getRenderer?.()?.closePromotionWindow?.();
  } catch {
    // A missing renderer must not block move submission.
  }
}

export function invalidateGameCache(): void {
  cachedGame = null;
  cachedGameTimestamp = 0;
}
