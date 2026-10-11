import { findPromotionOption } from './promotion.js';
import {
  BotState,
  getBoard,
  getFen,
  getGame,
  getPlayerColor,
  invalidateGameCache,
  isBoardFlipped,
  isPlayersTurn,
  pa,
} from './state.js';
import { debounce, sleep } from './utils.js';

interface BoardContext {
  boardEl: HTMLElement;
  drawingBoard: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  evalBarWrap: HTMLDivElement;
  detachListeners: () => void;
}

interface Coordinates {
  x: number;
  y: number;
}

let boardCtx: BoardContext | null = null;
let domObserver: MutationObserver | null = null;
let moveRevision = 0;
let moveExecutionActive = false;
const pendingMoveConfirmations = new Set<AbortController>();
const boardInputListeners = new Set<() => void>();

// Move Watcher State
let boardMoveObserver: MutationObserver | null = null;
const mutationListeners: Set<() => void> = new Set();
let unsubscribeGame: (() => void) | null = null;
let watcherRevision = 0;
let moveWatcherRequested = false;

function clearMoveWatcher(): void {
  watcherRevision++;
  unsubscribeGame?.();
  unsubscribeGame = null;
  boardMoveObserver?.disconnect();
  boardMoveObserver = null;
}

function isBotOwnedNode(node: Node): boolean {
  const candidate = node as Node & {
    closest?: (selectors: string) => Element | null;
    parentElement?: HTMLElement | null;
  };
  const element = typeof candidate.closest === 'function' ? (candidate as unknown as Element) : candidate.parentElement;
  return !!element?.closest?.('[data-gabibot-overlay], #menuWrap');
}

function isBotOwnedMutation(record: MutationRecord): boolean {
  if (isBotOwnedNode(record.target)) return true;
  if (record.type !== 'childList') return false;
  const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
  return changedNodes.length > 0 && changedNodes.every(isBotOwnedNode);
}

function notifyMutationListeners(): void {
  invalidateGameCache();
  for (const callback of [...mutationListeners]) {
    try {
      callback();
    } catch (error) {
      console.error('GabiBot: Board mutation listener failed.', error);
    }
  }
}

function attachMoveWatcher(): void {
  if (!moveWatcherRequested) return;
  const board = getBoard();
  if (!board) return;
  const game = getGame();
  const revision = watcherRevision;
  const notify = () => {
    if (revision !== watcherRevision) return;
    notifyMutationListeners();
  };
  // Private site API stays behind this adapter. The DOM fallback also
  // covers navigation/reset events whose names vary between site versions.
  if (typeof game?.on === 'function' && typeof game?.off === 'function') {
    game.on('Move', notify);
    const off = game.off.bind(game);
    unsubscribeGame = () => off('Move', notify);
  }
  let queued = false;
  boardMoveObserver = new MutationObserver((records) => {
    if (!records.some((record) => !isBotOwnedMutation(record))) return;
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      notify();
    });
  });
  boardMoveObserver.observe(board, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-piece'],
  });
}

export function attachToBoard(boardEl: HTMLElement | null): void {
  invalidateGameCache();
  detachFromBoard();
  clearMoveWatcher();

  if (!boardEl) {
    return;
  }
  if (getComputedStyle(boardEl).position === 'static') boardEl.style.position = 'relative';

  const drawingBoard = document.createElement('canvas');
  drawingBoard.id = 'arrowCanvas';
  drawingBoard.setAttribute('data-gabibot-overlay', '');
  drawingBoard.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
  const ctx = drawingBoard.getContext('2d');
  if (!ctx) {
    console.error('GabiBot: Failed to get 2D context.');
    return;
  }

  const evalBarWrap = document.createElement('div');
  evalBarWrap.id = 'evaluationBarWrap';
  evalBarWrap.setAttribute('data-gabibot-overlay', '');
  evalBarWrap.style.cssText =
    'position:absolute;height:100%;width:14px;left:-22px;top:0;background:#111;z-index:50;overflow:hidden;pointer-events:none;border-radius:4px;';
  const whiteBar = document.createElement('div');
  whiteBar.id = 'evaluationBarWhite';
  whiteBar.style.cssText = 'position:absolute;top:0;left:0;right:0;height:50%;background:#f0d9b5;';
  const blackBar = document.createElement('div');
  blackBar.id = 'evaluationBarBlack';
  blackBar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:50%;background:#111;';
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

  const cancelPendingOnUserAction = (event: Event) => {
    if (!event.isTrusted) return;
    if ('button' in event && typeof (event as MouseEvent).button === 'number' && (event as MouseEvent).button !== 0) {
      return;
    }
    cancelPendingMove();
    boardInputListeners.forEach((listener) => {
      listener();
    });
  };
  const userInputEvents = typeof PointerEvent === 'undefined' ? ['mousedown', 'touchstart'] : ['pointerdown'];
  for (const eventName of userInputEvents) boardEl.addEventListener(eventName, cancelPendingOnUserAction, true);

  boardCtx = {
    boardEl,
    drawingBoard,
    ctx,
    evalBarWrap,
    detachListeners() {
      for (const eventName of userInputEvents) {
        try {
          boardEl.removeEventListener(eventName, cancelPendingOnUserAction, true);
        } catch {}
      }
      try {
        ro.disconnect();
      } catch {}
      try {
        drawingBoard.remove();
      } catch {}
      try {
        evalBarWrap.remove();
      } catch {}
    },
  };

  if (BotState.onUpdateDisplay) BotState.onUpdateDisplay(pa());

  attachMoveWatcher();
}

function detachFromBoard(): void {
  if (!boardCtx) return;
  try {
    boardCtx.detachListeners();
  } catch {}
  boardCtx = null;
}

export function startDomBoardWatcher(): void {
  if (domObserver)
    try {
      domObserver.disconnect();
    } catch {}
  const syncBoard = debounce(() => {
    const newBoard = getBoard();
    if (!newBoard) {
      if (boardCtx) attachToBoard(null);
      else clearMoveWatcher();
      return;
    }
    if (!boardCtx || boardCtx.boardEl !== newBoard) {
      attachToBoard(newBoard);
    }
  }, 200);
  domObserver = new MutationObserver((records) => {
    if (records.some((record) => !isBotOwnedMutation(record))) syncBoard();
  });
  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
}

// --- Efficient Move Watcher (Replaces Polling) ---

export function onBoardMutation(cb: () => void): () => boolean {
  mutationListeners.add(cb);
  return () => mutationListeners.delete(cb);
}

export function onBoardInput(cb: () => void): () => boolean {
  boardInputListeners.add(cb);
  return () => boardInputListeners.delete(cb);
}

export function startMoveWatcher(): void {
  moveWatcherRequested = true;
  clearMoveWatcher();
  attachMoveWatcher();
}

export function stopMoveWatcher(): void {
  moveWatcherRequested = false;
  clearMoveWatcher();
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
  if (file < 0 || Number.isNaN(rank)) return null;
  const el = boardCtx.boardEl;
  const rect = el.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  const tile = size / 8;
  const offsetX = rect.left + (rect.width - size) / 2;
  const offsetY = rect.top + (rect.height - size) / 2;
  let x = file,
    y = 8 - rank;
  if (isBoardFlipped()) {
    x = 7 - x;
    y = 7 - y;
  }

  const result = { x: offsetX + (x + 0.5) * tile, y: offsetY + (y + 0.5) * tile };
  if (Number.isNaN(result.x) || Number.isNaN(result.y)) {
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

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineWidth = thickness;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(a.x, a.y, tile / 7, 0, 2 * Math.PI);
  ctx.fillStyle = color.replace('0.7', '0.3');
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(b.x, b.y, tile / 5, 0, 2 * Math.PI);
  ctx.fillStyle = color.replace('0.7', '0.5');
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function dispatchPointerOrMouse(el: Element | null, type: string, opts: PointerEventInit, usePointer: boolean): void {
  if (!el) return;
  const mouseType = type.replace('pointer', 'mouse');
  if (usePointer) {
    try {
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, ...opts }));
      el.dispatchEvent(new MouseEvent(mouseType, { bubbles: true, cancelable: true, composed: true, ...opts }));
      return;
    } catch {}
  }
  el.dispatchEvent(
    new MouseEvent(mouseType, { bubbles: true, cancelable: true, composed: true, ...opts }),
  );
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

function createPointerOpts(x: number, y: number, buttons: number): PointerEventInit {
  return {
    clientX: x,
    clientY: y,
    screenX: x + (typeof window !== 'undefined' ? window.screenX || 0 : 0),
    screenY: y + (typeof window !== 'undefined' ? window.screenY || 0 : 0),
    buttons,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
}

function pressAt(el: Element, x: number, y: number, usePointer: boolean): void {
  dispatchPointerOrMouse(el, usePointer ? 'pointerdown' : 'mousedown', createPointerOpts(x, y, 1), usePointer);
}

function releaseAt(el: Element, x: number, y: number, usePointer: boolean): void {
  dispatchPointerOrMouse(el, usePointer ? 'pointerup' : 'mouseup', createPointerOpts(x, y, 0), usePointer);
}

function clickAt(el: Element, x: number, y: number): void {
  el.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y }),
  );
}

async function simulateClickMove(from: string, to: string, guard: () => boolean = () => true): Promise<boolean> {
  const coords = getMoveCoordinates(from, to);
  if (!coords || !guard()) return false;
  const { a, b } = coords;
  const usePointer = !!window.PointerEvent;

  const startEl = getTargetAt(a.x, a.y);

  pressAt(startEl, a.x, a.y, usePointer);
  await sleep(2);
  releaseAt(startEl, a.x, a.y, usePointer);
  clickAt(startEl, a.x, a.y);

  await sleep(4);

  if (!guard()) return false;
  const endEl = getTargetAt(b.x, b.y);
  pressAt(endEl, b.x, b.y, usePointer);
  await sleep(2);
  releaseAt(endEl, b.x, b.y, usePointer);
  clickAt(endEl, b.x, b.y);

  return true;
}

async function simulateDragMove(from: string, to: string, guard: () => boolean = () => true): Promise<boolean> {
  const coords = getMoveCoordinates(from, to);
  if (!coords || !guard()) return false;
  const { a, b } = coords;
  const usePointer = !!window.PointerEvent;

  const startEl = getTargetAt(a.x, a.y);

  // Dispatch down
  pressAt(startEl, a.x, a.y, usePointer);

  // Critical delay for UI to register the "grab"
  await sleep(4);

  // Drag steps
  const steps = 2;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mx = a.x + (b.x - a.x) * t;
    const my = a.y + (b.y - a.y) * t;

    const stepTarget = getTargetAt(mx, my);
    const moveOpts = createPointerOpts(mx, my, 1);
    dispatchPointerOrMouse(stepTarget, usePointer ? 'pointermove' : 'mousemove', moveOpts, usePointer);
    await sleep(4);
  }

  // Release at the start when canceled; never drop an obsolete move.
  if (!guard()) {
    releaseAt(startEl, a.x, a.y, usePointer);
    return false;
  }
  const endEl = getTargetAt(b.x, b.y);
  releaseAt(endEl, b.x, b.y, usePointer);

  return true;
}

export async function waitForFenChange(
  prevFen: string,
  timeout = 1000,
  expectedFen?: string,
  signal?: AbortSignal,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    let done = false;
    let unsubscribe = () => {};
    let frame: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (accepted: boolean) => {
      if (done) return;
      done = true;
      unsubscribe();
      signal?.removeEventListener('abort', onAbort);
      if (timer) clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      resolve(accepted);
    };
    const check = () => {
      const game = getGame();
      const fen = getFen(game);
      if (fen && fen !== prevFen) {
        if (!expectedFen) {
          finish(true);
          return;
        }
        const comparable = (f: string) =>
          f
            .split(' ')
            .filter((_, i) => i !== 3)
            .join(' ');
        const expectedComp = comparable(expectedFen);
        if (comparable(fen) === expectedComp) {
          finish(true);
          return;
        }
        const history = game?.getHistoryFENs?.();
        if (Array.isArray(history) && history.some((h) => typeof h === 'string' && comparable(h) === expectedComp)) {
          finish(true);
          return;
        }
        finish(false);
      }
    };
    const onAbort = () => {
      check();
      if (!done) finish(false);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    unsubscribe = onBoardMutation(check);
    timer = setTimeout(() => finish(false), timeout);
    const poll = () => {
      check();
      if (!done) frame = requestAnimationFrame(poll);
    };
    poll();
  });
}

async function maybeSelectPromotion(prefer = 'q', guard: () => boolean = () => true): Promise<boolean> {
  if (!/^[qrbn]$/i.test(prefer)) return false;
  const getCandidates = () =>
    Array.from(
      document.querySelectorAll(
        '[data-test-element*="promotion"], [class*="promotion"] [class*="piece"], [class*="promotion"] button, .promotion-piece',
      ),
    ).filter((el) => {
      const option = el as HTMLElement;
      // Chess.com keeps its promotion choices mounted while the picker is closed.
      if (option.getClientRects().length === 0) return false;
      const style = getComputedStyle(option);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }) as HTMLElement[];
  const tryClick = async (el: HTMLElement): Promise<boolean> => {
    try {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const target = getTargetAt(x, y);
      if (target !== el && !el.contains(target)) return false;
      const usePointer = !!window.PointerEvent;
      pressAt(target, x, y, usePointer);
      await sleep(2);
      if (!guard()) {
        releaseAt(target, x, y, usePointer);
        return false;
      }
      releaseAt(target, x, y, usePointer);
      clickAt(target, x, y);
      return true;
    } catch {
      return false;
    }
  };
  const start = Date.now();
  while (Date.now() - start < 1000) {
    if (!guard()) return false;
    const nodes = getCandidates();
    const match = findPromotionOption(nodes, prefer);
    if (match && guard() && (await tryClick(match))) return true;
    await sleep(60);
  }
  return false;
}

export function cancelPendingMove(): void {
  moveRevision++;
  for (const controller of pendingMoveConfirmations) controller.abort();
  pendingMoveConfirmations.clear();
}
export function getMoveRevision(): number {
  return moveRevision;
}

function setStyleIfChanged(element: HTMLElement, property: 'height' | 'borderColor', value: string): void {
  if (element.style[property] !== value) element.style[property] = value;
}

export async function executeMove(
  from: string,
  to: string,
  analysisFen: string,
  promotionChar?: string | null,
  _depth?: number,
  _tickCallback?: () => void,
  expectedFen?: string,
): Promise<boolean> {
  if (moveExecutionActive) return false;
  const revision = moveRevision;
  const game = getGame();
  if (!BotState.hackEnabled || !BotState.autoMove || !game || !isPlayersTurn(game) || getFen(game) !== analysisFen)
    return false;
  moveExecutionActive = true;
  const confirmationController = new AbortController();
  pendingMoveConfirmations.add(confirmationController);
  const guard = () =>
    revision === moveRevision && !!BotState.hackEnabled && !!BotState.autoMove && getFen(getGame()) === analysisFen;
  let confirmation: Promise<boolean> | undefined;
  try {
    BotState.statusInfo = 'Submitting move...';
    BotState.onUpdateDisplay?.(pa());
    // Subscribe before dispatch so a fast move and reply cannot skip confirmation.
    confirmation = waitForFenChange(analysisFen, 1000, expectedFen, confirmationController.signal);
    const sent =
      BotState.moveMethod === 'drag'
        ? await simulateDragMove(from, to, guard)
        : await simulateClickMove(from, to, guard);
    if (!sent) return false;
    if (promotionChar && guard() && !(await maybeSelectPromotion(promotionChar, guard))) return false;
    const accepted = await confirmation;
    if (revision === moveRevision) {
      BotState.statusInfo = accepted ? 'Move confirmed' : 'Move not confirmed; waiting for position change';
      BotState.onUpdateDisplay?.(pa());
    }
    return accepted;
  } finally {
    confirmationController.abort();
    pendingMoveConfirmations.delete(confirmationController);
    moveExecutionActive = false;
    if (revision === moveRevision && BotState.statusInfo === 'Submitting move...') {
      BotState.statusInfo = 'Move input failed';
      BotState.onUpdateDisplay?.(pa());
    }
  }
}

export function updateEvaluationBar(evaluation: string | number, _playingAs?: number): void {
  if (!boardCtx) return;
  const whiteBar = boardCtx.evalBarWrap.querySelector('#evaluationBarWhite') as HTMLElement | null;
  const blackBar = boardCtx.evalBarWrap.querySelector('#evaluationBarBlack') as HTMLElement | null;
  if (!whiteBar || !blackBar) return;

  let score = 0;
  if (typeof evaluation === 'string') {
    if (evaluation === '-' || evaluation === 'Error') {
      setStyleIfChanged(whiteBar, 'height', '50%');
      setStyleIfChanged(blackBar, 'height', '50%');
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

  if (Number.isNaN(score)) {
    setStyleIfChanged(whiteBar, 'height', '50%');
    setStyleIfChanged(blackBar, 'height', '50%');
    return;
  }

  const maxScore = 5;
  const clampedScore = Math.max(-maxScore, Math.min(maxScore, score));
  const whitePercent = 50 + (clampedScore / maxScore) * 50;
  const blackPercent = 100 - whitePercent;

  setStyleIfChanged(whiteBar, 'height', `${whitePercent}%`);
  setStyleIfChanged(blackBar, 'height', `${blackPercent}%`);

  const ourColor = getPlayerColor(getGame());
  const ourEval = ourColor === 'w' ? score : -score;

  if (ourEval < -2) {
    setStyleIfChanged(boardCtx.evalBarWrap, 'borderColor', 'rgba(255, 100, 100, 0.5)');
  } else if (ourEval > 2) {
    setStyleIfChanged(boardCtx.evalBarWrap, 'borderColor', 'rgba(100, 255, 100, 0.5)');
  } else {
    setStyleIfChanged(boardCtx.evalBarWrap, 'borderColor', 'rgba(255, 255, 255, 0.2)');
  }
}
