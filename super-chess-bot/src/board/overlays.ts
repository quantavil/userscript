import { BotState, isBoardFlipped } from '../app/state.js';
import { notifyBoardInput } from './input.js';
import { markBotNode } from './ownership.js';

interface Coordinates {
  x: number;
  y: number;
}

interface ActiveArrow {
  uciFrom: string;
  uciTo: string;
  color: string;
  thickness: number;
}

interface BoardContext {
  boardEl: HTMLElement;
  orientation: 'white' | 'black';
  drawingBoard: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  detachListeners: () => void;
}

let boardCtx: BoardContext | null = null;
let observedOrientation: 'white' | 'black' | null = null;
let activeArrows: ActiveArrow[] = [];

export function attachToBoard(boardEl: HTMLElement | null): void {
  detachFromBoard();

  if (!boardEl) {
    return;
  }
  if (getComputedStyle(boardEl).position === 'static') boardEl.style.position = 'relative';

  const drawingBoard = document.createElement('canvas');
  markBotNode(drawingBoard);
  drawingBoard.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:100;';
  if (BotState.ghostMode) drawingBoard.style.display = 'none';
  const ctx = drawingBoard.getContext('2d');
  if (!ctx) {
    console.error('Super Chess Bot: Failed to get 2D context.');
    return;
  }

  boardEl.appendChild(drawingBoard);

  const resizeCanvas = () => {
    const rect = boardEl.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    drawingBoard.width = rect.width * dpr;
    drawingBoard.height = rect.height * dpr;
    drawingBoard.style.width = `${rect.width}px`;
    drawingBoard.style.height = `${rect.height}px`;
    ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0);
    redrawActiveArrows();
  };
  resizeCanvas();
  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(boardEl);

  const cancelPendingOnUserAction = (event: Event) => {
    notifyBoardInput(event);
  };
  const userInputEvents = typeof PointerEvent === 'undefined' ? ['mousedown', 'touchstart'] : ['pointerdown'];
  for (const eventName of userInputEvents) boardEl.addEventListener(eventName, cancelPendingOnUserAction, true);

  boardCtx = {
    boardEl,
    orientation: observedOrientation ?? (isBoardFlipped() ? 'black' : 'white'),
    drawingBoard,
    ctx,
    detachListeners() {
      for (const eventName of userInputEvents) {
        boardEl.removeEventListener(eventName, cancelPendingOnUserAction, true);
      }
      ro.disconnect();
      drawingBoard.remove();
    },
  };

  if (BotState.onUpdateDisplay) BotState.onUpdateDisplay();
}

export function setBoardOrientation(orientation: 'white' | 'black'): void {
  observedOrientation = orientation;
  if (boardCtx) boardCtx.orientation = orientation;
}

function isAttachedBoardFlipped(): boolean {
  return boardCtx ? boardCtx.orientation === 'black' : isBoardFlipped();
}

function detachFromBoard(): void {
  if (!boardCtx) return;
  try {
    boardCtx.detachListeners();
  } catch {}
  boardCtx = null;
  activeArrows = [];
}

export function clearArrows(): void {
  activeArrows = [];
  if (!boardCtx) return;
  const { drawingBoard, ctx } = boardCtx;
  ctx.clearRect(0, 0, drawingBoard.width, drawingBoard.height);
}

function getSquareCenterCanvasXY(square: string): Coordinates | null {
  if (!boardCtx || !square || square.length < 2) return null;
  const file = 'abcdefgh'.indexOf(square[0]);
  const rank = parseInt(square[1], 10);
  if (file < 0 || Number.isNaN(rank)) return null;
  const el = boardCtx.boardEl;
  const rect = el.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  const tile = size / 8;
  const offsetX = (rect.width - size) / 2;
  const offsetY = (rect.height - size) / 2;
  let x = file;
  let y = 8 - rank;
  if (isAttachedBoardFlipped()) {
    x = 7 - x;
    y = 7 - y;
  }

  const result = { x: offsetX + (x + 0.5) * tile, y: offsetY + (y + 0.5) * tile };
  if (Number.isNaN(result.x) || Number.isNaN(result.y)) {
    console.warn(`Super Chess Bot: Invalid coordinates for square ${square}. Board size: ${rect.width}x${rect.height}`);
    return null;
  }
  return result;
}

function renderArrow(uciFrom: string, uciTo: string, color: string, thickness: number): void {
  if (BotState.ghostMode) return;
  if (!boardCtx || !uciFrom || !uciTo || uciFrom.length < 2 || uciTo.length < 2) return;
  const { ctx, boardEl } = boardCtx;

  const a = getSquareCenterCanvasXY(uciFrom);
  const b = getSquareCenterCanvasXY(uciTo);
  if (!a || !b) return;

  const rect = boardEl.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  const tile = size / 8;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const headLength = Math.max(14, tile * 0.35);
  const headAngle = Math.PI / 6; // 30 degrees

  // Circle marker at origin square
  ctx.beginPath();
  ctx.arc(a.x, a.y, Math.max(4, thickness * 1.2), 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  // Line shaft stopping at the arrowhead base
  const shaftEndX = b.x - headLength * 0.6 * Math.cos(angle);
  const shaftEndY = b.y - headLength * 0.6 * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(shaftEndX, shaftEndY);
  ctx.lineWidth = Math.max(thickness, 4);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Solid chevron arrowhead at destination
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - headLength * Math.cos(angle - headAngle), b.y - headLength * Math.sin(angle - headAngle));
  ctx.lineTo(b.x - headLength * 0.5 * Math.cos(angle), b.y - headLength * 0.5 * Math.sin(angle));
  ctx.lineTo(b.x - headLength * Math.cos(angle + headAngle), b.y - headLength * Math.sin(angle + headAngle));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawArrow(uciFrom: string, uciTo: string, color: string, thickness: number): void {
  activeArrows.push({ uciFrom, uciTo, color, thickness });
  renderArrow(uciFrom, uciTo, color, thickness);
}

function redrawActiveArrows(): void {
  if (BotState.ghostMode || !boardCtx || activeArrows.length === 0) return;
  for (const arrow of activeArrows) {
    renderArrow(arrow.uciFrom, arrow.uciTo, arrow.color, arrow.thickness);
  }
}

/** Draws alternative arrows for Multi-PV lines (#1 green, #2 cyan, #3 amber). */
export function drawMultiPvArrows(lines: { uci: string }[]): void {
  clearArrows();
  if (BotState.ghostMode || !boardCtx || !lines || lines.length === 0) return;

  const styles = [
    { color: 'rgba(74, 222, 128, 0.85)', thickness: 4 }, // #1 Primary Green
    { color: 'rgba(56, 189, 248, 0.75)', thickness: 3 }, // #2 Secondary Cyan
    { color: 'rgba(251, 191, 36, 0.65)', thickness: 2.5 }, // #3 Tertiary Amber
  ];

  // Draw #3 first, then #2, then #1 on top
  for (let i = Math.min(lines.length, styles.length) - 1; i >= 0; i--) {
    const uci = lines[i]?.uci;
    if (uci && uci.length >= 4) {
      drawArrow(uci.slice(0, 2), uci.slice(2, 4), styles[i].color, styles[i].thickness);
    }
  }
}

export function setGhostMode(enabled: boolean): void {
  if (!boardCtx) return;
  if (enabled) {
    boardCtx.drawingBoard.style.display = 'none';
    clearArrows();
  } else {
    boardCtx.drawingBoard.style.display = '';
  }
}
