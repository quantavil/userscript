import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DoubleTapDetector } from '../src/gestures/DoubleTapDetector';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';

describe('DoubleTapDetector', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let detector: DoubleTapDetector;
    let mockVideo: any;
    let listeners: Record<string, ((e: any) => void)[]>;

    beforeEach(() => {
        vi.useFakeTimers();
        eventBus = new EventBus();

        // Capture event listeners registered on window
        listeners = {};

        (global as any).window = {
            addEventListener: vi.fn((event: string, callback: any) => {
                if (!listeners[event]) {
                    listeners[event] = [];
                }
                listeners[event].push(callback);
            }),
            removeEventListener: vi.fn()
        };

        // Mock document for selector query
        (global as any).document = {
            querySelector: vi.fn().mockReturnValue(null)
        };

        store = new StateStore(eventBus);
        
        // Mock video element
        mockVideo = {
            isConnected: true,
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

        detector = new DoubleTapDetector(eventBus, store);
        detector.init();
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (global as any).window;
        delete (global as any).document;
    });

    // Helper to fire events on window
    function fireEvent(type: string, data: any) {
        const list = listeners[type] || [];
        const e = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            isTrusted: true,
            ...data
        };
        list.forEach(cb => cb(e));
        return e;
    }

    it('should ignore double taps if gestures are disabled', () => {
        store.settings.gesturesEnabled = false;
        const skipSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);

        // Fire tap 1
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Fire tap 2 (double tap)
        fireEvent('pointerdown', { clientX: 205, clientY: 205, pointerType: 'touch' });

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('should detect double tap on the left side of the video and request skip backward', () => {
        const skipSpy = vi.fn();
        const visualSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);
        eventBus.on('video:double-tap-skipped', visualSpy);

        // First tap: pointerType = touch on left side (x=200 is < 100 + 400/2 = 300)
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Second tap: pointerType = touch on left side within delay and distance
        fireEvent('pointerdown', { clientX: 205, clientY: 205, pointerType: 'touch' });

        expect(skipSpy).toHaveBeenCalledWith({ dir: -1, customSeconds: 10 });
        expect(visualSpy).toHaveBeenCalledWith({ side: 'left', x: 205, y: 205, seconds: 10 });
    });

    it('should detect double tap on the right side of the video and request skip forward', () => {
        const skipSpy = vi.fn();
        const visualSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);
        eventBus.on('video:double-tap-skipped', visualSpy);

        // First tap: pointerType = touch on right side (x=400 is > 100 + 400/2 = 300)
        fireEvent('pointerdown', { clientX: 400, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Second tap: pointerType = touch on right side within delay and distance
        fireEvent('pointerdown', { clientX: 405, clientY: 205, pointerType: 'touch' });

        expect(skipSpy).toHaveBeenCalledWith({ dir: 1, customSeconds: 10 });
        expect(visualSpy).toHaveBeenCalledWith({ side: 'right', x: 405, y: 205, seconds: 10 });
    });

    it('should accumulate skip seconds on consecutive rapid taps', () => {
        const skipSpy = vi.fn();
        const visualSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);
        eventBus.on('video:double-tap-skipped', visualSpy);

        // Tap 1
        fireEvent('pointerdown', { clientX: 400, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Tap 2 (double tap) -> skips 10s
        fireEvent('pointerdown', { clientX: 405, clientY: 205, pointerType: 'touch' });
        expect(skipSpy).toHaveBeenCalledTimes(1);
        expect(visualSpy).toHaveBeenLastCalledWith({ side: 'right', x: 405, y: 205, seconds: 10 });

        vi.advanceTimersByTime(100);

        // Tap 3 (triple tap) -> skips another 10s (accumulated 20s)
        fireEvent('pointerdown', { clientX: 410, clientY: 200, pointerType: 'touch' });
        expect(skipSpy).toHaveBeenCalledTimes(2);
        expect(visualSpy).toHaveBeenLastCalledWith({ side: 'right', x: 410, y: 200, seconds: 20 });
    });

    it('should reset tap accumulation after the reset timeout', () => {
        const skipSpy = vi.fn();
        const visualSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);
        eventBus.on('video:double-tap-skipped', visualSpy);

        // Tap 1
        fireEvent('pointerdown', { clientX: 400, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Tap 2 (double tap)
        fireEvent('pointerdown', { clientX: 405, clientY: 205, pointerType: 'touch' });
        expect(visualSpy).toHaveBeenLastCalledWith({ side: 'right', x: 405, y: 205, seconds: 10 });

        // Wait beyond reset delay (650ms)
        vi.advanceTimersByTime(700);

        // Tap 3 (new tap sequence)
        fireEvent('pointerdown', { clientX: 400, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Tap 4 (double tap on new sequence)
        fireEvent('pointerdown', { clientX: 405, clientY: 205, pointerType: 'touch' });
        expect(visualSpy).toHaveBeenLastCalledWith({ side: 'right', x: 405, y: 205, seconds: 10 }); // reset to 10s
    });

    it('should ignore taps if the pointer type is not touch', () => {
        const skipSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);

        // Fire pointerType = mouse taps
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'mouse' });
        vi.advanceTimersByTime(100);
        fireEvent('pointerdown', { clientX: 205, clientY: 205, pointerType: 'mouse' });

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('should cancel pending video click timers on double tap', () => {
        store.timers.videoClick = setTimeout(() => {}, 250);

        // Double tap sequence
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);
        fireEvent('pointerdown', { clientX: 205, clientY: 205, pointerType: 'touch' });

        expect(store.timers.videoClick).toBeUndefined();
    });

    it('should call preventDefault and stopPropagation on pointerup, click, and dblclick during double tap', () => {
        // Trigger a double tap
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);
        fireEvent('pointerdown', { clientX: 205, clientY: 205, pointerType: 'touch' });

        expect(store.isDoubleTapping).toBe(true);

        const pointerupEvent = fireEvent('pointerup', { pointerType: 'touch' });
        expect(pointerupEvent.preventDefault).toHaveBeenCalled();
        expect(pointerupEvent.stopPropagation).toHaveBeenCalled();

        const clickEvent = fireEvent('click', {});
        expect(clickEvent.preventDefault).toHaveBeenCalled();
        expect(clickEvent.stopPropagation).toHaveBeenCalled();

        const dblclickEvent = fireEvent('dblclick', {});
        expect(dblclickEvent.preventDefault).toHaveBeenCalled();
        expect(dblclickEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should be perfectly coupled with custom skipSeconds settings', () => {
        // Update settings to 15 seconds
        store.settings.skipSeconds = 15;
        const skipSpy = vi.fn();
        const visualSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);
        eventBus.on('video:double-tap-skipped', visualSpy);

        // Tap 1
        fireEvent('pointerdown', { clientX: 400, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(100);

        // Tap 2 (double tap) -> skips by 15s
        fireEvent('pointerdown', { clientX: 405, clientY: 205, pointerType: 'touch' });

        expect(skipSpy).toHaveBeenCalledWith({ dir: 1, customSeconds: 15 });
        expect(visualSpy).toHaveBeenCalledWith({ side: 'right', x: 405, y: 205, seconds: 15 });

        vi.advanceTimersByTime(100);

        // Tap 3 (triple tap) -> skips by another 15s (accumulated 30s)
        fireEvent('pointerdown', { clientX: 410, clientY: 200, pointerType: 'touch' });
        expect(skipSpy).toHaveBeenLastCalledWith({ dir: 1, customSeconds: 15 });
        expect(visualSpy).toHaveBeenLastCalledWith({ side: 'right', x: 410, y: 200, seconds: 30 });
    });

    it('should ignore double-taps within the top safety margin', () => {
        const skipSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);

        // top is 100, height is 300, margin is 36px (top+margin = 136). clientY = 110 is within top margin.
        fireEvent('pointerdown', { clientX: 200, clientY: 110, pointerType: 'touch' });
        vi.advanceTimersByTime(100);
        fireEvent('pointerdown', { clientX: 205, clientY: 115, pointerType: 'touch' });

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('should ignore double-taps within the bottom safety margin', () => {
        const skipSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);

        // bottom is 400, height is 300, margin is 36px (bottom-margin = 364). clientY = 390 is within bottom margin.
        fireEvent('pointerdown', { clientX: 200, clientY: 390, pointerType: 'touch' });
        vi.advanceTimersByTime(100);
        fireEvent('pointerdown', { clientX: 205, clientY: 395, pointerType: 'touch' });

        expect(skipSpy).not.toHaveBeenCalled();
    });

    it('should allow double-taps outside the safety margins', () => {
        const skipSpy = vi.fn();
        eventBus.on('video:skip-requested', skipSpy);

        // clientY = 150 is outside safety margins (136 < 150 < 364)
        fireEvent('pointerdown', { clientX: 200, clientY: 150, pointerType: 'touch' });
        vi.advanceTimersByTime(100);
        fireEvent('pointerdown', { clientX: 205, clientY: 155, pointerType: 'touch' });

        expect(skipSpy).toHaveBeenCalled();
    });
});
