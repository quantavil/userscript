import { render } from 'preact';
import './style.css';
import { audioManager, unlockAudio, listenForRedGifsReady } from './media';
import {
  FabButton,
  createTopBar,
  syncTopBarState,
  closeCommentsDrawer,
} from './ui';
import {
  FeedManager,
  InputController,
  getClosestPostToViewport,
} from './core';
import { parsePostElement, proxyUpvote } from './extractor';
import { showVotePulse } from './ui/pulse';

let isReelModeActive = false;
let topBarElement: HTMLElement | null = null;
let stopRedgifsReady: (() => void) | null = null;
let savedScrollY = 0;

function isFeedRoute(): boolean {
  if (typeof window === 'undefined') return true;
  const path = window.location.pathname;
  if (/^\/(?:settings|message|chat|notifications|mod\/|premium)/i.test(path)) {
    return false;
  }
  return true;
}

function syncTopBarSound(): void {
  // Single global mute control lives in the top bar.
  syncTopBarState(topBarElement, audioManager.isMuted, feedManager.isVideosOnly);
}

function handleToggleMute(): void {
  unlockAudio();
  const activePost = getClosestPostToViewport();
  audioManager.toggleMute(activePost || undefined);
  audioManager.reassertActiveIframeUnmute();
  syncTopBarSound();
}

function handleVolumeChange(): void {
  // Volume state already applied by InputController via AudioManager;
  // keep the top-bar mute icon in sync (volume 0 mutes, >0 unmutes).
  syncTopBarSound();
}

const feedManager = new FeedManager({
  isReelModeActive: () => isReelModeActive,
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
        const isUp = !!reel.isUpvoted;
        const willBeUp = !isUp;
        proxyUpvote(reel);
        showVotePulse(willBeUp ? true : null);
      }
    } catch {}
  },
  onExit: () => toggleReelMode(false),
  onToggleMute: handleToggleMute,
  onVolumeChange: handleVolumeChange,
  onToggleSubtitles: () => feedManager.toggleSubtitles(),
  onNextPost: () => feedManager.scrollToNext(),
  onPrevPost: () => feedManager.scrollToPrev(),
});

/**
 * Toggle In-Place Reel Mode ON or OFF
 */
export function toggleReelMode(forceState?: boolean): void {
  const nextState = forceState !== undefined ? forceState : !isReelModeActive;
  isReelModeActive = nextState;

  const feedContainer =
    document.querySelector('shreddit-feed, #posts-container, [data-testid="feed-container"]') ||
    document.querySelector('main') ||
    document.body;

  if (isReelModeActive) {
    savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    unlockAudio();
    document.documentElement.classList.add('rr-active');
    feedContainer?.classList.add('rr-feed-container');

    feedManager.enhanceAllPosts();
    feedManager.applyVideosOnlyFilter();

    const activePost = getClosestPostToViewport();
    if (activePost) {
      activePost.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
      audioManager.requestPlayback(activePost);
    }

    if (topBarElement) topBarElement.remove();
    topBarElement = createTopBar(audioManager.isMuted, feedManager.isVideosOnly, {
      onExit: () => toggleReelMode(false),
      onToggleFilter: () => {
        const nextFilter = feedManager.toggleVideosOnly();
        syncTopBarState(topBarElement, audioManager.isMuted, nextFilter);
        const active = getClosestPostToViewport();
        if (active) {
          active.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
      onToggleMute: handleToggleMute,
    });
    document.body.appendChild(topBarElement);

    feedManager.startObservers();
    inputController.attach();
    if (!stopRedgifsReady) {
      stopRedgifsReady = listenForRedGifsReady(() => ({
        muted: audioManager.isMuted,
        volume: audioManager.volume,
        activeContainer: getClosestPostToViewport(),
      }));
    }
  } else {
    document.documentElement.classList.remove('rr-active');
    feedContainer?.classList.remove('rr-feed-container');
    audioManager.stopAll();

    if (topBarElement) {
      topBarElement.remove();
      topBarElement = null;
    }

    if (stopRedgifsReady) {
      stopRedgifsReady();
      stopRedgifsReady = null;
    }

    closeCommentsDrawer();

    feedManager.stopObservers();
    inputController.detach();
    feedManager.teardownAllPosts();

    if (typeof window !== 'undefined' && savedScrollY > 0) {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
    }
  }
}

function init(): void {
  // If running inside RedGifs iframe, do not inject Reddit Reel UI (handled by redgifs-bridge)
  if (typeof window !== 'undefined' && /redgifs\.com/i.test(window.location.hostname)) {
    return;
  }

  const fabContainerId = 'rr-fab-container';
  let fabContainer = document.getElementById(fabContainerId);
  if (!fabContainer) {
    fabContainer = document.createElement('div');
    fabContainer.id = fabContainerId;
    document.body.appendChild(fabContainer);
  }

  render(<FabButton onClick={() => toggleReelMode()} />, fabContainer);

  const updateRoute = () => {
    const isFeed = isFeedRoute();
    if (!isFeed && isReelModeActive) {
      toggleReelMode(false);
    }
    const fc = document.getElementById(fabContainerId);
    if (fc) {
      fc.style.display = isFeed ? '' : 'none';
    }
  };

  updateRoute();
  window.addEventListener('popstate', updateRoute);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
