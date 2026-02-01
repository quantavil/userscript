import type { MediaItem, BlobInfo } from './types';
import { CFG, CACHE, SETTINGS_KEYS } from './config';
import { blobRegistry } from './core/network';

// ============================================
// Central State
// ============================================

class AppState {
  /** Detected media items (keyed by URL) */
  readonly items = new Map<string, MediaItem>();
  
  /** Quick lookup sets */
  private readonly m3u8Urls = new Set<string>();
  private readonly videoUrls = new Set<string>();
  
  /** Watched video elements */
  readonly watchedVideos = new WeakSet<HTMLVideoElement>();
  
  /** Settings */
  excludeSmall: boolean;
  
  /** UI callbacks */
  private onItemAdded: ((item: MediaItem) => void) | null = null;
  private onItemUpdated: (() => void) | null = null;
  
  constructor() {
    this.excludeSmall = GM_getValue(SETTINGS_KEYS.EXCLUDE_SMALL, true);
  }
  
  // ----------------------------------------
  // Callbacks
  // ----------------------------------------
  
  setCallbacks(cbs: {
    onItemAdded?: (item: MediaItem) => void;
    onItemUpdated?: () => void;
  }): void {
    if (cbs.onItemAdded) this.onItemAdded = cbs.onItemAdded;
    if (cbs.onItemUpdated) this.onItemUpdated = cbs.onItemUpdated;
  }
  
  notifyUpdate(): void {
    this.onItemUpdated?.();
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
    
    if (item.kind === 'hls') {
      this.m3u8Urls.add(item.url);
    } else {
      this.videoUrls.add(item.url);
    }
    
    // Enforce max limit
    this.enforceLimit();
    
    // Notify
    this.onItemAdded?.(item);
    
    return true;
  }
  
  private enforceLimit(): void {
    while (this.items.size > CACHE.DB_MAX) {
      const first = this.items.keys().next().value;
      if (first === undefined) break;
      
      const item = this.items.get(first);
      this.items.delete(first);
      
      if (item) {
        this.m3u8Urls.delete(item.url);
        this.videoUrls.delete(item.url);
      }
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
  getFilteredItems(): MediaItem[] {
    const items = this.getAllItems();
    if (!this.excludeSmall) return items;
    
    return items.filter(
      item => item.size == null || item.size >= CFG.SMALL_BYTES
    );
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
    this.m3u8Urls.clear();
    this.videoUrls.clear();
    blobRegistry.clear();
  }
  
  /**
   * Trim stale blobs and enforce limits
   */
  trim(): void {
    this.enforceLimit();
    
    const now = Date.now();
    for (const [href, info] of blobRegistry) {
      const idle = now - (info.ts || 0);
      if (info.revoked && idle > CACHE.CLEAR_MS) {
        blobRegistry.delete(href);
        this.items.delete(href);
        this.m3u8Urls.delete(href);
        this.videoUrls.delete(href);
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