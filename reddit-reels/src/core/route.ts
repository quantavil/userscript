/**
 * Route Watcher
 * Decides which Reddit URLs get the reel layout and reports client-side
 * navigation (Reddit routes with pushState, which never fires popstate).
 */

const NON_FEED_SEGMENTS =
  /^\/(?:settings|message|messages|chat|notifications|mod|premium|submit|search|media|login|register|account|coins|prefs|wiki|gallery)(?:\/|$)/i;

/**
 * Feed routes: home, sort tabs, r/<sub> (+ sort tabs), r/popular, r/all,
 * user submitted listings. Post pages (/comments/) and tool pages never match.
 */
export function isReelRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (/\/comments\//i.test(path) || /\/s\/[A-Za-z0-9]+$/.test(path)) return false;
  if (NON_FEED_SEGMENTS.test(path)) return false;
  if (path === '/' || /^\/(?:best|hot|new|top|rising|controversial)$/i.test(path)) return true;
  if (/^\/r\/[A-Za-z0-9_]+(?:\/(?:best|hot|new|top|rising|controversial))?$/i.test(path)) return true;
  if (/^\/(?:user|u)\/[A-Za-z0-9_-]+(?:\/submitted)?$/i.test(path)) return true;
  // Local test fixture
  if (/^\/mock-reddit\.html$/i.test(path)) return true;
  return false;
}

/**
 * Calls `onChange` after every URL change: Navigation API when available,
 * plus wrapped history methods, popstate and bfcache restores as fallback.
 */
export function watchRoute(onChange: () => void): () => void {
  let lastHref = location.href;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const check = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (location.href === lastHref) return;
      lastHref = location.href;
      onChange();
    }, 50);
  };

  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<History['pushState']>) {
    const ret = origPush.apply(this, args);
    check();
    return ret;
  };
  history.replaceState = function (...args: Parameters<History['replaceState']>) {
    const ret = origReplace.apply(this, args);
    check();
    return ret;
  };

  const nav = (window as any).navigation as EventTarget | undefined;
  nav?.addEventListener?.('navigatesuccess', check);
  window.addEventListener('popstate', check);
  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) {
      lastHref = '';
      check();
    }
  };
  window.addEventListener('pageshow', onPageShow);

  return () => {
    history.pushState = origPush;
    history.replaceState = origReplace;
    nav?.removeEventListener?.('navigatesuccess', check);
    window.removeEventListener('popstate', check);
    window.removeEventListener('pageshow', onPageShow);
    if (timer) clearTimeout(timer);
  };
}
