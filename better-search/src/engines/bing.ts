// src/engines/bing.ts
import type { EngineConfig } from '../types';

/** Decodes Bing's redirection URLs (e.g. bing.com/ck/a) containing base64 target URLs */
function decodeBingUrl(href: string): string | null {
    try {
        if (!href.includes('bing.com/ck/a')) return href;
        const uObj = new URL(href);
        let u = uObj.searchParams.get('u');
        if (u) {
            // Strip the base64 prefix (usually 'a1' or 'a0')
            u = u.replace(/^a[0-9]/, '');
            // Convert modified base64 url-safe chars if any
            let normalized = u.replace(/-/g, '+').replace(/_/g, '/');
            // Add required base64 padding
            normalized = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
            const decoded = decodeURIComponent(
                atob(normalized)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            if (decoded && decoded.startsWith('http')) {
                return decoded;
            }
        }
    } catch (err) {
        console.debug('[SVF] Failed to decode Bing URL:', href, err);
    }
    return null;
}

function extractUrl(item: Element): string | null {
    // Bing puts the real URL in <h2><a href="..."> or .b_attribution cite
    const h2a = item.querySelector<HTMLAnchorElement>('h2 a[href]');
    if (h2a?.href) {
        const decoded = decodeBingUrl(h2a.href);
        if (decoded) return decoded;
    }
    const cite = item.querySelector('cite');
    if (cite?.textContent) {
        let t = cite.textContent.trim();
        if (t.includes('›')) {
            t = t.split('›')[0]!.trim();
        }
        if (t.startsWith('http')) return t;
        if (!t.includes('.')) return null;
        return 'https://' + t;
    }
    return null;
}

export const bingEngine: EngineConfig = {
    name: 'bing',
    containerSelector: '#b_results',
    itemSelector: '.b_algo',
    extractUrl,
};
