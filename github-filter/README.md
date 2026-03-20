# GitHub Advanced Search

A powerful userscript that transforms the GitHub search experience with a modern, compact UI, advanced query builder, and intelligent release detection.

## Features

### 🔍 Advanced Query Builder
*   **Visual Logic**: Build complex queries using `AND` and `OR` fields without needing to remember GitHub's specific search syntax.
*   **Metadata Filters**: Dedicated fields for filtering by **Repo**, **Stars**, **Forks**, **Size**, **Language**, **Extension**, **Path**, and dates (**Created**, **Pushed**).
*   **State Persistence**: The modal automatically parses the current URL to populate fields, making it easy to tweak existing searches.

### 🚀 Intelligent Release Detection
*   **On-Demand Scanning**: New **"Scan repositories"** toggle allows you to enable or disable release detection on the fly.
*   **Smart Filtering**: Use the **"Only with releases"** checkbox to automatically hide repositories that haven't published any releases.
*   **Real-time Badges**:
    *   **Green**: Repository has a release (shows version tag & relative date like "v1.0.0 · 2d ago").
    *   **Red**: No release found.
    *   **Filtered**: Clearly marks repositories that were hidden due to lack of releases.

### 🎨 Modern Compact UI
*   **Streamlined Design**: A compact, sidebar-style modal that stays out of your way while providing full search power.
*   **Native Dark Mode**: Fully compatible with GitHub's native light/dark themes and Dark Reader.
*   **Floating Toggle**: A subtle, circular floating button at the bottom right for instant access.
*   **Responsive**: Optimized for both desktop and mobile browsing.

### ⚡ Performance & Reliability
*   **Smart Caching**: Caches release information for **24 hours** to minimize API requests.
*   **Background Processing**: Uses concurrent scanning to ensure results load quickly without freezing the page.
*   **Technical Native**: Built using GitHub's design tokens for a seamless, "first-party" look and feel.

## Installation

1.  Install a userscript manager:
    *   **[Violentmonkey](https://violentmonkey.github.io/)** (Recommended)
    *   **[Tampermonkey](https://www.tampermonkey.net/)**
2.  **[Click Here to Install](https://raw.githubusercontent.com/quantavil/userscript/master/github-filter/main.js)**.
3.  Refresh any GitHub search page.

## Usage

### Opening the Filter
*   **Floating Button**: Click the circular search icon at the bottom right corner.
*   **Menu Command**: Access "Search Filter" via your userscript manager's menu.

### Building a Search
1.  Open the modal and select the **Type** (Repositories, Code, etc.).
2.  Enter keywords in **And** (all must match) or **Or** (any can match).
3.  Add specific constraints (e.g., Stars `>1000`).
4.  **Control Scanning**:
    *   Enable **Scan repositories** to fetch release info.
    *   Enable **Only with releases** to hide non-released repos (requires scanning).
5.  Click **Search** or press **Enter**.

### Browsing Results
*   Release tags are automatically added below repository names.
*   Tags are clickable and link directly to the latest release page.

## License
MIT
