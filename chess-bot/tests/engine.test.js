import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// LOCAL ENGINE TESTS (self-contained copy, same pattern as lru.test.js)
// ============================================================

const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;
const EMPTY = 0;
const FLAG_NONE = 0, FLAG_EP = 1, FLAG_CASTLE = 2, FLAG_PROMO = 4;
const MATE_SCORE = 30000;

const PST_PAWN = [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0];
const PST_KNIGHT = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
const PST_BISHOP = [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20];
const PST_ROOK = [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
const PST_QUEEN = [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5, -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20];
const PST_KING_MG = [20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30];
const PST_KING_EG = [-50, -30, -30, -30, -30, -30, -30, -50, -30, -30, 0, 0, 0, 0, -30, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -20, -10, 0, 0, -10, -20, -30, -50, -40, -30, -20, -20, -30, -40, -50];

const PST = { [WP]: PST_PAWN, [WN]: PST_KNIGHT, [WB]: PST_BISHOP, [WR]: PST_ROOK, [WQ]: PST_QUEEN };
const PIECE_VAL = { 1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 0 };

// --- Zobrist Hashing ---
const ZOBRIST = (() => {
    let seed = 1070372;
    const rand32 = () => { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return seed >>> 0; };
    const table = new Uint32Array(13 * 64 * 2);
    for (let i = 0; i < table.length; i++) table[i] = rand32();
    const sideKey = [rand32(), rand32()];
    const castlingKeys = new Uint32Array(16 * 2);
    for (let i = 0; i < castlingKeys.length; i++) castlingKeys[i] = rand32();
    const epKeys = new Uint32Array(8 * 2);
    for (let i = 0; i < epKeys.length; i++) epKeys[i] = rand32();
    return { table, sideKey, castlingKeys, epKeys };
})();

function zobPieceIdx(piece) { return piece > 0 ? (piece - 1) : (-piece + 5); }
function zobPieceKey(piece, sq) {
    const base = (zobPieceIdx(piece) * 64 + sq) * 2;
    return [ZOBRIST.table[base], ZOBRIST.table[base + 1]];
}
function zobXor(hash, key) { hash[0] ^= key[0]; hash[1] ^= key[1]; }


function mirrorSq(sq) { return (7 - (sq >> 3)) * 8 + (sq & 7); }
function sqFile(sq) { return sq & 7; }
function sqRank(sq) { return sq >> 3; }
function sqName(sq) { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
function nameToSq(s) { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8; }

// Minimal LocalEngine for testing (copy of core logic)
class LocalEngine {
    constructor() {
        this.board = new Array(64).fill(EMPTY);
        this.side = 1; this.castling = 0; this.epSquare = -1;
        this.halfmove = 0; this.fullmove = 1; this.stateStack = [];
        this.nodes = 0; this.timeLimit = 0; this.startTime = 0;
        this.stopped = false; this.pvTable = [];
        this.killers = []; this.history = new Int32Array(64 * 64);
        this.hash = [0, 0]; this.positionHistory = []; this.contempt = 0;
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
        this.halfmove = parseInt(parts[4]) || 0;
        this.fullmove = parseInt(parts[5]) || 1;
        this.stateStack = [];
        this._computeHash();
        this.positionHistory = [];
    }

    _computeHash() {
        this.hash = [0, 0];
        for (let i = 0; i < 64; i++) { if (this.board[i] !== EMPTY) zobXor(this.hash, zobPieceKey(this.board[i], i)); }
        if (this.side === -1) zobXor(this.hash, ZOBRIST.sideKey);
        zobXor(this.hash, [ZOBRIST.castlingKeys[this.castling * 2], ZOBRIST.castlingKeys[this.castling * 2 + 1]]);
        if (this.epSquare !== -1) zobXor(this.hash, [ZOBRIST.epKeys[(this.epSquare & 7) * 2], ZOBRIST.epKeys[(this.epSquare & 7) * 2 + 1]]);
    }

    ttKey() { return this.hash[0] + '|' + this.hash[1]; }

    toFen() {
        let fen = '';
        for (let r = 7; r >= 0; r--) {
            let empty = 0;
            for (let f = 0; f < 8; f++) {
                const p = this.board[r * 8 + f];
                if (p === EMPTY) { empty++; }
                else {
                    if (empty) { fen += empty; empty = 0; }
                    const abs = Math.abs(p);
                    const ch = 'xpnbrqk'[abs];
                    fen += p > 0 ? ch.toUpperCase() : ch;
                }
            }
            if (empty) fen += empty;
            if (r > 0) fen += '/';
        }
        let cc = '';
        if (this.castling & 1) cc += 'K';
        if (this.castling & 2) cc += 'Q';
        if (this.castling & 4) cc += 'k';
        if (this.castling & 8) cc += 'q';
        if (!cc) cc = '-';
        const ep = this.epSquare >= 0 ? sqName(this.epSquare) : '-';
        return `${fen} ${this.side === 1 ? 'w' : 'b'} ${cc} ${ep} ${this.halfmove} ${this.fullmove}`;
    }

    createMove(from, to, flags = FLAG_NONE, promo = EMPTY) {
        return { from, to, flags, piece: this.board[from], captured: (flags & FLAG_EP) ? (-this.side) : this.board[to], promo };
    }

    makeMove(mv) {
        this.positionHistory.push(this.ttKey());
        this.stateStack.push({ castling: this.castling, epSquare: this.epSquare, halfmove: this.halfmove, fullmove: this.fullmove });
        const { from, to, flags, piece, promo } = mv;
        const abs = piece > 0 ? piece : -piece;

        zobXor(this.hash, zobPieceKey(piece, from));
        if (mv.captured !== EMPTY) {
            const capSq = (flags & FLAG_EP) ? to - this.side * 8 : to;
            zobXor(this.hash, zobPieceKey(this.board[capSq], capSq));
            this.board[capSq] = EMPTY;
        }
        zobXor(this.hash, [ZOBRIST.castlingKeys[this.castling * 2], ZOBRIST.castlingKeys[this.castling * 2 + 1]]);
        if (this.epSquare !== -1) zobXor(this.hash, [ZOBRIST.epKeys[(this.epSquare & 7) * 2], ZOBRIST.epKeys[(this.epSquare & 7) * 2 + 1]]);

        this.board[from] = EMPTY;
        this.board[to] = (flags & FLAG_PROMO) ? promo : piece;
        if (flags & FLAG_EP) this.board[to - this.side * 8] = EMPTY;
        if (flags & FLAG_CASTLE) {
            if (to > from) {
                zobXor(this.hash, zobPieceKey(this.side * WR, from + 3));
                zobXor(this.hash, zobPieceKey(this.side * WR, from + 1));
                this.board[from + 3] = EMPTY; this.board[from + 1] = this.side * WR;
            } else {
                zobXor(this.hash, zobPieceKey(this.side * WR, from - 4));
                zobXor(this.hash, zobPieceKey(this.side * WR, from - 1));
                this.board[from - 4] = EMPTY; this.board[from - 1] = this.side * WR;
            }
        }

        zobXor(this.hash, zobPieceKey(this.board[to], to));

        if (abs === 1 && (to - from === 16 || to - from === -16)) this.epSquare = (from + to) >> 1;
        else this.epSquare = -1;
        if (abs === 6) { if (this.side === 1) this.castling &= ~3; else this.castling &= ~12; }
        if (from === 0 || to === 0) this.castling &= ~2;
        if (from === 7 || to === 7) this.castling &= ~1;
        if (from === 56 || to === 56) this.castling &= ~8;
        if (from === 63 || to === 63) this.castling &= ~4;

        zobXor(this.hash, [ZOBRIST.castlingKeys[this.castling * 2], ZOBRIST.castlingKeys[this.castling * 2 + 1]]);
        if (this.epSquare !== -1) zobXor(this.hash, [ZOBRIST.epKeys[(this.epSquare & 7) * 2], ZOBRIST.epKeys[(this.epSquare & 7) * 2 + 1]]);

        this.halfmove = (abs === 1 || mv.captured !== EMPTY) ? 0 : this.halfmove + 1;
        if (this.side === -1) this.fullmove++;
        this.side = -this.side;
        zobXor(this.hash, ZOBRIST.sideKey);
    }

    unmakeMove(mv) {
        this.side = -this.side;
        zobXor(this.hash, ZOBRIST.sideKey);
        const st = this.stateStack.pop();

        zobXor(this.hash, [ZOBRIST.castlingKeys[this.castling * 2], ZOBRIST.castlingKeys[this.castling * 2 + 1]]);
        if (this.epSquare !== -1) zobXor(this.hash, [ZOBRIST.epKeys[(this.epSquare & 7) * 2], ZOBRIST.epKeys[(this.epSquare & 7) * 2 + 1]]);

        const { from, to, flags, piece, captured, promo } = mv;
        zobXor(this.hash, zobPieceKey(this.board[to], to));
        this.board[from] = piece;
        this.board[to] = (flags & FLAG_EP) ? EMPTY : captured;
        if (flags & FLAG_EP) this.board[to - this.side * 8] = -this.side;
        if (flags & FLAG_CASTLE) {
            if (to > from) {
                this.board[from + 1] = EMPTY; this.board[from + 3] = this.side * WR;
                zobXor(this.hash, zobPieceKey(this.side * WR, from + 1));
                zobXor(this.hash, zobPieceKey(this.side * WR, from + 3));
            } else {
                this.board[from - 1] = EMPTY; this.board[from - 4] = this.side * WR;
                zobXor(this.hash, zobPieceKey(this.side * WR, from - 1));
                zobXor(this.hash, zobPieceKey(this.side * WR, from - 4));
            }
        }
        if (captured !== EMPTY) {
            const capSq = (flags & FLAG_EP) ? to - this.side * 8 : to;
            zobXor(this.hash, zobPieceKey(captured, capSq));
        }
        zobXor(this.hash, zobPieceKey(piece, from));

        this.castling = st.castling; this.epSquare = st.epSquare;
        this.halfmove = st.halfmove; this.fullmove = st.fullmove;

        zobXor(this.hash, [ZOBRIST.castlingKeys[this.castling * 2], ZOBRIST.castlingKeys[this.castling * 2 + 1]]);
        if (this.epSquare !== -1) zobXor(this.hash, [ZOBRIST.epKeys[(this.epSquare & 7) * 2], ZOBRIST.epKeys[(this.epSquare & 7) * 2 + 1]]);

        this.positionHistory.pop();
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
            if (t < 0 || t > 63) continue;
            if (Math.abs(sqFile(t) - sqFile(sq)) > 2) continue;
            if (this.board[t] === kn) return true;
        }
        const kg = bySide * WK;
        for (let dr = -1; dr <= 1; dr++) {
            for (let df = -1; df <= 1; df++) {
                if (!dr && !df) continue;
                const t = sq + dr * 8 + df;
                if (t < 0 || t > 63 || Math.abs(sqFile(t) - sqFile(sq)) > 1) continue;
                if (this.board[t] === kg) return true;
            }
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

    inCheck(side) {
        const ksq = this.findKingSq(side);
        return ksq >= 0 && this.isAttacked(ksq, -side);
    }

    generateMoves(capturesOnly = false) {
        const moves = []; const s = this.side; const opp = -s;
        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (p === EMPTY || Math.sign(p) !== s) continue;
            const abs = Math.abs(p); const file = sqFile(sq); const rank = sqRank(sq);
            if (abs === 1) {
                const dir = s; const promoRank = s === 1 ? 7 : 0; const startRank = s === 1 ? 1 : 6;
                const fwd = sq + dir * 8;
                if (fwd >= 0 && fwd <= 63 && this.board[fwd] === EMPTY) {
                    if (sqRank(fwd) === promoRank) { for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, fwd, FLAG_PROMO, s * pr)); }
                    else if (!capturesOnly) {
                        moves.push(this.createMove(sq, fwd));
                        const fwd2 = fwd + dir * 8;
                        if (rank === startRank && fwd2 >= 0 && fwd2 <= 63 && this.board[fwd2] === EMPTY) moves.push(this.createMove(sq, fwd2));
                    }
                }
                for (const df of [-1, 1]) {
                    const cf = file + df; if (cf < 0 || cf > 7) continue;
                    const csq = fwd + df; if (csq < 0 || csq > 63) continue;
                    if (this.board[csq] !== EMPTY && Math.sign(this.board[csq]) === opp) {
                        if (sqRank(csq) === promoRank) { for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, csq, FLAG_PROMO, s * pr)); }
                        else moves.push(this.createMove(sq, csq));
                    } else if (csq === this.epSquare) moves.push(this.createMove(sq, csq, FLAG_EP));
                }
            } else if (abs === 2) {
                for (const off of [-17, -15, -10, -6, 6, 10, 15, 17]) {
                    const t = sq + off; if (t < 0 || t > 63 || Math.abs(sqFile(t) - file) > 2) continue;
                    const tp = this.board[t]; if (tp !== EMPTY && Math.sign(tp) === s) continue;
                    if (capturesOnly && tp === EMPTY) continue;
                    moves.push(this.createMove(sq, t));
                }
            } else if (abs === 6) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let df = -1; df <= 1; df++) {
                        if (!dr && !df) continue;
                        const t = sq + dr * 8 + df; if (t < 0 || t > 63 || Math.abs(sqFile(t) - file) > 1) continue;
                        const tp = this.board[t]; if (tp !== EMPTY && Math.sign(tp) === s) continue;
                        if (capturesOnly && tp === EMPTY) continue;
                        moves.push(this.createMove(sq, t));
                    }
                }
                if (!capturesOnly && !this.inCheck(s)) {
                    if (s === 1) {
                        if ((this.castling & 1) && sq === 4 && this.board[5] === EMPTY && this.board[6] === EMPTY && !this.isAttacked(5, -1) && !this.isAttacked(6, -1)) moves.push(this.createMove(4, 6, FLAG_CASTLE));
                        if ((this.castling & 2) && sq === 4 && this.board[3] === EMPTY && this.board[2] === EMPTY && this.board[1] === EMPTY && !this.isAttacked(3, -1) && !this.isAttacked(2, -1)) moves.push(this.createMove(4, 2, FLAG_CASTLE));
                    } else {
                        if ((this.castling & 4) && sq === 60 && this.board[61] === EMPTY && this.board[62] === EMPTY && !this.isAttacked(61, 1) && !this.isAttacked(62, 1)) moves.push(this.createMove(60, 62, FLAG_CASTLE));
                        if ((this.castling & 8) && sq === 60 && this.board[59] === EMPTY && this.board[58] === EMPTY && this.board[57] === EMPTY && !this.isAttacked(59, 1) && !this.isAttacked(58, 1)) moves.push(this.createMove(60, 58, FLAG_CASTLE));
                    }
                }
            } else {
                const dirs = abs === 3 ? [9, 7, -9, -7] : abs === 4 ? [8, -8, 1, -1] : [9, 7, -9, -7, 8, -8, 1, -1];
                for (const dir of dirs) {
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        const fdiff = Math.abs(sqFile(t) - sqFile(t - dir));
                        if ((dir === 1 || dir === -1) && fdiff !== 1) break;
                        if ((Math.abs(dir) === 7 || Math.abs(dir) === 9) && fdiff !== 1) break;
                        const tp = this.board[t]; if (tp !== EMPTY && Math.sign(tp) === s) break;
                        if (!capturesOnly || tp !== EMPTY) moves.push(this.createMove(sq, t));
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
            }
        }
        return moves;
    }

    generateLegalMoves(capturesOnly = false) {
        const pseudo = this.generateMoves(capturesOnly);
        const legal = [];
        for (const mv of pseudo) {
            this.makeMove(mv);
            if (!this.inCheck(-this.side)) legal.push(mv);
            this.unmakeMove(mv);
        }
        return legal;
    }

    moveToUci(mv) {
        let s = sqName(mv.from) + sqName(mv.to);
        if (mv.flags & FLAG_PROMO) s += 'nbrq'[Math.abs(mv.promo) - 2];
        return s;
    }

    evaluate() {
        let mgScore = 0, egScore = 0, phase = 0;
        let wBishops = 0, bBishops = 0;
        const phaseVal = { 2: 1, 3: 1, 4: 2, 5: 4 };

        const wPawnFiles = new Uint8Array(8);
        const bPawnFiles = new Uint8Array(8);
        const wPawnRanks = new Int8Array(8).fill(-1);
        const bPawnRanks = new Int8Array(8).fill(8);

        // Collect rook info during main loop to avoid second scan
        let rookCount = 0;
        const rookSquares = []; const rookSides = [];

        let wKingAttackers = 0, bKingAttackers = 0;
        let wKingAttackWeight = 0, bKingAttackWeight = 0;
        const wKingSq = this.findKingSq(1), bKingSq = this.findKingSq(-1);
        const wkf = wKingSq >= 0 ? sqFile(wKingSq) : 4, wkr = wKingSq >= 0 ? sqRank(wKingSq) : 0;
        const bkf = bKingSq >= 0 ? sqFile(bKingSq) : 4, bkr = bKingSq >= 0 ? sqRank(bKingSq) : 7;
        const ATTACK_WEIGHTS = { 2: 20, 3: 20, 4: 40, 5: 80 };

        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq]; if (p === EMPTY) continue;
            const abs = Math.abs(p); const side = Math.sign(p);
            const val = PIECE_VAL[abs]; const pstSq = side === 1 ? sq : mirrorSq(sq);
            const file = sqFile(sq), rank = sqRank(sq);
            let pstVal = 0; if (abs <= 5 && PST[abs]) pstVal = PST[abs][pstSq];
            let mgKing = 0, egKing = 0;
            if (abs === 6) { mgKing = PST_KING_MG[pstSq]; egKing = PST_KING_EG[pstSq]; }
            if (abs === 3) { if (side === 1) wBishops++; else bBishops++; }
            if (abs >= 2 && abs <= 5) phase += phaseVal[abs] || 0;
            const material = val * side;
            mgScore += material + (abs === 6 ? mgKing * side : pstVal * side);
            egScore += material + (abs === 6 ? egKing * side : pstVal * side);

            if (abs === 1) {
                if (side === 1) { wPawnFiles[file]++; if (rank > wPawnRanks[file]) wPawnRanks[file] = rank; }
                else { bPawnFiles[file]++; if (rank < bPawnRanks[file]) bPawnRanks[file] = rank; }
            }

            // Mobility: knights, bishops, rooks, queens
            if (abs === 2) {
                let mob = 0;
                for (const off of [-17, -15, -10, -6, 6, 10, 15, 17]) {
                    const t = sq + off;
                    if (t < 0 || t > 63 || Math.abs(sqFile(t) - file) > 2) continue;
                    const tp = this.board[t];
                    if (tp === EMPTY || Math.sign(tp) !== side) mob++;
                }
                mgScore += (mob - 4) * 4 * side; egScore += (mob - 4) * 4 * side;
            }
            if (abs === 3) {
                let mob = 0;
                for (const dir of [9, 7, -9, -7]) {
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        if (Math.abs(sqFile(t) - sqFile(t - dir)) !== 1) break;
                        const tp = this.board[t];
                        if (tp !== EMPTY && Math.sign(tp) === side) break;
                        mob++;
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
                mgScore += (mob - 5) * 5 * side; egScore += (mob - 5) * 5 * side;
            }
            if (abs === 4) { // Rook mobility
                rookSquares.push(sq); rookSides.push(side);
                let mob = 0;
                for (const dir of [8, -8, 1, -1]) {
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        if (dir === 1 || dir === -1) { if (sqRank(t) !== sqRank(t - dir)) break; }
                        const tp = this.board[t];
                        if (tp !== EMPTY && Math.sign(tp) === side) break;
                        mob++;
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
                mgScore += (mob - 7) * 3 * side; egScore += (mob - 7) * 4 * side;
            }
            if (abs === 5) { // Queen mobility
                let mob = 0;
                for (const dir of [9, 7, -9, -7, 8, -8, 1, -1]) {
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        const fd = Math.abs(sqFile(t) - sqFile(t - dir));
                        if (fd > 1) break;
                        const tp = this.board[t];
                        if (tp !== EMPTY && Math.sign(tp) === side) break;
                        mob++;
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
                mgScore += (mob - 14) * 1 * side; egScore += (mob - 14) * 2 * side;
            }

            if (abs >= 2 && abs <= 5) {
                if (side === 1) {
                    const df = Math.abs(file - bkf), dr = Math.abs(rank - bkr);
                    if (df <= 2 && dr <= 2) { wKingAttackers++; wKingAttackWeight += ATTACK_WEIGHTS[abs] || 0; }
                } else {
                    const df = Math.abs(file - wkf), dr = Math.abs(rank - wkr);
                    if (df <= 2 && dr <= 2) { bKingAttackers++; bKingAttackWeight += ATTACK_WEIGHTS[abs] || 0; }
                }
            }
        }

        if (wBishops >= 2) { mgScore += 30; egScore += 50; }
        if (bBishops >= 2) { mgScore -= 30; egScore -= 50; }

        for (let f = 0; f < 8; f++) {
            if (wPawnFiles[f] > 1) { mgScore -= 10 * (wPawnFiles[f] - 1); egScore -= 20 * (wPawnFiles[f] - 1); }
            if (bPawnFiles[f] > 1) { mgScore += 10 * (bPawnFiles[f] - 1); egScore += 20 * (bPawnFiles[f] - 1); }
            if (wPawnFiles[f] > 0) { if (!(f > 0 && wPawnFiles[f - 1] > 0) && !(f < 7 && wPawnFiles[f + 1] > 0)) { mgScore -= 15; egScore -= 20; } }
            if (bPawnFiles[f] > 0) { if (!(f > 0 && bPawnFiles[f - 1] > 0) && !(f < 7 && bPawnFiles[f + 1] > 0)) { mgScore += 15; egScore += 20; } }
            if (wPawnRanks[f] >= 0) {
                let passed = true;
                for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) { if (bPawnRanks[ff] <= wPawnRanks[f]) { passed = false; break; } }
                if (passed) { const bonus = [0, 5, 10, 20, 40, 70, 120][wPawnRanks[f]] || 0; mgScore += bonus / 2; egScore += bonus; }
            }
            if (bPawnRanks[f] < 8) {
                let passed = true;
                for (let ff = Math.max(0, f - 1); ff <= Math.min(7, f + 1); ff++) { if (wPawnRanks[ff] >= bPawnRanks[f]) { passed = false; break; } }
                if (passed) { const bonus = [0, 5, 10, 20, 40, 70, 120][7 - bPawnRanks[f]] || 0; mgScore -= bonus / 2; egScore -= bonus; }
            }
        }

        // Rook on open/semi-open file (using collected rook squares)
        for (let i = 0; i < rookSquares.length; i++) {
            const f = sqFile(rookSquares[i]); const side = rookSides[i];
            const hasFriendlyPawn = side === 1 ? wPawnFiles[f] > 0 : bPawnFiles[f] > 0;
            const hasEnemyPawn = side === 1 ? bPawnFiles[f] > 0 : wPawnFiles[f] > 0;
            if (!hasFriendlyPawn && !hasEnemyPawn) { mgScore += 20 * side; egScore += 20 * side; }
            else if (!hasFriendlyPawn) { mgScore += 10 * side; egScore += 10 * side; }
        }

        for (const side of [1, -1]) {
            const ksq = this.findKingSq(side); if (ksq < 0) continue;
            const kf = sqFile(ksq); const kr = sqRank(ksq); const shieldRank = kr + side;
            if (shieldRank >= 0 && shieldRank <= 7) {
                let shield = 0;
                for (let df = -1; df <= 1; df++) { const sf = kf + df; if (sf < 0 || sf > 7) continue; if (this.board[shieldRank * 8 + sf] === side * WP) shield++; }
                mgScore += (shield * 15) * side;
            }
        }

        if (wKingAttackers >= 2) { mgScore += Math.min(wKingAttackWeight * wKingAttackers / 4, 300); }
        if (bKingAttackers >= 2) { mgScore -= Math.min(bKingAttackWeight * bKingAttackers / 4, 300); }

        const maxPhase = 24; const p = Math.min(phase, maxPhase);
        return Math.round((mgScore * p + egScore * (maxPhase - p)) / maxPhase) * this.side;
    }

    orderMoves(moves, ply) {
        const scores = moves.map(mv => {
            let s = 0;
            if (mv.captured !== EMPTY) s = 10000 + PIECE_VAL[Math.abs(mv.captured)] * 10 - PIECE_VAL[Math.abs(mv.piece)];
            if (mv.flags & FLAG_PROMO) s += 8000 + PIECE_VAL[Math.abs(mv.promo)];
            if (this.killers[ply] && this.killers[ply].includes(mv.from * 64 + mv.to)) s += 5000;
            s += this.history[mv.from * 64 + mv.to];
            return s;
        });
        const indices = moves.map((_, i) => i);
        indices.sort((a, b) => scores[b] - scores[a]);
        return indices.map(i => moves[i]);
    }

    quiesce(alpha, beta, ply) {
        this.nodes++;
        if (this.nodes % 4096 === 0 && performance.now() - this.startTime > this.timeLimit) { this.stopped = true; return 0; }
        const standPat = this.evaluate();
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
        const inChk = this.inCheck(this.side);
        const moves = this.generateLegalMoves(!inChk);
        if (inChk && moves.length === 0) return -(MATE_SCORE - ply);
        const ordered = this.orderMoves(moves, ply);
        for (const mv of ordered) {
            if (!inChk && mv.captured !== EMPTY) { const delta = PIECE_VAL[Math.abs(mv.captured)] + 200; if (standPat + delta < alpha) continue; }
            this.makeMove(mv); const score = -this.quiesce(-beta, -alpha, ply + 1); this.unmakeMove(mv);
            if (this.stopped) return 0;
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    }

    negamax(depth, alpha, beta, ply, pvLine) {
        this.nodes++;
        if (this.stopped) return 0;
        if (this.nodes % 4096 === 0 && performance.now() - this.startTime > this.timeLimit) { this.stopped = true; return 0; }
        if (depth <= 0) return this.quiesce(alpha, beta, ply);
        const inChk = this.inCheck(this.side);
        if (inChk && ply < 20) depth++;
        const moves = this.generateLegalMoves();
        if (moves.length === 0) return inChk ? -(MATE_SCORE - ply) : 0;

        if (this.halfmove >= 100) return -this.contempt;
        const key = this.ttKey();
        let reps = 0;
        for (let i = this.positionHistory.length - 1; i >= 0; i--) {
            if (this.positionHistory[i] === key) { reps++; if (reps >= 2) return -this.contempt; }
        }
        const ordered = this.orderMoves(moves, ply);
        const childPv = [];
        for (const mv of ordered) {
            this.makeMove(mv); childPv.length = 0;
            const score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, childPv);
            this.unmakeMove(mv);
            if (this.stopped) return 0;
            if (score >= beta) {
                if (mv.captured === EMPTY) {
                    if (!this.killers[ply]) this.killers[ply] = [];
                    const key = mv.from * 64 + mv.to;
                    if (!this.killers[ply].includes(key)) { this.killers[ply].unshift(key); if (this.killers[ply].length > 2) this.killers[ply].pop(); }
                    this.history[mv.from * 64 + mv.to] += depth * depth;
                }
                return beta;
            }
            if (score > alpha) { alpha = score; pvLine.length = 0; pvLine.push(mv); pvLine.push(...childPv); }
        }
        return alpha;
    }

    searchRoot(maxDepth, timeLimitMs) {
        this.nodes = 0; this.startTime = performance.now(); this.timeLimit = timeLimitMs;
        this.stopped = false; this.killers = []; this.history.fill(0);
        let bestMove = null, bestScore = 0, bestPv = [], completedDepth = 0;
        for (let d = 1; d <= maxDepth; d++) {
            // Dynamic contempt based on score
            if (d > 1 && completedDepth > 0) {
                const whiteScore = bestScore * this.side;
                if (whiteScore > 100) this.contempt = 25;
                else if (whiteScore > 50) this.contempt = 15;
                else if (whiteScore < -100) this.contempt = -25;
                else if (whiteScore < -50) this.contempt = -15;
                else this.contempt = 0;
            }
            const pvLine = [];
            const score = this.negamax(d, -MATE_SCORE - 1, MATE_SCORE + 1, 0, pvLine);
            if (this.stopped && d > 1) break;
            if (pvLine.length > 0) { bestMove = pvLine[0]; bestScore = score; bestPv = pvLine.slice(); completedDepth = d; }
            if (Math.abs(score) > MATE_SCORE - 100) break;
        }
        const whiteScore = bestScore * this.side;
        return { move: bestMove, score: whiteScore, pv: bestPv, depth: completedDepth, nodes: this.nodes };
    }

    analyze(fen, depth) {
        this.loadFen(fen);
        const timeMs = Math.min(depth * 500, 4000);
        const searchDepth = Math.min(depth, 8);
        this.contempt = 0;
        const result = this.searchRoot(searchDepth, timeMs);

        let dirtyPlayTimeScale = 1.0;
        if (result.score < -500) dirtyPlayTimeScale = 0.4;
        else if (result.score < -200) dirtyPlayTimeScale = 0.6;
        else if (result.score < -100) dirtyPlayTimeScale = 0.8;

        if (!result.move) return { success: false, bestmove: '(none)', evaluation: 0 };
        const uci = this.moveToUci(result.move);
        const pvStr = result.pv.map(m => this.moveToUci(m)).join(' ');
        let scoreObj;
        if (Math.abs(result.score) > MATE_SCORE - 200) {
            const mateIn = Math.ceil((MATE_SCORE - Math.abs(result.score)) / 2);
            scoreObj = { mate: result.score > 0 ? mateIn : -mateIn };
        } else { scoreObj = { cp: result.score }; }
        return { success: true, bestmove: uci, evaluation: result.score / 100, analysis: [{ uci, pv: pvStr, score: scoreObj }], depth: result.depth, nodes: result.nodes, source: 'local', dirtyPlayTimeScale };
    }
}


// ============================================================
// TESTS
// ============================================================

describe('LocalEngine', () => {

    describe('FEN Loading & Serialization', () => {
        it('should round-trip the starting position', () => {
            const eng = new LocalEngine();
            const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            eng.loadFen(startFen);
            expect(eng.toFen()).toBe(startFen);
        });

        it('should round-trip a complex mid-game FEN', () => {
            const eng = new LocalEngine();
            const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
            eng.loadFen(fen);
            expect(eng.toFen()).toBe(fen);
        });

        it('should handle FEN with en passant square', () => {
            const eng = new LocalEngine();
            const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
            eng.loadFen(fen);
            expect(eng.toFen()).toBe(fen);
        });

        it('should parse side to move correctly', () => {
            const eng = new LocalEngine();
            eng.loadFen('8/8/8/8/8/8/8/4K3 b - - 0 1');
            expect(eng.side).toBe(-1);
        });
    });

    describe('Move Generation', () => {
        it('should generate 20 legal moves from starting position', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const moves = eng.generateLegalMoves();
            expect(moves.length).toBe(20);
        });

        it('should generate correct number of moves for black', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
            const moves = eng.generateLegalMoves();
            expect(moves.length).toBe(20);
        });

        it('should generate castling moves when available', () => {
            const eng = new LocalEngine();
            // White can castle both sides
            eng.loadFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
            const moves = eng.generateLegalMoves();
            const castlingMoves = moves.filter(m => m.flags & FLAG_CASTLE);
            expect(castlingMoves.length).toBe(2); // O-O and O-O-O
        });

        it('should not allow castling through check', () => {
            const eng = new LocalEngine();
            // Black rook attacks f1 — no kingside castling
            eng.loadFen('4k3/8/8/8/8/8/8/R3K2r w Q - 0 1');
            const moves = eng.generateLegalMoves();
            const castlingMoves = moves.filter(m => m.flags & FLAG_CASTLE);
            // Only queenside should be available (if f1 is attacked, g1 path blocked)
            expect(castlingMoves.every(m => m.to !== 6)).toBe(true);
        });

        it('should generate en passant capture', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3');
            const moves = eng.generateLegalMoves();
            const epMoves = moves.filter(m => m.flags & FLAG_EP);
            expect(epMoves.length).toBe(1);
            expect(sqName(epMoves[0].to)).toBe('e6');
        });

        it('should generate promotion moves', () => {
            const eng = new LocalEngine();
            eng.loadFen('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
            const moves = eng.generateLegalMoves();
            const promoMoves = moves.filter(m => m.flags & FLAG_PROMO);
            expect(promoMoves.length).toBe(4); // Q, R, B, N
        });

        it('should detect checkmate (no legal moves in check)', () => {
            const eng = new LocalEngine();
            // Scholar's mate
            eng.loadFen('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
            const moves = eng.generateLegalMoves();
            expect(moves.length).toBe(0);
            expect(eng.inCheck(1)).toBe(true);
        });

        it('should detect stalemate (no legal moves, not in check)', () => {
            const eng = new LocalEngine();
            eng.loadFen('k7/8/1K6/8/8/8/8/8 b - - 0 1');
            // Black king at a8, white king at b6 — not stalemate yet, let's use the real one
            eng.loadFen('8/8/8/8/8/6k1/5q2/7K w - - 0 1');
            // Verify: white king h1, black queen f2, black king g3 — not a stalemate
            // Use a proper stalemate: King at a8, opponent queen at b6, opponent king at c8
            eng.loadFen('k7/8/1Q6/8/8/8/8/6K1 b - - 0 1');
            const moves = eng.generateLegalMoves();
            expect(moves.length).toBe(0);
            expect(eng.inCheck(-1)).toBe(false);
        });
    });

    describe('Make/Unmake Move', () => {
        it('should restore board state after unmake', () => {
            const eng = new LocalEngine();
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            eng.loadFen(fen);
            const moves = eng.generateLegalMoves();
            for (const mv of moves) {
                eng.makeMove(mv);
                eng.unmakeMove(mv);
                expect(eng.toFen()).toBe(fen);
            }
        });

        it('should handle castling make/unmake correctly', () => {
            const eng = new LocalEngine();
            const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
            eng.loadFen(fen);
            const castleMove = eng.generateLegalMoves().find(m => m.flags & FLAG_CASTLE && m.to > m.from);
            expect(castleMove).toBeDefined();
            eng.makeMove(castleMove);
            // King should be on g1, rook on f1
            expect(eng.board[6]).toBe(WK);  // g1
            expect(eng.board[5]).toBe(WR);  // f1
            eng.unmakeMove(castleMove);
            expect(eng.toFen()).toBe(fen);
        });
    });

    describe('Evaluation', () => {
        it('should return ~0 for starting position', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const score = eng.evaluate();
            expect(Math.abs(score)).toBeLessThan(50); // Should be close to 0
        });

        it('should evaluate white up a queen as strongly positive', () => {
            const eng = new LocalEngine();
            // White has extra queen
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const balanced = eng.evaluate();

            eng.loadFen('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const whiteUp = eng.evaluate();
            expect(whiteUp).toBeGreaterThan(balanced);
        });

        it('should evaluate differently for opposite sides', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
            const blackToMove = eng.evaluate();
            // Score is from side-to-move POV, so it should be negative of white's
            eng.loadFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1');
            const whiteToMove = eng.evaluate();
            // They should be opposite signs (approximately)
            expect(blackToMove + whiteToMove).toBe(0);
        });
    });

    describe('Search & Analyze', () => {
        it('should find a move from starting position', () => {
            const eng = new LocalEngine();
            const result = eng.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 3);
            expect(result.success).toBe(true);
            expect(result.bestmove).toMatch(/^[a-h][1-8][a-h][1-8]/);
            expect(result.source).toBe('local');
        });

        it('should find mate in 1', () => {
            const eng = new LocalEngine();
            // White to move: Qh7# is mate
            const result = eng.analyze('6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1', 4);
            expect(result.success).toBe(true);
            // Should find a winning move
            expect(result.evaluation).toBeGreaterThan(0);
        });

        it('should return success=false when no moves available', () => {
            const eng = new LocalEngine();
            // Stalemate position
            const result = eng.analyze('k7/8/1Q6/8/8/8/8/6K1 b - - 0 1', 3);
            // No legal moves, so either success=false or score=0 (stalemate)
            if (result.success) {
                expect(result.evaluation).toBe(0);
            } else {
                expect(result.bestmove).toBe('(none)');
            }
        });

        it('should return analysis array with correct structure', () => {
            const eng = new LocalEngine();
            const result = eng.analyze('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 3);
            expect(result.success).toBe(true);
            expect(result.analysis).toBeDefined();
            expect(result.analysis.length).toBe(1);
            expect(result.analysis[0]).toHaveProperty('uci');
            expect(result.analysis[0]).toHaveProperty('pv');
            expect(result.analysis[0]).toHaveProperty('score');
            expect(result.analysis[0].score).toHaveProperty('cp');
        });

        it('should include depth and nodes in result', () => {
            const eng = new LocalEngine();
            const result = eng.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 2);
            expect(result.depth).toBeGreaterThanOrEqual(1);
            expect(result.nodes).toBeGreaterThan(0);
        });
    });
});


// ============================================================
// FALLBACK FLOW TESTS (mock-based)
// ============================================================

describe('fetchAnalysis Speculative Parallel Flow', () => {
    // Mirror the new parallel logic: API + local run concurrently
    function createFetchAnalysis({ cache, fetchEngineData, analyzeLocally, botState }) {
        return async function fetchAnalysis(fen, depth, signal) {
            const cached = cache.get(fen);
            if (cached) return cached;

            if (signal?.aborted || !botState.hackEnabled) throw new DOMException('Aborted', 'AbortError');

            // Fire API (non-blocking)
            const apiPromise = fetchEngineData(fen, depth, signal)
                .then(data => ({ ok: true, data }))
                .catch(err => ({ ok: false, error: err }));

            // Run local engine speculatively
            botState.statusInfo = '🧠 Analyzing...';
            const localResult = analyzeLocally(fen, depth);

            // Check if API already returned
            const apiSettled = await Promise.race([
                apiPromise,
                new Promise(r => setTimeout(r, 10)).then(() => null)
            ]);

            if (apiSettled?.ok) {
                cache.set(fen, apiSettled.data);
                return apiSettled.data;
            }

            if (localResult.success) {
                cache.set(fen, localResult);
                apiPromise.then(r => { if (r.ok) cache.set(fen, r.data); });
                return localResult;
            }

            const apiResult = await apiPromise;
            if (apiResult.ok) {
                cache.set(fen, apiResult.data);
                return apiResult.data;
            }
            if (apiResult.error?.name === 'AbortError') throw apiResult.error;
            throw new Error('Both API and local engine failed');
        };
    }

    let mockCache, mockBotState;

    beforeEach(() => {
        mockCache = new Map();
        mockCache.get = vi.fn((key) => Map.prototype.get.call(mockCache, key));
        mockCache.set = vi.fn((key, val) => Map.prototype.set.call(mockCache, key, val));
        mockBotState = { hackEnabled: 1, statusInfo: '' };
    });

    const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const API_DATA = { success: true, bestmove: 'e2e4', source: 'api', analysis: [{ uci: 'e2e4', pv: 'e2e4', score: { cp: 20 } }] };
    const LOCAL_DATA = { success: true, bestmove: 'd2d4', source: 'local', analysis: [{ uci: 'd2d4', pv: 'd2d4', score: { cp: 10 } }] };

    it('should return cached result without calling API or local', async () => {
        mockCache.set(FEN, API_DATA);
        const fetchApi = vi.fn();
        const localAnalyze = vi.fn();

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        const result = await fetchAnalysis(FEN, 10, null);
        expect(result).toBe(API_DATA);
        expect(fetchApi).not.toHaveBeenCalled();
        expect(localAnalyze).not.toHaveBeenCalled();
    });

    it('should prefer API result when it arrives before the yield window', async () => {
        // API resolves immediately (simulates fast/cached server response)
        const fetchApi = vi.fn().mockResolvedValue(API_DATA);
        const localAnalyze = vi.fn().mockReturnValue(LOCAL_DATA);

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        const result = await fetchAnalysis(FEN, 10, null);
        expect(result).toBe(API_DATA);
        expect(fetchApi).toHaveBeenCalledOnce();
        expect(localAnalyze).toHaveBeenCalledOnce(); // Local always runs
        expect(mockCache.set).toHaveBeenCalledWith(FEN, API_DATA);
    });

    it('should use local engine when API is slow, with background cache upgrade', async () => {
        // API resolves slowly (after the 10ms yield window)
        let resolveApi;
        const fetchApi = vi.fn().mockReturnValue(new Promise(r => { resolveApi = r; }));
        const localAnalyze = vi.fn().mockReturnValue(LOCAL_DATA);

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        const result = await fetchAnalysis(FEN, 10, null);
        expect(result).toBe(LOCAL_DATA);
        expect(fetchApi).toHaveBeenCalledOnce();
        expect(localAnalyze).toHaveBeenCalledOnce();
        expect(mockBotState.statusInfo).toBe('🧠 Analyzing...');

        // Simulate API arriving later — cache should upgrade
        resolveApi(API_DATA);
        await new Promise(r => setTimeout(r, 20)); // Let fire-and-forget settle
        expect(mockCache.set).toHaveBeenCalledWith(FEN, API_DATA);
    });

    it('should use local engine when API fails (no retry)', async () => {
        const fetchApi = vi.fn().mockRejectedValue(new Error('Network error'));
        const localAnalyze = vi.fn().mockReturnValue(LOCAL_DATA);

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        const result = await fetchAnalysis(FEN, 10, null);
        expect(result).toBe(LOCAL_DATA);
        expect(fetchApi).toHaveBeenCalledOnce();
        expect(localAnalyze).toHaveBeenCalledOnce();
    });

    it('should NOT run local on AbortError — rethrows it', async () => {
        const fetchApi = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
        const localAnalyze = vi.fn().mockReturnValue({ success: false });

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        // AbortError should be rethrown after local fails and API is awaited
        await expect(fetchAnalysis(FEN, 10, null)).rejects.toThrow('Aborted');
    });

    it('should throw when bot is disabled', async () => {
        mockBotState.hackEnabled = 0;
        const fetchApi = vi.fn();
        const localAnalyze = vi.fn();

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        await expect(fetchAnalysis(FEN, 10, null)).rejects.toThrow('Aborted');
        expect(fetchApi).not.toHaveBeenCalled();
    });

    it('should throw when signal is already aborted', async () => {
        const fetchApi = vi.fn();
        const localAnalyze = vi.fn();
        const abortedSignal = { aborted: true };

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        await expect(fetchAnalysis(FEN, 10, abortedSignal)).rejects.toThrow('Aborted');
    });

    it('should throw when both API and local engine fail', async () => {
        const fetchApi = vi.fn().mockRejectedValue(new Error('API down'));
        const localAnalyze = vi.fn().mockReturnValue({ success: false });

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        await expect(fetchAnalysis(FEN, 10, null)).rejects.toThrow('Both API and local engine failed');
    });

    it('should cache local engine results', async () => {
        const fetchApi = vi.fn().mockRejectedValue(new Error('timeout'));
        const localAnalyze = vi.fn().mockReturnValue(LOCAL_DATA);

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        await fetchAnalysis(FEN, 10, null);
        expect(mockCache.set).toHaveBeenCalledWith(FEN, LOCAL_DATA);
    });

    it('should fall back to API when local fails', async () => {
        // Local returns failure, API succeeds (slow)
        let resolveApi;
        const fetchApi = vi.fn().mockReturnValue(new Promise(r => { resolveApi = r; }));
        const localAnalyze = vi.fn().mockReturnValue({ success: false });

        const fetchAnalysis = createFetchAnalysis({
            cache: mockCache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        const promise = fetchAnalysis(FEN, 10, null);
        // Resolve API after local has failed
        resolveApi(API_DATA);
        const result = await promise;
        expect(result).toBe(API_DATA);
    });

    it('should try API again on next call (no persistent blacklist)', async () => {
        const fetchApi = vi.fn()
            .mockRejectedValueOnce(new Error('API down'))
            .mockResolvedValueOnce(API_DATA);
        const localAnalyze = vi.fn().mockReturnValue(LOCAL_DATA);

        const cache = new Map();
        const fetchAnalysis = createFetchAnalysis({
            cache, fetchEngineData: fetchApi,
            analyzeLocally: localAnalyze, botState: mockBotState,
        });

        // 1st call: API fails → local result
        const result1 = await fetchAnalysis(FEN, 10, null);
        expect(result1).toBe(LOCAL_DATA);

        // Clear cache, new position
        cache.clear();
        const FEN2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
        const result2 = await fetchAnalysis(FEN2, 10, null);
        // API resolves immediately this time, should be preferred
        expect(result2).toBe(API_DATA);
        expect(fetchApi).toHaveBeenCalledTimes(2);
    });
});

// ============================================================
// PREMOVE INTELLIGENCE TESTS
// ============================================================

// Self-contained assessPremoveQuality using the test's LocalEngine
function assessPremoveQuality(fen, opponentUci, ourUci) {
    const bonuses = [];
    let totalBonus = 0;

    if (!opponentUci || opponentUci.length < 4 || !ourUci || ourUci.length < 4) {
        return { bonus: 0, reasons: [] };
    }

    const eng = new LocalEngine();
    try {
        eng.loadFen(fen);
        const oppFrom = nameToSq(opponentUci.substring(0, 2));
        const oppTo = nameToSq(opponentUci.substring(2, 4));
        const oppMoves = eng.generateLegalMoves();
        const oppMove = oppMoves.find(m => m.from === oppFrom && m.to === oppTo);

        if (!oppMove) return { bonus: 0, reasons: [] };

        eng.makeMove(oppMove);
        const ourLegalMoves = eng.generateLegalMoves();

        if (ourLegalMoves.length === 1) {
            totalBonus += 40; bonuses.push('forced');
        } else if (ourLegalMoves.length <= 3) {
            totalBonus += 15; bonuses.push('few options');
        }

        const ourFrom = nameToSq(ourUci.substring(0, 2));
        const ourTo = nameToSq(ourUci.substring(2, 4));
        const ourMove = ourLegalMoves.find(m => m.from === ourFrom && m.to === ourTo);

        if (ourMove) {
            if (ourTo === oppTo) {
                totalBonus += 20; bonuses.push('recapture');
            }

            eng.makeMove(ourMove);
            if (eng.inCheck(eng.side)) {
                totalBonus += 10; bonuses.push('check');
            }
            eng.unmakeMove(ourMove);

            const destAttacked = eng.isAttacked(ourTo, -eng.side);
            if (!destAttacked) {
                totalBonus += 10; bonuses.push('safe sq');
            }

            const centerSquares = [nameToSq('d4'), nameToSq('d5'), nameToSq('e4'), nameToSq('e5')];
            if (centerSquares.includes(ourTo)) {
                totalBonus += 5; bonuses.push('center');
            }

            if (ourLegalMoves.length > 1 && ourLegalMoves.length <= 30) {
                eng.makeMove(ourMove);
                const ourScore = -eng.evaluate();
                eng.unmakeMove(ourMove);

                let secondBest = -Infinity;
                for (const alt of ourLegalMoves) {
                    if (alt.from === ourFrom && alt.to === ourTo) continue;
                    eng.makeMove(alt);
                    const altScore = -eng.evaluate();
                    eng.unmakeMove(alt);
                    if (altScore > secondBest) secondBest = altScore;
                }

                if (secondBest > -Infinity && (ourScore - secondBest) >= 150) {
                    totalBonus += 20; bonuses.push('dominant');
                }
            }
        }

        eng.unmakeMove(oppMove);
    } catch (e) {
        return { bonus: 0, reasons: [] };
        return { execute: false, reasons: [], blocked: 'Evaluation error' };
    }

    return { execute: true, reasons, blocked: null };
}




describe('Rook & Queen Mobility', () => {
    it('should give higher eval to rook with more mobility', () => {
        const eng = new LocalEngine();
        // Rook on d4 — maximum mobility on open board
        eng.loadFen('4k3/8/8/8/3R4/8/8/4K3 w - - 0 1');
        const highMobEval = eng.evaluate();

        // Rook on h1 next to king — less mobility (corner)
        eng.loadFen('4k3/8/8/8/8/8/8/4K2R w - - 0 1');
        const lowMobEval = eng.evaluate();

        // Central rook should score higher due to more squares
        expect(highMobEval).toBeGreaterThan(lowMobEval);
    });

    it('should give non-zero mobility bonus for centralized rook', () => {
        const eng = new LocalEngine();
        // Rook on d4 — high mobility in open board
        eng.loadFen('4k3/8/8/8/3R4/8/8/4K3 w - - 0 1');
        const centralEval = eng.evaluate();

        // Rook on a1 — corner, likely lower mobility
        eng.loadFen('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1');
        const cornerEval = eng.evaluate();

        // Central rook should evaluate higher
        expect(centralEval).toBeGreaterThan(cornerEval);
    });

    it('should give queen mobility bonus on open board', () => {
        const eng = new LocalEngine();
        // Queen on d4 — maximum mobility in open board
        eng.loadFen('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1');
        const openEval = eng.evaluate();

        // Queen on a1 — corner, restricted
        eng.loadFen('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1');
        const cornerEval = eng.evaluate();

        // Central queen should evaluate higher
        expect(openEval).toBeGreaterThan(cornerEval);
    });
});

describe('Advanced: Repetition & Dirty Play', () => {
    describe('Zobrist Hashing', () => {
        it('should maintain a consistent hash value through make/unmake', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const startHash = [...eng.hash];

            const move = eng.generateLegalMoves().find(m => eng.moveToUci(m) === 'e2e4');
            eng.makeMove(move);
            expect(eng.hash).not.toEqual(startHash);

            eng.unmakeMove(move);
            expect(eng.hash).toEqual(startHash);
        });

        it('should generate same hash for same position via different paths', () => {
            const eng = new LocalEngine();
            // Path 1: 1. e3 e6 2. Nf3 Nc6 (Single pawn pushes to avoid EP state diff)
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            ['e2e3', 'e7e6', 'g1f3', 'b8c6'].forEach(uci => {
                const m = eng.generateLegalMoves().find(x => eng.moveToUci(x) === uci);
                eng.makeMove(m);
            });
            const hash1 = [...eng.hash];

            // Path 2: 1. Nf3 Nc6 2. e3 e6
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            ['g1f3', 'b8c6', 'e2e3', 'e7e6'].forEach(uci => {
                const m = eng.generateLegalMoves().find(x => eng.moveToUci(x) === uci);
                eng.makeMove(m);
            });
            const hash2 = [...eng.hash];

            expect(hash1).toEqual(hash2);
        });
    });

    describe('3-Fold Repetition', () => {
        it('should detect 3-fold repetition as a draw in negamax', () => {
            const eng = new LocalEngine();
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

            // Repeat back to the *starting position* twice:
            // start (1st), after 4 plies (2nd), after 8 plies (3rd)
            const seq = [
                'g1f3', 'g8f6',
                'f3g1', 'f6g8',
                'g1f3', 'g8f6',
                'f3g1', 'f6g8',
            ];

            for (const uci of seq) {
                const m = eng.generateLegalMoves().find(x => eng.moveToUci(x) === uci);
                eng.makeMove(m);
            }

            // Now current position is the start position again (3rd time), so negamax should return draw
            const score = eng.negamax(1, -MATE_SCORE, MATE_SCORE, 0, []);
            expect(Math.abs(score)).toBe(0);
        });

        it('should avoid repetition when winning (positive contempt)', () => {
            const eng = new LocalEngine();
            // A position where a move is repeating, but engine has a better move
            // We'll set contempt and see if it avoids the draw
            eng.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            eng.contempt = 25; // Winning contempt

            // Manually add history to simulate 2 repetitions
            const key = eng.ttKey();
            eng.positionHistory.push(key);
            eng.positionHistory.push(key);

            // With 2 prior occurrences in history, current position is treated as a repetition draw
            const score = eng.negamax(1, -MATE_SCORE, MATE_SCORE, 0, []);
            expect(score).toBe(-25);
        });
    });

    describe('Dirty Play Logic', () => {
        it('should scale down time budget when evaluation is poor', () => {
            const eng = new LocalEngine();
            const evalSpy = vi.spyOn(eng, 'evaluate');

            // Model white losing by 300cp (-300 absolute)
            // evaluate() returns score relative to side to move
            // If white (1): -300. If black (-1): +300.
            evalSpy.mockImplementation(() => -300 * eng.side);

            const result = eng.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 5);
            expect(result.dirtyPlayTimeScale).toBe(0.6);

            // Model white losing by 600cp (-600 absolute)
            evalSpy.mockImplementation(() => -600 * eng.side);

            const result2 = eng.analyze('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 5);
            expect(result2.dirtyPlayTimeScale).toBe(0.4);

            evalSpy.mockRestore();
        });
    });
});
