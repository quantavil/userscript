import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoTransform } from '../src/video/VideoTransform';
import { EventBus } from '../src/events/EventBus';
import { StateStore } from '../src/core/StateStore';
import { UIManager } from '../src/ui/UIManager';

describe('VideoTransform', () => {
    let eventBus: EventBus;
    let store: StateStore;
    let ui: UIManager;
    let transform: VideoTransform;
    let mockVideo: any;
    let mockWindowListeners: Record<string, any>;
    let mockDocumentListeners: Record<string, any>;

    beforeEach(() => {
        vi.useFakeTimers();

        mockWindowListeners = {};
        mockDocumentListeners = {};

        // Mock requestAnimationFrame
        (global as any).requestAnimationFrame = vi.fn((cb: any) => cb());

        // Mock window and document
        (global as any).getComputedStyle = vi.fn().mockReturnValue({
            position: 'static',
            overflowY: 'visible',
            overflowX: 'visible'
        });

        (global as any).window = {
            addEventListener: vi.fn((event: string, callback: any) => {
                mockWindowListeners[event] = callback;
            }),
            removeEventListener: vi.fn(),
            scrollX: 10,
            scrollY: 20,
            innerWidth: 1024,
            innerHeight: 768,
            getComputedStyle: (global as any).getComputedStyle
        };


        (global as any).document = {
            addEventListener: vi.fn((event: string, callback: any) => {
                mockDocumentListeners[event] = callback;
            }),
            removeEventListener: vi.fn(),
            body: {
                isConnected: true,
                appendChild: vi.fn(),
                removeChild: vi.fn(),
                getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 1024, height: 768 }),
                style: { position: 'static' }
            },
            fullscreenElement: null,
            webkitFullscreenElement: null
        };

        // ResizeObserver & MutationObserver mock
        (global as any).ResizeObserver = class {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };
        (global as any).MutationObserver = class {
            observe = vi.fn();
            disconnect = vi.fn();
        };

        eventBus = new EventBus();
        store = new StateStore(eventBus);
        store.settings = {
            skipSeconds: 10,
            defaultSpeed: 1.0,
            lastRate: 1.0,
            transform: { ratio: 'fit', zoom: 1, rotation: 0 },
            gesturesEnabled: true
        };

        // Mock UI element structures
        const mockElement = () => ({
            style: { left: '', top: '', right: '', bottom: '', transform: '', objectFit: '', visibility: '', display: '', position: '' },
            dataset: {},
            offsetWidth: 100,
            offsetHeight: 50,
            offsetParent: null,
            isConnected: true,
            getBoundingClientRect: vi.fn().mockReturnValue({ left: 100, top: 200, width: 100, height: 50, right: 200, bottom: 250 }),
            appendChild: vi.fn(),
            remove: vi.fn()
        } as any);

        ui = {
            wrap: mockElement(),
            backdrop: mockElement(),
            toast: mockElement(),
            gestureOverlay: mockElement(),
            volumeBar: mockElement(),
            brightnessOverlay: mockElement(),
            brightnessBar: mockElement(),
            doubleTapContainer: mockElement(),
            settingsSheet: { dom: mockElement() }
        } as any;

        // Mock video element
        mockVideo = {
            isConnected: true,
            playbackRate: 1.0,
            currentTime: 10,
            duration: 100,
            paused: false,
            ended: false,
            style: { transform: '', objectFit: '' },
            dataset: {},
            clientWidth: 640,
            clientHeight: 360,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getBoundingClientRect: vi.fn().mockReturnValue({
                left: 100,
                top: 100,
                width: 640,
                height: 360,
                right: 740,
                bottom: 460
            }),
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn()
        };

        store.activeVideo = mockVideo;
        transform = new VideoTransform(eventBus, store, ui);
    });

    afterEach(() => {
        vi.useRealTimers();
        transform.destroy();
        delete (global as any).window;
        delete (global as any).document;
        delete (global as any).getComputedStyle;
        delete (global as any).ResizeObserver;
        delete (global as any).MutationObserver;
        delete (global as any).requestAnimationFrame;
    });

    it('should initialize and subscribe to EventBus events', () => {
        const setRateSpy = vi.spyOn(transform, '_setRate');
        const transformSpy = vi.spyOn(transform, 'applyVideoTransform');
        const skipSpy = vi.spyOn(transform, 'doSkip');
        const playPauseSpy = vi.spyOn(transform, 'handlePlayPauseClick');

        eventBus.emit('video:transform-need-update', undefined);
        expect(transformSpy).toHaveBeenCalled();

        eventBus.emit('video:play-pause-requested', undefined);
        expect(playPauseSpy).toHaveBeenCalled();

        eventBus.emit('video:skip-requested', { dir: 1 });
        expect(skipSpy).toHaveBeenCalledWith(1, 10);

        eventBus.emit('video:rate-change-requested', { rate: 1.5 });
        expect(setRateSpy).toHaveBeenCalledWith(1.5, true);
    });

    it('should destroy observers and listeners correctly', () => {
        const resizeDisconnectSpy = vi.spyOn(transform.videoResizeObserver!, 'disconnect');
        const mutationDisconnectSpy = vi.spyOn(transform.videoMutationObserver!, 'disconnect');

        transform.destroy();

        expect(resizeDisconnectSpy).toHaveBeenCalled();
        expect(mutationDisconnectSpy).toHaveBeenCalled();
    });

    it('should change play rate via _setRate', () => {
        transform._setRate(1.75, true);
        expect(mockVideo.playbackRate).toBe(1.75);
        expect(mockVideo.__mvc_last_rate).toBe(1.75);
        expect(store.settings.lastRate).toBe(1.75);
    });

    it('should do skip forward and backward with clamp boundary check', () => {
        transform.doSkip(1, 15);
        expect(mockVideo.currentTime).toBe(25);

        transform.doSkip(-1, 50);
        expect(mockVideo.currentTime).toBe(0); // Clamped at 0

        transform.doSkip(1, 200);
        expect(mockVideo.currentTime).toBe(100); // Clamped at duration
    });

    it('should handle play/pause request', () => {
        mockVideo.paused = true;
        transform.handlePlayPauseClick();
        expect(mockVideo.play).toHaveBeenCalled();

        mockVideo.paused = false;
        transform.handlePlayPauseClick();
        expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should apply and restore styles on applyVideoTransform', () => {
        // Non-default transform
        store.settings.transform = { ratio: 'fill', zoom: 1.5, rotation: 90 };
        transform.applyVideoTransform();

        expect(mockVideo.style.objectFit).toBe('cover');
        expect(mockVideo.style.transform).toContain('scale(1.5)');
        expect(mockVideo.style.transform).toContain('rotate(90deg)');
        expect(mockVideo.dataset.mvcOriginalObjectFit).toBe('');
        expect(mockVideo.dataset.mvcOriginalTransform).toBe('');

        // Return to default
        store.settings.transform = { ratio: 'fit', zoom: 1, rotation: 0 };
        transform.applyVideoTransform();

        expect(mockVideo.style.objectFit).toBe('');
        expect(mockVideo.style.transform).toBe('');
        expect(mockVideo.dataset.mvcOriginalObjectFit).toBeUndefined();
        expect(mockVideo.dataset.mvcOriginalTransform).toBeUndefined();
    });

    it('should correctly locate scrollable parent elements', () => {
        const divMock1 = {
            parentElement: null,
            scrollHeight: 500,
            clientHeight: 200,
            scrollWidth: 500,
            clientWidth: 200
        } as any;
        const divMock2 = {
            parentElement: divMock1,
            scrollHeight: 100,
            clientHeight: 100,
            scrollWidth: 100,
            clientWidth: 100
        } as any;
        const testEl = {
            parentElement: divMock2
        } as any;

        // Mock getComputedStyle for the parents
        (global as any).window.getComputedStyle = vi.fn().mockImplementation((el: any) => {
            if (el === divMock1) {
                return { overflowY: 'scroll', overflowX: 'visible' };
            }
            return { overflowY: 'visible', overflowX: 'visible' };
        });

        const findScrollableParentsPrivate = (transform as any).findScrollableParents.bind(transform);
        const parents = findScrollableParentsPrivate(testEl);

        expect(parents).toContain(divMock1);
        expect(parents).not.toContain(divMock2);
        expect(parents).toContain(window);
    });

    it('should handle event callbacks from HTMLVideoElement', () => {
        const rateSpy = vi.fn();
        eventBus.on('video:rate-changed', rateSpy);

        transform.handleEvent({ type: 'ratechange' } as any);
        expect(rateSpy).toHaveBeenCalledWith({ rate: 1.0 });

        const playSpy = vi.fn();
        eventBus.on('video:play-state-changed', playSpy);

        transform.handleEvent({ type: 'play' } as any);
        expect(playSpy).toHaveBeenCalledWith({ playing: true });

        transform.handleEvent({ type: 'pause' } as any);
        expect(playSpy).toHaveBeenCalledWith({ playing: false });
    });

    it('should handle fullscreen changes', () => {
        // Mock getFullscreenContainer to return body
        (global as any).document.fullscreenElement = null;

        transform.onFullScreenChange();

        expect(document.body.appendChild).toHaveBeenCalledWith(ui.backdrop);
        expect(document.body.appendChild).toHaveBeenCalledWith(ui.toast);
    });
});
