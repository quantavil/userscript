# Maximum Aggression Madman Implementation Plan

> Historical initial implementation. The later approved 120 cp-only policy and planned/fast/full premove support supersede the cooldown and premove-suspension decisions here; see [premove implementation](2026-10-15-madman-premoves.md).

> **For agentic workers:** Use executing-plans for implementation in this session. Steps use checkbox syntax for tracking.

**Goal:** Make Stockfish 19 Lite prefer sustained attacks, accepting occasional concessions up to 120 cp.

**Architecture:** One final policy discovers extra legal attacking candidates, evaluates them with the baseline, and selects aggression first inside a risk envelope. Optional capture verification shares the turn deadline and existing single worker.

**Tech Stack:** TypeScript, Bun, chessops, Stockfish 19 Lite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-madman-design.md`

## Global constraints

- One persisted boolean in SETTING_SPECS, default off. Automation remains disabled on startup.
- Maximum concession 120 cp; 50 cp during three observed own turns after a concession above 50 cp.
- Preserve positive mates and tablebase outcomes; reject avoidable negative mates.
- No pseudo-cliffs, sigmoid gates, retreat vetoes or queen-count trade penalties.
- Preserve session/FEN cancellation, history, Chess960 encoding and uncertain-dispatch recovery.
- No optional depth-only searches or extra engine workers.

## Review focus

- Illegal moves, missing scores and incomplete/depth-mismatched batches must fail closed.
- Expired or failed optional searches retain the usable baseline.
- Opponent capture scores must be converted to the original mover's perspective.
- Repeated analysis of the same position must not spend cooldown repeatedly.
- Mode toggles must clear stale premoves; Elo/book shortcuts must not override selection.

## Tasks

- [x] 1. Pure policy in src/engine/madman.ts and tests/unit/engine/madman.test.ts: legal attack shortlist, pressure features, risk envelope, mates, malformed inputs, both colors and castling.
- [x] 2. UCI searchMoves/deadline options through uci-client.ts, worker-client.ts and service.ts: restricted commands, graceful stops, incompatible ponder rejection; tests/integration/engine/stockfish.test.ts.
- [x] 3. Bounded discovery in src/engine/madman-search.ts: baseline plus four proposals in a complete comparable batch, optional capture evidence, failure fallback; tests/unit/engine/madman-search.test.ts.
- [x] 4. Scheduler/settings/UI: six baseline lines, final selector, no unchecked book/premove bypass, observed-position cooldown and toggle cancellation; scheduler/settings/panel tests.
- [x] 5. README/AGENTS documentation, full bun run check and final diff review. No calibrated strength or measured style claims without benchmarks.

## Execution ledger

User approved the aggression-first design and requested implementation. Work stays in the current workspace; the original untracked proposal is intentionally replaced. No unrelated files were dirty. Values are experimental tuning.


- Tasks 1–4: completed with test-first policy, UCI command/provenance/deadline, bounded-search and scheduler/settings/panel coverage.
- Final independent review: three Important findings, no Critical/Minor findings. Fixed incomplete/mixed baseline authorization, inherited bound/unscored PV scores, and newer mate versus older snapshot selection. Regression tests failed first, then passed.
- Additional smoke-driven fix: shallow complete snapshots retain the authoritative engine move. Initialization/queue expiration prevents starting an already-expired optional search. Added legal orthodox/Chess960 castling and four-promotion discovery coverage.
- Sustained pressure includes the next two legal own-move positions from the searched PV. A quiet setup can beat a temporary attack; no geometric retreat veto is used.
- Ruling: use the current clean workspace and leave changes uncommitted — user requested implementation, and both production artifacts are available for inspection/install without moving shared branch state.
- Ruling: suspend unchecked instant premoves/book dispatch in Madman — preserves one final risk/style policy; costs some bullet speed. Existing preferences resume in normal mode.
- Ruling: tuning is experimental; no neural opponent model or strength claim — costs predictive human-trap selection, avoids an unvalidated inference subsystem.
- Declined-to-judge behaviors from review: measured strength, practical aggression, live browser latency and site behavior. These require separate game/browser benchmarks; the native smoke test does not establish them.
- Verification: bun install --frozen-lockfile; bun run check passed (458 tests across 36 suites, Biome, TypeScript, Knip and both production builds); git diff --check passed. Native Stockfish 19 Lite smoke: four positions at 100 and 400 ms; see docs/madman-verification.md.

- Follow-up: user requested a commit, exact UI label `Madman · max aggression`, expanded README/AGENTS documentation and a premove pros/cons discussion. Updated these and added docs/madman-improvement-research.md; premove behavior is unchanged. This supersedes the earlier decision to leave the work uncommitted.
