# Better ICEGATE

- Use Bun, TypeScript, Preact, Vite+ and vite-plugin-monkey. Build output is `dist/`.
- Keep portal integration separate from favorites state and UI as features grow. Avoid persisting credentials or copying authentication tokens.
- ICEGATE uses Angular hash routes and per-tab session storage. Shortcuts support both same-tab navigation and new-tab navigation via the arrow action. Opening same-origin service pages with an opener can preserve session state; eSANCHIT's native dashboard action performs SSO session setup.
- The keep-awake module dispatches a scroll event to reset ICEGATE’s client-side idle timer only while its session is active; it must not alter tokens, send requests, or prevent normal logout. Server-side expiry still applies.
- Shipping Bill enhancements use the portal's date form and client-side page-size control; do not interfere with other document types or the portal's search and download actions.
- Shipping Bill filtering and CSV export operate on visible rendered rows, not unseen pages. Treat CSV fields as untrusted spreadsheet input and preserve formula protection. Date presets use the browser's local calendar and only run a search when the user requests it.
- Recheck delayed date initialization on SPA route changes. Pagination settings and favorites are shared across tabs through site storage; preserve the portal's own eSANCHIT sign-in handoff.
- Favorites are stored locally on the services origin. Saved custom URLs may contain page parameters; never log them or authentication data.
- eSANCHIT document-type enhancement (`src/esanchit/`) replaces `select[id^="docTypeSelect_"]` with a searchable combobox. The native select stays the source of truth: set its value and dispatch `input`/`change`. The popup is a fixed-position body child, so table cells cannot clip it. The panel, keep-awake and Shipping Bill modules still run only on `foservices.icegate.gov.in`; the dropdown runs on all `@match` hosts. Recent picks are stored under `better-icegate.esanchit-recent.v1`.
- Keep-awake ticks every 30 s and on visibility/focus/pageshow; it cannot beat server-side expiry or browser tab freezing/discarding.
- Run `bun test`, `bun run typecheck`, and `bun run build` after changes. Do not submit forms or alter real portal records during testing.
- Preserve GPL-3.0-or-later metadata and license.
