import { MVC_CONFIG } from "../../config";
import type { StateStore } from "../../core/StateStore";
import type { EventBus } from "../../events/EventBus";
import { clamp, vibrate } from "../../utils";
import { UIComponent } from "../UIComponent";
import type { UIManager } from "../UIManager";
import { Stepper } from "../components/Stepper";
import { Switch } from "../components/Switch";

export class SettingsSheet extends UIComponent {
	public defaultSpeedStepper!: Stepper;
	public skipStepper!: Stepper;
	public minimalSpeedFabSwitch!: Switch;
	public progressBarSwitch!: Switch;
	public gestureSwitch!: Switch;
	public rememberPlaybackSwitch!: Switch;
	public scrollCompatibilitySwitch!: Switch;

	constructor(
		private readonly eventBus: EventBus,
		private readonly store: StateStore,
		private readonly ui: UIManager,
	) {
		super();
		this.element = this.render();
	}

	protected render(): HTMLDivElement {
		const sheet = document.createElement("div");
		sheet.className = "mvc-settings-sheet";

		// Header
		const header = document.createElement("div");
		header.className = "mvc-settings-header";

		const title = document.createElement("div");
		title.className = "mvc-settings-title";
		title.textContent = "Settings";

		const closeBtn = document.createElement("button");
		closeBtn.className = "mvc-settings-close-btn";
		closeBtn.setAttribute("aria-label", "Close settings");
		closeBtn.appendChild(this.ui.getIcon("close"));
		closeBtn.onclick = (e) => {
			e.stopPropagation();
			vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
			this.ui.hideAllMenus();
		};

		header.append(title, closeBtn);
		sheet.appendChild(header);

		// Card Container
		const card = document.createElement("div");
		card.className = "mvc-settings-card";
		sheet.appendChild(card);

		// 1. Default Speed Stepper
		this.defaultSpeedStepper = new Stepper(
			"Default Speed:",
			(v) => `${v.toFixed(2)}x`,
			() => this.store.settings.defaultSpeed,
			(dir) => {
				const step = MVC_CONFIG.SPEED_STEPPER_STEP;
				const next = clamp(
					this.store.settings.defaultSpeed + dir * step,
					MVC_CONFIG.SPEED_MIN,
					MVC_CONFIG.SPEED_MAX,
				);
				this.store.saveSetting("defaultSpeed", next);
			},
		);
		card.appendChild(this.defaultSpeedStepper.dom);

		// 2. Skip Duration Stepper
		this.skipStepper = new Stepper(
			"Skip Duration:",
			(v) => `${v}s`,
			() => this.store.settings.skipSeconds,
			(dir) => {
				const step = MVC_CONFIG.SKIP_STEPPER_STEP;
				const next = clamp(
					this.store.settings.skipSeconds + dir * step,
					MVC_CONFIG.SKIP_MIN,
					MVC_CONFIG.SKIP_MAX,
				);
				this.store.saveSetting("skipSeconds", next);
			},
		);
		card.appendChild(this.skipStepper.dom);

		// 3. Reset All Button
		const transformResetBtn = document.createElement("button");
		transformResetBtn.className = "mvc-grid-btn";
		transformResetBtn.style.width = "100%";
		transformResetBtn.appendChild(this.ui.getIcon("reset"));
		const resetLabel = document.createElement("span");
		resetLabel.textContent = "Reset All";
		transformResetBtn.appendChild(resetLabel);
		transformResetBtn.onclick = (e) => {
			e.stopPropagation();
			vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
			this.store.saveSetting("transform", { ratio: "fit", zoom: 1 });

			this.store.saveSetting("defaultSpeed", MVC_CONFIG.SPEED_DEFAULT);
			this.store.saveSetting("skipSeconds", MVC_CONFIG.SKIP_DEFAULT);
			this.store.saveSetting("minimalSpeedFab", false);
			this.store.saveSetting("gesturesEnabled", true);
			this.store.saveSetting("progressBarEnabled", true);
			this.store.saveSetting("rememberPlayback", true);
			this.store.saveSetting("scrollCompatibility", true);
			this.update();

			this.eventBus.emit("video:transform-need-update", undefined);
			this.ui.showToast("Reset settings to default");
		};
		card.appendChild(transformResetBtn);

		// 5. Minimal Speed FAB Switch
		this.minimalSpeedFabSwitch = new Switch(
			"Minimal Speed FAB:",
			!!this.store.settings.minimalSpeedFab,
			(isChecked) => {
				this.store.saveSetting("minimalSpeedFab", isChecked);
			},
		);
		card.appendChild(this.minimalSpeedFabSwitch.dom);

		// 6. Progress Bar Scrubber Switch
		this.progressBarSwitch = new Switch(
			"Progress Bar:",
			this.store.settings.progressBarEnabled !== false,
			(isChecked) => {
				this.store.saveSetting("progressBarEnabled", isChecked);
			},
		);
		card.appendChild(this.progressBarSwitch.dom);

		// 7. Swipe & Hold Gestures Switch
		this.gestureSwitch = new Switch(
			"Gestures:",
			this.store.settings.gesturesEnabled,
			(isChecked) => {
				this.store.saveSetting("gesturesEnabled", isChecked);
			},
		);
		card.appendChild(this.gestureSwitch.dom);

		// 9. Remember Playback Switch
		this.rememberPlaybackSwitch = new Switch(
			"Remember Playback:",
			this.store.settings.rememberPlayback,
			(isChecked) => {
				this.store.saveSetting("rememberPlayback", isChecked);
			},
		);
		card.appendChild(this.rememberPlaybackSwitch.dom);

		// 10. Scroll Compatibility Switch
		this.scrollCompatibilitySwitch = new Switch(
			"Scroll Compatibility:",
			this.store.settings.scrollCompatibility,
			(isChecked) => {
				this.store.saveSetting("scrollCompatibility", isChecked);
			},
		);
		card.appendChild(this.scrollCompatibilitySwitch.dom);

		return sheet;
	}

	public update(): void {
		this.defaultSpeedStepper.update();
		this.skipStepper.update();
		this.minimalSpeedFabSwitch.setChecked(
			!!this.store.settings.minimalSpeedFab,
		);
		this.progressBarSwitch.setChecked(
			this.store.settings.progressBarEnabled !== false,
		);
		this.gestureSwitch.setChecked(this.store.settings.gesturesEnabled);
		this.rememberPlaybackSwitch.setChecked(
			this.store.settings.rememberPlayback,
		);
		this.scrollCompatibilitySwitch.setChecked(
			this.store.settings.scrollCompatibility,
		);
	}
}
