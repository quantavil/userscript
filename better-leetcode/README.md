# 💡 Better LeetCode

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript/tree/main/better-leetcode)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

A powerful, privacy-first userscript for **LeetCode** that exports clean, structured Markdown for any problem page. Designed for LLM context pasting, note-taking in Obsidian/Notion, and local archiving with full support for examples, constraints, hints, code templates, failing submissions, and discussion comments.

Maintained by [@quantavil](https://github.com/quantavil) in the [quantavil/userscript](https://github.com/quantavil/userscript) monorepo.

---

## ✨ Features

- **One-Click Markdown Copy**: A dedicated copy button beside the problem title formats and copies the entire problem directly to your clipboard.
- **Configurable Section Toggles**: Choose exactly what to include:
  - Problem Title & URL link
  - Statement & Description
  - Example Test Cases & Fenced I/O Blocks
  - Constraints & Mathematical Formats
  - Hints & Follow-ups
  - Starter Code Template (matching your selected language)
  - Current Editor Code (extracted directly from Monaco Editor)
  - Last Failed Submission Details (input, expected vs actual, compile/runtime logs)
  - Topic Tags & Categories (opt-in)
  - Top Community Discussion Comments (+ customizable count)
- **Custom LLM Prompt Templates**: Prepend custom system or user prompts before the copied problem. Supports interpolation variables:
  - `{{title}}` - Problem title
  - `{{id}}` - Problem question number
  - `{{difficulty}}` - Easy / Medium / Hard
  - `{{language}}` - Active programming language
- **Failed Submission Hook**: Intercepts check responses to capture runtime/compilation errors or failing test inputs without leaking hidden cases. Automatically resets once you achieve an Accepted submission.
- **Native Theme & A11y Support**: Follows LeetCode's dark/light modes seamlessly, runs with Shadow DOM style isolation, and uses an accessible native `<dialog>` for settings.

---

## 📥 Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari)
   - [Violentmonkey](https://violentmonkey.github.io/) (Firefox, Chrome)
2. Install the userscript directly:
   - Click to install: **[`dist/better-leetcode.user.js`](https://github.com/quantavil/userscript/raw/main/better-leetcode/dist/better-leetcode.user.js)**

---

## 🛠️ Local Development

Ensure [Bun](https://bun.sh/) is installed (`bun@1.4+`).

```sh
# Clone repository
git clone https://github.com/quantavil/userscript.git
cd userscript/better-leetcode

# Install dependencies
bun install

# Start Vite dev server with Hot Userscript Reloading
bun run dev

# Run full validation suite (typecheck + Biome lint + Knip + unit tests)
bun run check

# Check for unused files, exports, and dependencies
bun run knip

# Build production userscript bundle
bun run build

# Auto-fix formatting and lint issues
bun run lint:fix
```

---

## 🏗️ Architecture & Modules

| Module | Responsibility |
|---|---|
| [`src/api.ts`](./src/api.ts) | LeetCode GraphQL client for problem definitions, snippets, and discussion comments (5-min cache, 15 s timeout). |
| [`src/markdown.ts`](./src/markdown.ts) | Pure Turndown + GFM converter for HTML parsing, example fence generation, and final document building. |
| [`src/capture.ts`](./src/capture.ts) | Document-start hook intercepting `fetch`/`XHR` responses on `/submissions/detail/<id>/check/`. |
| [`src/failure.ts`](./src/failure.ts) | Pure failure parser extracting inputs, outputs, compilation errors, and ANSI stripping. |
| [`src/editor.ts`](./src/editor.ts) | Monaco Editor model extractor with DOM `.view-lines` fallback for current code extraction. |
| [`src/inject.ts`](./src/inject.ts) | MutationObserver injection logic attaching UI buttons to LeetCode's flexlayout DOM. |
| [`src/store.ts`](./src/store.ts) | GreaseMonkey storage abstraction (`GM_getValue`, `GM_setValue`, `GM_deleteValue`). |
| [`src/settings.ts`](./src/settings.ts) | Pure schema validation and default fallbacks for user options. |
| [`src/ui/`](./src/ui/) | Preact + Shadow DOM settings dialog (`<dialog>`), toasts with token count estimates, and SVG icons. |

---

## 📄 License

This subproject is open source and licensed under the [GPL-3.0-or-later License](LICENSE).
Part of the [quantavil/userscript](https://github.com/quantavil) collection.
