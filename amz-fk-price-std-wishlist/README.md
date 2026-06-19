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

- **Interactive Floating Dashboard (v5.3 Overhaul)**  
  Access your saved items via a beautiful, interactive floating panel in the bottom-right corner, loaded with premium tools:
  - **Debounced Search**: Instantly filter your wishlist items by title with a debounced (150ms) search bar.
  - **Flexible Sorting**: Sort items by **Date Added**, **Price: Low → High**, **Price: High → Low**, or **Name: A → Z**.
  - **Platform Filters**: Quickly toggle filters using **All**, **Amazon**, or **Flipkart** pill tags.
  - **Inline Confirmation**: The jarring, blocking native browser `confirm()` popup is replaced with a sleek inline slide-down confirmation bar.
  - **Toast Notifications**: Interactive actions (such as copying, removing, or clearing items) trigger non-intrusive toast notifications.

- **Hydration & Security Proofed**  
  - **Append-Only DOM Mutations**: Injected elements are append-only into static nodes to prevent conflicts with Amazon's/Flipkart's React hydration cycles.
  - **Strict Event Isolation**: Click handlers utilize `e.stopPropagation()` and `e.preventDefault()`, allowing you to toggle hearts or open the panel without accidentally triggering product page navigation.
  - **CSP Image Fallbacks**: Cross-Origin images blocked by Flipkart's strict CSP (Content Security Policy) automatically fallback to elegant, platform-initial letter badges (an orange **A** or a blue **F**).
  - **Maximum Z-Index Layering**: FAB (`z-index: 2147483647`) and Panel (`z-index: 2147483646`) sit securely above sticky headers, popups, and stubborn modal overlays.

- **Clean URL Formatting**  
  Amazon and Flipkart URLs are littered with tracking garbage (`ref=`, `otracker=`, `qid=`). The wishlist extracts the **canonical product link** (e.g., `https://www.amazon.in/dp/ASIN`) so you only save and share clean, permanent links.

- **Markdown Export**  
  One-click export of your entire wishlist into a perfectly formatted **Markdown table**. Ideal for pasting into Notion, Obsidian, GitHub, or ChatGPT.

---

## 🛡️ Technical Edge

- **False-Positive Immunity**: Built-in logic ignores nutritional marketing (e.g., `25g protein`) and irrelevant dimensions (e.g., `L-shaped desk`) to ensure pricing accuracy.
- **Performance Optimized**: Uses a debounced `MutationObserver` to batch process infinite-scroll pages with zero UI lag.
- **Centralized Dry Architecture**: SVG icon factories are fully extracted to `src/core/icons.ts` to reduce script footprint and improve readability.

---

## 🛠️ Architecture & Development Setup

This project uses a modular **Adapter Pattern** built with `Bun`, `Vite`, and `TypeScript`.

- `src/adapters/`: Isolates site-specific DOM logic (`Amazon.ts`, `Flipkart.ts`).
- `src/core/`: Centralized parsing engine, `icons.ts` SVG factory, and wishlist storage/UI logic.
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