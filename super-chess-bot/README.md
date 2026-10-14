# Super Chess Bot

A GPL-3.0-or-later browser userscript for local chess analysis and move automation in standard player games on Chess.com and Lichess.

[![Multi-site install](https://img.shields.io/badge/Install-bundle.user.js-success?logo=tampermonkey)](dist/bundle.user.js)
[![Chess.com install](https://img.shields.io/badge/Install-chesscom.user.js-orange?logo=chess.com)](dist/chesscom.user.js)
[![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)

## What it does

- Runs Stockfish locally in a worker for standard chess and Chess960 games.
- Reads and submits standard moves through each site's controller integration. Automation starts disabled.
- Instant 0 ms FEN-keyed premove engine combining own-turn recapture-chain steering, opening book replies, and an opponent-turn Multi-Branch Ponder Table (up to 4 branches).
- Shows up to three Multi-PV engine lines with colored arrows, persistent across plies, optional opening-book choices, and a local scoresheet with PGN export.
- Offers an on-demand post-game report. Its search runs to depth — depth 18 by default, settable from 10 to 26 — and only starts once the adapter reports a finished game.
- Queries the Lichess Syzygy service for eligible standard positions with up to seven pieces. Lookups race local search, use a 256-entry in-memory cache keyed by full FEN, and keep DTZ (distance to zeroing) separate from DTM (distance to mate). The first usable result wins; a valid local search result returns without tablebase grace time.
- Provides Ghost Mode for streaming. It hides the panel and board overlays; the closed Shadow DOM only encapsulates panel UI and does not promise undetectability.

The completed [premove plan](docs/superpowers/plans/2026-10-14-hybrid-premove-engine.md), [refactor plan](docs/superpowers/plans/2026-10-13-reliability-and-architecture.md), and [execution ledger](docs/superpowers/plans/2026-10-13-execution-ledger.md) record the changes and verification.

See the [support matrix](docs/support-matrix.md) for site scope and move-observation limits, and the [architecture notes](docs/architecture.md) for module responsibilities.

## Install

1. Install Tampermonkey or Violentmonkey.
2. Install [the multi-site bundle](dist/bundle.user.js) for Chess.com and Lichess, or [the Chess.com build](dist/chesscom.user.js) for Chess.com only.
3. Open a standard player game, wait for **Ready**, then enable automation.

For Lichess, configure the userscript manager to inject into the page context. In Violentmonkey, enable **Settings → Advanced → Synchronous page mode** and reload the page.

> [!WARNING]
> **Mobile Firefox & Lichess CSP**: Firefox for Android does not support synchronous `webRequestBlocking`, preventing userscript managers from patching CSP headers or nonces. Because Lichess enforces a strict nonce-based `<meta>` Content Security Policy, userscript managers on Firefox for Android cannot inject into the required page context and will report *"Could not inject script"* (or fail to capture the round controller).
>
> **Mobile recommendations:**
> - **Chromium-based mobile browsers**: Use a browser with extension support like Kiwi Browser, Lemur, or Cromite, where Violentmonkey or Tampermonkey can inject normally.
> - **Chess.com**: Works on mobile browsers without this restriction, as Chess.com does not enforce the same meta CSP.
> - **Firefox Nightly / Fennec / Mull**: If `about:config` is accessible, toggling `security.csp.enable` to `false` disables CSP enforcement globally.


## Development

From this directory, run:

```sh
bun install --frozen-lockfile
bun run check
```

The check runs Biome, TypeScript, Knip, Vitest, and both production builds. Run it locally before committing; this project has no hosted CI.

The [browser verification notes](docs/browser-verification.md) record results from earlier builds, including PyChess-era runs. Treat those results as historical observations, not current platform support or calibrated Elo evidence.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) and the pinned engine resource notices in the generated userscript headers.
