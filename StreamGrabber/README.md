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

### Menu Commands
Access these via your userscript manager's menu:
- **Show Download Panel**: Manually open the download panel to see all detected media
- **Clear Cache**: Clear all detected media from the current session

### Advanced Features
- **Alt+Click**: When exactly one media item is detected, alt-clicking the download button will start download immediately without showing the selection dialog
- **Copy URLs**: Click the copy button next to any media item to copy its URL to clipboard
- **Filter Options**: Toggle "Exclude small (< 1MB)" to filter out thumbnails or ads
- **Progress Controls**: Pause/resume downloads, hide/show progress cards, or cancel downloads

## Features

- **Automatic Detection**: Automatically detects m3u8 streams and video blobs on any website
- **Unified UI**: Single download button in the main window – videos from iframes are automatically aggregated
- **Cross-Frame Support**: Detects and downloads videos embedded in iframes seamlessly
- **Multi-Quality Support**: Choose from available video quality variants for HLS streams
- **Encryption Support**: Handles AES-128 encrypted streams
- **Format Support**: Supports both fragmented MP4 (fMP4) and MPEG-TS formats
- **Progress Tracking**: Real-time download progress with pause/resume functionality
- **Cross-Origin Support**: Uses GM_xmlhttpRequest for reliable cross-domain requests
- **Modern File APIs**: Utilizes File System Access API when available, falls back to blob downloads
- **Size Estimation**: Smart size estimation for HLS streams using bandwidth data or byte ranges
- **Smart Filtering**: Option to exclude small files (< 1 MB) to filter out thumbnails/ads
- **Robust Error Handling**: Automatic retry mechanism with configurable limits
- **Clean UI**: Floating download button with progress cards and variant picker
- **Concurrent Downloads**: Optimized concurrent segment downloading for faster HLS downloads
- **Native Downloads**: Uses GM_download for reliable, native browser downloads

## Architecture

StreamGrabber uses a **Master-Slave architecture** for handling videos across frames:

- **Top Window (Master)**: Displays all UI elements (FAB button, download panel, progress cards), coordinates downloads, and aggregates detected videos from all frames
- **Iframes (Slave)**: Detect videos and report them to the master window. Execute blob downloads when commanded and report progress back

This design ensures:
- No duplicate download buttons cluttering the interface
- All videos visible in a single, unified panel
- Seamless downloading regardless of where the video is embedded

## Changelog

### v1.2.5
- **Unified UI**: Download button now only appears in the main window
- **Cross-Frame Detection**: Videos from iframes are automatically detected and listed
- **Cross-Frame Downloads**: Blob URLs from iframes are handled seamlessly
- **Improved Menu Commands**: "Show Download Panel" now shows all videos from all frames

### v1.2.4
- Added native GM_download support
- Added GM_notification for download completion
- Improved mobile compatibility

## License

MIT License
