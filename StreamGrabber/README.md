# StreamGrabber 🚀

A high-performance, lightweight userscript designed for seamless media extraction. Detect and download HLS streams (.m3u8), video blobs, and direct video files with a minimal, premium UI.

---

## 📥 Installation

> [!IMPORTANT]
> **Recommended Userscript Manager: [Violentmonkey](https://violentmonkey.github.io/)**
>
> While StreamGrabber works on most managers, **Violentmonkey** provides the best compatibility and performance for modern userscripts.

1.  **Install a manager:** [Violentmonkey](https://violentmonkey.github.io/) (Recommended)
2.  **Add Script:** Click [here](https://raw.githubusercontent.com/quantavil/userscript/main/StreamGrabber/main.js) to install.
3.  **Confirm:** Accept the installation in your browser extension.

---

## ✨ Key Features

-   **Smart HLS Processing**: Parallel segment downloading with AES-128 decryption and fMP4 support.
-   **Unified Terminal UI**: A single, clean floating action button (FAB) that manages all detected media across nested iframes.
-   **Adaptive Quality**: Automatically picks up master playlists and offers resolution selection (e.g., 1080p, 720p).
-   **Resilient Downloads**: Built-in pause/resume functionality with automatic retry mechanisms for unstable connections.
-   **Privacy First**: Minimal permissions, no external tracking, and works entirely within your browser context.

---

## � Screenshots

<p align="center">
  <img src="https://i.ibb.co/YT2yW8GM/Screenshot-20260203-115416.png" alt="Progress Card" width="45%">
  <img src="https://i.ibb.co/CKSmRKMZ/Screenshot-20260203-115642.png" alt="Download Modal" width="45%">
</p>
<p align="center">
  <img src="https://i.ibb.co/zTZ8fx9g/Screenshot-20260203-115801.png" alt="Media Detection" width="90%">
</p>

---

## �🛠 Usage

1.  **Browse**: Open any page with video content.
2.  **Detect**: The floating download button will appear once media is identified.
3.  **Choose**: Click the button to view resolutions or download directly (use **Alt+Click** for instant download if only one source is found).
4.  **Monitor**: Track progress in real-time with the compact progress cards.

---

## ⚙️ Advanced Controls

Access these via your userscript manager menu:
-   **Show Download Panel**: Force the UI to appear.
-   **Clear Cache**: Reset detected media for the current session.
-   **Toggle Filtering**: Exclude small segments or ads (< 1MB).

---

## 📜 Changelog

### v2.1.0
-   **Modular Download Engine**: Refactored the core download logic to eliminate "God Functions", ensuring better stability and maintainability.
-   **Enhanced Resilience**: Added smart 403 fallback mechanisms for strict HLS segments and verified robust pause/resume functionality.
-   **UI Polish**: Updated FAB aesthetics with a modern squircle design and improved progress bar visualization.
-   **Namespace Update**: Migrated to `streamgrabber-lite` namespace.

### v2.0.0
-   **Shadow DOM Isolation**: Re-engineered the entire UI layer to use **Shadow DOM**. This encapsulates styles and DOM nodes, preventing "hydration failed" errors on sites built with React, Next.js, and other modern frameworks.
-   **Hydration-Safe Architecture**: The UI host is now detached from the main document body's tree, ensuring 100% isolation from host-side script interference.
-   **Premium Gold Theme**: Implemented a new, sleek design system with gold accents, enhanced typography, and micro-animations.
-   **Dynamic Progress Engine**: Improved download scheduler with verified percentage tracking and gold-gradient filling.

### v1.3.0
-   **HLS Enhancements**: Improved playlist enrichment and resolution detection.
-   **UI Refinement**: Cleaner animations and better responsive layout for mobile.
-   **Performance**: Optimized memory usage during large concurrent downloads.

### v1.2.5
-   **Unified UI**: Global aggregation of media from all sub-frames.
-   **Compatibility**: Enhanced support for fMP4 and diverse HLS encryption schemes.

---

## 📄 License

MIT © [quantavil](https://github.com/quantavil)