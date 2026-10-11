import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { describe, expect, it } from 'vitest';
import { type CandidateMove, EPD_BOOK, lookupBookMove, normalizeEpd } from '../src/engine/book.js';
import type { OpeningStyle } from '../src/types/chess.js';

describe('opening book', () => {
  it('normalizes 6-part FEN strings into 4-part EPD strings', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    expect(normalizeEpd(fen)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
  });

  it('leaves short or malformed FEN strings intact without throwing', () => {
    expect(normalizeEpd('rnbqkbnr')).toBe('rnbqkbnr');
  });

  it('returns valid candidate moves for the starting position with default/balanced style', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const move = lookupBookMove(startFen);
    expect(move).toBeDefined();
    expect(['e2e4', 'd2d4', 'c2c4']).toContain(move);
  });

  it('selects move based on provided RNG function deterministically (backward compatible signature)', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // Balanced weights: e2e4 (65), d2d4 (25), c2c4 (10) -> Total = 100
    // rng = 0.1 -> threshold = 10 -> e2e4
    expect(lookupBookMove(startFen, () => 0.1)).toBe('e2e4');
    // rng = 0.7 -> threshold = 70 -> d2d4
    expect(lookupBookMove(startFen, () => 0.7)).toBe('d2d4');
    // rng = 0.95 -> threshold = 95 -> c2c4
    expect(lookupBookMove(startFen, () => 0.95)).toBe('c2c4');
  });

  it('selects style-specific opening moves for hyper-defensive and hyper-aggressive', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // Hyper-defensive prefers 1.Nf3 (50), 1.c4 (30), 1.d4 (20)
    const hypDefMove = lookupBookMove(startFen, 'hyper-defensive', () => 0.1);
    expect(hypDefMove).toBe('g1f3');

    // Hyper-aggressive strongly prefers 1.e4 (85)
    const hypAggrMove = lookupBookMove(startFen, 'hyper-aggressive', () => 0.1);
    expect(hypAggrMove).toBe('e2e4');
  });

  it('plays Petroff defense in hyper-defensive vs 1.e4 and Stafford gambit in hyper-aggressive', () => {
    // 1.e4 e5 2.Nf3
    const fenAfterNf3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2';
    expect(lookupBookMove(fenAfterNf3, 'hyper-defensive', () => 0.5)).toBe('g8f6'); // Petroff 2...Nf6

    // 1.e4 e5 2.Nf3 Nf6 3.Nxe5
    const fenAfterNxe5 = 'rnbqkb1r/pppp1ppp/8/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3';
    expect(lookupBookMove(fenAfterNxe5, 'hyper-defensive', () => 0.5)).toBe('d7d6'); // Kick knight
    expect(lookupBookMove(fenAfterNxe5, 'hyper-aggressive', () => 0.1)).toBe('b8c6'); // Stafford Gambit 3...Nc6!
  });

  it('plays Traxler Counterattack in hyper-aggressive against Italian Fried Liver/Knight Attack', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5
    const traxForkFen = 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 4';
    expect(lookupBookMove(traxForkFen, 'hyper-aggressive', () => 0.1)).toBe('f8c5'); // Traxler Counterattack 4...Bc5!!
    expect(lookupBookMove(traxForkFen, 'hyper-defensive', () => 0.5)).toBe('d7d5'); // Solid defense 4...d5
  });

  it('plays Evans Gambit in aggressive/hyper-aggressive against Giuoco Piano', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5
    const giuocoFen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
    expect(lookupBookMove(giuocoFen, 'hyper-aggressive', () => 0.1)).toBe('b2b4'); // Evans Gambit 4.b4!
    expect(lookupBookMove(giuocoFen, 'hyper-defensive', () => 0.1)).toBe('d2d3'); // Giuoco Pianissimo 4.d3
  });

  it('plays Berlin Wall defense in hyper-defensive against Ruy Lopez', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5
    const ruyLopezFen = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3';
    expect(lookupBookMove(ruyLopezFen, 'hyper-defensive', () => 0.1)).toBe('g8f6'); // Berlin Defense 3...Nf6
  });

  it('plays Albin Countergambit and Budapest Gambit in hyper-aggressive vs 1.d4', () => {
    // 1.d4 d5 2.c4
    const qgdFen = 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2';
    expect(lookupBookMove(qgdFen, 'hyper-aggressive', () => 0.1)).toBe('e7e5'); // Albin Countergambit 2...e5!

    // 1.d4 Nf6 2.c4
    const indFen = 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2';
    expect(lookupBookMove(indFen, 'hyper-aggressive', () => 0.1)).toBe('e7e5'); // Budapest Gambit 2...e5!
  });

  it('returns null for positions not in the book', () => {
    const unknownFen = '8/8/8/8/8/8/8/4K2k w - - 0 1';
    expect(lookupBookMove(unknownFen)).toBeNull();
  });

  it('ensures all EPD positions and candidate moves across all styles in EPD_BOOK are structurally valid', () => {
    const styles: OpeningStyle[] = ['hyper-defensive', 'defensive', 'balanced', 'aggressive', 'hyper-aggressive'];

    for (const [epd, entry] of Object.entries(EPD_BOOK)) {
      // Validate EPD can be parsed as a chess position
      const fullFen = `${epd} 0 1`;
      const parsed = parseFen(fullFen);
      expect(parsed.isOk).toBe(true);
      if (!parsed.isOk) continue;
      const game = Chess.fromSetup(parsed.value);
      expect(game.isOk).toBe(true);
      if (!game.isOk) continue;
      const chess = game.value;

      const candidateLists: CandidateMove[][] = [];
      if (Array.isArray(entry)) {
        candidateLists.push(entry);
      } else {
        if (entry.default) candidateLists.push(entry.default);
        for (const style of styles) {
          const list = entry[style];
          if (list) candidateLists.push(list);
        }
      }

      for (const candidates of candidateLists) {
        expect(candidates.length).toBeGreaterThan(0);
        for (const [move, weight] of candidates) {
          expect(weight).toBeGreaterThan(0);
          // Validate move is a valid UCI move string (e.g. e2e4, b8c6, etc.)
          const uciMove = parseUci(move);
          expect(uciMove).toBeDefined();
          if (uciMove) {
            expect(chess.isLegal(uciMove)).toBe(true);
          }
        }
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
