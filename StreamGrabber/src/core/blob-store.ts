import type { BlobInfo } from '../types';

// ============================================
// Blob Store
// ============================================

// Blob registry (populated by detection hooks)
export type BlobPredicate = (url: string, info: BlobInfo) => boolean;
export const blobRegistry = new Map<string, BlobInfo>();

/**
 * Prune blobs from registry based on a predicate.
 * Returns the list of removed URLs.
 */
export function pruneBlobs(predicate: BlobPredicate): string[] {
    const removed: string[] = [];
    for (const [url, info] of blobRegistry) {
        if (predicate(url, info)) {
            blobRegistry.delete(url);
            removed.push(url);
        }
    }
    return removed;
}
