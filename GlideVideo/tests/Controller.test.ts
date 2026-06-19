import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Controller } from '../src/core/Controller';

// Mock injectStyles
vi.mock('../src/ui/styles/css', () => ({
    injectStyles: vi.fn()
}));

describe('Controller', () => {
    let originalPlay: any;

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

        if (typeof (global as any).HTMLVideoElement === 'undefined') {
            class MockHTMLVideoElement {
                play() {}
            }
            MockHTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
            (global as any).HTMLVideoElement = MockHTMLVideoElement;
        }

        originalPlay = HTMLVideoElement.prototype.play;

        // Mock observers
        (global as any).IntersectionObserver = class {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };

        (global as any).MutationObserver = class {
            observe = vi.fn();
            disconnect = vi.fn();
        };

        (global as any).ResizeObserver = class {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };

        // Mock document and window
        const bodyMock = {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: [],
            appendChild: vi.fn(),
            append: vi.fn(),
            isConnected: true
        };

        (global as any).document = {
            nodeType: 9,
            readyState: 'complete',
            childNodes: [bodyMock],
            body: bodyMock,
            documentElement: {
                nodeType: 1,
                tagName: 'HTML',
                childNodes: []
            },
            createElement: vi.fn().mockImplementation((tag: string) => ({
                tagName: tag.toUpperCase(),
                style: {},
                classList: {
                    add: vi.fn(),
                    remove: vi.fn()
                },
                appendChild: vi.fn(),
                append: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                setAttribute: vi.fn(),
                remove: vi.fn()
            })),
            createElementNS: vi.fn().mockImplementation((ns: string, tag: string) => ({
                tagName: tag.toUpperCase(),
                style: {},
                classList: {
                    add: vi.fn(),
                    remove: vi.fn()
                },
                appendChild: vi.fn(),
                append: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                setAttribute: vi.fn(),
                remove: vi.fn()
            })),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        (global as any).window = {
            innerWidth: 1024,
            innerHeight: 768,
            __MVC_INSTANCE: null,
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

        (global as any).getComputedStyle = vi.fn().mockReturnValue({
            visibility: 'visible',
            position: 'static'
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        const win = (global as any).window;
        if (win && win.__MVC_INSTANCE) {
            win.__MVC_INSTANCE.destroy();
        }
        if (typeof (global as any).HTMLVideoElement !== 'undefined' && originalPlay) {
            HTMLVideoElement.prototype.play = originalPlay;
        }
        delete (global as any).window;
        delete (global as any).document;
        delete (global as any).localStorage;
        delete (global as any).Element;
        delete (global as any).HTMLVideoElement;
        delete (global as any).IntersectionObserver;
        delete (global as any).MutationObserver;
        delete (global as any).ResizeObserver;
        delete (global as any).getComputedStyle;
    });

    it('should initialize and set window.__MVC_INSTANCE', () => {
        const controller = new Controller();
        expect(window.__MVC_INSTANCE).toBe(controller);
        expect(controller.eventBus).toBeDefined();
        expect(controller.store).toBeDefined();
        expect(controller.ui).toBeDefined();
    });

    it('should initialize subsystems in init()', () => {
        const controller = new Controller();
        
        // Mock sub-detectors and managers init methods
        const uiInitSpy = vi.spyOn(controller.ui, 'init');
        const swipeInitSpy = vi.spyOn(controller.swipeDetector, 'init');
        const pressInitSpy = vi.spyOn(controller.pressDetector, 'init');
        const doubleTapInitSpy = vi.spyOn(controller.doubleTapDetector, 'init');
        const trackerInitSpy = vi.spyOn(controller.videoTracker, 'init');

        controller.init();

        expect(controller.store.isInitialized).toBe(true);
        expect(uiInitSpy).toHaveBeenCalled();
        expect(swipeInitSpy).toHaveBeenCalled();
        expect(pressInitSpy).toHaveBeenCalled();
        expect(doubleTapInitSpy).toHaveBeenCalled();
        expect(trackerInitSpy).toHaveBeenCalled();
    });

    it('should clean up elements and observers on destroy()', () => {
        const controller = new Controller();
        controller.init();

        const abortSpy = vi.spyOn(controller.store.abortController, 'abort');
        const trackerDestroySpy = vi.spyOn(controller.videoTracker, 'destroy');
        const transformDestroySpy = vi.spyOn(controller.videoTransform, 'destroy');
        const preloadDestroySpy = vi.spyOn(controller.preloadEngine, 'destroy');

        // Mock DOM element wraps
        controller.ui.wrap = { remove: vi.fn() } as any;
        controller.ui.backdrop = { remove: vi.fn() } as any;
        controller.ui.toast = { remove: vi.fn() } as any;

        controller.destroy();

        expect(abortSpy).toHaveBeenCalled();
        expect(trackerDestroySpy).toHaveBeenCalled();
        expect(transformDestroySpy).toHaveBeenCalled();
        expect(preloadDestroySpy).toHaveBeenCalled();
        expect(controller.ui.wrap.remove).toHaveBeenCalled();
        expect(controller.ui.backdrop.remove).toHaveBeenCalled();
        expect(controller.ui.toast.remove).toHaveBeenCalled();
    });
});
