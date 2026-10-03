# Universal Captcha Solver

Solves text, math and image-grid captchas on any site using AI vision models. Supports any AI vision endpoint (Google Gemini, Groq, OpenRouter, OpenAI, Ollama, LM Studio, or local OpenAI-compatible APIs).

> [!IMPORTANT]
> **Scope**
> - ✅ Distorted text and arithmetic captchas in `<img>`, `<canvas>` or `<svg>`: the answer is typed into a field.
> - ✅ **Image grids** ("Select all images with buses", 3x3 / 4x4): the whole grid is sent to the model with tile numbers drawn on, the model replies `{"tiles":[2,6,9]}`, and those tiles are clicked, then Verify.
> - ❌ Token / behavioural captchas: Cloudflare Turnstile, reCAPTCHA v3, invisible scoring
> - ❌ GeeTest sliders, rotation and jigsaw puzzles; Arkose / FunCAPTCHA; audio captchas
>
> **Image grids, honestly:** clicks are synthetic DOM events (a userscript cannot move the real mouse), so `isTrusted` is false. Most tile grids accept them; a vendor can choose not to. reCAPTCHA may still reject a correct answer based on its own risk score. "Click until none are left" rounds that swap single tiles are not handled; nor are grids where each tile is a separate image (only the picked image is sent).

## Install
1. Install a userscript manager (Tampermonkey / Violentmonkey).
2. Open `dist/universal-solver.user.js` (raw) and confirm.
3. Settings → **AI provider** → paste a key → **Test with a sample captcha**.
4. On a page with a text captcha: **Configure this page** → click the image, then the answer box. Done.

### Image-grid captchas (iframes)
Grid challenges such as reCAPTCHA's live in an iframe, so the script runs in frames too (no `@noframes`). To keep ad frames quiet, frames register **no menu entries** and show the widget only once the captcha is actually present. Set up from inside the frame:
1. Open the challenge, click its header text once so the frame has keyboard focus, press **`Alt+Shift+G`**.
2. Click the grid image → one tile (widens to all tiles; Esc = click by position) → the "Select all…" text → Verify.
3. In the editor, keep the pattern on the frame's own page (e.g. `www.google.com/recaptcha/api2/bframe`), not the whole host, so the checkbox frame is left alone.

For reCAPTCHA, `img[class^="rc-image-tile-"]` as the grid image and `td.rc-imageselect-tile` as tiles (with tiles per side = 0/auto) cover both 3x3 and 4x4.

Upgrading from v1: rules and your API keys are preserved and migrated automatically.

## Features
- Two-click setup with a live selector preview, match counter, and ↑/↓ to widen/narrow the target
- Per-site options: submit button, charset, case, length, math mode, extra hint
- Pattern scoping: `site.com`, `*.site.com`, `site.com/login`, `site.com/app/*` (most specific wins)
- Auto-solve with a circuit breaker; retries 429/5xx; clear error messages ("model retired", "key rejected")
- Draggable, dark-mode, keyboard-accessible widget; click the answer to copy
- Shortcuts: `Alt+Shift+S` solve, `Alt+Shift+C` configure, `Alt+Shift+G` configure an image grid
- Export/import rules (API keys never exported); synced across tabs

## Develop
```sh
bun install
bun run dev      # rebuild on change
bun run check    # tsc + biome + tests
bun run build    # -> dist/universal-solver.user.js
```
Stack: Bun · TypeScript (strict) · Preact + signals · Valibot · @medv/finder · Biome. See `AGENTS.md` for architecture.
