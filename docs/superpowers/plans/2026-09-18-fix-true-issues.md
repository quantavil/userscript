# Implementation Plan: Fix Verified Issues in GlideVideo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 18 verified true bugs, edge cases, and accessibility/UX defects identified in GlideVideo across tracker, lifecycle, positioning, settings, accessibility, and UI systems without introducing regressions.

**Architecture:** 
- Fix tracker Shadow DOM traversal (`nodeType` checks), visibility observation (`MutationObserver` attributes), and active video fast-path validation (`evaluateActive`).
- Implement video source change detection (`loadstart`/`emptied`), timer cancellation on destroy, overlay resetting on detachment, and volatile CDN query param stripping in URL key generation.
- Position the top bar relative to the active video bounding box for inline players.
- Upgrade UI components with proper WAI-ARIA roles (`switch`, `slider`, `button`), keyboard interactions (`Enter`, `Space`, arrows), `:focus-visible` styling, reduced-motion overrides, and unified SVG iconography.

**Tech Stack:** TypeScript, Bun, Vitest, Vite, Biome, DOM / Web APIs (MutationObserver, ResizeObserver, IntersectionObserver, WAI-ARIA).

**Spec:** Review findings audit in `<USER_REQUEST>` covering 18 verified true issues.

## Global Constraints
- Target builds: Userscript (`dist/glidevideo.user.js`) and Firefox MV3 Extension (`dist-extension/`).
- Zero build errors: `bun run tsc`, `bun run test`, `bun run lint`, `bun run build`.
- Maintain complete backwards compatibility for existing settings and gestures.

---

### Task 1: Video Tracker & Shadow DOM Traversal Fixes (Issues 2, 3, 6)

**Files:**
- Modify: `src/video/VideoTracker.ts`
- Test: `tests/VideoTracker.test.ts`
- Test: `tests/VideoTracker.reeval.test.ts`

**Interfaces:**
- `VideoTracker.observeShadowRoots(root: Node | ShadowRoot): void`
- `VideoTracker.evaluateActive(): void`

- [ ] **Step 1: Write failing tests for Shadow DOM traversal, visibility fast-path re-check, and attribute mutations**

Add tests in `tests/VideoTracker.test.ts`:
1. `observeShadowRoots(document)` traverses into elements when document has `nodeType === 9` and shadowRoot has `nodeType === 11`.
2. `evaluateActive()` rejects an active video if its computed visibility becomes `hidden` or if `shouldIgnoreVideo` returns true.
3. Attribute changes (`style`, `class`, `hidden`) trigger re-evaluation.

- [ ] **Step 2: Run tests to verify failures**

Run: `bun test tests/VideoTracker.test.ts`

- [ ] **Step 3: Implement fixes in `VideoTracker.ts`**

1. In `observeShadowRoots(root: Node | ShadowRoot)`:
   Support `DOCUMENT_NODE (9)` and `DOCUMENT_FRAGMENT_NODE (11)` by walking their `childNodes`. When visiting `ELEMENT_NODE (1)`, check `el.shadowRoot` and recursively walk it.
2. In `evaluateActive()` fast-path:
   Verify `getComputedStyle(v).visibility !== "hidden"`, `!this.adapter.shouldIgnoreVideo(v)`, `r.height >= MVC_CONFIG.MIN_VIDEO_HEIGHT`, `r.width * r.height >= MVC_CONFIG.MIN_VIDEO_AREA`, and `!(r.height < MVC_CONFIG.SMALL_MUTED_VIDEO_HEIGHT && v.muted)`.
3. In `setupObservers()`:
   Observe attributes with `attributeFilter: ["style", "class", "hidden"]` on `root`. In `handleMutation()`, call `this.debouncedEvaluate()` when relevant attributes mutate.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/VideoTracker.test.ts tests/VideoTracker.reeval.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/video/VideoTracker.ts tests/VideoTracker.test.ts
git commit -m "fix(tracker): fix shadow DOM walk, visibility checks, and attribute observation"
```

---

### Task 2: Video Lifecycle, Source Swaps & Cleanup (Issues 4, 7, 8)

**Files:**
- Modify: `src/video/VideoTracker.ts`
- Modify: `src/video/VideoTransform.ts`
- Modify: `src/core/Controller.ts`
- Modify: `src/core/StateStore.ts`
- Test: `tests/Controller.test.ts`
- Test: `tests/VideoTransform.test.ts`

**Interfaces:**
- `EventBus` event `"video:source-changed"`: `{ video: HTMLVideoElement, src: string }`
- `Controller.destroy(): void`
- `VideoTransform.onActiveVideoChanged(v: HTMLVideoElement | null): void`

- [ ] **Step 1: Write failing tests for source swap reset, timer destruction, and lock shield cleanup**

Add tests:
1. When `src` changes on an active video, transforms reset and new position is restored.
2. `Controller.destroy()` clears all active timers in `store.timers` and cancels debounced evaluate.
3. When `activeVideo` becomes `null`, `lockShield` and `brightnessOverlay` are hidden and reset.

- [ ] **Step 2: Run tests to verify failures**

Run: `bun test tests/Controller.test.ts tests/VideoTransform.test.ts`

- [ ] **Step 3: Implement fixes**

1. In `VideoTracker.ts`:
   Add `"loadstart"` and `"emptied"` to `REEVALUATE_ON`. Listen for source changes on active video and emit `"video:source-changed"`.
2. In `VideoTransform.ts`:
   Subscribe to `"video:source-changed"`. On source change, reset `meta.transform` to default, update `store.settings.transform`, emit `"video:transform-need-update"`, and invoke position restore for the new source.
   When `v === null` in `onActiveVideoChanged`, immediately hide `this.ui.lockShield`, reset `this.ui.brightnessOverlay.style.opacity = "0"`, and unlock if locked.
3. In `Controller.ts:destroy()`:
   Iterate and clear all timers in `this.store.timers`:
   ```ts
   Object.keys(this.store.timers).forEach((k) => {
       clearTimeout(this.store.timers[k]);
       clearInterval(this.store.timers[k]);
       delete this.store.timers[k];
   });
   ```
   Cancel `this.videoTracker.debouncedEvaluate`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/Controller.test.ts tests/VideoTransform.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/video/VideoTracker.ts src/video/VideoTransform.ts src/core/Controller.ts src/core/StateStore.ts tests/Controller.test.ts tests/VideoTransform.test.ts
git commit -m "fix(lifecycle): handle video source swaps, clear all timers on destroy, reset lock shield"
```

---

### Task 3: URL Key Sanitization & Full Reset All (Issues 9, 10)

**Files:**
- Modify: `src/core/StateStore.ts`
- Modify: `src/ui/panels/SettingsSheet.ts`
- Test: `tests/StateStore.test.ts`
- Test: `tests/SettingsSheet.test.ts`

**Interfaces:**
- `StateStore.clearDomainSpeed(): void`
- `StateStore.clearAllVideoPositions(): void`
- `cleanUrl(urlStr: string): string`

- [ ] **Step 1: Write failing tests for volatile CDN param stripping and complete settings reset**

1. In `tests/StateStore.test.ts`: verify `cleanUrl` removes volatile parameters: `v-acctoken`, `rnd`, `token`, `expires`, `sig`, `signature`, `hmac`, `auth`.
2. In `tests/SettingsSheet.test.ts`: verify clicking "Reset all" also removes `mvc_lastRate`, `mvc_lastRate_<domain>`, and clears `mvc_positions`.

- [ ] **Step 2: Run tests to verify failures**

Run: `bun test tests/StateStore.test.ts tests/SettingsSheet.test.ts`

- [ ] **Step 3: Implement cleanUrl and Reset All enhancements**

1. In `StateStore.ts`:
   Extend `cleanUrl` to strip volatile parameters: `["t", "time", "start", "position", "seek", "v-acctoken", "rnd", "token", "expires", "sig", "signature", "hmac", "auth", "key", "expire", "wsAbg", "wsiphost", "_"]`.
   Add helper methods `clearDomainSpeed()` and `clearAllVideoPositions()`.
2. In `SettingsSheet.ts`:
   In `buildResetButton().onclick`: call `this.store.clearDomainSpeed()`, `this.store.clearAllVideoPositions()`, and reset `lastRate` to `MVC_CONFIG.SPEED_DEFAULT`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/StateStore.test.ts tests/SettingsSheet.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/core/StateStore.ts src/ui/panels/SettingsSheet.ts tests/StateStore.test.ts tests/SettingsSheet.test.ts
git commit -m "fix(settings): sanitize volatile CDN params and fully reset speeds and positions"
```

---

### Task 4: Layout, Positioning & Modal Hierarchy (Issues 1, 11, 19)

**Files:**
- Modify: `src/ui/UIManager.ts`
- Modify: `src/video/VideoTransform.ts`
- Modify: `src/ui/styles/css.ts`
- Test: `tests/UIManager.test.ts`

**Interfaces:**
- `UIManager.updateTopBarPosition(): void`
- CSS class `.mvc-modal-open` on container

- [ ] **Step 1: Write failing tests for top bar inline positioning and modal overlay suppression**

1. When video is inline, top bar coordinates track `activeVideo.getBoundingClientRect()`.
2. When settings sheet is visible, transient overlays (`toast`, `gestureOverlay`, `doubleTapContainer`) are suppressed via modal state.

- [ ] **Step 2: Run tests to verify failures**

Run: `bun test tests/UIManager.test.ts`

- [ ] **Step 3: Implement fixes**

1. In `UIManager.ts`:
   Implement `updateTopBarPosition()`:
   When `!isFullscreen()` and `activeVideo` exists, position `.mvc-top-bar` aligned with `activeVideo.getBoundingClientRect()`, clamped to viewport safe bounds.
   In `VideoTransform.throttledReposition()`, call `this.ui.updateTopBarPosition()`.
2. In `UIManager.ts` and `css.ts`:
   Replace `.mvc-settings-sheet.visible ~ ...` with `.mvc-modal-open .mvc-toast, .mvc-modal-open .mvc-gesture-overlay, .mvc-modal-open .mvc-doubletap-container { display: none !important; }`.
   Toggle `mvc-modal-open` on `this.wrap` or `container` when settings sheet opens/closes.
3. In `css.ts`:
   Add responsive rules for screens under `480px`: reduce button sizes, padding, and gaps so the expanded control row fits screens down to 320px without horizontal overflow.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/UIManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/ui/UIManager.ts src/video/VideoTransform.ts src/ui/styles/css.ts tests/UIManager.test.ts
git commit -m "fix(ui): position top bar over inline video, fix modal suppression, prevent narrow screen overflow"
```

---

### Task 5: UI Semantics & Accessibility (Issues 12, 13, 14, 15, 16)

**Files:**
- Modify: `src/ui/components/Switch.ts`
- Modify: `src/ui/components/ProgressBar.ts`
- Modify: `src/ui/panels/SpeedStepper.ts`
- Modify: `src/ui/components/settingsRow.ts`
- Modify: `src/ui/styles/css.ts`
- Test: `tests/ProgressBar.test.ts`
- Test: `tests/SpeedStepper.test.ts`
- Test: `tests/SettingsSheet.test.ts`

**Interfaces:**
- `Switch`: `role="switch"`, `aria-checked`, `tabindex="0"`
- `ProgressBar`: `role="slider"`, `aria-valuenow`, keyboard arrow seeking
- `SpeedStepper`: `valEl` has `role="button"`, `tabindex="0"`, `aria-label`, keyboard click
- `settingsRow`: `<label for="...">` associated with control id
- `:focus-visible` styling in `css.ts`

- [ ] **Step 1: Write failing tests for accessibility semantics and keyboard interactions**

1. `Switch` renders with `role="switch"`, `aria-checked`, and responds to Enter/Space keydown.
2. `ProgressBar` has `role="slider"` and responds to ArrowLeft/ArrowRight keys.
3. `SpeedStepper` speed value has button role, aria-label, and responds to keyboard activation.
4. `settingsRow` associates `<label>` with control id.

- [ ] **Step 2: Run tests to verify failures**

Run: `bun test tests/ProgressBar.test.ts tests/SpeedStepper.test.ts tests/SettingsSheet.test.ts`

- [ ] **Step 3: Implement accessibility upgrades**

1. In `Switch.ts`:
   Set `role="switch"`, `aria-checked="true|false"`, `tabindex="0"`. Add `keydown` handler for Enter and Space.
2. In `ProgressBar.ts`:
   Set `role="slider"`, `tabindex="0"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow="0"`, `aria-label="Seek slider"`. Update `aria-valuenow` on time updates. Add `keydown` handler for ArrowLeft/Right (+/-5s or +/-1%) and Home/End.
3. In `SpeedStepper.ts`:
   Set `role="button"`, `tabindex="0"`, `aria-label="Playback speed: tap to play/pause, hold to reset"`. Add `keydown` handler for Enter/Space.
4. In `settingsRow.ts`:
   Assign unique ID to control and set `labelEl.htmlFor = controlId`.
5. In `css.ts`:
   Add deliberate `:focus-visible` outline rules for all interactive elements.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/ProgressBar.test.ts tests/SpeedStepper.test.ts tests/SettingsSheet.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/ui/components/Switch.ts src/ui/components/ProgressBar.ts src/ui/panels/SpeedStepper.ts src/ui/components/settingsRow.ts src/ui/styles/css.ts tests/ProgressBar.test.ts tests/SpeedStepper.test.ts tests/SettingsSheet.test.ts
git commit -m "fix(a11y): add ARIA roles, keyboard seeking/toggling, label associations, and focus-visible styles"
```

---

### Task 6: Motion & Icon Consistency (Issues 17, 18)

**Files:**
- Modify: `src/ui/icons.ts`
- Modify: `src/ui/UIManager.ts`
- Modify: `src/ui/styles/css.ts`
- Test: `tests/UIManager.test.ts`

**Interfaces:**
- `icons.ts`: SVG definitions for volume levels (`mute`, `low`, `med`, `high`), brightness levels (`low`, `med`, `high`), and chevrons (`left`, `right`)
- `css.ts`: `@media (prefers-reduced-motion: reduce)` covers `wrap` transition and `.mvc-doubletap-chevron`

- [ ] **Step 1: Write failing tests for SVG icons and reduced motion rules**

1. Verify `volumeIcon` and `brightnessIcon` render SVG elements, not raw emojis.
2. Verify reduced motion styles suppress chevron animations and wrapper opacity transitions.

- [ ] **Step 2: Run tests to verify failures**

Run: `bun test tests/UIManager.test.ts`

- [ ] **Step 3: Implement SVG icons and reduced-motion handling**

1. In `icons.ts`:
   Add SVG paths for volume (`vol-mute`, `vol-low`, `vol-mid`, `vol-high`), brightness (`bright-low`, `bright-mid`, `bright-high`), and chevrons (`chev-left`, `chev-right`).
2. In `UIManager.ts`:
   Use `this.getIcon(...)` to render volume, brightness, and double-tap chevrons cleanly.
3. In `css.ts`:
   Include `.mvc-ui-wrap` and `.mvc-doubletap-chevron` in `@media (prefers-reduced-motion: reduce)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/UIManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/ui/icons.ts src/ui/UIManager.ts src/ui/styles/css.ts tests/UIManager.test.ts
git commit -m "fix(ui): replace emojis with SVG icons and enforce complete reduced-motion support"
```

---

### Task 7: Full System Verification

- [ ] **Step 1: Run full test suite**
Run: `bun run test`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript compiler check**
Run: `bun run tsc`
Expected: Zero errors.

- [ ] **Step 3: Run Biome linter**
Run: `bun run lint`
Expected: Zero errors.

- [ ] **Step 4: Run userscript & extension builds**
Run: `bun run build`
Expected: Successful build for both targets.

- [ ] **Step 5: Run web-ext lint**
Run: `bun run lint:extension`
Expected: 0 errors, 0 warnings.
