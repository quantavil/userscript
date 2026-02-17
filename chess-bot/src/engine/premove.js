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
// Bullet-tuned configuration
// ---------------------------------------------------
const PREMOVE_CONFIG = {
    stabilityThreshold: 150,   // cp — block if alt is this much better
    minConfidence: 0.45,       // minimum confidence to execute
    altMovesToCheck: 5,        // top opponent alternatives to test
    quiesceMsPerMove: 40,     // ms budget per quiesce call
    quiesceMsScoring: 80,     // ms budget for scoring all opp moves
    maxChainDepth: 3,          // max premoves to queue
    chainConfidenceDecay: 0.12 // confidence penalty per chain depth
};

// Single engine instance — safe because JS is single-threaded
// and scheduleAnalysis aborts prior work before starting new
const premoveEngine = new LocalEngine();

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------

/** Parse promotion char from UCI (5th char) into engine piece code */
function parsePromotion(uci) {
    if (!uci || uci.length < 5) return null;
    const map = { q: 5, r: 4, b: 3, n: 2 };
    return map[uci[4].toLowerCase()] || null;
}

/** Find a move in a list matching from/to/promotion */
/** Find a move in a list matching from/to/promotion (robust field detection) */
function findMove(moves, from, to, promo) {
    const candidates = moves.filter(m => m.from === from && m.to === to);
    if (candidates.length === 0) return undefined;
    if (!promo || candidates.length === 1) return candidates[0];

    // Try matching promotion across common engine field names
    const promoMatch = candidates.find(m => {
        const mp = m.promotedPiece ?? m.promoted ?? m.promo ?? 0;
        return Math.abs(mp) === promo;
    });
    // Fallback: first candidate (engine typically generates queen first)
    return promoMatch || candidates[0];
}

/** Reset engine timer for a fresh quiesce budget */
function resetTimer(engine, ms) {
    engine.startTime = performance.now();
    engine.timeLimit = ms;
    engine.stopped = false;
    engine.nodes = 0;
}

/**
 * Check if a moved piece is hanging after the move.
 * Must be called AFTER makeMove(ourMove).
 * Returns { hanging: boolean, reason: string|null }
 */
function checkHanging(engine, ourMove, ourSide, oppSide) {
    const movingAbs = Math.abs(ourMove.piece);
    const capturedAbs = ourMove.captured !== EMPTY ? Math.abs(ourMove.captured) : 0;
    const capturedVal = capturedAbs > 0 ? (PIECE_VAL[capturedAbs] || 0) : 0;

    // For promotions, evaluate the promoted piece value, not the pawn
    let effectiveAbs = movingAbs;
    const promo = ourMove.promotedPiece || ourMove.promo || 0;
    if (promo !== 0) {
        effectiveAbs = Math.abs(promo);
    }
    const movedVal = PIECE_VAL[effectiveAbs] || 0;

    // Skip king moves (handled by legality)
    if (effectiveAbs === 6) return { hanging: false, reason: null };
    // Skip low-value pieces
    if (effectiveAbs < 2) return { hanging: false, reason: null };

    const isDestAttacked = engine.isAttacked(ourMove.to, oppSide);
    if (!isDestAttacked) return { hanging: false, reason: null };

    // Only worry if we're not winning material already
    if (capturedVal >= movedVal) return { hanging: false, reason: null };

    // Check if destination is defended by us
    const savedPiece = engine.board[ourMove.to];
    engine.board[ourMove.to] = EMPTY;
    const isDefended = engine.isAttacked(ourMove.to, ourSide);
    engine.board[ourMove.to] = savedPiece;

    // Generate opponent replies to find lowest-value attacker
    const oppReplies = engine.generateLegalMoves();
    const attackers = oppReplies.filter(r => r.to === ourMove.to);

    if (attackers.length === 0) return { hanging: false, reason: null };

    const lowestAttackerVal = Math.min(
        ...attackers.map(r => PIECE_VAL[Math.abs(r.piece)] || 100)
    );

    // Block if undefended OR if trade is losing (attacker worth less than us)
    if (!isDefended || lowestAttackerVal < movedVal) {
        const names = { 5: 'queen', 4: 'rook', 3: 'bishop', 2: 'knight' };
        return { hanging: true, reason: `Hangs ${names[effectiveAbs] || 'piece'}` };
    }

    return { hanging: false, reason: null };
}

// ---------------------------------------------------
// Main Premove Evaluation
// ---------------------------------------------------

/**
 * Deterministic premove evaluation for bullet chess.
 * Simulates opponent's predicted move, validates our premove,
 * checks safety and stability across alternate opponent responses.
 *
 * @param {string} fen - Current board position (opponent's turn)
 * @param {string|null} opponentUci - Predicted opponent move from PV
 * @param {string} ourUci - Our premove UCI string
 * @param {string} ourColor - 'w' or 'b'
 * @returns {{ execute: boolean, confidence: number, reasons: string[], blocked: string|null }}
 */
export function evaluatePremove(fen, opponentUci, ourUci, ourColor) {
    if (!ourUci || ourUci.length < 4) {
        return { execute: false, confidence: 0, reasons: [], blocked: 'Invalid move' };
    }
    if (!opponentUci || opponentUci.length < 4) {
        return { execute: false, confidence: 0, reasons: [], blocked: 'No predicted opponent move' };
    }

    const oppSide = ourColor === 'w' ? -1 : 1;
    const ourSide = -oppSide;
    const reasons = [];
    let confidence = 0.7; // base

    try {
        premoveEngine.loadFen(fen);
        resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsScoring);

        // --- Step 1: Simulate opponent's predicted move ---
        const oppFrom = nameToSq(opponentUci.substring(0, 2));
        const oppTo = nameToSq(opponentUci.substring(2, 4));
        const oppPromo = parsePromotion(opponentUci);
        const oppMoves = premoveEngine.generateLegalMoves();
        const oppMove = findMove(oppMoves, oppFrom, oppTo, oppPromo);

        if (!oppMove) {
            return { execute: false, confidence: 0, reasons: [], blocked: 'Opponent move not legal' };
        }

        premoveEngine.makeMove(oppMove);

        // --- Step 2: Validate our move is legal after opponent plays ---
        const ourLegalMoves = premoveEngine.generateLegalMoves();
        const ourFrom = nameToSq(ourUci.substring(0, 2));
        const ourTo = nameToSq(ourUci.substring(2, 4));
        const ourPromo = parsePromotion(ourUci);
        const ourMove = findMove(ourLegalMoves, ourFrom, ourTo, ourPromo);

        if (!ourMove) {
            premoveEngine.unmakeMove(oppMove);
            return { execute: false, confidence: 0, reasons: [], blocked: 'Our move illegal after opponent plays' };
        }

        // --- Step 3: Single post-move safety pass ---
        premoveEngine.makeMove(ourMove);

        // 3a: Hanging piece check
        const hangResult = checkHanging(premoveEngine, ourMove, ourSide, oppSide);
        if (hangResult.hanging) {
            premoveEngine.unmakeMove(ourMove);
            premoveEngine.unmakeMove(oppMove);
            return { execute: false, confidence: 0, reasons: [], blocked: hangResult.reason };
        }

        // 3b: Back-rank weakness detection
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
                            !premoveEngine.isAttacked(shieldSq, oppSide)) {
                            escapable = true;
                            break;
                        }
                    }
                    if (!escapable) {
                        if (premoveEngine.isAttacked(ourKingSq, oppSide)) {
                            premoveEngine.unmakeMove(ourMove);
                            premoveEngine.unmakeMove(oppMove);
                            return { execute: false, confidence: 0, reasons: [], blocked: 'Back-rank mate threat' };
                        }
                        reasons.push('back-rank weak');
                        confidence -= 0.1;
                    }
                }
            }
        }

        // 3c: Quality signals (all in one pass while move is made)

        // Check
        if (premoveEngine.inCheck(oppSide)) {
            reasons.push('check');
            confidence += 0.1;
        }

        // Special move flags
        // Special move flags
        if (ourMove.promotedPiece || ourMove.promo) {
            reasons.push('promotion');
        }
        if (ourMove.castling) {
            reasons.push('castling');
            confidence += 0.05;
        }
        if (ourMove.enPassant) {
            reasons.push('en passant');
            confidence -= 0.05; // EP is highly conditional
        }

        premoveEngine.unmakeMove(ourMove);
        // (still in post-opponent-move position)

        // 3d: Positional signals (pre-our-move position)
        if (ourLegalMoves.length === 1) {
            reasons.push('forced');
            confidence += 0.2;
        } else if (ourLegalMoves.length <= 3) {
            reasons.push('few options');
            confidence += 0.05;
        }

        if (ourTo === oppTo) {
            reasons.push('recapture');
            confidence += 0.1;
        }

        if (!premoveEngine.isAttacked(ourTo, oppSide)) {
            reasons.push('safe sq');
            confidence += 0.05;
        }

        const centerSquares = [nameToSq('d4'), nameToSq('d5'), nameToSq('e4'), nameToSq('e5')];
        if (centerSquares.includes(ourTo)) {
            reasons.push('center');
        }

        // --- Step 4: Multi-response stability check ---
        premoveEngine.unmakeMove(oppMove);
        // (back to original position)

        // Pre-sort opponent moves by capture value (cheap heuristic) then quiesce top N
        const preSorted = oppMoves
            .filter(m => !(m.from === oppFrom && m.to === oppTo))
            .map(m => ({
                move: m,
                priority: m.captured !== EMPTY ? (PIECE_VAL[Math.abs(m.captured)] || 0) : 0
            }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, PREMOVE_CONFIG.altMovesToCheck + 4); // score a few extra

        // Score candidates with quiesce
        const scored = [];
        for (const { move: oMove } of preSorted) {
            resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
            premoveEngine.makeMove(oMove);
            const score = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(oMove);
            scored.push({ move: oMove, score });
        }
        scored.sort((a, b) => b.score - a.score);

        const topAlts = scored.slice(0, PREMOVE_CONFIG.altMovesToCheck);

        for (const { move: altOppMove } of topAlts) {
            premoveEngine.makeMove(altOppMove);
            const altLegal = premoveEngine.generateLegalMoves();
            const altOurMove = findMove(altLegal, ourFrom, ourTo, ourPromo);

            if (!altOurMove) {
                // Our move is illegal in this variation — conditional premove, skip
                premoveEngine.unmakeMove(altOppMove);
                continue;
            }

            resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
            premoveEngine.makeMove(altOurMove);
            const postScore = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(altOurMove);

            // Find best alternative move for us
            let bestAlt = -Infinity;
            for (const alt of altLegal) {
                if (alt.from === ourFrom && alt.to === ourTo) continue;
                resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
                premoveEngine.makeMove(alt);
                const altS = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
                premoveEngine.unmakeMove(alt);
                if (altS > bestAlt) bestAlt = altS;
            }

            premoveEngine.unmakeMove(altOppMove);

            if (bestAlt > -Infinity && (bestAlt - postScore) > PREMOVE_CONFIG.stabilityThreshold) {
                return {
                    execute: false,
                    confidence: 0,
                    reasons: ['unstable'],
                    blocked: 'Move suboptimal in alternate opponent response'
                };
            }
        }

    } catch (e) {
        console.warn('GabiBot: evaluatePremove error:', e);
        return { execute: false, confidence: 0, reasons: [], blocked: 'Evaluation error' };
    }

    confidence = Math.max(0, Math.min(1, confidence));
    const execute = confidence >= PREMOVE_CONFIG.minConfidence;
    return { execute, confidence, reasons, blocked: execute ? null : 'Low confidence' };
}

// ---------------------------------------------------
// Multi-Premove Chain Builder
// ---------------------------------------------------

/**
 * Build a chain of premoves from the PV.
 * First move uses full evaluatePremove. Subsequent moves use lighter checks.
 *
 * @param {string} fen - Current position (opponent's turn)
 * @param {string} pv - Full principal variation string
 * @param {string} ourColor - 'w' or 'b'
 * @param {string} sideToMove - whose turn it is in the FEN
 * @returns {Array<{ uci: string, oppUci: string, confidence: number, reasons: string[] }>}
 */
export function evaluatePremoveChain(fen, pv, ourColor, sideToMove) {
    if (!pv) return [];
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (moves.length < 2) return [];

    // If it's our turn, no premoves apply
    if (sideToMove === ourColor) return [];

    const oppSide = ourColor === 'w' ? -1 : 1;
    const ourSide = -oppSide;

    // Extract (opponent, ours) pairs from PV
    // PV starts with opponent's move since it's their turn
    const pairs = [];
    for (let i = 0; i + 1 < moves.length; i += 2) {
        pairs.push({ oppUci: moves[i], ourUci: moves[i + 1] });
    }
    if (pairs.length === 0) return [];

    // First move: full evaluation
    const first = evaluatePremove(fen, pairs[0].oppUci, pairs[0].ourUci, ourColor);
    if (!first.execute) return [];

    const chain = [{
        uci: pairs[0].ourUci,
        oppUci: pairs[0].oppUci,
        confidence: first.confidence,
        reasons: first.reasons
    }];

    if (pairs.length < 2) return chain;

    // Subsequent moves: lighter validation using engine directly
    try {
        premoveEngine.loadFen(fen);

        // Apply the first pair to advance position
        const m0OppFrom = nameToSq(pairs[0].oppUci.substring(0, 2));
        const m0OppTo = nameToSq(pairs[0].oppUci.substring(2, 4));
        const m0OppPromo = parsePromotion(pairs[0].oppUci);
        let legalMoves = premoveEngine.generateLegalMoves();
        const m0Opp = findMove(legalMoves, m0OppFrom, m0OppTo, m0OppPromo);
        if (!m0Opp) return chain;
        premoveEngine.makeMove(m0Opp);

        const m0OurFrom = nameToSq(pairs[0].ourUci.substring(0, 2));
        const m0OurTo = nameToSq(pairs[0].ourUci.substring(2, 4));
        const m0OurPromo = parsePromotion(pairs[0].ourUci);
        legalMoves = premoveEngine.generateLegalMoves();
        const m0Our = findMove(legalMoves, m0OurFrom, m0OurTo, m0OurPromo);
        if (!m0Our) {
            premoveEngine.unmakeMove(m0Opp);
            return chain;
        }
        premoveEngine.makeMove(m0Our);

        const appliedMoves = [m0Opp, m0Our]; // track for cleanup

        for (let i = 1; i < pairs.length && chain.length < PREMOVE_CONFIG.maxChainDepth; i++) {
            const { oppUci, ourUci } = pairs[i];
            if (!oppUci || !ourUci || oppUci.length < 4 || ourUci.length < 4) break;

            // Validate opponent move
            const oFrom = nameToSq(oppUci.substring(0, 2));
            const oTo = nameToSq(oppUci.substring(2, 4));
            const oPromo = parsePromotion(oppUci);
            legalMoves = premoveEngine.generateLegalMoves();
            const oMove = findMove(legalMoves, oFrom, oTo, oPromo);
            if (!oMove) break;

            premoveEngine.makeMove(oMove);
            appliedMoves.push(oMove);

            // Validate our move
            const uFrom = nameToSq(ourUci.substring(0, 2));
            const uTo = nameToSq(ourUci.substring(2, 4));
            const uPromo = parsePromotion(ourUci);
            legalMoves = premoveEngine.generateLegalMoves();
            const uMove = findMove(legalMoves, uFrom, uTo, uPromo);
            if (!uMove) {
                premoveEngine.unmakeMove(oMove);
                appliedMoves.pop();
                break;
            }

            // Light safety: hanging check only
            premoveEngine.makeMove(uMove);
            appliedMoves.push(uMove);

            const hangResult = checkHanging(premoveEngine, uMove, ourSide, oppSide);
            if (hangResult.hanging) {
                // Unwind and stop chain
                for (let j = appliedMoves.length - 1; j >= 0; j--) {
                    premoveEngine.unmakeMove(appliedMoves[j]);
                }
                break;
            }

            const moveReasons = [];

            // Check detection
            if (premoveEngine.inCheck(oppSide)) {
                moveReasons.push('check');
            }

            // Forced
            if (legalMoves.length === 1) {
                moveReasons.push('forced');
            }

            // Recapture
            if (uTo === oTo) {
                moveReasons.push('recapture');
            }

            let moveConfidence = first.confidence - (i * PREMOVE_CONFIG.chainConfidenceDecay);
            if (moveReasons.includes('check')) moveConfidence += 0.1;
            if (moveReasons.includes('forced')) moveConfidence += 0.15;
            if (moveReasons.includes('recapture')) moveConfidence += 0.1;
            moveConfidence = Math.max(0, Math.min(1, moveConfidence));

            if (moveConfidence < PREMOVE_CONFIG.minConfidence) {
                // Confidence too low, stop chain
                // (don't break yet — need to leave applied moves for cleanup)
                // Actually we break below after unwinding
                for (let j = appliedMoves.length - 1; j >= 0; j--) {
                    premoveEngine.unmakeMove(appliedMoves[j]);
                }
                break;
            }

            chain.push({
                uci: ourUci,
                oppUci: oppUci,
                confidence: moveConfidence,
                reasons: moveReasons
            });

            // Position already advanced (both moves applied), continue to next pair
        }

        // Clean up remaining applied moves
        // Check if we exited the loop normally (all moves still on stack)
        // vs early break (already cleaned up)
        // Simple approach: loadFen again to reset
        premoveEngine.loadFen(fen); // guaranteed clean state

    } catch (e) {
        console.warn('GabiBot: evaluatePremoveChain error:', e);
        // Return whatever we have so far
    }

    return chain;
}

// ---------------------------------------------------
// PV Extraction
// ---------------------------------------------------

/**
 * Extract our move from a PV string.
 * @param {string} pv - principal variation
 * @param {string} ourColor - 'w' or 'b'
 * @param {string} sideToMove - whose turn in current position
 * @returns {string|null} our UCI move
 */
export function getOurMoveFromPV(pv, ourColor, sideToMove) {
    if (!pv) return null;
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (!moves.length) return null;
    return moves[sideToMove === ourColor ? 0 : 1] || null;
}