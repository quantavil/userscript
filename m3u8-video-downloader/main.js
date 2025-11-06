// ==UserScript==
// @name         Universal M3U8 + Blob Downloader (Optimized)
// @namespace    https://github.com/m3u8dl-userscripts
// @version      2.2.0
// @description  Download HLS (.m3u8) streams and direct video blobs with smart filtering
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
  // Blob registry: blob: URL => {blob, type, size, kind: 'm3u8'|'video'|'other'}
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

  // HEAD size cache
  const sizeCache = new Map(); // url => number|null

  // Forward refs
  let mo = null;

  // ========================
  // Utilities
  // ========================
  const isHttp = (u) => /^https?:/i.test(u);
  const isBlob = (u) => /^blob:/i.test(u);
  const isMaster = (t) => /#EXT-X-STREAM-INF/i.test(t);
  const isMedia = (t) => /#EXTINF:/i.test(t) || /#EXT-X-TARGETDURATION:/i.test(t);
  const sanitize = (s) => (s || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120).trim() || 'video';
  const toAbs = (u, b) => { try { return new URL(u, b).href; } catch { return u; } };
  const looksLikeM3U8Type = (t) => /mpegurl|application\/x-mpegurl|vnd\.apple\.mpegurl/i.test(t || '');
  const looksLikeVideoType = (t) => /^video\//i.test(t || '') || /matroska|mp4|webm|quicktime/i.test(t || '');
  const isM3U8Url = (u) => /\.m3u8(\b|[\?#]|$)/i.test(u || '');
  const isVideoUrl = (u) => /\.(mp4|mkv|webm|avi|mov|flv|m4v|ts|m2ts|ogg|ogv)(\?|#|$)/i.test(u || '');
  const guessExtFromType = (t = '') => (t = t.toLowerCase(), /mp4/.test(t) ? 'mp4' : /matroska|mkv/.test(t) ? 'mkv' : /webm/.test(t) ? 'webm' : /quicktime|mov/.test(t) ? 'mov' : /avi/.test(t) ? 'avi' : /mp2t|mpegts/.test(t) ? 'ts' : /ogg/.test(t) ? 'ogg' : 'mp4');
  const formatBytes = (n) => { if (n == null) return ''; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = n; while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; } return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`; };

  // HTML escaper
  const escapeEl = document.createElement('div');
  const escapeHtml = (str) => { escapeEl.textContent = str == null ? '' : String(str); return escapeEl.innerHTML; };

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
    .m3u8dl-opt{display:none;user-select:none;cursor:pointer;font-size:12px;color:#9ca3af;margin:6px 0 12px;gap:.5rem;align-items:center}
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
  const floatingBtn = createFloatingButton();
  const progressContainer = createProgressContainer();
  const variantPopup = createVariantPopup();

  function mountUI() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', mountUI, { once: true }); return; }
    if (!progressContainer.parentNode) document.body.appendChild(progressContainer);
    if (!floatingBtn.parentNode) document.body.appendChild(floatingBtn);
    if (!variantPopup.parentNode) document.body.appendChild(variantPopup);
  }

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

    btn.onclick = (e) => {
      stopIdle(); startIdle();
      const totalSources = state.manifests.size + state.videos.size;
      chooseDownloadFlow({ showVariantPicker: e.altKey || totalSources > 1 });
    };
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
  function parseMaster(text, base) {
    const lines = text.split(/\r?\n/), variants = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
      const attrs = parseAttrs(line.slice(18)); let url = null;
      for (let j = i + 1; j < lines.length; j++) { const next = lines[j].trim(); if (!next || next.startsWith('#')) continue; url = toAbs(next, base); break; }
      if (url) {
        const res = attrs.RESOLUTION || ''; const [w, h] = res ? res.split('x').map(n => parseInt(n, 10)) : [null, null];
        variants.push({ url, bandwidth: attrs.BANDWIDTH ? parseInt(attrs.BANDWIDTH, 10) : (attrs['AVERAGE-BANDWIDTH'] ? parseInt(attrs['AVERAGE-BANDWIDTH'], 10) : null), resolution: res || null, width: w, height: h, codecs: attrs.CODECS || null });
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
  const parseRangeHeader = (range) => { if (!range) return null; const m = /bytes=(\d+)-(\d+)?/i.exec(range); if (!m) return null; const start = parseInt(m[1], 10); const end = m[2] != null ? parseInt(m[2], 10) : null; return { start, end }; };
  const getText = async (url) => {
    if (isBlob(url)) {
      const info = blobStore.get(url); if (!info || !info.blob) throw new Error('Blob not available');
      return info.blob.text();
    }
    return gmRequest({ url, responseType: 'text', timeout: MANIFEST_TIMEOUT });
  };
  const getBuffer = async (url, headers = {}, timeout = REQ_TIMEOUT, onprogress) => {
    if (isBlob(url)) {
      const info = blobStore.get(url); if (!info || !info.blob) throw new Error('Blob not available');
      const blob = info.blob; const r = parseRangeHeader(headers.Range);
      const slice = r ? blob.slice(r.start, r.end != null ? (r.end + 1) : blob.size) : blob;
      if (onprogress) setTimeout(() => onprogress({ loaded: slice.size, total: slice.size }), 0);
      return slice.arrayBuffer();
    }
    return gmRequest({ url, responseType: 'arraybuffer', headers, timeout, onprogress });
  };
  async function headMeta(url) {
    try {
      const resp = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({ method: 'HEAD', url, timeout: REQ_TIMEOUT, onload: r => resolve(r), onerror: () => reject(new Error('HEAD failed')), ontimeout: () => reject(new Error('HEAD timeout')) });
      });
      const headers = resp.responseHeaders || '';
      const lenMatch = /(^|\r?\n)content-length:\s*(\d+)/i.exec(headers);
      const typeMatch = /(^|\r?\n)content-type:\s*([^\r\n]+)/i.exec(headers);
      return { length: lenMatch ? parseInt(lenMatch[2], 10) : null, type: typeMatch ? typeMatch[2].trim() : null };
    } catch { return { length: null, type: null }; }
  }
  async function getContentLengthCached(url) {
    if (sizeCache.has(url)) return sizeCache.get(url);
    if (isBlob(url)) {
      const info = blobStore.get(url); const s = info?.blob?.size ?? info?.size ?? null; sizeCache.set(url, s); return s;
    }
    const { length } = await headMeta(url); sizeCache.set(url, length ?? null); return length ?? null;
  }
  async function ensureVideoItemSizes(items) {
    const tasks = [];
    for (const it of items) if (it?.category === 'video' && it.size == null) tasks.push((async () => { it.size = await getContentLengthCached(it.url); })());
    if (tasks.length) await Promise.allSettled(tasks);
    return items;
  }

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
    if (state.manifests.size > MAX_MANIFESTS) state.manifests.delete(state.manifests.values().next().value);
    showButton(); log('M3U8 detected:', url);
  }
  function detectedVideo(url) {
    if (typeof url !== 'string') return; if (!isHttp(url) && !isBlob(url)) return; if (isHttp(url) && !isVideoUrl(url)) return; if (state.videos.has(url)) return;
    state.latestVideo = url; state.videos.add(url);
    if (state.videos.size > MAX_MANIFESTS) state.videos.delete(state.videos.values().next().value);
    showButton(); log('Video detected:', url);
  }

  // Hook: URL.createObjectURL — detect blob types
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

  // Hook: fetch & XMLHttpRequest
  const _fetch = window.fetch;
  window.fetch = new Proxy(_fetch, {
    apply(target, thisArg, args) {
      try {
        const input = args[0]; const url = typeof input === 'string' ? input : input?.url;
        if (url) { if (isM3U8Url(url)) detectedM3U8(url); else if (isVideoUrl(url)) detectedVideo(url); }
      } catch { }
      return Reflect.apply(target, thisArg, args);
    }
  });
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { if (isM3U8Url(url)) detectedM3U8(url); else if (isVideoUrl(url)) detectedVideo(url); } catch { }
    return _open.apply(this, arguments);
  };

  // PerformanceObserver (resource-level)
  try {
    const po = new PerformanceObserver(list => { for (const e of list.getEntries()) { const url = e.name; if (isM3U8Url(url)) detectedM3U8(url); else if (isVideoUrl(url)) detectedVideo(url); } });
    po.observe({ entryTypes: ['resource'] });
  } catch { }

  // Video element scanning
  function monitorVideoElements() {
    document.querySelectorAll('video').forEach(video => {
      if (video.__m3u8dl_monitored) return; video.__m3u8dl_monitored = true;
      const handleUrl = (u) => {
        if (!u) return;
        if (isM3U8Url(u)) detectedM3U8(u);
        else if (isVideoUrl(u)) detectedVideo(u);
        else if (isBlob(u)) { const info = blobStore.get(u); if (info?.kind === 'm3u8') detectedM3U8(u); else if (info?.kind === 'video') detectedVideo(u); }
      };
      const checkSrc = () => {
        const src = video.currentSrc || video.src; handleUrl(src);
        video.querySelectorAll('source').forEach(source => handleUrl(source.src));
      };
      checkSrc();['loadedmetadata', 'loadstart', 'canplay'].forEach(ev => video.addEventListener(ev, checkSrc));
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
      btn.onclick = (e) => { e.stopPropagation(); floatingBtn.stopIdle(); floatingBtn.startIdleTimer(); const totalSources = state.manifests.size + state.videos.size; chooseDownloadFlow({ showVariantPicker: e.altKey || totalSources > 1 }); };
      bar.appendChild(btn);
    });
  }

  // DOM observers/init
  document.addEventListener('DOMContentLoaded', () => {
    mountUI();
    mo = new MutationObserver(() => { clearTimeout(attachDebounce); attachDebounce = setTimeout(() => { attachButtons(); monitorVideoElements(); }, 250); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    monitorVideoElements();
  });
  window.addEventListener('beforeunload', () => { try { floatingBtn.cleanup?.(); } catch { } });
  let attachDebounce;

  // ========================
  // Picker (with size filter)
  // ========================
  function showMediaPicker(items) {
    return new Promise(resolve => {
      const list = variantPopup.querySelector('.m3u8dl-var-list');
      const optRow = variantPopup.querySelector('.m3u8dl-opt');
      const chk = variantPopup.querySelector('.m3u8dl-exclude-small');

      const cleanup = () => { variantPopup.classList.remove('show'); document.removeEventListener('keydown', onKey); variantPopup.removeEventListener('click', onBackdrop); if (chk) chk.onchange = null; };
      const onBackdrop = (e) => { if (e.target === variantPopup) { cleanup(); resolve(null); } };

      let buttons = [], selectedIndex = 0;

      function buildButtons(showItems) {
        list.innerHTML = ''; buttons = [];
        showItems.forEach((item, i) => {
          const btn = document.createElement('button'); btn.className = 'm3u8dl-var-btn'; if (item.category === 'video') btn.classList.add('video-direct'); btn.setAttribute('role', 'button');
          const badgeText = item.category === 'video' ? 'Direct' : 'HLS';
          const titleText = item.label || `Option ${i + 1}`;
          const subtitleText = item.url.slice(0, 80) + (item.url.length > 80 ? '...' : '');
          btn.innerHTML = `<div class="badge">${escapeHtml(badgeText)}</div><div class="title">${escapeHtml(titleText)}</div><div class="subtitle">${escapeHtml(subtitleText)}</div>`;
          btn.onclick = () => { cleanup(); resolve(item); };
          list.appendChild(btn); buttons.push(btn);
        });
        if (!buttons.length) list.innerHTML = `<div style="font-size:12px;color:#9ca3af;padding:8px;">No items with current filter. Uncheck to show all.</div>`;
        selectedIndex = 0; if (buttons[0]) buttons[0].focus();
      }

      const applyFilter = (baseItems) => {
        const excludeSmall = chk?.checked ?? false;
        if (!excludeSmall) return baseItems;
        return baseItems.filter(it => it.category !== 'video' || it.size == null || it.size >= SMALL_FILE_THRESHOLD);
      };

      const onKey = (e) => {
        if (!buttons.length) { if (e.key === 'Escape') { cleanup(); resolve(null); } return; }
        if (e.key === 'Escape') { cleanup(); resolve(null); }
        if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % buttons.length; buttons[selectedIndex].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length; buttons[selectedIndex].focus(); }
        if (e.key === 'Enter') { e.preventDefault(); buttons[selectedIndex].click(); }
      };

      const hasVideoItems = items.some(x => x.category === 'video');
      if (optRow) optRow.style.display = hasVideoItems ? 'flex' : 'none';
      if (chk) { chk.checked = settings.excludeSmall; chk.onchange = () => { setExcludeSmall(chk.checked); buildButtons(applyFilter(items)); }; }

      (async () => { if (hasVideoItems) { try { await ensureVideoItemSizes(items); } catch { } } buildButtons(applyFilter(items)); })();

      variantPopup.classList.add('show');
      variantPopup.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  // ========================
  // Download Flow
  // ========================
  async function chooseDownloadFlow(opts = {}) {
    mountUI();
    const oldOpacity = floatingBtn.style.opacity;
    try {
      floatingBtn.style.opacity = '0.55';

      const allMedia = [];

      // HLS sources (never size-filtered)
      state.manifests.forEach(url => {
        const info = blobStore.get(url);
        const label = info ? `HLS Stream (blob, ${formatBytes(info.size)})` : 'HLS Stream';
        allMedia.push({ type: 'm3u8', category: 'm3u8', url, label });
      });

      // Direct video sources (size-aware)
      state.videos.forEach(url => {
        const info = blobStore.get(url);
        let ext = 'video';
        if (info) ext = guessExtFromType(info.type).toUpperCase();
        else if (isHttp(url)) { const m = url.match(/\.([a-z0-9]+)(\?|#|$)/i); if (m) ext = m[1].toUpperCase(); }
        const preSize = info ? info.size : null;
        const sizeTxt = preSize != null ? ` (${formatBytes(preSize)})` : '';
        allMedia.push({ type: 'video', category: 'video', url, label: `Direct Video (${ext})${sizeTxt}`, size: preSize });
      });

      if (!allMedia.length) { alert('No media detected. Play the video and try again.'); return; }

      const hasVideoItems = allMedia.some(i => i.category === 'video');
      // Only resolve sizes if we need them (filtering or picker)
      const willShowPicker = opts.showVariantPicker || allMedia.length > 1;
      if (hasVideoItems && (settings.excludeSmall || willShowPicker)) { try { await ensureVideoItemSizes(allMedia); } catch { } }

      const filteredAll = settings.excludeSmall
        ? allMedia.filter(it => it.category !== 'video' || it.size == null || it.size >= SMALL_FILE_THRESHOLD)
        : allMedia;

      // If filter hid everything, open picker so user can uncheck
      if (!filteredAll.length) {
        await showMediaPicker(allMedia);
        return;
      }

      // Enhance labels with resolved sizes (if not already present)
      for (const it of filteredAll) {
        if (it.category === 'video' && it.size != null && !/\(\d+(\.\d+)?\s*(B|KB|MB|GB|TB)\)\s*$/.test(it.label)) {
          it.label = `${it.label.replace(/\s*$/, '')} (${formatBytes(it.size)})`;
        }
      }

      // Selection: latest by default or picker if multiple/forced
      let selected = filteredAll[filteredAll.length - 1];
      if (willShowPicker || filteredAll.length > 1) {
        const pick = await showMediaPicker(filteredAll);
        if (!pick) return;
        selected = pick;
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
  // Direct Video Download
  // ========================
  async function downloadDirectVideo(url) {
    log('Downloading direct video:', url);
    const info = blobStore.get(url);
    let blob, ext, filename;

    if (info && info.blob) {
      blob = info.blob; ext = guessExtFromType(info.type); filename = `${sanitize(document.title)}.${ext}`;
    } else {
      let inferredExt = 'mp4';
      const m = url.match(/\.([a-z0-9]+)(\?|#|$)/i); if (m) inferredExt = m[1].toLowerCase();

      // Use cache if possible
      let headLen = sizeCache.get(url) ?? null, headType = null;
      if (headLen == null) {
        try { const meta = await headMeta(url); headLen = meta.length; headType = meta.type; if (meta.length != null) sizeCache.set(url, meta.length); }
        catch { }
      } else {
        // still attempt to get content-type if unknown
        try { const meta = await headMeta(url); headType = meta.type; } catch { }
      }
      if (headType) inferredExt = guessExtFromType(headType);
      ext = inferredExt; filename = `${sanitize(document.title)}.${ext}`;

      let cancelled = false, totalKnown = headLen || 0;
      const card = createProgressCard(filename, url, null, () => { cancelled = true; try { req?.abort?.(); } catch { } });

      let lastLoaded = 0;
      const req = gmRequest({
        url, responseType: 'arraybuffer', timeout: REQ_TIMEOUT,
        onprogress: (e) => {
          if (cancelled) return;
          const loaded = e?.loaded ?? 0, total = totalKnown || e?.total || 0;
          if (!totalKnown && e?.total) totalKnown = e.total;
          if (total > 0) card.update((loaded / total) * 100, `(${formatBytes(loaded)}/${formatBytes(total)})`);
          else if (loaded > lastLoaded + 512 * 1024) { card.update(0, `(${formatBytes(loaded)})`); lastLoaded = loaded; }
        }
      });

      let arrayBuffer;
      try { arrayBuffer = await req; }
      catch (e) { if (cancelled) { card.remove(); return; } throw e; }
      if (cancelled) { card.remove(); return; }

      blob = new Blob([arrayBuffer], { type: headType || `video/${ext}` });
      card.done(true);
    }

    // Save
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: `${ext.toUpperCase()} Video`, accept: { 'video/*': [`.${ext}`] } }] });
        const writable = await handle.createWritable(); await writable.write(blob); await writable.close(); log('Saved via File System API'); return;
      } catch { }
    }
    const blobUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    log('Downloaded via anchor');
  }

  // ========================
  // HLS Download
  // ========================
  async function downloadHLS(url) {
    log('Downloading HLS:', url);
    const masterTxt = await getText(url);
    let mediaUrl = url, variant = null;

    if (isMaster(masterTxt)) {
      const vars = parseMaster(masterTxt, url);
      if (!vars.length) throw new Error('No variants found');
      vars.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bandwidth || 0) - (a.bandwidth || 0));
      const pickerItems = vars.map(v => {
        const parts = [v.resolution, v.bandwidth ? `${Math.round(v.bandwidth / 1000)} kbps` : null, v.codecs].filter(Boolean);
        return { type: 'variant', category: 'm3u8', url: v.url, label: parts.join(' • ') || 'Variant', variant: v };
      });
      const selected = await showMediaPicker(pickerItems);
      if (!selected) return;
      variant = selected.variant; mediaUrl = variant.url;
    } else if (!isMedia(masterTxt)) throw new Error('Invalid playlist');

    const mediaTxt = isMedia(masterTxt) ? masterTxt : await getText(mediaUrl);
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
  // Segment Downloader
  // ========================
  async function downloadSegments(parsed, filename, ext, isFmp4, sourceUrl) {
    const { segments, mediaSeq } = parsed; const total = segments.length;
    let stopped = false, cancelled = false;

    const card = createProgressCard(
      filename, sourceUrl,
      () => { stopped = !stopped; card.setStopped(stopped); if (!stopped) schedule(); else abortAll({ resetQueued: true }); },
      () => { cancelled = true; abortAll({ resetQueued: false }); finalize(false); }
    );

    const keyCache = new Map(), keyPending = new Map(), mapCache = new Map();
    const active = new Map(), pending = new Map(), progress = new Map();
    const attempts = new Uint8Array(total), status = new Int8Array(total);
    let nextWrite = 0, nextIndex = 0, doneCount = 0;
    let bytesCompleted = 0, avgSegSize = 0;

    let drawScheduled = false;
    const scheduleDraw = () => { if (drawScheduled) return; drawScheduled = true; requestAnimationFrame(() => { drawScheduled = false; draw(); }); };
    const draw = () => {
      let partial = 0; progress.forEach(({ loaded, size }) => { if (size > 0) partial += Math.min(1, loaded / size); else if (avgSegSize > 0) partial += Math.min(1, loaded / avgSegSize); });
      const pct = ((doneCount + partial) / total) * 100; card.update(pct, `(${doneCount}/${total})`);
    };
    const shouldAbort = () => cancelled || stopped;
    function abortAll({ resetQueued = false } = {}) {
      const toReset = [];
      active.forEach((req, i) => { try { req.abort?.(); } catch { } toReset.push(i); });
      active.clear();
      for (const i of toReset) { progress.delete(i); if (resetQueued && status[i] === 1) status[i] = 0; }
    }
    async function writeOrdered() {
      while (pending.has(nextWrite)) {
        const data = pending.get(nextWrite); pending.delete(nextWrite++);
        if (useFS) { await writable.write(data); } else chunks.push(data);
      }
    }
    async function getKeyBytes(seg) {
      if (!seg.key || seg.key.method !== 'AES-128' || !seg.key.uri) return null;
      const uri = seg.key.uri; if (keyCache.has(uri)) return keyCache.get(uri);
      if (!keyPending.has(uri)) keyPending.set(uri, (async () => { log('Fetching key:', uri); const buf = await getBuffer(uri); const k = new Uint8Array(buf); keyCache.set(uri, k); keyPending.delete(uri); return k; })());
      return keyPending.get(uri);
    }
    async function getMapBytes(seg) {
      if (!seg.needsMap || !seg.map?.uri) return null;
      const key = `${seg.map.uri}|${seg.map.rangeHeader || ''}`; if (mapCache.has(key)) return mapCache.get(key);
      log('Init segment:', seg.map.uri);
      const headers = seg.map.rangeHeader ? { Range: seg.map.rangeHeader } : {};
      const buf = new Uint8Array(await getBuffer(seg.map.uri, headers)); mapCache.set(key, buf); return buf;
    }
    async function handleLoad(i, response) {
      if (shouldAbort()) return; active.delete(i); progress.delete(i);
      const seg = segments[i]; let data = response;
      const keyBytes = await getKeyBytes(seg);
      if (keyBytes) { const iv = seg.key.iv ? hexToU8(seg.key.iv) : ivFromSeq(mediaSeq + i); data = await decryptAesCbc(data, keyBytes, iv); }
      let u8 = new Uint8Array(data);
      if (seg.needsMap) { const mapBytes = await getMapBytes(seg); if (mapBytes && mapBytes.length) { const combined = new Uint8Array(mapBytes.length + u8.length); combined.set(mapBytes, 0); combined.set(u8, mapBytes.length); u8 = combined; } }
      pending.set(i, u8); status[i] = 2; doneCount++; bytesCompleted += u8.length; avgSegSize = bytesCompleted / Math.max(1, doneCount);
      await writeOrdered(); scheduleDraw(); schedule(); checkFinalize();
    }
    function handleFail(i, why) {
      active.delete(i); progress.delete(i); if (shouldAbort()) return;
      const a = attempts[i] + 1; attempts[i] = a;
      if (a > MAX_RETRIES) { status[i] = -1; err(`Segment ${i} failed permanently (${why})`); } else status[i] = 0;
      schedule(); checkFinalize();
    }
    function checkFinalize() {
      if (doneCount === total) finalize(true);
      else if (!active.size && !stopped && !cancelled) { const failed = status.some(v => v === -1); if (failed) finalize(false); }
    }
    function schedule() {
      if (shouldAbort()) return;
      while (active.size < CONCURRENCY) {
        let i = -1;
        for (let j = 0; j < total; j++) { if (status[j] === 0 && attempts[j] > 0) { i = j; break; } }
        if (i === -1) { while (nextIndex < total && status[nextIndex] !== 0) nextIndex++; if (nextIndex < total) i = nextIndex++; }
        if (i === -1) break;
        downloadSeg(i);
      }
    }
    function downloadSeg(i) {
      if (shouldAbort()) return;
      const seg = segments[i]; status[i] = 1;
      const headers = seg.rangeHeader ? { Range: seg.rangeHeader } : {};
      const req = GM_xmlhttpRequest({
        method: 'GET', url: seg.uri, headers, responseType: 'arraybuffer', timeout: REQ_TIMEOUT,
        onprogress: (p) => { if (p && typeof p.loaded === 'number') { progress.set(i, { loaded: p.loaded, size: p.total || 0 }); scheduleDraw(); } },
        onload: (r) => { if (r.status >= 200 && r.status < 300) { handleLoad(i, r.response).catch(e => handleFail(i, e.message || 'decrypt/map error')); } else handleFail(i, `HTTP ${r.status}`); },
        onerror: () => handleFail(i, 'network'), ontimeout: () => handleFail(i, 'timeout')
      });
      active.set(i, req);
    }

    let writable = null, useFS = false; const chunks = [];
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: `${ext.toUpperCase()} Video`, accept: { 'video/*': [`.${ext}`] } }] });
        writable = await handle.createWritable(); useFS = true; log('Using File System Access API');
      } catch { }
    }

    async function finalize(ok) {
      try {
        if (ok) {
          if (useFS) { await writable.close(); log('Saved via File System API'); }
          else {
            const blob = new Blob(chunks, { type: isFmp4 ? 'video/mp4' : 'video/mp2t' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); log('Downloaded via Blob');
          }
          card.update(100, '(done)'); card.done(true);
        } else {
          if (useFS) { try { await writable.truncate(0); } catch { } try { await writable.close(); } catch { } }
          card.done(false);
        }
      } catch (e) { err('Finalize error:', e); card.done(false); }
      finally { abortAll(); }
    }

    schedule();
  }

  // ========================
  // Initialize
  // ========================
  mountUI();
})();