# Icegate Captcha Solver

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

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
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. On any supported Icegate portal, open your userscript manager menu (Tampermonkey/Violentmonkey icon).
3. Select **"⚙️ Configure Gemini API Key"** and paste your key.
   *(Alternatively, on first run when solving, the script will prompt you for your key and save it securely in local storage).*

## Usage
- The script automatically activates on supported Icegate pages.
- Look for the **Icegate Solver** widget in the bottom-right corner.
- It will automatically solve the captcha on page load.
- If it fails or you refresh the captcha manually, click the **Retry** button on the widget.
