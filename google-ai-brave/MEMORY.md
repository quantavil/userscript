# Project: google-ai-brave

## Overview
A userscript that extracts Google AI Mode search results and injects them into the Brave Search sidebar. Recently migrated from a monolithic JavaScript script to a modular TypeScript project using esbuild for bundling.

## Structure
- `src/`
  - `index.ts`         # Entry point / router
  - `google.ts`        # Extraction logic (runs on Google)
  - `brave.ts`         # Sidebar panel & fetch orchestration (runs on Brave)
  - `markdown.ts`      # Turndown + GFM for Markdown conversion
  - `katex-render.ts`  # KaTeX math rendering logic
  - `utils.ts`         # Shared helpers
  - `constants.ts`     # Configuration & selectors
  - `types.ts`         # TypeScript interfaces
  - `icons.ts`         # SVG icon constants
  - `gm.d.ts`          # Greasemonkey type definitions
- `build.mjs`          # esbuild build script
- `package.json`       # Dependencies & version
- `meta.txt`           # Userscript metadata banner
- `tsconfig.json`      # TypeScript configuration
- `context.md`         # Migration notes & architecture details

## Conventions
- Modular TypeScript architecture.
- Bundled into an IIFE using esbuild.
- Post-build step prepends `meta.txt` to the bundle.
- Cross-tab communication via `GM_setValue`/`GM_getValue` and `GM_addValueChangeListener`.

## Dependencies & Setup
- `bun` for package management (`bun.lock` is gitignored).
- `turndown`, `turndown-plugin-gfm` for Markdown.
- `esbuild` for bundling.
- `typescript` for type checking.
- KaTeX is loaded via `@require` in `meta.txt`.

## Critical Information
- Pop-ups must be allowed for `search.brave.com`.
- Background tab management is critical to avoid orphaning.
- Multi-query cache is handled via Greasemonkey storage.

## Insights
- Using `MutationObserver` for sidebar detection is more efficient than polling.
- Turndown rules are customized to handle `<mark>` and KaTeX `data-latex`.

## Blunders
- (None logged yet)
