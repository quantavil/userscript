// ==UserScript==
// @name         GitHub Advanced Search Builder
// @namespace    https://github.com/quantavil/userscript
// @version      1.7
// @description  Advanced filter modal for GitHub search with OR/AND/NOT logic and native look.
// @author       quantavil
// @match        https://github.com/*
// @license      MIT
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Config
    const TRIGGER_ID = 'gh-adv-search-btn';
    const MODAL_ID = 'gh-adv-search-modal';

    // Icons
    const FILTER_ICON = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor"><path d="M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>`;

    function createUI() {
        if (document.getElementById(TRIGGER_ID)) return;

        // Find the global search input container
        const headerSearch = document.querySelector('.header-search-wrapper, .AppHeader-search');
        if (!headerSearch) return;

        // Create Trigger Button
        const btn = document.createElement('button');
        btn.id = TRIGGER_ID;
        btn.className = 'btn btn-sm ml-2';
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '4px';
        btn.innerHTML = `${FILTER_ICON} Filter`;
        btn.title = "Advanced Search Builder (Ctrl+Shift+F)";

        // Insert Button
        if (headerSearch.parentNode) {
            headerSearch.parentNode.insertBefore(btn, headerSearch.nextSibling);
        }

        // Create Modal (Hidden by default)
        const modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 95%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 9999;
            background-color: var(--bgColor-default, #fff);
            border: 1px solid var(--borderColor-default, #d0d7de);
            border-radius: 6px;
            box-shadow: var(--shadow-large, 0 8px 24px rgba(140,149,159,0.2));
            display: none;
            padding: 16px;
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif;
            color: var(--fgColor-default, #24292f);
            box-sizing: border-box;
        `;

        // Add responsive grid style
        const style = document.createElement('style');
        style.innerHTML = `
            #${MODAL_ID} .responsive-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            @media (max-width: 480px) {
                #${MODAL_ID} .responsive-grid {
                    grid-template-columns: 1fr;
                }
                #${MODAL_ID} {
                    top: 10px;
                    transform: translateX(-50%);
                }
            }
        `;
        document.head.appendChild(style);

        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; font-size:16px;">Advanced Search</h3>
                <button id="${MODAL_ID}-close" class="btn-octicon" type="button">
                   <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>
                </button>
            </div>

            <form id="${MODAL_ID}-form">
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Must contain ALL (AND)</label>
                    <input type="text" id="inp-and" class="form-control input-sm input-block" placeholder="rust async tokio" style="width:100%;">
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Must contain ONE OF (OR)</label>
                    <input type="text" id="inp-or" class="form-control input-sm input-block" placeholder="api, library, framework" style="width:100%;">
                    <p style="font-size:10px; color:var(--fgColor-muted); margin-top:4px;">Separators: space, comma, or colon.</p>
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px; color:var(--fgColor-danger, #cf222e);">Exclude (NOT)</label>
                    <input type="text" id="inp-not" class="form-control input-sm input-block" placeholder="deprecated, archived" style="width:100%;">
                </div>

                <hr style="border:0; border-top:1px solid var(--borderColor-muted); margin: 12px 0;">

                <div class="responsive-grid">
                     <div>
                        <label style="display:block; font-size:12px; font-weight:600;">Owner/User</label>
                        <input type="text" id="inp-user" class="form-control input-sm" style="width:100%;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600;">Repository</label>
                        <input type="text" id="inp-repo" class="form-control input-sm" style="width:100%;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600;">Language</label>
                        <input type="text" id="inp-lang" class="form-control input-sm" placeholder="python" style="width:100%;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600;">Extension</label>
                        <input type="text" id="inp-ext" class="form-control input-sm" placeholder="md" style="width:100%;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600;">Stars (>=)</label>
                        <input type="number" id="inp-stars" class="form-control input-sm" style="width:100%;">
                    </div>
                    <div>
                        <label style="display:block; font-size:12px; font-weight:600;">Forks (>=)</label>
                        <input type="number" id="inp-forks" class="form-control input-sm" style="width:100%;">
                    </div>
                </div>

                 <div style="margin-top:12px;">
                    <label style="display:block; font-size:12px; font-weight:600;">In Path</label>
                    <input type="text" id="inp-path" class="form-control input-sm" placeholder="src/main" style="width:100%;">
                </div>

                <div style="margin-top:16px; text-align:right;">
                    <button type="submit" class="btn btn-primary btn-sm">Search</button>
                </div>
            </form>

        `;

        document.body.appendChild(modal);

        // Events
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
            document.getElementById('inp-and').focus();
        });

        document.getElementById(`${MODAL_ID}-close`).addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById(`${MODAL_ID}-form`).addEventListener('submit', (e) => {
            e.preventDefault();
            executeSearch();
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') modal.style.display = 'none';
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                modal.style.display = 'block';
                document.getElementById('inp-and').focus();
            }
        });
    }

    function executeSearch() {
        let queryParts = [];

        // Helper to split by space, comma, or semicolon
        const parseList = (val) => val.split(/[\s,;]+/).filter(t => t.length > 0);
        // 1. Handle AND (Default text)
        const andVal = document.getElementById('inp-and').value.trim();
        if (andVal) queryParts.push(andVal);
        // 2. Handle OR (Complex Grouping)
        const orVal = document.getElementById('inp-or').value.trim();
        if (orVal) {
            const terms = parseList(orVal);
            if (terms.length > 1) {
                queryParts.push(`(${terms.join(' OR ')})`);
            } else if (terms.length === 1) {
                queryParts.push(terms[0]);
            }
        }

        // 3. Handle Exclude (NOT)
        const notVal = document.getElementById('inp-not').value.trim();
        if (notVal) {
            const terms = parseList(notVal);
            terms.forEach(t => queryParts.push(`-${t}`));
        }

        // 4. Metadata
        const getVal = (id) => document.getElementById(id).value.trim();

        const user = getVal('inp-user');
        if (user) queryParts.push(`user:${user}`);

        const repo = getVal('inp-repo');
        if (repo) queryParts.push(`repo:${repo}`);

        const lang = getVal('inp-lang');
        if (lang) queryParts.push(`language:${lang}`);

        const ext = getVal('inp-ext');
        if (ext) queryParts.push(`extension:${ext}`);

        const stars = getVal('inp-stars');
        if (stars) queryParts.push(`stars:>=${stars}`);

        const forks = getVal('inp-forks');
        if (forks) queryParts.push(`forks:>=${forks}`);

        const path = getVal('inp-path');
        if (path) queryParts.push(`path:${path}`);

        // Construct final URL
        const finalQuery = encodeURIComponent(queryParts.join(' '));
        window.location.href = `https://github.com/search?q=${finalQuery}&type=repositories`;
    }

    // Init and Observe for Turbo/PJAX
    createUI();
    const observer = new MutationObserver(() => {
        if (!document.getElementById(TRIGGER_ID)) createUI();
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();