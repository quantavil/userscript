// src/gestures/GestureCoordinator.ts

export type GestureType =
	| "pinch"
	| "swipe_seek"
	| "volume_control"
	| "brightness_control"
	| "double_tap"
	| "speed_boost";

export class GestureCoordinator {
	private activeGesture: GestureType | null = null;

	/**
	 * Attempts to acquire exclusive focus for a given gesture type.
	 * Returns true if successful (no other gesture is active), false otherwise.
	 */
	public acquire(gesture: GestureType): boolean {
		if (this.activeGesture === null) {
			this.activeGesture = gesture;
			return true;
		}
		return this.activeGesture === gesture;
	}

	/**
	 * Releases focus for the given gesture type.
	 */
	public release(gesture: GestureType): void {
		if (this.activeGesture === gesture) {
			this.activeGesture = null;
		}
	}

	/**
	 * Checks if a specific gesture type is currently holding focus.
	 */
	public isActive(gesture: GestureType): boolean {
		return this.activeGesture === gesture;
	}

	/**
	 * Checks if any gesture is currently active.
	 */
	public hasActiveGesture(): boolean {
		return this.activeGesture !== null;
	}

	/**
	 * Checks if a pointer-movement gesture (swipe, pinch, volume, brightness)
	 * is currently holding focus.
	 */
	public isPointerGestureActive(): boolean {
		return (
			this.activeGesture === "swipe_seek" ||
			this.activeGesture === "pinch" ||
			this.activeGesture === "volume_control" ||
			this.activeGesture === "brightness_control"
		);
	}

	/**
	 * Resets the active gesture focus.
	 */
	public reset(): void {
		this.activeGesture = null;
	}
}
