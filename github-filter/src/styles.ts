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
  width: min(420px, 100vw);
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
  cursor: pointer;
  pointer-events: auto;
  transition: opacity .2s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

${P} .ghf-drag-handle { display: none; }

@media (max-width: 767px) {
  ${P} {
    top: auto; bottom: 0; left: 0; right: 0;
    width: 100%; max-width: 100vw;
    height: 85dvh; max-height: 88dvh;
    margin: 0;
    border-left: none; border-top: 1px solid var(--ghf-border);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 32px rgba(1, 4, 9, 0.85);
    transform: translateY(100%);
    opacity: 0;
  }
  ${P}[open] { transform: translateY(0); opacity: 1; }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }

  ${P} .ghf-drag-handle {
    display: block;
    width: 36px;
    height: 4px;
    margin: 2px auto 6px;
    border-radius: 999px;
    background: var(--ghf-border);
  }

  /* Prevent iOS Safari from auto-zooming on input focus */
  ${P} .ghf-input,
  ${P} .ghf-date,
  ${P} .ghf-sort-select {
    font-size: 16px !important;
  }

  /* Mobile touch targets & spacing */
  ${P} .ghf-head { padding: 6px 12px 8px; }
  ${P} .ghf-icon-btn { width: 32px; height: 32px; }

  ${P} .ghf-input { height: 34px; }
  ${P} .ghf-clear-btn { width: 26px; height: 26px; }

  ${P} .ghf-chips { gap: 6px; }
  ${P} .ghf-chip { height: 26px; padding: 0 9px; font-size: 11.5px; }

  /* Smooth slider mobile touch sizing */
  ${P} .ghf-slider-row { margin-top: 6px; }
  ${P} .ghf-slider {
    height: 32px;
    margin: 4px 0;
  }
  ${P} .ghf-slider-track {
    top: 14px;
    height: 5px;
  }
  ${P} .ghf-slider-thumb {
    top: 7px;
    width: 18px;
    height: 18px;
    margin-left: -9px;
  }
  ${P} .ghf-slider-thumb::before {
    content: '';
    position: absolute;
    top: -12px; left: -12px; right: -12px; bottom: -12px;
    border-radius: 50%;
  }

  ${P} .ghf-mini-chip { height: 22px; padding: 0 6px; font-size: 10.5px; }

  ${P} .ghf-date { height: 34px; }
  ${P} .ghf-sort-select { height: 30px; font-size: 13px !important; }

  /* Presets touch targets */
  ${P} .ghf-preset-chips { gap: 6px; }
  ${P} .ghf-preset-chip-item { height: 28px; }
  ${P} .ghf-preset-apply-btn { height: 28px; padding: 0 8px; font-size: 12px; }
  ${P} .ghf-preset-run-btn { width: 28px; height: 28px; }
  ${P} .ghf-preset-del-btn { width: 26px; height: 28px; }

  /* Footer action buttons */
  ${P} .ghf-actions { grid-template-columns: 85px 1fr; gap: 8px; }
  ${P} .ghf-actions .ghf-btn { height: 36px; font-size: 13px; font-weight: 600; }

  /* Launcher FAB mobile positioning */
  ${F} {
    right: calc(14px + env(safe-area-inset-right, 0px));
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  }
}

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

/* Header */
${P} .ghf-head { flex: 0 0 auto; padding: 8px 12px; border-bottom: 1px solid var(--ghf-hairline); }
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
${P} .ghf-brand { display: flex; align-items: center; gap: 7px; color: var(--ghf-fg); font-size: 13.5px; font-weight: 600; }
${P} .ghf-brand-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: var(--ghf-radius-sm);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent);
}
${P} .ghf-pill {
  min-width: 16px; height: 16px; padding: 0 5px; border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent); font-size: 10px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; border: 1px solid transparent; border-radius: var(--ghf-radius-sm);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  transition: background .12s, color .12s;
}
${P} .ghf-icon-btn:hover { background: var(--ghf-btn-bg); color: var(--ghf-fg); }

/* Scrollable body & cards */
${P} .ghf-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  padding: 8px 12px 14px; scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
  display: flex; flex-direction: column; gap: 8px;
  -webkit-overflow-scrolling: touch;
}
${P} .ghf-card {
  padding: 8px 10px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-card);
}
${P} .ghf-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
${P} .ghf-card-title {
  display: flex; align-items: center; gap: 5px; margin: 0;
  color: var(--ghf-fg); font-size: 11.5px; font-weight: 600;
}
${P} .ghf-card-title svg { color: var(--ghf-muted); }

/* Fields & Inputs */
${P} .ghf-fields { display: flex; flex-direction: column; gap: 6px; }
${P} .ghf-field { display: flex; flex-direction: column; gap: 2px; }
${P} .ghf-label { color: var(--ghf-muted); font-size: 10.5px; font-weight: 500; }
${P} .ghf-input-wrap {
  display: flex; align-items: center; width: 100%; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-bg);
  transition: border-color .12s, box-shadow .12s;
}
${P} .ghf-input-wrap:focus-within { border-color: var(--ghf-accent); box-shadow: 0 0 0 2px var(--ghf-accent-subtle); }
${P} .ghf-input {
  flex: 1; min-width: 0; height: 28px; padding: 0 8px; border: 0; outline: 0;
  background: transparent; color: var(--ghf-fg); font: inherit; font-size: 12px;
}
${P} .ghf-input::placeholder { color: var(--ghf-muted); opacity: 0.7; }
${P} .ghf-clear-btn {
  width: 18px; height: 18px; margin-right: 4px; padding: 0; border: 0; border-radius: 4px;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
${P} .ghf-clear-btn:hover { background: var(--ghf-btn-bg); color: var(--ghf-fg); }

/* Quick chips */
${P} .ghf-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
${P} .ghf-chip {
  display: inline-flex; align-items: center; height: 20px; padding: 0 6px;
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
${P} .ghf-slider-row { margin-top: 5px; }
${P} .ghf-slider-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px; }
${P} .ghf-slider-title-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
${P} .ghf-slider-title { display: flex; align-items: center; gap: 4px; color: var(--ghf-fg); font-size: 11px; font-weight: 600; }
${P} .ghf-slider-title svg { color: var(--ghf-muted); }
${P} .ghf-mini-chips { display: inline-flex; align-items: center; gap: 3px; }
${P} .ghf-mini-chip {
  display: inline-flex; align-items: center; height: 18px; padding: 0 5px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); color: var(--ghf-muted); font: inherit; font-size: 10px; font-weight: 500;
  cursor: pointer; transition: border-color .1s, color .1s, background .1s;
}
${P} .ghf-mini-chip:hover { border-color: var(--ghf-accent); color: var(--ghf-fg); }
${P} .ghf-mini-chip.ghf-mini-chip-active {
  border-color: var(--ghf-accent); background: var(--ghf-accent-subtle);
  color: var(--ghf-accent); font-weight: 600;
}
${P} .ghf-slider-readout-group { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
${P} .ghf-readout {
  padding: 1px 5px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken); color: var(--ghf-fg); font-family: var(--ghf-mono); font-size: 10px;
}
${P} .ghf-slider { position: relative; height: 22px; cursor: pointer; touch-action: none; user-select: none; }
${P} .ghf-slider-track {
  position: absolute; left: 7px; right: 7px; top: 9px; height: 4px;
  border-radius: 999px; background: var(--ghf-hairline); border: 1px solid var(--ghf-border); pointer-events: none;
}
${P} .ghf-slider-fill {
  position: absolute; top: 0; bottom: 0; border-radius: 999px;
  background: var(--ghf-accent); pointer-events: none;
}
${P} .ghf-slider-thumb {
  position: absolute; top: 4px; width: 14px; height: 14px; margin-left: -7px;
  border-radius: 50%; background: #e6edf3; border: 2px solid var(--ghf-accent);
  box-shadow: 0 1px 4px rgba(1, 4, 9, 0.8); cursor: grab; outline: none; touch-action: none;
  transition: transform .1s, box-shadow .1s, border-color .1s;
}
${P} .ghf-slider-thumb:hover {
  transform: scale(1.15); box-shadow: 0 0 0 3px var(--ghf-accent-subtle), 0 2px 6px rgba(1, 4, 9, 0.9);
}
${P} .ghf-slider-thumb:focus-visible, ${P} .ghf-slider-thumb.ghf-thumb-active {
  cursor: grabbing; transform: scale(1.2); border-color: #58a6ff; background: #ffffff;
  box-shadow: 0 0 0 4px var(--ghf-accent-subtle), 0 2px 8px rgba(1, 4, 9, 0.9);
}

/* Dates */
${P} .ghf-dates { display: grid; grid-template-columns: 1fr 14px 1fr; align-items: center; gap: 4px; margin-top: 3px; }
${P} .ghf-date {
  width: 100%; height: 26px; padding: 0 6px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-bg); color: var(--ghf-fg);
  font: inherit; font-size: 11px; outline: 0;
}
${P} .ghf-date:focus { border-color: var(--ghf-accent); box-shadow: 0 0 0 2px var(--ghf-accent-subtle); }
${P} .ghf-date-sep { text-align: center; color: var(--ghf-muted); font-size: 10px; }

/* Sort */
${P} .ghf-sort-wrap { position: relative; display: inline-flex; align-items: center; }
${P} .ghf-sort-select {
  appearance: none; height: 24px; padding: 0 20px 0 6px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm); background: var(--ghf-bg); color: var(--ghf-fg);
  font: inherit; font-size: 11px; cursor: pointer; outline: 0;
}
${P} .ghf-sort-wrap svg { position: absolute; right: 5px; color: var(--ghf-muted); pointer-events: none; }

/* Presets on single page */
${P} .ghf-preset-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
${P} .ghf-preset-chip-item {
  display: inline-flex; align-items: center; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-pill); background: var(--ghf-sunken); overflow: hidden; max-width: 100%;
  transition: border-color .1s;
}
${P} .ghf-preset-chip-item:hover { border-color: var(--ghf-accent); }
${P} .ghf-preset-apply-btn {
  display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 7px;
  border: 0; background: transparent; color: var(--ghf-fg); font: inherit; font-size: 11px; font-weight: 500;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
${P} .ghf-preset-apply-btn:hover { color: var(--ghf-accent); }
${P} .ghf-preset-run-btn {
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 22px;
  border: 0; border-left: 1px solid var(--ghf-border); background: transparent; color: var(--ghf-muted); cursor: pointer;
}
${P} .ghf-preset-run-btn:hover { color: var(--ghf-accent); background: var(--ghf-accent-subtle); }
${P} .ghf-preset-del-btn {
  display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; height: 22px;
  border: 0; border-left: 1px solid var(--ghf-border); background: transparent; color: var(--ghf-muted); cursor: pointer;
}
${P} .ghf-preset-del-btn:hover { color: var(--ghf-danger); background: var(--ghf-danger-subtle); }
${P} .ghf-del-confirm { font-size: 9px; font-weight: 700; color: var(--ghf-danger); text-transform: uppercase; }
${P} .ghf-preset-save-row { display: flex; gap: 6px; align-items: center; }
${P} .ghf-error-msg { margin: 4px 0 0; color: var(--ghf-danger); font-size: 10.5px; }

/* Footer & Live tape */
${P} .ghf-foot {
  flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ghf-border); background: var(--ghf-card);
}
${P} .ghf-tape-box { padding: 6px 8px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm); background: var(--ghf-sunken); }
${P} .ghf-tape-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
${P} .ghf-tape-label { color: var(--ghf-muted); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
${P} .ghf-tape-chips { display: flex; flex-wrap: wrap; gap: 3px; max-height: 48px; overflow-y: auto; scrollbar-width: thin; }
${P} .ghf-tape-chip {
  display: inline-flex; align-items: center; gap: 3px; height: 18px; padding: 0 4px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card); color: var(--ghf-fg); font-family: var(--ghf-mono); font-size: 10px;
}
${P} .ghf-tape-chip-key { color: var(--ghf-accent); font-weight: 600; }
${P} .ghf-tape-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 12px; height: 12px; padding: 0; border: 0; border-radius: 50%;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
${P} .ghf-tape-chip-x:hover { background: var(--ghf-danger-subtle); color: var(--ghf-danger); }
${P} .ghf-tape-empty { color: var(--ghf-muted); font-size: 10.5px; font-style: italic; }
${P} .ghf-tape-hide { margin-top: 3px; padding-top: 3px; border-top: 1px dashed var(--ghf-border); color: var(--ghf-muted); font-size: 10px; }

/* Action buttons */
${P} .ghf-actions { display: grid; grid-template-columns: 80px 1fr; gap: 6px; }
${P} .ghf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  height: 28px; padding: 0 8px; border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg); color: var(--ghf-fg); font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
  transition: background .1s, border-color .1s;
}
${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P} .ghf-btn-primary { border-color: var(--ghf-primary); background: var(--ghf-primary); color: #fff; font-weight: 600; }
${P} .ghf-btn-primary:hover { border-color: var(--ghf-primary-hover); background: var(--ghf-primary-hover); }
${P} .ghf-btn:disabled { opacity: 0.5; cursor: not-allowed; }


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

/* Hide launcher FAB when modal panel is open */
${F}[aria-expanded="true"],
body:has(${P}[open]) ${F} {
  display: none !important;
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
