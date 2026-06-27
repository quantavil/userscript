# Codebase Uploader — MEMORY

## What
Tampermonkey userscript. Uploads codebase folders into AI chat inputs (ChatGPT, Claude, Gemini, etc.) as markdown chunks + raw binary attachments.

## Stack
- TypeScript + Vite + vite-plugin-monkey
- Zero runtime dependencies. Shadow DOM for style isolation.
- **No innerHTML** — imperative DOM only (Google Trusted Types on gemini.google.com, aistudio.google.com)

## Architecture
- `types.ts` — interfaces (Settings, FileObj, TreeNode)
- `constants.ts` — defaults, extension sets, site selectors, CSS (Liquid Glass design system)
- `settings.ts` — localStorage read/write, ignore folder/ext parsing
- `state.ts` — global state, `$()` selector, `el()` DOM helper, toast
- `icons.ts` — centralized Lucide-inspired SVG icon path data (built programmatically via createElementNS)
- `tree.ts` — builds tree from flat file list, renders folder/file rows
- `uploader.ts` — file ingestion, chunk building, chat injection, download fallback
- `index.ts` — entry point, UI assembly, events, keyboard shortcuts, tag editor for settings

## Key Decisions
- **No FAB** — removed in v1.0.0. `Alt+Shift+[ShortcutKey]` or Tampermonkey menu to toggle.
- **No version in header** — removed to keep the title clean.
- **No tree cache** — buildTree is <1ms, cache was premature optimization causing bugs.
- **No showConfirm** — native `confirm()` for the single use case (chunk overflow).
- **Checkbox re-render** — toggling any checkbox calls full `renderTree()` instead of manual parent/child DOM walking. Simpler, no bugs.
- **Custom Manifest Prompt** — text box in settings allows prepending instructions to `codebase_manifest.md`.
- **Liquid Glass CSS v4** — Apple WWDC25 inspired. Design tokens via CSS custom properties. Translucent glass surfaces, specular highlight borders, layered shadows, tag chips, and text areas.
- **Compact Settings Grid Layout**:
  - Arranged number/text settings in a 2-column inline grid to reduce visual height.
  - Placed checkboxes in a 2-column inline grid side-by-side.
  - Hidden native up/down number input spin buttons to match premium Apple styling.
- **Colored Icons**:
  - Folders / Open Folders: Amber gold (`#FFAE19` / `#FFC107`)
  - Code files: Indigo blue (`#5BA2FF`)
  - Binary files: Mint green (`#3CD070`)
  - Close button: Colored red with custom glass glow on hover.
  - Settings button: Colored accent-blue with glow.
- **Custom Hotkey** — customizable trigger key setting (`shortcutKey`), updating the header badge dynamically (e.g. `⌥⇧U` or `⌥⇧X`).
- **Tag Chips** — Interactive tag manager for folders and extensions to avoid messy comma-separated lists.
- **Font Sizes** — bumped up elements for better legibility (tree items at 13.5px, settings labels and tags at 13.5px).

## Build
```bash
npm run build   # outputs dist/codebase-uploader.user.js
npx tsc --noEmit  # type check
```

## Blunders
(none yet)

## Structure
```
src/
  types.ts        — 33 lines
  settings.ts     — 39 lines
  state.ts        — 41 lines
  constants.ts    — 456 lines (mostly CSS)
  icons.ts        — 104 lines (SVG paths)
  tree.ts         — 221 lines
  uploader.ts     — 212 lines
  index.ts        — 310 lines
```
