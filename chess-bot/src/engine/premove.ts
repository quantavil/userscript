import { LocalEngine } from './local-engine.js';
import {
    EMPTY,
    MATE_SCORE,
    PIECE_VAL,
    FLAG_EP, FLAG_CASTLE, FLAG_PROMO
} from './constants.js';
import {
    sqFile, sqRank, nameToSq
} from './utils.js';
import type { Move } from '../types/chess';

export interface PremoveResult {
    execute: boolean;
    confidence: number;
    reasons: string[];
    blocked: string | null;
}

export interface PremoveChainEntry {
    uci: string;
    oppUci: string;
    confidence: number;
    reasons: string[];
}

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
const premoveEngine = new LocalEngine();

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------

/** Parse promotion char from UCI (5th char) into engine piece code */
function parsePromotion(uci: string): number | null {
    if (!uci || uci.length < 5) return null;
    const map: Record<string, number> = { q: 5, r: 4, b: 3, n: 2 };
    return map[uci[4].toLowerCase()] || null;
}

/** Find a move in a list matching from/to/promotion */
function findMove(moves: Move[], from: number, to: number, promo: number | null): Move | undefined {
    const candidates = moves.filter(m => m.from === from && m.to === to);
    if (candidates.length === 0) return undefined;
    if (!promo || candidates.length === 1) return candidates[0];

    const promoMatch = candidates.find(m => {
        // Safe check for properties since m could have varying types in different contexts
        const mp = (m as any).promotedPiece ?? (m as any).promoted ?? m.promo ?? 0;
        return Math.abs(mp) === promo;
    });
    return promoMatch || candidates[0];
}

/** Reset engine timer for a fresh quiesce budget */
function resetTimer(engine: LocalEngine, ms: number): void {
    engine.startTime = performance.now();
    engine.timeLimit = ms;
    engine.stopped = false;
    engine.nodes = 0;
}

/** Check if a moved piece is safe or if the trade is favorable. */
function checkHanging(engine: LocalEngine, ourMove: Move): { hanging: boolean; reason: string | null } {
    const seeScore = engine.see(ourMove);
    if (seeScore < 0) {
        return { hanging: true, reason: `Unsafe trade (SEE ${seeScore})` };
    }
    return { hanging: false, reason: null };
}

// ---------------------------------------------------
// Main Premove Evaluation
// ---------------------------------------------------

/**
 * Deterministic premove evaluation for bullet chess.
 */
export function evaluatePremove(fen: string, opponentUci: string | null, ourUci: string, ourColor: string): PremoveResult {
    if (!ourUci || ourUci.length < 4) {
        return { execute: false, confidence: 0, reasons: [], blocked: 'Invalid move' };
    }
    if (!opponentUci || opponentUci.length < 4) {
        return { execute: false, confidence: 0, reasons: [], blocked: 'No predicted opponent move' };
    }

    const oppSide = ourColor === 'w' ? -1 : 1;
    const ourSide = -oppSide;
    const reasons: string[] = [];
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

        // 3a: Hanging piece check (BEFORE moving)
        const hangResult = checkHanging(premoveEngine, ourMove);
        if (hangResult.hanging) {
            premoveEngine.unmakeMove(oppMove);
            return { execute: false, confidence: 0, reasons: [], blocked: hangResult.reason };
        }

        premoveEngine.makeMove(ourMove);

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
                        const shieldSq = shieldRank * 16 + sf;
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

        // 3c: Quality signals
        if (premoveEngine.inCheck(oppSide)) {
            reasons.push('check');
            confidence += 0.1;
        }

        if (ourMove.flags & FLAG_PROMO) {
            reasons.push('promotion');
        }
        if (ourMove.flags & FLAG_CASTLE) {
            reasons.push('castling');
            confidence += 0.05;
        }
        if (ourMove.flags & FLAG_EP) {
            reasons.push('en passant');
            confidence -= 0.05;
        }

        premoveEngine.unmakeMove(ourMove);

        // 3d: Positional signals
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

        // --- Step 3e: Main-line quality check ---
        resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsScoring);
        premoveEngine.makeMove(ourMove);
        const mainEval = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
        premoveEngine.unmakeMove(ourMove);

        let mainBestAlt = -Infinity;
        for (const alt of ourLegalMoves) {
            if (alt.from === ourFrom && alt.to === ourTo) continue;
            resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
            premoveEngine.makeMove(alt);
            const altEval = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(alt);
            if (altEval > mainBestAlt) mainBestAlt = altEval;
        }

        const mainIsMate = mainEval > MATE_SCORE - 100;
        if (!mainIsMate && mainBestAlt > -Infinity && (mainBestAlt - mainEval) > PREMOVE_CONFIG.stabilityThreshold) {
            premoveEngine.unmakeMove(oppMove);
            return {
                execute: false, confidence: 0, reasons: ['suboptimal'],
                blocked: 'Move suboptimal against predicted opponent move'
            };
        }

        // --- Step 4: Multi-response stability check ---
        premoveEngine.unmakeMove(oppMove);

        const preSorted = oppMoves
            .filter(m => !(m.from === oppFrom && m.to === oppTo))
            .map(m => ({
                move: m,
                priority: m.captured !== EMPTY ? (PIECE_VAL[Math.abs(m.captured)] || 0) : 0
            }))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, PREMOVE_CONFIG.altMovesToCheck + 4);

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
                premoveEngine.unmakeMove(altOppMove);
                continue;
            }

            resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
            premoveEngine.makeMove(altOurMove);
            const postScore = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(altOurMove);

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

            const postIsMate = postScore > MATE_SCORE - 100;
            if (!postIsMate && bestAlt > -Infinity && (bestAlt - postScore) > PREMOVE_CONFIG.stabilityThreshold) {
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
 */
export function evaluatePremoveChain(fen: string, pv: string, ourColor: string, sideToMove: string): PremoveChainEntry[] {
    if (!pv) return [];
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (moves.length < 2) return [];

    if (sideToMove === ourColor) return [];

    const oppSide = ourColor === 'w' ? -1 : 1;

    const pairs: { oppUci: string; ourUci: string }[] = [];
    for (let i = 0; i + 1 < moves.length; i += 2) {
        pairs.push({ oppUci: moves[i], ourUci: moves[i + 1] });
    }
    if (pairs.length === 0) return [];

    const first = evaluatePremove(fen, pairs[0].oppUci, pairs[0].ourUci, ourColor);
    if (!first.execute) return [];

    const chain: PremoveChainEntry[] = [{
        uci: pairs[0].ourUci,
        oppUci: pairs[0].oppUci,
        confidence: first.confidence,
        reasons: first.reasons
    }];

    if (pairs.length < 2) return chain;

    try {
        premoveEngine.loadFen(fen);

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

        const appliedMoves: Move[] = [m0Opp, m0Our];

        for (let i = 1; i < pairs.length && chain.length < PREMOVE_CONFIG.maxChainDepth; i++) {
            const { oppUci, ourUci } = pairs[i];
            if (!oppUci || !ourUci || oppUci.length < 4 || ourUci.length < 4) break;

            const oFrom = nameToSq(oppUci.substring(0, 2));
            const oTo = nameToSq(oppUci.substring(2, 4));
            const oPromo = parsePromotion(oppUci);
            legalMoves = premoveEngine.generateLegalMoves();
            const oMove = findMove(legalMoves, oFrom, oTo, oPromo);
            if (!oMove) break;

            premoveEngine.makeMove(oMove);
            appliedMoves.push(oMove);

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

            const chainHang = checkHanging(premoveEngine, uMove);
            if (chainHang.hanging) {
                premoveEngine.unmakeMove(oMove);
                appliedMoves.pop();
                break;
            }

            resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
            premoveEngine.makeMove(uMove);
            const chainOurEval = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(uMove);

            let chainBestAlt = -Infinity;
            for (const cAlt of legalMoves) {
                if (cAlt.from === uFrom && cAlt.to === uTo) continue;
                resetTimer(premoveEngine, PREMOVE_CONFIG.quiesceMsPerMove);
                premoveEngine.makeMove(cAlt);
                const cAltEval = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
                premoveEngine.unmakeMove(cAlt);
                if (cAltEval > chainBestAlt) chainBestAlt = cAltEval;
            }

            const chainIsMate = chainOurEval > MATE_SCORE - 100;
            if (!chainIsMate && chainBestAlt > -Infinity && (chainBestAlt - chainOurEval) > PREMOVE_CONFIG.stabilityThreshold) {
                premoveEngine.unmakeMove(oMove);
                appliedMoves.pop();
                break;
            }

            premoveEngine.makeMove(uMove);
            appliedMoves.push(uMove);

            const moveReasons: string[] = [];

            if (premoveEngine.inCheck(oppSide)) {
                moveReasons.push('check');
            }

            if (legalMoves.length === 1) {
                moveReasons.push('forced');
            }

            if (uTo === oTo) {
                moveReasons.push('recapture');
            }

            let moveConfidence = first.confidence - (i * PREMOVE_CONFIG.chainConfidenceDecay);
            if (moveReasons.includes('check')) moveConfidence += 0.1;
            if (moveReasons.includes('forced')) moveConfidence += 0.15;
            if (moveReasons.includes('recapture')) moveConfidence += 0.1;
            moveConfidence = Math.max(0, Math.min(1, moveConfidence));

            if (moveConfidence < PREMOVE_CONFIG.minConfidence) {
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
        }

        premoveEngine.loadFen(fen);

    } catch (e) {
        console.warn('GabiBot: evaluatePremoveChain error:', e);
    }

    return chain;
}

// ---------------------------------------------------
// PV Extraction
// ---------------------------------------------------

/**
 * Extract our move from a PV string.
 */
export function getOurMoveFromPV(pv: string, ourColor: string, sideToMove: string): string | null {
    if (!pv) return null;
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    if (!moves.length) return null;
    return moves[sideToMove === ourColor ? 0 : 1] || null;
}
