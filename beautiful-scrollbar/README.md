# Beautiful Scrollbar — Compact Dark UI (Instant Jump)

Minimal, fast, and modern custom scrollbars for any page. Multi-container aware, themeable, and tuned for instant navigation.

- Instant quick jumps: 1 = top (0%), 0 = bottom (100%), 2–9 = 20%–90%
- Multi-container support: acts on the scrollable element under your mouse/focus
- Minimal dark settings UI (ESC), glass overlay, red-close feedback
- 10+ built-in themes, persisted with GM storage/localStorage
- Near-zero overhead: rAF-based updates, observer cleanups, reduced redundancy

---

## Installation

Option A: Paste into Tampermonkey
1. Install Tampermonkey (Chrome/Edge/Firefox/Safari).
2. Create new script → paste the provided userscript.
3. Save. It runs on all sites at document-start.

Option B: Import from file
- Save the script to a file and import via Tampermonkey dashboard.

Note: The script hides native scrollbars globally via CSS for a clean look.

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
| 1   | Jump to top (0%) | Instant |
| 0   | Jump to bottom (100%) | Instant |
| 2–9 | Jump to 20%–90% | Instant; number row or numpad |

Shortcuts are ignored while typing in inputs/contenteditable or when the settings UI is open.

---

## Settings UI

- Open with ESC. Minimal dark panel with a glassy overlay.
- Click any theme card to apply immediately.
- Close button turns red on hover and deeper red on click.

---

## Themes and Customization

Built-in themes include: Modern, Neon, Ocean, Sunset, Forest, Candy, Dark, Gold, Cyber, Ruby, Slate, and None.

To change the default theme:
- Open the settings (ESC) and select a theme; it’s saved automatically.
- Or edit the script: set the initial storage value for key bs-theme to your desired theme.

Advanced (developers):
- Themes are defined in a THEMES object.
- Each theme uses CSS variables applied to :root:
  - --bs-track (track), --bs-thumb (thumb), --bs-thumb-hover (hover), --bs-radius, --bs-width, --bs-glow
- You can add your own theme by extending THEMES and selecting it in the UI.

---

## Multi-Container Behavior

- The script tracks the active container from mouseover, wheel, and focus events.
- Quick-jump keys operate on that active container.
- Scrollbar instances are created on demand and cleaned up when elements are removed.

Note: If content is inside an iframe, the userscript must run in that frame as well for an in-frame scrollbar.

---

## Performance

- Instant scroll updates (no smooth scrolling for shortcuts).
- Minimal layout work; updates are scheduled via requestAnimationFrame.
- MutationObserver cleans removed instances efficiently.
- Honors prefers-reduced-motion for UI transitions.
