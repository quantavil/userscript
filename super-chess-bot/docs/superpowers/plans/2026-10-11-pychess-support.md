# PyChess AI Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution or superpowers:subagent-driven-development if explicitly selected. Implement task-by-task; steps use checkbox syntax.

**Goal:** Play a complete standard PyChess Fairy-Stockfish level-7 AI game with the existing local engine while preserving Chess.com behavior.

**Architecture:** Introduce a narrow site adapter around the shared controller, scheduler, panel, board presentation, and confirmation. PyChess reads the accepted Chessground FEN and server-rendered SAN history, submits through `selectSquare`, and confirms the expected position at its ply. Keep Chess.com private APIs and gesture transport in its adapter.

**Tech Stack:** Bun, TypeScript, Vite/vite-plugin-monkey, Vitest, chessops, Stockfish 19.0.1 worker, Preact/Signals, Valibot. No new runtime dependencies.

**Spec:** [2026-10-11-pychess-support-design.md](../specs/2026-10-11-pychess-support-design.md)

**Research:** [Live evidence and deployed-source map](../../pychess-research.md)

## Global constraints

- Edit only `super-chess-bot/`; use current **local `main`** as baseline, preserving the spec/plan. It was incorporated through `6377b40` during research. Inspect any later local changes before incorporating them.
- Acceptance target: Play with AI → CHESS → level 7, orthodox start, Chess960 off, Random-Mover off, real time, **1+0**.
- Automation starts disabled; minimum configured move budget remains **100 ms**, depth cap **30** in the baseline acceptance run.
- Use `cg.selectSquare` through the site's legal user-move callback. Synthetic mouse events are rejected by the deployed board. Never use force-selection, `cg.move()`, a raw socket sender, or premove chains.
- Keep worker/UCI scheduling and exact FEN/history/depth ponder reuse; no page-thread fallback or custom chess-rule engine.
- Preserve baseline Valibot settings, panel hotkeys, pointer/right-click guards, overlays, Chess.com matches, pinned resources, and GPL-3.0-or-later metadata.
- `bun run test` runs the Vitest suite. Use `bun run check` for Biome, TypeScript, Knip, Vitest, and production build; native `bun test` is incompatible with existing mocks.
- Retain 1,000 ms confirmation timeout and one-second lifecycle reconciliation. Observers, not a fixed per-move delay, drive normal play.
- Production browser verification uses `agent-browser` and a userscript manager in dedicated Chromium. Browser automation is not a userscript runtime dependency.

## Review focus

1. Optimistic local pieces/turn versus accepted FEN: no premature confirmation or opponent-turn input (Tasks 2, 3).
2. A fast reply or repeated position: confirm the expected own-move position at its exact ply in the same game (Tasks 2, 3).
3. Board flip, replay selection, and instance replacement: preserve player identity and invalidate obsolete input (Tasks 2, 4).
4. Auto-promote enabled with underpromotion: force the chooser temporarily and restore preference/metadata even on cancellation (Task 3).
5. Stale initial status, terminal without a move, and connecting/decimal clocks: stop input and budget against the correct live clock (Tasks 2, 4).

## File responsibilities

| File | Responsibility |
| --- | --- |
| `src/sites/types.ts` | Narrow normalized site/read/move contracts |
| `src/sites/index.ts` | Exact-host selection and one active adapter |
| `src/sites/chesscom.ts` | Existing board selection/private game API, Move event, clocks, gestures, promotion selectors, rematch |
| `src/sites/pychess-state.ts` | Defensive parsing of observed PyChess metadata, FEN, SAN/plies, phase, clocks |
| `src/sites/pychess.ts` | Collect page observations, stable identity, watchers, square-selection/promotion submission |
| `src/board-input.ts` | Existing reusable click/drag primitives and guarded element activation; no site selectors or state imports |
| `src/board.ts` | Presentation/geometry, trusted-input revision, serialization, authoritative confirmation |
| `src/history.ts` | Existing Chess.com history plus reusable chessops SAN replay/canonical FEN helpers |
| `src/state.ts` | Bot/settings state and thin snapshot-derived compatibility helpers |
| `src/controller.ts`, `src/engine/scheduler.ts`, `src/index.ts` | Lifecycle, stale-result gates, adapter clocks/history, lobby prewarm |
| `src/ui.ts`, `src/panel.tsx` | Snapshot-based rendering and site capabilities |
| Existing/new `tests/*.test.ts` | Observable adapter/core contracts; retain current regressions |
| Metadata/docs/`dist/bundle.user.js` | Installation, supported scope, production artifact and browser evidence |

## Task 1: Establish the contract with a functioning Chess.com adapter

**Files:** Create `src/sites/types.ts`, `src/sites/index.ts`, `src/sites/chesscom.ts`, `src/board-input.ts`; modify `src/state.ts`, `src/board.ts`; update `tests/state.test.ts`, `tests/adapter.test.ts`, `tests/board-input.test.ts`; create `tests/sites.test.ts`.

**Interfaces produced:**

```ts
type SiteId = 'chesscom' | 'pychess';
type Color = 'w' | 'b';
interface GameSnapshot {
  identity: object; gameId: string; board: HTMLElement;
  fen: string; playerColor: Color; sideToMove: Color;
  orientation: 'white' | 'black'; phase: 'live' | 'replay' | 'finished';
  inputReady: boolean; remainingMs: number | null;
  history?: PositionHistory; confirmedFens?: readonly string[]; // index = ply; 0 = root
}
type SiteRead = { kind: 'game'; snapshot: GameSnapshot }
  | { kind: 'waiting' | 'ineligible'; reason: string };
interface MoveRequest {
  identity: object; fromFen: string; uci: string; expectedFen: string;
  expectedPly: number | null; signal: AbortSignal; isCurrent: () => boolean;
}
interface SiteAdapter {
  id: SiteId;
  capabilities: { input: 'gestures' | 'selection'; autoRematch: boolean };
  read(): SiteRead;
  subscribe(listener: () => void): () => void;
  submitMove(request: MoveRequest): Promise<boolean>; // input initiated, not acknowledgement
  cancelInput(): void; // only unfinished adapter-owned input
  requestRematch(): boolean;
}
function selectSite(hostname: string): SiteAdapter | null;
function getSite(): SiteAdapter | null;
function readSite(): SiteRead;
```

`PositionHistory` remains the existing exported type from `history.ts`. Adapter selection initializes once in startup. Both factories accept `page: () => Window`, defaulting to an internal reader for `unsafeWindow` (or `window` outside a userscript); tests inject their existing fake page/document fixtures. Stable identity belongs to the game + board/controller instance, not each read's object allocation.

- [x] Add tests: exact Chess.com hostname selection and reject `pychess.org.example.test`; repeated Chess.com reads retain identity; hidden boards are skipped; board/game replacement changes identity; Move subscriptions detach; existing click/drag and promotion behavior is preserved. Positive PyChess selection is added with its factory in Task 2.

```ts
it('selects only an exact supported host', () => {
  expect(selectSite('www.chess.com')?.id).toBe('chesscom');
  expect(selectSite('pychess.org.example.test')).toBeNull();
});
```
- [x] Run `bun run test -- tests/sites.test.ts tests/state.test.ts tests/adapter.test.ts tests/board-input.test.ts`; confirm new assertions fail before implementing the boundary.
- [x] Define the contract and `createChesscomAdapter()`. Move site-specific selection/private API/clock/rematch/promotion logic into it. Extract existing gesture bodies to `board-input.ts` with injected board/square-coordinate readers and guard; keep their event targeting and cancellation behavior. Adapt state helpers and board watcher/transport wrappers without changing controller scheduling yet. `sites` may depend on gesture/history helpers; those helpers must not import `board.ts` or active-site state.
- [x] Run the focused tests, then `bun run check`. Existing behavior passes and no cyclic site/board imports appear in the changed files. Do not register incomplete PyChess support in userscript matches yet.
- [x] Commit only this task's subproject files: `refactor(chess): isolate site state and move transport`.

## Task 2: Parse accepted PyChess state, history, events, and clocks

**Files:** Create `src/sites/pychess-state.ts`, `src/sites/pychess.ts`, `tests/pychess-state.test.ts`, `tests/pychess-events.test.ts`; modify `src/history.ts`, `tests/history.test.ts`, `src/sites/index.ts`.

**Interfaces:** Consume Task 1 contract. Produce `createPychessAdapter(): SiteAdapter`; export `parsePychessObservation(observation: PychessObservation, identity: object): SiteRead` from `pychess-state.ts`. Define `PychessObservation` there with explicit metadata, board ownership/visibility/dimensions, full FEN, displayed placement/turn/movable color, ordered `{ ply: number; san: string; active: boolean }[]`, rendered result/postgame flag, and clock min/sec/connecting fields. Collect those fields only in `pychess.ts`.

Produce in `history.ts`:

```ts
function canonicalFen(fen: string): string | null;
function replaySanLine(startFen: string, sans: readonly string[]):
  { history: PositionHistory; fens: string[] } | undefined;
```

Require all six fields for PyChess FEN observations. Use chessops parse/setup, SAN parsing, move legality, and canonical serialization; `fens[0]` is the canonical root, followed by each position. Preserve existing `readPositionHistory` behavior for Chess.com.

- [x] Add fixture-based tests using the research game: initial metadata with empty initialfen; `e4`, `c5` history and exact final FEN; optimistic e4 pieces with initial accepted FEN; replay at ply 1 of 2; missing or conflicting identity; non-chess/Chess960; invalid level; disconnected/foreign board; malformed FEN; truncated/noncontiguous SAN. Assert input eligibility, FEN, phase, and history independently.
- [x] Add parameterized tests: White/Black × both orientations; clocks `01:00+0s` → 60,000 ms and `00:06.0+0s` → 6,000 ms; increment excluded; malformed clock gives null; connecting clock makes input unavailable; stale body status with `0-1` plus postgame UI gives finished; missing movable color alone does not.
- [x] Add event tests: movelist-only acknowledgement notifies, overlay/clock/animation changes with unchanged normalized state do not cause repeated position events, listener errors are isolated, detach on board or cg replacement, terminal UI changes notify even with identical FEN.

```ts
it('replays the accepted e4 c5 line', () => {
  const root = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const line = replaySanLine(root, ['e4', 'c5']);
  expect(line?.history.moves).toEqual(['e2e4', 'c7c5']);
  expect(line?.fens).toHaveLength(3);
  expect(line?.fens[2]).toBe('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
});
```
- [x] Run `bun run test -- tests/pychess-state.test.ts tests/pychess-events.test.ts tests/history.test.ts`; verify the new contracts fail before implementation.
- [x] Implement collection/parsing and cached SAN replay, then select this factory for both exact PyChess hosts. Check round view, matching URL/game ID, username membership, Fairy-Stockfish identity, level 0–8, real-time chess and owned visible 8×8 board. Use body data only for initial identity/config; full state FEN, movelist, result and live clocks drive later reads. Return recoverable reasons rather than defaults for missing color/FEN. Keep identity stable until game ID, board or cg changes. Observe board, movelist and result/control subtree; deduplicate microtask updates by identity, accepted FEN, phase, input readiness and result. Exclude ticking remainingMs from the position-event fingerprint; a connecting-state change still invalidates readiness. Do not wrap the socket or replace site callbacks. Provide no-op/false submission until Task 3.
- [x] Run focused tests and `bun run check`; commit `feat(pychess): read accepted AI game state and history`.

## Task 3: Submit legal selections and confirm accepted moves

**Files:** Modify `src/sites/pychess.ts`, `src/sites/chesscom.ts`, `src/board.ts`, `src/board-input.ts`, `src/promotion.ts` as needed; create `tests/pychess-input.test.ts`; update `tests/board-input.test.ts`, `tests/board.test.ts`.

**Interfaces:** Consume `MoveRequest`, snapshot/history helpers, and adapter subscriptions. Implement `submitMove(request): Promise<boolean>` for PyChess and keep `executeMove` compatible with existing scheduler callers until Task 4. Add `confirmSiteMove(request: MoveRequest): Promise<boolean>` internally in `board.ts`; subscribe before transport, timeout at 1,000 ms, and use accepted history at `expectedPly` when supplied.

The pending request's `isCurrent` checks identity, accepted source FEN, settings, signal and input revision. Input readiness/side-to-move/legal destination are additional checks immediately before square selection; they are not acknowledgement predicates after optimistic destination selection.

- [x] Add submission tests: ordered selectSquare(from/to), no `cg.move()`/forced selection, legal destinations only, no opponent-turn premove, stale identity/FEN/revision and abort prevent selection, cancellation clears only bot-owned selection. Cover both standard castling sides: resolve a site-legal king destination using chessops castling normalization and the site's destination map, then verify the engine's expected resulting FEN; reject unsupported mappings.
- [x] Add promotion tests for q/r/b/n with auto-promote on/off. Assert Ctrl metadata override is restored in `finally`; select exact role/color through its visible square; hidden/unrelated chooser cannot be activated; abort while waiting prevents chooser click; no localStorage preference changes.
- [x] Add confirmation tests: optimistic pieces do not confirm; matching canonical server position at expected ply does; fast reply with own-move history confirms; wrong halfmove/castling/legal EP or wrong expected ply does not; a matching older repetition or another game does not; timeout/disable/trusted interruption settles and releases listeners. Retain Chess.com's established confirmation semantics.
- [x] Run `bun run test -- tests/pychess-input.test.ts tests/board-input.test.ts tests/board.test.ts`; confirm new assertions fail first.
- [x] Implement synchronous guarded selections on the visible owned board; clear stale bot-owned selection before starting, never force legal acceptance. For promotions temporarily set stats.ctrlKey true during destination selection and restore immediately; boundedly wait for the visible chooser, activate its exact square, then await authoritative confirmation. Cancellation cleanup must not cancel later human selection. Subscribe before selecting, read once immediately and again on events/abort so an accepted fast update is not lost to core cancellation. Preserve serialization and the current 1,000 ms bound.
- [x] Run focused tests and `bun run check`; commit `feat(pychess): submit and confirm legal board selections`.

## Task 4: Connect shared lifecycle, scheduling, startup, and UI

**Files:** Modify `src/controller.ts`, `src/engine/scheduler.ts`, `src/state.ts`, `src/index.ts`, `src/ui.ts`, `src/panel.tsx`; update `tests/controller.test.ts`, `tests/scheduler-deadline.test.ts`, `tests/entrypoint.test.ts`, `tests/panel.test.ts`, `tests/ui.test.ts`.

**Interfaces:** Consume `readSite`, adapter capabilities/subscriptions, `GameSnapshot.identity/phase/inputReady/history/remainingMs`, and transport from Task 3. Keep `scheduleAnalysis(kind: string, fen: string): Promise<void>` and controller public actions compatible. Scheduler uses a captured stable identity plus current accepted FEN for stale checks and request.expectedPly from accepted history length + 1.

- [x] Add controller tests: waiting/ineligible cancels old work; finished/replay cancels even when FEN is unchanged; snapshot allocation alone does not reset the engine; game/board identity replacement does; explicit resume remains available after trusted interruption; optimistic pending input is not canceled merely because inputReady temporarily becomes false. A new input still requires readiness.
- [x] Add scheduler tests: adapter player-clock budget uses existing `max(1, floor(min(configured, remaining/40) - 12))`; null clock uses configured budget; decimal clocks work; disable/instance change rejects delayed search results; accepted SAN history reaches analysis/ponder; exact matching/mismatching history retains current ponder behavior. Ponder only live accepted positions.
- [x] Add startup/UI tests: PyChess lobby mounts panel and prewarms without a Chess.com element wait; no persisted setting auto-enables; site-selection transport is explained; gesture/rematch controls hidden or disabled only for PyChess without overwriting their saved values; flip updates overlays; existing Ctrl+B/slider hotkeys and Shadow DOM behavior remain.
- [x] Run the focused tests and verify new cases fail before changes.
- [x] Replace host-specific core reads with snapshots. Handle phase/eligibility transitions before same-FEN early returns; use stable identity for lifecycle and async stale gates. Keep one-second reconciliation as recovery. Move rematch into the Chess.com capability. Start adapter observation immediately after panel setup/prewarm, with no site-specific element wait in index.ts. UI reads accepted FEN/player color and capability state. Preserve current worker/UCI implementations.
- [x] Run `bun run check`; inspect `controller.ts`, `engine/scheduler.ts`, `ui.ts`, `index.ts`, and state compatibility helpers for remaining Chess.com/PyChess DOM selectors. Commit `feat(chess): connect site adapters to shared bot lifecycle`.

## Task 5: Package both sites and document installation/limits

**Files:** Modify `vite.config.ts`, `package.json`, `README.md`, `AGENTS.md`, `docs/browser-verification.md`, `dist/bundle.user.js`; add packaging assertions to `tests/sites.test.ts` or `tests/entrypoint.test.ts`.

- [x] Add metadata assertions: original Chess.com matches remain; both exact PyChess hosts are included; GPL and version-pinned Stockfish resources remain. No new dependencies.
- [x] Update userscript/package description, add `https://www.pychess.org/*` and `https://pychess.org/*` matches, and document both supported sites. Explain PyChess AI eligibility, selection transport, 1+0 slider index 4, level-7 acceptance, enabled-off startup, and replay/recovery. Update only subproject AGENTS with the adapter boundary and AI browser checks. Do not rewrite previous Chess.com results.
- [x] Run `bun run check`; inspect `dist/bundle.user.js` matches/resources/license and run `git diff --check`. Confirm all feature-diff paths are under `super-chess-bot/`.
- [x] Commit the validated package/docs/artifact: `feat(chess): package PyChess AI support`.

## Task 6: Verify the production userscript in the actual AI flow

**Files:** Modify `docs/browser-verification.md` with measured evidence; update this plan's completed checkboxes and any necessary narrowly scoped fixes/tests.

**Sequence:** Use `agent-browser skills get core`, a dedicated named Chromium session, and a userscript manager. Install the production bundle; do not claim acceptance from eval-loaded helpers. Use the previously successful manager-install method documented in the project where possible. Browser-driver input is for setup and interruption probes; game moves must come from the installed userscript.

- [x] Open `https://www.pychess.org/?any`, dismiss Create a game if present, then click **Play with AI**. Verified CHESS, empty alternate start/custom FEN, Chess960 unchecked, Random-Mover unchecked, real time, level 7, minute slider index **4**, increment **0**, and deliberately selected White.
- [x] Before the acceptance game, verified panel/worker `Ready` and bot disabled. Used 100 ms, depth 30, pondering enabled; both clocks showed 1:00 at start. The installed production bundle completed the game with accepted movelist progression.
- [x] Black-side probe and board flip: after flipping to White orientation with Black to move, the bot played `1...Nf6` correctly.
- [x] Active replay and live return: replay showed `Replay mode` with no move; fast-forward to the live position resumed analysis.
- [ ] Disable during a deliberately long search: attempted, but observation came after the game had advanced to ply 9, so cancellation of that search is inconclusive.
- [ ] Trusted left-button/touch interaction and explicit Resume: not verified.
- [ ] Active new-game/board replacement and live reconnect synchronization: not verified. A terminal-game reload restored final FEN/history/result, bot disabled, and panel `Ready`; this does not cover a live reconnect.
- [x] Unsupported Crazyhouse remained ineligible, and `/?any` without an identified AI round stayed in waiting state without moving.
- [x] Castling: observed White `O-O` accepted at ply 25 and continued after AI `...O-O-O` at ply 46. A regression test now checks orthodox castle history as `e8g8 e1c1`.
- [x] Queen promotion: corrected production bundle accepted `...g1=Q`, `a8=Q`, and `b8=Q` in the level-7 game.
- [ ] Underpromotion with saved auto-promote on: not verified. The anonymous custom-FEN AI setup requires login; no custom fixture was available. Promotion unit tests cover q/r/b/n selection and Ctrl metadata restoration, but do not replace this browser check.
- [x] Recorded game URLs, AI level, settings, outcomes, plies, start/end clocks, worker readiness, and limitations. The 1+0 game used about 18 seconds of the bot clock (1:00 to 0:42); per-move engine search, submission, and accepted-confirmation durations were not separately instrumented and remain unmeasured. The research time-out is not counted as acceptance or an engine result.
- [x] Fixed observed castling-history and promotion-selector issues with regression coverage; `bun run check` passed after the changes. Reviewed the feature diff and confirmed only `super-chess-bot/` changed.
- [x] Commit the browser evidence once accurate: `docs(chess): record PyChess AI browser verification`.

## Completion criteria and execution handoff

Completed means: both sites retain their intended behavior; new contract/core tests pass; strict lint/type/unused checks and production build pass; pinned metadata is preserved; installed production userscript completes the standard level-7 AI game; lifecycle/cancellation/promotion checks have recorded results; and no other userscript was edited. A transport probe alone does not satisfy this. Task 6 remains in progress while the unchecked browser checks above remain unresolved.

Recommended execution: **native in this worktree**, since these tasks share the adapter/confirmation interfaces and follow an ordered migration. Independent agents have not been requested. Review the written plan and the researched change from synthetic events to legal square selection before starting product implementation.
