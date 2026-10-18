# Reddit Manager audit — 2026-10-18

Scope: remove the standalone Telegram downloader, audit Reddit Manager's API and batch operations, and improve its responsive panel without adding runtime dependencies.

Design: a readable account utility with subscription tools up front, destructive actions behind a disclosure, Reddit orange and neutral light/dark colors, touch-sized controls, and a viewport-bounded panel. Confirmations replace panel content so they remain reachable on short screens. Preserve typed count confirmation, backups, pause, cancellation, and progress.

Verification will cover API response failures, import validation, pagination, batch accounting, confirmation cleanup, stale refreshes, keyboard use, and responsive layouts. Browser checks use local fixtures; no live account mutations are needed.

## Findings addressed

- Confirmation dismissal resolved the promise without removing its sheet; closing during a read could later create a hidden confirmation. Sheets now clean up and late confirmations cancel.
- A generation check ran after refresh had already written to the UI. Refresh reports now check that the panel is still open and idle before writing.
- Subscription-only updates cleared unrelated history counts. Updates now preserve fields they did not read.
- Failed overwrites could proceed to deletion, and HTTP 200 deletion errors were counted as successful work. Mutation responses now receive explicit validation; link posts skip text overwrite.
- Subscription batches stopped only when every item from the start failed. Both batch types now stop after three consecutive failures with accurate accounting.
- Listing duplicates and cursor cycles could duplicate mutations or misrepresent complete exports. Listings deduplicate entries and reject cursor cycles.
- Import normalization could turn malformed names and external URLs into subscription targets. Imports now validate entries before confirmation.
- Retry jitter could run before the server's requested delay, and network failures could reuse a previous response's status/header state.
- Older concurrent reads could overwrite newer forced-refresh cache entries. Cache generations now prevent stale subscription and identity results from replacing current data.
- The Biome configuration used an incompatible v1 schema; it now matches the installed v2 tool.
- The prior documentation overstated overwrite privacy, rate guarantees, and focus trapping. README and project guidance now describe actual behavior and limits.

Reddit's archived controller uses `@noresponse` for deletion, which returns an empty JSON object. Successful `{}` responses remain supported alongside JSON error detection. Primary source: [Reddit validator](https://github.com/reddit-archive/reddit/blob/master/r2/r2/lib/validator/validator.py#L277).


## Verification

Browser fixtures were inspected at 320×568, 390×844, 768×1024, 1024×500, and 1280×577. The 320px panel remained within the viewport without horizontal overflow. Light and dark layouts, expanded cleanup, typed confirmation, and Escape cancellation were exercised. Axe reported zero violations in the default light view, expanded dark view, and the final typed confirmation (no incomplete checks). The final UI shows progress only after work starts. Escape removed the confirmation and restored content.

Checks use fixture responses and regression tests. No live Reddit mutations were performed. Pause and cancellation intentionally take effect between items; an active request's retries may delay stopping.

Final checks: 56 tests across three suites, TypeScript, Biome, production build, and `git diff --check` passed. The rebuilt userscript is version 3.3.1. Both batch operations share the same queue implementation; link posts use the shorter single-request delay.

Dependency refresh: Bun updated the package manifest and lockfile to current registry releases, including Vite+/Vite core 1.3.0 and happy-dom 21.0.3, plus transitive PostCSS and Rollup updates. The Vite override matches the direct dependency. `bun outdated` reported no outdated direct dependencies.

Release palette verification: Reddit orange and neutral gray light/dark themes were inspected at 390×844 against the rebuilt 3.3.1 bundle. Both themes passed Axe with zero violations and no incomplete checks. All 56 tests, TypeScript, Biome, and the production build passed again after the dependency and palette updates.
