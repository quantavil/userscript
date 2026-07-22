// src/ui/UIManager.ts
import { MVC_CONFIG } from "../config";
import type { StateStore } from "../core/StateStore";
import type { EventBus } from "../events/EventBus";
import {
	clamp,
	getFullscreenContainer,
	preventPropagation,
	vibrate,
} from "../utils";
import { type IconName, getSvgIcon } from "./icons";
import { SettingsSheet } from "./panels/SettingsSheet";
import { SpeedStepper } from "./panels/SpeedStepper";

export class UIManager {
	public wrap: HTMLDivElement | null = null;
	public stepper: SpeedStepper | null = null;
	public settingsBtn: HTMLButtonElement | null = null;
	public pipBtn: HTMLButtonElement | null = null;
	public lockBtn: HTMLButtonElement | null = null;
	public ratioBtn: HTMLButtonElement | null = null;
	public lockShield: HTMLDivElement | null = null;
	public settingsSheet: SettingsSheet | null = null;
	public backdrop: HTMLDivElement | null = null;
	public toast: HTMLDivElement | null = null;
	public gestureOverlay: HTMLDivElement | null = null;
	public doubleTapContainer: HTMLDivElement | null = null;
	public doubleTapLeftPanel: HTMLDivElement | null = null;
	public doubleTapRightPanel: HTMLDivElement | null = null;
	public doubleTapLeftText: HTMLDivElement | null = null;
	public doubleTapRightText: HTMLDivElement | null = null;

	// Collapsible controls
	public controlsRow: HTMLDivElement | null = null;
	public collapseBtn: HTMLButtonElement | null = null;

	// Volume bar
	public volumeBar: HTMLDivElement | null = null;
	public volumeFill: HTMLDivElement | null = null;
	public volumeIcon: HTMLDivElement | null = null;
	public volumeValue: HTMLDivElement | null = null;

	// Brightness bar & overlay
	public brightnessOverlay: HTMLDivElement | null = null;
	public brightnessBar: HTMLDivElement | null = null;
	public brightnessFill: HTMLDivElement | null = null;
	public brightnessIcon: HTMLDivElement | null = null;
	public brightnessValue: HTMLDivElement | null = null;

	constructor(
		private readonly eventBus: EventBus,
		public readonly store: StateStore,
	) {
		this.setupSubscriptions();
	}

	public init() {
		this.createMainUI();
		this.attachGlobalListeners();
	}

	private setupSubscriptions() {
		this.eventBus.on("control:visibility-requested", ({ visible, force }) => {
			if (visible) this.showUI(force);
			else this.hideUI();
		});
		this.eventBus.on("ui:toast", ({ message }) => this.showToast(message));
		this.eventBus.on("ui:gesture-overlay", (payload) => {
			if (payload) {
				this.showGestureOverlay(payload.text, payload.subText);
			} else {
				this.hideGestureOverlay();
			}
		});
		this.eventBus.on("video:rate-changed", () => this.updateSpeedDisplay());
		this.eventBus.on("video:play-state-changed", () => {
			this.updateSpeedDisplay();
		});
		this.eventBus.on("video:transform-need-update", () => {
			this.updateSettingsTransformUI();
			this.updateBrightnessOverlayPosition();
		});
		this.eventBus.on("video:active-changed", (video) => {
			if (video) {
				this.updateSpeedDisplay();
				this.updateSettingsTransformUI();
				this.updateBrightnessOverlayPosition();
			}
		});
		this.eventBus.on("settings:changed", ({ key }) => {
			if (key !== "transform") {
				if (this.settingsSheet) this.settingsSheet.update();
			} else {
				this.updateSettingsTransformUI();
				this.updateBrightnessOverlayPosition();
			}
		});
		this.eventBus.on("video:double-tap-skipped", ({ side, x, y, seconds }) => {
			this.showDoubleTapOverlay(side, x, y, seconds);
		});
		this.eventBus.on("ui:volume-changed", ({ volume }) => {
			this.showVolumeBar(volume);
		});
		this.eventBus.on("ui:brightness-changed", ({ brightness }) => {
			this.showBrightness(brightness);
		});
	}

	// ── Primitive builders ──────────────────────────────────────────────────
	public createEl<K extends keyof HTMLElementTagNameMap>(
		tag: K,
		className?: string,
		props: Record<string, any> = {},
	): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		if (className) el.className = className;
		for (const [k, v] of Object.entries(props)) {
			if (k === "style") {
				Object.assign(el.style, v);
			} else if (k === "role" || k.startsWith("aria-")) {
				el.setAttribute(k, v);
			} else {
				(el as any)[k] = v;
			}
		}
		return el;
	}

	public getIcon(name: IconName): SVGSVGElement {
		return getSvgIcon(name);
	}

	public isAnyMenuOpen(): boolean {
		return (
			this.settingsSheet !== null &&
			this.settingsSheet.dom.classList.contains("visible")
		);
	}

	// ── Main UI layout ────────────────────────────────────────────────────────
	public createMainUI() {
		const wrap = this.createEl("div", "mvc-ui-wrap");
		const backdrop = this.createEl("div", "mvc-backdrop");
		const toast = this.createEl("div", "mvc-toast", {
			role: "status",
			"aria-live": "polite",
		});
		const gestureOverlay = this.createEl("div", "mvc-gesture-overlay", {
			role: "status",
			"aria-live": "polite",
		});

		this.wrap = wrap;
		this.backdrop = backdrop;
		this.toast = toast;
		this.gestureOverlay = gestureOverlay;

		preventPropagation(backdrop);

		// Make sure wrap doesn't swallow touches for standard video control gestures
		wrap.style.cssText =
			"position:fixed; inset:0; z-index:2147483647; pointer-events:none; display:none; opacity:0; transition:opacity .35s ease;";

		// Append full-screen components directly
		const container = getFullscreenContainer();
		container.append(backdrop, toast, gestureOverlay);

		// Volume bar (right-side vertical pill)
		const volume = this.buildSideBar("volume", container);
		this.volumeBar = volume.bar;
		this.volumeFill = volume.fill;
		this.volumeIcon = volume.icon;
		this.volumeValue = volume.value;

		// Brightness Overlay (black backdrop with variable opacity)
		const brightnessOverlay = this.createEl("div", "mvc-brightness-overlay");
		container.appendChild(brightnessOverlay);
		this.brightnessOverlay = brightnessOverlay;

		// Brightness bar (left-side vertical pill)
		const brightness = this.buildSideBar("brightness", container);
		this.brightnessBar = brightness.bar;
		this.brightnessFill = brightness.fill;
		this.brightnessIcon = brightness.icon;
		this.brightnessValue = brightness.value;

		// Create Double Tap UI Elements — YouTube style
		const doubleTapContainer = this.createEl("div", "mvc-doubletap-container");
		this.doubleTapContainer = doubleTapContainer;
		doubleTapContainer.style.cssText =
			"position:fixed; pointer-events:none; display:none; z-index:2147483646; overflow:hidden;";

		const buildPanel = (dir: "left" | "right") => {
			const panel = this.createEl("div", `mvc-doubletap-panel ${dir}`);
			const inner = this.createEl("div", "mvc-doubletap-inner");
			const chevrons = this.createEl("div", "mvc-doubletap-chevrons");
			const icon = dir === "left" ? "❮" : "❯";
			for (let i = 0; i < 3; i++) {
				const ch = this.createEl("span", "mvc-doubletap-chevron");
				ch.textContent = icon;
				chevrons.appendChild(ch);
			}
			const text = this.createEl("div", "mvc-doubletap-text");
			// Left: ❮❮❮ 10s | Right: 10s ❯❯❯
			if (dir === "left") {
				inner.append(chevrons, text);
			} else {
				inner.append(text, chevrons);
			}
			panel.appendChild(inner);
			return { panel, text };
		};

		const { panel: leftPanel, text: leftText } = buildPanel("left");
		const { panel: rightPanel, text: rightText } = buildPanel("right");

		doubleTapContainer.append(leftPanel, rightPanel);
		container.append(doubleTapContainer);

		this.doubleTapLeftPanel = leftPanel;
		this.doubleTapRightPanel = rightPanel;
		this.doubleTapLeftText = leftText;
		this.doubleTapRightText = rightText;

		// Mount modular Stepper & PiP / Settings Buttons
		this.stepper = new SpeedStepper(this.eventBus, this);
		this.stepper.dom.style.pointerEvents = "auto"; // allow clicks
		preventPropagation(this.stepper.dom);
		wrap.appendChild(this.stepper.dom);

		// Check PiP support (either native Picture-in-Picture API, video prototype request, or iOS Webkit Presentation Mode)
		const isPipSupported = !!(
			document.pictureInPictureEnabled ||
			"requestPictureInPicture" in HTMLVideoElement.prototype ||
			"webkitSupportsPresentationMode" in HTMLVideoElement.prototype
		);
		if (isPipSupported) {
			this.pipBtn = document.createElement("button");
			this.pipBtn.className = "mvc-pip-btn";
			this.pipBtn.setAttribute("aria-label", "Picture in Picture");
			this.pipBtn.style.pointerEvents = "auto";
			this.pipBtn.appendChild(this.getIcon("pip"));
			this.pipBtn.onclick = (e) => {
				e.stopPropagation();
				this.resetCollapseTimer();
				this.togglePiP();
			};
			preventPropagation(this.pipBtn);
		}

		this.settingsBtn = document.createElement("button");
		this.settingsBtn.className = "mvc-settings-btn";
		this.settingsBtn.setAttribute("aria-label", "Settings");
		this.settingsBtn.style.pointerEvents = "auto";
		this.settingsBtn.appendChild(this.getIcon("settings"));
		this.settingsBtn.onclick = (e) => {
			e.stopPropagation();
			this.resetCollapseTimer();
			this.ensureSettingsSheet();
			if (this.settingsSheet) {
				this.toggleMenu(this.settingsSheet.dom, this.settingsBtn!);
			}
		};
		preventPropagation(this.settingsBtn);

		// Lock Shield
		const lockShield = this.createEl("div", "mvc-lock-shield");
		lockShield.style.display = "none";
		const blk = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			this.showUI(true);
		};
		[
			"click",
			"mousedown",
			"mouseup",
			"pointerdown",
			"pointerup",
			"dblclick",
			"touchstart",
			"touchend",
		].forEach((evt) => {
			lockShield.addEventListener(evt, blk, { capture: true, passive: false });
		});
		wrap.appendChild(lockShield);
		this.lockShield = lockShield;

		// Lock Button
		this.lockBtn = document.createElement("button");
		this.lockBtn.className = "mvc-lock-btn";
		this.lockBtn.setAttribute("aria-label", "Lock gestures");
		this.lockBtn.setAttribute("aria-pressed", "false");
		this.lockBtn.style.pointerEvents = "auto";
		this.lockBtn.appendChild(this.getIcon("unlock"));
		this.lockBtn.onclick = (e) => {
			e.stopPropagation();
			this.resetCollapseTimer();
			this.toggleScreenLock();
		};
		preventPropagation(this.lockBtn);

		// Aspect Ratio Button
		this.ratioBtn = document.createElement("button");
		this.ratioBtn.className = "mvc-ratio-btn";
		this.ratioBtn.setAttribute("aria-label", "Aspect Ratio");
		this.ratioBtn.style.pointerEvents = "auto";
		this.ratioBtn.appendChild(this.getIcon("ratio"));
		this.ratioBtn.onclick = (e) => {
			e.stopPropagation();
			this.resetCollapseTimer();
			vibrate(10);
			const ratios = ["fit", "fill", "stretch"];
			const currentRatio = this.store.settings.transform.ratio || "fit";
			const nextIndex = (ratios.indexOf(currentRatio) + 1) % ratios.length;
			const nextRatio = ratios[nextIndex];

			this.store.settings.transform.ratio = nextRatio;
			this.store.saveSetting("transform", this.store.settings.transform);
			this.eventBus.emit("video:transform-need-update", undefined);
			this.showToast(`Aspect Ratio: ${nextRatio.toUpperCase()}`);
		};
		preventPropagation(this.ratioBtn);

		// Create collapsible controls group at the top right
		const controlsGroup = this.createEl("div", "mvc-controls-group");

		const controlsRow = this.createEl("div", "mvc-controls-row collapsed");
		this.controlsRow = controlsRow;

		controlsRow.appendChild(this.ratioBtn);
		controlsRow.appendChild(this.lockBtn);
		if (this.pipBtn) {
			controlsRow.appendChild(this.pipBtn);
		}
		controlsRow.appendChild(this.settingsBtn);

		this.collapseBtn = document.createElement("button");
		this.collapseBtn.className = "mvc-collapse-btn";
		this.collapseBtn.setAttribute("aria-label", "Toggle control menu");
		this.collapseBtn.setAttribute("aria-expanded", "false");
		this.collapseBtn.style.pointerEvents = "auto";
		this.collapseBtn.appendChild(this.getIcon("chevron"));
		this.collapseBtn.onclick = (e) => {
			e.stopPropagation();
			this.toggleControlsRow();
		};
		preventPropagation(this.collapseBtn);

		controlsGroup.appendChild(controlsRow);
		controlsGroup.appendChild(this.collapseBtn);
		wrap.appendChild(controlsGroup);

		container.appendChild(wrap);
	}

	private buildSideBar(
		prefix: "volume" | "brightness",
		container: HTMLElement,
	) {
		const bar = this.createEl("div", `mvc-${prefix}-bar`);
		const icon = this.createEl("div", `mvc-${prefix}-icon`);
		const track = this.createEl("div", `mvc-${prefix}-track`);
		const fill = this.createEl("div", `mvc-${prefix}-fill`);
		const value = this.createEl("div", `mvc-${prefix}-value`);
		track.appendChild(fill);
		bar.append(icon, track, value);
		container.appendChild(bar);
		return { bar, icon, fill, value };
	}

	// Vertically centers the pill on the active video and returns its height
	private positionSideBar(bar: HTMLDivElement, side: "left" | "right") {
		const rect = this.store.activeVideo!.getBoundingClientRect();
		const barH = clamp(rect.height * 0.55, 120, 220);
		const top = rect.top + (rect.height - barH) / 2;
		const styles: Record<string, string> = {
			top: `${top}px`,
			height: `${barH}px`,
		};
		if (side === "right") {
			styles.right = `${window.innerWidth - rect.right + 14}px`;
		} else {
			styles.left = `${rect.left + 14}px`;
		}
		Object.assign(bar.style, styles);
	}

	public ensureSettingsSheet() {
		if (this.settingsSheet) return;
		this.settingsSheet = new SettingsSheet(this.eventBus, this.store, this);
		preventPropagation(this.settingsSheet.dom);

		const container = getFullscreenContainer();
		container.appendChild(this.settingsSheet.dom);
	}

	public updateSpeedDisplay() {
		if (this.stepper) {
			this.stepper.update();
		}
	}

	public toggleMenu(menuEl: HTMLElement, anchorEl: HTMLElement) {
		const isOpen = menuEl.classList.contains("visible");
		this.hideAllMenus();
		if (isOpen) return;

		menuEl.classList.add("visible");
		anchorEl.classList.add("visible");
		this.showBackdrop();

		clearTimeout(this.store.timers.hide);
	}

	public showBackdrop() {
		if (!this.backdrop) return;
		this.backdrop.classList.add("visible");
	}

	public hideAllMenus() {
		if (
			this.settingsSheet &&
			this.settingsSheet.dom.classList.contains("visible")
		) {
			this.settingsSheet.dom.classList.remove("visible");
			this.settingsBtn?.classList.remove("visible");
		}
		if (this.backdrop) this.backdrop.classList.remove("visible");
		this.eventBus.emit("control:visibility-requested", { visible: true });
		this.resetCollapseTimer();
	}

	public updateSettingsTransformUI() {
		if (
			!this.settingsSheet ||
			!this.settingsSheet.dom.classList.contains("visible")
		)
			return;
		this.settingsSheet.update();
	}

	public showToast(message: string) {
		if (!this.toast) return;
		this.toast.textContent = message;
		this.toast.classList.add("visible");
		clearTimeout(this.store.timers.toast);
		this.store.timers.toast = setTimeout(() => {
			if (this.toast) this.toast.classList.remove("visible");
		}, MVC_CONFIG.TOAST_FADE_DELAY) as any;
	}

	public showGestureOverlay(text: string, subText?: string) {
		if (!this.gestureOverlay) return;
		this.gestureOverlay.textContent = text;
		if (subText) {
			const span = document.createElement("span");
			Object.assign(span.style, {
				fontSize: "11px",
				opacity: "0.8",
				display: "block",
				marginTop: "2px",
			});
			span.textContent = subText;
			this.gestureOverlay.appendChild(span);
		}
		this.gestureOverlay.style.display = "block";
	}

	public hideGestureOverlay() {
		if (!this.gestureOverlay) return;
		this.gestureOverlay.style.display = "none";
		this.gestureOverlay.textContent = "";
	}

	private attachGlobalListeners() {
		// Capture phase: UI elements stopPropagation() on these events, which
		// would otherwise prevent taps on our own controls from counting as
		// recent user activity.
		["pointerdown", "keydown", "touchstart"].forEach((ev) =>
			window.addEventListener(
				ev,
				(e) => {
					if (!e.isTrusted) return;
					this.store.lastRealUserEvent = Date.now();
					if (
						e.type === "keydown" ||
						(this.wrap && e.target && this.wrap.contains(e.target as Node))
					) {
						this.showUI(true);
					}
				},
				{
					passive: true,
					capture: true,
					signal: this.store.abortController.signal,
				},
			),
		);

		if (this.backdrop) {
			this.backdrop.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.hideAllMenus();
			});
		}
	}

	public showUI(force = false) {
		if (
			!this.wrap ||
			!this.store.activeVideo ||
			this.store.savedPlaybackRate !== undefined
		)
			return;

		// Timeout fade guard
		const now = Date.now();
		if (
			!force &&
			now - this.store.lastRealUserEvent >= MVC_CONFIG.INTERACTION_TIMEOUT
		)
			return;

		this.wrap.style.display = "block";
		// Force reflow
		this.wrap.offsetHeight;
		this.wrap.style.opacity = "1";

		clearTimeout(this.store.timers.hide);

		const isInteracting = this.isAnyMenuOpen();

		if (!isInteracting && !this.store.activeVideo.paused) {
			this.store.timers.hide = setTimeout(
				() => this.hideUI(),
				MVC_CONFIG.UI_FADE_TIMEOUT,
			) as any;
		}
	}

	public hideUI() {
		if (!this.wrap) return;
		if (this.store.activeVideo?.paused || this.isAnyMenuOpen()) return;

		this.wrap.style.opacity = "0";
		clearTimeout(this.store.timers.hide);
		this.store.timers.hide = setTimeout(() => {
			if (this.wrap && this.wrap.style.opacity === "0") {
				this.wrap.style.display = "none";
				this.collapseControlsRow();
			}
		}, MVC_CONFIG.UI_FADE_ANIMATION_DURATION) as any;
	}

	public togglePiP() {
		const video = this.store.activeVideo;
		if (!video) return;

		try {
			if (
				video.webkitSupportsPresentationMode &&
				typeof video.webkitSetPresentationMode === "function"
			) {
				const isPip = video.webkitPresentationMode === "picture-in-picture";
				video.webkitSetPresentationMode(
					isPip ? "inline" : "picture-in-picture",
				);
			} else if (typeof video.requestPictureInPicture === "function") {
				if (document.pictureInPictureElement === video) {
					document.exitPictureInPicture().catch(() => {});
				} else {
					video.requestPictureInPicture().catch(() => {});
				}
			} else {
				this.showToast("PiP not supported on this browser");
			}
		} catch (err) {
			console.error("[MVC] PiP error:", err);
			this.showToast("Failed to toggle PiP mode");
		}
	}
	public toggleScreenLock() {
		const locked = !this.store.isScreenLocked;
		this.store.isScreenLocked = locked;
		if (this.wrap) this.wrap.classList.toggle("locked", locked);
		if (this.lockShield) {
			this.lockShield.style.display = locked ? "block" : "none";
			if (locked) this.updateBrightnessOverlayPosition();
		}
		if (this.lockBtn) {
			this.lockBtn.replaceChildren(this.getIcon(locked ? "lock" : "unlock"));
			this.lockBtn.setAttribute(
				"aria-label",
				locked ? "Unlock gestures" : "Lock gestures",
			);
			this.lockBtn.setAttribute("aria-pressed", locked ? "true" : "false");
		}
		if (locked) this.hideAllMenus();
		this.showToast(locked ? "Gestures locked" : "Gestures unlocked");
		this.showUI(true);
	}

	public showDoubleTapOverlay(
		side: "left" | "right",
		x: number,
		y: number,
		seconds: number,
	) {
		if (!this.doubleTapContainer || !this.store.activeVideo) return;

		const rect = this.store.activeVideo.getBoundingClientRect();
		Object.assign(this.doubleTapContainer.style, {
			top: `${rect.top}px`,
			left: `${rect.left}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
			display: "block",
		});

		const activePanel =
			side === "left" ? this.doubleTapLeftPanel : this.doubleTapRightPanel;
		const inactivePanel =
			side === "left" ? this.doubleTapRightPanel : this.doubleTapLeftPanel;
		const activeText =
			side === "left" ? this.doubleTapLeftText : this.doubleTapRightText;

		if (inactivePanel) inactivePanel.classList.remove("visible");
		if (activeText) activeText.textContent = `${seconds}s`;

		if (activePanel) {
			activePanel.classList.add("visible");
		}

		clearTimeout(this.store.timers.doubleTapUIHide);
		this.store.timers.doubleTapUIHide = setTimeout(() => {
			if (this.doubleTapLeftPanel)
				this.doubleTapLeftPanel.classList.remove("visible");
			if (this.doubleTapRightPanel)
				this.doubleTapRightPanel.classList.remove("visible");
			if (this.doubleTapContainer)
				this.doubleTapContainer.style.display = "none";
		}, MVC_CONFIG.DOUBLE_TAP_UI_HIDE_DELAY);
	}

	public showVolumeBar(volume: number) {
		if (
			!this.volumeBar ||
			!this.volumeFill ||
			!this.volumeIcon ||
			!this.volumeValue
		)
			return;
		if (!this.store.activeVideo) return;

		this.positionSideBar(this.volumeBar, "right");

		const pct = Math.round(volume * 100);
		this.volumeFill.style.height = `${Math.min(pct, 100)}%`;
		this.volumeValue.textContent = `${pct}%`;
		this.volumeIcon.textContent =
			volume === 0 ? "🔇" : volume < 0.4 ? "🔈" : volume < 0.7 ? "🔉" : "🔊";

		this.volumeBar.classList.add("visible");

		clearTimeout(this.store.timers.volumeBarHide);
		this.store.timers.volumeBarHide = setTimeout(() => {
			if (this.volumeBar) this.volumeBar.classList.remove("visible");
		}, MVC_CONFIG.SLIDER_UI_HIDE_DELAY) as any;
	}

	public showBrightness(brightness: number) {
		if (
			!this.brightnessOverlay ||
			!this.brightnessBar ||
			!this.brightnessFill ||
			!this.brightnessIcon ||
			!this.brightnessValue
		)
			return;
		if (!this.store.activeVideo) return;

		const opacity = 1 - brightness;
		this.brightnessOverlay.style.opacity = `${opacity}`;
		this.updateBrightnessOverlayPosition();

		this.positionSideBar(this.brightnessBar, "left");

		const pct = Math.round(brightness * 100);
		this.brightnessFill.style.height = `${pct}%`;
		this.brightnessValue.textContent = `${pct}%`;
		this.brightnessIcon.textContent =
			brightness < 0.4 ? "🌑" : brightness < 0.7 ? "🌓" : "☀️";

		this.brightnessBar.classList.add("visible");

		clearTimeout(this.store.timers.brightnessBarHide);
		this.store.timers.brightnessBarHide = setTimeout(() => {
			if (this.brightnessBar) this.brightnessBar.classList.remove("visible");
		}, MVC_CONFIG.SLIDER_UI_HIDE_DELAY) as any;
	}

	public updateBrightnessOverlayPosition() {
		if (!this.store.activeVideo) return;
		const rect = this.store.activeVideo.getBoundingClientRect();
		if (this.brightnessOverlay) {
			Object.assign(this.brightnessOverlay.style, {
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
			});
		}
		if (this.lockShield) {
			Object.assign(this.lockShield.style, {
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
			});
		}
	}

	public expandControlsRow() {
		if (!this.controlsRow) return;
		this.controlsRow.classList.remove("collapsed");
		this.collapseBtn?.parentElement?.classList.add("expanded");
		this.collapseBtn?.setAttribute("aria-expanded", "true");
		this.resetCollapseTimer();
	}

	public collapseControlsRow() {
		if (!this.controlsRow) return;
		this.controlsRow.classList.add("collapsed");
		this.collapseBtn?.parentElement?.classList.remove("expanded");
		this.collapseBtn?.setAttribute("aria-expanded", "false");
		this.clearCollapseTimer();
	}

	public toggleControlsRow() {
		vibrate(10);
		if (this.controlsRow?.classList.contains("collapsed")) {
			this.expandControlsRow();
		} else {
			this.collapseControlsRow();
		}
		this.showUI(true);
	}

	public resetCollapseTimer() {
		this.clearCollapseTimer();
		if (this.isAnyMenuOpen()) return;
		this.store.timers.collapse = setTimeout(() => {
			this.collapseControlsRow();
		}, MVC_CONFIG.CONTROLS_COLLAPSE_DELAY) as any;
	}

	public clearCollapseTimer() {
		if (this.store.timers.collapse) {
			clearTimeout(this.store.timers.collapse);
			this.store.timers.collapse = null;
		}
	}
}
