import type { PositionHistory } from '../chess/position';
import type { Evaluation, MultiPvLine } from '../chess/types';
import { type AnalysisResult, isValidUciMove, type SearchOptions } from './uci-client';
import { engineWorker } from './worker-client';

export type { AnalysisResult, PositionHistory };

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

/**
 * `timeLimit` of 0 searches to `depth` with no `movetime`, which is what the post-game report
 * wants. `multiPv` defaults to the live-search count; pass 1 when only `evaluation` is read.
 */
export function getAnalysis(
  fen: string,
  depth: number,
  timeLimit: number,
  signal?: AbortSignal,
  history?: PositionHistory,
  slackMs?: number,
  variant?: string,
  multiPv?: number,
  legalMoves?: number,
  onDepthComplete?: (depth: number, lines: MultiPvLine[]) => void,
  options?: SearchOptions,
): Promise<AnalysisResult> {
  return engineWorker.analyze(
    fen,
    depth,
    timeLimit,
    signal,
    history,
    slackMs,
    variant,
    multiPv,
    legalMoves,
    onDepthComplete,
    options,
  );
}

/** Search the most likely reply while the opponent is thinking. */
export function ponderPosition(fen: string, depth: number, history?: PositionHistory): boolean {
  return engineWorker.ponder(fen, depth, history);
}

export function cancelPonder(preserveFen?: string): void {
  engineWorker.cancelPonder(preserveFen);
}

/** Convert the typed UCI result into the move-line shape used by the scheduler. */
export function parseBestLine(data: unknown): BestLine | null {
  if (!data || typeof data !== 'object') return null;
  const result = data as Partial<AnalysisResult>;
  const uci = typeof result.bestmove === 'string' ? result.bestmove.trim() : '';
  if (!result.success || !isValidUciMove(uci)) return null;
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
