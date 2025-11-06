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

