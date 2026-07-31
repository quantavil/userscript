// src/engines/yandex.ts
import type { EngineConfig } from '../types';

function extractUrl(item: Element): string | null {
    // Yandex wraps the result URL in .organic__url or h2 a.link
    const a = item.querySelector<HTMLAnchorElement>(
        'a.link.organic__url[href], h2 a.link[href], .OrganicTitle a[href]'
    );
    if (a?.href) return a.href;

    for (const link of item.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const h = link.href;
        if (!h || h.startsWith('#') || h.startsWith('javascript')) continue;
        if (!h.includes('yandex.') && !h.includes('ya.ru')) return h;
    }
    return null;
}

export const yandexEngine: EngineConfig = {
    name: 'yandex',
    containerSelector: '#search-result, .content__left, .main__content, .content, [data-layout-part="cl"], body',
    itemSelector: '.serp-item.organic, li.serp-item[data-cid], li:has(.Organic), .Organic, [class*="__card"]',
    extractUrl,
    shouldActivate: (url: URL) => url.pathname.startsWith('/search'),
};
