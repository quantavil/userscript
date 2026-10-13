# SDD ledger — plan: docs/superpowers/plans/2026-10-13-remove-variant-support.md

Pre-flight: no shared interfaces conflict. Plan cleanly removes Fairy-Stockfish and non-standard variant logic.

Task 1: complete (cleaned metadata.ts and sites.test.ts, tests: bun test tests/integration/sites/sites.test.ts -> 24/24 pass)
Task 2: complete (removed createFairyStockfishWorker and multi-engine switching from worker-client.ts)
Task 3: complete (removed variant queue, setVariant, and Fairy-Stockfish naming from uci-client.ts, tests: vitest run tests/integration/engine/stockfish.test.ts -> 22/22 pass)
