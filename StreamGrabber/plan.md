# StreamGrabber - Analysis & Suggestions

## 🐛 Real Bugs & Issues

### Critical

| # | Issue | Description |
|---|-------|-------------|
| 1 | **Race condition in enrichment** | If user clicks item while still "Analyzing...", download might use stale/incomplete data |
| 2 | **Blob revoked before download** | If page revokes blob URL before user clicks download, it fails silently |
| 3 | **showSaveFilePicker cancel** | User canceling file picker causes fallback to in-memory buffer (unexpected behavior) |
| 4 | **Audio-only streams ignored** | Master playlists with audio renditions (`EXT-X-MEDIA`) are completely ignored |


### Moderate

| # | Issue | Description |
|---|-------|-------------|
| 9 | **Remote job pause/resume desync** | UI toggles immediately but actual state in child frame may differ |
| 10 | **Discontinuity not handled** | `EXT-X-DISCONTINUITY` tags ignored - can cause playback issues in downloaded file |

### Minor

| # | Issue | Description |
|---|-------|-------------|
| 11 | **HEAD request missing** | Direct video URLs don't get size/type until download starts |
| 12 | **No segment validation** | Corrupted/truncated segments aren't detected |
| 13 | **Variable segment size progress** | Progress bar jumps erratically when segment sizes vary greatly |
| 14 | **Relative URL edge cases** | `safeAbs()` may fail with malformed/unusual base URLs |

---

## 🔧 Improvements

### Performance

```
1. Parallel variant analysis - Fetch all variant manifests concurrently, not sequentially
2. Debounce take() calls - Prevent multiple rapid detections of same URL
3. Connection pooling - Reuse connections for same-origin segments
4. Virtual scrolling - For large item lists, render only visible items
5. Lazy enrichment - Only enrich when panel opens or item becomes visible
6. Smarter size estimation - Sample first 2-3 segments to estimate average, not running average
```

### UX/UI

```
7. Loading skeleton - Show placeholder while enriching instead of "Analyzing..."
8. Error state UI - Visual indication for failed/invalid items (red badge, strike-through)
9. Sorting options - Sort by: size, duration, quality, detection time
10. Search/filter box - Filter items by URL keyword or quality
11. Grouped display - Group by: domain, type (HLS/Direct), quality tier
12. Confirmation dialog - "Download 1.2GB file?" for large downloads
13. Drag FAB position - Let user reposition FAB to avoid blocking content
14. Toast notifications - Non-blocking status messages (copied, started, etc.)
```

### Reliability

```
16. Retry with exponential backoff - Increase delay between retries
17. Partial resume - Save progress to localStorage, resume after page refresh
18. Segment checksum verification - Validate downloaded data integrity
19. Graceful CORS error handling - Better message: "This video requires authentication"
20. Timeout scaling - Increase timeout for slow connections automatically
21. Dead blob detection - Check if blob still valid before attempting download
22. Network change detection - Pause/retry on connection loss
```

### Code Quality

```
23. Centralized error handling - Single error handler with categorized messages
24. Event emitter pattern - Decouple detection from UI updates
25. State machine for downloads - Clear states: queued/downloading/paused/done/error
26. Unit testable functions - Separate pure logic from DOM/network side effects
27. TypeScript-style JSDoc - Better IDE support and self-documentation
```

---

## ✨ Additional Features

### High Value (Recommended)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Audio track selection** | Choose language/audio rendition from `EXT-X-MEDIA` | Medium |
| **Subtitle extraction** | Download VTT/SRT from HLS `SUBTITLES` group | Medium |
| **Custom filename template** | `{title}_{quality}_{date}.{ext}` with variables | Low |
| **Quality auto-select** | Option to always pick highest/lowest/specific quality | Low |
| **Batch download** | Checkbox selection + "Download All" button | Medium |
| **Download queue** | Sequential downloads with queue management UI | Medium |
| **Site-specific rules** | Custom extraction logic for popular sites | High |

### Medium Value

| Feature | Description | Complexity |
|---------|-------------|------------|
| **DASH/MPD support** | Support for MPEG-DASH streams (very common) | High |
| **Audio+Video merge** | Combine separate audio/video playlists | High |
| **Clip extraction** | Download only start-end time range | High |
| **Thumbnail preview** | Show video poster/thumbnail in list | Low |
| **Download speed display** | Show MB/s in progress card | Low |
| **ETA calculation** | "~2 min remaining" based on speed | Low |
| **Bandwidth throttle** | Option to limit download speed | Medium |
| **History log** | Remember last N downloads with re-download option | Medium |
| **Export URL list** | Copy all detected URLs as text/JSON | Low |

### Nice to Have

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Dark/Light theme** | Theme toggle for light mode preference | Low |
| **History log** | Remember last N downloads with re-download option | Medium |
| **Export URL list** | Copy all detected URLs as text/JSON | Low |

---

## 🎯 Priority Recommendations

### Immediate Fixes (v1.3.1)

```
1. Fix race condition - Block download until enriched
2. Add enrichment timeout (10s max)
3. Filter invalid items from badge count
4. Better error messages for DRM content
5. Debounce take() to prevent duplicate detection
```

### Next Release (v1.4.0)

```
1. Audio track selection (EXT-X-MEDIA parsing)
2. Subtitle download support
3. Custom filename templates
4. Quality auto-select option
5. Download speed + ETA display
6. HEAD request for direct videos (get size before download)
```

### Future (v2.0.0)

```
1. DASH/MPD support
2. Batch download with queue
3. Audio+Video merge
4. Partial resume (localStorage)
5. Site-specific handlers
```

---

## 🔍 Specific Code Suggestions

### 1. Fix Race Condition
```javascript
// In handleItem(), wait for enrichment:
async function handleItem(it) {
  if (it.kind === 'hls' && !it.enriched) {
    await enrichHlsItem(it); // Wait instead of proceeding
  }
  // ... rest of logic
}
```

### 2. Debounce Detection
```javascript
const pendingUrls = new Set();
const DEBOUNCE_MS = 50;

function take(url, metadata = {}) {
  if (pendingUrls.has(url)) return;
  pendingUrls.add(url);
  setTimeout(() => {
    pendingUrls.delete(url);
    takeInternal(url, metadata);
  }, DEBOUNCE_MS);
}
```

### 3. Enrichment Timeout
```javascript
async function enrichHlsItem(item) {
  const timeout = new Promise((_, rej) => 
    setTimeout(() => rej(new Error('Timeout')), 10000)
  );
  try {
    await Promise.race([actualEnrichment(item), timeout]);
  } catch (e) {
    item.label = 'Failed to analyze';
    item.hlsType = 'error';
  }
}
```

### 4. Audio Track Detection
```javascript
function buildAudioTracksFromManifest(man, base) {
  const audio = [];
  const media = man.mediaGroups?.AUDIO || {};
  for (const [group, tracks] of Object.entries(media)) {
    for (const [name, track] of Object.entries(tracks)) {
      if (track.uri) {
        audio.push({
          name: track.name || name,
          language: track.language || 'und',
          url: safeAbs(track.uri, base),
          default: track.default || false
        });
      }
    }
  }
  return audio;
}
```

