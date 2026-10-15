import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { MultiPvLine } from '../../../src/chess/types.js';
import { analyzeMadman } from '../../../src/engine/madman-search.js';
import type { BestLine, getAnalysis } from '../../../src/engine/service.js';

const FEN = 'rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w - - 4 5';
const line = (uci: string, cp: number): MultiPvLine => ({
  uci,
  pv: uci,
  evaluation: { cp },
  depth: 8,
  multipv: 1,
});
const baseline: BestLine = {
  uci: 'h2h3',
  pv: 'h2h3',
  score: { cp: 20 },
  multiPv: [line('h2h3', 20)],
};
const request = () => ({
  depth: 20,
  budget: 100,
  deadline: performance.now() + 100,
  signal: new AbortController().signal,
});

describe('bounded Madman discovery', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the current engine move when the complete snapshot is too shallow for risk', async () => {
    const shallow = {
      ...baseline,
      multiPv: [
        { ...line('h2h3', 20), depth: 4 },
        { ...line('f3g5', 30), depth: 4 },
      ],
    };
    const result = await analyzeMadman(FEN, shallow, {
      ...request(),
      deadline: performance.now() - 1,
    });
    expect(result?.chosenLine.uci).toBe('h2h3');
  });

  it('retains the authoritative engine move on incomplete baseline comparisons', async () => {
    const partial = { ...baseline, multiPv: [line('h2h3', 20), line('f3g5', -100)] };
    const result = await analyzeMadman(FEN, partial, {
      ...request(),
      expectedCount: 6,
      deadline: performance.now() - 1,
    });
    expect(result?.chosenLine.uci).toBe('h2h3');
    expect(result?.cpLoss).toBe(0);
  });

  it('preserves a new positive mate even when the completed snapshot is older', async () => {
    const mate = {
      ...baseline,
      score: { mate: 3 },
      multiPv: [line('h2h3', 20), line('f3g5', -100)],
    };
    const result = await analyzeMadman(FEN, mate, {
      ...request(),
      deadline: performance.now() - 1,
    });
    expect(result?.chosenLine.uci).toBe('h2h3');
    expect(result?.chosenLine.evaluation).toEqual({ mate: 3 });
  });

  it('evaluates extra candidates alongside the baseline and selects pressure outside the original lines', async () => {
    const search = vi.fn<typeof getAnalysis>(
      async (_fen, _depth, ms, _signal, _history, _slack, _variant, _multiPv, _legal, _onDepth, options) => {
        expect(ms).toBeGreaterThan(0);
        expect(options?.searchMoves).toContain('h2h3');
        expect(options?.searchMoves).toContain('f3g5');
        const lines = (options?.searchMoves ?? []).map((uci: string) => line(uci, uci === 'h2h3' ? 20 : -100));
        return {
          success: true,
          bestmove: 'h2h3',
          pv: 'h2h3',
          depth: 8,
          evaluation: { cp: 20 },
          multiPv: lines,
        };
      },
    );
    const result = await analyzeMadman(FEN, baseline, request(), search);
    expect(result?.chosenLine.uci).toBe('f3g5');
    expect(result?.cpLoss).toBe(120);
  });

  it('does not start optional work after expiration and keeps the baseline on probe failure', async () => {
    const search = vi.fn().mockRejectedValue(new Error('worker failed'));
    expect(
      (await analyzeMadman(FEN, baseline, { ...request(), deadline: performance.now() - 1 }, search))?.chosenLine.uci,
    ).toBe('h2h3');
    expect(search).not.toHaveBeenCalled();
    expect((await analyzeMadman(FEN, baseline, request(), search))?.chosenLine.uci).toBe('h2h3');
  });

  it('rejects incomplete and optimistic candidate batches', async () => {
    const search = vi.fn().mockResolvedValue({
      success: true,
      bestmove: 'f3g5',
      pv: 'f3g5',
      depth: 8,
      evaluation: { cp: 0 },
      multiPv: [line('f3g5', 0)],
    });
    expect((await analyzeMadman(FEN, baseline, request(), search))?.chosenLine.uci).toBe('h2h3');
    search.mockImplementation(async (...args) => ({
      success: true,
      bestmove: 'h2h3',
      pv: 'h2h3',
      depth: 8,
      evaluation: { cp: 500 },
      multiPv: args[10].searchMoves.map((uci: string) => line(uci, 500)),
    }));
    expect((await analyzeMadman(FEN, baseline, request(), search))?.chosenLine.uci).toBe('h2h3');
  });

  it('propagates session cancellation instead of using a stale fallback', async () => {
    const controller = new AbortController();
    const search = vi.fn(async () => {
      controller.abort();
      throw new Error('canceled');
    });
    await expect(analyzeMadman(FEN, baseline, { ...request(), signal: controller.signal }, search)).rejects.toThrow();
  });

  it('verifies a legal capture from the opponent perspective without inflating the root score', async () => {
    const fen = '6k1/5ppp/8/8/8/8/3Q1PPP/6K1 w - - 0 1';
    const offered: BestLine = {
      uci: 'd2h6',
      pv: 'd2h6',
      score: { cp: 0 },
      multiPv: [line('d2h6', 0)],
    };
    const search = vi
      .fn()
      .mockResolvedValueOnce({ success: false, bestmove: '', pv: '', depth: 0, evaluation: {} })
      .mockResolvedValueOnce({
        success: true,
        bestmove: 'g7h6',
        pv: 'g7h6',
        depth: 8,
        evaluation: { cp: -200 },
        multiPv: [line('g7h6', -200)],
      });
    const result = await analyzeMadman(
      fen,
      offered,
      { ...request(), budget: 500, deadline: performance.now() + 500 },
      search,
    );
    expect(search.mock.calls[1][0].split(' ')[1]).toBe('b');
    expect(search.mock.calls[1][10].searchMoves).toEqual(['g7h6']);
    expect(result?.verifiedOffer).toBe(true);
    expect(result?.chosenLine.evaluation.cp).toBe(0);
  });
});
