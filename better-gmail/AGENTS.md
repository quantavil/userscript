# Better Gmail

A local Gmail userscript with readable inbox rows, copy controls, and printing for expanded messages. Preserve the existing dependencies. Do not add storage or unrelated network access.

Use Bun, Vite+, TypeScript, and vite-plugin-monkey. `src/main.ts` starts the runtime; independent behavior is in `src/features/`, shared DOM helpers in `src/core/`, Gmail DOM selectors in `src/selectors.ts`, and presentation in `src/style.css`. Tests use Vite+ and happy-dom. Run `bun run verify` before considering changes complete.

Gmail changes and re-renders its DOM, so keep modules idempotent, test navigation and real Gmail layouts, and keep injected interactions from triggering Gmail row actions. Support keyboard focus and light/dark Gmail themes. Gmail enforces Trusted Types: do not assign `innerHTML` in production.

Resolve the visible sender from the row when copying; Gmail can replace nodes or change sender attributes. Keep Gmail's attachment indicators and previews visible. Observe only necessary attribute changes to avoid responding to the script's own updates. Conversation compaction only hides Gmail-marked signatures and quoted history in expanded message bodies; keep uncertain boundaries visible and reveal controls accessible and session-only. The userscript-manager menu toggles minimal email view for the current page session; disabling it restores script-collapsed content.

Printing uses only message bodies Gmail currently shows as expanded. It clones those bodies, reveals sections the script compacted, strips scripts and interactive controls, and renders them in a same-origin iframe without `innerHTML` or `document.write`. Never print collapsed messages, never mutate Gmail's live message bodies, and remove the print frame after the print dialog closes. The **Print** button sits beside the thread subject; the same action is in the userscript-manager menu with access key `p`.

The userscript and project are licensed GPL-3.0-or-later.
