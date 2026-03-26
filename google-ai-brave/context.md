# Context & Migration Notes

## Non-Standard Markdown Behaviours

The original hand-rolled `htmlToMarkdown` converter had several intentional
deviations. Phase 3 replaced it with Turndown + GFM plugin. Custom Turndown
rules and `cleanMarkdown` post-processing preserve the useful deviations:

| # | Element | Standard (Turndown default) | This project | How handled |
|---|---------|----------------------------|--------------|-------------|
| 1 | `<mark>` | Strip or pass through | `==text==` (Obsidian highlight) | Custom Turndown rule `mark` |
| 2 | `<div>` | `\n\n` block separation | Same (`\n\n`) | Turndown default — now standard |
| 3 | Bold cleanup | `**text**` as-is | Collapses whitespace before punctuation | `cleanMarkdown()` post-processing |
| 4 | Empty `<a>` | `[](url)` | Silently dropped | Custom Turndown rule `emptyLink` |
| 5 | KaTeX round-trip | N/A | `$…$` / `$$…$$` preserved in copy | Custom Turndown rule `katex` reads `data-latex` attr |

## KaTeX Integration

- **JS** loaded via `@require` from jsDelivr CDN (too large to bundle).
- **CSS** loaded via `@resource` + `GM_getResourceText`; font paths rewritten
  to absolute CDN URLs at runtime.
- **Rendering** walks text nodes in the content div, replaces `$…$` (inline)
  and `$$…$$` (display) with KaTeX-rendered HTML.
- Each rendered wrapper gets `data-latex="$original$"` so the Turndown `katex`
  rule can recover the raw LaTeX string when copying as Markdown.
- Gracefully no-ops if KaTeX fails to load (CDN outage, blocked, etc.) —
  raw `$…$` strings remain visible as plain text.

## Architecture

┌─────────────────────────────────────────────────────┐
│ meta.txt (@require katex.min.js, │
│ @resource katexCSS katex.min.css) │
└─────────────────┬───────────────────────────────────┘
│ prepended as banner
▼
┌─────────────────────────────────────────────────────┐
│ esbuild IIFE bundle │
│ ┌─────────┐ ┌────────────┐ ┌──────────────────┐ │
│ │ index.ts │→ │ google.ts │ │ brave.ts │ │
│ │ (router) │ │ (extract) │ │ (panel + fetch) │ │
│ └─────────┘ └────────────┘ └────────┬─────────┘ │
│ │ │
│ ┌──────────────┐ ┌───────────────┐ │ │
│ │ markdown.ts │ │ katex-render │◄──┘ │
│ │ (Turndown) │ │ (KaTeX) │ │
│ └──────────────┘ └───────────────┘ │
│ │
│ constants.ts types.ts utils.ts icons.ts styles │
└─────────────────────────────────────────────────────┘


- **Turndown + GFM plugin** are npm packages bundled by esbuild (~30 KB).
- **KaTeX** is an external runtime dependency loaded via Tampermonkey's
  `@require` directive (~280 KB, cached by the browser).

## Phase Summary

| Phase | Scope | Status |
|-------|-------|--------|
| **1** | Scaffolding, build pipeline, types, shared code, Google-side | ✅ |
| **2** | Brave-side: sidebar panel, fetch orchestration, markdown, clipboard | ✅ |
| **3** | Turndown integration, KaTeX rendering, polish | ✅ |