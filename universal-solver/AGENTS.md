# Architecture

```
src/config/     schema (valibot), matching, store (signals + KV + stats), migrations, presets
src/net/        GM_xmlhttpRequest -> Promise, AbortSignal, typed HttpError
src/providers/  gemini.ts, openai-compat.ts (+ groq.ts as config), registry; complete() + transcribe()
src/solver/     answer, grid (tile prompt + JSON parse), audio (transcript normalise), runs (grid / audio flows),
                controller (state machine, watchers, stats), guard, errors, selftest
src/image/      capture (img/canvas/svg/background), captureTiles (grid from on-screen tiles), captureAudio, numbering
src/dom/        watch (MutationObserver), picker, fill (framework-safe), click (human-paced pointer/keys), tiles, frame
src/ui/         Preact in a shadow root; native <dialog>/popover
src/flows/      setup (picker -> editor), data (import/export)
src/ext/        Firefox extension: gm-shim (GM_* on browser.storage / background fetch / popup menu),
                content + background + popup entries, api (hand-typed WebExtension surface, base64 wire format)
src/userscript.ts  userscript entry; both builds call main()
tests/          unit + e2e against the built bundle
```

- **Scope**: Visual text and math captchas (`img`, `canvas`, `svg`) and image-grid captchas (`kind: 'grid'`). Grids can be solved by pictures or by their audio version (`solveBy`, the user's choice, never an automatic fallback). Out of scope: Turnstile, reCAPTCHA v3 / invisible scoring, sliders, jigsaws.
- **Grid flow**: capture the grid image with tile numbers drawn on → prompt with the challenge text → model replies `{"tiles":[…]}` (1-based, reading order) → `parseGridAnswer` rejects any out-of-range tile *before* clicking → `humanClick` each tile (or the cell centre over the image when `tiles` is empty) → if clicked tiles start changing (new picture or fading) it is a "click until none left" grid: wait for replacements, `captureTiles`, ask again, repeat (max `MAX_DYNAMIC_PASSES`) → Verify. Static grids are detected by *nothing* changing within ~1.2 s. Clicks are synthetic (`isTrusted === false`); never claim otherwise.
- **Round cap**: automatic grid solves stop after `MAX_GRID_ROUNDS` (3) rounds within 30 s of each other, then pause with "finish by hand"; manual Solve resets. Auto triggers on a grid are ignored while a run is busy and while the challenge fingerprint (`challengeSignature`) equals the one after the last run: the script's own clicks mutate the DOM and must never start a solve.
- **Checkbox**: `rule.checkbox` is watched in its own frame for pass stats; it is clicked only if `autoCheckbox` (opt-in, default off), once per appearance, after `whenOnScreen` + a random pause. It never sets `present`, so no widget covers it.
- **Human pacing** (`dom/click.ts`): curved cursor path from the last position (or a frame edge), hover dwell, press hold, per-key typing. `timing.scale = 0` in tests. Do not describe it as undetectable; `isTrusted` stays false.
- **Audio**: `Provider.transcribe`. Gemini uses `generateContent` with inline audio; OpenAI-compatible uses `/audio/transcriptions` (multipart; OpenRouter JSON base64 via `sttBody: 'json'`). Model: `settings.audioModels[provider]` → `defaultAudioModel` → vision model.
- **Stats**: `store.recordStat` re-reads storage before writing (the challenge and checkbox frames write the same key).
- **Presets** (`config/presets.ts`): built-in rules the user adds with one click (reCAPTCHA v2; hCaptcha marked experimental). Opt-in only; never auto-installed. `presetState`/`presetRules` offer an update when a stored copy is older, keeping `USER_FIELDS`.
- **Providers**: `gemini`, `groq`, `openrouter`, `openai` (= custom endpoint, `keyOptional`, URL from `openaiBaseUrl`). `configProblem()` is the single check for missing URL/key/model. `migrateOpenRouter` moves v2.0 users whose generic provider pointed at OpenRouter.
- **Frames**: the script runs in every frame (no `@noframes`; grid challenges live in iframes). In a frame (`IN_FRAME`): register no menu commands, mount the UI only when the captcha element is present (`controller.present`), and use `settings.ui.frame` for the widget's position (starts minimised). Keep it that way; ad frames are everywhere.
- **Add a provider** = a `createOpenAICompat({...})` config, or a new file implementing `Provider`. Never put keys in URLs.
- **Two builds, one solver**: `build.ts` writes the userscript and `dist/firefox/` (MV3, `background.scripts`, `strict_min_version` 140) plus a reproducible zip. The extension gets its GM_* from `src/ext/gm-shim.ts`, loaded as a *separate* content script before `content.js` (Biome sorts imports, so in-bundle ordering can't be relied on); `content.js` waits for `__ucsReady` (storage preloaded into memory) then `store.reload()` + `main()`. Solver code must keep using only the GM_* subset the shim implements: `GM_getValue/SetValue/ListValues/AddValueChangeListener/RegisterMenuCommand/xmlhttpRequest` (method, url, headers, string or FormData body, `responseType: 'blob'`, timeout, onload/onerror/ontimeout/onabort). Adding a GM API means adding it to the shim and `tests/ext.test.ts`.
- **Extension network**: content scripts obey the page's CORS, so every request goes over a `ucs-http` port to `background.ts`, which fetches with the host permission. Bodies and blobs cross as base64 (`WireFile`); disconnecting the port aborts. Run `bunx web-ext lint -s dist/firefox` after manifest changes (one known warning: Preact's internal `innerHTML`).
- **License**: GPL-3.0-or-later (`LICENSE`, `package.json`, `@license`, the notice `build.ts` prepends to every shipped script). Dependencies are MIT, which is compatible.
- All persisted data goes through `config/schema.ts` (valibot). Never `GM_setValue` elsewhere.
- Network and storage are injected (`Http`, `KV`) so everything is testable without a browser.
- Keep the bundle unminified (script catalogs reject minified userscripts). Commit `dist/` (users install from it); rebuild before every commit.
- Model IDs rot. Don't hard-code behaviour on a model name except via `thinkingConfigFor` / `extraBody`, which must degrade gracefully (they auto-retry without the extra field).
