import { vibrate } from "../../utils";
import { UIComponent } from "../UIComponent";
import { settingsRow } from "./settingsRow";

export class Switch extends UIComponent {
	private switchContainer!: HTMLDivElement;

	constructor(
		private label: string,
		private checked: boolean,
		private onChange: (checked: boolean) => void,
	) {
		super();
		this.element = this.render();
	}

	private toggle(): void {
		vibrate(10);
		const isChecked = !this.checked;
		this.setChecked(isChecked);
		this.onChange(isChecked);
	}

	protected render(): HTMLDivElement {
		this.switchContainer = document.createElement("div");
		this.switchContainer.className = "mvc-switch";
		this.switchContainer.setAttribute("role", "switch");
		this.switchContainer.setAttribute("tabindex", "0");
		this.switchContainer.setAttribute("aria-label", this.label);
		this.switchContainer.setAttribute("aria-checked", String(this.checked));
		if (this.checked) {
			this.switchContainer.classList.add("checked");
		}

		const switchThumb = document.createElement("div");
		switchThumb.className = "mvc-switch-thumb";
		this.switchContainer.appendChild(switchThumb);

		this.switchContainer.onclick = (e) => {
			e.stopPropagation();
			this.toggle();
		};

		this.switchContainer.onkeydown = (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				e.stopPropagation();
				this.toggle();
			}
		};

		// Toggles are narrow enough to sit two-per-line in the sheet grid
		return settingsRow(this.label, this.switchContainer, true);
	}

	public setChecked(checked: boolean): void {
		this.checked = checked;
		this.switchContainer.classList.toggle("checked", checked);
		this.switchContainer.setAttribute("aria-checked", String(checked));
	}
}
