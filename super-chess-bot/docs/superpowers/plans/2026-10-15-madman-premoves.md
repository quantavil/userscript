# Madman aggression and premoves implementation plan

> For agentic workers: use executing-plans for inline execution; use test-driven-development and a fresh final review.

Goal: use one 120 cp playing-risk ceiling on every Madman turn and enable aggressive cached premoves with the existing toggles.

Architecture: keep normal premove behavior separate. A Madman cache stores exact position/history/session/settings provenance and planned, fast or full selection evidence. One cancellable worker prepares six opponent branches, then refines completed entries; actual-turn hits dispatch without waiting for worker drain or synthetic timing delays.

Spec: docs/madman-improvement-research.md, approved in conversation by “do same with madman also no 50cp and lets proceed”.

Global constraints: one worker; no new preference/dependency; unchanged adapters/confirmation/recovery; no queen-trade rule. The 120 cp ceiling is an estimate for evaluated comparisons; planned continuations have unknown branch concession. Use the same 120 cp constant for anchor-stability checks; no second cp threshold.

Review focus: rapid opponent replies during search cancellation; history/en-passant/session/settings invalidation; incomplete or mixed-depth results; replacement of a planned continuation by evaluated replies; cached replies that bypass ordinary Elo/book/recapture selectors.

## Task 1: one risk ceiling

- [x] Replace cooldown tests with repeated 120 cp selection and explicit fast-depth comparison tests; observe failure.
- [x] Remove risk tracker, cooldown options and 50 cp playing limit. Separate search-anchor stability from playing risk.
- [x] Run selector and discovery unit tests.

## Task 2: cache and branch preparation

Files: src/engine/madman-premove.ts; tests/unit/engine/madman-premove.test.ts.

- [x] Test exact-context planned continuation seeding, unknown concession, source replacement priority and cancellation/incomplete batches.
- [x] Implement cache and sequential prediction/fast/refinement search. Fast: depth-3 prediction (six), depth-3 seeds (three), depth-4 restricted seeds plus four attacks; require completed exact-score comparisons. Bound every speculative search slice by an absolute deadline.
- [x] Publish completed fast entries independently; full refinement uses analyzeMadman. Keep completed cache entries on current-position transitions, discard incompatible context.
- [x] Run unit tests through Bun/Vitest.

## Task 3: scheduler integration

Files: src/app/scheduler.ts; tests/integration/app/scheduler.test.ts.

- [x] Test planned cache hits without new search, evaluated branch hits, cancellation while a cached reply dispatches, settings/history misses and synthetic delay bypass.
- [x] Integrate separate Madman cache, seed only the selected attack after observed submission, dispatch hits before foreground analysis, prepare branches on opponent turns, bypass Madman analysis on hits. Normal paths remain normal.
- [x] Run scheduler tests and full suite.

## Task 4: documentation and verification

- [x] Update README, AGENTS, architecture and current design/verification notes; preserve historical observations.
- [x] Run bun run check, inspect diff, obtain fresh independent review and fix important findings with regression tests.
- [x] Leave changes in the shared workspace for review; do not push. Record results here.

## Execution ledger

Ruling: user explicitly requested proceeding with the concrete researched design and 120 cp only; do not repeat approval questions. Execute inline in the existing shared checkout to preserve the user's visible workspace; no worktree/branch integration ceremony. No new commit requested in this turn.

Pre-flight: Task 1 selector minimum-depth option feeds Task 2 fast comparisons; Task 2 cache/context and publishing API feed Task 3. Full comparisons retain minimum depth 6, fast comparisons use 4. Search-anchor drift is separate from the removed cooldown.

Task 1: complete — selector/search tests passed; removed cooldown tracker/options/constants, parameterized fast minimum depth. Anchor comparison also uses 120 cp per user clarification.
Task 2: complete — cache/branch tests passed; planned unknown concessions, source priority, full FEN/history/context and progressive branch publication.
Task 3: complete — scheduler tests passed, including cached dispatch while speculative analysis remains unresolved. Full suite: 470 tests/37 suites before final additional regression coverage.
Task 4: complete — README/AGENTS/architecture/design/research/verification updated; both production outputs rebuilt. Final bun run check passed: 475 tests across 37 suites, Biome, strict TypeScript, Knip and both builds. git diff --check passed.

Review: one Important finding (new authoritative positive mate hidden by incomplete/older MultiPV) fixed after two failing regressions; targeted tests then passed. Fresh reviewer confirmed the fix and no remaining Critical/Important findings. Added six-branch breadth-before-refinement, evaluated cache-hit and synthetic-wait-miss coverage.

Native smoke: real UciClient + packaged Stockfish Lite produced six fast cached replies by 267 ms and five full upgrades by 834 ms on one attacking root. Browser timing/coverage and stronger-reference strength remain unmeasured; see docs/madman-verification.md. Source and built outputs left uncommitted in the shared workspace, per this turn's scope.

## Approved follow-up: earlier replies and offered-piece punishment

User explicitly approved the concrete 32-position research recommendation and clarified that maximum aggression/speed, not human-like play, is the objective. Execute inline in the shared checkout; preserve earlier uncommitted changes.

- [x] Publish legal ordinary prediction PV replies with unknown loss, below the selected attack's planned continuation.
- [x] Publish complete depth-three attacking choices before restricted depth-four search, using the same 120 cp allowance and pressure score.
- [x] Preserve exact-context legal capture hints after observed own movement, including short PVs and both-color en passant. Add four missing capture branches ahead of six ordinary branches, retain hints across compatible position preservation, and continue on optional prediction failure.
- [x] Bound cache at eleven entries and preserve evidence/mate priority, cancellation, exact history/session/settings/variant/FEN and normal adapter dispatch.
- [x] Update README/AGENTS/design/architecture and verification. Do not adopt experimental attack weights or introduce preferences.
- [x] Run final full check and fresh independent review. Final: 486 tests/37 suites, lint/typecheck/Knip, both builds and diff checks passed. Review's en-passant finding fixed with regressions; reviewer confirmed no remaining important findings. Integrated native smoke prepared the omitted Qxg4 -> Nxg4 branch at depth 3/4/9; see docs/madman-verification.md for measured timings and limits.

Changes remain uncommitted; no push or external game was performed.


## Release 12.1.0

The user subsequently requested cleanup, version bump, rebuild, commit and push, superseding the earlier uncommitted-work scope. Consolidated overlapping premove research into docs/madman-improvement-research.md; removed disposable experiment scripts/raw observations and retained the two compact result tables. Updated README and AGENTS release guidance. Preserve source tests, design/verification history, and both generated userscripts.
