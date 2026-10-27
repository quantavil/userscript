# Better Gmail

A local Tampermonkey userscript that improves Gmail message rows.

## Features

- Rows align the sender with the top of the message, keep thread counts beside the sender when space permits, and show the address underneath while preserving Gmail's stable single-line subject and snippet layout.
- Gmail's attachment indicator remains visible alongside its attachment previews.
- Hover the subject or sender address and select its copy icon. The full subject appears on hover; focus the Subject button to show it with the keyboard. Row controls appear on hover or keyboard focus.
- In an opened email with two or more attachments, a **Download all N attachments** button above them saves each one as a separate file (no zip). The first click asks you to choose a default folder (Chromium's folder picker); later clicks save straight into it, adding " (1)" to avoid overwriting. If you cancel the picker, deny access, or a file can't be fetched, the browser downloads it normally instead. Choose **Reset default download folder** in the userscript manager's menu to pick a different folder. The button is a native button with a descriptive label, and a screen-reader status announces completion.
- Focus indicators preserve keyboard navigation and Gmail's unread styling.

The script stores only the chosen folder handle (in this site's IndexedDB) and makes no requests beyond fetching Gmail's own attachment links when you click Download all. Clipboard access occurs only when you choose a copy action and depends on browser permissions.

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
