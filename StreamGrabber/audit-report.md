# StreamGrabber Codebase Audit Verification & Repair Plan

**Date:** 2026-02-02
**Status:** Verified & Partial Fixes Applied

## Executive Summary
This report tracks the status of identified architectural and code quality issues.
**Progress:** 1 issue has been fixed since the initial audit. 10 issues remain outstanding.

The codebase suffers from high coupling between UI and logic, "God Functions" that handle too many responsibilities, and manual implementations of standard browser features.

## Detailed Status & Fix Plan

| Severity | File/Module | Issue & Status | Potential Fix / Recommendation |
| :--- | :--- | :--- | :--- |
| **Critical** | `src/core/download-engine.ts` | **God Function** (`downloadSegments`)<br>❌ **OPEN** (Verified)<br>Function is 370+ lines mixing network, scheduling, UI updates, and error handling. | **Refactor into Class:** Split `downloadSegments` into a `SegmentDownloader` class. Extract methods for `fetch`, `retry`, `progressUpdate`, and `write`. Decouple UI by emitting events instead of calling `card.update()` directly. |
| **Major** | `src/core/download.ts` | **Mixed Concerns**<br>❌ **OPEN** (Verified)<br>`downloadHls` directly instantiates UI components (`createCard`) and handles user prompts (`pickVariant`). | **Inversion of Control:** Pass a `DownloadDelegate` interface to `downloadHls` that handles UI interactions. The core logic should request a variant decision via an async method on the delegate, not implementing the prompt itself. |
| **Major** | `src/state.ts` | **Manual Reactivity**<br>❌ **OPEN** (Verified)<br>Uses manual `setCallbacks` and `notifyUpdate`. Boilerplate heavy. | **Reactive Store:** Replace with Svelte Stores (`writable`, `derived`) or a lightweight signal library (`@preact/signals-core`). This would automate UI reflows when state changes. |
| **Major** | `src/main.ts` | **Proxy Complexity**<br>❌ **OPEN** (Verified)<br>Manual "proxy cards" and `postMessage` juggling to sync UI across frames. | **Unified Message Bus:** Implement a strictly typed `MessageBus` class that abstracts `postMessage`. Create a `RemoteProgressCard` that implements the standard `ProgressCard` interface but internally sends messages over the bus. |
| **Major** | `src/core/file-writer.ts` | **Memory Leak Risk**<br>❌ **OPEN** (Verified)<br>Buffer entire file in `Uint8Array[]` (RAM) before creating Blob. | **Stream Processing:** Use `FileSystemWritableFileStream` (native system) where possible. For Blobs, enforce a strict size limit or implement "paged" chunking if aiming to support large files without crashing tabs (though browser constraints exist). |
| **Major** | `src/messaging.ts` | **Fragile RPC**<br>❌ **OPEN** (Verified)<br>Giant switch-case statement for untyped payloads. | **Command Pattern:** Define a `Command` map and use a generic type-safe dispatcher. e.g., `dispatch<T>(type: T, payload: Payload<T>)`. Remove the giant switch in favor of a handler registry. |
| **Major** | `src/detection/index.ts` | **Circular Dependency**<br>⚠️ **PARTIAL**<br>Cycle (Detection -> State -> Network) is mitigated by runtime injection but structurally unsafe. | **Dependency Injection:** Fully move to an `App` or `Context` object that is passed down, rather than modules importing singleton instances of each other. or use an Event Bus for loose coupling. |
| **Nitpick** | `src/core/crypto.ts` | **Manual Hex Parsing**<br>✅ **FIXED**<br>Replaced loop with safe `match` and `Uint8Array`. | **(Resolved)**: Implemented concise standard parsing. |
| **Nitpick** | `src/state.ts` | **Tight Coupling** (`trim`)<br>❌ **OPEN** (Verified)<br>`trim()` deletes directly from `blobRegistry`. | **Event Listener:** `blobRegistry` should expose a `prune()` method or listen for an event `STATE_TRIM`. State shouldn't reach into Network internals. |
| **Nitpick** | `src/utils.ts` | **Reinventing Wheels**<br>✅ **FIXED**<br>`parseHeaders` refactored to use standard clean split/reduce. | **(Resolved)**: Simplified implementation to robustly handle CRLF without bespoke parsing loops. |
| **Nitpick** | `src/ui/styles.ts` | **CSS-in-JS String**<br>✅ **FIXED**<br>Extracted giant string to `src/ui/main.css`. | **(Resolved)**: Validation: Check that `vite.config.ts` handles inline CSS imports correctly (standard in Vite). |
