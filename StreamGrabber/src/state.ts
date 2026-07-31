import type { MediaItem, BlobInfo } from './types';
import { CFG, CACHE, SETTINGS_KEYS, getSetting, setSetting } from './config';
import { pruneBlobs } from './core/blob-store';

// ============================================
// Event System
// ============================================

export type Listener<T> = (payload: T) => void;

export class Subscribable<T = void> {
  private listeners = new Set<Listener<T>>();

  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispatch(payload: T): void {
    for (const fn of this.listeners) {
      try {
        fn(payload);
      } catch (e) {
        console.error('[SG] Event dispatch error:', e);
      }
    }
  }
}

// ============================================
// Central State
// ============================================

export class AppState {
  /** Detected media items (keyed by URL) */
  readonly items = new Map<string, MediaItem>();



  /** Watched video elements */
  readonly watchedVideos = new WeakSet<HTMLVideoElement>();

  /** Settings */
  excludeSmall: boolean;

  /** Events */
  readonly events = {
    itemAdded: new Subscribable<MediaItem>(),
    updated: new Subscribable<void>(),
  };

  constructor() {
    this.excludeSmall = getSetting(SETTINGS_KEYS.EXCLUDE_SMALL, true);
  }

  // ----------------------------------------
  // Item Management
  // ----------------------------------------

  hasItem(url: string): boolean {
    return this.items.has(url);
  }

  getItem(url: string): MediaItem | undefined {
    const item = this.items.get(url);
    if (item) {
      // Move to end of insertion order (LRU)
      this.items.delete(url);
      this.items.set(url, item);
    }
    return item;
  }

  addItem(item: MediaItem): boolean {
    if (this.items.has(item.url)) {
      const existing = this.items.get(item.url)!;
      const updated: MediaItem = {
        ...existing,
        ...item,
        // Preserve enrichment states
        enriched: existing.enriched || item.enriched,
        enriching: existing.enriching || item.enriching,
        hlsType: existing.hlsType || item.hlsType,
        isLive: existing.isLive || item.isLive,
        encrypted: existing.encrypted || item.encrypted,
        _enrichPromise: existing._enrichPromise || item._enrichPromise,
        // Prefer non-null/non-empty properties
        size: item.size ?? existing.size,
        type: item.type ?? existing.type,
        label: (existing.enriched && !item.enriched) ? existing.label : item.label,
        sublabel: existing.sublabel ?? item.sublabel,
        variant: existing.variant ?? item.variant,
        isRemote: existing.isRemote || item.isRemote,
        remoteWin: existing.remoteWin || item.remoteWin,
      };
      // Move to end of insertion order (LRU) and update properties
      this.items.delete(item.url);
      this.items.set(item.url, updated);
      this.events.updated.dispatch();
      return false;
    }

    this.items.set(item.url, item);

    // Enforce max limit (may delete items)
    this.enforceLimit();

    // Notify
    this.events.itemAdded.dispatch(item);
    this.events.updated.dispatch();

    return true;
  }

  private enforceLimit(): void {
    while (this.items.size > CACHE.DB_MAX) {
      const first = this.items.keys().next().value;
      if (first === undefined) break;

      this.items.delete(first);
    }
  }

  /**
   * Count valid items (excluding invalid/error)
   */
  get validCount(): number {
    let n = 0;
    for (const item of this.items.values()) {
      if (item.hlsType !== 'invalid' && item.hlsType !== 'error') {
        n++;
      }
    }
    return n;
  }

  /**
   * Get all items (newest first)
   */
  getAllItems(): MediaItem[] {
    return Array.from(this.items.values()).reverse();
  }

  /**
   * Get filtered items based on settings
   */
  /**
   * Filter items based on current settings
   */
  filterItems(items: MediaItem[]): MediaItem[] {
    if (!this.excludeSmall) return items;
    return items.filter(
      item => item.size == null || item.size >= CFG.SMALL_BYTES
    );
  }

  /**
   * Get filtered items based on settings
   */
  getFilteredItems(): MediaItem[] {
    return this.filterItems(this.getAllItems());
  }

  // ----------------------------------------
  // Settings
  // ----------------------------------------

  setExcludeSmall(v: boolean): void {
    this.excludeSmall = v;
    setSetting(SETTINGS_KEYS.EXCLUDE_SMALL, v);
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  clear(): void {
    this.items.clear();
    pruneBlobs(() => true);
    this.events.updated.dispatch();
  }

  /**
   * Trim stale blobs and enforce limits
   */
  trim(): void {
    this.enforceLimit();

    const now = Date.now();
    const removedUrls = pruneBlobs((url, info) => {
      // Evicted from AppState items -> prune immediately to prevent memory leak
      if (!this.items.has(url)) {
        return true;
      }
      const idle = now - (info.ts || 0);
      return !!(info.revoked && idle > CACHE.CLEAR_MS);
    });

    for (const href of removedUrls) {
      if (this.items.has(href)) {
        this.items.delete(href);
      }
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const state = new AppState();

// ============================================
// Periodic Cleanup
// ============================================

if (CFG.IS_TOP) {
  setInterval(() => state.trim(), CACHE.CLEAR_MS);
  window.addEventListener('pagehide', () => state.trim());
  window.addEventListener('beforeunload', () => state.trim());
}