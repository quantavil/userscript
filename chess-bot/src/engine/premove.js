import { LocalEngine } from './local-engine.js';
import {
    EMPTY,
    MATE_SCORE,
    PIECE_VAL
} from './constants.js';
import {
    sqFile, sqRank, nameToSq
} from './utils.js';

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

export function getOurMoveFromPV(pv, ourColor, sideToMove) {
    if (!pv) return null;
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (!moves.length) return null;
    return moves[sideToMove === ourColor ? 0 : 1] || null;
}
