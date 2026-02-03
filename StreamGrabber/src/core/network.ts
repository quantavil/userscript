import type { HeadMeta, GmRequestOptions, BlobInfo } from '../types';
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
  opts: GmRequestOptions & {
    responseType: T,
    signal?: AbortSignal
  }
): Promise<T extends 'text' ? string : ArrayBuffer> {
  return new Promise<T extends 'text' ? string : ArrayBuffer>((resolve, reject) => {
    if (opts.signal?.aborted) {
      return reject(new Error('Aborted'));
    }

    const req = GM_xmlhttpRequest({
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

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => req.abort(), { once: true });
    }
  });
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

// ============================================
// Network Strategies
// ============================================

interface NetworkStrategy {
  fetch(url: string, options: StrategyOptions): Promise<ArrayBuffer>;
}

interface StrategyOptions {
  headers?: Record<string, string>;
  timeout?: number;
  onprogress?: (e: { loaded: number; total: number }) => void;
  signal?: AbortSignal;
}

class BlobStrategy implements NetworkStrategy {
  async fetch(url: string, options: StrategyOptions): Promise<ArrayBuffer> {
    const blobInfo = getBlobInfo(url, blobRegistry);
    if (!blobInfo || !blobInfo.blob) {
      throw new Error('Blob not found');
    }

    if (options.signal?.aborted) {
      throw new Error('Aborted');
    }

    const part = getBlobSlice(blobInfo.blob, options.headers?.Range);

    // Simulate progress
    if (options.onprogress) {
      // Execute largely to avoid blocking the main thread
      setTimeout(() => {
        if (!options.signal?.aborted) {
          options.onprogress!({ loaded: part.size, total: part.size });
        }
      }, 0);
    }

    // Read blob
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();

      const onAbort = () => {
        reader.abort();
        reject(new Error('Aborted'));
      };

      if (options.signal) {
        options.signal.addEventListener('abort', onAbort, { once: true });
      }

      reader.onload = () => {
        if (options.signal) options.signal.removeEventListener('abort', onAbort);
        resolve(reader.result as ArrayBuffer);
      };

      reader.onerror = () => {
        if (options.signal) options.signal.removeEventListener('abort', onAbort);
        reject(reader.error || new Error('Blob read error'));
      };

      reader.readAsArrayBuffer(part);
    });
  }
}

class NativeStrategy implements NetworkStrategy {
  async fetch(url: string, options: StrategyOptions): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers,
      signal: options.signal,
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    if (!response.body) throw new Error('No body');

    const reader = response.body.getReader();
    const contentLength = +(response.headers.get('Content-Length') || '0');
    let received = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (options.onprogress && contentLength) {
        options.onprogress({ loaded: received, total: contentLength });
      }
    }

    // Concatenate chunks
    const result = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }
}

class GmStrategy implements NetworkStrategy {
  async fetch(url: string, options: StrategyOptions): Promise<ArrayBuffer> {
    return gmGet({
      url,
      responseType: 'arraybuffer',
      headers: options.headers,
      timeout: options.timeout,
      onprogress: options.onprogress,
      signal: options.signal
    });
  }
}

// ============================================
// Binary Fetching (Facade)
// ============================================

export function getBin(
  url: string,
  headers: Record<string, string> = {},
  timeout = CFG.REQUEST_TIMEOUT,
  onprogress?: (e: { loaded: number; total: number }) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const isBlobUrl = getBlobInfo(url, blobRegistry);

  if (isBlobUrl) {
    return new BlobStrategy().fetch(url, { headers, timeout, onprogress, signal });
  }

  // Try Native -> Fallback to GM
  return new NativeStrategy().fetch(url, { headers, timeout, onprogress, signal })
    .catch((err) => {
      // If native fetch is aborted, rethrow immediately
      if (signal?.aborted || err.name === 'AbortError' || err.message === 'Aborted') {
        throw err;
      }

      // Fallback to GM
      return new GmStrategy().fetch(url, { headers, timeout, onprogress, signal });
    });
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