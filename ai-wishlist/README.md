# Amazon & Flipkart AI Wishlist

A powerful, cross-origin shopping assistant that syncs your shopping wishlist across **Amazon** and **Flipkart** with zero external dependencies, ready for export and ingestion by external AI tools.

Collect and track the best deals across platforms in one unified, floating dashboard, and copy all items as a structured JSON object including rich details and specifications scraped in the background.

---

## 🌟 Core Features

### 1. Unified Cross-Platform Wishlist
- **Unified Local Storage**: Uses extension storage (`GM_getValue` / `GM_setValue`) to store items. Your wishlist is shared and accessible whether you are currently browsing on Amazon or Flipkart.
- **Card-Level Quick Save**: Injects a sleek circular heart button directly onto product cards. Click to save or remove items instantly.
- **Event Isolation**: Heart buttons prevent default page navigation and event bubbling, allowing quick toggling with zero disruption to browsing.
- **Clean URL Extraction**: Strips referral tracking garbage (`ref=`, `otracker=`, `qid=`) and extracts clean canonical links (`https://www.amazon.in/dp/ASIN` or `https://www.flipkart.com/...`) for permanent sharing.

### 2. Background Details & Specifications Crawling
When you click to add an item to your wishlist, the script automatically crawls details in the background:
- **Asynchronous Fetching**: Executes a cross-origin background fetch (`GM_xmlhttpRequest`) to get the product details page.
- **CSR State Extraction**: Bypasses client-side rendering limitations on Flipkart by parsing `window.__INITIAL_STATE__` inside script tags to recursively crawl specifications.
- **Data Sanitization**: Normalizes whitespace, strips script/style tags, and collects bullet points and technical specifications into a structured JSON string.
- **Interactive Spinner State**: Replaces the heart icon with a self-spinning SVG loader (`<animateTransform>`) during background crawling, resolving back to a solid heart upon completion.

### 3. Interactive Floating Dashboard FAB & Panel
Access your unified wishlist from a sleek, floating panel in the bottom-right corner of the page:
- **Real-time Item Counter**: FAB badge displays the current wishlist count.
- **Debounced Search Bar**: Instantly filter items by title using a debounced (150ms) search.
- **Flexible Sorting**: Sort items by *Date Added*, *Price: Low → High*, *Price: High → Low*, or *Name: A → Z*.
- **Platform Filters**: Filter visible items by platform using **All**, **Amazon**, or **Flipkart** pill tags.
- **JSON Copy Exporter**: Exports saved wishlist items and their crawled details as a formatted JSON structure to your clipboard.
- **CSP Bypass Image Loading**: Loads Flipkart thumbnails on Amazon (and vice-versa) by intercepting image errors and fetching binary image streams via `GM_xmlhttpRequest` blobs, converting them to inline base64 data URLs. Falls back to platform initials (**A** / **F**) on complete failure.
- **Non-Intrusive UI**: Native `confirm()` alerts are replaced by inline confirmation states with safety timers, and operations trigger animated toast messages.

### 4. Interactive AI Chat Assistant & Custom Config
Interact with your wishlist data using a dedicated side-drawer AI assistant:
- **Natural Conversations**: Conversational shopping assistant that handles queries, compares products, suggests recommendations, and renders answers beautifully with styled headers, lists, and comparison matrices.
- **Google Search Grounding**: Enabled natively for Gemini API endpoints. The model can search the web dynamically to retrieve missing specs, facts, or product details on the fly.
- **OpenAI-Compatible & Custom API Base URL**: Configure any API Base URL (e.g., local Ollama, OpenRouter, Perplexity, or OpenAI) and custom Model name directly from the settings panel.
- **Local Fallback Queries**: When offline or without an API key, the chatbot answers basic statistics and queries (e.g., "cheapest item", "most expensive", "how many items") locally using cached client-side wishlist data.
- **Theme and Accent Selector**: Flat settings drawer featuring 8 premium accent palettes (Red, Wine, Orange, Amber, Emerald, Teal, Blue, Purple) that adapt instantly across buttons, gradients, icons, and UI highlights.

---

## 🛠️ Technical Stack & Architecture

This project uses a modular **Adapter Pattern** built with `Bun`, `Vite`, and `TypeScript`.

- **`src/adapters/`**: Platform-specific DOM logic (`Amazon.ts`, `Flipkart.ts`) extending `BaseAdapter.ts` which manages SPA navigation detection and debounced observers.
- **`src/core/`**: Specifications parser and wishlist storage/UI layer.
- **`src/utils/`**: Formatting helpers and tracking link sanitizers.
- **`tests/`**: Test suite with mock DOM fixtures validating cleaning utilities and specifications extraction.

### Building Locally

Ensure you have [Bun](https://bun.sh/) installed:

```bash
# 1. Install dependencies
bun install

# 2. Run the test suite
bun test

# 3. Build the userscript
bun run build
```

The compiled script is generated at [dist/ai-wishlist.user.js](file:///home/quantavil/Documents/Project/userscript/ai-wishlist/dist/ai-wishlist.user.js).

---

## 🚀 Installation & Supported Sites

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Copy the contents of the built userscript file into a new script in your manager.
3. Save the script and refresh Amazon or Flipkart to start tracking.

| Site        | URL Match Pattern            |
|-------------|------------------------------|
| Flipkart    | `https://www.flipkart.com/*` |
| Amazon IN   | `https://www.amazon.in/*`    |
| Amazon US   | `https://www.amazon.com/*`   |