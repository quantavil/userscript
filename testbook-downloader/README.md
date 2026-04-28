# Testbook Downloader

A powerful and robust userscript designed to seamlessly crawl, extract, and convert full Testbook.com question papers into clean, beautifully formatted Markdown files.

## Features

*   **Comprehensive Extraction**: Automatically navigates through sections and pagination to extract every question, its options, and the detailed solution.
*   **MathJax Support**: Safely extracts MathJax formulas and converts them into standard LaTeX `$...$` and `$$...$$` syntax for proper rendering in any Markdown viewer.
*   **Table Normalization**: Handles complex, ragged HTML tables, converting `colspan` correctly to satisfy GitHub-Flavored Markdown (GFM) requirements.
*   **Surgical Clean-up**: Automatically removes UI clutter (e.g., report buttons, avatars, tracking pixels) before conversion, ensuring the output is strictly educational content.
*   **Dynamic Polling Engine**: Reliably handles slow connections and lazy-loading pages by dynamically observing DOM changes instead of using fragile, fixed timeouts.
*   **Caching Optimizer**: Prevents heavy, redundant Markdown re-parsing on unchanged DOM elements, keeping the script lightweight and performant even for massive tests with over 300 questions.
*   **Floating UI**: Provides a sleek, unobtrusive Floating Action Button (FAB) that shows real-time progress of the extraction process.

## Installation

1. Install a userscript manager like **Violentmonkey** or **Tampermonkey** in your browser.
2. Build the script by running `npm run build` or `bun run build`.
3. Load the generated userscript file from the `dist/` directory into your userscript manager.

## Usage

1. Navigate to a Testbook question paper (e.g., in Review mode or Active test mode).
2. Wait for the page to fully load.
3. Click the floating **Download** button in the bottom right corner of the screen.
4. The script will automatically jump through the sections and extract the data.
5. Once finished, a file named `Testbook_Paper.md` will be downloaded automatically.

## Development

This project is built with TypeScript and Vite.

*   **Install Dependencies**: `bun install`
*   **Dev Server**: `bun run dev`
*   **Build**: `bun run build`

## License

ISC License.