# SiteOrbit

[![GitHub](https://img.shields.io/badge/GitHub-quantavil%2Fuserscript-181717?logo=github&logoColor=white)](https://github.com/quantavil/userscript)

SiteOrbit is a lightweight, zero-WAF universal domain intelligence and tech observatory available as both a **Universal Userscript** and a **Firefox MV3 WebExtension**.

Open **Show SiteOrbit** (or press **Ctrl+Alt+S**) on any tab to view the current site's global rank radar, live tech stack, DNS infrastructure, and page performance telemetry, or browse a sortable leaderboard of every visited domain.

## What it collects

1. **Tranco Top 1M Global Rank:**
   - Daily verified global domain rank from the research-grade Tranco Top 1M list.
   - 30-day historical rank momentum (`+2`, `-5`).
   - 30-day rank sparkline waveform, 30-day peak (best), and 30-day low (trough).

2. **Live In-Page Tech Stack Detection:**
   - Detects Frontend Frameworks (*React, Next.js, Vue, Nuxt, Svelte, Astro, Angular, Remix*).
   - Detects CMS & E-Commerce (*Shopify, WordPress, Webflow, Ghost*).
   - Detects Analytics & Observability (*PostHog, Google Analytics, Plausible, Mixpanel, Sentry, Cloudflare*).
   - Detects UI Libraries (*Tailwind CSS*).

3. **DNS & Cloud Infrastructure (Cloudflare DoH):**
   - DNS Provider & CDN classification (*Cloudflare, AWS Route 53, NS1, Google Cloud DNS, Akamai, Azure*).
   - Enterprise Mail Server detection (*Google Workspace, Microsoft 365, Proton Mail, Zoho, Fastmail*).
   - IPv6 support detection via AAAA records.

4. **Live Browser Performance Telemetry:**
   - Real-time TTFB (Time to First Byte), Page Load Time, Asset Transfer Size, and Resource Request Count.
   - Active transport protocol (*HTTP/3 QUIC, HTTP/2, HTTP/1.1*).

5. **Universal Public Suffix Resolution:**
   - Pre-compiled database of **5,506 official multi-level (2, 3, 4) ICANN suffixes** from the Mozilla PSL.
   - Auto-updated before every build (`prebuild` hook).
   - Zero runtime network overhead and instant $O(1)$ root domain resolution.

6. **Local Browsing Observatory & Brand Identity:**
   - High-res domain favicon and OpenGraph site description.
   - First visited timestamp, last visited timestamp, and total visit count per domain.
   - Private, locally stored in your browser storage.
   - Sortable & searchable local leaderboard (#1 top sites first).
   - JSON export and one-click cache clearing.

## Network and privacy model

On the first visit to an eligible domain, SiteOrbit queries:
- Tranco API: `https://tranco-list.eu/api/ranks/domain/<domain>`
- Cloudflare DoH: `https://cloudflare-dns.com/dns-query`

- **Zero WAF & Zero CAPTCHAs:** Queries open research endpoints with zero interactive challenges.
- **Local Isolation:** All records remain strictly in your local browser storage. No tracking or telemetry uploaded.
- **30-Day TTL:** Each domain is cached locally for 30 days. Failed queries have a 6-hour retry cooldown.
- **Shadow DOM:** Rendered inside a closed Shadow DOM overlay at the top-right corner (`top: 18px; right: 18px;`) with escape-to-close and click-outside dismissal.

## Keyboard shortcut & controls

- **Toggle Panel:** `Ctrl+Alt+S` or click the extension toolbar icon
- **Dismiss Panel:** `Escape` or click anywhere outside the panel
- **Refresh Current Signal:** Click the refresh SVG icon in the header

## Install and build

Prerequisites: [Bun](https://bun.sh).

```bash
cd site-orbit
bun install
bun run check
```

### Option A: Install Userscript
Import `dist/site-orbit.user.js` into your userscript manager (Violentmonkey, Tampermonkey).

### Option B: Install Firefox WebExtension (MV3)
1. In Firefox, navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `dist-extension/manifest.json`.

## Commands

```bash
bun test                  # run unit and component tests
bun run typecheck         # strict TypeScript checks
bun run lint              # Biome linter and format verification
bun run generate:suffixes # refresh 5,500+ suffix database from Mozilla PSL
bun run build:userscript  # compile dist/site-orbit.user.js
bun run build:extension   # compile dist-extension/ Firefox addon
bun run build             # compile both userscript and Firefox extension
bun run check             # execute full verification suite
```
