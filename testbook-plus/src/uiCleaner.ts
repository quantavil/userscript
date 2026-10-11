import { injectCSS } from './utils';

const CSS = `
/* System font and minimal look */
:root { --tb-fm-maxw: 1180px; --tb-fg: #0b0d10; --tb-bg: #ffffff; }
html, body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important; }
body { background: var(--tb-bg) !important; color: var(--tb-fg) !important; }
/* Disable most animations/transitions */
*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }

/* Keep content centered/wider */
main, [role="main"], .main, .content, .container, .wrapper, .dashboard, .page-wrapper, #content, #site-content {
  max-width: var(--tb-fm-maxw);
  margin-left: auto; margin-right: auto;
}

/* Hide live panel and promo components */
promotion-homepage-banner, refer-earn, goal-pitch-wrapper, goal-features-pitch, goal-combo-cards,
master-class-cards, why-testbook-ts, testimonials-ts, faqs { display: none !important; }
.promotional-banner,
[class*="live-panel"], #livePanel, .lp-tabs, .lp-badge-live, .lp-icon,
[onclick*="livePanel"], [src*="/live-panel/"], link[href*="live-panel"],
.tab-area.pav-class-livePanelTabShrunk { display: none !important; }

/* Hide common cookie bars/popups/newsletters/chats */
[id*="cookie"], [class*="cookie"], [aria-label*="cookie"],
[class*="newsletter"], [id*="newsletter"],
[id^="intercom-"], [class*="intercom"], iframe[src*="intercom"],
.we-popup, .we-survey, .we-banner, [class*="webengage"] { display: none !important; }
`;

const REMOVE_SELECTORS = [
    'promotion-homepage-banner', 'refer-earn', 'goal-pitch-wrapper', 'goal-features-pitch', 'goal-combo-cards',
    'master-class-cards', 'why-testbook-ts', 'testimonials-ts', 'faqs',
    '.promotional-banner', '#masterClassCards',
    '.tab-area.pav-class-livePanelTabShrunk',
    '[class*="live-panel"]', '#livePanel', '.lp-tabs', '.lp-badge-live', '.lp-icon',
    '[onclick*="livePanel"]', '[src*="/live-panel/"]', 'link[href*="live-panel"]',
    '[id*="cookie"]', '[class*="cookie"]', '[aria-label*="cookie"]',
    '[class*="newsletter"]', '[id*="newsletter"]',
    '[id^="intercom-"]', '[class*="intercom"]', 'iframe[src*="intercom"]',
    '.we-popup', '.we-survey', '.we-banner', '[class*="webengage"]',
];

const NAV_REGEXES = [
    /^\/super-coaching/i, /^\/free-live-classes/i, /^\/skill-academy/i,
    /^\/pass$/i, /^\/pass-pro$/i, /^\/pass-elite$/i,
    /^\/reported-questions$/i, /^\/doubts$/i,
    /^\/current-affairs\/current-affairs-quiz$/i,
    /^\/e-cards$/i, /^\/teachers-training-program$/i,
    /^\/referrals$/i, /^\/success-stories$/i,
];

function pruneNav() {
    const nav = document.querySelectorAll('ul.header__sidebar__nav a[href]');
    nav.forEach(a => {
        try {
            const href = a.getAttribute('href') || '';
            const u = new URL(href, location.origin);
            if (NAV_REGEXES.some(re => re.test(u.pathname))) {
                const li = a.closest('li') || a;
                li.remove();
            }
        } catch { }
    });
    document.querySelectorAll('ul.header__sidebar__nav .header__divider').forEach(div => {
        const t = (div.textContent || '').trim().toLowerCase();
        if (t === 'learn' || t === 'more') div.remove();
    });
}

export function blockAutoPlay() {
    try {
        const proto = HTMLMediaElement.prototype;
        if ((proto as any).__tbBlocked) return;
        (proto as any).__tbBlocked = true;
        const origPlay = proto.play;
        proto.play = function () {
            const hasAuto = this.autoplay || this.getAttribute('autoplay') !== null;
            if (hasAuto) {
                return Promise.reject(new DOMException('Autoplay blocked by userscript', 'NotAllowedError'));
            }
            return origPlay.apply(this, arguments as any);
        };
    } catch { }
}

export function cleanUI() {
    injectCSS('tb-clean-style', CSS);
    
    REMOVE_SELECTORS.forEach(sel => {
        document.querySelectorAll(sel).forEach(n => n.remove());
    });

    document.querySelectorAll('.lp-title').forEach(n => {
        if ((n.textContent || '').trim().toLowerCase() === 'classes') {
            const card = n.closest('.tab-area, .lp-tabs, .live, .pav-class') || n;
            card.remove();
        }
    });

    pruneNav();
    blockAutoPlay();
}
