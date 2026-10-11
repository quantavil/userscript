# PyChess integration research — 2026-10-11

## Environment and scope

Inspected with `agent-browser`, session `pychess-research-20261011`, anonymous Chromium. Entry `https://www.pychess.org/?any`, then **Play with AI**, CHESS, orthodox start, Chess960 off, Random-Mover off, level 7, White, 1+0. The lobby's Puzzle of the day link was not opened.

Research game: [VwBeF2em](https://www.pychess.org/VwBeF2em). Both clocks began at `01:00+0s`. Super Chess Bot was not installed and its engine was not running. One transport probe submitted `1.e4 c5`; the idle inspection game subsequently ended by White's time-out after 2 plies. It is not a bot strength/acceptance result.

The deployed asset was `/static/pychess-variants.js?v=cf23022da34ea12b57b23e5cc479fa580c4076e1`, matching the read-only upstream checkout at `/tmp/pychess-source-20261011`. The upstream package declares ChessgroundX `^10.7.5`; that version's source contains the observed trusted-event check. Integration edits are limited to `super-chess-bot/`.

## Observations

| Observation | Evidence | Implementation consequence |
| --- | --- | --- |
| Anonymous AI setup works | White/current user `Anon–pZnxrQ3f`; Black `Fairy-Stockfish`; level `7` | Determine color by player membership, independently of orientation |
| Minute slider stores an index | `minutesValues = [0, .25, .5, .75, 1, …]` | Set `#min=4`, `#inc=0`, and verify visible 1+0 |
| Board belongs to exposed controller | `.round-app #mainboard cg-board === cg.state.dom.elements.board`; dimensions 8×8 | Validate DOM and controller ownership |
| Full FEN exists | `cg.state.fen` contains all six fields; `cg.getFen()` placement only | Use full state FEN |
| Synthetic events are ignored | Dispatched left mousedown/up/click at e2/e4 left position unchanged | Existing synthetic click/drag cannot serve PyChess |
| Trust check explains failure | ChessgroundX 10.7.5 `drag.start()`, line 23 checks `e.isTrusted` | Do not attempt to spoof trusted events |
| Selection follows submission | `cg.selectSquare('e2'); cg.selectSquare('e4')`; server movelist recorded `e4`, `c5` | Use selection/userMove/after-callback path; exclude `cg.move()` |
| Local display is optimistic | After destination selection: pieces at e4 and turn black, but full FEN initial and movelist empty | Require server history/FEN acknowledgement |
| Board-only observation skipped own FEN | Next distinct full FEN in board trace already included c5 | Observe movelist too; confirm expected own position at its ply |
| Body FEN stays stale | `data-fen` still initial after c5 | Initial metadata is not live game state |
| Flip changes orientation only | Orientation black, movable color white | Separate player color/orientation; remap overlays and clock |
| Historical selection disables input | Active ply 1, latest 2, post-e4 FEN, movable color absent | Replay suspends input |
| Terminal body metadata stays stale | After time-out: body status -2/result `*`; rendered result `0-1`, postgame controls | Detect result/finished UI |
| Clock text includes increment/decimals | `01:00+0s`, `00:06.0+0s`; flip moved own clock to clock0 | Parse minute/second children and map player clock |

The trace recorded destination selection near 117,871 ms and the sampled accepted post-reply state near 119,379 ms on `performance.now()`. This roughly 1.5 s includes AI/server response and observer scheduling. It is not engine search time or isolated own-move acknowledgement latency.

## Deployed source map

All PyChess links use the revision verified from the live asset URL.

- [templates/base.html](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/templates/base.html): round identity/configuration and initial metadata.
- [client/main.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/main.ts): initial model parsing.
- [client/lobby.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/lobby.ts): time-control index tables and AI setup.
- [client/round.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/round.ts): exports window.cg and board markup.
- [client/roundCtrl.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/roundCtrl.ts): after callback, server board/FEN/history updates, replay gating, move send, terminal state.
- [client/gameCtrl.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/gameCtrl.ts): promotion/input chain and sendMove.
- [client/input/promotion.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/input/promotion.ts): Ctrl override, role classes, chooser-square click.
- [client/movelist.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/movelist.ts): SAN nodes with ply, active selection, result/status.
- [client/clock.ts](https://github.com/pychess/pychess-variants/blob/cf23022da34ea12b57b23e5cc479fa580c4076e1/client/clock.ts): min/sec/decimal display and connecting state.
- [ChessgroundX 10.7.5 drag.ts](https://unpkg.com/chessgroundx@10.7.5/src/drag.ts): trusted-event restriction.
- [ChessgroundX API](https://github.com/gbtami/chessgroundx/blob/master/src/api.ts) and [board functions](https://github.com/gbtami/chessgroundx/blob/master/src/board.ts): selectSquare uses user selection and after callback; move uses base move. These master links explain the API; recheck the deployed version when upgrading.

## Remaining checks

Observed live: AI identity, standard setup, normal selection submission, optimistic versus accepted state, orientation, historical browsing, clock rendering, and terminal UI. Still required: promotion and Ctrl preference restoration, castling, Black play, reconnect, production userscript manager behavior, and full bot-controlled play. See the [implementation plan](superpowers/plans/2026-10-11-pychess-support.md).
