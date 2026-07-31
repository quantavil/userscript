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
            removeEventListener: vi.fn(),
            location: { href: 'https://example.com/page' }
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

    describe('Domain-based Speed Remembrance', () => {
        it('should save lastRate under a domain-specific key', () => {
            (global as any).window.location.href = 'https://anikoto.tv/watch/123';
            (global as any).window.location.hostname = 'anikoto.tv';
            const store = new StateStore(eventBus);
            
            store.saveSetting('lastRate', 1.25);
            vi.advanceTimersByTime(2000);
            
            expect(mockStorage['mvc_lastRate_anikoto.tv']).toBe('1.25');
            // Should not save under the global key
            expect(mockStorage['mvc_lastRate']).toBeUndefined();
        });

        it('should fallback to global lastRate if domain-specific rate is missing', () => {
            mockStorage['mvc_lastRate'] = '1.2';
            (global as any).window.location.href = 'https://reddit.com/r/videos';
            (global as any).window.location.hostname = 'reddit.com';
            
            const store = new StateStore(eventBus);
            expect(store.settings.lastRate).toBe(1.2);
        });
    });

    describe('Video Position Tracking', () => {
        let store: StateStore;
        let mockVideo: HTMLVideoElement;

        beforeEach(() => {
            store = new StateStore(eventBus);
            mockVideo = {
                currentSrc: 'https://example.com/video.mp4',
                src: '',
                currentTime: 45,
                duration: 100
            } as any;
        });

        it('should save and get video position when rememberPlayback is true', () => {
            store.saveVideoPosition(mockVideo);
            
            const position = store.getVideoPosition(mockVideo);
            expect(position).toBe(45);
        });

        it('should not save position if currentTime is less than 3 seconds', () => {
            mockVideo.currentTime = 2;
            store.saveVideoPosition(mockVideo);
            
            const position = store.getVideoPosition(mockVideo);
            expect(position).toBe(0);
        });

        it('should remove position entry if currentTime is close to video ended (within 5s of duration)', () => {
            store.saveVideoPosition(mockVideo);
            expect(store.getVideoPosition(mockVideo)).toBe(45);

            mockVideo.currentTime = 96; // 100 - 4
            store.saveVideoPosition(mockVideo);
            
            expect(store.getVideoPosition(mockVideo)).toBe(0);
        });

        it('should not return position if rememberPlayback setting is disabled', () => {
            store.saveVideoPosition(mockVideo);
            expect(store.getVideoPosition(mockVideo)).toBe(45);

            store.settings.rememberPlayback = false;
            expect(store.getVideoPosition(mockVideo)).toBe(0);
        });

        it('should prune oldest positions when exceeding 100 entries', () => {
            for (let i = 0; i < 105; i++) {
                const v = {
                    currentSrc: `https://example.com/video-${i}.mp4`,
                    src: '',
                    currentTime: 10 + i,
                    duration: 200
                } as any;
                store.saveVideoPosition(v);
            }

            // The first 5 should have been pruned (e.g. video-0 should be pruned/0)
            const firstVideo = { currentSrc: 'https://example.com/video-0.mp4', src: '', currentTime: 10, duration: 200 } as any;
            expect(store.getVideoPosition(firstVideo)).toBe(0);

            // Recent ones should still be present
            const lastVideo = { currentSrc: 'https://example.com/video-104.mp4', src: '', currentTime: 114, duration: 200 } as any;
            expect(store.getVideoPosition(lastVideo)).toBe(114);
        });

        it('should preserve LRU eviction order when video IDs are numeric', () => {
            const store = new StateStore(eventBus);
            
            // Save 101 positions with numeric IDs
            for (let i = 0; i < 101; i++) {
                const v = {
                    currentSrc: '',
                    src: '',
                    currentTime: 10 + i,
                    duration: 200
                } as any;
                // Mock getVideoId to return pure numeric string to test integer sorting key eviction
                vi.spyOn(store as any, 'getVideoId').mockReturnValue(`${i}`);
                store.saveVideoPosition(v);
            }
            
            // The 0-th video (first added) should be evicted (returns 0)
            const firstVideo = { currentTime: 10, duration: 200 } as any;
            vi.spyOn(store as any, 'getVideoId').mockReturnValue('0');
            expect(store.getVideoPosition(firstVideo)).toBe(0);

            // The 1-st video should still exist
            const secondVideo = { currentTime: 11, duration: 200 } as any;
            vi.spyOn(store as any, 'getVideoId').mockReturnValue('1');
            expect(store.getVideoPosition(secondVideo)).toBe(11);
        });
    });

    describe('getVideoId and URL cleaning', () => {
        it('should correctly strip temporal query parameters from video sources', () => {
            const store = new StateStore(eventBus);
            const v1 = { currentSrc: 'https://example.com/video.mp4?t=10s&autoplay=1', src: '' } as any;
            const v2 = { currentSrc: 'https://example.com/video.mp4?autoplay=1&time=300', src: '' } as any;
            const v3 = { currentSrc: 'https://example.com/video.mp4?start=15&seek=99', src: '' } as any;
            
            expect((store as any).getVideoId(v1)).toBe('https://example.com/video.mp4?autoplay=1');
            expect((store as any).getVideoId(v2)).toBe('https://example.com/video.mp4?autoplay=1');
            expect((store as any).getVideoId(v3)).toBe('https://example.com/video.mp4');
        });

        it('should keep routing hash paths intact but clean hash query parameters', () => {
            const store = new StateStore(eventBus);
            
            // Set window location to hash-routed SPA URL
            (global as any).window.location.href = 'https://example.com/app#/watch/123?t=45s&other=foo';
            
            // For blob source, it falls back to page URL + DOM selector path
            const vBlob = { currentSrc: 'blob:https://example.com/abcd-efgh-ijkl', src: '', id: 'my-vid' } as any;
            
            expect((store as any).getVideoId(vBlob)).toBe('https://example.com/app#/watch/123?other=foo#my-vid');
        });

        it('should preserve route paths containing equals sign but no query mark without URL encoding', () => {
            const store = new StateStore(eventBus);
            (global as any).window.location.href = 'https://example.com/app#/watch/id=123';
            const vBlob = { currentSrc: 'blob:https://example.com/abcd', src: '', id: 'my-vid' } as any;
            expect((store as any).getVideoId(vBlob)).toBe('https://example.com/app#/watch/id=123#my-vid');
        });

        it('should generate a hierarchical stable selector for blob video elements without ID', () => {
            const store = new StateStore(eventBus);
            (global as any).window.location.href = 'https://example.com/page';

            const parent = {
                tagName: 'DIV',
                className: 'player-container first-class',
                id: 'player-id',
                parentElement: null
            } as any;

            const v = {
                tagName: 'VIDEO',
                className: 'video-element active',
                parentElement: parent,
                currentSrc: 'blob:https://example.com/xyz',
                src: ''
            } as any;

            expect((store as any).getVideoId(v)).toBe('https://example.com/page#div#player-id>video.video-element[0]');
        });

        it('should traverse parent shadow hosts to build selector when video is inside shadow DOM', () => {
            const store = new StateStore(eventBus);
            (global as any).window.location.href = 'https://example.com/page';

            // Mock Shadow Root structure
            const shadowRootMock = {
                host: {
                    tagName: 'MY-CUSTOM-PLAYER',
                    id: 'player-id',
                    parentElement: null
                }
            };

            const v = {
                tagName: 'VIDEO',
                className: 'inner-video',
                parentElement: null,
                parentNode: shadowRootMock,
                currentSrc: 'blob:https://example.com/xyz',
                src: ''
            } as any;

            expect((store as any).getVideoId(v)).toBe('https://example.com/page#my-custom-player#player-id>video.inner-video[0]');
        });
    });
});
