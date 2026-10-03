# Universal Captcha Solver

Solves text-based and math captchas on any site using AI vision models. Supports any AI vision endpoint (Google Gemini, Groq, OpenRouter, OpenAI, Ollama, LM Studio, or local OpenAI-compatible APIs).

> [!IMPORTANT]
> **Scope Notice (Text Captchas Only)**:
> This userscript currently **only solves visual text and math captchas** (alphanumeric text, distorted characters, or arithmetic equations rendered in `<img>`, `<canvas>`, or `<svg>` elements).
>
> It does **NOT** solve interactive puzzle/token captchas:
> - ❌ Cloudflare Turnstile
> - ❌ Google reCAPTCHA v2 / v3 (checkbox, image grids, behavioral tokens)
> - ❌ hCaptcha puzzle challenges
> - ❌ GeeTest (slider, rotation, jigsaw puzzles)
> - ❌ Arkose Labs / FunCAPTCHA
> - ❌ Audio captchas

## Install
1. Install a userscript manager (Tampermonkey / Violentmonkey).
2. Open `dist/universal-solver.user.js` (raw) and confirm.
3. Settings → **AI provider** → paste a key → **Test with a sample captcha**.
4. On a page with a text captcha: **Configure this page** → click the image, then the answer box. Done.

Upgrading from v1: rules and your API keys are preserved and migrated automatically.

## Features
- Two-click setup with a live selector preview, match counter, and ↑/↓ to widen/narrow the target
- Per-site options: submit button, charset, case, length, math mode, extra hint
- Pattern scoping: `site.com`, `*.site.com`, `site.com/login`, `site.com/app/*` (most specific wins)
- Auto-solve with a circuit breaker; retries 429/5xx; clear error messages ("model retired", "key rejected")
- Draggable, dark-mode, keyboard-accessible widget; click the answer to copy
- Shortcuts: `Alt+Shift+S` solve, `Alt+Shift+C` configure
- Export/import rules (API keys never exported); synced across tabs

## Develop
```sh
bun install
bun run dev      # rebuild on change
bun run check    # tsc + biome + tests
bun run build    # -> dist/universal-solver.user.js
```
Stack: Bun · TypeScript (strict) · Preact + signals · Valibot · @medv/finder · Biome. See `AUDIT.md` for what changed and why, `AGENTS.md` for architecture.
