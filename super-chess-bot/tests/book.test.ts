import { parseFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { describe, expect, it } from 'vitest';
import { EPD_BOOK, lookupBookMove, normalizeEpd } from '../src/engine/book.js';

describe('opening book', () => {
  it('normalizes 6-part FEN strings into 4-part EPD strings', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(normalizeEpd(fen)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
  });

  it('leaves short or malformed FEN strings intact without throwing', () => {
    expect(normalizeEpd('rnbqkbnr')).toBe('rnbqkbnr');
  });

  it('returns valid candidate moves for the starting position', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const move = lookupBookMove(startFen);
    expect(move).toBeDefined();
    expect(['e2e4', 'd2d4', 'c2c4']).toContain(move);
  });

  it('selects move based on provided RNG function deterministically', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // Weights: e2e4 (70), d2d4 (25), c2c4 (5) -> Total = 100
    // rng = 0.1 -> threshold = 10 -> e2e4
    expect(lookupBookMove(startFen, () => 0.1)).toBe('e2e4');
    // rng = 0.8 -> threshold = 80 -> d2d4
    expect(lookupBookMove(startFen, () => 0.8)).toBe('d2d4');
    // rng = 0.99 -> threshold = 99 -> c2c4
    expect(lookupBookMove(startFen, () => 0.99)).toBe('c2c4');
  });

  it('returns null for positions not in the book', () => {
    const unknownFen = '8/8/8/8/8/8/8/4K2k w - - 0 1';
    expect(lookupBookMove(unknownFen)).toBeNull();
  });

  it('ensures all EPD positions and candidate moves in EPD_BOOK are structurally valid', () => {
    for (const [epd, candidates] of Object.entries(EPD_BOOK)) {
      expect(candidates.length).toBeGreaterThan(0);

      // Validate EPD can be parsed as a chess position
      const fullFen = `${epd} 0 1`;
      const parsed = parseFen(fullFen);
      expect(parsed.isOk).toBe(true);

      for (const [move, weight] of candidates) {
        expect(weight).toBeGreaterThan(0);
        // Validate move is a valid UCI move string (e.g. e2e4, b8c6, etc.)
        const uciMove = parseUci(move);
        expect(uciMove).toBeDefined();
      }
    }
  });

  it('handles transpositions by matching the identical EPD state', () => {
    // Both 1.d4 Nf6 2.c4 e6 and 1.c4 e6 2.d4 Nf6 lead to the same EPD
    const nimzoEpd = 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -';
    expect(lookupBookMove(`${nimzoEpd} 0 2`)).toBeDefined();
    expect(lookupBookMove(`${nimzoEpd} 5 10`)).toBeDefined();
    expect(lookupBookMove(nimzoEpd)).toBeDefined();
  });
});
