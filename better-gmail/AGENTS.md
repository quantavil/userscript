# Better Gmail

A local Gmail userscript with readable inbox rows and copy controls. Preserve the existing dependencies. Do not add network access or storage without a specific requirement.

Use Bun, Vite+, TypeScript, and vite-plugin-monkey. `src/main.ts` starts the runtime; independent behavior is in `src/features/`, shared DOM helpers in `src/core/`, Gmail DOM selectors in `src/selectors.ts`, and presentation in `src/style.css`. Tests use Vite+ and happy-dom. Run `bun run verify` before considering changes complete.

Gmail changes and re-renders its DOM, so keep modules idempotent, test navigation and real Gmail layouts, and keep injected interactions from triggering Gmail row actions. Support keyboard focus and light/dark Gmail themes. Gmail enforces Trusted Types: do not assign `innerHTML` in production.

Resolve the visible sender and current subject from the row when copying; Gmail can replace nodes or change sender attributes. Keep Gmail's attachment indicators and previews visible. Observe only necessary attribute changes to avoid responding to the script's own updates.

The userscript and project are licensed GPL-3.0-or-later.

Attachment downloads (`features/attachments.ts`) read each card's `download_url` attribute (`mime:filename:url`), found by attribute rather than Gmail's obfuscated classes, and group cards by ancestor without crossing a `[role="listitem"]` message. They save through `core/download.ts` (`GM_download`, falling back to a hidden `<a download>`): Chrome blocks repeated programmatic anchor downloads from a page after the first, which is why anchors are only the fallback. There is deliberately no default-folder feature. The control is a single SVG icon button with a count. Selectors are unverified against live Gmail, so check them first if the button is missing.
