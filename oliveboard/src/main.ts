function injectCSS(css: string) {
    const style = document.createElement('style');
    style.textContent = css;
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(style);
        });
    }
}

function cleanUI() {
    // 1. Block the popup by hiding its body
    injectCSS(`
        #offerimg-body,
        #sec-update,
        .sec-update,
        /* Add other potential popup overlays if needed */
        .modal-backdrop { 
            display: none !important; 
        }
    `);
    
    // 2. Remove useless nav items
    const navItemsToRemove = [
        'Personalised Mentorship',
        'Success Stories',
        'Refer & Earn',
        'My Subscriptions',
        'Resources'
    ];

    const removeUselessNavItems = () => {
        document.querySelectorAll('.nav.navbar-nav li.limenuitem').forEach(li => {
            const text = (li.textContent || '').trim().toLowerCase();
            if (navItemsToRemove.some(item => text.includes(item.toLowerCase()))) {
                li.remove();
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeUselessNavItems);
    } else {
        removeUselessNavItems();
    }
}

function interceptViewSolutions() {
    // Method 1: Inject a script to override the global `openwin` function
    const script = document.createElement('script');
    script.textContent = `
        const originalOpenWin = window.openwin;
        window.openwin = function(url, name) {
            window.open(url, '_blank');
        };
    `;
    document.documentElement.appendChild(script);
    script.remove();

    // Method 2: Convert existing <a> tags that use openwin
    const modifyLinks = () => {
        document.querySelectorAll('a[onclick^="openwin"]').forEach(a => {
            const onclick = a.getAttribute('onclick') || '';
            const match = onclick.match(/openwin\(['"]([^'"]+)['"]/);
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

function init() {
    cleanUI();
    interceptViewSolutions();
}

init();
