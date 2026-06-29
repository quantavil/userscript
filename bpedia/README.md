# Babepedia Advanced Filter & Badges Userscript

A premium, high-performance userscript designed to inject advanced filtering capabilities and clean glassmorphic corner badges onto Babepedia list pages (e.g., Top 100, lists, category pages). 

Lists on Babepedia only show names and thumbnails. This script sequentially scrapes biography pages in the background, extracts stats, caches them in extension storage, and provides a beautiful, responsive dual-drawer panel to filter and search performers in real-time.

---

## 🌟 Key Features

### 1. Dual-Drawer Interface
- **Filters Panel**: Stacked drawer with real-time controls for age, height, boobs type (natural/implants), profession (porn star/model only), ethnicities, hair colors, eye colors, cup sizes, performance acts (solo, girl/girl, boy/girl), minimum rating, and minimum favorites.
- **Settings Panel**: Separate drawer to customize badge configuration (enable/disable specific badge types) and clear local databases.
- **Apple Glassmorphic Design**: Clean blur saturation backdrops, responsive mobile drawers, smooth FAB icons, iOS-style toggle switches, and automatic dark mode synchronization (respects the site's `.lightsoff` class).

### 2. High-Performance Filtering Pipeline
- **Zero DOM Thrashing**: Corner badges are injected exactly once upon profile load and tagged via a `data-bp-badged` attribute. Show/hide states are controlled instantaneously via CSS parent class toggles on the `#thumbs` container.
- **Debounced Storage Writes**: Slider drag inputs trigger filtering in real-time, but write actions to the userscript extension database (`GM_setValue`) are debounced to prevent blocking the main thread.
- **Coalesced Frame Updates**: Filtering passes and tag refreshes are batched per frame using `requestAnimationFrame`, preventing multiple redundant filter calculations when background fetches resolve.
- **In-Memory Cache**: Active performer profiles are loaded into an in-memory `Map` once on load. Hot paths (like filtering on search keystrokes) read exclusively from memory.

### 3. Background Scraper & AutoPager Support
- **Throttled Scraping**: Performs background fetches sequentially with a 250ms delay to prevent IP rate-limiting, accompanied by a dynamic progress bar at the top of the viewport.
- **AutoPager Compatibility**: A `MutationObserver` watches the list container and automatically queues newly appended performer cards, dynamically updating the progress counts.
- **Robust Parsing**: Parses complex bio formats (metric/imperial unit conversions, bracketed nationality formats, custom cup mappings, etc.) cleanly.

---

## 📂 Project Architecture

```
bpedia/
├── dist/
│   └── bpedia-filter.user.js  # Compiled userscript bundle ready for installation
├── src/
│   ├── main.ts                # Entry point, queue coordinator, and autopager observer
│   ├── style.css              # Apple iOS-style glassmorphism design tokens & styles
│   ├── types.ts               # Interface schemas for profiles, filters, and settings
│   ├── parser.ts              # DOMParser profile crawler and ISO-3166-1 country code mapping
│   ├── cache.ts               # Storage layer wrapper (GM_getValue, GM_setValue, GM_deleteValue)
│   └── ui/
│       ├── progress.ts        # Dynamic top progress bar controller
│       ├── badges.ts          # Corner badge template injection (Combined Cup + Boob status dot)
│       └── filterPanel.ts     # Drawer controller, event handling, and filtering logic
├── package.json               # Developer scripts and dependencies (Vite, TypeScript)
├── tsconfig.json              # TypeScript compilation constraints
└── vite.config.ts             # Vite + vite-plugin-monkey userscript building configuration
```

---

## 🛠️ Development & Installation

### Prerequisites
- Node.js (v18+)
- A userscript manager extension installed in your browser (e.g., **Violentmonkey** (recommended), **Tampermonkey**, or **Greasemonkey**).

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development environment:
   ```bash
   npm run dev
   ```
   *Vite will start a local server and print a link to install the development version of the script. Any changes you make will live-reload in the browser.*

3. Compile production bundle:
   ```bash
   npm run build
   ```
   *This compiles TypeScript, merges styling, packages resources, and outputs the production userscript inside the `dist/bpedia-filter.user.js` file.*

---

## ⚙️ Technical Details

### Country Code Mapping
Nationality text (e.g. `American`) is cleanly parsed from bio pages and mapped to ISO 2-letter country codes (e.g. `US`) to display sleek, compact text badges instead of large flags or long text, optimizing space. Unmapped nationalities cleanly fail to show the badge instead of guessing.

### Range Sliders Protection
The min/max range sliders are programmatically validated in real-time. If the minimum age/height slider is dragged past the maximum slider, the maximum slider is automatically pushed forward to maintain a logical range and prevent empty matches.

### Combined Badge Logic
To keep thumbnails clean and minimize image obstruction:
- **Age**: Rendered as a glass badge on the **top-left** corner (`25y`).
- **Cup Size + Boob Status**: Combined into a single badge on the **bottom-left** corner. Natural breasts display a green SVG dot (`● DD`), implants display a red SVG dot (`● DD`), and unknown status displays just the cup size.
- **Nationality**: Rendered as a glass country code badge on the **bottom-right** corner (`US`).
