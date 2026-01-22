// ==UserScript==
// @name         MAL Rating Hover Provider (Wildcard Edition)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Shows MAL rating on hover (desktop) or long-press (mobile). Includes fixes for bubbling, double-taps, and false positives.
// @author       Quantavil (Fixed)

// --- Domain Wildcards (Matches any extension like .to, .ru, .com) ---
// @match        *://hianime.*/*
// @match        *://anitaro.*/*
// @match        *://animovitch.*/*
// @match        *://animekai.*/*
// @match        *://anikai.*/*
// @match        *://anikototv.*/*
// @match        *://gogoanime.*/*
// @match        *://anigo.*/*
// @match        *://9anime.*/*
// @match        *://animenosub.*/*
// @match        *://kawaiifu.*/*
// @match        *://aniworld.*/*
// @match        *://yugenanime.*/*
// @match        *://animepahe.*/*
// @match        *://kimoitv.*/*
// @match        *://anime.uniquestream.*/*
// @match        *://wcostream.*/*
// @match        *://ramenflix.*/*
// @match        *://animeyy.*/*
// @match        *://animeland.*/*
// @match        *://animelon.*/*
// @match        *://123animes.*/*
// @match        *://animetsu.*/*
// @match        *://aniwave.*/*
// @match        *://zoro.*/*

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
        CACHE_EXPIRY: 14 * 24 * 60 * 60 * 1000, // 14 Days
        DEBOUNCE_DELAY: 400, // Desktop hover delay
        LONG_PRESS_DELAY: 600, // Mobile long press delay
        API_INTERVAL: 350,   // Safe interval for Jikan API
        MATCH_THRESHOLD: 0.6, // 60% similarity required to show result
        SELECTORS: {
            ITEM: `
                .flw-item, .film_list-wrap > div, .poster-card, .f-item, .aitem, .anime-item, .ep-item, .anicard,
                .bsx, .bs, .item, .coverListItem,
                .content-card, .new-card-animate, .pe-episode-card, .news-item, .TPostMv, .gallery, .mini-previews,
                .video-block, .card
            `,
            TITLE: `
                .film-name, .dynamic-name, .film-name a,
                .title, .d-title, .anime-name, .name, .mv-namevn,
                h2, h3, h3.title, .content-title, .new-card-title, .pe-title, .news-item-title, .Title
            `
        }
    };

    let hoverTimeout;
    let longPressTimeout;
    let isTouchInteraction = false;

    // === Request Queue (Prevents 429 Rate Limits) ===
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
                        console.warn(`[MAL-Hover] Rate Limit Hit. Pausing...`);
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

    // === CSS Styles ===
    GM_addStyle(`
        .mal-container-rel { position: relative !important; }
        
        .mal-rating-badge {
            position: absolute;
            top: 6px; right: 6px;
            background: rgba(18, 20, 32, 0.94);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #e0e0e0;
            padding: 5px 9px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            font-weight: 700;
            z-index: 999999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            min-width: 44px;
            opacity: 0;
            transform: translateY(-4px) translateZ(0);
            animation: malFadeIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            line-height: 1.3;
            transition: all 0.2s ease;
            pointer-events: auto;
            user-select: none;
        }

        .mal-rating-badge:hover, .mal-rating-badge.mobile-active {
            transform: translateY(0) scale(1.05) translateZ(0);
            background: rgba(22, 25, 40, 1);
            box-shadow: 0 8px 20px rgba(0,0,0,0.6);
            z-index: 1000000;
        }

        .mal-rating-badge .score { 
            font-size: 13px; color: #fff; letter-spacing: 0.5px; display: flex; align-items: center; gap: 3px;
        }
        .mal-rating-badge .score::before { content: '★'; font-size: 10px; opacity: 0.8; }
        .mal-rating-badge .members { font-size: 9px; color: #9aa0b0; font-weight: 500; }

        .mal-rating-badge.high-score { border-color: rgba(74, 222, 128, 0.4); }
        .mal-rating-badge.high-score .score { color: #86efac; } .mal-rating-badge.high-score .score::before { color: #4ade80; }

        .mal-rating-badge.mid-score { border-color: rgba(250, 204, 21, 0.4); }
        .mal-rating-badge.mid-score .score { color: #fde047; } .mal-rating-badge.mid-score .score::before { color: #facc15; }

        .mal-rating-badge.low-score { border-color: rgba(248, 113, 113, 0.4); }
        .mal-rating-badge.low-score .score { color: #fca5a5; } .mal-rating-badge.low-score .score::before { color: #f87171; }

        .mal-rating-badge.loading { background: rgba(0, 0, 0, 0.85); min-width: unset; padding: 6px 10px; }
        .mal-rating-badge.error { background: rgba(220, 38, 38, 0.9); border-color: rgba(255, 100, 100, 0.3); color: white; }

        @media (pointer: coarse) { .mal-rating-badge { padding: 7px 11px; top: 8px; right: 8px; } }
        @keyframes malFadeIn { to { opacity: 1; transform: translateY(0) translateZ(0); } }
        @keyframes malPulse { from { opacity: 0.5; } to { opacity: 1; } }
    `);

    // === Logic Helper Functions ===
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
            .replace(/(\(|\[)\s*(sub|dub|uncensored|tv|bd|blu-ray|4k|hd|special|ova|ona|complete).+?(\)|\])/gi, '')
            .replace(/[-:]\s*season\s*\d+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // === API Handler ===
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

                    // [BUG FIX]: Added Threshold check > 0.6
                    if (score > highestScore && score > CONFIG.MATCH_THRESHOLD) {
                        highestScore = score;
                        bestMatch = item;
                    }
                });
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

    // === Render Logic ===
    function renderBadge(container, data) {
        const existing = container.querySelector('.mal-rating-badge');
        if (existing) existing.remove();

        const badge = document.createElement('div');
        badge.className = 'mal-rating-badge';
        if (isTouchInteraction) badge.classList.add('mobile-active');

        if (data.loading) {
            badge.classList.add('loading');
            badge.innerText = '• • •';
            badge.style.animation = 'malPulse 0.8s infinite alternate';
        } else if (data.found) {
            badge.title = "Click to open MAL";
            badge.innerHTML = `<span class="score">${data.score}</span><span class="members">${data.members}</span>`;
            
            const numScore = parseFloat(data.score);
            if (!isNaN(numScore)) {
                if (numScore >= 7.5) badge.classList.add('high-score');
                else if (numScore >= 6.0) badge.classList.add('mid-score');
                else badge.classList.add('low-score');
            }

            const linkHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                GM_openInTab(data.url, { active: true });
            };
            
            // [BUG FIX]: Removed touchend to prevent double-tap opening
            badge.addEventListener('click', linkHandler);

        } else {
            badge.classList.add('error');
            badge.innerText = '?';
        }

        if (window.getComputedStyle(container).position === 'static') {
             container.classList.add('mal-container-rel');
        }

        if (!data.loading) badge.style.animation = '';
        container.appendChild(badge);
    }

    function processItem(item) {
        const titleEl = item.querySelector(CONFIG.SELECTORS.TITLE);
        let title = item.getAttribute('data-title') || item.getAttribute('aria-label');
        if (!title && titleEl) {
            title = titleEl.getAttribute('title') || titleEl.innerText || titleEl.getAttribute('alt');
        }

        if (!title) return;
        if (item.querySelector('.mal-rating-badge:not(.loading):not(.error)')) return;

        const interactionId = Date.now() + Math.random().toString();
        item.dataset.malInteraction = interactionId;

        renderBadge(item, { loading: true });

        requestQueue.add(title, (data) => {
            if (document.body.contains(item) && item.dataset.malInteraction === interactionId) {
                renderBadge(item, data);
            }
        });
    }

    // === Event Listeners ===

    document.body.addEventListener('mouseover', function (e) {
        if (isTouchInteraction) return;

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
            // [BUG FIX]: Check relatedTarget. If moving to child (e.g., image), do NOT remove.
            if (item.contains(e.relatedTarget)) return;

            clearTimeout(hoverTimeout);
            const badge = item.querySelector('.mal-rating-badge.loading');
            if (badge) {
                badge.remove();
                item.removeAttribute('data-malInteraction');
            }
        }
    });

    // Mobile Logic
    let touchStartX = 0;
    let touchStartY = 0;

    document.body.addEventListener('touchstart', (e) => {
        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (!item) return;

        isTouchInteraction = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        longPressTimeout = setTimeout(() => {
            processItem(item);
            if (navigator.vibrate) navigator.vibrate(40);
        }, CONFIG.LONG_PRESS_DELAY);

    }, { passive: true });

    document.body.addEventListener('touchmove', (e) => {
        if (!longPressTimeout) return;
        const moveX = Math.abs(e.touches[0].clientX - touchStartX);
        const moveY = Math.abs(e.touches[0].clientY - touchStartY);
        if (moveX > 15 || moveY > 15) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
    }, { passive: true });

    document.body.addEventListener('touchend', (e) => {
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
        setTimeout(() => { isTouchInteraction = false; }, 600);
    });

    document.body.addEventListener('contextmenu', (e) => {
        const item = e.target.closest(CONFIG.SELECTORS.ITEM);
        if (item && isTouchInteraction) {
            e.preventDefault();
        }
    });

})();