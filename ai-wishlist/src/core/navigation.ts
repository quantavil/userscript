/** One observer/navigation source for card discovery and product-page controls. */
const listeners = new Set<(navigation: boolean) => void>();
let stop: (() => void) | undefined;
export function subscribePage(listener: (navigation: boolean) => void): () => void {
  listeners.add(listener);
  if (!stop) {
    let lastUrl = location.href;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const notify = () => {
      const navigation = location.href !== lastUrl;
      lastUrl = location.href;
      for (const callback of listeners) callback(navigation);
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(notify, 100);
    };
    const owned = (node: Node) =>
      (node instanceof Element ? node : node.parentElement)?.closest("[data-aiw-owned]") !== null;
    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) => {
          if (owned(mutation.target)) return false;
          const changed = [...mutation.addedNodes, ...mutation.removedNodes];
          return !changed.length || changed.some((node) => !owned(node));
        })
      )
        schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Preserve function identity for cleanup; calls below explicitly bind History.
    // oxlint-disable-next-line typescript/unbound-method
    const originalPush = history.pushState;
    // oxlint-disable-next-line typescript/unbound-method
    const originalReplace = history.replaceState;
    const push: typeof history.pushState = function (this: History, ...args) {
      originalPush.apply(this, args);
      schedule();
    };
    const replace: typeof history.replaceState = function (this: History, ...args) {
      originalReplace.apply(this, args);
      schedule();
    };
    history.pushState = push;
    history.replaceState = replace;
    window.addEventListener("popstate", schedule);
    const interval = setInterval(() => {
      if (location.href !== lastUrl) schedule();
    }, 500);
    stop = () => {
      observer.disconnect();
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("popstate", schedule);
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
      stop = undefined;
    };
  }
  listener(false);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) stop?.();
  };
}
