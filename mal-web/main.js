// ==UserScript==
// @name         Show MyAnimeList Rating
// @namespace    http://github.com/quantavil
// @version      3.7.2
// @description  Shows MAL rating on hover (desktop) and touch/tap (mobile). Features: Gold Badge (>8), Smart Caching, Color Grading.
// @author       Quantavil
// @match        *://anime.nexus/*
// @match        *://anime.uniquestream.*/*
// --- Regex Includes for Mobile Compatibility ---
// @include      /^https?:\/\/123animes\.[a-z]+\/.*$/
// @include      /^https?:\/\/9anime\.[a-z]+\/.*$/
// @include      /^https?:\/\/anicore\.[a-z]+\/.*$/
// @include      /^https?:\/\/anidap\.[a-z]+\/.*$/
// @include      /^https?:\/\/anigo\.[a-z]+\/.*$/
// @include      /^https?:\/\/anihq\.[a-z]+\/.*$/
// @include      /^https?:\/\/anikai\.[a-z]+\/.*$/
// @include      /^https?:\/\/anikototv\.[a-z]+\/.*$/
// @include      /^https?:\/\/animedefenders\.[a-z]+\/.*$/
// @include      /^https?:\/\/animegers\.[a-z]+\/.*$/
// @include      /^https?:\/\/animeheaven\.[a-z]+\/.*$/
// @include      /^https?:\/\/animekai\.[a-z]+\/.*$/
// @include      /^https?:\/\/animeland\.[a-z]+\/.*$/
// @include      /^https?:\/\/animelok\.[a-z]+\/.*$/
// @include      /^https?:\/\/animelon\.[a-z]+\/.*$/
// @include      /^https?:\/\/animenosub\.[a-z]+\/.*$/
// @include      /^https?:\/\/animepahe\.[a-z]+\/.*$/
// @include      /^https?:\/\/animestar\.[a-z]+\/.*$/
// @include      /^https?:\/\/animetsu\.[a-z]+\/.*$/
// @include      /^https?:\/\/animex\.[a-z]+\/.*$/
// @include      /^https?:\/\/animeya\.[a-z]+\/.*$/
// @include      /^https?:\/\/animeyy\.[a-z]+\/.*$/
// @include      /^https?:\/\/anitaro\.[a-z]+\/.*$/
// @include      /^https?:\/\/anitaku\.[a-z]+\/.*$/
// @include      /^https?:\/\/aniwave\.[a-z]+\/.*$/
// @include      /^https?:\/\/aniworld\.[a-z]+\/.*$/
// @include      /^https?:\/\/gogoanime\.[a-z]+\/.*$/
// @include      /^https?:\/\/hianime\.[a-z]+\/.*$/
// @include      /^https?:\/\/justanime\.[a-z]+\/.*$/
// @include      /^https?:\/\/kawaiifu\.[a-z]+\/.*$/
// @include      /^https?:\/\/kimoitv\.[a-z]+\/.*$/
// @include      /^https?:\/\/miruro\.[a-z]+\/.*$/
// @include      /^https?:\/\/ramenflix\.[a-z]+\/.*$/
// @include      /^https?:\/\/rivestream\.[a-z]+\/.*$/
// @include      /^https?:\/\/senshi\.[a-z]+\/.*$/
// @include      /^https?:\/\/wcostream\.[a-z]+\/.*$/
// @include      /^https?:\/\/yugenanime\.[a-z]+\/.*$/
//
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        CACHE_PREFIX: 'mal_v5_',
        CACHE_EXPIRY_SUCCESS: 28 * 24 * 60 * 60 * 1000, // 4 weeks
        CACHE_EXPIRY_ERROR: 24 * 60 * 60 * 1000, // 24 hours
        API_INTERVAL: 600, // Throttled to ~1.6 requests per second
        MATCH_THRESHOLD: 0.75,

        SELECTORS: {
            ITEM_CARD: `
                .flw-item, .film_list-wrap > div, .poster-card, .f-item, .aitem, .anime-item, .ep-item, .anicard,
                .bsx, .bs, .coverListItem,
                .content-card, .new-card-animate, .pe-episode-card, .news-item, .TPostMv, .gallery, .mini-previews,
                .video-block,
                .anime-card,
                .vod-item, .chart2g, .items li,
                .snap-center, [class*="MovieCardSmall"], article.group, app-anime-item
            `,
            ITEM_LINK: `
                a[href*="/series/"], a[data-discover], a[href*="/anime/info/"]
            `,
            TITLE: `
                .film-name, .dynamic-name, .film-name a,
                .title, .d-title, .anime-name, .name, .mv-namevn,
                h2, h3, h5, .content-title, .new-card-title, .pe-title, .news-item-title, .Title,
                .line-clamp-2, .line-clamp-1, .item-title,
                .charttitle2g a
            `
        }
    };

    const KEY_REGEX = /[^a-z0-9]/g;
    const processedItems = new WeakSet();

    // === Styles ===
    GM_addStyle(`
        .mal-rating-badge {
            position: absolute;
            top: 6px; right: 6px;
            background: rgba(18, 20, 32, 0.96);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #e0e0e0;
            padding: 4px 8px;
            border-radius: 6px;
            font-family: sans-serif;
            font-size: 11px;
            font-weight: 700;
            z-index: 9990;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            min-width: 40px;
            pointer-events: auto;
            transition: all 0.2s ease;
        }
        .mal-rating-badge:hover {
            transform: scale(1.05);
            background: rgba(25, 28, 45, 1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.7);
            z-index: 10000;
        }

        .mal-rating-badge .score { font-size: 13px; color: #fff; display: flex; align-items: center; gap: 2px; }
        .mal-rating-badge .score::before { content: '★'; font-size: 10px; opacity: 0.8; }
        .mal-rating-badge .members { font-size: 9px; color: #9aa0b0; font-weight: 500; }

        .mal-rating-badge.score-gold { border-color: rgba(234, 179, 8, 0.5); background: rgba(30, 25, 10, 0.95); box-shadow: 0 0 8px rgba(234, 179, 8, 0.3); }
        .mal-rating-badge.score-gold .score { color: #facc15; }
        .mal-rating-badge.score-green { border-color: rgba(74, 222, 128, 0.4); } .mal-rating-badge.score-green .score { color: #86efac; }
        .mal-rating-badge.score-orange { border-color: rgba(251, 146, 60, 0.4); } .mal-rating-badge.score-orange .score { color: #fdba74; }
        .mal-rating-badge.score-red { border-color: rgba(248, 113, 113, 0.4); } .mal-rating-badge.score-red .score { color: #fca5a5; }
        .mal-rating-badge.score-purple { border-color: rgba(192, 132, 252, 0.4); background: rgba(20, 10, 30, 0.95); } .mal-rating-badge.score-purple .score { color: #d8b4fe; }

        .mal-rating-badge.loading { pointer-events: none; padding: 4px 8px; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: normal; letter-spacing: 1px;}
        .mal-rating-badge.loading .score, .mal-rating-badge.loading .members { display: none; }

        @keyframes malPulse { from { opacity: 0.7; } to { opacity: 1; } }
    `);

    // === Helpers ===
    function cleanTitle(title) {
        return title
            .replace(/^Title:\s*/i, '')
            .replace(/(\(|\[)\s*(sub|dub|uncensored|blu-?ray|blue-ray|4k|hd|re-upload).+?(\)|\])/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractTitleFromItem(item) {
        const titleEl = item.querySelector(CONFIG.SELECTORS.TITLE);
        let title = item.getAttribute('data-title') || item.getAttribute('aria-label') || item.getAttribute('data-jp');

        if (!title && titleEl) {
            title = titleEl.getAttribute('data-jp') ||
                titleEl.getAttribute('title') ||
                titleEl.textContent ||
                titleEl.getAttribute('alt');
        }

        return title ? cleanTitle(title) : '';
    }

    function getCache(key) {
        const fullKey = CONFIG.CACHE_PREFIX + key.toLowerCase().replace(KEY_REGEX, '');
        const data = GM_getValue(fullKey);
        if (!data) return null;
        if (Date.now() - data.timestamp > data.expiryDuration) {
            GM_deleteValue(fullKey);
            return null;
        }
        return data.payload;
    }

    function setCache(key, payload) {
        if (payload.temp) return;
        const fullKey = CONFIG.CACHE_PREFIX + key.toLowerCase().replace(KEY_REGEX, '');
        const expiryDuration = payload.found ? CONFIG.CACHE_EXPIRY_SUCCESS : CONFIG.CACHE_EXPIRY_ERROR;
        GM_setValue(fullKey, { payload, timestamp: Date.now(), expiryDuration });
    }

    function jaroWinkler(s1, s2) {
        let m = 0;
        if (s1.length === 0 || s2.length === 0) return 0;
        if (s1 === s2) return 1;

        const range = Math.max(0, (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1);
        const match1 = new Array(s1.length);
        const match2 = new Array(s2.length);

        for (let i = 0; i < s1.length; i++) {
            const start = Math.max(0, i - range);
            const end = Math.min(i + range + 1, s2.length);
            for (let j = start; j < end; j++) {
                if (match2[j]) continue;
                if (s1[i] !== s2[j]) continue;
                match1[i] = true; match2[j] = true; m++; break;
            }
        }
        if (m === 0) return 0;

        let k = 0;
        let t = 0;
        for (let i = 0; i < s1.length; i++) {
            if (match1[i]) {
                while (!match2[k]) k++;
                if (s1[i] !== s2[k]) t++;
                k++;
            }
        }
        const j = ((m / s1.length) + (m / s2.length) + ((m - (t / 2)) / m)) / 3;

        let l = 0;
        while (l < 4 && l < s1.length && l < s2.length && s1[l] === s2[l]) l++;
        return j + l * 0.1 * (1 - j);
    }

    function formatMembers(num) {
        if (!num) return '0';
        return num >= 1e6 ? (num / 1e6).toFixed(1) + 'M'
            : num >= 1e3 ? (num / 1e3).toFixed(1) + 'K'
                : String(num);
    }

    function isVisualCard(item) {
        if (item.querySelector('img, picture, video, canvas')) return true;
        const rect = item.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50 && rect.width < 800) return true;
        return false;
    }

    function fetchMalData(cleanT) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanT)}&limit=8`,
                timeout: 10000,
                responseType: "json",
                onload: (res) => {
                    if (res.status === 429) {
                        resolve({ found: false, error: true, status: 429 });
                        return;
                    }
                    if (res.status !== 200) {
                        resolve({ found: false, error: true, temp: true });
                        return;
                    }

                    try {
                        const json = res.response;
                        const results = json?.data || [];

                        if (results.length === 0) {
                            resolve({ found: false });
                            return;
                        }

                        const target = cleanT.toLowerCase();
                        let bestMatch = null;
                        let bestScore = -1;

                        for (let i = 0; i < Math.min(results.length, 5); i++) {
                            const item = results[i];
                            const t1 = (item.title || '').toLowerCase();
                            const t2 = (item.title_english || '').toLowerCase();

                            if (t1 === target || t2 === target) {
                                bestMatch = item;
                                bestScore = 2.0;
                                break;
                            }

                            const s1 = jaroWinkler(target, t1);
                            const s2 = jaroWinkler(target, t2);
                            const textScore = Math.max(s1, s2);
                            const rankScore = textScore - (i * 0.03);

                            if (rankScore > bestScore) {
                                bestScore = rankScore;
                                bestMatch = item;
                            }
                        }

                        if (bestMatch && bestScore > CONFIG.MATCH_THRESHOLD) {
                            resolve({
                                found: true,
                                score: bestMatch.score || 'N/A',
                                members: formatMembers(bestMatch.members),
                                url: bestMatch.url
                            });
                        } else {
                            resolve({ found: false });
                        }
                    } catch (e) {
                        resolve({ found: false, error: true, temp: true });
                    }
                },
                onerror: () => resolve({ found: false, error: true, temp: true }),
                ontimeout: () => resolve({ found: false, error: true, temp: true })
            });
        });
    }

    // === Request Queue ===
    const requestQueue = {
        queue: [],
        jobs: new Map(),
        processing: false,
        lastRun: 0,

        add(cleanT, callback) {
            const existing = this.jobs.get(cleanT);
            if (existing) {
                existing.callbacks.push(callback);
                return;
            }
            this.jobs.set(cleanT, { cleanT, callbacks: [callback], retried: false });
            this.queue.push(cleanT);
            this.process();
        },

        async process() {
            if (this.processing) return;
            if (this.queue.length === 0) return;

            const now = Date.now();
            const timeSinceLast = now - this.lastRun;
            if (timeSinceLast < CONFIG.API_INTERVAL) {
                setTimeout(() => this.process(), CONFIG.API_INTERVAL - timeSinceLast);
                return;
            }

            this.processing = true;
            this.lastRun = Date.now();

            const key = this.queue.shift();
            const job = this.jobs.get(key);

            if (!job) {
                this.processing = false;
                this.process();
                return;
            }

            try {
                const data = await fetchMalData(job.cleanT);

                if (data.status === 429) {
                    if (!job.retried) {
                        job.retried = true;
                        this.queue.unshift(key);
                        this.processing = false;
                        setTimeout(() => this.process(), 2000);
                        return;
                    } else {
                        job.callbacks.forEach(cb => cb({ found: false, error: true, temp: true }));
                        this.jobs.delete(key);
                    }
                } else {
                    if (!data.temp) setCache(job.cleanT, data);
                    job.callbacks.forEach(cb => cb(data));
                    this.jobs.delete(key);
                }
            } catch (e) {
                console.error("[MAL-Userscript] Request Error:", e);
                job.callbacks.forEach(cb => cb({ found: false, error: true, temp: true }));
                this.jobs.delete(key);
            }

            this.processing = false;
            if (this.queue.length > 0) setTimeout(() => this.process(), 50);
        }
    };

    // === Rendering ===
    function renderBadge(container, data) {
        container.querySelectorAll('.mal-rating-badge').forEach(el => el.remove());

        if (!data.found && !data.loading) return;

        const badge = document.createElement('div');
        badge.className = 'mal-rating-badge';

        if (data.loading) {
            badge.classList.add('loading');
            badge.innerText = '•••';
            badge.style.animation = 'malPulse 0.8s infinite alternate';
        } else {
            badge.title = "View on MyAnimeList";
            badge.innerHTML = `<span class="score">${data.score}</span><span class="members">${data.members}</span>`;

            const s = parseFloat(data.score);
            if (!isNaN(s)) {
                if (s >= 8.0) badge.classList.add('score-gold');
                else if (s >= 7.0) badge.classList.add('score-green');
                else if (s >= 6.0) badge.classList.add('score-orange');
                else if (s >= 5.0) badge.classList.add('score-red');
                else badge.classList.add('score-purple');
            } else {
                badge.classList.add('score-purple');
            }

            badge.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                GM_openInTab(data.url, { active: true });
            });
        }

        // Ensure container can act as a positioning ancestor
        const computed = window.getComputedStyle(container);
        if (computed.position === 'static') {
            container.style.position = 'relative';
        }
        if (computed.display === 'inline') {
            container.style.display = 'inline-block';
        }

        // Fix for swiper-slide inner container clipping
        if (container.classList.contains('swiper-slide')) {
            container.style.overflow = 'visible';
            const inner = container.querySelector('.inner');
            if (inner) {
                inner.style.position = 'relative';
                inner.appendChild(badge);
                return;
            }
        }

        container.appendChild(badge);
    }

    // === Core Processing ===
    function processItem(item) {
        if (processedItems.has(item)) return;
        if (!isVisualCard(item)) return;

        const cleanT = extractTitleFromItem(item);
        if (!cleanT || cleanT.length < 2) return;

        processedItems.add(item);

        const cached = getCache(cleanT);
        if (cached) {
            renderBadge(item, cached);
            return;
        }

        renderBadge(item, { loading: true });

        requestQueue.add(cleanT, (data) => {
            if (!document.body.contains(item)) return;
            renderBadge(item, data);

            // Temp error: allow retry on next hover/touch
            if (data.temp) {
                processedItems.delete(item);
            }
        });
    }

    // === Auto Present (Intersection & Mutation Observers) ===
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const item = entry.target;
                processItem(item);
                observer.unobserve(item); // Only process once
            }
        });
    }, { rootMargin: '200px' });

    function observeItems(root) {
        if (!root.querySelectorAll) return;
        
        // Optimization: Query cards first
        const cards = root.querySelectorAll(CONFIG.SELECTORS.ITEM_CARD);
        cards.forEach(item => {
            if (!processedItems.has(item)) {
                observer.observe(item);
            }
        });

        // Fallback: Query links that are NOT inside cards (standalone links)
        const links = root.querySelectorAll(CONFIG.SELECTORS.ITEM_LINK);
        links.forEach(item => {
            // Check if it's already handled by being inside a card
            if (item.closest(CONFIG.SELECTORS.ITEM_CARD)) return;
            if (!processedItems.has(item)) {
                observer.observe(item);
            }
        });
    }

    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // ELEMENT_NODE
                    observeItems(node);
                }
            });
        });
    });

    // Initial run
    observeItems(document.body);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // === Menu Command ===
    GM_registerMenuCommand("🗑️ Clear Cache", () => {
        const keys = GM_listValues();
        let count = 0;
        keys.forEach(k => {
            if (k.startsWith(CONFIG.CACHE_PREFIX)) {
                GM_deleteValue(k);
                count++;
            }
        });
        console.log(`MAL Cache Cleared (${count} entries)`);
    });

})();