# Oliveboard Plus

A powerful userscript designed to enhance the Oliveboard learning experience. It declutters the user interface, removes intrusive banners and popups, intercepts distracting windows, and allows users to export full mock test questions and solutions into clean Markdown files for offline review.

## Features

- **UI Cleaner**: Automatically hides the Eid/Maynia popups, annoying top carousels, and removes redundant navigation menu items (like Refer & Earn, Success Stories) to give you a distraction-free environment.
- **Smart Window Interceptor**: Prevents "View Solutions" from opening as annoying popups by forcing them to open cleanly in new tabs.
- **Markdown Exporter**: Features a beautiful, floating download button that crawls through test questions asynchronously and extracts the questions, options, and solutions into a structured `.md` file for your notes.

## Installation

1. Install a userscript manager like **Violentmonkey** or **Tampermonkey** in your browser.
2. Build the userscript using `bun run build`.
3. Locate the generated file at `dist/oliveboard-enhancer.user.js` and install it into your extension.

## Development

This project uses modern web development tools:
- **Bun** and **Vite** for fast building
- **TypeScript** for robust typing
- **vite-plugin-monkey** for userscript metadata injection
- **Turndown** for HTML to Markdown conversion

### Build Instructions

\`\`\`bash
bun install
bun run build
\`\`\`

## License

MIT License.
