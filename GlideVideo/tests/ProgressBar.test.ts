// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventBus } from "../src/events/EventBus";
import { StateStore } from "../src/core/StateStore";
import { UIManager } from "../src/ui/UIManager";
import { ProgressBar } from "../src/ui/components/ProgressBar";

describe("ProgressBar Component", () => {
	let eventBus: EventBus;
	let store: StateStore;
	let uiManager: UIManager;
	let progressBar: ProgressBar;

	beforeEach(() => {
		document.body.innerHTML = "";
		eventBus = new EventBus();
		store = new StateStore(eventBus);
		uiManager = new UIManager(eventBus, store);
		uiManager.init();
		progressBar = uiManager.progressBar!;
	});

	afterEach(() => {
		store.abortController.abort();
		progressBar.destroy();
		document.body.innerHTML = "";
	});

	it("should render element hierarchy correctly", () => {
		expect(progressBar.dom.classList.contains("mvc-progress-bar")).toBe(true);
		expect(progressBar.dom.querySelector(".mvc-progress-track-wrap")).not.toBeNull();
		expect(progressBar.dom.querySelector(".mvc-progress-bg-track")).not.toBeNull();
		expect(progressBar.dom.querySelector(".mvc-progress-buf-track")).not.toBeNull();
		expect(progressBar.dom.querySelector(".mvc-progress-fill-track")).not.toBeNull();
		expect(progressBar.dom.querySelector(".mvc-progress-thumb")).not.toBeNull();
		expect(progressBar.dom.querySelector(".mvc-progress-tooltip")).not.toBeNull();
	});

	it("should update track widths when video:time-update fires", () => {
		eventBus.emit("video:time-update", {
			currentTime: 60,
			duration: 120,
			buffered: 90,
		});

		const fillTrack = progressBar.dom.querySelector(".mvc-progress-fill-track") as HTMLDivElement;
		const bufTrack = progressBar.dom.querySelector(".mvc-progress-buf-track") as HTMLDivElement;
		const thumbEl = progressBar.dom.querySelector(".mvc-progress-thumb") as HTMLDivElement;

		expect(fillTrack.style.width).toBe("50%");
		expect(bufTrack.style.width).toBe("75%");
		expect(thumbEl.style.left).toBe("50%");
	});

	it("should emit video:seek-requested when user taps on scrubber track", () => {
		const seekSpy = vi.fn();
		eventBus.on("video:seek-requested", seekSpy);

		eventBus.emit("video:time-update", {
			currentTime: 0,
			duration: 200,
			buffered: 50,
		});

		const trackWrap = progressBar.dom.querySelector(".mvc-progress-track-wrap") as HTMLDivElement;
		Object.defineProperty(trackWrap, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 200, height: 20, right: 200, bottom: 20 }),
		});
		trackWrap.setPointerCapture = vi.fn();
		trackWrap.releasePointerCapture = vi.fn();

		const downEvt = new PointerEvent("pointerdown", { clientX: 100, pointerId: 1 });
		const upEvt = new PointerEvent("pointerup", { clientX: 100, pointerId: 1 });

		trackWrap.dispatchEvent(downEvt);
		trackWrap.dispatchEvent(upEvt);

		expect(seekSpy).toHaveBeenCalledWith({ time: 100 });
	});

	it("should reset dragging state when lostpointercapture occurs", () => {
		eventBus.emit("video:time-update", { currentTime: 0, duration: 100, buffered: 0 });
		const trackWrap = progressBar.dom.querySelector(".mvc-progress-track-wrap") as HTMLDivElement;
		Object.defineProperty(trackWrap, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 }),
		});
		trackWrap.setPointerCapture = vi.fn();
		trackWrap.releasePointerCapture = vi.fn();

		const downEvt = new PointerEvent("pointerdown", { clientX: 50, pointerId: 1 });
		const lostEvt = new PointerEvent("lostpointercapture", { pointerId: 1 });

		trackWrap.dispatchEvent(downEvt);
		expect(trackWrap.classList.contains("dragging")).toBe(true);

		trackWrap.dispatchEvent(lostEvt);
		expect(trackWrap.classList.contains("dragging")).toBe(false);
	});

	it("should reset dragging state when active video changes", () => {
		const trackWrap = progressBar.dom.querySelector(".mvc-progress-track-wrap") as HTMLDivElement;
		Object.defineProperty(trackWrap, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 }),
		});
		trackWrap.setPointerCapture = vi.fn();

		trackWrap.dispatchEvent(new PointerEvent("pointerdown", { clientX: 50, pointerId: 1 }));
		expect(trackWrap.classList.contains("dragging")).toBe(true);

		eventBus.emit("video:active-changed", null);
		expect(trackWrap.classList.contains("dragging")).toBe(false);
	});

	it("should hide progress bar element when progressBarEnabled setting is false", () => {
		store.saveSetting("progressBarEnabled", false);
		expect(progressBar.dom.style.display).toBe("none");

		store.saveSetting("progressBarEnabled", true);
		progressBar.updateDisplay();
		expect(progressBar.dom.style.display).toBe("");
	});
});
