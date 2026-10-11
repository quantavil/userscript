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

    // The chrome is display:block from the moment it attaches to a video, but
    // stays at opacity 0 until showUI() runs. Without `mvc-shown` gating
    // pointer-events, those invisible controls swallow taps on the video.
    it('arms pointer-events only while the chrome is actually shown', () => {
        expect(uiManager.wrap?.classList.contains('mvc-shown')).toBe(false);

        store.lastRealUserEvent = Date.now();
        uiManager.showUI(true);
        expect(uiManager.wrap?.classList.contains('mvc-shown')).toBe(true);

        video.play?.();
        Object.defineProperty(video, 'paused', { value: false, configurable: true });
        uiManager.hideUI();
        expect(uiManager.wrap?.classList.contains('mvc-shown')).toBe(false);
    });

    // As a child of `wrap` the shield inherited display:none when the chrome
    // faded, so the lock stopped blocking gestures ~3.9s after being switched
    // on while the button still read "locked".
    it('keeps the lock shield outside wrap so the fade cannot disable it', () => {
        expect(uiManager.lockShield).not.toBeNull();
        expect(uiManager.wrap?.contains(uiManager.lockShield!)).toBe(false);

        uiManager.toggleScreenLock();
        expect(uiManager.lockShield?.style.display).toBe('block');

        Object.defineProperty(video, 'paused', { value: false, configurable: true });
        uiManager.hideUI();
        vi.useFakeTimers();
        vi.advanceTimersByTime(1000);
        vi.useRealTimers();

        // wrap may now be display:none; the shield must not have followed it
        expect(uiManager.lockShield?.style.display).toBe('block');
        expect(uiManager.lockShield?.isConnected).toBe(true);
    });

    it('should update volume bar and brightness bar displays', () => {
        uiManager.showVolumeBar(0.8);
        expect(uiManager.volumeBar?.classList.contains('visible')).toBe(true);
        expect(uiManager.volumeValue?.textContent).toBe('80%');

        uiManager.showBrightness(0.5);
        expect(uiManager.brightnessBar?.classList.contains('visible')).toBe(true);
        expect(uiManager.brightnessValue?.textContent).toBe('50%');
    });

    it('should position top bar aligned with active video when inline', () => {
        expect(uiManager.topBar).not.toBeNull();
        uiManager.updateTopBarPosition();

        // video rect is { top: 100, left: 100, right: 500, bottom: 400, width: 400, height: 300 }
        // top = 100 + 16 = 116px, left = 100 + 16 = 116px, width = 400 - 32 = 368px
        expect(uiManager.topBar?.style.top).toBe('116px');
        expect(uiManager.topBar?.style.left).toBe('116px');
        expect(uiManager.topBar?.style.width).toBe('368px');
    });

    it('should toggle mvc-modal-open class when settings sheet visibility toggles', () => {
        uiManager.ensureSettingsSheet();
        const settingsEl = uiManager.settingsSheet!.dom;
        const container = uiManager.wrap?.parentElement;

        expect(container?.classList.contains('mvc-modal-open')).toBe(false);

        uiManager.toggleMenu(settingsEl, uiManager.settingsBtn!);
        expect(container?.classList.contains('mvc-modal-open')).toBe(true);

        uiManager.toggleMenu(settingsEl, uiManager.settingsBtn!);
        expect(container?.classList.contains('mvc-modal-open')).toBe(false);
    });

    it('renders SVG icons for volume and brightness levels rather than raw emojis', () => {
        uiManager.showVolumeBar(0);
        expect(uiManager.volumeIcon?.querySelector('svg')).not.toBeNull();
        expect(uiManager.volumeIcon?.textContent).toBe('');

        uiManager.showVolumeBar(0.8);
        expect(uiManager.volumeIcon?.querySelector('svg')).not.toBeNull();

        uiManager.showBrightness(0.2);
        expect(uiManager.brightnessIcon?.querySelector('svg')).not.toBeNull();
        expect(uiManager.brightnessIcon?.textContent).toBe('');

        uiManager.showBrightness(0.9);
        expect(uiManager.brightnessIcon?.querySelector('svg')).not.toBeNull();
    });

    it('renders SVG icons for double-tap chevrons', () => {
        const leftChevrons = document.querySelectorAll('.mvc-doubletap-panel.left .mvc-doubletap-chevron');
        expect(leftChevrons.length).toBe(3);
        for (const chev of leftChevrons) {
            expect(chev.querySelector('svg')).not.toBeNull();
            expect(chev.textContent).toBe('');
        }
    });
});
