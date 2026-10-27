# Better Gmail

A local Tampermonkey userscript that improves Gmail message rows.

## Features

- Rows align the sender with the top of the message, keep thread counts beside the sender when space permits, show the address underneath, and wrap the subject to use the available width.
- Gmail's attachment indicator remains visible alongside its attachment previews.
- Hover the subject or sender address and select its copy icon. The full subject appears on hover; focus the Subject button to show it with the keyboard. Row controls appear on hover or keyboard focus.
- Focus indicators preserve keyboard navigation and Gmail's unread styling.

The script does not store data or make network requests. Clipboard access occurs only when you choose a copy action and depends on browser permissions.

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
