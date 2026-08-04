// ==UserScript==
// @name         GlideVideo: Better Video Controls with Gesture for Mobile Web
// @namespace    https://github.com/quantavil/userscript/GlideVideo
// @version      8.3.0
// @author       quantavil (https://github.com/quantavil)
// @description  Makes mobile web video actually usable — control playback, volume, and zoom without fumbling for tiny buttons, all through natural touch gestures. Works on any browser that support extension like Edge, Firefox, Cromite etc.
// @license      MIT
// @homepage     https://github.com/quantavil/userscript
// @homepageURL  https://github.com/quantavil/userscript
// @match        *://*/*
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var EventBus = class {
		listeners = {};
		emit(event, payload) {
			const callbacks = this.listeners[event];
			if (callbacks) for (let i = 0, n = callbacks.length; i < n; i++) try {
				callbacks[i](payload);
			} catch (e) {
				console.error(`[GlideVideo] EventBus subscriber error on "${String(event)}":`, e);
			}
		}
		on(event, cb) {
			if (!this.listeners[event]) this.listeners[event] = [];
			this.listeners[event].push(cb);
			return () => {
				const arr = this.listeners[event];
				if (arr) {
					const idx = arr.indexOf(cb);
					if (idx !== -1) arr.splice(idx, 1);
				}
			};
		}
	};
	var MVC_CONFIG = {
		MIN_VIDEO_AREA: 22500,
		MIN_VIDEO_HEIGHT: 50,
		EDGE: 10,
		EDGE_TOUCH_PROTECTION_PADDING: 18,
		SIDEBAR_MIN_HEIGHT: 120,
		SIDEBAR_MAX_HEIGHT: 220,
		SIDEBAR_HEIGHT_RATIO: .55,
		INTERACTION_TIMEOUT: 4500,
		VISIBILITY_GUARDIAN_DELAY: 500,
		HIDE_GRACE_PERIOD_MS: 250,
		UI_FADE_TIMEOUT: 3500,
		UI_FADE_ANIMATION_DURATION: 350,
		TOAST_FADE_DELAY: 1500,
		DOUBLE_TAP_UI_HIDE_DELAY: 800,
		SLIDER_UI_HIDE_DELAY: 1200,
		CONTROLS_COLLAPSE_DELAY: 4e3,
		LONG_PRESS_DURATION_MS: 600,
		LONG_PRESS_VIBRATE_MS: 15,
		INITIAL_EVAL_DELAY: 500,
		HAPTIC_VIBRATION_MS: 10,
		LINKED_VIDEO_MIN_WIDTH: 250,
		LINKED_VIDEO_MIN_HEIGHT: 140,
		SMALL_MUTED_VIDEO_HEIGHT: 150,
		MUTATION_DEBOUNCE_MS: 250,
		MUTATION_DEBOUNCE_MAX_MS: 1e3,
		SCROLL_END_TIMEOUT: 150,
		STORAGE_DEBOUNCE_MS: 2e3,
		POSITION_SAVE_INTERVAL_MS: 2e3,
		MAX_POSITION_HISTORY: 100,
		POSITION_SAVE_MIN_TIME: 3,
		POSITION_SAVE_END_BUFFER: 5,
		GESTURE_MOVE_THRESHOLD: 10,
		LONG_PRESS_MOVE_TOLERANCE: 24,
		GESTURE_SEEK_SENSITIVITY: .15,
		GESTURE_VERTICAL_SENSITIVITY: 1.1,
		GESTURE_SEEK_DEADZONE: 5,
		GESTURE_SPEED_BOOST: 2,
		DOUBLE_TAP_DELAY: 300,
		DOUBLE_TAP_MAX_DISTANCE: 40,
		DOUBLE_TAP_RESET_DELAY: 650,
		DOUBLE_TAP_LOCK_RELEASE_MS: 250,
		CLICK_DELAY: 250,
		SPEED_MIN: .1,
		SPEED_MAX: 16,
		SPEED_DEFAULT: 1,
		SPEED_TAP_STEP: .1,
		SPEED_HOLD_STEP: .05,
		SPEED_HOLD_INITIAL_DELAY_MS: 400,
		SPEED_HOLD_INTERVAL_MS: 120,
		SPEED_STEPPER_STEP: .05,
		FAB_SPEED_MIN: .5,
		FAB_SPEED_MAX: 2,
		FAB_SPEED_STEP: .1,
		SKIP_DEFAULT: 10,
		SKIP_MIN: 5,
		SKIP_MAX: 300,
		SKIP_STEPPER_STEP: 5,
		PINCH_SNAP_POINTS: [
			.5,
			1,
			1.25,
			1.5,
			2,
			3
		],
		PINCH_SNAP_THRESHOLD: .15
	};
	function isPointInRect(x, y, el) {
		const r = el.getBoundingClientRect();
		return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
	}
	function isPointOnUI(target) {
		if (!target) return false;
		return !!target.closest?.(".mvc-ui-wrap, .mvc-backdrop, .mvc-settings-sheet");
	}
	function preventPropagation(el) {
		[
			"click",
			"dblclick",
			"pointerdown",
			"pointerup",
			"touchstart",
			"touchend",
			"mousedown",
			"mouseup",
			"contextmenu"
		].forEach((ev) => {
			el.addEventListener(ev, (e) => e.stopPropagation());
		});
	}
	function formatDuration(seconds) {
		if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return "00:00";
		const abs = Math.floor(Math.abs(seconds));
		const h = Math.floor(abs / 3600);
		const m = Math.floor(abs % 3600 / 60);
		const s = abs % 60;
		const pad = (v) => (v < 10 ? "0" : "") + v;
		return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
	}
	function formatDelta(seconds) {
		if (Number.isNaN(seconds)) return "+0s";
		const sign = seconds < 0 ? "-" : "+";
		const abs = Math.floor(Math.abs(seconds));
		if (abs < 60) return `${sign}${abs}s`;
		const m = Math.floor(abs / 60);
		const s = abs % 60;
		return s > 0 ? `${sign}${m}m ${s}s` : `${sign}${m}m`;
	}
	function clamp(v, a, b) {
		return Math.max(a, Math.min(b, v));
	}
	function clampTime(t, duration) {
		return clamp(t, 0, duration);
	}
	function getFullscreenContainer() {
		let fs = document.fullscreenElement || document.webkitFullscreenElement;
		if (fs?.tagName === "VIDEO") fs = fs.parentElement;
		return fs || document.body;
	}
	function findAllVideos(root) {
		const videos = [];
		const walk = (node) => {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node;
				if (el.tagName === "VIDEO") videos.push(el);
				if (el.shadowRoot) walk(el.shadowRoot);
			}
			for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
		};
		walk(root);
		return videos;
	}
	function vibrate(ms = 10) {
		if (navigator.vibrate) try {
			navigator.vibrate(ms);
		} catch {}
	}
	function debounce(func, wait, maxWait) {
		let timeout;
		let firstCallAt = 0;
		return (...args) => {
			const now = Date.now();
			if (!timeout) firstCallAt = now;
			if (maxWait !== void 0 && now - firstCallAt >= maxWait) {
				clearTimeout(timeout);
				timeout = void 0;
				func(...args);
				return;
			}
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				timeout = void 0;
				func(...args);
			}, wait);
		};
	}
	function isPlaying(v) {
		if (!v) return false;
		return !v.paused && !v.ended && v.readyState > 2;
	}
	function shouldBlockGestures() {
		const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
		return (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(orientation: portrait)").matches : false) && !isFullscreen;
	}
	var DoubleTapDetector = class {
		eventBus;
		store;
		lastTapTime = 0;
		lastTapX = 0;
		lastTapY = 0;
		lastTapSide = null;
		tapCount = 0;
		constructor(eventBus, store) {
			this.eventBus = eventBus;
			this.store = store;
		}
		init() {
			this.attachListeners();
		}
		attachListeners() {
			window.addEventListener("pointerdown", (e) => {
				const video = this.store.activeVideo;
				if (!video || !this.store.canStartTouchGesture(e)) return;
				const r = video.getBoundingClientRect();
				const margin = Math.min(r.height * .12, 48);
				if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top + margin || e.clientY > r.bottom - margin) return;
				const now = Date.now();
				const x = e.clientX;
				const y = e.clientY;
				const side = x < r.left + r.width / 2 ? "left" : "right";
				const timeDiff = now - this.lastTapTime;
				const distDiff = Math.hypot(x - this.lastTapX, y - this.lastTapY);
				if (timeDiff < MVC_CONFIG.DOUBLE_TAP_DELAY && distDiff < MVC_CONFIG.DOUBLE_TAP_MAX_DISTANCE && side === this.lastTapSide) {
					e.preventDefault();
					e.stopPropagation();
					if (this.store.gestureCoordinator.acquire("double_tap")) {
						clearTimeout(this.store.timers.doubleTapClear);
						this.store.timers.doubleTapClear = setTimeout(() => {
							this.store.gestureCoordinator.release("double_tap");
						}, MVC_CONFIG.DOUBLE_TAP_LOCK_RELEASE_MS);
					}
					if (this.store.timers.videoClick) {
						clearTimeout(this.store.timers.videoClick);
						this.store.timers.videoClick = void 0;
					}
					this.tapCount++;
					const skipSeconds = this.store.settings.skipSeconds || 10;
					const accumulated = (this.tapCount - 1) * skipSeconds;
					const dir = side === "left" ? -1 : 1;
					this.eventBus.emit("video:skip-requested", {
						dir,
						customSeconds: skipSeconds
					});
					vibrate(15);
					this.eventBus.emit("video:double-tap-skipped", {
						side,
						x,
						y,
						seconds: accumulated
					});
					clearTimeout(this.store.timers.doubleTapAccumulation);
					this.store.timers.doubleTapAccumulation = setTimeout(() => {
						this.tapCount = 0;
					}, MVC_CONFIG.DOUBLE_TAP_RESET_DELAY);
				} else {
					this.tapCount = 1;
					clearTimeout(this.store.timers.doubleTapAccumulation);
				}
				this.lastTapTime = now;
				this.lastTapX = x;
				this.lastTapY = y;
				this.lastTapSide = side;
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("pointerup", (e) => {
				if (this.store.isDoubleTapping && e.pointerType === "touch") {
					e.preventDefault();
					e.stopPropagation();
				}
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("click", (e) => {
				if (this.store.isDoubleTapping && e.isTrusted) {
					e.preventDefault();
					e.stopPropagation();
				}
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("dblclick", (e) => {
				if (this.store.isDoubleTapping) {
					e.preventDefault();
					e.stopPropagation();
				}
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
		}
	};
	var PressDetector = class {
		eventBus;
		store;
		inLongPressGesture = false;
		constructor(eventBus, store) {
			this.eventBus = eventBus;
			this.store = store;
			this.eventBus.on("gesture:cancel-speed-boost", () => {
				this.cancelLongPressSpeedBoost();
			});
		}
		init() {
			this.attachLongPressListeners();
		}
		cancelLongPressSpeedBoost() {
			if (this.store.timers.longPressSpeed) {
				clearTimeout(this.store.timers.longPressSpeed);
				this.store.timers.longPressSpeed = void 0;
			}
			if (this.inLongPressGesture) {
				if (this.store.activeVideo) {
					this.eventBus.emit("video:rate-change-requested", {
						rate: this.store.savedPlaybackRate ?? 1,
						saveToSettings: false
					});
					this.eventBus.emit("ui:gesture-overlay", null);
				}
				this.inLongPressGesture = false;
			}
			this.store.gestureCoordinator.release("speed_boost");
			this.store.savedPlaybackRate = void 0;
		}
		attachLongPressListeners() {
			let startX = 0;
			let startY = 0;
			window.addEventListener("pointerdown", (e) => {
				const video = this.store.activeVideo;
				if (!video || !this.store.canStartTouchGesture(e)) return;
				if (e.clientX < MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING || e.clientX > window.innerWidth - MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING) return;
				if (!isPointInRect(e.clientX, e.clientY, video)) return;
				this.cancelLongPressSpeedBoost();
				startX = e.clientX;
				startY = e.clientY;
				this.store.timers.longPressSpeed = setTimeout(() => {
					if (!this.store.activeVideo) return;
					if (this.store.gestureCoordinator.acquire("speed_boost")) {
						this.inLongPressGesture = true;
						this.store.savedPlaybackRate = this.store.activeVideo.playbackRate;
						this.eventBus.emit("video:rate-change-requested", {
							rate: MVC_CONFIG.GESTURE_SPEED_BOOST,
							saveToSettings: false
						});
						this.eventBus.emit("ui:gesture-overlay", { text: `${MVC_CONFIG.GESTURE_SPEED_BOOST}x` });
						vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
					}
				}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("pointermove", (e) => {
				if (e.pointerType !== "touch" || !this.store.timers.longPressSpeed || this.inLongPressGesture) return;
				const dx = e.clientX - startX;
				const dy = e.clientY - startY;
				if (Math.abs(dx) > MVC_CONFIG.LONG_PRESS_MOVE_TOLERANCE || Math.abs(dy) > MVC_CONFIG.LONG_PRESS_MOVE_TOLERANCE) this.cancelLongPressSpeedBoost();
			}, {
				capture: true,
				passive: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("pointerup", (e) => {
				if (e.pointerType !== "touch") return;
				if (this.inLongPressGesture) this.cancelLongPressSpeedBoost();
				else if (this.store.timers.longPressSpeed) {
					clearTimeout(this.store.timers.longPressSpeed);
					this.store.timers.longPressSpeed = void 0;
				}
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("pointercancel", (e) => {
				if (e.pointerType !== "touch") return;
				this.cancelLongPressSpeedBoost();
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("contextmenu", (e) => {
				if (this.store.settings.gesturesEnabled && (this.store.timers.longPressSpeed || this.inLongPressGesture)) {
					e.preventDefault();
					e.stopPropagation();
				}
			}, {
				capture: true,
				signal: this.store.abortController.signal
			});
		}
	};
	var SwipeDetector = class {
		eventBus;
		store;
		isPinching = false;
		initialDistance = 0;
		initialZoom = 1;
		constructor(eventBus, store) {
			this.eventBus = eventBus;
			this.store = store;
		}
		init() {
			this.attachSwipeListeners();
		}
		attachSwipeListeners() {
			window.addEventListener("touchstart", (e) => {
				if (!this.store.settings.gesturesEnabled) return;
				if (this.store.isScreenLocked) return;
				if (shouldBlockGestures() && !this.store.settings.scrollCompatibility) return;
				if (e.touches.length === 2) {
					const t1 = e.touches[0];
					const t2 = e.touches[1];
					if (isPointOnUI(t1.target) || isPointOnUI(t2.target)) return;
					if (!this.store.activeVideo?.isConnected) return;
					if (!isPointInRect(t1.clientX, t1.clientY, this.store.activeVideo) || !isPointInRect(t2.clientX, t2.clientY, this.store.activeVideo)) return;
					this.eventBus.emit("gesture:cancel-speed-boost", void 0);
					this.store.gestureCoordinator.release("swipe_seek");
					this.store.gestureCoordinator.release("volume_control");
					this.store.gestureCoordinator.release("brightness_control");
					if (this.store.gestureCoordinator.acquire("pinch")) {
						this.isPinching = true;
						this.initialDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
						this.initialZoom = this.store.settings.transform.zoom;
					}
					if (e.cancelable) e.preventDefault();
					return;
				}
				if (e.touches.length !== 1) return;
				const touch = e.touches[0];
				if (touch.clientX < MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING || touch.clientX > window.innerWidth - MVC_CONFIG.EDGE_TOUCH_PROTECTION_PADDING) return;
				if (isPointOnUI(touch.target)) return;
				if (!this.store.activeVideo?.isConnected) return;
				if (!isPointInRect(touch.clientX, touch.clientY, this.store.activeVideo)) return;
				if (this.store.gestureCoordinator.hasActiveGesture()) return;
				const video = this.store.activeVideo;
				if (!video) return;
				const startX = touch.clientX;
				const startY = touch.clientY;
				const initialTime = video.currentTime;
				const startVolume = video.muted ? 0 : video.volume;
				const startBrightness = this.store.brightness;
				const vr = video.getBoundingClientRect();
				const startSide = startX < vr.left + vr.width / 2 ? "left" : "right";
				let mode = "undecided";
				let newTime = initialTime;
				let onTouchMove;
				let onTouchEnd;
				onTouchMove = (ev) => {
					if (this.store.savedPlaybackRate !== void 0 || this.isPinching) return;
					const touchMove = ev.touches[0];
					const dx = touchMove.clientX - startX;
					const dy = touchMove.clientY - startY;
					const absDx = Math.abs(dx);
					const absDy = Math.abs(dy);
					if (mode === "undecided") {
						if (!(absDx > MVC_CONFIG.GESTURE_MOVE_THRESHOLD || absDy > MVC_CONFIG.GESTURE_MOVE_THRESHOLD)) return;
						const needsScrollComp = this.store.settings.scrollCompatibility && shouldBlockGestures();
						const isLeftHand = !!this.store.settings.leftHandMode;
						const volumeSide = isLeftHand ? "left" : "right";
						const brightnessSide = isLeftHand ? "right" : "left";
						if (absDx > absDy * 1.5) {
							if (!this.store.gestureCoordinator.acquire("swipe_seek")) {
								onTouchEnd();
								return;
							}
							mode = "seek";
						} else if (absDy > absDx * 1.5 && startSide === volumeSide) {
							if (needsScrollComp) {
								onTouchEnd();
								return;
							}
							if (!this.store.gestureCoordinator.acquire("volume_control")) {
								onTouchEnd();
								return;
							}
							mode = "volume";
						} else if (absDy > absDx * 1.5 && startSide === brightnessSide) {
							if (needsScrollComp) {
								onTouchEnd();
								return;
							}
							if (!this.store.gestureCoordinator.acquire("brightness_control")) {
								onTouchEnd();
								return;
							}
							mode = "brightness";
						} else {
							onTouchEnd();
							return;
						}
						this.eventBus.emit("gesture:cancel-speed-boost", void 0);
					}
					if (ev.cancelable) ev.preventDefault();
					if (mode === "seek") {
						let timeChange = dx * MVC_CONFIG.GESTURE_SEEK_SENSITIVITY;
						if (Math.abs(timeChange) < MVC_CONFIG.GESTURE_SEEK_DEADZONE || Number.isNaN(video.duration) || video.duration === 0) timeChange = 0;
						else timeChange = timeChange - Math.sign(timeChange) * MVC_CONFIG.GESTURE_SEEK_DEADZONE;
						if (timeChange === 0) this.eventBus.emit("ui:gesture-overlay", null);
						else {
							newTime = clampTime(initialTime + timeChange, video.duration);
							this.eventBus.emit("ui:gesture-overlay", {
								text: formatDuration(newTime),
								subText: formatDelta(timeChange)
							});
						}
					}
					if (mode === "volume") {
						const sensitivity = 1 / Math.max(vr.height * MVC_CONFIG.GESTURE_VERTICAL_SENSITIVITY, 1);
						const newVolume = clamp(startVolume - dy * sensitivity, 0, 1);
						video.muted = newVolume === 0;
						video.volume = newVolume;
						this.eventBus.emit("ui:volume-changed", { volume: newVolume });
					}
					if (mode === "brightness") {
						const sensitivity = 1 / Math.max(vr.height * MVC_CONFIG.GESTURE_VERTICAL_SENSITIVITY, 1);
						const newBrightness = clamp(startBrightness - dy * sensitivity, .1, 1);
						this.store.brightness = newBrightness;
						this.eventBus.emit("ui:brightness-changed", { brightness: newBrightness });
					}
				};
				onTouchEnd = () => {
					if (mode === "seek") {
						if (newTime !== initialTime) video.currentTime = newTime;
						this.store.gestureCoordinator.release("swipe_seek");
						this.eventBus.emit("ui:gesture-overlay", null);
					}
					if (mode === "volume") this.store.gestureCoordinator.release("volume_control");
					if (mode === "brightness") this.store.gestureCoordinator.release("brightness_control");
					mode = "undecided";
					window.removeEventListener("touchmove", onTouchMove);
					window.removeEventListener("touchend", onTouchEnd);
					window.removeEventListener("touchcancel", onTouchEnd);
				};
				window.addEventListener("touchmove", onTouchMove, {
					passive: false,
					signal: this.store.abortController.signal
				});
				window.addEventListener("touchend", onTouchEnd, { signal: this.store.abortController.signal });
				window.addEventListener("touchcancel", onTouchEnd, { signal: this.store.abortController.signal });
			}, {
				passive: false,
				capture: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("touchmove", (e) => {
				if (!this.store.settings.gesturesEnabled) return;
				if (this.store.isScreenLocked) return;
				if (this.isPinching && e.touches.length === 2) {
					const t1 = e.touches[0];
					const t2 = e.touches[1];
					const currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
					const scaleFactor = this.initialDistance > 0 ? currentDistance / this.initialDistance : 1;
					const newZoom = clamp(this.initialZoom * scaleFactor, .5, 3);
					this.store.settings.transform.zoom = newZoom;
					this.eventBus.emit("video:transform-need-update", void 0);
					this.eventBus.emit("ui:gesture-overlay", { text: `${Math.round(newZoom * 100)}%` });
					if (e.cancelable) e.preventDefault();
				}
			}, {
				passive: false,
				signal: this.store.abortController.signal
			});
			const onTouchEndOrCancel = () => {
				if (this.isPinching) {
					this.isPinching = false;
					this.store.gestureCoordinator.release("pinch");
					this.eventBus.emit("ui:gesture-overlay", null);
					const snapPoints = MVC_CONFIG.PINCH_SNAP_POINTS;
					const threshold = MVC_CONFIG.PINCH_SNAP_THRESHOLD;
					let currentZoom = this.store.settings.transform.zoom;
					let snapped = false;
					for (const p of snapPoints) if (Math.abs(currentZoom - p) <= threshold) {
						currentZoom = p;
						snapped = true;
						break;
					}
					if (snapped) {
						this.store.settings.transform.zoom = currentZoom;
						this.eventBus.emit("video:transform-need-update", void 0);
						vibrate(15);
					}
				}
			};
			window.addEventListener("touchend", onTouchEndOrCancel, {
				passive: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("touchcancel", onTouchEndOrCancel, {
				passive: true,
				signal: this.store.abortController.signal
			});
		}
	};
	var THEMES = `
        /* ── HALO (default) ────────────────────────────────────────────
           No surfaces at all. Each glyph carries its own dark outline —
           the subtitle solution. Nothing is drawn over the picture. */
        :root,
        :root[data-mvc-theme="halo"] {
            --mvc-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            --mvc-surface: transparent;
            --mvc-sheet: rgba(14, 15, 18, 0.94);
            --mvc-toast: rgba(14, 15, 18, 0.9);
            --mvc-border: 0;
            --mvc-text: #ffffff;
            --mvc-dim: rgba(255, 255, 255, 0.72);
            --mvc-accent: #ffffff;
            --mvc-fill: #ffffff;
            --mvc-on-accent: #0e0f12;
            --mvc-r-pill: 999px;
            --mvc-r-card: 16px;
            --mvc-r-sm: 8px;
            --mvc-blur: none;
            --mvc-shadow: none;
            --mvc-glow: none;
            --mvc-track: rgba(255, 255, 255, 0.42);
            --mvc-buffer: rgba(255, 255, 255, 0.6);
            --mvc-btn-on: rgba(255, 255, 255, 0.2);
            --mvc-switch-on: #ffffff;
            --mvc-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
            --mvc-dur: 0.2s;
            --mvc-glyph-shadow: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 5px rgba(0, 0, 0, 0.7));
            --mvc-frame: transparent;
            --mvc-ticks: none;
            --mvc-track-h: 3px;
        }

        /* ── HIGH CONTRAST ─────────────────────────────────────────────
           Near-opaque solids, amber, squared. Readable in sunlight and on
           washed-out panels. Zero blur, zero shadow. */
        :root[data-mvc-theme="contrast"] {
            --mvc-font: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
            --mvc-surface: rgba(8, 9, 10, 0.92);
            --mvc-sheet: rgba(8, 9, 10, 0.97);
            --mvc-toast: rgba(8, 9, 10, 0.97);
            --mvc-border: 1px solid rgba(255, 255, 255, 0.16);
            --mvc-text: #e8e6e1;
            --mvc-dim: rgba(232, 230, 225, 0.55);
            --mvc-accent: #ffb020;
            --mvc-fill: #ffb020;
            --mvc-on-accent: #150d00;
            --mvc-r-pill: 4px;
            --mvc-r-card: 6px;
            --mvc-r-sm: 2px;
            --mvc-blur: none;
            --mvc-shadow: none;
            --mvc-glow: none;
            --mvc-track: rgba(255, 255, 255, 0.16);
            --mvc-buffer: rgba(255, 255, 255, 0.32);
            --mvc-btn-on: rgba(255, 176, 32, 0.2);
            --mvc-switch-on: #ffb020;
            --mvc-ease: linear;
            --mvc-dur: 0.1s;
            --mvc-glyph-shadow: none;
            --mvc-frame: transparent;
            --mvc-ticks: none;
            --mvc-track-h: 4px;
        }

        /* ── FRAME ─────────────────────────────────────────────────────
           Halo's mechanism with a camera-gate vernacular: corner brackets,
           a 1px scrub line with frame ticks, one red playhead. */
        :root[data-mvc-theme="frame"] {
            --mvc-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            --mvc-surface: transparent;
            --mvc-sheet: rgba(12, 12, 13, 0.95);
            --mvc-toast: rgba(12, 12, 13, 0.92);
            --mvc-border: 0;
            --mvc-text: #f2f0ec;
            --mvc-dim: rgba(242, 240, 236, 0.6);
            --mvc-accent: #ff4438;
            --mvc-fill: #f2f0ec;
            --mvc-on-accent: #ffffff;
            --mvc-r-pill: 0px;
            --mvc-r-card: 0px;
            --mvc-r-sm: 0px;
            --mvc-blur: none;
            --mvc-shadow: none;
            --mvc-glow: none;
            --mvc-track: rgba(242, 240, 236, 0.28);
            --mvc-buffer: rgba(242, 240, 236, 0.45);
            --mvc-btn-on: rgba(255, 68, 56, 0.22);
            --mvc-switch-on: #ff4438;
            --mvc-ease: linear;
            --mvc-dur: 0.12s;
            --mvc-glyph-shadow: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
            --mvc-frame: rgba(242, 240, 236, 0.42);
            --mvc-ticks: repeating-linear-gradient(to right, rgba(242, 240, 236, 0.5) 0 1px, transparent 1px 100%);
            --mvc-track-h: 1px;
        }
`;
	function injectStyles() {
		if (document.getElementById("mvc-styles")) return;
		if (!document.head) return;
		const style = document.createElement("style");
		style.id = "mvc-styles";
		style.textContent = `
${THEMES}
        /* Top Header Bar Container.
           One filter here gives every glyph in the bar its halo in a single
           composited pass, instead of one filter per control. */
        .mvc-top-bar {
            position: fixed;
            top: 16px;
            left: 16px;
            right: 16px;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            pointer-events: none;
            filter: var(--mvc-glyph-shadow);
        }

        /* Left-Hand Mode (Reverse Layout) */
        :root[data-mvc-left-hand="true"] .mvc-top-bar {
            flex-direction: row-reverse;
        }
        :root[data-mvc-left-hand="true"] .mvc-controls-group {
            margin-left: 0;
            margin-right: auto;
        }
        :root[data-mvc-left-hand="true"] .mvc-controls-group.expanded .mvc-collapse-btn svg {
            transform: rotate(-180deg);
        }
        :root[data-mvc-left-hand="true"] .mvc-volume-bar { transform: scale(0.88) translateX(-6px); }
        :root[data-mvc-left-hand="true"] .mvc-brightness-bar { transform: scale(0.88) translateX(6px); }

        /* Camera-gate corner brackets — invisible unless a theme colours them.
           They fade with the rest of the chrome; left on permanently they just
           sit on the picture and distract. */
        .mvc-frame {
            position: fixed;
            pointer-events: none;
            z-index: 2147483645;
            opacity: 0;
            transition: opacity .35s ease;
        }
        .mvc-frame.visible { opacity: 1; }
        .mvc-frame i {
            position: absolute;
            width: 20px;
            height: 20px;
            border: 0 solid var(--mvc-frame);
        }
        .mvc-frame i:nth-child(1) { top: 12px; left: 12px; border-top-width: 1px; border-left-width: 1px; }
        .mvc-frame i:nth-child(2) { top: 12px; right: 12px; border-top-width: 1px; border-right-width: 1px; }
        .mvc-frame i:nth-child(3) { bottom: 12px; left: 12px; border-bottom-width: 1px; border-left-width: 1px; }
        .mvc-frame i:nth-child(4) { bottom: 12px; right: 12px; border-bottom-width: 1px; border-right-width: 1px; }

        /* Speed Control Container & Minimal Speed FAB */
        .mvc-speed-control-wrap {
            display: flex;
            align-items: center;
            pointer-events: auto;
            flex-shrink: 0;
        }

        .mvc-speed-fab {
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: var(--mvc-r-pill);
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--mvc-surface);
            color: var(--mvc-accent);
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            border: var(--mvc-border);
            box-shadow: var(--mvc-shadow);
            font-family: var(--mvc-font);
            font-size: 11px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            cursor: pointer;
            flex-shrink: 0;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.15s var(--mvc-ease), background var(--mvc-dur) var(--mvc-ease);
            padding: 0;
        }
        .mvc-speed-fab:active {
            transform: scale(0.9);
            background: var(--mvc-btn-on);
        }

        /* Stepper Pill */
        .mvc-stepper-pill {
            position: relative;
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--mvc-surface);
            color: var(--mvc-text);
            padding: 4px 8px;
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            box-shadow: var(--mvc-shadow);
            font-family: var(--mvc-font);
            font-weight: 600;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform var(--mvc-dur) var(--mvc-ease);
            touch-action: none;
            flex-shrink: 0;
        }

        /* Progress Bar (Ultra-Minimal Floating Line) */
        .mvc-progress-bar {
            flex: 1;
            min-width: 60px;
            height: 36px;
            display: flex;
            align-items: center;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 4px;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            pointer-events: auto;
            box-sizing: border-box;
            transition: opacity var(--mvc-dur) var(--mvc-ease);
        }

        .mvc-progress-track-wrap {
            position: relative;
            flex: 1;
            height: 20px;
            display: flex;
            align-items: center;
            cursor: pointer;
            touch-action: none;
        }

        /* Film-gate ticks — invisible unless a theme supplies them */
        .mvc-progress-track-wrap::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: calc(50% + 4px);
            height: 5px;
            background-image: var(--mvc-ticks);
            background-size: 8.333% 100%;
            pointer-events: none;
        }

        .mvc-progress-bg-track {
            position: absolute;
            left: 0;
            right: 0;
            height: var(--mvc-track-h);
            background: var(--mvc-track);
            border-radius: var(--mvc-r-sm);
        }

        .mvc-progress-buf-track {
            position: absolute;
            left: 0;
            height: var(--mvc-track-h);
            background: var(--mvc-buffer);
            border-radius: var(--mvc-r-sm);
            width: 0%;
        }

        .mvc-progress-fill-track {
            position: absolute;
            left: 0;
            height: var(--mvc-track-h);
            background: var(--mvc-fill);
            border-radius: var(--mvc-r-sm);
            width: 0%;
            box-shadow: var(--mvc-glow);
        }

        .mvc-progress-thumb {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 11px;
            height: 11px;
            border-radius: var(--mvc-r-pill);
            background: var(--mvc-fill);
            box-shadow: var(--mvc-glow);
            pointer-events: none;
            opacity: 0;
            transition: transform 0.15s var(--mvc-ease), opacity var(--mvc-dur) var(--mvc-ease);
        }
        :root[data-mvc-theme="frame"] .mvc-progress-thumb {
            width: 2px;
            height: 14px;
            background: var(--mvc-accent);
        }

        .mvc-progress-tooltip {
            position: absolute;
            bottom: calc(100% + 4px);
            transform: translateX(-50%);
            background: var(--mvc-toast);
            border: var(--mvc-border);
            color: var(--mvc-text);
            font-size: 11px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: var(--mvc-r-sm);
            pointer-events: none;
            white-space: nowrap;
            z-index: 2;
            font-variant-numeric: tabular-nums;
            font-family: var(--mvc-font);
        }

        .mvc-progress-track-wrap.dragging .mvc-progress-thumb,
        .mvc-progress-track-wrap:active .mvc-progress-thumb {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.4);
        }

        @media (hover: hover) {
            .mvc-progress-track-wrap:hover .mvc-progress-thumb {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.4);
            }
        }

        .mvc-stepper-pill-btn {
            background: transparent !important;
            border: none;
            color: var(--mvc-text) !important;
            font-size: 18px;
            font-weight: 400;
            cursor: pointer;
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border-radius: var(--mvc-r-pill);
            transition: background var(--mvc-dur) var(--mvc-ease), transform 0.15s var(--mvc-ease);
            touch-action: none;
        }
        .mvc-stepper-pill-btn:active {
            background: var(--mvc-btn-on);
            transform: scale(0.9);
        }

        .mvc-stepper-pill-val {
            font-variant-numeric: tabular-nums;
            font-size: 13px;
            min-width: 44px;
            text-align: center;
            color: var(--mvc-accent);
            cursor: pointer;
            padding: 2px 4px;
            border-radius: var(--mvc-r-sm);
            transition: background var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-stepper-pill-val:active {
            background: var(--mvc-btn-on);
        }

        /* Header Control Buttons (Top Right) & Collapse Button */
        .mvc-settings-btn,
        .mvc-pip-btn,
        .mvc-lock-btn,
        .mvc-ratio-btn,
        .mvc-collapse-btn {
            position: relative;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--mvc-surface);
            color: var(--mvc-text);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            cursor: pointer;
            box-shadow: var(--mvc-shadow);
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.2s var(--mvc-ease), background-color var(--mvc-dur) var(--mvc-ease);
            padding: 0;
            flex-shrink: 0;
        }

        /* Header Controls Group & Row */
        .mvc-controls-group {
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            pointer-events: auto;
            flex-shrink: 0;
            margin-left: auto;
        }
        .mvc-controls-row {
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 1;
            max-width: 240px;
            transition: max-width 0.35s var(--mvc-ease), opacity var(--mvc-dur) var(--mvc-ease);
            overflow: hidden;
        }
        .mvc-controls-row.collapsed {
            max-width: 0;
            opacity: 0;
            pointer-events: none;
        }
        .mvc-collapse-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor !important;
            transition: transform 0.35s var(--mvc-ease);
        }
        .mvc-controls-group.expanded .mvc-collapse-btn svg {
            transform: rotate(180deg);
        }
        .mvc-settings-btn:active,
        .mvc-pip-btn:active,
        .mvc-lock-btn:active,
        .mvc-ratio-btn:active,
        .mvc-collapse-btn:active {
            transform: scale(0.9);
            background: var(--mvc-btn-on);
        }
        .mvc-settings-btn.visible,
        .mvc-lock-btn[aria-pressed="true"] {
            background: var(--mvc-btn-on);
            color: var(--mvc-accent);
        }
        .mvc-settings-btn svg,
        .mvc-pip-btn svg,
        .mvc-lock-btn svg,
        .mvc-ratio-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor !important;
        }
        /* The ratio button doubles as the rotation control (long-press),
           so it shows the current angle. */
        .mvc-ratio-btn svg {
            transition: transform 0.25s var(--mvc-ease);
        }
        .mvc-ratio-btn[data-rot="90"] svg  { transform: rotate(90deg); }
        .mvc-ratio-btn[data-rot="180"] svg { transform: rotate(180deg); }
        .mvc-ratio-btn[data-rot="270"] svg { transform: rotate(270deg); }
        .mvc-ratio-btn[data-rot="90"],
        .mvc-ratio-btn[data-rot="180"],
        .mvc-ratio-btn[data-rot="270"] {
            background: var(--mvc-btn-on);
            color: var(--mvc-accent);
        }

        /* ── Settings Sheet — bottom sheet, centred on the video ────────
           Anchored to the bottom edge rather than hanging off the gear, so
           it never covers the controls it is changing and stays in reach. */
        .mvc-settings-sheet {
            position: fixed;
            left: 50%;
            bottom: 0;
            z-index: 2147483647;
            width: 420px;
            max-width: 94vw;
            max-height: 78vh;
            max-height: 78dvh;
            background: var(--mvc-sheet);
            border: var(--mvc-border);
            border-bottom: 0;
            border-radius: var(--mvc-r-card) var(--mvc-r-card) 0 0;
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            box-shadow: var(--mvc-shadow);
            padding: 14px 16px 20px;
            opacity: 0;
            transform: translate(-50%, 100%);
            pointer-events: none;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.28s var(--mvc-ease);
            font-family: var(--mvc-font);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
        }
        .mvc-settings-sheet.visible {
            opacity: 1;
            transform: translate(-50%, 0);
            pointer-events: auto;
        }

        /* The sheet is modal: transient overlays never share the frame */
        .mvc-settings-sheet.visible ~ .mvc-toast,
        .mvc-settings-sheet.visible ~ .mvc-gesture-overlay,
        .mvc-settings-sheet.visible ~ .mvc-doubletap-container {
            display: none !important;
        }

        .mvc-settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 10px;
            margin-bottom: 6px;
            flex-shrink: 0;
        }

        .mvc-settings-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--mvc-text);
            letter-spacing: -0.01em;
        }
        :root[data-mvc-theme="contrast"] .mvc-settings-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: var(--mvc-accent);
        }

        .mvc-settings-close-btn {
            background: transparent;
            border: var(--mvc-border);
            color: var(--mvc-dim);
            cursor: pointer;
            width: 28px;
            height: 28px;
            border-radius: var(--mvc-r-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background var(--mvc-dur) var(--mvc-ease), color var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-settings-close-btn:active {
            background: var(--mvc-btn-on);
            color: var(--mvc-text);
        }
        .mvc-settings-close-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor !important;
        }

        /* Two columns: toggles pair up, steppers and buttons span the width */
        .mvc-settings-card {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 18px;
            align-content: start;
            overflow-y: auto;
            flex: 1;
            scrollbar-width: none;
            overscroll-behavior: contain;
        }
        .mvc-settings-card::-webkit-scrollbar {
            display: none;
        }

        @media (max-height: 480px) {
            .mvc-settings-sheet {
                max-height: 92vh;
                max-height: 92dvh;
                padding: 10px 14px 14px;
            }
        }

        .mvc-settings-row {
            grid-column: 1 / -1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            min-width: 0;
            padding: 7px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }
        .mvc-settings-row.half { grid-column: auto; }
        /* Odd toggle count leaves the last row alone — a half-width rule above
           the reset button just looks broken. */
        .mvc-settings-row:last-of-type { border-bottom: 0; }

        .mvc-settings-label {
            color: var(--mvc-dim);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* One column is unreadable below ~320px of sheet */
        @media (max-width: 360px) {
            .mvc-settings-row.half { grid-column: 1 / -1; }
        }

        /* Steppers inside settings */
        .mvc-stepper {
            display: flex;
            align-items: center;
            gap: 4px;
            justify-content: flex-end;
        }
        .mvc-stepper-btn {
            border: var(--mvc-border);
            background: transparent;
            color: var(--mvc-text);
            font-size: 15px;
            font-weight: 600;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: var(--mvc-r-sm);
            transition: background var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-stepper-btn:active {
            background: var(--mvc-btn-on);
        }
        .mvc-stepper-val {
            color: var(--mvc-text);
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            min-width: 62px;
            text-align: center;
        }

        /* Switch */
        .mvc-switch {
            position: relative;
            width: 38px;
            height: 22px;
            flex-shrink: 0;
            background: var(--mvc-track);
            border-radius: var(--mvc-r-pill);
            transition: background-color var(--mvc-dur) var(--mvc-ease);
            cursor: pointer;
        }
        .mvc-switch.checked {
            background: var(--mvc-switch-on);
        }
        .mvc-switch-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 18px;
            height: 18px;
            border-radius: var(--mvc-r-pill);
            background: #fff;
            transition: transform var(--mvc-dur) var(--mvc-ease), background var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-switch.checked .mvc-switch-thumb {
            transform: translateX(16px);
            background: var(--mvc-on-accent);
        }

        /* Grid buttons */
        .mvc-grid-btn {
            grid-column: 1 / -1;
            appearance: none;
            border: var(--mvc-border);
            background: transparent;
            color: var(--mvc-text);
            border-radius: var(--mvc-r-sm);
            padding: 9px;
            margin: 10px 0 4px;
            font-family: var(--mvc-font);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            transition: background var(--mvc-dur) var(--mvc-ease), transform 0.1s var(--mvc-ease);
        }
        .mvc-grid-btn:active {
            background: var(--mvc-btn-on);
            transform: scale(0.98);
        }
        .mvc-grid-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor !important;
        }

        /* Backdrop */
        .mvc-backdrop {
            opacity: 0;
            pointer-events: none;
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            background: rgba(0, 0, 0, 0.4);
            transition: opacity var(--mvc-dur) var(--mvc-ease);
        }
        .mvc-backdrop.visible {
            opacity: 1;
            pointer-events: auto;
        }

        /* Unified Toast */
        .mvc-toast {
            position: fixed;
            left: 50%;
            bottom: 40px;
            transform: translateX(-50%) translateY(10px);
            background: var(--mvc-toast);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            color: var(--mvc-text);
            padding: 9px 16px;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform var(--mvc-dur) var(--mvc-ease);
            pointer-events: none;
            font-size: 13px;
            font-weight: 550;
            font-family: var(--mvc-font);
            box-shadow: var(--mvc-shadow);
            text-align: center;
        }
        .mvc-toast.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        /* Gesture feedback overlay (top-center, minimal) */
        .mvc-gesture-overlay {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--mvc-toast);
            border: var(--mvc-border);
            color: var(--mvc-text);
            font-size: 14px;
            font-weight: 600;
            padding: 6px 16px;
            border-radius: var(--mvc-r-pill);
            text-align: center;
            z-index: 2147483647;
            display: none;
            line-height: 1.3;
            pointer-events: none;
            box-shadow: var(--mvc-shadow);
            font-family: var(--mvc-font);
            font-variant-numeric: tabular-nums;
            user-select: none;
            -webkit-user-select: none;
        }

        /* Double Tap to Skip — minimal inline pill */
        .mvc-doubletap-panel {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 45%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s var(--mvc-ease);
        }
        .mvc-doubletap-panel.left { left: 0; }
        .mvc-doubletap-panel.right { right: 0; }
        .mvc-doubletap-panel.visible { opacity: 1; }

        .mvc-doubletap-inner {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--mvc-toast);
            border: var(--mvc-border);
            padding: 6px 14px;
            border-radius: var(--mvc-r-pill);
            box-shadow: var(--mvc-shadow);
        }

        .mvc-doubletap-chevrons {
            display: flex;
            gap: 0px;
        }
        .mvc-doubletap-chevron {
            font-size: 18px;
            font-weight: 900;
            color: var(--mvc-accent);
            opacity: 0.3;
            line-height: 1;
        }

        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(1) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0s; }
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(2) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.2s; }
        .mvc-doubletap-panel.right .mvc-doubletap-chevron:nth-child(3) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.4s; }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(1) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.4s; }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(2) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0.2s; }
        .mvc-doubletap-panel.left .mvc-doubletap-chevron:nth-child(3) { animation: mvc-chev-wave 1s ease-in-out infinite; animation-delay: 0s; }

        @keyframes mvc-chev-wave {
            0%, 100% { opacity: 0.3; }
            50%      { opacity: 1; }
        }

        .mvc-doubletap-text {
            font-size: 14px;
            font-weight: 700;
            color: var(--mvc-text);
            font-family: var(--mvc-font);
            font-variant-numeric: tabular-nums;
            line-height: 1;
        }

        /* Volume & Brightness rails — vertical pills on the video edges */
        .mvc-volume-bar,
        .mvc-brightness-bar {
            position: fixed;
            width: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            background: var(--mvc-surface);
            backdrop-filter: var(--mvc-blur);
            -webkit-backdrop-filter: var(--mvc-blur);
            border: var(--mvc-border);
            border-radius: var(--mvc-r-pill);
            padding: 12px 0;
            z-index: 2147483647;
            pointer-events: none;
            opacity: 0;
            transition: opacity var(--mvc-dur) var(--mvc-ease), transform 0.25s var(--mvc-ease);
            box-shadow: var(--mvc-shadow);
            filter: var(--mvc-glyph-shadow);
        }
        .mvc-volume-bar { transform: scale(0.88) translateX(6px); }
        .mvc-brightness-bar { transform: scale(0.88) translateX(-6px); }
        .mvc-volume-bar.visible,
        .mvc-brightness-bar.visible {
            opacity: 1;
            transform: scale(1) translateX(0);
        }

        .mvc-volume-icon,
        .mvc-brightness-icon {
            font-size: 13px;
            line-height: 1;
            flex-shrink: 0;
        }

        .mvc-volume-track,
        .mvc-brightness-track {
            flex: 1;
            width: 5px;
            background: var(--mvc-track);
            border-radius: var(--mvc-r-sm);
            position: relative;
            overflow: hidden;
            min-height: 60px;
        }
        .mvc-volume-fill,
        .mvc-brightness-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--mvc-fill);
            border-radius: var(--mvc-r-sm);
            transition: height 0.06s linear;
            box-shadow: var(--mvc-glow);
        }

        .mvc-volume-value,
        .mvc-brightness-value {
            font-size: 10px;
            font-weight: 700;
            color: var(--mvc-dim);
            font-variant-numeric: tabular-nums;
            font-family: var(--mvc-font);
            flex-shrink: 0;
        }

        /* Brightness Overlay */
        .mvc-brightness-overlay {
            position: fixed;
            background: black;
            opacity: 0;
            pointer-events: none;
            z-index: 2147483645;
            transition: opacity 0.05s linear;
        }

        /* Lock Screen Styles */
        .mvc-lock-shield {
            position: fixed;
            z-index: 2147483646;
            background: rgba(0,0,0,0);
            pointer-events: auto;
            touch-action: none;
        }

        .mvc-ui-wrap.locked .mvc-settings-btn,
        .mvc-ui-wrap.locked .mvc-pip-btn,
        .mvc-ui-wrap.locked .mvc-ratio-btn,
        .mvc-ui-wrap.locked .mvc-stepper-pill,
        .mvc-ui-wrap.locked .mvc-speed-fab,
        .mvc-ui-wrap.locked .mvc-progress-bar,
        .mvc-ui-wrap.locked .mvc-collapse-btn {
            display: none !important;
            pointer-events: none !important;
        }
        .mvc-ui-wrap.locked .mvc-controls-row {
            max-width: none !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            overflow: visible !important;
        }

        @media (prefers-reduced-motion: reduce) {
            .mvc-top-bar *,
            .mvc-settings-sheet,
            .mvc-toast,
            .mvc-volume-bar,
            .mvc-brightness-bar {
                transition-duration: 0.01ms !important;
                animation-duration: 0.01ms !important;
            }
        }
    `;
		document.head.appendChild(style);
	}
	var MVC_THEMES = [
		"halo",
		"contrast",
		"frame"
	];
	var MVC_THEME_LABELS = {
		halo: "Halo",
		contrast: "High Contrast",
		frame: "Frame"
	};
	function applyTheme(theme) {
		const root = document.documentElement;
		if (root) root.setAttribute("data-mvc-theme", theme);
	}
	var UIComponent = class {
		element;
		get dom() {
			return this.element;
		}
		update() {}
	};
	var ProgressBar = class extends UIComponent {
		eventBus;
		ui;
		trackWrap;
		bufTrack;
		fillTrack;
		thumbEl;
		tooltipEl;
		currentTime = 0;
		duration = 0;
		buffered = 0;
		isDragging = false;
		dragPct = 0;
		unsubscribers = [];
		constructor(eventBus, ui) {
			super();
			this.eventBus = eventBus;
			this.ui = ui;
			this.element = this.render();
			this.setupSubscriptions();
			this.setupPointerListeners();
		}
		render() {
			const wrap = document.createElement("div");
			wrap.className = "mvc-progress-bar";
			this.trackWrap = document.createElement("div");
			this.trackWrap.className = "mvc-progress-track-wrap";
			const bgTrack = document.createElement("div");
			bgTrack.className = "mvc-progress-bg-track";
			this.bufTrack = document.createElement("div");
			this.bufTrack.className = "mvc-progress-buf-track";
			this.fillTrack = document.createElement("div");
			this.fillTrack.className = "mvc-progress-fill-track";
			this.thumbEl = document.createElement("div");
			this.thumbEl.className = "mvc-progress-thumb";
			this.tooltipEl = document.createElement("div");
			this.tooltipEl.className = "mvc-progress-tooltip";
			this.tooltipEl.style.display = "none";
			this.trackWrap.append(bgTrack, this.bufTrack, this.fillTrack, this.thumbEl, this.tooltipEl);
			wrap.append(this.trackWrap);
			preventPropagation(wrap);
			return wrap;
		}
		setupSubscriptions() {
			this.unsubscribers.push(this.eventBus.on("video:time-update", ({ currentTime, duration, buffered }) => {
				this.currentTime = Number.isFinite(currentTime) ? currentTime : 0;
				this.duration = Number.isFinite(duration) ? duration : 0;
				this.buffered = Number.isFinite(buffered) ? buffered : 0;
				this.updateDisplay();
			}));
			this.unsubscribers.push(this.eventBus.on("video:active-changed", (v) => {
				this.isDragging = false;
				this.trackWrap.classList.remove("dragging");
				this.tooltipEl.style.display = "none";
				if (v) {
					this.currentTime = Number.isFinite(v.currentTime) ? v.currentTime : 0;
					this.duration = Number.isFinite(v.duration) ? v.duration : 0;
					this.updateDisplay();
				}
			}));
			this.unsubscribers.push(this.eventBus.on("settings:changed", ({ key }) => {
				if (key === "progressBarEnabled") this.updateDisplay();
			}));
		}
		updateDisplay() {
			if (this.ui.store.settings.progressBarEnabled === false) {
				this.element.style.display = "none";
				return;
			}
			this.element.style.display = "";
			if (this.isDragging) return;
			this.tooltipEl.style.display = "none";
			const duration = Number.isFinite(this.duration) ? this.duration : 0;
			const pct = duration > 0 ? clamp(this.currentTime / duration * 100, 0, 100) : 0;
			const bufPct = duration > 0 ? clamp(this.buffered / duration * 100, 0, 100) : 0;
			this.bufTrack.style.width = `${bufPct}%`;
			this.fillTrack.style.width = `${pct}%`;
			this.thumbEl.style.left = `${pct}%`;
		}
		setupPointerListeners() {
			const onPointerDown = (e) => {
				e.stopPropagation();
				e.preventDefault();
				this.ui.showUI(true);
				this.isDragging = true;
				this.trackWrap.classList.add("dragging");
				try {
					this.trackWrap.setPointerCapture(e.pointerId);
				} catch {}
				this.updateDragPosition(e);
				vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
			};
			const onPointerMove = (e) => {
				if (!this.isDragging) return;
				e.stopPropagation();
				e.preventDefault();
				this.updateDragPosition(e);
			};
			const onPointerUp = (e) => {
				if (!this.isDragging) return;
				e.stopPropagation();
				e.preventDefault();
				const duration = Number.isFinite(this.duration) ? this.duration : 0;
				const targetTime = this.dragPct / 100 * duration;
				this.endDrag(e);
				this.eventBus.emit("video:seek-requested", { time: targetTime });
				vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
				this.ui.showToast(`Seek: ${formatDuration(targetTime)} / ${formatDuration(duration)}`);
				this.updateDisplay();
			};
			const onPointerCancel = (e) => {
				if (!this.isDragging) return;
				this.endDrag(e);
				this.updateDisplay();
			};
			this.trackWrap.addEventListener("pointerdown", onPointerDown);
			this.trackWrap.addEventListener("pointermove", onPointerMove);
			this.trackWrap.addEventListener("pointerup", onPointerUp);
			this.trackWrap.addEventListener("pointercancel", onPointerCancel);
			this.trackWrap.addEventListener("lostpointercapture", onPointerCancel);
			this.unsubscribers.push(() => {
				this.trackWrap.removeEventListener("pointerdown", onPointerDown);
				this.trackWrap.removeEventListener("pointermove", onPointerMove);
				this.trackWrap.removeEventListener("pointerup", onPointerUp);
				this.trackWrap.removeEventListener("pointercancel", onPointerCancel);
				this.trackWrap.removeEventListener("lostpointercapture", onPointerCancel);
			});
		}
		endDrag(e) {
			this.isDragging = false;
			this.trackWrap.classList.remove("dragging");
			this.tooltipEl.style.display = "none";
			try {
				this.trackWrap.releasePointerCapture(e.pointerId);
			} catch {}
		}
		updateDragPosition(e) {
			const rect = this.trackWrap.getBoundingClientRect();
			if (rect.width <= 0) return;
			const pct = clamp((e.clientX - rect.left) / rect.width * 100, 0, 100);
			this.dragPct = pct;
			const duration = Number.isFinite(this.duration) ? this.duration : 0;
			const previewTime = pct / 100 * duration;
			this.fillTrack.style.width = `${pct}%`;
			this.thumbEl.style.left = `${pct}%`;
			this.tooltipEl.style.left = `${pct}%`;
			this.tooltipEl.style.display = "block";
			this.tooltipEl.textContent = formatDuration(previewTime);
		}
		destroy() {
			this.unsubscribers.forEach((unsub) => unsub());
			this.unsubscribers = [];
			this.element.remove();
		}
	};
	var SVG_PATHS = {
		settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.22-.07.49.12.61l2.03 1.58c-.04.3-.06.61-.06.94 0 .32.02.64.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
		close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
		reset: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
		pip: "M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",
		lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
		unlock: "M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z",
		ratio: "M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12z",
		chevron: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
	};
	function getSvgIcon(name) {
		const svgNS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgNS, "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("width", "20");
		svg.setAttribute("height", "20");
		svg.setAttribute("fill", "currentColor");
		const path = document.createElementNS(svgNS, "path");
		path.setAttribute("d", SVG_PATHS[name] || "");
		svg.appendChild(path);
		return svg;
	}
	function settingsRow(label, control, half = false) {
		const row = document.createElement("div");
		row.className = half ? "mvc-settings-row half" : "mvc-settings-row";
		const labelEl = document.createElement("label");
		labelEl.className = "mvc-settings-label";
		labelEl.textContent = label;
		row.append(labelEl, control);
		return row;
	}
	var Stepper = class extends UIComponent {
		label;
		valFmt;
		getVal;
		onAdjust;
		valEl;
		constructor(label, valFmt, getVal, onAdjust) {
			super();
			this.label = label;
			this.valFmt = valFmt;
			this.getVal = getVal;
			this.onAdjust = onAdjust;
			this.element = this.render();
		}
		render() {
			const stepper = document.createElement("div");
			stepper.className = "mvc-stepper";
			const decBtn = document.createElement("button");
			decBtn.className = "mvc-stepper-btn";
			decBtn.textContent = "-";
			this.valEl = document.createElement("span");
			this.valEl.className = "mvc-stepper-val";
			this.valEl.textContent = this.valFmt(this.getVal());
			const incBtn = document.createElement("button");
			incBtn.className = "mvc-stepper-btn";
			incBtn.textContent = "+";
			decBtn.onclick = (e) => {
				e.stopPropagation();
				vibrate(10);
				this.onAdjust(-1);
				this.update();
			};
			incBtn.onclick = (e) => {
				e.stopPropagation();
				vibrate(10);
				this.onAdjust(1);
				this.update();
			};
			stepper.append(decBtn, this.valEl, incBtn);
			return settingsRow(this.label, stepper);
		}
		update() {
			this.valEl.textContent = this.valFmt(this.getVal());
		}
	};
	var Switch = class extends UIComponent {
		label;
		checked;
		onChange;
		switchContainer;
		constructor(label, checked, onChange) {
			super();
			this.label = label;
			this.checked = checked;
			this.onChange = onChange;
			this.element = this.render();
		}
		render() {
			this.switchContainer = document.createElement("div");
			this.switchContainer.className = "mvc-switch";
			if (this.checked) this.switchContainer.classList.add("checked");
			const switchThumb = document.createElement("div");
			switchThumb.className = "mvc-switch-thumb";
			this.switchContainer.appendChild(switchThumb);
			this.switchContainer.onclick = (e) => {
				e.stopPropagation();
				vibrate(10);
				const isChecked = this.switchContainer.classList.toggle("checked");
				this.checked = isChecked;
				this.onChange(isChecked);
			};
			return settingsRow(this.label, this.switchContainer, true);
		}
		setChecked(checked) {
			this.checked = checked;
			this.switchContainer.classList.toggle("checked", checked);
		}
	};
	var TOGGLES = [
		{
			label: "Speed FAB",
			key: "minimalSpeedFab",
			def: false
		},
		{
			label: "Left hand",
			key: "leftHandMode",
			def: false
		},
		{
			label: "Progress bar",
			key: "progressBarEnabled",
			def: true
		},
		{
			label: "Gestures",
			key: "gesturesEnabled",
			def: true
		},
		{
			label: "Remember",
			key: "rememberPlayback",
			def: true
		},
		{
			label: "Page scroll",
			key: "scrollCompatibility",
			def: true
		}
	];
	var SettingsSheet = class extends UIComponent {
		eventBus;
		store;
		ui;
		steppers = [];
		switches = [];
		constructor(eventBus, store, ui) {
			super();
			this.eventBus = eventBus;
			this.store = store;
			this.ui = ui;
			this.element = this.render();
		}
		render() {
			const sheet = document.createElement("div");
			sheet.className = "mvc-settings-sheet";
			const header = document.createElement("div");
			header.className = "mvc-settings-header";
			const title = document.createElement("div");
			title.className = "mvc-settings-title";
			title.textContent = "Settings";
			const closeBtn = document.createElement("button");
			closeBtn.className = "mvc-settings-close-btn";
			closeBtn.setAttribute("aria-label", "Close settings");
			closeBtn.appendChild(this.ui.getIcon("close"));
			closeBtn.onclick = (e) => {
				e.stopPropagation();
				vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
				this.ui.hideAllMenus();
			};
			header.append(title, closeBtn);
			sheet.appendChild(header);
			const card = document.createElement("div");
			card.className = "mvc-settings-card";
			sheet.appendChild(card);
			this.addStepper(card, "Theme", (i) => MVC_THEME_LABELS[MVC_THEMES[i]] ?? "Halo", () => Math.max(0, MVC_THEMES.indexOf(this.store.settings.theme)), (dir) => {
				const n = MVC_THEMES.length;
				const cur = Math.max(0, MVC_THEMES.indexOf(this.store.settings.theme));
				this.store.saveSetting("theme", MVC_THEMES[(cur + dir + n) % n]);
			});
			this.addStepper(card, "Rotate", (v) => `${v}°`, () => this.store.settings.transform.rot || 0, (dir) => {
				const t = this.store.settings.transform;
				t.rot = (((t.rot || 0) + dir * 90) % 360 + 360) % 360;
				this.store.saveSetting("transform", t);
				this.eventBus.emit("video:transform-need-update", void 0);
				this.ui.updateRotationUI();
			});
			this.addStepper(card, "Default speed", (v) => `${v.toFixed(2)}x`, () => this.store.settings.defaultSpeed, (dir) => this.store.saveSetting("defaultSpeed", clamp(this.store.settings.defaultSpeed + dir * MVC_CONFIG.SPEED_STEPPER_STEP, MVC_CONFIG.SPEED_MIN, MVC_CONFIG.SPEED_MAX)));
			this.addStepper(card, "Skip duration", (v) => `${v}s`, () => this.store.settings.skipSeconds, (dir) => this.store.saveSetting("skipSeconds", clamp(this.store.settings.skipSeconds + dir * MVC_CONFIG.SKIP_STEPPER_STEP, MVC_CONFIG.SKIP_MIN, MVC_CONFIG.SKIP_MAX)));
			for (const { label, key, def } of TOGGLES) {
				const sw = new Switch(label, this.readToggle(key, def), (checked) => this.store.saveSetting(key, checked));
				this.switches.push(sw);
				card.appendChild(sw.dom);
			}
			card.appendChild(this.buildResetButton());
			return sheet;
		}
		addStepper(card, label, valFmt, getVal, onAdjust) {
			const stepper = new Stepper(label, valFmt, getVal, onAdjust);
			this.steppers.push(stepper);
			card.appendChild(stepper.dom);
		}
		readToggle(key, def) {
			const v = this.store.settings[key];
			return v === void 0 ? def : !!v;
		}
		buildResetButton() {
			const btn = document.createElement("button");
			btn.className = "mvc-grid-btn";
			btn.appendChild(this.ui.getIcon("reset"));
			const label = document.createElement("span");
			label.textContent = "Reset all";
			btn.appendChild(label);
			btn.onclick = (e) => {
				e.stopPropagation();
				vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
				this.store.saveSetting("transform", {
					ratio: "fit",
					zoom: 1,
					rot: 0
				});
				this.store.saveSetting("theme", "halo");
				this.store.saveSetting("defaultSpeed", MVC_CONFIG.SPEED_DEFAULT);
				this.store.saveSetting("skipSeconds", MVC_CONFIG.SKIP_DEFAULT);
				for (const { key, def } of TOGGLES) this.store.saveSetting(key, def);
				this.update();
				this.eventBus.emit("video:transform-need-update", void 0);
				this.ui.updateRotationUI();
				this.ui.showToast("Reset settings to default");
			};
			return btn;
		}
		update() {
			for (const s of this.steppers) s.update();
			this.switches.forEach((sw, i) => sw.setChecked(this.readToggle(TOGGLES[i].key, TOGGLES[i].def)));
		}
	};
	var SpeedStepper = class extends UIComponent {
		eventBus;
		ui;
		stepperPill;
		fabBtn;
		decBtn;
		incBtn;
		valEl;
		holdTimeout;
		holdInterval;
		longPressTimeout;
		wasLongPress = false;
		unsubscribers = [];
		constructor(eventBus, ui) {
			super();
			this.eventBus = eventBus;
			this.ui = ui;
			this.element = this.render();
			this.setupSubscriptions();
		}
		render() {
			const wrap = document.createElement("div");
			wrap.className = "mvc-speed-control-wrap";
			this.stepperPill = document.createElement("div");
			this.stepperPill.className = "mvc-stepper-pill";
			this.decBtn = document.createElement("button");
			this.decBtn.className = "mvc-stepper-pill-btn mvc-btn-dec";
			this.decBtn.textContent = "−";
			this.setupButtonHold(this.decBtn, -1);
			this.valEl = document.createElement("span");
			this.valEl.className = "mvc-stepper-pill-val";
			this.setupValHandlers(this.valEl);
			this.incBtn = document.createElement("button");
			this.incBtn.className = "mvc-stepper-pill-btn mvc-btn-inc";
			this.incBtn.textContent = "+";
			this.setupButtonHold(this.incBtn, 1);
			this.stepperPill.append(this.decBtn, this.valEl, this.incBtn);
			this.fabBtn = document.createElement("button");
			this.fabBtn.className = "mvc-speed-fab";
			this.fabBtn.setAttribute("aria-label", "Speed control");
			this.setupFabHandlers(this.fabBtn);
			wrap.append(this.stepperPill, this.fabBtn);
			this.updateLayout();
			this.update();
			return wrap;
		}
		setupSubscriptions() {
			this.unsubscribers.push(this.eventBus.on("settings:changed", ({ key }) => {
				if (key === "minimalSpeedFab") {
					this.updateLayout();
					this.update();
				}
			}));
		}
		updateLayout() {
			if (!!this.ui.store.settings.minimalSpeedFab) {
				this.stepperPill.style.display = "none";
				this.fabBtn.style.display = "flex";
			} else {
				this.stepperPill.style.display = "flex";
				this.fabBtn.style.display = "none";
			}
		}
		update() {
			const text = `${(this.ui.store.activeVideo?.playbackRate ?? 1).toFixed(this.ui.store.settings.minimalSpeedFab ? 1 : 2)}x`;
			this.valEl.textContent = text;
			this.fabBtn.textContent = text;
		}
		cycleFabSpeed() {
			const video = this.ui.store.activeVideo;
			const currentRate = video ? video.playbackRate : MVC_CONFIG.SPEED_DEFAULT;
			let nextRate = Math.round((currentRate + MVC_CONFIG.FAB_SPEED_STEP) * 10) / 10;
			if (nextRate > MVC_CONFIG.FAB_SPEED_MAX + .001 || currentRate < MVC_CONFIG.FAB_SPEED_MIN - .001) nextRate = MVC_CONFIG.FAB_SPEED_MIN;
			this.eventBus.emit("video:rate-change-requested", {
				rate: nextRate,
				saveToSettings: true
			});
			vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
			this.ui.showToast(`Speed: ${nextRate.toFixed(1)}x`);
			this.update();
		}
		setupFabHandlers(btn) {
			let isLongPress = false;
			btn.addEventListener("pointerdown", (e) => {
				e.stopPropagation();
				e.preventDefault();
				this.ui.showUI(true);
				isLongPress = false;
				this.longPressTimeout = setTimeout(() => {
					isLongPress = true;
					vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
					this.eventBus.emit("video:rate-change-requested", {
						rate: MVC_CONFIG.SPEED_DEFAULT,
						saveToSettings: true
					});
					this.ui.showToast("Speed reset to 1.00x");
					this.update();
				}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
			});
			const cancelLongPress = () => {
				clearTimeout(this.longPressTimeout);
			};
			btn.addEventListener("pointerup", (e) => {
				e.stopPropagation();
				e.preventDefault();
				cancelLongPress();
				if (isLongPress) {
					isLongPress = false;
					return;
				}
				this.cycleFabSpeed();
			});
			btn.addEventListener("pointerleave", cancelLongPress);
			btn.addEventListener("pointercancel", cancelLongPress);
		}
		adjustSpeed(delta, saveToSettings) {
			const video = this.ui.store.activeVideo;
			if (!video) return;
			const currentRate = video.playbackRate;
			const newRate = clamp(currentRate + delta, MVC_CONFIG.SPEED_MIN, MVC_CONFIG.SPEED_MAX);
			this.eventBus.emit("video:rate-change-requested", {
				rate: newRate,
				saveToSettings
			});
			this.update();
			if (saveToSettings) this.ui.showToast(`Speed: ${newRate.toFixed(2)}x`);
		}
		setupButtonHold(btn, dir) {
			let isHolding = false;
			let elapsed = 0;
			const startHold = (e) => {
				e.stopPropagation();
				e.preventDefault();
				this.ui.showUI(true);
				vibrate(10);
				isHolding = false;
				elapsed = 0;
				this.holdTimeout = setTimeout(() => {
					isHolding = true;
					this.holdInterval = setInterval(() => {
						elapsed += MVC_CONFIG.SPEED_HOLD_INTERVAL_MS;
						const step = elapsed > 1e3 ? .1 : MVC_CONFIG.SPEED_HOLD_STEP;
						this.adjustSpeed(dir * step, false);
						vibrate(5);
					}, MVC_CONFIG.SPEED_HOLD_INTERVAL_MS);
				}, MVC_CONFIG.SPEED_HOLD_INITIAL_DELAY_MS);
			};
			const endHold = (e) => {
				e.stopPropagation();
				clearTimeout(this.holdTimeout);
				clearInterval(this.holdInterval);
				if (!isHolding && e.type === "pointerup") this.adjustSpeed(dir * MVC_CONFIG.SPEED_TAP_STEP, true);
				else if (isHolding) {
					const video = this.ui.store.activeVideo;
					if (video) {
						this.ui.store.saveSetting("lastRate", video.playbackRate);
						this.ui.showToast(`Speed: ${video.playbackRate.toFixed(2)}x`);
					}
				}
				isHolding = false;
				clearTimeout(this.ui.store.timers.hide);
				this.ui.store.timers.hide = setTimeout(() => this.ui.hideUI(), MVC_CONFIG.UI_FADE_TIMEOUT);
			};
			btn.addEventListener("pointerdown", startHold);
			btn.addEventListener("pointerup", endHold);
			btn.addEventListener("pointerleave", endHold);
			btn.addEventListener("pointercancel", endHold);
		}
		setupValHandlers(el) {
			el.addEventListener("pointerdown", (e) => {
				e.stopPropagation();
				this.ui.showUI(true);
				this.wasLongPress = false;
				this.longPressTimeout = setTimeout(() => {
					if (this.ui.store.activeVideo) {
						this.wasLongPress = true;
						vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
						this.eventBus.emit("video:rate-change-requested", {
							rate: 1,
							saveToSettings: true
						});
						this.update();
						this.ui.showToast("Speed reset to 1.00x");
					}
				}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
			});
			const cancelLongPress = () => {
				clearTimeout(this.longPressTimeout);
			};
			el.addEventListener("pointerup", (e) => {
				e.stopPropagation();
				cancelLongPress();
				if (this.wasLongPress) {
					this.wasLongPress = false;
					return;
				}
				const video = this.ui.store.activeVideo;
				if (video) {
					const willPlay = video.paused || video.ended;
					this.eventBus.emit("video:play-pause-requested", void 0);
					vibrate(10);
					this.ui.showToast(willPlay ? "Playing" : "Paused");
				}
			});
			el.addEventListener("pointerleave", cancelLongPress);
			el.addEventListener("pointercancel", cancelLongPress);
		}
		destroy() {
			this.unsubscribers.forEach((unsub) => unsub());
			this.unsubscribers = [];
			this.element.remove();
		}
	};
	var UIManager = class {
		eventBus;
		store;
		wrap = null;
		stepper = null;
		progressBar = null;
		settingsBtn = null;
		pipBtn = null;
		lockBtn = null;
		ratioBtn = null;
		lockShield = null;
		frameEl = null;
		settingsSheet = null;
		backdrop = null;
		toast = null;
		gestureOverlay = null;
		doubleTapContainer = null;
		doubleTapLeftPanel = null;
		doubleTapRightPanel = null;
		doubleTapLeftText = null;
		doubleTapRightText = null;
		controlsRow = null;
		collapseBtn = null;
		volumeBar = null;
		volumeFill = null;
		volumeIcon = null;
		volumeValue = null;
		brightnessOverlay = null;
		brightnessBar = null;
		brightnessFill = null;
		brightnessIcon = null;
		brightnessValue = null;
		constructor(eventBus, store) {
			this.eventBus = eventBus;
			this.store = store;
			this.setupSubscriptions();
		}
		init() {
			applyTheme(this.store.settings.theme);
			this.applyLeftHandModeUI();
			this.createMainUI();
			this.attachGlobalListeners();
			this.updateRotationUI();
		}
		applyLeftHandModeUI() {
			const isLeft = !!this.store.settings.leftHandMode;
			if (document.documentElement && typeof document.documentElement.setAttribute === "function") document.documentElement.setAttribute("data-mvc-left-hand", isLeft ? "true" : "false");
		}
		setupSubscriptions() {
			this.eventBus.on("control:visibility-requested", ({ visible, force }) => {
				if (visible) this.showUI(force);
				else this.hideUI();
			});
			this.eventBus.on("ui:toast", ({ message }) => this.showToast(message));
			this.eventBus.on("ui:gesture-overlay", (payload) => {
				if (payload) this.showGestureOverlay(payload.text, payload.subText);
				else this.hideGestureOverlay();
			});
			this.eventBus.on("video:rate-changed", () => this.updateSpeedDisplay());
			this.eventBus.on("video:transform-need-update", () => {
				this.updateSettingsTransformUI();
				this.updateBrightnessOverlayPosition();
			});
			this.eventBus.on("video:active-changed", (video) => {
				if (video) {
					this.updateSpeedDisplay();
					this.updateSettingsTransformUI();
					this.updateBrightnessOverlayPosition();
				}
			});
			this.eventBus.on("settings:changed", ({ key, val }) => {
				if (key === "theme") {
					applyTheme(val);
					if (this.settingsSheet) this.settingsSheet.update();
				} else if (key === "leftHandMode") {
					this.applyLeftHandModeUI();
					if (this.settingsSheet) this.settingsSheet.update();
				} else if (key !== "transform") {
					if (this.settingsSheet) this.settingsSheet.update();
				} else {
					this.updateSettingsTransformUI();
					this.updateBrightnessOverlayPosition();
					this.updateRotationUI();
				}
			});
			this.eventBus.on("video:double-tap-skipped", ({ side, x, y, seconds }) => {
				this.showDoubleTapOverlay(side, x, y, seconds);
			});
			this.eventBus.on("ui:volume-changed", ({ volume }) => {
				this.showVolumeBar(volume);
			});
			this.eventBus.on("ui:brightness-changed", ({ brightness }) => {
				this.showBrightness(brightness);
			});
		}
		createEl(tag, className, props = {}) {
			const el = document.createElement(tag);
			if (className) el.className = className;
			for (const [k, v] of Object.entries(props)) if (k === "style") Object.assign(el.style, v);
			else if (k === "role" || k.startsWith("aria-")) el.setAttribute(k, v);
			else el[k] = v;
			return el;
		}
		getIcon(name) {
			return getSvgIcon(name);
		}
		isAnyMenuOpen() {
			return this.settingsSheet !== null && this.settingsSheet.dom.classList.contains("visible");
		}
		createMainUI() {
			const wrap = this.createEl("div", "mvc-ui-wrap");
			const backdrop = this.createEl("div", "mvc-backdrop");
			const toast = this.createEl("div", "mvc-toast", {
				role: "status",
				"aria-live": "polite"
			});
			const gestureOverlay = this.createEl("div", "mvc-gesture-overlay", {
				role: "status",
				"aria-live": "polite"
			});
			this.wrap = wrap;
			this.backdrop = backdrop;
			this.toast = toast;
			this.gestureOverlay = gestureOverlay;
			preventPropagation(backdrop);
			wrap.style.cssText = "position:fixed; inset:0; z-index:2147483647; pointer-events:none; display:none; opacity:0; transition:opacity .35s ease;";
			const container = getFullscreenContainer();
			container.append(backdrop, toast, gestureOverlay);
			const volume = this.buildSideBar("volume", container);
			this.volumeBar = volume.bar;
			this.volumeFill = volume.fill;
			this.volumeIcon = volume.icon;
			this.volumeValue = volume.value;
			const brightnessOverlay = this.createEl("div", "mvc-brightness-overlay");
			container.appendChild(brightnessOverlay);
			this.brightnessOverlay = brightnessOverlay;
			const brightness = this.buildSideBar("brightness", container);
			this.brightnessBar = brightness.bar;
			this.brightnessFill = brightness.fill;
			this.brightnessIcon = brightness.icon;
			this.brightnessValue = brightness.value;
			const doubleTapContainer = this.createEl("div", "mvc-doubletap-container");
			this.doubleTapContainer = doubleTapContainer;
			doubleTapContainer.style.cssText = "position:fixed; pointer-events:none; display:none; z-index:2147483646; overflow:hidden;";
			const buildPanel = (dir) => {
				const panel = this.createEl("div", `mvc-doubletap-panel ${dir}`);
				const inner = this.createEl("div", "mvc-doubletap-inner");
				const chevrons = this.createEl("div", "mvc-doubletap-chevrons");
				const icon = dir === "left" ? "❮" : "❯";
				for (let i = 0; i < 3; i++) {
					const ch = this.createEl("span", "mvc-doubletap-chevron");
					ch.textContent = icon;
					chevrons.appendChild(ch);
				}
				const text = this.createEl("div", "mvc-doubletap-text");
				if (dir === "left") inner.append(chevrons, text);
				else inner.append(text, chevrons);
				panel.appendChild(inner);
				return {
					panel,
					text
				};
			};
			const { panel: leftPanel, text: leftText } = buildPanel("left");
			const { panel: rightPanel, text: rightText } = buildPanel("right");
			doubleTapContainer.append(leftPanel, rightPanel);
			container.append(doubleTapContainer);
			this.doubleTapLeftPanel = leftPanel;
			this.doubleTapRightPanel = rightPanel;
			this.doubleTapLeftText = leftText;
			this.doubleTapRightText = rightText;
			this.stepper = new SpeedStepper(this.eventBus, this);
			this.stepper.dom.style.pointerEvents = "auto";
			preventPropagation(this.stepper.dom);
			this.progressBar = new ProgressBar(this.eventBus, this);
			if (!!(document.pictureInPictureEnabled || "requestPictureInPicture" in HTMLVideoElement.prototype || "webkitSupportsPresentationMode" in HTMLVideoElement.prototype)) {
				this.pipBtn = document.createElement("button");
				this.pipBtn.className = "mvc-pip-btn";
				this.pipBtn.setAttribute("aria-label", "Picture in Picture");
				this.pipBtn.style.pointerEvents = "auto";
				this.pipBtn.appendChild(this.getIcon("pip"));
				this.pipBtn.onclick = (e) => {
					e.stopPropagation();
					this.resetCollapseTimer();
					this.togglePiP();
				};
				preventPropagation(this.pipBtn);
			}
			this.settingsBtn = document.createElement("button");
			this.settingsBtn.className = "mvc-settings-btn";
			this.settingsBtn.setAttribute("aria-label", "Settings");
			this.settingsBtn.style.pointerEvents = "auto";
			this.settingsBtn.appendChild(this.getIcon("settings"));
			this.settingsBtn.onclick = (e) => {
				e.stopPropagation();
				this.resetCollapseTimer();
				this.ensureSettingsSheet();
				if (this.settingsSheet) this.toggleMenu(this.settingsSheet.dom, this.settingsBtn);
			};
			preventPropagation(this.settingsBtn);
			const frameEl = this.createEl("div", "mvc-frame");
			for (let i = 0; i < 4; i++) frameEl.appendChild(this.createEl("i"));
			container.appendChild(frameEl);
			this.frameEl = frameEl;
			const lockShield = this.createEl("div", "mvc-lock-shield");
			lockShield.style.display = "none";
			const blk = (e) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				this.showUI(true);
			};
			[
				"click",
				"mousedown",
				"mouseup",
				"pointerdown",
				"pointerup",
				"dblclick",
				"touchstart",
				"touchend"
			].forEach((evt) => {
				lockShield.addEventListener(evt, blk, {
					capture: true,
					passive: false
				});
			});
			wrap.appendChild(lockShield);
			this.lockShield = lockShield;
			this.lockBtn = document.createElement("button");
			this.lockBtn.className = "mvc-lock-btn";
			this.lockBtn.setAttribute("aria-label", "Lock gestures");
			this.lockBtn.setAttribute("aria-pressed", "false");
			this.lockBtn.style.pointerEvents = "auto";
			this.lockBtn.appendChild(this.getIcon("unlock"));
			this.lockBtn.onclick = (e) => {
				e.stopPropagation();
				this.resetCollapseTimer();
				this.toggleScreenLock();
			};
			preventPropagation(this.lockBtn);
			this.ratioBtn = document.createElement("button");
			this.ratioBtn.className = "mvc-ratio-btn";
			this.ratioBtn.setAttribute("aria-label", "Aspect ratio — hold to rotate");
			this.ratioBtn.style.pointerEvents = "auto";
			this.ratioBtn.appendChild(this.getIcon("ratio"));
			this.ratioBtn.onclick = (e) => {
				e.stopPropagation();
				this.resetCollapseTimer();
				if (this.consumeRotateLongPress()) return;
				vibrate(MVC_CONFIG.HAPTIC_VIBRATION_MS);
				const ratios = [
					"fit",
					"fill",
					"stretch"
				];
				const currentRatio = this.store.settings.transform.ratio || "fit";
				const nextRatio = ratios[(ratios.indexOf(currentRatio) + 1) % ratios.length];
				this.store.settings.transform.ratio = nextRatio;
				this.store.saveSetting("transform", this.store.settings.transform);
				this.eventBus.emit("video:transform-need-update", void 0);
				this.showToast(`Aspect ratio: ${nextRatio.toUpperCase()}`);
			};
			this.attachRotateLongPress(this.ratioBtn);
			preventPropagation(this.ratioBtn);
			const controlsGroup = this.createEl("div", "mvc-controls-group");
			const controlsRow = this.createEl("div", "mvc-controls-row collapsed");
			this.controlsRow = controlsRow;
			controlsRow.appendChild(this.ratioBtn);
			controlsRow.appendChild(this.lockBtn);
			if (this.pipBtn) controlsRow.appendChild(this.pipBtn);
			controlsRow.appendChild(this.settingsBtn);
			this.collapseBtn = document.createElement("button");
			this.collapseBtn.className = "mvc-collapse-btn";
			this.collapseBtn.setAttribute("aria-label", "Toggle control menu");
			this.collapseBtn.setAttribute("aria-expanded", "false");
			this.collapseBtn.style.pointerEvents = "auto";
			this.collapseBtn.appendChild(this.getIcon("chevron"));
			this.collapseBtn.onclick = (e) => {
				e.stopPropagation();
				this.toggleControlsRow();
			};
			preventPropagation(this.collapseBtn);
			controlsGroup.appendChild(controlsRow);
			controlsGroup.appendChild(this.collapseBtn);
			const topBar = this.createEl("div", "mvc-top-bar");
			topBar.append(this.stepper.dom, this.progressBar.dom, controlsGroup);
			wrap.appendChild(topBar);
			container.appendChild(wrap);
		}
		buildSideBar(prefix, container) {
			const bar = this.createEl("div", `mvc-${prefix}-bar`);
			const icon = this.createEl("div", `mvc-${prefix}-icon`);
			const track = this.createEl("div", `mvc-${prefix}-track`);
			const fill = this.createEl("div", `mvc-${prefix}-fill`);
			const value = this.createEl("div", `mvc-${prefix}-value`);
			track.appendChild(fill);
			bar.append(icon, track, value);
			container.appendChild(bar);
			return {
				bar,
				icon,
				fill,
				value
			};
		}
		positionSideBar(bar, side) {
			const rect = this.store.activeVideo.getBoundingClientRect();
			const barH = clamp(rect.height * MVC_CONFIG.SIDEBAR_HEIGHT_RATIO, MVC_CONFIG.SIDEBAR_MIN_HEIGHT, MVC_CONFIG.SIDEBAR_MAX_HEIGHT);
			const top = rect.top + (rect.height - barH) / 2;
			const effectiveSide = this.store.settings.leftHandMode ? side === "right" ? "left" : "right" : side;
			const styles = {
				top: `${top}px`,
				height: `${barH}px`,
				left: "auto",
				right: "auto"
			};
			if (effectiveSide === "right") styles.right = `${window.innerWidth - rect.right + 14}px`;
			else styles.left = `${rect.left + 14}px`;
			Object.assign(bar.style, styles);
		}
		ensureSettingsSheet() {
			if (this.settingsSheet) return;
			this.settingsSheet = new SettingsSheet(this.eventBus, this.store, this);
			preventPropagation(this.settingsSheet.dom);
			getFullscreenContainer().appendChild(this.settingsSheet.dom);
		}
		updateSpeedDisplay() {
			if (this.stepper) this.stepper.update();
		}
		rotateTimer;
		rotateFired = false;
		consumeRotateLongPress() {
			if (!this.rotateFired) return false;
			this.rotateFired = false;
			return true;
		}
		attachRotateLongPress(btn) {
			const start = () => {
				clearTimeout(this.rotateTimer);
				this.rotateFired = false;
				this.rotateTimer = setTimeout(() => {
					this.rotateFired = true;
					this.cycleRotation();
				}, MVC_CONFIG.LONG_PRESS_DURATION_MS);
			};
			const cancel = () => clearTimeout(this.rotateTimer);
			btn.addEventListener("pointerdown", start);
			[
				"pointerup",
				"pointerleave",
				"pointercancel"
			].forEach((ev) => btn.addEventListener(ev, cancel));
		}
		cycleRotation() {
			const t = this.store.settings.transform;
			t.rot = ((t.rot || 0) + 90) % 360;
			this.store.saveSetting("transform", t);
			this.eventBus.emit("video:transform-need-update", void 0);
			this.updateRotationUI();
			vibrate(MVC_CONFIG.LONG_PRESS_VIBRATE_MS);
			this.showToast(t.rot === 0 ? "Rotation reset" : `Rotated ${t.rot}°`);
		}
		updateRotationUI() {
			if (!this.ratioBtn) return;
			const rot = this.store.settings.transform?.rot || 0;
			this.ratioBtn.setAttribute("data-rot", String(rot));
		}
		toggleMenu(menuEl, anchorEl) {
			const isOpen = menuEl.classList.contains("visible");
			this.hideAllMenus();
			if (isOpen) return;
			menuEl.classList.add("visible");
			anchorEl.classList.add("visible");
			this.showBackdrop();
			clearTimeout(this.store.timers.hide);
		}
		showBackdrop() {
			if (!this.backdrop) return;
			this.backdrop.classList.add("visible");
		}
		hideAllMenus() {
			if (this.settingsSheet && this.settingsSheet.dom.classList.contains("visible")) {
				this.settingsSheet.dom.classList.remove("visible");
				this.settingsBtn?.classList.remove("visible");
			}
			if (this.backdrop) this.backdrop.classList.remove("visible");
			this.eventBus.emit("control:visibility-requested", { visible: true });
			this.resetCollapseTimer();
		}
		updateSettingsTransformUI() {
			if (!this.settingsSheet || !this.settingsSheet.dom.classList.contains("visible")) return;
			this.settingsSheet.update();
		}
		showToast(message) {
			if (!this.toast) return;
			this.toast.textContent = message;
			this.toast.classList.add("visible");
			clearTimeout(this.store.timers.toast);
			this.store.timers.toast = setTimeout(() => {
				if (this.toast) this.toast.classList.remove("visible");
			}, MVC_CONFIG.TOAST_FADE_DELAY);
		}
		showGestureOverlay(text, subText) {
			if (!this.gestureOverlay) return;
			this.gestureOverlay.textContent = text;
			if (subText) {
				const span = document.createElement("span");
				Object.assign(span.style, {
					fontSize: "11px",
					opacity: "0.8",
					display: "block",
					marginTop: "2px"
				});
				span.textContent = subText;
				this.gestureOverlay.appendChild(span);
			}
			this.gestureOverlay.style.display = "block";
		}
		hideGestureOverlay() {
			if (!this.gestureOverlay) return;
			this.gestureOverlay.style.display = "none";
			this.gestureOverlay.textContent = "";
		}
		attachGlobalListeners() {
			[
				"pointerdown",
				"keydown",
				"touchstart"
			].forEach((ev) => window.addEventListener(ev, (e) => {
				if (!e.isTrusted) return;
				this.store.lastRealUserEvent = Date.now();
				if (e.type === "keydown" || this.wrap && e.target && this.wrap.contains(e.target)) this.showUI(true);
			}, {
				passive: true,
				capture: true,
				signal: this.store.abortController.signal
			}));
			if (this.backdrop) this.backdrop.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.hideAllMenus();
			});
		}
		showUI(force = false) {
			if (!this.wrap || !this.store.activeVideo || this.store.savedPlaybackRate !== void 0) return;
			if (!force && Date.now() - this.store.lastRealUserEvent >= MVC_CONFIG.INTERACTION_TIMEOUT) return;
			this.wrap.style.display = "block";
			this.wrap.offsetHeight;
			this.wrap.style.opacity = "1";
			this.frameEl?.classList.add("visible");
			clearTimeout(this.store.timers.hide);
			if (!this.isAnyMenuOpen() && !this.store.activeVideo.paused) this.store.timers.hide = setTimeout(() => this.hideUI(), MVC_CONFIG.UI_FADE_TIMEOUT);
		}
		hideUI() {
			if (!this.wrap) return;
			if (this.store.activeVideo?.paused || this.isAnyMenuOpen()) return;
			this.wrap.style.opacity = "0";
			this.frameEl?.classList.remove("visible");
			clearTimeout(this.store.timers.hide);
			this.store.timers.hide = setTimeout(() => {
				if (this.wrap && this.wrap.style.opacity === "0") {
					this.wrap.style.display = "none";
					this.collapseControlsRow();
				}
			}, MVC_CONFIG.UI_FADE_ANIMATION_DURATION);
		}
		togglePiP() {
			const video = this.store.activeVideo;
			if (!video) return;
			try {
				if (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === "function") {
					const isPip = video.webkitPresentationMode === "picture-in-picture";
					video.webkitSetPresentationMode(isPip ? "inline" : "picture-in-picture");
				} else if (typeof video.requestPictureInPicture === "function") if (document.pictureInPictureElement === video) document.exitPictureInPicture().catch(() => {});
				else video.requestPictureInPicture().catch(() => {});
				else this.showToast("PiP not supported on this browser");
			} catch (err) {
				console.error("[MVC] PiP error:", err);
				this.showToast("Failed to toggle PiP mode");
			}
		}
		toggleScreenLock() {
			const locked = !this.store.isScreenLocked;
			this.store.isScreenLocked = locked;
			if (this.wrap) this.wrap.classList.toggle("locked", locked);
			if (this.lockShield) {
				this.lockShield.style.display = locked ? "block" : "none";
				if (locked) this.updateBrightnessOverlayPosition();
			}
			if (this.lockBtn) {
				this.lockBtn.replaceChildren(this.getIcon(locked ? "lock" : "unlock"));
				this.lockBtn.setAttribute("aria-label", locked ? "Unlock gestures" : "Lock gestures");
				this.lockBtn.setAttribute("aria-pressed", locked ? "true" : "false");
			}
			if (locked) this.hideAllMenus();
			this.showToast(locked ? "Gestures locked" : "Gestures unlocked");
			this.showUI(true);
		}
		showDoubleTapOverlay(side, x, y, seconds) {
			if (!this.doubleTapContainer || !this.store.activeVideo) return;
			const rect = this.store.activeVideo.getBoundingClientRect();
			Object.assign(this.doubleTapContainer.style, {
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
				display: "block"
			});
			const activePanel = side === "left" ? this.doubleTapLeftPanel : this.doubleTapRightPanel;
			const inactivePanel = side === "left" ? this.doubleTapRightPanel : this.doubleTapLeftPanel;
			const activeText = side === "left" ? this.doubleTapLeftText : this.doubleTapRightText;
			if (inactivePanel) inactivePanel.classList.remove("visible");
			if (activeText) activeText.textContent = `${seconds}s`;
			if (activePanel) activePanel.classList.add("visible");
			clearTimeout(this.store.timers.doubleTapUIHide);
			this.store.timers.doubleTapUIHide = setTimeout(() => {
				if (this.doubleTapLeftPanel) this.doubleTapLeftPanel.classList.remove("visible");
				if (this.doubleTapRightPanel) this.doubleTapRightPanel.classList.remove("visible");
				if (this.doubleTapContainer) this.doubleTapContainer.style.display = "none";
			}, MVC_CONFIG.DOUBLE_TAP_UI_HIDE_DELAY);
		}
		showVolumeBar(volume) {
			if (!this.volumeBar || !this.volumeFill || !this.volumeIcon || !this.volumeValue) return;
			if (!this.store.activeVideo) return;
			this.positionSideBar(this.volumeBar, "right");
			const pct = Math.round(volume * 100);
			this.volumeFill.style.height = `${Math.min(pct, 100)}%`;
			this.volumeValue.textContent = `${pct}%`;
			this.volumeIcon.textContent = volume === 0 ? "🔇" : volume < .4 ? "🔈" : volume < .7 ? "🔉" : "🔊";
			this.volumeBar.classList.add("visible");
			clearTimeout(this.store.timers.volumeBarHide);
			this.store.timers.volumeBarHide = setTimeout(() => {
				if (this.volumeBar) this.volumeBar.classList.remove("visible");
			}, MVC_CONFIG.SLIDER_UI_HIDE_DELAY);
		}
		showBrightness(brightness) {
			if (!this.brightnessOverlay || !this.brightnessBar || !this.brightnessFill || !this.brightnessIcon || !this.brightnessValue) return;
			if (!this.store.activeVideo) return;
			const opacity = 1 - brightness;
			this.brightnessOverlay.style.opacity = `${opacity}`;
			this.updateBrightnessOverlayPosition();
			this.positionSideBar(this.brightnessBar, "left");
			const pct = Math.round(brightness * 100);
			this.brightnessFill.style.height = `${pct}%`;
			this.brightnessValue.textContent = `${pct}%`;
			this.brightnessIcon.textContent = brightness < .4 ? "🌑" : brightness < .7 ? "🌓" : "☀️";
			this.brightnessBar.classList.add("visible");
			clearTimeout(this.store.timers.brightnessBarHide);
			this.store.timers.brightnessBarHide = setTimeout(() => {
				if (this.brightnessBar) this.brightnessBar.classList.remove("visible");
			}, MVC_CONFIG.SLIDER_UI_HIDE_DELAY);
		}
		updateBrightnessOverlayPosition() {
			if (!this.store.activeVideo) return;
			const rect = this.store.activeVideo.getBoundingClientRect();
			if (this.brightnessOverlay) Object.assign(this.brightnessOverlay.style, {
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`
			});
			const box = {
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`
			};
			if (this.lockShield) Object.assign(this.lockShield.style, box);
			if (this.frameEl) Object.assign(this.frameEl.style, box);
		}
		expandControlsRow() {
			if (!this.controlsRow) return;
			this.controlsRow.classList.remove("collapsed");
			this.collapseBtn?.parentElement?.classList.add("expanded");
			this.collapseBtn?.setAttribute("aria-expanded", "true");
			this.resetCollapseTimer();
		}
		collapseControlsRow() {
			if (!this.controlsRow) return;
			this.controlsRow.classList.add("collapsed");
			this.collapseBtn?.parentElement?.classList.remove("expanded");
			this.collapseBtn?.setAttribute("aria-expanded", "false");
			this.clearCollapseTimer();
		}
		toggleControlsRow() {
			vibrate(10);
			if (this.controlsRow?.classList.contains("collapsed")) this.expandControlsRow();
			else this.collapseControlsRow();
			this.showUI(true);
		}
		resetCollapseTimer() {
			this.clearCollapseTimer();
			if (this.isAnyMenuOpen()) return;
			this.store.timers.collapse = setTimeout(() => {
				this.collapseControlsRow();
			}, MVC_CONFIG.CONTROLS_COLLAPSE_DELAY);
		}
		clearCollapseTimer() {
			if (this.store.timers.collapse) {
				clearTimeout(this.store.timers.collapse);
				this.store.timers.collapse = null;
			}
		}
	};
	var GenericAdapter = class {
		shouldIgnoreVideo(video) {
			return !!video.closest(".ad-container, [class*=\"ad-unit\"], [id*=\"ad-unit\"], [class*=\"video-ad\"], [class*=\"ad-player\"], [class*=\"ad-overlay\"], [id*=\"video-ad\"], [id*=\"ad-player\"]");
		}
	};
	var YoutubeAdapter = class extends GenericAdapter {
		shouldIgnoreVideo(video) {
			if (video.closest(".video-ads, .ytp-ad-player-overlay")) return true;
			return super.shouldIgnoreVideo(video);
		}
	};
	function getVideoAdapter() {
		const host = typeof window !== "undefined" && window.location && window.location.hostname || "";
		if (host.includes("youtube.com") || host.includes("youtu.be")) return new YoutubeAdapter();
		return new GenericAdapter();
	}
	var REEVALUATE_ON = [
		"play",
		"loadedmetadata",
		"volumechange"
	];
	var VideoTracker = class {
		eventBus;
		store;
		intersectionObserver;
		mutationObserver;
		resizeObserver;
		shadowObservers = new Map();
		originalAttachShadow;
		adapter = getVideoAdapter();
		onMediaEvent = () => this.debouncedEvaluate();
		debouncedEvaluate;
		constructor(eventBus, store) {
			this.eventBus = eventBus;
			this.store = store;
			this.debouncedEvaluate = debounce(this.evaluateActive.bind(this), MVC_CONFIG.MUTATION_DEBOUNCE_MS, MVC_CONFIG.MUTATION_DEBOUNCE_MAX_MS);
		}
		init() {
			this.setupObservers();
			setTimeout(() => this.evaluateActive(), MVC_CONFIG.INITIAL_EVAL_DELAY);
		}
		watchVideo(v) {
			this.intersectionObserver?.observe(v);
			this.resizeObserver?.observe(v);
			REEVALUATE_ON.forEach((ev) => v.addEventListener(ev, this.onMediaEvent, { passive: true }));
		}
		unwatchVideo(v) {
			this.intersectionObserver?.unobserve(v);
			this.resizeObserver?.unobserve(v);
			REEVALUATE_ON.forEach((ev) => v.removeEventListener(ev, this.onMediaEvent));
		}
		destroy() {
			if (this.intersectionObserver) this.intersectionObserver.disconnect();
			if (this.mutationObserver) this.mutationObserver.disconnect();
			if (this.resizeObserver) this.resizeObserver.disconnect();
			this.shadowObservers.forEach((obs) => obs.disconnect());
			this.shadowObservers.clear();
			this.store.visibleVideos.forEach((_, v) => {
				if (typeof v?.removeEventListener !== "function") return;
				REEVALUATE_ON.forEach((ev) => v.removeEventListener(ev, this.onMediaEvent));
			});
			if (this.originalAttachShadow) {
				Element.prototype.attachShadow = this.originalAttachShadow;
				this.originalAttachShadow = void 0;
			}
		}
		evaluateActive() {
			if (this.store.activeVideo && isPlaying(this.store.activeVideo) && this.store.activeVideo.isConnected && this.store.visibleVideos.has(this.store.activeVideo)) {
				const r = this.store.activeVideo.getBoundingClientRect();
				if (r.height > MVC_CONFIG.MIN_VIDEO_HEIGHT && r.bottom > 0 && r.top < window.innerHeight) return;
			}
			let best = null;
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
				if (area < MVC_CONFIG.MIN_VIDEO_AREA || r.height < MVC_CONFIG.MIN_VIDEO_HEIGHT) continue;
				if (v.closest("a")) {
					if (r.width < MVC_CONFIG.LINKED_VIDEO_MIN_WIDTH || r.height < MVC_CONFIG.LINKED_VIDEO_MIN_HEIGHT) continue;
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
		setupObservers() {
			this.intersectionObserver = new IntersectionObserver((e) => this.handleIntersection(e), { threshold: .05 });
			this.resizeObserver = new ResizeObserver(() => this.debouncedEvaluate());
			findAllVideos(document).forEach((v) => this.watchVideo(v));
			this.mutationObserver = new MutationObserver((m) => this.handleMutation(m));
			const root = document.body || document.documentElement;
			this.mutationObserver.observe(root, {
				childList: true,
				subtree: true
			});
			this.observeShadowRoots(document);
		}
		handleIntersection(entries) {
			let needsReevaluation = false;
			entries.forEach((entry) => {
				const target = entry.target;
				if (entry.isIntersecting) {
					if (!this.store.visibleVideos.has(target)) {
						this.store.visibleVideos.set(target, true);
						needsReevaluation = true;
					}
				} else if (this.store.visibleVideos.has(target)) {
					this.store.visibleVideos.delete(target);
					if (target === this.store.activeVideo) {
						if (this.store.activeVideo !== null) {
							this.eventBus.emit("control:visibility-requested", { visible: false });
							this.store.setActiveVideo(null);
						}
					}
					needsReevaluation = true;
				}
			});
			if (needsReevaluation) this.debouncedEvaluate();
		}
		pendingAddedElements = [];
		isWalkScheduled = false;
		handleMutation(mutations) {
			let activeVideoRemoved = false;
			let removedNodesPresent = false;
			mutations.forEach((mutation) => {
				if (mutation.addedNodes.length) mutation.addedNodes.forEach((node) => {
					if (node.nodeType === 1) this.pendingAddedElements.push(node);
				});
				if (mutation.removedNodes.length) mutation.removedNodes.forEach((node) => {
					if (node.nodeType === 1) {
						const el = node;
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
			});
			if (activeVideoRemoved) this.store.setActiveVideo(null);
			if (removedNodesPresent || this.store.activeVideo && !this.store.activeVideo.isConnected) this.debouncedEvaluate();
			if (this.pendingAddedElements.length > 0 && !this.isWalkScheduled) {
				this.isWalkScheduled = true;
				setTimeout(() => {
					this.isWalkScheduled = false;
					const elements = this.pendingAddedElements;
					this.pendingAddedElements = [];
					let videoAdded = false;
					for (let i = 0; i < elements.length; i++) {
						const el = elements[i];
						if (el.isConnected === false) continue;
						const videos = findAllVideos(el);
						if (videos.length > 0) videos.forEach((v) => {
							this.watchVideo(v);
							videoAdded = true;
						});
						this.observeShadowRoots(el);
					}
					if (videoAdded) this.debouncedEvaluate();
				}, 0);
			}
		}
		observeShadowRoots(root) {
			const walk = (node) => {
				if (node.nodeType !== Node.ELEMENT_NODE) return;
				const el = node;
				if (el.shadowRoot) {
					this.setupShadowRootObserver(el.shadowRoot);
					walk(el.shadowRoot);
				}
				for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]);
			};
			walk(root);
		}
		setupShadowRootObserver(shadowRoot) {
			if (this.shadowObservers.has(shadowRoot)) {
				if (this.store.isInitialized) findAllVideos(shadowRoot).forEach((v) => this.watchVideo(v));
				return;
			}
			const observer = new MutationObserver((m) => {
				if (!this.store.isInitialized) if (shadowRoot.querySelector("video")) this.eventBus.emit("controller:init-requested", void 0);
				else for (let i = 0; i < m.length; i++) {
					const mutation = m[i];
					for (let j = 0; j < mutation.addedNodes.length; j++) {
						const node = mutation.addedNodes[j];
						if (node.nodeType === Node.ELEMENT_NODE) {
							const el = node;
							if (el.tagName === "VIDEO" || el.querySelector?.("video")) {
								this.eventBus.emit("controller:init-requested", void 0);
								return;
							}
							this.observeShadowRoots(el);
						}
					}
				}
				else this.handleMutation(m);
			});
			observer.observe(shadowRoot, {
				childList: true,
				subtree: true
			});
			this.shadowObservers.set(shadowRoot, observer);
			if (this.store.isInitialized) {
				findAllVideos(shadowRoot).forEach((v) => this.watchVideo(v));
				this.observeShadowRoots(shadowRoot);
			} else if (findAllVideos(shadowRoot).length > 0) this.eventBus.emit("controller:init-requested", void 0);
			else this.observeShadowRoots(shadowRoot);
		}
		patchAttachShadow() {
			const proto = Element.prototype;
			if (proto.attachShadow && proto.attachShadow.__mvc_patched) return;
			this.originalAttachShadow = proto.attachShadow;
			const originalAttachShadow = this.originalAttachShadow;
			const newAttachShadow = function(init) {
				const shadowRoot = originalAttachShadow.call(this, init);
				try {
					if (init) setTimeout(() => {
						const instance = window.__MVC_INSTANCE;
						if (instance && instance.videoTracker) instance.videoTracker.setupShadowRootObserver(shadowRoot);
					}, 0);
				} catch (e) {
					console.error("[MVC] Error observing dynamic shadow root:", e);
				}
				return shadowRoot;
			};
			newAttachShadow.__mvc_patched = true;
			proto.attachShadow = newAttachShadow;
		}
		cleanupShadowObserversFor(element) {
			const walk = (node) => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					const el = node;
					if (el.shadowRoot) {
						const observer = this.shadowObservers.get(el.shadowRoot);
						if (observer) {
							observer.disconnect();
							this.shadowObservers.delete(el.shadowRoot);
						}
						walk(el.shadowRoot);
					}
				}
				for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
			};
			walk(element);
		}
	};
	var VIDEO_LISTENED_EVENTS = [
		"ended",
		"play",
		"pause",
		"ratechange",
		"click",
		"timeupdate",
		"durationchange",
		"progress",
		"seeking",
		"seeked",
		"loadedmetadata"
	];
	var VideoTransform = class {
		eventBus;
		store;
		ui;
		videoResizeObserver;
		videoMutationObserver;
		currentScrollParents = [];
		lastVideo = null;
		boundScrollHandler = this.onViewportChange.bind(this);
		constructor(eventBus, store, ui) {
			this.eventBus = eventBus;
			this.store = store;
			this.ui = ui;
			this.setupSubscriptions();
			this.setupObservers();
			this.attachGlobalListeners();
		}
		destroy() {
			if (this.videoMutationObserver) this.videoMutationObserver.disconnect();
			if (this.videoResizeObserver) this.videoResizeObserver.disconnect();
			if (this.currentScrollParents) this.currentScrollParents.forEach((p) => p.removeEventListener("scroll", this.boundScrollHandler));
			if (this.lastVideo) {
				this.store.saveVideoPosition(this.lastVideo);
				VIDEO_LISTENED_EVENTS.forEach((ev) => {
					this.lastVideo?.removeEventListener(ev, this);
				});
			}
		}
		setupObservers() {
			this.videoResizeObserver = new ResizeObserver(() => {
				if (this.store.settings.transform?.rot) this.applyVideoTransform();
				this.throttledPositionOnVideo();
			});
			this.videoMutationObserver = new MutationObserver(() => this.throttledPositionOnVideo());
		}
		attachGlobalListeners() {
			window.addEventListener("resize", () => this.onViewportChange(), {
				passive: true,
				signal: this.store.abortController.signal
			});
			window.addEventListener("scroll", () => {
				this.store.isScrolling = true;
				clearTimeout(this.store.timers.scrollEnd);
				this.store.timers.scrollEnd = setTimeout(() => {
					this.store.isScrolling = false;
				}, MVC_CONFIG.SCROLL_END_TIMEOUT);
				this.onViewportChange();
			}, {
				passive: true,
				signal: this.store.abortController.signal
			});
			if (window.visualViewport) {
				window.visualViewport.addEventListener("resize", () => this.onViewportChange(), {
					passive: true,
					signal: this.store.abortController.signal
				});
				window.visualViewport.addEventListener("scroll", () => this.onViewportChange(), {
					passive: true,
					signal: this.store.abortController.signal
				});
			}
			["fullscreenchange", "webkitfullscreenchange"].forEach((ev) => document.addEventListener(ev, () => {
				this.onFullScreenChange();
				setTimeout(() => this.guardianCheck(), MVC_CONFIG.VISIBILITY_GUARDIAN_DELAY);
			}, {
				passive: true,
				signal: this.store.abortController.signal
			}));
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "visible") setTimeout(() => this.guardianCheck(), MVC_CONFIG.VISIBILITY_GUARDIAN_DELAY);
			}, {
				passive: true,
				signal: this.store.abortController.signal
			});
		}
		setupSubscriptions() {
			this.eventBus.on("video:transform-need-update", () => this.applyVideoTransform());
			this.eventBus.on("video:play-pause-requested", () => this.handlePlayPauseClick());
			this.eventBus.on("video:skip-requested", ({ dir, customSeconds }) => {
				const seconds = customSeconds !== void 0 ? customSeconds : this.store.settings.skipSeconds;
				this.doSkip(dir, seconds);
			});
			this.eventBus.on("video:rate-change-requested", ({ rate, saveToSettings }) => {
				this._setRate(rate, saveToSettings ?? true);
			});
			this.eventBus.on("video:active-changed", (video) => {
				this.onActiveVideoChanged(video);
			});
			this.eventBus.on("video:seek-requested", ({ time }) => {
				const video = this.store.activeVideo;
				if (video && Number.isFinite(time)) {
					video.currentTime = clampTime(time, video.duration || 0);
					this.emitTimeUpdate(video);
				}
			});
		}
		onActiveVideoChanged(v) {
			clearTimeout(this.store.timers.hideGrace);
			if (this.lastVideo) {
				this.store.saveVideoPosition(this.lastVideo);
				VIDEO_LISTENED_EVENTS.forEach((ev) => {
					this.lastVideo?.removeEventListener(ev, this);
				});
			}
			this.lastVideo = v;
			if (this.videoResizeObserver) this.videoResizeObserver.disconnect();
			if (this.videoMutationObserver) this.videoMutationObserver.disconnect();
			if (this.currentScrollParents) {
				this.currentScrollParents.forEach((p) => p.removeEventListener("scroll", this.boundScrollHandler));
				this.currentScrollParents = [];
			}
			if (v) {
				const meta = this.store.getVideoMetadata(v);
				if (!meta.transform) this.store.updateVideoMetadata(v, { transform: {
					ratio: "fit",
					zoom: 1,
					rot: 0
				} });
				else if (meta.transform.rot === void 0) meta.transform.rot = 0;
				this.store.settings.transform = meta.transform;
				const savedTime = this.store.getVideoPosition(v);
				if (savedTime > 0) {
					const applyRestore = () => {
						if (this.store.activeVideo === v && this.store.settings.rememberPlayback) {
							if (v.currentTime < savedTime) v.currentTime = savedTime;
						}
					};
					if (v.readyState >= 1) applyRestore();
					else v.addEventListener("loadedmetadata", applyRestore, { once: true });
				}
				this.attachUIToVideo(v);
				const scrollParents = this.findScrollableParents(v);
				this.currentScrollParents = scrollParents;
				scrollParents.forEach((p) => p.addEventListener("scroll", this.boundScrollHandler, { passive: true }));
				if (this.videoResizeObserver) this.videoResizeObserver.observe(v);
				if (this.videoMutationObserver) {
					this.videoMutationObserver.observe(v, {
						attributes: true,
						attributeFilter: ["style", "class"]
					});
					if (v.parentElement) this.videoMutationObserver.observe(v.parentElement, {
						attributes: true,
						attributeFilter: ["style", "class"]
					});
				}
				const rememberedRate = this.store.settings.rememberPlayback ? this.store.settings.lastRate || this.store.settings.defaultSpeed || 1 : this.store.settings.defaultSpeed || 1;
				const savedRate = meta.lastRate !== void 0 ? meta.lastRate : rememberedRate;
				this.store.updateVideoMetadata(v, { lastRate: savedRate });
				if (v.playbackRate !== savedRate) this._setRate(savedRate, false);
				this.applyVideoTransform();
			} else this.store.timers.hideGrace = setTimeout(() => {
				if (!this.store.activeVideo && this.ui.wrap) this.ui.wrap.style.display = "none";
			}, MVC_CONFIG.HIDE_GRACE_PERIOD_MS);
		}
		attachUIToVideo(video) {
			if (!this.ui.wrap) return;
			this.ui.wrap.style.visibility = "hidden";
			this.ui.wrap.style.position = "absolute";
			const container = getFullscreenContainer();
			if (container && container.isConnected) {
				if (container !== document.body && container !== document.documentElement && getComputedStyle(container).position === "static") container.style.position = "relative";
				container.appendChild(this.ui.wrap);
			} else document.body.appendChild(this.ui.wrap);
			this.ui.wrap.style.display = "block";
			this.throttledPositionOnVideo();
			setTimeout(() => {
				if (this.ui.wrap) this.ui.wrap.style.visibility = "visible";
			}, 50);
			VIDEO_LISTENED_EVENTS.forEach((ev) => {
				video.removeEventListener(ev, this);
				video.addEventListener(ev, this);
			});
			this.emitTimeUpdate(video);
		}
		emitTimeUpdate(v) {
			if (!v) return;
			let buffered = 0;
			if (v.buffered && v.buffered.length > 0) try {
				buffered = v.buffered.end(v.buffered.length - 1);
			} catch {}
			this.eventBus.emit("video:time-update", {
				currentTime: v.currentTime || 0,
				duration: v.duration || 0,
				buffered
			});
		}
		handleEvent(event) {
			switch (event.type) {
				case "ended":
					if (this.store.activeVideo) this.store.saveVideoPosition(this.store.activeVideo);
					this.onVideoEnded();
					break;
				case "play":
					if (this.store.activeVideo) this.emitTimeUpdate(this.store.activeVideo);
					this.eventBus.emit("video:play-state-changed", { playing: true });
					this.eventBus.emit("control:visibility-requested", { visible: true });
					break;
				case "pause":
					if (this.store.activeVideo) {
						this.store.saveVideoPosition(this.store.activeVideo);
						this.emitTimeUpdate(this.store.activeVideo);
					}
					this.eventBus.emit("video:play-state-changed", { playing: false });
					this.eventBus.emit("control:visibility-requested", { visible: true });
					break;
				case "loadedmetadata":
					if (this.store.settings.transform?.rot) this.applyVideoTransform();
					if (this.store.activeVideo) this.emitTimeUpdate(this.store.activeVideo);
					break;
				case "durationchange":
				case "progress":
				case "seeking":
				case "seeked":
				case "timeupdate":
					if (this.store.activeVideo) {
						this.emitTimeUpdate(this.store.activeVideo);
						const now = Date.now();
						if (now - (this.store.getVideoMetadata(this.store.activeVideo).lastPositionSave || 0) > MVC_CONFIG.POSITION_SAVE_INTERVAL_MS) {
							this.store.saveVideoPosition(this.store.activeVideo);
							this.store.updateVideoMetadata(this.store.activeVideo, { lastPositionSave: now });
						}
					}
					break;
				case "ratechange": {
					const video = this.store.activeVideo;
					if (video) {
						const currentRate = video.playbackRate;
						this.eventBus.emit("video:rate-changed", { rate: currentRate });
						if (this.store.savedPlaybackRate === void 0) this.eventBus.emit("control:visibility-requested", { visible: true });
						const meta = this.store.getVideoMetadata(video);
						if (meta.lastRate === void 0) meta.lastRate = currentRate;
						if (currentRate !== meta.lastRate) if (!video.paused) if (this.store._rateOverrideCount < 3) {
							this.store._rateOverrideCount++;
							this._setRate(meta.lastRate, false);
						} else {
							console.warn("[MVC] Stopped rate override loop. Site is enforcing speed:", currentRate);
							this.eventBus.emit("ui:toast", { message: "Playback rate overridden by website" });
						}
						else meta.lastRate = currentRate;
						else this.store._rateOverrideCount = 0;
					}
					break;
				}
				case "click": this.handleVideoClick();
			}
		}
		handleVideoClick() {
			if (this.store.isDoubleTapping) return;
			if (this.store.savedPlaybackRate !== void 0 || this.store.isPinching || this.store.isSwipeSeeking || this.store.isVolumeControlling || this.store.isBrightnessControlling) return;
			if (this.store.timers.videoClick) clearTimeout(this.store.timers.videoClick);
			this.store.timers.videoClick = setTimeout(() => {
				if (this.store.isDoubleTapping) {
					this.store.timers.videoClick = void 0;
					return;
				}
				if (this.ui.wrap) if (this.ui.wrap.style.opacity !== "1") this.eventBus.emit("control:visibility-requested", {
					visible: true,
					force: true
				});
				else this.eventBus.emit("control:visibility-requested", { visible: false });
				this.store.timers.videoClick = void 0;
			}, MVC_CONFIG.CLICK_DELAY);
		}
		_applyPagePosition(pageX, pageY, ignoreYClamp = false) {
			if (!this.ui.wrap) return;
			const v = this.getViewportPageBounds();
			const uiWidth = this.ui.wrap.offsetWidth;
			const uiHeight = this.ui.wrap.offsetHeight;
			const minPageX = v.leftPage + MVC_CONFIG.EDGE;
			const maxPageX = v.leftPage + v.width - uiWidth - MVC_CONFIG.EDGE;
			const minPageY = v.topPage + MVC_CONFIG.EDGE;
			const maxPageY = v.topPage + v.height - uiHeight - MVC_CONFIG.EDGE;
			const clampedLeft = clamp(pageX, minPageX, maxPageX);
			const clampedTop = ignoreYClamp ? pageY : clamp(pageY, minPageY, maxPageY);
			const parentRect = (this.ui.wrap.offsetParent || document.body).getBoundingClientRect();
			const parentLeftPage = parentRect.left + window.scrollX;
			const parentTopPage = parentRect.top + window.scrollY;
			const leftVal = `${Math.round(clampedLeft - parentLeftPage)}px`;
			const topVal = `${Math.round(clampedTop - parentTopPage)}px`;
			if (this.ui.wrap.style.left !== leftVal) this.ui.wrap.style.left = leftVal;
			if (this.ui.wrap.style.top !== topVal) this.ui.wrap.style.top = topVal;
			if (this.ui.wrap.style.right !== "auto") this.ui.wrap.style.right = "auto";
			if (this.ui.wrap.style.bottom !== "auto") this.ui.wrap.style.bottom = "auto";
		}
		positionOnVideo() {
			if (!this.store.activeVideo || !this.ui.wrap) return;
			if (this.ui.wrap.style.transform !== "") this.ui.wrap.style.transform = "";
			const vr = this.store.activeVideo.getBoundingClientRect();
			const layoutWidth = this.store.activeVideo.clientWidth;
			const layoutHeight = this.store.activeVideo.clientHeight;
			const zoom = this.store.settings.transform.zoom;
			const offsetX = layoutWidth * (zoom - 1) / 2;
			const offsetY = layoutHeight * (zoom - 1) / 2;
			const uiWidth = this.ui.wrap.offsetWidth || 100;
			const desiredLeftPage = vr.right - offsetX + window.scrollX - MVC_CONFIG.EDGE - uiWidth;
			const desiredTopPage = vr.top + offsetY + window.scrollY + MVC_CONFIG.EDGE;
			this._applyPagePosition(desiredLeftPage, desiredTopPage, this.store.isScrolling);
			this.ui.updateBrightnessOverlayPosition();
		}
		ensureUIInViewport() {
			if (!this.ui.wrap || !this.ui.wrap.offsetWidth || !this.ui.wrap.offsetHeight) return;
			const uiRect = this.ui.wrap.getBoundingClientRect();
			this._applyPagePosition(uiRect.left + window.scrollX, uiRect.top + window.scrollY);
		}
		throttledPositionOnVideo() {
			if (this.store.isTicking) return;
			this.store.isTicking = true;
			requestAnimationFrame(() => {
				this.positionOnVideo();
				this.store.isTicking = false;
			});
		}
		onViewportChange() {
			if (this.store.activeVideo) {
				this.throttledPositionOnVideo();
				this.ui.updateBrightnessOverlayPosition();
			} else this.ensureUIInViewport();
		}
		getViewportPageBounds() {
			const v = window.visualViewport;
			return {
				leftPage: window.scrollX + (v ? v.offsetLeft : 0),
				topPage: window.scrollY + (v ? v.offsetTop : 0),
				width: v ? v.width : window.innerWidth,
				height: v ? v.height : window.innerHeight
			};
		}
		findScrollableParents(element) {
			const parents = [];
			let parent = element.parentElement;
			while (parent) {
				const style = window.getComputedStyle(parent);
				const scrollsY = (style.overflowY === "scroll" || style.overflowY === "auto") && parent.scrollHeight > parent.clientHeight;
				const scrollsX = (style.overflowX === "scroll" || style.overflowX === "auto") && parent.scrollWidth > parent.clientWidth;
				if (scrollsY || scrollsX) parents.push(parent);
				parent = parent.parentElement;
			}
			parents.push(window);
			return parents;
		}
		_setRate(rate, saveToSettings = true) {
			if (!this.store.activeVideo) return;
			this.store.activeVideo.playbackRate = rate;
			this.store.updateVideoMetadata(this.store.activeVideo, { lastRate: rate });
			if (saveToSettings) {
				this.store.saveSetting("lastRate", rate);
				this.store._rateOverrideCount = 0;
			}
		}
		onVideoEnded() {
			if (this.store.activeVideo) this._setRate(this.store.settings.defaultSpeed, false);
		}
		handlePlayPauseClick() {
			const video = this.store.activeVideo;
			if (!video) return;
			if (video.paused || video.ended) {
				const expectedRate = this.store.settings.rememberPlayback ? this.store.settings.lastRate || this.store.settings.defaultSpeed : this.store.settings.defaultSpeed;
				this._setRate(expectedRate, false);
				if (video.ended) video.currentTime = 0;
				video.play().catch(() => {});
			} else video.pause();
		}
		doSkip(dir, seconds) {
			const video = this.store.activeVideo;
			if (video) {
				if (Number.isNaN(video.duration) || video.duration === 0) return;
				video.currentTime = clampTime(video.currentTime + dir * seconds, video.duration);
			}
		}
		getRotationFitScale(v, rot) {
			if (rot % 180 === 0) return 1;
			const W = v.clientWidth;
			const H = v.clientHeight;
			const vw = v.videoWidth;
			const vh = v.videoHeight;
			if (!W || !H || !vw || !vh) return 1;
			const boxAspect = W / H;
			const vidAspect = vw / vh;
			const [wc, hc] = vidAspect > boxAspect ? [W, W / vidAspect] : [H * vidAspect, H];
			if (!wc || !hc) return 1;
			return Math.min(W / hc, H / wc);
		}
		applyVideoTransform() {
			if (!this.store.activeVideo) return;
			const { ratio, zoom } = this.store.settings.transform;
			const rot = this.store.settings.transform.rot || 0;
			const isDefault = ratio === "fit" && zoom === 1 && rot === 0;
			const meta = this.store.getVideoMetadata(this.store.activeVideo);
			if (isDefault) {
				if (meta.originalTransform !== void 0) {
					this.store.activeVideo.style.transform = meta.originalTransform;
					this.store.updateVideoMetadata(this.store.activeVideo, { originalTransform: void 0 });
				}
				if (meta.originalObjectFit !== void 0) {
					this.store.activeVideo.style.objectFit = meta.originalObjectFit;
					this.store.updateVideoMetadata(this.store.activeVideo, { originalObjectFit: void 0 });
				}
				return;
			}
			let origTransform = meta.originalTransform;
			if (origTransform === void 0) {
				origTransform = this.store.activeVideo.style.transform || "";
				this.store.updateVideoMetadata(this.store.activeVideo, { originalTransform: origTransform });
			}
			let origObjectFit = meta.originalObjectFit;
			if (origObjectFit === void 0) {
				origObjectFit = this.store.activeVideo.style.objectFit || "";
				this.store.updateVideoMetadata(this.store.activeVideo, { originalObjectFit: origObjectFit });
			}
			this.store.activeVideo.style.objectFit = ratio === "fit" ? "contain" : ratio === "fill" ? "cover" : "fill";
			const fit = this.getRotationFitScale(this.store.activeVideo, rot);
			const rotPart = rot ? ` rotate(${rot}deg)` : "";
			this.store.activeVideo.style.transform = `${origTransform}${rotPart} scale(${zoom * fit})`.trim();
		}
		onFullScreenChange() {
			const container = getFullscreenContainer();
			[
				this.ui.backdrop,
				this.ui.toast,
				this.ui.gestureOverlay,
				this.ui.volumeBar,
				this.ui.brightnessOverlay,
				this.ui.brightnessBar,
				this.ui.doubleTapContainer,
				this.ui.frameEl,
				this.ui.settingsSheet?.dom
			].forEach((el) => {
				if (el) container.appendChild(el);
			});
			if (this.store.activeVideo) this.attachUIToVideo(this.store.activeVideo);
			this.guardianCheck();
		}
		guardianCheck() {
			if (!this.store.activeVideo || !this.ui.wrap) return;
			const expectedParent = getFullscreenContainer();
			if (expectedParent && (!this.ui.wrap.isConnected || this.ui.wrap.parentElement !== expectedParent)) this.attachUIToVideo(this.store.activeVideo);
		}
	};
	var GestureCoordinator = class {
		activeGesture = null;
		acquire(gesture) {
			if (this.activeGesture === null) {
				this.activeGesture = gesture;
				return true;
			}
			return this.activeGesture === gesture;
		}
		release(gesture) {
			if (this.activeGesture === gesture) this.activeGesture = null;
		}
		isActive(gesture) {
			return this.activeGesture === gesture;
		}
		hasActiveGesture() {
			return this.activeGesture !== null;
		}
		isPointerGestureActive() {
			return this.activeGesture === "swipe_seek" || this.activeGesture === "pinch" || this.activeGesture === "volume_control" || this.activeGesture === "brightness_control";
		}
		reset() {
			this.activeGesture = null;
		}
	};
	var StateStore = class {
		eventBus;
		activeVideo = null;
		visibleVideos = new Map();
		isScrolling = false;
		isTicking = false;
		savedPlaybackRate;
		lastRealUserEvent = 0;
		isInitialized = false;
		gestureCoordinator = new GestureCoordinator();
		get isPinching() {
			return this.gestureCoordinator.isActive("pinch");
		}
		get isSwipeSeeking() {
			return this.gestureCoordinator.isActive("swipe_seek");
		}
		get isVolumeControlling() {
			return this.gestureCoordinator.isActive("volume_control");
		}
		get isDoubleTapping() {
			return this.gestureCoordinator.isActive("double_tap");
		}
		get isBrightnessControlling() {
			return this.gestureCoordinator.isActive("brightness_control");
		}
		canStartTouchGesture(e) {
			return this.settings.gesturesEnabled && !this.isScreenLocked && !shouldBlockGestures() && e.pointerType === "touch" && !!this.activeVideo?.isConnected && !this.gestureCoordinator.isPointerGestureActive() && !isPointOnUI(e.target);
		}
		brightness = 1;
		uiWrap = null;
		isScreenLocked = false;
		get _rateOverrideCount() {
			if (!this.activeVideo) return 0;
			return this.getVideoMetadata(this.activeVideo).rateOverrideCount || 0;
		}
		set _rateOverrideCount(value) {
			if (!this.activeVideo) return;
			this.updateVideoMetadata(this.activeVideo, { rateOverrideCount: value });
		}
		settings;
		timers = {};
		abortController = new AbortController();
		videoMetadata = new WeakMap();
		getVideoMetadata(video) {
			let meta = this.videoMetadata.get(video);
			if (!meta) {
				meta = {};
				this.videoMetadata.set(video, meta);
			}
			return meta;
		}
		updateVideoMetadata(video, updates) {
			const meta = this.getVideoMetadata(video);
			Object.assign(meta, updates);
		}
		constructor(eventBus) {
			this.eventBus = eventBus;
			try {
				localStorage.removeItem("mvc_preloadEnhanced");
				localStorage.removeItem("mvc_volumeBoostEnabled");
				if (typeof GM_deleteValue !== "undefined") {
					GM_deleteValue("mvc_preloadEnhanced");
					GM_deleteValue("mvc_volumeBoostEnabled");
				}
			} catch {}
			this.loadSettings();
			["beforeunload", "pagehide"].forEach((ev) => window.addEventListener(ev, () => {
				if (this.activeVideo) this.saveVideoPosition(this.activeVideo);
				this.flushSettings();
			}, {
				capture: true,
				signal: this.abortController.signal
			}));
		}
		storageGet(key, fallback) {
			try {
				if (typeof GM_getValue !== "undefined") {
					const v = GM_getValue(key);
					return v === void 0 ? fallback : v;
				}
				const v = localStorage.getItem(key);
				return v === null ? fallback : JSON.parse(v);
			} catch (e) {
				return fallback;
			}
		}
		storageSet(key, val) {
			try {
				if (typeof GM_setValue !== "undefined") GM_setValue(key, val);
				else localStorage.setItem(key, JSON.stringify(val));
			} catch {}
		}
		setActiveVideo(v) {
			if (this.activeVideo === v) return;
			this.activeVideo = v;
			this.eventBus.emit("video:active-changed", v);
		}
		getStorageKey(key) {
			return `mvc_${key}`;
		}
		getDomainSpeedKey() {
			let domain = "";
			if (typeof window !== "undefined" && window.location) {
				if (window.location.hostname) domain = window.location.hostname;
				else if (window.location.href) try {
					domain = new URL(window.location.href).hostname;
				} catch {}
			}
			return domain ? `mvc_lastRate_${domain}` : "mvc_lastRate";
		}
		loadSettings() {
			let savedRate = this.storageGet(this.getDomainSpeedKey(), null);
			if (savedRate === null) savedRate = this.storageGet(this.getStorageKey("lastRate"), MVC_CONFIG.SPEED_DEFAULT);
			this.settings = {
				skipSeconds: this.storageGet(this.getStorageKey("skipSeconds"), MVC_CONFIG.SKIP_DEFAULT),
				defaultSpeed: this.storageGet(this.getStorageKey("defaultSpeed"), MVC_CONFIG.SPEED_DEFAULT),
				lastRate: savedRate,
				theme: this.storageGet(this.getStorageKey("theme"), "halo"),
				transform: {
					ratio: "fit",
					zoom: 1,
					rot: 0
				},
				gesturesEnabled: this.storageGet(this.getStorageKey("gesturesEnabled"), true),
				scrollCompatibility: this.storageGet(this.getStorageKey("scrollCompatibility"), true),
				rememberPlayback: this.storageGet(this.getStorageKey("rememberPlayback"), true),
				progressBarEnabled: this.storageGet(this.getStorageKey("progressBarEnabled"), true),
				minimalSpeedFab: this.storageGet(this.getStorageKey("minimalSpeedFab"), false),
				leftHandMode: this.storageGet(this.getStorageKey("leftHandMode"), false)
			};
		}
		saveSetting(key, val) {
			this.settings[key] = val;
			if (key === "lastRate") this._rateOverrideCount = 0;
			this.eventBus.emit("settings:changed", {
				key,
				val
			});
			if (key === "transform") {
				if (this.activeVideo) this.updateVideoMetadata(this.activeVideo, { transform: val });
				return;
			}
			clearTimeout(this.timers[`save_${key}`]);
			this.timers[`save_${key}`] = setTimeout(() => {
				const storageKey = key === "lastRate" ? this.getDomainSpeedKey() : this.getStorageKey(key);
				this.storageSet(storageKey, val);
			}, MVC_CONFIG.STORAGE_DEBOUNCE_MS);
		}
		flushSettings() {
			if (!this.settings) return;
			for (const key of Object.keys(this.settings)) {
				if (key === "transform") continue;
				clearTimeout(this.timers[`save_${key}`]);
				const storageKey = key === "lastRate" ? this.getDomainSpeedKey() : this.getStorageKey(key);
				this.storageSet(storageKey, this.settings[key]);
			}
		}
		getVideoPosition(video) {
			if (!this.settings.rememberPlayback) return 0;
			try {
				const positions = this.storageGet(this.getStorageKey("positions"), {});
				const id = this.getVideoId(video);
				const time = positions[`_${id}`] ?? positions[id];
				if (typeof time === "number") {
					if (video.duration && time >= video.duration - MVC_CONFIG.POSITION_SAVE_END_BUFFER) return 0;
					return time;
				}
			} catch {}
			return 0;
		}
		saveVideoPosition(video) {
			if (!this.settings.rememberPlayback) return;
			const time = video.currentTime;
			if (time === void 0 || Number.isNaN(time) || time < MVC_CONFIG.POSITION_SAVE_MIN_TIME) return;
			try {
				const key = this.getStorageKey("positions");
				const positions = this.storageGet(key, {});
				const id = this.getVideoId(video);
				const storageId = `_${id}`;
				delete positions[id];
				delete positions[storageId];
				if (video.duration && time >= video.duration - MVC_CONFIG.POSITION_SAVE_END_BUFFER) {} else positions[storageId] = time;
				const keys = Object.keys(positions);
				if (keys.length > MVC_CONFIG.MAX_POSITION_HISTORY) delete positions[keys[0]];
				this.storageSet(key, positions);
			} catch {}
		}
		getVideoId(v) {
			const meta = this.getVideoMetadata(v);
			const src = v.currentSrc || v.src || "";
			if (meta.videoId && meta.videoIdSrc === src) return meta.videoId;
			let id;
			if (src && !src.startsWith("blob:") && !src.startsWith("data:")) id = cleanUrl(src);
			else {
				const url = cleanUrl(window.location.href);
				const path = getVideoDomPath(v);
				const cleanPath = path.startsWith("#") ? path.substring(1) : path;
				if (!cleanPath) id = url;
				else id = url + (url.includes("#") ? url.endsWith("#") ? "" : "#" : "#") + cleanPath;
			}
			try {
				this.updateVideoMetadata(v, {
					videoId: id,
					videoIdSrc: src
				});
			} catch {}
			return id;
		}
	};
	function cleanUrl(urlStr) {
		try {
			const url = new URL(urlStr);
			const toRemove = [
				"t",
				"time",
				"start",
				"position",
				"seek"
			];
			toRemove.forEach((p) => url.searchParams.delete(p));
			let hash = url.hash;
			if (hash) {
				if (!hash.includes("?") && hash.includes("&") && hash.includes("=")) {
					const firstAmp = hash.indexOf("&");
					hash = hash.substring(0, firstAmp) + "?" + hash.substring(firstAmp + 1);
				}
				const parts = hash.split("?");
				const route = parts[0];
				const query = parts[1];
				const isRouteQuery = route.includes("=") && !route.includes("/");
				const params = new URLSearchParams(query || (isRouteQuery ? route.substring(1) : ""));
				toRemove.forEach((p) => params.delete(p));
				const newQuery = params.toString();
				if (query) url.hash = newQuery ? `${route}?${newQuery}` : route;
				else if (isRouteQuery) url.hash = newQuery ? `#${newQuery}` : "";
				else url.hash = route;
			}
			return url.toString();
		} catch (e) {
			return urlStr;
		}
	}
	function getVideoDomPath(v) {
		if (typeof v.id === "string" && v.id) return `#${v.id}`;
		if (typeof v.tagName !== "string") return "video-mock";
		const path = [];
		let current = v;
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
					if (firstClass && !firstClass.startsWith("mvc-")) segment += `.${firstClass}`;
				}
				let index = 0;
				try {
					let sibling = current.previousElementSibling;
					while (sibling) {
						if (sibling.tagName === current.tagName) index++;
						sibling = sibling.previousElementSibling;
					}
				} catch {}
				segment += `[${index}]`;
			}
			path.unshift(segment);
			const parentNode = current.parentNode;
			current = current.parentElement || (parentNode && parentNode.host ? parentNode.host : null);
		}
		return path.join(">");
	}
	var Controller = class {
		eventBus;
		store;
		ui;
		videoTracker;
		videoTransform;
		swipeDetector;
		pressDetector;
		doubleTapDetector;
		lightObserver;
		constructor() {
			if (window.__MVC_INSTANCE) window.__MVC_INSTANCE.destroy();
			window.__MVC_INSTANCE = this;
			this.eventBus = new EventBus();
			this.store = new StateStore(this.eventBus);
			this.ui = new UIManager(this.eventBus, this.store);
			this.videoTracker = new VideoTracker(this.eventBus, this.store);
			this.videoTransform = new VideoTransform(this.eventBus, this.store, this.ui);
			this.swipeDetector = new SwipeDetector(this.eventBus, this.store);
			this.pressDetector = new PressDetector(this.eventBus, this.store);
			this.doubleTapDetector = new DoubleTapDetector(this.eventBus, this.store);
			this.eventBus.on("controller:init-requested", () => this.init());
			if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => this.safeInit(), { once: true });
			else this.safeInit();
		}
		safeInit() {
			if (!document.body) {
				setTimeout(() => this.safeInit(), 50);
				return;
			}
			this.videoTracker.patchAttachShadow();
			if (findAllVideos(document).length > 0) {
				this.init();
				return;
			}
			this.videoTracker.observeShadowRoots(document);
			this.lightObserver = new MutationObserver((mutations) => {
				if (document.querySelector("video") || Array.from(this.videoTracker.shadowObservers.keys()).some((root) => root.querySelector("video"))) {
					this.init();
					return;
				}
				for (let i = 0; i < mutations.length; i++) {
					const mutation = mutations[i];
					for (let j = 0; j < mutation.addedNodes.length; j++) {
						const node = mutation.addedNodes[j];
						if (node.nodeType === Node.ELEMENT_NODE) {
							const el = node;
							if (el.tagName === "VIDEO" || el.querySelector?.("video")) {
								this.init();
								return;
							}
							this.videoTracker.observeShadowRoots(el);
						}
					}
				}
			});
			this.lightObserver.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		}
		init() {
			if (this.store.isInitialized) return;
			this.store.isInitialized = true;
			if (this.lightObserver) {
				this.lightObserver.disconnect();
				this.lightObserver = void 0;
			}
			injectStyles();
			this.ui.init();
			this.store.uiWrap = this.ui.wrap;
			this.swipeDetector.init();
			this.pressDetector.init();
			this.doubleTapDetector.init();
			this.videoTracker.init();
		}
		destroy() {
			this.store.abortController.abort();
			if (this.lightObserver) {
				this.lightObserver.disconnect();
				this.lightObserver = void 0;
			}
			for (const el of [
				this.ui.wrap,
				this.ui.backdrop,
				this.ui.toast,
				this.ui.gestureOverlay,
				this.ui.volumeBar,
				this.ui.brightnessOverlay,
				this.ui.brightnessBar,
				this.ui.doubleTapContainer,
				this.ui.frameEl,
				this.ui.settingsSheet?.dom
			]) el?.remove();
			this.ui.progressBar?.destroy();
			this.ui.stepper?.destroy();
			this.videoTracker.destroy();
			this.videoTransform.destroy();
			clearTimeout(this.store.timers.hideGrace);
		}
	};
	var initController = () => {
		let isDisabled = false;
		const hostname = typeof window !== "undefined" && window.location ? window.location.hostname : "";
		if (hostname && typeof GM_getValue !== "undefined") isDisabled = !!GM_getValue(`disabled_${hostname}`, false);
		if (hostname && typeof GM_registerMenuCommand !== "undefined") {
			const disabledKey = `disabled_${hostname}`;
			const label = isDisabled ? `GlideVideo: Enable on ${hostname}` : `GlideVideo: Disable on ${hostname}`;
			GM_registerMenuCommand(label, () => {
				if (typeof GM_setValue !== "undefined") {
					GM_setValue(disabledKey, !isDisabled);
					window.location.reload();
				}
			});
		}
		if (!isDisabled) new Controller();
	};
	initController();
})();
