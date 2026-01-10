// ==UserScript==
// @name         MAL Rating Hover Provider
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Shows MAL rating on hover. Click to visit MAL. Cross-site per-anime caching (14 days). Rate-limit safe.
// @author       Quantavil
// @match        *://hianime.to/*
// @match        *://*.animekai.la/*
// @match        *://anikototv.to/*
// @match        *://animetsu.bz/*
// @match        *://yugenanime.tv/*
// @match        *://animepahe.ru/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        CACHE_PREFIX: 'mal_v3_',
        CACHE_EXPIRY: 14 * 24 * 60 * 60 * 1000,
        DEBOUNCE_DELAY: 400, // UX delay before requesting
        API_INTERVAL: 350,   // Minimum ms between API calls (Jikan limit)
        SELECTORS: {
            ITEM: '.aitem, .flw-item, .anime-item, .poster-card, .film_list-wrap > div, .ep-item',
            TITLE: '.title, .film-name, .anime-name, .name, .d-title, h3.title, .dynamic-name'
        }
    };

    let hoverTimeout;

    // === Request Queue (Rate Limit Handling) ===
    const requestQueue = {
        queue: [],
        processing: false,
        add(title, callback) {
            this.queue.push({ title, callback });
            this.process();
        },
        async process() {
            if (this.processing || this.queue.length === 0) return;
            this.processing = true;

            const { title, callback } = this.queue.shift();

            try {
                const data = await getMalData(title);

                // 429 Retry Strategy
                if (data && data.status === 429) {
                    console.warn(`[MAL-Hover] 429 Rate Limit. Backing off...`);
                    this.queue.unshift({ title, callback }); // Return to queue
                    setTimeout(() => {
                        this.processing = false;
                        this.process();
                    }, 2000); // Wait 2s before retrying
                    return;
                }

                callback(data);
            } catch (e) {
                console.error(e);
                callback({ error: true });
            }

            // Standard Jikan rate limit compliance
            setTimeout(() => {
                this.processing = false;
                this.process();
            }, CONFIG.API_INTERVAL);
        }
    };

    // === CSS ===
    GM_addStyle(`
        .mal-container-rel { position: relative !important; }
        .mal-rating-badge {
            position: absolute;
            top: 6px; right: 6px;
            background: rgba(46, 81, 162, 0.95);
            backdrop-filter: blur(4px);
            color: #fff;
            padding: 4px 6px;
            border-radius: 4px;
            font-family: sans-serif;
            font-size: 11px;
            font-weight: 700;
            z-index: 99999;
            box-shadow: 0 2px 5px rgba(0,0,0,0.7);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            min-width: 40px;
            opacity: 0;
            animation: malFadeIn 0.2s forwards;
            line-height: 1.2;
            transition: transform 0.1s ease;
        }
        .mal-rating-badge:hover { transform: scale(1.05); background: #2e51a2; }
        .mal-rating-badge.loading {
            background: rgba(0, 0, 0, 0.6);
            min-width: auto;
            pointer-events: none;
        }
        .mal-rating-badge.error { background: rgba(160, 0, 0, 0.9); pointer-events: none; }
        .mal-rating-badge .score { font-size: 13px; text-shadow: 1px 1px 0 #000; }
        .mal-rating-badge .members { font-size: 9px; opacity: 0.9; font-weight: 400; }
        @keyframes malFadeIn { to { opacity: 1; } }
    `);

    // === Logic ===
    function getCache(key) {
        const data = GM_getValue(CONFIG.CACHE_PREFIX + key);
        return (data && Date.now() - data.timestamp < CONFIG.CACHE_EXPIRY) ? data.payload : null;
    }

    function setCache(key, payload) {
        GM_setValue(CONFIG.CACHE_PREFIX + key, { payload, timestamp: Date.now() });
    }

    function formatMembers(num) {
        if (!num) return '0';
        return num >= 1e6 ? (num / 1e6).toFixed(1) + 'M' : num >= 1e3 ? (num / 1e3).toFixed(1) + 'k' : num;
    }

    function cleanTitle(title) {
        // Removes common suffixes that break Jikan search (e.g., "One Piece (Sub)", "Naruto [Dub]")
        // REMOVE AGGRESSIVE SEASON CLEANING to avoid "Season 2" -> "Season 1" mismatch
        return title
            .replace(/(\(|\[)\s*(sub|dub|uncensored|tv|bd|blu-ray|4k).+?(\)|\])/gi, '')
            .trim();
    }

    async function getMalData(rawTitle) {
        const cleanT = cleanTitle(rawTitle);
        // BETTER CACHE KEY: Don't strip special chars completely to avoid collisions (e.g. Re:Zero vs ReZero)
        // Just lower case and simple safe replacement
        const cacheKey = cleanT.toLowerCase().trim();
        const cached = getCache(cacheKey);

        if (cached) return cached;

        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanT)}&limit=1`);

            if (res.status === 429) return { status: 429 }; // Return status for handling

            const json = await res.json();
            const data = json.data && json.data.length > 0 ? json.data[0] : null;

            const result = data ? {
                found: true,
                score: data.score || 'N/A',
                members: formatMembers(data.members),
                url: data.url
            } : { found: false };

            setCache(cacheKey, result);
            return result;
        } catch (e) {
            return { error: true };
        }
    }

    function renderBadge(container, data) {
        const existing = container.querySelector('.mal-rating-badge');
        if (existing) existing.remove();

        const badge = document.createElement('div');
        badge.className = 'mal-rating-badge';

        if (data.loading) {
            badge.classList.add('loading');
            badge.innerText = '...';
        } else if (data.found) {
            badge.title = "View on MAL";
            badge.innerHTML = `<span class="score">★ ${data.score}</span><span class="members">${data.members}</span>`;
            badge.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                GM_openInTab(data.url, { active: true });
            });
        } else {
            badge.classList.add('error');
            badge.innerText = data.error ? (data.score || 'Err') : 'NA';
        }

        // Optimization: Check class rather than computed style
        if (!container.classList.contains('mal-container-rel')) {
            container.classList.add('mal-container-rel');
        }
        container.appendChild(badge);
    }

    // === Events ===
    document.body.addEventListener('mouseover', function (e) {
        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (!item) return;

        // Prevent race condition: If hovering same item, do nothing if already processing/loaded
        // If switching items, clear previous timeout

        // UNIQUE HOVER ID for race condition handling
        const currentHoverId = Date.now() + Math.random().toString();
        item.dataset.malHoverId = currentHoverId;

        clearTimeout(hoverTimeout);

        // Don't re-render valid badges (if fully loaded)
        if (item.querySelector('.mal-rating-badge:not(.loading):not(.error)')) return;

        hoverTimeout = setTimeout(() => {
            // Re-check race condition: is this still the active item?
            if (item.dataset.malHoverId !== currentHoverId) return;

            const titleEl = item.querySelector(CONFIG.SELECTORS.TITLE);
            // FALLBACK SELECTORS
            const title = item.getAttribute('data-title') ||
                item.getAttribute('aria-label') ||
                (titleEl ? (titleEl.getAttribute('title') || titleEl.innerText || titleEl.getAttribute('alt')) : null);

            if (!title) return;

            renderBadge(item, { loading: true });

            requestQueue.add(title, (data) => {
                // FINAL RACE CONDITION CHECK:
                // Ensure the item still exists and matches the hover ID of the request
                if (document.body.contains(item) && item.dataset.malHoverId === currentHoverId) {
                    renderBadge(item, data);
                }
            });
        }, CONFIG.DEBOUNCE_DELAY);
    });

    document.body.addEventListener('mouseout', (e) => {
        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (item) {
            clearTimeout(hoverTimeout);
            // Invalidate the hover session so pending callbacks don't render
            item.removeAttribute('data-malHoverId');

            const badge = item.querySelector('.mal-rating-badge.loading');
            if (badge) badge.remove();
        }
    });

})();