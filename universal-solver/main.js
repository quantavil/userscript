// ==UserScript==
// @name         Universal Captcha Solver
// @namespace    http://github.com/quantavil
// @version      1.3
// @description  Solve captchas on any website using Gemini AI with a generic selector picker
// @author       quantavil
// @match        *://*/*
// @license      MIT
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        get apiKey() { return GM_getValue('gemini_api_key', ''); },
        get model() { return GM_getValue('gemini_model', 'gemma-3-27b-it'); },
        timeouts: {
            imageLoad: 5000,
            api: 12000
        },
        delays: {
            initialRun: 100,
            afterRefresh: 100,
            afterSrcChange: 50
        }
    };

    // --- Neo-Brutal Minimal UI Styles ---
    const STYLES = `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');

        :root {
            --ucs-bg: #fffef8;
            --ucs-bg-solid: #fffef8;
            --ucs-border: #1a1a1a;
            --ucs-border-light: #1a1a1a;
            --ucs-text: #1a1a1a;
            --ucs-text-muted: #5c5c5c;
            --ucs-accent: #1a1a1a;
            --ucs-accent-hover: #333;
            --ucs-success: #00c853;
            --ucs-error: #ff1744;
            --ucs-warning: #ffc107;
            --ucs-font: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
            --ucs-shadow: 4px 4px 0 #1a1a1a;
            --ucs-shadow-hover: 6px 6px 0 #1a1a1a;
        }

        .ucs-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483647;
            background: var(--ucs-bg);
            border: 3px solid var(--ucs-border);
            padding: 10px 14px;
            box-shadow: var(--ucs-shadow);
            font-family: var(--ucs-font);
            color: var(--ucs-text);
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.15s ease;
            font-size: 12px;
        }

        .ucs-widget:hover {
            box-shadow: var(--ucs-shadow-hover);
            transform: translate(-2px, -2px);
        }

        .ucs-widget.minimized {
            width: 44px;
            height: 44px;
            padding: 0;
            justify-content: center;
            overflow: hidden;
        }

        .ucs-widget.minimized .ucs-content { display: none; }
        .ucs-widget.minimized .ucs-icon { display: block; }

        .ucs-icon {
            display: none;
            cursor: pointer;
            font-size: 18px;
        }

        .ucs-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ucs-status-dot {
            width: 10px;
            height: 10px;
            border: 2px solid var(--ucs-border);
            background: #ccc;
            transition: background 0.2s ease;
        }

        /* Status Colors */
        .ucs-status-idle .ucs-status-dot { background: #ccc; }
        .ucs-status-ready .ucs-status-dot { background: var(--ucs-accent); }
        .ucs-status-solving .ucs-status-dot { background: var(--ucs-warning); animation: ucs-blink 0.5s infinite; }
        .ucs-status-success .ucs-status-dot { background: var(--ucs-success); }
        .ucs-status-error .ucs-status-dot { background: var(--ucs-error); }

        @keyframes ucs-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }

        .ucs-btn {
            background: var(--ucs-bg);
            border: 2px solid var(--ucs-border);
            color: var(--ucs-text);
            padding: 8px 14px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            font-family: var(--ucs-font);
            box-shadow: 3px 3px 0 var(--ucs-border);
            transition: all 0.1s ease;
        }

        .ucs-btn:hover {
            transform: translate(-2px, -2px);
            box-shadow: 5px 5px 0 var(--ucs-border);
        }

        .ucs-btn:active {
            transform: translate(1px, 1px);
            box-shadow: 2px 2px 0 var(--ucs-border);
        }

        .ucs-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: 3px 3px 0 var(--ucs-border);
        }

        .ucs-btn.secondary {
            background: transparent;
            box-shadow: 2px 2px 0 var(--ucs-border);
        }

        .ucs-btn.secondary:hover {
            background: #f0f0e8;
            box-shadow: 4px 4px 0 var(--ucs-border);
        }

        .ucs-btn.danger {
            background: var(--ucs-error);
            color: #fff;
            border-color: var(--ucs-border);
        }

        .ucs-btn.danger:hover {
            background: #ff4569;
        }

        /* Settings Modal - Neo Brutal */
        .ucs-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(26, 26, 26, 0.4);
            z-index: 2147483647;
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            padding: 24px;
            font-family: var(--ucs-font);
        }

        .ucs-modal {
            background: var(--ucs-bg-solid);
            border: 3px solid var(--ucs-border);
            width: 340px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 8px 8px 0 var(--ucs-border);
        }

        .ucs-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            border-bottom: 3px solid var(--ucs-border);
            background: #1a1a1a;
            color: #fff;
        }

        .ucs-modal-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
        }

        .ucs-modal-close {
            background: transparent;
            border: 2px solid #fff;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.1s;
        }

        .ucs-modal-close:hover {
            background: var(--ucs-error);
            border-color: var(--ucs-error);
        }

        .ucs-tabs {
            display: flex;
            border-bottom: 3px solid var(--ucs-border);
        }

        .ucs-tab {
            flex: 1;
            padding: 12px;
            background: transparent;
            border: none;
            border-right: 3px solid var(--ucs-border);
            color: var(--ucs-text-muted);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
            font-family: var(--ucs-font);
            transition: all 0.1s;
        }

        .ucs-tab:last-child { border-right: none; }
        .ucs-tab:hover { background: #f0f0e8; color: var(--ucs-text); }

        .ucs-tab.active {
            background: var(--ucs-text);
            color: var(--ucs-bg);
        }

        .ucs-tab-content {
            padding: 16px;
            max-height: 50vh;
            overflow-y: auto;
        }

        .ucs-tab-content::-webkit-scrollbar { width: 8px; }
        .ucs-tab-content::-webkit-scrollbar-track { background: transparent; }
        .ucs-tab-content::-webkit-scrollbar-thumb { background: var(--ucs-border); }

        .ucs-field {
            margin-bottom: 16px;
        }

        .ucs-field:last-child { margin-bottom: 0; }

        .ucs-label {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: var(--ucs-text);
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .ucs-input {
            width: 100%;
            padding: 10px 12px;
            background: #fff;
            border: 2px solid var(--ucs-border);
            color: var(--ucs-text);
            font-size: 12px;
            font-family: var(--ucs-font);
            box-sizing: border-box;
            transition: box-shadow 0.1s;
        }

        .ucs-input:focus {
            outline: none;
            box-shadow: 3px 3px 0 var(--ucs-border);
        }

        .ucs-input::placeholder { color: var(--ucs-text-muted); }

        .ucs-btn-row {
            display: flex;
            gap: 10px;
            margin-top: 14px;
        }

        .ucs-btn-row .ucs-btn { flex: 1; }

        /* Site List */
        .ucs-site-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .ucs-site-item {
            background: #fff;
            border: 2px solid var(--ucs-border);
            padding: 12px;
            position: relative;
            box-shadow: 3px 3px 0 var(--ucs-border);
        }

        .ucs-site-item:hover {
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--ucs-border);
        }

        .ucs-site-pattern {
            font-size: 11px;
            font-weight: 700;
            color: var(--ucs-text);
            margin-bottom: 8px;
            word-break: break-all;
            padding-right: 30px;
            text-transform: uppercase;
        }

        .ucs-site-selectors {
            font-size: 9px;
            color: var(--ucs-text-muted);
            line-height: 1.6;
        }

        .ucs-site-selectors code {
            background: #f0f0e8;
            padding: 2px 5px;
            border: 1px solid var(--ucs-border);
            font-family: var(--ucs-font);
            font-size: 9px;
        }

        .ucs-site-delete {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 22px;
            height: 22px;
            background: var(--ucs-bg);
            border: 2px solid var(--ucs-border);
            color: var(--ucs-text);
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.1s;
        }

        .ucs-site-delete:hover {
            background: var(--ucs-error);
            color: #fff;
            border-color: var(--ucs-error);
        }

        .ucs-empty {
            text-align: center;
            color: var(--ucs-text-muted);
            font-size: 11px;
            padding: 24px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Picker Overlay */
        .ucs-picker-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 2147483646;
            cursor: crosshair;
            background: rgba(26, 26, 26, 0.15);
        }

        .ucs-highlight {
            outline: 3px solid var(--ucs-text) !important;
            outline-offset: 2px !important;
            transition: all 0.1s;
        }

        .ucs-tooltip {
            position: fixed;
            background: #1a1a1a;
            color: #fff;
            padding: 6px 10px;
            border: 2px solid #fff;
            font-size: 11px;
            font-weight: 600;
            font-family: var(--ucs-font);
            pointer-events: none;
            z-index: 2147483648;
            transform: translate(12px, 12px);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Toast */
        .ucs-toast {
            position: fixed;
            top: 80px;
            right: 24px;
            padding: 12px 18px;
            font-size: 11px;
            font-weight: 700;
            font-family: var(--ucs-font);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 2147483648;
            border: 2px solid #1a1a1a;
            box-shadow: 4px 4px 0 #1a1a1a;
        }

        .ucs-toast.success {
            background: var(--ucs-success);
            color: #1a1a1a;
        }

        .ucs-toast.error {
            background: var(--ucs-error);
            color: #fff;
        }
    `;

    // --- Modules ---

    /**
     * Handles Local Storage / Configuration with path-based matching
     */
    class ConfigManager {
        constructor() {
            this.hostname = window.location.hostname;
            this.pathname = window.location.pathname;
            this.siteKey = this.hostname + this.pathname;
        }

        /**
         * Get full site key (hostname + pathname)
         */
        getSiteKey() {
            return this.siteKey;
        }

        /**
         * Check if a pattern matches the current URL
         */
        matchesPattern(pattern) {
            const currentUrl = this.hostname + this.pathname;

            // Exact match
            if (pattern === currentUrl) return { match: true, specificity: 3 };

            // Wildcard pattern: domain/* or domain/path/*
            if (pattern.endsWith('/*')) {
                const base = pattern.slice(0, -2); // Remove /*
                if (currentUrl.startsWith(base + '/') || currentUrl === base) {
                    // Specificity based on how much of the path is matched
                    return { match: true, specificity: base.split('/').length };
                }
            }

            // Legacy hostname-only match (backwards compatibility)
            if (pattern === this.hostname && !pattern.includes('/')) {
                return { match: true, specificity: 1 };
            }

            return { match: false, specificity: 0 };
        }

        /**
         * Get config for current page (with pattern matching)
         */
        getConfig() {
            const keys = GM_listValues();
            let bestMatch = null;
            let bestSpecificity = 0;

            for (const key of keys) {
                if (key === 'gemini_api_key' || key === 'gemini_model') continue;

                const { match, specificity } = this.matchesPattern(key);
                if (match && specificity > bestSpecificity) {
                    try {
                        const value = GM_getValue(key);
                        if (value && typeof value === 'string' && value.startsWith('{')) {
                            bestMatch = { key, config: JSON.parse(value) };
                            bestSpecificity = specificity;
                        }
                    } catch (e) {
                        console.warn(`Invalid config for ${key}`, e);
                    }
                }
            }

            return bestMatch ? bestMatch.config : null;
        }

        /**
         * Save config for a specific pattern (defaults to current hostname+pathname)
         */
        saveConfig(config, pattern = null) {
            const key = pattern || this.siteKey;
            GM_setValue(key, JSON.stringify(config));
        }

        /**
         * Clear config for current site key
         */
        clearConfig() {
            // Find and delete the matching config
            const keys = GM_listValues();
            for (const key of keys) {
                if (key === 'gemini_api_key' || key === 'gemini_model') continue;
                const { match } = this.matchesPattern(key);
                if (match) {
                    GM_deleteValue(key);
                    return true;
                }
            }
            return false;
        }

        /**
         * Delete a specific site config by its key/pattern
         */
        deleteSiteConfig(key) {
            GM_deleteValue(key);
        }

        /**
         * Get all site configurations
         */
        getAllSiteConfigs() {
            const keys = GM_listValues();
            const sites = [];

            for (const key of keys) {
                if (key === 'gemini_api_key' || key === 'gemini_model') continue;

                try {
                    const value = GM_getValue(key);
                    if (value && typeof value === 'string' && value.startsWith('{')) {
                        sites.push({ pattern: key, config: JSON.parse(value) });
                    }
                } catch (e) {
                    console.warn(`Skipping invalid config for ${key}`, e);
                }
            }

            return sites;
        }

        exportSettings() {
            const sites = this.getAllSiteConfigs();
            const configs = {};
            sites.forEach(({ pattern, config }) => {
                configs[pattern] = config;
            });

            const exportData = {
                details: {
                    exportedAt: new Date().toISOString(),
                    scriptVersion: '1.3',
                    author: 'Universal Solver'
                },
                configs: configs
            };

            return JSON.stringify(exportData, null, 2);
        }

        importSettings(jsonString) {
            try {
                const data = JSON.parse(jsonString);
                if (!data.configs) throw new Error('Invalid export file format');

                const entries = Object.entries(data.configs);
                let importedCount = 0;

                entries.forEach(([pattern, config]) => {
                    if (config.captchaSelector && config.inputSelector) {
                        GM_setValue(pattern, JSON.stringify(config));
                        importedCount++;
                    }
                });

                return { success: true, count: importedCount };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    }

    /**
     * Unified Settings Dialog
     */
    class SettingsDialog {
        constructor(configManager, callbacks = {}) {
            this.configManager = configManager;
            this.callbacks = callbacks;
            this.overlay = null;
            this.activeTab = 'api';
        }

        open() {
            this.createModal();
            document.body.appendChild(this.overlay);
        }

        close() {
            this.overlay?.remove();
            this.overlay = null;
        }

        createModal() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'ucs-modal-overlay';
            this.overlay.onclick = (e) => {
                if (e.target === this.overlay) this.close();
            };

            const modal = document.createElement('div');
            modal.className = 'ucs-modal';
            modal.innerHTML = `
                <div class="ucs-modal-header">
                    <h3 class="ucs-modal-title">⚙️ Captcha Solver Settings</h3>
                    <button class="ucs-modal-close">×</button>
                </div>
                <div class="ucs-tabs">
                    <button class="ucs-tab active" data-tab="api">API</button>
                    <button class="ucs-tab" data-tab="sites">Sites</button>
                </div>
                <div class="ucs-tab-content" id="ucs-tab-api">
                    ${this.renderApiTab()}
                </div>
                <div class="ucs-tab-content" id="ucs-tab-sites" style="display: none;">
                    ${this.renderSitesTab()}
                </div>
            `;

            modal.querySelector('.ucs-modal-close').onclick = () => this.close();

            // Tab switching
            modal.querySelectorAll('.ucs-tab').forEach(tab => {
                tab.onclick = () => this.switchTab(tab.dataset.tab, modal);
            });

            // API tab handlers
            this.bindApiHandlers(modal);

            this.overlay.appendChild(modal);
        }

        renderApiTab() {
            const currentKey = GM_getValue('gemini_api_key', '');
            const currentModel = GM_getValue('gemini_model', 'gemma-3-27b-it');
            const maskedKey = currentKey ? '•'.repeat(Math.min(currentKey.length, 20)) + currentKey.slice(-4) : '';

            return `
                <div class="ucs-field">
                    <label class="ucs-label">API Key</label>
                    <input type="text" class="ucs-input" id="ucs-api-key" 
                           value="${currentKey}" placeholder="Enter Gemini API key">
                </div>
                <div class="ucs-field">
                    <label class="ucs-label">Model</label>
                    <input type="text" class="ucs-input" id="ucs-model" 
                           value="${currentModel}" placeholder="gemma-3-27b-it">
                </div>
                <div class="ucs-btn-row">
                    <button class="ucs-btn" id="ucs-save-api">Save</button>
                    <button class="ucs-btn secondary" id="ucs-verify-api">Verify</button>
                </div>
                <div class="ucs-btn-row">
                    <button class="ucs-btn secondary" id="ucs-export">📤 Export</button>
                    <button class="ucs-btn secondary" id="ucs-import">📥 Import</button>
                </div>
                <div class="ucs-btn-row">
                    <button class="ucs-btn danger" id="ucs-reset-current">Reset This Site</button>
                </div>
            `;
        }

        renderSitesTab() {
            const sites = this.configManager.getAllSiteConfigs();

            if (sites.length === 0) {
                return '<div class="ucs-empty">No sites configured yet</div>';
            }

            return `
                <div class="ucs-site-list">
                    ${sites.map(({ pattern, config }) => `
                        <div class="ucs-site-item" data-pattern="${this.escapeHtml(pattern)}">
                            <button class="ucs-site-delete" title="Remove">×</button>
                            <div class="ucs-site-pattern">${this.escapeHtml(pattern)}</div>
                            <div class="ucs-site-selectors">
                                Captcha: <code>${this.escapeHtml(config.captchaSelector)}</code><br>
                                Input: <code>${this.escapeHtml(config.inputSelector)}</code>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        switchTab(tabName, modal) {
            this.activeTab = tabName;

            modal.querySelectorAll('.ucs-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabName);
            });

            modal.querySelector('#ucs-tab-api').style.display = tabName === 'api' ? 'block' : 'none';
            modal.querySelector('#ucs-tab-sites').style.display = tabName === 'sites' ? 'block' : 'none';

            // Rebind site delete handlers when switching to sites tab
            if (tabName === 'sites') {
                this.bindSiteHandlers(modal);
            }
        }

        bindApiHandlers(modal) {
            // Save API key/model
            modal.querySelector('#ucs-save-api').onclick = () => {
                const apiKey = modal.querySelector('#ucs-api-key').value.trim();
                const model = modal.querySelector('#ucs-model').value.trim();

                if (apiKey) GM_setValue('gemini_api_key', apiKey);
                if (model) GM_setValue('gemini_model', model);

                this.showToast('Settings saved!');
            };

            // Verify API key
            modal.querySelector('#ucs-verify-api').onclick = () => {
                const self = this;
                const apiKey = modal.querySelector('#ucs-api-key').value.trim();
                const model = modal.querySelector('#ucs-model').value.trim() || 'gemma-3-27b-it';

                if (!apiKey) {
                    self.showToast('Enter an API key first', true);
                    return;
                }

                const btn = modal.querySelector('#ucs-verify-api');
                const originalText = btn.textContent;
                btn.textContent = '...';
                btn.disabled = true;

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] }),
                    timeout: 10000,
                    onload: function (res) {
                        btn.textContent = originalText;
                        btn.disabled = false;
                        if (res.status === 200) {
                            self.showToast('✓ Valid!');
                        } else {
                            try {
                                const err = JSON.parse(res.responseText);
                                self.showToast(`✗ ${err.error?.message || 'Error ' + res.status}`, true);
                            } catch (e) {
                                self.showToast(`✗ Error: ${res.status}`, true);
                            }
                        }
                    },
                    onerror: function () {
                        btn.textContent = originalText;
                        btn.disabled = false;
                        self.showToast('✗ Network error', true);
                    },
                    ontimeout: function () {
                        btn.textContent = originalText;
                        btn.disabled = false;
                        self.showToast('✗ Timeout', true);
                    }
                });
            };

            // Export
            modal.querySelector('#ucs-export').onclick = () => {
                this.callbacks.onExport?.();
                this.close();
            };

            // Import
            modal.querySelector('#ucs-import').onclick = () => {
                this.callbacks.onImport?.();
                this.close();
            };

            // Reset current site
            modal.querySelector('#ucs-reset-current').onclick = () => {
                if (confirm('Reset configuration for this site?')) {
                    this.configManager.clearConfig();
                    this.close();
                    location.reload();
                }
            };
        }

        bindSiteHandlers(modal) {
            modal.querySelectorAll('.ucs-site-delete').forEach(btn => {
                btn.onclick = (e) => {
                    const item = e.target.closest('.ucs-site-item');
                    const pattern = item.dataset.pattern;

                    if (confirm(`Remove configuration for "${pattern}"?`)) {
                        this.configManager.deleteSiteConfig(pattern);
                        item.remove();

                        // Check if list is empty
                        const list = modal.querySelector('.ucs-site-list');
                        if (!list.children.length) {
                            modal.querySelector('#ucs-tab-sites').innerHTML =
                                '<div class="ucs-empty">No sites configured</div>';
                        }
                    }
                };
            });
        }

        showToast(message, isError = false) {
            const toast = document.createElement('div');
            toast.className = `ucs-toast ${isError ? 'error' : 'success'}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }
    }

    /**
     * Handles Visual Selection of Elements
     */
    class SelectorPicker {
        constructor(onSelect) {
            this.onSelect = onSelect;
            this.active = false;
            this.overlay = null;
            this.tooltip = null;
            this.currentElement = null;
            this.rafId = null;

            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleClick = this.handleClick.bind(this);
            this.handleKeyDown = this.handleKeyDown.bind(this);
        }

        start(message) {
            this.active = true;
            this.createOverlay(message);
            document.addEventListener('mousemove', this.handleMouseMove, true);
            document.addEventListener('click', this.handleClick, true);
            document.addEventListener('keydown', this.handleKeyDown, true);
        }

        stop() {
            this.active = false;
            if (this.currentElement) {
                this.currentElement.classList.remove('ucs-highlight');
            }
            if (this.rafId) cancelAnimationFrame(this.rafId);

            this.overlay?.remove();
            this.tooltip?.remove();
            document.removeEventListener('mousemove', this.handleMouseMove, true);
            document.removeEventListener('click', this.handleClick, true);
            document.removeEventListener('keydown', this.handleKeyDown, true);
        }

        createOverlay(msg) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'ucs-picker-overlay';
            document.body.appendChild(this.overlay);

            this.tooltip = document.createElement('div');
            this.tooltip.className = 'ucs-tooltip';
            this.tooltip.textContent = msg;
            document.body.appendChild(this.tooltip);
        }

        handleMouseMove(e) {
            if (!this.active) return;

            // Optimization: Throttling with rAF
            if (this.rafId) return;

            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;

                // Update tooltip pos
                this.tooltip.style.left = (e.clientX + 10) + 'px';
                this.tooltip.style.top = (e.clientY + 10) + 'px';

                this.overlay.style.pointerEvents = 'none';
                const el = document.elementFromPoint(e.clientX, e.clientY);
                this.overlay.style.pointerEvents = 'auto';

                if (el && el !== this.currentElement && el !== this.overlay && !el.classList.contains('ucs-widget')) {
                    if (this.currentElement) this.currentElement.classList.remove('ucs-highlight');
                    this.currentElement = el;
                    this.currentElement.classList.add('ucs-highlight');
                }
            });
        }

        handleClick(e) {
            if (!this.active) return;
            e.preventDefault();
            e.stopPropagation();

            if (this.currentElement) {
                const selector = this.generateSelector(this.currentElement);
                this.stop();
                this.onSelect(selector, this.currentElement.tagName);
            }
        }

        handleKeyDown(e) {
            if (e.key === 'Escape') this.stop();
        }

        generateSelector(el) {
            if (el.id) return `#${el.id}`;
            let path = [];
            while (el && el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'HTML') {
                let selector = el.tagName.toLowerCase();
                if (el.className && typeof el.className === 'string') {
                    const classes = Array.from(el.classList).filter(c => !c.startsWith('ucs-'));
                    if (classes.length > 0) selector += '.' + classes.join('.');
                }
                path.unshift(selector);
                el = el.parentNode;
                if (path.length > 3) break;
            }
            return path.join(' > ');
        }
    }

    /**
     * Main Solver Logic (Gemini)
     */
    class GeminiSolver {
        constructor() {
            this.config = CONFIG;
        }

        async solve(base64Image) {
            return new Promise((resolve, reject) => {
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
                const payload = {
                    contents: [{
                        parts: [
                            { text: "Solve this captcha. Output ONLY the alphanumeric characters visible in the image. Do not include spaces or special characters." },
                            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                        ]
                    }]
                };

                GM_xmlhttpRequest({
                    method: "POST",
                    url: apiUrl,
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(payload),
                    timeout: this.config.timeouts.api,
                    ontimeout: () => reject("Timeout"),
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                const solution = text ? text.trim().replace(/[^a-zA-Z0-9]/g, '') : '';
                                if (solution.length < 3) reject("Invalid format");
                                else resolve(solution);
                            } catch (e) { reject("Parse Error"); }
                        } else {
                            reject(`API ${response.status}`);
                        }
                    },
                    onerror: () => reject("Network Error")
                });
            });
        }
    }

    /**
     * Main Controller
     */
    class UniversalSolver {
        constructor() {
            this.configManager = new ConfigManager();
            this.picker = null;
            this.solver = new GeminiSolver();
            this.siteConfig = this.configManager.getConfig();
            this.observer = null;

            this.registerMenu();

            if (this.siteConfig) {
                this.injectStyles();
                this.createUI();
                this.initAutoSolve();
            }
        }

        registerMenu() {
            if (typeof GM_registerMenuCommand !== 'undefined') {
                GM_registerMenuCommand("⚙️ Settings", () => {
                    this.injectStyles();
                    this.openSettings();
                });

                GM_registerMenuCommand("🎯 Configure Captcha", () => {
                    this.injectStyles();
                    this.startSetup();
                });
            }
        }

        openSettings() {
            const dialog = new SettingsDialog(this.configManager, {
                onExport: () => this.handleExport(),
                onImport: () => this.handleImport()
            });
            dialog.open();
        }

        handleExport() {
            try {
                const json = this.configManager.exportSettings();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `universal_solver_configs_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (e) {
                alert('Export failed: ' + e.message);
            }
        }

        handleImport() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = this.configManager.importSettings(event.target.result);
                    if (result.success) {
                        alert(`Successfully imported ${result.count} configurations! Reloading...`);
                        location.reload();
                    } else {
                        alert(`Import failed: ${result.error}`);
                    }
                };
                reader.readAsText(file);
            };

            input.click();
        }

        injectStyles() {
            if (this.stylesInjected) return;
            this.stylesInjected = true;

            if (typeof GM_addStyle !== 'undefined') {
                GM_addStyle(STYLES);
            } else {
                const style = document.createElement('style');
                style.textContent = STYLES;
                document.head.appendChild(style);
            }
        }

        createUI() {
            document.querySelector('.ucs-widget')?.remove();

            this.widget = document.createElement('div');
            this.widget.className = 'ucs-widget ucs-status-idle';
            this.widget.innerHTML = `
                <div class="ucs-icon">🤖</div>
                <div class="ucs-content">
                    <div class="ucs-status-dot"></div>
                    <span class="ucs-status-text">Ready</span>
                    <button class="ucs-btn cmd-solve">Solve</button>
                    <button class="ucs-btn secondary cmd-close" title="Close Session">✕</button>
                </div>
            `;

            this.widget.querySelector('.ucs-icon').onclick = () => this.toggleMinimize();

            const solveBtn = this.widget.querySelector('.cmd-solve');
            const closeBtn = this.widget.querySelector('.cmd-close');

            if (solveBtn) solveBtn.onclick = () => this.runSolve();
            if (closeBtn) closeBtn.onclick = () => {
                this.cleanup();
                this.widget.remove();
            };

            this.updateStatus('ready', 'Ready');
            document.body.appendChild(this.widget);
        }

        updateStatus(status, text) {
            if (!this.widget) return;
            this.widget.className = `ucs-widget ucs-status-${status}`;
            const txt = this.widget.querySelector('.ucs-status-text');
            if (txt) txt.textContent = text;

            const btn = this.widget.querySelector('.cmd-solve');
            if (btn) {
                if (status === 'solving') {
                    btn.textContent = '...';
                    btn.disabled = true;
                } else if (status === 'error') {
                    btn.textContent = 'Retry';
                    btn.disabled = false;
                } else {
                    btn.textContent = 'Solve';
                    btn.disabled = false;
                }
            }
        }

        toggleMinimize() {
            this.widget.classList.toggle('minimized');
        }

        async startSetup() {
            this.picker = new SelectorPicker((selector, tagName) => {
                const imgSelector = selector;
                const isCanvas = tagName === 'CANVAS';

                setTimeout(() => {
                    this.picker = new SelectorPicker((inputSelector) => {
                        const config = {
                            captchaSelector: imgSelector,
                            inputSelector: inputSelector,
                            isCanvas: isCanvas
                        };
                        this.configManager.saveConfig(config);
                        alert('Configuration Saved! Page will reload.');
                        location.reload();
                    });
                    this.picker.start("CLICK THE INPUT FIELD");
                }, 500);
            });
            this.picker.start("CLICK THE CAPTCHA IMAGE");
        }

        async getImageBase64() {
            const el = document.querySelector(this.siteConfig.captchaSelector);
            if (!el) throw new Error('Captcha element not found');

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            try {
                if (this.siteConfig.isCanvas || el.tagName === 'CANVAS') {
                    canvas.width = el.width;
                    canvas.height = el.height;
                    ctx.drawImage(el, 0, 0);
                    return canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '');
                } else {
                    if (!el.complete || el.naturalWidth === 0) {
                        await new Promise((resolve, reject) => {
                            el.onload = resolve;
                            el.onerror = () => reject(new Error('Image failed to load'));
                            setTimeout(() => reject(new Error('Timeout')), CONFIG.timeouts.imageLoad);
                        });
                    }
                    canvas.width = el.naturalWidth || el.width;
                    canvas.height = el.naturalHeight || el.height;
                    ctx.drawImage(el, 0, 0);
                    try {
                        return canvas.toDataURL('image/jpeg').replace(/^data:image\/jpeg;base64,/, '');
                    } catch (corsError) {
                        return await this.fetchCrossOriginImage(el.src);
                    }
                }
            } catch (e) {
                console.error(e);
                throw new Error('Image extraction failed');
            }
        }

        async fetchCrossOriginImage(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    timeout: CONFIG.timeouts.imageLoad,
                    onload: (response) => {
                        if (response.status === 200) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64 = reader.result.replace(/^data:image\/[^;]+;base64,/, '');
                                resolve(base64);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(response.response);
                        } else reject(new Error(`HTTP ${response.status}`));
                    },
                    onerror: () => reject(new Error('Network Error')),
                    ontimeout: () => reject(new Error('Timeout'))
                });
            });
        }

        async runSolve() {
            if (!this.siteConfig) return;

            // Validate API key
            if (!CONFIG.apiKey) {
                this.updateStatus('error', 'No API Key');
                return;
            }

            try {
                this.updateStatus('solving', 'Solving...');
                const base64 = await this.getImageBase64();
                const solution = await this.solver.solve(base64);

                this.fillInput(solution);
                this.updateStatus('success', 'Solved');

            } catch (e) {
                console.error('Solver Error:', e);
                this.updateStatus('error', 'Failed');
            }
        }

        fillInput(text) {
            const input = document.querySelector(this.siteConfig.inputSelector);
            if (!input) return;

            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        initAutoSolve() {
            setTimeout(() => this.runSolve(), CONFIG.delays.initialRun);

            const el = document.querySelector(this.siteConfig.captchaSelector);
            if (el && !this.siteConfig.isCanvas) {
                this.observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        if (m.attributeName === 'src') {
                            setTimeout(() => this.runSolve(), CONFIG.delays.afterSrcChange);
                        }
                    }
                });
                this.observer.observe(el, { attributes: true });
            }
        }

        cleanup() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new UniversalSolver());
    } else {
        new UniversalSolver();
    }
})();
