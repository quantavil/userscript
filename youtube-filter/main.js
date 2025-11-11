// ==UserScript==
// @name         YouTube Video Filter (Home + Search, optimized)
// @namespace    https://github.com/quantavil
// @version      2.1
// @description  Filter YouTube videos by views, age, and duration on Home/Search; ignores Shorts; optimized for SPA navigation
// @author       You
// @match        https://www.youtube.com/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  // ---------- Config/state ----------
  const filters = {
    minViews: 0,
    maxViews: Infinity,
    minDays: 0,
    maxDays: Infinity,
    minDuration: 0,
    maxDuration: Infinity,
    enabled: false,
  };

  const STORAGE_KEY = 'ytVideoFilter:v2';
  const VIDEO_HOST_SELECTORS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
  ];

  // ---------- Styles ----------
  GM_addStyle(`
    #yt-filter-toggle {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%) translateX(42px);
      z-index: 10001;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 8px 0 0 8px;
      padding: 16px 10px;
      cursor: pointer;
      font: 400 20px/1 Arial, sans-serif;
      box-shadow: -2px 0 12px rgba(0,0,0,.4);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s;
      writing-mode: vertical-rl;
      letter-spacing: 1px;
    }
    #yt-filter-toggle:hover {
      transform: translateY(-50%) translateX(0);
      background: #1a1a1a;
    }
    #yt-filter-toggle.active {
      transform: translateY(-50%) translateX(0);
      background: #1a1a1a;
      z-index: 9999;
    }
    #yt-filter-toggle::before {
      content: '⚙';
      font-size: 18px;
      display: block;
      margin-bottom: 8px;
      writing-mode: horizontal-tb;
    }
    
    #yt-filter-panel {
      position: fixed;
      top: 50%;
      right: -340px;
      transform: translateY(-50%);
      z-index: 10000;
      width: 320px;
      max-height: 85vh;
      overflow-y: auto;
      overflow-x: hidden;
      background: #0f0f0f;
      color: #fff;
      border: 1px solid #2a2a2a;
      border-right: none;
      border-radius: 12px 0 0 12px;
      box-shadow: -4px 0 24px rgba(0,0,0,.8);
      padding: 20px;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font: 13px/1.4 Roboto, Arial, sans-serif;
    }
    #yt-filter-panel.visible {
      right: 0;
    }
    #yt-filter-panel::-webkit-scrollbar {
      width: 8px;
    }
    #yt-filter-panel::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    #yt-filter-panel::-webkit-scrollbar-thumb {
      background: #3a3a3a;
      border-radius: 4px;
    }
    #yt-filter-panel::-webkit-scrollbar-thumb:hover {
      background: #4a4a4a;
    }
    
    #yt-filter-panel h3 {
      margin: 0 0 16px;
      font: 500 18px/1.2 Roboto, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #2a2a2a;
      padding-bottom: 12px;
    }
    .ytf-close {
      cursor: pointer;
      font-size: 24px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }
    .ytf-close:hover {
      background: #2a2a2a;
    }
    
    .ytf-group {
      margin-bottom: 16px;
    }
    .ytf-group label {
      display: block;
      margin-bottom: 8px;
      color: #aaa;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ytf-row {
      display: flex;
      gap: 8px;
      position: relative;
      z-index: 1;
    }
    .ytf-input {
      flex: 1;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #2a2a2a;
      background: #1a1a1a;
      color: #fff;
      font-size: 13px;
      transition: border-color 0.2s;
      position: relative;
      z-index: 2;
    }
    .ytf-input:focus {
      outline: none;
      border-color: #3ea6ff;
      z-index: 3;
    }
    .ytf-input::placeholder {
      color: #666;
    }
    /* Date input styling */
    .ytf-input[type="date"] {
      position: relative;
      z-index: 2;
    }
    .ytf-input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1);
      cursor: pointer;
      position: relative;
      z-index: 3;
    }
    
    .ytf-actions {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
    .ytf-btn {
      flex: 1;
      padding: 11px;
      border-radius: 8px;
      border: 1px solid #2a2a2a;
      background: #1a1a1a;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .ytf-btn:hover {
      background: #2a2a2a;
      transform: translateY(-1px);
    }
    .ytf-btn.primary {
      background: #3ea6ff;
      border: none;
      color: #000;
    }
    .ytf-btn.primary:hover {
      background: #4db8ff;
    }
    .ytf-btn.primary.active {
      background: #00c853;
    }
    .ytf-btn.primary.active:hover {
      background: #00e676;
    }
    
    .ytf-stats {
      margin-top: 16px;
      padding: 12px;
      background: #1a1a1a;
      border-radius: 6px;
      border: 1px solid #2a2a2a;
      color: #aaa;
      text-align: center;
      font-size: 12px;
    }
    .ytf-hidden {
      display: none !important;
    }
  `);

  // ---------- Utilities ----------
  const qs = (root, sel) => root.querySelector(sel);
  const qsa = (root, sel) => root.querySelectorAll(sel);
  const byText = (nodes, pred) => {
    for (const n of nodes) {
      const t = (n.textContent || '').trim();
      if (t && pred(t)) return t;
    }
    return '';
  };

  const parseNumberWithSuffix = (txt) => {
    const m = (txt || '').replace(/[, ]/g, '').match(/([\d.]+)\s*([KMB])?/i);
    if (!m) {
      const num = parseInt((txt || '').replace(/[^\d]/g, ''), 10);
      return Number.isFinite(num) ? num : 0;
    }
    let n = parseFloat(m[1]) || 0;
    const s = (m[2] || '').toUpperCase();
    if (s === 'K') n *= 1e3;
    else if (s === 'M') n *= 1e6;
    else if (s === 'B') n *= 1e9;
    return Math.floor(n);
  };

  const parseViews = (txt) => parseNumberWithSuffix((txt || '').replace(/views?/i, '').trim());
  
  const parseDaysAgo = (txt) => {
    if (!txt) return Infinity;
    const s = txt.toLowerCase().replace('streamed', '').trim();
    const m = s.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?/);
    if (!m) return Infinity;
    const v = parseInt(m[1], 10);
    const unit = m[2];
    const mult = {
      second: 1 / (24 * 3600),
      minute: 1 / (24 * 60),
      hour: 1 / 24,
      day: 1,
      week: 7,
      month: 30,
      year: 365,
    }[unit] || 1;
    return v * mult;
  };

  const parseDuration = (txt) => {
    if (!txt) return 0;
    const t = txt.trim();
    if (/^live$/i.test(t)) return 0;
    const parts = t.split(':').map(x => parseInt(x, 10) || 0);
    let seconds = 0;
    if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    else seconds = Number.isFinite(parts[0]) ? parts[0] : 0;
    // Convert to minutes
    return Math.round(seconds / 60);
  };

  // Date utility functions
  const daysAgoToDate = (days) => {
    if (!Number.isFinite(days) || days === Infinity) return '';
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(days));
    return d.toISOString().split('T')[0];
  };

  const dateToDaysAgo = (dateStr) => {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    return Math.floor(diff / (24 * 3600 * 1000));
  };

  const isShorts = (host) => {
    if (qs(host, 'a[href*="/shorts/"]')) return true;
    if (qs(host, '[is-shorts], [href^="/shorts/"]')) return true;
    return false;
  };

  const getVideoMeta = (host) => {
    const metaLineSpans = qsa(host, '#metadata-line span, .inline-metadata-item');
    const cmvSpans = qsa(host, '.yt-content-metadata-view-model__metadata-row span');
    const allSpans = [...metaLineSpans, ...cmvSpans];

    const viewsTxt = byText(allSpans, t => /view/i.test(t) && !/watching/i.test(t));
    const timeTxt = byText(allSpans, t => /(ago|streamed)/i.test(t));

    const durationTxt =
      (qs(host, 'ytd-thumbnail-overlay-time-status-renderer #text')?.textContent || '').trim() ||
      (qs(host, '.yt-thumbnail-overlay-badge-view-model .yt-badge-shape__text')?.textContent || '').trim();

    return {
      views: parseViews(viewsTxt),
      daysAgo: parseDaysAgo(timeTxt),
      duration: parseDuration(durationTxt),
    };
  };

  // ---------- Filtering ----------
  const matches = (host) => {
    if (!filters.enabled) return true;
    if (isShorts(host)) return false;

    const { views, daysAgo, duration } = getVideoMeta(host);

    if (views < filters.minViews || views > filters.maxViews) return false;
    if (daysAgo < filters.minDays || daysAgo > filters.maxDays) return false;
    if (duration > 0 && (duration < filters.minDuration || duration > filters.maxDuration)) return false;

    return true;
  };

  const applyToAll = () => {
    const nodes = document.querySelectorAll(VIDEO_HOST_SELECTORS.join(','));
    let total = 0, hidden = 0;
    for (const host of nodes) {
      total++;
      if (matches(host)) {
        host.classList.remove('ytf-hidden');
      } else {
        host.classList.add('ytf-hidden');
        hidden++;
      }
    }
    const stats = document.getElementById('ytf-stats');
    if (stats) {
      if (filters.enabled) {
        stats.textContent = `Showing ${total - hidden} of ${total} videos`;
      } else {
        stats.textContent = `Filter disabled`;
      }
    }
  };

  let raf = 0;
  const scheduleApply = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      applyToAll();
      raf = 0;
    });
  };

  // ---------- UI ----------
  const persist = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  };
  
  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.assign(filters, data || {});
    } catch {}
  };

  const createUI = () => {
    const oldBtn = document.getElementById('yt-filter-toggle');
    const oldPanel = document.getElementById('yt-filter-panel');
    if (oldBtn) oldBtn.remove();
    if (oldPanel) oldPanel.remove();

    // Toggle button
    const btn = document.createElement('button');
    btn.id = 'yt-filter-toggle';
    btn.textContent = 'FILTER';
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'yt-filter-panel';

    const h = document.createElement('h3');
    h.textContent = 'Video Filters';
    const close = document.createElement('span');
    close.className = 'ytf-close';
    close.title = 'Close';
    close.textContent = '×';
    close.addEventListener('click', () => {
      panel.classList.remove('visible');
      btn.classList.remove('active');
    });
    h.appendChild(close);
    panel.appendChild(h);

    // Toggle panel visibility
    btn.addEventListener('click', () => {
      const isVisible = panel.classList.toggle('visible');
      btn.classList.toggle('active', isVisible);
    });

    const group = (labelTxt, children) => {
      const g = document.createElement('div');
      g.className = 'ytf-group';
      const l = document.createElement('label');
      l.textContent = labelTxt;
      const row = document.createElement('div');
      row.className = 'ytf-row';
      children.forEach(c => row.appendChild(c));
      g.appendChild(l);
      g.appendChild(row);
      return g;
    };

    const iText = (id, ph) => {
      const i = document.createElement('input');
      i.className = 'ytf-input';
      i.id = id; i.placeholder = ph; i.type = 'text';
      return i;
    };
    
    const iDate = (id, ph) => {
      const i = document.createElement('input');
      i.className = 'ytf-input';
      i.id = id; i.placeholder = ph; i.type = 'date';
      return i;
    };
    
    const iNum = (id, ph) => {
      const i = document.createElement('input');
      i.className = 'ytf-input';
      i.id = id; i.placeholder = ph; i.type = 'number';
      return i;
    };

    const minViews = iText('minViews', 'Min (e.g., 10K)');
    const maxViews = iText('maxViews', 'Max (e.g., 10M)');
    const minDate = iDate('minDate', 'From');
    const maxDate = iDate('maxDate', 'To');
    const minDur  = iNum('minDuration', 'Min (mins)');
    const maxDur  = iNum('maxDuration', 'Max (mins)');

    // Hydrate inputs from state
    const setVal = (el, v) => { el.value = (v === Infinity || v === 0) ? '' : String(v); };
    setVal(minViews, filters.minViews);
    setVal(maxViews, filters.maxViews);
    minDate.value = daysAgoToDate(filters.maxDays); // max days = earliest date
    maxDate.value = daysAgoToDate(filters.minDays); // min days = latest date
    setVal(minDur,  filters.minDuration);
    setVal(maxDur,  filters.maxDuration);

    panel.appendChild(group('Views', [minViews, maxViews]));
    panel.appendChild(group('Date Range', [minDate, maxDate]));
    panel.appendChild(group('Duration (minutes)', [minDur, maxDur]));

    const actions = document.createElement('div');
    actions.className = 'ytf-actions';

    const apply = document.createElement('button');
    apply.className = 'ytf-btn primary';
    apply.id = 'ytf-apply';
    apply.textContent = filters.enabled ? 'Disable' : 'Apply';
    if (filters.enabled) apply.classList.add('active');
    
    apply.addEventListener('click', () => {
      const toNum = (v, def) => {
        if (v === '' || v == null) return def;
        if (v.toString().match(/^[\d.]+\s*[KMB]$/i)) return parseNumberWithSuffix(v);
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : def;
      };
      
      filters.minViews    = toNum(minViews.value.trim(), 0);
      filters.maxViews    = toNum(maxViews.value.trim(), Infinity);
      
      // Convert dates to days ago (swap min/max because earlier date = more days ago)
      const minDateVal = minDate.value.trim();
      const maxDateVal = maxDate.value.trim();
      filters.maxDays = minDateVal ? dateToDaysAgo(minDateVal) : Infinity;
      filters.minDays = maxDateVal ? dateToDaysAgo(maxDateVal) : 0;
      
      filters.minDuration = toNum(minDur.value.trim(), 0);
      filters.maxDuration = toNum(maxDur.value.trim(), Infinity);
      filters.enabled = !filters.enabled;
      
      apply.classList.toggle('active', filters.enabled);
      apply.textContent = filters.enabled ? 'Disable' : 'Apply';
      persist();
      scheduleApply();
    });

    const reset = document.createElement('button');
    reset.className = 'ytf-btn';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      [minViews, maxViews, minDate, maxDate, minDur, maxDur].forEach(i => i.value = '');
      if (filters.enabled) {
        filters.minViews = 0; filters.maxViews = Infinity;
        filters.minDays = 0; filters.maxDays = Infinity;
        filters.minDuration = 0; filters.maxDuration = Infinity;
        persist();
        scheduleApply();
      }
    });

    const clear = document.createElement('button');
    clear.className = 'ytf-btn';
    clear.textContent = 'Clear';
    clear.addEventListener('click', () => {
      [minViews, maxViews, minDate, maxDate, minDur, maxDur].forEach(i => i.value = '');
      if (filters.enabled) {
        filters.enabled = false;
        apply.classList.remove('active');
        apply.textContent = 'Apply';
        persist();
        scheduleApply();
      }
    });

    actions.appendChild(apply);
    actions.appendChild(reset);
    actions.appendChild(clear);
    panel.appendChild(actions);

    const stats = document.createElement('div');
    stats.className = 'ytf-stats';
    stats.id = 'ytf-stats';
    stats.textContent = filters.enabled ? 'Applying…' : 'Filter disabled';
    panel.appendChild(stats);

    document.body.appendChild(panel);
  };

  // ---------- Observers & navigation ----------
  const attachObservers = () => {
    const root = document.querySelector('ytd-app') || document.body;
    if (!root) return;

    const mo = new MutationObserver(() => scheduleApply());
    mo.observe(root, { childList: true, subtree: true });

    window.addEventListener('yt-navigate-start', () => scheduleApply(), true);
    window.addEventListener('yt-navigate-finish', () => {
      requestAnimationFrame(() => scheduleApply());
    }, true);

    window.addEventListener('load', () => scheduleApply(), true);
    window.addEventListener('popstate', () => scheduleApply(), true);
    window.addEventListener('hashchange', () => scheduleApply(), true);
  };

  // ---------- Init ----------
  const init = () => {
    load();
    createUI();
    attachObservers();
    setTimeout(scheduleApply, 600);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();