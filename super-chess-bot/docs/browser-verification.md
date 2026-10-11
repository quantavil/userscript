# Browser verification — 2026-10-11

## Production checks

The earlier PyChess castling-history and promotion-selector changes passed full checks with 166 tests, then 175 tests after a review pass. The initial Super Chess Bot audit check passed with 191 tests in 17 files. After the Lichess history-cache regression fix, `bun run check` passed Biome, strict TypeScript, Knip, 207 tests in 19 files, and the Vite production build. The bundle is 238.68 kB (58.67 kB gzip). Stockfish's pinned worker and WASM remain manager resources.

## Current audit-build browser checks

Earlier Chess.com and PyChess audit-build probes used a temporary agent-browser page harness that supplied the userscript resource APIs and Stockfish resources; those probes were not manager-installed tests. The Lichess result below is from the final bundle installed through Violentmonkey.

- **Chess.com:** selected Maximum (3200), White, and 1+0. Both clocks displayed 1:00 at start. The panel and worker reached `Ready`; settings were 100 ms, depth 30, background pondering on. The bot submitted accepted legal moves through `27.Nf3` (27 White moves). Most UI move stamps were 0.1–0.3 seconds; `1.e4` showed 38.4 seconds because this interval included setup and engine startup, so it is not a search-time measurement. Automation was then disabled. The guest clock later reached 0:00 and the page showed `0-1` on time with Maximum at 0:36. This interrupted run is not a strength result.
- **PyChess:** entered through **Play with AI**, CHESS, level 8. The default 5+3 real-time clock was active; the panel was Ready before enabling and legal moves were accepted through `10.O-O-O Qc7`. During the run the clocks showed 5:15 and 5:28, consistent with the incremented clock control. It was a partial game and did not reach a promotion.
- **Lichess:** the final bundle was installed through Violentmonkey 2.49.0 in the existing Vivaldi browser session. Synchronous `<page>` mode was enabled. A standard **Play against computer** game at AI level 8, White, 5+0 ([`TBMVyZvA`](https://lichess.org/TBMVyZvA)) reached `Ready`; with auto move, 100 ms move budget, depth 30, and pondering enabled, the bot submitted 15 accepted White moves through `15.Bd2`, and Stockfish level 8 replied through `15...Nb4`. The activity log showed accepted SAN for each bot move and no controller or accepted-FEN error. Both clocks began at 5:00; at stop, White showed 4:56 and Black 4:12, with White to move. Automation was disabled after capture. This verifies ordinary move submission, repeated accepted-position reads, and live clock behavior. No promotion arose in this game.

## Lichess regression and live verification

The first live failure appeared after several accepted moves as `Lichess accepted FEN is unavailable`. The earlier test covered only a two-move line. A new regression exposed a stale-cache path when an accepted step's contents change in place: reconstruction fails while SAN is incomplete, and the old cache keeps that failure after SAN becomes available. The history cache now keys on the selected step and accepted steps' ply, FEN, and SAN values. The regression failed before that change and passed after it; the final manager-installed run above then continued through 15 bot moves with replies.

The Violentmonkey setting is user-level: **Settings → Advanced → Synchronous `<page>` mode** must be enabled, and Lichess must be reloaded after installing or updating the bundle. The adapter uses Lichess's current private round controller and `pluginMove`; it does not make API calls or write directly to the socket. Lichess may change those frontend internals.

Live promotion remains unverified on Lichess. Unit tests cover explicit underpromotion-role submission; the live game did not reach a promotion position. The active 5+0 clock was observed in the browser, and unit tests cover missing or unavailable clock data falling back safely.

## Lichess adapter implementation and current verification

The userscript starts at `document-start` and wraps the page's `site.asset.loadEsmPage` and `site.asset.loadEsm` methods. For the `round` module, it uses Lichess's existing `loadEsm('round', { init })` method so it can capture the `RoundController` returned by `initModule`. The adapter accepts any standard-chess player round. It reads accepted FENs and SAN history from the controller's recorded steps, reads the active player's clock when the controller exposes it, validates UCI and legal destinations, and submits through `pluginMove` with the chosen promotion role. This is private frontend coupling and can need changes after a Lichess update.

The controller path is supported by Lichess's current source: [round initializer](https://github.com/lichess-org/lila/blob/master/ui/round/src/round.ts), [asset loader](https://github.com/lichess-org/lila/blob/master/ui/site/src/asset.ts), and [round controller move/clock implementation](https://github.com/lichess-org/lila/blob/master/ui/round/src/ctrl.ts). The live game above confirms ordinary move acceptance and clock behavior with a manager-installed bundle. Queen promotion and underpromotion remain unverified in a Lichess browser game.

The previous manager-installed promotion results below remain valid historical evidence for the PyChess promotion selector, but do not count as fresh current-build manager verification. Queen promotion worked in the completed earlier PyChess game; underpromotion with site auto-promote enabled remains unverified in a live browser.

## PyChess production verification

The game was opened from `https://www.pychess.org/?any` through **Play with AI**, never Puzzle of the Day. The production bundle was installed through Violentmonkey in the dedicated `pychess-acceptance-5ee8055d5e97` Chromium 155 session. The manager stored the 218,478-byte built script, including the PyChess promotion classes `q-piece`, `r-piece`, `b-piece`, and `n-piece`.

### Promotion regression and corrected acceptance

The first installed-bundle regression game, [`vUxrXFGZ`](https://www.pychess.org/vUxrXFGZ), isolated the promotion failure. At ply 108, after `54...b3`, White had a pawn on h7 and the engine PV was `h7h8q`; PyChess did not accept the move and the bot timed out, 0–1. Inspection showed that the adapter searched for classes named `queen`, `rook`, `bishop`, and `knight`, while PyChess renders the chooser as `q-piece`, `r-piece`, `b-piece`, and `n-piece`. The selector map and test fixture were corrected to those site classes.

After rebuilding and replacing the installed script, the corrected production bundle completed [`e4Hl3cG8`](https://www.pychess.org/e4Hl3cG8): **1–0 by checkmate, 76.Qh2#**, 151 plies. The setup was CHESS, empty custom FEN and alternate start, Chess960 off, Random-Mover off, real time, 1+0 (minute slider index 4, increment 0), Fairy-Stockfish level 7, White. Before the game, the panel and worker reported `Ready`, automation was disabled, and settings were 100 ms move budget, depth 30, pondering on. Both clocks showed 1:00 at start. Accepted promotions were `58...g1=Q`, `59.a8=Q`, and `75.b8=Q`; the bot finished with 0:42 and Black with 0:02.3. The bot therefore used about 18 seconds of its clock over the game, subject to the site's clock display rounding.

The browser log showed engine evaluation/PV output followed by accepted SAN progression. It did not separately time engine search, square selection/submission, and server confirmation for each move. The 100 ms value is the configured search budget, not an observed end-to-end move latency. No Elo or bullet-strength conclusion follows from this single game.

### Additional live probes

- In the earlier production run with the castling-history fix already installed, the bot's `13.O-O` was accepted at ply 25. The AI later played `23...O-O-O` at ply 46, and the bot continued. A regression test now verifies orthodox castling history reaches Stockfish as `e8g8 e1c1` rather than chessops' king-to-rook encoding.
- Black-side game [`thh5mOEQ`](https://www.pychess.org/thh5mOEQ) began with the AI playing `1.d4`. After flipping the board orientation to White, the bot correctly played `1...Nf6` as Black. This probe used a temporary 5,000 ms budget with pondering off, so it is not a timing sample. It continued to 130 plies; the recorded end clocks and termination are inconsistent, so this probe makes no claim about either.
- In active replay game [`yjSeh6qD`](https://www.pychess.org/yjSeh6qD), stepping back to the initial position showed `Replay mode` and no bot move. Fast-forwarding to the live position returned the panel to analysis. This verifies replay suspension and return to live play.
- Crazyhouse AI game [`XKihdyLv`](https://www.pychess.org/XKihdyLv) displayed `PyChess chess variant required` and received no userscript move. On `/?any` without an identified round, the panel showed `Waiting for PyChess game` and did not move.
- Reloading the completed acceptance game restored its final FEN, history, and result with the bot disabled and panel `Ready`. This is terminal-game reload recovery only; it does not verify a live reconnect.

### Remaining browser checks

- Disabling during a deliberately long search was attempted, but observation occurred after the game had advanced to ply 9; cancellation of that specific search is inconclusive.
- Trusted left-button/touch interruption and explicit Resume were not verified.
- Live reconnect and active game/board replacement were not verified. The terminal reload probe above does not cover them.
- The acceptance site had saved auto-promote off. Promotion tests cover q/r/b/n chooser selection and Ctrl metadata restoration, and browser acceptance covers queen promotion, but underpromotion with auto-promote on remains unverified. Anonymous custom-FEN setup is login-restricted, so no custom-FEN underpromotion fixture was available.

## Chromium game run

- Chromium 153 using `agent-browser` automation with the optimized production bundle.
- Chess.com computer game: Komodo20 / Master (2400), guest White, 1+0 bullet time control. Bot move budget was 100 ms, depth cap 30, automatic moves enabled, background pondering enabled.
- The Stockfish 19 lite WASM worker prewarmed and reported `Ready` before game start. The bot played the full game through to checkmate.
- Result: **1–0 by checkmate**, `75.Qa1#`; 149 plies (75 White moves and 74 Black moves).
- Full game moves ended with king hunt across the board, pawn promotion `74.h8=Q`, and checkmate `75.Qa1#`.

## Minimum-budget strength samples

After the promotion input fix and optimization refactor, I tested the production bundle in isolated Chromium with guest White, auto move enabled, depth cap 30, 100 ms move budget, and a 1+0 clock. The clock columns show the value at game end; the bot's used time is the sum of Chess.com's displayed White move times.

| Computer | Result | Plies | Bot clock | Opponent clock | Bot move time |
| --- | --- | ---: | --- | --- | ---: |
| Master (2400) | 1–0, `79.Rc2#` | 157 | 1:00 → 0:41 | 0:22 | 19.1 s |
| Master (2400) | 1–0, `75.Qa1#` | 149 | 1:00 → 0:43 | 0:19 | 17.0 s |
| Grandmaster (2700) | 1–0, `70.Qh5#` | 139 | 1:00 → 0:43 | 0:23 | 17.1 s |
| Super Grandmaster (2900) | 0–1, `38...Qh3#` | 76 | 1:00 → 0:48 | 0:29 | 12.1 s |
| Super Grandmaster (2900) | 1–0, `61.Bf5#` | 121 | 1:00 → 0:46 | 0:25 | 13.4 s |
| Maximum (3200) | 1–0, `77.Qfh7#` | 153 | 1:00 → 0:41 | 0:21 | 19.3 s |
| Maximum (3200) | 1–0, `71.g8=Q#` | 141 | 1:00 → 0:44 | 0:23 | 16.0 s |
| Super Grandmaster (2900) | 1–0, `73.b8=Q#` | 145 | 1:00 → 0:23 | 0:44 | 36.3 s |

One warmed 2900 run began after the panel reached `Ready`, with background pondering on. Across its 60 recorded White move stamps, Chess.com showed 13.4 seconds total, 0.2 seconds median, 0.3 seconds p95, and 1.6 seconds maximum; the first White move had no separate timestamp. Its 0:46 finish clock is consistent with about 14 seconds used after Chess.com's rounding. The two 3200 games both completed, and both included a successful pawn promotion. An earlier warm 3200 sample before the promotion fix was a loss by `43...c1=Q#`, with 0:49 left on our clock and 0:28 on Maximum's. The highest observed win is 3200; the mixed 2900 results and small sample size mean these results do not establish a stable Elo rating or expected win rate. The recorded move budget is the configured cap; actual search, browser scheduling, and accepted-input time can differ.

The later 2900 run also began after `Ready` and ended with a win by promotion, but used 36.3 seconds on our clock across 72 recorded White move stamps (0.2 s median, 1.3 s p95, 1.5 s maximum; no separate timestamp for the first move). This differs sharply from the earlier 13.4-second run; the under-5-second whole-game target is not met or demonstrated. A 1+0 clock is the actual site clock, while per-move UI timestamps are rounded and can vary with browser scheduling.

## Premove test and decision

In a no-timer Komodo24 game with the userscript's bot disabled, I played `1.e4 ...g6 2.Nf3` and entered `Bc4` during Black's turn. After the bot replied `...Bg7`, the board showed `Bc4` played and Black to move. This confirms Chess.com accepts and executes a queued native premove against its computer bot. This test had no clock, so it does not measure time savings.

Chess.com's [premove guidance](https://support.chess.com/en/articles/8562432-what-are-pre-moves-and-how-do-they-work) says a premove uses 0.1 seconds and executes even after an unexpected opponent move; it is canceled only when the move is illegal. A single PV prediction is not enough to queue it safely. Automatic premoves remain disabled in the userscript. Continue using exact-position background pondering, which can reuse a completed search when the actual FEN and history match, without committing to a move before the opponent acts. A future premove feature should only be considered with a verified response-safety rule and a tested cancellation/fallback path.

## Audit disposition

- **True:** evaluation-bar style mutations re-triggered the board observer; first-match board selection could choose a hidden/display board; concurrent move dispatches were not serialized; one throwing listener could stop notifications; `info string` text could be parsed as PV data; `jitter` was persisted but unused. These are fixed. Overlay mutations are filtered, unchanged styles are not rewritten, board candidates are visibility/game-API ranked, move input is locked, listeners are isolated, `info string` is ignored, and dead jitter state was removed.
- **Partly false:** `attachToBoard(null)` already detached the canvas, resize observer, and board input listeners. It did leave the move watcher subscribed to the old board; that watcher now detaches and is restored when a visible board returns.
- **True with a scope correction:** the old `premoveEnabled` name controlled background pondering, not actual premove input. It is now named `ponderEnabled`, and existing saved values migrate. No automatic premove code was added.
- No tests were removed as false positives; each retained test exercises a supported boundary or a regression fixed here.

## Resource failure found and fixed

The previous `@resource` URL used jsDelivr's npm endpoint. That endpoint returned HTTP 403 with `Package size exceeded the configured limit of 150 MB.` because the Stockfish npm package is about 205 MB unpacked. The project only needs the 1.8 MB lite single-thread WASM file, but jsDelivr applies its limit to the whole package. The pinned resource host now uses unpkg; both exact version-pinned resources returned HTTP 200, and the full manager-installed Chess.com game verified worker startup end to end.

## Lichess From-Position eligibility and live promotion (2026-10-11)

A from-custom-position computer game ([`sttl5p9L`](https://lichess.org/sttl5p9L), PGN `Variant "From Position"`, custom FEN) was rejected with `Lichess standard chess is required` because the adapter only accepted `variant.key === 'standard'`; from-position games report `fromPosition`. The gate now accepts both keys since From-Position is orthodox chess from a custom FEN. A unit test covers `fromPosition` acceptance alongside the `chess960` rejection.

After rebuilding and reinstalling the manager bundle, the same game reached `Ready` and the bot submitted accepted moves (observed through `4...Qd6` with SAN/Eval log entries). A fresh from-position game from `7k/P7/8/8/8/8/8/K7 w - - 0 1` ([`iYTQx601`](https://lichess.org/iYTQx601), White, level 8, 1+0) verified live promotion: the bot played `2.a8=Q` through the controller's explicit promotion role and finished `11.Qb8#`, 1–0. This is the first live Lichess promotion; underpromotion on Lichess remains live-unverified.

One setup caveat: starting the game from the homepage AI-setup form left the round controller uncaptured (`not captured` status) until a full page reload, after which the same game captured normally. Games opened or reloaded directly have not shown this; in-setup SPA navigation is the suspect and remains unconfirmed.

## Earlier smoke measurements

An earlier Chromium smoke run measured 24 opponent-response to accepted-move intervals with a 100 ms budget: 122.7 ms minimum, 130.2 ms median, and 158.9 ms maximum. These include engine search, UI scheduling, and move acceptance. They are small samples from this machine, not percentile benchmarks or an Elo claim.
