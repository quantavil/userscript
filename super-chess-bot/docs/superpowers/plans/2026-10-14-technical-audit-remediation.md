# Technical Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all verified bugs, algorithmic flaws, performance bottlenecks, UI/UX defects, and DRY redundancies identified in the technical audit while preserving full backward compatibility and passing all verification checks.

**Architecture:** Implement fixes layer by layer: engine and tablebase algorithmic correctness first, followed by ponder lifecycle and passive observation decoupling, adapter caching and performance, scheduler state consistency, UI/UX accessibility enhancements, and stealth fingerprint cleanup.

**Tech Stack:** TypeScript, Bun, Preact, `@preact/signals`, Vitest, Biome, Vite (`vite-plugin-monkey`), `chessops`, Stockfish 19 WASM.

**Spec:** Technical audit findings verified against `super-chess-bot` repository standards and `AGENTS.md`.

## Global Constraints

- Monorepo package manager and runtime: Bun (`bun run test`, `bun run check`).
- Output bundles: both `dist/bundle.user.js` and `dist/chesscom.user.js` must build cleanly.
- Single source of truth for settings: `SETTING_SPECS` in `src/settings/schema.ts`.
- Pure test boundaries: no browser DOM required in unit tests; keep render helpers and formatting functions pure.
- License: GPL-3.0-or-later.

## Review Focus

1. Post-game report generation triggers reliably when the bot was completely disabled during the game.
2. Syzygy tablebase moves prioritize zeroing winning moves over non-zeroing waiting moves.
3. Elo throttling updates PV, evaluation score, and primary board arrow to match the candidate actually played.
4. Deep endgame mate scores (|mate| > 100) maintain correct positive/negative sign.
5. Chess.com SAN replay does not re-parse the full game on every clock tick or mutation.

---

### Task 1: Engine & Tablebase Core Fixes (Algorithmic & Math)

**Files:**
- Modify: `src/engine/throttle.ts:25-36, 40-120`
- Modify: `src/engine/tablebase.ts:220-265`
- Modify: `src/shared/chess.ts`
- Test: `tests/unit/engine/throttle.test.ts`
- Test: `tests/unit/engine/tablebase.test.ts`

**Interfaces:**
- `evaluationToCentipawns(evaluation: Evaluation, mateCap?: number): number`: converts an `Evaluation` (`cp` or `mate`) to clamped centipawns without sign inversion.
- `pickBestTablebaseMove(moves: TablebaseMove[]): TablebaseMove | null`: returns optimal tablebase move preserving API zeroing priority.

- [ ] **Step 1: Write failing tests for deep mate clamping and tablebase move selection**

Add test cases in `tests/unit/engine/throttle.test.ts` for deep mate scores (`mate: 105` must remain heavily positive, e.g. $> 9000$, and `mate: -105` must remain heavily negative, $< -9000$).
Add test case in `tests/unit/engine/tablebase.test.ts` verifying that a winning zeroing move is preferred over a waiting move with smaller `|dtz|`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test tests/unit/engine/throttle.test.ts tests/unit/engine/tablebase.test.ts`
Expected: FAIL on mate clamping and tablebase sort order.

- [ ] **Step 3: Implement math fixes and tablebase ordering**

In `src/shared/chess.ts`, implement `evaluationToCentipawns(evaluation: Evaluation, mateCap = 10_000): number` with proper mate distance damping:
```ts
if (typeof evaluation.mate === 'number') {
  const penalty = Math.min(1000, Math.abs(evaluation.mate) * 10);
  return evaluation.mate > 0 ? mateCap - penalty : -mateCap + penalty;
}
return evaluation.cp ?? 0;
```
In `src/engine/throttle.ts`, use `evaluationToCentipawns` and eliminate redundant `line.pv.split` fallbacks.
In `src/engine/tablebase.ts`, trust `data.moves[0]` from Lichess Tablebase API (which already sorts best-first), and in `pickBestTablebaseMove` ensure `zeroing: true` winning moves are not demoted by `Math.abs(dtz)` comparisons.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test tests/unit/engine/throttle.test.ts tests/unit/engine/tablebase.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/throttle.ts src/engine/tablebase.ts src/shared/chess.ts tests/unit/engine/throttle.test.ts tests/unit/engine/tablebase.test.ts
git commit -m "fix(engine): clamp deep mate math and preserve Syzygy tablebase move order"
```

---

### Task 2: Pondering Lifecycle & FEN Equality

**Files:**
- Modify: `src/engine/uci-client.ts:320-330, 525-535`
- Modify: `src/engine/worker-client.ts:115-140`
- Test: `tests/integration/engine/stockfish.test.ts`

**Interfaces:**
- `cancelPonder(preserveFen?: string): void`: normalizes `preserveFen` and `job.fen` with `canonicalFen` before aborting.
- `drain()`: does not immediately set `this.ponderJob = null` upon receiving `bestmove` if the search completed successfully, allowing late promotion.

- [ ] **Step 1: Write failing test for ponder retention after completion**

In `tests/integration/engine/stockfish.test.ts`, add a test where a ponder search emits `bestmove` before promotion, and then `analyzeReady()` is called with the matching position: it should promote/resolve from the completed ponder job rather than launching a redundant search.

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test tests/integration/engine/stockfish.test.ts`
Expected: FAIL because completed `ponderJob` is wiped on search completion.

- [ ] **Step 3: Implement ponder retention and canonical FEN comparison**

In `src/engine/uci-client.ts`:
1. In `cancelPonder(preserveFen)`: compare `job.fen` and `preserveFen` using `canonicalFen(job.fen) === canonicalFen(preserveFen)` so differences in legal en-passant square emission between sites do not falsely abort pondering.
2. In `drain()`: keep `this.ponderJob` populated with the completed result until a new position arrives or it is explicitly canceled/promoted.
In `src/engine/worker-client.ts`: remove duplicate `ponderFen` state tracking and rely on `UciClient`.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test tests/integration/engine/stockfish.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/uci-client.ts src/engine/worker-client.ts tests/integration/engine/stockfish.test.ts
git commit -m "fix(engine): retain completed ponder search results and canonicalize ponder FEN comparison"
```

---

### Task 3: Game Observation Decoupling & Clock Timing

**Files:**
- Modify: `src/app/controller.ts:275-305`
- Modify: `src/sites/chesscom/snapshot.ts:124-141`
- Modify: `src/sites/chesscom/adapter.ts:175-198`
- Modify: `src/sites/lichess/adapter.ts:250-275`
- Modify: `src/game/history.ts:95-115`
- Modify: `src/ui/panel.tsx:595-615, 855-865`
- Test: `tests/integration/app/controller.test.ts`
- Test: `tests/unit/game/game-history.test.ts`
- Test: `tests/unit/sites/chesscom-snapshot.test.ts`

**Interfaces:**
- `controller.tick()`: passive game tracking runs regardless of `BotState.hackEnabled`.
- `parseClockText(text)`: parses `H:MM:SS` in addition to `MM:SS` and seconds.
- `exportPgn(siteName, result)`: receives game result from controller/snapshot.

- [ ] **Step 1: Write failing tests for disabled-bot observation and H:MM:SS clocks**

Add test in `controller.test.ts`: when `BotState.hackEnabled === false`, moves are still recorded into `gameHistoryTracker` and report is available upon game finish.
Add test in `chesscom-snapshot.test.ts`: `parseClockText("1:05:23")` returns `3923000`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test tests/integration/app/controller.test.ts tests/unit/sites/chesscom-snapshot.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement observation decoupling, clock parsing, and result propagation**

1. In `src/app/controller.ts`: split `tick()` into observation phase (updating `gameHistoryTracker`, syncing board, handling finished game phase, and updating UI display) and automation phase (guarded by `this.isActive && this.ready && BotState.hackEnabled`).
2. In `src/sites/chesscom/snapshot.ts`: update `parseClockText` regex to `/^(?:(\d+):)?(\d+):(\d{2}(?:\.\d+)?)$/` to parse optional hours.
3. In `src/sites/chesscom/adapter.ts` and `src/sites/lichess/adapter.ts`: extract and pass `incrementMs` (or default to 0 on non-increment clocks) to `GameSnapshot`.
4. In `src/game/history.ts`: allow clock-delta computation when `prevClock >= currClock` even if increment is 0.
5. In `src/ui/panel.tsx`: pass observed game result to `exportPgn`, and label copy button dynamically ("Copy PGN" vs "Copy logs").

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test tests/integration/app/controller.test.ts tests/unit/sites/chesscom-snapshot.test.ts tests/unit/game/game-history.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/controller.ts src/sites/chesscom/snapshot.ts src/sites/chesscom/adapter.ts src/sites/lichess/adapter.ts src/game/history.ts src/ui/panel.tsx tests/integration/app/controller.test.ts tests/unit/sites/chesscom-snapshot.test.ts tests/unit/game/game-history.test.ts
git commit -m "fix(app): decouple passive game observation from bot automation and fix clock parsing"
```

---

### Task 4: Scheduler State Consistency & Multi-PV / Elo Throttling

**Files:**
- Modify: `src/app/scheduler.ts:215-260, 295-360, 430-460`
- Modify: `src/ui/components/eval-trend-graph.tsx:45-55`
- Test: `tests/integration/app/scheduler.test.ts` or `tests/unit/engine/throttle.test.ts`

**Interfaces:**
- `selectThrottledMove`: when choosing candidate #2 or #3, update `best.uci`, `best.pv`, and `best.score` consistently.
- `clearRecommendation()`: shared helper clearing all 4 recommendation fields including `multiPvLines = []`.

- [ ] **Step 1: Write failing tests for throttled PV replacement and Multi-PV cleanup**

Add test verifying that when Elo throttling chooses a secondary candidate:
1. `best.pv` matches the secondary candidate's PV.
2. `anticipatedPonder` correctly uses the secondary candidate's reply move.
3. Failure in search or move dispatch clears `multiPvLines`.

- [ ] **Step 2: Run tests to verify failure**

Run: `bun run test`
Expected: FAIL on throttling PV alignment and multiPvLines cleanup.

- [ ] **Step 3: Implement scheduler consistency fixes**

1. In `src/app/scheduler.ts`:
   - When `throttled.uci !== best.uci`, update `best.uci = throttled.uci`, `best.pv = throttled.pv`, `best.score = throttled.evaluation`.
   - Update `best.multiPv` so the played line is at index 0 for arrow drawing, or highlight the throttled move arrow.
   - On search or move failure, call shared `clearRecommendation()` (resetting `BotState.multiPvLines = []`).
   - Remove redundant nested ternaries calling `getAnalysis`.
   - Deduplicate `BotState.evalHistory` so multiple calls on the same ply don't append duplicates.
2. In `src/ui/components/eval-trend-graph.tsx`: display `{history.length} turns` or index accurately.
3. In `src/app/state.ts`: remove unused exported snapshot helpers (`getFen`, `getPlayerColor`, etc.).

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/scheduler.ts src/ui/components/eval-trend-graph.tsx src/app/state.ts
git commit -m "fix(scheduler): align throttled PV and arrows, clear stale multi-pv lines on error"
```

---

### Task 5: Adapter Performance & Caching

**Files:**
- Modify: `src/sites/chesscom/adapter.ts:95-110`
- Modify: `src/sites/lichess/adapter.ts:145-170`
- Modify: `src/chess/position.ts:110-130`
- Modify: `src/sites/common.ts` (or shared DOM utils)
- Test: `tests/integration/sites/chesscom-history.test.ts`
- Test: `tests/unit/chess/position.test.ts`

**Interfaces:**
- `readChesscomHistory`: memoized by `(startingFen, sans.length, sans[sans.length - 1])`.
- `replaySanLine`: avoids redundant `canonicalFen` parsing on already validated positions.
- `createHistoryReader`: checks cache by step reference, ply, and length without unconditional `JSON.stringify`.

- [ ] **Step 1: Write test for SAN replay performance and correctness**

Verify that `readChesscomHistory` returns cached result when history SANs length and final move have not changed.

- [ ] **Step 2: Run test to verify behavior**

Run: `bun run test tests/integration/sites/chesscom-history.test.ts`

- [ ] **Step 3: Implement caching and eliminate double FEN serialization**

1. In `src/chess/position.ts#replaySanLine`: remove the duplicate `if (!canonicalFen(fen, variant))` check on line 125 (`position.toSetup()` is already canonical).
2. In `src/sites/chesscom/adapter.ts`: add a shallow cache for `readChesscomHistory` keyed on `startingFen`, `sans.length`, and the latest SAN string.
3. In `src/sites/lichess/adapter.ts#createHistoryReader`: replace eager `JSON.stringify` with property checks (`selectedStep.ply`, `selectedStep.fen`, `steps.length`).
4. Consolidate duplicate `isVisibleBoard` and `isObject` helpers into shared module.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sites/chesscom/adapter.ts src/sites/lichess/adapter.ts src/chess/position.ts
git commit -m "perf(sites): cache Chess.com history replay and optimize Lichess history reader"
```

---

### Task 6: UI / UX, Accessibility, and Canvas HiDPI

**Files:**
- Modify: `src/ui/panel.css:1070-1085`
- Modify: `src/ui/panel.tsx:250-315, 650-750, 890-910`
- Modify: `src/ui/mount.ts:70-95`
- Modify: `src/board/overlays.ts:40-50, 85-130`
- Test: `tests/unit/ui/panel-format.test.ts`
- Test: `tests/integration/ui/ui.test.ts`

**Interfaces:**
- Board canvas: scales drawing buffer by `window.devicePixelRatio` and redraws active arrows on resize.
- Coordinate math: computes canvas-relative `(x, y)` directly without double `getBoundingClientRect()`.
- Settings UI: renders `<Toggle>` for `gameReport` and keeps quick enable button accessible.

- [ ] **Step 1: Write tests for UI formatting and settings toggle**

Add tests for SAN formatting of PV lines and verifying `gameReport` setting update in UI actions.

- [ ] **Step 2: Run test to verify failure**

Run: `bun run test tests/unit/ui/panel-format.test.ts`

- [ ] **Step 3: Implement UI and Canvas improvements**

1. In `src/ui/panel.css`: replace undefined `background: var(--surface);` with `background: var(--wood);`.
2. In `src/board/overlays.ts`:
   - Scale canvas width/height by `window.devicePixelRatio`, apply `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, and store current arrows so `ResizeObserver` redraws them immediately.
   - Eliminate redundant `getSquareCenterClientXY` layout reads; calculate canvas-relative coordinates directly in `getSquareCenterCanvasXY`.
3. In `src/ui/panel.tsx`:
   - Add `<Toggle label="Auto game report" checked={settings.gameReport} onChange={(next) => updateSetting('gameReport', next)} />`.
   - Keep `<QuickEnableButton />` accessible in the header bar and remove duplicate inner toggle.
   - Fix log filtering so `'move'` / status entries are visible.
   - Add a "Back to controls" button in `<PanelGuide />` and maintain valid `aria-controls`.
   - Consolidate switch track/knob markup into a reusable `<SwitchKnob />`.
4. In `src/ui/mount.ts`: convert PV strings to SAN sequences for display.

- [ ] **Step 4: Run tests to verify pass**

Run: `bun run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/panel.css src/ui/panel.tsx src/ui/mount.ts src/board/overlays.ts tests/unit/ui/panel-format.test.ts
git commit -m "fix(ui): HiDPI canvas scaling, gameReport toggle, SAN PV display, and CSS surface token"
```

---

### Task 7: Stealth Cleanup & Full Repository Verification

**Files:**
- Modify: `src/main.ts:10-15`
- Modify: `src/userscript/menu.ts:20-28`
- Modify: `src/ui/status.ts`
- Test: Full verification check

**Interfaces:**
- No global `window.__SCB_*` pollution in page scope.
- `bun run check` passes completely.

- [ ] **Step 1: Remove global `window` bot signatures**

In `src/main.ts` and `src/userscript/menu.ts`, replace `window.__SCB_ACTIVE__` and `window.__SCB_TOGGLE_GHOST__` with module-scoped state or GM menu registrations to avoid exposing detectable properties to host page scripts.
In `src/ui/status.ts`, use structured tone definitions.

- [ ] **Step 2: Run full verification suite**

Run: `bun run check`
Expected: Biome check, TypeScript typecheck, Knip dependency check, Vitest suite, and both Vite userscript builds (`bundle.user.js` and `chesscom.user.js`) must pass with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts src/userscript/menu.ts src/ui/status.ts
git commit -m "refactor(stealth): remove page-level window signatures and verify full build"
```
