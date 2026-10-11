let rowIdCounter = 0;

/**
 * One labelled row in the settings sheet. `half` rows sit two-per-line in the
 * sheet's grid; everything else spans the full width.
 */
export function settingsRow(
	label: string,
	control: HTMLElement,
	half = false,
): HTMLDivElement {
	const row = document.createElement("div");
	row.className = half ? "mvc-settings-row half" : "mvc-settings-row";

	const id = control.id || `mvc-ctrl-${++rowIdCounter}`;
	control.id = id;

	const labelEl = document.createElement("label");
	labelEl.className = "mvc-settings-label";
	labelEl.textContent = label;
	labelEl.htmlFor = id;

	row.append(labelEl, control);
	return row;
}
