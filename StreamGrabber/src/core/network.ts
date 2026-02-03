import type { HeadMeta, AbortablePromise, GmRequestOptions, BlobInfo } from '../types';
import { CFG, CACHE } from '../config';
import {
  isBlob,
  once,
  parseHeaders,
  getBlobInfo,
  getBlobSlice,
} from '../utils/index';
import { blobRegistry } from './blob-store';

// ============================================
// Caches
// ============================================

const textCache = new Map<string, string>();
const textInflight = new Map<string, Promise<string>>();
const headCache = new Map<string, HeadMeta>();
const headInflight = new Map<string, Promise<HeadMeta>>();

// ============================================
// Core GM Request
// ============================================

export function gmGet<T extends 'text' | 'arraybuffer'>(
  opts: GmRequestOptions & { responseType: T }
): AbortablePromise<T extends 'text' ? string : ArrayBuffer> {
  let ref: ReturnType<typeof GM_xmlhttpRequest> | null = null;

  const p = new Promise<T extends 'text' ? string : ArrayBuffer>((resolve, reject) => {
    ref = GM_xmlhttpRequest({
      method: 'GET',
      url: opts.url,
      responseType: opts.responseType,
      headers: opts.headers || {},
      timeout: opts.timeout ?? CFG.REQUEST_TIMEOUT,
      onprogress: (e: any) => opts.onprogress?.({ loaded: e.loaded, total: e.total }),
      onload: (r: any) => {
        if (r.status >= 200 && r.status < 300) {
          resolve(r.response as T extends 'text' ? string : ArrayBuffer);
        } else {
          reject(new Error(`HTTP ${r.status}`));
        }
      },
      onerror: () => reject(new Error('Network error')),
      ontimeout: () => reject(new Error('Timeout')),
    });
  }) as AbortablePromise<T extends 'text' ? string : ArrayBuffer>;

  p.abort = () => {
    try {
      ref?.abort();
    } catch {
      /* ignore */
    }
  };

  return p;
}

// ============================================
// Text Fetching (with cache)
// ============================================

async function fetchText(url: string): Promise<string> {
  const blobInfo = getBlobInfo(url, blobRegistry);
  if (blobInfo) {
    if (!blobInfo.blob) throw new Error('Blob not found');
    return blobInfo.blob.text();
  }

  return gmGet({
    url,
    responseType: 'text',
    timeout: CFG.MANIFEST_TIMEOUT,
  });
}

export function getText(url: string): Promise<string> {
  return once(textCache, textInflight, url, () => fetchText(url), CACHE.TEXT_MAX);
}

// ============================================
// Binary Fetching
// ============================================

export function getBin(
  url: string,
  headers: Record<string, string> = {},
  timeout = CFG.REQUEST_TIMEOUT,
  onprogress?: (e: { loaded: number; total: number }) => void
): AbortablePromise<ArrayBuffer> {
  const blobInfo = getBlobInfo(url, blobRegistry);

  if (blobInfo) {
    if (!blobInfo.blob) {
      const p = Promise.reject(new Error('Blob not found')) as AbortablePromise<ArrayBuffer>;
      p.abort = () => { };
      return p;
    }

    const part = getBlobSlice(blobInfo.blob, headers.Range);

    if (onprogress) {
      setTimeout(() => onprogress({ loaded: part.size, total: part.size }), 0);
    }

    let aborted = false;
    const p = part.arrayBuffer().then((buf: ArrayBuffer) => {
      if (aborted) throw new Error('Aborted');
      return buf;
    }) as AbortablePromise<ArrayBuffer>;

    p.abort = () => {
      aborted = true;
    };
    return p;
  }

  // Smart Fetch: Try Native -> Fallback to GM
  let abortRef: (() => void) | null = null;
  let isAborted = false;

  const p = new Promise<ArrayBuffer>(async (resolve, reject) => {
    // 1. Try Native Fetch (Pre-flight check for CORS implicitly handled by browser)
    try {
      if (isAborted) throw new Error('Aborted');

      const controller = new AbortController();
      abortRef = () => controller.abort();

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      if (!response.body) throw new Error('No body');

      // Native fetch successful, read stream for progress
      const reader = response.body.getReader();
      const contentLength = +(response.headers.get('Content-Length') || '0');
      let received = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        if (isAborted) {
          reader.cancel();
          throw new Error('Aborted');
        }
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (onprogress && contentLength) {
          onprogress({ loaded: received, total: contentLength });
        }
      }

      // Concatenate chunks
      const result = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      resolve(result.buffer);
      return;
    } catch (e) {
      if (isAborted || (e as Error).name === 'AbortError') {
        reject(new Error('Aborted'));
        return;
      }
      // If native fetch fails (CORS, etc.), proceed to GM fallback
      // Don't log spam, just perform fallback
    }

    if (isAborted) {
      reject(new Error('Aborted'));
      return;
    }

    // 2. Fallback to GM_xmlhttpRequest
    const req = gmGet({
      url,
      responseType: 'arraybuffer',
      headers,
      timeout,
      onprogress,
    });

    abortRef = () => req.abort();

    req.then(resolve).catch(reject);

  }) as AbortablePromise<ArrayBuffer>;

  p.abort = () => {
    isAborted = true;
    if (abortRef) abortRef();
  };

  return p;
}

// ============================================
// HEAD Request (with cache)
// ============================================

async function fetchHead(url: string): Promise<HeadMeta> {
  try {
    const resp = await new Promise<{ responseHeaders: string }>((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'HEAD',
        url,
        timeout: CFG.REQUEST_TIMEOUT,
        onload: resolve,
        onerror: () => reject(new Error('HEAD failed')),
        ontimeout: () => reject(new Error('HEAD timeout')),
      });
    });

    const h = parseHeaders(resp.responseHeaders || '');
    return {
      length: h['content-length'] ? +h['content-length'] : null,
      type: h['content-type'] ? h['content-type'].trim() : null,
    };
  } catch {
    return { length: null, type: null };
  }
}

export function headMeta(url: string): Promise<HeadMeta> {
  return once(headCache, headInflight, url, () => fetchHead(url), CACHE.HEAD_MAX);
}

// ============================================
// Cache Maintenance
// ============================================

export function clearNetworkCaches(): void {
  textCache.clear();
  textInflight.clear();
  headCache.clear();
  headInflight.clear();
}

/**
 * Prune blobs from registry based on a predicate.
 * Returns the list of removed URLs.
 */
// Blob registry is now in ./blob-store.ts
export { blobRegistry } from './blob-store';