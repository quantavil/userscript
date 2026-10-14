import { toFourFieldFen } from '../chess/position.js';
import type { Evaluation } from '../chess/types.js';
import { mateToDisplay } from '../shared/utils.js';

/**
 * Asynchronous Syzygy 7-piece Tablebase client.
 * Queries https://tablebase.lichess.ovh/standard?fen=... for instant endgame WDL/DTZ lookups
 * when pieces on board <= 7.
 */

export interface TablebaseMove {
  uci: string;
  san?: string;
  dtz: number | null;
  dtm?: number | null;
  wdl?: number;
  category?: 'win' | 'loss' | 'draw' | 'unknown' | 'blessed-loss' | 'cursed-win' | 'maybe-win' | 'maybe-loss';
  checkmate?: boolean;
  zeroing?: boolean;
}

export interface TablebaseResponse {
  success: boolean;
  category: NonNullable<TablebaseMove['category']>;
  dtz: number | null;
  dtm?: number | null;
  wdl?: number;
  bestMove: string;
  pv: string;
  evaluation: Evaluation;
  displayEval: string;
}

import {
  TABLEBASE_API_URL,
  TABLEBASE_CACHE_CAPACITY,
  TABLEBASE_DEFAULT_TIMEOUT_MS,
  TABLEBASE_FAILURE_COOLDOWN_MS,
} from './config.js';

const resultCache = new Map<string, TablebaseResponse>();
const failureCooldown = new Map<string, number>();

function cacheKey(fen: string): string {
  return toFourFieldFen(fen);
}

function copyResult(result: TablebaseResponse): TablebaseResponse {
  return { ...result, evaluation: { ...result.evaluation } };
}

/** Count total number of pieces remaining on the board from a FEN string. */
export function countPiecesOnBoard(fen: string): number {
  if (!fen) return 32;
  const boardPart = fen.split(' ')[0] ?? '';
  let count = 0;
  for (const ch of boardPart) {
    if (/[pnbrqkPNBRQK]/.test(ch)) count++;
  }
  return count;
}

/** Returns true if the position has 7 or fewer pieces on the board. */
export function isTablebaseEligible(fen: string): boolean {
  if (!fen || typeof fen !== 'string') return false;
  const boardPart = fen.split(' ')[0] ?? '';
  const slashes = (boardPart.match(/\//g) || []).length;
  if (slashes !== 7) return false;
  if (!boardPart.includes('k') || !boardPart.includes('K')) return false;
  return countPiecesOnBoard(fen) <= 7;
}

/**
 * Queries the Syzygy tablebase for positions with <= 7 pieces.
 * Returns null if network fails, position not eligible, or no valid move returned.
 */
export async function lookupTablebase(
  fen: string,
  signal?: AbortSignal,
  timeoutMs: number = TABLEBASE_DEFAULT_TIMEOUT_MS,
): Promise<TablebaseResponse | null> {
  if (signal?.aborted || !isTablebaseEligible(fen)) return null;
  const key = cacheKey(fen);
  const cached = resultCache.get(key);
  if (cached) {
    // Refresh recency so a hot position is never the next one evicted.
    resultCache.delete(key);
    resultCache.set(key, cached);
    return copyResult(cached);
  }
  // A rate-limited or failed host must not be re-queried once per ply.
  const retryAfter = failureCooldown.get(key);
  if (retryAfter !== undefined) {
    if (Date.now() < retryAfter) return null;
    failureCooldown.delete(key);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const url = `${TABLEBASE_API_URL}?fen=${encodeURIComponent(fen)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      suppress(key);
      return null;
    }

    const data = (await response.json()) as {
      category?: NonNullable<TablebaseMove['category']>;
      dtz?: number | null;
      dtm?: number | null;
      wdl?: number;
      moves?: TablebaseMove[];
    };

    if (controller.signal.aborted || !data.moves || data.moves.length === 0) return null;

    const best = data.moves[0] ?? pickBestTablebaseMove(data.moves);
    if (!best?.uci) return null;

    const category = data.category ?? 'unknown';
    const dtz = data.dtz ?? null;
    const dtm = data.dtm ?? null;
    const wdl = data.wdl;

    // DTZ measures distance to a pawn move/capture, never distance to mate.
    // Keep WDL outcomes in the display when no exact DTM is available.
    let evaluation: TablebaseResponse['evaluation'] = {};
    let displayEval = `Tablebase ${category}`;
    if (best.checkmate) {
      evaluation = { mate: 1 };
      displayEval = `${mateToDisplay(1)} (Checkmate)`;
    } else if ((category === 'win' || category === 'loss') && dtm !== null && Number.isFinite(dtm)) {
      const mate = Math.max(1, Math.ceil(Math.abs(dtm) / 2)) * (category === 'win' ? 1 : -1);
      evaluation = { mate };
      displayEval = `${mateToDisplay(mate)} (Tablebase)`;
    } else if (category === 'draw') {
      evaluation = { cp: 0 };
      displayEval = '0.00 (Tablebase Draw)';
    } else if (category === 'win' || category === 'loss') {
      // A decided position with no exact DTM still has a known outcome. Report it as a capped
      // centipawn score so a consumer never reads an empty evaluation as "no score available".
      evaluation = { cp: category === 'win' ? 1000 : -1000 };
    }

    const result: TablebaseResponse = {
      success: true,
      category,
      dtz,
      dtm,
      ...(wdl !== undefined ? { wdl } : {}),
      bestMove: best.uci,
      pv: best.uci,
      evaluation,
      displayEval,
    };
    resultCache.delete(key);
    resultCache.set(key, copyResult(result));
    trim(resultCache);
    return result;
  } catch {
    // Network / timeout / parse error gracefully falls back
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Hold this position out of the network until the cooldown expires. */
function suppress(key: string): void {
  failureCooldown.set(key, Date.now() + TABLEBASE_FAILURE_COOLDOWN_MS);
  if (failureCooldown.size > TABLEBASE_CACHE_CAPACITY) {
    const oldest = failureCooldown.keys().next().value;
    if (oldest !== undefined) failureCooldown.delete(oldest);
  }
}

function trim(cache: Map<string, TablebaseResponse>): void {
  while (cache.size > TABLEBASE_CACHE_CAPACITY) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

/**
 * In Lichess Syzygy API, move category reflects the opponent's outcome in the resulting position:
 * - checkmate: true -> Mate in 1 for player (Rank 6)
 * - 'loss' -> Opponent is in a loss, so PLAYER WINS (Rank 5)
 * - 'blessed-loss' -> Opponent has blessed loss, PLAYER has cursed win (Rank 4)
 * - 'draw' -> Position is drawn (Rank 3)
 * - 'cursed-win' -> Opponent has cursed win, PLAYER has blessed loss (Rank 2)
 * - 'win' -> Opponent wins, PLAYER LOSES (Rank 1)
 * - unknown -> Rank 0, ranked below every known outcome rather than beside a loss.
 */
function moveOutcomeRank(move: TablebaseMove): number {
  if (move.checkmate) return 6;
  const cat = move.category;
  if (cat === 'loss') return 5;
  if (cat === 'blessed-loss') return 4;
  if (cat === 'draw') return 3;
  if (cat === 'cursed-win') return 2;
  if (cat === 'win') return 1;

  if (move.wdl === -2) return 5;
  if (move.wdl === -1) return 4;
  if (move.wdl === 0) return 3;
  if (move.wdl === 1) return 2;
  if (move.wdl === 2) return 1;

  return 0;
}

/**
 * Comparable distance-to-resolution for a pair of moves.
 *
 * DTM counts full moves and DTZ counts plies, so the two are never compared against each other:
 * a pair is only ordered on DTM when both moves actually have one.
 */
function distancePair(a: TablebaseMove, b: TablebaseMove, fallback: number): [number, number] {
  if (a.dtm != null && b.dtm != null) return [Math.abs(a.dtm), Math.abs(b.dtm)];
  if (a.dtz != null && b.dtz != null) return [Math.abs(a.dtz), Math.abs(b.dtz)];
  return [fallback, fallback];
}

/** Selects the optimal move from the tablebase candidate moves. */
export function pickBestTablebaseMove(moves: TablebaseMove[]): TablebaseMove | null {
  if (!moves || moves.length === 0) return null;

  return (
    [...moves].sort((a, b) => {
      const rankA = moveOutcomeRank(a);
      const rankB = moveOutcomeRank(b);

      if (rankA !== rankB) {
        // An unclassified move must never outrank a known outcome, in either direction.
        if (rankA === 0) return 1;
        if (rankB === 0) return -1;
        return rankB - rankA;
      }
      // Two unclassified moves carry no usable information, so keep input order.
      if (rankA === 0) return 0;

      // If both winning: prefer fastest conversion (smallest distance to mate/zeroing)
      if (rankA >= 4) {
        if (a.dtm != null && b.dtm != null) {
          return Math.abs(a.dtm) - Math.abs(b.dtm);
        }
        if (Boolean(a.zeroing) !== Boolean(b.zeroing)) {
          return a.zeroing ? -1 : 1;
        }
        const [distA, distB] = distancePair(a, b, 999);
        return distA - distB;
      }

      // If both losing: prefer stubborn defense (longest distance to mate/zeroing)
      const [distA, distB] = distancePair(a, b, 0);
      return distB - distA;
    })[0] ?? null
  );
}
