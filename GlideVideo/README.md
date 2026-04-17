# 🎥 GlideVideo: Pro Mobile Touch Controller

A premium, mobile-friendly userscript that adds a sleek "Media Card" UI to web videos, providing effortless gesture-based control and advanced features.

## ✨ Features

- **Premium Media Card UI**: A sleek, floating control panel with "Liquid Glass" aesthetics, soft color accents, and iOS-style spring physics.
  - **Zero Visual Clutter**: The UI fades to **100% invisible** when inactive, giving you a totally unobstructed view of your video.
  - **Massive Invisible Touch Target**: Because the UI disappears completely, it features a massive expanded invisible hit-box (extending 2.5rem in all directions). You only need to tap anywhere in the general vicinity of where the controller was to instantly snap it back onto the screen!
- **Touch Gestures** *(New in v1.2)*:
  - **Swipe-to-Seek**: Swipe left/right on the video to scrub through the timeline with a visual overlay showing the current position and delta.
  - **Long-Press-to-Speed**: Touch and hold on the video to temporarily boost playback to 2× speed; release to restore.
  - Can be toggled on/off from Settings.
- **Advanced Playback Speed**:
  - Slide vertically on the speed button for high-precision speed adjustment.
  - Snap points for common speeds (0.25x, 0.5x, 1x, etc.).
  - Quick-access speed menu with a long press or click.
- **Enhanced Navigation**:
  - Customizable skip durations for Rewind and Forward.
  - Dedicated skip buttons with configurable skip intervals in settings.
- **Modern Settings UI**:
  - **Card-based Layout**: A structured and intuitive settings menu for better usability.
  - **Video Transform**: High-precision Zoom and 90-degree Rotation controls.
  - **Playback Preferences**: Easy configuration of default speed, skip intervals, and gesture toggle.
- **Smart UI Controls**: Long press the settings icon to transform it into a close button to quickly hide the controller.
- **Battery & Performance Optimized**: Uses `IntersectionObserver` and `ResizeObserver` to minimize CPU usage, only activating when videos are in view.
- **Haptic Feedback**: Subtle vibrations for touch interactions (where supported).

## 🛠 Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Copy the contents of `dist/main.js` and create a new script in your manager.

## 📜 Credits

This script is a fork of the original work by **[Nasimul Hasan Maruf](https://greasyfork.org/en/users/1510140-nasimul-hasan-maruf)**. 

Special thanks to the original author for the foundation of this controller.

## 📄 License

This project is open-source. Please refer to the original author's terms if applicable.
