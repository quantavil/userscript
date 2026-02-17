import {
    BotState, getGame, getPlayerColor, getSideToMove, pa, invalidateGameCache
} from '../state.js';
import { scoreToDisplay, getRandomDepth, sleep } from '../utils.js';
import {
    drawArrow, clearArrows, executeMove, simulateClickMove, simulateDragMove
} from '../board.js';
import { fetchAnalysis, parseBestLine } from './api.js';
import {
    evaluatePremove, evaluateDoublePremove, getOurMoveFromPV,
    parseUci,                                                     // FIX #4
    isPremoveLocked, lockPremove, unlockPremove,                   // CORE FIX
    markFenHandled, isFenHandled, clearHandledFens                 // CORE FIX
} from './premove.js';

let currentAnalysisId    = 0;
let currentAbortController = null;

let lastFenProcessedMain    = '';
let lastFenProcessedPremove = '';

export function getLastFenProcessedMain()        { return lastFenProcessedMain; }
export function setLastFenProcessedMain(fen)     { lastFenProcessedMain = fen; }
export function getLastFenProcessedPremove()     { return lastFenProcessedPremove; }
export function setLastFenProcessedPremove(fen)  { lastFenProcessedPremove = fen; }

// ───────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────

/** Execute a premove via click or drag, including promotion. */
async function performPremove(uci) {                              // FIX #4
    const parsed = parseUci(uci);
    if (!parsed) return false;

    if (BotState.moveMethod === 'drag') {
        return simulateDragMove(parsed.from, parsed.to, parsed.promo);
    }
    return simulateClickMove(parsed.from, parsed.to, parsed.promo);
}

/** Quick guard — returns true if this run is stale. */
function isStale(analysisId) {
    return analysisId !== currentAnalysisId || !BotState.hackEnabled;
}

// ───────────────────────────────────────────────────
// Schedule
// ───────────────────────────────────────────────────
let scheduledMainFen    = '';
let scheduledPremoveFen = '';

export function scheduleAnalysis(kind, fen, tickCallback) {
    // Dedup guard
    if (kind === 'main'  && scheduledMainFen    === fen) return;
    if (kind !== 'main'  && scheduledPremoveFen === fen) return;

    if (kind === 'main') scheduledMainFen = fen;
    else                 scheduledPremoveFen = fen;

    // ── CORE FIX: block premove if locked or already handled ──
    if (kind !== 'main') {
        if (isPremoveLocked() || isFenHandled(fen)) {
            // Clear so a genuinely NEW fen is not dedup-blocked later
            scheduledPremoveFen = '';
            return;
        }
    }

    // Cancel in-flight analysis
    const analysisId = ++currentAnalysisId;
    if (currentAbortController) {
        currentAbortController.abort('superseded');
        currentAbortController = null;
    }

    const ctrl = new AbortController();
    currentAbortController = ctrl;

    const run = async () => {
        if (isStale(analysisId)) return;

        invalidateGameCache();
        const game = getGame();
        if (!game) return;

        if (kind === 'main'  && lastFenProcessedMain    === fen) return;
        if (kind !== 'main'  && lastFenProcessedPremove  === fen) return;

        // ── CORE FIX: re-check lock after async gap ──
        if (kind !== 'main' && (isPremoveLocked() || isFenHandled(fen))) return;

        try {
            BotState.statusInfo = kind === 'main'
                ? '🔄 Analyzing...'
                : '🔄 Analyzing (premove)...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            const randomDepth = getRandomDepth(BotState.botPower);
            if (isStale(analysisId)) { ctrl.abort('superseded'); return; }

            const data = await fetchAnalysis(fen, randomDepth, BotState.moveTime, ctrl.signal);
            if (isStale(analysisId)) return;

            const sourceLabel = data.source === 'local' ? ' [local]' : '';
            const best        = parseBestLine(data);

            // ===========================================================
            // MAIN MOVE
            // ===========================================================
            if (kind === 'main') {
                BotState.bestMove             = best?.uci || '-';
                BotState.currentEvaluation    = scoreToDisplay(best?.score);
                BotState.principalVariation   = best?.pv || 'Not available';
                BotState.statusInfo           = `✓ Ready${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

                if (best) {
                    const parsed = parseUci(best.uci);            // FIX #4
                    if (parsed) {
                        clearArrows();
                        drawArrow(parsed.from, parsed.to, 'rgba(100, 255, 100, 0.7)', 3);
                        await executeMove(parsed.from, parsed.to, fen, parsed.promo, tickCallback);
                    }
                }

                // After a main move the board resets — clear premove state
                clearHandledFens();
                lastFenProcessedMain = fen;
                return;
            }

            // ===========================================================
            // PREMOVE — re-check lock after the async fetch
            // ===========================================================
            if (isPremoveLocked() || isFenHandled(fen)) {
                lastFenProcessedPremove = fen;
                return;
            }

            const ourColor = getPlayerColor(game);
            const stm      = getSideToMove(game);
            const pvMoves  = (best?.pv || '').trim().split(/\s+/).filter(Boolean);

            const opponentUci =
                stm !== ourColor && pvMoves.length > 0 ? pvMoves[0] : null;
            const ourUci =
                getOurMoveFromPV(best?.pv || '', ourColor, stm) ||
                (stm === ourColor ? (best?.uci || null) : null);

            if (!ourUci) {
                BotState.statusInfo = `Premove unavailable (no PV)${sourceLabel}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                lastFenProcessedPremove = fen;
                return;
            }

            // --- Evaluate safety + stability ---
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

            // ── CORE FIX: lock BEFORE touching the board ──
            lockPremove();
            markFenHandled(fen);

            try {
                // --- Execute first premove ---
                clearArrows();
                drawArrow(
                    ourUci.substring(0, 2),
                    ourUci.substring(2, 4),
                    'rgba(80, 180, 255, 0.7)', 3
                );
                await performPremove(ourUci);

                BotState.statusInfo = `✅ Premove: ${ourUci}`;
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                lastFenProcessedPremove = fen;

                // Mark the resulting position as handled too so
                // the observer won't immediately re-trigger
                invalidateGameCache();
                const postGame = getGame();
                if (postGame?.fen) markFenHandled(postGame.fen);

                // --- Double premove ---
                if (pvMoves.length >= 4) {
                    const opponentNextUci = pvMoves[2];
                    const ourNextUci      = pvMoves[3];

                    const doubleRes = evaluateDoublePremove(
                        fen, opponentUci, ourUci,
                        opponentNextUci, ourNextUci, ourColor
                    );

                    if (doubleRes.execute) {
                        await sleep(120);
                        if (isStale(analysisId)) return;

                        // FIX #7 — verify the board hasn't diverged during sleep
                        invalidateGameCache();
                        const checkGame = getGame();
                        if (!checkGame) return;
                        // If the game FEN changed to something we didn't expect,
                        // an external move happened — abort double premove
                        if (checkGame.fen && !isFenHandled(checkGame.fen) && checkGame.fen !== fen) {
                            return;
                        }

                        drawArrow(
                            ourNextUci.substring(0, 2),
                            ourNextUci.substring(2, 4),
                            'rgba(80, 180, 255, 0.5)', 3
                        );
                        await performPremove(ourNextUci);

                        // Mark this position too
                        invalidateGameCache();
                        const postGame2 = getGame();
                        if (postGame2?.fen) markFenHandled(postGame2.fen);

                        BotState.statusInfo = `✅✅ Double: ${ourUci} → ${ourNextUci}`;
                        if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                    }
                }
            } finally {
                // Release lock with cooldown — prevents cascading re-premove
                unlockPremove(500);
            }

        } catch (error) {
            const msg = String(error?.name || error?.message || error).toLowerCase();
            if (msg.includes('abort') || msg.includes('superseded')) {
                // Silently skip — superseded
            } else {
                console.error('GabiBot Error:', error);
                BotState.statusInfo    = '❌ Analysis Error';
                BotState.currentEvaluation = 'Error';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
            }
        } finally {
            if (kind === 'main'  && scheduledMainFen    === fen) scheduledMainFen = '';
            if (kind !== 'main'  && scheduledPremoveFen === fen) scheduledPremoveFen = '';
            if (currentAbortController === ctrl) currentAbortController = null;
        }
    };

    run();
}