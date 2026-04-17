// src/gestures.js – Touch gesture support for MobileVideoController
'use strict';

const MVC_Gestures = {
    // ── Time formatting helpers ────────────────────────────────────────────
    _formatGestureTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const abs = Math.floor(seconds);
        const h = Math.floor(abs / 3600);
        const m = Math.floor((abs % 3600) / 60);
        const s = abs % 60;
        const pad = v => (v < 10 ? '0' : '') + v;
        return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    },

    _formatGestureDelta(seconds) {
        const sign = seconds < 0 ? '-' : '+';
        const abs = Math.floor(Math.abs(seconds));
        const h = Math.floor(abs / 3600);
        const m = Math.floor((abs % 3600) / 60);
        const s = abs % 60;
        const pad = v => (v < 10 ? '0' : '') + v;
        return h > 0 ? `${sign}${pad(h)}:${pad(m)}:${pad(s)}` : `${sign}${pad(m)}:${pad(s)}`;
    },

    // ── Gesture overlay helpers ────────────────────────────────────────────
    _showGestureOverlay(html) {
        if (!this.ui.gestureOverlay) return;
        this.ui.gestureOverlay.innerHTML = html;
        this.ui.gestureOverlay.style.display = 'block';
    },

    _hideGestureOverlay() {
        if (!this.ui.gestureOverlay) return;
        this.ui.gestureOverlay.style.display = 'none';
        this.ui.gestureOverlay.innerHTML = '';
    },

    _isTouchOnVideo(touch) {
        if (!this.activeVideo?.isConnected) return false;
        const r = this.activeVideo.getBoundingClientRect();
        return (
            touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top  && touch.clientY <= r.bottom
        );
    },

    _isTouchOnUI(touch) {
        if (!this.ui.wrap) return false;
        const r = this.ui.wrap.getBoundingClientRect();
        return (
            touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top  && touch.clientY <= r.bottom
        );
    },

    // ── Swipe-to-seek (touchstart on video → touchmove → touchend) ────────
    attachGestureListeners() {
        window.addEventListener('touchstart', e => {
            if (!this.settings.gesturesEnabled) return;
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];

            // Ignore touches on the MVC UI itself
            if (this._isTouchOnUI(touch)) return;
            // Only act on touches landing on the active video
            if (!this._isTouchOnVideo(touch)) return;

            const video = this.activeVideo;
            const startX = touch.clientX;
            const initialTime = video.currentTime;
            let seeking = false;

            let newTime = initialTime;

            const onTouchMove = ev => {
                const dx = ev.touches[0].clientX - startX;
                if (!seeking) {
                    if (Math.abs(dx) > MVC_CONFIG.GESTURE_MOVE_THRESHOLD) seeking = true;
                    else return;
                }
                const timeChange = dx * MVC_CONFIG.GESTURE_SEEK_SENSITIVITY;
                newTime = this.clamp(initialTime + timeChange, 0, video.duration || 0);
                this._showGestureOverlay(
                    `${this._formatGestureTime(newTime)}<br><span style="font-size:14px;opacity:0.8">${this._formatGestureDelta(timeChange)}</span>`
                );
            };

            const onTouchEnd = () => {
                if (seeking) {
                    video.currentTime = newTime;
                }
                seeking = false;
                this._hideGestureOverlay();
                e.target.removeEventListener('touchmove', onTouchMove);
                e.target.removeEventListener('touchend', onTouchEnd);
                e.target.removeEventListener('touchcancel', onTouchEnd);
            };

            e.target.addEventListener('touchmove', onTouchMove, { passive: true });
            e.target.addEventListener('touchend', onTouchEnd);
            e.target.addEventListener('touchcancel', onTouchEnd);
        }, { passive: true, capture: true });
    },

    // ── Long-press-to-speed (pointerdown on video → timer → pointerup) ────
    attachLongPressGestureListeners() {
        let longPressTimer = null;
        let longPressFired = false;
        let savedRate = 1;
        let startX = 0;
        let startY = 0;

        window.addEventListener('pointerdown', e => {
            if (!this.settings.gesturesEnabled) return;
            if (e.pointerType !== 'touch') return;
            if (!this.activeVideo?.isConnected) return;

            // Ignore presses on the MVC UI
            if (this.ui.wrap?.contains(e.target)) return;

            const r = this.activeVideo.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;

            longPressFired = false;
            startX = e.clientX;
            startY = e.clientY;
            longPressTimer = setTimeout(() => {
                longPressFired = true;
                this.inLongPressGesture = true;
                savedRate = this.activeVideo.playbackRate;
                this.activeVideo.playbackRate = MVC_CONFIG.GESTURE_SPEED_BOOST;
                this._showGestureOverlay(`${MVC_CONFIG.GESTURE_SPEED_BOOST}× Speed`);
                this.vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
            }, MVC_CONFIG.GESTURE_LONG_PRESS_DELAY);
        }, { capture: true });

        // Cancel long-press if user starts moving (swipe)
        window.addEventListener('pointermove', e => {
            if (e.pointerType !== 'touch' || !longPressTimer || longPressFired) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > MVC_CONFIG.GESTURE_MOVE_THRESHOLD || Math.abs(dy) > MVC_CONFIG.GESTURE_MOVE_THRESHOLD) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }, { capture: true, passive: true });

        window.addEventListener('pointerup', e => {
            if (e.pointerType !== 'touch') return;
            clearTimeout(longPressTimer);
            longPressTimer = null;
            if (longPressFired && this.activeVideo) {
                this.activeVideo.playbackRate = savedRate;
                this.inLongPressGesture = false;
                this._hideGestureOverlay();
            }
            longPressFired = false;
        }, { capture: true });

        window.addEventListener('pointercancel', e => {
            if (e.pointerType !== 'touch') return;
            clearTimeout(longPressTimer);
            longPressTimer = null;
            if (longPressFired && this.activeVideo) {
                this.activeVideo.playbackRate = savedRate;
                this.inLongPressGesture = false;
            }
            this._hideGestureOverlay();
            longPressFired = false;
        }, { capture: true });
    }
};
