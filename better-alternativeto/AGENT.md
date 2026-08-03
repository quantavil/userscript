# AGENT — Better AlternativeTo

## Project Overview
- Userscript for alternativeto.net — external links on cards, pinned compact filter bar, dark-mode button in the header
- Stack: TypeScript, Vite, vite-plugin-monkey, Bun
- Build: `bun run build` → `dist/better-alternativeto.user.js`
- Test: `bun test` (pure logic in `parse.ts`), `bun run typecheck`

## Architecture
- `main.ts` — boot, MutationObserver re-scan, IntersectionObserver link loading, theme button, card filtering
- `parse.ts` — pure, unit-tested: `extractLinks`, `slugFromHref`, `parseLikes`, `matchesFilter`, `activeFacets`, `urlWithoutFacet`
- `links.ts` — RSC fetch, 7-day `localStorage` cache, 4-way concurrency cap, chip rendering
- `filterbar.ts` — the pinned bar, panel disclosure, facet chips
- `styles.ts` — one CSS string; colours reference the site's own custom properties so both themes work

## Site facts (Next.js app-router, React)
- Cards: `li[data-testid="item-<slug>"]`; slug for fetching comes from the card's `a[href^="/software/"]`, not the testid (they differ, e.g. `item-recurred-subscription-manager` vs `/software/recurred/`)
- Inside a card: `[data-testid="main-app-info"]` (title + description), `[data-testid="platform-row"]`, `#like-button-container` ("486 likes", id duplicated across cards — always scope the query)
- Filter bar: `nav > [data-testid="app-filter-bar-wrapper"]`; the facet panel is `[data-testid="app-filter-bar"]`, mounted only after the chevron in `[data-testid="popular-filters"] ul > li:last-child` is clicked
- External links: `fetch('/software/<slug>/about/', {headers:{RSC:'1'}})` → flight text containing `"externalLinks":[{name,url,type}]`. Types: `Official` | `Social` | `Appstore` | `Source`. ~110KB vs ~430KB for the HTML page
- Theme: `localStorage.theme` + `document.documentElement.dataset.theme`
- URL facets: `category`, `platform`, `license`, `feature`, `property`, `origin`, `tag`, `sort`, page `p`. 25 apps per page, server-rendered pagination
- The JSON-LD `SoftwareApplication` block on an app page has `url` and `sameAs` but **omits the GitHub link** — not a usable source for the chips

## Blunders
- Added `.bat-nav` / `.bat-panel-host` classes to site elements — React owns `className` and wiped them on its next render, silently killing the whole layout. Everything is now keyed off `data-testid` in CSS; no class is ever set on a React-owned node.
- MutationObserver on `documentElement` with `subtree:true` also sees this script's own writes (link rows, count text, class toggles) — boot() re-ran on a 120ms loop forever. Fixed with the `needsWork()` guard.
- App count read as "1353313533 apps": the site renders the total twice (a bare number for narrow screens, "13533  apps" for wide), and the parent span's textContent concatenates both. Fixed by only accepting leaf spans (`children.length === 0`).
- Opened the facet panel as `position: fixed` — it landed 111px low because an ancestor has `contain: paint layout`, which becomes the containing block for fixed positioning. Now an in-flow disclosure instead.
- Scrolled back to the panel using `bar.getBoundingClientRect().top + scrollY` — the bar is `sticky`, so that returns its *stuck* position, not its flow offset, and the scroll never fired. Now `panel.scrollIntoView()` then `scrollBy` to clear the pinned chrome.
- Capping `max-height` on the panel gave it a horizontal scrollbar: it is a CSS multi-column box, and constraining the height makes multicol spill into further columns sideways rather than scroll. Worked around with `columns: auto` + a grid, then dropped entirely — the whole idea was wrong. The panel is now shown untouched; only its visibility is controlled (`html.bat-on:not(.bat-panel-open)`).
- Pressed toggles were `background: var(--linkColor)` with white text — `--linkColor` is a pale blue in dark mode, so the label was unreadable. Site vars are only safe where the site itself pairs them with a foreground.
- The bar is rebuilt on every page, so the filter has to live outside it: `sessionStorage['bat:filter']`. JSON has no `NaN`, so the "no upper bound" `maxLikes` round-trips as `null` and is mapped back on load.
- **Paging reuses every card node.** Verified live: clicking page 2 keeps all 25 `li[data-testid^="item-"]` elements and re-renders a different app into each. A boolean `data-bat="1"` marker therefore survived onto the new page, so `scanCards` skipped all 25, `needsWork`'s `:not([data-bat])` never fired, the `cards` array stayed empty after `teardown()` and the previous app's link chips stayed glued to the node. That one cause produced both "wrong links on the card after next page" and "changing the likes filter hides nothing". The marker now holds the **slug**, and stale nodes have their `.bat-links` row dropped and are re-observed.
- Cards were hidden with `classList.toggle('bat-hidden')` — the same React-owns-className trap as above. Hiding is now `toggleAttribute('data-bat-hide')`.
- `mountFilterBar` registered `document` click/keydown and `window` resize listeners per mount, and it remounts on every navigation — they piled up, each holding a dead bar. They live at module scope now, with a module-level `currentBar`.

## Key Decisions
- The site's facets stay in charge of server-side filtering — their counts, `+N more` expanders and soft navigation are all live data that a hand-rolled bar would have to mirror out of their DOM anyway. Only the *presentation* is replaced.
- Search / likes range / link toggles are client-side over the 25 rendered cards; AlternativeTo has no server-side likes filter.
- Links load lazily via IntersectionObserver with a 300px rootMargin, 4 concurrent max, cached 7 days. Cards whose links have not loaded yet stay *visible* under the link toggles rather than flashing away.
- The panel is opened by clicking the site's own chevron and never collapsed again — after the first open, toggling is pure CSS, so React is never fought.

## Testing notes
- Browser automation tabs are often occluded: `requestAnimationFrame` and `IntersectionObserver` callbacks do not fire, and screenshots intermittently time out. Take a screenshot to force a frame, or verify geometry via `getBoundingClientRect` instead.
- The page cannot `fetch` a local `http://` dev server (mixed content silently hangs); paste the built bundle into the page to test it.
