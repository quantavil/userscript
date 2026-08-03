// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

		expect(half).toHaveLength(5);
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
			"Progress bar",
			"Gestures",
			"Remember",
			"Page scroll",
		]);
		for (const l of labels) expect(l.length).toBeLessThanOrEqual(12);
	});

	it("reset restores every toggle and re-syncs the switches", () => {
		store.saveSetting("gesturesEnabled", false);
		store.saveSetting("minimalSpeedFab", true);
		store.saveSetting("theme", "frame");
		store.settings.transform.rot = 90;

		(sheet().querySelector(".mvc-grid-btn") as HTMLButtonElement).click();

		expect(store.settings.gesturesEnabled).toBe(true);
		expect(store.settings.minimalSpeedFab).toBe(false);
		expect(store.settings.theme).toBe("halo");
		expect(store.settings.transform.rot).toBe(0);

		const checked = sheet().querySelectorAll(".mvc-switch.checked");
		// Every toggle but minimalSpeedFab defaults to on
		expect(checked).toHaveLength(4);
	});

	it("theme stepper cycles through every theme and wraps", () => {
		const themeRow = rows()[0];
		const [dec, , inc] = Array.from(
			themeRow.querySelectorAll(".mvc-stepper-btn, .mvc-stepper-val"),
		) as HTMLElement[];
		const val = themeRow.querySelector(".mvc-stepper-val")!;

		expect(val.textContent).toBe("Halo");
		inc.click();
		expect(store.settings.theme).toBe("contrast");
		inc.click();
		expect(store.settings.theme).toBe("frame");
		inc.click();
		expect(store.settings.theme).toBe("halo"); // wraps forward
		dec.click();
		expect(store.settings.theme).toBe("frame"); // wraps backward
	});
});
