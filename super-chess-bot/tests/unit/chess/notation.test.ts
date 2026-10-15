import { describe, expect, it } from 'vite-plus/test';
import { formatMove, uciListToSan, uciToSan } from '../../../src/chess/notation.js';
import { hasLegalMoves, predictFen } from '../../../src/chess/position.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('chessops move notation', () => {
  it('formats legal castling and promotion moves and returns UCI for invalid input', () => {
    const castleFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const promotionFen = '7k/1P6/8/8/8/8/8/7K w - - 0 1';

    expect(uciToSan(castleFen, 'e1g1')).toBe('O-O');
    expect(uciToSan(promotionFen, 'b7b8q')).toBe('b8=Q+');
    expect(uciToSan(START_FEN, 'e2e5')).toBe('e2e5');
    expect(uciToSan('not a FEN', 'e2e4')).toBe('e2e4');
    expect(formatMove(START_FEN, 'e2e4')).toBe('1. e4');
  });

  it('resolves a whole candidate list against one parsed position', () => {
    expect(uciListToSan(START_FEN, ['e2e4', 'd2d4', 'e2e5'])).toEqual(['e4', 'd4', 'e2e5']);
    // An unparseable position leaves the moves untouched rather than throwing.
    expect(uciListToSan('not a FEN', ['e2e4'])).toEqual(['e2e4']);
  });
});

describe('board helpers', () => {
  it('checks terminal positions and malformed FENs with chessops', () => {
    expect(hasLegalMoves(START_FEN)).toBe(true);
    expect(hasLegalMoves('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')).toBe(false);
    expect(hasLegalMoves('not a fen')).toBeNull();
  });

  it('treats an unsupported variant as ordinary chess for legal-move checks only', () => {
    // Board helpers answer "are there legal moves", not "is this variant supported", so they
    // still parse; the engine-facing paths reject unknown variants instead.
    expect(hasLegalMoves(START_FEN, 'atomic')).toBe(true);
    expect(predictFen(START_FEN, 'e2e4', 'atomic')).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  });

  it('predicts the next position', () => {
    expect(predictFen(START_FEN, 'e2e4')).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(predictFen(START_FEN, 'e7e5')).toBeNull();
  });
});
