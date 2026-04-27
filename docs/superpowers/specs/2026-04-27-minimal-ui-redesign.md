# Spec: Minimal "Floating Orbit" UI Redesign

## Goal
Replace the existing "ugly" button with a minimal, beautiful, SVG-only button that auto-hides gracefully on the side of the screen.

## Visual Design (Floating Orbit)
- **Idle State:**
  - Circle (32px), scaled to 0.6.
  - Positioned 16px from the right edge, but translated 75% off-screen.
  - Semi-transparent glass morphism (`rgba(0, 0, 0, 0.4)`) with high backdrop-blur (20px).
  - Soft cyan/white outer glow.
- **Hover/Active State:**
  - Scales to 1.0 (48px).
  - Slides fully onto the screen (16px from edge).
  - Background darkens to `rgba(0, 0, 0, 0.8)`.
  - Spring-like transition (`cubic-bezier(0.34, 1.56, 0.64, 1)`).

## Component Logic
- **SVG Icons:**
  - **Ready:** Minimalist download arrow (Feather-style).
  - **Loading:** Sleek circular spinner.
  - **Success:** Geometric checkmark.
- **State Management:**
  - Single `render(state)` or `applyStyles(state)` method to handle transitions.
  - No status text (purely visual feedback).

## Redundancy/Bug Fixes
- Fix manual CSS string manipulation by using a shared style object or CSS variables.
- Ensure the button doesn't interfere with page elements when hidden (pointer-events management).
- Clean up redundant event listeners if found.

## Success Criteria
- Button is nearly invisible when not in use.
- Interaction feels "physical" and responsive.
- Code is cleaner and easier to maintain.
