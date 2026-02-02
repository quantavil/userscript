/**
 * Shared utilities to eliminate duplication across modules
 */

import type { MediaItem, Variant, BlobInfo } from '../types';
import { formatBytes, formatDuration, isBlob, parseRange } from '../utils';

// ============================================
// Variant Utilities
// ============================================

/**
 * Sort variants by resolution (height) then bitrate (avg or peak)
 * Returns new sorted array, does not mutate input
 */
export function sortVariantsByQuality(variants: Variant[]): Variant[] {
  return [...variants].sort(
    (a, b) =>
      (b.h || 0) - (a.h || 0) ||
      (b.avg || b.peak || 0) - (a.avg || a.peak || 0)
  );
}

/**
 * Get best variant from list (highest quality)
 */
export function getBestVariant(variants: Variant[]): Variant | undefined {
  return sortVariantsByQuality(variants)[0];
}

// ============================================
// Label Generation
// ============================================

export interface LabelParts {
  resolution?: string | null;
  duration?: number | null;
  size?: number | null;
  bitrate?: number | null;
  extra?: string[];
}

/**
 * Build a display label from parts (e.g., "1080p • 5:32 • 150 MB")
 */
export function buildLabel(parts: LabelParts): string {
  const items: string[] = [];

  if (parts.resolution) {
    items.push(parts.resolution);
  }

  if (parts.bitrate) {
    items.push(`${Math.round(parts.bitrate / 1000)}k`);
  }

  if (parts.duration && parts.duration > 0) {
    const dur = formatDuration(parts.duration);
    if (dur) items.push(dur);
  }

  if (parts.size != null) {
    items.push(`~${formatBytes(parts.size)}`);
  }

  if (parts.extra) {
    items.push(...parts.extra);
  }

  return items.length > 0 ? items.join(' • ') : 'Video Stream';
}

/**
 * Build sublabel for media items
 */
export function buildSublabel(segCount: number, isFmp4: boolean): string {
  const format = isFmp4 ? 'fMP4' : 'TS';
  return `${segCount} segments • ${format}`;
}

// ============================================
// Notification
// ============================================

export interface NotifyOptions {
  title?: string;
  timeout?: number;
  onclick?: () => void;
}

/**
 * Show a notification (wrapper around GM_notification)
 */
export function notify(message: string, options: NotifyOptions = {}): void {
  GM_notification({
    text: message,
    title: options.title ?? 'StreamGrabber',
    timeout: options.timeout ?? 3000,
    onclick: options.onclick,
  });
}

/**
 * Notify download complete
 */
export function notifyDownloadComplete(filename: string): void {
  notify(`Download complete: ${filename}`);
}

// ============================================
// Error Handling
// ============================================

/**
 * Extract error message safely
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return String(e);
}

/**
 * Show error alert with consistent formatting
 */
export function alertError(e: unknown, prefix?: string): void {
  const msg = getErrorMessage(e);
  alert(prefix ? `${prefix}: ${msg}` : msg);
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate unique ID (use this instead of inline Math.random())
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Generate short ID (for message correlation)
 */
export function shortId(): string {
  return Math.random().toString(36).slice(2);
}

// ============================================
// Serialization
// ============================================

/** Keys to serialize for cross-frame MediaItem transfer */
const SERIALIZABLE_KEYS: (keyof MediaItem)[] = [
  'url',
  'kind',
  'label',
  'sublabel',
  'size',
  'type',
  'origin',
  'enriched',
  'enriching',
  'hlsType',
  'isLive',
  'encrypted',
  'duration',
  'segCount',
  'resolution',
  'isVod',
  'isFmp4',
  'variantCount',
  'variants',
  'bestVariant',
  'variant',
];

/**
 * Serialize MediaItem for postMessage (strips non-serializable properties)
 */
export function serializeMediaItem(item: MediaItem): Partial<MediaItem> {
  const result: Partial<MediaItem> = {};
  for (const key of SERIALIZABLE_KEYS) {
    if (item[key] !== undefined) {
      (result as Record<string, unknown>)[key] = item[key];
    }
  }
  return result;
}

// ============================================
// Blob Utilities
// ============================================

/**
 * Handle blob URL access with registry lookup
 * Returns blob info if valid, null otherwise
 */
export function getBlobInfo(
  url: string,
  registry: Map<string, BlobInfo>
): BlobInfo | null {
  if (!isBlob(url)) return null;
  const info = registry.get(url);
  if (!info) return null;
  info.ts = Date.now(); // Update access time
  return info;
}

/**
 * Get blob slice based on Range header
 */
export function getBlobSlice(blob: Blob, rangeHeader?: string | null): Blob {
  if (!rangeHeader) return blob;
  const range = parseRange(rangeHeader);
  if (!range) return blob;
  return blob.slice(range.start, range.end == null ? blob.size : range.end + 1);
}