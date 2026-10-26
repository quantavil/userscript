# Reddit Manager

Version **3.3.2**.

A userscript for exporting, importing, and cleaning up your Reddit account. Works on `www.reddit.com`, `old.reddit.com`, and `sh.reddit.com` using your existing login.

Install [dist/reddit-manager.user.js](dist/reddit-manager.user.js) in Tampermonkey or Violentmonkey, then open **Reddit Manager** from the bottom-right button.

## Tools

- **Export** downloads your subscriptions as a dated JSON file.
- **Import** joins subscriptions from a JSON, text, or comma-separated list. Existing subscriptions and duplicate names are skipped. Review the count before joining.
- **Refresh counts** reads subscriptions and visible post/comment history. `—` means unread or unavailable; history counts cover only items returned by Reddit.
- **Account cleanup** contains leave-all, post/comment deletion, and a link to Reddit's account deletion page. Bulk destructive actions require typing the item count. Leave-all downloads a backup first.

The panel adapts to phone, tablet, and desktop viewports, uses Reddit orange with neutral surfaces and follows your system's light/dark theme, and supports keyboard navigation. Confirmations stay inside the scrollable panel. Bulk operations show progress with **Pause / Resume** and **Cancel** controls. Pause and cancel take effect between items; the current item and its request retries can finish first. Completed changes remain in place.

## Import formats

```json
{"subreddits": [{"name": "pics"}, {"name": "AskReddit"}]}
```

Also accepts arrays of names or objects with `display_name`, and lists such as `pics, r/AskReddit, https://www.reddit.com/r/programming/`. Names are validated and deduplicated case-insensitively.

## Deletion behavior

Reddit exposes up to 1,000 visible posts and 1,000 visible comments through profile listings. This script cannot promise to find all account history. Editable text is overwritten with `.` before deletion; an overwrite failure prevents that item's deletion. Link posts have no editable body and skip the overwrite. Reddit API errors count as failures even when the HTTP response is successful. Overwriting does not remove third-party archives or copies.

Requests run sequentially with delays and backoff for temporary failures. Three consecutive item failures stop a batch and report confirmed deletions and untouched items. When an operation cannot be confirmed, check those items on Reddit: their text may already have been overwritten or the deletion may have succeeded despite a lost response. Account deletion opens Reddit's official page; this script never asks for your password.

## Development

```bash
bun install
bun run test
bun run tsc
bun run lint
bun run build
```

Use `bun run test` for the Vite+ test runner and its happy-dom environment. `bun test` does not initialize that environment.

Source: `api.ts` handles requests and listings; `portability.ts` owns parsing and bulk operations; `panel.ts` renders the Shadow DOM UI with `panel.css`. No runtime dependencies, remote fonts, or GM permissions are required.

## 3.3.2

Export and import refresh subscriptions before use. Blank imports receive a clear message, and uncertain deletion results now identify affected items and explain that they may already have changed.

License: GPL-3.0-or-later.
