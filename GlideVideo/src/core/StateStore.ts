import { MVC_CONFIG } from "../config";
import type { EventBus } from "../events/EventBus";
import { GestureCoordinator } from "../gestures/GestureCoordinator";
import { findAllVideos, isPointOnUI, shouldBlockGestures } from "../utils";

export interface Settings {
	skipSeconds: number;
	defaultSpeed: number;
	lastRate: number;
	transform: { ratio: string; zoom: number };
	gesturesEnabled: boolean;
	scrollCompatibility: boolean;
	rememberPlayback: boolean;
	[key: string]: any;
}

export interface VideoMetadata {
	transform?: { ratio: string; zoom: number };
	videoId?: string;
	videoIdSrc?: string;
	lastRate?: number;
	lastPositionSave?: number;
	originalTransform?: string;
	originalObjectFit?: string;
	rateOverrideCount?: number;
}

export class StateStore {
	// Shared state
	public activeVideo: HTMLVideoElement | null = null;
	public visibleVideos = new Map<HTMLVideoElement, boolean>();
	public isScrolling = false;
	public isTicking = false;
	public savedPlaybackRate?: number;
	public lastRealUserEvent = 0;
	public isInitialized = false;

	public readonly gestureCoordinator = new GestureCoordinator();

	get isPinching(): boolean {
		return this.gestureCoordinator.isActive("pinch");
	}
	get isSwipeSeeking(): boolean {
		return this.gestureCoordinator.isActive("swipe_seek");
	}
	get isVolumeControlling(): boolean {
		return this.gestureCoordinator.isActive("volume_control");
	}
	get isDoubleTapping(): boolean {
		return this.gestureCoordinator.isActive("double_tap");
	}
	get isBrightnessControlling(): boolean {
		return this.gestureCoordinator.isActive("brightness_control");
	}

	/**
	 * Shared preconditions for starting a stationary touch gesture
	 * (tap / long-press) on the active video. Portrait non-fullscreen always
	 * blocks these gestures; scrollCompatibility only relaxes swipes.
	 */
	public canStartTouchGesture(e: PointerEvent): boolean {
		return (
			this.settings.gesturesEnabled &&
			!this.isScreenLocked &&
			!shouldBlockGestures() &&
			e.pointerType === "touch" &&
			!!this.activeVideo?.isConnected &&
			!this.gestureCoordinator.isPointerGestureActive() &&
			!isPointOnUI(e.target)
		);
	}

	public brightness = 1.0;
	public uiWrap: HTMLDivElement | null = null;
	public isScreenLocked = false;

	// Internal rate fighting states
	get _rateOverrideCount(): number {
		if (!this.activeVideo) return 0;
		return this.getVideoMetadata(this.activeVideo).rateOverrideCount || 0;
	}
	set _rateOverrideCount(value: number) {
		if (!this.activeVideo) return;
		this.updateVideoMetadata(this.activeVideo, { rateOverrideCount: value });
	}

	public settings!: Settings;
	public timers: Record<string, any> = {};
	public readonly abortController = new AbortController();

	private readonly videoMetadata = new WeakMap<
		HTMLVideoElement,
		VideoMetadata
	>();

	public getVideoMetadata(video: HTMLVideoElement): VideoMetadata {
		let meta = this.videoMetadata.get(video);
		if (!meta) {
			meta = {};
			this.videoMetadata.set(video, meta);
		}
		return meta;
	}

	public updateVideoMetadata(
		video: HTMLVideoElement,
		updates: Partial<VideoMetadata>,
	) {
		const meta = this.getVideoMetadata(video);
		Object.assign(meta, updates);
	}

	constructor(public readonly eventBus: EventBus) {
		// Clean up legacy storage keys from prior versions
		try {
			localStorage.removeItem("mvc_preloadEnhanced");
			localStorage.removeItem("mvc_volumeBoostEnabled");
			if (typeof GM_deleteValue !== "undefined") {
				GM_deleteValue("mvc_preloadEnhanced");
				GM_deleteValue("mvc_volumeBoostEnabled");
			}
		} catch (e) {}

		this.loadSettings();

		["beforeunload", "pagehide"].forEach((ev) =>
			window.addEventListener(
				ev,
				() => {
					if (this.activeVideo) {
						this.saveVideoPosition(this.activeVideo);
					}
					this.flushSettings();
				},
				{ capture: true, signal: this.abortController.signal },
			),
		);
	}

	private storageGet(key: string, fallback: any): any {
		try {
			if (typeof GM_getValue !== "undefined") {
				const v = GM_getValue(key);
				return v === undefined ? fallback : v;
			}
			const v = localStorage.getItem(key);
			return v === null ? fallback : JSON.parse(v);
		} catch (e) {
			return fallback;
		}
	}

	private storageSet(key: string, val: any): void {
		try {
			if (typeof GM_setValue !== "undefined") {
				GM_setValue(key, val);
			} else {
				localStorage.setItem(key, JSON.stringify(val));
			}
		} catch (e) {}
	}

	public setActiveVideo(v: HTMLVideoElement | null) {
		if (this.activeVideo === v) return;
		this.activeVideo = v;
		this.eventBus.emit("video:active-changed", v);
	}

	private getStorageKey(key: string): string {
		return `mvc_${key}`;
	}

	private getDomainSpeedKey(): string {
		let domain = "";
		if (typeof window !== "undefined" && window.location) {
			if (window.location.hostname) {
				domain = window.location.hostname;
			} else if (window.location.href) {
				try {
					domain = new URL(window.location.href).hostname;
				} catch (e) {}
			}
		}
		return domain ? `mvc_lastRate_${domain}` : "mvc_lastRate";
	}

	// ── Settings persistence ────────────────────────────────────────────────
	public loadSettings() {
		let savedRate = this.storageGet(this.getDomainSpeedKey(), null);
		if (savedRate === null) {
			savedRate = this.storageGet(this.getStorageKey("lastRate"), 1.0);
		}

		this.settings = {
			skipSeconds: this.storageGet(this.getStorageKey("skipSeconds"), 10),
			defaultSpeed: this.storageGet(this.getStorageKey("defaultSpeed"), 1.0),
			lastRate: savedRate,
			transform: { ratio: "fit", zoom: 1 },
			gesturesEnabled: this.storageGet(
				this.getStorageKey("gesturesEnabled"),
				true,
			),
			scrollCompatibility: this.storageGet(
				this.getStorageKey("scrollCompatibility"),
				true,
			),
			rememberPlayback: this.storageGet(
				this.getStorageKey("rememberPlayback"),
				true,
			),
		};
	}

	public saveSetting(key: string, val: any) {
		this.settings[key] = val;
		if (key === "lastRate") {
			this._rateOverrideCount = 0;
		}
		this.eventBus.emit("settings:changed", { key, val });

		if (key === "transform") {
			if (this.activeVideo) {
				this.updateVideoMetadata(this.activeVideo, { transform: val });
			}
			return; // Do not persist transform in localStorage
		}

		clearTimeout(this.timers[`save_${key}`]);
		this.timers[`save_${key}`] = setTimeout(() => {
			const storageKey =
				key === "lastRate" ? this.getDomainSpeedKey() : this.getStorageKey(key);
			this.storageSet(storageKey, val);
		}, MVC_CONFIG.STORAGE_DEBOUNCE_MS) as any;
	}

	public flushSettings() {
		if (!this.settings) return;
		for (const key of Object.keys(this.settings)) {
			if (key === "transform") continue; // Do not persist transform in localStorage
			clearTimeout(this.timers[`save_${key}`]);
			const storageKey =
				key === "lastRate" ? this.getDomainSpeedKey() : this.getStorageKey(key);
			this.storageSet(storageKey, this.settings[key]);
		}
	}

	public getVideoPosition(video: HTMLVideoElement): number {
		if (!this.settings.rememberPlayback) return 0;
		try {
			const positions = this.storageGet(this.getStorageKey("positions"), {});
			const id = this.getVideoId(video);
			// Backward compatibility: read both prefixed and legacy non-prefixed keys
			const time = positions[`_${id}`] ?? positions[id];
			if (typeof time === "number") {
				if (video.duration && time >= video.duration - 5) return 0;
				return time;
			}
		} catch (e) {}
		return 0;
	}

	public saveVideoPosition(video: HTMLVideoElement) {
		if (!this.settings.rememberPlayback) return;
		const time = video.currentTime;
		if (time === undefined || isNaN(time) || time < 3) return;
		try {
			const key = this.getStorageKey("positions");
			const positions = this.storageGet(key, {});
			const id = this.getVideoId(video);
			const storageId = `_${id}`;

			// Clean up legacy non-prefixed and prefixed keys to avoid duplicates
			delete positions[id];
			delete positions[storageId];

			if (video.duration && time >= video.duration - 5) {
				// Already deleted
			} else {
				positions[storageId] = time;
			}

			const keys = Object.keys(positions);
			if (keys.length > 100) {
				delete positions[keys[0]];
			}

			this.storageSet(key, positions);
		} catch (e) {}
	}

	private getVideoId(v: HTMLVideoElement): string {
		const meta = this.getVideoMetadata(v);
		const src = v.currentSrc || v.src || "";

		if (meta.videoId && meta.videoIdSrc === src) {
			return meta.videoId;
		}

		let id: string;
		if (src && !src.startsWith("blob:") && !src.startsWith("data:")) {
			id = cleanUrl(src);
		} else {
			const url = cleanUrl(window.location.href);
			const path = getVideoDomPath(v);
			const cleanPath = path.startsWith("#") ? path.substring(1) : path;
			if (!cleanPath) {
				id = url;
			} else {
				const delimiter = url.includes("#")
					? url.endsWith("#")
						? ""
						: "#"
					: "#";
				id = url + delimiter + cleanPath;
			}
		}

		try {
			this.updateVideoMetadata(v, { videoId: id, videoIdSrc: src });
		} catch (e) {}

		return id;
	}
}

function cleanUrl(urlStr: string): string {
	try {
		const url = new URL(urlStr);
		const toRemove = ["t", "time", "start", "position", "seek"];
		toRemove.forEach((p) => url.searchParams.delete(p));

		let hash = url.hash;
		if (hash) {
			// Normalize ampersand parameters in hash if there is no question mark (e.g. #/route&t=10)
			if (!hash.includes("?") && hash.includes("&") && hash.includes("=")) {
				const firstAmp = hash.indexOf("&");
				hash = hash.substring(0, firstAmp) + "?" + hash.substring(firstAmp + 1);
			}

			const parts = hash.split("?");
			const route = parts[0];
			const query = parts[1];

			// Only treat the route portion as a query string if it doesn't contain path slashes
			const isRouteQuery = route.includes("=") && !route.includes("/");
			const params = new URLSearchParams(
				query || (isRouteQuery ? route.substring(1) : ""),
			);
			toRemove.forEach((p) => params.delete(p));
			const newQuery = params.toString();

			if (query) {
				url.hash = newQuery ? `${route}?${newQuery}` : route;
			} else if (isRouteQuery) {
				url.hash = newQuery ? `#${newQuery}` : "";
			} else {
				url.hash = route;
			}
		}
		return url.toString();
	} catch (e) {
		return urlStr;
	}
}

function getVideoDomPath(v: HTMLVideoElement): string {
	if (typeof v.id === "string" && v.id) return `#${v.id}`;
	if (typeof v.tagName !== "string") {
		return "video-mock";
	}

	const path: string[] = [];
	let current: HTMLElement | null = v;
	const docBody = typeof document !== "undefined" ? document.body : null;
	while (current && current !== docBody) {
		if (typeof current.tagName !== "string") break;
		let segment = current.tagName.toLowerCase();
		if (typeof current.id === "string" && current.id) {
			segment += `#${current.id}`;
			path.unshift(segment);
			break;
		} else {
			const className = current.className;
			if (typeof className === "string" && className.trim()) {
				const firstClass = className.trim().split(/\s+/)[0];
				if (firstClass && !firstClass.startsWith("mvc-")) {
					segment += `.${firstClass}`;
				}
			}
			let index = 0;
			try {
				let sibling = current.previousElementSibling;
				while (sibling) {
					if (sibling.tagName === current.tagName) {
						index++;
					}
					sibling = sibling.previousElementSibling;
				}
			} catch (e) {}
			segment += `[${index}]`;
		}
		path.unshift(segment);

		// Traverse through shadow root to host if parentElement is null
		const parentNode = current.parentNode;
		const parent =
			current.parentElement ||
			(parentNode && (parentNode as any).host
				? (parentNode as any).host
				: null);
		current = parent as HTMLElement | null;
	}
	return path.join(">");
}
