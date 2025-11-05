// ==UserScript==
// @name         Universal M3U8 Downloader (Ultimate Edition, Refactored)
// @namespace    https://github.com/m3u8dl-userscripts
// @version      1.4.1
// @description  Download HLS (.m3u8) streams — optimized, robust, and cleaner
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// ==/UserScript==

(() => {
  'use strict';

  // Config
  const MAX_RETRIES = 5;
  const CONCURRENCY = 6; // tune as needed
  const REQ_TIMEOUT = 60000;
  const MANIFEST_TIMEOUT = 30000;
  const MAX_MANIFESTS = 50;

  // Logger
  const log = (...args) => console.log('[m3u8dl]', ...args);
  const err = (...args) => console.error('[m3u8dl]', ...args);

  // State
  const state = {
    latestM3U8: null,
    manifests: new Set(),
    idleTimer: null
  };

  const DOWNLOAD_ICON_SVG = `
    <svg class="m3u8dl-icon" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`;

  // Styles
  GM_addStyle(`
    .m3u8dl-btn{display:inline-flex;align-items:center;justify-content:center;height:2em;width:2.25em;border:none;cursor:pointer;background:transparent;color:inherit;padding:0;transition:opacity .25s ease}
    .m3u8dl-btn .m3u8dl-icon{width:18px;height:18px}
    .m3u8dl-floating{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:44px;height:44px;border-radius:50%;background:rgba(17,17,17,.92);color:#fff;border:1px solid rgba(255,255,255,.2);box-shadow:0 6px 24px rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;cursor:pointer;transition:opacity .25s ease,filter .2s ease}
    .m3u8dl-floating.show{display:flex}
    .m3u8dl-floating.idle{opacity:.28}
    .m3u8dl-floating.idle:hover{opacity:1}
    .m3u8dl-floating:hover{filter:brightness(1.12)}
    #m3u8dl-progress-container{position:fixed;bottom:5rem;right:1rem;z-index:2147483646;display:flex;flex-direction:column;gap:.75rem;max-width:360px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
    .m3u8dl-card{background:rgba(17,17,17,.97);color:#e5e7eb;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px;min-width:260px;box-shadow:0 8px 32px rgba(0,0,0,.5);opacity:0;transform:translateX(100%);transition:opacity .28s ease,transform .28s ease}
    .m3u8dl-card.show{opacity:1;transform:translateX(0)}
    .m3u8dl-header{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:10px}
    .m3u8dl-title{font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .m3u8dl-actions{display:flex;gap:6px}
    .m3u8dl-mini-btn{background:transparent;border:none;color:#a3a3a3;cursor:pointer;padding:4px 6px;border-radius:6px;display:inline-flex;align-items:center;gap:4px;font-size:11px;transition:all .2s ease}
    .m3u8dl-mini-btn:hover{color:#fff;background:rgba(255,255,255,.12)}
    .m3u8dl-mini-btn .ico{font-size:13px}
    .m3u8dl-bar{height:6px;background:rgba(255,255,255,.15);border-radius:999px;overflow:hidden;margin-bottom:7px}
    .m3u8dl-fill{height:100%;width:0;background:linear-gradient(90deg,#3b82f6,#60a5fa);transition:width .2s ease}
    .m3u8dl-fill.ok{background:linear-gradient(90deg,#10b981,#34d399)}
    .m3u8dl-fill.err{background:linear-gradient(90deg,#ef4444,#f87171)}
    .m3u8dl-text{text-align:right;color:#d1d5db;font-size:12px;font-weight:500;min-height:17px}
    .m3u8dl-variant-popup{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
    .m3u8dl-variant-popup.show{display:flex}
    .m3u8dl-variant-card{background:#111827;color:#e5e7eb;border:1px solid rgba(255,255,255,.15);padding:16px;border-radius:12px;width:min(340px,92vw);max-height:80vh;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
    .m3u8dl-variant-card h4{margin:0 0 14px;font-size:15px;font-weight:600}
    .m3u8dl-var-list{display:flex;flex-direction:column;gap:8px}
    .m3u8dl-var-btn{background:#1f2937;border:1px solid rgba(255,255,255,.14);color:#e5e7eb;border-radius:8px;padding:11px 13px;text-align:left;cursor:pointer;font-size:13px;transition:all .2s ease}
    .m3u8dl-var-btn:hover,.m3u8dl-var-btn:focus{background:#374151;border-color:rgba(255,255,255,.25);transform:translateX(2px);outline:none}
    .m3u8dl-floating.detected{animation:m3u8-pulse .5s ease}
    @keyframes m3u8-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    .m3u8dl-variant-card::-webkit-scrollbar{width:6px}
    .m3u8dl-variant-card::-webkit-scrollbar-thumb{background:rgba(255,255,255,.25);border-radius:6px}
    @media (max-width:480px){#m3u8dl-progress-container{left:1rem;right:1rem;max-width:none}.m3u8dl-card{min-width:auto}}
  `);

  // Elements
  const floatingBtn = createFloatingButton();
  const progressContainer = createProgressContainer();
  const variantPopup = createVariantPopup();

  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.className = 'm3u8dl-floating';
    btn.title = 'Download detected HLS (m3u8)';
    btn.setAttribute('aria-label', 'Download HLS stream');
    btn.innerHTML = DOWNLOAD_ICON_SVG;

    const startIdle = () => {
      clearTimeout(state.idleTimer);
      state.idleTimer = setTimeout(() => btn.classList.add('idle'), 15000);
    };
    const stopIdle = () => {
      btn.classList.remove('idle');
      clearTimeout(state.idleTimer);
    };

    btn.onclick = (e) => {
      stopIdle();
      startIdle();
      startDownload({ showVariantPicker: e.altKey });
    };
    btn.onmouseenter = stopIdle;
    btn.onmouseleave = startIdle;
    btn.startIdleTimer = startIdle;
    btn.stopIdle = stopIdle;
    btn.cleanup = () => {
      clearTimeout(state.idleTimer);
      try { mo.disconnect(); } catch {}
    };
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
      <div class="m3u8dl-variant-card" role="dialog" aria-label="Select video quality">
        <h4>Choose Quality</h4>
        <div class="m3u8dl-var-list"></div>
      </div>`;
    return popup;
  }

  function mountUI() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', mountUI, { once: true });
      return;
    }
    if (!progressContainer.parentNode) document.body.appendChild(progressContainer);
    if (!floatingBtn.parentNode) document.body.appendChild(floatingBtn);
    if (!variantPopup.parentNode) document.body.appendChild(variantPopup);
  }

  const escapeEl = document.createElement('div');
  function escapeHtml(str) {
    escapeEl.textContent = str == null ? '' : String(str);
    return escapeEl.innerHTML;
  }

  function createProgressCard(title, sourceUrl, onStopResume, onCancel) {
    const card = document.createElement('div');
    card.className = 'm3u8dl-card';
    card.innerHTML = `
      <div class="m3u8dl-header">
        <div class="m3u8dl-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="m3u8dl-actions">
          <button class="m3u8dl-mini-btn copy-btn" title="Copy playlist URL" aria-label="Copy playlist URL">
            <span class="ico">📋</span><span class="lbl">Copy URL</span>
          </button>
          <button class="m3u8dl-mini-btn stop-btn" title="Stop" aria-label="Stop or resume download">
            <span class="ico">⏸</span><span class="lbl">Stop</span>
          </button>
          <button class="m3u8dl-mini-btn close-btn" title="Cancel" aria-label="Cancel download">
            <span class="ico">✕</span>
          </button>
        </div>
      </div>
      <div class="m3u8dl-bar"><div class="m3u8dl-fill"></div></div>
      <div class="m3u8dl-text">0% (0/0)</div>
    `;
    progressContainer.appendChild(card);
    requestAnimationFrame(() => card.classList.add('show'));

    const stopBtn = card.querySelector('.stop-btn');
    const closeBtn = card.querySelector('.close-btn');
    const copyBtn = card.querySelector('.copy-btn');
    const fill = card.querySelector('.m3u8dl-fill');
    const text = card.querySelector('.m3u8dl-text');

    stopBtn.onclick = onStopResume;
    closeBtn.onclick = onCancel;
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(sourceUrl || state.latestM3U8 || '');
        copyBtn.querySelector('.lbl').textContent = 'Copied';
        setTimeout(() => (copyBtn.querySelector('.lbl').textContent = 'Copy URL'), 1200);
      } catch {}
    };

    return {
      setStopped(stopped) {
        const ico = stopBtn.querySelector('.ico');
        const lbl = stopBtn.querySelector('.lbl');
        stopBtn.title = stopped ? 'Resume' : 'Stop';
        ico.textContent = stopped ? '▶' : '⏸';
        lbl.textContent = stopped ? 'Resume' : 'Stop';
      },
      update(pct, extraText = '') {
        const percent = Math.max(0, Math.min(100, Math.floor(pct)));
        fill.style.width = `${percent}%`;
        text.textContent = `${percent}%${extraText ? ' ' + extraText : ''}`;
      },
      done(ok = true) {
        fill.classList.add(ok ? 'ok' : 'err');
        fill.style.width = '100%';
        text.textContent = ok ? '✓ Complete' : '✗ Failed';
        setTimeout(() => card.remove(), 2500);
      },
      remove() {
        card.classList.remove('show');
        setTimeout(() => card.remove(), 300);
      }
    };
  }

  function showVariantPicker(variants) {
    return new Promise(resolve => {
      const list = variantPopup.querySelector('.m3u8dl-var-list');
      list.innerHTML = '';

      const cleanup = () => {
        variantPopup.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        variantPopup.removeEventListener('click', onBackdrop);
      };
      const onBackdrop = (e) => {
        if (e.target === variantPopup) {
          cleanup();
          resolve(null);
        }
      };

      let buttons = [];
      variants.forEach((v, i) => {
        const btn = document.createElement('button');
        btn.className = 'm3u8dl-var-btn';
        btn.setAttribute('role', 'button');
        const parts = [
          v.resolution,
          v.bandwidth ? `${Math.round(v.bandwidth / 1000)} kbps` : null,
          v.codecs
        ].filter(Boolean);
        btn.textContent = parts.length ? parts.join(' • ') : `Variant ${i + 1}`;
        btn.onclick = () => {
          cleanup();
          resolve(v);
        };
        list.appendChild(btn);
        buttons.push(btn);
      });

      let selectedIndex = 0;
      if (buttons[0]) buttons[0].focus();

      const onKey = (e) => {
        if (!buttons.length) return;
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % buttons.length;
          buttons[selectedIndex].focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
          buttons[selectedIndex].focus();
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          buttons[selectedIndex].click();
        }
      };

      variantPopup.classList.add('show');
      variantPopup.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  // Helpers
  const isMaster = (txt) => /#EXT-X-STREAM-INF/i.test(txt);
  const isMedia = (txt) => /#EXTINF:/i.test(txt) || /#EXT-X-TARGETDURATION:/i.test(txt);
  const sanitize = (s) => (s || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120).trim() || 'video';
  const toAbs = (url, base) => { try { return new URL(url, base).href; } catch { return url; } };

  function parseAttrs(str) {
    const attrs = {};
    const re = /([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/gi;
    let m;
    while ((m = re.exec(str))) attrs[m[1].toUpperCase()] = m[2] !== undefined ? m[2] : m[3];
    return attrs;
  }

  function parseByteRange(str, lastEndExclusive = 0) {
    if (!str) return null;
    const [lenPart, offPart] = String(str).split('@');
    const len = parseInt(lenPart, 10);
    const hasOffset = offPart !== undefined && offPart !== '';
    const start = hasOffset ? parseInt(offPart, 10) : lastEndExclusive;
    const endInclusive = start + len - 1;
    const nextStart = start + len;
    return { len, start, endInclusive, nextStart };
  }

  function parseMaster(text, base) {
    const lines = text.split(/\r?\n/);
    const variants = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;
      const attrs = parseAttrs(line.slice(18));
      let url = null;
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next || next.startsWith('#')) continue;
        url = toAbs(next, base);
        break;
      }
      if (url) {
        const res = attrs.RESOLUTION || '';
        const [w, h] = res ? res.split('x').map(n => parseInt(n, 10)) : [null, null];
        variants.push({
          url,
          bandwidth: attrs.BANDWIDTH ? parseInt(attrs.BANDWIDTH, 10) : (attrs['AVERAGE-BANDWIDTH'] ? parseInt(attrs['AVERAGE-BANDWIDTH'], 10) : null),
          resolution: res || null,
          width: w, height: h,
          codecs: attrs.CODECS || null
        });
      }
    }
    return variants;
  }

  // Parse media, capturing per-segment key/map to support rotation
  function parseMedia(text, base) {
    const lines = text.split(/\r?\n/);
    const segments = [];
    let currentKey = { method: 'NONE', uri: null, iv: null };
    let currentMap = null;
    let mediaSeq = 0;

    let pendingDuration = 0;
    let pendingByteRange = null;
    let lastRangeNextStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
        mediaSeq = parseInt(line.split(':')[1], 10) || 0;
      } else if (line.startsWith('#EXT-X-KEY:')) {
        const attrs = parseAttrs(line.slice(11));
        currentKey = {
          method: (attrs.METHOD || 'NONE').toUpperCase(),
          uri: attrs.URI ? toAbs(attrs.URI, base) : null,
          iv: attrs.IV || null
        };
      } else if (line.startsWith('#EXT-X-MAP:')) {
        const attrs = parseAttrs(line.slice(11));
        if (attrs.URI) {
          let rangeHeader = null;
          if (attrs.BYTERANGE) {
            const br = parseByteRange(attrs.BYTERANGE, 0);
            if (br) rangeHeader = `bytes=${br.start}-${br.endInclusive}`;
          }
          currentMap = { uri: toAbs(attrs.URI, base), rangeHeader };
        }
      } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
        pendingByteRange = parseByteRange(line.split(':')[1], lastRangeNextStart);
      } else if (line.startsWith('#EXTINF:')) {
        pendingDuration = parseFloat(line.split(':')[1]) || 0;
      } else if (!line.startsWith('#')) {
        let rangeHeader = null;
        if (pendingByteRange) {
          rangeHeader = `bytes=${pendingByteRange.start}-${pendingByteRange.endInclusive}`;
          lastRangeNextStart = pendingByteRange.nextStart;
        } else {
          lastRangeNextStart = 0;
        }
        segments.push({
          uri: toAbs(line, base),
          duration: pendingDuration,
          rangeHeader,
          key: currentKey && currentKey.method !== 'NONE' ? { ...currentKey } : null,
          map: currentMap ? { ...currentMap } : null
        });
        pendingDuration = 0;
        pendingByteRange = null;
      }
    }

    // Mark where init-map must be injected
    let lastMapKey = null;
    for (let i = 0; i < segments.length; i++) {
      const m = segments[i].map;
      const mapKey = m ? `${m.uri}|${m.rangeHeader || ''}` : null;
      segments[i].needsMap = !!(mapKey && mapKey !== lastMapKey);
      if (mapKey) lastMapKey = mapKey;
    }

    return { segments, mediaSeq };
  }

  // Crypto helpers
  function hexToU8(hex) {
    hex = String(hex || '').replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
    if (hex.length % 2) hex = '0' + hex;
    const arr = new Uint8Array(hex.length / 2);
    for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    return arr;
  }
  function ivFromSeq(seq) {
    const iv = new Uint8Array(16);
    new DataView(iv.buffer).setUint32(12, seq >>> 0, false);
    return iv;
  }
  async function decryptAesCbc(data, keyBytes, iv) {
    const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
    return crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, data);
  }

  // Network
  function gmRequest({ url, responseType = 'text', headers = {}, timeout = REQ_TIMEOUT, onprogress }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url, headers, timeout, responseType,
        onprogress: onprogress ? (e) => onprogress(e) : undefined,
        onload: r => (r.status >= 200 && r.status < 300) ? resolve(r.response) : reject(new Error(`HTTP ${r.status}`)),
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout'))
      });
    });
  }
  const getText = (url) => gmRequest({ url, responseType: 'text', timeout: MANIFEST_TIMEOUT });
  const getBuffer = (url, headers = {}, timeout = REQ_TIMEOUT, onprogress) =>
    gmRequest({ url, responseType: 'arraybuffer', headers, timeout, onprogress });

  // Detection
  function detected(url) {
    if (typeof url !== 'string') return;
    if (!/^https?:/i.test(url)) return;
    // Fix: allow plain ".m3u8" endings
    if (!/\.m3u8(\b|[\?#]|$)/i.test(url)) return;
    if (state.manifests.has(url)) return;

    state.latestM3U8 = url;
    state.manifests.add(url);
    // Cap memory
    if (state.manifests.size > MAX_MANIFESTS) {
      const first = state.manifests.values().next().value;
      state.manifests.delete(first);
    }

    mountUI();
    floatingBtn.classList.add('show', 'detected');
    setTimeout(() => floatingBtn.classList.remove('detected'), 500);
    floatingBtn.stopIdle();
    floatingBtn.startIdleTimer();
    attachButtons();
    log('Detected:', url);
  }

  // Hooks
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    try { detected(typeof input === 'string' ? input : input?.url); } catch {}
    return _fetch.apply(this, arguments);
  };
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { detected(url); } catch {}
    return _open.apply(this, arguments);
  };
  try {
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) detected(e.name);
    });
    po.observe({ entryTypes: ['resource'] });
  } catch {}

  // Attach to Video.js (debounced to reduce observer churn)
  function attachButtons() {
    document.querySelectorAll('.video-js .vjs-control-bar').forEach(bar => {
      if (bar.querySelector('.m3u8dl-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'vjs-control vjs-button m3u8dl-btn';
      btn.title = 'Download M3U8';
      btn.setAttribute('aria-label', 'Download HLS stream');
      btn.innerHTML = DOWNLOAD_ICON_SVG;
      btn.onclick = (e) => {
        e.stopPropagation();
        floatingBtn.stopIdle();
        floatingBtn.startIdleTimer();
        startDownload({ showVariantPicker: e.altKey });
      };
      bar.appendChild(btn);
    });
  }
  let attachDebounce;
  const mo = new MutationObserver(() => {
    clearTimeout(attachDebounce);
    attachDebounce = setTimeout(attachButtons, 250);
  });
  document.addEventListener('DOMContentLoaded', () => {
    mountUI();
    mo.observe(document.documentElement, { childList: true, subtree: true });
  });
  window.addEventListener('beforeunload', () => {
    try { floatingBtn.cleanup?.(); } catch {}
  });

  // Download flow
  async function startDownload(opts = {}) {
    mountUI();
    try {
      if (!state.latestM3U8) {
        alert('No m3u8 detected. Play the video, then try again.');
        return;
      }

      // Loading feedback
      const oldOpacity = floatingBtn.style.opacity;
      floatingBtn.style.opacity = '0.55';

      const url = state.latestM3U8;
      log('Downloading:', url);
      const masterTxt = await getText(url);

      let mediaUrl = url;
      let variant = null;

      if (isMaster(masterTxt)) {
        const vars = parseMaster(masterTxt, url);
        if (!vars.length) throw new Error('No variants found');
        vars.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bandwidth || 0) - (a.bandwidth || 0));
        variant = opts.showVariantPicker ? await showVariantPicker(vars) : vars[0];
        if (!variant) return; // canceled
        mediaUrl = variant.url;
        if (!opts.showVariantPicker) {
          const pick = variant.resolution || `${Math.round((variant.bandwidth || 0) / 1000)} kbps`;
          log('Auto-selected variant:', pick);
        }
      } else if (!isMedia(masterTxt)) {
        throw new Error('Invalid playlist');
      }

      const mediaTxt = isMedia(masterTxt) ? masterTxt : await getText(mediaUrl);
      const parsed = parseMedia(mediaTxt, mediaUrl);
      if (!parsed.segments.length) throw new Error('No segments found');

      const isFmp4 = parsed.segments.some(s => s.map) || /\.m4s(\?|$)/i.test(parsed.segments[0].uri);
      const ext = isFmp4 ? 'mp4' : 'ts';
      const name = sanitize(document.title);
      const qual = variant?.resolution ? `_${variant.resolution}` : '';
      const filename = `${name}${qual}.${ext}`;

      await download(parsed, filename, ext, isFmp4, url);
      // restore button
      floatingBtn.style.opacity = oldOpacity || '1';
    } catch (e) {
      floatingBtn.style.opacity = '1';
      err(e);
      alert(`Error: ${e.message || e}`);
    }
  }

  async function download(parsed, filename, ext, isFmp4, sourceUrl) {
    const { segments, mediaSeq } = parsed;
    const total = segments.length;

    let stopped = false;
    let cancelled = false;

    const card = createProgressCard(
      filename,
      sourceUrl,
      () => { stopped = !stopped; card.setStopped(stopped); if (!stopped) schedule(); else abortAll({ resetQueued: true }); },
      () => { cancelled = true; abortAll({ resetQueued: false }); finalize(false); }
    );

    // Caches for keys and init maps
    const keyCache = new Map();            // keyUri -> Uint8Array
    const keyPending = new Map();          // keyUri -> Promise<Uint8Array>
    const mapCache = new Map();            // mapKey (uri|range) -> Uint8Array

    const active = new Map();              // index -> reqHandle
    const pending = new Map();             // index -> Uint8Array
    const progress = new Map();            // index -> { loaded, size }
    const attempts = new Uint8Array(total);// segment retries
    const status = new Int8Array(total);   // 0=not started,1=downloading,2=done,-1=failed
    let nextWrite = 0, nextIndex = 0, doneCount = 0;
    let bytesCompleted = 0, avgSegSize = 0;

    // Stats & throttled draw
    let lastUpdate = Date.now();
    let lastBytes = 0;
    let drawScheduled = false;
    function scheduleDraw() {
      if (drawScheduled) return;
      drawScheduled = true;
      requestAnimationFrame(() => {
        drawScheduled = false;
        draw();
      });
    }
    function draw() {
      let partial = 0;
      progress.forEach(({ loaded, size }) => {
        if (size > 0) partial += Math.min(1, loaded / size);
        else if (avgSegSize > 0) partial += Math.min(1, loaded / avgSegSize);
      });
      const pct = ((doneCount + partial) / total) * 100;

      const now = Date.now();
      const deltaMs = Math.max(1, now - lastUpdate);
      const speed = ((bytesCompleted - lastBytes) / deltaMs) * 1000; // bytes/sec
      const speedMB = (speed / 1024 / 1024);
      lastUpdate = now;
      lastBytes = bytesCompleted;

      const extra = `(${doneCount}/${total}) ${speedMB.toFixed(2)} MB/s`;
      card.update(pct, extra);
    }

    function shouldAbort() {
      return cancelled || stopped;
    }

    function abortAll({ resetQueued = false } = {}) {
      const toReset = [];
      active.forEach((req, i) => {
        try { req.abort?.(); } catch {}
        toReset.push(i);
      });
      active.clear();
      for (const i of toReset) {
        progress.delete(i);
        if (resetQueued && status[i] === 1) status[i] = 0; // allow re-scheduling on resume
      }
    }

    async function writeOrdered() {
      while (pending.has(nextWrite)) {
        const data = pending.get(nextWrite);
        pending.delete(nextWrite++);
        if (useFS) {
          await writable.write(data);
        } else {
          chunks.push(data);
        }
      }
    }

    async function getKeyBytes(seg) {
      if (!seg.key || seg.key.method !== 'AES-128' || !seg.key.uri) return null;
      const uri = seg.key.uri;
      if (keyCache.has(uri)) return keyCache.get(uri);
      if (!keyPending.has(uri)) {
        keyPending.set(uri, (async () => {
          log('Fetching key:', uri);
          const buf = await getBuffer(uri);
          const k = new Uint8Array(buf);
          keyCache.set(uri, k);
          keyPending.delete(uri);
          return k;
        })());
      }
      return keyPending.get(uri);
    }

    async function getMapBytes(seg) {
      if (!seg.needsMap || !seg.map?.uri) return null;
      const key = `${seg.map.uri}|${seg.map.rangeHeader || ''}`;
      if (mapCache.has(key)) return mapCache.get(key);
      log('Init segment:', seg.map.uri);
      const headers = seg.map.rangeHeader ? { Range: seg.map.rangeHeader } : {};
      const buf = new Uint8Array(await getBuffer(seg.map.uri, headers));
      mapCache.set(key, buf);
      return buf;
    }

    async function handleLoad(i, response) {
      if (shouldAbort()) return;
      active.delete(i);
      progress.delete(i);

      const seg = segments[i];
      let data = response;

      // Decrypt if necessary
      const keyBytes = await getKeyBytes(seg);
      if (keyBytes) {
        const iv = seg.key.iv ? hexToU8(seg.key.iv) : ivFromSeq(mediaSeq + i);
        data = await decryptAesCbc(data, keyBytes, iv);
      }
      let u8 = new Uint8Array(data);

      // Prepend init map if needed
      if (seg.needsMap) {
        const mapBytes = await getMapBytes(seg);
        if (mapBytes && mapBytes.length) {
          const combined = new Uint8Array(mapBytes.length + u8.length);
          combined.set(mapBytes, 0);
          combined.set(u8, mapBytes.length);
          u8 = combined;
        }
      }

      pending.set(i, u8);
      status[i] = 2;
      doneCount++;
      bytesCompleted += u8.length;
      avgSegSize = bytesCompleted / Math.max(1, doneCount);

      await writeOrdered();
      scheduleDraw();
      schedule();
      checkFinalize();
    }

    function handleFail(i, why) {
      active.delete(i);
      progress.delete(i);
      if (shouldAbort()) return; // paused/stopped or cancelled; do not change status/attempts
      const a = attempts[i] + 1;
      attempts[i] = a;
      if (a > MAX_RETRIES) {
        status[i] = -1;
        err(`Segment ${i} failed permanently after ${MAX_RETRIES} attempts (${why})`);
      } else {
        status[i] = 0; // ready to retry
      }
      schedule();
      checkFinalize();
    }

    function checkFinalize() {
      if (doneCount === total) {
        finalize(true);
      } else if (!active.size && !stopped && !cancelled) {
        const failed = status.some(v => v === -1);
        if (failed) finalize(false);
      }
    }

    function schedule() {
      if (shouldAbort()) return;
      // Fill pipeline
      while (active.size < CONCURRENCY) {
        // Prefer retries first
        let i = -1;
        for (let j = 0; j < total; j++) {
          if (status[j] === 0 && attempts[j] > 0) { i = j; break; }
        }
        // Otherwise pick next new
        if (i === -1) {
          while (nextIndex < total && status[nextIndex] !== 0) nextIndex++;
          if (nextIndex < total) i = nextIndex++;
        }
        if (i === -1) break; // nothing to schedule
        downloadSeg(i);
      }
    }

    function downloadSeg(i) {
      if (shouldAbort()) return;
      const seg = segments[i];
      status[i] = 1;

      const headers = seg.rangeHeader ? { Range: seg.rangeHeader } : {};
      const req = GM_xmlhttpRequest({
        method: 'GET',
        url: seg.uri,
        headers,
        responseType: 'arraybuffer',
        timeout: REQ_TIMEOUT,
        onprogress: (p) => {
          if (p && typeof p.loaded === 'number') {
            progress.set(i, { loaded: p.loaded, size: p.total || 0 });
            scheduleDraw();
          }
        },
        onload: (r) => {
          if (r.status >= 200 && r.status < 300) {
            handleLoad(i, r.response).catch(e => handleFail(i, e.message || 'decrypt/map error'));
          } else {
            handleFail(i, `HTTP ${r.status}`);
          }
        },
        onerror: () => handleFail(i, 'network'),
        ontimeout: () => handleFail(i, 'timeout')
      });
      active.set(i, req);
    }

    // Output sink
    let writable = null;
    let useFS = false;
    const chunks = [];

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: `${ext.toUpperCase()} Video`, accept: { 'video/*': [`.${ext}`] } }]
        });
        writable = await handle.createWritable();
        useFS = true;
        log('Using File System Access API');
      } catch {
        // user canceled picker; fall back to blob
      }
    }

    async function finalize(ok) {
      try {
        if (ok) {
          if (useFS) {
            await writable.close();
            log('Saved via File System API');
          } else {
            const blob = new Blob(chunks, { type: isFmp4 ? 'video/mp4' : 'video/mp2t' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            log('Downloaded via Blob');
          }
          card.update(100, '(done)');
          card.done(true);
        } else {
          if (useFS) {
            try { await writable.truncate(0); } catch {}
            try { await writable.close(); } catch {}
          }
          card.done(false);
        }
      } catch (e) {
        err('Finalize error:', e);
        card.done(false);
      } finally {
        abortAll();
      }
    }

    // Kickoff
    schedule();
  }

  // Mount at start
  mountUI();
})();