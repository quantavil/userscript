# Guidely Plus Userscript Design Spec

## Overview
A userscript for Guidely (guidely.in) that re-enables right-click and text selection, and provides a feature to crawl and export full mock tests to a Markdown file. It will be built using modern web tooling (Vite, TypeScript, Bun) similar to the `oliveboard-plus` script.

## Core Features
1. **Enable Right-Click & Copy**: Remove CSS `user-select: none` restrictions and intercept JavaScript events that block context menus and copying.
2. **Full Test Exporter**: A Floating Action Button (FAB) that triggers a UI-driven crawler to iterate through test questions, extract the content (Question, Options, Solution), convert them to Markdown, and prompt a `.md` file download.

## Architecture & File Structure
Inside the `guidely/` directory:

- `package.json`, `vite.config.ts`, `tsconfig.json`: Project configuration matching `oliveboard-plus`.
- `src/main.ts`: Entry point. Runs the right-click unlocker and injects the UI components.
- `src/ui.ts`: Manages the injection of the Floating Action Button for the download feature.
- `src/crawler.ts`: Contains the logic to find question/option/solution containers, extract HTML, interact with 'Next' buttons, handle delays/DOM mutations, and aggregate the test data.
- `src/converter.ts`: Configures and exposes a Turndown singleton for HTML to Markdown conversion.
- `src/utils.ts`: Utility functions for overriding copy restrictions, waiting for DOM elements, and triggering file downloads.

## Data Flow (Crawler)
1. User clicks the Export FAB.
2. `crawler.ts` reads the current question DOM.
3. Content is parsed and passed to `converter.ts` (HTML -> Markdown).
4. `crawler.ts` triggers a click on the "Next" or equivalent pagination button.
5. Wait for the DOM to update (using MutationObserver or sleep).
6. Repeat until the "Next" button is disabled or end of test is reached.
7. Combine all Markdown segments and use `utils.ts` to trigger a file download.

## Error Handling & Testing
- **Error Handling**: The crawler must gracefully handle missing DOM elements (e.g. if a question has no solution or image fails to load) by appending a warning in the markdown rather than crashing.
- **Testing**: Manual testing on Guidely mock tests to ensure the DOM selectors accurately target the Angular components.
