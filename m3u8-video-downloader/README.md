# Universal M3U8 Downloader (Ultimate Edition)

A powerful, optimized, and user-friendly userscript for downloading HLS (.m3u8) video streams and direct video blobs directly from your browser.

## Features

- **Automatic Detection**: Automatically detects m3u8 streams and video blobs on any website
- **Multi-Quality Support**: Choose from available video quality variants for HLS streams
- **Encryption Support**: Handles AES-128 encrypted streams
- **Format Support**: Supports both fragmented MP4 (fMP4) and MPEG-TS formats
- **Progress Tracking**: Real-time download progress with pause/resume functionality
- **Video.js Integration**: Adds download buttons to Video.js players
- **Cross-Origin Support**: Uses GM_xmlhttpRequest for reliable cross-domain requests
- **Modern File APIs**: Utilizes File System Access API when available, falls back to blob downloads
- **Size Estimation**: Smart size estimation for HLS streams using bandwidth data or byte ranges
- **Smart Filtering**: Option to exclude small files (< 1 MB) to filter out thumbnails/ads
- **Robust Error Handling**: Automatic retry mechanism with configurable limits
- **Clean UI**: Floating download button with progress cards and variant picker
- **Concurrent Downloads**: Optimized concurrent segment downloading for faster HLS downloads

// @require https://cdnjs.cloudflare.com/ajax/libs/m3u8-parser/7.2.0/m3u8-parser.min.js
// @require https://cdn.jsdelivr.net/npm/p-queue@7.4.1/dist/index.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js


P0 — Critical (true)
- Large memory usage without File System Access API (HLS and direct)
  - True. HLS: chunks are accumulated then Blobbified in finalize() when useFS is false. Direct: full ArrayBuffer is fetched then Blobbified.
  - Where: downloadSegments → finalize() builds new Blob(chunks,…); downloadDirect fetches full arraybuffer then new Blob([buf],…).

- Unsupported encryption isn’t surfaced clearly to the user
  - True. Non-AES-128 segments are marked failed and only a generic failure is shown in the progress card; reason is only logged.
  - Where: handleSeg checks s.key.method !== 'AES-128' → status[i] = -1; err('Unsupported key method', …); finalize(false) later shows generic ✗.

- Incomplete URL validation (possible SSRF to private IPs)
  - True. Any detected URL is later fetched via gmGet/headMeta/getText without origin or private-range checks; @connect * allows cross-origin.
  - Where: take() stores any http(s)/blob; buildItems() calls getText(u) for m3u8; headMeta()/getBin()/getText() use GM_xmlhttpRequest.

P1 — High (true)
- No download resumption across crashes/reloads
  - True. There’s pause/resume in-session, but no persisted state or partial recovery on reload.
  - Where: No IndexedDB/localStorage of segment state; no resume token.

- Retry policy is basic (no error-type handling/backoff)
  - True. All failures are retried uniformly up to CFG.RETRIES with immediate re-queue; no 404/410 short-circuit or backoff.
  - Where: fail(i) → enqueueRetry(i) vs status[i] = -1 after threshold.

- fetch/XHR monkeypatch risk (compatibility)
  - True. fetch and XHR.open are wrapped without preserving native identity, which can break sites that inspect function identity.
  - Where: window.fetch = function…; XMLHttpRequest.prototype.open = function…

- Serial size probing for master variants (slow on many renditions)
  - True. Variant loop awaits getText(v.url) sequentially.
  - Where: downloadHls → for (const v of variants) { const mediaTxt = await getText(v.url); … }

- HLS detection misses extensionless URLs
  - True. Detection leans on .m3u8 in the URL or blob type sniff; no HEAD/GET sniff for extensionless HLS URLs.
  - Where: take() uses isM3U8Url(url); looksM3U8Type only applies to Blob paths via createObjectURL hook.

- Direct download is also memory-heavy without FS API
  - True. Full file is loaded into memory before saving.
  - Where: downloadDirect → gmGet(ArrayBuffer) then new Blob([buf], …).

P2 — Medium (true)
- IV derivation truncates to 32-bit
  - True. ivFromSeq uses n >>> 0 before BigInt, discarding high bits for very large sequence indexes.
  - Where: ivFromSeq: n = BigInt(n >>> 0).

- Possible long-session growth in BLOBS
  - True. BLOBS holds Blob refs for createObjectURL until revokeObjectURL is called; no TTL/trim for “other” blobs.
  - Where: createObjectURL hook stores { blob, … } in BLOBS; trimCaches deliberately skips BLOBS.

- Missing user-visible reason on overall failure
  - True. finalize(false) calls card.done(false) without passing a reason, even if a specific error was encountered.
  - Where: downloadSegments → finalize(false) → card.done(false).

- Retry policy can thrash on 403/410/live windows
  - True. No backoff, no rendition failover; can loop retries on unrecoverable errors.
  - Where: fail()/pump().

- HEAD reliance can leave size/type unknown
  - True. headMeta() returns {length:null,type:null} when HEAD fails; no GET-range fallback for metadata, so size labels can be missing.
  - Where: headMeta() catch path.

P3 — Low (true or accurate observations)
- mountUI called twice
  - True. It’s invoked after definition and again at the end; harmless, just redundant.

- DB.hiddenProgress is unused
  - True. Defined but never read.

- Badge hidden for single item
  - True. Only shows when count > 1.
  - Where: flushBadge() checks badgeWanted > 1.

- Variant-size labeling policy
  - Accurate. buildItems avoids variant fetching, but downloadHls does per-variant probing (sequential). A “fast list” mode would be an improvement, not a bug.

- isVideoUrl includes ogg/ogv (may capture audio)
  - True. isVideoUrl matches ogg/ogv; can label audio as “video”.

Nuanced/partially true
- “No cleanup for orphaned blob URLs”
  - Partly true. The fallback saver revokes object URLs after 30s (so they linger briefly if the page stays open). On page/tab close, the browser frees them anyway, so it’s not a durable leak.
  - Where: saveBlob() fallback → setTimeout(() => URL.revokeObjectURL(url), 30000).

- “Incomplete HLS spec support” (e.g., EXT-X-DISCONTINUITY)
  - True that support is incomplete (no explicit handling for DISCONTINUITY, DISCONTINUITY-SEQUENCE, GAP, PROGRAM-DATE-TIME, etc.). Impact varies by stream: fMP4 with changing init maps is handled; TS streams across discontinuities may still concatenate but can glitch or fail on more complex playlists.

Bottom line
- Definitely true and most severe: memory exhaustion without FS API; lack of URL validation.
- Also true and impactful: no crash-safe resume; undifferentiated retries; sequential variant probing; monkeypatch compatibility risk.
- Minor items are accurate as noted (redundancies, UI details, and detection heuristics).