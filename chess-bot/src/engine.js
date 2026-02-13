import { API_URL, MULTIPV, ANALYZE_TIMEOUT_MS, PIECE_VALUES } from './config.js';
import { BotState, PositionCache, getGame, getPlayerColor, getSideToMove, pa } from './state.js';
import { scoreFrom, scoreToDisplay, scoreNumeric, getRandomDepth, sleep, fenCharAtSquare, pieceFromFenChar, getAttackersOfSquare, isSquareAttackedBy, findKing, makeSimpleMove } from './utils.js';
import { drawArrow, clearArrows, executeMove, simulateClickMove } from './board.js';

let analysisQueue = Promise.resolve();
let currentAnalysisId = 0;

let lastFenProcessedMain = '';
let lastFenProcessedPremove = '';
let lastPremoveFen = '';
let lastPremoveUci = '';

export function getLastFenProcessedMain() { return lastFenProcessedMain; }
export function setLastFenProcessedMain(fen) { lastFenProcessedMain = fen; }
export function getLastFenProcessedPremove() { return lastFenProcessedPremove; }
export function setLastFenProcessedPremove(fen) { lastFenProcessedPremove = fen; }
export function getLastPremoveFen() { return lastPremoveFen; }
export function setLastPremoveFen(fen) { lastPremoveFen = fen; }
export function getLastPremoveUci() { return lastPremoveUci; }
export function setLastPremoveUci(uci) { lastPremoveUci = uci; }

// ============================================================
// LOCAL CHESS ENGINE
// ============================================================
// Pieces: P=1,N=2,B=3,R=4,Q=5,K=6. White positive, black negative.
// Board: 64-element array, index = rank*8+file, a1=0, h8=63

const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;
const EMPTY = 0;
const FLAG_NONE = 0, FLAG_EP = 1, FLAG_CASTLE = 2, FLAG_PROMO = 4;
const MATE_SCORE = 30000;

// Piece-square tables (from white's perspective, a1=index 0)
// Indexed [rank][file] visually but stored flat as [sq] where sq = rank*8+file
// So index 0 = a1, index 7 = h1, index 56 = a8, index 63 = h8

const PST_PAWN = [
    0, 0, 0, 0, 0, 0, 0, 0,   // rank 1
    5, 10, 10, -20, -20, 10, 10, 5,   // rank 2
    5, -5, -10, 0, 0, -10, -5, 5,   // rank 3
    0, 0, 0, 20, 20, 0, 0, 0,   // rank 4
    5, 5, 10, 25, 25, 10, 5, 5,   // rank 5
    10, 10, 20, 30, 30, 20, 10, 10,   // rank 6
    50, 50, 50, 50, 50, 50, 50, 50,   // rank 7
    0, 0, 0, 0, 0, 0, 0, 0    // rank 8 (never has pawns)
];

const PST_KNIGHT = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
];

const PST_BISHOP = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
];

const PST_ROOK = [
    0, 0, 0, 5, 5, 0, 0, 0,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    5, 10, 10, 10, 10, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
];

const PST_QUEEN = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -10, 5, 5, 5, 5, 5, 0, -10,
    0, 0, 5, 5, 5, 5, 0, -5,
    -5, 0, 5, 5, 5, 5, 0, -5,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
];

const PST_KING_MG = [
    20, 30, 10, 0, 0, 10, 30, 20,
    20, 20, 0, 0, 0, 0, 20, 20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30
];

const PST_KING_EG = [
    -50, -30, -30, -30, -30, -30, -30, -50,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -50, -40, -30, -20, -20, -30, -40, -50
];

const PST = {
    [WP]: PST_PAWN, [WN]: PST_KNIGHT, [WB]: PST_BISHOP,
    [WR]: PST_ROOK, [WQ]: PST_QUEEN
};

const PIECE_VAL = { 1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 0 };

function mirrorSq(sq) { return (7 - (sq >> 3)) * 8 + (sq & 7); }
function sqFile(sq) { return sq & 7; }
function sqRank(sq) { return sq >> 3; }
function sqName(sq) { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
function nameToSq(s) { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8; }

class LocalEngine {
    constructor() {
        this.board = new Array(64).fill(EMPTY);
        this.side = 1;     // 1=white, -1=black
        this.castling = 0; // bits: 1=wK, 2=wQ, 4=bK, 8=bQ
        this.epSquare = -1;
        this.halfmove = 0;
        this.fullmove = 1;
        this.stateStack = [];
        this.nodes = 0;
        this.timeLimit = 0;
        this.startTime = 0;
        this.stopped = false;
        this.pvTable = [];
        this.killers = [];
        this.history = new Int32Array(64 * 64);
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
        let c = '';
        if (this.castling & 1) c += 'K';
        if (this.castling & 2) c += 'Q';
        if (this.castling & 4) c += 'k';
        if (this.castling & 8) c += 'q';
        if (!c) c = '-';
        const ep = this.epSquare >= 0 ? sqName(this.epSquare) : '-';
        return `${fen} ${this.side === 1 ? 'w' : 'b'} ${c} ${ep} ${this.halfmove} ${this.fullmove}`;
    }

    createMove(from, to, flags = FLAG_NONE, promo = EMPTY) {
        return {
            from, to, flags,
            piece: this.board[from],
            captured: (flags & FLAG_EP) ? (-this.side) : this.board[to],
            promo
        };
    }

    makeMove(mv) {
        this.stateStack.push({
            castling: this.castling, epSquare: this.epSquare,
            halfmove: this.halfmove, fullmove: this.fullmove
        });

        const { from, to, flags, piece, promo } = mv;
        const abs = Math.abs(piece);

        this.board[from] = EMPTY;
        this.board[to] = (flags & FLAG_PROMO) ? promo : piece;

        // En passant capture
        if (flags & FLAG_EP) {
            this.board[to - this.side * 8] = EMPTY;
        }

        // Castling rook movement
        if (flags & FLAG_CASTLE) {
            if (to > from) { // Kingside
                this.board[from + 3] = EMPTY;
                this.board[from + 1] = this.side * WR;
            } else { // Queenside
                this.board[from - 4] = EMPTY;
                this.board[from - 1] = this.side * WR;
            }
        }

        // Update en passant square
        if (abs === 1 && Math.abs(to - from) === 16) {
            this.epSquare = (from + to) >> 1;
        } else {
            this.epSquare = -1;
        }

        // Update castling rights
        if (abs === 6) {
            if (this.side === 1) this.castling &= ~3;
            else this.castling &= ~12;
        }
        // Rook moved or captured
        if (from === 0 || to === 0) this.castling &= ~2;
        if (from === 7 || to === 7) this.castling &= ~1;
        if (from === 56 || to === 56) this.castling &= ~8;
        if (from === 63 || to === 63) this.castling &= ~4;

        // Halfmove clock
        this.halfmove = (abs === 1 || mv.captured !== EMPTY) ? 0 : this.halfmove + 1;

        if (this.side === -1) this.fullmove++;
        this.side = -this.side;
    }

    unmakeMove(mv) {
        this.side = -this.side;
        const st = this.stateStack.pop();
        this.castling = st.castling;
        this.epSquare = st.epSquare;
        this.halfmove = st.halfmove;
        this.fullmove = st.fullmove;

        const { from, to, flags, piece, captured, promo } = mv;

        this.board[from] = piece;
        this.board[to] = (flags & FLAG_EP) ? EMPTY : captured;

        if (flags & FLAG_EP) {
            this.board[to - this.side * 8] = -this.side; // restore captured pawn
        }

        if (flags & FLAG_CASTLE) {
            if (to > from) { // Kingside
                this.board[from + 1] = EMPTY;
                this.board[from + 3] = this.side * WR;
            } else { // Queenside
                this.board[from - 1] = EMPTY;
                this.board[from - 4] = this.side * WR;
            }
        }
    }

    findKingSq(side) {
        const k = side * WK;
        for (let i = 0; i < 64; i++) if (this.board[i] === k) return i;
        return -1;
    }

    isAttacked(sq, bySide) {
        // Pawn attacks
        const pawnDir = bySide === 1 ? 1 : -1;
        const pawnRank = sqRank(sq) - pawnDir;
        if (pawnRank >= 0 && pawnRank <= 7) {
            const pf = sqFile(sq);
            if (pf > 0 && this.board[pawnRank * 8 + pf - 1] === bySide * WP) return true;
            if (pf < 7 && this.board[pawnRank * 8 + pf + 1] === bySide * WP) return true;
        }

        // Knight attacks
        const kn = bySide * WN;
        const knightOffsets = [-17, -15, -10, -6, 6, 10, 15, 17];
        for (const off of knightOffsets) {
            const t = sq + off;
            if (t < 0 || t > 63) continue;
            if (Math.abs(sqFile(t) - sqFile(sq)) > 2) continue;
            if (this.board[t] === kn) return true;
        }

        // King attacks
        const kg = bySide * WK;
        for (let dr = -1; dr <= 1; dr++) {
            for (let df = -1; df <= 1; df++) {
                if (!dr && !df) continue;
                const t = sq + dr * 8 + df;
                if (t < 0 || t > 63 || Math.abs(sqFile(t) - sqFile(sq)) > 1) continue;
                if (this.board[t] === kg) return true;
            }
        }

        // Sliding: rook/queen on ranks and files
        const rq = [bySide * WR, bySide * WQ];
        const bq = [bySide * WB, bySide * WQ];
        const straightDirs = [8, -8, 1, -1];
        const diagDirs = [9, 7, -9, -7];

        for (const dir of straightDirs) {
            let t = sq + dir;
            while (t >= 0 && t <= 63) {
                if (dir === 1 || dir === -1) {
                    if (sqRank(t) !== sqRank(t - dir)) break;
                }
                const p = this.board[t];
                if (p !== EMPTY) {
                    if (rq.includes(p)) return true;
                    break;
                }
                t += dir;
            }
        }

        for (const dir of diagDirs) {
            let t = sq + dir;
            while (t >= 0 && t <= 63) {
                if (Math.abs(sqFile(t) - sqFile(t - dir)) !== 1) break;
                const p = this.board[t];
                if (p !== EMPTY) {
                    if (bq.includes(p)) return true;
                    break;
                }
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
        const moves = [];
        const s = this.side;
        const opp = -s;

        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (p === EMPTY || Math.sign(p) !== s) continue;
            const abs = Math.abs(p);
            const file = sqFile(sq);
            const rank = sqRank(sq);

            if (abs === 1) { // Pawn
                const dir = s; // +1 for white, -1 for black
                const promoRank = s === 1 ? 7 : 0;
                const startRank = s === 1 ? 1 : 6;
                const fwd = sq + dir * 8;

                // Forward moves
                if (fwd >= 0 && fwd <= 63 && this.board[fwd] === EMPTY) {
                    if (sqRank(fwd) === promoRank) {
                        for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, fwd, FLAG_PROMO, s * pr));
                    } else if (!capturesOnly) {
                        moves.push(this.createMove(sq, fwd));
                        const fwd2 = fwd + dir * 8;
                        if (rank === startRank && fwd2 >= 0 && fwd2 <= 63 && this.board[fwd2] === EMPTY) {
                            moves.push(this.createMove(sq, fwd2));
                        }
                    }
                }

                // Captures
                for (const df of [-1, 1]) {
                    const cf = file + df;
                    if (cf < 0 || cf > 7) continue;
                    const csq = fwd + df;
                    if (csq < 0 || csq > 63) continue;

                    if (this.board[csq] !== EMPTY && Math.sign(this.board[csq]) === opp) {
                        if (sqRank(csq) === promoRank) {
                            for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, csq, FLAG_PROMO, s * pr));
                        } else {
                            moves.push(this.createMove(sq, csq));
                        }
                    } else if (csq === this.epSquare) {
                        moves.push(this.createMove(sq, csq, FLAG_EP));
                    }
                }
            } else if (abs === 2) { // Knight
                for (const off of [-17, -15, -10, -6, 6, 10, 15, 17]) {
                    const t = sq + off;
                    if (t < 0 || t > 63 || Math.abs(sqFile(t) - file) > 2) continue;
                    const tp = this.board[t];
                    if (tp !== EMPTY && Math.sign(tp) === s) continue;
                    if (capturesOnly && tp === EMPTY) continue;
                    moves.push(this.createMove(sq, t));
                }
            } else if (abs === 6) { // King
                for (let dr = -1; dr <= 1; dr++) {
                    for (let df = -1; df <= 1; df++) {
                        if (!dr && !df) continue;
                        const t = sq + dr * 8 + df;
                        if (t < 0 || t > 63 || Math.abs(sqFile(t) - file) > 1) continue;
                        const tp = this.board[t];
                        if (tp !== EMPTY && Math.sign(tp) === s) continue;
                        if (capturesOnly && tp === EMPTY) continue;
                        moves.push(this.createMove(sq, t));
                    }
                }
                // Castling
                if (!capturesOnly && !this.inCheck(s)) {
                    if (s === 1) {
                        if ((this.castling & 1) && sq === 4 && this.board[5] === EMPTY && this.board[6] === EMPTY
                            && !this.isAttacked(5, -1) && !this.isAttacked(6, -1)) {
                            moves.push(this.createMove(4, 6, FLAG_CASTLE));
                        }
                        if ((this.castling & 2) && sq === 4 && this.board[3] === EMPTY && this.board[2] === EMPTY && this.board[1] === EMPTY
                            && !this.isAttacked(3, -1) && !this.isAttacked(2, -1)) {
                            moves.push(this.createMove(4, 2, FLAG_CASTLE));
                        }
                    } else {
                        if ((this.castling & 4) && sq === 60 && this.board[61] === EMPTY && this.board[62] === EMPTY
                            && !this.isAttacked(61, 1) && !this.isAttacked(62, 1)) {
                            moves.push(this.createMove(60, 62, FLAG_CASTLE));
                        }
                        if ((this.castling & 8) && sq === 60 && this.board[59] === EMPTY && this.board[58] === EMPTY && this.board[57] === EMPTY
                            && !this.isAttacked(59, 1) && !this.isAttacked(58, 1)) {
                            moves.push(this.createMove(60, 58, FLAG_CASTLE));
                        }
                    }
                }
            } else {
                // Sliding pieces: B=3, R=4, Q=5
                const dirs = abs === 3 ? [9, 7, -9, -7] : abs === 4 ? [8, -8, 1, -1] : [9, 7, -9, -7, 8, -8, 1, -1];
                for (const dir of dirs) {
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        const fdiff = Math.abs(sqFile(t) - sqFile(t - dir));
                        if ((dir === 1 || dir === -1) && fdiff !== 1) break;
                        if ((Math.abs(dir) === 7 || Math.abs(dir) === 9) && fdiff !== 1) break;
                        const tp = this.board[t];
                        if (tp !== EMPTY && Math.sign(tp) === s) break;
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
        if (mv.flags & FLAG_PROMO) {
            s += 'nbrq'[Math.abs(mv.promo) - 2];
        }
        return s;
    }

    // ---- Evaluation ----
    evaluate() {
        let mgScore = 0, egScore = 0, phase = 0;
        let wBishops = 0, bBishops = 0;
        const phaseVal = { 2: 1, 3: 1, 4: 2, 5: 4 };

        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (p === EMPTY) continue;
            const abs = Math.abs(p);
            const side = Math.sign(p);
            const val = PIECE_VAL[abs];
            const pstSq = side === 1 ? sq : mirrorSq(sq);

            let pstVal = 0;
            if (abs <= 5 && PST[abs]) pstVal = PST[abs][pstSq];

            let mgKing = 0, egKing = 0;
            if (abs === 6) {
                mgKing = PST_KING_MG[pstSq];
                egKing = PST_KING_EG[pstSq];
            }

            if (abs === 3) { if (side === 1) wBishops++; else bBishops++; }
            if (abs >= 2 && abs <= 5) phase += phaseVal[abs] || 0;

            const material = val * side;
            mgScore += material + (abs === 6 ? mgKing * side : pstVal * side);
            egScore += material + (abs === 6 ? egKing * side : pstVal * side);
        }

        // Bishop pair bonus
        if (wBishops >= 2) { mgScore += 30; egScore += 50; }
        if (bBishops >= 2) { mgScore -= 30; egScore -= 50; }

        // Pawn structure bonuses
        for (let f = 0; f < 8; f++) {
            let wPawnsOnFile = 0, bPawnsOnFile = 0;
            for (let r = 0; r < 8; r++) {
                const p = this.board[r * 8 + f];
                if (p === WP) wPawnsOnFile++;
                if (p === BP) bPawnsOnFile++;
            }
            // Doubled pawns penalty
            if (wPawnsOnFile > 1) { mgScore -= 10 * (wPawnsOnFile - 1); egScore -= 20 * (wPawnsOnFile - 1); }
            if (bPawnsOnFile > 1) { mgScore += 10 * (bPawnsOnFile - 1); egScore += 20 * (bPawnsOnFile - 1); }
        }

        // Rook on open/semi-open file
        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (Math.abs(p) !== 4) continue;
            const f = sqFile(sq);
            let hasFriendlyPawn = false, hasEnemyPawn = false;
            for (let r = 0; r < 8; r++) {
                const pp = this.board[r * 8 + f];
                if (pp === Math.sign(p) * WP) hasFriendlyPawn = true;
                if (pp === -Math.sign(p) * WP) hasEnemyPawn = true;
            }
            if (!hasFriendlyPawn && !hasEnemyPawn) {
                mgScore += 20 * Math.sign(p); egScore += 20 * Math.sign(p);
            } else if (!hasFriendlyPawn) {
                mgScore += 10 * Math.sign(p); egScore += 10 * Math.sign(p);
            }
        }

        // King safety: pawn shield in middlegame
        for (const side of [1, -1]) {
            const ksq = this.findKingSq(side);
            if (ksq < 0) continue;
            const kf = sqFile(ksq);
            const kr = sqRank(ksq);
            const shieldRank = kr + side;
            if (shieldRank >= 0 && shieldRank <= 7) {
                let shield = 0;
                for (let df = -1; df <= 1; df++) {
                    const sf = kf + df;
                    if (sf < 0 || sf > 7) continue;
                    if (this.board[shieldRank * 8 + sf] === side * WP) shield++;
                }
                mgScore += (shield * 15) * side;
            }
        }

        // Tapered eval
        const maxPhase = 24;
        const p = Math.min(phase, maxPhase);
        const score = Math.round((mgScore * p + egScore * (maxPhase - p)) / maxPhase);

        return score * this.side; // Return from side-to-move perspective
    }

    // ---- Search ----
    orderMoves(moves, ply) {
        const scores = moves.map(mv => {
            let s = 0;
            if (mv.captured !== EMPTY) {
                s = 10000 + PIECE_VAL[Math.abs(mv.captured)] * 10 - PIECE_VAL[Math.abs(mv.piece)];
            }
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
        if (this.nodes % 4096 === 0 && performance.now() - this.startTime > this.timeLimit) {
            this.stopped = true;
            return 0;
        }

        const standPat = this.evaluate();
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        const inChk = this.inCheck(this.side);
        const moves = this.generateLegalMoves(!inChk); // all moves if in check, captures only otherwise

        if (inChk && moves.length === 0) return -(MATE_SCORE - ply);

        const ordered = this.orderMoves(moves, ply);
        for (const mv of ordered) {
            // Delta pruning
            if (!inChk && mv.captured !== EMPTY) {
                const delta = PIECE_VAL[Math.abs(mv.captured)] + 200;
                if (standPat + delta < alpha) continue;
            }

            this.makeMove(mv);
            const score = -this.quiesce(-beta, -alpha, ply + 1);
            this.unmakeMove(mv);

            if (this.stopped) return 0;
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    }

    negamax(depth, alpha, beta, ply, pvLine) {
        this.nodes++;
        if (this.stopped) return 0;
        if (this.nodes % 4096 === 0 && performance.now() - this.startTime > this.timeLimit) {
            this.stopped = true;
            return 0;
        }

        if (depth <= 0) return this.quiesce(alpha, beta, ply);

        // Check extension
        const inChk = this.inCheck(this.side);
        if (inChk && ply < 20) depth++;

        const moves = this.generateLegalMoves();
        if (moves.length === 0) {
            return inChk ? -(MATE_SCORE - ply) : 0;
        }

        // Draw by 50-move rule
        if (this.halfmove >= 100) return 0;

        const ordered = this.orderMoves(moves, ply);
        const childPv = [];

        for (const mv of ordered) {
            this.makeMove(mv);
            childPv.length = 0;
            const score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, childPv);
            this.unmakeMove(mv);

            if (this.stopped) return 0;

            if (score >= beta) {
                // Killer & history
                if (mv.captured === EMPTY) {
                    if (!this.killers[ply]) this.killers[ply] = [];
                    const key = mv.from * 64 + mv.to;
                    if (!this.killers[ply].includes(key)) {
                        this.killers[ply].unshift(key);
                        if (this.killers[ply].length > 2) this.killers[ply].pop();
                    }
                    this.history[mv.from * 64 + mv.to] += depth * depth;
                }
                return beta;
            }
            if (score > alpha) {
                alpha = score;
                pvLine.length = 0;
                pvLine.push(mv);
                pvLine.push(...childPv);
            }
        }
        return alpha;
    }

    searchRoot(maxDepth, timeLimitMs) {
        this.nodes = 0;
        this.startTime = performance.now();
        this.timeLimit = timeLimitMs;
        this.stopped = false;
        this.killers = [];
        this.history.fill(0);

        let bestMove = null;
        let bestScore = 0;
        let bestPv = [];
        let completedDepth = 0;

        for (let d = 1; d <= maxDepth; d++) {
            const pvLine = [];
            const score = this.negamax(d, -MATE_SCORE - 1, MATE_SCORE + 1, 0, pvLine);

            if (this.stopped && d > 1) break;

            if (pvLine.length > 0) {
                bestMove = pvLine[0];
                bestScore = score;
                bestPv = pvLine.slice();
                completedDepth = d;
            }

            // If we found a mate, no need to search deeper
            if (Math.abs(score) > MATE_SCORE - 100) break;
        }

        // Convert score from side-to-move perspective to white's perspective
        const whiteScore = bestScore * this.side;

        return { move: bestMove, score: whiteScore, pv: bestPv, depth: completedDepth, nodes: this.nodes };
    }

    analyze(fen, depth) {
        this.loadFen(fen);

        // Time limit scales with depth
        const timeMs = Math.min(depth * 500, 4000);
        const searchDepth = Math.min(depth, 8); // Cap local engine depth

        const result = this.searchRoot(searchDepth, timeMs);

        if (!result.move) {
            return { success: false, bestmove: '(none)', evaluation: 0 };
        }

        const uci = this.moveToUci(result.move);
        const pvStr = result.pv.map(m => this.moveToUci(m)).join(' ');

        // Build score object
        let scoreObj;
        if (Math.abs(result.score) > MATE_SCORE - 200) {
            const mateIn = Math.ceil((MATE_SCORE - Math.abs(result.score)) / 2);
            scoreObj = { mate: result.score > 0 ? mateIn : -mateIn };
        } else {
            scoreObj = { cp: result.score };
        }

        return {
            success: true,
            bestmove: uci,
            evaluation: result.score / 100,
            analysis: [{ uci, pv: pvStr, score: scoreObj }],
            depth: result.depth,
            nodes: result.nodes,
            source: 'local'
        };
    }
}

const localEngine = new LocalEngine();

function analyzeLocally(fen, depth) {
    console.log(`GabiBot: 🧠 Local engine analyzing FEN: ${fen.substring(0, 20)}... | Depth: ${depth}`);
    const start = performance.now();
    const result = localEngine.analyze(fen, depth);
    const elapsed = performance.now() - start;
    console.log(`GabiBot: 🧠 Local engine done in ${elapsed.toFixed(0)}ms | ${result.nodes} nodes | Depth: ${result.depth} | Best: ${result.bestmove}`);
    return result;
}

// ============================================================
// API FETCHING WITH LOCAL FALLBACK
// ============================================================

async function fetchEngineData(fen, depth, signal) {
    const startTime = performance.now();
    console.log(`GabiBot: 📡 API request for FEN: ${fen.substring(0, 20)}... | Depth: ${depth}`);

    const call = async (params) => {
        const url = `${API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}&${params}`;
        return new Promise((resolve, reject) => {
            const abortHandler = () => reject(new DOMException('Aborted', 'AbortError'));
            if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
            signal?.addEventListener('abort', abortHandler, { once: true });

            const timeoutId = setTimeout(() => {
                signal?.removeEventListener('abort', abortHandler);
                reject(new Error('timeout'));
            }, ANALYZE_TIMEOUT_MS);

            if (typeof GM_xmlhttpRequest !== 'undefined') {
                const req = GM_xmlhttpRequest({
                    method: 'GET', url, headers: { Accept: 'application/json' },
                    onload: (r) => {
                        clearTimeout(timeoutId);
                        signal?.removeEventListener('abort', abortHandler);
                        if (r.status >= 200 && r.status < 300) {
                            try {
                                const data = JSON.parse(r.responseText);
                                if (data.success === false) reject(new Error('API success=false'));
                                else {
                                    console.log(`GabiBot: ✅ API ok in ${(performance.now() - startTime).toFixed(0)}ms`);
                                    resolve(data);
                                }
                            } catch { reject(new Error('Invalid JSON')); }
                        } else reject(new Error(`API error ${r.status}`));
                    },
                    onerror: () => { clearTimeout(timeoutId); signal?.removeEventListener('abort', abortHandler); reject(new Error('Network error')); },
                    ontimeout: () => { clearTimeout(timeoutId); signal?.removeEventListener('abort', abortHandler); reject(new Error('timeout')); }
                });
                signal?.addEventListener('abort', () => req.abort(), { once: true });
            } else {
                fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal })
                    .then(async res => {
                        clearTimeout(timeoutId);
                        if (!res.ok) throw new Error(`API error ${res.status}`);
                        const data = await res.json();
                        if (data.success === false) throw new Error('API success=false');
                        console.log(`GabiBot: ✅ API ok in ${(performance.now() - startTime).toFixed(0)}ms`);
                        resolve(data);
                    })
                    .catch(err => { clearTimeout(timeoutId); signal?.removeEventListener('abort', abortHandler); reject(err); });
            }
        });
    };

    try { return await call(`multipv=${MULTIPV}&mode=analysis`); }
    catch (e) {
        if (e.name === 'AbortError') throw e;
        try { return await call(`multipv=${MULTIPV}&mode=bestmove`); }
        catch (e2) {
            if (e2.name === 'AbortError') throw e2;
            try { return await call('mode=bestmove'); }
            catch (e3) {
                if (e3.name === 'AbortError') throw e3;
                throw e3;
            }
        }
    }
}

async function fetchAnalysis(fen, depth, signal) {
    const cached = PositionCache.get(fen);
    if (cached) {
        console.log('GabiBot: 🗃️ Using cached analysis');
        return cached;
    }

    if (signal?.aborted || !BotState.hackEnabled) throw new DOMException('Aborted', 'AbortError');

    // Try API first
    try {
        const data = await fetchEngineData(fen, depth, signal);
        PositionCache.set(fen, data);
        return data;
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.warn(`GabiBot: ⚠️ API failed:`, error.message);
    }

    // Fallback to local engine
    console.warn(`GabiBot: 🔄 Falling back to local engine`);
    BotState.statusInfo = '🧠 Using local engine...';
    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
    await sleep(50); // Let UI render before blocking

    const localData = analyzeLocally(fen, depth);
    if (localData.success) {
        PositionCache.set(fen, localData);
        return localData;
    }

    throw new Error('Both API and local engine failed');
}

// ============================================================
// MOVE PARSING & ANALYSIS LOGIC (unchanged core logic)
// ============================================================

function parseBestLine(data) {
    const lines = [];
    const pushLine = (uci, pv, score) => {
        if (!uci || uci.length < 4) return;
        lines.push({ uci: uci.trim(), pv: (pv || '').trim(), score: score || {} });
    };
    const addFromArray = (arr) => arr.forEach(item => {
        const pv = item.pv || item.line || item.moves || '';
        const uci = item.uci || (pv ? pv.split(' ')[0] : '');
        const score = scoreFrom(item.score || item.evaluation || item.eval);
        pushLine(uci, pv, score);
    });

    if (Array.isArray(data.analysis)) addFromArray(data.analysis);
    else if (Array.isArray(data.lines)) addFromArray(data.lines);
    else if (Array.isArray(data.pvs)) addFromArray(data.pvs);

    if (!lines.length && typeof data.bestmove === 'string') {
        const parts = data.bestmove.split(' ');
        let uci = parts.length > 1 ? parts[1] : parts[0];
        if (uci === 'bestmove' && parts[1]) uci = parts[1];
        const pv = data.pv || data.continuation || uci;
        const score = scoreFrom(data.evaluation);
        pushLine(uci, pv, score);
    }
    lines.sort((a, b) => scoreNumeric(b.score) - scoreNumeric(a.score));
    return lines[0] || null;
}

// ---------------------------------------------------
// Premove Safety Logic
// ---------------------------------------------------
function isEnPassantCapture(fen, from, to, ourColor) {
    const parts = fen.split(' ');
    const ep = parts[3];
    const fromPiece = pieceFromFenChar(fenCharAtSquare(fen, from));
    if (!fromPiece || fromPiece.color !== ourColor || fromPiece.type !== 'p') return false;
    return ep && ep !== '-' && to === ep && from[0] !== to[0];
}

function checkPremoveSafety(fen, uci, ourColor) {
    if (!fen || !uci || uci.length < 4) return { safe: false, reason: 'Invalid move', riskLevel: 100 };

    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const oppColor = ourColor === 'w' ? 'b' : 'w';
    const movingCh = fenCharAtSquare(fen, from);
    const movingPiece = pieceFromFenChar(movingCh);

    if (!movingPiece || movingPiece.color !== ourColor) return { safe: false, reason: 'Not our piece', riskLevel: 100 };

    const destCh = fenCharAtSquare(fen, to);
    const destPiece = pieceFromFenChar(destCh);
    let riskLevel = 0;
    const reasons = [];

    // King safety
    if (movingPiece.type === 'k') {
        if (isSquareAttackedBy(fen, to, oppColor)) return { safe: false, reason: 'King moves into check', riskLevel: 100 };
    } else {
        const newFen = makeSimpleMove(fen, from, to);
        const kingPos = findKing(newFen, ourColor);
        if (kingPos && isSquareAttackedBy(newFen, kingPos, oppColor)) return { safe: false, reason: 'Exposes king to check', riskLevel: 100 };
    }

    // Don't hang queen
    if (movingPiece.type === 'q') {
        const attackers = getAttackersOfSquare(fen, to, oppColor);
        if (attackers.length > 0) {
            const hasDefender = getAttackersOfSquare(fen, to, ourColor).length > 1;
            if (!hasDefender || !destPiece) return { safe: false, reason: 'Hangs queen', riskLevel: 90 };
        }
    }

    // Don't hang rook
    if (movingPiece.type === 'r') {
        const attackers = getAttackersOfSquare(fen, to, oppColor);
        if (attackers.length > 0) {
            const captureValue = destPiece ? PIECE_VALUES[destPiece.type] : 0;
            if (captureValue < PIECE_VALUES.r) {
                const hasDefender = getAttackersOfSquare(fen, to, ourColor).length > 1;
                if (!hasDefender) { reasons.push('Hangs rook'); riskLevel += 60; }
            }
        }
    }

    // Destination safety
    const destAttackers = getAttackersOfSquare(fen, to, oppColor);
    if (destAttackers.length > 0 && !destPiece) {
        const defenders = getAttackersOfSquare(fen, to, ourColor).length;
        if (defenders === 0) { reasons.push('Undefended attacked square'); riskLevel += 30; }
        else if (destAttackers.length > defenders) { reasons.push('Heavily attacked square'); riskLevel += 20; }
    }

    // Bad trades
    if (destPiece && destPiece.color === oppColor) {
        const ourValue = PIECE_VALUES[movingPiece.type];
        const theirValue = PIECE_VALUES[destPiece.type];
        if (destAttackers.length > 0 && ourValue > theirValue) {
            reasons.push(`Bad trade: ${movingPiece.type} for ${destPiece.type}`);
            riskLevel += 25;
        }
    }

    const safe = riskLevel < 50;
    const reason = reasons.length > 0 ? reasons.join(', ') : (safe ? 'Move appears safe' : 'Move risky');
    return { safe, reason, riskLevel };
}

function shouldPremove(uci, fen) {
    if (!uci || uci.length < 4) return false;
    const game = getGame();
    const ourColor = getPlayerColor(game);
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const fromPiece = pieceFromFenChar(fenCharAtSquare(fen, from));
    const toPiece = pieceFromFenChar(fenCharAtSquare(fen, to));

    if (!fromPiece || fromPiece.color !== ourColor) return false;
    if (BotState.premoveMode === 'every') return true;
    if (BotState.premoveMode === 'capture') {
        return !!(toPiece && toPiece.color !== ourColor) || isEnPassantCapture(fen, from, to, ourColor);
    }
    if (BotState.premoveMode === 'filter') return !!BotState.premovePieces[fromPiece.type];
    return false;
}

export function getEvalBasedPremoveChance(evaluation, ourColor) {
    if (!BotState.premoveEnabled) return 0;
    let evalScore = 0;
    if (typeof evaluation === 'string') {
        if (evaluation === '-' || evaluation === 'Error') return 0;
        if (evaluation.includes('M')) {
            const mateNum = parseInt(evaluation.replace('M', '').replace('+', ''), 10);
            if (!isNaN(mateNum)) return (ourColor === 'w' ? mateNum : -mateNum) > 0 ? 100 : 20;
        }
        evalScore = parseFloat(evaluation);
    } else evalScore = parseFloat(evaluation);
    if (isNaN(evalScore)) return 0;

    const ourEval = ourColor === 'w' ? evalScore : -evalScore;
    if (ourEval >= 3.0) return 90;
    if (ourEval >= 2.0) return 75;
    if (ourEval >= 1.0) return 50;
    if (ourEval >= 0.5) return 35;
    if (ourEval >= 0) return 25;
    return 20;
}

function getOurMoveFromPV(pv, ourColor, sideToMove) {
    if (!pv) return null;
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (!moves.length) return null;
    return moves[sideToMove === ourColor ? 0 : 1] || null;
}

// ---------------------------------------------------
// Analysis Schedule
// ---------------------------------------------------
export function scheduleAnalysis(kind, fen, tickCallback) {
    const analysisId = ++currentAnalysisId;
    analysisQueue = analysisQueue.then(async () => {
        if (analysisId !== currentAnalysisId || !BotState.hackEnabled) return;

        const game = getGame();
        if (!game) return;

        if (kind === 'main' && lastFenProcessedMain === fen) return;
        if (kind !== 'main' && lastFenProcessedPremove === fen) return;

        const ctrl = new AbortController();

        try {
            BotState.statusInfo = kind === 'main' ? '🔄 Analyzing...' : '🔄 Analyzing (premove)...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            const randomDepth = getRandomDepth(BotState.botPower);
            if (analysisId !== currentAnalysisId) { ctrl.abort('superseded'); return; }

            const data = await fetchAnalysis(fen, randomDepth, ctrl.signal);
            if (analysisId !== currentAnalysisId) return;

            const sourceLabel = data.source === 'local' ? ' [local]' : '';
            const best = parseBestLine(data);

            if (kind === 'main') {
                BotState.bestMove = best?.uci || '-';
                BotState.currentEvaluation = scoreToDisplay(best?.score);
                BotState.principalVariation = best?.pv || 'Not available';
                BotState.statusInfo = `✓ Ready${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

                if (best) {
                    const from = best.uci.substring(0, 2);
                    const to = best.uci.substring(2, 4);
                    const promo = best.uci.length >= 5 ? best.uci[4] : null;
                    await executeMove(from, to, fen, promo, tickCallback);
                }
                lastFenProcessedMain = fen;
            } else {
                // Premove analysis
                const ourColor = getPlayerColor(game);
                const stm = getSideToMove(game);
                const ourUci = getOurMoveFromPV(best?.pv || '', ourColor, stm) ||
                    ((stm === ourColor) ? (best?.uci || null) : null);
                const premoveEvalDisplay = scoreToDisplay(best?.score);

                if (!ourUci) {
                    BotState.statusInfo = `Premove unavailable (no PV)${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                if (!shouldPremove(ourUci, fen)) {
                    BotState.statusInfo = `Premove skipped (${BotState.premoveMode})${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                const safetyCheck = checkPremoveSafety(fen, ourUci, ourColor);
                if (!safetyCheck.safe) {
                    BotState.statusInfo = `🛡️ Premove blocked: ${safetyCheck.reason}${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                let currentChance = getEvalBasedPremoveChance(premoveEvalDisplay, ourColor);
                if (safetyCheck.riskLevel > 0) {
                    currentChance = Math.max(5, currentChance - safetyCheck.riskLevel * 0.5);
                    console.log(`GabiBot: Risk ${safetyCheck.riskLevel}%, confidence: ${currentChance.toFixed(0)}%`);
                }

                BotState.currentPremoveChance = currentChance;

                const roll = Math.random() * 100;
                if (roll > currentChance) {
                    const skipReason = safetyCheck.riskLevel > 0
                        ? `${safetyCheck.reason} (${roll.toFixed(0)}% > ${currentChance.toFixed(0)}%)`
                        : `eval: ${premoveEvalDisplay}, ${roll.toFixed(0)}% > ${currentChance.toFixed(0)}%`;
                    BotState.statusInfo = `Premove skipped: ${skipReason}${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                const from = ourUci.substring(0, 2);
                const to = ourUci.substring(2, 4);
                clearArrows();
                drawArrow(from, to, 'rgba(80, 180, 255, 0.7)', 3);
                await simulateClickMove(from, to);
                await sleep(80);

                lastPremoveFen = fen;
                lastPremoveUci = ourUci;
                const safetyEmoji = safetyCheck.riskLevel === 0 ? '✅' : safetyCheck.riskLevel < 25 ? '⚠️' : '🔶';
                BotState.statusInfo = `${safetyEmoji} Premove: ${ourUci} (${Math.round(currentChance)}%)${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                lastFenProcessedPremove = fen;
            }
        } catch (error) {
            if (String(error?.name || error).toLowerCase().includes('abort') ||
                String(error?.message || error).toLowerCase().includes('superseded')) {
                BotState.statusInfo = '⏸ Analysis canceled';
            } else {
                console.error('GabiBot Error:', error);
                BotState.statusInfo = '❌ Analysis Error';
                BotState.currentEvaluation = 'Error';
            }
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
        }
    });
}