import { DEFAULT_FILTER } from './parse';
import type { FilterState } from './types';

const STORAGE_KEY = 'better_rule34_console_v2';

export const RATING_PRESETS = [0, 50, 60, 70, 75, 80, 85, 90, 95] as const;
export const VIEWS_PRESETS = [
  0,
  1_000,
  5_000,
  10_000,
  25_000,
  50_000,
  75_000,
  100_000,
  250_000,
  500_000,
] as const;

export function ratingLabel(min: number): string {
  return min > 0 ? `${min}%+` : 'Any';
}

export function viewsLabel(min: number): string {
  if (min <= 0) return 'Any';
  if (min >= 1_000_000) return `${min / 1_000_000}M+`;
  return `${min / 1_000}K+`;
}

/** The preset closest to `value`, so values saved by older builds snap instead of resetting. */
export function nearestPreset(value: number, presets: readonly number[]): number {
  let best = presets[0];
  for (const p of presets) if (Math.abs(p - value) < Math.abs(best - value)) best = p;
  return best;
}

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Reads the saved choices. Anything unreadable means "Any". */
export function loadFilter(raw: string | null): FilterState {
  let saved: { minRating?: unknown; minViews?: unknown } = {};
  try {
    saved = (raw ? JSON.parse(raw) : null) ?? {};
  } catch {
    saved = {};
  }
  const rating = Math.min(100, Math.max(0, finiteOr(saved.minRating, 0)));
  const views = Math.max(0, finiteOr(saved.minViews, 0));
  return {
    minRating: nearestPreset(rating, RATING_PRESETS),
    minViews: nearestPreset(views, VIEWS_PRESETS),
  };
}

type Kind = 'rating' | 'views';

function pill(kind: Kind, value: number, label: string): string {
  return `<button type="button" class="fs-opt radio" aria-pressed="false" data-br34-kind="${kind}" data-br34-value="${value}">${label}</button>`;
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Min rating and min views, as two rows of pills inside the site's ALL FILTERS sheet.
 * They use the site's own pill classes, so they look like Date and Duration.
 * Filtering runs in the browser on the cards already loaded.
 */
export class SheetFilter {
  private readonly root: HTMLElement;
  private readonly count: HTMLElement;
  private filter: FilterState;

  constructor(private readonly onChange: (filter: FilterState) => void) {
    this.filter = loadFilter(readStorage());
    this.root = document.createElement('div');
    this.root.className = 'br34-root';
    this.root.innerHTML = `
      <div class="fs-sec">
        <div class="fs-sec__h"><h3>Min rating</h3><span class="fs-right fs-hint" data-out="rating"></span></div>
        <div class="fs-opts" role="group" aria-label="Minimum rating">
          ${RATING_PRESETS.map((v) => pill('rating', v, ratingLabel(v))).join('')}
        </div>
      </div>
      <div class="fs-sec">
        <div class="fs-sec__h"><h3>Min views</h3><span class="fs-right fs-hint" data-out="views"></span></div>
        <div class="fs-opts" role="group" aria-label="Minimum views">
          ${VIEWS_PRESETS.map((v) => pill('views', v, viewsLabel(v))).join('')}
        </div>
        <p class="fs-hint br34-count"></p>
      </div>`;
    this.count = this.root.querySelector<HTMLElement>('.br34-count')!;
    this.root.addEventListener('click', this.onPillClick);
    this.paint();
  }

  getFilter(): FilterState {
    return { ...this.filter };
  }

  /** Puts the controls at the end of the sheet body. Safe to call again after the site re-renders. */
  mount(body: HTMLElement): void {
    if (this.root.parentElement !== body) body.append(this.root);
  }

  /** Clear all in the sheet. */
  reset(): void {
    this.filter = { ...DEFAULT_FILTER };
    this.commit();
  }

  setCount(visible: number, total: number): void {
    this.count.textContent = `${visible} of ${total} loaded videos shown`;
  }

  private readonly onPillClick = (e: Event): void => {
    const pillEl = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-br34-kind]') : null;
    if (!pillEl) return;
    // The pills reuse the site's classes. Stop the event here so the site's own handlers ignore them.
    e.stopPropagation();
    const value = Number(pillEl.dataset.br34Value);
    if (pillEl.dataset.br34Kind === 'rating') this.filter.minRating = value;
    else this.filter.minViews = value;
    this.commit();
  };

  private commit(): void {
    this.paint();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.filter));
    } catch {
      // Private mode or full storage: the choice lasts until the page closes.
    }
    this.onChange({ ...this.filter });
  }

  private paint(): void {
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('[data-br34-kind]')) {
      const current = btn.dataset.br34Kind === 'rating' ? this.filter.minRating : this.filter.minViews;
      const on = Number(btn.dataset.br34Value) === current;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    }
    this.root.querySelector('[data-out="rating"]')!.textContent = ratingLabel(this.filter.minRating);
    this.root.querySelector('[data-out="views"]')!.textContent = viewsLabel(this.filter.minViews);
  }
}
