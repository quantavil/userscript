# Amazon & Flipkart Price Standardizer + Wishlist

A powerful shopping assistant that standardizes unit prices and syncs your wishlist across **Amazon** and **Flipkart**.

Stop doing mental math. Instantly compare combos, single packs, and multi‑buys to discover their **true cost** (₹/100g, ₹/100ml, or ₹/item), and track the best deals across platforms in one unified, floating dashboard.

---

## 🌟 Key Features

- **Advanced Unit & Pack Parsing**  
  Uses a robust heuristics engine to automatically extract units (`kg, g, l, ml, tablets, capsules, sachets, dozen, pairs`) and calculate total package volume/weight. It successfully handles:
  - **Multi-packs**: `2 × 500ml` becomes `1000ml`.
  - **Pack Counts**: `Pack of 4` with `250g` extracts a total of `1000g`.
  - **Same-Unit Summing**: `200g + 50g` becomes `250g`.
  - **Mixed Units**: Falls back to a clean **₹/item** rate for mixed-volume combos.

- **Unified Wishlist (Amazon + Flipkart)**  
  Click the **Heart Icon** on any price badge to save the item. Items are stored securely using `GM_setValue`, making your wishlist **persistent and shared** across Amazon and Flipkart. Access it anytime via the floating action button (FAB) in the bottom-right corner.

- **Clean URL Formatting**  
  Amazon and Flipkart URLs are littered with tracking garbage (`ref=`, `otracker=`, `qid=`). The wishlist extracts the **canonical product link** (e.g., `https://www.amazon.in/dp/ASIN`) so you only save and share clean, permanent links.

- **Markdown Export**  
  One-click export of your entire wishlist into a perfectly formatted **Markdown table**. Ideal for pasting into Notion, Obsidian, GitHub, or ChatGPT.

- **Full Management Controls**  
  Individually remove items or use the **Clear All** button to reset your list instantly.

- **Hydration-Safe Architecture**  
  Designed to survive the aggressive React/React Native DOM hydration cycles used by Amazon and Flipkart. Injected elements are append-only and event-isolated, ensuring they never vanish or crash the host page.

---

## 🛡️ Technical Edge

- **False-Positive Immunity**: Built-in logic ignores nutritional marketing (e.g., `25g protein`) and irrelevant dimensions (e.g., `L-shaped desk`) to ensure pricing accuracy.
- **Performance Optimized**: Uses a debounced `MutationObserver` to batch process infinite-scroll pages with zero UI lag.
- **Z-Index Priority**: UI elements are guaranteed to render above all host site modals and headers using max 32-bit integer layers.

---

## 🛠️ Architecture & Development Setup

This project uses a modular **Adapter Pattern** built with `Bun`, `Vite`, and `TypeScript`.

- `src/adapters/`: Isolates site-specific DOM logic (`Amazon.ts`, `Flipkart.ts`).
- `src/core/`: Centralized parsing engine, regex definitions, and wishlist storage logic.
- `src/utils/`: Sanitizers and formatters, including the `urlCleaner`.
- `tests/`: A robust test suite powered by real-world fixtures.

### Building Locally

```bash
# 1. Install dependencies
bun install

# 2. Run tests
bun test

# 3. Build the userscript
bun run build
```

The compiled script is generated at `dist/amz-fk-price-std-wishlist.user.js`.

---

## 🚀 Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/).
2. Copy the contents of the built `.user.js` file into a new script in your manager.
3. Save and refresh Amazon or Flipkart to see the assistant in action!

---

## 🌐 Supported Sites

| Site        | URL Match Pattern         |
|-------------|---------------------------|
| Flipkart    | `https://www.flipkart.com/*` |
| Amazon IN   | `https://www.amazon.in/*`   |
| Amazon US   | `https://www.amazon.com/*`  |