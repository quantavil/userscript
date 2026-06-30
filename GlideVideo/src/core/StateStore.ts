// src/core/StateStore.ts
import { EventBus } from '../events/EventBus';
import { MVC_CONFIG } from '../config';

export interface Settings {
    skipSeconds: number;
    defaultSpeed: number;
    lastRate: number;
    transform: { ratio: string; zoom: number; rotation: number };
    gesturesEnabled: boolean;
    preloadEnhanced: boolean;
    volumeBoostEnabled: boolean;
    scrollCompatibility: boolean;
    [key: string]: any;
}

export class StateStore {
    // Shared state
    public activeVideo: HTMLVideoElement | null = null;
    public visibleVideos = new Map<HTMLVideoElement, boolean>();
    public isManuallyPositioned = false;
    public isScrolling = false;
    public lastManualPageX?: number;
    public lastManualPageY?: number;
    public isTicking = false;
    public savedPlaybackRate?: number;
    public lastRealUserEvent = 0;
    public isInitialized = false;
    public isDragging = false;
    public isSpeedSliding = false;
    public isPinching = false;
    public isSwipeSeeking = false;
    public isVolumeControlling = false;
    public isDoubleTapping = false;
    public brightness = 1.0;
    public isBrightnessControlling = false;
    public uiWrap: HTMLDivElement | null = null;
    public isScreenLocked = false;

    // Internal rate fighting states
    public _isInternalRateChange = false;
    public _rateOverrideCount = 0;

    public settings!: Settings;
    public timers: Record<string, any> = {};
    public readonly abortController = new AbortController();

    constructor(public readonly eventBus: EventBus) {
        this.loadSettings();
        
        ['beforeunload', 'pagehide'].forEach(ev =>
            window.addEventListener(ev, () => this.flushSettings(), { capture: true, signal: this.abortController.signal })
        );
    }

    public setActiveVideo(v: HTMLVideoElement | null) {
        if (this.activeVideo === v) return;
        this.activeVideo = v;
        this.eventBus.emit('video:active-changed', v);
    }

    private getStorageKey(key: string): string {
        return `mvc_${key}`;
    }

    // ── Settings persistence ────────────────────────────────────────────────
    public loadSettings() {
        const getStored = (k: string, d: any) => {
            try {
                const v = localStorage.getItem(k);
                return v === null ? d : JSON.parse(v);
            } catch (e) {
                return d;
            }
        };
        this.settings = {
            skipSeconds:     getStored(this.getStorageKey('skipSeconds'),     10),
            defaultSpeed:    getStored(this.getStorageKey('defaultSpeed'),    1.0),
            lastRate:        getStored(this.getStorageKey('lastRate'),        1.0),
            transform:       { ratio: 'fit', zoom: 1, rotation: 0 },
            gesturesEnabled: getStored(this.getStorageKey('gesturesEnabled'), true),
            preloadEnhanced: getStored(this.getStorageKey('preloadEnhanced'), false),
            volumeBoostEnabled: getStored(this.getStorageKey('volumeBoostEnabled'), true),
            scrollCompatibility: getStored(this.getStorageKey('scrollCompatibility'), true)
        };
    }

    public saveSetting(key: string, val: any) {
        this.settings[key] = val;
        if (key === 'lastRate') {
            this._rateOverrideCount = 0;
        }
        this.eventBus.emit('settings:changed', { key, val });
        
        if (key === 'transform') {
            if (this.activeVideo) {
                (this.activeVideo as any).__mvc_transform = val;
            }
            return; // Do not persist transform in localStorage
        }
        
        clearTimeout(this.timers[`save_${key}`]);
        this.timers[`save_${key}`] = setTimeout(() => {
            try {
                localStorage.setItem(this.getStorageKey(key), JSON.stringify(val));
            } catch (e) {}
        }, MVC_CONFIG.STORAGE_DEBOUNCE_MS) as any;
    }

    public flushSettings() {
        if (!this.settings) return;
        for (const key of Object.keys(this.settings)) {
            if (key === 'transform') continue; // Do not persist transform in localStorage
            clearTimeout(this.timers[`save_${key}`]);
            try {
                localStorage.setItem(this.getStorageKey(key), JSON.stringify(this.settings[key]));
            } catch (e) {}
        }
    }
}
