# Project: GitHub Trending Dashboard

## Overview
A lightweight SvelteKit dashboard based on `design-taste-frontend`. It scrapes GitHub Trending for various languages across daily and weekly timeframes, deduplicates the results, and displays them in a unified UI.

## Structure
github-trending/
├── src/
│   ├── lib/
│   │   └── server/
│   │       └── trending.ts   # HTML scraping logic (cheerio)
│   └── routes/
│       ├── +layout.svelte    # Global styles & layout
│       ├── +page.server.ts   # Server-side data loading
│       └── +page.svelte      # Main dashboard frontend
├── package.json              # Dependencies (SvelteKit, Cheerio, TailwindCSS v4)
├── svelte.config.js          # SvelteKit configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration with Tailwind CSS v4 plugin
└── README.md                 # Project documentation

## Conventions
- **Server-side only scraping**: All fetching and parsing happens in `trending.ts` on the server.
- **Deduplication**: Repositories are merged across time periods using `owner/repo` as the unique ID.
- **Styling**: Tailwind CSS v4 is used for all UI components.

## Dependencies & Setup
- `bun` is the preferred package manager.
- `cheerio` is used for parsing GitHub's HTML.
- `tailwindcss` v4 for styling.

## Critical Information
- GitHub Trending doesn't have an official API; the scraping logic is brittle and depends on GitHub's current HTML structure.
- The `unknown` language slug is experimental and may not always yield results.

## Insights
- Memory caching (10-minute TTL) is implemented in `trending.ts` to reduce outbound requests to GitHub.

## Blunders
- None yet.
