# MEMORY — Oliveboard Plus

## Project Overview
- Userscript for oliveboard.in — enhances UI, enables copy/right-click, exports questions to Markdown
- Stack: TypeScript, Vite, TurndownService (HTML→Markdown), Bun
- Build: `bun run build` → `dist/oliveboard-plus.user.js`

## Architecture
- `main.ts` — entry point, wires up features, MutationObserver
- `crawler.ts` — crawls all questions, groups by section, exports Markdown
- `ui.ts` — FAB download button (idle/loading/success/error states)
- `uiCleaner.ts` — hides ads, zendesk chat, sidebar; fixes links
- `copyMarkdown.ts` — per-question copy button in solution header
- `converter.ts` — shared TurndownService singleton
- `utils.ts` — downloadFile, enableCopyAndRightClick, onReady

## DOM Structure (Oliveboard Solution Page)
- `.singleqid` — each question block (only one visible at a time via `display:block/none`)
- `.qblock .eqt` — question HTML
- `.opt` — option blocks (`.left` = label, `.rightopt .eqt` = content, `.correct` class = correct)
- `.solutiontxt .eqt` — solution HTML
- `.question-map .box` — section containers (`.sec-0`, `.sec-1`, `.sec-2`)
- `.map-qno.q-{N}` — question navigation spans, onclick="goToQuestion(N)"
- `.ddn-select` — currently active section name dropdown
- `button.btn-prenext` — Previous/Next navigation buttons

## Blunders
- Linear "Next button" crawl broke at section boundaries — stopped ~10 questions in. Fixed by reading `.question-map` to get all section indices, navigating directly via `goToQuestion()`.
- Oliveboard overrides `cloneNode` with base64-garbage. Use innerHTML directly, not cloned nodes.

## Key Decisions
- Sections parsed from `.question-map .box` sidebar, not from dropdown
- Section-aware crawl navigates to each question individually via `.map-qno.q-{N}.click()`
- Fallback linear crawl preserved for pages without question-map
