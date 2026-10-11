import { MVC_CONFIG } from "../config";
import type { StateStore } from "../core/StateStore";
// src/gestures/PressDetector.ts
import type { EventBus } from "../events/EventBus";
import { isPointInRect, vibrate } from "../utils";

export class PressDetector {
	public inLongPressGesture = false;

	constructor(
		private readonly eventBus: EventBus,
		private readonly store: StateStore,
	) {
		// Listen to requests to cancel the booster
		this.eventBus.on("gesture:cancel-speed-boost", () => {
			this.cancelLongPressSpeedBoost();
		});
	}

	public init() {
		this.attachLongPressListeners();
	}

	public cancelLongPressSpeedBoost() {
		if (this.store.timers.longPressSpeed) {
			clearTimeout(this.store.timers.longPressSpeed);
			this.store.timers.longPressSpeed = undefined;
		}
		if (this.inLongPressGesture) {
			if (this.store.activeVideo) {
				this.eventBus.emit("video:rate-change-requested", {
					rate: this.store.savedPlaybackRate ?? 1.0,
					saveToSettings: false,
				});
				this.eventBus.emit("ui:gesture-overlay", null);
			}
			this.inLongPressGesture = false;
		}
		this.store.gestureCoordinator.release("speed_boost");
		this.store.savedPlaybackRate = undefined;
	}

	private attachLongPressListeners() {
		let startX = 0;
		let startY = 0;

		window.addEventListener(
			"pointerdown",
			(e) => {
				const video = this.store.activeVideo;
				if (!video || !this.store.canStartTouchGesture(e)) return;

				if (
					e.clientX < MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING ||
					e.clientX >
						window.innerWidth - MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING
				) {
					return;
				}

				if (!isPointInRect(e.clientX, e.clientY, video)) return;

				this.cancelLongPressSpeedBoost();
				startX = e.clientX;
				startY = e.clientY;

				this.store.timers.longPressSpeed = setTimeout(() => {
					if (!this.store.activeVideo) return;
					if (this.store.gestureCoordinator.acquire("speed_boost")) {
						this.inLongPressGesture = true;
						this.store.savedPlaybackRate = this.store.activeVideo.playbackRate;
						this.eventBus.emit("video:rate-change-requested", {
							rate: MVC_CONFIG.GESTURE_SPEED_BOOST,
							saveToSettings: false,
						});
						this.eventBus.emit("ui:gesture-overlay", {
							text: `${MVC_CONFIG.GESTURE_SPEED_BOOST}x`,
						});
						vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
					}
				}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
			},
			{ capture: true, signal: this.store.abortController.signal },
		);

		window.addEventListener(
			"pointermove",
			(e) => {
				if (
					e.pointerType !== "touch" ||
					!this.store.timers.longPressSpeed ||
					this.inLongPressGesture
				)
					return;
				const dx = e.clientX - startX;
				const dy = e.clientY - startY;
				if (
					Math.abs(dx) > MVC_CONFIG.LONG_PRESS_MOVE_TOLERANCE ||
					Math.abs(dy) > MVC_CONFIG.LONG_PRESS_MOVE_TOLERANCE
				) {
					this.cancelLongPressSpeedBoost();
				}
			},
			{
				capture: true,
				passive: true,
				signal: this.store.abortController.signal,
			},
		);

		window.addEventListener(
			"pointerup",
			(e) => {
				if (e.pointerType !== "touch") return;
				if (this.inLongPressGesture) {
					this.cancelLongPressSpeedBoost();
				} else {
					if (this.store.timers.longPressSpeed) {
						clearTimeout(this.store.timers.longPressSpeed);
						this.store.timers.longPressSpeed = undefined;
					}
				}
			},
			{ capture: true, signal: this.store.abortController.signal },
		);

		window.addEventListener(
			"pointercancel",
			(e) => {
				if (e.pointerType !== "touch") return;
				this.cancelLongPressSpeedBoost();
			},
			{ capture: true, signal: this.store.abortController.signal },
		);

		window.addEventListener(
			"contextmenu",
			(e) => {
				if (
					this.store.settings.gesturesEnabled &&
					(this.store.timers.longPressSpeed || this.inLongPressGesture)
				) {
					e.preventDefault();
					e.stopPropagation();
				}
			},
			{ capture: true, signal: this.store.abortController.signal },
		);
	}
}
