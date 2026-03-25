# Project: Userscripts

## Overview
A high-end collection of userscripts designed for browser customization, automation, and UI/UX enhancement. The repository uses deep native DOM manipulation, background tab extraction (for cross-origin AI results), and sophisticated HSL color tokens to deliver premium, seamless browser experiences.

## Structure
- `ai-mode-for-brave/`      # Google AI integration for Brave Search sidebar
- `auto-f2-clean-cookie/`   # Advanced cookie and session manager
- `texpander-ai/`          # AI-powered text expansion utilities
- `main.js`                # Universal entry point convention in each folder

## Conventions
- **Dual-Role Logic**: Scripts often use a single file with multiple `@match` rules to handle background tabs and main tabs concurrently.
- **Native Rendering**: Prefer direct DOM extraction and injection over iframes to maintain CSS harmony and avoid security hurdles.
- **Ethereal Glass Design**: Consistent UI tokens (Double-Bezel, HSL dark modes) across all scripts.
- **State Management**: Using `GM_setValue` and `GM_addValueChangeListener` for real-time cross-tab state syncing.

## Dependencies & Setup
- Requires a userscript manager (Tampermonkey, Violentmonkey).
- `ai-mode-for-brave` requires popups enabled for background tab extraction.

## Critical Information
- **Brave Search SPA**: Brave Search is a Single-Page Application; simple `load` events aren't enough. Use `popstate` and URL polling to ensure sidebar panels persist across filtering/navigation.
- **Google AI Stream**: Google AI Mode doesn't render statically; it streams. The script must wait for content settling (mutation silence) before extraction.

## Insights
- **SPA Re-injection**: In Brave Search, re-rendering happens frequently. Caching the last successful AI response (`lastHTML`) allows for instant panel restoration without redundant Google tab cycles.

## Blunders
- [2026-03-25] Tried using `srcdoc` iframes for AI content → CSP and styling mismatches broke the UX → Switched to Native DOM Extraction for a seamless look.
- [2026-03-25] Initial extraction was too broad (cloned `body`) → Triggered performance lags → Refined to target exact AI response containers (`[data-subtree="aimfl"]`).
