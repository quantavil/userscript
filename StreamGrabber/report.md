# Code Audit Report: StreamGrabber

| Severity | File/Module | Issue | Recommended Refactor |
| :--- | :--- | :--- | :--- |

| **Nitpick** | `src/core/download-engine.ts` | Manual `AbortSignal` handling in `SegmentFetcher.download` is verbose and potentially redundant if the underlying `getBin` can be refactored to accept signal directly. | Refactor `network.ts` to support `AbortSignal` natively in `getBin`. |

| **Major** | `src/main.ts` | Entry point serves as a "Global Mediator" with high coupling and manual wiring of dozens of callbacks. | Implement a unified Event Bus or Dependency Injection container to manage module interactions more cleanly. |
| **Major** | `src/messaging.ts` | Reliance on module-level global callbacks (`onPick`, `onProgressStart`, etc.) for cross-frame logic. | Refactor to use an event-driven architecture (e.g., `MessageBus` handles subscriptions directly without going through intermediate globals). |



