# AGENTS.md

Project guidance for `super-chess-bot`.

## Stack and packaging

- Use Bun for installs, scripts, and tests.
- Build the TypeScript userscript with Vite and `vite-plugin-monkey`; installable outputs are `dist/bundle.user.js` (multi-site) and `dist/chesscom.user.js` (standalone Chess.com build).
- Keep the package, userscript metadata, and project license at GPL-3.0-or-later. Preserve Stockfish's upstream license notice.
- Stockfish JS and WASM are loaded as version-pinned userscript resources. Keep engine loading in the worker adapter; do not add a page-thread search fallback.
- Keep runtime dependencies small and prefer `chessops`, Preact + Signals, and Valibot for the capabilities they already provide.

## Architecture boundaries

- `sites/types.ts` and `sites/index.ts`: define normalized snapshots and select adapters only for exact supported hostnames.
- `sites/chesscom.ts`, `sites/chesscom-state.ts`, and `sites/chesscom-bridge.ts`: at document start, wrap the `wc-chess-board` custom element's `init`/`createGame` to capture the board controller, mirroring the Lichess bridge. Read FEN, turn, color, orientation, and legality from the controller API (`getFEN`, `getTurn`, `getPlayingAs`, `getOptions`, `isLegalMove`); keep clocks DOM-scraped. Submit through `controller.move` with an object payload `{ from, to, promotion?, userGenerated: true }` and lowercase promotion, reading synchronous `Move`/`IllegalMove` results; reset a stuck `PomotionAreaShowing` chooser via the renderer. The `userGenerated: true` flag is mandatory: omitting it causes Chess.com's game coordinator to treat the move as a local presentation echo, bypassing WebSocket/engine server dispatch and leaving the opponent/bot frozen. No synthetic pointer input or promotion-chooser DOM handling. These private page internals can change with Chess.com frontend updates.
  - **`getHistoryFENS()` is not a ply history and must never be used as `confirmedFens`.** Measured against a live guest game: it holds only the current position, so its length stays at 1 regardless of how many moves have been played, and it flips optimistically inside `move()`. The only source of the true root is `getFingerprints().startingFen`, which is also correct for from-position games. Rebuild history with `replaySanLine(getStartingFen(game), game.getHistorySANs())`, exactly as the Lichess and PyChess adapters do, so `confirmedFens` keeps its documented root-at-index-zero shape. Never derive the root from `getHistoryFENS()[0]`; doing so yields a history that starts at the current position with zero moves, which silently disables ply-indexed move confirmation.
  - **`getFEN()`, `getTurn()`, and `getHistorySANs()` all update synchronously inside `move()`**, before the server has seen anything. `getState()` returns `Idle` straight after the call, so the `settled` gate in `read()` gives no protection either. Any acceptance check built on those getters alone will report a move as confirmed that was never sent. Confirmation must be indexed by accepted ply, which only `confirmedFens` from a replayed SAN list can supply.
  - **When a Chess.com game finishes (`isGameOver()` / `getResult()`), `game.getPlayingAs()` flips to `undefined`.** The adapter detects finished status before validating player color, preserves `lastPlayerColor` across the round, and falls back to board orientation on reload so the adapter cleanly returns a `phase: 'finished'` game snapshot. If `playingAs` were checked without this, the ended game would be flagged `ineligible ("Chess.com player color is unavailable")`, failing to trigger the post-game accuracy report pass.
- `sites/pychess.ts` and `sites/pychess-state.ts`: collect PyChess-owned board, accepted FEN, SAN, clock, and result state. Submit through `cg.selectSquare` and the site's legal user-move callback. Never fake trusted events, call `cg.move()`, force legal acceptance, or write to the socket.
- `sites/lichess.ts` and `sites/lichess-bridge.ts`: support standard Lichess player rounds. At document start, wrap `site.asset.loadEsmPage` and `site.asset.loadEsm` so the round initializer's returned controller can be captured. Read accepted steps and the active clock; submit through the controller's `pluginMove` path, with explicit promotion roles. Do not add API integration or direct socket writes. These private page internals can change with Lichess frontend updates.
- `board.ts`: own shared overlays, trusted-input revision, move serialization, Multi-PV colored arrows (Green #1, Cyan #2, Amber #3 via `drawMultiPvArrows`), ephemeral `WeakSet` node tracking (`markBotNode`, `isBotOwnedNode`), and accepted-position confirmation at the requested ply. Keep the `activateElement` chooser helper in `board-input.ts` for PyChess promotion.
- `index.ts`: mount the panel and prewarm the Stockfish worker without waiting for a Chess.com board selector. Automation stays disabled until the user turns it on.
- `controller.ts`: own enable/disable, adapter subscriptions, snapshot identity and phase, human-interruption pause, and explicit resume/retry actions.
- `engine/scheduler.ts`: schedule one current-position search from accepted FEN/history and adapter clock, race asynchronous Syzygy tablebase lookups concurrently with Stockfish, reject stale identity/FEN results, and confirm move execution before reporting success. Carry exact position/history into ponder reuse; do not queue speculative premove chains or repeatedly retry an unchanged position.
- `engine/timing.ts`: Ex-Gaussian entropy timing model combining Box-Muller Gaussian baseline delays with an exponential tail scaled by Shannon entropy over candidate move centipawn scores, humanizing move delay variance according to tactical branching complexity.
- `engine/tablebase.ts`: asynchronous Syzygy 7-piece tablebase client querying `https://tablebase.lichess.ovh/standard` with negamax outcome ranking (checkmate > win minimization > stubborn loss defense) and DTM/DTZ metrics. Raced concurrently with local search in `scheduler.ts` with a timeout of `remainingMs / 4`.
- `engine/throttle.ts`: simulated rating throttling via softmax probability selection over top Multi-PV candidate lines, paired with an active Blunder Shield ("Co-Pilot" mode) preventing tactical drops exceeding 150 centipawns.
- `engine/book.ts`: fast opening book with 5 selectable styles (Hyper-Defensive, Defensive, Balanced, Aggressive, Hyper-Aggressive), 117 keyed positions, plies 1–8.
  Keys are matched on placement, side to move, and castling rights only: the host en passant field is ignored on both sides, because Chess.com returns a raw controller FEN (ep after every double push) while the Lichess and PyChess adapters pass `canonicalFen()` (ep only when a capture is available). Matching that field exactly left only the start position reachable on two of three sites. Do not reintroduce it.
  The module builds `EPD_INDEX` at load time and throws on a duplicate ep-insensitive key, so two entries for one placement cannot silently shadow each other. No candidate may be an en passant capture.
  Add positions by replaying the line with chessops and giving candidates as SAN; hand-written FENs and UCI squares are easy to get wrong (wrong from-square, wrong side to move, blocked piece). `tests/book.test.ts` asserts legality in context, host-convention equivalence, hub presence, and a mean-depth floor per style.
- `engine/uci-client.ts`: serialize UCI searches with `MultiPV = 3`, promote a matching `go ponder` search, reuse a completed result only for an exact FEN/history/depth match, preserve alternative lines across non-PV progress updates, and drain canceled `bestmove` responses before starting a different position. Match both FEN and UCI history because repetition state affects evaluation. UCI messages have no request IDs, so do not attach a late response to a newer position.
- `engine/worker-client.ts`: load pinned userscript resources and manage the persistent worker. Terminate it only for recovery.
- `history.ts` and `engine/san.ts`: use chessops for legal history, notation, and position validation; do not recreate chess rules or a search engine.
- `game-history.ts` and `pgn.ts`: live game move tracking records both White and Black plies with elapsed move timing estimates. Elapsed time is computed from site clock deltas when active, with wall-clock duration fallback. The Activity panel renders a paired move scoresheet with zebra striping, a per-row active-move pill, and a dedicated right-hand time gutter whose bars are scaled to the longest time in the game, so "opponent spent three times longer here" is visible without reading a number. The Copy button formats the game into standard PGN with headers, `{ [%emt H:MM:SS.s] }` timing tags, and client-side browser telemetry notice.
- `report/accuracy.ts`, `report/aggregate.ts`, and `report/analyzer.ts`: post-game accuracy report. Use Lichess's published open formulas (`winPercent`, `moveAccuracy`) rather than copying Chess.com's proprietary ones, and label the output a local estimate; the panel does. Classification buckets by centipawn loss (`classifyByLoss`) into inaccuracies, mistakes, and blunders alongside average centipawn loss. `report/analyzer.ts` searches each position in the line exactly once and pairs the results afterwards, and it runs only when the snapshot phase is not `live`, because it shares the single serialized UCI client with move search. Its fixed depth 18 / 350 ms budget must not be replaced with `BotState.botPower` or `BotState.moveTime`: the live budget is tuned to stop early under a clock and is far too shallow to separate an inaccuracy from a mistake. `cancelGameReport` and `resetGameReport` are the only ways to stop it.
- `panel.tsx`, `panel.css`, and `ui.ts`: keep the panel in closed Shadow DOM. Support Stream-Safe Ghost Mode (`setGhostMode`) hiding all canvas overlays, eval bars, and floating controls (accessible via GM menu). Include interactive SVG `<EvalTrendGraph />` displaying centipawn momentum trajectory, header Guide (`?`), and Auto-retry resilience. Rendering displays state; move execution stays in the controller and scheduler.

## Site support matrix

- Transports: Chess.com controller `move`, PyChess square selection, Lichess controller `pluginMove`.
- Promotion: Chess.com explicit lowercase character, PyChess q/r/b/n chooser + Ctrl override, Lichess explicit role. Live queen promotion verified on PyChess and Lichess ([iYTQx601](https://lichess.org/iYTQx601), `2.a8=Q`, `11.Qb8#`); Chess.com controller promotion is API-verified and awaits live-game confirmation (recorded Chess.com wins used the retired gesture transport).
- Chess.com move confirmation reads the replayed SAN list, not `getHistoryFENS()`. Before this was fixed, every Chess.com move was "confirmed" against an optimistic local position that no server had accepted, and ply-indexed history was silently disabled. Re-verify with a manager-installed build after any Chess.com frontend change.
- Premove is off on all sites. Background ponder, opening book, and clock-aware budgets work on all sites.
- The panel shows a transport note per site; there is no input-method setting.
- Standard chess and From-Position custom starts are eligible. Other variants, Chess960, and correspondence stay ineligible where the adapter checks them.

## Tests and verification

- Run `bun run check` before committing. It runs Biome, strict TypeScript, Knip, Vitest, and both production builds (`dist/bundle.user.js` and `dist/chesscom.user.js`).
- Use `bun run test` for the Vitest suite. The native `bun test` runner does not support the suite's Vitest mocking API.
- Keep tests that assert observable behavior at the board adapter, controller, scheduler, settings, and UCI boundaries. Remove a test only when it is demonstrably misleading, redundant, or no longer exercises supported behavior; do not delete tests merely to make a failure disappear.
- Prefer focused tests over copied chess-engine implementations. Test cancellation, stale-result rejection, move confirmation, settings recovery, and worker failure behavior.

## Browser and strength checks

- Use a dedicated Chromium session and the production bundle installed through a userscript manager. Test Chess.com, PyChess, and Lichess player rounds; a puzzle, spectator page, or open lobby is not a player round.
- For the PyChess acceptance setup, select CHESS, turn Chess960 off, use real time, set minutes slider index 4 and increment 0 for 1+0, and select White by title. Confirm `Ready` and disabled automation before starting the clock.
- Cover orientation, promotion, enable/disable during search, new-game/reset, trusted human interruption, recovery, replay/live return, and accepted-position events. PyChess input must use legal square selection and confirmation from the accepted FEN/history.
- For a minimum-time strength check, use the lowest supported move budget (100 ms) and a 1+0 game clock when available. Record the opponent's displayed rating, result, plies, bot budget, and our clock at start/end.
- Report engine initialization, warmed search, input, and confirmation separately. A single game shows one result at that opponent's displayed rating; it does not establish a stable Elo rating or bullet reliability.
- Browser tests are for inspection and verification and are not part of the bot's move loop.

## Performance and audit notes

- Board overlays and the panel use cloaked nodes tracked through an ephemeral `WeakSet` (`isBotOwnedNode`, `markBotNode`). The board observer ignores their mutations so evaluation rendering cannot invalidate game state or trigger another board scan. All detectable attributes (`data-gabibot-overlay`, `data-engine-layer`) and element IDs are purged. The panel mounts in closed Shadow DOM (`attachShadow({ mode: 'closed' })`).
- Resolve the active board from rendered candidates, preferring one with the game's FEN API. Never use the first selector match without checking visibility and game ownership.
- `attachToBoard(null)` must also clear the move watcher. Preserve the request to watch so a later board can reattach.
- Serialize move input. Catch each mutation-listener error independently, and ignore UCI `info string` records when parsing search data.
- Syzygy 7-piece tablebase requests are raced concurrently against Stockfish with a clock-proportional timeout (`remainingMs / 4`). Cold REST latency measures ~160–300 ms (p50: 219.4 ms, mean: 300.1 ms), and in-memory LRU cache hits resolve in <0.01 ms. The race ensures tablebases never delay move execution beyond local engine search or risk clock flags.
- Pondering searches an exact predicted position and does not queue a move. Do not add speculative premove input based only on the PV: Chess.com can execute a queued move after an unexpected reply. Any future premove path needs a verified safe-response policy, a cancellation path, and tests for both site acceptance and fallback.
- Keep completed ponder reuse one-entry and exact-match only. A mismatch in position, history, or depth must run a fresh search.

### Recorded minimum-budget sample (2026-10-11)

Post-fix Chromium runs used White/Guest, 1+0, 100 ms per move, and depth cap 30. Each game started with 1:00 on our clock:

| Displayed opponent rating | Result and finish | Plies | Our clock at finish | Our move time |
| --- | --- | ---: | ---: | ---: |
| 2400 Master | Win, 79.Rc2# | 157 | 0:41 | 19.1 s |
| 2700 Grandmaster | Win, 70.Qh5# | 139 | 0:43 | 17.1 s |
| 2900 Super Grandmaster | Win, 61.Bf5# | 121 | 0:46 | 13.4 s |
| 3200 Maximum | Win, 77.Qfh7# | 153 | 0:41 | 19.3 s |
| 3200 Maximum | Win, 71.g8=Q# | 141 | 0:44 | 16.0 s |
| 2900 Super Grandmaster | Win, 73.b8=Q# | 145 | 0:23 | 36.3 s |

Both post-fix 3200 games completed, including one promotion. One warmed 2900 run started after the panel reported `Ready`; across 60 White move timestamps, Chess.com showed 13.4 seconds total, 0.2 seconds median, 0.3 seconds p95, and 1.6 seconds maximum. The initial White move had no separate timestamp. These UI stamps are rounded and include browser scheduling and move acceptance, not just engine search. The highest observed win is 3200 (2/2 games); this small, non-monotonic sample is not a calibrated Elo estimate. See [`docs/browser-verification.md`](docs/browser-verification.md) for the run notes and timing breakdown.

The latest warmed 2900 run also completed, but used 36.3 seconds on our clock across 72 recorded move stamps (median 0.2 s, p95 1.3 s, maximum 1.5 s; the first move had no separate stamp). This conflicts with the earlier 13.4-second sample, so the under-5-second whole-game target is not met or demonstrated. Treat the clock samples as variable observations, not a guaranteed speedup.

### Recorded Syzygy endgame tablebase latency sample (2026-10-12)

Live REST lookups against `https://tablebase.lichess.ovh/standard` measured across 10 endgame placements (3 to 7 pieces):

| Test Position | Pieces | FEN | Best Move | Outcome | Eval | Network Latency |
| :--- | :---: | :--- | :---: | :---: | :---: | ---: |
| KQK | 3 | `8/8/8/8/8/4k3/8/4K2Q w - - 0 1` | `h1d5` | win | `+M5 (Tablebase)` | 834.0 ms (cold TLS) |
| KRK | 3 | `8/8/8/8/8/4k3/8/4K2R w - - 0 1` | `h1h4` | win | `+M10 (Tablebase)` | 162.9 ms |
| KPK | 3 | `8/8/8/8/4k3/8/4P3/4K3 w - - 0 1` | `e2e3` | draw | `0.00 (Tablebase Draw)` | 161.6 ms |
| KQKR | 4 | `8/8/8/8/8/4k1r1/8/4K2Q w - - 0 1` | `h1h6` | win | `+M23 (Tablebase)` | 262.6 ms |
| KBBK | 4 | `8/8/8/8/8/4k3/8/4KB1B w - - 0 1` | `f1e2` | draw | `0.00 (Tablebase Draw)` | 219.4 ms |
| KBNK | 4 | `8/8/8/8/8/4k3/8/4KB1N w - - 0 1` | `h1f2` | win | `+M31 (Tablebase)` | 164.2 ms |
| Lucena Position | 5 | `1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1` | `c1d1` | win | `+M21 (Tablebase)` | 172.9 ms |
| Philidor Position | 5 | `8/8/8/8/3k4/1r6/4K3/5R2 b - - 0 1` | `b3b2` | draw | `0.00 (Tablebase Draw)` | 238.3 ms |
| KRPKRP | 6 | `8/8/4k3/4p3/4P3/4K3/8/r6R w - - 0 1` | `h1a1` | win | `+M13 (Tablebase)` | 214.6 ms |
| 7-piece Complex | 7 | `8/8/2k5/3p4/3P4/2K5/1B6/1N3n2 w - - 0 1` | `b1d2` | win | `+M13 (Tablebase)` | 570.9 ms |

- **Latency Summary**: Minimum: 161.6 ms · Median (p50): 219.4 ms · Mean: 300.1 ms · p95: 834.0 ms · In-memory LRU cache hit: <0.01 ms.
- **Race Safety**: `scheduler.ts` executes tablebase lookups concurrently with Stockfish; if network exceeds the clock threshold (`remainingMs / 4`), local engine search returns immediately without stalling or flagging on time.

