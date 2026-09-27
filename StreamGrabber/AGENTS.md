# AGENTS — StreamGrabber

## Overview
StreamGrabber is a high-performance, lightweight userscript designed for seamless media extraction across any webpage. It detects, captures, and downloads HLS streams (`.m3u8`), fragmented MP4 (`fMP4`), video blobs, and direct media files via a decoupled strategy network layer and an isolated Shadow DOM UI.

## Structure
```
StreamGrabber/
├── src/
│   ├── config.ts         # Settings, thresholds, segment filters, and namespace keys
│   ├── main.ts           # Userscript bootstrapping, iframe messaging, and lifecycle
│   ├── messaging.ts      # Cross-frame postMessage communications bridge
│   ├── state.ts          # Central reactive store for detected media, tasks, and progress
│   ├── core/             # Stream parsing, decryption (AES-128), and segment fetcher
│   ├── detection/        # XHR/Fetch hooking and DOM media scanners
│   ├── ui/               # Shadow DOM container, squircle FAB, and progress modals
│   ├── utils/            # Binary buffers, m3u8 parsers, URL resolvers, and sanitizers
│   └── types/            # TypeScript interfaces for media descriptors and tasks
├── test/                 # Unit and integration test suites (Vitest)
├── README.md             # End-user installation guide, features, and changelog
└── AGENTS.md             # Subproject architecture, constraints, and conventions
```

## Conventions & Architectural Constraints
- **Shadow DOM Isolation**: The UI MUST be rendered inside a detached Shadow DOM host (`#streamgrabber-root`) to guarantee 100% style encapsulation and eliminate hydration mismatch errors on React, Next.js, and modern SSR frameworks.
- **Strategy Pattern Network Layer**: Decouple binary segment extraction into dedicated strategies (Blob, Native, GM `GM_xmlhttpRequest`) with automatic 403 fallback handling.
- **Standardized Abort Handling**: Use native `AbortController` and `AbortSignal` across all concurrent chunk download promises to enable instant user pause/cancellation without orphaned network requests.
- **Cross-Frame Variant Support**: Aggregate streams across nested iframes using typed `postMessage` protocol, safely validating message format and origin before ingestion.
- **AES-128 Decryption**: Support encrypted HLS segments via pure Web Crypto API / custom decryptor without heavyweight external dependencies.
- **Zero Heavy Runtime**: Written in vanilla TypeScript with Vite 7 (`vite-plugin-monkey`). No virtual DOM frameworks.
- **Testing & Verification**:
  - Run unit tests: `bun test` or `bun run test`
  - Build userscript: `bun run build` (outputs to `dist/`)
