import type { Position } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { makeUci, squareRank } from 'chessops/util';
import { loadPosition, parseEngineUci } from '../chess/position.js';
import type { MultiPvLine, OpeningStyle } from '../chess/types.js';
import { evaluationToCentipawns } from '../shared/chess.js';
import { lookupBookMove } from './book/lookup.js';

export interface ArmedPremoveMap {
  /** Maps normalized 3-field post-trigger FEN (board turn castling) -> validated UCI reply */
  byExpectedFen: Map<string, string>;
}

export function fenKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 3).join(' ');
}

export function dest(uci: string): string {
  return uci.slice(2, 4);
}

export function orig(uci: string): string {
  return uci.slice(0, 2);
}

export function isRecaptureChain(pv: string[]): boolean {
  return pv.length >= 3 && dest(pv[0]) === dest(pv[1]) && dest(pv[2]) === dest(pv[1]);
}

export function isLegalMove(fen: string, uci: string, variant?: string): boolean {
  const position = loadPosition(fen, variant, 'standard');
  if (!position) return false;
  return parseEngineUci(position, uci) !== null;
}

export function resolveArmedTriggerFen(
  startFen: string,
  movesBeforeTrigger: string[],
  triggerUci: string,
  replyUci: string,
  variant?: string,
): string | null {
  const position = loadPosition(startFen, variant, 'standard');
  if (!position) return null;
  for (const uci of movesBeforeTrigger) {
    const move = parseEngineUci(position, uci);
    if (!move) return null;
    position.play(move);
  }
  const triggerMove = parseEngineUci(position, triggerUci);
  if (!triggerMove) return null;
  position.play(triggerMove);
  const replyMove = parseEngineUci(position, replyUci);
  if (!replyMove) return null;
  return fenKey(makeFen(position.toSetup()));
}

import { MAX_CHAIN_STEERING_LOSS_CP, PREMOVE_PONDER_BRANCHES } from './config.js';

const ROLE_VALUES: Record<string, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100,
};

/**
 * Pre-populates instant recapture replies for any legal opponent capture in the given position.
 * Simulates in <= 0.2ms.
 */
export function populateRecaptureFallbacks(posAfterOurMove: Position, byExpectedFen: Map<string, string>): void {
  for (const [from, dests] of posAfterOurMove.allDests()) {
    for (const to of dests) {
      const isCapture =
        posAfterOurMove.board.get(to) !== undefined ||
        (to === posAfterOurMove.epSquare && posAfterOurMove.board.get(from)?.role === 'pawn');
      if (!isCapture) continue;

      const isPromotion =
        posAfterOurMove.board.get(from)?.role === 'pawn' && (squareRank(to) === 0 || squareRank(to) === 7);
      const oppMove = isPromotion ? { from, to, promotion: 'queen' as const } : { from, to };

      const nextPos = posAfterOurMove.clone();
      nextPos.play(oppMove);

      let bestRecaptureUci: string | null = null;
      let lowestVal = Infinity;

      for (const [rFrom, rDests] of nextPos.allDests()) {
        if (rDests.has(to)) {
          const role = nextPos.board.get(rFrom)?.role ?? 'king';
          const val = ROLE_VALUES[role] ?? 99;
          if (val < lowestVal) {
            lowestVal = val;
            const isOurPromotion = role === 'pawn' && (squareRank(to) === 0 || squareRank(to) === 7);
            bestRecaptureUci = isOurPromotion
              ? makeUci({ from: rFrom, to, promotion: 'queen' })
              : makeUci({ from: rFrom, to });
          }
        }
      }

      if (bestRecaptureUci) {
        const key = fenKey(makeFen(nextPos.toSetup()));
        byExpectedFen.set(key, bestRecaptureUci);
      }
    }
  }
}

/**
 * Own-turn move selection and ponder table arming:
 * 1. Checks PV1 and PV2. If PV2 is a recapture chain and score loss <= MAX_CHAIN_STEERING_LOSS_CP, steers to PV2.
 * 2. Pre-populates instant recaptures for all immediate opponent captures.
 * 3. Unconditionally arms chosen.pv[2] (our reply to their predicted reply pv[1]) if pv.length >= 3.
 */
export function selectOwnTurnChainPremove(
  startFen: string,
  lines: MultiPvLine[],
  variant?: string,
): { bestMoveUci: string; armed?: ArmedPremoveMap } {
  if (!lines || lines.length === 0) {
    return { bestMoveUci: '' };
  }

  const pv1 = lines[0];
  const pv1Moves = pv1.pv ? pv1.pv.trim().split(/\s+/) : [];
  let chosen = pv1;
  let chosenMoves = pv1Moves;

  if (lines.length > 1) {
    const pv2 = lines[1];
    const pv2Moves = pv2.pv ? pv2.pv.trim().split(/\s+/) : [];
    const pv1IsChain = isRecaptureChain(pv1Moves);
    const pv2IsChain = isRecaptureChain(pv2Moves);
    if (!pv1IsChain && pv2IsChain) {
      const score1 = evaluationToCentipawns(pv1.evaluation);
      const score2 = evaluationToCentipawns(pv2.evaluation);
      if (score1 - score2 <= MAX_CHAIN_STEERING_LOSS_CP) {
        chosen = pv2;
        chosenMoves = pv2Moves;
      }
    }
  }

  const bestMoveUci = chosen.uci || chosenMoves[0] || '';
  if (!bestMoveUci) {
    return { bestMoveUci: '' };
  }

  const byExpectedFen = new Map<string, string>();

  // Simulate position after our move
  const pos = loadPosition(startFen, variant, 'standard');
  if (pos) {
    const parsedOurMove = parseEngineUci(pos, bestMoveUci);
    if (parsedOurMove) {
      pos.play(parsedOurMove);
      // Pre-populate instant recapture fallbacks
      populateRecaptureFallbacks(pos, byExpectedFen);

      // Arm all lines starting with our move that have at least 3 plies
      for (const line of lines) {
        const moves = line.pv ? line.pv.trim().split(/\s+/) : [];
        if (moves.length >= 3 && (moves[0] === bestMoveUci || line === chosen)) {
          const triggerUci = moves[1];
          const replyUci = moves[2];
          const triggerFen = resolveArmedTriggerFen(startFen, [bestMoveUci], triggerUci, replyUci, variant);
          if (triggerFen) {
            byExpectedFen.set(triggerFen, replyUci);
          }
        }
      }
    }
  }

  return {
    bestMoveUci,
    ...(byExpectedFen.size > 0 ? { armed: { byExpectedFen } } : {}),
  };
}

/**
 * Opening book premove replies:
 * Given the board position after our move, scans immediate legal opponent replies and
 * pre-arms book responses so our follow-ups dispatch with 0ms delay.
 */
export function selectBookPremoveReplies(
  nextFen: string,
  style: OpeningStyle = 'balanced',
  rng: () => number = () => 0,
): ArmedPremoveMap | null {
  const pos = loadPosition(nextFen, 'standard', 'standard');
  if (!pos) return null;
  const byExpectedFen = new Map<string, string>();
  for (const [from, dests] of pos.allDests()) {
    for (const to of dests) {
      const oppMove = { from, to };
      const p = pos.clone();
      p.play(oppMove);
      const oppFen = makeFen(p.toSetup());
      const reply = lookupBookMove(oppFen, style, rng);
      if (reply) {
        byExpectedFen.set(fenKey(oppFen), reply);
      }
    }
  }
  return byExpectedFen.size > 0 ? { byExpectedFen } : null;
}

/**
 * Opponent-turn Multi-Branch Ponder Table selector:
 * Inspects up to 6 MultiPV lines from opponent's turn.
 * For each valid line (pv.length >= 2), resolves expected FEN after pv[0] and arms reply pv[1].
 * Uncapped by 150cp because each branch has its own distinct FEN key.
 */
export function selectOpponentTurnPremove(
  opponentTurnFen: string,
  lines: MultiPvLine[],
  variant?: string,
): ArmedPremoveMap | null {
  if (!lines || lines.length === 0) return null;

  const byExpectedFen = new Map<string, string>();
  const topLines = lines.slice(0, PREMOVE_PONDER_BRANCHES);

  for (const line of topLines) {
    const pvMoves = line.pv ? line.pv.trim().split(/\s+/) : [];
    if (pvMoves.length < 2) continue;
    const triggerOpponentUci = pvMoves[0];
    const replyOurUci = pvMoves[1];

    const expectedFen = resolveArmedTriggerFen(opponentTurnFen, [], triggerOpponentUci, replyOurUci, variant);
    if (expectedFen) {
      byExpectedFen.set(expectedFen, replyOurUci);
    }
  }

  return byExpectedFen.size > 0 ? { byExpectedFen } : null;
}
