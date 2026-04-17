// src/utils.js – Pure helper methods for MobileVideoController
'use strict';

const MVC_Utils = {
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },

    clampTime(t) { return this.clamp(t, 0, this.activeVideo?.duration ?? Infinity); },

    isPlaying(v) { return v && !v.paused && !v.ended && v.readyState > 2; },

    vibrate(ms = 10) {
        if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {}
    },

    showToast(message) {
        if (!this.ui.toast) return;
        this.ui.toast.textContent = message;
        this.ui.toast.style.opacity = '1';
        clearTimeout(this.timers.toast);
        this.timers.toast = setTimeout(() => { this.ui.toast.style.opacity = '0'; }, 1500);
    },

    showSpeedToast(message, updatePosition = true) {
        if (!this.ui.speedToast) return;
        if (updatePosition) {
            if (this.activeVideo?.isConnected) {
                const rr = this.activeVideo.getBoundingClientRect();
                this.ui.speedToast.style.top  = `${rr.top  + rr.height / 2}px`;
                this.ui.speedToast.style.left = `${rr.left + rr.width  / 2}px`;
            } else {
                this.ui.speedToast.style.top  = '50%';
                this.ui.speedToast.style.left = '50%';
            }
        }
        this.ui.speedToast.textContent    = message;
        this.ui.speedToast.style.opacity  = '1';
    },

    hideSpeedToast() {
        clearTimeout(this.timers.speedToast);
        this.timers.speedToast = setTimeout(() => {
            if (this.ui.speedToast) this.ui.speedToast.style.opacity = '0';
        }, MVC_CONFIG.SPEED_TOAST_FADE_DELAY);
    },

    showAndMeasure(el) {
        const prev = { display: el.style.display, visibility: el.style.visibility };
        Object.assign(el.style, { display: 'flex', visibility: 'hidden' });
        const r = el.getBoundingClientRect();
        Object.assign(el.style, prev);
        return { w: r.width, h: r.height };
    }
};
