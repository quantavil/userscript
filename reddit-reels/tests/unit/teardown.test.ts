import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { FeedManager } from '../../src/core/feed-manager';
import { extractPostId } from '../../src/extractor/dom-extractor';
import { getCcIconSvg, openPostNatively } from '../../src/ui/overlay';
import { audioManager } from '../../src/media';

describe('Teardown and Audit Bug Fixes', () => {
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
    (globalThis as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).Node;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).HTMLIFrameElement;
    delete (globalThis as any).HTMLVideoElement;
    delete (globalThis as any).HTMLImageElement;
    delete (globalThis as any).MutationObserver;
    delete (globalThis as any).IntersectionObserver;
  });

  it('Issue 1: restorePost completely cleans up injected DOM and unconstrained styles', () => {
    document.body.innerHTML = `
      <shreddit-post id="t3_test1" post-title="Test Post" author="user1" subreddit-prefixed-name="r/test" post-type="link" content-href="https://example.com">
        <div slot="title">Test Post</div>
        <div slot="credit-bar">Credit</div>
        <div slot="action-row">Actions</div>
        <shreddit-aspect-ratio aspect-ratio="16/9" max-height="512px">
          <img src="https://example.com/pic.jpg" />
        </shreddit-aspect-ratio>
      </shreddit-post>
    `;

    const feedManager = new FeedManager({ isReelModeActive: () => true });
    const postEl = document.querySelector<HTMLElement>('shreddit-post')!;
    const aspectWrapper = postEl.querySelector<HTMLElement>('shreddit-aspect-ratio')!;

    // Enhance post
    feedManager.enhancePost(postEl);

    // Verify injected elements exist
    expect(postEl.querySelector('.rr-post-overlay')).not.toBeNull();
    expect(postEl.querySelector('.rr-link-card-container')).not.toBeNull();
    expect(postEl.classList.contains('rr-is-link')).toBe(true);

    // Call restorePost
    feedManager.restorePost(postEl);

    // Verify injected elements are completely removed
    expect(postEl.querySelector('.rr-post-overlay')).toBeNull();
    expect(postEl.querySelector('.rr-link-card-container')).toBeNull();
    expect(postEl.classList.contains('rr-is-link')).toBe(false);

    // Verify native suppression classes and inline styles are wiped
    expect(postEl.querySelectorAll('.rr-native-suppressed').length).toBe(0);
    const titleSlot = postEl.querySelector<HTMLElement>('[slot="title"]')!;
    expect(titleSlot.style.display).toBe('');

    // Verify original aspect-ratio and max-height attributes were restored
    expect(aspectWrapper.getAttribute('aspect-ratio')).toBe('16/9');
    expect(aspectWrapper.getAttribute('max-height')).toBe('512px');
    expect(aspectWrapper.style.height).toBe('');
  });

  it('Issue 2: getCcIconSvg produces stroke-based SVG with fill="none" (no solid white block)', () => {
    const disabledSvg = getCcIconSvg(false);
    expect(disabledSvg).toContain('fill="none"');
    expect(disabledSvg).not.toContain('fill="currentColor"');

    const enabledSvg = getCcIconSvg(true);
    expect(enabledSvg).toContain('fill="none"');
    expect(enabledSvg).not.toContain('fill="currentColor"');
  });

  it('Issue 2 cross-browser: applySubtitlesState toggles rr-hide-captions on shreddit-player-2 directly', () => {
    const { applySubtitlesState } = require('../../src/core/unconstrainer');

    const postEl = document.createElement('shreddit-post');
    const player = document.createElement('shreddit-player-2');
    postEl.appendChild(player);

    applySubtitlesState(postEl, false);
    expect(postEl.classList.contains('rr-hide-captions')).toBe(true);
    expect(player.classList.contains('rr-hide-captions')).toBe(true);

    applySubtitlesState(postEl, true);
    expect(postEl.classList.contains('rr-hide-captions')).toBe(false);
    expect(player.classList.contains('rr-hide-captions')).toBe(false);
  });

  it('Issue 3: extractPostId stores fallback ID in dataset.reelPostId for determinism', () => {
    const el = document.createElement('div');
    const id1 = extractPostId(el, '');
    expect(id1.startsWith('t3_gen_')).toBe(true);

    const id2 = extractPostId(el, '');
    expect(id2).toBe(id1);
    expect(el.dataset.reelPostId).toBe(id1);
  });

  it('Issue 5: requestPlayback blanks all iframes if called without a targetContainer', () => {
    const ifr = document.createElement('iframe');
    ifr.src = 'https://www.redgifs.com/ifr/test1';
    document.body.appendChild(ifr);

    const standaloneVideo = document.createElement('video');
    document.body.appendChild(standaloneVideo);

    audioManager.requestPlayback(standaloneVideo);

    expect(ifr.src).toBe('about:blank');
    expect(ifr.dataset.rrSrc).toBe('https://www.redgifs.com/ifr/test1');
  });

  it('Gallery Fix: promoteGalleryMedia promotes lazy data-src and picture sources without blank screen', () => {
    const { promoteGalleryMedia, unconstrainPostMedia } = require('../../src/core/unconstrainer');

    const postEl = document.createElement('shreddit-post');
    postEl.innerHTML = `
      <gallery-carousel>
        <faceplate-carousel>
          <ul slot="items">
            <li>
              <figure>
                <img src="https://example.com/slide1.jpg" />
              </figure>
            </li>
            <li>
              <figure>
                <picture>
                  <source data-srcset="https://example.com/slide2-high.jpg" />
                  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-lazy-src="https://example.com/slide2.jpg" />
                </picture>
              </figure>
            </li>
          </ul>
        </faceplate-carousel>
      </gallery-carousel>
    `;

    const carousel = postEl.querySelector<HTMLElement>('faceplate-carousel')!;
    let shadowRoot = carousel.shadowRoot;
    if (!shadowRoot && carousel.attachShadow) {
      shadowRoot = carousel.attachShadow({ mode: 'open' });
    }

    unconstrainPostMedia(postEl);

    // Verify shadowRoot did NOT receive broken #rr-carousel-style that breaks native scrolling
    if (shadowRoot) {
      expect(shadowRoot.querySelector?.('#rr-carousel-style')).toBeNull();
    }

    // Verify lazy media on slide 2 was promoted
    const slide2Source = postEl.querySelector<HTMLSourceElement>('picture source')!;
    const slide2Img = postEl.querySelector<HTMLImageElement>('picture img')!;

    expect(slide2Source.srcset).toBe('https://example.com/slide2-high.jpg');
    expect(slide2Img.src).toBe('https://example.com/slide2.jpg');
    expect(slide2Img.getAttribute('loading')).toBe('eager');
    expect(slide2Img.getAttribute('fetchpriority')).toBe('high');
  });

  it('Audit Fix: restorePost restores native iframes that were blanked during playback', () => {
    const postEl = document.createElement('shreddit-post');
    const ifr = document.createElement('iframe');
    ifr.src = 'about:blank';
    ifr.dataset.rrSrc = 'https://www.youtube.com/embed/test123';
    postEl.appendChild(ifr);

    const feedManager = new FeedManager({ isReelModeActive: () => true });
    feedManager.restorePost(postEl);

    expect(ifr.src).toBe('https://www.youtube.com/embed/test123');
    expect(ifr.dataset.rrSrc).toBeUndefined();
  });

  it('Gallery Navigation: wireGalleryCarousel scrolls container on arrow button clicks', () => {
    const { wireGalleryCarousel, restorePostMedia } = require('../../src/core/unconstrainer');

    const carousel = document.createElement('gallery-carousel');
    carousel.innerHTML = `
      <ul slot="items" class="carousel-items">
        <li style="width: 500px;">Slide 1</li>
        <li style="width: 500px;">Slide 2</li>
      </ul>
      <button slot="previous-button" class="prev-btn">&lt;</button>
      <button slot="next-button" class="next-btn">&gt;</button>
    `;
    document.body.appendChild(carousel);

    const ul = carousel.querySelector<HTMLElement>('ul')!;
    Object.defineProperty(ul, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(ul, 'scrollWidth', { value: 1000, configurable: true });

    let scrollByCalls: any[] = [];
    ul.scrollBy = (opts: any) => {
      scrollByCalls.push(opts);
      ul.scrollLeft += opts.left || 0;
    };

    wireGalleryCarousel(carousel);

    const nextBtn = carousel.querySelector<HTMLButtonElement>('[slot="next-button"]')!;
    nextBtn.click();

    expect(scrollByCalls.length).toBe(1);
    expect(scrollByCalls[0].left).toBe(500);
    expect(scrollByCalls[0].behavior).toBe('smooth');

    const prevBtn = carousel.querySelector<HTMLButtonElement>('[slot="previous-button"]')!;
    prevBtn.click();

    expect(scrollByCalls.length).toBe(2);
    expect(scrollByCalls[1].left).toBe(-500);

    // Teardown
    const postContainer = document.createElement('shreddit-post');
    postContainer.appendChild(carousel);
    restorePostMedia(postContainer);
    expect((carousel as any)._rrAbortController).toBeUndefined();
  });

  it('Comments open through the native full-post link (new Reddit), not an iframe', () => {
    const postEl = document.createElement('shreddit-post');
    const link = document.createElement('a');
    link.setAttribute('slot', 'full-post-link');
    link.href = 'https://www.reddit.com/r/askreddit/comments/abc/x/';
    let clicked = 0;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      clicked++;
    });
    postEl.appendChild(link);
    document.body.appendChild(postEl);

    openPostNatively(postEl, '/r/askreddit/comments/abc/x/');
    expect(clicked).toBe(1);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('Shadow DOM Helper: shadowContains correctly detects elements in shadow trees', () => {
    const { shadowContains } = require('../../src/media/audio-manager');

    const container = document.createElement('div');
    const customEl = document.createElement('div');
    const shadow = customEl.attachShadow({ mode: 'open' });
    const innerVideo = document.createElement('video');
    shadow.appendChild(innerVideo);
    container.appendChild(customEl);

    // Standard Node.contains returns false for shadow-rooted elements
    expect(container.contains(innerVideo)).toBe(false);

    // shadowContains returns true
    expect(shadowContains(container, innerVideo)).toBe(true);
    expect(shadowContains(container, null)).toBe(false);

    const outsideEl = document.createElement('span');
    expect(shadowContains(container, outsideEl)).toBe(false);
  });

  it('Media Resolver: resolves Streamable and direct MP4 video URLs', () => {
    const { resolveMedia } = require('../../src/media');

    const streamablePost = {
      id: 't3_st1',
      title: 'Streamable Video',
      author: 'u1',
      subreddit: 'r/videos',
      score: 10,
      commentCount: 1,
      permalink: '/r/videos/comments/st1/',
      contentHref: 'https://streamable.com/moo123',
      postType: 'video' as const,
    };
    const streamableMedia = resolveMedia(streamablePost);
    expect(streamableMedia.type).toBe('iframe');
    expect(streamableMedia.src).toContain('https://streamable.com/e/moo123?autoplay=1');

    const mp4Post = {
      id: 't3_mp1',
      title: 'Direct Video',
      author: 'u2',
      subreddit: 'r/videos',
      score: 15,
      commentCount: 2,
      permalink: '/r/videos/comments/mp1/',
      contentHref: 'https://files.catbox.moe/abc1234.mp4',
      postType: 'video' as const,
    };
    const mp4Media = resolveMedia(mp4Post);
    expect(mp4Media.type).toBe('video');
    expect(mp4Media.src).toBe('https://files.catbox.moe/abc1234.mp4');
  });
});
