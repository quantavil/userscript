import { UI_HOST_TAG } from './picker.ts';

export interface Point {
  x: number;
  y: number;
}

/** A point near the centre of a rect, jittered so repeated clicks don't land on the same pixel. */
export function pointIn(r: { left: number; top: number; width: number; height: number }, rand = Math.random): Point {
  const j = () => (rand() - 0.5) * 0.4; // within the middle 40%
  return { x: r.left + r.width * (0.5 + j()), y: r.top + r.height * (0.5 + j()) };
}

/** Topmost page element at a point, looking through our own UI. */
export function pageElementAt({ x, y }: Point): Element | null {
  const all = document.elementsFromPoint?.(x, y) ?? [document.elementFromPoint(x, y)];
  return all.find((el) => el && el.localName !== UI_HOST_TAG) ?? null;
}

/**
 * Dispatches the pointer and mouse sequence a real click produces, at a point inside `target`.
 * Userscripts can't move the OS cursor: these events are synthetic (`isTrusted === false`),
 * which most tile grids accept but a vendor may choose to ignore.
 */
export function simulateClick(target: Element, at: Point = pointIn(target.getBoundingClientRect())): void {
  const base = { bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y, button: 0 };
  const hasPointer = typeof PointerEvent === 'function';
  const pointer = (type: string, buttons: number) =>
    hasPointer &&
    target.dispatchEvent(
      new PointerEvent(type, { ...base, buttons, pointerId: 1, pointerType: 'mouse', isPrimary: true }),
    );
  const mouse = (type: string, buttons: number) => target.dispatchEvent(new MouseEvent(type, { ...base, buttons }));

  pointer('pointerover', 0);
  mouse('mouseover', 0);
  pointer('pointermove', 0);
  mouse('mousemove', 0);
  pointer('pointerdown', 1);
  mouse('mousedown', 1);
  if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  pointer('pointerup', 0);
  mouse('mouseup', 0);
  mouse('click', 0);
}
