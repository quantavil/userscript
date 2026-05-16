// ==UserScript==
// @name         Flipkart & Amazon Price Per Unit Standardizer
// @namespace    http://github.com/quantavil
// @version      3.2
// @description  Shows ₹/100g, ₹/100ml, or ₹/item in bold, large text on Flipkart & Amazon search/best-seller pages.
// @author       quantavil
// @match        https://www.flipkart.com/*
// @match        https://www.amazon.in/*
// @match        https://www.amazon.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    /* ========== HELPERS ========== */
    const cleanNumber = str => parseFloat(str.replace(/[^\d.]/g, ''));
    const fmtPrice   = p  => '₹' + p.toLocaleString('en-IN', { maximumFractionDigits: 2 });

    /** Extract all (value, unit) pairs, normalising kg→g, l→ml, gm→g */
    function extractWeights(text) {
        const results = [];
        const regex = /([\d.]+)\s*(kg|gm|g|ml|l|litre|liter)\b/gi;
        let m;
        while ((m = regex.exec(text)) !== null) {
            let val = parseFloat(m[1]);
            let unit = m[2].toLowerCase();
            if (unit === 'kg') { val *= 1000; unit = 'g'; }
            else if (unit === 'gm') { unit = 'g'; }
            else if (unit === 'l' || unit === 'litre' || unit === 'liter') { val *= 1000; unit = 'ml'; }
            results.push({ val, unit });
        }
        return results;
    }

    function computeRate(price, totalValue, unit) {
        if (totalValue > 0 && unit) {
            const per100 = (price / totalValue) * 100;
            return { text: fmtPrice(per100) + ' / 100 ' + unit, itemRate: false };
        }
        return null;
    }

    /* ========== FLIPKART ========== */
    function processFlipkartCards() {
        document.querySelectorAll('div[data-id]').forEach(card => {
            if (card.dataset.rateDone) return;
            card.dataset.rateDone = '1';

            const priceEl = card.querySelector('div.hZ3P6w');
            if (!priceEl) return;
            const price = cleanNumber(priceEl.innerText);
            if (!price || price <= 0) return;

            const qtyEl = card.querySelector('div.U_GKRr');
            const qtyText = qtyEl ? qtyEl.innerText.trim() : '';
            const titleEl = card.querySelector('a.pIpigb');
            const titleText = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent.trim()) : '';

            let totalValue = 0, unit = '', itemCount = 1;

            // 1) "X x Y Unit" or "Y Unit x X"
            let m = qtyText.match(/(\d+)\s*[x×]\s*([\d.]+)\s*(kg|gm|g|ml|l|litre|liter)\b/i);
            if (m) {
                itemCount = +m[1];
                totalValue = itemCount * parseFloat(m[2]);
                unit = m[3].toLowerCase();
            } else {
                m = qtyText.match(/([\d.]+)\s*(kg|gm|g|ml|l|litre|liter)\s*[x×]\s*(\d+)\b/i);
                if (m) {
                    itemCount = +m[3];
                    totalValue = itemCount * parseFloat(m[1]);
                    unit = m[2].toLowerCase();
                } else {
                    // 2) single weight/volume
                    m = qtyText.match(/([\d.]+)\s*(kg|gm|g|ml|l|litre|liter)\b/i);
                    if (m) {
                        totalValue = parseFloat(m[1]);
                        unit = m[2].toLowerCase();
                    } else {
                    // 3) "X Items in the set"
                    m = qtyText.match(/(\d+)\s*Items?\s*in\s*the\s*set/i);
                    if (m) {
                        itemCount = +m[1];
                        const weights = extractWeights(titleText);
                        if (weights.length === 1 && /\b(?:each|per\s*piece)\b/i.test(titleText)) {
                            totalValue = weights[0].val * itemCount;
                            unit = weights[0].unit;
                        } else if (weights.length === itemCount && weights.length > 0) {
                            const firstUnit = weights[0].unit;
                            if (weights.every(w => w.unit === firstUnit)) {
                                totalValue = weights.reduce((s, w) => s + w.val, 0);
                                unit = firstUnit;
                            } else {
                                injectRate(card, fmtPrice(price / itemCount) + ' / item', true);
                                return;
                            }
                        } else {
                            injectRate(card, fmtPrice(price / itemCount) + ' / item', true);
                            return;
                        }
                    }
                }
            }
            }

            if (totalValue > 0 && unit) {
                if (unit === 'kg') { totalValue *= 1000; unit = 'g'; }
                else if (unit === 'gm') { unit = 'g'; }
                else if (unit === 'l' || unit === 'litre' || unit === 'liter') { totalValue *= 1000; unit = 'ml'; }
                const rate = computeRate(price, totalValue, unit);
                if (rate) injectRate(card, rate.text, rate.itemRate);
            }
        });
    }

    function injectRate(card, text, isItemRate) {
        const container = card.querySelector('div.QiMO5r');
        if (container) {
            const el = document.createElement('div');
            el.style.cssText = `
                font-size: 14px; margin-top: 2px; font-weight: 700;
                ${isItemRate ? 'color: #878787;' : 'color: #2874f0;'}
            `;
            el.textContent = `(${text})`;
            container.appendChild(el);
        }
    }

    /* ========== AMAZON ========== */
    function getAmazonPrice(card) {
        // inclusive GST price (search results)
        const inclLink = card.querySelector('a.s-no-hover:not([href*="#customerReviews"])');
        if (inclLink) {
            const offscreen = inclLink.querySelector('.a-price .a-offscreen');
            if (offscreen) return cleanNumber(offscreen.textContent);
        }
        // best seller price
        const bestPrice = card.querySelector('span._cDEzb_p13n-sc-price_3mJ9Z');
        if (bestPrice) return cleanNumber(bestPrice.textContent);
        // fallback large price
        const anyPrice = card.querySelector('.a-price[data-a-size="l"] .a-offscreen');
        if (anyPrice) return cleanNumber(anyPrice.textContent);
        return null;
    }

    function getAmazonTitle(card) {
        // search results: full title is in h2 aria-label
        const h2 = card.querySelector('h2.a-size-base-plus');
        if (h2) return h2.getAttribute('aria-label') || h2.querySelector('span')?.textContent?.trim() || '';
        // best sellers title
        const bestTitle = card.querySelector('div._cDEzb_p13n-sc-css-line-clamp-3_g3dy1');
        if (bestTitle) return bestTitle.textContent.trim();
        return '';
    }

    function parseAmazonTitle(title) {
        let itemCount = 1;
        let totalValue = 0, unit = '';

        // 1) "X x Y Unit" (e.g., "2 x 50g") or "Y Unit x X" (e.g., "50g x 2")
        let multi = title.match(/(\d+)\s*[x×]\s*([\d.]+)\s*(g|gm|ml|kg|l|litre|liter)\b/i);
        if (multi) {
            itemCount = parseInt(multi[1]);
            totalValue = itemCount * parseFloat(multi[2]);
            unit = multi[3].toLowerCase();
        } else {
            multi = title.match(/([\d.]+)\s*(g|gm|ml|kg|l|litre|liter)\s*[x×]\s*(\d+)\b/i);
            if (multi) {
                itemCount = parseInt(multi[3]);
                totalValue = itemCount * parseFloat(multi[1]);
                unit = multi[2].toLowerCase();
            }
        }

        if (multi) {
            if (unit === 'kg') { totalValue *= 1000; unit = 'g'; }
            else if (unit === 'gm') { unit = 'g'; }
            else if (unit === 'l' || unit === 'litre' || unit === 'liter') { totalValue *= 1000; unit = 'ml'; }
            return { totalValue, unit, itemCount };
        }

        // 2) Detect "Pack of X", "Set of X", "X Pack", "X Count"
        let pack = title.match(/\b(?:pack|set)\s*of\s*(\d+)\b/i);
        if (pack) {
            itemCount = parseInt(pack[1]);
        } else {
            pack = title.match(/\b(\d+)\s*(?:pack|count)\b/i);
            if (pack) itemCount = parseInt(pack[1]);
        }

        const weights = extractWeights(title);
        if (weights.length === 0) return null;

        // "Each" pattern
        if (itemCount > 1 && weights.length === 1 && /\b(?:each|per\s*piece)\b/i.test(title)) {
            totalValue = weights[0].val * itemCount;
            unit = weights[0].unit;
            return { totalValue, unit, itemCount };
        }

        // single weight
        if (weights.length === 1) {
            totalValue = weights[0].val * itemCount;
            unit = weights[0].unit;
            return { totalValue, unit, itemCount };
        }

        // multiple weights – sum if all same unit, else fallback to per‑item
        const firstUnit = weights[0].unit;
        if (weights.every(w => w.unit === firstUnit)) {
            totalValue = weights.reduce((s, w) => s + w.val, 0);
            unit = firstUnit;
            return { totalValue, unit, itemCount };
        } else {
            // mixed units – per item
            return { totalValue: 0, unit: '', itemCount: itemCount || weights.length };
        }
    }

    function processAmazonCards() {
        const selectors = [
            'div[data-component-type="s-search-result"]',
            '.p13n-sc-uncoverable-faceout'
        ];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(card => {
                if (card.dataset.rateDone) return;
                card.dataset.rateDone = '1';

                const price = getAmazonPrice(card);
                if (!price) return;
                const title = getAmazonTitle(card);
                if (!title) return;
                const parsed = parseAmazonTitle(title);
                if (!parsed) return;

                if (parsed.totalValue > 0 && parsed.unit) {
                    const rate = computeRate(price, parsed.totalValue, parsed.unit);
                    if (rate) injectAmazonRate(card, rate.text, rate.itemRate);
                } else if (parsed.itemCount) {
                    const perItem = price / parsed.itemCount;
                    injectAmazonRate(card, fmtPrice(perItem) + ' / item', true);
                }
            });
        });
    }

    function injectAmazonRate(card, text, isItemRate) {
        let container = card.querySelector('div.a-row.a-size-base.a-color-base');
        if (!container) container = card.querySelector('._cDEzb_p13n-sc-price-animation-wrapper_3PzN2');
        if (container) {
            const el = document.createElement('div');
            el.style.cssText = `
                font-size: 14px; margin-top: 2px; font-weight: 700;
                ${isItemRate ? 'color: #878787;' : 'color: #2874f0;'}
            `;
            el.textContent = `(${text})`;
            container.appendChild(el);
        }
    }

    /* ========== INIT ========== */
    const isFlipkart = window.location.hostname.includes('flipkart.com');
    const isAmazon = window.location.hostname.includes('amazon.');

    function start() {
        if (isFlipkart) {
            processFlipkartCards();
            new MutationObserver(mutations => {
                if (mutations.some(m => m.addedNodes.length)) processFlipkartCards();
            }).observe(document.body, { childList: true, subtree: true });
        } else if (isAmazon) {
            processAmazonCards();
            new MutationObserver(mutations => {
                if (mutations.some(m => m.addedNodes.length)) processAmazonCards();
            }).observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();