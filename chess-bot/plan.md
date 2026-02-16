# Super Chess Bot - Evolution Plan

## ✅ Completed Critical Fixes
- **Transposition Table (TT) Learning**: Fixed the critical performance bug where the TT was wiped every search. The engine now learns during the game.
- **Smart Reset**: Implemented `resetEngine` in `controller.js` via `api.js` to clear engine memory only between matches.

## 🛠 Active Phase: Virtual Game State Architecture
Decouple the bot from site-specific internal variables and site-specific DOM structures by introducing a `BoardAdapter` interface.

### 1. Platform Adapters (`src/adapters/`) [IN PROGRESS]
- **interface.js**: [DONE] Base class defining the contract for site-specific logic (FEN, Turn detection, Move execution).
- **chesscom.js**: [DONE] Chess.com specific implementation using current DOM selectors.
- **lichess.js**: [TODO] Future adapter for Lichess support.

### 2. State Management & Virtual Board [NEXT]
- **virtual-board.js**: [NEW] Create a manager in `src/managers/` that uses `chess.js` to track the state.
- **Sync Logic**: Use the adapter's `onUpdate` to keep the virtual board in sync with the actual page.

### 3. Controller Logic (`src/controller.js`)
- [ ] Migrate `BotController` to use the `VirtualBoard` and `BoardAdapter` instead of direct `getGame()` calls.

## 🚀 Future Roadmap

### 1. Chess 960 (Fischer Random) Support
- **Engine Logic**: Generalize castling move generation. 
- **X-FEN Support**: Handle Chess 960 specific castling rights.

### 2. Auto-Rematch Stability Fixes
- **Double-Check Logic**: Verify internal game state via `isGameOver()` where possible.
- **Modal Stability**: Add a "Confirmation Delay" of 2-3 seconds.

### 3. Local Only Mode
- **Bypass Cloud API**: Toggle to skip all external API calls, using only fixed-depth `LocalEngine`.
- **UI Toggle**: Add "Local Only" checkbox to control panel.

### 4. Local Engine Optimization
- Use `makeMove(uci)` to update the internal engine state instead of reloading FEN every tick for maximum speed.

## Benefits
- **Resilience**: Bot survives site UI updates.
- **Stealth**: No touching of internal site objects like `.game`.
- **Portability**: Easy to add support for other sites (Lichess, etc.).
- **Privacy**: Local Only Mode ensures data stays on your machine.
