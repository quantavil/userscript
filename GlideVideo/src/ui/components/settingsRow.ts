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

	const labelEl = document.createElement("label");
	labelEl.className = "mvc-settings-label";
	labelEl.textContent = label;

	row.append(labelEl, control);
	return row;
}
