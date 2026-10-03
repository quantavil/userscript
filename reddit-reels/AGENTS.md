# AGENTS.md

Guidance for work on **Reddit Reels** (`reddit-reels`). Read README.md first for the architecture.

## Ground rules

- **Separate overlay, not a restyle.** The reel renders its own DOM inside a shadow root (`#rr-reel-host`). Never restyle Reddit's feed into slides: Reddit's markup differs by device and that approach broke on mobile (v2). Reddit's page is only a data source, hidden with `html.rr-open body { display: none }` while the reel is open.
- **Mobile first.** Design and test at phone size (Pixel 7 emulation) first; desktop gets a centered phone-shaped column.
- **One `<video>`.** `media/player.ts` owns a single shared video element that moves into the active slide. Do not create per-slide videos: it reintroduces audio bleed and breaks the iOS "first gesture unlocks sound" behaviour. The only other media element is the muted, never-attached preloader.
- **Iframes only on the active slide.** YouTube/Streamable embeds and the RedGifs fallback can't be paused reliably; they are mounted for the active slide only and removed on leave.
- **Mount radius.** Only slides within `MOUNT_RADIUS` of the active one keep images/iframes/backdrops. Keep it small; phones run out of memory.

## Data

- Posts come from `<shreddit-post>` attributes (`post-title`, `author`, `score`, `comment-count`, `permalink`, `post-type`, `content-href`, `domain`) and the inner `<shreddit-player>` (`packaged-media-json`, `src` HLS, `poster`, `caption-url`). The player tag is `shreddit-player` (not `-2`).
- Pagination uses Reddit's own `faceplate-partial[slot="load-after"]` URL. Fetched posts are inserted into Reddit's live feed before the partial, and the partial is replaced by the next one. Never call Reddit's `.json` API.
- Mobile `a[slot="full-post-link"]` points at `applink.reddit.com` (opens the app). Build post URLs from `permalink` (`postUrl()`).

## Network constraints (measured on live reddit.com)

- Reddit CSP: `connect-src` and `media-src` allow only Reddit hosts plus `blob:`; `frame-src` allows youtube, youtube-nocookie, streamable and redgifs; `img-src` allows any https.
- `media.redgifs.com` returns 403 for a reddit.com Referer.
- So RedGifs API and media go through `GM_xmlhttpRequest` (`@connect` api/media.redgifs.com) and play from `blob:`. Temporary tokens are device/IP-bound: on 401, refetch the token (max 2 retries).
- `v.redd.it` HLS sends `Access-Control-Allow-Origin: *`; `packaged-media.redd.it` mp4s include audio.

## Navigation

- Opening pushes a history entry (`{ ...state, rrReel: true }`); `popstate` without it closes the reel. `history.scrollRestoration` is `manual` while open, so closing can land on the last watched post.
- Reddit may turn `location.assign(postUrl)` into an in-page navigation. The resume marker (`@reddit-reels/resume` in sessionStorage) survives that and reopens the reel when the user returns to the same feed path; navigating anywhere else clears it.

## Code style

- Vanilla TypeScript + DOM, no UI framework. Runtime dependency: `hls.js` only (external global via `@require`).
- Escape everything put into `innerHTML` (`escapeHtml`) and pass URLs through `isSafeUrl` before using them in links or iframes.
- Keep `@license MIT`, unminified output (`minify: false`) for GreasyFork.

## Testing

- `bun test tests/unit`: extractor tests run on **real Reddit markup** in `tests/fixtures/feed.html`. Refresh the fixture from a live page when Reddit's markup changes.
- `bun run build && bun run test:e2e`: Playwright against the fixture server. Bundled Chromium can't decode H.264; assert sources and lifecycle, not playback.
- Before claiming playback works, try the build on real Reddit (phone first).
