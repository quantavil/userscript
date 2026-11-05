# Better ImpexCube

One userscript for searchable dropdowns, improved date entry and RITC-specific DBK scheme suggestions on ImpexCube.

## Install

Install Tampermonkey or Violentmonkey, then install `dist/better-impexcube.user.js` after building.. Refresh the ImpexCube page.

## Features

- On the export job page, search job number, SB number, exporter or consignee in one box. Open a matching job in a new tab, or use Copy job to prefill the original copy form and review it before proceeding. The original search remains under Other search options. Results cover the first page for each search field; refine broad searches to see more.
- Search native dropdown options by text or code; use arrows, Enter and Escape. The underlying select and its events remain in use.
- Type dates in common formats, use the calendar or use arrow keys to change the day. Dates are formatted as `DD/MM/YYYY`.
- In the export product form, the DBK field shows schemes from ImpexCube's export duty structure for the current eight-digit RITC. Type to filter the scheme number or description, then click or use arrows and Enter. The original change handler runs after selection. ImpexCube remains responsible for validating and calculating product values.
- Hover over a product field to see its full value. The product table highlights the row under the pointer or keyboard focus. When a row's Select link is focused, use Alt+Up or Alt+Down to move to another row's Select link.

Job search sends your query to the same ImpexCube server for each of the four fields. Job data is not stored by the userscript.

DBK lookup sends the RITC to `impexcube.in`; no job or customer data is sent. Results are cached in memory for five minutes. If the lookup fails, reopen the field to retry. The script does not enable fields disabled by ImpexCube. A lookup is guidance from the site's data, not a guarantee that a scheme applies to a particular shipment.

## Development

Install with `bun install`. Run `bun run check` for tests, type checking, lint, Knip and the production build. Build with `bun run build`. The date picker, searchable dropdown and DBK selector are TypeScript modules. The DBK selector uses Preact; floating menus use Floating UI.

Licensed GPL-3.0-or-later.
