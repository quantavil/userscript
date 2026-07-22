# Userscript & Web Extension Collection

A curated collection of modern, production-ready userscripts, browser extensions, and web automation tools. Designed for power users to enhance video playback, automate repetitive forms, bypass UI limitations, filter search results, and integrate AI into daily browsing.

---

## 🚀 Featured Projects

### 🎥 Media & Video
* **[GlideVideo](./GlideVideo)** — Touch gesture controller for mobile web video (playback speed, volume, pinch-to-zoom, and liquid glass overlay controls).
* **[StreamGrabber](./StreamGrabber)** — Lightweight HLS/fMP4 video downloader with support for AES-128 decryption and adaptive quality selection.
* **[youtube-filter](./youtube-filter)** — Advanced YouTube filter for videos based on view counts, release age, and video duration.
* **[telegram-bot](./telegram-bot)** — Web media downloader for Telegram private channels and restricted webapps.
* **[mal-web](./mal-web)** — Instant MyAnimeList ratings preview on hover/tap with smart caching and color grading.

### 🤖 AI & Automation
* **[form-genie](./form-genie)** — Privacy-first auto form filler for desktop & mobile (IBPS, NTA, SSC, UPSC) with teach-mode rules and optional Gemini AI parsing.
* **[texpander-ai](./texpander-ai)** — AI-powered text expander integrated with Gemini.
* **[universal-solver](./universal-solver)** — Universal web captcha solver powered by Gemini AI with an interactive selector picker.
* **[captcha-ai](./captcha-ai)** — Icegate captcha solver utilizing Gemini AI.
* **[ai-wishlist](./ai-wishlist)** — Unified cross-platform AI wishlist with automatic specs parsing for Amazon and Flipkart.
* **[google-ai-brave](./google-ai-brave)** — Extracts Google AI Mode search results into the Brave Search sidebar.

### 🔍 Search & Filtering
* **[better-search](./better-search)** — Highlight or block domain results across Google, Bing, DuckDuckGo, Brave, and Yandex.
* **[search-switcher](./search-switcher)** — Floating quick switcher to jump between multiple search engines instantly.
* **[github-filter](./github-filter)** — Glassmorphism advanced search builder for GitHub with release detection and presets.
* **[greasey-fork-filter](./greasey-fork-filter)** — Native Greasy Fork keyword filter sync and blocking.
* **[reddit-join](./reddit-join)** — Grid layout view with instant Join/Joined status management for Reddit communities.

### 🛠️ Productivity & Site Tools
* **[codebase-uploader](./codebase-uploader)** — Power-user codebase packager & uploader for LLM chat windows with ignore filters.
* **[chess-bot](./chess-bot)** — Tournament-grade bullet bot helper for online chess platforms.
* **[floating-stopwatch](./floating-stopwatch)** — Tab-isolated floating stopwatch overlay for any webpage.
* **[hsn-details-ext](./hsn-details-ext)** — HSN Export Duty structure extractor for ImpexCube into clean Markdown format.
* **[impex-cube-dropdown](./impex-cube-dropdown)** — Transforms native select inputs into searchable fuzzy dropdowns.
* **[impex-cube-better-dates](./impex-cube-better-dates)** — Manual typing enabled date picker for ImpexCube.
* **[bpedia](./bpedia)** — Babepedia advanced search filter and badges enhancer.
* **[guidely-plus](./guidely-plus)** — Guidely test crawler and Markdown exporter.
* **[oliveboard-plus](./oliveboard-plus)** — Oliveboard UI and test environment enhancer.
* **[testbook-plus](./testbook-plus)** — Testbook test suite utility.
* **[semursh-bot](./semursh-bot)** — SEMrush ranking tracker with AMOLED dark theme.
* **[wallhaven-enhancer](./wallhaven-enhancer)** — Enhanced wallpaper browsing and filtering for Wallhaven.
* **[imdb-torrent](./imdb-torrent)** — Displays IMDb rating and info on torrent sites with direct `.torrent` magnet links.
* **[obsidian-script](./obsidian-script)** — Web-to-Obsidian workflow automation helper script.

---

## 🛠️ Usage & Installation

1. Install a userscript manager in your browser (**Tampermonkey**, **Violentmonkey**, or **Monomonkey**).
2. Navigate to the project folder of your choice (e.g., `GlideVideo/` or `form-genie/`).
3. Build or copy the `.user.js` distribution file into your userscript manager.

### Local Development
Prerequisite: [Bun](https://bun.sh/) package manager.

Each project contains its own configuration (`package.json` / build setup where applicable):

```bash
# Example: Building GlideVideo
cd GlideVideo
bun install
bun run build
```

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
