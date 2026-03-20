import type { BlobInfo } from '../types';
import { blobRegistry } from '../core/blob-store';
import { CACHE } from '../config';
import { looksM3U8Type, looksVideoType } from '../utils';

type DetectionCallback = (url: string, metadata?: { size?: number; type?: string; pageTitle?: string }) => void;

let onDetect: DetectionCallback | null = null;
const earlyDetections: Array<{ url: string; metadata?: { size?: number; type?: string; pageTitle?: string } }> = [];
const recentlyRevoked = new Set<string>();

// Periodic cleanup for recentlyRevoked to avoid timer spam
setInterval(() => {
  if (recentlyRevoked.size > 0) {
    recentlyRevoked.clear();
  }
}, CACHE.CLEAR_MS);

/**
 * Set the detection callback
 */
export function setDetectionCallback(cb: DetectionCallback): void {
  onDetect = cb;

  // Process any detections that happened before callback was set
  if (earlyDetections.length > 0) {
    const pending = [...earlyDetections];
    earlyDetections.length = 0;
    pending.forEach(({ url, metadata }) => cb(url, metadata));
  }
}

function checkContent(content: string): boolean {
  if (typeof content !== 'string') return false;
  // Robust check: allow whitespace, case-insensitive
  return /^\s*#EXTM3U/i.test(content);
}

/**
 * Extract episode info from URL patterns
 */
function extractEpisodeFromUrl(url?: string): string | null {
  const targetUrl = url || window.location.href;

  // Common patterns for episode numbers in URLs:
  // #ep=1, ?ep=1, &ep=1, /ep-1, /episode-1, /e1, /ep1
  const patterns = [
    /[#?&]ep(?:isode)?[=:](\d+)/i,          // #ep=1, ?episode=1
    /\/ep(?:isode)?[-_]?(\d+)/i,            // /ep-1, /episode_1, /ep1
    /\/e(\d+)(?:[^a-z0-9]|$)/i,             // /e1 (followed by non-alphanumeric)
    /[-_]ep(?:isode)?[-_]?(\d+)/i,          // -ep-1, _episode_1
    /[-_](\d{1,3})(?:[^0-9]|$)/,            // -1 at end (episode number)
  ];

  for (const pattern of patterns) {
    const match = targetUrl.match(pattern);
    if (match?.[1]) {
      return `Episode ${match[1]}`;
    }
  }

  return null;
}

/**
 * Build enhanced page title with episode info
 */
function buildEnhancedTitle(): string {
  const baseTitle = document.title;
  const episodeInfo = extractEpisodeFromUrl();

  // If title already contains episode info, just return it
  if (episodeInfo && !/episode\s*\d+/i.test(baseTitle)) {
    return `${baseTitle} • ${episodeInfo}`;
  }

  return baseTitle;
}

/**
 * Internal function to emit detection
 */
function emitDetection(url: string, metadata?: { size?: number; type?: string; pageTitle?: string }): void {
  // Always attach page title if not already present
  const meta = {
    ...metadata,
    pageTitle: metadata?.pageTitle || buildEnhancedTitle(),
  };

  if (onDetect) {
    onDetect(url, meta);
  } else {
    // Queue for later if callback not yet set
    earlyDetections.push({ url, metadata: meta });
  }
}

// ============================================
// createObjectURL Hook
// ============================================

function hookCreateObjectURL(): void {
  const original = URL.createObjectURL;

  URL.createObjectURL = function (obj: Blob | MediaSource): string {
    const href = original.call(this, obj);

    try {
      const now = Date.now();

      if (obj instanceof Blob) {
        const type = obj.type || '';
        const info: BlobInfo = {
          blob: obj,
          type,
          size: obj.size,
          kind: 'other',
          ts: now,
        };

        if (looksM3U8Type(type)) {
          info.kind = 'm3u8';
          blobRegistry.set(href, info);
          emitDetection(href);
        } else if (looksVideoType(type)) {
          info.kind = 'video';
          blobRegistry.set(href, info);
          emitDetection(href);
        } else {
          // Check content for ambiguous types
          // FIX: Only register if it actually LOOKS like media
          const needsCheck = /octet-stream|text\/plain|^$/.test(type);
          if (needsCheck && obj.size > 0 && obj.size < 5 * 1024 * 1024) { // Limit check to smallish blobs
            obj.slice(0, Math.min(2048, obj.size)).text()
              .then(text => {
                if (checkContent(text)) {
                  // Re-check revocation before registering
                  if (!recentlyRevoked.has(href)) {
                    info.kind = 'm3u8';
                    blobRegistry.set(href, info); // Only set if confirmed
                    emitDetection(href);
                  }
                }
                // Otherwise ignore (don't leak memory for images/etc)
              })
              .catch(() => {
                // Ignore errors
              });
          }
        }
      }
      // Note: We ignore MediaSource objects now as they are not downloadable directly 
      // and checking them was causing "false positive" entries in the registry.
    } catch (e) {
      console.error('[SG] createObjectURL hook error:', e);
    }

    return href;
  };
}

function hookRevokeObjectURL(): void {
  const original = URL.revokeObjectURL;

  URL.revokeObjectURL = function (href: string): void {
    try {
      const info = blobRegistry.get(href);
      if (info) {
        info.revoked = true;
        info.ts = Date.now();
      } else {
        // Track revocation for pending async checks
        recentlyRevoked.add(href);
      }
    } catch { /* ignore */ }

    return original.call(this, href);
  };
}

// ============================================
// Fetch Hook
// ============================================

function hookFetch(): void {
  const originalFetch = window.fetch;
  const originalResText = window.Response.prototype.text;

  if (typeof originalFetch !== 'function') return;

  // Hook Response.text() to inspect content
  window.Response.prototype.text = function () {
    const response = this; // Capture reference for .url access
    return originalResText.call(this).then((text) => {
      try {
        if (checkContent(text)) {
          emitDetection(response.url);
        }
      } catch (e) {
        console.error('[SG] Detection error in Response.text:', e);
      }
      return text;
    });
  };

  window.fetch = function (...args: Parameters<typeof fetch>): Promise<Response> {
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : (input as URL).href);
      if (url) emitDetection(url);
    } catch { /* ignore */ }

    return originalFetch.apply(this, args);
  };
}

// ============================================
// XHR Hook
// ============================================

function hookXHR(): void {
  const original = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ): void {
    try {
      const urlStr = typeof url === 'string' ? url : url?.href;
      if (urlStr) emitDetection(urlStr);
    } catch { /* ignore */ }

    // @ts-expect-error - rest params typing
    const result = original.call(this, method, url, ...rest);

    // Attach load listener to inspect content
    this.addEventListener('load', () => {
      try {
        // Only inspect text responses to avoid InvalidStateError on binary/blob types
        if (!this.responseType || this.responseType === 'text') {
          const content = this.responseText;
          const targetUrl = typeof url === 'string' ? url : url?.href;
          if (targetUrl && checkContent(content)) {
            emitDetection(targetUrl);
          }
        }
      } catch { /* ignore */ }
    });

    return result;
  };
}

// ============================================
// Performance Observer
// ============================================

function hookPerformanceObserver(): void {
  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if ('name' in entry && typeof entry.name === 'string') {
          emitDetection(entry.name);
        }
      }
    });
    observer.observe({ entryTypes: ['resource'] });
  } catch { /* ignore - not supported */ }
}

// ============================================
// Install All Hooks
// ============================================

let hooksInstalled = false;

export function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  hookCreateObjectURL();
  hookRevokeObjectURL();
  hookFetch();
  hookXHR();
  hookPerformanceObserver();
}