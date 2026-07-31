const selectorsToHide = [
    '#sec-update',
    '#rightcol',               // Usually contains sidebars
    '.obadcard',               // Deals & Offers ads section
    '.limenuitem:has(a[href*="refer"])',
    '.limenuitem:has(a[href*="testimonials"])',
    '.limenuitem:has(a[href*="edge/?c=1851"])',
    '.limenuitem:has(a[href*="buypayu/validity"])',
    // Zendesk chat widget
    '[data-garden-id="buttons.icon_button"][aria-label="Open messaging window"]',
    '.sc-1w3tvxe-0',           // Chat widget wrapper
    'iframe[title="Close message"]',
    'iframe[title="Message from company"]',
    'iframe[title="Number of unread messages"]',
    'iframe[title="Messaging window"]',
    'iframe#launcher',
    'iframe[title^="Button to launch messaging window"]',
];

export function hideElements() {
    selectorsToHide.forEach(selector => {
        document.querySelectorAll<HTMLElement>(selector).forEach(el => {
            el.style.display = 'none';
        });
    });

    // Fix: chat widget container (fixed-position div with iframes at bottom-right)
    document.querySelectorAll<HTMLElement>('div[style*="z-index: 999999"]').forEach(el => {
        if (el.style.position === 'fixed' && el.querySelector('iframe')) {
            el.style.display = 'none';
        }
    });
}

export function modifyLinks() {
    document.querySelectorAll('a[onclick^="openwin"]').forEach(a => {
        const onclick = a.getAttribute('onclick') || '';
        // Handle both openwin('url') and openwin('url','name')
        const match = onclick.match(/openwin\(['"]([^'"]+)['"]/);
        if (match && match[1]) {
            a.setAttribute('href', match[1]);
            a.setAttribute('target', '_blank');
            a.removeAttribute('onclick');
        }
    });
}

export function interceptViewSolutions() {
    const script = document.createElement('script');
    script.textContent = `
        // Poison Zendesk widget globals so it never initializes
        const noop = function() { return noop; };
        noop.setLocale = noop; noop.identify = noop; noop.hide = noop;
        noop.show = noop; noop.activate = noop; noop.on = noop;
        ['zE', '$zopim', 'zEACLoaded'].forEach(key => {
            Object.defineProperty(window, key, {
                get: () => noop,
                set: () => {},  // silently ignore page's attempts to redefine
                configurable: true
            });
        });

        // Override openwin — getter always returns our version, setter silently absorbs
        const openwinOverride = function(url, name) { window.open(url, '_blank'); };
        Object.defineProperty(window, 'openwin', {
            get: () => openwinOverride,
            set: () => {},  // silently ignore page's attempts to redefine
            configurable: true
        });
    `;
    document.documentElement.appendChild(script);
    script.remove();
}
