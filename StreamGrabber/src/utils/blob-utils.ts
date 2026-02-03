import type { BlobInfo } from '../types';
import { isBlob } from './url-utils';
import { parseRange } from './misc-utils';

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
