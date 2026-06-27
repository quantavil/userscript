# ⚡ Codebase Uploader

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
- **Smart Directory Chunking**: Auto-splits large codebases into size-limited markdown chunks containing code block file definitions and constructs a master `codebase_manifest.md`.
- **Manifest Prompt Customization**: Specify custom instructions or guidelines prepended directly into the manifest output.
- **Interactive Ignored Lists**: Clean, modern tag chips editor in settings for filtering folders (`node_modules`, `dist`, etc.) and extensions (`.lock`, `.log`, etc.).
- **Hotkeys**: Configurable hotkey toggle (defaults to `Alt+Shift+U` or `Option+Shift+U`) which dynamically updates the header hotkey badge.
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
npm run dev
```

### Build User Script
```bash
npm run build
```
This outputs the ready-to-use userscript file at `dist/codebase-uploader.user.js`.

---

## License

This project is licensed under the [MIT License](LICENSE).
