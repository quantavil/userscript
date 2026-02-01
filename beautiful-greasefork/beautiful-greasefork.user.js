// ==UserScript==
// @name         Greasy Fork Minimal UI
// @namespace    https://greasyfork.org/
// @version      2.5.0
// @description  Clean, minimal dark theme for Greasy Fork with logarithmic install sliders and fixed FOUC
// @author       quantavil
// @license      MIT
// @match        https://greasyfork.org/*
// @match        https://*.greasyfork.org/*
// @icon         https://greasyfork.org/vite/assets/blacklogo96-CxYTSM_T.png
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ========== 1. AGGRESSIVE FOUC PREVENTION ==========
    // Inject style immediately into HTML to hide body before it even parses
    const hideStyle = document.createElement('style');
    hideStyle.id = 'gf-hide-fouc';
    hideStyle.textContent = `
        html { background: #09090b !important; }
        body { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }
        .gf-loaded body { opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; transition: opacity 0.2s ease-in !important; }
    `;
    (document.head || document.documentElement).appendChild(hideStyle);

    // ========== 2. HELPER FUNCTIONS (Logarithmic Scale) ==========
    // Converts a slider position (0-100) to a value using a power curve
    // This provides "Log-like" behavior: precise control at low numbers, rapid growth at high numbers
    function getLogValue(position, max) {
        if (position === 0) return 0;
        if (position === 100) return max;
        // The power of 4 gives a very nice "log" feel for install counts
        const min = 1;
        const result = Math.floor(max * Math.pow(position / 100, 4));
        return result < 1 ? 1 : result;
    }

    function formatNumber(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    }

    // ========== 3. MAIN CSS ==========
    const css = `
        /* ========== Variables ========== */
        :root {
            --bg-0: #09090b;
            --bg-1: #121215;
            --bg-2: #1a1a1f;
            --bg-3: #242429;
            --border: #2a2a30;
            --border-hover: #3a3a42;
            --text-1: #f0f0f2;
            --text-2: #a1a1aa;
            --text-3: #71717a;
            --accent: #22c55e;
            --accent-hover: #16a34a;
            --accent-dim: rgba(34, 197, 94, 0.12);
            --accent-glow: rgba(34, 197, 94, 0.25);
            --red: #ef4444;
            --yellow: #facc15;
            --blue: #3b82f6;
            --purple: #a855f7;
            --radius: 6px;
            --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --mono: ui-monospace, 'SF Mono', Consolas, monospace;
        }

        /* ========== Base ========== */
        html, body {
            background: var(--bg-0) !important;
            color: var(--text-1) !important;
            font-family: var(--font) !important;
        }
        body {
            font-size: 15px;
            line-height: 1.6;
        }

        a { color: var(--accent); text-decoration: none; transition: color 0.15s; }
        a:hover { color: var(--accent-hover); }
        ::selection { background: var(--accent-glow); color: var(--text-1); }

        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: var(--bg-0); }
        ::-webkit-scrollbar-thumb { background: var(--bg-3); border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-3); }

        /* ========== Hide Ads & Junk ========== */
        .ad-entry, .ad, #script-list-ea, .ethical-ads, [data-ea-publisher],
        #pagetual-sideController, .umdl-fab, .umdl-pick, .umdl-toast,
        .sae-bubble, .sae-palette {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
            pointer-events: none !important;
        }

        /* ========== Header ========== */
        #main-header {
            background: var(--bg-1) !important;
            border-bottom: 1px solid var(--border) !important;
            position: sticky !important;
            top: 0;
            z-index: 1000;
        }

        #main-header > .width-constraint {
            max-width: 1100px;
            margin: 0 auto;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        #site-name { display: flex; align-items: center; gap: 12px; }
        #site-name img { width: 36px !important; height: 36px !important; transition: transform 0.2s; }
        #site-name:hover img { transform: scale(1.05); }
        #site-name-text h1 { margin: 0; font-size: 20px; font-weight: 700; }
        #site-name-text h1 a { color: var(--text-1) !important; }

        #site-nav { display: flex; align-items: center; gap: 8px; }
        #site-nav nav { display: flex; gap: 4px; list-style: none; margin: 0; padding: 0; }
        #site-nav nav > li { position: relative; }
        #site-nav nav > li > a {
            padding: 8px 14px;
            border-radius: var(--radius);
            color: var(--text-2) !important;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.15s;
        }
        #site-nav nav > li > a:hover { background: var(--bg-2); color: var(--text-1) !important; }
        #site-nav nav > li.scripts-index-link > a { background: var(--accent-dim); color: var(--accent) !important; }

        #site-nav nav > li.with-submenu > nav {
            position: absolute;
            top: calc(100% + 4px);
            right: 0;
            background: var(--bg-2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 6px;
            min-width: 170px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-8px);
            transition: all 0.2s;
            z-index: 100;
        }
        #site-nav nav > li.with-submenu:hover > nav { opacity: 1; visibility: visible; transform: translateY(0); }
        #site-nav nav > li.with-submenu > nav > li > a {
            display: block;
            padding: 8px 12px;
            border-radius: 4px;
            color: var(--text-2) !important;
            font-size: 13px;
        }
        #site-nav nav > li.with-submenu > nav > li > a:hover { background: var(--bg-3); color: var(--text-1) !important; }

        #nav-user-info { display: flex; align-items: center; gap: 12px; font-size: 14px; }
        #nav-user-info .notification-widget {
            padding: 4px 10px;
            background: var(--red);
            color: #fff !important;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        #nav-user-info .user-profile-link a { color: var(--text-1) !important; font-weight: 500; }
        #nav-user-info .sign-out-link a { color: var(--text-3) !important; font-size: 13px; }

        .language-selector-locale {
            background: var(--bg-2) !important;
            border: 1px solid var(--border) !important;
            border-radius: var(--radius);
            color: var(--text-2) !important;
            padding: 6px 10px;
            font-size: 12px;
        }

        #mobile-nav { display: none !important; }

        /* ========== Layout ========== */
        .width-constraint { max-width: 1100px !important; margin: 0 auto !important; padding: 24px !important; }
        .sidebarred { display: block !important; }
        .sidebar, .open-sidebar, .close-sidebar { display: none !important; }
        .sidebarred-main-content { max-width: 100%; }

        /* ========== Script List ========== */
        #browse-script-list {
            list-style: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        #browse-script-list > li {
            background: var(--bg-1);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px 24px;
            transition: border-color 0.2s, background 0.2s;
        }
        #browse-script-list > li:hover { border-color: var(--accent); background: var(--bg-2); }

        #browse-script-list article h2 {
            margin: 0 0 10px 0;
            font-size: 17px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        #browse-script-list article h2 .script-link { color: var(--text-1) !important; }
        #browse-script-list article h2 .script-link:hover { color: var(--accent) !important; }

        .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .badge-js { background: var(--accent-dim); color: var(--accent); }
        .badge-css { background: rgba(168, 85, 247, 0.15); color: var(--purple); }

        .name-description-separator { display: none !important; }
        .script-description { color: var(--text-2) !important; font-size: 14px; margin-bottom: 12px; }

        /* List Stats */
        .inline-script-stats { display: flex; flex-wrap: wrap; gap: 16px; margin: 0; }
        .inline-script-stats dt { display: none !important; }
        .inline-script-stats dd { margin: 0; font-size: 13px; color: var(--text-3); display: flex; align-items: center; gap: 5px; }
        .inline-script-stats dd span { color: var(--text-2); }

        .script-list-author::before { content: ''; }
        .script-list-daily-installs::before { content: '📥 '; }
        .script-list-total-installs::before { content: '📊 '; }
        .script-list-ratings::before { content: '⭐ '; }
        .script-list-updated-date::before { content: '🔄 '; }
        .script-list-created-date { display: none !important; }

        .good-rating-count { color: var(--accent) !important; font-weight: 600; }
        .ok-rating-count { color: var(--yellow) !important; }
        .bad-rating-count { color: var(--red) !important; }
        .script-list-author a { color: var(--accent) !important; font-weight: 500; }

        /* ========== Pagination ========== */
        .pagy.series-nav {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 28px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
        }
        .pagy.series-nav a, .pagy.series-nav [role="link"] {
            min-width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-1);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--text-2) !important;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.15s;
        }
        .pagy.series-nav a:hover { border-color: var(--accent); color: var(--accent) !important; background: var(--accent-dim); }
        .pagy.series-nav [aria-current="page"] { background: var(--accent) !important; border-color: var(--accent) !important; color: #000 !important; font-weight: 600; }
        .pagy.series-nav [aria-disabled="true"] { opacity: 0.35; pointer-events: none; }

        /* ========== Script Detail Page ========== */
        #script-info {
            background: var(--bg-1);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
        }

        #script-links.tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 0;
            margin: 0;
            padding: 0;
            list-style: none;
            background: var(--bg-2);
            border-bottom: 1px solid var(--border);
            overflow: visible;
        }

        #script-links.tabs li { flex-shrink: 0; }
        #script-links.tabs li span, #script-links.tabs li a span {
            display: block;
            padding: 12px 16px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-2);
            white-space: nowrap;
            transition: color 0.15s, background 0.15s;
        }
        #script-links.tabs li a:hover span { color: var(--text-1); background: var(--bg-3); }
        #script-links.tabs li.current { background: var(--bg-1); border-bottom: 2px solid var(--accent); margin-bottom: -1px; }
        #script-links.tabs li.current span { color: var(--accent); font-weight: 600; }

        #script-info > header { padding: 28px; border-bottom: 1px solid var(--border); }
        #script-info > header h2 { margin: 0 0 12px 0; font-size: 26px; font-weight: 700; color: var(--text-1); }
        #script-info #script-description { color: var(--text-2); font-size: 16px; margin: 0; }
        #script-content { padding: 28px; }

        /* Install Button */
        #install-area { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        #install-area .install-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            background: var(--accent);
            color: #000 !important;
            font-size: 15px;
            font-weight: 700;
            border-radius: var(--radius);
            transition: all 0.2s;
        }
        #install-area .install-link:hover { background: var(--accent-hover); transform: translateY(-1px); }
        #install-area .install-link::before { content: '↓'; font-size: 18px; font-weight: 700; }
        #install-area .install-help-link {
            width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
            background: var(--bg-2); border: 1px solid var(--border); border-radius: 50%;
            color: var(--text-3) !important; font-size: 13px; font-weight: 600;
        }

        #script-feedback-suggestion {
            padding: 16px 20px; background: var(--bg-2); border-left: 3px solid var(--accent);
            border-radius: 0 var(--radius) var(--radius) 0; margin-bottom: 24px; font-size: 14px; color: var(--text-2);
        }

        /* Script Meta */
        .script-meta-block { background: var(--bg-2); border-radius: var(--radius); padding: 24px; margin-bottom: 24px; }
        .script-meta-block #script-stats.inline-script-stats { display: grid; grid-template-columns: max-content 1fr; gap: 10px 24px; align-items: baseline; }
        .script-meta-block #script-stats.inline-script-stats > dt { display: block !important; font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-3); padding: 4px 0; }
        .script-meta-block #script-stats.inline-script-stats > dd { font-size: 14px; color: var(--text-1); padding: 4px 0; margin: 0; }
        .script-meta-block #script-stats.inline-script-stats > dd::before { display: none !important; }
        .script-meta-block #script-stats.inline-script-stats > dd a { color: var(--accent) !important; }

        .script-meta-block #script-stats .good-rating-count,
        .script-meta-block #script-stats .ok-rating-count,
        .script-meta-block #script-stats .bad-rating-count { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 13px; margin-right: 4px; }
        .script-meta-block #script-stats .good-rating-count { background: var(--accent-dim); }
        .script-meta-block #script-stats .ok-rating-count { background: rgba(250, 204, 21, 0.15); }
        .script-meta-block #script-stats .bad-rating-count { background: rgba(239, 68, 68, 0.15); }
        .script-meta-block .browser-compatible { width: 22px; height: 22px; margin-right: 6px; vertical-align: middle; filter: brightness(0.9); }

        /* Applies To */
        .script-show-applies-to .block-list { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }
        .script-show-applies-to .block-list.expandable { max-height: none !important; height: auto !important; }
        .script-show-applies-to .block-list li a { display: inline-block; padding: 5px 12px; background: var(--bg-3); border-radius: 20px; font-size: 12px; color: var(--text-2) !important; }
        .script-show-applies-to .block-list li a:hover { background: var(--accent-dim); color: var(--accent) !important; }
        .script-show-applies-to .expander { display: none !important; }

        /* Additional Info */
        #additional-info { padding: 24px; background: var(--bg-2); border-radius: var(--radius); margin-top: 24px; font-size: 15px; line-height: 1.7; color: var(--text-2); }
        #additional-info p { margin: 0 0 16px 0; }
        #additional-info a { color: var(--accent) !important; }
        #additional-info strong { color: var(--text-1); font-weight: 600; }
        #additional-info code { padding: 3px 8px; background: var(--bg-1); border-radius: 4px; font-family: var(--mono); font-size: 13px; color: var(--accent); }
        #additional-info pre { padding: 16px; background: var(--bg-1); border-radius: var(--radius); overflow-x: auto; margin: 0 0 16px 0; }
        #additional-info pre code { padding: 0; background: none; color: var(--text-1); }
        #additional-info img { max-width: 100%; border-radius: var(--radius); margin: 16px 0; }

        .user-screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 20px; }
        .user-screenshots a { display: block; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); transition: all 0.2s; }
        .user-screenshots a:hover { border-color: var(--accent); transform: scale(1.02); }
        .user-screenshots img { width: 100%; display: block; margin: 0 !important; }

        /* ========== Control Bar ========== */
        #gf-control-bar {
            display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding: 16px 20px;
            background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius); flex-wrap: wrap;
        }
        #gf-control-bar .cb-section { display: flex; align-items: center; gap: 10px; }
        #gf-control-bar .cb-label { font-size: 12px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        #gf-control-bar select {
            background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius);
            padding: 8px 12px; font-size: 13px; color: var(--text-1); cursor: pointer; outline: none;
        }
        #gf-control-bar select:focus { border-color: var(--accent); }
        #gf-control-bar .cb-divider { width: 1px; height: 28px; background: var(--border); }
        #gf-control-bar .slider-group { display: flex; align-items: center; gap: 8px; }
        #gf-control-bar .slider-container { display: flex; align-items: center; gap: 8px; }

        #gf-control-bar input[type="range"] {
            -webkit-appearance: none; width: 120px; height: 6px; background: var(--bg-3); border-radius: 3px; outline: none; cursor: pointer;
        }
        #gf-control-bar input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent); border-radius: 50%; cursor: pointer; transition: transform 0.15s;
        }
        #gf-control-bar input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }
        #gf-control-bar .slider-value {
            min-width: 60px; padding: 4px 8px; background: var(--bg-2); border-radius: 4px;
            font-size: 12px; font-weight: 600; color: var(--text-1); text-align: center; font-family: var(--mono);
        }
        #gf-control-bar .cb-stats { margin-left: auto; font-size: 13px; color: var(--text-3); }
        #gf-control-bar .cb-stats strong { color: var(--accent); font-weight: 600; }

        /* ========== Scroll Top Button ========== */
        #gf-scroll-top {
            position: fixed; bottom: 24px; right: 24px; width: 44px; height: 44px;
            background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius);
            color: var(--text-2); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
            z-index: 999; opacity: 0; visibility: hidden; transform: translateY(10px); transition: all 0.2s;
        }
        #gf-scroll-top.show { opacity: 1; visibility: visible; transform: translateY(0); }
        #gf-scroll-top:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

        /* ========== Forms & Inputs ========== */
        input[type="text"], input[type="search"], input[type="email"], input[type="password"], textarea, select {
            background: var(--bg-2) !important; border: 1px solid var(--border) !important; border-radius: var(--radius) !important;
            color: var(--text-1) !important; padding: 10px 14px !important; font-size: 14px !important; outline: none !important; transition: border-color 0.15s !important;
        }
        input:focus, textarea:focus, select:focus { border-color: var(--accent) !important; }
        button, input[type="submit"], .button {
            background: var(--bg-3) !important; border: 1px solid var(--border) !important; border-radius: var(--radius) !important;
            color: var(--text-1) !important; padding: 10px 18px !important; font-size: 14px !important; font-weight: 500 !important; cursor: pointer !important; transition: all 0.15s !important;
        }
        button:hover, input[type="submit"]:hover, .button:hover { background: var(--bg-2) !important; border-color: var(--border-hover) !important; }

        /* ========== Responsive ========== */
        @media (max-width: 768px) {
            #main-header > .width-constraint { padding: 10px 16px; }
            #site-nav { display: none; }
            #mobile-nav { display: block !important; }
            .width-constraint { padding: 16px !important; }
            #browse-script-list > li { padding: 16px 18px; }
            #browse-script-list article h2 { font-size: 15px; }
            #script-info > header { padding: 20px; }
            #script-info > header h2 { font-size: 20px; }
            #script-content { padding: 20px; }
            .script-meta-block { padding: 16px; }
            .script-meta-block #script-stats.inline-script-stats { gap: 6px 16px; }
            #gf-control-bar { gap: 12px; }
            #gf-control-bar input[type="range"] { width: 80px; }
            #gf-control-bar .cb-stats { width: 100%; margin-left: 0; margin-top: 8px; }
            #script-links.tabs li span, #script-links.tabs li a span { padding: 10px 12px; font-size: 12px; }
        }
        @media (max-width: 480px) {
            #script-links.tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }
            #script-links.tabs::-webkit-scrollbar { display: none; }
            #script-links.tabs { -ms-overflow-style: none; scrollbar-width: none; }
        }
    `;

    GM_addStyle(css);

    // ========== 4. INITIALIZATION ==========
    function init() {
        // Wait for body to exist before applying revealing class
        if (document.body) {
            document.documentElement.classList.add('gf-loaded');
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.documentElement.classList.add('gf-loaded');
            });
        }

        expandCollapsed();
        addScrollTop();

        // Check for script list to inject controls
        const scriptList = document.querySelector('#browse-script-list');
        if (scriptList) {
            addControlBar(scriptList);
        }
    }

    function expandCollapsed() {
        document.querySelectorAll('.expandable.collapsed').forEach(el => {
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
            el.classList.remove('collapsed');
        });
        document.querySelectorAll('.expander').forEach(el => el.style.display = 'none');
    }

    function addScrollTop() {
        if (document.getElementById('gf-scroll-top')) return;
        const btn = document.createElement('button');
        btn.id = 'gf-scroll-top';
        btn.innerHTML = '↑';
        btn.title = 'Scroll to top (G)';
        btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.appendChild(btn);

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    btn.classList.toggle('show', window.scrollY > 400);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function addControlBar(list) {
        const main = document.querySelector('.sidebarred-main-content') || list.parentElement;
        if (!main || document.getElementById('gf-control-bar')) return;

        const scripts = Array.from(list.querySelectorAll('li[data-script-id]'));
        if (!scripts.length) return;

        // Calculate dynamic maximums for the current page
        let maxDaily = 0, maxTotal = 0;
        scripts.forEach(li => {
            const daily = parseInt(li.dataset.scriptDailyInstalls) || 0;
            const total = parseInt(li.dataset.scriptTotalInstalls) || 0;
            if (daily > maxDaily) maxDaily = daily;
            if (total > maxTotal) maxTotal = total;
        });

        // Ensure reasonable defaults if 0
        if (maxDaily === 0) maxDaily = 10;
        if (maxTotal === 0) maxTotal = 100;

        const urlParams = new URLSearchParams(window.location.search);
        const currentSort = urlParams.get('sort') || '';

        const bar = document.createElement('div');
        bar.id = 'gf-control-bar';
        bar.innerHTML = `
            <div class="cb-section">
                <span class="cb-label">Sort</span>
                <select id="gf-sort">
                    <option value="" ${currentSort === '' ? 'selected' : ''}>Daily Installs</option>
                    <option value="total_installs" ${currentSort === 'total_installs' ? 'selected' : ''}>Total Installs</option>
                    <option value="ratings" ${currentSort === 'ratings' ? 'selected' : ''}>Ratings</option>
                    <option value="created" ${currentSort === 'created' ? 'selected' : ''}>Created Date</option>
                    <option value="updated" ${currentSort === 'updated' ? 'selected' : ''}>Updated Date</option>
                    <option value="name" ${currentSort === 'name' ? 'selected' : ''}>Name</option>
                </select>
            </div>
            <div class="cb-divider"></div>
            <div class="cb-section slider-group">
                <span class="cb-label">Daily ≥</span>
                <div class="slider-container">
                    <!-- Range is always 0-100 for smooth sliding -->
                    <input type="range" id="gf-daily-slider" min="0" max="100" value="0">
                    <span class="slider-value" id="gf-daily-value">0</span>
                </div>
            </div>
            <div class="cb-section slider-group">
                <span class="cb-label">Total ≥</span>
                <div class="slider-container">
                    <input type="range" id="gf-total-slider" min="0" max="100" value="0">
                    <span class="slider-value" id="gf-total-value">0</span>
                </div>
            </div>
            <div class="cb-stats">
                <strong id="gf-visible">${scripts.length}</strong> / ${scripts.length}
            </div>
        `;
        main.insertBefore(bar, main.firstChild);

        // Logic References
        const sortSelect = document.getElementById('gf-sort');
        const dailySlider = document.getElementById('gf-daily-slider');
        const totalSlider = document.getElementById('gf-total-slider');
        const dailyValueLabel = document.getElementById('gf-daily-value');
        const totalValueLabel = document.getElementById('gf-total-value');
        const visibleCountLabel = document.getElementById('gf-visible');

        sortSelect.onchange = function() {
            const url = new URL(window.location.href);
            if (this.value) url.searchParams.set('sort', this.value);
            else url.searchParams.delete('sort');
            window.location.href = url.toString();
        };

        function applyFilters() {
            // Convert slider position (0-100) to actual value using Power Curve
            const minDaily = getLogValue(parseInt(dailySlider.value), maxDaily);
            const minTotal = getLogValue(parseInt(totalSlider.value), maxTotal);

            let visible = 0;
            scripts.forEach(li => {
                const daily = parseInt(li.dataset.scriptDailyInstalls) || 0;
                const total = parseInt(li.dataset.scriptTotalInstalls) || 0;
                // Filter Logic
                const show = daily >= minDaily && total >= minTotal;
                li.style.display = show ? '' : 'none';
                if (show) visible++;
            });

            // Update Labels
            dailyValueLabel.textContent = formatNumber(minDaily);
            totalValueLabel.textContent = formatNumber(minTotal);
            visibleCountLabel.textContent = visible;
        }

        dailySlider.oninput = applyFilters;
        totalSlider.oninput = applyFilters;
    }

    // ========== 5. KEYBOARD SHORTCUTS ==========
    document.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
        switch(e.key.toLowerCase()) {
            case '/':
                e.preventDefault();
                const search = document.querySelector('.sidebar-search input') || document.querySelector('input[type="search"]');
                search?.focus();
                break;
            case 'i':
                document.querySelector('.install-link')?.click();
                break;
            case 'g':
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
        }
    });

    // ========== 6. BOOTSTRAP ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();