# Project: Better Search

## Overview
A high-performance, lightweight userscript that enhances the web searching experience by highlighting preferred domains and fading or hiding disliked domains in search results. It is built using TypeScript and uses Vite to bundle the codebase into a single userscript file.

## Structure
better-search/
├── src/
│   ├── core/
│   │   ├── Controller.ts    # Main userscript logic and event routing
│   │   ├── GistSync.ts      # GitHub Gist synchronization logic (pull/push/create)
│   │   └── Store.ts         # User preferences and state manager
│   ├── engines/             # Search-engine specific selectors and query extractors
│   │   ├── index.ts         # Engine detection and registry
│   │   ├── google.ts
│   │   ├── bing.ts
│   │   ├── ddg.ts
│   │   ├── brave.ts
│   │   └── yandex.ts
│   ├── filter/
│   │   ├── Scanner.ts       # Scans the DOM for search result rows and filters them
│   │   ├── StyleSheet.css   # Styles for filtered elements (fading, hiding, inline reveal)
│   │   └── StyleSheet.ts    # Dynamic style insertion helpers
│   ├── overlay/
│   │   ├── HoverOverlay.ts  # Floating hover overlay for star/block quick actions
│   │   └── MobileSwipe.ts   # Touch swipe quick action gestures for mobile
│   ├── ui/
│   │   ├── Panel.ts         # Settings panel DOM constructor (Shadow DOM-based)
│   │   ├── Panel.css        # Styles for the settings panel
│   │   ├── Trigger.ts       # Floating settings button (cog icon)
│   │   └── Trigger.css      # Floating trigger styles
│   ├── config.ts            # Userscript headers and metadata configuration
│   ├── index.ts             # Main entry point initializing Store, Scanner, Controller, and UI
│   ├── types.ts             # General interfaces
│   └── types.d.ts           # Type declarations for userscripts
├── vite.config.ts           # Vite build config with userscript compilation
├── package.json             # Build dependencies and scripts
├── README.md                # Project documentation
├── fmhy_to_json.py          # Python utility to convert FMHY wiki to JSON

## Conventions
- **Component isolation**: Settings UI is rendered within a Shadow DOM to prevent search engine page styles from bleeding in.
- **Inline CSS**: CSS is imported using Vite's `?inline` query and injected into style elements dynamically.
- **Clean state updates**: The `Store` follows a subscriber pattern. The UI registers a listener and completely updates the textarea lists when external changes (like imports) are applied, while checking active user focus to avoid interrupting cursor typing.

## Dependencies & Setup
- Bun is used as the package manager and runtime.
- Build command: `bun run build` outputting to `dist/better-search.user.js`.
- Dev command: `bun run dev` for local hot-reloading development server.

## Critical Information
- CSS classes in UI elements are prefixed with `svf-` to avoid conflicts.
- Local storage or Userscript GM storage is managed via the `Store` class.

## Insights
- Resolved list scalability issues by shifting from dynamic pill creation to assisted textboxes. Using a monospace textarea handles thousands of filters at sub-millisecond speeds. Live wildcard pattern scanners reduce database bloat in-place by suggesting subdomain merges (e.g. `*.wikipedia.org`) with a single click.
- Removed multiple themes (Emerald, Nebula, Tokyo Night) and cleaned up unused selectors/elements to eliminate CSS/TS redundancy, keeping only the Original Classic theme.
- Added interactive Theme Accent Color picker (Emerald, Indigo, Blue, Teal, Rose, Amber) in Settings, styled dynamically with central variables mapping.
- Refactored color accents to follow the DRY principle: defined color hexes/RGBs programmatically in types.ts and applied them uniformly to both document root and Shadow DOM host via applyAccentVariables and removeAccentVariables helpers.
- Implemented a single unified search/filter bar above the domain sections. When active, it swaps raw textareas for a clean list of match items, equipped with inline editing (pencil icon) and direct removal (remove button) to keep edits fully interactive while filtering.
- Restored the floating HoverOverlay design for desktop search results.
- Implemented mobile swipe-to-action gestures for search result rows, positioning action buttons dynamically behind cards using layout offsets and CSS transforms.
- Implemented GitHub Gist Sync: Features one-click Quick Import (always-latest Raw Gist URL, additive merge) and optional Gist Sync (PAT token, push/pull, auto-sync with 5s debounce, periodic 1h pull, pull-before-push union merge to prevent conflict).
- Refined Gist Sync UI/UX: Split the settings panel into 3 evenly-spaced tabs (Domain Filter, Import/Export/Sync, Settings). Auto-sync triggers a union pull immediately when enabled. Registered a Controller-level subscriber that automatically reapplies scanner filters to DOM elements on any background pull.
- Optimized fmhy_to_json.py to process the repo ZIP in memory (no disk extraction) and filter for starred domains (⭐) only, reducing JSON size from 14k+ to ~2.7k domains, and optimized the blocklist override logic using a set lookup on domain suffixes.



## Blunders
- Wildcard match bug: Literal wildcard rules (`*.domain.com`) failed to match subdomains in `Store.matchDomain` due to literal string matching. Fixed by parsing rules and stripping `*.` prefixes.
- Registerable domain grouping bug: TLDs with ccTLDs (like `co.uk`) were incorrectly merged to `*.co.uk`. Fixed by implementing standard SLD+ccTLD heuristic.
- MutationObserver subtree limitation: Container childList-only observer missed lazy-loaded URLs on grandchild mutations. Fixed by watching subtree, attributes, and href filter.
- Store pagehide listener leak: pagehide event listener registered on window was not cleared on destroy. Fixed by keeping handler reference and calling removeEventListener.
- Double-initialization leak: duplicate stylesheets/controllers leaked observers/subscriptions. Fixed by registering controller on window and calling destroy on older instance.
- Debounced settings loss on destruction: `Store.destroy()` dropped settings within the 800ms debounce window. Fixed by flushing pending settings to storage before clearing timers.
- Revealed results memory leak: `Scanner._revealedIds` grew unbounded on infinite-scroll. Fixed by replacing with `WeakSet` of DOM Elements.
- Custom Elements Tree-shaking: Lit components imported only for type casting were completely tree-shaken by Vite. Fixed by importing them for side-effects (`import '../ui/Panel';` and `import '../ui/Trigger';`).
- Text Selection Hang (Ctrl+A): Pressing Ctrl+A selected elements in the Light DOM, causing selection processing hooks on Brave Search to hang. Fixed by placing all UI components inside an isolated Shadow Root attached to the `#svf-shadow-host` wrapper.
- Animation & Transition Lag: Replaced `transition: all` with targeted CSS transitions, added `will-change` GPU layer promotions, deferred textarea `_autoResize` scrollHeight measurements to avoid synchronous reflows, and suspended `HoverOverlay` tracking when panel is open.
- HoverOverlay reconnection leak: Component-scoped event listeners accumulated on document/window and element itself upon disconnect/reconnect cycles. Fixed by managing all connection-scoped listeners and timers via connection-scoped AbortController.
- HoverOverlay disappearing bug: Hovering/clicking overlay buttons caused it to vanish after 350ms because Node.contains() does not traverse shadow boundaries. Fixed by checking this.shadowRoot.contains() in the pointermove handler.
- Path resolution bug: fmhy_to_json.py output default output to current working directory instead of script's home. Fixed by resolving path using script's location.

