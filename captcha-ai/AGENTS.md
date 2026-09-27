# AGENTS — Icegate Captcha Solver

## Overview
A lightweight userscript designed to automatically detect, extract, and solve visual/canvas CAPTCHAs across Indian Customs Icegate web portals (`old.icegate.gov.in`, `enquiry.icegate.gov.in`, `foservices.icegate.gov.in`) using Google Gemini / Gemma AI vision models.

## Structure
```
captcha-ai/
├── main.js        # Self-contained userscript bundle (DOM capture, vision API, UI widget)
├── README.md      # User guide and portal configuration
└── AGENTS.md      # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Target Portals**: `*.icegate.gov.in` (`old`, `enquiry`, `foservices`).
- **DOM & Canvas Extraction**: Handles both static image elements (`<img>`) and dynamic HTML5 `<canvas>` elements by converting canvas buffers to base64 JPEG/PNG data URLs.
- **Floating UI**: Injects a floating widget in the bottom-right corner to report status (solving, success, retry) and manual trigger buttons.
- **Zero Heavy Runtime**: Written in vanilla JavaScript with GM functions (`GM_xmlhttpRequest`, `GM_setValue`, `GM_getValue`).
- **Error Resilience**: Auto-detects captcha refresh mutations and supports rate-limited exponential backoff retries.
