# AI Wishlist modernization audit

Date: 2026-10-15. Scope: AI Wishlist only; no sibling/root/global runtime configuration changes. Findings distinguish reproducible behavior from conditional risks. No saved schema or model migrations were added.

## Reproduced defects and corrections

| Finding                                    | Evidence and correction                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Amazon US links/identity and dollar prices | Regression tests reproduced canonical URL and USD parse failures. Preserve US hostname, use new `amz_us_ASIN` ids, keep India `amz_ASIN` ids. Derive INR/USD from URL without stored currency fields. Sort/statistics/offline cheapest answers group by currency without conversion. |
| Amazon td specifications                   | A real jsdom row with two td cells returned no specification because both selectors chose the first. Select the distinct value cell and retain script/style text cleanup.                                                                                                            |
| Flipkart state assignment                  | Reproduced failures with unrelated surrounding objects, braces/escaped quotes in strings, and assignment lookalikes in comments. Text scanner skips strings/comments before the assignment and balances the assigned JSON object. Never executes scripts.                            |
| Malformed JSON-LD                          | A malformed Product block hid a later valid one. Catch parse failures per block.                                                                                                                                                                                                     |
| Storage validation/write feedback          | Invalid entries/field types were returned directly and writes swallowed failures. Validate reads without rewriting values; return save status and emit visible failure feedback. Bridge local events and remote GM notifications with teardown.                                      |
| Crawl lifecycle                            | Old requests lacked timeout/status/concurrency limits and could overwrite cleared specs. Queue at most two, deduplicate, use 20s timeout/status checks, save meaningful specs only, cancel stale work. Remote wishlist changes conservatively cancel pending crawls.                 |
| AI request lifecycle                       | Extracted transport/conversation state. One active request, Stop, clear/provider invalidation and revision guard, raw history, multipart non-thought text extraction, accurate errors, no automatic retries. 60s chat / 15s connectivity timeout.                                    |
| Response rendering                         | Replaced ad-hoc Markdown/sanitizer code with marked + DOMPurify; payload tests cover script/event/URL/SVG/MathML inputs. Raw history is never replaced with display HTML.                                                                                                            |
| Controls and focus                         | Replaced interactive divs with buttons/labels; sort visibility is declarative from the first click; Escape/back restore focus; clipboard errors are visible; clear/reset require confirmation.                                                                                       |
| UI rendering lifecycle                     | Live browser inspection found legacy CSS left rows transparent and action buttons hidden after removing the old renderer. Declarative visibility now works without animations, including reduced motion. Component regression loads the real stylesheet.                             |
| Observer ownership/navigation              | One shared navigation/observer service ignores script-owned mutations and cleans up listeners/history wrappers/timers. No claim of measured severe performance impact.                                                                                                               |

## Stack and build compatibility

Exact selected versions installed locally: Preact 11.0.1, Vite+ 1.2.0, official preset 2.10.6, vite-plugin-monkey 8.1.1, TypeScript 7.0.2, marked 18.1.1, DOMPurify 3.4.17. Vite+ bundles Vitest 5.0.4, Oxlint and Oxfmt. Bun manages dependencies and invokes scripts; Node 26.11.1 runs Vite+ tooling. Vite core alias/override follow the Bun dependency layout. No Biome, React compatibility aliases, UI framework or state library.

A temporary real Preact JSX probe built successfully into the single userscript before the UI refactor. Full UI now mounts in a dedicated script-owned container; host elements remain under plain TypeScript adapters. Static SVG markup remains trusted repository content; external AI markup passes through DOMPurify.

Baseline: 36 tests passed, 2 skipped; build 132.20 kB (gzip 32.85 kB). The two machine-dependent /tmp tests are replaced by committed HTML fixtures. Parser fixtures are excluded from Oxfmt because formatting inline assignments as JS removes required JSON quotes.

## Data, AI and history behavior

Saved wishlist/settings/API key/specifications live in local userscript-manager GM storage shared across the three matched origins. Cross-tab notification is not cloud synchronization. Raw chat history and image fallback data are in memory. Writes do not claim success after a GM failure. Existing saved models remain selected; fresh/reset model and placeholder are `gemini-3.5-flash-lite`.

AI requests contain at most 20 completed exchanges and 100,000 product-context characters, with truncation feedback. Product data is labeled untrusted reference material and missing specifications are acknowledged. Gemini detection uses the exact parsed hostname and keys are carried in the `x-goog-api-key` header. Provider verification reads a model listing and reports connectivity independently of generation.

Price-history actions generate `https://pricehistory.app/?search=<encoded canonical product URL>` at render time. Links retain Amazon marketplace/ASIN and Flipkart PID and remove referrals. Accessible product-specific labels, visible focus, 44px targets and `noopener noreferrer` accompany new-tab links. Click isolation does not prevent normal anchor navigation. No historical prices are fetched or stored; ambiguous/untracked results belong to the external provider.

## Conditional risks and limits

- Site layouts, availability, localization and anti-bot responses can prevent scraping. Native INR/USD prices are supported; prices in another displayed currency are not converted. Browser verification records availability separately from parser correctness.
- Remote GM notifications depend on manager support. Updates refresh open views but concurrent read-modify-write operations across tabs are not transactional; there is no cloud service or conflict protocol.
- Configured AI endpoints receive the explicitly sent context and key; support and billing/model availability vary. Connectivity verification does not prove generation. No live paid-generation claim is made without credentials.
- Sanitization and untrusted-reference instructions reduce different risks; the latter cannot guarantee a model ignores every prompt injection in product text.
- Broader thumbnail fallback uses GM network capability and site/CSP rules can still block image display; initials remain the fallback.

## Rejected or unsupported claims

- `innerHTML` alone is not evidence of a critical exploitable XSS. The old custom sanitizer was fragile and under-tested; replacement and real payload tests improve the boundary without asserting an unproven exploit.
- `@connect *` is not credential theft. It permits configured custom AI endpoints and cross-site resources; a theft claim requires an actual exfiltration path. No additional history network grants were added.
- A broad MutationObserver is not automatically a severe performance defect. Discovery now excludes owned changes, but no before/after CPU benchmark or severe-performance claim is asserted.

## Verification

`bun run check` passed: **98 tests across 12 suites, zero skipped**, clean format/type-aware lint/type checks, strict TypeScript and production build. `bun install --frozen-lockfile` passed without changes. `bun audit` found no known vulnerabilities across 397 audited packages. `git diff --check` passed.

Final userscript: **275.71 kB / gzip 72.23 kB**, versus baseline 132.20 / 32.85 kB: +143.51 kB raw, +39.38 kB gzip. The bundle contains Preact, marked and DOMPurify and is a single IIFE with no runtime CDN imports or `@require`. Metadata retains the three matches, GPL-3.0-or-later and `@connect *`; GM value-change listener grants were added for cross-tab updates. History needs no added grant. Version: 2.0.0.

Browser testing used an isolated agent-browser Chromium session, desktop widths 1280/1440 and mobile width **390×844**, evaluating the production bundle with an in-memory GM shim and autocrawl disabled. A shim verifies browser behavior, not extension-manager sandbox/permission behavior. No live paid AI request was made; transport/cancellation/timeout tests use controlled GM callbacks. Browser clipboard denial and manager sandbox integration are covered by local error-path tests rather than claimed as real extension checks.

| Market       | Live listing                                                                                                       | Product page and dashboard                                                                                                  | History action                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Amazon India | Headphones: 21 card hearts; save works                                                                             | `B0FC2Y8XYF`: heart/history visible at both widths; canonical India URL; dashboard/Escape focus checked                     | Resolved to matching boAt Rockerz 411 history page                    |
| Amazon US    | Initially displayed INR; after selecting USD in this isolated anonymous session, three priced cards yielded hearts | `B0CRTR3PMF`: saved as `amz_us_B0CRTR3PMF`, $42.84, US URL; final PDP controls visible at both widths; offline chat checked | Resolved to matching Soundcore P30i history page                      |
| Flipkart     | Headphones: 45 card hearts; save works                                                                             | PID `ACCHGPKHCHYWZUNR`: final floating controls visible at both widths; dashboard, settings and sort checked                | Resolved to matching TRIGGR Trinity 3 history page with PID preserved |

Mobile measurements: panel x=8, width=374 on 390px viewport; history anchor **44×44px**. Final browser checks confirmed visible rows/actions, count badge, PDP hiding when the panel opens, accessible Settings labels and fresh model default. The sorting menu opens on its first click and choosing an option leaves the panel open. Offline Markdown comparison renders a table and acknowledges missing specifications.

Matching provider destinations observed:

- [Amazon India: boAt Rockerz 411](https://pricehistory.app/p/boat-rockerz-411-40ms-low-latency-40hrs-KbmWViG5)
- [Amazon US: Soundcore P30i](https://pricehistory.app/p/soundcore-p30i-anker-noise-cancelling-earbuds-hands-Fx7dWBSj)
- [Flipkart: TRIGGR Trinity 3](https://pricehistory.app/p/triggr-trinity-3-fabric-finish-dual-pairing-OuBP0pw8)

No historical-price accuracy claim follows from these routing checks. They verify that the external provider accepted the links and selected matching products.
