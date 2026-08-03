import { MVC_CONFIG } from "../config";
import type { StateStore } from "../core/StateStore";
// src/video/VideoTracker.ts
import type { EventBus } from "../events/EventBus";
import { debounce, findAllVideos, isPlaying } from "../utils";
import { getVideoAdapter, type VideoAdapter } from "./VideoAdapter";

/**
 * Media events don't bubble, so they can't be caught by a listener on an
 * ancestor — but they do capture. Each of these changes something a reject
 * filter in evaluateActive() depends on.
 */
const REEVALUATE_ON = ["play", "loadedmetadata", "volumechange"];

export class VideoTracker {
	public intersectionObserver?: IntersectionObserver;
	public mutationObserver?: MutationObserver;
	public resizeObserver?: ResizeObserver;
	public shadowObservers = new Map<ShadowRoot, MutationObserver>();
	private originalAttachShadow?: typeof Element.prototype.attachShadow;
	private readonly adapter: VideoAdapter = getVideoAdapter();
	private readonly onMediaEvent = () => this.debouncedEvaluate();

	public debouncedEvaluate: () => void;

	constructor(
		private readonly eventBus: EventBus,
		private readonly store: StateStore,
	) {
		this.debouncedEvaluate = debounce(
			this.evaluateActive.bind(this),
			MVC_CONFIG.MUTATION_DEBOUNCE_MS,
			MVC_CONFIG.MUTATION_DEBOUNCE_MAX_MS,
		);
	}

	public init() {
		this.setupObservers();
		setTimeout(() => this.evaluateActive(), MVC_CONFIG.INITIAL_EVAL_DELAY);
	}

	/**
	 * Every video we watch goes through here, so the IntersectionObserver, the
	 * ResizeObserver and the media listeners can never drift apart.
	 *
	 * The ResizeObserver is the important one: a video that is 0x0 or too small
	 * when evaluateActive() first runs gets rejected, but IntersectionObserver
	 * has already reported it as intersecting — so it never fires again and the
	 * video is never reconsidered once the player sizes it. That is the "have to
	 * refresh the page" bug.
	 */
	public watchVideo(v: HTMLVideoElement) {
		this.intersectionObserver?.observe(v);
		this.resizeObserver?.observe(v);
		REEVALUATE_ON.forEach((ev) =>
			v.addEventListener(ev, this.onMediaEvent, { passive: true }),
		);
	}

	public unwatchVideo(v: HTMLVideoElement) {
		this.intersectionObserver?.unobserve(v);
		this.resizeObserver?.unobserve(v);
		REEVALUATE_ON.forEach((ev) => v.removeEventListener(ev, this.onMediaEvent));
	}

	public destroy() {
		if (this.intersectionObserver) this.intersectionObserver.disconnect();
		if (this.mutationObserver) this.mutationObserver.disconnect();
		if (this.resizeObserver) this.resizeObserver.disconnect();
		this.shadowObservers.forEach((obs) => obs.disconnect());
		this.shadowObservers.clear();
		// Nothing after this point may be skipped — a throw here would leave the
		// attachShadow patch installed.
		this.store.visibleVideos.forEach((_, v) => {
			if (typeof v?.removeEventListener !== "function") return;
			REEVALUATE_ON.forEach((ev) => v.removeEventListener(ev, this.onMediaEvent));
		});
		if (this.originalAttachShadow) {
			Element.prototype.attachShadow = this.originalAttachShadow;
			this.originalAttachShadow = undefined;
		}
	}

	// ── Active-video selection ──────────────────────────────────────────────
	public evaluateActive() {
		if (
			this.store.activeVideo &&
			isPlaying(this.store.activeVideo) &&
			this.store.activeVideo.isConnected &&
			this.store.visibleVideos.has(this.store.activeVideo)
		) {
			const r = this.store.activeVideo.getBoundingClientRect();
			if (
				r.height > MVC_CONFIG.MIN_VIDEO_HEIGHT &&
				r.bottom > 0 &&
				r.top < window.innerHeight
			)
				return;
		}

		let best: HTMLVideoElement | null = null;
		let bestScore = -1;
		const viewArea = window.innerWidth * window.innerHeight;

		for (const v of this.store.visibleVideos.keys()) {
			if (!v.isConnected) {
				this.store.visibleVideos.delete(v);
				continue;
			}
			if (getComputedStyle(v).visibility === "hidden") continue;

			const r = v.getBoundingClientRect();
			const area = r.width * r.height;

			if (
				area < MVC_CONFIG.MIN_VIDEO_AREA ||
				r.height < MVC_CONFIG.MIN_VIDEO_HEIGHT
			)
				continue;

			// Skip small preview thumbnails inside links, but allow large players wrapped in <a>
			if (v.closest("a")) {
				if (
					r.width < MVC_CONFIG.LINKED_VIDEO_MIN_WIDTH ||
					r.height < MVC_CONFIG.LINKED_VIDEO_MIN_HEIGHT
				) {
					continue;
				}
			}
			if (this.adapter.shouldIgnoreVideo(v)) continue;
			if (r.height < MVC_CONFIG.SMALL_MUTED_VIDEO_HEIGHT && v.muted) continue;

			const score = area + (isPlaying(v) ? viewArea * 2 : 0);
			if (score > bestScore) {
				best = v;
				bestScore = score;
			}
		}

		if (this.store.activeVideo !== best) {
			this.eventBus.emit("control:visibility-requested", { visible: false });
			this.store.setActiveVideo(best);
		}
	}

	// ── Observers ───────────────────────────────────────────────────────────
	public setupObservers() {
		this.intersectionObserver = new IntersectionObserver(
			(e) => this.handleIntersection(e),
			{ threshold: 0.05 },
		);
		// A video growing into eligibility fires no IntersectionObserver entry
		this.resizeObserver = new ResizeObserver(() => this.debouncedEvaluate());
		findAllVideos(document).forEach((v) => this.watchVideo(v));

		this.mutationObserver = new MutationObserver((m) => this.handleMutation(m));
		const root = document.body || document.documentElement;
		this.mutationObserver.observe(root, { childList: true, subtree: true });

		this.observeShadowRoots(document);
	}

	public handleIntersection(entries: IntersectionObserverEntry[]) {
		let needsReevaluation = false;
		entries.forEach((entry) => {
			const target = entry.target as HTMLVideoElement;
			if (entry.isIntersecting) {
				if (!this.store.visibleVideos.has(target)) {
					this.store.visibleVideos.set(target, true);
					needsReevaluation = true;
				}
			} else {
				if (this.store.visibleVideos.has(target)) {
					this.store.visibleVideos.delete(target);
					if (target === this.store.activeVideo) {
						if (this.store.activeVideo !== null) {
							this.eventBus.emit("control:visibility-requested", {
								visible: false,
							});
							this.store.setActiveVideo(null);
						}
					}
					needsReevaluation = true;
				}
			}
		});
		if (needsReevaluation) this.debouncedEvaluate();
	}

	private pendingAddedElements: HTMLElement[] = [];
	private isWalkScheduled = false;

	public handleMutation(mutations: MutationRecord[]) {
		let activeVideoRemoved = false;
		let removedNodesPresent = false;

		mutations.forEach((mutation) => {
			if (mutation.addedNodes.length) {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === 1) {
						this.pendingAddedElements.push(node as HTMLElement);
					}
				});
			}
			if (mutation.removedNodes.length) {
				mutation.removedNodes.forEach((node) => {
					if (node.nodeType === 1) {
						const el = node as HTMLElement;
						this.cleanupShadowObserversFor(el);
						const videos = findAllVideos(el);
						if (videos.length) {
							removedNodesPresent = true;
							videos.forEach((v) => {
								this.unwatchVideo(v);
								this.store.visibleVideos.delete(v);
								if (v === this.store.activeVideo) activeVideoRemoved = true;
							});
						}
					}
				});
			}
		});

		if (activeVideoRemoved) {
			this.store.setActiveVideo(null);
		}

		if (
			removedNodesPresent ||
			(this.store.activeVideo && !this.store.activeVideo.isConnected)
		) {
			this.debouncedEvaluate();
		}

		if (this.pendingAddedElements.length > 0 && !this.isWalkScheduled) {
			this.isWalkScheduled = true;
			// setTimeout rather than requestAnimationFrame: rAF is paused in
			// hidden tabs, which would stall discovery of videos added while
			// the page is backgrounded
			setTimeout(() => {
				this.isWalkScheduled = false;
				const elements = this.pendingAddedElements;
				this.pendingAddedElements = [];
				let videoAdded = false;

				for (let i = 0; i < elements.length; i++) {
					const el = elements[i];
					if (el.isConnected === false) continue;
					const videos = findAllVideos(el);
					if (videos.length > 0) {
						videos.forEach((v) => {
							this.watchVideo(v);
							videoAdded = true;
						});
					}
					this.observeShadowRoots(el);
				}

				if (videoAdded) {
					this.debouncedEvaluate();
				}
			}, 0);
		}
	}

	// ── Shadow DOM Observers ────────────────────────────────────────────────
	public observeShadowRoots(root: Node | ShadowRoot) {
		const walk = (node: Node) => {
			if (node.nodeType !== Node.ELEMENT_NODE) return;
			const el = node as HTMLElement;
			if (el.shadowRoot) {
				this.setupShadowRootObserver(el.shadowRoot);
				walk(el.shadowRoot);
			}
			for (let i = 0; i < el.childNodes.length; i++) {
				walk(el.childNodes[i]);
			}
		};
		walk(root);
	}

	public setupShadowRootObserver(shadowRoot: ShadowRoot) {
		if (this.shadowObservers.has(shadowRoot)) {
			if (this.store.isInitialized) {
				findAllVideos(shadowRoot).forEach((v) => this.watchVideo(v));
			}
			return;
		}
		const observer = new MutationObserver((m) => {
			if (!this.store.isInitialized) {
				if (shadowRoot.querySelector("video")) {
					this.eventBus.emit("controller:init-requested", undefined);
				} else {
					for (let i = 0; i < m.length; i++) {
						const mutation = m[i];
						for (let j = 0; j < mutation.addedNodes.length; j++) {
							const node = mutation.addedNodes[j];
							if (node.nodeType === Node.ELEMENT_NODE) {
								const el = node as HTMLElement;
								if (el.tagName === "VIDEO" || el.querySelector?.("video")) {
									this.eventBus.emit("controller:init-requested", undefined);
									return;
								}
								this.observeShadowRoots(el);
							}
						}
					}
				}
			} else {
				this.handleMutation(m);
			}
		});
		observer.observe(shadowRoot, { childList: true, subtree: true });
		this.shadowObservers.set(shadowRoot, observer);

		if (this.store.isInitialized) {
			findAllVideos(shadowRoot).forEach((v) => this.watchVideo(v));
			this.observeShadowRoots(shadowRoot);
		} else {
			if (findAllVideos(shadowRoot).length > 0) {
				this.eventBus.emit("controller:init-requested", undefined);
			} else {
				this.observeShadowRoots(shadowRoot);
			}
		}
	}

	public patchAttachShadow() {
		const proto = Element.prototype;
		if (proto.attachShadow && (proto.attachShadow as any).__mvc_patched) return;

		this.originalAttachShadow = proto.attachShadow;
		const originalAttachShadow = this.originalAttachShadow;
		const newAttachShadow = function (this: Element, init: ShadowRootInit) {
			const shadowRoot = originalAttachShadow.call(this, init);
			try {
				if (init) {
					setTimeout(() => {
						const instance = window.__MVC_INSTANCE;
						if (instance && instance.videoTracker) {
							instance.videoTracker.setupShadowRootObserver(shadowRoot);
						}
					}, 0);
				}
			} catch (e) {
				console.error("[MVC] Error observing dynamic shadow root:", e);
			}
			return shadowRoot;
		};
		(newAttachShadow as any).__mvc_patched = true;
		(proto as { attachShadow: any }).attachShadow = newAttachShadow;
	}

	private cleanupShadowObserversFor(element: HTMLElement) {
		const walk = (node: Node) => {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.shadowRoot) {
					const observer = this.shadowObservers.get(el.shadowRoot);
					if (observer) {
						observer.disconnect();
						this.shadowObservers.delete(el.shadowRoot);
					}
					walk(el.shadowRoot);
				}
			}
			for (let i = 0; i < node.childNodes.length; i++) {
				walk(node.childNodes[i]);
			}
		};
		walk(element);
	}
}
