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
}

export interface TablebaseResponse {
  success: boolean;
  category: 'win' | 'loss' | 'draw' | 'unknown' | 'maybe-win' | 'maybe-loss';
  dtz: number | null;
  dtm?: number | null;
  wdl?: number;
  bestMove: string;
  pv: string;
  evaluation: { cp?: number; mate?: number };
  displayEval: string;
}

const TABLEBASE_API = 'https://tablebase.lichess.ovh/standard';
const DEFAULT_TIMEOUT_MS = 2000;

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
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<TablebaseResponse | null> {
  if (!isTablebaseEligible(fen)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const url = `${TABLEBASE_API}?fen=${encodeURIComponent(fen)}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      category?: 'win' | 'loss' | 'draw' | 'unknown' | 'maybe-win' | 'maybe-loss';
      dtz?: number | null;
      dtm?: number | null;
      wdl?: number;
      moves?: TablebaseMove[];
    };

    if (!data.moves || data.moves.length === 0) return null;

    const best = pickBestTablebaseMove(data.moves);
    if (!best?.uci) return null;

    const category = data.category ?? 'unknown';
    const dtz = data.dtz ?? null;
    const dtm = data.dtm ?? null;
    const wdl = data.wdl;

    // Map tablebase outcome to evaluation
    let cp = 0;
    let mate: number | undefined;
    let displayEval = '0.00 (Tablebase Draw)';

    if (best.checkmate) {
      mate = 1;
      displayEval = '+M1 (Checkmate)';
    } else if (category === 'win' || category === 'maybe-win') {
      const dist = dtm !== null && dtm !== undefined ? Math.abs(dtm) : dtz !== null ? Math.abs(dtz) : 2;
      mate = Math.max(1, Math.ceil(dist / 2));
      displayEval = `+M${mate} (Tablebase)`;
    } else if (category === 'loss' || category === 'maybe-loss') {
      const dist = dtm !== null && dtm !== undefined ? Math.abs(dtm) : dtz !== null ? Math.abs(dtz) : 2;
      mate = -Math.max(1, Math.ceil(dist / 2));
      displayEval = `-M${Math.abs(mate)} (Tablebase)`;
    } else {
      cp = 0;
      displayEval = '0.00 (Tablebase Draw)';
    }

    return {
      success: true,
      category,
      dtz,
      dtm,
      ...(wdl !== undefined ? { wdl } : {}),
      bestMove: best.uci,
      pv: best.uci,
      evaluation: mate !== undefined ? { mate } : { cp },
      displayEval,
    };
  } catch {
    // Network / timeout / parse error gracefully falls back
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
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

/** Selects the optimal move from the tablebase candidate moves. */
export function pickBestTablebaseMove(moves: TablebaseMove[]): TablebaseMove | null {
  if (!moves || moves.length === 0) return null;

  return (
    [...moves].sort((a, b) => {
      const rankA = moveOutcomeRank(a);
      const rankB = moveOutcomeRank(b);

      if (rankA !== rankB) return rankB - rankA;

      // If both winning: prefer fastest conversion (smallest distance to mate/zeroing)
      if (rankA >= 4) {
        const distA = a.dtm !== null && a.dtm !== undefined ? Math.abs(a.dtm) : a.dtz !== null ? Math.abs(a.dtz) : 999;
        const distB = b.dtm !== null && b.dtm !== undefined ? Math.abs(b.dtm) : b.dtz !== null ? Math.abs(b.dtz) : 999;
        return distA - distB;
      }

      // If both losing: prefer stubborn defense (longest distance to mate/zeroing)
      if (rankA <= 2) {
        const distA = a.dtm !== null && a.dtm !== undefined ? Math.abs(a.dtm) : a.dtz !== null ? Math.abs(a.dtz) : 0;
        const distB = b.dtm !== null && b.dtm !== undefined ? Math.abs(b.dtm) : b.dtz !== null ? Math.abs(b.dtz) : 0;
        return distB - distA;
      }

      return 0;
    })[0] ?? null
  );
}
