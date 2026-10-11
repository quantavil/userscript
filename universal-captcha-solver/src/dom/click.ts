import { sleep } from '../solver/errors.ts';
import { UI_HOST_TAG } from './picker.ts';

export interface Point {
  x: number;
  y: number;
}
type RectLike = { left: number; top: number; width: number; height: number };

/**
 * Global pacing for the human-like helpers. Tests set `scale = 0` to run without delays.
 * Everything here dispatches synthetic events: `isTrusted` is false whatever the timing, so
 * this lowers the obvious signals (teleporting cursor, zero-length presses), nothing more.
 */
export const timing = { scale: 1 };

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const wait = (ms: number, signal?: AbortSignal) =>
  timing.scale ? sleep(ms * timing.scale, signal) : Promise.resolve();

/** A point near the centre of a rect, jittered so repeated clicks don't land on the same pixel. */
export function pointIn(r: RectLike, rnd = Math.random): Point {
  const j = () => (rnd() - 0.5) * 0.4; // within the middle 40%
  return { x: r.left + r.width * (0.5 + j()), y: r.top + r.height * (0.5 + j()) };
}

/** Topmost page element at a point, looking through our own UI. */
export function pageElementAt({ x, y }: Point): Element | null {
  const all = document.elementsFromPoint?.(x, y) ?? [document.elementFromPoint(x, y)];
  return all.find((el) => el && el.localName !== UI_HOST_TAG) ?? null;
}

/** Last synthetic pointer position in this frame, so consecutive moves continue from it. */
let cursor: Point | null = null;

/** Where an imaginary cursor enters the frame: a random point on one of its edges. */
function entryPoint(): Point {
  const w = innerWidth || 300;
  const h = innerHeight || 300;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: rand(0, w), y: 0 };
  if (side === 1) return { x: w - 1, y: rand(0, h) };
  if (side === 2) return { x: rand(0, w), y: h - 1 };
  return { x: 0, y: rand(0, h) };
}

/** Quadratic Bézier with a sideways bow and ease-in-out spacing: a hand, not a straight line. */
export function pathBetween(from: Point, to: Point, rnd = Math.random): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(6, Math.min(30, Math.round(dist / 14)));
  const bow = (rnd() - 0.5) * Math.min(dist * 0.35, 80);
  const cx = (from.x + to.x) / 2 - (dy / (dist || 1)) * bow;
  const cy = (from.y + to.y) / 2 + (dx / (dist || 1)) * bow;
  const pts: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const lin = i / steps;
    const t = lin < 0.5 ? 2 * lin * lin : 1 - (-2 * lin + 2) ** 2 / 2;
    const u = 1 - t;
    pts.push({ x: u * u * from.x + 2 * u * t * cx + t * t * to.x, y: u * u * from.y + 2 * u * t * cy + t * t * to.y });
  }
  return pts;
}

function fire(target: Element, type: string, at: Point, buttons: number): void {
  const init = { bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y, button: 0, buttons };
  if (type.startsWith('pointer')) {
    if (typeof PointerEvent !== 'function') return;
    target.dispatchEvent(new PointerEvent(type, { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true }));
  } else {
    target.dispatchEvent(new MouseEvent(type, init));
  }
}

/** Glides the synthetic cursor to `to`, firing move/over/out events on whatever is underneath. */
async function moveTo(to: Point, fallback: Element, signal?: AbortSignal): Promise<void> {
  const from = cursor ?? entryPoint();
  let over: Element | null = null;
  for (const p of pathBetween(from, to)) {
    const el = (timing.scale ? pageElementAt(p) : null) ?? fallback;
    if (el !== over) {
      if (over) {
        fire(over, 'pointerout', p, 0);
        fire(over, 'mouseout', p, 0);
      }
      fire(el, 'pointerover', p, 0);
      fire(el, 'mouseover', p, 0);
      over = el;
    }
    fire(el, 'pointermove', p, 0);
    fire(el, 'mousemove', p, 0);
    cursor = p;
    await wait(rand(6, 16), signal);
  }
  cursor = to;
}

/**
 * Moves to a jittered point inside `target` along a curve, hovers briefly, then presses with a
 * realistic hold time. `at` overrides the point (used when clicking by grid position).
 */
export async function humanClick(target: Element, opts: { at?: Point; signal?: AbortSignal } = {}): Promise<void> {
  const at = opts.at ?? pointIn(target.getBoundingClientRect());
  await moveTo(at, target, opts.signal);
  await wait(rand(40, 140), opts.signal);
  fire(target, 'pointerdown', at, 1);
  fire(target, 'mousedown', at, 1);
  if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  await wait(rand(55, 130), opts.signal);
  fire(target, 'pointerup', at, 0);
  fire(target, 'mouseup', at, 0);
  fire(target, 'click', at, 0);
}

/** Forget the cursor (a new challenge frame load starts from an edge again). */
export const resetCursor = () => {
  cursor = null;
};

/**
 * Types like a person: one key at a time with uneven gaps, each with keydown/input/keyup, using
 * the prototype value setter so framework-controlled inputs keep the value.
 */
export async function typeInto(
  field: HTMLInputElement | HTMLTextAreaElement,
  text: string,
  signal?: AbortSignal,
): Promise<void> {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setValue = (value: string) => {
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(field, value);
    else field.value = value;
  };
  await humanClick(field, { signal });
  setValue('');
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  let value = '';
  for (const ch of text) {
    const key = { key: ch, bubbles: true, cancelable: true, composed: true };
    field.dispatchEvent(new KeyboardEvent('keydown', key));
    field.dispatchEvent(new KeyboardEvent('keypress', key));
    value += ch;
    setValue(value);
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
    field.dispatchEvent(new KeyboardEvent('keyup', key));
    await wait(ch === ' ' ? rand(120, 260) : rand(45, 150), signal);
  }
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Polls `fn` until it returns something truthy or `ms` (scaled by `timing`) runs out. */
export async function waitFor<T>(
  fn: () => T | null | undefined | false,
  ms: number,
  signal?: AbortSignal,
  step = 100,
): Promise<T | null> {
  const end = performance.now() + ms * timing.scale;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() >= end) return null;
    await sleep(step, signal);
  }
}

/**
 * Resolves once `el` is mostly inside the viewport and the tab is visible: nobody ticks a
 * checkbox they can't see. IntersectionObserver measures against the top-level viewport even
 * inside a cross-origin iframe, so a checkbox frame scrolled out of view waits.
 */
export function whenOnScreen(el: Element, signal?: AbortSignal, ratio = 0.6): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof IntersectionObserver !== 'function' || !timing.scale) return resolve();
    let inView = false;
    const check = () => {
      if (inView && document.visibilityState === 'visible') done();
    };
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.intersectionRatio >= ratio);
        check();
      },
      { threshold: [0, ratio, 1] },
    );
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    function cleanup() {
      io.disconnect();
      document.removeEventListener('visibilitychange', check);
      signal?.removeEventListener('abort', onAbort);
    }
    function done() {
      cleanup();
      resolve();
    }
    io.observe(el);
    document.addEventListener('visibilitychange', check);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Random pause in [lo, hi] ms, scaled by `timing`. */
export const pause = (lo: number, hi: number, signal?: AbortSignal) => wait(rand(lo, hi), signal);
