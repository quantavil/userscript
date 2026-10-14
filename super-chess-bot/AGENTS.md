# Super Chess Bot repository guidance

## Stack, builds, and license

- Use Bun for package installation, scripts, and tests. Run `bun install --frozen-lockfile` and `bun run check` from this directory.
- Keep both production outputs: `dist/bundle.user.js` for Chess.com and Lichess, and `dist/chesscom.user.js` for Chess.com alone.
- Keep package metadata, userscript headers, and `LICENSE` at GPL-3.0-or-later. Preserve version-pinned Stockfish resource URLs and SHA-256 hashes when changing engine resources.
- There is no hosted CI for this project. `.github/workflows/super-chess-bot.yml` was removed on 2026-10-13 after both of its runs failed; `bun run check` must be run locally before committing.

## Architecture boundaries

See [docs/architecture.md](docs/architecture.md) for the responsibility map. Keep browser-specific controller access and submission inside `sites/`; keep chess rules and notation browser-independent; keep engine search independent of UI and move submission. App commands own automation lifecycle, reporting eligibility, and recovery. UI actions dispatch commands through the app.

Use one owned engine worker at a time. Validate current session and position before applying a result. Keep move confirmation provenance explicit and wait for the requested ply. Never describe Chess.com controller-local FEN/SAN observation as server acceptance; do not add direct socket writes or fabricate acknowledgement events.

## Supported runtime

- The current supported game scope is standard player games on Chess.com and Lichess (including Chess960). Automation starts disabled.
- UCI castling encoding depends on the engine mode: an orthodox engine is sent the king-destination square, while a `UCI_Chess960 true` engine expects king-takes-rook. Both directions of that conversion live in `chess/position.ts` (`makeEngineUci` / `parseEngineUci`), so replay, history recording and PGN export agree with each other.
- PyChess has been removed from runtime, tests, host matches and userscript metadata. Old handoffs and browser records mentioning PyChess are historical and are not support claims.
- Non-standard and fairy variants are not supported. Fairy-Stockfish is completely removed.
- Chess.com positions are controller-local observations. Lichess positions come from validated site-owned round steps. See [docs/support-matrix.md](docs/support-matrix.md).

## Behavior constraints

- Preferences are described exactly once, in the `SETTING_SPECS` field table in `settings/schema.ts`. It drives the defaults, the persisted schema, the live store, what `Settings.save` writes, and what the panel reads and writes. Add a preference there, never to a second list. Flag preferences are real booleans, and `SettingsData` is derived from `BotState` so the two views cannot drift.
- Persist settings on `pagehide`/`beforeunload` through `debounce`'s `flush`; a trailing write that is still pending when the page goes away would otherwise be lost.
- Tablebase lookup is standard-chess only, limited to eligible positions with at most seven pieces. Keep the in-memory cache bounded at 256 entries and keyed by the first four FEN fields, because Syzygy is indexed on the position and not on the move counters. Keep DTZ separate from DTM, never format DTZ as mate, and never compare one move's DTM against another's DTZ. A decided position with no exact DTM reports a capped centipawn score so an empty evaluation is never read as no score. Hold a failed lookup out of the network for a cooldown instead of retrying once per ply. Race tablebase with local search without delaying a usable local result. Failed or unusable local results must leave a viable lookup running.
- Preserve a per-turn clock baseline across ticking snapshots. Use clock delta plus a known increment when available; otherwise estimate elapsed time from wall time.
- Reports are local estimates, permitted only when the adapter reports a finished game, and never without an adapter at all. Default depth is 18 and the allowed depth is 10–26. The report searches to depth: it passes a zero time budget so the engine runs `go depth N` with no `movetime`, and it requests a single Multi-PV line because it reads only each position's evaluation. Surface a failed pass as a retryable error instead of returning silently to idle. Cancel report work when its session becomes ineligible. Ongoing-game replay is ineligible; explicit cancellation suppresses automatic regeneration until manual generation or a new game.
- Automatic recovery is limited to two retries per session-position. Do not automatically repeat a move after a transport dispatch attempt with an uncertain outcome.
- Premove engine (v12.0.0) combines own-turn recapture-chain steering, opening book replies, and an opponent-turn Multi-Branch Ponder Table (up to 4 candidate branches). Entries are keyed by 3-field FEN (`fenKey`), and all candidate replies are validated for legality via `chessops`. When `premove` is enabled, hits dispatch with 0 ms delay. Opponent-turn search runs depth-only (`budget = 0`) up to depth 8 to progressively arm candidate branches. On unexpected moves or toggling premove off, the table clears immediately and falls back to standard search.
- Closed Shadow DOM is UI encapsulation only. Ghost Mode hides the panel and overlays for streaming; never promise zero detectability or invisibility.
- Preserve historical benchmark records as observations from their recorded builds. They do not establish calibrated Elo or current site support.

## Verification

`bun run check` runs Biome, strict TypeScript, Knip, Vitest, and both production builds. Keep tests at observable adapter, app, engine, history, settings, UCI, and pure-display boundaries; the project has no DOM test environment, so render helpers expose their formatting and bounds as pure functions. Browser verification is manual and is not part of the move loop.

The completed [premove plan](docs/superpowers/plans/2026-10-14-hybrid-premove-engine.md), [implementation plan](docs/superpowers/plans/2026-10-13-reliability-and-architecture.md), and [execution ledger](docs/superpowers/plans/2026-10-13-execution-ledger.md) record the refactor, review corrections, and verification limits (428 tests across 34 suites passed).
