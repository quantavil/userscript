# Support matrix

This matrix describes the current runtime and metadata. It excludes historical runs recorded in [browser-verification.md](browser-verification.md).

| Site/build | Supported game scope | Move path | Position observed by the adapter | Variant status |
| --- | --- | --- | --- | --- |
| Chess.com multi-site or standalone build | Standard player games | Chess.com board controller `move` API | Controller-local FEN and replayed SAN history | Unsupported; non-standard variants fail closed |
| Lichess multi-site build | Standard live player rounds (including Chess960) | Lichess round controller `pluginMove` path | Site-accepted round steps and their replayed history | Non-standard variants report ineligible |
| PyChess | Removed from runtime and userscript metadata | — | — | Unsupported |

The multi-site build matches Chess.com and Lichess hostnames. The standalone build matches Chess.com only. Puzzles, spectator pages, lobbies, correspondence games, and non-player views are outside the supported scope; an adapter may report them as waiting or ineligible.

## Move observation

The shared confirmation flow preserves the source reported by each adapter:

| Site | Source | What the observation means |
| --- | --- | --- |
| Chess.com | `controller-local` | The requested position appeared in the controller's local state/history. Chess.com updates those values synchronously during `move()`, so this does not independently establish server acceptance. |
| Lichess | `site-accepted` | The requested position appeared in validated, site-owned round steps. The adapter does not inspect a network acknowledgement or write directly to a socket. |

The app may observe a locally applied move, but neither UI nor documentation should turn that observation into a claim that a server confirmed it. Chess.com can still reject or roll back an optimistically applied move after the local observation.

## Variants

Fairy variants are not supported. Fairy-Stockfish has been completely removed from all builds. The bot operates solely with orthodox Stockfish, supporting standard chess and Chess960. When a site adapter encounters an unsupported non-standard variant, it declares the game ineligible or fails closed without making moves.

Do not restore PyChess as a current target by copying an older host match, adapter, or installation note. Historical PyChess verification remains in the browser log solely as evidence about earlier builds.

## Build contents and runtime notes

| Output | Host scope | Engine resources |
| --- | --- | --- |
| `dist/bundle.user.js` | Chess.com and Lichess | Stockfish 19 Lite |
| `dist/chesscom.user.js` | Chess.com | Stockfish 19 Lite |

Both outputs retain GPL-3.0-or-later metadata. Engine resources are version-pinned and carry SHA-256 hashes in userscript metadata; keep those notices intact when changing resource versions.

The standard-chess tablebase path calls the Lichess Syzygy service for eligible positions with at most seven pieces. It caches up to 256 entries in memory by complete FEN. DTZ is distance to a zeroing move; it is not mate distance. DTM is handled separately, and a mate score is shown only when DTM or an actual checkmate is available. Tablebase lookup races local engine search, and the engine result returns immediately when it wins the race.

Move-time records preserve a per-turn clock baseline. When both clock readings and a known increment are available, elapsed time uses the clock delta plus increment; without a known increment, it estimates duration from wall time. Treat exported elapsed values as browser-side estimates. Current adapters do not populate an increment value, so their move-time fallback is wall-clock based.

Post-game reports use a local search estimate, default to depth 18, and allow depth 10–26. The app permits reports only for finished games, including a guard against replay views of ongoing rounds, and cancels work when eligibility or the session changes. Manual cancellation keeps automatic reporting stopped until explicit generation or a new game. Automatic recovery is limited to two retries per session-position. It does not automatically repeat a move after a transport dispatch attempt with an uncertain outcome.

Ghost Mode hides panel and board overlays for streaming. The panel uses closed Shadow DOM for UI encapsulation; that is not a security boundary or a zero-detectability guarantee.

Browser compatibility notes: Lichess round controller bridge requires synchronous page-context injection (`// @inject-into page`). On Firefox for Android, Mozilla does not support `webRequestBlocking`, preventing userscript managers from patching CSP headers; consequently, Lichess's nonce-based `<meta>` Content Security Policy prevents script injection. Mobile users on Lichess should use a Chromium-based browser with extension support (e.g. Kiwi Browser, Lemur, Cromite) or use Chess.com.

