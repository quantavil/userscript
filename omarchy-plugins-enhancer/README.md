# Omarchy Plugins Enhancer

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](https://bun.sh/)
[![Build System](https://img.shields.io/badge/Build-Vite%20%2B%20TypeScript-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Install](https://img.shields.io/badge/Install-userscript-2ea44f?style=flat)](https://raw.githubusercontent.com/quantavil/userscript/main/omarchy-plugins-enhancer/dist/omarchy-plugins-enhancer.user.js)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](../LICENSE)

Userscript for [plugins.omarchy.org](https://plugins.omarchy.org/) adding auto pager, direct GitHub repository links on cards, and brutalist seen plugin collapsing.

## Features

- **Brutalist Architecture**: Zero border-radius, stark monospace typography (`var(--mono)`), hard geometric contrast, and solid drop shadows matching the Omarchy Quattro terminal aesthetic.
- **Default Collapse (Strip Cards)**: Seen plugins automatically collapse by default into a sleek, compact 42px single horizontal strip card showing the plugin name, inline truncated description, stats, and repository link.
- **Auto Pager (Infinite Scroll)**: Automatically loads and appends the next page as you scroll down without jumping back to the top.
- **Native Icon-Only GitHub Buttons**: Direct 25x25px square GitHub button on each plugin card matching Omarchy's native action buttons (no text, icon-only with accessible tooltip).
- **Delayed Seen Detection**: Does not grey out cards while you are actively reading them. Marks plugins as seen only after you have scrolled past them by 1-2 cards.
- **Brutalist Control HUD**: Stark rectangular toolbar with segmented mode controls (`DIM` | `HIDE` | `OFF`), Auto Pager toggle, and history reset. Zero emojis.

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run unit and integration tests
bun test

# Build production userscript
bun run build
# Output: dist/omarchy-plugins-enhancer.user.js
```
