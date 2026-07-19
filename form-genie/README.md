# Form Genie

Local-first auto form filler userscript for **desktop and mobile** browsers.
Fills any website — including Indian government exam portals (SSC, IBPS, UPSC,
GATE, state PSCs) — from a profile stored on your device.

## How it works

Tap the floating **Fill** button. Form Genie scans the page, matches fields to
your profile, and fills them. Matching runs in three tiers:

1. **Teach-mode rules** you've saved for this site (always win).
2. **Heuristics** — label/name/placeholder + nearby-cell text scored against a
   synonym dictionary (English + transliterated Hindi), plus option-list signals
   (a dropdown of General/OBC/SC/ST/EWS is the category field regardless of its
   label).
3. **Gemini AI tier** *(optional, off by default)* — for fields the heuristics
   couldn't place. Only field **labels** are sent, never your data.

It never auto-submits, never touches captcha/OTP/password fields, handles
cascading dropdowns (state → district), and reports what it filled / skipped /
couldn't match. Unmatched fields are one tap away from Teach mode.

## Privacy

- Profile data is stored **only** on your device (userscript-manager storage).
- With the AI tier **off** (default), the script makes **zero network requests**.
- With it on, only field descriptors go to Gemini — profile values never do, and
  the API key is never included in profile exports.

## Install (desktop & mobile)

1. Install a userscript manager:
   - **Desktop:** Tampermonkey or Violentmonkey.
   - **Android:** Firefox + Violentmonkey/Tampermonkey add-on.
2. Build `dist/form-genie.user.js` (below) and open it in the browser, or serve
   it, to prompt installation.

## Develop

```bash
bun install
bun run dev      # vite dev server (open dev/fixtures/index.html)
bun test         # unit + DOM tests (happy-dom)
bun run tsc      # typecheck
bun run build    # emits dist/form-genie.user.js
```

`dev/fixtures/index.html` contains SSC-style table layouts, a modern labelled
form, a cascading state→district pair, and a pathological form (OTP/captcha/
hidden fields that must be skipped) for hands-on testing.

## Layout

- `src/profile/` — schema, GM storage, derived values (dates, name splits).
- `src/engine/` — scan → describe → match → fill, plus synonyms, rules
  (fingerprinting), and the Gemini AI tier.
- `src/ui/` — FAB, panel, profile editor, report, teach mode.
- `src/debug.ts` — debug logging + on-page match overlay.

See `../docs/superpowers/specs/2026-07-19-form-genie-design.md` for the full
design.
