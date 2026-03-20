# Icegate Captcha Solver

A generic userscript to solve captchas on Icegate websites using Gemini AI.

## Features
- **AI-Powered**: Uses Google's Gemini-3-27b-it model to solve captchas with high accuracy.
- **Universal Support**: Works on:
    - `https://old.icegate.gov.in/*`
    - `https://enquiry.icegate.gov.in/*`
    - `https://foservices.icegate.gov.in/*` (New!)
- **Canvas Support**: Capable of reading captchas drawn on HTML5 `<canvas>` elements.
- **Auto-Retry**: Automatically detects when a captcha is refreshed and re-solves.
- **Floating UI**: A sleek, non-intrusive widget shows the current status and allows manual retries.

## Installation

1. Install a userscript manager like **Tampermonkey** or **Violentmonkey**.
2. Create a new script and copy the contents of `main.js`.
3. Save the script.

## Configuration
The script uses a hardcoded API key for demonstration purposes. To use your own:
1. Get an API key from [Google AI Studio](https://aistudio.google.com/).
2. Edit the `CONFIG` object in the script:
   ```javascript
   const CONFIG = {
       apiKey: 'YOUR_API_KEY_HERE',
       model: 'gemma-3-27b-it', // or gemini-3.0-flash
   };
   ```

## Usage
- The script automatically activates on supported Icegate pages.
- Look for the **Icegate Solver** widget in the bottom-right corner.
- It will automatically solve the captcha on page load.
- If it fails or you refresh the captcha manually, click the **Retry** button on the widget.
