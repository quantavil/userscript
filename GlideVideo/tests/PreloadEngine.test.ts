import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreloadEngine } from '../src/video/PreloadEngine';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';

describe('PreloadEngine', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let engine: PreloadEngine;
    let mockVideo: any;
    let originalPlay: any;

    beforeEach(() => {
        vi.useFakeTimers();

        if (typeof (global as any).HTMLVideoElement === 'undefined') {
            class MockHTMLVideoElement {
                play() {}
            }
            MockHTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
            (global as any).HTMLVideoElement = MockHTMLVideoElement;
        }

        originalPlay = HTMLVideoElement.prototype.play;

        // Mock window
        (global as any).window = {
            __MVC_INSTANCE: {},
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        // Mock localStorage
        const mockStorage: Record<string, string> = {};
        (global as any).localStorage = {
            getItem: vi.fn((k: string) => mockStorage[k] ?? null),
            setItem: vi.fn((k: string, v: string) => { mockStorage[k] = v; }),
            removeItem: vi.fn((k: string) => { delete mockStorage[k]; }),
            clear: vi.fn(() => {})
        };

        eventBus = new EventBus();
        store = new StateStore(eventBus);
        store.settings = {
            skipSeconds: 10,
            defaultSpeed: 1.0,
            lastRate: 1.0,
            transform: { ratio: 'fit', zoom: 1, rotation: 0 },
            gesturesEnabled: true,
            preloadEnhanced: true
        };

        // Mock video element
        mockVideo = {
            paused: true,
            duration: 120,
            currentTime: 0,
            readyState: 4,
            getAttribute: vi.fn().mockReturnValue('none'),
            setAttribute: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            buffered: {
                length: 1,
                start: (i: number) => 0,
                end: (i: number) => 10
            }
        } as any;

        store.activeVideo = mockVideo;
        engine = new PreloadEngine(eventBus, store);
        (global as any).window.__MVC_INSTANCE.preloadEngine = engine;
    });

    afterEach(() => {
        vi.useRealTimers();
        if (engine) engine.destroy();
        if (originalPlay) HTMLVideoElement.prototype.play = originalPlay;
        delete (global as any).window;
        delete (global as any).localStorage;
        delete (global as any).HTMLVideoElement;
    });

    it('should patch HTMLVideoElement.prototype.play', () => {
        expect(HTMLVideoElement.prototype.play.__mvc_patched).toBe(true);
    });

    it('should trigger preload on video active changed', () => {
        const triggerSpy = vi.spyOn(engine, 'triggerEnhancedPreload');
        
        eventBus.emit('video:active-changed', mockVideo);
        
        expect(triggerSpy).toHaveBeenCalledWith(mockVideo);
    });

    it('should cancel preload when preloadEnhanced setting becomes false', () => {
        const cancelSpy = vi.spyOn(engine, 'cancelPreload');
        
        eventBus.emit('settings:changed', { key: 'preloadEnhanced', val: false });
        
        expect(cancelSpy).toHaveBeenCalled();
    });

    it('should trigger preload when video play state changes to paused', () => {
        const triggerSpy = vi.spyOn(engine, 'triggerEnhancedPreload');
        
        eventBus.emit('video:play-state-changed', { playing: false });
        
        expect(triggerSpy).toHaveBeenCalledWith(mockVideo);
    });

    it('should cancel preload when video play state changes to playing', () => {
        const cancelSpy = vi.spyOn(engine, 'cancelPreload');
        
        eventBus.emit('video:play-state-changed', { playing: true });
        
        expect(cancelSpy).toHaveBeenCalled();
    });

    it('should configure video attributes and schedule pump when triggerEnhancedPreload is called', () => {
        engine.triggerEnhancedPreload(mockVideo);

        expect(mockVideo.setAttribute).toHaveBeenCalledWith('preload', 'auto');
        expect(mockVideo.addEventListener).toHaveBeenCalledWith('play', expect.any(Function), expect.any(Object));
        expect(mockVideo.addEventListener).toHaveBeenCalledWith('seeked', expect.any(Function), expect.any(Object));
    });

    it('should correctly determine next unbuffered segment', () => {
        const nextUnbufferedPrivate = (engine as any).nextUnbuffered.bind(engine);
        
        const videoWithBuffer = {
            buffered: {
                length: 2,
                start: (i: number) => i === 0 ? 0 : 40,
                end: (i: number) => i === 0 ? 20 : 60
            }
        } as any;

        // At t=5, it is in buffered range [0, 20], next unbuffered should be 20
        expect(nextUnbufferedPrivate(videoWithBuffer, 5, 100)).toBe(20);

        // At t=25, it is outside buffered ranges, next unbuffered is 25 itself
        expect(nextUnbufferedPrivate(videoWithBuffer, 25, 100)).toBe(25);

        // At t=45, it is in buffered range [40, 60], next unbuffered should be 60
        expect(nextUnbufferedPrivate(videoWithBuffer, 45, 100)).toBe(60);
    });

    it('should identify if video is fully buffered', () => {
        const isFullyBufferedPrivate = (engine as any).isFullyBuffered.bind(engine);
        
        const fullyBufferedVideo = {
            duration: 100,
            buffered: {
                length: 1,
                start: (i: number) => 0,
                end: (i: number) => 100
            }
        } as any;

        const unbufferedVideo = {
            duration: 100,
            buffered: {
                length: 1,
                start: (i: number) => 0,
                end: (i: number) => 20
            }
        } as any;

        expect(isFullyBufferedPrivate(fullyBufferedVideo)).toBe(true);
        expect(isFullyBufferedPrivate(unbufferedVideo)).toBe(false);
    });
});
