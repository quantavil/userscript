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
  for gov table layouts with no `<label>`.
- `match.ts` three-tier: rules (teach/AI) > option-list signal > synonym token
  scoring. Thresholds: ≥0.75 fill, 0.45–0.75 suggest, else unmatched. Single
  distinctive token full-coverage scores 0.8 (so a field labelled just "State"
  fills).
- `fill.ts` native-setter + `focus/input/change/blur` for framework compat;
  select equivalence (OBC↔OBC-NCL); +91 strip; maxlength = skip (no truncate);
  cascading via `waitForOptions` (MutationObserver, 3s timeout). Fills in scan
  (DOM) order — do NOT re-sort by compareDocumentPosition (unreliable in tests).
- `ai.ts` optional Gemini tier via `GM_xmlhttpRequest`; sends **descriptors
  only**, default model `gemini-3.1-flash-lite`; results cached as `source:'ai'`
  rules. Off by default.

## Storage (GM keys, in `profile/store.ts`)
`fg:profile` (versioned), `fg:settings` (holds API key — never exported),
`fg:rules:<host>`, `fg:fab`.

## Conventions
- UI in a **closed shadow root**; styles in `ui/styles.ts`.
- Never auto-submit; never fill captcha/OTP/password.
- Tests use happy-dom via `tests/setup.ts` (preloaded by `bunfig.toml`).

## Blunders (fixed)
- Captcha regex `\bpin\b` wrongly matched "PIN Code" → removed; now only
  captcha/otp/verification/security-code.
- `scan` originally skipped disabled selects → cascade children never entered
  the pipeline. Now selects are kept even when disabled.
