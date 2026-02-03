import type { MediaItem, BlobInfo } from './types';
import { CFG, CACHE, SETTINGS_KEYS } from './config';
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

  /** Cached valid count */
  private _validCount = 0;
  private _validCountDirty = true;

  /** Events */
  readonly events = {
    itemAdded: new Subscribable<MediaItem>(),
    updated: new Subscribable<void>(),
  };

  constructor() {
    this.excludeSmall = GM_getValue(SETTINGS_KEYS.EXCLUDE_SMALL, true);
  }

  // ----------------------------------------
  // Item Management
  // ----------------------------------------

  hasItem(url: string): boolean {
    return this.items.has(url);
  }

  getItem(url: string): MediaItem | undefined {
    return this.items.get(url);
  }

  addItem(item: MediaItem): boolean {
    if (this.items.has(item.url)) return false;

    this.items.set(item.url, item);



    // Invalidate cache
    this.invalidateCount();

    // Enforce max limit
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

      const item = this.items.get(first);
      this.items.delete(first);


    }
    // Only invalidate if we actually removed something? 
    // Actually invalidateCount just sets a dirty flag, so it's cheap.
    this.invalidateCount();
  }

  /**
   * Count valid items (excluding invalid/error)
   */
  get validCount(): number {
    if (this._validCountDirty) {
      let n = 0;
      for (const item of this.items.values()) {
        if (item.hlsType !== 'invalid' && item.hlsType !== 'error') {
          n++;
        }
      }
      this._validCount = n;
      this._validCountDirty = false;
    }
    return this._validCount;
  }

  /**
   * Mark valid count as dirty (needs recalculation)
   */
  invalidateCount(): void {
    this._validCountDirty = true;
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
    GM_setValue(SETTINGS_KEYS.EXCLUDE_SMALL, v);
  }

  // ----------------------------------------
  // Cleanup
  // ----------------------------------------

  clear(): void {
    this.items.clear();
    pruneBlobs(() => true);
    this.invalidateCount();
  }

  /**
   * Trim stale blobs and enforce limits
   */
  trim(): void {
    this.enforceLimit();

    const now = Date.now();
    const removedUrls = pruneBlobs((_, info) => {
      const idle = now - (info.ts || 0);
      return !!(info.revoked && idle > CACHE.CLEAR_MS);
    });

    for (const href of removedUrls) {
      if (this.items.has(href)) {
        this.items.delete(href);
        this.invalidateCount();
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