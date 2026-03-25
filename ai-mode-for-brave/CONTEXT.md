# Google AI Mode for Brave Sidebar — Context for Future Sessions

## Current Status (v5.3.0)
The script uses a **Background Tab DOM Extraction & Native Rendering** approach.

## Architecture
Single userscript with two `@match` rules and a dual-role design:

```
search.brave.com (Brave Side)          www.google.com (Google Side)
┌─────────────────────────┐           ┌─────────────────────────┐
│ 1. Detect query         │    GM_    │ 4. Detect #gai hash     │
│ 2. Inject sidebar panel │  openIn   │ 5. Wait: window load    │
│ 3. Open background tab ──────Tab───→│ 6. Find AI DOM container│
│                         │           │    (e.g., .pWvJNd)      │
│ 8. Receive HTML via     │  GM_set   │ 7. Deep Clean DOM       │
│    GM_addValueChange ←──────Value───│    (strip scripts/styles│
│ 9. Render NATIVE HTML   │           │     and extract text)   │
│10. Close Google tab     │           │                         │
│                         │           │                         │
│    *SPA Navigation*     │           │                         │
│ - Re-inject panel       │           │                         │
│ - Render from lastHTML  │           │                         │
│   (No re-fetch needed)  │           │                         │
└─────────────────────────┘           └─────────────────────────┘
```

## What Works
- **Panel Injection**: Dynamically inserted into Brave sidebar (`aside.side` or `.sidebar-content`).
- **Background Fetch**: `GM_openInTab` invisibly opens Google AI Mode and extracts data.
- **Native Rendering**: We completely abandoned `<iframe>` and `srcdoc`. The Google side extracts the raw AI response container (`[data-container-id="main-col"]`), deeply sanitizes it, and sends clean HTML fragments natively styled via our own CSS in the Brave panel. 
- **SPA Resilience**: Brave Search is an SPA. The v5.3.0 update tracks the `q` query. If the user clicks a new filter, it re-inserts the panel from a `lastHTML` cache instantly instead of spawning a new tab, saving extreme overhead.
- **Custom UX**: Added a sleek native "Copy" button SVG directly to the Brave panel since Google's scripts are stripped.

## Known Issues / Considerations
1. **Google DOM Structure Changes**: The extraction targets `[data-container-id="main-col"]` or `.pWvJNd`. If Google radically redesigns their AI container, the extraction selector will need to be updated.
2. **`window.close()` / Tab Limits**: The Brave side diligently tracks and cleans up the active `googleTab` using `cleanupFetch()`. However, if the query changes too fast during active polling, rapid background tabs could queue up.

## Failed Approaches (DO NOT RETRY)
| Approach | Why it fails |
|---|---|
| Direct `<iframe src="google.com">` | `X-Frame-Options: SAMEORIGIN` — browser blocks it. |
| Background `iframe` with `srcdoc` | The Google scripts stream updates natively; iframe blocks it if it's purely `srcdoc` without cross-origin assets. Plus, styling matches poorly. |
| CORS proxy (`allorigins.win`) + iframe | Proxy IP immediately triggers Google CAPTCHA firewall. |
| `fetch` + Blob URL | API calls can't reach Google due to Origin mismatch. |

## Key Files
- `main.js` — The userscript (dual-role: Brave-side + Google-side).
- `MEMORY.md` — Project-level memory tracking major project iterations and blunders.
- `README.md` — User-facing installation guide and feature overview.

## Debugging Tips
- All log messages are prefixed `[GAI]` (Google side) or `[GAI-Brave]` (Brave side)
- The Brave SPA triggers `popstate` even when just filtering images vs web. The `checkNavigation()` logic diffs the `?q=` param to distinct between a true new search vs a UI re-render.
- Check browser console on BOTH tabs for log output.
