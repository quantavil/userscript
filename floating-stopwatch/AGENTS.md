# AGENTS — Floating Stopwatch

## Overview
A high-performance, lightweight, and tab-isolated floating stopwatch overlay designed to persist seamlessly across page reloads and protect against host DOM destruction using Shadow DOM isolation.

## Structure
```
floating-stopwatch/
├── main.js        # Self-contained userscript bundle (Shadow DOM UI, timing engine, tab isolation)
├── README.md      # User documentation & controls
└── AGENTS.md      # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Tab Isolation**: Timer state persists per browser tab using `sessionStorage` to avoid cross-tab state clobbering.
- **Shadow DOM Encapsulation**: Mounts all stopwatch UI inside a closed or isolated Shadow Root to completely prevent host CSS leaks and page script tampering.
- **Mutation Resilience**: Monitors document root with a targeted `MutationObserver` to redeploy the Shadow Root if the host page destroys or purges external DOM nodes.
- **Controls & Ergonomics**:
  - Start / Pause toggle
  - Lap / Reset calculation
  - Minimalist FAB launcher toggleable via userscript menu commands
