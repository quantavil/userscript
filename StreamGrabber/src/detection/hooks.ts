import type { BlobInfo } from '../types';
import { blobRegistry } from '../core/network';
import { looksM3U8Type, looksVideoType } from '../utils';

type DetectionCallback = (url: string, metadata?: { size?: number; type?: string }) => void;

let onDetect: DetectionCallback | null = null;
const earlyDetections: Array<{ url: string; metadata?: { size?: number; type?: string } }> = [];

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

/**
 * Internal function to emit detection
 */
function emitDetection(url: string, metadata?: { size?: number; type?: string }): void {
  if (onDetect) {
    onDetect(url, metadata);
  } else {
    // Queue for later if callback not yet set
    earlyDetections.push({ url, metadata });
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
          const needsCheck = /octet-stream|text\/plain|^$/.test(type);
          if (needsCheck && obj.size > 0) {
            obj.slice(0, Math.min(2048, obj.size)).text()
              .then(text => {
                if (/^#EXTM3U/i.test(text)) {
                  info.kind = 'm3u8';
                }
                blobRegistry.set(href, info);
                if (info.kind === 'm3u8') {
                  emitDetection(href);
                }
              })
              .catch(() => {
                blobRegistry.set(href, info);
              });
          } else {
            blobRegistry.set(href, info);
          }
        }
      } else {
        // MediaSource
        blobRegistry.set(href, {
          blob: null,
          type: 'mediasource',
          size: 0,
          kind: 'other',
          ts: now,
        });
      }
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
      }
    } catch { /* ignore */ }

    return original.call(this, href);
  };
}

// ============================================
// Fetch Hook
// ============================================

function hookFetch(): void {
  const original = window.fetch;
  if (typeof original !== 'function') return;

  window.fetch = function (...args: Parameters<typeof fetch>): Promise<Response> {
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : (input as URL).href);
      if (url) emitDetection(url);
    } catch { /* ignore */ }

    return original.apply(this, args);
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
    return original.call(this, method, url, ...rest);
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