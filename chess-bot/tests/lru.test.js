
import { describe, it, expect } from 'vitest';

class LRUCache {
    constructor(limit = 3) { // Use small limit for testing
        this.limit = limit;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        const val = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    set(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.limit) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }

    clear() {
        this.cache.clear();
    }
}

describe('LRUCache', () => {
    it('should store and retrieve values', () => {
        const cache = new LRUCache(3);
        cache.set('a', 1);
        expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for missing keys', () => {
        const cache = new LRUCache(3);
        expect(cache.get('b')).toBeUndefined();
    });

    it('should evict least recently used item when full', () => {
        const cache = new LRUCache(2);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3); // Should evict 'a'

        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
        expect(cache.get('c')).toBe(3);
    });

    it('should update recency on access', () => {
        const cache = new LRUCache(2);
        cache.set('a', 1);
        cache.set('b', 2);

        cache.get('a'); // 'a' becomes most recent
        cache.set('c', 3); // Should evict 'b' (least recent)

        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('a')).toBe(1);
        expect(cache.get('c')).toBe(3);
    });

    it('should update value and recency on set', () => {
        const cache = new LRUCache(2);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('a', 10); // Update 'a', becomes most recent

        cache.set('c', 3); // Should evict 'b'

        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('a')).toBe(10);
    });

    it('should clear all items', () => {
        const cache = new LRUCache(2);
        cache.set('a', 1);
        cache.clear();
        expect(cache.get('a')).toBeUndefined();
        expect(cache.cache.size).toBe(0);
    });
});
