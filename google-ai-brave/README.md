# Google AI Mode for Brave Sidebar

> Injects Google's AI-generated search results directly into the Brave Search sidebar — seamlessly, instantly, and without leaving Brave.

![Version](https://img.shields.io/badge/version-3.3.2-6366f1)
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
| **Centralized Cache** | Results are cached for 15 minutes via `GM_getValue`. Uses a robust FIFO pruning strategy (max 10 entries) enforced at the persistence layer to prevent memory bloat |
| **SPA-Aware Navigation** | Intercepts `pushState`/`replaceState`, `popstate`, and uses `MutationObserver` for instant, reliable detection of query changes and sidebar state |
| **Panel Persistence** | If Brave's SPA destroys the sidebar DOM, the panel is automatically re-inserted. Handled by a debounced observer for zero-latency response |
| **Real-time Migration** | If the panel renders before the sidebar exists, it floats temporarily and migrates into the sidebar the moment it becomes available |
| **Error Detection** | Detects CAPTCHAs, sign-in walls, and rate-limit pages — shows an actionable error instead of garbage HTML |
| **Copy to Clipboard** | One-click copy with checkmark micro-animation (copies as Markdown) |
| **Open in Tab** | Direct link to view the full Google AI Mode page |
| **Manual Reload** | Re-fetch button to force a fresh response |
| **60-Second Hard Cap** | Never hangs indefinitely — times out gracefully with a manual fallback link |
| **Smart Toggle** | Enable/Disable AI by default via userscript menu command (`Toggle AI by Default`) |
| **Customizable Flags** | Define your own activation (`--ai`) and bypass (`--noai`) flags via menu commands. Uses dynamic regex generation for safe, accurate query scrubbing |
| **Smart Inversion** | Logic automatically inverts based on the default state (force AI when OFF, bypass AI when ON) — no complex manual configuration needed |

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

## How to Use

### Triggering the AI
By default, the AI sidebar only triggers when you opt-in. This behavior can be toggled.

| Mode | Trigger |
|------|---------|
| **AI OFF by Default** | Append `--ai` to your query (e.g., `best mechanical keyboards --ai`) |
| **AI ON by Default** | Append `--noai` to bypass (e.g., `weather today --noai`) |

> [!TIP]
> You can search for just `--ai` or `--noai` alone to trigger/bypass without a query.

### Customization
Click the userscript manager icon while on Brave Search to access the menu commands:
- **Toggle AI by Default**: Switches the activation logic.
- **Set AI Flag**: Choose your own activation keyword (default: `--ai`).
- **Set No-AI Flag**: Choose your own bypass keyword (default: `--noai`).

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
  ↓ Fail-fast if AI container not found (prevents full-page capture)
  ↓ Strip: scripts, styles, iframes, navigation, toolbars, buttons, SVGs
  ↓ Replace: citation badges with contextual Google Search links
  ↓ Strip: display:none elements (case-insensitive)
  ↓ Convert: role="heading" → semantic <h1>-<h6> (clamped 1-6)
  ↓ Absolute URLs: resolve href, src, and srcset (responsive) using GOOGLE_ORIGIN
  ↓ Strip: all attributes except href, src, srcset, alt, aria-label, target, rel, width, height, colspan, rowspan
  ↓ Prune: empty nodes (recursive, ignores <img>, <br>, <hr>)
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
| Brave-side timeout | `62000` (62s) | Maximum wait on Brave side (Fetch Lock) |
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

### v3.3.2
- **Optimization**: Removed dead exports (`AI_RE`, `NOAI_RE`) from `constants.ts` and encapsulated internal URL helpers.
- **Cache Reliability**: Implemented strict `MAX_CACHE_ENTRIES` enforcement (FIFO) and TTL-based eviction within `setCache` for centralized persistence management.
- **DRY Refactor**: Added unified `parseQuery()` to avoid redundant `getSettings()` calls when both `isAIEnabled` and `stripFlags` are needed.
- **Bug Fix**: Preserved `<source>` elements during empty-node removal to prevent responsive image breakage.
- **KaTeX**: Improved inline LaTeX regex to handle escaped dollar signs.
- **Improved Scoping**: Verified and refined export visibility across modules.

### v3.3.0
- **AI Toggle System**: Added a "Toggle AI by Default" command to the userscript manager menu.
- **Customizable Flags**: Users can now change the AI activation (`--ai`) and bypass (`--noai`) flags via menu commands.
- **Inversion Logic**: Implemented dynamic flag inversion based on the default state.
- **Smart Flag Stripping**: Automatically cleans custom flags from the search query using dynamic regex generation.

### v3.2.0
- **Enhanced Image Reliability**: Implemented robust absolute URL resolution for `src` and `srcset` (including responsive descriptors) to ensure images load correctly from Google's origin.
- **Robustness Overhaul**: Added fail-fast container detection to prevent accidental full-page capture and implemented explicit "AI content not detected" feedback.
- **Improved Citations**: Replaced citation badges with smart, contextual Google Search links that preserve `target="_blank"` and `rel` attributes.
- **Precise UI Controls**: Added heading level clamping (1-6) and case-insensitive/whitespace-resilient style checks for hidden elements.
- **Brave Polling Management**: Added `stopSidebarPoll()` to cleanly clear background timers when the sidebar is removed or queries change.
- **Refined AI Flag**: Updated `--ai` flag stripping logic for better query precision.

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


---

## License

MIT — use it, fork it, improve it.

---

*Built for speed and reliability. Your query is sent to Google AI Mode in a background tab only when you opt in with `--ai`. No other data leaves your browser.*