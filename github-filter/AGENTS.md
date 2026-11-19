# AGENT — github-filter

## Overview
A userscript that adds a search-query builder, saved presets, and a hide-words filter to GitHub search. TypeScript + Preact + Vite (vite-plus) + `vite-plugin-monkey`, entry point `src/index.ts`, built to `dist/github-filter.user.js`.

## Structure
```
src/
├── index.ts          # Bootstrap: migrate storage, inject CSS, mount launcher, start scanner
├── config.ts         # IDs, storage keys, selectors, and the field schema
├── query.ts          # Pure: FormState <-> query parts/URL, plus the hide-word matcher
├── query.test.ts     # Covers build/parse round-trips, query parts and qualifier edge cases
├── scanner.ts        # Hides result rows matching the hide list
├── scanner.test.ts   # Covers matching, re-render recovery, and page gating
├── storage.ts        # localStorage accessors, preset CRUD, v7 migration
├── styles.ts         # The whole stylesheet as one template literal
├── theme.ts          # auto/light/dark cycle
├── icons.tsx         # Octicon path registry, <Icon>, and the imperative launcher glyph
└── ui.tsx            # Preact: dialog shell, query table, query tape, presets, launcher
```

## Conventions
- **The field schema is the single source of truth.** `TYPES`, `SORTS`, `KEYWORDS` and `FILTER_GROUPS` in `config.ts` drive the rendered rows, the scope switch, `queryParts`, preset summaries and URL parsing. Adding a qualifier means adding one entry there and nothing else.
- **Preact owns the panel.** `ui.tsx` is a component tree (`App`, `QueryRow`, `QualifierRow`, `PresetRow`), state is `useState`/`useMemo`, and JSX escapes user-supplied preset names and qualifier values. Do not reintroduce markup strings. The launcher button is the only imperative node, because it must be re-appended to `<body>` after Turbo swaps.
- **The panel opens after state commits.** `openPanel` updates builder state and bumps `openRequest`; a `useLayoutEffect` then calls `showModal()`, so the dialog never flashes the previous search before painting the new one.
- **The query tape is derived, not stored.** `queryParts(state)` returns `{ text, kind }` parts; the footer colours qualifier keys and `buildQuery` joins the same parts for copy and search. Do not render a separately-built preview string.
- **Themes are token blocks.** Every value is a `--ghf-*` custom property. `auto` maps those onto GitHub's own Primer variables (`--bgColor-default`, `--fgColor-muted`, …) with legacy `--color-*` fallbacks, so it tracks dimmed and high-contrast for free and needs no observer. `light`/`dark` override with literal Primer palette values.
- **Pure logic is separated and tested.** `query.ts` has no DOM or network dependency; everything else is glue.
- **Version and description come from `package.json`** via `vite.config.ts`.

## Things that are load-bearing
- **React owns the result rows, we don't.** GitHub hydrates `[data-testid="results-list"]` after the script runs, and rewrites `className` from its own state — which strips `ghf-hidden` back off. `scanResults` is therefore stateless and recomputed from scratch on every pass rather than tracking rows in a `WeakMap` or a `data-*` flag. An attribute survives the re-render and makes a row look handled when it is not. Re-adding a class that is already present mutates nothing, and the `MutationObserver` watches `childList` only, so this cannot loop.
- **Row text is walked, not read from `textContent`.** `textContent` concatenates adjacent nodes with no separator, so `<a>acme/repo</a><p>wontfix…</p>` reads as "repowontfix" and a whole-word match fails at element boundaries. `rowText()` walks text nodes and joins with a space; `innerText` would be correct too but forces layout on every pass.
- **`<dialog>` + `showModal()`** provides the focus trap, `Esc` handling, inert background and top-layer stacking. Do not reintroduce a hand-rolled overlay or a z-index above 100.
- **No `backdrop-filter`.** A 440px full-height blurred surface repainted on every scroll frame was most of v7's jank.
- **The launcher is present on all GitHub pages.** Fixed bottom-right with `z-index: 9999` and `safe-area-inset` spacing so it stays visible above GitHub UI and Copilot; it expands to a labelled pill on hover/focus and is pointer-only. `syncLauncher()` ensures it stays present across Turbo navigations.
- **One canvas, hairlines.** The panel is a query editor: a monospace key gutter, hairline row separators, a live query tape in the sunken footer. No card stack, no gradients, no decorative blur.
- **The panel state is `FormState`** — controlled inputs, no `readForm`/`writeForm` DOM scraping. Preset loading assigns a whole state object.

## Removed
Release badges (a per-result "latest tag" badge, backed by `releases.atom` fetching with a cache, fetch pool and rate-limit handling) were removed at the user's request — a request per result row is not worth the rate limiting. `migrateLegacyStorage` clears the leftover `gh-rel-*`, `ghf:scan` and `ghf:releases` keys. Do not reintroduce without asking.

## Dependencies & Setup
- Package manager: `bun`
- Runtime: `preact` 11.2 (the only dependency)
- `bun install`, `bun run build`, `bun run dev`, `bun run test`, `bun run tsc`, `bun run lint`, `bun run knip`, `bun run check`
- GM grants: `GM_registerMenuCommand` only. State is in `localStorage` under the `ghf:` prefix.
- Toolchain: `vite-plus` 1.7.0, `vite-plugin-monkey` 8.1.1, TypeScript 7.0, Biome 2.6.8, happy-dom 21, Knip 6.
