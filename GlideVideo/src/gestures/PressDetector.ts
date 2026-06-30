// src/gestures/PressDetector.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';
import { MVC_CONFIG } from '../config';
import { shouldBlockGestures, vibrate, isPointOnUI } from '../utils';

export class PressDetector {
    public inLongPressGesture = false;
    public longPressFired = false;

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore
    ) {
        // Listen to requests to cancel the booster
        this.eventBus.on('gesture:cancel-speed-boost', () => {
            this.cancelLongPressSpeedBoost();
        });
    }

    public init() {
        this.attachLongPressListeners();
    }



    public cancelLongPressSpeedBoost() {
        if (this.store.timers.longPressSpeed) {
            clearTimeout(this.store.timers.longPressSpeed);
            this.store.timers.longPressSpeed = undefined;
        }
        if (this.inLongPressGesture && this.store.activeVideo) {
            this.eventBus.emit('video:rate-change-requested', { rate: this.store.savedPlaybackRate ?? 1.0, saveToSettings: false });
            this.inLongPressGesture = false;
            this.eventBus.emit('ui:gesture-overlay', null);
        }
        this.store.savedPlaybackRate = undefined;
        this.longPressFired = false;
    }

    private attachLongPressListeners() {
        let startX = 0;
        let startY = 0;

        window.addEventListener('pointerdown', e => {
            if (!this.store.settings.gesturesEnabled) return;
            if (this.store.isScreenLocked) return;
            if (shouldBlockGestures()) return;
            if (e.pointerType !== 'touch') return;
            if (!this.store.activeVideo?.isConnected) return;
            if (this.store.isSwipeSeeking || this.store.isPinching || this.store.isVolumeControlling) return;

            if (e.clientX < MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING || e.clientX > window.innerWidth - MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING) {
                return;
            }

            if (isPointOnUI(e.target)) return;

            const r = this.store.activeVideo.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;

            this.cancelLongPressSpeedBoost();
            startX = e.clientX;
            startY = e.clientY;
            
            this.store.timers.longPressSpeed = setTimeout(() => {
                if (!this.store.activeVideo) return;
                this.longPressFired = true;
                this.inLongPressGesture = true;
                this.store.savedPlaybackRate = this.store.activeVideo.playbackRate;
                this.eventBus.emit('video:rate-change-requested', { rate: MVC_CONFIG.GESTURE_SPEED_BOOST, saveToSettings: false });
                this.eventBus.emit('ui:gesture-overlay', { text: `${MVC_CONFIG.GESTURE_SPEED_BOOST}x` });
                vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
            }, MVC_CONFIG.GESTURE_LONG_PRESS_DELAY);
        }, { capture: true, signal: this.store.abortController.signal });

        window.addEventListener('pointermove', e => {
            if (e.pointerType !== 'touch' || !this.store.timers.longPressSpeed || this.longPressFired) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > MVC_CONFIG.LONG_PRESS_MOVE_TOLERANCE || Math.abs(dy) > MVC_CONFIG.LONG_PRESS_MOVE_TOLERANCE) {
                this.cancelLongPressSpeedBoost();
            }
        }, { capture: true, passive: true, signal: this.store.abortController.signal });

        window.addEventListener('pointerup', e => {
            if (e.pointerType !== 'touch') return;
            if (this.longPressFired) {
                this.cancelLongPressSpeedBoost();
            } else {
                if (this.store.timers.longPressSpeed) {
                    clearTimeout(this.store.timers.longPressSpeed);
                    this.store.timers.longPressSpeed = undefined;
                }
            }
        }, { capture: true, signal: this.store.abortController.signal });

        window.addEventListener('pointercancel', e => {
            if (e.pointerType !== 'touch') return;
            this.cancelLongPressSpeedBoost();
        }, { capture: true, signal: this.store.abortController.signal });

        window.addEventListener('contextmenu', e => {
            if (this.store.settings.gesturesEnabled && (this.store.timers.longPressSpeed || this.inLongPressGesture)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true, signal: this.store.abortController.signal });
    }
}
