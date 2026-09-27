# AGENTS — Impex Cube Better Dropdowns

## Overview
A lightweight userscript that wraps standard HTML `<select>` elements into searchable, keyboard-navigable comboboxes on `impexcube.in` freight forwarding and customs billing web interfaces.

## Structure
```
impex-cube-dropdown/
├── dropdown_userscript.js  # Self-contained userscript bundle (fuzzy search, custom dropdown UI, event sync)
├── README.md               # User guide & algorithm highlights
└── AGENTS.md               # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Target Portal**: `https://*.impexcube.in/*`.
- **Two-Way Synchronization**: Selection in the custom search dropdown immediately fires `change` and `input` events on the underlying native `<select>` element to ensure ASP.NET `__doPostBack` and form validators are triggered correctly.
- **Fuzzy Matching**: Weighted scoring algorithm prioritizing exact matches (100) > starts-with (80) > word boundary (70) > fuzzy subsequence (40-50).
- **Zero Runtime Dependencies**: Written entirely in vanilla JavaScript and scoped CSS.
