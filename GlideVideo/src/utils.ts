// src/utils.ts

export function isPointInRect(x: number, y: number, el: HTMLElement): boolean {
	const r = el.getBoundingClientRect();
	return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

export function isPointOnUI(target: EventTarget | null): boolean {
	if (!target) return false;
	const el = target as HTMLElement;
	return !!el.closest?.(".mvc-ui-wrap, .mvc-backdrop, .mvc-settings-sheet");
}

export function preventPropagation(el: HTMLElement) {
	const events = [
		"click",
		"dblclick",
		"pointerdown",
		"pointerup",
		"touchstart",
		"touchend",
		"mousedown",
		"mouseup",
		"contextmenu",
	];
	events.forEach((ev) => {
		el.addEventListener(ev, (e) => e.stopPropagation());
	});
}

export function formatDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return "00:00";
	const abs = Math.floor(Math.abs(seconds));
	const h = Math.floor(abs / 3600);
	const m = Math.floor((abs % 3600) / 60);
	const s = abs % 60;
	const pad = (v: number) => (v < 10 ? "0" : "") + v;
	return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDelta(seconds: number): string {
	if (Number.isNaN(seconds)) return "+0s";
	const sign = seconds < 0 ? "-" : "+";
	const abs = Math.floor(Math.abs(seconds));
	if (abs < 60) {
		return `${sign}${abs}s`;
	}
	const m = Math.floor(abs / 60);
	const s = abs % 60;
	return s > 0 ? `${sign}${m}m ${s}s` : `${sign}${m}m`;
}

export function clamp(v: number, a: number, b: number): number {
	return Math.max(a, Math.min(b, v));
}

export function clampTime(t: number, duration: number): number {
	return clamp(t, 0, duration);
}

export function getFullscreenContainer(): HTMLElement {
	let fs = document.fullscreenElement || document.webkitFullscreenElement;
	if (fs?.tagName === "VIDEO") {
		fs = fs.parentElement;
	}
	return (fs as HTMLElement) || document.body;
}

export function findAllVideos(root: Node | ShadowRoot): HTMLVideoElement[] {
	const videos: HTMLVideoElement[] = [];
	const walk = (node: Node) => {
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (el.tagName === "VIDEO") {
				videos.push(el as HTMLVideoElement);
			}
			if (el.shadowRoot) {
				walk(el.shadowRoot);
			}
		}
		for (let i = 0; i < node.childNodes.length; i++) {
			walk(node.childNodes[i]);
		}
	};
	walk(root);
	return videos;
}

export function vibrate(ms = 10) {
	if (navigator.vibrate) {
		try {
			navigator.vibrate(ms);
		} catch {}
	}
}

/**
 * Trailing-edge debounce with an optional ceiling on how long the call can be
 * deferred. Without `maxWait`, a page that mutates continuously (ad reloads,
 * live chat, YouTube) resets the timer forever and the callback never runs.
 */
export function debounce<T extends (...args: any[]) => void>(
	func: T,
	wait: number,
	maxWait?: number,
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	let firstCallAt = 0;
	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (!timeout) firstCallAt = now;
		if (maxWait !== undefined && now - firstCallAt >= maxWait) {
			clearTimeout(timeout);
			timeout = undefined;
			func(...args);
			return;
		}
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			timeout = undefined;
			func(...args);
		}, wait);
	};
}

export function isPlaying(v: HTMLVideoElement | null): boolean {
	if (!v) return false;
	return !v.paused && !v.ended && v.readyState > 2;
}

export function shouldBlockGestures(): boolean {
	const isFullscreen = !!(
		document.fullscreenElement || document.webkitFullscreenElement
	);
	const isPortrait =
		typeof window !== "undefined" && window.matchMedia
			? window.matchMedia("(orientation: portrait)").matches
			: false;
	return isPortrait && !isFullscreen;
}
