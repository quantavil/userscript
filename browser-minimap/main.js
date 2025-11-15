// ==UserScript==
// @name         Beautiful Scrollbar — Compact Dark UI (Instant Jump)
// @namespace    http://tampermonkey.net/
// @version      5.2.0
// @description  Fast custom scrollbar with multi-container support, minimal dark settings UI, and instant quick-jump keys. ESC for settings. 1=top, 0=bottom, 2–9=% jump instantly.
// @author       Your Name
// @match        *://*/*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  'use strict';

  // -------------------------------
  // Config + Themes
  // -------------------------------
  const MIN_THUMB = 30, RATIO = 0.95, Z = 2147483640;

  const THEMES = {
    none:   { name:'⚪ None',       track:'rgba(0,0,0,0.03)', thumb:'rgba(100,100,100,0.3)', hover:'rgba(100,100,100,0.45)', w:8,  radius:0, glow:'none' },
    modern: { name:'✨ Modern',     track:'rgba(0,0,0,0.08)', thumb:'linear-gradient(135deg,#667eea,#764ba2)', hover:'linear-gradient(135deg,#764ba2,#667eea)', w:10, radius:10, glow:'0 2px 10px rgba(0,0,0,.25)' },
    neon:   { name:'🌟 Neon Glow',  track:'rgba(0,0,0,0.15)', thumb:'linear-gradient(180deg,#00f5ff,#0ea5e9)', hover:'linear-gradient(180deg,#22d3ee,#06b6d4)', w:9,  radius:8, glow:'0 0 12px rgba(6,182,212,.6)' },
    ocean:  { name:'🌊 Ocean',      track:'rgba(15,23,42,0.2)', thumb:'linear-gradient(180deg,#0ea5e9,#0369a1)', hover:'linear-gradient(180deg,#38bdf8,#0ea5e9)', w:10, radius:10, glow:'0 2px 8px rgba(14,165,233,.25)' },
    sunset: { name:'🌅 Sunset',     track:'rgba(30,15,10,0.15)', thumb:'linear-gradient(180deg,#f59e0b,#dc2626)', hover:'linear-gradient(180deg,#fbbf24,#f97316)', w:10, radius:10, glow:'0 2px 8px rgba(251,191,36,.25)' },
    forest: { name:'🌲 Forest',     track:'rgba(10,20,10,0.15)', thumb:'linear-gradient(180deg,#10b981,#059669)', hover:'linear-gradient(180deg,#34d399,#10b981)', w:10, radius:10, glow:'0 2px 8px rgba(16,185,129,.25)' },
    candy:  { name:'🍬 Candy',      track:'rgba(25,10,25,0.15)', thumb:'linear-gradient(135deg,#ec4899,#a855f7)', hover:'linear-gradient(135deg,#f472b6,#c084fc)', w:10, radius:10, glow:'0 2px 8px rgba(236,72,153,.25)' },
    dark:   { name:'🌑 Dark',       track:'rgba(0,0,0,0.28)', thumb:'#556', hover:'#788', w:8, radius:8, glow:'0 2px 8px rgba(0,0,0,.35)' },
    gold:   { name:'✨ Gold',       track:'rgba(30,25,15,0.15)', thumb:'linear-gradient(135deg,#fbbf24,#d97706)', hover:'linear-gradient(135deg,#fcd34d,#fbbf24)', w:10, radius:10, glow:'0 0 10px rgba(251,191,36,.35)' },
    cyber:  { name:'🤖 Cyber',      track:'rgba(0,0,0,0.3)', thumb:'linear-gradient(180deg,#a78bfa,#7c3aed)', hover:'linear-gradient(180deg,#c4b5fd,#a78bfa)', w:9, radius:8, glow:'0 0 10px rgba(139,92,246,.4)' },
    ruby:   { name:'💎 Ruby',       track:'rgba(20,10,15,0.15)', thumb:'linear-gradient(135deg,#dc2626,#991b1b)', hover:'linear-gradient(135deg,#ef4444,#dc2626)', w:10, radius:10, glow:'0 0 8px rgba(220,38,38,.3)' },
    slate:  { name:'🪨 Slate',      track:'rgba(2,6,23,.16)', thumb:'linear-gradient(180deg,#64748b,#334155)', hover:'linear-gradient(180deg,#94a3b8,#64748b)', w:9, radius:10, glow:'0 2px 10px rgba(2,6,23,.35)' }
  };

  // -------------------------------
  // Utils
  // -------------------------------
  const $root = () => document.scrollingElement || document.documentElement;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const Store = {
    get(k, d) { try { if (typeof GM_getValue === 'function') return GM_getValue(k) ?? d; } catch(_){} try { const v = localStorage.getItem(k); return v !== null ? v : d; } catch(_){ return d; } },
    set(k, v) { try { if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; } } catch(_){} try { localStorage.setItem(k, v); } catch(_){} }
  };

  const addCSS = (css) => {
    try { if (typeof GM_addStyle === 'function') return GM_addStyle(css); } catch(_){}
    const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  };

  const isEditable = (el) => {
    const t = el?.tagName; return el?.isContentEditable || t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
  };

  const isScrollable = (el) => {
    if (!el || !el.nodeType) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return /auto|scroll|overlay/.test((cs.overflowY || cs.overflow || '').toLowerCase())
           && el.scrollHeight > el.clientHeight + 1;
  };

  const findScrollable = (t) => {
    if (!t) return $root();
    if (t.closest('.bs-bar, .bs-ui')) return null;
    for (let el = t; el && el !== document.documentElement; el = el.parentElement) {
      if (el === document.body) return $root();
      if (isScrollable(el)) return el;
    }
    return $root();
  };

  const getDigit = (e) => {
    const k = e.key; if (k?.length === 1 && k >= '0' && k <= '9') return k;
    const c = e.code || ''; if (/^Digit[0-9]$/.test(c)) return c.slice(5);
    if (/^Numpad[0-9]$/.test(c)) return c.slice(6);
    return null;
  };

  // -------------------------------
  // Theme handling
  // -------------------------------
  let CUR_THEME = Store.get('bs-theme', 'modern');
  const setTheme = (name) => {
    if (!THEMES[name]) name = 'modern';
    CUR_THEME = name; Store.set('bs-theme', name);
    const t = THEMES[name], r = document.documentElement.style;
    r.setProperty('--bs-track', t.track);
    r.setProperty('--bs-thumb', t.thumb);
    r.setProperty('--bs-thumb-hover', t.hover || t.thumb);
    r.setProperty('--bs-radius', (t.radius ?? 8) + 'px');
    r.setProperty('--bs-width', (t.w ?? 10) + 'px');
    r.setProperty('--bs-glow', t.glow || 'none');
  };

  // -------------------------------
  // Scrollbar Instance
  // -------------------------------
  class SB {
    constructor(container) {
      this.c = container;
      this.r = container === $root();
      this.el = document.createElement('div');
      this.el.className = 'bs-bar';
      this.thumb = document.createElement('div');
      this.thumb.className = 'bs-thumb';
      this.el.appendChild(this.thumb);
      document.body.appendChild(this.el);
      this.raf = 0;
      this.onScroll = () => this.req();
      this.bind();
      this.update();
    }
    bind() {
      // Track click -> jump
      this.el.addEventListener('click', (e) => {
        if (e.target !== this.el) return;
        const rect = this.el.getBoundingClientRect();
        const th = this.thumb.offsetHeight, space = rect.height - th;
        if (space <= 0) return;
        const p = clamp((e.clientY - rect.top - th / 2) / space, 0, 1);
        const m = this.m(); this.to(m.max * p);
      });
      // Drag thumb
      this.thumb.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; e.preventDefault();
        const startY = e.clientY, start = this.m().scroll;
        this.el.classList.add('drag');
        const mm = (ev) => {
          ev.preventDefault();
          const m = this.m(), rect = this.el.getBoundingClientRect();
          const th = this.thumb.offsetHeight, space = rect.height - th; if (space <= 0) return;
          this.to(start + ((ev.clientY - startY) / space) * m.max);
        };
        const mu = () => { this.el.classList.remove('drag'); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup', mu);
      });
      (this.r ? window : this.c).addEventListener('scroll', this.onScroll, { passive: true });
    }
    m() {
      if (this.r) {
        const scroll = window.pageYOffset || $root().scrollTop;
        const vh = window.innerHeight;
        const sh = Math.max($root().scrollHeight, document.body?.scrollHeight || 0, vh);
        return { scroll, vh, sh, max: Math.max(0, sh - vh) };
      }
      const scroll = this.c.scrollTop, vh = this.c.clientHeight, sh = this.c.scrollHeight;
      return { scroll, vh, sh, max: Math.max(0, sh - vh) };
    }
    to(y) {
      const m = this.m(), v = clamp(y, 0, m.max);
      (this.r ? $root() : this.c).scrollTop = v; // instant
    }
    update() {
      if (!this.el) return;
      const m = this.m();
      let vis = m.max > 0 ? 1 : 0;
      let top = 0, h = window.innerHeight, right = 0;
      if (!this.r) {
        const rect = this.c.getBoundingClientRect();
        if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) vis = 0;
        else {
          top = Math.max(0, rect.top);
          h = Math.min(rect.bottom, window.innerHeight) - top;
          right = Math.max(0, window.innerWidth - rect.right);
        }
      }
      this.el.style.opacity = String(vis);
      this.el.style.pointerEvents = vis ? 'auto' : 'none';
      this.el.style.top = top + 'px';
      this.el.style.height = h + 'px';
      this.el.style.right = right + 'px';
      if (!vis) return;
      const barH = this.el.offsetHeight || h;
      const th = Math.max(MIN_THUMB, Math.min(barH * RATIO, barH * (m.vh / Math.max(m.sh, 1))));
      const p = m.max ? (m.scroll / m.max) : 0;
      const y = (barH - th) * p;
      this.thumb.style.height = Math.round(th) + 'px';
      this.thumb.style.transform = `translateY(${Math.round(y)}px)`;
    }
    req() { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.update()); }
    destroy() {
      cancelAnimationFrame(this.raf);
      (this.r ? window : this.c).removeEventListener('scroll', this.onScroll);
      this.el?.remove();
      this.el = this.thumb = this.c = null;
    }
  }

  // -------------------------------
  // Manager (tracks active container)
  // -------------------------------
  class Manager {
    constructor() {
      this.map = new Map();
      this.rootInst = this.get($root());
      this.active = this.rootInst;
      this.bind();
      this.observe();
    }
    get(c) { if (!this.map.has(c)) this.map.set(c, new SB(c)); return this.map.get(c); }
    setActiveFrom(target) {
      if (target?.closest('.bs-bar, .bs-ui')) return;
      const c = findScrollable(target);
      if (c) this.active = this.get(c);
    }
    bind() {
      const onEvt = (e) => this.setActiveFrom(e.target);
      document.addEventListener('mouseover', onEvt, { passive: true });
      document.addEventListener('wheel', onEvt, { passive: true });
      document.addEventListener('focusin', onEvt);
      window.addEventListener('resize', () => this.updateAll(), { passive: true });
    }
    updateAll() { this.map.forEach(i => i.req()); }
    clean() {
      this.map.forEach((inst, el) => {
        if (el !== $root() && !document.contains(el)) { inst.destroy(); this.map.delete(el); }
      });
    }
    observe() {
      const mo = new MutationObserver(() => { this.clean(); this.updateAll(); });
      mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }
  }

  // -------------------------------
  // Minimal Dark Settings UI
  // -------------------------------
  let UI = null, UI_OPEN = false, MGR = null;

  const buildUI = () => {
    if (UI) return;
    const cards = Object.entries(THEMES).map(([k, v]) => `
      <button class="bs-card ${k === CUR_THEME ? 'on' : ''}" data-k="${k}" aria-label="${v.name}">
        <span class="bs-prev">
          <i style="background:${v.track}"></i>
          <b style="background:${v.thumb}; box-shadow:${v.glow || 'none'}"></b>
        </span>
        <span class="bs-name">${v.name}</span>
      </button>
    `).join('');
    UI = document.createElement('div');
    UI.className = 'bs-ui bs-ov';
    UI.innerHTML = `
      <div class="bs-panel" role="dialog" aria-label="Scrollbar Themes" aria-modal="true">
        <div class="bs-top">
          <div class="bs-title">Themes</div>
          <button class="bs-close" aria-label="Close">✕</button>
        </div>
        <div class="bs-grid" role="list">${cards}</div>
        <div class="bs-meta"><kbd>1</kbd> top • <kbd>0</kbd> bottom • <kbd>2–9</kbd> jump %</div>
      </div>
    `;
    UI.addEventListener('click', (e) => {
      if (e.target.classList.contains('bs-ov')) closeUI();
      if (e.target.classList.contains('bs-close')) closeUI();
      const btn = e.target.closest('.bs-card');
      if (btn) {
        setTheme(btn.dataset.k);
        UI.querySelectorAll('.bs-card').forEach(b => b.classList.toggle('on', b === btn));
        MGR?.updateAll();
      }
    });
    UI.addEventListener('keydown', (e) => {
      const btn = e.target.closest?.('.bs-card');
      if (btn && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); btn.click(); }
      if (e.key === 'Escape') closeUI();
    });
    document.body.appendChild(UI);
  };

  const openUI = () => { buildUI(); UI.classList.add('show'); UI_OPEN = true; setTimeout(() => UI.querySelector('.bs-card.on')?.focus(), 50); };
  const closeUI = () => { UI?.classList.remove('show'); UI_OPEN = false; };

  // -------------------------------
  // Styles (minimal dark, red close)
  // -------------------------------
  const injectStyles = () => addCSS(`
    :root{
      --bs-track: rgba(0,0,0,.08);
      --bs-thumb: #889;
      --bs-thumb-hover: #aab;
      --bs-radius: 10px;
      --bs-width: 10px;
      --bs-glow: none;
      --bs-red: #ef4444;
      --bs-red-strong: #dc2626;
    }
    /* Hide native scrollbars */
    html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar { width:0!important; height:0!important; display:none!important; }
    html, body, * { scrollbar-width: none!important; -ms-overflow-style: none!important; }

    /* Custom bar */
    .bs-bar{ position:fixed; right:0; top:0; width:var(--bs-width); height:100vh; background:var(--bs-track); border-radius:var(--bs-radius) 0 0 var(--bs-radius); z-index:${Z}; transition:opacity .2s,width .15s; opacity:0; pointer-events:none; }
    .bs-bar:hover{ width:calc(var(--bs-width) + 3px); }
    .bs-thumb{ position:absolute; left:1px; right:1px; top:0; min-height:${MIN_THUMB}px; background:var(--bs-thumb); border-radius:var(--bs-radius); box-shadow:var(--bs-glow); cursor:grab; will-change:transform; transition:background .15s, box-shadow .2s; }
    .bs-bar:hover .bs-thumb{ background:var(--bs-thumb-hover); box-shadow:var(--bs-glow), 0 2px 8px rgba(0,0,0,.25); }
    .bs-bar.drag .bs-thumb{ cursor:grabbing; }

    /* Overlay */
    .bs-ov{ position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(3,6,12,.72); backdrop-filter: blur(6px); z-index:${Z+10}; }
    .bs-ov.show{ display:flex; }

    /* Panel (minimal, dark) */
    .bs-panel{ width:min(92vw,640px); max-height:88vh; display:flex; flex-direction:column; background:rgba(10,14,22,.92); color:#e5e7eb; border:1px solid rgba(255,255,255,.06); border-radius:14px; box-shadow:0 18px 60px rgba(0,0,0,.6); overflow:hidden; font:13.5px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }

    .bs-top{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01)); border-bottom:1px solid rgba(255,255,255,.06); }
    .bs-title{ font-weight:700; font-size:13.5px; color:#cbd5e1; letter-spacing:.2px; }
    .bs-close{ width:32px; height:32px; border-radius:9px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#e5e7eb; font-size:18px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .bs-close:hover{ border-color: var(--bs-red); background: rgba(239,68,68,.16); color:#fff; }
    .bs-close:active{ transform: scale(.95); background: rgba(239,68,68,.28); border-color: var(--bs-red-strong); color:#fff; }

    .bs-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; padding:12px; overflow:auto; max-height:52vh; }
    .bs-card{ appearance:none; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); border-radius:12px; padding:10px; cursor:pointer; text-align:center; color:#e5e7eb; transition:transform .12s, border-color .12s, background .12s, box-shadow .12s; outline:none; width:100%; }
    .bs-card:hover{ transform:translateY(-2px); border-color:rgba(99,102,241,.6); background:rgba(99,102,241,.12); box-shadow:0 6px 16px rgba(0,0,0,.35); }
    .bs-card.on{ border-color:#60a5fa; box-shadow:0 0 0 2px rgba(96,165,250,.16) inset, 0 10px 24px rgba(0,0,0,.35); background:rgba(96,165,250,.10); }

    .bs-prev{ position:relative; height:52px; border-radius:9px; background:#0b1220; margin-bottom:8px; overflow:hidden; box-shadow:inset 0 2px 8px rgba(0,0,0,.35); display:block; }
    .bs-prev i{ position:absolute; right:6px; top:6px; bottom:6px; width:8px; border-radius:4px; }
    .bs-prev b{ position:absolute; right:6px; top:12px; width:8px; height:20px; border-radius:4px; }
    .bs-name{ font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#e2e8f0; }

    .bs-meta{ padding:10px 12px 12px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid rgba(255,255,255,.06); }
    .bs-meta kbd{ background:rgba(148,163,184,.18); border:1px solid rgba(148,163,184,.28); padding:2px 6px; border-radius:6px; font:600 11px ui-monospace,monospace; color:#cbd5e1; }

    /* Scrollbar just for the grid (override hide) */
    .bs-grid::-webkit-scrollbar{ width:8px!important; display:block!important; }
    .bs-grid::-webkit-scrollbar-thumb{ background:rgba(96,165,250,.35); border-radius:4px; }
    .bs-grid::-webkit-scrollbar-thumb:hover{ background:rgba(96,165,250,.6); }
    .bs-grid{ scrollbar-width:thin!important; }

    @media (prefers-reduced-motion: reduce){
      .bs-bar, .bs-thumb, .bs-card, .bs-close { transition:none!important; }
    }
  `);

  // -------------------------------
  // Keyboard (instant jumps on active container)
  // -------------------------------
  const bindKeys = () => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (UI_OPEN) { e.preventDefault(); closeUI(); }
        else if (!isEditable(e.target)) { e.preventDefault(); openUI(); }
        return;
      }
      if (UI_OPEN || isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const d = getDigit(e); if (d == null) return;

      const inst = MGR?.active || MGR?.rootInst; if (!inst) return;
      const m = inst.m();
      e.preventDefault();

      // Instant mapping
      if (d === '1') inst.to(0);
      else if (d === '0') inst.to(m.max);
      else inst.to(m.max * (parseInt(d, 10) / 10));
    });
  };

  // -------------------------------
  // Init
  // -------------------------------
  const start = () => {
    injectStyles();
    setTheme(CUR_THEME);
    MGR = new Manager();
    bindKeys();
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('🎨 Scrollbar Themes', () => (UI_OPEN ? closeUI() : openUI()));
    }
  };

  if (document.body) start();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else setTimeout(start, 30);
})();