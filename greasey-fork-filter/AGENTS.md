# AGENTS — Greasy Fork Filter

## Overview
A lightweight userscript that injects an AMOLED dark filter control panel into Greasy Fork script listing directories (`greasyfork.org/*/scripts`). Allows users to hide spam and low-quality scripts by daily/total install thresholds, blocked authors, and keyword patterns.

## Structure
```
greasey-fork-filter/
├── main.js        # Self-contained userscript bundle (DOM scanner, filtering engine, settings UI)
├── README.md      # User documentation & import/export format
└── AGENTS.md      # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Target Host**: `https://greasyfork.org/*/scripts*`.
- **Filtering Pipeline**: Runs debounced DOM evaluation (120ms debounce) over `<ol class="script-list">` items.
- **Criteria**:
  - Daily install count threshold
  - Total install count threshold
  - Exact phrase and substring keyword blacklists
  - Author blacklists
- **Persistence**: Persists configuration using `GM_getValue` / `GM_setValue` with JSON file import/export capabilities.
- **Zero Framework**: Vanilla JavaScript with lightweight, scoped stylesheet injection.
