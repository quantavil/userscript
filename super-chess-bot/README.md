# Super Chess Bot

A GPL-3.0-or-later browser userscript for local chess analysis and move automation in standard player games on Chess.com and Lichess.

[![Multi-site install](https://img.shields.io/badge/Install-bundle.user.js-success?logo=tampermonkey)](dist/bundle.user.js)
[![Chess.com install](https://img.shields.io/badge/Install-chesscom.user.js-orange?logo=chess.com)](dist/chesscom.user.js)
[![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)

## What it does

- Offers **Madman · max aggression**, an optional aggression-first policy with attacking candidate discovery and occasional evaluation concessions up to 120 cp.
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


## Madman · max aggression

Enable **Madman · max aggression** below **Blunder shield** in the panel. It defaults off and remembers your choice. Stockfish 19 Lite remains the search engine; Madman changes candidate discovery and final selection to favor attacking positions. Quiet moves can qualify when their searched continuation builds sustained pressure.

### How a turn works

1. **Establish a baseline.** Search up to six MultiPV lines. With a turn allocation of at least 80 ms, baseline search receives 65% of the allocation, reserving the rest for discovery. Below 80 ms, use the baseline alone.
2. **Measure attacking pressure.** Legally replay each candidate. Count geometric attacks into the enemy king's surrounding squares, attacks by cheaper pieces on more valuable targets, pawn contact and checks. Also sample pressure after our next two moves in the legal searched PV. These style points rank candidates; they do not change engine centipawn scores or prove a tactic.
3. **Apply the risk envelope.** Allow an estimated concession of up to 120 cp against the best analyzed candidate. After a submitted move with a concession above 50 cp is observed, limit the next three own-turn move numbers to 50 cp. Repeated analysis and recommendations do not consume cooldown. Preserve known winning mates and exact tablebase results. Incomplete, unknown, mixed-depth or shallow baseline comparisons retain the engine move.
4. **Discover additional moves.** Rank legal moves outside the baseline by immediate attacking features and propose up to four. An enabled opening book can contribute a hyper-aggressive suggestion, but it must be searched. Re-evaluate the proposals alongside the original engine move in one restricted search, using up to 75% of the time still available. Require a complete same-depth batch at depth six or deeper, a stable baseline evaluation and compliance with the risk envelope before replacing the existing choice.
5. **Optionally check bait.** At turn allocations of at least 400 ms, remaining time can probe legal captures of the selected offered piece, to depth ten at most. “Bait checked” requires at least depth six and an estimated improvement of 100 cp for us if the opponent takes the offer. The probe uses the opponent's score perspective correctly; it annotates the selected move and does not inflate its root evaluation or predict human behavior.
6. **Validate and submit.** Recheck the current game and position, display the chosen PV/evaluation, and use the existing site adapter and move-confirmation path. Failed optional work falls back to a usable result; cancellation discards stale work.

The 120/50 cp limits and style weights are experimental tuning, not guarantees of soundness or preserved engine strength. Optional searches share the turn deadline, but feature computation, graceful worker stop/drain and browser scheduling can exceed the search allocation. No full-game aggression, sacrifice-quality or strength benchmark has been established. The [verification record](docs/madman-verification.md) includes unit/integration checks and a small native-engine smoke test.

### Interaction with other controls

| Control | While Madman is enabled |
| --- | --- |
| Target Elo | Deliberate weaker-move sampling is bypassed; Madman owns final selection. |
| Blunder shield | The Elo shield is bypassed; Madman's own risk and mate rules apply. |
| Opening book | Hyper-aggressive book suggestions require engine evaluation; instant book dispatch is suspended. |
| Premove | Unchecked instant replies, recapture fallbacks and chain steering are suspended. The saved toggle resumes in normal mode. |
| Background ponder | Analysis can still run during the opponent's turn; that does not mean an instant reply is armed. |
| Tablebases | A tablebase result that wins the existing race remains authoritative. |

### Why premoves are suspended

Normal premoves can steer toward a recapture chain, arm a reply from the opponent-turn PV, or immediately recapture an offered piece. Those replies are not selected by Madman for the resulting own-turn position. A matching position and legal reply do not establish that the move preserves an attacking idea or satisfies the current cooldown. Automatically recapturing can also undo an intentional sacrifice.

Suspending those paths gives each ordinary move one final policy and avoids stale replies bypassing its safeguards. The cost is losing instant responses, spending more of our own clock and potentially reducing bullet performance. It also means the visible Premove preference can be on while Madman prevents arming/dispatch.

A future staged approach is **forced replies first, then replies evaluated by Madman for specific opponent branches**. The current implementation does not include either stage. Forced single-legal-move replies offer limited coverage with little choice risk. Branch-specific replies offer more speed, but each needs an own-turn baseline and Madman selection before caching; reading the second move of an opponent PV is insufficient. One serialized worker makes broader coverage compete with search depth and pondering time. See [premove trade-offs](docs/madman-premove-options.md).

See the [design](docs/superpowers/specs/2026-10-15-madman-design.md) and [implementation plan](docs/superpowers/plans/2026-10-15-madman-mode-pipeline.md).

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
