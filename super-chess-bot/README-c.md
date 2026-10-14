# Super Chess Bot — Chess.com build

The standalone `dist/chesscom.user.js` build provides local Stockfish analysis and move automation for standard Chess.com player games. It uses the same controller integration and reliability limits described in the [support matrix](docs/support-matrix.md).

[![Install](https://img.shields.io/badge/Install-chesscom.user.js-success?logo=tampermonkey)](dist/chesscom.user.js)
[![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)

## Install

1. Install Tampermonkey or Violentmonkey.
2. Install [the Chess.com userscript](dist/chesscom.user.js).
3. Open a standard player game, wait for **Ready**, then enable automation.

The standalone build includes Stockfish resources for standard chess. It does not claim Chess.com variant move support. For the multi-site build and Lichess notes, see the [main README](README.md).

## Features

- Local Stockfish search in a web worker, with up to three candidate lines.
- Instant 0 ms FEN-keyed premove engine with own-turn recapture chains, opening book replies, and opponent-turn multi-branch ponder table.
- Standard opening-book choices, configurable move timing, and a scoresheet with PGN export.
- Optional post-game report using a local engine estimate. The default is depth 18, adjustable from 10 to 26; analysis requires a finished game.
- Asynchronous standard-chess Syzygy lookups for eligible positions with up to seven pieces. Results use a 256-entry cache keyed by full FEN. DTZ and DTM remain distinct, and a usable local search result does not wait for a tablebase grace period.
- Stream Ghost Mode hides the panel and board overlays. Closed Shadow DOM provides UI encapsulation; it is not a guarantee of invisibility or undetectability.

Chess.com controller state can show that a move was applied locally. The current integration has no independent server acknowledgement, so local application is never described as server acceptance. See [move confirmation provenance](docs/support-matrix.md#move-observation).

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) and the engine resource hashes in the generated userscript header.
