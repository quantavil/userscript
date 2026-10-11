# ⚡ Codebase Uploader

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

[![Version](https://img.shields.io/badge/version-1.4.0-blue)](dist/codebase-uploader.user.js)
[![License](https://img.shields.io/badge/license-GPL--3.0-green)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-34%20passed-brightgreen)](tests/)

Zero-dependency Tampermonkey userscript that packages directories and codebases into structured markdown chunks and raw binary attachments for AI chats. Features a Swiss Industrial Telemetry & CRT Command Matrix interface, live ASCII context meters, dual-pane command layout, SVG icon consolidation, and full WCAG AA accessibility.

---

## ⚡ Supported Platforms

Optimized and tested for major AI web interfaces:
- **ChatGPT** (`chatgpt.com`)
- **Claude** (`claude.ai`)
- **Gemini & Google AI Studio** (`gemini.google.com`, `aistudio.google.com`)
- **DeepSeek** (`deepseek.com`)
- **Perplexity** (`perplexity.ai`)
- **Meta AI** (`meta.ai`)
- **Chatbot Arena** (`arena.lmsys.org`, `arena.ai`)
- **Grok** (`grok.com`)
- **Mistral Chat** (`chat.mistral.ai`)
- **Microsoft Copilot** (`copilot.microsoft.com`)
- **Hugging Chat** (`huggingface.co/chat`)
- **Qwen** (`qwen.ai`)
- **Kimi** (`kimi.com`)
- **Z.ai** (`z.ai`)
- **OpenRouter** (`openrouter.ai`)
- **Groq** (`groq.com`)
- **Xiaomi MiMo AI Studio** (`aistudio.xiaomimimo.com`)
- **MiniMax Agent** (`agent.minimax.io`)

---

## ✨ Features

- **Swiss Industrial Telemetry & CRT Command Matrix**: Matte Onyx background substrate (`#08090d`), monospaced JetBrains font stack, Cyber Cyan (`#00E5FF`) focus rings, Aviation Red (`#FF3333`) execute CTAs, and sharp 90-degree industrial borders.
- **Single Phosphor Focus Ring**: Enforces `outline: none !important` globally and uses a single high-contrast Cyber Cyan border glow (`#00E5FF`) to eliminate double-ring focus glitches.
- **Consolidated SVG Icon System**: 100% SVG icon system (`src/icons.ts`) using `createElementNS` with zero emoji dependency for strict anti-slop frontend standards.
- **Spatial Dual-Pane Command Layout**: 2-column workspace featuring a left Telemetry HUD (live ASCII context meter `[||||||||....] 42%`, file breakdown stats, quick preset chips `[ALL]`, `[CODE]`, `[DOCS]`, industrial dropzone) and a right Tree Matrix workspace.
- **Trusted Types & Zero Dependencies**: Pure imperative DOM construction (`createElementNS` and native helpers) with zero `innerHTML` usage to run safely under Google Trusted Types policies (`gemini.google.com`, `aistudio.google.com`).
- **Dynamic Filtering & Ingestion**: Retains all ingested files in memory while dynamically applying ignore lists, hidden file rules, and binary settings during render/upload.
- **Unicode-Safe Markdown Chunking**: Auto-splits large codebases into structured markdown chunks (`codebase_part_N.md`), prepends a master `codebase_manifest.md` with custom prompt instructions, and prevents UTF-16 surrogate pair splitting.

---

## 🚀 Installation

1. Install a userscript manager such as **Tampermonkey** or **Violentmonkey**.
2. Install or update the compiled userscript from [dist/codebase-uploader.user.js](dist/codebase-uploader.user.js).

---

## ⌨️ Shortcuts & Usage

- **Toggle Panel**: `Alt+Shift+U` (or `⌥⇧U` on macOS). Hotkey letter can be customized in Settings.
- **User Script Menu**: Trigger via Tampermonkey extension menu (`Toggle Codebase Uploader`).

---

## 🛠️ Development

Powered by [Bun](https://bun.sh/).

```bash
bun install     # Install dependencies
bun run test    # Run Vitest unit test suite (31 tests across 5 test files)
bun run tsc     # Typecheck codebase
bun run build   # Build distribution bundle (dist/codebase-uploader.user.js)
```

---

## 📄 License

[GPL-3.0-or-later License](LICENSE)
