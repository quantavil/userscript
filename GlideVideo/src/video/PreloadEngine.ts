// src/video/PreloadEngine.ts
import { EventBus } from '../events/EventBus';
import { StateStore } from '../core/StateStore';

export class PreloadEngine {
    private preloadAbort: AbortController | null = null;
    private pumpDelayTimer: ReturnType<typeof setTimeout> | null = null;
    private preloadedVideo: HTMLVideoElement | null = null;

    constructor(
        private readonly eventBus: EventBus,
        private readonly store: StateStore
    ) {
        this.setupSubscriptions();
    }

    private patchVideoElementPlay(video: HTMLVideoElement) {
        if ((video as any).__mvc_play_patched) return;
        (video as any).__mvc_play_patched = true;

        const originalPlay = video.play;
        (video as any).__mvc_original_play = originalPlay;

        const self = this;
        video.play = function(this: HTMLVideoElement) {
            try {
                if (this.__mvc_preload_user_time !== undefined) {
                    const userTime = this.__mvc_preload_user_time;
                    const isPumping = this.__mvc_preload_is_pumping;
                    if (isPumping || this.currentTime !== userTime) {
                        this.__mvc_preload_is_pumping = false;
                        this.currentTime = userTime;
                        
                        self.cancelPreload();
                    }
                }
            } catch (e) {
                console.error('[MVC] Error in play patch:', e);
            }
            return originalPlay.apply(this, arguments as any);
        };
    }

    private setupSubscriptions() {
        this.eventBus.on('video:active-changed', (video) => {
            this.cancelPreload();
            if (video) this.triggerEnhancedPreload(video);
        });

        this.eventBus.on('settings:changed', ({ key, val }) => {
            if (key === 'preloadEnhanced') {
                if (val && this.store.activeVideo) {
                    this.triggerEnhancedPreload(this.store.activeVideo);
                } else {
                    this.cancelPreload();
                }
            }
        });

        this.eventBus.on('video:play-state-changed', ({ playing }) => {
            const video = this.store.activeVideo;
            if (!video) return;
            if (playing) {
                this.cancelPreload();
            } else {
                this.triggerEnhancedPreload(video);
            }
        });
    }

    public triggerEnhancedPreload(video: HTMLVideoElement) {
        this.cancelPreload();
        if (!this.store.settings.preloadEnhanced) return;
        if (!video.paused) return;

        this.preloadedVideo = video;
        this.patchVideoElementPlay(video);
        if (video.getAttribute('preload') !== 'auto') {
            video.setAttribute('preload', 'auto');
        }

        this.preloadAbort = new AbortController();
        const signal = this.preloadAbort.signal;

        const startPump = () => {
            if (signal.aborted) return;
            if (!isFinite(video.duration) || video.duration <= 0) return;
            this.progressiveBuffer(video, signal);
        };

        if (video.readyState >= 1) {
            startPump();
        } else {
            video.addEventListener('loadedmetadata', startPump, { once: true, signal });
        }
    }

    private progressiveBuffer(video: HTMLVideoElement, signal: AbortSignal) {
        const duration = video.duration;
        const STEP = 30;
        const PUMP_DELAY = 300;

        let cursor = video.currentTime;
        let isPumping = false;
        let pumpTarget: number | null = null;

        video.__mvc_preload_user_time = video.currentTime;
        video.__mvc_preload_is_pumping = false;

        const setPumping = (val: boolean) => {
            isPumping = val;
            video.__mvc_preload_is_pumping = val;
        };

        const restoreUserTime = () => {
            setPumping(true);
            if (video.__mvc_preload_user_time !== undefined) {
                video.currentTime = video.__mvc_preload_user_time;
            }
            setPumping(false);
        };

        const pump = () => {
            if (signal.aborted) return;
            if (video !== this.store.activeVideo) return;
            if (video.paused === false) return;

            if (this.isFullyBuffered(video)) {
                restoreUserTime();
                this.cancelPreload();
                return;
            }

            cursor = this.nextUnbuffered(video, cursor, duration);

            // Wrap around: if cursor reached end, search from 0 for gaps
            if (cursor >= duration) {
                cursor = this.nextUnbuffered(video, 0, duration);
                if (cursor >= duration || this.isFullyBuffered(video)) {
                    restoreUserTime();
                    this.cancelPreload();
                    return;
                }
            }

            setPumping(true);
            pumpTarget = cursor;
            video.currentTime = cursor;
            video.addEventListener('seeked', () => {
                setPumping(false);
                if (signal.aborted) return;
                cursor += STEP;
                schedulePump(200);
            }, { once: true, signal });
        };

        const schedulePump = (delay: number) => {
            this.clearPumpDelay();
            this.pumpDelayTimer = setTimeout(() => {
                this.pumpDelayTimer = null;
                if (signal.aborted || video.paused === false) return;
                pump();
            }, delay);
        };

        // User seeked manually — update userTime and restart cursor from new position
        const onSeeked = () => {
            if (signal.aborted || isPumping) return;
            if (pumpTarget !== null && Math.abs(video.currentTime - pumpTarget) < 0.5) {
                return;
            }
            video.__mvc_preload_user_time = video.currentTime;
            cursor = video.currentTime;
            pumpTarget = null;
            schedulePump(PUMP_DELAY);
        };

        const onPlay = () => {
            if (signal.aborted) return;
            this.clearPumpDelay();
            // Restore user position if we were mid-pump or if playhead is not at userTime
            const storedUserTime = video.__mvc_preload_user_time;
            if (storedUserTime !== undefined) {
                const isPumpingVal = video.__mvc_preload_is_pumping;
                if (isPumpingVal || video.currentTime !== storedUserTime) {
                    video.__mvc_preload_is_pumping = false;
                    video.currentTime = storedUserTime;
                }
            }
            this.cancelPreload();
        };

        video.addEventListener('play', onPlay, { capture: true, signal });
        video.addEventListener('seeked', onSeeked, { signal });

        schedulePump(PUMP_DELAY);
    }

    private nextUnbuffered(video: HTMLVideoElement, from: number, duration: number): number {
        const buf = video.buffered;
        let pos = from;
        for (let i = 0; i < buf.length; i++) {
            if (pos >= buf.start(i) && pos < buf.end(i)) {
                pos = buf.end(i);
            }
        }
        return Math.min(pos, duration);
    }

    private isFullyBuffered(video: HTMLVideoElement): boolean {
        if (!isFinite(video.duration) || video.duration <= 0) return false;
        return this.nextUnbuffered(video, 0, video.duration) >= video.duration - 0.5;
    }

    private clearPumpDelay() {
        if (this.pumpDelayTimer !== null) {
            clearTimeout(this.pumpDelayTimer);
            this.pumpDelayTimer = null;
        }
    }

    public cancelPreload() {
        this.clearPumpDelay();
        if (this.preloadedVideo) {
            const video = this.preloadedVideo as any;
            if (video.__mvc_original_play) {
                video.play = video.__mvc_original_play;
                delete video.__mvc_original_play;
            }
            delete video.__mvc_play_patched;
            delete this.preloadedVideo.__mvc_preload_user_time;
            delete this.preloadedVideo.__mvc_preload_is_pumping;
            this.preloadedVideo = null;
        }
        if (this.preloadAbort) {
            this.preloadAbort.abort();
            this.preloadAbort = null;
        }
    }

    public destroy() {
        this.cancelPreload();
    }
}
