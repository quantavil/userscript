# Code Audit Report: StreamGrabber

| Severity | File/Module | Issue | Recommended Refactor |
| :--- | :--- | :--- | :--- |

| **Nitpick** | `src/core/download-engine.ts` | Manual `AbortSignal` handling in `SegmentFetcher.download` is verbose and potentially redundant if the underlying `getBin` can be refactored to accept signal directly. | Refactor `network.ts` to support `AbortSignal` natively in `getBin`. |
| **Major** | `src/core/download.ts` | `downloadHls` duplicates enrichment logic (parsing variants, calculating duration/size) that should be handled by `enrichment.ts` or a shared manifest analyzer. | Centralize manifest analysis and enrichment logic to avoid duplication and ensure consistency between the UI list and the download process. |
| **Major** | `src/core/enrichment.ts` | Reliance on global callbacks (`_onEnrichComplete`, `_getItemFn`) for communication. | Use an event emitter or a proper state observer pattern to decouple enrichment from other modules. |

| **Major** | `src/main.ts` | Entry point serves as a "Global Mediator" with high coupling and manual wiring of dozens of callbacks. | Implement a unified Event Bus or Dependency Injection container to manage module interactions more cleanly. |
| **Major** | `src/messaging.ts` | Reliance on module-level global callbacks (`onPick`, `onProgressStart`, etc.) for cross-frame logic. | Refactor to use an event-driven architecture (e.g., `MessageBus` handles subscriptions directly without going through intermediate globals). |



