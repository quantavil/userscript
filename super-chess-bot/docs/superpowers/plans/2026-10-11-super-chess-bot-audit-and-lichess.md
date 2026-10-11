# Super Chess Bot audit and Lichess implementation plan

**Spec:** `docs/superpowers/specs/2026-10-11-super-chess-bot-audit-and-lichess-design.md`

**Execution:** existing `feat/pychess-support` worktree based on local `main`. No remote branch was used.

## Constraints

- Work only in `super-chess-bot`.
- Preserve existing Chess.com and PyChess behavior and settings.
- Lichess support is only for standard Play against computer at maximum AI level 8.
- Use Lichess's captured round controller; do not add API integration or direct socket writes.
- Promotion and clock handling are included where the controller exposes them; missing clock data falls back to the configured move budget and missing controller/state blocks moves.
- Website AI checks use maximum strength only: Chess.com Maximum 3200, PyChess level 8, Lichess level 8.
- Use Bun and run project checks because the user asked to fix and verify the project.

## Task 1: Bound promoted shallow ponder searches — complete

**Files:** `src/engine/uci-client.ts`, `tests/stockfish.test.ts`.

- [x] Add a deterministic regression for promoting a shallow exact ponder and stopping it at the foreground deadline.
- [x] Retain the separate stop-response watchdog and drain behavior.
- [x] Confirm the regression fails against the old behavior, then passes after the change.
- [x] Run focused tests and the full check.

## Task 2: Preserve terminal UCI results — complete

**Files:** `src/engine/analysis.ts`, `src/engine/uci-client.ts`, `src/engine/scheduler.ts`, `tests/stockfish.test.ts`, `tests/scheduler-deadline.test.ts`.

- [x] Add a client-to-scheduler regression for the actual UCI line `bestmove (none)`.
- [x] Validate terminal positions with `chessops`; keep malformed or nonterminal missing moves recoverable.
- [x] Confirm the regression fails against the old conversion, then passes after the change.
- [x] Run focused tests and the full check.

## Task 3: Restore panel keyboard shortcuts — complete

**Files:** `src/panel.tsx`, `tests/panel.test.ts`.

- [x] Cover E, R, and Ctrl+B on ordinary elements and suppress them for controls and editable content.
- [x] Preserve composed-path behavior for Shadow DOM controls.
- [x] Confirm the regression fails against the old behavior, then passes after the change.
- [x] Run focused tests and the full check.

## Task 4: Reduce Chess.com observer work — complete

**Files:** `src/sites/chesscom.ts`, `tests/chesscom-events.test.ts`.

- [x] Prove bot overlay and unrelated mutations do not notify the controller.
- [x] Preserve accepted moves, results, board/game replacement, and readiness changes.
- [x] Coalesce relevant records, deduplicate unchanged snapshots, and confirm regressions fail against the old behavior.
- [x] Run focused tests and the full check.

## Task 5: Add the Lichess round-controller adapter — complete for ordinary moves

**Files:** `src/sites/lichess-bridge.ts`, `src/sites/lichess.ts`, `src/sites/index.ts`, `src/sites/types.ts`, `src/userscript-metadata.ts`, `src/index.ts`, `src/panel.tsx`, related tests.

- [x] Add exact Lichess host selection and document-start metadata.
- [x] Pin Violentmonkey injection to page context; the bridge needs the page's `window.site`, and automatic fallback to content context can leave the hook on the wrong global.
- [x] Wait for `document.body` before mounting the panel while capturing the site round loader at startup.
- [x] Wrap the page and module loaders only for the `round` module; capture its returned controller through Lichess's `loadEsm` method.
- [x] Require AI source, level 8, standard chess, player participation, and a valid live round before allowing moves.
- [x] Read accepted FEN/history and current clock from round state; never treat optimistic Chessground placement as accepted.
- [x] Validate UCI, predicted FEN, and legal destinations before calling `pluginMove`.
- [x] Pass explicit promotion roles and pre-confirm the automated move.
- [x] Add regressions for bridge capture, eligibility, accepted FEN, clock, regular moves, underpromotion, stale input, and accepted-move events.
- [x] Add a metadata regression for page-context injection and confirm it failed before the setting was added.
- [x] Add a history-cache regression for an accepted step completed in place; confirm it fails before the cache key includes accepted step contents.
- [x] Run the full check: 207 tests in 19 files and production build at 238.68 kB (58.67 kB gzip).
- [x] Review the generated userscript metadata and keep the diff inside `super-chess-bot`.
- [x] Install the current bundle through Violentmonkey and verify 15 accepted bot moves with replies in a fresh level-8, 5+0 game.
- [x] Observe both live clocks and verify the active clock changes during play.
- [ ] Verify promotion in a live Lichess game; underpromotion is covered only by unit tests.

## Task 6: Maximum-strength browser coverage — partial evidence recorded

**Files:** `docs/browser-verification.md`, production bundle from the normal build.

- [x] Previous current-build checks covered Chess.com Maximum 3200 and PyChess level 8 through a temporary page harness; the harness was not a manager installation.
- [x] Create a standard level-8 Play against computer game at 5+0 through the Lichess UI.
- [x] Run the current manager-installed bundle through 15 accepted bot moves and observe AI replies and clock behavior.
- [ ] Verify queen promotion and underpromotion in a live Lichess game.
- [x] Keep promotion and other unverified browser lifecycle paths clearly marked; do not claim the codebase is bug-free from unit tests alone.

## Completion status

Tasks 1–4 were already implemented and regression-tested before this Lichess change. The Lichess adapter now passes the full project check and has live ordinary-move verification at AI level 8 through 15 bot moves with replies. Live promotion and other unverified browser lifecycle paths remain open.
