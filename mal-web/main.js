// ==UserScript==
// @name         MAL Rating Hover Provider
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Shows MAL rating on hover (desktop) or long-press (mobile). Click to visit MAL. Cross-site per-anime caching (14 days). Rate-limit safe.
// @author       Quantavil
// @match        *://hianime.to/*
// @match        *://hianime.do/*
// @match        *://*.animekai.la/*
// @match        *://animekai.to/*
// @match        *://animekai.im/*
// @match        *://animekai.nl/*
// @match        *://animekai.vc/*
// @match        *://anikai.to/*
// @match        *://anikototv.to/*
// @match        *://animetsu.bz/*
// @match        *://yugenanime.tv/*
// @match        *://anigo.to/*
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
        DEBOUNCE_DELAY: 400, // Hover delay
        LONG_PRESS_DELAY: 600, // Mobile long press delay
        API_INTERVAL: 350,   // Jikan safe interval
        SELECTORS: {
            ITEM: '.aitem, .flw-item, .anime-item, .poster-card, .film_list-wrap > div, .ep-item, .f-item, .anicard',
            TITLE: '.title, .film-name, .anime-name, .name, .d-title, h3.title, .dynamic-name'
        }
    };

    let hoverTimeout;
    let longPressTimeout;
    let isTouchInteraction = false;

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

                if (data && data.status === 429) {
                    if (retries < 1) {
                        console.warn(`[MAL-Hover] 429 Rate Limit. Retrying...`);
                        job.retries++;
                        this.queue.unshift(job);
                        setTimeout(() => {
                            this.processing = false;
                            this.process();
                        }, 2500);
                        return;
                    } else {
                        callback({ error: true, score: '429' });
                    }
                } else {
                    callback(data);
                }
            } catch (e) {
                console.error(e);
                callback({ error: true });
            }

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
            background: rgba(18, 20, 32, 0.92);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e0e0e0;
            padding: 5px 8px;
            border-radius: 6px;
            font-family: 'Segoe UI', system-ui, sans-serif;
            font-size: 11px;
            font-weight: 600;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            min-width: 42px;
            opacity: 0;
            transform: translateY(-2px);
            animation: malFadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            line-height: 1.25;
            transition: all 0.2s ease;
            pointer-events: auto;
        }
        .mal-rating-badge:hover, .mal-rating-badge.mobile-active {
            transform: translateY(0) scale(1.02);
            background: rgba(25, 28, 45, 0.98);
            border-color: rgba(46, 81, 162, 0.4);
            box-shadow: 0 6px 16px rgba(46, 81, 162, 0.25);
        }
        .mal-rating-badge .score { 
            font-size: 13px; 
            color: #fff;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 3px;
        }
        .mal-rating-badge .score::before {
            content: '★';
            color: #ffd700;
            font-size: 11px;
        }
        .mal-rating-badge .members { 
            font-size: 9px; 
            color: #9aa0b0; 
            margin-top: 1px;
        }
        .mal-rating-badge.loading {
            background: rgba(0, 0, 0, 0.7);
            min-width: unset;
            padding: 4px 8px;
        }
        .mal-rating-badge.error { 
            background: rgba(220, 38, 38, 0.9); 
            border-color: rgba(255, 100, 100, 0.3);
            color: white;
        }
        @keyframes malFadeIn { 
            to { opacity: 1; transform: translateY(0); } 
        }
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
        return num >= 1e6 ? (num / 1e6).toFixed(1) + 'M' : num >= 1e3 ? (num / 1e3).toFixed(1) + 'K' : num;
    }

    function getSimilarity(s1, s2) {
        const len1 = s1.length, len2 = s2.length;
        const maxDist = Math.max(len1, len2);
        if (len1 === 0 || len2 === 0) return maxDist === 0 ? 1 : 0;

        const row = Array(len1 + 1).fill(0).map((_, i) => i);
        for (let i = 1; i <= len2; i++) {
            let prev = i;
            for (let j = 1; j <= len1; j++) {
                const val = (s2[i - 1] === s1[j - 1]) ? row[j - 1] : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
                row[j - 1] = prev;
                prev = val;
            }
            row[len1] = prev;
        }
        return 1 - (row[len1] / maxDist);
    }

    function cleanTitle(title) {
        return title
            .replace(/(\(|\[)\s*(sub|dub|uncensored|tv|bd|blu-ray|4k|hd|special|ova|ona).+?(\)|\])/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function getMalData(rawTitle) {
        const cleanT = cleanTitle(rawTitle);
        const cacheKey = cleanT.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cached = getCache(cacheKey);

        if (cached) return cached;

        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanT)}&limit=5`);
            if (res.status === 429) return { status: 429 };

            const json = await res.json();
            const results = json.data || [];

            let bestMatch = null;
            let highestScore = 0;

            if (results.length > 0) {
                results.forEach(item => {
                    const sim1 = getSimilarity(cleanT.toLowerCase(), (item.title || '').toLowerCase());
                    const sim2 = getSimilarity(cleanT.toLowerCase(), (item.title_english || '').toLowerCase());
                    const score = Math.max(sim1, sim2);

                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = item;
                    }
                });

                // Fallback: If no high match but results exist, take the first one if it's "close enough" logic allows
                if (!bestMatch && results.length > 0) bestMatch = results[0];
            }

            const result = bestMatch ? {
                found: true,
                score: bestMatch.score || 'N/A',
                members: formatMembers(bestMatch.members),
                url: bestMatch.url,
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
        if (isTouchInteraction) badge.classList.add('mobile-active');

        if (data.loading) {
            badge.classList.add('loading');
            badge.innerText = '• • •';
            // Scale animation for loading
            badge.style.animation = 'malPulse 1s infinite alternate';
        } else if (data.found) {
            badge.title = "View on MAL";
            badge.innerHTML = `<span class="score">${data.score}</span><span class="members">${data.members}</span>`;

            // Interaction
            const linkHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                GM_openInTab(data.url, { active: true });
            };
            badge.addEventListener('click', linkHandler);
            badge.addEventListener('touchend', linkHandler);

        } else {
            badge.classList.add('error');
            badge.innerText = 'N/A';
        }

        if (!container.classList.contains('mal-container-rel')) {
            container.classList.add('mal-container-rel');
        }

        // Remove ANY existing animation style from loading before appending final
        if (!data.loading) badge.style.animation = '';

        container.appendChild(badge);
    }

    function processItem(item) {
        const titleEl = item.querySelector(CONFIG.SELECTORS.TITLE);
        const title = item.getAttribute('data-title') ||
            item.getAttribute('aria-label') ||
            (titleEl ? (titleEl.getAttribute('title') || titleEl.innerText || titleEl.getAttribute('alt')) : null);

        if (!title) return;

        // Prevent Duplicate Requests for same item interaction
        if (item.querySelector('.mal-rating-badge:not(.loading):not(.error)')) return;

        // Unique ID for this specific interaction instance
        const interactionId = Date.now() + Math.random().toString();
        item.dataset.malInteraction = interactionId;

        renderBadge(item, { loading: true });

        requestQueue.add(title, (data) => {
            if (document.body.contains(item) && item.dataset.malInteraction === interactionId) {
                renderBadge(item, data);
            }
        });
    }

    // === Event Handling ===

    // Desktop: Hover
    document.body.addEventListener('mouseover', function (e) {
        if (isTouchInteraction) return; // Ignore mouse events if touch is active

        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (!item) return;

        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            processItem(item);
        }, CONFIG.DEBOUNCE_DELAY);
    });

    document.body.addEventListener('mouseout', (e) => {
        if (isTouchInteraction) return;

        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (item) {
            clearTimeout(hoverTimeout);
            item.removeAttribute('data-malInteraction');
            const badge = item.querySelector('.mal-rating-badge.loading');
            if (badge) badge.remove();
        }
    });

    // Mobile: Touch / Long Press
    let touchStartX = 0;
    let touchStartY = 0;

    document.body.addEventListener('touchstart', (e) => {
        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (!item) return;

        isTouchInteraction = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        longPressTimeout = setTimeout(() => {
            // Check if user has moved too much finger (handled in move, but safely here)
            processItem(item);
            // Vibrate to indicate success
            if (navigator.vibrate) navigator.vibrate(50);
        }, CONFIG.LONG_PRESS_DELAY);

    }, { passive: true });

    document.body.addEventListener('touchmove', (e) => {
        if (!longPressTimeout) return;

        // Calculate move distance
        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
        const moveY = Math.abs(e.touches[0].clientY - touchStartY);

        // Tolerance for slight finger movement
        if (moveX > 10 || moveY > 10) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
    }, { passive: true });

    document.body.addEventListener('touchend', (e) => {
        if (longPressTimeout) {
            // Released before long press finished -> It's a click
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }

        // Reset touch flag after a delay to allow mixed usage
        setTimeout(() => { isTouchInteraction = false; }, 500);
    });

    // Prevent context menu on long press for items
    document.body.addEventListener('contextmenu', (e) => {
        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (item && isTouchInteraction) {
            // Only prevent if we actually triggered logic? 
            // Better UX: let context menu happen if we didn't show badge yet, 
            // OR prevent it so badge is the primary long-press action.
            // Let's prevent it to feel "native".
            e.preventDefault();
        }
    });

})();