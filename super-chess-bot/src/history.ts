import type { Position } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import type { Rules } from 'chessops/types';
import { kingCastlesTo, makeSquare, makeUci } from 'chessops/util';
import { setupPosition } from 'chessops/variant';

export interface PositionHistory {
  startFen: string;
  moves: string[];
}

export function parseRules(variant?: string): Rules | null {
  if (!variant || variant === 'standard' || variant === 'chess' || variant === 'fromPosition') return 'chess';
  const v = variant.toLowerCase().replace(/[\s\-_]/g, '');
  if (v === 'crazyhouse') return 'crazyhouse';
  if (v === 'atomic') return 'atomic';
  if (v === 'antichess') return 'antichess';
  if (v === 'kingofthehill') return 'kingofthehill';
  if (v === 'threecheck' || v === '3check') return '3check';
  if (v === 'racingkings') return 'racingkings';
  if (v === 'horde') return 'horde';
  return null;
}

/** chessops stores castling moves as king-to-rook; orthodox UCI uses the king destination. */
function makeEngineUci(position: Position, move: Parameters<typeof makeUci>[0]): string {
  if ('from' in move && move.from === position.board.kingOf(position.turn)) {
    const rooks = position.castles.rook[position.turn];
    const side = move.to === rooks.a ? 'a' : move.to === rooks.h ? 'h' : undefined;
    if (side) return makeSquare(move.from) + makeSquare(kingCastlesTo(position.turn, side));
  }
  return makeUci(move);
}

/** Canonicalise a complete chess FEN, retaining only legal en passant rights. */
export function canonicalFen(fen: string, variant?: string): string | null {
  if (typeof fen !== 'string') return null;
  const trimmed = fen.trim();
  const rules = parseRules(variant);
  if (!rules) {
    return trimmed.split(/\s+/).length >= 4 ? trimmed : null;
  }
  if (trimmed.split(/\s+/).length !== 6 && rules !== 'crazyhouse') return null;
  try {
    const setup = parseFen(trimmed);
    if (setup.isErr) return null;
    const position = setupPosition(rules, setup.value);
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
  variant?: string,
): { history: PositionHistory; fens: string[] } | undefined {
  const rootFen = canonicalFen(startFen, variant);
  if (!rootFen) return undefined;
  const rules = parseRules(variant);
  if (!rules) {
    return { history: { startFen: rootFen, moves: [] }, fens: [rootFen] };
  }
  try {
    const setup = parseFen(rootFen);
    if (setup.isErr) return undefined;
    const position = setupPosition(rules, setup.value);
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
      if (!canonicalFen(fen, variant)) return undefined;
      fens.push(fen);
    }
    return { history: { startFen: rootFen, moves }, fens };
  } catch {
    return undefined;
  }
}
