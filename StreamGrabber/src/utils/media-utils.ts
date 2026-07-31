import type { MediaItem, Variant } from '../types';
import { formatBytes, formatDuration } from './misc-utils';
import { PATTERNS } from './url-utils';

// ============================================
// Variant Utilities
// ============================================

/**
 * Sort variants by resolution (height) then bitrate (avg or peak)
 * Returns new sorted array, does not mutate input
 */
export function sortVariantsByQuality(variants: Variant[]): Variant[] {
    return [...variants].sort(
        (a, b) =>
            (b.h || 0) - (a.h || 0) ||
            (b.avg || b.peak || 0) - (a.avg || a.peak || 0)
    );
}

/**
 * Get best variant from list (highest quality)
 */
export function getBestVariant(variants: Variant[]): Variant | undefined {
    return sortVariantsByQuality(variants)[0];
}

// ============================================
// Label Generation
// ============================================

export interface LabelParts {
    resolution?: string | null;
    duration?: number | null;
    size?: number | null;
    bitrate?: number | null;
    extra?: string[];
}

/**
 * Build a display label from parts (e.g., "1080p • 5:32 • 150 MB")
 */
export function buildLabel(parts: LabelParts): string {
    const items: string[] = [];

    if (parts.resolution) {
        items.push(parts.resolution);
    }

    if (parts.bitrate) {
        items.push(`${Math.round(parts.bitrate / 1000)}k`);
    }

    if (parts.duration && parts.duration > 0) {
        const dur = formatDuration(parts.duration);
        if (dur) items.push(dur);
    }

    if (parts.size != null) {
        items.push(`~${formatBytes(parts.size)}`);
    }

    if (parts.extra) {
        items.push(...parts.extra);
    }

    return items.length > 0 ? items.join(' • ') : 'Video Stream';
}

/**
 * Build sublabel for media items
 */
export function buildSublabel(segCount: number, isFmp4: boolean): string {
    const format = isFmp4 ? 'fMP4' : 'TS';
    return `${segCount} segments • ${format}`;
}

// ============================================
// HLS/Media Parsing Utils
// ============================================

export function extractResFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const m = PATTERNS.resolutionCombined.exec(url);
    if (m) {
        if (m[1]) {
            const w = parseInt(m[1], 10);
            const sep = m[2];
            const hStr = m[3];

            if (sep === 'x' && hStr) {
                return `${w}x${hStr}`;
            }
            if (w >= 144 && w <= 4320) return `${w}p`;
        }

        const val = m[4] || m[5] || m[6] || m[7];
        if (val) {
            const h = parseInt(val, 10);
            if (h >= 144 && h <= 4320) return `${h}p`;
        }
    }
    return null;
}

export function guessHlsType(
    url: string | null | undefined
): 'master' | 'media' | 'unknown' {
    const lc = (url || '').toLowerCase();
    if (PATTERNS.hlsMaster.test(lc)) return 'master';
    if (PATTERNS.hlsMedia.test(lc)) return 'media';
    return 'unknown';
}
