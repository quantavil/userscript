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
});