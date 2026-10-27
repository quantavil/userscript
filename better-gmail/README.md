# Better Gmail

Version 0.6.0 is a local Tampermonkey userscript that improves Gmail message rows and opened conversations.

## Features

- Rows align the sender with the top of the message, keep thread counts beside the sender when space permits, and show the address underneath and wrap long subjects so they remain readable. Snippets stay on one line.
- Gmail's attachment indicator remains visible alongside its attachment previews.
- Click the sender address to copy it, or focus it and press Enter or Space. Click the subject or elsewhere on the row to open the message.
- A verification-code chip appears in matching inbox rows; click it to copy the code without opening the message. Detection is heuristic and may miss codes or match unrelated numbers.
- Opened messages with attachment cards get a download button that starts a separate download for each attachment. For the last message, it appears before Reply when available. The userscript manager handles downloads when available; browser fallback is subject to browser download restrictions.
- Opened conversations separate expanded replies and collapse Gmail-marked signatures and quoted history. Use the Show/Hide buttons to reveal each section; greetings and unmarked text stay visible. Use the userscript manager menu to disable or enable minimal email view. The toggle and reveal state last only for the current page session.
- Focus indicators preserve keyboard navigation and Gmail's unread styling.

The script does not store data. It requests attachment URLs only when you use the download button. Clipboard access occurs only when you choose a copy action and depends on browser permissions.

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
