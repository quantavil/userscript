# SiteOrbit Engineering Notes

## Boundaries
- Framework-free collection, parsing, and storage; Preact is restricted solely to `src/ui`.
- Clean JSON payload validation using modular Valibot; zero heavy dependencies.
- Independent 30-day cache TTL per registrable domain in userscript GM storage.
- Ineligible hosts: `tranco-list.eu`, bare public suffixes, `localhost`, `.local`, IPv4/IPv6, non-HTTP(S).

## Data Flow
- `boot.ts`: Normalizes active URL, increments local visit count, starts background collection.
- `collector.ts`: Queries Tranco API (`https://tranco-list.eu/api/ranks/domain/<domain>`), uses GM locks for cross-tab deduplication.
- `extract.ts`: Validates response schema using Valibot, extracts rank points, calculates 30-day momentum.
- `store.ts`: Serializes and manages schema-versioned `SiteRecord` items in GM storage.
- `ui/mount.tsx`: Mounts Preact into top-right closed Shadow DOM on `Ctrl+Alt+S` or GM menu command.

## Structure
- `src/domain.ts`: Zero-dependency apex domain extractor with universal longest-match algorithm.
- `src/suffixes.ts`: Auto-generated database of 5,506 official ICANN multi-level (2, 3, 4) suffixes.
- `scripts/generate-suffixes.ts`: Build-time generator fetching and compiling the Mozilla Public Suffix List.
- `src/extract.ts`: Modular Valibot schema and rank momentum calculator for Tranco responses.
- `src/detect-tech.ts`: In-DOM tech detector for Frameworks, CMS, UI, Analytics, and Observability.
- `src/dns.ts`: Cloudflare DoH DNS client and Nameserver/Mail provider classifier.
- `src/telemetry.ts`: Performance navigation timing & OpenGraph metadata extractor.
- `src/collector.ts`: Parallel fetch engine for Tranco + DoH with cross-tab mutex locks.
- `src/store.ts`: Storage repository with locks, JSON export, and record lifecycle.
- `src/ui/`: Preact UI with `Snapshot.tsx` (centered orbit, badges, telemetry grid), `Leaderboard.tsx`, `App.tsx`, `styles.ts`.
- `extension/`: Firefox MV3 extension manifest, background event script, and icon.
- `dist/site-orbit.user.js`: Production userscript bundle.
- `dist-extension/`: Production Firefox MV3 WebExtension directory.

## Blunders
- **Similarweb Scraping Failure:** Background `GM_xmlhttpRequest` blocked by AWS WAF/CloudFront JS challenge. Switched to public Tranco List REST API.
- **`tldts` Bundle Bloat:** `tldts` inflated userscript to 24.8k lines. Replaced with ~30-line ccTLD parser, shrinking bundle by 89%.
- **`zod` Bundle Overhead:** Zod pulled in 40+ locale/schema processors (~86 KB bundle). Replaced with modular Valibot.
- **Off-Center Hero Orbit:** 2-column grid (`1fr 86px`) pushed circular orbit off-center. Refactored to full-width centered hero with bottom sparkline.
- **Modal Dismissal in Shadow DOM:** Retargeted click events inside closed Shadow DOM prevented document click detection. Added capturing `pointerdown` listener on window.

## Operational Facts
- Data Sources:
  - Tranco List API (`https://tranco-list.eu/api/ranks/domain/<domain>`)
  - Cloudflare DoH (`https://cloudflare-dns.com/dns-query`)
  - Browser Navigation Performance & DOM Inspection
- Request timeout: 15 seconds; Successful/No-data TTL: 30 days; Failure cooldown: 6 hours
- Leaderboard order: Global Rank ascending (#1 first), unranked last
- Storage prefix: `site-orbit:`
- Keyboard shortcut: `Ctrl+Alt+S`
- Suffix rule: Auto-refreshed from Mozilla PSL on every build via `prebuild` npm hook.

## Quality Gate
- Run `cd site-orbit && bun run check` before committing (must pass 46/46 tests, 0 linter errors, 0 type errors).
- Formatting: `bun run format`.
