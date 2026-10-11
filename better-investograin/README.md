# Better InvestorGain

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

A fast, lightweight userscript for [investorgain.com](https://www.investorgain.com/) that blocks ads, broker affiliate promo bars, sidebars, and banners while automatically grouping and sorting IPO tables by true relevance with clean section dividers.

---

## 🚀 Smart Relevance Sorting & Section Dividers

Automatically groups and orders both **Table View** and **Grid Card View** into 3 intuitive categories with custom section dividers:

1. **🟢 Open IPOs** (Active Now) — Sorted by **Closing Date ascending** so IPOs closing first (most urgent) appear at the very top.
2. **🟡 Upcoming IPOs** (Coming Soon) — Sorted by **Opening Date ascending** so IPOs opening next appear right on top.
3. **⚪ Closed / Listed IPOs** (Past) — Sorted by **Closing Date descending** so recently closed IPOs appear first.

*Works seamlessly across Table & Grid views, and updates dynamically when switching tabs (`All`, `Mainboard`, `SME`).*

---

## 🚫 What it blocks

| Element | Selector |
|---|---|
| Broker affiliate bar below header (Zerodha / Angel One / Upstox) | `.tlu-wrap` |
| Broker promo cards inside nav mega-menu | `.nmm-promo-strip` |
| Ad blocks and placeholders (970×250, 300×250, generic) | `.ad-block`, `[class*="ad-970"]`, `[class*="ad-300"]` |
| Homepage broker carousel ("🏦 Top Stock Brokers 2026") | `.broker-carousel-section` |
| Homepage broker comparison ("Compare Stock Brokers Side-by-Side") | `.compare-section` |
| Sidebars on homepage & detail pages ("Top Brokers", "Quick Links", "SME IPO Enquiry", "Open Demat Account") | `aside.sidebar`, `.sidebar`, `aside.detail-side`, `.detail-side`, `.invest-cta`, `.broker-cta-card` |
| IPO Detail in-content affiliate ads ("Open Free Account →" cards) | `tr.ad-tr`, `td.ad`, `.ndrop-broker-card`, `.nmm-ad-card`, `.mob-broker-list` |
| Mobile navigation drawer broker section & headers | `#stock-brokers-section`, `.mob-broker-list` |
| Mobile & navbar "Find Your Broker" CTA buttons | `#findYourBroker`, `.find-your-broker-navbar` |
| In-content promotional banners ("🚀 Apply for IPOs Online – Free Demat Account") | `.ipo-apply-section`, `#ipoApplySection` |
| Full footer & partner networks | `footer.site-footer`, `.site-footer`, `.adv-strip`, `.ft-partners` |

### 🎨 Automatic Layout & Dark Mode Fixes
- Homepage `.main-grid` expanded to 100% full width.
- IPO detail `.detail-grid` & `.detail-main` expanded to 100% full width.
- Report pages `.report-grid` expanded to 100% full width.
- Responsive table and card grid relevance sorting on Desktop, Tablet & Mobile.
- Fixed site dark mode bug where table row gradients ended with a hardcoded white overlay.

---

## 📥 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [`dist/better-investograin.user.js`](dist/better-investograin.user.js) and click **Install**.

---

## 🛠️ Development

**Prerequisites:** [Bun](https://bun.sh/) & Python 3 (for E2E tests).

```bash
bun install          # install dependencies
bun run dev          # Vite dev server with hot userscript reloading
bun run build        # build production bundle to dist/better-investograin.user.js
bun run typecheck    # TypeScript type check
bun test             # Run fast unit tests for date parsing & sorting
bun run test:e2e     # Run automated multi-device Playwright E2E suite (Desktop, Tablet, Mobile)
```

---

## 📁 Project Structure

```
src/
  main.ts      Entry point — styles injection & reactive dynamic content observer
  styles.ts    CSS rules, layout expansions, dark mode fixes, mobile broker removal, and section divider styling
  features.ts  Smart relevance sorting algorithm, robust status classifier & section divider generator
tests/
  features.test.ts Unit tests for date parsing, periods, and timestamps
  e2e.py           Playwright multi-device E2E test suite (0 JS exceptions & visual assertions)
dist/
  better-investograin.user.js  Production userscript bundle
```

---

## License

MIT
