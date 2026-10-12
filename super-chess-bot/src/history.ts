import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { kingCastlesTo, makeSquare, makeUci } from 'chessops/util';

export interface PositionHistory {
  startFen: string;
  moves: string[];
}
interface HistorySource {
  getHistoryFENs?: () => unknown;
  getHistorySANs?: () => unknown;
}
const comparable = (fen: string) =>
  fen
    .split(' ')
    .filter((_, i) => i !== 3)
    .join(' ');

/** chessops stores castling moves as king-to-rook; orthodox UCI uses the king destination. */
function makeEngineUci(position: Chess, move: Parameters<typeof makeUci>[0]): string {
  if ('from' in move && move.from === position.board.kingOf(position.turn)) {
    const rooks = position.castles.rook[position.turn];
    const side = move.to === rooks.a ? 'a' : move.to === rooks.h ? 'h' : undefined;
    if (side) return makeSquare(move.from) + makeSquare(kingCastlesTo(position.turn, side));
  }
  return makeUci(move);
}

/** Canonicalise a complete chess FEN, retaining only legal en passant rights. */
export function canonicalFen(fen: string): string | null {
  if (typeof fen !== 'string' || fen.trim().split(/\s+/).length !== 6) return null;
  try {
    const setup = parseFen(fen.trim());
    if (setup.isErr) return null;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return null;
    return makeFen(position.value.toSetup());
  } catch {
    return null;
  }
}

/** Replay a complete SAN line and return its legal UCI history and every position. */
export function replaySanLine(
  startFen: string,
  sans: readonly string[],
): { history: PositionHistory; fens: string[] } | undefined {
  const rootFen = canonicalFen(startFen);
  if (!rootFen) return undefined;
  try {
    const setup = parseFen(rootFen);
    if (setup.isErr) return undefined;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return undefined;
    const moves: string[] = [];
    const fens = [rootFen];
    for (const san of sans) {
      if (typeof san !== 'string' || !san.trim()) return undefined;
      const move = parseSan(position.value, san.trim());
      if (!move) return undefined;
      moves.push(makeEngineUci(position.value, move));
      position.value.play(move);
      const fen = makeFen(position.value.toSetup());
      if (!canonicalFen(fen)) return undefined;
      fens.push(fen);
    }
    return { history: { startFen: rootFen, moves }, fens };
  } catch {
    return undefined;
  }
}

interface HistoryCacheEntry {
  game: HistorySource;
  currentFen: string;
  startFen: string;
  sansLength: number;
  lastSan: string | undefined;
  result: PositionHistory | undefined;
}

let historyCache: HistoryCacheEntry | null = null;

/** Reconstruct the selected line; discard partial or mismatched histories (memoized). */
export function readPositionHistory(game: HistorySource, currentFen: string): PositionHistory | undefined {
  try {
    const fens = game.getHistoryFENs?.();
    const sans = game.getHistorySANs?.();
    if (!Array.isArray(fens) || !Array.isArray(sans) || typeof fens[0] !== 'string') return undefined;

    const startFen = fens[0];
    const sansLength = sans.length;
    const lastSan = typeof sans[sansLength - 1] === 'string' ? sans[sansLength - 1] : undefined;

    if (
      historyCache &&
      historyCache.game === game &&
      historyCache.currentFen === currentFen &&
      historyCache.startFen === startFen &&
      historyCache.sansLength === sansLength &&
      historyCache.lastSan === lastSan
    ) {
      return historyCache.result;
    }

    const setup = parseFen(startFen);
    if (setup.isErr) return undefined;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return undefined;
    const moves: string[] = [];
    let computed: PositionHistory | undefined;
    for (const san of sans) {
      if (!san) continue;
      if (typeof san !== 'string') return undefined;
      const move = parseSan(position.value, san);
      if (!move) return undefined;
      moves.push(makeEngineUci(position.value, move));
      position.value.play(move);
      if (comparable(makeFen(position.value.toSetup())) === comparable(currentFen)) {
        computed = { startFen, moves };
        break;
      }
    }
    if (!computed && comparable(startFen) === comparable(currentFen)) {
      computed = { startFen, moves: [] };
    }

    historyCache = {
      game,
      currentFen,
      startFen,
      sansLength,
      lastSan,
      result: computed,
    };
    return computed;
  } catch {
    return undefined;
  }
}
