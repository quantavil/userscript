# AGENTS.md

Guidance for work in this repository (`~/Documents/userscript`).

## Monorepo Practices

- **Runtime & Tools**: Use `bun` as the primary runtime and package manager across all userscript subprojects.
- **Build System**: Scripts use Vite (`vite-plugin-monkey`) with TypeScript. Output bundles reside in `dist/`.
- **License**: Userscripts must include an MIT license in metadata (`license: 'MIT'` in `vite.config.ts`), `package.json`, and project `LICENSE`. Exception: `universal-solver` is GPL-3.0-or-later (its own `LICENSE`, `package.json` and `@license`).
- **Subproject Isolation**: Each project is self-contained with its own `package.json`, `vite.config.ts`, tests, and documentation.
- **Testing**: Run project unit tests (`bun test`) and verify production builds (`bun run build`) before committing.
- **Subproject Documentation**: Each subproject directory should maintain an updated `README.md` and `AGENTS.md` with domain-specific architecture and constraints.
