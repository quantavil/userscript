import { LocalEngine } from './local-engine.js';
import { EMPTY, MATE_SCORE, PIECE_VAL } from './constants.js';
import { sqFile, sqRank, nameToSq } from './utils.js';

const premoveEngine = new LocalEngine();
const CENTER_SQ = ['d4', 'd5', 'e4', 'e5'].map(nameToSq);


export function parseUci(uci) {
    if (!uci || uci.length < 4) return null;
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promo = uci.length >= 5 ? uci[4] : null;

    if (!/^[a-h][1-8]$/.test(from)) return null;
    if (!/^[a-h][1-8]$/.test(to)) return null;

    const fromSq = nameToSq(from);
    const toSq = nameToSq(to);
    return { from, to, fromSq, toSq, promo };
}

// ═══════════════════════════════════════════════════
// Premove Lock — prevents cascading re-premoves
// (CORE FIX for the "premoves twice" bug)
//
// Flow:
//   lockPremove()  → set before calling performPremove
//   unlockPremove(cooldownMs) → called in finally, adds cooldown
//   markFenHandled(fen) → remembers positions we already premoved
//   isPremoveLocked() → scheduler checks before scheduling premove
//   isFenHandled(fen) → scheduler checks to avoid re-premove
// ═══════════════════════════════════════════════════

let _premoveLock = false;
let _premoveCooldownEnd = 0;
const _handledFens = new Set();
const MAX_HANDLED = 50;

export function isPremoveLocked() {
    return _premoveLock || performance.now() < _premoveCooldownEnd;
}

export function lockPremove() {
    _premoveLock = true;
}

export function unlockPremove(cooldownMs = 400) {
    _premoveLock = false;
    _premoveCooldownEnd = performance.now() + cooldownMs;
}

export function markFenHandled(fen) {
    _handledFens.add(fen);
    // FIFO eviction to prevent memory leak
    if (_handledFens.size > MAX_HANDLED) {
        _handledFens.delete(_handledFens.values().next().value);
    }
}

export function isFenHandled(fen) {
    return _handledFens.has(fen);
}

export function clearHandledFens() {
    _handledFens.clear();
}

export function resetPremoveState() {
    _premoveLock = false;
    _premoveCooldownEnd = 0;
    _handledFens.clear();
}

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

function resetTimer(ms = 200) {
    premoveEngine.startTime = performance.now();
    premoveEngine.timeLimit = ms;
    premoveEngine.stopped = false;
    premoveEngine.nodes = 0;
}

function findMove(from, to, moves) {
    return moves.find(m => m.from === from && m.to === to) || null;
}

function buildMoveMap(moves) {
    const map = new Map();
    for (const mv of moves) map.set((mv.from << 6) | mv.to, mv);
    return map;
}

function findMoveFromMap(from, to, map) {
    return map.get((from << 6) | to) ?? null;
}

function val(absType) { return PIECE_VAL[absType] || 0; }

function pieceAbs(move, sq) {
    return move.piece
        ? Math.abs(move.piece)
        : Math.abs(premoveEngine.board[sq || move.from]);
}


function oppHasHeavyPiece(oppSide) {
    for (let sq = 0; sq < 64; sq++) {
        const p = premoveEngine.board[sq];
        if (p === EMPTY) continue;
        const abs = Math.abs(p);
        const sign = p > 0 ? 1 : -1;
        if (sign === oppSide && (abs === 4 || abs === 5)) return true; // R or Q
    }
    return false;
}

// ═══════════════════════════════════════════════════
// Tactical Detectors (called AFTER makeMove)
// ═══════════════════════════════════════════════════

function detectHanging(move, ourSide, oppSide) {
    const abs = pieceAbs(move, move.from);
    if (abs <= 1 || abs === 6) return null;

    const { to } = move;
    if (!premoveEngine.isAttacked(to, oppSide)) return null;

    const capAbs =
        move.captured != null && move.captured !== EMPTY
            ? Math.abs(move.captured)
            : 0;
    if (val(capAbs) >= val(abs)) return null;

    const attackers = premoveEngine.generateLegalMoves().filter(r => r.to === to);
    if (!attackers.length) return null;

    const saved = premoveEngine.board[to];
    premoveEngine.board[to] = EMPTY;
    const defended = premoveEngine.isAttacked(to, ourSide);
    premoveEngine.board[to] = saved;

    const cheapest = Math.min(...attackers.map(r => val(pieceAbs(r, r.from))));
    if (!defended || cheapest < val(abs)) return 'Hangs piece';
    return null;
}

function detectBackRank(ourSide) {
    const kSq = premoveEngine.findKingSq(ourSide);
    if (kSq < 0) return null;

    const oppSide = -ourSide;
    if (!oppHasHeavyPiece(oppSide)) return null;

    const rank = sqRank(kSq);
    const isBack = (ourSide === 1 && rank === 0) || (ourSide === -1 && rank === 7);
    if (!isBack) return null;

    const sRank = rank + ourSide;
    if (sRank < 0 || sRank > 7) return null;

    const kFile = sqFile(kSq);
    for (let d = -1; d <= 1; d++) {
        const f = kFile + d;
        if (f < 0 || f > 7) continue;
        const sq = sRank * 8 + f;
        if (
            premoveEngine.board[sq] === EMPTY &&
            !premoveEngine.isAttacked(sq, premoveEngine.side)
        )
            return null;
    }

    return premoveEngine.isAttacked(kSq, premoveEngine.side)
        ? 'Back-rank mate threat'
        : null;
}

// ═══════════════════════════════════════════════════
// Phantom Capture Detection (called BEFORE opponent move)
// ═══════════════════════════════════════════════════

function detectPhantomCapture(ourFrom, ourTo, ourSide, oppSide, preOppLegal) {
    const targetPiece = premoveEngine.board[ourTo];
    if (targetPiece === EMPTY) return null;

    const targetSign = targetPiece > 0 ? 1 : -1;
    if (targetSign !== oppSide) return null;

    const ourPiece = premoveEngine.board[ourFrom];
    if (ourPiece === EMPTY) return null;
    const ourAbs = Math.abs(ourPiece);

    // Pawn pushes (same file) aren't captures
    if (ourAbs === 1 && sqFile(ourFrom) === sqFile(ourTo)) return null;

    // Can the target piece escape?
    const escapes = preOppLegal.filter(m => m.from === ourTo);
    if (escapes.length === 0) return null;

    let simPiece = ourPiece;
    if (ourAbs === 1 && (sqRank(ourTo) === 0 || sqRank(ourTo) === 7)) {
        simPiece = 5 * ourSide; // queen with correct sign
    }

    const savedTarget = premoveEngine.board[ourTo];
    const savedOur = premoveEngine.board[ourFrom];
    premoveEngine.board[ourTo] = simPiece;
    premoveEngine.board[ourFrom] = EMPTY;

    const attacked = premoveEngine.isAttacked(ourTo, oppSide);
    let hanging = false;
    if (attacked) {
        const tmp = premoveEngine.board[ourTo];
        premoveEngine.board[ourTo] = EMPTY;
        const defended = premoveEngine.isAttacked(ourTo, ourSide);
        premoveEngine.board[ourTo] = tmp;
        if (!defended) hanging = true;
    }

    premoveEngine.board[ourFrom] = savedOur;
    premoveEngine.board[ourTo] = savedTarget;

    return hanging ? 'Target piece can escape, piece would hang' : null;
}

// ═══════════════════════════════════════════════════
// Safety Validation
// ═══════════════════════════════════════════════════

function validateSafety(ourFrom, ourTo, ourSide, oppSide, oppToSq) {
    const reasons = [];
    const legal = premoveEngine.generateLegalMoves();
    const move = findMove(ourFrom, ourTo, legal);

    if (!move) {
        return { safe: false, reasons: [], blocked: 'Move illegal after opponent plays', move: null };
    }

    premoveEngine.makeMove(move);

    const hangBlock = detectHanging(move, ourSide, oppSide);
    if (hangBlock) {
        premoveEngine.unmakeMove(move);
        return { safe: false, reasons: [], blocked: hangBlock, move };
    }

    const brBlock = detectBackRank(ourSide);
    if (brBlock) {
        premoveEngine.unmakeMove(move);
        return { safe: false, reasons: [], blocked: brBlock, move };
    }

    if (premoveEngine.inCheck && premoveEngine.inCheck(premoveEngine.side))
        reasons.push('check');

    premoveEngine.unmakeMove(move);

    if (legal.length === 1) reasons.push('forced');
    if (oppToSq >= 0 && ourTo === oppToSq) reasons.push('recapture');
    if (!premoveEngine.isAttacked(ourTo, oppSide)) reasons.push('safe sq');
    if (CENTER_SQ.includes(ourTo)) reasons.push('center');

    return { safe: true, reasons, blocked: null, move };
}

// ═══════════════════════════════════════════════════
// Stability Check
// ═══════════════════════════════════════════════════

function checkStability(oppMoves, oppFrom, oppTo, ourFrom, ourTo) {
    // Score every opponent reply with an evenly-split budget
    const perScoreBudget = Math.max(10, Math.floor(200 / oppMoves.length));

    const scored = oppMoves
        .map(m => {
            resetTimer(perScoreBudget);                           // FIX #2
            premoveEngine.makeMove(m);
            const s = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(m);
            return { m, s };
        })
        .sort((a, b) => b.s - a.s);

    const alts = scored
        .filter(({ m }) => !(m.from === oppFrom && m.to === oppTo))
        .slice(0, 6);

    for (const { m: alt } of alts) {
        premoveEngine.makeMove(alt);

        const legal = premoveEngine.generateLegalMoves();
        const moveMap = buildMoveMap(legal);                      // FIX #5
        const ourMove = findMoveFromMap(ourFrom, ourTo, moveMap);

        if (!ourMove) {
            premoveEngine.unmakeMove(alt);
            continue;
        }

        resetTimer(30);                                           // FIX #2

        premoveEngine.makeMove(ourMove);
        const postScore = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
        premoveEngine.unmakeMove(ourMove);

        const perAltBudget = Math.max(8, Math.floor(80 / legal.length));
        let bestAlt = -Infinity;
        for (const a of legal) {
            if (a.from === ourFrom && a.to === ourTo) continue;
            resetTimer(perAltBudget);                             // FIX #2
            premoveEngine.makeMove(a);
            const s = -premoveEngine.quiesce(-MATE_SCORE, MATE_SCORE, 0);
            premoveEngine.unmakeMove(a);
            if (s > bestAlt) bestAlt = s;
        }

        premoveEngine.unmakeMove(alt);

        if (bestAlt > -Infinity && bestAlt - postScore >= 150) {
            return 'Move suboptimal in alternate opponent response';
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════

export function getOurMoveFromPV(pv, ourColor, sideToMove) {
    if (!pv) return null;
    const moves = pv.trim().split(/\s+/).filter(Boolean);
    const idx = sideToMove === ourColor ? 0 : 1;
    return moves[idx] || null;
}

export function evaluatePremoveChain(fen, opponentUcis, ourUcis, ourColor) {
    const results = [];
    const oppSide = ourColor === 'w' ? -1 : 1;
    const ourSide = -oppSide;
    const stack = [];

    if (!ourUcis.length || !opponentUcis.length) return { premoves: [] };

    // FIX #6 — suppress premoves near 50-move draw
    const halfmove = parseInt((fen.split(' ')[4]) || '0', 10);
    if (halfmove >= 90) return { premoves: [] };

    try {
        premoveEngine.loadFen(fen);

        const count = Math.min(ourUcis.length, opponentUcis.length, 2);

        for (let i = 0; i < count; i++) {
            const oUci = opponentUcis[i];
            const pUci = ourUcis[i];

            if (!oUci || oUci.length < 4 || !pUci || pUci.length < 4) {
                results.push({
                    uci: pUci || '',
                    execute: false,
                    reasons: [],
                    blocked:
                        i === 0
                            ? 'No predicted opponent move'
                            : 'Incomplete PV for double premove',
                });
                break;
            }

            const oSq = parseUci(oUci);                          // FIX #1, #4
            const pSq = parseUci(pUci);
            if (!oSq || !pSq) {
                results.push({ uci: pUci, execute: false, reasons: [], blocked: 'Invalid move format' });
                break;
            }

            // Phantom capture check BEFORE opponent moves
            const preOppLegal = premoveEngine.generateLegalMoves();
            const phantomBlock = detectPhantomCapture(
                pSq.fromSq, pSq.toSq, ourSide, oppSide, preOppLegal
            );
            if (phantomBlock) {
                results.push({ uci: pUci, execute: false, reasons: [], blocked: phantomBlock });
                break;
            }

            // Simulate opponent move
            const oppMove = findMove(oSq.fromSq, oSq.toSq, preOppLegal);
            if (!oppMove) {
                results.push({ uci: pUci, execute: false, reasons: [], blocked: 'Opponent move not legal' });
                break;
            }

            premoveEngine.makeMove(oppMove);
            stack.push(oppMove);

            // Safety validation
            const v = validateSafety(pSq.fromSq, pSq.toSq, ourSide, oppSide, oSq.toSq);
            if (!v.safe) {
                results.push({ uci: pUci, execute: false, reasons: v.reasons, blocked: v.blocked });
                break;
            }

            // Stability (first premove only)
            if (i === 0) {
                premoveEngine.unmakeMove(oppMove);
                stack.pop();

                const unstable = checkStability(
                    preOppLegal, oSq.fromSq, oSq.toSq, pSq.fromSq, pSq.toSq
                );

                premoveEngine.makeMove(oppMove);
                stack.push(oppMove);

                if (unstable) {
                    results.push({ uci: pUci, execute: false, reasons: ['unstable'], blocked: unstable });
                    break;
                }
            }

            results.push({ uci: pUci, execute: true, reasons: v.reasons, blocked: null });

            // Advance board for next premove
            premoveEngine.makeMove(v.move);
            stack.push(v.move);
        }
    } catch (e) {
        console.warn('evaluatePremoveChain error:', e);
        if (!results.length || results[results.length - 1].execute) {
            results.push({
                uci: ourUcis[results.length] || '',
                execute: false,
                reasons: [],
                blocked: 'Evaluation error',
            });
        }
    } finally {
        while (stack.length) premoveEngine.unmakeMove(stack.pop());
    }

    return { premoves: results };
}

export function evaluatePremove(fen, opponentUci, ourUci, ourColor) {
    const { premoves } = evaluatePremoveChain(
        fen,
        opponentUci ? [opponentUci] : [],
        ourUci ? [ourUci] : [],
        ourColor
    );
    return premoves[0] || { execute: false, reasons: [], blocked: 'No premove data' };
}

export function evaluateDoublePremove(fen, opponentUci, ourUci, opponentNextUci, ourNextUci, ourColor) {
    const { premoves } = evaluatePremoveChain(
        fen,
        [opponentUci, opponentNextUci].filter(Boolean),
        [ourUci, ourNextUci].filter(Boolean),
        ourColor
    );
    const second = premoves[1];
    if (!second) {
        const first = premoves[0];
        return { execute: false, blocked: first?.blocked || 'Sequence failed' };
    }
    return { execute: second.execute, blocked: second.blocked };
}