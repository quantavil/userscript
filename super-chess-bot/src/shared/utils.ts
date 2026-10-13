import type { Evaluation } from '../chess/types.js';

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Run a pending trailing call immediately. */
  flush(): void;
  /** Drop a pending trailing call without running it. */
  cancel(): void;
}

/** Trailing-edge debounce. */
export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, wait = 150): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Args | null = null;

  const run = (): void => {
    timer = null;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };

  const debounced = ((...args: Args) => {
    pending = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(run, wait);
  }) as Debounced<Args>;

  debounced.flush = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    run();
  };

  debounced.cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  return debounced;
}

/** `+M3` / `-M3`. A negative distance mates the side to move; `mate: 0` is a real score. */
export function mateToDisplay(mate: number): string {
  return `${mate < 0 ? '-' : '+'}M${Math.abs(mate)}`;
}

export function scoreToDisplay(score: Evaluation | null | undefined): string {
  if (typeof score?.mate === 'number' && Number.isFinite(score.mate)) return mateToDisplay(score.mate);
  if (typeof score?.cp === 'number') return `${score.cp > 0 ? '+' : ''}${(score.cp / 100).toFixed(2)}`;
  return '-';
}
