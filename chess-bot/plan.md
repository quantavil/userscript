
# Virtual Game State Architecture Implementation Plan

This plan outlines the refactoring of the chess bot to use a "Virtual Game State" managed locally. This replaces the dependency on Chess.com's internal `.game` object and sets the foundation for multi-platform support (e.g., Lichess).

## Goal
Decouple the bot from site-specific internal variables and site-specific DOM structures by maintaining a local "Source of Truth" board.

## Proposed Changes

### 1. State Management (`src/state.js`)
- Integrate a virtual board (e.g., using `chess.js`) to track the current position.
- Store game history locally.
- Sync the virtual board by scraping the move list on the page.

### 2. Platform Adapters (`src/adapters/`) [NEW]
- Create an abstraction layer for different chess sites.
- **base.js**: Define the interface for board scraping and move execution.
- **chesscom.js**: Chess.com specific selectors and logic.
- **lichess.js**: Lichess specific selectors (e.g., `<kwdb>`) and logic.

### 3. Controller Logic (`src/controller.js`)
- Detect the current platform and load the appropriate adapter.
- Sync the virtual state during each "tick" before analysis.

### 4. Board Interaction (`src/board.js`)
- Delegate physical move simulation (clicking/dragging) and promotion selection to the active adapter.

### 4. Chess 960 (Fischer Random) Support
- **Engine Logic**: Generalize castling move generation. Remove hardcoded e1/e8 or g1/c1 checks.
- **X-FEN Support**: Update the FEN parser to handle Chess 960 specific castling rights (which track specific Rooks).
- **UCI Move Generation**: Ensure castling moves are formatted correctly for Chess 960 (some engines/sites use `Ka1xh1` or similar logic for castling).

### 5. Auto-Rematch Stability Fixes
- **Double-Check Logic**: Instead of just checking for the modal, verify the internal game state via `getGame().isGameOver()` where possible.
- **Modal Stability**: Add a "Confirmation Delay." The remix/next-game button will only be clicked if the Game Over state remains stable for 2-3 seconds, preventing accidental triggers during UI transitions or lag.
- **Session Awareness**: Ensure the "Detected Game Over" state is tied to the current unique Game ID to prevent logic from reacting to modals left over from previous matches.

### 6. Local Only Mode
- **Bypass Cloud API**: Add a toggle to skip all external API calls (`fetchEngineData`), using only the built-in `LocalEngine` for analysis.
- **Privacy & Performance**: This ensures zero external network traffic for move calculation, reducing detection risk and providing consistent (though slightly lower depth) response times.
- **UI Toggle**: Add a "Local Only" checkbox to the control panel settings.

### 7. Local Engine Optimization
If LocalEngine supports it, initialize it once per game and use makeMove(uci) to update its internal board, rather than reloading FEN. If the class doesn't support that, you are stuck, but be aware the benchmark is biased against Local.

## Benefits
- **Resilience**: Bot continues to work even if sites rename internal variables.
- **Stealth**: No touching of internal site objects that anti-cheat systems might monitor.
- **Privacy**: Local Only Mode ensures no board data is sent to external servers.
- **Portability**: Easy to add support for other sites (Lichess, Chess24, etc.).
- **Variety**: Full support for Chess 960 games.
- **Reliability**: Auto-rematch will no longer trigger prematurely or during an active game.
