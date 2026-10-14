# Madman verification — 2026-10-15

`bun run check` passed: 458 tests across 36 suites, Biome, strict TypeScript, Knip and both production bundles. Independent read-only review found three Important issues (incomplete baseline comparisons, inherited bound scores, newer mate versus older snapshots); test-first fixes are recorded in the implementation plan. `git diff --check` passed.

## Native engine smoke

The packaged `stockfish@19.0.1/bin/stockfish-19-lite-single.js` ran under Node, driven by the real UciClient through a Bun subprocess adapter. The worker was prewarmed. Each turn used six baseline lines at 65% of its configured budget, then the real Madman policy and restricted-search helper with the remaining deadline. One worker was reused across cases; hash/history effects make these illustrative observations rather than repeatable performance bounds.

| Position | Budget ms | Engine move | Selected move | Estimated loss cp | Total wall time ms |
| --- | ---: | --- | --- | ---: | ---: |
| Initial position | 100 | d2d4 | d2d4 | 0 | 93 |
| White attacking setup | 100 | f3e5 | c4b3 | 53 | 116 |
| Black attacking setup | 100 | d7d5 | f6e4 | 39 | 97 |
| Queen versus pawns | 100 | d2d8 | d2d8 | 0 | 72 |
| Initial position | 400 | e2e4 | e2e4 | 0 | 382 |
| White attacking setup | 400 | d2d3 | f3e5 | 56 | 371 |
| Black attacking setup | 400 | f6e4 | f6e4 | 0 | 375 |
| Queen versus pawns | 400 | d2d8 | d2d8 | 0 | 263 |

FEN fixtures:

```text
rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w - - 4 5
rnbq1rk1/pppp1ppp/5n2/2b1p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5
6k1/5ppp/8/8/8/8/3Q1PPP/6K1 w - - 0 1
```

All eight selections were legal, and recorded estimated concessions stayed inside the configured envelope. No case produced “bait checked.” The 116 ms case shows that feature work, stop/drain and process scheduling can exceed a 100 ms search allocation. These four positions do not establish strength, aggression frequency, sacrifice quality or live browser latency. No live games, site move submissions or stronger-reference audit were performed.

## Premove extension native smoke (2026-10-15)

The implemented `prepareMadmanPremoves` was exercised through the real UciClient against installed stockfish@19.0.1 lite-single under Node, driven from Bun. One prewarmed worker retained hash state. Opponent-root FEN: `rnbq1rk1/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b - - 4 5`. No game-history input was supplied in this smoke.

Six depth-4 fast selections became ready at 115, 167, 199, 219, 244 and 267 ms from preparation start. Their estimated candidate-pool concessions were 0, 70, 82, 65, 0 and 92 cp. Five full upgrades at depths 9–10 became ready at 443, 542, 639, 739 and 834 ms, with estimated concessions 53, 27, 72, 118 and 36 cp. One branch retained its fast entry because the fuller search did not produce an acceptable completed upgrade. Earlier completed replies remained available while later work ran.

Scratch harness: `/tmp/super-chess-madman-premove-live.ts`. This is one native position, not browser/site latency, hit-rate, aggression quality or strength evidence. No stronger-reference audit was performed. The 70% coverage objective remains unmeasured. Planned PV continuations deliberately carry unknown next-turn concession. Current foreground and evaluated premove comparisons use 120 cp each turn, without the initial build's 50 cp cooldown.

Final local verification for this extension: **475 tests across 37 suites**, Biome, strict TypeScript, Knip and both production builds passed via `bun run check`. Independent review identified and verified the fix for newer positive mate evidence hidden by older/incomplete comparison snapshots. Scheduler tests include an evaluated cache hit, a planned hit while canceled analysis remains unresolved, history mismatch and synthetic timing-wait bypass on a miss. Pure tests cover six-branch breadth before refinement and explicit context/evidence handling.

## Early aggressive replies and capture punishments — 2026-10-15

The user approved implementing the follow-up proposal and reiterated maximum aggression/speed rather than human-like play. Runtime now publishes empty-branch prediction continuations with unknown concession, then aggressive choices from complete depth-three seed batches, then depth-four/full upgrades. After observed own movement, scoped capture hints add up to four missing captures of the offered piece ahead of the ordinary six branches. Hints survive short PVs and optional prediction failure; both-color en passant is included. Cache bound is eleven; source priority protects selected attack continuations from raw prediction, evaluated replies from weaker stages, and positive mates from nonmating replacements.

Verification: `bun run check` passed with 486 tests across 37 suites, Biome, strict TypeScript, Knip, and both production builds. New regressions cover early publication before interrupted searches, 120 cp depth-three aggression, short-PV capture hints, incompatible history/FEN, prediction failure with known captures, cache evidence/mate priority, both-color en passant, and scheduler dispatch of a prepared capture branch without a foreground search. Independent review identified the en-passant omission; a failing regression reproduced it, the helper was corrected, and the reviewer confirmed both colors and no remaining important findings. `git diff --check` passed.

Native smoke of the integrated implementation: Dragon-11 diagnostic selection `...Bg4`, using real UciClient + installed Stockfish Lite, supplied the scoped omitted `Qxg4` branch. The cache published its `...Nxg4` reply at depth 3 in 108 ms, depth 4 in 164 ms, and depth 9 in 446 ms. Six ordinary prediction continuations were published in 63–82 ms; the full preparation call finished in 993 ms. These times include actual cache publication, unlike the earlier event-only research prototypes. They are one native observation, not browser latency, guaranteed timing or a live premove coverage measurement. No attack-weight changes, additional preferences, cooldown or 50 cp rule were introduced. The implementation and both rebuilt outputs are included in release 12.1.0.


## Post-game report terminal-score correction — 12.1.1

The supplied 52-ply Lichess game replays legally and ends at `3r4/p6p/1p4kB/4PN2/6P1/5b2/PP3P1P/3rK1R1 w - - 0 27`. Real Stockfish returns `info depth 0 score mate 0` followed by `bestmove (none)`, with no PV. The UCI client's score-provenance check incorrectly required the PV's first move to equal `(none)` and discarded the valid terminal score, causing `Report position has no valid evaluation`.

The client now preserves the actual terminal evaluation while retaining PV/move matching for playable moves. Missing scores remain missing. Checkmate and stalemate regressions and a full supplied-game report test failed before the correction and pass afterwards. A real Stockfish native run of all 53 report positions at depth 10 completed all 52 plies with no error in 2041 ms; this is not browser timing or a default-depth performance benchmark. Full `bun run check`: 489 tests across 37 suites, lint, TypeScript, Knip and both production builds passed. Package and built headers are 12.1.1. Included in the 12.1.1 patch release.
