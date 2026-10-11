# AGENTS — Impex Cube Better Date Selector

## Overview
A specialized DOM enhancement userscript for Impex Cube enterprise ASP.NET freight and customs documentation portals. Overrides legacy ASP.NET postback calendar popups with an accessible, keyboard-friendly date input parser and micro-calendar.

## Structure
```
impex-cube-better-dates/
├── main.js        # Self-contained userscript bundle (date parser, calendar UI, ASP.NET panel observers)
├── README.md      # User documentation & shortcut reference
└── AGENTS.md      # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Target Portal**: Impex Cube web portal ASP.NET forms.
- **ASP.NET UpdatePanel Compatibility**: Re-wires newly mounted input fields across AJAX partial postbacks via MutationObserver without duplicating listeners or losing focus.
- **Flexible Date Parsing**: Supports natural text (`today`, `18052024`, `18 dec 2024`, relative offsets `+7`, `-1`) and formats strictly to the DD/MM/YYYY format required by Indian customs backend validation.
- **Keyboard Ergonomics**: Full arrow key date incrementing/decrementing, `Enter` confirmation, and `Esc` dismissal.
