# AGENT — github-filter

## Overview
A userscript that adds a repository-search filter panel, saved presets, and a hide-words filter to GitHub. TypeScript + Preact + Vite (vite-plus) + `vite-plugin-monkey`, entry point `src/index.ts`, built to `dist/github-filter.user.js`.

## Structure
```
src/
├── index.ts          # Bootstrap: migrate storage, inject CSS, mount launcher, start scanner
├── config.ts         # IDs, storage keys, selectors, slider scales, and the field schema
├── query.ts          # Pure: FormState <-> query parts/URL, preset normalising, hide matcher
├── query.test.ts     # Covers build/parse round-trips, ranges, slider scale and legacy presets
├── launcher.ts       # Places the launcher in GitHub's own filter sidebar/toolbar
├── launcher.test.ts  # Covers native slot discovery and idempotent placement
├── scanner.ts        # Hides result rows matching the hide list
├── scanner.test.ts   # Covers matching, re-render recovery, and page gating
├── storage.ts        # localStorage accessors, preset CRUD, legacy migration
├── styles.ts         # The whole stylesheet as one template literal (Primer tokens)
├── icons.tsx         # Octicon path registry, <Icon>, and the imperative launcher glyph
└── ui.tsx            # Preact: dialog shell, query table, sliders, date ranges, tape, presets
```

## Conventions
- **The field schema is the single source of truth.** `KEYWORDS`, `SORTS` and `QUALIFIERS` in `config.ts` drive the rendered rows, `queryParts`, the preset summaries and URL parsing.
- **`FormState` is typed, not stringly.** `repo`/`lang` hold the raw comma-separated input; `stars`/`forks` are `{ min, max }` where 0 means unbounded; `created`/`pushed` are `{ from, to }` holding `YYYY-MM-DD` or empty.
- **Preact owns the panel.** State is `useState`/`useMemo`, and JSX escapes user-supplied preset names and qualifier values.
- **The panel opens after state commits.** `openPanel` updates builder state and bumps `openRequest`; a `useLayoutEffect` then calls `showModal()`.
- **The query tape is derived, not stored.** `queryParts(state)` returns `{ text, kind }` parts; the footer renders interactive removal chips and `buildQuery` joins the same parts for copy and search.
- **Primer tokens, not fixed colors.** `--ghf-*` variables alias GitHub's own `--bgColor-*`, `--fgColor-*`, `--borderColor-*` and `--button-*` tokens, so the panel follows the page's light, dark, or auto theme. Hex values are fallbacks for pages that do not expose Primer. SVGs explicitly inherit text/accent colors (`fill="currentColor"`).
- **Pure logic is separated and tested.** `query.ts` has no DOM or network dependency; everything else is glue.
- **Version and description come from `package.json`** via `vite.config.ts`.

## Things that are load-bearing
- **Unified Single-Page Architecture.** Builder and Presets tabs are eliminated. Presets are stored, rendered as interactive chips (load, run, delete), and created via an inline save field directly on the single page.
- **Silky Smooth Logarithmic Sliders.** Instead of coarse discrete array notches, `SmoothSlider` uses pointer capture (`setPointerCapture`) and continuous ratio mapping (`valToRatio`/`ratioToVal`) to interpolate values across logarithmic space. Natural human quantization steps cleanly through 1, 10, 50, 100, 250, 500, 1k, 5k, 10k, 25k, 50k, 100k without dragging stutter or dead zones. Thumbs track with precision, scale on grab, and support full keyboard ARIA navigation. Keyboard steps go through `stepValue()` (value-based, not ratio-based) because the log track compresses the bottom: a fixed ratio delta rounds back to 1 and wedges the thumb. `Home`/`End` still jump to the open bounds, and a max thumb at 0 means unbounded and sits at the right edge.
- **Compact Header-Integrated Metric Chips.** Stars and Forks feature symmetric quick-chip presets (`1+`, `10+`, `100+`, `1k+` and `10k+`) housed directly in the slider header alongside the live readout, saving vertical height.
- **React owns the result rows, we don't.** GitHub hydrates `[data-testid="results-list"]` after the script runs, and rewrites `className` from its own state — which strips `ghf-hidden` back off. `scanResults` is therefore stateless and recomputed from scratch on every pass rather than tracking rows in a `WeakMap` or a `data-*` flag. An attribute survives the re-render and makes a row look handled when it is not. Re-adding a class that is already present mutates nothing, and the `MutationObserver` watches `childList` only, so this cannot loop. The observer is attached to `document.documentElement`, not `document.body`: Turbo replaces body content (and a body-scoped observer would silently stop seeing results). Panel-only mutations are ignored, and nav events schedule rescans at 150 ms and 700 ms because Turbo renders before it writes the new URL.
- **Transient feedback resets itself.** Copy reports “Copied”/“Failed” in both the button and an `aria-live` region, and returns to idle after 1.6 s on either outcome, so a failed clipboard write cannot leave a permanent error.
- **Row text is walked, not read from `textContent`.** `textContent` concatenates adjacent nodes with no separator, so `<a>acme/repo</a><p>wontfix…</p>` reads as "repowontfix" and a whole-word match fails at element boundaries. `rowText()` walks text nodes and joins with a space; `innerText` would be correct too but forces layout on every pass.
- **Thumb `z-index` and focus follow the active thumb.** `lead` state raises whichever thumb the user clicked, dragged, or focused via keyboard tab (`onFocus`).
- **Interactive query tape chips.** `queryParts(state)` assigns `fieldId` and `token` attributes to parts; clicking `×` on any tape chip invokes `removeQueryPart(state, part)` for instant 1-click filter removal.
- **`<dialog>` + `showModal()`** provides the focus trap, `Esc` handling, inert background and top-layer stacking. Follows modern web platform guidance: `closedby="any"` enables native light dismiss, and `overscroll-behavior: contain` on both dialog and `::backdrop` (with `overflow: hidden`) prevents scroll chaining to the page underneath.
- **Mobile Bottom-Sheet Architecture (≤767px).**
  - `<dialog>` specifies a definite height (`height: 85dvh; max-height: 88dvh;`) to avoid CSS 2.1 §10.5 indefinite flex height collapse. This keeps header, drag handle, and footer pinned while `.ghf-body` scrolls with touch momentum (`-webkit-overflow-scrolling: touch`).
  - `SmoothSlider` handles pointer interactions across both mouse and touch by only enforcing `e.button === 0` when `e.pointerType === 'mouse'` (touch interactions report `button === -1`).
  - Mobile slider thumb hit target expands to 42px via `::before` pseudo-element.
  - Enforces `font-size: 16px !important` on mobile inputs to eliminate iOS Safari viewport auto-zooming.
  - Auto-focus is disabled on viewports ≤767px (`window.innerWidth > 767`) to prevent unwanted virtual keyboard pops upon modal opening.
  - Modal backdrop dismiss verifies `e.clientX`/`e.clientY` against `d.getBoundingClientRect()` to prevent premature dismissals from inner taps.
  - Launcher button (`#ghf-fab`) is hidden while dialog is open via `${F}[aria-expanded="true"], body:has(${P}[open]) ${F} { display: none !important; }`.
- **The launcher lives in GitHub's chrome, not over it.** `findLauncherTarget()` reuses native hooks: the `[data-testid="filter-button"]` toolbar on phones (a full-width row under the search sub-header, or beside the button if there is no sub-header), and the `[role="region"][aria-labelledby="search-filters-title"]` sidebar on desktop/tablet (above the facet list, directly under “Filter by”). Only the bare `/search` landing page falls back to a floating pill. On results pages with no native slot yet, the launcher is removed rather than floated, so a Turbo restore cannot flash a pill over the page; a bounded 400 ms retry (5 attempts) re-homes it.
- **One persistent launcher button.** `placeLauncher` moves the same `#ghf-fab` between slots and never clones it; `placeLauncher`/`syncLauncher` are idempotent so the debounced observer, resize listener and Turbo events can all call them safely. The launcher is hidden outside `/search` (including `/search/`) and while the dialog is open.

## Removed
Release badges (a per-result "latest tag" badge, backed by `releases.atom` fetching with a cache, fetch pool and rate-limit handling) were removed at the user's request — a request per result row is not worth the rate limiting. `migrateLegacyStorage` clears the leftover `gh-rel-*`, `ghf:scan` and `ghf:releases` keys. Do not reintroduce without asking.

The scope switch (Code, Issues, PRs, Discussions, Users) and the `extension`/`size` filters were removed in v10: every remaining control is a repository qualifier, so `buildUrl` always sends `type=repositories`. A v9 preset's leftover `q.size`/`q.ext` values are dropped by `normalizeState`, and a pasted `size:` or `ext:` term stays in the free-text field rather than being swallowed.

## Dependencies & Setup
- Package manager: `bun`
- Runtime: `preact` 11.2 (the only dependency)
- `bun install`, `bun run build`, `bun run dev`, `bun run test`, `bun run tsc`, `bun run lint`, `bun run knip`, `bun run check`
- GM grants: `GM_registerMenuCommand` only. State is in `localStorage` under the `ghf:` prefix.
- Toolchain: `vite-plus` 1.7.0, `vite-plugin-monkey` 8.1.1, TypeScript 7.0, Biome 2.6.8, happy-dom 21, Knip 6.
