# 📱 Reddit Reels

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](https://bun.sh/)
[![Build: Vite](https://img.shields.io/badge/Build-Vite%20%2B%20TypeScript-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)

A mobile-first userscript (**Violentmonkey** / **Tampermonkey**; Firefox Android, Kiwi, Safari/Orion, desktop) that turns any Reddit feed into a full-screen, swipeable reel: one post per screen, one stream with sound, Reddit video and RedGifs, native voting.

Tap the **Reels** button on a feed. The reel opens over Reddit; the phone's Back button (or ✕ / `Esc`) closes it and leaves you on the post you were watching.

---

## How it works (and why)

The reel is its **own full-screen view** (shadow DOM, own CSS), not a restyle of Reddit's page. Restyling Reddit's markup breaks whenever the markup differs per device, which is what happened in v2. Reddit's page stays underneath, hidden, as the **data source**.

| Piece | How |
|---|---|
| Posts | Read from Reddit's rendered `<shreddit-post>` attributes (title, author, score, media). |
| More posts | Same HTML endpoint Reddit's feed uses (`faceplate-partial[slot=load-after]`, e.g. `/svc/shreddit/community-more-posts/…?after=`). New pages are inserted into Reddit's real feed, so they are live posts. No `.json` API, no rate-limit traps. |
| Reddit video | Direct `packaged-media.redd.it` mp4 (has audio) when Reddit provides one (re-read when the slide opens, since Reddit fills it in late); otherwise the HLS stream through the full `hls.js` build (Reddit keeps audio in a separate playlist, which the light build can't play). Native HLS is only a last resort: Chrome claims support but fails Reddit's streams. If a source fails, the next one is tried. |
| RedGifs | RedGifs API → mp4 → blob. Requests go through `GM_xmlhttpRequest` because Reddit's CSP blocks redgifs hosts and RedGifs blocks Reddit referrers. If that fails, the slide falls back to RedGifs' own player iframe. |
| YouTube / Streamable | Their embed player, mounted only while the slide is on screen. |
| Audio | **One shared `<video>`** moved into the active slide. Only one stream can exist, so no audio bleed. Once your first tap has played it, mobile browsers keep allowing sound on later slides. |
| Voting | Clicks Reddit's own vote buttons inside the post, so auth and CSRF stay Reddit's. Logged out → a "log in" toast. |
| Comments | Opens Reddit's post page (new Reddit) in a new tab, so the reel keeps its place. |
| Memory | Only the active slide and its neighbours hold images/iframes; far slides are emptied. |
| Swiping | The slide switches only after the scroll settles, and live UI (seek bar, spinner, pulses) sits in a fixed layer above the track. Changing layout inside a scroll-snap track mid-swipe makes browsers snap back, which felt like "swipe twice". |

## Controls

| Gesture / key | Action |
|---|---|
| Swipe up / down, `J` `K`, `↓` `↑` | Next / previous |
| Tap | Play / pause (first tap after a blocked autoplay turns sound on; a ▶ shows when the browser blocked autoplay entirely) |
| Double tap | Upvote |
| Drag the bottom bar | Seek |
| `←` `→` | Gallery image, or seek ±5 s |
| Space | Play / pause |
| `M` | Mute |
| `C` | Captions (Reddit videos that have them) |
| `F` / rail button | Fit ↔ fill screen |
| Back, ✕, `Esc` | Close |

Mute is remembered. Vertical videos fill the screen by default; others are letterboxed over a blurred backdrop.

---

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) (recommended) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`dist/reddit-reels.user.js`](./dist/reddit-reels.user.js) and click **Install**.
3. Open a feed on `https://www.reddit.com/` and tap the orange button.

`hls.js` (full build) is loaded via `@require` from jsDelivr. `@connect` covers `api.redgifs.com` / `media.redgifs.com`; allow it when the manager asks.

---

## Project structure

```
src/
├── index.ts              # Entry
├── app.ts                # FAB on feed routes, open/close, Back button, comments in a new tab
├── core/route.ts         # Feed-route matcher + client-side navigation watcher
├── feed/
│   ├── extract.ts        # <shreddit-post> → Post (video/redgifs/embed/gallery/image/text/link)
│   ├── source.ts         # Posts in the page + next pages via Reddit's load-after partial
│   ├── vote.ts           # Native vote buttons
│   └── types.ts
├── media/
│   ├── player.ts         # The one shared <video>: mp4 → HLS fallback chain, RedGifs blob, mute, captions
│   └── redgifs.ts        # Token, gif lookup, blob download (GM_xmlhttpRequest)
├── reel/
│   ├── reel.ts           # Overlay: snap track + fixed HUD, settle-based activation, gestures, keys, voting
│   ├── slide.ts          # Slide shell + mount/unmount of heavy content
│   ├── reel.css          # Shadow-root styles (mobile first, phone column on desktop)
│   └── icons.ts
├── ui/fab.ts             # Floating Reels button (own shadow root)
└── utils.ts
tests/
├── fixtures/feed.html    # Real Reddit feed markup (video+mp4, video HLS-only, gallery, image, text, link)
├── fixtures/server.ts    # Serves it + build + a fake load-after endpoint
├── unit/                 # Extractor, feed paging, routes, RedGifs/API retry, source choice
└── reel.spec.ts          # Playwright (Pixel 7): open, swipe, unmount, paging, Back, comments tab, keys
```

## Development

```bash
bun install
bun test tests/unit
bun run build            # dist/reddit-reels.user.js (unminified, @license MIT)
bun run test:e2e         # needs the build; PW_CHROMIUM=/path/to/chromium to override the browser
```

The Playwright Chromium has no H.264 decoder, so e2e tests check sources, slides and lifecycle, not actual decoding. Playback with audio was verified separately in Google Chrome against live mobile Reddit (mp4 and HLS slides).

## Known limits

- RedGifs tokens are tied to the requesting network. Very flaky networks can make lookups fail; the slide then uses RedGifs' iframe player.
- Logged-out Reddit hides NSFW feeds and asks to log in for votes.
- The reel reads what Reddit renders; if Reddit renames `<shreddit-post>` attributes, `feed/extract.ts` is the one place to update.

## License

[MIT](LICENSE)
