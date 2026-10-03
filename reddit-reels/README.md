# 📱 Reddit Reels

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](https://bun.sh/)
[![Build: Vite](https://img.shields.io/badge/Build-Vite%20%2B%20TypeScript-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

A userscript for **Tampermonkey** / **Violentmonkey** (desktop, Firefox Android, Kiwi, Safari, Orion) that makes Reddit's own feed **behave like a vertical reel** (TikTok / Shorts style): one post per screen, snap scrolling, a single playing video with sound, RedGifs support, and native voting.

There is no launcher button and no separate app layered over Reddit. The script restyles the real feed in place and lets Reddit keep doing what it already does well.

---

## 🧭 How it works

| Concern | Who does it |
|---|---|
| Scrolling, infinite loading, Back/forward scroll position | **Reddit + the browser.** The window itself scrolls with CSS `scroll-snap`; nothing nested. |
| Video decode, buffering, seek bar, play/pause, captions UI, fullscreen | **Reddit's native player** (`shreddit-player-2`), with its control bar left usable. |
| Comments | **Reddit's own post page** (new Reddit). The comment button follows the post's native link, and Back returns to the same slide. |
| Search, account menu, navigation | **Reddit's header**, kept as a translucent bar over the reel. |
| Only one thing plays, at your volume | **This script** (focus rule in `AudioManager`). |
| Title / sub / author, vote rail, sound, Fit/Fill, gestures, keys | **This script**, layered on top. Votes are clicked through to Reddit's buttons. |

### Activation
- Turns on automatically on feed routes: home, `/best` `/hot` `/new` `/top` `/rising`, `/r/<sub>` (and its sort tabs), `/r/popular`, `/r/all`, `/user/<name>/submitted`.
- Never runs on post pages, search, settings, chat, or inside iframes.
- Reddit navigates client-side (`pushState`), so routes are watched through the Navigation API, wrapped `history` methods, `popstate` and bfcache restores. Opening a post stops the reel instantly; Back re-applies it and lands on the slide you left.
- **Reel ⇄ list toggle** lives in Reddit's header, next to the user menu. It falls back to a small top-right pill if the header can't be found. `Esc` also switches to list view. The choice is remembered per device.

---

## ✨ Features

### 🔊 One stream at a time
- Audio starts **unmuted** (falls back to muted only when the browser blocks audible autoplay; the next tap unmutes).
- When a slide becomes active, every other video (including ones inside Reddit's shadow DOM) and every embed is paused and muted.
- If Reddit's player autoplays a neighbouring video on its own, it is paused again immediately.
- **Native and reel controls stay in sync.** Muting with Reddit's player button updates the reel's sound button and the stored preference. If the player flips mute by itself (no user gesture), the user's choice is restored.

### 🎬 RedGifs, Streamable, YouTube
- Link posts to RedGifs / Streamable / Gfycat / YouTube are shown as video slides.
- Embeds are **parked** (`about:blank`) until their slide is active, so a feed full of RedGifs can't autoplay many streams at once.
- Inside `redgifs.com/ifr/*` frames the script runs a small bridge (`SET_AUDIO`, `PLAY`, `PAUSE`) so RedGifs pauses and resumes without reloading. Embeds without a bridge are unloaded when you scroll away; that is the only reliable way to silence them.

### 📐 Sizing
- True vertical videos (`h / w ≥ 1.5`) fill the screen; square and 4:5 memes are letterboxed so captions are never cropped.
- `F` or the rail button toggles Fit (contain) / Fill (cover).

### 👆 Gestures
- **Single tap** on the media: play / pause.
- **Double tap**: upvote.
- **Swipe** vertically: next / previous slide. Galleries keep Reddit's native horizontal carousel.
- Taps on Reddit's native player controls go to the player untouched.

### 🖼️ Galleries, text and link posts
- Galleries keep Reddit's carousel; lazy slides next to the visible one are promoted eagerly.
- Text posts render as readable cards; link posts as preview cards with a "Read article" action.

### 🗳️ Native voting, zero API calls
- Votes click Reddit's own buttons (CSRF, session and karma handled by Reddit).
- Posts are read from the rendered DOM. No `.json` requests, so no 429s or Cloudflare challenges.

### ⌨️ Keyboard
| Key | Action |
|---|---|
| `J` / `↓` | Next slide |
| `K` / `↑` | Previous slide |
| `M` | Mute / unmute |
| `+` `=` / `Shift+↑` | Volume up |
| `-` `_` / `Shift+↓` | Volume down |
| `F` | Fit / Fill |
| `C` | Captions |
| `Esc` | Switch to list view |

---

## 📥 Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) *(recommended)* or [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`dist/reddit-reels.user.js`](./dist/reddit-reels.user.js) and click **Install**.
3. Open any feed on `https://www.reddit.com/`. It is already a reel. Use the header toggle to switch to list view.

---

## 🛠️ Project structure

```
reddit-reels/
├── src/
│   ├── main.ts                 # Lifecycle: route → activate/deactivate, header toggle, Back restore
│   ├── index.ts                # Entry (RedGifs bridge in RedGifs frames, reel elsewhere)
│   ├── utils.ts                # URL safety, number formatting
│   ├── cards/                  # Text and link post cards
│   ├── core/
│   │   ├── route.ts            # Feed-route matcher + client-side navigation watcher
│   │   ├── feed-manager.ts     # Per-post enhancement, observers, videos-only filter, teardown
│   │   ├── input-controller.ts # Taps, double-tap upvote, hotkeys (native controls pass through)
│   │   ├── unconstrainer.ts    # Lifts Reddit's media size clamps, captions, gallery wiring
│   │   ├── teardown-store.ts   # Original style/attribute backup for exact restore
│   │   └── selectors.ts
│   ├── extractor/              # <shreddit-post> parser + vote proxy
│   ├── media/
│   │   ├── audio-manager.ts    # Single-focus rule, play guard, native mute sync, embed parking
│   │   ├── redgifs-bridge.ts   # Runs inside RedGifs iframes
│   │   ├── video-hydrator.ts   # Last-resort source copy if Reddit never loads the active video
│   │   └── gallery-media.ts
│   ├── styles/                 # base, feed (window snap), overlay, cards, gallery, header
│   └── ui/
│       ├── header-toggle.ts    # Reel/list + videos-only buttons in Reddit's header
│       ├── overlay.ts          # Info, vote rail, sound, comments (native), CC, Fit/Fill
│       └── pulse.ts
└── tests/
    ├── unit/                   # Bun tests (routes, playback guard, extractor, bridge, teardown…)
    ├── fixtures/               # Mock Reddit page + test server
    └── *.spec.ts               # Playwright: lifecycle, audio focus, sizing, link cards, voting
```

---

## 🧪 Testing & development

```bash
bun install
bun test tests/unit      # unit tests
bun run test:e2e         # Playwright against the mock Reddit page
bun run build            # dist/reddit-reels.user.js (unminified, @license MIT)
```

The Playwright suite runs against `tests/fixtures/mock-reddit.html`, not the real Reddit player. Changes to playback, header placement or navigation should also be checked by hand on reddit.com, on both desktop and mobile.

---

## ⚠️ Known limits

- Reddit's header markup isn't a public API. If `#expand-user-drawer-button` / `#login-button` move, the toggle shows as a floating pill instead.
- Streamable / YouTube embeds have no bridge, so leaving their slide reloads them on return.
- If Reddit's player keeps forcing mute on its own, the script re-asserts your choice at most 3 times per slide, to avoid a tug-of-war loop.

---

## 📄 License

[MIT](LICENSE)
