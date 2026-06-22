import type { Evaluation } from './types/chess';

// Debounce helper
export function debounce<T extends (...args: any[]) => any>(fn: T, wait = 150): (...args: Parameters<T>) => void {
    let t: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (t !== null) clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

export function getHumanDelay(baseDelay: number, randomDelay: number): number {
    return baseDelay + Math.floor(Math.random() * randomDelay);
}

// Helpers
export const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

export async function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        let timeoutId: ReturnType<typeof setTimeout>;
        const obs = new MutationObserver(() => {
            const el = document.querySelector(selector);
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
export function scoreFrom(obj: any): Evaluation {
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

export function scoreToDisplay(score: Evaluation | null | undefined): string {
    if (score && typeof score.mate === 'number' && score.mate !== 0) return `M${score.mate}`;
    if (score && typeof score.cp === 'number') return (score.cp / 100).toFixed(2);
    return '-';
}

export function scoreNumeric(s: Evaluation | null | undefined): number {
    if (!s) return -Infinity;
    if (typeof s.mate === 'number') return s.mate > 0 ? 100000 - s.mate : -100000 - s.mate;
    if (typeof s.cp === 'number') return s.cp;
    return -Infinity;
}
