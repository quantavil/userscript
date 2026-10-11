# AGENT — Better InvestorGain

## Project Overview
- Userscript for investorgain.com — eliminates ads, affiliate promo bars, sidebars, banners, and adds Smart Relevance Sorting with Section Dividers (Open → Upcoming → Closed) across Desktop, Tablet & Mobile.
- Stack: TypeScript, Vite 8, vite-plugin-monkey 8, Bun
- Version: `1.2.0`
- Build: `bun run build` → `dist/better-investograin.user.js`
- Test: `bun test` (Unit tests for date parsing/sorting) & `bun run test:e2e` (Playwright multi-device E2E suite across Desktop, Tablet, and Mobile)
- Typecheck: `bun run typecheck`

## Architecture
- `src/main.ts` — entry point: injects styles at `run-at: document-start` + initializes features safely after React SSR hydration with reactive debounced MutationObserver.
- `src/styles.ts` — zero-flicker CSS rules (`display: none !important`), layout 1fr expansions, dark mode gradient fixes, mobile drawer & navbar broker removal, and section divider styles.
- `src/features.ts` — robust status classifier, dynamic year/date parser, categorized urgency sorting (Open → Upcoming → Closed), and dynamic colSpan section divider headers.

## Blocked Elements & Selectors
```
.tlu-wrap                           → broker affiliate bar below header (Zerodha, Angel One, Upstox)
.nmm-promo-strip                    → broker promo cards in nav mega-menu
.ad-block, .ad-placeholder          → ad containers & GPT skeletons
[class*="ad-970"], [class*="ad-300"]→ ad size variants
.broker-carousel-section            → homepage broker carousel ("Top Stock Brokers")
.compare-section                    → homepage compare broker table
aside.sidebar, .sidebar             → homepage sidebar (Top Brokers, Quick Links)
aside.detail-side, .detail-side     → IPO detail page right sidebar
.invest-cta, .broker-cta-card       → SME IPO Enquiry & Open Demat Account cards
.ipo-apply-section, #ipoApplySection→ "Apply for IPOs Online" banner
tr.ad-tr, td.ad, .ndrop-broker-card → in-table broker ad cards
#stock-brokers-section, .mob-broker-list → mobile drawer stock broker section & list
#findYourBroker, .find-your-broker-navbar → mobile & navbar "Find Your Broker" CTA
footer.site-footer, .site-footer    → full site footer & partner logos
.main-grid, .detail-grid            → collapsed to 1fr to expand content to 100% full width
[data-theme="dark"] .gmp-table-creative tr → strips hardcoded white gradient in dark mode
```

## Smart Relevance Sorting Algorithm
1. **🟢 Open IPOs**: Ordered by **Closing Date ASC** (items closing first are on top).
2. **🟡 Upcoming IPOs**: Ordered by **Opening Date ASC** (items opening first are on top).
3. **⚪ Closed / Listed IPOs**: Ordered by **Closing Date DESC** (most recently closed on top; missing dates at bottom).
4. **Section Dividers**: Added above each non-empty group with item counts and dynamic colSpan.

## Blunders & Discoveries
- **Period Regex Bug**: `parsePeriod` previously matched preceding prices/lots (e.g., `₹90 - ₹95 | 1 - 3 Sep`) as start days -> Fixed with atomic range regex anchored to month tokens.
- **SSR / Hydration Rate-Limits**: InvestorGain returns 429 when client chunks are requested too fast without standard User-Agent headers in Playwright tests -> Fixed with standard UA context.
