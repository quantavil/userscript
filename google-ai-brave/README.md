# Google AI Mode for Brave Sidebar

> Injects Google's AI-generated search results directly into the Brave Search sidebar — seamlessly, instantly, and without leaving Brave.

![Version](https://img.shields.io/badge/version-3.0.0-6366f1)
![License](https://img.shields.io/badge/license-MIT-green)

---

## The Problem

Google's AI Mode (`udm=50`) produces excellent synthesized answers, but you can't access them from Brave Search without manually opening Google in another tab, waiting for the response, and context-switching back and forth.

## The Solution

This userscript runs silently in the background. When you search on Brave, it:
1. Opens a hidden Google AI Mode tab
2. Waits for the AI to finish generating its response
3. Extracts the clean HTML content
4. Injects it into Brave's sidebar as a native-looking panel
5. Closes the background tab automatically

**You never leave Brave Search.**

---

## Features

| Feature | Description |
|---------|-------------|
| **Native Rendering** | AI content is extracted, sanitized, and injected as clean HTML — no iframes |
| **Smart Completion Detection** | Watches for Google's own Copy/Thumbs Up/Thumbs Down buttons to confirm the response is fully generated before extracting |
| **5-Second Streaming Fallback** | If buttons don't appear, waits for 5 seconds of stable text before capturing — handles edge cases without cutoff |
| **Multi-Query Cache** | Results are cached for 15 minutes via `GM_getValue`. Stores up to 10 recent unique queries, allowing instant switching between searches |
| **SPA-Aware Navigation** | Intercepts `pushState`/`replaceState`, `popstate`, and uses `MutationObserver` for instant, reliable detection of query changes and sidebar state |
| **Panel Persistence** | If Brave's SPA destroys the sidebar DOM, the panel is automatically re-inserted. Handled by a debounced observer for zero-latency response |
| **Real-time Migration** | If the panel renders before the sidebar exists, it floats temporarily and migrates into the sidebar the moment it becomes available |
| **Error Detection** | Detects CAPTCHAs, sign-in walls, and rate-limit pages — shows an actionable error instead of garbage HTML |
| **Copy to Clipboard** | One-click copy with checkmark micro-animation (copies as Markdown) |
| **Open in Tab** | Direct link to view the full Google AI Mode page |
| **Manual Reload** | Re-fetch button to force a fresh response |
| **60-Second Hard Cap** | Never hangs indefinitely — times out gracefully with a manual fallback link |
| **Bypass Flags** | Append `-noai` or `--noai` to your query to skip AI mode for that search |

---

## Installation

### Prerequisites
- [Tampermonkey](https://www.tampermonkey.net/) (recommended) or any userscript manager that supports `GM_openInTab`
- Brave Browser (or any Chromium browser using Brave Search)

### Steps
1. Clone this repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the userscript:
   ```bash
   bun run build
   ```
4. In Tampermonkey, click **Create a new script**
5. Delete the template and paste the contents of `dist/google-ai-brave.user.js`
6. Press **Ctrl+S** to save
7. Search anything on [Brave Search](https://search.brave.com)

### Development
Run the build in watch mode for real-time updates:
```bash
bun run dev
```

### Important
- **Allow pop-ups** for `search.brave.com` in your browser settings — the script needs to open a background Google tab
- The background tab opens **inactive** and closes automatically after extraction

---

## Architecture

```
┌─────────────────────┐         GM_setValue          ┌──────────────────────┐
│   BRAVE SEARCH TAB  │ ◄──── "gai_cache" ───────  │   GOOGLE AI TAB      │
│                     │       (Multi-Query)          │   (background)       │
│  ┌───────────────┐  │    ┌──────────────────────┐  │                      │
│  │ Sidebar Panel │  │    │  Completion Signal:   │  │  1. Page loads       │
│  │               │  │    │  • Copy button exists  │  │  2. AI streams text  │
│  │  • Loading    │  │    │  • Thumbs up exists    │  │  3. Buttons appear   │
│  │  • Content    │  │    │  • Thumbs down exists  │  │  4. Extract + send   │
│  │  • Error      │  │    │  • 5s text stability   │  │  5. Tab auto-closes  │
│  └───────────────┘  │    │  • 60s hard cap        │  │                      │
│                     │    └──────────────────────┘  │                      │
└─────────────────────┘                              └──────────────────────┘
```

### Completion Detection (Priority Order)

| Priority | Signal | Wait Time | Confidence |
|----------|--------|-----------|------------|
| 1 | Google's action buttons appear (`Copy text`, `Good response`, `Bad response`) + 1 stable poll | ~500ms after buttons | ★★★ High |
| 2 | Text content length unchanged for 10 consecutive polls | 5 seconds | ★★ Medium |
| 3 | Hard timeout | 60 seconds | ★ Fallback |
| 4 | Error page detected (CAPTCHA/sign-in) | Immediate | Error |

### Content Extraction Pipeline

```
Raw Google DOM
  ↓ Clone container node
  ↓ Strip: scripts, styles, iframes, navigation, toolbars, buttons, SVGs, images
  ↓ Strip: display:none elements
  ↓ Convert: role="heading" → semantic <h1>-<h6>
  ↓ Strip: all attributes except href, colspan, rowspan
  ↓ Prune: empty nodes (recursive)
  ↓ Clean HTML string
```

---

## Configuration

| Constant | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL` | `900000` (15 min) | How long cached results are valid |
| Max Cache Size | 10 queries | Limit to prevent memory bloat |
| `stableCount >= 1` (with buttons) | 500ms | Wait after buttons appear |
| `stableCount >= 10` (without buttons) | 5000ms | Fallback stability threshold |
| Hard cap timeout | `60000` (60s) | Maximum wait on Google side |
| Brave-side timeout | `60000` (60s) | Maximum wait on Brave side |
| Poll interval | `500` ms | How often Google-side checks for completion |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Panel shows "Could not open background tab" | Pop-ups blocked for `search.brave.com` | Allow pop-ups in browser settings |
| Panel shows "Timed out waiting for response" | Google AI Mode took >60s or failed silently | Click "Open Manually" or the reload button |
| Panel shows "Google blocked the request" | CAPTCHA or sign-in wall triggered | Open Google manually, solve CAPTCHA, then reload |
| Panel appears floating instead of in sidebar | Sidebar DOM hasn't loaded yet | Wait — it auto-migrates when the sidebar appears |
| Content appears cut off | Rare: text paused for >5s mid-stream | Click reload to re-fetch |
| Panel disappears when switching filters | Brave SPA rebuilds the DOM | Automatic — panel re-inserts from cache |

---

## Browser Permissions Required

| Permission | Why |
|------------|-----|
| `GM_openInTab` | Open background Google tab |
| `GM_setValue` / `GM_getValue` | Cross-tab communication + caching |
| `GM_addValueChangeListener` | Real-time response delivery from Google → Brave |
| `GM_addStyle` | Inject panel CSS |
| `@connect *` | Allow cross-origin tab operations |

---

## Changelog

### v3.0.0
- **TypeScript Migration**: Full project rewrite in TypeScript for better maintainability and type safety.
- **Modular Architecture**: Split monolithic script into specialized modules (`google.ts`, `brave.ts`, `markdown.ts`, etc.).
- **Build Pipeline**: Integrated `esbuild` for bundling and `bun` for package management.
- **Improved Markdown**: Switched to Turndown + GFM plugin for robust Markdown conversion.
- **KaTeX Support**: Integrated math rendering for complex AI responses.

### v2.5.0
- **Added**: `-noai` and `--noai` query flags to bypass AI extraction on demand.
- **Improved**: Zero-leak listener management (strict `clearListener` on all entry points).
- **Refactored**: Unified `currentQuery` and `lastQuery` into `activeQuery` state.
- **Fixed**: Spurious Markdown table separator rows for row-header `<th>` cells in `<tbody>`.
- **Fixed**: Write-race condition on high-frequency `getCache()` reads during fetch locking.
- **Fixed**: Decoupled CSS keyframe names from dynamic `ID` constants.

### v2.4.0
- **Stable Navigation**: Unified `handleDOMChange` orchestration with improved `popstate` and history hook reliability.
- **Improved Teardown**: Added `cleanupFetch` and `clearFetchLock` to prevent background tab orphaning on rapid navigation.

### v2.3.0
- **Added**: `MutationObserver` implementation for sidebar detection and panel persistence, replacing high-frequency polling with event-driven reactivity.
- **Refactored**: Shared utility helpers (`getCache`, `setCache`, `clearListener`, `closeTab`) to improve memory safety and codebase DRYness.

### v2.2.1
- **Updated**: Cache TTL increased from 5 minutes to 15 minutes.

### v2.2.0
- **Refactored**: Massive DRY improvements for cache access (`getCache`/`setCache`), background tab management (`closeTab`), and GM listeners clearing (`clearListener`).
- **Fixed**: Potential memory leaks and bugs with repeated/stale `GM_getValue` parsing and `gai_cache` fetching lock overrides.

### v2.1.0
- **Added**: Multi-Query Cache — stores up to 10 unique queries via `gai_cache` for instant back-and-forth navigation.
- **Fixed**: Cache eviction logic (oldest first) to prevent memory bloat.
- **Fixed**: `GM_getValue` cross-manager compatibility fixes.

### v2.0.0
- **Fixed**: Content cutoff — replaced phantom `[data-complete]` with real Google UI signals (Copy/Thumbs buttons)
- **Fixed**: Streaming pause false-positive — raised stability threshold from 1.5s to 5s
- **Added**: Error page detection (CAPTCHA, sign-in, rate-limit)
- **Added**: `GM_getValue` boot cache (5-minute TTL)
- **Added**: Float-to-sidebar migration
- **Added**: `pushState`/`replaceState` interception for instant SPA navigation detection
- **Fixed**: Background tab orphaning on rapid reloads
- **Fixed**: Interval stacking race condition in sidebar polling
- **Improved**: Hard cap raised from 30s to 60s
- **Refactored**: Deduplicated icons, selectors, and URL helpers

### v1.4.0
- Initial public release
- Background tab extraction
- SPA panel persistence
- Basic text-stability detection

---

## License

MIT — use it, fork it, improve it.

---

*Built for speed, reliability, and privacy. No data leaves your browser — everything runs locally between two tabs.*