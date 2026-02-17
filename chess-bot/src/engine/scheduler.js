import { BotState, getGame, getPlayerColor, getSideToMove, pa, invalidateGameCache } from '../state.js';
import { scoreToDisplay, getRandomDepth, sleep } from '../utils.js';
import { drawArrow, clearArrows, executeMove, simulateClickMove, simulateDragMove } from '../board.js';
import { getAnalysis, parseBestLine } from './analysis.js';
import { evaluatePremove, evaluatePremoveChain, getOurMoveFromPV } from './premove.js';

let currentAnalysisId = 0;
let currentAbortController = null;

let lastFenProcessedMain = '';
let lastFenProcessedPremove = '';

// Premove chain queue
let premoveChain = [];
let chainBaseFen = '';

export function getLastFenProcessedMain() { return lastFenProcessedMain; }
export function setLastFenProcessedMain(fen) { lastFenProcessedMain = fen; }
export function getLastFenProcessedPremove() { return lastFenProcessedPremove; }
export function setLastFenProcessedPremove(fen) { lastFenProcessedPremove = fen; }

/** Get the current premove chain (for external inspection) */
export function getPremoveChain() { return premoveChain; }

/** Clear the premove chain (e.g. on position divergence) */
export function clearPremoveChain() {
    premoveChain = [];
    chainBaseFen = '';
}

/**
 * Try to execute the next premove in the chain.
 * Called when we detect the opponent has moved and it's now our turn,
 * but we already have queued premoves.
 *
 * @param {string} currentFen - current board FEN
 * @param {Function} tickCallback - optional callback
 * @returns {boolean} true if a chain premove was executed
 */
export async function tryChainPremove(currentFen, tickCallback) {
    if (premoveChain.length === 0) return false;

    const next = premoveChain[0];

    // Quick re-validation: check the premove against actual position
    // The opponent may have deviated from predicted PV
    const result = evaluatePremove(currentFen, next.oppUci, next.uci, getPlayerColor(getGame()));

    if (!result.execute) {
        // Chain broken — opponent deviated or move unsafe
        clearPremoveChain();
        return false;
    }

    // Execute the premove
    premoveChain.shift(); // remove from queue

    const from = next.uci.substring(0, 2);
    const to = next.uci.substring(2, 4);
    clearArrows();
    drawArrow(from, to, 'rgba(80, 180, 255, 0.7)', 3);

    if (BotState.moveMethod === 'drag') {
        await simulateDragMove(from, to);
    } else {
        await simulateClickMove(from, to);
    }
    await sleep(80);

    BotState.statusInfo = `✅ Chain premove: ${next.uci} (${premoveChain.length} queued)`;
    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

    return true;
}

// ---------------------------------------------------
// Analysis Schedule
// ---------------------------------------------------
let scheduledMainFen = '';
let scheduledPremoveFen = '';

export function scheduleAnalysis(kind, fen, tickCallback) {
    // Dedup guard
    if (kind === 'main' && scheduledMainFen === fen) return;
    if (kind !== 'main' && scheduledPremoveFen === fen) return;

    if (kind === 'main') scheduledMainFen = fen;
    else scheduledPremoveFen = fen;

    // Cancel in-flight analysis
    const analysisId = ++currentAnalysisId;
    if (currentAbortController) {
        currentAbortController.abort('superseded');
        currentAbortController = null;
    }

    const ctrl = new AbortController();
    currentAbortController = ctrl;

    const run = async () => {
        if (analysisId !== currentAnalysisId || !BotState.hackEnabled) return;

        invalidateGameCache();
        const game = getGame();
        if (!game) return;

        if (kind === 'main' && lastFenProcessedMain === fen) return;
        if (kind !== 'main' && lastFenProcessedPremove === fen) return;

        try {
            BotState.statusInfo = kind === 'main' ? '🔄 Analyzing...' : '🔄 Analyzing (premove)...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            const randomDepth = getRandomDepth(BotState.botPower);
            if (analysisId !== currentAnalysisId) { ctrl.abort('superseded'); return; }

            const data = await getAnalysis(fen, randomDepth, BotState.moveTime, ctrl.signal);
            if (analysisId !== currentAnalysisId) return;

            const sourceLabel = data.source === 'local' ? ' [local]' : '';
            const best = parseBestLine(data);

            if (kind === 'main') {
                // --- Main turn: execute best move ---
                BotState.bestMove = best?.uci || '-';
                BotState.currentEvaluation = scoreToDisplay(best?.score);
                BotState.principalVariation = best?.pv || 'Not available';
                BotState.statusInfo = `✓ Ready${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

                // Clear any stale chain when it's our turn to move normally
                clearPremoveChain();

                if (best) {
                    const from = best.uci.substring(0, 2);
                    const to = best.uci.substring(2, 4);
                    const promo = best.uci.length >= 5 ? best.uci[4] : null;

                    clearArrows();
                    drawArrow(from, to, 'rgba(100, 255, 100, 0.7)', 3);
                    await executeMove(from, to, fen, promo, tickCallback);
                }
                lastFenProcessedMain = fen;

            } else {
                // --- Premove analysis (opponent's turn) ---
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

                // Build premove chain from full PV
                const chain = evaluatePremoveChain(fen, best?.pv || '', ourColor, stm);

                if (chain.length === 0) {
                    // Fall back to single premove evaluation
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

                    // Execute single premove
                    const from = ourUci.substring(0, 2);
                    const to = ourUci.substring(2, 4);
                    clearArrows();
                    drawArrow(from, to, 'rgba(80, 180, 255, 0.7)', 3);
                    if (BotState.moveMethod === 'drag') {
                        await simulateDragMove(from, to);
                    } else {
                        await simulateClickMove(from, to);
                    }
                    await sleep(80);

                    BotState.statusInfo = `✅ Premove: ${ourUci}${sourceLabel}`;
                    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    lastFenProcessedPremove = fen;
                    return;
                }

                // Execute first move from chain, queue the rest
                const firstMove = chain[0];
                premoveChain = chain.slice(1); // queue remaining
                chainBaseFen = fen;

                const from = firstMove.uci.substring(0, 2);
                const to = firstMove.uci.substring(2, 4);
                clearArrows();
                drawArrow(from, to, 'rgba(80, 180, 255, 0.7)', 3);

                // Draw secondary arrows for queued moves
                for (let i = 0; i < premoveChain.length; i++) {
                    const qm = premoveChain[i];
                    const qFrom = qm.uci.substring(0, 2);
                    const qTo = qm.uci.substring(2, 4);
                    const opacity = Math.max(0.2, 0.5 - i * 0.15);
                    drawArrow(qFrom, qTo, `rgba(80, 180, 255, ${opacity})`, 2);
                }

                if (BotState.moveMethod === 'drag') {
                    await simulateDragMove(from, to);
                } else {
                    await simulateClickMove(from, to);
                }
                await sleep(80);

                const chainInfo = premoveChain.length > 0
                    ? ` (+${premoveChain.length} queued)`
                    : '';
                BotState.statusInfo = `✅ Premove: ${firstMove.uci}${chainInfo}${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                lastFenProcessedPremove = fen;
            }
        } catch (error) {
            if (String(error?.name || error).toLowerCase().includes('abort') ||
                String(error?.message || error).toLowerCase().includes('superseded')) {
                // Silently skip — superseded
            } else {
                console.error('GabiBot Error:', error);
                BotState.statusInfo = '❌ Analysis Error';
                BotState.currentEvaluation = 'Error';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
            }
        } finally {
            if (kind === 'main' && scheduledMainFen === fen) scheduledMainFen = '';
            else if (kind !== 'main' && scheduledPremoveFen === fen) scheduledPremoveFen = '';
            if (currentAbortController === ctrl) currentAbortController = null;
        }
    };

    run();
}