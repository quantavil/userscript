# MEMORY.md — Amazon & Flipkart Price Standardizer + Wishlist

## Project Overview
- Userscript: standardizes unit prices (₹/100g, ₹/100ml) and adds a unified wishlist for Amazon and Flipkart.
- Stack: TypeScript + Vite + vite-plugin-monkey + Bun (runtime & test runner)
- Build: `bun run build` → `dist/amz-fk-price-std-wishlist.user.js` (v5.2)
- Tests: `bun test` (38 tests across 2 files)

## Architecture
- `src/main.ts` — entry, routes to adapter by hostname
- `src/adapters/BaseAdapter.ts` — shared MutationObserver + debounce + SPA detection
- `src/adapters/Amazon.ts` — search result card selectors, price extraction
- `src/adapters/Flipkart.ts` — search card selectors, qty element parsing, title fallback
- `src/core/parser.ts` — extractWeights, parseMultiPackText, parsePackCount, parseTitleToRate, computeRate
- `src/core/ui.ts` — injectRateUI (badge DOM injection + wishlist heart)
- `src/core/wishlist.ts` — GM storage manager for saved items
- `src/core/wishlistUI.ts` — Floating Action Button (FAB) and dashboard panel
- `src/core/types.ts` — ParsedData, WeightExtract, RateResult, WishlistItem, ProductMeta
- `src/gm.d.ts` — Tampermonkey API declarations
- `src/utils/formatters.ts` — cleanNumber (returns number|null), fmtPrice
- `src/utils/urlCleaner.ts` — strips tracking/referral parameters from e-commerce URLs

## Key Decisions
- `cleanNumber` returns `null` (not NaN) for invalid input — all callers check for null
- Bare `l`/`L` unit matching has post-match validation to avoid supplement false positives (L-Glutamine)
- `SKIP_FOLLOWING` regex contains 13+ supplement amino acid terms
- `FALSE_PACK_CONTEXT` blocklist prevents "6 pack abs" from being detected as pack count
- `initObserver` lives in BaseAdapter — both adapters inherit it (DRY)
- SPA navigation handled by checking `location.href` in MutationObserver callback, clears `data-rate-done` markers
- Global observer flag namespaced as `__priceStdz_observer`
- Wishlist uses `GM_getValue`/`GM_setValue` for cross-origin persistence (Amazon <-> Flipkart)
- `wishlist-updated` custom event syncs heart states across different product cards on the same page
- `cleanProductUrl` extracts canonical links (Amazon /dp/ASIN, Flipkart pid) for the wishlist
- Redundant DOM queries in adapters removed by passing elements from `processCards` to `getMeta`
- Wishlist copy feature uses Markdown table format for better compatibility with modern tools
- Added precise selectors for Amazon (reviews-ratings-slot, puis-normal-weight-text) and Flipkart (MKiFS6, PvbNMB) to accurately capture ratings and review counts
- Added `clearWishlist` functionality with a confirmation UI to reset the saved items list

## Blunders
- (none yet)

## Known Limitations
- No product page support — only search/listing pages. Both Amazon and Flipkart already show per-unit pricing on product pages.
- Flipkart DOM uses React Native Web with obfuscated class names — selectors may break with redesigns
- `div[data-id]` Flipkart selector is broad (may match non-product elements)
- Mixed-unit titles (e.g. "500g Almonds + 250ml Honey") silently return null

## File Structure
```
src/
├── main.ts
├── gm.d.ts
├── adapters/
│   ├── BaseAdapter.ts
│   ├── Amazon.ts
│   └── Flipkart.ts
├── core/
│   ├── parser.ts
│   ├── types.ts
│   ├── ui.ts
│   ├── wishlist.ts
│   └── wishlistUI.ts
└── utils/
    ├── formatters.ts
    └── urlCleaner.ts
tests/
├── parser.test.ts
└── formatters.test.ts
```
