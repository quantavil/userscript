# AI Wishlist modernization — execution ledger

Source of intent: user-supplied Preact + Vite+ modernization plan, 2026-10-15.
Worktree: `.worktrees/ai-wishlist-modernization`, branch `ai-wishlist-modernization`.
Baseline: 36 passed, 2 skipped (uncommitted /tmp fixtures), build 132.20 kB / gzip 32.85 kB.

Stages:

1. Local Vite+ / Preact compatibility build.
2. Marketplace identity, currency, specifications, storage and bounded crawl services.
3. AI transport and conversation lifecycle, Markdown sanitization.
4. Script-owned Preact dashboard, settings, chat, toasts and history actions.
5. Regression/component/browser verification, audit and documentation.

Interface review: URL canonicalization feeds adapters, price history and currency inference; storage subscriptions feed one UI bridge and card state; cancellation/invalidation gates crawl and chat writes. No saved schemas or migrations change.

Stage 1: compatibility passed — Preact JSX probe imported from userscript entry; `bun run build` produced a single 146.86 kB userscript. Probe removed after verification. Exact requested dependency versions installed successfully; local CLI runs on Node 26.11.1. No global/root/sibling changes.

Stage 2: marketplace/scraping regressions RED→GREEN (4 reproduced failures); storage validation/write failure tests RED→GREEN; price grouping/history URL tests passed (12); crawler status, deduplication, concurrency, empty specs and invalidation tests passed (4). Removed dependence on /tmp fixtures.
Stage 3: chat service tests passed (12), covering duplicate sends, Stop/clear/provider invalidation, malformed/blocked/multipart responses, timeouts, bounded context and distinct connectivity checks. Markdown and sanitizer tests passed (20 including number formatting).
Stage 4: Preact component tests passed (4). Fixed subscription timing and toast outside-click behavior found during tests. Plain TS PDP/card tests passed (4); consolidated observer and history navigation with teardown.

Pre-review automated checkpoint: `bun run check` passed (84 tests / 11 suites, zero skipped; format/lint/type checks and production build passed), `bun audit` reported no known vulnerabilities across 397 packages. Added reset-focus regression afterward; it reproduced focus wrapping to hidden Settings and is being corrected before final verification.
Browser: isolated agent-browser session with GM shim, evaluating production userscript. Live Amazon IN listing: 21 card hearts, save/dashboard/history canonicalization. Live Flipkart listing: 45 hearts, save/dashboard, first-click sort options. Mobile 390×844 panel measured x=8,width=374; row opacity=1; history target 44×44. Amazon US initially displayed INR and correctly did not parse those strings as USD; browser currency preference is being set to native USD for remaining checks.

Final independent review: completed by fresh read-only reviewer. Findings: display/schema currency mismatch, hidden PDP heart, hidden count badge, hidden Clear search. Regraded the two hidden controls from Minor to Important: they remove existing visible functionality, rather than cosmetic polish. All four are in the fix pass; none deferred. Tests reproduced eight failures, plus independently reproduced badge and search visibility failures with the real stylesheet. Native display/schema currency guards add no stored fields or conversions. A preexisting test's location stub required its actual `href` once currency parsing depended on the complete URL.

Final fix pass: currency, PDP heart, saved-count badge and Clear search regressions RED→GREEN; full `bun run check` passed 98/98 tests across 12 suites (zero skipped), zero static/type warnings, production build 275.71 kB / gzip 72.23 kB. No deferred findings. Frozen-lockfile installation passed unchanged; audit found no vulnerabilities in 397 packages. Metadata inspected: version 2.0.0, GPL, three markets, unchanged broad @connect, only cross-tab listener grants added; one IIFE bundles Preact/marked/DOMPurify with no external requires.

Final browser evidence: actual Amazon US native USD listing yielded three hearts and saved $42.84 as amz_us_B0CRTR3PMF/US URL. Native currency selected only within the isolated anonymous test browser. Final production PDP bundle checked on Amazon US B0CRTR3PMF, Amazon IN B0FC2Y8XYF and Flipkart ACCHGPKHCHYWZUNR at desktop and 390×844. Floating hearts/history visible; panel hides PDP controls; saved badge visible. All three history actions opened new tabs and resolved to matching provider pages (links in audit). Live first-click sorting/selection leaves dashboard open; Escape restores FAB focus. Offline comparison and Settings labels/default model rendered on mobile. Screenshots retained under /tmp/aiw-* for this session; no site/fixture screenshots added to source.

Verification boundary: production bundle tested through isolated-browser GM shim, not a real extension manager; no live API credentials/paid generation used. Existing tests cover request behavior with controlled callbacks. Worktree retained for user inspection; no root/sibling changes, merge, push or deployment.
