# MEMORY.md

# Project: Super Chess Bot

## Overview
A high-performance Tampermonkey userscript designed for **Chess.com** that provides tournament-level analysis and auto-play, optimized for hyper-bullet and blitz games. It uses a single-engine architecture running a high-performance local JS engine built on an 0x88 board representation, Zobrist hashing, transposition tables (TT), iterative deepening search, and advanced pruning techniques (Reverse Futility Pruning, Razoring, Null Move Pruning).

## Structure
```
.
├── build.js            # esbuild bundling script
├── dist/
│   └── bundle.user.js  # Compiled Tampermonkey userscript
├── package.json        # Project metadata and dependencies
├── src/                # Source code
│   ├── index.ts        # Entry point for the userscript
│   ├── state.ts        # Centralized BotState, LRU position cache, and local storage management
│   ├── utils.ts        # DOM helper functions
│   ├── board.ts        # Chess.com DOM board reading/writing, executing moves, drawing evaluation bar/arrows
│   ├── controller.ts   # Central tick loop coordinating UI, board, state, and analysis
│   ├── ui.ts           # Draggable glassmorphic control panel and in-game log console
│   └── engine/         # Local engine module
│       ├── constants.ts # Chess piece/board representation constants
│       ├── pst.ts      # Piece-Square Tables (Midgame/Endgame)
│       ├── zobrist.ts  # Zobrist hash values and operations
│       ├── utils.ts    # Square mirroring and parsing utilities
│       ├── san.ts      # SAN string conversion helper
│       ├── local-engine.ts # Core engine state, board representation (0x88), make/unmake move, FEN loader
│       ├── search.ts   # Negamax with alpha-beta search, quiescence search, move ordering, and evaluation functions
│       └── scheduler.ts # Asynchronous search coordinator for main moves and premove calculation
└── tests/              # Unit and simulation tests
    ├── aggression.test.ts
    ├── failsafe-loop.test.ts
    └── game-simulation.test.ts
```

## Conventions
- **ES Modules**: The workspace runs using ESM (`"type": "module"`).
- **0x88 Representation**: The local engine represents board squares with 0x88 indices.
- **State Management**: Game and UI states are encapsulated in `BotState` to avoid global namespace pollution.

## Dependencies & Setup
- **Dependencies**: `esbuild` for bundling and `vitest` for test execution.
- **Setup**: Run `npm install` to install dependencies.
- **Tests**: Run `npm test` to execute unit tests. If the vitest binary symlink fails due to cross-platform format issues (`Exec format error`), run using node directly: `node node_modules/vitest/vitest.mjs run`.

## Critical Information
- **Infinite Loop Failsafe**: The `checkFailsafe` mechanism was removed because it caused infinite fail -> reset -> fail loops when moves failed. The bot now relies on waiting for the FEN to change.
- **Local-Only Search**: The bot runs entirely on the client side using the local JS engine, eliminating any latency or network overhead associated with external chess APIs.
- **GC Protection**: The local engine uses Typed Arrays and pre-allocated evaluation buffers to minimize garbage collection pauses during hot search paths.

## Insights
- **LMR Regression**: Standard Late Move Reductions (LMR) and standard Late Move Pruning (LMP) hurt tactical puzzle solving accuracy (as documented in `report.md`).
- **Dynamic Time Budgeting**: The engine dynamically adjusts its think-time allocation per move based on how favorable or poor the position evaluation is.

## Blunders
- `[2026-06-17] Unit tests failed on tick loop → TypeError: ui.log is not a function → Mock of ui.js in tests was missing the log/clearConsole methods → Added log/clearConsole to mocks in failsafe-loop.test.js and controller.test.js`
- `[2026-06-17] Bot stops mid-game → TypeError: uci.substring is not a function → Opponent move returned as object by chess.com client-side API rather than UCI string → Updated extractLastMove and uciToSan to convert objects to strings.`
- `[2026-06-22] TypeScript compiler error in scheduler.ts → BotState from state.js lacked dynamic property typing (onUpdateDisplay) → Cast BotState to BotStateInterface to solve it.`
- `[2026-06-22] uciToSan regression on object inputs in san.ts → Returning empty string instead of original object when object fields check failed → Reverted fallback behavior to match original js implementation.`
- `[2026-06-22] Rollup build crash due to antifeature config in vite.config.ts → Plain strings in antifeature causes crash → Replaced with structured array syntax [{ type: 'membership', description: 'free to use' }].`
- `[2026-06-22] Corrupted test files during migration → Used echo -e in bash to prepend // @ts-nocheck to files which parsed escape sequences in string literals → Restored via git and prepended safely using Python.`
