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

- **Scope**: Exclusively targets visual text and math captchas (`img`, `canvas`, `svg`). Out of scope: Turnstile, reCAPTCHA v2/v3, puzzle grids, slider or audio captchas.
- **Add a provider** = a `createOpenAICompat({...})` config, or a new file implementing `Provider`. Never put keys in URLs.
- All persisted data goes through `config/schema.ts` (valibot). Never `GM_setValue` elsewhere.
- Network and storage are injected (`Http`, `KV`) so everything is testable without a browser.
- Keep the bundle unminified (script catalogs reject minified userscripts). Commit `dist/` — CI fails if it is stale.
- Model IDs rot. Don't hard-code behaviour on a model name except via `thinkingConfigFor` / `extraBody`, which must degrade gracefully (they auto-retry without the extra field).
