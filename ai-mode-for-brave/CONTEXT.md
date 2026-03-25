# Google AI Mode for Brave Sidebar — Context for Future Sessions

## Current Status (v1.4.0)
The script uses a **Fast Background Tab Extraction** approach via stability polling.

## Architecture
Single userscript with two `@match` rules and a dual-role design:

```
search.brave.com (Brave Side)          www.google.com (Google Side)
┌─────────────────────────┐           ┌─────────────────────────┐
│ 1. Detect query         │    GM_    │ 4. Detect #gai hash     │
│ 2. Inject sidebar panel │  openIn   │ 5. Wait: window load    │
│ 3. Open background tab ──────Tab───→│ 6. Fast Stability Poll    │
│                         │           │    (500ms intervals)      │
│ 8. Receive HTML via     │  GM_set   │ 7. Detect [data-complete] │
│    GM_addValueChange ←──────Value───│    or Text Stability      │
│ 9. Render NATIVE HTML   │           │ 8. Deep Clean & Send      │
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
- **Fast Stability Detection**: Replaced the 8s static wait with a 500ms polling system. It detects content completion via Google's `[data-complete]` attribute or 1.5s of text-length stability.
- **Improved Latency**: Removed the 300ms artificial delay in rendering on the Brave side.
- **Custom UX**: Added a sleek native "Copy" button SVG directly to the Brave panel since Google's scripts are stripped.

## Known Issues / Considerations
1. **Google DOM Structure Changes**: The extraction targets `[data-container-id="main-col"]` or `.pWvJNd`. If Google radically redesigns their AI container, the extraction selector will need to be updated.
2. **Tab Cleanup**: The Brave side uses `cleanupFetch()` to ensure background tabs are closed immediately upon receipt or timeout (40s).

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
