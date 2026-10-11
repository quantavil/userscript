# AGENTS.md

Guidance for work in this repository (`~/Documents/userscript`).

## Monorepo Practices

- **Runtime & Tools**: Use `bun` as the primary runtime and package manager across all userscript subprojects.
- **Build System**: Scripts use Vite (`vite-plugin-monkey`) with TypeScript. Output bundles reside in `dist/`.
- **License**: GPL-3.0-or-later everywhere — `license: 'GPL-3.0-or-later'` in `vite.config.ts` metadata, `"license": "GPL-3.0-or-later"` in `package.json`, a GPL `LICENSE` per project, and `@license GPL-3.0-or-later` in plain userscript headers.
- **Subproject Isolation**: Each project is self-contained with its own `package.json`, `vite.config.ts`, tests, and documentation.
- **Testing**: Run project unit tests (`bun test`) and verify production builds (`bun run build`) before committing.
- **Subproject Documentation**: Each subproject directory should maintain an updated `README.md` and `AGENTS.md` with domain-specific architecture and constraints.

## Super Chess Bot benchmark (2026-10-11)

- At the displayed 2900 rating, the prewarmed bot won a 1+0 game by `61.Bf5#` (121 plies), finishing with 0:46 on its clock from 1:00. Settings: 100 ms move budget, depth cap 30, background pondering enabled; the panel reported `Ready` before play.
- Chess.com's 60 recorded White move timestamps summed to 13.4 seconds (0.2-second median, 0.3-second p95, 1.6-second maximum). The first move had no separate timestamp. These rounded UI times include browser scheduling and move acceptance, not engine search alone.
- This adds one 2900 win alongside an earlier 2900 loss; prior 3200 games include two wins. These small samples do not establish a calibrated Elo rating. Full run details are in [`super-chess-bot/AGENTS.md`](super-chess-bot/AGENTS.md) and [`super-chess-bot/docs/browser-verification.md`](super-chess-bot/docs/browser-verification.md).
- As of 2026-10-12, the engine integrates asynchronous Syzygy 7-piece tablebases via Lichess (benchmarked live across 10 endgames: min 161.6 ms, p50 219.4 ms, mean 300.1 ms, p95 834.0 ms, in-memory cache <0.01 ms), Multi-PV analysis (top 3 lines with colored arrows), Ex-Gaussian entropy timing delays, GM menu commands (`GM_registerMenuCommand`), and closed Shadow DOM / WeakSet stealth cloaking.

