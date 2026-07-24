// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventBus } from "../src/events/EventBus";
import { StateStore } from "../src/core/StateStore";
import { UIManager } from "../src/ui/UIManager";
import { SpeedStepper } from "../src/ui/panels/SpeedStepper";

describe("SpeedStepper Component", () => {
	let eventBus: EventBus;
	let store: StateStore;
	let uiManager: UIManager;
	let stepper: SpeedStepper;
	let video: HTMLVideoElement;

	beforeEach(() => {
		document.body.innerHTML = "";
		eventBus = new EventBus();
		store = new StateStore(eventBus);
		uiManager = new UIManager(eventBus, store);
		uiManager.init();
		stepper = uiManager.stepper!;

		video = document.createElement("video");
		video.playbackRate = 1.0;
		document.body.appendChild(video);
		store.setActiveVideo(video);
	});

	afterEach(() => {
		store.abortController.abort();
		stepper.destroy();
		document.body.innerHTML = "";
	});

	it("should toggle between Stepper Pill and Minimal Speed FAB", () => {
		expect(store.settings.minimalSpeedFab).toBe(false);

		const pill = stepper.dom.querySelector(".mvc-stepper-pill") as HTMLDivElement;
		const fab = stepper.dom.querySelector(".mvc-speed-fab") as HTMLButtonElement;

		expect(pill.style.display).not.toBe("none");
		expect(fab.style.display).toBe("none");

		store.saveSetting("minimalSpeedFab", true);

		expect(pill.style.display).toBe("none");
		expect(fab.style.display).toBe("flex");
	});

	it("should cycle speed in circular loop from 0.5x to 2.0x in Minimal FAB mode", () => {
		store.saveSetting("minimalSpeedFab", true);
		video.playbackRate = 1.9;

		const fab = stepper.dom.querySelector(".mvc-speed-fab") as HTMLButtonElement;
		const rateSpy = vi.fn();
		eventBus.on("video:rate-change-requested", rateSpy);

		// Click 1: 1.9x -> 2.0x
		fab.dispatchEvent(new PointerEvent("pointerdown"));
		fab.dispatchEvent(new PointerEvent("pointerup"));
		expect(rateSpy).toHaveBeenLastCalledWith({ rate: 2.0, saveToSettings: true });

		// Click 2: 2.0x -> wraps back to 0.5x!
		video.playbackRate = 2.0;
		fab.dispatchEvent(new PointerEvent("pointerdown"));
		fab.dispatchEvent(new PointerEvent("pointerup"));
		expect(rateSpy).toHaveBeenLastCalledWith({ rate: 0.5, saveToSettings: true });
	});

	it("should reset speed to 1.0x on long press in Minimal FAB mode", () => {
		vi.useFakeTimers();
		store.saveSetting("minimalSpeedFab", true);
		video.playbackRate = 1.8;

		const fab = stepper.dom.querySelector(".mvc-speed-fab") as HTMLButtonElement;
		const rateSpy = vi.fn();
		eventBus.on("video:rate-change-requested", rateSpy);

		fab.dispatchEvent(new PointerEvent("pointerdown"));
		vi.advanceTimersByTime(700);
		fab.dispatchEvent(new PointerEvent("pointerup"));

		expect(rateSpy).toHaveBeenCalledWith({ rate: 1.0, saveToSettings: true });
		vi.useRealTimers();
	});
});
