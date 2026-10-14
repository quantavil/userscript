import { normalizeMove, type Position } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import type { Move, Rules } from 'chessops/types';
import { kingCastlesTo, makeSquare, makeUci, parseUci } from 'chessops/util';
import { setupPosition } from 'chessops/variant';
import { getVariantDefinition } from './variants.js';

export interface PositionHistory {
  startFen: string;
  moves: string[];
}

export const STANDARD_INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function parseRules(variant?: string): Rules | null {
  return getVariantDefinition(variant)?.rules ?? null;
}

/**
 * Build a position from a FEN under a supported variant.
 *
 * `unknownVariant` states what to do with a variant this build does not support, which used to
 * differ silently between call sites:
 * - `'reject'` fails closed, for paths that feed the engine, history or PGN (standard pieces).
 * - `'standard'` treats it as ordinary chess, for board helpers that only need legal moves.
 */
export function loadPosition(
  fen: string,
  variant?: string,
  unknownVariant: 'reject' | 'standard' = 'reject',
): Position | null {
  const rules = parseRules(variant);
  if (!rules && unknownVariant === 'reject') return null;
  try {
    const setup = parseFen(fen);
    if (setup.isErr) return null;
    if (!rules) {
      const standard = setupPosition('chess', setup.value);
      return standard.isOk ? standard.value : null;
    }
    const position = setupPosition(rules, setup.value);
    return position.isOk ? position.value : null;
  } catch {
    return null;
  }
}

/**
 * chessops stores castling moves as king-to-rook. A `UCI_Chess960` engine expects that same
 * king-to-rook form; only an orthodox engine needs the king-destination square.
 */
export function makeEngineUci(position: Position, move: Parameters<typeof makeUci>[0], chess960: boolean): string {
  if (!chess960 && 'from' in move && move.from === position.board.kingOf(position.turn)) {
    const rooks = position.castles.rook[position.turn];
    const side = move.to === rooks.a ? 'a' : move.to === rooks.h ? 'h' : undefined;
    if (side) return makeSquare(move.from) + makeSquare(kingCastlesTo(position.turn, side));
  }
  return makeUci(move);
}

/**
 * Inverse of {@link makeEngineUci}: accept a UCI castling move in either encoding.
 *
 * An orthodox engine is sent the king-destination square while chessops needs king-to-rook, so
 * history replay receives `e1g1` where chessops expects `e1h1` and reads the castling move as an
 * illegal plain king move. Returns null when the move is not legal in this position.
 */
export function parseEngineUci(position: Position, uci: string): Move | null {
  const parsed = parseUci(uci);
  if (!parsed) return null;
  const king = position.board.kingOf(position.turn);
  if ('from' in parsed && parsed.from === king) {
    const rooks = position.castles.rook[position.turn];
    if (rooks.a !== undefined && parsed.to === kingCastlesTo(position.turn, 'a')) {
      return { from: king, to: rooks.a };
    }
    if (rooks.h !== undefined && parsed.to === kingCastlesTo(position.turn, 'h')) {
      return { from: king, to: rooks.h };
    }
  }
  let move: Move;
  try {
    move = normalizeMove(position, parsed);
  } catch {
    return null;
  }
  // normalizeMove only fixes castling encoding; legality still has to be checked.
  return position.isLegal(move) ? move : null;
}

/** Canonicalise a complete chess FEN, retaining only legal en passant rights. */
export function canonicalFen(fen: string, variant?: string): string | null {
  if (typeof fen !== 'string') return null;
  const trimmed = fen.trim();
  // A canonical position is a complete six-field FEN; partial FENs are rejected rather than
  // silently padded, so callers cannot mistake an abbreviated string for a canonical one.
  if (trimmed.split(/\s+/).length !== 6) return null;
  const position = loadPosition(trimmed, variant);
  return position ? makeFen(position.toSetup()) : null;
}

/** Replay a complete SAN line and return its legal UCI history and every position. */
export function replaySanLine(
  startFen: string,
  sans: readonly string[],
  variant?: string,
): { history: PositionHistory; fens: string[] } | undefined {
  const rootFen = canonicalFen(startFen, variant);
  if (!rootFen) return undefined;
  const chess960 = getVariantDefinition(variant)?.chess960 ?? false;
  const root = loadPosition(rootFen, variant);
  if (!root) return undefined;
  const position = root.clone();
  try {
    const moves: string[] = [];
    const fens = [rootFen];
    for (const san of sans) {
      if (typeof san !== 'string' || !san.trim()) return undefined;
      const move = parseSan(position, san.trim());
      if (!move) return undefined;
      moves.push(makeEngineUci(position, move, chess960));
      position.play(move);
      const fen = makeFen(position.toSetup());
      fens.push(fen);
    }
    return { history: { startFen: rootFen, moves }, fens };
  } catch {
    return undefined;
  }
}

/** Return legal-move availability for a chess or variant FEN; null means it could not be validated. */
export function hasLegalMoves(fen: string, variant?: string): boolean | null {
  const position = loadPosition(fen, variant, 'standard');
  return position ? position.hasDests() : null;
}

/** Count total legal moves available in a chess or variant FEN; null if position cannot be parsed. */
export function countLegalMoves(fen: string, variant?: string): number | null {
  const position = loadPosition(fen, variant, 'standard');
  if (!position) return null;
  let total = 0;
  for (const dests of position.allDests().values()) {
    total += dests.size();
  }
  return total;
}

/** Apply one legal UCI move with chessops, preserving all FEN counters and rights. */
export function predictFen(fen: string, uci: string, variant?: string): string | null {
  const position = loadPosition(fen, variant, 'standard');
  if (!position) return null;
  const move = parseUci(uci);
  if (!move || !position.isLegal(move)) return null;
  position.play(move);
  const nextSetup = position.toSetup();
  // Preserve the FEN en-passant target after a double pawn push, even when
  // the side to move has no legal capture. Chess.com includes this field.
  nextSetup.epSquare = position.epSquare;
  return makeFen(nextSetup);
}

/**
 * Extract the four core position fields (placement, side to move, castling, en passant target),
 * omitting halfmove and fullmove counters.
 */
export function toFourFieldFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.length >= 4 ? parts.slice(0, 4).join(' ') : fen.trim();
}
