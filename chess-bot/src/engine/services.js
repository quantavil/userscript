import { API_URL, MULTIPV, ANALYZE_TIMEOUT_MS } from '../config.js';
import { BotState, PositionCache, getGame, getPlayerColor, getSideToMove, pa, invalidateGameCache } from '../state.js';
import { scoreFrom, scoreToDisplay, scoreNumeric, getRandomDepth, sleep } from '../utils.js';
import { drawArrow, clearArrows, executeMove, simulateClickMove } from '../board.js';
import {
    EMPTY,
    MATE_SCORE,
    PIECE_VAL,
    sqFile, sqRank, nameToSq
} from './data.js';
import { LocalEngine } from './core.js';

let currentAnalysisId = 0;
let currentAbortController = null;

let lastFenProcessedMain = '';
let lastFenProcessedPremove = '';

export function getLastFenProcessedMain() { return lastFenProcessedMain; }
export function setLastFenProcessedMain(fen) { lastFenProcessedMain = fen; }
export function getLastFenProcessedPremove() { return lastFenProcessedPremove; }
export function setLastFenProcessedPremove(fen) { lastFenProcessedPremove = fen; }


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
