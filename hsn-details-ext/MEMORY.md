# Project: ImpexCube Duty Structure -> Markdown Exporter Userscript

## Overview
A browser userscript (Tampermonkey/Violentmonkey) that exports ImpexCube's Export Duty Structure data for one or more HSN/RITC codes into a consolidated Markdown document. It supports bulk export (mass mode) and can be triggered via the userscript command menu on various web interfaces (ImpexCube, Gemini, Claude, ChatGPT, Grok).

## Structure
- `package.json`            # Project metadata and dependencies (vite, typescript, vite-plugin-monkey)
- `tsconfig.json`          # TypeScript configuration
- `vite.config.ts`         # Vite build configuration using vite-plugin-monkey
- `LICENSE`                # MIT License details
- `README.md`               # Userscript documentation and guide
- `src/`
  - `main.ts`              # Core source code of the userscript implementing ExporterUI
- `dist/`
  - `hsn-details-ext.user.js` # Bundled userscript file ready for installation

## Conventions
- TypeScript-first development.
- Target ImpexCube endpoints directly using `GM_xmlhttpRequest` for CORS bypass and speed.
- Import GM APIs via explicit ESM paths from `vite-plugin-monkey/dist/client`.
- Maintain a premium dark glassmorphism modal design with safe CSS scoping.

## Dependencies & Setup
- Bun for package management and compilation (updated to typescript@6.0.3, vite@8.1.3, and vite-plugin-monkey@8.0.6).
- `vite-plugin-monkey` for userscript building.

## Critical Information
- Target site data loads via JS/AJAX after initial render.
- Direct AJAX requests to the data endpoints are preferred over background tab rendering where possible.
- The UI should reside in the Tampermonkey/Violentmonkey command menu to trigger a modal.
- Target domains: `impexcube.in`, `gemini.google.com`, `claude.ai`, `chatgpt.com`, `grok.com`.

## Insights
- **Obsidian Compatibility**: Formatting tables with standard `###` subheaders allows them to populate Obsidian's outline view. Using Obsidian callout syntax (`> [!warning]`, `> [!danger]`, `> [!info]`) rather than empty table containers creates a clean, premium visual output inside the vault.
- **Draggable Compact UI**: Implemented boundary-restricted dragging with `localStorage` position caching. Collapsing the panel to a pulsing badge keeps the interface non-invasive on AI screens (Claude/ChatGPT/Gemini/Grok).

## Blunders
- **2026-07-07 Unused TS Parameter**: Added `statusType` parameter in `updateProgress` signature without referencing it in all blocks, triggering a `TS6133` compile error. Fixed by utilizing it to toggle error/success pulse colors on the badge.
