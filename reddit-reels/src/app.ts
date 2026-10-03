/**
 * App lifecycle: FAB on feed routes → reel overlay; Back button closes it;
 * comments open Reddit's post page in a new tab, so the reel never moves.
 */

import { isReelRoute, watchRoute } from './core/route';
import { FeedSource } from './feed/source';
import type { Post } from './feed/types';
import { startDeclutter } from './page/declutter';
import { Reel } from './reel/reel';
import { postUrl } from './reel/slide';
import { createFab } from './ui/fab';

const PAGE_CSS = `
html.rr-open { overflow: hidden !important; }
html.rr-open body { display: none !important; }
`;

let source = new FeedSource();
let reel: Reel | null = null;
let fab: HTMLElement | null = null;
let sourcePath = location.pathname;
let savedRestoration: ScrollRestoration = 'auto';

function feedName(path: string): string {
  const p = path.replace(/\/+$/, '');
  const sub = p.match(/^\/r\/([^/]+)/);
  if (sub) return `r/${sub[1]}`;
  const user = p.match(/^\/(?:user|u)\/([^/]+)/);
  if (user) return `u/${user[1]}`;
  return 'Home';
}

/** The post the user was looking at in Reddit's list. */
function nearestPostIndex(posts: Post[]): number {
  const mid = window.innerHeight / 2;
  let best = 0;
  let bestDist = Infinity;
  posts.forEach((p, i) => {
    if (!p.el?.isConnected) return;
    const r = p.el.getBoundingClientRect();
    if (r.height === 0) return;
    const d = Math.abs(r.top + r.height / 2 - mid);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function pausePageMedia(): void {
  const walk = (root: ParentNode) => {
    root.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
      } catch {}
    });
    root.querySelectorAll('*').forEach((el) => {
      if ((el as HTMLElement).shadowRoot) walk((el as HTMLElement).shadowRoot as ShadowRoot);
    });
  };
  walk(document);
}

export function openReel(): void {
  if (reel) return;
  if (location.pathname !== sourcePath) {
    source.reset();
    source = new FeedSource();
    sourcePath = location.pathname;
  }
  source.scan();
  source.observe();
  if (!source.posts.length) return;

  const start = nearestPostIndex(source.posts);

  pausePageMedia();
  // We put the list back ourselves on close; the browser's restore would fight it.
  savedRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  document.documentElement.classList.add('rr-open');
  if (!history.state?.rrReel) {
    history.pushState({ ...(history.state || {}), rrReel: true }, '');
  }
  reel = new Reel({
    source,
    feedName: feedName(location.pathname),
    onClose: () => closeReel(false),
    onOpenComments: openComments,
  });
  reel.open(start);
}

/** fromHistory: the Back button already popped our history entry. */
export function closeReel(fromHistory: boolean): void {
  if (!reel) return;
  const last = reel.activePost;
  const entries = reel.readerInHistory ? 2 : 1;
  reel.close();
  reel = null;
  source.disconnect();
  document.documentElement.classList.remove('rr-open');
  if (!fromHistory && history.state?.rrReel) history.go(-entries);
  // Land on the post you were watching in Reddit's list (after Back settles).
  const land = () => {
    if (last?.el?.isConnected) last.el.scrollIntoView({ block: 'center' });
  };
  land();
  requestAnimationFrame(land);
  setTimeout(() => {
    land();
    history.scrollRestoration = savedRestoration;
  }, 120);
}

/**
 * Comments always open in a new tab (phones too): the reel keeps its place and
 * playback state, and nothing has to be restored when you come back.
 */
function openComments(post: Post): void {
  window.open(postUrl(post), '_blank', 'noopener');
}

function syncFab(): void {
  const show = isReelRoute(location.pathname);
  if (show && !fab) {
    fab = createFab(() => openReel());
    document.documentElement.appendChild(fab);
  } else if (!show && fab) {
    fab.remove();
    fab = null;
  }
}

export function init(): void {
  if (window.top !== window.self) return;
  const style = document.createElement('style');
  style.textContent = PAGE_CSS;
  (document.head || document.documentElement).appendChild(style);
  startDeclutter();

  syncFab();
  watchRoute(() => {
    // Reddit navigated (sub link, post, sort tab): the reel belongs to the old feed.
    if (reel) closeReel(true);
    syncFab();
  });
  window.addEventListener('popstate', () => {
    if (reel && !history.state?.rrReel) closeReel(true);
  });
}
