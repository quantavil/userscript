// ==UserScript==
// @name         Greasy Fork Filter
// @namespace    https://github.com/quantavil/userscript
// @version      1.1
// @description  Filter scripts by installs and keywords — with import/export
// @match        https://greasyfork.org/*/scripts*
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  const DEFAULTS = { daily: 0, total: 0, keywords: [] };

  const S = {
    daily:    GM_getValue('daily',    DEFAULTS.daily),
    total:    GM_getValue('total',    DEFAULTS.total),
    keywords: GM_getValue('keywords', DEFAULTS.keywords),
    open:     false,
  };

  const save = (k, v) => { S[k] = v; GM_setValue(k, v); };
  const resetAll = () => Object.entries(DEFAULTS).forEach(([k, v]) => save(k, v));

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  const el = (tag, attrs = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), attrs);
    kids.forEach(c => n.append(c));
    return n;
  };

  const toast = msg => {
    const t = el('div', { className: 'gf-toast', textContent: msg });
    document.body.append(t);
    setTimeout(() => t.remove(), 2000);
  };

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
      width: 276px; background: #fff;
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
      justify-content: space-between; gap: 10px; margin-bottom: 7px;
    }
    .gf-row:last-child { margin-bottom: 0; }
    .gf-row-text { font-size: 13px; color: #3a3a3a; flex: 1; }

    .gf-num {
      width: 70px; height: 28px; padding: 0 9px;
      border: 1px solid rgba(0,0,0,0.13); border-radius: 7px;
      background: #f5f5f7; color: #1a1a1a;
      font-size: 13px; text-align: right; outline: none;
      transition: border-color .15s, box-shadow .15s;
      -moz-appearance: textfield;
    }
    .gf-num::-webkit-inner-spin-button { -webkit-appearance: none; }
    .gf-num:focus { border-color: #888; box-shadow: 0 0 0 3px rgba(0,0,0,0.07); }

    .gf-kw-row { display: flex; gap: 6px; margin-bottom: 9px; }
    .gf-kw-input {
      flex: 1; height: 28px; padding: 0 9px;
      border: 1px solid rgba(0,0,0,0.13); border-radius: 7px;
      background: #f5f5f7; color: #1a1a1a;
      font-size: 13px; outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .gf-kw-input:focus { border-color: #888; box-shadow: 0 0 0 3px rgba(0,0,0,0.07); }

    .gf-add-btn {
      height: 28px; padding: 0 11px;
      border: 1px solid rgba(0,0,0,0.15); border-radius: 7px;
      background: #1a1a1a; color: #f0f0f0;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background .15s; white-space: nowrap;
    }
    .gf-add-btn:hover { background: #333; }
    .gf-add-btn:disabled {
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

    .gf-io-row { display: flex; gap: 6px; margin-top: 11px; }
    .gf-io-btn {
      flex: 1; height: 28px; border-radius: 7px;
      border: 1px solid rgba(0,0,0,0.13);
      background: #f5f5f7; color: #3a3a3a;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .gf-io-btn:hover { background: #e5e5e7; border-color: rgba(0,0,0,0.2); }

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

    .gf-footer {
      padding: 9px 15px; display: flex;
      align-items: center; justify-content: space-between;
    }
    .gf-stat { font-size: 12px; color: #999; }
    .gf-stat b { color: #1a1a1a; font-weight: 600; }

    .gf-clear {
      font-size: 12px; color: #e63946; background: none;
      border: none; cursor: pointer; padding: 0;
      opacity: .75; transition: opacity .12s;
    }
    .gf-clear:hover { opacity: 1; }

    @media (prefers-color-scheme: dark) {
      #gf-panel {
        background: #1c1c1e; border-color: rgba(255,255,255,0.09);
        color: #f0f0f2; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      }
      .gf-section   { border-bottom-color: rgba(255,255,255,0.06); }
      .gf-label      { color: #555; }
      .gf-row-text   { color: #bbb; }
      .gf-num,
      .gf-kw-input   { background: #2c2c2e; border-color: rgba(255,255,255,0.1); color: #f0f0f2; }
      .gf-num:focus,
      .gf-kw-input:focus { border-color: #666; box-shadow: 0 0 0 3px rgba(255,255,255,0.06); }
      .gf-add-btn    { background: #3a3a3c; border-color: rgba(255,255,255,0.08); color: #e0e0e0; }
      .gf-add-btn:hover    { background: #4a4a4c; }
      .gf-add-btn:disabled { background: #2c2c2e; color: #555; }
      .gf-tag        { background: #3a3a3c; color: #ddd; }
      .gf-tag-x      { background: rgba(255,255,255,0.1); }
      .gf-io-btn     { background: #2c2c2e; border-color: rgba(255,255,255,0.1); color: #bbb; }
      .gf-io-btn:hover { background: #3a3a3c; }
      .gf-stat       { color: #555; }
      .gf-stat b     { color: #ccc; }
    }
  ` }));

  // ─── Filter ───────────────────────────────────────────────────────────────
  let shown = 0, hidden = 0;

  const applyFilter = debounce(() => {
    shown = 0; hidden = 0;
    const kws = S.keywords.map(k => k.toLowerCase());

    document.querySelectorAll('#browse-script-list > li[data-script-id]').forEach(li => {
      const daily    = +li.dataset.scriptDailyInstalls || 0;
      const total    = +li.dataset.scriptTotalInstalls || 0;
      const name     = (li.dataset.scriptName || '').toLowerCase();
      const desc     = (li.querySelector('.script-description')?.textContent || '').toLowerCase();
      const haystack = name + ' ' + desc;

      const filtered = daily < S.daily
                    || total < S.total
                    || kws.some(k => haystack.includes(k));

      li.style.display = filtered ? 'none' : '';
      filtered ? hidden++ : shown++;
    });

    updateStat();
  }, 120);

  // ─── Tag‑list builder ────────────────────────────────────────────────────
  const makeTagSection = (listKey, placeholder) => {
    const tagsEl = el('div', { className: 'gf-tags' });
    const input  = el('input', { className: 'gf-kw-input', type: 'text', placeholder });
    const addBtn = el('button', { className: 'gf-add-btn', textContent: 'Block', disabled: true });

    const render = () => {
      tagsEl.innerHTML = '';
      S[listKey].forEach(val => {
        const x = el('button', { className: 'gf-tag-x', textContent: '×' });
        x.addEventListener('click', e => {
          e.stopPropagation();              // prevent panel‑close handler
          save(listKey, S[listKey].filter(v => v !== val));
          render();
          applyFilter();
        });
        tagsEl.append(el('span', { className: 'gf-tag' }, val, x));
      });
    };

    const add = () => {
      const phrase = input.value.trim().toLowerCase();
      if (!phrase || S[listKey].includes(phrase)) {
        input.value = ''; addBtn.disabled = true; return;
      }
      save(listKey, [...S[listKey], phrase]);
      input.value = ''; addBtn.disabled = true;
      render();
      applyFilter();
    };

    input.addEventListener('input',   () => { addBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', e => e.key === 'Enter' && add());
    addBtn.addEventListener('click',  add);

    return {
      tagsEl, input, addBtn, render,
      row: el('div', { className: 'gf-kw-row' }, input, addBtn),
    };
  };

  // ─── Import / Export ──────────────────────────────────────────────────────
  const exportSettings = () => {
    const json = JSON.stringify(
      { daily: S.daily, total: S.total, keywords: S.keywords }, null, 2
    );
    const a = el('a', {
      href:     'data:application/json;charset=utf-8,' + encodeURIComponent(json),
      download: 'gf-filter-settings.json',
    });
    document.body.append(a); a.click(); a.remove();
    toast('Settings exported');
  };

  const importSettings = () => {
    const fi = el('input', { type: 'file', accept: '.json', style: 'display:none' });
    fi.addEventListener('change', () => {
      const file = fi.files[0]; fi.remove();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const d = JSON.parse(e.target.result);
          if (typeof d !== 'object' || d === null) throw 0;
          if (typeof d.daily === 'number')  save('daily', d.daily);
          if (typeof d.total === 'number')  save('total', d.total);
          if (Array.isArray(d.keywords))    save('keywords', d.keywords.map(k => String(k).toLowerCase()));
          syncUI();
          applyFilter();
          toast('Settings imported');
        } catch { toast('Invalid JSON file'); }
      };
      reader.readAsText(file);
    });
    document.body.append(fi); fi.click();
  };

  // ─── Build UI ─────────────────────────────────────────────────────────────
  const kwSection = makeTagSection('keywords', 'e.g. "mod menu", cheat…');
  const statEl    = el('span', { className: 'gf-stat' });
  const clearBtn  = el('button', { className: 'gf-clear', textContent: 'Reset all' });

  const updateStat = () => {
    statEl.innerHTML = `<b>${shown}</b> shown &nbsp;·&nbsp; <b>${hidden}</b> hidden`;
  };

  const makeNumRow = (label, key) => {
    const input = el('input', {
      className: 'gf-num', type: 'number', min: 0, value: S[key],
    });
    input.dataset.key = key;
    input.addEventListener('input', () => { save(key, +input.value || 0); applyFilter(); });
    return el('div', { className: 'gf-row' },
      el('span', { className: 'gf-row-text', textContent: label }), input
    );
  };

  const panel = el('div', { id: 'gf-panel', className: 'closed' },
    el('div', { className: 'gf-section' },
      el('div', { className: 'gf-label', textContent: 'Install threshold' }),
      makeNumRow('Daily installs ≥', 'daily'),
      makeNumRow('Total installs ≥', 'total'),
    ),
    el('div', { className: 'gf-section' },
      el('div', { className: 'gf-label', textContent: 'Block keywords' }),
      kwSection.row,
      kwSection.tagsEl,
    ),
    el('div', { className: 'gf-section' },
      el('div', { className: 'gf-label', textContent: 'Settings' }),
      el('div', { className: 'gf-io-row' },
        Object.assign(el('button', { className: 'gf-io-btn', textContent: 'Export JSON' }),
          { onclick: exportSettings }),
        Object.assign(el('button', { className: 'gf-io-btn', textContent: 'Import JSON' }),
          { onclick: importSettings }),
      ),
    ),
    el('div', { className: 'gf-footer' }, statEl, clearBtn),
  );

  // syncUI — defined after panel so querySelectorAll works at call‑time
  const syncUI = () => {
    panel.querySelectorAll('.gf-num').forEach(i => {
      const k = i.dataset.key;
      if (k) i.value = S[k];
    });
    kwSection.input.value = '';
    kwSection.addBtn.disabled = true;
    kwSection.render();
  };

  clearBtn.addEventListener('click', () => { resetAll(); syncUI(); applyFilter(); });

  const fab = el('button', { id: 'gf-fab', title: 'Filter scripts', innerHTML:
    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
       <path d="M2 4h12"/><path d="M4.5 8h7"/><path d="M7 12h2"/>
     </svg>` });

  document.body.append(fab, panel);

  // ─── Toggle ───────────────────────────────────────────────────────────────
  const toggle = force => {
    S.open = force ?? !S.open;
    panel.classList.toggle('closed', !S.open);
    fab.classList.toggle('active', S.open);
  };

  fab.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.addEventListener('click',   e => S.open && !panel.contains(e.target) && toggle(false));
  document.addEventListener('keydown', e => e.key === 'Escape' && toggle(false));

  // ─── Init ─────────────────────────────────────────────────────────────────
  kwSection.render();
  applyFilter();

  const list = document.getElementById('browse-script-list');
  if (list) new MutationObserver(applyFilter).observe(list, { childList: true });
})();