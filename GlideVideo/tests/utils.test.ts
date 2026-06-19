// src/utils.test.ts
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import {
    clamp,
    clampTime,
    isPlaying,
    debounce,
    findAllVideos,
    isPointInRect,
    isPointOnUI,
    formatDuration,
    formatDelta,
    getFullscreenContainer,
    vibrate,
    shouldBlockGestures
} from '../src/utils';

describe('GlideVideo Utilities', () => {
    beforeAll(() => {
        if (typeof global.Node === 'undefined') {
            class MockNode {}
            (MockNode as any).ELEMENT_NODE = 1;
            (MockNode as any).DOCUMENT_NODE = 9;
            (global as any).Node = MockNode;
        }
        if (typeof global.document === 'undefined') {
            (global as any).document = {
                querySelector: () => null,
                body: { tagName: 'BODY' }
            };
        }
    });

    describe('clamp', () => {
        it('should clamp value to range', () => {
            expect(clamp(5, 1, 10)).toBe(5);
            expect(clamp(0, 1, 10)).toBe(1);
            expect(clamp(15, 1, 10)).toBe(10);
        });
    });

    describe('clampTime', () => {
        it('should clamp time correctly based on duration', () => {
            expect(clampTime(50, 100)).toBe(50);
            expect(clampTime(-10, 100)).toBe(0);
            expect(clampTime(120, 100)).toBe(100);
        });
    });

    describe('isPlaying', () => {
        it('should return false for null video', () => {
            expect(isPlaying(null)).toBe(false);
        });

        it('should return false if paused', () => {
            const mockVideo = { paused: true, ended: false, readyState: 4 } as any;
            expect(isPlaying(mockVideo)).toBe(false);
        });

        it('should return false if ended', () => {
            const mockVideo = { paused: false, ended: true, readyState: 4 } as any;
            expect(isPlaying(mockVideo)).toBe(false);
        });

        it('should return false if readyState is too low', () => {
            const mockVideo = { paused: false, ended: false, readyState: 1 } as any;
            expect(isPlaying(mockVideo)).toBe(false);
        });

        it('should return true if playing and readyState >= 3', () => {
            const mockVideo = { paused: false, ended: false, readyState: 3 } as any;
            expect(isPlaying(mockVideo)).toBe(true);
        });
    });

    describe('debounce', () => {
        it('should debounce calls', () => {
            vi.useFakeTimers();
            const func = vi.fn();
            const debounced = debounce(func, 100);

            debounced();
            debounced();
            debounced();

            expect(func).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(func).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });

    describe('findAllVideos', () => {
        it('should find videos in a standard document node', () => {
            const videoMock = { nodeType: 1, tagName: 'VIDEO', childNodes: [] };
            const divMock = { nodeType: 1, tagName: 'DIV', childNodes: [videoMock] };
            const documentMock = {
                nodeType: 9,
                childNodes: [divMock]
            };

            const result = findAllVideos(documentMock as any);
            expect(result).toContain(videoMock);
            expect(result.length).toBe(1);
        });

        it('should find videos in a shadow root node', () => {
            const videoMock = { nodeType: 1, tagName: 'VIDEO', childNodes: [] };
            const shadowRootMock = {
                nodeType: 1, // element/shadow root representation for mock
                childNodes: [videoMock]
            };
            const customElementMock = {
                nodeType: 1,
                tagName: 'MY-PLAYER',
                shadowRoot: shadowRootMock,
                childNodes: []
            };
            const documentMock = {
                nodeType: 9,
                childNodes: [customElementMock]
            };

            const result = findAllVideos(documentMock as any);
            expect(result).toContain(videoMock);
            expect(result.length).toBe(1);
        });
    });

    describe('isPointInRect', () => {
        it('should return true if coordinates are inside element bounding rect', () => {
            const mockEl = {
                getBoundingClientRect: () => ({
                    left: 10,
                    top: 20,
                    right: 110,
                    bottom: 120,
                    width: 100,
                    height: 100
                })
            } as any;
            expect(isPointInRect(50, 50, mockEl)).toBe(true);
            expect(isPointInRect(10, 20, mockEl)).toBe(true);
            expect(isPointInRect(110, 120, mockEl)).toBe(true);
        });

        it('should return false if coordinates are outside element bounding rect', () => {
            const mockEl = {
                getBoundingClientRect: () => ({
                    left: 10,
                    top: 20,
                    right: 110,
                    bottom: 120,
                    width: 100,
                    height: 100
                })
            } as any;
            expect(isPointInRect(5, 50, mockEl)).toBe(false);
            expect(isPointInRect(50, 15, mockEl)).toBe(false);
            expect(isPointInRect(115, 50, mockEl)).toBe(false);
            expect(isPointInRect(50, 125, mockEl)).toBe(false);
        });
    });

    describe('isPointOnUI', () => {
        it('should return false if target is null', () => {
            expect(isPointOnUI(null)).toBe(false);
        });

        it('should return true if target is inside a UI component', () => {
            const mockTarget = {
                closest: vi.fn().mockReturnValue(true)
            } as any;
            expect(isPointOnUI(mockTarget)).toBe(true);
            expect(mockTarget.closest).toHaveBeenCalledWith('.mvc-ui-wrap, .mvc-backdrop, .mvc-settings-sheet');
        });

        it('should return false if target is outside UI components', () => {
            const mockTarget = {
                closest: vi.fn().mockReturnValue(false)
            } as any;
            expect(isPointOnUI(mockTarget)).toBe(false);
        });
        
        it('should return false if target does not have closest method', () => {
            const mockTarget = {} as any;
            expect(isPointOnUI(mockTarget)).toBe(false);
        });
    });

    describe('formatDuration', () => {
        it('should return 00:00 for NaN input', () => {
            expect(formatDuration(NaN)).toBe('00:00');
        });

        it('should format seconds only', () => {
            expect(formatDuration(45)).toBe('00:45');
        });

        it('should format minutes and seconds', () => {
            expect(formatDuration(125)).toBe('02:05');
        });

        it('should format hours, minutes and seconds', () => {
            expect(formatDuration(3665)).toBe('01:01:05');
        });

        it('should handle negative values by converting to absolute value', () => {
            expect(formatDuration(-125)).toBe('02:05');
        });
    });

    describe('formatDelta', () => {
        it('should return +0s for NaN input', () => {
            expect(formatDelta(NaN)).toBe('+0s');
        });

        it('should format seconds correctly', () => {
            expect(formatDelta(5)).toBe('+5s');
            expect(formatDelta(-15)).toBe('-15s');
        });

        it('should format minutes correctly without seconds', () => {
            expect(formatDelta(120)).toBe('+2m');
            expect(formatDelta(-60)).toBe('-1m');
        });

        it('should format minutes and seconds', () => {
            expect(formatDelta(125)).toBe('+2m 5s');
            expect(formatDelta(-65)).toBe('-1m 5s');
        });
    });

    describe('getFullscreenContainer', () => {
        it('should default to body if no fullscreen element is active', () => {
            const documentMock = {
                fullscreenElement: null,
                webkitFullscreenElement: null,
                body: { tagName: 'BODY' }
            };
            const originalDocument = global.document;
            (global as any).document = documentMock;
            expect(getFullscreenContainer()).toBe(documentMock.body);
            (global as any).document = originalDocument;
        });

        it('should use parentElement if fullscreen element is a video', () => {
            const videoMock = {
                tagName: 'VIDEO',
                parentElement: { tagName: 'DIV' }
            };
            const documentMock = {
                fullscreenElement: videoMock,
                body: { tagName: 'BODY' }
            };
            const originalDocument = global.document;
            (global as any).document = documentMock;
            expect(getFullscreenContainer()).toBe(videoMock.parentElement);
            (global as any).document = originalDocument;
        });

        it('should use webkitFullscreenElement if fullscreenElement is missing', () => {
            const elMock = {
                tagName: 'DIV'
            };
            const documentMock = {
                fullscreenElement: null,
                webkitFullscreenElement: elMock,
                body: { tagName: 'BODY' }
            };
            const originalDocument = global.document;
            (global as any).document = documentMock;
            expect(getFullscreenContainer()).toBe(elMock);
            (global as any).document = originalDocument;
        });
    });

    describe('vibrate', () => {
        let originalNavigator: any;

        beforeAll(() => {
            originalNavigator = (global as any).navigator;
        });

        afterEach(() => {
            Object.defineProperty(global, 'navigator', {
                value: originalNavigator,
                writable: true,
                configurable: true
            });
        });

        it('should call navigator.vibrate if available', () => {
            const vibrateSpy = vi.fn();
            Object.defineProperty(global, 'navigator', {
                value: { vibrate: vibrateSpy },
                writable: true,
                configurable: true
            });
            vibrate(20);
            expect(vibrateSpy).toHaveBeenCalledWith(20);
        });

        it('should default to 10ms', () => {
            const vibrateSpy = vi.fn();
            Object.defineProperty(global, 'navigator', {
                value: { vibrate: vibrateSpy },
                writable: true,
                configurable: true
            });
            vibrate();
            expect(vibrateSpy).toHaveBeenCalledWith(10);
        });

        it('should ignore if navigator.vibrate is missing', () => {
            Object.defineProperty(global, 'navigator', {
                value: {},
                writable: true,
                configurable: true
            });
            expect(() => vibrate()).not.toThrow();
        });
    });

    describe('shouldBlockGestures', () => {
        let originalDocument: any;
        let originalWindow: any;

        beforeAll(() => {
            originalDocument = global.document;
            originalWindow = (global as any).window;
        });

        afterEach(() => {
            (global as any).document = originalDocument;
            (global as any).window = originalWindow;
        });

        it('should return true in portrait when not fullscreen', () => {
            (global as any).document = {
                fullscreenElement: null,
                webkitFullscreenElement: null
            };
            const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
            (global as any).window = {
                matchMedia: matchMediaMock
            };
            expect(shouldBlockGestures()).toBe(true);
            expect(matchMediaMock).toHaveBeenCalledWith('(orientation: portrait)');
        });

        it('should return false in landscape when not fullscreen', () => {
            (global as any).document = {
                fullscreenElement: null,
                webkitFullscreenElement: null
            };
            const matchMediaMock = vi.fn().mockReturnValue({ matches: false });
            (global as any).window = {
                matchMedia: matchMediaMock
            };
            expect(shouldBlockGestures()).toBe(false);
            expect(matchMediaMock).toHaveBeenCalledWith('(orientation: portrait)');
        });

        it('should return false in portrait when fullscreen via standard API', () => {
            (global as any).document = {
                fullscreenElement: {} as any,
                webkitFullscreenElement: null
            };
            const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
            (global as any).window = {
                matchMedia: matchMediaMock
            };
            expect(shouldBlockGestures()).toBe(false);
        });

        it('should return false in portrait when fullscreen via webkit API', () => {
            (global as any).document = {
                fullscreenElement: null,
                webkitFullscreenElement: {} as any
            };
            const matchMediaMock = vi.fn().mockReturnValue({ matches: true });
            (global as any).window = {
                matchMedia: matchMediaMock
            };
            expect(shouldBlockGestures()).toBe(false);
        });

        it('should return false if matchMedia is not supported', () => {
            (global as any).document = {
                fullscreenElement: null,
                webkitFullscreenElement: null
            };
            (global as any).window = {};
            expect(shouldBlockGestures()).toBe(false);
        });
    });
});

