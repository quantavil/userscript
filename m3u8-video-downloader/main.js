// ==UserScript==
// @name         StreamGrabber
// @namespace    https://github.com/streamgrabber-lite
// @version      1.0.5
// @description  Lightweight downloader for HLS (.m3u8), video blobs, and direct videos. Mobile + Desktop. Pause/Resume. AES-128. fMP4. Minimal UI.
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==
(() => {
  'use strict';
  // =========================
  // Config
  // =========================
  const CFG = {
    RETRIES: 3,
    CONC: 6,
    REQ_MS: 60000,
    MAN_MS: 30000,
    SMALL_BYTES: 1 * 1024 * 1024, // 1MB
    UI_IDLE_MS: 5000, // idle fade delay
  };
  const CACHE = {
    TEXT_MAX: 256,
    HEAD_MAX: 256,
    DB_MAX: 120,        // bound detected URL sets
    CLEAR_MS: 120000    // 2 min passive trim
  };
  // =========================
  // State & caches
  // =========================
  const DB = {
    m3u8: new Set(),
    vid: new Set(),
    lastM3U8: null,
    lastVid: null,
    hiddenProgress: false
  };
  const BLOBS = new Map(); // blobUrl -> { blob, type, size, kind }
  const textCache = new Map(); // url -> text
  const inflightText = new Map(); // url -> Promise<string>
  const headCache = new Map(); // url -> { length, type }
  const inflightHead = new Map(); // url -> Promise<meta>
  const watchedVideos = new Set();
  // Settings
  const SETTINGS = {
    excludeSmall: (() => {
      try { const v = localStorage.getItem('sg_exclude_small'); return v == null ? true : v === 'true'; } catch { return true; }
    })(),
  };
  const setExcludeSmall = (v) => { SETTINGS.excludeSmall = !!v; try { localStorage.setItem('sg_exclude_small', String(!!v)); } catch { } };

  // bounded add helper for DB sets
  function boundedAdd(set, value, max = CACHE.DB_MAX) {
    if (set.has(value)) return;
    set.add(value);
    while (set.size > max) {
      const first = set.values().next().value;
      set.delete(first);
    }
  }
  // passive cache trim to prevent leaks on long sessions
  function trimCaches() {
    if (textCache.size > CACHE.TEXT_MAX) textCache.clear();
    if (headCache.size > CACHE.HEAD_MAX) headCache.clear();
    // stale videos in Set are cleaned via mutation observer, but still bound sizes
    while (DB.m3u8.size > CACHE.DB_MAX) DB.m3u8.delete(DB.m3u8.values().next().value);
    while (DB.vid.size > CACHE.DB_MAX) DB.vid.delete(DB.vid.values().next().value);
  }
  setInterval(trimCaches, CACHE.CLEAR_MS);
  window.addEventListener('pagehide', trimCaches);
  window.addEventListener('beforeunload', trimCaches);

  // =========================
  // Utilities
  // =========================
  const log = (...x) => console.log('[SG]', ...x);
  const err = (...x) => console.error('[SG]', ...x);
  const isHttp = (u) => typeof u === 'string' && /^https?:/i.test(u);
  const isBlob = (u) => typeof u === 'string' && /^blob:/i.test(u);
  const isM3U8Url = (u) => /\.m3u8(\b|[?#]|$)/i.test(u || '');
  const isVideoUrl = (u) => /\.(mp4|mkv|webm|avi|mov|m4v|ts|m2ts|flv|ogv|ogg)([?#]|$)/i.test(u || '');
  const looksM3U8Type = (t = '') => /mpegurl|vnd\.apple\.mpegurl|application\/x-mpegurl/i.test(t);
  const looksVideoType = (t = '') => /^video\//i.test(t) || /(matroska|mp4|webm|quicktime)/i.test(t);
  const safeAbs = (u, b) => { try { return new URL(u, b).href; } catch { return u; } };
  const cleanName = (s) => (s || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120).trim() || 'video';
  const fmtBytes = (n) => { if (n == null) return ''; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = n; while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; } return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`; };
  const extFromType = (t = '') => {
    t = t.toLowerCase();
    if (t.includes('webm')) return 'webm';
    if (t.includes('matroska') || t.includes('mkv')) return 'mkv';
    if (t.includes('quicktime') || t.includes('mov')) return 'mov';
    if (t.includes('mp2t') || t.includes('mpegts')) return 'ts';
    if (t.includes('ogg')) return 'ogg';
    if (t.includes('mp4')) return 'mp4';
    return 'mp4';
  };
  const guessExt = (url, type) => {
    const m = /(?:\.([a-z0-9]+))([?#]|$)/i.exec(url || ''); return m ? m[1].toLowerCase() : (type ? extFromType(type) : 'mp4');
  };
  function once(cache, inflight, key, loader) {
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      try { const v = await loader(); cache.set(key, v); return v; }
      finally { inflight.delete(key); }
    })();
    inflight.set(key, p);
    return p;
  }

  // =========================
  // Network helpers
  // =========================
  function gmGet({ url, responseType = 'text', headers = {}, timeout = CFG.REQ_MS, onprogress }) {
    let ref;
    const p = new Promise((resolve, reject) => {
      ref = GM_xmlhttpRequest({
        method: 'GET',
        url, responseType, headers, timeout,
        onprogress: e => onprogress?.(e),
        onload: r => (r.status >= 200 && r.status < 300) ? resolve(r.response) : reject(new Error(`HTTP ${r.status}`)),
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout'))
      });
    });
    p.abort = () => { try { ref?.abort(); } catch { } };
    return p;
  }
  const getText = (url) => once(textCache, inflightText, url, async () => {
    if (isBlob(url)) {
      const info = BLOBS.get(url);
      if (!info?.blob) throw new Error('Blob not found');
      return info.blob.text();
    }
    return gmGet({ url, responseType: 'text', timeout: CFG.MAN_MS });
  });
  function getBin(url, headers = {}, timeout = CFG.REQ_MS, onprogress) {
    if (isBlob(url)) {
      const info = BLOBS.get(url);
      if (!info?.blob) return Promise.reject(new Error('Blob not found'));
      const range = parseRange(headers.Range);
      const part = range ? info.blob.slice(range.start, (range.end == null ? info.blob.size : range.end + 1)) : info.blob;
      if (onprogress) setTimeout(() => onprogress({ loaded: part.size, total: part.size }), 0);
      return part.arrayBuffer();
    }
    return gmGet({ url, responseType: 'arraybuffer', headers, timeout, onprogress });
  }
  const headMeta = (url) => once(headCache, inflightHead, url, async () => {
    try {
      const resp = await new Promise((res, rej) => {
        GM_xmlhttpRequest({
          method: 'HEAD', url, timeout: CFG.REQ_MS,
          onload: res, onerror: () => rej(new Error('HEAD failed')),
          ontimeout: () => rej(new Error('HEAD timeout'))
        });
      });
      const h = resp.responseHeaders || '';
      const length = +(/(^|\n)content-length:\s*(\d+)/i.exec(h)?.[2] || 0) || null;
      const type = (/(^|\n)content-type:\s*([^\n]+)/i.exec(h)?.[2] || '').trim() || null;
      return { length, type };
    } catch { return { length: null, type: null }; }
  });

  // =========================
  // M3U8 parsing & math
  // =========================
  const isMasterText = (t) => /#EXT-X-STREAM-INF/i.test(t);
  const isMediaText = (t) => /#EXTINF:|#EXT-X-TARGETDURATION:/i.test(t);
  const hasEndlist = (t) => /#EXT-X-ENDLIST\b/i.test(t);
  const parseAttrs = (s) => {
    const r = {}; const re = /([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/gi; let m;
    while ((m = re.exec(s))) r[m[1].toUpperCase()] = m[2] !== undefined ? m[2] : m[3];
    return r;
  };
  const parseRange = (v) => { if (!v) return null; const m = /bytes=(\d+)-(\d+)?/i.exec(v); if (!m) return null; return { start: +m[1], end: m[2] != null ? +m[2] : null }; };
  const parseByterange = (s, fallbackStart = 0) => {
    if (!s) return null;
    const [lenStr, offStr] = String(s).split('@');
    const len = parseInt(lenStr, 10);
    const start = (offStr != null && offStr !== '') ? parseInt(offStr, 10) : fallbackStart;
    return { start, end: start + len - 1, next: start + len };
  };
  function parseMaster(m3u, base) {
    const lines = m3u.split(/\r?\n/); const out = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
      const a = parseAttrs(line.slice(18));
      let uri = null;
      for (let j = i + 1; j < lines.length; j++) {
        const n = lines[j].trim(); if (!n || n.startsWith('#')) continue; uri = safeAbs(n, base); break;
      }
      if (uri) {
        const res = a.RESOLUTION || '';
        const [w, h] = res ? res.split('x').map(x => parseInt(x, 10)) : [null, null];
        out.push({
          url: uri,
          res: res || null,
          w, h,
          peak: a.BANDWIDTH ? parseInt(a.BANDWIDTH, 10) : null,
          avg: a['AVERAGE-BANDWIDTH'] ? parseInt(a['AVERAGE-BANDWIDTH'], 10) : null,
          codecs: a.CODECS || null
        });
      }
    }
    return out;
  }
  function parseMedia(m3u, base) {
    const lines = m3u.split(/\r?\n/);
    const segs = [];
    let mediaSeq = 0;
    let key = { method: 'NONE', uri: null, iv: null };
    let map = null;
    let pendingDur = 0;
    let pendingBR = null;
    let lastNext = 0;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i].trim();
      if (!L) continue;
      if (L.startsWith('#EXT-X-MEDIA-SEQUENCE:')) mediaSeq = parseInt(L.split(':')[1], 10) || 0;
      else if (L.startsWith('#EXT-X-KEY:')) { const a = parseAttrs(L.slice(11)); key = { method: (a.METHOD || 'NONE').toUpperCase(), uri: a.URI ? safeAbs(a.URI, base) : null, iv: a.IV || null }; }
      else if (L.startsWith('#EXT-X-MAP:')) {
        const a = parseAttrs(L.slice(11));
        if (a.URI) {
          let rangeHeader = null;
          if (a.BYTERANGE) {
            const br = parseByterange(a.BYTERANGE, 0);
            if (br) rangeHeader = `bytes=${br.start}-${br.end}`;
          }
          map = { uri: safeAbs(a.URI, base), rangeHeader };
        }
      }
      else if (L.startsWith('#EXT-X-BYTERANGE:')) { pendingBR = parseByterange(L.split(':')[1], lastNext); }
      else if (L.startsWith('#EXTINF:')) { pendingDur = parseFloat(L.split(':')[1]) || 0; }
      else if (!L.startsWith('#')) {
        let rangeHeader = null;
        if (pendingBR) {
          rangeHeader = `bytes=${pendingBR.start}-${pendingBR.end}`;
          lastNext = pendingBR.next;
        } else lastNext = 0;
        segs.push({
          uri: safeAbs(L, base),
          dur: pendingDur,
          range: rangeHeader,
          key: key && key.method !== 'NONE' ? { ...key } : null,
          map: map ? { ...map } : null
        });
        pendingDur = 0; pendingBR = null;
      }
    }
    // mark map changes
    let prevMapSig = null;
    for (const s of segs) {
      const sig = s.map ? `${s.map.uri}|${s.map.range || ''}` : null;
      s.needMap = !!(sig && sig !== prevMapSig);
      if (sig) prevMapSig = sig;
    }
    return { segs, mediaSeq };
  }
  function sumDur(parsed) {
    let t = 0; for (const s of parsed.segs) t += (s.dur || 0); return t;
  }
  function byterangeBytes(parsed) {
    let exact = true, total = 0;
    const seenInit = new Set();
    for (const s of parsed.segs) {
      if (s.range) {
        const r = parseRange(s.range);
        if (!r || r.end == null) { exact = false; } else total += (r.end - r.start + 1);
      } else exact = false;
      if (s.needMap && s.map) {
        if (s.map.rangeHeader) {
          const key = `${s.map.uri}|${s.map.rangeHeader}`;
          if (!seenInit.has(key)) {
            seenInit.add(key);
            const mr = parseRange(s.map.rangeHeader);
            if (!mr || mr.end == null) exact = false;
            else total += (mr.end - mr.start + 1);
          }
        } else exact = false;
      }
    }
    return exact ? total : null;
  }
  async function estimateHls(m3u, url, v) {
    const p = parseMedia(m3u, url);
    const vod = hasEndlist(m3u);
    const seconds = sumDur(p);
    const brBytes = byterangeBytes(p);
    if (brBytes != null) return { bytes: brBytes, seconds, vod, via: 'byterange' };
    const bw = v?.avg ?? v?.peak ?? null;
    if (vod && bw && seconds > 0) return { bytes: Math.round((bw / 8) * seconds), seconds, vod, via: 'avg-bw' };
    return { bytes: null, seconds, vod, via: 'unknown' };
  }

  // =========================
  // Crypto helpers (AES-128/CBC)
  // =========================
  const hexToU8 = (hex) => {
    hex = String(hex || '').replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
    if (hex.length % 2) hex = '0' + hex;
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  };
  const ivFromSeq = (n) => {
    n = BigInt(n >>> 0); const iv = new Uint8Array(16);
    for (let i = 15; i >= 0; i--) { iv[i] = Number(n & 0xffn); n >>= 8n; }
    return iv;
  };
  async function aesCbcDec(buf, keyBytes, iv) {
    const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
    return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, k, buf);
  }

  // =========================
  // UI (Compact Dark Minimal)
  // =========================
  GM_addStyle(`
  @keyframes umdl-spin { to { transform: rotate(360deg); } }
  @keyframes umdl-slide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  
  .umdl-fab{position:fixed;right:14px;bottom:14px;z-index:2147483647;width:52px;height:52px;border-radius:12px;display:none;align-items:center;justify-content:center;background:#111;color:#fff;border:1px solid #222;box-shadow:0 4px 12px rgba(0,0,0,.5);cursor:pointer;transition:opacity .2s,background .2s}
  .umdl-fab.show{display:flex}
  .umdl-fab.idle{opacity:.3}
  .umdl-fab:hover{opacity:1;background:#1a1a1a}
  .umdl-fab.busy svg{opacity:0}
  .umdl-fab.busy::after{content:'';width:20px;height:20px;border:2px solid #333;border-top-color:#fff;border-radius:50%;animation:umdl-spin .7s linear infinite}
  .umdl-badge{position:absolute;top:3px;right:3px;background:#e74c3c;color:#fff;font-weight:600;font-size:10px;padding:2px 5px;border-radius:8px;display:none;line-height:1}
  .umdl-fab svg{width:20px;height:20px}
  
  .umdl-pick{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.85);backdrop-filter:blur(4px)}
  .umdl-pick.show{display:flex}
  .umdl-card{background:#0a0a0a;color:#e0e0e0;border:1px solid #222;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.8);width:min(480px,94vw);max-height:82vh;overflow:hidden;animation:umdl-slide .2s ease}
  .umdl-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #1a1a1a}
  .umdl-head .ttl{font-size:14px;font-weight:600;color:#fff}
  .umdl-x{background:#1a1a1a;border:1px solid #2a2a2a;color:#aaa;border-radius:6px;padding:6px;cursor:pointer;transition:background .15s,color .15s;display:flex;min-width:32px;min-height:32px}
  .umdl-x:hover{background:#222;color:#fff}
  .umdl-x svg{width:16px;height:16px}
  
  .umdl-body{padding:10px 14px 14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:calc(82vh - 100px)}
  .umdl-body::-webkit-scrollbar{width:6px}
  .umdl-body::-webkit-scrollbar-track{background:transparent}
  .umdl-body::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:3px}
  
  .umdl-opt{display:flex;align-items:center;gap:8px;font-size:12px;color:#999;padding:8px 10px;background:#111;border-radius:6px;border:1px solid #1a1a1a}
  .umdl-opt input[type="checkbox"]{width:15px;height:15px;cursor:pointer;accent-color:#fff;margin:0}
  
  .umdl-list{display:flex;flex-direction:column;gap:6px}
  .umdl-item{background:#111;border:1px solid #1a1a1a;border-radius:6px;padding:10px 12px;cursor:pointer;transition:background .15s,border-color .15s}
  .umdl-item:hover{background:#1a1a1a;border-color:#2a2a2a}
  .umdl-item-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
  .umdl-item .t{font-weight:600;font-size:13px;color:#fff;line-height:1.3;flex:1}
  .umdl-item .s{font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,monospace}
  .umdl-copy-btn{background:transparent;border:1px solid #2a2a2a;color:#aaa;border-radius:5px;padding:6px;cursor:pointer;transition:background .15s,color .15s;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .umdl-copy-btn:hover{background:#222;color:#fff}
  .umdl-copy-btn svg{width:14px;height:14px}
  .umdl-copy-btn.copied{background:#1a2e1a;border-color:#2a4a2a;color:#5f5}
  
  .umdl-empty{padding:24px;color:#666;font-size:13px;text-align:center}
  
  .umdl-toast{position:fixed;right:14px;bottom:72px;z-index:2147483646;display:flex;flex-direction:column;gap:8px;max-width:360px;font:13px system-ui,-apple-system,Segoe UI,Roboto,Arial;max-height:68vh;overflow-y:auto}
  .umdl-toast::-webkit-scrollbar{width:5px}
  .umdl-toast::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
  
  .umdl-job{background:#0a0a0a;color:#e0e0e0;border:1px solid #222;border-radius:8px;padding:12px 14px;min-width:260px;box-shadow:0 6px 20px rgba(0,0,0,.7);animation:umdl-slide .2s ease}
  .umdl-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
  .umdl-row .name{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;color:#fff}
  .umdl-ctrls{display:flex;gap:6px}
  .umdl-mini{background:#1a1a1a;color:#aaa;border:1px solid #2a2a2a;border-radius:6px;padding:6px 8px;cursor:pointer;transition:background .15s,color .15s;display:flex;align-items:center;justify-content:center;min-width:32px;min-height:32px}
  .umdl-mini:hover{background:#222;color:#fff}
  .umdl-mini svg{width:14px;height:14px}
  
  .umdl-bar{height:6px;background:#1a1a1a;border-radius:3px;overflow:hidden;border:1px solid #222}
  .umdl-fill{height:6px;width:0;background:#fff;transition:width .2s;box-shadow:0 0 8px rgba(255,255,255,.3)}
  
  @media (max-width:640px){
    .umdl-fab{right:12px;bottom:12px;width:50px;height:50px}
    .umdl-toast{left:12px;right:12px;bottom:70px;max-width:none}
    .umdl-card{max-height:90vh}
    .umdl-body{max-height:calc(90vh - 90px)}
  }
`);

  // SVG Icons
  const ICONS = {
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    cancel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`
  };
  const DL_SVG = ICONS.download;

  const $ = (sel, root = document) => root.querySelector(sel);

  // root UI
  const FAB = document.createElement('button');
  FAB.className = 'umdl-fab'; FAB.innerHTML = DL_SVG; FAB.title = 'Download detected media';
  const BADGE = document.createElement('span'); BADGE.className = 'umdl-badge'; BADGE.style.display = 'none'; FAB.appendChild(BADGE);
  const PICK = document.createElement('div'); PICK.className = 'umdl-pick';
  PICK.innerHTML = `
    <div class="umdl-card">
      <div class="umdl-head">
        <div class="ttl">Select Media</div>
        <button class="umdl-x" title="Close">${ICONS.close}</button>
      </div>
      <div class="umdl-body">
        <label class="umdl-opt"><input type="checkbox" class="umdl-excl"> Exclude small (&lt; 1MB)</label>
        <div class="umdl-list"></div>
      </div>
    </div>`;
  const TOAST = document.createElement('div'); TOAST.className = 'umdl-toast';
  const PANEL = PICK;
  const PROG_WRAP = TOAST;

  function mountUI() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', mountUI, { once: true }); return; }
    if (!FAB.parentNode) document.body.appendChild(FAB);
    if (!PANEL.parentNode) document.body.appendChild(PANEL);
    if (!PROG_WRAP.parentNode) document.body.appendChild(PROG_WRAP);
  }
  mountUI();

  function setBadge() {
    const n = DB.m3u8.size + DB.vid.size;
    if (n > 1) {
      BADGE.textContent = String(n);
      BADGE.style.display = 'inline-block';
    } else BADGE.style.display = 'none';
  }

  let idleT;
  function setIdle() { clearTimeout(idleT); idleT = setTimeout(() => FAB.classList.add('idle'), CFG.UI_IDLE_MS); }
  function clearIdle() { FAB.classList.remove('idle'); clearTimeout(idleT); }
  function showFab() { mountUI(); FAB.classList.add('show'); setBadge(); clearIdle(); setIdle(); }
  function closePanel() { PANEL.classList.remove('show'); }
  function setFabBusy(b) {
    if (b) { FAB.classList.add('busy'); FAB.disabled = true; }
    else { FAB.classList.remove('busy'); FAB.disabled = false; }
  }
  FAB.addEventListener('mouseenter', clearIdle);
  FAB.addEventListener('mouseleave', setIdle);

  // Copy to clipboard helper
  async function copyToClipboard(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      const originalHTML = btn.innerHTML;
      btn.innerHTML = ICONS.check;
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
      }, 1500);
      return true;
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = ICONS.check;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('copied');
        }, 1500);
        return true;
      } catch (err) {
        console.error('Copy failed:', err);
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }
  // =========================
  // Detection
  // =========================
  function take(url) {
    try {
      if (!url || (!isHttp(url) && !isBlob(url))) return;
      if (isM3U8Url(url) || (isBlob(url) && BLOBS.get(url)?.kind === 'm3u8')) {
        if (!DB.m3u8.has(url)) { boundedAdd(DB.m3u8, url); DB.lastM3U8 = url; showFab(); }
      } else if (isVideoUrl(url) || (isBlob(url) && BLOBS.get(url)?.kind === 'video')) {
        if (!DB.vid.has(url)) { boundedAdd(DB.vid, url); DB.lastVid = url; showFab(); }
      }
      setBadge();
    } catch { }
  }
  // Hook: createObjectURL
  (() => {
    const bak = URL.createObjectURL;
    URL.createObjectURL = function (obj) {
      const href = bak.call(this, obj);
      try {
        if (obj instanceof Blob) {
          const type = obj.type || '';
          const info = { blob: obj, type, size: obj.size, kind: 'other' };
          if (looksM3U8Type(type)) { info.kind = 'm3u8'; BLOBS.set(href, info); take(href); }
          else if (looksVideoType(type)) { info.kind = 'video'; BLOBS.set(href, info); take(href); }
          else {
            const need = /octet-stream|text\/plain|^$/.test(type);
            if (need && obj.size > 0) {
              obj.slice(0, Math.min(2048, obj.size)).text().then(t => {
                if (/^#EXTM3U/i.test(t)) info.kind = 'm3u8';
                else info.kind = 'other';
                BLOBS.set(href, info);
                take(href);
              }).catch(() => BLOBS.set(href, info));
            } else BLOBS.set(href, info);
          }
        } else BLOBS.set(href, { blob: null, type: 'other', size: 0, kind: 'other' });
      } catch (e) { err('createObjectURL', e); }
      return href;
    };
    const r = URL.revokeObjectURL;
    URL.revokeObjectURL = function (href) {
      try {
        BLOBS.delete(href);
        DB.m3u8.delete(href);
        DB.vid.delete(href);
        setBadge();
      } catch { }
      return r.call(this, href);
    };
  })();
  // Hook: fetch
  (() => {
    const f = window.fetch;
    if (typeof f === 'function') {
      window.fetch = function (...args) {
        try {
          const u = typeof args[0] === 'string' ? args[0] : args[0]?.url;
          take(u);
        } catch { }
        return f.apply(this, args);
      };
    }
  })();
  // Hook: XHR
  (() => {
    const o = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      try { take(url); } catch { }
      return o.call(this, method, url, ...rest);
    };
  })();
  // PerfObserver
  try {
    const po = new PerformanceObserver(list => list.getEntries().forEach(e => take(e.name)));
    po.observe({ entryTypes: ['resource'] });
  } catch { }
  // Video tags scanning
  function scanVideos() {
    document.querySelectorAll('video').forEach(v => {
      if (v.__sg_watch) return;
      v.__sg_watch = true;
      const cb = () => {
        const srcs = [v.currentSrc || v.src, ...Array.from(v.querySelectorAll('source')).map(s => s.src)];
        srcs.forEach(take);
      };
      ['loadstart', 'loadedmetadata', 'canplay'].forEach(ev => v.addEventListener(ev, cb));
      watchedVideos.add(v);
      cb();
    });
  }
  let mo, _deb;
  document.addEventListener('DOMContentLoaded', () => {
    scanVideos();
    mo = new MutationObserver(() => {
      clearTimeout(_deb); _deb = setTimeout(() => {
        scanVideos();
        for (const v of Array.from(watchedVideos)) if (!v.isConnected) watchedVideos.delete(v);
      }, 250);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  });

  // =========================
  // Picker helpers
  // =========================
  function renderList(list) {
    const listEl = PANEL.querySelector('.umdl-list');
    listEl.innerHTML = '';
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'umdl-empty';
      empty.textContent = 'No items match the filter.';
      listEl.appendChild(empty);
      return;
    }
    list.forEach((it) => {
      const div = document.createElement('div');
      div.className = 'umdl-item';
      const shortUrl = it.url.length > 80 ? it.url.slice(0, 80) + '…' : it.url;
      div.innerHTML = `
      <div class="umdl-item-top">
        <div class="t">${escapeHtml(it.label)}</div>
        <button class="umdl-copy-btn" title="Copy URL">${ICONS.copy}</button>
      </div>
      <div class="s" title="${escapeHtml(it.url)}">${escapeHtml(shortUrl)}</div>
    `;

      const copyBtn = div.querySelector('.umdl-copy-btn');
      copyBtn.onclick = (e) => {
        e.stopPropagation();
        copyToClipboard(it.url, copyBtn);
      };

      div.onclick = (e) => {
        if (!e.target.closest('.umdl-copy-btn')) {
          resolvePicker(it);
        }
      };

      listEl.appendChild(div);
    });
  }
  let resolvePicker = () => { };
  async function pickFromList(items, { title = 'Select Media', filterable = true } = {}) {
    return new Promise((resolve) => {
      resolvePicker = (v) => { closePanel(); resolve(v ?? null); };
      const ttl = PANEL.querySelector('.ttl');
      const listEl = PANEL.querySelector('.umdl-list');
      const exWrap = PANEL.querySelector('.umdl-opt');
      const ex = PANEL.querySelector('.umdl-excl');
      const x = PANEL.querySelector('.umdl-x');

      ttl.textContent = title;
      if (filterable) {
        const anySizeKnown = items.some(i => i.size != null);
        exWrap.style.display = anySizeKnown ? 'flex' : 'none';
        ex.checked = SETTINGS.excludeSmall;
        const apply = () => {
          const listToUse = (SETTINGS.excludeSmall && anySizeKnown)
            ? items.filter(x => x.size == null || x.size >= CFG.SMALL_BYTES)
            : items;
          renderList(listToUse);
        };
        ex.onchange = () => { setExcludeSmall(ex.checked); apply(); };
        apply();
      } else {
        exWrap.style.display = 'none';
        renderList(items);
      }
      x.onclick = () => resolvePicker(null);
      PANEL.onclick = (e) => { if (e.target === PANEL) resolvePicker(null); };
      PANEL.classList.add('show');
    });
  }

  // =========================
  // UI interactions
  // =========================
  FAB.addEventListener('click', async (ev) => {
    clearIdle(); setIdle();
    let items = [];
    try {
      setFabBusy(true);
      items = await buildItems();
    } catch (e) {
      alert(e?.message || String(e));
      setFabBusy(false);
      return;
    }

    // Always confirm by default (fixes "auto-download surprises users")
    // Hold Alt to quick start when exactly 1 item
    if (ev.altKey && items.length === 1) {
      setFabBusy(false);
      await handleItem(items[0]);
      return;
    }

    const sel = await pickFromList(items, { title: 'Select Media', filterable: true });
    setFabBusy(false);
    if (!sel) return;
    await handleItem(sel);
  });

  // Progress card
  function makeProgress(title, src, { stoppable = false, onStop, onCancel, segs = 0 } = {}) {
    const div = document.createElement('div');
    div.className = 'umdl-job';
    div.innerHTML = `
      <div class="umdl-row">
        <div class="name" title="${escapeHtml(src)}">${escapeHtml(title)}</div>
        <div class="umdl-ctrls">
          ${stoppable ? `<button class="umdl-mini btn-stop" title="Pause">${ICONS.pause}</button>` : ''}
          <button class="umdl-mini btn-x" title="Cancel">${ICONS.cancel}</button>
        </div>
      </div>
      <div class="umdl-bar"><div class="umdl-fill"></div></div>
      <div class="umdl-row" style="margin-top:6px;font-size:11px"><span class="status" style="color:#999">${segs ? `${segs} segs` : ''}</span><span class="pct">0%</span></div>
    `;
    PROG_WRAP.appendChild(div);
    const fill = div.querySelector('.umdl-fill');
    const pct = div.querySelector('.pct');
    const btnX = div.querySelector('.btn-x');
    const btnStop = div.querySelector('.btn-stop');
    btnX.onclick = () => onCancel?.();
    if (btnStop) {
      btnStop.onclick = () => {
        const v = onStop?.();
        if (v === 'paused') {
          btnStop.innerHTML = ICONS.play;
          btnStop.title = 'Resume';
        } else if (v === 'resumed') {
          btnStop.innerHTML = ICONS.pause;
          btnStop.title = 'Pause';
        }
      };
    }
    return {
      update(p, txt = '') {
        const pc = Math.max(0, Math.min(100, Math.floor(p)));
        fill.style.width = pc + '%';
        pct.textContent = `${pc}%${txt ? ' ' + txt : ''}`;
      },
      done(ok = true, msg) {
        fill.style.background = ok ? '#10b981' : '#e74c3c';
        fill.style.boxShadow = ok ? '0 0 8px rgba(16,185,129,.4)' : '0 0 8px rgba(231,76,60,.4)';
        this.update(100, msg || (ok ? '✓' : '✗'));
        setTimeout(() => div.remove(), 2200);
      },
      remove() { div.remove(); }
    };
  }

  // =========================
  // Build items
  // =========================
  async function buildItems() {
    const out = [];
    // m3u8 sources
    for (const u of DB.m3u8) {
      const info = BLOBS.get(u);
      try {
        let label = 'HLS';
        let size = null;
        let mtxt = await getText(u);
        if (isMasterText(mtxt)) {
          const v = parseMaster(mtxt, u).sort((a, b) => (b.h || 0) - (a.h || 0) || (b.avg || b.peak || 0) - (a.avg || a.peak || 0))[0];
          if (v) {
            const mediaTxt = await getText(v.url);
            const est = await estimateHls(mediaTxt, v.url, v);
            size = est.bytes ?? null;
            label = `HLS${v.res ? ' • ' + v.res : ''}${size ? ' • ~' + fmtBytes(size) : ''}`;
          }
        } else if (isMediaText(mtxt)) {
          const est = await estimateHls(mtxt, u, null);
          size = est.bytes ?? null;
          label = `HLS${size ? ' • ~' + fmtBytes(size) : ''}`;
        }
        out.push({ kind: 'hls', url: u, label, size });
      } catch {
        out.push({ kind: 'hls', url: u, label: 'HLS', size: info?.size ?? null });
      }
    }
    // direct videos
    for (const u of DB.vid) {
      const info = BLOBS.get(u);
      const ext = guessExt(u, info?.type).toUpperCase();
      const size = info?.size ?? null;
      out.push({ kind: 'video', url: u, label: `${ext}${size ? ' • ' + fmtBytes(size) : ''}`, size });
    }
    return out;
  }
  async function handleItem(it) {
    if (it.kind === 'video') return downloadDirect(it.url);
    if (it.kind === 'variant') return downloadHls(it.url, it.variant);
    if (it.kind === 'hls') return downloadHls(it.url);
  }

  // =========================
  // Save blob helper
  // =========================
  async function saveBlob(blob, filename, extHint) {
    try {
      if ('showSaveFilePicker' in window) {
        const ext = (extHint || '').replace(/^\./, '') || (blob.type.split('/').pop() || 'bin');
        const h = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Media', accept: { [blob.type || 'video/*']: [`.${ext}`] } }]
        });
        const w = await h.createWritable();
        await w.write(blob); await w.close(); return true;
      }
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  }

  // =========================
  // Direct video download
  // =========================
  async function downloadDirect(url) {
    log('Direct:', url);
    const info = BLOBS.get(url);
    const ext = guessExt(url, info?.type);
    const fn = `${cleanName(document.title)}.${ext}`;
    // blob case
    if (info?.blob) {
      const card = makeProgress(fn, url, { onCancel: () => card.remove() });
      try { await saveBlob(info.blob, fn, ext); card.update(100, ''); card.done(true); } catch (e) { card.done(false, e?.message); }
      return;
    }
    let total = 0, req = null, cancelled = false;
    const card = makeProgress(fn, url, { onCancel: () => { cancelled = true; try { req?.abort?.(); } catch { }; card.remove(); } });
    try {
      const meta = await headMeta(url);
      total = meta.length || 0;
      req = gmGet({
        url, responseType: 'arraybuffer', timeout: CFG.REQ_MS,
        onprogress: (e) => {
          if (cancelled) return;
          const loaded = e?.loaded || 0;
          if (total > 0) card.update((loaded / total) * 100, `${fmtBytes(loaded)}/${fmtBytes(total)}`);
          else card.update(0, `${fmtBytes(loaded)}`);
        }
      });
      const buf = await req; if (cancelled) return;
      const blob = new Blob([buf], { type: meta.type || `video/${ext}` });
      await saveBlob(blob, fn, ext);
      card.update(100, ''); card.done(true);
    } catch (e) { card.done(false, e?.message || 'Failed'); }
  }

  // =========================
  // HLS download
  // =========================
  async function downloadHls(url, preVariant = null) {
    log('HLS:', url);
    const txt = await getText(url);
    let mediaUrl = url, chosenVariant = preVariant;
    if (isMasterText(txt)) {
      const variants = parseMaster(txt, url).sort((a, b) => (b.h || 0) - (a.h || 0) || (b.avg || b.peak || 0) - (a.avg || a.peak || 0));
      if (!variants.length) throw new Error('No variants found');
      // precompute size labels quickly and attach estimated sizes
      const items = [];
      for (const v of variants) {
        let label = [v.res, (v.avg || v.peak) ? `${Math.round((v.avg || v.peak) / 1000)}k` : null].filter(Boolean).join(' • ') || 'Variant';
        let size = null;
        try {
          const mediaTxt = await getText(v.url);
          const est = await estimateHls(mediaTxt, v.url, v);
          if (est.bytes != null) size = est.bytes;
          if (size != null) label += ` • ~${fmtBytes(size)}`;
        } catch { }
        items.push({ kind: 'variant', url: v.url, label, variant: v, size });
      }
      // picker (now filter works as sizes are known)
      const selected = await pickFromList(items, { title: 'Select Quality', filterable: true });
      if (!selected) return;
      chosenVariant = selected.variant; mediaUrl = selected.url;
    } else if (!isMediaText(txt)) throw new Error('Invalid playlist');
    const mediaTxt = isMediaText(txt) ? txt : await getText(mediaUrl);
    const parsed = parseMedia(mediaTxt, mediaUrl);
    if (!parsed.segs.length) throw new Error('No segments');
    const isFmp4 = parsed.segs.some(s => s.map) || /\.m4s(\?|$)/i.test(parsed.segs[0].uri);
    const ext = isFmp4 ? 'mp4' : 'ts';
    const name = cleanName(document.title);
    const q = chosenVariant?.res ? `_${chosenVariant.res}` : '';
    const filename = `${name}${q}.${ext}`;
    await downloadSegments(parsed, filename, ext, isFmp4, url);
  }

  async function downloadSegments(parsed, filename, ext, isFmp4, srcUrl) {
    const segs = parsed.segs;
    const total = segs.length;
    let paused = false, canceled = false, ended = false;
    const attempts = new Uint8Array(total);
    const status = new Int8Array(total); // 0=queued,1=loading,2=done,-1=failed
    const inflight = new Map(); // idx -> req
    const inprog = new Map(); // idx -> {loaded,total}
    const buffers = new Map(); // idx -> Uint8Array (ready for ordered write)
    let done = 0, active = 0, nextIdx = 0, writePtr = 0, byteDone = 0, avgLen = 0;

    const card = makeProgress(filename, srcUrl, {
      stoppable: true,
      segs: total,
      onStop() { paused = !paused; if (!paused) pump(); return paused ? 'paused' : 'resumed'; },
      onCancel() { canceled = true; abortAll(); card.remove(); }
    });

    // file writer
    let useFS = false, writer = null, chunks = [];
    if ('showSaveFilePicker' in window) {
      try {
        const h = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: `${ext.toUpperCase()} Video`, accept: { 'video/*': [`.${ext}`] } }]
        });
        writer = await h.createWritable(); useFS = true;
      } catch { }
    }
    // caches for keys/maps
    const keyCache = new Map(), keyInflight = new Map();
    const mapCache = new Map(), mapInflight = new Map();
    const onceKey = (k, fn) => once(keyCache, keyInflight, k, fn);
    const onceMap = (k, fn) => once(mapCache, mapInflight, k, fn);

    const draw = (() => {
      let raf = 0;
      return () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          let partial = 0;
          inprog.forEach(({ loaded, total }) => {
            if (total > 0) partial += Math.min(1, loaded / total);
            else if (avgLen > 0) partial += Math.min(1, loaded / avgLen);
          });
          const pct = ((done + partial) / total) * 100;
          card.update(pct, `${done}/${total}`);
        });
      };
    })();

    function abortAll() {
      for (const [, r] of inflight) { try { r.abort?.(); } catch { } }
      inflight.clear(); inprog.clear();
    }
    function maybeFailFast(i) {
      // If the segment at the write head failed permanently, we can fail fast
      if (status[i] === -1 && i === writePtr && !ended) {
        abortAll();
        finalize(false);
      }
    }
    function fail(i, why) {
      const a = ++attempts[i];
      if (a > CFG.RETRIES) {
        status[i] = -1; err(`Segment ${i} failed: ${why}`);
        maybeFailFast(i);
      } else status[i] = 0;
    }
    async function fetchKeyBytes(s) {
      if (!s.key || s.key.method !== 'AES-128' || !s.key.uri) return null;
      return onceKey(s.key.uri, async () => new Uint8Array(await getBin(s.key.uri)));
    }
    async function fetchMapBytes(s) {
      if (!s.needMap || !s.map?.uri) return null;
      const id = `${s.map.uri}|${s.map.rangeHeader || ''}`;
      return onceMap(id, async () => {
        const headers = s.map.rangeHeader ? { Range: s.map.rangeHeader } : {};
        return new Uint8Array(await getBin(s.map.uri, headers));
      });
    }
    async function handleSeg(i) {
      const s = segs[i];
      status[i] = 1; active++;
      if (s.key && s.key.method && s.key.method !== 'AES-128') {
        active--; status[i] = -1; err('Unsupported key method', s.key.method); maybeFailFast(i); check(); return;
      }
      const headers = s.range ? { Range: s.range } : {};
      const req = gmGet({
        url: s.uri, responseType: 'arraybuffer', headers, timeout: CFG.REQ_MS,
        onprogress: (e) => { inprog.set(i, { loaded: e?.loaded || 0, total: e?.total || 0 }); draw(); }
      });
      inflight.set(i, req);
      let buf;
      try {
        buf = await req;
        // decrypt?
        const kb = await fetchKeyBytes(s);
        if (kb) {
          const iv = s.key.iv ? hexToU8(s.key.iv) : ivFromSeq(parsed.mediaSeq + i);
          buf = await aesCbcDec(buf, kb, iv);
        }
        let u8 = new Uint8Array(buf);
        // prepend init map?
        if (s.needMap) {
          const mapBytes = await fetchMapBytes(s);
          if (mapBytes?.length) {
            const join = new Uint8Array(mapBytes.length + u8.length);
            join.set(mapBytes, 0); join.set(u8, mapBytes.length);
            u8 = join;
          }
        }
        buffers.set(i, u8);
        inprog.delete(i);
        inflight.delete(i);
        status[i] = 2; active--; done++; byteDone += u8.length; avgLen = byteDone / Math.max(1, done);
        draw();
        // flush ordered
        while (buffers.has(writePtr)) {
          const chunk = buffers.get(writePtr); buffers.delete(writePtr);
          if (useFS) await writer.write(chunk);
          else chunks.push(chunk);
          writePtr++;
        }
      } catch (e) {
        inprog.delete(i);
        inflight.delete(i);
        active--;
        fail(i, e?.message || 'net/decrypt');
      } finally {
        pump();
        check();
      }
    }
    function pump() {
      if (paused || canceled || ended) return;
      while (active < CFG.CONC) {
        // retry first
        let idx = -1;
        for (let j = 0; j < total; j++) if (status[j] === 0 && attempts[j] > 0) { idx = j; break; }
        if (idx === -1) {
          while (nextIdx < total && status[nextIdx] !== 0) nextIdx++;
          if (nextIdx < total) idx = nextIdx++;
        }
        if (idx === -1) break;
        handleSeg(idx);
      }
    }
    function check() {
      if (ended) return;
      if (done === total) return finalize(true);
      if (!active && Array.prototype.some.call(status, v => v === -1)) return finalize(false);
    }
    async function finalize(ok) {
      if (ended) return; ended = true;
      try {
        // flush any remaining in order up to first gap
        while (buffers.has(writePtr)) {
          const c = buffers.get(writePtr); buffers.delete(writePtr);
          if (useFS) await writer.write(c);
          else chunks.push(c);
          writePtr++;
        }
        if (ok) {
          if (useFS) { await writer.close(); }
          else {
            const blob = new Blob(chunks, { type: isFmp4 ? 'video/mp4' : 'video/mp2t' });
            await saveBlob(blob, filename, ext);
          }
          card.update(100, ''); card.done(true);
        } else {
          if (useFS) { try { await writer.truncate(0); } catch { } try { await writer.close(); } catch { } }
          card.done(false);
        }
      } catch (e) {
        err('finalize', e);
        try { if (useFS) await writer.close(); } catch { }
        card.done(false);
      } finally {
        for (const [, r] of inflight) { try { r.abort?.(); } catch { } }
        inflight.clear(); inprog.clear();
      }
    }
    pump();
  }

  // =========================
  // Escape helper (UI)
  // =========================
  const _escapeDiv = document.createElement('div');
  function escapeHtml(x) { _escapeDiv.textContent = x == null ? '' : String(x); return _escapeDiv.innerHTML; }

  // startup
  mountUI();
})();