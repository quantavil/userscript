# design-taste-frontend

A small SvelteKit dashboard for browsing GitHub Trending repositories across multiple languages.

## Stack

- SvelteKit
- Bun
- Tailwind CSS v4
- Cheerio

## What it does

- Fetches GitHub Trending pages for:
  - `daily`
  - `weekly`
- Tracks these languages by default:
  - `unknown`
  - `javascript`
  - `typescript`
  - `python`
  - `rust`
  - `zig`
  - `html`
  - `css`
  - `svelte`
- Deduplicates repositories by `owner/repo`
- Preserves all appearances, so the UI can show whether a repo appeared in:
  - daily
  - weekly
  - both

## Run

```bash
bun install
bun run dev
```

## Notes

- GitHub Trending has no public stable API here. This app scrapes HTML.
- The `unknown` language slug may fail or redirect depending on GitHub behavior.
- Results are cached in memory for 10 minutes to avoid hitting GitHub on every request.

## Main files

- `src/lib/server/trending.ts` — fetch + parse + dedupe
- `src/routes/+page.server.ts` — server load
- `src/routes/+page.svelte` — dashboard UI