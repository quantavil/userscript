# Reddit Manager

A browser userscript for bulk-managing your Reddit account: export and import subreddits, leave subscriptions, overwrite & delete visible posts and comments, or navigate to official account deletion.

Everything runs from a floating Shadow DOM readout in the bottom-right of any `reddit.com` page — featuring a 3-cell live dashboard (**Subreddits**, **Posts**, **Comments**) and live **Pause / Cancel** controls.

## Install

Grab `dist/reddit-manager.user.js` and install it in Tampermonkey / Violentmonkey.

```bash
bun install
bun run build     # → dist/reddit-manager.user.js
```

## Actions

| Action | What it does |
| --- | --- |
| **Export** | Downloads `reddit-subreddits-YYYY-MM-DD.json` — name, id, title, subscriber count and NSFW flag per sub. |
| **Import** | Pick a file, confirm the count, and it joins them all. Merges — subreddits you already have are skipped, none are removed. |
| **Refresh** | Re-reads your subscription list and on-demand stats from Reddit. |
| **Leave all** | Unsubscribes from everything. Type the subreddit count to unlock; a backup file downloads first. |
| **Delete visible posts** | Overwrites post body with `.` before deleting from Reddit (up to Reddit's 1,000 item visible history limit). Requires typed count confirmation. |
| **Delete visible comments** | Overwrites comment text with `.` before deleting from Reddit (up to Reddit's 1,000 item visible history limit). Requires typed count confirmation. |
| **Open account deletion page** | Navigates safely to Reddit's official account deletion page (`old.reddit.com/prefs/delete/`) for password confirmation. |

While a bulk run is active, a control bar with **Pause / Resume** and **Cancel** appears:
- **Pause / Resume**: Temporarily pauses the loop mid-run and resumes on click.
- **Cancel**: Cleanly halts the operation after completing the current request and reports untouched items.

---

### Import formats

The parser accepts:

- this script's own export (`{"subreddits": [{"name": "pics"}, …]}`)
- a bare JSON array — of strings or of Reddit API objects (`display_name`)
- Reddit's comma-separated multireddit export
- a plain text list, one per line — names, `r/pics`, `/r/pics/`, or full URLs

Names are normalized and deduped case-insensitively before anything is sent.

## How it works

### Architecture & Modules

- **`src/api.ts` (API Client)**: Handles all direct HTTP communication with Reddit.
  - **In-flight Auth Tracking**: Caches session modhash and username via `meInfo()` using in-flight promise tracking to prevent duplicate auth calls. Only valid successful authentication responses are cached.
  - **Transient Failure Resilience**: `fetchWithRetry` retries `429/500/502/503/504` and thrown network `TypeError`s with exponential backoff + jitter, parsing numeric and HTTP-Date `Retry-After` / `x-ratelimit-reset` headers with a live second-by-second countdown timer.
  - **Deletion Overwrite Verification**: `deleteUserItem()` validates `/api/editusertext` HTTP responses and Reddit API error arrays. If an overwrite fails, an explicit error is thrown instead of deleting the item while claiming it was edited.
  - **Host-relative**: Reads `location.origin`, so it works on `www.`, `old.` and `sh.` without cross-origin calls.
- **`src/portability.ts` (Core Operations)**: Drives all bulk actions and progress tracking.
  - **Error Isolation (`Promise.allSettled`)**: Fetches counts independently using `Promise.allSettled()` so failed endpoints display `—` instead of faking zero counts.
  - **Incremental Commit**: Each request lands server-side the moment it returns. Closing the tab mid-run keeps everything already done and only cancels the remainder.
  - **Throttling & Rate Limit Compliance**: Uses `SUB_PAUSE_MS` (`650ms`, ~92 req/min) for subscriptions and `DELETE_PAUSE_MS` (`1300ms`, ~92 req/min across 2-request overwrite+del ops) to strictly respect Reddit's 100 req/min limit; bails out after 3 consecutive failures (`GIVE_UP_AFTER`) to avoid grinding through broken auth.
  - **Untouched Item Reporting**: Calculates and reports untouched items (`Stopped — X left untouched.`) when cancelled early.
- **`src/panel.ts` (UI & Shadow DOM)**:
  - **3-Cell Live Dashboard**: Renders 3 top stat cells (**Subreddits**, **Posts**, **Comments**).
  - **Shadow DOM Isolation**: Encapsulates styles inside a `ShadowRoot` so page stylesheets can't leak into the panel.
  - **Viewport Scrolling & Accessibility**: Supports `overflow-y: auto` with `max-height` for small mobile viewports. Sets `visibility: hidden` and `aria-hidden="true"` when closed to trap keyboard focus safely.
  - **Safe DOM Element Creation**: Builds modal sheets using native DOM nodes and `.textContent` instead of direct `innerHTML` string interpolation sinks.
  - **Live FAB Progress Ring**: While running, the collapsed FAB displays a live circular progress ring and percentage badge.
- **`src/index.ts` (Entry Point)**: Mounts the UI. No `@grant`, no GM APIs.

## Limitations

- You must be logged in on the Reddit host you're using; writes need your cookie session's modhash.
- Reddit listing APIs cap profile post and comment history to a maximum of 1,000 visible items per endpoint.
- Account deletion requires plain-text password verification on Reddit's backend; the script redirects to Reddit's official settings page rather than prompting for passwords.

## Development

```bash
bun run test     # vitest run (26 unit tests)
bun run tsc      # typescript check
bun run lint     # biome check
bun run build    # vite build → dist/reddit-manager.user.js
```
