# Project: GlideVideo

## Overview
GlideVideo is a mobile-friendly userscript designed to add touch gestures and a floating controller overlay to HTML5 video players on mobile browsers. It is built using TypeScript, Vite, and `vite-plugin-monkey` for deployment as a Greasemonkey/Tampermonkey userscript. The entry point is `src/index.ts`.

## Structure
```
src/
├── config.ts               # Central constants (offsets, speeds, timeouts, thresholds)
├── index.ts                # Minimal bootstrap package entry point
├── utils.ts                # Consolidated pure utilities (math, DOM helpers, haptics, debounce)
├── core/
│   ├── Controller.ts       # Coordinator initializing sub-systems
│   └── StateStore.ts       # Central settings & active video state store with window unload listeners
├── events/
│   └── EventBus.ts         # Pub/Sub communications broker
├── gestures/
│   ├── PressDetector.ts    # Touch longpress playback booster
│   ├── SwipeDetector.ts    # Horizontal seeking and pinch zoom transforms
│   └── DoubleTapDetector.ts # Touch double-tap to skip forward/backward & fullscreen blocking
├── ui/
│   ├── UIManager.ts        # Overlay layout placement & visibility fader
│   ├── components/         # Reusable widgets (Switch, Stepper, Slider, SegmentedControl)
│   ├── panels/             # Panel cards (SpeedStepper, SettingsSheet)
│   └── styles/
│       └── css.ts          # Injected stylesheet styles
└── video/
    ├── PreloadEngine.ts    # Progressive seek-pump buffering engine
    ├── VideoTracker.ts     # Mutation/Shadow DOM active video detection
    └── VideoTransform.ts   # Canvas aspect ratio/scaling & speed/skips controller
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
- **Target Video Selection**: Avoids injecting on small, muted, or preview videos (e.g. height < 130px and muted, or nested in anchors `<a>`).
- **Z-Index Handling**: UI components use `z-index: 2147483647` to overlay standard video player elements and native full-screen wrapper containers.
- **Transform Override**: The zoom/rotation features modify the video element's styling directly, prepended by any original style attributes found in the video's dataset.

## Insights
- Monkey-patched `attachShadow` is used to intercept dynamically created shadow host nodes and traverse open shadow roots recursively for video elements.
- Gestures use explicit class properties to cancel active pointer events/intervals and prevent collisions between seeks, pinch-zooms, and speed-boosts.
- Picture-in-Picture (PiP) support is dynamically evaluated and displayed if supported by the browser (handling both standard HTML5 PiP and iOS Safari presentation modes).
- Preventing native site fullscreen on double-tap: Capture phase pointerdown/pointerup/click/dblclick events are cancelled (`preventDefault`, `stopPropagation`) when the gesture is detected, blocking site scripts from receiving the second tap.

## Blunders
- **Early Exit Video Check**: Exiting early in `safeInit` if no video exists breaks pages loading videos dynamically (e.g. YouTube/Twitter SPAs). Fixed by deferring initialization until a video is detected via a lightweight observer.
- **Event Listener Cleanup**: An AbortController is now used to automatically clean up all global event listeners (window/document) when a new SPA navigation re-evaluates the script, preventing closure leaks.
- **Coupled controls.ts file**: Keeping a flat root `controls.ts` created tight coupling where the controller grabbed panel buttons. Fixed by distributing interaction logic to `ControlPanel` and global visibility triggers to `UIManager`.
- **Private store fields**: Making the StateStore parameter `private` in `UIManager` caused TS compiler visibility warnings when UI panels accessed it. Fixed by keeping the property `public`.
- **Settings Sheet Pointer Events Override**: Inline style assignment for `pointerEvents = 'auto'` overrode the `pointer-events: none` CSS class of the hidden settings sheet. Fixed by removing inline assignment.
- **Settings Sheet Landscape Overflow**: The settings sheet overflowed the viewport bottom in landscape mode. Fixed by applying a flex scrollable container, a dynamic max-height, and a landscape media query.
- **Gesture Overlay Repositioning**: The gesture feedback overlay was originally centered on the screen, blocking user view and subtitles. Fixed by placing it at the top center using a sleek, minimal glassmorphic pill matching the stepper pill.
- **Verbose Gesture Feedback**: Gesture labels contained wordy prefixes like "Speed" or "Zoom:". Fixed by simplifying to wordless formats (e.g. `2x`, `150%`, and compact signed offsets like `+15s`).
- **Playback Speed Resetting**: Previously, the speed state (`lastRate`) was saved in `sessionStorage` (lost on tab close/suspend) and was ignored on new video loads, blindly defaulting new videos to `1.0`. Fixed by storing speed preferences in `localStorage` and initializing new videos with the last remembered speed, while deleting the dead `applyDefaultSpeed` helper.
- **Double Tap Fullscreen Reparenting**: The new double tap container was not being reparented during fullscreen changes. Fixed by adding `doubleTapContainer` to `uiElements` in `onFullScreenChange`.
- **Swipe Scroll & Collision Interference**: Active swipes for seeking/volume triggered page scroll or collided with long-press speed boosts/taps. Fixed by setting target `touchmove` as `{ passive: false }` to `preventDefault()` when committed, and adding `isVolumeControlling` guard checks.
- **Double-Tap Dark D-Shape Overlay**: The double-tap skip panel had a dark semi-transparent D-shaped background (`rgba(0,0,0,0.28)` + curved `border-radius`) covering half the video. Fixed by removing the background and border-radius entirely, replacing with a compact inline glassmorphic pill (`mvc-doubletap-inner`) wrapping only the text+chevrons.
- **Chevron Layout & Flicker**: Chevrons were stacked above the number (`flex-direction: column`) instead of inline. Animation used `opacity 0→1→0` + `translateX` jitter on a 0.75s loop causing flicker. Fixed by switching to horizontal `flex-direction: row` layout (text + chevrons side by side) and replacing with a smooth opacity-only wave (`0.3→1→0.3`) on a 1s cycle.
- **Dead Ripple Code**: The `mvc-doubletap-ripple` CSS and JS spawn code remained after previous UI simplification attempts. Fully removed from both `css.ts` and `UIManager.ts`.
- **Duplicated Gesture Helpers**: `_isTouchInRect`/`_isTouchOnUI` were independently implemented in all 3 gesture detectors (DoubleTap, Press, Swipe). Consolidated into shared `isPointInRect`/`isPointOnUI` in `utils.ts`. Also moved `formatDuration`/`formatDelta` from SwipeDetector to `utils.ts`.
- **Shadow State in SwipeDetector**: `isSwipeSeekingState`/`isPinchingGestureState` duplicated `store.isSwipeSeeking`/`store.isPinching` and dead public getters `isSwipeSeeking()`/`isPinchingGesture()` were never called. Removed all shadow state.
- **VolumeBar Leaked on Destroy**: `Controller.destroy()` cleaned up all UI elements except `volumeBar`. Added missing `.remove()` call.
- **Failing Tests after Getter Removal**: Removing dead getters in SwipeDetector broke assertions in SwipeDetector.test.ts. Fixed by updating the tests to assert against state store properties directly.
- **Overriding Stylesheet Sizing/Centering**: Unconditionally applying default `scale(1) rotate(0deg)` transforms overrode website stylesheet transforms. Fixed by only applying inline styles if settings are non-default.
- **Ineffective Preloading**: `triggerEnhancedPreload` only set `preload="auto"` (browser hint, ignored on mobile), did a silent play-pause (fills ~5s buffer then stops, triggers site analytics), and patched global `Hls.DefaultConfig` (doesn't affect existing instances). Replaced with a progressive seek-pump that walks `currentTime` forward in 30s jumps while paused, forcing the browser to fetch each segment. Abortable via `preloadAbort` AbortController.
- **Portrait mode gesture restriction**: All swiping, double-tapping, and long-pressing gestures are blocked in portrait/vertical orientation unless the video is in fullscreen, preventing scroll hijacking on video feeds/pages with multiple inline videos.
- **Long-press speed boost sensitivity**: A tight 10px wobble threshold caused natural finger holding to cancel the long-press speed boost. Fixed by increasing the tolerance to 24px and explicitly cancelling the boost via EventBus when a swipe gesture is committed.
- **Dead config constants**: 9 unused constants lingered in `config.ts` (`DEFAULT_RIGHT_OFFSET`, `UI_TALL_VIDEO_OFFSET`, `DRAG_THRESHOLD`, `DEFAULT_SNAP_POINTS`, `SNAP_THRESHOLD`, `SNAP_STRENGTH`, `SPEED_TOAST_FADE_DELAY`, `INTERSECTION_THROTTLE_MS`, `TIMEUPDATE_THROTTLE_MS`). Removed.
- **Dead state & events**: `longPressDirection` in StateStore and `ui:menu-opened-closed` event (typed, emitted, never listened to) were dead code. Removed from StateStore, EventBus, and UIManager.
- **Scroll tracking only checked overflowY**: `findScrollableParents` in VideoTransform missed horizontal scroll containers. Added `overflowX` check.
- **Unbatched layout read in onViewportChange**: `ensureUIInViewport` was called directly from scroll handlers outside rAF. Restructured to only call it as fallback when no active video.
- **attachShadow patch leaked on destroy**: `patchAttachShadow` in VideoTracker overwrote `Element.prototype.attachShadow` but `destroy()` never restored the original. Fixed by storing the original and restoring on cleanup.
- **Missing Test Suites**: Major modules (`VideoTransform`, `VideoTracker`, `PreloadEngine`, and `Controller`) had no tests. Wrote 4 new test suites, increasing the regression test suite from 65 to 91 passing cases.

