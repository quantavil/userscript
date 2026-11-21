# Better Gmail — Quick Signature Access

- **Author:** quantavil
- **Date:** 2026-11-21

## Overview

A shared Gmail account is used by multiple team members daily, with 4 distinct signatures configured in Gmail settings. Team members frequently reply in compact inline reply views with attached files, where horizontal toolbar space is severely constrained. Gmail's layout engine automatically hides the native "Insert signature" pen icon (`div.wG[command="signature"]`) via inline `display: none;`, pushing it into the 3-dots "More options" popup menu (`display: none;`). This forces users into a repetitive 3-step menu search for every email sent.

This feature provides the least intrusive, zero-overhead mechanism to restore permanent 1-click mouse access and an `Alt+S` keyboard shortcut to the native signature picker directly from the compose toolbar, even in tight inline replies, with zero storage, zero DOM mutations, and full Trusted Types compliance.

## Analysis

### 1. Contrarian / YAGNI & Complexity Minimization

- **Zero JS Layout Engine:** Gmail collapses buttons via inline styles (`element.style.display = 'none'`). An external CSS rule using `!important` (`.bAK .wG[command="signature"] { display: inline-flex !important; }`) has higher cascading specificity than standard inline styles. Pure declarative CSS overrides Gmail's inline hiding instantly without needing `MutationObserver` or `ResizeObserver` reflow loops.
- **Preserving Native Popover:** When `command="signature"` is unhidden, its native click listeners remain intact. Triggering `.click()` (via mouse or hotkey) opens Gmail's native signature popover with all 4 user signatures correctly anchored to the pen icon. Zero custom UI or signature scraping is required.

### 2. UX & Compact Inline Reply Ergonomics

- **The Toolbar Compression Bottleneck:** In small inline replies with attachments, toolbar width can drop below 450px.
- **Space Reclamation Strategy:**
  - Prune Confidential Mode (`.bAK .wG[command="locker"] { display: none !important; }`), recovering ~32px of dead space.
  - Micro-tighten button gutters across remaining `.wG` items (padding 0 2px, min-width 28px), recovering ~24px.
  - **Net Gain:** ~56px recovered vs. ~28px required by the signature pen button. A net surplus of ~24px guarantees zero toolbar wrapping and prevents pushing the 3-dots and Discard buttons off-screen.

### 3. Hotkey Collision & Multi-Compose Isolation

- **Collision Safety:** In compose viewports, `Alt+S` does not conflict with Gmail's native compose shortcuts (`Ctrl+S` is save draft; `Ctrl+Enter` is send; single keys are disabled during typing).
- **Isolation:** The keydown handler dynamically inspects `document.activeElement.closest('.M9, .AD, .aoP, tr.btC, [role="dialog"], [role="region"]')`. It triggers the signature button only in the active compose box the user is currently editing, preventing cross-window misfires.

### 4. Trusted Types & Platform Safety

- No new DOM elements are created and no HTML strings or `innerHTML` assignments are executed.
- Presentation is 100% stylesheet-driven. Hotkey interaction uses standard DOM `.click()`.

## Goals vs. Non-Goals

- **In-Scope Goals:**
  - Permanently display the native signature pen button (`[command="signature"]`) on all compose toolbars via CSS `!important`.
  - Reclaim horizontal space by suppressing `[command="locker"]` (confidential mode) and tightening `.wG` button padding.
  - Register an `Alt+S` keyboard shortcut scoped to active compose containers that programmatically clicks the signature button.
  - Zero storage, zero network access, and zero `innerHTML` modifications.

- **Out-of-Scope Non-Goals:**
  - Managing or storing signature text in userscript storage.
  - Overriding Gmail's native signature insertion logic or popover DOM.
  - Replacing or modifying other toolbar buttons.

## Alternatives Weighed

1. **Alternative 1: Naive CSS Force-Display Without Space Reclamation**
   - _Rejected:_ In small inline replies, forcing all 8 buttons to display causes button wrapping or pushes the 3-dots and Discard buttons off-screen.
2. **Alternative 2: Custom Dropdown Menu for Signatures**
   - _Rejected:_ Violates YAGNI; requires scraping signature names from DOM, managing state, handling undo stacks, and breaks with Gmail UI updates.
3. **Alternative 3: JS MutationObserver to Detect and Unhide**
   - _Rejected:_ Unnecessary JS overhead and causes visual flashing during layout recalculations; CSS `!important` overrides inline styles with zero latency.
4. **Alternative 4: `Ctrl+S` for Signature Hotkey**
   - _Rejected:_ Directly conflicts with Gmail's native "Save Draft" shortcut.

## Key Decisions & Staging for Next Steps

- **Implementation Strategy:**
  1. Add declarative toolbar rules in `src/style.css` (prune locker, unhide signature, tighten padding).
  2. Add compose container and signature button selectors in `src/selectors.ts`.
  3. Implement `initSignatureHotkey()` in `src/features/signature.ts` with tests in `src/features/signature.test.ts`.
  4. Register feature in `src/main.ts`.
  5. Run `bun run verify` to confirm lint, strict types, Vitest suites, Knip, and production build.
