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
            if (this.store.isScreenLocked) return;
            if (shouldBlockGestures() && !this.store.settings.scrollCompatibility) return;

            // Handle multi-touch (Pinch to Zoom)
            if (e.touches.length === 2) {
                const t1 = e.touches[0];
                const t2 = e.touches[1];

                if (isPointOnUI(t1.target) || isPointOnUI(t2.target)) return;
                if (!this.store.activeVideo?.isConnected) return;
                if (!isPointInRect(t1.clientX, t1.clientY, this.store.activeVideo) || !isPointInRect(t2.clientX, t2.clientY, this.store.activeVideo)) return;

                // Request to cancel speed boost
                this.eventBus.emit('gesture:cancel-speed-boost', undefined); // triggers booster cancel in PressDetector
                this.eventBus.emit('video:rate-change-requested', { rate: this.store.savedPlaybackRate ?? 1.0, saveToSettings: false });

                // Release any undecided single-touch gesture before acquiring pinch
                this.store.gestureCoordinator.release('swipe_seek');
                this.store.gestureCoordinator.release('volume_control');
                this.store.gestureCoordinator.release('brightness_control');

                if (this.store.gestureCoordinator.acquire('pinch')) {
                    this.isPinching = true;
                    this.initialDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                    this.initialZoom = this.store.settings.transform.zoom;
                }

                if (e.cancelable) e.preventDefault();
                return;
            }

            if (e.touches.length !== 1) return;

            const touch = e.touches[0];

            if (touch.clientX < MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING || touch.clientX > window.innerWidth - MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING) {
                return;
            }

            if (isPointOnUI(touch.target)) return;
            if (!this.store.activeVideo?.isConnected) return;
            if (!isPointInRect(touch.clientX, touch.clientY, this.store.activeVideo)) return;
            if (this.store.gestureCoordinator.hasActiveGesture()) return;

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

                    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
                    const isPortrait = window.matchMedia?.('(orientation: portrait)')?.matches ?? false;
                    const needsScrollComp = this.store.settings.scrollCompatibility && isPortrait && !isFullscreen;

                    if (absDx > absDy * 1.5) {
                        // Horizontal dominant → seek
                        if (!this.store.gestureCoordinator.acquire('swipe_seek')) { onTouchEnd(); return; }
                        mode = 'seek';
                    } else if (absDy > absDx * 1.5 && startSide === 'right') {
                        if (needsScrollComp) { onTouchEnd(); return; }
                        // Vertical dominant on RIGHT side → volume
                        if (!this.store.gestureCoordinator.acquire('volume_control')) { onTouchEnd(); return; }
                        mode = 'volume';
                    } else if (absDy > absDx * 1.5 && startSide === 'left') {
                        if (needsScrollComp) { onTouchEnd(); return; }
                        // Vertical dominant on LEFT side → brightness
                        if (!this.store.gestureCoordinator.acquire('brightness_control')) { onTouchEnd(); return; }
                        mode = 'brightness';
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
                    let timeChange = dx * MVC_CONFIG.GESTURE_SEEK_SENSITIVITY;
                    if (Math.abs(timeChange) < MVC_CONFIG.GESTURE_SEEK_DEADZONE || isNaN(video.duration) || video.duration === 0) {
                        timeChange = 0;
                    } else {
                        timeChange = timeChange - Math.sign(timeChange) * MVC_CONFIG.GESTURE_SEEK_DEADZONE;
                    }
                    if (timeChange === 0) {
                        this.eventBus.emit('ui:gesture-overlay', null);
                    } else {
                        newTime = clampTime(initialTime + timeChange, video.duration);
                        this.eventBus.emit('ui:gesture-overlay', {
                            text: formatDuration(newTime),
                            subText: formatDelta(timeChange)
                        });
                    }
                }

                // ── Volume ─────────────────────────────────────────────────
                if (mode === 'volume') {
                    // Swipe UP (dy negative) → increase; DOWN → decrease
                    const sensitivity = 1 / Math.max(vr.height * MVC_CONFIG.GESTURE_VERTICAL_SENSITIVITY, 1);
                    const newVolume = clamp(startVolume - dy * sensitivity, 0, 1.0);
                    video.muted = newVolume === 0;
                    video.volume = newVolume;
                    this.eventBus.emit('ui:volume-changed', { volume: newVolume });
                }

                // ── Brightness ─────────────────────────────────────────────
                if (mode === 'brightness') {
                    // Swipe UP (dy negative) → increase; DOWN → decrease
                    const sensitivity = 1 / Math.max(vr.height * MVC_CONFIG.GESTURE_VERTICAL_SENSITIVITY, 1);
                    const newBrightness = clamp(startBrightness - dy * sensitivity, 0.1, 1.0);
                    this.store.brightness = newBrightness;
                    this.eventBus.emit('ui:brightness-changed', { brightness: newBrightness });
                }
            };

            onTouchEnd = () => {
                if (mode === 'seek') {
                    if (newTime !== initialTime) {
                        video.currentTime = newTime;
                    }
                    this.store.gestureCoordinator.release('swipe_seek');
                    this.eventBus.emit('ui:gesture-overlay', null);
                }
                if (mode === 'volume') {
                    this.store.gestureCoordinator.release('volume_control');
                    // keep bar visible a moment then auto-hide (UIManager handles this)
                }
                if (mode === 'brightness') {
                    this.store.gestureCoordinator.release('brightness_control');
                }
                mode = 'undecided';
                window.removeEventListener('touchmove', onTouchMove as any);
                window.removeEventListener('touchend',  onTouchEnd);
                window.removeEventListener('touchcancel', onTouchEnd);
            };

            window.addEventListener('touchmove', onTouchMove as any, { passive: false });
            window.addEventListener('touchend',   onTouchEnd);
            window.addEventListener('touchcancel', onTouchEnd);
        }, { passive: false, capture: true, signal: this.store.abortController.signal });

        window.addEventListener('touchmove', e => {
            if (!this.store.settings.gesturesEnabled) return;
            if (this.store.isScreenLocked) return;

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
                this.store.gestureCoordinator.release('pinch');
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

            }
        };

        window.addEventListener('touchend', onTouchEndOrCancel, { passive: true, signal: this.store.abortController.signal });
        window.addEventListener('touchcancel', onTouchEndOrCancel, { passive: true, signal: this.store.abortController.signal });
    }


}
