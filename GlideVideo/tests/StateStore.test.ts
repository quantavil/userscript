import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateStore } from '../src/core/StateStore';
import { EventBus } from '../src/events/EventBus';

describe('StateStore', () => {
    let eventBus: EventBus;
    let mockStorage: Record<string, string>;

    beforeEach(() => {
        vi.useFakeTimers();
        eventBus = new EventBus();
        mockStorage = {};

        // Mock window and event listeners
        (global as any).window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        // Mock localStorage
        (global as any).localStorage = {
            getItem: vi.fn((k: string) => mockStorage[k] ?? null),
            setItem: vi.fn((k: string, v: string) => { mockStorage[k] = v; }),
            removeItem: vi.fn((k: string) => { delete mockStorage[k]; }),
            clear: vi.fn(() => { mockStorage = {}; })
        };
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (global as any).window;
        delete (global as any).localStorage;
    });

    it('should load default settings when localStorage is empty', () => {
        const store = new StateStore(eventBus);
        expect(store.settings.skipSeconds).toBe(10);
        expect(store.settings.defaultSpeed).toBe(1.0);
        expect(store.settings.lastRate).toBe(1.0);
        expect(store.settings.gesturesEnabled).toBe(true);
        expect(store.settings.transform.zoom).toBe(1);
    });

    it('should load saved settings from localStorage', () => {
        mockStorage['mvc_skipSeconds'] = '15';
        mockStorage['mvc_defaultSpeed'] = '2.0';
        mockStorage['mvc_gesturesEnabled'] = 'false';

        const store = new StateStore(eventBus);
        expect(store.settings.skipSeconds).toBe(15);
        expect(store.settings.defaultSpeed).toBe(2.0);
        expect(store.settings.gesturesEnabled).toBe(false);
    });

    it('should save setting, emit change event, and write to localStorage debounced', () => {
        const store = new StateStore(eventBus);
        const eventSpy = vi.fn();
        eventBus.on('settings:changed', eventSpy);

        store.saveSetting('skipSeconds', 25);

        // Should update settings memory immediately
        expect(store.settings.skipSeconds).toBe(25);
        expect(eventSpy).toHaveBeenCalledWith({ key: 'skipSeconds', val: 25 });

        // Should NOT write to localStorage immediately (due to debounce)
        expect(localStorage.setItem).not.toHaveBeenCalled();

        // Advance timers by storage debounce duration (2000ms)
        vi.advanceTimersByTime(2000);

        expect(localStorage.setItem).toHaveBeenCalledWith('mvc_skipSeconds', '25');
        expect(mockStorage['mvc_skipSeconds']).toBe('25');
    });

    it('should flush all settings to localStorage immediately', () => {
        const store = new StateStore(eventBus);
        store.settings.skipSeconds = 30;
        store.settings.defaultSpeed = 1.5;

        store.flushSettings();

        expect(mockStorage['mvc_skipSeconds']).toBe('30');
        expect(mockStorage['mvc_defaultSpeed']).toBe('1.5');
    });

    it('should format storage keys using getStorageKey helper', () => {
        const store = new StateStore(eventBus);
        const getStorageKeyPrivate = (store as any).getStorageKey.bind(store);
        expect(getStorageKeyPrivate('testKey')).toBe('mvc_testKey');
        expect(getStorageKeyPrivate('skipSeconds')).toBe('mvc_skipSeconds');
    });
});
