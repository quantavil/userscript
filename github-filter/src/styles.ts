import { IDS } from './config';

const P = `#${IDS.panel}`;
const F = `#${IDS.fab}`;

/**
 * Design notes:
 * - `auto` reads GitHub's own Primer custom properties, so the panel is the same
 *   surface as the page it overlays. Explicit light/dark override with Primer's
 *   literal palette values.
 * - No backdrop-filter anywhere. A 400px full-height blurred surface repainted on
 *   every scroll frame was the bulk of the old build's jank.
 */
export const CSS = `
${P}, ${F} {
  --ghf-canvas: var(--overlay-bgColor, var(--bgColor-default, var(--color-canvas-default, #ffffff)));
  --ghf-subtle: var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa));
  --ghf-inset: var(--bgColor-inset, var(--color-canvas-inset, #f6f8fa));
  --ghf-fg: var(--fgColor-default, var(--color-fg-default, #1f2328));
  --ghf-fg-muted: var(--fgColor-muted, var(--color-fg-muted, #59636e));
  --ghf-accent: var(--fgColor-accent, var(--color-accent-fg, #0969da));
  --ghf-danger: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
  --ghf-border: var(--borderColor-default, var(--color-border-default, #d1d9e0));
  --ghf-border-muted: var(--borderColor-muted, var(--color-border-muted, #d8dee4));
  --ghf-btn-bg: var(--button-default-bgColor-rest, var(--color-btn-bg, #f6f8fa));
  --ghf-btn-hover: var(--button-default-bgColor-hover, var(--color-btn-hover-bg, #eef1f4));
  --ghf-primary: var(--button-primary-bgColor-rest, var(--color-btn-primary-bg, #1f883d));
  --ghf-primary-hover: var(--button-primary-bgColor-hover, var(--color-btn-primary-hover-bg, #1a7f37));
  --ghf-shadow: var(--shadow-floating-large, 0 8px 24px rgba(31, 35, 40, 0.16));
  --ghf-radius: 6px;
  --ghf-font: var(--fontStack-sansSerif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace);
}

${P}[data-theme="light"], ${F}[data-theme="light"] {
  color-scheme: light;
  /* Three deliberate steps: body → header/footer → inset controls. */
  --ghf-canvas: #ffffff; --ghf-subtle: #f6f8fa; --ghf-inset: #eaeef2;
  --ghf-fg: #1f2328; --ghf-fg-muted: #59636e; --ghf-accent: #0969da; --ghf-danger: #d1242f;
  --ghf-border: #d1d9e0; --ghf-border-muted: #d8dee4;
  --ghf-btn-bg: #f6f8fa; --ghf-btn-hover: #eef1f4;
  --ghf-primary: #1f883d; --ghf-primary-hover: #1a7f37;
  --ghf-shadow: 0 8px 24px rgba(31, 35, 40, 0.16);
}

${P}[data-theme="dark"], ${F}[data-theme="dark"] {
  color-scheme: dark;
  /* Header sits above the body, matching light mode's direction of elevation.
     #010409 against #151b23 was a hard black band. */
  --ghf-canvas: #151b23; --ghf-subtle: #1c2128; --ghf-inset: #0d1117;
  --ghf-fg: #f0f6fc; --ghf-fg-muted: #9198a1; --ghf-accent: #4493f8; --ghf-danger: #f85149;
  --ghf-border: #3d444d; --ghf-border-muted: #2f353d;
  --ghf-btn-bg: #212830; --ghf-btn-hover: #262c36;
  --ghf-primary: #238636; --ghf-primary-hover: #29903b;
  /* No 1px ring — the panel already has a border, and the two drew a double line. */
  --ghf-shadow: 0 16px 32px rgba(1, 4, 9, 0.85);
}

/* ---------- panel ---------- */

${P} {
  width: min(400px, 100vw);
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
  font-size: 14px;
  line-height: 1.5;
  box-shadow: var(--ghf-shadow);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .22s cubic-bezier(.2, 0, 0, 1), opacity .22s ease,
              display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P}[open] { transform: translateX(100%); opacity: 0; } }

${P}::backdrop {
  background: rgba(1, 4, 9, .45);
  opacity: 0;
  transition: opacity .22s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

@media (max-width: 767px) {
  ${P} {
    width: 100vw;
    height: auto;
    max-height: 88dvh;
    margin: auto 0 0;
    border-left: none;
    border-top: 1px solid var(--ghf-border);
    border-radius: 12px 12px 0 0;
    transform: translateY(100%);
  }
  ${P}[open] { transform: translateY(0); }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }
}

@media (prefers-reduced-motion: reduce) {
  ${P}, ${P}::backdrop, ${F}, ${P} * { transition-duration: .01ms !important; }
}

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

/* ---------- header ---------- */

${P} header {
  display: flex; flex-direction: column; gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ghf-border);
  background: var(--ghf-subtle);
}
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
${P} h2 {
  display: flex; align-items: center; gap: 8px; margin: 0;
  font-size: 14px; font-weight: 600; letter-spacing: -.005em;
}
${P} h2 svg { fill: var(--ghf-fg-muted); }
${P} .ghf-titlebar nav { display: flex; gap: 2px; }

${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid transparent; border-radius: var(--ghf-radius);
  background: transparent; color: var(--ghf-fg-muted); cursor: pointer;
  transition: background .12s ease, color .12s ease, transform .06s ease;
}
${P} .ghf-icon-btn svg { fill: currentColor; }
${P} .ghf-icon-btn:hover { background: var(--ghf-btn-hover); color: var(--ghf-fg); }
${P} .ghf-icon-btn:active { transform: scale(.94); }
${P} .ghf-icon-btn.ghf-danger:hover { background: var(--ghf-danger); color: #fff; }

${P} .ghf-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
  padding: 2px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius); background: var(--ghf-inset);
}
${P} .ghf-tabs button {
  padding: 5px 8px; border: none; border-radius: 4px;
  background: transparent; color: var(--ghf-fg-muted);
  font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P} .ghf-tabs button:hover { color: var(--ghf-fg); }
${P} .ghf-tabs button[aria-selected="true"] {
  background: var(--ghf-canvas); color: var(--ghf-fg); font-weight: 600;
}

/* ---------- body ---------- */

${P} .ghf-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px 16px 16px; }
${P} [role="tabpanel"][hidden] { display: none; }

${P} fieldset { margin: 16px 0 0; padding: 0; border: none; }
${P} legend {
  padding: 0; margin-bottom: 8px;
  font-size: 12px; font-weight: 600; color: var(--ghf-fg-muted);
}
${P} .ghf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; }
${P} .ghf-grid > .ghf-wide { grid-column: 1 / -1; }

${P} .ghf-field label { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; }
${P} .ghf-input {
  width: 100%; padding: 5px 10px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-canvas); color: var(--ghf-fg);
  font: inherit; font-size: 13px; box-sizing: border-box;
  transition: border-color .12s ease, box-shadow .12s ease;
}
${P} .ghf-input::placeholder { color: var(--ghf-fg-muted); opacity: .7; }
${P} .ghf-input:hover { border-color: var(--ghf-fg-muted); }
${P} select.ghf-input { padding-right: 6px; cursor: pointer; }

${P} :is(.ghf-input, button, [role="tab"]):focus-visible {
  outline: 2px solid var(--ghf-accent); outline-offset: -1px; border-color: var(--ghf-accent);
}

/* ---------- footer ---------- */

${P} footer {
  display: flex; gap: 8px; padding: 12px 16px;
  border-top: 1px solid var(--ghf-border); background: var(--ghf-subtle);
}
${P} .ghf-btn {
  flex: 1; padding: 5px 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, transform .06s ease;
}
${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P} .ghf-btn:active { transform: translateY(1px); }
${P} .ghf-btn.ghf-primary {
  border-color: transparent; background: var(--ghf-primary); color: #fff;
}
${P} .ghf-btn.ghf-primary:hover { background: var(--ghf-primary-hover); }
${P} .ghf-btn.ghf-compact { flex: 0 0 auto; }

/* ---------- presets ---------- */

${P} .ghf-save { display: flex; gap: 8px; margin: 16px 0 20px; }
${P} .ghf-save .ghf-input { flex: 1; }
${P} .ghf-error { margin: -14px 0 16px; font-size: 12px; color: var(--ghf-danger); }
${P} .ghf-input[aria-invalid="true"] { border-color: var(--ghf-danger); }

${P} .ghf-presets { display: flex; flex-direction: column; gap: 8px; list-style: none; margin: 0; padding: 0; }
${P} .ghf-preset {
  padding: 10px 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-canvas);
  transition: border-color .12s ease;
}
${P} .ghf-preset:hover { border-color: var(--ghf-fg-muted); }
${P} .ghf-preset-head { display: flex; align-items: start; justify-content: space-between; gap: 8px; }
${P} .ghf-preset-name { font-weight: 600; font-size: 13px; overflow-wrap: anywhere; }
${P} .ghf-chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 10px; }
${P} .ghf-chip {
  padding: 0 6px; border: 1px solid var(--ghf-border-muted); border-radius: 20px;
  background: var(--ghf-subtle); color: var(--ghf-fg-muted);
  font-family: var(--ghf-mono); font-size: 10px; line-height: 18px;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
${P} .ghf-preset-actions { display: flex; gap: 6px; }
${P} .ghf-preset-actions .ghf-btn { padding: 3px 10px; font-size: 12px; }
${P} .ghf-empty {
  padding: 28px 16px; border: 1px dashed var(--ghf-border); border-radius: var(--ghf-radius);
  text-align: center; color: var(--ghf-fg-muted); font-size: 13px;
}
${P} .ghf-empty strong { display: block; margin-bottom: 2px; color: var(--ghf-fg); font-size: 13px; }

/* ---------- launcher ---------- */

${F} {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0;
  border: 1px solid var(--ghf-border); border-radius: 50%;
  background: var(--ghf-canvas); color: var(--ghf-fg-muted);
  box-shadow: var(--ghf-shadow); cursor: pointer;
  z-index: 9999;
  transition: color .12s ease, border-color .12s ease, transform .12s cubic-bezier(.2, 0, 0, 1);
}
${F} svg { fill: currentColor; }
${F}:hover { color: var(--ghf-accent); border-color: var(--ghf-accent); transform: scale(1.06); }
${F}:active { transform: scale(.96); }
${F}:focus-visible { outline: 2px solid var(--ghf-accent); outline-offset: 2px; }

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
