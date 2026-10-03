# AGENTS.md

Guidance for agentic development on the **Reddit Reel Mode** userscript (`reddit-reels`).

---

## 🏛️ Architecture & Modularity

- **File Size & Decomposition**: Keep source files focused and under 150 lines where practical. Never create monolithic orchestrators.
  - `src/cards/`: Discussion text cards and external link preview cards (`text-card.ts`, `link-card.ts`).
  - `src/core/`: Feed-route matching and client-side navigation watching (`route.ts`), feed transformation (`feed-manager.ts`), input/touch controllers (`input-controller.ts`), centralized selector registry (`selectors.ts`), DOM state backup and restoration (`teardown-store.ts`), unconstrainer logic (`unconstrainer.ts`).
  - `src/extractor/`: `<shreddit-post>` DOM extraction, metadata parsing, and native vote proxying.
  - `src/media/`: Single-media audio mutex (`AudioManager`), active carousel slide tracking (`gallery-media.ts`), RedGifs iframe bridge (`redgifs-bridge.ts`), and video resolvers (`media/index.ts`).
  - `src/styles/`: Domain-specific stylesheets (`base`, `feed`, `cards`, `gallery`, `overlay`, `header`).
  - `src/ui/`: Header reel/list toggle (`header-toggle.ts`), overlay actions and author badges (`overlay.ts`), and pulse animations.
- **Work With Reddit, Not Against It**: The reel is Reddit's own feed restyled in place. There is no launcher button and no separate reel app.
  - Reel layout activates automatically on feed routes (`isReelRoute`) while the persisted preference (`@reddit-reels/enabled`) is on. It never runs on post pages, tool pages, or inside iframes.
  - Route changes come from `watchRoute` (Navigation API, wrapped `history.pushState/replaceState`, `popstate`, bfcache `pageshow`). Never rely on `popstate` alone; Reddit navigates with `pushState`.
  - The **window** is the scroller (`html { scroll-snap-type: y mandatory }`). Never turn `main` or any feed wrapper into a nested scroll container: it breaks Reddit's infinite loader, scroll restoration and Back.
  - Reddit's header stays visible (translucent, fixed). The reel/list toggle mounts into it next to `#expand-user-drawer-button` / `#login-button`, with a floating fallback.
  - Comments open Reddit's own post page by clicking the post's native full-post link (client-side navigation). Never iframe Reddit pages: the `?embedded=true` route serves old Reddit, and the script would run again inside the frame.
  - Reddit's native player control bar (seek, play, captions, fullscreen) must stay clickable; `InputController` lets taps on native controls through via `composedPath()`. Programmatic (`!isTrusted`) clicks are never intercepted.
- **No Inline Styles**: Avoid sprawling inline `element.style` modifications; prefer dedicated scoped CSS classes prefixed with `.rr-`.
- **Zero Runtime Dependencies**: The runtime bundle is 100% vanilla TypeScript / browser DOM without virtual DOM frameworks (no React/Preact) or heavy utilities. All UI elements are created directly via `document.createElement`.
- **Clean Teardown Contract**: Exiting Reel Mode must cleanly reverse all injected DOM (`.rr-post-overlay`, card containers, embedded iframes) and restore original dimensions/attributes bit-for-bit via `teardown-store.ts` without leaving native feeds collapsed or overlapped. All `rr` dataset flags must be deleted on exit.
- **Security & URL Protocol**: All outgoing URLs opened or assigned to anchors must pass `isSafeUrl()` / `sanitizeUrl()` allowing only `http:` and `https:`. All cross-frame `postMessage` listeners must validate `event.origin`.

---

## 🔊 Audio & Playback Contract

- **Single-Media Focus Rule**: Reddit's player owns decoding, buffering and its controls; `AudioManager` only enforces that exactly one post plays, at the user's mute/volume. Never write to the player custom element's own attributes/properties (`muted`, `volume`) and never overwrite a video's `src` while Reddit is still loading it (`video-hydrator.ts` is a delayed last resort).
- **Zero Audio Bleed**: Navigating between posts must immediately pause and mute all other media. Reddit's videos live in shadow roots that `document.querySelectorAll('video')` misses, so videos are tracked in a registry (`guardVideo`). A guarded non-active video that starts playing is paused again.
- **Native Control Sync**: A mute/volume change on the active video within 1.5s of a user gesture is adopted as the global preference (and emitted via `onChange`). A change without a gesture is the player resetting itself, and is reverted (max 3 times per slide).
- **Embed Parking**: Injected embeds start as `about:blank` with `data-rr-src` and load only when their post becomes active. Inactive embeds are paused through the RedGifs bridge when it reported `READY`, otherwise unloaded.
- **Active Slide Targeting**: In multi-video galleries/carousels, playback and audio state must target only the currently visible slide (`gallery-media.ts`). Non-target videos in the same container must remain paused.
- **Default State**: Audio begins unmuted by default unless explicitly toggled off by the user. Mute state persists across page reloads.
- **RedGifs & External Iframe Protocol**: RedGifs embed iframes (`https://*.redgifs.com/ifr/*`) run the userscript directly in their context. The `redgifs-bridge` synchronizes mute, volume, and playback in real-time via `postMessage` (`SET_AUDIO`, `PAUSE`, `PLAY`) and shared `GM_getValue` storage without mutating `iframe.src` (which avoids destructive reloading).

---

## 📐 Aspect Ratio & Media Sizing

- **Aspect Ratio Rule**: Use `(height / width) >= 1.5` as the threshold for vertical videos (`object-fit: cover`).
- **Meme Letterboxing**: Square (`1:1`) and `4:5` videos MUST use `object-fit: contain` to ensure text, titles, and bottom punchlines are never cropped.
- **Fit/Fill Toggle**: Allow users to toggle between contain and cover via the overlay action rail button or keyboard shortcut `F`.
- **Multi-Image Galleries**: Preserve horizontal swipe snapping (`scroll-snap-type: x mandatory`) and contain lightbox images. Do not inject destructive scroll containers into Reddit's native carousel `shadowRoot`; promote lazy images eagerly for active and adjacent slides only.
- **External Hosts**: RedGifs, Streamable, YouTube, and Gfycat must be classified as video embeds and rendered via responsive autoplaying iframes.

---

## 💬 Captions & Subtitles

- Subtitles and closed captions must be toggleable via the overlay `CC` button and keyboard shortcut `C`.
- State must persist in `localStorage` (`@reddit-reels/subtitles`) and be applied consistently across all video slides.

---

## 🛡️ Anti-Rate-Limit & DOM Synchronization

- **Zero External API Calls**: Do not make unauthenticated `.json` requests to Reddit endpoints (avoids 429 rate limits and Cloudflare challenges).
- **DOM Streaming**: Use incremental `MutationObserver` on the native feed to passively stream newly appended `<shreddit-post>` elements without re-processing existing elements.
- **Vote Delegation**: Proxy upvotes and downvotes directly to Reddit's native DOM buttons to preserve CSRF tokens, sessions, and karma safely. Sync state using retries to ensure optimistic vote states persist until native web components settle.

---

## 🎨 UI & Design Principles

- **Flat Minimalist AMOLED**: Maintain true black (`#000000`) and dark neutral surfaces (`#141518`, `#1c1d22`).
- **Centered Card Layout**: Always use symmetric container padding (`padding: 16px` mobile, `32px` desktop) and `margin: 0 auto` on cards so discussion/link cards are centered horizontally and vertically.
- **CSS Selector Scoping**: Never write `:not(html.rr-active) .selector` (ancestors like `body` override active styles due to specificity). Prefer default-hidden `.selector { display: none !important; }` and active `.rr-active .selector { display: flex !important; }`.
- **Touch & Mobile Ergonomics**: Respect mobile safe areas (`env(safe-area-inset-*)`). Ensure all tap targets are at least `44x44px`.
- **Gesture Controls**:
  - Single tap: Play / Pause toggle routed through `AudioManager.togglePlayback(post)`.
  - Double tap: Upvote the tapped reel post directly.
  - Vertical swipe: Snap to next/previous reel slide.
  - Horizontal swipe: Multi-image carousel navigation.

---

## 🧪 Testing & Verification

- **Test Directory**: All unit tests MUST live outside `src/`, in `tests/unit/`.
- **Run Unit Tests**:
  ```bash
  bun test tests/unit
  ```
- **Build Verification**:
  ```bash
  bun run build
  ```
- **Build Output**: Ensure `dist/reddit-reels.user.js` builds cleanly with `// @license MIT` in the userscript header.
- **GreasyFork Compliance & Formatting**: The userscript bundle must be completely unminified (`minify: false`, `cssMinify: false` in `vite.config.ts`) and unobfuscated to comply with GreasyFork transparency rules. Userscript metadata must specify a comprehensive `@description`, `@homepage`, `@supportURL`, and `@license MIT`.
