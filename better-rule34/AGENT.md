# AGENT — Better Rule34Video

## Overview
- Userscript for rule34video.com — replaces bulky native filters with an industrial brutalist + latex erotic floating FAB + telemetry modal with tactile sliders (rating, views, duration, year), site-wide dark carbon/scanline theming, fixes infinite scroll auto-paging, removes ads, and enables instant client-side filtering. Strictly zero emojis.
- Stack: TypeScript, Bun, Vite, vite-plugin-monkey.
- Build: `bun run build` → `dist/better-rule34.user.js`
- Test: `bun test` (pure logic in `tests/parse.test.ts` + `tests/features.test.ts` + `tests/routes.test.ts` + `tests/nativefilter.test.ts`), `bun run typecheck` (`tsc --noEmit`)

## Structure
- `src/main.ts`: Bootloader, DOM mutation observer, card registry, client filter coordinator, new-tab + bookmark-dock wiring, own-watched overlay, AJAX sort/filter reload handler.
- `src/filterbar.ts`: Floating Action Button (FAB) bottom-right `[ CTRL ]` (dot, no icon), telemetry modal, 4 tactile sliders (rating, views, duration, year) with debounced commits, 4 quick toggles (sound, hd, futa, unwatched), reset-to-defaults (persisted), localStorage persistence (query intentionally ephemeral).
- `src/autopager.ts`: Auto next page infinite scroll engine, listing-page guard (skips `/video/` watch pages), shared `parseNextLink` and `computeNextPageUrl` helpers preserving active `sort_by`, dual triggers (scroll listener + IntersectionObserver), DOMParser, card deduplication, lazy-load fixer, new-tab hardening on appended anchors, `[ PAGE N ]` separators, `reset()` lifecycle on AJAX sort/filter reloads.
- `src/routes.ts`: Shared listing-route helpers (`isPaginationKey`, `stripPageSegment`, `pageNumberFromPath`, `appendPageToPath`) — single source of truth for entity/catalog page shapes used by autopager + bookmarks.
- `src/newtab.ts`: Plain-left-click delegated handler opening `/video/` links via `window.open(_blank, noopener)` + `target/rel` hardening; own watched-id history (powers UNWATCHED when site classes absent).
- `src/bookmark.ts`: EROS multi-bookmark data layer: multi-sector checkpoints, video bookmarks (watch later), schema v2 with v1 auto-migration, import/export.
- `src/bookmark-ui.ts`: EROS Archive Console (tabs for Sectors & Saved Videos, instant filter search, jump/delete buttons, JSON export/import), video card bookmark ribbon, bottom-center micro-toast, dock button with total count badge.
- `src/adcleaner.ts`: Targeted ad selector and inline ad card purger (tight selectors, void return).
- `src/parse.ts`: Pure unit-tested parsers: duration, views, ratings, submittedYear, relative pagination URL resolver, `parseKvsParameters` (extracts `from`, `sort_by`, `q`, `tag_ids`), client filter matcher.
- `src/nativefilter.ts`: Collapsible native `.filters-panel` — default collapsed (persisted), wires the site toggle or injects a matching one.
- `src/styles.ts`: Industrial Brutalist + Erotic Latex aesthetic: `#08060a` carbon substrate, scanlines, `#ff0055` neon magenta hazard glow, custom range slider styling, site-wide theming, archive console, card bookmark ribbons, micro-toasts.
- `src/types.ts`: Type definitions for FilterState, CardData, FutaOption.
- `tests/parse.test.ts`: Bun unit tests for pure parsing and filter routines.

## Site Facts (KVS CMS)
- Video cards: `.item.thumb` in container `.thumbs` (often `#custom_list_videos_*_items` or `.content_general .thumbs`).
- Real video cards have `data-video-card-id` or `a[href*="/video/"]`; ad cards have `<header>AD</header>`, `iframe`, or `/v1/d.php` links. Cards with neither id nor href are dropped (never link to homepage).
- Image lazy loading uses `data-original` and `data-webp`; appended cards must have `img.src` populated with `loading="lazy"`.
- Native filter panel: `.filters-panel` is rethemed with industrial brutalist styling, collapsible toggle, and tactile controls.
- Pagination links: `.pagination .item.pager.next a` holds next relative URL; `data-parameters` carries server offsets on async routes. Search-route offsets are opaque — a missing server link means stop, never fabricate `from_videos`.
- Comment/date hides are card-scoped (`.item.thumb ...`); watch-page `#comments_box` is untouched.

## Blunders
- `vite.config.ts`: Monkey option requires `'run-at': 'document-end'`, not camelCase `runAt`.
- Relative pagination URLs in KVS omit active search filters; `resolveNextPageUrl` must merge `location.search` parameters into next page fetch URLs.
- Site runs `$('body').wrapInner('<div style="position:relative;overflow:hidden">')`, which creates an ancestor clipping boundary blocking `IntersectionObserver` from triggering. Fixed by overriding `overflow: visible` and adding direct window/touch scroll distance detection.
- Appended card images remained blank base64 GIFs because KVS lazyloader only binds on initial DOM ready. Fixed by immediately promoting `data-webp`/`data-original` to `src` with native `loading="lazy"`.
- Flex wrap caused button rows (e.g. `[ UNWATCHED ]`, `RANDOM`) to break into awkward secondary lines; fixed using strict CSS grid `repeat(N, 1fr)` for single-row inline layouts.
- Homepage root `/` does not support catalog sorting (`?sort_by=...`); fixed by normalizing `/` to `/latest-updates/?sort_by=...` in `buildSortUrl` and `buildUrlWithFilters`.
- Sort buttons clobbered active URL filter query parameters (`duration_to`, `post_date_from`) by injecting partial slider state; fixed with dedicated `buildSortUrl` preserving all existing query parameters.
- Page pagination residue (`from`, `from_videos`, `/N/`) persisted across sort switches, loading page N of new sort; fixed by purging `PAGINATION_PARAMS` and path page numbers.
- AutoPager card appends re-triggered `MutationObserver`, running redundant full DOM rescans and filter passes; fixed with `isAppending` suppression guard in `MutationObserver`.
- KVS in-page hash links (`#search`, `#videos`) caused AutoPager to refetch page 1 in loop; fixed by parsing `data-parameters` and falling back to query pagination `from_videos=N`.
- Rule34Video server drops catalog state/loses page on refresh when complex query params are passed; removed sort chips matrix, defaulting to native newest (`post_date`), with instant client-side filtering and in-memory filter resets.
- Squeezed modal layout caused cramped touch targets and microscopic text; expanded modal width to 460px with 16px/18px padding, 36px inputs, 15px slider thumbs, and 11px readable typography.
- Reset button persists defaults (survives reload); only the keyword search stays ephemeral by design.
- Pruned false positives (verified): `parseCurrentUrlFilters` is native-link compat, not dead; scanline overlay + card comment-hides are intentional theming (now card-scoped); `from_videos` offset-vs-page is unconfirmed live, so search fallback was removed rather than "fixed" blindly.
- Stripping card borders caused card text elements to bleed and overlap; restored precision border framing (#0e0a14 substrate, 1px hazard border, 2.7em fixed title height, hidden relative date, space-between meta row) and refactored modal to sleek 290px vertical console orientation.
- Styling .time, .sound, .quality, and .custom-hd directly conflicted with KVS video scrubber timeline, preview buffering, and native badge rendering; removed all custom badge styles to preserve 100% native thumbnail overlays.
- `resolveNextPageUrl` merged every query param including stale `from_videos` offsets into next-page fetches; now strips pagination keys via shared `isPaginationKey` (filters still merge).
- Watched-id checks re-parsed localStorage per card per scan; now cached in-module with sync-on-mark (`invalidateWatchedCache` escape hatch).
- Native `.filters-panel` had retheme CSS but no collapse wiring and no collapsed-state rule; added `src/nativefilter.ts` (default collapsed, persisted) + `.br34-collapsed` CSS.
- KVS CMS changes sort/filters asynchronously in-page without reloading; `parseNextLink` discarded `sort_by` from `data-parameters`, and `AutoPager` was never notified of sort changes, causing infiscrolling to fetch Page 2 of the previous sort (e.g. Most Relevant). Fixed by extracting `sort_by` in `parseKvsParameters`, syncing `sort_by` to browser address bar via `history.replaceState`, and adding `autoPager.reset()` with deduplication and separator clearing.
- Single bookmark limitation: Bookmarks previously allowed only 1 entry per listing with no UI or video saving. Upgraded to EROS Cyber-Archive Console supporting multiple sector checkpoints per listing, watch later video bookmark ribbons on card thumbnails, micro-toasts, and JSON export/import.
