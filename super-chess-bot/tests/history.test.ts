import { describe, expect, it } from 'vitest';
import { canonicalFen, readPositionHistory, replaySanLine } from '../src/history.js';

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

  it('rejects illegal or truncated SAN lines', () => {
    expect(replaySanLine(startFen, ['e4', 'not-a-move'])).toBeUndefined();
    expect(replaySanLine(startFen, ['e4', 'c5'])).toBeDefined();
  });

  it('retains moves even when the site records a non-capturable en passant square', () => {
    expect(
      readPositionHistory({ getHistoryFENs: () => [startFen, afterE4], getHistorySANs: () => ['e4'] }, afterE4),
    ).toEqual({ startFen, moves: ['e2e4'] });
  });
  it('discards a stale history that ends at another position', () => {
    expect(
      readPositionHistory({ getHistoryFENs: () => [startFen], getHistorySANs: () => ['d4'] }, afterE4),
    ).toBeUndefined();
  });
  it('returns initial history when no moves have been played', () => {
    expect(readPositionHistory({ getHistoryFENs: () => [startFen], getHistorySANs: () => [] }, startFen)).toEqual({
      startFen,
      moves: [],
    });
  });
});
