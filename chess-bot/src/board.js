import { qs, qsa, sleep, debounce } from './utils.js';
import { BotState, getGame, getFen, getPlayerColor, isPlayersTurn, invalidateGameCache, pa, isBoardFlipped } from './state.js';
import { AUTO_MOVE_BASE, AUTO_MOVE_STEP, RANDOM_JITTER_MIN } from './config.js';
import { getHumanDelay } from './utils.js';

let boardCtx = null;
let domObserver = null;
let pendingMoveTimeoutId = null;

// Re-export for UI usage
export function getBoardCtx() { return boardCtx; }

export function attachToBoard(boardEl) {
    invalidateGameCache();
    detachFromBoard();

    if (!boardEl) {
        console.warn('GabiBot: No board element to attach.');
        return;
    }
    if (getComputedStyle(boardEl).position === 'static') boardEl.style.position = 'relative';

    const drawingBoard = document.createElement('canvas');
    drawingBoard.id = 'arrowCanvas';
    drawingBoard.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
    const ctx = drawingBoard.getContext('2d');

    const evalBarWrap = document.createElement('div');
    evalBarWrap.id = 'evaluationBarWrap';
    const whiteBar = document.createElement('div');
    whiteBar.id = 'evaluationBarWhite';
    const blackBar = document.createElement('div');
    blackBar.id = 'evaluationBarBlack';
    evalBarWrap.appendChild(whiteBar);
    evalBarWrap.appendChild(blackBar);

    boardEl.appendChild(evalBarWrap);
    boardEl.appendChild(drawingBoard);

    const resizeCanvas = () => {
        const rect = boardEl.getBoundingClientRect();
        drawingBoard.width = rect.width;
        drawingBoard.height = rect.height;
    };
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(boardEl);

    const cancelPendingOnUserAction = () => {
        if (pendingMoveTimeoutId) {
            clearTimeout(pendingMoveTimeoutId);
            pendingMoveTimeoutId = null;
            BotState.statusInfo = 'Manual move in progress...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
        }
    };
    const touchOpts = { passive: true, capture: true };
    boardEl.addEventListener('mousedown', cancelPendingOnUserAction, true);
    boardEl.addEventListener('touchstart', cancelPendingOnUserAction, touchOpts);

    boardCtx = {
        boardEl,
        drawingBoard,
        ctx,
        evalBarWrap,
        resizeObserver: ro,
        cancelPendingOnUserAction,
        touchOpts,
        detachListeners() {
            try { boardEl.removeEventListener('mousedown', cancelPendingOnUserAction, true); } catch { }
            try { boardEl.removeEventListener('touchstart', cancelPendingOnUserAction, touchOpts); } catch { }
            try { ro.disconnect(); } catch { }
            try { drawingBoard.remove(); } catch { }
            try { evalBarWrap.remove(); } catch { }
        }
    };

    if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
}

export function detachFromBoard() {
    if (!boardCtx) return;
    try { boardCtx.detachListeners(); } catch { }
    boardCtx = null;
}

export function startDomBoardWatcher() {
    if (domObserver) try { domObserver.disconnect(); } catch { }
    domObserver = new MutationObserver(debounce(() => {
        const newBoard = qs('chess-board') || qs('.board') || qs('[class*="board"]');
        if (!newBoard) return;
        if (!boardCtx || boardCtx.boardEl !== newBoard) {
            console.log('GabiBot: Board element changed, re-attaching.');
            attachToBoard(newBoard);
        }
    }, 200));
    domObserver.observe(document.body, { childList: true, subtree: true });
}

export function clearArrows() {
    if (!boardCtx) return;
    const { drawingBoard, ctx } = boardCtx;
    ctx.clearRect(0, 0, drawingBoard.width, drawingBoard.height);
}

function getSquareCenterClientXY(square) {
    if (!boardCtx || !square || square.length < 2) return null;
    const file = 'abcdefgh'.indexOf(square[0]);
    const rank = parseInt(square[1], 10);
    if (file < 0 || isNaN(rank)) return null;
    const el = boardCtx.boardEl;
    const rect = el.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const tile = size / 8;
    const offsetX = rect.left + (rect.width - size) / 2;
    const offsetY = rect.top + (rect.height - size) / 2;
    let x = file, y = 8 - rank;
    if (isBoardFlipped()) { x = 7 - x; y = 7 - y; }
    return { x: offsetX + (x + 0.5) * tile, y: offsetY + (y + 0.5) * tile };
}

function getSquareCenterCanvasXY(square) {
    if (!boardCtx || !square || square.length < 2) return null;
    const p = getSquareCenterClientXY(square);
    if (!p) return null;
    const rect = boardCtx.boardEl.getBoundingClientRect();
    return { x: p.x - rect.left, y: p.y - rect.top };
}

export function drawArrow(uciFrom, uciTo, color, thickness) {
    if (!boardCtx || !uciFrom || !uciTo || uciFrom.length < 2 || uciTo.length < 2) return;
    const { drawingBoard, ctx } = boardCtx;

    const a = getSquareCenterCanvasXY(uciFrom);
    const b = getSquareCenterCanvasXY(uciTo);
    if (!a || !b) return;

    const size = Math.min(drawingBoard.width, drawingBoard.height);
    const tile = size / 8;

    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineWidth = thickness; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke();

    ctx.beginPath(); ctx.arc(a.x, a.y, tile / 7, 0, 2 * Math.PI);
    ctx.fillStyle = color.replace('0.7', '0.3'); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

    ctx.beginPath(); ctx.arc(b.x, b.y, tile / 5, 0, 2 * Math.PI);
    ctx.fillStyle = color.replace('0.7', '0.5'); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}

function dispatchPointerOrMouse(el, type, opts, usePointer) {
    if (!el) return;
    if (usePointer) {
        try { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, ...opts })); return; } catch { }
    }
    el.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), { bubbles: true, cancelable: true, composed: true, ...opts }));
}

function getTargetAt(x, y) {
    return document.elementFromPoint(x, y) || boardCtx?.boardEl || document.body;
}

export async function simulateClickMove(from, to) {
    const a = getSquareCenterClientXY(from), b = getSquareCenterClientXY(to);
    if (!a || !b) return false;
    const usePointer = !!window.PointerEvent;
    const startEl = getTargetAt(a.x, a.y);
    const endEl = getTargetAt(b.x, b.y);

    const downStart = { clientX: a.x, clientY: a.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 };
    const upStart = { clientX: a.x, clientY: a.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 };
    const downEnd = { clientX: b.x, clientY: b.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 };
    const upEnd = { clientX: b.x, clientY: b.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 };

    dispatchPointerOrMouse(startEl, usePointer ? 'pointerdown' : 'mousedown', downStart, usePointer);
    await sleep(10);
    dispatchPointerOrMouse(startEl, usePointer ? 'pointerup' : 'mouseup', upStart, usePointer);
    startEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: a.x, clientY: a.y }));

    await sleep(20);

    dispatchPointerOrMouse(endEl, usePointer ? 'pointerdown' : 'mousedown', downEnd, usePointer);
    await sleep(10);
    dispatchPointerOrMouse(endEl, usePointer ? 'pointerup' : 'mouseup', upEnd, usePointer);
    endEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: b.x, clientY: b.y }));

    return true;
}

export async function simulateDragMove(from, to) {
    const a = getSquareCenterClientXY(from), b = getSquareCenterClientXY(to);
    if (!a || !b) return false;
    const usePointer = !!window.PointerEvent;
    const startEl = getTargetAt(a.x, a.y);
    const endEl = getTargetAt(b.x, b.y);
    const down = { clientX: a.x, clientY: a.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 };
    const up = { clientX: b.x, clientY: b.y, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 };

    dispatchPointerOrMouse(startEl, usePointer ? 'pointerdown' : 'mousedown', down, usePointer);
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mx = a.x + (b.x - a.x) * t;
        const my = a.y + (b.y - a.y) * t;
        dispatchPointerOrMouse(endEl, usePointer ? 'pointermove' : 'mousemove', { clientX: mx, clientY: my, buttons: 1 }, usePointer);
        await sleep(12);
    }
    dispatchPointerOrMouse(endEl, usePointer ? 'pointerup' : 'mouseup', up, usePointer);
    return true;
}

export async function waitForFenChange(prevFen, timeout = 1000) {
    return new Promise(resolve => {
        const start = performance.now();
        const check = () => {
            const g = getGame();
            const fen = g?.getFEN ? g.getFEN() : null;
            if (fen && fen !== prevFen) return resolve(true);
            if (performance.now() - start > timeout) return resolve(false);
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    });
}

async function maybeSelectPromotion(prefer = 'q') {
    const preferList = (prefer ? [prefer] : ['q', 'r', 'b', 'n']).map(c => c.toLowerCase());
    const getCandidates = () => qsa('[data-test-element*="promotion"], [class*="promotion"] [class*="piece"], [class*="promotion"] button, .promotion-piece');
    const tryClick = (el) => {
        try {
            el.click?.();
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return true;
        } catch { return false; }
    };
    const start = Date.now();
    while (Date.now() - start < 1000) {
        const nodes = getCandidates();
        if (nodes.length) {
            for (const pref of preferList) {
                const match = nodes.find(n =>
                    (n.dataset?.piece?.toLowerCase?.() || '') === pref ||
                    (n.getAttribute?.('data-piece') || '').toLowerCase() === pref ||
                    (n.getAttribute?.('aria-label') || '').toLowerCase().includes(pref) ||
                    (n.className || '').toLowerCase().includes(pref) ||
                    (n.textContent || '').toLowerCase().includes(pref)
                );
                if (match && tryClick(match)) return true;
            }
            if (tryClick(nodes[0])) return true;
        }
        await sleep(60);
    }
    return false;
}

export function cancelPendingMove() {
    if (pendingMoveTimeoutId) {
        clearTimeout(pendingMoveTimeoutId);
        pendingMoveTimeoutId = null;
    }
}

async function makeMove(from, to, expectedFen, promotionChar) {
    const game = getGame();
    if (!game || !BotState.autoMove) return false;

    const beforeFen = getFen(game);
    if (!beforeFen || beforeFen !== expectedFen || !isPlayersTurn(game)) return false;

    await simulateClickMove(from, to);
    if (promotionChar) await maybeSelectPromotion(String(promotionChar).toLowerCase());

    const changed = await waitForFenChange(beforeFen, 1000);
    return !!changed;
}

export function executeMove(from, to, analysisFen, promotionChar, tickCallback) {
    if (BotState.hackEnabled && BotState.autoMove) {
        const game = getGame();
        if (!game || !isPlayersTurn(game)) {
            BotState.statusInfo = 'Waiting for opponent...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
            return;
        }

        cancelPendingMove();

        const baseDelay = Math.max(0, AUTO_MOVE_BASE - BotState.autoMoveSpeed * AUTO_MOVE_STEP);
        const totalDelay = getHumanDelay(baseDelay, BotState.randomDelay);

        console.log(`GabiBot: Delay ${totalDelay}ms`);
        BotState.statusInfo = `Moving in ${(totalDelay / 1000).toFixed(1)}s`;
        if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

        pendingMoveTimeoutId = setTimeout(async () => {
            const g = getGame(); if (!g) return;
            if (!isPlayersTurn(g)) {
                BotState.statusInfo = 'Move canceled (not our turn)';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                return;
            }
            if (getFen(g) !== analysisFen) {
                BotState.statusInfo = 'Move canceled (position changed)';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                return;
            }

            BotState.statusInfo = 'Making move...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            const success = await makeMove(from, to, analysisFen, promotionChar);
            BotState.statusInfo = success ? '✓ Move made!' : '❌ Move failed';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            if (!success) {
                setTimeout(() => {
                    if (BotState.hackEnabled && isPlayersTurn(getGame())) {
                        if (tickCallback) tickCallback();
                    }
                }, 250);
            }

        }, totalDelay);
    } else {
        BotState.statusInfo = 'Ready (manual)';
        if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
    }
}

export function updateEvaluationBar(evaluation, playingAs) {
    if (!boardCtx) return;
    const whiteBar = boardCtx.evalBarWrap.querySelector('#evaluationBarWhite');
    const blackBar = boardCtx.evalBarWrap.querySelector('#evaluationBarBlack');
    if (!whiteBar || !blackBar) return;

    let score = 0;
    if (typeof evaluation === 'string') {
        if (evaluation === '-' || evaluation === 'Error') {
            whiteBar.style.height = '50%';
            blackBar.style.height = '50%';
            return;
        }

        if (evaluation.includes('M')) {
            const m = parseInt(evaluation.replace('M', '').replace('+', ''), 10);
            score = m > 0 ? 10 : -10;
        } else {
            score = parseFloat(evaluation);
        }
    } else {
        score = parseFloat(evaluation);
    }

    if (isNaN(score)) {
        whiteBar.style.height = '50%';
        blackBar.style.height = '50%';
        return;
    }

    const maxScore = 5;
    const clampedScore = Math.max(-maxScore, Math.min(maxScore, score));
    const whitePercent = 50 + (clampedScore / maxScore) * 50;
    const blackPercent = 100 - whitePercent;

    whiteBar.style.height = `${whitePercent}%`;
    blackBar.style.height = `${blackPercent}%`;

    const ourColor = getPlayerColor(getGame());
    const ourEval = ourColor === 'w' ? score : -score;

    if (ourEval < -2) {
        boardCtx.evalBarWrap.style.borderColor = 'rgba(255, 100, 100, 0.5)';
    } else if (ourEval > 2) {
        boardCtx.evalBarWrap.style.borderColor = 'rgba(100, 255, 100, 0.5)';
    } else {
        boardCtx.evalBarWrap.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}
