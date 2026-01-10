// ==UserScript==
// @name         MAL Rating Hover Provider
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Shows MAL rating on hover. Click to visit MAL. Cross-site per-anime caching (14 days). Rate-limit safe.
// @author       Quantavil
// @match        *://hianime.to/*
// @match        *://*.animekai.la/*
// @match        *://animekai.to/*
// @match        *://animekai.im/*
// @match        *://animekai.nl/*
// @match        *://animekai.vc/*
// @match        *://anikai.to/*
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
        FUZZY_THRESHOLD: 0.7, // Minimum similarity score (0-1) to accept a match
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
            this.queue.push({ title, callback, retries: 0 });
            this.process();
        },
        async process() {
            if (this.processing || this.queue.length === 0) return;
            this.processing = true;

            const job = this.queue.shift();
            const { title, callback, retries } = job;

            try {
                const data = await getMalData(title);

                // 429 Retry Strategy (Max 1 retry)
                if (data && data.status === 429) {
                    if (retries < 1) {
                        console.warn(`[MAL-Hover] 429 Rate Limit. Backing off... Retry ${retries + 1}/1`);
                        job.retries++;
                        this.queue.unshift(job); // Return to queue with incremented retry
                        setTimeout(() => {
                            this.processing = false;
                            this.process();
                        }, 2500); // Backoff wait
                        return;
                    } else {
                        console.error(`[MAL-Hover] 429 Rate Limit. Max retries exceeded.`);
                        callback({ error: true, score: '429' });
                    }
                } else {
                    callback(data);
                }
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

    // Levenshtein distance for fuzzy matching
    function getSimilarity(s1, s2) {
        let longer = s1.length > s2.length ? s1 : s2;
        let shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1.0;

        let costs = new Array();
        for (let i = 0; i <= longer.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= shorter.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[shorter.length] = lastValue;
        }
        return (longer.length - costs[shorter.length]) / parseFloat(longer.length);
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
            // Request top 3 results for fuzzy matching
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanT)}&limit=3`);

            if (res.status === 429) return { status: 429 }; // Return status for handling

            const json = await res.json();
            const results = json.data || [];

            let bestMatch = null;
            let highestScore = 0;

            if (results.length > 0) {
                // Find best match among the top 3
                results.forEach(item => {
                    const sim1 = getSimilarity(cleanT.toLowerCase(), (item.title || '').toLowerCase());
                    const sim2 = getSimilarity(cleanT.toLowerCase(), (item.title_english || '').toLowerCase());
                    const score = Math.max(sim1, sim2);

                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = item;
                    }
                });

                // Fail-safe: If no decent match found, but we have results, fallback to first ONLY if very disparate?
                // For now, if best score is really bad, might be better to show nothing or first result?
                // Let's stick to simply picking the best score, defaulting to first if all equal (0)
                if (!bestMatch) bestMatch = results[0];
            }

            const result = bestMatch ? {
                found: true,
                score: bestMatch.score || 'N/A',
                members: formatMembers(bestMatch.members),
                url: bestMatch.url,
                matchScore: highestScore // Debug info
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