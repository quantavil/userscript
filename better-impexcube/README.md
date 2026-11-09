# Better ImpexCube

One userscript for searchable dropdowns, improved date entry and RITC-specific DBK scheme suggestions on ImpexCube.

## Install

Install Tampermonkey or Violentmonkey, then install `dist/better-impexcube.user.js` after building. Refresh the ImpexCube page.

## Features

- On the export job page, search job number, SB number, exporter or consignee in one box. Open a matching job in a new tab, or use Copy job to prefill the original copy form and review it before proceeding. Choose a search field from the dropdown to use the original search; leave it at --Choose-- for the combined search. Search checks up to three pages per field and offers Load more, up to twelve pages per field. Close matches use Fuse.js on retrieved results; when no exact server results exist, a three-character prefix supplies candidates. Typos within that prefix and consignee-only fuzzy matches may be missed. When ImpexCube returns a consignee name it is shown; the current job list does not supply the name.
- Search native dropdown options by text or code; use arrows, Enter and Escape. The underlying select and its events remain in use.
- Type dates in common formats, use the calendar or use arrow keys to change the day. Dates are formatted as `DD/MM/YYYY`. Date inputs maintain a guaranteed minimum width (`98px`) so full 10-character dates never clip. For a new supporting document, the issue date defaults to the selected invoice’s saved date when the job and invoice can be matched. You can edit it afterward; existing documents are left alone.
- ImpexCube pages use a warm dark theme for shared navigation, forms, grids, tabs and native autocomplete suggestions. Invoice and product forms also have tailored styling; native controls remain in use.
- The top navigation bar (`#nav`) and its multi-level flyouts render as sleek floating popover cards with rounded corners, subtle chevrons, and drop shadows, eliminating native navbar masking and blackouts.
- SSRS ReportViewer checklist previews (`frmSBChecklistVerificationNew.aspx`) display reports cleanly on centered white document pages with dark-themed toolbars and inverted glyphs, eliminating unreadable black backgrounds and vertical page slicing.
- DevExtreme grids (`frmDocketCreation.aspx` FreightCube) and row action context menus (`.contextMenu` on `efrmJobDetails.aspx`) seamlessly follow the dark panel palette.
- High-contrast color overrides replace hardcoded native inline styles (black text, dark green, dark blue) for optimal readability across dark backgrounds.
- In the export product form, the DBK field shows schemes from ImpexCube's export duty structure for the current eight-digit RITC. Type to filter the scheme number or description, then click or use arrows and Enter. The original change handler runs after selection. ImpexCube remains responsible for validating and calculating product values.
- Hover over a product field to see its full value. The product table highlights the row under the pointer or keyboard focus. When a row's Select link is focused, use Alt+Up or Alt+Down to move to another row's Select link.

Job search sends your query to the same ImpexCube server for each of the four fields. Job data is not stored by the userscript.

DBK lookup sends the RITC to `impexcube.in`; no job or customer data is sent. Results are cached in memory for five minutes. If the lookup fails, reopen the field to retry. The script does not enable fields disabled by ImpexCube. A lookup is guidance from the site's data, not a guarantee that a scheme applies to a particular shipment.

## Development

Install with `bun install`. Run `bun run check` for tests, type checking, lint, Knip and the production build. Build with `bun run build`. The date picker, searchable dropdown and DBK selector are TypeScript modules. The DBK selector uses Preact; floating menus use Floating UI.

Licensed GPL-3.0-or-later.

The job list’s three-dot action menu includes **Delete job**. It opens the native delete page with the selected job, loads its details, and asks you to type the exact job number before invoking ImpexCube’s delete button. ImpexCube may also ask for its own confirmation.

After credentials are entered, Better ImpexCube selects Moradabad and the current Indian financial year. If exactly one company is available, it continues automatically; otherwise choose the company and continue.

The header branch and financial-year dropdowns use the options from ImpexCube’s switch form. Choosing a different value navigates through that form and changes the active session context.
