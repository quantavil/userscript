// ==UserScript==
// @name         Mobile Video Controller (Media Card & Persistent Menu)
// @namespace    https://github.com/quantavil/userscript/mobile-video-controller
// @version      1.1.0
// @description  User-friendly "Card" UI, persistent skip menu, and battery optimized.
// @match        *://*/*
// @grant        none
// @license      MIT
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ── Module sources are concatenated here by the build step. ─────────────
    // In source form each src/*.js file defines its exports on globals:
    //   MVC_CONFIG                    (src/config.js)
    //   MVC_Styles                    (src/styles.js)
    //   MVC_Utils                     (src/utils.js)
    //   MVC_UI                        (src/ui.js)
    //   MVC_Video                     (src/video.js)
    //   MVC_Controls                  (src/controls.js)
    // ────────────────────────────────────────────────────────────────────────

    class MobileVideoController {
        // Static config comes from src/config.js
        static CONFIG       = MVC_CONFIG;

        constructor() {
            this.activeVideo   = null;
            this.visibleVideos = new Map();

            // State flags
            this.isManuallyPositioned = false;
            this.wasDragging    = false;
            this.isTicking      = false;
            this.isTickingDrag  = false;
            this.isTickingSlider = false;
            this.isSpeedSliding = false;
            this.isScrolling    = false;
            this.lastRealUserEvent = 0;

            this.ui = {
                wrap: null, panel: null, backdrop: null, toast: null, speedToast: null,
                rewindBtn: null, speedBtn: null, forwardBtn: null, settingsBtn: null,
                speedMenu: null, skipMenu: null, settingsMenu: null
            };

            this.timers    = {};
            this.dragData  = { isDragging: false };
            this.sliderData = { isSliding: false };

            this.boundScrollHandler = this.onViewportChange.bind(this);
            this.debouncedEvaluate  = this.debounce(this.evaluateActive.bind(this), MVC_CONFIG.MUTATION_DEBOUNCE_MS);

            this.loadSettings();

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.safeInit(), { once: true });
            } else {
                this.safeInit();
            }
        }

        safeInit() {
            if (!document.body) { setTimeout(() => this.safeInit(), 50); return; }
            this.init();
        }

        init() {
            this.injectStyles();
            this.createMainUI();
            this.attachEventListeners();
            this.setupObservers();
            this.setupVideoPositionObserver();
            setTimeout(() => this.evaluateActive(), MVC_CONFIG.INITIAL_EVAL_DELAY);
        }
    }

    // Mix all module methods into the prototype
    const allKeys = new Set();
    [MVC_Styles, MVC_Utils, MVC_UI, MVC_Video, MVC_Controls].forEach(mod => {
        Object.keys(mod).forEach(k => {
            if (allKeys.has(k)) console.warn(`[MVC] Method collision detected: ${k}`);
            allKeys.add(k);
        });
        Object.assign(MobileVideoController.prototype, mod);
    });

    new MobileVideoController();

})();