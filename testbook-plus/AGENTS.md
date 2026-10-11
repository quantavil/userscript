# AGENTS — Testbook Plus

## Overview
Testbook Plus is an automated crawler, ad/tracker blocker, and content exporter for Testbook.com test series and mock exams. It navigates across sections, questions, and solutions, extracts questions while preserving MathJax LaTeX syntax, and compiles full question papers into clean GitHub-Flavored Markdown.

## Structure
```
testbook-plus/
├── src/
│   ├── main.ts              # Userscript entrypoint and bootstrapping
│   ├── crawler.ts           # Dynamic pagination and section navigation engine
│   ├── extractor.ts         # Question, options, and solution DOM extractor
│   ├── parser.ts            # MathJax formula preservation and HTML-to-LaTeX converter
│   ├── beautifier.ts        # Markdown table normalization and whitespace formatting
│   ├── networkBlocker.ts    # Analytics, tracking, and anti-ad interception
│   ├── uiCleaner.ts         # DOM clutter removal (avatars, reports, telemetry)
│   ├── ui.ts                # Floating Action Button (FAB) and crawl progress modal
│   ├── copyMarkdown.ts      # Markdown clipboard and file download generator
│   ├── utils.ts             # DOM helpers, mutation waits, and sleep timers
│   └── types.d.ts           # TypeScript interfaces and Userscript metadata
├── package.json             # Build configuration and scripts
├── vite.config.ts           # vite-plugin-monkey userscript bundler config
└── README.md                # Installation and user guide
```

## Conventions & Architectural Constraints
- **MathJax Preservation**: Always convert MathJax inline formulas to `$...$` and display blocks to `$$...$$` before running HTML-to-Markdown conversion to prevent Turndown from mangling LaTeX commands and escapes.
- **Dynamic Mutation Polling**: Rely on MutationObserver rather than fixed `setTimeout` delays when waiting for question content or section shifts to load.
- **GFM Table Normalization**: Normalize ragged HTML tables with `colspan` attributes to conform with valid GitHub-Flavored Markdown tables.
- **Code Block Indentation**: Fenced code blocks (` ``` `) must preserve exact indentation and line breaks.
- **Tracker & Analytics Interception**: Intercept tracking requests at the XHR/fetch and DOM script insertion layer to speed up test scraping and protect user privacy.
- **Build & Development**:
  - Runtime: `bun`
  - Build command: `bun run build` (outputs to `dist/`)
  - Dev server: `bun run dev`
