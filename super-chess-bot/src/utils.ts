import type { Evaluation } from './types/chess';

// Debounce helper
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait = 150): (...args: Args) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (t !== null) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Helpers
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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

export function scoreToDisplay(score: Evaluation | null | undefined): string {
  if (typeof score?.mate === 'number' && score.mate !== 0) return `M${score.mate}`;
  if (typeof score?.cp === 'number') return (score.cp / 100).toFixed(2);
  return '-';
}
