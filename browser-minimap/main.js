// ==UserScript==
// @name         VSCode Minimap — Shadow DOM, Multi-Scroll, Hydration-Safe
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Minimal, fast, layout-only minimap in a Shadow DOM that follows hovered scrollable areas. M toggles map. 1 jumps to top (0%), 0 jumps to end (100%). Click/drag to scroll. Hydration-safe for React/Next sites.
// @author       Your Name
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ---------------------------
  // Config
  // ---------------------------
  const MM_WIDTH = 120;
  const MIN_VP_PX = 18;
  const MAX_PER_RENDER = 5000;
  const HOVER_THROTTLE_MS = 200;

  // User shortcuts/config
  // User config
  const START_HIDDEN = true;            // start minimap hidden after refresh
  const TOGGLE_KEY = 'm';               // toggle key (case-insensitive)
  const TOGGLE_MOD = {                  // require a modifier? set to true
    ctrl: false, alt: false, shift: false, meta: false
  };

  // Exclude websites (any match will disable the script)
  const EXCLUDE_HOSTS = ['www.youtube.com', 'twitter.com', 'www.facebook.com', 'www.reddit.com'];
  const EXCLUDE_PATTERNS = [
    // /^https?:\/\/(\w+\.)?google\./i,   // any google.* domain
    // /:\/\/localhost:\d+\//,
  ];

  // Helper: returns true if current page should be excluded
  function isExcluded(loc) {
    const href = typeof loc === 'string' ? loc : loc.href;
    let host;
    try { host = typeof loc === 'string' ? new URL(href).hostname : loc.hostname; }
    catch { host = location.hostname; }
    if (EXCLUDE_HOSTS.includes(host)) return true;
    for (const re of EXCLUDE_PATTERNS) {
      try { if (re.test(href) || re.test(host)) return true; } catch { }
    }
    return false;
  }

  const SELECTORS = [
    'main', 'article', 'section', 'nav', 'aside', 'header', 'footer',
    'div', 'p', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'code', 'blockquote',
    'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'a', 'span', 'img', 'canvas', 'video', 'iframe'
  ].join(',');

  // requestIdleCallback polyfill (for older browsers)
  const ric = window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (cb, opts) => setTimeout(() => cb({
      didTimeout: true,
      timeRemaining: () => 0
    }), (opts && opts.timeout) || 1);

  // ---------------------------
  // State
  // ---------------------------
  let initialized = false;
  let activeEl = null; // current scroll container
  let dragging = false;
  let dragStartY = null;
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let scheduled = false;
  let scrollDebounce = null;
  let mutationDebounce = null;

  // element cache (per container)
  let cachedElements = null;
  let cacheInvalidated = true;

  // DOM refs
  let host, shadow, mm, canvas, ctx, viewport;

  // ---------------------------
  // Shadow CSS (scoped)
  // ---------------------------
  const CSS = `
  :host {
    position: fixed;
    top: 0;
    right: 0;
    width: ${MM_WIDTH}px;
    height: 100vh;
    z-index: 2147483647;
    transform: none !important;
    contain: layout style paint;
    display: block;
    pointer-events: auto;
  }

  :host(.hidden) {
    display: none !important;
    pointer-events: none !important;
  }

  #mm {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: auto;
    cursor: crosshair;

    background: rgba(15, 15, 20, 0.45);
    border-left: 1px solid rgba(255,255,255,0.06);
    box-shadow: -2px 0 12px rgba(0,0,0,0.35);
    backdrop-filter: blur(6px) saturate(1.15);
    -webkit-backdrop-filter: blur(6px) saturate(1.15);
  }

  #canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    image-rendering: crisp-edges;
  }

  #viewport {
    position: absolute;
    left: 0;
    width: 100%;
    pointer-events: none;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.10);
    border: none;
    outline: none;
  }

  #mm::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 100% 8px, 8px 100%;
    pointer-events: none;
  }
  `;

  // ---------------------------
  // Init (Hydration-safe)
  // ---------------------------
  function startWhenSafe() {
    const kick = () => {
      if (initialized) return;
      if (!document.body) return setTimeout(kick, 200);
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => ric(init, { timeout: 2000 }), { once: true });
        return;
      }
      ric(init, { timeout: 2000 });
    };
    kick();
  }

  function init() {
    if (initialized) return;
    if (!document.body) return setTimeout(init, 200);
    initialized = true;

    createShadowMinimap();

    // Start with main scrolling element
    const rootScroll = document.scrollingElement || document.documentElement;
    setActive(rootScroll);

    attachGlobalListeners();

    sizeCanvas();
    scheduleRender();
  }

  // ---------------------------
  // Shadow DOM component
  // ---------------------------
  function createShadowMinimap() {
    host = document.createElement('mm-vscode-minimap');
    shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CSS;

    mm = document.createElement('div');
    mm.id = 'mm';
    if (START_HIDDEN) {
      host.classList.add('hidden'); // fully disable overlay area
    }

    canvas = document.createElement('canvas');
    canvas.id = 'canvas';

    viewport = document.createElement('div');
    viewport.id = 'viewport';

    mm.appendChild(canvas);
    mm.appendChild(viewport);
    shadow.appendChild(style);
    shadow.appendChild(mm);

    document.body.appendChild(host);

    ctx = canvas.getContext('2d', { alpha: false });

    mm.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      dragging = true;
      dragStartY = e.clientY;
      e.preventDefault();
      handlePointer(e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      e.stopPropagation();
      handlePointer(e.clientY);
    }, { passive: true, capture: true });

    window.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      e.stopPropagation();
      dragging = false;
    }, { passive: true, capture: true });

    mm.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragStartY !== null && Math.abs(e.clientY - dragStartY) < 3) {
        handlePointer(e.clientY);
      }
      dragStartY = null;
    });

    mm.addEventListener('wheel', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const { scrollHeight, viewportHeight } = getMetrics();
      const delta = Math.sign(e.deltaY) * Math.max(24, viewportHeight * 0.15);
      scrollToY(clamp(getMetrics().scrollTop + delta, 0, Math.max(0, scrollHeight - viewportHeight)));
    }, { passive: false });
  }

  function isEventInsideMinimap(e) {
    const path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
    return path.includes(host) || (mm && path.includes(mm));
  }

  function sizeCanvas() {
    const cssW = MM_WIDTH;
    const cssH = host.clientHeight || window.innerHeight || 0;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------------------
  // Active Scroll Container
  // ---------------------------
  function setActive(el) {
    const rootScroll = document.scrollingElement || document.documentElement;
    const newActive = el || rootScroll;
    if (newActive === activeEl) return;

    // Ignore our own UI (host or descendants), but allow ancestors like <body>/<html>
    if (host && (newActive === host || (host.contains && host.contains(newActive)))) return;

    // Only activate visible, scrollable containers (unless it's the document scrolling element)
    if (newActive !== rootScroll && !isVisibleContainer(newActive)) {
      return;
    }

    const prev = activeEl;
    activeEl = newActive;

    if (prev) detachContainerListeners(prev);
    attachContainerListeners();

    cacheInvalidated = true;
    sizeCanvas();
    scheduleRender();
  }

  function isVisibleContainer(node) {
    if (!node || node.nodeType !== 1) return false;
    const cs = getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = node.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    return isScrollable(node);
  }

  function isScrollable(node) {
    if (!node || node.nodeType !== 1) return false;
    const cs = getComputedStyle(node);
    if (cs.display === 'none') return false;

    const overflowY = cs.overflowY;
    const overflowX = cs.overflowX;
    const overflow = cs.overflow;

    const canScrollY = /(auto|scroll)/.test(overflowY) || /(auto|scroll)/.test(overflow);
    const canScrollX = /(auto|scroll)/.test(overflowX) || /(auto|scroll)/.test(overflow);

    if (!canScrollY && !canScrollX) return false;

    const hasScrollableY = node.scrollHeight > Math.ceil(node.clientHeight);
    const hasScrollableX = node.scrollWidth > Math.ceil(node.clientWidth);

    return (canScrollY && hasScrollableY) || (canScrollX && hasScrollableX);
  }

  function findScrollableParent(el) {
    if (!el) return document.scrollingElement || document.documentElement;
    let cur = el;
    while (cur && cur !== document.documentElement) {
      if (cur === document.body) return document.scrollingElement || document.documentElement;
      if (cur === host) return activeEl || (document.scrollingElement || document.documentElement);
      if (isScrollable(cur)) return cur;
      cur = cur.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  // ---------------------------
  // Metrics
  // ---------------------------
  function getMetrics() {
    const scrollingRoot = document.scrollingElement || document.documentElement;

    // Fallback if current active el is missing or detached
    if (!activeEl || !activeEl.isConnected) activeEl = scrollingRoot;

    const isMain = activeEl === scrollingRoot;
    let scrollTop, scrollHeight, viewportHeight, containerRect, containerWidth;

    if (isMain) {
      scrollTop = scrollingRoot.scrollTop || window.pageYOffset || 0;
      scrollHeight = scrollingRoot.scrollHeight || (document.body && document.body.scrollHeight) || 0;
      viewportHeight = window.innerHeight || scrollingRoot.clientHeight || 0;
      containerRect = { top: 0, left: 0 };
      containerWidth = window.innerWidth || scrollingRoot.clientWidth || 1;
    } else {
      scrollTop = activeEl.scrollTop;
      scrollHeight = activeEl.scrollHeight;
      viewportHeight = activeEl.clientHeight;
      containerRect = activeEl.getBoundingClientRect();
      containerWidth = activeEl.clientWidth || 1;
    }

    return { isMain, scrollTop, scrollHeight, viewportHeight, containerRect, containerWidth };
  }

  // ---------------------------
  // Render Scheduling
  // ---------------------------
  function withRAF(fn) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      try {
        fn();
      } catch (err) {
        console.error('[Minimap]', err);
      } finally {
        scheduled = false;
      }
    });
  }

  function scheduleRender() {
    withRAF(render);
  }

  function scheduleRenderLight() {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => withRAF(render), 120);
  }

  // ---------------------------
  // Rendering (Layout-Only)
  // ---------------------------
  function render() {
    if (!ctx) return;

    const cssW = canvas.clientWidth || 0;
    const cssH = canvas.clientHeight || 0;
    if (cssW === 0 || cssH === 0) return;

    // Clear
    ctx.fillStyle = 'rgba(18,18,22,0.9)';
    ctx.fillRect(0, 0, cssW, cssH);

    const { isMain, scrollHeight, containerRect, containerWidth } = getMetrics();
    const scaleY = cssH / Math.max(1, scrollHeight);
    const root = isMain ? (document.body || document.documentElement) : activeEl;

    if (!root || !root.querySelectorAll) {
      updateViewport();
      return;
    }

    // Cache elements per container
    if (cacheInvalidated) {
      try {
        cachedElements = Array.from(root.querySelectorAll(SELECTORS))
          .filter(el => isVisibleElement(el));
      } catch {
        cachedElements = [];
      }
      cacheInvalidated = false;
    }

    let elements = cachedElements || [];

    if (elements.length > MAX_PER_RENDER) {
      const step = Math.ceil(elements.length / MAX_PER_RENDER);
      elements = elements.filter((_, i) => i % step === 0);
    }

    const cw = Math.max(1, containerWidth);

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      let top, left, height, width;

      if (isMain) {
        const scrollingRoot = document.scrollingElement || document.documentElement;
        top = rect.top + (scrollingRoot.scrollTop || window.pageYOffset || 0);
        left = rect.left;
      } else {
        top = (rect.top - containerRect.top) + activeEl.scrollTop;
        left = (rect.left - containerRect.left) + activeEl.scrollLeft;
      }

      height = rect.height;
      width = rect.width;
      if (height <= 0 || width <= 8) continue;

      const x = Math.max(0, Math.min(cssW, (left / cw) * cssW));
      const w = Math.max(1, Math.min(cssW - x, (width / cw) * cssW));
      const y = Math.max(0, top * scaleY);
      const h = Math.max(1, height * scaleY);

      ctx.fillStyle = colorFor(el.tagName.toLowerCase());
      ctx.fillRect(x, y, w, h);
    }

    updateViewport();
  }

  function isVisibleElement(el) {
    if (!el || el.nodeType !== 1) return false;

    const t = el.tagName;
    if (!t || t === 'SCRIPT' || t === 'STYLE' || t === 'LINK' || t === 'META' || t === 'NOSCRIPT') return false;

    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;

    // Exclude fixed elements (not part of scroll layout mapping)
    if (cs.position === 'fixed') return false;

    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;

    return true;
  }

  function colorFor(tag) {
    switch (tag) {
      case 'h1': return '#5BC0EB';
      case 'h2': return '#4FA8E0';
      case 'h3': return '#3F95D0';
      case 'h4': return '#2E86C1';
      case 'h5': return '#2278B6';
      case 'h6': return '#1B6AA7';
      case 'a': return '#4EC9B0';
      case 'code':
      case 'pre': return '#CE9178';
      case 'blockquote': return '#7CB342';
      case 'img': return '#C792EA';
      case 'table': return '#A5D6A7';
      case 'ul':
      case 'ol':
      case 'li': return '#B2CCD6';
      case 'section':
      case 'article':
      case 'main':
      case 'aside':
      case 'nav':
      case 'header':
      case 'footer': return '#9CDCFE';
      case 'div': return '#8A8A8A';
      case 'span': return '#6E6E6E';
      case 'iframe': return '#F78C6C';
      default: return '#7A7A7A';
    }
  }

  // ---------------------------
  // Viewport box
  // ---------------------------
  function updateViewport() {
    if (!viewport) return;
    const { scrollTop, scrollHeight, viewportHeight } = getMetrics();
    const canvasH = canvas.clientHeight || 0;
    if (!canvasH || !scrollHeight) {
      viewport.style.top = '0px';
      viewport.style.height = MIN_VP_PX + 'px';
      return;
    }
    const scaleY = canvasH / Math.max(1, scrollHeight);
    const vpTop = Math.max(0, Math.floor(scrollTop * scaleY));
    const vpH = Math.max(MIN_VP_PX, Math.floor(viewportHeight * scaleY));

    viewport.style.top = vpTop + 'px';
    viewport.style.height = vpH + 'px';
  }

  // ---------------------------
  // Pointer -> Scroll
  // ---------------------------
  function handlePointer(clientY) {
    const rect = canvas.getBoundingClientRect();
    const h = Math.max(1, canvas.clientHeight || (rect.bottom - rect.top));
    const y = clamp(clientY - rect.top, 0, h);
    const { scrollHeight, viewportHeight } = getMetrics();
    if (!scrollHeight) return;
    const target = (y / h) * scrollHeight - (viewportHeight / 2);
    scrollToY(clamp(target, 0, Math.max(0, scrollHeight - viewportHeight)));
  }

  function scrollToY(y) {
    const scrollingRoot = document.scrollingElement || document.documentElement;
    const el = (!activeEl || !activeEl.isConnected) ? scrollingRoot : activeEl;
    if (el === scrollingRoot) {
      scrollingRoot.scrollTop = y;
    } else {
      el.scrollTop = y;
    }
  }

  function jumpToPercent(p) {
    const { scrollHeight, viewportHeight } = getMetrics();
    const max = Math.max(0, scrollHeight - viewportHeight);
    scrollToY(p * max);
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  function attachGlobalListeners() {
    let lastHoverCheck = 0;

    // Hover to switch active scroll container (throttled)
    document.addEventListener('mouseover', (e) => {
      if (isEventInsideMinimap(e)) return;

      const now = Date.now();
      if (now - lastHoverCheck < HOVER_THROTTLE_MS) return;
      lastHoverCheck = now;

      const el = findScrollableParent(e.target);
      if (el !== activeEl) setActive(el);
    }, true);

    // Wheel inside nested scrollables also switches
    document.addEventListener('wheel', (e) => {
      if (isEventInsideMinimap(e)) return;
      const el = findScrollableParent(e.target);
      if (el !== activeEl) setActive(el);
    }, { passive: true });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (isEventInsideMinimap(e)) {
        // Allow toggles even if focus is elsewhere
      }
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;

      const key = (e.key || '').toLowerCase();
      const wants = TOGGLE_KEY.toLowerCase();

      // Toggle minimap using configurable shortcut
      if (
        key === wants &&
        (!TOGGLE_MOD.ctrl || e.ctrlKey) &&
        (!TOGGLE_MOD.alt || e.altKey) &&
        (!TOGGLE_MOD.shift || e.shiftKey) &&
        (!TOGGLE_MOD.meta || e.metaKey)
      ) {
        e.preventDefault();
        host.classList.toggle('hidden');
        if (!host.classList.contains('hidden')) {
          // When showing, trigger a render
          cacheInvalidated = true;
          scheduleRender();
        }
        return;
      }

      // Keep number jumps behavior (optional to keep/change)
      if (key >= '0' && key <= '9') {
        e.preventDefault();
        if (key === '1') { jumpToPercent(0); return; }
        if (key === '0') { jumpToPercent(1); return; }
        jumpToPercent(parseInt(key, 10) / 10);
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      sizeCanvas();
      cacheInvalidated = true;
      scheduleRender();
    }, { passive: true });
  }

  function attachContainerListeners() {
    if (!activeEl) return;

    const onScroll = () => scheduleRenderLight();

    const onMut = () => {
      cacheInvalidated = true;
      clearTimeout(mutationDebounce);
      mutationDebounce = setTimeout(() => scheduleRender(), 200);
    };

    // Attach scroll
    const scrollingRoot = document.scrollingElement || document.documentElement;
    if (activeEl === scrollingRoot) {
      const options = { passive: true, capture: true };
      window.addEventListener('scroll', onScroll, options);
      activeEl.__mmScrollHandler = onScroll;
      activeEl.__mmScrollOptions = options;
    } else {
      const options = { passive: true };
      activeEl.addEventListener('scroll', onScroll, options);
      activeEl.__mmScrollHandler = onScroll;
      activeEl.__mmScrollOptions = options;
    }

    // Observe size + DOM changes
    const observeTarget = (activeEl === scrollingRoot ? (document.body || document.documentElement) : activeEl);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        cacheInvalidated = true;
        scheduleRender();
      });
      try { ro.observe(observeTarget); } catch { }
      activeEl.__mmResizeObserver = ro;
    }

    const mo = new MutationObserver(onMut);
    try { mo.observe(observeTarget, { childList: true, subtree: true, attributes: true }); } catch { }
    activeEl.__mmMutObserver = mo;
  }

  function detachContainerListeners(target) {
    const prev = target || (document.scrollingElement || document.documentElement);

    if (prev.__mmResizeObserver) {
      try { prev.__mmResizeObserver.disconnect(); } catch { }
      delete prev.__mmResizeObserver;
    }

    if (prev.__mmMutObserver) {
      try { prev.__mmMutObserver.disconnect(); } catch { }
      delete prev.__mmMutObserver;
    }

    if (prev.__mmScrollHandler) {
      const scrollingRoot = document.scrollingElement || document.documentElement;
      const isMain = prev === scrollingRoot;
      const scrollTarget = isMain ? window : prev;
      const options = prev.__mmScrollOptions || (isMain ? { capture: true } : undefined);
      try {
        scrollTarget.removeEventListener('scroll', prev.__mmScrollHandler, options);
      } catch (_) {
        scrollTarget.removeEventListener('scroll', prev.__mmScrollHandler);
      }
      delete prev.__mmScrollHandler;
      delete prev.__mmScrollOptions;
    }
  }

  // ---------------------------
  // Start
  // ---------------------------
  if (isExcluded(location)) return;
  startWhenSafe();
})();