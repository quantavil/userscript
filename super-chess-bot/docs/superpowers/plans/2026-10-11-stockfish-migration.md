# Stockfish Migration Implementation Plan

> For agentic workers: use subagent-driven-development to implement and review the bounded tasks below.

**Goal:** replace custom search with persistent Stockfish and reduce move latency.
**Architecture:** board adapter -> controller/scheduler -> Stockfish worker -> confirmed input. Independent Preact/Signals panel.
**Tech Stack:** Bun, Vite/monkey, TypeScript strict, Stockfish WASM, chessops, Preact, Tailwind 4, Zod Mini, Biome, Knip.
**Spec:** ../specs/2026-10-11-stockfish-design.md

## Constraints
GPL-3.0-or-later. Preserve preexisting work in /tmp/super-chess-bot-before-migration. No main-thread search fallback. Pin engine resources. No automatic premove chains.

## Review Focus
Cancellation during WASM search; old bestmove arrival; history resets; board replacement; invalid saved settings.

## Tasks
- [x] Engine: replace analysis.ts, worker-client.ts, san.ts; add UCI client tests. Produce getAnalysis(fen, depth, timeLimit, signal?, history?) returning success/depth/bestmove/pv/evaluation. Expose resetEngine, cancelPonder, ponderPosition, predictFen. Ensure one persistent worker and serialized UCI requests.
- [x] UI: replace ui.ts with facade for Preact TSX panel and Signals, scoped Tailwind CSS. Preserve buildUI, ui.updateDisplay/log/clearConsole. Settings callbacks call controller immediately.
- [x] Tooling/settings: install dependencies with Bun, Tailwind Vite plugin, resource metadata, Biome/Knip configuration, strict JSX TypeScript, Zod Mini settings validation and tests. Preserve state exports consumed by existing adapter.
- [x] Controller/adapter: event subscription with cleanup/fallback, remove 80ms delay, immediate confirmed moves with stale position/enable guards, simplify scheduler and remove custom premove scoring. Add regression tests.
- [x] Integration: retire obsolete custom engine/tests; update README/AGENTS; run tests, typecheck, lint, Knip, build; verify resources and live bot page. Review all changes.

## Verification outcome

All implementation tasks completed. `bun run check` passes (36 tests, strict TypeScript, Biome, Knip, production build). Chromium smoke testing used production bundle injection with userscript resource shims on the selected Komodo20 one-minute computer game; a real userscript-manager installation remains unverified. See `../../browser-verification.md` for timings and limits.
