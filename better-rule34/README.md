# Better Rule34Video

> **NOTE (user):** `@match` is currently pointed at the placeholder host
> `rule35video.com`. To switch back to Rule34, change the two match lines in
> `vite.config.ts` back to `rule34video.com`, run `bun run build`, and
> reinstall the userscript.

Adds in-sheet minimum rating and view count filters, seamless infinite scroll, viewport preview autoplay, watch history tracking, and ad cleanup.

## What it does

- **Min rating and min views:** two rows of choices at the bottom of the ALL FILTERS sheet, styled like the site's Date and Duration pills. Rating: Any, 50%+, 60%+, 70%+, 75%+, 80%+, 85%+, 90%+, 95%+. Views: Any, 1K+, 5K+, 10K+, 25K+, 50K+, 75K+, 100K+, 250K+, 500K+. They filter the cards on the page right away and are remembered in this browser. Clear all in the sheet resets them too. They apply to cards already loaded. A card whose rating or views can't be read is never hidden.
- **Site filters (untouched):** Type, Quality, Date added, Duration, Sort, Tags, Categories, and Artists stay with the site and run on the server. Its "2 selected" counter and badge count only those.
- **Watch history:** a video counts as watched after about 85% of it has played, or when you mark it. Watched cards are greyed out. History is kept in this browser's localStorage, newest 5,000 videos.
  - **On a card:** a MARK button sits at the top-left of the thumbnail and is always visible. It turns into WATCHED when set.
  - **On a video page:** "Mark watched" sits in the action row, next to Download and Share.
- **Autoplay previews:** muted previews play on cards at least half on screen, on desktop and mobile, with no hover needed. Up to 12 play at once (6 on touch screens), most visible first. A failed clip is retried twice. A clip only shows once it is really playing. Watched cards are skipped. Autoplay starts off when the browser has data saver on. There is no toggle.
- **Auto next page:** infinite scroll with `[ PAGE N ]` separators, using the site's own pagination. It stops after a repeated or empty page.
- **Open in new tab:** a plain left-click opens the video in a new tab. Middle-click and modifier clicks behave as usual.
- **Ad cleaner:** removes sponsored cards, sidebar and footer ads, and header promo buttons.

## Development

```bash
bun install        # or: npm install
bun test           # unit tests
bun run typecheck  # tsc
bun run build      # writes dist/better-rule34.user.js
```

## Smoke test

After a build, `npm i --no-save jsdom && node smoke/run-smoke.mjs` runs the built script against small fixtures in a simulated DOM. It covers the sheet controls, marking and greying, autoplay and retries, auto next page, list swaps, and watch tracking on the video page. It does not test the live site.

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Install `dist/better-rule34.user.js`.
3. Open [rule34video.com](https://rule34video.com/).
