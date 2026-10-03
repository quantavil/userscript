/**
 * Input Controller Subsystem
 * Handles keyboard hotkeys and tap gestures (play/pause, double-tap upvote).
 * Taps on Reddit's native player controls are left to the player.
 */

import type { ReelPost } from '../extractor/types';
import { audioManager, unlockAudio } from '../media';
import { proxyUpvote } from '../extractor/vote-proxy';
import { showPlayPulse, showScalePulse, showVotePulse, showVolumePulse } from '../ui/pulse';

export const POST_SELECTORS = 'shreddit-post, article, [data-testid="post-container"], .Post';
export const VOLUME_STEP = 0.1;
const TAP_WINDOW_MS = 320;
const SWIPE_CANCEL_PX = 10;

export interface InputControllerOptions {
  isReelModeActive: () => boolean;
  getActivePost: () => HTMLElement | null;
  getActiveReelPost?: () => ReelPost | null;
  onDoubleTap?: (tappedPost: HTMLElement) => void;
  onExit: () => void;
  onToggleMute: () => void;
  onVolumeChange?: (level: number, muted: boolean) => void;
  onToggleSubtitles?: () => void;
  onNextPost?: () => void;
  onPrevPost?: () => void;
}

export class InputController {
  private options: InputControllerOptions;
  private lastTapTimestamp = 0;
  private lastTapPost: HTMLElement | null = null;
  private tapCount = 0;
  private singleTapTimer: ReturnType<typeof setTimeout> | null = null;
  private clickListener: ((e: MouseEvent) => void) | null = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private pointerListener: ((e: PointerEvent) => void) | null = null;
  private downX = 0;
  private downY = 0;
  private downActive = false;

  constructor(options: InputControllerOptions) {
    this.options = options;
  }

  public attach(): void {
    if (!this.clickListener) {
      this.clickListener = (e: MouseEvent) => this.handleTap(e);
      document.addEventListener('click', this.clickListener, true);
    }

    if (!this.keydownListener) {
      this.keydownListener = (e: KeyboardEvent) => this.handleKeyDown(e);
      window.addEventListener('keydown', this.keydownListener, true);
    }

    if (!this.pointerListener) {
      this.pointerListener = (e: PointerEvent) => {
        if (e.type === 'pointerdown') {
          this.downX = e.clientX;
          this.downY = e.clientY;
          this.downActive = true;
        } else {
          this.downActive = false;
        }
      };
      document.addEventListener('pointerdown', this.pointerListener as EventListener, true);
      document.addEventListener('pointerup', this.pointerListener as EventListener, true);
    }
  }

  public detach(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }

    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener, true);
      this.keydownListener = null;
    }

    if (this.pointerListener) {
      document.removeEventListener('pointerdown', this.pointerListener as EventListener, true);
      document.removeEventListener('pointerup', this.pointerListener as EventListener, true);
      this.pointerListener = null;
    }

    this.lastTapTimestamp = 0;
    this.lastTapPost = null;
    this.tapCount = 0;
    this.downActive = false;
    if (this.singleTapTimer) {
      clearTimeout(this.singleTapTimer);
      this.singleTapTimer = null;
    }
  }

  private fireSingleTap(post: HTMLElement): void {
    if (!this.options.isReelModeActive()) return;
    const isPlaying = audioManager.togglePlayback(post);
    showPlayPulse(isPlaying);
  }

  public toggleFitFill(post: HTMLElement): void {
    const isCurrentlyContain = post.classList.contains('rr-fit-contain');
    if (isCurrentlyContain) {
      post.classList.remove('rr-fit-contain');
      post.classList.add('rr-fit-cover');
      showScalePulse('Fill (Full Bleed)');
    } else {
      post.classList.remove('rr-fit-cover');
      post.classList.add('rr-fit-contain');
      showScalePulse('Fit (Original)');
    }
  }

  private handleTap(e: MouseEvent): void {
    if (!this.options.isReelModeActive()) return;
    // Programmatic clicks (vote proxy, native comments link) must reach Reddit untouched.
    if (!e.isTrusted) return;

    const target = e.target as HTMLElement;
    // Allow clicks on reel controls, comments drawer, link cards, text card links, author/sub badges, gallery nav
    if (
      target.closest(
        '.rr-action-rail, .rr-post-info, .rr-header-cluster, .rr-link-card-container, .rr-sub-badge, .rr-author, .rr-link-card-btn, button[slot="previous-button"], button[slot="next-button"], .prev-btn, .next-btn'
      )
    ) {
      return;
    }
    // Reddit's native player controls (seek bar, play, volume, captions, fullscreen) stay native.
    if (this.isNativeControl(e)) return;
    if (target.closest('.rr-text-card-body a')) {
      return;
    }

    const post = target.closest(POST_SELECTORS) as HTMLElement | null;
    if (!post) return;

    // Suppress native Reddit navigation: bare media taps toggle playback,
    // only explicit overlay/card buttons may open external URLs.
    e.preventDefault();
    e.stopPropagation();

    // Gallery swipe ending in a click must not toggle playback.
    if (this.wasSwipe(e)) {
      this.resetTapState();
      return;
    }

    // On any tap, unlock audio permission
    unlockAudio();
    audioManager.reassertActiveIframeUnmute();

    // Double-tap toggles Fit/Fill scaling (contain/cover)
    const now = Date.now();
    const samePost = this.lastTapPost === post;
    const inWindow = now - this.lastTapTimestamp < TAP_WINDOW_MS;
    if (inWindow && samePost) {
      this.tapCount += 1;
    } else {
      this.tapCount = 1;
    }
    this.lastTapTimestamp = now;
    this.lastTapPost = post;

    if (this.tapCount === 2) {
      if (this.singleTapTimer) {
        clearTimeout(this.singleTapTimer);
        this.singleTapTimer = null;
      }
      this.resetTapState();
      if (this.options.onDoubleTap) {
        this.options.onDoubleTap(post);
      } else {
        this.toggleFitFill(post);
      }
      return;
    }

    if (this.singleTapTimer) {
      clearTimeout(this.singleTapTimer);
    }
    this.singleTapTimer = setTimeout(() => {
      this.singleTapTimer = null;
      this.resetTapState();
      this.fireSingleTap(post);
    }, TAP_WINDOW_MS);
  }

  private isNativeControl(e: MouseEvent): boolean {
    try {
      const path = e.composedPath() as Element[];
      for (const node of path) {
        const tag = (node as Element).tagName?.toLowerCase?.();
        if (!tag) continue;
        if (tag === 'shreddit-post' || tag === 'article') break;
        if (tag === 'button' || tag === 'input' || tag === 'select' || tag.includes('controls')) return true;
        const role = (node as Element).getAttribute?.('role');
        if (role === 'slider' || role === 'button' || role === 'menuitem') return true;
      }
    } catch {}
    return false;
  }

  private wasSwipe(e: MouseEvent): boolean {
    try {
      const dx = e.clientX - this.downX;
      const dy = e.clientY - this.downY;
      return Math.hypot(dx, dy) > SWIPE_CANCEL_PX;
    } catch {
      return false;
    }
  }

  private resetTapState(): void {
    this.lastTapTimestamp = 0;
    this.lastTapPost = null;
    this.tapCount = 0;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.options.isReelModeActive()) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    if (e.key === 'Escape') {
      this.options.onExit();
    } else if (e.key === 'm' || e.key === 'M') {
      this.options.onToggleMute();
    } else if (e.key === 'f' || e.key === 'F') {
      const post = this.options.getActivePost();
      if (post) this.toggleFitFill(post);
    } else if (e.key === '+' || e.key === '=' || (e.shiftKey && e.key === 'ArrowUp')) {
      e.preventDefault();
      this.changeVolume(VOLUME_STEP);
    } else if (e.key === '-' || e.key === '_' || (e.shiftKey && e.key === 'ArrowDown')) {
      e.preventDefault();
      this.changeVolume(-VOLUME_STEP);
    } else if (e.key === 'c' || e.key === 'C') {
      this.options.onToggleSubtitles?.();
    } else if (e.key === 'j' || e.key === 'J' || (!e.shiftKey && e.key === 'ArrowDown')) {
      e.preventDefault();
      this.options.onNextPost?.();
    } else if (e.key === 'k' || e.key === 'K' || (!e.shiftKey && e.key === 'ArrowUp')) {
      e.preventDefault();
      this.options.onPrevPost?.();
    }
  }

  private changeVolume(delta: number): void {
    unlockAudio();
    const post = this.options.getActivePost();
    const level = audioManager.adjustVolume(delta, post || undefined);
    audioManager.reassertActiveIframeUnmute();
    showVolumePulse(level, audioManager.isMuted);
    this.options.onVolumeChange?.(level, audioManager.isMuted);
  }
}
