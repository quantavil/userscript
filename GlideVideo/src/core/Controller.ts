// src/core/Controller.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from './StateStore';
import { injectStyles } from '../ui/styles/css';
import { UIManager } from '../ui/UIManager';
import { VideoTracker } from '../video/VideoTracker';
import { VideoTransform } from '../video/VideoTransform';
import { PreloadEngine } from '../video/PreloadEngine';
import { SwipeDetector } from '../gestures/SwipeDetector';
import { PressDetector } from '../gestures/PressDetector';
import { DoubleTapDetector } from '../gestures/DoubleTapDetector';
import { findAllVideos } from '../utils';

export class Controller {
    public readonly eventBus: EventBus;
    public readonly store: StateStore;
    public readonly ui: UIManager;
    public readonly videoTracker: VideoTracker;
    public readonly videoTransform: VideoTransform;
    public readonly preloadEngine: PreloadEngine;
    public readonly swipeDetector: SwipeDetector;
    public readonly pressDetector: PressDetector;
    public readonly doubleTapDetector: DoubleTapDetector;
    private lightObserver?: MutationObserver;

    constructor() {
        if (window.__MVC_INSTANCE) {
            window.__MVC_INSTANCE.destroy();
        }
        window.__MVC_INSTANCE = this;

        this.eventBus = new EventBus();
        this.store = new StateStore(this.eventBus);

        this.ui = new UIManager(this.eventBus, this.store);
        this.videoTracker = new VideoTracker(this.eventBus, this.store);
        this.videoTransform = new VideoTransform(this.eventBus, this.store, this.ui);
        this.preloadEngine = new PreloadEngine(this.eventBus, this.store);
        this.swipeDetector = new SwipeDetector(this.eventBus, this.store);
        this.pressDetector = new PressDetector(this.eventBus, this.store);
        this.doubleTapDetector = new DoubleTapDetector(this.eventBus, this.store);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.safeInit(), { once: true });
        } else {
            this.safeInit();
        }
    }

    public safeInit() {
        if (!document.body) {
            setTimeout(() => this.safeInit(), 50);
            return;
        }

        this.videoTracker.patchAttachShadow();

        if (findAllVideos(document).length > 0) {
            this.init();
            return;
        }

        this.videoTracker.observeShadowRoots(document);

        this.lightObserver = new MutationObserver((mutations) => {
            const hasVideo = document.querySelector('video') || 
                             Array.from(this.videoTracker.shadowObservers.keys()).some(root => root.querySelector('video'));
            if (hasVideo) {
                this.init();
                return;
            }
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                for (let j = 0; j < mutation.addedNodes.length; j++) {
                    const node = mutation.addedNodes[j];
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node as HTMLElement;
                        if (el.tagName === 'VIDEO' || el.querySelector?.('video')) {
                            this.init();
                            return;
                        }
                        this.videoTracker.observeShadowRoots(el);
                    }
                }
            }
        });

        this.lightObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    public init() {
        if (this.store.isInitialized) return;
        this.store.isInitialized = true;

        if (this.lightObserver) {
            this.lightObserver.disconnect();
            this.lightObserver = undefined;
        }

        injectStyles();
        this.ui.init();

        // Share visual wrap references with StateStore
        this.store.uiWrap = this.ui.wrap;


        this.swipeDetector.init();
        this.pressDetector.init();
        this.doubleTapDetector.init();
        this.videoTracker.init();
    }

    public destroy() {
        this.store.abortController.abort();
        if (this.lightObserver) {
            this.lightObserver.disconnect();
            this.lightObserver = undefined;
        }
        if (this.ui.wrap) this.ui.wrap.remove();
        if (this.ui.backdrop) this.ui.backdrop.remove();
        if (this.ui.toast) this.ui.toast.remove();
        if (this.ui.gestureOverlay) this.ui.gestureOverlay.remove();
        if (this.ui.volumeBar) this.ui.volumeBar.remove();
        if (this.ui.brightnessOverlay) this.ui.brightnessOverlay.remove();
        if (this.ui.brightnessBar) this.ui.brightnessBar.remove();
        if (this.ui.settingsSheet) this.ui.settingsSheet.dom.remove();
        if (this.ui.doubleTapContainer) this.ui.doubleTapContainer.remove();

        this.videoTracker.destroy();
        this.videoTransform.destroy();
        this.preloadEngine.destroy();
        clearTimeout(this.store.timers.hideGrace);
    }
}
