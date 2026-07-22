# Guidely Plus

A Tampermonkey/Violentmonkey userscript that enhances the [Guidely](https://guidely.in) test review interface with:

- **Markdown Crawler** — Automatically navigates through all questions and downloads the complete test as a structured Markdown file.
- **Copy Single Question** — One-click copy of the current question + solution as Markdown to clipboard.
- **Enable Copy/Right-Click** — Unlocks text selection and context menus disabled by the site.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open `dist/guidely-plus.user.js` and click **Install**.

## Dev Setup

```bash
bun install
bun run build      # one-shot production build
bun run dev        # dev server with HMR
```

## Architecture

```
src/
├── main.ts          # Entry — bootstraps UI, observer, and copy/paste unlock
├── parser.ts        # DOM → QuestionData extraction + Markdown formatting
├── crawler.ts       # Linear crawl engine (click Next, extract, deduplicate)
├── copyMarkdown.ts  # "Copy Markdown" button injected into the question header
├── converter.ts     # Singleton TurndownService (HTML→Markdown)
├── ui.ts            # Floating action button (download/cancel/status)
└── utils.ts         # downloadFile, enableCopyAndRightClick, onReady
```

## License

MIT
