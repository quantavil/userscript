import type { ByteRange } from '../types';

// ============================================
// URL Predicates
// ============================================

export const PATTERNS = {
    http: /^https?:/i,
    blob: /^blob:/i,
    m3u8: /\.m3u8(\b|[?#]|$)/i,
    video: /\.(mp4|mkv|webm|avi|mov|m4v|flv|ogv|ogg)([?#]|$)/i,
    segment: /\.(m4s|init|seg|fmp4|ts|m2ts)([?#]|$)/i,
    m3u8Type: /mpegurl|vnd\.apple\.mpegurl|application\/x-mpegurl/i,
    videoType: /^video\//i,
    videoTypeAlt: /(matroska|mp4|webm|quicktime)/i,
    resolutionCombined:
        /(?:^|[_\-\/])(\d{3,4})([px])(\d{3,4})?(?:[_\-\/\.]|$)|resolution[=_]?(\d{3,4})|quality[=_]?(\d{3,4})|[_\-]hd(\d{3,4})|(\d{3,4})\.m3u8/i,
    hlsMaster: /master|index|manifest|playlist\.m3u8/i,
    hlsMedia: /chunklist|media|video|segment|quality|stream_\d|_\d{3,4}p?\./i,
} as const;

export function parseHeaders(headers: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!headers) return out;

    headers.trim().split(/[\r\n]+/).forEach(line => {
        const parts = line.split(':');
        const key = parts.shift()?.trim();
        const val = parts.join(':').trim();
        if (key) out[key.toLowerCase()] = val;
    });

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
