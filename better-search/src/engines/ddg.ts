// src/engines/ddg.ts
import type { EngineConfig } from '../types';

function extractUrl(item: Element): string | null {
    // DDG result title link
    const titleA = item.querySelector<HTMLAnchorElement>(
        'a[data-testid="result-title-a"], h2 a[href], a.result__a[href]'
    );
    let url: string | null = null;
    if (titleA?.href) {
        url = titleA.href;
    } else {
        // DDG sometimes hides the real URL in data-href (redirect URL)
        // Fall back to any external link
        for (const a of item.querySelectorAll<HTMLAnchorElement>('a[href]')) {
            const href = a.href;
            if (!href || href.startsWith('#') || href.startsWith('javascript')) continue;
            if (!href.includes('duckduckgo.com') || href.includes('/l/')) {
                url = href;
                break;
            }
        }
    }

    if (url && url.includes('/l/')) {
        try {
            const u = new URL(url);
            const uddg = u.searchParams.get('uddg');
            if (uddg) {
                return decodeURIComponent(uddg);
            }
        } catch (err) {
            console.debug('[SVF] Failed to parse DDG redirect URL:', url, err);
        }
    }
    return url;
}

export const ddgEngine: EngineConfig = {
    name: 'ddg',
    containerSelector: '.react-results--main, #links, .serp__results',
    itemSelector: 'article[data-testid="result"], .result.results_links_deep, .nrn-react-div[data-nr]',
    extractUrl,
};
