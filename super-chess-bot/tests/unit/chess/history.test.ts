import { describe, expect, it } from 'vite-plus/test';
import { canonicalFen, replaySanLine } from '../../../src/chess/position.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('selected line history', () => {
  it('replays the accepted e4 c5 line into canonical positions', () => {
    const line = replaySanLine(startFen, ['e4', 'c5']);

    expect(line?.history.moves).toEqual(['e2e4', 'c7c5']);
    expect(line?.fens).toHaveLength(3);
    expect(line?.fens[2]).toBe('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  });

  it('rejects malformed and incomplete FENs', () => {
    expect(canonicalFen('8/8/8/8/8/8/8/K6k w - -')).toBeNull();
    expect(canonicalFen('not a fen')).toBeNull();
  });

  it('discards irrelevant en passant targets while retaining legal capture rights', () => {
    const withIrrelevantTarget = afterE4;
    const withoutTarget = afterE4.replace(' e3 ', ' - ');
    const withLegalTarget = '8/8/8/3pP3/8/8/8/K6k w - d6 0 2';
    const withoutLegalTarget = withLegalTarget.replace(' d6 ', ' - ');

    expect(canonicalFen(withIrrelevantTarget)).toBe(canonicalFen(withoutTarget));
    expect(canonicalFen(withLegalTarget)).not.toBe(canonicalFen(withoutLegalTarget));
  });

  it('rejects a SAN line at the first unplayable move instead of replaying a prefix', () => {
    expect(replaySanLine(startFen, ['e4', 'not-a-move'])).toBeUndefined();
    expect(replaySanLine(startFen, ['e4', 'e4'])).toBeUndefined();
  });
});

describe('castling serialization', () => {
  it('uses the king destination square for an orthodox engine', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1';
    const line = replaySanLine(fen, ['O-O', 'O-O-O']);

    expect(line?.history.moves).toEqual(['e8g8', 'e1c1']);
  });

  it('uses the king-takes-rook square for a Chess960 engine', () => {
    // A `UCI_Chess960 true` engine rejects `e1g1`; it expects the own-rook square instead.
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1';
    const line = replaySanLine(fen, ['O-O', 'O-O-O'], 'chess960');

    expect(line?.history.moves).toEqual(['e8h8', 'e1a1']);
  });

  it('names the king own rook when the king does not start on e1', () => {
    // King on c1, rooks on a1 and h1. The board still resolves castling to c1/g1, but the
    // Chess960 UCI form must name the king's own rook (h1), not the destination square (g1).
    const fen = 'r3k2r/8/8/8/8/8/8/R1K4R w HAha - 0 1';

    expect(replaySanLine(fen, ['O-O'], 'chess960')?.history.moves).toEqual(['c1h1']);
    expect(replaySanLine(fen, ['O-O'])?.history.moves).toEqual(['c1g1']);
  });
});

it('rejects unsupported variants during position canonicalization', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 3+3 0 1';
  expect(canonicalFen(fen, 'threeCheck')).toBeNull();
});

it('normalizes a Shredder-notation Chess960 castling field', () => {
  const shredder = 'r3k2r/8/8/8/8/8/8/R1K4R w HAha - 0 1';
  expect(canonicalFen(shredder, 'chess960')).toBe('r3k2r/8/8/8/8/8/8/R1K4R w KQkq - 0 1');
  expect(canonicalFen(shredder, 'fischerandom')).toBe(canonicalFen(shredder, 'chess960'));
});
