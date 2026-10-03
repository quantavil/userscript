/**
 * Reel overlay: a full-screen, separately rendered vertical feed on top of
 * Reddit's page. Reddit's page stays underneath (hidden) as the data source.
 *
 * Scrolling rule (measured with real touch flicks in Chrome): any layout change
 * inside the scroll-snap track while a swipe is in flight makes the browser
 * re-snap to the old slide, so the swipe "doesn't count". Therefore:
 * - everything that updates live (seek bar, spinner, pulses, errors) lives in the
 *   fixed HUD layer above the track, never inside a slide;
 * - slide changes (moving the video, mounting neighbours) happen only after the
 *   scroll has settled.
 */

import { extractPost } from '../feed/extract';
import type { FeedSource } from '../feed/source';
import type { Post } from '../feed/types';
import { readVote, vote } from '../feed/vote';
import { isMobile, Player } from '../media/player';
import { escapeHtml, formatTime } from '../utils';
import { ICONS } from './icons';
import css from './reel.css?inline';
import { buildSlide, isVideoKind, mountSlide, postUrl, type SlideRefs, setVoteUi, unmountSlide } from './slide';

const MOUNT_RADIUS = 1;
const LOAD_AHEAD = 5;
const TAP_MS = 260;
const SETTLE_MS = 120;

export interface ReelOptions {
  source: FeedSource;
  feedName: string;
  onClose: (lastPost: Post | null) => void;
  onOpenComments: (post: Post) => void;
}

export class Reel {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private el!: HTMLElement;
  private track!: HTMLElement;
  private hud!: HTMLElement;
  private seek!: HTMLElement;
  private seekFill!: HTMLElement;
  private seekBuffer!: HTMLElement;
  private timeEl!: HTMLElement;
  private errorEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private soundBtn!: HTMLButtonElement;
  private endEl!: HTMLElement;
  private slides: SlideRefs[] = [];
  private slideIds = new Set<string>();
  private active = -1;
  private player = new Player();
  private cleanup: Array<() => void> = [];
  private tapTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTap = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private votes = new Map<string, 1 | 0 | -1>();

  constructor(private opts: ReelOptions) {
    this.host = document.createElement('div');
    this.host.id = 'rr-reel-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });
  }

  get activePost(): Post | null {
    return this.opts.source.posts[this.active] || null;
  }

  open(startIndex: number): void {
    const style = document.createElement('style');
    style.textContent = css;
    this.el = document.createElement('div');
    this.el.className = 'reel';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Reddit reels');
    this.el.innerHTML = `
      <div class="track" tabindex="-1"><section class="slide end"></section></div>
      <div class="hud">
        <div class="spinner"></div>
        <div class="tap-play" aria-hidden="true">${ICONS.play}</div>
        <div class="unmute-hint">${ICONS.soundOff}<span>Tap for sound</span></div>
        <div class="error"></div>
        <div class="seek" role="slider" aria-label="Seek"><div class="rail-line"><div class="buffer"></div><div class="fill"></div></div></div>
        <div class="time"></div>
      </div>
      <div class="top">
        <button type="button" class="icon-btn" data-action="close" aria-label="Close reels">${ICONS.close}</button>
        <span class="feed-name"></span>
        <button type="button" class="icon-btn" data-action="sound" aria-label="Mute"></button>
      </div>
      <div class="toast" role="status" aria-live="polite"></div>
    `;
    this.shadow.append(style, this.el);
    const q = <T extends HTMLElement>(sel: string) => this.el.querySelector(sel) as T;
    this.track = q('.track');
    this.endEl = q('.slide.end');
    this.hud = q('.hud');
    this.seek = q('.seek');
    this.seekFill = q('.seek .fill');
    this.seekBuffer = q('.seek .buffer');
    this.timeEl = q('.time');
    this.errorEl = q('.error');
    this.toastEl = q('.toast');
    this.soundBtn = q('[data-action="sound"]');
    q('.feed-name').textContent = this.opts.feedName;
    document.documentElement.appendChild(this.host);

    this.appendSlides(this.opts.source.posts);
    this.cleanup.push(this.opts.source.onAdded((added) => this.appendSlides(added)));
    this.wireEvents();
    this.syncSound();

    const start = Math.max(0, Math.min(startIndex, this.slides.length - 1));
    this.track.scrollTop = start * this.track.clientHeight;
    this.activate(start);
    this.track.focus({ preventScroll: true });
  }

  close(): void {
    this.player.dispose();
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.tapTimer) clearTimeout(this.tapTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.host.remove();
  }

  // ---------- slides ----------

  private appendSlides(posts: Post[]): void {
    // If the user is parked on the "Loading more" slide, keep them in place:
    // otherwise the browser would follow that slide down past the new ones.
    const wasOnEnd = this.active >= 0 && this.currentIndex() >= this.slides.length;
    const firstNew = this.slides.length;
    for (const post of posts) {
      if (this.slideIds.has(post.id)) continue;
      this.slideIds.add(post.id);
      const refs = buildSlide(post, this.slides.length);
      this.slides.push(refs);
      this.track.insertBefore(refs.root, this.endEl);
      this.votes.set(post.id, readVote(post));
      setVoteUi(refs, this.votes.get(post.id) || 0, post.score);
    }
    this.syncEnd();
    if (wasOnEnd && this.slides.length > firstNew) {
      this.track.scrollTop = firstNew * this.track.clientHeight;
      this.activate(firstNew);
    } else if (this.active >= 0) {
      this.mountAround(this.active);
    }
  }

  private syncEnd(): void {
    this.endEl.textContent = this.opts.source.hasMore ? 'Loading more…' : "You're all caught up";
  }

  /** Slide index at the current scroll position (slides.length = the end slide). */
  private currentIndex(): number {
    return Math.round(this.track.scrollTop / Math.max(1, this.track.clientHeight));
  }

  private onScroll(): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.settle(), SETTLE_MS);
  }

  /** Scroll came to rest: now (and only now) switch the active slide. */
  private settle(): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = null;
    const i = this.currentIndex();
    if (i >= this.slides.length) {
      this.loadMore();
      return;
    }
    if (i !== this.active) this.activate(i);
  }

  private mountAround(center: number): void {
    this.slides.forEach((refs, i) => {
      const post = this.opts.source.posts[i];
      if (!post) return;
      if (Math.abs(i - center) <= MOUNT_RADIUS) mountSlide(refs, post, i === center);
      else unmountSlide(refs);
    });
  }

  private activate(i: number): void {
    const posts = this.opts.source.posts;
    const post = posts[i];
    if (!post) return;
    this.slides[this.active]?.root.classList.remove('active');
    this.active = i;
    const refs = this.slides[i];
    refs.root.classList.add('active');
    this.setState({ loading: false, blocked: false, error: '' });
    this.mountAround(i);
    // Fallback players are iframes we can't pause: they only live on the active slide.
    this.track.querySelectorAll('iframe.rg-fallback').forEach((f) => {
      if (!refs.root.contains(f)) f.remove();
    });

    const video = isVideoKind(post);
    this.el.classList.toggle('has-video', video);
    this.updateSeek(true);
    if (post.kind === 'video' && post.el?.isConnected) {
      // Reddit fills in the direct mp4 (packaged-media-json) a while after render; re-read it.
      const fresh = extractPost(post.el);
      if (fresh?.video) post.video = fresh.video;
    }
    if (video) {
      // Move the one shared <video> into this slide, then load it.
      refs.media.querySelector('img.poster')?.remove();
      refs.media.prepend(this.player.video);
      this.setState({ loading: true });
      void this.player.load(post);
    } else {
      this.player.stop();
    }
    this.player.preload(posts[i + 1]);

    // Keep the feed flowing.
    if (i >= posts.length - LOAD_AHEAD) this.loadMore();
  }

  private loadMore(): void {
    if (!this.opts.source.hasMore) {
      this.syncEnd();
      return;
    }
    void this.opts.source.loadMore().then(() => this.syncEnd());
  }

  private go(delta: number): void {
    const next = Math.max(0, Math.min(this.slides.length - 1, this.currentIndex() + delta));
    this.track.scrollTo({ top: next * this.track.clientHeight, behavior: 'smooth' });
  }

  // ---------- HUD state (outside the scroll track) ----------

  private setState(s: { loading?: boolean; blocked?: boolean; error?: string }): void {
    if (s.loading !== undefined) this.el.classList.toggle('loading', s.loading);
    if (s.blocked !== undefined) this.el.classList.toggle('blocked', s.blocked);
    if (s.error !== undefined) {
      this.errorEl.innerHTML = s.error;
      this.el.classList.toggle('errored', !!s.error);
    }
  }

  // ---------- events ----------

  private wireEvents(): void {
    this.el.addEventListener('click', (e) => this.onClick(e as MouseEvent));

    this.track.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.track.addEventListener('scrollend', () => this.settle());

    const onKey = (e: KeyboardEvent) => this.onKey(e);
    window.addEventListener('keydown', onKey, true);
    this.cleanup.push(() => window.removeEventListener('keydown', onKey, true));

    this.cleanup.push(
      this.player.on((ev) => {
        if (ev === 'ready') this.setState({ loading: false, blocked: false });
        if (ev === 'loading' && this.player.video.readyState < 3) this.setState({ loading: true });
        if (ev === 'blocked') this.setState({ loading: false, blocked: true });
        if (ev === 'error') this.onPlayerError();
        if (ev === 'muted' || ev === 'autoplay-muted') this.syncSound();
      })
    );

    const v = this.player.video;
    v.addEventListener('timeupdate', () => this.updateSeek());
    v.addEventListener('progress', () => this.updateSeek());
    v.addEventListener('loadedmetadata', () => {
      const refs = this.slides[this.active];
      if (refs && v.videoWidth && v.videoHeight) {
        refs.root.classList.toggle('portrait', v.videoHeight / v.videoWidth >= 1.5);
      }
    });
    this.wireSeek();
  }

  private onClick(e: MouseEvent): void {
    const target = e.composedPath()[0] as HTMLElement;
    const btn = target.closest?.('[data-action]') as HTMLElement | null;
    if (btn) {
      e.preventDefault();
      this.runAction(btn.dataset.action || '', btn);
      return;
    }
    if (target.closest?.('a, .card-inner, .seek, .gallery .count, .top')) return;
    if (target.closest?.('.title')) {
      target.closest('.title')?.classList.toggle('open');
      return;
    }
    if (!target.closest?.('.slide')) return;

    // Single tap = play/pause (or unmute), double tap = upvote.
    const now = Date.now();
    if (now - this.lastTap < TAP_MS) {
      this.lastTap = 0;
      if (this.tapTimer) clearTimeout(this.tapTimer);
      this.tapTimer = null;
      this.doubleTap();
      return;
    }
    this.lastTap = now;
    this.tapTimer = setTimeout(() => {
      this.tapTimer = null;
      this.singleTap();
    }, TAP_MS);
  }

  private singleTap(): void {
    const post = this.activePost;
    if (!post || !isVideoKind(post) || this.el.classList.contains('errored')) return;
    this.setState({ blocked: false });
    const playing = this.player.toggle();
    this.pulse(playing ? ICONS.play : ICONS.pause);
  }

  private doubleTap(): void {
    const post = this.activePost;
    if (!post) return;
    if (this.votes.get(post.id) !== 1) this.doVote(post, 'up');
    this.pulse(ICONS.heart, 'heart');
  }

  private runAction(action: string, btn: HTMLElement): void {
    const post = this.activePost;
    switch (action) {
      case 'close':
        this.opts.onClose(post);
        break;
      case 'sound':
        // While the browser forced mute, the button means "give me sound".
        this.player.setMuted(this.player.autoplayMuted ? false : !this.player.muted);
        this.syncSound();
        break;
      case 'up':
      case 'down':
        if (post) this.doVote(post, action);
        break;
      case 'comments':
        if (post) this.opts.onOpenComments(post);
        break;
      case 'captions': {
        const on = this.player.toggleCaptions();
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', String(on));
        break;
      }
      case 'fit':
        this.el.classList.toggle('fill');
        this.toast(this.el.classList.contains('fill') ? 'Fill screen' : 'Fit to screen');
        break;
    }
  }

  private onKey(e: KeyboardEvent): void {
    const t = e.composedPath()[0] as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key;
    let handled = true;
    if (k === 'ArrowDown' || k === 'j' || k === 'J' || k === 'PageDown') this.go(1);
    else if (k === 'ArrowUp' || k === 'k' || k === 'K' || k === 'PageUp') this.go(-1);
    else if (k === ' ' || k === 'Spacebar') this.singleTap();
    else if (k === 'm' || k === 'M') this.runAction('sound', this.soundBtn);
    else if (k === 'f' || k === 'F') this.runAction('fit', this.soundBtn);
    else if (k === 'c' || k === 'C') {
      const cc = this.slides[this.active]?.root.querySelector<HTMLElement>('[data-action="captions"]');
      if (cc) this.runAction('captions', cc);
    } else if (k === 'Escape') this.opts.onClose(this.activePost);
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      const strip = this.slides[this.active]?.media.querySelector<HTMLElement>('.gallery');
      if (strip) strip.scrollBy({ left: (k === 'ArrowRight' ? 1 : -1) * strip.clientWidth, behavior: 'smooth' });
      else if (this.activePost && isVideoKind(this.activePost)) {
        this.player.video.currentTime += k === 'ArrowRight' ? 5 : -5;
      }
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // ---------- voting ----------

  private doVote(post: Post, dir: 'up' | 'down'): void {
    if (!post.el?.isConnected) {
      this.toast('Open the post on Reddit to vote');
      return;
    }
    // Logged-out Reddit renders a login button; its login dialog would open inside the hidden page.
    if (document.querySelector('#login-button')) {
      this.toast('Log in to Reddit to vote');
      return;
    }
    const before = this.votes.get(post.id) || 0;
    if (!vote(post, dir)) {
      this.toast('Voting is not available for this post');
      return;
    }
    const wanted: 1 | -1 = dir === 'up' ? 1 : -1;
    const after: 1 | 0 | -1 = before === wanted ? 0 : wanted;
    this.votes.set(post.id, after);
    const refs = this.slides[this.opts.source.posts.indexOf(post)];
    if (refs) setVoteUi(refs, after, post.score + after - before);
    // Trust Reddit's button state once it settles.
    setTimeout(() => {
      const real = readVote(post);
      if (real !== after && post.el?.isConnected && refs) {
        this.votes.set(post.id, real);
        setVoteUi(refs, real, post.score + real - before);
      }
    }, 900);
  }

  // ---------- seek bar (HUD) ----------

  private wireSeek(): void {
    const seek = this.seek;
    const v = this.player.video;
    const seekTo = (clientX: number) => {
      const rect = seek.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
      if (Number.isFinite(v.duration)) {
        v.currentTime = ratio * v.duration;
        this.timeEl.textContent = `${formatTime(v.currentTime)} / ${formatTime(v.duration)}`;
      }
      this.updateSeek();
    };
    seek.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      seek.setPointerCapture(e.pointerId);
      seek.classList.add('dragging');
      seekTo(e.clientX);
    });
    seek.addEventListener('pointermove', (e) => {
      if (seek.classList.contains('dragging')) seekTo(e.clientX);
    });
    const end = (e: PointerEvent) => {
      seek.classList.remove('dragging');
      try {
        seek.releasePointerCapture(e.pointerId);
      } catch {}
    };
    seek.addEventListener('pointerup', end);
    seek.addEventListener('pointercancel', end);
  }

  /** Transform-only updates: no layout work at 4 Hz. */
  private updateSeek(reset = false): void {
    const v = this.player.video;
    if (reset || !Number.isFinite(v.duration) || v.duration <= 0) {
      this.seekFill.style.transform = 'scaleX(0)';
      this.seekBuffer.style.transform = 'scaleX(0)';
      return;
    }
    this.seekFill.style.transform = `scaleX(${v.currentTime / v.duration})`;
    try {
      if (v.buffered.length) {
        this.seekBuffer.style.transform = `scaleX(${v.buffered.end(v.buffered.length - 1) / v.duration})`;
      }
    } catch {}
  }

  // ---------- feedback ----------

  private syncSound(): void {
    const muted = this.player.muted || this.player.autoplayMuted;
    this.soundBtn.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
    this.soundBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    this.el.classList.toggle('autoplay-muted', this.player.autoplayMuted && !this.player.muted);
  }

  private pulse(icon: string, cls = ''): void {
    const p = document.createElement('div');
    p.className = `pulse ${cls}`;
    p.innerHTML = icon;
    this.hud.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }

  toast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }

  private onPlayerError(): void {
    const post = this.activePost;
    const refs = this.slides[this.active];
    this.setState({ loading: false });
    if (!post || !refs) return;
    if (post.kind === 'redgifs' && post.redgifsId) {
      this.redgifsFallback(refs, post.redgifsId);
      return;
    }
    this.setState({
      error: `Couldn't play this one. <a href="${escapeHtml(postUrl(post))}" target="_blank" rel="noopener">Open on Reddit</a>`,
    });
    if (isMobile()) this.toast('Swipe for the next one');
  }

  /** RedGifs API/media unreachable: use RedGifs' own player (Reddit's CSP allows its iframe). */
  private redgifsFallback(refs: SlideRefs, id: string): void {
    this.player.stop();
    this.el.classList.remove('has-video');
    if (refs.media.querySelector('iframe.rg-fallback')) return;
    const frame = document.createElement('iframe');
    frame.className = 'rg-fallback';
    frame.src = `https://www.redgifs.com/ifr/${encodeURIComponent(id)}`;
    frame.allow = 'autoplay; fullscreen';
    refs.root.classList.add('vertical-embed');
    refs.media.appendChild(frame);
  }
}
