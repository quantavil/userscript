import { CFG } from '../config';
import type { SGMessage, MessageType } from '../types';

type MessageHandler = (payload: any, source: Window) => void;

export class MessageBus {
    private static instance: MessageBus;
    private handlers = new Map<MessageType, Set<MessageHandler>>();
    private initialized = false;

    private constructor() {
        this.handleMessage = this.handleMessage.bind(this);
    }

    public static get(): MessageBus {
        if (!MessageBus.instance) {
            MessageBus.instance = new MessageBus();
        }
        return MessageBus.instance;
    }

    public init(): void {
        if (this.initialized) return;
        this.initialized = true;
        window.addEventListener('message', this.handleMessage);
        console.log('[SG] MessageBus initialized');
    }

    public on(type: MessageType, handler: MessageHandler): void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler);
    }

    public off(type: MessageType, handler: MessageHandler): void {
        const set = this.handlers.get(type);
        if (set) {
            set.delete(handler);
            if (set.size === 0) {
                this.handlers.delete(type);
            }
        }
    }

    public send(type: MessageType, payload: Record<string, unknown> = {}, target: Window = window.top!): void {
        try {
            const msg: SGMessage = { type, payload };
            target.postMessage(msg, '*');
        } catch (e) {
            console.error('[SG] Failed to send message:', type, e);
        }
    }

    public sendToTop(type: MessageType, payload: Record<string, unknown> = {}): void {
        if (window.top) {
            this.send(type, payload, window.top);
        }
    }

    private handleMessage(ev: MessageEvent): void {
        const data = ev.data as SGMessage;
        if (!data || typeof data !== 'object' || !data.type) return;
        if (ev.source === window) return; // Ignore self

        const handlers = this.handlers.get(data.type);
        if (handlers) {
            handlers.forEach((fn) => {
                try {
                    fn(data.payload || {}, ev.source as Window);
                } catch (e) {
                    console.error('[SG] Error in message handler:', e);
                }
            });
        }
    }
}
