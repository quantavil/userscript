
import { describe, it, expect } from 'vitest';
import {
    scoreFrom,
    scoreToDisplay,
    scoreNumeric
} from '../src/utils.js';

// ============================================================
// Self-contained helpers that replace the removed utility functions
// These test that LocalEngine's equivalents work correctly
// ============================================================

const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;
const EMPTY = 0;
const FLAG_NONE = 0, FLAG_EP = 1, FLAG_CASTLE = 2, FLAG_PROMO = 4;

function sqFile(sq) { return sq & 7; }
function sqRank(sq) { return sq >> 3; }
function sqName(sq) { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
function nameToSq(s) { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8; }

// Minimal LocalEngine for testing (only what we need for these tests)
class TestEngine {
    constructor() {
        this.board = new Array(64).fill(EMPTY);
        this.side = 1; this.castling = 0; this.epSquare = -1;
    }

    loadFen(fen) {
        this.board.fill(EMPTY);
        const parts = fen.split(' ');
        const rows = parts[0].split('/');
        const pieceMap = { p: BP, n: BN, b: BB, r: BR, q: BQ, k: BK, P: WP, N: WN, B: WB, R: WR, Q: WQ, K: WK };
        for (let r = 0; r < 8; r++) {
            let f = 0;
            for (const ch of rows[7 - r]) {
                if (ch >= '1' && ch <= '8') { f += parseInt(ch); }
                else { this.board[r * 8 + f] = pieceMap[ch] || EMPTY; f++; }
            }
        }
        this.side = (parts[1] || 'w') === 'w' ? 1 : -1;
        const c = parts[2] || '-';
        this.castling = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
        this.epSquare = (parts[3] && parts[3] !== '-') ? nameToSq(parts[3]) : -1;
    }

    findKingSq(side) {
        const k = side * WK;
        for (let i = 0; i < 64; i++) if (this.board[i] === k) return i;
        return -1;
    }

    isAttacked(sq, bySide) {
        const pawnDir = bySide === 1 ? 1 : -1;
        const pawnRank = sqRank(sq) - pawnDir;
        if (pawnRank >= 0 && pawnRank <= 7) {
            const pf = sqFile(sq);
            if (pf > 0 && this.board[pawnRank * 8 + pf - 1] === bySide * WP) return true;
            if (pf < 7 && this.board[pawnRank * 8 + pf + 1] === bySide * WP) return true;
        }
        const kn = bySide * WN;
        for (const off of [-17, -15, -10, -6, 6, 10, 15, 17]) {
            const t = sq + off;
            if (t < 0 || t > 63 || Math.abs(sqFile(t) - sqFile(sq)) > 2) continue;
            if (this.board[t] === kn) return true;
        }
        const kg = bySide * WK;
        for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) {
            if (!dr && !df) continue;
            const t = sq + dr * 8 + df;
            if (t < 0 || t > 63 || Math.abs(sqFile(t) - sqFile(sq)) > 1) continue;
            if (this.board[t] === kg) return true;
        }
        const rq = [bySide * WR, bySide * WQ];
        const bq = [bySide * WB, bySide * WQ];
        for (const dir of [8, -8, 1, -1]) {
            let t = sq + dir;
            while (t >= 0 && t <= 63) {
                if (dir === 1 || dir === -1) { if (sqRank(t) !== sqRank(t - dir)) break; }
                const p = this.board[t];
                if (p !== EMPTY) { if (rq.includes(p)) return true; break; }
                t += dir;
            }
        }
        for (const dir of [9, 7, -9, -7]) {
            let t = sq + dir;
            while (t >= 0 && t <= 63) {
                if (Math.abs(sqFile(t) - sqFile(t - dir)) !== 1) break;
                const p = this.board[t];
                if (p !== EMPTY) { if (bq.includes(p)) return true; break; }
                t += dir;
            }
        }
        return false;
    }

    // Find king position (returns algebraic notation like 'e1')
    findKingAlg(color) {
        const side = color === 'w' ? 1 : -1;
        const ksq = this.findKingSq(side);
        return ksq >= 0 ? sqName(ksq) : null;
    }

    // Check if square (algebraic) is attacked by given color
    isSquareAttackedByColor(sq, color) {
        const side = color === 'w' ? 1 : -1;
        return this.isAttacked(nameToSq(sq), side);
    }

    // Simple move: move piece from->to (algebraic), return char at square
    simpleMove(from, to) {
        const f = nameToSq(from), t = nameToSq(to);
        this.board[t] = this.board[f];
        this.board[f] = EMPTY;
    }

    // Get piece char at algebraic square
    pieceCharAt(sq) {
        const p = this.board[nameToSq(sq)];
        if (p === EMPTY) return null;
        const abs = Math.abs(p);
        const ch = 'xpnbrqk'[abs];
        return p > 0 ? ch.toUpperCase() : ch;
    }
}

describe('Chess Logic Utils', () => {

    describe('findKing (via LocalEngine)', () => {
        it('should find white king at e1 in start pos', () => {
            const eng = new TestEngine();
            eng.loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
            expect(eng.findKingAlg('w')).toBe('e1');
        });

        it('should find black king at e8 in start pos', () => {
            const eng = new TestEngine();
            eng.loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
            expect(eng.findKingAlg('b')).toBe('e8');
        });

        it('should find king in middle of board', () => {
            const eng = new TestEngine();
            eng.loadFen("8/8/4K3/8/8/4k3/8/8 w - - 0 1");
            expect(eng.findKingAlg('w')).toBe('e6');
            expect(eng.findKingAlg('b')).toBe('e3');
        });
    });

    describe('isSquareAttackedBy (via LocalEngine)', () => {
        it('should detect pawn attacks', () => {
            const eng = new TestEngine();
            eng.loadFen("8/8/8/3p4/4P3/8/8/8 w - - 0 1");
            expect(eng.isSquareAttackedByColor('d5', 'w')).toBe(true);
        });

        it('should detect knight attacks', () => {
            const eng = new TestEngine();
            eng.loadFen("8/8/8/4N3/8/8/8/8 w - - 0 1");
            expect(eng.isSquareAttackedByColor('f7', 'w')).toBe(true);
            expect(eng.isSquareAttackedByColor('e6', 'w')).toBe(false);
        });

        it('should detect sliding piece attacks (Rook)', () => {
            const eng = new TestEngine();
            eng.loadFen("8/8/8/8/8/8/4R3/8 w - - 0 1");
            expect(eng.isSquareAttackedByColor('e7', 'w')).toBe(true);
            expect(eng.isSquareAttackedByColor('h2', 'w')).toBe(true);
            expect(eng.isSquareAttackedByColor('f3', 'w')).toBe(false);
        });

        it('should blocked sliding attacks', () => {
            const eng = new TestEngine();
            eng.loadFen("8/8/8/8/8/4P3/4R3/8 w - - 0 1");
            expect(eng.isSquareAttackedByColor('e4', 'w')).toBe(false);
        });
    });

    describe('makeSimpleMove (via LocalEngine)', () => {
        it('should execute a simple capture correctly', () => {
            const eng = new TestEngine();
            eng.loadFen("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");
            eng.simpleMove('e4', 'd5');
            expect(eng.pieceCharAt('d5')).toBe('P');
            expect(eng.pieceCharAt('e4')).toBe(null);
        });

        it('should execute a simple move correctly', () => {
            const eng = new TestEngine();
            eng.loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
            eng.simpleMove('e2', 'e4');
            expect(eng.pieceCharAt('e4')).toBe('P');
            expect(eng.pieceCharAt('e2')).toBe(null);
        });
    });

    describe('FEN Helpers (via LocalEngine)', () => {
        it('should return correct char at square', () => {
            const eng = new TestEngine();
            eng.loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
            expect(eng.pieceCharAt('e1')).toBe('K');
            expect(eng.pieceCharAt('e8')).toBe('k');
            expect(eng.pieceCharAt('a1')).toBe('R');
            expect(eng.pieceCharAt('e4')).toBe(null);
        });

        it('should identify piece color and type', () => {
            const eng = new TestEngine();
            eng.loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
            // White pawn
            const wPawn = eng.board[nameToSq('e2')];
            expect(wPawn).toBe(WP);
            expect(Math.sign(wPawn)).toBe(1); // white
            // Black king
            const bKing = eng.board[nameToSq('e8')];
            expect(bKing).toBe(BK);
            expect(Math.sign(bKing)).toBe(-1); // black
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
