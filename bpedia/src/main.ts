import { GM_xmlhttpRequest } from '$';
import './style.css';
import { PerformerProfile } from './types';
import { Cache, cleanUrl } from './cache';
import { parseProfileHtml, extractPerformerName } from './parser';
import { ProgressBar } from './ui/progress';
import { FilterPanel } from './ui/filterPanel';

// In-memory profile store for the current page view, keyed by clean performer slug
const pageProfiles = new Map<string, PerformerProfile>();

// Scraper queue
interface QueueItem {
  url: string;
  name: string;
}

const scrapeQueue: QueueItem[] = [];
const queuedUrls = new Set<string>(); // O(1) dedup using clean slug
let isScraping = false;
let totalToScrape = 0;
let scrapedCount = 0;
const CONCURRENCY = 3;
let activeCount = 0;
const DISPATCH_GAP_MS = 150;
let nextDispatchAt = 0;
let consecutiveFailures = 0;
let cooldownUntil = 0;
let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_RETRIES = 3;
const itemRetries = new Map<string, number>();

// Coalesce rapid filter/tag updates into a single frame
function coalesce(run: () => void): () => void {
  let pending = 0;
  return () => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      run();
    });
  };
}

const scheduleFilterApply = coalesce(() => {
  FilterPanel.applyFiltersToPage(pageProfiles);
});

const scheduleTagRefresh = coalesce(() => {
  FilterPanel.populateDynamicTags(pageProfiles);
  scheduleFilterApply();
});

function isSidebarThumb(thumb: HTMLElement): boolean {
  return (
    !!thumb.closest('aside, .sidebar, .menuthumb') ||
    thumb.classList.contains('menuthumb') ||
    thumb.classList.contains('thumbshotsmall')
  );
}

function findBabeAnchor(thumb: HTMLElement): HTMLAnchorElement | null {
  return (
    thumb.querySelector<HTMLAnchorElement>('a[href*="/babe/"]') ||
    thumb.querySelector<HTMLAnchorElement>('a')
  );
}

function main() {
  Cache.initDbCache();

  // If viewing an individual performer profile page, don't run list filtering
  if (/^\/babe\/[^/]+$/i.test(window.location.pathname)) return;

  const thumbs = Array.from(document.querySelectorAll<HTMLElement>('.thumbshot')).filter(
    (t) => !isSidebarThumb(t)
  );

  // If no thumbnails yet, set up observer and wait for potential dynamic loads
  if (thumbs.length === 0) {
    setupAutoPagerObserver();
    return;
  }

  // Init UI
  FilterPanel.init(() => {
    FilterPanel.applyFiltersToPage(pageProfiles);
  });
  ProgressBar.init();

  // Process initial thumbnails
  thumbs.forEach((thumb) => {
    processThumbshot(thumb);
  });

  startQueueProcessor();

  // Initial tag + filter pass
  FilterPanel.populateDynamicTags(pageProfiles);
  FilterPanel.applyFiltersToPage(pageProfiles);

  setupAutoPagerObserver();

  window.addEventListener('pagehide', () => {
    Cache.flushFilterSettings();
  });
}

function processThumbshot(thumb: HTMLElement): void {
  if (isSidebarThumb(thumb)) return;

  const anchor = findBabeAnchor(thumb);
  if (!anchor) return;

  const rawUrl = anchor.getAttribute('href');
  if (!rawUrl) return;

  const slug = cleanUrl(rawUrl);
  if (!slug || (!rawUrl.includes('/babe/') && !/^[a-zA-Z0-9_.-]+$/.test(rawUrl))) {
    return;
  }

  const name = extractPerformerName(thumb, anchor);
  thumb.setAttribute('data-bp-name', name);
  thumb.setAttribute('data-bp-slug', slug);

  // Check cache first (normalized by clean slug)
  const cached = Cache.getProfile(slug);
  if (cached) {
    pageProfiles.set(slug, cached);
  } else {
    enqueueThumb(slug, name);
  }
}

/**
 * Queue a profile for scraping. The total only ever grows here —
 * retries reuse their original slot — so "done/total" never shrinks.
 */
function enqueueThumb(slug: string, name: string): void {
  if (queuedUrls.has(slug)) return;
  queuedUrls.add(slug);
  scrapeQueue.push({ url: slug, name });
  totalToScrape++;
  if (isScraping) ProgressBar.update(scrapedCount, totalToScrape);
}

function startQueueProcessor(): void {
  if (isScraping || scrapeQueue.length === 0) return;

  isScraping = true;
  ProgressBar.show();
  ProgressBar.update(scrapedCount, totalToScrape);
  pumpQueue();
}

/** Requeue with backoff or give up after MAX_RETRIES. */
function handleRetryable(item: QueueItem, errorMsg: string): void {
  consecutiveFailures++;
  console.warn(errorMsg);
  cooldownUntil = Date.now() + Math.min(10000, consecutiveFailures * 2000);
  const slug = cleanUrl(item.url);
  const retries = itemRetries.get(slug) || 0;
  if (retries < MAX_RETRIES) {
    itemRetries.set(slug, retries + 1);
    scrapeQueue.push(item);
  } else {
    console.error(`[BP] Max retries reached for ${item.name}. Skipping.`);
    itemRetries.delete(slug);
    queuedUrls.delete(slug);
    scrapedCount++;
    ProgressBar.update(scrapedCount, totalToScrape);
  }
}

/** Permanent failure: count it done so the counter keeps moving forward. */
function handleTerminal(item: QueueItem, errorMsg: string): void {
  console.warn(errorMsg);
  const slug = cleanUrl(item.url);
  queuedUrls.delete(slug);
  itemRetries.delete(slug);
  scrapedCount++;
  ProgressBar.update(scrapedCount, totalToScrape);
}

function pumpQueue(): void {
  if (!isScraping) return;

  const now = Date.now();
  if (now < cooldownUntil) {
    if (!cooldownTimer) {
      cooldownTimer = setTimeout(() => {
        cooldownTimer = null;
        if (isScraping) pumpQueue();
      }, cooldownUntil - now);
    }
    return;
  }

  while (activeCount < CONCURRENCY && scrapeQueue.length > 0) {
    const item = scrapeQueue.shift();
    if (!item) break;

    const slug = cleanUrl(item.url);

    // Double-check cache: may have been stored while queued
    const cached = Cache.getProfile(slug);
    if (cached) {
      queuedUrls.delete(slug);
      pageProfiles.set(slug, cached);
      scrapedCount++;
      ProgressBar.update(scrapedCount, totalToScrape);
      scheduleFilterApply();
      continue;
    }

    activeCount++;
    const delay = Math.max(0, nextDispatchAt - Date.now());
    nextDispatchAt = Date.now() + delay + DISPATCH_GAP_MS;
    setTimeout(() => {
      try {
        dispatchItem(item);
      } catch (e) {
        activeCount--;
        handleRetryable(item, `[BP] Dispatch failed for ${item.name}: ${e}`);
        pumpQueue();
      }
    }, delay);
  }

  if (scrapeQueue.length === 0 && activeCount === 0) {
    isScraping = false;
    ProgressBar.hide();
    scheduleTagRefresh();
  }
}

function requestProfile(targetUrl: string): Promise<{ status: number; responseText: string }> {
  if (typeof GM_xmlhttpRequest === 'function') {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: targetUrl,
        timeout: 30000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': navigator.language || 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        onload: (res: any) => resolve({ status: res.status, responseText: res.responseText }),
        onerror: (err: any) => reject(new Error(String(err))),
        ontimeout: () => reject(new Error('Timeout after 30s'))
      });
    });
  }

  // Fallback to native fetch for same-origin requests
  return fetch(targetUrl, {
    credentials: 'same-origin',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }).then(async (res) => ({
    status: res.status,
    responseText: await res.text()
  }));
}

function dispatchItem(item: QueueItem): void {
  const slug = cleanUrl(item.url);
  const targetUrl = `https://www.babepedia.com/babe/${slug}`;

  requestProfile(targetUrl)
    .then(({ status, responseText }) => {
      activeCount--;
      if (status === 200) {
        try {
          const profile = parseProfileHtml(responseText, `/babe/${slug}`, item.name);
          Cache.setProfile(slug, profile);
          pageProfiles.set(slug, profile);

          consecutiveFailures = 0;
          cooldownUntil = 0;
          itemRetries.delete(slug);
          queuedUrls.delete(slug);
          scrapedCount++;
          ProgressBar.update(scrapedCount, totalToScrape);

          scheduleTagRefresh();
        } catch (e) {
          handleRetryable(item, `[BP] Parse error / verification failed for ${item.name}: ${e}`);
        }
      } else if (status === 429 || status === 503 || status === 403) {
        handleRetryable(item, `[BP] Rate limited or blocked (${status}) for ${item.name}.`);
      } else {
        handleTerminal(item, `[BP] Fetch failed for ${item.name}: ${status}`);
      }
      pumpQueue();
    })
    .catch((err) => {
      activeCount--;
      handleRetryable(item, `[BP] Request failed for ${item.name}: ${err}`);
      pumpQueue();
    });
}

function setupAutoPagerObserver(): void {
  const target = document.getElementById('content') || document.body;
  if (!target) return;

  const observer = new MutationObserver((mutations) => {
    let added = false;

    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as HTMLElement;

        if (el.classList.contains('thumbshot')) {
          processThumbshot(el);
          added = true;
        } else {
          el.querySelectorAll<HTMLElement>('.thumbshot').forEach((inner) => {
            processThumbshot(inner);
            added = true;
          });
        }
      }
    }

    if (added) {
      scheduleFilterApply();

      if (scrapeQueue.length > 0) {
        if (!isScraping) {
          isScraping = true;
          ProgressBar.show();
        }
        ProgressBar.update(scrapedCount, totalToScrape);
        pumpQueue();
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
}

main();
