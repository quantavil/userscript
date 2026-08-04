import { MVC_CONFIG } from "../../config";
import type { StateStore } from "../../core/StateStore";
import type { EventBus } from "../../events/EventBus";
import { clamp, vibrate } from "../../utils";
import { Stepper } from "../components/Stepper";
import { Switch } from "../components/Switch";
import { MVC_THEME_LABELS, MVC_THEMES, type MvcTheme } from "../styles/css";
import { UIComponent } from "../UIComponent";
import type { UIManager } from "../UIManager";

/** Toggles, in sheet order. Labels stay short — two share a line. */
const TOGGLES: Array<{ label: string; key: string; def: boolean }> = [
	{ label: "Speed FAB", key: "minimalSpeedFab", def: false },
	{ label: "Left hand", key: "leftHandMode", def: false },
	{ label: "Progress bar", key: "progressBarEnabled", def: true },
	{ label: "Gestures", key: "gesturesEnabled", def: true },
	{ label: "Remember", key: "rememberPlayback", def: true },
	{ label: "Page scroll", key: "scrollCompatibility", def: true },
];

export class SettingsSheet extends UIComponent {
	private steppers: Stepper[] = [];
	private switches: Switch[] = [];

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

		const card = document.createElement("div");
		card.className = "mvc-settings-card";
		sheet.appendChild(card);

		// Theme — a Stepper cycling an index is exactly a theme picker
		this.addStepper(
			card,
			"Theme",
			(i) => MVC_THEME_LABELS[MVC_THEMES[i] as MvcTheme] ?? "Halo",
			() => Math.max(0, MVC_THEMES.indexOf(this.store.settings.theme as MvcTheme)),
			(dir) => {
				const n = MVC_THEMES.length;
				const cur = Math.max(0, MVC_THEMES.indexOf(this.store.settings.theme as MvcTheme));
				this.store.saveSetting("theme", MVC_THEMES[(cur + dir + n) % n]);
			},
		);

		// Rotation — also reachable by long-pressing the ratio button
		this.addStepper(
			card,
			"Rotate",
			(v) => `${v}°`,
			() => this.store.settings.transform.rot || 0,
			(dir) => {
				const t = this.store.settings.transform;
				t.rot = ((((t.rot || 0) + dir * 90) % 360) + 360) % 360;
				this.store.saveSetting("transform", t);
				this.eventBus.emit("video:transform-need-update", undefined);
				this.ui.updateRotationUI();
			},
		);

		this.addStepper(
			card,
			"Default speed",
			(v) => `${v.toFixed(2)}x`,
			() => this.store.settings.defaultSpeed,
			(dir) =>
				this.store.saveSetting(
					"defaultSpeed",
					clamp(
						this.store.settings.defaultSpeed +
							dir * MVC_CONFIG.SPEED_STEPPER_STEP,
						MVC_CONFIG.SPEED_MIN,
						MVC_CONFIG.SPEED_MAX,
					),
				),
		);

		this.addStepper(
			card,
			"Skip duration",
			(v) => `${v}s`,
			() => this.store.settings.skipSeconds,
			(dir) =>
				this.store.saveSetting(
					"skipSeconds",
					clamp(
						this.store.settings.skipSeconds + dir * MVC_CONFIG.SKIP_STEPPER_STEP,
						MVC_CONFIG.SKIP_MIN,
						MVC_CONFIG.SKIP_MAX,
					),
				),
		);

		for (const { label, key, def } of TOGGLES) {
			const sw = new Switch(label, this.readToggle(key, def), (checked) =>
				this.store.saveSetting(key, checked),
			);
			this.switches.push(sw);
			card.appendChild(sw.dom);
		}

		card.appendChild(this.buildResetButton());

		return sheet;
	}

	private addStepper(
		card: HTMLDivElement,
		label: string,
		valFmt: (v: number) => string,
		getVal: () => number,
		onAdjust: (dir: number) => void,
	): void {
		const stepper = new Stepper(label, valFmt, getVal, onAdjust);
		this.steppers.push(stepper);
		card.appendChild(stepper.dom);
	}

	/** Stored settings may be undefined on first run, so fall back to the default. */
	private readToggle(key: string, def: boolean): boolean {
		const v = this.store.settings[key];
		return v === undefined ? def : !!v;
	}

	private buildResetButton(): HTMLButtonElement {
		const btn = document.createElement("button");
		btn.className = "mvc-grid-btn";
		btn.appendChild(this.ui.getIcon("reset"));

		const label = document.createElement("span");
		label.textContent = "Reset all";
		btn.appendChild(label);

		btn.onclick = (e) => {
			e.stopPropagation();
			vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
			this.store.saveSetting("transform", { ratio: "fit", zoom: 1, rot: 0 });
			this.store.saveSetting("theme", "halo");
			this.store.saveSetting("defaultSpeed", MVC_CONFIG.SPEED_DEFAULT);
			this.store.saveSetting("skipSeconds", MVC_CONFIG.SKIP_DEFAULT);
			for (const { key, def } of TOGGLES) this.store.saveSetting(key, def);
			this.update();

			this.eventBus.emit("video:transform-need-update", undefined);
			this.ui.updateRotationUI();
			this.ui.showToast("Reset settings to default");
		};
		return btn;
	}

	public update(): void {
		for (const s of this.steppers) s.update();
		this.switches.forEach((sw, i) =>
			sw.setChecked(this.readToggle(TOGGLES[i].key, TOGGLES[i].def)),
		);
	}
}
