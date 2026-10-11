# YouTube Video Filter

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

> A powerful userscript to filter YouTube videos by views, upload date, duration, keywords, and channels, with watched video dimming/greyout and customizable preset profiles. Fully optimized for both desktop and mobile viewports. YouTube Shorts are preserved.

## 🚀 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Brave/Kiwi/Safari) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox/Chromium).
2. Install from [`dist/youtube-filter.user.js`](dist/youtube-filter.user.js).
3. Open or refresh [YouTube](https://www.youtube.com) (or [Mobile YouTube](https://m.youtube.com)).

---

## 📱 Mobile & Desktop Compatibility

- **Desktop Viewport:** Full side sliding drawer with dark glassmorphic surfaces, bookmark tab on left edge, and hotkeys (<kbd>Alt</kbd> + <kbd>F</kbd>, <kbd>Escape</kbd>).
- **Mobile Viewport (`m.youtube.com` / Phone screens $\le 480\text{px}$):**
  - Drawer width automatically fits within phone viewport (`width: min(320px, 92vw)`).
  - Compact stacked form controls and touch-optimized tap targets.
  - Multi-selector support for mobile components (`ytm-video-with-context-renderer`, `ytm-compact-video-renderer`, `ytm-reel-item-renderer`, `ytm-rich-item-renderer`).

---

## 📖 Usage & Shortcuts

- **Open / Close Drawer:** Click the **⚙ FILTER** bookmark tab on the left edge or press <kbd>Alt</kbd> + <kbd>F</kbd>.
- **Close Drawer:** Press <kbd>Escape</kbd>, click the red <kbd>×</kbd>, or tap anywhere outside the drawer.
- **Tampermonkey / Violentmonkey Menu:** Click the extension icon in your browser toolbar and select **Toggle Filter Panel**.
- **Quick Submit:** Press <kbd>Enter</kbd> inside any input field to immediately apply the filter.

---

## ⚙️ Filter Features

### 1. 📁 Custom Profiles
- **`Default`** — Clean baseline profile.
- **`+ Save Profile`** — Save your current custom filters as a reusable named profile.
- **Delete Profiles** — Click the red <kbd>×</kbd> on any custom profile pill to delete it.

### 2. 👁️ Watched Videos Mode
- **`Dim (Default)`** — Greys out videos you've already watched ($\ge 70\%$ red progress bar) with $25\%$ opacity + grayscale. Hover over or tap any dimmed video to smoothly un-dim and inspect.
- **`Hide`** — Completely hides watched videos.
- **`Off`** — Disables watched video detection.

### 3. 🏷️ Keyword Blacklist
- Type words, phrases, or regex patterns (e.g. `prank`, `reaction`, `/trailer$/i`) and press <kbd>Enter</kbd> or <kbd>,</kbd> to add tag chips.
- Click the red <kbd>×</kbd> on any chip to remove it.

### 4. 📺 Channel Blacklist & ⭐ VIP Channels
- **Channel Blacklist:** Completely hides videos from low-quality channels or content farms.
- **VIP Channels:** Whitelisted channels **bypass all view count, date, and duration limits** so you never miss videos from your favorite creators.

### 5. ⏱️ Views, Date & Duration
- **Views:** Format like `10K`, `1.5M`, or `1000000`. Includes inline `> 100K` and `> 1M` quick chips.
- **Date Range:** `YYYY-MM-DD` pickers with validation.
- **Duration:** In minutes with spinner arrows removed. Includes inline `< 15m` and `> 20m` quick chips.

---

## ✨ Design & Architecture Highlights

- 🛡️ **Trusted Types Compliant** - Obey YouTube's strict Content Security Policy (`require-trusted-types-for 'script'`) with zero innerHTML sinks.
- 🎯 **2026 YouTube Ready** - Full compatibility with `yt-lockup-view-model`, `ytd-rich-item-renderer`, and mobile `ytm-*` elements.
- 🎨 **YouTube Dark Theme** - Built with YouTube dark palette (`#0f0f0f`, `#212121`, `#ff4d4d` red close buttons) and YouTube SVG icons.
- 📐 **Zero Overlap Auto-Tuck** - The left bookmark tab automatically tucks away when the drawer opens and returns when closed.
- ⚡ **Debounced Mutation Observer** - 100ms debounced scanning + `requestAnimationFrame` for buttery-smooth scrolling on long feeds.
- ⏱️ **Fast-Path Disabled State** - Unhides and un-dims elements with minimal CPU cycles when filter is turned off.
- 🩳 **Shorts Immunity** - YouTube Shorts (`/shorts/`, `ytd-reel-item-renderer`, `ytm-reel-item-renderer`) are never hidden.
- 🔄 **SPA Navigation Aware** - Handles `yt-navigate-finish`, `yt-page-data-updated`, and history events across YouTube page transitions.
- 💾 **Safe LocalStorage Persistence** - Handles `Infinity` $\leftrightarrow$ `null` JSON roundtripping seamlessly.

---

## 🛠️ Development & Testing

Built with **TypeScript**, **Vite**, **vite-plugin-monkey**, **Bun**, and tested with **Playwright Stealth** (Desktop + Mobile).

```bash
# Install dependencies
bun install

# Start local dev server with auto-rebuild
bun run dev

# Run unit tests (happy-dom)
bun run test:unit

# Run end-to-end tests on live YouTube (Playwright Stealth: Desktop & Mobile)
bun run test:e2e

# Run all test suites
bun run test

# Type check
bun run tsc

# Build production bundle (outputs to dist/youtube-filter.user.js)
bun run build
```
