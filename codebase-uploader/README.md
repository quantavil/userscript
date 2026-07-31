# ⚡ Codebase Uploader

[![Version](https://img.shields.io/badge/version-1.2.0-blue)](dist/codebase-uploader.user.js)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

An elegant, zero-dependency userscript that packages directories and codebases for AI chats. Features smart markdown chunking, customizable ignore patterns, binary file uploads, and a premium Apple-inspired "Liquid Glass" interface.

---

## Supported Platforms

The userscript runs on and is optimized for the following AI platforms:
- **ChatGPT** (`chatgpt.com`)
- **Claude** (`claude.ai`)
- **Gemini & Google AI Studio** (`gemini.google.com`, `aistudio.google.com`)
- **DeepSeek** (`deepseek.com`)
- **Perplexity** (`perplexity.ai`)
- **Meta AI** (`meta.ai`)
- **Chatbot Arena** (`arena.lmsys.org`,`arena.ai`)
- **Grok** (`grok.com`)
- **Mistral Chat** (`chat.mistral.ai`)
- **Microsoft Copilot** (`copilot.microsoft.com`)
- **Hugging Chat** (`huggingface.co/chat`)
- **Qwen** (`qwen.ai`)
- **Xiaomi MiMo AI Studio** (`aistudio.xiaomimimo.com`)
- **MiniMax Agent** (`agent.minimax.io`)
- **Groq** (`groq.com`)
- **OpenRouter** (`openrouter.ai`)
- **Kimi** (`kimi.com`)
- **Z.ai** (`z.ai`)

---

## Features

- **Liquid Glass Aesthetic**: Translucent frosted-glass panels, custom specular-highlight borders, soft multi-layer depth shadows, and micro-interactions.
- **Zero Dependencies & Google Trusted Types Compatible**: Imperative DOM rendering (`createElementNS` and custom helpers) with absolutely no `innerHTML` injection, rendering cleanly on Google Gemini and Google AI Studio.
- **Smart Directory Chunking & Oversized Splitting**: Auto-splits large codebases into size-limited markdown chunks containing code block file definitions, constructs a master `codebase_manifest.md`, and dynamically chunks individual files exceeding settings limits to prevent LLM rejection.
- **Copy Parts Side Panel**: When copying multi-chunk output, an inline side panel displays each chunk with individual copy buttons for sequential pasting.
- **Custom Manifest Prompt**: Prepend custom instructions to the generated `codebase_manifest.md` for targeted analysis requests.
- **Tag Chip Editors**: Interactive tag-based editors for ignored folders and extensions — add/remove with Enter and click, replacing error-prone comma-separated lists.
- **Shadow DOM Selector Traversal**: Recursively crawls shadow DOM roots of AI chat platforms to locate file input elements, ensuring robust click-to-upload injection.
- **Safeguard Ingestion Limit**: Prompts the user before loading folders or drag-and-drop actions with >5,000 files to avoid browser tab crashes.
- **O(N) Search & Debouncing**: Uses debounced input search and pre-computed O(N) matching to search large repositories instantly without freezing the UI.
- **Local DOM Checkbox Walking**: Updates checked and indeterminate states in-place by traversing parent and children DOM nodes directly, preventing full tree rebuilds and preserving scroll position.
- **Dynamic Size Helper**: Displays a live, formatted size (e.g. `(2.00 MB)`) next to the byte input in settings.
- **Configurable Hotkey**: Customizable trigger key in settings with a dynamically updating header badge (e.g. `⌥⇧U` or `Alt+Shift+X`).
- **OS-Aware Hotkeys**: Automatically adapts modifier labels (`⌥⇧` on macOS, `Alt+Shift+` on Windows/Linux) and keyboard handlers based on the host operating system.
- **Color-Coded File Tree**: Distinct, high-visibility Lucide-style SVG folder and file icons (amber folders, blue documents, green binary paperclips).

---

## Installation

1. Install a userscript manager extension such as **Tampermonkey** or **Violentmonkey** in your web browser.
2. Download or copy the compiled code in [dist/codebase-uploader.user.js](dist/codebase-uploader.user.js).
3. Create a new script in your userscript manager, paste the code, and save it.

---

## Hotkeys & Triggering

- **Toggle Panel**: `Alt+Shift+U` (or `Option+Shift+U` on macOS).
- Custom hotkey letters can be configured inside the **Settings** menu.
- You can also toggle the panel using the extension menu commands.

---

## Development

Requires [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/).

### Setup
```bash
npm install
```

### Dev Mode
```bash
bun run dev
```

### Build User Script
```bash
bun run build        # outputs dist/codebase-uploader.user.js
bun tsc --noEmit     # type check
```

---

## License

This project is licensed under the [MIT License](LICENSE).

