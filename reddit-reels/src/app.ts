/**
 * App lifecycle: FAB on feed routes → reel overlay; back button closes it;
 * comments open Reddit's real post page and Back resumes the reel.
 */

import { isReelRoute, watchRoute } from './core/route';
import { FeedSource } from './feed/source';
import type { Post } from './feed/types';
import { isMobile } from './media/player';
import { Reel } from './reel/reel';
import { postUrl } from './reel/slide';
import { createFab } from './ui/fab';

const RESUME_KEY = '@reddit-reels/resume';
const RESUME_MS = 30 * 60 * 1000;
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

interface Resume {
  /** Feed the reel was on. */
  path: string;
  /** Post page opened for comments. */
  via: string;
  id: string;
  ts: number;
}

function readResume(): Resume | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Resume;
    if (Date.now() - r.ts > RESUME_MS || typeof r.id !== 'string') return null;
    return r;
  } catch {
    return null;
  }
}

/**
 * After visiting comments: coming back to the same feed reopens the reel on
 * the same post; going anywhere else forgets it.
 */
function resumeIfReturning(): void {
  const r = readResume();
  if (!r) return;
  const here = location.pathname;
  if (here === r.path && isReelRoute(here)) {
    // Posts may still be streaming in (Reddit re-renders on Back); retry briefly.
    let tries = 0;
    const attempt = () => {
      if (location.pathname !== r.path || reel) return;
      openReel(r.id);
      if (!reel && ++tries < 15) setTimeout(attempt, 300);
    };
    attempt();
  } else if (here !== r.via) {
    clearResume();
  }
}

let leavingForComments = false;

function clearResume(): void {
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {}
}

export function openReel(startId?: string | null): void {
  if (reel) return;
  if (location.pathname !== sourcePath) {
    source.reset();
    source = new FeedSource();
    sourcePath = location.pathname;
  }
  source.scan();
  source.observe();
  if (!source.posts.length) return;

  let start = startId ? source.posts.findIndex((p) => p.id === startId) : -1;
  if (start < 0) start = nearestPostIndex(source.posts);
  clearResume();

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
  reel.close();
  reel = null;
  source.disconnect();
  document.documentElement.classList.remove('rr-open');
  if (!leavingForComments) clearResume();
  leavingForComments = false;
  if (!fromHistory && history.state?.rrReel) history.back();
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

function openComments(post: Post): void {
  const url = postUrl(post);
  if (!isMobile()) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  // Same tab on phones; Back returns here and the reel resumes on this post.
  const resume: Resume = { path: location.pathname, via: new URL(url).pathname, id: post.id, ts: Date.now() };
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
  } catch {}
  // Reddit may turn this into an in-page navigation; the route watcher then closes
  // the reel, and this flag keeps the resume marker alive for the way back.
  leavingForComments = true;
  location.assign(url);
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

  syncFab();
  watchRoute(() => {
    // Reddit navigated (sub link, post, sort tab): the reel belongs to the old feed.
    if (reel) closeReel(true);
    syncFab();
    resumeIfReturning();
  });
  window.addEventListener('popstate', () => {
    if (reel && !history.state?.rrReel) closeReel(true);
  });
  // Coming back from a post page opened from the reel (full page load).
  resumeIfReturning();
}
