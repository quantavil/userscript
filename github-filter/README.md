# GitHub Filter

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

A filter panel for GitHub repository search: drag two sliders for stars and forks, pick dates from a calendar, and watch the query compile as you go. Save the ones you run often, and hide results you never want to see.

It reads GitHub's own Primer design tokens, so it inherits whatever theme you have set — light, dark, dimmed, high contrast — and looks like part of the page instead of something bolted onto it.

---

## What it does

### Filters instead of qualifier syntax

| Control | It searches |
|---|---|
| Stars, both thumbs at 500 and 1k | `stars:500..1000` |
| Stars, left thumb at 500 | `stars:>=500` |
| Forks, right thumb at 100 | `forks:<=100` |
| Created, 2024-01-01 → 2024-06-30 | `created:2024-01-01..2024-06-30` |
| Created, from 2024-01-01 | `created:>=2024-01-01` |
| Language → `python, -html` | `language:python -language:html` |
| Any of these → `react, vue` | `(react OR vue)` |
| All of these → `"machine learning"` | `"machine learning"` |

The sliders are logarithmic: 1, 5, 10, 25, 50, 100, 250, 500, 1k, 2.5k, 5k, 10k, 25k, 50k, 100k. Supporting fine-grained searches from 1+ star to 100k+.

Open the panel on a results page and it parses the current URL back into the controls, so you can adjust one filter and re-run. A pasted `stars:>500` is widened to `>=501`, which is the same set, and a `stars:500` with no operator reads as "at least 500" — writing 500 and getting only repos with *exactly* 500 stars is never what you wanted.

### Remembers searches

Save the current configuration under a name. Each preset shows the query it compiles to and runs directly, or loads back into the builder for editing. Deleting takes a second click, never a modal. Stored in `localStorage`.

### Hides noise

**Hide results containing** drops rows mentioning any of the given words. Matching is whole-word, so `bot` hides "a telegram bot" and leaves "robotics" alone, and it survives GitHub re-rendering the list.

### Repository search only

Every control maps to a repository qualifier, so the panel always searches `type=repositories`. The old scope switch (Code, Issues, PRs, Discussions, Users) is gone: half of those searches silently ignored `stars:` and `pushed:`, and the other half had nothing to filter by. Extension and size filters went with it — both are code-search concerns, and a repository search never reads them.

---

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Build it (below), then open `dist/github-filter.user.js` in your userscript manager.

## Using it

The filter button in the bottom-right corner of any GitHub page opens the panel; so does selecting **GitHub Filter** in your userscript manager's menu.

- **Quick Chips**: 1-click modern language filters (`TypeScript`, `Python`, `Rust`, `Go`, `Zig`, `Swift`, `Kotlin`, `C++`), star cutoffs (`1+`, `10+`, `100+`, `1k+`, `10k+`), and date presets (`Past 7d`, `Past 30d`, `Past year`)
- **Logarithmic Dual Sliders**: Drag thumbs to set ranges (from 1+ upwards) or click the track; thumbs smoothly prioritize closer bounds without overlap lockups
- **Interactive Live Query Tape**: Live query parts render as clickable chips with instant 1-click removal (`×`) and 1-click copy with feedback
- **Active Filter Badge**: The floating launcher button displays an active filter count pill whenever filters are applied on the current search
- `Enter` in any text field or clicking Search runs the query on GitHub
- `Esc`, or a click outside, closes the panel
- `←`/`→` move between Builder and Presets tabs

## Development

```bash
bun install
bun run build   # → dist/github-filter.user.js
bun run dev     # vite dev server
bun run test    # vitest
bun run tsc     # typecheck
bun run lint    # biome
bun run knip    # unused files/exports/dependencies
bun run check   # tsc + test + lint + knip + build
```

## Notes

State lives in `localStorage` under the `ghf:` prefix. Presets saved by v7 or v9 are migrated on first run; a v9 preset's `size` and `extension` values are dropped because those filters no longer exist.

Earlier versions added a badge to each result showing the repository's latest release. It has been removed: checking every result meant a request per row, which GitHub rate-limited, and the answer was not reliable enough to be worth the cost. The leftover cache is cleared on upgrade.

## License

GPL-3.0-or-later
