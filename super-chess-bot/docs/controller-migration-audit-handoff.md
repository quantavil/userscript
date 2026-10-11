# Audit handoff: Chess.com controller migration (commit `7ce3dac`)

For an independent reviewer (human or AI) to double-check this migration. Everything below is
stated with its evidence level.

## Scope

- `src/sites/chesscom-bridge.ts`: document-start `wc-chess-board` init/createGame wrapper.
- `src/sites/chesscom.ts`, `src/sites/chesscom-state.ts`: controller reads + `controller.move` submit.
- Deleted: `executeMove`, `simulateClick/DragMove`, `maybeSelectPromotion`, `waitForFenChange`,
  `src/promotion.ts`, `tests/board-input.test.ts` (434 lines), `moveMethod` setting + panel control,
  `'gestures'` transport.
- Kept deliberately: `activateElement` (PyChess promotion, `src/sites/pychess.ts:298,207`),
  trusted-input observers, `cancelPendingMove`/`moveRevision` (scheduler), `confirmSiteMove`.

## Verified baseline

- `bun run check` green at commit: Biome, `tsc`, Knip, 219 tests / 20 files, Vite build.
- Live timed guest game (`play/computer`, 1 min): 50/50 steady-state `controller.move()` < 10ms
  (median 3.9ms, max 6.3ms); zero fetch/XHR/WS frames on both UI-drag and controller paths;
  identical resulting FENs; 10 rapid move/undo cycles with stable clocks and restored FEN;
  drag-opened chooser resolved by `move({promotion:'q'})` alone → `Move`/`a8=Q+`, state back to
  `Idle`, chooser auto-dismissed, zero DOM clicks.
- Old stored settings containing `moveMethod` still parse (Valibot strips unknown keys).

## Audit review of uncertain items (post-audit status)

### 1. Clock selector gap — TRUE issue (Fixed & verified)
- **Status:** **Fixed.**
- **Details:** The adapter previously scraped only `.clock-player-turn .clock-time-monospace, .clock-player-turn .clock-time` in `getRemainingMs`, missing `.move-time-content` on `play/computer` boards and causing `remainingMs` to read `null`.
- **Resolution:** Unified `CLOCK_SELECTOR` in `src/sites/chesscom-state.ts` to include `.clock-player-turn .move-time-content` and `.clock-player-turn.move-time-content`, shared it with `src/sites/chesscom.ts`, and added unit tests in `tests/sites.test.ts` verifying `0:09.5` and `0:37` clock parsing.

### 2. `resetStuckPromotionWindow` efficacy — FALSE POSITIVE (Safe failover)
- **Status:** **Verified safe / false positive.**
- **Details:** In `submitMove` (`src/sites/chesscom.ts`), move submission is guarded by `current.snapshot.inputReady`. If `getState()` remains `PomotionAreaShowing`, `inputReady` evaluates to `false` and move submission fails safe without corrupting the board. In addition, resolving via direct `controller.move({ promotion: 'q' })` self-resets state to `Idle` and dismisses the chooser.

### 3. `isWhiteOnBottom` fallback — FALSE POSITIVE (Sound hierarchy)
- **Status:** **Verified sound / false positive.**
- **Details:** `getOrientation` in `src/sites/chesscom-state.ts` tests `options.flipped` first:
  ```ts
  if (typeof options.flipped === 'boolean') return options.flipped ? 'black' : 'white';
  ```
  and falls back to `game.getPlayingAs() === 2 ? 'black' : 'white'` when options are unavailable or ambiguous. Black orientation is reliably resolved.

### 4. Disable-gating equivalence — FALSE POSITIVE (Leak-proof)
- **Status:** **Verified leak-proof / false positive.**
- **Details:** Traced end-to-end:
  - `controller.setEnabled(false)` invokes `stop()`, setting `isActive = false` and calling `cancelAnalysis()`.
  - `cancelAnalysis()` aborts the in-flight `AbortController` and increments `revision`.
  - `scheduleAnalysis` checks `BotState.hackEnabled` and guards position currentness with `!ctrl.signal.aborted && !!BotState.hackEnabled`.
  - Auto-move dispatch requires `BotState.autoMove && current()`.
  - `submitMove` re-checks `request.signal.aborted` and `request.isCurrent()` immediately prior to calling `game.move()`.

### 5. Engine stall after undo bursts — FALSE POSITIVE (External site behavior)
- **Status:** **External / false positive.**
- **Details:** Rapid undo cycles stall Chess.com's web worker / opponent bot engine. Adapter state, FEN, and turn tracking remain strictly synchronized. Normal play without programmatic undo bursts is unaffected.

### 6. Deleted-test regret risk — FALSE POSITIVE (Clean architecture)
- **Status:** **Non-issue / false positive.**
- **Details:** `tests/board-input.test.ts` exercised retired synthetic gestures and obsolete promotion DOM click handlers. No part of the codebase relies on synthetic gestures; tests remain preserved in git history at `7ce3dac^`.

## Suggested live acceptance (manager-installed bundle, Violentmonkey sync page mode)

Full 1+0 game as White: moves submit, Black-orientation game reads `black`, queen promotion in-game,
enable/disable mid-search, trusted-interruption pause/resume, and clock drain visible in snapshots.
Record opponent rating, result, plies, and clocks as in `docs/browser-verification.md`.
