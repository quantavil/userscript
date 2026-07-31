import { vibrate } from "../../utils";
import { UIComponent } from "../UIComponent";

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
		const row = document.createElement("div");
		row.className = "mvc-settings-row";

		const labelEl = document.createElement("label");
		labelEl.className = "mvc-settings-label";
		labelEl.textContent = this.label;

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

		row.append(labelEl, this.switchContainer);
		return row;
	}

	public setChecked(checked: boolean): void {
		this.checked = checked;
		this.switchContainer.classList.toggle("checked", checked);
	}
}
