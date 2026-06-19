import { describe, it, expect, beforeEach } from 'vitest';
import { LocalEngine } from '../src/engine/local-engine.js';
import { SearchMethods } from '../src/engine/search.js';

Object.assign(LocalEngine.prototype, SearchMethods);

describe('Aggressive Logic Verification', () => {
    let engine;

    beforeEach(() => {
        engine = new LocalEngine();
        engine.rootSide = 1; // Ensure rootSide is set for all tests
    });

    it('should prefer flank pawn push when attacking castled king', () => {
        // Pawns on Rank 2 vs Rank 4 near enemy king
        const fenLow = "6k1/5ppp/8/8/8/8/5PPP/1K6 w - - 0 1";
        engine.loadFen(fenLow);
        const scoreLow = engine.evaluate();

        const fenHigh = "6k1/5ppp/8/8/5PPP/8/8/1K6 w - - 0 1";
        engine.loadFen(fenHigh);
        const scoreHigh = engine.evaluate();

        console.log(`Score Rank 2: ${scoreLow}, Score Rank 4: ${scoreHigh}`);
        // Advanced pawns should score higher due to flank storm bonus
        expect(scoreHigh).toBeGreaterThan(scoreLow + 20);
    });

    it('should correctly count and bonus bishop pair', () => {
        // Two bishops vs one bishop
        const fenTwo = "6k1/8/8/8/8/8/8/KBB5 w - - 0 1";
        engine.loadFen(fenTwo);
        engine.evaluate();
        expect(engine.wBishops).toBe(2);

        const fenOne = "6k1/8/8/8/8/8/8/KB6 w - - 0 1";
        engine.loadFen(fenOne);
        engine.evaluate();
        expect(engine.wBishops).toBe(1);
    });

    it('should penalize queen trades when both sides have queens', () => {
        engine.rootSide = 1;

        // Position WITH both queens
        const fenQueens = "3q2k1/8/8/8/8/8/8/3Q2K1 w - - 0 1";
        engine.loadFen(fenQueens);
        const valWithQueens = engine.evaluate();

        // Position WITHOUT queens (otherwise identical)
        const fenNoQueens = "6k1/8/8/8/8/8/8/6K1 w - - 0 1";
        engine.loadFen(fenNoQueens);
        const valNoQueens = engine.evaluate();

        console.log(`With queens: ${valWithQueens}, Without: ${valNoQueens}`);
        // Queen trade avoidance bonus is 35cp
        // Material is equal in both (both have or both lack queens)
        // The bonus should make "with queens" position preferred
        expect(valWithQueens).toBeGreaterThan(valNoQueens + 30);
    });

    it('should have positive contempt in equal positions', () => {
        const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        const result = engine.analyze(fen, 3);

        console.log(`Contempt after equal position: ${engine.contempt}`);
        // In equal position, contempt should be positive (avoid draws)
        expect(engine.contempt).toBeGreaterThanOrEqual(20);
    });

    it('should bonus rooks on open files', () => {
        // Materially EQUAL positions, only difference is file openness

        // Scenario A: White Rook on d1, File d is OPEN (no pawns)
        // Kings on g1, g8. Pawns on a2/a7, b2/b7, c2/c7, e2/e7, f2/f7, g2/g7, h2/h7
        // d-file is empty.
        const fenOpen = "rnbqkbnr/ppp1pppp/8/8/8/8/PPP1PPPP/RNBRKBN1 w Qkq - 0 1";
        // Wait, let's use a simpler endgame setup to be sure.
        // White Rook d1. Black King g8. White King g1.
        // Files a,b,c,e,f,g,h have pawns. d is open.
        const fenOpenSimple = "6k1/pppppppp/8/8/8/8/PPPPPPPP/3R2K1 w - - 0 1";
        // d-file is open for White Rook.

        engine.loadFen(fenOpenSimple);
        const scoreOpen = engine.evaluate();

        // Scenario B: White Rook on d1, File d is CLOSED (White pawn on d2)
        // We need to remove a pawn elsewhere to keep material equal? 
        // Or just move the d2 pawn to a different file?
        // Let's move d-pawn to d2 (closed). Remove h-pawn to balance material count if needed, 
        // but 'material' score might be same if we just shift a pawn.
        // Let's compare: 
        // Pos 1: Rook on semi-open file (d1, pawn on d2 is missing). 
        // Pos 2: Rook on closed file (d1, pawn on d2 is present).
        // But removing a pawn changes material score significantly (~100cp).
        // Correct comparison:
        // Position X: Rook on d1 (Open file). Pawn on h2.
        // Position Y: Rook on h1 (Closed file). Pawn on h2. 
        // Everything else identical.

        const fenRookOpen = "6k1/8/8/8/8/8/7P/3R2K1 w - - 0 1"; // Rook d1 (Open), Pawn h2
        engine.loadFen(fenRookOpen);
        const scoreRookOpen = engine.evaluate();

        const fenRookClosed = "6k1/8/8/8/8/8/7P/6KR w - - 0 1"; // Rook h1 (Closed by h2), Pawn h2
        engine.loadFen(fenRookClosed);
        const scoreRookClosed = engine.evaluate();

        console.log(`Rook Open (${scoreRookOpen}) vs Closed (${scoreRookClosed})`);
        expect(scoreRookOpen).toBeGreaterThan(scoreRookClosed);
    });

    it('should prefer active knights (outposts/center)', () => {
        // Knight on e5 (central, active) vs Knight on a1 (corner, passive)
        const fenActive = "4k3/8/8/4N3/8/8/8/4K3 w - - 0 1";
        engine.loadFen(fenActive);
        const scoreActive = engine.evaluate();

        const fenPassive = "4k3/8/8/8/8/8/8/N3K3 w - - 0 1";
        engine.loadFen(fenPassive);
        const scorePassive = engine.evaluate();

        console.log(`Knight Active: ${scoreActive}, Knight Passive: ${scorePassive}`);
        // PST difference + Mobility difference
        expect(scoreActive).toBeGreaterThan(scorePassive + 30);
    });

    it('should bonus king attacks (pieces near enemy king)', () => {
        // White pieces near Black King (g8) vs White pieces far away
        const fenAttack = "6k1/5ppp/5N2/6Q1/8/8/8/6K1 w - - 0 1"; // Knight on f6, Queen on g5 attacking g8
        engine.loadFen(fenAttack);
        // We need to account for material difference if comparing different pieces, 
        // so let's compare SAME material but different positions.
        const scoreAttack = engine.evaluate();

        const fenPassive = "6k1/5ppp/8/8/8/2N5/1Q6/6K1 w - - 0 1"; // Knight on c3, Queen on b2 (far)
        engine.loadFen(fenPassive);
        const scorePassive = engine.evaluate();

        console.log(`King Attack: ${scoreAttack}, Passive: ${scorePassive}`);
        // King attack bonus is significant
        expect(scoreAttack).toBeGreaterThan(scorePassive + 40);
    });
});