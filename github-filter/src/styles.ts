import { IDS } from './config';

const P = `#${IDS.panel}`;
const F = `#${IDS.fab}`;

const CSS = `
${P}, ${F} {
  color-scheme: dark;
  --ghf-bg: #0d1117;
  --ghf-sunken: #010409;
  --ghf-card: #161b22;
  --ghf-fg: #f0f6fc;
  --ghf-muted: #8b949e;
  --ghf-accent: #2f81f7;
  --ghf-accent-subtle: rgba(47, 129, 247, 0.15);
  --ghf-danger: #f85149;
  --ghf-danger-subtle: rgba(248, 81, 73, 0.15);
  --ghf-border: #30363d;
  --ghf-hairline: #21262d;
  --ghf-btn-bg: #21262d;
  --ghf-btn-hover: #30363d;
  --ghf-primary: #238636;
  --ghf-primary-hover: #2ea043;
  --ghf-radius: 8px;
  --ghf-radius-sm: 6px;
  --ghf-radius-pill: 999px;
  --ghf-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
  --ghf-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

${P} *, ${P} *::before, ${P} *::after { box-sizing: border-box; }
${P} svg, ${F} svg { fill: currentColor; color: inherit; flex-shrink: 0; }

/* Panel drawer & backdrop (prevent-page-scroll-under-modal-dialog) */
${P} {
  position: fixed;
  top: 0; right: 0; bottom: 0; left: auto;
  width: min(440px, 100vw);
  height: 100dvh;
  margin: 0; padding: 0;
  border: none; border-left: 1px solid var(--ghf-border);
  background: var(--ghf-bg);
  color: var(--ghf-fg);
  font-family: var(--ghf-font);
  font-size: 13px; line-height: 1.5;
  box-shadow: -10px 0 32px rgba(1, 4, 9, 0.7);
  overflow: hidden;
  overscroll-behavior: contain;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .22s cubic-bezier(0.16, 1, 0.3, 1), opacity .18s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P}[open] { transform: translateX(100%); opacity: 0; } }

${P}::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
  background: rgba(1, 4, 9, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity .2s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

@media (max-width: 767px) {
  ${P} {
    top: auto; bottom: 0; left: 0;
    width: 100vw; height: auto; max-height: 88dvh;
    border-left: none; border-top: 1px solid var(--ghf-border);
    border-radius: 14px 14px 0 0;
    transform: translateY(100%);
  }
  ${P}[open] { transform: translateY(0); }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }
}

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

/* Header & Tabs */
${P} .ghf-head { flex: 0 0 auto; padding: 12px 16px 0; border-bottom: 1px solid var(--ghf-hairline); }
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
${P} .ghf-brand { display: flex; align-items: center; gap: 8px; color: var(--ghf-fg); font-size: 14px; font-weight: 600; }
${P} .ghf-brand-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: var(--ghf-radius-sm);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent);
}
${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: var(--ghf-radius-sm);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  transition: background .12s, color .12s;
}
${P} .ghf-icon-btn:hover { background: var(--ghf-btn-bg); color: var(--ghf-fg); }

${P} .ghf-tabs { display: flex; gap: 8px; margin-top: 10px; }
${P} .ghf-tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px 8px; border: 0; border-bottom: 2px solid transparent;
  background: none; color: var(--ghf-muted); font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
}
${P} .ghf-tab-btn:hover { color: var(--ghf-fg); }
${P} .ghf-tab-btn[aria-selected="true"] { color: var(--ghf-fg); font-weight: 600; border-bottom-color: var(--ghf-accent); }
${P} .ghf-pill {
  min-width: 17px; height: 17px; padding: 0 5px; border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent); font-size: 10.5px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}

/* Scrollable body & cards */
${P} .ghf-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  padding: 12px 16px 20px; scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
}
${P} [role="tabpanel"][hidden] { display: none; }
${P} .ghf-card {
  margin-bottom: 12px; padding: 12px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius); background: var(--ghf-card);
}
${P} .ghf-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
${P} .ghf-card-title {
  display: flex; align-items: center; gap: 6px; margin: 0;
  color: var(--ghf-fg); font-size: 12px; font-weight: 600;
}
${P} .ghf-card-title svg { color: var(--ghf-muted); }

/* Fields & Inputs */
${P} .ghf-fields { display: flex; flex-direction: column; gap: 8px; }
${P} .ghf-field { display: flex; flex-direction: column; gap: 4px; }
${P} .ghf-label { color: var(--ghf-muted); font-size: 11px; font-weight: 500; }
${P} .ghf-input-wrap {
  display: flex; align-items: center; width: 100%; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-bg);
  transition: border-color .12s, box-shadow .12s;
}
${P} .ghf-input-wrap:focus-within { border-color: var(--ghf-accent); box-shadow: 0 0 0 2px var(--ghf-accent-subtle); }
${P} .ghf-input {
  flex: 1; min-width: 0; height: 30px; padding: 0 8px; border: 0; outline: 0;
  background: transparent; color: var(--ghf-fg); font: inherit; font-size: 12.5px;
}
${P} .ghf-input::placeholder { color: var(--ghf-muted); opacity: 0.7; }
${P} .ghf-clear-btn {
  width: 20px; height: 20px; margin-right: 5px; padding: 0; border: 0; border-radius: 4px;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
${P} .ghf-clear-btn:hover { background: var(--ghf-btn-bg); color: var(--ghf-fg); }

/* Quick chips */
${P} .ghf-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
${P} .ghf-chip {
  display: inline-flex; align-items: center; height: 20px; padding: 0 7px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); color: var(--ghf-muted); font: inherit; font-size: 10.5px; font-weight: 500;
  cursor: pointer; transition: border-color .1s, color .1s, background .1s;
}
${P} .ghf-chip:hover { border-color: var(--ghf-accent); color: var(--ghf-fg); }
${P} .ghf-chip.ghf-chip-active {
  border-color: var(--ghf-accent); background: var(--ghf-accent-subtle);
  color: var(--ghf-accent); font-weight: 600;
}

/* Sliders */
${P} .ghf-slider-row { margin-top: 6px; }
${P} .ghf-slider-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
${P} .ghf-slider-title { display: flex; align-items: center; gap: 5px; color: var(--ghf-fg); font-size: 11.5px; font-weight: 500; }
${P} .ghf-slider-title svg { color: var(--ghf-muted); }
${P} .ghf-readout {
  padding: 1px 6px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken); color: var(--ghf-fg); font-family: var(--ghf-mono); font-size: 10.5px;
}
${P} .ghf-slider { position: relative; height: 26px; cursor: pointer; touch-action: none; }
${P} .ghf-slider-track {
  position: absolute; left: 6px; right: 6px; top: 10px; height: 6px;
  border-radius: var(--ghf-radius-pill); background: var(--ghf-border); pointer-events: none;
}
${P} .ghf-slider-fill { position: absolute; top: 0; bottom: 0; border-radius: var(--ghf-radius-pill); background: var(--ghf-accent); }
${P} .ghf-slider input {
  position: absolute; left: 0; right: 0; top: 0; width: 100%; height: 26px; margin: 0;
  -webkit-appearance: none; appearance: none; background: none; pointer-events: none;
}
${P} .ghf-slider input::-webkit-slider-thumb {
  -webkit-appearance: none; pointer-events: auto;
  width: 16px; height: 16px; margin-top: 5px; border: 2px solid var(--ghf-accent);
  border-radius: 50%; background: var(--ghf-card); cursor: grab;
  box-shadow: 0 1px 4px rgba(1, 4, 9, 0.6); transition: transform .1s;
}
${P} .ghf-slider input::-webkit-slider-thumb:hover { transform: scale(1.15); }
${P} .ghf-slider input::-moz-range-thumb {
  pointer-events: auto; width: 12px; height: 12px; border: 2px solid var(--ghf-accent);
  border-radius: 50%; background: var(--ghf-card); cursor: grab;
}

/* Dates */
${P} .ghf-dates { display: grid; grid-template-columns: 1fr 16px 1fr; align-items: center; gap: 6px; margin-top: 4px; }
${P} .ghf-date {
  width: 100%; height: 30px; padding: 0 6px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-bg); color: var(--ghf-fg);
  font: inherit; font-size: 11px; outline: 0;
}
${P} .ghf-date:focus { border-color: var(--ghf-accent); box-shadow: 0 0 0 2px var(--ghf-accent-subtle); }
${P} .ghf-date-sep { text-align: center; color: var(--ghf-muted); font-size: 11px; }

/* Sort */
${P} .ghf-sort-wrap { position: relative; display: inline-flex; align-items: center; }
${P} .ghf-sort-select {
  appearance: none; height: 26px; padding: 0 22px 0 8px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-bg); color: var(--ghf-fg);
  font: inherit; font-size: 11px; cursor: pointer; outline: 0;
}
${P} .ghf-sort-wrap svg { position: absolute; right: 6px; color: var(--ghf-muted); pointer-events: none; }

/* Footer & Live tape */
${P} .ghf-foot {
  flex: 0 0 auto; display: flex; flex-direction: column; gap: 8px;
  padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ghf-border); background: var(--ghf-card);
}
${P} .ghf-tape-box { padding: 8px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm); background: var(--ghf-sunken); }
${P} .ghf-tape-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
${P} .ghf-tape-label { color: var(--ghf-muted); font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
${P} .ghf-tape-chips { display: flex; flex-wrap: wrap; gap: 4px; max-height: 60px; overflow-y: auto; scrollbar-width: thin; }
${P} .ghf-tape-chip {
  display: inline-flex; align-items: center; gap: 3px; padding: 1px 5px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card); color: var(--ghf-fg); font-family: var(--ghf-mono); font-size: 10.5px;
}
${P} .ghf-tape-chip-key { color: var(--ghf-accent); font-weight: 600; }
${P} .ghf-tape-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 13px; height: 13px; padding: 0; border: 0; border-radius: 50%;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
${P} .ghf-tape-chip-x:hover { background: var(--ghf-danger-subtle); color: var(--ghf-danger); }
${P} .ghf-tape-empty { color: var(--ghf-muted); font-size: 11px; font-style: italic; }
${P} .ghf-tape-hide { margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--ghf-border); color: var(--ghf-muted); font-size: 10.5px; }

/* Action buttons */
${P} .ghf-actions { display: grid; grid-template-columns: 85px 1fr; gap: 8px; }
${P} .ghf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  height: 32px; padding: 0 10px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg); color: var(--ghf-fg); font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background .1s, border-color .1s;
}
${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P} .ghf-btn-primary { border-color: var(--ghf-primary); background: var(--ghf-primary); color: #fff; font-weight: 600; }
${P} .ghf-btn-primary:hover { border-color: var(--ghf-primary-hover); background: var(--ghf-primary-hover); }
${P} .ghf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Presets */
${P} .ghf-preset-list { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
${P} .ghf-preset-card {
  padding: 8px 10px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-card); display: flex; flex-direction: column; gap: 6px;
}
${P} .ghf-preset-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
${P} .ghf-preset-name { font-size: 12.5px; font-weight: 600; color: var(--ghf-fg); }
${P} .ghf-preset-summary { color: var(--ghf-muted); font-family: var(--ghf-mono); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${P} .ghf-empty { padding: 30px 16px; border: 1px dashed var(--ghf-border); border-radius: var(--ghf-radius); color: var(--ghf-muted); text-align: center; }
${P} .ghf-empty svg { color: var(--ghf-accent); margin-bottom: 6px; }

/* Floating button */
${F} {
  position: fixed; right: calc(18px + env(safe-area-inset-right, 0px)); bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 38px; min-width: 38px; padding: 0 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-card); color: var(--ghf-fg);
  box-shadow: 0 8px 24px rgba(1, 4, 9, 0.7); cursor: pointer; z-index: 9999;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: transform .12s, border-color .12s;
}
${F}:hover { transform: translateY(-2px); border-color: var(--ghf-accent); }
${F} svg { color: var(--ghf-accent); }
${F} .ghf-fab-text { font-family: var(--ghf-font); font-size: 12px; font-weight: 600; }
${F} .ghf-fab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent); color: #fff; font-size: 10px; font-weight: 700;
}

@media print { ${F}, ${P} { display: none !important; } }
@media (prefers-reduced-motion: reduce) { ${P}, ${P}::backdrop, ${F}, ${P} * { transition-duration: 0.01ms !important; } }
.ghf-hidden { display: none !important; }
`;

export function injectStyles() {
  if (document.getElementById(IDS.style)) return;
  const style = document.createElement('style');
  style.id = IDS.style;
  style.textContent = CSS;
  document.head.append(style);
}
