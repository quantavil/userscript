import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SVF_CONFIG } from '../config';
import type { Store } from '../core/Store';
import type { Scanner } from '../filter/Scanner';
import { applyAccentVariables } from '../types';
import HOVER_CSS from './HoverOverlay.css?inline';
import { STAR_FILLED, STAR_EMPTY, BAN_ICON } from '../ui/icons';

const ATTR = SVF_CONFIG.ITEM_ATTR;
const DOMAIN_ATTR = `${ATTR}-domain`;

@customElement('svf-hover-overlay')
export class HoverOverlayElement extends LitElement {
    static styles = unsafeCSS(HOVER_CSS);

    @property({ attribute: false }) store!: Store;
    @property({ attribute: false }) scanner!: Scanner;
    @property({ attribute: false }) signal!: AbortSignal;

    @state() private _activeDomain = '';
    @state() private _matchState: 'liked' | 'disliked' | 'normal' = 'normal';

    private _activeItem: HTMLElement | null = null;
    private _hideTimer: ReturnType<typeof setTimeout> | null = null;
    private _HIDE_DELAY = 350;
    private _rafId: number | null = null;
    private _lastEvent: PointerEvent | null = null;
    private _unsubscribe?: () => void;
    private _connectedAbortController?: AbortController;

    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe?.();
        if (this.store) {
            this._unsubscribe = this.store.subscribe(() => {
                this._updateMatchState();
            });
        }
        
        this._connectedAbortController?.abort();
        this._connectedAbortController = new AbortController();
        const signal = this._connectedAbortController.signal;

        const docOpts = { signal, passive: true, capture: true };

        document.addEventListener('pointermove', (e) => {
            this._lastEvent = e as PointerEvent;
            if (this._rafId === null) {
                this._rafId = requestAnimationFrame(() => {
                    if (this._lastEvent) {
                        this._onPointerMove(this._lastEvent);
                    }
                    this._rafId = null;
                });
            }
        }, docOpts);

        document.addEventListener('pointerleave', () => {
            this._scheduleHide();
        }, docOpts);

        document.addEventListener('scroll', () => {
            if (this._activeItem && this.classList.contains('visible')) {
                this._positionBar(this._activeItem);
            }
        }, { signal, passive: true, capture: true });

        this.addEventListener('pointerenter', () => this._cancelHide(), { signal });
        this.addEventListener('pointerleave', () => this._scheduleHide(), { signal });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubscribe?.();
        if (this._connectedAbortController) {
            this._connectedAbortController.abort();
            this._connectedAbortController = undefined;
        }
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        if (this._hideTimer) {
            clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
    }

    protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
        super.updated(changedProperties);
        if (this.store) {
            applyAccentVariables(this, this.store.accent);
        }
    }

    private _onPointerMove(e: PointerEvent): void {
        if (e.pointerType === 'touch') return;

        const shadowHost = document.getElementById('svf-shadow-host');
        const panel = (shadowHost?.shadowRoot || shadowHost)?.querySelector('svf-panel') as any;
        if (panel?.isOpen?.()) {
            this._scheduleHide();
            return;
        }

        let target = document.elementFromPoint(e.clientX, e.clientY);
        if (!target) { this._scheduleHide(); return; }

        // Pierce open shadow roots to locate the exact element under pointer
        while (target && target.shadowRoot) {
            const inner = target.shadowRoot.elementFromPoint(e.clientX, e.clientY);
            if (!inner || inner === target) break;
            target = inner;
        }

        const item = target.closest<HTMLElement>(`[${ATTR}]`);
        if (!item) {
            if (target === shadowHost || this === target || this.shadowRoot?.contains(target)) {
                this._cancelHide();
            } else {
                this._scheduleHide();
            }
            return;
        }

        this._cancelHide();

        if (item === this._activeItem) return;

        this._activeItem = item;
        this._activeDomain = item.getAttribute(DOMAIN_ATTR) ?? '';
        this._updateMatchState();
        this._positionBar(item);
    }

    private _positionBar(item: HTMLElement): void {
        const rect = item.getBoundingClientRect();
        const barW = this.offsetWidth || 160;
        const barH = this.offsetHeight || 32;

        let top = rect.top + 4;
        if (rect.top < 0) {
            top = Math.max(4, rect.bottom - barH - 4);
        }

        let left = rect.right - barW - 4;
        if (left < 8) left = rect.left + 8;
        if (left + barW > window.innerWidth - 8) left = window.innerWidth - barW - 8;

        this.style.top  = `${top}px`;
        this.style.left = `${left}px`;
        this.classList.add('visible');
    }

    private _updateMatchState(): void {
        if (!this._activeDomain || !this.store) return;
        this._matchState = this.store.matchDomain(this._activeDomain);
    }

    private _scheduleHide(): void {
        if (this._hideTimer) return;
        this._hideTimer = setTimeout(() => {
            this.classList.remove('visible');
            this._activeItem = null;
            this._activeDomain = '';
            this._hideTimer = null;
        }, this._HIDE_DELAY);
    }

    private _cancelHide(): void {
        if (this._hideTimer) {
            clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
    }

    private _toggle(list: 'liked' | 'disliked', e: Event): void {
        e.stopPropagation();
        if (!this._activeDomain) return;
        if (this._matchState === list) {
            this.store.removeDomain(list, this._activeDomain);
        } else {
            this.store.addDomain(list, this._activeDomain);
        }
        this.scanner.reapply();
    }

    render() {
        return html`
            <button
                class="svf-hb-btn ${this._matchState === 'liked' ? 'like-active' : ''}"
                title=${this._matchState === 'liked' ? 'Remove from Liked' : 'Add to Liked'}
                @click=${(e: Event) => this._toggle('liked', e)}
            >
                ${unsafeHTML(this._matchState === 'liked' ? STAR_FILLED : STAR_EMPTY)}
            </button>
            
            <button
                class="svf-hb-btn ${this._matchState === 'disliked' ? 'dislike-active' : ''}"
                title=${this._matchState === 'disliked' ? 'Remove from Disliked' : 'Add to Disliked'}
                @click=${(e: Event) => this._toggle('disliked', e)}
            >
                ${unsafeHTML(BAN_ICON)}
            </button>
            
            <div class="svf-hb-sep"></div>
            
            <span class="svf-hb-label" title=${this._activeDomain}>${this._activeDomain}</span>
        `;
    }
}
