# GitHub Advanced Search Builder

A powerful userscript that transforms the GitHub search experience with a minimal "Brutal" UI, advanced query builder, and integrated release detection.

## Features

### 🔍 Advanced Query Builder
*   **Visual Logic**: Build complex queries using `AND` and `OR` fields without needing to remember GitHub's specific search syntax.
*   **Metadata Filters**: Dedicated fields for filtering by **Stars**, **Forks**, **Size**, **Language**, **Extension**, **Path**, and dates (**Created**, **Pushed**).
*   **State Persistence**: The modal automatically parses the current URL to populate fields, making it easy to tweak existing searches.

### 🚀 Release Detection
*   **Instant Verification**: Automatically checks search results for the latest release.
*   **Smart Badges**:
    *   **Green**: Repository has a release (shows version tag & relative date like "v1.0.0 (2d ago)").
    *   **Red**: No release found.
*   **Release Filter**: New "Only with releases" checkbox to hide repositories that don't have published releases.

### 🎨 Minimal "Brutal" UI
*   **Clean Design**: High-contrast, typography-focused interface inspired by brutalist web design.
*   **Dark/Light Mode**: (Currently optimized for Light mode with high contrast elements).
*   **Floating Toggle**: Unobtrusive floating button on the right edge of the screen.
*   **Responsive**: Works perfectly on desktop and mobile.

### ⚡ Performance
*   **Smart Caching**: Caches release information for **24 hours** to minimize API requests and ensure instant loading on revisit.
*   **Dynamic Loading**: Fully compatible with GitHub's Turbo navigation and dynamic content loading (Pagetual support).

## Installation

1.  Install a userscript manager:
    *   **[Violentmonkey](https://violentmonkey.github.io/)** (Recommended)
    *   **[Tampermonkey](https://www.tampermonkey.net/)**
    *   **[Greasemonkey](https://www.greasemonkey.org/)**
2.  **[Click Here to Install](https://raw.githubusercontent.com/quantavil/userscript/master/github-filter/main.js)** (or creates a new script and paste the content of `main.js`).
3.  Refresh GitHub.

## Usage

### Opening the Filter
*   **Click**: Click the floating toggle button on the right side of the window.
*   **Menu**: Use the userscript manager's menu command "Search Filter".

### Building a Search
1.  Open the modal.
2.  Select **Type** (Repositories, Code, Issues, Users, etc.).
3.  Enter keywords in **AND** or **OR**.
4.  Add constraints (e.g., Stars `>1000`, Language `Rust`).
5.  (Optional) Check **Only with releases** to filter out non-released repos.
6.  Click **SEARCH**.

### In Search Results
*   Look for the **Release Badge** next to repository names.
*   Click the **Apply Filter** button (if available) or simply browse.

## License
MIT
