/**
 * RedGifs Frame Bridge Subsystem
 * Runs inside the RedGifs cross-origin iframe (matched via https://*.redgifs.com/ifr/*).
 * Grants direct DOM control over <video>, syncing mute, volume, and playback
 * without reloading the iframe.
 */

declare function GM_getValue<T>(key: string, defaultValue?: T): T;

export const REDGIFS_MESSAGE_SOURCE = 'reddit-reels';

export function isRedGifsFrame(): boolean {
  if (typeof window === 'undefined') return false;
  return /redgifs\.com/i.test(window.location.hostname);
}

function getStoredMute(): boolean {
  try {
    if (typeof GM_getValue === 'function') {
      const gm = GM_getValue<boolean | null>('reddit_reels_muted', null);
      if (typeof gm === 'boolean') return gm;
    }
  } catch {}
  return false; // unmuted by default
}

function getStoredVolume(): number {
  try {
    if (typeof GM_getValue === 'function') {
      const gm = GM_getValue<number | null>('reddit_reels_volume', null);
      if (typeof gm === 'number' && gm >= 0 && gm <= 1) return gm;
    }
  } catch {}
  return 1.0;
}

export function initRedGifsBridge(): () => void {
  if (!isRedGifsFrame()) return () => {};

  let currentMuted = getStoredMute();
  let currentVolume = getStoredVolume();

  const applyToVideo = (video: HTMLVideoElement) => {
    try {
      video.muted = currentMuted;
      video.volume = currentVolume;
      if (!currentMuted && video.paused) {
        video.play().catch(() => {
          // Autoplay policy: fall back to muted so the reel still starts.
          try {
            video.muted = true;
            video.play().catch(() => {});
          } catch {}
        });
      } else if (currentMuted && video.paused) {
        video.play().catch(() => {});
      }
    } catch {}
  };

  const syncActiveVideo = () => {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (video) applyToVideo(video);
  };

  const handleMessage = (event: MessageEvent) => {
    const origin = event.origin || '';
    if (origin && !/https:\/\/(?:[a-zA-Z0-9-]+\.)?reddit\.com$/i.test(origin) && origin !== window.location.origin) {
      return;
    }
    const data = event.data;
    if (!data || data.source !== REDGIFS_MESSAGE_SOURCE) return;

    const video = document.querySelector<HTMLVideoElement>('video');

    if (data.type === 'SET_AUDIO' || data.type === 'SET_MUTE') {
      if (typeof data.muted === 'boolean') {
        currentMuted = data.muted;
      }
      if (typeof data.volume === 'number') {
        currentVolume = Math.min(1, Math.max(0, data.volume));
      }
      if (video) applyToVideo(video);
    } else if (data.type === 'PAUSE') {
      if (video && !video.paused) {
        video.pause();
        video.muted = true;
      }
    } else if (data.type === 'PLAY') {
      if (video) {
        applyToVideo(video);
        video.play().catch(() => {});
      }
    }
  };

  window.addEventListener('message', handleMessage);

  // Watch for dynamic video element injection by RedGifs SPA
  const observer = new MutationObserver(() => {
    const video = document.querySelector<HTMLVideoElement>('video');
    if (video) {
      applyToVideo(video);
      // Ensure gesture unlocks sound
      if (!video.dataset.rrBridgeWired) {
        video.dataset.rrBridgeWired = '1';
        video.addEventListener('play', () => applyToVideo(video), { once: true });
      }
    }
  });

  if (document.body || document.documentElement) {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // Initial check
  syncActiveVideo();

  // On any user gesture inside the frame, attempt to enforce desired mute state
  const handleUserGesture = () => {
    syncActiveVideo();
  };
  window.addEventListener('click', handleUserGesture, true);
  window.addEventListener('pointerdown', handleUserGesture, true);

  // Notify parent frame that bridge is initialized
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'redgifs-bridge', type: 'READY' }, '*');
    }
  } catch {}

  return () => {
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('click', handleUserGesture, true);
    window.removeEventListener('pointerdown', handleUserGesture, true);
    observer.disconnect();
  };
}
