import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  countPiecesOnBoard,
  isTablebaseEligible,
  pickBestTablebaseMove,
  type TablebaseMove,
} from '../../../src/engine/tablebase.js';

let lookupTablebase: typeof import('../../../src/engine/tablebase.js').lookupTablebase;

describe('syzygy tablebase client', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ lookupTablebase } = await import('../../../src/engine/tablebase.js'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('piece counting and eligibility', () => {
    it('counts pieces on board accurately', () => {
      expect(countPiecesOnBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(32);
      expect(countPiecesOnBoard('8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1')).toBe(3);
      expect(countPiecesOnBoard('4k3/8/8/8/8/8/8/4K3 w - - 0 1')).toBe(2);
      expect(countPiecesOnBoard('')).toBe(32);
    });

    it('identifies tablebase eligibility for <= 7 pieces with valid kings', () => {
      // 32 pieces -> false
      expect(isTablebaseEligible('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(false);
      // 3 pieces -> true
      expect(isTablebaseEligible('8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1')).toBe(true);
      // Exactly 7 pieces -> true
      expect(isTablebaseEligible('8/8/1k1p4/2p2p2/3P4/4B3/4K3/8 w - - 0 1')).toBe(true);
      // 8 pieces -> false
      expect(isTablebaseEligible('8/8/1k1p1p2/2p2p2/3P4/4B3/4K3/8 w - - 0 1')).toBe(false);
      // Missing white king -> false
      expect(isTablebaseEligible('8/8/8/8/4k3/8/8/4Q3 w - - 0 1')).toBe(false);
      // Missing black king -> false
      expect(isTablebaseEligible('8/8/8/8/8/8/4K3/4Q3 w - - 0 1')).toBe(false);
      // Malformed FEN without 7 slashes -> false
      expect(isTablebaseEligible('invalid fen string')).toBe(false);
    });
  });

  describe('pickBestTablebaseMove', () => {
    it('returns null for empty moves', () => {
      expect(pickBestTablebaseMove([])).toBeNull();
    });

    it('picks the winning move (opponent loss) over draw or losing blunder', () => {
      const moves: TablebaseMove[] = [
        { uci: 'e2e3', wdl: 0, category: 'draw', dtz: 0 },
        { uci: 'e2e4', wdl: -2, category: 'loss', dtz: -4 }, // opponent in loss = player win
        { uci: 'e2d1', wdl: 2, category: 'win', dtz: 5 }, // opponent in win = player loss
      ];
      const best = pickBestTablebaseMove(moves);
      expect(best?.uci).toBe('e2e4');
    });

    it('prefers a winning zeroing move over a waiting move with smaller |dtz|', () => {
      const moves: TablebaseMove[] = [
        { uci: 'e2e3', wdl: -2, category: 'loss', dtz: -2, zeroing: false }, // waiting move: |dtz| = 2
        { uci: 'e2d4', wdl: -2, category: 'loss', dtz: -10, zeroing: true }, // zeroing move: |dtz| = 10
      ];
      const best = pickBestTablebaseMove(moves);
      expect(best?.uci).toBe('e2d4');
    });

    it('when immediate checkmate exists, prioritizes it over longer winning moves', () => {
      const moves: TablebaseMove[] = [
        { uci: 'e1a5', wdl: -2, category: 'loss', dtz: -12, dtm: -12 },
        { uci: 'e1g1', wdl: -2, category: 'loss', dtz: -1, dtm: -1, checkmate: true },
      ];
      const best = pickBestTablebaseMove(moves);
      expect(best?.uci).toBe('e1g1');
    });

    it('when multiple winning moves exist, picks fastest win (smallest distance)', () => {
      const moves: TablebaseMove[] = [
        { uci: 'e2e3', wdl: -2, category: 'loss', dtz: -12, dtm: -12 },
        { uci: 'e2e4', wdl: -2, category: 'loss', dtz: -4, dtm: -4 },
        { uci: 'e2d2', wdl: -2, category: 'loss', dtz: -8, dtm: -8 },
      ];
      const best = pickBestTablebaseMove(moves);
      expect(best?.uci).toBe('e2e4');
    });

    it('when forced losing, picks most stubborn defense (largest distance)', () => {
      const moves: TablebaseMove[] = [
        { uci: 'e2e3', wdl: 2, category: 'win', dtz: 3, dtm: 3 },
        { uci: 'e2e4', wdl: 2, category: 'win', dtz: 11, dtm: 11 },
        { uci: 'e2d2', wdl: 2, category: 'win', dtz: 5, dtm: 5 },
      ];
      const best = pickBestTablebaseMove(moves);
      expect(best?.uci).toBe('e2e4');
    });

    it('never compares one move DTM against another move DTZ', () => {
      // DTM counts full moves and DTZ counts plies. Here the only usable comparison is DTZ,
      // and the smaller DTZ (e2e4, dtz 1) is the faster win even though its opponent move
      // carries the smaller DTM.
      const mixed: TablebaseMove[] = [
        { uci: 'e2e3', wdl: -2, category: 'loss', dtz: 20, dtm: 1 },
        { uci: 'e2e4', wdl: -2, category: 'loss', dtz: 1 },
      ];
      expect(pickBestTablebaseMove(mixed)?.uci).toBe('e2e4');

      const onlyDtm: TablebaseMove[] = [
        { uci: 'e2e3', wdl: -2, category: 'loss', dtz: 20, dtm: 1 },
        { uci: 'e2e4', wdl: -2, category: 'loss', dtz: 1, dtm: 3 },
      ];
      expect(pickBestTablebaseMove(onlyDtm)?.uci).toBe('e2e3');
    });

    it('ranks known outcomes above an unclassified one and cursed below blessed', () => {
      // Syzygy categories describe the opponent's outcome, so a higher rank is better for us:
      // loss (opponent loses) > blessed-loss > draw > cursed-win > win (opponent wins).
      const every: TablebaseMove[] = [
        { uci: 'a1a1', category: 'win', dtz: 1 },
        { uci: 'b1b1', category: 'cursed-win', dtz: 1 },
        { uci: 'c1c1', category: 'draw', dtz: 0 },
        { uci: 'd1d1', category: 'blessed-loss', dtz: 1 },
        { uci: 'e1e1', category: 'loss', dtz: 1 },
        { uci: 'f1f1', category: 'unknown', dtz: 1 },
      ];
      const ranked: string[] = [];
      let pool = [...every];
      while (pool.length > 0) {
        const best = pickBestTablebaseMove(pool);
        ranked.push(best?.uci ?? '');
        pool = pool.filter((move) => move.uci !== best?.uci);
      }
      expect(ranked).toEqual(['e1e1', 'd1d1', 'c1c1', 'b1b1', 'a1a1', 'f1f1']);
    });

    it('prefers a known outcome over an unclassified move in both directions', () => {
      expect(
        pickBestTablebaseMove([
          { uci: 'a1a1', category: 'unknown', dtz: 1 },
          { uci: 'b1b1', category: 'win', dtz: 1 },
        ])?.uci,
      ).toBe('b1b1');
      expect(
        pickBestTablebaseMove([
          { uci: 'b1b1', category: 'loss', dtz: 1 },
          { uci: 'a1a1', category: 'unknown', dtz: 1 },
        ])?.uci,
      ).toBe('b1b1');
    });
  });

  describe('lookupTablebase network queries', () => {
    it('returns null immediately for ineligible positions without calling fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await lookupTablebase('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('parses valid tablebase API responses correctly', async () => {
      const mockResponse = {
        category: 'win',
        dtz: 6,
        dtm: 4,
        moves: [
          { uci: 'e1e2', category: 'loss', dtz: -5, dtm: -3 }, // winning move for player
          { uci: 'e1d1', category: 'draw', dtz: 0, dtm: 0 },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const result = await lookupTablebase('8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1');
      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.category).toBe('win');
      expect(result?.bestMove).toBe('e1e2');
      expect(result?.evaluation.mate).toBe(2);
      expect(result?.displayEval).toContain('+M2');
    });

    it('handles network errors gracefully by returning null', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const result = await lookupTablebase('8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1');
      expect(result).toBeNull();
    });

    it('handles HTTP error status by returning null', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not found', { status: 404 }));
      const result = await lookupTablebase('8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1');
      expect(result).toBeNull();
    });
  });
});

describe('tablebase reliability', () => {
  const fen = '8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1';

  /** Distinct, legal 3-piece positions: the White queen anywhere, the White king on the first rank. */
  function distinctPositions(count: number): string[] {
    const out: string[] = [];
    for (let queen = 0; queen < 64 && out.length < count; queen++) {
      for (let king = 0; king < 8 && out.length < count; king++) {
        if (Math.floor(queen / 8) === 0 && queen % 8 === king) continue;
        const ranks: string[] = [];
        for (let rank = 7; rank >= 0; rank--) {
          let row = '';
          for (let file = 7; file >= 0; file--) {
            if (rank === 0 && file === king) row += 'K';
            else if (rank === 7 && file === 4) row += 'k';
            else if (rank === Math.floor(queen / 8) && file === queen % 8) row += 'Q';
            else row += '1';
          }
          ranks.push(row);
        }
        out.push(`${ranks.join('/')} w - - 0 1`);
      }
    }
    return out;
  }
  beforeEach(async () => {
    vi.resetModules();
    ({ lookupTablebase } = await import('../../../src/engine/tablebase.js'));
  });
  afterEach(() => vi.restoreAllMocks());
  function respond(category = 'win', dtm: number | null = null) {
    return new Response(
      JSON.stringify({
        category,
        dtz: 18,
        dtm,
        moves: [{ uci: 'e1e2', category: 'loss', dtz: -17 }],
      }),
    );
  }
  it.each(['win', 'loss', 'maybe-win', 'maybe-loss', 'cursed-win', 'blessed-loss', 'unknown'])(
    'reports the outcome for %s with DTZ only, without inventing a mate distance',
    async (category) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond(category));
      const result = await lookupTablebase(fen);
      expect(result?.evaluation.mate).toBeUndefined();
      expect(result?.displayEval.toLowerCase()).toContain(category);
      expect(result?.dtz).toBe(18);
      expect(result?.dtm).toBeNull();
      // A decided outcome must not read as "no score", but an undecided one has no cp score either.
      const decided = category === 'win' || category === 'loss';
      expect(result?.evaluation.cp).toBe(decided ? (category === 'win' ? 1000 : -1000) : undefined);
    },
  );
  it('does not fetch for an already-aborted request, even after caching', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond());
    await lookupTablebase(fen);
    const controller = new AbortController();
    controller.abort();
    expect(await lookupTablebase(fen, controller.signal)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('reuses a position across move counters, which Syzygy does not index on', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());
    await lookupTablebase(fen);
    await lookupTablebase(fen);
    // Same board, side, castling and ep target: only the counters differ.
    await lookupTablebase(fen.replace('0 1', '99 1'));
    await lookupTablebase(fen.replace('0 1', '0 2'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('still distinguishes genuinely different positions', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());
    await lookupTablebase(fen);
    await lookupTablebase(fen.replace(' w ', ' b '));
    await lookupTablebase(fen.replace('4Q3', '4R3'));
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('holds a rate-limited position out of the network until the cooldown passes', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 429 }));
    expect(await lookupTablebase(fen)).toBeNull();
    expect(await lookupTablebase(fen)).toBeNull();
    expect(await lookupTablebase(fen)).toBeNull();
    // A 429 must not turn into one request per ply.
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('bounds and evicts cached results instead of growing with every position', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());
    // More distinct positions than the cache holds, so the earliest entries must be dropped.
    const boards = distinctPositions(320);
    expect(new Set(boards).size).toBe(boards.length);
    for (const board of boards) await lookupTablebase(board);
    expect(fetch).toHaveBeenCalledTimes(boards.length);

    // The most recent entry is still cached; the first one has long since been evicted.
    expect(await lookupTablebase(boards.at(-1) as string)).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(boards.length);
    expect(await lookupTablebase(boards[0])).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(boards.length + 1);
  });

  it('keeps a recently reused position cached in preference to a colder one', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());
    const [first, ...rest] = distinctPositions(300);
    for (const board of rest) await lookupTablebase(board);
    // Re-read the coldest entry, which makes it the most recent again.
    await lookupTablebase(first as string);
    for (const board of distinctPositions(300).slice(1)) await lookupTablebase(board);
    expect(await lookupTablebase(first as string)).not.toBeNull();
    // It was touched, so it survived the second pass of insertions.
    expect(fetch).toHaveBeenCalledTimes(600);
  });
});

describe('tablebase late cancellation', () => {
  afterEach(() => vi.restoreAllMocks());
  it('does not return or cache a response that arrives after cancellation', async () => {
    vi.resetModules();
    const { lookupTablebase } = await import('../../../src/engine/tablebase.js');
    const fen = '8/8/8/8/4k3/8/4K3/4Q3 w - - 0 1';
    let release!: (response: Response) => void;
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const controller = new AbortController();
    const request = lookupTablebase(fen, controller.signal);
    controller.abort();
    release(
      new Response(
        JSON.stringify({
          category: 'win',
          dtz: 3,
          moves: [{ uci: 'e1e2', dtz: -2, category: 'loss' }],
        }),
      ),
    );
    expect(await request).toBeNull();
    fetch.mockResolvedValueOnce(new Response('fail', { status: 503 }));
    expect(await lookupTablebase(fen)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
