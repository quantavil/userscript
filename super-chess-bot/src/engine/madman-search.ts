import { makeFen } from 'chessops/fen';
import { loadPosition, type PositionHistory, parseEngineUci } from '../chess/position.js';
import { MADMAN_DISCOVERY_MIN_BUDGET_MS, MADMAN_MAX_LOSS_CP, MADMAN_VERIFY_MIN_BUDGET_MS } from './config.js';
import { discoverMadmanMoves, type MadmanSelection, selectMadmanMove } from './madman.js';
import { type BestLine, getAnalysis } from './service.js';

interface MadmanRequest {
  depth: number;
  budget: number;
  deadline: number;
  signal: AbortSignal;
  history?: PositionHistory;
  variant?: string;
  bookMove?: string | null;
  expectedCount?: number;
}

/** Optional work fails back to the completed baseline; cancellation always propagates. */
export async function analyzeMadman(
  fen: string,
  baseline: BestLine,
  request: MadmanRequest,
  analyze: typeof getAnalysis = getAnalysis,
): Promise<MadmanSelection | null> {
  request.signal.throwIfAborted();
  const lines = baseline.multiPv?.length
    ? baseline.multiPv
    : [
        {
          uci: baseline.uci,
          pv: baseline.pv,
          evaluation: baseline.score,
          depth: 0,
          multipv: 1,
        },
      ];
  const options = { variant: request.variant };
  const anchor = lines.find((line) => line.uci === baseline.uci);
  const authoritative = {
    uci: baseline.uci,
    pv: baseline.pv,
    evaluation: baseline.score,
    depth: anchor?.depth ?? 0,
    multipv: 1,
  };
  const fallback = selectMadmanMove(fen, [authoritative], options);
  if ((baseline.score.mate ?? 0) > 0) return fallback;
  const complete =
    lines.length === (request.expectedCount ?? lines.length) &&
    !!anchor &&
    anchor.depth >= 6 &&
    Number.isFinite(baseline.score.cp) &&
    Number.isFinite(anchor.evaluation.cp) &&
    Math.abs((baseline.score.cp ?? 0) - (anchor.evaluation.cp ?? 0)) <= MADMAN_MAX_LOSS_CP;
  let selection = complete ? selectMadmanMove(fen, lines, options) : fallback;
  if (selection && Number.isFinite(baseline.score.cp)) {
    const loss = Math.max(selection.cpLoss, (baseline.score.cp ?? 0) - (selection.chosenLine.evaluation.cp ?? 0));
    selection = loss <= MADMAN_MAX_LOSS_CP ? { ...selection, cpLoss: Math.max(0, loss) } : fallback;
  }
  if (selection?.chosenLine.uci === baseline.uci) selection = fallback;
  const remaining = () => Math.floor(request.deadline - performance.now());
  const pos = loadPosition(fen, request.variant);
  if (!selection || !pos || remaining() < 8) return selection;
  const proposals = discoverMadmanMoves(
    fen,
    lines.map((line) => line.uci),
    request.variant,
  );
  if (request.bookMove && !lines.some((line) => line.uci === request.bookMove)) {
    const move = parseEngineUci(pos, request.bookMove);
    if (move && pos.isLegal(move)) proposals.unshift(request.bookMove);
  }
  const searchMoves = [...new Set([baseline.uci, ...proposals])].slice(0, 5);
  if (
    request.budget >= MADMAN_DISCOVERY_MIN_BUDGET_MS &&
    remaining() >= 8 &&
    searchMoves.length > 1 &&
    Number.isFinite(anchor?.evaluation.cp)
  ) {
    try {
      const probe = await analyze(
        fen,
        request.depth,
        Math.max(1, Math.floor(remaining() * 0.75)),
        request.signal,
        request.history,
        undefined,
        request.variant,
        searchMoves.length,
        searchMoves.length,
        undefined,
        { searchMoves, deadline: request.deadline },
      );
      request.signal.throwIfAborted();
      const batch = probe.multiPv;
      const batchAnchor = batch?.find((line) => line.uci === baseline.uci);
      // Complete same-depth root comparisons, with a conservative anchor stability check.
      if (
        probe.success &&
        batch &&
        batch.length === searchMoves.length &&
        batchAnchor &&
        batchAnchor.depth >= 6 &&
        Number.isFinite(batchAnchor.evaluation.cp) &&
        Math.abs((batchAnchor.evaluation.cp ?? 0) - (anchor?.evaluation.cp ?? 0)) <= MADMAN_MAX_LOSS_CP &&
        batch.every(
          (line) =>
            searchMoves.includes(line.uci) && line.depth === batchAnchor.depth && Number.isFinite(line.evaluation.cp),
        ) &&
        new Set(batch.map((line) => line.uci)).size === batch.length
      ) {
        const discovered = selectMadmanMove(fen, batch, options);
        const loss = discovered
          ? Math.max(
              discovered.cpLoss,
              (anchor?.evaluation.cp ?? 0) - (discovered.chosenLine.evaluation.cp ?? 0),
              (baseline.score.cp ?? 0) - (discovered.chosenLine.evaluation.cp ?? 0),
            )
          : Infinity;
        if (discovered && loss <= MADMAN_MAX_LOSS_CP && discovered.aggression > selection.aggression) {
          selection = { ...discovered, cpLoss: Math.max(0, loss) };
        }
      }
    } catch (error) {
      if (request.signal.aborted) throw error;
    }
  }

  if (
    request.budget >= MADMAN_VERIFY_MIN_BUDGET_MS &&
    remaining() >= 20 &&
    selection.captureMoves.length > 0 &&
    Number.isFinite(selection.chosenLine.evaluation.cp)
  ) {
    const move = parseEngineUci(pos, selection.chosenLine.uci);
    if (!move || !pos.isLegal(move)) return selection;
    pos.play(move);
    const captureMoves = selection.captureMoves;
    try {
      const history = request.history
        ? { ...request.history, moves: [...request.history.moves, selection.chosenLine.uci] }
        : undefined;
      const probe = await analyze(
        makeFen(pos.toSetup()),
        Math.min(request.depth, 10),
        Math.max(1, remaining()),
        request.signal,
        history,
        undefined,
        request.variant,
        1,
        captureMoves.length,
        undefined,
        { searchMoves: captureMoves, deadline: request.deadline },
      );
      request.signal.throwIfAborted();
      // Opponent-root score: a negative value is good for the original mover.
      if (
        probe.success &&
        probe.depth >= 6 &&
        captureMoves.includes(probe.bestmove) &&
        Number.isFinite(probe.evaluation.cp) &&
        -(probe.evaluation.cp ?? 0) - (selection.chosenLine.evaluation.cp ?? 0) >= 100
      ) {
        selection = { ...selection, verifiedOffer: true };
      }
    } catch (error) {
      if (request.signal.aborted) throw error;
    }
  }
  return selection;
}
