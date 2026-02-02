# StreamGrabber

StreamGrabber is a powerful userscript designed to detect and grab media streams (like HLS) from various web pages.

## Project Structure

The codebase is organized into logical modules to maintain separation of concerns between core logic, media detection, and user interface.

```text
StreamGrabber/
├── src/
│   ├── core/           # Core media processing and business logic
│   │   ├── network.ts         # Network request interception and handling
│   │   ├── crypto.ts          # Cryptographic utilities for decryption
│   │   ├── parser.ts          # Manifest and stream parsing
│   │   ├── enrichment.ts      # Metadata enrichment for detected streams
│   │   ├── download-engine.ts # Segment fetching and scheduling
│   │   ├── download.ts        # High-level download orchestration
│   │   └── file-writer.ts     # Chunk-to-file assembly (Blob handling)
│   ├── detection/      # Stream detection and scanning
│   │   ├── hooks.ts           # Browser API hooks (fetch/XHR)
│   │   ├── video-scanner.ts   # DOM scanning for video elements
│   │   └── index.ts           # Detection module entry point
│   ├── ui/             # User Interface components and styles
│   │   ├── components.ts      # Imperative DOM components
│   │   ├── icons.ts           # SVG icons collection
│   │   ├── styles.ts          # Dynamic CSS injection
│   │   └── index.ts           # UI module entry point
│   ├── types/          # TypeScript type definitions and interfaces
│   ├── main.ts         # Userscript entry point and orchestration
│   ├── messaging.ts    # Cross-frame/Tab communication layer
│   ├── state.ts        # Global state and persistence
│   ├── config.ts       # Application settings and keys
│   └── utils.ts        # Shared helper functions
├── consolidate_code.py # Code/Audit consolidation script
├── audit-report.md     # Latest codebase audit report
└── README.md           # This file
```

## Specialized Analysis

To facilitate AI-driven audits, the `consolidate_code.py` script splits the project into specialized context files:

- **UI**: `ui_code.txt` + `ui_audit.txt`
- **Logic**: `logic_code.txt` + `logic_audit.txt`
- **Config**: `config_code.txt` + `config_audit.txt`

## Development

- **Build**: `npm run build`
- **Test**: `npm test`
- **Consolidate**: `python3 consolidate_code.py`
