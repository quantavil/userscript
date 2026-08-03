// src/ui/components/ProgressBar.ts
import { MVC_CONFIG } from "../../config";
import type { EventBus } from "../../events/EventBus";
import { clamp, formatDuration, preventPropagation, vibrate } from "../../utils";
import { UIComponent } from "../UIComponent";
import type { UIManager } from "../UIManager";

export class ProgressBar extends UIComponent {
	private trackWrap!: HTMLDivElement;
	private bufTrack!: HTMLDivElement;
	private fillTrack!: HTMLDivElement;
	private thumbEl!: HTMLDivElement;
	private tooltipEl!: HTMLDivElement;

	private currentTime = 0;
	private duration = 0;
	private buffered = 0;
	private isDragging = false;
	private dragPct = 0;
	private unsubscribers: Array<() => void> = [];

	constructor(
		private readonly eventBus: EventBus,
		private readonly ui: UIManager,
	) {
		super();
		this.element = this.render();
		this.setupSubscriptions();
		this.setupPointerListeners();
	}

	protected render(): HTMLDivElement {
		const wrap = document.createElement("div");
		wrap.className = "mvc-progress-bar";

		this.trackWrap = document.createElement("div");
		this.trackWrap.className = "mvc-progress-track-wrap";

		const bgTrack = document.createElement("div");
		bgTrack.className = "mvc-progress-bg-track";

		this.bufTrack = document.createElement("div");
		this.bufTrack.className = "mvc-progress-buf-track";

		this.fillTrack = document.createElement("div");
		this.fillTrack.className = "mvc-progress-fill-track";

		this.thumbEl = document.createElement("div");
		this.thumbEl.className = "mvc-progress-thumb";

		this.tooltipEl = document.createElement("div");
		this.tooltipEl.className = "mvc-progress-tooltip";
		this.tooltipEl.style.display = "none";

		this.trackWrap.append(bgTrack, this.bufTrack, this.fillTrack, this.thumbEl, this.tooltipEl);
		wrap.append(this.trackWrap);

		preventPropagation(wrap);
		return wrap;
	}

	private setupSubscriptions() {
		this.unsubscribers.push(
			this.eventBus.on(
				"video:time-update",
				({ currentTime, duration, buffered }) => {
					this.currentTime = Number.isFinite(currentTime) ? currentTime : 0;
					this.duration = Number.isFinite(duration) ? duration : 0;
					this.buffered = Number.isFinite(buffered) ? buffered : 0;
					this.updateDisplay();
				},
			),
		);

		this.unsubscribers.push(
			this.eventBus.on("video:active-changed", (v) => {
				this.isDragging = false;
				this.trackWrap.classList.remove("dragging");
				this.tooltipEl.style.display = "none";
				if (v) {
					this.currentTime = Number.isFinite(v.currentTime) ? v.currentTime : 0;
					this.duration = Number.isFinite(v.duration) ? v.duration : 0;
					this.updateDisplay();
				}
			}),
		);

		this.unsubscribers.push(
			this.eventBus.on("settings:changed", ({ key }) => {
				if (key === "progressBarEnabled") {
					this.updateDisplay();
				}
			}),
		);
	}

	public updateDisplay() {
		if (this.ui.store.settings.progressBarEnabled === false) {
			this.element.style.display = "none";
			return;
		}
		this.element.style.display = "";

		if (this.isDragging) return;
		this.tooltipEl.style.display = "none";

		const duration = Number.isFinite(this.duration) ? this.duration : 0;
		const pct = duration > 0 ? clamp((this.currentTime / duration) * 100, 0, 100) : 0;
		const bufPct = duration > 0 ? clamp((this.buffered / duration) * 100, 0, 100) : 0;

		this.bufTrack.style.width = `${bufPct}%`;
		this.fillTrack.style.width = `${pct}%`;
		this.thumbEl.style.left = `${pct}%`;
	}

	private setupPointerListeners() {
		const onPointerDown = (e: PointerEvent) => {
			e.stopPropagation();
			e.preventDefault();
			this.ui.showUI(true);
			this.isDragging = true;
			this.trackWrap.classList.add("dragging");
			try {
				this.trackWrap.setPointerCapture(e.pointerId);
			} catch {}

			this.updateDragPosition(e);
			vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
		};

		const onPointerMove = (e: PointerEvent) => {
			if (!this.isDragging) return;
			e.stopPropagation();
			e.preventDefault();
			this.updateDragPosition(e);
		};

		const onPointerUp = (e: PointerEvent) => {
			if (!this.isDragging) return;
			e.stopPropagation();
			e.preventDefault();
			const duration = Number.isFinite(this.duration) ? this.duration : 0;
			const targetTime = (this.dragPct / 100) * duration;
			this.endDrag(e);
			this.eventBus.emit("video:seek-requested", { time: targetTime });
			vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
			this.ui.showToast(`Seek: ${formatDuration(targetTime)} / ${formatDuration(duration)}`);
			this.updateDisplay();
		};

		const onPointerCancel = (e: PointerEvent) => {
			if (!this.isDragging) return;
			this.endDrag(e);
			this.updateDisplay();
		};

		this.trackWrap.addEventListener("pointerdown", onPointerDown);
		this.trackWrap.addEventListener("pointermove", onPointerMove);
		this.trackWrap.addEventListener("pointerup", onPointerUp);
		this.trackWrap.addEventListener("pointercancel", onPointerCancel);
		this.trackWrap.addEventListener("lostpointercapture", onPointerCancel);

		this.unsubscribers.push(() => {
			this.trackWrap.removeEventListener("pointerdown", onPointerDown);
			this.trackWrap.removeEventListener("pointermove", onPointerMove);
			this.trackWrap.removeEventListener("pointerup", onPointerUp);
			this.trackWrap.removeEventListener("pointercancel", onPointerCancel);
			this.trackWrap.removeEventListener("lostpointercapture", onPointerCancel);
		});
	}

	private endDrag(e: PointerEvent) {
		this.isDragging = false;
		this.trackWrap.classList.remove("dragging");
		this.tooltipEl.style.display = "none";
		try {
			this.trackWrap.releasePointerCapture(e.pointerId);
		} catch {}
	}

	private updateDragPosition(e: PointerEvent) {
		const rect = this.trackWrap.getBoundingClientRect();
		if (rect.width <= 0) return;

		const x = e.clientX - rect.left;
		const pct = clamp((x / rect.width) * 100, 0, 100);
		this.dragPct = pct;

		const duration = Number.isFinite(this.duration) ? this.duration : 0;
		const previewTime = (pct / 100) * duration;
		this.fillTrack.style.width = `${pct}%`;
		this.thumbEl.style.left = `${pct}%`;
		this.tooltipEl.style.left = `${pct}%`;
		this.tooltipEl.style.display = "block";
		this.tooltipEl.textContent = formatDuration(previewTime);
	}

	public destroy() {
		this.unsubscribers.forEach((unsub) => unsub());
		this.unsubscribers = [];
		this.element.remove();
	}
}
