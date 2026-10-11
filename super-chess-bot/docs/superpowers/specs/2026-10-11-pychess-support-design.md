# PyChess AI Game Support Design

**Status:** Submitted for written-spec review
**Date:** 2026-10-11

## Goal

Let Super Chess Bot play a complete standard chess game against PyChess's built-in AI, using the existing local Stockfish engine and the visible board input path. The first supported setup is **Play with AI → CHESS → level 7**, with a 1+0 clock for the browser check. Existing Chess.com behavior remains available.

The bot must fail closed outside that setup: no automation in human games, unsupported variants, or games whose AI identity cannot be verified. The bot remains disabled until the user enables it.

## Approaches considered

1. **Duplicate the Chess.com flow for PyChess.** This gives the site its own code quickly, but duplicates lifecycle, recovery, engine scheduling, and move validation.
2. **General multi-site framework.** This makes every current and future site implement a broad provider system, adding more abstraction and refactoring than this target needs.
3. **A narrow site adapter around the shared bot core (selected).** Add only the provider boundary needed for PyChess position, lifecycle, board geometry, and input. Keep the existing worker, UCI client, history builder, search scheduler, panel, settings, and controller behavior shared. Keep Chess.com as the existing provider and avoid a general plugin framework.

## Architecture

Add a small typed `SiteAdapter` contract in `src/sites/` for reading a game snapshot, subscribing to position/lifecycle changes, and submitting a confirmed move. Put PyChess-specific selectors and page-state interpretation in `src/sites/pychess.ts`; wrap the current Chess.com behavior behind the same contract without changing its user-visible behavior. Select the adapter by host during startup. This is the minimum boundary for two sites, not a public plugin system.

The normalized snapshot contains game identity, full FEN, player color, side to move, orientation, terminal status, visible board element, and eligibility as a standard AI game. The controller, engine, and panel consume that snapshot and do not read either site's DOM or globals directly. Keep generic click/drag gesture code reusable; let the adapter supply its board geometry and authoritative position reader.

The live page exposes the Chessground controller as `window.cg`. Its state contains the current full FEN, side to move, and orientation. The adapter may read that state and the page's game metadata through `unsafeWindow`. `cg.getFen()` returns piece placement only, so it is not sufficient for turn, castling, or en-passant state. `cg.move()` is not used to submit a move: it can update the local board without following PyChess's user-move submission path.

Moves go through visible board input. The adapter resolves the rendered board and maps UCI squares to board coordinates using the live orientation. It reuses the current click/drag input and move-confirmation behavior where possible. The bot accepts a move only after the site state confirms the expected resulting position. Promotion must use the site's visible chooser. Legal move validation and search remain in the existing chessops and Stockfish paths.

The adapter supplies the lifecycle events the shared controller needs: position changed, game started/replaced, board unavailable, and game ended. For PyChess, observe the rendered board for move changes and retain the existing bounded controller reconciliation as a recovery path; do not add a fixed delay to the move loop. The controller retains ownership of cancellation, trusted human interruption, explicit resume/retry, and scheduling. A stale or unreadable PyChess state stops automation and reports a recoverable waiting/error state rather than guessing.

## Eligibility and safety

Automation is eligible only when all of these hold:

- The host is `pychess.org` and a live game board is present.
- The page identifies the variant as standard `chess`.
- The game metadata identifies the opponent as the built-in Fairy-Stockfish bot and exposes an AI level.
- The bot can determine the user's color, current full FEN, and whose turn it is.
- The selected board is visible and belongs to that game.

Missing or conflicting metadata means ineligible. The adapter never infers AI play from a board alone. Human games, variants, lobby screens, analysis boards, and rematch transitions with unknown state are rejected. Auto-rematch is outside this first pass.

## User-visible behavior

- The existing panel and settings are shared. Enable remains off by default; the current move budget, depth cap, ponder setting, and input method continue to apply.
- The panel reports waiting, analyzing, waiting for the AI, paused after trusted user input, game finished, or a specific recoverable site/engine error.
- Disabling the bot cancels pending search and move input. A trusted human move cancels pending input and pauses the bot using the existing resume behavior.
- The engine still prewarms before play. There is no page-thread search fallback and no added chess-rule implementation.

## Packaging and documentation

Add `https://www.pychess.org/*` to the userscript matches without removing the current Chess.com matches. Update the package description and README to describe both supported targets, their eligibility limits, installation, and browser verification. Update this project's `AGENTS.md` with the PyChess adapter boundary and the supported AI-only browser test. Do not add an engine, UI, schema, or browser automation dependency for this integration.

## Verification

### Automated

- Unit-test PyChess snapshot parsing, standard-variant and AI eligibility, user color, side to move, orientation, game-over detection, and missing/stale page state.
- Test that human games and nonstandard variants never become eligible.
- Test square-to-coordinate mapping for both orientations, move input cancellation, and confirmation against the resulting full FEN.
- Keep existing Chess.com adapter/controller/scheduler tests passing.
- Run `bun run check` and verify the production userscript includes both site matches and the pinned Stockfish resources.

### Browser acceptance

Use a dedicated Chromium session with the production bundle installed through a userscript manager. Start a standard CHESS level-7 game through PyChess **Play with AI**, use the 1+0 control, enable the bot, and verify it plays through game end. Record game result, plies, displayed AI level, clock at start and finish, and move timing separately from engine initialization. Also verify disabling during a search stops input and that an ineligible human/variant page stays untouched. Browser tests are not part of the move loop.

The existing minimum move budget is 100 ms. The browser report should distinguish engine search from browser scheduling and move acceptance. A single game is one observation and does not establish a rating or reliable sub-five-second whole-game clock use.

## Risks and limits

- PyChess's `window.cg`, body metadata, and Chessground markup are site internals, not a stable public integration API. Keep all such access in the adapter and fail closed when it changes.
- Synthetic board input may be handled differently from trusted user input. The browser acceptance run must confirm server-accepted moves, not merely local board animation.
- PyChess terms prohibit outside assistance where it is not allowed and describe bot use as conditional on explicit support. This design is limited to the built-in AI practice flow; it makes no claim that automation is permitted in human games.

## Research references

- [PyChess Play with AI](https://www.pychess.org/?any)
- [PyChess FAQ](https://www.pychess.org/faq)
- [PyChess Terms](https://www.pychess.org/terms)
- [PyChess Variants client round controller](https://github.com/pychess/pychess-variants/blob/master/client/round.ts)
- [PyChess Variants game controller](https://github.com/pychess/pychess-variants/blob/master/client/gameCtrl.ts)
