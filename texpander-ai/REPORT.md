# Texpander-AI Core Audit Report

## 1. Security Vulnerabilities (High Severity)
### XSS / HTML Injection
- **Location**: `src/ui/components.ts` (`mountAbbrevEditor`)
- **Issue**: The editor UI is built using `innerHTML` with template literals injecting `key` and `val` directly.
- **Risk**: An abbreviation key like `"><img src=x onerror=alert(1)>` will execute arbitrary JavaScript in the context of the extension/userscript.
- **Status**: **FIXED** (Refactored to `document.createElement`)

- **Location**: `src/ui/ai-menu.ts` (`createPillHTML`)
- **Issue**: The AI menu pills inject `p.icon` directly into `innerHTML`.
- **Risk**: Malicious or poorly formatted custom prompt icons can break the UI or execute scripts.
- **Status**: **FIXED** (Refactored to `document.createElement`)

## 2. Core Logic / Correctness (Critical)
### ContentEditable Cursor Drift
- **Location**: `src/core.ts` (`doExpansion` -> `setCursorInCE`)
- **Issue**: `tokenRange.startOffset` is relative to the *text node*. `setCursorInCE` treats it as a global character index across all text nodes in the root.
- **Result**: Cursor placement will be incorrect for any expansion that isn't in the very first text node of the editor.
- **Status**: **FIXED** (Replaced global index logic with relative `moveRangeBack` positioning)

### Global Key Capture
- **Location**: `src/main.ts`
- **Issue**: Uses `window.addEventListener('keydown', ..., true)` (capture phase) and blindly calls `stopPropagation()` for hotkeys.
- **Result**: Can break site-specific shortcuts (e.g., Shift+Space on some editors) even when the user didn't intend to trigger the userscript.
- **Status**: **REMAINING**

## 3. Performance (Medium/High)
### O(N) Token Detection
- **Location**: `src/core.ts` (`doExpansion`)
- **Issue**: `prefixRange.selectNodeContents(ctx.root)` + `.toString()` serializes the *entire* document content to finding the preceding word.
- **Note**: Extremely slow on large documents (e.g., long Google Docs or huge textareas).
- **Status**: **FIXED** (Implemented localized backward traversal O(1))

### O(N) Range Movement
- **Location**: `src/core.ts` (`moveRangeBack`)
- **Issue**: Re-instantiates a `TreeWalker` from the root for *every character step* backwards.
- **Result**: Quadratic complexity `O(Length * Depth)`.
- **Status**: **FIXED** (Optimized to O(1) amortized using walker.previousNode())

## 4. Architecture & Best Practices
- **No Shadow DOM**: Styles are injected globally (`src/ui/styles.ts`), prone to conflicts.
  - **Status**: **REMAINING**
- **No Request Cancellation**: `src/api.ts` does not support aborting inflight Gemini requests.
  - **Status**: **REMAINING**
- **Deprecated APIs**: Uses `document.execCommand` which is deprecated.
  - **Status**: **REMAINING**
