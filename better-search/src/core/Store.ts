/// <reference path="../types.d.ts" />
// src/core/Store.ts
import { SVF_CONFIG } from '../config';
import type { Settings, DislikeMode, AccentColor } from '../types';
 
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
 
    constructor() {
        this._settings = {
            liked:       gmGet<string[]>('liked',       SVF_CONFIG.DEFAULT_LIKED as unknown as string[]),
            disliked:    gmGet<string[]>('disliked',    SVF_CONFIG.DEFAULT_DISLIKED as unknown as string[]),
            dislikeMode: gmGet<DislikeMode>('dislikeMode', 'fade'),
            showTrigger: gmGet<boolean>('showTrigger', true),
            accent:      gmGet<AccentColor>('accent', 'emerald'),
            gistToken:   gmGet<string>('gistToken', ''),
            gistId:      gmGet<string>('gistId', ''),
            syncEnabled: gmGet<boolean>('syncEnabled', false),
        };
 
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
    get dislikeMode(): DislikeMode { return this._settings.dislikeMode; }
    get showTrigger(): boolean { return this._settings.showTrigger; }
    get accent(): AccentColor { return this._settings.accent; }
    get gistToken(): string { return this._settings.gistToken; }
    get gistId(): string { return this._settings.gistId; }
    get syncEnabled(): boolean { return this._settings.syncEnabled; }

    /** Returns 'liked' | 'disliked' | 'normal' for a given bare domain. Supports wildcards. */
    matchDomain(domain: string): 'liked' | 'disliked' | 'normal' {
        const d = domain.toLowerCase();
        const hit = (list: readonly string[]) =>
            list.some(rule => {
                if (rule.startsWith('*.')) {
                    const r = rule.slice(2);
                    return d === r || d.endsWith('.' + r);
                }
                return d === rule;
            });
        if (hit(this._settings.liked))    return 'liked';
        if (hit(this._settings.disliked)) return 'disliked';
        return 'normal';
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    addDomain(list: 'liked' | 'disliked', domain: string): void {
        const d = normalizeDomain(domain);
        const otherList = list === 'liked' ? 'disliked' : 'liked';
        if (!d || this._settings[list].includes(d)) return;
        this._settings[otherList] = this._settings[otherList].filter(x => x !== d);
        this._settings[list] = [...this._settings[list], d].sort();
        this._persist('liked');
        this._persist('disliked');
        this._notify();
    }

    removeDomain(list: 'liked' | 'disliked', domain: string): void {
        const d = normalizeDomain(domain);
        this._settings[list] = this._settings[list].filter(x => x !== d);
        this._persist(list);
        this._notify();
    }

    setDomains(list: 'liked' | 'disliked', domains: string[]): void {
        const normalized = domains.map(x => normalizeDomain(x)).filter(Boolean);
        const otherList = list === 'liked' ? 'disliked' : 'liked';
        this._settings[list] = [...new Set(normalized)];
        // Ensure no overlap with the other list
        this._settings[otherList] = this._settings[otherList].filter(x => !this._settings[list].includes(x));
        this._persist('liked');
        this._persist('disliked');
        this._notify();
    }

    setDislikeMode(mode: DislikeMode): void {
        this._settings.dislikeMode = mode;
        this._persist('dislikeMode');
        this._notify();
    }

    setShowTrigger(show: boolean): void {
        this._settings.showTrigger = show;
        this._persist('showTrigger');
        this._notify();
    }

    setAccent(accent: AccentColor): void {
        this._settings.accent = accent;
        this._persist('accent');
        this._notify();
    }

    setGistToken(token: string): void {
        this._settings.gistToken = token.trim();
        this._persist('gistToken');
        this._notify();
    }

    setGistId(id: string): void {
        this._settings.gistId = id.trim();
        this._persist('gistId');
        this._notify();
    }

    setSyncEnabled(enabled: boolean): void {
        this._settings.syncEnabled = enabled;
        this._persist('syncEnabled');
        this._notify();
    }

    replaceDomains(data: { liked?: string[]; disliked?: string[] }): void {
        const liked = Array.isArray(data.liked) ? data.liked.map(normalizeDomain).filter(Boolean) : [];
        const disliked = Array.isArray(data.disliked) ? data.disliked.map(normalizeDomain).filter(Boolean) : [];
        
        const dedupedLiked = [...new Set(liked)].sort();
        const dedupedDisliked = [...new Set(disliked)].filter(x => !dedupedLiked.includes(x)).sort();

        this._settings.liked = dedupedLiked;
        this._settings.disliked = dedupedDisliked;
        
        this._persistDirect('liked');
        this._persistDirect('disliked');
        this._notify();
    }

    private _onSyncPush?: () => void;
    setSyncPushCallback(fn: (() => void) | undefined): void {
        this._onSyncPush = fn;
    }

    /** Export current domain lists as a plain object. */
    exportDomains(): { liked: string[]; disliked: string[] } {
        return {
            liked: [...this._settings.liked],
            disliked: [...this._settings.disliked],
        };
    }

    /** Merge imported domains into current lists (additive, deduplicated). */
    importDomains(data: { liked?: string[]; disliked?: string[] }): number {
        let added = 0;
        if (Array.isArray(data.liked)) {
            for (const raw of data.liked) {
                const d = normalizeDomain(raw);
                if (d && !this._settings.liked.includes(d)) {
                    this._settings.disliked = this._settings.disliked.filter(x => x !== d);
                    this._settings.liked = [...this._settings.liked, d];
                    added++;
                }
            }
        }
        if (Array.isArray(data.disliked)) {
            for (const raw of data.disliked) {
                const d = normalizeDomain(raw);
                if (d && !this._settings.disliked.includes(d)) {
                    this._settings.liked = this._settings.liked.filter(x => x !== d);
                    this._settings.disliked = [...this._settings.disliked, d];
                    added++;
                }
            }
        }
        if (added > 0) {
            this._persist('liked');
            this._persist('disliked');
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

/** Strip protocol, www, trailing slash; return bare domain or empty string on failure. Supports wildcards. */
export function normalizeDomain(input: string): string {
    let s = input.trim().toLowerCase();
    if (!s) return '';
    const hasWildcard = s.startsWith('*.');
    if (hasWildcard) {
        s = s.slice(2);
    }
    try {
        if (!s.includes('://')) {
            s = 'http://' + s;
        }
        s = new URL(s).hostname;
    } catch {
        return '';
    }
    
    s = s.startsWith('www.') ? s.slice(4) : s;
    return hasWildcard ? '*.' + s : s;
}
