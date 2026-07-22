// ==UserScript==
// @name         GitHub Advanced Search
// @namespace    https://github.com/quantavil/userscript
// @version      7.0
// @description  Apple Glass style advanced search builder with release detection and saved presets.
// @match        https://github.com/*
// @license      MIT
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    let isRateLimited = false;
    let rateLimitResetTime = 0;

    const CONFIG = {
        ids: { modal: 'gh-adv-search-modal', style: 'gh-adv-search-style', toggleBtn: 'gh-adv-toggle-btn' },
        selectors: { resultItem: '[data-testid="results-list"] > div, .repo-list-item, .Box-row' }
    };

    const FIELDS = [
        {
            section: 'CORE',
            items: [
                {
                    id: 'type', label: 'Type', type: 'select', options: [
                        { v: 'repositories', l: 'Repositories' }, { v: 'code', l: 'Code' },
                        { v: 'issues', l: 'Issues' }, { v: 'pullrequests', l: 'Pull Requests' },
                        { v: 'discussions', l: 'Discussions' }, { v: 'users', l: 'Users' }
                    ]
                },
                {
                    id: 'sort', label: 'Sort', type: 'select', options: [
                        { v: '', l: 'Best Match' }, { v: 'stars', l: 'Most Stars' },
                        { v: 'forks', l: 'Most Forks' }, { v: 'updated', l: 'Recently Updated' }
                    ]
                }
            ]
        },
        {
            section: 'LOGIC & OPTIONS',
            items: [
                { id: 'and', label: 'And', placeholder: 'rust async', type: 'text' },
                { id: 'or', label: 'Or', placeholder: 'react, vue', type: 'text' },
                { id: 'hide_keys', label: 'Hide words', placeholder: 'spam, bot', type: 'text' },
                { id: 'releases', label: 'Only with releases', type: 'checkbox' },
                { id: 'scanrepo', label: 'Scan repositories', type: 'checkbox' }
            ]
        },
        {
            section: 'FILTERS',
            items: [
                { id: 'repo', label: 'Repo', placeholder: 'facebook/react', meta: 'repo' },
                { id: 'lang', label: 'Language', placeholder: 'python, -html', meta: 'language' },
                { id: 'ext', label: 'Extension', placeholder: 'md', meta: 'extension' },
                { id: 'stars', label: 'Stars', placeholder: '>500', meta: 'stars' },
                { id: 'forks', label: 'Forks', placeholder: '>100', meta: 'forks' },
                { id: 'size', label: 'Size (KB)', placeholder: '>1000', meta: 'size' },
                { id: 'created', label: 'Created', placeholder: '>2023-01', meta: 'created' },
                { id: 'pushed', label: 'Pushed', placeholder: '>2024-01-01', meta: 'pushed' }
            ]
        }
    ];

    /* =========================================================================
       THEME & STYLES (Apple Glassmorphism)
       ========================================================================= */
    function injectStyles() {
        if (document.getElementById(CONFIG.ids.style)) return;

        const css = `
            #${CONFIG.ids.modal}[data-theme="light"],
            #${CONFIG.ids.toggleBtn}[data-theme="light"] {
                color-scheme: light;
                --gha-bg: rgba(255, 255, 255, 0.75);
                --gha-surface: rgba(0, 0, 0, 0.03);
                --gha-surface-hover: rgba(0, 0, 0, 0.06);
                --gha-border: rgba(0, 0, 0, 0.08);
                --gha-border-focus: rgba(0, 113, 227, 0.3);
                --gha-text: #1d1d1f;
                --gha-muted: rgba(0, 0, 0, 0.55);
                --gha-accent: #0071e3;
                --gha-accent-hover: #0077ed;
                --gha-shadow: 0 24px 64px rgba(0, 0, 0, 0.15);
                --gha-radius: 20px;
                --gha-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif;
                --gha-blur: blur(35px) saturate(210%);
                --gha-inset: inset 1px 0 0 rgba(255, 255, 255, 0.4);
                --gha-select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%231d1d1f' opacity='0.6' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E");
                --gha-select-opt-bg: #ffffff;
                --gha-badge-bg: rgba(0, 0, 0, 0.04);
                --gha-badge-border: rgba(0, 0, 0, 0.08);
                --gha-btn-bg: rgba(0, 0, 0, 0.04);
                --gha-btn-border: rgba(0, 0, 0, 0.08);
                --gha-btn-hover: rgba(0, 0, 0, 0.08);
                --gha-tabs-bg: rgba(0, 0, 0, 0.05);
                --gha-tab-active: #ffffff;
                --gha-tab-active-text: #1d1d1f;
                --gha-tab-text: rgba(0, 0, 0, 0.6);
            }

            #${CONFIG.ids.modal}[data-theme="dark"],
            #${CONFIG.ids.toggleBtn}[data-theme="dark"] {
                color-scheme: dark;
                --gha-bg: rgba(10, 10, 12, 0.85);
                --gha-surface: rgba(255, 255, 255, 0.05);
                --gha-surface-hover: rgba(255, 255, 255, 0.09);
                --gha-border: rgba(255, 255, 255, 0.08);
                --gha-border-focus: rgba(41, 151, 255, 0.4);
                --gha-text: #ffffff;
                --gha-muted: rgba(255, 255, 255, 0.55);
                --gha-accent: #2997ff;
                --gha-accent-hover: #54adff;
                --gha-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
                --gha-inset: inset 1px 0 0 rgba(255, 255, 255, 0.12);
                --gha-select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='white' opacity='0.6' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E");
                --gha-select-opt-bg: #1c1c1e;
                --gha-badge-bg: rgba(255, 255, 255, 0.05);
                --gha-badge-border: rgba(255, 255, 255, 0.08);
                --gha-btn-bg: rgba(255, 255, 255, 0.06);
                --gha-btn-border: rgba(255, 255, 255, 0.1);
                --gha-btn-hover: rgba(255, 255, 255, 0.12);
                --gha-tabs-bg: rgba(0, 0, 0, 0.2);
                --gha-tab-active: rgba(255, 255, 255, 0.12);
                --gha-tab-active-text: #ffffff;
                --gha-tab-text: rgba(255, 255, 255, 0.6);
            }

            .gs-overlay {
                position: fixed; inset: 0; background: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 9998;
                opacity: 0; visibility: hidden; pointer-events: none;
                transition: opacity 0.25s ease, visibility 0.25s;
            }
            .gs-overlay[data-visible="true"] { opacity: 1; visibility: visible; pointer-events: auto; }

            #${CONFIG.ids.modal} {
                position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent), var(--gha-bg);
                backdrop-filter: var(--gha-blur); -webkit-backdrop-filter: var(--gha-blur);
                border-left: 1px solid var(--gha-border); box-shadow: var(--gha-shadow), var(--gha-inset); z-index: 9999;
                display: flex; flex-direction: column; font-family: var(--gha-font); font-size: 13px; color: var(--gha-text);
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, visibility 0.3s;
                transform: translateX(100%); opacity: 0; visibility: hidden;
            }
            #${CONFIG.ids.modal}::before {
                content: ''; position: absolute; top: 0; left: 0; right: 0; height: 140px;
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.01) 70%, transparent);
                pointer-events: none; border-radius: var(--gha-radius) var(--gha-radius) 0 0;
            }
            #${CONFIG.ids.modal}[data-visible="true"] { transform: translateX(0); opacity: 1; visibility: visible; }

            @media (max-width: 768px) {
                #${CONFIG.ids.modal} {
                    top: auto; bottom: 0; width: 100%; height: 85vh;
                    border-left: none; border-top: 1px solid var(--gha-border); border-radius: 20px 20px 0 0;
                    transform: translateY(100%);
                    box-shadow: var(--gha-shadow), var(--gha-inset);
                }
                #${CONFIG.ids.modal}::before { border-radius: 20px 20px 0 0; }
                #${CONFIG.ids.modal}[data-visible="true"] { transform: translateY(0); }
            }

            /* Thin custom scrollbar */
            #${CONFIG.ids.modal} ::-webkit-scrollbar { width: 8px; height: 8px; }
            #${CONFIG.ids.modal} ::-webkit-scrollbar-track { background: transparent; }
            #${CONFIG.ids.modal} ::-webkit-scrollbar-thumb { background: var(--gha-border); border-radius: 4px; }
            #${CONFIG.ids.modal} ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }

            .gs-header { padding: 16px; border-bottom: 1px solid var(--gha-border); display: flex; flex-direction: column; gap: 12px; z-index: 1; }
            .gs-header-top { display: flex; justify-content: space-between; align-items: center; }
            .gs-header-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
            .gs-header-title svg { width: 16px; height: 16px; fill: var(--gha-text); }
            .gs-close, .gs-theme-toggle {
                background: none; border: none; cursor: pointer; padding: 6px;
                border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s, color 0.2s;
            }
            .gs-theme-toggle { color: var(--gha-muted); }
            .gs-theme-toggle:hover { background: var(--gha-surface); color: var(--gha-text); }
            .gs-theme-toggle svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
            .gs-theme-toggle:hover svg { transform: rotate(45deg); }
            .gs-close { color: #ff453a; }
            .gs-close:hover { background: rgba(255, 69, 58, 0.15); color: #ff3b30; }
            .gs-close svg { transition: transform 0.3s ease; }
            .gs-close:hover svg { transform: rotate(90deg); }
            .gs-tabs { display: flex; background: var(--gha-tabs-bg); padding: 3px; border-radius: 9px; border: 1px solid var(--gha-border); }
            .gs-tab-btn {
                flex: 1; border: none; background: none; padding: 6px 12px; font-weight: 500; font-size: 12px;
                border-radius: 7px; color: var(--gha-tab-text); cursor: pointer; transition: all 0.2s;
            }
            .gs-tab-btn.active { background: var(--gha-tab-active); color: var(--gha-tab-active-text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }

            .gs-body { flex: 1; overflow-y: auto; z-index: 1; }
            .gs-tab-content { display: none; padding: 16px; box-sizing: border-box; }
            .gs-tab-content.active { display: block; }

            .gs-section { margin-bottom: 20px; }
            .gs-section-title { font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--gha-muted); margin-bottom: 10px; letter-spacing: 0.5px; }
            .gs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .gs-grid.full { grid-template-columns: 1fr; }
            .gs-field label { display: block; font-size: 11px; font-weight: 600; margin-bottom: 6px; color: var(--gha-text); }
            
            .gs-check-container { display: flex; align-items: center; gap: 8px; height: 32px; }
            .gs-check-container input[type="checkbox"] {
                appearance: none; -webkit-appearance: none; width: 16px; height: 16px;
                border: 1px solid var(--gha-border); border-radius: 4px;
                background: var(--gha-surface); cursor: pointer; position: relative;
                transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; margin: 0;
            }
            .gs-check-container input[type="checkbox"]:checked { background: var(--gha-accent); border-color: var(--gha-accent); }
            .gs-check-container input[type="checkbox"]:checked::after {
                content: ''; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0;
                transform: rotate(45deg); position: absolute; top: 1px;
            }
            .gs-check-container input[type="checkbox"]:focus { box-shadow: 0 0 0 3px rgba(41, 151, 255, 0.25); }
            .gs-check-container label { margin-bottom: 0; cursor: pointer; font-size: 12px; color: var(--gha-text); }

            .gs-input {
                width: 100%; background: var(--gha-surface); border: 1px solid var(--gha-border); border-radius: 8px;
                padding: 8px 10px; color: var(--gha-text); font-size: 12px; box-sizing: border-box; outline: none; transition: all 0.2s;
            }
            .gs-input::placeholder { color: var(--gha-muted); }
            .gs-input:focus { border-color: var(--gha-accent); background: rgba(255, 255, 255, 0.08); box-shadow: 0 0 0 3px var(--gha-border-focus); }
            
            select.gs-input {
                appearance: none; -webkit-appearance: none;
                background-image: var(--gha-select-chevron);
                background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; cursor: pointer;
            }
            select.gs-input option { background: var(--gha-select-opt-bg); color: var(--gha-text); }

            .gs-footer { padding: 16px; border-top: 1px solid var(--gha-border); display: flex; gap: 12px; background: rgba(0,0,0,0.15); z-index: 1; }
            .gs-btn {
                flex: 1; padding: 8px 12px; border: 1px solid var(--gha-btn-border); background: var(--gha-btn-bg); border-radius: 8px;
                font-weight: 500; font-size: 13px; cursor: pointer; color: var(--gha-text); display: flex; align-items: center;
                justify-content: center; gap: 6px; transition: all 0.2s ease;
            }
            .gs-btn:hover { background: var(--gha-btn-hover); border-color: var(--gha-border); }
            .gs-btn.primary { background: linear-gradient(180deg, #2997ff, #0071e3); border: none; color: #fff; box-shadow: 0 4px 12px rgba(0, 113, 227, 0.25); }
            .gs-btn.primary:hover { opacity: 0.95; }
            .gs-btn:disabled { opacity: 0.5; cursor: not-allowed; }

            .gs-preset-save-section { background: var(--gha-surface); border: 1px solid var(--gha-border); border-radius: 10px; padding: 12px; margin-bottom: 20px; }
            .gs-input-group { display: flex; gap: 8px; margin-top: 8px; }
            .gs-presets-list { display: flex; flex-direction: column; gap: 10px; max-height: calc(100vh - 280px); overflow-y: auto; }
            .gs-preset-card { border: 1px solid var(--gha-border); border-radius: 10px; padding: 12px; background: var(--gha-surface); transition: all 0.2s ease; }
            .gs-preset-card:hover { border-color: var(--gha-accent); background: var(--gha-surface-hover); }
            .gs-preset-name { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
            .gs-preset-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
            .gs-badge { font-size: 9px; font-weight: 500; padding: 2px 6px; border-radius: 6px; background: var(--gha-badge-bg); border: 1px solid var(--gha-badge-border); color: var(--gha-muted); }
            .gs-preset-actions { display: flex; gap: 6px; }
            .gs-preset-actions button { flex: 1; font-size: 11px; padding: 4px 8px; }

            #${CONFIG.ids.toggleBtn} {
                position: fixed; bottom: 24px; right: 24px; width: 48px; height: 48px;
                background: var(--gha-bg); backdrop-filter: var(--gha-blur); -webkit-backdrop-filter: var(--gha-blur);
                border: 1px solid var(--gha-border); border-radius: 50%; cursor: pointer; z-index: 9997;
                display: flex; align-items: center; justify-content: center; box-shadow: var(--gha-shadow), var(--gha-inset);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            #${CONFIG.ids.toggleBtn}:hover { transform: scale(1.1) rotate(15deg); }
            #${CONFIG.ids.toggleBtn} svg { width: 20px; height: 20px; fill: var(--gha-text); }

            :root {
                --gha-tag-release-color: #0969da;
                --gha-tag-release-bg: rgba(9, 105, 218, 0.08);
                --gha-tag-release-border: rgba(9, 105, 218, 0.25);
                --gha-tag-norelease-color: #cf222e;
                --gha-tag-norelease-bg: rgba(207, 34, 46, 0.08);
                --gha-tag-norelease-border: rgba(207, 34, 46, 0.25);
                --gha-tag-ratelimit-color: #c93b00;
                --gha-tag-ratelimit-bg: rgba(201, 59, 0, 0.08);
                --gha-tag-ratelimit-border: rgba(201, 59, 0, 0.25);
            }

            @media (prefers-color-scheme: dark) {
                :root {
                    --gha-tag-release-color: #58a6ff;
                    --gha-tag-release-bg: rgba(56, 139, 253, 0.15);
                    --gha-tag-release-border: rgba(56, 139, 253, 0.4);
                    --gha-tag-norelease-color: #ff7b72;
                    --gha-tag-norelease-bg: rgba(240, 128, 128, 0.15);
                    --gha-tag-norelease-border: rgba(240, 128, 128, 0.4);
                    --gha-tag-ratelimit-color: #ff9f0a;
                    --gha-tag-ratelimit-bg: rgba(255, 159, 10, 0.15);
                    --gha-tag-ratelimit-border: rgba(255, 159, 10, 0.4);
                }
            }

            html[data-color-mode="dark"] {
                --gha-tag-release-color: #58a6ff;
                --gha-tag-release-bg: rgba(56, 139, 253, 0.15);
                --gha-tag-release-border: rgba(56, 139, 253, 0.4);
                --gha-tag-norelease-color: #ff7b72;
                --gha-tag-norelease-bg: rgba(240, 128, 128, 0.15);
                --gha-tag-norelease-border: rgba(240, 128, 128, 0.4);
                --gha-tag-ratelimit-color: #ff9f0a;
                --gha-tag-ratelimit-bg: rgba(255, 159, 10, 0.15);
                --gha-tag-ratelimit-border: rgba(255, 159, 10, 0.4);
            }

            html[data-color-mode="light"] {
                --gha-tag-release-color: #0969da;
                --gha-tag-release-bg: rgba(9, 105, 218, 0.08);
                --gha-tag-release-border: rgba(9, 105, 218, 0.25);
                --gha-tag-norelease-color: #cf222e;
                --gha-tag-norelease-bg: rgba(207, 34, 46, 0.08);
                --gha-tag-norelease-border: rgba(207, 34, 46, 0.25);
                --gha-tag-ratelimit-color: #c93b00;
                --gha-tag-ratelimit-bg: rgba(201, 59, 0, 0.08);
                --gha-tag-ratelimit-border: rgba(201, 59, 0, 0.25);
            }

            .gh-release-tag {
                display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; margin: 4px 4px 0 0;
                font-size: 11px; font-weight: 500; background: var(--gha-badge-bg); border-radius: 6px;
                border: 1px solid var(--gha-badge-border); color: var(--gha-text) !important; text-decoration: none !important;
                transition: all 0.2s;
            }
            .gh-release-tag.loading { opacity: 0.7; }
            .gh-release-tag.has-release {
                color: var(--gha-tag-release-color) !important;
                border-color: var(--gha-tag-release-border) !important;
                background: var(--gha-tag-release-bg) !important;
            }
            .gh-release-tag.no-release {
                color: var(--gha-tag-norelease-color) !important;
                border-color: var(--gha-tag-norelease-border) !important;
                background: var(--gha-tag-norelease-bg) !important;
            }
            .gh-release-tag.rate-limited {
                color: var(--gha-tag-ratelimit-color) !important;
                border-color: var(--gha-tag-ratelimit-border) !important;
                background: var(--gha-tag-ratelimit-bg) !important;
            }
            .gh-filtered-item { display: none !important; }
        `;

        const style = document.createElement('style');
        style.id = CONFIG.ids.style;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* =========================================================================
       REPOSITORY SELECTOR EXTRACTION
       ========================================================================= */
    const getRepoFromItem = item => {
        const RESERVED_PATHS = [
            'settings', 'pulls', 'issues', 'marketplace', 'explore', 'notifications', 
            'search', 'orgs', 'organizations', 'trending', 'collections', 'features', 
            'sponsors', 'about', 'readme', 'topics', 'login', 'join', 'signup', 
            'site', 'security', 'contact', 'pricing', 'personal', 'account', 'billing', 
            'sessions', 'auth', 'images', 'fluidicon.png', 'robots.txt', 'favicon.ico', 
            'copilot', 'home', 'dashboard'
        ];

        // Prioritize primary repository link elements
        const primaryLink = item.querySelector('a[data-testid="results-list-item-link"], a.v-align-middle, h3 a, h4 a, .f4 a');
        const links = primaryLink ? [primaryLink, ...item.querySelectorAll('a[href]')] : item.querySelectorAll('a[href]');

        for (const a of links) {
            const href = a.getAttribute('href');
            if (!href) continue;
            try {
                const url = new URL(href, window.location.origin);
                if (url.hostname !== 'github.com' && url.hostname !== window.location.hostname) continue;
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    const owner = parts[0];
                    const repo = parts[1];
                    if (!owner.startsWith('.') && !RESERVED_PATHS.includes(owner.toLowerCase())) {
                        return { owner, repo };
                    }
                }
            } catch {}
        }
        return null;
    };

    /* =========================================================================
       LOGIC: QUERY BUILDER
       ========================================================================= */
    class QueryBuilder {
        static clean = str => str ? (str.match(/"[^"]+"|[^\s,]+/g) || []).map(s => s.trim()).filter(Boolean) : [];

        static buildUrl(data) {
            const parts = [...this.clean(data.and)];
            const orTerms = this.clean(data.or);
            if (orTerms.length) parts.push(orTerms.length === 1 ? orTerms[0] : `(${orTerms.join(' OR ')})`);

            data.meta.forEach(m => {
                this.clean(m.value).forEach(term => {
                    const prefix = term.startsWith('-') ? '-' : '';
                    let cleanTerm = term.replace(/^-/, '');

                    if (['stars', 'forks', 'size'].includes(m.key) && !/^[<>=]|\.\./.test(cleanTerm)) {
                        cleanTerm = `>=${cleanTerm}`;
                    }
                    parts.push(`${prefix}${m.key}:${cleanTerm}`);
                });
            });

            let url = `https://github.com/search?q=${encodeURIComponent(parts.join(' '))}&type=${data.type}`;
            if (data.sort) url += `&s=${data.sort}&o=desc`;
            if (data.releasesOnly) url += '&userscript_has_release=1';
            if (data.hideKeys) url += `&userscript_hide_keys=${encodeURIComponent(data.hideKeys)}`;
            return url;
        }

        static parseCurrent() {
            const params = new URLSearchParams(window.location.search);
            const state = {
                type: (params.get('type') || 'repositories').toLowerCase(),
                sort: params.get('s') || '',
                releasesOnly: params.get('userscript_has_release') === '1',
                hideKeys: params.get('userscript_hide_keys') || '',
                and: '', or: '', meta: {}
            };
            let q = params.get('q') || '';

            FIELDS.find(s => s.section === 'FILTERS').items.forEach(i => {
                const matched = [];
                const keyPattern = i.meta === 'language' ? '(?:language|lang)' : i.meta === 'extension' ? '(?:extension|ext)' : i.meta;
                q = q.replace(new RegExp(`(?:^|\\s)(-?)${keyPattern}:("[^"]*"|\\S+)`, 'gi'), (_, pre, v) => {
                    v = v.replace(/^"|"$/g, '');
                    if (['stars', 'forks', 'size'].includes(i.meta) && v.startsWith('>=')) v = v.slice(2);
                    matched.push(`${pre || ''}${v}`);
                    return '';
                });
                if (matched.length) state.meta[i.id] = matched.join(', ');
            });

            const or = q.match(/\(([^)]+)\)/);
            if (or && or[1].includes(' OR ')) {
                state.or = or[1].split(' OR ').join(', ');
                q = q.replace(or[0], '');
            }
            state.and = q.replace(/\s+/g, ' ').trim();
            return state;
        }
    }

    /* =========================================================================
       LOGIC: RELEASE DETECTION
       ========================================================================= */
    const formatRelDate = d => {
        const diff = Math.floor((Date.now() - new Date(d)) / 8.64e7);
        return diff < 1 ? 'today' : diff === 1 ? 'yesterday' : diff < 7 ? `${diff}d ago` : diff < 30 ? `${Math.floor(diff/7)}w ago` : diff < 365 ? `${Math.floor(diff/30)}mo ago` : `${Math.floor(diff/365)}y ago`;
    };

    const createBadge = (status, data = null) => {
        const b = document.createElement('a');
        b.className = `gh-release-tag ${status === 'checking' ? 'loading' : status}`;
        b.href = (status === 'has-release' && data) ? `https://github.com${data.url}` : 'javascript:void(0)';
        if (status === 'has-release' && data) {
            b.textContent = `${data.tag}${data.date ? ` · ${formatRelDate(data.date)}` : ''}`;
            b.target = '_blank';
            b.title = data.date ? `Released: ${new Date(data.date).toLocaleDateString()}` : data.tag;
        } else {
            b.textContent = status === 'checking' ? 'Checking…' : 'No Release';
        }
        return b;
    };

    const fetchReleaseInfo = async (owner, repo) => {
        if (isRateLimited && Date.now() <= rateLimitResetTime) return 'rate-limited';
        isRateLimited = false;

        const key = `gh-rel-${owner}-${repo}`;
        try {
            const cached = JSON.parse(localStorage.getItem(key));
            if (cached && Date.now() - cached.ts < 86400000) return cached.info;
        } catch {}

        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 10000);
            const res = await fetch(`/${owner}/${repo}/releases/latest`, { signal: ctrl.signal });
            clearTimeout(tid);

            if (res.status === 429) {
                isRateLimited = true;
                rateLimitResetTime = Date.now() + 60000;
                return 'rate-limited';
            }

            if (res.status === 404) {
                localStorage.setItem(key, JSON.stringify({ ts: Date.now(), info: null }));
                return null;
            }
            if (!res.ok) return null;

            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            let tag = decodeURIComponent(res.url.match(/\/releases\/tag\/([^/?#]+)/)?.[1] || '');
            if (!tag) tag = doc.title.match(/Release (.+?) ·/)?.[1] || doc.querySelector('h1.d-inline')?.textContent.trim();
            if (!tag) throw new Error();

            const info = { tag, date: doc.querySelector('relative-time, time[datetime]')?.getAttribute('datetime'), url: `/${owner}/${repo}/releases/tag/${encodeURIComponent(tag)}` };
            localStorage.setItem(key, JSON.stringify({ ts: Date.now(), info }));
            return info;
        } catch { return null; }
    };

    const processQueue = async (items, concurrency, task) => {
        const q = [...items];
        await Promise.all(Array.from({ length: concurrency }, async () => {
            while (q.length) try { await task(q.shift()); } catch {}
        }));
    };

    const insertBadge = (item, badge) => {
        const meta = item.querySelector('ul') || item.querySelector('.flex-wrap') || item.querySelector('div.d-flex');
        if (meta) {
            if (meta.tagName.toLowerCase() === 'ul') {
                const li = document.createElement('li');
                li.className = 'd-flex align-items-center';
                li.appendChild(badge);
                meta.appendChild(li);
            } else {
                badge.style.marginLeft = '8px';
                meta.appendChild(badge);
            }
        } else {
            const container = document.createElement('div');
            container.style.marginTop = '4px';
            container.appendChild(badge);
            item.appendChild(container);
        }
    };

    const processItem = async (item, filterOnly) => {
        const repoInfo = getRepoFromItem(item);
        if (!repoInfo) return;
        
        const badgeContainer = document.createElement('div');
        badgeContainer.style.display = 'inline-block';
        badgeContainer.appendChild(createBadge('checking'));
        insertBadge(item, badgeContainer);

        const info = await fetchReleaseInfo(repoInfo.owner, repoInfo.repo);
        badgeContainer.innerHTML = '';

        if (info === 'rate-limited') {
            const t = document.createElement('span');
            t.className = 'gh-release-tag rate-limited';
            t.textContent = 'Rate Limited';
            t.title = 'GitHub rate limited release checks. Retrying in a minute.';
            badgeContainer.appendChild(t);
            delete item.dataset.releaseProcessed;
            return;
        }

        if (info) {
            badgeContainer.appendChild(createBadge('has-release', info));
        } else {
            if (filterOnly) {
                item.classList.add('gh-filtered-item');
            } else {
                badgeContainer.appendChild(createBadge('no-release'));
            }
        }
    };

    const processSearchResults = () => {
        if (!window.location.pathname.startsWith('/search')) return;
        const shouldScan = localStorage.getItem('gh-adv-scan') !== 'false';
        const params = new URLSearchParams(window.location.search);
        const filterOnly = params.get('userscript_has_release') === '1';
        const keywords = (params.get('userscript_hide_keys') || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        
        if (!shouldScan && !keywords.length) return;
        
        const items = Array.from(document.querySelectorAll(CONFIG.selectors.resultItem)).filter(i => !i.dataset.releaseProcessed);
        if (!items.length) return;
        items.forEach(i => i.dataset.releaseProcessed = 'true');
        
        const toScan = [];
        items.forEach(item => {
            if (keywords.length && keywords.some(k => item.textContent.toLowerCase().includes(k))) {
                item.classList.add('gh-filtered-item');
            } else if (shouldScan) {
                toScan.push(item);
            }
        });

        if (toScan.length) processQueue(toScan, 3, i => processItem(i, filterOnly));
    };

    /* =========================================================================
       UI: MODAL & PRESETS
       ========================================================================= */
    let modalEl = null;
    let overlayEl = null;

    function toggleModal(show) {
        if (!modalEl) createUI();
        const v = show === undefined ? modalEl.dataset.visible !== 'true' : show;
        modalEl.dataset.visible = overlayEl.dataset.visible = v;
        if (v) {
            loadStateToUI();
            modalEl.querySelector('input, select')?.focus();
        }
    }

    const getFormValues = () => {
        const get = id => document.getElementById(`gh-field-${id}`);
        const meta = {};
        FIELDS.find(s => s.section === 'FILTERS').items.forEach(i => meta[i.id] = get(i.id)?.value || '');
        return {
            type: get('type')?.value || 'repositories',
            sort: get('sort')?.value || '',
            and: get('and')?.value || '',
            or: get('or')?.value || '',
            hideKeys: get('hide_keys')?.value || '',
            releasesOnly: get('releases')?.checked || false,
            scanrepo: get('scanrepo')?.checked || false,
            meta
        };
    };

    const loadPresetToUI = (preset) => {
        const set = (id, val, isProp) => {
            const el = document.getElementById(`gh-field-${id}`);
            if (el) el[isProp ? 'checked' : 'value'] = val;
        };
        const f = preset?.fields || {};
        set('type', f.type || 'repositories');
        set('sort', f.sort || '');
        set('and', f.and || '');
        set('or', f.or || '');
        set('hide_keys', f.hideKeys || '');
        set('releases', !!f.releasesOnly, true);
        set('scanrepo', !!f.scanrepo, true);

        document.getElementById('gh-field-scanrepo')?.dispatchEvent(new Event('change'));
        Object.entries(f.meta || {}).forEach(([id, val]) => set(id, val || ''));
    };

    const savePreset = () => {
        const nameInput = document.getElementById('gs-preset-name');
        const name = nameInput?.value.trim();
        if (!name) return alert('Please enter a preset name');

        const presets = JSON.parse(localStorage.getItem('gh-adv-presets') || '[]');
        presets.push({ id: 'preset-' + Date.now(), name, fields: getFormValues() });
        localStorage.setItem('gh-adv-presets', JSON.stringify(presets));

        if (nameInput) nameInput.value = '';
        renderPresets();
    };

    const deletePreset = (presetId) => {
        const presets = JSON.parse(localStorage.getItem('gh-adv-presets') || '[]').filter(p => p.id !== presetId);
        localStorage.setItem('gh-adv-presets', JSON.stringify(presets));
        renderPresets();
    };

    const escapeHTML = str => str.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

    const renderPresets = () => {
        const container = document.getElementById('gs-presets-list-container');
        if (!container) return;

        const presets = JSON.parse(localStorage.getItem('gh-adv-presets') || '[]');
        if (!presets.length) {
            container.innerHTML = `<div style="text-align: center; color: var(--gha-muted); padding: 24px; font-size: 12px;">No saved presets yet.</div>`;
            return;
        }

        container.innerHTML = presets.map(p => {
            const badges = [];
            const f = p.fields || {};
            if (f.type) badges.push(`<span class="gs-badge">${f.type}</span>`);
            if (f.and) badges.push(`<span class="gs-badge">AND: ${f.and}</span>`);
            if (f.or) badges.push(`<span class="gs-badge">OR: ${f.or}</span>`);
            Object.entries(f.meta || {}).forEach(([k, v]) => v && badges.push(`<span class="gs-badge">${k}: ${v}</span>`));
            if (f.releasesOnly) badges.push(`<span class="gs-badge">releases</span>`);

            return `
                <div class="gs-preset-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div class="gs-preset-name">${escapeHTML(p.name)}</div>
                        <button class="gs-close" style="padding: 4px; color: var(--gha-muted); display: inline-flex;" data-delete="${p.id}" title="Delete Preset">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="gs-preset-badges">${badges.join('')}</div>
                    <div class="gs-preset-actions">
                        <button class="gs-btn primary" data-apply="${p.id}">Search</button>
                        <button class="gs-btn" data-load="${p.id}">Load to Builder</button>
                    </div>
                </div>
            `;
        }).join('');

        presets.forEach(p => {
            container.querySelector(`[data-apply="${p.id}"]`).onclick = () => { loadPresetToUI(p); executeSearch(); };
            container.querySelector(`[data-load="${p.id}"]`).onclick = () => { loadPresetToUI(p); modalEl.querySelector('.gs-tab-btn[data-tab="builder"]')?.click(); };
            container.querySelector(`[data-delete="${p.id}"]`).onclick = () => deletePreset(p.id);
        });
    };

    const getSystemTheme = () => {
        const stored = localStorage.getItem('gh-adv-theme');
        if (stored) return stored;
        const ghMode = document.documentElement.getAttribute('data-color-mode');
        if (ghMode) {
            if (ghMode === 'dark') return 'dark';
            if (ghMode === 'light') return 'light';
            if (ghMode === 'auto') {
                const autoMode = document.documentElement.getAttribute('data-dark-theme');
                if (autoMode && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
            }
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const applyTheme = (theme) => {
        if (modalEl) modalEl.dataset.theme = theme;
        const toggleBtn = document.getElementById(CONFIG.ids.toggleBtn);
        if (toggleBtn) toggleBtn.dataset.theme = theme;

        const btn = document.getElementById('gs-theme-toggle');
        if (btn) {
            btn.innerHTML = theme === 'dark'
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
        }
    };

    const createUI = () => {
        if (document.getElementById(CONFIG.ids.modal)) return;

        overlayEl = Object.assign(document.createElement('div'), { className: 'gs-overlay', onclick: () => toggleModal(false) });
        document.body.appendChild(overlayEl);

        modalEl = Object.assign(document.createElement('div'), { id: CONFIG.ids.modal });

        let html = `
            <div class="gs-header">
                <div class="gs-header-top">
                    <span class="gs-header-title">
                        <svg viewBox="0 0 16 16"><path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04ZM11 6.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/></svg>
                        Advanced Search
                    </span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="gs-theme-toggle" id="gs-theme-toggle" type="button" title="Toggle Theme"></button>
                        <button class="gs-close" data-close>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
                <div class="gs-tabs">
                    <button class="gs-tab-btn active" data-tab="builder">Filter Builder</button>
                    <button class="gs-tab-btn" data-tab="presets">Saved Presets</button>
                </div>
            </div>
            <div class="gs-body">
                <div class="gs-tab-content active" id="gs-tab-builder">
        `;

        FIELDS.forEach(s => {
            html += `<div class="gs-section"><div class="gs-section-title">${s.section}</div>`;
            if (s.section === 'LOGIC & OPTIONS') {
                html += `
                    <div class="gs-grid">
                        <div class="gs-field"><label>And</label><input id="gh-field-and" type="text" class="gs-input" placeholder="rust async"></div>
                        <div class="gs-field"><label>Or</label><input id="gh-field-or" type="text" class="gs-input" placeholder="react, vue"></div>
                        <div class="gs-field" style="grid-column: span 2;"><label>Hide words</label><input id="gh-field-hide_keys" type="text" class="gs-input" placeholder="spam, bot"></div>
                        <div class="gs-field gs-check-container" style="margin-top: 4px;"><input type="checkbox" id="gh-field-scanrepo"><label for="gh-field-scanrepo">Scan repositories</label></div>
                        <div class="gs-field gs-check-container" style="margin-top: 4px;"><input type="checkbox" id="gh-field-releases"><label for="gh-field-releases">Only with releases</label></div>
                    </div>
                `;
            } else {
                html += `<div class="gs-grid ${s.items.length === 1 ? 'full' : ''}">`;
                s.items.forEach(f => {
                    html += `<div class="gs-field"><label>${f.label}</label>${f.type === 'select'
                        ? `<select id="gh-field-${f.id}" class="gs-input">${f.options.map(o => `<option value="${o.v}">${o.l}</option>`).join('')}</select>`
                        : `<input id="gh-field-${f.id}" type="text" class="gs-input" placeholder="${f.placeholder || ''}">`}</div>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        });

        html += `
                </div>
                <div class="gs-tab-content" id="gs-tab-presets">
                    <div class="gs-preset-save-section">
                        <label class="gs-section-title" style="margin-bottom: 4px; display: block;">Save Current Configuration</label>
                        <div class="gs-input-group">
                            <input type="text" id="gs-preset-name" class="gs-input" placeholder="e.g. Type-1 Filter">
                            <button id="gs-btn-save-preset" class="gs-btn primary">Save</button>
                        </div>
                    </div>
                    <div class="gs-section-title">Saved Presets</div>
                    <div class="gs-presets-list" id="gs-presets-list-container"></div>
                </div>
            </div>
            <div class="gs-footer" id="gs-builder-footer">
                <button data-clear class="gs-btn">Clear</button>
                <button data-save-search class="gs-btn">Save Preset</button>
                <button data-search class="gs-btn primary">Search</button>
            </div>
        `;
        
        modalEl.innerHTML = html;
        document.body.appendChild(modalEl);

        if (!document.getElementById(CONFIG.ids.toggleBtn)) {
            const btn = Object.assign(document.createElement('button'), {
                id: CONFIG.ids.toggleBtn, type: 'button', title: 'Search Filter',
                innerHTML: `<svg viewBox="0 0 16 16"><path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04ZM11 6.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/></svg>`,
                onclick: () => toggleModal()
            });
            document.body.appendChild(btn);
        }

        modalEl.querySelector('[data-close]').onclick = () => toggleModal(false);
        modalEl.querySelector('[data-clear]').onclick = () => {
            modalEl.querySelectorAll('input, select').forEach(el => el.type === 'checkbox' ? el.checked = false : el.value = '');
            modalEl.querySelector('#gh-field-scanrepo')?.dispatchEvent(new Event('change'));
        };
        modalEl.querySelector('[data-search]').onclick = executeSearch;
        
        modalEl.querySelector('[data-save-search]').onclick = () => {
            const presetsBtn = modalEl.querySelector('.gs-tab-btn[data-tab="presets"]');
            if (presetsBtn) {
                presetsBtn.click();
                setTimeout(() => document.getElementById('gs-preset-name')?.focus(), 100);
            }
        };

        const themeToggle = modalEl.querySelector('#gs-theme-toggle');
        if (themeToggle) {
            themeToggle.onclick = () => {
                const current = modalEl.dataset.theme || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                localStorage.setItem('gh-adv-theme', next);
                applyTheme(next);
            };
        }

        document.getElementById('gs-btn-save-preset').onclick = savePreset;

        modalEl.querySelectorAll('.gs-tab-btn').forEach(btn => {
            btn.onclick = () => {
                modalEl.querySelectorAll('.gs-tab-btn').forEach(b => b.classList.remove('active'));
                modalEl.querySelectorAll('.gs-tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                modalEl.querySelector(`#gs-tab-${btn.dataset.tab}`)?.classList.add('active');
                
                const footer = document.getElementById('gs-builder-footer');
                if (footer) footer.style.display = btn.dataset.tab === 'builder' ? 'flex' : 'none';
                if (btn.dataset.tab === 'presets') renderPresets();
            };
        });

        const scanCheck = modalEl.querySelector('#gh-field-scanrepo');
        const relCheck = modalEl.querySelector('#gh-field-releases');
        if (scanCheck && relCheck) {
            scanCheck.addEventListener('change', () => {
                relCheck.disabled = !scanCheck.checked;
                relCheck.parentElement.style.opacity = scanCheck.checked ? '1' : '0.5';
                if (!scanCheck.checked) relCheck.checked = false;
            });
        }

        applyTheme(getSystemTheme());

        modalEl.addEventListener('keydown', e => e.key === 'Enter' && e.target.id !== 'gs-preset-name' && executeSearch());
        document.addEventListener('keydown', e => e.key === 'Escape' && modalEl.dataset.visible === 'true' && toggleModal(false));
    };

    const loadStateToUI = () => {
        const state = QueryBuilder.parseCurrent();
        const setVal = (id, val) => { const el = document.getElementById(`gh-field-${id}`); if (el) el.value = val || ''; };

        setVal('type', state.type); setVal('sort', state.sort);
        setVal('and', state.and); setVal('or', state.or);
        setVal('hide_keys', state.hideKeys);
        Object.entries(state.meta).forEach(([id, val]) => setVal(id, val));

        const relCheck = document.getElementById('gh-field-releases');
        if (relCheck) relCheck.checked = state.releasesOnly;

        const scanCheck = document.getElementById('gh-field-scanrepo');
        if (scanCheck) {
            scanCheck.checked = localStorage.getItem('gh-adv-scan') !== 'false';
            scanCheck.dispatchEvent(new Event('change'));
        }
    };

    const executeSearch = () => {
        const getVal = id => document.getElementById(`gh-field-${id}`)?.value || '';
        const scanCheck = document.getElementById('gh-field-scanrepo');
        if (scanCheck) localStorage.setItem('gh-adv-scan', scanCheck.checked);

        const data = {
            type: getVal('type'), sort: getVal('sort'), and: getVal('and'), or: getVal('or'), meta: [],
            hideKeys: getVal('hide_keys'),
            releasesOnly: document.getElementById('gh-field-releases')?.checked || false
        };

        FIELDS.find(s => s.section === 'FILTERS').items.forEach(i => {
            const val = getVal(i.id);
            if (val) data.meta.push({ key: i.meta, value: val });
        });

        window.location.href = QueryBuilder.buildUrl(data);
    };

    /* =========================================================================
       INIT
       ========================================================================= */
    const init = () => {
        injectStyles();
        createUI();
        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand("Search Filter", () => toggleModal());
        }

        processSearchResults();
        let dt;
        new MutationObserver(() => {
            clearTimeout(dt);
            dt = setTimeout(processSearchResults, 200);
        }).observe(document.body, { childList: true, subtree: true });

        document.addEventListener('turbo:render', processSearchResults);

        // Auto-sync theme when GitHub's theme changes
        const themeObserver = new MutationObserver(() => {
            if (!localStorage.getItem('gh-adv-theme')) {
                applyTheme(getSystemTheme());
            }
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-color-mode', 'data-dark-theme', 'data-light-theme']
        });
    };

    init();

})();