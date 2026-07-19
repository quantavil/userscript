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
3. **AI tier (optional, off by default)** — for fields heuristics left below a
   confidence threshold, batch their **descriptors only** to Gemini
   (`gemini-3.1-flash-lite` default, configurable) via `GM_xmlhttpRequest`,
   asking it to map each descriptor to a profile key or `null`. **No profile
   values are ever sent.** Results are cached per-site (behaves like an
   auto-generated teach rule) to avoid repeat calls.

Low-confidence, unmatched results are **listed, not filled**.

### 4.4 Fill (`fill.ts`)
Framework-safe value application:
- text/number/textarea: use the **native property setter** + dispatch
  `input`, `change`, `blur` so React/Angular/Vue/legacy ASP.NET WebForms register
  the change.
- `<select>`: fuzzy-match option text (`OBC` → `OBC-NCL`).
- radio/checkbox: match by sibling/associated label text.
- date fields: detect format from `placeholder`/`pattern`/split-dropdown shape.
- **Never** auto-submits; **never** touches captcha/OTP/password fields.
- Skips already-filled fields by default (settings toggle to overwrite).
- Briefly highlights each field it filled.

### 4.5 Report
After a fill the panel shows: ✅ filled, ⏭ skipped, ❓ unmatched. Each unmatched
entry is a one-tap entry into teach mode.

## 5. Teach Mode (`src/engine/rules.ts` + UI)

Tap **Teach** → fillable fields get tap-target overlays → tap a field → searchable
picker of profile keys → mapping saved **per-hostname**, keyed by a **field
fingerprint** (hash of id/name/label, resilient to minor page changes) and
re-applied on every future visit. This is what makes "any website" real. AI-tier
results are stored in the same rule store (marked as auto-generated, editable).

## 6. UI (`src/ui/`)

- **Floating action button:** draggable, ≥44 px touch target, remembers position
  (GM storage), per-site hide option. Pattern follows `gate-extractor/src/ui/fab.ts`.
- **Panel:** bottom-sheet on mobile / side panel on desktop. Contains:
  - **Fill** button + fill report
  - **Teach** toggle
  - **Profile editor** — sectioned form matching §3
  - **Settings** — overwrite toggle, export/import JSON, per-site disable,
    **AI tier** enable + API key + model field, **debug mode** toggle
- Styling functional-first; may reuse the GlideVideo liquid-glass aesthetic.

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

- `bun test` for pure modules: descriptor extraction from HTML fixtures, matcher
  scoring, date formatting, option matching, fingerprint stability.
- `dev/fixtures/` — HTML pages imitating an SSC/IBPS-style **table-layout** form
  and a modern React-style form, served via `vite dev`, for hands-on verification
  before touching real portals.

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
