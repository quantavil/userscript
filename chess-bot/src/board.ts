import { sleep, debounce } from './utils.js';
import { BotState, getGame, getFen, getPlayerColor, isPlayersTurn, invalidateGameCache, pa, isBoardFlipped } from './state.js';

interface BoardContext {
    boardEl: HTMLElement;
    drawingBoard: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    evalBarWrap: HTMLDivElement;
    resizeObserver: ResizeObserver;
    cancelPendingOnUserAction: () => void;
    touchOpts: AddEventListenerOptions | boolean;
    detachListeners: () => void;
}

interface Coordinates {
    x: number;
    y: number;
}

let boardCtx: BoardContext | null = null;
let domObserver: MutationObserver | null = null;
let pendingMoveTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Move Watcher State
let boardMoveObserver: MutationObserver | null = null;
const mutationListeners: Set<() => void> = new Set();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Re-export for UI usage
export function getBoardCtx(): BoardContext | null { return boardCtx; }

export function attachToBoard(boardEl: HTMLElement | null): void {
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
    if (!ctx) {
        console.error('GabiBot: Failed to get 2D context.');
        return;
    }

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

    // Restart watcher if it was running, to attach to new board
    if (boardMoveObserver) {
        stopMoveWatcher();
        startMoveWatcher();
    }
}

export function detachFromBoard(): void {
    if (!boardCtx) return;
    try { boardCtx.detachListeners(); } catch { }
    boardCtx = null;
}

export function startDomBoardWatcher(): void {
    if (domObserver) try { domObserver.disconnect(); } catch { }
    domObserver = new MutationObserver(debounce(() => {
        const newBoard = document.querySelector('chess-board') || document.querySelector('.board') || document.querySelector('[class*="board"]') as HTMLElement | null;
        if (!newBoard) return;
        if (!boardCtx || boardCtx.boardEl !== newBoard) {
            attachToBoard(newBoard as HTMLElement);
        }
    }, 200));
    domObserver.observe(document.body, { childList: true, subtree: true });
}

// --- Efficient Move Watcher (Replaces Polling) ---

export function onBoardMutation(cb: () => void): () => boolean {
    mutationListeners.add(cb);
    return () => mutationListeners.delete(cb);
}

export function startMoveWatcher(): void {
    stopMoveWatcher();
    const game = getGame();
    // Try to find the board element from game or DOM
    const board = game && (document.querySelector('chess-board') || document.querySelector('.board')) as HTMLElement | null;

    if (!board) return;

    boardMoveObserver = new MutationObserver(() => {
        // Debounce rapid DOM changes
        if (debounceTimer) return;
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            invalidateGameCache();

            // Notify all listeners
            mutationListeners.forEach(cb => cb());
        }, 80);
    });

    boardMoveObserver.observe(board, {
        childList: true, subtree: true,
        attributes: true, attributeFilter: ['class', 'style', 'data-piece']
    });
}

export function stopMoveWatcher(): void {
    if (boardMoveObserver) {
        boardMoveObserver.disconnect();
        boardMoveObserver = null;
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}

export function clearArrows(): void {
    if (!boardCtx) return;
    const { drawingBoard, ctx } = boardCtx;
    ctx.clearRect(0, 0, drawingBoard.width, drawingBoard.height);
}

function getSquareCenterClientXY(square: string): Coordinates | null {
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

    const result = { x: offsetX + (x + 0.5) * tile, y: offsetY + (y + 0.5) * tile };
    if (isNaN(result.x) || isNaN(result.y)) {
        console.warn(`GabiBot: Invalid coordinates for square ${square}. Board size: ${rect.width}x${rect.height}`);
        return null;
    }
    return result;
}

function getSquareCenterCanvasXY(square: string): Coordinates | null {
    if (!boardCtx || !square || square.length < 2) return null;
    const p = getSquareCenterClientXY(square);
    if (!p) return null;
    const rect = boardCtx.boardEl.getBoundingClientRect();
    return { x: p.x - rect.left, y: p.y - rect.top };
}

export function drawArrow(uciFrom: string, uciTo: string, color: string, thickness: number): void {
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

function dispatchPointerOrMouse(el: Element | null, type: string, opts: any, usePointer: boolean): void {
    if (!el) return;
    if (usePointer) {
        try { el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, ...opts })); return; } catch { }
    }
    el.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), { bubbles: true, cancelable: true, composed: true, ...opts }));
}

function getTargetAt(x: number, y: number): Element {
    return document.elementFromPoint(x, y) || boardCtx?.boardEl || document.body;
}

function getMoveCoordinates(from: string, to: string): { a: Coordinates; b: Coordinates } | null {
    const a = getSquareCenterClientXY(from);
    const b = getSquareCenterClientXY(to);
    if (!a || !b) return null;
    return { a, b };
}

function createPointerOpts(x: number, y: number, buttons: number): any {
    return {
        clientX: x, clientY: y,
        buttons,
        pointerId: 1, pointerType: 'mouse', isPrimary: true,
        bubbles: true, cancelable: true, composed: true
    };
}

export async function simulateClickMove(from: string, to: string): Promise<boolean> {
    const coords = getMoveCoordinates(from, to);
    if (!coords) return false;
    const { a, b } = coords;
    const usePointer = !!window.PointerEvent;

    const startEl = getTargetAt(a.x, a.y);
    const endEl = getTargetAt(b.x, b.y);

    const downStart = createPointerOpts(a.x, a.y, 1);
    const upStart = createPointerOpts(a.x, a.y, 0);
    const downEnd = createPointerOpts(b.x, b.y, 1);
    const upEnd = createPointerOpts(b.x, b.y, 0);

    dispatchPointerOrMouse(startEl, usePointer ? 'pointerdown' : 'mousedown', downStart, usePointer);
    await sleep(2);
    dispatchPointerOrMouse(startEl, usePointer ? 'pointerup' : 'mouseup', upStart, usePointer);
    startEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: a.x, clientY: a.y }));

    await sleep(4);

    dispatchPointerOrMouse(endEl, usePointer ? 'pointerdown' : 'mousedown', downEnd, usePointer);
    await sleep(2);
    dispatchPointerOrMouse(endEl, usePointer ? 'pointerup' : 'mouseup', upEnd, usePointer);
    endEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: b.x, clientY: b.y }));

    return true;
}

export async function simulateDragMove(from: string, to: string): Promise<boolean> {
    const coords = getMoveCoordinates(from, to);
    if (!coords) return false;
    const { a, b } = coords;
    const usePointer = !!window.PointerEvent;

    const startEl = getTargetAt(a.x, a.y);

    // Dispatch down
    const down = createPointerOpts(a.x, a.y, 1);
    dispatchPointerOrMouse(startEl, usePointer ? 'pointerdown' : 'mousedown', down, usePointer);

    // Critical delay for UI to register the "grab"
    await sleep(20);

    // Drag steps
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mx = a.x + (b.x - a.x) * t;
        const my = a.y + (b.y - a.y) * t;

        const stepTarget = getTargetAt(mx, my);
        const moveOpts = createPointerOpts(mx, my, 1);
        dispatchPointerOrMouse(stepTarget, usePointer ? 'pointermove' : 'mousemove', moveOpts, usePointer);
        await sleep(12);
    }

    // Dispatch up
    const endEl = getTargetAt(b.x, b.y);
    const up = createPointerOpts(b.x, b.y, 0);
    dispatchPointerOrMouse(endEl, usePointer ? 'pointerup' : 'mouseup', up, usePointer);

    return true;
}

export async function waitForFenChange(prevFen: string, timeout = 1000): Promise<boolean> {
    return new Promise(resolve => {
        // Immediate check
        let g = getGame();
        let fen = g?.getFEN ? g.getFEN() : null;
        if (fen && fen !== prevFen) return resolve(true);

        const start = performance.now();
        let resolved = false;

        const cleanup = onBoardMutation(() => {
            if (resolved) return;
            g = getGame();
            fen = g?.getFEN ? g.getFEN() : null;
            if (fen && fen !== prevFen) {
                resolved = true;
                resolve(true);
            }
        });

        // Fallback polling for safety + Timeout
        const check = () => {
            if (resolved) return;

            g = getGame();
            fen = g?.getFEN ? g.getFEN() : null;
            if (fen && fen !== prevFen) {
                resolved = true;
                cleanup();
                return resolve(true);
            }

            if (performance.now() - start > timeout) {
                resolved = true;
                cleanup();
                return resolve(false);
            }
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    });
}

async function maybeSelectPromotion(prefer = 'q'): Promise<boolean> {
    const preferList = (prefer ? [prefer] : ['q', 'r', 'b', 'n']).map(c => c.toLowerCase());
    const getCandidates = () => Array.from(document.querySelectorAll('[data-test-element*="promotion"], [class*="promotion"] [class*="piece"], [class*="promotion"] button, .promotion-piece')) as HTMLElement[];
    const tryClick = (el: HTMLElement) => {
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
                    ((n as any).dataset?.piece?.toLowerCase?.() || '') === pref ||
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

export function cancelPendingMove(): void {
    if (pendingMoveTimeoutId) {
        clearTimeout(pendingMoveTimeoutId);
        pendingMoveTimeoutId = null;
    }
}

async function makeMove(from: string, to: string, expectedFen: string, promotionChar?: string | null): Promise<boolean> {
    const game = getGame();
    if (!game || !BotState.autoMove) return false;

    const beforeFen = getFen(game);
    if (!beforeFen || beforeFen !== expectedFen || !isPlayersTurn(game)) return false;

    if (BotState.moveMethod === 'drag') {
        const dragged = await simulateDragMove(from, to);
        if (!dragged) return false;
    } else {
        await simulateClickMove(from, to);
    }
    if (promotionChar) await maybeSelectPromotion(String(promotionChar).toLowerCase());

    const changed = await waitForFenChange(beforeFen, 2500);
    return !!changed;
}

export function executeMove(from: string, to: string, analysisFen: string, promotionChar?: string | null, depth?: number, tickCallback?: Function): void {
    if (BotState.hackEnabled && BotState.autoMove) {
        if (!getGame() || !isPlayersTurn(getGame())) return;

        cancelPendingMove();

        const thinkTime = BotState.moveTime;
        const jitter = BotState.jitter ? Math.random() * BotState.jitter : 0;
        const totalDelay = thinkTime + jitter;

        const depthLabel = depth ? ` (D${depth})` : '';
        BotState.statusInfo = `Thinking${depthLabel} (${(totalDelay / 1000).toFixed(1)}s)...`;
        if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

        pendingMoveTimeoutId = setTimeout(async () => {
            const g = getGame();
            if (!g || !isPlayersTurn(g) || getFen(g) !== analysisFen) {
                BotState.statusInfo = 'Move canceled (state changed)';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
                return;
            }

            BotState.statusInfo = 'Making move...';
            if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

            const success = await makeMove(from, to, analysisFen, promotionChar);

            if (success) {
                BotState.statusInfo = '✓ Move made!';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
            } else {
                BotState.statusInfo = '❌ Move failed — retrying...';
                if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

                // Clear the state locks so the controller can re-schedule analysis for this same FEN!
                import('./engine/scheduler.js').then(module => {
                    module.setLastFenProcessedMain('');
                    if (tickCallback) {
                        setTimeout(() => tickCallback(), 500);
                    }
                });
            }
        }, totalDelay);
    } else {
        BotState.statusInfo = 'Ready (manual)';
        if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());
    }
}

export function updateEvaluationBar(evaluation: string | number, playingAs?: number): void {
    if (!boardCtx) return;
    const whiteBar = boardCtx.evalBarWrap.querySelector('#evaluationBarWhite') as HTMLElement | null;
    const blackBar = boardCtx.evalBarWrap.querySelector('#evaluationBarBlack') as HTMLElement | null;
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
        score = evaluation;
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
