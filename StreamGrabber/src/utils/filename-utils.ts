import { PATTERNS } from './url-utils';

// ============================================
// Formatting
// ============================================

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
// Filename Logic (New)
// ============================================

export interface FilenameOptions {
    title?: string;
    ext?: string;
    quality?: string | null;
}

export function generateFilename(options: FilenameOptions): string {
    const base = cleanFilename(options.title || document.title);
    const qualSuffix = options.quality ? `_${options.quality}` : '';
    const ext = options.ext || 'mp4';

    return `${base}${qualSuffix}.${ext}`;
}
