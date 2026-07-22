// src/gestures/DoubleTapDetector.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';
import { MVC_CONFIG } from '../config';
import { shouldBlockGestures, vibrate, isPointOnUI } from '../utils';

export class DoubleTapDetector {
    private lastTapTime = 0;
    private lastTapX = 0;
    private lastTapY = 0;
    private lastTapSide: 'left' | 'right' | null = null;
    private tapCount = 0;

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore
    ) {}

    public init() {
        this.attachListeners();
    }



    private attachListeners() {
        window.addEventListener('pointerdown', e => {
            if (!this.store.settings.gesturesEnabled) return;
            if (this.store.isScreenLocked) return;
            if (shouldBlockGestures()) return;
            if (e.pointerType !== 'touch') return;
            if (!this.store.activeVideo?.isConnected) return;
            const gc = this.store.gestureCoordinator;
            if (gc.isActive('swipe_seek') || gc.isActive('pinch') || gc.isActive('volume_control') || gc.isActive('brightness_control')) return;

            // Check if touch is on UI
            if (isPointOnUI(e.target)) return;

            // Check if touch is on active video with top/bottom safety margin (12% of height, max 48px)
            const video = this.store.activeVideo;
            const r = video.getBoundingClientRect();
            const margin = Math.min(r.height * 0.12, 48);
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top + margin || e.clientY > r.bottom - margin) return;

            const now = Date.now();
            const x = e.clientX;
            const y = e.clientY;
            const isLeft = x < r.left + r.width / 2;
            const side: 'left' | 'right' = isLeft ? 'left' : 'right';

            const timeDiff = now - this.lastTapTime;
            const distDiff = Math.hypot(x - this.lastTapX, y - this.lastTapY);

            const isDoubleTap = 
                timeDiff < MVC_CONFIG.DOUBLE_TAP_DELAY && 
                distDiff < MVC_CONFIG.DOUBLE_TAP_MAX_DISTANCE && 
                side === this.lastTapSide;

            if (isDoubleTap) {
                // Intercept event to block site double-tap handlers (e.g. fullscreen)
                e.preventDefault();
                e.stopPropagation();

                if (this.store.gestureCoordinator.acquire('double_tap')) {
                    clearTimeout(this.store.timers.doubleTapClear);
                    this.store.timers.doubleTapClear = setTimeout(() => {
                        this.store.gestureCoordinator.release('double_tap');
                    }, MVC_CONFIG.DOUBLE_TAP_LOCK_RELEASE_MS);
                }

                // Cancel pending single-click
                if (this.store.timers.videoClick) {
                    clearTimeout(this.store.timers.videoClick);
                    this.store.timers.videoClick = undefined;
                }

                // Increment tap count / accumulation
                this.tapCount++;
                const skipSeconds = this.store.settings.skipSeconds || 10;
                const accumulated = (this.tapCount - 1) * skipSeconds;

                // Trigger skip
                const dir = side === 'left' ? -1 : 1;
                this.eventBus.emit('video:skip-requested', { dir, customSeconds: skipSeconds });

                // Visual & haptic feedback
                vibrate(15);
                this.eventBus.emit('video:double-tap-skipped', { side, x, y, seconds: accumulated });

                // Reset accumulation timer
                clearTimeout(this.store.timers.doubleTapAccumulation);
                this.store.timers.doubleTapAccumulation = setTimeout(() => {
                    this.tapCount = 0;
                }, MVC_CONFIG.DOUBLE_TAP_RESET_DELAY);
            } else {
                // It's the first tap
                this.tapCount = 1;
                clearTimeout(this.store.timers.doubleTapAccumulation);
            }

            this.lastTapTime = now;
            this.lastTapX = x;
            this.lastTapY = y;
            this.lastTapSide = side;
        }, { capture: true, signal: this.store.abortController.signal });

        // Intercept pointerup and click events for the second tap
        window.addEventListener('pointerup', e => {
            if (this.store.isDoubleTapping && e.pointerType === 'touch') {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true, signal: this.store.abortController.signal });

        window.addEventListener('click', e => {
            if (this.store.isDoubleTapping && e.isTrusted) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true, signal: this.store.abortController.signal });

        window.addEventListener('dblclick', e => {
            if (this.store.isDoubleTapping) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true, signal: this.store.abortController.signal });
    }
}
