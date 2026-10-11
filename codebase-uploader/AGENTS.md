# AGENT — Codebase Uploader

## Overview
Tampermonkey userscript (v1.4.0). Packages codebase directories into markdown chunks + raw binary attachments for AI chat inputs (ChatGPT, Claude, Gemini, etc.).

## Stack
- TypeScript + Vite + `vite-plugin-monkey` + Vitest
- Zero runtime dependencies. Shadow DOM style isolation.
- **No innerHTML** — imperative DOM only for Google Trusted Types (`gemini.google.com`, `aistudio.google.com`).

## Architecture
- `src/types.ts` — Type definitions (`Settings`, `FileObj`, `TreeNode`)
- `src/constants.ts` — Default settings, extension sets, site selectors, STYLESHEET (Swiss Industrial Telemetry & CRT Command Matrix CSS)
- `src/settings.ts` — LocalStorage persistence, cached ignore sets
- `src/state.ts` — Global state, `$()` shadow selector, `el()` DOM builder, toast notifications
- `src/icons.ts` — Centralized 100% SVG icon system (`createElementNS`)
- `src/tree.ts` — Directory tree builder, DOM checkbox walking, O(N) search matcher
- `src/uploader.ts` — File ingestion, UTF-16 safe chunking, chat input injector, copy modal handler
- `src/index.ts` — Entry point, dual-pane UI assembly, hotkey handler, Shadow DOM focus trap
- `tests/` — Vitest unit test suites (`uploader.test.ts`, `tree.test.ts`, `settings.test.ts`, `icons.test.ts`, `state.test.ts`)

## Key Decisions
- **Swiss Industrial Telemetry & CRT Command Matrix UI**: Matte Onyx background (`#08090d`), monospaced JetBrains font stack, Cyber Cyan (`#00E5FF`) focus rings, Aviation Red (`#FF3333`) execute CTAs, and sharp 90-degree industrial borders.
- **Single Phosphor Focus Ring**: Enforces `outline: none !important` globally and uses a single high-contrast Cyber Cyan border glow (`#00E5FF`) to eliminate double-ring focus glitches.
- **Consolidated SVG Icon System**: 100% SVG icon system (`src/icons.ts`) using `createElementNS` with zero emoji dependency for strict anti-slop frontend standards.
- **Spatial Dual-Pane Command Layout**: 2-column workspace featuring a left Telemetry HUD (live ASCII context meter `[||||||||....] 42%`, file breakdown stats, quick preset chips `[ALL]`, `[CODE]`, `[DOCS]`, industrial dropzone) and a right Tree Matrix workspace.

## Build & Test
```bash
bun run test    # Vitest unit test suite (31 tests across 5 files)
bun run tsc     # Type check
bun run build   # Produces dist/codebase-uploader.user.js
```

## Blunders
- **npm peer dependency collision**: `vite-plugin-monkey@5.0.9` peer dependency on `vite@^6` collided with `vite@^7`. Resolved using `npm install --legacy-peer-deps`.

## Structure
```
src/
  types.ts        — 36 lines
  settings.ts     — 43 lines
  state.ts        — 49 lines
  constants.ts    — 897 lines
  icons.ts        — 105 lines
  tree.ts         — 283 lines
  uploader.ts     — 405 lines
  index.ts        — 737 lines
tests/
  uploader.test.ts — 12 unit tests
  tree.test.ts     — 7 unit tests
  settings.test.ts — 5 unit tests
  icons.test.ts    — 4 unit tests
  state.test.ts    — 6 unit tests
```
