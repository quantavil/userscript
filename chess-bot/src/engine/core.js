import {
    ZOBRIST,
    WP, WN, WB, WR, WQ, WK,
    BP, BN, BB, BR, BQ, BK,
    EMPTY,
    FLAG_NONE, FLAG_EP, FLAG_CASTLE, FLAG_PROMO,
    MATE_SCORE,
    KNIGHT_OFFSETS, STRAIGHT_DIRS, DIAG_DIRS, ALL_DIRS,
    PHASE_VAL, ATTACK_WEIGHT,
    TT_EXACT, TT_ALPHA, TT_BETA, TT_SIZE,
    PST_PAWN_MG, PST_KNIGHT_MG, PST_BISHOP_MG, PST_ROOK_MG, PST_QUEEN_MG, PST_KING_MG,
    PST_PAWN_EG, PST_KNIGHT_EG, PST_BISHOP_EG, PST_ROOK_EG, PST_QUEEN_EG, PST_KING_EG,
    PST_MG, PST_EG,
    MAT_MG, MAT_EG,
    PIECE_VAL,
    mirrorSq, sqFile, sqRank, sqName, nameToSq,
    zobPieceIdx, zobPieceKey, zobXor
} from './data.js';

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
