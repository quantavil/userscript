import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoTracker } from '../src/video/VideoTracker';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';
import * as utils from '../src/utils';

describe('VideoTracker', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let tracker: VideoTracker;
    let intersectionCallbacks: ((entries: any[]) => void)[];
    let mutationCallbacks: ((mutations: any[]) => void)[];

    beforeEach(() => {
        vi.useFakeTimers();

        if (typeof (global as any).Node === 'undefined') {
            class MockNode {}
            (MockNode as any).ELEMENT_NODE = 1;
            (MockNode as any).DOCUMENT_NODE = 9;
            (global as any).Node = MockNode;
        }

        if (typeof (global as any).Element === 'undefined') {
            class MockElement {
                attachShadow() {}
            }
            (global as any).Element = MockElement;
        }

        intersectionCallbacks = [];
        mutationCallbacks = [];

        // Mock IntersectionObserver
        (global as any).IntersectionObserver = class {
            constructor(cb: any) {
                intersectionCallbacks.push(cb);
            }
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };

        // Mock MutationObserver
        (global as any).MutationObserver = class {
            constructor(cb: any) {
                mutationCallbacks.push(cb);
            }
            observe = vi.fn();
            disconnect = vi.fn();
        };

        // Mock document body
        const bodyMock = {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: []
        };
        (global as any).document = {
            nodeType: 9,
            childNodes: [bodyMock],
            body: bodyMock,
            documentElement: {
                nodeType: 1,
                tagName: 'HTML',
                childNodes: []
            }
        };

        (global as any).window = {
            innerWidth: 1024,
            innerHeight: 768,
            __MVC_INSTANCE: {},
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            location: { href: 'https://example.com/page', origin: 'https://example.com' }
        };

        // Mock localStorage
        const mockStorage: Record<string, string> = {};
        (global as any).localStorage = {
            getItem: vi.fn((k: string) => mockStorage[k] ?? null),
            setItem: vi.fn((k: string, v: string) => { mockStorage[k] = v; }),
            removeItem: vi.fn((k: string) => { delete mockStorage[k]; }),
            clear: vi.fn(() => {})
        };

        // Mock getComputedStyle
        (global as any).getComputedStyle = vi.fn().mockReturnValue({
            visibility: 'visible',
            position: 'static'
        });

        eventBus = new EventBus();
        store = new StateStore(eventBus);
        store.settings = {
            skipSeconds: 10,
            defaultSpeed: 1.0,
            lastRate: 1.0,
            transform: { ratio: 'fit', zoom: 1, rotation: 0 },
            gesturesEnabled: true
        };

        tracker = new VideoTracker(eventBus, store);
    });

    afterEach(() => {
        vi.useRealTimers();
        if (tracker) tracker.destroy();
        delete (global as any).window;
        delete (global as any).document;
        delete (global as any).localStorage;
        delete (global as any).Element;
        delete (global as any).IntersectionObserver;
        delete (global as any).MutationObserver;
        delete (global as any).getComputedStyle;
    });

    function createMockVideo() {
        const video = {
            nodeType: 1,
            tagName: 'VIDEO',
            isConnected: true,
            muted: false,
            playbackRate: 1.0,
            currentTime: 0,
            duration: 100,
            paused: false,
            ended: false,
            style: { transform: '', objectFit: '' },
            dataset: {},
            clientWidth: 640,
            clientHeight: 360,
            childNodes: [],
            getBoundingClientRect: vi.fn().mockReturnValue({
                left: 100,
                top: 100,
                width: 640,
                height: 360,
                right: 740,
                bottom: 460
            }),
            closest: vi.fn().mockReturnValue(null),
            querySelector: vi.fn().mockReturnValue(null)
        } as any;
        return video;
    }

    it('should initialize and register observers', () => {
        tracker.init();
        expect(tracker.intersectionObserver).toBeDefined();
        expect(tracker.mutationObserver).toBeDefined();
    });

    it('should evaluate and choose the best active video based on size and play state', () => {
        const video1 = createMockVideo(); // 640x360 playing
        video1.paused = false;
        video1.readyState = 4;

        const video2 = createMockVideo(); // 320x180 playing
        video2.paused = false;
        video2.readyState = 4;
        video2.getBoundingClientRect = vi.fn().mockReturnValue({
            left: 0,
            top: 0,
            width: 320,
            height: 180,
            right: 320,
            bottom: 180
        });

        // Add both to visible videos
        store.visibleVideos.set(video1, true);
        store.visibleVideos.set(video2, true);

        // Run evaluation
        tracker.evaluateActive();

        expect(store.activeVideo).toBe(video1);

        // Change video2 to be larger and playing, video1 is paused
        video1.paused = true;
        video2.getBoundingClientRect = vi.fn().mockReturnValue({
            left: 0,
            top: 0,
            width: 1280,
            height: 720,
            right: 1280,
            bottom: 720
        });

        tracker.evaluateActive();
        expect(store.activeVideo).toBe(video2);
    });

    it('should handle intersection changes and trigger evaluate', () => {
        tracker.init();

        const video = createMockVideo();
        const evaluateSpy = vi.spyOn(tracker, 'evaluateActive');

        // Target enters viewport
        intersectionCallbacks[0]([
            {
                target: video,
                isIntersecting: true
            }
        ]);

        expect(store.visibleVideos.has(video)).toBe(true);
        
        // Fast forward debounced evaluate timer
        vi.advanceTimersByTime(1000);
        expect(evaluateSpy).toHaveBeenCalled();
    });

    it('should handle mutation elements addition and deletion', () => {
        tracker.init();

        const video = createMockVideo();
        const evaluateSpy = vi.spyOn(tracker, 'evaluateActive');

        // Mock utils.findAllVideos to return the video when mutation occurs
        const findSpy = vi.spyOn(utils, 'findAllVideos').mockReturnValue([video]);

        mutationCallbacks[0]([
            {
                addedNodes: [
                    {
                        nodeType: 1,
                        tagName: 'DIV',
                        childNodes: [video]
                    }
                ],
                removedNodes: []
            } as any
        ]);

        expect(tracker.intersectionObserver?.observe).toHaveBeenCalledWith(video);
        vi.advanceTimersByTime(1000);
        expect(evaluateSpy).toHaveBeenCalled();

        // Target removed
        mutationCallbacks[0]([
            {
                addedNodes: [],
                removedNodes: [
                    {
                        nodeType: 1,
                        tagName: 'DIV',
                        childNodes: [video]
                    }
                ]
            } as any
        ]);

        expect(tracker.intersectionObserver?.unobserve).toHaveBeenCalledWith(video);
        expect(store.visibleVideos.has(video)).toBe(false);
    });

    it('should intercept attachShadow and observe new shadow roots', () => {
        (global as any).window.__MVC_INSTANCE = { videoTracker: tracker };
        
        const attachShadowSpy = vi.fn().mockReturnValue({
            nodeType: 1,
            childNodes: [],
            observe: vi.fn(),
            querySelector: vi.fn().mockReturnValue(null)
        });
        
        Element.prototype.attachShadow = attachShadowSpy;
        
        tracker.patchAttachShadow();
        
        const div = {
            tagName: 'DIV',
            attachShadow: Element.prototype.attachShadow
        } as any;

        const shadowRoot = div.attachShadow({ mode: 'open' });
        
        expect(attachShadowSpy).toHaveBeenCalled();
        
        // Run setTimeout callback
        vi.advanceTimersByTime(1);
        expect(tracker.shadowObservers.has(shadowRoot)).toBe(true);

        // Cleanup
        tracker.destroy();
        expect(Element.prototype.attachShadow).toBe(attachShadowSpy);
    });
});
