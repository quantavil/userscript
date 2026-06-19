import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SwipeDetector } from '../src/gestures/SwipeDetector';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';

describe('SwipeDetector', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let detector: SwipeDetector;
    let mockVideo: any;
    let windowListeners: Record<string, ((e: any) => void)[]>;

    beforeEach(() => {
        vi.useFakeTimers();
        eventBus = new EventBus();

        windowListeners = {};
        (global as any).window = {
            addEventListener: vi.fn((event: string, callback: any) => {
                if (!windowListeners[event]) {
                    windowListeners[event] = [];
                }
                windowListeners[event].push(callback);
            }),
            removeEventListener: vi.fn()
        };

        (global as any).document = {
            querySelector: vi.fn().mockReturnValue(null)
        };

        store = new StateStore(eventBus);
        
        mockVideo = {
            isConnected: true,
            currentTime: 50,
            duration: 100,
            getBoundingClientRect: vi.fn().mockReturnValue({
                left: 100,
                top: 100,
                width: 400,
                height: 300,
                right: 500,
                bottom: 400
            })
        };
        store.activeVideo = mockVideo;
        store.settings = {
            skipSeconds: 10,
            defaultSpeed: 1.0,
            lastRate: 1.0,
            transform: { ratio: 'fit', zoom: 1, rotation: 0 },
            gesturesEnabled: true
        };

        detector = new SwipeDetector(eventBus, store);
        detector.init();
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (global as any).window;
        delete (global as any).document;
    });

    function fireWindowEvent(type: string, data: any) {
        const list = windowListeners[type] || [];
        const e = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            isTrusted: true,
            ...data
        };
        list.forEach(cb => cb(e));
        return e;
    }

    it('should initialize swipe seeking on touchmove beyond threshold', () => {
        let touchMoveHandler: any = null;
        let touchEndHandler: any = null;

        const targetMock = {
            addEventListener: vi.fn((event: string, cb: any) => {
                if (event === 'touchmove') touchMoveHandler = cb;
                if (event === 'touchend') touchEndHandler = cb;
            }),
            removeEventListener: vi.fn()
        };

        const overlaySpy = vi.fn();
        eventBus.on('ui:gesture-overlay', overlaySpy);

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: targetMock
        });

        expect(targetMock.addEventListener).toHaveBeenCalled();

        // Simulate swipe move to the right (clientX increases, dx = 50px, which is > GESTURE_MOVE_THRESHOLD = 10px)
        touchMoveHandler({
            touches: [{ clientX: 250, clientY: 200 }]
        });

        expect(store.isSwipeSeeking).toBe(true);
        expect(overlaySpy).toHaveBeenCalled();

        // End touch
        touchEndHandler();

        expect(store.isSwipeSeeking).toBe(false);
        expect(mockVideo.currentTime).toBeGreaterThan(50); // Seeked forward
    });

    it('should handle pinch-to-zoom updates', () => {
        const transformSpy = vi.fn();
        eventBus.on('video:transform-need-update', transformSpy);

        // Touch start with 2 fingers (distance = 100px)
        fireWindowEvent('touchstart', {
            touches: [
                { clientX: 200, clientY: 200 },
                { clientX: 300, clientY: 200 }
            ]
        });

        expect(store.isPinching).toBe(true);

        // Touch move with 2 fingers (distance increases to 200px -> scale factor = 2x)
        fireWindowEvent('touchmove', {
            touches: [
                { clientX: 150, clientY: 200 },
                { clientX: 350, clientY: 200 }
            ],
            cancelable: true,
            preventDefault: vi.fn()
        });

        expect(store.settings.transform.zoom).toBe(2.0); // 1.0 * 2.0 = 2.0
        expect(transformSpy).toHaveBeenCalled();

        // Touch end/cancel
        fireWindowEvent('touchend', {});
        expect(store.isPinching).toBe(false);
    });

    it('should snap zoom value to closest snap point on pinch end', () => {
        // Touch start with 2 fingers (distance = 100px)
        fireWindowEvent('touchstart', {
            touches: [
                { clientX: 200, clientY: 200 },
                { clientX: 300, clientY: 200 }
            ]
        });

        // Touch move to end up with zoom = 1.15 (closest to snap point 1.0)
        fireWindowEvent('touchmove', {
            touches: [
                { clientX: 190, clientY: 200 },
                { clientX: 305, clientY: 200 }
            ]
        });

        expect(store.settings.transform.zoom).toBeCloseTo(1.15, 2);

        // Trigger snap on end (1.15 is within 0.15 threshold of snap point 1.0)
        fireWindowEvent('touchend', {});

        expect(store.settings.transform.zoom).toBe(1.0);
    });

    it('should initialize brightness adjustments on left-side vertical touchmove beyond threshold', () => {
        let touchMoveHandler: any = null;
        let touchEndHandler: any = null;

        const targetMock = {
            addEventListener: vi.fn((event: string, cb: any) => {
                if (event === 'touchmove') touchMoveHandler = cb;
                if (event === 'touchend') touchEndHandler = cb;
            }),
            removeEventListener: vi.fn()
        };

        const brightnessSpy = vi.fn();
        eventBus.on('ui:brightness-changed', brightnessSpy);

        // Set baseline brightness to 0.5 so we can test increasing it
        store.brightness = 0.5;

        // Touch start on left side (150 < 300 midpoint)
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 150, clientY: 200 }],
            target: targetMock
        });

        expect(targetMock.addEventListener).toHaveBeenCalled();

        // Swipe move upward (clientY decreases to 150, dy = -50px, which is vertical dominant)
        touchMoveHandler({
            touches: [{ clientX: 150, clientY: 150 }]
        });

        expect(store.isBrightnessControlling).toBe(true);
        expect(brightnessSpy).toHaveBeenCalled();
        expect(store.brightness).toBeGreaterThan(0.5);

        // End touch
        touchEndHandler();

        expect(store.isBrightnessControlling).toBe(false);
    });

    it('should emit gesture:cancel-speed-boost when a swipe is committed', () => {
        let touchMoveHandler: any = null;
        const targetMock = {
            addEventListener: vi.fn((event: string, cb: any) => {
                if (event === 'touchmove') touchMoveHandler = cb;
            }),
            removeEventListener: vi.fn()
        };

        const cancelSpeedBoostSpy = vi.fn();
        eventBus.on('gesture:cancel-speed-boost', cancelSpeedBoostSpy);

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: targetMock
        });

        // Touch move under threshold (dx = 5px) -> undecided
        touchMoveHandler({
            touches: [{ clientX: 205, clientY: 200 }]
        });
        expect(cancelSpeedBoostSpy).not.toHaveBeenCalled();

        // Touch move beyond threshold (dx = 30px) -> commits seek
        touchMoveHandler({
            touches: [{ clientX: 230, clientY: 200 }]
        });
        expect(cancelSpeedBoostSpy).toHaveBeenCalledTimes(1);
    });
});

