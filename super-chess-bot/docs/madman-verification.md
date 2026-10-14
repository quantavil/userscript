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
