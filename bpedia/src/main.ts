import { GM_xmlhttpRequest } from '$';
import './style.css';
import { PerformerProfile } from './types';
import { Cache } from './cache';
import { parseProfileHtml } from './parser';
import { ProgressBar } from './ui/progress';
import { FilterPanel } from './ui/filterPanel';

// In-memory profile store for the current page view
const pageProfiles = new Map<string, PerformerProfile>();

// Scraper queue
interface QueueItem {
  url: string;
  name: string;
}

const scrapeQueue: QueueItem[] = [];
const queuedUrls = new Set<string>(); // O(1) dedup instead of O(n) .some()
let isScraping = false;
let totalToScrape = 0;
let scrapedCount = 0;
const THROTTLE_DELAY_MS = 250;

// Coalesce rapid filter/tag updates into a single frame
let pendingFilterRaf = 0;
let pendingTagRaf = 0;

function scheduleFilterApply(): void {
  if (pendingFilterRaf) return;
  pendingFilterRaf = requestAnimationFrame(() => {
    pendingFilterRaf = 0;
    FilterPanel.applyFiltersToPage(pageProfiles);
  });
}

function scheduleTagRefresh(): void {
  if (pendingTagRaf) return;
  pendingTagRaf = requestAnimationFrame(() => {
    pendingTagRaf = 0;
    FilterPanel.populateDynamicTags(pageProfiles);
    scheduleFilterApply();
  });
}

function main() {
  const thumbsContainer = document.getElementById('thumbs');
  if (!thumbsContainer) return;

  // Init UI
  FilterPanel.init(() => {
    FilterPanel.applyFiltersToPage(pageProfiles);
  });
  ProgressBar.init();

  // Process initial thumbnails
  thumbsContainer.querySelectorAll('.thumbshot').forEach((thumb) => {
    processThumbshot(thumb as HTMLElement);
  });

  startQueueProcessor();

  // Initial tag + filter pass (single pass, not double)
  FilterPanel.populateDynamicTags(pageProfiles);
  FilterPanel.applyFiltersToPage(pageProfiles);

  setupAutoPagerObserver(thumbsContainer);
}

function processThumbshot(thumb: HTMLElement): void {
  const anchor = thumb.querySelector('a');
  if (!anchor) return;

  const url = anchor.getAttribute('href');
  if (!url) return;

  // Extract name (robust to 0 or multiple colons)
  let name = '';
  const textEl = thumb.querySelector('.thumbtext');
  if (textEl) {
    const rawText = textEl.textContent || '';
    const colonIdx = rawText.indexOf(':');
    name = colonIdx !== -1 ? rawText.substring(colonIdx + 1).trim() : rawText.trim();
  } else {
    name = anchor.getAttribute('title')?.trim() || url.split('/').pop()?.replace(/_/g, ' ') || '';
  }

  // Check cache first
  const cached = Cache.getProfile(url);
  if (cached) {
    pageProfiles.set(url, cached);
  } else if (!queuedUrls.has(url)) {
    queuedUrls.add(url);
    scrapeQueue.push({ url, name });
  }
}

function startQueueProcessor(): void {
  if (isScraping || scrapeQueue.length === 0) return;

  isScraping = true;
  totalToScrape = scrapeQueue.length;
  scrapedCount = 0;

  ProgressBar.show();
  ProgressBar.update(scrapedCount, totalToScrape);
  processNextQueueItem();
}

function processNextQueueItem(): void {
  if (scrapeQueue.length === 0) {
    isScraping = false;
    ProgressBar.hide();
    // Final refresh after all scraping completes
    scheduleTagRefresh();
    return;
  }

  const item = scrapeQueue.shift()!;
  queuedUrls.delete(item.url);

  // Double-check cache
  const cached = Cache.getProfile(item.url);
  if (cached) {
    pageProfiles.set(item.url, cached);
    scrapedCount++;
    ProgressBar.update(scrapedCount, totalToScrape);
    // Don't apply filters per-item during bulk scrape — coalesce
    scheduleFilterApply();
    processNextQueueItem();
    return;
  }

  const targetUrl = item.url.startsWith('http') ? item.url : window.location.origin + item.url;

  GM_xmlhttpRequest({
    method: 'GET',
    url: targetUrl,
    onload: (response: any) => {
      if (response.status === 200) {
        try {
          const profile = parseProfileHtml(response.responseText, item.url, item.name);
          Cache.setProfile(item.url, profile);
          pageProfiles.set(item.url, profile);

          // Coalesced: schedule a single tag+filter refresh per frame
          scheduleTagRefresh();
        } catch (e) {
          console.error(`[BP] Parse error for ${item.name}:`, e);
        }
      } else {
        console.warn(`[BP] Fetch failed for ${item.name}: ${response.status}`);
      }

      scrapedCount++;
      ProgressBar.update(scrapedCount, totalToScrape);
      setTimeout(processNextQueueItem, THROTTLE_DELAY_MS);
    },
    onerror: (err: any) => {
      console.error(`[BP] Network error for ${item.name}:`, err);
      scrapedCount++;
      ProgressBar.update(scrapedCount, totalToScrape);
      setTimeout(processNextQueueItem, THROTTLE_DELAY_MS);
    }
  });
}

function setupAutoPagerObserver(thumbsContainer: HTMLElement): void {
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
          el.querySelectorAll('.thumbshot').forEach((inner) => {
            processThumbshot(inner as HTMLElement);
            added = true;
          });
        }
      }
    }

    if (added) {
      // Immediately show badges for cached profiles
      scheduleFilterApply();

      // Resume or update queue progress
      if (scrapeQueue.length > 0) {
        if (!isScraping) {
          totalToScrape = scrapeQueue.length;
          scrapedCount = 0;
          isScraping = true;
          ProgressBar.show();
          ProgressBar.update(scrapedCount, totalToScrape);
          processNextQueueItem();
        } else {
          // If already scraping, adjust the total count dynamically
          totalToScrape = scrapedCount + scrapeQueue.length;
          ProgressBar.update(scrapedCount, totalToScrape);
        }
      }
    }
  });

  observer.observe(thumbsContainer, { childList: true, subtree: true });
}

main();
