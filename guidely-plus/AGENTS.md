# AGENTS — Guidely Plus

## Overview
A TypeScript-based userscript targeting `guidely.in` test review interfaces. Enables full test paper extraction, anti-copying restriction bypass, single-question Markdown copying, and linear automated crawling with clean Turndown Markdown generation.

## Structure
```
guidely-plus/
├── src/
│   ├── main.ts          # Entry point — bootstraps UI, DOM observers, and copy unlock
│   ├── parser.ts        # DOM → QuestionData extraction + Markdown formatting
│   ├── crawler.ts       # Linear crawl engine (next button clicks, deduplication, progress)
│   ├── copyMarkdown.ts  # Question header copy action button
│   ├── converter.ts     # Turndown HTML-to-Markdown engine configuration
│   ├── ui.ts            # Floating control widget (crawl progress, cancel, download)
│   └── utils.ts         # Clipboard, DOM unlockers, and file savers
├── package.json         # Bun dependencies & build scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite + vite-plugin-monkey build configuration
├── README.md            # User and developer documentation
└── AGENTS.md            # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Runtime & Tools**: Uses `bun` as runtime and package manager with Vite userscript bundling.
- **Copy Protection Bypass**: Automatically strips `onselectstart`, `oncopy`, and `oncontextmenu` blockers to restore normal browser selection.
- **Crawl Rate Limiting**: The linear crawl engine simulates human delays between question transitions to ensure math/diagram formulas render completely before extraction.
- **Markdown Integrity**: Converts tables, mathematical symbols, and images into clean, self-contained Markdown documents.
