import { Chess } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import type { Evaluation } from '../types/chess.js';
import type { AnalysisResult, MultiPvLine, PositionHistory } from './uci-client.js';
import { engineWorker } from './worker-client.js';

export type { AnalysisResult, PositionHistory } from './uci-client.js';

export interface BestLine {
  uci: string;
  pv: string;
  score: Evaluation;
  multiPv?: MultiPvLine[];
}

export function warmEngine(): Promise<void> {
  return engineWorker.warm();
}

export function resetEngine(): void {
  engineWorker.reset();
}

export function getAnalysis(
  fen: string,
  depth: number,
  timeLimit: number,
  signal?: AbortSignal,
  history?: PositionHistory,
  slackMs?: number,
): Promise<AnalysisResult> {
  return engineWorker.analyze(fen, depth, timeLimit, signal, history, slackMs);
}

/** Return legal-move availability for a standard chess FEN; null means it could not be validated. */
export function hasLegalMoves(fen: string): boolean | null {
  try {
    const setup = parseFen(fen);
    if (setup.isErr) return null;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return null;
    return position.value.hasDests();
  } catch {
    return null;
  }
}

/** Count total legal moves available in a standard chess FEN; null if position cannot be parsed. */
export function countLegalMoves(fen: string): number | null {
  try {
    const setup = parseFen(fen);
    if (setup.isErr) return null;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return null;
    let total = 0;
    for (const dests of position.value.allDests().values()) {
      total += dests.size();
    }
    return total;
  } catch {
    return null;
  }
}

/** Search the most likely reply while the opponent is thinking. */
export function ponderPosition(fen: string, depth: number, history?: PositionHistory): boolean {
  return engineWorker.ponder(fen, depth, history);
}

export function cancelPonder(preserveFen?: string): void {
  engineWorker.cancelPonder(preserveFen);
}

/** Apply one legal UCI move with chessops, preserving all FEN counters and rights. */
export function predictFen(fen: string, uci: string): string | null {
  try {
    const setup = parseFen(fen);
    if (setup.isErr) return null;
    const position = Chess.fromSetup(setup.value);
    if (position.isErr) return null;
    const move = parseUci(uci);
    if (!move || !position.value.isLegal(move)) return null;
    position.value.play(move);
    const nextSetup = position.value.toSetup();
    // Preserve the FEN en-passant target after a double pawn push, even when
    // the side to move has no legal capture. Chess.com includes this field.
    nextSetup.epSquare = position.value.epSquare;
    return makeFen(nextSetup);
  } catch {
    return null;
  }
}

/** Convert the typed UCI result into the move-line shape used by the scheduler. */
export function parseBestLine(data: unknown): BestLine | null {
  if (!data || typeof data !== 'object') return null;
  const result = data as Partial<AnalysisResult>;
  const uci = typeof result.bestmove === 'string' ? result.bestmove.trim() : '';
  if (!result.success || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(uci)) return null;
  const score: Evaluation = {};
  if (typeof result.evaluation?.cp === 'number' && Number.isFinite(result.evaluation.cp)) {
    score.cp = result.evaluation.cp;
  } else if (typeof result.evaluation?.mate === 'number' && Number.isFinite(result.evaluation.mate)) {
    score.mate = result.evaluation.mate;
  }
  return {
    uci,
    pv: typeof result.pv === 'string' && result.pv.trim() ? result.pv.trim() : uci,
    score,
    ...(result.multiPv && result.multiPv.length > 0 ? { multiPv: result.multiPv } : {}),
  };
}
