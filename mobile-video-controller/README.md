# Mobile Video Controller

A powerful, mobile-friendly userscript that adds a persistent "Card" UI to web videos, providing advanced playback controls and optimizations.

## ✨ Features

- **Media Card UI**: A sleek, floating control panel that stays in view and can be manually dragged to any position.
- **Advanced Playback Speed**:
  - Slide vertically on the speed button for high-precision speed adjustment (0.1x to 16x).
  - Snap points for common speeds (0.25x, 0.5x, 1x, etc.).
  - Long press to quickly reset to 1.0x.
- **Enhanced Navigation**:
  - Customizable skip durations for Rewind and Forward.
  - Long press skip buttons for a quick-access skip menu.
- **A-B Looping**: Easily set start (A) and end (B) points to loop specific sections of a video.
- **Volume Booster**: Built-in audio gain to boost volume up to 200%.
- **Smart Features**:
  - **Self-Correction**: Prevents videos from being hijacked or paused by certain sites.
  - **Autoplay Modes**: Options for 'Off', 'Next' (YouTube focus), or 'Loop' current video.
- **Battery & Performance Optimized**: Uses `IntersectionObserver` and `ResizeObserver` to minimize CPU usage and only active when videos are in view.
- **Haptic Feedback**: Subtle vibrations for touch interactions (where supported).

## 🛠 Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Copy the contents of `main.js` and create a new script in your manager, or use the GreasyFork install link.

## 📜 Credits

This script is a fork of the original work by **[Nasimul Hasan Maruf](https://greasyfork.org/en/users/1510140-nasimul-hasan-maruf)**. 

Special thanks to the original author for the foundation of this controller.

## 📄 License

This project is open-source. Please refer to the original author's terms if applicable.
