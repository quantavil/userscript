# FEN-Keyed Ponder Cache & 0ms Premove Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an instant 0 ms premove engine combining own-turn recapture-chain steering and an opponent-turn Multi-Branch Ponder Table, keyed by normalized 4-field FEN, with full `chessops` legality verification and a UI settings toggle.

**Architecture:** An `ArmedPremoveMap` stores `Map<ExpectedFenKey, ReplyUci>`. On our turn, recapture chains (`dest(pv0) === dest(pv1) === dest(pv2)`) are simulated and armed. On the opponent's turn, a `MultiPV 4` search populates replies for all viable opponent branches (within 150cp of PV1). When the site adapter confirms the opponent's move, `scheduleAnalysis('main', fen)` looks up `fenKey(snapshot.fen)`. On match, the pre-validated reply dispatches instantly with 0 ms delay.

**Tech Stack:** TypeScript, Bun, Preact, Stockfish 19 WASM, `chessops`, Vitest, Biome, Vite.

**Spec:** FEN-keyed lookup (`Map<string, string>`), 0 ms post-observation dispatch, automatic fallback on deviation.

---

## Global Constraints

- Monorepo package manager and runtime: Bun (`bun run test`, `bun run check`).
- License: GPL-3.0-or-later.
- Premove timing: Strictly **0 ms delay** (immediate execution upon opponent move confirmation).
- FEN key normalization: Always compare using `fenKey(fen)` (`fen.split(' ').slice(0, 4).join(' ')`), stripping halfmove/fullmove clock fields.
- Legality guarantee: Every move transition (`trigger` and `reply`) is simulated and validated via `chessops` when arming.
- Single source of truth for settings: `SETTING_SPECS` in `src/settings/schema.ts`.
- Fallback guarantee: Any unexpected opponent move (not in `byExpectedFen`) clears the map and proceeds cleanly to standard engine search.
- Dual production outputs: Both `dist/bundle.user.js` and `dist/chesscom.user.js` must build cleanly.

## Review Focus

1. **Post-Trigger FEN Matching:** On `scheduleAnalysis('main', fen)`, `snapshot.fen` is already our turn. Matching `fenKey(snapshot.fen)` against `byExpectedFen` must match the FEN *after* the opponent's trigger move.
2. **Own-Turn Simulation:** Arming on our turn starts from `snapshot.fen` (our turn), applies `pv[0]`, then `pv[1]`, and records `fenKey` after `pv[1]` with `reply = pv[2]`.
3. **Multi-Branch Pondering:** When opponent has 4 legal moves within 150cp, all 4 valid `(expectedFen -> reply)` pairs are armed in `byExpectedFen`.
4. **Fewer Than 4 Legal Moves:** In check evasions or endgames with $< 4$ legal moves, `uci-client` reads depth snapshots based on `Math.min(requestedMultiPv, legalMovesCount)` so forced evasions are never dropped.
5. **Setting Toggle:** Toggling `premove` off in settings immediately clears `armedPremove` and prevents premove dispatch.

---

### Task 1: Core FEN-Keyed Premove Module (`src/engine/premove.ts`)

**Files:**
- Create: `src/engine/premove.ts`
- Test: `tests/unit/engine/premove.test.ts`

**Interfaces:**
```ts
export interface ArmedPremoveMap {
  /** Maps normalized 4-field post-trigger FEN -> validated UCI reply */
  byExpectedFen: Map<string, string>;
}

export function fenKey(fen: string): string;
export function dest(uci: string): string;
export function orig(uci: string): string;
export function isRecaptureChain(pv: string[]): boolean;

export function resolveArmedTriggerFen(
  startFen: string,
  movesBeforeTrigger: string[],
  triggerUci: string,
  replyUci: string,
  variant?: string,
): string | null;

export function selectOwnTurnChainPremove(
  startFen: string,
  lines: MultiPvLine[],
  variant?: string,
): { bestMoveUci: string; armed?: ArmedPremoveMap };

export function selectOpponentTurnPremove(
  opponentTurnFen: string,
  lines: MultiPvLine[],
  variant?: string,
): ArmedPremoveMap | null;
```

- [x] **Step 1: Write unit tests for FEN keying, chain arming, and multi-branch ponder table**

In `tests/unit/engine/premove.test.ts`, test:
- `fenKey`: strips 4th, 5th, and 6th fields (en-passant, halfmove clock, and fullmove counter) to use canonical 3-field pieces/turn/castling key.
- `resolveArmedTriggerFen`: applies move sequence on `startFen` using `chessops`. Returns normalized 3-field FEN after trigger if all moves are legal; returns `null` if any move is illegal.
- `selectOwnTurnChainPremove`:
  - When PV1 is a recapture chain (`dest(pv0) === dest(pv1) === dest(pv2)`), arms `fenKey(after pv1)` $\to$ `pv2`.
  - When PV1 is not a chain but PV2 is a chain within 50cp, steers best move to `pv2[0]` and arms `fenKey(after pv2[1])` $\to$ `pv2[2]`.
  - Pre-populates all legal opponent captures to lowest-value recaptures in $\le 0.2$ ms.
- `selectOpponentTurnPremove`:
  - Arms all branches without arbitrary score cap that have valid legal replies.
  - Returns `ArmedPremoveMap` with multiple FEN entries for multi-branch coverage.

- [x] **Step 2: Run test to verify failure**

Run: `bun run test tests/unit/engine/premove.test.ts`
Expected: FAIL (module not found).

- [x] **Step 3: Implement `src/engine/premove.ts`**

Implement:
- `fenKey(fen: string): string`: `fen.trim().split(/\s+/).slice(0, 3).join(' ')`.
- `dest(uci)` and `orig(uci)`.
- `isRecaptureChain(pv)`: `pv.length >= 3 && dest(pv[0]) === dest(pv[1]) && dest(pv[2]) === dest(pv[1])`.
- `populateRecaptureFallbacks`: 0.2ms bitboard scan of all legal opponent captures after our move to arm lowest-value recaptures.
- `resolveArmedTriggerFen`:
  - Load `Chess` position from `startFen`.
  - Play each move in `movesBeforeTrigger`.
  - Play `triggerUci`.
  - Verify `replyUci` is legal in resulting position.
  - Return `fenKey(makeFen(pos.toSetup()))`.
- `selectOwnTurnChainPremove`:
  - Pre-populates recapture fallbacks for unexpected captures.
  - Inspect PV1 and PV2 with `evaluationToCentipawns`.
  - If PV2 is chain within 50cp, steers to PV2; otherwise keeps PV1.
  - Arms `pv[2]` whenever `pv.length >= 3`.
- `selectOpponentTurnPremove`:
  - For each viable line, call `resolveArmedTriggerFen(opponentTurnFen, [], pvi.pv[0], pvi.pv[1])`.
  - Populate `byExpectedFen.set(key, pvi.pv[1])`.
  - Return map if `byExpectedFen.size > 0`.

- [x] **Step 4: Run tests to verify pass**

Run: `bun run test tests/unit/engine/premove.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/premove.ts tests/unit/engine/premove.test.ts
git commit -m "feat(engine): implement FEN-keyed ponder cache and own-turn trade steering"
```

---

### Task 2: MultiPV Snapshot Management & Legal Move Bounds (`src/engine/uci-client.ts`)

**Files:**
- Modify: `src/engine/uci-client.ts`
- Modify: `src/engine/worker-client.ts`
- Modify: `src/engine/service.ts`
- Test: `tests/integration/engine/stockfish.test.ts`

**Interfaces:**
- Support `multiPv` option up to 6.
- Track MultiPV depth snapshots and progressive depth callbacks (`onDepthComplete`).
- Read lines from highest depth matching `Math.min(requestedMultiPv, legalMovesCount)` to support forced evasions and endgames with $< 4$ legal moves.

- [x] **Step 1: Write integration test for MultiPV line extraction on low-move positions**

In `tests/integration/engine/stockfish.test.ts`, test that positions with fewer than 4 legal moves return all available lines without waiting for nonexistent lines 3 and 4.

- [x] **Step 2: Run test to verify behavior**

Run: `bun run test tests/integration/engine/stockfish.test.ts`

- [x] **Step 3: Implement snapshot tracking and legal move bounding**

- In `parseInfo()`: record lines by depth in `job.multiPvSnapshots: Map<number, Map<number, MultiPvLine>>`.
- When reading final lines: determine expected lines = `Math.min(job.multiPv, legalMoves)`. Read from highest depth where `snapshot.size >= expectedLines`.
- Fire `onDepthComplete(depth, lines)` as each depth finishes.

- [x] **Step 4: Run tests to verify pass**

Run: `bun run test tests/integration/engine/stockfish.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/uci-client.ts src/engine/worker-client.ts src/engine/service.ts tests/integration/engine/stockfish.test.ts
git commit -m "feat(engine): support MultiPV 6 with legal move bounds and progressive depth snapshots"
```

---

### Task 3: Settings Schema & UI Toggle (`src/settings/schema.ts`, `src/ui/panel.tsx`)

**Files:**
- Modify: `src/settings/schema.ts`
- Modify: `src/chess/types.ts`
- Modify: `src/app/state.ts`
- Modify: `src/ui/panel.tsx`
- Test: `tests/unit/settings/settings.test.ts`
- Test: `tests/unit/ui/panel-format.test.ts`

**Interfaces:**
- Preference key: `premove: boolean` (default `true`) in `SETTING_SPECS`.
- UI Toggle: `<Toggle label="Premove" checked={settings.premove} onChange={(next) => updateSetting('premove', next)} />`.

- [x] **Step 1: Write unit tests for premove setting**

In `tests/unit/ui/panel-format.test.ts`, verify `updatePanelSetting('premove', false)` updates `BotState.premove` and persists.

- [x] **Step 2: Run test to verify failure**

Run: `bun run test tests/unit/ui/panel-format.test.ts`
Expected: FAIL (`premove` unknown).

- [x] **Step 3: Implement `premove` setting across schema, types, state, and UI**

- In `src/settings/schema.ts`: add `premove: booleanSetting(true)` to `SETTING_SPECS`.
- In `src/chess/types.ts`: add `premove: boolean` to `BotState` and `PreferenceKey`.
- In `src/app/state.ts`: add `premove: true` to initial state.
- In `src/ui/panel.tsx`: add `<Toggle label="Premove" checked={settings.premove} ... />` inside `.panel-toggles`.

- [x] **Step 4: Run tests to verify pass**

Run: `bun run test tests/unit/settings/settings.test.ts tests/unit/ui/panel-format.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/settings/schema.ts src/chess/types.ts src/app/state.ts src/ui/panel.tsx tests/unit/settings/settings.test.ts tests/unit/ui/panel-format.test.ts
git commit -m "feat(settings): add premove preference toggle to schema and UI"
```

---

### Task 4: Scheduler Zero-Delay Execution & FEN-Keyed Ponder Cache (`src/app/scheduler.ts`)

**Files:**
- Modify: `src/app/scheduler.ts`
- Test: `tests/integration/app/scheduler.test.ts`
- Test: `tests/integration/app/scheduler-deadline.test.ts`

**Interfaces:**
- Module state: `let armedPremove: ArmedPremoveMap | null = null;`
- In `scheduleAnalysis('main', fen)`:
  - If `BotState.premove && armedPremove`:
    - Lookup `replyUci = armedPremove.byExpectedFen.get(fenKey(snapshot.fen))`.
    - Clear `armedPremove = null;`
    - If `replyUci` exists and is legal:
      - Submit move instantly with 0 ms delay!
      - Log: `ui.log(formatMove(snapshot.fen, replyUci, snapshot.variant) + ' · premove', 'move')`.
      - Return early.
- On our turn search complete:
  - Request `multiPv: BotState.premove ? Math.max(2, BotState.multiPvLines?.length ?? 1) : 1` if premove enabled.
  - Call `selectOwnTurnChainPremove(fen, best.multiPv, snapshot.variant)`.
  - If armed, set `armedPremove = result.armed`.
- On opponent turn (`kind !== 'main'` / ponder):
  - Request `multiPv: 6`, depth 8.
  - Wire progressive `onDepth` callback to arm candidates starting at $D \ge 3$.
  - On search complete: call `selectOpponentTurnPremove(fen, result.multiPv, snapshot.variant)`.
  - Set `armedPremove = result`.

- [x] **Step 1: Write integration tests for FEN-keyed instant dispatch**

In `tests/integration/app/scheduler.test.ts`, verify:
1. When incoming `snapshot.fen` matches an entry in `armedPremove.byExpectedFen`, it dispatches immediately without running search.
2. When the opponent plays a move not in the map, `armedPremove` is cleared and normal search runs.
3. Activity log shows `· premove`.

- [x] **Step 2: Run test to verify failure**

Run: `bun run test tests/integration/app/scheduler.test.ts`

- [x] **Step 3: Implement scheduler FEN-keyed lookup and MultiPV request tuning**

- Import `fenKey`, `isLegalMove`, `selectOwnTurnChainPremove`, `selectOpponentTurnPremove` from `src/engine/premove.js`.
- Integrate 0 ms dispatch check at top of `scheduleAnalysis('main')`.
- Configure `multiPv: 2` on our turn and `multiPv: 6` on opponent turn when `BotState.premove` is enabled.
- Arm `armedPremove` at the end of own-turn and opponent-turn searches, and incrementally via `onDepth`.

- [x] **Step 4: Run tests to verify pass**

Run: `bun run test tests/integration/app/scheduler.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/scheduler.ts tests/integration/app/scheduler.test.ts tests/integration/app/scheduler-deadline.test.ts
git commit -m "feat(scheduler): dispatch FEN-keyed premoves at 0ms and arm multi-branch ponder table"
```

---

### Task 5: Full Verification & Dual Production Builds

**Files:**
- Output bundles: `dist/bundle.user.js`, `dist/chesscom.user.js`

- [x] **Step 1: Run full verification suite**

Run: `bun run check`
Expected:
- Biome check: 0 errors
- TypeScript strict check: 0 errors
- Knip unused export check: 0 issues
- Vitest suite: 100% passed (34 files, 425 passed tests)
- Vite build: both userscript bundles built cleanly

- [x] **Step 2: Commit**

```bash
git add dist/ docs/superpowers/plans/2026-10-14-hybrid-premove-engine.md
git commit -m "chore(build): build dual userscript bundles with 0ms premove support"
```
