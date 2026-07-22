# ImpexCube Export Duty Structure Exporter

A browser userscript (compatible with Tampermonkey and Violentmonkey) that extracts the **Export Duty Structure** data from ImpexCube for one or more HSN/RITC codes and compiles them into a single consolidated, Obsidian-compatible Markdown document.

## Features

- **Draggable Compact UI**: A glassmorphic dark-theme floating side-panel that can be moved anywhere on screen. Position is persisted across page loads via `localStorage`.
- **Minimize to Pulse Badge**: Collapse the panel into a tiny floating status bubble that pulses in real time to indicate progress (purple for processing, green for success, red for errors).
- **Obsidian Flavored Markdown (OFM)**: 
  - Dynamic YAML properties/frontmatter block.
  - Heading outline structures (`###`) for all table subheaders.
  - Native Obsidian callouts (`> [!warning]`, `> [!danger]`, `> [!info]`) for missing data, scrape failures, or empty tables.
- **Fast AJAX Backend Scraper**: Bypasses slow tab rendering by making direct JSON POST requests to ImpexCube endpoints in parallel using `GM_xmlhttpRequest`.
- **Rate-limit Protection**: Processes codes sequentially with a safe `500ms` delay between HSN codes to prevent IP blocking.
- **Auto Retry**: Automatically retries failed network calls once after a `1.5s` delay before marking as failed.
- **Multiple Domain Support**: Configured to run on `impexcube.in`, `gemini.google.com`, `claude.ai`, `chatgpt.com`, and `grok.com`.

## Quick Start

### 1. Prerequisites
Ensure you have [Bun](https://bun.sh/) installed.

### 2. Build the Project
Run the following build command in the project directory:
```bash
bun run build
```

### 3. Installation
1. Install a userscript manager browser extension (like Tampermonkey or Violentmonkey).
2. Open the built script file at `dist/hsn-details-ext.user.js`.
3. The extension will automatically prompt you to install or update the userscript.

## Usage

1. Open any of the matched sites (e.g. Gemini, Claude, ChatGPT, Grok, or ImpexCube).
2. Open your userscript manager menu and select **Export HSN Duty Details** (or press the custom shortcut to toggle the panel).
3. Paste HSN codes in the text area (separated by spaces, commas, or newlines).
4. Click **Run** to start the extraction.
5. Once finished, click **Download** to download your consolidated `.md` report.

## Development Stack

- **Bundler**: Vite with `vite-plugin-monkey`
- **Compiler**: TypeScript 6
- **Package Manager**: Bun 1.3+
- **License**: MIT
