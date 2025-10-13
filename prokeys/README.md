

# Smart Abbreviation Expander

An intelligent text expansion userscript with abbreviation expansion, a text palette, and AI grammar correction.

## Main Features

- **Abbreviation Expansion**: Use `Shift+Space` to quickly expand predefined abbreviations.
- **Palette Interface**: Use `Alt+P` to open the abbreviation selection palette.
- **AI Grammar Correction**: Use `Alt+G` to correct grammar and adjust tone via the Gemini API.
- **Template Variables**: Supports dynamic content like `{{date}}`, `{{time}}`, `{{day}}`, `{{clipboard}}`, and `{{cursor}}`.

## Installation

1.  Install a userscript manager like [Tampermonkey](https://www.tampermonkey.net/).
2.  Click [Install Script](https://github.com/your-namespace/smart-abbreviation-expander/raw/main/smart-abbreviation-expander.user.js).
3.  Add your Gemini API key in the script configuration.

## Usage

- **Expand Abbreviation**: Type an abbreviation and press `Shift+Space`.
- **Open Palette**: Press `Alt+P` in a text field.
- **AI Correction**: Select text or focus a text field and press `Alt+G`.

## Configuration

### Gemini API Key

Edit the `CONFIG.gemini.apiKey` value in the script and add your API key:

```javascript
gemini: {
    // ...
    apiKey: 'YOUR_GEMINI_API_KEY_HERE'
}
```

### Custom Abbreviations

Use `Alt+P` to open the palette, then click "Edit JSON" to edit the abbreviation dictionary.

## Template Variables

- `{{date}}` - Current date
- `{{time}}` - Current time
- `{{day}}` - Day of the week
- `{{clipboard}}` - Clipboard content
- `{{cursor}}` - Cursor position

## License

MIT License