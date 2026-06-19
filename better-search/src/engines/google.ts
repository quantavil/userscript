// src/engines/google.ts
import type { EngineConfig } from '../types';

/** Hosts that are internal Google navigation, not organic results */
const GOOGLE_INTERNAL_HOSTS = new Set([
    'www.google.com',
    'accounts.google.com',
    'maps.google.com',
    'webcache.googleusercontent.com',
]);

/** Extracts the href of the first non-Google-internal link inside a .g result block */
function extractUrl(item: Element): string | null {
    // Primary: anchor that carries the result URL (cite or the heading link)
    // Google 2024+ wraps the heading in <a jsname="UWckNb"> or data-ved
    const candidates = item.querySelectorAll<HTMLAnchorElement>('a[href]');
    for (const a of candidates) {
        const href = a.href;
        if (!href || href.startsWith('javascript') || href.startsWith('#')) continue;
        try {
            const u = new URL(href);
            // Skip internal Google links and search URLs, but allow organic google subdomains
            if (GOOGLE_INTERNAL_HOSTS.has(u.hostname) || u.pathname.startsWith('/search') || u.hostname.includes('gstatic.')) {
                continue;
            }
            return href;
        } catch (err) {
            console.debug('[SVF] Skipped malformed Google result URL:', href, err);
        }
    }
    return null;
}

export const googleEngine: EngineConfig = {
    name: 'google',
    // The element that contains all organic .g cards — stable across layout changes
    containerSelector: '#search, #rso, [data-async-context] [id="search"]',
    // Each organic result card
    itemSelector: '.g, .tF2Cxc, .MjjYud',
    extractUrl,
};
