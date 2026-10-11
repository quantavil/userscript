// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const controllerState = vi.hoisted(() => ({ themeAtConstruction: [] as unknown[] }));
const ControllerMock = vi.hoisted(() =>
	vi.fn(function ControllerMock() {
		controllerState.themeAtConstruction.push(
			(globalThis as any).GM_getValue("mvc_theme", "missing"),
		);
	}),
);

vi.mock("../src/core/Controller", () => ({ Controller: ControllerMock }));

describe("extension entry", () => {
	let storageChangeListener:
		| ((changes: Record<string, { newValue?: unknown }>, area: string) => void)
		| undefined;

	beforeEach(() => {
		vi.resetModules();
		ControllerMock.mockClear();
		controllerState.themeAtConstruction = [];
		storageChangeListener = undefined;
		window.history.replaceState({}, "", "/watch");
		(globalThis as any).browser = {
			storage: {
				local: {
					get: vi.fn().mockResolvedValue({
						mvc_theme: "volt",
						removed_setting: "present",
					}),
					set: vi.fn().mockResolvedValue(undefined),
					remove: vi.fn().mockResolvedValue(undefined),
				},
				onChanged: {
					addListener: vi.fn((listener) => {
						storageChangeListener = listener;
					}),
				},
			},
		};
	});

	afterEach(() => {
		delete (globalThis as any).browser;
		delete (globalThis as any).chrome;
		delete (globalThis as any).GM_getValue;
		delete (globalThis as any).GM_setValue;
		delete (globalThis as any).GM_deleteValue;
		delete (globalThis as any).GM_registerMenuCommand;
	});

	it("hydrates extension storage before constructing the controller", async () => {
		await import("../src/platform/extension-entry");

		await vi.waitFor(() => expect(ControllerMock).toHaveBeenCalledOnce());
		expect(controllerState.themeAtConstruction).toEqual(["volt"]);
	});

	it("keeps the synchronous cache aligned with storage changes", async () => {
		await import("../src/platform/extension-entry");
		await vi.waitFor(() => expect(storageChangeListener).toBeTypeOf("function"));

		storageChangeListener?.(
			{
				mvc_theme: { newValue: "ember" },
				removed_setting: { newValue: undefined },
			},
			"local",
		);

		expect((globalThis as any).GM_getValue("mvc_theme")).toBe("ember");
		expect((globalThis as any).GM_getValue("removed_setting", "fallback")).toBe(
			"fallback",
		);
	});

	it("does not boot on a disabled hostname", async () => {
		(globalThis as any).browser.storage.local.get.mockResolvedValue({
			"disabled_localhost": true,
		});

		await import("../src/platform/extension-entry");
		await vi.waitFor(() =>
			expect((globalThis as any).browser.storage.local.get).toHaveBeenCalled(),
		);

		expect(ControllerMock).not.toHaveBeenCalled();
	});
});
