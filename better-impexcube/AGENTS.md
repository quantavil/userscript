# Better ImpexCube

A single Bun / TypeScript / Preact userscript for ImpexCube. Vite+ and vite-plugin-monkey produce `dist/better-impexcube.user.js`. Run `bun run check` before committing.

`src/dates.ts` and `src/dropdown.ts` provide the calendar and searchable select enhancements. `src/dbk-data.ts` validates and parses duty data; `src/dbk.tsx` integrates the product input, ASP.NET autocomplete, Preact and Floating UI.

`src/product-ui.ts` adds product-field value previews and product-table focus/navigation cues. Keep these scoped to the product page and preserve existing field titles and table actions.

Keep the original product inputs, disabled state, change handlers, ASP.NET postbacks and select synchronization intact. Never substitute schemes from a different RITC after an asynchronous response. Do not store customer/job data or commit authenticated responses. DBK data comes from the public duty endpoint via GM cross-origin request; never hardcode rates. Support UpdatePanel replacement and avoid silently falling back to unfiltered suggestions. Only make read-only checks on live customer jobs unless explicitly authorized otherwise.
