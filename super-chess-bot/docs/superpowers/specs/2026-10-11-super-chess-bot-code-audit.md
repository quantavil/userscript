# Super Chess Bot code audit — 2026-10-11

## Scope and result

Reviewed the full Super Chess Bot runtime: entrypoint, site selection and both adapters, normalized state, controller, scheduler, UCI client and worker lifecycle, history and SAN, board overlays and gestures, promotion matching, settings, panel and UI. Also inspected packaging/configuration, tests, README, and browser evidence. Baseline: local branch `feat/pychess-support`, commit `a45c6bf`; no origin/main used. Other userscripts were not audited or changed.

Found three correctness bugs, one confirmed efficiency issue, and a Lichess support gap. The four code findings have now been fixed with regression tests. Passing tests do not establish that the implementation is bug-free.

## Confirmed findings and suggested fixes

### 1. High — shallow ponder reuse can exceed the clock budget

Location: `src/engine/uci-client.ts:335`.

Background search starts with `go ponder depth N`, without `movetime`. On a shallow exact match, `promotePonder` sends only `ponderhit`. Changing the JavaScript job's timeLimit does not change the engine's UCI limits. The only foreground stop is the watchdog at `timeLimit + 3000 ms`, and that watchdog marks the otherwise usable search result as an error.

Reproduction with the current UciClient and a controllable worker: start depth-30 pondering, publish depth 4, then request foreground analysis with 25 ms. At 76 ms there was no stop. At approximately 3030 ms it stopped and rejected with `Stockfish search exceeded 3025 ms`. A separate probe using the real local Stockfish 19 lite binary also found no bestmove within 150 ms after a shallow `ponderhit` without a time limit.

Effect: both supported sites can spend seconds on a search despite a small configured or clock-derived budget, then show Retry. This can cause a time loss.

Resolution: arm a stop timer at the foreground budget when promoting a shallow ponder. Budget expiry sends `stop`; a drained bestmove can still resolve the foreground request, and an independent watchdog handles an unresponsive worker. Exact position/history matching and serialization are preserved. The new regression advances time without fabricating an early bestmove and failed against the old implementation.

### 2. Medium — keyboard shortcuts are ignored on ordinary HTML targets

Location: `src/panel.tsx:190`.

The fallback editable-field check uses `'isContentEditable' in target`. Every HTMLElement has this property, including an ordinary noneditable body, button, or board. Consequently the handler returns before E, R, or Ctrl+B.

Browser reproduction in the installed PyChess panel: document.body had the property, its value was false, and pressing E left Enable bot unchecked. The code path applies to both sites. Tests omit real element properties and therefore miss it.

Resolution: test whether `isContentEditable` is true and explicitly handle input, textarea, and select controls. Composed-path behavior is preserved. DOM-backed regressions cover ordinary elements and editable controls; the ordinary-target case failed against the old implementation.

### 3. Medium — terminal engine response is lost between UCI and scheduler

Locations: `src/engine/uci-client.ts:612`, `src/engine/scheduler.ts:124`.

The real Stockfish binary returns `bestmove (none)` on a terminal position. UciClient converts every non-move token to an empty bestmove. The scheduler's explicit `(none)` branch therefore cannot be reached through the real client. The client reproduction returned `{ success: false, bestmove: '' }` after receiving `(none)`.

Effect: if analysis reaches a terminal position before the site marks it finished, the panel reports `Engine returned no legal move` and offers Retry instead of reporting a terminal position. The site's finished-phase check usually masks this; it is not a claim that every checkmate is broken.

Resolution: preserve `(none)` as a typed terminal result and check the position with chessops before reporting a terminal state. A regression now passes the actual UCI response through the client and scheduler and failed against the old conversion.

### 4. Low — Chess.com observer rescans on the bot's own mutations

Location: `src/sites/chesscom.ts:122`.

The adapter watches all body child and attribute mutations and always notifies after a microtask. It does not use the bot-owned-node filtering already present in board.ts, nor deduplicate unchanged snapshots as the PyChess adapter does. Its notifications cause reads and controller board synchronization.

Browser reproduction with the current adapter bundled separately for inspection: adding a hidden `data-gabibot-overlay` element caused one callback; changing only its height caused another callback. The listener was unsubscribed and the temporary element removed afterward. The same callback path also observes unrelated page changes. This proves redundant work, not an infinite loop or a measured loss of playing strength.

Resolution: filter bot-owned/unrelated records before reading state, coalesce relevant events, and deduplicate normalized snapshot identity. Regression tests cover irrelevant mutations, accepted moves, result changes, board/game replacement, and readiness-relevant inputs.

## Lichess support gap and chosen implementation

`src/sites/index.ts:8` selects only Chess.com and PyChess. Userscript match rules in `src/userscript-metadata.ts:14` also exclude Lichess. This is a missing capability, not an accidental regression in an existing Lichess adapter.

At the time of this audit, Lichess Play against computer at maximum strength **8** had no adapter or userscript match rule. The browser session was logged out; the created game route was read-only and no move was submitted.

The user chose the second technical route: capture Lichess's private round controller without API integration. The implementation hooks `site.asset.loadEsmPage` and `site.asset.loadEsm` at document start, captures the controller returned by the Lichess initializer, reads accepted FEN/history and the clock from round state, and submits through `pluginMove`. It is limited to standard AI games at level 8 and avoids direct socket writes. The hook is version-sensitive. See [`2026-10-11-super-chess-bot-audit-and-lichess-design.md`](2026-10-11-super-chess-bot-audit-and-lichess-design.md).

## Verification and browser observations

- The full `bun run check` passed: Biome, TypeScript, Knip, 191 tests in 17 files, and production build. Knip printed a CSS compiler configuration hint. Build: 222.80 kB, 55.36 kB gzip. `git diff --check` also passed.
- After the chosen Lichess route was implemented, the latest full check passed with 204 tests in 19 files and a 238.02 kB (58.49 kB gzip) bundle. The logged-out Lichess player-route limitation remains as described above.
- Current-build browser tests used agent-browser with a temporary `/tmp` shim for userscript resource APIs and the production bundle. No userscript manager was present in that browser, so this is not described as a manager-installed run.
- **Chess.com current build:** selected Maximum (3200), a 1+0 clock, and White. Both clocks displayed 1:00 at game start. After bundle startup, the panel reached Ready with 100 ms move time, depth 30, and background pondering on. Enabling it produced accepted legal moves through `27.Nf3`; 27 White moves appeared in the move list. Most recorded move UI stamps were 0.1–0.3 seconds after the first move. The first `1.e4` stamp was 38.4 seconds, which includes game setup/initialization and is not an engine-time measurement. Automation was turned off; while left disabled, the game ended `0-1` on time with the Guest clock at 0:00 and Maximum at 0:36. This is a deliberately stopped partial run, not a strength result.
- **PyChess current build:** entered through **Play with AI**, selected CHESS and level 8. The default 5+3 real-time controls were active. Panel and engine reported Ready before enabling; legal moves were accepted through `10.O-O-O Qc7`. Clock readings during play were 5:15 and 5:28, reflecting the site's increment and elapsed time. This run did not include a promotion and is not a completed-game result.
- **PyChess promotion history:** the earlier manager-installed corrected production bundle completed [`e4Hl3cG8`](https://www.pychess.org/e4Hl3cG8) by checkmate after accepting `58...g1=Q`, `59.a8=Q`, and `75.b8=Q`. That verifies queen promotion on the previously corrected bundle, but it is not a fresh manager-installed run of the current audit build. The q/r/b/n chooser mappings and promotion metadata are covered by automated tests. Live underpromotion with site auto-promote enabled remains unverified; the anonymous custom-FEN setup was login-restricted.
- Historical completed Chess.com and PyChess games in [`docs/browser-verification.md`](../../browser-verification.md) show additional promotion and clock behavior. They are not evidence for current-build manager installation.
- Automated coverage also checks clock parsing/mapping, low-clock budgeting, cancellation, stale-result rejection, accepted-ply confirmation, settings recovery, and lifecycle handling.

## Suspicions rejected or qualified

- Automatic resume after an accepted human move is intentional and documented; unchanged positions require Resume. It is not counted as a pause bug.
- PyChess excludes ticking clock values from its event fingerprint deliberately. Analysis reads the current clock when scheduling; avoiding clock-triggered repeated searches is correct.
- En-passant canonicalization and king-to-rook conversion for standard castling have purpose and regression coverage; they are not redundant chess implementations.
- Separate input submission and accepted-ply confirmation protect against optimistic board updates and fast opponent replies. They should be retained.
- Legacy GabiBot identifiers/settings names preserve existing storage and overlay detection. Cosmetic renaming is not a correctness fix.
- No claim of calibrated Elo, flawless behavior, or guaranteed bullet performance follows from these tests or partial games.

## Remaining coverage

- Repeat browser verification through a real userscript manager using the current build.
- Recheck promotion on the current build and underpromotion if a legal fixture can be reached.
- Complete separate live reconnect, active board/game replacement, trusted interruption/resume, and disable-during-search scenarios that remain inconclusive or unverified.
- Verify the current built bundle on Lichess in a player AI round at level 8, including an accepted move and clock behavior; test promotion and underpromotion if a legal setup is available.

The current fixes and tests reduce known failures; they do not prove the whole codebase is bug-free.
