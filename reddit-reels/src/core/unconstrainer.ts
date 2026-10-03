/**
 * Reddit Media Unconstrainer Subsystem
 * Removes 512px height clamps, unconstrains shadowRoots, and enables full-bleed cover scaling
 */

import { deepFindMediaElements } from '../media';
import { backupElementState, restoreElementState, clearAllRrState } from './teardown-store';

const CAPTION_BUTTON_SELECTORS = [
  'button[aria-label*="caption" i]',
  'button[aria-label*="subtitle" i]',
  'button[aria-label*="closed caption" i]',
  'button[data-testid*="caption" i]',
  'button[data-testid*="subtitle" i]',
  '[data-testid*="caption" i] button',
  '[data-testid*="subtitle" i] button',
];

function isCaptionsButtonActive(btn: HTMLElement): boolean | null {
  const aria = btn.getAttribute('aria-pressed') || btn.getAttribute('aria-checked') || btn.getAttribute('data-selected');
  if (aria === 'true') return true;
  if (aria === 'false') return false;
  if (btn.classList.contains('active') || btn.classList.contains('selected') || btn.classList.contains('enabled')) return true;
  const label = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').toLowerCase();
  if (label.includes('turn off') || label.includes('hide caption') || label.includes('captions on')) return true;
  if (label.includes('turn on') || label.includes('show caption') || label.includes('captions off')) return false;
  return null;
}

function findCaptionButton(root: HTMLElement | ShadowRoot): HTMLElement | null {
  for (const selector of CAPTION_BUTTON_SELECTORS) {
    try {
      const found = (root as HTMLElement).querySelector?.(selector) as HTMLElement | null;
      if (found) return found;
    } catch {}
  }
  return null;
}

/**
 * Drive the player component's own captions control (e.g. shreddit-player-2's
 * internal CC button), the same way the mute flow drives the video element.
 */
function syncPlayerCaptionsControl(player: HTMLElement, enabled: boolean): void {
  try {
    try {
      if (enabled) {
        player.setAttribute('captions', 'true');
        (player as any).captions = true;
        (player as any).captionsEnabled = true;
        (player as any).subtitlesEnabled = true;
      } else {
        player.removeAttribute('captions');
        (player as any).captions = false;
        (player as any).captionsEnabled = false;
        (player as any).subtitlesEnabled = false;
      }
    } catch {}

    try {
      localStorage.setItem('@reddit/shreddit-player-media-captions', enabled ? 'true' : 'false');
    } catch {}

    const scopes: Array<HTMLElement | ShadowRoot> = [player];
    if (player.shadowRoot) scopes.push(player.shadowRoot);
    for (const child of Array.from(player.children)) {
      if ((child as HTMLElement).shadowRoot) scopes.push((child as HTMLElement).shadowRoot!);
    }
    for (const scope of scopes) {
      const btn = findCaptionButton(scope);
      if (!btn) continue;
      const active = isCaptionsButtonActive(btn);
      if (active === enabled) return;
      (btn as HTMLButtonElement).click();
      return;
    }
  } catch {}
}

/**
 * Apply subtitles (closed captions) visibility to all videos in a container.
 * Drives BOTH the <video> textTracks and the player component's own captions
 * control, and records the desired state on the container so late-loading
 * tracks (loadedmetadata after toggle) are synced on arrival.
 */
export function applySubtitlesState(container: HTMLElement, enabled: boolean): void {
  try {
    container.dataset.rrCaptions = enabled ? 'on' : 'off';
  } catch {}

  const { videos, players } = deepFindMediaElements(container);
  videos.forEach((v) => {
    if (v.textTracks && v.textTracks.length > 0) {
      for (let i = 0; i < v.textTracks.length; i++) {
        try {
          v.textTracks[i].mode = enabled ? 'showing' : 'disabled';
        } catch {}
      }
    }
    const tracked = v as any;
    if (v.textTracks && !tracked._rrTrackWired) {
      tracked._rrTrackWired = true;
      try {
        v.textTracks.addEventListener('addtrack', () => {
          const cur = container.dataset.rrCaptions === 'on';
          if (v.textTracks) {
            for (let i = 0; i < v.textTracks.length; i++) {
              try { v.textTracks[i].mode = cur ? 'showing' : 'disabled'; } catch {}
            }
          }
        });
      } catch {}
    }
  });
  players.forEach((p) => {
    p.classList.toggle('rr-hide-captions', !enabled);
    syncPlayerCaptionsControl(p, enabled);
  });

  if (enabled) {
    container.classList.remove('rr-hide-captions');
  } else {
    container.classList.add('rr-hide-captions');
  }
}

/**
 * Eagerly promotes and reveals lazy-loaded media inside galleries and carousels
 */
export function promoteGalleryMedia(container: HTMLElement): void {
  const list = container.querySelector<HTMLElement>('ul[slot="items"], [slot="items"], .carousel-items, ul');
  const slides = list
    ? (Array.from(list.children).filter((el) =>
        typeof HTMLElement !== 'undefined' ? el instanceof HTMLElement : Boolean(el && (el as any).nodeType === 1)
      ) as HTMLElement[])
    : [];

  let targetRoots: HTMLElement[] = [container];
  if (slides.length > 0) {
    const scrollLeft = list?.scrollLeft || 0;
    let activeIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < slides.length; i++) {
      const diff = Math.abs(slides[i].offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        activeIdx = i;
      }
    }
    targetRoots = slides.slice(Math.max(0, activeIdx - 1), Math.min(slides.length, activeIdx + 2));
  }

  for (const root of targetRoots) {
    // 1. Promote <picture source> elements
    root.querySelectorAll<HTMLSourceElement>('picture source, source').forEach((source) => {
      try {
        const ds = source.dataset;
        const lazySrcset = ds?.srcset || ds?.lazySrcset || source.getAttribute('data-srcset') || source.getAttribute('data-lazy-srcset');
        if (lazySrcset && (!source.srcset || source.srcset.startsWith('data:image/gif'))) {
          source.srcset = lazySrcset;
        }
      } catch {}
    });

    // 2. Promote <img> elements
    root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      try {
        if (img.classList.contains('post-background-image-filter') || img.classList.contains('shreddit-subreddit-icon__icon')) {
          return;
        }
        img.setAttribute('loading', 'eager');
        img.setAttribute('fetchpriority', 'high');
        img.removeAttribute('decoding');

        const ds = img.dataset;
        const lazySrc = ds?.src || ds?.lazySrc || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        const isPlaceholder = !img.src || img.src === 'about:blank' || img.src.startsWith('data:image/gif') || img.src.startsWith('data:image/svg');

        if (lazySrc && isPlaceholder) {
          img.src = lazySrc;
        }

        const lazySrcset = ds?.srcset || ds?.lazySrcset || img.getAttribute('data-srcset') || img.getAttribute('data-lazy-srcset');
        if (lazySrcset && (!img.srcset || img.srcset.startsWith('data:image/gif'))) {
          img.srcset = lazySrcset;
        }

        img.style.removeProperty('display');
      } catch {}
    });
  }
}

/**
 * Injects stylesheet into custom player's shadowRoot to eradicate Reddit's 512px height limits
 * and manage caption display cross-browser
 */
export function unconstrainPlayerShadow(player: HTMLElement): void {
  player.style.setProperty('--max-height', '100dvh', 'important');
  player.style.setProperty('--max-width', '100vw', 'important');
  player.style.setProperty('max-height', '100dvh', 'important');
  player.style.setProperty('max-width', '100vw', 'important');
  player.style.setProperty('height', '100dvh', 'important');
  player.style.setProperty('width', '100vw', 'important');
  player.style.setProperty('position', 'absolute', 'important');
  player.style.setProperty('inset', '0', 'important');

  if (player.shadowRoot) {
    if (!player.shadowRoot.querySelector('#rr-unconstrain-style')) {
      const shadowStyle = document.createElement('style');
      shadowStyle.id = 'rr-unconstrain-style';
      shadowStyle.textContent = `
        :host {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          background: transparent !important;
        }
        video {
          width: 100% !important;
          height: 100% !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          object-fit: contain !important;
          background: transparent !important;
        }
        :host(.rr-vertical-video) video,
        :host([data-is-vertical="true"]) video,
        video.rr-vertical-video {
          object-fit: cover !important;
        }
        :host(.rr-fit-cover) video,
        video.rr-fit-cover {
          object-fit: cover !important;
        }
        :host(.rr-fit-contain) video,
        video.rr-fit-contain {
          object-fit: contain !important;
        }
        /* Subtitles / captions toggle: works cross-browser via host class */
        :host(.rr-hide-captions) ::cue,
        :host(.rr-hide-captions) .captions-display,
        :host(.rr-hide-captions) [data-testid="captions"],
        :host(.rr-hide-captions) shreddit-player-captions,
        :host(.rr-hide-captions) .caption-wrapper,
        :host(.rr-hide-captions) .caption-container,
        :host(.rr-hide-captions) [part="captions"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        :host(:not(.rr-hide-captions)) .captions-display,
        :host(:not(.rr-hide-captions)) [data-testid="captions"],
        :host(:not(.rr-hide-captions)) shreddit-player-captions,
        :host(:not(.rr-hide-captions)) [part="captions"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 10 !important;
          pointer-events: none !important;
        }
      `;
      player.shadowRoot.appendChild(shadowStyle);
    }
  }
}

/**
 * Removes Reddit's 512px / aspect-ratio clamp and expands true vertical videos to full bleed
 */
export function unconstrainPostMedia(postEl: HTMLElement): void {
  // Idempotence guard: do not re-run full DOM unconstraining on already enhanced posts
  if (postEl.dataset.rrUnconstrained === '1') return;
  postEl.dataset.rrUnconstrained = '1';

  // 0. Set structural classes for CSS fallback without hard reliance on :has()
  if (postEl.querySelector('gallery-carousel, faceplate-carousel, [data-testid="media-gallery"]')) {
    postEl.classList.add('rr-has-gallery');
  }
  if (postEl.querySelector('video, iframe, shreddit-player-2')) {
    postEl.classList.add('rr-has-video');
  }
  if (postEl.querySelector('img:not(.shreddit-subreddit-icon__icon)')) {
    postEl.classList.add('rr-has-image');
  }

  // 1. Unconstrain shreddit-aspect-ratio, slot wrappers, and media containers
  postEl.querySelectorAll<HTMLElement>(
    'shreddit-aspect-ratio, [slot="post-media-container"], [data-aspect-ratio-container], .media-container, gallery-carousel, faceplate-carousel, shreddit-async-loader, .media-lightbox-img, shreddit-media-lightbox-listener'
  ).forEach((el) => {
    backupElementState(el, ['aspect-ratio', 'max-height']);
    el.style.setProperty('--max-height', '100dvh', 'important');
    el.style.setProperty('--max-width', '100vw', 'important');
    el.style.setProperty('max-height', '100dvh', 'important');
    el.style.setProperty('max-width', '100vw', 'important');
    el.style.setProperty('height', '100dvh', 'important');
    el.style.setProperty('width', '100vw', 'important');
    el.style.setProperty('min-height', '100dvh', 'important');
    el.style.setProperty('--gallery-initial-height', '100dvh', 'important');
    el.style.setProperty('aspect-ratio', 'unset', 'important');
    if (el.hasAttribute('aspect-ratio') && !el.dataset.rrOrigAspectRatio) {
      el.dataset.rrOrigAspectRatio = el.getAttribute('aspect-ratio') || '';
    }
    if (el.hasAttribute('max-height') && !el.dataset.rrOrigMaxHeight) {
      el.dataset.rrOrigMaxHeight = el.getAttribute('max-height') || '';
    }
    el.removeAttribute('aspect-ratio');
    el.removeAttribute('max-height');
  });

  // 2. Unconstrain shreddit-player-2 and its shadowRoot
  postEl.querySelectorAll<HTMLElement>('shreddit-player-2').forEach((player) => {
    backupElementState(player, ['data-is-vertical']);
    unconstrainPlayerShadow(player);
  });

  // 2b. Gallery slides: promote lazy images eagerly and wire scroll/click listeners
  postEl.querySelectorAll<HTMLElement>('gallery-carousel, faceplate-carousel, [data-testid="media-gallery"]').forEach((carousel) => {
    wireGalleryCarousel(carousel);
  });

  // 3. Detect vertical video aspect ratio and set full-bleed cover scaling ONLY for true reels (>= 1.5 ratio)
  const { videos } = deepFindMediaElements(postEl);
  videos.forEach((v) => {
    backupElementState(v, ['class']);
    const handleSizing = () => {
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (w > 0 && h > 0) {
        // True vertical video (e.g. 9:16 = 1.778). Square (1:1 = 1.0) and 4:5 (1.25) remain contain to prevent cropping.
        const isVertical = h / w >= 1.5;
        if (isVertical) {
          v.classList.add('rr-vertical-video');
          v.style.setProperty('object-fit', 'cover', 'important');
          const slide = v.closest('li') || v.closest('shreddit-player-2');
          slide?.classList.add('rr-vertical-video');
          if (videos.length === 1) {
            postEl.classList.add('rr-has-vertical-video');
            postEl.setAttribute('data-vertical-video', 'true');
          }
          const player = v.closest('shreddit-player-2') || postEl.querySelector('shreddit-player-2');
          if (player) {
            player.classList.add('rr-vertical-video');
            player.setAttribute('data-is-vertical', 'true');
          }
        } else {
          v.classList.remove('rr-vertical-video');
          v.style.setProperty('object-fit', 'contain', 'important');
          const slide = v.closest('li') || v.closest('shreddit-player-2');
          slide?.classList.remove('rr-vertical-video');
          if (videos.length === 1) {
            postEl.classList.remove('rr-has-vertical-video');
            postEl.removeAttribute('data-vertical-video');
          }
        }
      }
    };

    handleSizing();
    const vWithAc = v as HTMLVideoElement & { _rrSizingController?: AbortController; dataset: DOMStringMap };
    if (!vWithAc._rrSizingController) {
      const vAc = new AbortController();
      vWithAc._rrSizingController = vAc;
      vWithAc.dataset.rrWired = '1';
      v.addEventListener('loadedmetadata', handleSizing, { signal: vAc.signal });
      v.addEventListener('resize', handleSizing, { signal: vAc.signal });
      v.addEventListener('loadedmetadata', () => {
        const pref = postEl.dataset?.rrCaptions;
        if (pref !== 'on' && pref !== 'off') return;
        const wantOn = pref === 'on';
        try {
          const tracks = (v as HTMLVideoElement).textTracks;
          for (let i = 0; i < (tracks?.length || 0); i++) {
            try {
              tracks[i].mode = wantOn ? 'showing' : 'disabled';
            } catch {}
          }
        } catch {}
      }, { signal: vAc.signal });
    }
  });
}

/**
 * Programmatically wires next/previous arrow navigation buttons and scroll-snapping
 * on gallery carousels with clean AbortController teardown.
 */
export function wireGalleryCarousel(carousel: HTMLElement): void {
  promoteGalleryMedia(carousel);

  const container = carousel as HTMLElement & { _rrAbortController?: AbortController };
  if (container._rrAbortController) {
    return;
  }
  const ac = new AbortController();
  container._rrAbortController = ac;
  const signal = ac.signal;

  const getScrollContainer = (): HTMLElement | null => {
    return (
      carousel.querySelector<HTMLElement>('ul[slot="items"], .carousel-items, ul') ||
      carousel.shadowRoot?.querySelector<HTMLElement>('ul, .carousel-items') ||
      carousel
    );
  };

  const updateButtons = () => {
    const sc = getScrollContainer();
    if (!sc) return;
    const prevBtn = carousel.querySelector<HTMLButtonElement>('[slot="previous-button"], .prev-btn');
    const nextBtn = carousel.querySelector<HTMLButtonElement>('[slot="next-button"], .next-btn');
    const maxScroll = sc.scrollWidth - sc.clientWidth;
    if (prevBtn) {
      const atStart = sc.scrollLeft <= 5;
      prevBtn.style.setProperty('display', atStart ? 'none' : 'flex', 'important');
    }
    if (nextBtn) {
      const atEnd = sc.scrollLeft >= maxScroll - 5;
      nextBtn.style.setProperty('display', atEnd ? 'none' : 'flex', 'important');
    }
    promoteGalleryMedia(carousel);
  };

  const sc = getScrollContainer();
  if (sc) {
    sc.addEventListener('scroll', updateButtons, { passive: true, signal });
  }

  const prevBtns = carousel.querySelectorAll<HTMLElement>('[slot="previous-button"], .prev-btn');
  prevBtns.forEach((btn) => {
    btn.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        e.preventDefault();
        const scEl = getScrollContainer();
        if (!scEl) return;
        const step = scEl.clientWidth || window.innerWidth;
        scEl.scrollBy({ left: -step, behavior: 'smooth' });
        setTimeout(updateButtons, 100);
        setTimeout(updateButtons, 350);
      },
      { signal }
    );
  });

  const nextBtns = carousel.querySelectorAll<HTMLElement>('[slot="next-button"], .next-btn');
  nextBtns.forEach((btn) => {
    btn.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        e.preventDefault();
        const scEl = getScrollContainer();
        if (!scEl) return;
        const step = scEl.clientWidth || window.innerWidth;
        scEl.scrollBy({ left: step, behavior: 'smooth' });
        setTimeout(updateButtons, 100);
        setTimeout(updateButtons, 350);
      },
      { signal }
    );
  });

  setTimeout(updateButtons, 50);
}

/**
 * Restores original media constraints, attributes, and styles upon exiting Reel Mode
 */
export function restorePostMedia(postEl: HTMLElement): void {
  // 1. Restore modified media containers and aspect-ratio wrappers
  postEl.querySelectorAll<HTMLElement>(
    'shreddit-aspect-ratio, [slot="post-media-container"], [data-aspect-ratio-container], .media-container, gallery-carousel, faceplate-carousel, shreddit-async-loader, .media-lightbox-img, shreddit-media-lightbox-listener'
  ).forEach((el) => {
    el.style.removeProperty('--max-height');
    el.style.removeProperty('--max-width');
    el.style.removeProperty('max-height');
    el.style.removeProperty('max-width');
    el.style.removeProperty('height');
    el.style.removeProperty('width');
    el.style.removeProperty('min-height');
    el.style.removeProperty('--gallery-initial-height');
    el.style.removeProperty('aspect-ratio');
    if (el.dataset.rrOrigAspectRatio !== undefined) {
      el.setAttribute('aspect-ratio', el.dataset.rrOrigAspectRatio);
      delete el.dataset.rrOrigAspectRatio;
    }
    if (el.dataset.rrOrigMaxHeight !== undefined) {
      el.setAttribute('max-height', el.dataset.rrOrigMaxHeight);
      delete el.dataset.rrOrigMaxHeight;
    }
  });

  // 2. Restore shreddit-player-2 and its shadowRoot
  postEl.querySelectorAll<HTMLElement>('shreddit-player-2').forEach((player) => {
    player.style.removeProperty('--max-height');
    player.style.removeProperty('--max-width');
    player.style.removeProperty('max-height');
    player.style.removeProperty('max-width');
    player.style.removeProperty('height');
    player.style.removeProperty('width');
    player.style.removeProperty('position');
    player.style.removeProperty('inset');
    player.classList.remove('rr-vertical-video', 'rr-hide-captions');
    player.removeAttribute('data-is-vertical');
    if (player.shadowRoot) {
      const shadowStyle = player.shadowRoot.querySelector('#rr-unconstrain-style');
      shadowStyle?.remove();
    }
  });

  // 2b. Restore gallery-carousel / faceplate-carousel
  postEl.querySelectorAll<HTMLElement>('gallery-carousel, faceplate-carousel, [data-testid="media-gallery"]').forEach((carousel) => {
    const c = carousel as any;
    if (c._rrAbortController) {
      try { c._rrAbortController.abort(); } catch {}
      delete c._rrAbortController;
    }
    delete (carousel as HTMLElement & { dataset: DOMStringMap }).dataset.rrGalleryWired;
  });

  // 3. Restore videos
  const { videos } = deepFindMediaElements(postEl);
  videos.forEach((v) => {
    const vid = v as any;
    if (vid._rrSizingController) {
      try { vid._rrSizingController.abort(); } catch {}
      delete vid._rrSizingController;
    }
    delete vid.dataset?.rrWired;
    delete vid._rrTrackWired;
    v.classList.remove('rr-vertical-video');
    v.style.removeProperty('object-fit');
  });

  // 4. Restore original styles and attributes and purge all rr dataset and classes
  clearAllRrState(postEl);

  postEl.classList.remove(
    'rr-has-vertical-video',
    'rr-hide-captions',
    'rr-has-gallery',
    'rr-has-video',
    'rr-has-image',
    'rr-fit-contain',
    'rr-fit-cover'
  );
  postEl.removeAttribute('data-vertical-video');
  delete postEl.dataset.rrCaptions;
  delete postEl.dataset.rrUnconstrained;
}

