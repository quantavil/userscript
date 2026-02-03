# StreamGrabber Code Audit Report

| Severity | File/Module | Issue | Recommended Refactor |
| :--- | :--- | :--- | :--- |
| **Nitpick** | `src/state.ts` | Repeated call to `this.items.clear()` in `clear()` method. | Remove redundant line 165. |
| **Nitpick** | `src/state.ts` | Direct use of `GM_getValue` in constructor. | Delegate to `config.ts` or a storage utility for better testability. |
| **Nitpick** | `src/core/download-engine.ts` | Excessive whitespace and empty constructor braces. | Standardize formatting and remove empty braces if possible. |
| **Major** | `src/main.ts` | Monolithic `setupMessageHandlers` function mixes top and child frame logic. | Split into `setupTopHandlers` and `setupChildHandlers`. |
| **Major** | `src/utils/*` | Inconsistent indentation (4 spaces) vs project standard (2 spaces). | Reformat all utility files to 2nd-space indentation for consistency. |
| **Critical** | `src/utils/filename-utils.ts` | `generateFilename` uses `document.title` as a fallback, which is unreliable in iframes. | Pass the detected page title from the detection context instead. |
| **Nitpick** | `src/ui/index.ts` | `getFilteredItems` contains redundant manual filtering logic. | Use a single source of truth for filtering, preferably in `state.ts`. |
| **Major** | `src/ui/index.ts` | UI rendering re-creates significant portions of the DOM on every update. | Optimize `render` function to use partial updates or simple diffing for large lists. |
| **Major** | `src/detection/hooks.ts` | `Response.text` hook creates a `new Promise` wrapper, adding performance overhead. | Use a more direct hijacking method if possible, or ensure it only triggers for relevant URLs. |
| **Nitpick** | `src/detection/hooks.ts` | Arbitrary 5s interval for cleaning `recentlyRevoked` set. | Use a more event-driven approach or link to the memory management of `state.ts`. |
| **Major** | `src/core/network.ts` | `fetchText` and `fetchHead` lack `AbortSignal` support. | Refactor to support propagation of cancellation to avoid silent background work. |
| **Major** | `src/core/enrichment.ts` | Enrichment timeout does not abort underlying network requests. | Link the `AbortController` from the timeout to the `getText` call. |
| **Fixed** | `src/core/crypto.ts` | `aesCbcDecrypt` performs `subtle.importKey` for every segment. | Key caching implemented. |
| **Major** | `src/core/message-bus.ts` | `postMessage` uses `*` wildcard origin and lacks message origin verification. | Implement a script-specific token or check `ev.origin` where possible. |

