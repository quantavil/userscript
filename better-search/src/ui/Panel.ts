import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ref } from 'lit/directives/ref.js';
import { Store } from '../core/Store';
import { Scanner } from '../filter/Scanner';
import { ICON_CLOSE, ICON_SEARCH, ICON_CLEAR, ICON_DOWNLOAD, ICON_IMPORT, ICON_EDIT, ICON_DELETE, ICON_EYE, ICON_EYE_OFF } from './icons';
import { parseJsonRobust } from '../utils/json';
import { getRegisterableDomain } from '../utils';
import { ACCENT_COLORS, applyAccentVariables } from '../types';
import type { AccentColor } from '../types';
import { GistSync } from '../core/GistSync';
import { SVF_CONFIG } from '../config';
import PANEL_CSS from './Panel.css?inline';

@customElement('svf-panel')
export class PanelElement extends LitElement {
    static styles = unsafeCSS(PANEL_CSS);

    @property({ attribute: false }) store!: Store;
    @property({ attribute: false }) scanner!: Scanner;
    @property({ attribute: false }) gistSync!: GistSync;

    @state() private _isOpen = false;
    @state() private _activeTab: 'filters' | 'io' | 'settings' = 'filters';
    @state() private _searchQuery = '';
    @state() private _ioStatus: { msg: string, type: 'success' | 'error' } | null = null;
    @state() private _isFetchingUrl = false;
    
    @state() private _isSyncing = false;
    @state() private _syncStatus: { msg: string, type: 'success' | 'error' } | null = null;
    @state() private _tokenVisible = false;
    
    @state() private _likedText = '';
    @state() private _dislikedText = '';
    @state() private _editingMatches: Record<string, string> = {};

    private _lastActiveElement: HTMLElement | null = null;
    private _unsubscribe?: () => void;
    private _ioTimeout?: number;
    private _syncStatusTimeout?: number;
    private _isTextareaFocused: Record<'liked' | 'disliked', boolean> = { liked: false, disliked: false };

    @query('.svf-close-btn') _closeBtn!: HTMLButtonElement;
    @query('#svf-liked-textarea') _likedTextarea!: HTMLTextAreaElement;
    @query('#svf-disliked-textarea') _dislikedTextarea!: HTMLTextAreaElement;

    connectedCallback() {
        super.connectedCallback();
        
        if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Outfit"]')) {
            const fontLink = document.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap';
            document.head.appendChild(fontLink);
        }

        this.style.display = 'none';

        this._unsubscribe?.();
        if (this.store) {
            this._syncTextFromStore();
            this._unsubscribe = this.store.subscribe(() => {
                this.requestUpdate();
                this._syncTextFromStore();
            });
        }

        window.removeEventListener('keydown', this._handleKeydown);
        window.addEventListener('keydown', this._handleKeydown);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubscribe?.();
        window.removeEventListener('keydown', this._handleKeydown);
        document.body.style.removeProperty('overflow');
    }
    
    private _syncTextFromStore() {
        if (!this._isTextareaFocused.liked) {
            this._likedText = this.store.liked.join('\n');
        }
        if (!this._isTextareaFocused.disliked) {
            this._dislikedText = this.store.disliked.join('\n');
        }
    }

    protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
        super.updated(changedProperties);
        if (this.store) {
            applyAccentVariables(this, this.store.accent);
        }
    }

    open(): void {
        this.style.display = 'block';
        this.offsetHeight; // force reflow
        
        document.body.style.setProperty('overflow', 'hidden');
        
        this._lastActiveElement = document.activeElement as HTMLElement;
        this._isOpen = true;
        this._syncTextFromStore();
        setTimeout(() => {
            this._closeBtn?.focus();
        }, 50);
    }

    close(): void {
        this._isOpen = false;
        document.body.style.removeProperty('overflow');
        if (this._lastActiveElement) {
            this._lastActiveElement.focus();
            this._lastActiveElement = null;
        }
        
        const card = this.shadowRoot?.querySelector('.svf-card') as HTMLElement;
        if (card) {
            card.addEventListener('transitionend', (e) => {
                if (!this._isOpen && e.propertyName === 'opacity') {
                    this.style.display = 'none';
                }
            }, { once: true });
        } else {
            this.style.display = 'none';
        }
    }

    isOpen(): boolean {
        return this._isOpen;
    }

    private _handleKeydown = (e: KeyboardEvent) => {
        if (!this._isOpen) return;
        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'Tab') {
            this._handleTab(e);
        }
    }
    
    private _handleTab(e: KeyboardEvent): void {
        const focusables = Array.from(
            this.shadowRoot!.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => {
            if ((el as any).disabled) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const style = window.getComputedStyle(el);
            return style.visibility !== 'hidden' && style.opacity !== '0';
        });

        if (focusables.length === 0) return;

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = this.shadowRoot!.activeElement;

        if (e.shiftKey) {
            if (active === first || !focusables.includes(active as HTMLElement)) {
                last.focus();
                e.preventDefault();
            }
        } else {
            if (active === last || !focusables.includes(active as HTMLElement)) {
                first.focus();
                e.preventDefault();
            }
        }
    }

    render() {
        return html`
            <div class="svf-backdrop ${this._isOpen ? 'open' : ''}" @click=${this.close}></div>
            <div class="svf-card ${this._isOpen ? 'open' : ''}">
                <div class="svf-header">
                    <div class="svf-title-group">
                        <div class="svf-title">Better Search ⭐</div>
                    </div>
                    <button class="svf-close-btn" @click=${this.close}>${unsafeHTML(ICON_CLOSE)}</button>
                </div>
                
                <div class="svf-tab-nav">
                    <button class="svf-tab-btn ${this._activeTab === 'filters' ? 'active' : ''}" @click=${() => this._activeTab = 'filters'}>Domain Filter</button>
                    <button class="svf-tab-btn ${this._activeTab === 'io' ? 'active' : ''}" @click=${() => this._activeTab = 'io'}>Import/Export/Sync</button>
                    <button class="svf-tab-btn ${this._activeTab === 'settings' ? 'active' : ''}" @click=${() => this._activeTab = 'settings'}>Settings</button>
                </div>
                
                <div class="svf-body">
                    <div class="svf-tab-content ${this._activeTab === 'filters' ? 'active' : ''}" style="display: ${this._activeTab === 'filters' ? 'flex' : 'none'}">
                        ${this._renderFiltersTab()}
                    </div>
                    <div class="svf-tab-content ${this._activeTab === 'io' ? 'active' : ''}" style="display: ${this._activeTab === 'io' ? 'flex' : 'none'}">
                        ${this._renderIOTab()}
                    </div>
                    <div class="svf-tab-content ${this._activeTab === 'settings' ? 'active' : ''}" style="display: ${this._activeTab === 'settings' ? 'flex' : 'none'}">
                        ${this._renderSettingsTab()}
                    </div>
                </div>
            </div>
        `;
    }

    private _renderFiltersTab() {
        return html`
            <div class="svf-search-wrapper">
                <span class="svf-search-icon">${unsafeHTML(ICON_SEARCH)}</span>
                <input type="text" id="svf-unified-search" class="svf-search-input" placeholder="Filter all domains (e.g. github)..." .value=${this._searchQuery} @input=${(e: any) => this._searchQuery = e.target.value.trim().toLowerCase()}>
                <button type="button" class="svf-clear-btn" style="display: ${this._searchQuery ? 'block' : 'none'}" @click=${() => { this._searchQuery = ''; this.shadowRoot?.querySelector<HTMLElement>('#svf-unified-search')?.focus(); }}>
                    ${unsafeHTML(ICON_CLEAR)}
                </button>
            </div>
            ${this._renderSection('liked', 'Preferred Domains')}
            ${this._renderSection('disliked', 'Disliked Domains')}
        `;
    }

    private _renderSection(type: 'liked' | 'disliked', titleText: string) {
        const domains = type === 'liked' ? this.store.liked : this.store.disliked;
        const textValue = type === 'liked' ? this._likedText : this._dislikedText;
        const lines = this._getLines(textValue);
        
        const uniques = new Set(lines);
        const duplicateCount = lines.length - uniques.size;
        
        let proposalFound = false;
        let activeProposal: string | null = null;
        
        if (!this._searchQuery) {
            const tree: Record<string, string[]> = {};
            lines.forEach(dom => {
                const root = getRegisterableDomain(dom);
                if (!tree[root]) tree[root] = [];
                tree[root].push(dom);
            });

            for (const root of Object.keys(tree)) {
                const subCount = tree[root].length;
                const isWildcardRule = tree[root].includes(`*.${root}`);
                if (subCount >= 3 && !isWildcardRule) {
                    activeProposal = root;
                    proposalFound = true;
                    break;
                }
            }
        }
        
        const matches = this._searchQuery ? domains.filter(d => d.toLowerCase().includes(this._searchQuery)) : [];
        const badgeText = this._searchQuery ? `${matches.length} match${matches.length !== 1 ? 'es' : ''}` : String(domains.length);

        return html`
            <div class="svf-section ${type}">
                <div class="svf-section-header">
                    <div class="svf-label">${titleText}</div>
                    <span class="svf-badge" id="svf-${type}-count">${badgeText}</span>
                </div>
                
                ${!this._searchQuery && proposalFound && activeProposal ? html`
                    <div class="svf-merger-card" id="svf-${type}-proposal-card" style="display: flex">
                        <div class="svf-merger-info">
                            <div class="svf-merger-title">💡 Wildcard Suggestion</div>
                            <div class="svf-merger-desc">${lines.filter(l => getRegisterableDomain(l) === activeProposal).length} subdomains of '${activeProposal}' found. Merge to *.${activeProposal}?</div>
                        </div>
                        <button class="svf-merger-btn" type="button" @click=${() => {
                            const rule = `*.${activeProposal}`;
                            const filtered = lines.filter(line => getRegisterableDomain(line) !== activeProposal);
                            if (!filtered.includes(rule)) filtered.push(rule);
                            this._saveAndReapply(type, filtered);
                            if (type === 'liked') this._likedText = filtered.join('\n');
                            else this._dislikedText = filtered.join('\n');
                        }}>Consolidate</button>
                    </div>
                ` : nothing}
                
                ${this._searchQuery ? html`
                    <div class="svf-filtered-list" id="svf-${type}-filtered-list" style="display: flex">
                        ${matches.length === 0 ? html`
                            <div class="svf-filtered-empty">No matching domains</div>
                        ` : matches.map(match => {
                            const isEditing = this._editingMatches[`${type}:${match}`] !== undefined;
                            return html`
                                <div class="svf-filtered-item">
                                    ${isEditing ? html`
                                        <input type="text" class="svf-filtered-input" .value=${this._editingMatches[`${type}:${match}`]}
                                            @blur=${(e: any) => this._saveEdit(type, match, e.target.value)}
                                            @keydown=${(e: KeyboardEvent) => {
                                                if (e.key === 'Enter') this._saveEdit(type, match, (e.target as HTMLInputElement).value);
                                                if (e.key === 'Escape') this._cancelEdit(type, match);
                                            }}
                                            ${ref((el) => { if(el) setTimeout(() => (el as HTMLElement).focus(), 0) })}
                                        >
                                    ` : html`
                                        <span class="svf-filtered-text">${match}</span>
                                        <div class="svf-filtered-actions">
                                            <button type="button" class="svf-filtered-btn" title="Edit" @click=${() => this._startEdit(type, match)}>
                                                ${unsafeHTML(ICON_EDIT)}
                                            </button>
                                            <button type="button" class="svf-filtered-btn delete" title="Remove" @click=${() => this._deleteMatch(type, match)}>
                                                ${unsafeHTML(ICON_DELETE)}
                                            </button>
                                        </div>
                                    `}
                                </div>
                            `;
                        })}
                    </div>
                ` : html`
                        <textarea class="svf-textarea" id="svf-${type}-textarea" placeholder="e.g.\nstackoverflow.com\ngithub.com"
                        style="display: block"
                        .value=${textValue}
                        @input=${(e: any) => {
                            if (type === 'liked') this._likedText = e.target.value;
                            else this._dislikedText = e.target.value;
                        }}
                        @focus=${() => this._isTextareaFocused[type] = true}
                        @blur=${() => {
                            this._isTextareaFocused[type] = false;
                        }}
                    ></textarea>
                    
                    <div class="svf-textarea-status-row" style="display: flex">
                        <div class="svf-textarea-msg-info" id="svf-${type}-msg-info">
                            ${duplicateCount > 0 ? html`<span style="color: var(--svf-danger)">⚠️ ${duplicateCount} duplicates found (will merge on apply)</span>` : html`${lines.length} domains configured`}
                        </div>
                        <button class="svf-apply-btn" id="svf-${type}-apply" type="button" @click=${() => this._saveAndReapply(type, lines)}>
                            Apply Changes
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    private _renderSettingsTab() {
        const accent = this.store.accent;
        const mode = this.store.dislikeMode;
        return html`
            <div class="svf-control-group">
                <div class="svf-label">Dislike Filter Mode</div>
                <div class="svf-segmented">
                    <button class="svf-seg-btn ${mode === 'fade' ? 'active' : ''}" @click=${() => { this.store.setDislikeMode('fade'); this.scanner.reapply(); }}>Fade Results</button>
                    <button class="svf-seg-btn ${mode === 'hide' ? 'active' : ''}" @click=${() => { this.store.setDislikeMode('hide'); this.scanner.reapply(); }}>Hide (Reveal-on-click)</button>
                </div>
            </div>

            <div class="svf-control-group">
                <div class="svf-label">Theme Accent Color</div>
                <div class="svf-color-picker-row">
                    ${(Object.keys(ACCENT_COLORS) as AccentColor[]).map(name => {
                        const acc = ACCENT_COLORS[name];
                        return html`
                            <div class="svf-color-dot ${name === accent ? 'active' : ''}" data-accent="${name}" style="background-color: ${acc.primary}; --dot-glow: ${acc.dotGlow}" @click=${() => this.store.setAccent(name)}></div>
                        `;
                    })}
                </div>
            </div>

            <div class="svf-control-group">
                <div class="svf-label">Preferences</div>
                <div class="svf-switch-row">
                    <div class="svf-switch-label-group">
                        <div class="svf-switch-title">Show floating button</div>
                        <div class="svf-switch-desc">Toggle settings icon visibility in the bottom right</div>
                    </div>
                    <label class="svf-switch">
                        <input type="checkbox" id="svf-pref-show-trigger" .checked=${this.store.showTrigger} @change=${(e: any) => this.store.setShowTrigger(e.target.checked)}>
                        <span class="svf-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }

    private _renderIOTab() {
        return html`
            <div class="svf-io-section" style="border-top: none; padding-top: 0">
                <div class="svf-label">Import / Export File</div>
                
                <div class="svf-io-row">
                    <input type="file" accept=".json,application/json" class="svf-io-file" id="svf-io-file" @change=${this._importFile}>
                    <button class="svf-io-btn" @click=${() => this.shadowRoot?.querySelector<HTMLInputElement>('#svf-io-file')?.click()}>
                        ${unsafeHTML(ICON_IMPORT)} Import File
                    </button>
                    <button class="svf-io-btn" @click=${this._downloadJson}>
                        ${unsafeHTML(ICON_DOWNLOAD)} Export File
                    </button>
                </div>

                <div class="svf-label" style="margin-top: 4px">Import from Gist</div>
                <form class="svf-io-url-form" @submit=${(e: Event) => { e.preventDefault(); this._quickImportGist(); }}>
                    <input type="url" class="svf-io-url-input" id="svf-io-url-input" .value=${SVF_CONFIG.GIST_IMPORT_URL} placeholder="https://gist.githubusercontent.com/…/domains.json" ?disabled=${this._isFetchingUrl} @input=${(e: any) => e.target.classList.remove('invalid')}>
                    <button type="submit" class="svf-io-btn primary" id="svf-url-fetch-btn" style="flex: 0 0 auto" ?disabled=${this._isFetchingUrl}>${this._isFetchingUrl ? 'Importing...' : 'Import'}</button>
                </form>
                
                ${this._ioStatus ? html`<div class="svf-io-status ${this._ioStatus.type}" style="display: block">${this._ioStatus.msg}</div>` : html`<div class="svf-io-status" style="display: none"></div>`}
            </div>

            <div class="svf-io-section svf-sync-section">
                <div class="svf-label">Gist Sync (optional)</div>
                <div class="svf-sync-field">
                    <div class="svf-sync-field-label">GitHub Token</div>
                    <div class="svf-sync-input-row">
                        <input type="${this._tokenVisible ? 'text' : 'password'}" 
                               id="svf-sync-token" 
                               class="svf-sync-input" 
                               .value=${this.store.gistToken} 
                               placeholder="ghp_..."
                               @change=${(e: any) => { this.store.setGistToken(e.target.value); this.gistSync.enableAutoSync(); }}>
                        <button class="svf-sync-icon-btn" @click=${() => this._tokenVisible = !this._tokenVisible}>
                            ${unsafeHTML(this._tokenVisible ? ICON_EYE_OFF : ICON_EYE)}
                        </button>
                    </div>
                </div>

                <div class="svf-sync-field">
                    <div class="svf-sync-field-label">Gist ID</div>
                    <div class="svf-sync-input-row">
                        <input type="text" 
                               id="svf-sync-gistid" 
                               class="svf-sync-input" 
                               .value=${this.store.gistId} 
                               placeholder="Leave empty to create new"
                               @change=${(e: any) => { this.store.setGistId(e.target.value); this.gistSync.enableAutoSync(); }}>
                    </div>
                </div>

                <div class="svf-sync-actions-row">
                    <button class="svf-io-btn primary" @click=${this._syncPull} ?disabled=${this._isSyncing || !this.store.gistToken || !this.store.gistId}>
                        Pull (Replace)
                    </button>
                    <button class="svf-io-btn primary" @click=${this._syncPush} ?disabled=${this._isSyncing || !this.store.gistToken}>
                        Push (Merge)
                    </button>
                </div>

                <div class="svf-switch-row" style="margin-top: 12px; border-top: 1px solid var(--svf-border); padding-top: 12px;">
                    <div class="svf-switch-label-group">
                        <div class="svf-switch-title">Auto-sync</div>
                        <div class="svf-switch-desc">Push 10s after changes · Pull every 1hr · Pull before push</div>
                    </div>
                    <label class="svf-switch">
                        <input type="checkbox" 
                               id="svf-sync-enabled" 
                               .checked=${this.store.syncEnabled} 
                               ?disabled=${!this.store.gistToken}
                               @change=${(e: any) => {
                                    const en = e.target.checked;
                                    this.store.setSyncEnabled(en);
                                    if (en) this.gistSync.enableAutoSync();
                                    else this.gistSync.disableAutoSync();
                                }}>
                        <span class="svf-slider"></span>
                    </label>
                </div>

                ${this._syncStatus ? html`<div class="svf-io-status ${this._syncStatus.type}" style="display: block">${this._syncStatus.msg}</div>` : nothing}
            </div>
        `;
    }

    private _showStatus(msg: string, type: 'success' | 'error') {
        this._ioStatus = { msg, type };
        clearTimeout(this._ioTimeout);
        this._ioTimeout = window.setTimeout(() => { this._ioStatus = null; }, 3500);
    }

    private _downloadJson() {
        const json = JSON.stringify(this.store.exportDomains(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'svf-domains.json';
        a.click();
        URL.revokeObjectURL(url);
        this._showStatus('Downloaded svf-domains.json', 'success');
    }

    private _importFile(e: Event) {
        const fileInput = e.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            this._applyImport(reader.result as string, 'file');
            fileInput.value = '';
        };
        reader.readAsText(file);
    }

    private _quickImportGist() {
        const urlInput = this.shadowRoot?.querySelector<HTMLInputElement>('#svf-io-url-input');
        const url = urlInput?.value.trim() || SVF_CONFIG.GIST_IMPORT_URL;
        this._isFetchingUrl = true;
        this._fetchAndImport(url, () => {
            this._isFetchingUrl = false;
        });
    }

    private _showSyncStatus(msg: string, type: 'success' | 'error') {
        this._syncStatus = { msg, type };
        clearTimeout(this._syncStatusTimeout);
        this._syncStatusTimeout = window.setTimeout(() => { this._syncStatus = null; }, 4000);
    }

    private async _runSync(action: () => Promise<string>, errPrefix: string) {
        this._isSyncing = true;
        try {
            const msg = await action();
            this._showSyncStatus(msg, 'success');
        } catch (err: any) {
            this._showSyncStatus(err?.message || errPrefix, 'error');
        } finally {
            this._isSyncing = false;
        }
    }

    private _syncPull() {
        this._runSync(async () => {
            const count = await this.gistSync.pull('replace');
            this.scanner.reapply();
            return `Successfully pulled ${count} domains (replaced local lists)`;
        }, 'Failed to pull from Gist');
    }

    private _syncPush() {
        this._runSync(async () => {
            await this.gistSync.push();
            return 'Successfully pushed domains to Gist';
        }, 'Failed to push to Gist');
    }

    private _applyImport(text: string, source: 'file' | 'url') {
        try {
            const data = parseJsonRobust(text);
            const n = this.store.importDomains(data);
            this.scanner.reapply();
            const suffix = source === 'url' ? ' from URL' : '';
            this._showStatus(`Imported ${n} new domain${n !== 1 ? 's' : ''}${suffix}`, 'success');
        } catch {
            const errorMsg = source === 'url' ? 'Invalid JSON at URL' : 'Invalid JSON file';
            this._showStatus(errorMsg, 'error');
        }
    }

    private _fetchAndImport(url: string, onDone: () => void) {
        const TIMEOUT_MS = 10_000;
        if (typeof GM_xmlhttpRequest === 'function') {
            let timedOut = false;
            const timeoutId = setTimeout(() => {
                timedOut = true;
                this._showStatus('Request timed out', 'error');
                onDone();
            }, TIMEOUT_MS);

            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: TIMEOUT_MS,
                onload: (resp: any) => {
                    if (timedOut) return;
                    clearTimeout(timeoutId);
                    if (resp.status >= 200 && resp.status < 300) {
                        this._applyImport(resp.responseText, 'url');
                    } else {
                        this._showStatus(`Fetch failed: ${resp.status} ${resp.statusText}`, 'error');
                    }
                    onDone();
                },
                onerror: () => {
                    if (timedOut) return;
                    clearTimeout(timeoutId);
                    this._showStatus('Network error fetching URL', 'error');
                    onDone();
                },
                ontimeout: () => {
                    if (timedOut) return;
                    clearTimeout(timeoutId);
                    this._showStatus('Request timed out', 'error');
                    onDone();
                },
            });
        } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            fetch(url, { signal: controller.signal })
                .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
                .then(text => {
                    this._applyImport(text, 'url');
                })
                .catch((err) => {
                    if (err?.name === 'AbortError') {
                        this._showStatus('Request timed out', 'error');
                    } else {
                        this._showStatus('Failed to fetch or parse URL', 'error');
                    }
                })
                .finally(() => {
                    clearTimeout(timeoutId);
                    onDone();
                });
        }
    }

    private _startEdit(type: 'liked'|'disliked', match: string) {
        this._editingMatches = { ...this._editingMatches, [`${type}:${match}`]: match };
    }
    
    private _cancelEdit(type: 'liked'|'disliked', match: string) {
        if (this._editingMatches[`${type}:${match}`] === undefined) return;
        const next = { ...this._editingMatches };
        delete next[`${type}:${match}`];
        this._editingMatches = next;
    }
    
    private _saveEdit(type: 'liked'|'disliked', oldMatch: string, newValRaw: string) {
        if (this._editingMatches[`${type}:${oldMatch}`] === undefined) return;
        const newVal = newValRaw.trim().toLowerCase();
        if (newVal && newVal !== oldMatch) {
            const domains = type === 'liked' ? this.store.liked : this.store.disliked;
            const updated = domains.map(d => d === oldMatch ? newVal : d);
            this._saveAndReapply(type, updated);
        }
        this._cancelEdit(type, oldMatch);
    }
    
    private _deleteMatch(type: 'liked'|'disliked', match: string) {
        const domains = type === 'liked' ? this.store.liked : this.store.disliked;
        const updated = domains.filter(d => d !== match);
        this._saveAndReapply(type, updated);
    }

    private _getLines(text: string): string[] {
        return text.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
    }
    private _saveAndReapply(type: 'liked' | 'disliked', domains: string[]): void {
        const deduped = [...new Set(domains)];
        deduped.sort();
        this.store.setDomains(type, deduped);
        this.scanner.reapply();
    }
}
