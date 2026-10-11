# AGENTS.md

Project guidance for `super-chess-bot`.

## Stack and packaging

- Use Bun for installs, scripts, and tests.
- Build the TypeScript userscript with Vite and `vite-plugin-monkey`; the installable output is `dist/bundle.user.js`.
- Keep the package, userscript metadata, and project license at GPL-3.0-or-later. Preserve Stockfish's upstream license notice.
- Stockfish JS and WASM are loaded as version-pinned userscript resources. Keep engine loading in the worker adapter; do not add a page-thread search fallback.
- Keep runtime dependencies small and prefer `chessops`, Preact + Signals, and Valibot for the capabilities they already provide.

## Architecture boundaries

- `sites/types.ts` and `sites/index.ts`: define normalized snapshots and select adapters only for exact supported hostnames.
- `sites/chesscom.ts`, `sites/chesscom-state.ts`, and `sites/chesscom-bridge.ts`: at document start, wrap the `wc-chess-board` custom element's `init`/`createGame` to capture the board controller, mirroring the Lichess bridge. Read FEN, turn, color, orientation, and legality from the controller API (`getFEN`, `getTurn`, `getPlayingAs`, `getOptions`, `isLegalMove`); keep clocks DOM-scraped. Submit through `controller.move` with an object payload and lowercase promotion, reading synchronous `Move`/`IllegalMove` results; reset a stuck `PomotionAreaShowing` chooser via the renderer. No synthetic pointer input or promotion-chooser DOM handling. These private page internals can change with Chess.com frontend updates.
- `sites/pychess.ts` and `sites/pychess-state.ts`: collect PyChess-owned board, accepted FEN, SAN, clock, and result state. Submit through `cg.selectSquare` and the site's legal user-move callback. Never fake trusted events, call `cg.move()`, force legal acceptance, or write to the socket.
- `sites/lichess.ts` and `sites/lichess-bridge.ts`: support standard Lichess player rounds. At document start, wrap `site.asset.loadEsmPage` and `site.asset.loadEsm` so the round initializer's returned controller can be captured. Read accepted steps and the active clock; submit through the controller's `pluginMove` path, with explicit promotion roles. Do not add API integration or direct socket writes. These private page internals can change with Lichess frontend updates.
- `board.ts`: own shared overlays, trusted-input revision, move serialization, and accepted-position confirmation at the requested ply. Keep the `activateElement` chooser helper in `board-input.ts` for PyChess promotion.
- `index.ts`: mount the panel and prewarm the Stockfish worker without waiting for a Chess.com board selector. Automation stays disabled until the user turns it on.
- `controller.ts`: own enable/disable, adapter subscriptions, snapshot identity and phase, human-interruption pause, and explicit resume/retry actions.
- `engine/scheduler.ts`: schedule one current-position search from accepted FEN/history and adapter clock, reject stale identity/FEN results, and confirm move execution before reporting success. Carry exact position/history into ponder reuse; do not queue speculative premove chains or repeatedly retry an unchanged position.
- `engine/book.ts`: fast normalized EPD opening book for plies 1–6. Bypasses engine search for recognized grandmaster lines in <0.01 ms with zero new dependencies.
- `engine/uci-client.ts`: serialize UCI searches, promote a matching `go ponder` search, reuse a completed result only for an exact FEN/history/depth match, and drain canceled `bestmove` responses before starting a different position. Match both FEN and UCI history because repetition state affects evaluation. UCI messages have no request IDs, so do not attach a late response to a newer position.
- `engine/worker-client.ts`: load pinned userscript resources and manage the persistent worker. Terminate it only for recovery.
- `history.ts` and `engine/san.ts`: use chessops for legal history, notation, and position validation; do not recreate chess rules or a search engine.
- `state.ts` and `settings.ts`: keep page game state authoritative and validate persisted values with Valibot.
- `panel.tsx`, `panel.css`, and `ui.ts`: keep the panel in Shadow DOM. Rendering displays state; move execution stays in the controller and scheduler.

## Site support matrix

- Transports: Chess.com controller `move`, PyChess square selection, Lichess controller `pluginMove`.
- Promotion: Chess.com explicit lowercase character, PyChess q/r/b/n chooser + Ctrl override, Lichess explicit role. Live queen promotion verified on PyChess and Lichess ([iYTQx601](https://lichess.org/iYTQx601), `2.a8=Q`, `11.Qb8#`); Chess.com controller promotion is API-verified and awaits live-game confirmation (recorded Chess.com wins used the retired gesture transport).
- Premove is off on all sites. Background ponder, opening book, and clock-aware budgets work on all sites.
- The panel shows a transport note per site; there is no input-method setting.
- Standard chess and From-Position custom starts are eligible. Other variants, Chess960, and correspondence stay ineligible where the adapter checks them.

## Tests and verification

- Run `bun run check` before committing. It runs Biome, strict TypeScript, Knip, Vitest, and the production build.
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

- Board overlays and the panel carry `data-gabibot-overlay` / `#menuWrap` markers. The board observer must ignore their mutations so evaluation rendering cannot invalidate game state or trigger another board scan. Avoid writing a style value when it is already current.
- Resolve the active board from rendered candidates, preferring one with the game's FEN API. Never use the first selector match without checking visibility and game ownership.
- `attachToBoard(null)` must also clear the move watcher. Preserve the request to watch so a later board can reattach.
- Serialize move input. Catch each mutation-listener error independently, and ignore UCI `info string` records when parsing search data.
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
