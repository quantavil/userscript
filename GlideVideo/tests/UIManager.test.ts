// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';
import { UIManager } from '../src/ui/UIManager';

describe('UIManager', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let uiManager: UIManager;
    let video: HTMLVideoElement;

    beforeEach(() => {
        document.body.innerHTML = '';
        eventBus = new EventBus();
        store = new StateStore(eventBus);
        uiManager = new UIManager(eventBus, store);
        uiManager.init();

        video = document.createElement('video');
        Object.defineProperty(video, 'getBoundingClientRect', {
            value: () => ({ top: 100, left: 100, right: 500, bottom: 400, width: 400, height: 300 })
        });
        document.body.appendChild(video);
        store.setActiveVideo(video);
    });

    afterEach(() => {
        store.abortController.abort();
        document.body.innerHTML = '';
    });

    it('should initialize main UI elements and append them to DOM', () => {
        expect(uiManager.wrap).not.toBeNull();
        expect(uiManager.backdrop).not.toBeNull();
        expect(uiManager.toast).not.toBeNull();
        expect(uiManager.gestureOverlay).not.toBeNull();
        expect(uiManager.doubleTapContainer).not.toBeNull();
    });

    it('should show and hide toast correctly', () => {
        vi.useFakeTimers();
        uiManager.showToast('Test Toast Notification');

        expect(uiManager.toast?.textContent).toBe('Test Toast Notification');
        expect(uiManager.toast?.classList.contains('visible')).toBe(true);

        vi.advanceTimersByTime(2000);
        expect(uiManager.toast?.classList.contains('visible')).toBe(false);
        vi.useRealTimers();
    });

    it('should show and hide gesture overlay', () => {
        uiManager.showGestureOverlay('1.5x', 'Speed Boost');
        expect(uiManager.gestureOverlay?.style.display).toBe('block');
        expect(uiManager.gestureOverlay?.textContent).toContain('1.5x');
        expect(uiManager.gestureOverlay?.textContent).toContain('Speed Boost');

        uiManager.hideGestureOverlay();
        expect(uiManager.gestureOverlay?.style.display).toBe('none');
    });

    it('should toggle screen lock mode', () => {
        expect(store.isScreenLocked).toBe(false);
        uiManager.toggleScreenLock();
        expect(store.isScreenLocked).toBe(true);
        expect(uiManager.wrap?.classList.contains('locked')).toBe(true);

        uiManager.toggleScreenLock();
        expect(store.isScreenLocked).toBe(false);
        expect(uiManager.wrap?.classList.contains('locked')).toBe(false);
    });

    it('should update volume bar and brightness bar displays', () => {
        uiManager.showVolumeBar(0.8);
        expect(uiManager.volumeBar?.classList.contains('visible')).toBe(true);
        expect(uiManager.volumeValue?.textContent).toBe('80%');

        uiManager.showBrightness(0.5);
        expect(uiManager.brightnessBar?.classList.contains('visible')).toBe(true);
        expect(uiManager.brightnessValue?.textContent).toBe('50%');
    });
});
