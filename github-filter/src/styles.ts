import { IDS } from './config';

const P = `#${IDS.panel}`;
const F = `#${IDS.fab}`;

/**
 * Design notes:
 * - `auto` reads GitHub's own Primer custom properties, so the panel is the same
 *   surface as the page it overlays. Explicit light/dark override with Primer's
 *   literal palette values.
 * - One canvas, hairlines instead of stacked bands. The panel is a query editor:
 *   monospace key gutter, live query tape, no card soup.
 * - No backdrop-filter anywhere. A 440px full-height blurred surface repainted on
 *   every scroll frame was the bulk of the old build's jank.
 */
const CSS = `
${P}, ${F} {
  --ghf-canvas: var(--overlay-bgColor, var(--bgColor-default, var(--color-canvas-default, #ffffff)));
  --ghf-sunken: var(--bgColor-inset, var(--color-canvas-inset, #f6f8fa));
  --ghf-raised: var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa));
  --ghf-fg: var(--fgColor-default, var(--color-fg-default, #1f2328));
  --ghf-muted: var(--fgColor-muted, var(--color-fg-muted, #59636e));
  --ghf-accent: var(--fgColor-accent, var(--color-accent-fg, #0969da));
  --ghf-danger: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
  --ghf-border: var(--borderColor-default, var(--color-border-default, #d1d9e0));
  --ghf-hairline: var(--borderColor-muted, var(--color-border-muted, #eaeef2));
  --ghf-hover: var(--control-transparent-bgColor-hover, var(--color-neutral-muted, rgba(175, 184, 193, .16)));
  --ghf-selected: var(--bgColor-neutral-muted, var(--color-neutral-muted, rgba(175, 184, 193, .22)));
  --ghf-btn-bg: var(--button-default-bgColor-rest, var(--color-btn-bg, #f6f8fa));
  --ghf-btn-hover: var(--button-default-bgColor-hover, var(--color-btn-hover-bg, #eef1f4));
  --ghf-primary: var(--button-primary-bgColor-rest, var(--color-btn-primary-bg, #1f883d));
  --ghf-primary-hover: var(--button-primary-bgColor-hover, var(--color-btn-primary-hover-bg, #1a7f37));
  --ghf-shadow: var(--shadow-floating-large, 0 12px 28px rgba(31, 35, 40, .18));
  --ghf-radius: 6px;
  --ghf-font: var(--fontStack-sansSerif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
}

${P}[data-theme="light"], ${F}[data-theme="light"] {
  color-scheme: light;
  --ghf-canvas: #ffffff; --ghf-sunken: #f6f8fa; --ghf-raised: #f6f8fa;
  --ghf-fg: #1f2328; --ghf-muted: #59636e; --ghf-accent: #0969da; --ghf-danger: #d1242f;
  --ghf-border: #d1d9e0; --ghf-hairline: #eaeef2;
  --ghf-hover: #f6f8fa; --ghf-selected: #eaeef2;
  --ghf-btn-bg: #f6f8fa; --ghf-btn-hover: #eef1f4;
  --ghf-primary: #1f883d; --ghf-primary-hover: #1a7f37;
  --ghf-shadow: 0 12px 28px rgba(31, 35, 40, .18);
}

${P}[data-theme="dark"], ${F}[data-theme="dark"] {
  color-scheme: dark;
  --ghf-canvas: #151b23; --ghf-sunken: #0d1117; --ghf-raised: #1c2128;
  --ghf-fg: #f0f6fc; --ghf-muted: #9198a1; --ghf-accent: #4493f8; --ghf-danger: #f85149;
  --ghf-border: #3d444d; --ghf-hairline: #262c36;
  --ghf-hover: #1c2128; --ghf-selected: #262c36;
  --ghf-btn-bg: #212830; --ghf-btn-hover: #262c36;
  --ghf-primary: #238636; --ghf-primary-hover: #29903b;
  --ghf-shadow: 0 18px 40px rgba(1, 4, 9, .7);
}

/* ---------- panel ---------- */

${P} {
  width: min(440px, 100vw);
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
  box-shadow: var(--ghf-shadow);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .24s cubic-bezier(.2, 0, 0, 1), opacity .2s ease,
              display .24s allow-discrete, overlay .24s allow-discrete;
}
${P}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P}[open] { transform: translateX(100%); opacity: 0; } }

${P}::backdrop {
  background: rgba(1, 4, 9, .45);
  opacity: 0;
  transition: opacity .2s ease, display .24s allow-discrete, overlay .24s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

${P} *, ${P} *::before, ${P} *::after { box-sizing: border-box; }
${P} ::selection { background: var(--ghf-selected); color: var(--ghf-fg); }

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

@media (max-width: 767px) {
  ${P} {
    width: 100vw;
    height: auto;
    max-height: 88dvh;
    margin: auto 0 0;
    border-left: none;
    border-top: 1px solid var(--ghf-border);
    border-radius: 14px 14px 0 0;
    transform: translateY(100%);
  }
  ${P}[open] { transform: translateY(0); }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }
}

/* ---------- header ---------- */

${P} .ghf-head {
  flex: 0 0 auto;
  padding: 14px 18px 0;
  border-bottom: 1px solid var(--ghf-hairline);
}
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
${P} h2 {
  display: flex; align-items: center; gap: 8px; margin: 0;
  font-size: 14px; font-weight: 600; letter-spacing: -.003em;
}
${P} h2 svg { color: var(--ghf-muted); }
${P} .ghf-titlebar nav { display: flex; gap: 2px; }

${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid transparent; border-radius: var(--ghf-radius);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 600;
  transition: background .12s ease, color .12s ease, transform .08s ease;
}
${P} .ghf-icon-btn svg { fill: currentColor; }
${P} .ghf-icon-btn:hover { background: var(--ghf-btn-hover); color: var(--ghf-fg); }
${P} .ghf-icon-btn:active { transform: scale(.94); }
${P} .ghf-icon-btn.ghf-danger { width: 26px; height: 26px; }
${P} .ghf-icon-btn.ghf-danger:hover { background: var(--ghf-danger); color: #fff; }
${P} .ghf-icon-btn.ghf-confirm { width: auto; padding: 0 6px; color: var(--ghf-danger); }
${P} .ghf-icon-btn.ghf-confirm:hover { background: var(--ghf-danger); color: #fff; }

${P} .ghf-tabs { display: flex; gap: 20px; margin-top: 10px; }
${P} .ghf-tabs button {
  position: relative; display: inline-flex; align-items: center;
  padding: 8px 1px 10px; border: 0; background: none;
  color: var(--ghf-muted); font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
  transition: color .12s ease;
}
${P} .ghf-tabs button:hover { color: var(--ghf-fg); }
${P} .ghf-tabs button[aria-selected="true"] { color: var(--ghf-fg); font-weight: 600; }
${P} .ghf-tabs button[aria-selected="true"]::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -1px;
  height: 2px; border-radius: 2px 2px 0 0; background: var(--ghf-accent);
}
${P} .ghf-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 17px; height: 17px; margin-left: 6px; padding: 0 5px;
  border-radius: 999px; background: var(--ghf-selected); color: var(--ghf-muted);
  font-size: 10.5px; font-weight: 600; font-variant-numeric: tabular-nums;
}

/* ---------- body ---------- */

${P} .ghf-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  padding: 2px 18px 22px;
  scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
}
${P} [role="tabpanel"][hidden] { display: none; }

${P} .ghf-sec { padding-top: 16px; }
${P} .ghf-sec-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 22px; margin-bottom: 5px;
}
${P} .ghf-sec-title {
  margin: 0; color: var(--ghf-muted);
  font-size: 10.5px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
}

/* ---------- scope switch ---------- */

${P} .ghf-scope {
  display: flex; gap: 2px; margin: 0; min-width: 0; padding: 3px;
  border: 1px solid var(--ghf-hairline); border-radius: 8px; background: var(--ghf-sunken);
  overflow-x: auto; scrollbar-width: none;
}
${P} .ghf-sr {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip-path: inset(50%); border: 0; white-space: nowrap;
}
${P} .ghf-scope::-webkit-scrollbar { display: none; }
${P} .ghf-scope button {
  flex: 0 0 auto; padding: 5px 9px; border: 0; border-radius: 6px;
  background: transparent; color: var(--ghf-muted);
  font: inherit; font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P} .ghf-scope button:hover { color: var(--ghf-fg); }
${P} .ghf-scope button[aria-pressed="true"] {
  background: var(--ghf-canvas); color: var(--ghf-fg); font-weight: 600;
  box-shadow: 0 1px 2px rgba(31, 35, 40, .14), 0 0 0 1px var(--ghf-hairline);
}

/* ---------- query rows ---------- */

${P} .ghf-rows { border-top: 1px solid var(--ghf-hairline); }
${P} .ghf-row {
  display: grid; grid-template-columns: 70px minmax(0, 1fr) 24px; align-items: center;
  min-height: 38px; margin: 0 -6px; padding: 0 6px;
  border-bottom: 1px solid var(--ghf-hairline); border-radius: 5px;
  transition: background .12s ease, box-shadow .12s ease;
}
${P} .ghf-row:hover { background: var(--ghf-hover); }
${P} .ghf-row:focus-within { background: var(--ghf-hover); box-shadow: inset 0 0 0 2px var(--ghf-accent); }
${P} .ghf-row--lg { min-height: 46px; }
${P} .ghf-key {
  overflow: hidden; padding-right: 10px;
  color: var(--ghf-muted); font-family: var(--ghf-mono); font-size: 10.5px; line-height: 1;
  text-align: right; text-overflow: ellipsis; white-space: nowrap;
  cursor: text; user-select: none;
  transition: color .12s ease;
}
${P} .ghf-row:hover .ghf-key, ${P} .ghf-row:focus-within .ghf-key { color: var(--ghf-fg); }
${P} .ghf-colon { opacity: .4; }
${P} .ghf-input {
  width: 100%; min-width: 0; padding: 9px 0;
  border: 0; outline: 0; background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 13px; line-height: 20px;
}
${P} .ghf-row--lg .ghf-input { padding: 12px 0; font-size: 14px; }
${P} .ghf-input::placeholder { color: var(--ghf-muted); opacity: 1; }
${P} .ghf-clear {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; padding: 0;
  border: 0; border-radius: 4px; background: transparent; color: var(--ghf-muted); cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P} .ghf-clear svg { fill: currentColor; }
${P} .ghf-clear:hover { background: var(--ghf-selected); color: var(--ghf-fg); }

${P} .ghf-hint {
  margin: 7px 0 0; color: var(--ghf-muted);
  font-size: 10.5px; line-height: 1.5;
}
${P} .ghf-hint code {
  padding: 0 3px; border: 1px solid var(--ghf-hairline); border-radius: 3px;
  background: var(--ghf-sunken); font-family: var(--ghf-mono); font-size: 10px;
}

${P} .ghf-group + .ghf-group { margin-top: 14px; }
${P} .ghf-group-title {
  margin: 0 0 3px; color: var(--ghf-muted);
  font-size: 10.5px; font-weight: 500; letter-spacing: .01em;
}

/* ---------- sort ---------- */

${P} .ghf-sort { position: relative; display: inline-flex; align-items: center; gap: 5px; }
${P} .ghf-sort-label { color: var(--ghf-muted); font-size: 10.5px; }
${P} .ghf-sort select {
  appearance: none; padding: 3px 16px 3px 3px;
  border: 0; border-radius: 4px; outline: 0; background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
}
${P} .ghf-sort svg { position: absolute; right: 1px; color: var(--ghf-muted); pointer-events: none; fill: currentColor; }

/* ---------- footer ---------- */

${P} .ghf-foot {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 10px;
  padding: 10px 18px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ghf-border); background: var(--ghf-raised);
}

${P} .ghf-tape {
  padding: 7px 9px 8px;
  border: 1px solid var(--ghf-hairline); border-radius: 8px; background: var(--ghf-sunken);
}
${P} .ghf-tape-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
${P} .ghf-tape-label {
  color: var(--ghf-muted);
  font-size: 9.5px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase;
}
${P} .ghf-copy {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px;
  border: 0; border-radius: 4px; background: none; color: var(--ghf-muted);
  font: inherit; font-size: 10.5px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P} .ghf-copy svg { fill: currentColor; }
${P} .ghf-copy:hover:not(:disabled) { background: var(--ghf-selected); color: var(--ghf-fg); }
${P} .ghf-copy:disabled { opacity: .55; cursor: default; }

${P} .ghf-tape-body {
  max-height: 54px; margin: 0; overflow-y: auto; overflow-wrap: anywhere;
  color: var(--ghf-fg); font-family: var(--ghf-mono); font-size: 11.5px; line-height: 1.6;
  scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
}
${P} .ghf-tape-empty { color: var(--ghf-muted); font-family: var(--ghf-font); font-size: 11.5px; }
${P} .ghf-tok-key { color: var(--ghf-accent); }
${P} .ghf-tok-neg { color: var(--ghf-muted); }
${P} .ghf-tape-hide {
  margin: 5px 0 0; padding-top: 5px;
  border-top: 1px dashed var(--ghf-hairline); color: var(--ghf-muted);
  font-size: 10.5px; line-height: 1.4;
}
${P} .ghf-tape-hide b { color: var(--ghf-fg); font-family: var(--ghf-mono); font-weight: 500; }

${P} .ghf-actions { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 8px; }
${P} .ghf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 34px; padding: 0 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease, transform .08s ease;
}
${P} .ghf-btn svg { fill: currentColor; }
${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P} .ghf-btn:active { transform: translateY(1px); }
${P} .ghf-btn.ghf-primary {
  border-color: var(--ghf-primary); background: var(--ghf-primary); color: #fff; font-weight: 600;
  box-shadow: 0 1px 2px rgba(31, 35, 40, .18);
}
${P} .ghf-btn.ghf-primary:hover { border-color: var(--ghf-primary-hover); background: var(--ghf-primary-hover); }
${P} .ghf-btn:disabled, ${P} .ghf-btn.ghf-primary:disabled {
  border-color: var(--ghf-border); background: var(--ghf-btn-bg); color: var(--ghf-muted);
  box-shadow: none; cursor: not-allowed; transform: none;
}
${P} .ghf-btn.ghf-compact { flex: 0 0 auto; }

/* ---------- presets ---------- */

${P} .ghf-save { display: flex; gap: 8px; }
${P} .ghf-name {
  flex: 1 1 auto; min-width: 0; height: 34px; padding: 0 10px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-canvas); color: var(--ghf-fg);
  font: inherit; font-size: 12.5px; outline: 0;
  transition: border-color .12s ease, box-shadow .12s ease;
}
${P} .ghf-name::placeholder { color: var(--ghf-muted); opacity: 1; }
${P} .ghf-name:focus { border-color: var(--ghf-accent); box-shadow: inset 0 0 0 1px var(--ghf-accent); }
${P} .ghf-name:focus-visible { outline: none; }
${P} .ghf-name[aria-invalid="true"] { border-color: var(--ghf-danger); box-shadow: inset 0 0 0 1px var(--ghf-danger); }
${P} .ghf-error { min-height: 17px; margin: 5px 1px 4px; color: var(--ghf-danger); font-size: 11px; line-height: 1.4; }

${P} .ghf-presets { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--ghf-hairline); }
${P} .ghf-preset {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px;
  margin: 0 -6px; padding: 9px 6px;
  border-bottom: 1px solid var(--ghf-hairline); border-radius: 5px;
  transition: background .12s ease;
}
${P} .ghf-preset:hover { background: var(--ghf-hover); }
${P} .ghf-preset-main {
  display: flex; flex-direction: column; gap: 3px; min-width: 0;
  padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
${P} .ghf-preset-name {
  overflow: hidden; color: var(--ghf-fg);
  font-size: 12.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap;
  transition: color .12s ease;
}
${P} .ghf-preset-main:hover .ghf-preset-name { color: var(--ghf-accent); }
${P} .ghf-preset-query {
  overflow: hidden; color: var(--ghf-muted);
  font-family: var(--ghf-mono); font-size: 10.5px; line-height: 1.4;
  text-overflow: ellipsis; white-space: nowrap;
}
${P} .ghf-preset-side { display: flex; align-items: center; gap: 1px; }
${P} .ghf-run {
  display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 8px;
  border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--ghf-muted);
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}
${P} .ghf-run svg { fill: currentColor; }
${P} .ghf-run:hover { border-color: var(--ghf-border); background: var(--ghf-canvas); color: var(--ghf-fg); }

${P} .ghf-empty {
  margin-top: 10px; padding: 28px 20px;
  border: 1px dashed var(--ghf-border); border-radius: 10px;
  color: var(--ghf-muted); font-size: 12px; line-height: 1.55; text-align: center;
}
${P} .ghf-empty > svg { margin-bottom: 6px; color: var(--ghf-muted); fill: currentColor; opacity: .8; }
${P} .ghf-empty-title { margin: 4px 0 3px; color: var(--ghf-fg); font-size: 13px; font-weight: 600; }
${P} .ghf-empty p { margin: 0 auto 13px; max-width: 30ch; }
${P} .ghf-empty .ghf-btn { height: 30px; font-size: 12px; }

/* ---------- focus ---------- */

${P} :is(button, select, input):focus-visible {
  outline: 2px solid var(--ghf-accent); outline-offset: 1px;
}
${P} .ghf-row input:focus-visible { outline: none; }

/* ---------- launcher ---------- */

${F} {
  position: fixed;
  right: calc(18px + env(safe-area-inset-right, 0px));
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  display: inline-flex; align-items: center; justify-content: center;
  height: 44px; min-width: 44px; padding: 0 13px;
  border: 1px solid var(--ghf-border); border-radius: 999px;
  background: var(--ghf-canvas); color: var(--ghf-muted);
  box-shadow: var(--ghf-shadow); cursor: pointer;
  z-index: 9999;
  transition: color .15s ease, border-color .15s ease, box-shadow .15s ease;
}
${F} svg { flex: 0 0 auto; fill: currentColor; transition: color .15s ease; }
${F}:hover { color: var(--ghf-fg); border-color: var(--ghf-muted); }
${F}:hover svg { color: var(--ghf-accent); }
${F}:active { transform: scale(.97); }
${F}:focus-visible { outline: 2px solid var(--ghf-accent); outline-offset: 2px; }

${F} .ghf-fab-label {
  max-width: 0; margin-left: 0; padding-right: 0;
  overflow: hidden; opacity: 0; white-space: nowrap;
  font-family: var(--ghf-font); font-size: 12px; font-weight: 600; line-height: 1;
  transition: max-width .2s cubic-bezier(.2, 0, 0, 1), margin-left .2s cubic-bezier(.2, 0, 0, 1),
              padding-right .2s cubic-bezier(.2, 0, 0, 1), opacity .12s ease;
}
${F}:hover .ghf-fab-label, ${F}:focus-visible .ghf-fab-label {
  max-width: 150px; margin-left: 7px; padding-right: 3px; opacity: 1;
}

/* 44px is the touch minimum; the label expansion is pointer-only. */
@media (pointer: coarse) {
  ${F} { height: 48px; min-width: 48px; }
  ${F} .ghf-fab-label { display: none; }
}

@media print {
  ${F} { display: none !important; }
  ${P} { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  ${P}, ${P}::backdrop, ${F}, ${F} .ghf-fab-label, ${P} * { transition-duration: .01ms !important; }
}

/* Applied to result rows in GitHub's own DOM, hence no panel prefix. */
.ghf-hidden { display: none !important; }
`;

export function injectStyles() {
  if (document.getElementById(IDS.style)) return;
  const style = document.createElement('style');
  style.id = IDS.style;
  style.textContent = CSS;
  document.head.append(style);
}
