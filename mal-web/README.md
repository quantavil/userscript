# MAL Rating Hover Provider

A Tampermonkey userscript that displays MyAnimeList (MAL) ratings, members, and links when hovering over anime posters on various streaming sites.

## Features

- **Hover Tooltips**: Instantly shows MAL score and member count
- **Color-Coded Badges**: Gold (8+), Green (7-8), Orange (6-7), Red (5-6), Purple (<5)
- **Smart Caching**: 14-day cache for successful lookups, 12-hour for not-found
- **Rate Limit Safe**: Queue system with retry logic for Jikan API limits
- **Fuzzy Matching**: Fetches top 8 results with Levenshtein similarity matching
- **Mobile Support**: Long-press to show ratings on touch devices
- **Request Timeout**: 8-second timeout prevents hung requests

## Supported Sites

| Site | Domain Pattern |
|------|----------------|
| HiAnime | `hianime.*` |
| Anitaro | `anitaro.*` |
| Animovitch | `animovitch.*` |
| AnimeKai | `animekai.*` |
| Anikai | `anikai.*` |
| Anikoto TV | `anikototv.*` |
| GogoAnime | `gogoanime.*` |
| Anigo | `anigo.*` |
| 9Anime | `9anime.*` |
| AnimeNoSub | `animenosub.*` |
| Kawaiifu | `kawaiifu.*` |
| AniWorld | `aniworld.*` |
| Yugen Anime | `yugenanime.*` |
| AnimePahe | `animepahe.*` |
| Kimoi TV | `kimoitv.*` |
| UniqueStream | `anime.uniquestream.*` |
| WCOStream | `wcostream.*` |
| Ramenflix | `ramenflix.*` |
| AnimeYY | `animeyy.*` |
| Animeland | `animeland.*` |
| Animelon | `animelon.*` |
| 123Animes | `123animes.*` |
| Animetsu | `animetsu.*` |
| Aniwave | `aniwave.*` |
| Zoro | `zoro.*` |

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Create a new script and paste the contents of `main.js`
3. Save and enable the script

## Configuration

```javascript
const CONFIG = {
    CACHE_PREFIX: 'mal_v5_',
    CACHE_EXPIRY_SUCCESS: 14 * 24 * 60 * 60 * 1000, // 14 days
    CACHE_EXPIRY_ERROR: 12 * 60 * 60 * 1000,        // 12 hours
    DEBOUNCE_DELAY: 200,      // Hover delay (ms)
    LONG_PRESS_DELAY: 500,    // Mobile long-press (ms)
    API_INTERVAL: 350,        // Rate limit delay (ms)
    MATCH_THRESHOLD: 0.5      // Fuzzy matching strictness
};
```

## Menu Commands

- **🗑️ Clear MAL Cache** - Clears all cached ratings

## License

MIT

## Credits

- Powered by the [Jikan API](https://jikan.moe/)
- Author: [Quantavil](https://github.com/quantavil)
