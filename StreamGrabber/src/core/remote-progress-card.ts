import { MessageBus } from './message-bus';
import { shortId } from './shared';
import type { ProgressCardController } from '../types';

export class RemoteProgressCard implements ProgressCardController {
    private id: string;
    private bus: MessageBus;
    private onStopFn?: () => 'paused' | 'resumed';
    private onCancelFn?: () => void;

    constructor(title: string, src: string) {
        this.id = shortId();
        this.bus = MessageBus.get();

        // Start
        this.bus.sendToTop('SG_PROGRESS_START', {
            id: this.id,
            title,
            src,
        });

        // Listen for control messages
        this.handleControl = this.handleControl.bind(this);
        this.bus.on('SG_CMD_CONTROL', this.handleControl);
    }

    private handleControl(payload: any): void {
        if (payload.id !== this.id) return;

        const action = payload.action;
        if (action === 'stop' && this.onStopFn) {
            this.onStopFn();
        } else if (action === 'cancel' && this.onCancelFn) {
            this.onCancelFn();
        }
    }

    public update(percent: number, text?: string): void {
        this.bus.sendToTop('SG_PROGRESS_UPDATE', {
            id: this.id,
            p: percent,
            txt: text || '',
        });
    }

    public done(ok: boolean = true, msg: string = ''): void {
        this.bus.sendToTop('SG_PROGRESS_DONE', {
            id: this.id,
            ok,
            msg,
        });
        this.cleanup();
    }

    public remove(): void {
        this.cleanup();
    }

    public setOnStop(fn: () => 'paused' | 'resumed'): void {
        this.onStopFn = fn;
    }

    public setOnCancel(fn: () => void): void {
        this.onCancelFn = fn;
    }

    private cleanup(): void {
        this.bus.off('SG_CMD_CONTROL', this.handleControl);
    }
}
