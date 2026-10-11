import { cleanAds } from './adcleaner';
import { AutoPager, findVideosContainer, isListingPage, readActiveSort, unclipBodyOverflow } from './autopager';
import { AutoplayController } from './autoplay';
import { decorateCard, paintCard } from './cardmark';
import { hardenAnchorsIn, initNewTab } from './newtab';
import { cardIdOf, extractCardData, isAdCard, matchesClientFilter } from './parse';
import { isPaginationKey, stripPageSegment } from './routes';
import { SheetFilter } from './sheetfilter';
import { CSS } from './styles';
import { isWatched, onWatchChange } from './watchstore';
import { attachWatchTracker, mountWatchToggle } from './watchtrack';
import type { CardData, FilterState } from './types';

/** Previews playing at once. Phones decode fewer clips at a time. */
const MAX_ACTIVE_PREVIEWS = window.matchMedia?.('(pointer: coarse)').matches ? 6 : 12;
const MIN_VISIBLE_RATIO = 0.5;
/** After this many pages in a row add no visible card, auto-loading waits for a scroll. */
const MAX_EMPTY_PAGES = 3;
const SCAN_DELAY_MS = 100;
/** Sections only the ALL FILTERS sheet has. Used to find the sheet body. */
const SHEET_MARK = '[data-sec="date"], [data-sec="dur"]';
/** Clear all in that sheet. */
const SHEET_RESET = '.fs-sheet__foot [data-act="reset"]';

/** Card element to its parsed data. */
const managed = new Map<HTMLElement, CardData>();
let filterBar: SheetFilter | null = null;
let currentFilter: FilterState | null = null;
let autoPager: AutoPager | null = null;
let autoplay: AutoplayController | null = null;
/** Identifies the list last shown. A different key means the site replaced the list. */
let lastListKey: string | null = null;
let watchSubscribed = false;
let emptyPages = 0;
let scanTimer = 0;

/** Data saver on: no autoplay. */
function saveDataOn(): boolean {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

function injectStyles(): void {
  if (document.getElementById('br34-styles')) return;
  const style = document.createElement('style');
  style.id = 'br34-styles';
  style.textContent = CSS;
  (document.head || document.documentElement).append(style);
}

/** Registers one card: parse it, add the watched toggle, and queue its preview. */
function adopt(el: HTMLElement): void {
  if (managed.has(el)) return;
  if (isAdCard(el)) {
    el.remove();
    return;
  }
  const data = extractCardData(el);
  if (!data) return;
  managed.set(el, data);
  hardenAnchorsIn(el);
  decorateCard(el, data.id, isWatched(data.id));
  autoplay?.observe(el);
}

function scanCards(): void {
  const container = findVideosContainer();
  if (!container) return;
  for (const el of container.querySelectorAll<HTMLElement>('.item.thumb')) adopt(el);
  for (const el of [...managed.keys()]) {
    if (el.isConnected) continue;
    managed.delete(el);
    autoplay?.unobserve(el);
  }
}

function applyFilter(): void {
  if (!currentFilter) return;
  let visible = 0;
  for (const [el, data] of managed) {
    const ok = matchesClientFilter(data, currentFilter);
    el.dataset.br34Hidden = ok ? 'false' : 'true';
    if (ok) visible++;
  }
  filterBar?.setCount(visible, managed.size);
}

function syncWatchState(): void {
  for (const [el, data] of managed) paintCard(el, isWatched(data.id));
  autoplay?.refresh();
}

/** Writes the active sort into the address bar without a reload. */
function syncUrlSort(sortBy: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (sortBy) url.searchParams.set('sort_by', sortBy);
    else url.searchParams.delete('sort_by');
    for (const k of [...url.searchParams.keys()]) {
      if (isPaginationKey(k)) url.searchParams.delete(k);
    }
    url.pathname = stripPageSegment(url.pathname);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Address bar sync is cosmetic.
  }
}

/** Id of the first real card on the page. Ad cards have no id and are skipped. */
function firstCardId(): string {
  for (const el of findVideosContainer()?.querySelectorAll<HTMLElement>('.item.thumb') ?? []) {
    const id = cardIdOf(el);
    if (id) return id;
  }
  return '';
}

/**
 * Identifies the list on screen: page, filters, sort, and newest card. It changes when the
 * site swaps the list, whether that came from a sort, a filter, or Apply in the sheet.
 */
function currentListKey(): string {
  const params = new URLSearchParams(window.location.search);
  for (const k of [...params.keys()]) {
    if (isPaginationKey(k) || k === 'sort_by') params.delete(k);
  }
  return `${window.location.pathname}?${params}|${readActiveSort(document) ?? ''}|${firstCardId()}`;
}

/** Puts the rating and views pills into the ALL FILTERS sheet body, if the sheet is on the page. */
function mountSheetControls(): void {
  if (!filterBar) return;
  for (const body of document.querySelectorAll<HTMLElement>('.fs-sheet__body')) {
    if (body.querySelector(SHEET_MARK)) {
      filterBar.mount(body);
      return;
    }
  }
}

function refresh(): void {
  unclipBodyOverflow();
  cleanAds();
  mountSheetControls();
  scanCards();
  applyFilter();
}

/** The site replaced the list: start the list over. */
function reloadList(): void {
  syncUrlSort(readActiveSort(document));
  managed.clear();
  autoplay?.reset();
  emptyPages = 0;
  refresh();
  autoPager?.reset();
  lastListKey = currentListKey();
}

function onFilterChange(filter: FilterState): void {
  currentFilter = filter;
  emptyPages = 0;
  applyFilter();
  // A filter can leave the page too short to scroll. Pull in more until it fills.
  autoPager?.nudge();
}

function onNewCards(els: HTMLElement[]): void {
  for (const el of els) adopt(el);
  applyFilter();
  const anyVisible = els.some((el) => el.dataset.br34Hidden !== 'true');
  emptyPages = anyVisible ? 0 : emptyPages + 1;
  if (emptyPages < MAX_EMPTY_PAGES) autoPager?.nudge();
}

function boot(): void {
  injectStyles();
  unclipBodyOverflow();
  cleanAds();
  initNewTab(document);

  if (!isListingPage()) {
    attachWatchTracker();
    mountWatchToggle();
    return;
  }
  if (!findVideosContainer()) return;

  filterBar ??= new SheetFilter(onFilterChange);
  currentFilter = filterBar.getFilter();
  autoplay ??= new AutoplayController({
    maxActive: MAX_ACTIVE_PREVIEWS,
    minRatio: MIN_VISIBLE_RATIO,
    enabled: !saveDataOn(),
    isEligible: (card) => !card.classList.contains('br34-watched'),
  });
  if (!watchSubscribed) {
    watchSubscribed = true;
    onWatchChange(syncWatchState);
  }

  if (!autoPager) {
    refresh();
    autoPager = new AutoPager({ onNewCards });
    autoPager.init();
    lastListKey = currentListKey();
    return;
  }
  if (currentListKey() !== lastListKey) reloadList();
  else refresh();
}

function scheduleScan(): void {
  window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(() => {
    if (!isListingPage()) return;
    // Cards that arrived after the first boot: set the page up now.
    if (!filterBar) {
      boot();
      return;
    }
    if (currentListKey() !== lastListKey) reloadList();
    else refresh();
  }, SCAN_DELAY_MS);
}

// Clear all in the ALL FILTERS sheet also clears the min rating and views.
document.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest(SHEET_RESET)) filterBar?.reset();
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
// boot is idempotent. This pass catches parts of the page that render late.
window.addEventListener('load', boot);

new MutationObserver((mutations) => {
  if (autoPager?.getIsAppending()) return;
  let cards = false;
  let sheet = false;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      cards ||= node.matches('.item.thumb') || !!node.querySelector('.item.thumb');
      sheet ||= node.matches(SHEET_MARK) || !!node.querySelector(SHEET_MARK);
    }
  }
  if (sheet) mountSheetControls();
  if (cards) scheduleScan();
}).observe(document.body || document.documentElement, { childList: true, subtree: true });
