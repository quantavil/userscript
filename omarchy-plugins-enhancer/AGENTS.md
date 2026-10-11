# AGENT — Omarchy Plugins Enhancer

## Overview
Userscript for `https://plugins.omarchy.org/` built with TypeScript, Bun, and Vite (`vite-plugin-monkey`). Adds seamless auto pager (infinite scroll), direct GitHub repository buttons on plugin cards, and persists greyed-out seen states.

| Target | Entry | Output |
|---|---|---|
| Userscript (Tampermonkey/Violentmonkey) | `src/main.ts` | `dist/omarchy-plugins-enhancer.user.js` |

## Structure
```
src/
├── catalog.ts                  # Catalog fetcher, memory cache, and repo resolver
├── config.ts                   # Storage keys and defaults
├── icons.ts                    # Inline SVGs for GitHub, eye, checkmark, and bolt
├── main.ts                     # Userscript bootstrapper and DOM MutationObserver
├── storage.ts                  # GM_getValue/GM_setValue with localStorage fallback
├── styles.ts                   # Injected CSS stylesheet matching Omarchy dark theme
├── types.ts                    # PluginItem, CatalogResponse, and EnhancerSettings types
├── features/
│   ├── auto-pager.ts           # Infinite scroll observer, scroll suppression, card prepending
│   ├── card-enhancer.ts        # Injects GitHub link, seen toggle badge, and click listeners
│   └── seen-observer.ts        # IntersectionObserver tracking plugins viewed in viewport
└── ui/
    └── toolbar.ts              # Floating controls toolbar (Auto Pager, Dim Seen, Clear Seen)
tests/
├── autopager.test.ts           # AutoPager sentinel and card prepending tests
├── catalog.test.ts             # CatalogService repository resolution tests
├── enhancer.test.ts            # Card enhancement and seen toggle tests
├── storage.test.ts             # StorageManager persistence tests
└── toolbar.test.ts             # Toolbar UI controls tests
```

## Key Commands
- `bun install` — Install dependencies
- `bun run dev` — Run Vite dev server with userscript injection
- `bun run build` — Build production userscript (`dist/omarchy-plugins-enhancer.user.js`)
- `bun test` — Run all unit and integration tests

## Insights
- `plugins.omarchy.org` is an SPA rendering 9 cards per page. Clicking `#page-next` triggers `grid.scrollIntoView()`.
- AutoPager intercepts `grid.scrollIntoView()` during automated page transitions to prevent jarring scroll jumps.
- AutoPager snapshots previously rendered cards and prepends them after `#page-next` re-renders, creating true continuous infinite scrolling.
- All 2,551 plugins in `catalog.json` specify a `repo` URL.
- GitHub link on `.plugin-card` is placed in `.plugin-card-actions` with `z-index: 4` and `stopPropagation()` to avoid triggering `.plugin-card-link` navigation.
- Default `seenMode` is 'collapse': seen cards collapse by default into compact brutalist cards with full descriptions.
- Design follows strict web brutalism: zero border-radius, `var(--mono)` typography, hard contrast borders, and no fake double-border artifacts.
- In collapsed mode, full plugin description is displayed in 8.5px micro monospace font with site CSS mask/height overrides.
- Action buttons on cards follow native Omarchy UX: icon-only 25x25px buttons without text.
- No GM menu commands registered; configuration handled exclusively via floating toolbar.
- `enhanceCard` uses `data-ope-enhanced` attribute guard to eliminate redundant DOM manipulation.

## Blunders
- **Auto pager scroll jump**: `#page-next` calls `grid.scrollIntoView({ block: 'start' })`. Suppressed `grid.scrollIntoView` dynamically during automated paging cycles and restored immediately after.
- **Card truncation on page turn**: `render()` in `app.js` replaces `grid.innerHTML`. Prepending snapshots of previous cards retains uninterrupted infinite scroll.
- **Immediate card greying out**: Observing cards while inside viewport dimmed them right in front of the user. Fixed by marking seen only when scrolled past by 1-2 cards (`rect.bottom < -100px`).
- **Double border ghost artifact**: Stepped `box-shadow` created a stacked double window effect. Replaced with single crisp border.
- **Collapsed description truncation**: Omarchy's `style.css` enforced `max-height: 21px` and `-webkit-mask-image`. Overrode with `max-height: none`, `mask-image: none`, and `font-size: 8.5px` in collapsed mode.
- **Card-social overlaying description**: Site's `style.css` set `.card-social` to `position: absolute; top: 13px; right: 12px` and `.plugin-title-line` with `padding-right: 120px`, causing stars/hearts and seen badge to overlap description text. Overrode `.card-social` to `position: relative; margin-left: auto` and cleared padding-right.
- **Blocking catalog await**: `await catalogService.getCatalog()` delayed initial card enhancement. Unblocked `init()` to enhance DOM immediately.
