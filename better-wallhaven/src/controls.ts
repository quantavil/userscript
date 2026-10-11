export const GRID_KEY = 'whGridSize';
export const GRID_DEFAULT = 300;
export const GRID_MIN = 160;
export const GRID_MAX = 480;

export function getGridSize(): number {
  const v = parseInt(localStorage.getItem(GRID_KEY) || String(GRID_DEFAULT), 10);
  if (Number.isNaN(v)) return GRID_DEFAULT;
  return Math.min(GRID_MAX, Math.max(GRID_MIN, v));
}

export function applyGridSize(px: number): void {
  const root = document.documentElement;
  root.style.setProperty('--wh-cell', `${px}px`);
  root.style.setProperty('--wh-cell-h', `${Math.round(px * 0.667)}px`);
}

function persist(px: number): void {
  try {
    localStorage.setItem(GRID_KEY, String(px));
  } catch {}
}

function wireControl(range: HTMLInputElement, val: HTMLElement, reset: HTMLButtonElement, onChange: (px: number) => void): void {
  range.addEventListener('input', () => {
    const px = parseInt(range.value, 10);
    val.textContent = `${px}px`;
    onChange(px);
  });
  range.addEventListener('change', () => persist(parseInt(range.value, 10)));
  reset.addEventListener('click', () => {
    range.value = String(GRID_DEFAULT);
    val.textContent = `${GRID_DEFAULT}px`;
    persist(GRID_DEFAULT);
    onChange(GRID_DEFAULT);
  });
}

/**
 * Native-feel control injected into wallhaven's own searchbar form
 * (form#searchbar, before the submit button). Uses the site's `.framed`
 * box and `.button` classes so it inherits the native theme.
 * Returns null when the searchbar is absent — caller falls back to floating bar.
 */
export function createNativeGridControl(initial: number, onChange: (px: number) => void) {
  const form = document.querySelector('form#searchbar');
  if (!form) return null;
  const box = document.createElement('div');
  box.id = 'whGridNative';
  box.className = 'framed';
  box.title = 'Thumbnail size';
  box.innerHTML = `
    <span class="whg-icon"></span>
    <input class="whg-range" type="range" min="${GRID_MIN}" max="${GRID_MAX}" step="10" value="${initial}" aria-label="Thumbnail size">
    <span class="whg-val">${initial}px</span>
    <button class="button whg-reset" type="button" title="Reset 300px">Reset</button>
  `;
  const submit = form.querySelector('#search-submit');
  if (submit) submit.before(box);
  else form.appendChild(box);
  const range = box.querySelector('.whg-range') as HTMLInputElement;
  const val = box.querySelector('.whg-val') as HTMLElement;
  const reset = box.querySelector('.whg-reset') as HTMLButtonElement;
  wireControl(range, val, reset, onChange);
  return { box, range, val };
}

export function createGridBar(initial: number, onChange: (px: number) => void) {
  const bar = document.createElement('div');
  bar.id = 'whGridBar';
  bar.innerHTML = `
    <span class="whg-icon"></span>
    <input class="whg-range" type="range" min="${GRID_MIN}" max="${GRID_MAX}" step="10" value="${initial}" aria-label="Thumbnail size">
    <span class="whg-val">${initial}px</span>
    <button class="whg-reset" type="button" title="Reset 300px">Reset</button>
  `;
  const range = bar.querySelector('.whg-range') as HTMLInputElement;
  const val = bar.querySelector('.whg-val') as HTMLElement;
  const reset = bar.querySelector('.whg-reset') as HTMLButtonElement;
  wireControl(range, val, reset, onChange);
  document.body.appendChild(bar);
  return { bar, range, val };
}
