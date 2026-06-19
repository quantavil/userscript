import {
    WP, WN, WB, WR, WQ, WK,
    BP, BN, BB, BR, BQ, BK,
    EMPTY,
    FLAG_NONE, FLAG_EP, FLAG_CASTLE, FLAG_PROMO,
    MATE_SCORE,
    KNIGHT_OFFSETS, STRAIGHT_DIRS, DIAG_DIRS, ALL_DIRS,
    PHASE_VAL, ATTACK_WEIGHT,
    TT_EXACT, TT_ALPHA, TT_BETA, TT_SIZE,
    PIECE_VAL
} from './constants.js';
import {
    PST_PAWN_MG, PST_KNIGHT_MG, PST_BISHOP_MG, PST_ROOK_MG, PST_QUEEN_MG, PST_KING_MG,
    PST_PAWN_EG, PST_KNIGHT_EG, PST_BISHOP_EG, PST_ROOK_EG, PST_QUEEN_EG, PST_KING_EG,
    PST_MG, PST_EG,
    MAT_MG, MAT_EG
} from './pst.js';
import {
    ZOBRIST,
    zobPieceIdx, zobPieceKey, zobXor
} from './zobrist.js';
import {
    mirrorSq, sqFile, sqRank, sqName, nameToSq
} from './utils.js';
import { SearchMethods } from './search.js';

export class LocalEngine {
    constructor() {
        this.board = new Int8Array(128).fill(EMPTY);
        this.side = 1;     // 1=white, -1=black
        this.castling = 0; // bits: 1=wK, 2=wQ, 4=bK, 8=bQ
        this.epSquare = -1;
        this.halfmove = 0;
        this.fullmove = 1;
        this.wKingSq = 4;   // e1
        this.bKingSq = 116; // e8 (0x74)
        this.stateStack = [];
        this.nodes = 0;
        this.timeLimit = 0;
        this.startTime = 0;
        this.stopped = false;
        this.pvTable = [];
        this.killers = [];
        this.history = new Int32Array(16384); // 128 * 128 for 0x88 move indexing
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
        this.wKnights = 0;
        this.bKnights = 0;
        this.wRooks = 0;
        this.bRooks = 0;
        this.wQueens = 0;
        this.bQueens = 0;
    }

    _packPieceCounts() {
        // wQ:4, bQ:4, wR:4, bR:4, wB:4, bB:4, wN:4, bN:4 = 32 bits
        return (this.wQueens) | (this.bQueens << 4) |
            (this.wRooks << 8) | (this.bRooks << 12) |
            (this.wBishops << 16) | (this.bBishops << 20) |
            (this.wKnights << 24) | (this.bKnights << 28);
    }

    _unpackPieceCounts(packed) {
        this.wQueens = packed & 0xF;
        this.bQueens = (packed >> 4) & 0xF;
        this.wRooks = (packed >> 8) & 0xF;
        this.bRooks = (packed >> 12) & 0xF;
        this.wBishops = (packed >> 16) & 0xF;
        this.bBishops = (packed >> 20) & 0xF;
        this.wKnights = (packed >> 24) & 0xF;
        this.bKnights = (packed >> 28) & 0xF;
    }

    makeNullMove() {
        this.stateStack.push({
            castling: this.castling, epSquare: this.epSquare,
            halfmove: this.halfmove, fullmove: this.fullmove,
            wKingSq: this.wKingSq, bKingSq: this.bKingSq,
            hash: [this.hash[0], this.hash[1]],
            mgPstMat: this.mgPstMat, egPstMat: this.egPstMat,
            phase: this.phase,
            pieceCounts: this._packPieceCounts()
        });

        if (this.epSquare >= 0) {
            const ef = sqFile(this.epSquare) * 2;
            zobXor(this.hash, [ZOBRIST.epKeys[ef], ZOBRIST.epKeys[ef + 1]]);
        }
        this.epSquare = -1;
        this.side = -this.side;
        zobXor(this.hash, ZOBRIST.sideKey);
        this.halfmove++;
        if (this.side === -1) this.fullmove++; // Null move increases fullmove? Technically yes.
    }

    unmakeNullMove() {
        this.side = -this.side;
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
        this._unpackPieceCounts(st.pieceCounts);
    }

    reset() {
        this.history.fill(0);
        this.killers = [];
        this.tt = new Array(TT_SIZE); // Clear TT
        this.positionHistory = [];
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
                    const sq = r * 16 + f;
                    this.board[sq] = piece;
                    if (piece === WK) this.wKingSq = sq;
                    else if (piece === BK) this.bKingSq = sq;
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
        this.wKnights = 0;
        this.bKnights = 0;
        this.wRooks = 0;
        this.bRooks = 0;
        this.wQueens = 0;
        this.bQueens = 0;

        for (let sq = 0; sq < 128; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            const p = this.board[sq];
            if (p === EMPTY) continue;
            this._addPieceScore(p, sq);
        }
    }

    _addPieceScore(p, sq) {
        const side = p > 0 ? 1 : -1;
        const abs = p > 0 ? p : -p;
        const pstSq = side === 1 ? sq : (sq ^ 0x70);

        this.mgPstMat += (MAT_MG[abs] + PST_MG[abs][pstSq]) * side;
        this.egPstMat += (MAT_EG[abs] + PST_EG[abs][pstSq]) * side;

        if (abs >= 2 && abs <= 5) this.phase += PHASE_VAL[abs];
        if (abs === 2) { if (side === 1) this.wKnights++; else this.bKnights++; }
        if (abs === 3) { if (side === 1) this.wBishops++; else this.bBishops++; }
        if (abs === 4) { if (side === 1) this.wRooks++; else this.bRooks++; }
        if (abs === 5) { if (side === 1) this.wQueens++; else this.bQueens++; }
    }

    _removePieceScore(p, sq) {
        const side = p > 0 ? 1 : -1;
        const abs = p > 0 ? p : -p;
        const pstSq = side === 1 ? sq : (sq ^ 0x70);

        this.mgPstMat -= (MAT_MG[abs] + PST_MG[abs][pstSq]) * side;
        this.egPstMat -= (MAT_EG[abs] + PST_EG[abs][pstSq]) * side;

        if (abs >= 2 && abs <= 5) this.phase -= PHASE_VAL[abs];
        if (abs === 2) { if (side === 1) this.wKnights--; else this.bKnights--; }
        if (abs === 3) { if (side === 1) this.wBishops--; else this.bBishops--; }
        if (abs === 4) { if (side === 1) this.wRooks--; else this.bRooks--; }
        if (abs === 5) { if (side === 1) this.wQueens--; else this.bQueens--; }
    }


    _computeHash() {
        this.hash = [0, 0];
        for (let sq = 0; sq < 128; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
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
                const p = this.board[r * 16 + f];
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
            pieceCounts: this._packPieceCounts()
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
            const epCapSq = to - this.side * 16;
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
        if (abs === 1 && Math.abs(to - from) === 32) {
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
        if (from === 112 || to === 112) this.castling &= ~8;
        if (from === 119 || to === 119) this.castling &= ~4;

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
        this._unpackPieceCounts(st.pieceCounts);

        const { from, to, flags, piece, captured, promo } = mv;

        this.board[from] = piece;
        this.board[to] = (flags & FLAG_EP) ? EMPTY : captured;

        if (flags & FLAG_EP) {
            this.board[to - this.side * 16] = -this.side; // restore captured pawn
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
        // Pawn attacks
        const pawnDir = bySide === 1 ? 1 : -1;
        const attackSourceRank = (sq >> 4) - pawnDir;
        if (attackSourceRank >= 0 && attackSourceRank <= 7) {
            const sourceSqBase = sq - pawnDir * 16;
            // Check right diagonal capture source
            const s1 = sourceSqBase - 1;
            if (!(s1 & 0x88) && this.board[s1] === bySide) return true;
            // Check left diagonal capture source
            const s2 = sourceSqBase + 1;
            if (!(s2 & 0x88) && this.board[s2] === bySide) return true;
        }

        // Knight attacks
        const kn = bySide * WN;
        for (let i = 0; i < 8; i++) {
            const t = sq - KNIGHT_OFFSETS[i]; // Reverse offset to find attacker? 
            // Actually constants are symmetric, so + or - is same set.
            // But usually we check "if knight is at T, does it attack SQ?"
            // Yes, same offsets.
            if (t & 0x88) continue;
            if (this.board[t] === kn) return true;
        }

        // King attacks
        const kg = bySide * WK;
        // ALL_DIRS includes diagonals and straights (8 directions)
        for (let i = 0; i < 8; i++) {
            const t = sq + ALL_DIRS[i]; // King offsets are same as directory steps (adjacent)
            if (t & 0x88) continue;
            if (this.board[t] === kg) return true;
        }

        // Sliding: rook/queen on ranks and files
        const sideR = bySide * WR, sideQ = bySide * WQ, sideB = bySide * WB;



        for (let i = 0; i < 4; i++) {
            const dir = STRAIGHT_DIRS[i];
            let t = sq + dir;
            while (!(t & 0x88)) {
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
            while (!(t & 0x88)) {
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

        for (let sq = 0; sq < 128; sq++) {
            if (sq & 0x88) { sq += 7; continue; }

            const p = bd[sq];
            if (p === EMPTY || (p > 0 ? 1 : -1) !== s) continue;
            const abs = p > 0 ? p : -p;
            // No need for file/rank vars mostly

            if (abs === 1) { // Pawn
                const dir = s; // 1 or -1
                // White promos at rank 7 (0x70), Black at rank 0 (0x00)
                const promoRank = s === 1 ? 7 : 0;
                const startRank = s === 1 ? 1 : 6;
                const fwd = sq + dir * 16;

                if (!(fwd & 0x88) && bd[fwd] === EMPTY) {
                    if ((fwd >> 4) === promoRank) {
                        for (const pr of [WQ, WR, WB, WN]) moves.push(this.createMove(sq, fwd, FLAG_PROMO, s * pr));
                    } else if (!capturesOnly) {
                        moves.push(this.createMove(sq, fwd));
                        const fwd2 = fwd + dir * 16;
                        if ((sq >> 4) === startRank && !(fwd2 & 0x88) && bd[fwd2] === EMPTY) {
                            moves.push(this.createMove(sq, fwd2));
                        }
                    }
                }

                // Captures: +/- 15, +/- 17
                // White (up): +16. Diags: +15, +17.
                // Black (down): -16. Diags: -15, -17.
                // Logic: sq + dir*16 + 1, sq + dir*16 - 1
                const captureOffsets = [dir * 16 - 1, dir * 16 + 1];
                for (const offset of captureOffsets) {
                    const csq = sq + offset;
                    if (csq & 0x88) continue;

                    const cp = bd[csq];
                    if (cp !== EMPTY && (cp > 0 ? 1 : -1) === opp) {
                        if ((csq >> 4) === promoRank) {
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
                    if (t & 0x88) continue;
                    const tp = bd[t];
                    if (tp !== EMPTY && (tp > 0 ? 1 : -1) === s) continue;
                    if (capturesOnly && tp === EMPTY) continue;
                    moves.push(this.createMove(sq, t));
                }
            } else if (abs === 6) { // King
                // King uses ALL_DIRS (neighbors)
                // Offset checks same as sliding but single step
                for (let i = 0; i < 8; i++) {
                    const t = sq + ALL_DIRS[i];
                    if (t & 0x88) continue;
                    const tp = bd[t];
                    if (tp !== EMPTY && (tp > 0 ? 1 : -1) === s) continue;
                    if (capturesOnly && tp === EMPTY) continue;
                    moves.push(this.createMove(sq, t));
                }

                if (!capturesOnly && !this.inCheck(s)) {
                    if (s === 1) { // White (Rank 0 -> 0x00-0x07)
                        // K at 4 (e1). Castling targets: g1 (6), c1 (2).
                        // Squares to check empty: f1(5), g1(6) | b1(1), c1(2), d1(3).
                        if ((this.castling & 1) && sq === 4 && bd[5] === EMPTY && bd[6] === EMPTY
                            && !this.isAttacked(5, -1) && !this.isAttacked(6, -1)) {
                            moves.push(this.createMove(4, 6, FLAG_CASTLE)); // e1->g1
                        }
                        if ((this.castling & 2) && sq === 4 && bd[3] === EMPTY && bd[2] === EMPTY && bd[1] === EMPTY
                            && !this.isAttacked(3, -1) && !this.isAttacked(2, -1)) {
                            moves.push(this.createMove(4, 2, FLAG_CASTLE)); // e1->c1
                        }
                    } else { // Black (Rank 7 -> 0x70-0x77)
                        // K at 116 (e8). Targets: g8 (118), c8 (114).
                        // Empty: f8(117), g8(118) | b8(113), c8(114), d8(115).
                        if ((this.castling & 4) && sq === 116 && bd[117] === EMPTY && bd[118] === EMPTY
                            && !this.isAttacked(117, 1) && !this.isAttacked(118, 1)) {
                            moves.push(this.createMove(116, 118, FLAG_CASTLE));
                        }
                        if ((this.castling & 8) && sq === 116 && bd[115] === EMPTY && bd[114] === EMPTY && bd[113] === EMPTY
                            && !this.isAttacked(115, 1) && !this.isAttacked(114, 1)) {
                            moves.push(this.createMove(116, 114, FLAG_CASTLE));
                        }
                    }
                }
            } else {
                // Sliding pieces: B=3, R=4, Q=5
                const dirs = abs === 3 ? DIAG_DIRS : abs === 4 ? STRAIGHT_DIRS : ALL_DIRS;
                for (let di = 0; di < dirs.length; di++) {
                    const dir = dirs[di];
                    let t = sq + dir;
                    while (!(t & 0x88)) {
                        const tp = bd[t];
                        if (tp !== EMPTY && (tp > 0 ? 1 : -1) === s) break; // block by friendly
                        if (!capturesOnly || tp !== EMPTY) moves.push(this.createMove(sq, t));
                        if (tp !== EMPTY) break; // block by capture
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

    getSmallestAttacker(sq, bySide) {
        // Pawn attacks
        const pawnDir = bySide === 1 ? 1 : -1;
        const attackSourceRank = (sq >> 4) - pawnDir;
        if (attackSourceRank >= 0 && attackSourceRank <= 7) {
            const sourceSqBase = sq - pawnDir * 16;
            // Check capture sources
            for (const offset of [-1, 1]) {
                const s = sourceSqBase + offset;
                if (!(s & 0x88) && this.board[s] === bySide) { // Pawn = 1
                    return { piece: bySide, sq: s, value: PIECE_VAL[1] };
                }
            }
        }

        // Knight attacks
        const kn = bySide * WN;
        for (let i = 0; i < 8; i++) {
            const t = sq + KNIGHT_OFFSETS[i];
            if (t & 0x88) continue;
            if (this.board[t] === kn) return { piece: kn, sq: t, value: PIECE_VAL[2] };
        }

        // Bishop/Queen
        const sideB = bySide * WB;
        const sideQ = bySide * WQ;
        for (let i = 0; i < 4; i++) {
            const dir = DIAG_DIRS[i];
            let t = sq + dir;
            while (!(t & 0x88)) {
                const p = this.board[t];
                if (p !== EMPTY) {
                    if (p === sideB || p === sideQ) {
                        return { piece: p, sq: t, value: PIECE_VAL[Math.abs(p)] };
                    }
                    break;
                }
                t += dir;
            }
        }

        // Rook/Queen
        const sideR = bySide * WR;
        for (let i = 0; i < 4; i++) {
            const dir = STRAIGHT_DIRS[i];
            let t = sq + dir;
            while (!(t & 0x88)) {
                const p = this.board[t];
                if (p !== EMPTY) {
                    if (p === sideR || p === sideQ) {
                        return { piece: p, sq: t, value: PIECE_VAL[Math.abs(p)] };
                    }
                    break;
                }
                t += dir;
            }
        }

        // King
        const kg = bySide * WK;
        for (let i = 0; i < 8; i++) {
            const t = sq + ALL_DIRS[i];
            if (t & 0x88) continue;
            if (this.board[t] === kg) return { piece: kg, sq: t, value: PIECE_VAL[6] };
        }

        return null;
    }
}

// Apply Search Mixin
Object.assign(LocalEngine.prototype, SearchMethods);
