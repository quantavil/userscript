# Code Audit Report: StreamGrabber

| Severity | File/Module | Issue | Recommended Refactor | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Nitpick** | `src/core/download-engine.ts` | Manual `AbortSignal` handling in `SegmentFetcher.download` is verbose. | Refactor `network.ts` to support `AbortSignal` natively. | **Already Fixed** (Code supports signal) |
| **Major** | `src/main.ts` | Entry point serves as a "Global Mediator" with high coupling. | Implement a unified Event Bus. | **Fixed** (Refactored to MessageBus) |
| **Major** | `src/messaging.ts` | Reliance on module-level global callbacks. | Refactor to use an event-driven architecture. | **Fixed** (Removed callbacks) |
