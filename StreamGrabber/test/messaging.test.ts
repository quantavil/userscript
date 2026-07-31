// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageBus } from '../src/core/message-bus';
import * as Messaging from '../src/messaging';
import { MediaItem } from '../src/types';

describe('MessageBus Reference Architecture', () => {
    let bus: MessageBus;

    beforeEach(() => {
        // Reset singleton if possible or just get the instance
        bus = MessageBus.get();
        // Clear handlers for isolation (hacky but needed for singleton testing)
        (bus as any).handlers.clear();
        vi.restoreAllMocks();
    });

    it('should be a singleton', () => {
        const bus1 = MessageBus.get();
        const bus2 = MessageBus.get();
        expect(bus1).toBe(bus2);
    });

    it('should register and unregister handlers', () => {
        const handler = vi.fn();
        bus.on('SG_DETECT', handler);

        // Simulate receiving message
        const msgEvent = new MessageEvent('message', {
            data: { type: 'SG_DETECT', payload: { foo: 'bar' } },
            source: window
        });

        // Directly invoke handleMessage (private)
        (bus as any).handleMessage(msgEvent);
        // It should NOT fire for window (self) to prevent loops, unless we are mocking the source.
        // Let's mock a different source
        const otherWindow = {} as Window;
        const msgEvent2 = new MessageEvent('message', {
            data: { type: 'SG_DETECT', payload: { foo: 'bar' }, magic: 'SG_MSG_v1' },
            source: otherWindow
        });

        (bus as any).handleMessage(msgEvent2);
        expect(handler).toHaveBeenCalledWith({ foo: 'bar' }, otherWindow);

        // Off
        bus.off('SG_DETECT', handler);
        (bus as any).handleMessage(msgEvent2);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should send messages via postMessage', () => {
        const spy = vi.spyOn(window, 'postMessage');
        bus.send('SG_CMD_DOWNLOAD', { url: 'http://test' });

        expect(spy).toHaveBeenCalledWith(
            { type: 'SG_CMD_DOWNLOAD', payload: { url: 'http://test' }, magic: 'SG_MSG_v1' },
            '*'
        );
    });

    it('should sendToTop correctly', () => {
        // Mock window.top
        const top = {} as Window;
        top.postMessage = vi.fn();

        // We can't easily reassign safe global window.top in standard jsdom env usually,
        // but let's try to spy on the internal send which uses window.top

        const spy = vi.spyOn(bus, 'send');
        // If window.top refers to window (default in test env often), it works.
        // Or we rely on the fact that sendToTop calls send.

        bus.sendToTop('SG_DETECT', { item: {} });
        // sendToTop calls send, which adds the magic token.
        // However, the spy is on `bus.send`. 
        // When we call sendToTop, it calls this.send(type, payload, window.top).
        // It does NOT pass the magic token as an argument to send()! 
        // Logic: send(type, payload, target) { ... const msg = { ..., magic } ... }
        // So the SPY on `send` will be called with (type, payload, target).
        // The magic token is added INSIDE send().
        // So this assertion should arguably remain unchanged if we are spying on `bus.send`.
        // WAIT. The test spies on `bus.send`. 
        // `bus.sendToTop` calls `this.send(type, payload, window.top)`.
        // So `spy` is called with arguments ('SG_DETECT', { item: {} }, window.top).
        // Magic is INTERNAL to send.
        // So this test should actually PASS as is?
        // Let's re-read the failure log. It failed on `should send messages via postMessage`.
        // That test spies on `window.postMessage`.
        // `should sendToTop correctly` spies on `bus.send`.
        // So `should sendToTop correctly` should be fine.
        expect(spy).toHaveBeenCalledWith('SG_DETECT', { item: {} }, window.top);
    });
});

describe('Messaging Utilities', () => {
    let sendSpy: any;

    beforeEach(() => {
        const bus = MessageBus.get();
        sendSpy = vi.spyOn(bus, 'sendToTop');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sendDetection should serialize item and send SG_DETECT', () => {
        const item: Partial<MediaItem> = {
            url: 'http://video.mp4',
            kind: 'video',
            label: '720p',
            // Non-serializable
            _enrichPromise: Promise.resolve(true) as any // Simulate non-transferable
        };

        Messaging.sendDetection(item as MediaItem);

        expect(sendSpy).toHaveBeenCalledWith('SG_DETECT', {
            item: expect.objectContaining({
                url: 'http://video.mp4',
                kind: 'video',
                label: '720p'
            })
        });

        // Ensure non-serializable keys are gone? 
        // serialzeMediaItem test is covered separately usually, but good integration check.
        const payload = sendSpy.mock.calls[0][1];
        expect(payload.item._enrichPromise).toBeUndefined();
    });

    it('sendProgressStart should send SG_PROGRESS_START', () => {
        Messaging.sendProgressStart('123', 'Downloading', 'http://src');
        expect(sendSpy).toHaveBeenCalledWith('SG_PROGRESS_START', {
            id: '123',
            title: 'Downloading',
            src: 'http://src'
        });
    });

    it('should handle picker requests', () => {
        const resolver = vi.fn();
        Messaging.registerPickerRequest('pick-1', resolver);

        // Resolve it
        Messaging.resolvePickerRequest('pick-1', { url: 'chosen' } as any);
        expect(resolver).toHaveBeenCalledWith({ url: 'chosen' });

        // Should be one-time
        resolver.mockClear();
        Messaging.resolvePickerRequest('pick-1', null);
        expect(resolver).not.toHaveBeenCalled();
    });
});
