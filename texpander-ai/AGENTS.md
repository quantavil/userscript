# AGENTS — Texpander AI

## Overview
Texpander AI is a high-performance text expansion and context-aware AI text manipulation userscript. It provides global abbreviation expansion palettes (`Alt + P`), selected text AI transformations via Google Gemini (`Alt + G`), and a distraction-free Neo Zen dark UI.

## Structure
```
texpander-ai/
├── src/
│   ├── main.ts      # Hotkey event listener bindings and initialization
│   ├── core.ts      # Selection detection, text replacement, and expansion engine
│   ├── api.ts       # Gemini API client (Gemini 2.5 Flash Lite) with GM_xmlhttpRequest
│   ├── config.ts    # User settings, expansion dictionary, and prompt templates
│   ├── types.ts     # Configuration, shortcut, and AI action interfaces
│   └── ui/          # Neo Zen dark floating palettes, modal dialogs, and settings
├── package.json     # Subproject dependencies and build scripts
├── vite.config.ts   # vite-plugin-monkey userscript bundler config
└── README.md        # User documentation and hotkey guide
```

## Conventions & Architectural Constraints
- **Global Keybinding Management**: Global hotkeys (`Alt+P` for expansion palette, `Alt+G` for AI prompt palette) must attach cleanly and prevent conflicts with existing input/textarea keystrokes or browser native hotkeys.
- **Active Input Insertion**: Use `document.execCommand('insertText')` or direct input/textarea value mutation with `InputEvent` dispatching to ensure synthetic input updates trigger reactive framework bindings (React, Vue, Svelte).
- **Gemini AI Integration**: AI requests must be routed via `GM_xmlhttpRequest` to bypass CORS restrictions. Model defaults to `gemini-2.5-flash-lite` with user-configurable API keys stored via `GM_setValue`.
- **Zero Runtime Dependencies**: The bundled UI uses vanilla TypeScript DOM elements and scoped CSS without heavy frameworks.
- **Build & Verification**:
  - Runtime: `bun`
  - Build command: `bun run build` (outputs to `dist/`)
  - Dev server: `bun run dev`
