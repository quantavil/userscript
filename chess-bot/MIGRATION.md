# TypeScript Migration Plan: Super Chess Bot

This plan details a gradual, zero-regression migration from JavaScript to TypeScript utilizing **Bun** for package management and **Vite** with `vite-plugin-monkey` for compiling and building the userscript.

To avoid regressions, the project will support a **hybrid JS/TS compilation** from the start, allowing incremental file conversions.

---

## 📋 Phase-by-Phase Roadmap

### 🛠️ Phase 1: Environment Setup & Tooling Transition
Configure the project to use Vite and TypeScript while retaining the existing JS code.

1. **Install Dependencies**:
   Install Vite, TypeScript, `vite-plugin-monkey`, and required type definitions.
2. **Configure Vite**:
   Create `vite.config.ts` and configure the userscript metadata mapping (previously in `build.js`).
3. **Configure TypeScript**:
   Create `tsconfig.json` with `allowJs: true` and `resolveJsonModule: true` to support mixed JS/TS imports.
4. **Update package.json**:
   Add scripts for `dev` (hot-reloads into browser) and `build` using Vite.

> **Verification Check 1**:
> Run the Vite build command and ensure `dist/bundle.user.js` compiles correctly. Load it into Tampermonkey and confirm that the GabiBot panel loads and operates on Chess.com without any errors.

---

### 📦 Phase 2: Migrate Core Utilities & Declare Base Types (Completed)
Convert independent helper files and establish type declarations.

1. **Declare Global Types**:
   Create `src/types/chess.d.ts` to define common structures (e.g. `Move`, `BotState`, `Evaluation`, `EngineResult`).
2. **Convert Config**:
   Rename `src/config.js` to `src/config.ts` and type it.
3. **Convert Utils**:
   Rename `src/utils.js` to `src/utils.ts` and add typings.

> **Verification Check 2**:
> Run `vitest run` to verify that unit tests compile and pass with the newly converted utilities.

---

### 🧠 Phase 3: Migrate Engine Modules (Pure Logic) (Completed)
Migrate the core engine and search modules, which are self-contained and don't touch the DOM.

1. **Constants & Zobrist**:
   Convert `src/engine/constants.js` and `src/engine/zobrist.js`.
2. **Piece-Square Tables & Utils**:
   Convert `src/engine/pst.js` and `src/engine/utils.js`.
3. **SAN & Premove Logic**:
   Convert `src/engine/san.js` and `src/engine/premove.js`.
4. **Local Engine & Search core**:
   Convert `src/engine/local-engine.js`, `src/engine/search.js`, and `src/engine/scheduler.js`.
5. **Analysis Wrapper**:
   Convert `src/engine/analysis.js`.

> **Verification Check 3**:
> Run the full game simulation tests (`game-simulation.test.js`) and tactical benchmarks to verify that the local engine executes moves, searches, and avoids blunders exactly as before.

---

### 🔌 Phase 4: Migrate DOM, UI, State, & Entry Point
Migrate components that interact with the Chess.com DOM and window environment.

1. **State**:
   Convert `src/state.js` to `src/state.ts` (requires defining browser mocks/global extensions).
2. **Board DOM Wrapper**:
   Convert `src/board.js` to `src/board.ts` (typing DOM selection, pointer events, coordinates).
3. **UI Overlay**:
   Convert `src/ui.js` to `src/ui.ts` (typing elements, click bindings, and state persistence).
4. **Bot Controller**:
   Convert `src/controller.js` to `src/controller.ts` (typing intervals, observers, game detection).
5. **Entry Point**:
   Convert `src/index.js` to `src/index.ts` (wrap in main closures and single-instance checks).

> **Verification Check 4**:
> Perform a full strict type-check compile (`tsc --noEmit`). Build the userscript, test it in-game, and confirm all features work perfectly.
