# Better Gmail

A local Tampermonkey userscript that improves Gmail message rows.

## Features

- Rows align the sender with the top of the message, keep thread counts beside the sender when space permits, and show the address underneath while preserving Gmail's stable single-line subject and snippet layout.
- Gmail's attachment indicator remains visible alongside its attachment previews.
- Hover the subject or sender address and select its copy icon. The full subject appears on hover; focus the Subject button to show it with the keyboard. Row controls appear on hover or keyboard focus.
- In an opened email with attachments, a small download icon above them (with the attachment count when there are several) saves every attachment as a separate file, with no zip. Files go through the userscript manager's downloader (`GM_download`), so Chrome does not block the second and later downloads; if that fails, a plain browser download is used. The icon shows progress as "1/3" and a check mark when finished. It is a native button with a descriptive label, and a screen-reader status announces completion.
- When an inbox row's subject or snippet contains a one-time code (OTP, verification, security or login code, `G-123456`, 4-8 digits), a larger monospace chip with the code appears over the end of the snippet. Click it to copy the code without opening the email; it briefly reads "Copied" in the same space, and being absolutely positioned it never shifts the row. Years, amounts and phone numbers are ignored.
- Focus indicators preserve keyboard navigation and Gmail's unread styling.

The script stores nothing and makes no requests beyond downloading Gmail's own attachment links when you click the download icon. Clipboard access occurs only when you choose a copy action and depends on browser permissions.

## Install and develop

Requires Bun, Vite+, and Tampermonkey or a compatible userscript manager. On Chrome, enable the extension's Allow User Scripts setting when required.

```bash
bun install
bun x vp dev
bun x vp build
bun run verify
```

`bun x vp dev` provides a development install URL. `bun x vp build` writes `dist/better-gmail.user.js`; install or update it in your userscript manager. Gmail's interface can change; if controls stop appearing, its selectors may need an update in `src/selectors.ts`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) for the full license text. The generated userscript includes the license identifier in its metadata.
