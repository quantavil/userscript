// src/video/VideoTracker.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';
import { MVC_CONFIG } from '../config';
import { findAllVideos, isPlaying, debounce, cleanupVideoAudioContext } from '../utils';

export class VideoTracker {
    public intersectionObserver?: IntersectionObserver;
    public mutationObserver?: MutationObserver;
    public shadowObservers = new Map<ShadowRoot, MutationObserver>();
    private originalAttachShadow?: typeof Element.prototype.attachShadow;

    public debouncedEvaluate: () => void;

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore
    ) {
        this.debouncedEvaluate = debounce(this.evaluateActive.bind(this), MVC_CONFIG.MUTATION_DEBOUNCE_MS);
    }

    public init() {
        this.setupObservers();
        setTimeout(() => this.evaluateActive(), MVC_CONFIG.INITIAL_EVAL_DELAY);
    }

    public destroy() {
        if (this.intersectionObserver) this.intersectionObserver.disconnect();
        if (this.mutationObserver) this.mutationObserver.disconnect();
        this.shadowObservers.forEach(obs => obs.disconnect());
        this.shadowObservers.clear();
        if (this.originalAttachShadow) {
            Element.prototype.attachShadow = this.originalAttachShadow;
            this.originalAttachShadow = undefined;
        }
    }

    // ── Active-video selection ──────────────────────────────────────────────
    public evaluateActive() {
        if (this.store.activeVideo &&
            isPlaying(this.store.activeVideo) &&
            this.store.activeVideo.isConnected &&
            this.store.visibleVideos.has(this.store.activeVideo)) {
            const r = this.store.activeVideo.getBoundingClientRect();
            if (r.height > 50 && r.bottom > 0 && r.top < window.innerHeight) return;
        }

        let best: HTMLVideoElement | null = null;
        let bestScore = -1;
        const viewArea = window.innerWidth * window.innerHeight;

        for (const v of this.store.visibleVideos.keys()) {
            if (!v.isConnected) { this.store.visibleVideos.delete(v); continue; }
            if (getComputedStyle(v).visibility === 'hidden') continue;
            
            const r    = v.getBoundingClientRect();
            const area = r.width * r.height;
            
            if (area < MVC_CONFIG.MIN_VIDEO_AREA || r.height < MVC_CONFIG.MIN_VIDEO_HEIGHT) continue;
            
            // Skip small preview thumbnails inside links, but allow large players wrapped in <a>
            if (v.closest('a')) {
                if (r.width < 250 || r.height < 140) {
                    continue;
                }
            }
            if (v.closest('.video-ads, .ytp-ad-player-overlay, .ad-container, [class*="ad-unit"], [id*="ad-unit"]')) continue;
            if (r.height < 150 && v.muted) continue;

            const score = area + (isPlaying(v) ? viewArea * 2 : 0);
            if (score > bestScore) { best = v; bestScore = score; }
        }
        
        if (this.store.activeVideo !== best) {
            this.eventBus.emit('control:visibility-requested', { visible: false });
            this.store.setActiveVideo(best);
        }
    }

    // ── Observers ───────────────────────────────────────────────────────────
    public setupObservers() {
        this.intersectionObserver = new IntersectionObserver(
            e => this.handleIntersection(e), { threshold: 0.05 }
        );
        findAllVideos(document).forEach(v => this.intersectionObserver?.observe(v));

        this.mutationObserver = new MutationObserver(m => this.handleMutation(m));
        const root = document.body || document.documentElement;
        this.mutationObserver.observe(root, { childList: true, subtree: true });
        
        this.observeShadowRoots(document);
    }

    public handleIntersection(entries: IntersectionObserverEntry[]) {
        let needsReevaluation = false;
        entries.forEach(entry => {
            const target = entry.target as HTMLVideoElement;
            if (entry.isIntersecting) {
                if (!this.store.visibleVideos.has(target)) {
                    this.store.visibleVideos.set(target, true);
                    needsReevaluation = true;
                }
            } else {
                if (this.store.visibleVideos.has(target)) {
                    this.store.visibleVideos.delete(target);
                    if (target === this.store.activeVideo) {
                        if (this.store.activeVideo !== null) {
                            this.eventBus.emit('control:visibility-requested', { visible: false });
                            this.store.setActiveVideo(null);
                        }
                    }
                    needsReevaluation = true;
                }
            }
        });
        if (needsReevaluation) this.debouncedEvaluate();
    }

    public handleMutation(mutations: MutationRecord[]) {
        let videoAdded = false, activeVideoRemoved = false, relevantMutation = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const el = node as HTMLElement;
                        const videos = findAllVideos(el);
                        if (videos.length) {
                            relevantMutation = true;
                            videos.forEach(v => { this.intersectionObserver?.observe(v); videoAdded = true; });
                        }
                        this.observeShadowRoots(el);
                    }
                });
            }
            if (mutation.removedNodes.length) {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const el = node as HTMLElement;
                        this.cleanupShadowObserversFor(el);
                        const videos = findAllVideos(el);
                        if (videos.length) {
                            relevantMutation = true;
                            videos.forEach(v => {
                                this.intersectionObserver?.unobserve(v);
                                this.store.visibleVideos.delete(v);
                                if (v === this.store.activeVideo) activeVideoRemoved = true;
                                cleanupVideoAudioContext(v);
                            });
                        }
                    }
                });
            }
        });
        if (!relevantMutation) return;
        if (activeVideoRemoved) {
            this.store.setActiveVideo(null);
        }
        if (videoAdded || activeVideoRemoved || (this.store.activeVideo && !this.store.activeVideo.isConnected)) {
            this.debouncedEvaluate();
        }
    }

    // ── Shadow DOM Observers ────────────────────────────────────────────────
    public observeShadowRoots(root: Node | ShadowRoot) {
        const walk = (node: Node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const el = node as HTMLElement;
            if (el.shadowRoot) {
                this.setupShadowRootObserver(el.shadowRoot);
                walk(el.shadowRoot);
            }
            for (let i = 0; i < el.childNodes.length; i++) {
                walk(el.childNodes[i]);
            }
        };
        walk(root);
    }

    public setupShadowRootObserver(shadowRoot: ShadowRoot) {
        if (this.shadowObservers.has(shadowRoot)) {
            if (this.store.isInitialized) {
                findAllVideos(shadowRoot).forEach(v => this.intersectionObserver?.observe(v));
            }
            return;
        }
        const observer = new MutationObserver(m => {
            if (!this.store.isInitialized) {
                if (shadowRoot.querySelector('video')) {
                    this.eventBus.emit('control:visibility-requested', { visible: true, force: true });
                } else {
                    for (let i = 0; i < m.length; i++) {
                        const mutation = m[i];
                        for (let j = 0; j < mutation.addedNodes.length; j++) {
                            const node = mutation.addedNodes[j];
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const el = node as HTMLElement;
                                if (el.tagName === 'VIDEO' || el.querySelector?.('video')) {
                                    this.eventBus.emit('control:visibility-requested', { visible: true, force: true });
                                    return;
                                }
                                this.observeShadowRoots(el);
                            }
                        }
                    }
                }
            } else {
                this.handleMutation(m);
            }
        });
        observer.observe(shadowRoot, { childList: true, subtree: true });
        this.shadowObservers.set(shadowRoot, observer);
        
        if (this.store.isInitialized) {
            findAllVideos(shadowRoot).forEach(v => this.intersectionObserver?.observe(v));
            this.observeShadowRoots(shadowRoot);
        } else {
            if (findAllVideos(shadowRoot).length > 0) {
                this.eventBus.emit('control:visibility-requested', { visible: true, force: true });
            } else {
                this.observeShadowRoots(shadowRoot);
            }
        }
    }

    public patchAttachShadow() {
        const proto = Element.prototype;
        if (proto.attachShadow && proto.attachShadow.__mvc_patched) return;

        this.originalAttachShadow = proto.attachShadow;
        const originalAttachShadow = this.originalAttachShadow;
        const newAttachShadow = function(this: Element, init: ShadowRootInit) {
            const shadowRoot = originalAttachShadow.call(this, init);
            try {
                if (init && init.mode === 'open') {
                    setTimeout(() => {
                        const instance = window.__MVC_INSTANCE;
                        if (instance && instance.videoTracker) {
                            instance.videoTracker.setupShadowRootObserver(shadowRoot);
                        }
                    }, 0);
                }
            } catch (e) {
                console.error('[MVC] Error observing dynamic shadow root:', e);
            }
            return shadowRoot;
        };
        newAttachShadow.__mvc_patched = true;
        (proto as { attachShadow: any }).attachShadow = newAttachShadow;
    }

    private cleanupShadowObserversFor(element: HTMLElement) {
        const walk = (node: Node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (el.shadowRoot) {
                    const observer = this.shadowObservers.get(el.shadowRoot);
                    if (observer) {
                        observer.disconnect();
                        this.shadowObservers.delete(el.shadowRoot);
                    }
                    walk(el.shadowRoot);
                }
            }
            for (let i = 0; i < node.childNodes.length; i++) {
                walk(node.childNodes[i]);
            }
        };
        walk(element);
    }
}
