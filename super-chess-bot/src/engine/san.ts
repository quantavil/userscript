import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { makeSanAndPlay } from 'chessops/san';
import { parseUci } from 'chessops/util';

type UciMoveObject = {
  uci?: unknown;
  from?: unknown;
  to?: unknown;
  promo?: unknown;
  promotion?: unknown;
};

function positionFromFen(fen: string): Chess | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const position = Chess.fromSetup(setup.value);
  return position.isOk ? position.value : null;
}

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

/** Convert a legal UCI move to SAN. Invalid input is returned unchanged. */
export function uciToSan(fen: string, input: unknown): unknown {
  if (!input) return '';
  const uci = asUci(input);
  if (!uci || uci.length < 4) return input;
  const position = positionFromFen(fen);
  const move = parseUci(uci);
  if (!position || !move || !position.isLegal(move)) return uci;
  return makeSanAndPlay(position, move);
}

export function formatMove(fen: string, uci: string): string {
  const position = positionFromFen(fen);
  const san = uciToSan(fen, uci);
  const moveNumber = position?.fullmoves ?? (Number.parseInt(fen.split(/\s+/)[5] ?? '', 10) || 1);
  const whiteToMove = position ? position.turn === 'white' : fen.split(/\s+/)[1] === 'w';
  const sanText = typeof san === 'string' ? san : String(san ?? '');
  return whiteToMove ? `${moveNumber}. ${sanText}` : `${moveNumber}... ${sanText}`;
}
