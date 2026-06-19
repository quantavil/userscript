/// <reference path="../types.d.ts" />
// src/core/Controller.ts
import { Store } from './Store';
import { FilterStyleSheet } from '../filter/StyleSheet';
import { Scanner } from '../filter/Scanner';
import '../overlay/HoverOverlay';
import type { HoverOverlayElement } from '../overlay/HoverOverlay';
import { MobileSwipe } from '../overlay/MobileSwipe';

import '../ui/Panel';
import '../ui/Trigger';
import type { PanelElement } from '../ui/Panel';
import type { TriggerElement } from '../ui/Trigger';
import { detectEngine } from '../engines/index';
import type { EngineConfig } from '../types';
import { GistSync } from './GistSync';

let historyHooked = false;

/** Hooks into history API to dispatch custom events for SPA navigation */
function hookHistoryEvents() {
    if (historyHooked) return;
    historyHooked = true;

    const patch = (type: 'pushState' | 'replaceState') => {
        const orig = history[type];
        history[type] = function (this: History, ...args: any[]) {
            const res = orig.apply(this, args as any);
            window.dispatchEvent(new Event('svf-location-change'));
            return res;
        };
    };
    patch('pushState');
    patch('replaceState');
}

export class Controller {
    private _store: Store | null = null;
    private _gistSync: GistSync | null = null;
    private _styleSheet: FilterStyleSheet | null = null;
    private _scanner: Scanner | null = null;
    private _hoverOverlay: HoverOverlayElement | null = null;
    private _mobileSwipe: MobileSwipe | null = null;

    private _panel: PanelElement | null = null;
    private _trigger: TriggerElement | null = null;
    private _shadowHost: HTMLDivElement | null = null;
    private _abortController: AbortController | null = null;
    private _engine: EngineConfig | null = null;
    private _attachInterval: ReturnType<typeof setInterval> | null = null;
    private _locationTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this._onLocationChange = this._onLocationChange.bind(this);
    }

    init(): void {
        const globalKey = '__svf_controller';
        const prevController = (window as any)[globalKey];
        if (prevController && prevController !== this) {
            try {
                prevController.destroy();
            } catch (err) {
                console.error('[SVF] Error destroying previous controller instance:', err);
            }
        }
        this.destroy(); // clean teardown of any existing instance
        (window as any)[globalKey] = this;

        try {
            this._abortController = new AbortController();
            const signal = this._abortController.signal;

            this._engine = detectEngine();
            if (!this._engine) {
                return; // Not on a supported search engine page
            }

            this._store = new Store();
            this._gistSync = new GistSync(this._store);
            this._styleSheet = new FilterStyleSheet(this._store);
            this._scanner = new Scanner(this._store, this._engine, signal);
            this._store.subscribe(() => {
                this._scanner?.reapply();
            });
            // Create Shadow Host for the isolated Trigger and Panel UI
            this._shadowHost = document.createElement('div');
            this._shadowHost.id = 'svf-shadow-host';
            this._shadowHost.style.position = 'fixed';
            this._shadowHost.style.zIndex = '2147483644';
            this._shadowHost.style.pointerEvents = 'none';
            this._shadowHost.style.userSelect = 'none';
            (this._shadowHost.style as any).webkitUserSelect = 'none';
            
            const shadow = this._shadowHost.attachShadow({ mode: 'open' });
            (document.body || document.documentElement).appendChild(this._shadowHost);

            this._panel = document.createElement('svf-panel') as PanelElement;
            this._panel.store = this._store;
            this._panel.scanner = this._scanner;
            this._panel.gistSync = this._gistSync;
            shadow.appendChild(this._panel);

            if (this._store.syncEnabled) {
                this._gistSync.enableAutoSync();
            }

            this._trigger = document.createElement('svf-trigger') as TriggerElement;
            this._trigger.store = this._store;
            this._trigger.panel = this._panel;
            shadow.appendChild(this._trigger);

            this._hoverOverlay = document.createElement('svf-hover-overlay') as HoverOverlayElement;
            this._hoverOverlay.store = this._store;
            this._hoverOverlay.scanner = this._scanner;
            this._hoverOverlay.signal = signal;
            shadow.appendChild(this._hoverOverlay);

            this._mobileSwipe = new MobileSwipe(this._store, this._scanner, signal);

            // Register Tampermonkey / Violentmonkey settings menu command
            if (typeof GM_registerMenuCommand === 'function') {
                GM_registerMenuCommand('Better Search Settings', () => {
                    this._panel?.open();
                });
            }

            // Try synchronous attach first, only poll if container isn't ready yet
            if (!this._scanner?.attach()) {
                this._startAttachInterval();
            }

            // Listen for SPA location changes
            window.addEventListener('popstate', this._onLocationChange, { signal });
            window.addEventListener('svf-location-change', this._onLocationChange, { signal });

            hookHistoryEvents();
        } catch (err) {
            this.destroy();
            throw err;
        }
    }

    destroy(): void {
        if (this._locationTimeout) {
            clearTimeout(this._locationTimeout);
            this._locationTimeout = null;
        }

        if (this._attachInterval) {
            clearInterval(this._attachInterval);
            this._attachInterval = null;
        }

        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        if (this._scanner) {
            this._scanner.destroy();
            this._scanner = null;
        }

        if (this._hoverOverlay) {
            this._hoverOverlay.remove();
            this._hoverOverlay = null;
        }

        if (this._mobileSwipe) {
            this._mobileSwipe.destroy();
            this._mobileSwipe = null;
        }

        if (this._styleSheet) {
            this._styleSheet.destroy();
            this._styleSheet = null;
        }

        if (this._shadowHost) {
            this._shadowHost.remove();
            this._shadowHost = null;
        }

        if (this._gistSync) {
            this._gistSync.destroy();
            this._gistSync = null;
        }

        if (this._store) {
            this._store.destroy();
            this._store = null;
        }

        this._panel = null;
        this._trigger = null;
        this._engine = null;

        const globalKey = '__svf_controller';
        if ((window as any)[globalKey] === this) {
            (window as any)[globalKey] = null;
        }
    }

    private _onLocationChange(): void {
        if (this._locationTimeout) {
            clearTimeout(this._locationTimeout);
        }
        // Debounce slightly to allow the DOM to start updating before detecting the new engine
        this._locationTimeout = setTimeout(() => {
            this._locationTimeout = null;
            const nextEngine = detectEngine();
            if (!nextEngine) {
                this.destroy();
                return;
            }

            // Only re-init if the engine type has actually changed
            if (!this._engine || this._engine.name !== nextEngine.name) {
                this.init();
            } else {
                // Same engine, just re-attach scanner to the new container in the SPA DOM
                if (!this._scanner?.attach()) {
                    this._startAttachInterval();
                }
            }
        }, 150);
    }

    private _startAttachInterval(): void {
        this._clearAttachInterval();
        let attempts = 0;
        this._attachInterval = setInterval(() => {
            if (this._scanner?.attach()) {
                this._clearAttachInterval();
            } else if (++attempts > 40) { // Stop polling after 20s
                this._clearAttachInterval();
            }
        }, 500);
    }

    private _clearAttachInterval(): void {
        if (this._attachInterval) {
            clearInterval(this._attachInterval);
            this._attachInterval = null;
        }
    }
}
