# Better ImpexCube

A single Bun / TypeScript / Preact userscript for ImpexCube. Vite+ and vite-plugin-monkey produce `dist/better-impexcube.user.js`. Run `bun run check` before committing.

`src/dates.ts` and `src/dropdown.ts` provide the calendar and searchable select enhancements. `src/dbk-data.ts` validates and parses duty data; `src/dbk.tsx` integrates the product input, ASP.NET autocomplete, Preact and Floating UI.

`src/job-search.ts` searches the export job list using the site’s native form and bounded pagination, ranks retrieved results with Fuse.js, and opens results via native postbacks. Prefix fallback cannot find all typos or fuzzy-match consignee names absent from grid results. Copy job only prefills the original copy form; never submit or copy automatically. Keep customer data out of persistent storage and retain the native search.

`src/product-ui.ts` adds product-field value previews and product-table focus/navigation cues. Keep these scoped to the product page and preserve existing field titles and table actions.

Keep the original product inputs, disabled state, change handlers, ASP.NET postbacks and select synchronization intact. Never substitute schemes from a different RITC after an asynchronous response. Do not store customer/job data or commit authenticated responses. DBK data comes from the public duty endpoint via GM cross-origin request; never hardcode rates. Support UpdatePanel replacement and avoid silently falling back to unfiltered suggestions. Only make read-only checks on live customer jobs unless explicitly authorized otherwise.

`src/job-delete.ts` adds deletion to the job list action menu using the native delete page. Require an exact job number confirmation and preserve the native confirmation and permission checks. Never delete live jobs during testing.

`src/login.ts` selects the Moradabad branch and current Indian financial year on the native login selection form. Never submit credentials or choose among multiple companies.

`src/context-switch.ts` offers compact header selectors using the site’s native switch form and its available options. Keep the native form as the authority for branch and year changes.
