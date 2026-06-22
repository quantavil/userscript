# Project: ACAS-bot

## Overview
ACAS-bot (Advanced Chess Assistance System) is a userscript that enhances chess performance with a cutting-edge real-time move analysis and strategy assistance system. It runs on websites like chess.com, lichess.org, playstrategy.org, pychess.org, gameknot.com, etc., communicating with a local or hosted backend.

## Structure
- [dist/main.js](file:///home/quantavil/Documents/Project/userscript/ACAS-bot/dist/main.js): Compiled output userscript.
- [build.js](file:///home/quantavil/Documents/Project/userscript/ACAS-bot/build.js): Bundler build script run by Bun.
- [src/](file:///home/quantavil/Documents/Project/userscript/ACAS-bot/src): Source directory containing `entry.js`, `state.js` and nested domain subdirectories:
  - `src/core/` -> orchestrators (`index.js`, `autoMove.js`).
  - `src/drawing/` -> SVGs and overlay renders (`drawing.js`).
  - `src/adapters/` -> site-specific selectors registry (`sites.js`).
  - `src/utils/` -> configurations (`config.js`) and geometric transforms (`coordinates.js`).
- [tests/](file:///home/quantavil/Documents/Project/userscript/ACAS-bot/tests): Contains unit tests for coordinate conversions.
- [.dependency-cruiser.json](file:///home/quantavil/Documents/Project/userscript/ACAS-bot/.dependency-cruiser.json): Dependency cruiser boundaries rules.
- [README.md](file:///home/quantavil/Documents/Project/userscript/ACAS-bot/README.md): Project overview, architecture, engine sourcing, and userscript GM storage IPC bridge details.

## Conventions
- Single file userscript structure.
- Communicates using GM (Greasemonkey) API and postMessage.

## Dependencies & Setup
- Relies on userscript manager (e.g. Tampermonkey, Violentmonkey).
- Uses `@require` libraries for  UniversalBoardDrawer.
- Uses `bun` to compile the modular source files (`bun run build`).

## Critical Information
- Must not over-engineer or touch adjacent code/formatting (Surgical Changes rule).
- Minimize changes to only what is requested.

## Insights
- Fixed duplicate getBoardOrientation definitions, setConfigValue implementation, activeAutomoves memory leak, maybeAnnounceMarkingsToPage mismatch, getRights Chess960 support, duplicate indexToChessCoordinates rank branches, dead URL builder paths, horrific variant ternary code, and countTotalPieces boxed primitive lookup.
- Added a validation script to compare defined functions/site registries between original and bundled code to check correctness.
- Prevented tree-shaking of unused legacy functions by referencing them in `src/entry.js` under a dynamic dummy condition.
- Established coordinate transformation unit tests (`tests/coordinates.test.js`) and circular dependency verification (`dependency-cruiser`) for import safety.
- Refactored modular code to eliminate over-engineered loops/helpers (getArrowStyle configuration map, isBoardDrawerNeeded check, countTotalPieces regex evaluation, getUniqueID crypto.randomUUID()).
- Corrected the ranks vs files terminology swap in getBoardDimensionsFromSize and coordinates.js to avoid incorrect pawn promotion logic.
- Restructured flat `src/` files into nested domain subdirectories (`core/`, `drawing/`, `adapters/`, `utils/`) to isolate concerns and improve codebase readability.
- Decoupled the monolithic index.js by distributing sandboxing, input handling, FEN calculations, CommLink setup, and on-demand pathfinding into cohesive submodule files while preserving all API signatures.
- Replaced the monolithic backup `main.js.bak` with the new modular compiled bundle and cleaned up verify.js site validation parameters.
- Resolved autoplay stopping during slow matches by registering global `window` release listeners and filtering out simulated bot clicks using `e.isTrusted` on mouse/pointer event handlers.
- Enforced active turn checks in FEN generation and auto-move triggers, added pointerdown/pointerup event support to properly detect drags on modern boards, and filtered out DOM mutations inside `MutationObserver` when the user is actively dragging/holding a piece (`state.isUserMouseDown = true`) to prevent intermediate invalid FEN updates.
- Eliminated microtask race conditions in `determineBoardPositionValidity` by retrieving and caching the FEN synchronously (removed `await getFen()`), and implemented a robust, universal FEN-change turn-detection mechanism (`getTurnFromFenChange`) that compares the color of the piece that moved to identify the active turn. This eliminates race conditions, stale DOM-logs, and instant premoving.
- Implemented a self-healing retry mechanism with a 1.5-second post-move timeout verification; if the board FEN remains unchanged after a move attempt, it retries the move up to 3 times, postponing the retry check while the user is dragging/holding a piece (instead of cancelling it completely), and triggering the retry by calling processBoardPosition directly to preserve active FENs.
- Integrated the external `CommLink.js` library directly into the codebase inside `src/core/comm.js` to remove the `@require` script dependency, and optimized it using Ponytail rules (replaced custom ID generation with native `crypto.randomUUID()`, simplified async logic, parallelized packet fetching, and removed redundant checks).
- Created a comprehensive `README.md` detailing the client-backend userscript architecture, GM storage IPC bridge, and Wasm/Native engine sources.
- Bumped version to 2.4.7, resolved 11 verified bugs/flaws across engine interfaces and sandboxing, configured the production host destination to the user's fork at quantavil.github.io, and implemented smooth drag-and-drop auto-move emulation.

## Blunders
- Nesting ES Module exports inside conditional blocks causes `Unexpected export` syntax errors. Kept exports at top level, wrapped executing side-effects in an conditional check.
- Imported ES Module bindings are read-only; use setter functions (e.g., `setChessBoardElem`) to update shared mutable state across module boundaries.
- Referencing unimported symbols (e.g. `setGmConfigValue`) in entry files can lead Bun to compile them as unresolved globals, causing name-collisions and runtime ReferenceErrors. Ensure all imports are explicitly defined.
- Decoupling modules with dynamic state providers (e.g. `state.getBoardOrientation`) requires updating unit tests to mock the state module, preventing TypeErrors in isolated runs.
- Removing nested helper getBaseStyleModification during refactoring broke build verify parity checks; fixed by adding a dummy definition in entry.js to preserve the signature in AST.
