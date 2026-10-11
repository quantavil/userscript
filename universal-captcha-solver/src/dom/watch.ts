export type WatchReason = 'found' | 'changed' | 'lost';
export interface Watch {
  stop(): void;
}

export const elementSignature = (el: Element) =>
  [el.localName, el.getAttribute('src'), (el as HTMLImageElement).currentSrc, (el as HTMLCanvasElement).width].join(
    '|',
  );

/**
 * Tells you when the captcha element appears, disappears, is replaced, or its image changes.
 * One debounced MutationObserver on the document, so it survives sites that swap the node on
 * refresh and SPAs that render it late; v1 observed a single element once and went blind.
 */
export function watchCaptcha(
  getSelector: () => string,
  onChange: (el: Element | null, reason: WatchReason) => void,
  debounceMs = 120,
  /** What counts as "changed" (default: the element's own src). Grids pass the whole challenge. */
  signature: (el: Element) => string = elementSignature,
): Watch {
  let current: Element | null = null;
  let lastSig = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let forced = false;

  const check = () => {
    timer = undefined;
    const force = forced;
    forced = false;
    const el = document.querySelector(getSelector());
    if (!el) {
      if (current) onChange(null, 'lost');
      current = null;
      lastSig = '';
      return;
    }
    const sig = signature(el);
    if (el !== current) {
      const reason = current ? 'changed' : 'found';
      current = el;
      lastSig = sig;
      onChange(el, reason);
    } else if (force || sig !== lastSig) {
      lastSig = sig;
      onChange(el, 'changed');
    }
  };

  const schedule = (force = false) => {
    forced ||= force;
    clearTimeout(timer);
    timer = setTimeout(check, debounceMs);
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    // `style` catches tiles whose picture is a CSS background (hCaptcha); checks are debounced.
    attributeFilter: ['src', 'srcset', 'style'],
  });
  // `load` doesn't bubble, but it can be captured: catches same-URL reloads that don't touch attributes.
  const onLoad = (e: Event) => {
    if (e.target === current) schedule(true);
  };
  document.addEventListener('load', onLoad, true);

  schedule();
  return {
    stop() {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('load', onLoad, true);
    },
  };
}

/** SPA-aware URL change notification (Navigation API, with a popstate/hashchange fallback). */
export function onUrlChange(cb: () => void): () => void {
  const nav = (window as Window & { navigation?: EventTarget }).navigation;
  if (nav) {
    nav.addEventListener('navigatesuccess', cb);
    return () => nav.removeEventListener('navigatesuccess', cb);
  }
  window.addEventListener('popstate', cb);
  window.addEventListener('hashchange', cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener('hashchange', cb);
  };
}
