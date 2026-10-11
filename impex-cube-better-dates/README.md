# Impex Cube - Better Date Selector

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

A userscript that modernizes the date inputs on Impex Cube (import/export) portals. It replaces the clunky default ASP.NET calendar with a fast, keyboard-friendly, and smart date picker.

## 🚀 Features

- **Smart Typing Support**: Type dates naturally without touching the mouse.
  - `18052024` → `18/05/2024`
  - `18 dec 2024` → `18/12/2024`
  - `today` / `-1` / `+7` (via quick buttons)
- **Keyboard Navigation**:
  - `↑` / `↓` Arrow keys to increment/decrement days.
  - `Enter` to confirm and close.
  - `Escape` to close the picker.
- **Modern UI**:
  - Clean, responsive calendar dropdown.
  - minimal visual clutter.
  - **Green/Red** borders for valid/invalid dates.
- **Fixes & Optimizations**:
  - Removed restrictive input blocking (allows copy-paste and manual edits).
  - Debounced performance for fast page loads.
  - Works with dynamic ASP.NET UpdatePanels.

## 📥 Installation

1. Install a userscript manager like **Violentmonkey** or **Tampermonkey**.
2. Create a new script and paste the contents of `main.js`.
3. Save and refresh your Impex Cube page.

## 🛠️ Usage

Just click any date field or tab into it.
- **Type**: `30012025` or `30 jan` and tab away.
- **Click**: Use the calendar icon `📅` to pick a date.
- **Shortcuts**: Use arrow keys to adjust dates quickly.

## 📋 Changelog

### v1.2
- **Fixed**: Prevented calendar from attaching to "Update" buttons and hidden fields.
- **Fixed**: Removed length limit to allow typing long formats like "18 december 2024".
- **Fixed**: Added support for "may" in date parsing.
- **Improved**: Code cleanup, removed redundancy, and added debounce for performance.

### v1.1
- Initial public release with smart parser and keyboard support.
