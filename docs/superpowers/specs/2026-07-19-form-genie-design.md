# Form Genie — Design Spec

**Date:** 2026-07-19
**Folder:** `form-genie/`
**Status:** Approved design → ready for implementation plan

## 1. Purpose

A userscript that auto-fills web forms on **any** website — general sites and, in
particular, Indian government exam portals (SSC, UPSC, IBPS, GATE, state PSCs) —
from a locally-stored profile. Runs on **desktop** (Tampermonkey) and **mobile**
(Firefox Android + Violentmonkey/Tampermonkey) from one codebase.

**Design stance: local-first.** Teach-mode rules and heuristic matching run
entirely on-device with **zero network requests**. An optional Gemini AI tier is
**off by default**; when the user enables it and provides a key, only field
*descriptors* (labels/names/placeholders) are sent — **never profile values**.

**Explicit non-goals / boundaries:** fills the user's *own* data into forms the
user submits *themselves*. No captcha solving, no OTP handling, no auto-submit,
no automation of the submission step.

## 2. Platform & Build

- **Toolchain:** Bun + Vite + `vite-plugin-monkey`, mirroring `gate-extractor/`.
- **Entry:** `src/main.ts` → output `dist/form-genie.user.js`.
- **Userscript header:**
  - `match: ['http://*/*', 'https://*/*']`
  - `run-at: document-idle`
  - `noframes: true` (v1; iframe support deferred to v2)
  - `grant: [GM_getValue, GM_setValue, GM_deleteValue, GM_registerMenuCommand,
    GM_xmlhttpRequest]`
  - `connect: ['generativelanguage.googleapis.com']` (for the optional AI tier)
- **UI isolation:** all UI mounts in a **closed shadow root** so host-page CSS
  cannot break it and page scripts cannot read profile data out of the panel DOM.
- **Dependencies:** vanilla TS, zero runtime dependencies by default (consistent
  with the repo). A library is added only if a concrete need arises during
  implementation; the AI tier uses `GM_xmlhttpRequest` directly, no SDK.

## 3. Data Model (`src/profile/`)

A single **versioned** profile object in GM storage (`GM_setValue`), organized in
sections but **flattened to dot-keys** for matching.

### Sections & fields
- **personal:** `firstName`, `middleName`, `lastName`, `fullName`, `dob`,
  `gender`, `category` (Gen/OBC/SC/ST/EWS), `nationality`, `religion`,
  `maritalStatus`, `bloodGroup`, `identificationMark1`, `identificationMark2`
- **family:** `fatherName`, `motherName`, `guardianName`
- **contact:** `email`, `altEmail`, `mobile`, `altMobile`
- **address.permanent:** `line1`, `line2`, `city`, `district`, `state`,
  `pincode`, `country`
- **address.correspondence:** same shape + `sameAsPermanent` flag
- **education.tenth / .twelfth / .graduation / .postgrad:** `board`/`university`,
  `rollNo`, `passingYear`, `percentage`, `cgpa`, `subjectStream`
- **ids:** `aadhaar`, `pan`, `voterId`, `drivingLicence`, `passport`

### Derived values (computed at fill time, never stored)
- name splits/joins (full ↔ first/middle/last)
- DOB rendered in multiple formats: `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`,
  and separate day/month/year for split date dropdowns; computed age
- uppercase variants (many gov forms force caps)
- `sameAsPermanent` resolves correspondence → permanent values

### Persistence & sync
- Storage key is versioned; a migration hook handles schema changes.
- **Export/import as JSON** from the panel — the only sync path (desktop → phone).
  No cloud. Profile data never leaves the device except via user-initiated export.

## 4. Fill Engine (`src/engine/`)

Four pure, independently unit-testable stages:

### 4.1 Scan (`scan.ts`)
Collect `input | textarea | select` + radio/checkbox groups, descending into
**open shadow roots**. Skip: hidden, disabled, readonly, `type=password`, and
fields whose descriptor looks like captcha/OTP.

### 4.2 Describe (`describe.ts`)
Build a text descriptor per field from, in priority order: `label[for]`,
wrapping `<label>`, `aria-label`/`aria-labelledby`, `placeholder`, `title`,
`name`/`id` tokens, and — **critical for Indian gov portals** — the **nearest
preceding table cell / adjacent text node**, since many use `<table>` layouts
with no real `<label>`. Also capture `maxlength`, `pattern`, input `type`, and
`<option>` lists. Output is a stable structure consumed by matching.

### 4.3 Match (`match.ts`)
Three-tier cascade, highest priority first:

1. **Teach-mode rules** (per-hostname, user-defined) — always win.
2. **Heuristics** — token scoring of the descriptor against a **synonym
   dictionary** (`synonyms.ts`): English + transliterated Hindi
   (e.g. `father's name`/`pita ka naam`, `DOB`/`janm tithi`, `category`/`varg`,
   `pincode`/`pin code`). Returns `{ key, confidence }`.
3. **AI tier (optional, off by default)** — for fields heuristics left below the
   fill threshold, batch their **descriptors only** to Gemini in **one request
   per fill action**. **No profile values are ever sent.** Results are cached
   per-site keyed by field fingerprint (behaves like an auto-generated teach
   rule) so repeat visits make zero API calls.

**Confidence thresholds (tunable constants):**
- `≥ 0.75` — filled automatically.
- `0.45 – 0.75` — shown in the report as *suggestions* (one tap to accept →
  fills and saves as a teach rule).
- `< 0.45` — unmatched; eligible for the AI tier, else listed for teach mode.

Matching also uses the **option list** as a signal: a select whose options are
`General/OBC/SC/ST/EWS` is `personal.category` regardless of how it's labelled;
options that look like Indian states → a state field; 31 numeric options → day
dropdown, 12 → month, 4-digit ranges → year.

### 4.3.1 AI tier protocol (`ai.ts`)
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/
  {model}:generateContent` with `x-goog-api-key` header; model string from
  settings (default `gemini-3.1-flash-lite`).
- Request: system instruction + JSON array of
  `{ index, descriptorText, type, options?[] }`; `responseMimeType:
  "application/json"` with a response schema mapping each index to a profile
  key or `null`. Option lists are truncated to the first 30 entries.
- Robustness: 15 s timeout, no retries on 4xx (surface "invalid key" /
  "quota exceeded" in the panel), one retry on 5xx/network error. Responses
  naming unknown profile keys are discarded. Any failure degrades gracefully —
  the fill proceeds with heuristic results only.
- The API key lives in GM storage (script-scoped, not page-readable), is
  masked in the settings UI, and is **excluded from profile JSON export**.

Low-confidence, unmatched results are **listed, not filled**.

### 4.4 Fill (`fill.ts`)
Framework-safe value application:
- text/number/textarea: use the **native property setter**
  (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`)
  + dispatch the full event sequence `focus → input → change → blur` (bubbling,
  `KeyboardEvent`-free) so React's value tracker, Angular, Vue, jQuery
  validators, and legacy ASP.NET WebForms `onchange` postbacks all register it.
- `<select>`: fuzzy-match option text and value after normalization
  (case/punctuation-insensitive), with a domain equivalence table:
  `OBC ↔ Other Backward Class(es) ↔ OBC-NCL`, `Gen ↔ General ↔ UR ↔
  Unreserved`, `M ↔ Male`, state names ↔ common abbreviations.
- radio/checkbox: match by sibling/associated label text, then `click()` the
  chosen input (fires the framework-visible event chain naturally).
- date fields: render DOB in the format detected from
  `placeholder`/`pattern`/input type/split-dropdown shape.
- **Fill order is sequential, not parallel**, to support cascading dropdowns
  (§4.6).
- Value formatting per target field: strip `+91`/leading zero from mobile when
  `maxlength`/`pattern` implies 10 digits; year-only fields get `passingYear`;
  uppercase applied when the field forces caps (`text-transform` or observed
  `pattern`); values longer than `maxlength` are **not silently truncated** —
  the field is skipped and reported with the reason.
- **Never** auto-submits; **never** touches captcha/OTP/password fields.
- Skips already-filled fields by default (settings toggle to overwrite);
  a filled value that exactly equals the profile value counts as "already
  filled" even with overwrite on.
- Briefly highlights each field it filled.
- Each field is filled inside its own try/catch — one hostile field never
  aborts the run; errors appear in the report (and console when debug is on).

### 4.6 Cascading dropdowns & dynamic forms
Indian portals routinely chain selects (state → district → city, board → year)
where child options load via AJAX only after the parent changes. Naive filling
leaves every child empty. The fill loop therefore:

1. Fills fields in DOM order.
2. After setting a `<select>`, checks whether any *unfilled matched select* is
   currently empty/disabled; if so, waits for its options via a
   `MutationObserver` (+ disabled-attribute watch) with a **3 s timeout** before
   filling it, then continues.
3. On timeout the child is reported as "options never loaded" rather than
   silently skipped.

Scanning itself is on-demand (runs when the user taps **Fill**), so SPA
wizards and late-rendered steps need no persistent observers — the user just
taps Fill on each step. A **Re-scan** happens implicitly on every Fill tap.

### 4.5 Report
After a fill the panel shows: ✅ filled, ⏭ skipped, ❓ unmatched. Each unmatched
entry is a one-tap entry into teach mode.

## 5. Teach Mode (`src/engine/rules.ts` + UI)

Tap **Teach** → fillable fields get tap-target overlays → tap a field → searchable
picker of profile keys → mapping saved **per-hostname** and re-applied on every
future visit. This is what makes "any website" real. AI-tier results are stored
in the same rule store (marked as auto-generated, editable). The rule list is
viewable/deletable per site from settings.

**Field fingerprint** — first available of, in order:
1. `name` attribute (most stable on gov portals),
2. `id` (ignored if it looks auto-generated, e.g. ends in long digit runs/GUIDs),
3. hash of normalized descriptor text + input type.

Each fingerprint records which tier produced it. If two fields on a page share a
fingerprint, an occurrence index disambiguates them. A rule whose fingerprint no
longer matches anything is kept (pages change between visits/steps) but flagged
stale in the rules list.

## 6. UI (`src/ui/`)

- **Floating action button:** draggable, ≥44 px touch target, remembers position
  (GM storage), per-site hide option. Pattern follows `gate-extractor/src/ui/fab.ts`.
- **Panel:** bottom-sheet on mobile / side panel on desktop. Contains:
  - **Fill** button + fill report
  - **Teach** toggle
  - **Profile editor** — sectioned form matching §3
  - **Settings** — overwrite toggle, export/import JSON, per-site disable,
    per-site rules viewer (delete/inspect), **AI tier** enable + API key
    (masked) + model field, **debug mode** toggle
- Sensitive profile fields (Aadhaar, PAN, passport) are masked in the editor
  with a tap-to-reveal.
- `GM_registerMenuCommand` entries: *Open panel*, *Toggle FAB on this site*,
  *Toggle debug* — an escape hatch if the FAB is hidden or broken by a site.
- Styling functional-first; may reuse the GlideVideo liquid-glass aesthetic.

## 6.1 Storage schema (GM storage keys)

| Key | Content |
|---|---|
| `fg:profile` | versioned profile object (`{ v: 1, data: {...} }`) |
| `fg:settings` | overwrite flag, AI enable/key/model, debug flag, disabled sites |
| `fg:rules:<hostname>` | teach + AI-cache rules `[{ fingerprint, occurrence, key, source, ts }]` |
| `fg:fab` | FAB position |

Export = `fg:profile` + optionally rules; **never** `fg:settings` (holds the
API key).

## 7. Debug Mode

A settings toggle (persisted in GM storage). When on:
- namespaced console logging (`[form-genie]`) across all stages with timing;
- per-field match trace (descriptor → tier that matched → chosen key →
  confidence) surfaced in the fill report;
- a visible on-page overlay outlining each scanned field with its matched key /
  confidence, so mismatches are diagnosable on real portals (incl. mobile);
- raw Gemini request/response (descriptors only) logged when the AI tier runs.

Off by default; zero overhead when off (guarded logging).

## 8. Testing

- `bun test` with **happy-dom** (devDependency) for DOM-dependent pure modules:
  descriptor extraction from HTML fixtures, matcher scoring, date formatting,
  select option matching/equivalence table, fingerprint stability, profile
  derive functions. The AI tier is tested against mocked responses (success,
  malformed JSON, 401, 429, timeout).
- `dev/fixtures/` — HTML pages served via `vite dev` for hands-on verification
  before touching real portals:
  1. SSC/IBPS-style **table-layout** form (no labels, cascading state→district
     selects with simulated AJAX delay),
  2. modern React-style controlled form,
  3. pathological page (duplicate names, hidden fields, an OTP/captcha input
     that must be skipped).

## 9. Phasing

- **v1:** everything above (local heuristics + teach mode + optional Gemini tier +
  debug mode + single profile + export/import).
- **v2 (later):** iframe support (TCS iON / digialm portals) via a cross-frame
  message bus; photo/signature uploads via `DataTransfer`; multiple named profiles.

## 10. Proposed file layout

```
form-genie/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts
│   ├── profile/
│   │   ├── schema.ts        # types + section→dot-key flattening
│   │   ├── store.ts         # GM storage + versioning/migration
│   │   └── derive.ts        # derived values (dates, name splits, uppercase)
│   ├── engine/
│   │   ├── scan.ts
│   │   ├── describe.ts
│   │   ├── match.ts
│   │   ├── synonyms.ts
│   │   ├── ai.ts            # Gemini tier (GM_xmlhttpRequest)
│   │   ├── fill.ts
│   │   └── rules.ts         # teach-mode / per-site rule store + fingerprints
│   ├── ui/
│   │   ├── fab.ts
│   │   ├── panel.ts
│   │   ├── profileEditor.ts
│   │   └── report.ts
│   ├── debug.ts
│   └── styles.css
├── dev/fixtures/            # test HTML forms
└── tests/                   # bun test specs
```
