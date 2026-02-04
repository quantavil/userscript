import type { MediaItem, ByteRange } from '../types';

// ============================================
// Formatting
// ============================================

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(n: number | null | undefined): string {
    if (n == null) return '';
    let i = 0;
    let v = n;
    while (v >= 1024 && i < SIZE_UNITS.length - 1) {
        v /= 1024;
        i++;
    }
    const decimals = v < 10 && i > 0 ? 1 : 0;
    return `${v.toFixed(decimals)} ${SIZE_UNITS[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string | null {
    if (!seconds || seconds <= 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// ============================================
// HTML Escaping
// ============================================

const escapeDiv = document.createElement('div');
export function escapeHtml(x: unknown): string {
    escapeDiv.textContent = x == null ? '' : String(x);
    return escapeDiv.innerHTML;
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
export const SERIALIZABLE_KEYS: (keyof MediaItem)[] = [
    'url',
    'kind',
    'label',
    'sublabel',
    'size',
    'type',
    'origin',
    'pageTitle',
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
// Range Parsing
// ============================================

export function parseRange(v: string | null | undefined): ByteRange | null {
    if (!v) return null;
    const m = /bytes=(\d+)-(\d+)?/i.exec(v);
    if (!m) return null;
    return {
        start: +m[1],
        end: m[2] != null ? +m[2] : null,
    };
}

// ============================================
// LRU Cache Helpers
// ============================================

export function lruGet<K, V>(map: Map<K, V>, key: K): V | undefined {
    if (!map.has(key)) return undefined;
    const v = map.get(key)!;
    map.delete(key);
    map.set(key, v);
    return v;
}

export function lruSet<K, V>(map: Map<K, V>, key: K, val: V, max: number): void {
    if (map.has(key)) map.delete(key);
    map.set(key, val);
    if (typeof max === 'number' && isFinite(max)) {
        while (map.size > max) {
            const first = map.keys().next().value;
            if (first !== undefined) map.delete(first);
        }
    }
}

// ============================================
// Async Dedup Helper
// ============================================

export function once<T>(
    cache: Map<string, T>,
    inflight: Map<string, Promise<T>>,
    key: string,
    loader: () => Promise<T>,
    max: number
): Promise<T> {
    const cached = lruGet(cache, key);
    if (cached !== undefined) return Promise.resolve(cached);

    if (inflight.has(key)) return inflight.get(key)!;

    const p = (async () => {
        try {
            const v = await loader();
            lruSet(cache, key, v, max);
            return v;
        } finally {
            inflight.delete(key);
        }
    })();

    inflight.set(key, p);
    return p;
}
