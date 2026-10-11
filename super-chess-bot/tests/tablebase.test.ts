import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countPiecesOnBoard,
  isTablebaseEligible,
  lookupTablebase,
  pickBestTablebaseMove,
  type TablebaseMove,
} from '../src/engine/tablebase.js';

describe('syzygy tablebase client', () => {
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
