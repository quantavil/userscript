# Better ImpexCube

A single Bun / TypeScript / Preact userscript for ImpexCube. Vite+ and vite-plugin-monkey produce `dist/better-impexcube.user.js`. Run `bun run check` before committing.

`src/dates.ts` and `src/dropdown.ts` provide the calendar and searchable select enhancements. Preserve strict date validation and the native select options, including duplicate values. Flatpickr and Tom Select were trialed but not adopted: their default date parsing and value-keyed options respectively fail those requirements. `src/dbk-data.ts` validates and parses duty data; `src/dbk.tsx` integrates the product input, ASP.NET autocomplete, Preact and Floating UI.

`src/job-search.ts` searches the export job list using the site’s native form and bounded pagination, ranks retrieved results with Fuse.js, and opens results via native postbacks. Prefix fallback cannot find all typos or fuzzy-match consignee names absent from grid results. Copy job only prefills the original copy form; never submit or copy automatically. Keep customer data out of persistent storage and retain the native search. The shared input uses combined search when the field selector is unset and native search when a field is selected; preserve both modes. The current job grid does not return consignee names, and the effect of background job-detail requests on the shared active-job context is unverified.

`src/product-ui.ts` adds product-field value previews and product-table focus/navigation cues. Keep these scoped to the product page and preserve existing field titles and table actions.

Keep the original product inputs, disabled state, change handlers, ASP.NET postbacks and select synchronization intact. Never substitute schemes from a different RITC after an asynchronous response. Do not store customer/job data or commit authenticated responses. DBK data comes from the public duty endpoint via GM cross-origin request; never hardcode rates. Support UpdatePanel replacement and avoid silently falling back to unfiltered suggestions. Only make read-only checks on live customer jobs unless explicitly authorized otherwise.

`src/job-delete.ts` adds deletion to the job list action menu using the native delete page. Require an exact job number confirmation and preserve the native confirmation and permission checks. Never delete live jobs during testing.

`src/login.ts` selects the Moradabad branch and current Indian financial year on the native login selection form. Never submit credentials or choose among multiple companies.

`src/context-switch.ts` offers compact header selectors using the site’s native switch form and its available options. Keep the native form as the authority for branch and year changes.

`src/invoice-date.ts` defaults a new supporting document’s issue date from the saved invoice grid. Verify job and invoice identity, preserve existing documents and user edits, and never persist job data.

`src/site-style.css` themes shared native controls, SSRS ReportViewer checklist previews (rendering white document canvas on `_oReportCell` with dark controls and transparent `_oReportDiv`), DevExtreme grids (FreightCube), and the `.contextMenu` popup (fixed `130px` width to prevent jQuery `parseFloat` NaN position shifts). `src/form-style.css` contains detailed invoice and product styling, as well as top navigation dropdown and flyout rules (anchored strictly at `top: 100%`, removing native 25px mouse-bridge masking, harsh white borders, and cyan background bleed). The theme is installed at document start; other enhancements initialize when the DOM is ready. Preserve native controls and layout tables; verify representative pages and shared popups when changing the theme.
