# Floating Stopwatch

A high-performance, lightweight, and tab-isolated floating stopwatch designed to persist seamlessly across page reloads and protect against DOM destruction. 

## Features

* **Tab-Isolated State:** Tracks time metrics independently per browser tab using `sessionStorage`.
* **Resilient Architecture:** Implements a targeted `MutationObserver` that automatically redeploys the Shadow DOM container if hostile site scripts purge the element, without causing layout-invalidation feedback loops.

## Installation

1. Install a userscript manager such as Tampermonkey or Violentmonkey.
2. Copy and paste the script code into your manager, or click install from the Greasy Fork interface.
3. Navigate to any web protocol target to initialize the UI.

## Usage and Interface Controls

The interface mounts silently at the root level of the target page document. 

### Core Mechanics
* **Start / Pause:** Initiates or halts the ticking engine.
* **Lap / Reset:** Calculates intervals dynamically when active, or completely purges historical states and resets time differentials back to zero when paused.
* **Close Button:** Dismisses the primary stopwatch card container and exposes the floating action button (FAB).

### Floating Action Button (FAB)
* A minimalist circle overlay (`⏱`) appears at the bottom-right corner of the view when the panel is closed. Clicking it restores the full card geometry instantly.

### Tampermonkey Menu Commands
Access your userscript manager icon menu to trigger global automation parameters directly:
* `⏱ Toggle Stopwatch` - Force toggles the current viewport display state.
* `✨ Toggle FAB` - Toggles the persistent visibility of the floating action button entirely based on your layout workspace preferences.