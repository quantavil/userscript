import { attacks, kingAttacks } from 'chessops/attacks';
import type { Position } from 'chessops/chess';
import type { Color, Role } from 'chessops/types';
import { opposite } from 'chessops/util';
import { loadPosition, makeEngineUci, parseEngineUci } from '../chess/position.js';
import type { MultiPvLine } from '../chess/types.js';
import { getVariantDefinition } from '../chess/variants.js';
import { MADMAN_MAX_LOSS_CP } from './config.js';

const VALUES: Record<Role, number> = { pawn: 100, knight: 310, bishop: 330, rook: 500, queen: 950, king: 0 };

export interface MadmanSelection {
  chosenLine: MultiPvLine;
  lines: MultiPvLine[];
  cpLoss: number;
  aggression: number;
  captureMoves: string[];
  verifiedOffer: boolean;
}

/** Geometric pressure is a style preference, never evidence that a tactic works. */
function pressure(pos: Position, color: Color): number {
  const king = pos.board.kingOf(opposite(color));
  if (king === undefined) return 0;
  const zone = kingAttacks(king).with(king);
  let score = 0;
  for (const [square, piece] of pos.board) {
    if (piece.color !== color || piece.role === 'king') continue;
    const reached = attacks(piece, square, pos.board.occupied);
    score += reached.intersect(zone).size() * (piece.role === 'pawn' ? 3 : 2);
    for (const target of reached.intersect(pos.board[opposite(color)])) {
      const role = pos.board.getRole(target);
      if (role && VALUES[role] > VALUES[piece.role]) score += 2;
    }
  }
  return score;
}

function legalMoves(pos: Position, chess960: boolean): string[] {
  const moves: string[] = [];
  for (const [from, dests] of pos.allDests()) {
    for (const to of dests) {
      const promotion = pos.board.getRole(from) === 'pawn' && (to < 8 || to >= 56);
      for (const role of promotion ? (['queen', 'rook', 'bishop', 'knight'] as const) : [undefined]) {
        moves.push(makeEngineUci(pos, { from, to, ...(role ? { promotion: role } : {}) }, chess960));
      }
    }
  }
  return moves;
}

function features(pos: Position, uci: string, pv?: string): { aggression: number; sustained: number } | null {
  const move = parseEngineUci(pos, uci);
  if (!move || !pos.isLegal(move) || !('from' in move)) return null;
  const color = pos.turn;
  const piece = pos.board.get(move.from);
  if (!piece) return null;
  const after = pos.clone();
  after.play(move);
  const beforePressure = pressure(pos, color);
  const afterPressure = pressure(after, color);
  const offered =
    piece.role !== 'king' && after.kingAttackers(move.to, opposite(color), after.board.occupied).nonEmpty();
  // Reward opening pawn contact and development toward an attack, not raw king distance.
  const pawnContact =
    piece.role === 'pawn' &&
    attacks(piece, move.to, after.board.occupied).intersect(after.board[opposite(color)]).nonEmpty();
  // Sample our next two searched positions so preparations and sustained attacks count.
  const continuation = after.clone();
  const futurePressure: number[] = [];
  const pvMoves = pv?.trim().split(/\s+/) ?? [];
  if (pvMoves[0] === uci) {
    for (const reply of pvMoves.slice(1, 5)) {
      const next = parseEngineUci(continuation, reply);
      if (!next || !continuation.isLegal(next)) break;
      const mover = continuation.turn;
      continuation.play(next);
      if (mover === color) futurePressure.push(pressure(continuation, color));
    }
  }
  const sustained = futurePressure.length
    ? (3 * futurePressure.reduce((sum, value) => sum + value, 0)) / futurePressure.length
    : 0;
  return {
    aggression:
      sustained +
      afterPressure +
      2 * (afterPressure - beforePressure) +
      (after.isCheck() ? 4 : 0) +
      (pawnContact ? 3 : 0) +
      (offered && afterPressure > beforePressure ? 3 : 0),
    sustained,
  };
}

/** Extra proposals are legal, but must be searched before they can be selected. */
export function discoverMadmanMoves(fen: string, existing: readonly string[], variant?: string): string[] {
  const pos = loadPosition(fen, variant);
  if (!pos) return [];
  const chess960 = getVariantDefinition(variant)?.chess960 ?? false;
  return legalMoves(pos, chess960)
    .filter((uci) => !existing.includes(uci))
    .map((uci) => ({ uci, score: features(pos, uci)?.aggression ?? -Infinity }))
    .sort((a, b) => b.score - a.score || a.uci.localeCompare(b.uci))
    .slice(0, 4)
    .map(({ uci }) => uci);
}

/** Engine evaluations authorize risk; style scores only rank eligible alternatives. */
export function selectMadmanMove(
  fen: string,
  lines: readonly MultiPvLine[],
  options: { minimumDepth?: 3 | 4 | 6; verifiedOffers?: ReadonlySet<string>; variant?: string } = {},
): MadmanSelection | null {
  const pos = loadPosition(fen, options.variant);
  if (!pos) return null;
  const candidates = lines.flatMap((line) => {
    const feature = features(pos, line.uci, line.pv);
    const cp = line.evaluation.cp;
    const mate = line.evaluation.mate;
    if (!feature || (!Number.isFinite(cp) && !Number.isFinite(mate))) return [];
    return [{ line, ...feature, aggression: feature.aggression + (options.verifiedOffers?.has(line.uci) ? 20 : 0) }];
  });
  if (!candidates.length) return null;
  const winning = candidates
    .filter(({ line }) => (line.evaluation.mate ?? 0) > 0)
    .sort((a, b) => (a.line.evaluation.mate ?? 0) - (b.line.evaluation.mate ?? 0));
  const scored = candidates
    .filter(({ line }) => Number.isFinite(line.evaluation.cp))
    .sort((a, b) => (b.line.evaluation.cp ?? 0) - (a.line.evaluation.cp ?? 0));
  const comparable =
    candidates.length === lines.length &&
    new Set(lines.map((line) => line.uci)).size === lines.length &&
    candidates.every(({ line }) => line.depth === candidates[0].line.depth);
  const baseline =
    winning[0] ??
    (comparable && candidates[0].line.depth >= (options.minimumDepth ?? 6) ? scored[0] : candidates[0]) ??
    candidates[0];
  let chosen = baseline;
  if (comparable && !winning.length && scored.length && baseline.line.depth >= (options.minimumDepth ?? 6)) {
    const maxLoss = MADMAN_MAX_LOSS_CP;
    const eligible = scored.filter(
      ({ line }) =>
        line.depth === baseline.line.depth && (baseline.line.evaluation.cp ?? 0) - (line.evaluation.cp ?? 0) <= maxLoss,
    );
    eligible.sort(
      (a, b) =>
        b.aggression - a.aggression ||
        b.sustained - a.sustained ||
        (b.line.evaluation.cp ?? 0) - (a.line.evaluation.cp ?? 0),
    );
    chosen = eligible[0] ?? baseline;
  }
  return {
    chosenLine: chosen.line,
    lines: [chosen.line, ...lines.filter((line) => line.uci !== chosen.line.uci)],
    cpLoss: winning.length ? 0 : Math.max(0, (baseline.line.evaluation.cp ?? 0) - (chosen.line.evaluation.cp ?? 0)),
    aggression: chosen.aggression,
    captureMoves: capturesOfOfferedPiece(fen, chosen.line.uci, options.variant),
    verifiedOffer: options.verifiedOffers?.has(chosen.line.uci) ?? false,
  };
}

/** Legal ways to take the just-moved piece, without assuming any capture is poisoned. */
export function capturesOfOfferedPiece(fen: string, uci: string, variant?: string): string[] {
  const pos = loadPosition(fen, variant);
  if (!pos) return [];
  const move = parseEngineUci(pos, uci);
  if (!move || !pos.isLegal(move) || !('from' in move) || pos.board.getRole(move.from) === 'king') return [];
  const color = pos.turn;
  pos.play(move);
  const chess960 = getVariantDefinition(variant)?.chess960 ?? false;
  return legalMoves(pos, chess960).filter((reply) => {
    const capture = parseEngineUci(pos, reply);
    return (
      capture &&
      ((capture.to === move.to && pos.board.getColor(move.to) === color) ||
        ('from' in capture &&
          pos.board.getRole(capture.from) === 'pawn' &&
          capture.to === pos.epSquare &&
          pos.board.getRole(move.to) === 'pawn'))
    );
  });
}
