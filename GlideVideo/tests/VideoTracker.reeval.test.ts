import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/events/EventBus";
import { VideoTracker } from "../src/video/VideoTracker";

/**
 * Regression cover for the "the overlay doesn't appear until I refresh" bug.
 *
 * evaluateActive() rejects videos that are too small, or short and muted. Both
 * conditions change over time, but nothing re-triggered evaluation when they
 * did: IntersectionObserver had already reported the element as intersecting
 * and does not fire again when an element merely resizes or unmutes. So the
 * video was rejected once and never reconsidered.
 *
 * Every test here fails against the pre-fix VideoTracker.
 */
describe("VideoTracker re-evaluation triggers", () => {
	let resizeCbs: (() => void)[];
	let tracker: any;
	let store: any;

	const makeVideo = (w: number, h: number, muted = false) => {
		const listeners: Record<string, ((...a: any[]) => void)[]> = {};
		return {
			tagName: "VIDEO",
			isConnected: true,
			muted,
			paused: false,
			ended: false,
			readyState: 4,
			closest: () => null,
			getBoundingClientRect() {
				return {
					width: this._w,
					height: this._h,
					top: 0,
					left: 0,
					right: this._w,
					bottom: this._h,
				};
			},
			_w: w,
			_h: h,
			addEventListener(t: string, cb: (...a: any[]) => void) {
				(listeners[t] ||= []).push(cb);
			},
			removeEventListener: vi.fn(),
			fire(t: string) {
				(listeners[t] || []).forEach((cb) => cb());
			},
			resize(nw: number, nh: number) {
				this._w = nw;
				this._h = nh;
			},
		} as any;
	};

	beforeEach(() => {
		vi.useFakeTimers();
		resizeCbs = [];
		(global as any).getComputedStyle = () => ({ visibility: "visible" });
		(global as any).window = { innerWidth: 1280, innerHeight: 720 };

		store = {
			activeVideo: null,
			visibleVideos: new Map(),
			isInitialized: true,
			setActiveVideo(v: any) {
				this.activeVideo = v;
			},
		};
		tracker = new VideoTracker(new EventBus(), store);
		// Skip setupObservers so the test needs no document; wire the two
		// observers watchVideo depends on directly.
		tracker.intersectionObserver = { observe: vi.fn(), unobserve: vi.fn() };
		// Only elements actually handed to observe() get a callback, so the test
		// fails if watchVideo stops registering them.
		const observed = new Set<any>();
		tracker.resizeObserver = {
			observe: vi.fn((el: any) => observed.add(el)),
			unobserve: vi.fn((el: any) => observed.delete(el)),
			_fire: (el: any) => {
				if (observed.has(el)) resizeCbs.forEach((cb) => cb());
			},
		};
		resizeCbs.push(() => tracker.debouncedEvaluate());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("reconsiders a video that grows into eligibility after the first pass", () => {
		const v = makeVideo(200, 40); // too short to qualify
		store.visibleVideos.set(v, true);
		tracker.watchVideo(v);

		tracker.evaluateActive();
		expect(store.activeVideo).toBeNull();

		// The player finally sizes it. No IntersectionObserver entry fires.
		v.resize(640, 360);
		tracker.resizeObserver._fire(v);
		vi.advanceTimersByTime(1000);

		expect(store.activeVideo).toBe(v);
	});

	it("reconsiders a short muted video once it is unmuted", () => {
		const v = makeVideo(400, 120, true); // under SMALL_MUTED_VIDEO_HEIGHT
		store.visibleVideos.set(v, true);
		tracker.watchVideo(v);

		tracker.evaluateActive();
		expect(store.activeVideo).toBeNull();

		v.muted = false;
		v.fire("volumechange");
		vi.advanceTimersByTime(1000);

		expect(store.activeVideo).toBe(v);
	});

	it("reconsiders when a rejected video starts playing", () => {
		const v = makeVideo(300, 40);
		store.visibleVideos.set(v, true);
		tracker.watchVideo(v);

		tracker.evaluateActive();
		expect(store.activeVideo).toBeNull();

		v.resize(800, 450);
		v.fire("play");
		vi.advanceTimersByTime(1000);

		expect(store.activeVideo).toBe(v);
	});

	it("unwatchVideo detaches the media listeners", () => {
		const v = makeVideo(640, 360);
		tracker.watchVideo(v);
		tracker.unwatchVideo(v);
		expect(v.removeEventListener).toHaveBeenCalledTimes(3);
		expect(tracker.resizeObserver.unobserve).toHaveBeenCalledWith(v);
	});
});
