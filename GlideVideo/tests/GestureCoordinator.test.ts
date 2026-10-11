import { describe, expect, it } from "vitest";
import { GestureCoordinator } from "../src/gestures/GestureCoordinator";

describe("GestureCoordinator", () => {
	it("allows one gesture to acquire the lock and rejects a competing gesture", () => {
		const coordinator = new GestureCoordinator();

		expect(coordinator.acquire("swipe_seek")).toBe(true);
		expect(coordinator.acquire("pinch")).toBe(false);
		expect(coordinator.isActive("swipe_seek")).toBe(true);
		expect(coordinator.hasActiveGesture()).toBe(true);
	});

	it("treats reacquiring the active gesture as idempotent", () => {
		const coordinator = new GestureCoordinator();

		expect(coordinator.acquire("double_tap")).toBe(true);
		expect(coordinator.acquire("double_tap")).toBe(true);
	});

	it("only releases the gesture that owns the lock", () => {
		const coordinator = new GestureCoordinator();
		coordinator.acquire("speed_boost");

		coordinator.release("double_tap");
		expect(coordinator.isActive("speed_boost")).toBe(true);

		coordinator.release("speed_boost");
		expect(coordinator.hasActiveGesture()).toBe(false);
		expect(coordinator.acquire("pinch")).toBe(true);
	});

	it("reports only movement gestures as pointer gestures", () => {
		const pointerGestures = [
			"swipe_seek",
			"pinch",
			"volume_control",
			"brightness_control",
		] as const;

		for (const gesture of pointerGestures) {
			const coordinator = new GestureCoordinator();
			coordinator.acquire(gesture);
			expect(coordinator.isPointerGestureActive()).toBe(true);
		}

		for (const gesture of ["double_tap", "speed_boost"] as const) {
			const coordinator = new GestureCoordinator();
			coordinator.acquire(gesture);
			expect(coordinator.isPointerGestureActive()).toBe(false);
		}
	});
});
