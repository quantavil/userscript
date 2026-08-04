# GitHub Advanced Search

A search panel for GitHub that builds the query for you, remembers the searches you run often, and hides results you never want to see.

It reads GitHub's own Primer design tokens, so it inherits whatever theme you have set — light, dark, dimmed, high contrast — and looks like part of the page instead of something bolted onto it.

---

## What it does

### Builds the query

Fill in fields; it writes the qualifiers.

| You type | It searches |
|---|---|
| Language → `python, -html` | `language:python -language:html` |
| Stars → `500` | `stars:>=500` |
| Stars → `>500 <1000` | `stars:>500 stars:<1000` |
| Size → `100..500` | `size:100..500` |
| Any of these → `react, vue` | `(react OR vue)` |
| All of these → `"machine learning"` | `"machine learning"` |

Values are comma or space separated, `-` negates, and quoted phrases stay whole. A bare number on stars/forks/size means "at least" — writing `500` and getting only repos with *exactly* 500 stars is never what you wanted. Explicit operators and ranges pass through untouched.

Open the panel on a results page and it parses the current URL back into the form, so you can adjust one field and re-run instead of retyping. Shorthand qualifiers (`lang:`, `ext:`) are recognised alongside the long forms.

### Remembers searches

Save the current configuration under a name. Each preset shows its qualifiers as chips, and runs directly or loads back into the builder for editing. Stored in `localStorage`.

### Hides noise

**Hide results containing** drops rows mentioning any of the given words, on every search type. Matching is whole-word, so `bot` hides "a telegram bot" and leaves "robotics" alone, and it survives GitHub re-rendering the list.

---

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Build it (below), then open `dist/github-filter.user.js` in your userscript manager.

## Using it

The search button in the bottom-right corner of any results page opens the panel; so does **Advanced search** in your userscript manager's menu, on any GitHub page.

- `Enter` in any builder field runs the search
- `Esc`, or a click outside, closes the panel
- The theme button cycles: matches GitHub → light → dark → back to matching GitHub

## Development

```bash
bun install
bun run build   # → dist/github-filter.user.js
bun run dev     # vite dev server
bun run test    # vitest
bun run tsc     # typecheck
bun run lint    # biome
```

## Notes

State lives in `localStorage` under the `ghf:` prefix. Presets saved in v7 are migrated on first run.

Earlier versions added a badge to each result showing the repository's latest release. It has been removed: checking every result meant a request per row, which GitHub rate-limited, and the answer was not reliable enough to be worth the cost. The leftover cache is cleared on upgrade.

## License

MIT
