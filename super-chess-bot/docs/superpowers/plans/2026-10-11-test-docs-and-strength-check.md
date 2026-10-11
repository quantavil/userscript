# Test Audit, Documentation, and Strength Check Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove any test that gives false confidence, document the current architecture with a Mermaid diagram, commit the authorized repository work, then measure performance against the strongest available Chess.com computer opponent at the minimum move budget.

**Architecture:** README and AGENTS will describe the existing board-adapter, controller, scheduler, UCI worker, and panel boundaries. The final browser run will use the installed userscript in a computer game and report observed results and clock use without treating a single result as a calibrated Elo rating.

**Tech Stack:** Bun, Vitest, TypeScript, Vite userscript, Stockfish WASM, Chess.com, Chromium.

**Spec:** User request in this conversation (2026-10-11).

## Global Constraints

- Use Bun and the existing Vitest runner (`bun run test`).
- Preserve GPL-3.0-or-later licensing and the per-project README/AGENTS guidance.
- Keep tests that assert distinct runtime behavior; remove a test only if it is misleading or redundant.
- Run `bun run check` before committing.
- Use the minimum supported move budget, and play only a selected Chess.com computer game for the benchmark.
- Report opponent rating and observed wins, move budget, game clock use, and sample limits separately.

## Review Focus

- The retained adapter tests still cover board event and mutation fallback after removing a weak selector-only assertion.
- The Mermaid graph reflects real call and recovery paths in the source.
- The benchmark records our clock from the game itself and separates it from per-move analysis time.
- A one-game result is reported as an observed performance point, not as a stable Elo estimate.

---

### Task 1: Audit tests

**Files:**
- Modify: `tests/board.test.ts`

- [x] Remove the `startMoveWatcher` test if it only asserts the selector query and does not verify observer attachment; keep the adapter tests that exercise event and DOM-mutation notifications.
- [x] Run `bun run test` and verify the remaining tests still pass.

### Task 2: Update architecture documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [x] Replace the ASCII architecture sketch with a Mermaid flowchart matching source ownership and recovery paths.
- [x] Update development and browser-testing instructions to use the current scripts and keep Elo claims evidence-based.
- [x] Verify the diagram references existing modules and the instructions match package scripts.

### Task 3: Verify and commit

**Files:** all current user-authorized changes in this project worktree.

- [x] Run `bun run check` and `git diff --check`.
- [x] Review the complete staged diff and commit the requested project work.

### Task 4: Computer-game benchmark (last)

**Files:** `src/board.ts`, `tests/board-input.test.ts`, `README.md`, `docs/browser-verification.md`.

- [x] Confirm the highest available opponent rating and use the minimum 100 ms bot move budget with a 1+0 game clock.
- [x] Fix the promotion picker stall discovered during the browser run; add regression coverage and verify the built userscript promotes in live matches.
- [x] Record game result, PGN move count, and both clocks; distinguish recorded move time from full clock use.
- [x] Report the highest rating actually beaten and the limits of the sample in `docs/browser-verification.md`.
