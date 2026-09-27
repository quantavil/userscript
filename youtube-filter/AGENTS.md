# AGENT — youtube-filter

## Overview
A browser userscript (Tampermonkey/Violentmonkey) that filters YouTube videos by view counts, upload age, duration, keywords, and channels, with watched video dimming/greyout and customizable preset profiles. YouTube Shorts are preserved. Built with TypeScript + Vite + `vite-plugin-monkey` to `dist/youtube-filter.user.js` and verified with **Playwright Stealth** E2E testing against live YouTube.

## Structure
```
youtube-filter/
├── package.json          # Project metadata and dependencies (v3.3.0)
├── tsconfig.json        # TypeScript configuration (strict, ES2022, bundler resolution)
├── vite.config.ts       # Vite build configuration using vite-plugin-monkey
├── vitest.config.ts     # Vitest configuration with happy-dom environment
├── README.md             # Userscript documentation and installation guide
├── src/
│   ├── index.ts         # Bootstrap: style injection, storage loading, UI mount, navigation listeners
│   ├── types.ts         # Type definitions (FilterState, FilterProfile, WatchedMode, VideoMeta, FormValidationResult)
│   ├── config.ts        # Storage keys, DEFAULT_PROFILES (Default), 2026 host selectors
│   ├── storage.ts       # Type-safe localStorage accessors with profile and list serialization
│   ├── parser.ts        # Pure parsing logic: view counts (10K/1.5M/1B), relative date math, durations, ISO dates
│   ├── filter.ts        # Filtering engine: keyword/regex matching, VIP channel immunity, channel blacklist, watched dimming
│   ├── dom.ts           # Trusted Types safe DOM query helpers, CSS injection, and input error management
│   ├── styles.ts        # YouTube dark theme, .ytf-dimmed rules, tag-chip inputs, red close button, profile deletion
│   └── ui.ts            # Profile bar with delete buttons, tag inputs, watched selector, inline chips, live stats
└── test/
    ├── parser.test.ts   # Unit tests for view parsing, duration parsing, date math, and form validation
    ├── storage.test.ts  # Storage regression tests for Infinity serialization and profile persistence
    ├── filter.test.ts   # Unit tests for keywords, channel blacklist, VIP whitelist, and watched dimming
    └── e2e.test.ts      # End-to-End browser test with Playwright Stealth against live YouTube
```

## Conventions
- **S-Tier Features**:
  - **Title Keyword Blacklist**: Case-insensitive and regex keyword filtering (e.g. `prank`, `reaction`, `/trailer$/i`).
  - **Channel Blacklist & VIP Channels**: Block unwanted channels; whitelisted channels receive **VIP immunity** from view/duration limits.
  - **Watched Videos Dimming**: Watched videos ($\ge 70\%$ red progress bar) are dimmed (`.ytf-dimmed`, opacity 25% + grayscale 90%) with hover-to-reveal. Option to switch to `Hide` or `Off`.
  - **Custom Profiles**: Built-in `Default` profile with 1-click `+ Save Profile` and `×` deletion for custom profiles.
- **YouTube Dark Theme**: `#0f0f0f` background, `#212121` surfaces, `#303030` borders, `#ff4d4d` red close/remove buttons, `#ff0000` YouTube Red brand accents, `#f1f1f1` white pill action buttons. No generic blues.
- **Section-Inline Preset Chips**: Quick filter chips are rendered inline next to their section labels:
  - `VIEWS`: `> 100K`, `> 1M`
  - `DURATION (MINS)`: `< 15m`, `> 20m`
- **Trusted Types Safety**: Never assign `.innerHTML = ...` directly; all DOM is built using `document.createElement`, `textContent`, or `htmlToFragment` via `DOMParser` to comply with YouTube's strict CSP.
- **Left Bookmark Tab (`#yt-filter-toggle`)**: Renders on the left edge flush at `left: 0; top: 50%`. Smoothly slides tucked away (`translateX(-100%)`) when the drawer is open to prevent overlapping the form.
- **Sliding Drawer (`#yt-filter-panel`)**: Slides out smoothly from `left: -380px` to `left: 0`.
- **2026 YouTube Selectors**: Supports `yt-lockup-view-model`, `ytd-rich-item-renderer`, `ytd-video-renderer`, `ytd-grid-video-renderer`, `ytd-compact-video-renderer`, `ytd-reel-item-renderer`.
- **GM Menu Integration**: Registers `GM_registerMenuCommand('Toggle Filter Panel')` directly.
- **Keyboard Shortcuts**: `Alt + F` toggles the filter panel; `Escape` closes it.

## Things that are load-bearing
- **Trusted Types**: YouTube throws on `.innerHTML` sinks; breaking this breaks script initialization on YouTube.
- **Panel-open tucking**: When the drawer opens, the tab must hide (`.panel-open`) so it never overlaps the open form inputs.
- **VIP Channel Immunity**: Whitelisted channels must bypass view count, date, and duration filters.
- **Watched Progress Detection**: Checks resume playback progress bar (`#progress`, `.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment`) style width $\ge 70\%$.
- **Infinity serialization**: JSON does not support `Infinity`. `storage.ts` serializes `Infinity` to `null` and coerces `null` back to `Infinity` on read. Breaking this breaks filter persistence.
- **Local noon date normalization**: YouTube dates are relative. `daysAgoToDate` and `dateToDaysAgo` force local noon (`T12:00:00`) on both current and target dates to avoid DST and UTC timezone shift bugs.
- **Shorts & Posts toggles**: Supports `hideShorts` and `hidePosts` switches. Shelves (`ytd-reel-shelf-renderer`, `ytd-rich-section-renderer`) and posts (`ytd-post-renderer`, `yt-post-item-view-model`) are filtered accurately.
- **Debounced mutation observer & SPA navigation**: YouTube is a Single Page Application. Scanning is debounced by 100ms + `requestAnimationFrame`, reacting to `yt-navigate-start`, `yt-navigate-finish`, `yt-page-data-updated`, `popstate`, and `hashchange`.

## Dependencies & Setup
- Package manager: `bun`
- Development: `bun run dev`
- Build: `bun run build`
- Type checking: `bun run tsc`
- Unit tests: `bun run test:unit`
- E2E tests: `bun run test:e2e`
- All tests: `bun run test`
- GM grants: `GM_addStyle`, `GM_registerMenuCommand`

## Blunders
- **Home Feed combined metadata parsing**: 2026 YouTube Home cards (`yt-lockup-view-model`) combine views and age in one text node (`124K views • 2 days ago`). `parseViews` fell back to digit stripping (`1242`), breaking Home feed filtering. Fixed with strict regex `([\d.,\s\u00A0]+)\s*([KMBkmb])?\s*views?`.
- **Regex keyword lowercase corruption**: `normalize(kw)` lowered regex pattern before compilation, destroying `[A-Z]`/`\S`/`\W` character classes. Fixed by extracting regex pattern from un-normalized string.
- **Non-timestamp badge duration parse**: `parseDuration` returned `0` for badges like `UPCOMING`/`PREMIERE`, causing premature hiding under `minDuration`. Fixed by enforcing `^(\d+:)?\d+:\d+$`.
- **Nested host double counting**: `ytd-rich-item-renderer` containing `yt-lockup-view-model` caused 2x counts in `applyFiltersToDOM`. Fixed by filtering out nested host ancestors.
- **Date rounding on DST boundaries**: `Math.floor` on noon timestamps shifted days by -1 on 23-hour DST days. Fixed with `Math.round`.
