# Telegram Media Downloader

A Tampermonkey userscript that enables downloading of images, videos, GIFs, voice messages, and other media from Telegram Web, even from private channels that disable native downloading.

## Features

- Download images, videos, voice notes, and other media
- Works on private channels with download restrictions
- Progress tracking with pause/resume functionality
- Supports multiple Telegram web interfaces (/k/, /a/, webz)
- Handles large files with chunked downloads
- Works with stories and media viewer

## Usage

Install via Tampermonkey. Download buttons will appear on media in Telegram Web. Click to download with progress indicator.

## Technical Notes

Requires unsafeWindow access for modern file system APIs where available. Uses range requests for efficient large file downloads. Fully compatible with latest Telegram web versions.
