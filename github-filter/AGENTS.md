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
├── scanner.ts        # Hides result rows matching the hide list
├── scanner.test.ts   # Covers matching, re-render recovery, and page gating
├── storage.ts        # localStorage accessors, preset CRUD, legacy migration
├── styles.ts         # The whole stylesheet as one template literal
├── theme.ts          # auto/light/dark cycle
├── icons.tsx         # Octicon path registry, <Icon>, and the imperative launcher glyph
└── ui.tsx            # Preact: dialog shell, query table, sliders, date ranges, tape, presets
```

## Conventions
- **The field schema is the single source of truth.** `KEYWORDS`, `SORTS` and `QUALIFIERS` in `config.ts` drive the rendered rows, `queryParts`, the preset summaries and URL parsing. Adding a filter means adding one entry there — `kind` (`text` / `number` / `date`) picks the control and the shape of the value, and the union narrows `state[field.id]` for the compiler.
- **`FormState` is typed, not stringly.** `repo`/`lang` hold the raw comma-separated input; `stars`/`forks` are `{ min, max }` where 0 means unbounded; `created`/`pushed` are `{ from, to }` holding `YYYY-MM-DD` or empty. Never go back to one raw string per qualifier — the sliders and date pickers have no way to round-trip it.
- **Preact owns the panel.** `ui.tsx` is a component tree (`App`, `QueryRow`, `TextRow`, `RangeRow`, `DateRow`, `PresetRow`), state is `useState`/`useMemo`, and JSX escapes user-supplied preset names and qualifier values. Do not reintroduce markup strings. The launcher button is the only imperative node, because it must be re-appended to `<body>` after Turbo swaps.
- **The panel opens after state commits.** `openPanel` updates builder state and bumps `openRequest`; a `useLayoutEffect` then calls `showModal()`, so the dialog never flashes the previous search before painting the new one.
- **The query tape is derived, not stored.** `queryParts(state)` returns `{ text, kind }` parts; the footer colours qualifier keys and `buildQuery` joins the same parts for copy and search. Do not render a separately-built preview string.
- **Themes are token blocks.** Every value is a `--ghf-*` custom property. `auto` maps those onto GitHub's own Primer variables (`--bgColor-default`, `--fgColor-muted`, …) with legacy `--color-*` fallbacks, so it tracks dimmed and high-contrast for free and needs no observer. `light`/`dark` override with literal Primer palette values, including `color-scheme` so native date pickers follow.
- **Pure logic is separated and tested.** `query.ts` has no DOM or network dependency; everything else is glue.
- **Version and description come from `package.json`** via `vite.config.ts`.

## Things that are load-bearing
- **React owns the result rows, we don't.** GitHub hydrates `[data-testid="results-list"]` after the script runs, and rewrites `className` from its own state — which strips `ghf-hidden` back off. `scanResults` is therefore stateless and recomputed from scratch on every pass rather than tracking rows in a `WeakMap` or a `data-*` flag. An attribute survives the re-render and makes a row look handled when it is not. Re-adding a class that is already present mutates nothing, and the `MutationObserver` watches `childList` only, so this cannot loop.
- **Row text is walked, not read from `textContent`.** `textContent` concatenates adjacent nodes with no separator, so `<a>acme/repo</a><p>wontfix…</p>` reads as "repowontfix" and a whole-word match fails at element boundaries. `rowText()` walks text nodes and joins with a space; `innerText` would be correct too but forces layout on every pass.
- **The dual slider is two stacked range inputs.** Each input is transparent and `pointer-events: none`; only `::-webkit-slider-thumb` / `::-moz-range-thumb` opt back in, so both thumbs stay grabbable while the container handles a press on the bare track. The fill is a separate div positioned between the two thumb percentages. `THUMB` in `ui.tsx` must stay equal to the 14px thumb in `styles.ts`: the click maths and the fill alignment both assume it.
- **Thumb `z-index` follows the last one touched.** When both thumbs sit on the same stop only one can be hit-tested, so `lead` state raises whichever the user grabbed. Without it, a range collapsed to a single point can never be reopened.
- **A stacked row is a `div`, not a `fieldset`.** Chrome renders a `<legend>` outside the grid flow, so it jumps to the far edge of the row. Use `<span class="ghf-key" aria-hidden="true">` plus `aria-label` on each control, the same pattern the text rows use.
- **`<dialog>` + `showModal()`** provides the focus trap, `Esc` handling, inert background and top-layer stacking. Do not reintroduce a hand-rolled overlay or a z-index above 100.
- **No `backdrop-filter`.** A 440px full-height blurred surface repainted on every scroll frame was most of v7's jank.
- **The launcher is present on all GitHub pages.** Fixed bottom-right with `z-index: 9999` and `safe-area-inset` spacing so it stays visible above GitHub UI and Copilot; it expands to a labelled pill on hover/focus and is pointer-only. `syncLauncher()` ensures it stays present across Turbo navigations.
- **One canvas, hairlines.** The panel is a query editor: a monospace key gutter, hairline row separators, a live query tape in the sunken footer. No card stack, no gradients, no decorative blur.

## Removed
Release badges (a per-result "latest tag" badge, backed by `releases.atom` fetching with a cache, fetch pool and rate-limit handling) were removed at the user's request — a request per result row is not worth the rate limiting. `migrateLegacyStorage` clears the leftover `gh-rel-*`, `ghf:scan` and `ghf:releases` keys. Do not reintroduce without asking.

The scope switch (Code, Issues, PRs, Discussions, Users) and the `extension`/`size` filters were removed in v10: every remaining control is a repository qualifier, so `buildUrl` always sends `type=repositories`. A v9 preset's leftover `q.size`/`q.ext` values are dropped by `normalizeState`, and a pasted `size:` or `ext:` term stays in the free-text field rather than being swallowed.

## Dependencies & Setup
- Package manager: `bun`
- Runtime: `preact` 11.2 (the only dependency)
- `bun install`, `bun run build`, `bun run dev`, `bun run test`, `bun run tsc`, `bun run lint`, `bun run knip`, `bun run check`
- GM grants: `GM_registerMenuCommand` only. State is in `localStorage` under the `ghf:` prefix.
- Toolchain: `vite-plus` 1.7.0, `vite-plugin-monkey` 8.1.1, TypeScript 7.0, Biome 2.6.8, happy-dom 21, Knip 6.
