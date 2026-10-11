import { cleanAds } from './adcleaner';
import { hardenAnchor } from './newtab';
import { cardIdOf, isAdCard, parseKvsParameters, resolveNextPageUrl } from './parse';
import { appendPageToPath, isPaginationKey, pageNumberFromPath } from './routes';

const FETCH_TIMEOUT_MS = 20_000;
/** Start loading the next page this many pixels before the end of the list. */
const LOAD_AHEAD_PX = 1200;

interface AutoPagerOptions {
  onNewCards: (elements: HTMLElement[]) => void;
}

/** True on catalog listing pages; false on watch/login/static pages. */
export function isListingPage(urlStr: string = window.location.href): boolean {
  try {
    const { pathname } = new URL(urlStr);
    if (/\/video(\/|$)/.test(pathname)) return false;
    return !/^\/(login|signup|invite|premium|static|info|feedback)/.test(pathname);
  } catch {
    return true;
  }
}

export function findVideosContainer(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('.content_general .thumbs') ||
    document.querySelector<HTMLElement>('[id^="custom_list_videos_"][id$="_items"].thumbs') ||
    document.querySelector<HTMLElement>('.twocolumns .thumbs') ||
    document.querySelector<HTMLElement>('.thumbs') ||
    document.querySelector<HTMLElement>('[id$="_items"]')
  );
}

/**
 * Rule34Video runs $('body').wrapInner('<div style="position:relative;overflow:hidden">'),
 * which clips viewport scrolling and breaks IntersectionObserver.
 */
export function unclipBodyOverflow(): void {
  for (const w of document.querySelectorAll<HTMLElement>('body > div')) {
    if (w.style.overflow === 'hidden') w.style.overflow = 'visible';
  }
}

/** The active sort value from the site's filter chips, or null for the site default. */
export function readActiveSort(root: Document | Element = document): string | null {
  const activeBtn = root.querySelector<HTMLElement>(
    '.filters-panel__section--sort .btn.active, .filters-panel .btn.active[data-parameters*="sort_by"]',
  );
  const match = /(?:^|;)sort_by:([^;]*)(?:;|$)/.exec(activeBtn?.getAttribute('data-parameters') || '');
  return match?.[1] || null;
}

/** Builds the URL of page `nextPageNum`, keeping the listing base, query filters, and sort. */
export function computeNextPageUrl(currentUrlStr: string, nextPageNum: number, sortBy?: string | null): string | null {
  try {
    const url = new URL(currentUrlStr);

    if (sortBy !== undefined) {
      if (sortBy) url.searchParams.set('sort_by', sortBy);
      else url.searchParams.delete('sort_by');
    }

    // Search routes page with ?from_videos=N.
    if (url.pathname.includes('/search/')) {
      for (const k of [...url.searchParams.keys()]) {
        if (isPaginationKey(k) && k !== 'from_videos') url.searchParams.delete(k);
      }
      url.searchParams.set('from_videos', String(nextPageNum));
      return url.toString();
    }

    // Root, entity, and catalog routes page with a path segment.
    url.pathname = appendPageToPath(url.pathname, nextPageNum);
    for (const k of [...url.searchParams.keys()]) {
      if (isPaginationKey(k)) url.searchParams.delete(k);
    }
    return url.toString();
  } catch {
    return null;
  }
}

interface ParsedNextLinkResult {
  url: string | null;
  fromParam: number | null;
  sortBy: string | null;
}

/**
 * "Next page" from a native or fetched document. A real href wins; otherwise the KVS
 * `data-parameters` (async paging) supply the offset and sort. Returns nulls on the last page.
 */
export function parseNextLink(
  root: Document | Element,
  baseUrl: string,
  fallbackSortBy?: string | null,
): ParsedNextLinkResult {
  const none: ParsedNextLinkResult = { url: null, fromParam: null, sortBy: null };
  const nextLink = root.querySelector<HTMLAnchorElement>(
    '.pagination .item.pager.next a, .pagination .item.active + .item a, .pagination a.next',
  );
  if (!nextLink) return none;

  const raw = nextLink.getAttribute('href') || '';
  if (raw && !raw.startsWith('#') && !raw.startsWith('javascript:')) {
    return { url: resolveNextPageUrl(baseUrl, raw) || null, fromParam: null, sortBy: null };
  }
  const parsed = parseKvsParameters(nextLink.getAttribute('data-parameters') || '');
  if (parsed.fromParam === null) return none;
  const sortBy = parsed.sortBy !== null ? parsed.sortBy : (fallbackSortBy ?? null);
  return { url: computeNextPageUrl(baseUrl, parsed.fromParam, sortBy), fromParam: parsed.fromParam, sortBy };
}

/** Next page URL for `root`, or null when the listing has ended. */
function resolveNextUrl(root: Document | Element, baseUrl: string, currentPage: number): string | null {
  const activeSort = readActiveSort(document);
  const { url, fromParam, sortBy } = parseNextLink(root, baseUrl, activeSort);
  if (url) return url;
  if (fromParam !== null) return computeNextPageUrl(baseUrl, fromParam, sortBy ?? activeSort);
  // No server link. Path paging is predictable, but search offsets are opaque, so stop there.
  try {
    if (!new URL(baseUrl).pathname.includes('/search/')) return computeNextPageUrl(baseUrl, currentPage + 1, activeSort);
  } catch {
    // fall through
  }
  return null;
}

/** Page 2, 3, ... of a listing, appended below the first as you scroll. */
export class AutoPager {
  private container: HTMLElement | null = null;
  private statusContainer: HTMLElement | null = null;
  private sentinel: HTMLElement | null = null;
  private observer: IntersectionObserver | null = null;
  private nextUrl: string | null = null;
  private currentPage = 1;
  private isLoading = false;
  private isAppending = false;
  private scrollBound = false;
  private readonly seenCardIds = new Set<string>();
  private readonly onNewCards: (elements: HTMLElement[]) => void;

  private readonly maybeLoad = (): void => {
    if (this.isLoading || !this.nextUrl || !this.sentinel) return;
    if (this.sentinel.getBoundingClientRect().top <= window.innerHeight + LOAD_AHEAD_PX) void this.loadNextPage();
  };

  constructor(options: AutoPagerOptions) {
    this.onNewCards = options.onNewCards;
  }

  init(): void {
    unclipBodyOverflow();
    if (!isListingPage()) return;
    this.container = findVideosContainer();
    if (!this.container) return;
    this.currentPage = this.detectCurrentPageNumber();
    this.indexExistingCards();
    this.nextUrl = resolveNextUrl(document, window.location.href, this.currentPage);
    this.hideNativePagination();
    this.mountStatusElements();
    this.setupObserver();
    if (!this.scrollBound) {
      this.scrollBound = true;
      let ticking = false;
      const onScroll = (): void => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          this.maybeLoad();
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }
  }

  getIsAppending(): boolean {
    return this.isAppending;
  }

  /** Loads the next page if the end of the list is near. Call after the list shrinks (filters). */
  nudge(): void {
    this.maybeLoad();
  }

  /** Starts over after the site swaps the list through AJAX (sort or native filter change). */
  reset(): void {
    for (const sep of document.querySelectorAll('.br34-page-sep')) sep.remove();
    this.container = findVideosContainer();
    this.indexExistingCards();
    this.currentPage = 1;
    this.isLoading = false;
    this.isAppending = false;
    this.nextUrl = resolveNextUrl(document, window.location.href, 1);
    this.hideNativePagination();
    this.mountStatusElements();
    this.setupObserver();
  }

  private indexExistingCards(): void {
    this.seenCardIds.clear();
    if (!this.container) return;
    for (const card of this.container.querySelectorAll<HTMLElement>('.item.thumb')) {
      if (isAdCard(card)) {
        card.remove();
        continue;
      }
      const id = cardIdOf(card);
      if (id) this.seenCardIds.add(id);
    }
  }

  private detectCurrentPageNumber(): number {
    try {
      const url = new URL(window.location.href);
      for (const key of ['from_videos', 'from_videos+from_albums', 'from_videos from_albums', 'from', 'page', 'p']) {
        const n = parseInt(url.searchParams.get(key) || '', 10);
        if (n > 0) return n;
      }
      return pageNumberFromPath(url.pathname) ?? 1;
    } catch {
      return 1;
    }
  }

  private hideNativePagination(): void {
    const pagination = document.querySelector<HTMLElement>('.pagination');
    if (pagination) pagination.style.display = 'none';
  }

  private mountStatusElements(): void {
    if (!this.container) return;
    this.statusContainer ??= Object.assign(document.createElement('div'), { className: 'br34-autopager-container' });
    this.sentinel ??= Object.assign(document.createElement('div'), { className: 'br34-sentinel' });
    // Moving is a no-op when already in place, and re-attaches them if the site swapped the list.
    this.container.after(this.statusContainer);
    this.statusContainer.before(this.sentinel);
    this.updateStatusDisplay();
  }

  private setupObserver(): void {
    this.observer?.disconnect();
    if (typeof IntersectionObserver === 'undefined' || !this.sentinel) return;
    this.observer = new IntersectionObserver(this.maybeLoad, { rootMargin: `${LOAD_AHEAD_PX}px 0px` });
    this.observer.observe(this.sentinel);
  }

  private updateStatusDisplay(): void {
    if (!this.statusContainer) return;
    if (this.isLoading) {
      this.statusContainer.innerHTML = `<div class="br34-autopager-loading"><div class="br34-spinner"></div><span>LOADING PAGE ${this.currentPage + 1}…</span></div>`;
    } else if (!this.nextUrl) {
      this.statusContainer.innerHTML = `<div class="br34-autopager-end">[ END OF LIST · ${this.seenCardIds.size} VIDEOS ]</div>`;
    } else {
      this.statusContainer.innerHTML = '';
    }
  }

  private showError(): void {
    if (!this.statusContainer) return;
    this.statusContainer.innerHTML = `<div class="br34-autopager-end br34-autopager-error">[ COULD NOT LOAD PAGE · <button type="button" class="br34-retry">RETRY</button> ]</div>`;
    this.statusContainer.querySelector('button')?.addEventListener('click', () => void this.loadNextPage());
  }

  /** Fetches a page and returns its not-yet-seen cards, prepared for display. */
  private async fetchCards(url: string): Promise<{ doc: Document; cards: HTMLElement[] }> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
        headers: { Accept: 'text/html,application/xhtml+xml' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      cleanAds(doc);
      const cards: HTMLElement[] = [];
      for (const card of doc.querySelectorAll<HTMLElement>('.item.thumb')) {
        if (isAdCard(card)) continue;
        const id = cardIdOf(card);
        if (!id || this.seenCardIds.has(id)) continue;
        this.seenCardIds.add(id);
        prepareCard(card);
        cards.push(card);
      }
      return { doc, cards };
    } finally {
      window.clearTimeout(timer);
    }
  }

  async loadNextPage(): Promise<void> {
    if (this.isLoading || !this.nextUrl) return;
    this.container = findVideosContainer();
    if (!this.container) return;

    this.isLoading = true;
    this.updateStatusDisplay();
    const fetchUrl = this.nextUrl;
    let added: HTMLElement[] = [];
    let failed = false;

    try {
      const { doc, cards } = await this.fetchCards(fetchUrl);
      this.currentPage++;

      if (cards.length === 0) {
        // An empty or repeated page means the list is over. Without this, path paging
        // would keep counting past the last page forever.
        this.nextUrl = null;
      } else {
        this.isAppending = true;
        try {
          const sep = document.createElement('div');
          sep.className = 'br34-page-sep';
          sep.textContent = `[ PAGE ${this.currentPage} ]`;
          this.container.append(sep, ...cards);
        } finally {
          window.setTimeout(() => (this.isAppending = false), 50);
        }
        this.nextUrl = resolveNextUrl(doc, fetchUrl, this.currentPage);
        added = cards;
      }
    } catch (err) {
      failed = true;
      console.error('[Better Rule34] AutoPager error:', err);
      this.showError();
    } finally {
      this.isLoading = false;
      if (!failed) this.updateStatusDisplay();
      unclipBodyOverflow();
    }
    // Last, once loading state and the next URL are settled: the callback may ask for more.
    if (added.length > 0) this.onNewCards(added);
  }
}

/** Makes a fetched card behave like a native one: new-tab link and a real thumbnail. */
function prepareCard(card: HTMLElement): void {
  for (const anchor of card.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]')) hardenAnchor(anchor);
  const img = card.querySelector<HTMLImageElement>('img');
  if (!img) return;
  const real =
    img.getAttribute('data-rd-src') ||
    img.getAttribute('data-webp') ||
    img.getAttribute('data-original') ||
    img.getAttribute('data-src');
  if (real) img.src = real;
  for (const attr of ['data-rd-src', 'data-original', 'data-webp', 'data-src']) img.removeAttribute(attr);
  img.classList.remove('lazy-load');
  img.loading = 'lazy';
}
