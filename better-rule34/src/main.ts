import { cleanAds } from './adcleaner';
import { AutoPager, findVideosContainer, isListingPage, readActiveSort, unclipBodyOverflow } from './autopager';
import { canonicalListKey } from './bookmark';
import { attachCardBookmarkButtons, mountBookmarkButton, type BookmarkHandle } from './bookmark-ui';
import { FilterBar } from './filterbar';
import { hardenAnchor, hardenAnchorsIn, initNewTab, isWatchedId } from './newtab';
import { initNativeFilterPanel } from './nativefilter';
import { extractCardData, isAdCard, matchesClientFilter } from './parse';
import { isPaginationKey, stripPageSegment } from './routes';
import { CSS } from './styles';
import type { CardData, FilterState } from './types';

interface ManagedCard {
  el: HTMLElement;
  data: CardData;
}

let managedCards: ManagedCard[] = [];
let filterBar: FilterBar | null = null;
let autoPager: AutoPager | null = null;
let currentFilter: FilterState | null = null;
let bookmarkHandle: BookmarkHandle | null = null;
let lastActiveSort: string | null = null;
let awaitingAjaxReload = false;

function injectStyles(): void {
  if (document.getElementById('br34-styles')) return;
  const style = document.createElement('style');
  style.id = 'br34-styles';
  style.textContent = CSS;
  (document.head || document.documentElement).append(style);
}

/** Overlay own click-history onto site watched flags (site marks unreliably). */
function applyOwnWatched(el: HTMLElement, data: CardData): void {
  if (data.id && isWatchedId(data.id)) {
    data.isWatched = true;
    el.classList.add('watched');
  }
}

function scanCards(): void {
  const container = findVideosContainer();
  if (!container) return;

  cleanAds(container);

  const existingMap = new Map<HTMLElement, ManagedCard>();
  for (const c of managedCards) {
    existingMap.set(c.el, c);
  }

  const updatedCards: ManagedCard[] = [];
  const cardElements = Array.from(container.querySelectorAll<HTMLElement>('.item.thumb'));

  // Attach card bookmark ribbons to thumbnails
  attachCardBookmarkButtons(cardElements, () => {
    bookmarkHandle?.refresh();
  });

  for (const el of cardElements) {
    if (isAdCard(el)) {
      el.remove();
      continue;
    }

    const existing = existingMap.get(el);
    if (existing) {
      applyOwnWatched(existing.el, existing.data);
      updatedCards.push(existing);
      continue;
    }

    const data = extractCardData(el);
    if (data) {
      applyOwnWatched(el, data);
      updatedCards.push({ el, data });
    }
  }

  managedCards = updatedCards;
}

function applyFilter(): void {
  if (!currentFilter) return;

  let visibleCount = 0;
  for (const card of managedCards) {
    const isVisible = matchesClientFilter(card.data, currentFilter);
    card.el.dataset.br34Hidden = isVisible ? 'false' : 'true';
    if (isVisible) visibleCount++;
  }

  filterBar?.setCount(visibleCount, managedCards.length);
}

/** Synchronizes the active sort parameter to the browser address bar without page reload. */
function syncUrlSort(sortBy: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (sortBy) {
      url.searchParams.set('sort_by', sortBy);
    } else {
      url.searchParams.delete('sort_by');
    }
    // Remove pagination offsets since this is page 1 of new sort
    for (const k of [...url.searchParams.keys()]) {
      if (isPaginationKey(k)) url.searchParams.delete(k);
    }
    // Strip trailing page-number path segments (/2/)
    url.pathname = stripPageSegment(url.pathname);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Ignore
  }
}

/** Resets catalog state, AutoPager, and bookmark references after an AJAX sort or filter change. */
function handleSortOrFilterReload(): void {
  const currentSort = readActiveSort(document);
  syncUrlSort(currentSort);
  lastActiveSort = currentSort;
  unclipBodyOverflow();
  cleanAds();
  initNativeFilterPanel();
  managedCards = [];
  scanCards();
  applyFilter();
  autoPager?.reset();
  bookmarkHandle?.refresh();
}

function boot(): void {
  injectStyles();
  unclipBodyOverflow();
  cleanAds();
  hardenAnchorsIn(document);
  initNewTab(document);

  // Watch pages: new-tab hardening + standalone archive access
  if (!isListingPage()) {
    let dock = document.querySelector<HTMLElement>('.br34-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.className = 'br34-dock';
      document.body.append(dock);
    }
    const dummyFab = document.createElement('div');
    dummyFab.style.display = 'none';
    bookmarkHandle = mountBookmarkButton({
      fab: dummyFab,
      listKey: canonicalListKey(window.location.href),
      getPage: () => 1,
      getUrl: () => window.location.href,
    });
    return;
  }

  const container = findVideosContainer();
  if (!container) return;

  // Collapse the bulky native filter panel (default collapsed, idempotent).
  initNativeFilterPanel();

  lastActiveSort = readActiveSort(document);
  const listKey = canonicalListKey(window.location.href);

  // Mount floating filter bar (FAB + Seductive Modal)
  if (!filterBar || !filterBar.fabElement.isConnected) {
    filterBar?.destroy();

    filterBar = new FilterBar({
      onFilterChange: (state) => {
        currentFilter = state;
        applyFilter();
      },
    });

    currentFilter = filterBar.getState();
  }

  // Scan currently existing video cards
  scanCards();

  // Initialize AutoPager
  if (!autoPager) {
    autoPager = new AutoPager({
      onNewCards: (newEls) => {
        attachCardBookmarkButtons(newEls, () => {
          bookmarkHandle?.refresh();
        });
        for (const el of newEls) {
          for (const a of el.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]')) {
            hardenAnchor(a);
          }
          const data = extractCardData(el);
          if (data) {
            applyOwnWatched(el, data);
            managedCards.push({ el, data });
          } else {
            // Unidentifiable card (no video id): drop instead of tracking.
            el.remove();
          }
        }
        applyFilter();
      },
      onPageLoaded: () => {
        cleanAds();
        unclipBodyOverflow();
        initNativeFilterPanel();
        bookmarkHandle?.refresh();
      },
    });
    autoPager.init();
  }

  applyFilter();

  // Bookmark button docked next to the CTRL fab (idempotent on re-boot).
  if (filterBar && autoPager) {
    const pager = autoPager;
    bookmarkHandle = mountBookmarkButton({
      fab: filterBar.fabElement,
      listKey,
      getPage: () => pager.getCurrentPage(),
      getUrl: () => pager.getCurrentPageUrl(),
    });
  }
}

// Watch for DOM mutations
let scheduledTimer = 0;
function scheduleScan(): void {
  window.clearTimeout(scheduledTimer);
  scheduledTimer = window.setTimeout(() => {
    const currentSort = readActiveSort(document);
    const sortChanged = currentSort !== lastActiveSort;
    if (awaitingAjaxReload || sortChanged) {
      awaitingAjaxReload = false;
      handleSortOrFilterReload();
      return;
    }

    unclipBodyOverflow();
    cleanAds();
    initNativeFilterPanel();
    scanCards();
    applyFilter();
  }, 100);
}

// Listen for clicks on native sort chips or AJAX filter controls
document.addEventListener(
  'click',
  (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const ajaxTrigger = target.closest<HTMLElement>(
      '.filters-panel a[data-action="ajax"], .filters-panel .duration-filter__apply, [data-container-id*="sort_list"], #js-ajax_sort, #js-ajax_sort_custom',
    );
    if (ajaxTrigger) {
      awaitingAjaxReload = true;
    }
  },
  true,
);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot();
  });
} else {
  boot();
}

// Ensure overflow:hidden wrapper is neutralized when jQuery ready fires
window.addEventListener('load', () => {
  unclipBodyOverflow();
  boot();
});

const observer = new MutationObserver((mutations) => {
  // If AutoPager is currently appending handled cards, skip redundant full DOM rescan
  if (autoPager?.getIsAppending()) return;

  let shouldScan = false;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node instanceof HTMLElement) {
        if (node.classList.contains('item') || node.querySelector?.('.item.thumb')) {
          shouldScan = true;
          break;
        }
      }
    }
    if (shouldScan) break;
  }
  if (shouldScan) {
    scheduleScan();
  }
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});
