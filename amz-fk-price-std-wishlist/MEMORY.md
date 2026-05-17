# MEMORY.md — Amazon & Flipkart Price Standardizer + Wishlist

## Project Overview
- Userscript: Standardizes unit prices (e.g. ₹/100g) and provides a unified wishlist.
- Stack: TypeScript + Vite + vite-plugin-monkey + Bun (runtime/tests).
- Build: `bun run build` → `dist/amz-fk-price-std-wishlist.user.js` (v5.5)
- Tests: `bun test`

## Architecture
- `src/main.ts` — Entry point, routes to correct adapter by hostname.
- `src/adapters/BaseAdapter.ts` — Shared debounced MutationObserver & SPA navigation handler.
- `src/adapters/{Amazon,Flipkart}.ts` — Platform-specific DOM selectors & price extraction.
- `src/core/parser.ts` — Math logic for multi-packs and weights.
- `src/core/wishlist.ts` — Cross-origin GM storage manager for saved items.
- `src/core/wishlistUI.ts` — Floating dashboard (search, sort, platform filter, toasts).
- `src/core/icons.ts` — Centralized SVG icon factory.
- `src/core/ui.ts` — Badge UI injection.

## Key Rules & Decisions
- **No Global CSS**: All injected UI strictly uses inline `style.cssText`.
- **Event Isolation**: `e.stopPropagation()` prevents host SPA navigation on wishlist clicks.
- **Append Only**: UI is appended into safe, static containers.
- **CSP Workaround**: Amazon images fail to load on Flipkart; fallback is a platform-initial badge (A/F).
- **Data Model**: `WishlistItem` is the single source of truth for items; `dateAdded` used for sorting.
- **False Positives**: `SKIP_FOLLOWING` blocks amino acids/supplements in weight extraction.
- **Dynamic SVG IDs**: Flipkart SVG uses dynamic randomized ID prefixes to avoid multi-instance gradient and clipPath collisions.
- **Containerless Icons**: Platform brand SVGs rendered naked (no wrapping badge backgrounds) and pushed nicely to the right edge via `margin-left: auto`.

## Blunders
- (none yet)

## Known Limitations
- Search/listing pages only (Amazon/Flipkart already show unit pricing on product pages).
- Flipkart DOM uses obfuscated React Native Web classes; brittle to redesigns.
