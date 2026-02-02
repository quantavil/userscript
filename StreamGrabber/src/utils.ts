import type { ByteRange } from './types';

// ============================================
// URL Predicates (DRY: single source of truth)
// ============================================

const PATTERNS = {
    http: /^https?:/i,
    blob: /^blob:/i,
    m3u8: /\.m3u8(\b|[?#]|$)/i,
    video: /\.(mp4|mkv|webm|avi|mov|m4v|flv|ogv|ogg)([?#]|$)/i,
    segment: /\.(m4s|init|seg|fmp4|ts|m2ts)([?#]|$)/i,
    m3u8Type: /mpegurl|vnd\.apple\.mpegurl|application\/x-mpegurl/i,
    videoType: /^video\//i,
    videoTypeAlt: /(matroska|mp4|webm|quicktime)/i,
    // Combined resolution pattern for single-pass extraction
    // Group 1: Num1
    // Group 2: Separator [px]
    // Group 3: Num2 (optional)
    // Group 4: resolution=...
    // Group 5: quality=...
    // Group 6: -hd...
    // Group 7: ...m3u8
    resolutionCombined: /(?:^|[_\-\/])(\d{3,4})([px])(\d{3,4})?(?:[_\-\/\.]|$)|resolution[=_]?(\d{3,4})|quality[=_]?(\d{3,4})|[_\-]hd(\d{3,4})|(\d{3,4})\.m3u8/i,
    hlsMaster: /master|index|manifest|playlist\.m3u8/i,
    hlsMedia: /chunklist|media|video|segment|quality|stream_\d|_\d{3,4}p?\./i,
} as const;

export function parseHeaders(headers: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!headers) return out;

    // Fast manual loop is often better than split('\n').reduce for large headers
    let start = 0;
    while (start < headers.length) {
        let end = headers.indexOf('\n', start);
        if (end === -1) end = headers.length;

        const line = headers.substring(start, end).trim();
        if (line) {
            const sep = line.indexOf(':');
            if (sep > 0) {
                const key = line.substring(0, sep).trim().toLowerCase();
                const val = line.substring(sep + 1).trim();
                out[key] = val;
            }
        }
        start = end + 1;
    }
    return out;
}

export const isHttp = (u: unknown): u is string =>
    typeof u === 'string' && PATTERNS.http.test(u);

export const isBlob = (u: unknown): u is string =>
    typeof u === 'string' && PATTERNS.blob.test(u);

export const isM3U8Url = (u: string | null | undefined): boolean =>
    PATTERNS.m3u8.test(u || '');

export const isVideoUrl = (u: string | null | undefined): boolean =>
    PATTERNS.video.test(u || '');

export const isSegmentUrl = (u: string | null | undefined): boolean =>
    PATTERNS.segment.test(u || '');

export const looksM3U8Type = (t: string | null | undefined): boolean =>
    PATTERNS.m3u8Type.test(t || '');

export const looksVideoType = (t: string | null | undefined): boolean =>
    PATTERNS.videoType.test(t || '') || PATTERNS.videoTypeAlt.test(t || '');

// ============================================
// URL Utilities
// ============================================

export function safeAbsUrl(url: string, base: string): string {
    try {
        return new URL(url, base).href;
    } catch {
        return url;
    }
}

export function extractResFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    // 2: resolution=1080
    // 3: quality=1080
    // 4: -hd1080
    // 5: 1080.m3u8
    const m = PATTERNS.resolutionCombined.exec(url);
    if (m) {
        if (m[1]) {
            // Case 1: 1920x1080 or 1080p
            const w = parseInt(m[1], 10);
            const sep = m[2]; // Captured separator [px]
            const hStr = m[3]; // Captured height if WxH

            if (sep === 'x' && hStr) {
                // It's Width x Height (e.g. 1920x1080)
                // Return generic WxH string as old code did, or normalize to Height?
                // Old code returned "WxH". Let's stick to that for compatibility.
                return `${w}x${hStr}`;
            }
            // It's 1080p
            if (w >= 144 && w <= 4320) return `${w}p`;
        }

        // Other groups
        const val = m[4] || m[5] || m[6] || m[7];
        if (val) {
            const h = parseInt(val, 10);
            if (h >= 144 && h <= 4320) return `${h}p`;
        }
    }
    return null;
}

export function guessHlsType(url: string | null | undefined): 'master' | 'media' | 'unknown' {
    const lc = (url || '').toLowerCase();
    if (PATTERNS.hlsMaster.test(lc)) return 'master';
    if (PATTERNS.hlsMedia.test(lc)) return 'media';
    return 'unknown';
}

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

export function cleanFilename(s: string | null | undefined): string {
    return (s || 'video')
        .replace(/[\\/:*?"<>|]/g, '_')
        .slice(0, 120)
        .trim() || 'video';
}

// ============================================
// Extension Detection
// ============================================

const EXT_MAP: Record<string, string> = {
    webm: 'webm',
    matroska: 'mkv',
    mkv: 'mkv',
    quicktime: 'mov',
    mov: 'mov',
    mp2t: 'ts',
    mpegts: 'ts',
    ogg: 'ogg',
    mp4: 'mp4',
};

function extFromType(t: string): string {
    const lc = t.toLowerCase();
    for (const [key, ext] of Object.entries(EXT_MAP)) {
        if (lc.includes(key)) return ext;
    }
    return 'mp4';
}

export function guessExt(url: string | null | undefined, type?: string | null): string {
    const m = /(?:\.([a-z0-9]+))([?#]|$)/i.exec(url || '');
    if (m) return m[1].toLowerCase();
    return type ? extFromType(type) : 'mp4';
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

// ============================================
// Misc
// ============================================

export function uid(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const escapeDiv = document.createElement('div');
export function escapeHtml(x: unknown): string {
    escapeDiv.textContent = x == null ? '' : String(x);
    return escapeDiv.innerHTML;
}