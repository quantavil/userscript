// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StateStore } from "../src/core/StateStore";
import { EventBus } from "../src/events/EventBus";
import { UIManager } from "../src/ui/UIManager";

describe("SettingsSheet", () => {
	let eventBus: EventBus;
	let store: StateStore;
	let ui: UIManager;

	const sheet = () => ui.settingsSheet!.dom;
	const rows = () =>
		Array.from(sheet().querySelectorAll(".mvc-settings-row")) as HTMLElement[];

	beforeEach(() => {
		document.body.innerHTML = "";
		eventBus = new EventBus();
		store = new StateStore(eventBus);
		ui = new UIManager(eventBus, store);
		ui.init();
		ui.ensureSettingsSheet();
	});

	afterEach(() => {
		store.abortController.abort();
		document.body.innerHTML = "";
	});

	// The sheet's card is a two-column grid; only `half` rows share a line.
	it("marks toggle rows half-width and stepper rows full-width", () => {
		const half = rows().filter((r) => r.classList.contains("half"));
		const full = rows().filter((r) => !r.classList.contains("half"));

		expect(half).toHaveLength(6);
		expect(full).toHaveLength(4);
		for (const r of half) expect(r.querySelector(".mvc-switch")).toBeTruthy();
		for (const r of full) expect(r.querySelector(".mvc-stepper")).toBeTruthy();
	});

	it("keeps toggle labels short enough to pair up", () => {
		const labels = rows()
			.filter((r) => r.classList.contains("half"))
			.map((r) => r.querySelector(".mvc-settings-label")!.textContent!);
		expect(labels).toEqual([
			"Speed FAB",
			"Left hand",
			"Progress bar",
			"Gestures",
			"Remember",
			"Page scroll",
		]);
		for (const l of labels) expect(l.length).toBeLessThanOrEqual(12);
	});

	it("reset restores every toggle and re-syncs the switches", () => {
		const speedSpy = vi.spyOn(store, "clearDomainSpeed");
		const posSpy = vi.spyOn(store, "clearAllVideoPositions");

		store.saveSetting("gesturesEnabled", false);
		store.saveSetting("minimalSpeedFab", true);
		store.saveSetting("leftHandMode", true);
		store.saveSetting("theme", "frame");
		store.saveSetting("lastRate", 2.5);
		store.settings.transform.rot = 90;

		(sheet().querySelector(".mvc-grid-btn") as HTMLButtonElement).click();

		expect(store.settings.gesturesEnabled).toBe(true);
		expect(store.settings.minimalSpeedFab).toBe(false);
		expect(store.settings.leftHandMode).toBe(false);
		expect(store.settings.theme).toBe("contrast");
		expect(store.settings.transform.rot).toBe(0);
		expect(store.settings.lastRate).toBe(1.0);
		expect(speedSpy).toHaveBeenCalled();
		expect(posSpy).toHaveBeenCalled();

		const checked = sheet().querySelectorAll(".mvc-switch.checked");
		// Every toggle but minimalSpeedFab, leftHandMode, and progressBarEnabled defaults to on (3 total)
		expect(checked).toHaveLength(3);
	});

	it("theme stepper cycles through every theme and wraps", () => {
		const themeRow = rows()[0];
		const [dec, , inc] = Array.from(
			themeRow.querySelectorAll(".mvc-stepper-btn, .mvc-stepper-val"),
		) as HTMLElement[];
		const val = themeRow.querySelector(".mvc-stepper-val")!;

		expect(val.textContent).toBe("High Contrast");
		inc.click();
		expect(store.settings.theme).toBe("frame");
		inc.click();
		expect(store.settings.theme).toBe("ember");
		inc.click();
		expect(store.settings.theme).toBe("abyss");
		inc.click();
		expect(store.settings.theme).toBe("volt");
		inc.click();
		expect(store.settings.theme).toBe("contrast"); // wraps forward
		dec.click();
		expect(store.settings.theme).toBe("volt"); // wraps backward
	});

	it("theme stepper handles invalid theme safely and falls back to High Contrast label", () => {
		store.settings.theme = "invalid_theme";
		ui.settingsSheet!.update();

		const themeRow = rows()[0];
		const val = themeRow.querySelector(".mvc-stepper-val")!;
		expect(val.textContent).toBe("High Contrast");

		const inc = themeRow.querySelectorAll(".mvc-stepper-btn")[1] as HTMLElement;
		inc.click();
		expect(store.settings.theme).toBe("frame");
	});

	it("should provide switch role, aria-checked, keyboard toggle, and label association", () => {
		const switchRow = rows().find((r) => r.querySelector(".mvc-switch"))!;
		const sw = switchRow.querySelector(".mvc-switch") as HTMLElement;
		const label = switchRow.querySelector(".mvc-settings-label") as HTMLLabelElement;

		expect(sw.getAttribute("role")).toBe("switch");
		expect(sw.getAttribute("tabindex")).toBe("0");
		expect(sw.getAttribute("aria-checked")).toBe("false");

		expect(label.htmlFor).toBeTruthy();
		expect(label.htmlFor).toBe(sw.id);

		// Keyboard toggle on Enter
		sw.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		expect(sw.getAttribute("aria-checked")).toBe("true");
	});

	it("gives every stepper button a contextual accessible name", () => {
		const expectedLabels = [
			["Decrease Theme", "Increase Theme"],
			["Decrease Rotate", "Increase Rotate"],
			["Decrease Default speed", "Increase Default speed"],
			["Decrease Skip duration", "Increase Skip duration"],
		];

		const stepperRows = rows().filter((row) => row.querySelector(".mvc-stepper"));
		expect(stepperRows).toHaveLength(expectedLabels.length);
		stepperRows.forEach((row, index) => {
			const buttons = row.querySelectorAll(".mvc-stepper-btn");
			expect(Array.from(buttons, (button) => button.getAttribute("aria-label"))).toEqual(
				expectedLabels[index],
			);
		});
	});
});
