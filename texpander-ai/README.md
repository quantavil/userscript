# Texpander AI

Texpander AI is a robust, Neo Zen-styled userscript that supercharges your typing experience across the web. It provides instant text expansion algorithms and integrates an AI model (Gemini 2.5 Flash Lite) for fast, context-aware text transformations like grammar fixing, summarizing, and expanding content. 

This userscript is built with TypeScript and bundled using Vite.

## Features

- **Text Expansion Palette (Alt + P)**: Define custom abbreviations (e.g., `brb` -> `Be right back.`) and trigger them globally.
- **AI Context Menu (Alt + G)**: Highlight text anywhere on the web, hit `Alt+G`, and instantly run AI prompts (Summarize, Fix Grammar, Make Formal) to manipulate your text. Supports custom API prompts.
- **Neo Zen UI**: A beautifully clean, dark, and highly responsive user interface free of sluggish animations—engineered for immediate flow state.
- **Configurable Settings**: Fully customize your AI preferences, API keys, and text expansion dictionary right in the browser.

## Getting Started

### Prerequisites

You will need a userscript manager installed in your browser:
- [Violentmonkey](https://violentmonkey.github.io/) (Recommended)
- [Tampermonkey](https://www.tampermonkey.net/)
- [Greasemonkey](https://www.greasespot.net/)

### Installation

*Since this project is managed by Vite with the `vite-plugin-monkey` plugin, you can install the script locally while developing.*

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Development**
   Runs the Vite development server. Your userscript manager will typically pick up the local file, updating automatically as you make changes.
   ```bash
   npm run dev
   ```

3. **Build target**
   Compile down to a single minified userscript file inside the `dist/` directory.
   ```bash
   npm run build
   ```

Once built, you can drag and drop `dist/texpander-ai.user.js` into your userscript manager to install the production version of the extension.

## Usage

* **Open the Text Expansion Palette**: `Alt + P`
* **Open the AI Prompt Menu**: `Alt + G` (Ideally, select some text before hitting this shortcut).

**Adding your API Key:**
To use the AI text generation features, go to the settings panel (gear icon) in either menu and input your [Google Gemini API Key](https://aistudio.google.com/app/apikey). 

## Technology 

- **TypeScript**: Typed logic and configuration.
- **Vite & vite-plugin-monkey**: Fast builds tailored specifically for userscript compilation and `GM_*` APIs.
- **Native Web Components**: The UI renders directly into the DOM using pure vanilla JS and strictly scoped CSS for maximum compatibility avoiding heavy framework overhead scenarios.
