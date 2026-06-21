# MEMORY.md — AI Wishlist

## Project Overview
- Userscript: Syncs shopping wishlist across Amazon & Flipkart with background specs parsing for AI ingestion.
- Stack: TypeScript + Vite + vite-plugin-monkey + Bun (runtime/tests).
- Build: `bun run build` → `dist/ai-wishlist.user.js`
- Tests: `bun test`

## Architecture
- `src/main.ts` — Entry point, routes to correct adapter by hostname.
- `src/adapters/BaseAdapter.ts` — Shared debounced MutationObserver & SPA navigation handler.
- `src/adapters/{Amazon,Flipkart}.ts` — Platform-specific DOM selectors, price, title, image, and url metadata builders.
- `src/core/wishlist.ts` — Cross-origin GM storage manager for saved items.
- `src/core/wishlistUI.ts` — Floating dashboard panel (search, sort, platform filter, copy JSON, AI Chat Assistant).
- `src/core/icons.ts` — Centralized SVG icon factory.
- `src/core/ui.ts` — Circular heart UI button injection and background specs parser.

## Key Rules & Decisions
- **CSS Separation & Injection**: Component styles are centralized in `src/styles.css`, imported via Vite's `?inline` query, and injected once into the page `<head>` at startup. Elements are styled via semantic classes (`.aiw-`) and state toggles (`.active`, `.loading`, `.visible`, `.pulse`, `.animate-entry`) instead of inline styles or JS mouse listeners. Heart buttons are styled with solid premium styles (no glassmorphism) to prevent transparency rendering issues on variable card backgrounds.
- **Event Isolation**: `e.stopPropagation()` prevents host SPA navigation on wishlist clicks.
- **Append Only**: UI is appended into safe, static containers.
- **CSP Workaround**: Amazon images fail to load on Flipkart under normal img src tags. Resolved by catching image error event and loading cross-origin via GM_xmlhttpRequest as a blob converted to a base64 Data URL, falling back to a platform letter badge (A/F) on complete failure.
- **Data Model**: `WishlistItem` is the single source of truth for items; `dateAdded` used for sorting.
- **Flipkart Selector Resilience**: Flipkart card DOM parsing utilizes class-name-independent structural traversals (leaf element price search and link-based parent-traversal).
- **Asynchronous Scraping**: Automatically triggers a cross-origin background request (`GM_xmlhttpRequest`) to the product details page on "like" clicks, parsing specifications and bullet points into a structured JSON string for AI parsing.
- **Spinner Loader State**: During background crawling, the heart icon wrapper is dynamically replaced by a native self-spinning SVG loader (using `<animateTransform>`), pop-transitioning back into a solid red heart on completion.
- **Client-Side Rendering Bypass**: Since Flipkart details pages render specifications dynamically client-side, fetching the HTML directly yields an empty DOM. Resolved by parsing `window.__INITIAL_STATE__` inside script tags and recursively crawling key-value pairs (`label_0.value.text` and `label_1.value.text`) directly from the state JSON object.
- **UI Relocation & Visibility Enhancements**: Cards use Option B for unselected heart triggers (vibrant crimson outline `#e11d48`, 2.0px stroke, 35% translucent fill) for high visibility on variable card themes. Wishlist panel removes copy & clear actions from top header, introducing Option 2B dual floating action pills (Copy JSON and Clear All) overlaying the bottom center list area. Clear button utilizes double-tap confirmation with safety timer transition to prevent accidental clearing.

## Blunders
- Amazon and Flipkart mobile cards did not match desktop-specific selectors. Fixed by using link-based parent-traversal card resolution, fallback leaf-node rupee extraction, and targeted details-container heart container injections.
- Regex matching of `window.__INITIAL_STATE__` with non-greedy `.*?` matched nested braces prematurely, breaking `JSON.parse` with syntax errors in browser. Fixed by using robust brace-matching (`indexOf` + `lastIndexOf`).
- Dynamic references to `window.__INITIAL_STATE__` in other script tags caused false positive matches. Fixed by matching assignment pattern `/window\.__INITIAL_STATE__\s*=/`.
- Amazon details scraping extracted `<script>` content (e.g. from Customer Reviews) and preserved key newlines/duplicate colons. Fixed with `cleanDomText` helper to strip script/style nodes and normalize inner whitespace/newlines.
- Multiple Amazon card selectors (e.g. `s-search-result` nesting `.s-card-container` nesting `.puis-card-container`) all resolved `querySelector` to the same price container, injecting duplicate heart elements. Fixed with `data-wishlist-id` guard on the heart UI injection target.
- Flipkart title extraction caught massive card descriptions (ratings, reviews, comparison labels, features) on layouts where the main anchor tag wraps the entire card context. Resolved by checking the main product image's alt attribute first before falling back to the anchor tag text.
- Flipkart React unmounting/flicker: Modifying React-managed DOM elements inside card components (e.g. injecting loading spinners/classes) triggers reconciliation mismatches, causing cards to unmount/remount on focus/scroll. Resolved by removing all dynamic loaders and class changes from the card level, and routing crawling feedback to the FAB crab walking animation.
- OpenAI compatibility: Request payloads, URLs, and key verifications were hardcoded to Gemini format. Resolved by dynamically detecting the endpoint type from `baseUrl` (Gemini if `googleapis.com` in URL, OpenAI-compatible otherwise) and formatting payloads accordingly.
- Double-wrapped lists: Custom Markdown parser wrapped existing HTML `<li>` elements in `<ul>`. Resolved by using a temporary `<aiw-li>` placeholder.
