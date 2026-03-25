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

- **Fast Path Extraction**: In v1.4.0, we replaced static waits with polling. If Google's `[data-complete]` exists, we capture immediately. This significantly improves UX by reducing idle time.

