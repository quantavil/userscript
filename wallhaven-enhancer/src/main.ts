import { injectStyles } from './styles';
import { createSidebar, updateSidebarDetails, dlFile, syncFavButton } from './sidebar';
import { createLightbox, LightboxManager } from './lightbox';
import { allThumbs, navigateGrid } from './grid';
import { type FullMeta } from './cache';

(function () {
  'use strict';

  // Only run on search/listing pages containing the thumbnail grid
  if (!document.getElementById('thumbs')) return;

  // Retrieve or default panel width
  const initialWidth = parseInt(localStorage.getItem('whPanelWidth') || '360', 10);

  // Inject CSS styles
  injectStyles(initialWidth);

  // Initialize Sidebar and Lightbox DOM
  const sidebar = createSidebar(initialWidth);
  const lightboxEls = createLightbox();

  let selected: HTMLElement | null = null;
  let selectedMeta: FullMeta | null = null;

  // Set up the Lightbox manager
  const lightbox = new LightboxManager(lightboxEls, (dir: number) => {
    // Navigate inside lightbox
    const list = allThumbs();
    const currentId = lightbox.getCurrentId();
    if (!currentId) return;
    const idx = list.findIndex(t => t.getAttribute('data-wallpaper-id') === currentId);
    if (idx === -1) return;
    const nextThumb = list[idx + dir];
    if (nextThumb) {
      selectThumb(nextThumb);
      lightbox.open(nextThumb.getAttribute('data-wallpaper-id') || '');
    }
  });

  // Select a thumbnail: highlight and pull properties into details panel
  function selectThumb(thumb: HTMLElement) {
    if (!thumb || thumb === selected) return;
    if (selected) selected.classList.remove('wh-selected');
    selected = thumb;
    selectedMeta = null;
    selected.classList.add('wh-selected');

    updateSidebarDetails(thumb, sidebar, meta => {
      selectedMeta = meta;
    });

    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Sidebar download click
  sidebar.dl.addEventListener('click', () => {
    if (selectedMeta) {
      dlFile(selectedMeta.url, selectedMeta.url.split('/').pop() || 'wallpaper.png');
    }
  });

  // Sidebar open details page
  sidebar.openBtn.addEventListener('click', () => {
    if (selected) {
      window.open(`https://wallhaven.cc/w/${selected.getAttribute('data-wallpaper-id')}`, '_blank');
    }
  });

  // Sidebar proxy-click native favorite button
  sidebar.favBtn.addEventListener('click', () => {
    if (!selected) return;
    const nativeFav = selected.querySelector('.thumb-btn-fav') as HTMLElement | null;
    if (nativeFav) {
      nativeFav.click();
      // Sync status after a short delay for request handling
      setTimeout(() => {
        if (selected) syncFavButton(selected, sidebar.favBtn);
      }, 400);
    }
  });

  // Sidebar navigation prev/next
  sidebar.prevBtn.addEventListener('click', () => stepSelection(-1));
  sidebar.nextBtn.addEventListener('click', () => stepSelection(1));

  function stepSelection(dir: number) {
    if (!selected) return;
    const list = allThumbs();
    const idx = list.indexOf(selected);
    if (idx === -1) return;
    const next = list[idx + dir];
    if (next) selectThumb(next);
  }

  // Click image in sidebar to open lightbox
  sidebar.imgwrap.addEventListener('click', () => {
    if (selected) {
      lightbox.open(selected.getAttribute('data-wallpaper-id') || '');
    }
  });

  // --- Global Event Listeners ---

  // Click on grid element: select instead of navigate. Control/Meta/Shift clicks bypass.
  document.body.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const link = target.closest('figure.thumb a.preview') as HTMLAnchorElement | null;
    if (!link) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const thumb = link.closest('figure.thumb') as HTMLElement | null;
    if (thumb) selectThumb(thumb);
  });

  // Double click on grid element: open natively
  document.body.addEventListener('dblclick', e => {
    const target = e.target as HTMLElement;
    const link = target.closest('figure.thumb a.preview') as HTMLAnchorElement | null;
    if (!link) return;
    e.preventDefault();
    window.open(link.href, '_blank');
  });

  // Arrow key grid navigation
  document.addEventListener('keydown', e => {
    // Ignore keyboard events inside input controls
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable)
    ) {
      return;
    }

    // Lightbox handles its own keyboard navigation when open
    if (lightbox.isOpen()) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        navigateGrid('left', selected, selectThumb);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigateGrid('right', selected, selectThumb);
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateGrid('up', selected, selectThumb);
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateGrid('down', selected, selectThumb);
        break;
      case 'Enter':
        if (selected) {
          e.preventDefault();
          lightbox.open(selected.getAttribute('data-wallpaper-id') || '');
        }
        break;
      case 'd':
      case 'D':
        if (!e.ctrlKey && !e.altKey && !e.metaKey && selectedMeta) {
          e.preventDefault();
          dlFile(selectedMeta.url, selectedMeta.url.split('/').pop() || 'wallpaper.png');
        }
        break;
    }
  });

  // Handle dynamic style synchronization if external clicks change native favorites state
  document.body.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const favButton = target.closest('figure.thumb .thumb-btn-fav');
    if (favButton && selected) {
      setTimeout(() => syncFavButton(selected!, sidebar.favBtn), 400);
    }
  });
})();
