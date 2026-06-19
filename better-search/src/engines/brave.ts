// src/engines/brave.ts
import type { EngineConfig } from '../types';

function extractUrl(item: Element): string | null {
    // Brave Search: title link is <a class="result-header" href="...">
    const a = item.querySelector<HTMLAnchorElement>(
        'a.result-header[href], a.svelte-1dh4yef[href], .snippet-title a[href]'
    );
    if (a?.href) return a.href;
    // Generic fallback
    for (const link of item.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const h = link.href;
        if (h && !h.includes('search.brave.com') && !h.startsWith('#')) return h;
    }
    return null;
}

export const braveEngine: EngineConfig = {
    name: 'brave',
    containerSelector: '#results, .results',
    itemSelector: '.snippet[data-pos], .result[data-pos]',
    extractUrl,
};
