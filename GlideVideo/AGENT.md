# AGENT — GlideVideo

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
│   ├── components/         # Reusable widgets (Switch, Stepper, ProgressBar)
│   ├── panels/             # Panel cards (SpeedStepper, SettingsSheet)
│   └── styles/
│       └── css.ts          # Token system + the three themes, injected as one stylesheet
└── video/
    ├── VideoAdapter.ts     # Site-specific video filtering (Generic + YouTube adapters)
    ├── VideoTracker.ts     # Mutation/Shadow DOM active video detection
    └── VideoTransform.ts   # Aspect ratio/zoom styling, rate/skip/play-pause actions, UI positioning
```

## Conventions
- **Pub/Sub decoupling**: Components and views emit events on the `EventBus` to prevent tight cross-linking.
- **Self-contained Panel Views**: UI panels manage their own local gestures/listeners (e.g. spaced speed stepper, settings button).
- **CSS Injection**: Styles are written as template literal CSS in `src/ui/styles/css.ts` and loaded dynamically.
- **Themes are token blocks, nothing else**: Every visual value is a `--mvc-*` custom property; components read tokens and never reference a theme selector. A theme is ~30 lines of tokens. `applyTheme()` sets `data-mvc-theme` on `<html>` — the one ancestor shared by the overlays, which are scattered across `document.body` and the fullscreen element. Adding a fourth theme is a token block plus an entry in `MVC_THEMES`.
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
- Straight Line Scrubber (ProgressBar.ts): Lightweight CSS-based progress bar positioned in the top header row. Features active fill line, loaded buffer line, draggable thumb, and floating timestamp preview badge on touch drag. Controlled by `progressBarEnabled` toggle switch in Settings.
- Centralized Configuration (config.ts): All timeouts, layout dimensions, gesture thresholds, speed boundaries, stepper steps, FAB loop ranges, and storage/eco settings are centralized in `src/config.ts` (`MVC_CONFIG`) as the single source of truth.
- Speed Control Modes (SpeedStepper.ts): Dual mode speed control supporting standard Stepper Pill (`[-] 1.00x [+]`) and Minimal Speed FAB (`1.0x` circular button with `0.5x` -> `2.0x` -> `0.5x` loop cycling, long press reset to 1.0x). Controlled by `minimalSpeedFab` toggle switch in Settings.
- EventBus Unsubscribers in UI Components: UI components store returned `EventBus.on` unsubscriber functions in an array and execute them during `destroy()` to guarantee zero event listener leaks.
- Left-Hand Mode (UIManager.ts, SwipeDetector.ts): Sets `data-mvc-left-hand="true"` on `document.documentElement` for CSS top-bar flex reversal (`row-reverse`) and swaps volume/brightness rails and gesture sides.

## Blunders
- **Active-video re-evaluation must be event-driven, not one-shot**: `evaluateActive()` rejects videos on size, visibility and muted-ness — all of which change after the first pass. IntersectionObserver does *not* fire again when an element merely resizes or unmutes, so a video rejected at `INITIAL_EVAL_DELAY` was never reconsidered and the overlay never appeared until a page refresh. Fixed by routing every tracked video through `watchVideo()`/`unwatchVideo()`, which register an IntersectionObserver, a shared ResizeObserver, and capture-phase `play`/`loadedmetadata`/`volumechange` listeners together so they cannot drift apart. Media events do not bubble, so a delegated listener on an ancestor will not work.
- **Debounce starvation**: `debounce()` takes a `maxWait`; without it a page that mutates continuously (ad reloads, live chat) resets the timer forever and the trailing call never runs.
- **Rotation needs a fit-scale, not just a rotate**: `rotate(90deg)` alone turns a letterboxed portrait strip into a letterboxed landscape strip — strictly worse. `getRotationFitScale()` derives the extra scale from the intrinsic aspect vs the box aspect. It depends on `videoWidth`/`videoHeight`, so it must be recomputed on `loadedmetadata` and on every ResizeObserver tick.
- **`el.isConnected === false` is not `!el.isConnected`**: the mutation walk deliberately skips only *explicitly* disconnected nodes; loosening it to a falsy check drops nodes whose `isConnected` is merely undefined.
- **Every overlay lives outside `wrap`**: eight of them are appended straight to the fullscreen container, so each one has to be listed by hand in *both* `VideoTransform.onFullScreenChange()` (reparent) and `Controller.destroy()` (remove). `frameEl` was missing from both — the Frame theme's brackets were left behind in the old container on entering fullscreen, and leaked a node on re-injection. Adding a ninth overlay means editing both lists; collapsing them into one container would remove the whole class of bug.
- **Chrome must fade like chrome**: anything drawn over the picture permanently reads as distraction, however subtle. The Frame brackets are toggled with the controls via a `visible` class rather than left on.
- **Early Exit Video Check**: Exiting early in `safeInit` if no video exists breaks SPAs (e.g. YouTube). Fixed by deferring initialization until a video is detected via a lightweight observer.
- **Event Listener Cleanup**: All global listeners must be registered under an `AbortController` signal to prevent memory/closure leaks during SPA page transitions.
- **Settings Sheet Landscape Overflow**: Viewport bottom overflows in landscape mode. Fixed by applying a flex scrollable container, dynamic max-height, and a landscape media query.
- **Playback Speed & Time Persistence**: Speeds are stored in `localStorage` to persist across sessions, whereas Zoom and Ratio transforms are session-only to prevent unexpected zooming on new video loads. Playback position is persisted via a throttled `timeupdate` handler.
- **Double Tap Fullscreen Reparenting**: Fullscreen state transitions require reparenting overlay containers to the active fullscreen element.
- **Swipe Scroll passive Touch Handler**: Standard touchmove events for gestures must use `{ passive: false }` to allow `preventDefault()` and prevent page scrolling.
- **Overriding Stylesheet Sizing**: Direct inline assignment of `scale(1) rotate(0deg)` to video elements overrides custom website styles. Apply inline transforms only if settings deviate from defaults.
- **Portrait Mode Gesture Restriction**: Swipes, double-taps, and long-presses must be ignored in portrait orientation unless fullscreen, preventing scroll hijacking on scrollable pages.
- **Long-Press Boost Wobble Tolerance**: A finger hold naturally wobbles; the boost threshold was increased to 24px tolerance to prevent accidental cancellations.
- **attachShadow leaks**: Monkey-patched `Element.prototype.attachShadow` must be cached and restored on destroy.
- **Edge Touch Protection**: Swipes starting within 18px of the screen borders must be ignored to prevent conflicts with native back/forward swipe navigation.
- **Playback Replay**: Calling `.play()` on ended video elements requires rewinding `currentTime` to 0.
- **Playback Rate Fighting**: The `ratechange` event is queued asynchronously, so using synchronous boolean flags like `_isInternalRateChange` is vulnerable to race conditions; comparing against the last internal rate (`meta.lastRate` in the per-video metadata WeakMap) directly is more robust. `_rateOverrideCount` caps override retries at 3 before yielding to the site; it is stored per-video in `VideoMetadata` to prevent a rate-override block from carrying over to other videos.
- **Lock Shield Layout**: Overlays using absolute positioning inside a collapsed relative container will also collapse. Use `position: fixed` and copy the video's bounding rect coordinate values to it.
- **Passive touchstart preventDefault**: `window.addEventListener('touchstart')` is passive by default on mobile browsers. Use `{ passive: false }` to allow `preventDefault()` to suppress browser pinch-zooming.
- **Stable Video ID fallback**: `window.location.href.split('#')[0]` breaks hash-routed SPAs and DOM indexes shift. Strip query parameters using `URLSearchParams` on search/hash and build CSS-like paths for stable IDs.
- **Numeric Video ID LRU Eviction**: Pure numeric video IDs are sorted numerically rather than by insertion order. Fixed by prefixing keys in `positions` with `_` to guarantee insertion-order based LRU eviction, while maintaining backward compatibility.
- **Standalone Video Page Layout Collapse**: Setting `container.style.position = 'relative'` on `document.body` breaks browser UA stylesheets on direct video URLs (`.mp4`), collapsing absolute-positioned videos to 0 height. Fixed by skipping `position: relative` assignment when `container` is `document.body` or `document.documentElement`.
- **Media Event Listener Cleanup in VideoTransform**: `destroy()` and `onActiveVideoChanged()` must clean up the complete array of video events (`ended`, `play`, `pause`, `ratechange`, `click`, `timeupdate`, `durationchange`, `progress`, `seeking`, `seeked`) to prevent listener leaks across SPA video changes.
- **Pointer Capture Freeze & EventBus Array Splice**: `lostpointercapture` must be handled during touch scrubbing to prevent `isDragging` state from freezing progress bar updates on system popups/gestures. In `EventBus`, use in-place `splice` for unsubscribing to guarantee clean removal without generic type mismatches.
- **Paused Ratechange Loop**: Mutating `video.playbackRate` on `ratechange` while `video.paused` is true forces mobile browsers to unpause playback. Fixed by checking `if (!video.paused)` before executing rate overrides on `ratechange`.
