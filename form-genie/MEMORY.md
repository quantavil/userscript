# Project: Form Genie

## Overview
Local-first auto form filler userscript (desktop + mobile). Fills arbitrary
websites, targeting Indian exam portals, from a device-stored profile. Bun +
Vite + vite-plugin-monkey. Entry `src/main.ts` → `dist/form-genie.user.js`.

## Architecture
Pipeline: **scan → describe → match → fill**, each a pure, unit-tested module.
- `scan.ts` collects fillable fields incl. open shadow roots; skips hidden/
  password/captcha/OTP. **Includes disabled `<select>`s** (cascade children start
  disabled) but skips disabled inputs/textareas.
- `describe.ts` builds a text descriptor; reads the nearest preceding table cell
  for gov table layouts with no `<label>`. `nearbyText` walks up to 3 DOM levels
  to find group-level question labels (e.g. radios inside `.custom-control` divs).
- `match.ts` three-tier: rules (teach/AI) > option-list signal > synonym token
  scoring. Thresholds: ≥0.75 fill, 0.45–0.75 suggest, else unmatched. Single
  distinctive token full-coverage scores 0.8 (so a field labelled just "State"
  fills).
- `fill.ts` native-setter + `focus/input/change/blur` for framework compat;
  select equivalence (OBC↔OBC-NCL); +91 strip; maxlength = skip (no truncate);
  cascading via `waitForOptions` (MutationObserver, 3s timeout); split-email
  detection (`hasAdjacentAt` — searches descendants and text nodes of closest
  parent wrapper for exactly `@` to strip domain, e.g. IBPS split email layout).
  Fills in scan (DOM) order — do NOT re-sort by compareDocumentPosition.
- `ai.ts` optional Gemini tier via `GM_xmlhttpRequest`; sends **descriptors
  only**, default model `gemini-3.1-flash-lite`; results cached as `source:'ai'`
  rules. Off by default.
- Custom Fields: dynamic custom fields added by user (Text, Number, Date, or Choices/Select).
  Saved in `profile.data._customFields` as a JSON list of `{key, label, kind, options?}`.
  Registered at boot time/refresh via `registerCustomFields` callback to update `SECTIONS`,
  `FIELD_CATALOG`, `ALL_KEYS`, and rebuild synonym tokens in `match.ts`. Fully supports
  teach-mode mapping and choices/dropdown rendering in the editor.
- Teach Mode Custom Field Creation: Users can create and map new custom fields directly from the
  Teach Mode picker overlay. It automatically pre-fills the label, auto-detects the field type
  from the DOM (text, number, date, or select for radio/checkbox/select), auto-parses choice
  options from the DOM options/labels, and pre-fills the field value on the profile from the
  currently selected option/input.

## Storage (GM keys, in `profile/store.ts`)
`fg:profile` (versioned, contains `_customFields` metadata), `fg:settings` (holds API key — never exported),
`fg:rules:<host>`, `fg:fab`.

## Design
- **"Press" theme** (v1.1.0) — editorial printed-form aesthetic: warm paper
  (`--paper #f3efe4`), ink-black type, single vermilion spot (`--spot #cc3b1d`),
  serif masthead (Georgia stack), monospace field keys/labels/buttons, hairline
  rules, hard letterpress offset shadows (`5px 5px 0`). Light `color-scheme`.
  Chosen deliberately against the generic dark-glass default (ref: Nutlope
  hallmark's anti-slop themes). Opaque so it reads over any host page.
- Do NOT add `feTurbulence` SVG grain: it hangs headless screenshot capture and
  costs on low-end mobile. Tried and removed.

## Conventions
- UI in a **closed shadow root**; styles in `ui/styles.ts` (design tokens in
  `:host` CSS vars). Closed shadow means preview_click can't reach panel
  internals — verify UI via screenshots + the `window.__menu` hook in
  `dev/preview.html`.
- **Opt-in per site**: dormant everywhere until enabled via GM menu command
  (`fg:settings.enabledSites`). This was an explicit user requirement.
- Panel stops propagation of key/paste/click events at the shadow host
  (`isolateEvents`) — portals like ibps.in have document-level handlers that
  otherwise make panel inputs untypable. Don't remove.
- Never auto-submit; never fill captcha/OTP/password.
- Tests use happy-dom via `tests/setup.ts` (preloaded by `bunfig.toml`).
- UI preview: `dev/preview.html` + repo-root `.claude/launch.json` serves the
  built userscript with GM stubs (`window.__menu` exposes menu commands).

## Blunders (fixed)
- Captcha regex `\bpin\b` wrongly matched "PIN Code" → removed; now only
  captcha/otp/verification/security-code. Second-chance text-level check
  `isCaptchaLike` in describe.ts (catches IBPS "Security Code" via nearby text).
- `scan` originally skipped disabled selects → cascade children never entered
  the pipeline. Now selects are kept even when disabled.
- Match tie-break bonus was added to zero scores → gibberish fields got an
  arbitrary key at ~0.00 confidence. Bonus now only when score > 0; bonus is
  phrase-length based so "alternative number" beats "mobile number".
- `'your name'` synonym for fullName false-positived on "Have you ever changed
  your name?" — removed.
- Debug overlay used fixed positioning → boxes stuck to viewport on scroll.
  Now document-absolute + 15s auto-clear.
- `nearbyText` only checked immediate previousSiblings → radio groups wrapped
  in `.custom-control` divs missed the parent-level question label (e.g. "Have
  you ever changed your name?"). Fixed by walking up to 3 DOM levels.
- `SYN_TOKENS` and `rebuildSynTokens` were needlessly exported from `match.ts`;
  dead text-node check in `hasAdjacentAt` duplicated the `querySelectorAll`
  logic. Both removed.
