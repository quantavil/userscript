import { API_URL, MULTIPV, ANALYZE_TIMEOUT_MS } from './config.js';
import { BotState, PositionCache, getGame, getPlayerColor, getSideToMove, pa, invalidateGameCache } from './state.js';
import { scoreFrom, scoreToDisplay, scoreNumeric, getRandomDepth, sleep } from './utils.js';
import { drawArrow, clearArrows, executeMove, simulateClickMove } from './board.js';

let currentAnalysisId = 0;
let currentAbortController = null;

let lastFenProcessedMain = '';
let lastFenProcessedPremove = '';

export function getLastFenProcessedMain() { return lastFenProcessedMain; }
export function setLastFenProcessedMain(fen) { lastFenProcessedMain = fen; }
export function getLastFenProcessedPremove() { return lastFenProcessedPremove; }
export function setLastFenProcessedPremove(fen) { lastFenProcessedPremove = fen; }

// ============================================================
// LOCAL CHESS ENGINE
// ============================================================
// Pieces: P=1,N=2,B=3,R=4,Q=5,K=6. White positive, black negative.
// --- Zobrist Hashing ---
// Pre-computed random 64-bit keys stored as pairs of 32-bit ints for speed
const ZOBRIST = (() => {
    // Simple seeded PRNG (xorshift32) for deterministic keys
    let seed = 1070372;
    const rand32 = () => { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return seed >>> 0; };
    const table = new Uint32Array(13 * 64 * 2); // piece(0-12) * 64 squares * 2 (hi/lo)
    for (let i = 0; i < table.length; i++) table[i] = rand32();
    const sideKey = [rand32(), rand32()];
    const castlingKeys = new Uint32Array(16 * 2);
    for (let i = 0; i < castlingKeys.length; i++) castlingKeys[i] = rand32();
    const epKeys = new Uint32Array(8 * 2); // per-file
    for (let i = 0; i < epKeys.length; i++) epKeys[i] = rand32();
    return { table, sideKey, castlingKeys, epKeys };
})();
// Board: 64-element array, index = rank*8+file, a1=0, h8=63

const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = -1, BN = -2, BB = -3, BR = -4, BQ = -5, BK = -6;
const EMPTY = 0;
const FLAG_NONE = 0, FLAG_EP = 1, FLAG_CASTLE = 2, FLAG_PROMO = 4;
const MATE_SCORE = 30000;

// --- Hot-path constants (hoisted to avoid per-call allocation) ---
const KNIGHT_OFFSETS = [-17, -15, -10, -6, 6, 10, 15, 17];
const STRAIGHT_DIRS = [8, -8, 1, -1];
const DIAG_DIRS = [9, 7, -9, -7];
const ALL_DIRS = [9, 7, -9, -7, 8, -8, 1, -1];
const PHASE_VAL = [0, 0, 1, 1, 2, 4]; // indexed by abs piece type (0=empty,1=P,2=N,3=B,4=R,5=Q)
const ATTACK_WEIGHT = [0, 0, 20, 20, 40, 80]; // indexed by abs piece type

// Transposition table flags
const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;
const TT_SIZE = 65536; // Max entries

// Piece-square tables (from white's perspective, a1=index 0)
// Indexed [rank][file] visually but stored flat as [sq] where sq = rank*8+file
// So index 0 = a1, index 7 = h1, index 56 = a8, index 63 = h8

// --- PeSTO Piece-Square Tables (a1=index 0, h8=index 63, white perspective) ---
// Middlegame tables
const PST_PAWN_MG = [
    0, 0, 0, 0, 0, 0, 0, 0,
    -35, -1, -20, -23, -15, 24, 38, -22,
    -26, -4, -4, -10, 3, 3, 33, -12,
    -27, -2, -5, 12, 17, 6, 10, -25,
    -14, 13, 6, 21, 23, 12, 17, -23,
    -6, 7, 26, 31, 65, 56, 25, -20,
    98, 134, 61, 95, 68, 126, 34, -11,
    0, 0, 0, 0, 0, 0, 0, 0
];
const PST_KNIGHT_MG = [
    -105, -21, -58, -33, -17, -28, -19, -23,
    -29, -53, -12, -3, -1, 18, -14, -19,
    -23, -9, 12, 10, 19, 17, 25, -16,
    -13, 4, 16, 13, 28, 19, 21, -8,
    -9, 17, 19, 53, 37, 69, 18, 22,
    -47, 60, 37, 65, 84, 129, 73, 44,
    -73, -41, 72, 36, 23, 62, 7, -17,
    -167, -89, -34, -49, 61, -97, -15, -107
];
const PST_BISHOP_MG = [
    -33, -3, -14, -21, -13, -12, -39, -21,
    4, 15, 16, 0, 7, 21, 33, 1,
    0, 15, 15, 15, 14, 27, 18, 10,
    -6, 13, 13, 26, 34, 12, 10, 4,
    -4, 5, 19, 50, 37, 37, 7, -2,
    -16, 37, 43, 40, 35, 50, 37, -2,
    -26, 16, -18, -13, 30, 59, 18, -47,
    -29, 4, -82, -37, -25, -42, 7, -8
];
const PST_ROOK_MG = [
    -19, -13, 1, 17, 16, 7, -37, -26,
    -44, -16, -20, -9, -1, 11, -6, -71,
    -45, -25, -16, -17, 3, 0, -5, -33,
    -36, -26, -12, -1, 9, -7, 6, -23,
    -24, -11, 7, 26, 24, 35, -8, -20,
    -5, 19, 26, 36, 17, 45, 61, 16,
    27, 32, 58, 62, 80, 67, 26, 44,
    32, 42, 32, 51, 63, 9, 31, 43
];
const PST_QUEEN_MG = [
    -1, -18, -9, 10, -15, -25, -31, -50,
    -35, -8, 11, 2, 8, 15, -3, 1,
    -14, 2, -11, -2, -5, 2, 14, 5,
    -9, -26, -9, -10, -2, -4, 3, -3,
    -27, -27, -16, -16, -1, 17, -2, 1,
    -13, -17, 7, 8, 29, 56, 47, 57,
    -24, -39, -5, 1, -16, 57, 28, 54,
    -28, 0, 29, 12, 59, 44, 43, 45
];
const PST_KING_MG = [
    -15, 36, 12, -54, 8, -28, 24, 14,
    1, 7, -8, -64, -43, -16, 9, 8,
    -14, -14, -22, -46, -44, -30, -15, -27,
    -49, -1, -27, -39, -46, -44, -33, -51,
    -17, -20, -12, -27, -30, -25, -14, -36,
    -9, 24, 2, -16, -20, 6, 22, -22,
    29, -1, -20, -7, -8, -4, -38, -29,
    -65, 23, 16, -15, -56, -34, 2, 13
];

// Endgame tables
const PST_PAWN_EG = [
    0, 0, 0, 0, 0, 0, 0, 0,
    13, 8, 8, 10, 13, 0, 2, -7,
    4, 7, -6, 1, 0, -5, -1, -8,
    13, 9, -3, -7, -7, -8, 3, -1,
    32, 24, 13, 5, -2, 4, 17, 17,
    94, 100, 85, 67, 56, 53, 82, 84,
    178, 173, 158, 134, 147, 132, 165, 187,
    0, 0, 0, 0, 0, 0, 0, 0
];
const PST_KNIGHT_EG = [
    -29, -51, -23, -15, -22, -18, -50, -64,
    -42, -20, -10, -5, -2, -20, -23, -44,
    -23, -3, -1, 15, 10, -3, -20, -22,
    -18, -6, 16, 25, 16, 17, 4, -18,
    -17, 3, 22, 22, 22, 11, 8, -18,
    -24, -20, 10, 9, -1, -9, -19, -41,
    -25, -8, -25, -2, -9, -25, -24, -52,
    -58, -38, -13, -28, -31, -27, -63, -99
];
const PST_BISHOP_EG = [
    -23, -9, -23, -5, -9, -16, -5, -17,
    -14, -18, -7, -1, 4, -9, -15, -27,
    -12, -3, 8, 10, 13, 3, -7, -15,
    -6, 3, 13, 19, 7, 10, -3, -9,
    -3, 9, 12, 9, 14, 10, 3, 2,
    2, -8, 0, -1, -2, 6, 0, 4,
    -8, -4, 7, -12, -3, -13, -4, -14,
    -14, -21, -11, -8, -7, -9, -17, -24
];
const PST_ROOK_EG = [
    -9, 2, 3, -1, -5, -13, 4, -20,
    -6, -6, 0, 2, -9, -9, -11, -3,
    -4, 0, -5, -1, -7, -12, -8, -16,
    3, 5, 8, 4, -5, -6, -8, -11,
    4, 3, 13, 1, 2, 1, -1, 2,
    7, 7, 7, 5, 4, -3, -5, -3,
    11, 13, 13, 11, -3, 3, 8, 3,
    13, 10, 18, 15, 12, 12, 8, 5
];
const PST_QUEEN_EG = [
    -33, -28, -22, -43, -5, -32, -20, -41,
    -22, -23, -30, -16, -16, -23, -36, -32,
    -16, -27, 15, 6, 9, 17, 10, 5,
    -18, 28, 19, 47, 31, 34, 39, 23,
    3, 22, 24, 45, 57, 40, 57, 36,
    -20, 6, 9, 49, 47, 35, 19, 9,
    -17, 20, 32, 41, 58, 25, 30, 0,
    -9, 22, 22, 27, 27, 19, 10, 20
];
const PST_KING_EG = [
    -53, -34, -21, -11, -28, -14, -24, -43,
    -27, -11, 4, 13, 14, 4, -5, -17,
    -19, -3, 11, 21, 23, 16, 7, -9,
    -18, -4, 21, 24, 27, 23, 9, -11,
    -8, 22, 24, 27, 26, 33, 26, 3,
    10, 17, 23, 15, 20, 45, 44, 13,
    -12, 17, 14, 17, 17, 38, 23, 11,
    -74, -35, -18, -18, -11, 15, 4, -17
];

// Lookup arrays indexed by abs piece type (0=unused, 1=P, 2=N, 3=B, 4=R, 5=Q, 6=K)
const PST_MG = [null, PST_PAWN_MG, PST_KNIGHT_MG, PST_BISHOP_MG, PST_ROOK_MG, PST_QUEEN_MG, PST_KING_MG];
const PST_EG = [null, PST_PAWN_EG, PST_KNIGHT_EG, PST_BISHOP_EG, PST_ROOK_EG, PST_QUEEN_EG, PST_KING_EG];

// PeSTO material values (MG/EG) for incremental eval
const MAT_MG = [0, 82, 337, 365, 477, 1025, 0];
const MAT_EG = [0, 94, 281, 297, 512, 936, 0];

// Single-value table for move ordering, SEE, and premove safety checks
const PIECE_VAL = { 1: 82, 2: 337, 3: 365, 4: 477, 5: 1025, 6: 20000 };

function mirrorSq(sq) { return (7 - (sq >> 3)) * 8 + (sq & 7); }
function sqFile(sq) { return sq & 7; }
function sqRank(sq) { return sq >> 3; }
function sqName(sq) { return 'abcdefgh'[sqFile(sq)] + (sqRank(sq) + 1); }
function nameToSq(s) { return (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8; }

// Zobrist helpers
function zobPieceIdx(piece) {
    // Map piece value (-6..-1, 1..6) to index 0-11. Empty=invalid
    return piece > 0 ? (piece - 1) : (-piece + 5);
}
function zobPieceKey(piece, sq) {
    const base = (zobPieceIdx(piece) * 64 + sq) * 2;
    return [ZOBRIST.table[base], ZOBRIST.table[base + 1]];
}
function zobXor(hash, key) {
    hash[0] ^= key[0]; hash[1] ^= key[1];
}

export class LocalEngine {
    constructor() {
        this.board = new Array(64).fill(EMPTY);
        this.side = 1;     // 1=white, -1=black
        this.castling = 0; // bits: 1=wK, 2=wQ, 4=bK, 8=bQ
        this.epSquare = -1;
        this.halfmove = 0;
        this.fullmove = 1;
        this.wKingSq = 4;  // Incremental king tracking
        this.bKingSq = 60; // Incremental king tracking
        this.stateStack = [];
        this.nodes = 0;
        this.timeLimit = 0;
        this.startTime = 0;
        this.stopped = false;
        this.pvTable = [];
        this.killers = [];
        this.history = new Int32Array(64 * 64);
        this.tt = new Array(TT_SIZE); // Fixed size hash table (array of objects)
        // Pre-allocate eval buffers to avoid garbage collection in hot path
        this.evalBufs = {
            wPawnFiles: new Uint8Array(8), bPawnFiles: new Uint8Array(8),
            wPawnRanks: new Int8Array(8), bPawnRanks: new Int8Array(8),
            bPawnMaxRanks: new Int8Array(8), wPawnMinRanks: new Int8Array(8),
            rookSquares: new Int8Array(4), rookSides: new Int8Array(4)
        };
        this.hash = [0, 0]; // Zobrist hash [hi, lo]
        this.phase = 0;
        this.positionHistory = []; // For 3-fold repetition detection
        this.contempt = 0; // Dirty play: positive=avoid draws, negative=seek draws
        this.rootSide = 1; // Set properly in searchRoot

        // Incremental evaluation state
        this.mgPstMat = 0;
        this.egPstMat = 0;
        this.wBishops = 0;
        this.bBishops = 0;
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
                else {
                    const piece = pieceMap[ch] || EMPTY;
                    this.board[r * 8 + f] = piece;
                    if (piece === WK) this.wKingSq = r * 8 + f;
                    else if (piece === BK) this.bKingSq = r * 8 + f;
                    f++;
                }
            }
        }

        this.side = (parts[1] || 'w') === 'w' ? 1 : -1;
        const c = parts[2] || '-';
        this.castling = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
        this.epSquare = (parts[3] && parts[3] !== '-') ? nameToSq(parts[3]) : -1;
        this.halfmove = parseInt(parts[4]) || 0;
        this.fullmove = parseInt(parts[5]) || 1;
        this.stateStack = [];
        this.positionHistory = [];
        this._initIncrementalScores();
        this._computeHash();
    }

    _initIncrementalScores() {
        this.mgPstMat = 0;
        this.egPstMat = 0;
        this.phase = 0;
        this.wBishops = 0;
        this.bBishops = 0;

        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (p === EMPTY) continue;
            this._addPieceScore(p, sq);
        }
    }

    _addPieceScore(p, sq) {
        const side = p > 0 ? 1 : -1;
        const abs = p > 0 ? p : -p;
        const pstSq = side === 1 ? sq : mirrorSq(sq);

        this.mgPstMat += (MAT_MG[abs] + PST_MG[abs][pstSq]) * side;
        this.egPstMat += (MAT_EG[abs] + PST_EG[abs][pstSq]) * side;

        if (abs >= 2 && abs <= 5) this.phase += PHASE_VAL[abs];
        if (abs === 3) {
            if (side === 1) this.wBishops++;
            else this.bBishops++;
        }
    }

    _removePieceScore(p, sq) {
        const side = p > 0 ? 1 : -1;
        const abs = p > 0 ? p : -p;
        const pstSq = side === 1 ? sq : mirrorSq(sq);

        this.mgPstMat -= (MAT_MG[abs] + PST_MG[abs][pstSq]) * side;
        this.egPstMat -= (MAT_EG[abs] + PST_EG[abs][pstSq]) * side;

        if (abs >= 2 && abs <= 5) this.phase -= PHASE_VAL[abs];
        if (abs === 3) {
            if (side === 1) this.wBishops--;
            else this.bBishops--;
        }
    }

    _computeHash() {
        this.hash = [0, 0];
        for (let sq = 0; sq < 64; sq++) {
            const p = this.board[sq];
            if (p !== EMPTY) zobXor(this.hash, zobPieceKey(p, sq));
        }
        if (this.side === -1) zobXor(this.hash, ZOBRIST.sideKey);
        const ck = this.castling * 2;
        zobXor(this.hash, [ZOBRIST.castlingKeys[ck], ZOBRIST.castlingKeys[ck + 1]]);
        if (this.epSquare >= 0) {
            const ef = sqFile(this.epSquare) * 2;
            zobXor(this.hash, [ZOBRIST.epKeys[ef], ZOBRIST.epKeys[ef + 1]]);
        }
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
        // Push position hash for repetition detection
        this.positionHistory.push(this.hash[0] + '|' + this.hash[1]);
        this.stateStack.push({
            castling: this.castling, epSquare: this.epSquare,
            halfmove: this.halfmove, fullmove: this.fullmove,
            wKingSq: this.wKingSq, bKingSq: this.bKingSq,
            hash: [this.hash[0], this.hash[1]],
            mgPstMat: this.mgPstMat, egPstMat: this.egPstMat,
            phase: this.phase,
            wBishops: this.wBishops, bBishops: this.bBishops
        });

        const { from, to, flags, piece, promo } = mv;
        const abs = Math.abs(piece);

        // Incremental Zobrist: remove piece from source
        zobXor(this.hash, zobPieceKey(piece, from));
        // Remove captured piece (if any)
        if (mv.captured !== EMPTY && !(flags & FLAG_EP)) {
            zobXor(this.hash, zobPieceKey(mv.captured, to));
            this._removePieceScore(mv.captured, to);
        }

        this.board[from] = EMPTY;
        this._removePieceScore(piece, from);

        const landed = (flags & FLAG_PROMO) ? promo : piece;
        this.board[to] = landed;
        this._addPieceScore(landed, to);

        // Add piece at destination
        zobXor(this.hash, zobPieceKey(landed, to));

        // Update king position tracking
        if (abs === 6) {
            if (this.side === 1) this.wKingSq = to;
            else this.bKingSq = to;
        }

        // En passant capture
        if (flags & FLAG_EP) {
            const epCapSq = to - this.side * 8;
            const capPawn = this.board[epCapSq] || (-this.side); // Should be -side * WP
            zobXor(this.hash, zobPieceKey(capPawn, epCapSq));
            this._removePieceScore(capPawn, epCapSq);
            this.board[epCapSq] = EMPTY;
        }

        // Castling rook movement
        if (flags & FLAG_CASTLE) {
            if (to > from) { // Kingside
                const rook = this.side * WR;
                zobXor(this.hash, zobPieceKey(rook, from + 3));
                this._removePieceScore(rook, from + 3);

                this.board[from + 3] = EMPTY;
                this.board[from + 1] = rook;

                zobXor(this.hash, zobPieceKey(rook, from + 1));
                this._addPieceScore(rook, from + 1);
            } else { // Queenside
                const rook = this.side * WR;
                zobXor(this.hash, zobPieceKey(rook, from - 4));
                this._removePieceScore(rook, from - 4);

                this.board[from - 4] = EMPTY;
                this.board[from - 1] = rook;

                zobXor(this.hash, zobPieceKey(rook, from - 1));
                this._addPieceScore(rook, from - 1);
            }
        }

        // Update castling rights (with hash update)
        const oldCastling = this.castling;

        // Update en passant square (with hash update)
        if (this.epSquare >= 0) {
            const ef = sqFile(this.epSquare) * 2;
            zobXor(this.hash, [ZOBRIST.epKeys[ef], ZOBRIST.epKeys[ef + 1]]);
        }
        if (abs === 1 && Math.abs(to - from) === 16) {
            this.epSquare = (from + to) >> 1;
        } else {
            this.epSquare = -1;
        }
        if (this.epSquare >= 0) {
            const ef = sqFile(this.epSquare) * 2;
            zobXor(this.hash, [ZOBRIST.epKeys[ef], ZOBRIST.epKeys[ef + 1]]);
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

        // Hash castling change
        if (oldCastling !== this.castling) {
            const oc = oldCastling * 2, nc = this.castling * 2;
            zobXor(this.hash, [ZOBRIST.castlingKeys[oc], ZOBRIST.castlingKeys[oc + 1]]);
            zobXor(this.hash, [ZOBRIST.castlingKeys[nc], ZOBRIST.castlingKeys[nc + 1]]);
        }

        // Halfmove clock
        this.halfmove = (abs === 1 || mv.captured !== EMPTY) ? 0 : this.halfmove + 1;

        if (this.side === -1) this.fullmove++;
        this.side = -this.side;
        zobXor(this.hash, ZOBRIST.sideKey);
    }

    unmakeMove(mv) {
        this.side = -this.side;
        this.positionHistory.pop();
        const st = this.stateStack.pop();
        this.castling = st.castling;
        this.epSquare = st.epSquare;
        this.halfmove = st.halfmove;
        this.fullmove = st.fullmove;
        this.wKingSq = st.wKingSq;
        this.bKingSq = st.bKingSq;
        this.hash = st.hash;

        this.mgPstMat = st.mgPstMat;
        this.egPstMat = st.egPstMat;
        this.phase = st.phase;
        this.wBishops = st.wBishops;
        this.bBishops = st.bBishops;

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
        return side === 1 ? this.wKingSq : this.bKingSq;
    }

    isAttacked(sq, bySide) {
        // Pawn attacks
        const pawnDir = bySide === 1 ? 1 : -1;
        const pawnRank = (sq >> 3) - pawnDir;
        if (pawnRank >= 0 && pawnRank <= 7) {
            const pf = sq & 7;
            if (pf > 0 && this.board[pawnRank * 8 + pf - 1] === bySide) return true;
            if (pf < 7 && this.board[pawnRank * 8 + pf + 1] === bySide) return true;
        }

        // Knight attacks
        const kn = bySide * WN;
        const sqf = sq & 7;
        for (let i = 0; i < 8; i++) {
            const t = sq + KNIGHT_OFFSETS[i];
            if (t < 0 || t > 63) continue;
            const df = (t & 7) - sqf; if (df > 2 || df < -2) continue;
            if (this.board[t] === kn) return true;
        }

        // King attacks
        const kg = bySide * WK;
        for (let dr = -1; dr <= 1; dr++) {
            for (let df = -1; df <= 1; df++) {
                if (!dr && !df) continue;
                const t = sq + dr * 8 + df;
                if (t < 0 || t > 63) continue;
                const fd = (t & 7) - sqf; if (fd > 1 || fd < -1) continue;
                if (this.board[t] === kg) return true;
            }
        }

        // Sliding: rook/queen on ranks and files
        const sideR = bySide * WR, sideQ = bySide * WQ, sideB = bySide * WB;

        for (let i = 0; i < 4; i++) {
            const dir = STRAIGHT_DIRS[i];
            let t = sq + dir;
            while (t >= 0 && t <= 63) {
                if (dir === 1 || dir === -1) {
                    if ((t >> 3) !== ((t - dir) >> 3)) break;
                }
                const p = this.board[t];
                if (p !== EMPTY) {
                    if (p === sideR || p === sideQ) return true;
                    break;
                }
                t += dir;
            }
        }

        for (let i = 0; i < 4; i++) {
            const dir = DIAG_DIRS[i];
            let t = sq + dir;
            while (t >= 0 && t <= 63) {
                const fd = (t & 7) - ((t - dir) & 7);
                if (fd !== 1 && fd !== -1) break;
                const p = this.board[t];
                if (p !== EMPTY) {
                    if (p === sideB || p === sideQ) return true;
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
        const bd = this.board;

        for (let sq = 0; sq < 64; sq++) {
            const p = bd[sq];
            if (p === EMPTY || (p > 0 ? 1 : -1) !== s) continue;
            const abs = p > 0 ? p : -p;
            const file = sq & 7;
            const rank = sq >> 3;

            if (abs === 1) { // Pawn
                const dir = s;
                const promoRank = s === 1 ? 7 : 0;
                const startRank = s === 1 ? 1 : 6;
                const fwd = sq + dir * 8;

                if (fwd >= 0 && fwd <= 63 && bd[fwd] === EMPTY) {
                    if ((fwd >> 3) === promoRank) {
                        for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, fwd, FLAG_PROMO, s * pr));
                    } else if (!capturesOnly) {
                        moves.push(this.createMove(sq, fwd));
                        const fwd2 = fwd + dir * 8;
                        if (rank === startRank && fwd2 >= 0 && fwd2 <= 63 && bd[fwd2] === EMPTY) {
                            moves.push(this.createMove(sq, fwd2));
                        }
                    }
                }

                for (const df of [-1, 1]) {
                    const cf = file + df;
                    if (cf < 0 || cf > 7) continue;
                    const csq = fwd + df;
                    if (csq < 0 || csq > 63) continue;
                    const cp = bd[csq];
                    if (cp !== EMPTY && (cp > 0 ? 1 : -1) === opp) {
                        if ((csq >> 3) === promoRank) {
                            for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, csq, FLAG_PROMO, s * pr));
                        } else {
                            moves.push(this.createMove(sq, csq));
                        }
                    } else if (csq === this.epSquare) {
                        moves.push(this.createMove(sq, csq, FLAG_EP));
                    }
                }
            } else if (abs === 2) { // Knight
                for (let i = 0; i < 8; i++) {
                    const t = sq + KNIGHT_OFFSETS[i];
                    if (t < 0 || t > 63) continue;
                    const df = (t & 7) - file; if (df > 2 || df < -2) continue;
                    const tp = bd[t];
                    if (tp !== EMPTY && (tp > 0 ? 1 : -1) === s) continue;
                    if (capturesOnly && tp === EMPTY) continue;
                    moves.push(this.createMove(sq, t));
                }
            } else if (abs === 6) { // King
                for (let dr = -1; dr <= 1; dr++) {
                    for (let df = -1; df <= 1; df++) {
                        if (!dr && !df) continue;
                        const t = sq + dr * 8 + df;
                        if (t < 0 || t > 63) continue;
                        const fd = (t & 7) - file; if (fd > 1 || fd < -1) continue;
                        const tp = bd[t];
                        if (tp !== EMPTY && (tp > 0 ? 1 : -1) === s) continue;
                        if (capturesOnly && tp === EMPTY) continue;
                        moves.push(this.createMove(sq, t));
                    }
                }
                if (!capturesOnly && !this.inCheck(s)) {
                    if (s === 1) {
                        if ((this.castling & 1) && sq === 4 && bd[5] === EMPTY && bd[6] === EMPTY
                            && !this.isAttacked(5, -1) && !this.isAttacked(6, -1)) {
                            moves.push(this.createMove(4, 6, FLAG_CASTLE));
                        }
                        if ((this.castling & 2) && sq === 4 && bd[3] === EMPTY && bd[2] === EMPTY && bd[1] === EMPTY
                            && !this.isAttacked(3, -1) && !this.isAttacked(2, -1)) {
                            moves.push(this.createMove(4, 2, FLAG_CASTLE));
                        }
                    } else {
                        if ((this.castling & 4) && sq === 60 && bd[61] === EMPTY && bd[62] === EMPTY
                            && !this.isAttacked(61, 1) && !this.isAttacked(62, 1)) {
                            moves.push(this.createMove(60, 62, FLAG_CASTLE));
                        }
                        if ((this.castling & 8) && sq === 60 && bd[59] === EMPTY && bd[58] === EMPTY && bd[57] === EMPTY
                            && !this.isAttacked(59, 1) && !this.isAttacked(58, 1)) {
                            moves.push(this.createMove(60, 58, FLAG_CASTLE));
                        }
                    }
                }
            } else {
                // Sliding pieces: B=3, R=4, Q=5
                const dirs = abs === 3 ? DIAG_DIRS : abs === 4 ? STRAIGHT_DIRS : ALL_DIRS;
                for (let di = 0; di < dirs.length; di++) {
                    const dir = dirs[di];
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        const fdiff = (t & 7) - ((t - dir) & 7);
                        if ((dir === 1 || dir === -1) && (fdiff !== 1 && fdiff !== -1)) break;
                        const adir = dir > 0 ? dir : -dir;
                        if ((adir === 7 || adir === 9) && (fdiff !== 1 && fdiff !== -1)) break;
                        const tp = bd[t];
                        if (tp !== EMPTY && (tp > 0 ? 1 : -1) === s) break;
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
        let mgScore = this.mgPstMat, egScore = this.egPstMat;
        const bd = this.board;

        const { wPawnFiles, bPawnFiles, wPawnRanks, bPawnRanks,
            bPawnMaxRanks, wPawnMinRanks, rookSquares, rookSides } = this.evalBufs;
        wPawnFiles.fill(0); bPawnFiles.fill(0);
        wPawnRanks.fill(-1); bPawnRanks.fill(8);
        bPawnMaxRanks.fill(-1); wPawnMinRanks.fill(8);

        let rookCount = 0;
        let wKingAttackers = 0, bKingAttackers = 0;
        let wKingAttackWeight = 0, bKingAttackWeight = 0;
        const wKingSq = this.wKingSq, bKingSq = this.bKingSq;
        const wkf = wKingSq & 7, wkr = wKingSq >> 3;
        const bkf = bKingSq & 7, bkr = bKingSq >> 3;

        for (let sq = 0; sq < 64; sq++) {
            const p = bd[sq];
            if (p === EMPTY) continue;

            const side = p > 0 ? 1 : -1;
            const abs = p > 0 ? p : -p;
            const file = sq & 7, rank = sq >> 3;

            if (abs === 1) {
                if (side === 1) {
                    wPawnFiles[file]++;
                    if (rank > wPawnRanks[file]) wPawnRanks[file] = rank;
                    if (rank < wPawnMinRanks[file]) wPawnMinRanks[file] = rank;
                } else {
                    bPawnFiles[file]++;
                    if (rank < bPawnRanks[file]) bPawnRanks[file] = rank;
                    if (rank > bPawnMaxRanks[file]) bPawnMaxRanks[file] = rank;
                }
            }

            if (abs === 2) {
                let mob = 0;
                for (let i = 0; i < 8; i++) {
                    const t = sq + KNIGHT_OFFSETS[i];
                    if (t < 0 || t > 63) continue;
                    const df = (t & 7) - file; if (df > 2 || df < -2) continue;
                    const tp = bd[t];
                    if (tp === EMPTY || (tp > 0 ? 1 : -1) !== side) mob++;
                }
                mgScore += (mob - 4) * 4 * side;
                egScore += (mob - 4) * 4 * side;
            } else if (abs === 3) {
                let mob = 0;
                for (let di = 0; di < 4; di++) {
                    const dir = DIAG_DIRS[di];
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        const fd = (t & 7) - ((t - dir) & 7);
                        if (fd !== 1 && fd !== -1) break;
                        const tp = bd[t];
                        if (tp !== EMPTY && (tp > 0 ? 1 : -1) === side) break;
                        mob++;
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
                mgScore += (mob - 5) * 5 * side;
                egScore += (mob - 5) * 5 * side;
            } else if (abs === 4) {
                if (rookCount < 4) { rookSquares[rookCount] = sq; rookSides[rookCount] = side; rookCount++; }
                let mob = 0;
                for (let di = 0; di < 4; di++) {
                    const dir = STRAIGHT_DIRS[di];
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        if (dir === 1 || dir === -1) {
                            if ((t >> 3) !== ((t - dir) >> 3)) break;
                        }
                        const tp = bd[t];
                        if (tp !== EMPTY && (tp > 0 ? 1 : -1) === side) break;
                        mob++;
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
                mgScore += (mob - 7) * 3 * side;
                egScore += (mob - 7) * 4 * side;
            } else if (abs === 5) {
                let mob = 0;
                for (let di = 0; di < 8; di++) {
                    const dir = ALL_DIRS[di];
                    let t = sq + dir;
                    while (t >= 0 && t <= 63) {
                        const fd = (t & 7) - ((t - dir) & 7);
                        if (fd > 1 || fd < -1) break;
                        const tp = bd[t];
                        if (tp !== EMPTY && (tp > 0 ? 1 : -1) === side) break;
                        mob++;
                        if (tp !== EMPTY) break;
                        t += dir;
                    }
                }
                mgScore += (mob - 14) * 1 * side;
                egScore += (mob - 14) * 2 * side;
            }

            if (abs >= 2 && abs <= 5) {
                if (side === 1) {
                    const df = file - bkf; const adf = df > 0 ? df : -df;
                    const dr = rank - bkr; const adr = dr > 0 ? dr : -dr;
                    if (adf <= 2 && adr <= 2) {
                        wKingAttackers++;
                        wKingAttackWeight += ATTACK_WEIGHT[abs];
                    }
                } else {
                    const df = file - wkf; const adf = df > 0 ? df : -df;
                    const dr = rank - wkr; const adr = dr > 0 ? dr : -dr;
                    if (adf <= 2 && adr <= 2) {
                        bKingAttackers++;
                        bKingAttackWeight += ATTACK_WEIGHT[abs];
                    }
                }
            }
        }

        // Bishop pair
        if (this.wBishops >= 2) { mgScore += 30; egScore += 50; }
        if (this.bBishops >= 2) { mgScore -= 30; egScore -= 50; }

        // Pawn structure
        for (let f = 0; f < 8; f++) {
            // Doubled pawns
            if (wPawnFiles[f] > 1) { mgScore -= 10 * (wPawnFiles[f] - 1); egScore -= 20 * (wPawnFiles[f] - 1); }
            if (bPawnFiles[f] > 1) { mgScore += 10 * (bPawnFiles[f] - 1); egScore += 20 * (bPawnFiles[f] - 1); }

            // Isolated pawns
            if (wPawnFiles[f] > 0) {
                const hasNeighbor = (f > 0 && wPawnFiles[f - 1] > 0) || (f < 7 && wPawnFiles[f + 1] > 0);
                if (!hasNeighbor) { mgScore -= 15; egScore -= 20; }
            }
            if (bPawnFiles[f] > 0) {
                const hasNeighbor = (f > 0 && bPawnFiles[f - 1] > 0) || (f < 7 && bPawnFiles[f + 1] > 0);
                if (!hasNeighbor) { mgScore += 15; egScore += 20; }
            }

            // --- FIXED passed pawn detection ---
            // White: passed if no black pawn ahead (higher rank) on adjacent files
            if (wPawnRanks[f] >= 0) {
                let passed = true;
                const fmin = f > 0 ? f - 1 : 0, fmax = f < 7 ? f + 1 : 7;
                for (let ff = fmin; ff <= fmax; ff++) {
                    if (bPawnMaxRanks[ff] > wPawnRanks[f]) { passed = false; break; }
                }
                if (passed) {
                    const advance = wPawnRanks[f];
                    const bonus = [0, 5, 10, 20, 40, 70, 120][advance] || 0;
                    mgScore += bonus / 2;
                    egScore += bonus;
                }
            }
            // Black: passed if no white pawn ahead (lower rank) on adjacent files
            if (bPawnRanks[f] < 8) {
                let passed = true;
                const fmin = f > 0 ? f - 1 : 0, fmax = f < 7 ? f + 1 : 7;
                for (let ff = fmin; ff <= fmax; ff++) {
                    if (wPawnMinRanks[ff] < bPawnRanks[f]) { passed = false; break; }
                }
                if (passed) {
                    const advance = 7 - bPawnRanks[f];
                    const bonus = [0, 5, 10, 20, 40, 70, 120][advance] || 0;
                    mgScore -= bonus / 2;
                    egScore -= bonus;
                }
            }
        }

        // Rook on open/semi-open file
        for (let i = 0; i < rookCount; i++) {
            const f = rookSquares[i] & 7;
            const side = rookSides[i];
            const hasFriendlyPawn = side === 1 ? wPawnFiles[f] > 0 : bPawnFiles[f] > 0;
            const hasEnemyPawn = side === 1 ? bPawnFiles[f] > 0 : wPawnFiles[f] > 0;
            if (!hasFriendlyPawn && !hasEnemyPawn) {
                mgScore += 20 * side; egScore += 20 * side;
            } else if (!hasFriendlyPawn) {
                mgScore += 10 * side; egScore += 10 * side;
            }
        }

        // King safety: pawn shield
        for (let si = 0; si < 2; si++) {
            const side = si === 0 ? 1 : -1;
            const ksq = side === 1 ? wKingSq : bKingSq;
            if (ksq < 0) continue;
            const kf = ksq & 7;
            const kr = ksq >> 3;
            const shieldRank = kr + side;
            if (shieldRank >= 0 && shieldRank <= 7) {
                let shield = 0;
                for (let df = -1; df <= 1; df++) {
                    const sf = kf + df;
                    if (sf < 0 || sf > 7) continue;
                    if (bd[shieldRank * 8 + sf] === side) shield++;
                }
                mgScore += (shield * 15) * side;
            }
        }

        // King attack bonus
        if (wKingAttackers >= 2) {
            const bonus = wKingAttackWeight * wKingAttackers / 4;
            mgScore += bonus > 300 ? 300 : bonus;
        }
        if (bKingAttackers >= 2) {
            const bonus = bKingAttackWeight * bKingAttackers / 4;
            mgScore -= bonus > 300 ? 300 : bonus;
        }

        // Tapered eval — phase is tracked incrementally
        const maxPhase = 24;
        const ph = this.phase < maxPhase ? this.phase : maxPhase;
        const score = ((mgScore * ph + egScore * (maxPhase - ph)) / maxPhase + 0.5) | 0;

        return score * this.side;
    }

    // ---- Search ----
    scoreMoves(moves, ply, ttMove) {
        const scores = new Int32Array(moves.length);
        for (let i = 0; i < moves.length; i++) {
            const mv = moves[i];
            let s = 0;
            // TT move gets highest priority
            if (ttMove && mv.from === ttMove.from && mv.to === ttMove.to) {
                s = 100000;
            } else if (mv.captured !== EMPTY) {
                s = 10000 + PIECE_VAL[Math.abs(mv.captured)] * 10 - PIECE_VAL[Math.abs(mv.piece)];
            }
            if (mv.flags & FLAG_PROMO) s += 8000 + PIECE_VAL[Math.abs(mv.promo)];
            if (this.killers[ply] && this.killers[ply].includes(mv.from * 64 + mv.to)) s += 5000;
            s += this.history[mv.from * 64 + mv.to];
            scores[i] = s;
        }
        return scores;
    }

    // Lazy selection sort: pick best move for position i, swap it in place
    pickMove(moves, scores, startIdx) {
        let bestIdx = startIdx;
        let bestScore = scores[startIdx];
        for (let j = startIdx + 1; j < moves.length; j++) {
            if (scores[j] > bestScore) {
                bestScore = scores[j];
                bestIdx = j;
            }
        }
        if (bestIdx !== startIdx) {
            // Swap moves
            const tmpMv = moves[startIdx]; moves[startIdx] = moves[bestIdx]; moves[bestIdx] = tmpMv;
            // Swap scores
            const tmpSc = scores[startIdx]; scores[startIdx] = scores[bestIdx]; scores[bestIdx] = tmpSc;
        }
    }

    // --- Transposition Table (Zobrist-based) ---
    ttKey() {
        // String key for repetition detection history
        return this.hash[0] + '|' + this.hash[1];
    }

    ttIndex() {
        return this.hash[1] & 0xFFFF; // 65536 entries
    }

    ttProbe(depth, alpha, beta) {
        const index = this.ttIndex();
        const entry = this.tt[index];

        if (!entry || entry.hashKey[0] !== this.hash[0] || entry.hashKey[1] !== this.hash[1]) return null;

        // Always return the stored move for ordering, even at insufficient depth
        if (entry.depth < depth) return { score: null, move: entry.move };
        if (entry.flag === TT_EXACT) return { score: entry.score, move: entry.move };
        if (entry.flag === TT_ALPHA && entry.score <= alpha) return { score: alpha, move: entry.move };
        if (entry.flag === TT_BETA && entry.score >= beta) return { score: beta, move: entry.move };
        return { score: null, move: entry.move };
    }

    ttStore(depth, score, flag, move) {
        const index = this.ttIndex();
        const existing = this.tt[index];

        // Replacement strategy:
        // Replace if empty, or if new depth is >= existing depth, 
        // or if we are overwriting a different position (collision) that is shallower (implied by depth check usually, but let's be aggressive)
        // Simple depth-preferred:
        if (!existing || existing.depth <= depth) {
            this.tt[index] = {
                hashKey: [this.hash[0], this.hash[1]],
                depth, score, flag, move
            };
        }
    }

    quiesce(alpha, beta, ply) {
        this.nodes++;
        if (this.nodes % 4096 === 0 && performance.now() - this.startTime > this.timeLimit) {
            this.stopped = true;
            return 0;
        }

        const inChk = this.inCheck(this.side);

        // Capture standPat BEFORE alpha update for delta pruning
        let standPatVal = -MATE_SCORE;
        if (!inChk) {
            standPatVal = this.evaluate();
            if (standPatVal >= beta) return beta;
            if (standPatVal > alpha) alpha = standPatVal;
        }

        const moves = this.generateLegalMoves(!inChk);

        if (inChk && moves.length === 0) return -(MATE_SCORE - ply);

        const scores = this.scoreMoves(moves, ply, null);
        for (let i = 0; i < moves.length; i++) {
            this.pickMove(moves, scores, i);
            const mv = moves[i];
            // Delta pruning: skip captures that can't possibly raise alpha
            if (!inChk && mv.captured !== EMPTY) {
                if (standPatVal + PIECE_VAL[Math.abs(mv.captured)] + 200 < alpha) continue;
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

    negamax(depth, alpha, beta, ply, pvLine, ext) {
        this.nodes++;
        if (this.stopped) return 0;
        if (this.nodes % 4096 === 0 && performance.now() - this.startTime > this.timeLimit) {
            this.stopped = true;
            return 0;
        }

        if (depth <= 0) return this.quiesce(alpha, beta, ply);

        // Check extension — per-path budget (each branch gets its own counter)
        const inChk = this.inCheck(this.side);
        if (inChk && ext < 16) {
            depth++;
            ext++;
        }

        // Draw by 50-move rule
        const drawContempt = this.side === this.rootSide ? -this.contempt : this.contempt;
        if (this.halfmove >= 100) return drawContempt;

        // Draw by 3-fold repetition
        const posKey = this.ttKey();
        let reps = 0;
        for (let i = this.positionHistory.length - 1; i >= 0; i--) {
            if (this.positionHistory[i] === posKey) {
                reps++;
                if (reps >= 2) return drawContempt; // 3rd occurrence = draw
            }
        }

        // Transposition table probe
        let ttMove = null;
        const ttEntry = this.ttProbe(depth, alpha, beta);
        if (ttEntry) {
            ttMove = ttEntry.move;
            if (ttEntry.score !== null) return ttEntry.score;
        }

        const moves = this.generateLegalMoves();
        if (moves.length === 0) {
            return inChk ? -(MATE_SCORE - ply) : 0;
        }

        // Null-move pruning with zugzwang guard: skip in pure K+P endgames
        if (!inChk && depth >= 3 && ply > 0) {
            let hasNonPawnMat = false;
            for (let sq = 0; sq < 64; sq++) {
                const a = this.board[sq];
                if (a !== EMPTY && (a > 0 ? 1 : -1) === this.side) {
                    const at = a > 0 ? a : -a;
                    if (at >= 2 && at <= 5) { hasNonPawnMat = true; break; }
                }
            }
            if (!hasNonPawnMat) { /* skip null-move */ }
            else {
                this.stateStack.push({
                    castling: this.castling, epSquare: this.epSquare,
                    halfmove: this.halfmove, fullmove: this.fullmove,
                    wKingSq: this.wKingSq, bKingSq: this.bKingSq,
                    hash: [this.hash[0], this.hash[1]]
                });
                // Hash updates for null move
                if (this.epSquare >= 0) {
                    const ef = sqFile(this.epSquare) * 2;
                    zobXor(this.hash, [ZOBRIST.epKeys[ef], ZOBRIST.epKeys[ef + 1]]);
                }
                this.epSquare = -1;
                this.side = -this.side;
                zobXor(this.hash, ZOBRIST.sideKey);

                const R = depth >= 6 ? 3 : 2; // Adaptive null-move reduction
                const nullScore = -this.negamax(depth - 1 - R, -beta, -beta + 1, ply + 1, [], ext);

                // Unmake null move
                this.side = -this.side;
                const st = this.stateStack.pop();
                this.castling = st.castling;
                this.epSquare = st.epSquare;
                this.halfmove = st.halfmove;
                this.fullmove = st.fullmove;
                this.wKingSq = st.wKingSq;
                this.bKingSq = st.bKingSq;
                this.hash = st.hash;

                if (this.stopped) return 0;
                if (nullScore >= beta) return beta;
            } // end else (hasNonPawnMat)
        }

        const scores = this.scoreMoves(moves, ply, ttMove);
        const childPv = [];
        let bestMoveInNode = null;
        let origAlpha = alpha;
        let movesSearched = 0;

        for (let i = 0; i < moves.length; i++) {
            this.pickMove(moves, scores, i);
            const mv = moves[i];
            this.makeMove(mv);
            childPv.length = 0;

            let score;
            // Late Move Reductions (LMR) + Principal Variation Search (PVS)
            if (movesSearched === 0) {
                // First move: full window search
                score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, childPv, ext);
            } else {
                // LMR: reduce depth for late, non-tactical moves
                let reduction = 0;
                if (movesSearched >= 3 && depth >= 3 && !inChk
                    && mv.captured === EMPTY && !(mv.flags & FLAG_PROMO)) {
                    reduction = 1;
                    if (movesSearched >= 6) reduction = 2;
                }

                // PVS: narrow window first
                score = -this.negamax(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, childPv, ext);

                // Re-search with full window if it beat alpha
                if (score > alpha && (reduction > 0 || score < beta)) {
                    childPv.length = 0;
                    score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, childPv, ext);
                }
            }

            this.unmakeMove(mv);
            movesSearched++;

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
                this.ttStore(depth, beta, TT_BETA, mv);
                return beta;
            }
            if (score > alpha) {
                alpha = score;
                bestMoveInNode = mv;
                pvLine.length = 0;
                pvLine.push(mv);
                pvLine.push(...childPv);
            }
        }

        // Store in TT
        const flag = alpha > origAlpha ? TT_EXACT : TT_ALPHA;
        this.ttStore(depth, alpha, flag, bestMoveInNode || moves[0]);

        return alpha;
    }

    searchRoot(maxDepth, timeLimitMs) {
        this.nodes = 0;
        this.startTime = performance.now();
        this.timeLimit = timeLimitMs;
        this.stopped = false;
        this.killers = [];
        this.history.fill(0);
        this.rootSide = this.side; // track who the root player is for contempt
        for (let i = 0; i < this.tt.length; i++) this.tt[i] = undefined;

        let bestMove = null;
        let bestScore = 0;
        let bestPv = [];
        let completedDepth = 0;

        for (let d = 1; d <= maxDepth; d++) {
            // Age history table
            if (d > 1) {
                for (let i = 0; i < this.history.length; i++) {
                    this.history[i] >>= 1;
                }
            }

            // Contempt from ROOT player's perspective (bestScore is already root-relative)
            if (d > 1 && completedDepth > 0) {
                if (bestScore > 100) this.contempt = 25;
                else if (bestScore > 50) this.contempt = 15;
                else if (bestScore < -100) this.contempt = -25;
                else if (bestScore < -50) this.contempt = -15;
                else this.contempt = 0;
            }

            const pvLine = [];
            const score = this.negamax(d, -MATE_SCORE - 1, MATE_SCORE + 1, 0, pvLine, 0);

            if (this.stopped && d > 1) break;

            if (pvLine.length > 0) {
                bestMove = pvLine[0];
                bestScore = score;
                bestPv = pvLine.slice();
                completedDepth = d;
            }

            // If we found a mate, no need to search deeper
            const absScore = bestScore > 0 ? bestScore : -bestScore;
            if (absScore > MATE_SCORE - 100) break;
        }

        // Convert score from side-to-move perspective to white's perspective
        const whiteScore = bestScore * this.side;

        return { move: bestMove, score: whiteScore, pv: bestPv, depth: completedDepth, nodes: this.nodes };
    }

    analyze(fen, depth) {
        this.loadFen(fen);

        // Time limit scales with depth — with LMR/PVS we can afford deeper search
        let timeMs = depth * 200;
        if (timeMs > 800) timeMs = 800;
        const searchDepth = depth < 8 ? depth : 8;

        // Reset contempt for fresh analysis
        this.contempt = 0;

        const result = this.searchRoot(searchDepth, timeMs);

        // Dirty play: if we're losing badly, reduce time for future moves
        // (caller can use result.dirtyPlayTimeScale to adjust)
        let dirtyPlayTimeScale = 1.0;
        if (result.score < -500) dirtyPlayTimeScale = 0.4;
        else if (result.score < -200) dirtyPlayTimeScale = 0.6;
        else if (result.score < -100) dirtyPlayTimeScale = 0.8;

        if (!result.move) {
            return { success: false, bestmove: '(none)', evaluation: 0 };
        }

        const uci = this.moveToUci(result.move);
        const pvStr = result.pv.map(m => this.moveToUci(m)).join(' ');

        // Build score object
        let scoreObj;
        const absScore = result.score > 0 ? result.score : -result.score;
        if (absScore > MATE_SCORE - 200) {
            const mateIn = ((MATE_SCORE - absScore + 1) / 2) | 0;
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
            source: 'local',
            dirtyPlayTimeScale
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

    // Single API attempt — fail fast to local engine (was triple retry, wasting up to 9s)
    return await call(`multipv=${MULTIPV}&mode=bestmove`);
}

async function fetchAnalysis(fen, depth, signal) {
    const cached = PositionCache.get(fen);
    if (cached) {
        console.log('GabiBot: 🗃️ Using cached analysis');
        return cached;
    }

    if (signal?.aborted || !BotState.hackEnabled) throw new DOMException('Aborted', 'AbortError');

    // Fire API call (non-blocking — network I/O runs in background)
    const apiPromise = fetchEngineData(fen, depth, signal)
        .then(data => ({ ok: true, data }))
        .catch(err => ({ ok: false, error: err }));

    // Run local engine speculatively while API is in-flight (~200-500ms)
    BotState.statusInfo = '🧠 Analyzing...';
    const localResult = analyzeLocally(fen, depth);

    // Yield to event loop so any already-arrived API response can settle
    const apiSettled = await Promise.race([
        apiPromise,
        new Promise(r => setTimeout(r, 10)).then(() => null)
    ]);

    // If API already returned successfully, prefer it (higher quality)
    if (apiSettled?.ok) {
        console.log('GabiBot: ✅ API beat local engine');
        PositionCache.set(fen, apiSettled.data);
        return apiSettled.data;
    }

    // Use local result immediately, let API update cache in background
    if (localResult.success) {
        PositionCache.set(fen, localResult);
        // Fire-and-forget: API result silently upgrades cache for future lookups
        apiPromise.then(r => {
            if (r.ok) {
                console.log('GabiBot: 📡 API result arrived, cache upgraded');
                PositionCache.set(fen, r.data);
            }
        });
        return localResult;
    }

    // Local failed — wait for API as last resort
    const apiResult = await apiPromise;
    if (apiResult.ok) {
        PositionCache.set(fen, apiResult.data);
        return apiResult.data;
    }
    if (apiResult.error?.name === 'AbortError') throw apiResult.error;
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
// Deterministic Premove Evaluation
// ---------------------------------------------------
// Single engine instance for all premove validation
const premoveEngine = new LocalEngine();

/**
 * Deterministic premove evaluation — no random rolls, no eval-based chance.
 * Simulates the opponent's predicted move, then validates our premove
 * on the resulting board. If safe → execute. If unsafe → block.
 *
 * @param {string} fen - Current board position (opponent's turn to move)
 * @param {string|null} opponentUci - Predicted opponent move from PV
 * @param {string} ourUci - Our premove UCI string
 * @param {string} ourColor - 'w' or 'b'
 * @returns {{ execute: boolean, reasons: string[], blocked: string|null }}
 */
export function evaluatePremove(fen, opponentUci, ourUci, ourColor) {
    if (!ourUci || ourUci.length < 4) {
        return { execute: false, reasons: [], blocked: 'Invalid move' };
    }

    const reasons = [];
    const oppSide = ourColor === 'w' ? -1 : 1;
    const ourSide = -oppSide;

    if (!opponentUci || opponentUci.length < 4) {
        return { execute: false, reasons: [], blocked: 'No predicted opponent move' };
    }

    try {
        premoveEngine.loadFen(fen);
        // Prepare engine for search (required for quiesce to not abort immediately)
        premoveEngine.startTime = performance.now();
        premoveEngine.timeLimit = 100; // ample time for just quiescence
        premoveEngine.stopped = false;
        premoveEngine.nodes = 0;

        // --- Step 1: Simulate opponent's predicted move ---
        const oppFrom = nameToSq(opponentUci.substring(0, 2));
        const oppTo = nameToSq(opponentUci.substring(2, 4));
        const oppMoves = premoveEngine.generateLegalMoves();
        const oppMove = oppMoves.find(m => m.from === oppFrom && m.to === oppTo);
        if (!oppMove) return { execute: false, reasons: [], blocked: 'Opponent move not legal' };

        premoveEngine.makeMove(oppMove);

        // --- Step 2: Validate our move is legal in the post-opponent-move position ---
        const ourLegalMoves = premoveEngine.generateLegalMoves();
        const ourFrom = nameToSq(ourUci.substring(0, 2));
        const ourTo = nameToSq(ourUci.substring(2, 4));
        const ourMove = ourLegalMoves.find(m => m.from === ourFrom && m.to === ourTo);

        if (!ourMove) {
            premoveEngine.unmakeMove(oppMove);
            return { execute: false, reasons: [], blocked: 'Our move illegal after opponent plays' };
        }

        // --- Step 3: Safety checks on POST-MOVE board ---
        const movingAbs = Math.abs(ourMove.piece);
        const capturedAbs = ourMove.captured !== EMPTY ? Math.abs(ourMove.captured) : 0;
        const capturedVal = capturedAbs > 0 ? (PIECE_VAL[capturedAbs] || 0) : 0;
        const movedVal = PIECE_VAL[movingAbs] || 0;

        // 3a: Hanging piece detection (single makeMove pass, explicit side checks)
        if (movingAbs !== 6) {
            premoveEngine.makeMove(ourMove);

            // Check if destination is attacked by opponent
            // Use 'oppSide' explicitly instead of premoveEngine.side for clarity
            const isDestAttacked = premoveEngine.isAttacked(ourTo, oppSide);

            if (isDestAttacked && movingAbs >= 2) {
                const oppReplies = premoveEngine.generateLegalMoves();
                const oppAttacksPost = oppReplies.filter(r => r.to === ourTo);

                // Only worry if there are actual attackers
                if (oppAttacksPost.length > 0 && capturedVal < movedVal) {
                    const pieceNames = { 5: 'queen', 4: 'rook', 3: 'bishop', 2: 'knight' };
                    const pieceName = pieceNames[movingAbs] || 'piece';

                    const savedPiece = premoveEngine.board[ourTo];
                    premoveEngine.board[ourTo] = EMPTY;

                    // FIX: Use explicit 'ourSide' instead of '-premoveEngine.side'
                    // This ensures we are definitely checking if OUR pieces defend the square.
                    const isDefended = premoveEngine.isAttacked(ourTo, ourSide);

                    premoveEngine.board[ourTo] = savedPiece;

                    const lowestAttackerVal = Math.min(...oppAttacksPost.map(r => PIECE_VAL[Math.abs(r.piece)] || 100));

                    // LOGIC: Block if it is undefended OR if the trade is bad (attacker is weaker than us)
                    if (!isDefended || lowestAttackerVal < movedVal) {
                        premoveEngine.unmakeMove(ourMove);
                        premoveEngine.unmakeMove(oppMove);
                        return { execute: false, reasons: [], blocked: `Hangs ${pieceName}` };
                    }
                }
            }
            premoveEngine.unmakeMove(ourMove);
        }

        // 3b: Back-rank mate vulnerability
        premoveEngine.makeMove(ourMove);
        const ourKingSq = premoveEngine.findKingSq(ourSide);
        if (ourKingSq >= 0) {
            const kRank = sqRank(ourKingSq);
            const isBackRank = (ourSide === 1 && kRank === 0) || (ourSide === -1 && kRank === 7);
            if (isBackRank) {
                const shieldRank = kRank + ourSide;
                if (shieldRank >= 0 && shieldRank <= 7) {
                    const kFile = sqFile(ourKingSq);
                    let escapable = false;
                    for (let df = -1; df <= 1; df++) {
                        const sf = kFile + df;
                        if (sf < 0 || sf > 7) continue;
                        const shieldSq = shieldRank * 8 + sf;
                        if (premoveEngine.board[shieldSq] === EMPTY &&
                            !premoveEngine.isAttacked(shieldSq, premoveEngine.side)) {
                            escapable = true;
                            break;
                        }
                    }
                    if (!escapable) {
                        const backRankAttacked = premoveEngine.isAttacked(ourKingSq, premoveEngine.side);
                        if (backRankAttacked) {
                            premoveEngine.unmakeMove(ourMove);
                            premoveEngine.unmakeMove(oppMove);
                            return { execute: false, reasons: [], blocked: 'Back-rank mate threat' };
                        }
                        reasons.push('back-rank weak');
                    }
                }
            }
        }
        premoveEngine.unmakeMove(ourMove);

        // --- Step 4: Quality signals (informational) ---
        if (ourLegalMoves.length === 1) {
            reasons.push('forced');
        } else if (ourLegalMoves.length <= 3) {
            reasons.push('few options');
        }

        if (ourTo === oppTo) {
            reasons.push('recapture');
        }

        premoveEngine.makeMove(ourMove);
        if (premoveEngine.inCheck(premoveEngine.side)) {
            reasons.push('check');
        }
        premoveEngine.unmakeMove(ourMove);

        if (!premoveEngine.isAttacked(ourTo, -premoveEngine.side)) {
            reasons.push('safe sq');
        }

        const centerSquares = [nameToSq('d4'), nameToSq('d5'), nameToSq('e4'), nameToSq('e5')];
        if (centerSquares.includes(ourTo)) {
            reasons.push('center');
        }

        // --- Step 5: Multi-response stability check ---
        premoveEngine.unmakeMove(oppMove);

        // Reset timer so quiesce actually works (prior steps consumed the original budget)
        premoveEngine.startTime = performance.now();
        premoveEngine.timeLimit = 200;
        premoveEngine.stopped = false;
        premoveEngine.nodes = 0;

        const oppScoredMoves = [];
        for (const oMove of oppMoves) {
            premoveEngine.makeMove(oMove);
            const score = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(oMove);
            oppScoredMoves.push({ move: oMove, score });
        }
        oppScoredMoves.sort((a, b) => b.score - a.score);

        // Check top 6 opponent responses (was 3 — too few to catch refutations)
        const topOppMoves = oppScoredMoves
            .filter(m => !(m.move.from === oppFrom && m.move.to === oppTo))
            .slice(0, 6);

        for (const { move: altOppMove } of topOppMoves) {
            premoveEngine.makeMove(altOppMove);
            const altLegal = premoveEngine.generateLegalMoves();
            const altOurMove = altLegal.find(m => m.from === ourFrom && m.to === ourTo);

            // If move is illegal in alternate response (e.g. piece captured or blocked),
            // it's a conditional premove. We just skip this variation (move won't happen).
            if (!altOurMove) {
                premoveEngine.unmakeMove(altOppMove);
                continue;
            }

            // Fresh node counter to avoid mid-variation timeout
            premoveEngine.stopped = false;
            premoveEngine.nodes = 0;

            premoveEngine.makeMove(altOurMove);
            const postScore = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(altOurMove);

            let bestAlt = -Infinity;
            for (const alt of altLegal) {
                if (alt.from === ourFrom && alt.to === ourTo) continue;
                premoveEngine.makeMove(alt);
                const altS = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
                premoveEngine.unmakeMove(alt);
                if (altS > bestAlt) bestAlt = altS;
            }

            premoveEngine.unmakeMove(altOppMove);

            // 150cp threshold (was 200 — catches real blunders without over-blocking in bullet)
            if (bestAlt > -Infinity && (bestAlt - postScore) >= 150) {
                return { execute: false, reasons: ['unstable'], blocked: 'Move suboptimal in alternate opponent response' };
            }
        }

    } catch (e) {
        console.warn('GabiBot: evaluatePremove error:', e);
        return { execute: false, reasons: [], blocked: 'Evaluation error' };
    }

    return { execute: true, reasons, blocked: null };
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
let scheduledMainFen = '';
let scheduledPremoveFen = '';

export function scheduleAnalysis(kind, fen, tickCallback) {
    // Dedup guard: don't re-schedule if already analyzing this exact FEN
    if (kind === 'main' && scheduledMainFen === fen) return;
    if (kind !== 'main' && scheduledPremoveFen === fen) return;

    if (kind === 'main') scheduledMainFen = fen;
    else scheduledPremoveFen = fen;

    // Cancel any in-flight analysis immediately — no waiting in queue
    const analysisId = ++currentAnalysisId;
    if (currentAbortController) {
        currentAbortController.abort('superseded');
        currentAbortController = null;
    }

    const ctrl = new AbortController();
    currentAbortController = ctrl;

    const run = async () => {
        if (analysisId !== currentAnalysisId || !BotState.hackEnabled) {
            return;
        }

        // Invalidate game cache for fresh turn detection
        invalidateGameCache();
        const game = getGame();
        if (!game) { return; }

        if (kind === 'main' && lastFenProcessedMain === fen) { return; }
        if (kind !== 'main' && lastFenProcessedPremove === fen) { return; }

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
                const pvMoves = (best?.pv || '').trim().split(/\s+/).filter(Boolean);
                const opponentUci = (stm !== ourColor && pvMoves.length > 0) ? pvMoves[0] : null;
                const ourUci = getOurMoveFromPV(best?.pv || '', ourColor, stm) ||
                    ((stm === ourColor) ? (best?.uci || null) : null);

                if (!ourUci) {
                    BotState.statusInfo = `Premove unavailable (no PV)${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                // Deterministic premove evaluation — safety + stability in one pass
                const premoveResult = evaluatePremove(fen, opponentUci, ourUci, ourColor);

                if (premoveResult.blocked) {
                    BotState.statusInfo = `🛡️ Premove blocked: ${premoveResult.blocked}${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                if (!premoveResult.execute) {
                    BotState.statusInfo = `Premove skipped${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                // Execute premove immediately — no random roll
                const from = ourUci.substring(0, 2);
                const to = ourUci.substring(2, 4);
                clearArrows();
                drawArrow(from, to, 'rgba(80, 180, 255, 0.7)', 3);
                await simulateClickMove(from, to);
                await sleep(80);

                const reasonSuffix = premoveResult.reasons.length > 0 ? ` [${premoveResult.reasons.join(', ')}]` : '';
                console.log(`GabiBot: ✅ Premove ${ourUci}${reasonSuffix}`);
                BotState.statusInfo = `✅ Premove: ${ourUci}${reasonSuffix}${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                lastFenProcessedPremove = fen;
            }
        } catch (error) {
            if (String(error?.name || error).toLowerCase().includes('abort') ||
                String(error?.message || error).toLowerCase().includes('superseded')) {
                // Silently skip — superseded by newer analysis
            } else {
                console.error('GabiBot Error:', error);
                BotState.statusInfo = '❌ Analysis Error';
                BotState.currentEvaluation = 'Error';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
            }
        } finally {
            // Clear dedup guard so this FEN can be re-scheduled if needed
            if (kind === 'main' && scheduledMainFen === fen) scheduledMainFen = '';
            else if (kind !== 'main' && scheduledPremoveFen === fen) scheduledPremoveFen = '';
            if (currentAbortController === ctrl) currentAbortController = null;
        }
    };
    // Fire directly — no queue chaining. Prior analysis is already aborted above.
    run();
}