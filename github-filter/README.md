# GitHub Advanced Search (v7.0)

A powerful userscript that transforms the GitHub search experience with a modern, premium responsive UI, advanced query builder, custom filter presets, and intelligent release detection.

## Features

### 🔍 Advanced Query Builder (Improved in v7.0)
*   **Visual Logic**: Build complex queries using `AND` and `OR` fields without needing to remember GitHub's specific search syntax.
*   **Robust Multi-value Parsing**: Supports comma/space-separated values in fields (e.g. searching multiple repos or specifying languages like `python, -html` to include/exclude).
*   **Shorthand Qualifier Support (New!)**: Parses both standard and shorthand qualifiers (e.g., matching `lang:js` for language and `ext:md` for extension) when loaded into the builder.
*   **Numeric Ranges**: Enter numeric criteria like `stars: >500 <1000` or `100..500` without syntax compilation errors or incorrect quote wrapping.
*   **State Persistence**: The modal automatically parses the current URL search parameters (including positive/negative exclusions) to populate fields.

### 💾 Custom Filter Presets (Refactored UI)
*   **Create Presets**: Save your current search configurations with custom names (e.g., "Type-1 Filter" or "Rust Repos").
*   **Active Badges**: Visual indicators summarize the search options included in each saved preset.
*   **Improved Card Layout (New!)**:
    *   **Search**: Instantly execute search with the preset's parameters.
    *   **Load to Builder**: Load a preset into the Filter Builder tab so you can modify it before searching.
    *   **Top-Right Delete**: Easily delete presets via a clean cross icon in the top right of the card, preventing layout clutter.
*   **Persistence**: Automatically saved and persisted in `localStorage`.

### 🚀 Intelligent Release Detection & Rate Limit Protection
*   **On-Demand Scanning**: Toggle release detection on/off.
*   **Smart Filtering**: Use the **"Only with releases"** checkbox to automatically hide repositories that haven't published any releases.
*   **Rate Limit Protection (New!)**: Detects HTTP `429 Too Many Requests` responses and implements a **60-second cooldown** to prevent further requests, displaying a warning badge ("Rate Limited") and auto-retrying outstanding items when the block expires.
*   **Robust Link Extraction (Improved!)**: Uses browser-native URL parsing and checks against a comprehensive blacklist of reserved routes (such as topics, organizations, login, pricing) to prevent false release checks.
*   **Transient Cache Protection**: Caches release info for **24 hours** but avoids caching transient network failures.

### 🎨 Modern Responsive UI (Premium Design)
*   **Dynamic Theme Sync (New!)**: Automatically syncs the search modal theme when the user changes GitHub's page mode (light/dark) in real time without a page reload.
*   **Native Dark Controls (New!)**: Implements `color-scheme` properties to force browser-native controls (select dropdown options, checkboxes, scrollbars) to match the dark theme context.
*   **Adaptive Badges**: Release badges adapt their text, border, and background color contrast dynamically for high readability in both dark and light modes.
*   **Slide-out Drawer Layout**: On desktop, the modal presents as a sleek, non-intrusive sidebar drawer (380px wide) transitioning from the right.
*   **Mobile Bottom Sheet**: On mobile devices (screen width ≤ 768px), the modal automatically shifts to a premium bottom sheet layout sliding up from the screen bottom.
*   **Micro-animations**: Interactive transitions, rotations on hover for close and theme icons, and floating action button rotations.

## Installation

1.  Install a userscript manager:
    *   **[Violentmonkey](https://violentmonkey.github.io/)** (Recommended)
    *   **[Tampermonkey](https://www.tampermonkey.net/)**
2.  **[Click Here to Install](https://raw.githubusercontent.com/quantavil/userscript/master/github-filter/main.js)**.
3.  Refresh any GitHub search page.

## Usage

### Opening the Filter
*   **Floating Button**: Click the circular search icon at the bottom right corner (designed to avoid blocking core GitHub elements).
*   **Menu Command**: Access "Search Filter" via your userscript manager's menu commands.

### Creating & Using Presets
1.  Set up your search filters in the **Filter Builder** tab.
2.  Click **Save Preset** in the footer.
3.  Enter a name for your preset in the **Saved Presets** tab and click **Save**.
4.  Apply, edit, or delete saved filters directly from the list.

## License
MIT
