# 📱 Reddit Reels

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](https://bun.sh/)
[![Build: Vite](https://img.shields.io/badge/Build-Vite%20%2B%20TypeScript-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

An immersive, high-performance Userscript for **Tampermonkey** and **Violentmonkey** (engineered for desktop browsers and mobile web like Firefox Android, Kiwi Browser, Safari, and Orion) that transforms Reddit feeds into a seamless, vertical swipe **Reel Mode** (TikTok / Instagram Reels style) with zero background audio bleed, smart aspect-ratio scaling, gallery carousels, and native voting synchronization.

---

## ✨ Key Features

### 1. 🔊 Unmuted Audio Mutex (Zero Background Bleed)
- **The Problem**: Mobile web video players and third-party embeds default to muted. When unmuted and scrolling past a post, previous audio frequently continues playing in the background, creating cacophony.
- **The Solution**: 
  - Audio starts **unmuted by default**.
  - A strict **Single-Media Focus Mutex** (`AudioManager`) ensures that navigating to any post immediately pauses, mutes, and resets all previous media elements and iframes. Exactly one audio stream is active at any time.
  - RedGifs/Streamable embeds run the userscript directly in their context via the `redgifs-bridge` protocol (`SET_AUDIO`, `PAUSE`, `PLAY`), seamlessly synchronizing audio state in real-time without reloading the iframe.
  - Global sound and volume state persists seamlessly across sessions.

### 2. 📐 Smart Aspect Ratio & Containment (No Cropped Memes)
- Vertical videos (aspect ratio `h / w >= 1.5`) scale to **full-bleed cover** (`100vw × 100dvh`).
- Square (`1:1`) and `4:5` meme videos automatically use **letterboxed contain** so header titles, captions, and bottom punchlines are never cut off.
- **Fit/Fill Mode**: Easily toggle between `contain` (letterbox) and `cover` (full bleed) modes at any time via the action rail button or the `F` keyboard shortcut.

### 3. 👆 Intuitive Touch & Tap Gestures
- **Single Tap**: Toggle video Play / Pause with a visual pulse indicator.
- **Double Tap**: Instantly upvote the tapped reel post with an animated vote pulse.
- **Horizontal Swipe**: Smooth snap-scrolling through multi-image galleries.
- **Vertical Swipe**: Snap-scrolling to the next/previous reel.

### 4. 💬 Subtitles & Closed Captions Toggle
- Floating `CC` button on the overlay and `C` keyboard hotkey allow toggling Reddit video subtitles on and off.
- Subtitle preference is remembered and persisted in `localStorage`.

### 5. 🖼️ Multi-Image Gallery Carousels
- Reddit image galleries render with dedicated horizontal swipe snapping (`scroll-snap-type: x mandatory`).
- Includes floating next/previous navigation buttons and image lightbox containment so high-resolution photos are crisp and fully visible.

### 6. 📄 Editorial Discussion & Rich Link Cards
- **Discussion Posts**: Render inside clean, distraction-free Vanguard cards with isolated vertical scrolling, metadata pills, and direct Reddit thread links.
- **Link Posts**: Render rich preview cards with domain chips, clamped titles, high-resolution thumbnails, and an accessible "Read Article" action button.
- **Crossposts**: Stripped of nested duplicate headers and banners for a clean presentation.

### 7. 🎬 Native RedGifs & Streamable Video Support
- Embedded video hosts (`redgifs.com`, `streamable.com`, `gfycat.com`) are automatically classified as video posts and mounted as responsive iframes rather than static link cards.
- The `redgifs-bridge` subsystem runs inside matched `redgifs.com/ifr/*` iframes, providing direct DOM audio and playback control without destructive reloads.
- Iframes stay keyboard-focus-free (`tabindex=-1` + blur) so hotkeys keep working. Volume keys and mute controls seamlessly sync via the bridge protocol.

### 8. ⌨️ Desktop Keyboard Navigation
- `J` / `ArrowDown` — Navigate to next reel
- `K` / `ArrowUp` — Navigate to previous reel
- `M` — Toggle mute / unmute
- `F` — Toggle Fit / Fill (contain vs cover)
- `+` / `=` or `Shift+ArrowUp` — Volume up
- `-` / `_` or `Shift+ArrowDown` — Volume down
- `C` — Toggle closed captions / subtitles
- `Esc` — Exit Reel Mode back to standard Reddit

### 9. 🛡️ Zero Rate-Limit Architecture
- Does **not** query external unauthenticated `.json` APIs that trigger Reddit 429 rate limits or Cloudflare Turnstile barriers.
- Ingests posts directly from the active DOM (`<shreddit-post>`) using an optimized incremental `MutationObserver` pipeline that dynamically extracts incoming posts as you scroll.

### 10. 🗳️ True Reddit Vote Synchronization
- Upvoting and downvoting in Reel Mode delegates clicks directly to native Reddit voting elements behind the scenes.
- Preserves native CSRF tokens, session authentication, and karma updates with zero risk of account flags.

### 11. 🌓 Flat Minimalist AMOLED Aesthetic
- Engineered with a high-contrast dark theme (`#000000` true black, `#141518` card surfaces, `#ff4500` Reddit accent).
- No fuzzy glassmorphism blur, no sluggish filters, and zero visual clutter.

---

## 📥 Installation

1. Install a userscript manager in your browser:
   - [Violentmonkey](https://violentmonkey.github.io/) *(Recommended)*
   - [Tampermonkey](https://www.tampermonkey.net/)
2. Open [`dist/reddit-reels.user.js`](./dist/reddit-reels.user.js) in your browser.
3. Click **Install** in your userscript manager.
4. Navigate to any subreddit or feed on `https://www.reddit.com/`.
5. Tap the floating **Reels** action button in the bottom-right corner or click any video card!

---

## 🛠️ Architecture & Project Structure

The codebase is modularized by domain (cards, core, extractor, media, styles, ui).
Core extraction/playback modules are intentionally larger (`dom-extractor.ts` ~650,
`audio-manager.ts` ~560, `feed-manager.ts` ~340) because Reddit DOM parsing and the
audio mutex cannot be split without creating leaky abstractions; new UI/styles
helpers should stay small and focused (< 150 lines where practical).

```
reddit-reels/
├── LICENSE                     # MIT License
├── README.md                   # Project documentation
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Monkey userscript builder configuration
├── src/
│   ├── main.tsx                # Bootstrap, initialization & lifecycle orchestration
│   ├── utils.ts                # Score formatting & shared utility helpers
│   ├── cards/                  # Content card components
│   │   ├── text-card.ts        # Editorial discussion text card
│   │   ├── link-card.ts        # Rich external article preview card
│   │   └── index.ts
│   ├── core/                   # Feed orchestration & event controls
│   │   ├── feed-manager.ts     # In-place DOM container transformation & scroll snap
│   │   ├── input-controller.ts # Touch gestures, single/double-tap & keyboard hotkeys
│   │   ├── selectors.ts        # Centralized typed selector registry
│   │   ├── teardown-store.ts   # Per-element original DOM attribute & style cache
│   │   ├── unconstrainer.ts    # Aspect-ratio resolution & subtitle management
│   │   └── index.ts
│   ├── extractor/              # Post extraction & voting proxy
│   │   ├── dom-extractor.ts    # <shreddit-post> DOM parser & MutationObserver
│   │   ├── vote-proxy.ts       # Native Reddit click delegation
│   │   └── types.ts            # Extracted post data interfaces
│   ├── media/                  # Audio & playback controllers
│   │   ├── audio-manager.ts    # Single-media focus mutex
│   │   ├── gallery-media.ts    # Active carousel slide tracking & media focus
│   │   ├── redgifs-bridge.ts   # RedGifs iframe synchronization bridge
│   │   ├── index.ts            # Direct DOM media resolver (native video, iframe embeds, image fallback)
│   │   └── types.ts            # ResolvedMedia interface
│   ├── styles/                 # Domain-decomposed CSS
│   │   ├── base.css            # CSS variables & floating action button
│   │   ├── feed.css            # Snapping container & post media layout
│   │   ├── cards.css           # Text discussion & link preview styling
│   │   ├── gallery.css         # Multi-image horizontal carousel
│   │   ├── overlay.css         # Meta badges, action rail & vote controls
│   │   ├── top-bar.css         # Exit button, video filter & sound buttons
│   │   └── index.css           # Bundled stylesheet entry
│   └── ui/                     # UI components & interactive overlays
│       ├── comments-drawer.ts  # Inline slide-up comments sheet
│       ├── overlay.ts          # Slide action rail, vote pill, and author badges
│       ├── top-bar.ts          # Top navigation bar & video filter toggle
│       ├── pulse.ts            # Play/pause and fit/fill pulse animations
│       └── index.ts
└── tests/
    ├── fixtures/               # Mock Reddit DOM, fixture bundles & test server
    ├── unit/                   # Fast unit tests (Bun test runner, 58 tests)
    │   ├── extractor.test.ts   # DOM extractor & voting proxy tests
    │   ├── media.test.ts       # Audio mutex & media resolver tests
    │   ├── teardown.test.ts    # Feed restoration, teardown, carousel & audit tests
    │   ├── redgifs-bridge.test.ts # RedGifs bridge & message protocol tests
    │   └── audit-fixes.test.ts # Comprehensive audit & robustness tests
    ├── fab.spec.ts             # Playwright: FAB launcher visibility/behavior
    ├── dom-extractor.spec.ts   # Playwright: DOM extraction on mock Reddit
    ├── voting-proxy.spec.ts    # Playwright: native vote delegation
    ├── audio-mutex.spec.ts     # Playwright: single-media audio mutex
    ├── link-post.spec.ts       # Playwright: link-card rendering
    ├── video-sizing.spec.ts    # Playwright: aspect-ratio fit/cover rules
    └── visual-test.ts          # Automated visual regression helper
```

---

## 🧪 Testing & Development

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Unit Tests (58 Tests)
```bash
bun test tests/unit
```

### 3. Run Playwright End-to-End Tests (14 Tests)
```bash
bun run test:e2e
```

### 4. Build Production Userscript
```bash
bun run build
# Emits dist/reddit-reels.user.js with // @license MIT header
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
