# Audit Report: chess-bot

| Severity | File/Module | Issue | Recommended Refactor |
| :--- | :--- | :--- | :--- |
| **Major** | `src/index.js` | Overlapping timers and intervals (`tickTimer`, `gameStartInterval`, `gameEndInterval`, `BoardMoveObserver`) create race condition risks and inconsistent state sync. | Centralize loop and state management into a single `Controller` class or a robust state machine. Replace multiple intervals with a unified event-driven dispatcher. |
| **Major** | `src/engine.js` | Performance bottlenecks: `ttKey()` uses expensive `this.board.join(',')` (O(N) string allocation) and `evaluate()` performs full board scans in search. | Implement **Zobrist hashing** for O(1) transposition table keys. Optimize `evaluate()` by implementing **incremental updates** or piece-lists to avoid repeated board traversal. |
| **Major** | `src/board.js` | Polling inefficiency: `waitForFenChange` uses `requestAnimationFrame` for polling/searching DOM changes, which is less efficient than mutation events. | Replace frame-based polling in `waitForFenChange` with a `Promise`-based listener that resolves via the existing `MutationObserver` in `index.js` or `board.js`. |
| **Nitpick** | `src/engine.js` | `ttStore` uses a simple FIFO eviction policy (deleting `this.cache.keys().next().value`), which can evict high-value deep search entries. | Implement **Replacement-Always** or **Depth-Preferred** eviction policies to maximize transposition table hit rate for deep search results. |
| **Nitpick** | `src/utils.js` | `qs` and `qsa` are redundant wrappers around `document.querySelector` that offer no additional safety or error handling. | Either remove these wrappers in favor of standard DOM methods or enhance them with automatic error detection/nullable-guards. |
