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

export function scoreToDisplay(score: Evaluation | null | undefined): string {
  if (typeof score?.mate === 'number' && score.mate !== 0) return `M${score.mate}`;
  if (typeof score?.cp === 'number') return (score.cp / 100).toFixed(2);
  return '-';
}
