# Google AI Mode for Brave Sidebar (v1.4.0)

A high-performance userscript that injects Google's AI-generated search results directly into the Brave Search sidebar.

## ✨ Key Features
- **Native Rendering**: No more clumsy iframes. AI content is extracted, sanitized, and injected as native HTML into the Brave UI for a seamless look.
- **SPA & Filter Support**: Built for Brave Search's Single-Page Application (SPA) architecture. Remembers and re-caches results when switching between web, image, and news filters instantly.
- **Sleek UX**: Includes a custom "Copy to Clipboard" button with micro-animations and Google-style highlights.
- **Premium Aesthetics**: Ethereal glass-style sidepanel matching Brave's modern search UI with carefully tuned HSL color tokens.
- **Efficient Extraction**: Uses a background tab to bypass `X-Frame-Options` without triggering bot detection or CAPTCHAs.

## 🚀 Installation
1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/).
2. Create a new script and paste the contents of `main.js`.
3. Save and refresh your search results on [Brave Search](https://search.brave.com).

## 🛠 How it Works (v5.3.0 Architecture)
1. **Detection**: The script identifies when you are on a Brave Search page.
3. **Extraction**: Instead of waiting a fixed 8 seconds, the script now uses **Fast Stability Detection**:
   - It polls the Google tab every 500ms.
   - If Google's `[data-complete]` attribute appears, it extracts immediately.
   - Otherwise, it waits for 1.5 seconds of text-length stability before capturing.
   - Strips all Google-side tracking, scripts, and layout styles.
4. **Injection**: Clean HTML is passed back via `GM_setValue` and injected natively into the Brave sidebar (`aside.side`).
5. **Caching**: If you switch tabs in Brave, the script instantly restores the panel from its query-specific cache, avoiding redundant network calls.

## 🔧 Troubleshooting
- **Pop-up Blocking**: Ensure `search.brave.com` is allowed to open the background Google tab.
- **Loading Hangs**: If Google AI takes too long to respond, the script will timeout after 40 seconds and offer a manual link.

---
*Created with focus on performance, aesthetics, and privacy.*
