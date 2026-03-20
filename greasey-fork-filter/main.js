// ==UserScript==
// @name         Greasy Fork Filter
// @namespace    https://github.com/quantavil/userscript
// @version      1.4
// @description  Native Greasy Fork install filter sync + live keyword blocking
// @match        https://greasyfork.org/*/scripts*
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────────
  const FIELDS = {
    daily: { label: 'Daily installs', param: 'daily_installs', data: 'scriptDailyInstalls' },
    total: { label: 'Total installs', param: 'total_installs', data: 'scriptTotalInstalls' },
  };

  const DEFAULTS = { keywords: [] };
  for (const key of Object.keys(FIELDS)) {
    DEFAULTS[key] = 0;
    DEFAULTS[`${key}Op`] = 'gt';
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const validOp = v => v === 'gt' || v === 'lt';
  const toNum = v => Math.max(0, parseInt(v, 10) || 0);
  const cleanKeywords = list => [...new Set(
    (Array.isArray(list) ? list : [])
      .map(v => String(v).trim().toLowerCase())
      .filter(Boolean)
  )];

  const debounce = (fn, ms = 120) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const el = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'dataset' && v) Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'string') node.style.cssText = v;
      else if (k in node) node[k] = v;
      else node.setAttribute(k, v);
    }
    kids.flat().forEach(k => k != null && node.append(k));
    return node;
  };

  const toast = msg => {
    const t = el('div', { className: 'gf-toast', textContent: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 2000);
  };

  // ─── State ────────────────────────────────────────────────────────────────
  const S = { open: false };
  for (const [k, v] of Object.entries(DEFAULTS)) S[k] = GM_getValue(k, v);

  S.keywords = cleanKeywords(S.keywords);
  for (const key of Object.keys(FIELDS)) {
    S[key] = toNum(S[key]);
    S[`${key}Op`] = validOp(S[`${key}Op`]) ? S[`${key}Op`] : 'gt';
  }

  const save = (k, v) => {
    S[k] = v;
    GM_setValue(k, v);
  };

  const resetAll = () => {
    for (const [k, v] of Object.entries(DEFAULTS)) {
      save(k, Array.isArray(v) ? [] : v);
    }
  };

  const exportState = () =>
    Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, S[k]]));

  // If current URL has native GF filter params, reflect them into local state.
  (() => {
    const p = new URL(location.href).searchParams;
    for (const [key, field] of Object.entries(FIELDS)) {
      const value = p.get(field.param);
      const op = p.get(`${field.param}_operator`);
      if (value !== null && value !== '') save(key, toNum(value));
      if (validOp(op)) save(`${key}Op`, op);
    }
  })();

  // ─── CSS ──────────────────────────────────────────────────────────────────
  document.head.append(el('style', { textContent: `
    #gf-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 99999;
      width: 40px; height: 40px; border-radius: 10px;
      background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer; display: grid; place-items: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      transition: transform .18s, background .18s;
    }
    #gf-fab:hover { transform: scale(1.06); background: #2a2a2a; }
    #gf-fab.active { background: #111; }
    #gf-fab svg { color: #e0e0e0; display: block; pointer-events: none; }

    #gf-panel {
      position: fixed; bottom: 78px; right: 28px; z-index: 99999;
      width: 296px; background: #fff;
      border: 1px solid rgba(0,0,0,0.09); border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.05);
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      color: #1a1a1a; transform-origin: bottom right;
      transition: transform .22s cubic-bezier(.34,1.56,.64,1), opacity .16s;
    }
    #gf-panel.closed {
      transform: scale(0.86) translateY(10px);
      opacity: 0; pointer-events: none;
    }

    .gf-section { padding: 13px 15px; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .gf-section:last-child { border-bottom: none; }

    .gf-label {
      font-size: 10.5px; font-weight: 600;
      letter-spacing: .06em; text-transform: uppercase;
      color: #999; margin-bottom: 10px;
    }

    .gf-row {
      display: flex; align-items: center;
      justify-content: space-between; gap: 10px; margin-bottom: 8px;
    }
    .gf-row:last-child { margin-bottom: 0; }
    .gf-row-text { font-size: 13px; color: #3a3a3a; flex: 1; }

    .gf-control { display: flex; align-items: center; gap: 6px; }

    .gf-op-wrap { position: relative; }
    .gf-op-wrap::after {
      content: '▾';
      position: absolute; right: 9px; top: 50%;
      transform: translateY(-50%);
      pointer-events: none; color: #777; font-size: 10px;
    }

    .gf-op,
    .gf-num {
      height: 28px; border: 1px solid rgba(0,0,0,0.13);
      border-radius: 7px; background: #f5f5f7; color: #1a1a1a;
      font-size: 13px; outline: none;
      transition: border-color .15s, box-shadow .15s, background .15s;
      box-sizing: border-box;
    }

    .gf-op {
      width: 58px; padding: 0 25px 0 9px;
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      cursor: pointer;
    }

    .gf-num {
      width: 78px; padding: 0 9px; text-align: right;
      -moz-appearance: textfield;
    }
    .gf-num::-webkit-inner-spin-button { -webkit-appearance: none; }

    .gf-op:focus,
    .gf-num:focus,
    .gf-kw-input:focus {
      border-color: #888; box-shadow: 0 0 0 3px rgba(0,0,0,0.07);
    }

    .gf-note {
      margin-top: 10px; font-size: 11.5px; line-height: 1.45;
      color: #8a8a8a;
    }

    .gf-kw-row { display: flex; gap: 6px; margin-bottom: 9px; }
    .gf-kw-input {
      flex: 1; height: 28px; padding: 0 9px;
      border: 1px solid rgba(0,0,0,0.13); border-radius: 7px;
      background: #f5f5f7; color: #1a1a1a;
      font-size: 13px; outline: none;
      transition: border-color .15s, box-shadow .15s;
      box-sizing: border-box;
    }

    .gf-actions { display: flex; gap: 6px; flex-wrap: wrap; }

    .gf-btn {
      height: 28px; padding: 0 11px;
      border: 1px solid rgba(0,0,0,0.13); border-radius: 7px;
      background: #f5f5f7; color: #3a3a3a;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background .15s, border-color .15s, opacity .15s;
      white-space: nowrap;
    }
    .gf-btn:hover { background: #e5e5e7; border-color: rgba(0,0,0,0.2); }

    .gf-btn.primary {
      background: #1a1a1a; color: #f0f0f0;
      border-color: rgba(0,0,0,0.15);
    }
    .gf-btn.primary:hover { background: #333; }

    .gf-btn:disabled {
      background: #e5e5e7; color: #bbb;
      border-color: transparent; cursor: default;
    }

    .gf-tags { display: flex; flex-wrap: wrap; gap: 5px; min-height: 4px; }
    .gf-tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 6px 3px 9px; background: #ebebed; color: #2a2a2a;
      border-radius: 20px; font-size: 11.5px; font-weight: 500;
      animation: gf-pop .14s ease;
    }
    @keyframes gf-pop {
      from { transform: scale(0.72); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    .gf-tag-x {
      display: grid; place-items: center;
      width: 15px; height: 15px; border-radius: 50%;
      background: rgba(0,0,0,0.1); border: none;
      cursor: pointer; color: inherit;
      font-size: 11px; line-height: 1; padding: 0;
      transition: background .12s;
    }
    .gf-tag-x:hover { background: #e63946; color: #fff; }

    .gf-footer {
      padding: 9px 15px; display: flex;
      align-items: center; justify-content: space-between;
      gap: 12px;
    }
    .gf-stat { font-size: 12px; color: #999; }
    .gf-stat b { color: #1a1a1a; font-weight: 600; }

    .gf-clear {
      font-size: 12px; color: #e63946; background: none;
      border: none; cursor: pointer; padding: 0;
      opacity: .75; transition: opacity .12s;
      white-space: nowrap;
    }
    .gf-clear:hover { opacity: 1; }

    .gf-toast {
      position: fixed; bottom: 78px; right: 28px; z-index: 100000;
      padding: 8px 14px; border-radius: 8px;
      background: #1a1a1a; color: #f0f0f0;
      font: 12px/1 -apple-system, system-ui, sans-serif;
      pointer-events: none;
      animation: gf-toast-in .2s ease, gf-toast-out .25s ease 1.6s forwards;
    }
    @keyframes gf-toast-in  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
    @keyframes gf-toast-out { to   { opacity:0; transform:translateY(4px); } }

    @media (prefers-color-scheme: dark) {
      #gf-panel {
        background: #1c1c1e; border-color: rgba(255,255,255,0.09);
        color: #f0f0f2; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      }
      .gf-section      { border-bottom-color: rgba(255,255,255,0.06); }
      .gf-label        { color: #555; }
      .gf-row-text     { color: #bbb; }
      .gf-op-wrap::after { color: #777; }
      .gf-op,
      .gf-num,
      .gf-kw-input     { background: #2c2c2e; border-color: rgba(255,255,255,0.1); color: #f0f0f2; }
      .gf-op:focus,
      .gf-num:focus,
      .gf-kw-input:focus { border-color: #666; box-shadow: 0 0 0 3px rgba(255,255,255,0.06); }
      .gf-note         { color: #757575; }
      .gf-btn          { background: #2c2c2e; border-color: rgba(255,255,255,0.1); color: #bbb; }
      .gf-btn:hover    { background: #3a3a3c; }
      .gf-btn.primary  { background: #3a3a3c; border-color: rgba(255,255,255,0.08); color: #e0e0e0; }
      .gf-btn.primary:hover { background: #4a4a4c; }
      .gf-btn:disabled { background: #2c2c2e; color: #555; }
      .gf-tag          { background: #3a3a3c; color: #ddd; }
      .gf-tag-x        { background: rgba(255,255,255,0.1); }
      .gf-stat         { color: #555; }
      .gf-stat b       { color: #ccc; }
    }
  ` }));

  // ─── URL Sync ─────────────────────────────────────────────────────────────
  const buildUrl = () => {
    const url = new URL(location.href);
    const p = url.searchParams;

    p.delete('page');

    for (const [key, field] of Object.entries(FIELDS)) {
      const opKey = `${field.param}_operator`;
      if (S[key] > 0) {
        p.set(field.param, String(S[key]));
        p.set(opKey, S[`${key}Op`]);
      } else {
        p.delete(field.param);
        p.delete(opKey);
      }
    }

    return url.toString();
  };

  const isUrlSynced = () => {
    const p = new URL(location.href).searchParams;
    return Object.entries(FIELDS).every(([key, field]) => {
      const active = S[key] > 0;
      return (p.get(field.param) || '') === (active ? String(S[key]) : '') &&
             (p.get(`${field.param}_operator`) || '') === (active ? S[`${key}Op`] : '');
    });
  };

  const updateSyncBtn = () => {
    const synced = isUrlSynced();
    syncBtn.disabled = synced;
    syncBtn.textContent = synced ? 'URL synced' : 'Sync to URL';
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  let shown = 0, hidden = 0;

  const passes = (value, key) =>
    !S[key] || (S[`${key}Op`] === 'gt' ? value > S[key] : value < S[key]);

  const updateStat = () => {
    statEl.innerHTML = `<b>${shown}</b> shown &nbsp;·&nbsp; <b>${hidden}</b> hidden`;
  };

  const applyFilter = debounce(() => {
    shown = 0;
    hidden = 0;

    document.querySelectorAll('#browse-script-list > li[data-script-id]').forEach(li => {
      const text = `${li.dataset.scriptName || ''} ${li.querySelector('.script-description')?.textContent || ''}`.toLowerCase();
      const blocked = S.keywords.some(k => text.includes(k));
      const badNums = Object.entries(FIELDS).some(([key, field]) =>
        !passes(+li.dataset[field.data] || 0, key)
      );

      li.hidden = blocked || badNums;
      li.hidden ? hidden++ : shown++;
    });

    updateStat();
    updateSyncBtn();
  }, 120);

  // ─── UI Builders ──────────────────────────────────────────────────────────
  const makeFieldRow = ([key, field]) => {
    const op = el('select', { className: 'gf-op', dataset: { key: `${key}Op` } },
      el('option', { value: 'gt', textContent: '>' }),
      el('option', { value: 'lt', textContent: '<' }),
    );
    op.value = S[`${key}Op`];

    const input = el('input', {
      className: 'gf-num',
      type: 'number',
      min: 0,
      value: S[key],
      dataset: { key },
    });

    return el('div', { className: 'gf-row' },
      el('span', { className: 'gf-row-text', textContent: field.label }),
      el('div', { className: 'gf-control' },
        el('div', { className: 'gf-op-wrap' }, op),
        input,
      ),
    );
  };

  const renderTags = () => {
    tagsEl.textContent = '';
    S.keywords.forEach(kw => {
      tagsEl.append(
        el('span', { className: 'gf-tag' },
          kw,
          el('button', { className: 'gf-tag-x', textContent: '×', dataset: { kw } }),
        )
      );
    });
  };

  const syncUI = () => {
    panel.querySelectorAll('[data-key]').forEach(node => {
      node.value = S[node.dataset.key];
    });
    kwInput.value = '';
    addBtn.disabled = true;
    renderTags();
    updateSyncBtn();
  };

  // ─── Import / Export ──────────────────────────────────────────────────────
  const exportSettings = () => {
    const json = JSON.stringify(exportState(), null, 2);
    const a = el('a', {
      href: 'data:application/json;charset=utf-8,' + encodeURIComponent(json),
      download: 'gf-filter-settings.json',
    });
    document.body.append(a);
    a.click();
    a.remove();
    toast('Settings exported');
  };

  const importSettings = () => {
    const fi = el('input', { type: 'file', accept: '.json', hidden: true });
    fi.addEventListener('change', () => {
      const file = fi.files?.[0];
      fi.remove();
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'));

          for (const key of Object.keys(FIELDS)) {
            if (key in data) save(key, toNum(data[key]));
            if (validOp(data[`${key}Op`])) save(`${key}Op`, data[`${key}Op`]);
          }
          if ('keywords' in data) save('keywords', cleanKeywords(data.keywords));

          syncUI();
          applyFilter();
          toast('Settings imported');
        } catch {
          toast('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    });
    document.body.append(fi);
    fi.click();
  };

  // ─── Build UI ─────────────────────────────────────────────────────────────
  const statEl = el('span', { className: 'gf-stat' });
  const syncBtn = el('button', { className: 'gf-btn primary', textContent: 'Sync to URL' });
  const exportBtn = el('button', { className: 'gf-btn', textContent: 'Export JSON' });
  const importBtn = el('button', { className: 'gf-btn', textContent: 'Import JSON' });
  const clearBtn = el('button', { className: 'gf-clear', textContent: 'Reset all' });

  const kwInput = el('input', {
    className: 'gf-kw-input',
    type: 'text',
    placeholder: 'e.g. "mod menu", cheat…',
  });
  const addBtn = el('button', {
    className: 'gf-btn primary',
    textContent: 'Block',
    disabled: true,
  });
  const tagsEl = el('div', { className: 'gf-tags' });

  const panel = el('div', { id: 'gf-panel', className: 'closed' },
    el('div', { className: 'gf-section' },
      el('div', { className: 'gf-label', textContent: 'Install threshold' }),
      ...Object.entries(FIELDS).map(makeFieldRow),
      el('div', {
        className: 'gf-note',
        textContent: 'Sync to URL reloads the page and uses Greasy Fork’s native install filters. Keyword blocking stays live and local.',
      }),
    ),
    el('div', { className: 'gf-section' },
      el('div', { className: 'gf-label', textContent: 'Block keywords' }),
      el('div', { className: 'gf-kw-row' }, kwInput, addBtn),
      tagsEl,
    ),
    el('div', { className: 'gf-section' },
      el('div', { className: 'gf-label', textContent: 'Settings' }),
      el('div', { className: 'gf-actions' }, syncBtn, exportBtn, importBtn),
    ),
    el('div', { className: 'gf-footer' }, statEl, clearBtn),
  );

  const fab = el('button', {
    id: 'gf-fab',
    title: 'Filter scripts',
    innerHTML: `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
           stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M2 4h12"/><path d="M4.5 8h7"/><path d="M7 12h2"/>
      </svg>
    `,
  });

  document.body.append(fab, panel);

  // ─── Events ───────────────────────────────────────────────────────────────
  const addKeyword = () => {
    const kw = kwInput.value.trim().toLowerCase();
    if (!kw) return;
    if (!S.keywords.includes(kw)) save('keywords', [...S.keywords, kw]);
    kwInput.value = '';
    addBtn.disabled = true;
    renderTags();
    applyFilter();
  };

  kwInput.addEventListener('input', () => {
    addBtn.disabled = !kwInput.value.trim();
  });

  kwInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addKeyword();
  });

  addBtn.addEventListener('click', addKeyword);

  tagsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-kw]');
    if (!btn) return;
    save('keywords', S.keywords.filter(k => k !== btn.dataset.kw));
    renderTags();
    applyFilter();
  });

  panel.addEventListener('input', e => {
    const key = e.target.dataset.key;
    if (!key) return;
    save(key, key.endsWith('Op') ? (validOp(e.target.value) ? e.target.value : 'gt') : toNum(e.target.value));
    applyFilter();
  });

  panel.addEventListener('change', e => {
    const key = e.target.dataset.key;
    if (!key) return;
    save(key, key.endsWith('Op') ? (validOp(e.target.value) ? e.target.value : 'gt') : toNum(e.target.value));
    applyFilter();
  });

  exportBtn.addEventListener('click', exportSettings);
  importBtn.addEventListener('click', importSettings);

  syncBtn.addEventListener('click', () => {
    if (isUrlSynced()) return toast('Already synced');
    location.assign(buildUrl());
  });

  clearBtn.addEventListener('click', () => {
    resetAll();
    syncUI();
    applyFilter();
  });

  const toggle = force => {
    S.open = force ?? !S.open;
    panel.classList.toggle('closed', !S.open);
    fab.classList.toggle('active', S.open);
  };

  fab.addEventListener('click', e => {
    e.stopPropagation();
    toggle();
  });

  document.addEventListener('click', e => {
    if (S.open && !panel.contains(e.target) && !fab.contains(e.target)) toggle(false);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') toggle(false);
  });

  // ─── Init ─────────────────────────────────────────────────────────────────
  syncUI();
  applyFilter();

  const list = document.getElementById('browse-script-list');
  if (list) new MutationObserver(applyFilter).observe(list, { childList: true });
})();