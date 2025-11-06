# Universal M3U8 Downloader (Ultimate Edition)

A powerful, optimized, and user-friendly userscript for downloading HLS (.m3u8) video streams and direct video blobs directly from your browser.

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

## Installation

1. Install a userscript manager extension for your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended for Chrome/Chromium)
   - [Violentmonkey](https://violentmonkey.github.io/) (alternative)
   - [Greasemonkey](https://www.greasespot.net/) (for Firefox)

2. Click [here](https://github.com/quantavil/userscript/raw/main/m3u8-video-downloader/main.js) to install the script directly, or:

3. Copy the contents of `main.js` and create a new userscript in your manager

## Usage

1. Navigate to any website with HLS video content
2. The script will automatically detect available video streams
3. A floating download button will appear in the bottom-right corner
4. Click the download button to see available options:
   - **HLS Streams**: Multi-quality variants with size estimates
   - **Direct Videos**: Single video files with known sizes
5. Select your preferred quality/format and click to download
6. Monitor progress in the progress card with pause/resume options

### Advanced Features

- **Alt+Click**: Force show variant picker even for single sources
- **Size Filtering**: Toggle "Exclude small files" to hide thumbnails and ads
- **Copy URL**: Copy source URLs from the progress card
- **Video.js Integration**: Download button appears in Video.js player controls

## Requirements

- Modern browser with userscript support
- Userscript manager (Tampermonkey, Violentmonkey, or Greasemonkey)
- `GM_xmlhttpRequest` permission for cross-origin requests

## Compatibility

- Works on all websites that use HLS streaming
- Supports modern browsers with File System Access API
- Falls back gracefully on older browsers
- Tested with Video.js and native HTML5 video players

## Version

Current version: **2.4.0**
