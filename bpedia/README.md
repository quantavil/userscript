# Babepedia Advanced Filter & Badges Userscript

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

A premium, high-performance userscript designed to inject advanced filtering capabilities and clean glassmorphic corner badges onto Babepedia list pages (e.g., Top 100, lists, category pages). 

Lists on Babepedia only show names and thumbnails. This script scrapes biography pages in the background with a parallel queue (up to 4 concurrent), extracts stats, caches them in extension storage, and provides a beautiful, responsive single-drawer panel to filter and search performers in real-time.

---

## 🌟 Key Features

### 1. Unified Filter & Settings Panel
- **Filters View**: Segmented drawer with real-time controls for age, height, boobs type (natural/implants), profession (porn star/model only), ethnicities, hair colors, eye colors, cup sizes, performance acts (solo, girl/girl, boy/girl), minimum rating, and minimum favorites.
- **Settings View**: Directly accessible inside the panel header, allowing customization of badge configuration (enable/disable specific badge types), backup export/import (single JSON backup), and clearing local databases.
- **Clean Solid Design**: Solid backgrounds, responsive mobile drawer, smooth FAB icon, iOS-style toggle switches, and automatic dark mode synchronization (respects the site's `.lightsoff` class).

### 2. High-Performance Filtering Pipeline
- **Zero DOM Thrashing**: Corner badges are injected exactly once upon profile load and tagged via a `data-bp-badged` attribute. Show/hide states are controlled instantaneously via CSS parent class toggles on `document.body`.
- **Debounced Storage Writes**: Slider drag inputs trigger filtering in real-time, but write actions to the userscript extension database (`GM_setValue`) are debounced to prevent blocking the main thread.
- **Coalesced Frame Updates**: Filtering passes and tag refreshes are batched per frame using `requestAnimationFrame`, preventing multiple redundant filter calculations when background fetches resolve.
- **In-Memory Cache**: Active performer profiles are loaded into an in-memory `Map` once on load. Hot paths (like filtering on search keystrokes) read exclusively from memory.

### 3. Scraper Queue, Rate-Limit Resiliency & AutoPager Support
- **Rate-Limit Resiliency**: Performs background fetches with up to 3 concurrent requests, 150ms staggered starts, and standard browser request headers. If blocked or rate-limited (HTTP 429/403/503 or Cloudflare verification challenges), it dynamically triggers exponential cooldowns and cycles the performer to the end of the queue, retrying up to 3 times before failing cleanly. Includes a native same-origin `fetch` fallback.
- **Universal Listing Support**: Automatically detects performer cards (`.thumbshot`) across Top 100 grids (`#thumbs`), multi-section homepages (`#thumbs2`...`#thumbs5`), search results (`.results`), and category listings, while strictly excluding navigation and sidebar menus.
- **AutoPager Compatibility**: A `MutationObserver` watches listing containers and automatically queues newly appended performer cards, dynamically updating the progress counts.
- **Robust Parsing**: Parses complex bio formats (metric/imperial unit conversions, bracketed nationality formats, custom cup mappings, etc.) cleanly, stripping ranking prefixes and handling comma-separated vote tallies.

---

## 📂 Project Architecture

```
bpedia/
├── dist/
│   └── bpedia-filter.user.js  # Compiled userscript bundle ready for installation
├── tests/
│   ├── setup.ts               # Test environment & Greasemonkey API mocks
│   ├── parser.test.ts         # Profile HTML & nationality parsing tests
│   └── filter.test.ts         # URL cleaning, badge status, & settings tests
├── src/
│   ├── main.ts                # Entry point, queue coordinator, and autopager observer
│   ├── style.css              # Solid design tokens & styles
│   ├── types.ts               # Interface schemas for profiles, filters, and settings
│   ├── parser.ts              # DOMParser profile crawler and ISO-3166-1 country code mapping
│   ├── cache.ts               # Storage layer wrapper (GM_getValue, GM_setValue, GM_deleteValue)
│   └── ui/
│       ├── progress.ts        # Dynamic top progress bar controller
│       ├── badges.ts          # Corner badge template injection (Combined Cup + Boob status dot)
│       ├── icons.ts           # Shared SVG icon factory
│       └── filterPanel.ts     # Drawer controller, event handling, and filtering logic
├── package.json               # Developer scripts and dependencies (Vite, TypeScript, Happy-DOM)
├── tsconfig.json              # TypeScript compilation constraints
└── vite.config.ts             # Vite + vite-plugin-monkey userscript building configuration
```

---

## 🛠️ Development & Installation

### Prerequisites
- [Bun](https://bun.sh) runtime (v1.0+)
- A userscript manager extension installed in your browser (e.g., **Violentmonkey** (recommended), **Tampermonkey**, or **Greasemonkey**).

### Installation
1. Install dependencies:
   ```bash
   bun install
   ```
2. Run automated tests:
   ```bash
   bun test
   ```
3. Run development environment:
   ```bash
   bun run dev
   ```
   *Vite will start a local server and print a link to install the development version of the script. Any changes you make will live-reload in the browser.*

4. Compile production bundle:
   ```bash
   bun run build
   ```
   *This compiles TypeScript (without minification), merges styling, packages resources, and outputs the production userscript inside the `dist/bpedia-filter.user.js` file.*

---

## ⚙️ Technical Details

### Country Code Mapping
Nationality text (e.g. `American`) is cleanly parsed from bio pages and mapped to ISO 2-letter country codes (e.g. `US`) to display sleek, compact text badges instead of large flags or long text, optimizing space. Unmapped nationalities cleanly fail to show the badge instead of guessing.

### Range Sliders Protection
The min/max range sliders are programmatically validated in real-time. If the minimum age/height slider is dragged past the maximum slider, the maximum slider is automatically pushed forward to maintain a logical range and prevent empty matches.

### Combined Badge Logic
To keep thumbnails clean and minimize image obstruction:
- **Age**: Rendered as a glass badge on the **top-left** corner (`25y`).
- **Cup Size + Boob Status**: Combined into a single badge on the **bottom-left** corner. Natural breasts display a green SVG dot (`● DD`), implants display a red SVG dot (`● DD`), unknown status displays just the cup size, and known boob status with unknown cup displays an indicator dot with abbreviation (`● Nat` / `● Imp`).
- **Nationality**: Rendered as a glass country code badge on the **bottom-right** corner (`US`).
