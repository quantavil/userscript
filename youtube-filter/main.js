// ==UserScript==
// @name         YouTube Video Filter (Home + Search, optimized)
// @namespace    https://github.com/quantavil
// @version      2.0
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
      position: fixed; top: 84px; right: 20px; z-index: 10001;
      background:#065fd4; color:#fff; border:none; border-radius:20px;
      padding:10px 16px; cursor:pointer; font:600 14px/1 Roboto,Arial,sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.3); transition:.2s;
    }
    #yt-filter-toggle:hover { background:#0c7cd5; transform:scale(1.04); }
    #yt-filter-panel {
      position: fixed; top: 128px; right: 20px; z-index: 10000;
      width: 320px; max-height: 80vh; overflow:auto;
      background:#212121; color:#fff; border:1px solid #3f3f3f; border-radius:12px;
      box-shadow:0 4px 24px rgba(0,0,0,.7); padding:16px; opacity:0; visibility:hidden; transform:translateY(-8px);
      transition:opacity .2s, transform .2s, visibility .2s;
      font: 13px/1.4 Roboto,Arial,sans-serif;
    }
    #yt-filter-panel.visible { opacity:1; visibility:visible; transform:translateY(0); }
    #yt-filter-panel h3 {
      margin:0 0 12px; font:500 18px/1.2 Roboto,Arial,sans-serif;
      display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #3f3f3f; padding-bottom:8px;
    }
    .ytf-close { cursor:pointer; font-size:22px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%; }
    .ytf-close:hover { background:#3f3f3f; }
    .ytf-group { margin-bottom:14px; }
    .ytf-group label { display:block; margin-bottom:6px; color:#bbb; }
    .ytf-row { display:flex; gap:8px; }
    .ytf-input { flex:1; padding:8px 10px; border-radius:6px; border:1px solid #5f5f5f; background:#3f3f3f; color:#fff; }
    .ytf-actions { display:flex; gap:8px; margin-top:8px; }
    .ytf-btn {
      flex:1; padding:10px; border-radius:8px; border:1px solid #3f3f3f; background:#3f3f3f; color:#fff; cursor:pointer;
    }
    .ytf-btn.primary { background:#065fd4; border: none; }
    .ytf-btn.primary.active { background:#00c853; }
    .ytf-stats { margin-top:10px; padding:10px; background:#2a2a2a; border-radius:6px; color:#aaa; text-align:center; }
    .ytf-hidden { display:none !important; }
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
    // Handles 1.2K / 3.4M / 2B; fallbacks for plain numbers
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
    if (/^live$/i.test(t)) return 0; // treat LIVE as no duration
    const parts = t.split(':').map(x => parseInt(x, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number.isFinite(parts[0]) ? parts[0] : 0;
  };

  const isShorts = (host) => {
    if (qs(host, 'a[href*="/shorts/"]')) return true;
    if (qs(host, '[is-shorts], [href^="/shorts/"]')) return true;
    return false;
  };

  // Extract meta that works for Home and Search UIs
  const getVideoMeta = (host) => {
    // 1) Search / classic: metadata-line spans
    const metaLineSpans = qsa(host, '#metadata-line span, .inline-metadata-item');
    // 2) New Home: content metadata view model rows
    const cmvSpans = qsa(host, '.yt-content-metadata-view-model__metadata-row span');

    const allSpans = [...metaLineSpans, ...cmvSpans];

    const viewsTxt = byText(allSpans, t => /view/i.test(t) && !/watching/i.test(t));
    const timeTxt = byText(allSpans, t => /(ago|streamed)/i.test(t));

    // Duration badges: classic time status + new badge-shape text
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

  // Debounced scheduler to avoid thrashing during lazy loads
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

    const btn = document.createElement('button');
    btn.id = 'yt-filter-toggle';
    btn.textContent = '🔍 Filters';
    btn.addEventListener('click', () => panel.classList.toggle('visible'));
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'yt-filter-panel';

    const h = document.createElement('h3');
    h.textContent = 'Video Filters';
    const close = document.createElement('span');
    close.className = 'ytf-close';
    close.title = 'Close';
    close.textContent = '×';
    close.addEventListener('click', () => panel.classList.remove('visible'));
    h.appendChild(close);
    panel.appendChild(h);

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
    const iNum = (id, ph) => {
      const i = document.createElement('input');
      i.className = 'ytf-input';
      i.id = id; i.placeholder = ph; i.type = 'number';
      return i;
    };

    const minViews = iText('minViews', 'Min (e.g., 10K)');
    const maxViews = iText('maxViews', 'Max (e.g., 10M)');
    const minDays = iNum('minDays', 'Min days (0)');
    const maxDays = iNum('maxDays', 'Max days (365)');
    const minDur  = iNum('minDuration', 'Min sec (0)');
    const maxDur  = iNum('maxDuration', 'Max sec (3600)');

    // hydrate inputs from state
    const setVal = (el, v) => { el.value = (v === Infinity || v === 0) ? '' : String(v); };
    setVal(minViews, filters.minViews);
    setVal(maxViews, filters.maxViews);
    setVal(minDays, filters.minDays);
    setVal(maxDays, filters.maxDays);
    setVal(minDur,  filters.minDuration);
    setVal(maxDur,  filters.maxDuration);

    panel.appendChild(group('Views', [minViews, maxViews]));
    panel.appendChild(group('Age (days ago)', [minDays, maxDays]));
    panel.appendChild(group('Duration (sec)', [minDur, maxDur]));

    const actions = document.createElement('div');
    actions.className = 'ytf-actions';

    const apply = document.createElement('button');
    apply.className = 'ytf-btn primary';
    apply.id = 'ytf-apply';
    apply.textContent = 'Apply';
    apply.addEventListener('click', () => {
      const toNum = (v, def) => {
        if (v === '' || v == null) return def;
        if (v.toString().match(/^[\d.]+\s*[KMB]$/i)) return parseNumberWithSuffix(v);
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : def;
      };
      filters.minViews    = toNum(minViews.value.trim(), 0);
      filters.maxViews    = toNum(maxViews.value.trim(), Infinity);
      filters.minDays     = toNum(minDays.value.trim(), 0);
      filters.maxDays     = toNum(maxDays.value.trim(), Infinity);
      filters.minDuration = toNum(minDur.value.trim(), 0);
      filters.maxDuration = toNum(maxDur.value.trim(), Infinity);
      filters.enabled = !filters.enabled;
      apply.classList.toggle('active', filters.enabled);
      apply.textContent = filters.enabled ? 'Disable filter' : 'Apply';
      persist();
      scheduleApply();
    });

    const reset = document.createElement('button');
    reset.className = 'ytf-btn';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      [minViews, maxViews, minDays, maxDays, minDur, maxDur].forEach(i => i.value = '');
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
    clear.textContent = 'Clear all';
    clear.addEventListener('click', () => {
      [minViews, maxViews, minDays, maxDays, minDur, maxDur].forEach(i => i.value = '');
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

    // Mutations during lazy loads
    const mo = new MutationObserver(() => scheduleApply());
    mo.observe(root, { childList: true, subtree: true });

    // Reapply on SPA route changes
    window.addEventListener('yt-navigate-start', () => scheduleApply(), true);
    window.addEventListener('yt-navigate-finish', () => {
      // Delay a tick to let grid hydrate
      requestAnimationFrame(() => scheduleApply());
    }, true);

    // Fallbacks
    window.addEventListener('load', () => scheduleApply(), true);
    window.addEventListener('popstate', () => scheduleApply(), true);
    window.addEventListener('hashchange', () => scheduleApply(), true);
  };

  // ---------- Init ----------
  const init = () => {
    load();
    createUI();
    attachObservers();
    // initial pass after a short delay to let initial paint finish
    setTimeout(scheduleApply, 600);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
