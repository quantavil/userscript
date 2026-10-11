import { MVC_CONFIG } from "../config";
import type { StateStore } from "../core/StateStore";
// src/video/VideoTransform.ts
import type { EventBus } from "../events/EventBus";
import type { UIManager } from "../ui/UIManager";
import { clampTime, getFullscreenContainer } from "../utils";

const VIDEO_LISTENED_EVENTS = [
	"ended",
	"play",
	"pause",
	"ratechange",
	"click",
	"timeupdate",
	"durationchange",
	"progress",
	"seeking",
	"seeked",
	"loadedmetadata",
	"loadstart",
	"emptied",
];

export class VideoTransform implements EventListenerObject {
	public videoResizeObserver?: ResizeObserver;
	public videoMutationObserver?: MutationObserver;
	private lastVideo: HTMLVideoElement | null = null;

	constructor(
		private readonly eventBus: EventBus,
		private readonly store: StateStore,
		private readonly ui: UIManager,
	) {
		this.setupSubscriptions();
		this.setupObservers();
		this.attachGlobalListeners();
	}

	public destroy() {
		if (this.videoMutationObserver) this.videoMutationObserver.disconnect();
		if (this.videoResizeObserver) this.videoResizeObserver.disconnect();
		if (this.lastVideo) {
			this.store.saveVideoPosition(this.lastVideo);
			VIDEO_LISTENED_EVENTS.forEach((ev) => {
				this.lastVideo?.removeEventListener(ev, this);
			});
		}
	}

	private setupObservers() {
		this.videoResizeObserver = new ResizeObserver(() => {
			// The rotation fit-scale is derived from the box size, so it has to
			// be recomputed whenever the box changes.
			if (this.store.settings.transform?.rot) this.applyVideoTransform();
			this.throttledReposition();
		});
		this.videoMutationObserver = new MutationObserver(() =>
			this.throttledReposition(),
		);
	}

	private attachGlobalListeners() {
		window.addEventListener("resize", () => this.onViewportChange(), {
			passive: true,
			signal: this.store.abortController.signal,
		});

		window.addEventListener("scroll", () => this.onViewportChange(), {
			passive: true,
			capture: true,
			signal: this.store.abortController.signal,
		});

		if (window.visualViewport) {
			window.visualViewport.addEventListener(
				"resize",
				() => this.onViewportChange(),
				{ passive: true, signal: this.store.abortController.signal },
			);
			window.visualViewport.addEventListener(
				"scroll",
				() => this.onViewportChange(),
				{ passive: true, signal: this.store.abortController.signal },
			);
		}

		["fullscreenchange", "webkitfullscreenchange"].forEach((ev) =>
			document.addEventListener(
				ev,
				() => {
					this.onFullScreenChange();
					setTimeout(
						() => this.guardianCheck(),
						MVC_CONFIG.VISIBILITY_GUARDIAN_DELAY,
					);
				},
				{ passive: true, signal: this.store.abortController.signal },
			),
		);

		document.addEventListener(
			"visibilitychange",
			() => {
				if (document.visibilityState === "visible")
					setTimeout(
						() => this.guardianCheck(),
						MVC_CONFIG.VISIBILITY_GUARDIAN_DELAY,
					);
			},
			{ passive: true, signal: this.store.abortController.signal },
		);
	}

	private setupSubscriptions() {
		this.eventBus.on("video:transform-need-update", () =>
			this.applyVideoTransform(),
		);
		this.eventBus.on("video:play-pause-requested", () =>
			this.handlePlayPauseClick(),
		);
		this.eventBus.on("video:skip-requested", ({ dir, customSeconds }) => {
			const seconds =
				customSeconds !== undefined
					? customSeconds
					: this.store.settings.skipSeconds;
			this.doSkip(dir, seconds);
		});
		this.eventBus.on(
			"video:rate-change-requested",
			({ rate, saveToSettings }) => {
				this._setRate(rate, saveToSettings ?? true);
			},
		);
		this.eventBus.on("video:active-changed", (video) => {
			this.onActiveVideoChanged(video);
		});
		this.eventBus.on("video:seek-requested", ({ time }) => {
			const video = this.store.activeVideo;
			if (video && Number.isFinite(time)) {
				video.currentTime = clampTime(time, video.duration || 0);
				this.emitTimeUpdate(video);
			}
		});
	}

	private onActiveVideoChanged(v: HTMLVideoElement | null) {
		clearTimeout(this.store.timers.hideGrace);

		// Clean up listeners for previous video element
		if (this.lastVideo) {
			this.store.saveVideoPosition(this.lastVideo);
			VIDEO_LISTENED_EVENTS.forEach((ev) => {
				this.lastVideo?.removeEventListener(ev, this);
			});
		}
		this.lastVideo = v;

		// Clean up resize and mutation hooks for previous video element
		if (this.videoResizeObserver) this.videoResizeObserver.disconnect();
		if (this.videoMutationObserver) this.videoMutationObserver.disconnect();

		if (v) {
			// Restore video transform/zoom on new video load, or initialize default
			const meta = this.store.getVideoMetadata(v);
			let transform = meta.transform;
			if (!transform) {
				transform = { ratio: "fit", zoom: 1, rot: 0 };
				this.store.updateVideoMetadata(v, { transform });
			} else if (transform.rot === undefined) {
				transform.rot = 0;
			}
			this.store.settings.transform = transform;

			const savedTime = this.store.getVideoPosition(v);
			if (savedTime > 0) {
				const applyRestore = () => {
					if (
						this.store.activeVideo === v &&
						this.store.settings.rememberPlayback
					) {
						if (v.currentTime < savedTime) {
							v.currentTime = savedTime;
						}
					}
				};
				if (v.readyState >= 1) {
					applyRestore();
				} else {
					v.addEventListener("loadedmetadata", applyRestore, { once: true });
				}
			}

			this.attachUIToVideo(v);

			if (this.videoResizeObserver) this.videoResizeObserver.observe(v);
			if (this.videoMutationObserver) {
				this.videoMutationObserver.observe(v, {
					attributes: true,
					attributeFilter: ["style", "class"],
				});
				if (v.parentElement) {
					this.videoMutationObserver.observe(v.parentElement, {
						attributes: true,
						attributeFilter: ["style", "class"],
					});
				}
			}
			const rememberedRate = this.store.settings.rememberPlayback
				? this.store.settings.lastRate ||
					this.store.settings.defaultSpeed ||
					1.0
				: this.store.settings.defaultSpeed || 1.0;
			const savedRate = this.store.settings.rememberPlayback
				? rememberedRate
				: meta.lastRate !== undefined
				? meta.lastRate
				: rememberedRate;
			this.store.updateVideoMetadata(v, {
				lastRate: savedRate,
				lastSrc: v.currentSrc || v.src || "",
			});
			if (
				v.playbackRate !== savedRate &&
				this.store.savedPlaybackRate === undefined
			) {
				this._setRate(savedRate, false);
			}
			this.applyVideoTransform();
		} else {
			if (this.ui.lockShield) {
				this.ui.lockShield.style.display = "none";
			}
			if (this.ui.brightnessOverlay) {
				this.ui.brightnessOverlay.style.opacity = "0";
			}
			if (this.store.isScreenLocked) {
				this.store.isScreenLocked = false;
				this.ui.wrap?.classList?.remove("locked");
				if (this.ui.lockBtn) {
					this.ui.lockBtn.replaceChildren?.(this.ui.getIcon?.("unlock"));
					this.ui.lockBtn.setAttribute?.("aria-label", "Lock gestures");
					this.ui.lockBtn.setAttribute?.("aria-pressed", "false");
				}
			}
			this.store.timers.hideGrace = setTimeout(() => {
				if (!this.store.activeVideo && this.ui.wrap) {
					this.ui.wrap.style.display = "none";
				}
			}, MVC_CONFIG.HIDE_GRACE_PERIOD_MS) as any;
		}
	}

	// ── UI ↔ video attachment ───────────────────────────────────────────────
	public attachUIToVideo(video: HTMLVideoElement) {
		if (!this.ui.wrap) return;
		const container = getFullscreenContainer();

		if (container && container.isConnected) {
			container.appendChild(this.ui.wrap);
		} else {
			document.body.appendChild(this.ui.wrap);
		}

		// display:block only re-arms the wrap; it stays at opacity 0 and, until
		// showUI() adds `mvc-shown`, its contents take no pointer events.
		this.ui.wrap.style.display = "block";
		this.throttledReposition();

		VIDEO_LISTENED_EVENTS.forEach((ev) => {
			video.removeEventListener(ev, this);
			video.addEventListener(ev, this);
		});
		this.emitTimeUpdate(video);
	}

	public emitTimeUpdate(v: HTMLVideoElement) {
		if (!v) return;
		let buffered = 0;
		if (v.buffered && v.buffered.length > 0) {
			try {
				buffered = v.buffered.end(v.buffered.length - 1);
			} catch {}
		}
		this.eventBus.emit("video:time-update", {
			currentTime: v.currentTime || 0,
			duration: v.duration || 0,
			buffered,
		});
	}

	// ── Event Listener interface ────────────────────────────────────────────
	public handleEvent(event: Event) {
		switch (event.type) {
			case "ended":
				if (this.store.activeVideo) {
					this.store.saveVideoPosition(this.store.activeVideo);
				}
				break;
			case "play":
				if (this.store.activeVideo) {
					this.emitTimeUpdate(this.store.activeVideo);
					const targetRate = this.store.settings.rememberPlayback
						? this.store.settings.lastRate ||
							this.store.settings.defaultSpeed ||
							1.0
						: this.store.getVideoMetadata(this.store.activeVideo).lastRate ||
							this.store.settings.defaultSpeed ||
							1.0;
					if (
						this.store.activeVideo.playbackRate !== targetRate &&
						this.store.savedPlaybackRate === undefined
					) {
						this._setRate(targetRate, false);
					}
				}
				this.eventBus.emit("video:play-state-changed", { playing: true });
				this.eventBus.emit("control:visibility-requested", { visible: true });
				break;
			case "pause":
				if (this.store.activeVideo) {
					this.store.saveVideoPosition(this.store.activeVideo);
					this.emitTimeUpdate(this.store.activeVideo);
				}
				this.eventBus.emit("video:play-state-changed", { playing: false });
				break;
			case "loadstart": {
				const video = this.store.activeVideo;
				if (video) {
					const currentSrc = video.currentSrc || video.src || "";
					const meta = this.store.getVideoMetadata(video);
					if (meta.lastSrc !== undefined && meta.lastSrc !== currentSrc) {
						meta.transform = { ratio: "fit", zoom: 1, rot: 0 };
						this.store.settings.transform = meta.transform;
						this.applyVideoTransform();
						this.eventBus.emit("video:transform-need-update", undefined);
						this.store._rateOverrideCount = 0;

						const savedTime = this.store.getVideoPosition(video);
						if (savedTime > 0) {
							const applyRestore = () => {
								if (
									this.store.activeVideo === video &&
									this.store.settings.rememberPlayback
								) {
									if (video.currentTime < savedTime) {
										video.currentTime = savedTime;
									}
								}
							};
							if (video.readyState >= 1) {
								applyRestore();
							} else {
								video.addEventListener("loadedmetadata", applyRestore, {
									once: true,
								});
							}
						}
					}
					meta.lastSrc = currentSrc;
				}
				break;
			}
			case "loadedmetadata":
				// videoWidth/Height are only known now — the fit-scale depends on them
				if (this.store.settings.transform?.rot) this.applyVideoTransform();
				if (this.store.activeVideo) this.emitTimeUpdate(this.store.activeVideo);
				break;
			case "durationchange":
			case "progress":
			case "seeking":
			case "seeked":
			case "timeupdate":
				if (this.store.activeVideo) {
					this.emitTimeUpdate(this.store.activeVideo);
					const now = Date.now();
					const meta = this.store.getVideoMetadata(this.store.activeVideo);
					const lastSave = meta.lastPositionSave || 0;
					if (now - lastSave > MVC_CONFIG.POSITION_SAVE_INTERVAL_MS) {
						this.store.saveVideoPosition(this.store.activeVideo);
						this.store.updateVideoMetadata(this.store.activeVideo, {
							lastPositionSave: now,
						});
					}
				}
				break;
			case "ratechange": {
				const video = this.store.activeVideo;
				if (video) {
					const currentRate = video.playbackRate;
					this.eventBus.emit("video:rate-changed", { rate: currentRate });

					if (this.store.savedPlaybackRate === undefined) {
						this.eventBus.emit("control:visibility-requested", {
							visible: true,
						});
					}

					const meta = this.store.getVideoMetadata(video);
					if (meta.lastRate === undefined) {
						meta.lastRate = this.store.settings.rememberPlayback
							? this.store.settings.lastRate ||
								this.store.settings.defaultSpeed ||
								1.0
							: currentRate;
					}

					if (currentRate !== meta.lastRate) {
						if (!video.paused) {
							if (this.store._rateOverrideCount < 3) {
								this.store._rateOverrideCount++;
								this._setRate(meta.lastRate, false);
							} else {
								console.warn(
									"[MVC] Stopped rate override loop. Site is enforcing speed:",
									currentRate,
								);
								this.eventBus.emit("ui:toast", {
									message: "Playback rate overridden by website",
								});
							}
						} else {
							if (!this.store.settings.rememberPlayback) {
								meta.lastRate = currentRate;
							}
						}
					} else {
						this.store._rateOverrideCount = 0;
					}
				}
				break;
			}
			case "click":
				this.handleVideoClick();
				break;
		}
	}

	private handleVideoClick() {
		if (this.store.isDoubleTapping) return;

		const isGestureInteracting =
			this.store.savedPlaybackRate !== undefined ||
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
				const isFaded = this.ui.wrap.style.opacity !== "1";
				if (isFaded) {
					this.eventBus.emit("control:visibility-requested", {
						visible: true,
						force: true,
					});
				} else {
					this.eventBus.emit("control:visibility-requested", {
						visible: false,
					});
				}
			}
			this.store.timers.videoClick = undefined;
		}, MVC_CONFIG.CLICK_DELAY) as any;
	}

	// ── Positioning ─────────────────────────────────────────────────────────
	/**
	 * `wrap` itself is never positioned. Both of its children — `.mvc-top-bar`
	 * and, until it moved out, the lock shield — are `position: fixed`, so
	 * wrap's own left/top could never move anything on screen. What genuinely
	 * has to track the video is the set of overlays that copy its bounding
	 * rect: the brightness overlay, the lock shield and the frame brackets.
	 */
	public throttledReposition() {
		if (this.store.isTicking) return;
		this.store.isTicking = true;
		requestAnimationFrame(() => {
			this.ui.updateBrightnessOverlayPosition();
			this.ui.updateTopBarPosition?.();
			this.store.isTicking = false;
		});
	}

	public onViewportChange() {
		if (this.store.activeVideo) this.throttledReposition();
	}

	// ── Actions ─────────────────────────────────────────────────────────────
	public _setRate(rate: number, saveToSettings = true) {
		if (!this.store.activeVideo) return;
		this.store.activeVideo.playbackRate = rate;
		this.store.updateVideoMetadata(this.store.activeVideo, { lastRate: rate });
		if (saveToSettings) {
			this.store.saveSetting("lastRate", rate);
			this.store._rateOverrideCount = 0;
		}
	}

	public handlePlayPauseClick() {
		const video = this.store.activeVideo;
		if (!video) return;
		if (video.paused || video.ended) {
			const expectedRate = this.store.settings.rememberPlayback
				? this.store.settings.lastRate || this.store.settings.defaultSpeed
				: this.store.settings.defaultSpeed;
			this._setRate(expectedRate, false);
			if (video.ended) {
				video.currentTime = 0;
			}
			video.play().catch(() => {});
		} else {
			video.pause();
		}
	}

	public doSkip(dir: number, seconds: number) {
		const video = this.store.activeVideo;
		if (video) {
			if (Number.isNaN(video.duration) || video.duration === 0) return;
			video.currentTime = clampTime(
				video.currentTime + dir * seconds,
				video.duration,
			);
		}
	}

	/**
	 * Scale needed so a rotated video still fills its layout box.
	 *
	 * Rotating alone makes a portrait clip in a landscape box *worse*: the
	 * letterboxed strip just turns on its side. Rotated 90°, the rendered
	 * content's footprint is (h × w), so scale by whatever makes that fit the
	 * original box.
	 *
	 * ponytail: assumes object-fit:contain framing — exact for "fit",
	 * approximate for fill/stretch. Good enough; revisit if it looks wrong.
	 */
	public getRotationFitScale(v: HTMLVideoElement, rot: number): number {
		if (rot % 180 === 0) return 1;
		const W = v.clientWidth;
		const H = v.clientHeight;
		const vw = v.videoWidth;
		const vh = v.videoHeight;
		if (!W || !H || !vw || !vh) return 1;

		const boxAspect = W / H;
		const vidAspect = vw / vh;
		// Rendered content size under object-fit: contain
		const [wc, hc] =
			vidAspect > boxAspect ? [W, W / vidAspect] : [H * vidAspect, H];
		if (!wc || !hc) return 1;
		// After a quarter turn the footprint is hc wide by wc tall
		return Math.min(W / hc, H / wc);
	}

	public applyVideoTransform() {
		if (!this.store.activeVideo) return;
		const { ratio, zoom } = this.store.settings.transform;
		const rot = this.store.settings.transform.rot || 0;

		const isDefault = ratio === "fit" && zoom === 1 && rot === 0;
		const meta = this.store.getVideoMetadata(this.store.activeVideo);

		if (isDefault) {
			if (meta.originalTransform !== undefined) {
				this.store.activeVideo.style.transform = meta.originalTransform;
				this.store.updateVideoMetadata(this.store.activeVideo, {
					originalTransform: undefined,
				});
			}
			if (meta.originalObjectFit !== undefined) {
				this.store.activeVideo.style.objectFit = meta.originalObjectFit;
				this.store.updateVideoMetadata(this.store.activeVideo, {
					originalObjectFit: undefined,
				});
			}
			return;
		}

		let origTransform = meta.originalTransform;
		if (origTransform === undefined) {
			origTransform = this.store.activeVideo.style.transform || "";
			this.store.updateVideoMetadata(this.store.activeVideo, {
				originalTransform: origTransform,
			});
		}
		let origObjectFit = meta.originalObjectFit;
		if (origObjectFit === undefined) {
			origObjectFit = this.store.activeVideo.style.objectFit || "";
			this.store.updateVideoMetadata(this.store.activeVideo, {
				originalObjectFit: origObjectFit,
			});
		}

		this.store.activeVideo.style.objectFit =
			ratio === "fit" ? "contain" : ratio === "fill" ? "cover" : "fill";

		const fit = this.getRotationFitScale(this.store.activeVideo, rot);
		const rotPart = rot ? ` rotate(${rot}deg)` : "";
		this.store.activeVideo.style.transform =
			`${origTransform}${rotPart} scale(${zoom * fit})`.trim();
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
			this.ui.frameEl,
			this.ui.lockShield,
			this.ui.settingsSheet?.dom,
		];
		uiElements.forEach((el) => {
			if (el) container.appendChild(el);
		});
		if (this.store.activeVideo) this.attachUIToVideo(this.store.activeVideo);
		this.guardianCheck();
	}

	public guardianCheck() {
		if (!this.store.activeVideo || !this.ui.wrap) return;
		const expectedParent = getFullscreenContainer();
		if (
			expectedParent &&
			(!this.ui.wrap.isConnected ||
				this.ui.wrap.parentElement !== expectedParent)
		) {
			this.attachUIToVideo(this.store.activeVideo);
		}
	}
}
