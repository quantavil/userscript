import type { Position } from 'chessops/chess';
import { makeSanAndPlay } from 'chessops/san';
import { parseUci } from 'chessops/util';
import { loadPosition } from './position.js';

type UciMoveObject = {
  uci?: unknown;
  from?: unknown;
  to?: unknown;
  promo?: unknown;
  promotion?: unknown;
};

function asUci(move: unknown): string | null {
  if (typeof move === 'string') return move;
  if (!move || typeof move !== 'object') return null;
  const value = move as UciMoveObject;
  if (typeof value.uci === 'string') return value.uci;
  if (typeof value.from === 'string' && typeof value.to === 'string') {
    const promotion = value.promo ?? value.promotion;
    return value.from + value.to + (typeof promotion === 'string' ? promotion : '');
  }
  return null;
}

function sanOf(position: Position, uci: string): string | null {
  const move = parseUci(uci);
  if (!move || !position.isLegal(move)) return null;
  return String(makeSanAndPlay(position, move));
}

/** Convert a legal UCI move to SAN. Invalid input is returned unchanged. */
export function uciToSan(fen: string, input: unknown, variant?: string): string {
  if (!input) return '';
  const uci = asUci(input);
  if (!uci || uci.length < 4) return typeof input === 'string' ? input : '';
  const position = loadPosition(fen, variant, 'standard');
  if (!position) return uci;
  const san = sanOf(position, uci);
  return san ?? uci;
}

/**
 * Resolve many UCI moves against a single parsed position.
 *
 * The panel converts every Multi-PV line on every display update, so parsing the position once
 * per batch instead of once per line keeps the render cost flat in the number of lines.
 */
export function uciListToSan(fen: string, moves: readonly string[], variant?: string): string[] {
  const position = loadPosition(fen, variant, 'standard');
  if (!position) return [...moves];
  return moves.map((uci) => {
    const san = sanOf(position.clone(), uci);
    return san ?? uci;
  });
}

export function formatMove(fen: string, uci: string, variant?: string): string {
  const position = loadPosition(fen, variant, 'standard');
  const moveNumber = position?.fullmoves ?? (Number.parseInt(fen.split(/\s+/)[5] ?? '', 10) || 1);
  const whiteToMove = position ? position.turn === 'white' : fen.split(/\s+/)[1] === 'w';
  const san = position ? (sanOf(position.clone(), uci) ?? uci) : uciToSan(fen, uci, variant);
  return whiteToMove ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
}

/**
 * Convert a space-separated UCI sequence (PV line) into formatted SAN with move numbers.
 * Example: 'e2e4 e7e5 g1f3 b8c6' -> '1. e4 e5 2. Nf3 Nc6' (if White to move)
 * Example: 'e7e5 g1f3 b8c6' -> '1... e5 2. Nf3 Nc6' (if Black to move)
 */
export function uciSequenceToSan(fen: string, uciSequence: string, variant?: string): string {
  if (!uciSequence || uciSequence === '-') return uciSequence;
  const moves = uciSequence.trim().split(/\s+/).filter(Boolean);
  if (moves.length === 0) return uciSequence;
  const position = loadPosition(fen, variant, 'standard');
  if (!position) return uciSequence;

  const pos = position.clone();
  let moveNum = pos.fullmoves;
  let isWhite = pos.turn === 'white';
  const parts: string[] = [];

  for (let i = 0; i < moves.length; i++) {
    const uci = moves[i];
    const san = sanOf(pos, uci);
    if (!san) {
      parts.push(uci);
      break;
    }
    if (i === 0) {
      parts.push(isWhite ? `${moveNum}. ${san}` : `${moveNum}... ${san}`);
    } else if (isWhite) {
      parts.push(`${moveNum}. ${san}`);
    } else {
      parts.push(san);
    }
    if (!isWhite) {
      moveNum++;
    }
    isWhite = !isWhite;
  }

  return parts.join(' ');
}
