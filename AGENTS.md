# AGENTS.md

Guidance for work in this repository (`~/Documents/userscript`).

## Monorepo Practices

- **Runtime & Tools**: Use `bun` as the primary runtime and package manager across all userscript subprojects.
- **Build System**: Scripts use Vite (`vite-plugin-monkey`) with TypeScript. Output bundles reside in `dist/`.
- **License**: GPL-3.0-or-later everywhere — `license: 'GPL-3.0-or-later'` in `vite.config.ts` metadata, `"license": "GPL-3.0-or-later"` in `package.json`, a GPL `LICENSE` per project, and `@license GPL-3.0-or-later` in plain userscript headers.
- **Subproject Isolation**: Each project is self-contained with its own `package.json`, `vite.config.ts`, tests, and documentation.
- **Testing**: Run project unit tests (`bun test`) and verify production builds (`bun run build`) before committing. For Super Chess Bot, use `bun run check` (Vitest through Bun, plus lint, typecheck, dependency checks, and both builds).
- **Subproject Documentation**: Each subproject directory should maintain an updated `README.md` and `AGENTS.md` with domain-specific architecture and constraints.

## Super Chess Bot benchmark (2026-10-11)

- At the displayed 2900 rating, the prewarmed bot won a 1+0 game by `61.Bf5#` (121 plies), finishing with 0:46 on its clock from 1:00. Settings: 100 ms move budget, depth cap 30, background pondering enabled; the panel reported `Ready` before play.
- Chess.com's 60 recorded White move timestamps summed to 13.4 seconds (0.2-second median, 0.3-second p95, 1.6-second maximum). The first move had no separate timestamp. These rounded UI times include browser scheduling and move acceptance, not engine search alone.
- This adds one 2900 win alongside an earlier 2900 loss; prior 3200 games include two wins. These small samples do not establish a calibrated Elo rating. Full run details are in [`super-chess-bot/AGENTS.md`](super-chess-bot/AGENTS.md) and [`super-chess-bot/docs/browser-verification.md`](super-chess-bot/docs/browser-verification.md).
- As of 2026-10-12, the engine integrates asynchronous Syzygy 7-piece tablebases via Lichess (benchmarked live across 10 endgames: min 161.6 ms, p50 219.4 ms, mean 300.1 ms, p95 834.0 ms, in-memory cache <0.01 ms), Multi-PV analysis (top 3 lines with colored arrows), Ex-Gaussian entropy timing delays, GM menu commands (`GM_registerMenuCommand`), and closed Shadow DOM / WeakSet UI ownership tracking. These mechanisms do not guarantee undetectability.


## Super Chess Bot architecture (2026-10-13)

- Source now follows responsibility directories: `app`, `chess`, `sites`, `engine`, `game`, `board`, `settings`, `ui`, `userscript`, and `shared`. See [architecture](super-chess-bot/docs/architecture.md).
- PyChess runtime support is removed. Standard player games on Chess.com and Lichess form the supported matrix; full variant transports on both sites remain deferred.
- Chess.com move observations prove local application only. Reports require a finished game, and automatic retries stop before repeating an uncertain dispatched move.
- Refactor verification: 340 tests across 29 suites, lint, TypeScript, Knip, and both production builds passed. See [execution ledger](super-chess-bot/docs/superpowers/plans/2026-10-13-execution-ledger.md) and project [AGENTS.md](super-chess-bot/AGENTS.md).

## Super Chess Bot v12.0.0 — Premove Engine (2026-10-14)

- **Instant 0 ms Premoves**: Hybrid FEN-keyed premove engine combining own-turn recapture-chain steering, opening book follow-ups, and an opponent-turn Multi-Branch Ponder Table (up to 4 branches). Dispatches with 0 ms delay on exact FEN match.
- **Board & Display Fixes**: Broadened Lichess board selector support across dynamic layouts; stabilized Multi-PV line display to eliminate per-ply flickering; cleaned up verbose disclaimers from the user activity log.
- **Verification**: 428 tests across 34 suites, Biome, strict TypeScript, Knip, and dual production builds passed. See [`super-chess-bot/docs/superpowers/plans/2026-10-14-hybrid-premove-engine.md`](super-chess-bot/docs/superpowers/plans/2026-10-14-hybrid-premove-engine.md).

## Better ImpexCube v2.0.0 (2026-11-09)

- **SSRS ReportViewer & Document Previews**: Preserved authentic white document canvas with black text on `_oReportCell` while styling outer toolbars in dark panel palette (`#252421`) with inverted glyphs; eliminated sliced paper artifacts and empty trailing white voids.
- **Navigation Bar & Multi-Level Popovers**: Anchored `#nav` dropdowns and multi-level flyouts cleanly at `top: 100%` and `left: 100%`, eliminating native 25px top-padding blackouts, harsh white right borders, and cyan background bleed. Added subtle chevrons (`›`) and rounded card elevation.
- **Controls & Accessibility**: Sized date inputs to minimum 98px to prevent 10-character date truncation (`DD/MM/YYYY`); fixed context menu (`.contextMenu`) coordinate calculation jump; themed DevExtreme grids (FreightCube); replaced low-contrast inline colors.
- **Concurrency & Lifecycle Safety**: Fixed unbounded pointerdown listeners, DBK blur races, multi-page job search generation tracking, and context-switch session storage scoping.
- **Verification**: 26 unit tests across 9 suites, strict TypeScript (`tsc --noEmit`), Biome linter, Knip, and production build passed cleanly. Full live browser verification performed across all routes.

## Better ImpexCube v2.4.1 (2026-11-15)

- **Job Copy & Standalone Utility Theming**: Themed `#MainDiv` and generalized legacy white container overrides across utility pages (`frmCopyEJobDetails.aspx`). Styled centered utility tables into elevated dark cards with gold headings (`#ContentPlaceHolder1_lblIName`), aligned inputs and buttons (`#ContentPlaceHolder1_btnViewJob`), and responsive grid scroll areas (`.grid_scroll-2`).
- **Accessible Status Badges**: Added `--bic-success` (`#86efac`), `--bic-success-bg` (`#1a382b`), `--bic-success-border` (`#2d6a4f`), and danger badge tokens; converted bare inline success/error message labels (`#ContentPlaceHolder1_lblMessage`) into high-contrast status pill callouts.
- **Verification**: 30 unit tests across 10 suites, Biome linter, strict TypeScript, Knip, and production build passed cleanly. Visual browser verification confirmed via screenshots.

## Better ImpexCube v2.5.0 — Product History navigation (2026-11-18)

- **Fast invoice/product switching**: The export product page History panel is now a compact card with one-click invoice and product chips that drive the native `ddlInvNo`/`ddlProductSLNo` selects and their existing `__doPostBack` handlers. Chip groups are hidden when fewer than two real options exist.
- **Automatic first invoice**: The first real invoice is selected once per job, dispatching its native `change` so ImpexCube loads the product list without a `--Choose--` step. Server-selected invoices and selections the user clears or changes are never overridden.
- **Panel layout**: Restyled the table into a rounded card with a gold HISTORY heading, aligned Job No/Go controls, a scrollable chip area, a dense stat list with highlighted key values, and a full-width Submit All button. Status text becomes a muted pill and the row hides when empty.
- **Verification**: 37 tests across 11 suites, strict TypeScript, Biome, Knip, and the production build passed. Live read-only browser checks on `EXP-2627-731` auto-selected `INV-731-101`, switched to `INV-731-104` by chip, and moved between products 1–7 without console errors; no data was submitted.

## Better ImpexCube v2.5.1 — dependency refresh (2026-11-18)

- Upgraded the toolchain to Biome 2.6.8 (config schema updated) and Vite+ 1.7.0, refreshed transitive dependencies, and rebuilt `dist/better-impexcube.user.js`.
- **Verification**: 37 tests across 11 suites, strict TypeScript, Biome, Knip, and the production build passed.

## Better ImpexCube v2.5.2 — History chips and scroll-lock fix (2026-11-18)

- **More invoices visible**: Raised the History chip lists to whole rows (eight invoice rows, four product rows) with a thin scrollbar and row-aligned caps, so pills are no longer sliced mid-height. Scrolling past either list now chains to the page instead of being contained.
- **Stuck page scrolling**: The actual lock was a leftover `jconfirm-noscroll` class on `<body>` after the “New Login Detected” prompt was dismissed. `new-login.ts` now removes it whenever no jquery-confirm dialog remains, including at startup. Live check: removing the class restored wheel scrolling from 0 to 195px.
- **Verification**: 43 tests across 11 suites (including disabled-option, single-option group and scroll-lock cases), strict TypeScript, Biome, Knip, and the production build passed.

## GitHub Filter v9.0.0 — Preact query console (2026-11-20)

- **Preact port**: The search panel is now a Preact component tree (`ui.tsx`) with controlled `FormState` inputs, replacing the imperative `el()` builder. The launcher stays imperative because Turbo re-appends it to `<body>`. `dom.ts` is gone; `icons.tsx` holds the Octicon registry and `<Icon>`.
- **Live query tape**: The footer compiles the exact GitHub query as you type, colouring qualifier keys (`language:python`) and keeping the local hide list on its own line. `queryParts()` is the shared source for the tape, copy and `buildUrl`.
- **Redesign**: One canvas with hairlines instead of stacked bands; scope pills replace the type select, a monospace key gutter turns every input into a query row, Sort moved into the Qualifiers header, and presets show their compiled query with inline second-click delete. Panel width 440px, bottom sheet under 768px.
- **Library refresh**: Preact 11.2.0 (only runtime dependency), vite-plus 1.7.0, Biome 2.6.8, happy-dom 21.0.4, TypeScript 7.0.2, Knip 6.46.1; added `knip`/`check` scripts and `knip.json`.
- **Verification**: 24 tests across 2 suites, strict TypeScript, Biome, Knip, and the production build passed (70.0 kB, 20.1 kB gzip). Live browser checks at 1440×900 and 390×844 covered light/dark/auto themes, typed queries and tape, preset save/load/delete confirmation, Esc and backdrop close, disabled Save, and the launcher's hover/focus pill.


## GitHub Filter v10.0.0 — Sliders, calendars, scope removal (2026-11-20)

- **Renamed**: The userscript is now **GitHub Filter** (`NAME`, panel title, launcher label and tooltip, GM menu command, `vite.config.ts` metadata). Directory and output filename stay `github-filter` / `github-filter.user.js`.
- **Removed**: The scope switch (Code, Issues, PRs, Discussions, Users) and the `extension`/`size` qualifiers. Every remaining control is a repository qualifier, so `buildUrl` always sends `type=repositories`; a v9 preset's leftover values are dropped and a pasted `size:`/`ext:` term stays as free text.
- **Two-way sliders**: `stars` and `forks` are dual-thumb ranges over non-linear stop scales (10 → 100k), built from two stacked transparent `<input type=range>` elements with thumb-only pointer events and a `lead` z-index for the thumb last grabbed. A bare minimum compiles to `stars:>=500`, a full range to `stars:500..1000`.
- **Calendars**: `created` and `pushed` use native `<input type=date>` pairs with real pickers and inclusive `from`/`to` bounds (`created:2024-01-01..2024-06-30`).
- **Typed state**: `FormState` no longer holds one raw string per qualifier — `repo`/`lang` stay text, ranges are `{min,max}`/`{from,to}`. Parsing widens strict operators (`stars:>500` → `>=501`) so a round-trip is exact, and v7/v9 presets still load through `normalizeState`.
- **Verification**: 32 tests across 2 suites, strict TypeScript, Biome, Knip, and the production build passed (80.8 kB, 22.4 kB gzip). Live checks at 1440×900 and 390×844 covered slider drags, calendar fields, clear buttons, presets, and all three themes; on github.com a `stars:>1000 language:rust created:>2024-01-01` URL parsed into the controls and the hide list dropped all 10 rows.

## GitHub Filter v10.1.0 — Code audit, bug fixes, UI/UX polish (2026-11-20)

- **Audit & Bug Fixes**:
  - Fixed numeric range compilation from `<${max}` to `<=${max}`, preventing decrement drift on repeated URL roundtrips (`<100` -> `99` -> `98`...) and aligning with inclusive `500..1000` ranges.
  - Fixed query tokenizer breaking quoted qualifiers with spaces (e.g. `language:"Jupyter Notebook"` or `-repo:"org/some repo"`) by upgrading `splitTerms` regex and preserving quotes in `readQuery`.
  - Fixed dual slider track click lockups when thumbs coincide (`lo === hi`), prioritizing thumb direction and updating `lead` state on track jumps and keyboard tab `onFocus`.
  - Fixed hide list persistence: `scanResults` now toggles `.ghf-hidden` so clearing or modifying hide terms immediately unhides rows.
  - Fixed userscript DOM bootstrap timing: guarded `watchResults` and launcher mutation observers against early document execution.
- **UI & UX Modernization & Codebase Streamlining**:
  - Replaced cramped monospace table layout with elevated dark Primer cards, fluid inputs, and accessible focus rings.
  - Locked to dark theme only: eliminated theme toggling complexity, removed `theme.ts`, streamlined CSS variables, and reduced bundle size (76.6 kB, 21.4 kB gzip).
  - Fixed SVG colors: added explicit `fill="currentColor"` so icons always inherit text/accent colors instead of rendering black.
  - Eliminated DRY violations & bloat: consolidated redundant field, slider, and date pickers in `ui.tsx` and unified `styles.ts`, reducing source lines by >1,200 LOC without removing features.
  - Added 1-click quick chips for modern languages (`TypeScript`, `Python`, `Rust`, `Go`, `Zig`, `Swift`, `Kotlin`, `C++`), logarithmic star cutoffs (`1+`, `10+`, `100+`, `1k+`, `10k+`), and date presets (`Past 7d`, `Past 30d`, `Past year`).
  - Upgraded sliders to fine-grained logarithmic stops starting from 0 and 1 (`STARS_STOPS` / `FORKS_STOPS`), supporting searches for `1+` star repos.
  - Aligned with modern web platform guidance: added declarative `closedby="any"` to `<dialog>`, applied `overscroll-behavior: contain` to `:modal` and `::backdrop` (with `overflow: hidden`) to prevent background scroll chaining.
  - Upgraded live query tape into an interactive chip console with 1-click token removal (`×`), formatted hide pills, and visual copy confirmation.
  - Enhanced launcher FAB with active filter count badge when viewing filtered search results.
- **Verification**: 37 tests across 2 suites, strict TypeScript, Biome linter, Knip, and production build passed cleanly.

## GitHub Filter v10.2.0 — Smooth continuous sliders, single-page architecture, compact UI (2026-11-20)

- **Silky Smooth Logarithmic Sliders**: Replaced stepped notched inputs with continuous pointer-captured dual sliders (`SmoothSlider`). Maps normalized ratios to natural human-rounded values across 5 orders of magnitude (1+ to 100k+ stars and 1+ to 25k+ forks). Features custom thumbs with scale and hover/active glow, accent fill with drop shadow, and full ARIA keyboard accessibility.
- **Symmetric Metric Quick Chips**: Integrated compact quick-chip thresholds directly into the slider header next to the live readout for both Stars (`1+`, `10+`, `100+`, `1k+`, `10k+`) and Forks (`1+`, `10+`, `100+`, `1k+`), eliminating dedicated chip rows and maintaining UI symmetry.
- **Unified Single-Page Architecture**: Completely removed dual-tab header (`Builder` / `Presets` tabs removed). Presets now live directly on the main panel as interactive chip pills with 1-click load, instant search run (`➔`), and 2-click delete confirmation, paired with an inline preset save row.
- **Compact UI Density**: Reduced dialog width to 420px, tightened inner padding (8px 10px), condensed field gaps, input heights (28px), date pickers (26px), live query tape, and buttons (28px) for maximum information density without unnecessary vertical scrolling.
- **Verification**: 38 tests across 2 suites, strict TypeScript, Biome linter, Knip, and production build passed cleanly (78.5 kB, 21.7 kB gzip).

## GitHub Filter v10.2.1 — Mobile bottom sheet & touch experience (2026-11-20)

- **Mobile Bottom Sheet Architecture**: Anchored `<dialog>` as a native bottom sheet on mobile screens (≤767px) with top rounded corners (`16px 16px 0 0`), subtle drag handle pill (`.ghf-drag-handle`), and definite `height: 85dvh; max-height: 88dvh;`. Resolved flexbox indefinite height expansion under CSS 2.1 §10.5, locking header and actions into view while giving `.ghf-body` smooth momentum scrolling (`-webkit-overflow-scrolling: touch`).
- **Touch Slider & Ergonomics**: Fixed `SmoothSlider` pointer handling to only require `button === 0` for mouse events, enabling seamless touch dragging. Expanded mobile thumb touch hit area to 42px via `::before` pseudo-element, increased button/input heights (34–36px), and enlarged tap targets across chips and date pickers.
- **iOS Safari & Keyboard Polish**: Enforced `font-size: 16px !important` across mobile inputs to stop iOS Safari from auto-zooming viewports on focus. Gated auto-focus on `.ghf-input` to `window.innerWidth > 767` to prevent the mobile virtual keyboard from crushing the sheet on open.
- **Dismissal & Launcher Cleanup**: Upgraded `<dialog>` outside-tap detection to check bounding rect coordinates, preventing accidental closure from inner clicks while maintaining light dismiss on the backdrop. Automatically hidden launcher FAB while the dialog is open.
- **Verification**: 38 tests across 2 suites, strict TypeScript (`tsc`), Biome linter, Knip, and production build passed cleanly (81.2 kB, 22.3 kB gzip). Visual mobile rendering confirmed at 390px width.

## GitHub Filter v11.0.0 — Native Primer integration, responsive layout, accessible controls (2026-11-20)

- **Native Primer Design Tokens & Themes**: Replaced hardcoded dark palette and `color-scheme: dark` overrides with authentic GitHub Primer design tokens (`--bgColor-*`, `--fgColor-*`, `--borderColor-*`, `--button-*`), adapting automatically to GitHub's light, dark, and auto/system color schemes with full token fallback cascades and accessible `:focus-visible` rings.
- **Native Chrome Launcher Placement**: Seamlessly embeds the launcher directly into GitHub's own UI chrome: within the "Filter by" sidebar region (`[role="region"][aria-labelledby="search-filters-title"]`) on desktop and tablet, and as a native full-width filter row beneath `[data-testid="filter-button"]` on mobile viewports. Idempotent slot placement, Turbo navigation hooks (`turbo:load`, `popstate`), and bounded retries prevent floating button flashing during page hydration.
- **Cross-Platform Responsive Architecture**: Optimized viewports across mobile (≤767px bottom sheet with drag handle, `85dvh` touch momentum scrolling, 16px form inputs preventing iOS zoom, 42px touch hit targets), tablet (drawer with coarse-pointer touch sizing), and desktop (440px modal dialog with backdrop light-dismiss).
- **Smooth Quantized Keyboard Sliders & Accessibility**: Replaced naive ratio stepping with value-based quantized navigation (`stepValue`) for logarithmic slider tracks, preventing keyboard ArrowRight wedging at minimum bounds (`1+`). Added full ARIA accessibility (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-pressed`, `aria-live`).
- **Resilient State & Turbo Integration**: Validated stored presets and migrations against schema corruption; hardened Turbo navigation with `Turbo.visit` and URL assign fallbacks; scoped scanner mutation observer to `document.documentElement` to survive Turbo body re-renders.
- **Verification**: 58 unit tests across 4 test suites, strict TypeScript (`tsc`), Biome linter, Knip, and production build passed cleanly (97.2 kB, 25.7 kB gzip).

