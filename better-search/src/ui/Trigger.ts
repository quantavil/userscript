import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { PanelElement } from './Panel';
import type { Store } from '../core/Store';
import { applyAccentVariables } from '../types';

import TRIGGER_CSS from './Trigger.css?inline';
import { ICON_TRIGGER } from './icons';

@customElement('svf-trigger')
export class TriggerElement extends LitElement {
    static styles = unsafeCSS(TRIGGER_CSS);

    @property({ attribute: false }) store!: Store;
    @property({ attribute: false }) panel!: PanelElement;

    @state() private _show = false;
    private _unsubscribe?: () => void;

    protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
        super.updated(changedProperties);
        if (this.store) {
            applyAccentVariables(this, this.store.accent);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        this._unsubscribe?.();
        if (this.store) {
            this._show = this.store.showTrigger;
            this._unsubscribe = this.store.subscribe(() => {
                this._show = this.store.showTrigger;
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubscribe?.();
    }

    render() {
        return html`
            <button
                class="svf-trigger"
                aria-label="Open Better Search Settings"
                title="Better Search Settings"
                style="display: ${this._show ? 'grid' : 'none'}"
                @click=${this._handleClick}
            >
                ${unsafeHTML(ICON_TRIGGER)}
            </button>
        `;
    }

    private _handleClick(e: Event) {
        e.stopPropagation();
        if (this.panel) {
            if (this.panel.isOpen()) {
                this.panel.close();
            } else {
                this.panel.open();
            }
        }
    }
}
