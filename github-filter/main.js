// ==UserScript==
// @name         GitHub Advanced Search 
// @namespace    https://github.com/quantavil/userscript
// @version      5.0
// @description  Advanced filter modal for GitHub search with release detection
// @match        https://github.com/*
// @license      MIT
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================================
       CONSTANTS & CONFIG
       ========================================================================= */
    const CONFIG = {
        ids: {
            modal: 'gh-adv-search-modal',
            style: 'gh-adv-search-style',
            toggleBtn: 'gh-adv-toggle-btn'
        },
        selectors: {
            results: '[data-testid="results-list"]',
            resultItem: '[data-testid="results-list"] > div, .repo-list-item, .Box-row',
            resultLink: '.search-title a, a[href^="/"]'
        }
    };

    const FIELDS = [
        {
            section: 'CORE',
            items: [
                {
                    id: 'type', label: 'Type', type: 'select', options: [
                        { v: 'repositories', l: 'Repositories' },
                        { v: 'code', l: 'Code' },
                        { v: 'issues', l: 'Issues' },
                        { v: 'pullrequests', l: 'Pull Requests' },
                        { v: 'discussions', l: 'Discussions' },
                        { v: 'users', l: 'Users' }
                    ]
                },
                {
                    id: 'sort', label: 'Sort', type: 'select', options: [
                        { v: '', l: 'Best Match' },
                        { v: 'stars', l: 'Most Stars' },
                        { v: 'forks', l: 'Most Forks' },
                        { v: 'updated', l: 'Recently Updated' }
                    ]
                }
            ]
        },
        {
            section: 'LOGIC & OPTIONS',
            items: [
                { id: 'and', label: 'And', placeholder: 'rust async', type: 'text' },
                { id: 'or', label: 'Or', placeholder: 'react, vue', type: 'text' },
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
       THEME & STYLES
       ========================================================================= */
    function injectStyles() {
        if (document.getElementById(CONFIG.ids.style)) return;

        const css = `
            :root {
                --gs-bg: var(--color-canvas-overlay, #ffffff);
                --gs-surface: var(--color-canvas-subtle, #f6f8fa);
                --gs-border: var(--color-border-default, #d0d7de);
                --gs-border-focus: var(--color-accent-emphasis, #0969da);
                --gs-text: var(--color-fg-default, #1F2328);
                --gs-muted: var(--color-fg-muted, #656d76);
                --gs-accent: var(--color-accent-fg, #0969da);
                --gs-accent-hover: var(--color-accent-emphasis, #0969da);
                --gs-green: var(--color-success-fg, #1a7f37);
                --gs-red: var(--color-danger-fg, #cf222e);
                --gs-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                --gs-radius: 6px;
            }

            #${CONFIG.ids.toggleBtn} {
                position: fixed; bottom: 20px; right: 20px; width: 36px; height: 36px;
                background: var(--gs-bg); border: 1px solid var(--gs-border);
                border-radius: 50%; cursor: pointer; z-index: 9997;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;
            }
            #${CONFIG.ids.toggleBtn}:hover { border-color: var(--gs-accent); transform: scale(1.05); }
            #${CONFIG.ids.toggleBtn} svg { width: 16px; height: 16px; fill: var(--gs-text); }

            #${CONFIG.ids.modal} {
                position: fixed; bottom: 64px; right: 20px; width: 320px;
                max-height: calc(100vh - 80px); background: var(--gs-bg);
                border: 1px solid var(--gs-border); border-radius: var(--gs-radius);
                box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 9999;
                display: none; flex-direction: column; font-family: var(--gs-font);
                font-size: 12px; color: var(--gs-text);
            }
            #${CONFIG.ids.modal}[data-visible="true"] { display: flex; }

            .gs-header { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--gs-border); }
            .gs-header-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; }
            .gs-header-title svg { width: 14px; height: 14px; fill: var(--gs-text); }
            .gs-close { background: none; border: none; color: var(--gs-muted); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
            .gs-close:hover { background: var(--gs-surface); color: var(--gs-text); }

            .gs-body { padding: 10px 12px; overflow-y: auto; }
            .gs-section { margin-bottom: 12px; }
            .gs-section:last-child { margin-bottom: 0; }
            .gs-section-title { font-weight: 600; font-size: 10px; text-transform: uppercase; color: var(--gs-muted); margin-bottom: 8px; }
            
            .gs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .gs-grid.full { grid-template-columns: 1fr; }

            .gs-field label { display: block; font-size: 10px; font-weight: 600; margin-bottom: 4px; color: var(--gs-text); }
            .gs-check-container { display: flex; align-items: center; gap: 6px; padding-top: 18px; }
            .gs-check-container input { cursor: pointer; accent-color: var(--gs-accent); margin: 0; }
            .gs-check-container label { margin-bottom: 0; cursor: pointer; }

            .gs-input { width: 100%; background: var(--gs-surface); border: 1px solid var(--gs-border); border-radius: 4px; padding: 6px 8px; color: var(--gs-text); font-size: 12px; box-sizing: border-box; outline: none; }
            .gs-input:focus { border-color: var(--gs-border-focus); box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.3); }
            select.gs-input { cursor: pointer; }

            .gs-footer { padding: 10px 12px; border-top: 1px solid var(--gs-border); display: flex; gap: 8px; }
            .gs-btn { flex: 1; padding: 6px 10px; border: 1px solid var(--gs-border); background: var(--gs-surface); border-radius: 4px; font-weight: 600; font-size: 12px; cursor: pointer; color: var(--gs-text); }
            .gs-btn:hover { background: var(--gs-border); }
            .gs-btn.primary { background: var(--gs-accent); border: none; color: #fff; }
            .gs-btn.primary:hover { background: var(--gs-accent-hover); }

            .gh-release-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; margin-top: 4px; font-size: 10px; font-weight: 600; background: var(--gs-surface); border-radius: 4px; border: 1px solid var(--gs-border); color: var(--gs-text) !important; text-decoration: none !important; }
            .gh-release-tag.loading { opacity: 0.7; }
            .gh-release-tag.has-release { color: var(--gs-green) !important; border-color: var(--gs-green); }
            .gh-release-tag.no-release { color: var(--gs-red) !important; border-color: var(--gs-red); }
            .gh-filtered-item { opacity: 0.4 !important; pointer-events: none !important; }
            .gh-filtered-tag { display: inline-block; padding: 2px 6px; margin-top: 4px; font-size: 10px; font-weight: 600; color: var(--gs-red); border: 1px solid var(--gs-red); border-radius: 4px; background: var(--gs-surface); }
            
            .gs-overlay { position: fixed; inset: 0; background: transparent; z-index: 9998; display: none; }
            .gs-overlay[data-visible="true"] { display: block; }
        `;

        const style = document.createElement('style');
        style.id = CONFIG.ids.style;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* =========================================================================
       LOGIC: QUERY BUILDER 
       ========================================================================= */
    class QueryBuilder {
        static clean = str => (str ? (str.match(/(\"[^\"]*\"|[^, ]+)/g) || []) : []);

        static buildUrl(data) {
            const parts = [...this.clean(data.and)];
            const orTerms = this.clean(data.or);
            if (orTerms.length) parts.push(orTerms.length === 1 ? orTerms[0] : `(${orTerms.join(' OR ')})`);

            data.meta.forEach(m => {
                const val = m.value.trim();
                if (!val) return;

                if (m.key === 'language') {
                    this.clean(val).forEach(t => {
                        let prefix = t.startsWith('-') ? '-' : '';
                        t = t.replace(/^-/, '');
                        parts.push(`${prefix}language:${t.includes(' ') ? `"${t}"` : t}`);
                    });
                } else {
                    let v = val;
                    if (['stars', 'forks', 'size'].includes(m.key) && !/^[<>=]|\.\./.test(v)) v = `>=${v}`;
                    parts.push(`${m.key}:${v.includes(' ') ? `"${v}"` : v}`);
                }
            });

            let url = `https://github.com/search?q=${encodeURIComponent(parts.join(' '))}&type=${data.type}`;
            if (data.sort) url += `&s=${data.sort}&o=desc`;
            if (data.releasesOnly) url += '&userscript_has_release=1';
            return url;
        }

        static parseCurrent() {
            const params = new URLSearchParams(window.location.search);
            const state = {
                type: (params.get('type') || 'repositories').toLowerCase(),
                sort: params.get('s') || '',
                releasesOnly: params.get('userscript_has_release') === '1',
                and: '', or: '', meta: {}
            };
            let q = params.get('q') || '';

            FIELDS.find(s => s.section === 'FILTERS').items.forEach(i => {
                q = q.replace(new RegExp(`(?<!-)(?:^|\\s)${i.meta}:("[^"]*"|\\S+)`, 'gi'), (_, v) => {
                    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                    if (['stars', 'forks', 'size'].includes(i.meta) && v.startsWith('>=')) v = v.substring(2);
                    state.meta[i.id] = state.meta[i.id] ? `${state.meta[i.id]}, ${v}` : v;
                    return '';
                });

                if (i.meta === 'language') {
                    q = q.replace(new RegExp(`(?:^|\\s)-language:("[^"]*"|\\S+)`, 'gi'), (_, v) => {
                        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                        state.meta[i.id] = state.meta[i.id] ? `${state.meta[i.id]}, -${v}` : `-${v}`;
                        return '';
                    });
                }
            });

            const orMatch = q.match(/\(([^)]+)\)/);
            if (orMatch && orMatch[1].includes(' OR ')) {
                state.or = orMatch[1].split(' OR ').join(', ');
                q = q.replace(orMatch[0], '');
            }
            state.and = q.replace(/\s+/g, ' ').trim();
            return state;
        }
    }

    /* =========================================================================
       LOGIC: RELEASE DETECTION
       ========================================================================= */
    const formatRelDate = d => {
        try {
            const diff = Math.floor((new Date() - new Date(d)) / 86400000);
            return diff < 1 ? 'today' : diff === 1 ? 'yesterday' : diff < 7 ? `${diff}d ago` : diff < 30 ? `${Math.floor(diff/7)}w ago` : diff < 365 ? `${Math.floor(diff/30)}mo ago` : `${Math.floor(diff/365)}y ago`;
        } catch { return ''; }
    };

    const createBadge = (status, data = null) => {
        const b = document.createElement('a');
        b.className = `gh-release-tag ${status === 'checking' ? 'loading' : status}`;
        if (status === 'checking') {
            b.textContent = 'Checking…'; b.href = '#'; b.onclick = e => e.preventDefault();
        } else if (status === 'has-release' && data) {
            b.textContent = `${data.tag}${data.date ? ` · ${formatRelDate(data.date)}` : ''}`;
            b.href = data.url; b.target = '_blank';
            b.title = data.date ? `Released: ${new Date(data.date).toLocaleDateString()}` : data.tag;
        } else {
            b.textContent = 'No Release'; b.href = '#'; b.onclick = e => e.preventDefault();
        }
        return b;
    };

    const fetchReleaseInfo = async (owner, repo) => {
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

            if (!res.ok) {
                localStorage.setItem(key, JSON.stringify({ ts: Date.now(), info: null }));
                return null;
            }

            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            let tag = decodeURIComponent(res.url.match(/\/releases\/tag\/([^/?#]+)/)?.[1] || '');
            if (!tag) tag = doc.title.match(/Release (.+?) ·/)?.[1] || doc.querySelector('h1.d-inline')?.textContent.trim();
            if (!tag) throw new Error();

            const date = doc.querySelector('relative-time, time[datetime]')?.getAttribute('datetime');
            const info = { tag, date, url: `/${owner}/${repo}/releases/tag/${encodeURIComponent(tag)}` };
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

    const processItem = async (item, filterOnly) => {
        const link = item.querySelector(CONFIG.selectors.resultLink);
        const parts = link?.getAttribute('href')?.split('/').filter(Boolean);
        if (!parts || parts.length < 2) return;
        
        const insertTarget = item.querySelector('ul') || item;
        const container = document.createElement('div');
        container.appendChild(createBadge('checking'));
        insertTarget.parentNode.insertBefore(container, insertTarget.nextSibling);

        const info = await fetchReleaseInfo(parts[0], parts[1]);
        container.innerHTML = '';

        if (info) {
            container.appendChild(createBadge('has-release', info));
        } else {
            if (filterOnly) {
                item.classList.add('gh-filtered-item');
                const t = document.createElement('span');
                t.className = 'gh-filtered-tag'; t.textContent = 'Filtered (No Release)';
                container.appendChild(t);
            } else {
                container.appendChild(createBadge('no-release'));
            }
        }
    };

    const processSearchResults = () => {
        if (!window.location.pathname.startsWith('/search') || localStorage.getItem('gh-adv-scan') === 'false') return;
        const filterOnly = new URLSearchParams(window.location.search).get('userscript_has_release') === '1';
        
        const items = Array.from(document.querySelectorAll(CONFIG.selectors.resultItem)).filter(i => !i.dataset.releaseProcessed);
        items.forEach(i => i.dataset.releaseProcessed = 'true');
        if (items.length) processQueue(items, 3, i => processItem(i, filterOnly));
    };

    /* =========================================================================
       UI: MODAL 
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

    const createUI = () => {
        if (document.getElementById(CONFIG.ids.modal)) return;

        overlayEl = Object.assign(document.createElement('div'), { className: 'gs-overlay', onclick: () => toggleModal(false) });
        document.body.appendChild(overlayEl);

        modalEl = Object.assign(document.createElement('div'), { id: CONFIG.ids.modal });

        let html = `
            <div class="gs-header">
                <span class="gs-header-title"><svg viewBox="0 0 16 16"><path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04ZM11 6.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"/></svg> Search Filter</span>
                <button class="gs-close" data-close><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div class="gs-body">
        `;

        FIELDS.forEach(s => {
            html += `<div class="gs-section"><div class="gs-section-title">${s.section}</div><div class="gs-grid ${s.items.length === 1 ? 'full' : ''}">`;
            s.items.forEach(f => {
                if (f.type === 'checkbox') {
                    html += `<div class="gs-field gs-check-container"><input type="checkbox" id="gh-field-${f.id}"><label for="gh-field-${f.id}">${f.label}</label></div>`;
                } else {
                    html += `<div class="gs-field"><label>${f.label}</label>${f.type === 'select'
                        ? `<select id="gh-field-${f.id}" class="gs-input">${f.options.map(o => `<option value="${o.v}">${o.l}</option>`).join('')}</select>`
                        : `<input id="gh-field-${f.id}" type="text" class="gs-input" placeholder="${f.placeholder || ''}">`}</div>`;
                }
            });
            html += `</div></div>`;
        });

        html += `</div><div class="gs-footer"><button data-clear class="gs-btn">Clear</button><button data-search class="gs-btn primary">Search</button></div>`;
        
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

        const scanCheck = modalEl.querySelector('#gh-field-scanrepo');
        const relCheck = modalEl.querySelector('#gh-field-releases');
        if (scanCheck && relCheck) {
            scanCheck.addEventListener('change', () => {
                relCheck.disabled = !scanCheck.checked;
                relCheck.parentElement.style.opacity = scanCheck.checked ? '1' : '0.5';
                if (!scanCheck.checked) relCheck.checked = false;
            });
        }

        modalEl.addEventListener('keydown', e => e.key === 'Enter' && executeSearch());
        document.addEventListener('keydown', e => e.key === 'Escape' && modalEl.dataset.visible === 'true' && toggleModal(false));
    };

    const loadStateToUI = () => {
        const state = QueryBuilder.parseCurrent();
        const setVal = (id, val) => { const el = document.getElementById(`gh-field-${id}`); if (el) el.value = val || ''; };

        setVal('type', state.type); setVal('sort', state.sort);
        setVal('and', state.and); setVal('or', state.or);
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
        if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand("Search Filter", () => toggleModal());

        processSearchResults();
        let dt;
        new MutationObserver(() => {
            clearTimeout(dt);
            dt = setTimeout(processSearchResults, 200);
        }).observe(document.body, { childList: true, subtree: true });

        document.addEventListener('turbo:render', processSearchResults);
    };

    init();

})();