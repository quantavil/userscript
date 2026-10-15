import { describe, expect, it, vi } from 'vite-plus/test';
import type { MultiPvLine } from '../../../src/chess/types.js';
import { MadmanPremoveCache, prepareMadmanPremoves } from '../../../src/engine/madman-premove.js';
import type { getAnalysis } from '../../../src/engine/service.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
const context = () => ({
  identity: {},
  settings: 'madman-on',
  history: { startFen: START, moves: [] as string[] },
});
const planned = { uci: 'g1f3', pv: 'g1f3 b8c6 f1c4', score: {} };
const line = (uci: string, cp = 0, depth = 4): MultiPvLine => ({
  uci,
  pv: uci,
  evaluation: { cp },
  depth,
  multipv: 1,
});
const result = (lines: MultiPvLine[]) => ({
  success: true as const,
  bestmove: lines[0].uci,
  pv: lines[0].pv,
  evaluation: lines[0].evaluation,
  depth: lines[0].depth,
  multiPv: lines,
});

describe('Madman premove evidence and context', () => {
  it('seeds only the selected legal attack and retains unknown next-turn concession', () => {
    const cache = new MadmanPremoveCache();
    const ctx = context();
    cache.seed(START, { ...planned, uci: 'e2e4', pv: 'e2e4 e7e5 g1f3 b8c6' }, ctx);
    cache.preserve(AFTER_E4);
    cache.preserve(AFTER_E5);
    expect(cache.take(AFTER_E5, { ...ctx, history: { startFen: START, moves: ['e2e4', 'e7e5'] } })).toMatchObject({
      uci: 'g1f3',
      pv: 'g1f3 b8c6',
      source: 'planned',
      cpLoss: null,
      evaluation: {},
    });
    expect(cache.take(AFTER_E5, ctx)).toBeNull();
    cache.seed(START, { ...planned, uci: 'd2d4', pv: 'e2e4 e7e5 g1f3' }, ctx);
    expect(cache.take(AFTER_E5, ctx)).toBeNull();
  });

  it.each(['identity', 'settings', 'history', 'variant'] as const)('rejects incompatible %s context', (field) => {
    const cache = new MadmanPremoveCache();
    const ctx = context();
    const target = { ...ctx, history: { startFen: START, moves: ['e2e4', 'e7e5'] } };
    cache.seed(START, { ...planned, uci: 'e2e4', pv: 'e2e4 e7e5 g1f3' }, ctx);
    const changed = {
      ...target,
      [field]: field === 'identity' ? {} : field === 'history' ? { startFen: AFTER_E5, moves: [] } : 'different',
    };
    expect(cache.take(AFTER_E5, changed)).toBeNull();
  });

  it('does not reuse entries across changed draw counters or unexpected positions', () => {
    const cache = new MadmanPremoveCache();
    const ctx = context();
    cache.seed(START, { ...planned, uci: 'e2e4', pv: 'e2e4 e7e5 g1f3' }, ctx);
    cache.preserve(START);
    expect(cache.take(AFTER_E5, { ...ctx, history: { startFen: START, moves: ['e2e4', 'e7e5'] } })).toBeNull();
    cache.seed(START, { ...planned, uci: 'e2e4', pv: 'e2e4 e7e5 g1f3' }, ctx);
    expect(
      cache.take(AFTER_E5.replace('0 2', '1 2'), {
        ...ctx,
        history: { startFen: START, moves: ['e2e4', 'e7e5'] },
      }),
    ).toBeNull();
  });

  it('allows evaluated replies to replace planned attacks but never the reverse', () => {
    const cache = new MadmanPremoveCache();
    const ctx = context();
    const target = { ...ctx, history: { startFen: START, moves: ['e2e4', 'e7e5'] } };
    cache.put(AFTER_E4, AFTER_E5, target, {
      uci: 'f1c4',
      pv: 'f1c4',
      evaluation: { cp: -100 },
      depth: 4,
      source: 'fast',
      cpLoss: 120,
    });
    cache.seed(START, { ...planned, uci: 'e2e4', pv: 'e2e4 e7e5 g1f3' }, ctx);
    expect(cache.take(AFTER_E5, target)).toMatchObject({
      uci: 'f1c4',
      source: 'fast',
      cpLoss: 120,
    });
  });

  it('retains en passant rights in matching and rejects illegal replies', () => {
    const cache = new MadmanPremoveCache();
    const ctx = { identity: {}, settings: 'on' };
    const fen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2';
    cache.put(fen, fen, ctx, {
      uci: 'e5d6',
      pv: 'e5d6',
      evaluation: {},
      depth: 0,
      source: 'planned',
      cpLoss: null,
    });
    expect(cache.take(fen.replace(' d6 ', ' - '), ctx)).toBeNull();
    cache.put(fen, fen, ctx, {
      uci: 'e5e7',
      pv: 'e5e7',
      evaluation: {},
      depth: 0,
      source: 'planned',
      cpLoss: null,
    });
    expect(cache.take(fen, ctx)).toBeNull();
  });
});

describe('opponent-clock Madman branch work', () => {
  it('publishes a fresh aggressive comparison before refinement and propagates cancellation', async () => {
    const fen = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5';
    const controller = new AbortController();
    const cache = new MadmanPremoveCache();
    const ctx = { identity: {}, settings: 'on' };
    let published = '';
    const search = vi.fn<typeof getAnalysis>(
      async (_fen, _depth, _time, _signal, _history, _slack, _variant, _multi, _legal, _onDepth, options) => {
        if (!options?.searchMoves) return result([line(_fen === fen ? 'd7d6' : 'h2h3', 20, 3)]);
        expect(options.searchMoves).toContain('f3g5');
        return result(options.searchMoves.map((uci) => line(uci, uci === 'h2h3' ? 20 : -100)));
      },
    );
    await expect(
      prepareMadmanPremoves(
        fen,
        ctx,
        {
          depth: 20,
          budget: 100,
          signal: controller.signal,
          current: () => !controller.signal.aborted,
          publish: (target, targetCtx, entry) => {
            cache.put(fen, target, targetCtx, entry);
            published = target;
            controller.abort();
          },
        },
        search,
      ),
    ).rejects.toThrow();
    expect(cache.take(published, ctx)).toMatchObject({
      uci: 'f3g5',
      source: 'fast',
      depth: 4,
      cpLoss: 120,
    });
  });

  it.each(['fast', 'full'] as const)('preserves a newer winning mate over older %s comparison lines', async (stage) => {
    const root = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5';
    const controller = new AbortController();
    const published: Array<{ source: string; uci: string; evaluation: { mate?: number } }> = [];
    const search = vi.fn<typeof getAnalysis>(
      async (fen, _depth, _time, _signal, _history, _slack, _variant, multi, _legal, _onDepth, options) => {
        if (fen === root) return result([line('d7d6', 20, 3)]);
        if (options?.searchMoves) {
          const old = options.searchMoves.map((uci) => line(uci, uci === 'h2h3' ? 20 : -100));
          return stage === 'fast'
            ? { ...result(old), bestmove: 'h2h3', pv: 'h2h3', evaluation: { mate: 3 }, depth: 5 }
            : result(old);
        }
        if (multi === 6) return { ...result([line('h2h3', 20, 3)]), evaluation: { mate: 2 }, depth: 7 };
        return result([line('h2h3', 20, 3)]);
      },
    );
    await prepareMadmanPremoves(
      root,
      { identity: {}, settings: 'on' },
      {
        depth: 20,
        budget: 100,
        signal: controller.signal,
        current: () => true,
        publish: (_target, _context, entry) => {
          published.push(entry);
          if (entry.source === stage) controller.abort();
        },
      },
      search,
    ).catch(() => undefined);
    expect(published.at(-1)).toMatchObject({
      source: stage,
      uci: 'h2h3',
      evaluation: { mate: stage === 'fast' ? 3 : 2 },
    });
  });

  it('prepares all six fast branches before publishing full upgrades', async () => {
    const sources: string[] = [];
    const search = vi.fn<typeof getAnalysis>(
      async (fen, _depth, time, _signal, _history, _slack, _variant, multi, _legal, _onDepth, options) => {
        if (fen === AFTER_E4)
          return result(['e7e5', 'c7c5', 'e7e6', 'd7d5', 'b8c6', 'g8f6'].map((uci) => line(uci, 0, 3)));
        if (options?.searchMoves) return result(options.searchMoves.map((uci) => line(uci, 0, time === 0 ? 4 : 8)));
        const moves = ['g1f3', 'b1c3', 'f1c4', 'd2d4', 'd2d3', 'a2a3'].slice(0, multi);
        return result(moves.map((uci) => line(uci, 0, multi === 6 ? 8 : 3)));
      },
    );
    await prepareMadmanPremoves(
      AFTER_E4,
      { identity: {}, settings: 'on' },
      {
        depth: 20,
        budget: 100,
        signal: new AbortController().signal,
        current: () => true,
        publish: (_fen, _context, entry) => sources.push(entry.source),
      },
      search,
    );
    expect(sources.filter((source) => source !== 'seed')).toEqual([
      'fast',
      'fast',
      'fast',
      'fast',
      'fast',
      'fast',
      'full',
      'full',
      'full',
      'full',
      'full',
      'full',
    ]);
  });

  it('does not publish incomplete restricted batches', async () => {
    const publish = vi.fn();
    const search = vi.fn<typeof getAnalysis>(
      async (_fen, _depth, _time, _signal, _history, _slack, _variant, _multi, _legal, _onDepth, options) =>
        options?.searchMoves ? result([line('g1f3')]) : result([line(_fen === AFTER_E4 ? 'e7e5' : 'g1f3', 20, 3)]),
    );
    await prepareMadmanPremoves(
      AFTER_E4,
      context(),
      {
        depth: 20,
        budget: 100,
        signal: new AbortController().signal,
        current: () => true,
        publish,
      },
      search,
    );
    expect(publish).not.toHaveBeenCalled();
  });
});

describe('earlier aggressive replies and offered-piece punishments', () => {
  it('fills empty branches from prediction PVs before the next search finishes', async () => {
    const cache = new MadmanPremoveCache();
    const ctx = { identity: {}, settings: 'on' };
    const controller = new AbortController();
    let searched = false;
    const search = vi.fn<typeof getAnalysis>(async () => {
      if (!searched) {
        searched = true;
        return result([{ ...line('e7e5', 99, 3), pv: 'e7e5 g1f3 b8c6' }]);
      }
      controller.abort();
      throw new Error('stopped after prediction');
    });
    await prepareMadmanPremoves(
      AFTER_E4,
      ctx,
      {
        depth: 20,
        budget: 100,
        signal: controller.signal,
        current: () => true,
        publish: (fen, targetCtx, entry) => cache.put(AFTER_E4, fen, targetCtx, entry),
      },
      search,
    ).catch(() => undefined);
    expect(cache.take(AFTER_E5, ctx)).toMatchObject({
      uci: 'g1f3',
      pv: 'g1f3 b8c6',
      source: 'prediction',
      evaluation: {},
      cpLoss: null,
      depth: 0,
    });
  });

  it('publishes an aggressive depth-three choice before the restricted search finishes', async () => {
    const root = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5';
    const controller = new AbortController();
    const entries: Array<{ source: string; uci: string; cpLoss: number | null }> = [];
    const search = vi.fn<typeof getAnalysis>(
      async (fen, _depth, _time, _signal, _history, _slack, _variant, _multi, _legal, _onDepth, options) => {
        if (fen === root) return result([line('d7d6', 20, 3)]);
        if (options?.searchMoves) {
          controller.abort();
          throw new Error('interrupted restricted comparison');
        }
        return result([line('h2h3', 20, 3), line('f3g5', -100, 3), line('d2d3', 20, 3)]);
      },
    );
    await prepareMadmanPremoves(
      root,
      { identity: {}, settings: 'on' },
      {
        depth: 20,
        budget: 100,
        signal: controller.signal,
        current: () => true,
        publish: (_fen, _ctx, entry) => entries.push(entry),
      },
      search,
    ).catch(() => undefined);
    expect(entries).toContainEqual(expect.objectContaining({ source: 'seed', uci: 'f3g5', depth: 3, cpLoss: 120 }));
  });

  it('keeps capture hints after an observed offer even with a short PV and rejects other histories', () => {
    const cache = new MadmanPremoveCache();
    const fen = '6k1/5ppp/8/8/8/8/3Q1PPP/6K1 w - - 0 1';
    const after = '6k1/5ppp/7Q/8/8/8/8/5PPP/6K1 b - - 1 1';
    const target = '6k1/5ppp/7Q/8/8/8/5PPP/6K1 b - - 1 1';
    const ctx = { identity: {}, settings: 'on', history: { startFen: fen, moves: [] as string[] } };
    cache.seed(fen, { uci: 'd2h6', pv: 'd2h6', score: { cp: -100 } }, ctx);
    const observed = { ...ctx, history: { startFen: fen, moves: ['d2h6'] } };
    expect(cache.captureHints(target, observed)).toEqual(['g7h6']);
    expect(cache.captureHints(after, observed)).toEqual([]);
    expect(cache.captureHints(target, { ...observed, history: { startFen: target, moves: [] } })).toEqual([]);
  });

  it('never replaces the selected attack continuation with a raw prediction', () => {
    const cache = new MadmanPremoveCache();
    const ctx = context();
    const target = { ...ctx, history: { startFen: START, moves: ['e2e4', 'e7e5'] } };
    cache.seed(START, { ...planned, uci: 'e2e4', pv: 'e2e4 e7e5 g1f3' }, ctx);
    cache.put(AFTER_E4, AFTER_E5, target, {
      uci: 'a2a3',
      pv: 'a2a3',
      source: 'prediction',
      evaluation: {},
      depth: 0,
      cpLoss: null,
    });
    expect(cache.take(AFTER_E5, target)).toMatchObject({ uci: 'g1f3', source: 'planned' });
  });

  it.each([false, true])('prepares an omitted capture even when prediction fails: %s', async (predictionFails) => {
    const root = '6k1/5ppp/7Q/8/8/8/5PPP/6K1 b - - 1 1';
    const captured = '6k1/5p1p/7p/8/8/8/5PPP/6K1 w - - 0 2';
    const controller = new AbortController();
    const entries: Array<{ fen: string; uci: string }> = [];
    const search = vi.fn<typeof getAnalysis>(
      async (fen, _depth, _time, _signal, _history, _slack, _variant, _multi, _legal, _onDepth, options) => {
        if (fen === root) {
          if (predictionFails) throw new Error('prediction unavailable');
          return result([line('f7f6', 0, 3)]);
        }
        if (fen !== captured) throw new Error('unrelated branch');
        if (options?.searchMoves) return result(options.searchMoves.map((uci) => line(uci)));
        return result(['f2f3', 'g2g3', 'h2h3'].map((uci) => line(uci, 0, 3)));
      },
    );
    await prepareMadmanPremoves(
      root,
      { identity: {}, settings: 'on' },
      {
        depth: 20,
        budget: 100,
        signal: controller.signal,
        current: () => true,
        captureMoves: ['g7h6', 'g8h6', 'bad'],
        publish: (fen, _ctx, entry) => {
          entries.push({ fen, uci: entry.uci });
          controller.abort();
        },
      },
      search,
    ).catch(() => undefined);
    expect(entries).toEqual([expect.objectContaining({ fen: captured })]);
  });
});

describe('evaluated premove priority', () => {
  it('keeps a known winning mate over a later nonmating full comparison', () => {
    const cache = new MadmanPremoveCache();
    const ctx = { identity: {}, settings: 'on' };
    cache.put(AFTER_E4, AFTER_E5, ctx, {
      uci: 'f1c4',
      pv: 'f1c4',
      evaluation: { mate: 3 },
      depth: 4,
      source: 'fast',
      cpLoss: 0,
    });
    cache.put(AFTER_E4, AFTER_E5, ctx, {
      uci: 'a2a3',
      pv: 'a2a3',
      evaluation: { cp: 0 },
      depth: 8,
      source: 'full',
      cpLoss: 0,
    });
    expect(cache.take(AFTER_E5, ctx)).toMatchObject({ uci: 'f1c4', evaluation: { mate: 3 } });
  });

  it('does not let a shallow seed overwrite a completed attacking comparison', () => {
    const cache = new MadmanPremoveCache();
    const ctx = { identity: {}, settings: 'on' };
    cache.put(AFTER_E4, AFTER_E5, ctx, {
      uci: 'f1c4',
      pv: 'f1c4',
      evaluation: { cp: -100 },
      depth: 4,
      source: 'fast',
      cpLoss: 120,
    });
    cache.put(AFTER_E4, AFTER_E5, ctx, {
      uci: 'a2a3',
      pv: 'a2a3',
      evaluation: { cp: 0 },
      depth: 3,
      source: 'seed',
      cpLoss: 0,
    });
    expect(cache.take(AFTER_E5, ctx)).toMatchObject({ uci: 'f1c4', source: 'fast' });
  });
});

it.each([
  {
    fen: '6k1/8/8/8/3p4/8/4P3/6K1 w - - 0 1',
    uci: 'e2e4',
    after: '6k1/8/8/8/3pP3/8/8/6K1 b - e3 0 1',
    capture: 'd4e3',
  },
  {
    fen: '6k1/4p3/8/3P4/8/8/8/6K1 b - - 0 1',
    uci: 'e7e5',
    after: '6k1/8/8/3Pp3/8/8/8/6K1 w - e6 0 2',
    capture: 'd5e6',
  },
])('prepares en passant after offering $uci', ({ fen, uci, after, capture }) => {
  const cache = new MadmanPremoveCache();
  const ctx = { identity: {}, settings: 'on' };
  cache.seed(fen, { uci, pv: uci, score: { cp: 0 } }, ctx);
  expect(cache.captureHints(after, ctx)).toEqual([capture]);
});
