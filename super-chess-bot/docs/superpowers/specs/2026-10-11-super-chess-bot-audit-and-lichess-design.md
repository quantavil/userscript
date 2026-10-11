# Super Chess Bot audit fixes and Lichess support design

**Date:** 2026-10-11

**Scope:** `super-chess-bot` only

**Checkout:** existing `feat/pychess-support` worktree based on local `main`. Do not use `origin`.

## Goal

Fix the confirmed Super Chess Bot correctness and efficiency issues, retain Chess.com and PyChess behavior, and add Lichess Play against computer support without API integration. Lichess eligibility is limited to standard chess against maximum AI level 8. Support should fail closed when the round controller or accepted position is unavailable.

## Confirmed existing fixes

1. **Ponder deadline:** stop a promoted shallow ponder at the foreground time budget while retaining a separate watchdog for a worker that does not answer `stop`.
2. **Terminal UCI response:** preserve `bestmove (none)` across the UCI client boundary and report a terminal position only when the position has no legal move.
3. **Panel shortcuts:** ordinary non-editable elements do not suppress E, R, and Ctrl+B; form controls and editable content still do.
4. **Chess.com observer work:** ignore bot-owned and unrelated mutations, coalesce relevant records, and deduplicate unchanged snapshots while retaining accepted-move, clock-readiness, board-replacement, and result changes.

The existing regression suite covers these fixes.

## Lichess route design

The current Lichess round module's `initModule(opts)` returns a `RoundController`. The page asset loader normally calls it internally without exposing that result. At `document-start`, the userscript hooks `window.site` and its `asset` assignment, then wraps `site.asset.loadEsmPage` and `site.asset.loadEsm`. It captures the returned controller only for the `round` module, using Lichess's existing `loadEsm('round', { init })` path when the page loader is used. Other page modules continue through the original loader.

The adapter accepts a controller only when all of these are true:

- `game.source` is `ai` and the opponent AI level is exactly `8`;
- the player is participating in a live player round, not watching;
- the variant is standard chess;
- the Lichess round board, player color, game identity, game status, and accepted FEN are available;
- it is the player's turn, Lichess marks the round movable, and no move confirmation is pending.

Read the accepted position from the round's recorded steps. Do not use Chessground's local piece placement as the authoritative FEN because it may be optimistic while a move awaits server acceptance. Replay the recorded SAN through `chessops`; expose history and per-ply FENs only when the replay matches every recorded step. Read the player's current clock from the round clock controller when available; otherwise use the engine's normal configured budget.

Before submission, validate the engine UCI move against the accepted FEN, validate its predicted FEN, and require a matching destination in Lichess's legal-destination map. Call the round controller's `pluginMove(from, to, role, true)`. The explicit role supports queen promotion and underpromotion. This controller path uses Lichess's existing move handling and clock stop logic. Do not call a Lichess API, write to its socket, or synthesize trusted input events. Generic accepted-position confirmation remains responsible for confirming the move at the expected ply.

The hook relies on private frontend internals and may need updates after Lichess changes its loader or controller. If the hook, position, legal destinations, or player state cannot be verified, refuse to submit.

Primary implementation references:

- [Lichess asset loader](https://github.com/lichess-org/lila/blob/master/ui/site/src/asset.ts)
- [Lichess round initializer](https://github.com/lichess-org/lila/blob/master/ui/round/src/round.ts)
- [Round controller move and clock path](https://github.com/lichess-org/lila/blob/master/ui/round/src/ctrl.ts)
- [Lichess clock controller](https://github.com/lichess-org/lila/blob/master/ui/lib/src/game/clock/clockCtrl.ts)

## Browser verification limit

The available agent-browser session was logged out. Creating a level-8 AI game landed on a read-only spectator route, which did not create a player `RoundController`. That session cannot verify actual move acceptance, promotion, or a running clock. Unit tests and the production build can verify the bridge contract and adapter behavior; a manager-installed logged-in player game remains the live end-to-end check.

## Acceptance criteria

- Existing Chess.com/PyChess regression tests and all current checks pass.
- Lichess is selected only on exact `lichess.org` hostnames and the userscript matches those hosts at document start.
- The adapter rejects non-AI games, AI levels below 8, other variants, spectators, stale positions, and destinations not listed as legal.
- Tests cover controller capture, accepted FEN/history, clock reads, standard move submission, explicit underpromotion, and accepted-move notifications.
- The controller transport uses `pluginMove`; there is no API integration or direct socket write.
- Browser results distinguish source/test verification from a logged-in player-game check. Do not claim live Lichess promotion or clock verification unless it was performed.
- No files outside `super-chess-bot` are changed.

## Out of scope

- Changes to other userscripts.
- Lichess official API integration.
- Elo calibration claims.
- Publishing or installing artifacts outside the existing local userscript workflow.
