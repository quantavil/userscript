# SEMrush Rankings Tracker

A Tampermonkey userscript that displays SEMrush ranking data and traffic metrics in a compact AMOLED-themed overlay widget.

## Features

- Displays global/country/category ranks
- Shows monthly visits and average duration
- Traffic trend charts (monthly data)
- Traffic distribution by country (pie chart)
- Caches data for 15 days
- All cached sites view
- Draggable interface
- Keyboard shortcut: Alt+S to toggle
- Supports SPA navigation

## Usage

Install via Tampermonkey from the main.js file. The widget appears on any site that SEMrush tracks. May require opening semrush.com first to authenticate.

## Installation Notes

Requires GM_xmlhttpRequest permission to fetch data from SEMrush API. Data is cached locally to avoid excessive API calls.
