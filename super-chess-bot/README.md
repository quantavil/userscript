# Super Chess Bot

Version **12.1.1** — fixes post-game reports ending in checkmate or stalemate.

A GPL-3.0-or-later browser userscript for local chess analysis and move automation in standard player games on Chess.com and Lichess.

[![Multi-site install](https://img.shields.io/badge/Install-bundle.user.js-success?logo=tampermonkey)](dist/bundle.user.js)
[![Chess.com install](https://img.shields.io/badge/Install-chesscom.user.js-orange?logo=chess.com)](dist/chesscom.user.js)
[![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)

## What it does

- Offers **Madman · max aggression**, an optional aggression-first policy with attacking candidate discovery and occasional evaluation concessions up to 120 cp.
- Runs Stockfish locally in a worker for standard chess and Chess960 games.
- Reads and submits standard moves through each site's controller integration. Automation starts disabled.
- FEN-keyed premoves with no intentional delay: normal mode combines recapture chains, book replies and six opponent branches; Madman prepares early attacks and up to four additional captures of offered pieces.
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
3. **Apply the risk envelope.** Allow an estimated concession of up to 120 cp against the best analyzed candidate. The same 120 cp ceiling applies every turn, with no cooldown. Preserve known winning mates and exact tablebase results. Incomplete, unknown, mixed-depth or shallow baseline comparisons retain the engine move.
4. **Discover additional moves.** Rank legal moves outside the baseline by immediate attacking features and propose up to four. An enabled opening book can contribute a hyper-aggressive suggestion, but it must be searched. Re-evaluate the proposals alongside the original engine move in one restricted search, using up to 75% of the time still available. Require a complete same-depth batch at depth six or deeper, a stable baseline evaluation and compliance with the risk envelope before replacing the existing choice.
5. **Optionally check bait.** At turn allocations of at least 400 ms, remaining time can probe legal captures of the selected offered piece, to depth ten at most. “Bait checked” requires at least depth six and an estimated improvement of 100 cp for us if the opponent takes the offer. The probe uses the opponent's score perspective correctly; it annotates the selected move and does not inflate its root evaluation or predict human behavior.
6. **Validate and submit.** Recheck the current game and position, display the chosen PV/evaluation, and use the existing site adapter and move-confirmation path. Failed optional work falls back to a usable result; cancellation discards stale work.

The 120 cp limit and style weights are experimental tuning, not guarantees of soundness or preserved engine strength. Optional searches share the turn deadline, but feature computation, graceful worker stop/drain and browser scheduling can exceed the search allocation. No full-game aggression, sacrifice-quality or strength benchmark has been established. The [verification record](docs/madman-verification.md) includes unit/integration checks and a small native-engine smoke test.

### Interaction with other controls

| Control | While Madman is enabled |
| --- | --- |
| Target Elo | Deliberate weaker-move sampling is bypassed; Madman owns final selection. |
| Blunder shield | The Elo shield is bypassed; Madman's own risk and mate rules apply. |
| Opening book | Hyper-aggressive book suggestions require engine evaluation; instant book dispatch is suspended. |
| Premove | Enables early attacking replies, six predicted branches plus up to four offered-piece capture branches, and deeper upgrades. Valid cache hits dispatch without another search or intentional delay. |
| Background ponder | Madman premove preparation runs on the opponent's clock when Premove is on, even if Background ponder is off. With Premove off, background analysis can still run. |
| Tablebases | A tablebase result that wins the existing race remains authoritative. |

### Madman premoves

Turn on the existing **Premove** control alongside Madman. The goal is maximum aggression and speed. Replies become available in stages:

1. **Planned:** after our move is observed, arm the selected attack's legal PV continuation immediately. Also retain legal ways the opponent can capture the piece we just offered, even if the PV is short.
2. **Prediction:** the opponent-turn depth-three search predicts six moves. Reuse its legal reply continuations immediately to fill empty branches. Their concession is unknown; they cannot replace our already planned attack.
3. **Seed:** each branch's existing three-candidate depth-three search immediately selects an aggressive reply with the same 120 cp allowance. This adds no engine search.
4. **Fast:** compare those candidates plus four extra attacking proposals at depth four and publish the selected attack. Add up to four omitted captures of our offered piece and prepare their replies first, so accepting bait can trigger an immediate punishment. A capture branch is prepared even if ordinary prediction fails. Each speculative search slice has an 80 ms deadline; worker draining can add overhead.
5. **Full:** after breadth, upgrade branches using the six-line Madman baseline and optional attacking discovery, with 80–250 ms allocated per branch.

The cache holds up to eleven entries: six ordinary branches, four additional captures and the independently planned continuation. Priority is full > fast > seed > planned > prediction, with known winning mates protected. All evaluated stages rank attacks within the same estimated 120 cp allowance; there is no cooldown. Depth-three and depth-four search can miss defenses or stronger legal moves. Planned/prediction continuations have no fresh comparison and no claimed cp guarantee. These are deliberate aggression/speed tradeoffs.

The cache checks game identity, full canonical FEN including en passant and draw counters, history, relevant settings and legality. A hit submits through the normal site adapter after the opponent's move is observed; it does not queue a blind native site premove. A miss runs foreground Madman search. With Madman and Premove on, synthetic dynamic timing waits are skipped on both hits and misses. Cached dispatch does not wait for speculative worker drain.

Normal-mode book/recapture/PV premoves remain separate. Madman does not blindly recapture offered pieces. Coverage depends on the opponent's reply and how much preparation finishes; **70% is a target, not a measured hit rate**. See the [research, measurements and trade-offs](docs/madman-improvement-research.md).

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
