# Better Search

Clean up your search results! A high-performance, lightweight userscript that enhances your browsing experience by highlighting websites you love and dimming or hiding the ones you dislike.

## Supported Search Engines
*   Google (`google.com`, `google.co.jp`, etc.)
*   Bing (`bing.com`)
*   DuckDuckGo (`duckduckgo.com`)
*   Brave Search (`search.brave.com`)
*   Yandex (`yandex.ru`, `yandex.com`)

---

## Features

### 1. In-Place Hover Action Controls (Desktop)
Hovering over a search result displays a control bar in the top-right corner of the item:
*   **Star (Preferred)**: Pin / highlight the domain.
*   **Slash (Disliked)**: Dim / hide the domain based on your filter mode.

### 2. Mobile Swipe-to-Action Gestures (Mobile/Touch)
Swiping left on any search result card slides it horizontally to reveal action buttons:
*   **Star (Star/Like)**: Highlight the domain.
*   **Block (Ban/Dislike)**: Dim or hide the domain.
*   *Optimized touch features*: Elastic rubber-banding, tap-to-close, and automated backdrop color detection.

### 3. Live Settings Panel
Click the floating settings cog or userscript menu command to configure:
*   **Filter Mode**: Fade (reduce opacity) or Hide (completely collapse with click-to-reveal text row).
*   **Preferred & Disliked Lists**: Live-editable domains. Implicitly supports wildcards (`*.domain.com`).
*   **Import / Export**: Easily backup or sync your lists.

---

## Domain Import & Export

Better Search provides flexible, native backup and synchronization options in the **Import/Export/Sync** tab.

### JSON Import/Export Format
The script reads and writes domain configuration in the following standard JSON format:
```json
{
  "liked": [
    "wikipedia.org",
    "github.com"
  ],
  "disliked": [
    "w3schools.com",
    "pinterest.com"
  ]
}
```

---

## Backup & Synchronization Modes

You can backup and synchronize your lists using local files or GitHub Gist sync.

### Mode 1: Local Backup
*   **Import File**: Merge a `.json` backup file with your active lists (additive and deduplicated).
*   **Export File**: Download your current lists as a `.json` file.

### Mode 2: Quick Import from Gist
Import domains from a public raw Gist URL without needing a token:
1. Locate the raw URL of any public Gist containing the domains JSON (e.g. `https://gist.githubusercontent.com/username/gist_id/raw/domains.json`).
2. Paste it into the **Import from Gist** field and click **Import** to fetch and merge new domains (additive merge).
> [!NOTE]
> The input is pre-populated by default with a recommended latest public list raw URL:
> `https://gist.githubusercontent.com/quantavil/12880b87fd1ebd497469455d1898088b/raw/domains.json`

### Mode 3: Full Gist Sync (Requires GitHub Token)
Keep multiple browsers in sync with your own Gist as the central source of truth:
*   **Token Setup**: Create a GitHub Personal Access Token (PAT) with the `gist` scope and enter it under Gist Sync.
*   **Gist ID Linkage**: Enter your existing Gist ID, or leave it blank—the first **Push** will automatically create a new private Gist on your account and link it.
*   **Pull (Replace)**: Completely overrides your local lists with the domains stored in your Gist.
*   **Push (Merge)**: Pushes local lists back to your Gist. Before updating GitHub, it runs a background pull and performs a union merge to prevent overwriting concurrent updates from other browsers.
*   **Auto-sync**: Toggle this option to automate synchronization:
    *   Automatically runs an initial pull on browser start.
    *   Automatically pulls and merges remote updates every **1 hour**.
    *   Automatically pushes local domain updates back to Gist (**10-second debounce** to prevent API spam while editing).

---

## Development

### Setup
Ensure you have [Bun](https://bun.sh/) installed, then set up the project:
```bash
bun install
```

### Run Local Development Server
Starts a hot-reloading development server:
```bash
bun run dev
```

### Build Production Bundle
Compiles and bundles the userscript into a single file at `dist/better-search.user.js`:
```bash
bun run build
```
