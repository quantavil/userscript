# Project: userscript

## Overview
This is a monorepo workspace containing various browser userscripts (Tampermonkey) developed for different websites and tasks. Each folder represents an independent project, ranging from pure vanilla JS scripts to TypeScript/Vite compiled scripts.

## Structure
- `ACAS-bot/`              # Userscript for ACAS
- `StreamGrabber/`          # Userscript to grab streams
- `better-search/`          # Search enhancements userscript
- `chess-bot/`              # Chess helper userscript
- `codebase-uploader/`      # TS/Vite modularized tool to upload codebase context to AI chat inputs (customizable limits, ignore lists, binary files)
- `youtube-filter/`         # Filtering userscript for YouTube
- `arena-model-predictor/`  # Userscript to predict models in Chatbot Arena battles dynamically fetching OpenRouter pricing catalog at startup (no local catalog)
- Other folders...          # Subdirectories for various other target sites and tools

## Conventions
- Each sub-project is independent and maintains its own configuration (e.g., package.json, vite.config.ts, tsconfig.json).
- Avoid modifying adjacent projects unless explicitly requested.
- Keep userscripts lightweight and minimize extra dependencies.

## Dependencies & Setup
- Individual folders use `bun` or `npm`/`vite` for development and bundling.
- No global repository setup or configuration is required.

## Critical Information
- Tampermonkey headers (metadata block at the top of scripts) must be kept valid.

## Insights
- Using Shadow DOM ensures complete CSS and DOM isolation of userscripts on target pages (ChatGPT, Claude, etc.).
- Saving/restoring scroll position and checkbox focus in dynamic tree redrawing prevents UI jumping and keyboard focus loss.
- `@grant none` runs script in page context → CSP blocks `<style>` in Shadow DOM on strict sites (Gemini, AI Studio). Use `@grant GM_registerMenuCommand` to enable sandbox mode which bypasses CSP.
- For SPA-resilient injection: append to `document.documentElement`, use closed Shadow DOM, add MutationObserver to re-attach on removal. Pattern proven in `floating-stopwatch/main.js`.
- `@import url()` for Google Fonts is unreliable inside Shadow DOM + CSP sites. Use system font stacks instead.
- `$()` helper that throws on missing elements will silently crash the entire userscript. Return null instead.

- [2026-06-25] Syntax error in codebase-uploader main.js -> Unescaped backticks in a JS template literal -> Escaped them as \`\`\`.
- [2026-06-27] codebase-uploader FAB not showing on Gemini/AI Studio -> 3 root causes: (1) `@grant none` meant CSP blocked Shadow DOM styles, (2) `document.body.appendChild` gets nuked by SPAs, (3) `$()` throwing crashed the script silently. Fix: `@grant GM_registerMenuCommand`, append to `document.documentElement`, `$()` returns null.
- [2026-06-27] Chatbot Arena Predictor blank UI / not predicting -> 3 root causes: (1) document.body is null at document-start causing DOM append crash, (2) NextJS pushes parsed partially because of chunk splitting, (3) participantPosition was checked at parent but cost/usage were inside metadata. Fix: append to document.documentElement, accumulate raw text buffer, support metadata sub-structure.
- [2026-06-27] codebase-uploader refactoring -> Removed fenceLangFromExt settings/UI, simplified el helper, simplified getIgnoreFolders/Exts caching, and fixed updateParentCheckboxes root querying bug.
- [2026-06-27] codebase-uploader UI reversion -> Reverted the slide-in side panel overhaul to restore the original centered premium design.
