// ==UserScript==
// @name         Universal M3U8 + Blob Downloader
// @namespace    https://github.com/m3u8dl-userscripts
// @version      2.6.1
// @description  Download HLS (.m3u8) streams and direct video blobs with smart filtering and size estimation 
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==

(() => {
  'use strict';

  // ========================
  // Configuration
  // ========================
  const MAX_RETRIES = 3;
  const CONCURRENCY = 6;
  const REQ_TIMEOUT = 60000;
  const MANIFEST_TIMEOUT = 30000;
  const MAX_MANIFESTS = 50;
  const SMALL_FILE_THRESHOLD = 1024 * 1024; // 1 MB
  const EXCLUDE_SMALL_DEFAULT = true;

  // ========================
  // Logging
  // ========================
  const log = (...a) => console.log('[MediaDL]', ...a);
  const err = (...a) => console.error('[MediaDL]', ...a);

  // ========================
  // State
  // ========================
  const state = {
    latestM3U8: null,
    latestVideo: null,
    manifests: new Set(),
    videos: new Set(),
    idleTimer: null
  };
  const blobStore = new Map();

  // Persistent settings
  const settings = {
    excludeSmall: (() => {
      try {
        const v = localStorage.getItem('m3u8dl_exclude_small');
        return v == null ? EXCLUDE_SMALL_DEFAULT : v === 'true';
      } catch { return EXCLUDE_SMALL_DEFAULT; }
    })()
  };
  const setExcludeSmall = (v) => { settings.excludeSmall = !!v; try { localStorage.setItem('m3u8dl_exclude_small', String(!!v)); } catch { } };

  // ========================
  // Caches & helpers
  // ========================
  const manifestCache = new Map();     // url -> text
  const manifestPending = new Map();   // url -> Promise<string>
  const headCache = new Map();         // url -> { length, type }
  const headPending = new Map();       // url -> Promise<{length,type}>
  const monitoredVideos = new Set();

  function evictOldest(set, max) {
    while (set.size > max) {
      const first = set.values().next().value;
      set.delete(first);
    }
  }

  // Promise de-duplicator (cache + in-flight)
  function ensureOnce(cache, pending, key, loader) {
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    const p = (async () => {
      try {
        const val = await loader();
        cache.set(key, val);
        return val;
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, p);
    return p;
  }

  // De-duplicated, cached manifest fetch
  const getManifest = (url) =>
    ensureOnce(manifestCache, manifestPending, url, () => getText(url));

  function revokeLater(blobUrl, ms = 30000) {
    try {
      setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch {} }, ms);
      window.addEventListener('pagehide', () => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
      }, { once: true });
    } catch {}
  }

  // ========================
  // Utilities
  // ========================
  const isHttp = (u) => /^https?:/i.test(u);
  const isBlob = (u) => /^blob:/i.test(u);
  const isMaster = (t) => /#EXT-X-STREAM-INF/i.test(t);
  const isMedia = (t) => /#EXTINF:/i.test(t) || /#EXT-X-TARGETDURATION:/i.test(t);
  const hasEndlist = (t) => /#EXT-X-ENDLIST\b/i.test(t);
  const sanitize = (s) => (s || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120).trim() || 'video';
  const toAbs = (u, b) => { try { return new URL(u, b).href; } catch { return u; } };
  const looksLikeM3U8Type = (t) => /mpegurl|application\/x-mpegurl|vnd\.apple\.mpegurl/i.test(t || '');
  const looksLikeVideoType = (t) => /^video\//i.test(t || '') || /matroska|mp4|webm|quicktime/i.test(t || '');
  const isM3U8Url = (u) => /\.m3u8(\b|[\?#]|$)/i.test(u || '');
  const isVideoUrl = (u) => /\.(mp4|mkv|webm|avi|mov|flv|m4v|ts|m2ts|ogg|ogv)(\?|#|$)/i.test(u || '');
  const guessExtFromType = (t = '') => (t = t.toLowerCase(), /mp4/.test(t) ? 'mp4' : /matroska|mkv/.test(t) ? 'mkv' : /webm/.test(t) ? 'webm' : /quicktime|mov/.test(t) ? 'mov' : /avi/.test(t) ? 'avi' : /mp2t|mpegts/.test(t) ? 'ts' : /ogg/.test(t) ? 'ogg' : 'mp4');
  const formatBytes = (n) => { if (n == null) return ''; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = n; while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; } return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`; };

  const guessExt = (url, type) =>
    type ? guessExtFromType(type)
         : ((url || '').match(/\.([a-z0-9]+)(\?|#|$)/i)?.[1]?.toLowerCase() || 'mp4');

  const filterBySmall = (items, enabled) =>
    enabled ? items.filter(it => it.size == null || it.size >= SMALL_FILE_THRESHOLD) : items;

  const escapeEl = document.createElement('div');
  const escapeHtml = (str) => { escapeEl.textContent = str == null ? '' : String(str); return escapeEl.innerHTML; };

  // compact size label for HLS estimation
  const sizeLabel = (est) => est?.bytes != null
    ? `${est.method === 'byterange' ? '' : '~'}${formatBytes(est.bytes)}`
    : '';

  // Unified URL detector used everywhere
  const detectFromUrl = (u) => {
    try {
      if (!u || typeof u !== 'string') return;
      if (!isHttp(u) && !isBlob(u)) return;
      if (isM3U8Url(u)) return detectedM3U8(u);
      if (isVideoUrl(u)) return detectedVideo(u);
      if (isBlob(u)) {
        const info = blobStore.get(u);
        if (info?.kind === 'm3u8') return detectedM3U8(u);
        if (info?.kind === 'video') return detectedVideo(u);
      }
    } catch {}
  };

  // Unified save to disk. Uses FS Access API when available, otherwise anchor fallback
  async function saveBlob(blob, filename, extHint) {
    try {
      if ('showSaveFilePicker' in window) {
        const ext = (extHint || '').replace(/^\./, '') || (blob.type.split('/').pop() || 'bin');
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Media', accept: { [blob.type || 'video/*']: [`.${ext}`] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      }
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    revokeLater(blobUrl);
    return true;
  }

  // Single click handler used by all buttons
  function triggerDownload(e) {
    try {
      floatingBtn.stopIdle?.();
      floatingBtn.startIdleTimer?.();
    } catch {}
    const totalSources = state.manifests.size + state.videos.size;
    chooseDownloadFlow({ showVariantPicker: e?.altKey || totalSources > 1 });
  }

  let mo = null;

  // ========================
  // Styles
  // ========================
  GM_addStyle(`
    .m3u8dl-btn{display:inline-flex;align-items:center;justify-content:center;height:2em;width:2.25em;border:none;cursor:pointer;background:transparent;color:inherit;padding:0;transition:opacity .25s}
    .m3u8dl-btn .m3u8dl-icon{width:18px;height:18px}
    .m3u8dl-floating{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:44px;height:44px;border-radius:50%;background:rgba(17,17,17,.92);color:#fff;border:1px solid rgba(255,255,255,.2);box-shadow:0 6px 24px rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;cursor:pointer;transition:opacity .25s,filter .2s}
    .m3u8dl-floating.show{display:flex}
    .m3u8dl-floating.idle{opacity:.28}
    .m3u8dl-floating.idle:hover{opacity:1}
    .m3u8dl-floating:hover{filter:brightness(1.12)}
    .m3u8dl-floating.detected{animation:m3u8-pulse .5s ease}
    .m3u8dl-badge{position:absolute;top:-4px;right:-4px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:8px;min-width:16px;text-align:center;box-shadow:0 2px 8px rgba(239,68,68,.4);display:none}
    .m3u8dl-badge.show{display:block}
    @keyframes m3u8-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    #m3u8dl-progress-container{position:fixed;bottom:5rem;right:1rem;z-index:2147483646;display:flex;flex-direction:column;gap:.75rem;max-width:360px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
    .m3u8dl-card{background:rgba(17,17,17,.97);color:#e5e7eb;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,.5);opacity:0;transform:translateX(100%);transition:opacity .28s,transform .28s}
    .m3u8dl-card.show{opacity:1;transform:translateX(0)}
    .m3u8dl-header{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:10px}
    .m3u8dl-title{font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .m3u8dl-actions{display:flex;gap:6px}
    .m3u8dl-mini-btn{background:transparent;border:none;color:#a3a3a3;cursor:pointer;padding:4px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;transition:all .2s}
    .m3u8dl-mini-btn:hover{color:#fff;background:rgba(255,255,255,.12)}
    .m3u8dl-mini-btn .ico{font-size:13px}
    .m3u8dl-bar{height:6px;background:rgba(255,255,255,.15);border-radius:999px;overflow:hidden;margin-bottom:7px}
    .m3u8dl-fill{height:100%;width:0;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width .2s}
    .m3u8dl-fill.ok{background:linear-gradient(90deg,#10b981,#34d399)}
    .m3u8dl-fill.err{background:linear-gradient(90deg,#ef4444,#f87171)}
    .m3u8dl-text{text-align:right;color:#d1d5db;font-size:12px;font-weight:500;min-height:17px}
    .m3u8dl-variant-popup{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
    .m3u8dl-variant-popup.show{display:flex}
    .m3u8dl-variant-card{background:#111827;color:#e5e7eb;border:1px solid rgba(255,255,255,.15);padding:16px;border-radius:12px;width:min(420px,92vw);max-height:80vh;overflow-y:auto;scrollbar-width:thin}
    .m3u8dl-variant-card h4{margin:0 0 4px;font-size:15px;font-weight:600}
    .m3u8dl-variant-card .subtitle{font-size:12px;color:#9ca3af;margin-bottom:10px}
    .m3u8dl-opt{display:flex;user-select:none;cursor:pointer;font-size:12px;color:#9ca3af;margin:6px 0 12px;gap:.5rem;align-items:center}
    .m3u8dl-var-list{display:flex;flex-direction:column;gap:8px}
    .m3u8dl-var-btn{background:#1f2937;border:1px solid rgba(255,255,255,.14);color:#e5e7eb;border-radius:8px;padding:11px 13px;text-align:left;cursor:pointer;font-size:13px;transition:all .2s;position:relative}
    .m3u8dl-var-btn:hover,.m3u8dl-var-btn:focus{background:#374151;border-color:rgba(255,255,255,.25);transform:translateX(2px);outline:none}
    .m3u8dl-var-btn.video-direct{background:linear-gradient(135deg,#065f46,#047857);border-color:#10b981}
    .m3u8dl-var-btn.video-direct:hover{background:linear-gradient(135deg,#047857,#059669);border-color:#34d399}
    .m3u8dl-var-btn .badge{position:absolute;top:8px;right:8px;background:#3b82f6;color:#fff;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:600;text-transform:uppercase}
    .m3u8dl-var-btn.video-direct .badge{background:#10b981}
    .m3u8dl-var-btn .title{font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:6px}
    .m3u8dl-var-btn .subtitle{font-size:11px;opacity:0.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .m3u8dl-variant-card::-webkit-scrollbar{width:6px}
    .m3u8dl-variant-card::-webkit-scrollbar-thumb{background:rgba(255,255,255,.25);border-radius:6px}
    @media (max-width:480px){
      #m3u8dl-progress-container{left:1rem;right:1rem;max-width:none}
      .m3u8dl-card{min-width:auto}
      .m3u8dl-variant-card{width:min(360px,92vw)}
    }
  `);

  // ========================
  // UI Assets
  // ========================
  const DOWNLOAD_ICON_SVG = `
    <svg class="m3u8dl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`;

  // ========================
  // UI Components
  // ========================
  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.className = 'm3u8dl-floating';
    btn.title = 'Download detected media (HLS/Video/Blob)';
    btn.setAttribute('aria-label', 'Download media');
    btn.innerHTML = DOWNLOAD_ICON_SVG;

    const badge = document.createElement('span');
    badge.className = 'm3u8dl-badge';
    btn.appendChild(badge);

    const startIdle = () => { clearTimeout(state.idleTimer); state.idleTimer = setTimeout(() => btn.classList.add('idle'), 15000); };
    const stopIdle = () => { btn.classList.remove('idle'); clearTimeout(state.idleTimer); };

    btn.onclick = triggerDownload;
    btn.onmouseenter = stopIdle;
    btn.onmouseleave = startIdle;
    btn.startIdleTimer = startIdle;
    btn.stopIdle = stopIdle;
    btn.updateBadge = () => {
      const count = state.manifests.size + state.videos.size;
      if (count > 1) { badge.textContent = count; badge.classList.add('show'); }
      else badge.classList.remove('show');
    };
    btn.cleanup = () => { clearTimeout(state.idleTimer); try { mo?.disconnect(); } catch { } };
    return btn;
  }

  function createProgressContainer() {
    const div = document.createElement('div');
    div.id = 'm3u8dl-progress-container';
    return div;
  }

  function createVariantPopup() {
    const popup = document.createElement('div');
    popup.className = 'm3u8dl-variant-popup';
    popup.innerHTML = `
      <div class="m3u8dl-variant-card" role="dialog" aria-label="Select media">
        <h4>Choose Media</h4>
        <div class="subtitle">Select quality or source to download</div>
        <label class="m3u8dl-opt">
          <input type="checkbox" class="m3u8dl-exclude-small" style="margin-right:.5rem;"> Exclude small files (&lt; 1 MB)
        </label>
        <div class="m3u8dl-var-list"></div>
      </div>`;
    return popup;
  }

  const floatingBtn = createFloatingButton();
  const progressContainer = createProgressContainer();
  const variantPopup = createVariantPopup();

  function mountUI() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', mountUI, { once: true }); return; }
    if (!progressContainer.parentNode) document.body.appendChild(progressContainer);
    if (!floatingBtn.parentNode) document.body.appendChild(floatingBtn);
    if (!variantPopup.parentNode) document.body.appendChild(variantPopup);
  }

  function createProgressCard(title, sourceUrl, onStopResume, onCancel) {
    const card = document.createElement('div');
    card.className = 'm3u8dl-card';
    card.innerHTML = `
      <div class="m3u8dl-header">
        <div class="m3u8dl-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="m3u8dl-actions">
          <button class="m3u8dl-mini-btn copy-btn" title="Copy URL" aria-label="Copy URL"><span class="ico">📋</span><span class="lbl">Copy</span></button>
          ${onStopResume ? `<button class="m3u8dl-mini-btn stop-btn" title="Stop" aria-label="Stop/Resume"><span class="ico">⏸</span><span class="lbl">Stop</span></button>` : ''}
          <button class="m3u8dl-mini-btn close-btn" title="Cancel" aria-label="Cancel"><span class="ico">✕</span></button>
        </div>
      </div>
      <div class="m3u8dl-bar"><div class="m3u8dl-fill"></div></div>
      <div class="m3u8dl-text">0%</div>`;
    progressContainer.appendChild(card);
    requestAnimationFrame(() => card.classList.add('show'));

    const stopBtn = card.querySelector('.stop-btn');
    const closeBtn = card.querySelector('.close-btn');
    const copyBtn = card.querySelector('.copy-btn');
    const fill = card.querySelector('.m3u8dl-fill');
    const text = card.querySelector('.m3u8dl-text');

    if (stopBtn && onStopResume) stopBtn.onclick = onStopResume;
    closeBtn.onclick = onCancel;
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(sourceUrl || ''); copyBtn.querySelector('.lbl').textContent = '✓'; setTimeout(() => (copyBtn.querySelector('.lbl').textContent = 'Copy'), 1200); }
      catch { copyBtn.querySelector('.lbl').textContent = 'Err'; setTimeout(() => (copyBtn.querySelector('.lbl').textContent = 'Copy'), 1200); }
    };
    return {
      setStopped(stopped) {
        if (!stopBtn) return;
        const ico = stopBtn.querySelector('.ico'), lbl = stopBtn.querySelector('.lbl');
        stopBtn.title = stopped ? 'Resume' : 'Stop'; ico.textContent = stopped ? '▶' : '⏸'; lbl.textContent = stopped ? 'Resume' : 'Stop';
      },
      update(pct, extraText = '') {
        const percent = Math.max(0, Math.min(100, Math.floor(pct)));
        fill.style.width = `${percent}%`;
        text.textContent = `${percent}%${extraText ? ' ' + extraText : ''}`;
      },
      done(ok = true, msg) {
        fill.classList.add(ok ? 'ok' : 'err');
        fill.style.width = '100%';
        text.textContent = msg || (ok ? '✓ Complete' : '✗ Failed');
        setTimeout(() => card.remove(), 2500);
      },
      remove() { card.classList.remove('show'); setTimeout(() => card.remove(), 300); }
    };
  }

  // ========================
  // Playlist Parsing
  // ========================
  const parseAttrs = (str) => {
    const attrs = {}; const re = /([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/gi; let m;
    while ((m = re.exec(str))) attrs[m[1].toUpperCase()] = m[2] !== undefined ? m[2] : m[3];
    return attrs;
  };
  const parseByteRange = (str, lastEndExclusive = 0) => {
    if (!str) return null; const [lenPart, offPart] = String(str).split('@');
    const len = parseInt(lenPart, 10);
    const hasOffset = offPart !== undefined && offPart !== '';
    const start = hasOffset ? parseInt(offPart, 10) : lastEndExclusive;
    const endInclusive = start + len - 1; const nextStart = start + len;
    return { len, start, endInclusive, nextStart };
  };
  const parseRangeHeader = (range) => { if (!range) return null; const m = /bytes=(\d+)-(\d+)?/i.exec(range); if (!m) return null; const start = parseInt(m[1], 10); const end = m[2] != null ? parseInt(m[2], 10) : null; return { start, end }; };

  function parseMaster(text, base) {
    const lines = text.split(/\r?\n/), variants = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
      const attrs = parseAttrs(line.slice(18)); let url = null;
      for (let j = i + 1; j < lines.length; j++) { const next = lines[j].trim(); if (!next || next.startsWith('#')) continue; url = toAbs(next, base); break; }
      if (url) {
        const res = attrs.RESOLUTION || ''; const [w, h] = res ? res.split('x').map(n => parseInt(n, 10)) : [null, null];
        const peakBw = attrs.BANDWIDTH ? parseInt(attrs.BANDWIDTH, 10) : null;
        const avgBw = attrs['AVERAGE-BANDWIDTH'] ? parseInt(attrs['AVERAGE-BANDWIDTH'], 10) : null;
        variants.push({ url, peakBandwidth: peakBw, avgBandwidth: avgBw, resolution: res || null, width: w, height: h, codecs: attrs.CODECS || null });
      }
    }
    return variants;
  }

  function parseMedia(text, base) {
    const lines = text.split(/\r?\n/), segments = [];
    let currentKey = { method: 'NONE', uri: null, iv: null }, currentMap = null, mediaSeq = 0;
    let pendingDuration = 0, pendingByteRange = null, lastRangeNextStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) mediaSeq = parseInt(line.split(':')[1], 10) || 0;
      else if (line.startsWith('#EXT-X-KEY:')) { const attrs = parseAttrs(line.slice(11)); currentKey = { method: (attrs.METHOD || 'NONE').toUpperCase(), uri: attrs.URI ? toAbs(attrs.URI, base) : null, iv: attrs.IV || null }; }
      else if (line.startsWith('#EXT-X-MAP:')) { const attrs = parseAttrs(line.slice(11)); if (attrs.URI) { let rangeHeader = null; if (attrs.BYTERANGE) { const br = parseByteRange(attrs.BYTERANGE, 0); if (br) rangeHeader = `bytes=${br.start}-${br.endInclusive}`; } currentMap = { uri: toAbs(attrs.URI, base), rangeHeader }; } }
      else if (line.startsWith('#EXT-X-BYTERANGE:')) pendingByteRange = parseByteRange(line.split(':')[1], lastRangeNextStart);
      else if (line.startsWith('#EXTINF:')) pendingDuration = parseFloat(line.split(':')[1]) || 0;
      else if (!line.startsWith('#')) {
        let rangeHeader = null;
        if (pendingByteRange) { rangeHeader = `bytes=${pendingByteRange.start}-${pendingByteRange.endInclusive}`; lastRangeNextStart = pendingByteRange.nextStart; } else lastRangeNextStart = 0;
        segments.push({ uri: toAbs(line, base), duration: pendingDuration, rangeHeader, key: currentKey && currentKey.method !== 'NONE' ? { ...currentKey } : null, map: currentMap ? { ...currentMap } : null });
        pendingDuration = 0; pendingByteRange = null;
      }
    }
    let lastMapKey = null;
    for (let i = 0; i < segments.length; i++) {
      const m = segments[i].map; const mapKey = m ? `${m.uri}|${m.rangeHeader || ''}` : null;
      segments[i].needsMap = !!(mapKey && mapKey !== lastMapKey); if (mapKey) lastMapKey = mapKey;
    }
    return { segments, mediaSeq };
  }

  // ========================
  // HLS Size Estimation
  // ========================
  const sumDuration = (parsed) => parsed.segments.reduce((a, s) => a + (s.duration || 0), 0);

  function bytesFromByterange(parsed) {
    let total = 0, exact = true;
    const seenMaps = new Set();
    for (const s of parsed.segments) {
      if (s.rangeHeader) {
        const r = parseRangeHeader(s.rangeHeader);
        if (r && r.end != null) total += (r.end - r.start + 1);
        else exact = false;
      } else exact = false;
      if (s.needsMap && s.map?.rangeHeader) {
        const key = `${s.map.uri}|${s.map.rangeHeader}`;
        if (!seenMaps.has(key)) {
          seenMaps.add(key);
          const mr = parseRangeHeader(s.map.rangeHeader);
          if (mr && mr.end != null) total += (mr.end - mr.start + 1);
          else exact = false;
        }
      } else if (s.needsMap && s.map && !s.map.rangeHeader) {
        exact = false;
      }
    }
    return exact ? total : null;
  }

  async function estimateHlsSize(mediaTxt, mediaUrl, variantMeta) {
    const parsed = parseMedia(mediaTxt, mediaUrl);
    const durationSec = sumDuration(parsed);
    const vod = hasEndlist(mediaTxt);

    // A) Exact from BYTERANGE
    const brBytes = bytesFromByterange(parsed);
    if (brBytes != null) return { bytes: brBytes, durationSec, vod, method: 'byterange' };

    // B) Duration × AVERAGE-BANDWIDTH (or peak BANDWIDTH)
    const bw = variantMeta?.avgBandwidth ?? variantMeta?.peakBandwidth ?? null;
    if (vod && bw && durationSec > 0) {
      const bytes = Math.round((bw / 8) * durationSec);
      return { bytes, durationSec, vod, method: 'avg-bw' };
    }

    // C) For non-VOD or no bandwidth info, return unknown
    return { bytes: null, durationSec, vod, method: 'unknown' };
  }

  // ========================
  // Crypto
  // ========================
  const hexToU8 = (hex) => { hex = String(hex || '').replace(/^0x/i, '').replace(/[^0-9a-f]/gi, ''); if (hex.length % 2) hex = '0' + hex; const arr = new Uint8Array(hex.length / 2); for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16); return arr; };
  const ivFromSeq = (seq) => { let n = BigInt(seq >>> 0); const iv = new Uint8Array(16); for (let i = 15; i >= 0; i--) { iv[i] = Number(n & 0xffn); n >>= 8n; } return iv; };
  async function decryptAesCbc(data, keyBytes, iv) {
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
    return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, data);
  }

  // ========================
  // Network
  // ========================
  function gmRequest({ url, responseType = 'text', headers = {}, timeout = REQ_TIMEOUT, onprogress }) {
    let reqRef;
    const p = new Promise((resolve, reject) => {
      reqRef = GM_xmlhttpRequest({
        method: 'GET',
        url, headers, timeout, responseType,
        onprogress: onprogress ? (e) => onprogress(e) : undefined,
        onload: r => (r.status >= 200 && r.status < 300) ? resolve(r.response) : reject(new Error(`HTTP ${r.status}`)),
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout'))
      });
    });
    p.abort = () => { try { reqRef?.abort(); } catch { } };
    return p;
  }

  function getData(url, responseType, { headers = {}, timeout = REQ_TIMEOUT, onprogress } = {}) {
    if (isBlob(url)) {
      const info = blobStore.get(url);
      if (!info?.blob) return Promise.reject(new Error('Blob not available'));
      if (responseType === 'text') {
        return info.blob.text();
      }
      const r = parseRangeHeader(headers.Range);
      const slice = r ? info.blob.slice(r.start, r.end != null ? (r.end + 1) : info.blob.size) : info.blob;
      if (onprogress) setTimeout(() => onprogress({ loaded: slice.size, total: slice.size }), 0);
      return slice.arrayBuffer();
    }
    return gmRequest({ url, responseType, headers, timeout, onprogress });
  }

  const getText = (url) => getData(url, 'text', { timeout: MANIFEST_TIMEOUT });
  const getBuffer = (url, headers = {}, timeout = REQ_TIMEOUT, onprogress) =>
    getData(url, 'arraybuffer', { headers, timeout, onprogress });

  // HEAD request caching (refactored: single ensureOnce consumer)
  const getHeadCached = (url) => ensureOnce(
    headCache, headPending, url,
    async () => {
      try {
        const resp = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'HEAD',
            url,
            timeout: REQ_TIMEOUT,
            onload: resolve,
            onerror: () => reject(new Error('HEAD failed')),
            ontimeout: () => reject(new Error('HEAD timeout'))
          });
        });
        const h = resp.responseHeaders || '';
        const length = +(/(^|\r?\n)content-length:\s*(\d+)/i.exec(h)?.[2] || 0) || null;
        const type = (/(^|\r?\n)content-type:\s*([^\r\n]+)/i.exec(h)?.[2] || '').trim() || null;
        return { length, type };
      } catch {
        return { length: null, type: null };
      }
    }
  );

  // ========================
  // Detection & Hooks
  // ========================
  const showButton = () => {
    mountUI(); floatingBtn.classList.add('show', 'detected'); setTimeout(() => floatingBtn.classList.remove('detected'), 500);
    floatingBtn.updateBadge(); floatingBtn.stopIdle(); floatingBtn.startIdleTimer(); attachButtons();
  };

  function detectedM3U8(url) {
    if (typeof url !== 'string') return; if (!isHttp(url) && !isBlob(url)) return; if (isHttp(url) && !isM3U8Url(url)) return; if (state.manifests.has(url)) return;
    state.latestM3U8 = url; state.manifests.add(url);
    evictOldest(state.manifests, MAX_MANIFESTS);
    showButton(); log('M3U8 detected:', url);
  }
  function detectedVideo(url) {
    if (typeof url !== 'string') return; if (!isHttp(url) && !isBlob(url)) return; if (isHttp(url) && !isVideoUrl(url)) return; if (state.videos.has(url)) return;
    state.latestVideo = url; state.videos.add(url);
    evictOldest(state.videos, MAX_MANIFESTS);
    showButton(); log('Video detected:', url);
  }

  // Hook: URL.createObjectURL
  (() => {
    const orig = URL.createObjectURL;
    URL.createObjectURL = function (obj) {
      const href = orig.call(this, obj);
      try {
        if (obj instanceof Blob) {
          const type = obj.type || ''; const info = { blob: obj, type, size: obj.size, kind: 'other' };
          if (looksLikeM3U8Type(type)) { info.kind = 'm3u8'; blobStore.set(href, info); detectedM3U8(href); }
          else if (looksLikeVideoType(type)) { info.kind = 'video'; blobStore.set(href, info); detectedVideo(href); }
          else {
            const needSniff = /text\/plain|application\/octet-stream|^$/.test(type);
            if (needSniff && obj.size > 0) {
              obj.slice(0, Math.min(2048, obj.size)).text().then(head => {
                if (/^#EXTM3U/i.test(head)) { info.kind = 'm3u8'; blobStore.set(href, info); detectedM3U8(href); }
                else blobStore.set(href, info);
              }).catch(() => blobStore.set(href, info));
            } else blobStore.set(href, info);
          }
        } else blobStore.set(href, { blob: null, type: 'other', size: 0, kind: 'other' });
      } catch (e) { err('createObjectURL hook error:', e); }
      return href;
    };
  })();

  // Hook: URL.revokeObjectURL
  (() => {
    const _revoke = URL.revokeObjectURL;
    URL.revokeObjectURL = function (href) {
      try {
        blobStore.delete(href);
        state.manifests.delete(href);
        state.videos.delete(href);
        floatingBtn.updateBadge?.();
      } catch {}
      return _revoke.call(this, href);
    };
  })();

  // Hook: fetch & XMLHttpRequest
  const _fetch = window.fetch;
  window.fetch = new Proxy(_fetch, {
    apply(target, thisArg, args) {
      try {
        const input = args[0];
        detectFromUrl(typeof input === 'string' ? input : input?.url);
      } catch { }
      return Reflect.apply(target, thisArg, args);
    }
  });
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { detectFromUrl(url); } catch { }
    return _open.apply(this, arguments);
  };

  // PerformanceObserver
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) detectFromUrl(e.name);
    });
    po.observe({ entryTypes: ['resource'] });
  } catch { }

  // Video element scanning with cleanup
  function monitorVideoElements() {
    document.querySelectorAll('video').forEach(video => {
      if (video.__m3u8dl_monitored) return; video.__m3u8dl_monitored = true;

      const checkSrc = () => {
        const srcs = [
          video.currentSrc || video.src,
          ...Array.from(video.querySelectorAll('source')).map(s => s.src)
        ];
        srcs.forEach(detectFromUrl);
      };

      const evs = ['loadedmetadata', 'loadstart', 'canplay'];
      evs.forEach(ev => video.addEventListener(ev, checkSrc));

      video.__m3u8dl_cleanup = () => {
        try { evs.forEach(ev => video.removeEventListener(ev, checkSrc)); } catch {}
        video.__m3u8dl_monitored = false;
      };

      monitoredVideos.add(video);
      checkSrc();
    });
  }

  // Video.js control button
  function attachButtons() {
    document.querySelectorAll('.video-js .vjs-control-bar').forEach(bar => {
      if (bar.querySelector('.m3u8dl-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'vjs-control vjs-button m3u8dl-btn';
      btn.title = 'Download Media'; btn.setAttribute('aria-label', 'Download media');
      btn.innerHTML = DOWNLOAD_ICON_SVG;
      btn.onclick = (e) => { e.stopPropagation(); triggerDownload(e); };
      bar.appendChild(btn);
    });
  }

  // DOM observers/init
  document.addEventListener('DOMContentLoaded', () => {
    mountUI();
    mo = new MutationObserver(() => {
      clearTimeout(attachDebounce);
      attachDebounce = setTimeout(() => {
        attachButtons();
        monitorVideoElements();

        // Cleanup removed videos to prevent leaks
        for (const v of Array.from(monitoredVideos)) {
          if (!v.isConnected) {
            try { v.__m3u8dl_cleanup?.(); } catch {}
            monitoredVideos.delete(v);
          }
        }
      }, 250);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    monitorVideoElements();
  });
  window.addEventListener('beforeunload', () => { try { floatingBtn.cleanup?.(); } catch { } });
  let attachDebounce;

  // ========================
  // Picker (refactored)
  // ========================
  function showMediaPicker(items) {
    return new Promise(resolve => {
      const list = variantPopup.querySelector('.m3u8dl-var-list');
      const chk = variantPopup.querySelector('.m3u8dl-exclude-small');
      const optRow = variantPopup.querySelector('.m3u8dl-opt');

      const cleanup = () => {
        variantPopup.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        variantPopup.removeEventListener('click', onBackdrop);
        if (chk) chk.onchange = null;
      };
      const onBackdrop = (e) => { if (e.target === variantPopup) { cleanup(); resolve(null); } };

      let idx = 0, buttons = [];
      const render = (arr) => {
        list.innerHTML = '';
        buttons = arr.map((item, i) => {
          const btn = document.createElement('button');
          btn.className = `m3u8dl-var-btn${item.category === 'video' ? ' video-direct' : ''}`;
          btn.setAttribute('role', 'button');
          const badge = item.category === 'video' ? 'Direct' : 'HLS';
          const title = item.label || `Option ${i + 1}`;
          const sub = item.url.length > 80 ? item.url.slice(0, 80) + '...' : item.url;
          btn.innerHTML = `
            <div class="badge">${escapeHtml(badge)}</div>
            <div class="title">${escapeHtml(title)}</div>
            <div class="subtitle">${escapeHtml(sub)}</div>`;
          btn.onclick = () => { cleanup(); resolve(item); };
          list.appendChild(btn);
          return btn;
        });
        if (!buttons.length) {
          list.innerHTML = `<div style="font-size:12px;color:#9ca3af;padding:8px;">No items match the filter. Uncheck to show all.</div>`;
        }
        idx = 0; buttons[0]?.focus();
      };

      const apply = () => render(filterBySmall(items, chk?.checked ?? false));
      const onKey = (e) => {
        if (e.key === 'Escape') { cleanup(); resolve(null); }
        else if (e.key === 'ArrowDown' && buttons.length) { e.preventDefault(); idx = (idx + 1) % buttons.length; buttons[idx].focus(); }
        else if (e.key === 'ArrowUp' && buttons.length) { e.preventDefault(); idx = (idx - 1 + buttons.length) % buttons.length; buttons[idx].focus(); }
        else if (e.key === 'Enter' && buttons.length) { e.preventDefault(); buttons[idx].click(); }
      };

      if (optRow) optRow.style.display = 'flex';
      if (chk) {
        chk.checked = settings.excludeSmall;
        chk.onchange = () => { setExcludeSmall(chk.checked); apply(); };
      }

      variantPopup.classList.add('show');
      variantPopup.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
      apply();
    });
  }

  // ========================
  // Media list builders (parallel, de-duplicated)
  // ========================
  async function buildHlsItem(url) {
    const info = blobStore.get(url);
    if (info) {
      return { type: 'm3u8', category: 'm3u8', url, label: `HLS Stream (blob, ${formatBytes(info.size)})`, size: info.size };
    }
    try {
      const masterTxt = await getManifest(url);
      if (isMaster(masterTxt)) {
        const vars = parseMaster(masterTxt, url);
        if (vars.length) {
          vars.sort((a, b) => (b.height || 0) - (a.height || 0) ||
                              (b.avgBandwidth || b.peakBandwidth || 0) - (a.avgBandwidth || a.peakBandwidth || 0));
          const v = vars[0];
          const mediaTxt = await getManifest(v.url);
          const est = await estimateHlsSize(mediaTxt, v.url, v);
          const sizeTxt = sizeLabel(est);
          return { type: 'm3u8', category: 'm3u8', url, label: `HLS Stream${sizeTxt ? ` (${sizeTxt})` : ''}`, size: est?.bytes ?? null };
        }
      } else if (isMedia(masterTxt)) {
        const est = await estimateHlsSize(masterTxt, url, null);
        const sizeTxt = sizeLabel(est);
        return { type: 'm3u8', category: 'm3u8', url, label: `HLS Stream${sizeTxt ? ` (${sizeTxt})` : ''}`, size: est.bytes ?? null };
      }
    } catch (e) {
      log('Failed to estimate HLS size:', e);
    }
    return { type: 'm3u8', category: 'm3u8', url, label: 'HLS Stream', size: null };
  }

  function buildVideoItem(url) {
    const info = blobStore.get(url);
    const ext = guessExt(url, info?.type).toUpperCase();
    const preSize = info?.size ?? null;
    const sizeTxt = preSize != null ? ` (${formatBytes(preSize)})` : '';
    return { type: 'video', category: 'video', url, label: `Direct Video (${ext})${sizeTxt}`, size: preSize };
  }

  async function buildMediaList() {
    const m3u8s = Array.from(state.manifests);
    const videos = Array.from(state.videos);
    const items = await Promise.all([
      ...m3u8s.map(buildHlsItem),
      ...videos.map(u => Promise.resolve(buildVideoItem(u)))
    ]);
    return items.filter(Boolean);
  }

  // ========================
  // Download Flow
  // ========================
  async function chooseDownloadFlow(opts = {}) {
    mountUI();
    const oldOpacity = floatingBtn.style.opacity;
    try {
      floatingBtn.style.opacity = '0.55';

      const allMedia = await buildMediaList();
      if (!allMedia.length) { alert('No media detected. Play the video and try again.'); return; }

      const filteredAll = filterBySmall(allMedia, settings.excludeSmall);

      let selected;
      if (!filteredAll.length || opts.showVariantPicker || filteredAll.length > 1) {
        const pick = await showMediaPicker(filteredAll.length ? filteredAll : allMedia);
        if (!pick) return;
        selected = pick;
      } else {
        selected = filteredAll[filteredAll.length - 1];
      }

      if (selected.type === 'video') await downloadDirectVideo(selected.url);
      else await downloadHLS(selected.url);

    } catch (e) {
      err(e); alert(`Error: ${e.message || e}`);
    } finally {
      floatingBtn.style.opacity = oldOpacity || '1';
    }
  }

  // ========================
  // Direct Video Download (refactored)
  // ========================
  async function downloadDirectVideo(url) {
    log('Downloading direct video:', url);
    const info = blobStore.get(url);
    const titleBase = sanitize(document.title);
    const ext = guessExt(url, info?.type);
    const filename = `${titleBase}.${ext}`;

    // Case A: local blob present
    if (info?.blob) {
      const card = createProgressCard(filename, url, null, () => {});
      try {
        await saveBlob(info.blob, filename, ext);
        card.update(100, '(local)');
        card.done(true);
      } catch (e) {
        err('Blob save error:', e);
        card.done(false, e?.message || 'Failed to save');
      }
      return;
    }

    // Case B: fetch over network
    let cancelled = false, totalKnown = 0, lastLoaded = 0, req = null;
    let headType = null;

    try {
      const meta = await getHeadCached(url);
      totalKnown = meta.length || 0;
      headType = meta.type || null;
    } catch {}

    const card = createProgressCard(filename, url, null, () => { cancelled = true; try { req?.abort?.(); } catch {} });

    try {
      req = gmRequest({
        url,
        responseType: 'arraybuffer',
        timeout: REQ_TIMEOUT,
        onprogress: (e) => {
          if (cancelled) return;
          const loaded = e?.loaded ?? 0;
          const total = totalKnown || e?.total || 0;
          if (!totalKnown && e?.total) totalKnown = e.total;
          if (total > 0) {
            card.update((loaded / total) * 100, `(${formatBytes(loaded)}/${formatBytes(total)})`);
          } else if (loaded > lastLoaded + 512 * 1024) {
            card.update(0, `(${formatBytes(loaded)})`);
            lastLoaded = loaded;
          }
        }
      });

      const arrayBuffer = await req;
      if (cancelled) { card.remove(); return; }

      const blob = new Blob([arrayBuffer], { type: headType || `video/${ext}` });
      await saveBlob(blob, filename, ext);
      card.update(100, '(done)');
      card.done(true);
    } catch (e) {
      if (cancelled) { card.remove(); return; }
      err('Direct video save error:', e);
      card.done(false, e?.message || 'Failed to save');
    }
  }

  // ========================
  // HLS Download
  // ========================
  async function downloadHLS(url) {
    log('Downloading HLS:', url);
    const masterTxt = await getManifest(url);
    let mediaUrl = url, variant = null;

    if (isMaster(masterTxt)) {
      const vars = parseMaster(masterTxt, url);
      if (!vars.length) throw new Error('No variants found');
      vars.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.avgBandwidth || b.peakBandwidth || 0) - (a.avgBandwidth || a.peakBandwidth || 0));

      // Estimate sizes for variants
      const pickerItems = [];
      for (const v of vars) {
        const bw = v.avgBandwidth || v.peakBandwidth;
        const parts = [v.resolution, bw ? `${Math.round(bw / 1000)} kbps` : null, v.codecs].filter(Boolean);
        let label = parts.join(' • ') || 'Variant';

        try {
          const mediaTxt = await getManifest(v.url);
          const est = await estimateHlsSize(mediaTxt, v.url, v);
          if (est.bytes != null) label += ` • ${sizeLabel(est)}`;
          pickerItems.push({ type: 'variant', category: 'm3u8', url: v.url, label, variant: v, size: est.bytes });
        } catch (e) {
          log('Failed to estimate variant size:', e);
          pickerItems.push({ type: 'variant', category: 'm3u8', url: v.url, label, variant: v, size: null });
        }
      }

      const selected = await showMediaPicker(pickerItems);
      if (!selected) return;
      variant = selected.variant; mediaUrl = variant.url;
    } else if (!isMedia(masterTxt)) throw new Error('Invalid playlist');

    const mediaTxt = isMedia(masterTxt) ? masterTxt : await getManifest(mediaUrl);
    const parsed = parseMedia(mediaTxt, mediaUrl);
    if (!parsed.segments.length) throw new Error('No segments found');

    const isFmp4 = parsed.segments.some(s => s.map) || /\.m4s(\?|$)/i.test(parsed.segments[0].uri);
    const ext = isFmp4 ? 'mp4' : 'ts';
    const name = sanitize(document.title);
    const qual = variant?.resolution ? `_${variant.resolution}` : '';
    const filename = `${name}${qual}.${ext}`;

    await downloadSegments(parsed, filename, ext, isFmp4, url);
  }

  // ========================
  // Segment Downloader (refactored)
  // ========================
  async function downloadSegments(parsed, filename, ext, isFmp4, sourceUrl) {
    const { segments, mediaSeq } = parsed;
    const total = segments.length;
    let stopped = false, cancelled = false;

    const card = createProgressCard(
      filename,
      sourceUrl,
      () => { // stop/resume
        stopped = !stopped;
        card.setStopped(stopped);
        if (stopped) abortAll();
        else pump();
      },
      () => { // cancel
        cancelled = true;
        abortAll();
        finalize(false);
      }
    );

    const keyCache = new Map(), keyPending = new Map();
    const mapCache = new Map(), mapPending = new Map();

    const attempts = new Uint8Array(total);   // retries
    const status = new Int8Array(total);      // 0=queued,1=loading,2=done,-1=failed
    const active = new Map();                 // i -> req (with abort)
    const progress = new Map();               // i -> { loaded,total }
    const pending = new Map();                // i -> Uint8Array (awaiting ordered write)

    let doneCount = 0, bytesCompleted = 0, avgSegSize = 0;
    let nextWrite = 0, nextIndex = 0, inflight = 0;

    const shouldAbort = () => cancelled || stopped;

    function abortAll() {
      for (const [i, req] of active) {
        try { req.abort?.(); } catch {}
        progress.delete(i);
      }
      active.clear();
    }

    // Progress drawing (rAF coalesced)
    let drawScheduled = false;
    function rafDraw() {
      if (drawScheduled) return; drawScheduled = true;
      requestAnimationFrame(() => {
        drawScheduled = false;
        let partial = 0;
        progress.forEach(({ loaded, total }) => {
          if (total > 0) partial += Math.min(1, loaded / total);
          else if (avgSegSize > 0) partial += Math.min(1, loaded / avgSegSize);
        });
        const pct = ((doneCount + partial) / total) * 100;
        card.update(pct, `(${doneCount}/${total})`);
      });
    }

    async function getKeyBytes(seg) {
      if (!seg.key || seg.key.method !== 'AES-128' || !seg.key.uri) return null;
      return ensureOnce(
        keyCache, keyPending, seg.key.uri,
        async () => new Uint8Array(await getBuffer(seg.key.uri))
      );
    }

    async function getMapBytes(seg) {
      if (!seg.needsMap || !seg.map?.uri) return null;
      const k = `${seg.map.uri}|${seg.map.rangeHeader || ''}`;
      return ensureOnce(
        mapCache, mapPending, k,
        async () => {
          const headers = seg.map.rangeHeader ? { Range: seg.map.rangeHeader } : {};
          return new Uint8Array(await getBuffer(seg.map.uri, headers));
        }
      );
    }

    // Ordered writer via a tiny promise chain
    let writeChain = Promise.resolve();
    function queueWrite(fn) { return (writeChain = writeChain.then(fn)); }

    async function flushInOrder(writable, useFS, chunks) {
      while (pending.has(nextWrite)) {
        const data = pending.get(nextWrite);
        pending.delete(nextWrite++);
        if (useFS) await writable.write(data);
        else chunks.push(data);
      }
    }

    function handleFail(i, why) {
      if (shouldAbort()) return;
      const a = ++attempts[i];
      if (a > MAX_RETRIES) {
        status[i] = -1;
        err(`Segment ${i} failed permanently (${why})`);
      } else {
        status[i] = 0; // requeue
      }
    }

    function checkFinalize() {
      if (doneCount === total) finalize(true);
      else if (!inflight && !stopped && !cancelled) {
        if (Array.prototype.some.call(status, v => v === -1)) finalize(false);
      }
    }

    function start(i) {
      if (shouldAbort()) return;
      const seg = segments[i];
      status[i] = 1; inflight++;

      if (seg.key && seg.key.method && seg.key.method !== 'AES-128') {
        inflight--; status[i] = -1; err(`Unsupported key method: ${seg.key.method}`); checkFinalize(); return;
      }

      const headers = seg.rangeHeader ? { Range: seg.rangeHeader } : {};
      const req = gmRequest({
        url: seg.uri,
        headers,
        responseType: 'arraybuffer',
        timeout: REQ_TIMEOUT,
        onprogress: (p) => {
          if (p && typeof p.loaded === 'number') {
            progress.set(i, { loaded: p.loaded, total: p.total || 0 });
            rafDraw();
          }
        }
      });

      active.set(i, req);
      req.then(async (buf) => {
        if (shouldAbort()) return;

        // decrypt if needed
        try {
          const keyBytes = await getKeyBytes(seg);
          if (keyBytes) {
            const iv = seg.key.iv ? hexToU8(seg.key.iv) : ivFromSeq(mediaSeq + i);
            buf = await decryptAesCbc(buf, keyBytes, iv);
          }
        } catch (e) { handleFail(i, e.message || 'decrypt'); return; }

        // prepend init segment if needed
        let u8 = new Uint8Array(buf);
        try {
          if (seg.needsMap) {
            const mapBytes = await getMapBytes(seg);
            if (mapBytes && mapBytes.length) {
              const combined = new Uint8Array(mapBytes.length + u8.length);
              combined.set(mapBytes, 0); combined.set(u8, mapBytes.length);
              u8 = combined;
            }
          }
        } catch (e) { handleFail(i, e.message || 'init map'); return; }

        pending.set(i, u8);
        // schedule ordered write flush
        queueWrite(() => flushInOrder(writable, useFS, chunks));

        status[i] = 2;
        doneCount++;
        bytesCompleted += u8.length;
        avgSegSize = bytesCompleted / Math.max(1, doneCount);
        rafDraw();
      }).catch((e) => {
        handleFail(i, (e && e.message) || 'network');
      }).finally(() => {
        active.delete(i);
        progress.delete(i);
        inflight--;
        pump();
        checkFinalize();
      });
    }

    function pump() {
      if (shouldAbort()) return;
      // Fill slots preferring retried items first
      while (inflight < CONCURRENCY) {
        let i = -1;
        for (let j = 0; j < total; j++) { if (status[j] === 0 && attempts[j] > 0) { i = j; break; } }
        if (i === -1) {
          while (nextIndex < total && status[nextIndex] !== 0) nextIndex++;
          if (nextIndex < total) i = nextIndex++;
        }
        if (i === -1) break;
        start(i);
      }
    }

    // File writing
    let writable = null, useFS = false; const chunks = [];
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: `${ext.toUpperCase()} Video`, accept: { 'video/*': [`.${ext}`] } }]
        });
        writable = await handle.createWritable();
        useFS = true;
        log('Using File System Access API');
      } catch {}
    }

    async function finalize(ok) {
      try {
        // flush remaining buffered chunks in order
        await queueWrite(() => flushInOrder(writable, useFS, chunks));

        if (ok) {
          if (useFS) {
            await writable.close();
            log('Saved via File System API');
          } else {
            const blob = new Blob(chunks, { type: isFmp4 ? 'video/mp4' : 'video/mp2t' });
            await saveBlob(blob, filename, isFmp4 ? 'mp4' : 'ts');
            log('Downloaded via Blob');
          }
          card.update(100, '(done)');
          card.done(true);
        } else {
          if (useFS) { try { await writable.truncate(0); } catch {} try { await writable.close(); } catch {} }
          card.done(false);
        }
      } catch (e) {
        err('Finalize error:', e);
        card.done(false);
      } finally {
        abortAll();
      }
    }

    // Start the download and write loop (writer runs as data arrives)
    queueWrite(() => flushInOrder(writable, useFS, chunks));
    pump();
  }

  // ========================
  // Initialize
  // ========================
  mountUI();
})();