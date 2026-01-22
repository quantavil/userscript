# MAL Rating Hover Provider

A Tampermonkey userscript that displays MyAnimeList (MAL) ratings, members, and links when hovering over anime posters on various streaming sites.

## Features

- **Hover Tooltips**: Instantly shows MAL score and member count.
- **Smart Caching**: Caches results for 14 days to minimize API requests and load almost instantly on return visits.
- **Rate Limit Safe**: Built-in queue system with backoff and retry logic to respect Jikan API limits (including 429 recovery).
- **Fuzzy Matching**: Fetches top 8 results and uses smart string comparison to find the correct anime (e.g., distinguishing "Season 4" from compile movies).
- **Race Condition Protection**: Handles rapid hovering correctly so you never see the wrong score on an item.

## Supported Sites

- `hianime.to`
- `animekai.to` / `.im` / `.la` / `.nl` / `.vc`
- `anikai.to`
- `anikototv.to`
- `animetsu.bz`
- `yugenanime.tv`
- `animepahe.ru`

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Create a new script and copy the contents of `main.js` into the editor.
3. Save the script.

## Configuration

The script includes a `CONFIG` object at the top that can be tweaked if necessary:

```javascript
const CONFIG = {
    CACHE_EXPIRY: 15 * 24 * 60 * 60 * 1000, // 14 days
    DEBOUNCE_DELAY: 400, // Delay before fetching (ms)
    API_INTERVAL: 350,   // Rate limit delay (ms)
    MATCH_THRESHOLD: 0.5 // Matching strictness
};
```

## Credits

Powered by the [Jikan API](https://jikan.moe/).
