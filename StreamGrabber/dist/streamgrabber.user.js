// ==UserScript==
// @name         StreamGrabber
// @namespace    https://github.com/streamgrabber-lite
// @version      2.5.4
// @author       StreamGrabber
// @description  High-performance HLS/Video downloader. Detect and download HLS streams (.m3u8), video blobs, and direct video files with a premium UI. Features pause/resume, AES-128 support, fMP4 segments, and adaptive quality selection. Optimized for mobile and desktop.
// @license      GPL-3.0-or-later
// @match        *://*/*
// @exclude      *://*.gov/*
// @exclude      *://*.gov.*/*
// @exclude      *://*.mil/*
// @exclude      *://*.mil.*/*
// @exclude      *://*.int/*
// @exclude      *://*.edu/*
// @exclude      *://*.edu.*/*
// @exclude      *://*.ac.*/*
// @exclude      *://*.nic.in/*
// @exclude      *://localhost/*
// @exclude      *://127.0.0.1/*
// @exclude      *://[::1]/*
// @exclude      *://10.*.*.*/*
// @exclude      *://192.168.*.*/*
// @exclude      *://172.1[6-9].*/*
// @exclude      *://172.2[0-9].*/*
// @exclude      *://172.3[0-1].*/*
// @exclude      *://*.google.*/*
// @exclude      *://*.bing.com/*
// @exclude      *://*.duckduckgo.com/*
// @exclude      *://*.baidu.com/*
// @exclude      *://*.yahoo.com/*
// @exclude      *://*.yandex.*/*
// @exclude      *://*.facebook.com/*
// @exclude      *://*.instagram.com/*
// @exclude      *://*.x.com/*
// @exclude      *://*.twitter.com/*
// @exclude      *://*.linkedin.com/*
// @exclude      *://*.tiktok.com/*
// @exclude      *://*.reddit.com/*
// @exclude      *://*.redd.it/*
// @exclude      *://*.pinterest.com/*
// @exclude      *://*.snapchat.com/*
// @exclude      *://*.tumblr.com/*
// @exclude      *://*.threads.net/*
// @exclude      *://*.bluesky.social/*
// @exclude      *://*.mastodon.social/*
// @exclude      *://*.youtube.*/*
// @exclude      *://*.twitch.tv/*
// @exclude      *://*.netflix.com/*
// @exclude      *://*.disneyplus.com/*
// @exclude      *://*.hulu.com/*
// @exclude      *://*.hbomax.com/*
// @exclude      *://*.max.com/*
// @exclude      *://*.paramountplus.com/*
// @exclude      *://*.peacocktv.com/*
// @exclude      *://*.primevideo.com/*
// @exclude      *://*.spotify.com/*
// @exclude      *://*.soundcloud.com/*
// @exclude      *://*.deezer.com/*
// @exclude      *://*.tidal.com/*
// @exclude      *://*.whatsapp.*/*
// @exclude      *://*.telegram.*/*
// @exclude      *://*.discord.*/*
// @exclude      *://*.skype.com/*
// @exclude      *://*.chase.com/*
// @exclude      *://*.bankofamerica.com/*
// @exclude      *://*.wellsfargo.com/*
// @exclude      *://*.citibank.com/*
// @exclude      *://*.capitalone.com/*
// @exclude      *://*.americanexpress.com/*
// @exclude      *://*.paypal.com/*
// @exclude      *://*.stripe.com/*
// @exclude      *://*.venmo.com/*
// @exclude      *://*.coinbase.com/*
// @exclude      *://*.binance.com/*
// @exclude      *://*.fidelity.com/*
// @exclude      *://*.vanguard.com/*
// @exclude      *://*.schwab.com/*
// @exclude      *://*.robinhood.com/*
// @exclude      *://*.amazon.*/*
// @exclude      *://*.ebay.com/*
// @exclude      *://*.target.com/*
// @exclude      *://*.walmart.com/*
// @exclude      *://*.bestbuy.com/*
// @exclude      *://*.etsy.com/*
// @exclude      *://*.aliexpress.com/*
// @exclude      *://*.alibaba.com/*
// @exclude      *://*.shopify.com/*
// @exclude      *://*.nytimes.com/*
// @exclude      *://*.cnn.com/*
// @exclude      *://*.bbc.*/*
// @exclude      *://*.reuters.com/*
// @exclude      *://*.theguardian.*/*
// @exclude      *://*.forbes.com/*
// @exclude      *://*.bloomberg.com/*
// @exclude      *://*.wsj.com/*
// @exclude      *://*.wikipedia.*/*
// @exclude      *://*.wikimedia.*/*
// @exclude      *://*.coursera.org/*
// @exclude      *://*.udemy.com/*
// @exclude      *://*.khanacademy.org/*
// @exclude      *://*.duolingo.com/*
// @exclude      *://*.quora.com/*
// @exclude      *://*.github.*/*
// @exclude      *://*.gitlab.*/*
// @exclude      *://*.stackoverflow.com/*
// @exclude      *://*.npmjs.com/*
// @exclude      *://*.docker.com/*
// @exclude      *://*.git-scm.com/*
// @exclude      *://*.atlassian.*/*
// @exclude      *://*.jira.com/*
// @exclude      *://*.slack.com/*
// @exclude      *://*.zoom.*/*
// @exclude      *://*.microsoft.com/*
// @exclude      *://*.office.com/*
// @exclude      *://*.outlook.com/*
// @exclude      *://*.live.com/*
// @exclude      *://*.notion.so/*
// @exclude      *://*.trello.com/*
// @exclude      *://*.asana.com/*
// @exclude      *://*.monday.com/*
// @exclude      *://*.dropbox.com/*
// @exclude      *://*.box.com/*
// @exclude      *://*.wetransfer.com/*
// @exclude      *://*.mega.nz/*
// @exclude      *://*.icloud.com/*
// @exclude      *://*.speedtest.net/*
// @exclude      *://*.canva.com/*
// @exclude      *://*.adobe.com/*
// @exclude      *://*.figma.com/*
// @exclude      *://*.lastpass.com/*
// @exclude      *://*.1password.com/*
// @exclude      *://*.bitwarden.com/*
// @exclude      *://*.dashlane.com/*
// @exclude      *://*.okta.com/*
// @exclude      *://*.chatgpt.com/*
// @exclude      *://*.openai.com/*
// @exclude      *://*.claude.ai/*
// @exclude      *://*.anthropic.com/*
// @exclude      *://*.perplexity.ai/*
// @connect      *
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_info
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var CFG = {
		RETRIES: 3,
		CONCURRENCY: 6,
		REQUEST_TIMEOUT: 6e4,
		MANIFEST_TIMEOUT: 3e4,
		SMALL_BYTES: 1048576,
		UI_IDLE_MS: 5e3,
		ENRICH_DELAY: 150,
		DETECT_DEBOUNCE: 50,
		ENRICH_TIMEOUT: 1e4,
		IS_TOP: window.self === window.top
	};
	var CACHE = {
		TEXT_MAX: 256,
		HEAD_MAX: 256,
		DB_MAX: 120,
		CLEAR_MS: 12e4
	};
	var SETTINGS_KEYS = { EXCLUDE_SMALL: "sg_exclude_small" };
	function getSetting(key, defaultValue) {
		return GM_getValue(key, defaultValue);
	}
	function setSetting(key, value) {
		GM_setValue(key, value);
	}
	var blobRegistry = new Map();
	function pruneBlobs(predicate) {
		const removed = [];
		for (const [url, info] of blobRegistry) if (predicate(url, info)) {
			blobRegistry.delete(url);
			removed.push(url);
		}
		return removed;
	}
	var Subscribable = class {
		listeners = new Set();
		subscribe(fn) {
			this.listeners.add(fn);
			return () => this.listeners.delete(fn);
		}
		dispatch(payload) {
			for (const fn of this.listeners) try {
				fn(payload);
			} catch (e) {
				console.error("[SG] Event dispatch error:", e);
			}
		}
	};
	var AppState = class {
		items = new Map();
		watchedVideos = new WeakSet();
		excludeSmall;
		events = {
			itemAdded: new Subscribable(),
			updated: new Subscribable()
		};
		constructor() {
			this.excludeSmall = getSetting(SETTINGS_KEYS.EXCLUDE_SMALL, true);
		}
		hasItem(url) {
			return this.items.has(url);
		}
		getItem(url) {
			const item = this.items.get(url);
			if (item) {
				this.items.delete(url);
				this.items.set(url, item);
			}
			return item;
		}
		addItem(item) {
			if (this.items.has(item.url)) {
				const existing = this.items.get(item.url);
				const updated = {
					...existing,
					...item,
					enriched: existing.enriched || item.enriched,
					enriching: existing.enriching || item.enriching,
					hlsType: existing.hlsType || item.hlsType,
					isLive: existing.isLive || item.isLive,
					encrypted: existing.encrypted || item.encrypted,
					_enrichPromise: existing._enrichPromise || item._enrichPromise,
					size: item.size ?? existing.size,
					type: item.type ?? existing.type,
					label: existing.enriched && !item.enriched ? existing.label : item.label,
					sublabel: existing.sublabel ?? item.sublabel,
					variant: existing.variant ?? item.variant,
					isRemote: existing.isRemote || item.isRemote,
					remoteWin: existing.remoteWin || item.remoteWin
				};
				this.items.delete(item.url);
				this.items.set(item.url, updated);
				this.events.updated.dispatch();
				return false;
			}
			this.items.set(item.url, item);
			this.enforceLimit();
			this.events.itemAdded.dispatch(item);
			this.events.updated.dispatch();
			return true;
		}
		enforceLimit() {
			while (this.items.size > CACHE.DB_MAX) {
				const first = this.items.keys().next().value;
				if (first === void 0) break;
				this.items.delete(first);
			}
		}
		get validCount() {
			let n = 0;
			for (const item of this.items.values()) if (item.hlsType !== "invalid" && item.hlsType !== "error") n++;
			return n;
		}
		getAllItems() {
			return Array.from(this.items.values()).reverse();
		}
		filterItems(items) {
			if (!this.excludeSmall) return items;
			return items.filter((item) => item.size == null || item.size >= CFG.SMALL_BYTES);
		}
		getFilteredItems() {
			return this.filterItems(this.getAllItems());
		}
		setExcludeSmall(v) {
			this.excludeSmall = v;
			setSetting(SETTINGS_KEYS.EXCLUDE_SMALL, v);
		}
		clear() {
			this.items.clear();
			pruneBlobs(() => true);
			this.events.updated.dispatch();
		}
		trim() {
			this.enforceLimit();
			const now = Date.now();
			const removedUrls = pruneBlobs((url, info) => {
				if (!this.items.has(url)) return true;
				const idle = now - (info.ts || 0);
				return !!(info.revoked && idle > CACHE.CLEAR_MS);
			});
			for (const href of removedUrls) if (this.items.has(href)) this.items.delete(href);
		}
	};
	var state = new AppState();
	if (CFG.IS_TOP) {
		setInterval(() => state.trim(), CACHE.CLEAR_MS);
		window.addEventListener("pagehide", () => state.trim());
		window.addEventListener("beforeunload", () => state.trim());
	}
	var PATTERNS = {
		http: /^https?:/i,
		blob: /^blob:/i,
		m3u8: /\.m3u8(\b|[?#]|$)/i,
		video: /\.(mp4|mkv|webm|avi|mov|m4v|flv|ogv|ogg)([?#]|$)/i,
		segment: /\.(m4s|init|seg|fmp4|ts|m2ts)([?#]|$)/i,
		m3u8Type: /mpegurl|vnd\.apple\.mpegurl|application\/x-mpegurl/i,
		videoType: /^video\//i,
		videoTypeAlt: /(matroska|mp4|webm|quicktime)/i,
		resolutionCombined: /(?:^|[_\-\/])(\d{3,4})([px])(\d{3,4})?(?:[_\-\/\.]|$)|resolution[=_]?(\d{3,4})|quality[=_]?(\d{3,4})|[_\-]hd(\d{3,4})|(\d{3,4})\.m3u8/i,
		hlsMaster: /master|index|manifest|playlist\.m3u8/i,
		hlsMedia: /chunklist|media|video|segment|quality|stream_\d|_\d{3,4}p?\./i
	};
	var isHttp = (u) => typeof u === "string" && PATTERNS.http.test(u);
	var isBlob = (u) => typeof u === "string" && PATTERNS.blob.test(u);
	var isM3U8Url = (u) => PATTERNS.m3u8.test(u || "");
	var isVideoUrl = (u) => PATTERNS.video.test(u || "");
	var isSegmentUrl = (u) => PATTERNS.segment.test(u || "");
	var looksM3U8Type = (t) => PATTERNS.m3u8Type.test(t || "");
	var looksVideoType = (t) => PATTERNS.videoType.test(t || "") || PATTERNS.videoTypeAlt.test(t || "");
	function safeAbsUrl(url, base) {
		try {
			return new URL(url, base).href;
		} catch {
			return url;
		}
	}
	var SIZE_UNITS = [
		"B",
		"KB",
		"MB",
		"GB",
		"TB"
	];
	function formatBytes(n) {
		if (n == null) return "";
		let i = 0;
		let v = n;
		while (v >= 1024 && i < SIZE_UNITS.length - 1) {
			v /= 1024;
			i++;
		}
		const decimals = v < 10 && i > 0 ? 1 : 0;
		return `${v.toFixed(decimals)} ${SIZE_UNITS[i]}`;
	}
	function formatDuration(seconds) {
		if (!seconds || seconds <= 0) return null;
		const h = Math.floor(seconds / 3600);
		const m = Math.floor(seconds % 3600 / 60);
		const s = Math.floor(seconds % 60);
		const pad = (n) => String(n).padStart(2, "0");
		return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
	}
	document.createElement("div");
	function shortId() {
		return Math.random().toString(36).slice(2);
	}
	var SERIALIZABLE_KEYS = [
		"url",
		"kind",
		"label",
		"sublabel",
		"size",
		"type",
		"origin",
		"pageTitle",
		"enriched",
		"enriching",
		"hlsType",
		"isLive",
		"encrypted",
		"duration",
		"segCount",
		"resolution",
		"isVod",
		"isFmp4",
		"variantCount",
		"variants",
		"bestVariant",
		"variant"
	];
	function serializeMediaItem(item) {
		const result = {};
		for (const key of SERIALIZABLE_KEYS) if (item[key] !== void 0) result[key] = item[key];
		return result;
	}
	function parseRange(v) {
		if (!v) return null;
		const m = /bytes=(\d+)-(\d+)?/i.exec(v);
		if (!m) return null;
		return {
			start: +m[1],
			end: m[2] != null ? +m[2] : null
		};
	}
	function lruGet(map, key) {
		if (!map.has(key)) return void 0;
		const v = map.get(key);
		map.delete(key);
		map.set(key, v);
		return v;
	}
	function lruSet(map, key, val, max) {
		if (map.has(key)) map.delete(key);
		map.set(key, val);
		if (typeof max === "number" && isFinite(max)) while (map.size > max) {
			const first = map.keys().next().value;
			if (first !== void 0) map.delete(first);
		}
	}
	function once(cache, inflight, key, loader, max) {
		const cached = lruGet(cache, key);
		if (cached !== void 0) return Promise.resolve(cached);
		if (inflight.has(key)) return inflight.get(key);
		const p = (async () => {
			try {
				const v = await loader();
				lruSet(cache, key, v, max);
				return v;
			} finally {
				inflight.delete(key);
			}
		})();
		inflight.set(key, p);
		return p;
	}
	function cleanFilename(s) {
		return (s || "video").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120).trim() || "video";
	}
	var EXT_MAP = {
		webm: "webm",
		matroska: "mkv",
		mkv: "mkv",
		quicktime: "mov",
		mov: "mov",
		mp2t: "ts",
		mpegts: "ts",
		ogg: "ogg",
		mp4: "mp4"
	};
	function extFromType(t) {
		const lc = t.toLowerCase();
		for (const [key, ext] of Object.entries(EXT_MAP)) if (lc.includes(key)) return ext;
		return "mp4";
	}
	function guessExt(url, type) {
		const m = /(?:\.([a-z0-9]+))([?#]|$)/i.exec(url || "");
		if (m) return m[1].toLowerCase();
		return type ? extFromType(type) : "mp4";
	}
	function generateFilename(options) {
		let base;
		if (options.urlPath) {
			const m = /([^/?#]+)\.[a-z0-9]+(?:[?#]|$)/i.exec(options.urlPath);
			if (m) base = cleanFilename(m[1]);
		}
		if (!base) base = cleanFilename(options.title || document.title);
		const qualSuffix = options.quality ? `_${options.quality}` : "";
		const ext = options.ext || "mp4";
		return `${base}${qualSuffix}.${ext}`;
	}
	function sortVariantsByQuality(variants) {
		return [...variants].sort((a, b) => (b.h || 0) - (a.h || 0) || (b.avg || b.peak || 0) - (a.avg || a.peak || 0));
	}
	function buildLabel(parts) {
		const items = [];
		if (parts.resolution) items.push(parts.resolution);
		if (parts.bitrate) items.push(`${Math.round(parts.bitrate / 1e3)}k`);
		if (parts.duration && parts.duration > 0) {
			const dur = formatDuration(parts.duration);
			if (dur) items.push(dur);
		}
		if (parts.size != null) items.push(`~${formatBytes(parts.size)}`);
		if (parts.extra) items.push(...parts.extra);
		return items.length > 0 ? items.join(" • ") : "Video Stream";
	}
	function buildSublabel(segCount, isFmp4) {
		return `${segCount} segments • ${isFmp4 ? "fMP4" : "TS"}`;
	}
	function extractResFromUrl(url) {
		if (!url) return null;
		const m = PATTERNS.resolutionCombined.exec(url);
		if (m) {
			if (m[1]) {
				const w = parseInt(m[1], 10);
				const sep = m[2];
				const hStr = m[3];
				if (sep === "x" && hStr) return `${w}x${hStr}`;
				if (w >= 144 && w <= 4320) return `${w}p`;
			}
			const val = m[4] || m[5] || m[6] || m[7];
			if (val) {
				const h = parseInt(val, 10);
				if (h >= 144 && h <= 4320) return `${h}p`;
			}
		}
		return null;
	}
	var skipDetectionBlobs = new WeakSet();
	var internalBlobUrls = new Set();
	function createInternalBlobUrl(blob) {
		skipDetectionBlobs.add(blob);
		const url = URL.createObjectURL(blob);
		internalBlobUrls.add(url);
		return url;
	}
	function getBlobInfo(url, registry) {
		if (!isBlob(url)) return null;
		const info = registry.get(url);
		if (!info) return null;
		info.ts = Date.now();
		return info;
	}
	function getBlobSlice(blob, rangeHeader) {
		if (!rangeHeader) return blob;
		const range = parseRange(rangeHeader);
		if (!range) return blob;
		return blob.slice(range.start, range.end == null ? blob.size : range.end + 1);
	}
	function getErrorMessage(e) {
		if (e instanceof Error) return e.message;
		if (typeof e === "string") return e;
		return String(e);
	}
	function alertError(e, prefix) {
		const msg = getErrorMessage(e);
		alert(prefix ? `${prefix}: ${msg}` : msg);
	}
	var onDetect = null;
	var earlyDetections = [];
	var recentlyRevoked = new Set();
	setInterval(() => {
		if (recentlyRevoked.size > 0) recentlyRevoked.clear();
	}, CACHE.CLEAR_MS);
	function setDetectionCallback(cb) {
		onDetect = cb;
		if (earlyDetections.length > 0) {
			const pending = [...earlyDetections];
			earlyDetections.length = 0;
			pending.forEach(({ url, metadata }) => cb(url, metadata));
		}
	}
	function checkContent(content) {
		if (typeof content !== "string") return false;
		return /^\s*#EXTM3U/i.test(content);
	}
	function extractEpisodeFromUrl(url) {
		const targetUrl = url || window.location.href;
		for (const pattern of [
			/[#?&]ep(?:isode)?[=:](\d+)/i,
			/\/ep(?:isode)?[-_]?(\d+)/i,
			/\/e(\d+)(?:[^a-z0-9]|$)/i,
			/[-_]ep(?:isode)?[-_]?(\d+)/i,
			/[-_](\d{1,3})(?:[^0-9]|$)/
		]) {
			const match = targetUrl.match(pattern);
			if (match?.[1]) return `Episode ${match[1]}`;
		}
		return null;
	}
	function buildEnhancedTitle() {
		const baseTitle = document.title;
		const episodeInfo = extractEpisodeFromUrl();
		if (episodeInfo && !/episode\s*\d+/i.test(baseTitle)) return `${baseTitle} • ${episodeInfo}`;
		return baseTitle;
	}
	function emitDetection(url, metadata) {
		const meta = {
			...metadata,
			pageTitle: metadata?.pageTitle || buildEnhancedTitle()
		};
		if (onDetect) onDetect(url, meta);
		else earlyDetections.push({
			url,
			metadata: meta
		});
	}
	function hookCreateObjectURL() {
		const original = URL.createObjectURL;
		URL.createObjectURL = function(obj) {
			const href = original.call(this, obj);
			try {
				if (obj instanceof Blob && skipDetectionBlobs.has(obj)) {
					skipDetectionBlobs.delete(obj);
					return href;
				}
				if (internalBlobUrls.has(href)) return href;
				const now = Date.now();
				if (obj instanceof Blob) {
					const type = obj.type || "";
					const info = {
						blob: obj,
						type,
						size: obj.size,
						kind: "other",
						ts: now
					};
					if (looksM3U8Type(type)) {
						info.kind = "m3u8";
						blobRegistry.set(href, info);
						emitDetection(href);
					} else if (looksVideoType(type)) {
						info.kind = "video";
						blobRegistry.set(href, info);
						emitDetection(href);
					} else if (/octet-stream|text\/plain|^$/.test(type) && obj.size > 0 && obj.size < 5242880) obj.slice(0, Math.min(2048, obj.size)).text().then((text) => {
						if (checkContent(text)) {
							if (!recentlyRevoked.has(href)) {
								info.kind = "m3u8";
								blobRegistry.set(href, info);
								emitDetection(href);
							}
						}
					}).catch(() => {});
				}
			} catch (e) {
				console.error("[SG] createObjectURL hook error:", e);
			}
			return href;
		};
	}
	function hookRevokeObjectURL() {
		const original = URL.revokeObjectURL;
		URL.revokeObjectURL = function(href) {
			try {
				const info = blobRegistry.get(href);
				if (info) {
					info.revoked = true;
					info.ts = Date.now();
				} else recentlyRevoked.add(href);
			} catch {}
			return original.call(this, href);
		};
	}
	function hookFetch() {
		const originalFetch = window.fetch;
		const originalResText = window.Response.prototype.text;
		if (typeof originalFetch !== "function") return;
		window.Response.prototype.text = function() {
			const response = this;
			return originalResText.call(this).then((text) => {
				try {
					if (checkContent(text)) emitDetection(response.url);
				} catch (e) {
					console.error("[SG] Detection error in Response.text:", e);
				}
				return text;
			});
		};
		window.fetch = function(...args) {
			try {
				const input = args[0];
				const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
				if (url) emitDetection(url);
			} catch {}
			return originalFetch.apply(this, args);
		};
	}
	function hookXHR() {
		const original = XMLHttpRequest.prototype.open;
		XMLHttpRequest.prototype.open = function(method, url, ...rest) {
			try {
				const urlStr = typeof url === "string" ? url : url?.href;
				if (urlStr) emitDetection(urlStr);
			} catch {}
			const result = original.call(this, method, url, ...rest);
			this.addEventListener("load", () => {
				try {
					if (!this.responseType || this.responseType === "text") {
						const content = this.responseText;
						const targetUrl = typeof url === "string" ? url : url?.href;
						if (targetUrl && checkContent(content)) emitDetection(targetUrl);
					}
				} catch {}
			});
			return result;
		};
	}
	function hookPerformanceObserver() {
		try {
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) if ("name" in entry && typeof entry.name === "string") emitDetection(entry.name);
			}).observe({ entryTypes: ["resource"] });
		} catch {}
	}
	var hooksInstalled = false;
	function installHooks() {
		if (hooksInstalled) return;
		hooksInstalled = true;
		hookCreateObjectURL();
		hookRevokeObjectURL();
		hookFetch();
		hookXHR();
		hookPerformanceObserver();
	}
	var onScan = () => {};
	function setScanCallback(cb) {
		onScan = cb;
	}
	function watchVideo(video) {
		if (state.watchedVideos.has(video)) return;
		state.watchedVideos.add(video);
		const emitSources = () => {
			[video.currentSrc || video.src, ...Array.from(video.querySelectorAll("source")).map((s) => s.src)].filter(Boolean).forEach(onScan);
		};
		[
			"loadstart",
			"loadedmetadata",
			"canplay"
		].forEach((ev) => video.addEventListener(ev, emitSources));
		emitSources();
	}
	function scanVideos() {
		document.querySelectorAll("video").forEach((v) => watchVideo(v));
	}
	var observer = null;
	var debounceTimer;
	function startVideoObserver() {
		if (observer) return;
		observer = new MutationObserver(() => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = window.setTimeout(() => {
				scanVideos();
				debounceTimer = void 0;
			}, 1e3);
		});
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
	var pendingUrls$1 = new Set();
	function debounceDetect(url, callback) {
		if (pendingUrls$1.has(url)) return;
		pendingUrls$1.add(url);
		setTimeout(() => {
			pendingUrls$1.delete(url);
			callback(url);
		}, CFG.DETECT_DEBOUNCE);
	}
	function createMediaItem(url, kind, metadata = {}) {
		const { size = null, type = null, pageTitle } = metadata;
		let label;
		if (kind === "hls") {
			const res = extractResFromUrl(url);
			label = res ? `${res} • Analyzing...` : "Analyzing...";
		} else label = guessExt(url, type).toUpperCase();
		return {
			url,
			kind,
			label,
			sublabel: null,
			size,
			type,
			origin: document.location.origin,
			pageTitle,
			enriched: false,
			enriching: false,
			hlsType: null,
			isLive: false,
			encrypted: false,
			_enrichPromise: null
		};
	}
	var onItemDetected = () => {};
	function setItemDetectedCallback(cb) {
		onItemDetected = cb;
	}
	function processUrl(url, metadata) {
		try {
			if (!url || !isHttp(url) && !isBlob(url)) return;
			if (isSegmentUrl(url)) return;
			const lowerUrl = url.toLowerCase();
			if (lowerUrl.includes("ping.gif") || lowerUrl.includes("jwpltx.com") || lowerUrl.includes("doubleclick") || lowerUrl.includes("analytics") || lowerUrl.includes("/stats/")) return;
			if (state.hasItem(url)) return;
			let size = metadata?.size ?? null;
			let type = metadata?.type ?? null;
			const pageTitle = metadata?.pageTitle;
			if (isBlob(url)) {
				const info = blobRegistry.get(url);
				if (info) {
					size = size ?? info.size;
					type = type ?? info.type;
				}
				if (size != null && size < 524288 && info?.kind !== "m3u8") return;
			}
			const isHls = isM3U8Url(url) || isBlob(url) && blobRegistry.get(url)?.kind === "m3u8";
			const isVideo = isVideoUrl(url) || isBlob(url) && blobRegistry.get(url)?.kind === "video";
			const kind = isHls ? "hls" : isVideo ? "video" : null;
			if (!kind) return;
			const item = createMediaItem(url, kind, {
				size,
				type,
				pageTitle
			});
			if (state.addItem(item)) onItemDetected(item);
		} catch (e) {
			console.error("[SG] processUrl error:", e);
		}
	}
	var initialized = false;
	function initDetection() {
		if (initialized) return;
		initialized = true;
		setDetectionCallback((url, metadata) => debounceDetect(url, (u) => processUrl(u, metadata)));
		setScanCallback((url) => debounceDetect(url, (u) => processUrl(u)));
		installHooks();
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => {
			scanVideos();
			startVideoObserver();
		});
		else {
			scanVideos();
			startVideoObserver();
		}
	}
	var import_eventemitter3 = __toESM(__commonJSMin(((exports, module) => {
		var has = Object.prototype.hasOwnProperty;
		var prefix = "~";
		function Events() {}
		if (Object.create) {
			Events.prototype = Object.create(null);
			if (!new Events().__proto__) prefix = false;
		}
		function EE(fn, context, once) {
			this.fn = fn;
			this.context = context;
			this.once = once || false;
		}
		function addListener(emitter, event, fn, context, once) {
			if (typeof fn !== "function") throw new TypeError("The listener must be a function");
			var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
			if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
			else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
			else emitter._events[evt] = [emitter._events[evt], listener];
			return emitter;
		}
		function clearEvent(emitter, evt) {
			if (--emitter._eventsCount === 0) emitter._events = new Events();
			else delete emitter._events[evt];
		}
		function EventEmitter() {
			this._events = new Events();
			this._eventsCount = 0;
		}
		EventEmitter.prototype.eventNames = function eventNames() {
			var names = [], events, name;
			if (this._eventsCount === 0) return names;
			for (name in events = this._events) if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
			if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
			return names;
		};
		EventEmitter.prototype.listeners = function listeners(event) {
			var evt = prefix ? prefix + event : event, handlers = this._events[evt];
			if (!handlers) return [];
			if (handlers.fn) return [handlers.fn];
			for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
			return ee;
		};
		EventEmitter.prototype.listenerCount = function listenerCount(event) {
			var evt = prefix ? prefix + event : event, listeners = this._events[evt];
			if (!listeners) return 0;
			if (listeners.fn) return 1;
			return listeners.length;
		};
		EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
			var evt = prefix ? prefix + event : event;
			if (!this._events[evt]) return false;
			var listeners = this._events[evt], len = arguments.length, args, i;
			if (listeners.fn) {
				if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
				switch (len) {
					case 1: return listeners.fn.call(listeners.context), true;
					case 2: return listeners.fn.call(listeners.context, a1), true;
					case 3: return listeners.fn.call(listeners.context, a1, a2), true;
					case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
					case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
					case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
				}
				for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
				listeners.fn.apply(listeners.context, args);
			} else {
				var length = listeners.length, j;
				for (i = 0; i < length; i++) {
					if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
					switch (len) {
						case 1:
							listeners[i].fn.call(listeners[i].context);
							break;
						case 2:
							listeners[i].fn.call(listeners[i].context, a1);
							break;
						case 3:
							listeners[i].fn.call(listeners[i].context, a1, a2);
							break;
						case 4:
							listeners[i].fn.call(listeners[i].context, a1, a2, a3);
							break;
						default:
							if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
							listeners[i].fn.apply(listeners[i].context, args);
					}
				}
			}
			return true;
		};
		EventEmitter.prototype.on = function on(event, fn, context) {
			return addListener(this, event, fn, context, false);
		};
		EventEmitter.prototype.once = function once(event, fn, context) {
			return addListener(this, event, fn, context, true);
		};
		EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
			var evt = prefix ? prefix + event : event;
			if (!this._events[evt]) return this;
			if (!fn) {
				clearEvent(this, evt);
				return this;
			}
			var listeners = this._events[evt];
			if (listeners.fn) {
				if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) clearEvent(this, evt);
			} else {
				for (var i = 0, events = [], length = listeners.length; i < length; i++) if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) events.push(listeners[i]);
				if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
				else clearEvent(this, evt);
			}
			return this;
		};
		EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
			var evt;
			if (event) {
				evt = prefix ? prefix + event : event;
				if (this._events[evt]) clearEvent(this, evt);
			} else {
				this._events = new Events();
				this._eventsCount = 0;
			}
			return this;
		};
		EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
		EventEmitter.prototype.addListener = EventEmitter.prototype.on;
		EventEmitter.prefixed = prefix;
		EventEmitter.EventEmitter = EventEmitter;
		if ("undefined" !== typeof module) module.exports = EventEmitter;
	}))(), 1);
	var TimeoutError = class TimeoutError extends Error {
		name = "TimeoutError";
		constructor(message, options) {
			super(message, options);
			Error.captureStackTrace?.(this, TimeoutError);
		}
	};
	var getAbortedReason = (signal) => signal.reason ?? new DOMException("This operation was aborted.", "AbortError");
	function pTimeout(promise, options) {
		const { milliseconds, fallback, message, customTimers = {
			setTimeout,
			clearTimeout
		}, signal } = options;
		let timer;
		let abortHandler;
		const cancelablePromise = new Promise((resolve, reject) => {
			if (typeof milliseconds !== "number" || Math.sign(milliseconds) !== 1) throw new TypeError(`Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``);
			if (signal?.aborted) {
				reject(getAbortedReason(signal));
				promise.then(resolve, reject);
				return;
			}
			if (signal) {
				abortHandler = () => {
					reject(getAbortedReason(signal));
				};
				signal.addEventListener("abort", abortHandler, { once: true });
			}
			promise.then(resolve, reject);
			if (milliseconds === Number.POSITIVE_INFINITY) return;
			const timeoutError = new TimeoutError();
			timer = customTimers.setTimeout.call(void 0, () => {
				if (fallback) {
					try {
						resolve(fallback());
					} catch (error) {
						reject(error);
					}
					return;
				}
				if (typeof promise.cancel === "function") promise.cancel();
				if (message === false) resolve();
				else if (message instanceof Error) reject(message);
				else {
					timeoutError.message = message ?? `Promise timed out after ${milliseconds} milliseconds`;
					reject(timeoutError);
				}
			}, milliseconds);
		}).finally(() => {
			cancelablePromise.clear();
			if (abortHandler && signal) signal.removeEventListener("abort", abortHandler);
		});
		cancelablePromise.clear = () => {
			customTimers.clearTimeout.call(void 0, timer);
			timer = void 0;
		};
		return cancelablePromise;
	}
	function lowerBound(array, value, comparator) {
		let first = 0;
		let count = array.length;
		while (count > 0) {
			const step = Math.trunc(count / 2);
			let it = first + step;
			if (comparator(array[it], value) <= 0) {
				first = ++it;
				count -= step + 1;
			} else count = step;
		}
		return first;
	}
	var compactionThreshold = 100;
	var PriorityQueue = class {
		#queue = [];
		#head = 0;
		enqueue(run, options) {
			const { priority = 0, id } = options ?? {};
			const { size } = this;
			const element = {
				priority,
				id,
				run
			};
			if (size === 0) {
				this.#queue.length = 0;
				this.#head = 0;
				this.#queue.push(element);
				return;
			}
			if (this.#queue.at(-1).priority >= priority) {
				this.#queue.push(element);
				return;
			}
			this.#compact();
			const index = lowerBound(this.#queue, element, (a, b) => b.priority - a.priority);
			this.#queue.splice(index, 0, element);
		}
		setPriority(id, priority) {
			const index = this.#queue.findIndex((element, index) => index >= this.#head && element.id === id);
			if (index === -1) throw new ReferenceError(`No promise function with the id "${id}" exists in the queue.`);
			const [item] = this.#queue.splice(index, 1);
			this.enqueue(item.run, {
				priority,
				id
			});
		}
		remove(idOrRun) {
			const index = this.#queue.findIndex((element, index) => {
				if (index < this.#head) return false;
				if (typeof idOrRun === "string") return element.id === idOrRun;
				return element.run === idOrRun;
			});
			if (index !== -1) this.#queue.splice(index, 1);
		}
		dequeue() {
			if (this.#head === this.#queue.length) return;
			const item = this.#queue[this.#head];
			this.#head++;
			if (this.#head === this.#queue.length) {
				this.#queue.length = 0;
				this.#head = 0;
			} else if (this.#head > compactionThreshold && this.#head > this.#queue.length / 2) this.#compact();
			return item?.run;
		}
		filter(options) {
			const result = [];
			for (let index = this.#head; index < this.#queue.length; index++) {
				const element = this.#queue[index];
				if (element.priority === options.priority) result.push(element.run);
			}
			return result;
		}
		get size() {
			return this.#queue.length - this.#head;
		}
		#compact() {
			if (this.#head === 0) return;
			this.#queue.splice(0, this.#head);
			this.#head = 0;
		}
	};
	var PQueue = class extends import_eventemitter3.default {
		#carryoverIntervalCount;
		#isIntervalIgnored;
		#intervalCount = 0;
		#intervalCap;
		#rateLimitedInInterval = false;
		#rateLimitFlushScheduled = false;
		#interval;
		#intervalEnd = 0;
		#intervalId;
		#timeoutId;
		#strict;
		#strictTicks = [];
		#strictTicksStartIndex = 0;
		#queue;
		#queueClass;
		#pending = 0;
		#concurrency;
		#isPaused;
		#idAssigner = 1n;
		#runningTasks = new Map();
		#queueAbortListenerCleanupFunctions = new Set();
		timeout;
		constructor(options) {
			super();
			options = {
				carryoverIntervalCount: false,
				intervalCap: Number.POSITIVE_INFINITY,
				interval: 0,
				concurrency: Number.POSITIVE_INFINITY,
				autoStart: true,
				queueClass: PriorityQueue,
				strict: false,
				...options
			};
			if (!(typeof options.intervalCap === "number" && options.intervalCap >= 1)) throw new TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${options.intervalCap?.toString() ?? ""}\` (${typeof options.intervalCap})`);
			if (options.interval === void 0 || !(Number.isFinite(options.interval) && options.interval >= 0)) throw new TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${options.interval?.toString() ?? ""}\` (${typeof options.interval})`);
			if (options.strict && options.interval === 0) throw new TypeError("The `strict` option requires a non-zero `interval`");
			if (options.strict && options.intervalCap === Number.POSITIVE_INFINITY) throw new TypeError("The `strict` option requires a finite `intervalCap`");
			this.#carryoverIntervalCount = options.carryoverIntervalCount ?? options.carryoverConcurrencyCount ?? false;
			this.#isIntervalIgnored = options.intervalCap === Number.POSITIVE_INFINITY || options.interval === 0;
			this.#intervalCap = options.intervalCap;
			this.#interval = options.interval;
			this.#strict = options.strict;
			this.#queue = new options.queueClass();
			this.#queueClass = options.queueClass;
			this.concurrency = options.concurrency;
			if (options.timeout !== void 0 && !(Number.isFinite(options.timeout) && options.timeout > 0)) throw new TypeError(`Expected \`timeout\` to be a positive finite number, got \`${options.timeout}\` (${typeof options.timeout})`);
			this.timeout = options.timeout;
			this.#isPaused = options.autoStart === false;
			this.#setupRateLimitTracking();
		}
		#cleanupStrictTicks(now) {
			while (this.#strictTicksStartIndex < this.#strictTicks.length) {
				const oldestTick = this.#strictTicks[this.#strictTicksStartIndex];
				if (oldestTick !== void 0 && now - oldestTick >= this.#interval) this.#strictTicksStartIndex++;
				else break;
			}
			if (this.#strictTicksStartIndex > 100 && this.#strictTicksStartIndex > this.#strictTicks.length / 2 || this.#strictTicksStartIndex === this.#strictTicks.length) {
				this.#strictTicks = this.#strictTicks.slice(this.#strictTicksStartIndex);
				this.#strictTicksStartIndex = 0;
			}
		}
		#consumeIntervalSlot(now) {
			if (this.#strict) this.#strictTicks.push(now);
			else this.#intervalCount++;
		}
		#rollbackIntervalSlot() {
			if (this.#strict) {
				if (this.#strictTicks.length > this.#strictTicksStartIndex) this.#strictTicks.pop();
			} else if (this.#intervalCount > 0) this.#intervalCount--;
		}
		#getActiveTicksCount() {
			return this.#strictTicks.length - this.#strictTicksStartIndex;
		}
		get #doesIntervalAllowAnother() {
			if (this.#isIntervalIgnored) return true;
			if (this.#strict) return this.#getActiveTicksCount() < this.#intervalCap;
			return this.#intervalCount < this.#intervalCap;
		}
		get #doesConcurrentAllowAnother() {
			return this.#pending < this.#concurrency;
		}
		#next() {
			this.#pending--;
			if (this.#pending === 0) this.emit("pendingZero");
			this.#tryToStartAnother();
			this.emit("next");
		}
		#onResumeInterval() {
			this.#timeoutId = void 0;
			this.#onInterval();
			this.#initializeIntervalIfNeeded();
		}
		#isIntervalPausedAt(now) {
			if (this.#strict) {
				this.#cleanupStrictTicks(now);
				if (this.#getActiveTicksCount() >= this.#intervalCap) {
					const oldestTick = this.#strictTicks[this.#strictTicksStartIndex];
					const delay = this.#interval - (now - oldestTick);
					this.#createIntervalTimeout(delay);
					return true;
				}
				return false;
			}
			if (this.#intervalId === void 0) {
				const delay = this.#intervalEnd - now;
				if (delay < 0) this.#intervalCount = this.#carryoverIntervalCount ? this.#pending : 0;
				else {
					this.#createIntervalTimeout(delay);
					return true;
				}
			}
			return false;
		}
		#createIntervalTimeout(delay) {
			if (this.#timeoutId !== void 0) return;
			this.#timeoutId = setTimeout(() => {
				this.#onResumeInterval();
			}, delay);
		}
		#clearIntervalTimer() {
			if (this.#intervalId) {
				clearInterval(this.#intervalId);
				this.#intervalId = void 0;
			}
		}
		#clearTimeoutTimer() {
			if (this.#timeoutId) {
				clearTimeout(this.#timeoutId);
				this.#timeoutId = void 0;
			}
		}
		#tryToStartAnother() {
			if (this.#queue.size === 0) {
				this.#clearIntervalTimer();
				this.emit("empty");
				if (this.#pending === 0) {
					this.#clearTimeoutTimer();
					if (this.#strict && this.#strictTicksStartIndex > 0) {
						const now = Date.now();
						this.#cleanupStrictTicks(now);
					}
					this.emit("idle");
				}
				return false;
			}
			let taskStarted = false;
			if (!this.#isPaused) {
				const now = Date.now();
				const canInitializeInterval = !this.#isIntervalPausedAt(now);
				if (this.#doesIntervalAllowAnother && this.#doesConcurrentAllowAnother) {
					const job = this.#queue.dequeue();
					if (!this.#isIntervalIgnored) {
						this.#consumeIntervalSlot(now);
						this.#scheduleRateLimitUpdate();
					}
					if (canInitializeInterval) this.#initializeIntervalIfNeeded();
					this.emit("active");
					job();
					taskStarted = true;
				}
			}
			return taskStarted;
		}
		#initializeIntervalIfNeeded() {
			if (this.#isIntervalIgnored || this.#intervalId !== void 0) return;
			if (this.#strict) return;
			this.#intervalId = setInterval(() => {
				this.#onInterval();
			}, this.#interval);
			this.#intervalEnd = Date.now() + this.#interval;
		}
		#onInterval() {
			if (!this.#strict) {
				if (this.#intervalId !== void 0) {
					if (this.#intervalCount === 0 && this.#pending === 0) this.#clearIntervalTimer();
					else this.#intervalEnd = Date.now() + this.#interval;
				}
				this.#intervalCount = this.#carryoverIntervalCount ? this.#pending : 0;
			}
			this.#processQueue();
			this.#scheduleRateLimitUpdate();
		}
		#processQueue() {
			while (this.#tryToStartAnother());
		}
		get concurrency() {
			return this.#concurrency;
		}
		set concurrency(newConcurrency) {
			if (!(typeof newConcurrency === "number" && newConcurrency >= 1)) throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${newConcurrency}\` (${typeof newConcurrency})`);
			this.#concurrency = newConcurrency;
			this.#processQueue();
		}
		setPriority(id, priority) {
			if (typeof priority !== "number" || !Number.isFinite(priority)) throw new TypeError(`Expected \`priority\` to be a finite number, got \`${priority}\` (${typeof priority})`);
			this.#queue.setPriority(id, priority);
		}
		async add(function_, options = {}) {
			options = {
				timeout: this.timeout,
				...options,
				id: options.id ?? (this.#idAssigner++).toString()
			};
			if (options.timeout !== void 0 && !(Number.isFinite(options.timeout) && options.timeout > 0)) throw new TypeError(`Expected \`timeout\` to be a positive finite number, got \`${options.timeout}\` (${typeof options.timeout})`);
			return new Promise((resolve, reject) => {
				const taskSymbol = Symbol(`task-${options.id}`);
				let cleanupQueueAbortHandler = () => void 0;
				const run = async () => {
					cleanupQueueAbortHandler();
					this.#pending++;
					this.#runningTasks.set(taskSymbol, {
						id: options.id,
						priority: options.priority ?? 0,
						startTime: Date.now(),
						timeout: options.timeout
					});
					let eventListener;
					try {
						try {
							options.signal?.throwIfAborted();
						} catch (error) {
							this.#rollbackIntervalConsumption();
							this.#runningTasks.delete(taskSymbol);
							throw error;
						}
						let operation = function_({ signal: options.signal });
						if (options.timeout !== void 0) operation = pTimeout(Promise.resolve(operation), {
							milliseconds: options.timeout,
							message: `Task timed out after ${options.timeout}ms (queue has ${this.#pending} running, ${this.#queue.size} waiting)`
						});
						if (options.signal) {
							const { signal } = options;
							operation = Promise.race([operation, new Promise((_resolve, reject) => {
								eventListener = () => {
									reject(signal.reason);
								};
								signal.addEventListener("abort", eventListener, { once: true });
							})]);
						}
						const result = await operation;
						resolve(result);
						this.emit("completed", result);
					} catch (error) {
						reject(error);
						this.emit("error", error);
					} finally {
						if (eventListener) options.signal?.removeEventListener("abort", eventListener);
						this.#runningTasks.delete(taskSymbol);
						queueMicrotask(() => {
							this.#next();
						});
					}
				};
				this.#queue.enqueue(run, options);
				const removeQueuedTask = () => {
					if (this.#queue instanceof PriorityQueue) {
						this.#queue.remove(run);
						return;
					}
					this.#queue.remove?.(options.id);
				};
				if (options.signal) {
					const { signal } = options;
					const queueAbortHandler = () => {
						cleanupQueueAbortHandler();
						removeQueuedTask();
						reject(signal.reason);
						this.#tryToStartAnother();
						this.emit("next");
					};
					cleanupQueueAbortHandler = () => {
						signal.removeEventListener("abort", queueAbortHandler);
						this.#queueAbortListenerCleanupFunctions.delete(cleanupQueueAbortHandler);
					};
					if (signal.aborted) {
						queueAbortHandler();
						return;
					}
					signal.addEventListener("abort", queueAbortHandler, { once: true });
					this.#queueAbortListenerCleanupFunctions.add(cleanupQueueAbortHandler);
				}
				this.emit("add");
				this.#tryToStartAnother();
			});
		}
		async addAll(functions, options) {
			return Promise.all(functions.map(async (function_) => this.add(function_, options)));
		}
		start() {
			if (!this.#isPaused) return this;
			this.#isPaused = false;
			this.#processQueue();
			return this;
		}
		pause() {
			this.#isPaused = true;
		}
		clear() {
			for (const cleanupQueueAbortHandler of this.#queueAbortListenerCleanupFunctions) cleanupQueueAbortHandler();
			this.#queue = new this.#queueClass();
			this.#clearIntervalTimer();
			this.#updateRateLimitState();
			this.emit("empty");
			if (this.#pending === 0) {
				this.#clearTimeoutTimer();
				this.emit("idle");
			}
			this.emit("next");
		}
		async onEmpty() {
			if (this.#queue.size === 0) return;
			await this.#onEvent("empty");
		}
		async onSizeLessThan(limit) {
			if (this.#queue.size < limit) return;
			await this.#onEvent(["next", "active"], () => this.#queue.size < limit);
		}
		async onIdle() {
			if (this.#pending === 0 && this.#queue.size === 0) return;
			await this.#onEvent("idle");
		}
		async onPendingZero() {
			if (this.#pending === 0) return;
			await this.#onEvent("pendingZero");
		}
		async onRateLimit() {
			if (this.isRateLimited) return;
			await this.#onEvent("rateLimit");
		}
		async onRateLimitCleared() {
			if (!this.isRateLimited) return;
			await this.#onEvent("rateLimitCleared");
		}
		onError() {
			return new Promise((_resolve, reject) => {
				const handleError = (error) => {
					this.off("error", handleError);
					reject(error);
				};
				this.on("error", handleError);
			});
		}
		async #onEvent(events, filter) {
			const eventList = Array.isArray(events) ? events : [events];
			return new Promise((resolve) => {
				const listener = () => {
					if (filter && !filter()) return;
					for (const event of eventList) this.off(event, listener);
					resolve();
				};
				for (const event of eventList) this.on(event, listener);
			});
		}
		get size() {
			return this.#queue.size;
		}
		sizeBy(options) {
			return this.#queue.filter(options).length;
		}
		get pending() {
			return this.#pending;
		}
		get isPaused() {
			return this.#isPaused;
		}
		#setupRateLimitTracking() {
			if (this.#isIntervalIgnored) return;
			this.on("add", () => {
				if (this.#queue.size > 0) this.#scheduleRateLimitUpdate();
			});
			this.on("next", () => {
				this.#scheduleRateLimitUpdate();
			});
		}
		#scheduleRateLimitUpdate() {
			if (this.#isIntervalIgnored || this.#rateLimitFlushScheduled) return;
			this.#rateLimitFlushScheduled = true;
			queueMicrotask(() => {
				this.#rateLimitFlushScheduled = false;
				this.#updateRateLimitState();
			});
		}
		#rollbackIntervalConsumption() {
			if (this.#isIntervalIgnored) return;
			this.#rollbackIntervalSlot();
			this.#scheduleRateLimitUpdate();
		}
		#updateRateLimitState() {
			const previous = this.#rateLimitedInInterval;
			if (this.#isIntervalIgnored || this.#queue.size === 0) {
				if (previous) {
					this.#rateLimitedInInterval = false;
					this.emit("rateLimitCleared");
				}
				return;
			}
			let count;
			if (this.#strict) {
				const now = Date.now();
				this.#cleanupStrictTicks(now);
				count = this.#getActiveTicksCount();
			} else count = this.#intervalCount;
			const shouldBeRateLimited = count >= this.#intervalCap;
			if (shouldBeRateLimited !== previous) {
				this.#rateLimitedInInterval = shouldBeRateLimited;
				this.emit(shouldBeRateLimited ? "rateLimit" : "rateLimitCleared");
			}
		}
		get isRateLimited() {
			return this.#rateLimitedInInterval;
		}
		get isSaturated() {
			return this.#pending === this.#concurrency && this.#queue.size > 0 || this.isRateLimited && this.#queue.size > 0;
		}
		get runningTasks() {
			return [...this.#runningTasks.values()].map((task) => ({
				...task,
				timeoutRemaining: task.timeout ? Math.max(0, task.startTime + task.timeout - Date.now()) : void 0
			}));
		}
	};
	var objectToString = Object.prototype.toString;
	var isError = (value) => objectToString.call(value) === "[object Error]";
	var errorMessages = new Set([
		"network error",
		"NetworkError when attempting to fetch resource.",
		"The Internet connection appears to be offline.",
		"Network request failed",
		"fetch failed",
		"terminated",
		" A network error occurred.",
		"Network connection lost"
	]);
	function isNetworkError(error) {
		if (!(error && isError(error) && error.name === "TypeError" && typeof error.message === "string")) return false;
		const { message, stack } = error;
		if (message === "Load failed" || message.startsWith("Load failed (") && message.endsWith(")")) return stack === void 0 || "__sentry_captured__" in error;
		if (message.startsWith("error sending request for url")) return true;
		if (message === "Failed to fetch" || message.startsWith("Failed to fetch (") && message.endsWith(")")) return true;
		return errorMessages.has(message);
	}
	function validateRetries(retries) {
		if (typeof retries === "number") {
			if (retries < 0) throw new TypeError("Expected `retries` to be a non-negative number.");
			if (Number.isNaN(retries)) throw new TypeError("Expected `retries` to be a valid number or Infinity, got NaN.");
			if (Number.isFinite(retries) && !Number.isInteger(retries)) throw new TypeError("Expected `retries` to be a non-negative integer or Infinity.");
		} else if (retries !== void 0) throw new TypeError("Expected `retries` to be a number or Infinity.");
	}
	function validateNumberOption(name, value, { min = 0, allowInfinity = false } = {}) {
		if (value === void 0) return;
		if (typeof value !== "number" || Number.isNaN(value)) throw new TypeError(`Expected \`${name}\` to be a number${allowInfinity ? " or Infinity" : ""}.`);
		if (!allowInfinity && !Number.isFinite(value)) throw new TypeError(`Expected \`${name}\` to be a finite number.`);
		if (value < min) throw new TypeError(`Expected \`${name}\` to be \u2265 ${min}.`);
	}
	function validateFunctionOption(name, value) {
		if (value === void 0) return;
		if (typeof value !== "function") throw new TypeError(`Expected \`${name}\` to be a function.`);
	}
	var AbortError = class extends Error {
		constructor(message) {
			super();
			if (message instanceof Error) {
				this.originalError = message;
				({message} = message);
			} else {
				this.originalError = new Error(message);
				this.originalError.stack = this.stack;
			}
			this.name = "AbortError";
			this.message = message;
		}
	};
	function calculateDelay(retriesConsumed, options) {
		const attempt = Math.max(1, retriesConsumed + 1);
		const random = options.randomize ? Math.random() + 1 : 1;
		let timeout = Math.round(random * options.minTimeout * options.factor ** (attempt - 1));
		timeout = Math.min(timeout, options.maxTimeout);
		return timeout;
	}
	function calculateRemainingTime(start, max) {
		if (!Number.isFinite(max)) return max;
		return max - (performance.now() - start);
	}
	async function delayForRetry(delay, options) {
		if (delay <= 0) return;
		await new Promise((resolve, reject) => {
			const onAbort = () => {
				clearTimeout(timeoutToken);
				options.signal?.removeEventListener("abort", onAbort);
				reject(options.signal.reason);
			};
			const timeoutToken = setTimeout(() => {
				options.signal?.removeEventListener("abort", onAbort);
				resolve();
			}, delay);
			if (options.unref) timeoutToken.unref?.();
			options.signal?.addEventListener("abort", onAbort, { once: true });
		});
	}
	async function onAttemptFailure({ error, attemptNumber, retriesConsumed, startTime, options }) {
		const normalizedError = error instanceof Error ? error : new TypeError(`Non-error was thrown: "${error}". You should only throw errors.`);
		if (normalizedError instanceof AbortError) throw normalizedError.originalError;
		const retriesLeft = Number.isFinite(options.retries) ? Math.max(0, options.retries - retriesConsumed) : options.retries;
		const maxRetryTime = options.maxRetryTime ?? Number.POSITIVE_INFINITY;
		const delayTime = calculateDelay(retriesConsumed, options);
		if (calculateRemainingTime(startTime, maxRetryTime) <= 0) {
			const context = Object.freeze({
				error: normalizedError,
				attemptNumber,
				retriesLeft,
				retriesConsumed,
				retryDelay: 0
			});
			await options.onFailedAttempt(context);
			throw normalizedError;
		}
		const consumeRetryContext = Object.freeze({
			error: normalizedError,
			attemptNumber,
			retriesLeft,
			retriesConsumed,
			retryDelay: retriesLeft > 0 ? delayTime : 0
		});
		const consumeRetry = await options.shouldConsumeRetry(consumeRetryContext);
		const effectiveDelay = consumeRetry && retriesLeft > 0 ? delayTime : 0;
		const context = Object.freeze({
			error: normalizedError,
			attemptNumber,
			retriesLeft,
			retriesConsumed,
			retryDelay: effectiveDelay
		});
		await options.onFailedAttempt(context);
		if (calculateRemainingTime(startTime, maxRetryTime) <= 0) throw normalizedError;
		if (calculateRemainingTime(startTime, maxRetryTime) <= 0 || retriesLeft <= 0) throw normalizedError;
		if (normalizedError instanceof TypeError && !isNetworkError(normalizedError)) throw normalizedError;
		if (!await options.shouldRetry(context)) throw normalizedError;
		const remainingTimeAfterShouldRetry = calculateRemainingTime(startTime, maxRetryTime);
		if (remainingTimeAfterShouldRetry <= 0) throw normalizedError;
		if (!consumeRetry) {
			options.signal?.throwIfAborted();
			return false;
		}
		const finalDelay = Math.min(effectiveDelay, remainingTimeAfterShouldRetry);
		options.signal?.throwIfAborted();
		await delayForRetry(finalDelay, options);
		options.signal?.throwIfAborted();
		return true;
	}
	async function pRetry(input, options = {}) {
		options = { ...options };
		validateRetries(options.retries);
		if (Object.hasOwn(options, "forever")) throw new Error("The `forever` option is no longer supported. For many use-cases, you can set `retries: Infinity` instead.");
		options.retries ??= 10;
		options.factor ??= 2;
		options.minTimeout ??= 1e3;
		options.maxTimeout ??= Number.POSITIVE_INFINITY;
		options.maxRetryTime ??= Number.POSITIVE_INFINITY;
		options.randomize ??= false;
		options.onFailedAttempt ??= () => {};
		options.shouldRetry ??= () => true;
		options.shouldConsumeRetry ??= () => true;
		validateFunctionOption("onFailedAttempt", options.onFailedAttempt);
		validateFunctionOption("shouldRetry", options.shouldRetry);
		validateFunctionOption("shouldConsumeRetry", options.shouldConsumeRetry);
		validateNumberOption("factor", options.factor, {
			min: 0,
			allowInfinity: false
		});
		validateNumberOption("minTimeout", options.minTimeout, {
			min: 0,
			allowInfinity: false
		});
		validateNumberOption("maxTimeout", options.maxTimeout, {
			min: 0,
			allowInfinity: true
		});
		validateNumberOption("maxRetryTime", options.maxRetryTime, {
			min: 0,
			allowInfinity: true
		});
		if (!(options.factor > 0)) options.factor = 1;
		options.signal?.throwIfAborted();
		let attemptNumber = 0;
		let retriesConsumed = 0;
		const startTime = performance.now();
		while (Number.isFinite(options.retries) ? retriesConsumed <= options.retries : true) {
			attemptNumber++;
			try {
				options.signal?.throwIfAborted();
				const result = await input(attemptNumber);
				options.signal?.throwIfAborted();
				return result;
			} catch (error) {
				if (await onAttemptFailure({
					error,
					attemptNumber,
					retriesConsumed,
					startTime,
					options
				})) retriesConsumed++;
			}
		}
		throw new Error("Retry attempts exhausted without throwing an error.");
	}
	var textCache = new Map();
	var textInflight = new Map();
	function gmGet(opts) {
		return new Promise((resolve, reject) => {
			const onAbort = () => reject(new Error("Aborted"));
			if (opts.signal) {
				if (opts.signal.aborted) return onAbort();
				opts.signal.addEventListener("abort", onAbort, { once: true });
			}
			const cleanup = () => {
				if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
			};
			const req = GM_xmlhttpRequest({
				method: "GET",
				url: opts.url,
				responseType: opts.responseType,
				headers: opts.headers || {},
				timeout: opts.timeout ?? CFG.REQUEST_TIMEOUT,
				onprogress: (e) => opts.onprogress?.({
					loaded: e.loaded,
					total: e.total
				}),
				onload: (r) => {
					cleanup();
					if (r.status >= 200 && r.status < 300) resolve(r.response);
					else reject(new Error(`HTTP ${r.status}`));
				},
				onerror: () => {
					cleanup();
					reject(new Error("Network error"));
				},
				ontimeout: () => {
					cleanup();
					reject(new Error("Timeout"));
				},
				onabort: () => {
					cleanup();
					reject(new Error("Aborted"));
				}
			});
			if (opts.signal) opts.signal.addEventListener("abort", () => req.abort(), { once: true });
		});
	}
	async function fetchText(url, signal) {
		const blobInfo = getBlobInfo(url, blobRegistry);
		if (blobInfo) {
			if (!blobInfo.blob) throw new Error("Blob not found");
			return blobInfo.blob.text();
		}
		return pRetry((attempt) => {
			if (signal?.aborted) throw new Error("Aborted");
			return gmGet({
				url,
				responseType: "text",
				timeout: CFG.MANIFEST_TIMEOUT,
				signal
			});
		}, {
			retries: CFG.RETRIES,
			onFailedAttempt: (e) => {
				if (signal?.aborted) throw new Error("Aborted");
				console.warn(`[SG] Fetch text failed (attempt ${e.attemptNumber}): ${e.error.message}`);
			},
			signal
		});
	}
	function getText(url, signal) {
		return once(textCache, textInflight, url, () => fetchText(url, signal), CACHE.TEXT_MAX);
	}
	var BlobStrategy = class {
		async fetch(url, options) {
			const blobInfo = getBlobInfo(url, blobRegistry);
			if (!blobInfo || !blobInfo.blob) throw new Error("Blob not found");
			if (options.signal?.aborted) throw new Error("Aborted");
			const part = getBlobSlice(blobInfo.blob, options.headers?.Range);
			if (options.onprogress) setTimeout(() => {
				if (!options.signal?.aborted) options.onprogress({
					loaded: part.size,
					total: part.size
				});
			}, 0);
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				const onAbort = () => {
					reader.abort();
					reject(new Error("Aborted"));
				};
				if (options.signal) options.signal.addEventListener("abort", onAbort, { once: true });
				reader.onload = () => {
					if (options.signal) options.signal.removeEventListener("abort", onAbort);
					resolve(reader.result);
				};
				reader.onerror = () => {
					if (options.signal) options.signal.removeEventListener("abort", onAbort);
					reject(reader.error || new Error("Blob read error"));
				};
				reader.readAsArrayBuffer(part);
			});
		}
	};
	var NativeStrategy = class {
		async fetch(url, options) {
			const response = await fetch(url, {
				method: "GET",
				headers: options.headers,
				signal: options.signal
			});
			if (!response.ok) throw new Error(`Status ${response.status}`);
			if (!response.body) throw new Error("No body");
			const reader = response.body.getReader();
			const contentLength = +(response.headers.get("Content-Length") || "0");
			let received = 0;
			const chunks = [];
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
				received += value.length;
				if (options.onprogress && contentLength) options.onprogress({
					loaded: received,
					total: contentLength
				});
			}
			const result = new Uint8Array(received);
			let offset = 0;
			for (const chunk of chunks) {
				result.set(chunk, offset);
				offset += chunk.length;
			}
			return result.buffer;
		}
	};
	var GmStrategy = class {
		async fetch(url, options) {
			return gmGet({
				url,
				responseType: "arraybuffer",
				headers: options.headers,
				timeout: options.timeout,
				onprogress: options.onprogress,
				signal: options.signal
			});
		}
	};
	function getBin(url, headers = {}, timeout = CFG.REQUEST_TIMEOUT, onprogress, signal) {
		if (getBlobInfo(url, blobRegistry)) return new BlobStrategy().fetch(url, {
			headers,
			timeout,
			onprogress,
			signal
		});
		return new NativeStrategy().fetch(url, {
			headers,
			timeout,
			onprogress,
			signal
		}).catch((err) => {
			if (signal?.aborted || err.name === "AbortError" || err.message === "Aborted") throw err;
			return new GmStrategy().fetch(url, {
				headers,
				timeout,
				onprogress,
				signal
			});
		});
	}
	var import_hls_parser_min = __commonJSMin(((exports, module) => {
		(function(t, e) {
			"object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? exports.HLS = e() : t.HLS = e();
		})(self, (() => (() => {
			"use strict";
			var t = {
				377(t, e, n) {
					function r(t, e) {
						return function(t) {
							if (Array.isArray(t)) return t;
						}(t) || function(t, e) {
							var n = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
							if (null != n) {
								var r, a, i, o, s = [], u = !0, c = !1;
								try {
									if (i = (n = n.call(t)).next, 0 === e) {
										if (Object(n) !== n) return;
										u = !1;
									} else for (; !(u = (r = i.call(n)).done) && (s.push(r.value), s.length !== e); u = !0);
								} catch (t) {
									c = !0, a = t;
								} finally {
									try {
										if (!u && null != n.return && (o = n.return(), Object(o) !== o)) return;
									} finally {
										if (c) throw a;
									}
								}
								return s;
							}
						}(t, e) || i(t, e) || function() {
							throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
						}();
					}
					function a(t, e) {
						var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
						if (!n) {
							if (Array.isArray(t) || (n = i(t)) || e && t && "number" == typeof t.length) {
								n && (t = n);
								var r = 0, a = function() {};
								return {
									s: a,
									n: function() {
										return r >= t.length ? { done: !0 } : {
											done: !1,
											value: t[r++]
										};
									},
									e: function(t) {
										throw t;
									},
									f: a
								};
							}
							throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
						}
						var o, s = !0, u = !1;
						return {
							s: function() {
								n = n.call(t);
							},
							n: function() {
								var t = n.next();
								return s = t.done, t;
							},
							e: function(t) {
								u = !0, o = t;
							},
							f: function() {
								try {
									s || null == n.return || n.return();
								} finally {
									if (u) throw o;
								}
							}
						};
					}
					function i(t, e) {
						if (t) {
							if ("string" == typeof t) return o(t, e);
							var n = {}.toString.call(t).slice(8, -1);
							return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? o(t, e) : void 0;
						}
					}
					function o(t, e) {
						(null == e || e > t.length) && (e = t.length);
						for (var n = 0, r = Array(e); n < e; n++) r[n] = t[n];
						return r;
					}
					var s, u = this && this.__createBinding || (Object.create ? function(t, e, n, r) {
						void 0 === r && (r = n);
						var a = Object.getOwnPropertyDescriptor(e, n);
						a && !("get" in a ? !e.__esModule : a.writable || a.configurable) || (a = {
							enumerable: !0,
							get: function() {
								return e[n];
							}
						}), Object.defineProperty(t, r, a);
					} : function(t, e, n, r) {
						void 0 === r && (r = n), t[r] = e[n];
					}), c = this && this.__setModuleDefault || (Object.create ? function(t, e) {
						Object.defineProperty(t, "default", {
							enumerable: !0,
							value: e
						});
					} : function(t, e) {
						t.default = e;
					}), l = this && this.__importStar || (s = function(t) {
						return s = Object.getOwnPropertyNames || function(t) {
							var e = [];
							for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[e.length] = n);
							return e;
						}, s(t);
					}, function(t) {
						if (t && t.__esModule) return t;
						var e = {};
						if (null != t) for (var n = s(t), r = 0; r < n.length; r++) "default" !== n[r] && u(e, t, n[r]);
						return c(e, t), e;
					});
					Object.defineProperty(e, "__esModule", { value: !0 });
					var T = l(n(203)), f = n(31);
					function E(t) {
						return T.trim(t, "\"");
					}
					function d(t) {
						var e = T.splitAt(t, ",");
						return {
							duration: T.toNumber(e[0]),
							title: decodeURIComponent(escape(e[1]))
						};
					}
					function h(t) {
						var e = T.splitAt(t, "@");
						return {
							length: T.toNumber(e[0]),
							offset: e[1] ? T.toNumber(e[1]) : -1
						};
					}
					function p(t) {
						var e = T.splitAt(t, "x");
						return {
							width: T.toNumber(e[0]),
							height: T.toNumber(e[1])
						};
					}
					function I(t) {
						var e = "ALLOWED-CPC: Each entry must consit of KEYFORMAT and Content Protection Configuration", n = t.split(",");
						0 === n.length && T.INVALIDPLAYLIST(e);
						var i, o = [], s = a(n);
						try {
							for (s.s(); !(i = s.n()).done;) {
								var u = i.value, c = r(T.splitAt(u, ":"), 2), l = c[0], f = c[1];
								l && f ? o.push({
									format: l,
									cpcList: f.split("/")
								}) : T.INVALIDPLAYLIST(e);
							}
						} catch (t) {
							s.e(t);
						} finally {
							s.f();
						}
						return o;
					}
					function v(t) {
						return t.startsWith("\"") ? E(t) : t.startsWith("0x") || t.startsWith("0X") ? T.hexToByteSequence(t) : T.toNumber(t);
					}
					function A(t, e) {
						e.IV && t.compatibleVersion < 2 && (t.compatibleVersion = 2), (e.KEYFORMAT || e.KEYFORMATVERSIONS) && t.compatibleVersion < 5 && (t.compatibleVersion = 5);
					}
					function y(t) {
						var e, n, i, o = {}, s = a(T.splitByCommaWithPreservingQuotes(t));
						try {
							for (s.s(); !(e = s.n()).done;) {
								var u = e.value, c = r(T.splitAt(u, "="), 2), l = c[0], f = c[1], d = E(f);
								switch (l) {
									case "URI":
										o[l] = d;
										break;
									case "START-DATE":
									case "END-DATE":
										o[l] = new Date(d);
										break;
									case "IV":
										o[l] = (n = d, i = void 0, 16 !== (i = T.hexToByteSequence(n)).length && T.INVALIDPLAYLIST("IV must be a 128-bit unsigned integer"), i);
										break;
									case "BYTERANGE":
										o[l] = h(d);
										break;
									case "RESOLUTION":
										o[l] = p(d);
										break;
									case "ALLOWED-CPC":
										o[l] = I(d);
										break;
									case "END-ON-NEXT":
									case "DEFAULT":
									case "AUTOSELECT":
									case "FORCED":
									case "PRECISE":
									case "CAN-BLOCK-RELOAD":
									case "INDEPENDENT":
									case "GAP":
										o[l] = "YES" === d;
										break;
									case "DURATION":
									case "PLANNED-DURATION":
									case "BANDWIDTH":
									case "AVERAGE-BANDWIDTH":
									case "FRAME-RATE":
									case "TIME-OFFSET":
									case "CAN-SKIP-UNTIL":
									case "HOLD-BACK":
									case "PART-HOLD-BACK":
									case "PART-TARGET":
									case "BYTERANGE-START":
									case "BYTERANGE-LENGTH":
									case "LAST-MSN":
									case "LAST-PART":
									case "SKIPPED-SEGMENTS":
									case "SCORE":
									case "PROGRAM-ID":
										o[l] = T.toNumber(d);
										break;
									default: l.startsWith("SCTE35-") ? o[l] = T.hexToByteSequence(d) : l.startsWith("X-") ? o[l] = v(f) : ("VIDEO-RANGE" === l && "SDR" !== d && "HLG" !== d && "PQ" !== d && T.INVALIDPLAYLIST("VIDEO-RANGE: unknown value \"".concat(d, "\"")), o[l] = d);
								}
							}
						} catch (t) {
							s.e(t);
						} finally {
							s.f();
						}
						return o;
					}
					function S() {
						T.INVALIDPLAYLIST("The file contains both media and master playlist tags.");
					}
					function N(t, e, n) {
						var r, i = (r = e.attributes, new f.Rendition({
							type: r.TYPE,
							uri: r.URI,
							groupId: r["GROUP-ID"],
							language: r.LANGUAGE,
							assocLanguage: r["ASSOC-LANGUAGE"],
							name: r.NAME,
							isDefault: r.DEFAULT,
							autoselect: r.AUTOSELECT,
							forced: r.FORCED,
							instreamId: r["INSTREAM-ID"],
							characteristics: r.CHARACTERISTICS,
							channels: r.CHANNELS,
							pathwayId: r["PATHWAY-ID"]
						})), o = t[T.camelify(n)], s = function(t, e) {
							var n, r = !1, i = a(t);
							try {
								for (i.s(); !(n = i.n()).done;) {
									var o = n.value;
									if (o.name === e.name) return "All EXT-X-MEDIA tags in the same Group MUST have different NAME attributes.";
									o.isDefault && (r = !0);
								}
							} catch (t) {
								i.e(t);
							} finally {
								i.f();
							}
							return r && e.isDefault ? "EXT-X-MEDIA A Group MUST NOT have more than one member with a DEFAULT attribute of YES." : "";
						}(o, i);
						s && T.INVALIDPLAYLIST(s), o.push(i), i.isDefault && (t.currentRenditions[T.camelify(n)] = o.length - 1);
					}
					function m(t, e, n, r, i) {
						var o, s = new f.Variant({
							uri: n,
							bandwidth: e.BANDWIDTH,
							averageBandwidth: e["AVERAGE-BANDWIDTH"],
							score: e.SCORE,
							codecs: e.CODECS,
							resolution: e.RESOLUTION,
							frameRate: e["FRAME-RATE"],
							hdcpLevel: e["HDCP-LEVEL"],
							allowedCpc: e["ALLOWED-CPC"],
							videoRange: e["VIDEO-RANGE"],
							stableVariantId: e["STABLE-VARIANT-ID"],
							pathwayId: e["STABLE-PATHWAY-ID"],
							programId: e["PROGRAM-ID"]
						}), u = a(t);
						try {
							for (u.s(); !(o = u.n()).done;) {
								var c = o.value;
								if ("EXT-X-MEDIA" === c.name) {
									var l = c.attributes, E = l.TYPE;
									if (E && l["GROUP-ID"] || T.INVALIDPLAYLIST("EXT-X-MEDIA TYPE attribute is REQUIRED."), e[E] === l["GROUP-ID"] && (N(s, c, E), "CLOSED-CAPTIONS" === E)) {
										var d, h = a(s.closedCaptions);
										try {
											for (h.s(); !(d = h.n()).done;) {
												var p = d.value.instreamId;
												if (p && p.startsWith("SERVICE") && i.compatibleVersion < 7) {
													i.compatibleVersion = 7;
													break;
												}
											}
										} catch (t) {
											h.e(t);
										} finally {
											h.f();
										}
									}
								}
							}
						} catch (t) {
							u.e(t);
						} finally {
							u.f();
						}
						return function(t, e, n) {
							for (var r = function() {
								var r = i[a];
								"CLOSED-CAPTIONS" === r && "NONE" === t[r] ? (n.isClosedCaptionsNone = !0, e.closedCaptions = []) : t[r] && !e[T.camelify(r)].some((function(e) {
									return e.groupId === t[r];
								})) && T.INVALIDPLAYLIST("".concat(r, " attribute MUST match the value of the GROUP-ID attribute of an EXT-X-MEDIA tag whose TYPE attribute is ").concat(r, "."));
							}, a = 0, i = [
								"AUDIO",
								"VIDEO",
								"SUBTITLES",
								"CLOSED-CAPTIONS"
							]; a < i.length; a++) r();
						}(e, s, i), s.isIFrameOnly = r, s;
					}
					function X(t) {
						for (var e = {}, n = 0, r = Object.keys(t); n < r.length; n++) {
							var a = r[n];
							(a.startsWith("SCTE35-") || a.startsWith("X-")) && (e[a] = t[a]);
						}
						return new f.DateRange({
							id: t.ID,
							classId: t.CLASS,
							start: t["START-DATE"],
							cue: t.CUE,
							end: t["END-DATE"],
							duration: t.DURATION,
							plannedDuration: t["PLANNED-DURATION"],
							endOnNext: t["END-ON-NEXT"],
							attributes: e
						});
					}
					function g(t, e, n, r, a, i, o) {
						for (var s = new f.Segment({
							uri: e,
							mediaSequenceNumber: a,
							discontinuitySequence: i
						}), u = !1, c = !1, l = n; l <= r; l++) {
							var E = L(t[l]), d = E.name, h = E.value, p = E.attributes;
							if ("EXTINF" === d) !Number.isInteger(h.duration) && o.compatibleVersion < 3 && (o.compatibleVersion = 3), Math.round(h.duration) > o.targetDuration && T.INVALIDPLAYLIST("EXTINF duration, when rounded to the nearest integer, MUST be less than or equal to the target duration"), s.duration = h.duration, s.title = h.title;
							else if ("EXT-X-BYTERANGE" === d) o.compatibleVersion < 4 && (o.compatibleVersion = 4), s.byterange = h;
							else if ("EXT-X-DISCONTINUITY" === d) s.parts.length > 0 && T.INVALIDPLAYLIST("EXT-X-DISCONTINUITY must appear before the first EXT-X-PART tag of the Parent Segment."), s.discontinuity = !0;
							else if ("EXT-X-GAP" === d) o.compatibleVersion < 8 && (o.compatibleVersion = 8), s.gap = !0;
							else if ("EXT-X-KEY" === d) s.parts.length > 0 && T.INVALIDPLAYLIST("EXT-X-KEY must appear before the first EXT-X-PART tag of the Parent Segment."), A(o, p), s.key = new f.Key({
								method: p.METHOD,
								uri: p.URI,
								iv: p.IV,
								format: p.KEYFORMAT,
								formatVersion: p.KEYFORMATVERSIONS
							});
							else if ("EXT-X-MAP" === d) s.parts.length > 0 && T.INVALIDPLAYLIST("EXT-X-MAP must appear before the first EXT-X-PART tag of the Parent Segment."), o.compatibleVersion < 5 && (o.compatibleVersion = 5), o.hasMap = !0, s.map = new f.MediaInitializationSection({
								uri: p.URI,
								byterange: p.BYTERANGE
							});
							else if ("EXT-X-PROGRAM-DATE-TIME" === d) s.programDateTime = h;
							else if ("EXT-X-DATERANGE" === d) s.dateRange = X(p);
							else if ("EXT-X-CUE-OUT" === d) s.markers.push(new f.SpliceInfo({
								type: "OUT",
								duration: p && p.DURATION || h
							}));
							else if ("EXT-X-CUE-IN" === d) s.markers.push(new f.SpliceInfo({ type: "IN" }));
							else if ("EXT-X-CUE-OUT-CONT" === d || "EXT-X-CUE" === d || "EXT-OATCLS-SCTE35" === d || "EXT-X-ASSET" === d || "EXT-X-SCTE35" === d) s.markers.push(new f.SpliceInfo({
								type: "RAW",
								tagName: d,
								value: h
							}));
							else if ("EXT-X-PRELOAD-HINT" !== d || p.TYPE) if ("EXT-X-PRELOAD-HINT" === d && "PART" === p.TYPE && c) T.INVALIDPLAYLIST("Servers should not add more than one EXT-X-PRELOAD-HINT tag with the same TYPE attribute to a Playlist.");
							else if ("EXT-X-PART" !== d && "EXT-X-PRELOAD-HINT" !== d || p.URI) {
								if ("EXT-X-PRELOAD-HINT" === d && "MAP" === p.TYPE) u && T.INVALIDPLAYLIST("Servers should not add more than one EXT-X-PRELOAD-HINT tag with the same TYPE attribute to a Playlist."), u = !0, o.hasMap = !0, s.map = new f.MediaInitializationSection({
									hint: !0,
									uri: p.URI,
									byterange: {
										length: p["BYTERANGE-LENGTH"],
										offset: p["BYTERANGE-START"] || 0
									}
								});
								else if ("EXT-X-PART" === d || "EXT-X-PRELOAD-HINT" === d && "PART" === p.TYPE) {
									"EXT-X-PART" !== d || p.DURATION || T.INVALIDPLAYLIST("EXT-X-PART: DURATION attribute is mandatory"), "EXT-X-PRELOAD-HINT" === d && (c = !0);
									var I = new f.PartialSegment({
										hint: "EXT-X-PRELOAD-HINT" === d,
										uri: p.URI,
										byterange: "EXT-X-PART" === d ? p.BYTERANGE : {
											length: p["BYTERANGE-LENGTH"],
											offset: p["BYTERANGE-START"] || 0
										},
										duration: p.DURATION,
										independent: p.INDEPENDENT,
										gap: p.GAP
									});
									s.gap && !I.gap && T.INVALIDPLAYLIST("Partial segments must have GAP=YES if they are in a gap (EXT-X-GAP)"), s.parts.push(I);
								}
							} else T.INVALIDPLAYLIST("EXT-X-PART / EXT-X-PRELOAD-HINT: URI attribute is mandatory");
							else T.INVALIDPLAYLIST("EXT-X-PRELOAD-HINT: TYPE attribute is mandatory");
						}
						return s;
					}
					function R(t, e, n, r, a, i, o) {
						for (var s = new f.PrefetchSegment({
							uri: e,
							mediaSequenceNumber: a,
							discontinuitySequence: i
						}), u = n; u <= r; u++) {
							var c = t[u], l = c.name, E = c.attributes;
							"EXTINF" === l ? T.INVALIDPLAYLIST("A prefetch segment must not be advertised with an EXTINF tag.") : "EXT-X-DISCONTINUITY" === l ? T.INVALIDPLAYLIST("A prefetch segment must not be advertised with an EXT-X-DISCONTINUITY tag.") : "EXT-X-PREFETCH-DISCONTINUITY" === l ? s.discontinuity = !0 : "EXT-X-KEY" === l ? (A(o, E), s.key = new f.Key({
								method: E.METHOD,
								uri: E.URI,
								iv: E.IV,
								format: E.KEYFORMAT,
								formatVersion: E.KEYFORMATVERSIONS
							})) : "EXT-X-MAP" === l && T.INVALIDPLAYLIST("Prefetch segments must not be advertised with an EXT-X-MAP tag.");
						}
						return s;
					}
					function b(t, e) {
						var n, i = new f.MediaPlaylist(), o = -1, s = 0, u = !1, c = !1, l = 0, E = null, d = null, h = !1, p = a(t.entries());
						try {
							for (p.s(); !(n = p.n()).done;) {
								var I = r(n.value, 2), v = I[0], A = I[1], y = L(A), S = y.name, N = y.value, m = y.attributes;
								if ("Segment" !== y.category) {
									if ("EXT-X-VERSION" === S) void 0 === i.version ? i.version = N : T.INVALIDPLAYLIST("A Playlist file MUST NOT contain more than one EXT-X-VERSION tag.");
									else if ("EXT-X-TARGETDURATION" === S) i.targetDuration = e.targetDuration = N;
									else if ("EXT-X-MEDIA-SEQUENCE" === S) i.segments.length > 0 && T.INVALIDPLAYLIST("The EXT-X-MEDIA-SEQUENCE tag MUST appear before the first Media Segment in the Playlist."), i.mediaSequenceBase = s = N;
									else if ("EXT-X-DISCONTINUITY-SEQUENCE" === S) i.segments.length > 0 && T.INVALIDPLAYLIST("The EXT-X-DISCONTINUITY-SEQUENCE tag MUST appear before the first Media Segment in the Playlist."), u && T.INVALIDPLAYLIST("The EXT-X-DISCONTINUITY-SEQUENCE tag MUST appear before any EXT-X-DISCONTINUITY tag."), i.discontinuitySequenceBase = l = N;
									else if ("EXT-X-ENDLIST" === S) i.endlist = !0;
									else if ("EXT-X-PLAYLIST-TYPE" === S) i.playlistType = N;
									else if ("EXT-X-I-FRAMES-ONLY" === S) e.compatibleVersion < 4 && (e.compatibleVersion = 4), i.isIFrame = !0;
									else if ("EXT-X-INDEPENDENT-SEGMENTS" === S) i.independentSegments && T.INVALIDPLAYLIST("EXT-X-INDEPENDENT-SEGMENTS tag MUST NOT appear more than once in a Playlist"), i.independentSegments = !0;
									else if ("EXT-X-START" === S) i.start && T.INVALIDPLAYLIST("EXT-X-START tag MUST NOT appear more than once in a Playlist"), "number" != typeof m["TIME-OFFSET"] && T.INVALIDPLAYLIST("EXT-X-START: TIME-OFFSET attribute is REQUIRED"), i.start = {
										offset: m["TIME-OFFSET"],
										precise: m.PRECISE || !1
									};
									else if ("EXT-X-SERVER-CONTROL" === S) m["CAN-BLOCK-RELOAD"] || T.INVALIDPLAYLIST("EXT-X-SERVER-CONTROL: CAN-BLOCK-RELOAD=YES is mandatory for Low-Latency HLS"), i.lowLatencyCompatibility = {
										canBlockReload: m["CAN-BLOCK-RELOAD"],
										canSkipUntil: m["CAN-SKIP-UNTIL"],
										holdBack: m["HOLD-BACK"],
										partHoldBack: m["PART-HOLD-BACK"]
									};
									else if ("EXT-X-PART-INF" === S) m["PART-TARGET"] || T.INVALIDPLAYLIST("EXT-X-PART-INF: PART-TARGET attribute is mandatory"), i.partTargetDuration = m["PART-TARGET"];
									else if ("EXT-X-RENDITION-REPORT" === S) m.URI || T.INVALIDPLAYLIST("EXT-X-RENDITION-REPORT: URI attribute is mandatory"), 0 === m.URI.search(/^[a-z]+:/) && T.INVALIDPLAYLIST("EXT-X-RENDITION-REPORT: URI must be relative to the playlist uri"), i.renditionReports.push(new f.RenditionReport({
										uri: m.URI,
										lastMSN: m["LAST-MSN"],
										lastPart: m["LAST-PART"]
									}));
									else if ("EXT-X-SKIP" === S) m["SKIPPED-SEGMENTS"] || T.INVALIDPLAYLIST("EXT-X-SKIP: SKIPPED-SEGMENTS attribute is mandatory"), e.compatibleVersion < 9 && (e.compatibleVersion = 9), i.skip = m["SKIPPED-SEGMENTS"], s += i.skip;
									else if ("EXT-X-PREFETCH" === S) {
										var b = R(t, N, -1 === o ? v : o, v - 1, s++, l, e);
										b && (b.discontinuity && (b.discontinuitySequence++, l = b.discontinuitySequence), b.key ? E = b.key : b.key = E, i.prefetchSegments.push(b)), c = !0, o = -1;
									} else if ("EXT-X-DEFINE" === S) i.defines || (i.defines = []), i.defines.push(m);
									else if ("EXT-X-DATERANGE" === S) {
										var P = X(m);
										i.dateRanges.push(P);
									} else if ("string" == typeof A) {
										-1 === o && T.INVALIDPLAYLIST("A URI line is not preceded by any segment tags"), i.targetDuration || T.INVALIDPLAYLIST("The EXT-X-TARGETDURATION tag is REQUIRED"), c && T.INVALIDPLAYLIST("These segments must appear after all complete segments.");
										var D = g(t, A, o, v - 1, s++, l, e);
										if (D) {
											var C = r(O(i, D, l, E, d), 3);
											l = C[0], E = C[1], d = C[2], !h && D.parts.length > 0 && (h = !0);
										}
										o = -1;
									}
								} else -1 === o && (o = v), "EXT-X-DISCONTINUITY" === S && (u = !0);
							}
						} catch (t) {
							p.e(t);
						} finally {
							p.f();
						}
						if (-1 !== o) {
							var M = g(t, "", o, t.length - 1, s++, l, e);
							if (M) {
								var U, w = M.parts;
								!(w.length > 0) || i.endlist || null !== (U = w.at(-1)) && void 0 !== U && U.hint || T.INVALIDPLAYLIST("If the Playlist contains EXT-X-PART tags and does not contain an EXT-X-ENDLIST tag, the Playlist must contain an EXT-X-PRELOAD-HINT tag with a TYPE=PART attribute"), O(i, M, E, d), !h && M.parts.length > 0 && (h = !0);
							}
						}
						return function(t) {
							for (var e = new Map(), n = new Map(), r = !1, i = !1, o = t.length - 1; o >= 0; o--) {
								var s = t[o], u = s.programDateTime, c = s.dateRange;
								if (u && (i = !0), c && c.start) {
									r = !0, c.endOnNext && (c.end || c.duration) && T.INVALIDPLAYLIST("An EXT-X-DATERANGE tag with an END-ON-NEXT=YES attribute MUST NOT contain DURATION or END-DATE attributes.");
									var l = c.start.getTime(), f = c.duration || 0;
									c.end && c.duration && l + 1e3 * f !== c.end.getTime() && T.INVALIDPLAYLIST("END-DATE MUST be equal to the value of the START-DATE attribute plus the value of the DURATION"), c.endOnNext && (c.end = e.get(c.classId)), e.set(c.classId, c.start);
									var E = c.end ? c.end.getTime() : c.start.getTime() + 1e3 * (c.duration || 0), d = n.get(c.classId);
									if (d) {
										var h, p = a(d);
										try {
											for (p.s(); !(h = p.n()).done;) {
												var I = h.value;
												(I.start <= l && I.end > l || I.start >= l && I.start < E) && T.INVALIDPLAYLIST("DATERANGE tags with the same CLASS should not overlap");
											}
										} catch (t) {
											p.e(t);
										} finally {
											p.f();
										}
										d.push({
											start: l,
											end: E
										});
									} else c.classId && n.set(c.classId, [{
										start: l,
										end: E
									}]);
								}
							}
							r && !i && T.INVALIDPLAYLIST("If a Playlist contains an EXT-X-DATERANGE tag, it MUST also contain at least one EXT-X-PROGRAM-DATE-TIME tag.");
						}(i.segments), i.lowLatencyCompatibility && function(t, e) {
							var n = t.lowLatencyCompatibility, i = t.targetDuration, o = t.partTargetDuration, s = t.segments, u = t.renditionReports, c = n.canSkipUntil, l = n.holdBack, f = n.partHoldBack;
							c < 6 * i && T.INVALIDPLAYLIST("The Skip Boundary must be at least six times the EXT-X-TARGETDURATION.");
							l < 3 * i && T.INVALIDPLAYLIST("HOLD-BACK must be at least three times the EXT-X-TARGETDURATION.");
							if (e) {
								void 0 === o && T.INVALIDPLAYLIST("EXT-X-PART-INF is required if a Playlist contains one or more EXT-X-PART tags"), void 0 === f && T.INVALIDPLAYLIST("EXT-X-PART: PART-HOLD-BACK attribute is mandatory"), f < o && T.INVALIDPLAYLIST("PART-HOLD-BACK must be at least PART-TARGET");
								var E, d = a(s.entries());
								try {
									for (d.s(); !(E = d.n()).done;) {
										var h = r(E.value, 2), p = h[0], I = h[1].parts;
										I.length > 0 && p < s.length - 3 && T.INVALIDPLAYLIST("Remove EXT-X-PART tags from the Playlist after they are greater than three target durations from the end of the Playlist.");
										var v, A = a(I.entries());
										try {
											for (A.s(); !(v = A.n()).done;) {
												var y = r(v.value, 2), S = y[0], N = y[1].duration;
												void 0 !== N && (N > o && T.INVALIDPLAYLIST("PART-TARGET is the maximum duration of any Partial Segment"), S < I.length - 1 && N < .85 * o && T.INVALIDPLAYLIST("All Partial Segments except the last part of a segment must have a duration of at least 85% of PART-TARGET"));
											}
										} catch (t) {
											A.e(t);
										} finally {
											A.f();
										}
									}
								} catch (t) {
									d.e(t);
								} finally {
									d.f();
								}
							}
							var m, X = a(u);
							try {
								for (X.s(); !(m = X.n()).done;) {
									var g, R = m.value, b = s.at(-1);
									null !== (g = R.lastMSN) && void 0 !== g || (R.lastMSN = b.mediaSequenceNumber), (null === R.lastPart || void 0 === R.lastPart) && b.parts.length > 0 && (R.lastPart = b.parts.length - 1);
								}
							} catch (t) {
								X.e(t);
							} finally {
								X.f();
							}
						}(i, h), i;
					}
					function O(t, e, n, r, a) {
						var i = e.discontinuity, o = e.key, s = e.map, u = e.byterange, c = e.uri;
						if (i && (e.discontinuitySequence = n + 1), o || (e.key = r), s || (e.map = a), u && -1 === u.offset) {
							var l = t.segments;
							if (l.length > 0) {
								var f = l.at(-1);
								f.byterange && f.uri === c ? u.offset = f.byterange.offset + f.byterange.length : T.INVALIDPLAYLIST("If offset of EXT-X-BYTERANGE is not present, a previous Media Segment MUST be a sub-range of the same media resource");
							} else T.INVALIDPLAYLIST("If offset of EXT-X-BYTERANGE is not present, a previous Media Segment MUST appear in the Playlist file");
						}
						return t.segments.push(e), [
							e.discontinuitySequence,
							e.key,
							e.map
						];
					}
					function P(t, e) {
						var a = r(function(t) {
							var e = t.indexOf(":");
							return -1 === e ? [t.slice(1).trim(), null] : [t.slice(1, e).trim(), t.slice(e + 1).trim()];
						}(t), 2), i = a[0], o = a[1], s = function(t) {
							switch (t) {
								case "EXTM3U":
								case "EXT-X-VERSION":
								case "EXT-X-CONTENT-STEERING": return "Basic";
								case "EXTINF":
								case "EXT-X-BYTERANGE":
								case "EXT-X-DISCONTINUITY":
								case "EXT-X-PREFETCH-DISCONTINUITY":
								case "EXT-X-KEY":
								case "EXT-X-MAP":
								case "EXT-X-PROGRAM-DATE-TIME":
								case "EXT-X-DATERANGE":
								case "EXT-X-CUE-OUT":
								case "EXT-X-CUE-IN":
								case "EXT-X-CUE-OUT-CONT":
								case "EXT-X-CUE":
								case "EXT-OATCLS-SCTE35":
								case "EXT-X-ASSET":
								case "EXT-X-SCTE35":
								case "EXT-X-PART":
								case "EXT-X-PRELOAD-HINT":
								case "EXT-X-GAP": return "Segment";
								case "EXT-X-TARGETDURATION":
								case "EXT-X-MEDIA-SEQUENCE":
								case "EXT-X-DISCONTINUITY-SEQUENCE":
								case "EXT-X-ENDLIST":
								case "EXT-X-PLAYLIST-TYPE":
								case "EXT-X-I-FRAMES-ONLY":
								case "EXT-X-SERVER-CONTROL":
								case "EXT-X-PART-INF":
								case "EXT-X-PREFETCH":
								case "EXT-X-RENDITION-REPORT":
								case "EXT-X-SKIP": return "MediaPlaylist";
								case "EXT-X-MEDIA":
								case "EXT-X-STREAM-INF":
								case "EXT-X-I-FRAME-STREAM-INF":
								case "EXT-X-SESSION-DATA":
								case "EXT-X-SESSION-KEY": return "MasterPlaylist";
								case "EXT-X-INDEPENDENT-SEGMENTS":
								case "EXT-X-START":
								case "EXT-X-DEFINE": return "MediaorMasterPlaylist";
								default: return "Unknown";
							}
						}(i);
						if (function(t, e) {
							if ("Segment" === t || "MediaPlaylist" === t) return void 0 === e.isMasterPlaylist ? void (e.isMasterPlaylist = !1) : void (e.isMasterPlaylist && S());
							if ("MasterPlaylist" === t) {
								if (void 0 === e.isMasterPlaylist) return void (e.isMasterPlaylist = !0);
								!1 === e.isMasterPlaylist && S();
							}
						}(s, e), "Unknown" === s) return null;
						"MediaPlaylist" === s && "EXT-X-RENDITION-REPORT" !== i && "EXT-X-PREFETCH" !== i && (e.hash[i] && T.INVALIDPLAYLIST("There MUST NOT be more than one Media Playlist tag of each type in any Media Playlist"), e.hash[i] = !0);
						var c = r(function(t, e) {
							switch (t) {
								case "EXTM3U":
								case "EXT-X-DISCONTINUITY":
								case "EXT-X-ENDLIST":
								case "EXT-X-I-FRAMES-ONLY":
								case "EXT-X-INDEPENDENT-SEGMENTS":
								case "EXT-X-CUE-IN":
								case "EXT-X-GAP": return [null, null];
								case "EXT-X-VERSION":
								case "EXT-X-TARGETDURATION":
								case "EXT-X-MEDIA-SEQUENCE":
								case "EXT-X-DISCONTINUITY-SEQUENCE": return [T.toNumber(e), null];
								case "EXT-X-CUE-OUT": return Number.isNaN(Number(e)) ? [null, y(e)] : [T.toNumber(e), null];
								case "EXT-X-KEY":
								case "EXT-X-MAP":
								case "EXT-X-DATERANGE":
								case "EXT-X-MEDIA":
								case "EXT-X-STREAM-INF":
								case "EXT-X-I-FRAME-STREAM-INF":
								case "EXT-X-SESSION-DATA":
								case "EXT-X-SESSION-KEY":
								case "EXT-X-START":
								case "EXT-X-SERVER-CONTROL":
								case "EXT-X-PART-INF":
								case "EXT-X-PART":
								case "EXT-X-PRELOAD-HINT":
								case "EXT-X-RENDITION-REPORT":
								case "EXT-X-SKIP":
								case "EXT-X-DEFINE": return [null, y(e)];
								case "EXTINF": return [d(e), null];
								case "EXT-X-BYTERANGE": return [h(e), null];
								case "EXT-X-PROGRAM-DATE-TIME": return [new Date(e), null];
								default: return [e, null];
							}
						}(i, o), 2);
						return {
							name: i,
							category: s,
							value: c[0],
							attributes: c[1]
						};
					}
					function D(t, e) {
						var n;
						return e.isMasterPlaylist ? n = function(t, e) {
							var n, i = new f.MasterPlaylist(), o = !1, s = a(t.entries());
							try {
								var u = function() {
									var a = r(n.value, 2), s = a[0], u = L(a[1]), c = u.name, l = u.value, E = u.attributes;
									if ("EXT-X-VERSION" === c) i.version = l;
									else if ("EXT-X-CONTENT-STEERING-SERVER" === c) i.contentSteering = new f.ContentSteering({
										serverUri: E["SERVER-URI"],
										pathwayId: E["PATHWAY-ID"]
									});
									else if ("EXT-X-STREAM-INF" === c) {
										var h = t[s + 1];
										("string" != typeof h || h.startsWith("#EXT")) && T.INVALIDPLAYLIST("EXT-X-STREAM-INF must be followed by a URI line");
										var p = m(t, E, h, !1, e);
										p && ("number" == typeof p.score && (o = !0, p.score < 0 && T.INVALIDPLAYLIST("SCORE attribute on EXT-X-STREAM-INF must be positive decimal-floating-point number.")), i.variants.push(p));
									} else if ("EXT-X-I-FRAME-STREAM-INF" === c) {
										var I = m(t, E, E.URI, !0, e);
										I && i.variants.push(I);
									} else if ("EXT-X-SESSION-DATA" === c) {
										var v = new f.SessionData({
											id: E["DATA-ID"],
											value: E.VALUE,
											uri: E.URI,
											language: E.LANGUAGE
										});
										i.sessionDataList.some((function(t) {
											return t.id === v.id && t.language === v.language;
										})) && T.INVALIDPLAYLIST("A Playlist MUST NOT contain more than one EXT-X-SESSION-DATA tag with the same DATA-ID attribute and the same LANGUAGE attribute."), i.sessionDataList.push(v);
									} else if ("EXT-X-SESSION-KEY" === c) {
										"NONE" === E.METHOD && T.INVALIDPLAYLIST("EXT-X-SESSION-KEY: The value of the METHOD attribute MUST NOT be NONE");
										var y = new f.Key({
											method: E.METHOD,
											uri: E.URI,
											iv: E.IV,
											format: E.KEYFORMAT,
											formatVersion: E.KEYFORMATVERSIONS
										});
										i.sessionKeyList.some((function(t) {
											return function(t, e) {
												if (t.method !== e.method) return !1;
												if (t.uri !== e.uri) return !1;
												if (t.iv) {
													if (!e.iv) return !1;
													if (t.iv.byteLength !== e.iv.byteLength) return !1;
													for (var n = 0; n < t.iv.byteLength; n++) if (t.iv[n] !== e.iv[n]) return !1;
												} else if (e.iv) return !1;
												return t.format === e.format && t.formatVersion === e.formatVersion;
											}(t, y);
										})) && T.INVALIDPLAYLIST("A Master Playlist MUST NOT contain more than one EXT-X-SESSION-KEY tag with the same METHOD, URI, IV, KEYFORMAT, and KEYFORMATVERSIONS attribute values."), A(e, E), i.sessionKeyList.push(y);
									} else "EXT-X-INDEPENDENT-SEGMENTS" === c ? (i.independentSegments && T.INVALIDPLAYLIST("EXT-X-INDEPENDENT-SEGMENTS tag MUST NOT appear more than once in a Playlist"), i.independentSegments = !0) : "EXT-X-START" === c ? (i.start && T.INVALIDPLAYLIST("EXT-X-START tag MUST NOT appear more than once in a Playlist"), "number" != typeof E["TIME-OFFSET"] && T.INVALIDPLAYLIST("EXT-X-START: TIME-OFFSET attribute is REQUIRED"), i.start = {
										offset: E["TIME-OFFSET"],
										precise: E.PRECISE || !1
									}) : "EXT-X-DEFINE" === c && (i.defines || (i.defines = []), i.defines.push(E));
								};
								for (s.s(); !(n = s.n()).done;) u();
							} catch (t) {
								s.e(t);
							} finally {
								s.f();
							}
							if (o) {
								var c, l = a(i.variants);
								try {
									for (l.s(); !(c = l.n()).done;) "number" != typeof c.value.score && T.INVALIDPLAYLIST("If any Variant Stream contains the SCORE attribute, then all Variant Streams in the Master Playlist SHOULD have a SCORE attribute");
								} catch (t) {
									l.e(t);
								} finally {
									l.f();
								}
							}
							if (e.isClosedCaptionsNone) {
								var E, d = a(i.variants);
								try {
									for (d.s(); !(E = d.n()).done;) E.value.closedCaptions.length > 0 && T.INVALIDPLAYLIST("If there is a variant with CLOSED-CAPTIONS attribute of NONE, all EXT-X-STREAM-INF tags MUST have this attribute with a value of NONE");
								} catch (t) {
									d.e(t);
								} finally {
									d.f();
								}
							}
							return i;
						}(t, e) : !(n = b(t, e)).isIFrame && e.hasMap && e.compatibleVersion < 6 && (e.compatibleVersion = 6), e.compatibleVersion > 1 && (!n.version || n.version < e.compatibleVersion) && T.INVALIDPLAYLIST("EXT-X-VERSION needs to be ".concat(e.compatibleVersion, " or higher.")), n;
					}
					function L(t) {
						return "string" == typeof t ? {} : t;
					}
					e.default = function(t) {
						var e = {
							version: void 0,
							isMasterPlaylist: void 0,
							hasMap: !1,
							targetDuration: 0,
							compatibleVersion: 1,
							isClosedCaptionsNone: !1,
							hash: {}
						}, n = D(function(t, e) {
							var n, r = [], i = a(t.split("\n"));
							try {
								for (i.s(); !(n = i.n()).done;) {
									var o = n.value.trim();
									if (o) if (o.startsWith("#")) {
										if (o.startsWith("#EXT")) {
											var s = P(o, e);
											s && r.push(s);
										}
									} else r.push(o);
								}
							} catch (t) {
								i.e(t);
							} finally {
								i.f();
							}
							return 0 !== r.length && "EXTM3U" === r[0].name || T.INVALIDPLAYLIST("The EXTM3U tag MUST be the first line."), r;
						}(t, e), e);
						return n.source = t, n;
					};
				},
				887(t, e, n) {
					function r(t) {
						return r = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
							return typeof t;
						} : function(t) {
							return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
						}, r(t);
					}
					function a(t, e) {
						return function(t) {
							if (Array.isArray(t)) return t;
						}(t) || function(t, e) {
							var n = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
							if (null != n) {
								var r, a, i, o, s = [], u = !0, c = !1;
								try {
									if (i = (n = n.call(t)).next, 0 === e) {
										if (Object(n) !== n) return;
										u = !1;
									} else for (; !(u = (r = i.call(n)).done) && (s.push(r.value), s.length !== e); u = !0);
								} catch (t) {
									c = !0, a = t;
								} finally {
									try {
										if (!u && null != n.return && (o = n.return(), Object(o) !== o)) return;
									} finally {
										if (c) throw a;
									}
								}
								return s;
							}
						}(t, e) || o(t, e) || function() {
							throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
						}();
					}
					function i(t, e) {
						var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
						if (!n) {
							if (Array.isArray(t) || (n = o(t)) || e && t && "number" == typeof t.length) {
								n && (t = n);
								var r = 0, a = function() {};
								return {
									s: a,
									n: function() {
										return r >= t.length ? { done: !0 } : {
											done: !1,
											value: t[r++]
										};
									},
									e: function(t) {
										throw t;
									},
									f: a
								};
							}
							throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
						}
						var i, s = !0, u = !1;
						return {
							s: function() {
								n = n.call(t);
							},
							n: function() {
								var t = n.next();
								return s = t.done, t;
							},
							e: function(t) {
								u = !0, i = t;
							},
							f: function() {
								try {
									s || null == n.return || n.return();
								} finally {
									if (u) throw i;
								}
							}
						};
					}
					function o(t, e) {
						if (t) {
							if ("string" == typeof t) return s(t, e);
							var n = {}.toString.call(t).slice(8, -1);
							return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? s(t, e) : void 0;
						}
					}
					function s(t, e) {
						(null == e || e > t.length) && (e = t.length);
						for (var n = 0, r = Array(e); n < e; n++) r[n] = t[n];
						return r;
					}
					function u(t, e) {
						for (var n = 0; n < e.length; n++) {
							var r = e[n];
							r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, p(r.key), r);
						}
					}
					function c(t, e, n) {
						return e = h(e), function(t, e) {
							if (e && ("object" == r(e) || "function" == typeof e)) return e;
							if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
							return function(t) {
								if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
								return t;
							}(t);
						}(t, E() ? Reflect.construct(e, n || [], h(t).constructor) : e.apply(t, n));
					}
					function l(t, e, n, r) {
						var a = T(h(1 & r ? t.prototype : t), e, n);
						return 2 & r && "function" == typeof a ? function(t) {
							return a.apply(n, t);
						} : a;
					}
					function T() {
						return T = "undefined" != typeof Reflect && Reflect.get ? Reflect.get.bind() : function(t, e, n) {
							var r = function(t, e) {
								for (; !{}.hasOwnProperty.call(t, e) && null !== (t = h(t)););
								return t;
							}(t, e);
							if (r) {
								var a = Object.getOwnPropertyDescriptor(r, e);
								return a.get ? a.get.call(arguments.length < 3 ? t : n) : a.value;
							}
						}, T.apply(null, arguments);
					}
					function f(t) {
						var e = "function" == typeof Map ? new Map() : void 0;
						return f = function(t) {
							if (null === t || !function(t) {
								try {
									return -1 !== Function.toString.call(t).indexOf("[native code]");
								} catch (e) {
									return "function" == typeof t;
								}
							}(t)) return t;
							if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function");
							if (void 0 !== e) {
								if (e.has(t)) return e.get(t);
								e.set(t, n);
							}
							function n() {
								return function(t, e, n) {
									if (E()) return Reflect.construct.apply(null, arguments);
									var r = [null];
									r.push.apply(r, e);
									var a = new (t.bind.apply(t, r))();
									return n && d(a, n.prototype), a;
								}(t, arguments, h(this).constructor);
							}
							return n.prototype = Object.create(t.prototype, { constructor: {
								value: n,
								enumerable: !1,
								writable: !0,
								configurable: !0
							} }), d(n, t);
						}, f(t);
					}
					function E() {
						try {
							var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})));
						} catch (t) {}
						return (E = function() {
							return !!t;
						})();
					}
					function d(t, e) {
						return d = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
							return t.__proto__ = e, t;
						}, d(t, e);
					}
					function h(t) {
						return h = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
							return t.__proto__ || Object.getPrototypeOf(t);
						}, h(t);
					}
					function p(t) {
						var e = function(t, e) {
							if ("object" != r(t) || !t) return t;
							var n = t[Symbol.toPrimitive];
							if (void 0 !== n) {
								var a = n.call(t, e || "default");
								if ("object" != r(a)) return a;
								throw new TypeError("@@toPrimitive must return a primitive value.");
							}
							return ("string" === e ? String : Number)(t);
						}(t, "string");
						return "symbol" == r(e) ? e : e + "";
					}
					var I, v = this && this.__createBinding || (Object.create ? function(t, e, n, r) {
						void 0 === r && (r = n);
						var a = Object.getOwnPropertyDescriptor(e, n);
						a && !("get" in a ? !e.__esModule : a.writable || a.configurable) || (a = {
							enumerable: !0,
							get: function() {
								return e[n];
							}
						}), Object.defineProperty(t, r, a);
					} : function(t, e, n, r) {
						void 0 === r && (r = n), t[r] = e[n];
					}), A = this && this.__setModuleDefault || (Object.create ? function(t, e) {
						Object.defineProperty(t, "default", {
							enumerable: !0,
							value: e
						});
					} : function(t, e) {
						t.default = e;
					}), y = this && this.__importStar || (I = function(t) {
						return I = Object.getOwnPropertyNames || function(t) {
							var e = [];
							for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[e.length] = n);
							return e;
						}, I(t);
					}, function(t) {
						if (t && t.__esModule) return t;
						var e = {};
						if (null != t) for (var n = I(t), r = 0; r < n.length; r++) "default" !== n[r] && v(e, t, n[r]);
						return A(e, t), e;
					});
					Object.defineProperty(e, "__esModule", { value: !0 });
					var S = y(n(203)), N = [
						"#EXTINF",
						"#EXT-X-BYTERANGE",
						"#EXT-X-DISCONTINUITY",
						"#EXT-X-STREAM-INF",
						"#EXT-X-CUE-OUT",
						"#EXT-X-CUE-IN",
						"#EXT-X-KEY",
						"#EXT-X-MAP"
					], m = ["#EXT-X-MEDIA"], X = function(t) {
						function e(t) {
							var n, r, a, i;
							return function(t, e) {
								if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function");
							}(this, e), n = c(this, e), r = n, i = void 0, (a = p(a = "baseUri")) in r ? Object.defineProperty(r, a, {
								value: i,
								enumerable: !0,
								configurable: !0,
								writable: !0
							}) : r[a] = i, n.baseUri = t, n;
						}
						return function(t, e) {
							if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
							t.prototype = Object.create(e && e.prototype, { constructor: {
								value: t,
								writable: !0,
								configurable: !0
							} }), Object.defineProperty(t, "prototype", { writable: !1 }), e && d(t, e);
						}(e, t), n = e, r = [{
							key: "push",
							value: function() {
								for (var t = this, n = arguments.length, r = new Array(n), a = 0; a < n; a++) r[a] = arguments[a];
								for (var i = function() {
									var n = s[o];
									if (!n.startsWith("#")) return l(e, "push", t, 3)([n]), 0;
									if (N.some((function(t) {
										return n.startsWith(t);
									}))) return l(e, "push", t, 3)([n]), 0;
									if (t.includes(n)) {
										if (m.some((function(t) {
											return n.startsWith(t);
										}))) return 0;
										S.INVALIDPLAYLIST("Redundant item (".concat(n, ")"));
									}
									l(e, "push", t, 3)([n]);
								}, o = 0, s = r; o < s.length; o++) i();
								return this.length;
							}
						}, {
							key: "join",
							value: function() {
								for (var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : ",", n = this.length - 1; n >= 0; n--) this[n] || this.splice(n, 1);
								return l(e, "join", this, 3)([t]);
							}
						}], r && u(n.prototype, r), a && u(n, a), Object.defineProperty(n, "prototype", { writable: !1 }), n;
						var n, r, a;
					}(f(Array));
					function g(t, e) {
						var n = 1e3;
						e && (n = Math.pow(10, e));
						var r = Math.round(t * n) / n;
						return e ? r.toFixed(e) : r;
					}
					function R(t) {
						var e = ["DATA-ID=\"".concat(t.id, "\"")];
						return t.language && e.push("LANGUAGE=\"".concat(t.language, "\"")), t.value ? e.push("VALUE=\"".concat(t.value, "\"")) : t.uri && e.push("URI=\"".concat(t.uri, "\"")), "#EXT-X-SESSION-DATA:".concat(e.join(","));
					}
					function b(t, e) {
						var n = e ? "#EXT-X-SESSION-KEY" : "#EXT-X-KEY", r = ["METHOD=".concat(t.method)];
						return t.uri && r.push("URI=\"".concat(t.uri, "\"")), t.iv && (16 !== t.iv.byteLength && S.INVALIDPLAYLIST("IV must be a 128-bit unsigned integer"), r.push("IV=".concat(S.byteSequenceToHex(t.iv)))), t.format && r.push("KEYFORMAT=\"".concat(t.format, "\"")), t.formatVersion && r.push("KEYFORMATVERSIONS=\"".concat(t.formatVersion, "\"")), "".concat(n, ":").concat(r.join(","));
					}
					function O(t, e) {
						var n = e.isIFrameOnly ? "#EXT-X-I-FRAME-STREAM-INF" : "#EXT-X-STREAM-INF", r = ["BANDWIDTH=".concat(e.bandwidth)];
						if (e.averageBandwidth && r.push("AVERAGE-BANDWIDTH=".concat(e.averageBandwidth)), e.isIFrameOnly && r.push("URI=\"".concat(e.uri, "\"")), e.codecs && r.push("CODECS=\"".concat(e.codecs, "\"")), e.resolution && r.push("RESOLUTION=".concat(e.resolution.width, "x").concat(e.resolution.height)), e.frameRate && r.push("FRAME-RATE=".concat(g(e.frameRate, 3))), e.hdcpLevel && r.push("HDCP-LEVEL=".concat(e.hdcpLevel)), e.audio.length > 0) {
							r.push("AUDIO=\"".concat(e.audio[0].groupId, "\""));
							var a, o = i(e.audio);
							try {
								for (o.s(); !(a = o.n()).done;) {
									var s = a.value;
									t.push(P(s));
								}
							} catch (t) {
								o.e(t);
							} finally {
								o.f();
							}
						}
						if (e.video.length > 0) {
							r.push("VIDEO=\"".concat(e.video[0].groupId, "\""));
							var u, c = i(e.video);
							try {
								for (c.s(); !(u = c.n()).done;) {
									var l = u.value;
									t.push(P(l));
								}
							} catch (t) {
								c.e(t);
							} finally {
								c.f();
							}
						}
						if (e.subtitles.length > 0) {
							r.push("SUBTITLES=\"".concat(e.subtitles[0].groupId, "\""));
							var T, f = i(e.subtitles);
							try {
								for (f.s(); !(T = f.n()).done;) {
									var E = T.value;
									t.push(P(E));
								}
							} catch (t) {
								f.e(t);
							} finally {
								f.f();
							}
						}
						if (S.getOptions().allowClosedCaptionsNone && 0 === e.closedCaptions.length) r.push("CLOSED-CAPTIONS=NONE");
						else if (e.closedCaptions.length > 0) {
							r.push("CLOSED-CAPTIONS=\"".concat(e.closedCaptions[0].groupId, "\""));
							var d, h = i(e.closedCaptions);
							try {
								for (h.s(); !(d = h.n()).done;) {
									var p = d.value;
									t.push(P(p));
								}
							} catch (t) {
								h.e(t);
							} finally {
								h.f();
							}
						}
						if (e.score && r.push("SCORE=".concat(e.score)), e.allowedCpc) {
							var I, v = [], A = i(e.allowedCpc);
							try {
								for (A.s(); !(I = A.n()).done;) {
									var y = I.value, N = y.format, m = y.cpcList;
									v.push("".concat(N, ":").concat(m.join("/")));
								}
							} catch (t) {
								A.e(t);
							} finally {
								A.f();
							}
							r.push("ALLOWED-CPC=\"".concat(v.join(","), "\""));
						}
						e.videoRange && r.push("VIDEO-RANGE=".concat(e.videoRange)), e.stableVariantId && r.push("STABLE-VARIANT-ID=\"".concat(e.stableVariantId, "\"")), e.pathwayId && r.push("PATHWAY-ID=\"".concat(e.pathwayId, "\"")), e.programId && r.push("PROGRAM-ID=".concat(e.programId)), t.push("".concat(n, ":").concat(r.join(","))), e.isIFrameOnly || t.push("".concat(e.uri));
					}
					function P(t) {
						var e = [
							"TYPE=".concat(t.type),
							"GROUP-ID=\"".concat(t.groupId, "\""),
							"NAME=\"".concat(t.name, "\"")
						];
						return void 0 !== t.isDefault && e.push("DEFAULT=".concat(t.isDefault ? "YES" : "NO")), void 0 !== t.autoselect && e.push("AUTOSELECT=".concat(t.autoselect ? "YES" : "NO")), void 0 !== t.forced && e.push("FORCED=".concat(t.forced ? "YES" : "NO")), t.language && e.push("LANGUAGE=\"".concat(t.language, "\"")), t.assocLanguage && e.push("ASSOC-LANGUAGE=\"".concat(t.assocLanguage, "\"")), t.instreamId && e.push("INSTREAM-ID=\"".concat(t.instreamId, "\"")), t.characteristics && e.push("CHARACTERISTICS=\"".concat(t.characteristics, "\"")), t.channels && e.push("CHANNELS=\"".concat(t.channels, "\"")), t.uri && e.push("URI=\"".concat(t.uri, "\"")), "#EXT-X-MEDIA:".concat(e.join(","));
					}
					function D(t, e, n, r) {
						var a, o, s, u = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : 1, c = !1, l = "";
						if (e.discontinuity && t.push("#EXT-X-DISCONTINUITY"), e.gap && t.push("#EXT-X-GAP"), e.key) {
							var T = b(e.key);
							T !== n && (t.push(T), n = T);
						}
						if (e.map) {
							var f = function(t) {
								var e = ["URI=\"".concat(t.uri, "\"")];
								t.byterange && e.push("BYTERANGE=\"".concat(L(t.byterange), "\""));
								return "#EXT-X-MAP:".concat(e.join(","));
							}(e.map);
							f !== r && (t.push(f), r = f);
						}
						if (e.programDateTime && t.push("#EXT-X-PROGRAM-DATE-TIME:".concat(S.formatDate(e.programDateTime))), e.dateRange && t.push(C(e.dateRange)), e.markers.length > 0 && (l = function(t, e) {
							var n, r = "", a = i(e);
							try {
								for (a.s(); !(n = a.n()).done;) {
									var o = n.value;
									if ("OUT" === o.type) r = "OUT", t.push("#EXT-X-CUE-OUT:DURATION=".concat(o.duration));
									else if ("IN" === o.type) r = "IN", t.push("#EXT-X-CUE-IN");
									else if ("RAW" === o.type) {
										var s = o.value ? ":".concat(o.value) : "";
										t.push("#".concat(o.tagName).concat(s));
									}
								}
							} catch (t) {
								a.e(t);
							} finally {
								a.f();
							}
							return r;
						}(t, e.markers)), e.parts.length > 0 && (c = function(t, e) {
							var n, r = !1, a = i(e);
							try {
								for (a.s(); !(n = a.n()).done;) {
									var o = n.value;
									if (o.hint) {
										var s = [];
										if (s.push("TYPE=PART", "URI=\"".concat(o.uri, "\"")), o.byterange) {
											var u = o.byterange, c = u.offset, l = u.length;
											s.push("BYTERANGE-START=".concat(c)), l && s.push("BYTERANGE-LENGTH=".concat(l));
										}
										t.push("#EXT-X-PRELOAD-HINT:".concat(s.join(","))), r = !0;
									} else {
										var T = [];
										T.push("DURATION=".concat(o.duration), "URI=\"".concat(o.uri, "\"")), o.byterange && T.push("BYTERANGE=".concat(L(o.byterange))), o.independent && T.push("INDEPENDENT=YES"), o.gap && T.push("GAP=YES"), t.push("#EXT-X-PART:".concat(T.join(",")));
									}
								}
							} catch (t) {
								a.e(t);
							} finally {
								a.f();
							}
							return r;
						}(t, e.parts)), c) return [n, r];
						if ("number" == typeof e.duration && !Number.isNaN(e.duration)) {
							var E = u < 3 ? Math.round(e.duration) : g(e.duration, (a = e.duration, o = a.toString(10), -1 === (s = o.indexOf(".")) ? 0 : o.length - s - 1));
							t.push("#EXTINF:".concat(E, ",").concat(unescape(encodeURIComponent(e.title || ""))));
						}
						return e.byterange && t.push("#EXT-X-BYTERANGE:".concat(L(e.byterange))), Array.prototype.push.call(t, "".concat(e.uri)), [
							n,
							r,
							l
						];
					}
					function L(t) {
						var e = t.offset, n = t.length;
						return "".concat(n, "@").concat(e);
					}
					function C(t) {
						var e = ["ID=\"".concat(t.id, "\"")];
						t.start && e.push("START-DATE=\"".concat(S.formatDate(t.start), "\"")), t.cue && e.push("CUE=\"".concat(t.cue, "\"")), t.end && e.push("END-DATE=\"".concat(S.formatDate(t.end), "\"")), t.duration && e.push("DURATION=".concat(t.duration)), t.plannedDuration && e.push("PLANNED-DURATION=".concat(t.plannedDuration)), t.classId && e.push("CLASS=\"".concat(t.classId, "\"")), t.endOnNext && e.push("END-ON-NEXT=YES");
						for (var n = 0, r = Object.keys(t.attributes); n < r.length; n++) {
							var a = r[n];
							a.startsWith("X-") ? "number" == typeof t.attributes[a] ? e.push("".concat(a, "=").concat(t.attributes[a])) : e.push("".concat(a, "=\"").concat(t.attributes[a], "\"")) : a.startsWith("SCTE35-") && e.push("".concat(a, "=").concat(S.byteSequenceToHex(t.attributes[a])));
						}
						return "#EXT-X-DATERANGE:".concat(e.join(","));
					}
					function M(t) {
						var e = [];
						for (var n in t) e.push("".concat(n, "=\"").concat(t[n], "\""));
						return "#EXT-X-DEFINE:".concat(e.join(","));
					}
					e.default = function(t, e) {
						S.PARAMCHECK(t), S.ASSERT("Not a playlist", "playlist" === t.type);
						var n = new X(t.uri);
						if (n.push("#EXTM3U"), t.version && n.push("#EXT-X-VERSION:".concat(t.version)), t.independentSegments && n.push("#EXT-X-INDEPENDENT-SEGMENTS"), t.start && n.push("#EXT-X-START:TIME-OFFSET=".concat(g(t.start.offset)).concat(t.start.precise ? ",PRECISE=YES" : "")), t.defines) {
							var r, o = i(t.defines);
							try {
								for (o.s(); !(r = o.n()).done;) {
									var s = r.value;
									n.push(M(s));
								}
							} catch (t) {
								o.e(t);
							} finally {
								o.f();
							}
						}
						return t.isMasterPlaylist ? function(t, e, n) {
							var r, o;
							e.contentSteering && t.push((r = e.contentSteering, o = ["SERVER-URI=\"".concat(r.serverUri, "\""), "PATHWAY-ID=\"".concat(r.pathwayId, "\"")], "#EXT-X-CONTENT-STEERING:".concat(o.join(","))));
							var s, u = i(e.sessionDataList);
							try {
								for (u.s(); !(s = u.n()).done;) {
									var c = s.value;
									t.push(R(c));
								}
							} catch (t) {
								u.e(t);
							} finally {
								u.f();
							}
							var l, T = i(e.sessionKeyList);
							try {
								for (T.s(); !(l = T.n()).done;) {
									var f = l.value;
									t.push(b(f, !0));
								}
							} catch (t) {
								T.e(t);
							} finally {
								T.f();
							}
							var E, d = i(e.variants.entries());
							try {
								for (d.s(); !(E = d.n()).done;) {
									var h = a(E.value, 2), p = h[0], I = h[1], v = t.length;
									O(t, I), null != n && n.variantProcessor && n.variantProcessor(t, v, t.length - 1, I, p);
								}
							} catch (t) {
								d.e(t);
							} finally {
								d.f();
							}
						}(n, t, e) : function(t, e, n) {
							var r = "", o = "", s = !1;
							if (e.targetDuration && t.push("#EXT-X-TARGETDURATION:".concat(e.targetDuration)), e.lowLatencyCompatibility) {
								var u = e.lowLatencyCompatibility, c = u.canBlockReload, l = u.canSkipUntil, T = u.holdBack, f = u.partHoldBack, E = [];
								E.push("CAN-BLOCK-RELOAD=".concat(c ? "YES" : "NO")), void 0 !== l && E.push("CAN-SKIP-UNTIL=".concat(l)), void 0 !== T && E.push("HOLD-BACK=".concat(T)), void 0 !== f && E.push("PART-HOLD-BACK=".concat(f)), t.push("#EXT-X-SERVER-CONTROL:".concat(E.join(",")));
							}
							e.partTargetDuration && t.push("#EXT-X-PART-INF:PART-TARGET=".concat(e.partTargetDuration)), e.mediaSequenceBase && t.push("#EXT-X-MEDIA-SEQUENCE:".concat(e.mediaSequenceBase)), e.discontinuitySequenceBase && t.push("#EXT-X-DISCONTINUITY-SEQUENCE:".concat(e.discontinuitySequenceBase)), e.playlistType && t.push("#EXT-X-PLAYLIST-TYPE:".concat(e.playlistType)), e.isIFrame && t.push("#EXT-X-I-FRAMES-ONLY"), e.skip > 0 && t.push("#EXT-X-SKIP:SKIPPED-SEGMENTS=".concat(e.skip));
							var d, h = i(e.dateRanges);
							try {
								for (h.s(); !(d = h.n()).done;) {
									var p = d.value;
									t.push(C(p));
								}
							} catch (t) {
								h.e(t);
							} finally {
								h.f();
							}
							var I, v = i(e.segments.entries());
							try {
								for (v.s(); !(I = v.n()).done;) {
									var A, y = a(I.value, 2), N = y[0], m = y[1], X = t.length, g = a(D(t, m, r, o, e.version), 3);
									r = g[0], o = g[1], "OUT" === (A = g[2]) ? s = !0 : "IN" === A && s && (s = !1), null != n && n.segmentProcessor && n.segmentProcessor(t, X, t.length - 1, m, N);
								}
							} catch (t) {
								v.e(t);
							} finally {
								v.f();
							}
							"VOD" === e.playlistType && s && t.push("#EXT-X-CUE-IN"), e.prefetchSegments.length > 2 && S.INVALIDPLAYLIST("The server must deliver no more than two prefetch segments");
							var R, b = i(e.prefetchSegments);
							try {
								for (b.s(); !(R = b.n()).done;) {
									var O = R.value;
									O.discontinuity && t.push("#EXT-X-PREFETCH-DISCONTINUITY"), t.push("#EXT-X-PREFETCH:".concat(O.uri));
								}
							} catch (t) {
								b.e(t);
							} finally {
								b.f();
							}
							e.endlist && t.push("#EXT-X-ENDLIST");
							var P, L = i(e.renditionReports);
							try {
								for (L.s(); !(P = L.n()).done;) {
									var M = P.value, U = [];
									U.push("URI=\"".concat(M.uri, "\""), "LAST-MSN=".concat(M.lastMSN)), void 0 !== M.lastPart && U.push("LAST-PART=".concat(M.lastPart)), t.push("#EXT-X-RENDITION-REPORT:".concat(U.join(",")));
								}
							} catch (t) {
								L.e(t);
							} finally {
								L.f();
							}
						}(n, t, e), n.join("\n");
					};
				},
				31(t, e, n) {
					function r(t) {
						return r = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
							return typeof t;
						} : function(t) {
							return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
						}, r(t);
					}
					function a(t, e) {
						var n = Object.keys(t);
						if (Object.getOwnPropertySymbols) {
							var r = Object.getOwnPropertySymbols(t);
							e && (r = r.filter((function(e) {
								return Object.getOwnPropertyDescriptor(t, e).enumerable;
							}))), n.push.apply(n, r);
						}
						return n;
					}
					function i(t) {
						for (var e = 1; e < arguments.length; e++) {
							var n = null != arguments[e] ? arguments[e] : {};
							e % 2 ? a(Object(n), !0).forEach((function(e) {
								d(t, e, n[e]);
							})) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : a(Object(n)).forEach((function(e) {
								Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(n, e));
							}));
						}
						return t;
					}
					function o(t, e, n) {
						return e = u(e), function(t, e) {
							if (e && ("object" == r(e) || "function" == typeof e)) return e;
							if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
							return function(t) {
								if (void 0 === t) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
								return t;
							}(t);
						}(t, s() ? Reflect.construct(e, n || [], u(t).constructor) : e.apply(t, n));
					}
					function s() {
						try {
							var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {})));
						} catch (t) {}
						return (s = function() {
							return !!t;
						})();
					}
					function u(t) {
						return u = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
							return t.__proto__ || Object.getPrototypeOf(t);
						}, u(t);
					}
					function c(t, e) {
						if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
						t.prototype = Object.create(e && e.prototype, { constructor: {
							value: t,
							writable: !0,
							configurable: !0
						} }), Object.defineProperty(t, "prototype", { writable: !1 }), e && l(t, e);
					}
					function l(t, e) {
						return l = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
							return t.__proto__ = e, t;
						}, l(t, e);
					}
					function T(t, e) {
						for (var n = 0; n < e.length; n++) {
							var r = e[n];
							r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(t, h(r.key), r);
						}
					}
					function f(t, e, n) {
						return e && T(t.prototype, e), n && T(t, n), Object.defineProperty(t, "prototype", { writable: !1 }), t;
					}
					function E(t, e) {
						if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function");
					}
					function d(t, e, n) {
						return (e = h(e)) in t ? Object.defineProperty(t, e, {
							value: n,
							enumerable: !0,
							configurable: !0,
							writable: !0
						}) : t[e] = n, t;
					}
					function h(t) {
						var e = function(t, e) {
							if ("object" != r(t) || !t) return t;
							var n = t[Symbol.toPrimitive];
							if (void 0 !== n) {
								var a = n.call(t, e || "default");
								if ("object" != r(a)) return a;
								throw new TypeError("@@toPrimitive must return a primitive value.");
							}
							return ("string" === e ? String : Number)(t);
						}(t, "string");
						return "symbol" == r(e) ? e : e + "";
					}
					var p, I = this && this.__createBinding || (Object.create ? function(t, e, n, r) {
						void 0 === r && (r = n);
						var a = Object.getOwnPropertyDescriptor(e, n);
						a && !("get" in a ? !e.__esModule : a.writable || a.configurable) || (a = {
							enumerable: !0,
							get: function() {
								return e[n];
							}
						}), Object.defineProperty(t, r, a);
					} : function(t, e, n, r) {
						void 0 === r && (r = n), t[r] = e[n];
					}), v = this && this.__setModuleDefault || (Object.create ? function(t, e) {
						Object.defineProperty(t, "default", {
							enumerable: !0,
							value: e
						});
					} : function(t, e) {
						t.default = e;
					}), A = this && this.__importStar || (p = function(t) {
						return p = Object.getOwnPropertyNames || function(t) {
							var e = [];
							for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[e.length] = n);
							return e;
						}, p(t);
					}, function(t) {
						if (t && t.__esModule) return t;
						var e = {};
						if (null != t) for (var n = p(t), r = 0; r < n.length; r++) "default" !== n[r] && I(e, t, n[r]);
						return v(e, t), e;
					});
					Object.defineProperty(e, "__esModule", { value: !0 }), e.ContentSteering = e.RenditionReport = e.PrefetchSegment = e.PartialSegment = e.Segment = e.MediaPlaylist = e.MasterPlaylist = e.Playlist = e.SpliceInfo = e.DateRange = e.MediaInitializationSection = e.Key = e.SessionData = e.Variant = e.Rendition = void 0;
					var y = A(n(203));
					e.Rendition = f((function t(e) {
						var n = e.type, r = e.uri, a = e.groupId, i = e.language, o = e.assocLanguage, s = e.name, u = e.isDefault, c = e.autoselect, l = e.forced, T = e.instreamId, f = e.characteristics, h = e.channels, p = e.pathwayId;
						E(this, t), d(this, "type", void 0), d(this, "uri", void 0), d(this, "groupId", void 0), d(this, "language", void 0), d(this, "assocLanguage", void 0), d(this, "name", void 0), d(this, "isDefault", void 0), d(this, "autoselect", void 0), d(this, "forced", void 0), d(this, "instreamId", void 0), d(this, "characteristics", void 0), d(this, "channels", void 0), d(this, "pathwayId", void 0), y.PARAMCHECK(n, a, s), y.CONDITIONALASSERT(["SUBTITLES" === n, r], ["CLOSED-CAPTIONS" === n, T], ["CLOSED-CAPTIONS" === n, !r], [l, "SUBTITLES" === n]), this.type = n, this.uri = r, this.groupId = a, this.language = i, this.assocLanguage = o, this.name = s, this.isDefault = u, this.autoselect = c, this.forced = l, this.instreamId = T, this.characteristics = f, this.channels = h, this.pathwayId = p;
					}));
					e.Variant = f((function t(e) {
						var n = e.uri, r = e.isIFrameOnly, a = void 0 !== r && r, i = e.bandwidth, o = e.averageBandwidth, s = e.score, u = e.codecs, c = e.resolution, l = e.frameRate, T = e.hdcpLevel, f = e.allowedCpc, h = e.videoRange, p = e.stableVariantId, I = e.pathwayId, v = e.programId, A = e.audio, S = void 0 === A ? [] : A, N = e.video, m = void 0 === N ? [] : N, X = e.subtitles, g = void 0 === X ? [] : X, R = e.closedCaptions, b = void 0 === R ? [] : R, O = e.currentRenditions, P = void 0 === O ? {
							audio: 0,
							video: 0,
							subtitles: 0,
							closedCaptions: 0
						} : O;
						E(this, t), d(this, "uri", void 0), d(this, "isIFrameOnly", void 0), d(this, "bandwidth", void 0), d(this, "averageBandwidth", void 0), d(this, "score", void 0), d(this, "codecs", void 0), d(this, "resolution", void 0), d(this, "frameRate", void 0), d(this, "hdcpLevel", void 0), d(this, "allowedCpc", void 0), d(this, "videoRange", void 0), d(this, "stableVariantId", void 0), d(this, "pathwayId", void 0), d(this, "programId", void 0), d(this, "audio", void 0), d(this, "video", void 0), d(this, "subtitles", void 0), d(this, "closedCaptions", void 0), d(this, "currentRenditions", void 0), y.PARAMCHECK(n, i), this.uri = n, this.isIFrameOnly = a, this.bandwidth = i, this.averageBandwidth = o, this.score = s, this.codecs = u, this.resolution = c, this.frameRate = l, this.hdcpLevel = T, this.allowedCpc = f, this.videoRange = h, this.stableVariantId = p, this.pathwayId = I, this.programId = v, this.audio = S, this.video = m, this.subtitles = g, this.closedCaptions = b, this.currentRenditions = P;
					}));
					e.SessionData = f((function t(e) {
						var n = e.id, r = e.value, a = e.uri, i = e.language;
						E(this, t), d(this, "id", void 0), d(this, "value", void 0), d(this, "uri", void 0), d(this, "language", void 0), y.PARAMCHECK(n, r || a), y.ASSERT("SessionData cannot have both value and uri, shoud be either.", !(r && a)), this.id = n, this.value = r, this.uri = a, this.language = i;
					}));
					e.Key = f((function t(e) {
						var n = e.method, r = e.uri, a = e.iv, i = e.format, o = e.formatVersion;
						E(this, t), d(this, "method", void 0), d(this, "uri", void 0), d(this, "iv", void 0), d(this, "format", void 0), d(this, "formatVersion", void 0), y.PARAMCHECK(n), y.CONDITIONALPARAMCHECK(["NONE" !== n, r]), y.CONDITIONALASSERT(["NONE" === n, !(r || a || i || o)]), this.method = n, this.uri = r, this.iv = a, this.format = i, this.formatVersion = o;
					}));
					e.ContentSteering = f((function t(e) {
						var n = e.serverUri, r = e.pathwayId;
						E(this, t), d(this, "serverUri", void 0), d(this, "pathwayId", void 0), this.serverUri = n, this.pathwayId = r;
					}));
					e.MediaInitializationSection = f((function t(e) {
						var n = e.hint, r = void 0 !== n && n, a = e.uri, i = e.mimeType, o = e.byterange;
						E(this, t), d(this, "hint", void 0), d(this, "uri", void 0), d(this, "mimeType", void 0), d(this, "byterange", void 0), y.PARAMCHECK(a), this.hint = r, this.uri = a, this.mimeType = i, this.byterange = o;
					}));
					e.DateRange = f((function t(e) {
						var n = e.id, r = e.classId, a = e.start, i = e.cue, o = e.end, s = e.duration, u = e.plannedDuration, c = e.endOnNext, l = e.attributes, T = void 0 === l ? {} : l;
						E(this, t), d(this, "id", void 0), d(this, "classId", void 0), d(this, "start", void 0), d(this, "cue", void 0), d(this, "end", void 0), d(this, "duration", void 0), d(this, "plannedDuration", void 0), d(this, "endOnNext", void 0), d(this, "attributes", void 0), y.PARAMCHECK(n), y.CONDITIONALPARAMCHECK([!0 === c, r]), y.CONDITIONALASSERT([o, a], [o, a <= o], [s, s >= 0], [u, u >= 0]), this.id = n, this.classId = r, this.start = a, this.cue = i, this.end = o, this.duration = s, this.plannedDuration = u, this.endOnNext = c, this.attributes = T;
					}));
					e.SpliceInfo = f((function t(e) {
						var n = e.type, r = e.duration, a = e.tagName, i = e.value;
						E(this, t), d(this, "type", void 0), d(this, "duration", void 0), d(this, "tagName", void 0), d(this, "value", void 0), y.PARAMCHECK(n), y.CONDITIONALPARAMCHECK(["OUT" === n, r]), y.CONDITIONALPARAMCHECK(["RAW" === n, a]), this.type = n, this.duration = r, this.tagName = a, this.value = i;
					}));
					var P = f((function t(e) {
						E(this, t), d(this, "type", void 0), y.PARAMCHECK(e), this.type = e;
					})), D = function(t) {
						function e(t) {
							var n, r = t.isMasterPlaylist, a = t.uri, i = t.version, s = t.independentSegments, u = void 0 !== s && s, c = t.start, l = t.source, T = t.defines;
							return E(this, e), d(n = o(this, e, ["playlist"]), "isMasterPlaylist", void 0), d(n, "uri", void 0), d(n, "version", void 0), d(n, "independentSegments", void 0), d(n, "start", void 0), d(n, "source", void 0), d(n, "defines", void 0), y.PARAMCHECK(r), n.isMasterPlaylist = r, n.uri = a, n.version = i, n.independentSegments = u, n.start = c, n.source = l, n.defines = T, n;
						}
						return c(e, t), f(e);
					}(P);
					e.Playlist = D;
					e.MasterPlaylist = function(t) {
						function e() {
							var t, n = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
							E(this, e), d(t = o(this, e, [i(i({}, n), {}, { isMasterPlaylist: !0 })]), "variants", void 0), d(t, "currentVariant", void 0), d(t, "sessionDataList", void 0), d(t, "sessionKeyList", void 0), d(t, "contentSteering", void 0);
							var r = n.variants, a = void 0 === r ? [] : r, s = n.currentVariant, u = n.sessionDataList, c = void 0 === u ? [] : u, l = n.sessionKeyList, T = void 0 === l ? [] : l, f = n.contentSteering, h = void 0 === f ? void 0 : f;
							return t.variants = a, t.currentVariant = s, t.sessionDataList = c, t.sessionKeyList = T, t.contentSteering = h, t;
						}
						return c(e, t), f(e);
					}(D);
					e.MediaPlaylist = function(t) {
						function e() {
							var t, n = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
							E(this, e), d(t = o(this, e, [i(i({}, n), {}, { isMasterPlaylist: !1 })]), "targetDuration", void 0), d(t, "mediaSequenceBase", void 0), d(t, "discontinuitySequenceBase", void 0), d(t, "endlist", void 0), d(t, "playlistType", void 0), d(t, "isIFrame", void 0), d(t, "dateRanges", void 0), d(t, "segments", void 0), d(t, "prefetchSegments", void 0), d(t, "lowLatencyCompatibility", void 0), d(t, "partTargetDuration", void 0), d(t, "renditionReports", void 0), d(t, "skip", void 0), d(t, "hash", void 0);
							var r = n.targetDuration, a = n.mediaSequenceBase, s = void 0 === a ? 0 : a, u = n.discontinuitySequenceBase, c = void 0 === u ? 0 : u, l = n.endlist, T = void 0 !== l && l, f = n.playlistType, h = n.isIFrame, p = n.dateRanges, I = void 0 === p ? [] : p, v = n.segments, A = void 0 === v ? [] : v, y = n.prefetchSegments, S = void 0 === y ? [] : y, N = n.lowLatencyCompatibility, m = n.partTargetDuration, X = n.renditionReports, g = void 0 === X ? [] : X, R = n.skip, b = void 0 === R ? 0 : R, O = n.hash;
							return t.targetDuration = r, t.mediaSequenceBase = s, t.discontinuitySequenceBase = c, t.endlist = T, t.playlistType = f, t.isIFrame = h, t.dateRanges = I, t.segments = A, t.prefetchSegments = S, t.lowLatencyCompatibility = N, t.partTargetDuration = m, t.renditionReports = g, t.skip = b, t.hash = O, t;
						}
						return c(e, t), f(e);
					}(D);
					e.Segment = function(t) {
						function e(t) {
							var n, r = t.uri, a = t.mimeType, i = t.data, s = t.duration, u = t.title, c = t.byterange, l = t.discontinuity, T = t.mediaSequenceNumber, f = void 0 === T ? 0 : T, h = t.discontinuitySequence, p = void 0 === h ? 0 : h, I = t.key, v = t.map, A = t.programDateTime, y = t.dateRange, S = t.markers, N = void 0 === S ? [] : S, m = t.parts, X = void 0 === m ? [] : m, g = t.gap;
							return E(this, e), d(n = o(this, e, ["segment"]), "uri", void 0), d(n, "mimeType", void 0), d(n, "data", void 0), d(n, "duration", void 0), d(n, "title", void 0), d(n, "byterange", void 0), d(n, "discontinuity", void 0), d(n, "mediaSequenceNumber", void 0), d(n, "discontinuitySequence", void 0), d(n, "key", void 0), d(n, "map", void 0), d(n, "programDateTime", void 0), d(n, "dateRange", void 0), d(n, "markers", void 0), d(n, "parts", void 0), d(n, "gap", void 0), n.uri = r, n.mimeType = a, n.data = i, n.duration = s, n.title = u, n.byterange = c, n.discontinuity = l, n.mediaSequenceNumber = f, n.discontinuitySequence = p, n.key = I, n.map = v, n.programDateTime = A, n.dateRange = y, n.markers = N, n.parts = X, n.gap = g, n;
						}
						return c(e, t), f(e);
					}(P);
					e.PartialSegment = function(t) {
						function e(t) {
							var n, r = t.hint, a = void 0 !== r && r, i = t.uri, s = t.duration, u = t.independent, c = t.byterange, l = t.gap;
							return E(this, e), d(n = o(this, e, ["part"]), "hint", void 0), d(n, "uri", void 0), d(n, "duration", void 0), d(n, "independent", void 0), d(n, "byterange", void 0), d(n, "gap", void 0), y.PARAMCHECK(i), n.hint = a, n.uri = i, n.duration = s, n.independent = u, n.duration = s, n.byterange = c, n.gap = l, n;
						}
						return c(e, t), f(e);
					}(P);
					e.PrefetchSegment = function(t) {
						function e(t) {
							var n, r = t.uri, a = t.discontinuity, i = t.mediaSequenceNumber, s = void 0 === i ? 0 : i, u = t.discontinuitySequence, c = void 0 === u ? 0 : u, l = t.key;
							return E(this, e), d(n = o(this, e, ["prefetch"]), "uri", void 0), d(n, "discontinuity", void 0), d(n, "mediaSequenceNumber", void 0), d(n, "discontinuitySequence", void 0), d(n, "key", void 0), y.PARAMCHECK(r), n.uri = r, n.discontinuity = a, n.mediaSequenceNumber = s, n.discontinuitySequence = c, n.key = l, n;
						}
						return c(e, t), f(e);
					}(P);
					e.RenditionReport = f((function t(e) {
						var n = e.uri, r = e.lastMSN, a = e.lastPart;
						E(this, t), d(this, "uri", void 0), d(this, "lastMSN", void 0), d(this, "lastPart", void 0), y.PARAMCHECK(n), this.uri = n, this.lastMSN = r, this.lastPart = a;
					}));
				},
				203(t, e) {
					function n(t, e) {
						return function(t) {
							if (Array.isArray(t)) return t;
						}(t) || function(t, e) {
							var n = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
							if (null != n) {
								var r, a, i, o, s = [], u = !0, c = !1;
								try {
									if (i = (n = n.call(t)).next, 0 === e) {
										if (Object(n) !== n) return;
										u = !1;
									} else for (; !(u = (r = i.call(n)).done) && (s.push(r.value), s.length !== e); u = !0);
								} catch (t) {
									c = !0, a = t;
								} finally {
									try {
										if (!u && null != n.return && (o = n.return(), Object(o) !== o)) return;
									} finally {
										if (c) throw a;
									}
								}
								return s;
							}
						}(t, e) || a(t, e) || function() {
							throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
						}();
					}
					function r(t, e) {
						var n = "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
						if (!n) {
							if (Array.isArray(t) || (n = a(t)) || e && t && "number" == typeof t.length) {
								n && (t = n);
								var r = 0, i = function() {};
								return {
									s: i,
									n: function() {
										return r >= t.length ? { done: !0 } : {
											done: !1,
											value: t[r++]
										};
									},
									e: function(t) {
										throw t;
									},
									f: i
								};
							}
							throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
						}
						var o, s = !0, u = !1;
						return {
							s: function() {
								n = n.call(t);
							},
							n: function() {
								var t = n.next();
								return s = t.done, t;
							},
							e: function(t) {
								u = !0, o = t;
							},
							f: function() {
								try {
									s || null == n.return || n.return();
								} finally {
									if (u) throw o;
								}
							}
						};
					}
					function a(t, e) {
						if (t) {
							if ("string" == typeof t) return i(t, e);
							var n = {}.toString.call(t).slice(8, -1);
							return "Object" === n && t.constructor && (n = t.constructor.name), "Map" === n || "Set" === n ? Array.from(t) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? i(t, e) : void 0;
						}
					}
					function i(t, e) {
						(null == e || e > t.length) && (e = t.length);
						for (var n = 0, r = Array(e); n < e; n++) r[n] = t[n];
						return r;
					}
					Object.defineProperty(e, "__esModule", { value: !0 }), e.THROW = s, e.ASSERT = function(t) {
						for (var e = arguments.length, a = new Array(e > 1 ? e - 1 : 0), i = 1; i < e; i++) a[i - 1] = arguments[i];
						var o, u = r(a.entries());
						try {
							for (u.s(); !(o = u.n()).done;) {
								var c = n(o.value, 2), l = c[0];
								c[1] || s(new Error("".concat(t, " : Failed at [").concat(l, "]")));
							}
						} catch (t) {
							u.e(t);
						} finally {
							u.f();
						}
					}, e.CONDITIONALASSERT = function() {
						for (var t = arguments.length, e = new Array(t), a = 0; a < t; a++) e[a] = arguments[a];
						var i, o = r(e.entries());
						try {
							for (o.s(); !(i = o.n()).done;) {
								var u = n(i.value, 2), c = u[0], l = n(u[1], 2), T = l[0], f = l[1];
								T && (f || s(new Error("Conditional Assert : Failed at [".concat(c, "]"))));
							}
						} catch (t) {
							o.e(t);
						} finally {
							o.f();
						}
					}, e.PARAMCHECK = function() {
						for (var t = arguments.length, e = new Array(t), a = 0; a < t; a++) e[a] = arguments[a];
						var i, o = r(e.entries());
						try {
							for (o.s(); !(i = o.n()).done;) {
								var u = n(i.value, 2), c = u[0];
								void 0 === u[1] && s(new Error("Param Check : Failed at [".concat(c, "]")));
							}
						} catch (t) {
							o.e(t);
						} finally {
							o.f();
						}
					}, e.CONDITIONALPARAMCHECK = function() {
						for (var t = arguments.length, e = new Array(t), a = 0; a < t; a++) e[a] = arguments[a];
						var i, o = r(e.entries());
						try {
							for (o.s(); !(i = o.n()).done;) {
								var u = n(i.value, 2), c = u[0], l = n(u[1], 2), T = l[0], f = l[1];
								T && void 0 === f && s(new Error("Conditional Param Check : Failed at [".concat(c, "]")));
							}
						} catch (t) {
							o.e(t);
						} finally {
							o.f();
						}
					}, e.INVALIDPLAYLIST = function(t) {
						s(new Error("Invalid Playlist : ".concat(t)));
					}, e.toNumber = function(t) {
						var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 10;
						if ("number" == typeof t) return t;
						var n = 10 === e ? Number.parseFloat(t) : Number.parseInt(t, e);
						if (Number.isNaN(n)) return 0;
						return n;
					}, e.hexToByteSequence = function(t) {
						(t.startsWith("0x") || t.startsWith("0X")) && (t = t.slice(2));
						for (var e = new Uint8Array(t.length / 2), n = 0; n < t.length; n += 2) e[n / 2] = Number.parseInt(t.slice(n, n + 2), 16);
						return e;
					}, e.byteSequenceToHex = function(t) {
						var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0, n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : t.byteLength;
						n <= e && s(new Error("end must be larger than start : start=".concat(e, ", end=").concat(n)));
						for (var r = [], a = e; a < n; a++) r.push("0".concat((255 & t[a]).toString(16).toUpperCase()).slice(-2));
						return "0x".concat(r.join(""));
					}, e.tryCatch = function(t, e) {
						try {
							return t();
						} catch (t) {
							return e(t);
						}
					}, e.splitAt = function(t, e) {
						for (var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0, r = -1, a = 0, i = 0; a < t.length; a++) if (t[a] === e) {
							if (i++ === n) return [t.slice(0, a), t.slice(a + 1)];
							r = a;
						}
						if (-1 !== r) return [t.slice(0, r), t.slice(r + 1)];
						return [t];
					}, e.trim = function(t) {
						var e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : " ";
						if (!t) return t;
						if (t = t.trim(), " " === e) return t;
						t.startsWith(e) && (t = t.slice(1));
						t.endsWith(e) && (t = t.slice(0, -1));
						return t;
					}, e.splitByCommaWithPreservingQuotes = function(t) {
						for (var e = [], n = !0, r = 0, a = [], i = 0; i < t.length; i++) {
							var o = t[i];
							n && "," === o ? (e.push(t.slice(r, i).trim()), r = i + 1) : "\"" !== o && "'" !== o || (n ? (a.push(o), n = !1) : o === a.at(-1) ? (a.pop(), n = !0) : a.push(o));
						}
						return e.push(t.slice(r).trim()), e;
					}, e.camelify = function(t) {
						var e, n = [], a = !1, i = r(t);
						try {
							for (i.s(); !(e = i.n()).done;) {
								var o = e.value;
								"-" !== o && "_" !== o ? a ? (n.push(o.toUpperCase()), a = !1) : n.push(o.toLowerCase()) : a = !0;
							}
						} catch (t) {
							i.e(t);
						} finally {
							i.f();
						}
						return n.join("");
					}, e.formatDate = function(t) {
						var e = t.getUTCFullYear(), n = ("0" + (t.getUTCMonth() + 1)).slice(-2), r = ("0" + t.getUTCDate()).slice(-2), a = ("0" + t.getUTCHours()).slice(-2), i = ("0" + t.getUTCMinutes()).slice(-2), o = ("0" + t.getUTCSeconds()).slice(-2), s = ("00" + t.getUTCMilliseconds()).slice(-3);
						return "".concat(e, "-").concat(n, "-").concat(r, "T").concat(a, ":").concat(i, ":").concat(o, ".").concat(s, "Z");
					}, e.hasOwnProp = function(t, e) {
						return Object.hasOwn(t, e);
					}, e.setOptions = function() {
						var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
						o = Object.assign(o, t);
					}, e.getOptions = function() {
						return Object.assign({}, o);
					};
					var o = {};
					function s(t) {
						if (o.strictMode) throw t;
						o.silent || console.error(t.message);
					}
				},
				73(t, e, n) {
					var r, a = this && this.__createBinding || (Object.create ? function(t, e, n, r) {
						void 0 === r && (r = n);
						var a = Object.getOwnPropertyDescriptor(e, n);
						a && !("get" in a ? !e.__esModule : a.writable || a.configurable) || (a = {
							enumerable: !0,
							get: function() {
								return e[n];
							}
						}), Object.defineProperty(t, r, a);
					} : function(t, e, n, r) {
						void 0 === r && (r = n), t[r] = e[n];
					}), i = this && this.__setModuleDefault || (Object.create ? function(t, e) {
						Object.defineProperty(t, "default", {
							enumerable: !0,
							value: e
						});
					} : function(t, e) {
						t.default = e;
					}), o = this && this.__importStar || (r = function(t) {
						return r = Object.getOwnPropertyNames || function(t) {
							var e = [];
							for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[e.length] = n);
							return e;
						}, r(t);
					}, function(t) {
						if (t && t.__esModule) return t;
						var e = {};
						if (null != t) for (var n = r(t), o = 0; o < n.length; o++) "default" !== n[o] && a(e, t, n[o]);
						return i(e, t), e;
					}), s = this && this.__importDefault || function(t) {
						return t && t.__esModule ? t : { default: t };
					};
					Object.defineProperty(e, "__esModule", { value: !0 }), e.setOptions = e.getOptions = e.types = e.stringify = e.parse = void 0;
					const u = n(203);
					Object.defineProperty(e, "getOptions", {
						enumerable: !0,
						get: function() {
							return u.getOptions;
						}
					}), Object.defineProperty(e, "setOptions", {
						enumerable: !0,
						get: function() {
							return u.setOptions;
						}
					});
					e.parse = s(n(377)).default;
					e.stringify = s(n(887)).default;
					e.types = o(n(31));
				}
			}, e = {};
			return function n(r) {
				var a = e[r];
				if (void 0 !== a) return a.exports;
				var i = e[r] = { exports: {} };
				return t[r].call(i.exports, i, i.exports, n), i.exports;
			}(73);
		})()));
	}))();
	function parseManifest(text, baseUrl) {
		const manifest = (0, import_hls_parser_min.parse)(text);
		if (manifest.isMasterPlaylist) return {
			isMaster: true,
			variants: buildVariants(manifest, baseUrl)
		};
		const media = manifest;
		const parsed = buildMedia(media, baseUrl);
		return {
			isMaster: false,
			segments: parsed.segs,
			mediaSeq: parsed.mediaSeq,
			endList: parsed.endList,
			targetDuration: media.targetDuration
		};
	}
	function buildVariants(master, baseUrl) {
		const out = [];
		for (const v of master.variants) {
			if (!v.uri) continue;
			const res = v.resolution;
			const w = res?.width ?? null;
			const h = res?.height ?? null;
			out.push({
				url: safeAbsUrl(v.uri, baseUrl),
				res: w && h ? `${w}x${h}` : null,
				w,
				h,
				peak: v.bandwidth ?? null,
				avg: v.averageBandwidth ?? null,
				codecs: v.codecs ?? null
			});
		}
		return out;
	}
	function rangeHeaderFromByterange(br, fallbackStart) {
		if (!br || typeof br.length !== "number") return {
			header: null,
			next: fallbackStart
		};
		const start = typeof br.offset === "number" ? br.offset : fallbackStart;
		const end = start + br.length - 1;
		return {
			header: `bytes=${start}-${end}`,
			next: end + 1
		};
	}
	function buildMedia(media, baseUrl) {
		const segs = [];
		let lastNext = 0;
		let prevMapSig = null;
		for (let i = 0; i < media.segments.length; i++) {
			const s = media.segments[i];
			let rangeHeader = null;
			if (s.byterange) {
				const r = rangeHeaderFromByterange(s.byterange, lastNext);
				rangeHeader = r.header;
				lastNext = r.next;
			} else lastNext = 0;
			let map = null;
			let needMap = false;
			if (s.map?.uri) {
				const mapUri = safeAbsUrl(s.map.uri, baseUrl);
				let mRange = null;
				if (s.map.byterange) mRange = rangeHeaderFromByterange(s.map.byterange, 0).header;
				map = {
					uri: mapUri,
					rangeHeader: mRange
				};
				const sig = `${mapUri}|${mRange || ""}`;
				needMap = sig !== prevMapSig;
				if (needMap) prevMapSig = sig;
			}
			let key = null;
			if (s.key?.method && s.key.method !== "NONE") key = {
				method: String(s.key.method).toUpperCase(),
				uri: s.key.uri ? safeAbsUrl(s.key.uri, baseUrl) : null,
				iv: s.key.iv?.toString() ?? null
			};
			segs.push({
				uri: safeAbsUrl(s.uri, baseUrl),
				dur: s.duration || 0,
				range: rangeHeader,
				key,
				map,
				needMap
			});
		}
		return {
			segs,
			mediaSeq: media.mediaSequenceBase || 0,
			endList: media.endlist ?? false
		};
	}
	function computeExactBytes(parsed) {
		let exact = true;
		let total = 0;
		const seenInit = new Set();
		for (const s of parsed.segs) {
			if (s.range) {
				const r = parseRange(s.range);
				if (!r || r.end == null) exact = false;
				else total += r.end - r.start + 1;
			} else exact = false;
			if (s.needMap && s.map) {
				if (s.map.rangeHeader) {
					const key = `${s.map.uri}|${s.map.rangeHeader}`;
					if (!seenInit.has(key)) {
						seenInit.add(key);
						const mr = parseRange(s.map.rangeHeader);
						if (!mr || mr.end == null) exact = false;
						else total += mr.end - mr.start + 1;
					}
				} else exact = false;
			}
		}
		return exact ? total : null;
	}
	function calcDuration(segments) {
		return segments.reduce((sum, s) => sum + s.dur, 0);
	}
	function isFmp4(segments) {
		if (segments.length === 0) return false;
		return segments.some((s) => s.map) || /\.m4s(\?|$)/i.test(segments[0].uri);
	}
	function hasEncryption(segments) {
		return segments.some((s) => s.key?.method === "AES-128");
	}
	var queue = new PQueue({ concurrency: 2 });
	var pendingUrls = new Set();
	async function analyzeMediaPlaylist(url, text, variant, signal) {
		const man = parseManifest(text ?? await getText(url, signal), url);
		if (man.isMaster && man.variants) {
			const best = sortVariantsByQuality(man.variants)[0];
			const count = man.variants.length;
			const parts = [`${count} ${count === 1 ? "quality" : "qualities"}`];
			if (best?.res) parts.push(`up to ${best.res}`);
			else if (best?.h) parts.push(`up to ${best.h}p`);
			return {
				label: parts.join(" • "),
				hlsType: "master",
				variantCount: count,
				variants: man.variants,
				bestVariant: best,
				enriched: true
			};
		}
		if (man.segments && man.segments.length > 0) {
			const segs = man.segments;
			const segCount = segs.length;
			const duration = calcDuration(segs);
			const isVod = man.endList ?? false;
			const exactBytes = computeExactBytes({
				segs,
				mediaSeq: man.mediaSeq ?? 0,
				endList: isVod
			});
			const res = variant?.res ?? extractResFromUrl(url);
			const fmp4 = isFmp4(segs);
			const encrypted = hasEncryption(segs);
			return {
				label: buildLabel({
					resolution: res,
					duration,
					size: exactBytes
				}),
				sublabel: buildSublabel(segCount, fmp4),
				hlsType: "media",
				duration,
				segCount,
				resolution: res,
				isVod,
				isFmp4: fmp4,
				encrypted,
				isLive: !isVod,
				size: exactBytes ?? null,
				enriched: true
			};
		}
		return {
			label: "Empty or Invalid",
			hlsType: "invalid",
			enriched: true
		};
	}
	async function performEnrichment(item, signal) {
		try {
			const data = await analyzeMediaPlaylist(item.url, void 0, void 0, signal);
			Object.assign(item, data);
			return true;
		} catch (e) {
			console.error("[SG] Enrichment failed:", e);
			item.label = "Parse Error";
			item.hlsType = "error";
			item.enriched = true;
			return false;
		}
	}
	async function enrichItem(item) {
		if (!item || item.enriched || item.enriching) return false;
		item.enriching = true;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), CFG.ENRICH_TIMEOUT);
		try {
			item._enrichPromise = performEnrichment(item, controller.signal);
			await item._enrichPromise;
			clearTimeout(timeoutId);
			return true;
		} catch (e) {
			clearTimeout(timeoutId);
			const error = e;
			const isAbort = error.message === "Aborted" || error.name === "AbortError";
			console.error(`[SG] enrichItem error: ${error.message}`);
			item.label = isAbort ? "Timeout" : "Parse Error";
			item.hlsType = "error";
			item.enriched = true;
			return false;
		} finally {
			item.enriching = false;
			item._enrichPromise = null;
		}
	}
	function queueEnrich(item, onComplete) {
		if (pendingUrls.has(item.url)) return;
		pendingUrls.add(item.url);
		queue.add(async () => {
			try {
				if (item && item.kind === "hls" && !item.enriched) {
					await enrichItem(item);
					onComplete?.();
				}
			} finally {
				pendingUrls.delete(item.url);
			}
		});
	}
	async function enrichNow(item) {
		if (item._enrichPromise) {
			await item._enrichPromise;
			return item.enriched && item.hlsType !== "error" && item.hlsType !== "invalid";
		}
		return enrichItem(item);
	}
	var MAGIC = "SG_MSG_v1";
	var MessageBus = class MessageBus {
		static instance;
		handlers = new Map();
		initialized = false;
		constructor() {
			this.handleMessage = this.handleMessage.bind(this);
		}
		static get() {
			if (!MessageBus.instance) MessageBus.instance = new MessageBus();
			return MessageBus.instance;
		}
		init() {
			if (this.initialized) return;
			this.initialized = true;
			window.addEventListener("message", this.handleMessage);
			console.log("[SG] MessageBus initialized");
		}
		on(type, handler) {
			if (!this.handlers.has(type)) this.handlers.set(type, new Set());
			this.handlers.get(type).add(handler);
		}
		off(type, handler) {
			const set = this.handlers.get(type);
			if (set) {
				set.delete(handler);
				if (set.size === 0) this.handlers.delete(type);
			}
		}
		send(type, payload = {}, target = window.top) {
			try {
				const msg = {
					type,
					payload,
					magic: MAGIC
				};
				target.postMessage(msg, "*");
			} catch (e) {
				console.error("[SG] Failed to send message:", type, e);
			}
		}
		sendToTop(type, payload = {}) {
			if (window.top) this.send(type, payload, window.top);
		}
		handleMessage(ev) {
			const data = ev.data;
			if (!data || typeof data !== "object" || !data.type) return;
			if (data.magic !== MAGIC) return;
			if (ev.source === window) return;
			const handlers = this.handlers.get(data.type);
			if (handlers) handlers.forEach((fn) => {
				try {
					fn(data.payload || {}, ev.source);
				} catch (e) {
					console.error("[SG] Error in message handler:", e);
				}
			});
		}
	};
	var pickerRequests = new Map();
	function sendDetection(item) {
		MessageBus.get().sendToTop("SG_DETECT", { item: serializeMediaItem(item) });
	}
	function registerPickerRequest(id, resolver) {
		pickerRequests.set(id, resolver);
	}
	function resolvePickerRequest(id, item) {
		const resolver = pickerRequests.get(id);
		if (resolver) {
			pickerRequests.delete(id);
			resolver(item);
		}
	}
	function initMessaging() {
		MessageBus.get().init();
		console.log("[SG] Messaging initialized");
	}
	function hexToU8(hex) {
		const clean = (hex || "").replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "");
		if (clean.length === 0) return new Uint8Array(0);
		const chunks = (clean.length % 2 === 0 ? clean : "0" + clean).match(/.{1,2}/g);
		if (!chunks) return new Uint8Array(0);
		return new Uint8Array(chunks.map((b) => parseInt(b, 16)));
	}
	function ivFromSeq(n) {
		let seq = BigInt(n >>> 0);
		const iv = new Uint8Array(16);
		for (let i = 15; i >= 0; i--) {
			iv[i] = Number(seq & 255n);
			seq >>= 8n;
		}
		return iv;
	}
	var keyCache = new Map();
	var keyInflight = new Map();
	var MAX_CACHED_KEYS = 10;
	function u8ToHex(u8) {
		let res = "";
		for (let i = 0; i < u8.length; i++) res += u8[i].toString(16).padStart(2, "0");
		return res;
	}
	async function aesCbcDecrypt(buf, keyBytes, iv) {
		const key = await once(keyCache, keyInflight, u8ToHex(keyBytes), () => crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["decrypt"]), MAX_CACHED_KEYS);
		return crypto.subtle.decrypt({
			name: "AES-CBC",
			iv
		}, key, buf);
	}
	var CONFIG = {
		MAX_BUFFER_SIZE: 104857600,
		MAX_FILE_SIZE: 2040109465.6,
		URL_REVOKE_DELAY: 6e4
	};
	var log = {
		info: (msg) => console.log(`[SG] ${msg}`),
		warn: (msg, ...args) => console.warn(`[SG] ${msg}`, ...args),
		error: (msg, ...args) => console.error(`[SG] ${msg}`, ...args)
	};
	var revokeUrlLater = (url, delay = CONFIG.URL_REVOKE_DELAY) => {
		setTimeout(() => URL.revokeObjectURL(url), delay);
	};
	var wrapSaveError = (e) => new Error(`Failed to save file: ${e.message}`);
	var silentAbort = (abortable) => abortable.abort().catch(() => {});
	var silentRemove = (root, name) => root.removeEntry(name).catch(() => {});
	var getExtension = (filename, fallback = "") => filename.split(".").pop() || fallback;
	var addPartSuffix = (filename, part) => {
		const lastDot = filename.lastIndexOf(".");
		return lastDot === -1 ? `${filename}.part${part}` : `${filename.slice(0, lastDot)}.part${part}${filename.slice(lastDot)}`;
	};
	var WriterState = class {
		closed = false;
		aborted = false;
		get isClosed() {
			return this.closed;
		}
		get isAborted() {
			return this.aborted;
		}
		setClosed() {
			this.closed = true;
		}
		setAborted() {
			this.aborted = true;
		}
		assertWritable(warnOnly = false) {
			if (this.aborted) throw new Error("Writer was aborted");
			if (this.closed) {
				if (warnOnly) {
					log.warn("Attempted to write after close");
					return false;
				}
				throw new Error("Writer was closed");
			}
			return true;
		}
	};
	function mapGMDownloadError(error, details) {
		switch (error) {
			case "not_enabled": return "Downloads are disabled in userscript settings";
			case "not_whitelisted": return "URL not whitelisted for download. Check userscript settings.";
			case "not_permitted": return "Download not permitted. Try allowing downloads in browser settings.";
			case "not_supported": return "Download not supported by your userscript manager";
			case "not_succeeded": return details || "Download failed. Check if the file location is writable.";
			default: return `Download failed: ${error || "unknown"}${details ? ` - ${details}` : ""}`;
		}
	}
	function downloadViaAnchor(url, filename) {
		return new Promise((resolve) => {
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.rel = "noopener";
			a.target = "_blank";
			a.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none";
			(document.body || document.documentElement).appendChild(a);
			a.click();
			setTimeout(() => {
				a.remove();
				resolve();
			}, 5e3);
		});
	}
	function downloadWithGM(url, filename, onSuccess) {
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		return new Promise((resolve, reject) => {
			GM_download({
				url,
				name: filename,
				saveAs: !isMobile,
				onload: () => {
					onSuccess?.();
					resolve();
				},
				onerror: (err) => {
					reject(new Error(mapGMDownloadError(err?.error, err?.details)));
				},
				ontimeout: () => {
					reject(new Error("Download timed out"));
				}
			});
		});
	}
	async function triggerDownload(url, filename, onSuccess, fallbackOnFail = true) {
		try {
			const isBlobUrl = typeof url === "string" && url.startsWith("blob:");
			const isBlobObj = url instanceof Blob;
			if ((!isBlobUrl || isBlobObj) && typeof GM_download === "function") try {
				await downloadWithGM(url, filename, onSuccess);
				return;
			} catch (e) {
				log.warn("GM_download failed, falling back to anchor:", e.message);
				if (!fallbackOnFail) throw e;
			}
			let anchorUrl = url;
			if (url instanceof Blob) anchorUrl = createInternalBlobUrl(url);
			await downloadViaAnchor(anchorUrl, filename);
			onSuccess?.();
		} finally {
			if (typeof url === "string") revokeUrlLater(url);
		}
	}
	async function createNativeWriter(suggestedName, mimeType) {
		if (typeof window.showSaveFilePicker !== "function" || window.isSecureContext === false) return null;
		try {
			const ext = getExtension(suggestedName, "mp4");
			const stream = await (await window.showSaveFilePicker({
				suggestedName,
				types: [{
					description: "Video file",
					accept: { [mimeType]: [`.${ext}`] }
				}]
			})).createWritable();
			const state = new WriterState();
			return {
				async write(chunk) {
					if (!state.assertWritable(true)) return;
					await stream.write(chunk);
				},
				async close() {
					if (state.isAborted) throw new Error("Writer was aborted");
					if (state.isClosed) return;
					state.setClosed();
					try {
						await stream.close();
						return;
					} catch (e) {
						log.error("Native close error:", e);
						throw wrapSaveError(e);
					}
				},
				abort() {
					if (state.isClosed || state.isAborted) return;
					state.setAborted();
					silentAbort(stream);
				}
			};
		} catch (e) {
			const error = e;
			if (error.name === "AbortError") throw e;
			log.warn("File System Access API failed, using fallback:", error.message);
			return null;
		}
	}
	var STALE_THRESHOLD_MS = 864e5;
	async function cleanupStaleTempFiles(root) {
		try {
			const now = Date.now();
			const deletePromises = [];
			for await (const [name, handle] of root.entries()) if (handle.kind === "file" && name.endsWith(".tmp") && name.startsWith("sg_download_")) {
				const match = /^sg_download_(\d+)_/.exec(name);
				if (match) {
					const ts = parseInt(match[1], 10);
					if (!isNaN(ts) && now - ts > STALE_THRESHOLD_MS) {
						log.info(`Cleaning up stale temp file: ${name}`);
						deletePromises.push(silentRemove(root, name));
					}
				}
			}
			if (deletePromises.length > 0) await Promise.all(deletePromises);
		} catch (e) {
			log.warn("Failed to cleanup stale temp files:", e);
		}
	}
	async function createOpfsWriter(suggestedName, mimeType) {
		if (!navigator.storage?.getDirectory) return null;
		try {
			const root = await navigator.storage.getDirectory();
			cleanupStaleTempFiles(root).catch(() => {});
			const tempName = `sg_download_${Date.now()}_${shortId()}.tmp`;
			const fileHandle = await root.getFileHandle(tempName, { create: true });
			const writable = await fileHandle.createWritable();
			const state = new WriterState();
			return {
				async write(chunk) {
					if (!state.assertWritable(true)) return;
					await writable.write(chunk);
				},
				async close() {
					if (state.isAborted) throw new Error("Writer was aborted");
					if (state.isClosed) return;
					state.setClosed();
					try {
						await writable.close();
						const file = await fileHandle.getFile();
						await triggerDownload(file, suggestedName, () => {});
						setTimeout(() => {
							silentRemove(root, tempName);
						}, CONFIG.URL_REVOKE_DELAY + 5e3);
						return file;
					} catch (e) {
						log.error("OPFS close error:", e);
						throw wrapSaveError(e);
					}
				},
				abort() {
					if (state.isClosed || state.isAborted) return;
					state.setAborted();
					silentAbort(writable);
					silentRemove(root, tempName);
				}
			};
		} catch (e) {
			log.warn("OPFS initialization failed:", e);
			return null;
		}
	}
	function createBlobWriter(suggestedName, mimeType) {
		const blobParts = [];
		let currentBuffer = [];
		let currentBufferSize = 0;
		let currentPartSize = 0;
		let partNumber = 1;
		const state = new WriterState();
		const flushBuffer = () => {
			if (currentBufferSize === 0) return;
			const blob = new Blob(currentBuffer, { type: mimeType });
			blobParts.push(blob);
			currentBuffer = [];
			currentBufferSize = 0;
		};
		const clearMemory = () => {
			currentBuffer = [];
			currentBufferSize = 0;
			blobParts.length = 0;
			currentPartSize = 0;
		};
		const savePart = async (isFinal) => {
			flushBuffer();
			if (blobParts.length === 0 && !isFinal) return;
			if (blobParts.length === 0 && isFinal && partNumber === 1) log.warn("Saving empty file");
			let filename = suggestedName;
			if (partNumber > 1 || !isFinal && partNumber === 1) filename = addPartSuffix(suggestedName, partNumber);
			log.info(`Saving part ${partNumber}: ${filename}, Size: ${(currentPartSize / 1024 / 1024).toFixed(2)} MB`);
			const blob = new Blob(blobParts, { type: mimeType });
			clearMemory();
			await triggerDownload(blob, filename, () => {
				if (isFinal);
			});
			return blob;
		};
		return {
			async write(chunk) {
				if (!state.assertWritable(true)) return;
				if (currentPartSize + chunk.length > CONFIG.MAX_FILE_SIZE) {
					log.warn(`File part ${partNumber} limit reached (~1.9GB). Splitting file...`);
					await savePart(false);
					partNumber++;
				}
				currentBuffer.push(chunk);
				currentBufferSize += chunk.length;
				currentPartSize += chunk.length;
				if (currentBufferSize >= CONFIG.MAX_BUFFER_SIZE) {
					flushBuffer();
					if (blobParts.length % 5 === 0) log.info(`Part ${partNumber} Buffer: ${blobParts.length} blobs, Size: ${(currentPartSize / 1024 / 1024).toFixed(2)} MB`);
				}
			},
			async close() {
				if (state.isAborted) throw new Error("Writer was aborted");
				if (state.isClosed) return;
				state.setClosed();
				return await savePart(true);
			},
			abort() {
				if (state.isClosed || state.isAborted) return;
				state.setAborted();
				clearMemory();
			}
		};
	}
	async function createFileWriter(suggestedName, mimeType) {
		try {
			const nativeWriter = await createNativeWriter(suggestedName, mimeType);
			if (nativeWriter) {
				log.info("Using native File System Access API");
				return nativeWriter;
			}
		} catch (e) {
			if (e.name === "AbortError") {
				log.info("User cancelled file picker");
				throw e;
			}
			log.warn("Native writer creation failed:", e);
		}
		const opfsWriter = await createOpfsWriter(suggestedName, mimeType);
		if (opfsWriter) {
			log.info("Using OPFS writer");
			return opfsWriter;
		}
		log.info("Using blob fallback for download");
		return createBlobWriter(suggestedName, mimeType);
	}
	var INFLIGHT_CACHE_TIMEOUT_MS = 100;
	var MAX_BUFFERED_SEGMENTS = 50;
	var BACKPRESSURE_CHECK_MS = 50;
	var ResourceCache = class {
		cache = new Map();
		inflight = new Map();
		async fetch(key, fetcher, signal) {
			if (signal?.aborted) throw new AbortError(new Error("Aborted"));
			const result = await once(this.cache, this.inflight, key, fetcher, INFLIGHT_CACHE_TIMEOUT_MS);
			if (signal?.aborted) throw new AbortError(new Error("Aborted"));
			return result;
		}
		clear() {
			this.cache.clear();
			this.inflight.clear();
		}
	};
	var SequentialWriter = class {
		writer;
		buffers = new Map();
		writePtr = 0;
		writeChain = Promise.resolve();
		totalBytes = 0;
		writeError = null;
		constructor(writer) {
			this.writer = writer;
		}
		get bufferedCount() {
			return this.buffers.size;
		}
		get bytesWritten() {
			return this.totalBytes;
		}
		get error() {
			return this.writeError;
		}
		shouldThrottle() {
			return this.buffers.size >= MAX_BUFFERED_SEGMENTS;
		}
		enqueue(index, data) {
			this.buffers.set(index, data);
			this.flush();
		}
		flush() {
			this.writeChain = this.writeChain.then(async () => {
				while (this.buffers.has(this.writePtr)) {
					const chunk = this.buffers.get(this.writePtr);
					this.buffers.delete(this.writePtr);
					try {
						await this.writer.write(chunk);
						this.totalBytes += chunk.length;
					} catch (e) {
						this.writeError = e;
						throw e;
					}
					this.writePtr++;
				}
			});
		}
		async finalize() {
			await this.writeChain;
			if (this.writeError) throw this.writeError;
		}
		async close() {
			await this.finalize();
			await this.writer.close();
		}
		abort() {
			this.buffers.clear();
			this.writer.abort();
		}
	};
	var ProgressTracker = class {
		total;
		onUpdate;
		inProgress = new Map();
		rafId = 0;
		_done = 0;
		byteDone = 0;
		avgLen = 0;
		constructor(total, onUpdate) {
			this.total = total;
			this.onUpdate = onUpdate;
		}
		get done() {
			return this._done;
		}
		get averageSize() {
			return this.avgLen;
		}
		setProgress(index, loaded, total) {
			this.inProgress.set(index, {
				loaded,
				total
			});
			this.scheduleUpdate();
		}
		markComplete(index, bytes) {
			this.inProgress.delete(index);
			this._done++;
			this.byteDone += bytes;
			this.avgLen = this.byteDone / this._done;
			this.scheduleUpdate();
		}
		clear(index) {
			this.inProgress.delete(index);
		}
		scheduleUpdate() {
			if (this.rafId) return;
			this.rafId = requestAnimationFrame(() => {
				this.rafId = 0;
				const partial = this.calculatePartial();
				const pct = (this._done + partial) / this.total * 100;
				this.onUpdate(pct, this._done, this.total);
			});
		}
		calculatePartial() {
			let partial = 0;
			this.inProgress.forEach(({ loaded, total }) => {
				if (total > 0) partial += Math.min(1, loaded / total);
				else if (this.avgLen > 0) partial += Math.min(1, loaded / this.avgLen);
			});
			return partial;
		}
	};
	var SegmentFetcher = class {
		mediaSeq;
		keyCache = new ResourceCache();
		mapCache = new ResourceCache();
		constructor(mediaSeq) {
			this.mediaSeq = mediaSeq;
		}
		async fetch(segment, index, signal, onProgress) {
			this.validateEncryption(segment);
			const [keyBytes, mapBytes] = await Promise.all([this.fetchKey(segment, signal), this.fetchMap(segment, signal)]);
			const buf = await this.download(segment, signal, onProgress);
			const decrypted = keyBytes ? await this.decrypt(buf, keyBytes, segment, index) : buf;
			return this.prependMap(new Uint8Array(decrypted), mapBytes);
		}
		validateEncryption(segment) {
			if (segment.key?.method && segment.key.method !== "AES-128") throw new AbortError(new Error(`Unsupported key method: ${segment.key.method}`));
		}
		async download(segment, signal, onProgress) {
			const headers = segment.range ? { Range: segment.range } : {};
			try {
				return await getBin(segment.uri, headers, CFG.REQUEST_TIMEOUT, (e) => onProgress(e.loaded, e.total), signal);
			} catch (err) {
				if (signal.aborted) throw new AbortError(new Error("Aborted"));
				throw err;
			}
		}
		async fetchKey(segment, signal) {
			if (!segment.key || segment.key.method !== "AES-128" || !segment.key.uri) return null;
			return this.keyCache.fetch(segment.key.uri, async () => {
				const buf = await getBin(segment.key.uri, {}, CFG.REQUEST_TIMEOUT, void 0, signal);
				return new Uint8Array(buf);
			}, signal);
		}
		async fetchMap(segment, signal) {
			if (!segment.needMap || !segment.map?.uri) return null;
			const cacheKey = `${segment.map.uri}|${segment.map.rangeHeader || ""}`;
			return this.mapCache.fetch(cacheKey, async () => {
				const headers = segment.map.rangeHeader ? { Range: segment.map.rangeHeader } : {};
				const buf = await getBin(segment.map.uri, headers, CFG.REQUEST_TIMEOUT, void 0, signal);
				return new Uint8Array(buf);
			}, signal);
		}
		async decrypt(buf, keyBytes, segment, index) {
			return aesCbcDecrypt(buf, keyBytes, segment.key.iv ? hexToU8(segment.key.iv) : ivFromSeq(this.mediaSeq + index));
		}
		prependMap(data, mapBytes) {
			if (!mapBytes?.length) return data;
			const joined = new Uint8Array(mapBytes.length + data.length);
			joined.set(mapBytes, 0);
			joined.set(data, mapBytes.length);
			return joined;
		}
		clear() {
			this.keyCache.clear();
			this.mapCache.clear();
		}
	};
	var SegmentDownloader = class {
		segments;
		onProgress;
		onComplete;
		queue;
		controllers = new Map();
		writer;
		progress;
		fetcher;
		paused = false;
		canceled = false;
		finalized = false;
		constructor(segments, mediaSeq, writer, onProgress, onComplete) {
			this.segments = segments;
			this.onProgress = onProgress;
			this.onComplete = onComplete;
			this.queue = new PQueue({ concurrency: CFG.CONCURRENCY });
			this.writer = new SequentialWriter(writer);
			this.progress = new ProgressTracker(segments.length, onProgress);
			this.fetcher = new SegmentFetcher(mediaSeq);
		}
		async start() {
			for (let i = 0; i < this.segments.length; i++) this.queue.add(() => this.downloadSegment(i));
			await this.queue.onIdle();
			await this.finalize();
		}
		togglePause() {
			this.paused = !this.paused;
			if (this.paused) this.queue.pause();
			else this.queue.start();
			return this.paused;
		}
		cancel() {
			if (this.canceled) return;
			this.canceled = true;
			this.abortAll();
			this.queue.clear();
			this.writer.abort();
			this.cleanup();
		}
		async downloadSegment(index) {
			if (this.canceled) return;
			await this.waitForBackpressure();
			if (this.canceled) return;
			const controller = new AbortController();
			this.controllers.set(index, controller);
			try {
				await pRetry(async () => {
					if (this.canceled) throw new AbortError(new Error("Canceled"));
					const data = await this.fetcher.fetch(this.segments[index], index, controller.signal, (loaded, total) => {
						this.progress.setProgress(index, loaded, total);
					});
					this.writer.enqueue(index, data);
					this.progress.markComplete(index, data.length);
				}, {
					retries: CFG.RETRIES,
					signal: controller.signal,
					onFailedAttempt: ({ error, attemptNumber }) => {
						if (!this.canceled) console.warn(`[SG] Segment ${index} failed (attempt ${attemptNumber}): ${error.message}`);
					}
				});
			} catch (error) {
				this.handleSegmentError(index, error);
			} finally {
				this.controllers.delete(index);
			}
		}
		async waitForBackpressure() {
			while (this.writer.shouldThrottle() && !this.canceled) await new Promise((r) => setTimeout(r, BACKPRESSURE_CHECK_MS));
		}
		handleSegmentError(index, error) {
			this.progress.clear(index);
			if (this.canceled || error instanceof AbortError) return;
			console.error(`[SG] Segment ${index} fatal error:`, error);
			this.canceled = true;
			this.abortAll();
			this.queue.clear();
		}
		abortAll() {
			for (const controller of this.controllers.values()) controller.abort();
			this.controllers.clear();
		}
		async finalize() {
			if (this.finalized) return;
			this.finalized = true;
			const success = !this.canceled && this.progress.done === this.segments.length && !this.writer.error;
			try {
				if (success) {
					const blob = await this.writer.close();
					this.onComplete(true, void 0, blob);
				} else {
					this.writer.abort();
					const msg = this.writer.error ? "Write failed" : this.canceled ? "Canceled" : "Incomplete download";
					this.onComplete(false, msg);
				}
			} catch (e) {
				console.error("[SG] Finalize error:", e);
				this.onComplete(false, "Finalization failed");
			} finally {
				this.cleanup();
			}
		}
		cleanup() {
			this.fetcher.clear();
		}
	};
	async function downloadSegments(parsed, filename, isFmp4, card) {
		const total = parsed.segs.length;
		console.log("[SG] Starting segment download:", {
			filename,
			segments: total
		});
		const mime = isFmp4 ? "video/mp4" : "video/mp2t";
		let writer;
		try {
			writer = await createFileWriter(filename, mime);
		} catch (e) {
			if (e.name === "AbortError") {
				card.remove();
				return;
			}
			throw e;
		}
		const downloader = new SegmentDownloader(parsed.segs, parsed.mediaSeq, writer, (pct, done, total) => {
			card.update(pct, `${done}/${total}`);
		}, (success, message, blob) => {
			if (success) {
				card.update(100, "");
				const downloadUrl = blob ? URL.createObjectURL(blob) : void 0;
				card.done(true, void 0, downloadUrl, blob);
			} else card.done(false, message);
		});
		card.setOnStop(() => {
			return downloader.togglePause() ? "paused" : "resumed";
		});
		card.setOnCancel(() => {
			downloader.cancel();
			card.remove();
		});
		await downloader.start();
	}
	async function downloadDirect(url, delegate, pageTitle) {
		console.log("[SG] Direct download:", url);
		const info = blobRegistry.get(url);
		const filename = generateFilename({
			title: pageTitle,
			ext: guessExt(url, info?.type)
		});
		let dlUrl = url;
		let cleanup = () => {};
		if (info?.blob) {
			dlUrl = URL.createObjectURL(info.blob);
			cleanup = () => URL.revokeObjectURL(dlUrl);
		}
		const card = delegate.createCard(filename, url);
		let abortDownload;
		card.setOnCancel(() => {
			try {
				abortDownload?.abort();
			} catch {}
			cleanup();
			card.remove();
		});
		abortDownload = GM_download({
			url: dlUrl,
			name: filename,
			saveAs: true,
			onprogress: (e) => {
				if (e.lengthComputable) card.update(e.loaded / e.total * 100, `${formatBytes(e.loaded)}/${formatBytes(e.total)}`);
				else card.update(0, formatBytes(e.loaded));
			},
			onload: () => {
				card.update(100, "");
				card.done(true, "", dlUrl, info?.blob ?? void 0);
				cleanup();
			},
			onerror: (err) => {
				const errorMsg = err?.error || "unknown";
				console.error("[SG] Download error:", {
					error: errorMsg,
					url
				});
				card.done(false, errorMsg === "not_succeeded" ? "Save failed" : errorMsg);
				cleanup();
			},
			ontimeout: () => {
				card.done(false, "Timeout");
				cleanup();
			}
		});
	}
	async function downloadHls(url, preVariant, delegate, pageTitle) {
		console.log("[SG] HLS download:", url);
		const data = await analyzeMediaPlaylist(url);
		let mediaUrl = preVariant ? preVariant.url : url;
		let chosenVariant = preVariant;
		if (!preVariant && data.hlsType === "master" && data.variants && data.variants.length > 0) {
			const variants = sortVariantsByQuality(data.variants);
			if (variants.length === 0) throw new Error("No variants found");
			const items = [];
			for (const v of variants) {
				let data;
				try {
					data = await analyzeMediaPlaylist(v.url, void 0, v);
				} catch {
					data = {
						label: buildLabel({ resolution: v.res }),
						hlsType: "error"
					};
				}
				items.push({
					url: v.url,
					kind: "variant",
					label: data.label || "Unknown",
					sublabel: data.sublabel || null,
					size: data.size ?? null,
					type: null,
					origin: document.location.origin,
					pageTitle,
					enriched: true,
					enriching: false,
					hlsType: "media",
					isLive: false,
					encrypted: false,
					variant: v
				});
			}
			const selected = await delegate.pickVariant(items);
			if (!selected) return;
			chosenVariant = selected.variant ?? null;
			mediaUrl = selected.url;
		}
		const mediaMan = parseManifest(await getText(mediaUrl), mediaUrl);
		if (!mediaMan.segments || mediaMan.segments.length === 0) throw new Error("Invalid playlist: no segments");
		const parsed = {
			segs: mediaMan.segments,
			mediaSeq: mediaMan.mediaSeq ?? 0,
			endList: mediaMan.endList ?? false
		};
		const fmp4 = isFmp4(parsed.segs);
		const filename = generateFilename({
			title: pageTitle,
			ext: fmp4 ? "mp4" : "ts",
			quality: chosenVariant?.res
		});
		await downloadSegments(parsed, filename, fmp4, delegate.createCard(filename, url, parsed.segs.length));
	}
	async function handleItem(item, delegate) {
		if (item.isRemote && item.remoteWin) {
			if (item.remoteWin.closed) throw new Error("Source frame is gone");
			if (!item.url.startsWith("blob:")) {
				if (item.kind === "hls" || item.kind === "variant") return downloadHls(item.url, item.variant ?? null, delegate, item.pageTitle);
				if (item.kind === "video") return downloadDirect(item.url, delegate, item.pageTitle);
			}
			item.remoteWin.postMessage({
				type: "SG_CMD_DOWNLOAD",
				payload: {
					url: item.url,
					kind: item.kind,
					variant: item.variant,
					pageTitle: item.pageTitle
				}
			}, "*");
			return;
		}
		if (item.kind === "hls" && !item.enriched) {
			delegate.setBusy(true);
			try {
				if (item._enrichPromise) await item._enrichPromise;
				else await enrichNow(item);
			} catch (e) {
				throw new Error(`Failed to analyze stream: ${e.message}`);
			} finally {
				delegate.setBusy(false);
			}
			if (item.hlsType === "error" || item.hlsType === "invalid") throw new Error("Cannot download: Stream analysis failed or invalid");
		}
		if (item.kind === "video") return downloadDirect(item.url, delegate, item.pageTitle);
		if (item.kind === "variant") return downloadHls(item.url, item.variant ?? null, delegate, item.pageTitle);
		if (item.kind === "hls") return downloadHls(item.url, null, delegate, item.pageTitle);
	}
	var STYLES = "@import \"https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Urbanist:wght@300;400;500;600;700&display=swap\";#sg-fab-container,#sg-modal-container,#sg-toast-container{box-sizing:border-box!important;letter-spacing:.02em!important;font-family:Urbanist,system-ui,-apple-system,sans-serif!important;font-size:14px!important;line-height:1.5!important}#sg-fab-container *,#sg-modal-container *,#sg-toast-container *{box-sizing:border-box!important;outline:none!important}:host{--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;forced-color-adjust:none;--sg-bg-deep:#050505;--sg-bg-surface:#0a0a0a;--sg-bg-glass:#0a0a0ab3;--sg-gold-dim:#8a7e58;--sg-gold:#d4af37;--sg-gold-bright:#f4d060;--sg-gold-glow:#d4af374d;--sg-border-subtle:#ffffff14;--sg-border-gold:#d4af3740;--sg-text-main:#f0f0f0;--sg-text-muted:#888;--sg-text-gold:#e5c55d;--sg-success:#10b981;--sg-error:#ef4444;--sg-warn:#f59e0b;--sg-radius-lg:16px;--sg-radius-md:10px;--sg-radius-sm:6px;--sg-shadow-glow:0 0 20px var(--sg-gold-glow);--sg-glass-blur:blur(16px);--sg-font-display:\"Cinzel\", serif;--sg-font-body:\"Urbanist\", sans-serif;--sg-transition:all .3s cubic-bezier(.25, .8, .25, 1)}@keyframes sg-spin{to{transform:rotate(360deg)}}@keyframes sg-breathe{0%,to{box-shadow:0 0 10px var(--sg-gold-glow);border-color:var(--sg-gold)}50%{box-shadow:0 0 25px var(--sg-gold-glow);border-color:var(--sg-gold-bright)}}@keyframes sg-fade-up{0%{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes sg-scale-in{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}.sg-fab{all:initial!important;z-index:2147483647!important;width:60px!important;height:60px!important;color:var(--sg-gold)!important;border:1px solid var(--sg-border-gold)!important;border-top:1px solid var(--sg-border-subtle)!important;cursor:pointer!important;font-family:var(--sg-font-body)!important;transition:var(--sg-transition)!important;background:linear-gradient(145deg,#151515,#000)!important;border-radius:20px!important;justify-content:center!important;align-items:center!important;padding:0!important;display:none!important;position:fixed!important;bottom:30px!important;right:30px!important;box-shadow:0 10px 30px #00000080,0 0 0 1px #00000080!important}.sg-fab.show{animation:.4s ease-out backwards sg-scale-in!important;display:flex!important}.sg-fab:hover{box-shadow:0 15px 40px #0009, var(--sg-shadow-glow)!important;border-color:var(--sg-gold-bright)!important;color:var(--sg-gold-bright)!important;transform:translateY(-2px)scale(1.05)!important}.sg-fab:active{transform:translateY(0)scale(.95)!important}.sg-fab.busy{pointer-events:none!important;animation:2s infinite sg-breathe!important}.sg-fab.busy>.sg-fab-icon{opacity:0!important}.sg-fab.busy:after{content:\"\"!important;border:2px solid #0000!important;border-top-color:var(--sg-gold)!important;border-right-color:var(--sg-gold)!important;border-radius:50%!important;width:24px!important;height:24px!important;margin:auto!important;animation:.8s linear infinite sg-spin!important;position:absolute!important;inset:0!important}.sg-fab-icon{all:initial!important;color:inherit!important;justify-content:center!important;align-items:center!important;font-size:0!important;display:flex!important}.sg-fab svg{fill:none!important;stroke:currentColor!important;stroke-width:2px!important;filter:drop-shadow(0 0 2px #d4af3780)!important;width:26px!important;height:26px!important}.sg-badge{all:initial!important;background:var(--sg-gold)!important;color:#000!important;font-size:11px!important;font-weight:700!important;font-family:var(--sg-font-body)!important;text-align:center!important;border:2px solid #000!important;border-radius:10px!important;min-width:22px!important;padding:2px 7px!important;display:none!important;position:absolute!important;top:-6px!important;right:-6px!important;box-shadow:0 4px 8px #00000080!important}.sg-badge.show{animation:.3s cubic-bezier(.18,.89,.32,1.28) sg-scale-in!important;display:inline-block!important}.sg-modal{all:initial!important;z-index:2147483647!important;-webkit-backdrop-filter:blur(8px)!important;backdrop-filter:blur(8px)!important;font-family:var(--sg-font-body)!important;opacity:0!important;background:#0009!important;justify-content:center!important;align-items:center!important;transition:opacity .3s!important;display:none!important;position:fixed!important;inset:0!important}.sg-modal.show{opacity:1!important;display:flex!important}.sg-card{all:initial!important;-webkit-backdrop-filter:var(--sg-glass-blur) saturate(180%)!important;border:1px solid var(--sg-border-gold)!important;border-radius:var(--sg-radius-lg)!important;color:var(--sg-text-main)!important;width:min(580px,94vw)!important;max-height:85vh!important;font-family:var(--sg-font-body)!important;background:#0a0a0ad9!important;flex-direction:column!important;transition:transform .4s cubic-bezier(.19,1,.22,1)!important;display:flex!important;overflow:hidden!important;transform:translateY(20px)!important;box-shadow:0 20px 50px #000000b3,0 0 0 1px #ffffff0d!important}.sg-modal.show .sg-card{transform:translateY(0)!important}.sg-card-head{all:initial!important;border-bottom:1px solid var(--sg-border-subtle)!important;font-family:var(--sg-font-body)!important;background:linear-gradient(#ffffff08,#0000)!important;grid-template-columns:1fr auto!important;align-items:center!important;padding:24px 28px 20px!important;display:grid!important;position:relative!important}.sg-card-head:after{content:\"\"!important;background:var(--sg-gold)!important;width:40px!important;height:2px!important;box-shadow:0 0 8px var(--sg-gold)!important;position:absolute!important;bottom:0!important;left:28px!important}.sg-card-title{all:initial!important;font-family:var(--sg-font-display)!important;letter-spacing:.05em!important;color:var(--sg-text-gold)!important;text-transform:uppercase!important;text-shadow:0 2px 10px #00000080!important;font-size:20px!important;font-weight:600!important}.sg-card-body{all:initial!important;max-height:calc(85vh - 80px)!important;font-family:var(--sg-font-body)!important;background-image:radial-gradient(circle at 100% 0,#d4af3708 0%,#0000 25%),radial-gradient(circle at 0 100%,#d4af3705 0%,#0000 20%)!important;flex-direction:column!important;gap:16px!important;padding:24px 28px 28px!important;display:flex!important;overflow-y:auto!important}.sg-card-body::-webkit-scrollbar{width:6px!important}.sg-card-body::-webkit-scrollbar-thumb{background:#ffffff1a!important;border-radius:3px!important}.sg-card-body::-webkit-scrollbar-thumb:hover{background:var(--sg-gold-dim)!important}.sg-btn{all:initial!important;border:1px solid var(--sg-border-subtle)!important;color:var(--sg-text-muted)!important;border-radius:var(--sg-radius-sm)!important;cursor:pointer!important;min-width:36px!important;min-height:36px!important;transition:var(--sg-transition)!important;font-family:var(--sg-font-body)!important;background:#ffffff08!important;justify-content:center!important;align-items:center!important;padding:8px!important;display:flex!important}.sg-btn:hover{color:var(--sg-text-main)!important;background:#ffffff14!important;border-color:#fff3!important;transform:translateY(-1px)!important}.sg-btn svg{fill:none!important;stroke:currentColor!important;width:18px!important;height:18px!important}.sg-btn-small{min-width:28px!important;min-height:28px!important;padding:6px!important}.sg-btn-small svg{width:14px!important;height:14px!important}.sg-option{all:initial!important;color:var(--sg-text-muted)!important;border:1px solid var(--sg-border-subtle)!important;border-radius:var(--sg-radius-md)!important;cursor:pointer!important;font-size:14px!important;font-family:var(--sg-font-body)!important;transition:var(--sg-transition)!important;background:#0003!important;align-items:center!important;gap:12px!important;padding:14px 18px!important;display:flex!important}.sg-option:hover{color:var(--sg-text-main)!important;background:#ffffff08!important;border-color:#ffffff26!important}.sg-option input[type=checkbox]{cursor:pointer!important;width:18px!important;height:18px!important;accent-color:var(--sg-gold)!important;filter:sepia()hue-rotate(5deg)brightness(.9)saturate(1.5)!important;margin:0!important}.sg-list{all:initial!important;font-family:var(--sg-font-body)!important;flex-direction:column!important;gap:12px!important;display:flex!important}.sg-item{all:initial!important;border:1px solid var(--sg-border-subtle)!important;border-radius:var(--sg-radius-md)!important;cursor:pointer!important;transition:var(--sg-transition)!important;font-family:var(--sg-font-body)!important;background:linear-gradient(90deg,#ffffff05 0%,#fff0 100%)!important;border-left:2px solid #0000!important;padding:16px 20px!important;animation:.5s ease-out backwards sg-fade-up!important;display:block!important}.sg-item:first-child{animation-delay:50ms!important}.sg-item:nth-child(2){animation-delay:.1s!important}.sg-item:nth-child(3){animation-delay:.15s!important}.sg-item:nth-child(4){animation-delay:.2s!important}.sg-item:hover{border-color:#ffffff1a!important;border-left-color:var(--sg-gold)!important;background:#ffffff0a!important;transform:translate(4px)!important;box-shadow:0 4px 20px #0000004d!important}.sg-item:focus{outline:1px solid var(--sg-gold)!important}.sg-item-top{all:initial!important;font-family:var(--sg-font-body)!important;justify-content:space-between!important;align-items:flex-start!important;gap:14px!important;margin-bottom:8px!important;display:flex!important}.sg-item-title{all:initial!important;color:var(--sg-text-main)!important;font-size:15px!important;font-weight:600!important;line-height:1.4!important;font-family:var(--sg-font-body)!important;flex-wrap:wrap!important;flex:1!important;align-items:center!important;gap:10px!important;display:flex!important}.sg-item-url{all:initial!important;color:#555!important;white-space:nowrap!important;text-overflow:ellipsis!important;opacity:.6!important;font-family:Consolas,Monaco,monospace!important;font-size:12px!important;display:block!important;overflow:hidden!important}.sg-item-sub{all:initial!important;color:var(--sg-text-muted)!important;font-size:12px!important;font-family:var(--sg-font-body)!important;align-items:center!important;gap:10px!important;margin-bottom:6px!important;display:flex!important}.sg-item-title-context{all:initial!important;color:var(--sg-text-gold)!important;font-size:13px!important;font-family:var(--sg-font-body)!important;opacity:.85!important;margin-bottom:6px!important;font-weight:500!important;display:block!important}.sg-item-size{color:var(--sg-gold-dim)!important}.sg-badge-type{all:initial!important;text-transform:uppercase!important;letter-spacing:.5px!important;white-space:nowrap!important;font-size:10px!important;font-weight:700!important;font-family:var(--sg-font-body)!important;color:#fff!important;background:#ffffff0d!important;border:1px solid #0000!important;border-radius:4px!important;align-items:center!important;padding:4px 8px!important;display:inline-flex!important}.sg-badge-type.master{color:#a5b4fc!important;background:#6366f11a!important;border-color:#6366f166!important}.sg-badge-type.video{color:#6ee7b7!important;background:#10b9811a!important;border-color:#10b98166!important}.sg-badge-type.direct{color:#fff!important;background:#f59e0b!important}.sg-badge-type.live{color:#fff!important;background:#ef4444!important}.sg-badge-type.encrypted{color:#fff!important;background:#8b5cf6!important}.sg-badge-type.analyzing{color:#fff!important;background:#6b7280!important;animation:1s infinite sg-pulse!important}.sg-badge-type.remote{color:#fff!important;background:#06b6d4!important}.sg-badge-type.error{color:#fff!important;background:#e74c3c!important}.sg-copy-btn{all:initial!important;border:1px solid var(--sg-border-subtle)!important;color:var(--sg-gold)!important;cursor:pointer!important;transition:var(--sg-transition)!important;font-family:var(--sg-font-body)!important;background:0 0!important;border-radius:6px!important;flex-shrink:0!important;justify-content:center!important;align-items:center!important;padding:8px!important;display:flex!important}.sg-copy-btn svg{width:18px!important;height:18px!important;display:block!important}.sg-copy-btn:hover{border-color:var(--sg-gold-dim)!important;color:var(--sg-gold)!important;background:#d4af370d!important}.sg-copy-btn.copied{border-color:var(--sg-success)!important;color:var(--sg-success)!important}.sg-empty{all:initial!important;color:var(--sg-text-muted)!important;text-align:center!important;font-size:15px!important;line-height:1.6!important;font-family:var(--sg-font-body)!important;border:1px dashed var(--sg-border-subtle)!important;border-radius:var(--sg-radius-md)!important;flex-direction:column!important;align-items:center!important;padding:60px 40px!important;display:flex!important}.sg-empty small{color:#555!important;margin-top:12px!important;font-size:13px!important;font-style:italic!important;display:block!important}.sg-toast{all:initial!important;z-index:2147483647!important;max-width:400px!important;max-height:70vh!important;font-family:var(--sg-font-body)!important;pointer-events:none!important;flex-direction:column!important;align-items:flex-end!important;gap:16px!important;display:flex!important;position:fixed!important;bottom:110px!important;right:30px!important;overflow-y:auto!important}.sg-toast>*{pointer-events:auto!important}.sg-progress{all:initial!important;-webkit-backdrop-filter:blur(10px)!important;backdrop-filter:blur(10px)!important;color:var(--sg-text-main)!important;border:1px solid var(--sg-border-gold)!important;border-left:3px solid var(--sg-gold)!important;border-radius:var(--sg-radius-md)!important;min-width:340px!important;font-family:var(--sg-font-body)!important;background:#0f0f0ff2!important;flex-direction:column!important;padding:16px 20px!important;animation:.4s cubic-bezier(.18,.89,.32,1.28) sg-fade-up!important;display:flex!important;box-shadow:0 10px 40px #0009!important}.sg-progress-row{all:initial!important;font-family:var(--sg-font-body)!important;justify-content:space-between!important;align-items:center!important;gap:12px!important;margin-bottom:12px!important;display:flex!important}.sg-progress-name{all:initial!important;white-space:nowrap!important;text-overflow:ellipsis!important;max-width:220px!important;color:var(--sg-text-main)!important;font-size:14px!important;font-weight:600!important;font-family:var(--sg-font-body)!important;letter-spacing:.01em!important;overflow:hidden!important}.sg-progress-ctrls{all:initial!important;gap:6px!important;margin-left:auto!important;font-family:system-ui,sans-serif!important;display:flex!important}.sg-progress-bar{all:initial!important;background:#ffffff1a!important;border-radius:3px!important;height:6px!important;margin-bottom:12px!important;display:block!important;overflow:hidden!important}.sg-progress-fill{width:0;background-color:var(--sg-gold)!important;background:linear-gradient(90deg, var(--sg-gold), var(--sg-gold-bright))!important;min-width:0!important;height:100%!important;box-shadow:0 0 10px var(--sg-gold-glow)!important;transition:width .2s linear!important;display:block!important}.sg-progress-status{all:initial!important;font-size:12px!important;font-family:var(--sg-font-body)!important;justify-content:space-between!important;display:flex!important}.sg-progress-status span:first-child{color:var(--sg-text-muted)!important;font-variant-numeric:tabular-nums!important}.sg-progress-status span:last-child{color:#e0e0e0!important}.sg-progress.paused .sg-progress-fill{background:#f59e0b!important}.sg-progress.minimized{background:#000!important;border-left-width:1px!important;min-width:auto!important;padding:10px 14px!important}.sg-progress.minimized .sg-progress-bar,.sg-progress.minimized .sg-progress-status,.sg-progress.minimized .sg-progress-name{display:none!important}.sg-progress.minimized .sg-progress-row{margin-bottom:0!important}.sg-variants{all:initial!important;border-top:1px dashed var(--sg-border-subtle)!important;font-family:var(--sg-font-body)!important;flex-wrap:wrap!important;gap:8px!important;margin-top:10px!important;padding-top:10px!important;display:flex!important}.sg-variant-chip{all:initial!important;color:var(--sg-text-main)!important;font-size:13px!important;font-weight:500!important;font-family:var(--sg-font-body)!important;border:1px solid var(--sg-border-subtle)!important;cursor:pointer!important;min-width:40px!important;transition:var(--sg-transition)!important;background:#ffffff1a!important;border-radius:6px!important;justify-content:center!important;align-items:center!important;padding:6px 14px!important;display:inline-flex!important}.sg-variant-chip:hover{color:var(--sg-gold)!important;background:#ffffff1a!important;border-color:#ffffff26!important;transform:translateY(-1px)!important}.sg-variant-chip:active{transform:translateY(0)!important}.sg-variant-chip:focus{border-color:var(--sg-gold)!important;box-shadow:0 0 8px var(--sg-gold-glow)!important}.sg-progress.minimized .sg-progress-ctrls{gap:0!important;margin:0!important}.sg-progress.minimized .sg-progress-ctrls>:not(.btn-minimize){display:none!important}@media (max-width:640px){.sg-fab{bottom:20px!important;right:20px!important}.sg-toast{align-items:stretch!important;max-width:none!important;bottom:80px!important;left:16px!important;right:16px!important}.sg-progress{width:100%!important;min-width:0!important}.sg-card{border-radius:10px!important;width:100%!important;max-height:90vh!important;margin:8px!important}.sg-card-body{max-height:calc(90vh - 70px)!important}}";
	var ICONS = {
		download: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <path d="M7 10l5 5 5-5"/>
    <path d="M12 15V3"/>
  </svg>`,
		close: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>`,
		copy: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2"/>
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>
  </svg>`,
		check: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>`,
		pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>`,
		play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>`,
		cancel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M15 9l-6 6M9 9l6 6"/>
  </svg>`,
		minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M19 9l-7 7-7-7"/>
  </svg>`,
		maximize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M5 15l7-7 7 7"/>
  </svg>`
	};
	var cn = (...classes) => classes.filter(Boolean).join(" ");
	function h(tag, attrs, children) {
		const el = document.createElement(tag);
		if (attrs) for (const [key, val] of Object.entries(attrs)) {
			if (val == null || val === false) continue;
			el.setAttribute(key, val === true ? "" : String(val));
		}
		if (children) {
			if (typeof children === "string") el.innerHTML = children;
			else for (const child of children) el.append(typeof child === "string" ? document.createTextNode(child) : child);
		}
		return el;
	}
	async function copyToClipboard(text, btn) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			const textarea = Object.assign(document.createElement("textarea"), {
				value: text,
				style: "position:fixed;opacity:0;pointer-events:none"
			});
			const root = btn.getRootNode();
			(root instanceof ShadowRoot || root instanceof Document ? root : document.body).appendChild(textarea);
			textarea.select();
			const ok = document.execCommand("copy");
			textarea.remove();
			if (!ok) return false;
		}
		const original = btn.innerHTML;
		btn.innerHTML = ICONS.check;
		btn.classList.add("copied");
		setTimeout(() => {
			btn.innerHTML = original;
			btn.classList.remove("copied");
		}, 1200);
		return true;
	}
	var fabEl = null;
	var fabIcon = null;
	var fabBadge = null;
	function renderFab(container, state, onClick) {
		if (!fabEl) {
			fabEl = h("button", {
				class: "sg-fab",
				type: "button"
			});
			fabIcon = h("span", { class: "sg-fab-icon" }, ICONS.download);
			fabBadge = h("span", { class: "sg-badge" });
			fabEl.append(fabIcon, fabBadge);
			fabEl.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick();
			});
			container.appendChild(fabEl);
		}
		fabEl.className = cn("sg-fab", state.show && "show", state.busy && "busy", state.idle && "idle");
		fabEl.disabled = state.busy;
		fabEl.title = `Download media (${state.count})`;
		if (fabBadge) {
			fabBadge.className = cn("sg-badge", state.count > 0 && "show");
			fabBadge.textContent = state.count > 99 ? "99+" : String(state.count);
		}
	}
	var modalEl = null;
	var listEl = null;
	var titleEl = null;
	var filterCb = null;
	function renderModal(container, show, title, items, showFilter, excludeSmall, onClose, onSelect, onFilterChange) {
		if (!show) {
			if (modalEl) {
				modalEl.classList.remove("show");
				if (!container.contains(modalEl)) {
					modalEl = null;
					listEl = null;
				}
			}
			return;
		}
		if (!modalEl || !container.contains(modalEl)) {
			container.innerHTML = "";
			modalEl = h("div", { class: "sg-modal" });
			modalEl.addEventListener("click", (e) => e.target === modalEl && onClose());
			const card = h("div", {
				class: "sg-card",
				role: "dialog",
				"aria-modal": "true"
			});
			const header = h("div", { class: "sg-card-head" });
			titleEl = h("div", { class: "sg-card-title" });
			header.append(titleEl, createIconButton(ICONS.close, "Close (Esc)", onClose));
			card.appendChild(header);
			const body = h("div", { class: "sg-card-body" });
			const label = h("label", { class: "sg-option" });
			filterCb = h("input", { type: "checkbox" });
			filterCb.addEventListener("change", () => onFilterChange(filterCb.checked));
			label.append(filterCb, " Exclude small (< 1MB)");
			body.appendChild(label);
			listEl = h("div", { class: "sg-list" });
			body.appendChild(listEl);
			card.appendChild(body);
			modalEl.appendChild(card);
			container.appendChild(modalEl);
		}
		modalEl.classList.add("show");
		if (titleEl) titleEl.textContent = title;
		if (filterCb) {
			filterCb.checked = excludeSmall || false;
			const label = filterCb.parentElement;
			if (label) label.style.display = showFilter && items.some((i) => i.size != null) ? "flex" : "none";
		}
		if (listEl) {
			listEl.innerHTML = "";
			if (items.length === 0) {
				const empty = h("div", { class: "sg-empty" });
				empty.innerHTML = "No media detected.<br><small>Play a video to detect streams.</small>";
				listEl.appendChild(empty);
			} else items.forEach((item) => listEl.appendChild(createItemElement(item, onSelect)));
		}
	}
	function createIconButton(icon, title, onClick) {
		const btn = h("button", {
			class: "sg-btn",
			title,
			type: "button"
		}, icon);
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			onClick();
		});
		return btn;
	}
	function createItemElement(item, onSelect) {
		const el = h("div", {
			class: "sg-item",
			role: "button",
			tabindex: "0"
		});
		const top = h("div", { class: "sg-item-top" });
		const titleDiv = h("div", { class: "sg-item-title" });
		titleDiv.appendChild(Object.assign(h("span"), { textContent: item.label }));
		getBadges(item).forEach((b) => titleDiv.appendChild(b));
		top.appendChild(titleDiv);
		if (item.size) top.appendChild(Object.assign(h("span", { class: "sg-item-size" }), { textContent: formatBytes(item.size) }));
		const copyBtn = h("button", {
			class: "sg-copy-btn",
			title: "Copy URL",
			type: "button"
		}, ICONS.copy);
		copyBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			copyToClipboard(item.url, copyBtn);
		});
		top.appendChild(copyBtn);
		el.appendChild(top);
		if (item.sublabel) el.appendChild(Object.assign(h("div", { class: "sg-item-sub" }), { textContent: item.sublabel }));
		if (item.pageTitle) el.appendChild(Object.assign(h("div", { class: "sg-item-title-context" }), { textContent: item.pageTitle }));
		if (item.hlsType === "master" && item.variants && item.variants.length > 0) {
			const variantsDiv = h("div", { class: "sg-variants" });
			const sorted = sortVariantsByQuality(item.variants).slice(0, 6);
			for (const v of sorted) {
				if (!v.res && !v.peak) continue;
				const label = v.res || (v.peak ? `${Math.round(v.peak / 1024)}k` : "?");
				const chip = h("button", {
					class: "sg-variant-chip",
					type: "button"
				});
				chip.textContent = label;
				chip.addEventListener("click", (e) => {
					e.stopPropagation();
					onSelect({
						...item,
						kind: "variant",
						variant: v,
						label,
						hlsType: "media",
						size: null
					});
				});
				variantsDiv.appendChild(chip);
			}
			if (variantsDiv.children.length > 0) el.appendChild(variantsDiv);
		}
		el.addEventListener("click", (e) => {
			if (e.target.closest(".sg-copy-btn") || e.target.closest(".sg-variant-chip")) return;
			onSelect(item);
		});
		el.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onSelect(item);
			}
		});
		return el;
	}
	function getBadges(item) {
		const badges = [];
		const add = (text, type) => {
			const el = h("span", { class: `sg-badge-type ${type}` });
			el.textContent = text;
			badges.push(el);
		};
		if (item.kind === "hls") {
			if (item.hlsType === "error" || item.hlsType === "invalid") add(item.hlsType === "error" ? "Error" : "Invalid", "error");
			else if (item.hlsType === "master") add("Master", "master");
			else if (item.hlsType === "media") add("Video", "video");
			else if (item.enriching) add("...", "analyzing");
			else add("HLS", "video");
			if (item.isLive) add("Live", "live");
			if (item.encrypted) add("🔒", "encrypted");
		} else if (item.kind === "video") add("Direct", "direct");
		else if (item.kind === "variant") add("Quality", "video");
		if (item.isRemote) add("iFrame", "remote");
		return badges;
	}
	var ProgressCard = class {
		container;
		title;
		src;
		el;
		fillEl;
		statusEl;
		percentEl;
		pauseBtn = null;
		minBtn;
		minimized = false;
		paused = false;
		percent = 0;
		status;
		onStop;
		onCancelFn;
		constructor(container, title, src, segs = 0) {
			this.container = container;
			this.title = title;
			this.src = src;
			this.status = segs ? `${segs} segments` : "Starting...";
			this.el = h("div", {
				class: "sg-progress",
				id: `sg-progress-${shortId()}`
			});
			const row = h("div", { class: "sg-progress-row" });
			row.appendChild(Object.assign(h("div", {
				class: "sg-progress-name",
				title: src
			}), { textContent: title }));
			const ctrls = h("div", { class: "sg-progress-ctrls" });
			this.minBtn = h("button", {
				class: "sg-btn sg-btn-sm btn-minimize",
				title: "Minimize",
				type: "button"
			}, ICONS.minimize);
			this.minBtn.addEventListener("click", () => this.toggleMinimize());
			ctrls.appendChild(this.minBtn);
			const cancelBtn = h("button", {
				class: "sg-btn sg-btn-sm",
				title: "Cancel",
				type: "button"
			}, ICONS.cancel);
			cancelBtn.addEventListener("click", () => {
				this.onCancelFn?.();
				this.remove();
			});
			ctrls.appendChild(cancelBtn);
			row.appendChild(ctrls);
			this.el.appendChild(row);
			const bar = h("div", { class: "sg-progress-bar" });
			this.fillEl = h("div", { class: "sg-progress-fill" });
			bar.appendChild(this.fillEl);
			this.el.appendChild(bar);
			const statusRow = h("div", { class: "sg-progress-status" });
			this.statusEl = h("span");
			this.statusEl.textContent = this.status;
			this.percentEl = h("span");
			this.percentEl.textContent = "0%";
			statusRow.append(this.statusEl, this.percentEl);
			this.el.appendChild(statusRow);
			container.appendChild(this.el);
		}
		toggleMinimize() {
			this.minimized = !this.minimized;
			this.minBtn.innerHTML = this.minimized ? ICONS.maximize : ICONS.minimize;
			this.minBtn.title = this.minimized ? "Expand" : "Minimize";
			this.updateClass();
		}
		updateClass() {
			this.el.className = cn("sg-progress", this.minimized && "minimized", this.paused && "paused");
		}
		update(percent, text = "") {
			this.percent = Math.max(0, Math.min(100, percent));
			if (text) this.status = text;
			this.fillEl.style.setProperty("width", `${this.percent}%`, "important");
			this.statusEl.textContent = this.status;
			this.percentEl.textContent = `${Math.floor(this.percent)}%`;
		}
		done(ok = true, msg, downloadUrl, blob) {
			this.fillEl.style.width = "100%";
			this.fillEl.classList.add(ok ? "success" : "error");
			this.statusEl.textContent = msg || (ok ? "Complete ✓" : "Failed ✗");
			this.percentEl.textContent = "100%";
			if (ok && downloadUrl) {
				const saveBtn = h("a", {
					class: "sg-save-link",
					href: downloadUrl,
					download: this.title,
					rel: "noopener"
				}, "Save File");
				saveBtn.style.cssText = "display:block;margin-top:8px;padding:8px 12px;background:#10b981;color:#fff;border-radius:4px;text-decoration:none;font-weight:bold;text-align:center;font-size:12px;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:background 0.2s;";
				saveBtn.addEventListener("mouseenter", () => saveBtn.style.background = "#059669");
				saveBtn.addEventListener("mouseleave", () => saveBtn.style.background = "#10b981");
				if (blob && typeof GM_download === "function") saveBtn.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
					GM_download({
						url: blob,
						name: this.title,
						saveAs: !isMobile,
						onload: () => {},
						onerror: () => {
							window.location.href = downloadUrl;
						}
					});
				});
				this.el.appendChild(saveBtn);
				setTimeout(() => this.remove(), 6e4);
			} else setTimeout(() => this.remove(), 2500);
		}
		remove() {
			this.el.remove();
		}
		setOnStop(fn) {
			this.onStop = fn;
			if (this.pauseBtn) return;
			this.pauseBtn = h("button", {
				class: "sg-btn sg-btn-sm",
				title: "Pause",
				type: "button"
			}, ICONS.pause);
			this.pauseBtn.addEventListener("click", () => {
				if (!this.onStop) return;
				const result = this.onStop();
				this.paused = result === "paused";
				this.pauseBtn.innerHTML = this.paused ? ICONS.play : ICONS.pause;
				this.pauseBtn.title = this.paused ? "Resume" : "Pause";
				this.updateClass();
			});
			this.minBtn.before(this.pauseBtn);
		}
		setOnCancel(fn) {
			this.onCancelFn = fn;
		}
	};
	function createProgressCard(container, title, src, segs = 0) {
		return new ProgressCard(container, title, src, segs);
	}
	var mounted = false;
	var fabContainer = null;
	var modalContainer = null;
	var toastContainer = null;
	var fabState = {
		show: false,
		busy: false,
		idle: false,
		count: 0
	};
	var modalState = {
		show: false,
		title: "Select Media",
		items: []
	};
	var idleTimer = null;
	var pendingPicker = null;
	var onFabClick = null;
	var onItemSelected = null;
	function mountUI() {
		if (!CFG.IS_TOP || mounted) return;
		if (!document.body) {
			const event = document.readyState === "loading" ? "DOMContentLoaded" : "load";
			window.addEventListener(event, () => mountUI(), { once: true });
			return;
		}
		const host = document.createElement("div");
		host.id = "sg-host";
		host.setAttribute("data-darkreader-ignore", "true");
		host.classList.add("darkreader");
		Object.assign(host.style, {
			position: "fixed",
			top: "0",
			left: "0",
			width: "0",
			height: "0",
			zIndex: "2147483647",
			pointerEvents: "none",
			colorScheme: "dark"
		});
		const shadow = host.attachShadow({ mode: "open" });
		const styleEl = document.createElement("style");
		styleEl.classList.add("darkreader");
		styleEl.textContent = STYLES;
		shadow.append(styleEl);
		fabContainer = document.createElement("div");
		fabContainer.id = "sg-fab-container";
		fabContainer.style.pointerEvents = "auto";
		modalContainer = document.createElement("div");
		modalContainer.id = "sg-modal-container";
		modalContainer.style.pointerEvents = "auto";
		toastContainer = document.createElement("div");
		toastContainer.id = "sg-toast-container";
		toastContainer.className = "sg-toast";
		shadow.append(fabContainer, modalContainer, toastContainer);
		document.documentElement.append(host);
		fabContainer.addEventListener("mouseenter", clearIdle);
		fabContainer.addEventListener("mouseleave", resetIdle);
		document.addEventListener("keydown", (e) => e.key === "Escape" && modalState.show && closeModal());
		mounted = true;
		render();
	}
	function ensureMounted() {
		if (!CFG.IS_TOP) return false;
		if (!mounted) mountUI();
		return mounted;
	}
	function render() {
		if (!mounted || !fabContainer || !modalContainer) return;
		renderFab(fabContainer, fabState, handleFabClick);
		const items = modalState.show ? getFilteredItems() : [];
		renderModal(modalContainer, modalState.show, modalState.title, items, pendingPicker?.filterable ?? true, state.excludeSmall, closeModal, handleItemSelect, handleFilterChange);
	}
	function showFab() {
		if (!CFG.IS_TOP) return;
		fabState.show = true;
		fabState.count = state.validCount;
		if (ensureMounted()) {
			render();
			resetIdle();
		}
	}
	function setFabBusy(busy) {
		fabState.busy = busy;
		if (mounted) render();
	}
	function updateBadge() {
		fabState.count = state.validCount;
		if (mounted) render();
	}
	function resetIdle() {
		clearIdle();
		idleTimer = setTimeout(() => {
			fabState.idle = true;
			if (mounted) render();
		}, CFG.UI_IDLE_MS);
	}
	function clearIdle() {
		fabState.idle = false;
		if (idleTimer) clearTimeout(idleTimer);
		if (mounted) render();
	}
	function getFilteredItems() {
		const items = modalState.items.length > 0 ? modalState.items : state.getAllItems();
		return state.filterItems(items);
	}
	function openModal(title = "Select Media", items) {
		if (!ensureMounted()) return;
		modalState.show = true;
		modalState.title = title;
		modalState.items = items ?? [];
		render();
	}
	function closeModal() {
		modalState.show = false;
		modalState.items = [];
		if (mounted) render();
		if (pendingPicker) {
			pendingPicker.resolve(null);
			pendingPicker = null;
		}
	}
	function handleItemSelect(item) {
		closeModal();
		if (pendingPicker) {
			pendingPicker.resolve(item);
			pendingPicker = null;
		} else onItemSelected?.(item);
	}
	function handleFilterChange(checked) {
		state.setExcludeSmall(checked);
		render();
	}
	function handleFabClick() {
		if (!mounted) return;
		clearIdle();
		resetIdle();
		onFabClick?.();
	}
	function pickFromList(items, { title = "Select Media", filterable = true } = {}) {
		if (!ensureMounted()) return Promise.resolve(null);
		return new Promise((resolve) => {
			pendingPicker = {
				resolve,
				title,
				filterable
			};
			openModal(title, items);
		});
	}
	function createProgress(title, src, segs = 0) {
		if (!ensureMounted() || !toastContainer) return {
			update() {},
			done() {},
			remove() {},
			setOnStop() {},
			setOnCancel() {}
		};
		return createProgressCard(toastContainer, title, src, segs);
	}
	function registerMenuCommands() {
		if (!CFG.IS_TOP) return;
		GM_registerMenuCommand("Show Download Panel", () => {
			ensureMounted();
			showFab();
			handleFabClick();
		});
		GM_registerMenuCommand("Clear Cache", () => {
			state.clear();
			updateBadge();
			GM_notification({
				text: "Cache cleared",
				title: "StreamGrabber",
				timeout: 2e3
			});
		});
	}
	function setUICallbacks(cbs) {
		if (cbs.onFabClick) onFabClick = cbs.onFabClick;
		if (cbs.onItemSelected) onItemSelected = cbs.onItemSelected;
	}
	function refreshUI() {
		if (!CFG.IS_TOP) return;
		updateBadge();
		if (mounted && modalState.show) render();
	}
	var RemoteProgressCard = class {
		id;
		bus;
		onStopFn;
		onCancelFn;
		constructor(title, src) {
			this.id = shortId();
			this.bus = MessageBus.get();
			this.bus.sendToTop("SG_PROGRESS_START", {
				id: this.id,
				title,
				src
			});
			this.handleControl = this.handleControl.bind(this);
			this.bus.on("SG_CMD_CONTROL", this.handleControl);
		}
		handleControl(payload) {
			if (payload.id !== this.id) return;
			const action = payload.action;
			if (action === "stop" && this.onStopFn) this.onStopFn();
			else if (action === "cancel" && this.onCancelFn) this.onCancelFn();
		}
		update(percent, text) {
			this.bus.sendToTop("SG_PROGRESS_UPDATE", {
				id: this.id,
				p: percent,
				txt: text || ""
			});
		}
		done(ok = true, msg = "", downloadUrl, blob) {
			this.bus.sendToTop("SG_PROGRESS_DONE", {
				id: this.id,
				ok,
				msg,
				blob
			});
			this.cleanup();
		}
		remove() {
			this.cleanup();
		}
		setOnStop(fn) {
			this.onStopFn = fn;
		}
		setOnCancel(fn) {
			this.onCancelFn = fn;
		}
		cleanup() {
			this.bus.off("SG_CMD_CONTROL", this.handleControl);
		}
	};
	var remoteJobs = new Map();
	function init() {
		console.log(`[SG] StreamGrabber v${GM_info?.script?.version || "2.1.3"} initializing...`, {
			isTop: CFG.IS_TOP,
			readyState: document.readyState,
			href: location.href.slice(0, 100)
		});
		setUICallbacks({
			onFabClick: handleFabClickAction,
			onItemSelected: handleItemAction
		});
		if (CFG.IS_TOP) {
			mountUI();
			registerMenuCommands();
		}
		initMessaging();
		if (CFG.IS_TOP) setupTopHandlers();
		else setupChildHandlers();
		setItemDetectedCallback((item) => {
			if (CFG.IS_TOP) {
				console.log("[SG] Detected:", item.kind, item.url.slice(0, 60));
				showFab();
				updateBadge();
				if (item.kind === "hls") queueEnrich(item, () => refreshUI());
			} else {
				console.log("[SG] [iframe] Forwarding detection:", item.kind, item.url.slice(0, 60));
				sendDetection(item);
			}
		});
		state.events.itemAdded.subscribe(() => {
			showFab();
			updateBadge();
		});
		state.events.updated.subscribe(() => {
			refreshUI();
		});
		initDetection();
		console.log("[SG] Initialization complete", { isTop: CFG.IS_TOP });
	}
	function setupTopHandlers() {
		const bus = MessageBus.get();
		setupNavigationHandlers();
		bus.on("SG_DETECT", (payload, source) => {
			const remoteItem = payload.item;
			if (!remoteItem) return;
			remoteItem.remoteWin = source;
			remoteItem.isRemote = true;
			console.log("[SG] Received detection from iframe:", remoteItem.kind, remoteItem.url.slice(0, 60));
			if (state.addItem(remoteItem)) {
				showFab();
				updateBadge();
				if (remoteItem.kind === "hls") queueEnrich(remoteItem, () => refreshUI());
			}
		});
		bus.on("SG_PROGRESS_START", (payload, source) => {
			const { id, title, src } = payload;
			if (remoteJobs.has(id)) return;
			try {
				const card = createProgress(title, src);
				card.setOnStop(() => {
					MessageBus.get().send("SG_CMD_CONTROL", {
						id,
						action: "stop"
					}, source);
					return "paused";
				});
				card.setOnCancel(() => {
					MessageBus.get().send("SG_CMD_CONTROL", {
						id,
						action: "cancel"
					}, source);
					card.remove();
					remoteJobs.delete(id);
				});
				remoteJobs.set(id, card);
			} catch (e) {
				console.error("[SG] Failed to create remote progress card:", e);
			}
		});
		bus.on("SG_PROGRESS_UPDATE", (payload) => {
			const { id, p, txt } = payload;
			remoteJobs.get(id)?.update(p, txt);
		});
		bus.on("SG_PROGRESS_DONE", (payload) => {
			const { id, ok, msg, blob } = payload;
			const card = remoteJobs.get(id);
			if (card) {
				const downloadUrl = ok && blob ? URL.createObjectURL(blob) : void 0;
				card.done(ok, msg, downloadUrl);
				setTimeout(() => remoteJobs.delete(id), 6e4);
			}
		});
		bus.on("SG_CMD_PICK", (payload, source) => {
			const { id, items, title } = payload;
			pickFromList(items, {
				title,
				filterable: true
			}).then((selected) => {
				MessageBus.get().send("SG_CMD_PICK_RESULT", {
					id,
					item: selected
				}, source);
			});
		});
	}
	function handleNavigationChange(source) {
		console.log(`[SG] Navigation detected (${source}), clearing state...`);
		state.clear();
	}
	function setupNavigationHandlers() {
		window.addEventListener("popstate", () => handleNavigationChange("popstate"));
		window.addEventListener("hashchange", () => handleNavigationChange("hashchange"));
		const originalPush = history.pushState;
		history.pushState = function(...args) {
			const result = originalPush.apply(this, args);
			handleNavigationChange("pushState");
			return result;
		};
		const originalReplace = history.replaceState;
		history.replaceState = function(...args) {
			const result = originalReplace.apply(this, args);
			handleNavigationChange("replaceState");
			return result;
		};
	}
	function setupChildHandlers() {
		const bus = MessageBus.get();
		bus.on("SG_CMD_DOWNLOAD", (payload) => {
			const { url, kind, variant, pageTitle } = payload;
			console.log("[SG] [iframe] Received download command:", {
				url,
				kind
			});
			handleDownloadCommand(url, kind, variant, pageTitle);
		});
		bus.on("SG_CMD_PICK_RESULT", (payload) => {
			const { id, item } = payload;
			resolvePickerRequest(id, item);
		});
	}
	async function handleFabClickAction() {
		setFabBusy(true);
		try {
			const items = state.getFilteredItems();
			if (items.length === 0) {
				alert("No media detected yet. Try playing a video first.");
				return;
			}
			const selected = await pickFromList(items, {
				title: "Select Media",
				filterable: true
			});
			if (!selected) return;
			await handleItemAction(selected);
		} catch (e) {
			alertError(e);
		} finally {
			setFabBusy(false);
		}
	}
	async function handleItemAction(item) {
		try {
			await handleItem(item, {
				createCard: createProgress,
				pickVariant: (items) => pickFromList(items, {
					title: "Select Quality",
					filterable: true
				}),
				setBusy: setFabBusy
			});
		} catch (e) {
			alertError(e);
		}
	}
	async function handleDownloadCommand(url, kind, variant, pageTitle) {
		console.log("[SG] [iframe] Received download command:", {
			url,
			kind
		});
		try {
			const createProxyCard = (title, src) => {
				return new RemoteProgressCard(title, src);
			};
			if (kind === "hls" || kind === "variant") await downloadHls(url, variant, {
				createCard: createProxyCard,
				pickVariant: async (items) => {
					return new Promise((resolve) => {
						const pickId = shortId();
						registerPickerRequest(pickId, resolve);
						MessageBus.get().sendToTop("SG_CMD_PICK", {
							id: pickId,
							items,
							title: "Select Quality"
						});
					});
				},
				setBusy: () => {}
			}, pageTitle);
			else if (kind === "video") await downloadDirect(url, {
				createCard: createProxyCard,
				pickVariant: async () => null,
				setBusy: () => {}
			}, pageTitle);
		} catch (e) {
			console.error("[SG] [iframe] Download error:", e);
		}
	}
	init();
})();
