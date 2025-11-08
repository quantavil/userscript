# StreamGrabber

A lightweight, powerful userscript for downloading HLS (.m3u8) video streams, video blobs, and direct videos directly from your browser. Supports mobile and desktop, with pause/resume functionality, AES-128 encryption, fMP4, and minimal UI.

## Installation

### Requirements
- A userscript manager extension:
  - [Tampermonkey](https://www.tampermonkey.net/) (recommended for Chrome/Chromium)
  - [Greasemonkey](https://www.greasespot.net/) (for Firefox)
  - [Violentmonkey](https://violentmonkey.github.io/) (alternative option)

### Install Steps
1. Install a userscript manager extension in your browser
2. Click [here](https://raw.githubusercontent.com/quantavil/userscript/main/StreamGrabber/main.js) to install the script
3. Confirm installation when prompted by your userscript manager

The script will automatically activate on all websites.

## Usage

1. Navigate to any webpage containing video content
2. If supported media is detected, a floating download button will appear in the bottom-right corner
3. Click the download button to open the media selection dialog
4. Choose from available video streams or direct video files
5. For HLS streams with multiple qualities, select your preferred resolution
6. Monitor download progress in the floating progress card
7. Downloads support pause/resume functionality

### Advanced Features
- **Alt+Click**: When exactly one media item is detected, alt-clicking the download button will start download immediately without showing the selection dialog
- **Copy URLs**: Click the copy button next to any media item to copy its URL to clipboard
- **Filter Options**: Toggle "Exclude small (< 1MB)" to filter out thumbnails or ads
- **Progress Controls**: Pause/resume downloads, hide/show progress cards, or cancel downloads

## Features

- **Automatic Detection**: Automatically detects m3u8 streams and video blobs on any website
- **Multi-Quality Support**: Choose from available video quality variants for HLS streams
- **Encryption Support**: Handles AES-128 encrypted streams
- **Format Support**: Supports both fragmented MP4 (fMP4) and MPEG-TS formats
- **Progress Tracking**: Real-time download progress with pause/resume functionality
- **Video.js Integration**: Adds download buttons to Video.js players
- **Cross-Origin Support**: Uses GM_xmlhttpRequest for reliable cross-domain requests
- **Modern File APIs**: Utilizes File System Access API when available, falls back to blob downloads
- **Size Estimation**: Smart size estimation for HLS streams using bandwidth data or byte ranges
- **Smart Filtering**: Option to exclude small files (< 1 MB) to filter out thumbnails/ads
- **Robust Error Handling**: Automatic retry mechanism with configurable limits
- **Clean UI**: Floating download button with progress cards and variant picker
- **Concurrent Downloads**: Optimized concurrent segment downloading for faster HLS downloads

