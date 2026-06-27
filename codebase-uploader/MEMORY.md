# Project: codebase-uploader

## Overview
A fully customizable codebase uploader for AI chats built as a Greasemonkey/Tampermonkey userscript. It enables users to upload or download multiple files as markdown chunks or raw attachments, supporting editable limits, ignore lists, binary files, and an interactive folder-tree UI. It runs as a floating widget isolated within an open Shadow Root to prevent CSS collisions and bypasses Trusted Types using programmatic DOM creation.

## Structure
src/
├── types.ts          # Data types and interfaces (Settings, FileObj, FolderNode, FileNode, TreeNode)
├── settings.ts       # Settings loading/saving/resetting and parsing of ignore lists
├── state.ts          # Global state variables, selectors (Shadow DOM root, active files, search queries, etc.)
├── constants.ts      # CSS stylesheet, file extension filters (text/binary), and default settings
├── tree.ts           # Recursive tree construction, state tracking (checkboxes, expanded/collapsed), and UI tree list rendering
├── uploader.ts       # File ingestion, binary checking, text reading, manifest/chunk generation, download triggers, and chat input selectors
└── index.ts          # Script entry point, programmatic UI setup, event listeners, MutationObserver, and Greasemonkey commands

## Conventions
- UI elements are built programmatically using the helper function `el(...)` to bypass Trusted Types on target websites.
- The UI is encapsulated within an open Shadow DOM (`shadow`) to isolate styles and prevent interference from/to host pages.
- Reactivity and tree rendering are triggered via helper/setter functions (e.g. `setAllFiles`, `renderTree`).

## Dependencies & Setup
- Built using Vite, TypeScript, and `vite-plugin-monkey`.
- Setup uses Bun (bun.lock is present). Install dependencies and build with `bun run build` (or `npm run build`).

## Critical Information
- CSS uses `:host` rules for initial styling, positioning the shadow host absolutely but allowing interactive components (pointer-events) inside.
- Some browsers or hosting sites restrict file reading or uploader APIs. The script fallbacks to downloading files sequentially via data URLs.

## Insights
- Using `data-path` and `data-type` attributes allows restoring focus to specific elements when the tree is re-rendered dynamically.

## Blunders
- [2026-06-27] Import error in settings.ts → constants.ts exported SETTINGS instead of DEFAULT_SETTINGS → Renamed SETTINGS to DEFAULT_SETTINGS, removed unused functions, and invoked loadSettings() at startup.
- [2026-06-27] Nested path binary check and manifest empty → split paths in isBinaryFile, added binary files to manifest, and generated manifest for binary-only selections.
- [2026-06-27] FAB button toggle support → added showFab to settings to allow showing or hiding the FAB button via a Greasemonkey menu command.
- [2026-06-27] Fixed 20 real bugs and performance issues → resolved search path filters, skipHidden override, Settings UI panel, ignore list cache, DOM-based tree toggling, files combining, and Toast/Confirm custom modals.
- [2026-06-27] Refactored codebase → Removed fenceLangFromExt settings/UI, simplified el helper, simplified getIgnoreFolders/Exts caching, and fixed updateParentCheckboxes root querying bug.
- [2026-06-27] UI Reversion → Reverted the side panel layout back to the original centered premium design.
