# Beautiful Scrollbar — Compact Dark UI (Instant Jump)

Minimal, fast, and modern custom scrollbars for any page. Multi-container aware, themeable, animated, and tuned for instant navigation.

- Instant quick jumps: 1 = top (0%), 0 = bottom (100%), 2–9 = 20%–90%
- Multi-container support: acts on the scrollable element under your mouse/focus
- Minimal dark settings UI (ESC), glass overlay, red-close feedback
- 10+ built-in themes (including animated), persisted via GM storage/localStorage
- Idle “thin indicator” with delayed collapse, expands on activity/hover
- Optional quick smooth scroll for bar actions (keys stay instant)
- Touch support: tap track to jump, drag thumb to scroll
- Performance-friendly: throttled MutationObserver and rAF-based updates

---

## Installation

Option A: Paste into Tampermonkey
1. Install Tampermonkey (Chrome/Edge/Firefox/Safari).
2. Create new script → paste the provided userscript.
3. Save. It runs on all sites at document-start.

Option B: Import from file
- Save the script to a file and import via Tampermonkey dashboard.

Note: Vertical native scrollbars are hidden on the page root and on managed containers to prevent overlap with the custom bar. Horizontal scrollbars are not hidden in WebKit/Blink; Firefox does not support axis-specific hiding, so managed containers use `scrollbar-width: none`.

---

## Usage

- Press ESC to open/close the Themes panel.
- Hover over a scrollable element (or focus it) to make it the “active container”.
- The custom bar appears only when scrolling is possible and aligns with that container’s viewport.

---

## Keyboard Shortcuts

| Key | Action | Notes |
| --- | ------ | ----- |
| ESC | Open/close settings | Works when not typing in inputs |
| Shift+1 | Jump to top (0%) | Instant; Shift requirement configurable |
| Shift+0 | Jump to bottom (100%) | Instant; Shift requirement configurable |
| Shift+2–9 | Jump to 20%–90% | Instant; Shift requirement configurable |

Shortcuts are ignored while typing in inputs/contenteditable or when the settings UI is open. You can toggle the “Require Shift for number jumps” in Settings.

---

## Settings UI

- Open with ESC. Minimal dark panel with a glassy overlay.
- Click any theme card to apply immediately (saved persistently).
- Behavior toggles:
  - Quick smooth scroll (bar only)
  - Require Shift for number jumps
- Close button turns red on hover and deeper red on click.

---

## Themes and Customization

Built-in themes include: Modern, Neon, Ocean, Sunset, Forest, Candy, Dark, Gold, Cyber, Ruby, Slate, None, plus animated themes like Rainbow, Glint, Holo Wave, and Water.

To change the default theme:
- Open the settings (ESC) and select a theme; it’s saved automatically.
- Or edit the script: set the initial storage value for key bs-theme to your desired theme.

Advanced (developers):
- Themes are defined in a `THEMES` object.
- Each theme uses CSS variables applied to `:root`:
  - `--bs-track`, `--bs-thumb`, `--bs-thumb-hover`, `--bs-radius`, `--bs-width`, `--bs-glow`, and animation/background sizing for animated themes.
- Add your own theme by extending `THEMES` and selecting it in the UI.

---

## Multi-Container Behavior

- The script tracks the active container from mouseover, wheel, and focus events (Shadow DOM aware via `composedPath`).
- Quick-jump keys operate on that active container.
- Scrollbar instances are created on demand and cleaned up when elements are removed.

Note: If content is inside an iframe, the userscript must run in that frame as well for an in-frame scrollbar.

---

## Performance

- Instant scroll updates (no smooth scrolling for shortcuts).
- Minimal layout work; updates are scheduled via requestAnimationFrame.
- MutationObserver events are coalesced per frame to reduce CPU on dynamic pages.
- Honors `prefers-reduced-motion` for UI transitions.

---

## Compatibility Notes

- Vertical native scrollbars are hidden for the page root and for managed containers to prevent overlap.
- Horizontal scrollbars remain visible in WebKit/Blink. Firefox lacks axis-specific control, so managed containers use `scrollbar-width: none`.
- Number-key jumps require Shift by default to avoid conflicts with site shortcuts; you can disable this in Settings.
- Touch support is enabled for track taps and thumb drags.
