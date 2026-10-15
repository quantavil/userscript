import { Chess, normalizeMove } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSanAndPlay, parseSan } from 'chessops/san';
import { parseUci } from 'chessops/util';
import { describe, expect, it } from 'vite-plus/test';
import type { OpeningStyle } from '../../../src/chess/types.js';
import { lookupBookMove, normalizeEpd } from '../../../src/engine/book/lookup.js';
import { type BookEntry, type CandidateMove, EPD_BOOK } from '../../../src/engine/book/positions.js';

const STYLES: OpeningStyle[] = ['hyper-defensive', 'defensive', 'balanced', 'aggressive', 'hyper-aggressive'];

/** Build a real position from a SAN line so expectations never carry a hand-written FEN. */
function positionAfter(sanLine: string): Chess {
  let position = Chess.default();
  for (const san of sanLine.split(' ').filter(Boolean)) {
    const move = parseSan(position, san);
    if (!move) throw new Error(`illegal SAN "${san}" in test line "${sanLine}"`);
    const next = position.clone();
    makeSanAndPlay(next, move);
    position = next;
  }
  return position;
}

function fenAfter(sanLine: string): string {
  return makeFen(positionAfter(sanLine).toSetup());
}

/** Every candidate list a book entry declares, across its default and per-style forms. */
function candidateLists(entry: BookEntry): CandidateMove[][] {
  if (Array.isArray(entry)) return [entry];
  const lists: CandidateMove[][] = [];
  if (entry.default) lists.push(entry.default);
  for (const style of STYLES) {
    const list = entry[style];
    if (list) lists.push(list);
  }
  return lists;
}

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
    // `toBeDefined()` would also pass for null, which is what a book miss returns.
    expect(move).not.toBeNull();
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

  it('only contains moves that are legal in the position they belong to, with positive weights', () => {
    for (const [epd, entry] of Object.entries(EPD_BOOK)) {
      const parsed = parseFen(`${epd} 0 1`);
      expect(parsed.isOk, `unparseable EPD ${epd}`).toBe(true);
      if (!parsed.isOk) continue;
      const game = Chess.fromSetup(parsed.value);
      expect(game.isOk, `illegal position ${epd}`).toBe(true);
      if (!game.isOk) continue;
      const position = game.value;

      for (const candidates of candidateLists(entry)) {
        expect(candidates.length, `no candidates for ${epd}`).toBeGreaterThan(0);
        for (const [move, weight] of candidates) {
          expect(weight, `non-positive weight for ${move} in ${epd}`).toBeGreaterThan(0);
          const uciMove = parseUci(move);
          expect(uciMove, `unparseable UCI ${move} in ${epd}`).not.toBeNull();
          if (uciMove) expect(position.isLegal(uciMove), `illegal ${move} in ${epd}`).toBe(true);
        }
      }
    }
  });

  it('handles transpositions by matching the identical EPD state', () => {
    // Both 1.d4 Nf6 2.c4 e6 and 1.c4 e6 2.d4 Nf6 lead to the same EPD. The move must be the
    // same one whichever FEN form reaches the book, not merely "defined".
    const nimzoEpd = 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -';
    const moves = [`${nimzoEpd} 0 2`, `${nimzoEpd} 5 10`, nimzoEpd].map((fen) =>
      lookupBookMove(fen, 'balanced', () => 0),
    );

    for (const move of moves) expect(move).not.toBeNull();
    expect(new Set(moves).size).toBe(1);
    expect(moves[0]).toBe(lookupBookMove(nimzoEpd, 'balanced', () => 0));
  });

  it('ignores the en passant field, so every host FEN convention resolves the same move', () => {
    // Chess.com returns the raw controller FEN, which keeps the ep square after any
    // double push; the Lichess adapters pass canonicalFen(), which only
    // keeps it when a capture is actually available. Both must hit the same entry.
    const withEp = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const withoutEp = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    for (const style of STYLES) {
      for (let roll = 0; roll < 8; roll++) {
        const rng = () => roll / 8;
        expect(lookupBookMove(withEp, style, rng)).toBe(lookupBookMove(withoutEp, style, rng));
      }
    }
    // An ep square that a capture could actually use is still matched.
    const capturableEp = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    expect(lookupBookMove(capturableEp, 'defensive', () => 0)).toBe('e4d5');
  });

  it('ensures no candidate move in EPD_BOOK is an en passant capture', () => {
    // Normalizing away the ep field in bookKey() is safe only while no candidate
    // move is an en passant capture. If an ep capture is ever added, it could be
    // played in transposed positions where the capture is illegal.
    for (const [epd, entry] of Object.entries(EPD_BOOK)) {
      const parsed = parseFen(`${epd} 0 1`);
      if (!parsed.isOk) continue;
      const game = Chess.fromSetup(parsed.value);
      if (game.isErr) continue;
      const position = game.value;

      for (const list of candidateLists(entry)) {
        for (const [uci] of list) {
          const move = parseUci(uci);
          if (!move) continue;
          const isEpCapture =
            position.epSquare !== undefined &&
            'from' in move &&
            move.to === position.epSquare &&
            position.board.get(move.from)?.role === 'pawn';
          expect(isEpCapture, `candidate ${uci} in "${epd}" is an en passant capture`).toBe(false);
        }
      }
    }
  });

  it('answers every first move for every style, so no opening family ends at ply 1', () => {
    // Regression guard: each White first move must have at least one book reply in every
    // style. 1.c4 and 1.Nf3 used to have no follow-up at all in any style.
    const afterFirstMove = ['e4', 'd4', 'c4', 'Nf3'];
    for (const style of STYLES) {
      for (const line of afterFirstMove) {
        const fen = fenAfter(line);
        const move = lookupBookMove(fen, style, () => 0);
        expect(move, `${style} has no reply after 1.${line}`).not.toBeNull();
        const position = positionAfter(line);
        expect(position.isLegal(parseUci(move as string) as never)).toBe(true);
      }
    }
  });

  it('keeps the mainline hub positions the book is expected to cover', () => {
    const bookKeys = new Set(
      Object.keys(EPD_BOOK).map((epd) => normalizeEpd(`${epd} 0 1`).split(' ').slice(0, 3).join(' ')),
    );
    const hubs: Array<[string, string]> = [
      ['Najdorf hub', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 a6 Nc3'],
      ['Open Sicilian 4...Nf6 bridge', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6'],
      ['Caro-Kann 3.Nc3 hub', 'e4 c6 d4 d5 Nc3'],
      ['French 3.Nc3 hub', 'e4 e6 d4 d5 Nc3'],
      ['Philidor 1...Nf6', 'e4 Nf6'],
      ['London 2.Nf3 hub', 'd4 d5 Nf3'],
      ['London System 3.Bf4', 'd4 d5 Nf3 Nf6 Bf4'],
      ['Benoni 2...c5 hub', 'd4 Nf6 c4 c5'],
      ['Modern Benoni 4.Nc3', 'd4 Nf6 c4 c5 d5 e6 Nc3'],
      ['Nimzo 3...Bb4 hub', 'd4 Nf6 c4 e6 Nc3 Bb4'],
      ["King's Indian 3...Bg7 hub", 'd4 Nf6 c4 g6 Nc3 Bg7'],
      ['QGD 3...Nf6 hub', 'd4 d5 c4 e6 Nc3 Nf6'],
      ['Slav 2...c6', 'd4 d5 c4 c6'],
      ['English 1.c4 e5', 'c4 e5'],
      ['Symmetrical English 1...c5', 'c4 c5'],
      ['Reti 1.Nf3 d5', 'Nf3 d5'],
      ['Reti 1.Nf3 Nf6', 'Nf3 Nf6'],
      ['Ruy Lopez Closed 3...a6', 'e4 e5 Nf3 Nc6 Bb5 a6'],
      ['Giuoco Pianissimo 4.d3', 'e4 e5 Nf3 Nc6 Bc4 Bc5 d3'],
      ['Scotch 4.Nxd4', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4'],
    ];
    for (const [label, line] of hubs) {
      const key = normalizeEpd(fenAfter(line)).split(' ').slice(0, 3).join(' ');
      expect(bookKeys.has(key), `missing book hub: ${label} (${key})`).toBe(true);
    }
  });

  it('keeps the mean book depth per style above the ply-1 floor', () => {
    // The regression this guards: matching the host en passant field exactly left only
    // the start position in the book on Lichess, so the mean exit ply was 1.
    const depths: Record<string, number[]> = {};
    for (const style of STYLES) depths[style] = [];

    const walk = (
      style: OpeningStyle,
      position: Chess,
      ply: number,
      ancestors: Set<string>,
      budget: { left: number },
    ) => {
      if (budget.left-- <= 0) return;
      const fen = makeFen(position.toSetup());
      const move = lookupBookMove(fen, style, () => 0);
      const key = normalizeEpd(fen);
      if (!move || ancestors.has(key)) {
        depths[style].push(ply);
        return;
      }
      const next = new Set(ancestors);
      next.add(key);
      const nextPosition = position.clone();
      nextPosition.play(normalizeMove(position, parseUci(move) as never) as never);
      walk(style, nextPosition, ply + 1, next, budget);
    };

    for (const firstMove of ['e2e4', 'd2d4', 'c2c4', 'g1f3']) {
      for (const style of STYLES) {
        const start = positionAfter('');
        const afterFirst = start.clone();
        afterFirst.play(normalizeMove(start, parseUci(firstMove) as never) as never);
        walk(style, afterFirst, 1, new Set(), { left: 4000 });
      }
    }

    for (const style of STYLES) {
      const samples = depths[style];
      expect(samples.length, `no depth samples for ${style}`).toBeGreaterThan(0);
      // The floor leaves room for individual branch changes: following the
      // highest-weighted move from each of the four first moves currently lands
      // between 3.75 and 5.25 plies. Before the ep fix this metric was 1.0-1.5.
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      expect(mean, `${style} mean book depth fell to ${mean.toFixed(2)}`).toBeGreaterThanOrEqual(3);
    }
  });
});
