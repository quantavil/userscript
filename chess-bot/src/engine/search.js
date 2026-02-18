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

export const SearchMethods = {
    // ---- Evaluation ----
    clearTT() {
        for (let i = 0; i < this.tt.length; i++) {
            this.tt[i] = undefined;
        }
    },

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
        const wkf = wKingSq & 7, wkr = wKingSq >> 4;
        const bkf = bKingSq & 7, bkr = bKingSq >> 4;

        for (let sq = 0; sq < 128; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            const p = bd[sq];
            if (p === EMPTY) continue;

            const side = p > 0 ? 1 : -1;
            const abs = p > 0 ? p : -p;
            const file = sq & 7, rank = sq >> 4;

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

            if (abs === 4) {
                if (rookCount < 4) { rookSquares[rookCount] = sq; rookSides[rookCount] = side; rookCount++; }
            }

            if (abs === 2) {
                let mob = 0;
                for (let i = 0; i < 8; i++) {
                    const t = sq + KNIGHT_OFFSETS[i];
                    if (t & 0x88) continue;
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
                    while (!(t & 0x88)) {
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
                let mob = 0;
                for (let di = 0; di < 4; di++) {
                    const dir = STRAIGHT_DIRS[di];
                    let t = sq + dir;
                    while (!(t & 0x88)) {
                        /* 0x88 handles off-board, no wrap check needed? 
                           Wait, for straight moves, 0x88 logic handles file wrapping for +1/-1 automatically 
                           because file 0->rank-1 and file 7->rank+1 are valid 0x88 indices but behave differently?
                           No, 0x88 board has gap between files.
                           e.g. sq 7 (h1) + 1 = 8 (0x08). 0x08 & 0x88 is true. Off board.
                           So yes, 0x88 handles file wrapping automatically.
                        */
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
                    while (!(t & 0x88)) {
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
            if (!hasFriendlyPawn && !hasEnemyPawn) { mgScore += 20 * side; egScore += 20 * side; }
            else if (!hasFriendlyPawn) { mgScore += 10 * side; egScore += 10 * side; }
        }

        // King safety: pawn shield
        for (let si = 0; si < 2; si++) {
            const side = si === 0 ? 1 : -1;
            const ksq = side === 1 ? wKingSq : bKingSq;
            if (ksq < 0) continue;
            const kf = ksq & 7;
            const kr = ksq >> 4;
            const shieldRank = kr + side;
            if (shieldRank >= 0 && shieldRank <= 7) {
                let shield = 0;
                for (let df = -1; df <= 1; df++) {
                    const sf = kf + df;
                    if (sf < 0 || sf > 7) continue;
                    if (bd[shieldRank * 16 + sf] === side) shield++;
                }
                mgScore += (shield * 15) * side;
            }
        }

        // King attack bonus (Boosted for aggression)
        if (wKingAttackers >= 1) {
            const bonus = wKingAttackWeight * wKingAttackers / 2.5; // Was /4
            mgScore += bonus > 500 ? 500 : bonus;
        }
        if (bKingAttackers >= 1) {
            const bonus = bKingAttackWeight * bKingAttackers / 2.5; // Was /4
            mgScore -= bonus > 500 ? 500 : bonus;
        }

        // --- Aggression: Flank Pawn Storm ---
        // Bonus for advancing pawns on the enemy King's side
        if (bKingSq >= 0) {
            const kf = bKingSq & 7;
            const fMin = kf > 0 ? kf - 1 : 0;
            const fMax = kf < 7 ? kf + 1 : 7;
            for (let f = fMin; f <= fMax; f++) {
                // White pawns advancing towards Black King
                const rank = wPawnRanks[f];
                // Rank 0-7. White starts at 1. Rank 4, 5, 6 are good (indices 3, 4, 5).
                if (rank >= 3 && rank <= 6) {
                    const bonus = (rank - 2) * 20; // +15, +30, +45, +60
                    mgScore += bonus;
                    egScore += bonus / 2;
                }
            }
        }
        if (wKingSq >= 0) {
            const kf = wKingSq & 7;
            const fMin = kf > 0 ? kf - 1 : 0;
            const fMax = kf < 7 ? kf + 1 : 7;
            for (let f = fMin; f <= fMax; f++) {
                // Black pawns advancing towards White King
                const rank = bPawnRanks[f];
                // Black starts at 6. Rank 3, 2, 1 are good.
                if (rank <= 4 && rank >= 1) {
                    const bonus = (5 - rank) * 15; // +15, +30, +45, +60
                    mgScore -= bonus;
                    egScore -= bonus / 2;
                }
            }
        }

        // --- Aggression: Avoid Queen Trades ---
        // Bonus for positions where both sides have queens (more tactical chances)
        if (this.wQueens > 0 && this.bQueens > 0) {
            const tradeAvoidanceBonus = 50;
            const rootSide = this.rootSide ?? this.side; // Fallback to current side
            if (rootSide === 1) {
                mgScore += tradeAvoidanceBonus;
                egScore += tradeAvoidanceBonus;
            } else {
                mgScore -= tradeAvoidanceBonus;
                egScore -= tradeAvoidanceBonus;
            }
        }

        // Tapered eval — phase is tracked incrementally
        const maxPhase = 24;
        const ph = this.phase < maxPhase ? this.phase : maxPhase;
        const score = ((mgScore * ph + egScore * (maxPhase - ph)) / maxPhase + 0.5) | 0;

        return score * this.side;
    },


    see(move) {
        const from = move.from;
        const to = move.to;
        let victim = move.captured ? Math.abs(move.captured) : 0;
        let attacker = move.promo ? Math.abs(move.promo) : Math.abs(move.piece);

        let score = 0;
        if (victim) score += PIECE_VAL[victim];
        if (move.promo) score += PIECE_VAL[attacker] - PIECE_VAL[1];

        const captures = [score];

        // Simulate
        const removed = [];
        const originalFromPiece = this.board[from];
        const originalToPiece = this.board[to];

        this.board[from] = EMPTY;
        this.board[to] = (this.side * (move.promo ? move.promo : move.piece));

        let currentSide = -this.side;
        let currentVictimVal = PIECE_VAL[attacker];

        try {
            let d = 0;
            while (d < 30) {
                const att = this.getSmallestAttacker(to, currentSide);
                if (!att) break;

                d++;
                captures.push(currentVictimVal);
                currentVictimVal = att.value;

                removed.push({ sq: att.sq, p: this.board[att.sq] });
                this.board[att.sq] = EMPTY;

                currentSide = -currentSide;
            }
        } finally {
            this.board[from] = originalFromPiece;
            this.board[to] = originalToPiece;
            for (let i = removed.length - 1; i >= 0; i--) {
                this.board[removed[i].sq] = removed[i].p;
            }
        }

        let val = 0;
        for (let i = captures.length - 1; i >= 1; i--) {
            val = Math.max(0, captures[i] - val);
        }

        return captures[0] - val;
    },

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
            if (this.killers[ply] && this.killers[ply].includes(mv.from * 128 + mv.to)) s += 5000;
            s += this.history[mv.from * 128 + mv.to];
            scores[i] = s;
        }
        return scores;
    },

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
    },

    // --- Transposition Table (Zobrist-based) ---
    ttKey() {
        // String key for repetition detection history
        return this.hash[0] + '|' + this.hash[1];
    },

    ttIndex() {
        return this.hash[1] & 0xFFFF; // 65536 entries
    },

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
    },

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
    },

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

        // Generate moves:
        // If in check, we must generate ALL pseudo-legal moves to find evasions.
        // If not in check, generate only captures.
        const moves = this.generateMoves(inChk ? false : true);

        const scores = this.scoreMoves(moves, ply, null);
        for (let i = 0; i < moves.length; i++) {
            this.pickMove(moves, scores, i);
            const mv = moves[i];

            // Delta pruning: skip captures that can't possibly raise alpha
            // (Only if not in check, as in check we must escape)
            if (!inChk && mv.captured !== EMPTY) {
                if (standPatVal + PIECE_VAL[Math.abs(mv.captured)] + 200 < alpha) continue;
            }

            this.makeMove(mv);

            // Lazy legality check: if we left our king in check, this move is illegal
            if (this.inCheck(-this.side)) {
                this.unmakeMove(mv);
                continue;
            }

            const score = -this.quiesce(-beta, -alpha, ply + 1);
            this.unmakeMove(mv);

            if (this.stopped) return 0;
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    },

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
        const rootSide = this.rootSide ?? this.side;
        const drawContempt = this.side === rootSide ? -this.contempt : this.contempt;
        if (this.halfmove >= 100) return drawContempt;

        // Draw by 3-fold repetition - discourage repetitions more aggressively
        const posKey = this.ttKey();
        let reps = 0;
        for (let i = this.positionHistory.length - 1; i >= 0; i--) {
            if (this.positionHistory[i] === posKey) {
                reps++;
                if (reps >= 2) return drawContempt; // 3rd occurrence = draw
                // Even approaching repetition is slightly bad if we want to win
                if (reps === 1 && this.contempt > 0) {
                    // Soft penalty for getting close to repetition (will be searched further)
                }
            }
        }

        // Transposition table probe
        let ttMove = null;
        const ttEntry = this.ttProbe(depth, alpha, beta);
        if (ttEntry) {
            ttMove = ttEntry.move;
            if (ttEntry.score !== null) return ttEntry.score;
        }

        // Optimizations: Reverse Futility Pruning (RFP) and Razoring
        // Both use static evaluation to prune/reduce search at low depths.
        if (depth <= 3 && !inChk && ply > 0 && Math.abs(beta - alpha) <= 1) {
            const staticEval = this.evaluate();

            // Reverse Futility Pruning
            // If static eval is high enough above beta (fail-high), prune.
            const evalMargin = depth * 120;
            if (staticEval - evalMargin >= beta) {
                return beta;
            }

            // Razoring
            // If static eval is very low (fail-low), drop to qsearch to verify.
            const razorMargin = depth * 350;
            if (staticEval + razorMargin < alpha) {
                const qScore = this.quiesce(alpha, beta, ply + 1);
                if (qScore < alpha) return alpha;
            }
        }

        // Optimization: Generate PSEUDO-legal moves
        // If we are in check, generateMoves() generates all evasions + non-evasions?
        // Actually generateMoves() generates minimal pseudo-legal (sliding pieces don't jump, etc.)
        // But it doesn't check if King is left in check.
        const moves = this.generateMoves(false);

        // If no moves at all (stalemate/mate), check immediately?
        // No, we must filter illegal ones first.

        // Optimization: check validity of ttMove first?
        // We will just process them.

        // Efficient Null-move pruning with zugzwang guard
        if (!inChk && depth >= 2 && ply > 0 && Math.abs(beta - alpha) <= 1) {
            const staticEval = this.evaluate();
            if (staticEval >= beta) {
                const sideMat = this.side === 1 ?
                    (this.wQueens * 900 + this.wRooks * 500 + this.wBishops * 330 + this.wKnights * 320) :
                    (this.bQueens * 900 + this.bRooks * 500 + this.bBishops * 330 + this.bKnights * 320);

                if (sideMat > 0) {
                    this.makeNullMove();
                    const R = depth >= 6 ? 3 : 2;
                    const nullScore = -this.negamax(depth - 1 - R, -beta, -beta + 1, ply + 1, [], ext);
                    this.unmakeNullMove();

                    if (this.stopped) return 0;
                    if (nullScore >= beta) return beta;
                }
            }
        }

        const scores = this.scoreMoves(moves, ply, ttMove);
        const childPv = [];
        let bestMoveInNode = null;
        let origAlpha = alpha;
        let movesSearched = 0;
        let legalMovesCount = 0;

        for (let i = 0; i < moves.length; i++) {
            this.pickMove(moves, scores, i);
            const mv = moves[i];

            this.makeMove(mv);

            // Lazy Legality Check
            if (this.inCheck(-this.side)) {
                this.unmakeMove(mv);
                continue;
            }
            legalMovesCount++;


            childPv.length = 0;

            let score;
            // Principal Variation Search (PVS)
            if (movesSearched === 0) {
                // First move: full window search
                score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, childPv, ext);
            } else {
                // PVS: narrow window first
                score = -this.negamax(depth - 1, -alpha - 1, -alpha, ply + 1, childPv, ext);

                // Re-search with full window if it beat alpha
                if (score > alpha && score < beta) {
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
                    const key = mv.from * 128 + mv.to;
                    if (!this.killers[ply].includes(key)) {
                        this.killers[ply].unshift(key);
                        if (this.killers[ply].length > 2) this.killers[ply].pop();
                    }
                    this.history[mv.from * 128 + mv.to] += depth * depth;
                }
                this.ttStore(depth, beta, TT_BETA, mv);
                return beta;
            }

            // History Penalty for quiet moves that fail low
            if (score <= origAlpha) {
                if (mv.captured === EMPTY && !(mv.flags & FLAG_PROMO)) {
                    this.history[mv.from * 128 + mv.to] -= depth * depth;
                }
            }

            if (score > alpha) {
                alpha = score;
                bestMoveInNode = mv;
                pvLine.length = 0;
                pvLine.push(mv);
                pvLine.push(...childPv);
            }
        }

        // If no legal moves, check for mate or stalemate
        if (legalMovesCount === 0) {
            return inChk ? -(MATE_SCORE - ply) : 0;
        }

        // Store in TT
        const flag = alpha > origAlpha ? TT_EXACT : TT_ALPHA;
        this.ttStore(depth, alpha, flag, bestMoveInNode || moves[0]);

        return alpha;
    },

    searchRoot(maxDepth, timeLimitMs) {
        this.nodes = 0;
        this.startTime = performance.now();
        this.timeLimit = timeLimitMs;
        this.stopped = false;
        this.killers = [];
        this.history.fill(0);
        this.rootSide = this.side; // track who the root player is for contempt

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

            // Contempt: positive = avoid draws, negative = accept draws
            // Bot should fight for wins unless clearly losing
            if (d > 1 && completedDepth > 0) {
                if (bestScore > 200) this.contempt = 60;       // Winning big - push hard
                else if (bestScore > 100) this.contempt = 45;  // Winning - avoid draws
                else if (bestScore > 50) this.contempt = 35;   // Slight edge - keep fighting
                else if (bestScore > -100) this.contempt = 25; // Equal/slight disadvantage - still fight
                else if (bestScore > -250) this.contempt = 10; // Losing - try but accept good draws
                else this.contempt = -15;                       // Losing badly - draw is okay
            } else {
                this.contempt = 25; // Default: fight for wins
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
    },

    analyze(fen, depth, timeLimit) {
        this.loadFen(fen);

        // Clear TT if analyzing as different side than before
        if (this.rootSide !== this.side) {
            this.clearTT();
        }

        // Use passed depth and time limit directly
        const timeMs = timeLimit || 1000;
        const searchDepth = depth || 12;

        // Reset contempt for fresh analysis
        this.contempt = 25; // Default: prefer winning over drawing

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
};
