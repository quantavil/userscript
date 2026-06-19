// src/filter/Scanner.ts
//
// Scans result items, assigns data-svf-id, and applies CSS classes for
// liked / disliked / normal. Also handles click-to-reveal on hidden items.
//
// KEY DESIGN: we only observe childList on the search container — NOT subtree.
// This means autopager appending new <li>/<div> result items to the container
// triggers our observer without us watching the entire document.

import { SVF_CONFIG } from '../config';
import type { Store } from '../core/Store';
import { normalizeDomain } from '../core/Store';
import type { EngineConfig } from '../types';


const ATTR = SVF_CONFIG.ITEM_ATTR;
const DOMAIN_ATTR = `${ATTR}-domain`;

let _counter = 0;
const nextId = () => `${++_counter}`;

export class Scanner {
    private _store: Store;
    private _engine: EngineConfig;
    private _container: Element | null = null;
    private _observer: MutationObserver | null = null;
    private _debounce: ReturnType<typeof setTimeout> | null = null;
    private _abortSignal: AbortSignal;
    // Track revealed items so we can re-hide them when user changes mode
    private _revealedElements: WeakSet<HTMLElement> = new WeakSet();

    constructor(store: Store, engine: EngineConfig, abortSignal: AbortSignal) {
        this._store = store;
        this._engine = engine;
        this._abortSignal = abortSignal;
    }

    /** Find the container and start observing. Returns false if not found yet. */
    attach(): boolean {
        const container = document.querySelector(this._engine.containerSelector);
        if (!container) return false;

        if (this._container === container) return true; // already watching this one

        this._disconnect();
        this._container = container;

        this._observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
                if (m.type === 'attributes' && m.attributeName === 'href') {
                    shouldScan = true;
                    break;
                }
            }
            if (!shouldScan) return;
            this._scheduleScan();
        });

        // childList and subtree, watching for new nodes and href attribute changes
        this._observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });

        // Run an initial scan
        this.scanAll();
        return true;
    }

    /** Full re-scan of all items. Called on init and on settings change. */
    scanAll(): void {
        if (!this._container) return;
        const items = this._container.querySelectorAll(this._engine.itemSelector);
        items.forEach(item => this._processItem(item));
    }

    /** Re-apply classes to all already-scanned items (e.g. after settings change). */
    reapply(): void {
        if (!this._container) return;
        const items = this._container.querySelectorAll<HTMLElement>(`[${ATTR}]`);
        items.forEach(item => {
            const domain = item.getAttribute(DOMAIN_ATTR) ?? '';
            this._applyClass(item, domain);
        });
    }

    destroy(): void {
        this._disconnect();
        if (this._debounce) clearTimeout(this._debounce);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private _scheduleScan(): void {
        if (this._debounce) clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this.scanAll(), SVF_CONFIG.SCAN_DEBOUNCE_MS);
    }

    private _processItem(item: Element): void {
        // Skip non-element nodes
        if (!(item instanceof HTMLElement)) return;

        // Skip nested results to avoid double processing sub-elements
        if (item.parentElement && item.parentElement.closest(this._engine.itemSelector)) {
            return;
        }

        // If already scanned but maybe new items were added by autopager clone
        // Just re-apply classes (domain already stored in attr)
        if (item.hasAttribute(ATTR)) {
            const domain = item.getAttribute(DOMAIN_ATTR) ?? '';
            this._applyClass(item, domain);
            return;
        }

        // Extract the result URL
        const href = this._engine.extractUrl(item);
        if (!href) return;

        const domain = normalizeDomain(href);
        if (!domain) return;

        // Assign a stable id — our only write to this element
        const id = nextId();
        item.setAttribute(ATTR, id);
        item.setAttribute(DOMAIN_ATTR, domain);

        this._applyClass(item, domain);
        this._bindReveal(item);
    }

    private _applyClass(item: HTMLElement, domain: string): void {
        const id = item.getAttribute(ATTR) ?? '';
        const match = this._store.matchDomain(domain);
        const mode  = this._store.dislikeMode;

        // Remove all our classes first
        item.classList.remove(
            `svf-liked`,
            `svf-fade`,
            `svf-hide`,
            `svf-revealed`,
        );

        if (match === 'liked') {
            item.classList.add(`svf-liked`);
        } else if (match === 'disliked') {
            if (mode === 'hide') {
                if (this._revealedElements.has(item)) {
                    item.classList.add(`svf-revealed`);
                } else {
                    item.classList.add(`svf-hide`);
                }
            } else {
                item.classList.add(`svf-fade`);
            }
        }
        // 'normal' → no classes
    }

    private _bindReveal(item: HTMLElement): void {
        item.addEventListener('click', (e) => {
            if (!item.classList.contains(`svf-hide`)) return;
            // Don't follow the link — just reveal
            e.preventDefault();
            e.stopPropagation();
            this._revealedElements.add(item);
            item.classList.remove(`svf-hide`);
            item.classList.add(`svf-revealed`);
        }, { capture: true, signal: this._abortSignal });
    }

    private _disconnect(): void {
        this._observer?.disconnect();
        this._observer = null;
        this._container = null;
    }
}
