/**
 * One shared <video> for the whole reel.
 *
 * The element is moved into whichever slide is active. Reusing a single
 * element means: exactly one audio stream can exist (no bleed by construction),
 * and once the user's first tap has played it, mobile browsers (iOS included)
 * keep allowing it to play with sound for later slides.
 */

import Hls from 'hls.js';
import type { Post, VideoSource } from '../feed/types';
import { getRedgifs, pickRedgifsUrl, redgifsBlobUrl } from './redgifs';

declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_setValue(key: string, value: unknown): void;

const MUTED_KEY = '@reddit-reels/muted';

export type PlayerEvent = 'muted' | 'autoplay-muted' | 'error' | 'loading' | 'ready';

export function isMobile(): boolean {
  try {
    return matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  } catch {
    return false;
  }
}

/** Packaged mp4 list is sorted best-first; phones take the first rendition ≤ 720p wide. */
export function pickMp4(source: VideoSource, mobile: boolean): string {
  if (!source.mp4.length) return '';
  if (!mobile) return source.mp4[0];
  const limit = 1280;
  const pick = source.mp4.find((u) => {
    const m = u.match(/res_(\d+)p/);
    return m ? parseInt(m[1], 10) <= limit : false;
  });
  return pick || source.mp4[0];
}

function readMuted(): boolean {
  try {
    if (typeof GM_getValue === 'function') {
      const v = GM_getValue<string | null>(MUTED_KEY, null);
      if (v !== null) return v === '1';
    }
  } catch {}
  try {
    return localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    if (typeof GM_setValue === 'function') GM_setValue(MUTED_KEY, muted ? '1' : '0');
  } catch {}
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch {}
}

export class Player {
  readonly video: HTMLVideoElement;
  private preloader: HTMLVideoElement;
  private hls: Hls | null = null;
  private generation = 0;
  private captionsUrl = '';
  private captionsBlob = '';
  private _muted = readMuted();
  private _captions = false;
  private listeners = new Set<(e: PlayerEvent) => void>();
  current: Post | null = null;

  constructor() {
    this.video = document.createElement('video');
    this.video.className = 'rr-video';
    this.video.playsInline = true;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.loop = true;
    this.video.preload = 'auto';
    this.video.disableRemotePlayback = true;
    this.video.addEventListener('waiting', () => this.emit('loading'));
    this.video.addEventListener('playing', () => this.emit('ready'));
    this.video.addEventListener('volumechange', () => {
      // A system/native control changed it: adopt as the preference.
      if (this.video.muted !== this._muted && !this.autoplayMuted) {
        this._muted = this.video.muted;
        writeMuted(this._muted);
        this.emit('muted');
      }
    });

    this.preloader = document.createElement('video');
    this.preloader.muted = true;
    this.preloader.preload = 'auto';
    this.preloader.playsInline = true;
  }

  /** True while the browser forced mute because audible autoplay was blocked. */
  autoplayMuted = false;

  get muted(): boolean {
    return this._muted;
  }

  get captions(): boolean {
    return this._captions;
  }

  on(cb: (e: PlayerEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(e: PlayerEvent): void {
    this.listeners.forEach((cb) => {
      try {
        cb(e);
      } catch {}
    });
  }

  private resetSource(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    for (const t of this.video.querySelectorAll('track')) t.remove();
    if (this.captionsBlob) {
      URL.revokeObjectURL(this.captionsBlob);
      this.captionsBlob = '';
    }
    this.captionsUrl = '';
    this.video.removeAttribute('src');
    this.video.removeAttribute('poster');
    try {
      this.video.load();
    } catch {}
  }

  /** Load a post's video into the shared element and start it. */
  async load(post: Post): Promise<void> {
    const gen = ++this.generation;
    this.current = post;
    this.autoplayMuted = false;
    this.resetSource();
    this.emit('loading');

    try {
      if (post.kind === 'video' && post.video) {
        const v = post.video;
        if (v.poster) this.video.poster = v.poster;
        const mp4 = pickMp4(v, isMobile());
        if (mp4) {
          this.video.src = mp4;
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
          this.video.src = v.hls;
        } else if (Hls.isSupported()) {
          this.hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 15, startLevel: -1 });
          this.hls.loadSource(v.hls);
          this.hls.attachMedia(this.video);
        } else {
          throw new Error('no playable source');
        }
        if (v.captions) this.captionsUrl = v.captions;
        this.play();
        if (this._captions) void this.applyCaptions(gen);
      } else if (post.kind === 'redgifs' && post.redgifsId) {
        const info = await getRedgifs(post.redgifsId);
        if (gen !== this.generation) return;
        if (info.poster) this.video.poster = info.poster;
        const blob = await redgifsBlobUrl(pickRedgifsUrl(info, isMobile()));
        if (gen !== this.generation) return;
        this.video.src = blob;
        this.play();
      }
    } catch {
      if (gen === this.generation) this.emit('error');
    }
  }

  /** Warm the cache for the next slide (muted, never audible). */
  preload(post: Post | undefined): void {
    if (!post) return;
    if (post.kind === 'video' && post.video) {
      const mp4 = pickMp4(post.video, isMobile());
      if (mp4 && this.preloader.src !== mp4) {
        this.preloader.src = mp4;
        try {
          this.preloader.load();
        } catch {}
      }
    } else if (post.kind === 'redgifs' && post.redgifsId) {
      getRedgifs(post.redgifsId)
        .then((info) => redgifsBlobUrl(pickRedgifsUrl(info, isMobile())))
        .catch(() => {});
    }
  }

  play(): void {
    const v = this.video;
    v.muted = this._muted;
    const p = v.play();
    p?.catch?.((err: Error) => {
      if (err?.name === 'NotAllowedError' && !v.muted) {
        // Audible autoplay blocked (no gesture yet): play muted, next tap unmutes.
        this.autoplayMuted = true;
        v.muted = true;
        this.emit('autoplay-muted');
        v.play().catch(() => {});
      }
    });
  }

  pause(): void {
    this.video.pause();
  }

  /** Tap: unmute if the browser forced mute, otherwise play/pause. Returns playing state. */
  toggle(): boolean {
    if (this.autoplayMuted && !this._muted) {
      this.autoplayMuted = false;
      this.video.muted = false;
      if (this.video.paused) this.play();
      this.emit('muted');
      return true;
    }
    if (this.video.paused) {
      this.play();
      return true;
    }
    this.video.pause();
    return false;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    this.autoplayMuted = false;
    writeMuted(muted);
    this.video.muted = muted;
    if (!muted && this.video.paused && this.video.src) this.play();
    this.emit('muted');
  }

  toggleCaptions(): boolean {
    this._captions = !this._captions;
    if (this._captions) void this.applyCaptions(this.generation);
    else for (const t of this.video.querySelectorAll('track')) t.remove();
    return this._captions;
  }

  /** Captions are fetched (v.redd.it allows CORS) and attached as a same-origin blob track. */
  private async applyCaptions(gen: number): Promise<void> {
    if (!this.captionsUrl || this.video.querySelector('track')) return;
    try {
      if (!this.captionsBlob) {
        const res = await fetch(this.captionsUrl, { credentials: 'omit' });
        if (!res.ok) return;
        const blob = new Blob([await res.text()], { type: 'text/vtt' });
        if (gen !== this.generation) return;
        this.captionsBlob = URL.createObjectURL(blob);
      }
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.srclang = 'en';
      track.default = true;
      track.src = this.captionsBlob;
      this.video.appendChild(track);
      track.track.mode = 'showing';
    } catch {}
  }

  /** Detach everything (reel closed or non-video slide). */
  stop(): void {
    this.generation++;
    this.current = null;
    this.video.pause();
    this.resetSource();
    this.video.remove();
  }
}
