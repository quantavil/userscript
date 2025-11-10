# SnippetForge

**AI-Powered Smart Text Expander**

SnippetForge is a powerful userscript that transforms your typing experience with intelligent text expansion, AI-powered grammar correction, and a sophisticated template engine. Expand abbreviations, insert dynamic content, and polish your writing—all with a few keystrokes.

---

## Features

| Feature | Description |
|---------|-------------|
| 🚀 **Smart Expansion** | Type abbreviations like `brb` and press `Shift+Space` to instantly expand them |
| 🎨 **Template Engine** | Use dynamic tags: `{{date}}`, `{{time}}`, `{{clipboard}}`, `{{cursor}}` |
| 🤖 **AI Correction** | Select text and press `Alt+G` to polish grammar/tone with Gemini AI |
| 📚 **Visual Palette** | Press `Alt+P` to browse, search, and manage all your snippets |
| ⚙️ **In-Panel Settings** | Customize hotkeys, AI tone, and FAB visibility without leaving the page |
| 📦 **Dictionary Sync** | Export/import your snippets as JSON for backup or sharing |
| 🎯 **Universal Support** | Works in textareas, inputs, and contenteditable areas across all websites |
| 💾 **Smart Fallback** | If no text field is focused, inserts at the end of the last used field |

---

## Installation

### Prerequisites
- A userscript manager: [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), or [Greasemonkey](https://www.greasespot.net/)

### Steps
1. Create a new userscript in your manager
2. Copy the entire `SnippetForge` script into it
3. Save and enable the script
4. **Important**: Add your Gemini API key in the `CONFIG.gemini.apiKey` field (found near the top of the script)

```javascript
// In the script header:
const CONFIG = {
  // ... other settings
  gemini: {
    apiKey: 'YOUR_API_KEY_HERE', // ← Replace with your key
    // ...
  }
};
```

*Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)*

---

## Quick Start

### Basic Expansion
1. Click any text field on a webpage
2. Type `ty` and press `Shift+Space`
3. Watch it expand to "Thank you!"

### Using the Palette
1. Press `Alt+P` to open the snippet palette
2. Type to search your snippets
3. Use `↑`/`↓` arrows to navigate
4. Press `Enter` to insert or click any snippet

### AI-Powered Correction
1. Select text in any editable field (or place cursor in an empty field)
2. Press `Alt+G`
3. Wait a moment while Gemini rewrites it with improved grammar and tone

---

## Template Syntax

Create powerful dynamic snippets using these tags:

| Tag | Example Output | Description |
|-----|----------------|-------------|
| `{{cursor}}` | *(sets cursor position)* | Place cursor here after expansion |
| `{{date}}` | `2024-01-15` | Current date (ISO format) |
| `{{date:long}}` | `January 15, 2024` | Long date format |
| `{{date:mdy}}` | `01/15/2024` | US date format |
| `{{time}}` | `02:30 PM` | Current time (12-hour) |
| `{{time:24}}` | `14:30` | Current time (24-hour) |
| `{{day}}` | `Monday` | Full weekday name |
| `{{clipboard}}` | *(your clipboard content)* | Paste clipboard contents |

### Example Templates

```javascript
sig: Best regards,\n{{cursor}}\n— John Doe
log: [{{date:iso}} {{time:24}}] {{cursor}}
track: Tracking: {{clipboard}} — Check status at https://example.com/track
reply: Thanks for your message on {{day}}. I'll review it and get back to you soon. {{cursor}}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+Space` | Expand abbreviation before cursor |
| `Alt+P` | Open snippet palette |
| `Alt+G` | AI-correct selected text or entire field |
| `↑`/`↓` | Navigate palette items |
| `Enter` | Insert selected snippet |
| `Escape` | Close palette/settings |

### Customizing Shortcuts
1. Open the palette (`Alt+P`)
2. Click the ⚙️ settings icon
3. Click "Change" next to any hotkey
4. Press your desired key combination
5. Changes save automatically

---

## Settings & Customization

### Accessing Settings
- Press `Alt+P`, then click the gear icon
- Or use your userscript manager's menu commands

### Available Options

| Setting | Options | Description |
|---------|---------|-------------|
| **FAB Toggle** | on/off | Show/hide the floating button at the top-right |
| **AI Tone** | neutral, friendly, formal, casual, concise | Personality of Gemini corrections |
| **Expand Hotkey** | any Space-based combo | Default: `Shift+Space` |
| **Palette Hotkey** | any key combination | Default: `Alt+P` |
| **Correct Hotkey** | any key combination | Default: `Alt+G` |

---

## Dictionary Management

### Exporting
1. Open Settings → Dictionary section
2. Click "Export JSON"
3. Save the file to your computer

### Importing
1. Open Settings → Dictionary section
2. Click "Import JSON"
3. Select a valid SnippetForge dictionary file
4. Snippets merge with your existing ones

### Resetting
- Use "Reset to Defaults" to restore the built-in dictionary
- **Warning**: This cannot be undone

---

## Advanced Usage

### Fallback Insertion
If you trigger expansion without a focused text field, SnippetForge intelligently:
1. Uses the last field you edited
2. Falls back to the first visible text field on the page
3. Inserts at the end of the content

### ContentEditable Support
SnippetForge fully supports rich text editors (Gmail, Notion, etc.) with:
- Preserved formatting
- Correct cursor positioning
- Multi-line expansions

### Performance Notes
- **Search Debouncing**: Searches wait 150ms after you stop typing
- **Toast Throttling**: Status messages won't spam you
- **Clipboard Timeout**: Reads clipboards for 350ms before giving up

---


