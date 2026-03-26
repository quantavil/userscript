# MEMORY.md Template

# Project: Google AI Mode for Brave Sidebar

## Overview
A Tampermonkey userscript that injects Google's AI-generated search results (`udm=50`) directly into the Brave Search sidebar. It does this by opening a background tab, polling for completion signals, parsing out the HTML content, and rendering it natively in the Brave sidebar via cross-tab communication (`GM_getValue`/`GM_setValue`). Results are cached for 15 minutes.

## Structure
ai-mode-for-brave/
├── main.js       # Core userscript logic: handles Google side (DOM extraction, completion detection) and Brave side (Sidebar UI, orchestration, caching).
└── README.md     # Project documentation, architecture overview, changelog, and setup info.

## Conventions
- **Cross-Manager compatibility:** Cache manipulation relies heavily on robust `try...catch` blocks around `GM_getValue`/`GM_setValue`.
- **DRY Architecture:** Shared functions (`getCache`, `setCache`, `clearFetchLock`, `clearListener`, `closeTab`) prevent messy repetitions.

## Dependencies & Setup
- Requires a userscript manager (e.g., Tampermonkey).
- Uses specific GM grants: `GM_addStyle`, `GM_setValue`, `GM_getValue`, `GM_addValueChangeListener`, `GM_removeValueChangeListener`, `GM_openInTab`

## Critical Information
- Background tabs must execute without interruptions.
- The cache key is `gai_cache` and is limited to 10 queries using a timestamp-based TTL and eviction mechanism.
- The fetch lock (`FETCH_LOCK_TTL`) is 70 seconds to ensure tabs have breathing room under the 60s hard cap.

## Insights
- `Object.keys()` filtering on timestamps (`ts`) effectively manages stale cache eviction without memory bloat.
- The `htmlToMarkdown` helper converts the rich DOM from Google AI into clean Markdown before copying to clipboard, providing a better UX over plain `.innerText`.

## Blunders
- [2026-03-26] EXCESSIVE REPETITION OF CACHE LOGIC → Overuse of `try { const cache = GM_getValue("gai_cache", null); ... } catch (_) {}` created redundant inline code → Fixed in v2.2.0 by introducing global `getCache()` and `setCache()` helpers.
- [2026-03-26] STALE LISTENERS AND TABS → Missing strict unbind checks during fetch timeouts → Fixed in v2.2.0 by adding `clearListener()`, `closeTab()`, and `cleanupFetch()` helpers to handle teardown safely.
