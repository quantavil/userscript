# Better ICEGATE

- Use Bun, TypeScript, Preact, Vite+ and vite-plugin-monkey. Build output is `dist/`.
- Keep portal integration separate from favorites state and UI as features grow. Avoid persisting credentials or copying authentication tokens.
- ICEGATE uses Angular hash routes and per-tab session storage. Opening same-origin service pages with an opener can preserve session state; changing that behavior requires live verification. eSANCHIT's native dashboard action may perform session setup.
- The keep-awake module dispatches a scroll event to reset ICEGATE’s client-side idle timer only while its session is active; it must not alter tokens, send requests, or prevent normal logout. Server-side expiry still applies.
- Shipping Bill enhancements use the portal's date form and client-side page-size control; do not interfere with other document types or the portal's search and download actions.
- Shipping Bill filtering and CSV export operate on visible rendered rows, not unseen pages. Treat CSV fields as untrusted spreadsheet input and preserve formula protection. Date presets use the browser's local calendar and only run a search when the user requests it.
- Recheck delayed date initialization on SPA route changes. Pagination settings and favorites are shared across tabs through site storage; preserve the portal's own eSANCHIT sign-in handoff.
- Favorites are stored locally on the services origin. Saved custom URLs may contain page parameters; never log them or authentication data.
- Run `bun test`, `bun run typecheck`, and `bun run build` after changes. Do not submit forms or alter real portal records during testing.
- Preserve GPL-3.0-or-later metadata and license.
