# Reddit Manager

Self-contained TypeScript userscript built with Bun, Vite+, and vite-plugin-monkey. No runtime dependencies. GPL-3.0-or-later metadata and LICENSE must remain consistent.

## Structure

- `src/api.ts`: same-origin Reddit requests, authentication, retry backoff, paginated listings, subscription mutations, and text overwrite/deletion.
- `src/portability.ts`: import/export, confirmations, sequential batches, pause/cancel checks, progress and result reporting.
- `src/panel.ts`: Shadow DOM interface and confirmation lifecycle. Background refresh reports must be guarded against stale writes.
- `src/panel.css`: responsive viewport bounds, light/dark theme, touch targets, focus states, reduced motion.
- `tests/`: API and operation regressions plus panel lifecycle tests.

## Constraints

- Leave-all and post/comment deletion require typed count confirmation. Leave-all downloads a backup first.
- Validate Reddit JSON errors as well as HTTP status. Editable text overwrite must succeed before deletion. Skip overwrite for link posts without a text body.
- Overwrite cannot guarantee privacy from archives or copies. Do not claim it can.
- Profile listings expose at most 1,000 visible items per endpoint. Counts describe returned history, not the complete account.
- Stop after three consecutive item failures and report successful, failed, and untouched work accurately.
- Pause/cancel is checked between items. An active item and request retries may finish before stopping.
- Confirmation cancellation must remove the sheet and restore content/focus. Closing during a read must not leave a late confirmation waiting in a hidden panel.
- Use Reddit orange and neutral gray surfaces in both light and dark themes, with accessible text contrast.
- Keep destructive actions in the cleanup disclosure. Keep confirmation controls reachable on short screens and support keyboard focus wrapping.

## Verification

Run `bun run test`, `bun run tsc`, `bun run lint`, and `bun run build`. `bun test` bypasses the configured happy-dom runner. Rebuild tracked `dist/reddit-manager.user.js` after source changes.

For UI checks use local mocked API fixtures at phone, tablet, and desktop widths; do not mutate a live Reddit account to test the interface. See `docs/audit.md` for the latest audit and verification record.
