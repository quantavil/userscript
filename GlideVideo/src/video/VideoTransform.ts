// src/video/VideoTransform.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';
import { UIManager } from '../ui/UIManager';
import { MVC_CONFIG } from '../config';
import { clamp, clampTime, getFullscreenContainer } from '../utils';

export class VideoTransform implements EventListenerObject {
    public videoResizeObserver?: ResizeObserver;
    public videoMutationObserver?: MutationObserver;
    public currentScrollParents: (HTMLElement | Window)[] = [];
    private lastVideo: HTMLVideoElement | null = null;

    public boundScrollHandler = this.onViewportChange.bind(this);

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore,
        private readonly ui: UIManager
    ) {
        this.setupSubscriptions();
        this.setupObservers();
        this.attachGlobalListeners();
    }

    public destroy() {
        if (this.videoMutationObserver) this.videoMutationObserver.disconnect();
        if (this.videoResizeObserver) this.videoResizeObserver.disconnect();
        if (this.currentScrollParents) {
            this.currentScrollParents.forEach(p => p.removeEventListener('scroll', this.boundScrollHandler));
        }
        if (this.lastVideo) {
            ['ended', 'play', 'pause', 'ratechange', 'click'].forEach(ev => {
                this.lastVideo?.removeEventListener(ev, this);
            });
        }
    }

    private setupObservers() {
        this.videoResizeObserver   = new ResizeObserver(() => this.throttledPositionOnVideo());
        this.videoMutationObserver = new MutationObserver(() => this.throttledPositionOnVideo());
    }

    private attachGlobalListeners() {
        window.addEventListener('resize', () => this.onViewportChange(), { passive: true, signal: this.store.abortController.signal });
        
        window.addEventListener('scroll', () => {
            this.store.isScrolling = true;
            clearTimeout(this.store.timers.scrollEnd);
            this.store.timers.scrollEnd = setTimeout(() => { this.store.isScrolling = false; }, MVC_CONFIG.SCROLL_END_TIMEOUT) as any;
            this.onViewportChange();
        }, { passive: true, signal: this.store.abortController.signal });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.onViewportChange(), { passive: true, signal: this.store.abortController.signal });
            window.visualViewport.addEventListener('scroll', () => this.onViewportChange(), { passive: true, signal: this.store.abortController.signal });
        }

        ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
            document.addEventListener(ev, () => {
                this.onFullScreenChange();
                setTimeout(() => this.guardianCheck(), 500);
            }, { passive: true, signal: this.store.abortController.signal })
        );

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible')
                setTimeout(() => this.guardianCheck(), MVC_CONFIG.VISIBILITY_GUARDIAN_DELAY);
        }, { passive: true, signal: this.store.abortController.signal });
    }

    private setupSubscriptions() {
        this.eventBus.on('video:transform-need-update', () => this.applyVideoTransform());
        this.eventBus.on('video:play-pause-requested', () => this.handlePlayPauseClick());
        this.eventBus.on('video:skip-requested', ({ dir, customSeconds }) => {
            const seconds = customSeconds !== undefined ? customSeconds : this.store.settings.skipSeconds;
            this.doSkip(dir, seconds);
        });
        this.eventBus.on('video:rate-change-requested', ({ rate, saveToSettings }) => {
            this._setRate(rate, saveToSettings ?? true);
        });
        this.eventBus.on('video:active-changed', (video) => {
            this.onActiveVideoChanged(video);
        });
    }

    private onActiveVideoChanged(v: HTMLVideoElement | null) {
        clearTimeout(this.store.timers.hideGrace);
        
        // Clean up listeners for previous video element
        if (this.lastVideo) {
            ['ended', 'play', 'pause', 'ratechange', 'click'].forEach(ev => {
                this.lastVideo?.removeEventListener(ev, this);
            });
        }
        this.lastVideo = v;

        // Clean up resize and mutation hooks for previous video element
        if (this.videoResizeObserver) this.videoResizeObserver.disconnect();
        if (this.videoMutationObserver) this.videoMutationObserver.disconnect();
        if (this.currentScrollParents) {
            this.currentScrollParents.forEach(p => p.removeEventListener('scroll', this.boundScrollHandler));
            this.currentScrollParents = [];
        }

        if (v) {
            this.attachUIToVideo(v);
            const scrollParents = this.findScrollableParents(v);
            this.currentScrollParents = scrollParents;
            scrollParents.forEach(p => p.addEventListener('scroll', this.boundScrollHandler, { passive: true }));
            
            if (this.videoResizeObserver) this.videoResizeObserver.observe(v);
            if (this.videoMutationObserver) {
                this.videoMutationObserver.observe(v, { attributes: true, attributeFilter: ['style', 'class'] });
                if (v.parentElement) {
                    this.videoMutationObserver.observe(v.parentElement, { attributes: true, attributeFilter: ['style', 'class'] });
                }
            }
            const rememberedRate = this.store.settings.lastRate || this.store.settings.defaultSpeed || 1.0;
            const savedRate = v.__mvc_last_rate !== undefined ? v.__mvc_last_rate : rememberedRate;
            if (v.playbackRate !== savedRate) {
                this._setRate(savedRate, false);
            }
            this.applyVideoTransform();
        } else {
            const gracePeriod = 250;
            this.store.timers.hideGrace = setTimeout(() => {
                if (!this.store.activeVideo && this.ui.wrap) {
                    this.ui.wrap.style.display = 'none';
                }
            }, gracePeriod) as any;
        }
    }

    // ── UI ↔ video attachment ───────────────────────────────────────────────
    public attachUIToVideo(video: HTMLVideoElement) {
        if (!this.ui.wrap) return;
        this.ui.wrap.style.visibility = 'hidden';
        this.ui.wrap.style.position = 'absolute';
        const container = getFullscreenContainer();
        
        if (container && container.isConnected) {
            if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
            container.appendChild(this.ui.wrap);
        } else {
            document.body.appendChild(this.ui.wrap);
        }

        this.ui.wrap.style.display  = 'block';
        if (this.store.isManuallyPositioned && this.store.lastManualPageX !== undefined && this.store.lastManualPageY !== undefined) {
            this._applyPagePosition(this.store.lastManualPageX, this.store.lastManualPageY, true);
        }
        this.throttledPositionOnVideo();

        setTimeout(() => {
            if (this.ui.wrap) this.ui.wrap.style.visibility = 'visible';
            this.eventBus.emit('control:visibility-requested', { visible: true, force: true });
        }, 50);
        
        ['ended', 'play', 'pause', 'ratechange', 'click'].forEach(ev => {
            video.removeEventListener(ev, this);
            video.addEventListener(ev, this);
        });
    }

    // ── Event Listener interface ────────────────────────────────────────────
    public handleEvent(event: Event) {
        switch (event.type) {
            case 'ended':
                this.onVideoEnded();
                break;
            case 'play':
                this.eventBus.emit('video:play-state-changed', { playing: true });
                this.eventBus.emit('control:visibility-requested', { visible: true });
                break;
            case 'pause':
                this.eventBus.emit('video:play-state-changed', { playing: false });
                this.eventBus.emit('control:visibility-requested', { visible: true });
                break;
            case 'ratechange': {
                if (this.store.activeVideo) {
                    const currentRate = this.store.activeVideo.playbackRate;
                    this.eventBus.emit('video:rate-changed', { rate: currentRate });
                    
                    if (!this.store.isSpeedSliding && this.store.savedPlaybackRate === undefined) {
                        this.eventBus.emit('control:visibility-requested', { visible: true });
                    }

                    if (!this.store._isInternalRateChange) {
                        const desiredRate = this.store.savedPlaybackRate !== undefined 
                            ? MVC_CONFIG.GESTURE_SPEED_BOOST 
                            : (this.store.settings.lastRate || this.store.settings.defaultSpeed);
                        if (currentRate !== desiredRate) {
                            if (this.store._rateOverrideCount < 3) {
                                this.store._rateOverrideCount++;
                                this._setRate(desiredRate, false);
                            } else {
                                console.warn('[MVC] Stopped rate override loop. Site is enforcing speed:', currentRate);
                                this.eventBus.emit('ui:toast', { message: 'Playback rate overridden by website' });
                            }
                        } else {
                            this.store._rateOverrideCount = 0;
                        }
                    }
                }
                break;
            }
            case 'click':
                this.handleVideoClick();
                break;
        }
    }

    private handleVideoClick() {
        if (this.store.isDoubleTapping) return;

        const isGestureInteracting = this.store.savedPlaybackRate !== undefined ||
            this.store.isSpeedSliding ||
            this.store.isPinching ||
            this.store.isSwipeSeeking ||
            this.store.isVolumeControlling ||
            this.store.isBrightnessControlling;
            
        if (isGestureInteracting) return;
        
        if (this.store.timers.videoClick) {
            clearTimeout(this.store.timers.videoClick);
        }

        this.store.timers.videoClick = setTimeout(() => {
            if (this.store.isDoubleTapping) {
                this.store.timers.videoClick = undefined;
                return;
            }
            if (this.ui.wrap) {
                const isFaded = this.ui.wrap.style.opacity !== '1';
                if (isFaded) {
                    this.eventBus.emit('control:visibility-requested', { visible: true, force: true });
                } else {
                    this.eventBus.emit('control:visibility-requested', { visible: false });
                }
            }
            this.store.timers.videoClick = undefined;
        }, MVC_CONFIG.CLICK_DELAY) as any;
    }

    // ── Positioning ─────────────────────────────────────────────────────────
    public _applyPagePosition(pageX: number, pageY: number, ignoreYClamp = false) {
        if (!this.ui.wrap) return;
        const v = this.getViewportPageBounds();
        const uiWidth = this.ui.wrap.offsetWidth;
        const uiHeight = this.ui.wrap.offsetHeight;

        const minPageX = v.leftPage + MVC_CONFIG.EDGE;
        const maxPageX = v.leftPage + v.width - uiWidth - MVC_CONFIG.EDGE;
        const minPageY = v.topPage + MVC_CONFIG.EDGE;
        const maxPageY = v.topPage + v.height - uiHeight - MVC_CONFIG.EDGE;

        const clampedLeft = clamp(pageX, minPageX, maxPageX);
        const clampedTop = ignoreYClamp ? pageY : clamp(pageY, minPageY, maxPageY);

        const parent = this.ui.wrap.offsetParent || document.body;
        const parentRect = parent.getBoundingClientRect();
        const parentLeftPage = parentRect.left + window.scrollX;
        const parentTopPage = parentRect.top + window.scrollY;

        const leftVal = `${Math.round(clampedLeft - parentLeftPage)}px`;
        const topVal = `${Math.round(clampedTop - parentTopPage)}px`;
        if (this.ui.wrap.style.left !== leftVal) this.ui.wrap.style.left = leftVal;
        if (this.ui.wrap.style.top !== topVal) this.ui.wrap.style.top = topVal;
        if (this.ui.wrap.style.right !== 'auto') this.ui.wrap.style.right = 'auto';
        if (this.ui.wrap.style.bottom !== 'auto') this.ui.wrap.style.bottom = 'auto';
    }

    public positionOnVideo() {
        if (!this.store.activeVideo || !this.ui.wrap || this.store.isManuallyPositioned || this.store.isDragging) return;
        if (this.ui.wrap.style.transform !== '') this.ui.wrap.style.transform = '';

        const vr = this.store.activeVideo.getBoundingClientRect();
        const layoutWidth = this.store.activeVideo.clientWidth;
        const layoutHeight = this.store.activeVideo.clientHeight;
        const zoom = this.store.settings.transform.zoom;
        const offsetX = (layoutWidth * (zoom - 1)) / 2;
        const offsetY = (layoutHeight * (zoom - 1)) / 2;

        const uiWidth = this.ui.wrap.offsetWidth || 100;
        const desiredLeftPage = vr.right - offsetX + window.scrollX - MVC_CONFIG.EDGE - uiWidth;
        let desiredTopPage = vr.top + offsetY + window.scrollY + MVC_CONFIG.EDGE;

        this._applyPagePosition(desiredLeftPage, desiredTopPage, this.store.isScrolling);
    }

    public ensureUIInViewport() {
        if (!this.ui.wrap || !this.ui.wrap.offsetWidth || !this.ui.wrap.offsetHeight) return;
        const uiRect = this.ui.wrap.getBoundingClientRect();
        this._applyPagePosition(uiRect.left + window.scrollX, uiRect.top + window.scrollY);
    }

    public throttledPositionOnVideo() {
        if (this.store.isTicking) return;
        this.store.isTicking = true;
        requestAnimationFrame(() => {
            if (!this.store.isDragging && !this.store.isManuallyPositioned) this.positionOnVideo();
            this.store.isTicking = false;
        });
    }

    public onViewportChange() {
        if (this.store.isManuallyPositioned) return;
        if (this.store.activeVideo) this.throttledPositionOnVideo();
        else this.ensureUIInViewport();
    }

    public getViewportPageBounds() {
        const v      = window.visualViewport;
        const leftPage = window.scrollX + (v ? v.offsetLeft : 0);
        const topPage  = window.scrollY + (v ? v.offsetTop  : 0);
        const width    = v ? v.width  : window.innerWidth;
        const height   = v ? v.height : window.innerHeight;
        return { leftPage, topPage, width, height };
    }

    private findScrollableParents(element: HTMLElement): (HTMLElement | Window)[] {
        const parents: (HTMLElement | Window)[] = [];
        let parent = element.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            const scrollsY = (style.overflowY === 'scroll' || style.overflowY === 'auto') && parent.scrollHeight > parent.clientHeight;
            const scrollsX = (style.overflowX === 'scroll' || style.overflowX === 'auto') && parent.scrollWidth > parent.clientWidth;
            if (scrollsY || scrollsX) {
                parents.push(parent);
            }
            parent = parent.parentElement;
        }
        parents.push(window);
        return parents;
    }

    // ── Actions ─────────────────────────────────────────────────────────────
    public _setRate(rate: number, saveToSettings = true) {
        if (!this.store.activeVideo) return;
        this.store._isInternalRateChange = true;
        try {
            this.store.activeVideo.playbackRate = rate;
            this.store.activeVideo.__mvc_last_rate = rate;
        } finally {
            this.store._isInternalRateChange = false;
        }
        if (saveToSettings) {
            this.store.saveSetting('lastRate', rate);
            this.store._rateOverrideCount = 0;
        }
    }

    public onVideoEnded() {
        if (this.store.activeVideo) {
            this._setRate(this.store.settings.defaultSpeed, false);
        }
    }

    public handlePlayPauseClick() {
        if (!this.store.activeVideo) return;
        if (this.store.activeVideo.paused || this.store.activeVideo.ended) {
            this._setRate(this.store.settings.lastRate || this.store.settings.defaultSpeed, false);
            this.store.activeVideo.play().catch(() => {});
        } else {
            this.store.activeVideo.pause();
        }
    }

    public doSkip(dir: number, seconds: number) {
        if (this.store.activeVideo) {
            this.store.activeVideo.currentTime = clampTime(
                this.store.activeVideo.currentTime + dir * seconds,
                this.store.activeVideo.duration || 0
            );
        }
    }


    public applyVideoTransform() {
        if (!this.store.activeVideo) return;
        const { ratio, zoom, rotation } = this.store.settings.transform;
        
        const isDefault = ratio === 'fit' && zoom === 1 && rotation === 0;

        if (isDefault) {
            if (this.store.activeVideo.dataset.hasOwnProperty('mvcOriginalTransform')) {
                this.store.activeVideo.style.transform = this.store.activeVideo.dataset.mvcOriginalTransform || '';
                delete this.store.activeVideo.dataset.mvcOriginalTransform;
            }
            if (this.store.activeVideo.dataset.hasOwnProperty('mvcOriginalObjectFit')) {
                this.store.activeVideo.style.objectFit = this.store.activeVideo.dataset.mvcOriginalObjectFit || '';
                delete this.store.activeVideo.dataset.mvcOriginalObjectFit;
            }
            return;
        }

        if (!this.store.activeVideo.dataset.hasOwnProperty('mvcOriginalTransform')) {
            this.store.activeVideo.dataset.mvcOriginalTransform = this.store.activeVideo.style.transform || '';
        }
        if (!this.store.activeVideo.dataset.hasOwnProperty('mvcOriginalObjectFit')) {
            this.store.activeVideo.dataset.mvcOriginalObjectFit = this.store.activeVideo.style.objectFit || '';
        }

        this.store.activeVideo.style.objectFit  = ratio === 'fit' ? 'contain' : ratio === 'fill' ? 'cover' : 'fill';
        const orig = this.store.activeVideo.dataset.mvcOriginalTransform || '';
        this.store.activeVideo.style.transform  = `${orig} scale(${zoom}) rotate(${rotation}deg)`.trim();
    }

    public onFullScreenChange() {
        const container = getFullscreenContainer();
        const uiElements = [
            this.ui.backdrop,
            this.ui.toast,
            this.ui.gestureOverlay,
            this.ui.volumeBar,
            this.ui.brightnessOverlay,
            this.ui.brightnessBar,
            this.ui.doubleTapContainer,
            this.ui.settingsSheet?.dom
        ];
        uiElements.forEach(el => {
            if (el) container.appendChild(el);
        });
        if (this.store.activeVideo) this.attachUIToVideo(this.store.activeVideo);
        this.guardianCheck();
    }

    public guardianCheck() {
        if (!this.store.activeVideo || !this.ui.wrap) return;
        const expectedParent = getFullscreenContainer();
        if (expectedParent && (!this.ui.wrap.isConnected || this.ui.wrap.parentElement !== expectedParent)) {
            this.attachUIToVideo(this.store.activeVideo);
        }
    }

}
