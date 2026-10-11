import { describe, expect, it } from 'vitest';
import { readPositionHistory } from '../src/history.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
describe('selected line history', () => {
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
