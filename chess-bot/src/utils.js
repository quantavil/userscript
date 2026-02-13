// Debounce helper
export function debounce(fn, wait = 150) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

export function getRandomDepth(botPower) {
    const minDepth = 5;
    const maxDepth = Math.max(botPower || 10, minDepth);
    return Math.floor(Math.random() * (maxDepth - minDepth + 1)) + minDepth;
}

export function getHumanDelay(baseDelay, randomDelay) {
    return baseDelay + Math.floor(Math.random() * randomDelay);
}

// Helpers
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export async function waitForElement(selector, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const existing = qs(selector);
        if (existing) return resolve(existing);

        let timeoutId;
        const obs = new MutationObserver(() => {
            const el = qs(selector);
            if (el) {
                clearTimeout(timeoutId);
                obs.disconnect();
                resolve(el);
            }
        });

        obs.observe(document.body, { childList: true, subtree: true });
        timeoutId = setTimeout(() => {
            obs.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

// Data extraction helpers
export function scoreFrom(obj) {
    if (!obj) return {};
    if (typeof obj === 'object') {
        if ('mate' in obj && obj.mate !== 0) return { mate: parseInt(obj.mate, 10) };
        if ('cp' in obj) return { cp: parseInt(obj.cp, 10) };
    }
    if (typeof obj === 'string') {
        if (obj.toUpperCase().includes('M')) {
            const m = parseInt(obj.replace(/[^-0-9]/g, ''), 10);
            if (!isNaN(m)) return { mate: m };
        }
        const cpFloat = parseFloat(obj);
        if (!isNaN(cpFloat)) return { cp: Math.round(cpFloat * 100) };
    }
    if (typeof obj === 'number') return { cp: Math.round(obj * 100) };
    return {};
}

export function scoreToDisplay(score) {
    if (score && typeof score.mate === 'number' && score.mate !== 0) return `M${score.mate}`;
    if (score && typeof score.cp === 'number') return (score.cp / 100).toFixed(2);
    return '-';
}

export function scoreNumeric(s) {
    if (!s) return -Infinity;
    if (typeof s.mate === 'number') return s.mate > 0 ? 100000 - s.mate : -100000 - s.mate;
    if (typeof s.cp === 'number') return s.cp;
    return -Infinity;
}

