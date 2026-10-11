# better-wallhaven

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

Userscript for `wallhaven.cc` listing grids: resizable thumbnails, per-thumb data badges with SVG actions, in-thumbnail detail sheets, zero-network browsing, opt-in lightweight API details.

## Install

Requires Tampermonkey or Violentmonkey. Build then install `dist/better-wallhaven.user.js`:

```bash
bun install
bun run build
```

## Features

- Grid size slider (160–480px, persisted as `whGridSize`) — every thumbnail resizes via CSS `--wh-cell`. Lives in the native searchbar; floating fallback on pages without one.
- Every thumbnail gets a persistent strip below it: resolution, favorites, file type, category/purity dots — no hover needed, touch-safe.
- Always-visible SVG buttons under each thumb: download full, fullscreen lightbox, open page, favorite (proxies the native toggle), details expander.
- Clicking the image opens the wallpaper page externally (native new-tab link).
- Tapping details loads one ~4KB `api/v1/w/<id>` request inline; browsing alone costs 0 bytes. Revisits show the known size instantly, then upgrade to full props/tags in the background.

## Data budget

| Action | Cost |
|---|---|
| Browse / select thumbnails | 0 bytes |
| HD info (first time per wallpaper) | ~4KB JSON |
| Revisit cached wallpaper | 0 bytes |
| Full image view / download | 4–13MB (the file itself) |

Legacy 32KB HTML scraping is fallback-only when the API fails.

## Develop

```bash
bun install
bun test       # unit tests
bun run typecheck
bun run build  # outputs dist/better-wallhaven.user.js
```

Sources in `src/`: `main` (wiring), `thumbs` (below-strip host), `detail` (HD block builder), `controls` (searchbar grid control), `extract` (free DOM parse), `api` (4KB JSON + fallback), `cache`, `download`, `grid` (keyboard nav), `lightbox`, `icons` (SVG), `styles`.

## License

MIT — see `LICENSE`.
