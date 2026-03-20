// src/video.js – Video lifecycle, observers, position, transform/filter & playback
'use strict';

const MVC_Video = {
    // ── Settings persistence ────────────────────────────────────────────────
    loadSettings() {
        const getStored = (k, d) => {
            try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
            catch (e) { return d; }
        };
        this.settings = {
            skipSeconds:  getStored('mvc_skip_seconds',    10),
            autoplayMode: getStored('mvc_autoplayMode',    'off'),
            defaultSpeed: getStored('mvc_default_speed',   1.0),
            transform:    getStored('mvc_transform',       { ratio: 'fit', zoom: 1, rotation: 0 }),
            filters:      getStored('mvc_filters',         {})
        };
    },

    saveSetting(key, val) {
        this.settings[key] = val;
        clearTimeout(this.timers[`save_${key}`]);
        this.timers[`save_${key}`] = setTimeout(() => {
            try { localStorage.setItem(`mvc_${key}`, JSON.stringify(val)); } catch (e) {}
        }, MVC_CONFIG.STORAGE_DEBOUNCE_MS);
    },

    // ── Active-video selection ──────────────────────────────────────────────
    evaluateActive() {
        if (this.activeVideo &&
            this.isPlaying(this.activeVideo) &&
            this.activeVideo.isConnected &&
            this.visibleVideos.has(this.activeVideo)) {
            const r = this.activeVideo.getBoundingClientRect();
            if (r.height > 50 && r.bottom > 0 && r.top < window.innerHeight) return;
        }

        let best = null, bestScore = -1;
        const viewArea = window.innerWidth * window.innerHeight;

        for (const v of this.visibleVideos.keys()) {
            if (!v.isConnected) { this.visibleVideos.delete(v); continue; }
            if (getComputedStyle(v).visibility === 'hidden') continue;
            const r    = v.getBoundingClientRect();
            const area = r.width * r.height;
            if (area < MVC_CONFIG.MIN_VIDEO_AREA) continue;
            const score = area + (this.isPlaying(v) ? viewArea * 2 : 0);
            if (score > bestScore) { best = v; bestScore = score; }
        }
        this.setActiveVideo(best);
    },

    setActiveVideo(v, options = {}) {
        if (this.activeVideo === v) return;
        clearTimeout(this.timers.hideGrace);

        if (this.activeVideo) {
            ['ended', 'play', 'pause', 'ratechange'].forEach(ev =>
                this.activeVideo.removeEventListener(ev, this)
            );
            this.videoResizeObserver.unobserve(this.activeVideo);
            this.videoMutationObserver.disconnect();
            if (this.currentScrollParent) {
                this.currentScrollParent.removeEventListener('scroll', this.boundScrollHandler);
                this.currentScrollParent = null;
            }
        }

        this.activeVideo = v;
        this.dragData    = { isDragging: false };

        if (v) {
            this.attachUIToVideo(v);
            const scrollParent = this.findScrollableParent(v);
            if (scrollParent) {
                this.currentScrollParent = scrollParent;
                this.currentScrollParent.addEventListener('scroll', this.boundScrollHandler, { passive: true });
            }
            this.videoResizeObserver.observe(v);
            this.videoMutationObserver.observe(v.parentElement || v, { attributes: true, subtree: true });
            this.applyDefaultSpeed(v);
            this.applyVideoTransform();
            this.applyVideoFilters();
        } else {
            const gracePeriod = options.immediateHide ? 0 : 250;
            this.timers.hideGrace = setTimeout(() => {
                if (!this.activeVideo && this.ui.wrap) this.ui.wrap.style.display = 'none';
            }, gracePeriod);
        }
    },

    // ── UI ↔ video attachment ───────────────────────────────────────────────
    attachUIToVideo(video) {
        this.ui.wrap.style.visibility = 'hidden';
        const fsEl       = document.fullscreenElement || document.webkitFullscreenElement;
        const hostname   = window.location.hostname.replace(/^www\./, '');
        const siteConfig = MVC_SITE_CONFIGS[hostname] || MVC_SITE_CONFIGS[window.location.hostname];

        let parent = fsEl;
        if (!parent && siteConfig?.parentSelector) parent = video.closest(siteConfig.parentSelector);
        if (siteConfig?.attachToParent)            parent = video.parentElement;
        if (parent && parent.isConnected) {
            if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
            parent.appendChild(this.ui.wrap);
            this.ui.wrap.style.position = 'absolute';
        } else {
            document.body.appendChild(this.ui.wrap);
            this.ui.wrap.style.position = 'absolute';
        }

        this.ui.wrap.style.display  = 'block';
        this.isManuallyPositioned   = false;
        this.throttledPositionOnVideo();

        setTimeout(() => {
            this.ui.wrap.style.visibility = 'visible';
            this.showUI(true);
            this.updateSpeedDisplay();
        }, 50);
        ['ended', 'play', 'pause', 'ratechange'].forEach(ev => video.addEventListener(ev, this));
    },

    // ── Positioning ─────────────────────────────────────────────────────────
    positionOnVideo() {
        if (!this.activeVideo || !this.ui.wrap || this.isManuallyPositioned || this.dragData?.isDragging) return;
        this.ui.wrap.style.transform = '';

        const vr           = this.activeVideo.getBoundingClientRect();
        const layoutWidth  = this.activeVideo.clientWidth;
        const layoutHeight = this.activeVideo.clientHeight;
        const zoom         = this.settings.transform.zoom;
        const offsetX      = (layoutWidth  * (zoom - 1)) / 2;
        const offsetY      = (layoutHeight * (zoom - 1)) / 2;

        const desiredLeftPage = vr.left + offsetX + window.scrollX + layoutWidth  - this.ui.width  - MVC_CONFIG.DEFAULT_RIGHT_OFFSET;
        let   desiredTopPage  = vr.top  + offsetY + window.scrollY + layoutHeight - this.ui.height - 10;
        if (layoutHeight > window.innerHeight * 0.7 && vr.bottom > window.innerHeight - 150) desiredTopPage -= 82;

        const v        = this.getViewportPageBounds();
        const minPageX = v.leftPage + MVC_CONFIG.EDGE;
        const maxPageX = v.leftPage + v.width  - this.ui.width  - MVC_CONFIG.EDGE;
        const minPageY = v.topPage  + MVC_CONFIG.EDGE;
        const maxPageY = v.topPage  + v.height - this.ui.height - MVC_CONFIG.EDGE;

        const clampedLeftPage = this.clamp(desiredLeftPage, minPageX, maxPageX);
        const clampedTopPage  = this.isScrolling
            ? desiredTopPage
            : this.clamp(desiredTopPage, minPageY, maxPageY);

        const parent        = this.ui.wrap.parentElement || document.body;
        const parentRect    = parent.getBoundingClientRect();
        const parentLeftPage = parentRect.left + window.scrollX;
        const parentTopPage  = parentRect.top  + window.scrollY;

        this.ui.wrap.style.left   = `${Math.round(clampedLeftPage - parentLeftPage)}px`;
        this.ui.wrap.style.top    = `${Math.round(clampedTopPage  - parentTopPage)}px`;
        this.ui.wrap.style.right  = 'auto';
        this.ui.wrap.style.bottom = 'auto';
    },

    ensureUIInViewport() {
        if (!this.ui.wrap || !this.ui.width || !this.ui.height) return;
        const v      = this.getViewportPageBounds();
        const uiRect = this.ui.wrap.getBoundingClientRect();

        const currentPageLeft = uiRect.left + window.scrollX;
        const currentPageTop  = uiRect.top  + window.scrollY;

        const minPageX = v.leftPage + MVC_CONFIG.EDGE;
        const maxPageX = v.leftPage + v.width  - this.ui.width  - MVC_CONFIG.EDGE;
        const minPageY = v.topPage  + MVC_CONFIG.EDGE;
        const maxPageY = v.topPage  + v.height - this.ui.height - MVC_CONFIG.EDGE;

        const clampedLeftPage = this.clamp(currentPageLeft, Math.min(minPageX, maxPageX), Math.max(minPageX, maxPageX));
        const clampedTopPage  = this.clamp(currentPageTop,  Math.min(minPageY, maxPageY), Math.max(minPageY, maxPageY));

        const parent         = this.ui.wrap.parentElement || document.body;
        const parentRect     = parent.getBoundingClientRect();
        const parentLeftPage = parentRect.left + window.scrollX;
        const parentTopPage  = parentRect.top  + window.scrollY;

        this.ui.wrap.style.left = `${Math.round(clampedLeftPage - parentLeftPage)}px`;
        this.ui.wrap.style.top  = `${Math.round(clampedTopPage  - parentTopPage)}px`;
    },

    throttledPositionOnVideo() {
        if (this.isTicking) return;
        this.isTicking = true;
        requestAnimationFrame(() => {
            if (!this.dragData?.isDragging && !this.isManuallyPositioned) this.positionOnVideo();
            this.isTicking = false;
        });
    },

    onViewportChange() {
        if (this.isManuallyPositioned) return;
        this.ensureUIInViewport();
        if (this.activeVideo) this.throttledPositionOnVideo();
    },

    getViewportPageBounds() {
        const v      = window.visualViewport;
        const leftPage = window.scrollX + (v ? v.offsetLeft : 0);
        const topPage  = window.scrollY + (v ? v.offsetTop  : 0);
        const width    = v ? v.width  : window.innerWidth;
        const height   = v ? v.height : window.innerHeight;
        return { leftPage, topPage, width, height };
    },

    findScrollableParent(element) {
        let parent = element.parentElement;
        while (parent) {
            const { overflowY } = window.getComputedStyle(parent);
            if ((overflowY === 'scroll' || overflowY === 'auto') && parent.scrollHeight > parent.clientHeight)
                return parent;
            parent = parent.parentElement;
        }
        return window;
    },

    // ── Observers ───────────────────────────────────────────────────────────
    setupObservers() {
        this.intersectionObserver = new IntersectionObserver(
            e => this.handleIntersection(e), { threshold: 0.05 }
        );
        document.querySelectorAll('video').forEach(v => this.intersectionObserver.observe(v));

        const config       = MVC_SITE_CONFIGS[window.location.hostname];
        const observerRoot = config?.observerRootSelector
            ? document.querySelector(config.observerRootSelector)
            : document.body;
        this.mutationObserver = new MutationObserver(m => this.handleMutation(m));
        const root = observerRoot || document.body || document.documentElement;
        this.mutationObserver.observe(root, { childList: true, subtree: true });
    },

    handleIntersection(entries) {
        let needsReevaluation = false;
        entries.forEach(entry => {
            const target = entry.target;
            if (entry.isIntersecting) {
                if (!this.visibleVideos.has(target)) { this.visibleVideos.set(target, true); needsReevaluation = true; }
            } else {
                if (this.visibleVideos.has(target)) {
                    this.visibleVideos.delete(target);
                    if (target === this.activeVideo) {
                        const scrolledOffTop = entry.boundingClientRect.bottom < 10;
                        this.setActiveVideo(null, { immediateHide: scrolledOffTop });
                    }
                    needsReevaluation = true;
                }
            }
        });
        if (needsReevaluation) this.debouncedEvaluate();
    },

    handleMutation(mutations) {
        let videoAdded = false, activeVideoRemoved = false, relevantMutation = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video')))) {
                        relevantMutation = true;
                        const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
                        videos.forEach(v => { this.intersectionObserver.observe(v); videoAdded = true; });
                    }
                });
            }
            if (mutation.removedNodes.length) {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1 && (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video')))) {
                        relevantMutation = true;
                        const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
                        videos.forEach(v => {
                            this.intersectionObserver.unobserve(v);
                            this.visibleVideos.delete(v);
                            if (v === this.activeVideo) activeVideoRemoved = true;
                        });
                    }
                });
            }
        });
        if (!relevantMutation) return;
        if (activeVideoRemoved) this.setActiveVideo(null);
        if (videoAdded || activeVideoRemoved || (this.activeVideo && !this.activeVideo.isConnected)) {
            this.debouncedEvaluate();
        }
    },

    setupVideoPositionObserver() {
        this.videoResizeObserver   = new ResizeObserver(() => this.throttledPositionOnVideo());
        this.videoMutationObserver = new MutationObserver(() => this.throttledPositionOnVideo());
    },

    // ── Media-event handler (addEventListener(ev, this) interface) ──────────
    handleEvent(event) {
        switch (event.type) {
            case 'ended':
                if (this.settings.autoplayMode === 'loop') this.activeVideo?.play();
                else if (this.settings.autoplayMode === 'next' && window.location.hostname.includes('youtube.com'))
                    document.querySelector('.ytp-next-button')?.click();
                this.onVideoEnded();
                break;
            case 'play':
            case 'pause':
                this.updateSpeedDisplay();
                this.showUI();
                break;
            case 'ratechange':
                this.updateSpeedDisplay();
                if (!this.isSpeedSliding) this.showUI();
                break;
        }
    },

    // ── Playback actions ────────────────────────────────────────────────────
    onVideoEnded() {
        if (this.activeVideo) {
            this.activeVideo.playbackRate = this.settings.defaultSpeed;
            this.saveSetting('last_rate', String(this.settings.defaultSpeed));
            this.updateSpeedDisplay();
        }
    },

    handlePlayPauseClick() {
        if (!this.activeVideo) return;
        if (this.activeVideo.paused || this.activeVideo.ended) {
            this.activeVideo.playbackRate = parseFloat(localStorage.getItem('mvc_last_rate')) || this.settings.defaultSpeed;
            this.activeVideo.play().catch(() => {});
        } else {
            this.saveSetting('last_rate', this.activeVideo.playbackRate.toString());
            this.activeVideo.pause();
        }
    },

    doSkip(dir) {
        if (this.activeVideo)
            this.activeVideo.currentTime = this.clampTime(this.activeVideo.currentTime + dir * this.settings.skipSeconds);
    },

    applyDefaultSpeed(v) {
        if (v && this.settings.defaultSpeed !== 1.0 && Math.abs(v.playbackRate - 1.0) < 0.1)
            v.playbackRate = this.settings.defaultSpeed;
    },

    applyVideoTransform() {
        if (!this.activeVideo) return;
        const { ratio, zoom, rotation } = this.settings.transform;
        this.activeVideo.style.objectFit  = ratio === 'fit' ? 'contain' : ratio === 'fill' ? 'cover' : 'fill';
        this.activeVideo.style.transform  = `scale(${zoom}) rotate(${rotation}deg)`;
    },

    applyVideoFilters() {
        if (!this.activeVideo) return;
        const filterString = Object.entries(this.settings.filters)
            .map(([k, v]) => k === 'hue-rotate' ? `hue-rotate(${v}deg)` : `${k}(${v})`)
            .join(' ');
        this.activeVideo.style.filter = filterString;
    },

    // ── Fullscreen / guardian ───────────────────────────────────────────────
    onFullScreenChange() {
        const fsEl      = document.fullscreenElement || document.webkitFullscreenElement;
        const container = fsEl || document.body;
        [this.ui.backdrop, this.ui.toast, this.ui.speedToast, this.ui.speedMenu, this.ui.skipMenu, this.ui.settingsMenu]
            .forEach(el => { if (el) container.appendChild(el); });
        if (this.activeVideo) this.attachUIToVideo(this.activeVideo);
        this.guardianCheck();
    },

    guardianCheck() {
        if (!this.activeVideo || !this.ui.wrap) return;
        const fsEl         = document.fullscreenElement || document.webkitFullscreenElement;
        const hostname     = window.location.hostname;
        const isSimpleSite = MVC_SITE_CONFIGS[hostname] && !MVC_SITE_CONFIGS[hostname].useDefaultPositioning;
        const expectedParent = fsEl ? fsEl : (isSimpleSite ? this.findParentForVideo(this.activeVideo) : document.body);
        if (expectedParent && (!this.ui.wrap.isConnected || this.ui.wrap.parentElement !== expectedParent))
            this.attachUIToVideo(this.activeVideo);
    },

    findParentForVideo(video) {
        const config = MVC_SITE_CONFIGS[window.location.hostname];
        if (config?.parentSelector) return video.closest(config.parentSelector) || video.parentElement;
        return video.parentElement;
    }
};
