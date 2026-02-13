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

async function fetchEngineData(fen, depth, signal) {
    const startTime = performance.now();
    console.log(`GabiBot: 📡 API request STARTED for FEN: ${fen.substring(0, 20)}... | Depth: ${depth}`);

    const call = async (params) => {
        const url = `${API_URL}?fen=${encodeURIComponent(fen)}&depth=${depth}&${params}`;

        return new Promise((resolve, reject) => {
            const abortHandler = () => {
                reject(new DOMException('Aborted', 'AbortError'));
            };

            if (signal?.aborted) {
                return reject(new DOMException('Aborted', 'AbortError'));
            }

            signal?.addEventListener('abort', abortHandler, { once: true });

            const timeoutId = setTimeout(() => {
                signal?.removeEventListener('abort', abortHandler);
                reject(new Error('timeout'));
            }, ANALYZE_TIMEOUT_MS);

            // Use GM_xmlhttpRequest if available, otherwise fallback to fetch (dev mode)
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                const req = GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: { 'Accept': 'application/json' },
                    onload: (response) => {
                        clearTimeout(timeoutId);
                        signal?.removeEventListener('abort', abortHandler);

                        const endTime = performance.now();
                        const duration = endTime - startTime;

                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const data = JSON.parse(response.responseText);
                                if (data.success === false) {
                                    console.warn(`GabiBot: ❌ API success=false after ${duration.toFixed(0)}ms`);
                                    reject(new Error('API success=false'));
                                } else {
                                    console.log(`GabiBot: ✅ API success in ${duration.toFixed(0)}ms | FEN: ${fen.substring(0, 20)}...`);
                                    resolve(data);
                                }
                            } catch (e) {
                                reject(new Error('Invalid JSON response'));
                            }
                        } else {
                            console.warn(`GabiBot: ❌ API failed (${response.status}) after ${duration.toFixed(0)}ms`);
                            reject(new Error(`API error ${response.status}`));
                        }
                    },
                    onerror: (err) => {
                        clearTimeout(timeoutId);
                        signal?.removeEventListener('abort', abortHandler);
                        reject(new Error('Network error'));
                    },
                    ontimeout: () => {
                        clearTimeout(timeoutId);
                        signal?.removeEventListener('abort', abortHandler);
                        reject(new Error('timeout'));
                    }
                });

                // Handle abort for GM_xmlhttpRequest
                if (signal) {
                    signal.addEventListener('abort', () => {
                        req.abort();
                    }, { once: true });
                }
            } else {
                // Fallback for non-userscript environment
                fetch(url, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    signal: signal
                })
                    .then(async res => {
                        const endTime = performance.now();
                        const duration = endTime - startTime;
                        if (!res.ok) {
                            console.warn(`GabiBot: ❌ API failed (${res.status}) after ${duration.toFixed(0)}ms`);
                            throw new Error(`API error ${res.status}`);
                        }
                        const data = await res.json();
                        if (data.success === false) {
                            console.warn(`GabiBot: ❌ API success=false after ${duration.toFixed(0)}ms`);
                            throw new Error('API success=false');
                        }
                        console.log(`GabiBot: ✅ API success in ${duration.toFixed(0)}ms | FEN: ${fen.substring(0, 20)}...`);
                        resolve(data);
                    })
                    .catch(err => {
                        clearTimeout(timeoutId);
                        signal?.removeEventListener('abort', abortHandler);
                        reject(err);
                    })
                    .finally(() => {
                        clearTimeout(timeoutId);
                    });
            }
        });
    };
    try { return await call(`multipv=${MULTIPV}&mode=analysis`); }
    catch {
        try { return await call(`multipv=${MULTIPV}&mode=bestmove`); }
        catch { return await call('mode=bestmove'); }
    }
}

async function fetchEngineDataWithRetry(fen, depth, signal, maxRetries = 1) {
    if (PositionCache[fen]) {
        console.log('GabiBot: 🗃️ Using cached analysis');
        return PositionCache[fen];
    }

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal?.aborted || !BotState.hackEnabled) {
            console.log('GabiBot: ⏹️ Analysis aborted before attempt', attempt + 1);
            throw new DOMException('Aborted', 'AbortError');
        }

        if (attempt > 0) {
            const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`GabiBot: 🔁 Retry attempt #${attempt} for FEN: ${fen.substring(0, 20)}... (backoff: ${backoff}ms)`);
            await sleep(backoff);
        }

        try {
            const data = await fetchEngineData(fen, depth, signal);
            PositionCache[fen] = data;
            if (attempt > 0) {
                console.log(`GabiBot: 🎯 Retry succeeded on attempt #${attempt + 1}`);
            }
            return data;
        } catch (error) {
            lastError = error;
            console.warn(`GabiBot: ⚠️ Attempt #${attempt + 1} failed:`, error.message || error);
            if (attempt >= maxRetries) break;
        }
    }
    console.error(`GabiBot: 💥 All ${maxRetries + 1} attempts failed for FEN: ${fen.substring(0, 20)}...`);
    throw lastError;
}

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
    if (!fen || !uci || uci.length < 4) {
        return { safe: false, reason: 'Invalid move', riskLevel: 100 };
    }

    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const oppColor = ourColor === 'w' ? 'b' : 'w';

    const movingCh = fenCharAtSquare(fen, from);
    const movingPiece = pieceFromFenChar(movingCh);

    if (!movingPiece || movingPiece.color !== ourColor) {
        return { safe: false, reason: 'Not our piece', riskLevel: 100 };
    }

    const destCh = fenCharAtSquare(fen, to);
    const destPiece = pieceFromFenChar(destCh);

    let riskLevel = 0;
    const reasons = [];

    // Check 1: King safety (critical)
    if (movingPiece.type === 'k') {
        if (isSquareAttackedBy(fen, to, oppColor)) {
            return { safe: false, reason: 'King moves into check', riskLevel: 100 };
        }
    } else {
        const newFen = makeSimpleMove(fen, from, to);
        const kingPos = findKing(newFen, ourColor);
        if (kingPos && isSquareAttackedBy(newFen, kingPos, oppColor)) {
            return { safe: false, reason: 'Exposes king to check', riskLevel: 100 };
        }
    }

    // Check 2: Don't hang the queen
    if (movingPiece.type === 'q') {
        const attackers = getAttackersOfSquare(fen, to, oppColor);
        if (attackers.length > 0) {
            const hasDefender = getAttackersOfSquare(fen, to, ourColor).length > 1;
            if (!hasDefender || !destPiece) {
                return { safe: false, reason: 'Hangs queen', riskLevel: 90 };
            }
        }
    }

    // Check 3: Don't hang rook for nothing
    if (movingPiece.type === 'r') {
        const attackers = getAttackersOfSquare(fen, to, oppColor);
        if (attackers.length > 0) {
            const captureValue = destPiece ? PIECE_VALUES[destPiece.type] : 0;
            if (captureValue < PIECE_VALUES.r) {
                const hasDefender = getAttackersOfSquare(fen, to, ourColor).length > 1;
                if (!hasDefender) {
                    reasons.push('Hangs rook');
                    riskLevel += 60;
                }
            }
        }
    }

    // Check 4: Destination square safety
    const destAttackers = getAttackersOfSquare(fen, to, oppColor);
    if (destAttackers.length > 0 && !destPiece) {
        const defenders = getAttackersOfSquare(fen, to, ourColor).length;
        if (defenders === 0) {
            reasons.push('Moves to undefended attacked square');
            riskLevel += 30;
        } else if (destAttackers.length > defenders) {
            reasons.push('Moves to heavily attacked square');
            riskLevel += 20;
        }
    }

    // Check 5: Unfavorable trades
    if (destPiece && destPiece.color === oppColor) {
        const ourValue = PIECE_VALUES[movingPiece.type];
        const theirValue = PIECE_VALUES[destPiece.type];
        const destAttackers = getAttackersOfSquare(fen, to, oppColor);

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
    const fromCh = fenCharAtSquare(fen, from);
    const toCh = fenCharAtSquare(fen, to);
    const fromPiece = pieceFromFenChar(fromCh);
    const toPiece = pieceFromFenChar(toCh);

    if (!fromPiece || fromPiece.color !== ourColor) return false;

    if (BotState.premoveMode === 'every') return true;

    if (BotState.premoveMode === 'capture') {
        return !!(toPiece && toPiece.color !== ourColor) || isEnPassantCapture(fen, from, to, ourColor);
    }

    if (BotState.premoveMode === 'filter') {
        return !!BotState.premovePieces[fromPiece.type];
    }

    return false;
}

export function getEvalBasedPremoveChance(evaluation, ourColor) {
    if (!BotState.premoveEnabled) return 0;

    let evalScore = 0;
    if (typeof evaluation === 'string') {
        if (evaluation === '-' || evaluation === 'Error') return 0;

        if (evaluation.includes('M')) {
            const mateNum = parseInt(evaluation.replace('M', '').replace('+', ''), 10);
            if (!isNaN(mateNum)) {
                const ourMate = ourColor === 'w' ? mateNum : -mateNum;
                return ourMate > 0 ? 100 : 20;
            }
        }
        evalScore = parseFloat(evaluation);
    } else {
        evalScore = parseFloat(evaluation);
    }

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
    const idx = (sideToMove === ourColor) ? 0 : 1;
    return moves[idx] || null;
}

// ---------------------------------------------------
// Analysis Schedule
// ---------------------------------------------------
export function scheduleAnalysis(kind, fen, tickCallback) {
    const analysisId = ++currentAnalysisId;
    analysisQueue = analysisQueue.then(async () => {
        if (analysisId !== currentAnalysisId) return;
        if (!BotState.hackEnabled) return;

        const game = getGame();
        if (!game) return;

        if (kind === 'main') {
            if (lastFenProcessedMain === fen) return;
        } else {
            if (lastFenProcessedPremove === fen) return;
        }

        const ctrl = new AbortController();

        try {
            BotState.statusInfo = kind === 'main' ? '🔄 Analyzing...' : '🔄 Analyzing (premove)...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            const randomDepth = getRandomDepth(BotState.botPower);

            if (analysisId !== currentAnalysisId) {
                ctrl.abort('superseded');
                return;
            }

            const data = await fetchEngineDataWithRetry(fen, randomDepth, ctrl.signal);

            if (analysisId !== currentAnalysisId) return;

            const best = parseBestLine(data);

            if (kind === 'main') {
                BotState.bestMove = best?.uci || '-';
                BotState.currentEvaluation = scoreToDisplay(best?.score);
                BotState.principalVariation = best?.pv || 'Not available';
                BotState.statusInfo = '✓ Ready';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

                if (best) await executeMove(best.uci, 4, fen, best.uci[4] || null, tickCallback); // Fix: executeMove signature mismatch?
                // executeMove(from, to, analysisFen, promotionChar, tickCallback)
                // Need to split UCI
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
                    BotState.statusInfo = 'Premove unavailable (no PV)';
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                if (!shouldPremove(ourUci, fen)) {
                    BotState.statusInfo = `Premove skipped (${BotState.premoveMode})`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                const safetyCheck = checkPremoveSafety(fen, ourUci, ourColor);
                if (!safetyCheck.safe) {
                    BotState.statusInfo = `🛡️ Premove blocked: ${safetyCheck.reason}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                let currentChance = getEvalBasedPremoveChance(premoveEvalDisplay, ourColor);

                if (safetyCheck.riskLevel > 0) {
                    const riskPenalty = safetyCheck.riskLevel * 0.5;
                    currentChance = Math.max(5, currentChance - riskPenalty);
                    console.log(`GabiBot: Risk detected (${safetyCheck.riskLevel}%), reducing confidence: ${currentChance.toFixed(0)}%`);
                }

                // Update UI chance element directly if possible, or via BotState/UI
                // BotState doesn't store Premove chance value for UI update except via callback
                // We'll trust UI update to pull it if needed, or pass it in statusInfo?
                // The main.js code continuously updated #premoveChance element.
                // We can store it in BotState for UI to pick up.
                BotState.currentPremoveChance = currentChance;

                const roll = Math.random() * 100;
                if (roll > currentChance) {
                    const skipReason = safetyCheck.riskLevel > 0
                        ? `${safetyCheck.reason} (${roll.toFixed(0)}% > ${currentChance.toFixed(0)}%)`
                        : `eval: ${premoveEvalDisplay}, ${roll.toFixed(0)}% > ${currentChance.toFixed(0)}%`;
                    BotState.statusInfo = `Premove skipped: ${skipReason}`;
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
                BotState.statusInfo = `${safetyEmoji} Premove: ${ourUci} (${Math.round(currentChance)}% confidence)`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                lastFenProcessedPremove = fen;
            }
        } catch (error) {
            if (String(error?.name || error).toLowerCase().includes('abort') ||
                String(error?.message || error).toLowerCase().includes('superseded')) {
                BotState.statusInfo = '⏸ Analysis canceled';
            } else {
                console.error('GabiBot API Error:', error);
                BotState.statusInfo = '❌ API Error';
                BotState.currentEvaluation = 'Error';
            }
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
        }
    });
}
