# AGENTS.md

Guidance for work on **Better LeetCode** (`better-leetcode`). Read README.md first for high-level usage.

## Architecture & Ground Rules

- **Execution Context**: The userscript runs with `@run-at document-start` and `noframes: true`. Early execution is mandatory so the network submit interceptor hooks `window.fetch` and `window.XMLHttpRequest` before LeetCode scripts instantiate.
- **Pure Module Separation**:
  - `src/markdown.ts`, `src/failure.ts`, and `src/settings.ts` are pure business logic without GM dependencies or direct DOM globals. They must remain pure to execute seamlessly in headless unit tests (`bun test`).
  - GM storage, clipboard, and browser-dependent logic live in `src/store.ts`, `src/capture.ts`, `src/editor.ts`, and `src/inject.ts`.
- **Shadow DOM Isolation**:
  - All UI elements (settings dialog `<dialog>`, toast notifications, buttons) mount inside a shadow root (`#better-leetcode-host`) via Preact to prevent CSS clashes with LeetCode's dynamic stylesheet.
- **Theme Adaptation**:
  - Dynamically detects theme: checks `html.dark` or `html.light`, falls back to background luminance of `document.body`, then falls back to `prefers-color-scheme`.

## DOM Anchors & Selectors

- **Problem Title Link**: `.text-title-large a[href^="/problems/"]` or `div[data-cy="question-title"]`.
- **Footer Help Button**: `svg.fa-circle-question` or `button[data-state]` in the problem description tab.
- **Editor Extraction**:
  - Preferred: `unsafeWindow.monaco?.editor?.getModels()` (retrieves full active code and language ID).
  - Fallback: DOM query `.view-lines` (partial viewport lines only; marked in output with warning).
- **Submit Check Endpoint**: `/submissions/detail/<id>/check/`. Intercepts check status to extract failed test case, compilation error, or runtime error, and clears failure on `Accepted`.

## Development & Verification Workflow

- **Runtime & Tools**: Bun (`bun@1.4.2`), Vite 8 with `vite-plugin-monkey`, TypeScript 7, Biome.
- **Quality Checks**:
  ```sh
  bun run check      # runs typecheck (src + test), biome check, knip, and bun test
  bun run knip       # checks for dead files, unused exports, and unlisted dependencies
  bun run build      # checks and builds dist/better-leetcode.user.js
  bun run lint:fix   # auto-fixes formatting and lint rules via Biome
  ```
- **Monorepo Conventions**:
  - Keep `@license GPL-3.0-or-later` in userscript metadata, `package.json`, and project `LICENSE`.
  - Author and namespace point to `quantavil` (`https://github.com/quantavil/userscript/tree/main/better-leetcode`).
  - Output bundle resides in `dist/better-leetcode.user.js` and is tracked.
