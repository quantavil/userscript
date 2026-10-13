# Reliability and architecture redesign

## Intent and authorization

The user approved the proposed responsibility-based structure and requested a written plan, multi-agent execution, and coordinator review/correction. Remove PyChess support. Retain a shared variant model for eventual Chess.com and Lichess support; completing site variant transports is explicitly deferred.

## Scope

1. Remove PyChess adapters, host matches, tests, selection input, and current support claims. Preserve historical verification records as historical evidence.
2. Fix worker disposal, tablebase score semantics and cache/race policy, report eligibility/lifecycle, move timing, PGN root numbering and EMT rounding, stale presentation state, and bounded recovery.
3. Represent move-confirmation provenance honestly. Never label optimistic Chess.com controller history as server acknowledgment. Investigate existing captured APIs before selecting the supported acceptance contract; do not fabricate private events or add direct socket writes.
4. Restructure source into app, chess, sites/<site>, engine, game/report, board, settings, ui, and userscript responsibilities. Move shared confirmation into game; site-owned observation stays in adapters. UI commands enter through app, and the engine does not import presentation code.
5. Keep engine switching and game/report records variant-aware. Centralize variant mappings; no new claim of working Chess.com variants or complete Lichess variant transport.
6. Add CI running the frozen Bun install and project check. Keep both userscript outputs, GPL metadata, and pinned resource notices.

## Boundaries

- app owns automation, search-to-move coordination, reporting eligibility, interruption, and recovery.
- chess owns rules normalization, positions and notation without browser dependencies.
- sites owns private controllers, board selection, snapshots, submission and acceptance provenance.
- engine owns resources, UCI, searching, book, tablebase and pure selection/timing policy. It never calls UI or submits moves.
- game owns move records, timing, PGN, shared confirmation and report analysis.
- board owns shared overlays, trusted interaction, and bot node ownership.
- settings owns validation/defaults and persistence; runtime state is separate.
- ui renders presentation state and dispatches controller commands.

## Acceptance

- Existing standard-chess behavior stays available on Chess.com and Lichess; automation starts disabled.
- Worker switches leave one owned worker at most, including disposal during initialization.
- Tablebase DTZ is never exposed as mate; cached results are bounded and keyed by complete FEN. Stockfish completion incurs no tablebase grace wait.
- Reports cannot start during live games, stop on lifecycle transitions, and carry variant/history. Report retries remain possible after cancellation/failure.
- Turn timing survives intermediate clock snapshots; black-to-move/fullmove roots export correct PGN and rounded EMT carries across minutes/hours.
- Log clearing does not erase game history; new-game reset clears analysis trends and candidate lines.
- Confirmation identifies local versus accepted site state and never silently upgrades local history to server proof.
- Retry attempts are bounded per game position and canceled when session/settings/enabled state changes.
- Full project check passes after migration; fixes have meaningful regressions. Build metadata has no PyChess match. Documentation separates supported behavior from deferred variant work.

## Verification limits

Mocked private controller tests establish adapter contracts, not current production-site behavior. Any unverified remote acknowledgment or variant behavior is documented without a success claim. No publishing, pushing, merging or external messages are authorized by this work.
