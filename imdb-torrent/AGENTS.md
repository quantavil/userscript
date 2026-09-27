# AGENTS — IMDb Info + Torrent Helper

## Overview
A userscript that scrapes release titles on major torrent indexers (1337x, The Pirate Bay, EZTV, etc.), parses movie/series titles and release years, queries OMDb for IMDb scores/cast/plots, and injects interactive hover tooltips and magnet helpers.

## Structure
```
imdb-torrent/
├── app.js             # Self-contained userscript (DOM scraping, OMDb queries, popup tooltips)
├── test_parsing.js    # Node.js regression test harness for title/quality tag regex
├── todo.txt           # Real-world scraped sample fixture
├── result.txt         # Regression parsing audit results
├── README.md          # Setup and API key instructions
└── AGENTS.md          # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Title Normalization**: Strips scene tags (`1080p`, `x265`, `WEBRip`, `BluRay`, audio codecs) and separates clean movie titles from year identifiers.
- **OMDb API Caching**: Employs in-memory or GM storage caching to minimize API quota consumption (OMDb free tier limit: 1,000 req/day).
- **Non-Destructive DOM Injection**: Injects ratings badges and tooltips as non-blocking siblings or overlay chips without breaking native table sorting or layout.
- **Testing**: Run `bun test_parsing.js` or `node test_parsing.js` when editing the title extraction regex to ensure 100% pass rate on fixture titles.
