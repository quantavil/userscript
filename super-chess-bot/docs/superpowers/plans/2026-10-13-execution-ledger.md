# Execution ledger

- Baseline: clean checkout on main; prior audit check passed 314 tests and both builds, with eight lint warnings.
- Authorization: user requested plan creation and multi-agent execution with coordinator review; proceed without repeating approval prompts.
- Ruling: retain shared variant identity for both sites, defer complete variant transports — explicitly requested by user — current variant guarantees must be narrowed.
- Ruling: perform behavioral fixes before path migration — keeps agent ownership disjoint and failures attributable — migration occurs only after agent diffs are reviewed.
- Ruling: use native collaboration agents rather than external CLI model orchestration — available tool supports the requested workflow — head coder retains acceptance responsibility.

## Completed work

- Tasks 1–7 completed: engine disposal and readiness barriers, tablebase cache/results, history and PGN fixes, explicit observation provenance, PyChess removal, shared variant registry, lifecycle/recovery integration, source and test migration, panel extraction, documentation and CI.
- Remaining coding agents used GPT-6 Luna at xhigh after the user's explicit selection. The coordinator integrated changes and retained acceptance responsibility.
- Independent engine review caught variant initialization failures that poisoned retries and searches that could start before readiness; both were corrected and reviewed again.
- Final structure review required Chess.com observation to move entirely into adapter subscriptions and corrected overstated guide claims; both were corrected.
- Final behavior review caught ongoing-game replay reports and failed local search canceling viable tablebase lookup. Added failing regressions, corrected both, and also fixed automatic report regeneration after manual cancellation.
- Final structure and behavior re-reviews: PASS, no remaining blockers in their reviewed scope.

## Verification

- `bun run check`: PASS — Biome (83 files), TypeScript, Knip, 340 tests across 29 suites, and both production builds.
- Generated multi-site bundle: 354.06 kB (81.27 kB gzip); Chess.com-only bundle: 336.85 kB (77.52 kB gzip).
- Removed obsolete controller test mocks after review; focused controller suite rerun: 21/21 PASS.
- `git diff --check`: PASS. Generated headers retain GPL-3.0-or-later and match only the intended Chess.com/Lichess hosts.
- No new live browser gameplay verification was performed during this refactor. Historical browser evidence remains in `docs/browser-verification.md`.

## CI removal (2026-10-13)

- `.github/workflows/super-chess-bot.yml` was added by Task 7 and removed on 2026-10-13. Both of its runs failed.
- No assertion ever failed. Each run reported `Test Files 26 passed (28)` and `Tests 288 passed (316)`; the two absent files were always `tests/integration/sites/sites.test.ts` and `tests/integration/sites/chesscom-history.test.ts`.
- Those two vitest fork workers died with `SIGABRT` from `FATAL ERROR: RegExpCompiler Allocation failed - process out of memory`, raised inside V8's regexp-compiler Zone by `RegExpCompiler::PreprocessRegExp` -> `RegExpCapture::ToNode` -> `RegExpAlternative::ToNode`. That allocator is separate from the JS heap, so heap flags do not govern it.
- The follow-up cap (`c002ed6`, `maxWorkers: 2` when `CI` is set) did not help: the same two files aborted. The cap and its config file were removed with the workflow.
- Not reproducible locally on Node 26.11.1 / V8 14.6: the full 316-test suite passes, including with `CI=true`, and the two files pass in isolation and under a 40 MB old-space cap. Project source regexes compile in under a millisecond, so no application regex is pathological.
- Conclusion: a vitest 5 + Vite 8 fork-pool worker crash specific to the hosted-runner Node/V8 build, of the documented "worker dies, every test passes, job fails" class. Verification is now local `bun run check` only.

## Review fixes (2026-10-13)

A review of the refactor raised 60 findings; one was factually wrong (`job.positionKey` is read
in `uci-client.ts`, not unused) and one was mis-framed (the arithmetic mean in `aggregate.ts`
documents its divergence from Lichess rather than hiding it). Everything else was real and was
fixed.

Behaviour:

- Report searches are depth-driven: a zero time budget becomes `go depth N` with no `movetime`,
  bounded by a wall-clock ceiling, and the pass requests a single Multi-PV line. Tests assert the
  depth and time arguments, so the finding cannot silently return.
- The unsupported-site status is settled before warmup starts, and warmup is skipped entirely
  when no adapter exists.
- Castling is serialized per engine mode: king-destination for an orthodox engine,
  king-takes-rook for `UCI_Chess960 true`. `parseEngineUci` is the inverse conversion.
- Fixing that exposed a live bug: `GameHistoryTracker` fed raw UCI straight into chessops, which
  expects king-to-rook, so **every castling move was read as illegal and silently dropped** from
  move history and PGN export. Now covered by castling tests for both encodings.
- Tablebase: cache keyed on the first four FEN fields, a cooldown on failed lookups, a
  unit-consistent DTM/DTZ comparison, unknown outcomes ranked below every known one, and a capped
  centipawn score for a decided position with no DTM.
- A failed report pass publishes `error` and the panel renders it, instead of only `console.warn`.
- Verdicts and per-move accuracy are both derived from the win percentage surrendered, and
  accuracy is clamped into 0–100, so the two can no longer disagree.
- Report eligibility requires a finished game *and* an adapter; the "no site means eligible"
  test seam is gone from production code.
- PGN: `[Variant "..."]` for non-standard variants, newlines stripped from header values, and a
  local calendar date. The result stays `*` because no game result is observed — that is the
  honest PGN marker for an unfinished game, and the call site is now explicit about it.
- `isValidUciMove` accepts only `[a-h][1-8][a-h][1-8][nbrq]?`, which also covers Chess960
  king-takes-rook castling. Chess960 castling tests added.
- `Settings.load` writes only keys that have a live accessor, so `menuPosition` no longer lands
  on `BotState`.
- Report depth and report-enabled no longer restart the live search.
- `parseInfo` no longer lets a `currmove`-only line overwrite a candidate line's depth.
- Mate scores render as `+M3` / `-M4` consistently, `-0.0` never reaches the eval trend, and the
  scoresheet stripe attribute is no longer inverted.

Structure: one `loadPosition(fen, variant, unknownVariant)` helper replaces seven divergent
FEN→position constructions; one `PositionHistory`, one `Evaluation`, and `CandidateLine` extends
`MultiPvLine`; shared `clampSearchDepth`/`clampTimeLimit`, `rootMoveNumbering`, `scoreToDisplay`/
`mateToDisplay`, `STANDARD_INITIAL_FEN`, `scoreTone`/`status.ts`, and exported settings bounds
(`REPORT_DEPTH_MIN`/`MAX`, `OPENING_STYLES`, `TIMING_MODES`) so no list or range lives twice.
Removed: `completedPonder` and its impossible test, `Panel.capabilities`,
`getPanelCapabilityView`, `SiteCapabilities`, `VariantDefinition.engine`, `pa()`, `pa`-based
`updateDisplay`, `ui.lastBestMove`, `validBestMove`, the redundant `ponderSearch` mirror,
`safeTimeout`'s Node `unref`, the `as unknown as Record` cast, `loadSettings(null)`,
`BotState.reportDepth ?? 18`, two unreachable analyzer guards, and all four missing `.js` imports.

Tests: the vacuous `toBeDefined()` transposition case and duplicated legality loops in
`book.test.ts` are replaced by real assertions; the two Chess960-variant history tests now
observe a variant-sensitive position; settings tests gained real `save()` coverage, boundary
cases for `targetElo`/`reportDepth`/`menuPosition`, a `BotState` pollution guard, and per-test
state reset; tablebase gained 429-cooldown, cache-key, mixed DTM/DTZ, cursed/blessed, eviction and
LRU-recency tests; `report-analyzer` gained depth/time and Multi-PV assertions, a supported
variant, a signal-aware mock, a real finished-game adapter and a no-adapter case; the microtask
flush loops and the magic revoke count in `worker-client` are replaced with deterministic waits;
helper tests moved out of the engine suite into `tests/unit/chess/notation.test.ts`.

Verification: `bun run check` PASS — Biome (86 files), TypeScript, Knip, 353 tests across 30
suites, and both production bundles.

### Follow-up: the four deferred items

- **Boolean preferences.** Every `0 | 1` setting is now a real `boolean` end to end — `BotState`,
  the persisted record, the schema, the panel switches and the tests. `SettingsData` is derived as
  `Pick<BotState, PreferenceKey>` instead of being written out again, so the two views cannot
  drift, and a compile-time check proves the field table covers every preference.
- **Single settings-field table.** `SETTING_SPECS` in `settings/schema.ts` is now the only place a
  preference is described. It derives `DEFAULT_SETTINGS`, the persisted valibot schema,
  `settingsModel`, what `Settings.save` writes, and what the panel reads and writes. The panel's
  `PanelSettings` is `Omit<SettingsData, 'menuPosition'>` under the same key names the state uses,
  which removed a 14-field read map and a 14-case write switch; adding a preference is one entry.
  Loading also accepts real booleans instead of only `0`/`1`.
- **`debounce` flush.** `debounce` now returns `{ flush, cancel }`, and `flushSettingsOnUnload`
  registers the flush on `pagehide`/`beforeunload`, so a preference changed in the last 200 ms of
  a session is no longer silently dropped. Covered by a test that asserts a pending write is
  persisted on flush and that a second flush is a no-op.
- **Site read coalescing.** `state.ts` caches the site snapshot for the current synchronous turn
  and invalidates it on the next microtask. Several getters in one pass now cost one `read()`
  instead of one each, and the cache cannot survive into a later task, so a board update is still
  observed immediately. Covered by a test that asserts one read across five synchronous getters
  and a fresh value after the turn ends.

Verification: `bun run check` PASS — Biome (86 files), TypeScript, Knip, 359 tests across 30
suites, and both production bundles.

## En passant coverage

A follow-up audit reported that `nextSetup.epSquare = position.epSquare` in `predictFen` was dead
code whose comment was factually wrong, and proposed deleting it. It is the opposite: `chessops`
keeps two different en passant values. `Position.play` sets the raw `epSquare` after any double
push with no legality check, while `Position.toSetup` runs it through `legalEpSquare` and strips it
when no capture exists. The assignment restores the raw field, which is what the host conventions
expect. Removing it drops the target square from every double-push prediction.

En passant captures were supported on both sites but had no test that played one. Existing
coverage only exercised the en passant *field* in a double push, never the capture itself, so a
`chessops` change to `toSetup` would have started rejecting en passant moves at runtime unnoticed.
Added:

- `tests/unit/chess/position.test.ts` — the capture removes the passed pawn, leaves no en passant
  field, an illegal diagonal to an empty square is rejected, the raw host field survives a double
  push with no available capture, and the predicted position matches an independent replay after
  canonicalization.
- `tests/integration/sites/lichess.test.ts` — the adapter dispatches `e5` to `d6`, and refuses the
  same capture when the expected position still holds the captured pawn. This is the one path that
  replays the move and compares FENs before dispatching.
- `tests/integration/sites/chesscom-history.test.ts` — the capture dispatches as a plain from/to
  with no promotion role, and is refused when the board controller reports it illegal. Chess.com
  owns legality checking on this path rather than replaying.

The two assertions that lock in the `predictFen` behaviour were verified to fail when the
assignment is removed.

Verification: `bun run check` PASS — Biome (87 files), TypeScript, Knip, 371 tests across 31
suites, and both production bundles.

## Deferred limits

- Complete variant transport correctness on both Chess.com and Lichess remains deferred by user request. Shared rules/identity/engine plumbing is retained; the supported site matrix remains standard chess.
- Chess.com controller observations prove local application, not independent server acknowledgement. Lichess round-step provenance is documented as site-accepted.
- Clock durations and game reports are estimates. Displayed target ratings are not calibrated Elo measurements.

## Commit handoff

- User explicitly authorized committing after verification and requested plan, AGENTS.md, and README updates. Updated both repository/project guidance, both READMEs, and marked the implementation plan complete.
- Fresh pre-commit `bun run check`: PASS (340 tests / 29 suites, Biome, TypeScript, Knip, both builds). Staged whitespace check: PASS. No remaining blockers identified within the completed review scope; deferred limits above still apply.
