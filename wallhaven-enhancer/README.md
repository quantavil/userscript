# Wallhaven Enhancer

A high-performance userscript that optimizes the Wallhaven gallery interface with real-time metadata injections, automated hover previews, seamless keyboard browsing, and rate-limit safe background data resolution.

---

## Features

* **Instant Overlay Previews:** Hovering over any thumbnail opens an adaptive, high-resolution visual overlay capped at `92vw` and `88vh` to preserve maximum pixel details without losing visual grid alignment.
* **Lazy-Loaded File Sizes:** Displays file size metrics directly on the thumbnail bar. Uses an asynchronous `IntersectionObserver` coupled with a throttled network queue (`50ms` sequential cool-down boundary) to pre-fetch header data without triggering Cloudflare rate limits.
* **Intelligent Auto-Close:** Previews close instantly when moving the cursor away, triggering manual pointer scroll (`wheel`), or mobile swipe actions (`touchmove`).
* **Cached Keyboard Navigation:** Preload grid index lists dynamically when the overlay initializes. Prevents redundant DOM queries during fast arrow-key browsing.

---

## Keyboard Controls & Interactions

| Trigger | Action | Target |
| --- | --- | --- |
| **Mouse Hover** | Activates full-resolution preview overlay | Thumbnail Grid |
| **Mouse Move Away** | Automatically terminates preview state | Active Overlay |
| **Mouse Scroll (Wheel)** | Instantly terminates overlay to allow unhindered browsing | Active Overlay |
| **Click** | Opens the core wallpaper profile page in a background tab | Active Overlay |
| `ArrowRight` | Advances to the next structural item in the cached grid layout | Active Overlay |
| `ArrowLeft` | Navigates back to the preceding item in the cached grid layout | Active Overlay |
| `D` / `d` | Triggers a direct background download via native browser loops | Active Overlay |
| `Escape` | Forced termination of active preview layer | Active Overlay |

---

## Technical Architecture

* **MutationObserver Surveillance Engine:** Monitors dynamic DOM append operations (e.g., infinite scrolling). Truncates internal cycles by screening out self-generated modifications originating from the overlay container target block (`#whOv`).
* **Decoupled Concurrency Loop:** Offloads extension sorting and payload delivery to a prioritized data queue (`networkQueue`), restricting execution matrices to a rigid, deterministic sequence.
* **Memory Optimization:** Leverages a local `localStorage` eviction mechanism limited strictly to the top 2000 entries to prevent localized overhead creep. Automatically recycles unused memory blocks using `URL.revokeObjectURL` handlers during manual browser download streams.