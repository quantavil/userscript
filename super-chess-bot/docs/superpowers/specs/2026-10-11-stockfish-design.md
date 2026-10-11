# Stockfish userscript architecture

Goal: strong local chess search with low move latency and less custom code. Preserve the userscript distribution, Bun/Vite build, GPL-3.0-or-later license, settings, board arrows, and input confirmation.

Architecture: isolate Chess.com behind an adapter with Move event subscription and MutationObserver fallback. Use one persistent single-threaded Stockfish WASM worker, initialized before play. Serialize UCI requests; reject results from obsolete positions; bounded cancellation must not lose engine state except for recovery. Use position history for repetition. One controller owns execution, with one move budget and no post-search thinking delay. Never run chess searches on the page thread. Replace custom SAN/rules with chessops. Replace speculative premove chains with optional background pondering; never submit moves before the actual position is validated.

UI: Preact + Signals in Shadow DOM with compiled Tailwind 4 CSS. Preserve core settings and capped logs. Validate stored settings through Zod 4 Mini. Biome and Knip run only during development; TypeScript strict remains required.

Engine distribution: use a pinned prebuilt Stockfish lite single-threaded package. Bundle script and WASM as userscript resources, cache downloads before play, and expose clear initialization failure. Verify the selected build handles stop during search and does not require SharedArrayBuffer. Do not pretend initialization time is search latency.

Verification: UCI queue/cancellation/stale reply tests, event subscription cleanup, single-delay execution, invalid settings, production build, real Chromium bot-page smoke test. Measure warmed search latency and distinguish it from page input acceptance. No speculative claims of Elo or universal fastest implementation.
