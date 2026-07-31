# 🧞‍♂️ Form Genie

> **Privacy-first, AI-powered auto form filler for desktop & mobile.**  
> Instantly fill complex application forms, job portals, and exam sites (IBPS, NTA, SSC, UPSC) using smart teach rules, heuristics, and optional Gemini AI.

---

## ✨ Features

- 🔒 **100% Privacy-First & Local**: All profile data is stored on your device via userscript storage. Makes zero network calls when AI tier is off.
- 🎯 **Dormant by Default**: Opt-in per website via your userscript menu (`✅ Enable Form Genie on this site`). Keeps your browsing clean.
- 🎨 **Editorial "Press" Theme UI**: High-contrast, letterpress-inspired paper theme (`#f3efe4`), monospace labels, hard shadows, and smooth touch interactions.
- ⚡ **Three-Tiered Matching Engine**:
  1. **Teach-Mode Rules**: Custom per-site field mappings that always take precedence.
  2. **Smart Heuristics**: Multi-token phrase scoring, transliterated Hindi support (*pita ka naam*, *sthai pata*), and option-list signals.
  3. **Optional Gemini AI Tier**: Off by default. Sends only field descriptors (never your data) to resolve ambiguous form layouts.
- 🛠️ **Teach Mode & Custom Fields**: Create custom profile fields on the fly and map unrecognised inputs directly from an interactive on-page picker overlay.
- 🌊 **Cascading Dropdowns & Split Fields**: Automatically handles dependent selects (State → District) with dynamic observation, split email domain dropdowns, and multi-part DOB selects (Day / Month / Year).
- 📱 **Desktop & Mobile Support**: Designed for mouse and touch devices (Firefox Android + Violentmonkey, Kiwi, Safari Userscripts).

---

## 🚀 Installation

### 1. Install a Userscript Manager
- **Desktop**: [Violentmonkey](https://violentmonkey.github.io/) (Recommended) or [Tampermonkey](https://www.tampermonkey.net/).
- **Android**: Firefox for Android + Violentmonkey extension, or Kiwi Browser.

### 2. Add Form Genie
- Build `dist/form-genie.user.js` locally (see [Develop](#-development)) or install directly by opening `form-genie.user.js` in your browser.

---

## 📖 How to Use

1. **Enable on Target Site**: Open your userscript manager menu (e.g. Tampermonkey icon) and click **"✅ Enable Form Genie on this site"**. The floating stamp button (**FILL**) will appear.
2. **Fill Form**: Tap **FILL**. Form Genie scans input fields, shadow roots, and labels, matching them against your profile.
3. **Review Report**: Check the live ledger showing filled, skipped, and suggested fields. Tap any suggestion to accept and refine your profile.
4. **Teach Unmatched Fields**: Tap **Teach Mode** to overlay map tags on fields, allowing 1-click mapping or custom field creation.

---

## 🛡️ Security & Guardrails

> [!IMPORTANT]
> - **Never Fills Passwords, Captchas, or OTPs**: Security-sensitive inputs are strictly excluded during scanning.
> - **No Truncation**: Skips fields where values exceed `maxlength` constraints rather than corrupting user data.
> - **API Key Safety**: Your optional Gemini API key is stored securely in settings and is never exported in profile backups.

---

## 💻 Development

Form Genie is built with **TypeScript**, **Vite**, **vite-plugin-monkey**, and **Bun**.

```bash
# Install dependencies
bun install

# Start Vite dev server with fixture page
bun run dev

# Run full test suite (happy-dom unit + DOM integration tests)
bun test

# Typecheck TypeScript files
bun run tsc

# Build production userscript (emits dist/form-genie.user.js)
bun run build
```

### 📁 Project Structure

```
form-genie/
├── src/
│   ├── engine/       # Scan, describe, match, fill, rules, synonyms & Gemini AI
│   ├── profile/      # Schema, GM storage, date/name derivations & custom fields
│   ├── ui/           # Shadow DOM panel, FAB, profile editor, teach mode & styles
│   ├── debug.ts      # Debug mode logger and match overlay
│   └── main.ts       # Userscript entry point & menu command wiring
├── dev/              # Development fixtures & preview page
├── tests/            # Happy-DOM test suites (match, store, derive, dom)
└── dist/             # Emitted userscript (form-genie.user.js)
```

---

## 📄 License

[MIT](LICENSE) © quantavil