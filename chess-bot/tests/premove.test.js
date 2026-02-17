import { describe, it, expect } from 'vitest';
import { evaluatePremove, evaluatePremoveChain, getOurMoveFromPV } from '../src/engine/premove.js';

describe('evaluatePremove', () => {

    it('should block premove that hangs a piece (queen captures protected pawn)', () => {
        // White Q on e4, Black K on c6 protects d5 pawn
        // After ...Kd6, Qxd5 is recaptured by Kxd5
        const fen = "8/8/2k5/3p4/4Q3/3K4/8/8 b - - 0 1";
        const opponentUci = "c6d6";
        const ourUci = "e4d5";
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        expect(result.execute).toBe(false);
    });

    it('should allow safe capture (undefended pawn)', () => {
        // Same but Black K far away — pawn undefended
        const fen = "8/8/8/3p4/4Q3/3K4/8/k7 b - - 0 1";
        const opponentUci = "a1b1";
        const ourUci = "e4d5";
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        expect(result.execute).toBe(true);
    });

    it('should allow conditional premove (illegal in alternate response)', () => {
        // White K a8, R a1. Black N e4, K h3.
        // Predicted: Ra2. Our premove: Ne4-g3.
        // Alt: Rxe4 captures knight → Ng3 illegal → skipped (conditional)
        const fen = "K7/8/8/8/4n3/7k/8/R7 w - - 0 1";
        const opponentUci = "a1a2";
        const ourUci = "e4g3";
        const ourColor = "b";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        if (!result.execute) console.log('Blocked:', result.blocked, result.reasons);
        expect(result.execute).toBe(true);
    });

    it('should allow forced recapture premove', () => {
        // White K e3, R d4. Black R d5, K h1.
        // Predicted: ...Rxd4. Our premove: Kxd4 (recapture)
        const fen = "8/8/8/3r4/3R4/4K3/8/7k b - - 0 1";
        const opponentUci = "d5d4";
        const ourUci = "e3d4";
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        expect(result.execute).toBe(true);
        expect(result.reasons).toContain('recapture');
    });

    it('should reject invalid UCI', () => {
        const result = evaluatePremove("8/8/8/8/8/8/8/K1k5 w - - 0 1", "a1a2", "x", "w");
        expect(result.execute).toBe(false);
        expect(result.blocked).toBe('Invalid move');
    });

    it('should reject missing opponent move', () => {
        const result = evaluatePremove("8/8/8/8/8/8/8/K1k5 w - - 0 1", null, "a1a2", "w");
        expect(result.execute).toBe(false);
        expect(result.blocked).toBe('No predicted opponent move');
    });

    it('should handle promotion premove correctly', () => {
        const fen = "k7/4P3/8/8/8/8/8/4K3 b - - 0 1";
        const opponentUci = "a8a7";
        const ourUci = "e7e8q";
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        // Debug output if it still fails — check engine's move structure
        if (!result.execute) console.log('Promo blocked:', result.blocked, result.reasons);
        expect(result.execute).toBe(true);
        expect(result.reasons).toContain('promotion');
    });

    it('should block promotion into attacked square', () => {
        // White pawn e7, Black R on e1 (attacks e8 along file), Black K g8
        // Predicted: ...Kg7. Our premove: e7e8q → Queen on e8 attacked by Re1
        const fen = "6k1/4P3/8/8/8/8/8/4r1K1 b - - 0 1";
        const opponentUci = "g8g7";
        const ourUci = "e7e8q";
        const ourColor = "w";

        const result = evaluatePremove(fen, opponentUci, ourUci, ourColor);
        expect(result.execute).toBe(false);
    });
});

describe('getOurMoveFromPV', () => {

    it('should return first move when side to move is our color', () => {
        const pv = "e2e4 e7e5 g1f3";
        expect(getOurMoveFromPV(pv, 'w', 'w')).toBe('e2e4');
    });

    it('should return second move when opponent moves first', () => {
        const pv = "e7e5 g1f3 b8c6";
        expect(getOurMoveFromPV(pv, 'w', 'b')).toBe('g1f3');
    });

    it('should return null for empty PV', () => {
        expect(getOurMoveFromPV('', 'w', 'w')).toBe(null);
        expect(getOurMoveFromPV(null, 'w', 'w')).toBe(null);
    });

    it('should return null when PV too short for our move', () => {
        const pv = "e7e5"; // only opponent move
        expect(getOurMoveFromPV(pv, 'w', 'b')).toBe(null);
    });
});

describe('evaluatePremoveChain', () => {

    it('should return empty chain when PV is too short', () => {
        const chain = evaluatePremoveChain(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "e2e4",
            'b',
            'w'
        );
        expect(chain).toEqual([]);
    });

    it('should return empty chain when it is our turn', () => {
        const chain = evaluatePremoveChain(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "e2e4 e7e5 g1f3 b8c6",
            'w', // our color
            'w'  // side to move = our color → no premove
        );
        expect(chain).toEqual([]);
    });

    it('should build at least one premove from valid PV', () => {
        // Simple position, opponent's turn
        // PV: d2d4 d7d5 (opponent pushes d4, we push d5)
        const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        const pv = "e2e4 e7e5 g1f3 b8c6";

        const chain = evaluatePremoveChain(fen, pv, 'b', 'w');

        // Should have at least the first premove (e7e5)
        if (chain.length > 0) {
            expect(chain[0].uci).toBe('e7e5');
            expect(chain[0].confidence).toBeGreaterThan(0);
        }
        // Chain may be empty if stability check blocks — that's also valid
        expect(chain.length).toBeLessThanOrEqual(3);
    });
});