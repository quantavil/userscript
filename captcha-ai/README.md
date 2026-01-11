# Icegate Captcha Solver

A strict, high-performance Userscript to automatically solve captchas on the [Icegate](https://old.icegate.gov.in/) login and enquiry portals using Google's generative AI models.

## Features

-   **AI-Powered**: Uses Google's `gemma-3-27b-it` (or configured model) for high-accuracy text recognition.
-   **Auto-Detection**: Instantly detects captcha images on the page.
-   **Roboust Handling**: Automatically re-solves when the captcha is refreshed.
-   **Status Indicators**:
    -   🟡 Yellow: Solving...
    -   🟢 Green: Success
    -   🔴 Red: Error
-   **Manual Trigger**: Adds a discrete "🤖 Solve" button for manual control.

## Installation

1.  **Install a Userscript Manager**:
    -   [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
    -   Violentmonkey

2.  **Add the Script**:
    -   Create a new script in your manager.
    -   Copy and paste the content of `main.js`.
    -   Save.

## Configuration

Edit the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
    apiKey: 'YOUR_API_KEY_HERE', // Get from Google AI Studio
    model: 'gemma-3-27b-it',     // Or 'gemini-1.5-flash'
    // ...
};
```

## Security Note

The script uses `GM_xmlhttpRequest` to bypass CORS restrictions for the API call. Your API key is stored locally in the script. Ensure you do not share your script with the hardcoded key.
