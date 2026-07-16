# Project: GlideVideo

## Overview
GlideVideo is a mobile-friendly userscript designed to add touch gestures and a floating controller overlay to HTML5 video players on mobile browsers. It is built using TypeScript, Vite, and `vite-plugin-monkey` for deployment as a Greasemonkey/Tampermonkey userscript. The entry point is `src/index.ts`.

## Structure
```
src/
├── config.ts               # Central constants (offsets, speeds, timeouts, thresholds)
├── index.ts                # Minimal bootstrap package entry point
├── types.d.ts              # Global augmentations (GM_* functions, webkit fullscreen/PiP APIs)
├── utils.ts                # Consolidated pure utilities (math, DOM helpers, haptics, debounce)
├── core/
│   ├── Controller.ts       # Coordinator initializing sub-systems
│   └── StateStore.ts       # Central settings & active video state store with window unload listeners
├── events/
│   └── EventBus.ts         # Pub/Sub communications broker (typed MvcEvents map)
├── gestures/
│   ├── GestureCoordinator.ts # Token-based exclusive gesture lock arbiter
│   ├── PressDetector.ts    # Touch longpress playback booster
│   ├── SwipeDetector.ts    # Seek/volume/brightness swipes and pinch zoom
│   └── DoubleTapDetector.ts # Touch double-tap to skip forward/backward & fullscreen blocking
├── ui/
│   ├── UIComponent.ts      # Abstract base for UI widgets (dom getter, render/update contract)
│   ├── UIManager.ts        # Overlay layout placement & visibility fader
│   ├── icons.ts            # SVG path registry + builder
│   ├── components/         # Reusable widgets (Switch, Stepper)
│   ├── panels/             # Panel cards (SpeedStepper, SettingsSheet)
│   └── styles/
│       └── css.ts          # Injected stylesheet styles
└── video/
    ├── VideoAdapter.ts     # Site-specific video filtering (Generic + YouTube adapters)
    ├── VideoTracker.ts     # Mutation/Shadow DOM active video detection
    └── VideoTransform.ts   # Aspect ratio/zoom styling, rate/skip/play-pause actions, UI positioning
```

## Conventions
- **Pub/Sub decoupling**: Components and views emit events on the `EventBus` to prevent tight cross-linking.
- **Self-contained Panel Views**: UI panels manage their own local gestures/listeners (e.g. spaced speed stepper, settings button).
- **CSS Injection**: Styles are written as template literal CSS in `src/ui/styles/css.ts` and loaded dynamically.
- **Single Source of Version**: Version and description are loaded dynamically from `package.json` inside `vite.config.ts` to prevent DRY violations.

## Dependencies & Setup
- Package Manager: `bun`
- Key Commands:
  - `bun install` - Install dependencies
  - `bun run dev` - Run Vite development server
  - `bun run build` - Compile target userscript to `dist/glidevideo.user.js`
  - `bun run tsc` - Run TypeScript compiler checks
  - `bun run test` - Run Vitest regression tests

## Critical Information
- **Target Video Selection**: Avoids injecting on small, muted, or preview videos (thresholds live in `config.ts`: `SMALL_MUTED_VIDEO_HEIGHT`, `LINKED_VIDEO_MIN_WIDTH/HEIGHT` for videos nested in anchors `<a>`).
- **Z-Index Handling**: UI components use `z-index: 2147483647` to overlay standard video player elements and native full-screen wrapper containers.
- **Transform Override**: The zoom feature modifies the video element's inline style directly, preserving and restoring the element's original transform/objectFit via per-video metadata.

## Insights
- Monkey-patched `attachShadow` is used to intercept dynamically created shadow host nodes and traverse open shadow roots recursively for video elements. Pre-init discovery of a shadow-root video emits `controller:init-requested` on the EventBus, which Controller subscribes to (do NOT emit UI events for this — UIManager no-ops before init).
- Centralized GestureCoordinator: Token-based exclusive lock arbiter. All `acquire()` calls must check return value and bail on `false`. Use targeted `release()` calls not `reset()`.
- Per-Video Metadata WeakMap: All video metadata stored in `WeakMap<HTMLVideoElement, VideoMetadata>` inside StateStore. No DOM sync — tests read from `store.getVideoMetadata()` directly.
- Preventing native site fullscreen on double-tap: Capture phase pointerdown/pointerup/click/dblclick events are cancelled (`preventDefault`, `stopPropagation`) when the gesture is detected, blocking site scripts from receiving the second tap.
- Site-level Enable/Disable Menu Command: Users can toggle the userscript on/off per domain using GM menu commands stored via cross-site GM storage, which reloads the page to apply the active/inactive state.
- Storage goes through private `storageGet`/`storageSet` helpers: cross-site GM storage (GM_getValue/GM_setValue) first, localStorage fallback for iframe storage restrictions.
- Picture-in-Picture (PiP) support is dynamically evaluated and displayed if supported by the browser (handling both standard HTML5 PiP and iOS Safari presentation modes).
- VideoAdapter Interface: GenericAdapter base + YoutubeAdapter extends it for YouTube-specific selectors. Factory `getVideoAdapter()` selects based on hostname. Ad detection uses broad class/id wildcard selectors.
- Bundle Dead Code Elimination: Vite `define` replaces `process.env.VITEST` so test-only bypasses are stripped from production builds.
- UIManager global activity listeners (`pointerdown`/`keydown`/`touchstart` → `lastRealUserEvent`) must be capture-phase: UI elements call `stopPropagation()` via `preventPropagation()`, which blocks bubble-phase window listeners.
- Shadow DOM Path Traversal: When videos are nested inside a shadow root, `getVideoDomPath` traverses up via `parentNode.host` to build a stable hierarchical selector path.


## Blunders
- **Early Exit Video Check**: Exiting early in `safeInit` if no video exists breaks SPAs (e.g. YouTube). Fixed by deferring initialization until a video is detected via a lightweight observer.
- **Event Listener Cleanup**: All global listeners must be registered under an `AbortController` signal to prevent memory/closure leaks during SPA page transitions.
- **Settings Sheet Landscape Overflow**: Viewport bottom overflows in landscape mode. Fixed by applying a flex scrollable container, dynamic max-height, and a landscape media query.
- **Playback Speed & Time Persistence**: Speeds are stored in `localStorage` to persist across sessions, whereas Zoom and Ratio transforms are session-only to prevent unexpected zooming on new video loads. Playback position is persisted via a throttled `timeupdate` handler.
- **Double Tap Fullscreen Reparenting**: Fullscreen state transitions require reparenting overlay containers to the active fullscreen element.
- **Swipe Scroll passive Touch Handler**: Standard touchmove events for gestures must use `{ passive: false }` to allow `preventDefault()` and prevent page scrolling.
- **Overriding Stylesheet Sizing**: Direct inline assignment of `scale(1) rotate(0deg)` to video elements overrides custom website styles. Apply inline transforms only if settings deviate from defaults.
- **Ineffective Preloading**: An aggressive background seek-pump was implemented to force mobile preloading, but it was completely removed to avoid excessive mobile data usage and page script conflicts.
- **Portrait Mode Gesture Restriction**: Swipes, double-taps, and long-presses must be ignored in portrait orientation unless fullscreen, preventing scroll hijacking on scrollable pages.
- **Long-Press Boost Wobble Tolerance**: A finger hold naturally wobbles; the boost threshold was increased to 24px tolerance to prevent accidental cancellations.
- **attachShadow leaks**: Monkey-patched `Element.prototype.attachShadow` must be cached and restored on destroy.
- **Volume Boost Removed (v6.5.0)**: >100% amplification via `createMediaElementSource`/`GainNode` was removed entirely. Capturing a media element reroutes it off Android's deep-buffer media path (bypassing OEM loudness DSP → audio sounds ~half as loud even at gain 1.0), the capture is irreversible per element, gain >1.0 mostly clips instead of getting louder, and it failed under CORS anyway. Volume gesture now just sets `video.volume` (0–1.0); no Web Audio, no `AudioManager`.
- **Edge Touch Protection**: Swipes starting within 18px of the screen borders must be ignored to prevent conflicts with native back/forward swipe navigation.
- **Collapsible Top-Right Controls**: Aspect ratio, lock, PiP, and settings buttons are grouped inside a collapsible flex row. The row automatically collapses when the main UI fades out or after 4 seconds of inactivity. During screen locks, the collapse arrow is hidden, and the lock button is forced visible at the top-right corner (`right: 16px`).
- **Consolidated SVG Icons**: Extracted all raw SVG path strings and element builder logic from `UIManager.ts` into a standalone modular `icons.ts` file, improving file readability and asset maintainability.
- **Playback Replay**: Calling `.play()` on ended video elements requires rewinding `currentTime` to 0.
- **Playback Rate Fighting**: The `ratechange` event is queued asynchronously, so using synchronous boolean flags like `_isInternalRateChange` is vulnerable to race conditions; comparing against the last internal rate (`meta.lastRate` in the per-video metadata WeakMap) directly is more robust. `_rateOverrideCount` caps override retries at 3 before yielding to the site; it is stored per-video in `VideoMetadata` to prevent a rate-override block from carrying over to other videos.
- **Lock Shield Layout**: Overlays using absolute positioning inside a collapsed relative container will also collapse. Use `position: fixed` and copy the video's bounding rect coordinate values to it.
- **Passive touchstart preventDefault**: `window.addEventListener('touchstart')` is passive by default on mobile browsers. Use `{ passive: false }` to allow `preventDefault()` to suppress browser pinch-zooming.
- **Stable Video ID fallback**: `window.location.href.split('#')[0]` breaks hash-routed SPAs and DOM indexes shift. Strip query parameters using `URLSearchParams` on search/hash and build CSS-like paths for stable IDs.
- **Numeric Video ID LRU Eviction**: Pure numeric video IDs are sorted numerically rather than by insertion order. Fixed by prefixing keys in `positions` with `_` to guarantee insertion-order based LRU eviction, while maintaining backward compatibility.
- **Background Playback Scroll Jump**: Active video restored to saved position rewinds currentTime if background progress is already ahead. Fixed by only updating currentTime if current progress is behind the saved position.

