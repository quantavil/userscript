// src/controls.js – Gesture/event management for MobileVideoController
'use strict';

const MVC_Controls = {
    // ── Viewport + global event listeners ──────────────────────────────────
    attachEventListeners() {
        window.addEventListener('resize', () => this.onViewportChange(), { passive: true });
        window.addEventListener('scroll', () => {
            this.isScrolling = true;
            clearTimeout(this.timers.scrollEnd);
            this.timers.scrollEnd = setTimeout(() => { this.isScrolling = false; }, MVC_CONFIG.SCROLL_END_TIMEOUT);
            this.onViewportChange();
        }, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.onViewportChange(), { passive: true });
            window.visualViewport.addEventListener('scroll', () => this.onViewportChange(), { passive: true });
        }

        ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
            document.addEventListener(ev, () => {
                this.onFullScreenChange();
                setTimeout(() => this.guardianCheck(), 500);
            }, { passive: true })
        );

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible')
                setTimeout(() => this.guardianCheck(), MVC_CONFIG.VISIBILITY_GUARDIAN_DELAY);
        }, { passive: true });

        ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
            window.addEventListener(ev, e => {
                if (!e.isTrusted) return;
                this.lastRealUserEvent = Date.now();
                // Only show UI for keyboard events or touches on the MVC panel itself
                if (e.type === 'keydown' || this.ui.wrap?.contains(e.target)) this.showUI(true);
            }, { passive: true })
        );

        this.ui.backdrop.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation(); this.hideAllMenus();
        });

        document.body.addEventListener('play', e => {
            if (e.target.tagName === 'VIDEO' && e.target !== this.activeVideo)
                setTimeout(() => this.debouncedEvaluate(), 50);
        }, true);

        this.attachSpeedButtonListeners();
        this.attachPanelDragListeners();

        this.ui.rewindBtn.onclick  = () => { this.showUI(true); if (!this.wasDragging) this.doSkip(-1); this.wasDragging = false; };
        this.ui.forwardBtn.onclick = () => { this.showUI(true); if (!this.wasDragging) this.doSkip(1);  this.wasDragging = false; };

        this._attachSettingsButtonListeners();
        this.setupLongPress(this.ui.rewindBtn,  -1);
        this.setupLongPress(this.ui.forwardBtn,  1);
    },

    // ── Settings button: long-press → close-mode ────────────────────────────
    _attachSettingsButtonListeners() {
        let isSettingsCloseMode       = false;
        let settingsJustTurnedToCross = false;
        let settingsLongPressTimer    = null;

        const resetSettingsButton = () => {
            if (!isSettingsCloseMode) return;
            isSettingsCloseMode       = false;
            settingsJustTurnedToCross = false;
            this.ui.settingsBtn.innerHTML = '';
            this.ui.settingsBtn.appendChild(this.getIcon('settings'));
            this.ui.settingsBtn.style.color      = '';
            this.ui.settingsBtn.style.background = '';
        };

        document.addEventListener('pointerdown', e => {
            if (this.ui.settingsBtn && !this.ui.settingsBtn.contains(e.target) && isSettingsCloseMode)
                resetSettingsButton();
        }, { passive: true });

        this.ui.settingsBtn.onpointerdown = e => {
            clearTimeout(settingsLongPressTimer);
            if (isSettingsCloseMode) return;
            settingsLongPressTimer = setTimeout(() => {
                if (this.dragData.isDragging || !this.ui.settingsBtn) return;
                isSettingsCloseMode       = true;
                settingsJustTurnedToCross = true;
                this.vibrate(15);
                this.ui.settingsBtn.innerHTML = '';
                this.ui.settingsBtn.appendChild(this.getIcon('close'));
                this.ui.settingsBtn.style.color      = '#ff3b30';
                this.ui.settingsBtn.style.background = 'rgba(255, 59, 48, 0.2)';
            }, MVC_CONFIG.LONG_PRESS_DURATION_MS);
        };

        const clearSettingsTimer           = () => clearTimeout(settingsLongPressTimer);
        this.ui.settingsBtn.onpointerup     = clearSettingsTimer;
        this.ui.settingsBtn.onpointerleave  = clearSettingsTimer;
        this.ui.settingsBtn.onpointercancel = clearSettingsTimer;

        this.ui.settingsBtn.onclick = e => {
            if (this.wasDragging) { e.stopPropagation(); this.wasDragging = false; return; }
            if (settingsJustTurnedToCross) { settingsJustTurnedToCross = false; e.stopPropagation(); return; }
            if (isSettingsCloseMode) {
                e.stopPropagation();
                this.ui.wrap.style.display = 'none';
                resetSettingsButton();
                return;
            }
            this.ensureSettingsMenu();
            this.toggleMenu(this.ui.settingsMenu, this.ui.settingsBtn);
        };
    },

    // ── Speed button: drag-to-slide + tap-for-menu ──────────────────────────
    attachSpeedButtonListeners() {
        let longPressActioned = false;
        this.ui.speedBtn.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

        this.ui.speedBtn.addEventListener('pointerdown', e => {
            e.stopPropagation(); e.preventDefault();
            let toastPos = { top: '50%', left: '50%' };
            if (this.activeVideo?.isConnected) {
                const vr = this.activeVideo.getBoundingClientRect();
                toastPos = { top: `${vr.top + vr.height / 2}px`, left: `${vr.left + vr.width / 2}px` };
            }
            this.sliderData   = { startY: e.clientY, currentY: e.clientY, startRate: this.activeVideo ? this.activeVideo.playbackRate : 1.0, isSliding: false, toastPosition: toastPos };
            longPressActioned = false;
            try { this.ui.speedBtn.setPointerCapture(e.pointerId); } catch (err) {}

            this.timers.longPress = setTimeout(() => {
                if (this.activeVideo) {
                    this.activeVideo.playbackRate = 1.0;
                    this.showToast('Speed reset to 1.00x');
                    this.vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
                }
                longPressActioned        = true;
                this.sliderData.isSliding = false;
            }, MVC_CONFIG.LONG_PRESS_DURATION_MS);
        });

        this.ui.speedBtn.addEventListener('pointermove', e => {
            if (this.sliderData.startY == null || !this.activeVideo || longPressActioned) return;
            e.stopPropagation(); e.preventDefault();
            if (!this.sliderData.isSliding && Math.abs(e.clientY - this.sliderData.startY) > MVC_CONFIG.DRAG_THRESHOLD) {
                clearTimeout(this.timers.longPress);
                this.sliderData.isSliding = true;
                this.isSpeedSliding       = true;
                this.showUI(true);
                this.ui.speedBtn.style.transform = 'scale(1.1)';
                Object.assign(this.ui.speedToast.style, this.sliderData.toastPosition);
                this.vibrate();
            }
            if (this.sliderData.isSliding) {
                this.sliderData.currentY = e.clientY;
                if (!this.isTickingSlider) {
                    requestAnimationFrame(() => this.updateSpeedSlider());
                    this.isTickingSlider = true;
                }
            }
        });

        this.ui.speedBtn.addEventListener('pointerup', e => {
            e.stopPropagation();
            clearTimeout(this.timers.longPress);
            if (this.sliderData.isSliding && this.activeVideo) {
                this.saveSetting('lastRate', this.activeVideo.playbackRate.toString());
                this.updateSpeedDisplay();
            } else if (!longPressActioned) {
                if (this.activeVideo && (this.activeVideo.paused || this.activeVideo.ended)) {
                    this.handlePlayPauseClick();
                } else {
                    this.ensureSpeedMenu();
                    this.toggleMenu(this.ui.speedMenu, this.ui.speedBtn);
                }
            }
            this.isSpeedSliding  = false;
            this.isTickingSlider = false;
            this.sliderData      = { isSliding: false };
            this.ui.speedBtn.style.transform = 'scale(1)';
            this.ui.speedBtn.classList.remove('snapped');
            if (this.ui.speedToast) this.ui.speedToast.classList.remove('snapped');
            this.hideSpeedToast();
            clearTimeout(this.timers.hide);
            this.timers.hide = setTimeout(() => this.hideUI(), MVC_CONFIG.UI_FADE_TIMEOUT);
        });
    },

    updateSpeedSlider() {
        if (!this.sliderData.isSliding || !this.activeVideo) { this.isTickingSlider = false; return; }
        this.showUI(true);
        const dy     = this.sliderData.startY - this.sliderData.currentY;
        const delta  = Math.sign(dy) * Math.pow(Math.abs(dy), MVC_CONFIG.SLIDER_POWER) * MVC_CONFIG.SLIDER_SENSITIVITY;
        let newRate  = this.clamp(this.sliderData.startRate + delta, 0.1, 16);
        let isSnapped = false;
        for (const point of MVC_CONFIG.DEFAULT_SNAP_POINTS) {
            if (Math.abs(newRate - point) < MVC_CONFIG.SNAP_THRESHOLD) { newRate = point; isSnapped = true; break; }
        }
        this.activeVideo.playbackRate = newRate;
        this.showSpeedToast(`${newRate.toFixed(2)}x`, false);
        this.ui.speedBtn.classList.toggle('snapped', isSnapped);
        if (this.ui.speedToast) this.ui.speedToast.classList.toggle('snapped', isSnapped);
        this.isTickingSlider = false;
    },

    // ── Panel drag ──────────────────────────────────────────────────────────
    attachPanelDragListeners() {
        this.ui.panel.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
        this.ui.panel.addEventListener('touchmove',  e => { e.preventDefault(); e.stopImmediatePropagation(); }, { passive: false });

        this.ui.panel.onpointerdown = e => {
            e.stopPropagation();
            this.wasDragging = false;
            this.showUI(true);
            this.ui.wrap.style.transform = '';

            const rect = this.ui.wrap.getBoundingClientRect();
            this.dragData = {
                startPageX: rect.left + window.scrollX,
                startPageY: rect.top  + window.scrollY,
                startX: e.clientX, startY: e.clientY,
                isDragging: false
            };

            const onDragMove = moveEvent => {
                moveEvent.stopPropagation();
                moveEvent.stopImmediatePropagation();
                if (moveEvent.cancelable) moveEvent.preventDefault();
                this.dragData.dx = moveEvent.clientX - this.dragData.startX;
                this.dragData.dy = moveEvent.clientY - this.dragData.startY;
                if (!this.dragData.isDragging && Math.sqrt(this.dragData.dx ** 2 + this.dragData.dy ** 2) > MVC_CONFIG.DRAG_THRESHOLD) {
                    this.dragData.isDragging = true;
                    this.ui.panel.style.cursor = 'grabbing';
                    this.showUI(true);
                    clearTimeout(this.timers.longPressSkip);
                }
                if (this.dragData.isDragging && !this.isTickingDrag) {
                    requestAnimationFrame(() => this.updateDragPosition());
                    this.isTickingDrag = true;
                }
            };

            const onDragEnd = () => {
                window.removeEventListener('pointermove', onDragMove);
                window.removeEventListener('pointerup',   onDragEnd);
                window.removeEventListener('pointercancel', onDragEnd);
                this.ui.panel.style.cursor = 'grab';
                if (this.dragData.isDragging) { this.isManuallyPositioned = true; this.wasDragging = true; }
                this.dragData.isDragging = false;
                clearTimeout(this.timers.hide);
                this.timers.hide = setTimeout(() => this.hideUI(), MVC_CONFIG.UI_FADE_TIMEOUT);
            };

            window.addEventListener('pointermove', onDragMove);
            window.addEventListener('pointerup',   onDragEnd, { once: true });
            window.addEventListener('pointercancel', onDragEnd, { once: true });
        };
    },

    updateDragPosition() {
        if (!this.dragData.isDragging) { this.isTickingDrag = false; return; }
        const parent         = this.ui.wrap.parentElement || document.body;
        const parentRect     = parent.getBoundingClientRect();
        const parentLeftPage = parentRect.left + window.scrollX;
        const parentTopPage  = parentRect.top  + window.scrollY;
        let newPageX = this.dragData.startPageX + this.dragData.dx;
        let newPageY = this.dragData.startPageY + this.dragData.dy;

        const v = this.getViewportPageBounds();
        newPageX = this.clamp(newPageX, v.leftPage + MVC_CONFIG.EDGE, v.leftPage + v.width  - this.ui.wrap.offsetWidth  - MVC_CONFIG.EDGE);
        newPageY = this.clamp(newPageY, v.topPage  + MVC_CONFIG.EDGE, v.topPage  + v.height - this.ui.wrap.offsetHeight - MVC_CONFIG.EDGE);

        this.ui.wrap.style.left = `${Math.round(newPageX - parentLeftPage)}px`;
        this.ui.wrap.style.top  = `${Math.round(newPageY - parentTopPage)}px`;
        this.isTickingDrag = false;
    },

    // ── Long-press skip (rewind / forward buttons) ──────────────────────────
    setupLongPress(btn, dir) {
        const clear = () => clearTimeout(this.timers.longPressSkip);
        btn.addEventListener('pointerdown', () => {
            clear();
            this.timers.longPressSkip = setTimeout(() => {
                this.longPressDirection = dir;
                this.ensureSkipMenu();
                this.placeMenu(this.ui.skipMenu, this.ui.wrap);
                this.ui.skipMenu.style.display = 'flex';
                this.showBackdrop();
            }, MVC_CONFIG.LONG_PRESS_DURATION_MS);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, clear));
    },

    // ── UI visibility ────────────────────────────────────────────────────────
    showUI(force = false) {
        if (!this.ui.wrap || !this.activeVideo) return;
        if (!this.ui.wrap.isConnected) this.attachUIToVideo(this.activeVideo);
        if (!force && (Date.now() - this.lastRealUserEvent >= MVC_CONFIG.INTERACTION_TIMEOUT)) return;

        this.ui.wrap.style.opacity       = '1';
        this.ui.wrap.style.pointerEvents = 'auto';
        clearTimeout(this.timers.hide);

        const isInteracting = this.dragData.isDragging || this.sliderData.isSliding || this.isSpeedSliding;
        if (!isInteracting && !this.activeVideo.paused) {
            this.timers.hide = setTimeout(() => this.hideUI(), MVC_CONFIG.UI_FADE_TIMEOUT);
        }
    },

    hideUI() {
        const isInteracting = this.dragData.isDragging || this.sliderData.isSliding || this.isSpeedSliding;
        if (this.activeVideo?.paused || isInteracting) return;
        const anyMenuOpen = Object.values(this.ui).some(
            el => el?.classList?.contains && el.classList.contains('mvc-menu') && getComputedStyle(el).display !== 'none'
        );
        if (this.ui.wrap && !anyMenuOpen) {
            this.ui.wrap.style.opacity       = String(MVC_CONFIG.UI_FADE_OPACITY);
            this.ui.wrap.style.pointerEvents = 'none';
        }
    }
};
