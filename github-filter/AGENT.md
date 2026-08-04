# AGENT — github-filter

## Overview
A userscript that adds a search-query builder, saved presets, and a hide-words filter to GitHub search. TypeScript + Vite + `vite-plugin-monkey`, entry point `src/index.ts`, built to `dist/github-filter.user.js`.

## Structure
```
src/
├── index.ts          # Bootstrap: migrate storage, inject CSS, mount launcher, start scanner
├── config.ts         # IDs, storage keys, selectors, and the SECTIONS field schema
├── query.ts          # Pure: FormState <-> search URL, plus the hide-word matcher
├── query.test.ts     # Covers build/parse round-trips and qualifier edge cases
├── scanner.ts        # Hides result rows matching the hide list
├── scanner.test.ts   # Covers matching, re-render recovery, and page gating
├── storage.ts        # localStorage accessors, preset CRUD, v7 migration
├── styles.ts         # The whole stylesheet as one template literal
├── theme.ts          # auto/light/dark cycle
├── dom.ts            # `el()` node builder, `svg()`, Octicon path registry
└── ui.ts             # The <dialog> panel: form, tabs, presets, launcher
```

## Conventions
- **The field schema is the single source of truth.** `SECTIONS` in `config.ts` drives the rendered form, `readForm`/`writeForm`, preset chips, and URL parsing. Adding a qualifier means adding one entry there and nothing else. v7 declared a schema *and* hardcoded the markup, so the two drifted.
- **Nodes, never innerHTML.** All DOM is built with `el()` from `dom.ts`. Preset names and qualifier values are user input and used to be interpolated into markup strings.
- **Themes are token blocks.** Every value is a `--ghf-*` custom property. `auto` maps those onto GitHub's own Primer variables (`--bgColor-default`, `--fgColor-muted`, …) with legacy `--color-*` fallbacks, so it tracks dimmed and high-contrast for free and needs no observer. `light`/`dark` override with literal Primer palette values.
- **Pure logic is separated and tested.** `query.ts` has no DOM or network dependency; everything else is glue.
- **Version and description come from `package.json`** via `vite.config.ts`.

## Things that are load-bearing
- **React owns the result rows, we don't.** GitHub hydrates `[data-testid="results-list"]` after the script runs, and rewrites `className` from its own state — which strips `ghf-hidden` back off. `scanResults` is therefore stateless and recomputed from scratch on every pass rather than tracking rows in a `WeakMap` or a `data-*` flag. An attribute survives the re-render and makes a row look handled when it is not. Re-adding a class that is already present mutates nothing, and the `MutationObserver` watches `childList` only, so this cannot loop.
- **Row text is walked, not read from `textContent`.** `textContent` concatenates adjacent nodes with no separator, so `<a>acme/repo</a><p>wontfix…</p>` reads as "repowontfix" and a whole-word match fails at element boundaries. `rowText()` walks text nodes and joins with a space; `innerText` would be correct too but forces layout on every pass.
- **`<dialog>` + `showModal()`** provides the focus trap, `Esc` handling, inert background and top-layer stacking. Do not reintroduce a hand-rolled overlay or a z-index above 100.
- **No `backdrop-filter`.** A 400px full-height blurred surface repainted on every scroll frame was most of v7's jank.
- **The launcher is search-page only.** Fixed bottom-right on every page, it collides with GitHub's Copilot button; `syncLauncher()` adds and removes it on Turbo navigation.

## Removed
Release badges (a per-result "latest tag" badge, backed by `releases.atom` fetching with a cache, fetch pool and rate-limit handling) were removed at the user's request — a request per result row is not worth the rate limiting. `migrateLegacyStorage` clears the leftover `gh-rel-*`, `ghf:scan` and `ghf:releases` keys. Do not reintroduce without asking.

## Dependencies & Setup
- Package manager: `bun`
- `bun install`, `bun run build`, `bun run dev`, `bun run test`, `bun run tsc`, `bun run lint`
- GM grants: `GM_registerMenuCommand` only. State is in `localStorage` under the `ghf:` prefix.
