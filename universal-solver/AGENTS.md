# Architecture

```
src/config/     schema (valibot), matching, store (signals + KV), v1 migration
src/net/        GM_xmlhttpRequest -> Promise, AbortSignal, typed HttpError
src/providers/  gemini.ts, openai-compat.ts (+ groq.ts as config), registry
src/solver/     answer (prompt + normalise), controller (state machine), guard, errors, selftest
src/image/      capture (img/canvas/svg/background), downscale, white-fill
src/dom/        watch (MutationObserver), picker, fill (framework-safe)
src/ui/         Preact in a shadow root; native <dialog>/popover
src/flows/      setup (picker -> editor), data (import/export)
tests/          unit + e2e against the built bundle
```

- **Scope**: Visual text and math captchas (`img`, `canvas`, `svg`) and image-grid captchas (`kind: 'grid'`). Out of scope: Turnstile, reCAPTCHA v3 / invisible scoring, sliders, jigsaws, audio.
- **Grid flow**: capture the grid image with tile numbers drawn on → prompt with the challenge text → model replies `{"tiles":[…]}` (1-based, reading order) → `parseGridAnswer` rejects any out-of-range tile *before* clicking → `simulateClick` each tile (or the cell centre over the image when `tiles` is empty) with a randomised pause → Verify. Clicks are synthetic (`isTrusted === false`); never claim otherwise.
- **Frames**: the script runs in every frame (no `@noframes`; grid challenges live in iframes). In a frame (`IN_FRAME`): register no menu commands, and mount the UI only when the captcha element is present (`controller.present`). Keep it that way; ad frames are everywhere.
- **Add a provider** = a `createOpenAICompat({...})` config, or a new file implementing `Provider`. Never put keys in URLs.
- All persisted data goes through `config/schema.ts` (valibot). Never `GM_setValue` elsewhere.
- Network and storage are injected (`Http`, `KV`) so everything is testable without a browser.
- Keep the bundle unminified (script catalogs reject minified userscripts). Commit `dist/` — CI fails if it is stale.
- Model IDs rot. Don't hard-code behaviour on a model name except via `thinkingConfigFor` / `extraBody`, which must degrade gracefully (they auto-retry without the extra field).
