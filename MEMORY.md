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
- [2026-06-21] Removed particle burst feature entirely to adhere to simplicity principles.
- [2026-06-21] Gemini API 429 rate limit (due to googleSearch tool grounding) and password save triggers fixed in ai-wishlist.
- [2026-06-21] Flipkart mobile cards resolved to details containers instead of outer card containers because details containers contain coupon/promo images that triggered parent.querySelector('img') check. Resolved by verifying the image source has CDN '/image/' paths.
- [2026-06-21] Product images failed to capture on mobile view or before scroll due to lazy loading patterns (spacer base64 images in src). Fixed by introducing getBestImageUrl in BaseAdapter to check data-src, data-lazy-src, and parse srcset for the highest resolution source.
- [2026-06-21] Amazon mobile image extractor captured the "More like this" icon image instead of the product image because it was the first img element matching .s-image in DOM order. Resolved by prioritizing .s-product-image-container wrappers and filtering out "More like this" images. Bushed userscript version to 1.8.0.




