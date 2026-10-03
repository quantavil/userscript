import { className, finder, idName } from '@medv/finder';
import { signal } from '@preact/signals';

export const UI_HOST_TAG = 'ucs-root';

export interface PickerView {
  prompt: string;
  rect: { x: number; y: number; w: number; h: number } | null;
  tag: string;
  selector: string;
  matches: number;
  warning: string;
}
/** Rendered by the UI layer; null when no pick is in progress. */
export const pickerView = signal<PickerView | null>(null);

let cancelCurrent: (() => void) | null = null;
/** Cancels an in-progress pick (touch devices have no Escape key). */
export const cancelPick = () => cancelCurrent?.();

export interface Picked {
  el: Element;
  selector: string;
}

function pathSelector(el: Element): string {
  const parts: string[] = [];
  for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
    const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.localName === n?.localName) : [n];
    parts.unshift(same.length > 1 ? `${n.localName}:nth-of-type(${same.indexOf(n) + 1})` : n.localName);
  }
  return parts.join(' > ');
}

/** Shortest stable, unique selector; skips generated-looking ids and our own classes. */
export function selectorFor(el: Element): string {
  try {
    const s = finder(el, {
      root: document.documentElement,
      idName: (n) => idName(n) && !/\d{3,}/.test(n) && !n.startsWith('ucs-'),
      className: (n) => className(n) && !n.startsWith('ucs-'),
      timeoutMs: 400,
    });
    if (document.querySelector(s) === el) return s;
  } catch {
    /* fall through */
  }
  return pathSelector(el);
}

/**
 * Interactive element picker. Swallows page events while active, shows a live selector with a
 * match count, and supports Arrow Up/Down to widen/narrow the target. Resolves null on Escape.
 * `accept` returns a warning string to reject a target (or null to accept it).
 */
export function pickElement(
  prompt: string,
  accept: (el: Element) => string | null = () => null,
): Promise<Picked | null> {
  return new Promise((resolve) => {
    let target: Element | null = null;
    const widened: Element[] = [];
    let raf = 0;

    const isOurs = (e: Event) => e.composedPath().some((n) => n instanceof Element && n.localName === UI_HOST_TAG);
    const problem = (el: Element) =>
      el.getRootNode() instanceof ShadowRoot ? 'Elements inside shadow DOM are not supported' : accept(el);

    const render = () => {
      raf = 0;
      if (!target) {
        pickerView.value = { prompt, rect: null, tag: '', selector: '', matches: 0, warning: '' };
        return;
      }
      const r = target.getBoundingClientRect();
      const selector = selectorFor(target);
      pickerView.value = {
        prompt,
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        tag: target.localName,
        selector,
        matches: document.querySelectorAll(selector).length,
        warning: problem(target) ?? '',
      };
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const track = (e: PointerEvent) => {
      if (isOurs(e)) return;
      const t = e.composedPath()[0];
      if (t instanceof Element && t !== target) {
        target = t;
        widened.length = 0;
        schedule();
      }
    };
    const block = (e: Event) => {
      if (!isOurs(e)) swallow(e);
    };
    const click = (e: MouseEvent) => {
      if (isOurs(e)) return;
      swallow(e);
      if (target && !problem(target)) finish({ el: target, selector: selectorFor(target) });
    };
    const key = (e: KeyboardEvent) => {
      if (isOurs(e)) return;
      if (e.key === 'Escape') {
        swallow(e);
        finish(null);
      } else if (e.key === 'ArrowUp' && target?.parentElement && target.parentElement !== document.documentElement) {
        swallow(e);
        widened.push(target);
        target = target.parentElement;
        schedule();
      } else if (e.key === 'ArrowDown' && widened.length) {
        swallow(e);
        target = widened.pop() ?? target;
        schedule();
      }
    };

    const listeners: [string, EventListener][] = [
      ['pointermove', track as EventListener],
      [
        'pointerdown',
        ((e: PointerEvent) => {
          track(e);
          block(e);
        }) as EventListener,
      ],
      ['pointerup', block],
      ['mousedown', block],
      ['mouseup', block],
      ['click', click as EventListener],
      ['keydown', key as EventListener],
      ['scroll', schedule],
    ];
    for (const [type, fn] of listeners) window.addEventListener(type, fn, { capture: true, passive: false });
    cancelCurrent = () => finish(null);
    const prevCursor = document.documentElement.style.cursor;
    document.documentElement.style.cursor = 'crosshair';
    render();

    function finish(result: Picked | null) {
      for (const [type, fn] of listeners) window.removeEventListener(type, fn, { capture: true });
      cancelAnimationFrame(raf);
      cancelCurrent = null;
      document.documentElement.style.cursor = prevCursor;
      pickerView.value = null;
      resolve(result);
    }
  });
}
