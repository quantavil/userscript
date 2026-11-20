import { IDS } from './config';

const P = `#${IDS.panel}`;
const F = `#${IDS.fab}`;

const CSS = `
/* GitHub Primer tokens keep the panel native in light, dark and auto themes. */
${P} {
  --ghf-bg: var(--bgColor-default, #0d1117);
  --ghf-card: var(--bgColor-muted, #151b23);
  --ghf-sunken: var(--bgColor-inset, #010409);
  --ghf-fg: var(--fgColor-default, #f0f6fc);
  --ghf-muted: var(--fgColor-muted, #9198a1);
  --ghf-accent: var(--fgColor-accent, #4493f8);
  --ghf-accent-subtle: var(--bgColor-accent-muted, rgba(56, 139, 253, 0.1));
  --ghf-danger: var(--fgColor-danger, #f85149);
  --ghf-danger-subtle: var(--bgColor-danger-muted, rgba(248, 81, 73, 0.1));
  --ghf-border: var(--borderColor-default, #3d444d);
  --ghf-hairline: var(--borderColor-muted, rgba(61, 68, 77, 0.7));
  --ghf-control-border: var(--control-borderColor-rest, #3d444d);
  --ghf-btn-bg: var(--button-default-bgColor-rest, #212830);
  --ghf-btn-hover: var(--button-default-bgColor-hover, #262c36);
  --ghf-primary: var(--button-primary-bgColor-rest, #238636);
  --ghf-primary-hover: var(--button-primary-bgColor-hover, #29903b);
  --ghf-primary-fg: var(--button-primary-fgColor-rest, #ffffff);
  --ghf-neutral: var(--bgColor-neutral-muted, rgba(101, 108, 118, 0.2));
  --ghf-focus: var(--focus-outlineColor, #1f6feb);
  --ghf-font: var(--fontStack-system, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
  --ghf-shadow: var(--shadow-floating-large, 0 0 0 1px #3d444d, 0 24px 48px 0 #010409);
  --ghf-radius: 8px;
  --ghf-radius-sm: 6px;
  --ghf-radius-pill: 999px;
}

${F}, .ghf-launcher-item {
  font-family: var(--fontStack-system, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
}

${P}, ${P} *, ${P} *::before, ${P} *::after,
${F}, ${F} * { box-sizing: border-box; }

${P} svg, ${F} svg { fill: currentColor; color: inherit; flex-shrink: 0; }

/* Panel: a right drawer on desktop, a bottom sheet on phones. */
${P} {
  position: fixed;
  top: 0; right: 0; bottom: 0; left: auto;
  width: min(440px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  margin: 0; padding: 0;
  border: 0; border-left: 1px solid var(--ghf-border);
  background: var(--ghf-bg);
  color: var(--ghf-fg);
  font-family: var(--ghf-font);
  font-size: 14px; line-height: 1.5;
  accent-color: var(--ghf-accent);
  box-shadow: var(--ghf-shadow);
  overflow: hidden;
  overscroll-behavior: contain;
  transform: translateX(100%);
  opacity: 0;
  transition:
    transform .22s cubic-bezier(0.16, 1, 0.3, 1),
    opacity .18s ease,
    display .22s allow-discrete,
    overlay .22s allow-discrete;
}
${P}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P}[open] { transform: translateX(100%); opacity: 0; } }

${P}::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
  background: var(--overlay-backdrop-bgColor, rgba(1, 4, 9, 0.5));
  opacity: 0;
  cursor: pointer;
  pointer-events: auto;
  transition: opacity .2s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

/* Prevent the GitHub page from scrolling behind the modal. */
html:has(${P}[open]) { overflow: hidden; }

${P} .ghf-drag-handle { display: none; }

@media (max-width: 767px) {
  ${P} {
    top: auto; bottom: 0; left: 0; right: 0;
    width: 100%; max-width: 100vw;
    height: 85dvh; max-height: 88dvh;
    margin: 0;
    border-left: none; border-top: 1px solid var(--ghf-border);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 32px rgba(1, 4, 9, 0.28);
    transform: translateY(100%);
    opacity: 0;
  }
  ${P}[open] { transform: translateY(0); opacity: 1; }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }

  ${P} .ghf-drag-handle {
    display: block;
    width: 36px; height: 4px;
    margin: 2px auto 6px;
    border-radius: 999px;
    background: var(--ghf-border);
  }

  /* 16px stops iOS Safari from zooming the viewport on focus. */
  ${P} .ghf-input,
  ${P} .ghf-date,
  ${P} .ghf-sort-select {
    font-size: 16px;
  }

  ${P} .ghf-head { padding: 6px 16px 8px; }
  ${P} .ghf-body {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  ${P} .ghf-foot {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
}

/* Coarse pointers (tablets and touch laptops) get real touch targets regardless of width. */
@media (pointer: coarse) {
  ${P} .ghf-input,
  ${P} .ghf-date,
  ${P} .ghf-sort-select { height: 36px; }
  ${P} .ghf-clear-btn { width: 30px; height: 30px; }
  ${P} .ghf-icon-btn { width: 36px; height: 36px; }
  ${P} .ghf-chip { height: 30px; padding: 0 11px; font-size: 12px; }
  ${P} .ghf-mini-chip { height: 28px; padding: 0 8px; font-size: 11.5px; }
  ${P} .ghf-btn { height: 38px; font-size: 13.5px; }
  ${P} .ghf-preset-chip-item,
  ${P} .ghf-preset-apply-btn,
  ${P} .ghf-preset-run-btn,
  ${P} .ghf-preset-del-btn { height: 36px; }
  ${P} .ghf-preset-run-btn { width: 34px; }
  ${P} .ghf-preset-del-btn { width: 30px; padding: 0 7px; }
  ${P} .ghf-slider { height: 38px; }
  ${P} .ghf-slider-track { top: 16px; height: 6px; }
  ${P} .ghf-slider-thumb {
    top: 6px; width: 20px; height: 20px; margin-left: -10px;
  }
  ${P} .ghf-slider-thumb::before {
    content: '';
    position: absolute;
    top: -12px; left: -12px; right: -12px; bottom: -12px;
    border-radius: 50%;
  }
  ${P} .ghf-tape-chip { min-height: 26px; }
  ${P} .ghf-tape-chip-x { width: 18px; height: 18px; }
  ${P} .ghf-tape-copy { height: 28px; }
}

/* ------------------------------- shell ---------------------------------- */

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

${P} .ghf-head {
  flex: 0 0 auto;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ghf-hairline);
}
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
${P} .ghf-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
${P} .ghf-brand h2 {
  margin: 0; color: var(--ghf-fg);
  font-size: 14px; font-weight: 600; line-height: 21px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
${P} .ghf-brand-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: var(--ghf-radius-sm);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent);
}
${P} .ghf-pill {
  min-width: 18px; height: 18px; padding: 0 6px; border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent);
  font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: center; justify-content: center;
}
${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0;
  border: 1px solid transparent; border-radius: var(--ghf-radius-sm);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  transition: background .12s, color .12s;
}
@media (hover: hover) {
  ${P} .ghf-icon-btn:hover { background: var(--ghf-neutral); color: var(--ghf-fg); }
}

/* Scrollable body and Primer-style cards. */
${P} .ghf-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto; overscroll-behavior: contain;
  padding: 12px 16px 16px;
  display: flex; flex-direction: column; gap: 10px;
  scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
  -webkit-overflow-scrolling: touch;
}
${P} .ghf-card {
  padding: 12px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-card);
}
${P} .ghf-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 8px;
}
${P} .ghf-card-title {
  display: flex; align-items: center; gap: 6px; margin: 0;
  color: var(--ghf-fg); font-size: 12px; font-weight: 600; line-height: 18px;
}
${P} .ghf-card-title svg { color: var(--ghf-muted); }

/* ------------------------------- fields --------------------------------- */

${P} .ghf-fields { display: flex; flex-direction: column; gap: 10px; }
${P} .ghf-field { display: flex; flex-direction: column; gap: 4px; }
${P} .ghf-label { color: var(--ghf-fg); font-size: 12px; font-weight: 500; line-height: 18px; }
${P} .ghf-input-wrap {
  display: flex; align-items: center; width: 100%;
  border: 1px solid var(--ghf-control-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-bg);
  transition: border-color .12s, box-shadow .12s;
}
${P} .ghf-input-wrap:focus-within {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 3px var(--ghf-accent-subtle);
}
${P} .ghf-input {
  flex: 1; min-width: 0; height: 32px;
  padding: 0 10px; border: 0; outline: 0;
  background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 14px;
}
${P} .ghf-input::placeholder { color: var(--ghf-muted); opacity: 1; }
${P} .ghf-clear-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; margin-right: 4px; padding: 0;
  border: 0; border-radius: 4px;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
@media (hover: hover) {
  ${P} .ghf-clear-btn:hover { background: var(--ghf-neutral); color: var(--ghf-fg); }
}

/* Quick chips */
${P} .ghf-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
${P} .ghf-chip {
  display: inline-flex; align-items: center;
  height: 24px; padding: 0 9px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); color: var(--ghf-muted);
  font: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: border-color .1s, color .1s, background .1s;
}
${P} .ghf-chip.ghf-chip-active {
  border-color: var(--ghf-accent); background: var(--ghf-accent-subtle);
  color: var(--ghf-accent); font-weight: 600;
}
@media (hover: hover) {
  ${P} .ghf-chip:hover { border-color: var(--ghf-accent); color: var(--ghf-fg); }
}

/* ------------------------------- sliders -------------------------------- */

${P} .ghf-slider-row { margin-top: 8px; }
${P} .ghf-slider-row:first-of-type { margin-top: 0; }
${P} .ghf-slider-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 2px;
}
${P} .ghf-slider-title-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
${P} .ghf-slider-title {
  display: flex; align-items: center; gap: 5px;
  color: var(--ghf-fg); font-size: 12px; font-weight: 600;
}
${P} .ghf-slider-title svg { color: var(--ghf-muted); }
${P} .ghf-mini-chips { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
${P} .ghf-mini-chip {
  display: inline-flex; align-items: center;
  height: 22px; padding: 0 7px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); color: var(--ghf-muted);
  font: inherit; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: border-color .1s, color .1s, background .1s;
}
${P} .ghf-mini-chip.ghf-mini-chip-active {
  border-color: var(--ghf-accent); background: var(--ghf-accent-subtle);
  color: var(--ghf-accent); font-weight: 600;
}
@media (hover: hover) {
  ${P} .ghf-mini-chip:hover { border-color: var(--ghf-accent); color: var(--ghf-fg); }
}
${P} .ghf-slider-readout-group { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
${P} .ghf-readout {
  padding: 1px 6px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken); color: var(--ghf-fg);
  font-family: var(--ghf-mono); font-size: 11px; line-height: 18px;
  white-space: nowrap;
}
${P} .ghf-slider {
  position: relative; height: 28px;
  cursor: pointer; touch-action: none; user-select: none;
}
${P} .ghf-slider-track {
  position: absolute; left: 8px; right: 8px; top: 11px; height: 6px;
  border-radius: 999px;
  background: var(--ghf-hairline);
  border: 1px solid var(--ghf-border);
  pointer-events: none;
}
${P} .ghf-slider-fill {
  position: absolute; top: 0; bottom: 0;
  border-radius: 999px; background: var(--ghf-accent); pointer-events: none;
}
${P} .ghf-slider-thumb {
  position: absolute; top: 6px;
  width: 16px; height: 16px; margin-left: -8px;
  border-radius: 50%;
  background: #ffffff; border: 2px solid var(--ghf-accent);
  box-shadow: 0 1px 4px rgba(1, 4, 9, 0.45);
  cursor: grab; outline: none; touch-action: none;
  transition: transform .1s, box-shadow .1s, border-color .1s;
}
${P} .ghf-slider-thumb:focus-visible,
${P} .ghf-slider-thumb.ghf-thumb-active {
  cursor: grabbing; transform: scale(1.2);
  border-color: var(--ghf-accent); background: #ffffff;
  box-shadow: 0 0 0 4px var(--ghf-accent-subtle), 0 2px 8px rgba(1, 4, 9, 0.5);
  outline: 2px solid var(--ghf-focus); outline-offset: 2px;
}
@media (hover: hover) {
  ${P} .ghf-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px var(--ghf-accent-subtle), 0 2px 6px rgba(1, 4, 9, 0.5);
  }
}

/* -------------------------------- dates --------------------------------- */

${P} .ghf-dates {
  display: grid; grid-template-columns: 1fr 14px 1fr; align-items: center;
  gap: 6px; margin-top: 4px;
}
${P} .ghf-date {
  width: 100%; height: 32px; padding: 0 8px;
  border: 1px solid var(--ghf-control-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-bg); color: var(--ghf-fg);
  font: inherit; font-size: 13px; outline: 0;
}
${P} .ghf-date:focus {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 3px var(--ghf-accent-subtle);
}
${P} .ghf-date-sep { text-align: center; color: var(--ghf-muted); font-size: 11px; }

/* -------------------------------- sort ---------------------------------- */

${P} .ghf-sort-wrap { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; }
${P} .ghf-sort-select {
  appearance: none; height: 28px; padding: 0 24px 0 8px;
  border: 1px solid var(--ghf-control-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 12px; cursor: pointer; outline: 0;
}
${P} .ghf-sort-wrap svg { position: absolute; right: 7px; color: var(--ghf-muted); pointer-events: none; }

/* ------------------------------- presets -------------------------------- */

${P} .ghf-preset-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
${P} .ghf-preset-chip-item {
  display: inline-flex; align-items: center; max-width: 100%;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); overflow: hidden;
  transition: border-color .1s;
}
@media (hover: hover) {
  ${P} .ghf-preset-chip-item:hover { border-color: var(--ghf-accent); }
}
${P} .ghf-preset-apply-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 9px;
  border: 0; background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (hover: hover) {
  ${P} .ghf-preset-apply-btn:hover { color: var(--ghf-accent); }
}
${P} .ghf-preset-run-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 28px; border: 0; border-left: 1px solid var(--ghf-border);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
${P} .ghf-preset-del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 7px; height: 28px;
  border: 0; border-left: 1px solid var(--ghf-border);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
@media (hover: hover) {
  ${P} .ghf-preset-run-btn:hover { color: var(--ghf-accent); background: var(--ghf-accent-subtle); }
  ${P} .ghf-preset-del-btn:hover { color: var(--ghf-danger); background: var(--ghf-danger-subtle); }
}
${P} .ghf-del-confirm { font-size: 9px; font-weight: 700; color: var(--ghf-danger); text-transform: uppercase; }
${P} .ghf-preset-save-row { display: flex; gap: 8px; align-items: center; }
${P} .ghf-error-msg { margin: 6px 0 0; color: var(--ghf-danger); font-size: 12px; }

/* --------------------------- footer & query ------------------------------ */

${P} .ghf-foot {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--ghf-border);
  background: var(--ghf-card);
}
${P} .ghf-tape-box {
  padding: 7px 9px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken);
}
${P} .ghf-tape-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 4px;
}
${P} .ghf-tape-label {
  color: var(--ghf-muted); font-size: 10px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase;
}
${P} .ghf-tape-copy { height: 22px; padding: 0 7px; font-size: 10.5px; }
${P} .ghf-tape-chips {
  display: flex; flex-wrap: wrap; gap: 4px;
  max-height: 54px; overflow-y: auto; scrollbar-width: thin;
}
${P} .ghf-tape-chip {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 20px; padding: 0 4px 0 6px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card); color: var(--ghf-fg);
  font-family: var(--ghf-mono); font-size: 10.5px;
}
${P} .ghf-tape-chip-key { color: var(--ghf-accent); font-weight: 600; }
${P} .ghf-tape-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; padding: 0;
  border: 0; border-radius: 50%;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
@media (hover: hover) {
  ${P} .ghf-tape-chip-x:hover { background: var(--ghf-danger-subtle); color: var(--ghf-danger); }
}
${P} .ghf-tape-empty { color: var(--ghf-muted); font-size: 12px; font-style: italic; }
${P} .ghf-tape-hide {
  display: flex; align-items: center; gap: 5px;
  margin-top: 5px; padding-top: 5px;
  border-top: 1px dashed var(--ghf-border);
  color: var(--ghf-muted); font-size: 11px;
}
${P} .ghf-tape-hide svg { color: var(--ghf-muted); }
${P} .ghf-tape-hide b { color: var(--ghf-fg); font-weight: 600; }

/* ------------------------------- actions -------------------------------- */

${P} .ghf-actions { display: grid; grid-template-columns: 96px 1fr; gap: 8px; }
${P} .ghf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  height: 32px; padding: 0 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background .1s, border-color .1s;
}
@media (hover: hover) {
  ${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
}
${P} .ghf-btn-primary {
  border-color: var(--ghf-primary); background: var(--ghf-primary);
  color: var(--ghf-primary-fg); font-weight: 600;
}
@media (hover: hover) {
  ${P} .ghf-btn-primary:hover { border-color: var(--ghf-primary-hover); background: var(--ghf-primary-hover); }
}
${P} .ghf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Focus rings for every interactive control, not just inputs. */
${P} :focus-visible, ${F}:focus-visible {
  outline: 2px solid var(--ghf-focus, var(--focus-outlineColor, #1f6feb));
  outline-offset: 2px;
}
${P} .ghf-input:focus-visible,
${P} .ghf-date:focus-visible,
${P} .ghf-sort-select:focus-visible { outline: none; }

/* ------------------------------ launcher -------------------------------- */

${F} {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0;
  border: 1px solid var(--borderColor-default, #3d444d);
  border-radius: var(--ghf-radius-pill, 999px);
  background: var(--button-default-bgColor-rest, #212830);
  color: var(--fgColor-default, #f0f6fc);
  box-shadow: var(--shadow-resting-medium, 0 3px 6px rgba(1, 4, 9, 0.6));
  cursor: pointer; z-index: 9999;
  transition: transform .12s, border-color .12s, background .12s;
}
${F} svg { color: var(--fgColor-accent, #4493f8); }
${F} .ghf-fab-text { display: none; }
${F} .ghf-fab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: var(--ghf-radius-pill, 999px);
  background: var(--fgColor-accent, #4493f8); color: var(--fgColor-onEmphasis, #ffffff);
  font-size: 9px; font-weight: 700;
}
${F}[data-placement="floating"] .ghf-fab-badge {
  position: absolute; top: -5px; right: -5px;
  border: 2px solid var(--bgColor-default, #0d1117);
}

/* Desktop/tablet: a native ActionList row under the “Filter by” heading. */
.ghf-launcher-item { margin: 0 0 4px; }
.ghf-launcher-row { display: flex; padding: 8px 0 0; }
${F}[data-placement="sidebar"] {
  position: static;
  display: flex; align-items: center; justify-content: flex-start;
  gap: 8px; width: 100%; height: 32px;
  padding: 6px 8px; margin: 0;
  border: 0; border-radius: var(--ghf-radius-sm, 6px);
  background: transparent; color: var(--fgColor-default, #f0f6fc);
  box-shadow: none;
  font-size: 14px; font-weight: 400; line-height: 21px; text-align: left;
  cursor: pointer;
}
${F}[data-placement="sidebar"] svg { color: var(--fgColor-accent, #4493f8); }
${F}[data-placement="sidebar"] .ghf-fab-text {
  display: inline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
${F}[data-placement="sidebar"] .ghf-fab-badge {
  margin-left: auto;
  background: var(--bgColor-accent-muted, rgba(56, 139, 253, 0.1));
  color: var(--fgColor-accent, #4493f8);
}
@media (hover: hover) {
  ${F}[data-placement="sidebar"]:hover {
    background: var(--bgColor-neutral-muted, rgba(101, 108, 118, 0.2));
  }
  ${F}[data-placement="sidebar"]:hover .ghf-fab-text { color: var(--fgColor-accent, #4493f8); }
}

/* Phone: a native-looking filter pill on its own row below the toolbar. */
${F}[data-placement="row"] {
  position: static;
  display: inline-flex; align-items: center; justify-content: flex-start;
  gap: 7px; width: auto; height: 32px;
  padding: 0 12px; margin: 0;
  border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, #3d444d));
  border-radius: var(--ghf-radius-sm, 6px);
  background: var(--button-default-bgColor-rest, #212830);
  color: var(--fgColor-default, #f0f6fc);
  box-shadow: none;
  font-size: 14px; font-weight: 500; line-height: 20px;
  cursor: pointer;
}
${F}[data-placement="row"] .ghf-fab-text { display: inline; }
${F}[data-placement="row"] .ghf-fab-badge {
  margin-left: 1px;
  background: var(--bgColor-accent-muted, rgba(56, 139, 253, 0.1));
  color: var(--fgColor-accent, #4493f8);
}
@media (hover: hover) {
  ${F}[data-placement="row"]:hover { background: var(--button-default-bgColor-hover, #262c36); }
}

/* Tablet/phone: a square button beside GitHub's native Filter trigger. */
${F}[data-placement="toolbar"] {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 28px; padding: 0;
  border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, #3d444d));
  border-radius: var(--ghf-radius-sm, 6px);
  background: var(--button-default-bgColor-rest, #212830);
  color: var(--fgColor-default, #f0f6fc);
  box-shadow: none;
  cursor: pointer;
}
${F}[data-placement="toolbar"] .ghf-fab-text { display: none; }
${F}[data-placement="toolbar"] .ghf-fab-badge {
  position: absolute; top: -7px; right: -7px;
  border: 2px solid var(--bgColor-default, #0d1117);
}
@media (hover: hover) {
  ${F}[data-placement="toolbar"]:hover { background: var(--button-default-bgColor-hover, #262c36); }
}

${F}[data-placement="floating"]:hover { transform: translateY(-2px); border-color: var(--fgColor-accent, #4493f8); }

/* Hide the launcher while the modal is open. */
${F}[aria-expanded="true"],
body:has(${P}[open]) ${F},
body:has(${P}[open]) .ghf-launcher-item,
body:has(${P}[open]) .ghf-launcher-row { display: none !important; }

.ghf-hidden { display: none !important; }

.ghf-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

@media (forced-colors: active) {
  ${P}, ${P} .ghf-card, ${P} .ghf-input-wrap, ${P} .ghf-tape-box { border-color: CanvasText; }
  ${P} .ghf-btn, ${P} .ghf-chip, ${P} .ghf-mini-chip { border-color: ButtonText; }
}

@media print { ${F}, ${P}, .ghf-launcher-item { display: none !important; } }
@media (prefers-reduced-motion: reduce) {
  ${P}, ${P}::backdrop, ${F}, ${P} * { transition-duration: 0.01ms !important; }
}
`;

export function injectStyles() {
  if (document.getElementById(IDS.style)) return;
  const style = document.createElement('style');
  style.id = IDS.style;
  style.textContent = CSS;
  document.head.append(style);
}
