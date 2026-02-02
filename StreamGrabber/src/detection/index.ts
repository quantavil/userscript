import type { MediaItem } from '../types';
import { CFG } from '../config';
import { state } from '../state';
import { blobRegistry } from '../core/network';
import {
  isHttp,
  isBlob,
  isM3U8Url,
  isVideoUrl,
  isSegmentUrl,
  guessExt,
  extractResFromUrl,
} from '../utils';
import { installHooks, setDetectionCallback } from './hooks';
import { scanVideos, startVideoObserver, setScanCallback } from './video-scanner';

// ============================================
// Debouncing
// ============================================

const pendingUrls = new Set<string>();

function debounceDetect(url: string, callback: (url: string) => void): void {
  if (pendingUrls.has(url)) return;
  pendingUrls.add(url);

  setTimeout(() => {
    pendingUrls.delete(url);
    callback(url);
  }, CFG.DETECT_DEBOUNCE);
}

// ============================================
// Item Creation
// ============================================

function createMediaItem(
  url: string,
  kind: 'hls' | 'video',
  metadata: { size?: number | null; type?: string | null } = {}
): MediaItem {
  const { size = null, type = null } = metadata;

  // Generate initial label
  let label: string;
  if (kind === 'hls') {
    const res = extractResFromUrl(url);
    label = res ? `${res} • Analyzing...` : 'Analyzing...';
  } else {
    label = guessExt(url, type).toUpperCase();
  }

  return {
    url,
    kind,
    label,
    sublabel: null,
    size,
    type,
    origin: document.location.origin,
    enriched: false,
    enriching: false,
    hlsType: null,
    isLive: false,
    encrypted: false,
    _enrichPromise: null,
  };
}

// ============================================
// Detection Handler
// ============================================

export type OnItemDetected = (item: MediaItem) => void;

let onItemDetected: OnItemDetected = () => { };

export function setItemDetectedCallback(cb: OnItemDetected): void {
  onItemDetected = cb;
}

function processUrl(url: string): void {
  try {
    // Validate URL
    if (!url || (!isHttp(url) && !isBlob(url))) return;

    // Skip segment URLs (fragments, not full videos)
    if (isSegmentUrl(url)) return;

    // BLACKLIST: Skip obvious non-media / tracking URLs
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.includes('ping.gif') ||
      lowerUrl.includes('jwpltx.com') ||
      lowerUrl.includes('doubleclick') ||
      lowerUrl.includes('analytics') ||
      lowerUrl.includes('/stats/')
    ) {
      return;
    }

    // Skip already detected
    if (state.hasItem(url)) return;

    // Get metadata from blob registry
    let size: number | null = null;
    let type: string | null = null;

    if (isBlob(url)) {
      const info = blobRegistry.get(url);
      if (info) {
        size = info.size;
        type = info.type;
      }

      // Skip small blobs that aren't m3u8
      if (size != null && size < 512 * 1024 && info?.kind !== 'm3u8') {
        return;
      }
    }

    // Determine media kind
    const isHls = isM3U8Url(url) || (isBlob(url) && blobRegistry.get(url)?.kind === 'm3u8');
    const isVideo = isVideoUrl(url) || (isBlob(url) && blobRegistry.get(url)?.kind === 'video');

    const kind = isHls ? 'hls' : isVideo ? 'video' : null;
    if (!kind) return;

    // Create and register item
    const item = createMediaItem(url, kind, { size, type });

    if (state.addItem(item)) {
      onItemDetected(item);
    }
  } catch (e) {
    console.error('[SG] processUrl error:', e);
  }
}

// ============================================
// Public API
// ============================================

let initialized = false;

export function initDetection(): void {
  if (initialized) return;
  initialized = true;

  // Wire up hooks
  setDetectionCallback((url) => debounceDetect(url, processUrl));
  setScanCallback((url) => debounceDetect(url, processUrl));

  // Install network hooks immediately
  installHooks();

  // Scan videos after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scanVideos();
      startVideoObserver();
    });
  } else {
    scanVideos();
    startVideoObserver();
  }
}

export { scanVideos, startVideoObserver, stopVideoObserver } from './video-scanner';