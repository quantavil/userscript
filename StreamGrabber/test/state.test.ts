// @ts-nocheck
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { MediaItem } from '../src/types';
import { CACHE, SETTINGS_KEYS } from '../src/config';

// Mock GM_getValue/setValue
global.GM_getValue = vi.fn((key, def) => def);
global.GM_setValue = vi.fn();

describe('AppState', () => {
    let AppState: any;
    let state: any;

    beforeAll(async () => {
        const mod = await import('../src/state');
        AppState = mod.AppState;
    });

    beforeEach(() => {
        vi.clearAllMocks();
        state = new AppState();
    });

    it('should initialize with default settings', () => {
        expect(state.items.size).toBe(0);
        expect(state.excludeSmall).toBe(true);
    });

    it('should add items and fire events', () => {
        const item: MediaItem = { url: 'http://foo', kind: 'video', label: '720p', size: 1000 };
        const spyAdded = vi.fn();
        const spyUpdated = vi.fn();

        state.events.itemAdded.subscribe(spyAdded);
        state.events.updated.subscribe(spyUpdated);

        const added = state.addItem(item);

        expect(added).toBe(true);
        expect(state.items.size).toBe(1);
        expect(state.hasItem('http://foo')).toBe(true);
        expect(spyAdded).toHaveBeenCalledWith(item);
        expect(spyUpdated).toHaveBeenCalled();
    });

    it('should not add duplicate items', () => {
        const item: MediaItem = { url: 'http://foo', kind: 'video', label: '720p', size: 1000 };
        state.addItem(item);

        // Subscribe again just to see if it fires (it shouldn't)
        const spyAdded = vi.fn();
        state.events.itemAdded.subscribe(spyAdded);

        const added = state.addItem(item);
        expect(added).toBe(false);
        expect(spyAdded).not.toHaveBeenCalled();
        expect(state.items.size).toBe(1);
    });

    it('should enforce DB_MAX limit and evict items in insertion order by default', () => {
        // DB_MAX is 120. Let's add 121 items.
        for (let i = 0; i <= 120; i++) {
            state.addItem({ url: `url-${i}`, kind: 'video', label: `Item ${i}` });
        }
        
        expect(state.items.size).toBe(120);
        // The first item (url-0) should have been evicted
        expect(state.hasItem('url-0')).toBe(false);
        // The second item (url-1) and the rest should still exist
        expect(state.hasItem('url-1')).toBe(true);
        expect(state.hasItem('url-120')).toBe(true);
    });

    it('should maintain LRU cache ordering on getItem', () => {
        // Add 120 items
        for (let i = 0; i < 120; i++) {
            state.addItem({ url: `url-${i}`, kind: 'video', label: `Item ${i}` });
        }
        
        // Access the first item (url-0), moving it to the end of the LRU queue
        const item0 = state.getItem('url-0');
        expect(item0).toBeDefined();
        
        // Now add one more item (url-120) which triggers eviction
        state.addItem({ url: 'url-120', kind: 'video', label: 'Item 120' });
        
        expect(state.items.size).toBe(120);
        // url-0 should still be in cache because it was recently accessed
        expect(state.hasItem('url-0')).toBe(true);
        // url-1 (which was next oldest and unaccessed) should be evicted
        expect(state.hasItem('url-1')).toBe(false);
    });

    it('should maintain LRU cache ordering and merge fields on addItem', () => {
        // Add 120 items
        for (let i = 0; i < 120; i++) {
            state.addItem({ url: `url-${i}`, kind: 'video', label: `Item ${i}` });
        }
        
        // Re-add/update the first item (url-0)
        const updated = state.addItem({ url: 'url-0', label: 'Item 0 Updated', duration: 100 });
        expect(updated).toBe(false); // Returns false for existing item
        
        // Check properties merged
        const item0 = state.getItem('url-0');
        expect(item0.label).toBe('Item 0 Updated');
        expect(item0.duration).toBe(100);
        
        // Now add another item (url-120) to trigger eviction
        state.addItem({ url: 'url-120', kind: 'video', label: 'Item 120' });
        
        expect(state.items.size).toBe(120);
        // url-0 should still exist
        expect(state.hasItem('url-0')).toBe(true);
        // url-1 should be evicted
        expect(state.hasItem('url-1')).toBe(false);
    });

    it('should dynamically calculate validCount without stale caching', () => {
        const itemA = { url: 'url-a', kind: 'hls', hlsType: null };
        const itemB = { url: 'url-b', kind: 'video', hlsType: 'media' };
        
        state.addItem(itemA);
        state.addItem(itemB);
        
        // Both are valid (null and media are not invalid/error)
        expect(state.validCount).toBe(2);
        
        // Simulate enrichment modifying itemA's type to invalid
        itemA.hlsType = 'invalid';
        
        // validCount should dynamically update immediately
        expect(state.validCount).toBe(1);
        
        // Simulate error on itemB
        itemB.hlsType = 'error';
        expect(state.validCount).toBe(0);
    });

    it('filters items correctly', () => {
        // Mock small bytes limit using config or assume default
        const smallItem: MediaItem = { url: 'small', kind: 'video', size: 10 };
        const bigItem: MediaItem = { url: 'big', kind: 'video', size: 99999999 };

        state.addItem(smallItem);
        state.addItem(bigItem);

        // Default excludeSmall = true
        let filtered = state.getFilteredItems();
        // Assuming CFG.SMALL_BYTES is > 10. Default is 500KB usually.
        expect(filtered).not.toContain(smallItem);
        expect(filtered).toContain(bigItem);

        // Turn off filter
        state.setExcludeSmall(false);
        filtered = state.getFilteredItems();
        expect(filtered).toContain(smallItem);
        expect(filtered).toContain(bigItem);
    });

    it('should merge fields on addItem and preserve enriched state', () => {
        const item: MediaItem = {
            url: 'http://enriched-item',
            kind: 'hls',
            label: '1080p • 2.1 GB',
            sublabel: 'Enriched',
            size: 2100000000,
            type: 'application/x-mpegURL',
            origin: 'http://test.com',
            enriched: true,
            enriching: false,
            hlsType: 'media',
            isLive: false,
            encrypted: false,
        };
        state.addItem(item);

        // A new unenriched detection of the same URL arrives
        const newItem: MediaItem = {
            url: 'http://enriched-item',
            kind: 'hls',
            label: 'Analyzing...',
            sublabel: null,
            size: null,
            type: null,
            origin: 'http://test.com',
            enriched: false,
            enriching: false,
            hlsType: null,
            isLive: false,
            encrypted: false,
        };

        state.addItem(newItem);

        const merged = state.getItem('http://enriched-item');
        expect(merged.enriched).toBe(true);
        expect(merged.hlsType).toBe('media');
        expect(merged.label).toBe('1080p • 2.1 GB');
        expect(merged.size).toBe(2100000000);
    });

    it('should prune evicted items from blobRegistry in trim', async () => {
        const { blobRegistry } = await import('../src/core/blob-store');
        
        // Add 120 items to fill state.items
        for (let i = 0; i < 120; i++) {
            state.addItem({ url: `url-${i}`, kind: 'video', label: `Item ${i}` });
        }
        
        // Add a blob URL item that goes into blobRegistry
        const blobUrl = 'blob:uuid-123';
        blobRegistry.set(blobUrl, {
            blob: new Blob(['abc']),
            type: 'video/mp4',
            size: 3,
            kind: 'video',
            ts: Date.now(),
        });
        state.addItem({ url: blobUrl, kind: 'video', label: 'Blob Item' });

        expect(state.items.size).toBe(120);
        expect(state.hasItem(blobUrl)).toBe(true);
        expect(blobRegistry.has(blobUrl)).toBe(true);

        // Add another item to evict the oldest item. But wait!
        // To force blobUrl eviction, let's add 125 more items.
        for (let i = 120; i < 250; i++) {
            state.addItem({ url: `url-${i}`, kind: 'video', label: `Item ${i}` });
        }

        // blobUrl should now be evicted from state.items
        expect(state.hasItem(blobUrl)).toBe(false);
        // But it remains in blobRegistry until trim() runs
        expect(blobRegistry.has(blobUrl)).toBe(true);

        // Run trim
        state.trim();

        // Should be pruned from blobRegistry to prevent memory leaks
        expect(blobRegistry.has(blobUrl)).toBe(false);
    });
});

