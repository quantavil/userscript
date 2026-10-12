# Super Chess Bot — Chess.com Edition

A dedicated, lightweight userscript build for **Chess.com**, powered by local Stockfish 19 lite WASM, deep Syzygy 7-piece tablebases, and internal board controller automation.

[![Userscript](https://img.shields.io/badge/Install-chesscom.user.js-success?logo=tampermonkey)](dist/chesscom.user.js)
[![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Engine](https://img.shields.io/badge/Engine-Stockfish%2019%20Lite%20WASM-orange.svg)](https://github.com/nmrugg/stockfish.js)
[![Tablebase](https://img.shields.io/badge/Tablebase-Syzygy%207--piece-purple.svg)](https://tablebase.lichess.ovh)

---

## Overview

The Chess.com edition (`dist/chesscom.user.js`) is compiled specifically for `chess.com/*` with zero multi-site overhead. It injects directly into Chess.com's internal game controller to deliver clean move execution, humanized timing, multi-PV candidate evaluation, and stealth cloaking.

For the multi-site build covering PyChess and Lichess, see the main [README.md](README.md).

---

## Key Features

- **Direct Controller Hook**: Submits legal moves through Chess.com's internal board controller (`controller.move`) with explicit lowercase promotion characters. Does not synthesize fake mouse clicks or touch the promotion picker DOM.
- **Humanized Ex-Gaussian Timing**: Box-Muller Gaussian sampling with an entropy-scaled exponential tail. Plays quickly in forced or book positions, while introducing realistic human hesitation in sharp tactical middlegames.
- **Target Elo & Blunder Shield**: Boltzmann softmax move selection calibrates engine strength to human rating tiers (e.g. 1500, 2000, 2400, 2800). The active Blunder Shield rejects any move dropping evaluation by more than 150 centipawns.
- **Multi-PV Analysis & Board Arrows**: Evaluates the top 3 candidate variations concurrently. Displays distinct colored board arrows (Green for #1, Cyan for #2, Amber for #3) and candidate SAN lines in the panel.
- **Syzygy 7-Piece Tablebases**: Asynchronous Lichess Syzygy lookups for endgames with $\le 7$ pieces. Resolves instantly (<0.01 ms cached, 160–300 ms cold network) with clock-proportional timeout protection.
- **In-Memory Opening Book**: 117 positions covering plies 1–8 across 5 styles (Balanced, Aggressive, Hyper-Aggressive, Defensive, Hyper-Defensive). Resolves moves in <0.01 ms with 0 ms engine clock drain.
- **Move Scoresheet & Standard PGN Export**: Tracks live White/Black moves with visual elapsed-time bars. Copies clean PGN with standard `[%emt]` clock tags and client-side telemetry disclosures.
- **On-Demand Game Report**: Review completed games with the local engine. Includes a depth stepper (10–26) and per-player accuracy %, inaccuracies, mistakes, blunders, and ACPL.
- **Stream-Safe Ghost Mode**: Closed Shadow DOM, ephemeral `WeakSet` node tracking, and zero detectable CSS attributes. Press `♟ Toggle Ghost Mode` in the userscript manager menu to hide all panel and board overlays during recording.

---

## Installation & Quick Start

1. Install a userscript manager in your browser:
   - [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Install the standalone script:
   - **[dist/chesscom.user.js](dist/chesscom.user.js)**
3. Navigate to any [Chess.com](https://www.chess.com/play) game (Computer, Live, or Events).
4. Wait for the floating panel to report **Ready**.
5. Toggle **Enable Bot** when you are ready to play.

---

## Recommended Settings

| Time Control | Move Budget | Timing Mode | Depth Cap | Ponder |
| :--- | :---: | :---: | :---: | :---: |
| **Bullet (1+0 / 1+1)** | 50–100 ms | Dynamic | 30 | Enabled |
| **Blitz (3+0 / 5+0)** | 150–300 ms | Dynamic | 30 | Enabled |
| **Rapid (10+0)** | 500–1000 ms | Dynamic | 30 | Optional |
| **Co-Pilot / Natural** | Match clock | Dynamic | 30 | Blunder Shield ON, Target Elo set |

---

## Userscript Menu Shortcuts

Registered in your userscript manager menu (`GM_registerMenuCommand`):
- `♟ Toggle Ghost Mode`: Instantly hide or reveal all board overlays and panel UI.
- `♟ Toggle Bot Automation`: Quickly toggle automation on or off without opening the settings drawer.

---

## License

GPL-3.0-or-later. Stockfish 19 lite is licensed under GPL-3.0. See [LICENSE](LICENSE).
