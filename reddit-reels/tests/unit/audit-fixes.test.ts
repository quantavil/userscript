import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { backupElementState, restoreElementState, clearAllRrState } from '../../src/core/teardown-store';
import { getActiveCarouselSlide, findActiveSlideVideo } from '../../src/media/gallery-media';
import { isSafeUrl, sanitizeUrl } from '../../src/utils';
import { SELECTORS } from '../../src/core/selectors';
import { renderReelOverlay } from '../../src/ui/overlay';
import { renderTextCard } from '../../src/cards/text-card';
import { renderLinkCard } from '../../src/cards/link-card';
import { createTopBar } from '../../src/ui/top-bar';
import { unconstrainPostMedia } from '../../src/core/unconstrainer';
import { ReelPost } from '../../src/extractor/types';
import { AudioManager, applyAudioState } from '../../src/media/audio-manager';

describe('Audit Fixes & Robustness Tests', () => {
  let window: GlobalWindow;
  let document: Document;

  beforeEach(() => {
    window = new GlobalWindow();
    document = window.document;
    (globalThis as any).window = window;
    (globalThis as any).document = document;
    (globalThis as any).Node = window.Node;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).HTMLIFrameElement = window.HTMLIFrameElement;
    (globalThis as any).HTMLVideoElement = window.HTMLVideoElement;
    (globalThis as any).HTMLImageElement = window.HTMLImageElement;
    (globalThis as any).MutationObserver = window.MutationObserver;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it('Issue 5: teardown-store cleanly backs up and restores original styles and cleans rr dataset', () => {
    const el = document.createElement('div');
    el.style.height = '300px';
    el.style.width = '200px';
    el.setAttribute('data-original', 'val');
    el.dataset.rrWired = '1';
    el.dataset.rrUnconstrained = '1';

    backupElementState(el, ['data-original']);

    // Mutate
    el.style.height = '100dvh';
    el.style.width = '100vw';
    el.setAttribute('data-original', 'changed');
    el.dataset.rrNewFlag = 'test';

    // Restore
    restoreElementState(el);
    expect(el.style.height).toBe('300px');
    expect(el.style.width).toBe('200px');
    expect(el.getAttribute('data-original')).toBe('val');

    clearAllRrState(el);
    expect(el.dataset.rrWired).toBeUndefined();
    expect(el.dataset.rrUnconstrained).toBeUndefined();
    expect(el.dataset.rrNewFlag).toBeUndefined();
  });

  it('Issue 6: safeUrl validates protocols and rejects unsafe schemes', () => {
    expect(isSafeUrl('https://www.reddit.com/r/test')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('https://reddit.com')).toBe('https://reddit.com');
  });

  it('Issue 2: findActiveSlideVideo returns the video from the visible carousel slide', () => {
    const carousel = document.createElement('div');
    carousel.innerHTML = `
      <ul slot="items">
        <li style="position: absolute; left: 0px;" class="slide-0">
          <video id="v0"></video>
        </li>
        <li style="position: absolute; left: 500px;" class="slide-1">
          <video id="v1"></video>
        </li>
      </ul>
    `;
    const ul = carousel.querySelector('ul')!;
    const slides = carousel.querySelectorAll('li');
    Object.defineProperty(slides[0], 'offsetLeft', { value: 0 });
    Object.defineProperty(slides[1], 'offsetLeft', { value: 500 });
    Object.defineProperty(ul, 'scrollLeft', { value: 500 });

    const activeSlide = getActiveCarouselSlide(carousel);
    expect(activeSlide).toBe(slides[1]);

    const activeVideo = findActiveSlideVideo(carousel);
    expect(activeVideo?.id).toBe('v1');
  });

  it('Issue 1: applyAudioState plays only the active targeted video, leaving others paused', () => {
    const postEl = document.createElement('div');
    const v1 = document.createElement('video') as HTMLVideoElement;
    const v2 = document.createElement('video') as HTMLVideoElement;

    let v1Played = false;
    let v2Played = false;
    v1.play = async () => { v1Played = true; };
    v2.play = async () => { v2Played = true; };
    v1.pause = () => {};
    v2.pause = () => {};

    postEl.appendChild(v1);
    postEl.appendChild(v2);

    applyAudioState(postEl, false, 1.0, v1);

    expect(v1Played).toBe(true);
    expect(v2Played).toBe(false);
  });

  it('Issue 3: AudioManager.togglePlayback toggles video play/pause through the mutex', () => {
    const manager = new AudioManager(false);
    const postEl = document.createElement('div');
    const video = document.createElement('video') as HTMLVideoElement;
    let played = false;
    let paused = false;

    video.play = async () => { played = true; Object.defineProperty(video, 'paused', { value: false }); };
    video.pause = () => { paused = true; Object.defineProperty(video, 'paused', { value: true }); };
    Object.defineProperty(video, 'paused', { value: true, configurable: true });

    postEl.appendChild(video);

    // Toggle when paused -> requests playback
    const result1 = manager.togglePlayback(postEl);
    expect(result1).toBe(true);
    expect(played).toBe(true);

    // Toggle when playing -> pauses
    const result2 = manager.togglePlayback(postEl);
    expect(result2).toBe(false);
    expect(paused).toBe(true);
  });

  it('Issue 8: Score formatting preserves "Vote" when score is hidden', () => {
    const postEl = document.createElement('div');
    const post: ReelPost = {
      id: 'p1',
      title: 'Secret Score Post',
      author: 'user1',
      subreddit: 'r/test',
      score: 0,
      isScoreHidden: true,
      commentCount: 5,
      postType: 'text',
      permalink: '/r/test/comments/p1',
      isUpvoted: false,
      isDownvoted: false,
      element: postEl,
    };

    const overlay = renderReelOverlay(postEl, post, { hasVideo: false });
    expect(overlay).not.toBeNull();
    const scoreLabel = overlay!.querySelector('.rr-score-label');
    expect(scoreLabel?.textContent).toBe('Vote');

    // Simulate clicking upvote
    const upvoteBtn = overlay!.querySelector<HTMLButtonElement>('.rr-upvote-btn')!;
    upvoteBtn.click();
    // With isScoreHidden, it should stay 'Vote' and not calculate +1
    expect(scoreLabel?.textContent).toBe('Vote');
  });

  it('Issues 21, 23, 24, 25: Overlay has Fit/Fill button, aria-pressed, and polite live region', () => {
    const postEl = document.createElement('div');
    const post: ReelPost = {
      id: 'p2',
      title: 'Video Reel',
      author: 'user2',
      subreddit: 'r/videos',
      score: 42,
      commentCount: 10,
      postType: 'video',
      permalink: '/r/videos/comments/p2',
      isUpvoted: false,
      isDownvoted: false,
      element: postEl,
    };

    let fitToggled = false;
    const overlay = renderReelOverlay(postEl, post, {
      hasVideo: true,
      onToggleFitFill: () => { fitToggled = true; },
    });

    const fitBtn = overlay!.querySelector<HTMLButtonElement>('.rr-fit-btn');
    expect(fitBtn).not.toBeNull();
    fitBtn?.click();
    expect(fitToggled).toBe(true);

    const upvoteBtn = overlay!.querySelector<HTMLButtonElement>('.rr-upvote-btn');
    const downvoteBtn = overlay!.querySelector<HTMLButtonElement>('.rr-downvote-btn');
    const scoreLabel = overlay!.querySelector('.rr-score-label');

    expect(upvoteBtn?.getAttribute('aria-pressed')).toBe('false');
    expect(downvoteBtn?.getAttribute('aria-pressed')).toBe('false');
    expect(scoreLabel?.getAttribute('aria-live')).toBe('polite');
  });

  it('Issue 14: unconstrainPostMedia is idempotent and does not repeat work', () => {
    const postEl = document.createElement('shreddit-post');
    postEl.dataset.rrUnconstrained = '1';
    const mediaContainer = document.createElement('div');
    mediaContainer.setAttribute('slot', 'post-media-container');
    postEl.appendChild(mediaContainer);

    unconstrainPostMedia(postEl);
    // Because dataset.rrUnconstrained === '1', no style changes are made
    expect(mediaContainer.style.position).toBe('');
  });

  it('Issues 26 & 27: Text card and Link card accessible markup', () => {
    const postEl = document.createElement('div');
    const post: ReelPost = {
      id: 'p3',
      title: 'Accessible Discussion Title',
      author: 'user3',
      subreddit: 'r/askreddit',
      score: 100,
      commentCount: 20,
      postType: 'text',
      selftext: 'Hello world discussion body',
      permalink: '/r/askreddit/comments/p3',
      element: postEl,
    };

    renderTextCard(postEl, post);
    const titleLink = postEl.querySelector<HTMLAnchorElement>('.rr-text-title-link');
    expect(titleLink).not.toBeNull();
    expect(titleLink?.href).toContain('/r/askreddit/comments/p3');

    // Link card
    const linkPostEl = document.createElement('div');
    const linkPost: ReelPost = {
      id: 'p4',
      title: 'External News Article',
      author: 'user4',
      subreddit: 'r/news',
      score: 50,
      commentCount: 5,
      postType: 'link',
      contentHref: 'https://news.ycombinator.com',
      permalink: '/r/news/comments/p4',
      element: linkPostEl,
    };

    renderLinkCard(linkPostEl, linkPost);
    const linkCard = linkPostEl.querySelector('.rr-link-card');
    expect(linkCard?.getAttribute('role')).toBe('region');
    const cta = linkPostEl.querySelector('.rr-link-card-cta');
    expect(cta?.tagName.toLowerCase()).toBe('a');
  });

  it('Issue 30: Top bar labels say "Videos only" and "All posts"', () => {
    const topBar = createTopBar(false, false, {
      onToggleMute: () => {},
      onToggleFilter: () => {},
      onExit: () => {},
    });

    const filterBtn = topBar.querySelector('.rr-filter-btn-top')!;
    expect(filterBtn.textContent).toContain('All posts');

    const topBarActive = createTopBar(false, true, {
      onToggleMute: () => {},
      onToggleFilter: () => {},
      onExit: () => {},
    });
    const filterBtnActive = topBarActive.querySelector('.rr-filter-btn-top')!;
    expect(filterBtnActive.textContent).toContain('Videos only');
  });

  it('Issue 33: Centralized selector registry is defined and populated', () => {
    expect(SELECTORS.POSTS.SHREDDIT).toBe('shreddit-post');
    expect(SELECTORS.GALLERY).toContain('gallery-carousel');
    expect(SELECTORS.CLASSES.CONTAIN).toBe('rr-fit-contain');
    expect(SELECTORS.CLASSES.COVER).toBe('rr-fit-cover');
  });
});
