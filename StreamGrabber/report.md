# Code Audit Report: StreamGrabber

| Severity | File/Module | Issue | Recommended Refactor |
| :--- | :--- | :--- | :--- |

| **Nitpick** | `src/core/download-engine.ts` | Manual `AbortSignal` handling in `SegmentFetcher.download` is verbose and potentially redundant if the underlying `getBin` can be refactored to accept signal directly. | Refactor `network.ts` to support `AbortSignal` natively in `getBin`. |
| **Major** | `src/core/download.ts` | `downloadHls` duplicates enrichment logic (parsing variants, calculating duration/size) that should be handled by `enrichment.ts` or a shared manifest analyzer. | Centralize manifest analysis and enrichment logic to avoid duplication and ensure consistency between the UI list and the download process. |
| **Major** | `src/core/file-writer.ts` | OPFS temp file cleanup is based on a fragile `setTimeout`. Stale files could persist in OPFS if the script is interrupted. | Implement a robust cleanup mechanism that tracks active OPFS temp files and prunes them on initialization or use a more deterministic closure. |
| **Major** | `src/core/enrichment.ts` | Reliance on global callbacks (`_onEnrichComplete`, `_getItemFn`) for communication. | Use an event emitter or a proper state observer pattern to decouple enrichment from other modules. |
| **Nitpick** | `src/utils/misc-utils.ts` | Manual whitelist `SERIALIZABLE_KEYS` for cross-frame transfer is prone to maintenance errors. | Use a more automated serialization approach or ensure types are strictly checked against the whitelist. |
| **Major** | `src/core/network.ts` | `getBin` combines three different fetching strategies (Blob, Native, GM) and manual stream reading, resulting in high cyclomatic complexity. | Decompose `getBin` into dedicated Strategy classes or functions for each fetching method. |
| **Major** | `src/core/network.ts` | Use of non-standard `AbortablePromise`. | Transition to standard `AbortController` and `AbortSignal` for all network request cancellation. |
| **Major** | `src/main.ts` | Entry point serves as a "Global Mediator" with high coupling and manual wiring of dozens of callbacks. | Implement a unified Event Bus or Dependency Injection container to manage module interactions more cleanly. |
| **Major** | `src/messaging.ts` | Reliance on module-level global callbacks (`onPick`, `onProgressStart`, etc.) for cross-frame logic. | Refactor to use an event-driven architecture (e.g., `MessageBus` handles subscriptions directly without going through intermediate globals). |



