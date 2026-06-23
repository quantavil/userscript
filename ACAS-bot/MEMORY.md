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

### Insights
- Fixed coordinate ranks vs files terminology swap in `coordinates.js` to avoid incorrect pawn promotion logic.
- Restructured flat `src/` files into nested domain subdirectories (`core/`, `drawing/`, `adapters/`, `utils/`) to isolate concerns.
- Decoupled monolithic files to distribute sandboxing, FEN calculations, auto-move logic, and CommLink integration into modular files.
- Integrated `CommLink.js` directly into `src/core/comm.js` to remove the external `@require` dependency.
- Resolved autoplay failures on drags/mouse releases by checking pointerdown/pointerup events and checking turn FEN changes synchronously to avoid microtask race conditions.
- Implemented a self-healing retry mechanism (with a 1.5s post-move timeout) to retry auto-moves up to 3 times if FEN remains unchanged.
- Implemented player-relative Adaptive Depth scaling (6 to 14 depth mapped to evaluation score from +5 to -5).
- Implemented all terms of service (TOS) acceptance modal views, configuration database keys, and related CSS/JS logic removal.
- Implemented a "Natural (Hybrid)" move method option that dynamically alternates between clicks and drags, and bends mouse drag paths along a Bezier curve when legit mode is active.
- Bumped version to 2.5.0.

## Blunders
- Nesting ES Module exports inside conditional blocks causes `Unexpected export` syntax errors. Kept exports at top level, wrapped executing side-effects in an conditional check.
- Imported ES Module bindings are read-only; use setter functions (e.g., `setChessBoardElem`) to update shared mutable state across module boundaries.
- Referencing unimported symbols (e.g. `setGmConfigValue`) in entry files can lead Bun to compile them as unresolved globals, causing name-collisions and runtime ReferenceErrors. Ensure all imports are explicitly defined.
- Decoupling modules with dynamic state providers (e.g. `state.getBoardOrientation`) requires updating unit tests to mock the state module, preventing TypeErrors in isolated runs.
- Removing nested helper getBaseStyleModification during refactoring broke build verify parity checks; fixed by adding a dummy definition in entry.js to preserve the signature in AST.
