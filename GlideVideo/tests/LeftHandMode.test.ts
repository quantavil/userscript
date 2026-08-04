// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StateStore } from "../src/core/StateStore";
import { EventBus } from "../src/events/EventBus";
import { UIManager } from "../src/ui/UIManager";

describe("LeftHandMode", () => {
	let eventBus: EventBus;
	let store: StateStore;
	let ui: UIManager;

	beforeEach(() => {
		document.body.innerHTML = "";
		eventBus = new EventBus();
		store = new StateStore(eventBus);
		ui = new UIManager(eventBus, store);
		ui.init();
	});

	afterEach(() => {
		store.abortController.abort();
		document.body.innerHTML = "";
		document.documentElement.removeAttribute("data-mvc-left-hand");
	});

	it("sets data-mvc-left-hand attribute on root when enabled", () => {
		expect(document.documentElement.getAttribute("data-mvc-left-hand")).toBe("false");

		store.saveSetting("leftHandMode", true);
		expect(document.documentElement.getAttribute("data-mvc-left-hand")).toBe("true");

		store.saveSetting("leftHandMode", false);
		expect(document.documentElement.getAttribute("data-mvc-left-hand")).toBe("false");
	});

	it("swaps volume and brightness side rail positions when leftHandMode is active", () => {
		const mockVideo = {
			getBoundingClientRect: () => ({ top: 100, bottom: 500, left: 50, right: 650, width: 600, height: 400 }),
		} as any;
		store.activeVideo = mockVideo;

		ui.showVolumeBar(0.8);
		// In default mode, volume rail is on the right
		expect(ui.volumeBar!.style.right).not.toBe("auto");

		store.saveSetting("leftHandMode", true);
		ui.showVolumeBar(0.8);
		// In leftHandMode, volume rail moves to the left
		expect(ui.volumeBar!.style.left).not.toBe("auto");
	});
});
