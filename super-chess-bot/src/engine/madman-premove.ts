import { canonicalFen, countLegalMoves, type PositionHistory, predictFen } from '../chess/position.js';
import type { Evaluation, MultiPvLine } from '../chess/types.js';
import { MADMAN_MULTI_PV, PREMOVE_PONDER_BRANCHES } from './config.js';
import { capturesOfOfferedPiece, discoverMadmanMoves, selectMadmanMove } from './madman.js';
import { analyzeMadman } from './madman-search.js';
import { isLegalMove } from './premove.js';
import { type AnalysisResult, type BestLine, getAnalysis, parseBestLine } from './service.js';

export interface MadmanPremoveContext {
  identity: object;
  settings: string;
  history?: PositionHistory;
  variant?: string;
}

export interface MadmanPremoveEntry {
  uci: string;
  pv: string;
  evaluation: Evaluation;
  depth: number;
  source: 'prediction' | 'planned' | 'seed' | 'fast' | 'full';
  /** Unknown for reused PV continuations; never infer zero from an earlier root. */
  cpLoss: number | null;
}

const CAPTURE_BRANCHES = 4;
const rank = { prediction: 0, planned: 1, seed: 2, fast: 3, full: 4 };
const historyKey = (history?: PositionHistory) => (history ? `${history.startFen}|${history.moves.join(' ')}` : '');
const sameContext = (a: MadmanPremoveContext, b: MadmanPremoveContext) =>
  a.identity === b.identity &&
  a.settings === b.settings &&
  (a.variant ?? 'standard') === (b.variant ?? 'standard') &&
  historyKey(a.history) === historyKey(b.history);

/** Separate from normal premoves: full FEN, history and explicit evidence on every entry. */
export class MadmanPremoveCache {
  private root: string | null = null;
  private scope: MadmanPremoveContext | null = null;
  private offer: { context: MadmanPremoveContext; moves: string[] } | null = null;
  private entries = new Map<string, { context: MadmanPremoveContext; entry: MadmanPremoveEntry }>();

  clear(): void {
    this.root = null;
    this.scope = null;
    this.offer = null;
    this.entries.clear();
  }

  preserve(fen: string): void {
    const key = canonicalFen(fen, this.scope?.variant);
    if (!key || (key !== this.root && !this.entries.has(key))) this.clear();
  }

  put(rootFen: string, fen: string, context: MadmanPremoveContext, entry: MadmanPremoveEntry): void {
    const key = canonicalFen(fen, context.variant);
    const root = canonicalFen(rootFen, context.variant);
    if (!key || !root || !isLegalMove(fen, entry.uci, context.variant)) return;
    if (this.root !== root || this.scope?.identity !== context.identity || this.scope?.settings !== context.settings)
      this.clear();
    this.root = root;
    this.scope = context;
    const old = this.entries.get(key);
    if (old && sameContext(old.context, context)) {
      const oldMate = (old.entry.evaluation.mate ?? 0) > 0;
      const newMate = (entry.evaluation.mate ?? 0) > 0;
      if ((oldMate && !newMate) || (oldMate === newMate && rank[old.entry.source] > rank[entry.source])) return;
    }
    // Six ordinary replies, four offered-piece captures, and the selected attack continuation.
    if (!this.entries.has(key) && this.entries.size >= PREMOVE_PONDER_BRANCHES + CAPTURE_BRANCHES + 1) return;
    this.entries.set(key, {
      context: {
        ...context,
        history: context.history
          ? { startFen: context.history.startFen, moves: [...context.history.moves] }
          : undefined,
      },
      entry,
    });
  }

  take(fen: string, context: MadmanPremoveContext): MadmanPremoveEntry | null {
    const key = canonicalFen(fen, context.variant);
    const hit = key ? this.entries.get(key) : undefined;
    this.clear();
    return hit && sameContext(hit.context, context) && isLegalMove(fen, hit.entry.uci, context.variant)
      ? hit.entry
      : null;
  }

  captureHints(fen: string, context: MadmanPremoveContext): string[] {
    return this.offer && canonicalFen(fen, context.variant) === this.root && sameContext(this.offer.context, context)
      ? [...this.offer.moves]
      : [];
  }

  seed(fen: string, best: BestLine, context: MadmanPremoveContext): void {
    const root = predictFen(fen, best.uci, context.variant);
    if (!root) return;
    const key = canonicalFen(root, context.variant);
    if (this.root !== key || this.scope?.identity !== context.identity || this.scope?.settings !== context.settings)
      this.clear();
    this.root = key;
    this.scope = context;
    this.offer = {
      context: {
        ...context,
        history: context.history
          ? { startFen: context.history.startFen, moves: [...context.history.moves, best.uci] }
          : undefined,
      },
      moves: capturesOfOfferedPiece(fen, best.uci, context.variant),
    };
    const moves = best.pv.trim().split(/\s+/);
    if (moves.length < 3 || moves[0] !== best.uci) return;
    const target = predictFen(root, moves[1], context.variant);
    if (!target) return;
    const history = context.history
      ? { ...context.history, moves: [...context.history.moves, moves[0], moves[1]] }
      : undefined;
    this.put(
      root,
      target,
      { ...context, history },
      { uci: moves[2], pv: moves.slice(2).join(' '), evaluation: {}, depth: 0, source: 'planned', cpLoss: null },
    );
  }
}

interface PreparationRequest {
  depth: number;
  budget: number;
  captureMoves?: readonly string[];
  signal: AbortSignal;
  current: () => boolean;
  publish: (fen: string, context: MadmanPremoveContext, entry: MadmanPremoveEntry) => void;
}

function complete(
  lines: MultiPvLine[] | undefined,
  moves: readonly string[],
  minimumDepth: number,
): lines is MultiPvLine[] {
  return (
    !!lines &&
    lines.length === moves.length &&
    new Set(lines.map((line) => line.uci)).size === moves.length &&
    lines.every(
      (line) =>
        moves.includes(line.uci) &&
        line.depth >= minimumDepth &&
        line.depth === lines[0].depth &&
        (Number.isFinite(line.evaluation.cp) || Number.isFinite(line.evaluation.mate)),
    )
  );
}

/** Breadth first on one worker. Publish each completed branch before attempting its upgrades. */
export async function prepareMadmanPremoves(
  fen: string,
  context: MadmanPremoveContext,
  request: PreparationRequest,
  analyze: typeof getAnalysis = getAnalysis,
): Promise<void> {
  const live = () => {
    request.signal.throwIfAborted();
    return request.current();
  };
  const search = (target: string, depth: number, multiPv: number, history?: PositionHistory, moves?: string[]) =>
    analyze(
      target,
      depth,
      0,
      request.signal,
      history,
      undefined,
      context.variant,
      multiPv,
      moves?.length ?? countLegalMoves(target, context.variant) ?? undefined,
      undefined,
      { searchMoves: moves, deadline: performance.now() + 80 },
    );
  if (!live()) return;
  let prediction: AnalysisResult | undefined;
  try {
    prediction = await search(fen, 3, PREMOVE_PONDER_BRANCHES, context.history);
  } catch {
    request.signal.throwIfAborted();
  }
  if (!live()) return;
  const branches = new Map<string, { fen: string; context: MadmanPremoveContext }>();
  const addBranch = (uci: string) => {
    const next = predictFen(fen, uci, context.variant);
    if (!next) return null;
    if (!branches.has(next))
      branches.set(next, {
        fen: next,
        context: {
          ...context,
          history: context.history ? { ...context.history, moves: [...context.history.moves, uci] } : undefined,
        },
      });
    return branches.get(next) ?? null;
  };
  // Extra captures lead the fast pass, while all ordinary PV replies are published first.
  const predictions = prediction?.multiPv?.slice(0, PREMOVE_PONDER_BRANCHES) ?? [];
  const ordinary = new Set(predictions.map((line) => line.uci));
  for (const capture of [...new Set(request.captureMoves ?? [])]
    .filter((uci) => !ordinary.has(uci) && isLegalMove(fen, uci, context.variant))
    .slice(0, CAPTURE_BRANCHES))
    addBranch(capture);
  for (const line of predictions) {
    const branch = addBranch(line.uci);
    const moves = line.pv.trim().split(/\s+/);
    if (branch && moves[0] === line.uci && moves.length >= 2 && isLegalMove(branch.fen, moves[1], context.variant)) {
      if (!live()) return;
      request.publish(branch.fen, branch.context, {
        uci: moves[1],
        pv: moves.slice(1).join(' '),
        evaluation: {},
        depth: 0,
        source: 'prediction',
        cpLoss: null,
      });
    }
  }
  for (const branch of branches.values()) {
    if (!live()) return;
    try {
      const seeds = await search(branch.fen, 3, 3, branch.context.history);
      if (!live()) return;
      const seedBest = parseBestLine(seeds);
      const seedLines = seeds.multiPv;
      const expectedSeeds = Math.min(3, countLegalMoves(branch.fen, context.variant) ?? 3);
      if (seedBest && (seedBest.score.mate ?? 0) > 0 && isLegalMove(branch.fen, seedBest.uci, context.variant)) {
        request.publish(branch.fen, branch.context, {
          uci: seedBest.uci,
          pv: seedBest.pv,
          evaluation: seedBest.score,
          depth: seeds.depth,
          source: 'seed',
          cpLoss: 0,
        });
      } else if (
        seeds.success &&
        seedLines?.length === expectedSeeds &&
        complete(
          seedLines,
          seedLines.map((line) => line.uci),
          3,
        )
      ) {
        const early = selectMadmanMove(branch.fen, seedLines, { variant: context.variant, minimumDepth: 3 });
        if (early)
          request.publish(branch.fen, branch.context, { ...early.chosenLine, source: 'seed', cpLoss: early.cpLoss });
      }
      if (!live()) return;
      const existing = [...new Set([seeds.bestmove, ...(seeds.multiPv ?? []).map((line) => line.uci)])]
        .filter((move) => isLegalMove(branch.fen, move, context.variant))
        .slice(0, 3);
      const moves = [...new Set([...existing, ...discoverMadmanMoves(branch.fen, existing, context.variant)])];
      if (!moves.length) continue;
      const batch = await search(branch.fen, 4, moves.length, branch.context.history, moves);
      if (!live()) return;
      const mating = parseBestLine(batch);
      if (
        mating &&
        (mating.score.mate ?? 0) > 0 &&
        moves.includes(mating.uci) &&
        isLegalMove(branch.fen, mating.uci, context.variant)
      ) {
        request.publish(branch.fen, branch.context, {
          uci: mating.uci,
          pv: mating.pv,
          evaluation: mating.score,
          depth: batch.depth,
          source: 'fast',
          cpLoss: 0,
        });
        continue;
      }
      if (!batch.success || !complete(batch.multiPv, moves, 4)) continue;
      const selected = selectMadmanMove(branch.fen, batch.multiPv, { variant: context.variant, minimumDepth: 4 });
      if (selected)
        request.publish(branch.fen, branch.context, {
          ...selected.chosenLine,
          source: 'fast',
          cpLoss: selected.cpLoss,
        });
    } catch {
      request.signal.throwIfAborted();
    }
  }
  for (const branch of branches.values()) {
    if (!live()) return;
    try {
      const budget = Math.max(80, Math.min(250, request.budget));
      const deadline = performance.now() + budget;
      const baseline = await analyze(
        branch.fen,
        request.depth,
        Math.max(1, Math.floor(budget * 0.65)),
        request.signal,
        branch.context.history,
        undefined,
        context.variant,
        MADMAN_MULTI_PV,
        countLegalMoves(branch.fen, context.variant) ?? undefined,
        undefined,
        { deadline },
      );
      if (!live()) return;
      const best = parseBestLine(baseline);
      if (best && (best.score.mate ?? 0) > 0 && isLegalMove(branch.fen, best.uci, context.variant)) {
        request.publish(branch.fen, branch.context, {
          uci: best.uci,
          pv: best.pv,
          evaluation: best.score,
          depth: baseline.depth,
          source: 'full',
          cpLoss: 0,
        });
        continue;
      }
      const lines = baseline.multiPv;
      const expected = Math.min(MADMAN_MULTI_PV, countLegalMoves(branch.fen, context.variant) ?? MADMAN_MULTI_PV);
      if (
        !best ||
        lines?.length !== expected ||
        !complete(
          lines,
          lines.map((line) => line.uci),
          6,
        )
      )
        continue;
      const selected = await analyzeMadman(
        branch.fen,
        best,
        {
          depth: request.depth,
          budget,
          deadline,
          signal: request.signal,
          history: branch.context.history,
          variant: context.variant,
          expectedCount: expected,
        },
        analyze,
      );
      if (!live()) return;
      if (selected && selected.chosenLine.depth >= 6)
        request.publish(branch.fen, branch.context, {
          ...selected.chosenLine,
          source: 'full',
          cpLoss: selected.cpLoss,
        });
    } catch {
      request.signal.throwIfAborted();
    }
  }
}
