import './style.css';
import { FeedManager, getClosestPostToViewport, InputController, isReelRoute, watchRoute } from './core';
import { parsePostElement, proxyUpvote } from './extractor';
import { audioManager, listenForRedGifsReady, unlockAudio } from './media';
import { mountHeaderToggle, syncHeaderToggle, syncOverlaySoundButtons, unmountHeaderToggle } from './ui';
import { showVotePulse } from './ui/pulse';

declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_setValue(key: string, value: unknown): void;

const ENABLED_KEY = '@reddit-reels/enabled';
const LAST_POST_KEY = '@reddit-reels/last-post';

let isReelModeActive = false;
/** Set when the remembered slide had not streamed in yet on activation. */
let pendingRestoreUntil = 0;
let stopRedgifsReady: (() => void) | null = null;

/** Reel layout preference (on by default), toggled from the header button or Esc. */
function readEnabled(): boolean {
  try {
    if (typeof GM_getValue === 'function') {
      const v = GM_getValue<string | null>(ENABLED_KEY, null);
      if (v !== null) return v !== '0';
    }
  } catch {}
  try {
    const v = localStorage.getItem(ENABLED_KEY);
    if (v !== null) return v !== '0';
  } catch {}
  return true;
}

function writeEnabled(on: boolean): void {
  try {
    if (typeof GM_setValue === 'function') GM_setValue(ENABLED_KEY, on ? '1' : '0');
  } catch {}
  try {
    localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  } catch {}
}

let reelEnabled = readEnabled();

function postKey(el: HTMLElement): string {
  return el.id || el.getAttribute('permalink') || '';
}

function rememberActivePost(el: HTMLElement): void {
  try {
    const key = postKey(el);
    if (key) sessionStorage.setItem(LAST_POST_KEY, `${location.pathname}|${key}`);
  } catch {}
}

function rememberedKey(): string | null {
  try {
    const raw = sessionStorage.getItem(LAST_POST_KEY);
    if (!raw) return null;
    const sep = raw.indexOf('|');
    if (raw.slice(0, sep) !== location.pathname) return null;
    return raw.slice(sep + 1) || null;
  } catch {
    return null;
  }
}

/** After Back from a post page, land on the slide the user left from. */
function findRememberedPost(): HTMLElement | null {
  try {
    const key = rememberedKey();
    if (!key) return null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('shreddit-post'))) {
      if (postKey(el) === key) return el;
    }
  } catch {}
  return null;
}

function syncSoundUi(): void {
  syncOverlaySoundButtons(audioManager.isMuted);
}

function handleToggleMute(): void {
  unlockAudio();
  audioManager.toggleMute(getClosestPostToViewport() || undefined);
  audioManager.reassertActiveIframeUnmute();
}

const feedManager = new FeedManager({
  isReelModeActive: () => isReelModeActive,
  onActivePost: rememberActivePost,
  onPostsAdded: () => {
    mountToggle();
    if (pendingRestoreUntil && Date.now() < pendingRestoreUntil) {
      const el = findRememberedPost();
      if (el && !el.classList.contains('rr-filtered-out')) {
        pendingRestoreUntil = 0;
        el.scrollIntoView({
          behavior: 'instant' as ScrollBehavior,
          block: 'start',
        });
        audioManager.requestPlayback(el);
      }
    }
  },
  onToggleMute: handleToggleMute,
});

const inputController = new InputController({
  isReelModeActive: () => isReelModeActive,
  getActivePost: () => getClosestPostToViewport(),
  getActiveReelPost: () => {
    const el = getClosestPostToViewport();
    if (!el) return null;
    try {
      return parsePostElement(el);
    } catch {
      return null;
    }
  },
  onDoubleTap: (tappedPost: HTMLElement) => {
    try {
      const reel = parsePostElement(tappedPost);
      if (reel) {
        const willBeUp = !reel.isUpvoted;
        proxyUpvote(reel);
        showVotePulse(willBeUp ? true : null);
      }
    } catch {}
  },
  onExit: () => setReelEnabled(false),
  onToggleMute: handleToggleMute,
  onVolumeChange: () => syncSoundUi(),
  onToggleSubtitles: () => feedManager.toggleSubtitles(),
  onNextPost: () => feedManager.scrollToNext(),
  onPrevPost: () => feedManager.scrollToPrev(),
});

function mountToggle(): void {
  if (!isReelRoute(location.pathname)) {
    unmountHeaderToggle();
    return;
  }
  mountHeaderToggle({
    onToggleReel: () => setReelEnabled(!reelEnabled),
    onToggleFilter: () => {
      if (!isReelModeActive) return;
      const anchor = getClosestPostToViewport();
      feedManager.toggleVideosOnly();
      syncHeaderToggle(reelEnabled, feedManager.isVideosOnly);
      const target = anchor && !anchor.classList.contains('rr-filtered-out') ? anchor : getClosestPostToViewport();
      target?.scrollIntoView({
        behavior: 'instant' as ScrollBehavior,
        block: 'start',
      });
    },
  });
  syncHeaderToggle(reelEnabled, feedManager.isVideosOnly);
}

function activate(): void {
  if (isReelModeActive) return;
  // Pick the anchor slide before the layout changes: the remembered one after Back,
  // otherwise whatever the user was looking at in list view.
  const remembered = findRememberedPost();
  pendingRestoreUntil = !remembered && rememberedKey() ? Date.now() + 3000 : 0;
  const anchor = remembered || getClosestPostToViewport();
  isReelModeActive = true;

  document.documentElement.classList.add('rr-active');
  feedManager.enhanceAllPosts();
  feedManager.applyVideosOnlyFilter();
  feedManager.startObservers();
  inputController.attach();

  if (!stopRedgifsReady) {
    stopRedgifsReady = listenForRedGifsReady(() => ({
      muted: audioManager.isMuted,
      volume: audioManager.volume,
      activeContainer: getClosestPostToViewport(),
    }));
  }

  const target = anchor && !anchor.classList.contains('rr-filtered-out') ? anchor : getClosestPostToViewport();
  if (target) {
    target.scrollIntoView({
      behavior: 'instant' as ScrollBehavior,
      block: 'start',
    });
    // Reddit restores its own scroll position after re-rendering on Back; re-pin once it settles.
    setTimeout(() => {
      if (isReelModeActive && target.isConnected) {
        target.scrollIntoView({
          behavior: 'instant' as ScrollBehavior,
          block: 'start',
        });
      }
    }, 350);
    audioManager.requestPlayback(target);
  }
}

function deactivate(): void {
  if (!isReelModeActive) return;
  const anchor = getClosestPostToViewport();
  isReelModeActive = false;
  pendingRestoreUntil = 0;

  audioManager.stopAll();
  feedManager.stopObservers();
  inputController.detach();
  feedManager.teardownAllPosts();
  document.documentElement.classList.remove('rr-active', 'rr-hide-captions');

  if (stopRedgifsReady) {
    stopRedgifsReady();
    stopRedgifsReady = null;
  }
  // Keep the user's place: the slide they were on stays in view in list layout.
  if (anchor?.isConnected) {
    anchor.scrollIntoView({
      behavior: 'instant' as ScrollBehavior,
      block: 'center',
    });
  }
}

/** Single source of truth: reels run on feed routes while the preference is on. */
function syncState(): void {
  const shouldRun = reelEnabled && isReelRoute(location.pathname);
  if (shouldRun) activate();
  else deactivate();
  mountToggle();
}

export function setReelEnabled(on: boolean): void {
  reelEnabled = on;
  writeEnabled(on);
  if (on) unlockAudio();
  syncState();
}

/** Back-compat for callers/tests: toggles the preference. */
export function toggleReelMode(forceState?: boolean): void {
  setReelEnabled(forceState !== undefined ? forceState : !reelEnabled);
}

function init(): void {
  if (typeof window === 'undefined') return;
  // RedGifs frames run only the bridge (src/index.ts); never run the reel inside any iframe.
  if (/redgifs\.com/i.test(window.location.hostname)) return;
  if (window.top !== window.self) return;

  audioManager.onChange(syncSoundUi);
  watchRoute(() => {
    // Leaving a feed (opening a post) must stop reel playback immediately;
    // coming back re-applies the layout to whatever feed Reddit rendered.
    syncState();
  });
  syncState();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
