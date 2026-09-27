# AGENTS — Search Engine Quick Switcher

## Overview
A lightweight floating widget userscript that extracts active search query strings across major search engines (Google, Brave, DuckDuckGo, Bing, Yandex, YouTube) and renders an AMOLED dark floating action bar to instantly switch engines without re-typing queries.

## Structure
```
search-switcher/
├── main.js        # Self-contained userscript bundle (query extractor, floating SVG toolbar, engine URL router)
├── README.md      # User documentation & feature list
└── AGENTS.md      # Domain-specific constraints and architectural guidance
```

## Conventions & Critical Information
- **Supported Engines**: Google (`google.*`), DuckDuckGo (`duckduckgo.com`), Brave (`search.brave.com`), Bing (`bing.com`), Yandex (`yandex.*`), YouTube (`youtube.com`).
- **Query Extraction**: Safely extracts search terms from standard URL parameters (`q`, `text`, `search_query`) and active search input elements.
- **Ergonomics**: Draggable or fixed floating pill with micro-SVG engine glyphs; supports one-click cycling and direct jumps.
