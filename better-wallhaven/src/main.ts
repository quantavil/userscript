import { injectStyles } from './styles';
import { createLightbox, LightboxManager } from './lightbox';
import { allThumbs, navigateGrid } from './grid';
import { getGridSize, applyGridSize, createNativeGridControl, createGridBar } from './controls';
import { enhanceAll, observeGrid, thumbId, scopeThumb, setDlState, setFullHtml, isFullOpen, syncFavButton } from './thumbs';
import { extractThumbMeta, largerThumb } from './extract';
import { buildDetailHtml } from './detail';
import { C, metaCache } from './cache';
import { loadMeta } from './api';
import { dlFile, fileNameOf } from './download';
import { I } from './icons';

(function () {
  'use strict';

  if (!document.getElementById('thumbs')) return;

  injectStyles();
  applyGridSize(getGridSize());

  const lightboxEls = createLightbox();
  const onGridSize = (px: number) => applyGridSize(px);
  const nativeControl = createNativeGridControl(getGridSize(), onGridSize);
  if (nativeControl) {
    const icon = nativeControl.box.querySelector('.whg-icon') as HTMLElement | null;
    if (icon) icon.innerHTML = I.sliders;
  } else {
    const gridBar = createGridBar(getGridSize(), onGridSize);
    const gridIcon = gridBar.bar.querySelector('.whg-icon') as HTMLElement | null;
    if (gridIcon) gridIcon.innerHTML = I.sliders;
  }

  enhanceAll();
  observeGrid(() => enhanceAll());

  let selected: HTMLElement | null = null;

  const lightbox = new LightboxManager(lightboxEls, (dir: number) => {
    const list = allThumbs();
    const currentId = lightbox.getCurrentId();
    if (!currentId) return;
    const idx = list.findIndex(t => t.getAttribute('data-wallpaper-id') === currentId);
    if (idx === -1) return;
    const nextThumb = list[idx + dir];
    if (nextThumb) {
      selectThumb(nextThumb);
      openLightbox(nextThumb);
    }
  });

  function openLightbox(thumb: HTMLElement) {
    lightbox.open(thumbId(thumb), largerThumb(extractThumbMeta(thumb).thumbUrl, 'lg'));
  }

  function selectThumb(thumb: HTMLElement) {
    if (thumb === selected) return;
    if (selected) selected.classList.remove('wh-selected');
    selected = thumb;
    selected.classList.add('wh-selected');
    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Explicit tap on the details toggle: HD block renders below the thumbnail. */
  function toggleFull(thumb: HTMLElement) {
    if (isFullOpen(thumb)) {
      setFullHtml(thumb, '', false);
      return;
    }
    const free = extractThumbMeta(thumb);
    const id = free.id;

    const full = id ? metaCache.get(id) : undefined;
    if (full) {
      setFullHtml(thumb, buildDetailHtml(free, full, 'ready'), true);
      return;
    }
    const cached = id ? C.get(id) : null;
    if (cached) {
      // Show known size instantly, then upgrade to full props/tags in background.
      setFullHtml(thumb, buildDetailHtml(free, { url: cached.url, size: cached.sizeString, properties: [], tagsHtml: '' }, 'ready'), true);
      loadMeta(id, meta => {
        if (!thumb.isConnected || !isFullOpen(thumb) || !meta) return;
        setFullHtml(thumb, buildDetailHtml(free, meta, 'ready'), true);
      });
      return;
    }
    setFullHtml(thumb, buildDetailHtml(free, null, 'loading'), true);
    if (!id) {
      setFullHtml(thumb, buildDetailHtml(free, null, 'error'), true);
      return;
    }
    loadMeta(id, meta => {
      if (!thumb.isConnected || !isFullOpen(thumb)) return;
      setFullHtml(thumb, buildDetailHtml(free, meta, meta ? 'ready' : 'error'), true);
    });
  }

  function downloadThumb(thumb: HTMLElement) {
    const id = thumbId(thumb);
    if (!id) return;
    const cached = C.get(id);
    if (cached) {
      dlFile(cached.url, fileNameOf(cached.url, `${id}.jpg`));
      setDlState(thumb, 'done');
      return;
    }
    const mem = metaCache.get(id);
    if (mem) {
      dlFile(mem.url, fileNameOf(mem.url, `${id}.jpg`));
      setDlState(thumb, 'done');
      return;
    }
    setDlState(thumb, 'loading');
    loadMeta(id, meta => {
      if (!thumb.isConnected) return;
      if (meta) {
        if (isFullOpen(thumb)) setFullHtml(thumb, buildDetailHtml(extractThumbMeta(thumb), meta, 'ready'), true);
        dlFile(meta.url, fileNameOf(meta.url, `${id}.jpg`));
        setDlState(thumb, 'done');
      } else {
        setDlState(thumb, 'error');
      }
    });
  }

  // All action buttons live below the thumbnail (always visible, touch-safe)
  document.body.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const btn = target.closest('#thumbs .wh-btn') as HTMLButtonElement | null;
    if (!btn) return;
    const thumb = scopeThumb(btn);
    if (!thumb) return;
    e.preventDefault();
    e.stopPropagation();
    selectThumb(thumb);
    const act = btn.dataset.act;
    if (act === 'dl') downloadThumb(thumb);
    else if (act === 'fs') openLightbox(thumb);
    else if (act === 'op') window.open(extractThumbMeta(thumb).pageUrl, '_blank');
    else if (act === 'more') toggleFull(thumb);
    else if (act === 'fav') {
      const nativeFav =
        (thumb.querySelector('.thumb-btn-fav') as HTMLElement | null) ||
        (thumb.querySelector('.wall-favs') as HTMLElement | null);
      if (nativeFav) {
        nativeFav.click();
        setTimeout(() => { if (thumb.isConnected) syncFavButton(thumb); }, 400);
      }
    }
  }, true);

  document.addEventListener('keydown', e => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) return;
    if (lightbox.isOpen()) return;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); navigateGrid('left', selected, selectThumb); break;
      case 'ArrowRight': e.preventDefault(); navigateGrid('right', selected, selectThumb); break;
      case 'ArrowUp': e.preventDefault(); navigateGrid('up', selected, selectThumb); break;
      case 'ArrowDown': e.preventDefault(); navigateGrid('down', selected, selectThumb); break;
      case 'Enter':
        if (selected) { e.preventDefault(); window.open(extractThumbMeta(selected).pageUrl, '_blank'); }
        break;
      case 'd':
      case 'D':
        if (!e.ctrlKey && !e.altKey && !e.metaKey && selected) {
          e.preventDefault();
          downloadThumb(selected);
        }
        break;
    }
  });
})();
