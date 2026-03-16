# Testbook Cleaner + Tracker Blocker

A Tampermonkey/Greasemonkey/Violentmonkey userscript that cleans the UI and blocks trackers/ads/bloat on testbook.com.

## Features

- Blocks analytics, trackers, ads, and promotional scripts
- Removes promotional banners and live panel components
- Cleans navigation menu of unwanted sections
- Adds copy-to-Markdown button for exam questions
- Blocks auto-play for videos
- Stubs tracker APIs to prevent errors
- Disables push notifications and service workers

## Usage

Install via Tampermonkey. The script runs automatically on testbook.com pages, blocking network requests and cleaning UI elements.

## Technical Details

Uses network request interception at document-start to block specified URL patterns. UI cleaning runs on DOM mutations for SPA compatibility.
