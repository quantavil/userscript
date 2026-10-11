# AGENT — better-wallhaven

## Overview
A userscript (Better Wallhaven v1.0.0) for wallhaven.cc listing grids: adjustable thumbnail size, persistent detail strip below every thumbnail (free chips + always-visible SVG actions + expander for HD size/props/tags), image click opens externally, zero-fetch browsing, opt-in 4KB API details, lightbox, keyboard nav, cached metadata, mobile-safe (no hover dependency, 34px targets). No sidebar — the grid is full-width. Built using Bun, Vite, TypeScript, and `vite-plugin-monkey`.

## Structure
- `tsconfig.json`: TypeScript configuration specifying ESNext, strict types, and vite-plugin-monkey typings.
- `vite.config.ts`: Vite build configuration mapping client script compiling output metadata.
- `src/styles.ts`: CSS tokens + grid var + thumb overlay + grid bar + sidebar + lightbox via GM_addStyle.
- `src/cache.ts`: LocalStorage and session-map metadata caching.
- `src/api.ts`: 4KB `api/v1/w/<id>` JSON first (`parseApiMeta`), legacy 32KB HTML scrape fallback only.
- `src/extract.ts`: Zero-network listing DOM parse (id, res, favs, category, purity, type, thumbUrl) + `largerThumb`.
- `src/icons.ts`: Inline SVG set (download, expand, open, star, zap, close, prev/next, sliders).
- `src/controls.ts`: Grid size bar (160-480px, `whGridSize` persist, CSS `--wh-cell`).
- `src/thumbs.ts`: Below-strip host per thumbnail + MutationObserver for infinite scroll + dl state.
- `src/detail.ts`: Pure HD block builder (free stats + HD props/tags).
- `src/download.ts`: `dlFile` + `fileNameOf` shared by grid strip and lightbox.
- `src/controls.ts`: Native searchbar grid control (floating fallback).
- `src/grid.ts`: Center-based grid navigation using bounding rect.
- `src/lightbox.ts`: High-resolution lightbox with SVG bar + instant thumb preview.
- `src/main.ts`: Loader, grid control, strip delegation, details expander, key router (Enter opens externally).

## Conventions
- Modular TypeScript structure compiled into a single Userscript (`dist/better-wallhaven.user.js`) via Vite.
- TypeScript follows 2026 strict practice: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUncheckedIndexedAccess`; `unknown` over `any` at API boundaries; tests included in `typecheck` (`bun run typecheck`, `bun test`, `bun run build` all green before commit).
- Selection browsing costs 0 bytes; per-thumb overlay renders free DOM data only. Full fetch (4KB API) happens only on explicit download / HD / fullscreen.
- SVG icons only in new UI (`src/icons.ts`); no emoji glyphs.
- Intercepts clicks via event delegation (works with infinite scroll). Double-click opens details natively.

## Dependencies & Setup
- Built via Bun and Vite.
- Run `bun run build` to generate the userscript.
- Requires Tampermonkey/Violentmonkey context supporting `GM_addStyle`, `GM_xmlhttpRequest`, `GM_download`.

## Critical Information
- Grid size persists to `localStorage` (`whGridSize`) and applies to every thumbnail via CSS `--wh-cell` / `--wh-cell-h` (`!important` beats the native inline `300x200`).
- No sidebar: `#main` keeps its native full width; all details render in the per-thumbnail `.wh-sheet`.

## Insights
- Per-thumb overlays use free DOM data only; old parallel HEAD lookups caused rate-limits. All full info is opt-in per click (4KB API, cached).
- Grid size via CSS `--wh-cell` override beats inline `300x200` without layout thrash; persist `whGridSize`.
- Discrete color palette without legend UI: Category dots are Orange (Anime: `#f60`), Violet (General: `#b07bff`), Blue (People: `#4aa3ff`); Purity dots are Green (SFW: `#6c6`), Yellow (Sketchy: `#fc3`), Red (NSFW: `#f36`). Disjoint hues ensure no overlap with purity traffic lights. Hover tooltips (`title` / `aria-label`) act as the sole labels, keeping UI clean on mobile and desktop.
- Root cause of "mystery blue dot": Substring matching via `cls.includes('thumb-people')` collided with wallpaper IDs such as `thumb-people99` or `thumb-sketchy...`. Fixed with exact class matching (`classList.contains` and space-padded fallback) plus parent fallback.
- Audit fixes (v1.1.0): clean query strings and hash fragments in `fileNameOf`, fallback safety in `dlFile`, multiple-delay sync for proxied favorite clicks.
- Not fixed (false positives): "Category and purity swapped in extract.ts" was an AI hallucination; the mappings were always separate, the true bug was ID substring matching. `as any` in test DOM stubs, `makeAbsolute` fallback, `GRID_KEY` export, legacy `size` branch in cache.

## Blunders
- [2026-07-03] Failed to write MEMORY.md using ArtifactMetadata in write_to_file -> ArtifactMetadata is only valid for files written inside the chat-specific brain artifacts folder -> Omitted ArtifactMetadata for writing files in the workspace.
