/**
 * Feed Manager Subsystem
 * Orchestrates post querying, DOM enhancement, infinite scroll mutations,
 * IntersectionObserver playback mutex, and Videos-Only filtering.
 */

import { ReelPost, parsePostElement } from '../extractor';
import { audioManager, applyAudioState, normalizeIframeSrc, resolveMedia } from '../media';
import { renderLinkCard, renderTextCard } from '../cards';
import { renderReelOverlay, syncOverlaySubtitlesButtons } from '../ui/overlay';
import { unconstrainPostMedia, restorePostMedia, applySubtitlesState } from './unconstrainer';
import { POST_SELECTORS, VIDEO_IFRAME_HOSTS_REGEX } from './selectors';

declare function GM_getValue<T>(key: string, defaultValue?: T): T;
declare function GM_setValue(key: string, value: unknown): void;

const VIDEOS_ONLY_KEY = '@reddit-reels/videos-only';
const SUBTITLES_KEY = '@reddit-reels/subtitles';

function readPref(key: string): boolean {
  try {
    if (typeof GM_getValue === 'function') {
      const gmVal = GM_getValue<string | null>(key, null);
      if (gmVal !== null) return gmVal === '1';
    }
  } catch {}
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writePref(key: string, value: boolean): void {
  try {
    if (typeof GM_setValue === 'function') {
      GM_setValue(key, value ? '1' : '0');
    }
  } catch {}
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {}
}

function hasVideoIframe(postEl: HTMLElement): boolean {
  const iframes = postEl.querySelectorAll<HTMLIFrameElement>('iframe');
  for (const ifr of iframes) {
    const src = `${ifr.src || ''} ${ifr.dataset.rrSrc || ''}`;
    if (VIDEO_IFRAME_HOSTS_REGEX.test(src)) {
      return true;
    }
  }
  return false;
}

/**
 * Single source of truth for "does this post have playable video".
 * Uses the fully-resolved postType (which reclassifies RedGifs/Streamable/
 * Gfycat links as video) plus live DOM checks for native video/iframe.
 */
export function hasVideoContent(postEl: HTMLElement, postType?: string): boolean {
  const resolvedType = postType ?? postEl.dataset?.rrPostType;
  if (resolvedType === 'video') return true;
  if (resolvedType === undefined) {
    // Cheap checks first to avoid a full parse + shadow-DOM walk per post.
    if (postEl.getAttribute('post-type') === 'video') return true;
    const domain = postEl.getAttribute('domain') || '';
    const contentHref = postEl.getAttribute('content-href') || '';
    if (/(redgifs\.com|streamable\.com|gfycat\.com)/i.test(domain + ' ' + contentHref)) return true;
    if (hasVideoIframe(postEl)) return true;
    try {
      const parsed = parsePostElement(postEl);
      if (parsed.postType === 'video') return true;
    } catch {}
  }
  return !!audioManager.findVideo(postEl) || hasVideoIframe(postEl);
}

export function getPostElements(): HTMLElement[] {
  const shredditPosts = Array.from(document.querySelectorAll<HTMLElement>('shreddit-post'));
  if (shredditPosts.length > 0) {
    return shredditPosts;
  }
  const rawPosts = Array.from(
    document.querySelectorAll<HTMLElement>('article, [data-testid="post-container"], .Post')
  );
  return rawPosts.filter((el) => {
    return !rawPosts.some((other) => other !== el && other.contains(el));
  });
}

export function getClosestPostToViewport(): HTMLElement | null {
  const posts = getPostElements().filter((p) => !p.classList.contains('rr-filtered-out'));
  if (posts.length === 0) return null;

  const viewportCenter = window.innerHeight / 2;
  let closest: HTMLElement | null = null;
  let minDistance = Infinity;

  for (const post of posts) {
    const rect = post.getBoundingClientRect();
    const postCenter = rect.top + rect.height / 2;
    const distance = Math.abs(postCenter - viewportCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closest = post;
    }
  }

  return closest || posts[0];
}

export interface FeedManagerOptions {
  isReelModeActive: () => boolean;
  /** Called when a post becomes the visible slide. */
  onActivePost?: (post: HTMLElement) => void;
  /** Called after newly streamed posts were enhanced. */
  onPostsAdded?: () => void;
  /** Rail sound button handler. */
  onToggleMute?: () => void;
}

export class FeedManager {
  private options: FeedManagerOptions;
  private feedObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private mutationDebounce: ReturnType<typeof setTimeout> | null = null;
  private videosOnlyMode = false;
  private subtitlesEnabled = false;
  private enhancedPosts = new WeakSet<HTMLElement>();

  constructor(options: FeedManagerOptions) {
    this.options = options;
    this.videosOnlyMode = readPref(VIDEOS_ONLY_KEY);
    this.subtitlesEnabled = readPref(SUBTITLES_KEY);
  }

  public get isVideosOnly(): boolean {
    return this.videosOnlyMode;
  }

  public get isSubtitles(): boolean {
    return this.subtitlesEnabled;
  }

  public setVideosOnly(value: boolean): void {
    this.videosOnlyMode = value;
    writePref(VIDEOS_ONLY_KEY, value);
    this.applyVideosOnlyFilter();
  }

  public toggleVideosOnly(): boolean {
    this.setVideosOnly(!this.videosOnlyMode);
    return this.videosOnlyMode;
  }

  public toggleSubtitles(): boolean {
    this.subtitlesEnabled = !this.subtitlesEnabled;
    writePref(SUBTITLES_KEY, this.subtitlesEnabled);
    document.documentElement.classList.toggle('rr-hide-captions', !this.subtitlesEnabled);
    const posts = getPostElements();
    posts.forEach((p) => applySubtitlesState(p, this.subtitlesEnabled));
    syncOverlaySubtitlesButtons(this.subtitlesEnabled);
    return this.subtitlesEnabled;
  }

  public enhancePost(postEl: HTMLElement): void {
    if (postEl.querySelector('.rr-post-overlay')) return;

    const post: ReelPost = parsePostElement(postEl);
    const hasVideo = hasVideoContent(postEl, post.postType);
    const isLinkPost = post.postType === 'link';
    const isTextPost = post.postType === 'text';

    // 1. Scoped cleanup of custom shadowRoot to prevent Reddit's native action bar and clutter from leaking.
    // Vote controls stay programmatically clickable: hide them off-screen
    // instead of display:none so proxy .click() still reaches Lit handlers.
    if (postEl.shadowRoot) {
      if (!postEl.shadowRoot.querySelector('#rr-shadow-cleanup-style')) {
        const shadowStyle = document.createElement('style');
        shadowStyle.id = 'rr-shadow-cleanup-style';
        shadowStyle.textContent = `
          rpl-action-bar,
          shreddit-action-bar,
          shreddit-post-action-row,
          feed-post-action-row,
          [data-testid="action-row"],
          [data-testid="post-vote-control"],
          shreddit-vote-animations,
          slot[name="share-button"],
          slot[name="credit-bar"],
          slot[name="action-row"] {
            display: none !important;
            visibility: hidden !important;
          }
          shreddit-post-vote-control,
          slot[name="vote"],
          slot[name="vote-button"] {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            opacity: 0 !important;
            pointer-events: none !important;
            overflow: hidden !important;
          }
        `;
        postEl.shadowRoot.appendChild(shadowStyle);
      }
    }

    // 2. Handle post type rendering
    if (isLinkPost) {
      postEl.classList.add('rr-is-link');
      renderLinkCard(postEl, post);
    } else if (isTextPost) {
      postEl.classList.add('rr-is-text');
      renderTextCard(postEl, post);
    } else {
      // Video, Image, or Gallery
      // If it's a video post without native video or iframe (e.g. RedGifs / Streamable), embed iframe or video
      if (post.postType === 'video' && !postEl.querySelector('video, iframe')) {
        const media = resolveMedia(post);
        const container =
          postEl.querySelector<HTMLElement>('[slot="post-media-container"]') ||
          postEl.querySelector<HTMLElement>('.media-container') ||
          postEl;
        if (media.type === 'iframe' && media.src) {
          const iframe = document.createElement('iframe');
          // Parked until this post is the visible slide (AudioManager loads it then):
          // eagerly loading every RedGifs embed lets them all autoplay with sound.
          iframe.src = 'about:blank';
          iframe.dataset.rrSrc = normalizeIframeSrc(media.src, audioManager.isMuted);
          iframe.className = 'rr-embedded-iframe';
          iframe.tabIndex = -1;
          iframe.setAttribute('loading', 'eager');
          iframe.setAttribute('frameborder', '0');
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
          container.appendChild(iframe);
          try { iframe.blur(); } catch {}
          audioManager.invalidateVideoCache(postEl);
        } else if (media.type === 'video' && media.src) {
          const vid = document.createElement('video');
          vid.src = media.src;
          vid.className = 'rr-embedded-video';
          vid.playsInline = true;
          vid.setAttribute('playsinline', '');
          vid.setAttribute('loop', '');
          vid.muted = audioManager.isMuted;
          vid.autoplay = true;
          container.appendChild(vid);
          audioManager.invalidateVideoCache(postEl);
        }
      }

      unconstrainPostMedia(postEl);
      applySubtitlesState(postEl, this.subtitlesEnabled);
    }

    // 3. Filter out if videos-only mode is active
    if (this.videosOnlyMode && !hasVideo) {
      postEl.classList.add('rr-filtered-out');
    } else {
      postEl.classList.remove('rr-filtered-out');
    }
    postEl.style.removeProperty('display');

    // 4. Suppress native elements via scoped class (no inline style pollution).
    // Vote slots use off-screen hiding so vote proxy clicks still work.
    const NATIVE_SUPPRESSION_SELECTORS =
      '[slot="credit-bar"], [slot="post-credit-bar"], [slot="title-and-metadata"], [slot="title"], [slot="action-row"], [slot="text-body"], shreddit-post-action-row, feed-post-action-row, shreddit-action-bar, rpl-action-bar, shreddit-post-credit-bar, faceplate-tracker, shreddit-interaction-container';
    const VOTE_OFFSCREEN_SELECTORS =
      '[slot="vote"], [slot="vote-button"], shreddit-post-vote-control, [data-testid="post-vote-control"]';

    Array.from(postEl.children).forEach((child) => {
      const el = child as HTMLElement;
      if (
        el.classList?.contains('rr-post-overlay') ||
        el.classList?.contains('rr-link-card-container') ||
        el.classList?.contains('rr-text-card-container')
      ) {
        return;
      }
      if (el.matches?.(NATIVE_SUPPRESSION_SELECTORS)) {
        el.classList.add('rr-native-suppressed');
        return;
      }
      if (el.matches?.(VOTE_OFFSCREEN_SELECTORS)) {
        el.classList.add('rr-native-offscreen');
        return;
      }
      if (
        !isLinkPost &&
        !isTextPost &&
        (el.matches?.(
          '[slot="post-media-container"], shreddit-player-2, .media-container, gallery-carousel, faceplate-carousel, shreddit-aspect-ratio, shreddit-async-loader, shreddit-player-captions, [slot="captions"]'
        ) ||
          el.querySelector('video, img:not(.shreddit-subreddit-icon__icon), iframe, gallery-carousel, faceplate-carousel, shreddit-player-2, shreddit-player-captions') !== null)
      ) {
        return;
      }
      el.classList.add('rr-native-suppressed');
    });

    postEl.querySelectorAll<HTMLElement>(NATIVE_SUPPRESSION_SELECTORS).forEach((el) => {
      el.classList.add('rr-native-suppressed');
    });

    postEl.querySelectorAll<HTMLElement>(VOTE_OFFSCREEN_SELECTORS).forEach((el) => {
      el.classList.add('rr-native-offscreen');
    });

    // 5. Render overlay rail and metadata
    renderReelOverlay(postEl, post, {
      hasVideo,
      isSubtitlesEnabled: () => this.subtitlesEnabled,
      onToggleMute: this.options.onToggleMute,
      onToggleSubtitles: () => this.toggleSubtitles(),
      onToggleFitFill: () => {
        const isContain = postEl.classList.contains('rr-fit-contain');
        if (isContain) {
          postEl.classList.remove('rr-fit-contain');
          postEl.classList.add('rr-fit-cover');
        } else {
          postEl.classList.remove('rr-fit-cover');
          postEl.classList.add('rr-fit-contain');
        }
      },
    });
    this.enhancedPosts.add(postEl);
  }

  /**
   * Reverses enhancements on a single post element, completely restoring native Reddit state
   */
  public restorePost(postEl: HTMLElement): void {
    // 1. Remove injected overlays and card containers
    postEl.querySelectorAll<HTMLElement>(
      '.rr-post-overlay, .rr-text-card-container, .rr-link-card-container'
    ).forEach((el) => el.remove());

    // 2. Remove injected iframe and video embeds
    postEl.querySelectorAll<HTMLIFrameElement>('iframe.rr-embedded-iframe').forEach((ifr) => {
      ifr.remove();
    });
    postEl.querySelectorAll<HTMLVideoElement>('video.rr-embedded-video').forEach((vid) => {
      vid.remove();
    });

    // 2b. Restore native iframes that were blanked during playback
    postEl.querySelectorAll<HTMLIFrameElement>('iframe').forEach((ifr) => {
      if (ifr.dataset.rrSrc) {
        ifr.src = ifr.dataset.rrSrc;
        delete ifr.dataset.rrSrc;
      }
    });

    // 3. Remove shadowRoot cleanup styles and clear inline styles
    if (postEl.shadowRoot) {
      const cleanupStyle = postEl.shadowRoot.querySelector('#rr-shadow-cleanup-style');
      cleanupStyle?.remove();
      const shadowActionBars = postEl.shadowRoot.querySelectorAll<HTMLElement>(
        'rpl-action-bar, [data-testid="action-row"], .shreddit-post-container, slot[name="action-row"], slot[name="share-button"], slot[name="credit-bar"]'
      );
      shadowActionBars.forEach((el) => {
        el.style.removeProperty('display');
      });
    }

    // 4. Remove suppressed class and any lingering inline display styles on native children
    postEl.querySelectorAll<HTMLElement>('.rr-native-suppressed, .rr-native-offscreen').forEach((el) => {
      el.classList.remove('rr-native-suppressed', 'rr-native-offscreen');
      el.style.removeProperty('display');
    });
    for (let i = 0; i < postEl.children.length; i++) {
      const el = postEl.children[i] as HTMLElement;
      if (el.classList?.contains('rr-native-suppressed') || el.classList?.contains('rr-native-offscreen')) {
        el.classList.remove('rr-native-suppressed', 'rr-native-offscreen');
      }
      el.style?.removeProperty('display');
    }

    // 5. Restore media unconstraining & aspect ratio
    restorePostMedia(postEl);

    // 6. Remove post-level classes and inline display
    postEl.classList.remove('rr-filtered-out', 'rr-is-link', 'rr-is-text');
    this.enhancedPosts.delete(postEl);
    postEl.style.removeProperty('display');
  }

  public teardownAllPosts(): void {
    // Only undo what we did: Reddit's post page renders its own untouched shreddit-post.
    const posts = getPostElements().filter((p) => this.enhancedPosts.has(p));
    posts.forEach((p) => this.restorePost(p));
    document.querySelector('.rr-empty-feed')?.remove();
    if (typeof document !== 'undefined') {
      document.querySelectorAll<HTMLIFrameElement>('iframe[data-rr-src]').forEach((ifr) => {
        ifr.src = ifr.dataset.rrSrc!;
        delete ifr.dataset.rrSrc;
      });
    }
  }

  public enhanceAllPosts(): void {
    const posts = getPostElements();
    posts.forEach((p) => this.enhancePost(p));
  }

  public applyVideosOnlyFilter(): void {
    const posts = getPostElements();
    let visibleCount = 0;
    for (const postEl of posts) {
      const hasVideo = hasVideoContent(postEl, postEl.dataset?.rrPostType);
      if (this.videosOnlyMode && !hasVideo) {
        postEl.classList.add('rr-filtered-out');
      } else {
        postEl.classList.remove('rr-filtered-out');
        visibleCount++;
      }
      postEl.style.removeProperty('display');
    }

    const existingEmpty = document.querySelector('.rr-empty-feed');
    if (this.videosOnlyMode && posts.length > 0 && visibleCount === 0) {
      if (!existingEmpty) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'rr-empty-feed';
        emptyEl.innerHTML = `
          <div class="rr-empty-title">No videos found</div>
          <div class="rr-empty-subtitle">Tap here to view all posts</div>
        `;
        emptyEl.onclick = () => this.toggleVideosOnly();
        const feedContainer = document.querySelector('.rr-feed-container') || document.body;
        feedContainer.appendChild(emptyEl);
      }
    } else {
      existingEmpty?.remove();
    }
  }

  public startObservers(): void {
    this.stopObservers();
    document.documentElement.classList.toggle('rr-hide-captions', !this.subtitlesEnabled);

    this.feedObserver = new IntersectionObserver(
      (entries) => {
        if (!this.options.isReelModeActive()) return;

        for (const entry of entries) {
          const post = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Active post: Ensure unconstrained full-bleed scaling & play audio
            unconstrainPostMedia(post);
            applySubtitlesState(post, this.subtitlesEnabled);
            audioManager.requestPlayback(post);
            this.options.onActivePost?.(post);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
            // Inactive post: pause + mute immediately (zero bleed).
            applyAudioState(post, true);
            const video = audioManager.findVideo(post);
            if (video) {
              try {
                if (!video.paused) video.pause();
                video.muted = true;
              } catch {}
            }
          }
        }
      },
      {
        threshold: [0.2, 0.5, 0.8],
      }
    );

    const posts = getPostElements();
    posts.forEach((p) => this.feedObserver?.observe(p));

    this.mutationObserver = new MutationObserver((mutations) => {
      if (!this.options.isReelModeActive()) return;

      const addedElements: HTMLElement[] = [];
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.matches?.(POST_SELECTORS)) {
              addedElements.push(el);
            } else if (el.querySelectorAll) {
              const inner = el.querySelectorAll<HTMLElement>(POST_SELECTORS);
              inner.forEach((p) => addedElements.push(p));
            }
          }
        }
        for (let i = 0; i < mutation.removedNodes.length; i++) {
          const node = mutation.removedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.matches?.(POST_SELECTORS)) {
              this.feedObserver?.unobserve(el);
            }
          }
        }
      }

      if (addedElements.length === 0) return;

      if (this.mutationDebounce) clearTimeout(this.mutationDebounce);
      this.mutationDebounce = setTimeout(() => {
        this.mutationDebounce = null;
        if (!this.options.isReelModeActive()) return;
        for (const p of addedElements) {
          if (!this.enhancedPosts.has(p)) {
            this.enhancePost(p);
            this.feedObserver?.observe(p);
          }
        }
        this.applyVideosOnlyFilter();
        this.options.onPostsAdded?.();
      }, 150);
    });

    this.mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  public stopObservers(): void {
    if (this.feedObserver) {
      this.feedObserver.disconnect();
      this.feedObserver = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.mutationDebounce) {
      clearTimeout(this.mutationDebounce);
      this.mutationDebounce = null;
    }
  }

  public scrollToNext(): void {
    const posts = getPostElements().filter((p) => !p.classList.contains('rr-filtered-out'));
    const active = getClosestPostToViewport();
    if (!active || posts.length === 0) return;
    const currentIndex = posts.indexOf(active);
    if (currentIndex >= 0 && currentIndex < posts.length - 1) {
      posts[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  public scrollToPrev(): void {
    const posts = getPostElements().filter((p) => !p.classList.contains('rr-filtered-out'));
    const active = getClosestPostToViewport();
    if (!active || posts.length === 0) return;
    const currentIndex = posts.indexOf(active);
    if (currentIndex > 0) {
      posts[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
