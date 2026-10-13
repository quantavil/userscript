# Remove Variant Support and Fairy-Stockfish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate Fairy-Stockfish, variant registry entries, and non-standard variant logic across `super-chess-bot`, making it a pure, lightweight standard chess (and Chess960) engine.

**Architecture:** Strip out `createFairyStockfishWorker` and the multi-engine dispatch in `EngineWorkerClient`. Keep only orthodox Stockfish (`stockfish.js` / `stockfish.wasm`). Fail closed on non-standard variant games on Chess.com and Lichess.

**Tech Stack:** TypeScript, Stockfish 19 Lite WASM, chessops, Preact, Vitest, Vite Monkey.

**Spec:** Direct user requirement: "i reject all of thing u done remove it completey also remove varient support completely".

## Global Constraints

- Pure standard chess and Chess960 only. No Fairy-Stockfish dependencies or external 48 MB WASM asset links.
- Userscript metadata for both `all` and `chesscom` targets must contain only `stockfish.js` and `stockfish.wasm`.
- Preserve GPL-3.0-or-later license headers and repo conventions.
- All 5 gates of `bun run check` (Biome, `tsc --noEmit`, Knip, Vitest, production builds) must pass.

## Review Focus

1. `bundle.user.js` and `chesscom.user.js` userscript headers must not contain `@resource fairy-stockfish`.
2. Lichess adapter must declare non-standard variant games (crazyhouse, antichess, atomic, etc.) ineligible.
3. Chess.com adapter must remain focused on standard 8x8 games and not attempt variant parsing.
4. Engine analyzer must throw a clear error if asked to analyze an unsupported variant.
5. All references to Fairy-Stockfish in tests and code must be completely cleaned up.

---

### Task 1: Clean Userscript Metadata

**Files:**
- Modify: `super-chess-bot/src/userscript/metadata.ts`
- Modify: `super-chess-bot/tests/integration/sites/sites.test.ts`

- [ ] **Step 1: Update metadata.ts to remove Fairy-Stockfish**
Remove `FAIRY_STOCKFISH_JS_HASH`, `FAIRY_STOCKFISH_WASM_HASH`, `fairyStockfishResourceUrl`, and Fairy-Stockfish resources from `getUserscriptMetadata`.
- [ ] **Step 2: Update tests in sites.test.ts**
Update tests asserting `userscriptMetadata.resource` to assert only `stockfish.js` and `stockfish.wasm`.
- [ ] **Step 3: Run Vitest on sites.test.ts**
Run: `bun test tests/integration/sites/sites.test.ts`
Expected: PASS

---

### Task 2: Remove Fairy-Stockfish from Worker Client

**Files:**
- Modify: `super-chess-bot/src/engine/worker-client.ts`

- [ ] **Step 1: Remove `createFairyStockfishWorker` and `EngineKind`**
Remove `createFairyStockfishWorker`. Simplify `EngineWorkerClient` to manage only Stockfish.
- [ ] **Step 2: Simplify `ensureEngine`**
Only switch if `chess960` setting changes. Remove all `variant` switching logic.
- [ ] **Step 3: Run Vitest on worker client**
Run: `bun test tests/integration/engine/worker-client.test.ts`

---

### Task 3: Simplify UCI Client

**Files:**
- Modify: `super-chess-bot/src/engine/uci-client.ts`

- [ ] **Step 1: Remove variant queue and `setVariant`**
Remove `variant` option, `variantUpdate`, `pendingVariantUpdates`, and `setVariant`.
- [ ] **Step 2: Update error messages**
Replace engine naming in error messages to always be `'Stockfish'`.
- [ ] **Step 3: Run Vitest on engine tests**
Run: `bun test tests/integration/engine/`

---

### Task 4: Restrict Variant Registry and Site Adapters

**Files:**
- Modify: `super-chess-bot/src/chess/variants.ts`
- Modify: `super-chess-bot/src/chess/position.ts`
- Modify: `super-chess-bot/src/sites/lichess/adapter.ts`

- [ ] **Step 1: Update `variants.ts`**
Keep only `standard` and `chess960`. Reject all other variants.
- [ ] **Step 2: Clean `position.ts`**
Remove 3check/crazyhouse special FEN handling.
- [ ] **Step 3: Update `LICHESS_SUPPORTED_VARIANTS`**
Set allowlist to `['standard', 'fromPosition', 'chess960']`.
- [ ] **Step 4: Run Vitest on chess and adapter tests**
Run: `bun test tests/unit/chess/ tests/integration/sites/`

---

### Task 5: Delete and Update Tests

**Files:**
- Delete: `super-chess-bot/tests/integration/engine/fairy.test.ts`
- Modify: `super-chess-bot/tests/unit/chess/variants.test.ts`
- Modify: `super-chess-bot/tests/integration/engine/worker-client.test.ts`

- [ ] **Step 1: Delete `fairy.test.ts`**
- [ ] **Step 2: Update `variants.test.ts`**
Assert rejection of fairy variants (`crazyhouse`, `atomic`, etc.).
- [ ] **Step 3: Update `worker-client.test.ts`**
Test Stockfish single engine lifecycle and Chess960 switching.
- [ ] **Step 4: Run Vitest on entire suite**
Run: `bun test`

---

### Task 6: Documentation and Full Verification

**Files:**
- Modify: `super-chess-bot/README.md`
- Modify: `super-chess-bot/README-c.md`
- Modify: `super-chess-bot/AGENTS.md`
- Modify: `super-chess-bot/docs/support-matrix.md`
- Modify: `super-chess-bot/docs/architecture.md`
- Modify: `AGENTS.md` (root)

- [ ] **Step 1: Update documentation files**
Remove mentions of Fairy-Stockfish and non-standard variants.
- [ ] **Step 2: Run `bun run check`**
Verify Biome lint, TypeScript typecheck, Knip, Vitest, and both production builds.
