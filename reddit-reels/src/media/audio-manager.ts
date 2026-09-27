/**
 * Playback & Audio Focus Controller
 * Guarantees that only ONE video/embed plays at any moment with ZERO audio overlap.
 * Audio is UNMUTED by default.
 */

declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_setValue<T>(key: string, value: T): void;

import { hydrateVideoFromPlayer, ensureAutoplayAttrs } from './video-hydrator';
import { findActiveSlideVideo } from './gallery-media';

const STORAGE_KEY = 'reddit_reels_muted';

/**
 * Audio is UNMUTED by default per user requirement.
 */
function getInitialMuteState(): boolean {
  try {
    if (typeof GM_getValue === 'function') {
      const gmVal = GM_getValue<boolean | null>(STORAGE_KEY, null);
      if (gmVal !== null && typeof gmVal === 'boolean') {
        return gmVal;
      }
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      const localVal = localStorage.getItem(STORAGE_KEY);
      if (localVal !== null) {
        return localVal === 'true';
      }
    }
  } catch {}

  // UNMUTED by default
  return false;
}

function persistMuteState(muted: boolean): void {
  try {
    if (typeof GM_setValue === 'function') {
      GM_setValue(STORAGE_KEY, muted);
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(muted));
    }
  } catch {}
}

const VOLUME_KEY = 'reddit_reels_volume';

function getInitialVolume(): number {
  try {
    if (typeof GM_getValue === 'function') {
      const gmVal = GM_getValue<number | null>(VOLUME_KEY, null);
      if (typeof gmVal === 'number' && gmVal >= 0 && gmVal <= 1) return gmVal;
    }
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw !== null) {
        const n = parseFloat(raw);
        if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
      }
    }
  } catch {}
  return 1.0;
}

function persistVolume(volume: number): void {
  try {
    if (typeof GM_setValue === 'function') {
      GM_setValue(VOLUME_KEY, volume);
    }
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VOLUME_KEY, String(volume));
    }
  } catch {}
}

/**
 * RedGifs / Streamable `ifr/` players ignore generic postMessage mute.
 * The `muted=0|1` query param at load is the source of truth.
 */
export function normalizeIframeSrc(src: string, isMuted: boolean): string {
  if (!src || src === 'about:blank') return src;
  const target = isMuted ? 'muted=1' : 'muted=0';
  if (/[?&]muted=[01]/.test(src)) {
    return src.replace(/([?&]muted=)[01]/g, `$1${isMuted ? '1' : '0'}`);
  }
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}${target}`;
}

/** Ask an embed to start via bridge protocol (no src mutation). */
export function sendIframePlay(ifr: HTMLIFrameElement): void {
  try {
    if (!ifr.src || ifr.src === 'about:blank') return;
    ifr.contentWindow?.postMessage({ source: 'reddit-reels', type: 'PLAY' }, '*');
    ifr.contentWindow?.postMessage({ action: 'play', type: 'play' }, '*');
  } catch {}
}

/** Listen for RedGifs bridge READY and reply with current audio + PLAY only for active slide. */
export function listenForRedGifsReady(
  getState: () => { muted: boolean; volume: number; activeContainer?: HTMLElement | null }
): () => void {
  const handler = (event: MessageEvent) => {
    try {
      const origin = event.origin || '';
      if (!/https:\/\/(?:[a-zA-Z0-9-]+\.)?redgifs\.com$/i.test(origin) && origin !== window.location.origin) {
        return;
      }
      const data = event.data as any;
      if (!data || data.source !== 'redgifs-bridge' || data.type !== 'READY') return;
      const src = event.source as Window | null;
      if (!src || typeof src.postMessage !== 'function') return;
      const state = getState();
      const active = state.activeContainer;
      if (active) {
        const activeIframes = Array.from(active.querySelectorAll<HTMLIFrameElement>('iframe'));
        const isFromActive = activeIframes.some((ifr) => ifr.contentWindow === src);
        if (!isFromActive) {
          src.postMessage({ source: 'reddit-reels', type: 'SET_AUDIO', muted: true, volume: 0 }, '*');
          src.postMessage({ source: 'reddit-reels', type: 'PAUSE' }, '*');
          return;
        }
      }
      const { muted, volume } = state;
      src.postMessage({ source: 'reddit-reels', type: 'SET_AUDIO', muted, volume }, '*');
      src.postMessage({ source: 'reddit-reels', type: 'PLAY' }, '*');
    } catch {}
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/** Keep keyboard focus on the parent page so volume hotkeys keep working. */
export function blurIframes(container: HTMLElement): void {
  try {
    container.querySelectorAll<HTMLIFrameElement>('iframe').forEach((ifr) => {
      try {
        ifr.tabIndex = -1;
        ifr.blur();
      } catch {}
    });
  } catch {}
}

/**
 * Unlocks browser audio playback permission on trusted user gestures (e.g. FAB click or first tap).
 * Reuses a single shared AudioContext so repeated taps do not leak contexts.
 */
let sharedAudioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // One-shot silent buffer to unlock; context itself is reused.
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore if Web Audio API is restricted
  }
}

/**
 * Recursively traverses DOM and all open shadow roots to discover all media elements.
 */
export function deepFindMediaElements(root: Node): {
  videos: HTMLVideoElement[];
  audios: HTMLAudioElement[];
  players: HTMLElement[];
} {
  const videos: HTMLVideoElement[] = [];
  const audios: HTMLAudioElement[] = [];
  const players: HTMLElement[] = [];

  function traverse(node: Node) {
    if (!node) return;

    if (
      (typeof HTMLVideoElement !== 'undefined' && node instanceof HTMLVideoElement) ||
      (node as any).tagName?.toLowerCase() === 'video'
    ) {
      videos.push(node as HTMLVideoElement);
    } else if (
      (typeof HTMLAudioElement !== 'undefined' && node instanceof HTMLAudioElement) ||
      (node as any).tagName?.toLowerCase() === 'audio'
    ) {
      audios.push(node as HTMLAudioElement);
    } else if (node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase();
      if (
        tag.includes('player') ||
        tag.includes('vds-media') ||
        tag.includes('vds-video') ||
        tag.includes('vds-audio')
      ) {
        players.push(node);
      }

      if (node.shadowRoot) {
        traverse(node.shadowRoot);
      }
    }

    if (node.childNodes && node.childNodes.length > 0) {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }

  traverse(root);
  return { videos, audios, players };
}

export function shadowContains(container: HTMLElement, target: Node | null): boolean {
  if (!container || !target) return false;
  let curr: Node | null = target;
  while (curr) {
    if (curr === container) return true;
    curr = curr.parentNode || (curr as ShadowRoot).host || null;
  }
  return false;
}

/**
 * Forcefully applies muted or unmuted state across all media elements, shadow roots,
 * custom player elements, and iframes in a container.
 */
export function applyAudioState(
  container: HTMLElement,
  isMuted: boolean,
  volume = 1.0,
  activeTargetVideo?: HTMLVideoElement | null
): void {
  if (!container) return;

  const level = isMuted ? 0 : volume;
  const { videos, audios, players } = deepFindMediaElements(container);

  // 1. Unmute/mute all video elements, but ONLY play the active target video
  for (const video of videos) {
    try {
      const isTarget =
        activeTargetVideo !== undefined
          ? video === activeTargetVideo
          : (videos.length === 1 || video === videos[0]);
      video.muted = isMuted;
      video.volume = level;
      if (isTarget) {
        if (!isMuted && video.paused) {
          video.play().catch(() => {});
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }
    } catch {}
  }

  // 2. Unmute/mute all audio elements (e.g. separate DASH audio tracks)
  for (const audio of audios) {
    try {
      audio.muted = isMuted;
      audio.volume = level;
      if (!isMuted && audio.paused) {
        audio.play().catch(() => {});
      }
    } catch {}
  }

  // 3. Update player custom elements & attributes
  for (const player of players) {
    try {
      if (isMuted) {
        player.setAttribute('muted', '');
        (player as any).muted = true;
      } else {
        player.removeAttribute('muted');
        (player as any).muted = false;
        (player as any).volume = level;
      }
    } catch {}
  }

  // 4. Update iframes (e.g. RedGifs embed) via seamless postMessage bridge.
  // Never mutate ifr.src on mute/volume toggles: reloading iframes kills playback position and causes rebuffering.
  const iframes = container.querySelectorAll<HTMLIFrameElement>('iframe');
  for (const ifr of iframes) {
    try {
      if (!ifr.src || ifr.src === 'about:blank') continue;
      // Dispatch both internal reddit-reels bridge protocol and standard generic format
      ifr.contentWindow?.postMessage(
        {
          source: 'reddit-reels',
          type: 'SET_AUDIO',
          muted: isMuted,
          volume: level,
        },
        '*'
      );
      ifr.contentWindow?.postMessage(
        {
          action: isMuted ? 'mute' : 'unmute',
          type: isMuted ? 'mute' : 'unmute',
          muted: isMuted,
          volume: level,
        },
        '*'
      );
    } catch {}
  }
}

export class AudioManager {
  private _isMuted: boolean;
  private _volume: number;
  private activeContainer: HTMLElement | null = null;
  private activeVideo: HTMLVideoElement | null = null;
  private videoCache = new WeakMap<HTMLElement, { video: HTMLVideoElement | null; time: number }>();

  constructor(initialMuted?: boolean, initialVolume?: number) {
    this._isMuted = initialMuted !== undefined ? initialMuted : getInitialMuteState();
    this._volume = initialVolume !== undefined ? initialVolume : getInitialVolume();
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public set isMuted(value: boolean) {
    this._isMuted = value;
    persistMuteState(this._isMuted);
    this.syncActiveMute();
  }

  public get volume(): number {
    return this._volume;
  }

  public setVolume(level: number, container?: HTMLElement): number {
    const clamped = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 1;
    this._volume = clamped;
    persistVolume(clamped);
    // Volume 0 implies muted; raising above 0 unmutes.
    if (clamped === 0 && !this._isMuted) {
      this._isMuted = true;
      persistMuteState(true);
    } else if (clamped > 0 && this._isMuted) {
      this._isMuted = false;
      persistMuteState(false);
    }
    const target = container || this.activeContainer;
    if (target) applyAudioState(target, this._isMuted, this._volume);
    this.syncActiveMute();
    return this._volume;
  }

  public adjustVolume(delta: number, container?: HTMLElement): number {
    return this.setVolume(this._volume + delta, container);
  }

  public getActiveVideo(): HTMLVideoElement | null {
    return this.activeVideo;
  }

  public getActiveContainer(): HTMLElement | null {
    return this.activeContainer;
  }

  /**
   * Request playback for a specific video or slide container.
   * Immediately halts and mutes all other media on the page to prevent audio overlap.
   */
  public requestPlayback(target: HTMLVideoElement | HTMLElement): void {
    if (!target) return;

    let targetVideo: HTMLVideoElement | null = null;
    let targetContainer: HTMLElement | null = null;

    const isVideo =
      (typeof HTMLVideoElement !== 'undefined' && target instanceof HTMLVideoElement) ||
      (target as any).tagName?.toLowerCase() === 'video' ||
      typeof (target as any).play === 'function';

    if (isVideo) {
      targetVideo = target as HTMLVideoElement;
      targetContainer = typeof target.closest === 'function'
        ? (target.closest('shreddit-post, [data-post-id], article') as HTMLElement)
        : null;
    } else {
      targetContainer = target as HTMLElement;
      targetVideo = this.findVideo(target as HTMLElement);
    }

    // 1. Forcefully pause, mute, and reset the previously active video
    if (this.activeVideo && this.activeVideo !== targetVideo) {
      try {
        this.activeVideo.pause();
        this.activeVideo.muted = true;
        this.activeVideo.currentTime = 0;
      } catch {}
    }

    if (this.activeContainer && this.activeContainer !== targetContainer) {
      applyAudioState(this.activeContainer, true);
    }

    this.activeContainer = targetContainer;
    this.activeVideo = targetVideo;

    // 2. Forcefully pause, mute, and reset ALL other videos/audios in the document
    if (typeof document !== 'undefined') {
      const allVideos = document.querySelectorAll<HTMLVideoElement>('video');
      allVideos.forEach((v) => {
        if (v !== targetVideo) {
          try {
            if (!v.paused) v.pause();
            v.muted = true;
            v.currentTime = 0;
          } catch {}
        }
      });

      const allAudios = document.querySelectorAll<HTMLAudioElement>('audio');
      allAudios.forEach((a) => {
        try {
          if (!a.paused) a.pause();
          a.muted = true;
          a.currentTime = 0;
        } catch {}
      });

      // Blank out inactive iframes so cross-origin audio immediately dies.
      // Trade-off (intentional per zero-bleed contract): providers ignore generic
      // postMessage mute, so returning to an iframe rebuffers instead of resuming.
      // Active iframe src is restored below via dataset.rrSrc.
      const allIframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
      allIframes.forEach((ifr) => {
        if (!targetContainer || !targetContainer.contains(ifr)) {
          if (ifr.src && ifr.src !== 'about:blank') {
            ifr.dataset.rrSrc = ifr.src;
            ifr.src = 'about:blank';
          }
        }
      });
    }

    // 3. Play active video and apply audio state.
    // Restore + normalize active iframe FIRST so applyAudioState targets
    // a live embed with the correct muted= param (not about:blank).
    if (targetContainer) {
      const iframes = targetContainer.querySelectorAll<HTMLIFrameElement>('iframe');
      iframes.forEach((ifr) => {
        try {
          const stored = ifr.dataset.rrSrc;
          if (ifr.src === 'about:blank' && stored) {
            ifr.src = normalizeIframeSrc(stored, this._isMuted);
          }
          ifr.tabIndex = -1;
        } catch {}
      });

      applyAudioState(targetContainer, this._isMuted, this._volume, targetVideo);
      iframes.forEach((ifr) => sendIframePlay(ifr));
      blurIframes(targetContainer);
    }

    if (targetVideo) {
      // Re-entry guard: already playing this slide, just sync audio state.
      if (targetContainer && targetContainer === this.activeContainer && !targetVideo.paused && (targetVideo as any).currentSrc) {
        applyAudioState(targetContainer, this._isMuted, this._volume);
        return;
      }
      ensureAutoplayAttrs(targetVideo);
      // Hydrate lazy shreddit-player-2 videos (empty src until visible).
      if (targetContainer && (!(targetVideo as any).currentSrc || (targetVideo as any).readyState === 0)) {
        hydrateVideoFromPlayer(targetContainer, targetVideo);
      }
      targetVideo.muted = this._isMuted;
      targetVideo.volume = this._isMuted ? 0 : this._volume;
      targetVideo.play().catch((err: Error) => {
        // Unmuted autoplay blocked without gesture -> muted fallback.
        // Empty-src lazy HLS -> hydrate once and retry.
        if (!targetVideo) return;
        const name = (err && err.name) || '';
        if (name === 'NotSupportedError') {
          if (targetContainer) hydrateVideoFromPlayer(targetContainer, targetVideo);
          targetVideo.muted = true;
          targetVideo.play().catch(() => {});
          return;
        }
        if (!targetVideo.muted && (name === 'NotAllowedError' || name === 'AbortError')) {
          targetVideo.muted = true;
          targetVideo.play().catch(() => {});
        }
      });
    }
  }

  /**
   * Helper to locate video in container, traversing all nested shadowRoots.
   * Fast-paths the active container and memoizes recent lookups (~1s TTL) so
   * IntersectionObserver threshold storms do not re-walk shadow DOM every time.
   */
  public findVideo(container: HTMLElement): HTMLVideoElement | null {
    if (!container) return null;

    if (
      container === this.activeContainer &&
      this.activeVideo &&
      shadowContains(container, this.activeVideo)
    ) {
      return this.activeVideo;
    }

    const cached = this.videoCache.get(container);
    if (cached && Date.now() - cached.time < 1000 && (cached.video === null || shadowContains(container, cached.video))) {
      return cached.video;
    }

    const activeSlideVid = findActiveSlideVideo(container);
    if (activeSlideVid) {
      try {
        this.videoCache.set(container, { video: activeSlideVid, time: Date.now() });
      } catch {}
      return activeSlideVid;
    }

    const { videos } = deepFindMediaElements(container);
    const found = videos.length > 0 ? videos[0] : null;
    try {
      this.videoCache.set(container, { video: found, time: Date.now() });
    } catch {}
    return found;
  }

  /**
   * Centralized playback toggle for single-tap gestures.
   * Routes playback strictly through the mutex and halts background media.
   */
  public togglePlayback(target: HTMLElement): boolean {
    if (!target) return false;

    // If target is not the active container, switch focus to it
    if (this.activeContainer !== target) {
      this.requestPlayback(target);
      return true;
    }

    const video = this.activeVideo || this.findVideo(target);
    if (video) {
      if (video.paused) {
        applyAudioState(target, this._isMuted, this._volume, video);
        video.play().catch(() => {});
        return true;
      } else {
        video.pause();
        return false;
      }
    }

    // If iframe embed (e.g. RedGifs), toggle via bridge postMessage
    const ifr = target.querySelector<HTMLIFrameElement>('iframe');
    if (ifr && ifr.src && ifr.src !== 'about:blank') {
      const isPaused = ifr.dataset.rrPaused === '1';
      if (isPaused) {
        ifr.dataset.rrPaused = '0';
        sendIframePlay(ifr);
        return true;
      } else {
        ifr.dataset.rrPaused = '1';
        ifr.contentWindow?.postMessage({ source: 'reddit-reels', type: 'PAUSE' }, '*');
        ifr.contentWindow?.postMessage({ action: 'pause', type: 'pause' }, '*');
        return false;
      }
    }

    return false;
  }

  public invalidateVideoCache(container?: HTMLElement | null): void {
    try {
      if (container) {
        this.videoCache.delete(container);
      }
    } catch {}
  }

  /**
   * Toggle mute on/off, apply to active media or specified container, and persist state
   */
  public toggleMute(container?: HTMLElement): boolean {
    this._isMuted = !this._isMuted;
    persistMuteState(this._isMuted);

    const target = container || this.activeContainer;
    if (target) {
      applyAudioState(target, this._isMuted, this._volume);
    }
    this.syncActiveMute();

    return this._isMuted;
  }

  /**
   * After a trusted user gesture, re-assert unmuted iframe src so a
   * first-load RedGifs embed blocked by autoplay policy can start audible.
   */
  public reassertActiveIframeUnmute(): void {
    if (this._isMuted || !this.activeContainer) return;
    try {
      const iframes = this.activeContainer.querySelectorAll<HTMLIFrameElement>('iframe');
      if (iframes.length === 0) return;
      iframes.forEach((ifr) => {
        try {
          const stored = ifr.dataset.rrSrc;
          if (ifr.src === 'about:blank' && stored) {
            ifr.src = normalizeIframeSrc(stored, false);
          }
        } catch {}
      });
      iframes.forEach((ifr) => {
        try {
          ifr.contentWindow?.postMessage({ source: 'reddit-reels', type: 'SET_AUDIO', muted: false, volume: this._volume }, '*');
          sendIframePlay(ifr);
        } catch {}
      });
    } catch {}
  }

  private syncActiveMute(): void {
    if (this.activeContainer) {
      applyAudioState(this.activeContainer, this._isMuted, this._volume);
    } else if (this.activeVideo) {
      try {
        this.activeVideo.muted = this._isMuted;
        this.activeVideo.volume = this._isMuted ? 0 : this._volume;
        if (!this._isMuted && this.activeVideo.paused) {
          this.activeVideo.play().catch(() => {});
        }
      } catch {}
    }
  }

  /**
   * Immediately halt and mute all playback across the document
   */
  public stopAll(): void {
    if (this.activeContainer) {
      applyAudioState(this.activeContainer, true);
    }

    if (this.activeVideo) {
      try {
        this.activeVideo.pause();
        this.activeVideo.muted = true;
        this.activeVideo.currentTime = 0;
      } catch {}
    }

    this.activeVideo = null;
    this.activeContainer = null;

    if (typeof document !== 'undefined') {
      const allVideos = document.querySelectorAll<HTMLVideoElement>('video');
      allVideos.forEach((v) => {
        try {
          if (!v.paused) v.pause();
          v.muted = true;
          v.currentTime = 0;
        } catch {}
      });

      const allAudios = document.querySelectorAll<HTMLAudioElement>('audio');
      allAudios.forEach((a) => {
        try {
          if (!a.paused) a.pause();
          a.muted = true;
          a.currentTime = 0;
        } catch {}
      });

      const allIframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
      allIframes.forEach((ifr) => {
        try {
          ifr.contentWindow?.postMessage({ source: 'reddit-reels', type: 'PAUSE', muted: true }, '*');
          ifr.contentWindow?.postMessage({ action: 'pause', muted: true }, '*');
        } catch {}
      });
    }
  }
}

export const audioManager = new AudioManager();
