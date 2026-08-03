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

	protected render(): HTMLDivElement {
		this.switchContainer = document.createElement("div");
		this.switchContainer.className = "mvc-switch";
		if (this.checked) {
			this.switchContainer.classList.add("checked");
		}

		const switchThumb = document.createElement("div");
		switchThumb.className = "mvc-switch-thumb";
		this.switchContainer.appendChild(switchThumb);

		this.switchContainer.onclick = (e) => {
			e.stopPropagation();
			vibrate(10);
			const isChecked = this.switchContainer.classList.toggle("checked");
			this.checked = isChecked;
			this.onChange(isChecked);
		};

		// Toggles are narrow enough to sit two-per-line in the sheet grid
		return settingsRow(this.label, this.switchContainer, true);
	}

	public setChecked(checked: boolean): void {
		this.checked = checked;
		this.switchContainer.classList.toggle("checked", checked);
	}
}
