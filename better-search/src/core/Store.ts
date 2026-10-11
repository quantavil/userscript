/// <reference path="../types.d.ts" />
// src/core/Store.ts
import { SVF_CONFIG } from '../config';
import type { Settings, DislikeMode, AccentColor, DomainMatch } from '../types';
import { normalizeDomain, buildDomainMatcher, wildcardRulesCovering } from '../utils/domain';

type Listener = () => void;

function gmGet<T>(key: string, fallback: T): T {
    try {
        if (typeof GM_getValue === 'function') {
            const v = GM_getValue(SVF_CONFIG.STORAGE_PREFIX + key, undefined as unknown as T);
            return v !== undefined && v !== null ? v : fallback;
        }
        const raw = localStorage.getItem(SVF_CONFIG.STORAGE_PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch (err) {
        console.error('[SVF] Failed to read from storage:', err);
        return fallback;
    }
}

function gmSet(key: string, value: unknown): void {
    try {
        if (typeof GM_setValue === 'function') {
            GM_setValue(SVF_CONFIG.STORAGE_PREFIX + key, value);
            return;
        }
        localStorage.setItem(SVF_CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (err) {
        console.error('[SVF] Failed to write to storage:', err);
    }
}

export class Store {
    private _settings: Settings;
    private _saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
    private _listeners: Set<Listener> = new Set();
    private _pagehideHandler: () => void;
    private _matcher: ((domain: string) => DomainMatch) | null = null;

    constructor() {
        this._settings = {
            liked:       gmGet<string[]>('liked',       SVF_CONFIG.DEFAULT_LIKED as unknown as string[]),
            disliked:    gmGet<string[]>('disliked',    SVF_CONFIG.DEFAULT_DISLIKED as unknown as string[]),
            timestamps:  gmGet<Record<string, number>>('timestamps', {}),
            dislikeMode: gmGet<DislikeMode>('dislikeMode', 'fade'),
            showTrigger: gmGet<boolean>('showTrigger', false),
            showHoverOverlay: gmGet<boolean>('showHoverOverlay', true),
            accent:      gmGet<AccentColor>('accent', 'emerald'),
            gistToken:   gmGet<string>('gistToken', ''),
            gistId:      gmGet<string>('gistId', ''),
            syncEnabled: gmGet<boolean>('syncEnabled', false),
        };

        // Initialize timestamps for existing domains if missing
        let updatedTimestamps = false;
        const now = Date.now();
        for (const d of [...this._settings.liked, ...this._settings.disliked]) {
            if (!this._settings.timestamps[d]) {
                this._settings.timestamps[d] = now;
                updatedTimestamps = true;
            }
        }
        if (updatedTimestamps) {
            this._persistDirect('timestamps');
        }

        // Flush pending debounced saves on tab close to prevent data loss
        this._pagehideHandler = () => {
            for (const key of Object.keys(this._saveTimers)) {
                const timer = this._saveTimers[key];
                if (timer) {
                    clearTimeout(timer);
                    gmSet(key, this._settings[key as keyof Settings]);
                }
            }
        };
        window.addEventListener('pagehide', this._pagehideHandler);
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    get liked(): readonly string[] { return this._settings.liked; }
    get disliked(): readonly string[] { return this._settings.disliked; }
    get timestamps(): Record<string, number> { return this._settings.timestamps; }
    get dislikeMode(): DislikeMode { return this._settings.dislikeMode; }
    get showTrigger(): boolean { return this._settings.showTrigger; }
    get showHoverOverlay(): boolean { return this._settings.showHoverOverlay; }
    get accent(): AccentColor { return this._settings.accent; }
    get gistToken(): string { return this._settings.gistToken; }
    get gistId(): string { return this._settings.gistId; }
    get syncEnabled(): boolean { return this._settings.syncEnabled; }

    /** Returns 'liked' | 'disliked' | 'normal' for a given bare domain. Supports wildcards. */
    matchDomain(domain: string): DomainMatch {
        if (!this._matcher) {
            this._matcher = buildDomainMatcher(this._settings.liked, this._settings.disliked);
        }
        return this._matcher(domain);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    addDomain(list: 'liked' | 'disliked', domain: string): void {
        const d = normalizeDomain(domain);
        const otherList = list === 'liked' ? 'disliked' : 'liked';
        if (!d || this._settings[list].includes(d)) return;
        this._settings[otherList] = this._settings[otherList].filter(x => x !== d);
        this._settings[list] = [...this._settings[list], d].sort();
        this._settings.timestamps[d] = Date.now();
        this._listsChanged();
        this._persist('liked');
        this._persist('disliked');
        this._persist('timestamps');
        this._notify();
    }

    removeDomain(list: 'liked' | 'disliked', domain: string): void {
        const d = normalizeDomain(domain);
        if (!d) return;
        // Also drop wildcard rules covering the domain — otherwise removing a
        // domain matched via a `*.` rule would be a silent no-op.
        const covering = new Set(wildcardRulesCovering(this._settings[list], d));
        const before = this._settings[list];
        const next = before.filter(x => x !== d && !covering.has(x));
        if (next.length === before.length) return; // nothing to remove — no tombstone, no notify
        this._settings[list] = next;
        const now = Date.now();
        this._settings.timestamps[d] = now;
        for (const rule of covering) {
            this._settings.timestamps[rule] = now;
        }
        this._listsChanged();
        this._persist(list);
        this._persist('timestamps');
        this._notify();
    }

    setDomains(list: 'liked' | 'disliked', domains: string[]): void {
        const nextSet = new Set(domains.map(x => normalizeDomain(x)).filter(Boolean));
        const otherList = list === 'liked' ? 'disliked' : 'liked';

        const now = Date.now();
        const oldSet = new Set(this._settings[list]);
        const otherSet = new Set(this._settings[otherList]);
        for (const d of oldSet) {
            if (!nextSet.has(d) && !otherSet.has(d)) {
                this._settings.timestamps[d] = now;
            }
        }
        for (const d of nextSet) {
            if (!oldSet.has(d)) {
                this._settings.timestamps[d] = now;
            }
        }

        this._settings[list] = [...nextSet].sort();
        this._settings[otherList] = this._settings[otherList].filter(x => !nextSet.has(x));
        this._listsChanged();
        this._persist('liked');
        this._persist('disliked');
        this._persist('timestamps');
        this._notify();
    }

    private _updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
        this._settings[key] = value;
        this._persist(key);
        this._notify();
    }

    setDislikeMode(mode: DislikeMode): void { this._updateSetting('dislikeMode', mode); }
    setShowTrigger(show: boolean): void { this._updateSetting('showTrigger', show); }
    setShowHoverOverlay(show: boolean): void { this._updateSetting('showHoverOverlay', show); }
    setAccent(accent: AccentColor): void { this._updateSetting('accent', accent); }
    setGistToken(token: string): void { this._updateSetting('gistToken', token.trim()); }
    setGistId(id: string): void { this._updateSetting('gistId', id.trim()); }
    setSyncEnabled(enabled: boolean): void { this._updateSetting('syncEnabled', enabled); }

    replaceDomains(data: { liked?: string[]; disliked?: string[]; timestamps?: Record<string, number> }): void {
        const liked = Array.isArray(data.liked) ? data.liked.map(normalizeDomain).filter(Boolean) : [];
        const disliked = Array.isArray(data.disliked) ? data.disliked.map(normalizeDomain).filter(Boolean) : [];
        const timestamps = (data.timestamps && typeof data.timestamps === 'object') ? { ...data.timestamps } : {};

        const dedupedLiked = new Set(liked);
        const dedupedDisliked = new Set(disliked.filter(x => !dedupedLiked.has(x)));

        const now = Date.now();
        for (const d of dedupedLiked) {
            if (!timestamps[d]) timestamps[d] = now;
        }
        for (const d of dedupedDisliked) {
            if (!timestamps[d]) timestamps[d] = now;
        }

        this._settings.liked = [...dedupedLiked].sort();
        this._settings.disliked = [...dedupedDisliked].sort();
        this._settings.timestamps = timestamps;
        this._listsChanged();

        this._persistDirect('liked');
        this._persistDirect('disliked');
        this._persistDirect('timestamps');
        this._notify();
    }

    private _onSyncPush?: () => void;
    setSyncPushCallback(fn: (() => void) | undefined): void {
        this._onSyncPush = fn;
    }

    /** Export current domain lists as a plain object. */
    exportDomains(): { liked: string[]; disliked: string[]; timestamps: Record<string, number> } {
        return {
            liked: [...this._settings.liked],
            disliked: [...this._settings.disliked],
            timestamps: { ...this._settings.timestamps },
        };
    }

    /** Merge imported domains into current lists (additive, deduplicated). */
    importDomains(data: { liked?: string[]; disliked?: string[]; timestamps?: Record<string, number> }): number {
        let added = 0;
        let mutatedTimestamps = false;
        const now = Date.now();
        const importedTimestamps = data.timestamps || {};

        const liked = new Set(this._settings.liked);
        const disliked = new Set(this._settings.disliked);

        const addAll = (raws: string[] | undefined, target: Set<string>, other: Set<string>) => {
            if (!Array.isArray(raws)) return;
            for (const raw of raws) {
                const d = normalizeDomain(raw);
                if (!d || target.has(d)) continue;
                other.delete(d);
                target.add(d);
                this._settings.timestamps[d] = importedTimestamps[d] || now;
                added++;
            }
        };
        addAll(data.liked, liked, disliked);
        addAll(data.disliked, disliked, liked);

        // Adopt newer tombstone timestamps for domains not present in either list
        for (const [rawDomain, ts] of Object.entries(importedTimestamps)) {
            const d = normalizeDomain(rawDomain);
            if (!d || liked.has(d) || disliked.has(d)) continue;
            const localTs = this._settings.timestamps[d];
            if (localTs === undefined || ts > localTs) {
                this._settings.timestamps[d] = ts;
                mutatedTimestamps = true;
            }
        }

        if (added > 0 || mutatedTimestamps) {
            if (added > 0) {
                this._settings.liked = [...liked].sort();
                this._settings.disliked = [...disliked].sort();
                this._listsChanged();
                this._persist('liked');
                this._persist('disliked');
            }
            this._persist('timestamps');
            this._notify();
        }
        return added;
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────

    /** Subscribe to any settings change. Returns an unsubscribe fn. */
    subscribe(fn: Listener): () => void {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    destroy(): void {
        window.removeEventListener('pagehide', this._pagehideHandler);
        for (const key of Object.keys(this._saveTimers)) {
            const timer = this._saveTimers[key];
            if (timer) {
                clearTimeout(timer);
                gmSet(key, this._settings[key as keyof Settings]);
            }
        }
        this._saveTimers = {};
        this._listeners.clear();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private _listsChanged(): void {
        this._matcher = null; // invalidate the compiled matcher
    }

    private _notify(): void {
        this._listeners.forEach(fn => {
            try {
                fn();
            } catch (err) {
                console.error('[SVF] Subscriber error during notify:', err);
            }
        });
    }

    private _persistDirect(key: keyof Settings): void {
        clearTimeout(this._saveTimers[key]);
        gmSet(key, this._settings[key]);
    }

    private _persist(key: keyof Settings): void {
        clearTimeout(this._saveTimers[key]);
        this._saveTimers[key] = setTimeout(() => {
            gmSet(key, this._settings[key]);
            if ((key === 'liked' || key === 'disliked') && this._settings.syncEnabled) {
                this._onSyncPush?.();
            }
        }, SVF_CONFIG.SAVE_DEBOUNCE_MS);
    }
}
