import { Store } from '../core/Store';
import { applyAccentVariables, removeAccentVariables } from '../types';
import BASE_CSS from './StyleSheet.css?inline';

export class FilterStyleSheet {
    private _el: HTMLStyleElement;
    private _store: Store;
    private _unsub: () => void;
    constructor(store: Store) {
        this._store = store;

        this._el = document.createElement('style');
        this._el.id = 'svf-styles';
        this._el.textContent = BASE_CSS;
        document.head.appendChild(this._el);

        this._updateVariables();
        this._unsub = this._store.subscribe(() => this._updateVariables());
    }

    private _updateVariables(): void {
        const accent = this._store.accent;
        applyAccentVariables(document.documentElement, accent);
    }

    destroy(): void {
        this._unsub();
        this._el.remove();
        
        // Remove variables from root
        removeAccentVariables(document.documentElement);
    }
}
