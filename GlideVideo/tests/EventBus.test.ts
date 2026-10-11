import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/events/EventBus';

describe('EventBus', () => {
    it('should register listeners and emit events with payloads', () => {
        const bus = new EventBus();
        const spy = vi.fn();

        bus.on('ui:toast', spy);
        bus.emit('ui:toast', { message: 'hello test' });

        expect(spy).toHaveBeenCalledWith({ message: 'hello test' });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for the same event', () => {
        const bus = new EventBus();
        const spy1 = vi.fn();
        const spy2 = vi.fn();

        bus.on('video:transform-need-update', spy1);
        bus.on('video:transform-need-update', spy2);

        bus.emit('video:transform-need-update', undefined);

        expect(spy1).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe correctly when calling the returned function', () => {
        const bus = new EventBus();
        const spy = vi.fn();

        const unsubscribe = bus.on('video:rate-changed', spy);
        bus.emit('video:rate-changed', { rate: 2.0 });
        expect(spy).toHaveBeenCalledTimes(1);

        unsubscribe();
        bus.emit('video:rate-changed', { rate: 3.0 });
        expect(spy).toHaveBeenCalledTimes(1); // Still 1, not called after unsubscribe
    });

    it('should not throw or fail when emitting an event with no listeners', () => {
        const bus = new EventBus();
        expect(() => {
            bus.emit('ui:toast', { message: 'no listeners' });
        }).not.toThrow();
    });

    it('should isolate errors in subscribers so subsequent subscribers still run', () => {
        const bus = new EventBus();
        const spy1 = vi.fn();
        const throwingSpy = vi.fn().mockImplementation(() => {
            throw new Error('Subscriber error');
        });
        const spy2 = vi.fn();

        bus.on('ui:toast', spy1);
        bus.on('ui:toast', throwingSpy);
        bus.on('ui:toast', spy2);

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
            bus.emit('ui:toast', { message: 'isolated error test' });
        }).not.toThrow();

        expect(spy1).toHaveBeenCalledTimes(1);
        expect(throwingSpy).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

