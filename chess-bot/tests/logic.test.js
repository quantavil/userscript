
import { describe, it, expect } from 'vitest';
import {
    isSquareAttackedBy,
    findKing,
    makeSimpleMove,
    getAttackersOfSquare,
    fenCharAtSquare,
    pieceFromFenChar,
    scoreFrom,
    scoreToDisplay,
    scoreNumeric
} from '../src/utils.js';

describe('Chess Logic Utils', () => {

    describe('findKing', () => {
        it('should find white king at e1 in start pos', () => {
            const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            expect(findKing(fen, 'w')).toBe('e1');
        });

        it('should find black king at e8 in start pos', () => {
            const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            expect(findKing(fen, 'b')).toBe('e8');
        });

        it('should find king in middle of board', () => {
            const fen = "8/8/4K3/8/8/4k3/8/8 w - - 0 1";
            expect(findKing(fen, 'w')).toBe('e6');
            expect(findKing(fen, 'b')).toBe('e3');
        });
    });

    describe('isSquareAttackedBy', () => {
        it('should detect pawn attacks', () => {
            // White pawn at e4, Black king at e8.
            const fen = "8/8/8/3p4/4P3/8/8/8 w - - 0 1";
            // d5 is attacked by e4 (white pawn captures diagonally)
            expect(isSquareAttackedBy(fen, 'd5', 'w')).toBe(true);
        });

        it('should detect knight attacks', () => {
            const fen = "8/8/8/4N3/8/8/8/8 w - - 0 1"; // White Knight at e5
            // e5 attacks f7
            expect(isSquareAttackedBy(fen, 'f7', 'w')).toBe(true);
            // e5 does NOT attack e6
            expect(isSquareAttackedBy(fen, 'e6', 'w')).toBe(false);
        });

        it('should detect sliding piece attacks (Rook)', () => {
            const fen = "8/8/8/8/8/8/4R3/8 w - - 0 1"; // White Rook at e2
            expect(isSquareAttackedBy(fen, 'e7', 'w')).toBe(true); // Same file
            expect(isSquareAttackedBy(fen, 'h2', 'w')).toBe(true); // Same rank
            expect(isSquareAttackedBy(fen, 'f3', 'w')).toBe(false); // Diagonal (no)
        });

        it('should blocked sliding attacks', () => {
            const fen = "8/8/8/8/8/4P3/4R3/8 w - - 0 1"; // White Rook at e2, White Pawn at e3
            expect(isSquareAttackedBy(fen, 'e4', 'w')).toBe(false); // Blocked by pawn
        });
    });

    describe('makeSimpleMove', () => {
        it('should execute a simple capture correctly', () => {
            const fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
            // White captures d5: exd5 (e4 -> d5)
            const result = makeSimpleMove(fen, 'e4', 'd5');

            // d5 should have White Pawn ('P')
            expect(fenCharAtSquare(result, 'd5')).toBe('P');
            // e4 should be empty
            expect(fenCharAtSquare(result, 'e4')).toBe(null);
        });

        it('should execute a simple move correctly', () => {
            const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            // e2 -> e4
            const result = makeSimpleMove(startFen, 'e2', 'e4');
            expect(fenCharAtSquare(result, 'e4')).toBe('P');
            expect(fenCharAtSquare(result, 'e2')).toBe(null);
        });
    });

    describe('FEN Helpers', () => {
        it('should return correct char at square', () => {
            const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            expect(fenCharAtSquare(fen, 'e1')).toBe('K');
            expect(fenCharAtSquare(fen, 'e8')).toBe('k');
            expect(fenCharAtSquare(fen, 'a1')).toBe('R');
            expect(fenCharAtSquare(fen, 'e4')).toBe(null); // Empty
        });

        it('should parse piece from char', () => {
            expect(pieceFromFenChar('P')).toEqual({ color: 'w', type: 'p' });
            expect(pieceFromFenChar('k')).toEqual({ color: 'b', type: 'k' });
            expect(pieceFromFenChar(null)).toBe(null);
        });
    });

    describe('Score Utils', () => {
        it('should parse score objects', () => {
            expect(scoreFrom({ cp: 20 })).toEqual({ cp: 20 });
            expect(scoreFrom({ mate: 5 })).toEqual({ mate: 5 });
        });

        it('should parse string scores', () => {
            expect(scoreFrom("0.50")).toEqual({ cp: 50 });
            expect(scoreFrom("M3")).toEqual({ mate: 3 });
        });

        it('should format score for display', () => {
            expect(scoreToDisplay({ cp: 150 })).toBe('1.50');
            expect(scoreToDisplay({ mate: 4 })).toBe('M4');
        });

        it('should return numeric score for sorting', () => {
            expect(scoreNumeric({ cp: 100 })).toBe(100);
            expect(scoreNumeric({ mate: 1 })).toBe(99999);
            expect(scoreNumeric({ mate: -1 })).toBe(-99999);
        });
    });

});
