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
			vibrate(10);
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
				const step = 0.05;
				const next = clamp(
					this.store.settings.defaultSpeed + dir * step,
					0.1,
					16.0,
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
				const step = 5;
				const next = clamp(
					this.store.settings.skipSeconds + dir * step,
					5,
					300,
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
			vibrate(10);
			this.store.saveSetting("transform", { ratio: "fit", zoom: 1 });

			this.store.saveSetting("defaultSpeed", 1.0);
			this.store.saveSetting("skipSeconds", 10);
			this.store.saveSetting("gesturesEnabled", true);
			this.store.saveSetting("rememberPlayback", true);
			this.store.saveSetting("scrollCompatibility", true);
			this.update();

			this.eventBus.emit("video:transform-need-update", undefined);
			this.ui.showToast("Reset settings to default");
		};
		card.appendChild(transformResetBtn);

		// 6. Swipe & Hold Gestures Switch
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
		this.gestureSwitch.setChecked(this.store.settings.gesturesEnabled);
		this.rememberPlaybackSwitch.setChecked(
			this.store.settings.rememberPlayback,
		);
		this.scrollCompatibilitySwitch.setChecked(
			this.store.settings.scrollCompatibility,
		);
	}
}
