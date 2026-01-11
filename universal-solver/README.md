# Universal Captcha Solver Userscript

A powerful, universal captcha solver userscript that uses the Google Gemini API to solve text-based captchas on any website. It features a modern, aesthetic UI and a point-and-click configuration system.

## Features

-   **Universal Compatibility**: Works on any website with a captcha image and input field.
-   **Gemini AI Powered**: Uses Google's Gemini Vision models (default: `gemma-3-27b-it`) for high-accuracy solving.
-   **Point-and-Click Setup**: Easily configure new sites by clicking the captcha image and the input box.
-   **Auto-Solve**: Automatically detects and attempts to solve captchas on page load or when the image updates.
-   **Smart Optimization**: Automatically scales down large images to ensuring fast API responses and low latency.
-   **Robust & Secure**: Handles cross-origin images, prevents memory leaks, and manages concurrency safely.
-   **Aesthetic UI**: A beautiful, non-intrusive widget that can be minimized.

## Installation

1.  **Install a Userscript Manager**:
    -   [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
    -   Violentmonkey

2.  **Install the Script**:
    -   Create a new script in your manager.
    -   Copy and paste the contents of `main.js` into the editor.
    -   Save the script.

## Configuration

### Setting the API Key

1.  Go to any website.
2.  Open your Userscript Manager menu (usually the extension icon).
3.  Select **"🔑 Set API Key"**.
4.  Enter your Google Gemini API Key. You can get one for free at [Google AI Studio](https://aistudio.google.com/).
5.  (Optional) Enter a custom model name (e.g., `gemini-1.5-flash`).

### Configuring a Website

1.  Navigate to a page with a captcha.
2.  Open the Userscript Manager menu.
3.  Select **"⚙️ Configure Captcha Solver"**.
4.  **Step 1**: Click on the **Captcha Image**.
5.  **Step 2**: Click on the **Answer Input Field**.
6.  The page will reload, and the solver will activate automatically.

## Usage

-   **Auto-Solve**: The widget will show "Solving..." automatically when a configured captcha is detected.
-   **Manual Solve**: Click the "Solve" button on the widget to trigger a new attempt.
-   **Minimize**: Click the robot icon 🤖 to minimize the widget to a floating bubble.
-   **Reset**: Use the Userscript menu to reset configuration for the current site or globally.

## Troubleshooting

-   **"Image extraction failed"**: The image might be protected by strict CORS headers that prevent canvas access. The script attempts to bypass this but may fail on some strictly secured sites.
-   **"API Error"**: Check your API key and ensure you have quota available.
