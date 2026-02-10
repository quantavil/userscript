// ==UserScript==
// @name         Mobile Video Controller
// @namespace    https://github.com/quantavil/userscript
// @version      25.0.2
// @description  Mobile-friendly video controller with safe fixed overlays (body/fullscreen), improved settings sheet, and cleanup.
// @match        *://*/*
// @grant        none
// @license      MIT
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ===========================================
    // UTILS
    // ===========================================
    class MVC_Utils {
        static debounce(func, wait) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func(...args), wait);
            };
        }
        static clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

        static createEl(tag, className, props = {}) {
            const el = document.createElement(tag);
            if (className) el.className = className;
            Object.assign(el, props);
            if (props.style) Object.assign(el.style, props.style);
            return el;
        }

        static getViewportPageBounds() {
            const v = window.visualViewport;
            const leftPage = window.scrollX + (v ? v.offsetLeft : 0);
            const topPage = window.scrollY + (v ? v.offsetTop : 0);
            const width = v ? v.width : window.innerWidth;
            const height = v ? v.height : window.innerHeight;
            return { leftPage, topPage, width, height };
        }

        static createSvgIcon(pathData) {
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("width", "20");
            svg.setAttribute("height", "20");
            svg.setAttribute("fill", "currentColor");
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", pathData);
            svg.appendChild(path);
            return svg;
        }

        static getIcon(name) {
            const paths = {
                rewind: "M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z",
                forward: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6-8.5-6z",
                settings: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z",
                close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            };
            return this.createSvgIcon(paths[name] || "");
        }
    }

    // ===========================================
    // CONFIGURATION
    // ===========================================
    class MVC_Config {
        static DEFAULTS = {
            MIN_VIDEO_AREA: 150 * 150,
            EDGE: 10,
            DEFAULT_RIGHT_OFFSET: 50,
            UI_FADE_TIMEOUT: 3500,
            UI_FADE_OPACITY: 0.15,
            LONG_PRESS_DURATION_MS: 300,
            DRAG_THRESHOLD: 10,
            SLIDER_SENSITIVITY: 0.003,
            SLIDER_POWER: 1.2,
            DEFAULT_SPEEDS: [0, 1, 1.25, 1.5, 1.75, 2],
            DEFAULT_SKIP_DURATIONS: [5, 10, 15, 30, 60],
            DEFAULT_SNAP_POINTS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25],
            SNAP_THRESHOLD: 0.05,
            SNAP_STRENGTH: 1,
            SPEED_TOAST_FADE_DELAY: 750,
            MUTATION_DEBOUNCE_MS: 800,
            SCROLL_END_TIMEOUT: 150,
            STORAGE_DEBOUNCE_MS: 2000,
            VISIBILITY_GUARDIAN_DELAY: 1500 // reduced battery usage vs 500ms
        };

        static SITE_CONFIGS = {
            'm.youtube.com': { parentSelector: '#player', observerRootSelector: '#page-manager' },
            'www.youtube.com': { parentSelector: '#movie_player', observerRootSelector: 'ytd-page-manager' },
            'bongobd.com': { attachToParent: true },
            'www.bongobd.com': { attachToParent: true }
        };

        constructor() {
            this.settings = {
                skipSeconds: this.read('skipSeconds', 10),
                selfCorrect: this.read('selfCorrect', false),
                defaultSpeed: this.read('defaultSpeed', 1.0),
                last_rate: this.read('last_rate', 1.0),
            };
            this.timers = {};
        }

        // FIX: missing in original
        load() {
            for (const k of Object.keys(this.settings)) {
                this.settings[k] = this.read(k, this.settings[k]);
            }
        }

        read(key, def) {
            try {
                const v = localStorage.getItem(`mvc_${key}`);
                return v === null ? def : JSON.parse(v);
            } catch { return def; }
        }

        save(key, val, immediate = false) {
            this.settings[key] = val;
            const storageKey = `mvc_${key}`;

            if (immediate) {
                try { localStorage.setItem(storageKey, JSON.stringify(val)); } catch { }
                return;
            }

            clearTimeout(this.timers[`save_${key}`]);
            this.timers[`save_${key}`] = setTimeout(() => {
                try { localStorage.setItem(storageKey, JSON.stringify(val)); } catch { }
            }, MVC_Config.DEFAULTS.STORAGE_DEBOUNCE_MS);
        }

        getPreferredRate() {
            const r = Number(this.settings.last_rate);
            if (Number.isFinite(r) && r > 0) return r;
            return this.settings.defaultSpeed || 1.0;
        }

        setLastRate(rate) {
            const r = MVC_Utils.clamp(Number(rate) || 1.0, 0.1, 16);
            this.settings.last_rate = r;
            this.save('last_rate', r, true);
        }

        getSiteConfig() {
            return MVC_Config.SITE_CONFIGS[window.location.hostname] || null;
        }
    }

    // ===========================================
    // UI MANAGER
    // ===========================================
    class MVC_UI {
        constructor(config) {
            this.config = config;
            this.els = {
                wrap: null, panel: null,
                backdrop: null, toast: null,
                rewindBtn: null, speedBtn: null, forwardBtn: null, settingsBtn: null,
                speedMenu: null, skipMenu: null, settingsMenu: null
            };
            this.timers = {};
            this.width = 0;
            this.height = 0;
            this.isSpeedSliding = false;
        }

        init() {
            this.injectStyles();
            this.createMainUI();
            this.updateSkipButtonText(this.config.settings.skipSeconds);
            this.ensureOverlayInContainer();
        }

        destroy(removeStyles = false) {
            [this.els.wrap, this.els.backdrop, this.els.toast, this.els.speedMenu, this.els.skipMenu, this.els.settingsMenu]
                .forEach(el => el?.remove());
            Object.values(this.timers).forEach(t => clearTimeout(t));
            if (removeStyles) document.getElementById('mvc-styles')?.remove();
        }

        _createBtn(content, title, extraClass, onClick) {
            const btn = MVC_Utils.createEl('button', `mvc-btn ${extraClass || ''}`);
            if (content instanceof Element) btn.appendChild(content);
            else btn.textContent = content;
            if (title) btn.title = title;
            if (onClick) btn.onclick = onClick;
            return btn;
        }

        createMainUI() {
            this.els.wrap = MVC_Utils.createEl('div', 'mvc-ui-wrap');
            this.els.panel = MVC_Utils.createEl('div', 'mvc-panel');
            this.els.backdrop = MVC_Utils.createEl('div', 'mvc-backdrop');
            this.els.toast = MVC_Utils.createEl('div', 'mvc-toast');

            this.els.wrap.style.zIndex = '2147483647';

            // fixed overlays -> start in body (safe)
            document.body.append(this.els.backdrop, this.els.toast);

            this.els.rewindBtn = this._createBtn(MVC_Utils.getIcon('rewind'), 'Rewind', 'mvc-btn-rewind');
            this.els.speedBtn = this._createBtn('1.0', 'Playback speed', 'mvc-btn-speed');
            this.els.forwardBtn = this._createBtn(MVC_Utils.getIcon('forward'), 'Forward', 'mvc-btn-forward');
            this.els.settingsBtn = this._createBtn(MVC_Utils.getIcon('settings'), 'Settings', 'mvc-btn-settings');

            this.els.panel.append(this.els.rewindBtn, this.els.speedBtn, this.els.forwardBtn, this.els.settingsBtn);
            this.els.wrap.append(this.els.panel);

            document.body.appendChild(this.els.wrap);

            // measure size
            this.els.wrap.style.visibility = 'hidden';
            this.els.wrap.style.display = 'block';
            const r = this.els.wrap.getBoundingClientRect();
            this.width = r.width;
            this.height = r.height;
            this.els.wrap.style.visibility = '';
            this.els.wrap.style.display = 'none';
            document.body.removeChild(this.els.wrap);
        }

        // FIX: keep *all* fixed overlays in safe container
        getOverlayContainer() {
            return document.fullscreenElement || document.webkitFullscreenElement || document.body;
        }

        ensureOverlayInContainer() {
            const container = this.getOverlayContainer();
            if (!container) return;

            const move = (el) => {
                if (!el) return;
                if (el.parentElement !== container) container.appendChild(el);
            };

            move(this.els.backdrop);
            move(this.els.toast);
            move(this.els.speedMenu);
            move(this.els.skipMenu);
            move(this.els.settingsMenu);
        }

        injectStyles() {
            if (document.getElementById('mvc-styles')) return;
            if (!document.head) return;

            const style = document.createElement('style');
            style.id = 'mvc-styles';
            style.textContent = `
                .mvc-ui-wrap {
                    position:absolute; left:0; top:0; z-index:2147483647;
                    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
                    display:none; opacity:0; pointer-events:none;
                    transition:opacity .5s ease;
                    will-change:opacity, transform;
                    transform:translate3d(0,0,0);
                    contain:layout paint;
                }
                .mvc-panel {
                    display:flex; align-items:center; gap:2px;
                    background:rgba(20, 20, 20, 0.65) !important; color:#fff !important;
                    padding:1px 2px;
                    backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
                    border:1px solid rgba(255,255,255,0.08) !important;
                    border-radius:12px;
                    touch-action:none!important;
                    user-select:none; -webkit-user-select:none;
                    pointer-events:auto;
                    cursor:grab;
                    width:fit-content;
                    transform:translate3d(0,0,0);
                    will-change:transform;
                    box-shadow: none !important;
                }
                .mvc-btn {
                    appearance:none; border:0; border-radius:12px;
                    width:40px; height:30px; padding:0;
                    font-size:14px; font-weight:600;
                    pointer-events:auto;
                    transition:transform .15s ease, background-color .2s;
                    user-select:none;
                    display:flex; align-items:center; justify-content:center;
                    touch-action:none!important;
                    background:rgba(255,255,255,0.08) !important;
                    color: #fff !important;
                }
                .mvc-btn:active { transform:scale(0.9); background:rgba(255,255,255,0.2) !important; }
                .mvc-btn-speed {
                    width:auto; padding:0 10px; border-radius:12px;
                    min-width:40px;
                    color:#40c4ff !important; font-size:12px; font-weight:700;
                    border:1px solid rgba(64, 196, 255, 0.4) !important;
                    background:rgba(64, 196, 255, 0.1) !important;
                }
                .mvc-btn-rewind { color:#ff5252 !important; }
                .mvc-btn-forward { color:#69f0ae !important; }
                .mvc-btn-settings { color:#e0e0e0 !important; opacity:0.9; }
                .mvc-btn.snapped { color:#ffea00!important; text-shadow:0 0 5px rgba(255,234,0,0.5); border-color:#ffea00 !important; }

                .mvc-backdrop {
                    display:none;
                    position:fixed; inset:0;
                    z-index:2147483646;
                    background:rgba(0,0,0,.01) !important;
                    touch-action:none;
                }
                .mvc-toast {
                    position:fixed; left:50%; bottom:60px;
                    transform:translateX(-50%) translate3d(0,0,0);
                    background:rgba(20,20,20,.85) !important;
                    backdrop-filter:blur(12px);
                    border:1px solid rgba(255,255,255,0.1) !important;
                    color:#fff !important;
                    padding:10px 20px;
                    border-radius:20px;
                    z-index:2147483647;
                    opacity:0;
                    transition:opacity .35s ease, color .2s linear;
                    pointer-events:none;
                    font-size:14px; font-weight:500;
                    will-change:opacity, color, top, left, font-size;
                }
                .mvc-toast.speed-mode {
                    padding:12px 24px;
                    border-radius:16px;
                    font-size:24px; font-weight:600;
                    transform:translate(-50%,-50%) translate3d(0,0,0);
                }
                .mvc-toast.snapped { color:#69f0ae!important; }

                .mvc-menu {
                    display:none;
                    flex-direction:column;
                    position:fixed;
                    background:rgba(28,28,30,0.95) !important;
                    border-radius:18px;
                    backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
                    border:1px solid rgba(255,255,255,0.1) !important;
                    box-shadow:0 12px 48px rgba(0,0,0,0.6) !important;
                    z-index:2147483647;
                    min-width:60px;
                    max-height:80vh;
                    overflow-y:auto;
                    pointer-events:auto;
                    touch-action:manipulation;
                    -webkit-tap-highlight-color:transparent;
                    transform:translate3d(0,0,0);
                    padding:4px;
                }
                .mvc-menu-opt {
                    padding:10px 10px;
                    font-size:15px;
                    text-align:center;
                    border-radius:10px;
                    margin:2px 4px;
                    user-select:none;
                    cursor:pointer;
                    transition:background .2s;
                    color: #fff !important; 
                    background: transparent !important;
                }
                .mvc-menu-opt:active { background:rgba(255,255,255,0.15) !important; }

                .mvc-speed-list { padding:0 !important; overflow:hidden; }
                .mvc-speed-list .mvc-menu-opt {
                    margin:0 !important;
                    border-radius:0 !important;
                    border-bottom:1px solid rgba(255, 255, 255, 0.15) !important;
                    padding:10px 12px;
                }
                .mvc-speed-list .mvc-menu-opt:last-child { border-bottom:none !important; }

                .mvc-skip-btn {
                    appearance:none; border:0; border-radius:12px;
                    padding:10px 18px;
                    font-size:15px; font-weight:600; color:#fff !important;
                    background:rgba(255,255,255,0.1) !important;
                    line-height:1.2;
                    user-select:none;
                    transition:background 0.2s;
                }
                .mvc-skip-btn:active { background:rgba(255,255,255,0.2) !important; }

                /* Settings (Compact & Dark Reader Proof) */
                .mvc-settings-sheet { min-width:260px; max-width:320px; padding: 6px !important; }
                .mvc-settings-section-title {
                    font-size:11px; font-weight:700;
                    color:rgba(235, 235, 245, 0.6) !important;
                    text-transform:uppercase;
                    letter-spacing:0.5px;
                    margin-top:8px;
                    margin-bottom:4px;
                    padding:0 8px;
                    text-align:left;
                    cursor:default;
                }
                .mvc-settings-row {
                    display:flex;
                    flex-direction:row;
                    align-items:center;
                    justify-content:space-between;
                    gap:8px;
                    cursor:default;
                    background:transparent !important;
                    padding:6px 8px;
                    margin:0;
                    min-height: 40px;
                }
                .mvc-settings-label {
                    color:rgba(255,255,255,0.9) !important;
                    font-size:13px;
                    line-height:1.2;
                    flex: 1;
                    text-align: left;
                }
                .mvc-settings-input {
                    width:44px;
                    background:rgba(255,255,255,.12) !important;
                    border:none !important;
                    color:white !important;
                    border-radius:8px;
                    text-align:center;
                    font-size:13px;
                    padding:4px;
                    height: 28px;
                    outline:none;
                    /* Hide spinners */
                    appearance: textfield;
                    -moz-appearance: textfield;
                }
                .mvc-settings-input::-webkit-outer-spin-button,
                .mvc-settings-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            
                .mvc-settings-btn {
                    font-size:13px;
                    padding:8px 12px;
                    background:rgba(255,255,255,0.12) !important;
                    color:white !important;
                    border:none !important;
                    border-radius:8px;
                    cursor:pointer;
                    transition:background .2s;
                    display: flex; align-items: center; justify-content: center;
                }
                .mvc-settings-btn:active { background:rgba(255,255,255,0.25) !important; }

                .mvc-stepper { display:flex; gap:4px; align-items:center; }
                .mvc-stepper .mvc-settings-btn {
                    width: 32px;
                    height: 28px;
                    padding: 0;
                    font-size: 16px;
                    line-height: 1;
                }
                
                @media (max-width: 480px) {
                    .mvc-btn { width:46px; height:36px; }
                    .mvc-btn-speed { font-size:13px; padding:0 12px; min-width:54px; }
                    .mvc-menu { max-height:70vh; }
                    .mvc-settings-sheet { width: calc(100vw - 20px); max-width:none; bottom: 10px !important; left: 10px !important; top: auto !important; }
                }
            `;
            document.head.appendChild(style);
        }

        updateSpeedDisplay(rate, isPaused, isEnded) {
            if (!this.els.speedBtn) return;
            if (isEnded) this.els.speedBtn.textContent = 'Replay';
            else if (isPaused) this.els.speedBtn.textContent = '▶︎';
            else this.els.speedBtn.textContent = `${rate.toFixed(2)}`;
        }

        showToast(message, options = {}) {
            this.ensureOverlayInContainer();
            if (!this.els.toast) return;

            // Reset styles
            this.els.toast.className = 'mvc-toast';
            this.els.toast.style.top = '';
            this.els.toast.style.left = '50%';

            if (options.className) this.els.toast.classList.add(options.className);
            if (options.isSnapped) this.els.toast.classList.add('snapped');

            if (options.pos) {
                this.els.toast.style.top = options.pos.top;
                this.els.toast.style.left = options.pos.left;
            }

            this.els.toast.textContent = message;
            this.els.toast.style.opacity = '1';

            clearTimeout(this.timers.toast);
            const duration = options.duration || (options.className === 'speed-mode' ? MVC_Config.DEFAULTS.SPEED_TOAST_FADE_DELAY : 1500);

            this.els.toast.dataset.fadeTime = Date.now() + duration; // track for potential updates
            this.timers.toast = setTimeout(() => {
                if (this.els.toast) this.els.toast.style.opacity = '0';
            }, duration);
        }

        // Alias for compatibility if needed, or just replace usages
        showSpeedToast(message, pos = null, isSnapped = false) {
            this.showToast(message, { pos, isSnapped, className: 'speed-mode' });
        }

        hideSpeedToast() {
            // Check if current toast is speed toast before hiding? 
            // Simplified: just let the timer handle it, or force hide if needed immediately.
            // For now, mirroring existing behavior of checking class or specific timer
            if (this.els.toast && this.els.toast.classList.contains('speed-mode')) {
                clearTimeout(this.timers.toast);
                this.timers.toast = setTimeout(() => {
                    if (this.els.toast) this.els.toast.style.opacity = '0';
                }, MVC_Config.DEFAULTS.SPEED_TOAST_FADE_DELAY);
            }
        }

        showUI(isInteracting = false) {
            if (!this.els.wrap) return;
            this.els.wrap.style.opacity = '1';
            this.els.wrap.style.pointerEvents = 'auto';
            clearTimeout(this.timers.hide);
            if (!isInteracting) {
                this.timers.hide = setTimeout(() => this.hideUI(false), MVC_Config.DEFAULTS.UI_FADE_TIMEOUT);
            }
        }

        hideUI(isInteracting = false) {
            if (isInteracting) return;
            const anyMenuOpen = [this.els.speedMenu, this.els.skipMenu, this.els.settingsMenu]
                .some(el => el && el.style.display !== 'none');

            if (this.els.wrap && !anyMenuOpen) {
                this.els.wrap.style.opacity = String(MVC_Config.DEFAULTS.UI_FADE_OPACITY);
                this.els.wrap.style.pointerEvents = 'none';
            }
        }

        showBackdrop() {
            this.ensureOverlayInContainer();
            this.els.backdrop.style.display = 'block';
            this.els.backdrop.style.pointerEvents = 'none';
            setTimeout(() => {
                if (this.els.backdrop) this.els.backdrop.style.pointerEvents = 'auto';
            }, 150);
        }

        hideAllMenus() {
            [this.els.speedMenu, this.els.skipMenu, this.els.settingsMenu].forEach(el => {
                if (el) el.style.display = 'none';
            });
            if (this.els.backdrop) this.els.backdrop.style.display = 'none';
            this.showUI(true);
        }

        toggleMenu(menuEl, anchorEl) {
            if (!menuEl) return;
            this.ensureOverlayInContainer();

            if (getComputedStyle(menuEl).display !== 'none') {
                this.hideAllMenus();
            } else {
                this.hideAllMenus();
                this.placeMenu(menuEl, anchorEl);
                menuEl.style.display = 'flex';
                this.showBackdrop();
                clearTimeout(this.timers.hide);
            }
        }

        placeMenu(menuEl, anchorEl) {
            const v = window.visualViewport;
            const viewportWidth = v ? v.width : window.innerWidth;
            const viewportHeight = v ? v.height : window.innerHeight;

            const showAndMeasure = (el) => {
                const prev = { display: el.style.display, visibility: el.style.visibility };
                Object.assign(el.style, { display: 'flex', visibility: 'hidden' });
                const r = el.getBoundingClientRect();
                Object.assign(el.style, prev);
                return { w: r.width, h: r.height };
            };

            if (menuEl === this.els.settingsMenu && viewportWidth <= 480) {
                menuEl.style.width = `calc(100vw - ${MVC_Config.DEFAULTS.EDGE * 2}px)`;
                menuEl.style.maxHeight = '70vh';
            } else {
                menuEl.style.width = '';
                menuEl.style.maxHeight = '';
            }

            const { w, h } = showAndMeasure(menuEl);

            // bottom-sheet for settings on small screens
            if (menuEl === this.els.settingsMenu && viewportWidth <= 480) {
                const left = MVC_Config.DEFAULTS.EDGE;
                const top = Math.max(MVC_Config.DEFAULTS.EDGE, viewportHeight - h - MVC_Config.DEFAULTS.EDGE);
                menuEl.style.left = `${Math.round(left)}px`;
                menuEl.style.top = `${Math.round(top)}px`;
                return;
            }

            const rect = anchorEl.getBoundingClientRect();
            let left = rect.left + rect.width / 2 - w / 2;
            const openAbove = rect.top - h - 8 >= MVC_Config.DEFAULTS.EDGE;
            let top = openAbove ? rect.top - h - 8 : rect.bottom + 8;

            if (menuEl === this.els.speedMenu || menuEl === this.els.settingsMenu) {
                menuEl.style.flexDirection = openAbove ? 'column-reverse' : 'column';
            }

            left = MVC_Utils.clamp(left, MVC_Config.DEFAULTS.EDGE, viewportWidth - w - MVC_Config.DEFAULTS.EDGE);
            top = MVC_Utils.clamp(top, MVC_Config.DEFAULTS.EDGE, viewportHeight - h - MVC_Config.DEFAULTS.EDGE); // FIX: no duplicate clamp

            menuEl.style.left = `${Math.round(left)}px`;
            menuEl.style.top = `${Math.round(top)}px`;
        }

        _createMenu(className, container) {
            const menu = MVC_Utils.createEl('div', className);
            container.appendChild(menu);
            return menu;
        }

        ensureSkipMenu(onSkipCallback) {
            if (this.els.skipMenu) return;
            this.ensureOverlayInContainer();

            this.els.skipMenu = this._createMenu('mvc-menu', this.getOverlayContainer());
            Object.assign(this.els.skipMenu.style, {
                flexDirection: 'row',
                gap: '1px',
                padding: '1px',
                flexWrap: 'nowrap',
                maxWidth: 'none',
                justifyContent: 'center'
            });

            MVC_Config.DEFAULTS.DEFAULT_SKIP_DURATIONS.forEach(duration => {
                const opt = MVC_Utils.createEl('button', 'mvc-skip-btn', { textContent: `${duration}s` });
                opt.onclick = (e) => {
                    e.stopPropagation();
                    if (onSkipCallback && onSkipCallback(duration)) {
                        opt.style.transform = "scale(0.9)";
                        setTimeout(() => opt.style.transform = "scale(1)", 100);
                    }
                };
                this.els.skipMenu.appendChild(opt);
            });
        }

        ensureSpeedMenu(onRateSelect, onCustomRate) {
            if (this.els.speedMenu) return;
            this.ensureOverlayInContainer();

            this.els.speedMenu = this._createMenu('mvc-menu mvc-speed-list', this.getOverlayContainer());

            const makeOpt = (sp, isCustom = false) => {
                const title = isCustom ? '✎ Custom' : (sp === 0 ? 'Pause' : `${sp.toFixed(2)}x`);
                const opt = MVC_Utils.createEl('div', 'mvc-menu-opt');
                opt.textContent = title;
                if (!isCustom) opt.dataset.sp = String(sp);

                // Color logic handled by CSS generally, but overrides:
                if (isCustom) {
                    opt.style.color = '#c5a5ff';
                    opt.style.fontWeight = '600';
                } else if (sp === 0) {
                    opt.style.color = '#89cff0';
                    opt.style.fontWeight = '600';
                }

                opt.onclick = () => isCustom ? onCustomRate() : onRateSelect(Number(opt.dataset.sp));
                return opt;
            };

            MVC_Config.DEFAULTS.DEFAULT_SPEEDS.forEach(sp => this.els.speedMenu.appendChild(makeOpt(sp)));
            this.els.speedMenu.appendChild(makeOpt(0, true)); // Custom
        }

        ensureSettingsMenu(config, onClose) {
            if (this.els.settingsMenu) return;
            this.ensureOverlayInContainer();

            this.els.settingsMenu = this._createMenu('mvc-menu mvc-settings-sheet', this.getOverlayContainer());

            const mkRow = () => MVC_Utils.createEl('div', 'mvc-menu-opt mvc-settings-row');

            const mkStepperRow = (labelText, inputEl, onMinus, onPlus) => {
                const row = mkRow();
                const label = MVC_Utils.createEl('div', 'mvc-settings-label', { textContent: labelText });

                const stepper = MVC_Utils.createEl('div', 'mvc-stepper');
                const minusBtn = MVC_Utils.createEl('button', 'mvc-settings-btn', { textContent: '−' });
                const plusBtn = MVC_Utils.createEl('button', 'mvc-settings-btn', { textContent: '+' });

                minusBtn.onclick = (e) => { e.stopPropagation(); onMinus(); };
                plusBtn.onclick = (e) => { e.stopPropagation(); onPlus(); };

                stepper.append(minusBtn, inputEl, plusBtn);
                row.append(label, stepper);
                return row;
            };

            // --- Header (Close) ---
            {
                const row = mkRow();
                row.style.justifyContent = 'flex-end';
                row.style.padding = '0 8px';
                row.style.minHeight = '30px';

                const closeBtn = this._createBtn(MVC_Utils.getIcon('close'), 'Close', 'mvc-settings-btn', (e) => {
                    e.stopPropagation();
                    onClose?.();
                });
                // Make close button look cleaner (icon only, transparent)
                closeBtn.style.background = 'transparent';
                closeBtn.style.padding = '4px';
                closeBtn.style.width = '28px';
                closeBtn.style.height = '28px';

                row.appendChild(closeBtn);
                this.els.settingsMenu.appendChild(row);
            }

            // Self-correct
            {
                const row = mkRow();
                const btn = MVC_Utils.createEl('button', 'mvc-settings-btn', { style: { width: '100%' } });

                const refresh = () => {
                    btn.textContent = `Self-Correct Speed: ${config.settings.selfCorrect ? 'On' : 'Off'}`;
                };
                btn.onclick = (e) => {
                    e.stopPropagation();
                    config.save('selfCorrect', !config.settings.selfCorrect, true);
                    refresh();
                };
                refresh();
                row.append(btn);
                this.els.settingsMenu.appendChild(row);
            }

            // Default speed
            {
                const speedInput = MVC_Utils.createEl('input', 'mvc-settings-input', {
                    type: 'number',
                    inputMode: 'decimal',
                    step: 0.05,
                    min: 0.1,
                    max: 16,
                    value: config.settings.defaultSpeed
                });

                const commit = () => {
                    const val = parseFloat(speedInput.value);
                    if (!isNaN(val) && val > 0 && val <= 16) config.save('defaultSpeed', val, true);
                    else speedInput.value = config.settings.defaultSpeed;
                };
                speedInput.onchange = commit;
                speedInput.onblur = commit;

                const row = mkStepperRow(
                    'Default Speed',
                    speedInput,
                    () => { speedInput.value = String(Math.max(0.1, (parseFloat(speedInput.value) || 1) - 0.05).toFixed(2)); commit(); },
                    () => { speedInput.value = String(Math.min(16, (parseFloat(speedInput.value) || 1) + 0.05).toFixed(2)); commit(); }
                );
                this.els.settingsMenu.appendChild(row);
            }

            // Skip seconds
            {
                const skipInput = MVC_Utils.createEl('input', 'mvc-settings-input', {
                    type: 'number',
                    inputMode: 'numeric',
                    step: 1,
                    min: 1,
                    value: config.settings.skipSeconds
                });

                const commit = () => {
                    const val = parseInt(skipInput.value, 10);
                    if (!isNaN(val) && val > 0) {
                        config.save('skipSeconds', val, true);
                        this.updateSkipButtonText(config.settings.skipSeconds);
                    } else skipInput.value = config.settings.skipSeconds;
                };
                skipInput.onchange = commit;
                skipInput.onblur = commit;

                const row = mkStepperRow(
                    'Skip Time (seconds)',
                    skipInput,
                    () => { skipInput.value = String(Math.max(1, (parseInt(skipInput.value, 10) || 10) - 1)); commit(); },
                    () => { skipInput.value = String((parseInt(skipInput.value, 10) || 10) + 1); commit(); }
                );
                this.els.settingsMenu.appendChild(row);
            }
            this.getOverlayContainer().appendChild(this.els.settingsMenu);
        }

        updateSkipButtonText(seconds) {
            if (this.els.rewindBtn) this.els.rewindBtn.title = `Rewind ${seconds}s`;
            if (this.els.forwardBtn) this.els.forwardBtn.title = `Forward ${seconds}s`;
        }
    }

    // ===========================================
    // VIDEO MANAGER
    // ===========================================
    class MVC_VideoManager {
        constructor(config, ui) {
            this.config = config;
            this.ui = ui;

            this.activeVideo = null;
            this.visibleVideos = new Map();
            this.observers = {};
            this.isTicking = false;
            this.debouncedEvaluate = MVC_Utils.debounce(this.evaluateActive.bind(this), MVC_Config.DEFAULTS.MUTATION_DEBOUNCE_MS);
            this.isManuallyPositioned = false;
            this.dragData = { isDragging: false, wasDragging: false };
            this.isScrolling = false;
            this.timers = {};

            this._onScroll = () => {
                this.isScrolling = true;
                clearTimeout(this.timers.scrollEnd);
                this.timers.scrollEnd = setTimeout(() => { this.isScrolling = false; }, MVC_Config.DEFAULTS.SCROLL_END_TIMEOUT);
                this.throttledPositionOnVideo();
            };
            this._onResize = () => this.throttledPositionOnVideo();
            this._onFullscreen = () => {
                setTimeout(() => {
                    this.ui.ensureOverlayInContainer?.(); // FIX: keep fixed overlays in correct container in fullscreen
                    this.throttledPositionOnVideo();
                }, 100);
                setTimeout(() => this.guardianCheck(), 500);
            };
        }

        init() {
            this.setupObservers();
            this.setupVideoPositionObserver();
            this.setupGlobalLayoutListeners();
            this._guardianLoop = setInterval(() => this.guardianCheck(), MVC_Config.DEFAULTS.VISIBILITY_GUARDIAN_DELAY);
        }

        destroy() {
            window.removeEventListener('scroll', this._onScroll);
            window.removeEventListener('resize', this._onResize);
            document.removeEventListener('fullscreenchange', this._onFullscreen);
            document.removeEventListener('webkitfullscreenchange', this._onFullscreen);

            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', this._onResize);
                window.visualViewport.removeEventListener('scroll', this._onScroll);
            }

            clearInterval(this._guardianLoop);

            try { this.observers.intersection?.disconnect(); } catch { }
            try { this.observers.mutation?.disconnect(); } catch { }
            try { this.observers.videoResize?.disconnect(); } catch { }
            try { this.observers.videoMutation?.disconnect(); } catch { }

            if (this.activeVideo) {
                ['ended', 'play', 'pause', 'ratechange'].forEach(ev => this.activeVideo.removeEventListener(ev, this));
            }
            this.visibleVideos.clear();
        }

        handleEvent(event) {
            switch (event.type) {
                case 'ended':
                    if (this.activeVideo) {
                        this.activeVideo.playbackRate = this.config.settings.defaultSpeed;
                        this.config.setLastRate(this.config.settings.defaultSpeed);
                        this.ui.updateSpeedDisplay(this.config.settings.defaultSpeed, false, true);
                    }
                    break;
                case 'play':
                case 'pause':
                    this.ui.updateSpeedDisplay(this.activeVideo.playbackRate, this.activeVideo.paused, this.activeVideo.ended);
                    this.ui.showUI();
                    break;
                case 'ratechange':
                    this.ui.updateSpeedDisplay(this.activeVideo.playbackRate, this.activeVideo.paused, this.activeVideo.ended);
                    if (!this.ui.isSpeedSliding) {
                        this.ui.showUI();
                        this.applySelfCorrect();
                    }
                    break;
            }
        }

        applySelfCorrect() {
            if (!this.config.settings.selfCorrect || !this.activeVideo) return;
            if (this.ui.isSpeedSliding) return;

            const target = this.config.getPreferredRate();
            if (Math.abs(this.activeVideo.playbackRate - target) > 0.1) {
                this.activeVideo.playbackRate = target;
            }
        }

        evaluateActive() {
            if (this.activeVideo &&
                this.isPlaying(this.activeVideo) &&
                this.activeVideo.isConnected &&
                this.visibleVideos.has(this.activeVideo)) {
                const r = this.activeVideo.getBoundingClientRect();
                if (r.height > 50 && r.bottom > 0 && r.top < window.innerHeight) return;
            }

            let best = null, bestScore = -1;
            const viewArea = window.innerWidth * window.innerHeight;

            for (const v of this.visibleVideos.keys()) {
                if (!v.isConnected) { this.visibleVideos.delete(v); continue; }
                if (getComputedStyle(v).visibility === 'hidden') continue;

                const r = v.getBoundingClientRect();
                const area = r.width * r.height;
                if (area < MVC_Config.DEFAULTS.MIN_VIDEO_AREA) continue;

                const score = area + (this.isPlaying(v) ? viewArea * 2 : 0);
                if (score > bestScore) {
                    best = v;
                    bestScore = score;
                }
            }
            this.setActiveVideo(best);
        }

        setActiveVideo(v, options = {}) {
            if (this.activeVideo === v) return;

            if (this.activeVideo) {
                ['ended', 'play', 'pause', 'ratechange'].forEach(ev => this.activeVideo.removeEventListener(ev, this));
                this.observers.videoResize?.unobserve(this.activeVideo);
                this.observers.videoMutation?.disconnect();
            }

            this.activeVideo = v;

            if (v) {
                this.attachUIToVideo(v);
                this.observers.videoResize?.observe(v);
                this.observers.videoMutation?.observe(v.parentElement || v, { attributes: true, subtree: true });
                this.applyDefaultSpeed(v);
                ['ended', 'play', 'pause', 'ratechange'].forEach(ev => v.addEventListener(ev, this));
            } else {
                const gracePeriod = options.immediateHide ? 0 : 250;
                if (this.ui.els.wrap) {
                    setTimeout(() => {
                        if (!this.activeVideo && this.ui.els.wrap) this.ui.els.wrap.style.display = 'none';
                    }, gracePeriod);
                }
            }
        }

        attachUIToVideo(video) {
            if (!this.ui.els.wrap) return;
            this.ui.els.wrap.style.visibility = 'hidden';

            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            const siteConfig = this.config.getSiteConfig();

            let parent = fsEl;
            if (!parent && siteConfig?.parentSelector) parent = video.closest(siteConfig.parentSelector);
            if (siteConfig?.attachToParent) parent = video.parentElement;

            if (parent && parent.isConnected) {
                if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
                parent.appendChild(this.ui.els.wrap);
                this.ui.els.wrap.style.position = 'absolute';
            } else {
                document.body.appendChild(this.ui.els.wrap);
                this.ui.els.wrap.style.position = 'absolute';
            }

            this.ui.els.wrap.style.display = 'block';
            this.isManuallyPositioned = false;
            this.throttledPositionOnVideo();

            setTimeout(() => {
                this.ui.els.wrap.style.visibility = 'visible';
                this.ui.showUI(true);
                this.ui.updateSpeedDisplay(video.playbackRate, video.paused, video.ended);
            }, 50);
        }

        setupObservers() {
            this.observers.intersection = new IntersectionObserver(e => this.handleIntersection(e), { threshold: 0.05 });
            document.querySelectorAll('video').forEach(v => this.observers.intersection.observe(v));

            const config = this.config.getSiteConfig();
            const observerRoot = config?.observerRootSelector ? document.querySelector(config.observerRootSelector) : document.body;

            this.observers.mutation = new MutationObserver(m => this.handleMutation(m));

            // FIX: removed invalid "recursive" option
            if (observerRoot) this.observers.mutation.observe(observerRoot, { childList: true, subtree: true });
            else this.observers.mutation.observe(document.body || document.documentElement, { childList: true, subtree: true });
        }

        handleIntersection(entries) {
            let needsReevaluation = false;
            entries.forEach(entry => {
                const target = entry.target;
                if (entry.isIntersecting) {
                    if (!this.visibleVideos.has(target)) {
                        this.visibleVideos.set(target, true);
                        needsReevaluation = true;
                    }
                } else {
                    if (this.visibleVideos.has(target)) {
                        this.visibleVideos.delete(target);
                        if (target === this.activeVideo) {
                            const scrolledOffTop = entry.boundingClientRect.bottom < 10;
                            this.setActiveVideo(null, { immediateHide: scrolledOffTop });
                        }
                        needsReevaluation = true;
                    }
                }
            });
            if (needsReevaluation) this.debouncedEvaluate();
        }

        handleMutation(mutations) {
            let videoAdded = false, activeVideoRemoved = false;
            let relevantMutation = false;

            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video')))) {
                            relevantMutation = true;
                            const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
                            videos.forEach(v => { this.observers.intersection.observe(v); videoAdded = true; });
                        }
                    });
                }
                if (mutation.removedNodes.length) {
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
                                relevantMutation = true;
                                const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
                                videos.forEach(v => {
                                    this.observers.intersection.unobserve(v);
                                    this.visibleVideos.delete(v);
                                    if (v === this.activeVideo) activeVideoRemoved = true;
                                });
                            }
                        }
                    });
                }
            });

            if (!relevantMutation) return;
            if (activeVideoRemoved) this.setActiveVideo(null);
            if (videoAdded || activeVideoRemoved || (this.activeVideo && !this.activeVideo.isConnected)) {
                this.debouncedEvaluate();
            }
        }

        setupGlobalLayoutListeners() {
            window.addEventListener('resize', this._onResize, { passive: true });
            window.addEventListener('scroll', this._onScroll, { passive: true });
            document.addEventListener('fullscreenchange', this._onFullscreen);
            document.addEventListener('webkitfullscreenchange', this._onFullscreen);

            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', this._onResize, { passive: true });
                window.visualViewport.addEventListener('scroll', this._onScroll, { passive: true });
            }
        }

        guardianCheck() {
            // Battery guard: if nothing is on-screen and no active video, don't do expensive work
            if (document.hidden) return;
            if (!this.activeVideo && this.visibleVideos.size === 0) return;

            if (this.activeVideo && (!this.ui.els.wrap || this.ui.els.wrap.style.display === 'none')) {
                this.setActiveVideo(this.activeVideo);
            } else if (!this.activeVideo) {
                this.evaluateActive();
            }
            this.throttledPositionOnVideo();
        }

        setupVideoPositionObserver() {
            if (typeof ResizeObserver === 'undefined') return;
            this.observers.videoResize = new ResizeObserver(() => this.throttledPositionOnVideo());
            this.observers.videoMutation = new MutationObserver(() => this.throttledPositionOnVideo());
        }

        throttledPositionOnVideo() {
            if (this.isTicking) return;
            this.isTicking = true;
            requestAnimationFrame(() => {
                if (!this.dragData.isDragging && !this.isManuallyPositioned) this.positionOnVideo();
                this.isTicking = false;
            });
        }

        positionOnVideo() {
            if (!this.activeVideo || !this.ui.els.wrap || this.isManuallyPositioned) return;

            this.ui.els.wrap.style.transform = '';
            const vr = this.activeVideo.getBoundingClientRect();

            const desiredLeftPage = vr.left + window.scrollX + vr.width - this.ui.width - MVC_Config.DEFAULTS.DEFAULT_RIGHT_OFFSET;
            let desiredTopPage = vr.top + window.scrollY + vr.height - this.ui.height - 10;
            if (vr.height > window.innerHeight * 0.7 && vr.bottom > window.innerHeight - 150) desiredTopPage -= 82;

            const vp = MVC_Utils.getViewportPageBounds();
            const minPageX = vp.leftPage + MVC_Config.DEFAULTS.EDGE;
            const maxPageX = vp.leftPage + vp.width - this.ui.width - MVC_Config.DEFAULTS.EDGE;
            const minPageY = vp.topPage + MVC_Config.DEFAULTS.EDGE;
            const maxPageY = vp.topPage + vp.height - this.ui.height - MVC_Config.DEFAULTS.EDGE;

            const clampedLeftPage = MVC_Utils.clamp(desiredLeftPage, minPageX, maxPageX);
            const clampedTopPage = this.isScrolling ? desiredTopPage : MVC_Utils.clamp(desiredTopPage, minPageY, maxPageY);

            const parent = this.ui.els.wrap.parentElement || document.body;
            const parentRect = parent.getBoundingClientRect();
            const parentLeftPage = parentRect.left + window.scrollX;
            const parentTopPage = parentRect.top + window.scrollY;

            this.ui.els.wrap.style.left = `${Math.round(clampedLeftPage - parentLeftPage)}px`;
            this.ui.els.wrap.style.top = `${Math.round(clampedTopPage - parentTopPage)}px`;
            this.ui.els.wrap.style.right = "auto";
            this.ui.els.wrap.style.bottom = "auto";
        }

        isPlaying(v) { return v && !v.paused && !v.ended && v.readyState > 2; }

        applyDefaultSpeed(v) {
            if (v && this.config.settings.defaultSpeed !== 1.0 && Math.abs(v.playbackRate - 1.0) < 0.1) {
                v.playbackRate = this.config.settings.defaultSpeed;
            }
        }
    }

    // ===========================================
    // INPUT HANDLER
    // ===========================================
    class MVC_InputHandler {
        constructor(config, ui, videoManager, onRequestClose) {
            this.config = config;
            this.ui = ui;
            this.vm = videoManager;
            this.onRequestClose = onRequestClose;

            this.timers = {};
            this.sliderData = { isSliding: false };
            this.isTickingSlider = false;
            this.isTickingDrag = false;

            // guard: prevent click skip right after long-press opened skip menu
            this._skipMenuOpenedAt = 0;
            this._skipMenuSourceBtn = null;
        }

        init() {
            this.attachGlobalListeners();
            this.attachUIListeners();
        }

        destroy() {
            ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
                window.removeEventListener(ev, this._onUserEvent)
            );
            Object.values(this.timers).forEach(t => clearTimeout(t));
        }

        attachGlobalListeners() {
            this._onUserEvent = (e) => {
                if (!e.isTrusted) return;

                if (e.type === 'keydown') {
                    this.ui.showUI(true);
                    return;
                }

                const t = e.target;
                const inController = t?.closest?.('.mvc-ui-wrap, .mvc-menu');
                const isVideo = (t?.tagName === 'VIDEO') || t?.closest?.('video');
                if (inController || isVideo) this.ui.showUI(true);
            };

            ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
                window.addEventListener(ev, this._onUserEvent, { passive: true })
            );

            this.ui.els.backdrop.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.ui.hideAllMenus();
            });
        }

        attachUIListeners() {
            this.attachSpeedButtonListeners();
            this.attachPanelDragListeners();
            this.attachSettingsButtonListeners();

            this.ui.els.rewindBtn.onclick = (e) => {
                e.stopPropagation();
                this.ui.showUI(true);
                if (this._wasSkipMenuJustOpenedFrom(this.ui.els.rewindBtn)) return;
                if (!this.vm.dragData.wasDragging) this.doSkip(-1);
                this.vm.dragData.wasDragging = false;
            };

            this.ui.els.forwardBtn.onclick = (e) => {
                e.stopPropagation();
                this.ui.showUI(true);
                if (this._wasSkipMenuJustOpenedFrom(this.ui.els.forwardBtn)) return;
                if (!this.vm.dragData.wasDragging) this.doSkip(1);
                this.vm.dragData.wasDragging = false;
            };

            this.setupLongPress(this.ui.els.rewindBtn, -1);
            this.setupLongPress(this.ui.els.forwardBtn, 1);
        }

        _wasSkipMenuJustOpenedFrom(btn) {
            return (this._skipMenuSourceBtn === btn) && (Date.now() - this._skipMenuOpenedAt < 650);
        }

        doSkip(dir) {
            if (!this.vm.activeVideo) return;
            this.vm.activeVideo.currentTime = MVC_Utils.clamp(
                this.vm.activeVideo.currentTime + dir * this.config.settings.skipSeconds,
                0, this.vm.activeVideo.duration ?? Infinity
            );
        }

        attachSpeedButtonListeners() {
            let longPressActioned = false;
            const btn = this.ui.els.speedBtn;

            btn.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });

            btn.addEventListener("pointerdown", e => {
                e.stopPropagation(); e.preventDefault();
                let toastPos = { top: '50%', left: '50%' };
                if (this.vm.activeVideo?.isConnected) {
                    const vr = this.vm.activeVideo.getBoundingClientRect();
                    toastPos = { top: `${vr.top + vr.height / 2}px`, left: `${vr.left + vr.width / 2}px` };
                }

                this.sliderData = {
                    startY: e.clientY,
                    currentY: e.clientY,
                    startRate: this.vm.activeVideo ? this.vm.activeVideo.playbackRate : 1.0,
                    isSliding: false,
                    toastPosition: toastPos
                };
                longPressActioned = false;
                try { btn.setPointerCapture(e.pointerId); } catch { }

                this.timers.longPress = setTimeout(() => {
                    if (this.vm.activeVideo) {
                        this.vm.activeVideo.playbackRate = 1.0;
                        this.config.setLastRate(1.0);
                        this.ui.showToast("Speed reset to 1.00x");
                    }
                    longPressActioned = true;
                    this.sliderData.isSliding = false;
                }, MVC_Config.DEFAULTS.LONG_PRESS_DURATION_MS);
            });

            btn.addEventListener("pointermove", e => {
                if (this.sliderData.startY == null || !this.vm.activeVideo || longPressActioned) return;
                e.stopPropagation(); e.preventDefault();

                if (!this.sliderData.isSliding && Math.abs(e.clientY - this.sliderData.startY) > MVC_Config.DEFAULTS.DRAG_THRESHOLD) {
                    clearTimeout(this.timers.longPress);
                    this.sliderData.isSliding = true;
                    this.ui.isSpeedSliding = true;
                    this.ui.showUI(true);
                    if (this.vm.activeVideo.paused) this.vm.activeVideo.play().catch(() => { });
                    btn.style.transform = 'scale(1.1)';
                    this.ui.showToast('', {
                        pos: this.sliderData.toastPosition,
                        className: 'speed-mode'
                    });
                }

                if (this.sliderData.isSliding) {
                    this.sliderData.currentY = e.clientY;
                    if (!this.isTickingSlider) {
                        requestAnimationFrame(() => this.updateSpeedSlider());
                        this.isTickingSlider = true;
                    }
                }
            });

            btn.addEventListener("pointerup", e => {
                e.stopPropagation();
                clearTimeout(this.timers.longPress);

                if (this.sliderData.isSliding && this.vm.activeVideo) {
                    this.config.setLastRate(this.vm.activeVideo.playbackRate);
                    this.ui.updateSpeedDisplay(this.vm.activeVideo.playbackRate, this.vm.activeVideo.paused, this.vm.activeVideo.ended);
                } else if (!longPressActioned) {
                    if (!this.vm.activeVideo) return;

                    if (btn.textContent === '▶︎' || btn.textContent === 'Replay') {
                        if (this.vm.activeVideo.paused || this.vm.activeVideo.ended) {
                            this.vm.activeVideo.playbackRate = this.config.getPreferredRate();
                            this.vm.activeVideo.play().catch(() => { });
                        } else {
                            this.config.setLastRate(this.vm.activeVideo.playbackRate);
                            this.vm.activeVideo.pause();
                        }
                    } else {
                        this.ui.ensureSpeedMenu(
                            (rate) => {
                                if (!this.vm.activeVideo) return;

                                // FIX: Pause means pause, not playbackRate=0
                                if (rate === 0) {
                                    this.config.setLastRate(this.vm.activeVideo.playbackRate);
                                    this.vm.activeVideo.pause();
                                    this.ui.showToast(`Paused`);
                                } else {
                                    this.vm.activeVideo.playbackRate = rate;
                                    this.config.setLastRate(rate);
                                    this.ui.showToast(`${rate}x Speed`);
                                    if (this.vm.activeVideo.paused) this.vm.activeVideo.play().catch(() => { });
                                }
                                this.ui.hideAllMenus();
                            },
                            () => {
                                const r = prompt("Enter custom speed:", this.vm.activeVideo ? this.vm.activeVideo.playbackRate : 1.0);
                                if (!r) return;
                                const val = parseFloat(r);
                                if (isNaN(val) || val <= 0 || val > 16) return;

                                if (this.vm.activeVideo) {
                                    this.vm.activeVideo.playbackRate = val;
                                    this.config.setLastRate(val);
                                    this.ui.showToast(`${val}x Speed`);
                                    if (this.vm.activeVideo.paused) this.vm.activeVideo.play().catch(() => { });
                                    this.ui.hideAllMenus();
                                }
                            }
                        );
                        this.ui.toggleMenu(this.ui.els.speedMenu, btn);
                    }
                }

                this.ui.isSpeedSliding = false;
                this.isTickingSlider = false;
                this.sliderData = { isSliding: false };
                btn.style.transform = 'scale(1)';
                btn.classList.remove('snapped');
                this.ui.els.toast?.classList.remove('snapped');
                this.ui.hideSpeedToast();
                this.ui.showUI();
            });
        }

        updateSpeedSlider() {
            if (!this.sliderData.isSliding || !this.vm.activeVideo) { this.isTickingSlider = false; return; }
            this.ui.showUI(true);

            const dy = this.sliderData.startY - this.sliderData.currentY;
            const delta = Math.sign(dy) * Math.pow(Math.abs(dy), MVC_Config.DEFAULTS.SLIDER_POWER) * MVC_Config.DEFAULTS.SLIDER_SENSITIVITY;
            let newRate = MVC_Utils.clamp(this.sliderData.startRate + delta, 0.1, 16);

            let isSnapped = false;
            for (const point of MVC_Config.DEFAULTS.DEFAULT_SNAP_POINTS) {
                const dist = Math.abs(newRate - point);
                if (dist < MVC_Config.DEFAULTS.SNAP_THRESHOLD) {
                    const gravity = 1 - (dist / MVC_Config.DEFAULTS.SNAP_THRESHOLD);
                    newRate = newRate * (1 - gravity * MVC_Config.DEFAULTS.SNAP_STRENGTH) + point * (gravity * MVC_Config.DEFAULTS.SNAP_STRENGTH);
                    isSnapped = true;
                    break;
                }
            }

            this.vm.activeVideo.playbackRate = newRate;
            this.ui.showToast(`${newRate.toFixed(2)}x`, {
                pos: this.sliderData.toastPosition,
                isSnapped: isSnapped,
                className: 'speed-mode'
            });
            this.ui.els.speedBtn.classList.toggle('snapped', isSnapped);

            this.isTickingSlider = false;
        }

        attachPanelDragListeners() {
            const panel = this.ui.els.panel;
            panel.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
            panel.addEventListener("touchmove", e => { e.preventDefault(); e.stopImmediatePropagation(); }, { passive: false });

            panel.onpointerdown = e => {
                e.stopPropagation();
                this.vm.dragData.wasDragging = false;
                this.ui.showUI(true);
                this.ui.els.wrap.style.transform = '';

                const rect = this.ui.els.wrap.getBoundingClientRect();
                this.vm.dragData = {
                    startPageX: rect.left + window.scrollX,
                    startPageY: rect.top + window.scrollY,
                    startX: e.clientX,
                    startY: e.clientY,
                    isDragging: false
                };

                const onDragMove = moveEvent => {
                    moveEvent.stopPropagation();
                    moveEvent.stopImmediatePropagation();
                    if (moveEvent.cancelable) moveEvent.preventDefault();

                    this.vm.dragData.dx = moveEvent.clientX - this.vm.dragData.startX;
                    this.vm.dragData.dy = moveEvent.clientY - this.vm.dragData.startY;

                    if (!this.vm.dragData.isDragging &&
                        Math.sqrt(this.vm.dragData.dx ** 2 + this.vm.dragData.dy ** 2) > MVC_Config.DEFAULTS.DRAG_THRESHOLD) {
                        this.vm.dragData.isDragging = true;
                        panel.style.cursor = 'grabbing';
                        this.ui.showUI(true);
                        clearTimeout(this.timers.longPressSkip);
                    }

                    if (this.vm.dragData.isDragging && !this.isTickingDrag) {
                        requestAnimationFrame(() => this.updateDragPosition());
                        this.isTickingDrag = true;
                    }
                };

                const onDragEnd = () => {
                    window.removeEventListener('pointermove', onDragMove);
                    window.removeEventListener('pointerup', onDragEnd);
                    panel.style.cursor = 'grab';
                    if (this.vm.dragData.isDragging) {
                        this.vm.isManuallyPositioned = true;
                        this.vm.dragData.wasDragging = true;
                    }
                    this.vm.dragData.isDragging = false;
                    this.ui.showUI();
                };

                window.addEventListener('pointermove', onDragMove);
                window.addEventListener('pointerup', onDragEnd, { once: true });
            };
        }

        updateDragPosition() {
            if (!this.vm.dragData.isDragging) { this.isTickingDrag = false; return; }

            const parent = this.ui.els.wrap.parentElement || document.body;
            const parentRect = parent.getBoundingClientRect();
            const parentLeftPage = parentRect.left + window.scrollX;
            const parentTopPage = parentRect.top + window.scrollY;

            let newPageX = this.vm.dragData.startPageX + this.vm.dragData.dx;
            let newPageY = this.vm.dragData.startPageY + this.vm.dragData.dy;

            const v = MVC_Utils.getViewportPageBounds();
            const minPageX = v.leftPage + MVC_Config.DEFAULTS.EDGE;
            const maxPageX = v.leftPage + v.width - this.ui.width - MVC_Config.DEFAULTS.EDGE;
            const minPageY = v.topPage + MVC_Config.DEFAULTS.EDGE;
            const maxPageY = v.topPage + v.height - this.ui.height - MVC_Config.DEFAULTS.EDGE;

            newPageX = MVC_Utils.clamp(newPageX, minPageX, maxPageX);
            newPageY = MVC_Utils.clamp(newPageY, minPageY, maxPageY);

            this.ui.els.wrap.style.left = `${Math.round(newPageX - parentLeftPage)}px`;
            this.ui.els.wrap.style.top = `${Math.round(newPageY - parentTopPage)}px`;
            this.isTickingDrag = false;
        }

        setupLongPress(btn, dir) {
            const clear = () => clearTimeout(this.timers.longPressSkip);

            btn.addEventListener("pointerdown", () => {
                clear();
                this.timers.longPressSkip = setTimeout(() => {
                    this._skipMenuOpenedAt = Date.now();
                    this._skipMenuSourceBtn = btn;

                    this.longPressDirection = dir;

                    this.ui.ensureSkipMenu((duration) => {
                        if (this.vm.activeVideo && this.longPressDirection) {
                            this.vm.activeVideo.currentTime = MVC_Utils.clamp(
                                this.vm.activeVideo.currentTime + this.longPressDirection * duration,
                                0, this.vm.activeVideo.duration ?? Infinity
                            );
                            this.ui.showUI(true);
                            this.ui.showToast(`Skipped ${duration}s`);
                            return true;
                        }
                    });

                    // anchor to pressed button (better placement)
                    this.ui.toggleMenu(this.ui.els.skipMenu, btn);

                }, MVC_Config.DEFAULTS.LONG_PRESS_DURATION_MS);
            });

            ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, clear));
        }

        attachSettingsButtonListeners() {
            let settingsTimer;
            let isSettingsLongPress = false;
            let settingsLongPressJustEnded = false;
            let preLongPressRate = 1;

            this.ui.els.settingsBtn.onpointerdown = () => {
                isSettingsLongPress = false;
                settingsLongPressJustEnded = false;
                settingsTimer = setTimeout(() => {
                    if (this.vm.dragData.isDragging) return;
                    if (this.vm.activeVideo) {
                        isSettingsLongPress = true;
                        preLongPressRate = this.vm.activeVideo.playbackRate;
                        this.vm.activeVideo.playbackRate = 2.0;
                        this.ui.showToast('2x Speed');
                        this.ui.els.settingsBtn.style.transform = "scale(0.9)";
                    }
                }, 400);
            };

            const endSettingsPress = (e) => {
                clearTimeout(settingsTimer);
                if (isSettingsLongPress && this.vm.activeVideo) {
                    e.preventDefault();
                    this.vm.activeVideo.playbackRate = preLongPressRate;
                    this.ui.showToast('Speed Restored');
                    this.ui.els.settingsBtn.style.transform = "scale(1)";
                    settingsLongPressJustEnded = true;
                    isSettingsLongPress = false;
                }
            };

            this.ui.els.settingsBtn.onpointerup = endSettingsPress;
            this.ui.els.settingsBtn.onpointerleave = endSettingsPress;

            this.ui.els.settingsBtn.onclick = (e) => {
                if (settingsLongPressJustEnded) {
                    settingsLongPressJustEnded = false;
                    e.stopPropagation();
                    return;
                }
                if (this.vm.dragData.wasDragging) {
                    e.stopPropagation();
                    this.vm.dragData.wasDragging = false;
                    return;
                }

                this.ui.ensureSettingsMenu(this.config, () => {
                    this.ui.hideAllMenus();
                    this.onRequestClose?.();
                });

                this.ui.toggleMenu(this.ui.els.settingsMenu, this.ui.els.settingsBtn);
            };
        }
    }

    // ===========================================
    // MAIN (lazy init: don't run heavy observers on pages without video)
    // ===========================================
    class MobileVideoController {
        constructor() {
            this.config = new MVC_Config();
            this.ui = null;
            this.vm = null;
            this.input = null;

            this._initialized = false;
            this._bootstrapObserver = null;

            const start = () => this.bootstrap();
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
            else start();
        }

        bootstrap() {
            if (this._initialized) return;

            // If a video already exists, init immediately
            if (document.querySelector('video')) {
                this.init();
                return;
            }

            // Otherwise: lightweight observer until first video appears
            this._bootstrapObserver = new MutationObserver(() => {
                if (this._initialized) return;
                if (document.querySelector('video')) {
                    this._bootstrapObserver?.disconnect();
                    this._bootstrapObserver = null;
                    this.init();
                }
            });

            this._bootstrapObserver.observe(document.documentElement, { childList: true, subtree: true });
        }

        init() {
            if (this._initialized) return;
            this._initialized = true;

            this.config.load();

            this.ui = new MVC_UI(this.config);
            this.ui.init();

            this.vm = new MVC_VideoManager(this.config, this.ui);
            this.vm.init();

            this.input = new MVC_InputHandler(this.config, this.ui, this.vm, () => this.destroy());
            this.input.init();
        }

        destroy() {
            try { this._bootstrapObserver?.disconnect(); } catch { }
            this._bootstrapObserver = null;

            try { this.input?.destroy(); } catch { }
            try { this.vm?.destroy(); } catch { }
            try { this.ui?.destroy(true); } catch { }

            this.input = null;
            this.vm = null;
            this.ui = null;
        }
    }

    new MobileVideoController();
})();