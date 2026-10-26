# Better ICEGATE

A modular userscript that puts your frequently used ICEGATE services within reach through a **Better ICEGATE** panel on the logged-in ICEGATE services site.

## Install

1. Install a userscript manager such as Tampermonkey or Violentmonkey in your browser.
2. Build with `bun install` and `bun run build`.
3. Open `dist/better-icegate.user.js` in your browser and accept the userscript manager's installation prompt. If your browser does not offer the prompt for a local file, paste the file contents into a new script in the manager and save it.
4. Log in to `foservices.icegate.gov.in` and refresh the page.

## Use

The Better ICEGATE panel starts expanded with eSANCHIT, Shipping Bill / SB, and Electronic Filing / File Upload. Click one to open it in a new tab. On Shipping Bill / SB, the starting date defaults to the same day as the ending date until you select a date preset, and search results are displayed together on one page. Use the settings button beside the collapse button to enable or disable Shipping Bill pagination; your choice is saved in this browser.

On Shipping Bill / SB, use **Today**, **Yesterday**, **Last 7 days**, or **This month** to set the date range. The last selected preset is remembered for future visits. Search results can be filtered locally, job and SB numbers can be copied, and the visible rows can be exported to CSV. When pagination is enabled, filtering and export cover the current page only. These tools do not run a search automatically.

To save another page, navigate to it, select **Save this page**, and give it a name. **Edit** lets you remove shortcuts or restore the initial three. Shortcuts are saved in this browser's site storage; clearing site data removes them. A saved page's complete address is stored locally, so avoid saving addresses that contain sensitive parameters. Some ICEGATE services use dynamic or session-specific routes, so a saved address may not work in a later session.

ICEGATE authentication is controlled by the portal. New service tabs are opened from the current tab so ICEGATE can copy its per-tab session state. If the portal session has expired, log in again. While you are logged in, Better ICEGATE periodically resets the portal’s browser-side inactivity timer. This does not extend server-side sessions or prevent token refresh failures. Browser sleep or throttling can also interrupt it. Signing out normally still works. The eSANCHIT shortcut uses ICEGATE's own sign-in action. From other pages it opens a dashboard tab first to perform that handoff, followed by the eSANCHIT tab.

## Development

Use Bun: `bun test`, `bun run typecheck`, `bun x knip`, and `bun run build`. The source separates favorites, settings, session handling, portal integrations, and the Preact panel; the UI is isolated in a shadow root. Vite+ and `vite-plugin-monkey` produce `dist/better-icegate.user.js`.

Licensed GPL-3.0-or-later; see the repository [LICENSE](../LICENSE).
