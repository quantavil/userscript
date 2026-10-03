/**
 * Playback Focus Controller
 * Reddit's own player (shreddit-player-2) keeps doing autoplay, buffering and
 * controls. This class only enforces one rule on top: exactly one post plays,
 * at the user's mute/volume. Native mute/volume changes made by the user on
 * the active player are adopted, so native and reel controls stay in sync.
 */

declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_setValue<T>(key: string, value: T): void;

import { findActiveSlideVideo } from './gallery-media';
import { ensureAutoplayAttrs, hydrateVideoFromPlayer } from './video-hydrator';

const STORAGE_KEY = 'reddit_reels_muted';
const VOLUME_KEY = 'reddit_reels_volume';
const POST_SELECTOR = 'shreddit-post, [data-post-id], article';
const EMBED_HOSTS = /(?:redgifs\.com|streamable\.com|gfycat\.com|youtube\.com|youtube-nocookie\.com|youtu\.be)/i;
const REDGIFS_HOST = /redgifs\.com/i;
/** A native mute/volume change within this window of a user gesture is the user's choice. */
const USER_GESTURE_MS = 1500;
const HYDRATE_DELAY_MS = 1500;
const MAX_REASSERTS = 3;

function readStored<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  try {
    if (typeof GM_getValue === 'function') {
      const v = parse(GM_getValue<unknown>(key, null));
      if (v !== null) return v;
    }
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const v = parse(raw);
        if (v !== null) return v;
      }
    }
  } catch {}
  return fallback;
}

function writeStored(key: string, value: boolean | number): void {
  try {
    if (typeof GM_setValue === 'function') GM_setValue(key, value);
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value));
  } catch {}
}

const parseBool = (raw: unknown): boolean | null =>
  typeof raw === 'boolean' ? raw : raw === 'true' ? true : raw === 'false' ? false : null;

const parseVolume = (raw: unknown): number | null => {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
};

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
  getState: () => {
    muted: boolean;
    volume: number;
    activeContainer?: HTMLElement | null;
  },
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
      audioManager.markBridgeReady(src);
      const state = getState();
      const active = state.activeContainer;
      if (active) {
        const activeIframes = Array.from(active.querySelectorAll<HTMLIFrameElement>('iframe'));
        const isFromActive = activeIframes.some((ifr) => ifr.contentWindow === src);
        if (!isFromActive) {
          src.postMessage(
            {
              source: 'reddit-reels',
              type: 'SET_AUDIO',
              muted: true,
              volume: 0,
            },
            '*',
          );
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
 * Resumes a shared AudioContext on trusted gestures. Some mobile browsers
 * (iOS Safari, Firefox Android) only allow audible playback after this.
 */
let sharedAudioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
  } catch {}
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
    const tag = (node as any).tagName?.toLowerCase?.() as string | undefined;
    if (tag === 'video') {
      videos.push(node as HTMLVideoElement);
    } else if (tag === 'audio') {
      audios.push(node as HTMLAudioElement);
    } else if (tag) {
      if (
        tag.includes('player') ||
        tag.includes('vds-media') ||
        tag.includes('vds-video') ||
        tag.includes('vds-audio')
      ) {
        players.push(node as HTMLElement);
      }
      const sr = (node as HTMLElement).shadowRoot;
      if (sr) traverse(sr);
    }
    const children = node.childNodes;
    for (let i = 0; i < (children?.length || 0); i++) traverse(children[i]);
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

function isEmbedIframe(ifr: HTMLIFrameElement): boolean {
  return EMBED_HOSTS.test(`${ifr.src || ''} ${ifr.dataset.rrSrc || ''}`);
}

/**
 * Applies mute/volume to every video and embed in a container. Only the target
 * video (default: the first) may play; the rest are paused. Never touches the
 * player custom element's own attributes: Reddit owns those.
 */
export function applyAudioState(
  container: HTMLElement,
  isMuted: boolean,
  volume = 1.0,
  activeTargetVideo?: HTMLVideoElement | null,
): void {
  if (!container) return;

  const level = isMuted ? 0 : volume;
  const { videos, audios } = deepFindMediaElements(container);

  for (const video of videos) {
    try {
      const isTarget =
        activeTargetVideo !== undefined ? video === activeTargetVideo : videos.length === 1 || video === videos[0];
      video.muted = isMuted;
      video.volume = level;
      if (isTarget) {
        if (!isMuted && video.paused) video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    } catch {}
  }

  // Separate audio tracks follow the mute state but are never started by us.
  for (const audio of audios) {
    try {
      audio.muted = isMuted;
      audio.volume = level;
      if (isMuted && !audio.paused) audio.pause();
    } catch {}
  }

  // Embeds (RedGifs bridge + generic players) via postMessage; never reload src here.
  container.querySelectorAll<HTMLIFrameElement>('iframe').forEach((ifr) => {
    try {
      if (!ifr.src || ifr.src === 'about:blank') return;
      ifr.contentWindow?.postMessage(
        {
          source: 'reddit-reels',
          type: 'SET_AUDIO',
          muted: isMuted,
          volume: level,
        },
        '*',
      );
      ifr.contentWindow?.postMessage(
        {
          action: isMuted ? 'mute' : 'unmute',
          type: isMuted ? 'mute' : 'unmute',
          muted: isMuted,
          volume: level,
        },
        '*',
      );
    } catch {}
  });
}

export class AudioManager {
  private _isMuted: boolean;
  private _volume: number;
  private activeContainer: HTMLElement | null = null;
  private activeVideo: HTMLVideoElement | null = null;
  private videoCache = new WeakMap<HTMLElement, { video: HTMLVideoElement | null; time: number }>();
  /** Every video we have seen; Reddit's live in shadow roots that document.querySelectorAll misses. */
  private knownVideos = new Set<HTMLVideoElement>();
  private guardedVideos = new WeakSet<HTMLVideoElement>();
  /** Videos muted only because the browser blocked audible autoplay. */
  private autoplayMuted = new WeakSet<HTMLVideoElement>();
  private bridgeFrames = new WeakSet<Window>();
  private lastGestureAt = 0;
  private reasserts = 0;
  private hydrateTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();

  constructor(initialMuted?: boolean, initialVolume?: number) {
    this._isMuted = initialMuted !== undefined ? initialMuted : readStored(STORAGE_KEY, parseBool, false);
    this._volume = initialVolume !== undefined ? initialVolume : readStored(VOLUME_KEY, parseVolume, 1.0);
    if (typeof document !== 'undefined') {
      const mark = () => {
        this.lastGestureAt = Date.now();
      };
      document.addEventListener('pointerdown', mark, true);
      document.addEventListener('keydown', mark, true);
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public set isMuted(value: boolean) {
    this._isMuted = value;
    writeStored(STORAGE_KEY, value);
    this.syncActive();
    this.emit();
  }

  public get volume(): number {
    return this._volume;
  }

  /** Subscribe to mute/volume changes (including ones made with native controls). */
  public onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }

  public markBridgeReady(win: Window): void {
    try {
      this.bridgeFrames.add(win);
    } catch {}
  }

  public setVolume(level: number, container?: HTMLElement): number {
    const clamped = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 1;
    this._volume = clamped;
    writeStored(VOLUME_KEY, clamped);
    // Volume 0 implies muted; raising above 0 unmutes.
    const nextMuted = clamped === 0;
    if (nextMuted !== this._isMuted) {
      this._isMuted = nextMuted;
      writeStored(STORAGE_KEY, nextMuted);
    }
    if (container && container !== this.activeContainer) {
      applyAudioState(container, this._isMuted, this._volume);
    } else {
      this.syncActive();
    }
    this.emit();
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
   * Registers a video so it can be paused even inside shadow roots, and wires
   * the guard: a non-active video that starts playing (Reddit's own autoplay)
   * is paused again, and native mute/volume changes on the active one are adopted.
   */
  public guardVideo(video: HTMLVideoElement): void {
    this.knownVideos.add(video);
    if (this.guardedVideos.has(video) || typeof video.addEventListener !== 'function') return;
    this.guardedVideos.add(video);

    video.addEventListener('play', () => {
      if (!this.activeContainer) return;
      if (video === this.activeVideo) return;
      if (shadowContains(this.activeContainer, video)) {
        // Another slide of the active gallery started (native carousel): it becomes the active one.
        const prev = this.activeVideo;
        this.activeVideo = video;
        if (prev && prev !== video) this.pauseVideo(prev);
        try {
          video.muted = this._isMuted;
          video.volume = this._isMuted ? 0 : this._volume;
        } catch {}
        return;
      }
      try {
        video.pause();
        video.muted = true;
      } catch {}
    });

    video.addEventListener('volumechange', () => {
      if (video !== this.activeVideo) return;
      const level = video.muted ? 0 : video.volume;
      const expectedLevel = this._isMuted ? 0 : this._volume;
      if (video.muted === this._isMuted && Math.abs(level - expectedLevel) < 0.01) return;
      if (video.muted && this.autoplayMuted.has(video)) return;

      if (Date.now() - this.lastGestureAt < USER_GESTURE_MS) {
        // User touched the native control: adopt it as the global state.
        this.autoplayMuted.delete(video);
        this._isMuted = video.muted || video.volume === 0;
        if (!video.muted && video.volume > 0) this._volume = video.volume;
        writeStored(STORAGE_KEY, this._isMuted);
        writeStored(VOLUME_KEY, this._volume);
        this.reasserts = 0;
        this.emit();
      } else if (this.reasserts < MAX_REASSERTS) {
        // Reddit's player reset it on its own; put the user's choice back.
        this.reasserts++;
        try {
          video.muted = this._isMuted;
          video.volume = expectedLevel;
        } catch {}
      }
    });
  }

  private pauseVideo(v: HTMLVideoElement): void {
    try {
      if (!v.paused) v.pause();
      v.muted = true;
    } catch {}
  }

  /** Stop an embed outside the active post without destroying it where possible. */
  private pauseIframe(ifr: HTMLIFrameElement): void {
    if (!ifr.src || ifr.src === 'about:blank' || !isEmbedIframe(ifr)) return;
    let viaBridge = false;
    try {
      const win = ifr.contentWindow;
      viaBridge = !!win && REDGIFS_HOST.test(ifr.src) && this.bridgeFrames.has(win);
      win?.postMessage({ source: 'reddit-reels', type: 'PAUSE' }, '*');
    } catch {}
    if (!viaBridge) {
      // No bridge in that frame: unloading is the only way to silence it.
      ifr.dataset.rrSrc = ifr.src;
      ifr.src = 'about:blank';
    }
  }

  /**
   * Request playback for a specific video or post. Every other known video and
   * embed is paused and muted first, so audio never overlaps.
   */
  public requestPlayback(target: HTMLVideoElement | HTMLElement): void {
    if (!target) return;

    let targetVideo: HTMLVideoElement | null = null;
    let targetContainer: HTMLElement | null = null;
    const isVideo = (target as any).tagName?.toLowerCase() === 'video' || typeof (target as any).play === 'function';

    if (isVideo) {
      targetVideo = target as HTMLVideoElement;
      targetContainer = (target.closest?.(POST_SELECTOR) as HTMLElement | null) ?? null;
    } else {
      targetContainer = target as HTMLElement;
      targetVideo = this.findVideo(targetContainer);
    }

    const sameTarget = targetContainer === this.activeContainer && targetVideo === this.activeVideo;
    if (sameTarget && targetVideo && !targetVideo.paused) {
      if (targetContainer) applyAudioState(targetContainer, this._isMuted, this._volume, targetVideo);
      return;
    }

    if (this.hydrateTimer) {
      clearTimeout(this.hydrateTimer);
      this.hydrateTimer = null;
    }
    // Leaving a slide restarts it next time (reel behaviour).
    const previous = this.activeVideo;
    if (previous && previous !== targetVideo) {
      this.pauseVideo(previous);
      try {
        previous.currentTime = 0;
      } catch {}
    }
    this.activeContainer = targetContainer;
    this.activeVideo = targetVideo;
    this.reasserts = 0;
    if (targetVideo) this.guardVideo(targetVideo);

    // 1. Silence everything else: shadow-DOM videos via the registry, light DOM via query.
    if (typeof document !== 'undefined') {
      document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
        this.knownVideos.add(v);
      });
      for (const v of this.knownVideos) {
        if (v.isConnected === false) {
          this.knownVideos.delete(v);
          continue;
        }
        if (v === targetVideo) continue;
        if (targetContainer && shadowContains(targetContainer, v) && !targetVideo) continue;
        this.pauseVideo(v);
      }
      document.querySelectorAll<HTMLAudioElement>('audio').forEach((a) => {
        if (targetContainer && targetContainer.contains(a)) return;
        try {
          if (!a.paused) a.pause();
          a.muted = true;
        } catch {}
      });
      document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((ifr) => {
        if (targetContainer && targetContainer.contains(ifr)) return;
        this.pauseIframe(ifr);
      });
    }

    // 2. Wake the active post's embeds (restore any that had to be unloaded).
    if (targetContainer) {
      const iframes = targetContainer.querySelectorAll<HTMLIFrameElement>('iframe');
      iframes.forEach((ifr) => {
        try {
          const stored = ifr.dataset.rrSrc;
          if (ifr.src === 'about:blank' && stored) {
            ifr.src = normalizeIframeSrc(stored, this._isMuted);
            delete ifr.dataset.rrSrc;
          }
          ifr.tabIndex = -1;
        } catch {}
      });
      applyAudioState(targetContainer, this._isMuted, this._volume, targetVideo);
      for (const ifr of iframes) sendIframePlay(ifr);
      blurIframes(targetContainer);
    }

    // 3. Play the active video. Reddit's player normally has a source by now;
    // only if it still has none after a moment do we copy one in.
    if (targetVideo) {
      const video = targetVideo;
      ensureAutoplayAttrs(video);
      this.playWithFallback(video);
      if (targetContainer && !(video as any).currentSrc && !video.src) {
        const container = targetContainer;
        this.hydrateTimer = setTimeout(() => {
          this.hydrateTimer = null;
          if (this.activeVideo !== video || (video as any).currentSrc || video.src) return;
          if (hydrateVideoFromPlayer(container, video)) this.playWithFallback(video);
        }, HYDRATE_DELAY_MS);
      }
    }
  }

  private playWithFallback(video: HTMLVideoElement): void {
    try {
      video.muted = this._isMuted;
      video.volume = this._isMuted ? 0 : this._volume;
      const p = video.play();
      p?.catch?.((err: Error) => {
        if (this.activeVideo !== video) return;
        const name = (err && err.name) || '';
        if (!video.muted && (name === 'NotAllowedError' || name === 'AbortError')) {
          // Audible autoplay blocked without a gesture: start muted; the next tap unmutes.
          this.autoplayMuted.add(video);
          video.muted = true;
          video.play().catch(() => {});
        }
      });
    } catch {}
  }

  /**
   * Locate the playable video in a post (active gallery slide first), through
   * nested shadow roots. Memoized for ~1s to keep IntersectionObserver storms cheap.
   */
  public findVideo(container: HTMLElement): HTMLVideoElement | null {
    if (!container) return null;

    if (container === this.activeContainer && this.activeVideo && shadowContains(container, this.activeVideo)) {
      return this.activeVideo;
    }

    const cached = this.videoCache.get(container);
    if (
      cached &&
      Date.now() - cached.time < 1000 &&
      (cached.video === null || shadowContains(container, cached.video))
    ) {
      return cached.video;
    }

    const found = findActiveSlideVideo(container) || deepFindMediaElements(container).videos[0] || null;
    try {
      this.videoCache.set(container, { video: found, time: Date.now() });
    } catch {}
    if (found) this.guardVideo(found);
    return found;
  }

  /** Single-tap play/pause, routed through the focus rule. */
  public togglePlayback(target: HTMLElement): boolean {
    if (!target) return false;

    if (this.activeContainer !== target) {
      this.requestPlayback(target);
      return true;
    }

    const video = this.activeVideo || this.findVideo(target);
    if (video) {
      if (this.autoplayMuted.has(video) && !this._isMuted) {
        // First tap after a blocked audible autoplay: give the user sound.
        this.autoplayMuted.delete(video);
        video.muted = false;
        video.volume = this._volume;
        if (video.paused) video.play().catch(() => {});
        return true;
      }
      if (video.paused) {
        this.playWithFallback(video);
        return true;
      }
      video.pause();
      return false;
    }

    const ifr = target.querySelector<HTMLIFrameElement>('iframe');
    if (ifr && ifr.src && ifr.src !== 'about:blank') {
      const isPaused = ifr.dataset.rrPaused === '1';
      ifr.dataset.rrPaused = isPaused ? '0' : '1';
      if (isPaused) {
        sendIframePlay(ifr);
        return true;
      }
      ifr.contentWindow?.postMessage({ source: 'reddit-reels', type: 'PAUSE' }, '*');
      ifr.contentWindow?.postMessage({ action: 'pause', type: 'pause' }, '*');
      return false;
    }

    return false;
  }

  public invalidateVideoCache(container?: HTMLElement | null): void {
    if (container) this.videoCache.delete(container);
  }

  /** Toggle mute on/off, apply to the active post, and persist. */
  public toggleMute(container?: HTMLElement): boolean {
    this._isMuted = !this._isMuted;
    writeStored(STORAGE_KEY, this._isMuted);
    if (this.activeVideo) this.autoplayMuted.delete(this.activeVideo);
    if (container && container !== this.activeContainer) {
      applyAudioState(container, this._isMuted, this._volume);
    } else {
      this.syncActive();
    }
    this.emit();
    return this._isMuted;
  }

  /**
   * After a trusted user gesture, push the unmuted state into the active embed
   * (a RedGifs frame that loaded before any gesture may have started muted).
   */
  public reassertActiveIframeUnmute(): void {
    if (this._isMuted || !this.activeContainer) return;
    this.activeContainer.querySelectorAll<HTMLIFrameElement>('iframe').forEach((ifr) => {
      try {
        const stored = ifr.dataset.rrSrc;
        if (ifr.src === 'about:blank' && stored) {
          ifr.src = normalizeIframeSrc(stored, false);
          delete ifr.dataset.rrSrc;
        }
        ifr.contentWindow?.postMessage(
          {
            source: 'reddit-reels',
            type: 'SET_AUDIO',
            muted: false,
            volume: this._volume,
          },
          '*',
        );
        sendIframePlay(ifr);
      } catch {}
    });
  }

  private syncActive(): void {
    if (this.activeContainer) {
      applyAudioState(this.activeContainer, this._isMuted, this._volume, this.activeVideo ?? undefined);
    } else if (this.activeVideo) {
      try {
        this.activeVideo.muted = this._isMuted;
        this.activeVideo.volume = this._isMuted ? 0 : this._volume;
      } catch {}
    }
  }

  /** Halt and mute all playback (leaving reel mode). Embeds are paused, not unloaded. */
  public stopAll(): void {
    if (this.hydrateTimer) {
      clearTimeout(this.hydrateTimer);
      this.hydrateTimer = null;
    }
    this.activeVideo = null;
    this.activeContainer = null;

    if (typeof document !== 'undefined') {
      document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
        this.knownVideos.add(v);
      });
    }
    for (const v of this.knownVideos) {
      if (v.isConnected === false) {
        this.knownVideos.delete(v);
        continue;
      }
      this.pauseVideo(v);
    }
    if (typeof document === 'undefined') return;
    document.querySelectorAll<HTMLAudioElement>('audio').forEach((a) => {
      try {
        if (!a.paused) a.pause();
        a.muted = true;
      } catch {}
    });
    document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((ifr) => {
      try {
        ifr.contentWindow?.postMessage({ source: 'reddit-reels', type: 'PAUSE', muted: true }, '*');
        ifr.contentWindow?.postMessage({ action: 'pause', muted: true }, '*');
      } catch {}
    });
  }
}

export const audioManager = new AudioManager();
