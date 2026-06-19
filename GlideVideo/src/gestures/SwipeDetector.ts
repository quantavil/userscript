// src/gestures/SwipeDetector.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';
import { MVC_CONFIG } from '../config';
import { shouldBlockGestures, clamp, clampTime, vibrate, isPointInRect, isPointOnUI, formatDuration, formatDelta } from '../utils';

export class SwipeDetector {
    private isPinching = false;
    private initialDistance = 0;
    private initialZoom = 1;

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore
    ) {}

    public init() {
        this.attachSwipeListeners();
    }

    private attachSwipeListeners() {
        window.addEventListener('touchstart', e => {
            if (!this.store.settings.gesturesEnabled) return;
            if (shouldBlockGestures()) return;

            // Handle multi-touch (Pinch to Zoom & Rotate)
            if (e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];

                if (isPointOnUI(t1.target) || isPointOnUI(t2.target)) return;
                if (!this.store.activeVideo?.isConnected) return;
                if (!isPointInRect(t1.clientX, t1.clientY, this.store.activeVideo) || !isPointInRect(t2.clientX, t2.clientY, this.store.activeVideo)) return;

                // Request to cancel speed boost
                this.eventBus.emit('gesture:cancel-speed-boost', undefined); // triggers booster cancel in PressDetector
                this.eventBus.emit('video:rate-change-requested', { rate: this.store.savedPlaybackRate ?? 1.0, saveToSettings: false });

                this.isPinching = true;
                this.store.isPinching = true;

                this.initialDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                this.initialZoom = this.store.settings.transform.zoom;

                if (e.cancelable) e.preventDefault();
                return;
            }

            if (e.touches.length !== 1) return;

            const touch = e.touches[0];

            if (isPointOnUI(touch.target)) return;
            if (!this.store.activeVideo?.isConnected) return;
            if (!isPointInRect(touch.clientX, touch.clientY, this.store.activeVideo)) return;
            if (this.store.savedPlaybackRate !== undefined) return;

            const video = this.store.activeVideo;
            if (!video) return;

            const startX      = touch.clientX;
            const startY      = touch.clientY;
            const initialTime = video.currentTime;
            const startVolume     = video.muted ? 0 : video.volume;
            const startBrightness = this.store.brightness;

            // Which horizontal half did the touch start on?
            const vr        = video.getBoundingClientRect();
            const startSide = startX < vr.left + vr.width / 2 ? 'left' : 'right';

            type GestureMode = 'undecided' | 'seek' | 'volume' | 'brightness';
            let mode: GestureMode = 'undecided';
            let newTime = initialTime;

            let onTouchMove: (ev: TouchEvent) => void;
            let onTouchEnd: () => void;

            onTouchMove = (ev: TouchEvent) => {
                if (this.store.savedPlaybackRate !== undefined || this.isPinching) return;
                const touchMove = ev.touches[0];
                const dx = touchMove.clientX - startX;
                const dy = touchMove.clientY - startY;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);

                // ── Commit to a gesture once threshold is crossed ──────────
                if (mode === 'undecided') {
                    const overThreshold = absDx > MVC_CONFIG.GESTURE_MOVE_THRESHOLD || absDy > MVC_CONFIG.GESTURE_MOVE_THRESHOLD;
                    if (!overThreshold) return;

                    if (absDx > absDy * 1.5) {
                        // Horizontal dominant → seek
                        mode = 'seek';
                        this.store.isSwipeSeeking = true;
                    } else if (absDy > absDx * 1.5 && startSide === 'right') {
                        // Vertical dominant on RIGHT side → volume
                        mode = 'volume';
                        this.store.isVolumeControlling = true;
                    } else if (absDy > absDx * 1.5 && startSide === 'left') {
                        // Vertical dominant on LEFT side → brightness
                        mode = 'brightness';
                        this.store.isBrightnessControlling = true;
                    } else {
                        // Ambiguous — cancel
                        onTouchEnd();
                        return;
                    }

                    // Emit event to cancel any active long press speed boost since we committed to a swipe gesture
                    this.eventBus.emit('gesture:cancel-speed-boost', undefined);
                }

                if (ev.cancelable) {
                    ev.preventDefault();
                }

                // ── Seek ───────────────────────────────────────────────────
                if (mode === 'seek') {
                    const timeChange = dx * MVC_CONFIG.GESTURE_SEEK_SENSITIVITY;
                    newTime = clampTime(initialTime + timeChange, video.duration || 0);
                    this.eventBus.emit('ui:gesture-overlay', {
                        text: formatDuration(newTime),
                        subText: formatDelta(timeChange)
                    });
                }

                // ── Volume ─────────────────────────────────────────────────
                if (mode === 'volume') {
                    // Swipe UP (dy negative) → increase; DOWN → decrease
                    const sensitivity = 1 / Math.max(vr.height * 0.8, 1); // full-height swipe = 0→100%
                    const newVolume   = clamp(startVolume - dy * sensitivity, 0, 1);
                    video.muted       = newVolume === 0;
                    video.volume      = newVolume === 0 ? video.volume : newVolume;
                    this.eventBus.emit('ui:volume-changed', { volume: newVolume });
                }

                // ── Brightness ─────────────────────────────────────────────
                if (mode === 'brightness') {
                    // Swipe UP (dy negative) → increase; DOWN → decrease
                    const sensitivity = 1 / Math.max(vr.height * 0.8, 1); // full-height swipe = 0→100%
                    const newBrightness = clamp(startBrightness - dy * sensitivity, 0.1, 1.0);
                    this.store.brightness = newBrightness;
                    this.eventBus.emit('ui:brightness-changed', { brightness: newBrightness });
                }
            };

            onTouchEnd = () => {
                if (mode === 'seek') {
                    video.currentTime = newTime;
                    this.store.isSwipeSeeking = false;
                    this.eventBus.emit('ui:gesture-overlay', null);
                }
                if (mode === 'volume') {
                    this.store.isVolumeControlling = false;
                    // keep bar visible a moment then auto-hide (UIManager handles this)
                }
                if (mode === 'brightness') {
                    this.store.isBrightnessControlling = false;
                }
                mode = 'undecided';
                if (e.target) {
                    e.target.removeEventListener('touchmove', onTouchMove as any);
                    e.target.removeEventListener('touchend',  onTouchEnd);
                    e.target.removeEventListener('touchcancel', onTouchEnd);
                }
            };

            if (e.target) {
                e.target.addEventListener('touchmove', onTouchMove as any, { passive: false });
                e.target.addEventListener('touchend',   onTouchEnd);
                e.target.addEventListener('touchcancel', onTouchEnd);
            }
        }, { passive: true, capture: true, signal: this.store.abortController.signal });

        window.addEventListener('touchmove', e => {
            if (!this.store.settings.gesturesEnabled) return;

            if (this.isPinching && e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];

                const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                const scaleFactor = this.initialDistance > 0 ? currentDistance / this.initialDistance : 1;
                const newZoom = clamp(this.initialZoom * scaleFactor, 0.5, 3.0);

                this.store.settings.transform.zoom = newZoom;
                this.eventBus.emit('video:transform-need-update', undefined);
                
                this.eventBus.emit('ui:gesture-overlay', {
                    text: `${Math.round(newZoom * 100)}%`
                });

                if (e.cancelable) e.preventDefault();
            }
        }, { passive: false, signal: this.store.abortController.signal });

        const onTouchEndOrCancel = () => {
            if (this.isPinching) {
                this.isPinching = false;
                this.store.isPinching = false;
                this.eventBus.emit('ui:gesture-overlay', null);

                // Snap zoom to closest snap point if within threshold
                const snapPoints = MVC_CONFIG.PINCH_SNAP_POINTS;
                const threshold = MVC_CONFIG.PINCH_SNAP_THRESHOLD;
                let currentZoom = this.store.settings.transform.zoom;
                let snapped = false;

                for (const p of snapPoints) {
                    if (Math.abs(currentZoom - p) <= threshold) {
                        currentZoom = p;
                        snapped = true;
                        break;
                    }
                }

                if (snapped) {
                    this.store.settings.transform.zoom = currentZoom;
                    this.eventBus.emit('video:transform-need-update', undefined);
                    vibrate(15); // Haptic feedback on snap
                }

                this.store.saveSetting('transform', this.store.settings.transform);
            }
        };

        window.addEventListener('touchend', onTouchEndOrCancel, { passive: true, signal: this.store.abortController.signal });
        window.addEventListener('touchcancel', onTouchEndOrCancel, { passive: true, signal: this.store.abortController.signal });
    }
}
