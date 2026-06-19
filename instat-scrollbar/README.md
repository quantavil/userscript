# Instant Jump Scrollbar - Minimal

Minimal, fast custom scrollbar with instant number-key jumps. Active-container aware, lightweight, and designed to avoid site shortcut conflicts.

- Instant jumps: `1` = top (0%), `0` = bottom (100%), `2–9` = 20%–90%
- Active container: acts on the scrollable element under your mouse or focus
- Click track to jump; drag thumb to scroll (pointer events)
- Early key handling (capture phase) to reduce conflicts with site shortcuts
- Ignores keys while typing in inputs, textareas, selects, or contenteditable
- No themes, settings, or storage — minimal footprint

---

## Installation

1. Install a userscript manager (Tampermonkey, Violentmonkey, Greasemonkey).
2. Create a new script and paste the contents of `beautiful-scrollbar/main.js`.
3. Save and enable. It runs on all sites at `document-start`.

Note: The native vertical scrollbar on the page root is hidden to avoid overlap with the custom bar. Container scrollbars are left intact.

---

## Usage

- Hover or focus a scrollable area to make it the active container.
- Use number keys for instant jumps; click the track or drag the thumb for direct control.

---

## Keyboard Shortcuts

- `1` → Jump to top (0%)
- `0` → Jump to bottom (100%)
- `2–9` → Jump to the corresponding percentage

Shortcuts are ignored when typing and when `Ctrl`, `Alt`, or `Meta` are held. Handled in capture phase to minimize conflicts with site-level shortcuts.

---

## Active Container Behavior

- The script tracks the active container via `wheel`, `mouseover`, and `focus`.
- Jumps, clicks, and drags operate on that container.
- If content is inside an iframe, the userscript must also run in that frame.

---

## Performance

- `requestAnimationFrame` scheduling for smooth updates.
- Scroll listener attached to the active container for precise thumb position.

---

## Compatibility Notes

- Vertical native scrollbars are hidden only for the page root.
- Firefox hides root scrollbars using `scrollbar-width: none`; horizontal scrollbars remain visible.
- Some sites bind number-key shortcuts; capture-phase handling reduces conflicts, but keys are still ignored while typing.
