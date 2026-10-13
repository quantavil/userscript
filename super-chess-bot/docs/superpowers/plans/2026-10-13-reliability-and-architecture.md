# Super Chess Bot reliability and architecture implementation

Spec: [reliability and architecture](../specs/2026-10-13-reliability-and-architecture.md)

Status: completed. All seven tasks are implemented and reviewed; see the [execution ledger](2026-10-13-execution-ledger.md) for corrections, validation, and deferred limits. Paths below describe the original execution assignments; final paths are documented in [architecture](../../architecture.md).

Execution: user-requested multi-agent implementation with coordinator integration and independent review. Work in the existing clean checkout; no automatic commits, pushes or publishing. Agents own disjoint paths until the coordinator migrates files.

## Review focus

- Disposal during asynchronous worker creation must terminate late workers and reject pending jobs.
- Reports requested during live games, disabled automation, or a changed session must not compete with move searches.
- Intermediate clock ticks and increment controls must not corrupt elapsed move timing.
- Optimistic local moves, rollback, and immediate opponent responses must not imply remote acknowledgment.
- Stale retry timers and late tablebase promises must not affect a different game or cause unhandled rejections.

## Task 1 — Engine resources and endgame results (agent)

Files: src/engine/uci-client.ts, worker-client.ts, tablebase.ts; tests/stockfish.test.ts, fairy.test.ts, tablebase.test.ts; new focused worker tests if needed.

Interfaces: retain getAnalysis/engineWorker API; add explicit UciClient.dispose(): void. TablebaseResponse retains evaluation and display fields, with DTZ and DTM separately modeled.

- Write and run failing regressions for repeated engine switching, initialization disposal, DTZ without DTM, already-aborted lookup and bounded full-FEN cache.
- Implement permanent client disposal, safe engine replacement, and cleanup of late setup resources.
- Return WDL outcomes without invented mate values, add bounded result caching, and preserve cancellation semantics.
- Run focused suites, strict TypeScript and report exact results. Coordinator removes scheduler grace and tests race behavior separately.

## Task 2 — Game records and reports (agent)

Files: src/game-history.ts, pgn.ts, report/analyzer.ts and their tests.

Interfaces: preserve existing tracker API; reset accepts variant; report entry point receives explicit variant/eligibility options, with finished-game eligibility checked before each search. Coordinate exact added signature with head coder before changing consumers.

- Reproduce intermediate clock undercount, black root numbering, EMT carry, variant tracking, report rejection while live, report cancellation/retry.
- Fix turn-baseline timing and unknown increment fallback without inventing precision.
- Preserve true root side/fullmove in paired records and PGN; fail safely on illegal replay instead of duplicating stale positions.
- Carry variant through report search, reject live eligibility, and avoid sticky deduplication after cancellation/failure.
- Run focused suites and report results. Coordinator owns controller and panel integration.

## Task 3 — Chess.com acceptance investigation (agent)

Files: read src/sites/chesscom*.ts, src/board.ts, current acceptance tests and docs; initially read-only.

- Determine whether existing controller APIs contain independently acknowledged state; distinguish measured APIs from speculation.
- Recommend a concrete local-versus-authoritative contract and rollback tests; do not invent remote events or write directly to sockets.
- Coordinator assigns bounded implementation based on evidence.

## Task 4 — Remove PyChess and normalize variant identity (coordinator)

Files: site registry/types, userscript metadata, board input, PyChess source/tests and current documentation; new src/chess/variants.ts.

- Assert remaining registry rejects PyChess, metadata omits hosts, and canonical variant mapping keeps fromPosition/chess960/3check distinct where needed.
- Delete only PyChess-owned code/tests; remove obsolete selection transport and wide-board assumptions where unused.
- Retain Fairy-Stockfish and variant context for Lichess. Defer full variant transport correctness on both remaining sites.

## Task 5 — App ownership and behavioral integration (coordinator)

Files: controller, scheduler, board confirmation, UI/panel command entry points and tests.

- Guard manual reports through app commands and cancel reports on disable/re-enable, live return, new game and settings changes.
- Clear presentation state at lifecycle boundaries; clear log without resetting accepted history.
- Replace unbounded retry with position/session-scoped bounded retries.
- Remove extra tablebase grace wait, observe/abort both race branches and verify fast/slow/rejected paths.
- Integrate explicit confirmation provenance and document limitations.

## Task 6 — Responsibility-based migration (coordinator plus bounded UI agent)

- Move controller/runtime into app; history/position/notation into chess; adapters under sites/chesscom and sites/lichess; records/report under game; persistence under settings; presentation under ui; metadata/menu under userscript.
- Move scheduling that calls adapters/presentation into app, retaining engine-only search policies under engine. Avoid introducing empty abstraction files just to reproduce the proposed tree.
- Extract major panel sections into components with explicit props and controller commands.
- Update every import, mock path, Vite entry/resolver, Knip config and test path. Prefer actual moves to legacy wrapper modules.
- Run typecheck and focused suites after migration stages.

## Task 7 — Documentation, CI and acceptance (coordinator + fresh reviewer)

- Update README and AGENTS to current architecture, two-site scope, acknowledgment provenance, actual cache/race behavior and deferred variants.
- Add .github/workflows/super-chess-bot.yml with frozen install and bun run check.
- Run bun run check; inspect both generated headers and git diff for stray PyChess support and licensing changes.
- Dispatch fresh reviewers over behavioral changes and final structure; resolve important findings and rerun affected checks plus final project check.
- Deliver concise summary, plan/spec links, test evidence and any unverified live-site limitations.
