# GabiBot Codebase Specification

## 1. Project Overview
GabiBot is a high-performance Tampermonkey userscript for Chess.com, featuring a hybrid engine architecture (Local + API), stealth-oriented move execution, and an advanced premove system.

---

## 2. Core Components

### 🧠 Engine Layer
The engine logic is split across several modules in `src/engine/`.

#### [Local Engine](file:///home/quantavil/Documents/Project/userscript/chess-bot/src/engine/local-engine.js)
- **Role**: Manages game state (Zobrist hashing), move generation, and incremental evaluation.
- **Audit Findings**:
    - [MAJOR] **Overloaded logic**: `makeMove`/`unmakeMove` handle too many state updates simultaneously.
    - [MAJOR] **Fragile Mixin**: Uses prototype mixins for search methods; complicates modular testing.

#### [Search & Evaluation](file:///home/quantavil/Documents/Project/userscript/chess-bot/src/engine/search.js)
- **Role**: Implements Negamax with alpha-beta pruning, LMR, PVS, and a tapered evaluation function.
- **Audit Findings**:
    - [MAJOR] **God Function**: `evaluate` (270+ lines) is monolithic. Moves piece-square table and material evaluation to `pst.js` but logic remains dense.
    - [MEDIUM] **Magic Numbers**: Tuning parameters (LMR/PVS) are semi-hardcoded; complicates fine-tuning.

#### [Premove System](file:///home/quantavil/Documents/Project/userscript/chess-bot/src/engine/premove.js)
- **Role**: Validates and queues move sequences for opponent turns with safety/stability checks.
- **Audit Findings**:
    - [MEDIUM] **Logic Redundancy**: Some piece evaluation logic (like hanging checks) is repeated in both main search and premove modules.
    - [LOW] **Global Singleton**: `premoveEngine` is a singleton; safe in JS main thread but hinders potential parallel/worker-based analysis.

---

### 🕹️ Orchestration & State

#### [Bot Controller](file:///home/quantavil/Documents/Project/userscript/chess-bot/src/controller.js)
- **Role**: Main loop; coordinates between board events and engine analysis.
- **Audit Findings**:
    - [MEDIUM] **Fragile DOM Coupling**: Hardcoded selectors for platform events (rematch, game over) are prone to breakage.
    - [MEDIUM] **Hybrid Polling**: Relies on both mutation observers and a secondary `tick()` loop for redundancy.

#### [State Management](file:///home/quantavil/Documents/Project/userscript/chess-bot/src/state.js)
- **Role**: Stores configuration, LRU position caches, and game helper utilities.
- **Audit Findings**:
    - [MAJOR] **Lack of Reactivity**: `BotState` changes require manual polling/watchers in other modules.

---

### 🎨 Interaction Layer

#### [UI Component](file:///home/quantavil/Documents/Project/userscript/chess-bot/src/ui.js)
- **Role**: Glassmorphism-inspired control panel and terminal console.
- **Audit Findings**:
    - [MAJOR] **Maintenance Debt**: Massive inline HTML/CSS blocks hinder structural updates.
    - [MAJOR] **Unsynchronized Updates**: Redundant UI refresh triggers from multiple sources.

---

## 3. High-Level Architectural Rot

| Category | Description | Impact |
| :--- | :--- | :--- |
| **Monolithic Modules** | Core functions (`evaluate`, `scheduleAnalysis`) exceed SRP boundaries. | High maintenance cost; difficult debugging. |
| **Logic Scarcity** | Shared logic (move execution, FEN parsing) is duplicated across 3+ files. | Fragile updates; potential for "split-brain" bugs. |
| **Platform Coupling** | Engine logic is too tightly bound to Chess.com's specific DOM structure. | Difficult to port; high risk of breakage on UI updates. |

---

## 4. Prioritized Refactoring Roadmap

1.  **Phase 1**: Extract shared utilities (Move execution, FEN helpers) to `src/utils.js`.
2.  **Phase 2**: Decompose the `evaluate` function into modular piece/safety evaluators.
3.  **Phase 3**: Decouple DOM logic via a `BoardAdapter` interface.
4.  **Phase 4**: Implement a reactive store for `BotState`.
