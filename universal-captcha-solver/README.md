# <img src="icon.svg" width="32" height="32" alt=""> Universal Captcha Solver

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

Solves text, math, image-grid and audio captchas on any site using AI vision and speech-to-text models. Supports any AI vision endpoint (Google Gemini, Groq, OpenRouter, OpenAI, Ollama, LM Studio, or local OpenAI-compatible APIs).

> [!IMPORTANT]
> **Scope**
> - ✅ Distorted text and arithmetic captchas in `<img>`, `<canvas>` or `<svg>`: the answer is typed into a field.
> - ✅ **Image grids** ("Select all images with buses", 3x3 / 4x4), including **"click until there are none left"** rounds and grids where **each tile is its own picture** (hCaptcha-style).
> - ✅ **Audio version** of a grid challenge, as a per-site *choice* (not a fallback): the clip is transcribed by a speech-to-text model and typed in.
> - ❌ Token / behavioural captchas: Cloudflare Turnstile, reCAPTCHA v3, invisible scoring
> - ❌ GeeTest sliders, rotation and jigsaw puzzles; Arkose / FunCAPTCHA; hCaptcha's non-grid challenges (click a point, drag)
>
> **Honestly:** every click and keystroke is a synthetic DOM event (a userscript cannot move the real mouse), so `isTrusted` is false. The human-like pacing (curved cursor path, press hold, uneven typing) removes the obvious tells, not that one. Sites may still reject a correct answer, or refuse audio, based on their own risk score.

## Install
**Userscript** (any browser): install Tampermonkey or Violentmonkey, then open `dist/universal-solver.user.js` (raw) and confirm. Updates arrive automatically from `main`.

**Firefox extension** (Firefox 140+, desktop; 142+ on Android): no userscript manager needed. The toolbar button replaces the manager menu.
- **Try it now:** `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* → pick `dist/firefox/manifest.json`. Firefox removes temporary add-ons when it restarts.
- **Keep it installed:** release Firefox only installs add-ons **signed by Mozilla**. Upload `dist/universal-solver-firefox.zip` to [addons.mozilla.org](https://addons.mozilla.org/developers/) as *On your own* (unlisted: signed automatically, no public listing) and install the `.xpi` it gives back. AMO asks for the source too, since the scripts are bundled: upload the repository's `universal-captcha-solver/` folder; `bun install && bun run build` reproduces `dist/`. Firefox Developer Edition, Nightly and ESR can instead set `xpinstall.signatures.required` to `false` in `about:config` and install the zip directly.
- Settings and rules are kept by the extension, separate from the userscript's. Move them with Backup → Export / Import (API keys are not exported).
- If the toolbar popup shows **Allow access to websites**, Firefox's per-site permission was turned off (about:addons → the add-on → Permissions); the solver cannot see captchas without it.

Then:
1. Settings → **AI provider** → paste a key → **Test with a sample captcha**.
2. On a page with a text captcha: **Configure this page** → click the image, then the answer box. Done.

### reCAPTCHA v2 (one click)
Settings → **Sites** → **reCAPTCHA v2**. Then on any site:
1. **You** tick "I'm not a robot" (or switch on auto-tick, below).
2. If Google opens a challenge, the script, running inside that frame, solves it:
   - **Pictures** (default): reads "Select all images with…", sends the grid with tiles numbered, clicks the tiles the model returns. In "click until none left" grids it waits for the replacement pictures, re-checks only what is on screen now, and repeats until the model finds none (max 6 passes). Then it presses the blue button (same id for Verify / Next / Skip).
   - **Audio**: presses the headphones button, downloads the clip, transcribes it, types the words key by key, presses Verify.
3. A new challenge (wrong answer, or "Next") is solved again automatically, **at most 3 rounds**; then it stops and says "finish by hand". Clicking Solve continues.

**Pictures or audio:** the 🖼 / 🔊 button in the widget switches the site's rule; so does *Solve by* in the rule editor. Google sometimes refuses audio for a network ("automated queries"); switch back to pictures then.

**Auto-tick the checkbox** (off by default): edit the rule → *"I'm not a robot" checkbox* → *Tick it for me*. It waits until the checkbox is on screen in a visible tab, pauses 1–2.5 s, glides to a random point inside it along a curve and presses for ~60–130 ms, once per appearance. It is still a synthetic click: Google may serve more challenges than when you tick it yourself.

Already added the preset in 2.2? The button now reads **Update reCAPTCHA v2**; your on/off, auto, audio and auto-tick choices are kept.

### hCaptcha grid (experimental)
Settings → **Sites** → **hCaptcha grid (experimental)**. Each hCaptcha tile is a separate picture, so the grid is built from the tiles on screen. Its selectors are not verified against the live widget; if it says "Found 0 tiles" or "No challenge text", re-pick them in the editor. Only the 3x3 "click each image containing…" type is handled.

### Other image grids (iframes)
The script runs in frames too (no `@noframes`). Frames register **no menu entries** and show the widget (minimised, top-right, with its own position) only once the captcha is present. Set up from inside the frame: click its header text once so the frame has focus, press **`Alt+Shift+G`**, then click the grid image (or the box holding the tiles) → one tile (widens to all; Esc = click by position) → the "Select all…" text → the Verify button. Keep the pattern on the frame's own page. Audio and checkbox selectors are in the editor.

## AI providers
One **Provider** dropdown: Google Gemini (default `gemini-3.5-flash-lite`), Groq, OpenRouter, or **Custom endpoint** (any OpenAI-compatible `/v1` URL: OpenAI, Ollama, LM Studio, vLLM; key optional).

| Provider | Vision model | Speech-to-text (audio captchas) |
|---|---|---|
| Gemini | `gemini-3.5-flash-lite` | same model (Gemini hears audio) |
| Groq | `qwen/qwen3.8-27b` | `whisper-large-v3-turbo` |
| OpenRouter | pick one | `openai/whisper-large-v3` |
| Custom | pick one | `whisper-1` (`/audio/transcriptions`) |

Audio needs a **speech-to-text** (transcription) model, not text-to-speech. **Fetch list** loads the vision models your account can use (OpenRouter's text-only models are left out); **Other…** lets you type any id.

Grid answers are requested as JSON the API enforces where it can (Gemini structured output, OpenAI-style `response_format`). An endpoint that rejects that gets one plain retry, and the plain request is used for that model from then on.

## Features
- Two-click setup with a live selector preview, match counter, and ↑/↓ to widen/narrow the target
- Per-site options: submit button, charset, case, length, math mode, extra hint
- Pattern scoping: `site.com`, `*.site.com`, `site.com/login`, `site.com/app/*` (most specific wins)
- Auto-solve with a circuit breaker; retries 429/5xx; clear error messages ("model retired", "key rejected")
- **Stats** per site and model in Settings → Sites: tries, answered, errors, passes (checkbox turned green; includes passes without a challenge), average time. Use them to compare models.
- Draggable, dark-mode, keyboard-accessible widget; click the answer to copy
- Shortcuts: `Alt+Shift+S` solve, `Alt+Shift+C` configure, `Alt+Shift+G` configure an image grid
- Export/import rules (API keys never exported); synced across tabs

## Develop
```sh
bun install
bun run dev      # rebuild on change
bun run check    # tsc + biome + tests
bun run build    # -> dist/universal-solver.user.js, dist/firefox/, dist/universal-solver-firefox.zip
```
Stack: Bun · TypeScript (strict) · Preact + signals · Valibot · @medv/finder · Biome. See `AGENTS.md` for architecture.

## License
Copyright (C) quantavil. [GPL-3.0-or-later](LICENSE): you may use, change and share it, and anything you distribute that is built on it must be under the same license with its source available. Versions up to 2.3.0 were released under MIT and stay MIT for anyone who already has them.
