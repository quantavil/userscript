# AGENTS — Universal Captcha Solver

## Overview
A universal text and distorted alphanumeric captcha solver userscript powered by Google Gemini Vision models (e.g. `gemma-3-27b-it` / `gemini-1.5-flash`). It offers a point-and-click selector configuration workflow to pair any arbitrary captcha image with its target input field on any domain.

## Structure
```
universal-solver/
├── main.js        # Self-contained userscript bundle (DOM picker, image capture, Gemini API, UI)
├── README.md      # Configuration instructions and key setup guide
└── AGENTS.md      # Subproject architectural constraints and conventions
```

## Conventions & Critical Information
- **Universal Point-and-Click Selector**: Allows users to interactively click any image and corresponding text input element on the page, saving stable CSS selectors into `GM_setValue` per hostname.
- **Canvas Image Extraction**: Extracts images via offscreen HTML5 `<canvas>` rendering (`ctx.drawImage`) or direct `GM_xmlhttpRequest` binary fetching when CORS blocks standard canvas `toDataURL()` reads.
- **Gemini Vision Pipeline**: Preprocesses and downscales large images before encoding to base64 JPEG, sending requests via `GM_xmlhttpRequest` to Google's Generative Language API.
- **Non-Intrusive Floating Widget**: Provides a collapsible floating status pill with auto-solve indications, retry actions, and manual solve triggers.
- **Input Dispatching**: Dispatches standard `input` and `change` bubbling events to ensure auto-filled captcha solutions properly trigger reactive form validation in modern frameworks.
