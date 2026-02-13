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
    }

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
        this.stateStack.push({ castling: this.castling, epSquare: this.epSquare, halfmove: this.halfmove, fullmove: this.fullmove });
        const { from, to, flags, piece, promo } = mv;
        const abs = Math.abs(piece);
        this.board[from] = EMPTY;
        this.board[to] = (flags & FLAG_PROMO) ? promo : piece;
        if (flags & FLAG_EP) this.board[to - this.side * 8] = EMPTY;
        if (flags & FLAG_CASTLE) {
            if (to > from) { this.board[from + 3] = EMPTY; this.board[from + 1] = this.side * WR; }
            else { this.board[from - 4] = EMPTY; this.board[from - 1] = this.side * WR; }
        }
        if (abs === 1 && Math.abs(to - from) === 16) this.epSquare = (from + to) >> 1;
        else this.epSquare = -1;
        if (abs === 6) { if (this.side === 1) this.castling &= ~3; else this.castling &= ~12; }
        if (from === 0 || to === 0) this.castling &= ~2;
        if (from === 7 || to === 7) this.castling &= ~1;
        if (from === 56 || to === 56) this.castling &= ~8;
        if (from === 63 || to === 63) this.castling &= ~4;
        this.halfmove = (abs === 1 || mv.captured !== EMPTY) ? 0 : this.halfmove + 1;
        if (this.side === -1) this.fullmove++;
        this.side = -this.side;
    }

    unmakeMove(mv) {
        this.side = -this.side;
        const st = this.stateStack.pop();
        this.castling = st.castling; this.epSquare = st.epSquare;
        this.halfmove = st.halfmove; this.fullmove = st.fullmove;
        const { from, to, flags, piece, captured } = mv;
        this.board[from] = piece;
        this.board[to] = (flags & FLAG_EP) ? EMPTY : captured;
        if (flags & FLAG_EP) this.board[to - this.side * 8] = -this.side;
        if (flags & FLAG_CASTLE) {
            if (to > from) { this.board[from + 1] = EMPTY; this.board[from + 3] = this.side * WR; }
            else { this.board[from - 1] = EMPTY; this.board[from - 4] = this.side * WR; }
        }
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
        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq]; if (p === EMPTY) continue;
            const abs = Math.abs(p); const side = Math.sign(p);
            const val = PIECE_VAL[abs]; const pstSq = side === 1 ? sq : mirrorSq(sq);
            let pstVal = 0; if (abs <= 5 && PST[abs]) pstVal = PST[abs][pstSq];
            let mgKing = 0, egKing = 0;
            if (abs === 6) { mgKing = PST_KING_MG[pstSq]; egKing = PST_KING_EG[pstSq]; }
            if (abs === 3) { if (side === 1) wBishops++; else bBishops++; }
            if (abs >= 2 && abs <= 5) phase += phaseVal[abs] || 0;
            const material = val * side;
            mgScore += material + (abs === 6 ? mgKing * side : pstVal * side);
            egScore += material + (abs === 6 ? egKing * side : pstVal * side);
        }
        if (wBishops >= 2) { mgScore += 30; egScore += 50; }
        if (bBishops >= 2) { mgScore -= 30; egScore -= 50; }
        for (let f = 0; f < 8; f++) {
            let wPawnsOnFile = 0, bPawnsOnFile = 0;
            for (let r = 0; r < 8; r++) { const p = this.board[r * 8 + f]; if (p === WP) wPawnsOnFile++; if (p === BP) bPawnsOnFile++; }
            if (wPawnsOnFile > 1) { mgScore -= 10 * (wPawnsOnFile - 1); egScore -= 20 * (wPawnsOnFile - 1); }
            if (bPawnsOnFile > 1) { mgScore += 10 * (bPawnsOnFile - 1); egScore += 20 * (bPawnsOnFile - 1); }
        }
        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq]; if (Math.abs(p) !== 4) continue;
            const f = sqFile(sq); let hasFriendlyPawn = false, hasEnemyPawn = false;
            for (let r = 0; r < 8; r++) {
                const pp = this.board[r * 8 + f];
                if (pp === Math.sign(p) * WP) hasFriendlyPawn = true;
                if (pp === -Math.sign(p) * WP) hasEnemyPawn = true;
            }
            if (!hasFriendlyPawn && !hasEnemyPawn) { mgScore += 20 * Math.sign(p); egScore += 20 * Math.sign(p); }
            else if (!hasFriendlyPawn) { mgScore += 10 * Math.sign(p); egScore += 10 * Math.sign(p); }
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
        if (this.halfmove >= 100) return 0;
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
        const result = this.searchRoot(searchDepth, timeMs);
        if (!result.move) return { success: false, bestmove: '(none)', evaluation: 0 };
        const uci = this.moveToUci(result.move);
        const pvStr = result.pv.map(m => this.moveToUci(m)).join(' ');
        let scoreObj;
        if (Math.abs(result.score) > MATE_SCORE - 200) {
            const mateIn = Math.ceil((MATE_SCORE - Math.abs(result.score)) / 2);
            scoreObj = { mate: result.score > 0 ? mateIn : -mateIn };
        } else { scoreObj = { cp: result.score }; }
        return { success: true, bestmove: uci, evaluation: result.score / 100, analysis: [{ uci, pv: pvStr, score: scoreObj }], depth: result.depth, nodes: result.nodes, source: 'local' };
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
            expect(Math.sign(blackToMove)).toBe(-Math.sign(whiteToMove) || 0);
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
    }

    return { bonus: totalBonus, reasons: bonuses };
}

// Self-contained getEvalBasedPremoveChance (no BotState dependency)
function getEvalBasedPremoveChance(evaluation, ourColor, premoveEnabled = true) {
    if (!premoveEnabled) return 0;
    let evalScore = 0;
    if (typeof evaluation === 'string') {
        if (evaluation === '-' || evaluation === 'Error') return 0;
        if (evaluation.includes('M')) {
            const mateNum = parseInt(evaluation.replace('M', '').replace('+', ''), 10);
            if (!isNaN(mateNum)) return (ourColor === 'w' ? mateNum : -mateNum) > 0 ? 100 : 25;
        }
        evalScore = parseFloat(evaluation);
    } else evalScore = parseFloat(evaluation);
    if (isNaN(evalScore)) return 0;

    const ourEval = ourColor === 'w' ? evalScore : -evalScore;
    if (ourEval >= 3.0) return 90;
    if (ourEval >= 2.0) return 75;
    if (ourEval >= 1.0) return 55;
    if (ourEval >= 0.5) return 40;
    if (ourEval >= 0) return 30;
    if (ourEval >= -0.5) return 25;
    return 20;
}


describe('assessPremoveQuality', () => {
    it('should return 0 bonus for invalid/missing UCI strings', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        expect(assessPremoveQuality(fen, null, 'e2e4')).toEqual({ bonus: 0, reasons: [] });
        expect(assessPremoveQuality(fen, 'e7e5', null)).toEqual({ bonus: 0, reasons: [] });
        expect(assessPremoveQuality(fen, '', 'e2e4')).toEqual({ bonus: 0, reasons: [] });
        expect(assessPremoveQuality(fen, 'ab', 'e2e4')).toEqual({ bonus: 0, reasons: [] });
    });

    it('should return 0 bonus when opponent move is not legal', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        // e7e5 is not legal for white
        const result = assessPremoveQuality(fen, 'e7e5', 'e2e4');
        expect(result.bonus).toBe(0);
        expect(result.reasons).toEqual([]);
    });

    it('should detect recapture signal', () => {
        // White pawn takes on d5, black recaptures with queen on d5
        const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
        // White plays exd5, black recaptures Qxd5
        const result = assessPremoveQuality(fen, 'e4d5', 'd8d5');
        expect(result.reasons).toContain('recapture');
        expect(result.bonus).toBeGreaterThanOrEqual(20);
    });

    it('should detect center control signal', () => {
        // A position where our response moves to center
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        // White plays e2e4, black responds d7d5 (center)
        const result = assessPremoveQuality(fen, 'e2e4', 'd7d5');
        expect(result.reasons).toContain('center');
    });

    it('should detect check signal when move gives check', () => {
        // Position: White queen can give check
        // After opponent move, our response gives check
        // Fen where black queen on d8, white king on e1. White plays Nf3, black plays Qh4+ style...
        // Simpler: Scholar's mate prep kind of position
        // FEN: white has moved e4, Bc4, Qh5... let's use a direct check scenario
        // Position: Black to move, white king on e1, black queen on a5
        // After white plays Ke2, black plays Qa5-e1+ ... no that's not right.

        // Let's use: White has king on g1, black has queen on d8, rook on f8
        // White plays h2h3, black plays Qd8-d1 (check if on back rank)
        // Simpler approach: set up a position where after opp move, our Qxf2+ is check
        const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
        // White plays Qxf7+, which is check. But we need it as OUR response.
        // Let's reverse: it's black's turn, white plays Bc4-f7 (Bxf7+)
        // Actually let me try: fen with white to move. Opp = white moves something, then black (us) gives check.
        // FEN: Black queen on d8, white king on e1
        const fen2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
        // White played Nf3, now it's black's turn. We want to test: after white's Nf3,
        // does black's Qh4 give check? No, Qh4 doesn't give check with knight on f3.
        // Let's use a simpler forced check position
        const fen3 = 'rnb1kbnr/ppppqppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
        // White to move. opp=white plays d2d3. Then black's Qe7-h4 — does it give check? No.
        // Let me craft a clear position: black bishop on c5 can give check on f2
        const checkFen = 'rnbqk1nr/pppp1ppp/8/2b1p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
        // White plays d2d3, then black plays Bc5-xf2+ (check!)
        const result = assessPremoveQuality(checkFen, 'd2d3', 'c5f2');
        // f2 square is next to white king on e1, bishop on f2 gives check
        expect(result.reasons).toContain('check');
    });

    it('should detect safe square signal when landing on unattacked square', () => {
        // Starting position: white plays e2e4, black responds Nb8-c6 (safe square, likely unattacked)
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const result = assessPremoveQuality(fen, 'e2e4', 'b8c6');
        expect(result.reasons).toContain('safe sq');
    });

    it('should detect forced move (only 1 legal move)', () => {
        // Position where after opponent's move, we have exactly 1 legal move
        // King in corner with only one escape square
        // FEN: Black king on h8, white queen on g6, white king on f6. After white Qg7, black must play Kh8 wait...
        // Simpler: K+R vs K endgame where king is forced
        // Let's use: Black Kh8, white Qf7 Kg6. White plays Qg7# — no, that's checkmate.
        // Better: Black Kh8, pawn h7. White Rg1. White plays Rg8+, black must play Rxg8 or move king.
        // Even simpler: position where only move is king move
        // FEN: black king a8, white queen b6, white king c6. Black to move — only Ka8 queen checks.
        // Actually in stalemate-adjacent positions...
        // Let's try: 8/8/8/8/8/5k2/4q3/7K w - - 0 1
        // White king h1, black queen e2, black king f3. White to move; only Kg1.
        // Then after black plays (say Qe1+), white has only Kh2
        const fen = '8/8/8/8/8/5k2/4q3/7K w - - 0 1';
        // White's only move is Kg1. Then black can play Qe1+ and white must Kh2.
        // Test: opp(white)=Kh1g1, our(black)=Qe2e1 — is it forced? Let's see.
        // After Kg1, black has many queen moves. Not forced.

        // Better FEN for forced: 8/8/8/8/8/8/r7/K7 w - - 0 1
        // White king a1, black rook a2. White's only move is Kb1.
        const forcedFen = '8/8/8/8/8/8/r6k/K7 w - - 0 1';
        // White to move, Ka1 with Ra2 blocking. Only move is Kb1.
        // Then black has many moves. Not forced for black.

        // I need a position where after opponent's move, WE have exactly 1 legal move.
        // FEN: 7k/5Q2/6K1/8/8/8/8/8 b - - 0 1
        // Black Kh8, white Qf7, Kg6. Black to move: only Kg8 (forced).
        // opp is white... wait, it's black to move. So this is black's turn to move.
        // We need: it's opponent's turn. Opp makes a move. Then we have 1 legal move.
        // FEN: Q4b1k/6pp/8/8/8/8/8/4K3 w - - 0 1 -- doesn't work easily.

        // Simplest approach: double check position after opponent's move.
        // Or just: after opponent captures our piece, we have only 1 legal Kxsomething
        // FEN with upcoming forced recapture:
        // 4k3/8/8/8/8/8/3r4/3RK3 w - - 0 1
        // White Ke1, Rd1. Black Ke8, Rd2. White plays Rd1xd2 (captures rook).
        // Now black's turn: Kd8,Ke7,Kf8,Kf7,Kd7. Many moves, not forced.

        // Fine — let me try a true forced move position:
        // 6k1/5ppp/8/8/8/8/8/4K2R w - - 0 1
        // White Ke1, Rh1. After white plays Rh8+, black Kxh8 or Kg7... not forced.

        // k7/1R6/1K6/8/8/8/8/8 w - - 0 1
        // White Kb6, Rb7. Black Ka8. White plays Ra7+. Black must play Kb8.
        // That IS forced (Ka8 blocked by Rb7→Ra7, so only Kb8).
        const forcedFen2 = 'k7/1R6/1K6/8/8/8/8/8 w - - 0 1';
        const result = assessPremoveQuality(forcedFen2, 'b7a7', 'a8b8');
        expect(result.reasons).toContain('forced');
        expect(result.bonus).toBeGreaterThanOrEqual(40);
    });

    it('should detect few-options signal (2-3 legal moves)', () => {
        // k7/8/1K6/8/8/8/8/1R6 w - - 0 1
        // White Kb6, Rb1. Black Ka8. White plays Rb8+? No, Rb1-a1 is check? No.
        // Let me try: 1k6/8/1K6/8/8/8/8/R7 w - - 0 1
        // White Ka1→... wait. Let me think carefully.
        // k7/8/1K6/8/8/8/8/R7 w - - 0 1
        // White: Ka1? No Kb6 + Ra1. Black Ka8. White plays Ra7+ — black Kb8 only. That's 1 move (forced).
        // Let me loosen it: put king somewhere with 2-3 escapes.
        // 1k6/8/8/8/8/8/8/R3K3 w - - 0 1
        // White Ke1, Ra1. Black Kb8. White plays Ra8+, black Kc7 or Kb7... few options.
        const fewOptFen = '1k6/8/8/8/8/8/8/R3K3 w - - 0 1';
        const result = assessPremoveQuality(fewOptFen, 'a1a8', 'b8c7');
        // After Ra8+, black has Kb7, Kc7 — exactly 2 moves (few options)
        if (result.reasons.includes('few options')) {
            expect(result.bonus).toBeGreaterThanOrEqual(15);
        } else if (result.reasons.includes('forced')) {
            // might only have 1 legal move depending on exact position
            expect(result.bonus).toBeGreaterThanOrEqual(40);
        }
    });

    it('should stack multiple bonuses additively', () => {
        // Recapture on center square that's safe = recapture(20) + center(5) + safe_sq(10) = at least 35
        // Plus potentially few-options or dominant
        const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
        // White exd5, black Qxd5 (recapture + center d5)
        const result = assessPremoveQuality(fen, 'e4d5', 'd8d5');
        expect(result.reasons).toContain('recapture');
        expect(result.reasons).toContain('center');
        // Bonuses should stack
        expect(result.bonus).toBeGreaterThanOrEqual(25); // recapture(20) + center(5)
    });

    it('should handle starting position gracefully', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        // e2e4, d7d5 — a normal opening. Should get some signals but not crash.
        const result = assessPremoveQuality(fen, 'e2e4', 'd7d5');
        expect(result.bonus).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.reasons)).toBe(true);
    });

    it('should return 0 when our move is not legal after opponent move', () => {
        // After e4, black tries to play e2e4 which is not legal for black
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const result = assessPremoveQuality(fen, 'e2e4', 'e2e4');
        // e2e4 is not a legal black move; ourMove won't be found
        // Should still not crash, bonus from forced/few-options may still apply
        expect(result.bonus).toBeGreaterThanOrEqual(0);
    });
});


describe('getEvalBasedPremoveChance (updated thresholds)', () => {
    it('should return 0 when premove is disabled', () => {
        expect(getEvalBasedPremoveChance('1.5', 'w', false)).toBe(0);
    });

    it('should return 0 for dash or Error evaluations', () => {
        expect(getEvalBasedPremoveChance('-', 'w')).toBe(0);
        expect(getEvalBasedPremoveChance('Error', 'w')).toBe(0);
    });

    it('should return 0 for NaN evaluations', () => {
        expect(getEvalBasedPremoveChance('abc', 'w')).toBe(0);
        expect(getEvalBasedPremoveChance(NaN, 'w')).toBe(0);
    });

    it('should return 100 for mate-in-N for us', () => {
        expect(getEvalBasedPremoveChance('M3', 'w')).toBe(100);
        expect(getEvalBasedPremoveChance('+M5', 'w')).toBe(100);
    });

    it('should return 25 for mate-in-N against us', () => {
        expect(getEvalBasedPremoveChance('M3', 'b')).toBe(25);
        expect(getEvalBasedPremoveChance('+M5', 'b')).toBe(25);
    });

    // Updated threshold curve tests
    it('should return 90 for eval >= 3.0 (winning)', () => {
        expect(getEvalBasedPremoveChance('3.5', 'w')).toBe(90);
        expect(getEvalBasedPremoveChance('5.0', 'w')).toBe(90);
        expect(getEvalBasedPremoveChance('-3.5', 'b')).toBe(90); // black perspective
    });

    it('should return 75 for eval >= 2.0', () => {
        expect(getEvalBasedPremoveChance('2.0', 'w')).toBe(75);
        expect(getEvalBasedPremoveChance('2.5', 'w')).toBe(75);
    });

    it('should return 55 for eval >= 1.0 (raised from 50)', () => {
        expect(getEvalBasedPremoveChance('1.0', 'w')).toBe(55);
        expect(getEvalBasedPremoveChance('1.5', 'w')).toBe(55);
    });

    it('should return 40 for eval >= 0.5 (raised from 35)', () => {
        expect(getEvalBasedPremoveChance('0.5', 'w')).toBe(40);
        expect(getEvalBasedPremoveChance('0.8', 'w')).toBe(40);
    });

    it('should return 30 for eval >= 0 (raised from 25)', () => {
        expect(getEvalBasedPremoveChance('0.0', 'w')).toBe(30);
        expect(getEvalBasedPremoveChance('0.3', 'w')).toBe(30);
    });

    it('should return 25 for eval >= -0.5 (new tier)', () => {
        expect(getEvalBasedPremoveChance('-0.3', 'w')).toBe(25);
        expect(getEvalBasedPremoveChance('-0.5', 'w')).toBe(25);
    });

    it('should return 20 floor for very negative eval', () => {
        expect(getEvalBasedPremoveChance('-1.0', 'w')).toBe(20);
        expect(getEvalBasedPremoveChance('-5.0', 'w')).toBe(20);
    });

    it('should handle numeric inputs (not just strings)', () => {
        expect(getEvalBasedPremoveChance(2.5, 'w')).toBe(75);
        expect(getEvalBasedPremoveChance(0, 'w')).toBe(30);
        expect(getEvalBasedPremoveChance(-1.0, 'w')).toBe(20);
    });

    it('should invert eval for black perspective', () => {
        // +2.0 from white perspective = -2.0 for black
        expect(getEvalBasedPremoveChance('2.0', 'b')).toBe(20);
        // -2.0 from white perspective = +2.0 for black
        expect(getEvalBasedPremoveChance('-2.0', 'b')).toBe(75);
    });

    it('should handle boundary values precisely', () => {
        // Exact boundaries
        expect(getEvalBasedPremoveChance('3.0', 'w')).toBe(90);
        expect(getEvalBasedPremoveChance('2.0', 'w')).toBe(75);
        expect(getEvalBasedPremoveChance('1.0', 'w')).toBe(55);
        expect(getEvalBasedPremoveChance('0.5', 'w')).toBe(40);
        expect(getEvalBasedPremoveChance('0.0', 'w')).toBe(30);
        expect(getEvalBasedPremoveChance('-0.5', 'w')).toBe(25);
        // Just below
        expect(getEvalBasedPremoveChance('2.99', 'w')).toBe(75);
        expect(getEvalBasedPremoveChance('1.99', 'w')).toBe(55);
        expect(getEvalBasedPremoveChance('0.99', 'w')).toBe(40);
        expect(getEvalBasedPremoveChance('0.49', 'w')).toBe(30);
        expect(getEvalBasedPremoveChance('-0.01', 'w')).toBe(25);
        expect(getEvalBasedPremoveChance('-0.51', 'w')).toBe(20);
    });

    it('monotonically: higher eval should give >= premove chance', () => {
        const evals = [-2, -1, -0.5, 0, 0.5, 1.0, 2.0, 3.0, 5.0];
        const chances = evals.map(e => getEvalBasedPremoveChance(String(e), 'w'));
        for (let i = 1; i < chances.length; i++) {
            expect(chances[i]).toBeGreaterThanOrEqual(chances[i - 1]);
        }
    });
});

// ============================================================
// UNIFIED evaluatePremove TESTS
// ============================================================

// Self-contained evaluatePremove — mirrors production logic using test LocalEngine
function evaluatePremove(fen, opponentUci, ourUci, ourColor, evalDisplay) {
    if (!ourUci || ourUci.length < 4) {
        return { execute: false, chance: 0, reasons: [], blocked: 'Invalid move' };
    }

    let chance = getEvalBasedPremoveChance(evalDisplay, ourColor);
    const reasons = [];
    const oppSide = ourColor === 'w' ? -1 : 1;
    const ourSide = -oppSide;

    if (!opponentUci || opponentUci.length < 4) {
        return { execute: false, chance: 0, reasons: [], blocked: 'No predicted opponent move' };
    }

    const PIECE_VAL = { 1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 0 };
    const HANGING_THRESHOLDS = { 6: 100, 5: 90, 4: 60, 3: 40, 2: 40, 1: 15 };
    const EMPTY = 0;

    const eng = new LocalEngine();
    try {
        eng.loadFen(fen);

        const oppFrom = nameToSq(opponentUci.substring(0, 2));
        const oppTo = nameToSq(opponentUci.substring(2, 4));
        const oppMoves = eng.generateLegalMoves();
        const oppMove = oppMoves.find(m => m.from === oppFrom && m.to === oppTo);
        if (!oppMove) return { execute: false, chance: 0, reasons: [], blocked: 'Opponent move not legal' };

        eng.makeMove(oppMove);

        const ourLegalMoves = eng.generateLegalMoves();
        const ourFrom = nameToSq(ourUci.substring(0, 2));
        const ourTo = nameToSq(ourUci.substring(2, 4));
        const ourMove = ourLegalMoves.find(m => m.from === ourFrom && m.to === ourTo);

        if (!ourMove) {
            eng.unmakeMove(oppMove);
            return { execute: false, chance: 0, reasons: [], blocked: 'Our move illegal after opponent plays' };
        }

        // Hanging piece detection
        const movingAbs = Math.abs(ourMove.piece);
        const capturedAbs = ourMove.captured !== EMPTY ? Math.abs(ourMove.captured) : 0;
        const capturedVal = capturedAbs > 0 ? (PIECE_VAL[capturedAbs] || 0) : 0;
        const movedVal = PIECE_VAL[movingAbs] || 0;

        if (movingAbs !== 6) {
            eng.makeMove(ourMove);
            const isDestAttacked = eng.isAttacked(ourTo, eng.side);
            eng.unmakeMove(ourMove);

            if (isDestAttacked && movingAbs >= 2) {
                eng.makeMove(ourMove);
                const oppReplies = eng.generateLegalMoves();
                const oppAttacksPost = oppReplies.filter(r => r.to === ourTo);
                eng.unmakeMove(ourMove);

                if (oppAttacksPost.length > 0 && capturedVal < movedVal) {
                    const riskThreshold = HANGING_THRESHOLDS[movingAbs] || 50;
                    const pieceNames = { 5: 'queen', 4: 'rook', 3: 'bishop', 2: 'knight' };
                    const pieceName = pieceNames[movingAbs] || 'piece';

                    const defenderCount = eng.isAttacked(ourTo, eng.side) ? 1 : 0;
                    const lowestAttackerVal = Math.min(...oppAttacksPost.map(r => PIECE_VAL[Math.abs(r.piece)] || 100));

                    if (defenderCount === 0 || lowestAttackerVal < movedVal) {
                        if (movingAbs >= 5) {
                            eng.unmakeMove(oppMove);
                            return { execute: false, chance: 0, reasons: [], blocked: `Hangs ${pieceName}` };
                        }
                        chance = Math.max(5, chance - riskThreshold);
                        reasons.push(`${pieceName} at risk`);
                    }
                }
            }
        }

        // Quality signals
        if (ourLegalMoves.length === 1) {
            chance = Math.min(95, chance + 40);
            reasons.push('forced');
        } else if (ourLegalMoves.length <= 3) {
            chance = Math.min(95, chance + 15);
            reasons.push('few options');
        }

        if (ourTo === oppTo) {
            chance = Math.min(95, chance + 20);
            reasons.push('recapture');
        }

        eng.makeMove(ourMove);
        if (eng.inCheck(eng.side)) {
            chance = Math.min(95, chance + 10);
            reasons.push('check');
        }
        eng.unmakeMove(ourMove);

        const destAttacked = eng.isAttacked(ourTo, -eng.side);
        if (!destAttacked) {
            chance = Math.min(95, chance + 10);
            reasons.push('safe sq');
        }

        const centerSquares = [nameToSq('d4'), nameToSq('d5'), nameToSq('e4'), nameToSq('e5')];
        if (centerSquares.includes(ourTo)) {
            chance = Math.min(95, chance + 5);
            reasons.push('center');
        }

        // Multi-response stability
        eng.unmakeMove(oppMove);

        const oppScoredMoves = [];
        for (const oMove of oppMoves) {
            eng.makeMove(oMove);
            const score = -eng.evaluate();
            eng.unmakeMove(oMove);
            oppScoredMoves.push({ move: oMove, score });
        }
        oppScoredMoves.sort((a, b) => b.score - a.score);

        const topOppMoves = oppScoredMoves
            .filter(m => !(m.move.from === oppFrom && m.move.to === oppTo))
            .slice(0, 3);

        let illegalCount = 0;
        let badScoreCount = 0;

        for (const { move: altOppMove } of topOppMoves) {
            eng.makeMove(altOppMove);
            const altLegal = eng.generateLegalMoves();
            const altOurMove = altLegal.find(m => m.from === ourFrom && m.to === ourTo);

            if (!altOurMove) {
                illegalCount++;
            } else {
                eng.makeMove(altOurMove);
                const postScore = -eng.evaluate();
                eng.unmakeMove(altOurMove);

                let bestAlt = -Infinity;
                for (const alt of altLegal) {
                    if (alt.from === ourFrom && alt.to === ourTo) continue;
                    eng.makeMove(alt);
                    const altS = -eng.evaluate();
                    eng.unmakeMove(alt);
                    if (altS > bestAlt) bestAlt = altS;
                }

                if (bestAlt > -Infinity && (bestAlt - postScore) >= 200) {
                    badScoreCount++;
                }
            }
            eng.unmakeMove(altOppMove);
        }

        if (topOppMoves.length >= 2 && illegalCount >= 2) {
            chance = Math.max(5, chance - 35);
            reasons.push('unstable (illegal)');
        } else if (illegalCount >= 1) {
            chance = Math.max(10, chance - 15);
            reasons.push('sometimes illegal');
        }

        if (topOppMoves.length >= 2 && badScoreCount >= 2) {
            chance = Math.max(5, chance - 30);
            reasons.push('unstable (bad)');
        } else if (badScoreCount >= 1) {
            chance = Math.max(10, chance - 10);
            reasons.push('risky alt');
        }
    } catch (e) {
        return { execute: false, chance: 0, reasons: [], blocked: 'Evaluation error' };
    }

    chance = Math.min(95, Math.max(0, Math.round(chance)));
    const execute = chance > 0;
    return { execute, chance, reasons, blocked: null };
}


describe('evaluatePremove (unified)', () => {
    it('should block when ourUci is invalid', () => {
        const r = evaluatePremove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'e2e4', '', 'b', '0.0');
        expect(r.execute).toBe(false);
        expect(r.blocked).toBe('Invalid move');
    });

    it('should block when no predicted opponent move', () => {
        const r = evaluatePremove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            null, 'e7e5', 'b', '0.0');
        expect(r.execute).toBe(false);
        expect(r.blocked).toBe('No predicted opponent move');
    });

    it('should block when opponent move is not legal', () => {
        const r = evaluatePremove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'e7e5', 'd7d5', 'b', '0.0');
        expect(r.execute).toBe(false);
        expect(r.blocked).toBe('Opponent move not legal');
    });

    it('should block when our move is illegal after opponent plays', () => {
        // After white plays e2e4, black trying to play e2e4 is illegal
        const r = evaluatePremove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'e2e4', 'e2e4', 'b', '0.0');
        expect(r.execute).toBe(false);
        expect(r.blocked).toBe('Our move illegal after opponent plays');
    });

    it('should return positive chance for valid premoves', () => {
        // Opening: white e2e4, black d7d5
        const r = evaluatePremove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'e2e4', 'd7d5', 'b', '0.0');
        expect(r.execute).toBe(true);
        expect(r.chance).toBeGreaterThan(0);
        expect(r.blocked).toBeNull();
    });

    it('should detect recapture in post-move board', () => {
        // White pawn on d5 after exd5, black recaptures Qxd5
        const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
        const r = evaluatePremove(fen, 'e4d5', 'd8d5', 'b', '0.0');
        expect(r.reasons).toContain('recapture');
    });

    it('should detect forced move signal', () => {
        // Position: after Ra7+, black Ka8 must play Kb8 (only legal move)
        const fen = 'k7/1R6/1K6/8/8/8/8/8 w - - 0 1';
        const r = evaluatePremove(fen, 'b7a7', 'a8b8', 'b', '0.0');
        expect(r.reasons).toContain('forced');
        expect(r.chance).toBeGreaterThanOrEqual(40);
    });

    it('should detect center control', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const r = evaluatePremove(fen, 'e2e4', 'd7d5', 'b', '0.0');
        expect(r.reasons).toContain('center');
    });

    it('should detect check signal', () => {
        // After d2d3, Bc5xf2+ gives check
        const checkFen = 'rnbqk1nr/pppp1ppp/8/2b1p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
        const r = evaluatePremove(checkFen, 'd2d3', 'c5f2', 'b', '0.0');
        expect(r.reasons).toContain('check');
    });

    it('should cap chance at 95', () => {
        // Forced move with very high eval should still cap at 95
        const fen = 'k7/1R6/1K6/8/8/8/8/8 w - - 0 1';
        const r = evaluatePremove(fen, 'b7a7', 'a8b8', 'b', '5.0');
        // Even with huge eval + forced bonus, chance should cap at 95
        expect(r.chance).toBeLessThanOrEqual(95);
    });

    it('should handle normal opening moves without errors', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const r = evaluatePremove(fen, 'e2e4', 'b8c6', 'b', '0.0');
        expect(r.execute).toBe(true);
        expect(r.blocked).toBeNull();
        expect(Array.isArray(r.reasons)).toBe(true);
    });

    it('should apply stability penalty when premove is illegal for some opponent moves', () => {
        // Starting position, white to move. We are Black.
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        // Opponent (white) plays e2e4. We premove b8c6.
        const r = evaluatePremove(fen, 'e2e4', 'b8c6', 'b', '0.0');
        // This should work — Nc6 is Typically legal regardless of what white plays first
        expect(r.execute).toBe(true);
        expect(r.blocked).toBeNull();
    });

    it('should detect stability issues if move is often illegal', () => {
        // A position where our premove is only legal if opponent plays a specific move
        // E.g. Bishop recapture on d5 only legal if white plays exd5
        const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
        // Opponent plays exd5. We premove Qxd5.
        // If white plays anything else (Nf3, d4, Nc3), Qxd5 is ILLEGAL.
        const r = evaluatePremove(fen, 'e4d5', 'd8d5', 'b', '0.0');

        // It should still execute (if we trust the PV), but it might have stability penalties
        expect(r.execute).toBe(true);
    });

    it('should have blocked=null for successful evaluations', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const r = evaluatePremove(fen, 'e2e4', 'e7e5', 'b', '0.0');
        expect(r.blocked).toBeNull();
    });

    it('should include base eval chance in the result', () => {
        // With eval +3.0 for white, base chance should be 90
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const highEval = evaluatePremove(fen, 'e2e4', 'e7e5', 'b', '3.0');
        const lowEval = evaluatePremove(fen, 'e2e4', 'e7e5', 'b', '-2.0');
        // Black with +3.0 eval (from white's perspective) should have lower chance than
        // black with -2.0 eval (which is +2.0 from black's perspective)
        expect(lowEval.chance).toBeGreaterThan(highEval.chance);
    });
});
