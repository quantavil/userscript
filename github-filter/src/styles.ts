import { IDS } from './config';

const P = `#${IDS.panel}`;
const F = `#${IDS.fab}`;

const CSS = `
${P}, ${F} {
  --ghf-canvas: var(--overlay-bgColor, var(--bgColor-default, var(--color-canvas-default, #ffffff)));
  --ghf-sunken: var(--bgColor-inset, var(--color-canvas-inset, #f6f8fa));
  --ghf-raised: var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa));
  --ghf-card: var(--bgColor-default, var(--color-canvas-default, #ffffff));
  --ghf-fg: var(--fgColor-default, var(--color-fg-default, #1f2328));
  --ghf-muted: var(--fgColor-muted, var(--color-fg-muted, #59636e));
  --ghf-accent: var(--fgColor-accent, var(--color-accent-fg, #0969da));
  --ghf-accent-subtle: rgba(9, 105, 218, 0.12);
  --ghf-accent-border: rgba(9, 105, 218, 0.35);
  --ghf-danger: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
  --ghf-danger-subtle: rgba(209, 36, 47, 0.12);
  --ghf-border: var(--borderColor-default, var(--color-border-default, #d1d9e0));
  --ghf-hairline: var(--borderColor-muted, var(--color-border-muted, #eaeef2));
  --ghf-hover: var(--control-transparent-bgColor-hover, rgba(175, 184, 193, 0.15));
  --ghf-selected: var(--bgColor-neutral-muted, rgba(175, 184, 193, 0.22));
  --ghf-btn-bg: var(--button-default-bgColor-rest, #f6f8fa);
  --ghf-btn-hover: var(--button-default-bgColor-hover, #eef1f4);
  --ghf-primary: var(--button-primary-bgColor-rest, #1f883d);
  --ghf-primary-hover: var(--button-primary-bgColor-hover, #1a7f37);
  --ghf-shadow: 0 16px 36px rgba(31, 35, 40, 0.18), 0 4px 12px rgba(31, 35, 40, 0.08);
  --ghf-shadow-drawer: -8px 0 32px rgba(31, 35, 40, 0.2);
  --ghf-radius: 8px;
  --ghf-radius-sm: 6px;
  --ghf-radius-pill: 999px;
  --ghf-font: var(--fontStack-sansSerif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
}

${P}[data-theme="light"], ${F}[data-theme="light"] {
  color-scheme: light;
  --ghf-canvas: #ffffff;
  --ghf-sunken: #f6f8fa;
  --ghf-raised: #f8fafc;
  --ghf-card: #ffffff;
  --ghf-fg: #1f2328;
  --ghf-muted: #59636e;
  --ghf-accent: #0969da;
  --ghf-accent-subtle: rgba(9, 105, 218, 0.1);
  --ghf-accent-border: rgba(9, 105, 218, 0.35);
  --ghf-danger: #d1242f;
  --ghf-danger-subtle: rgba(209, 36, 47, 0.1);
  --ghf-border: #d0d7de;
  --ghf-hairline: #e8ecf0;
  --ghf-hover: #f3f5f8;
  --ghf-selected: #e5ebf1;
  --ghf-btn-bg: #f6f8fa;
  --ghf-btn-hover: #eaedf1;
  --ghf-primary: #1f883d;
  --ghf-primary-hover: #1a7f37;
  --ghf-shadow: 0 16px 36px rgba(31, 35, 40, 0.16);
  --ghf-shadow-drawer: -8px 0 32px rgba(31, 35, 40, 0.16);
}

${P}[data-theme="dark"], ${F}[data-theme="dark"] {
  color-scheme: dark;
  --ghf-canvas: #0d1117;
  --ghf-sunken: #090d13;
  --ghf-raised: #161b22;
  --ghf-card: #161b22;
  --ghf-fg: #f0f6fc;
  --ghf-muted: #8b949e;
  --ghf-accent: #2f81f7;
  --ghf-accent-subtle: rgba(47, 129, 247, 0.15);
  --ghf-accent-border: rgba(47, 129, 247, 0.4);
  --ghf-danger: #f85149;
  --ghf-danger-subtle: rgba(248, 81, 73, 0.15);
  --ghf-border: #30363d;
  --ghf-hairline: #21262d;
  --ghf-hover: #1f242c;
  --ghf-selected: #282e37;
  --ghf-btn-bg: #21262d;
  --ghf-btn-hover: #292e36;
  --ghf-primary: #238636;
  --ghf-primary-hover: #2ea043;
  --ghf-shadow: 0 20px 48px rgba(1, 4, 9, 0.7);
  --ghf-shadow-drawer: -12px 0 40px rgba(1, 4, 9, 0.7);
}

/* ==========================================================================
   Panel Container & Backdrop
   ========================================================================== */

${P} {
  top: 0;
  right: 0;
  bottom: 0;
  left: auto;
  width: min(460px, 100vw);
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0 0 0 auto;
  padding: 0;
  border: none;
  border-left: 1px solid var(--ghf-border);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  font-family: var(--ghf-font);
  font-size: 13px;
  line-height: 1.5;
  box-shadow: var(--ghf-shadow-drawer);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .25s cubic-bezier(0.16, 1, 0.3, 1), opacity .2s ease,
              display .25s allow-discrete, overlay .25s allow-discrete;
}

${P}[open] {
  transform: translateX(0);
  opacity: 1;
}

@starting-style {
  ${P}[open] {
    transform: translateX(100%);
    opacity: 0;
  }
}

${P}::backdrop {
  background: rgba(1, 4, 9, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity .22s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}

${P}[open]::backdrop {
  opacity: 1;
}

@starting-style {
  ${P}[open]::backdrop {
    opacity: 0;
  }
}

${P} *, ${P} *::before, ${P} *::after {
  box-sizing: border-box;
}

${P} ::selection {
  background: var(--ghf-selected);
  color: var(--ghf-fg);
}

${P} .ghf-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

@media (max-width: 767px) {
  ${P} {
    top: auto;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: auto;
    max-height: 90dvh;
    margin: auto 0 0;
    border-left: none;
    border-top: 1px solid var(--ghf-border);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
  }
  ${P}[open] { transform: translateY(0); }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }
}

/* ==========================================================================
   Header & Tabs
   ========================================================================== */

${P} .ghf-head {
  flex: 0 0 auto;
  padding: 14px 18px 0;
  border-bottom: 1px solid var(--ghf-hairline);
  background: var(--ghf-canvas);
}

${P} .ghf-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
}

${P} .ghf-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

${P} .ghf-brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-accent-subtle);
  color: var(--ghf-accent);
}

${P} h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ghf-fg);
}

${P} .ghf-badge-shortcut {
  padding: 1px 6px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken);
  color: var(--ghf-muted);
  font-family: var(--ghf-mono);
  font-size: 10px;
  font-weight: 500;
}

${P} .ghf-titlebar nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

${P} .ghf-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--ghf-radius-sm);
  background: transparent;
  color: var(--ghf-muted);
  cursor: pointer;
  font: inherit;
  transition: background .12s ease, color .12s ease, transform .08s ease;
}

${P} .ghf-icon-btn svg { fill: currentColor; }
${P} .ghf-icon-btn:hover {
  background: var(--ghf-btn-hover);
  color: var(--ghf-fg);
}
${P} .ghf-icon-btn:active { transform: scale(0.95); }

${P} .ghf-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

${P} .ghf-tab-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 9px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ghf-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color .12s ease;
}

${P} .ghf-tab-btn:hover { color: var(--ghf-fg); }

${P} .ghf-tab-btn[aria-selected="true"] {
  color: var(--ghf-fg);
  font-weight: 600;
  border-bottom-color: var(--ghf-accent);
}

${P} .ghf-pill-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent-subtle);
  color: var(--ghf-accent);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ==========================================================================
   Body & Cards
   ========================================================================== */

${P} .ghf-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 18px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--ghf-border) transparent;
}

${P} [role="tabpanel"][hidden] { display: none; }

${P} .ghf-card {
  margin-bottom: 14px;
  padding: 12px 14px 14px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-card);
  box-shadow: 0 1px 3px rgba(31, 35, 40, 0.04);
}

${P} .ghf-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

${P} .ghf-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--ghf-fg);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

${P} .ghf-card-title svg { color: var(--ghf-muted); }

/* ==========================================================================
   Fields & Inputs
   ========================================================================== */

${P} .ghf-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

${P} .ghf-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

${P} .ghf-field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

${P} .ghf-label {
  color: var(--ghf-muted);
  font-size: 11.5px;
  font-weight: 500;
}

${P} .ghf-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-canvas);
  transition: border-color .12s ease, box-shadow .12s ease;
}

${P} .ghf-input-wrap:focus-within {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 2px var(--ghf-accent-subtle);
}

${P} .ghf-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ghf-fg);
  font: inherit;
  font-size: 12.5px;
}

${P} .ghf-input::placeholder {
  color: var(--ghf-muted);
  opacity: 0.8;
}

${P} .ghf-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 6px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ghf-muted);
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
}

${P} .ghf-clear-btn svg { fill: currentColor; }
${P} .ghf-clear-btn:hover {
  background: var(--ghf-selected);
  color: var(--ghf-fg);
}

${P} .ghf-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

${P} .ghf-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken);
  color: var(--ghf-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}

${P} .ghf-chip:hover {
  border-color: var(--ghf-accent-border);
  color: var(--ghf-fg);
}

${P} .ghf-chip.ghf-chip-active {
  border-color: var(--ghf-accent);
  background: var(--ghf-accent-subtle);
  color: var(--ghf-accent);
  font-weight: 600;
}

/* ==========================================================================
   Dual Sliders
   ========================================================================== */

${P} .ghf-slider-row {
  margin-top: 8px;
}

${P} .ghf-slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

${P} .ghf-slider-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ghf-fg);
  font-size: 12px;
  font-weight: 500;
}

${P} .ghf-slider-title svg { color: var(--ghf-muted); }

${P} .ghf-readout-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken);
  color: var(--ghf-fg);
  font-family: var(--ghf-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

${P} .ghf-slider {
  position: relative;
  height: 28px;
  cursor: pointer;
  touch-action: none;
}

${P} .ghf-slider-track {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 11px;
  height: 6px;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-border);
  pointer-events: none;
}

${P} .ghf-slider-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent);
}

${P} .ghf-slider input {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  width: 100%;
  height: 28px;
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
  background: none;
  pointer-events: none;
}

${P} .ghf-slider input::-webkit-slider-runnable-track {
  height: 28px;
  background: none;
}
${P} .ghf-slider input::-moz-range-track {
  height: 28px;
  background: none;
}

${P} .ghf-slider input::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: auto;
  width: 16px;
  height: 16px;
  margin-top: 6px;
  border: 2px solid var(--ghf-accent);
  border-radius: 50%;
  background: var(--ghf-card);
  cursor: grab;
  box-shadow: 0 1px 4px rgba(31, 35, 40, 0.35);
  transition: transform .1s ease, box-shadow .1s ease;
}

${P} .ghf-slider input::-webkit-slider-thumb:hover {
  transform: scale(1.18);
  box-shadow: 0 0 0 3px var(--ghf-accent-subtle), 0 2px 6px rgba(31, 35, 40, 0.4);
}

${P} .ghf-slider input:active::-webkit-slider-thumb {
  cursor: grabbing;
  transform: scale(1.22);
}

${P} .ghf-slider input::-moz-range-thumb {
  pointer-events: auto;
  width: 12px;
  height: 12px;
  border: 2px solid var(--ghf-accent);
  border-radius: 50%;
  background: var(--ghf-card);
  cursor: grab;
  box-shadow: 0 1px 4px rgba(31, 35, 40, 0.35);
}

/* ==========================================================================
   Date Pickers
   ========================================================================== */

${P} .ghf-date-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

${P} .ghf-date-input {
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  font: inherit;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  outline: 0;
  transition: border-color .12s ease, box-shadow .12s ease;
}

${P} .ghf-date-input:focus {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 2px var(--ghf-accent-subtle);
}

${P} .ghf-date-sep {
  text-align: center;
  color: var(--ghf-muted);
  font-size: 12px;
}

/* ==========================================================================
   Sort Selection
   ========================================================================== */

${P} .ghf-sort-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

${P} .ghf-sort-select {
  appearance: none;
  height: 28px;
  padding: 0 24px 0 10px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: 0;
}

${P} .ghf-sort-select:focus {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 2px var(--ghf-accent-subtle);
}

${P} .ghf-sort-wrap svg {
  position: absolute;
  right: 7px;
  color: var(--ghf-muted);
  pointer-events: none;
  fill: currentColor;
}

/* ==========================================================================
   Footer & Live Query Tape
   ========================================================================== */

${P} .ghf-foot {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ghf-border);
  background: var(--ghf-raised);
}

${P} .ghf-tape-card {
  padding: 8px 10px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-sunken);
}

${P} .ghf-tape-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

${P} .ghf-tape-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ghf-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

${P} .ghf-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card);
  color: var(--ghf-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}

${P} .ghf-copy-btn svg { fill: currentColor; }
${P} .ghf-copy-btn:hover:not(:disabled) {
  border-color: var(--ghf-accent-border);
  color: var(--ghf-fg);
}
${P} .ghf-copy-btn:disabled {
  opacity: .5;
  cursor: default;
}

${P} .ghf-tape-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 72px;
  overflow-y: auto;
  padding: 2px 0;
  scrollbar-width: thin;
}

${P} .ghf-tape-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card);
  color: var(--ghf-fg);
  font-family: var(--ghf-mono);
  font-size: 11px;
  line-height: 1.4;
}

${P} .ghf-tape-chip-key {
  color: var(--ghf-accent);
  font-weight: 600;
}

${P} .ghf-tape-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ghf-muted);
  cursor: pointer;
  transition: background .1s ease, color .1s ease;
}

${P} .ghf-tape-chip-remove:hover {
  background: var(--ghf-danger-subtle);
  color: var(--ghf-danger);
}

${P} .ghf-tape-empty {
  color: var(--ghf-muted);
  font-size: 12px;
  font-style: italic;
  padding: 2px 0;
}

${P} .ghf-tape-hide {
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px dashed var(--ghf-border);
  color: var(--ghf-muted);
  font-size: 11px;
}

${P} .ghf-tape-hide b {
  color: var(--ghf-fg);
  font-family: var(--ghf-mono);
}

${P} .ghf-actions-bar {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px;
}

${P} .ghf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg);
  color: var(--ghf-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease, transform .08s ease;
}

${P} .ghf-btn svg { fill: currentColor; }
${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P} .ghf-btn:active { transform: translateY(1px); }

${P} .ghf-btn.ghf-btn-primary {
  border-color: var(--ghf-primary);
  background: var(--ghf-primary);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(31, 35, 40, 0.2);
}

${P} .ghf-btn.ghf-btn-primary:hover {
  border-color: var(--ghf-primary-hover);
  background: var(--ghf-primary-hover);
}

${P} .ghf-btn:disabled, ${P} .ghf-btn.ghf-btn-primary:disabled {
  border-color: var(--ghf-border);
  background: var(--ghf-btn-bg);
  color: var(--ghf-muted);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
  opacity: 0.6;
}

/* ==========================================================================
   Presets Tab
   ========================================================================== */

${P} .ghf-save-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

${P} .ghf-preset-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

${P} .ghf-preset-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-card);
  transition: border-color .12s ease, box-shadow .12s ease;
}

${P} .ghf-preset-card:hover {
  border-color: var(--ghf-accent-border);
  box-shadow: 0 2px 6px rgba(31, 35, 40, 0.06);
}

${P} .ghf-preset-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

${P} .ghf-preset-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ghf-fg);
}

${P} .ghf-preset-query {
  color: var(--ghf-muted);
  font-family: var(--ghf-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

${P} .ghf-preset-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

${P} .ghf-error-msg {
  min-height: 16px;
  margin: 4px 0 0;
  color: var(--ghf-danger);
  font-size: 11.5px;
}

${P} .ghf-empty-presets {
  padding: 36px 20px;
  border: 1px dashed var(--ghf-border);
  border-radius: var(--ghf-radius);
  color: var(--ghf-muted);
  text-align: center;
}

${P} .ghf-empty-presets svg {
  margin-bottom: 8px;
  color: var(--ghf-accent);
  opacity: 0.8;
}

${P} .ghf-empty-title {
  margin: 0 0 6px;
  color: var(--ghf-fg);
  font-size: 14px;
  font-weight: 600;
}

${P} .ghf-empty-text {
  margin: 0 auto 16px;
  max-width: 32ch;
  font-size: 12px;
  line-height: 1.5;
}

/* ==========================================================================
   Focus & Accessibility
   ========================================================================== */

${P} :is(button, select, input):focus-visible {
  outline: 2px solid var(--ghf-accent);
  outline-offset: 1px;
}

${P} .ghf-slider input:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--ghf-canvas), 0 0 0 4px var(--ghf-accent);
}

/* ==========================================================================
   Floating Launcher Button (FAB)
   ========================================================================== */

${F} {
  position: fixed;
  right: calc(20px + env(safe-area-inset-right, 0px));
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 42px;
  min-width: 42px;
  padding: 0 14px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  box-shadow: var(--ghf-shadow);
  cursor: pointer;
  z-index: 9999;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease;
}

${F}:hover {
  transform: translateY(-2px);
  border-color: var(--ghf-accent);
  box-shadow: 0 8px 24px rgba(31, 35, 40, 0.22);
}

${F}:active { transform: translateY(0) scale(0.97); }

${F} svg {
  flex: 0 0 auto;
  fill: currentColor;
  color: var(--ghf-accent);
}

${F} .ghf-fab-text {
  font-family: var(--ghf-font);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}

${F} .ghf-fab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

@media (pointer: coarse) {
  ${F} { height: 48px; min-width: 48px; }
}

@media print {
  ${F}, ${P} { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  ${P}, ${P}::backdrop, ${F}, ${P} * {
    transition-duration: 0.01ms !important;
  }
}

.ghf-hidden { display: none !important; }
`;

export function injectStyles() {
  if (document.getElementById(IDS.style)) return;
  const style = document.createElement('style');
  style.id = IDS.style;
  style.textContent = CSS;
  document.head.append(style);
}
