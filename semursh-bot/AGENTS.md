# AGENTS — SEMrush Rankings Tracker

## Overview
An analytics userscript that queries SEMrush domain ranking and traffic metrics via `GM_xmlhttpRequest`, rendering an AMOLED dark telemetry overlay widget on any active website.

## Structure
```
semursh-bot/
├── main.js        # Self-contained userscript bundle (API fetcher, local cache, charts, draggable UI)
├── README.md      # User documentation & shortcut reference
└── AGENTS.md      # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Network Requests**: Uses `GM_xmlhttpRequest` to bypass CORS when querying SEMrush ranking endpoints.
- **Local Caching**: Aggressively caches domain rank, visit volume, and country breakdown in `GM_setValue` for 15 days to minimize API calls and rate-limiting.
- **UI Architecture**: Compact draggable AMOLED overlay triggered via `Alt+S` with SPA navigation awareness.
