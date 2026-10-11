import { sleep } from './utils.js';

export interface Coordinates {
  x: number;
  y: number;
}

export interface BoardInputContext {
  getMoveCoordinates(from: string, to: string): { a: Coordinates; b: Coordinates } | null;
  getTargetAt(x: number, y: number): Element;
  guard?: () => boolean;
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
  el.dispatchEvent(new MouseEvent(mouseType, { bubbles: true, cancelable: true, composed: true, ...opts }));
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

export async function simulateClickMove(from: string, to: string, context: BoardInputContext): Promise<boolean> {
  const coords = context.getMoveCoordinates(from, to);
  const guard = context.guard ?? (() => true);
  if (!coords || !guard()) return false;
  const { a, b } = coords;
  const usePointer = !!window.PointerEvent;
  const startEl = context.getTargetAt(a.x, a.y);

  pressAt(startEl, a.x, a.y, usePointer);
  await sleep(2);
  releaseAt(startEl, a.x, a.y, usePointer);
  clickAt(startEl, a.x, a.y);
  await sleep(4);

  if (!guard()) return false;
  const endEl = context.getTargetAt(b.x, b.y);
  pressAt(endEl, b.x, b.y, usePointer);
  await sleep(2);
  releaseAt(endEl, b.x, b.y, usePointer);
  clickAt(endEl, b.x, b.y);
  return true;
}

export async function simulateDragMove(from: string, to: string, context: BoardInputContext): Promise<boolean> {
  const coords = context.getMoveCoordinates(from, to);
  const guard = context.guard ?? (() => true);
  if (!coords || !guard()) return false;
  const { a, b } = coords;
  const usePointer = !!window.PointerEvent;
  const startEl = context.getTargetAt(a.x, a.y);
  pressAt(startEl, a.x, a.y, usePointer);
  await sleep(4);

  for (let i = 1; i <= 2; i++) {
    const t = i / 2;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const stepTarget = context.getTargetAt(x, y);
    dispatchPointerOrMouse(
      stepTarget,
      usePointer ? 'pointermove' : 'mousemove',
      createPointerOpts(x, y, 1),
      usePointer,
    );
    await sleep(4);
  }
  if (!guard()) {
    releaseAt(startEl, a.x, a.y, usePointer);
    return false;
  }
  const endEl = context.getTargetAt(b.x, b.y);
  releaseAt(endEl, b.x, b.y, usePointer);
  return true;
}

export async function activateElement(
  element: HTMLElement,
  getTargetAt: (x: number, y: number) => Element,
  guard: () => boolean,
): Promise<boolean> {
  try {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const target = getTargetAt(x, y);
    if (target !== element && !element.contains(target)) return false;
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
}
