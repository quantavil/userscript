# 🔽 Impex Cube Better Dropdowns

A modern, high-performance userscript that transforms standard HTML select elements into searchable, keyboard-friendly dropdowns. Designed specifically for the Impex Cube platform to enhance productivity and user experience.

## ✨ Key Features

- 🔍 **Fuzzy Search:** Powerful search algorithm that matches even with typos or partial strings.
- ⌨️ **Keyboard Navigation:** Full support for arrow keys, Enter, and Escape for a seamless workflow.
- 🎨 **Modern Aesthetics:** Clean, professional UI with smooth transitions and clear visual feedback.
- 🚀 **Performance Optimized:** Lightweight implementation with debounced search and efficient DOM updates.
- 📏 **Smart Positioning:** Automatically detects screen edges to prevent menus from being cut off.
- 🏷️ **Contextual Info:** Shows value codes alongside text for quick identification.

## 🚀 Installation

1. Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/).
2. Click here to install: [dropdown_userscript.js](dropdown_userscript.js)
3. Navigate to any `impexcube.in` page to see the enhanced dropdowns in action.

## 🛠️ Technical Overview

The script uses a custom fuzzy matching algorithm that prioritizes exact matches and word boundaries while allowing for flexible subsequence matching. The UI is built using vanilla CSS and JavaScript, ensuring zero dependencies and maximum compatibility.

### Search Algorithm Highlights
- **Exact Match:** Highest priority (Score: 100)
- **Starts-with:** High priority (Score: 80)
- **Word Boundary:** Medium priority (Score: 70)
- **Strict Fuzzy:** Low priority (Score: 40-50, requires >90% character density)

## 📝 License

Developed by [Quantavil](https://github.com/quantavil). Released under the MIT License.
