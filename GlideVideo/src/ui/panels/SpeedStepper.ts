import { MVC_CONFIG } from "../../config";
import type { EventBus } from "../../events/EventBus";
import { clamp, vibrate } from "../../utils";
import { UIComponent } from "../UIComponent";
import type { UIManager } from "../UIManager";

export class SpeedStepper extends UIComponent {
	private stepperPill!: HTMLDivElement;
	private fabBtn!: HTMLButtonElement;
	private decBtn!: HTMLButtonElement;
	private incBtn!: HTMLButtonElement;
	private valEl!: HTMLSpanElement;

	private holdTimeout?: any;
	private holdInterval?: any;
	private longPressTimeout?: any;
	private wasLongPress = false;
	private unsubscribers: Array<() => void> = [];

	constructor(
		private readonly eventBus: EventBus,
		private readonly ui: UIManager,
	) {
		super();
		this.element = this.render();
		this.setupSubscriptions();
	}

	protected render(): HTMLDivElement {
		const wrap = document.createElement("div");
		wrap.className = "mvc-speed-control-wrap";

		// Standard Stepper Pill
		this.stepperPill = document.createElement("div");
		this.stepperPill.className = "mvc-stepper-pill";

		this.decBtn = document.createElement("button");
		this.decBtn.className = "mvc-stepper-pill-btn mvc-btn-dec";
		this.decBtn.textContent = "−";
		this.setupButtonHold(this.decBtn, -1);

		this.valEl = document.createElement("span");
		this.valEl.className = "mvc-stepper-pill-val";
		this.setupValHandlers(this.valEl);

		this.incBtn = document.createElement("button");
		this.incBtn.className = "mvc-stepper-pill-btn mvc-btn-inc";
		this.incBtn.textContent = "+";
		this.setupButtonHold(this.incBtn, 1);

		this.stepperPill.append(this.decBtn, this.valEl, this.incBtn);

		// Minimal Speed FAB (circular button)
		this.fabBtn = document.createElement("button");
		this.fabBtn.className = "mvc-speed-fab";
		this.fabBtn.setAttribute("aria-label", "Speed control");
		this.setupFabHandlers(this.fabBtn);

		wrap.append(this.stepperPill, this.fabBtn);

		this.updateLayout();
		this.update();

		return wrap;
	}

	private setupSubscriptions() {
		this.unsubscribers.push(
			this.eventBus.on("settings:changed", ({ key }) => {
				if (key === "minimalSpeedFab") {
					this.updateLayout();
					this.update();
				}
			}),
		);
	}

	public updateLayout() {
		const isMinimal = !!this.ui.store.settings.minimalSpeedFab;
		if (isMinimal) {
			this.stepperPill.style.display = "none";
			this.fabBtn.style.display = "flex";
		} else {
			this.stepperPill.style.display = "flex";
			this.fabBtn.style.display = "none";
		}
	}

	/**
	 * Always the speed, never the play state — a ▶/Replay glyph here made the
	 * control jump between two meanings in the corner of the screen. Play/pause
	 * feedback goes to the toast instead.
	 */
	public update() {
		const rate = this.ui.store.activeVideo?.playbackRate ?? 1.0;
		const text = `${rate.toFixed(this.ui.store.settings.minimalSpeedFab ? 1 : 2)}x`;
		this.valEl.textContent = text;
		this.fabBtn.textContent = text;
	}

	private cycleFabSpeed() {
		const video = this.ui.store.activeVideo;
		const currentRate = video ? video.playbackRate : MVC_CONFIG.SPEED_DEFAULT;
		let nextRate =
			Math.round((currentRate + MVC_CONFIG.FAB_SPEED_STEP) * 10) / 10;

		if (
			nextRate > MVC_CONFIG.FAB_SPEED_MAX + 0.001 ||
			currentRate < MVC_CONFIG.FAB_SPEED_MIN - 0.001
		) {
			nextRate = MVC_CONFIG.FAB_SPEED_MIN;
		}

		this.eventBus.emit("video:rate-change-requested", {
			rate: nextRate,
			saveToSettings: true,
		});
		vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
		this.ui.showToast(`Speed: ${nextRate.toFixed(1)}x`);
		this.update();
	}

	private setupFabHandlers(btn: HTMLButtonElement) {
		let isLongPress = false;

		btn.addEventListener("pointerdown", (e) => {
			e.stopPropagation();
			e.preventDefault();
			this.ui.showUI(true);
			isLongPress = false;

			this.longPressTimeout = setTimeout(() => {
				isLongPress = true;
				vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
				this.eventBus.emit("video:rate-change-requested", {
					rate: MVC_CONFIG.SPEED_DEFAULT,
					saveToSettings: true,
				});
				this.ui.showToast("Speed reset to 1.00x");
				this.update();
			}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
		});

		const cancelLongPress = () => {
			clearTimeout(this.longPressTimeout);
		};

		btn.addEventListener("pointerup", (e) => {
			e.stopPropagation();
			e.preventDefault();
			cancelLongPress();

			if (isLongPress) {
				isLongPress = false;
				return;
			}
			this.cycleFabSpeed();
		});

		btn.addEventListener("pointerleave", cancelLongPress);
		btn.addEventListener("pointercancel", cancelLongPress);
	}

	private adjustSpeed(delta: number, saveToSettings: boolean) {
		const video = this.ui.store.activeVideo;
		if (!video) return;

		const currentRate = video.playbackRate;
		const newRate = clamp(
			currentRate + delta,
			MVC_CONFIG.SPEED_MIN,
			MVC_CONFIG.SPEED_MAX,
		);

		this.eventBus.emit("video:rate-change-requested", {
			rate: newRate,
			saveToSettings,
		});
		this.update();

		if (saveToSettings) {
			this.ui.showToast(`Speed: ${newRate.toFixed(2)}x`);
		}
	}

	private setupButtonHold(btn: HTMLButtonElement, dir: number) {
		let isHolding = false;
		let elapsed = 0;

		const startHold = (e: PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();
			this.ui.showUI(true);
			vibrate(10);

			isHolding = false;
			elapsed = 0;

			this.holdTimeout = setTimeout(() => {
				isHolding = true;
				this.holdInterval = setInterval(() => {
					elapsed += MVC_CONFIG.SPEED_HOLD_INTERVAL_MS;
					const step = elapsed > 1000 ? 0.1 : MVC_CONFIG.SPEED_HOLD_STEP;
					this.adjustSpeed(dir * step, false);
					vibrate(5);
				}, MVC_CONFIG.SPEED_HOLD_INTERVAL_MS);
			}, MVC_CONFIG.SPEED_HOLD_INITIAL_DELAY_MS);
		};

		const endHold = (e: PointerEvent) => {
			e.stopPropagation();
			clearTimeout(this.holdTimeout);
			clearInterval(this.holdInterval);

			if (!isHolding && e.type === "pointerup") {
				this.adjustSpeed(dir * MVC_CONFIG.SPEED_TAP_STEP, true);
			} else if (isHolding) {
				const video = this.ui.store.activeVideo;
				if (video) {
					this.ui.store.saveSetting("lastRate", video.playbackRate);
					this.ui.showToast(`Speed: ${video.playbackRate.toFixed(2)}x`);
				}
			}

			isHolding = false;
			clearTimeout(this.ui.store.timers.hide);
			this.ui.store.timers.hide = setTimeout(
				() => this.ui.hideUI(),
				MVC_CONFIG.UI_FADE_TIMEOUT,
			) as any;
		};

		btn.addEventListener("pointerdown", startHold);
		btn.addEventListener("pointerup", endHold);
		btn.addEventListener("pointerleave", endHold);
		btn.addEventListener("pointercancel", endHold);
	}

	private setupValHandlers(el: HTMLSpanElement) {
		el.addEventListener("pointerdown", (e) => {
			e.stopPropagation();
			this.ui.showUI(true);
			this.wasLongPress = false;

			this.longPressTimeout = setTimeout(() => {
				const video = this.ui.store.activeVideo;
				if (video) {
					this.wasLongPress = true;
					vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
					this.eventBus.emit("video:rate-change-requested", {
						rate: 1.0,
						saveToSettings: true,
					});
					this.update();
					this.ui.showToast("Speed reset to 1.00x");
				}
			}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
		});

		const cancelLongPress = () => {
			clearTimeout(this.longPressTimeout);
		};

		el.addEventListener("pointerup", (e) => {
			e.stopPropagation();
			cancelLongPress();
			if (this.wasLongPress) {
				this.wasLongPress = false;
				return;
			}
			const video = this.ui.store.activeVideo;
			if (video) {
				// Read before the toggle — the state flips asynchronously
				const willPlay = video.paused || video.ended;
				this.eventBus.emit("video:play-pause-requested", undefined);
				vibrate(10);
				this.ui.showToast(willPlay ? "Playing" : "Paused");
			}
		});

		el.addEventListener("pointerleave", cancelLongPress);
		el.addEventListener("pointercancel", cancelLongPress);
	}

	public destroy() {
		this.unsubscribers.forEach((unsub) => unsub());
		this.unsubscribers = [];
		this.element.remove();
	}
}
