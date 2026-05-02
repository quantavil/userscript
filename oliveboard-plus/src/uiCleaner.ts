export function cleanUI() {
    const selectorsToHide = [
        '#offerimg-body',
        '#sec-update',
        '#rightcol',           // Usually contains sidebars
        '.nav-item:has(a[href*="refer"])',
        '.nav-item:has(a[href*="success-stories"])'
    ];

    const hideElements = () => {
        selectorsToHide.forEach(selector => {
            document.querySelectorAll<HTMLElement>(selector).forEach(el => {
                el.style.display = 'none';
            });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideElements);
    } else {
        hideElements();
    }

    const observer = new MutationObserver(() => {
        hideElements();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

export function interceptViewSolutions() {
    const script = document.createElement('script');
    script.textContent = `
        const originalOpenWin = window.openwin;
        window.openwin = function(url, name) {
            window.open(url, '_blank');
        };
    `;
    document.documentElement.appendChild(script);
    script.remove();

    const modifyLinks = () => {
        document.querySelectorAll('a[onclick^="openwin"]').forEach(a => {
            const onclick = a.getAttribute('onclick') || '';
            const match = onclick.match(/openwin\(['"]([^'"]+)['"]\)/);
            if (match && match[1]) {
                a.setAttribute('href', match[1]);
                a.setAttribute('target', '_blank');
                a.removeAttribute('onclick');
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', modifyLinks);
    } else {
        modifyLinks();
    }

    const observer = new MutationObserver(() => {
        modifyLinks();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}
