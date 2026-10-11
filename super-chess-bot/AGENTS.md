# AGENTS.md

Project guidance for `super-chess-bot`.

## Stack and packaging

- Use Bun for installs, scripts, and tests.
- Build the TypeScript userscript with Vite and `vite-plugin-monkey`; the installable output is `dist/bundle.user.js`.
- Keep the package, userscript metadata, and project license at GPL-3.0-or-later. Preserve Stockfish's upstream license notice.
- Stockfish JS and WASM are loaded as version-pinned userscript resources. Keep engine loading in the worker adapter; do not add a page-thread search fallback.
- Keep runtime dependencies small and prefer `chessops`, Preact + Signals, and Valibot for the capabilities they already provide.

## Architecture boundaries

- `board.ts`: isolate Chess.com selectors and private API access; watch Move events with a DOM fallback; own simulated click/drag input and FEN confirmation; detach listeners when the board changes.
- `index.ts`: mount the panel and prewarm the Stockfish worker before the game starts. Automation stays disabled until the user turns it on.
- `controller.ts`: own enable/disable, readiness, game lifecycle, current FEN, human-interruption pause, and explicit resume/retry actions.
- `engine/scheduler.ts`: schedule one current-position search, allocate the move deadline, reject stale results, validate candidate moves, and use the main principal variation to predict one opponent reply. Carry the exact resulting FEN and replayable history into the ponder search; do not queue speculative premove chains or repeatedly retry an unchanged position.
- `engine/uci-client.ts`: serialize UCI searches, promote a matching `go ponder` search, reuse a completed result only for an exact FEN/history/depth match, and drain canceled `bestmove` responses before starting a different position. Match both FEN and UCI history because repetition state affects evaluation. UCI messages have no request IDs, so do not attach a late response to a newer position.
- `engine/worker-client.ts`: load pinned userscript resources and manage the persistent worker. Terminate it only for recovery.
- `history.ts` and `engine/san.ts`: use chessops for legal history, notation, and position validation; do not recreate chess rules or a search engine.
- `state.ts` and `settings.ts`: keep page game state authoritative and validate persisted values with Valibot.
- `panel.tsx`, `panel.css`, and `ui.ts`: keep the panel in Shadow DOM. Rendering displays state; move execution stays in the controller and scheduler.

## Tests and verification

- Run `bun run check` before committing. It runs Biome, strict TypeScript, Knip, Vitest, and the production build.
- Use `bun run test` for the Vitest suite. The native `bun test` runner does not support the suite's Vitest mocking API.
- Keep tests that assert observable behavior at the board adapter, controller, scheduler, settings, and UCI boundaries. Remove a test only when it is demonstrably misleading, redundant, or no longer exercises supported behavior; do not delete tests merely to make a failure disappear.
- Prefer focused tests over copied chess-engine implementations. Test cancellation, stale-result rejection, move confirmation, settings recovery, and worker failure behavior.

## Browser and strength checks

- Use a dedicated Chromium session and the production bundle installed through a userscript manager. Test only a selected Chess.com computer game.
- Cover orientation, promotion, enable/disable during search, new-game/reset, trusted human interruption, recovery, and the board position event path.
- For a minimum-time strength check, use the lowest supported move budget (100 ms) and a 1+0 game clock when available. Record the opponent's displayed rating, result, plies, bot budget, and our clock at start/end.
- Report engine initialization, warmed search, input, and confirmation separately. A single game shows one result at that opponent's displayed rating; it does not establish a stable Elo rating or bullet reliability.
- Browser tests are for inspection and verification and are not part of the bot's move loop.

## Performance and audit notes

- Board overlays and the panel carry `data-gabibot-overlay` / `#menuWrap` markers. The board observer must ignore their mutations so evaluation rendering cannot invalidate game state or trigger another board scan. Avoid writing a style value when it is already current.
- Resolve the active board from rendered candidates, preferring one with the game's FEN API. Never use the first selector match without checking visibility and game ownership.
- `attachToBoard(null)` must also clear the move watcher. Preserve the request to watch so a later board can reattach.
- Serialize move input. Catch each mutation-listener error independently, and ignore UCI `info string` records when parsing search data.
- `premoveEnabled` is a legacy persisted key for background pondering; migrate it to `ponderEnabled`. Pondering searches an exact predicted position and does not queue a move. Do not add speculative premove input based only on the PV: Chess.com can execute a queued move after an unexpected reply. Any future premove path needs a verified safe-response policy, a cancellation path, and tests for both site acceptance and fallback.
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
