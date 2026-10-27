# Better ICEGATE

A modular userscript that puts your frequently used ICEGATE services within reach through a **Better ICEGATE** panel on the logged-in ICEGATE services site.

## Install

1. Install a userscript manager such as Tampermonkey or Violentmonkey in your browser.
2. Build with `bun install` and `bun run build`.
3. Open `dist/better-icegate.user.js` in your browser and accept the userscript manager's installation prompt. If your browser does not offer the prompt for a local file, paste the file contents into a new script in the manager and save it.
4. Log in to `foservices.icegate.gov.in` and refresh the page.

The eSANCHIT document-type dropdown enhancement also runs on `www.icegate.gov.in/esanchit/*` and `esanchit.icegate.gov.in`.

## Use

The Better ICEGATE panel starts expanded with eSANCHIT, Shipping Bill / SB, Bill of Entry / BoE, and Electronic Filing / File Upload. Click a shortcut name to open it in the current tab, or click its arrow (↗) to open it in a new tab. On Shipping Bill / SB, the starting date defaults to the same day as the ending date until you select a date preset, and search results are displayed together on one page. Use the settings button beside the collapse button to enable or disable Shipping Bill pagination; your choice is saved in this browser.

On Shipping Bill / SB, use **Today**, **Yesterday**, **Last 7 days**, or **This month** to set the date range. The last selected preset is remembered for future visits. Search results can be filtered locally, job numbers, SB numbers, SB dates, and custom locations can be copied, and the visible rows can be exported to CSV. When pagination is enabled, filtering and export cover the current page only. These tools do not run a search automatically.

Bill of Entry / BoE (`#/e-copy?docType=BE`) gets the same tools as Shipping Bill: date presets, local filter, CSV export (`bills-of-entry.csv`), copy buttons for job number, BE number, BE date and custom location, and the green envelope on each row. Its email template is separate (default: "Dear Sir, Find below Bill of Entry details:" followed by a Job No / BE Number / BE Date / Custom Location table); edit it under the ⚙ settings button (**Bill of Entry email template**) with `{job}`, `{be}`, `{date}`, `{location}` and `{tab}`. The pagination switch covers both documents. The acknowledgement and signed-copy download links are left untouched.

On eSANCHIT's upload page, each **Document type** select becomes a search box. Type part of a code or name (`inv`, `packing list`, `380`); every word must match, and code or name-start matches come first. Use the arrow keys and Enter, or click, to choose; Escape closes it. The last five types you picked are listed first when the box is empty (stored in this browser only). The original select is hidden but still holds the value and fires the portal's own change handlers, so uploads work as before.

On each Shipping Bill row, the green envelope button next to the job number copies a ready-to-paste email built from your template (default: "Dear Sir, Find below Shipping Bill Number:" followed by a Job No / SB Number / SB Date line, tab-separated). Edit it under the ⚙ settings button: use `{job}`, `{sb}`, `{date}`, `{location}` for the row's values and `{tab}` for a tab; **Reset template** restores the default. The template is saved in this browser. Lines containing `{tab}` are copied as a table with cell borders (the first row bold when there are several rows), so it pastes into a Gmail draft with its borders; the other lines stay as normal text, and apps that only accept plain text receive the tab-separated version.

On eSANCHIT's upload page, each document row gets a green envelope in its Action cell, inline beside Delete, and a **Copy table** button sits beside **Upload Documents**. **Copy table** copies the same email with a row for every upload. The envelope copies an email built from the eSANCHIT template (default: "Dear Sir, Find below the IRN and DRN details:" followed by a File Name / DRN / IRN / Document Type table; start date and digital-signature status are left out, but `{date}` and `{status}` are available). Edit it under the ⚙ settings button on the ICEGATE panel (**eSANCHIT email template**): use `{drn}`, `{irn}`, `{file}`, `{type}`, `{date}`, `{status}` and `{tab}`; **Reset template** restores the default. This template is separate from the Shipping Bill one. Both templates are stored through your userscript manager (`GM_getValue`/`GM_setValue`), so they are shared by the ICEGATE and eSANCHIT sites in this browser; a template saved earlier in a site's own storage is moved over the first time it is read. Any template line that uses a row field is repeated for each row when you use **Copy table**; the envelope on a row copies just that row.

To save another page, navigate to it, select **Save this page**, and give it a name. **Edit** lets you remove shortcuts or restore the default four. Shortcuts are saved in this browser's site storage; clearing site data removes them. A saved page's complete address is stored locally, so avoid saving addresses that contain sensitive parameters. Some ICEGATE services use dynamic or session-specific routes, so a saved address may not work in a later session.

ICEGATE authentication is controlled by the portal. New service tabs are opened from the current tab so ICEGATE can copy its per-tab session state. If the portal session has expired, log in again. While you are logged in, Better ICEGATE periodically resets the portal’s browser-side inactivity timer. This does not extend server-side sessions or prevent token refresh failures. The timer is reset every 30 seconds and again whenever the tab becomes visible or focused. Browser sleep or throttling can still interrupt it; on Chrome for Windows, Memory Saver or Energy Saver can freeze or discard a background tab, so add `foservices.icegate.gov.in` to *Always keep these sites active* in `chrome://settings/performance`. Signing out normally still works. The eSANCHIT shortcut uses ICEGATE's own sign-in action. From other pages it opens a dashboard tab first to perform that handoff, followed by the eSANCHIT tab.

## Development

Use Bun: `bun test`, `bun run typecheck`, `bun x knip`, and `bun run build`. The source separates favorites, settings, session handling, portal integrations, and the Preact panel; the UI is isolated in a shadow root. Vite+ and `vite-plugin-monkey` produce `dist/better-icegate.user.js`.

Licensed GPL-3.0-or-later; see the repository [LICENSE](../LICENSE).
