# Amazon & Flipkart AI Wishlist

A userscript with a shared local wishlist for Amazon India, Amazon US and Flipkart. Save products from cards or product pages, search/filter/sort them, remove with Undo, export JSON, and compare saved specifications in chat.

## Features

- Preact dashboard, settings, chat and toast notifications; eight accent colors.
- Separate INR/USD price sorting and offline totals, averages and cheapest/most expensive answers. No currency conversion. Currency is inferred from the saved marketplace URL; use the marketplace’s native currency when saving. Prices displayed in another currency are not converted.
- Optional background specifications scraping: at most two requests, deduplicated per product, with HTTP checks and a 20-second timeout. Blocked or empty pages leave specifications missing. Removing products or clearing the cache invalidates pending work.
- Keyboard controls, Escape/back focus restoration, reset confirmation, narrow-screen layouts and reduced motion.
- Cross-site thumbnail loading through the userscript manager with a platform-initial fallback. Image fallback data stays in memory.

## AI and price history

Fresh/reset settings use `gemini-3.5-flash-lite`. Existing saved model selections remain unchanged. Configure a Gemini or OpenAI-compatible API base URL, model and key in Settings. Gemini keys use the `x-goog-api-key` header. Provider verification lists models; it does **not** prove the selected model can generate successfully.

Chat allows one active request and includes Stop. Requests time out after 60 seconds; verification after 15 seconds. Requests are not automatically retried. Clearing chat or changing provider settings invalidates late responses. Outgoing context includes at most 20 completed exchanges and 100,000 product characters; the UI reports truncation. History stays as raw text in memory; marked renders Markdown and DOMPurify sanitizes displayed answers. Errors remain errors. Without a key, offline answers use saved prices and specifications and acknowledge missing information.

The chart icon beside saved prices and the product-page heart opens **Price history** on [PriceHistory.app](https://pricehistory.app/). It passes a canonical product URL (preserving Amazon marketplace/ASIN or Flipkart PID) through the provider’s URL search. The provider resolves untracked products or multiple matches. AI Wishlist does not fetch, store or display historical prices; no history credentials, background requests or additional network permissions are used.

## Storage and network behavior

Wishlist items, scraped specifications and settings (including the API key) are saved in the userscript manager’s **local GM storage**, shared across the matched sites. Remote GM value notifications update other open tabs. This is not a cloud sync service. There is no schema/model migration and reads do not rewrite saved data. Invalid stored records are ignored when read; failed writes produce visible feedback. Export valid saved items before clearing/resetting data.

Saving a product may fetch its canonical details page when automatic scraping is enabled. Configured AI chat sends product context and recent exchanges to the chosen provider. Thumbnail fallback fetches the image URL. Broad `@connect *` remains necessary for custom AI endpoints and cross-site resources; it does not itself send data anywhere. History links send the product URL to PriceHistory.app when opened.

## Development

Stack: Preact **11.0.1**, Vite+ **1.2.0** (Vitest **5.0.4**, Oxlint/Oxfmt), `@preact/preset-vite` **2.10.6**, `vite-plugin-monkey` **8.1.1**, strict TypeScript **7.0.2**, marked **18.1.1**, DOMPurify **3.4.17**. Bun remains the package manager/script entry point; Vite+ tools run on supported Node.js (verified with Bun 1.4.3 / Node 26.11.1). All runtime dependencies are bundled into one userscript; no runtime CDN or React compatibility aliases.

```bash
bun install --frozen-lockfile
bun run test       # Vite+ bundled Vitest; jsdom and committed fixtures
bun run lint       # Includes type-aware linting and type checking
bun run fmt        # Format source; exact HTML parser fixtures are excluded
bun run check      # Format/lint/type checks, strict tsc, tests, production build
bun audit
```

Build output: `dist/ai-wishlist.user.js`. Install it in Violentmonkey or Tampermonkey, then refresh a supported site. Supported matches: `https://www.amazon.in/*`, `https://www.amazon.com/*`, `https://www.flipkart.com/*`.

Architecture and constraints: [AGENTS.md](AGENTS.md). Findings and verification limits: [modernization audit](docs/modernization-audit.md).

GPL-3.0-or-later; see [LICENSE](LICENSE).
