# AGENT — Babepedia Advanced Filter Userscript

## Overview
A Tampermonkey/Violentmonkey userscript that adds advanced filtering capabilities to Babepedia list pages. Since list pages (like Top 100) only show names and thumbnails, the script fetches individual profiles asynchronously, extracts biography stats (age, ethnicity, professions, cup size, natural/fake boobs, and performance acts), caches them locally in extension storage, and provides a single-drawer UI (Filters view and Settings view) to customize the active view.

## Structure
bpedia/
├── dist/
│   └── bpedia-filter.user.js # Built userscript bundle
├── package.json              # Bundling scripts & dependencies (vite, vite-plugin-monkey)
├── tsconfig.json             # TS compiler configuration
├── vite.config.ts            # Vite + monkey plugin configuration
├── AGENT.md                  # Project context and state tracking
└── src/
    ├── main.ts               # Entry point, event listeners, and parallel scrape queue
    ├── style.css             # Solid responsive styling
    ├── types.ts              # TS interfaces for profile & settings
    ├── parser.ts             # Profile scraper and nationality country-code mapper
    ├── cache.ts              # Storage API wrapper for user cache and filters
    └── ui/
        ├── progress.ts       # Page top progress bar
        ├── badges.ts         # Corner badge layout injection (combined cup + boob status dot)
        ├── icons.ts          # Shared SVG icon factory
        └── filterPanel.ts    # Single FAB + drawer: filter controls & settings views

## Conventions
- **Userscript format**: Built via `vite-plugin-monkey`, output matches standard UserScript tags.
- **Vanilla TS & DOM**: Plain DOM API manipulations to avoid framework overhead on mobile.
- **Asynchronous Scraping**: Parallel fetches (up to 4 concurrent) with 60ms staggered dispatch starts and incremental cooldown backoff on rate limits.
- **Client-side Caching**: Profile attributes cached via `GM_getValue`/`GM_setValue` with namespace keys.
- **Responsive Theme Adaptability**: Styling automatically responds to `.lightsoff` class on the body tag for dark mode.

## Dependencies & Setup
- Violentmonkey, Tampermonkey, or Greasemonkey browser extension.
- Metadata headers: `@grant GM_setValue`, `@grant GM_getValue`, `@grant GM_deleteValue`, `@grant GM_listValues`, `@grant GM_xmlhttpRequest`.

## Critical Information
- **Missing Data on Lists**: List page HTML only contains `thumbshot` containers with a link to the profile and an image. No biography details are present in the list HTML.
- **Rate-Limiting Protection**: Fetching up to 100 profiles per page could trigger server-side rate limits or Cloudflare challenges. Fetch requests run at 3 concurrent with 150ms staggered starts, standard browser headers, and exponential cooldown backoff.
- **Universal Container Support**: Performer cards are identified via `.thumbshot` anchors across `#thumbs`, `#thumbs2`, `.results`, and category pages, while explicitly filtering out sidebar navigation (`.menuthumb`, `aside`).
- **URL Normalization**: URLs are cleaned to bare slugs (stripping domain, query params, hash fragments), and requests are dispatched to canonical `https://www.babepedia.com/babe/${slug}` with native `fetch` fallback.
- **Cache Invalidation**: Profile details (e.g. age, rating) change slowly, but we should store a timestamp to allow optional cache invalidation or update.

## Insights
- **Performance**: Synchronous `GM_getValue` lookups inside loop iterations (e.g., search filtering hot paths) cause UI stuttering. Pre-populating an in-memory Map once on page load and reading exclusively from memory keeps card rendering lag-free.
- **Combined Badges**: Merging related visual indicators (e.g., green/red SVG dots for natural/implants inside the cup size badge) minimizes thumbnail clutter and maximizes space for the performers' pictures.
- **Dedicated Panel Toggles**: Keeping settings (badge controls, cache wippers) and filters within a single drawer toggled via a settings button reduces panel clutter and keeps mobile navigation significantly cleaner.
- **Coalesced Updates**: Use `requestAnimationFrame` to batch filter/tag DOM updates per frame instead of per-scrape. Prevents 3× redundant filter passes per profile fetch.
- **Diff-based Tags**: Track known tag values in Sets. Only append new DOM elements instead of `innerHTML = ''` + full rebuild on every scrape.
- **CSS-driven Badge Visibility**: Hiding badges via CSS parent toggles on `document.body` instead of container `#thumbs` ensures badge visibility settings work on all listing page layouts.
- **Graceful Unscraped State**: Dimming unscraped cards (`opacity: 0.5`) rather than hiding them entirely ensures the user can still browse cards if network issues or rate-limits delay profile scraping.

## Blunders
- `Cache.getBadgeSettings()` was called per-thumbnail (100× GM reads). Fix: pass settings as param from caller.
- `clearCache` used `localStorage.clear()` — wrong storage. GM data lives in extension storage. Fix: use `GM_listValues` + `GM_deleteValue`.
- Nationality parser regex failed on actual HTML (`<span class="fi fi-us"></span> (American)`). Fix: extract from parentheses.
- Search input used `change` event (fires on blur only). Fix: use `input` event with 200ms debounce.
- Progress bar `querySelector('.bp-drawer-header h3')` hit the wrong drawer. Fix: target `#bp-filter-drawer` specifically.
- Hair/eye color data was parsed but had no filter UI. Fix: added tag containers.
- Badge DOM thrashing: rebuilding badges on every keypress. Fix: render once and toggle visibility via CSS.
- Storage writes rate: slider drags calling GM_setValue per pixel. Fix: debounced storage writes.
- Range cross-over: dragging min slider past max caused zero matches. Fix: bound sliders values programmatically.
- Search badge text pollution: searching read textContent of badges. Fix: extract performer name cleanly.
- Autopager progress limit: total count of items to scrape was static. Fix: increment total dynamically.
- Country code substring fallback displayed incorrect ISO letters. Fix: remove substring fallback, display null if unmapped.
- Slider stale state read: debounced GM storage writes caused stale readings on slide events. Fix: added synchronous in-memory settings cache.
- Collapsing UI on scrape: unscraped cards vanished when filters were active. Fix: kept visible and dimmed unscraped cards until parsed.
- Title hijacking: scraping progress updates overwrote drawer title when settings view was open. Fix: check view visibility before text override.
- Scraper memory leak: itemRetries map grew indefinitely. Fix: clean up map keys on item success/max-retry skip.
- Case-sensitive professions: strict string includes check failed on casing variants. Fix: normalize to lowercase and check flexibly.
- Filter hot path DOM queries: typing in search triggered multiple querySelector calls per card. Fix: cache name on element attribute.
- Heavy mobile blur: full-screen 20px blur caused scrolling jank on mobile. Fix: disable backdrop-filter and fallback to solid background colors.
- SVG innerHTML and inline styles: mixed styling rules and string-interpolated SVGs. Fix: removed redundant styles, built SVGs via namespace DOM APIs.
- Logic duplication: same filter activity checks repeated in three places. Fix: refactored checks to reuse getActiveFiltersCount.
- Verbose logic chains: long chains of if checks nested in applyFiltersToPage. Fix: desloppified using single type-safe matches expression.
- Scraper retry boilerplate: onload and onerror blocks duplicated failure logic. Fix: extracted shared onRequestFailed helper plus handleRetryable/handleTerminal.
- Slider bounds listener boilerplate: repetitive min/max listener bindings. Fix: looped listener assignments over pair array.
- Cache try/catch boilerplate: JSON parsing try/catch blocks repeated across multiple getters. Fix: extracted a safeParse utility.
- Corrupted blank cache: truncated HTML loads or Cloudflare challenge pages got cached as valid blank profiles. Fix: throw verification error in parser if info block is missing.
- Mobile zoom input focus: focusing 13px inputs on mobile triggered browser auto-zoom, hiding the fixed filter FAB off-screen. Fix: set input font-size to 16px in mobile media query.
- Fatal queue drop on parse failure: when `parseProfileHtml` threw `Verification failed` or hit a Cloudflare challenge, `dispatchItem` caught the error, deleted `itemRetries`, incremented `scrapedCount++`, and silently dropped the profile. Fix: route through `handleRetryable` or `handleTerminal` and back off exponentially.
- Hardcoded container lockout: `main.ts` bailed out early if `document.getElementById('thumbs')` was null, failing on search pages (`.results`), homepage multi-grids (`thumbs2`...`thumbs5`), and category listings. Fix: target any container with `.thumbshot` while filtering out sidebar menus (`.menuthumb`, `aside`).
- Comma truncation in votes/favorites: regex `\d+` matched `1` from `1,014 votes` or `1,500 favorites`. Fix: strip commas from strings before matching integer digits.
- Bra size conversion text contamination: bra size text like `34D (show conversions - UK...)` caused the cup extraction regex to pick up letters from the conversion text. Fix: strip conversion notes and parenthetical strings before extracting cup letters.
- Cloudflare challenge undetected: Cloudflare challenge responses caused verification errors treated as permanent. Fix: detect challenge tokens in HTML (`cf-chl-opt`, `challenge-platform`) and trigger rate-limit cooldown.
- Performer name extraction noise: profile headers contained rankings like `#1: Kendra Lust` and ratings `9.03/10`. Fix: clean prefixes, rating suffixes, and whitespace.
- Boob status badge dropped when cup size null: performers with known boob status (Natural/Implants) but unknown cup size didn't display the boob status dot. Fix: display status dot with abbreviation (`Nat` / `Imp`) even if cup size is unknown.
- Badge CSS scope bug: filter panel toggled badge classes (`bp-hide-age`, etc.) on `#thumbs` instead of `document.body`. Fix: toggle classes on `document.body` and define global `body.bp-hide-*` CSS rules.
- Redundant synchronous export loop: `exportData` called `GM_getValue` synchronously in a loop over all keys. Fix: read directly from the synchronized in-memory `dbCache`.
- Stale export version: `Cache.exportData` claimed `1.1.1`. Fix: aligned version metadata to `2.4.0`.
- Bust/waist/hips always null: measurements split on ASCII hyphen but live pages use en-dash. Fix: split on hyphen/en-dash/em-dash.
- Stalled requests wedged the pump: no timeout meant a hung fetch leaked its concurrency slot. Fix: 30s `timeout` + `ontimeout` retry path.
- Absolute vs relative hrefs double-fetched: `cleanUrl` only stripped relative `/babe/` prefixes. Fix: strip origin first.
- RAF coalesce duplication: `scheduleFilterApply`/`scheduleTagRefresh` repeated the same pending-flag boilerplate. Fix: shared `coalesce` factory.
- Unsaved filter settings on exit: debounced filter settings saves were lost on immediate tab close. Fix: added `pagehide` listener that flushes settings immediately.
- Poisoned import settings: JSON imports did not perform validation and could crash card filters. Fix: added schema validator check to `importData`.
- Redundant DOM queries during progress updates: ProgressBar queried header elements on every completion frame. Fix: added lazy title DOM reference caching.
