# StreamGrabber Codebase Audit Verification & Repair Plan

**Date:** 2026-02-02
**Status:** Verified & Partial Fixes Applied

## Executive Summary
This report tracks the status of identified architectural and code quality issues.
**Progress:** 4 issues have been fixed since the initial audit. 7 issues remain outstanding.

The codebase suffers from high coupling between UI and logic, "God Functions" that handle too many responsibilities, and manual implementations of standard browser features.

## Detailed Status & Fix Plan

| Severity | File/Module | Issue & Status | Potential Fix / Recommendation |
| :--- | :--- | :--- | :--- |
| **Critical** | `src/core/download-engine.ts` | **God Function** (`downloadSegments`)<br>❌ **OPEN** (Verified)<br>Function is 370+ lines mixing network, scheduling, UI updates, and error handling. | **Refactor into Class:** Split `downloadSegments` into a `SegmentDownloader` class. Extract methods for `fetch`, `retry`, `progressUpdate`, and `write`. Decouple UI by emitting events instead of calling `card.update()` directly. |
| **Major** | `src/main.ts` | **Proxy Complexity**<br>❌ **OPEN** (Verified)<br>Manual "proxy cards" and `postMessage` juggling to sync UI across frames. | **Unified Message Bus:** Implement a strictly typed `MessageBus` class that abstracts `postMessage`. Create a `RemoteProgressCard` that implements the standard `ProgressCard` interface but internally sends messages over the bus. |

