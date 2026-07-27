# Reddit Subscription Manager

A userscript for bulk-managing your Reddit subreddit subscriptions: export them to a file, import them back (on another account, or after a purge), or leave every one of them.

Everything runs from a small floating readout in the bottom-right of any `reddit.com` page — a live count of your subscriptions and the four things you can do to it.

## Install

Grab `dist/reddit-subscription-manager.user.js` and install it in Tampermonkey / Violentmonkey.

```bash
bun install
bun run build     # → dist/reddit-subscription-manager.user.js
```

## Actions

| | What it does |
| --- | --- |
| **Export** | Downloads `reddit-subreddits-YYYY-MM-DD.json` — name, id, title, subscriber count and NSFW flag per sub. |
| **Import** | Pick a file, confirm the count, and it joins them all. Merges — subreddits you already have are skipped, none are removed. |
| **Refresh** | Re-reads your list from Reddit. |
| **Leave all** | Unsubscribes from everything. Type the subreddit count to unlock; a backup file downloads first. |

While a bulk run is going, a **Stop** button appears — it finishes the request in flight and leaves the rest untouched.

Export → leave all → import is a working "start clean, restore later" round trip.

### Import formats

The parser takes whatever you have:

- this script's own export (`{"subreddits": [{"name": "pics"}, …]}`)
- a bare JSON array — of strings or of Reddit API objects (`display_name`)
- Reddit's comma-separated multireddit export
- a plain text list, one per line — names, `r/pics`, `/r/pics/`, or full URLs

Names are normalized and deduped case-insensitively before anything is sent.

## How it works

### Architecture & Modules

The userscript is built with clean separation of concerns:

- **`src/api.ts` (API Client)**: Handles all direct HTTP communication with Reddit.
  - **Modhash Authentication**: Fetches session modhash from `/api/me.json` and attaches `X-Modhash` to write requests.
  - **Transient Failure Resilience**: `fetchWithRetry` retries `429/500/502/503/504` with exponential backoff (2s → 4s → 8s → 16s), honouring numeric `Retry-After` / `x-ratelimit-reset`. Reddit's `500 reddit broke!` is common under load and is not a real failure.
  - **Host-relative**: Reads `location.origin`, so it works on `www.`, `old.` and `sh.` without cross-origin calls.
- **`src/portability.ts` (Core Operations)**: Drives the four primary actions (`Export`, `Import`, `Refresh`, `Leave all`).
  - **One Request Per Subreddit**: `/api/subscribe` resolves a *single* subreddit from `sr`/`sr_name`. A comma-joined batch is accepted with a `200` and then silently applies to at most one of them, so writes are never batched.
  - **Incremental Commit**: Each request lands server-side the moment it returns. Closing the tab mid-run keeps everything already done and only cancels the remainder.
  - **Throttling**: A `350ms` pause between writes (~170/min); persistent 429s back off on their own via `fetchWithRetry`.
  - **Honest Progress**: Failures are counted separately from attempts, so the headline figure tracks subscriptions actually gained or lost — not requests sent.
  - **Import Diffing**: Names already in your list are filtered out before any request goes out.
- **`src/panel.ts` (UI & Shadow DOM)**:
  - **Shadow DOM Isolation**: Encapsulates all panel and FAB styles inside a `ShadowRoot` so Reddit's page stylesheets can't leak into the panel, and vice versa.
  - **Background Execution**: Closing the modal (via `X`, `Escape`, or clicking outside) never interrupts in-flight background operations.
  - **Live FAB Progress Ring**: While a background task is running, the collapsed FAB button displays a live circular SVG progress ring, a numerical percentage badge (e.g. `45%`), and a hover tooltip showing exact progress (`Leaving — 50 of 144`).
  - **Stop**: Appears only mid-run and stays enabled while every other control is disabled. Checked between requests, so it never abandons one in flight.
  - **Fail-fast**: If the first 3 requests all fail identically, it aborts and reports the reason — a broken session is not 144 broken subreddits.
- **`src/index.ts` (Entry Point)**: Mounts the UI. No `@grant`, no GM APIs.

### Workflow Details

1. **Reading**: Paginates up to 60 pages of `/subreddits/mine/subscriber.json` (100 items per page). The result is cached in memory until a write operation invalidates it.
2. **Joining / Leaving**: One POST to `/api/subscribe` per subreddit with `action=sub` or `action=unsub`, `sr_name`, `api_type=json`, and the modhash. **Never `skip_initial_defaults`** — Reddit answers any request carrying it with a bare HTTP 400 error page on both `www.` and `old.`, which is what silently failed every bulk operation before v2.2.0. There's a regression test pinning this.
3. **Safety & Confirmation**: `Leave all` requires typing the exact subreddit count, then downloads a backup file automatically before the first request goes out — so Import can always undo it.

## Limitations

- You must be logged in on the reddit host you're using; writes need your cookie session's modhash, and 403s are reported as unauthenticated errors.
- Works on mobile web (touch targets, safe-area insets, no iOS zoom-on-focus), but a bulk run needs the tab to stay open — backgrounding it on a phone will suspend the loop. Whatever completed stays done.
- Import only *adds* subscriptions — it never removes subreddits omitted from the file. Run `Leave all` first if you want the file to be the exact final state.
- Reddit caps total subscriptions around 5000; a read query covers up to 6000 subreddits.

## Development

```bash
bun run test     # vitest run (19 unit tests)
bun run tsc      # typescript check
bun run lint     # biome check
bun run build    # vite build → dist/reddit-subscription-manager.user.js
```

`src/api.ts` talks to Reddit and holds no UI. `src/portability.ts` holds the four operations and reports through a `Report` interface, so it holds no pixels. `src/panel.ts` implements `Report` and owns every pixel. `src/index.ts` mounts it.
