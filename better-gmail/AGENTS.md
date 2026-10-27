# Better Gmail

A local Gmail userscript with readable inbox rows and copy controls. Preserve the existing dependencies. Do not add network access or storage without a specific requirement.

Use Bun, Vite+, TypeScript, and vite-plugin-monkey. `src/main.ts` starts the runtime; independent behavior is in `src/features/`, shared DOM helpers in `src/core/`, Gmail DOM selectors in `src/selectors.ts`, and presentation in `src/style.css`. Tests use Vite+ and happy-dom. Run `bun run verify` before considering changes complete.

Gmail changes and re-renders its DOM, so keep modules idempotent, test navigation and real Gmail layouts, and keep injected interactions from triggering Gmail row actions. Support keyboard focus and light/dark Gmail themes. Gmail enforces Trusted Types: do not assign `innerHTML` in production.

Resolve the visible sender and current subject from the row when copying; Gmail can replace nodes or change sender attributes. Keep Gmail's attachment indicators and previews visible. Observe only necessary attribute changes to avoid responding to the script's own updates.

The userscript and project are licensed GPL-3.0-or-later.
