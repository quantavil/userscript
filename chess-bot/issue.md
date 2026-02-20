# Comprehensive Issue Report: Chess Bot Stability & Logic

This document details all technical issues, logic flaws, and architectural "rot" identified during the debugging and enhancement sessions.

---

## 1. Critical Stability Issues (Resolved)

### 1.1 `ReferenceError: BotState is not defined`
- **Location**: `src/engine/analysis.js`, `src/board.js`, `src/controller.js`
- **Description**: The bot would crash completely during move analysis or execution because it attempted to access `BotState` (for debug logging) without importing it first. 
- **Impact**: Full paralysis. Once this error occurred, the current processing thread died, and the bot stopped making moves.
- **Fix**: Standardized imports across all modules to ensure `BotState` is always available for tracing.

### 1.2 `ReferenceError: now is not defined`
- **Location**: `src/controller.js` in `checkFailsafe()`
- **Description**: The failsafe mechanism intended to "unstick" the bot actually caused a crash itself because it used a variable `now` that wasn't defined in that scope.
- **Impact**: The bot could never recover from a "stuck" state; attempting to reset would crash the controller.
- **Fix**: Replaced `now` with `Date.now()`.

### 1.3 `(none)` Move Execution
- **Location**: `src/engine/analysis.js` and `src/engine/scheduler.js`
- **Description**: In certain positions (like checkmate or stalemate), the local engine returns `bestmove: (none)`. The bot previously tried to parse this as a valid UCI move.
- **Impact**: Caused errors in UCI parsing (e.g., `substring` errors) and sent invalid commands to the board.
- **Fix**: Added strict guards to ignore `(none)` and update the UI status to "No valid move found".

### 1.4 Engine Failure on Valid FENs (In Progress)
- **Location**: `src/engine/local-engine.js`, `src/engine/search.js`
- **Description**: The local engine returns `success: false` and `bestmove: (none)` even in standard opening/middle-game positions where legal moves clearly exist.
- **Example FEN**: `rn1q1rk1/pppbbppp/3p1n2/8/4P3/3B1N2/PPP2PPP/RNBQK2R b KQ - 9 8`
- **Impact**: The bot stops moving entirely during a game, even though the controller is still "Active".
- **Current Theory**: This appears to be a failure in the internal move generator or the FEN loader within the local engine, leading to an empty move list even when the board is valid.

---

## 2. Logic & Search Flaws (Identified/Improved)

### 2.1 Premove Unavailability Blindness
- **Issue**: The bot would often log `Premove unavailable` without explanation, leaving the user wondering if it was a bug or a deliberate choice.
- **Details**: Reasons were buried in internal logic:
    - No Principal Variation (PV) found in the current search.
    - PV move didn't match the current depth requirement.
    - Search was blocked by an ongoing opponent-turn analysis.
- **Improvement**: Added detailed "Reasoning" logs to the debug console to explain exactly why a premove was skipped.

### 2.2 Turn Synchronization Errors
- **Issue**: `board.js` would occasionally attempt to make a move while it was still the opponent's turn, or after the FEN had changed but before the board had updated.
- **Details**: Race conditions between the analysis returning and the DOM updating.
- **Improvement**: Enhanced `executeMove` with strict FEN-mismatch and Turn-check guards that log specific reasons during cancellations.

---

## 3. UI & UX Issues

### 3.1 Silent Failures
- **Issue**: The bot would stop working, and the only way to know why was to open the browser dev tools (F12).
- **Improvement**: Implemented the **Debug Mode** toggle and integrated a more verbose "Status Info" display to surface internal states (like "Blocked", "FEN Mismatch", etc.) directly to the user.

### 3.2 Improper Shutdown
- **Issue**: The controller would sometimes stop without a clear reason (logs showed "Controller stopped").
- **Improvement**: Added **Traceable Stops**. Now, every `stop()` call must provide a reason string, and in Debug Mode, it prints a full stack trace to identify the trigger (e.g., a DOM mutation, a manual toggle, or a game-end event).

---

## 4. Work in Progress / Future Considerations

- **Local Engine Edge Cases**: While `(none)` is handled, we still need to monitor if the engine ever returns `success: false` for legal positions.
- **Mutation Observer Noise**: High-frequency board updates can sometimes flood the `tick()` loop. Redundant `tick()` calls are currently handled by `debounce` and FEN checks, but further optimization may be needed for "Bullet" games.

# Technical Analysis: Engine "No Move" Failure (Return (none))

## Issue Description
Users reported that GabiBot would occasionally stop playing moves. The console logs showed the engine returning `{ success: false, bestmove: '(none)', evaluation: 0 }`.

## Diagnostic Findings
Deep diagnostic logging revealed the following state during a failure:
- **FEN**: Standard game position (e.g., after `f4g3`)
- **Nodes searched**: ~12,289
- **Depth reached**: 0
- **Stopped**: `true`
- **Time Limit**: ~209ms

This indicates that the search was forced to abort before completing even a single iteration of depth.

## Root Cause Analysis
The engine uses **Iterative Deepening** in `searchRoot`:
1. It starts searching at `depth = 1`.
2. Inside the `negamax` function, it periodically checks (`every 4096 nodes`) if the `timeLimit` has been exceeded.
3. If the user's computer or the browser's main thread is under heavy load, searching the first ~12,000 nodes can take longer than the allotted think time (e.g., 200ms).
4. When the `timeLimit` is exceeded, `this.stopped` is set to `true`, and `negamax` returns `0` immediately.
5. Because the search aborted during `depth = 1`, the PV (Principal Variation) line was never populated.
6. `searchRoot` therefore had `bestMove = null` and returned an unsuccessful result.

## Fix Implementation

### 1. Mandatory Fallback Move
In `src/engine/search.js`, the `searchRoot` function now performs a quick legal move generation *before* starting the iterative search.
- It initializes `bestMove` with the first available legal move.
- This creates a "**Safety Net**": if the search is aborted at any point (even at Depth 1, Node 1), the engine will always return a valid legal move instead of crashing or returning `(none)`.

### 2. isAttacked Optimization
To reduce the frequency of time-limit aborts, the `isAttacked` function in `src/engine/local-engine.js` was optimized:
- It now checks the attacking side's piece counts.
- If the attacker has no Rooks or Queens, it skips the entire vertical/horizontal sliding piece scan.
- If the attacker has no Bishops or Queens, it skips the entire diagonal sliding piece scan.
- This significantly reduces CPU cycles spent in legality checks and evaluation, especially in endgames.

## Conclusion
The bot is now robust against performance spikes. Even if the search is unable to find the *best* move within the time limit, it will always play a *legal* move to keep the game going.
