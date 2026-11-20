# GitHub Filter

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

A filter panel for GitHub repository search: drag continuous smooth dual sliders for stars and forks, pick dates from a calendar, and watch the query compile as you go. Save presets right on the main panel, and hide results you never want to see.

It uses GitHub's own Primer tokens, so the panel follows the page's light, dark, or auto theme with the native type scale, 32 px controls, and accessible focus rings. The launcher lives in GitHub's filter chrome instead of floating over the page.

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

The sliders are continuous and logarithmic across 5 orders of magnitude (from 1+ to 100k+ stars and 1+ to 25k+ forks), with pointer capture for buttery-smooth dragging and natural round-number snapping.

Open the panel on a results page and it parses the current URL back into the controls, so you can adjust one filter and re-run. A pasted `stars:>500` is widened to `>=501`, which is the same set, and a `stars:500` with no operator reads as "at least 500" — writing 500 and getting only repos with *exactly* 500 stars is never what you wanted.

### Remembers searches (Single-Page Presets)

Save the current configuration under a name directly from the main panel. Saved presets display as compact interactive pills with 1-click loading into the form, a direct run button (`➔`), and safe 2-click delete confirmation (`del?`). Stored in `localStorage`.

### Hides noise

**Hide results containing** drops rows mentioning any of the given words. Matching is whole-word, so `bot` hides "a telegram bot" and leaves "robotics" alone, and it survives GitHub re-rendering the list.

### Repository search only

Every control maps to a repository qualifier, so the panel always searches `type=repositories`. The old scope switch (Code, Issues, PRs, Discussions, Users) is gone: half of those searches silently ignored `stars:` and `pushed:`, and the other half had nothing to filter by. Extension and size filters went with it — both are code-search concerns, and a repository search never reads them.

---

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Build it (below), then open `dist/github-filter.user.js` in your userscript manager.

## Using it

The launcher sits inside GitHub's own filter chrome: under **Filter by** in the desktop/tablet results sidebar, and as a full-width **Advanced filters** row under the filter toolbar on phones. On the bare `/search` landing page (which has no sidebar yet) it falls back to a floating button. Opening it from there works the same; selecting **GitHub Filter** in your userscript manager's menu always works.

- **Unified Single Page**: No dual tabs or separate pages. All filters, live query tape, and saved presets reside in one compact, elegant view.
- **Symmetric Quick Chips**: 1-click modern language filters (`TypeScript`, `Python`, `Rust`, `Go`, `Zig`, `Swift`, `Kotlin`, `Dart`, `C++`, `C`), symmetric metric chips for Stars (`1+`, `10+`, `100+`, `1k+`, `10k+`) and Forks (`1+`, `10+`, `100+`, `1k+`), and date presets (`7d`, `30d`, `1y`) integrated compactly into section headers.
- **Silky Smooth Logarithmic Dual Sliders**: Continuous pointer-captured dual sliders with smooth logarithmic travel, active accent fill, grab feedback, and natural round numbers across 5 orders of magnitude (from 1+ to 100k+).
- **Single-Page Presets**: View saved presets as compact chips with 1-click loading, a direct run button, and safe 2-click delete (`del?`); save current filters instantly via inline input.
- **Interactive Live Query Tape**: Live query parts render as clickable chips with instant 1-click removal (`×`) and 1-click copy with announced feedback
- **Active Filter Badge**: The launcher displays an active filter count pill whenever filters are applied on the current search
- **Mobile Bottom Sheet**: On phones (≤767px) the panel opens as an elevated bottom sheet with a drag handle, a definite `85dvh` height with momentum scrolling (`-webkit-overflow-scrolling: touch`), enlarged touch hit targets, and 16px inputs to prevent iOS Safari auto-zoom. Tablets keep the 440px drawer and get coarse-pointer-sized controls.
- **GitHub Themes**: The panel reads Primer tokens, so it matches light, dark, and auto without a separate switch.
- `Enter` in any text field or clicking Search runs the query on GitHub
- `Esc`, or a click outside, closes the panel

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
