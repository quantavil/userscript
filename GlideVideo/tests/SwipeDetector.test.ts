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
            removeEventListener: vi.fn((event: string, callback: any) => {
                if (windowListeners[event]) {
                    windowListeners[event] = windowListeners[event].filter(cb => cb !== callback);
                }
            })
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
            gesturesEnabled: true,
            volumeBoostEnabled: true,
            scrollCompatibility: true
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

    function getGestureHandlers() {
        const moves = windowListeners['touchmove'] || [];
        const ends = windowListeners['touchend'] || [];
        return {
            touchMoveHandler: moves[moves.length - 1],
            touchEndHandler: ends[ends.length - 1]
        };
    }

    it('should initialize swipe seeking on touchmove beyond threshold', () => {
        const overlaySpy = vi.fn();
        eventBus.on('ui:gesture-overlay', overlaySpy);

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: {}
        });

        const { touchMoveHandler, touchEndHandler } = getGestureHandlers();
        expect(touchMoveHandler).toBeDefined();

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
        const brightnessSpy = vi.fn();
        eventBus.on('ui:brightness-changed', brightnessSpy);

        // Set baseline brightness to 0.5 so we can test increasing it
        store.brightness = 0.5;

        // Touch start on left side (150 < 300 midpoint)
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 150, clientY: 200 }],
            target: {}
        });

        const { touchMoveHandler, touchEndHandler } = getGestureHandlers();
        expect(touchMoveHandler).toBeDefined();

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
        const cancelSpeedBoostSpy = vi.fn();
        eventBus.on('gesture:cancel-speed-boost', cancelSpeedBoostSpy);

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: {}
        });

        const { touchMoveHandler } = getGestureHandlers();

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

    it('should ignore seeks of less than 5 seconds (resistance) and hide overlay', () => {
        const overlaySpy = vi.fn();
        eventBus.on('ui:gesture-overlay', overlaySpy);

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: {}
        });

        const { touchMoveHandler, touchEndHandler } = getGestureHandlers();

        // Touch move to dx = 45px (commits seek, since > 10px threshold. timeChange = 4.5s, which is < 5s)
        touchMoveHandler({
            touches: [{ clientX: 245, clientY: 200 }]
        });
        expect(store.isSwipeSeeking).toBe(true);

        // The overlay should receive null (hide) because the delta is under the 5s threshold
        expect(overlaySpy).toHaveBeenLastCalledWith(null);

        // End touch
        touchEndHandler();

        expect(store.isSwipeSeeking).toBe(false);
        expect(mockVideo.currentTime).toBe(50); // Did not change from initial 50
    });

    it('should start seek delta smoothly at 1s after crossing 5s threshold', () => {
        const overlaySpy = vi.fn();
        eventBus.on('ui:gesture-overlay', overlaySpy);

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: {}
        });

        const { touchMoveHandler, touchEndHandler } = getGestureHandlers();

        // Touch move to dx = 55px (commits seek, timeChange = 5.5s)
        touchMoveHandler({
            touches: [{ clientX: 255, clientY: 200 }]
        });

        // Should seek smoothly starting at 1.5s (5.5s - 4s offset = 1.5s)
        // End touch
        touchEndHandler();

        expect(mockVideo.currentTime).toBe(51.5); // 50 + 1.5 = 51.5
    });

    it('should cancel gesture and allow page scroll in portrait mode on vertical swipe', () => {
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as any;

        // Touch start
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: {}
        });

        const { touchMoveHandler } = getGestureHandlers();

        // Touch move vertically (15px)
        const moveEvent = {
            touches: [{ clientX: 200, clientY: 215 }],
            preventDefault: vi.fn(),
            cancelable: true
        };
        
        const initialMovesLength = (windowListeners['touchmove'] || []).length;
        touchMoveHandler(moveEvent);

        // Verify it cleaned up (removed listener)
        expect((windowListeners['touchmove'] || []).length).toBeLessThan(initialMovesLength);
        expect(moveEvent.preventDefault).not.toHaveBeenCalled();

        window.matchMedia = originalMatchMedia;
    });

    it('should support volume boost up to 200%', () => {
        mockVideo.volume = 1.0;
        mockVideo.muted = false;

        // Mock Web Audio API
        const mockGainNode = { gain: { value: 1.0 }, connect: vi.fn() };
        const mockSource = { connect: vi.fn() };
        const mockAudioCtx = {
            createMediaElementSource: vi.fn().mockReturnValue(mockSource),
            createGain: vi.fn().mockReturnValue(mockGainNode),
            destination: {}
        };
        (global as any).window.AudioContext = vi.fn().mockImplementation(() => mockAudioCtx);

        // Touch start (Right side for volume)
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 450, clientY: 200 }], // Right side
            target: {}
        });

        const { touchMoveHandler } = getGestureHandlers();

        // Touch move upwards to trigger volume increase beyond 100%
        touchMoveHandler({
            touches: [{ clientX: 450, clientY: 100 }], // Move up 100px
            preventDefault: vi.fn()
        });

        // Verify volume boost node was initialized and set to higher volume
        expect(mockVideo.volume).toBe(1.0); // capped at 1.0
        expect((mockVideo as any).gtAudioInit).toBe(true);
        expect((mockVideo as any).gtGainNode.gain.value).toBeGreaterThan(1.0);

        delete (global as any).window.AudioContext;
    });

    it('should block swipes if isScreenLocked is true', () => {
        store.isScreenLocked = true;
        const initialMoveCount = (windowListeners['touchmove'] || []).length;

        fireWindowEvent('touchstart', {
            touches: [{ clientX: 200, clientY: 200 }],
            target: {}
        });

        expect((windowListeners['touchmove'] || []).length).toBe(initialMoveCount);
        store.isScreenLocked = false;
    });

    it('should ignore swipe touchstart if it occurs in edge protection zones', () => {
        const originalInnerWidth = window.innerWidth;
        (global as any).window.innerWidth = 360;

        const initialMoveCount = (windowListeners['touchmove'] || []).length;

        // Too close to left edge (10px < 18px)
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 10, clientY: 200 }],
            target: {}
        });
        expect((windowListeners['touchmove'] || []).length).toBe(initialMoveCount);

        // Too close to right edge (350px > 342px)
        fireWindowEvent('touchstart', {
            touches: [{ clientX: 350, clientY: 200 }],
            target: {}
        });
        expect((windowListeners['touchmove'] || []).length).toBe(initialMoveCount);

        if (originalInnerWidth !== undefined) {
            (global as any).window.innerWidth = originalInnerWidth;
        } else {
            delete (global as any).window.innerWidth;
        }
    });
});
