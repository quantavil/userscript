# MAL Rating Provider

A Tampermonkey userscript that automatically displays MyAnimeList (MAL) ratings, members, and links on anime posters across various streaming sites.

## Features

- **Auto-Presenting Ratings**: Automatically shows MAL score and member count when posters enter the viewport.
- **Color-Coded Badges**: Gold (8+), Green (7-8), Orange (6-7), Red (5-6), Purple (<5)
- **Smart Caching**: 4-week cache for successful lookups, 24-hour for not-found/errors
- **Rate Limit Safe**: Queue system with throttled requests for Jikan API limits
- **Fuzzy Matching**: Fetches results with Levenshtein-based similarity matching
- **Intersection Observer**: High performance, zero-latency display that adapts to dynamic scrolling
- **Request Timeout**: 10-second timeout prevents hung requests

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
    CACHE_EXPIRY_SUCCESS: 28 * 24 * 60 * 60 * 1000, // 4 weeks
    CACHE_EXPIRY_ERROR: 24 * 60 * 60 * 1000,        // 24 hours
    API_INTERVAL: 600,        // Rate limit delay (ms)
    MATCH_THRESHOLD: 0.7      // Fuzzy matching strictness
};
```

## Menu Commands

- **🗑️ Clear MAL Cache** - Clears all cached ratings

## License

MIT

## Credits

- Powered by the [Jikan API](https://jikan.moe/)
- Author: [Quantavil](https://github.com/quantavil)
