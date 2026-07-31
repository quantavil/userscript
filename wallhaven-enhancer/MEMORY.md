# Project: wallhaven-enhancer

## Overview
A userscript (Wallhaven Enhancer) that modifies the wallhaven.cc wallpaper listing page to include an explorer-style details side panel, click-to-select behavior, low-resolution details view, full-resolution lightbox viewer, key controls (Download, Favorite, Navigation), and cached wallpaper metadata. Built using Bun, Vite, TypeScript, and `vite-plugin-monkey`.

## Structure
- [tsconfig.json](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/tsconfig.json): TypeScript configuration specifying ESNext, strict types, and vite-plugin-monkey typings.
- [vite.config.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/vite.config.ts): Vite build configuration mapping client script compiling output metadata.
- [src/styles.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/styles.ts): CSS stylesheets injected via GM_addStyle.
- [src/cache.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/cache.ts): LocalStorage and session-map metadata caching.
- [src/api.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/api.ts): Scrapes Wallhaven details page to retrieve exact high-res URLs, sizes, properties, and tags.
- [src/grid.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/grid.ts): Center-based grid navigation using bounding rect.
- [src/sidebar.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/sidebar.ts): Sidebar UI layout and mouse-drag resize handlers.
- [src/lightbox.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/lightbox.ts): High-resolution lightbox keyboard overlay.
- [src/main.ts](file:///home/quantavil/Documents/Project/userscript/wallhaven-enhancer/src/main.ts): Loader and body click/keydown event router.

## Conventions
- Modular TypeScript structure compiled into a single Userscript (`dist/wallhaven-enhancer.user.js`) via Vite.
- Avoid modifying thumbnail structures on listing load (restores native theme styling and avoids rate-limiting background size lookups).
- Intercepts clicks on thumbnail previews via event delegation to select it in the sidebar. Double-click opens details natively.

## Dependencies & Setup
- Built via Bun and Vite.
- Run `bun run build` to generate the userscript.
- Requires Tampermonkey/Violentmonkey context supporting `GM_addStyle`, `GM_xmlhttpRequest`, `GM_download`.

## Critical Information
- Sidebar is resizable and persists width to `localStorage` ('whPanelWidth').
- Elements inside the properties sidebar use Wallhaven's native IDs and classes (`#tags`, `.tagname`, `.sidebar-section`) to automatically inherit global stylesheet designs.

## Insights
- Removing thumbnail overlays completely eliminated the rate-limiting caused by parallel HEAD requests on initial scroll. All info is fetched on-demand when a user selects a thumbnail.

## Blunders
- [2026-07-03] Failed to write MEMORY.md using ArtifactMetadata in write_to_file -> ArtifactMetadata is only valid for files written inside the chat-specific brain artifacts folder -> Omitted ArtifactMetadata for writing files in the workspace.
