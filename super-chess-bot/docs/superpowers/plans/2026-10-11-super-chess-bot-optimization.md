# Super Chess Bot: Performance, Input Reliability & UI/UX Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden board input and move confirmation, fix sub-20s decimal clock parsing, eliminate synthetic bot detection tells, fix broken board overlays, add bullet hotkeys, replace Zod with Valibot (~1.5 kB), and prune unused Tailwind CSS bloat.

**Architecture:** Maintain the modular userscript architecture (`src/engine/`, `src/board.ts`, `src/controller.ts`, `src/panel.tsx`). Ponder logic in `src/engine/uci-client.ts` is left completely untouched. Harden DOM event dispatch and move verification, refine canvas arrow math, and use Valibot for clean lightweight schema validation.

**Tech Stack:** TypeScript, Preact + Signals, chessops, Valibot, Vitest, Vite, `vite-plugin-monkey`, Bun.

**Spec:** [super-chess-bot-audit-report.md](file:///home/quantavil/.gemini/antigravity-cli/brain/efafab54-8621-4d36-b2c0-9c6e82084a3d/super-chess-bot-audit-report.md)

## Global Constraints

- **Engine Isolation**: Stockfish WASM single-thread remains an isolated Web Worker; no main-thread fallback.
- **Ponder Untouched**: Ponder code in `src/engine/uci-client.ts` remains completely untouched as requested by user.
- **Licensing**: Retain GPL-3.0-or-later headers and package metadata.
- **Strict Verification**: `bun run check` (Biome, strict TypeScript, Knip, Vitest, and production build) must pass without warnings or errors.
- **Rule Integrity**: Retain `chessops` for legal move generation and FEN parsing; do not hand-roll chess rules.
- **No Overengineering**: All speculative premoves, multi-threaded SharedArrayBuffer, WebSockets, tablebases, and multi-engine modules are strictly rejected.

## Review Focus

1. **Sub-Minute Clock Parsing**: Under 20s, Chess.com formats time as decimal seconds (`14.8` or `9.2`). The clock parser must extract remaining milliseconds accurately rather than defaulting to `Infinity`.
2. **Right-Click Board Arrows**: Board right-clicks (`event.button === 2`) must not pause the bot or abort pending moves.
3. **Move Hint Detachment**: In `simulateClickMove`, destination element resolution must happen immediately prior to destination click, not before the origin square click.
4. **Inverted Evaluation Bar & Flip Math**: Evaluation bar must rise from bottom-up for White advantage and invert correctly when playing Black (`isBoardFlipped()`).
5. **Valibot Migration Parity**: All settings validation test cases in `tests/settings.test.ts` (clamping, defaults, legacy `premoveEnabled` migration) must pass identically with Valibot.

---

### Task 1: Sub-Minute Clock Parsing & Terminal Position Guard

**Files:**
- Modify: `src/engine/scheduler.ts:34-46, 85-96`
- Test: `tests/scheduler-deadline.test.ts`

**Interfaces:**
- Consumes: `searchBudget(): number`, `scheduleAnalysis()`
- Produces: Decimal-second clock parsing and terminal position handling.

- [x] **Step 1: Write failing test for decimal clock parsing and terminal position**
  In `tests/scheduler-deadline.test.ts`, add test for clock strings formatted as `14.8` and `9.2`, asserting that `searchBudget()` allocates a bounded time rather than defaulting to full `configured` budget.

- [x] **Step 2: Run test to verify it fails**
  Run: `bun run test tests/scheduler-deadline.test.ts`
  Expected: FAIL on decimal clock assertion.

- [x] **Step 3: Implement decimal clock regex and terminal position guard in `src/engine/scheduler.ts`**
  1. In `src/engine/scheduler.ts#L41`:
     Update regex from `/^\d+:\d{2}(?:\.\d+)?$/` to `/^(?:(\d+):)?(\d{1,2})(?:\.(\d+))?$/`. Extract minutes (if present) and seconds. If no colon is present, treat as seconds.
  2. In `src/engine/scheduler.ts#L88`:
     If `result.bestmove === '(none)'`, set `BotState.statusInfo = 'Terminal position'` without throwing a retryable error.

- [x] **Step 4: Run scheduler tests to verify they pass**
  Run: `bun run test tests/scheduler-deadline.test.ts`
  Expected: PASS.

- [x] **Step 5: Commit changes**
  ```bash
  git add src/engine/scheduler.ts tests/scheduler-deadline.test.ts
  git commit -m "fix(scheduler): support sub-minute decimal clocks and guard terminal positions"
  ```

---

### Task 2: Harden Board Input, Move Confirmation, and Event Telemetry

**Files:**
- Modify: `src/board.ts:158-167, 330-405, 470-485`
- Test: `tests/board-input.test.ts`
- Test: `tests/adapter.test.ts`

**Interfaces:**
- Consumes: `simulateClickMove`, `cancelPendingOnUserAction`, `waitForFenChange`
- Produces: Safe dynamic destination element query, right-click pass-through, companion mouse events, and realistic screen coordinates.

- [x] **Step 1: Write failing test for right-click arrow drawing and dynamic `endEl` query**
  In `tests/board-input.test.ts`, add tests:
  - Right-click (`button === 2`) does not trigger `cancelPendingMove` or board input listeners.
  - `simulateClickMove` resolves the destination target after clicking the origin.

- [x] **Step 2: Run test to verify it fails**
  Run: `bun run test tests/board-input.test.ts`
  Expected: FAIL on right-click assertion.

- [x] **Step 3: Implement input hardening in `src/board.ts`**
  1. In `cancelPendingOnUserAction` (`#L158-L164`):
     Add `if (event instanceof MouseEvent && event.button !== 0) return;`.
  2. In `createPointerOpts` (`#L354-L366`):
     Add `screenX: x + (window.screenX || 0)`, `screenY: y + (window.screenY || 0)`.
  3. In `dispatchPointerOrMouse` (`#L330-L341`):
     When `usePointer` is true, dispatch `PointerEvent` AND dispatch the companion `MouseEvent` (`mousedown`/`mouseup`) to replicate native browser event sequences.
  4. In `simulateClickMove` (`#L388-L402`):
     Move `const endEl = getTargetAt(b.x, b.y)` to immediately before `pressAt(endEl, b.x, b.y, usePointer)` (mirroring `simulateDragMove`).
  5. In `waitForFenChange` (`#L470-L485`):
     If `fen !== prevFen` and `fen !== expectedFen`, check `game.getHistoryFENs?.()`. If `expectedFen` is present in history, mark as confirmed.

- [x] **Step 4: Run board input tests to verify they pass**
  Run: `bun run test tests/board-input.test.ts tests/adapter.test.ts`
  Expected: PASS.

- [x] **Step 5: Commit changes**
  ```bash
  git add src/board.ts tests/board-input.test.ts tests/adapter.test.ts
  git commit -m "fix(board): harden click element targeting, right-click handling, and event telemetry"
  ```

---

### Task 3: Board Overlay & HUD Anti-Slop Polish (Arrows, Eval Bar & Hotkeys)

**Files:**
- Modify: `src/board.ts:132-146, 294-328, 607-655`
- Modify: `src/panel.tsx:173-192, 345-375`
- Modify: `src/panel.css`
- Test: `tests/ui.test.ts`

**Interfaces:**
- Consumes: `drawArrow(uciFrom, uciTo, color, thickness)`, `updateEvaluationBar(score, playingAs)`, `Panel`
- Produces: True chevron arrowheads, bottom-anchored flip-aware eval bar, and keyboard shortcuts (`Space`, `E`, `R`).

- [x] **Step 1: Write failing tests for arrow drawing and keyboard shortcuts**
  In `tests/ui.test.ts`, add tests asserting keydown handlers for `Space` (step move), `KeyE` (toggle enabled), and `KeyR` (resume).

- [x] **Step 2: Run test to verify it fails**
  Run: `bun run test tests/ui.test.ts`
  Expected: FAIL on missing hotkeys.

- [x] **Step 3: Implement arrow chevron, flipped eval bar, and hotkeys**
  1. In `src/board.ts#L294-L328` (`drawArrow`):
     Calculate angle $\theta = \text{atan2}(b.y - a.y, b.x - a.x)$. Draw arrow shaft line to $b$ minus arrowhead setback. Draw solid arrowhead polygon ($b$, and two points at $\pm 30^\circ$).
  2. In `src/board.ts#L137-L142, L639-L643` (`updateEvaluationBar`):
     Check `isBoardFlipped()`. When playing White, anchor `whiteBar` at `bottom: 0`, expanding upwards as score increases. When playing Black, invert orientation. Add `border: 1px solid rgba(255, 255, 255, 0.15)` to `evalBarWrap`.
  3. In `src/panel.tsx#L173-L192`:
     Add keydown listeners (guarded against input/textarea elements):
     - `Space`: If auto-move is disabled, execute recommended best move immediately.
     - `KeyE`: Toggle `settings.enabled`.
     - `KeyR`: Trigger `actions.recover()`.
  4. In `src/panel.css`:
     Increase evaluation font size in `.panel-evaluation` from 11px to 14px bold for proper visual hierarchy.
     Remove `@import "tailwindcss";` to eliminate unused CSS property bloat.

- [x] **Step 4: Run UI tests to verify they pass**
  Run: `bun run test tests/ui.test.ts`
  Expected: PASS.

- [x] **Step 5: Commit changes**
  ```bash
  git add src/board.ts src/panel.tsx src/panel.css tests/ui.test.ts
  git commit -m "feat(ui): add chevron arrows, flipped eval bar, and tactical bullet hotkeys"
  ```

---

### Task 4: Replace Zod with Valibot & Prune Redundancies

**Files:**
- Modify: `src/settings.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `biome.json`
- Modify: `src/types/chess.d.ts`
- Delete: `src/config.ts` (inline `GAME_CACHE_TTL` into `src/state.ts`)
- Test: `tests/settings.test.ts`

**Interfaces:**
- Consumes: `loadSettings(serialized: string | null): SettingsData`
- Produces: Lightweight Valibot schema (~1.5 kB) replacing Zod Mini (~34 kB), eliminating unused dev-dependencies.

- [x] **Step 1: Install Valibot and remove Zod & Tailwind packages**
  Run: `bun add valibot && bun remove zod @tailwindcss/vite tailwindcss`

- [x] **Step 2: Implement Valibot settings schema in `src/settings.ts`**
  ```ts
  import * as v from 'valibot';
  // Define flagSchema, integerInRange, positionSchema, savedSettingsSchema using Valibot
  ```
  Validate saved JSON using `v.safeParse(savedSettingsSchema, saved)` with full backward compatibility and default fallbacks.

- [x] **Step 3: Clean up configuration, build setup, and dead types**
  1. Remove `@tailwindcss/vite` from `vite.config.ts` plugins.
  2. Remove `"tailwindDirectives": true` from `biome.json`.
  3. Delete `src/config.ts` and inline `export const GAME_CACHE_TTL = 100;` directly into `src/state.ts`.
  4. Remove unused `interface Move` from `src/types/chess.d.ts` and remove unused `playingAs` / `_depth` plumbing.

- [x] **Step 4: Run verification across the entire project**
  Run: `bun run check`
  Expected: `biome check` passes, `tsc` passes, `knip` passes, `vitest` passes all tests (including `tests/settings.test.ts`), and `vite build` succeeds with bundle size reduced from 218 kB to ~175 kB.

- [x] **Step 5: Commit changes**
  ```bash
  git add src/settings.ts package.json bun.lock vite.config.ts biome.json src/types/chess.d.ts src/state.ts tests/settings.test.ts
  git rm src/config.ts
  git commit -m "refactor(settings): replace zod with valibot and prune dead dependencies"
  ```

---

## Verification Plan

### Automated Tests
Run the complete CI suite:
```bash
bun run check
```
Verifies:
- Biome lint and formatting.
- Strict TypeScript compile without errors.
- Knip unused dependency analysis.
- Vitest suite (all 63+ tests).
- Vite production bundle build (`dist/bundle.user.js` footprint check).

### Manual Verification
- Open Chess.com computer match with Violentmonkey/Tampermonkey bundle installed.
- Verify:
  1. Bot initializes and reports `Ready`.
  2. Eval bar rises from bottom up when White leads, and inverts when playing Black.
  3. Arrow displays a clear directional chevron head pointing to target square.
  4. Right-click drawing arrows does not pause the bot.
  5. Pressing `Space` steps the bot, `E` toggles automation, `R` resumes after board move.
  6. Settings persist and reload seamlessly with Valibot.
