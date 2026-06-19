# Project: userscripts

## Overview
A collection of custom userscripts designed to enhance various web platforms (GitHub, YouTube, etc.) with advanced filtering, UI improvements, and automation. Written in vanilla JavaScript with CSS injection, running via userscript managers like Tampermonkey/Violentmonkey.

## Structure
- `github-filter/`     # GitHub Advanced Search userscript
  - `main.js`          # Core implementation of query builder, release detection, and UI modal
  - `README.md`        # Documentation of features, usage, and installation
- Other subdirectories contain independent userscripts for different websites.

## Conventions
- Single-file implementations per userscript (e.g., `main.js`).
- CSS styling injected into the page head using native `style` elements.
- LocalStorage used for configuration persistence and API response caching.
- Strictly vanilla JavaScript to avoid external dependencies.

## Dependencies & Setup
- Managed via Tampermonkey or Violentmonkey.
- Runs on specific target matches (e.g., `https://github.com/*` for github-filter).

## Critical Information
- GitHub's DOM structure can be dynamic and subject to frequent updates. Selectors are configured under `CONFIG.selectors` in `main.js` to ease maintenance.
- Keep network requests optimized using local caching (e.g., caching GitHub release information).

## Insights
- Using MutationObserver is essential for SPA-like navigation in modern platforms like GitHub where page renders are handled client-side without full reloads.
- In-userscript theme state is persisted in localStorage, falling back to auto-detecting GitHub's system or layout data-color-mode.
- GitHub search pages include links to topic and org pages that can be misidentified as repository pages; use robust URL-based path checks and check against a comprehensive blacklist of reserved routes.


## Blunders
- [2026-06-19] Test script parsing syntax error → Regex matched first nested class bracket instead of outer class end bracket → Mocked full browser context environment to run the entire IIFE script cleanly.

