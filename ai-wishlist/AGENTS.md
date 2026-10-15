# AGENTS — AI Wishlist

## Stack and commands

Self-contained GPL-3.0-or-later userscript. Use Bun for installs and script entry points. Local Vite+ 1.2.0 tools run on Node (verified Node 26.11.1 / Bun 1.4.3). Preact 11.0.1 with the official preset, automatic JSX and `jsxImportSource: preact`; disable React aliases. Keep the direct `vite` alias and override aligned with `@voidzero-dev/vite-plus-core@1.2.0`.

- `bun run check`: Vite+ format/type-aware lint/type checks, strict TypeScript, Vitest 5.0.4/jsdom tests, userscript production build.
- `bun run test`, `bun run lint`, `bun run fmt`, `bun run build`, `bun audit`.
- Output: `dist/ai-wishlist.user.js`. Preserve GPL metadata/package license and project LICENSE. No root/sibling/global toolchain changes.

## Architecture

- `src/main.ts`: CSS injection, site adapter and service initialization, Preact mount.
- `src/components/`: FAB/dashboard, toolbar, rows, settings, chat, toasts, history link. Mount only in `#ai-wishlist-root`, marked `data-aiw-owned`.
- `src/core/wishlistUI.tsx`: Preact mounting and userscript reset menu entry.
- `src/adapters/`: Amazon/Flipkart card discovery in plain TypeScript. Never reconcile host-owned DOM with Preact.
- `src/core/ui.ts`: imperative script-owned card hearts and floating product-page controls; event isolation/keyboard activation and teardown.
- `src/core/navigation.ts`: one shared observer/history/polling source. Ignore script-owned mutations; subscribers clean up resources.
- `src/core/productPage.ts`, `specifications.ts`: plain TS scraping. Isolate malformed JSON-LD blocks. Parse Flipkart’s assigned JSON with balanced braces and string/comment awareness; never evaluate page scripts.
- `src/core/storage.ts`: one subscription bridge for GM remote changes/local events; notify failed writes. `wishlist.ts` and `settings.ts` validate reads without rewriting data. Existing GM keys and WishlistItem schema remain unchanged; no migrations.
- `src/core/crawler.ts`: at most two concurrent requests, deduplication and abort/invalidation on removal/cache clear. Save meaningful specs only. Remote wishlist changes conservatively invalidate in-flight crawls.
- `src/core/transport.ts`: GM/fetch status checks, timeouts, cancellation; no retries.
- `src/core/chat.ts`: conversation state, provider formatting, raw history, offline answers. One active request; stale-result revision guard. Stop/clear/provider settings changes invalidate requests. 60s generation / 15s connectivity; no paid automatic retries.
- `src/core/pricing.ts`: derive INR/USD from saved canonical URL. Group price ordering/statistics by currency, no conversion. India ids stay `amz_ASIN`, new US ids use `amz_us_ASIN`.
- `src/utils/urlCleaner.ts`: canonical product links and render-time PriceHistory.app search URLs. Preserve marketplace/ASIN/PID, remove referrals, accept supported HTTPS history links only.
- `src/utils/formatters.ts`: Intl prices, marked Markdown, DOMPurify display sanitizer. History remains raw text. Sanitize after parsing; static repository SVGs are a separate trusted input.

## Constraints

Keep existing `.aiw-` CSS/SVG language. Use native buttons/labels, visible focus, Escape/back focus restoration, confirmation for reset and clear, reduced motion and mobile dynamic viewport sizing. Rows must be visible even without animation. Comparison tables scroll horizontally within chat. History anchors have 44px targets, descriptive product labels, `_blank`, `noopener noreferrer`; stop host handlers without preventing default link behavior.

Local GM storage is shared across matched origins, not cloud sync. Chat history and fallback image data stay in memory. AI sends at most 20 completed exchanges and 100,000 product-context characters, with truncation feedback. Treat scraped text as untrusted reference data, acknowledge absent specifications, and do not imply fetched historical prices. Provider verification means connectivity, not successful model generation.

Tests use real jsdom documents and committed `tests/fixtures/` HTML. Exclude exact HTML parser fixtures from Oxfmt: formatting inline JSON assignments as JavaScript can remove JSON property quotes. Do not use /tmp fixtures or Bun test imports. Tests import `vite-plus/test`.

See [audit](docs/modernization-audit.md) and [ledger](docs/modernization-ledger.md) for evidence and browser limitations. Avoid unsupported severity claims about innerHTML, @connect or observer performance.
