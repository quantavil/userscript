# Auto CleanCookie - for AI

A premium, high-end userscript toolkit designed for professional-grade interaction with 60+ AI platforms. Optimized for Arena.ai (LMArena) but fully compatible with ChatGPT, Claude, Gemini, and more.

## ✨ Premium Features

Built with a "Ethereal Glass" aesthetic, this script provides a high-performance utility suite with fluid motion choreography and sophisticated UI components.

### 1. Unified Reset Module (F2)
- **Session Purge**: Press `F2` to trigger a "best-effort" reset of Cookies, LocalStorage, IndexedDB, and Cache. 
- **Privacy First**: Automatically clears tracking beacons (PostHog, Cloudflare Ray ID, etc.) and resets captcha providers.
- **Visual Feedback**: A frosted status float displays real-time progress for all clearing operations.

### 2. Auto Splitter Lite (Ctrl+Shift+S)
- **Massive Ingest**: Split large texts into chunks (default 120,000 chars) to bypass model context limits.
- **Smart Sequencing**: Automatic "Wait for OK" prompting ensures the AI doesn't start analyzing until the entire dataset is received.
- **Secure Auto-Send**: Only triggers on a verified whitelist of major AI hosts (ChatGPT, Claude, Gemini, Perplexity, etc.) to ensure submission stability.
- **Aesthetic Panel**: Toggle the sophisticated splitter panel via FAB dock or shortcut (`Ctrl+Shift+S`).

## 🚀 Setup

1. Install a userscript manager (e.g., [Tampermonkey](https://www.tampermonkey.net/)).
2. Import `main.js`.
3. Open any supported AI platform — the FAB dock will initialize in the bottom right.

## ⚙️ Configuration

Toggle features via the Userscript Manager menu:
- **✅ Session Reset**: Toggle core clearing logic.
- **✅ Auto Splitter Lite**: Toggle the splitter interface.

## 🌐 Elite Compatibility

Optimized for **Arena.ai**, with robust support across 80+ domains:
- **Global Leaders**: ChatGPT, Claude, Gemini, meta.ai, Mistral, Grok (x.ai).
- **Regionals**: DeepSeek, Kimi, Baidu ERNIE, Tongyi Qwen, Doubao.

## 🛠️ Infrastructure

- `main.js`: Consolidated, standardized logic.
- **Design System**: Vanilla CSS with Geist/Outfit typography and cubic-bezier transitions.
- **Security**: Strict host whitelisting for automated interactions.
