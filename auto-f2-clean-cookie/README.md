# Auto F2 CleanCookie

A powerful, beginner-friendly userscript designed to enhance your experience with top-tier AI platforms like Arena.ai (LMArena), ChatGPT, Claude, Gemini, Meta AI, and more. 

It provides an all-in-one toolkit to manage cookies, reset sessions, bypass character limits, and streamline model comparisons.

## ✨ Features

The script is divided into three core modules, all accessible directly from your browser:

### 1. Auto F2 CleanCookie (Session Reset)
Easily reset your session and clear tracking data with a single keypress.
- **One-Click Reset**: Press `F2` to instantly clear Cookies, LocalStorage, IndexedDB, and Cache.
- **Automated Security Bypass**: Automatically handles and resets Cloudflare Turnstile and Google reCAPTCHA Enterprise challenges.
- **Tracking Removal**: Clears analytics and tracking beacons (e.g., PostHog, CF Beacons).
- **Status Panel**: Press `F4` to toggle the visibility of the visual status panel.
- **Protection Scanner**: Press `F6` to log the current page's protection status to the browser console.

### 2. Auto Splitter Lite
Bypass character limits on AI prompts by sending massive texts in smaller, manageable chunks.
- **Smart Splitting**: Automatically splits large pasted text into chunks (default 120,000 characters).
- **Auto-Send**: Sends chunks sequentially with a configurable delay.
- **Context Preservation**: Injects customizable "Wait for OK" prompts so the AI processes all parts before responding.
- **Floating UI**: Access the Splitter panel via a floating button in the bottom right corner.

## 🚀 Installation

1. Install a userscript manager extension for your browser (e.g., [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)).
2. Create a new script in your manager and paste the contents of `main.js`.
3. Save the script and navigate to any of the supported AI platforms.

## ⚙️ Configuration

The script adds a configuration menu to your userscript manager, allowing you to toggle individual modules on or off:
- **Toggle Reset Module** (Default: ON)
- **Toggle Splitter Module** (Default: ON)

## 🌐 Supported Platforms

The script is optimized for **Arena.ai (LMArena)** but includes `@match` rules for 88+ major AI platforms, including:
- ChatGPT (`chatgpt.com`, `openai.com`)
- Claude (`claude.ai`, `anthropic.com`)
- Google Gemini (`gemini.google.com`, `aistudio.google.com`)
- Perplexity (`perplexity.ai`)
- Meta AI (`meta.ai`)
- Mistral (`mistral.ai`)
- DeepSeek (`deepseek.com`)
- Grok (`grok.com`, `x.ai`)
...and many more globally recognized and regional AI leaders.

## 🛠️ Development & Structure

- `main.js`: Contains the entirety of the userscript logic.
  - **Dependencies**: No external dependencies required. Relies on standard Userscript APIs (`GM_getValue`, `GM_setValue`, `GM_registerMenuCommand`).
  - **Styling**: All CSS is grouped and injected dynamically via `GM_addStyle`.
