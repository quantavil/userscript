import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PressDetector } from '../src/gestures/PressDetector';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';

describe('PressDetector', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let detector: PressDetector;
    let mockVideo: any;
    let listeners: Record<string, ((e: any) => void)[]>;

    beforeEach(() => {
        vi.useFakeTimers();
        eventBus = new EventBus();
        
        listeners = {};
        (global as any).window = {
            addEventListener: vi.fn((event: string, callback: any) => {
                if (!listeners[event]) {
                    listeners[event] = [];
                }
                listeners[event].push(callback);
            }),
            removeEventListener: vi.fn(),
            location: { href: 'https://example.com/page', origin: 'https://example.com' }
        };

        (global as any).document = {
            querySelector: vi.fn().mockReturnValue(null)
        };

        store = new StateStore(eventBus);
        
        mockVideo = {
            isConnected: true,
            playbackRate: 1.0,
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

        detector = new PressDetector(eventBus, store);
        detector.init();
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (global as any).window;
        delete (global as any).document;
    });

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

    it('should start speed boost on long press', () => {
        const rateSpy = vi.fn();
        const uiSpy = vi.fn();
        eventBus.on('video:rate-change-requested', rateSpy);
        eventBus.on('ui:gesture-overlay', uiSpy);

        // Start touch pointerdown
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });

        // Advance time but not fully to the delay (600ms)
        vi.advanceTimersByTime(300);
        expect(rateSpy).not.toHaveBeenCalled();

        // Advance past delay
        vi.advanceTimersByTime(350);

        expect(rateSpy).toHaveBeenCalledWith({ rate: 2.0, saveToSettings: false });
        expect(uiSpy).toHaveBeenCalledWith({ text: '2x' });
        expect(detector.inLongPressGesture).toBe(true);
    });

    it('should cancel speed boost if user releases before delay', () => {
        const rateSpy = vi.fn();
        eventBus.on('video:rate-change-requested', rateSpy);

        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(300);

        fireEvent('pointerup', { pointerType: 'touch' });
        vi.advanceTimersByTime(400); // Trigger original delayed boost time

        expect(rateSpy).not.toHaveBeenCalled();
        expect(detector.inLongPressGesture).toBe(false);
    });

    it('should revert speed boost when user lifts finger after long press starts', () => {
        const rateSpy = vi.fn();
        const uiSpy = vi.fn();
        eventBus.on('video:rate-change-requested', rateSpy);
        eventBus.on('ui:gesture-overlay', uiSpy);

        // Fire pointerdown & trigger boost
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(650);

        expect(rateSpy).toHaveBeenLastCalledWith({ rate: 2.0, saveToSettings: false });

        // User releases finger
        fireEvent('pointerup', { pointerType: 'touch' });

        expect(rateSpy).toHaveBeenLastCalledWith({ rate: 1.0, saveToSettings: false });
        expect(uiSpy).toHaveBeenLastCalledWith(null);
        expect(detector.inLongPressGesture).toBe(false);
    });

    it('should not cancel speed boost for pointermove under 24px, but should cancel for pointermove over 24px', () => {
        const rateSpy = vi.fn();
        eventBus.on('video:rate-change-requested', rateSpy);

        // Start long press
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });

        // Move finger slightly (wobble of 20px)
        fireEvent('pointermove', { clientX: 220, clientY: 200, pointerType: 'touch' });
        
        // Wait and advance past delay
        vi.advanceTimersByTime(650);

        // The speed boost should have started because 20px is within the 24px tolerance
        expect(rateSpy).toHaveBeenCalledWith({ rate: 2.0, saveToSettings: false });
        expect(detector.inLongPressGesture).toBe(true);

        // Revert speed boost
        fireEvent('pointerup', { pointerType: 'touch' });
        expect(detector.inLongPressGesture).toBe(false);

        // Now test movement exceeding tolerance
        rateSpy.mockClear();
        fireEvent('pointerdown', { clientX: 200, clientY: 200, pointerType: 'touch' });

        // Move finger past tolerance (25px)
        fireEvent('pointermove', { clientX: 225, clientY: 200, pointerType: 'touch' });
        
        // Wait and advance past delay
        vi.advanceTimersByTime(650);

        // Long press should have been cancelled, so speed boost should NOT fire
        expect(rateSpy).not.toHaveBeenCalled();
        expect(detector.inLongPressGesture).toBe(false);
    });

    it('should ignore pointerdown if it starts in edge protection zones', () => {
        const rateSpy = vi.fn();
        eventBus.on('video:rate-change-requested', rateSpy);

        // Edge protection zones are clientX < 18px or clientX > window.innerWidth - 18px
        (global as any).window.innerWidth = 360;

        // Pointerdown too close to left edge (10px < 18px)
        fireEvent('pointerdown', { clientX: 10, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(650);
        expect(rateSpy).not.toHaveBeenCalled();

        // Pointerdown too close to right edge (350px > 342px)
        fireEvent('pointerdown', { clientX: 350, clientY: 200, pointerType: 'touch' });
        vi.advanceTimersByTime(650);
        expect(rateSpy).not.toHaveBeenCalled();

        // Clean up mock window.innerWidth
        delete (global as any).window.innerWidth;
    });
});

