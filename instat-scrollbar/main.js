// ==UserScript==
// @name         Instant Jump Scrollbar (Minimal)
// @namespace    https://github.com/quantavil
// @version      1.0.0
// @description  Instant quick jumps: 1=top, 0=bottom, 2–9=20%–90%. Click anywhere on the custom scrollbar to jump there.
// @match        *://*/*
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';

  const MIN_THUMB = 30, Z = 9999999;
  const root = () => document.scrollingElement || document.documentElement || document.body;
  let activeC = null;
  let lastEl = null;
  const cp = (e) => (typeof e.composedPath === 'function') ? e.composedPath()[0] : e.target;
  const isScrollable = (el) => {
    if (!el || !el.nodeType) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const oy = (cs.overflowY || cs.overflow || '').toLowerCase();
    return /auto|scroll|overlay/.test(oy) && el.scrollHeight > el.clientHeight + 1;
  };
  const findScrollable = (t) => {
    if (!t) return root();
    for (let el = t; el && el !== document.documentElement; el = el.parentElement) {
      if (el === document.body) return root();
      if (isScrollable(el)) return el;
    }
    return root();
  };
  const getActive = () => {
    const a = activeC && isScrollable(activeC) ? activeC : null;
    return a || findScrollable(document.activeElement) || root();
  };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function metrics(el) {
    const r = el || getActive();
    const isRoot = r === root();
    const vh = isRoot ? window.innerHeight : r.clientHeight;
    const sh = Math.max((isRoot ? (r.scrollHeight || 0) : r.scrollHeight) || 0, vh);
    const max = Math.max(0, sh - vh);
    return { el: r, scroll: r.scrollTop || 0, vh, sh, max };
  }

  function injectCSS() {
    const css = `
      /* Hide native vertical scrollbar on root */
      html::-webkit-scrollbar:vertical, body::-webkit-scrollbar:vertical { width:0!important; }
      html, body { scrollbar-width:none!important; -ms-overflow-style:none!important; }

      #ij-bar {
        position: fixed; right: 0; top: 0; height: 100vh; width: 10px;
        background: rgba(0,0,0,0.10);
        z-index: ${Z};
      }
      #ij-thumb {
        position: absolute; left: 1px; right: 1px; top: 0;
        min-height: ${MIN_THUMB}px;
        background: rgba(120,120,120,0.7);
        border-radius: 6px;
        will-change: transform;
        user-select: none; touch-action: none; cursor: grab;
      }
      #ij-thumb:active { cursor: grabbing; }
    `;
    const st = document.createElement('style');
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  function createBar() {
    const bar = document.createElement('div');
    bar.id = 'ij-bar';
    const thumb = document.createElement('div');
    thumb.id = 'ij-thumb';
    bar.appendChild(thumb);
    document.body.appendChild(bar);

    let raf = 0;
    const update = () => {
      const s = metrics(getActive());
      const visible = s.max > 0;
      bar.style.display = visible ? 'block' : 'none';
      if (!visible) return;
      const barH = window.innerHeight;
      const th = Math.max(MIN_THUMB, barH * (s.vh / Math.max(s.sh, 1)));
      const y = s.max ? (barH - th) * (s.scroll / s.max) : 0;
      thumb.style.height = th + 'px';
      thumb.style.transform = `translateY(${Math.round(y)}px)`;
    };
    const req = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    const setActive = (el) => {
      const next = el || root();
      if (lastEl && lastEl !== next) lastEl.removeEventListener('scroll', req);
      if (next && lastEl !== next) next.addEventListener('scroll', req, { passive: true });
      lastEl = next;
      activeC = next;
    };

    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    document.addEventListener('wheel', (e) => { setActive(findScrollable(cp(e))); req(); }, { passive: true });
    document.addEventListener('mouseover', (e) => { setActive(findScrollable(cp(e))); }, { passive: true });
    document.addEventListener('focusin', (e) => { setActive(findScrollable(cp(e))); req(); }, { passive: true });
    setActive(findScrollable(document.activeElement));

    // Click on track -> jump to that percentage
    bar.addEventListener('click', (e) => {
      if (e.target !== bar) return;
      const rect = bar.getBoundingClientRect();
      const p = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      const s = metrics(getActive());
      s.el.scrollTop = Math.round(s.max * p);
      req();
    });

    // Drag thumb (instant)
    thumb.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      thumb.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const s0 = metrics(getActive());
      const rect = bar.getBoundingClientRect();
      const th = thumb.offsetHeight || MIN_THUMB;
      const space = Math.max(1, rect.height - th);
      const onMove = (ev) => {
        const dy = ev.clientY - startY;
        const s = metrics(s0.el);
        const delta = (dy / space) * s.max;
        s.el.scrollTop = clamp(s0.scroll + delta, 0, s.max);
        req();
      };
      const onUp = () => {
        thumb.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
      window.addEventListener('pointercancel', onUp, { once: true });
    });

    req(); // initial
  }

  function isEditable(el) {
    const t = el && el.tagName;
    return el && (el.isContentEditable || t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT');
  }
  function getDigit(e) {
    const k = e.key;
    if (k && k.length === 1 && k >= '0' && k <= '9') return k;
    const c = e.code || '';
    if (/^Digit[0-9]$/.test(c)) return c.slice(5);
    if (/^Numpad[0-9]$/.test(c)) return c.slice(6);
    return null;
  }
  function bindKeys() {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      const d = getDigit(e);
      if (d == null) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      const s = metrics(getActive());
      let p;
      if (d === '1') p = 0;
      else if (d === '0') p = 1;
      else p = parseInt(d, 10) / 10;
      s.el.scrollTop = Math.round(s.max * p);
      req();
    };
    document.addEventListener('keydown', onKey, true);
  }

  function start() {
    injectCSS();
    createBar();
    bindKeys();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else if (document.body) {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();