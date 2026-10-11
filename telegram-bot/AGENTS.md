# AGENTS — Telegram Media Downloader

## Overview
A high-performance Tampermonkey/Violentmonkey userscript enabling direct media downloading (videos, photos, GIFs, voice messages, stories, and documents) from Telegram Web clients (`web.telegram.org`, `webk.telegram.org`, `webz.telegram.org`), including private and restricted channels where native saving/forwarding is disabled.

## Structure
```
telegram-bot/
├── main.js        # Self-contained userscript bundle (media discovery, chunked downloader, UI overlay)
├── README.md      # User guide and feature summary
└── AGENTS.md      # Subproject architecture and domain constraints
```

## Conventions & Critical Information
- **Target Environments**: Telegram Web K (`/k/`), Web A/Z (`/a/`, `webz.telegram.org`), story viewers, and full-screen media lightboxes.
- **Restricted Channel Extraction**: Bypasses download restrictions by accessing underlying media blob streams, indexedDB caches, or intercepting Telegram Web's internal MTProto/media workers via `unsafeWindow`.
- **Chunked Range Downloads**: Implements chunked HTTP range request streaming (`bytes Start-End/Total`) with pause/resume support for large video and audio files.
- **Floating UI Overlay**: Mounts download icons directly onto media bubbles, chat message rows, and story view controls using unique tracking attributes (`data-tel-download-id`).
- **Memory & Resource Hygiene**: Cleans up blob object URLs (`URL.revokeObjectURL`) upon download completion or cancellation to prevent browser tab memory exhaustion.
- **Zero Framework Footprint**: Self-contained vanilla JavaScript with zero external runtime dependencies.
