import { BotState, getGame, getPlayerColor, getSideToMove, pa, invalidateGameCache } from '../state.js';
import { scoreToDisplay, getRandomDepth, sleep } from '../utils.js';
import { drawArrow, clearArrows, executeMove, simulateClickMove } from '../board.js';
import { fetchAnalysis, parseBestLine } from './api.js';
import { evaluatePremove, getOurMoveFromPV } from './premove.js';

let currentAnalysisId = 0;
let currentAbortController = null;

let lastFenProcessedMain = '';
let lastFenProcessedPremove = '';

export function getLastFenProcessedMain() { return lastFenProcessedMain; }
export function setLastFenProcessedMain(fen) { lastFenProcessedMain = fen; }
export function getLastFenProcessedPremove() { return lastFenProcessedPremove; }
export function setLastFenProcessedPremove(fen) { lastFenProcessedPremove = fen; }

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
