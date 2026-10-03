# Userscript & Web Extension Collection

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](https://bun.sh/)
[![Build System](https://img.shields.io/badge/Build-Vite%20%2B%20TypeScript-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A curated, production-grade monorepo of modern userscripts, browser extensions, and web automation tools. Engineered for power users to supercharge video playback, automate repetitive workflows, bypass UI barriers, filter search results, scrape educational test suites, and inject Gemini AI into everyday browsing.

---

## 📑 Table of Contents

- [🎥 Media, Video & Streaming](#-media-video--streaming)
- [🤖 AI, LLM & Captcha Solvers](#-ai-llm--captcha-solvers)
- [🔍 Search, Filtering & Community](#-search-filtering--community)
- [📚 Portals, E-Learning & Productivity](#-portals-e-learning--productivity)
- [📥 Installation & Usage](#-installation--usage)
- [🛠️ Local Development](#️-local-development)
- [📄 License](#-license)

---

## 🎥 Media, Video & Streaming

| Project | Description |
| :--- | :--- |
| **[reddit-reels](./reddit-reels)** | Swipe Reddit feeds like reels: unmuted playback, galleries, and native voting. |
| **[GlideVideo](./GlideVideo)** | Touch gesture controller for mobile web video (playback speed, volume, brightness, pinch-to-zoom, 3 themes). Available as both a userscript and a Firefox MV3 extension. |
| **[StreamGrabber](./StreamGrabber)** | High-performance HLS (`.m3u8`) and fMP4 stream downloader with AES-128 decryption, adaptive quality selection, and direct blob extraction. |
| **[youtube-filter](./youtube-filter)** | Advanced YouTube filtering by view count, upload date, video duration, keywords, and channels, with watched video dimming and customizable preset profiles. |
| **[telegram-bot](./telegram-bot)** | Media downloader for Telegram Web (`/k/`, `/a/`, `webz`) that enables downloads from private/restricted channels with chunked progress tracking. |
| **[better-wallhaven](./better-wallhaven)** | Wallhaven browsing suite featuring a resizable metadata sidebar, instant lightbox overlay, grid keyboard navigation, and full-resolution downloads. |
| **[imdb-torrent](./imdb-torrent)** | Injects IMDb ratings, metascores, cast, and plot metadata directly into torrent index listings with direct magnet integration. |

---

## 🤖 AI, LLM & Captcha Solvers

| Project | Description |
| :--- | :--- |
| **[form-genie](./form-genie)** | Privacy-first auto form filler for desktop & mobile (IBPS, NTA, SSC, UPSC) with teach-mode rules and optional Gemini AI profile parsing. |
| **[texpander-ai](./texpander-ai)** | Neo Zen-styled text expander featuring global abbreviation palettes (`Alt+P`) and inline AI text transformation menus (`Alt+G` via Gemini 2.5 Flash Lite). |
| **[universal-solver](./universal-solver)** | Point-and-click universal captcha solver powered by AI vision and speech-to-text models: text, math, image-grid (incl. reCAPTCHA v2) and audio captchas. |
| **[captcha-ai](./captcha-ai)** | Dedicated automated captcha solver tailored for Icegate portal authentication workflows using Gemini AI. |
| **[ai-wishlist](./ai-wishlist)** | Cross-origin shopping assistant that unifies, parses, and syncs wishlists and technical specs across Amazon and Flipkart for AI evaluation. |
| **[google-ai-brave](./google-ai-brave)** | Injects Google's AI Overview / AI Mode search results directly into the Brave Search sidebar for unified multi-engine answers. |
| **[codebase-uploader](./codebase-uploader)** | Power-user codebase packager & uploader for LLM chat windows with CRT Command Matrix UI, live context meters, and smart ignore filters. |

---

## 🔍 Search, Filtering & Community

| Project | Description |
| :--- | :--- |
| **[better-search](./better-search)** | Domain highlighter and blocker across Google, Bing, DuckDuckGo, Brave, and Yandex search results. |
| **[search-switcher](./search-switcher)** | Minimal dark floating switcher with SVG icons to jump queries instantly across Brave, Yandex, Bing, DDG, YouTube, and Google. |
| **[github-filter](./github-filter)** | GitHub search query builder with saved presets, whole-word result filter, and native GitHub Primer design tokens. |
| **[greasey-fork-filter](./greasey-fork-filter)** | Persistent Greasy Fork script listing filter to hide low-quality scripts by install threshold, author, or keyword. |
| **[reddit-manager](./reddit-manager)** | Bulk-management suite for Reddit to export/import subreddits, mass leave subscriptions, and batch overwrite/delete posts and comments. |
| **[better-alternativeto](./better-alternativeto)** | AlternativeTo enhancer adding direct website/GitHub/app-store chips to cards, pinned compact filter bar with likes range, and accessible dark mode. |
| **[better-rule34](./better-rule34)** | Rule34Video brutalist erotic latex enhancer featuring a floating bottom-right telemetry FAB, four tactile sliders (rating, views, duration, year), site-wide dark carbon/scanline theme, bulletproof auto-paging, and ad eradication. |
| **[omarchy-plugins-enhancer](./omarchy-plugins-enhancer)** | Omarchy Plugins catalog enhancer adding auto pager next (infinite scroll), direct GitHub repository links on cards, and seen plugin greying out. |
| **[bpedia](./bpedia)** | Babepedia enhancer adding advanced multi-attribute filtering, glassmorphic badges, and thumbnail grid optimizations. |

---

## 📚 Portals, E-Learning & Productivity

| Project | Description |
| :--- | :--- |
| **[site-orbit](./site-orbit)** | Private Domain & Tech Observatory caching verified Tranco global ranks, live in-DOM tech stacks, Cloudflare DNS/Infra, and browser telemetry. |
| **[better-investograin](./better-investograin)** | InvestorGain IPO table optimizer that blocks broker ads/sidebars and auto-sorts open, upcoming, and closed IPOs by true urgency with clean dividers. |
| **[testbook-plus](./testbook-plus)** | Testbook test suite crawler and exporter that cleans tracking scripts, preserves MathJax formulas as LaTeX, and converts question papers to clean Markdown. |
| **[guidely-plus](./guidely-plus)** | Guidely test review crawler that enables text selection/copying and exports full tests and solutions to structured Markdown. |
| **[oliveboard-plus](./oliveboard-plus)** | Oliveboard UI declutterer and mock test extractor that strips banners, stops intrusive popups, and exports full question/solution suites to Markdown. |
| **[impex-cube-dropdown](./impex-cube-dropdown)** | Transforms native select dropdowns into searchable, keyboard-friendly fuzzy dropdowns on Impex Cube portals. |
| **[impex-cube-better-dates](./impex-cube-better-dates)** | Replaces ASP.NET calendars with a fast, manual-typing enabled, smart date picker on Impex Cube portals. |
| **[floating-stopwatch](./floating-stopwatch)** | High-performance, tab-isolated floating stopwatch overlay with millisecond precision that persists seamlessly across page reloads. |
| **[chess-bot](./chess-bot)** | Tournament-grade bullet and blitz chess analysis and move helper for Chess.com. |
| **[semursh-bot](./semursh-bot)** | SEMrush rankings tracker widget displaying domain ranking data and traffic metrics in a sleek AMOLED dark overlay. |

---

## 📥 Installation & Usage

1. **Install a Userscript Manager** in your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) *(Recommended for Chromium & Safari)*
   - [Violentmonkey](https://violentmonkey.github.io/) *(Recommended for Firefox & Chromium)*
   - [FireMonkey](https://addons.mozilla.org/firefox/addon/firemonkey/) *(Lightweight alternative)*

2. **Install a Script**:
   - Navigate to any project folder linked above.
   - Click the link to its distribution script (e.g. `dist/<project-name>.user.js`) and confirm the installation in your userscript manager.

3. **Browser Extensions**:
   - Projects like **[GlideVideo](./GlideVideo)** and **[SiteOrbit](./site-orbit)** also ship as standalone Firefox Manifest V3 WebExtensions (`.xpi` / `.zip`) inside their respective project directories.

---

## 🛠️ Local Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Node.js](https://nodejs.org/) (optional, if using npm/pnpm/yarn)

### Building Projects

Most projects are built with **TypeScript** and bundled via **Vite** with `vite-plugin-monkey`.

```bash
# Navigate to the target project
cd GlideVideo

# Install dependencies
bun install

# Start Vite dev server with Hot Userscript Reloading
bun run dev

# Build production userscript bundle to dist/
bun run build
```

---

## 📄 License

This repository and all included userscripts are open source and licensed under the [MIT License](LICENSE).
