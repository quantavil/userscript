// ==UserScript==
// @name         Mobile Video Controller 
// @namespace    https://github.com/quantavil/userscript
// @version      26.1.1
// @description  Modern mobile-friendly video controller: Shadow DOM + adoptedStyleSheets, Popover API menus, CSS Anchor Positioning, event-driven (no heavy DOM observers/polling).
// @match        *://*/*
// @grant        none
// @license      MIT
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  // Singleton per document without global window flags
  if (document.getElementById('mvc-2026-host')) return;

  // -----------------------------
  // Utils
  // -----------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function svgIcon(path) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('fill', 'currentColor');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    return svg;
  }

  const ICONS = {
    rewind: "M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z",
    forward: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6-8.5-6z",
    settings:
      "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
  };

  const DEFAULTS = {
    EDGE: 10,
    DEFAULT_RIGHT_OFFSET: 50,

    UI_FADE_TIMEOUT: 3500,
    UI_FADE_OPACITY: 0.15,

    LONG_PRESS_MS: 320,
    DRAG_THRESHOLD: 10,

    SLIDER_SENSITIVITY: 0.003,
    SLIDER_POWER: 1.2,
    SNAP_POINTS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3],
    SNAP_THRESHOLD: 0.05,

    SPEEDS: [0, 1, 1.25, 1.5, 1.75, 2],
    SKIPS: [5, 10, 15, 30, 60],

    // interaction guards
    CLICK_SUPPRESS_MS: 800,

    // self-correct thrash protection
    SELFCORRECT_WINDOW_MS: 2000,
    SELFCORRECT_MAX_CORRECTIONS: 6,
    SELFCORRECT_SUSPEND_MS: 5000,
  };

  // VisualViewport helpers:
  // - clientX/clientY + getBoundingClientRect are in VISUAL viewport coords
  // - position: fixed uses the LAYOUT viewport as its reference
  // So: to place fixed elements aligned with visual viewport, add visualViewport offsets.
  const VV = () => window.visualViewport || null;
  function vvOffsets() {
    const v = VV();
    return v
      ? { ox: v.offsetLeft, oy: v.offsetTop, vw: v.width, vh: v.height }
      : { ox: 0, oy: 0, vw: innerWidth, vh: innerHeight };
  }

  // -----------------------------
  // Storage
  // -----------------------------
  class Store {
    constructor() {
      this.state = {
        skipSeconds: this.read('skipSeconds', 10),
        selfCorrect: this.read('selfCorrect', false),
        defaultSpeed: this.read('defaultSpeed', 1.0),
        lastRate: this.read('lastRate', 1.0),
      };
    }
    read(key, def) {
      try {
        const v = localStorage.getItem(`mvc_${key}`);
        return v == null ? def : JSON.parse(v);
      } catch { return def; }
    }
    write(key, val) {
      this.state[key] = val;
      try { localStorage.setItem(`mvc_${key}`, JSON.stringify(val)); } catch {}
    }
    preferredRate() {
      const r = Number(this.state.lastRate);
      return Number.isFinite(r) && r > 0 ? r : (Number(this.state.defaultSpeed) || 1);
    }
    setLastRate(rate) {
      const r = clamp(Number(rate) || 1, 0.1, 16);
      this.write('lastRate', r);
    }
  }

  // -----------------------------
  // UI (Shadow DOM + Popover + Anchor Positioning)
  // -----------------------------
  class UI {
    constructor(store) {
      this.store = store;

      this.host = null;
      this.shadow = null;

      this.wrap = null;
      this.panel = null;

      this.btnRew = null;
      this.btnSpeed = null;
      this.btnFwd = null;
      this.btnSettings = null;

      this.toast = null;

      this.popSpeed = null;
      this.popSkip = null;
      this.popSettings = null;

      this.size = { w: 0, h: 0 };

      this.isSpeedSliding = false;
      this.manual = { enabled: false, x: 0, y: 0 };

      this.skipMenuDir = 1;

      this._hideTimer = 0;
      this._toastTimer = 0;
    }

    init() {
      // host in the main DOM so popovers/top-layer work normally
      this.host = document.createElement('div');
      this.host.id = 'mvc-2026-host';
      this.host.style.position = 'fixed';
      this.host.style.inset = '0';
      this.host.style.zIndex = '2147483647';
      this.host.style.pointerEvents = 'none';

      this.shadow = this.host.attachShadow({ mode: 'open' });

      const sheet = new CSSStyleSheet();
      sheet.replaceSync(this.cssText());
      this.shadow.adoptedStyleSheets = [sheet];

      const root = document.createElement('div');
      root.className = 'root';

      this.wrap = document.createElement('div');
      this.wrap.className = 'wrap';
      this.wrap.style.display = 'none';

      this.panel = document.createElement('div');
      this.panel.className = 'panel';

      this.btnRew = this.btn(svgIcon(ICONS.rewind), 'Rewind');
      this.btnRew.classList.add('btn', 'rew');

      this.btnSpeed = this.btn('1.00', 'Playback speed');
      this.btnSpeed.classList.add('btn', 'speed');

      this.btnFwd = this.btn(svgIcon(ICONS.forward), 'Forward');
      this.btnFwd.classList.add('btn', 'fwd');

      this.btnSettings = this.btn(svgIcon(ICONS.settings), 'Settings');
      this.btnSettings.classList.add('btn', 'set');

      this.panel.append(this.btnRew, this.btnSpeed, this.btnFwd, this.btnSettings);
      this.wrap.append(this.panel);

      this.toast = document.createElement('div');
      this.toast.className = 'toast';

      // Popovers (anchored with CSS, no JS placement)
      this.popSpeed = this.mkPopover('pop speed');
      this.popSkip = this.mkPopover('pop skip');
      this.popSettings = this.mkPopover('pop settings');

      this.fillSpeedPopover();
      this.fillSkipPopover();
      this.fillSettingsPopover();

      root.append(this.wrap, this.toast, this.popSpeed, this.popSkip, this.popSettings);
      this.shadow.append(root);

      document.body.appendChild(this.host);

      // Measure controller
      this.wrap.style.display = 'block';
      this.wrap.style.opacity = '0';
      const r = this.wrap.getBoundingClientRect();
      this.size = { w: r.width, h: r.height };
      this.wrap.style.opacity = '';
      this.wrap.style.display = 'none';

      this.setSkipTitles();
      this.updateSkipActive();
    }

    destroy() {
      clearTimeout(this._hideTimer);
      clearTimeout(this._toastTimer);
      this.host?.remove();
    }

    cssText() {
      // Anchor Positioning:
      // - Buttons define anchor-name
      // - Popovers use position-anchor + anchor() for placement
      // NOTE: Use absolute positioning inside the host so it works consistently
      // when the host is moved into a fullscreen element (fixes fixed-in-fullscreen quirks).
      return `
        :host { all: initial; }
        .root {
          position: absolute;
          inset: 0;
          pointer-events: none;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }

        .wrap {
          position: absolute;
          left: 0; top: 0;
          opacity: 0;
          transition: opacity .35s ease;
          pointer-events: auto;
          will-change: left, top, opacity;
        }

        .panel {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px;
          border-radius: 14px;
          background: rgba(20,20,20,.65);
          border: 1px solid rgba(255,255,255,.10);
          backdrop-filter: blur(14px);
          user-select: none;
          touch-action: none;
          cursor: grab;
        }

        .btn {
          appearance: none;
          border: 0;
          border-radius: 12px;
          width: 44px;
          height: 34px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,.10);
          color: #fff;
          transition: transform .12s ease, background .2s ease;
          touch-action: none;
          user-select: none;
        }
        .btn:active { transform: scale(.92); background: rgba(255,255,255,.18); }

        .btn.speed {
          width: auto;
          padding: 0 12px;
          min-width: 56px;
          font-size: 12px;
          font-weight: 750;
          color: #40c4ff;
          border: 1px solid rgba(64,196,255,.35);
          background: rgba(64,196,255,.10);
          anchor-name: --mvc-speed;
        }
        .btn.rew { color: #ff5252; anchor-name: --mvc-rew; }
        .btn.fwd { color: #69f0ae; anchor-name: --mvc-fwd; }
        .btn.set { color: rgba(255,255,255,.88); anchor-name: --mvc-settings; }

        .snapped { color: #ffea00 !important; border-color: #ffea00 !important; }

        .toast {
          position: absolute;
          left: 50%;
          top: 20%;
          translate: -50% -50%;
          padding: 10px 16px;
          border-radius: 16px;
          background: rgba(20,20,20,.85);
          border: 1px solid rgba(255,255,255,.10);
          backdrop-filter: blur(14px);
          color: #fff;
          font-size: 14px;
          opacity: 0;
          transition: opacity .2s ease, color .2s ease;
          pointer-events: none;
          will-change: opacity, left, top;
        }
        .toast.speedMode {
          font-size: 18px;
          font-weight: 800;
          padding: 8px 14px;
          border-radius: 12px;
        }
        .toast.snapped { color: #69f0ae; }

        .pop {
          position: absolute;
          inset: auto;
          margin: 0;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          background: rgba(28,28,30,.95);
          backdrop-filter: blur(18px);
          color: #fff;
          padding: 6px;
          box-shadow: 0 12px 48px rgba(0,0,0,.6);
          max-height: 70vh;
          overflow: auto;
          pointer-events: auto;
          width: max-content;
          min-width: 140px;

          /* Anchor placement (default below, flip if needed) */
          top: anchor(bottom);
          left: anchor(center);
          translate: -50% 8px;
          position-try-fallbacks: flip-block;
        }

        /* Each popover uses a different anchor by default */
        .pop.speed    { position-anchor: --mvc-speed; }
        .pop.settings { position-anchor: --mvc-settings; }

        /* Skip popover anchor is switched dynamically between --mvc-rew / --mvc-fwd */
        .pop.skip     { position-anchor: --mvc-rew; min-width: 240px; }

        .opt {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 15px;
          text-align: center;
          background: transparent;
          border: 0;
          width: 100%;
          color: #fff;
        }
        .opt:active { background: rgba(255,255,255,.12); }

        .skipRow {
          display: flex;
          gap: 6px;
          padding: 6px;
        }
        .skipRow .opt {
          width: auto;
          flex: 1;
          background: rgba(255,255,255,.10);
          font-weight: 700;
        }
        .skipRow .opt.active {
          background: rgba(105,240,174,.22);
          outline: 1px solid rgba(105,240,174,.55);
        }

        .settings .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px;
          border-radius: 12px;
          min-width: 260px;
        }
        .settings .rowTitle { font-size: 13px; opacity: .92; }
        .settings .hdrTitle { font-size: 13px; font-weight: 750; opacity: .95; }
        .settings input {
          width: 64px;
          height: 30px;
          border-radius: 10px;
          border: 0;
          outline: none;
          text-align: center;
          background: rgba(255,255,255,.12);
          color: #fff;
          font-size: 13px;
        }
        .settings .miniBtn {
          width: 34px;
          height: 30px;
          border-radius: 10px;
          border: 0;
          background: rgba(255,255,255,.12);
          color: #fff;
          font-size: 16px;
          display: grid;
          place-items: center;
        }
        .settings .miniBtn:active { background: rgba(255,255,255,.20); }
      `;
    }

    btn(content, title) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = title;
      if (content instanceof Element) b.appendChild(content);
      else b.textContent = content;
      return b;
    }

    mkPopover(className) {
      const d = document.createElement('div');
      d.className = className;
      d.popover = 'auto';
      return d;
    }

    fillSpeedPopover() {
      this.popSpeed.textContent = '';
      for (const sp of DEFAULTS.SPEEDS) {
        const opt = document.createElement('button');
        opt.className = 'opt';
        opt.type = 'button';
        opt.dataset.rate = String(sp);
        opt.textContent = (sp === 0) ? 'Pause' : `${sp.toFixed(2)}x`;
        if (sp === 0) opt.style.color = '#89cff0';
        this.popSpeed.appendChild(opt);
      }
      const custom = document.createElement('button');
      custom.className = 'opt';
      custom.type = 'button';
      custom.dataset.custom = '1';
      custom.textContent = '✎ Custom…';
      custom.style.color = '#c5a5ff';
      custom.style.fontWeight = '700';
      this.popSpeed.appendChild(custom);
    }

    fillSkipPopover() {
      this.popSkip.textContent = '';
      const row = document.createElement('div');
      row.className = 'skipRow';
      for (const s of DEFAULTS.SKIPS) {
        const opt = document.createElement('button');
        opt.className = 'opt';
        opt.type = 'button';
        opt.dataset.skip = String(s);
        opt.textContent = `${s}s`;
        row.appendChild(opt);
      }
      this.popSkip.appendChild(row);
    }

    fillSettingsPopover() {
      this.popSettings.textContent = '';
      this.popSettings.classList.add('settings');

      // header: title + close (fix: missing title)
      {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.justifyContent = 'space-between';

        const title = document.createElement('div');
        title.className = 'hdrTitle';
        title.textContent = 'Settings';

        const close = document.createElement('button');
        close.className = 'miniBtn';
        close.title = 'Close';
        close.dataset.close = '1';
        close.appendChild(svgIcon(ICONS.close));

        row.append(title, close);
        this.popSettings.appendChild(row);
      }

      // self-correct
      {
        const row = document.createElement('div');
        row.className = 'row';
        const title = document.createElement('div');
        title.className = 'rowTitle';
        title.textContent = 'Self-correct speed';
        const btn = document.createElement('button');
        btn.className = 'miniBtn';
        btn.style.width = '78px';
        btn.dataset.selfCorrect = '1';
        btn.textContent = this.store.state.selfCorrect ? 'On' : 'Off';
        row.append(title, btn);
        this.popSettings.appendChild(row);
      }

      // steppers
      this.addStepper({
        key: 'defaultSpeed',
        title: 'Default speed',
        step: 0.05,
        min: 0.1,
        max: 16,
        format: (v) => Number(v).toFixed(2),
        parse: (s) => Number(s)
      });
      this.addStepper({
        key: 'skipSeconds',
        title: 'Skip seconds',
        step: 1,
        min: 1,
        max: 600,
        format: (v) => String(Math.trunc(Number(v))),
        parse: (s) => Math.trunc(Number(s))
      });
    }

    addStepper({ key, title, step, min, max, format, parse }) {
      const row = document.createElement('div');
      row.className = 'row';

      const t = document.createElement('div');
      t.className = 'rowTitle';
      t.textContent = title;

      const minus = document.createElement('button');
      minus.className = 'miniBtn';
      minus.textContent = '−';
      minus.dataset.step = `${key}:-`;

      const input = document.createElement('input');
      input.value = format(this.store.state[key]);
      input.dataset.input = key;
      input.inputMode = key === 'skipSeconds' ? 'numeric' : 'decimal';

      const plus = document.createElement('button');
      plus.className = 'miniBtn';
      plus.textContent = '+';
      plus.dataset.step = `${key}:+`;

      row.append(t, minus, input, plus);
      this.popSettings.appendChild(row);

      // store config for controller handlers
      input._mvcStepper = { key, step, min, max, format, parse };
    }

    setSkipTitles() {
      const s = this.store.state.skipSeconds;
      this.btnRew.title = `Rewind ${s}s`;
      this.btnFwd.title = `Forward ${s}s`;
    }

    updateSkipActive() {
      const s = String(Number(this.store.state.skipSeconds) || 10);
      const btns = this.popSkip.querySelectorAll('button[data-skip]');
      for (const b of btns) b.classList.toggle('active', b.dataset.skip === s);
    }

    updateSpeedButton(video) {
      if (!video) { this.btnSpeed.textContent = '1.00'; return; }
      if (video.ended) this.btnSpeed.textContent = 'Replay';
      else if (video.paused) this.btnSpeed.textContent = '▶';
      else this.btnSpeed.textContent = Number(video.playbackRate).toFixed(2);
    }

    show(interacting = false) {
      if (!this.wrap) return;
      this.wrap.style.display = 'block';
      this.wrap.style.opacity = '1';
      clearTimeout(this._hideTimer);
      if (!interacting) {
        this._hideTimer = setTimeout(() => this.dimIfAllowed(), DEFAULTS.UI_FADE_TIMEOUT);
      }
    }

    dimIfAllowed() {
      if (!this.wrap) return;
      const anyOpen = this.popSpeed.matches(':popover-open') ||
                      this.popSkip.matches(':popover-open') ||
                      this.popSettings.matches(':popover-open');
      if (anyOpen) return;
      this.wrap.style.opacity = String(DEFAULTS.UI_FADE_OPACITY);
    }

    hide() {
      if (!this.wrap) return;
      this.wrap.style.display = 'none';
    }

    toastShow(msg, { x, y, speedMode = false, snapped = false, ms = 900 } = {}) {
      const { ox, oy, vw, vh } = vvOffsets();
      const left = (x == null) ? (ox + vw / 2) : x;
      const top = (y == null) ? (oy + vh * 0.20) : y;

      this.toast.className = 'toast' + (speedMode ? ' speedMode' : '') + (snapped ? ' snapped' : '');
      this.toast.style.left = `${left}px`;
      this.toast.style.top = `${top}px`;
      this.toast.textContent = msg;
      this.toast.style.opacity = '1';

      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toast.style.opacity = '0'; }, ms);
    }

    ensureOverlayContainer() {
      const fs = document.fullscreenElement;

      if (fs instanceof HTMLVideoElement) {
        if (this.host.parentElement !== document.body) document.body.appendChild(this.host);
        this.host.style.position = 'fixed';
        return;
      }

      if (fs) {
        if (this.host.parentElement !== fs) fs.appendChild(this.host);
        // Avoid fixed-in-non-root-fullscreen quirks:
        this.host.style.position = 'absolute';
      } else {
        if (this.host.parentElement !== document.body) document.body.appendChild(this.host);
        this.host.style.position = 'fixed';
      }
    }

    clampToViewport(x, y) {
      const { ox, oy, vw, vh } = vvOffsets();
      const minX = ox + DEFAULTS.EDGE;
      const maxX = ox + vw - this.size.w - DEFAULTS.EDGE;
      const minY = oy + DEFAULTS.EDGE;
      const maxY = oy + vh - this.size.h - DEFAULTS.EDGE;
      return { x: clamp(x, minX, maxX), y: clamp(y, minY, maxY) };
    }

    placeAt(x, y) {
      const p = this.clampToViewport(x, y);
      this.wrap.style.left = `${Math.round(p.x)}px`;
      this.wrap.style.top = `${Math.round(p.y)}px`;
    }

    autoPlaceForVideo(video) {
      if (!video || this.manual.enabled) return;

      const { ox, oy, vh } = vvOffsets();
      const r = video.getBoundingClientRect(); // visual viewport coords
      const desiredX = ox + r.left + r.width - this.size.w - DEFAULTS.DEFAULT_RIGHT_OFFSET;
      let desiredY = oy + r.top + r.height - this.size.h - 10;

      // Use visual viewport size (fix: mismatch with pinch-zoom)
      if (r.height > vh * 0.7) desiredY -= 82;

      this.placeAt(desiredX, desiredY);
    }

    setSkipPopoverAnchor(anchorName /* '--mvc-rew' | '--mvc-fwd' */) {
      this.popSkip.style.setProperty('position-anchor', anchorName);
    }
  }

  // -----------------------------
  // Controller
  // -----------------------------
  class Controller {
    constructor() {
      this.store = new Store();
      this.ui = new UI(this.store);

      this.activeVideo = null;

      this._globalAbort = new AbortController();
      this._videoAbort = null;

      this._ro = null;
      this._io = null;

      this._rafPending = false;
      this._videoVisible = true;

      // guards for long-press skip menu (avoid immediate click skip)
      this._skipMenuOpenedAt = 0;
      this._skipMenuSource = null;

      // suppress speed click after long-press/drag (fix double action)
      this._suppressSpeedClickUntil = 0;

      // applyDefaultSpeed once per video
      this._defaultApplied = new WeakSet();

      // self-correct thrash protection per video
      // { times: number[], suspendedUntil: number }
      this._selfCorrectState = new WeakMap();
    }

    init() {
      this.ui.init();
      this.ui.ensureOverlayContainer();

      // Global events: choose active video based on user intent
      document.addEventListener('play', (e) => {
        const v = e.target;
        if (v instanceof HTMLVideoElement) this.setActiveVideo(v);
      }, { capture: true, signal: this._globalAbort.signal });

      document.addEventListener('loadedmetadata', (e) => {
        const v = e.target;
        if (v instanceof HTMLVideoElement) {
          this.applyDefaultSpeed(v);
          if (!this.activeVideo) this.setActiveVideo(v);
        }
      }, { capture: true, signal: this._globalAbort.signal });

      document.addEventListener('pointerdown', (e) => {
        if (!e.isTrusted) return;
        const t = e.target;
        if (!(t instanceof Element)) return;

        const vid = t.tagName === 'VIDEO' ? t : t.closest('video');
        if (vid instanceof HTMLVideoElement) this.setActiveVideo(vid);

        const inUI = this.ui.host.contains(t);
        if (inUI || vid) this.ui.show(true);
      }, { capture: true, passive: true, signal: this._globalAbort.signal });

      document.addEventListener('fullscreenchange', () => {
        this.ui.ensureOverlayContainer();
        this.scheduleReposition();

        // If fullscreen element is <video>, hide controller (overlays not reliable there)
        if (document.fullscreenElement instanceof HTMLVideoElement) this.ui.hide();
        else this.ui.show(true);
      }, { signal: this._globalAbort.signal });

      const onViewportChange = () => {
        // small perf guard: if no active video or it is not visible, no need to reposition
        if (!this.activeVideo || !this._videoVisible) return;
        this.scheduleReposition();
      };
      window.addEventListener('scroll', onViewportChange, { passive: true, signal: this._globalAbort.signal });
      window.addEventListener('resize', onViewportChange, { passive: true, signal: this._globalAbort.signal });
      if (VV()) {
        VV().addEventListener('resize', onViewportChange, { passive: true, signal: this._globalAbort.signal });
        VV().addEventListener('scroll', onViewportChange, { passive: true, signal: this._globalAbort.signal });
      }

      this.attachUIHandlers();

      // Initial: pick a reasonable video if present
      queueMicrotask(() => {
        const v = this.pickLargestVisibleVideo();
        if (v) this.setActiveVideo(v);
      });
    }

    destroy() {
      this._globalAbort.abort();
      this._videoAbort?.abort();
      this._ro?.disconnect();
      this._io?.disconnect();
      this.ui.destroy();
    }

    scheduleReposition() {
      if (this._rafPending) return;
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        this.reposition();
      });
    }

    reposition() {
      const v = this.activeVideo;
      if (!v || !v.isConnected) return;

      // Hide when fullscreen element is <video>
      if (document.fullscreenElement instanceof HTMLVideoElement) return;

      if (this.ui.manual.enabled) {
        const p = this.ui.clampToViewport(this.ui.manual.x, this.ui.manual.y);
        this.ui.manual.x = p.x;
        this.ui.manual.y = p.y;
        this.ui.placeAt(p.x, p.y);
      } else {
        this.ui.autoPlaceForVideo(v);
      }
    }

    pickLargestVisibleVideo() {
      const vids = [...document.querySelectorAll('video')].filter(v => v.isConnected);
      const { vw, vh } = vvOffsets(); // visual viewport size (fix pinch-zoom mismatch)

      let best = null, bestArea = 0;
      for (const v of vids) {
        const r = v.getBoundingClientRect();
        if (r.width < 120 || r.height < 90) continue;
        if (r.bottom < 0 || r.right < 0 || r.top > vh || r.left > vw) continue;
        const area = r.width * r.height;
        if (area > bestArea) { bestArea = area; best = v; }
      }
      return best;
    }

    setActiveVideo(v) {
      if (!(v instanceof HTMLVideoElement)) return;
      if (this.activeVideo === v) return;

      this._videoAbort?.abort();
      this._videoAbort = new AbortController();

      this._ro?.disconnect();
      this._io?.disconnect();

      this.activeVideo = v;

      this.ui.ensureOverlayContainer();

      // In video-element fullscreen, controller is hidden by fullscreenchange handler
      if (!(document.fullscreenElement instanceof HTMLVideoElement)) {
        this.ui.updateSpeedButton(v);
        this.ui.show(true);
        this.scheduleReposition();
      }

      // Video events (per-active video controller)
      v.addEventListener('ratechange', () => {
        this.ui.updateSpeedButton(v);
        if (!this.ui.isSpeedSliding) {
          this.ui.show(false);
          this.applySelfCorrect();
        }
      }, { signal: this._videoAbort.signal });

      v.addEventListener('pause', () => { this.ui.updateSpeedButton(v); this.ui.show(false); }, { signal: this._videoAbort.signal });
      v.addEventListener('play', () => { this.ui.updateSpeedButton(v); this.ui.show(false); }, { signal: this._videoAbort.signal });

      v.addEventListener('ended', () => {
        const ds = Number(this.store.state.defaultSpeed) || 1;
        v.playbackRate = ds;
        this.store.setLastRate(ds);
        this.ui.updateSpeedButton(v);
        this.ui.show(false);
      }, { signal: this._videoAbort.signal });

      // Layout changes affecting position
      this._ro = new ResizeObserver(() => this.scheduleReposition());
      this._ro.observe(v);

      this._io = new IntersectionObserver((entries) => {
        const e = entries[0];
        if (!e) return;
        this._videoVisible = !!e.isIntersecting;
        if (!e.isIntersecting) this.ui.hide();
        else { this.ui.show(false); this.scheduleReposition(); }
      }, { threshold: 0.05 });
      this._io.observe(v);

      this.applyDefaultSpeed(v);
    }

    applyDefaultSpeed(v) {
      const ds = Number(this.store.state.defaultSpeed) || 1;
      if (ds === 1) return;
      if (this._defaultApplied.has(v)) return;

      // Apply only if video is still basically at default rate and not already altered
      if (Math.abs(v.playbackRate - 1) < 0.05) {
        v.playbackRate = ds;
        this.store.setLastRate(ds);
      }
      this._defaultApplied.add(v);
    }

    _getSelfCorrectState(v) {
      let st = this._selfCorrectState.get(v);
      if (!st) {
        st = { times: [], suspendedUntil: 0 };
        this._selfCorrectState.set(v, st);
      }
      return st;
    }

    applySelfCorrect() {
      const v = this.activeVideo;
      if (!v) return;
      if (!this.store.state.selfCorrect) return;
      if (this.ui.isSpeedSliding) return;
      if (v.seeking) return;

      const st = this._getSelfCorrectState(v);
      const now = Date.now();
      if (now < st.suspendedUntil) return;

      const target = this.store.preferredRate();
      if (Math.abs(v.playbackRate - target) <= 0.1) return;

      // Thrash protection: if we correct too often in a short window, back off.
      st.times = st.times.filter(t => now - t < DEFAULTS.SELFCORRECT_WINDOW_MS);
      st.times.push(now);
      if (st.times.length > DEFAULTS.SELFCORRECT_MAX_CORRECTIONS) {
        st.times.length = 0;
        st.suspendedUntil = now + DEFAULTS.SELFCORRECT_SUSPEND_MS;
        return;
      }

      v.playbackRate = target;
    }

    // Actions
    skip(dir, seconds = null) {
      const v = this.activeVideo;
      if (!v) return;
      const s = seconds ?? (Number(this.store.state.skipSeconds) || 10);
      const dur = Number.isFinite(v.duration) ? v.duration : Infinity;
      v.currentTime = clamp(v.currentTime + dir * s, 0, dur);
    }

    togglePlayPauseReplay() {
      const v = this.activeVideo;
      if (!v) return;

      if (v.ended) {
        v.currentTime = 0;
        v.playbackRate = this.store.preferredRate();
        v.play().catch(() => {});
        return;
      }

      if (v.paused) {
        v.playbackRate = this.store.preferredRate();
        v.play().catch(() => {});
      } else {
        this.store.setLastRate(v.playbackRate);
        v.pause();
      }
    }

    resetSpeedTo1() {
      const v = this.activeVideo;
      if (!v) return;
      v.playbackRate = 1;
      this.store.setLastRate(1);
      this.ui.updateSpeedButton(v);
      this.ui.toastShow('Speed reset to 1.00x', { ms: 900 });
    }

    // -----------------------------
    // UI Handlers
    // -----------------------------
    attachUIHandlers() {
      // Popover toggle => restart fade timer on browser light-dismiss/Escape
      const onPopToggle = (e) => {
        if (e.newState === 'open') {
          if (e.target === this.ui.popSkip) this.ui.updateSkipActive();
          this.ui.show(true);
        } else {
          this.ui.show(false);
        }
      };
      this.ui.popSpeed.addEventListener('toggle', onPopToggle);
      this.ui.popSkip.addEventListener('toggle', onPopToggle);
      this.ui.popSettings.addEventListener('toggle', onPopToggle);

      // Rewind / Forward:
      this.ui.btnRew.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.ui.show(true);
        if (this._wasSkipMenuJustOpenedFrom(this.ui.btnRew)) return;
        this.skip(-1);
      });

      this.ui.btnFwd.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.ui.show(true);
        if (this._wasSkipMenuJustOpenedFrom(this.ui.btnFwd)) return;
        this.skip(+1);
      });

      this.setupLongPressSkip(this.ui.btnRew, -1, '--mvc-rew');
      this.setupLongPressSkip(this.ui.btnFwd, +1, '--mvc-fwd');

      // Skip popover
      this.ui.popSkip.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const s = Number(t.dataset.skip);
        if (!Number.isFinite(s)) return;
        this.skip(this.ui.skipMenuDir, s);
        this.store.write('skipSeconds', s);
        this.ui.setSkipTitles();
        this.ui.updateSkipActive();
        this.ui.toastShow(`Skipped ${s}s`, { ms: 800 });
        this.ui.popSkip.hidePopover();
      });

      // Speed button:
      // - drag up/down => slider
      // - long press => reset to 1x
      // - click => if paused/ended toggle, else open popover
      this.attachSpeedSlider(this.ui.btnSpeed);

      this.ui.btnSpeed.addEventListener('click', (e) => {
        // block click after long-press/drag (fix double action)
        if (Date.now() < this._suppressSpeedClickUntil) {
          e.preventDefault(); e.stopPropagation();
          return;
        }

        e.preventDefault(); e.stopPropagation();
        const v = this.activeVideo;
        if (!v) return;

        this.ui.show(true);
        if (v.paused || v.ended) {
          this.togglePlayPauseReplay();
        } else {
          this.ui.popSpeed.togglePopover();
        }
      });

      this.ui.popSpeed.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const v = this.activeVideo;
        if (!v) return;

        if (t.dataset.custom) {
          const r = prompt('Enter custom speed (0.1–16):', String(v.playbackRate));
          if (!r) return;
          const val = Number(r);
          if (!Number.isFinite(val) || val <= 0 || val > 16) return;
          v.playbackRate = val;
          this.store.setLastRate(val);
          this.ui.toastShow(`${val.toFixed(2)}x Speed`, { ms: 900 });
          this.ui.popSpeed.hidePopover();
          return;
        }

        const rate = Number(t.dataset.rate);
        if (!Number.isFinite(rate)) return;

        if (rate === 0) {
          this.store.setLastRate(v.playbackRate);
          v.pause();
          this.ui.toastShow('Paused', { ms: 700 });
        } else {
          v.playbackRate = rate;
          this.store.setLastRate(rate);
          if (v.paused) v.play().catch(() => {});
          this.ui.toastShow(`${rate.toFixed(2)}x Speed`, { ms: 900 });
        }
        this.ui.popSpeed.hidePopover();
      });

      // Settings popover
      this.ui.btnSettings.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.ui.show(true);
        this.ui.popSettings.togglePopover();
      });

      this.ui.popSettings.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;

        if (t.dataset.close) {
          this.ui.popSettings.hidePopover();
          return;
        }

        if (t.dataset.selfCorrect) {
          this.store.write('selfCorrect', !this.store.state.selfCorrect);
          t.textContent = this.store.state.selfCorrect ? 'On' : 'Off';
          return;
        }

        const step = t.dataset.step;
        if (!step) return;

        const [key, dir] = step.split(':');
        const input = this.ui.popSettings.querySelector(`input[data-input="${key}"]`);
        if (!(input instanceof HTMLInputElement)) return;

        const cfg = input._mvcStepper;
        if (!cfg) return;

        const cur = cfg.parse(input.value);
        const base = Number.isFinite(cur) ? cur : cfg.parse(this.store.state[key]);

        const next = clamp(base + (dir === '+' ? cfg.step : -cfg.step), cfg.min, cfg.max);
        input.value = cfg.format(next);

        this.store.write(key, next);
        if (key === 'skipSeconds') {
          this.ui.setSkipTitles();
          this.ui.updateSkipActive();
        }
      });

      this.ui.popSettings.addEventListener('change', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLInputElement)) return;
        const key = t.dataset.input;
        if (!key) return;

        const cfg = t._mvcStepper;
        if (!cfg) return;

        const val = cfg.parse(t.value);
        if (!Number.isFinite(val) || val < cfg.min || val > cfg.max) {
          t.value = cfg.format(this.store.state[key]);
          return;
        }

        this.store.write(key, val);
        if (key === 'skipSeconds') {
          this.ui.setSkipTitles();
          this.ui.updateSkipActive();
        }
      });

      // Drag controller (panel only; avoid fighting button interactions)
      this.ui.panel.addEventListener('pointerdown', (e) => {
        const target = e.target;
        if (target instanceof Element && target.closest('button')) return;

        e.preventDefault(); e.stopPropagation();
        this.ui.show(true);

        // Pointer capture avoids window listeners (fix leak edge case)
        try { this.ui.panel.setPointerCapture(e.pointerId); } catch {}

        const startX = e.clientX;
        const startY = e.clientY;

        const left0 = parseFloat(this.ui.wrap.style.left) || 0;
        const top0 = parseFloat(this.ui.wrap.style.top) || 0;

        let dragging = false;

        const onMove = (ev) => {
          ev.preventDefault();

          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          if (!dragging && Math.hypot(dx, dy) > DEFAULTS.DRAG_THRESHOLD) dragging = true;
          if (!dragging) return;

          this.ui.manual.enabled = true;
          this.ui.manual.x = left0 + dx;
          this.ui.manual.y = top0 + dy;
          this.scheduleReposition();
        };

        const cleanup = () => {
          this.ui.panel.removeEventListener('pointermove', onMove);
          this.ui.panel.removeEventListener('pointerup', onUp);
          this.ui.panel.removeEventListener('pointercancel', onUp);
          this.ui.panel.removeEventListener('lostpointercapture', onUp);
          try { this.ui.panel.releasePointerCapture(e.pointerId); } catch {}
        };

        const onUp = () => {
          cleanup();
          this.ui.show(false);
        };

        this.ui.panel.addEventListener('pointermove', onMove, { passive: false });
        this.ui.panel.addEventListener('pointerup', onUp, { passive: true });
        this.ui.panel.addEventListener('pointercancel', onUp, { passive: true });
        this.ui.panel.addEventListener('lostpointercapture', onUp, { passive: true });
      }, { passive: false });
    }

    _wasSkipMenuJustOpenedFrom(btn) {
      return this._skipMenuSource === btn && (Date.now() - this._skipMenuOpenedAt < 650);
    }

    setupLongPressSkip(btn, dir, anchorName) {
      let timer = 0;
      let longPressed = false;

      btn.addEventListener('pointerdown', (e) => {
        // Don't preventDefault here; it can suppress click on some platforms
        e.stopPropagation();

        longPressed = false;
        clearTimeout(timer);

        timer = setTimeout(() => {
          longPressed = true;
          this._skipMenuOpenedAt = Date.now();
          this._skipMenuSource = btn;

          this.ui.skipMenuDir = dir;
          this.ui.setSkipPopoverAnchor(anchorName);
          this.ui.updateSkipActive();
          this.ui.popSkip.showPopover();
        }, DEFAULTS.LONG_PRESS_MS);
      });

      const clear = () => clearTimeout(timer);
      btn.addEventListener('pointerup', clear);
      btn.addEventListener('pointercancel', clear);
      btn.addEventListener('pointerleave', clear);

      // Block click after long press (browser still dispatches click sometimes)
      btn.addEventListener('click', (e) => {
        if (!longPressed) return;
        e.preventDefault();
        e.stopPropagation();
      }, true);
    }

    attachSpeedSlider(btn) {
      btn.addEventListener('pointerdown', (e) => {
        // Don't preventDefault on pointerdown; it can suppress click.
        e.stopPropagation();

        const v = this.activeVideo;
        if (!v) return;

        // Ensure we reliably get pointerup/cancel without window listeners
        try { btn.setPointerCapture(e.pointerId); } catch {}

        let longTimer = 0;
        let sliding = false;

        const startY = e.clientY;
        const startRate = v.playbackRate;

        const { ox, oy } = vvOffsets();
        const vr = v.getBoundingClientRect();
        const toastX = ox + vr.left + vr.width / 2;
        const toastY = oy + vr.top + vr.height * 0.15;

        longTimer = setTimeout(() => {
          // long press => reset to 1x
          this._suppressSpeedClickUntil = Date.now() + DEFAULTS.CLICK_SUPPRESS_MS;
          this.resetSpeedTo1();
        }, DEFAULTS.LONG_PRESS_MS);

        const onMove = (ev) => {
          const dy = startY - ev.clientY;

          if (!sliding && Math.abs(dy) > DEFAULTS.DRAG_THRESHOLD) {
            clearTimeout(longTimer);
            sliding = true;

            // Dragging can still produce a click; suppress it
            this._suppressSpeedClickUntil = Date.now() + DEFAULTS.CLICK_SUPPRESS_MS;

            this.ui.isSpeedSliding = true;
            this.ui.show(true);
          }
          if (!sliding) return;

          ev.preventDefault();

          const delta = Math.sign(dy) * Math.pow(Math.abs(dy), DEFAULTS.SLIDER_POWER) * DEFAULTS.SLIDER_SENSITIVITY;
          let newRate = clamp(startRate + delta, 0.1, 16);

          let snapped = false;
          for (const p of DEFAULTS.SNAP_POINTS) {
            if (Math.abs(newRate - p) < DEFAULTS.SNAP_THRESHOLD) {
              newRate = p;
              snapped = true;
              break;
            }
          }

          v.playbackRate = newRate;
          this.store.setLastRate(newRate);
          this.ui.btnSpeed.classList.toggle('snapped', snapped);
          this.ui.toastShow(`${newRate.toFixed(2)}x`, { x: toastX, y: toastY, speedMode: true, snapped, ms: 250 });
        };

        const cleanup = () => {
          clearTimeout(longTimer);
          btn.removeEventListener('pointermove', onMove);
          btn.removeEventListener('pointerup', onUp);
          btn.removeEventListener('pointercancel', onUp);
          btn.removeEventListener('lostpointercapture', onUp);
          try { btn.releasePointerCapture(e.pointerId); } catch {}
        };

        const onUp = (ev) => {
          if (sliding) ev.preventDefault();
          cleanup();

          if (this.activeVideo) {
            this.store.setLastRate(this.activeVideo.playbackRate);
            this.ui.updateSpeedButton(this.activeVideo);
          }

          this.ui.isSpeedSliding = false;
          this.ui.btnSpeed.classList.remove('snapped');
          this.ui.show(false);
        };

        btn.addEventListener('pointermove', onMove, { passive: false });
        btn.addEventListener('pointerup', onUp, { passive: false });
        btn.addEventListener('pointercancel', onUp, { passive: false });
        btn.addEventListener('lostpointercapture', onUp, { passive: false });
      });
    }
  }

  function start() {
    if (!document.body) return; // safety
    const c = new Controller();
    c.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();