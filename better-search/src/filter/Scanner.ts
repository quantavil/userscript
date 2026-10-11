// src/filter/Scanner.ts
//
// Scans result items, assigns data-svf-id, and applies CSS classes for
// liked / disliked / normal. Also handles click-to-reveal on hidden items.
//
// KEY DESIGN: we observe childList, subtree, and href attribute changes on the
// search container to handle lazy-loaded results and autopager appends.

import { SVF_CONFIG } from '../config';
import type { Store } from '../core/Store';
import { normalizeDomain } from '../utils/domain';
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
    // Elements this instance has bound the reveal listener to. A fresh Scanner
    // (SPA re-init) sees items still carrying data-svf-id from a destroyed
    // instance whose listeners were aborted — those need re-binding.
    private _revealBound: WeakSet<HTMLElement> = new WeakSet();
    // Items whose href changed since the last scan: their domain must be re-extracted
    private _pendingRefresh: Set<HTMLElement> = new Set();

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
                if (m.type === 'attributes') {
                    // href swapped on an already-tagged item (SPA node reuse):
                    // queue it for domain re-extraction
                    const el = m.target as Element;
                    const item = el.closest?.(`[${ATTR}]`);
                    if (item instanceof HTMLElement) {
                        this._pendingRefresh.add(item);
                    }
                    shouldScan = true;
                } else {
                    for (const node of m.addedNodes) {
                        // Ignore our own swipe-action backgrounds so a swipe
                        // gesture doesn't trigger a self-inflicted rescan
                        if (node instanceof HTMLElement && node.classList.contains('svf-swipe-bg')) continue;
                        shouldScan = true;
                        break;
                    }
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
        if (this._pendingRefresh.size > 0) {
            const pending = [...this._pendingRefresh];
            this._pendingRefresh.clear();
            for (const item of pending) this._refreshItem(item);
        }
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
        this._pendingRefresh.clear();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private _scheduleScan(): void {
        if (this._debounce) clearTimeout(this._debounce);
        this._debounce = setTimeout(() => this.scanAll(), SVF_CONFIG.SCAN_DEBOUNCE_MS);
    }

    /**
     * Re-extract the URL of an already-tagged item whose href changed.
     * Only updates when extraction yields a different valid domain — engines
     * like Google rewrite hrefs to tracking redirects on interaction, and we
     * must not lose the original domain in that case.
     */
    private _refreshItem(item: HTMLElement): void {
        if (!item.isConnected || !item.hasAttribute(ATTR)) return;
        const href = this._engine.extractUrl(item);
        if (!href) return;
        const domain = normalizeDomain(href);
        if (!domain || domain === item.getAttribute(DOMAIN_ATTR)) return;
        item.setAttribute(DOMAIN_ATTR, domain);
        this._applyClass(item, domain);
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
            this._bindReveal(item); // no-op if this instance already bound it
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
        if (this._revealBound.has(item)) return;
        this._revealBound.add(item);
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
