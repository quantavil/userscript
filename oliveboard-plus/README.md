# Oliveboard Plus

A powerful userscript designed to enhance the Oliveboard learning experience. It declutters the user interface, removes intrusive banners and popups, intercepts distracting windows, and allows users to export full mock test questions and solutions into clean Markdown files for offline review.

## Features

- **UI Cleaner**: Automatically hides popups, annoying top carousels, and removes redundant navigation menu items (like Refer & Earn, Success Stories) to give you a distraction-free environment.
- **Smart Window Interceptor**: Prevents "View Solutions" from opening as annoying popups by forcing them to open cleanly in new tabs.
- **Copy to Markdown**: A header-integrated button to copy the current question, options, and solution as structured Markdown to your clipboard.
- **Markdown Exporter**: A floating download button that crawls through test questions asynchronously and extracts questions, options, and solutions into a structured `.md` file for offline review.
- **Enable Copy & Right-Click**: Overrides Oliveboard's restrictions to allow text selection, copying, and right-click context menus.

## Architecture

```
src/
├── main.ts          # Entry point, single MutationObserver, error boundaries
├── converter.ts     # Singleton TurndownService (HTML → Markdown)
├── crawler.ts       # Question extraction & crawling with robust dedup
├── copyMarkdown.ts  # Single-question copy-to-clipboard button
├── ui.ts            # Floating Action Button (FAB) for full download
├── uiCleaner.ts     # Pure handler functions for UI cleanup
└── utils.ts         # Shared helpers (onReady, downloadFile, enableCopy)
```

## Installation

1. Install a userscript manager like **Violentmonkey** or **Tampermonkey** in your browser.
2. Build the userscript using `bun run build`.
3. Locate the generated file at `dist/oliveboard-plus.user.js` and install it into your extension.

## Development

This project uses modern web development tools:
- **Bun** and **Vite** for fast building
- **TypeScript** for robust typing
- **vite-plugin-monkey** for userscript metadata injection
- **Turndown** for HTML to Markdown conversion

### Build Instructions

```bash
bun install
bun run build
```

## License

MIT License.
