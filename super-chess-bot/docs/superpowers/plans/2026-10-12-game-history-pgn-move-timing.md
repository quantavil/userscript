# Game History, Move Timing & Standard PGN Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Activity panel from a raw, bot-only move log into a full-game Lichess-inspired move scoresheet (tracking both White and Black with move timings) and export standard pasteable PGN with elapsed move times and telemetry warning notice.

**Architecture:**
A dedicated `src/pgn.ts` module generates standard PGN strings compliant with the 7-tag roster, `{ [%emt ...] }` move timing annotations, and a terminal telemetry warning comment. A reactive `src/game-history.ts` tracker records both White and Black plies from site snapshots, calculating elapsed move times using site clock deltas and wall-clock telemetry fallback. The Preact `src/panel.tsx` renders a paired move scoresheet with timing badges and copies valid PGN to the clipboard on demand.

**Tech Stack:** TypeScript, Preact Signals, chessops (Chess, parseUci, makeSan, parsePgn, parseComment), Vitest, Biome, Vite.

**Spec:** User request:
1. Show both White and Black moves in the Activity panel with move timings inspired by Lichess.
2. Estimate/track move elapsed time for both White and Black.
3. Copy button exports standard valid PGN that users can paste directly into Lichess or Chess.com analysis boards.
4. Warning comment at the end of the PGN noting that timings and evaluations are client-side browser telemetry estimates.

## Global Constraints
- Pure TypeScript, strict mode, zero `any`.
- All PGN exports must parse cleanly without syntax errors using `chessops/pgn.parsePgn`.
- Elapsed move times must use standard `[%emt H:MM:SS.s]` or `[%emt H:MM:SS]` tags recognized by Lichess and Chess.com.
- Maintain full test suite pass (`bun test`) and clean code quality checks (`bun run check`).
- License remains GPL-3.0-or-later.

## Review Focus
1. Starting from custom FEN (e.g. Chess960 or mid-game fen): PGN must include `[SetUp "1"]` and `[FEN "..."]`.
2. Black moves first from non-standard position: move numbers must format correctly with `1... <move>`.
3. Quick premoves or sub-second moves: `elapsedMs` must format safely without negative numbers or NaN (e.g. `0:00:00.1` or `0:00:00`).
4. Rapid board updates or no moves played yet: Copy action must fall back gracefully to system log or empty PGN with headers.
5. PGN comment safety: Warning notice must not contain closing braces `}` that could prematurely terminate PGN comments.

---

### Task 1: PGN Generator and Formatter (`src/pgn.ts`)

**Files:**
- Create: `src/pgn.ts`
- Test: `tests/pgn.test.ts`

**Interfaces:**
- Consumes: `chessops/pgn` (for validation in tests).
- Produces:
  ```ts
  export interface PgnMove {
    ply: number;
    san: string;
    elapsedMs?: number | null;
  }

  export interface PgnOptions {
    event?: string;
    site?: string;
    date?: string;
    round?: string;
    white?: string;
    black?: string;
    result?: string;
    startFen?: string;
    warningNotice?: string;
  }

  export function formatEmt(ms: number): string;
  export function buildPgn(moves: readonly PgnMove[], options?: PgnOptions): string;
  ```

- [ ] **Step 1: Write the failing tests in `tests/pgn.test.ts`**
  Cover `formatEmt` (sub-second, single digit second, minutes), standard game PGN generation, custom FEN PGN generation, and verify output with `parsePgn`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test tests/pgn.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement `formatEmt` and `buildPgn` in `src/pgn.ts`**
  Implement standard PGN generation with 7-tag roster, `{ [%emt ...] }` tags, and terminal warning comment `{ Warning: Move timings and evaluations are client-side browser telemetry estimates. } *`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test tests/pgn.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add src/pgn.ts tests/pgn.test.ts && git commit -m "feat(pgn): add standard PGN builder with move timings and warning notice"`

---

### Task 2: Game History & Move Timing Tracker (`src/game-history.ts`)

**Files:**
- Create: `src/game-history.ts`
- Test: `tests/game-history.test.ts`

**Interfaces:**
- Consumes: `src/pgn.ts`, `chessops/chess`, `chessops/fen`, `chessops/san`, `chessops/util`.
- Produces:
  ```ts
  export interface GameMoveRecord {
    ply: number;
    uci: string;
    san: string;
    turn: 'w' | 'b';
    elapsedMs: number | null;
  }

  export interface MovePairView {
    moveNumber: number;
    white?: GameMoveRecord;
    black?: GameMoveRecord;
  }

  export class GameHistoryTracker {
    reset(gameId?: string, startFen?: string): void;
    updateFromSnapshot(snapshot: GameSnapshot): void;
    getMoves(): readonly GameMoveRecord[];
    getMovePairs(): readonly MovePairView[];
    exportPgn(siteName?: string): string;
  }
  export const gameHistorySignal: Signal<readonly GameMoveRecord[]>;
  ```

- [ ] **Step 1: Write failing tests in `tests/game-history.test.ts`**
  Test recording moves from UCI sequences, calculating elapsed time from clock deltas and wall-clock duration, grouping into move pairs, and exporting PGN.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test tests/game-history.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `GameHistoryTracker` in `src/game-history.ts`**
  Implement incremental move observation, clock delta tracking for White and Black, SAN replay generation, and reactive Preact signal updates.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test tests/game-history.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add src/game-history.ts tests/game-history.test.ts && git commit -m "feat(history): track both players' moves with timing and SAN replay"`

---

### Task 3: Site Adapters & Controller Integration (`src/controller.ts`, `src/ui.ts`, `src/sites/*`)

**Files:**
- Modify: `src/sites/types.ts`
- Modify: `src/sites/chesscom.ts`, `src/sites/chesscom-state.ts`
- Modify: `src/sites/lichess.ts`
- Modify: `src/controller.ts`
- Modify: `src/ui.ts`

**Interfaces:**
- Connects `GameHistoryTracker` to `controller.tick()`.
- Updates `GameSnapshot` with `whiteRemainingMs` and `blackRemainingMs` where available.
- Syncs game identity reset with `gameHistoryTracker.reset()`.

- [ ] **Step 1: Update `GameSnapshot` interface in `src/sites/types.ts`**
  Add optional `whiteRemainingMs` and `blackRemainingMs`.

- [ ] **Step 2: Update site adapters to provide player clocks**
  In `chesscom.ts` / `chesscom-state.ts`: extract white and black clock milliseconds.
  In `lichess.ts`: query `round.clock.millisOf('white')` and `millisOf('black')`.

- [ ] **Step 3: Wire `gameHistoryTracker` in `src/controller.ts` and `src/ui.ts`**
  In `controller.tick()`: call `gameHistoryTracker.updateFromSnapshot(snapshot)`.
  In `controller.stop()` and identity change: call `gameHistoryTracker.reset()`.

- [ ] **Step 4: Run tests to ensure no regressions**
  Run: `bun test`
  Expected: All tests PASS.

- [ ] **Step 5: Commit**
  Run: `git add src/sites/ src/controller.ts src/ui.ts && git commit -m "feat(controller): integrate game history tracking with site clock observations"`

---

### Task 4: Activity Scoresheet UI & PGN Clipboard Copy (`src/panel.tsx`, `src/panel.css`)

**Files:**
- Modify: `src/panel.tsx`
- Modify: `src/panel.css`
- Test: `tests/panel.test.tsx` (or update existing panel tests)

**Interfaces:**
- Consumes `gameHistoryTracker.getMovePairs()` and `gameHistoryTracker.exportPgn()`.
- Renders paired scoresheet with move numbers, SANs, and timing badges.
- `copyLogs`: copies generated PGN when moves exist (falls back to system logs if no moves).

- [ ] **Step 1: Update `copyLogs` and Activity UI in `src/panel.tsx`**
  Show paired move rows with timing badges `(1.2s)`. Show system events as distinct notices.
  Update copy button to export PGN and show clipboard confirmation.

- [ ] **Step 2: Add styles in `src/panel.css`**
  Style `.panel-move-row`, `.panel-move-num`, `.panel-move-cell`, `.panel-move-san`, `.panel-move-time` matching the dark glass theme.

- [ ] **Step 3: Run tests and typecheck**
  Run: `bun test && bun run typecheck`
  Expected: PASS.

- [ ] **Step 4: Commit**
  Run: `git add src/panel.tsx src/panel.css tests/ && git commit -m "feat(ui): display Lichess-style move scoresheet with timing and PGN copy"`

---

### Task 5: Monorepo Quality Pass & Documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update documentation**
  Document the standard PGN export, move timing telemetry, and scoresheet display in `README.md` and `AGENTS.md`.

- [ ] **Step 2: Run full verification suite**
  Run: `bun run check` (Biome, strict TS, Knip, Vitest, Vite builds).

- [ ] **Step 3: Final commit and push**
  Commit all changes and push to `origin/main`.
