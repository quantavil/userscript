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

## Madman · max aggression

### Ownership and settings

- `madmanMode` is a persisted boolean declared once in SETTING_SPECS, default false. The panel label is exactly `Madman · max aggression`; keep documentation and both built userscripts aligned.
- `engine/madman.ts` owns legal proposals, geometric/PV pressure ranking, the estimated cp envelope and cooldown tracking. `engine/madman-search.ts` owns bounded restricted discovery and optional capture probes. The scheduler owns lifecycle, current-position checks, submission and recording observed risk.
- Madman owns final selection while enabled. It bypasses target-Elo error sampling and therefore its Blunder shield; do not silently add either selector after Madman. A tablebase result that wins the existing race remains authoritative.

### Search and selection contracts

- Baseline MultiPV is six, bounded by legal-move availability. At budgets >=80 ms, allocate 65% to baseline search. Extra proposals are limited to four, including an optional hyper-aggressive book suggestion; all require engine evaluation before dispatch.
- Extra candidates are searched together with the original engine move. Require a complete distinct same-depth batch at depth >=6, exact finite scores, anchor stability within 50 cp and compliance with the original/batch reference envelope. Incomplete, mixed, shallow or unknown comparisons retain the authoritative engine move. A newer positive mate takes priority over older completed snapshots.
- Maximum estimated concession is 120 cp; after an observed submitted concession >50 cp, use 50 cp for the next three own-turn move numbers. Recommendations/repeated analyses do not spend cooldown. Reset risk on a new session; normal mode clears it. Thresholds are experimental, not strength guarantees.
- Pressure includes attacks into the enemy king zone, cheaper-piece attacks on valuable targets, pawn contact, checks and the next two legal own-move positions of a searched PV. Geometry is style preference, not proof of threats. Do not revive a retreat veto, queen-count trade penalty, pseudo-cliff or sigmoid safety guarantee.
- Optional capture probes require a turn allocation >=400 ms and remaining time, search only legal captures of the selected offer and use depth <=10. “Bait checked” requires depth >=6 and at least 100 cp improvement for the original mover. Convert the opponent-root score; keep the selected root score unchanged. This annotation is not a calibrated human-error prediction.
- Optional searches use positive movetime, validated searchMoves, the session AbortSignal and one absolute performance.now deadline. Check expiration again after queue/setup delay, stop gracefully, and retain a usable result on optional failure. One worker only. Stop/drain overhead may exceed the allocation.
- UCI bound/unscored PVs must not inherit an older exact evaluation at a new move/depth. Final bestmove evaluation must belong to that move. Preserve current positive mate evidence even if MultiPV comes from an older complete iteration.

### Premove boundary and future support

- While Madman is active, bypass existing own-turn chain steering, recapture fallbacks, opponent-PV arming, instant book replies and premove dispatch. Keep the saved preferences for normal mode. Background analysis may run without arming an instant reply.
- This suspension prevents cached ordinary-engine replies from bypassing the current aggression/cooldown policy and prevents automatic recaptures from undoing sacrifice ideas. It costs clock time and premove coverage, especially in bullet. The visible Premove toggle is a saved preference, not evidence that Madman armed replies.
- Future support must evaluate each candidate opponent branch as a new own-turn position under Madman. Do not assume an opponent PV's second move already passed that selection. Start with forced single-legal-move branches, then bounded branch-specific evaluated replies if measured latency/coverage justify them.
- Future entries need game/session identity, canonical position including en passant and draw-relevant state/history, settings revision, current risk/cooldown context and score/search provenance. Validate all of those and legality before dispatch. Clear on unexpected positions, mode/settings/session changes or incompatible cooldown; on a miss, perform ordinary Madman search. No blind recapture fallback.
- Keep any future branch work serialized, cancellable and on the opponent's clock where possible. In-memory validation and dispatch still have scheduling cost; “0 ms delay” must not be called zero wall-clock latency. These future mechanisms are design notes, not implemented support.

### Verification and references

- Run `bun run check` locally before committing; preserve both dist outputs. Cover mate/score provenance, incomplete batches, both colors, castling/promotion, deadline/setup expiration, optional failures, cancellation and setting interactions.
- Design: docs/superpowers/specs/2026-10-15-madman-design.md. Implementation/review ledger: docs/superpowers/plans/2026-10-15-madman-mode-pipeline.md. Observations: docs/madman-verification.md. Future premove discussion: docs/madman-premove-options.md.
- Do not claim calibrated strength, human-trap probability, aggression frequency or live browser latency from the native smoke test.
