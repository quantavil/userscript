# GlideVideo

**Mobile web video, actually usable.** Control playback, volume, brightness and zoom with touch gestures instead of fumbling for buttons built for a mouse.

[![Install](https://img.shields.io/badge/Install-userscript-2ea44f?style=flat)](https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/dist/glidevideo.user.js)
[![GitHub](https://img.shields.io/badge/GitHub-quantavil-blue?style=flat&logo=github)](https://github.com/quantavil/userscript)
[![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat)](#license)

<p align="center">
  <img src="https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/asset/photo_2026-05-24_12-43-44.jpg" width="45%" alt="Overlay and speed stepper" />
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/asset/photo_2026-05-24_12-43-45.jpg" width="45%" alt="Settings sheet" />
</p>

---

## Install

Needs a userscript manager — Tampermonkey or Violentmonkey. Works on any mobile browser that supports extensions: Firefox, Cromite, Kiwi, Orion, Edge.

**[→ Install GlideVideo](https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/dist/glidevideo.user.js)**

Runs on every site. To turn it off for one, use **GlideVideo: Disable on \<site\>** in your userscript manager's menu.

---

## Gestures

The top bar holds the controls; the rest of the video is left clear for your thumbs.

| Gesture | Where | What it does |
|---|---|---|
| Double-tap | Left / right half | Skip back or forward. Keep tapping to stack — 10s, 20s, 30s |
| Swipe sideways | Anywhere | Scrub, with a live timestamp and offset |
| Swipe up / down | Right half | Volume |
| Swipe up / down | Left half | Brightness |
| Press and hold | Anywhere | 2× speed while held; release to restore |
| Pinch | Anywhere | Zoom, snapping to 50 / 100 / 125 / 150 / 200 / 300% |

In portrait, vertical swipes are handed back to the page so feeds still scroll. Gestures starting within 18px of a screen edge are ignored, so they don't collide with browser back-swipe.

---

## Controls

| | |
|---|---|
| **Speed** | `−` / `+` steps by 0.10×, hold to fine-tune by 0.05×. Tap the number to play/pause, long-press to reset to 1.00× |
| **Scrubber** | Drag to seek. Shows buffered range and a timestamp preview |
| **Aspect ratio** | Cycles Fit → Fill → Stretch |
| **Lock** | Blocks every gesture, so a stray palm does nothing |
| **Picture-in-Picture** | Where the browser supports it |
| **Settings** | Below |

Prefer something smaller? **Minimal Speed FAB** swaps the speed pill for a single circular badge that cycles 0.5× → 2.0× on tap.

---

## Themes

Three overlay themes, each answering the same question a different way — *how do controls stay readable over footage you don't control?* All three draw **zero blurred layers**, which is what actually costs frames on mobile: every `backdrop-filter` forces a readback of a video surface that repaints every frame.

<table>
<tr>
<td width="33%"><img src="https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/asset/theme-halo.jpg" alt="Halo theme" /></td>
<td width="33%"><img src="https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/asset/theme-high-contrast.jpg" alt="High Contrast theme" /></td>
<td width="33%"><img src="https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/asset/theme-frame.jpg" alt="Frame theme" /></td>
</tr>
<tr>
<td><b>Halo</b> · default</td>
<td><b>High Contrast</b></td>
<td><b>Frame</b></td>
</tr>
<tr valign="top">
<td>Nothing over the picture but the controls, each wearing a tight dark outline — the trick broadcast subtitles have used for decades.</td>
<td>Amber on near-opaque black. The only theme fully readable in direct sunlight or on a washed-out panel.</td>
<td>Halo's mechanism with a point of view: hairline corner brackets, a 1px scrub line with frame ticks, one red playhead.</td>
</tr>
</table>

---

## Settings

| | |
|---|---|
| **Theme** | Halo, High Contrast, or Frame |
| **Default speed** | Fallback speed for new videos |
| **Skip duration** | Seconds per double-tap skip, 5–300 |
| **Minimal speed FAB** | Compact speed badge instead of the pill |
| **Progress bar** | Show or hide the scrubber |
| **Gestures** | Master switch |
| **Remember playback** | Restores position and speed when you come back |
| **Scroll compatibility** | Keeps vertical page scrolling in portrait |
| **Reset all** | Back to defaults |

Speed is remembered per domain. Playback position is remembered per video, for the last 100.

If a site keeps overriding your speed, GlideVideo pushes back three times, then says so in a toast and lets the site win rather than fighting in a loop.

---

## Build

TypeScript, Vite and Bun. Architecture notes live in [`AGENT.md`](AGENT.md).

```bash
bun install
bun run dev     # live-reloading userscript, installs into your manager
bun run build   # → dist/glidevideo.user.js
bun run tsc     # type check
bun run test    # vitest
```

---

## License

MIT
