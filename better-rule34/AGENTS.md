# AGENTS.md

Guidance for development in `better-rule34`.

## Architecture & Modules
- `src/main.ts`: Main bootloader, MutationObserver, card lifecycle (`adopt`, `scanCards`), sheet controls mounting, list swap detection (`currentListKey`), and filter coordination.
- `src/sheetfilter.ts`: Native-looking minimum rating and views pills mounted directly inside the site's "ALL FILTERS" drawer/sheet (`.fs-sheet__body`). Presets snap on load and persist in localStorage.
  - `RATING_PRESETS`: `[0, 50, 60, 70, 75, 80, 85, 90, 95]` (0 = 'Any', 50%+ to 95%+).
  - `VIEWS_PRESETS`: `[0, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 250000, 500000]` (0 = 'Any', 1K+ to 500K+).
- `src/autopager.ts`: Seamless infinite scroll engine with `IntersectionObserver` sentinel and scroll polling. Handles relative URLs, KVS `data-parameters`, and search offsets while dropping stale pagination keys.
- `src/autoplay.ts`: Desktop & mobile muted video preview player using `IntersectionObserver` without requiring hover. Graceful retries on transient errors, stops decoding hidden clips, and respects data-saver mode.
- `src/cardmark.ts`: Thumbnail mark toggle (`+ MARK` / `✓ WATCHED`), card grey-out styling, and event isolation from card link navigation.
- `src/watchstore.ts`: Bounded watch history store (up to 5,000 records) in localStorage with cross-tab storage sync and LRU pruning.
- `src/watchtrack.ts`: Active playback coverage tracker on `/video/:id/` pages. Automatically marks video watched after 85% continuous playback (skips seeks/pauses) and mounts the "Mark watched" button in `.vp-actions`.
- `src/adcleaner.ts`: Targeted selector-based removal of banner spots, ad iframes, and sponsored cards.
- `src/parse.ts`: Pure parsers for rating percentage, views counts, KVS query parameters, relative pagination URL resolution, and accurate ad detection without false positives on albums or playlists.
- `src/routes.ts`: Listing route helpers (`isPaginationKey`, `stripPageSegment`, `pageNumberFromPath`, `appendPageToPath`).
- `src/newtab.ts`: Hardens video links (`target="_blank"`, `rel="noopener"`) and intercepts plain left-clicks to open in a new tab.
- `src/styles.ts`: Cyberpunk/industrial dark styling matching Rule34Video theme, watched-card overlays, autoplay player styling, autopager spinners and page separators.
- `src/types.ts`: TypeScript contracts for `CardData` and `FilterState`.

## Critical Constraints & Gotchas
- **Ad Detection False Positives**: `isAdCard` must ONLY match genuine ad indicators (ad network domains, iframes, spot classes, "AD" headers). It must never assume cards lacking `/video/` links are ads, as album cards (`/album/`) and playlist cards (`/playlist/`) share `.item.thumb`.
- **KVS CMS Pagination**: The site uses both path-based pagination (`/latest-updates/2/`) and search query pagination (`?from_videos=2`). Stale offsets (`from`, `from_videos`, `page`, `p`) must be stripped when advancing pages.
- **Scroll Clipping**: The site wraps body contents in a div with `overflow: hidden`, which breaks `IntersectionObserver` viewport intersections. `unclipBodyOverflow()` resets this wrapper to `overflow: visible`.
- **Runtime**: Run tests with `bun test` and build with `bun run build`. Do not commit `package-lock.json` — use `bun.lock`.
