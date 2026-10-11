# PyChess AI Game Support Design

**Status:** Revised after live site and deployed-source inspection; ready for plan review
**Date:** 2026-10-11
**Scope:** `super-chess-bot/` only
**Baseline:** Current local `main`, incorporated through `6377b40`; refresh from the local branch at implementation start.

## Goal

Let Super Chess Bot play a complete standard chess game against PyChess's built-in AI with the existing local Stockfish engine. The first browser acceptance setup is **Play with AI → CHESS → level 7**, orthodox starting position, Chess960 off, Random-Mover off, real time, **1+0**. Existing Chess.com behavior remains available. Unsupported variants remain ineligible and automation starts disabled.

The user requested site and source inspection before implementation. This strategy is grounded in a live anonymous AI game, not a puzzle or analysis board. See [research evidence](../../pychess-research.md) and the [implementation plan](../plans/2026-10-11-pychess-support.md).

## Approaches and the input-path correction

Duplicating the Chess.com flow would duplicate lifecycle, recovery, scheduling, and validation. A general provider framework would add abstraction beyond this target. Select a narrow site adapter around the existing shared core.

The original synthetic click/drag proposal cannot work as written. ChessgroundX checks `event.isTrusted` in its drag-start handler; dispatched mouse events were ignored in the live AI game. A userscript cannot manufacture a trusted DOM event. Browser-driver clicks can be trusted, but a browser driver is not a runtime dependency of this userscript.

Use **`cg.selectSquare(from)` then `cg.selectSquare(to)`**, without forcing an illegal selection. This renders on the visible board and follows `board.select → userMove → movable.events.after → RoundController.onUserMove → promotion/input chain → doSendMove`. The live probe submitted `e2e4`; the server movelist recorded `1.e4 c5`. `cg.move()` only performs a board move and does not follow this submission chain, so it is excluded.

This revises the original visible-event requirement to visible-board square selection through the site's legal user-move path. It adds no raw socket sender or replacement move callback. Chess.com's click/drag transport continues to apply there.

## Architecture and file boundaries

Add a narrow typed `SiteAdapter` contract under `src/sites/` for game snapshots, position/lifecycle subscriptions, clocks, promotion choices, and submission. `sites/chesscom.ts` wraps existing Chess.com behavior; `sites/pychess.ts` owns PyChess globals and selectors; `sites/pychess-state.ts` parses page observations. No public plugin framework is added.

Snapshots include a stable identity token for the game/controller/board instance, game ID, accepted full FEN, player color, side to move, orientation, phase (`live`, `replay`, or `finished`), input readiness, board element, optional replayable history and confirmed FEN sequence, and optional remaining player clock in milliseconds. Unavailable/ineligible reads carry a specific reason. Freshly allocated snapshots must not be mistaken for new games.

`controller.ts`, `engine/scheduler.ts`, `state.ts`, `ui.ts`, and `index.ts` consume the adapter without host-specific DOM reads. `board.ts` retains overlays, geometry, serialized execution, revision cancellation, and bounded confirmation. Extract reusable gestures to `board-input.ts` where needed to avoid a `board.ts ↔ sites` cycle. Retain shared promotion parsing and chessops history utilities.

Use **local `main`**, preserving these documents when refreshing. That baseline already uses **Valibot**, newer input guards, panel hotkeys, and overlay fixes. Preserve them and the pinned Stockfish worker resources. Add no engine, UI, schema, or browser automation dependency. All integration edits stay inside `super-chess-bot/`.

## Authoritative state and eligibility

Read `unsafeWindow.cg` and `body#pychess-variants` defensively. Resolve `.round-app #mainboard cg-board`; require identity with `cg.state.dom.elements.board`, connection, visibility, and 8×8 dimensions. Require the round view, matching current game ID, variant `chess`, Chess960 `False`, real-time play, known username/player membership, and Fairy-Stockfish opponent with an integer AI level in 0–8. Level 7 is the acceptance target, not the only eligible level. Missing or conflicting metadata is ineligible.

Derive player color from `data-username` membership in `data-wplayer`/`data-bplayer`. Orientation is independent. Use `cg.state.fen` with all six fields; `cg.getFen()` supplies placement only. Body `data-fen`, `data-status`, `data-ply`, and `data-result` are initial metadata, not live state. In the probe, they remained stale after moves and after a time-out finish.

Derive side to move from the accepted full FEN. Local submission optimistically changes pieces and `state.turnColor` while `state.fen` remains unchanged. Preserve the accepted FEN and mark input unavailable during this mismatch. Never assemble a FEN from optimistic pieces and turn, or accept animation as confirmation.

Read ordered `#movelist move[ply] san` nodes, excluding counters/evaluations. Require contiguous plies and the final move active for live input. Replay accepted SAN with chessops from `data-initialfen`, or orthodox starting FEN when empty. The final replay must agree with `state.fen` before trusting history. Canonicalize through chessops so irrelevant en-passant notation may differ while meaningful en-passant rights, castling, turn, and counters stay checked.

Historical selection changes `state.fen` and disables `movable.color`. Detect replay from active versus latest ply and suspend input. Detect game end from `#movelist .result` plus `.btn-controls.after`, or an initial terminal status on reload. Recognize `1-0`, `0-1`, `1/2-1/2`; allow `*` only with explicit postgame evidence for an aborted game. Missing movable color alone is not proof of game end. Unreadable, disconnected, or conflicting state suspends input with a recoverable reason.

## Events, cancellation, and confirmation

Observe the main board, movelist, and round lifecycle/result container. Board-only observation can miss the acknowledgement whose pieces already match the optimistic board. The movelist is rendered from server board messages. Coalesce into microtasks, ignore bot overlays, and deduplicate normalized position/lifecycle state so animation and clock ticks cannot reschedule search.

Retain the existing one-second controller reconciliation as recovery. Add no per-move fixed delay. Reattach observers on DOM board or `cg` replacement and cancel old-identity work.

Subscribe before submission. Confirm the exact canonical expected position **at the expected ply**, within the same game's accepted history. A fast AI reply may already be current; its history must contain the expected own-move position. Unrelated FEN changes, optimistic pieces, an earlier repetition, or another game never confirm. Retain the 1,000 ms bounded timeout and explicit retry behavior.

Before selecting each square, check identity, accepted FEN, input revision, enabled/auto-move settings, live phase, player turn, visible owned board, and PyChess legal destination. Validate through chessops too. Select both squares synchronously after the final guard without a timer gap that could leave a premove. No force-selection, raw WebSocket submission, `cg.move()`, or speculative premove chain is used. Cancellation clears only unfinished bot-owned selection/chooser; it cannot undo a submitted move.

## Promotions and clocks

PyChess's chooser is `#mainboard #extension_choice square > piece.q-piece|r-piece|b-piece|n-piece`. Click the visible square containing the exact requested role and player color. Its handler runs the remaining move submission chain.

To prevent saved auto-promote from replacing an engine underpromotion with a queen, use PyChess's Ctrl override: temporarily set `cg.state.stats.ctrlKey=true` during promotion destination selection, then restore it in `finally`. The user-move metadata captures this value and forces the chooser without changing localStorage or replacing callbacks. Test all roles and preference preservation. Source supports this route; live promotion verification remains required.

Choose `#clock0`/`#clock1` using player color and current orientation. Parse `.clock-time.min` and `.clock-time.sec`, including decimals, and exclude `.clock-time.byo` (`+0s`). Return unavailable for malformed clocks; suspend input while the round clock reports connecting. Move clock interpretation into adapters and preserve the scheduler's current budget formula and input reserve.

## User-visible behavior

- Mount the shared panel and prewarm Stockfish in the PyChess lobby, before the game clock starts; initialization cannot wait for a Chess.com selector.
- Enable starts off. Move budget, depth cap, pondering, overlay orientation, and panel shortcuts remain shared.
- Report waiting for AI game, waiting for synchronization, analyzing, waiting for AI, paused after trusted interaction, browsing previous moves, game finished, or a specific recoverable error.
- Explain that PyChess uses board selection. Hide/disable click/drag and auto-rematch controls there without changing saved Chess.com values. Auto-rematch is outside this pass.
- Disable cancels search, pondering, unfinished input, and confirmation. Trusted left-button/touch interaction pauses input and uses explicit resume/retry behavior; right-click drawing does not interrupt. Listen on the board wrapper to include promotion interaction.
- Keep the existing worker, UCI serialization, exact ponder matching, legal validation, and Valibot settings. No page-thread engine fallback or additional chess-rule implementation.

## Packaging and documentation

Add `https://www.pychess.org/*` and `https://pychess.org/*` to userscript matches and accept those exact hosts. Preserve all Chess.com matches, pinned resources, grants, and GPL-3.0-or-later metadata. Update this subproject's package description, README, AGENTS, and browser verification notes. Do not edit root documentation or other userscripts.

## Verification and acceptance

Use Vitest through `bun run test`; native `bun test` lacks the mocking API used by this suite. Cover eligibility, both player colors independently of orientation, malformed/stale FEN, replay, replacement, game end, clocks, and partial history. Move tests must distinguish optimistic display from server acknowledgement and confirm a particular ply after a fast reply. Cover cancellation, preference restoration, legal castling destinations, all promotion roles, no opponent-turn premove, and exact ponder history matching. Keep existing Chess.com/controller/scheduler/UI tests passing. Run `bun run check` and inspect the built matches/resources and subproject-only diff.

Use `agent-browser`, dedicated Chromium, and the production bundle installed through a userscript manager. Open **Play with AI** on `https://www.pychess.org/?any`: CHESS, empty alternate start, Chess960 off, Random-Mover off, real time, 1 minute (**slider index 4**), increment 0, level 7, deliberate color. Wait for panel `Ready`, enable, and play to game end. Record URL, result, plies, AI level, settings, starting/ending player clock, and initialization separately from warmed search/submission/confirmation.

Also check Black, board flip, replay browsing, disable during search, trusted interruption/resume, replacement/new game, unknown AI identity, and an unsupported variant. Promotion requires a targeted browser run: use signed-in custom-FEN AI practice if available, otherwise ordinary AI play and explicitly record any unverified underpromotion case.

Minimum supported move budget remains 100 ms. One completed game is one observation, not an Elo rating, bullet guarantee, or sub-five-second clock-use result. The research game tested one move then timed out during inspection; it is not full-game bot acceptance.

## Risks and references

The global Chessground API, body metadata, and round markup are site internals. Keep access in the adapter, revalidate ownership before input, and suspend when state cannot be established. Promotion, castling, reconnect, and full production-bundle play remain planned checks.

- [Research observations and source map](../../pychess-research.md)
- [Play with AI](https://www.pychess.org/?any)
- [Deployed round controller](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/roundCtrl.ts)
- [Deployed game controller](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/gameCtrl.ts)
- [Deployed promotion input](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/input/promotion.ts)
- [ChessgroundX 10.7.5 input](https://unpkg.com/chessgroundx@10.7.5/src/drag.ts)
