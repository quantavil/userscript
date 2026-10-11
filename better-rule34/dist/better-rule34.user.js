// ==UserScript==
// @name         Better Rule34Video
// @namespace    https://github.com/quantavil/userscript/
// @version      2.0.0
// @author       quantavil
// @description  Rule34Video enhancements: in-sheet minimum rating and view count filters, seamless infinite scroll, viewport preview autoplay, watch history tracking, and ad cleanup.
// @license      GPL-3.0-or-later
// @match        *://*.rule34video.com/*
// @match        *://rule34video.com/*
// @match        *://*.rule35video.com/*
// @match        *://rule35video.com/*
// @run-at       document-end
// ==/UserScript==

(function() {
	"use strict";
	var NON_LISTING_SEGMENTS = [...[
		"tags",
		"categories",
		"models",
		"channels",
		"playlists"
	], "video"];
	function isNonListingSegment(segment) {
		return NON_LISTING_SEGMENTS.includes(segment);
	}
	function isPaginationKey(key) {
		return /^from/i.test(key) || /^page$/i.test(key) || /^p$/i.test(key);
	}
	function stripPageSegment(pathname) {
		if (!pathname || pathname === "/") return "/";
		if (/^\/(?:tags|categories|models|channels|playlists)\/[^/]+\/\d+\/?$/.exec(pathname)) return pathname.replace(/\/\d+\/?$/, "/");
		const catalogMatch = /^\/([^/]+)\/\d+\/?$/.exec(pathname);
		if (catalogMatch && !isNonListingSegment(catalogMatch[1])) return `/${catalogMatch[1]}/`;
		return pathname;
	}
	function pageNumberFromPath(pathname) {
		const entityMatch = /^\/(?:tags|categories|models|channels|playlists)\/[^/]+\/(\d+)\/?$/.exec(pathname);
		if (entityMatch) {
			const p = parseInt(entityMatch[1], 10);
			if (!isNaN(p) && p > 0) return p;
		}
		const catalogMatch = /^\/([^/]+)\/(\d+)\/?$/.exec(pathname);
		if (catalogMatch && !isNonListingSegment(catalogMatch[1])) {
			const p = parseInt(catalogMatch[2], 10);
			if (!isNaN(p) && p > 0) return p;
		}
		return null;
	}
	function appendPageToPath(pathname, pageNum) {
		if (!pathname || pathname === "/") return `/latest-updates/${pageNum}/`;
		const entityMatch = /^(\/(?:tags|categories|models|channels|playlists)\/[^/]+)(?:\/\d+)?\/?$/.exec(pathname);
		if (entityMatch) return `${entityMatch[1]}/${pageNum}/`;
		const catalogMatch = /^(\/[^/]+)(?:\/\d+)?\/?$/.exec(pathname);
		if (catalogMatch && !isNonListingSegment(catalogMatch[1].slice(1))) return `${catalogMatch[1]}/${pageNum}/`;
		if (/\/\d+\/?$/.test(pathname)) return pathname.replace(/\/\d+\/?$/, `/${pageNum}/`);
		if (pathname.endsWith("/")) return `${pathname}${pageNum}/`;
		return `${pathname}/${pageNum}/`;
	}
	var DEFAULT_FILTER = {
		minRating: 0,
		minViews: 0
	};
	function parseViews(viewStr) {
		if (!viewStr) return null;
		const match = /([\d.]+)\s*([KkMmBb])?/.exec(viewStr.replace(/,/g, "").trim());
		if (!match) return null;
		const num = parseFloat(match[1]);
		if (isNaN(num)) return null;
		const unit = match[2]?.toUpperCase();
		if (unit === "K") return Math.round(num * 1e3);
		if (unit === "M") return Math.round(num * 1e6);
		if (unit === "B") return Math.round(num * 1e9);
		return Math.round(num);
	}
	function parseRatingPercent(ratingStr) {
		const match = /(\d{1,3})\s*%/.exec(ratingStr ?? "");
		return match ? Math.min(100, parseInt(match[1], 10)) : null;
	}
	var AD_URL_PATTERNS = [
		"/v1/d.php",
		"sadbaguette",
		"ku34bh9la09",
		"traffic",
		"adserver",
		"juicy",
		"gentlefieldpattern",
		"trialhd",
		"exoclick"
	];
	function isAdCard(el) {
		if (el.classList.contains("spot-thumb") || el.closest(".spots")) return true;
		if (el.querySelector("iframe")) return true;
		const header = el.querySelector("header");
		if (header && /^\s*(ad|ads|advert\w*|sponsor\w*)\s*$/i.test(header.textContent ?? "")) return true;
		const href = el.querySelector("a.th, a")?.getAttribute("href") || "";
		if (AD_URL_PATTERNS.some((pattern) => href.includes(pattern))) return true;
		if (/^https?:\/\//i.test(href)) try {
			const u = new URL(href);
			if (!u.hostname.endsWith("rule34video.com") && !u.hostname.endsWith("rule34video.party")) return true;
		} catch {}
		return false;
	}
	function videoIdFromHref(href) {
		return /(?:video|videos)\/(\d+)/.exec(href || "")?.[1] ?? "";
	}
	function cardIdOf(el) {
		const href = el.querySelector("a.th, a[href*=\"/video/\"]")?.getAttribute("href") || "";
		return el.dataset.videoCardId || videoIdFromHref(href);
	}
	function extractCardData(el) {
		if (isAdCard(el)) return null;
		const id = cardIdOf(el);
		if (!id) return null;
		const rating = el.querySelector(".video-card-meta__rating, .rating");
		const views = el.querySelector(".video-views-count, .views");
		return {
			id,
			ratingPercent: parseRatingPercent(rating?.textContent ?? ""),
			viewsCount: parseViews(views?.textContent?.trim() ?? "")
		};
	}
	function matchesClientFilter(card, filter) {
		if (filter.minRating > 0 && card.ratingPercent !== null && card.ratingPercent < filter.minRating) return false;
		if (filter.minViews > 0 && card.viewsCount !== null && card.viewsCount < filter.minViews) return false;
		return true;
	}
	function resolveNextPageUrl(currentUrlStr, nextRawHref) {
		try {
			const trimmedHref = nextRawHref.trim();
			if (!trimmedHref || trimmedHref.startsWith("#") || trimmedHref.startsWith("javascript:")) return "";
			const current = new URL(currentUrlStr);
			const next = new URL(trimmedHref, current.href);
			if (!next.search && current.search) {
				const carried = new URLSearchParams();
				current.searchParams.forEach((val, key) => {
					if (!isPaginationKey(key)) carried.append(key, val);
				});
				next.search = carried.toString();
			} else if (current.search && next.search) current.searchParams.forEach((val, key) => {
				if (!isPaginationKey(key) && !next.searchParams.has(key)) next.searchParams.set(key, val);
			});
			return next.toString();
		} catch {
			return nextRawHref;
		}
	}
	function parseKvsParameters(dataParams) {
		const raw = {};
		for (const part of (dataParams || "").split(";")) {
			const colon = part.indexOf(":");
			if (colon === -1) continue;
			const key = part.slice(0, colon).trim();
			if (key) raw[key] = part.slice(colon + 1).trim();
		}
		let fromParam = null;
		for (const key of Object.keys(raw)) {
			if (!/^from/i.test(key)) continue;
			const parsed = parseInt(raw[key], 10);
			if (!isNaN(parsed) && parsed > 0) {
				fromParam = parsed;
				break;
			}
		}
		return {
			fromParam,
			sortBy: raw["sort_by"] ? raw["sort_by"] : null
		};
	}
	var AD_SELECTOR = [
		".spot-thumb",
		".spots",
		".sidebar_ad_buttons",
		".footer_spots",
		".panel_header--promo",
		"ins.adsbyjuicy",
		"iframe[src*=\"sadbaguette\"]",
		"iframe[src*=\"traffic\"]",
		"iframe[src*=\"adserver\"]",
		"iframe[src*=\"/ads/\"]",
		"iframe[src*=\"juicy\"]",
		"iframe[src*=\"gentlefieldpattern\"]",
		"iframe[src*=\"trialhd\"]",
		".item.thumb a[href*=\"/v1/d.php\"]"
	].join(",");
	function cleanAds(root = document) {
		for (const el of root.querySelectorAll(AD_SELECTOR)) (el.closest(".item.thumb") ?? el).remove();
		for (const thumb of root.querySelectorAll(".item.thumb")) if (isAdCard(thumb)) thumb.remove();
	}
	function hardenAnchor(a) {
		if (a.target !== "_blank") a.target = "_blank";
		const rel = (a.getAttribute("rel") || "").toLowerCase();
		if (!rel.includes("noopener")) a.setAttribute("rel", (rel ? `${rel} ` : "") + "noopener");
	}
	function hardenAnchorsIn(root) {
		for (const a of root.querySelectorAll("a[href*=\"/video/\"]")) hardenAnchor(a);
	}
	function shouldNewTabClick(e) {
		return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
	}
	var OWN_CONTROLS = ".br34-mark, .br34-watch-btn";
	var wired = false;
	function initNewTab(scope = document) {
		hardenAnchorsIn(scope);
		if (wired) return;
		wired = true;
		document.addEventListener("click", (e) => {
			const target = e.target instanceof Element ? e.target : null;
			if (!target || target.closest(OWN_CONTROLS)) return;
			const anchor = target.closest("a[href*=\"/video/\"]");
			if (!anchor) return;
			hardenAnchor(anchor);
			if (!shouldNewTabClick(e)) return;
			e.preventDefault();
			e.stopPropagation();
			window.open(anchor.href, "_blank", "noopener");
		}, true);
	}
	var FETCH_TIMEOUT_MS = 2e4;
	var LOAD_AHEAD_PX = 1200;
	function isListingPage(urlStr = window.location.href) {
		try {
			const { pathname } = new URL(urlStr);
			if (/\/video(\/|$)/.test(pathname)) return false;
			return !/^\/(login|signup|invite|premium|static|info|feedback)/.test(pathname);
		} catch {
			return true;
		}
	}
	function findVideosContainer() {
		return document.querySelector(".content_general .thumbs") || document.querySelector("[id^=\"custom_list_videos_\"][id$=\"_items\"].thumbs") || document.querySelector(".twocolumns .thumbs") || document.querySelector(".thumbs") || document.querySelector("[id$=\"_items\"]");
	}
	function unclipBodyOverflow() {
		for (const w of document.querySelectorAll("body > div")) if (w.style.overflow === "hidden") w.style.overflow = "visible";
	}
	function readActiveSort(root = document) {
		const activeBtn = root.querySelector(".filters-panel__section--sort .btn.active, .filters-panel .btn.active[data-parameters*=\"sort_by\"]");
		return /(?:^|;)sort_by:([^;]*)(?:;|$)/.exec(activeBtn?.getAttribute("data-parameters") || "")?.[1] || null;
	}
	function computeNextPageUrl(currentUrlStr, nextPageNum, sortBy) {
		try {
			const url = new URL(currentUrlStr);
			if (sortBy !== void 0) {
				if (sortBy) url.searchParams.set("sort_by", sortBy);
				else url.searchParams.delete("sort_by");
			}
			if (url.pathname.includes("/search/")) {
				for (const k of [...url.searchParams.keys()]) if (isPaginationKey(k) && k !== "from_videos") url.searchParams.delete(k);
				url.searchParams.set("from_videos", String(nextPageNum));
				return url.toString();
			}
			url.pathname = appendPageToPath(url.pathname, nextPageNum);
			for (const k of [...url.searchParams.keys()]) if (isPaginationKey(k)) url.searchParams.delete(k);
			return url.toString();
		} catch {
			return null;
		}
	}
	function parseNextLink(root, baseUrl, fallbackSortBy) {
		const none = {
			url: null,
			fromParam: null,
			sortBy: null
		};
		const nextLink = root.querySelector(".pagination .item.pager.next a, .pagination .item.active + .item a, .pagination a.next");
		if (!nextLink) return none;
		const raw = nextLink.getAttribute("href") || "";
		if (raw && !raw.startsWith("#") && !raw.startsWith("javascript:")) return {
			url: resolveNextPageUrl(baseUrl, raw) || null,
			fromParam: null,
			sortBy: null
		};
		const parsed = parseKvsParameters(nextLink.getAttribute("data-parameters") || "");
		if (parsed.fromParam === null) return none;
		const sortBy = parsed.sortBy !== null ? parsed.sortBy : fallbackSortBy ?? null;
		return {
			url: computeNextPageUrl(baseUrl, parsed.fromParam, sortBy),
			fromParam: parsed.fromParam,
			sortBy
		};
	}
	function resolveNextUrl(root, baseUrl, currentPage) {
		const activeSort = readActiveSort(document);
		const { url, fromParam, sortBy } = parseNextLink(root, baseUrl, activeSort);
		if (url) return url;
		if (fromParam !== null) return computeNextPageUrl(baseUrl, fromParam, sortBy ?? activeSort);
		try {
			if (!new URL(baseUrl).pathname.includes("/search/")) return computeNextPageUrl(baseUrl, currentPage + 1, activeSort);
		} catch {}
		return null;
	}
	var AutoPager = class {
		container = null;
		statusContainer = null;
		sentinel = null;
		observer = null;
		nextUrl = null;
		currentPage = 1;
		isLoading = false;
		isAppending = false;
		scrollBound = false;
		seenCardIds = new Set();
		onNewCards;
		maybeLoad = () => {
			if (this.isLoading || !this.nextUrl || !this.sentinel) return;
			if (this.sentinel.getBoundingClientRect().top <= window.innerHeight + LOAD_AHEAD_PX) this.loadNextPage();
		};
		constructor(options) {
			this.onNewCards = options.onNewCards;
		}
		init() {
			unclipBodyOverflow();
			if (!isListingPage()) return;
			this.container = findVideosContainer();
			if (!this.container) return;
			this.currentPage = this.detectCurrentPageNumber();
			this.indexExistingCards();
			this.nextUrl = resolveNextUrl(document, window.location.href, this.currentPage);
			this.hideNativePagination();
			this.mountStatusElements();
			this.setupObserver();
			if (!this.scrollBound) {
				this.scrollBound = true;
				let ticking = false;
				const onScroll = () => {
					if (ticking) return;
					ticking = true;
					requestAnimationFrame(() => {
						ticking = false;
						this.maybeLoad();
					});
				};
				window.addEventListener("scroll", onScroll, { passive: true });
				window.addEventListener("resize", onScroll, { passive: true });
			}
		}
		getIsAppending() {
			return this.isAppending;
		}
		nudge() {
			this.maybeLoad();
		}
		reset() {
			for (const sep of document.querySelectorAll(".br34-page-sep")) sep.remove();
			this.container = findVideosContainer();
			this.indexExistingCards();
			this.currentPage = 1;
			this.isLoading = false;
			this.isAppending = false;
			this.nextUrl = resolveNextUrl(document, window.location.href, 1);
			this.hideNativePagination();
			this.mountStatusElements();
			this.setupObserver();
		}
		indexExistingCards() {
			this.seenCardIds.clear();
			if (!this.container) return;
			for (const card of this.container.querySelectorAll(".item.thumb")) {
				if (isAdCard(card)) {
					card.remove();
					continue;
				}
				const id = cardIdOf(card);
				if (id) this.seenCardIds.add(id);
			}
		}
		detectCurrentPageNumber() {
			try {
				const url = new URL(window.location.href);
				for (const key of [
					"from_videos",
					"from_videos+from_albums",
					"from_videos from_albums",
					"from",
					"page",
					"p"
				]) {
					const n = parseInt(url.searchParams.get(key) || "", 10);
					if (n > 0) return n;
				}
				return pageNumberFromPath(url.pathname) ?? 1;
			} catch {
				return 1;
			}
		}
		hideNativePagination() {
			const pagination = document.querySelector(".pagination");
			if (pagination) pagination.style.display = "none";
		}
		mountStatusElements() {
			if (!this.container) return;
			this.statusContainer ??= Object.assign(document.createElement("div"), { className: "br34-autopager-container" });
			this.sentinel ??= Object.assign(document.createElement("div"), { className: "br34-sentinel" });
			this.container.after(this.statusContainer);
			this.statusContainer.before(this.sentinel);
			this.updateStatusDisplay();
		}
		setupObserver() {
			this.observer?.disconnect();
			if (typeof IntersectionObserver === "undefined" || !this.sentinel) return;
			this.observer = new IntersectionObserver(this.maybeLoad, { rootMargin: `${LOAD_AHEAD_PX}px 0px` });
			this.observer.observe(this.sentinel);
		}
		updateStatusDisplay() {
			if (!this.statusContainer) return;
			if (this.isLoading) this.statusContainer.innerHTML = `<div class="br34-autopager-loading"><div class="br34-spinner"></div><span>LOADING PAGE ${this.currentPage + 1}…</span></div>`;
			else if (!this.nextUrl) this.statusContainer.innerHTML = `<div class="br34-autopager-end">[ END OF LIST · ${this.seenCardIds.size} VIDEOS ]</div>`;
			else this.statusContainer.innerHTML = "";
		}
		showError() {
			if (!this.statusContainer) return;
			this.statusContainer.innerHTML = `<div class="br34-autopager-end br34-autopager-error">[ COULD NOT LOAD PAGE · <button type="button" class="br34-retry">RETRY</button> ]</div>`;
			this.statusContainer.querySelector("button")?.addEventListener("click", () => void this.loadNextPage());
		}
		async fetchCards(url) {
			const controller = new AbortController();
			const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			try {
				const response = await fetch(url, {
					credentials: "include",
					signal: controller.signal,
					headers: { Accept: "text/html,application/xhtml+xml" }
				});
				if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
				const doc = new DOMParser().parseFromString(await response.text(), "text/html");
				cleanAds(doc);
				const cards = [];
				for (const card of doc.querySelectorAll(".item.thumb")) {
					if (isAdCard(card)) continue;
					const id = cardIdOf(card);
					if (!id || this.seenCardIds.has(id)) continue;
					this.seenCardIds.add(id);
					prepareCard(card);
					cards.push(card);
				}
				return {
					doc,
					cards
				};
			} finally {
				window.clearTimeout(timer);
			}
		}
		async loadNextPage() {
			if (this.isLoading || !this.nextUrl) return;
			this.container = findVideosContainer();
			if (!this.container) return;
			this.isLoading = true;
			this.updateStatusDisplay();
			const fetchUrl = this.nextUrl;
			let added = [];
			let failed = false;
			try {
				const { doc, cards } = await this.fetchCards(fetchUrl);
				this.currentPage++;
				if (cards.length === 0) this.nextUrl = null;
				else {
					this.isAppending = true;
					try {
						const sep = document.createElement("div");
						sep.className = "br34-page-sep";
						sep.textContent = `[ PAGE ${this.currentPage} ]`;
						this.container.append(sep, ...cards);
					} finally {
						window.setTimeout(() => this.isAppending = false, 50);
					}
					this.nextUrl = resolveNextUrl(doc, fetchUrl, this.currentPage);
					added = cards;
				}
			} catch (err) {
				failed = true;
				console.error("[Better Rule34] AutoPager error:", err);
				this.showError();
			} finally {
				this.isLoading = false;
				if (!failed) this.updateStatusDisplay();
				unclipBodyOverflow();
			}
			if (added.length > 0) this.onNewCards(added);
		}
	};
	function prepareCard(card) {
		for (const anchor of card.querySelectorAll("a[href*=\"/video/\"]")) hardenAnchor(anchor);
		const img = card.querySelector("img");
		if (!img) return;
		const real = img.getAttribute("data-rd-src") || img.getAttribute("data-webp") || img.getAttribute("data-original") || img.getAttribute("data-src");
		if (real) img.src = real;
		for (const attr of [
			"data-rd-src",
			"data-original",
			"data-webp",
			"data-src"
		]) img.removeAttribute(attr);
		img.classList.remove("lazy-load");
		img.loading = "lazy";
	}
	function pickTop(items, max, minRatio) {
		return items.filter((c) => c.ratio >= minRatio).sort((a, b) => b.ratio - a.ratio).slice(0, Math.max(0, max)).map((c) => c.item);
	}
	var MAX_ATTEMPTS = 3;
	var RETRY_DELAY_MS = 1500;
	function previewUrlOf(wrap) {
		return wrap.dataset.preview || wrap.closest("[data-preview]")?.dataset.preview || null;
	}
	var AutoplayController = class {
		maxActive;
		minRatio;
		isEligible;
		enabled;
		io;
		tracked = new Map();
		players = new Map();
		attempts = new Map();
		retryTimers = new Map();
		onVisibilityChange = () => this.reconcile();
		constructor(options) {
			this.maxActive = options.maxActive;
			this.minRatio = options.minRatio;
			this.enabled = options.enabled;
			this.isEligible = options.isEligible ?? (() => true);
			this.io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
				for (const entry of entries) {
					const t = this.tracked.get(entry.target);
					if (t) t.ratio = entry.intersectionRatio;
				}
				this.reconcile();
			}, { threshold: [
				0,
				.25,
				.5,
				.75,
				1
			] });
			document.addEventListener("visibilitychange", this.onVisibilityChange);
		}
		observe(card) {
			const wrap = card.querySelector(".wrap_image");
			if (!this.io || !wrap || this.tracked.has(wrap)) return;
			this.tracked.set(wrap, {
				card,
				ratio: 0
			});
			this.io.observe(wrap);
		}
		unobserve(card) {
			for (const [wrap, t] of [...this.tracked]) {
				if (t.card !== card) continue;
				this.io?.unobserve(wrap);
				this.forget(wrap);
				this.tracked.delete(wrap);
			}
		}
		refresh() {
			this.reconcile();
		}
		reset() {
			for (const wrap of [...this.players.keys(), ...this.retryTimers.keys()]) this.forget(wrap);
			for (const wrap of this.tracked.keys()) this.io?.unobserve(wrap);
			this.tracked.clear();
			this.attempts.clear();
		}
		reconcile() {
			for (const t of [...this.tracked.values()]) if (!t.card.isConnected) this.unobserve(t.card);
			if (!this.enabled || document.hidden) {
				for (const wrap of [...this.players.keys()]) this.stop(wrap);
				return;
			}
			const candidates = [];
			for (const [wrap, t] of this.tracked) {
				if ((this.attempts.get(wrap) ?? 0) >= MAX_ATTEMPTS) continue;
				if (!this.isEligible(t.card) || !previewUrlOf(wrap)) continue;
				candidates.push({
					item: wrap,
					ratio: t.ratio
				});
			}
			const wanted = new Set(pickTop(candidates, this.maxActive, this.minRatio));
			for (const wrap of [...this.players.keys()]) if (!wanted.has(wrap)) this.stop(wrap);
			for (const wrap of wanted) if (!this.players.has(wrap) && !this.retryTimers.has(wrap)) this.start(wrap);
		}
		start(wrap) {
			const url = previewUrlOf(wrap);
			if (!url) return;
			const video = document.createElement("video");
			video.className = "br34-autoplay-video";
			video.muted = true;
			video.defaultMuted = true;
			video.loop = true;
			video.playsInline = true;
			video.preload = "auto";
			video.setAttribute("aria-hidden", "true");
			video.addEventListener("playing", () => {
				this.attempts.delete(wrap);
				wrap.classList.add("br34-playing");
			});
			video.addEventListener("error", () => this.fail(wrap, video));
			video.src = url;
			wrap.append(video);
			this.players.set(wrap, video);
			video.play().catch((err) => {
				if (err?.name !== "AbortError") this.fail(wrap, video);
			});
		}
		fail(wrap, video) {
			if (this.players.get(wrap) !== video) return;
			const tries = (this.attempts.get(wrap) ?? 0) + 1;
			this.attempts.set(wrap, tries);
			this.stop(wrap);
			if (tries >= MAX_ATTEMPTS) return;
			window.clearTimeout(this.retryTimers.get(wrap));
			this.retryTimers.set(wrap, window.setTimeout(() => {
				this.retryTimers.delete(wrap);
				this.reconcile();
			}, RETRY_DELAY_MS * tries));
		}
		stop(wrap) {
			wrap.classList.remove("br34-playing");
			const video = this.players.get(wrap);
			if (!video) return;
			this.players.delete(wrap);
			video.pause();
			video.removeAttribute("src");
			video.load();
			video.remove();
		}
		forget(wrap) {
			this.stop(wrap);
			window.clearTimeout(this.retryTimers.get(wrap));
			this.retryTimers.delete(wrap);
			this.attempts.delete(wrap);
		}
	};
	var WATCH_KEY = "better_rule34_watch_v2";
	var MAX_RECORDS = 5e3;
	var VALID_ID = /^\d{1,12}$/;
	function parseWatchMap(raw) {
		if (!raw) return {};
		let parsed;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return {};
		}
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		const out = {};
		for (const [id, value] of Object.entries(parsed)) {
			if (!VALID_ID.test(id) || !value || typeof value !== "object") continue;
			const { at, manual } = value;
			if (typeof at !== "number" || !Number.isFinite(at)) continue;
			out[id] = {
				at,
				manual: manual === true
			};
		}
		return out;
	}
	function pruneWatchMap(map, max = MAX_RECORDS) {
		const entries = Object.entries(map);
		if (entries.length <= max) return map;
		entries.sort((a, b) => b[1].at - a[1].at);
		return Object.fromEntries(entries.slice(0, max));
	}
	function defaultStore() {
		try {
			return typeof localStorage === "undefined" ? null : localStorage;
		} catch {
			return null;
		}
	}
	var store = defaultStore();
	var cache = null;
	var listeners = new Set();
	function notify() {
		for (const fn of listeners) fn();
	}
	function read() {
		if (!cache) {
			let raw = null;
			try {
				raw = store?.getItem(WATCH_KEY) ?? null;
			} catch {
				raw = null;
			}
			cache = parseWatchMap(raw);
		}
		return cache;
	}
	function write(map) {
		cache = map;
		try {
			store?.setItem(WATCH_KEY, JSON.stringify(map));
		} catch {}
		notify();
	}
	function isWatched(id) {
		return VALID_ID.test(id) && Object.prototype.hasOwnProperty.call(read(), id);
	}
	function markWatched(id, manual = false, now = Date.now()) {
		if (!VALID_ID.test(id)) return;
		write(pruneWatchMap({
			...read(),
			[id]: {
				at: now,
				manual
			}
		}));
	}
	function unmarkWatched(id) {
		if (!isWatched(id)) return;
		const next = { ...read() };
		delete next[id];
		write(next);
	}
	function toggleWatched(id) {
		if (isWatched(id)) {
			unmarkWatched(id);
			return false;
		}
		markWatched(id, true);
		return true;
	}
	function onWatchChange(fn) {
		listeners.add(fn);
		return () => {
			listeners.delete(fn);
		};
	}
	if (typeof window !== "undefined") window.addEventListener("storage", (e) => {
		if (e.key === WATCH_KEY) {
			cache = null;
			notify();
		}
	});
	var MARK_CLASS = "br34-mark";
	function decorateCard(card, id, watched) {
		const wrap = card.querySelector(".wrap_image");
		if (!wrap || !id || wrap.querySelector(`.${MARK_CLASS}`)) return;
		const button = document.createElement("button");
		button.type = "button";
		button.className = MARK_CLASS;
		button.dataset.id = id;
		button.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			toggleWatched(id);
		});
		wrap.append(button);
		paintCard(card, watched);
	}
	function paintCard(card, watched) {
		card.classList.toggle("br34-watched", watched);
		const button = card.querySelector(`.${MARK_CLASS}`);
		if (!button) return;
		button.textContent = watched ? "✓ WATCHED" : "+ MARK";
		button.title = watched ? "Mark as unwatched" : "Mark as watched";
		button.setAttribute("aria-pressed", String(watched));
	}
	var STORAGE_KEY = "better_rule34_console_v2";
	var RATING_PRESETS = [
		0,
		50,
		60,
		70,
		75,
		80,
		85,
		90,
		95
	];
	var VIEWS_PRESETS = [
		0,
		1e3,
		5e3,
		1e4,
		25e3,
		5e4,
		75e3,
		1e5,
		25e4,
		5e5
	];
	function ratingLabel(min) {
		return min > 0 ? `${min}%+` : "Any";
	}
	function viewsLabel(min) {
		if (min <= 0) return "Any";
		if (min >= 1e6) return `${min / 1e6}M+`;
		return `${min / 1e3}K+`;
	}
	function nearestPreset(value, presets) {
		let best = presets[0];
		for (const p of presets) if (Math.abs(p - value) < Math.abs(best - value)) best = p;
		return best;
	}
	function finiteOr(v, fallback) {
		return typeof v === "number" && Number.isFinite(v) ? v : fallback;
	}
	function loadFilter(raw) {
		let saved = {};
		try {
			saved = (raw ? JSON.parse(raw) : null) ?? {};
		} catch {
			saved = {};
		}
		const rating = Math.min(100, Math.max(0, finiteOr(saved.minRating, 0)));
		const views = Math.max(0, finiteOr(saved.minViews, 0));
		return {
			minRating: nearestPreset(rating, RATING_PRESETS),
			minViews: nearestPreset(views, VIEWS_PRESETS)
		};
	}
	function pill(kind, value, label) {
		return `<button type="button" class="fs-opt radio" aria-pressed="false" data-br34-kind="${kind}" data-br34-value="${value}">${label}</button>`;
	}
	function readStorage() {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch {
			return null;
		}
	}
	var SheetFilter = class {
		onChange;
		root;
		count;
		filter;
		constructor(onChange) {
			this.onChange = onChange;
			this.filter = loadFilter(readStorage());
			this.root = document.createElement("div");
			this.root.className = "br34-root";
			this.root.innerHTML = `
      <div class="fs-sec">
        <div class="fs-sec__h"><h3>Min rating</h3><span class="fs-right fs-hint" data-out="rating"></span></div>
        <div class="fs-opts" role="group" aria-label="Minimum rating">
          ${RATING_PRESETS.map((v) => pill("rating", v, ratingLabel(v))).join("")}
        </div>
      </div>
      <div class="fs-sec">
        <div class="fs-sec__h"><h3>Min views</h3><span class="fs-right fs-hint" data-out="views"></span></div>
        <div class="fs-opts" role="group" aria-label="Minimum views">
          ${VIEWS_PRESETS.map((v) => pill("views", v, viewsLabel(v))).join("")}
        </div>
        <p class="fs-hint br34-count"></p>
      </div>`;
			this.count = this.root.querySelector(".br34-count");
			this.root.addEventListener("click", this.onPillClick);
			this.paint();
		}
		getFilter() {
			return { ...this.filter };
		}
		mount(body) {
			if (this.root.parentElement !== body) body.append(this.root);
		}
		reset() {
			this.filter = { ...DEFAULT_FILTER };
			this.commit();
		}
		setCount(visible, total) {
			this.count.textContent = `${visible} of ${total} loaded videos shown`;
		}
		onPillClick = (e) => {
			const pillEl = e.target instanceof Element ? e.target.closest("[data-br34-kind]") : null;
			if (!pillEl) return;
			e.stopPropagation();
			const value = Number(pillEl.dataset.br34Value);
			if (pillEl.dataset.br34Kind === "rating") this.filter.minRating = value;
			else this.filter.minViews = value;
			this.commit();
		};
		commit() {
			this.paint();
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(this.filter));
			} catch {}
			this.onChange({ ...this.filter });
		}
		paint() {
			for (const btn of this.root.querySelectorAll("[data-br34-kind]")) {
				const current = btn.dataset.br34Kind === "rating" ? this.filter.minRating : this.filter.minViews;
				const on = Number(btn.dataset.br34Value) === current;
				btn.classList.toggle("is-on", on);
				btn.setAttribute("aria-pressed", String(on));
			}
			this.root.querySelector("[data-out=\"rating\"]").textContent = ratingLabel(this.filter.minRating);
			this.root.querySelector("[data-out=\"views\"]").textContent = viewsLabel(this.filter.minViews);
		}
	};
	var CSS = `
/* ==========================================================================
   Better Rule34Video - Industrial Brutalism + Erotic Latex Edition
   ========================================================================== */

/* --- SITE-WIDE THEME ENHANCEMENTS --- */
body {
  background: #08060a !important;
  color: #e5e5e9 !important;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
}


/* Header & Container Cleanup */
.header {
  background: #0a070e !important;
  border-bottom: 1px solid #ff0055 !important;
  box-shadow: 0 4px 20px rgba(255, 0, 85, 0.15) !important;
}


.logo a svg {
  filter: drop-shadow(0 0 8px rgba(255, 0, 85, 0.6));
}


.headline .title {
  font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  color: #ffffff !important;
  border-left: 3px solid #ff0055;
  padding-left: 10px;
}


/* Card Enhancements - Brutalist Erotic Precision Frame */
.item.thumb {
  background: #0e0a14 !important;
  border: 1px solid rgba(255, 0, 85, 0.25) !important;
  border-radius: 4px !important;
  padding: 6px 6px 8px 6px !important;
  margin-bottom: 16px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7) !important;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}


.item.thumb:hover {
  transform: translateY(-3px) !important;
  border-color: #ff0055 !important;
  box-shadow: 0 8px 24px rgba(255, 0, 85, 0.35), 0 0 10px rgba(255, 0, 85, 0.15) !important;
}


.item.thumb a.th,
.item.thumb .th {
  display: block !important;
  text-decoration: none !important;
  color: inherit !important;
  width: 100% !important;
  outline: none !important;
}


.item.thumb .img.wrap_image,
.item.thumb .wrap_image,
.th .wrap_image {
  position: relative !important;
  border-radius: 2px !important;
  overflow: hidden !important;
  background: #050307 !important;
  border: 1px solid rgba(255, 255, 255, 0.06) !important;
  width: 100% !important;
  display: block !important;
}


.item.thumb .wrap_image img {
  width: 100% !important;
  height: auto !important;
  display: block !important;
}


.item.thumb .thumb_title {
  color: #f1f1f5 !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  line-height: 1.35 !important;
  height: 2.7em !important;
  max-height: 2.7em !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  margin: 6px 0 4px 0 !important;
  padding: 0 2px !important;
  transition: color 0.15s ease !important;
}


.item.thumb:hover .thumb_title {
  color: #ff0055 !important;
}




/* Metadata Row (Clean 2-item layout: Rating on left, Views on right - NO overlap) */
.item.thumb .thumb_info,
.item.thumb .video-card-meta {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 6px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 11px !important;
  color: #8c8998 !important;
  padding: 2px 2px 0 2px !important;
  margin: 0 !important;
  line-height: 1.2 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}


/* Rating */
.item.thumb .thumb_info .rating,
.item.thumb .video-card-meta__rating {
  color: #00e676 !important;
  font-weight: 700 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  white-space: nowrap !important;
}


.item.thumb .thumb_info .rating svg,
.item.thumb .video-card-meta__rating svg {
  fill: #00e676 !important;
  width: 12px !important;
  height: 12px !important;
}


/* Views (Explicitly targeting video-views-count so comment count is never matched) */
.item.thumb .video-views-count,
.item.thumb .video-card-meta__views {
  color: #a5a2b3 !important;
  font-weight: 700 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  white-space: nowrap !important;
}


.item.thumb .video-views-count svg,
.item.thumb .video-card-meta__views svg {
  fill: #a5a2b3 !important;
  width: 12px !important;
  height: 12px !important;
}


/* HIDE "x min / hours ago" as requested */
.item.thumb .thumb_info .added,
.item.thumb .video-card-meta__date,
.item.thumb .added,
.thumb_info .added,
.video-card-meta__date {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}


/* HIDE comments on cards only (watch-page #comments_box untouched) */
.item.thumb .video-comments-count,
.item.thumb [class*="comment" i] {
  display: none !important;
}


/* Suppress ads */
.spot-thumb,
.spots,
.sidebar_ad_buttons,
.footer_spots,
ins.adsbyjuicy {
  display: none !important;
}


.item.thumb[data-br34-hidden="true"] {
  display: none !important;
}

/* ==========================================================================
   Better Rule34Video
   ========================================================================== */

/* Autopager status: loading, end of list, retry */
.br34-sentinel { height: 1px; }
.br34-autopager-container { width: 100%; margin: 30px 0 50px; text-align: center; clear: both; }
.br34-autopager-loading {
  display: inline-flex; align-items: center; gap: 10px;
  background: rgba(9, 6, 13, 0.95); border: 1px solid #ff0055; border-radius: 6px;
  padding: 8px 18px; color: #fff;
  font: 700 11px/1 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase;
}
.br34-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255, 0, 85, 0.2); border-top-color: #ff0055;
  border-radius: 50%; animation: br34-spin 0.6s linear infinite;
}
@keyframes br34-spin { to { transform: rotate(360deg); } }
.br34-autopager-end {
  display: inline-block; background: rgba(9, 6, 13, 0.95); border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 6px; color: #8c8998; padding: 8px 18px;
  font: 700 11px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase;
}
.br34-autopager-error { border-color: #ff0055; color: #ff0055; }
.br34-retry {
  margin-left: 6px; padding: 4px 10px; color: #ff0055; background: transparent;
  border: 1px solid #ff0055; border-radius: 4px; cursor: pointer;
  font: 800 10px/1 'JetBrains Mono', monospace; letter-spacing: 0.08em;
}
.br34-retry:hover { background: #ff0055; color: #000; }

/* Page boundary between auto-loaded pages */
.br34-page-sep {
  width: 100%; flex-basis: 100%; grid-column: 1 / -1; clear: both; text-align: center;
  margin: 18px 0 22px; padding: 7px 0;
  border-top: 1px dashed rgba(255, 0, 85, 0.4); border-bottom: 1px dashed rgba(255, 0, 85, 0.4);
  color: #ff0055; background: rgba(255, 0, 85, 0.05);
  font: 800 10.5px/1.4 'JetBrains Mono', monospace; letter-spacing: 0.1em; user-select: none;
}

/* Watched cards: a dark, desaturated layer over the whole thumbnail.
   It does not depend on which element or class the site uses for the image. */
.item.thumb.br34-watched .wrap_image::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(8, 6, 10, 0.55);
  backdrop-filter: grayscale(1);
  -webkit-backdrop-filter: grayscale(1);
  pointer-events: none;
}
.item.thumb.br34-watched .thumb_title,
.item.thumb.br34-watched .thumb_info { opacity: 0.5; }
.item.thumb .wrap_image .time,
.item.thumb .wrap_image .quality,
.item.thumb .wrap_image .sound,
.item.thumb .wrap_image .futa { z-index: 5; }

/* Mark button on each card: always visible, filled when watched */
.br34-mark {
  position: absolute; top: 6px; left: 6px; z-index: 6;
  padding: 3px 7px; color: #f1f1f5; background: rgba(10, 7, 14, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 3px; cursor: pointer;
  font: 700 10px/1.2 'JetBrains Mono', monospace; letter-spacing: 0.04em;
}
.br34-mark:hover { border-color: #ff0055; color: #fff; }
.br34-mark[aria-pressed="true"] { background: #ff0055; border-color: #ff0055; color: #000; }

/* Autoplay previews: invisible until a frame is actually playing */
.br34-autoplay-video {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  z-index: 2; pointer-events: none; opacity: 0; transition: opacity 0.2s ease;
  background: #050307;
}
.br34-playing .br34-autoplay-video { opacity: 1; }
.br34-playing .custom-play { opacity: 0 !important; }

/* Min rating and min views inside the ALL FILTERS sheet */
.br34-root { margin-top: 2px; }
.br34-count { margin: 8px 0 0; }

/* Video page: "Mark watched" in the action row, and the fallback button */
.vp-btn.br34-watch-btn.is-on { color: #ff0055; }
.br34-dock { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; display: flex; gap: 8px; }

@media (prefers-reduced-motion: reduce) {
  .br34-spinner { animation: none; }
  .br34-autoplay-video, .item.thumb { transition: none !important; }
}
`;
	var WATCH_THRESHOLD = .85;
	var MAX_JUMP_SECONDS = 2;
	var CHECK_ICON = "<svg class=\"vp-ico\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z\"></path></svg>";
	function watchIdFromPath(pathname) {
		const match = /^\/videos?\/(\d{1,12})(?:\/|$)/.exec(pathname);
		return match ? match[1] : null;
	}
	function createCoverageTracker(duration, threshold = WATCH_THRESHOLD, maxJump = MAX_JUMP_SECONDS) {
		const seen = new Set();
		let last = null;
		let reached = false;
		return {
			get covered() {
				return seen.size;
			},
			reset() {
				last = null;
			},
			update(time, playing) {
				if (!playing || !Number.isFinite(time) || !(duration > 0)) {
					last = null;
					return false;
				}
				if (last !== null && time >= last && time - last <= maxJump) for (let s = Math.floor(last); s <= Math.floor(time); s++) seen.add(s);
				else seen.add(Math.floor(time));
				last = time;
				if (!reached && Math.min(seen.size, duration) / duration >= threshold) {
					reached = true;
					return true;
				}
				return false;
			}
		};
	}
	function findMainVideo() {
		for (const v of document.querySelectorAll("video")) if ((v.currentSrc || v.src || v.querySelector("source")?.src || "").includes("/get_file/")) return v;
		return document.querySelector("#kt_player video, .player video, .video-player video");
	}
	var attached = false;
	function attachWatchTracker() {
		const id = watchIdFromPath(window.location.pathname);
		if (!id || attached) return;
		attached = true;
		let bound = null;
		let tracker = null;
		let trackedDuration = 0;
		const onMeta = () => {
			if (!bound) return;
			const d = bound.duration;
			if (!Number.isFinite(d) || d <= 0 || tracker && Math.abs(d - trackedDuration) < 1) return;
			trackedDuration = d;
			tracker = createCoverageTracker(d);
		};
		const onTime = () => {
			if (!bound || !tracker) return;
			const playing = !bound.paused && !bound.seeking && !bound.ended;
			if (tracker.update(bound.currentTime, playing) && !isWatched(id)) markWatched(id, false);
		};
		const onReset = () => tracker?.reset();
		const bind = (v) => {
			if (v === bound) return;
			bound = v;
			tracker = null;
			trackedDuration = 0;
			v.addEventListener("loadedmetadata", onMeta);
			v.addEventListener("durationchange", onMeta);
			v.addEventListener("timeupdate", onTime);
			v.addEventListener("pause", onReset);
			v.addEventListener("seeking", onReset);
			onMeta();
		};
		const first = findMainVideo();
		if (first) bind(first);
		new MutationObserver(() => {
			if (bound?.isConnected) return;
			const v = findMainVideo();
			if (v && v !== bound) bind(v);
		}).observe(document.body || document.documentElement, {
			childList: true,
			subtree: true
		});
	}
	function paintToggle(button) {
		const on = isWatched(button.dataset.id ?? "");
		button.classList.toggle("is-on", on);
		button.setAttribute("aria-pressed", String(on));
		button.title = on ? "Mark as unwatched" : "Mark as watched";
		const label = button.querySelector(".vp-btn__label");
		if (label) label.textContent = on ? "Watched" : "Mark watched";
	}
	function floatingHost() {
		let dock = document.querySelector(".br34-dock");
		if (!dock) {
			dock = document.createElement("div");
			dock.className = "br34-dock";
			document.body.append(dock);
		}
		return dock;
	}
	var toggleSubscribed = false;
	function mountWatchToggle() {
		const id = watchIdFromPath(window.location.pathname);
		if (!id) return;
		let button = document.querySelector(".br34-watch-btn");
		if (!button) {
			button = document.createElement("button");
			button.type = "button";
			button.className = "vp-btn br34-watch-btn";
			button.dataset.id = id;
			button.innerHTML = `${CHECK_ICON}<span class="vp-btn__label"></span>`;
			button.addEventListener("click", () => toggleWatched(id));
		}
		if (!button.isConnected) {
			const row = document.querySelector(".vp-actions") ?? floatingHost();
			row.insertBefore(button, row.querySelector(":scope > [data-sheet=\"more\"]"));
		}
		paintToggle(button);
		if (!toggleSubscribed) {
			toggleSubscribed = true;
			onWatchChange(() => {
				for (const b of document.querySelectorAll(".br34-watch-btn")) paintToggle(b);
			});
		}
	}
	var MAX_ACTIVE_PREVIEWS = window.matchMedia?.("(pointer: coarse)").matches ? 6 : 12;
	var MIN_VISIBLE_RATIO = .5;
	var MAX_EMPTY_PAGES = 3;
	var SCAN_DELAY_MS = 100;
	var SHEET_MARK = "[data-sec=\"date\"], [data-sec=\"dur\"]";
	var SHEET_RESET = ".fs-sheet__foot [data-act=\"reset\"]";
	var managed = new Map();
	var filterBar = null;
	var currentFilter = null;
	var autoPager = null;
	var autoplay = null;
	var lastListKey = null;
	var watchSubscribed = false;
	var emptyPages = 0;
	var scanTimer = 0;
	function saveDataOn() {
		return navigator.connection?.saveData === true;
	}
	function injectStyles() {
		if (document.getElementById("br34-styles")) return;
		const style = document.createElement("style");
		style.id = "br34-styles";
		style.textContent = CSS;
		(document.head || document.documentElement).append(style);
	}
	function adopt(el) {
		if (managed.has(el)) return;
		if (isAdCard(el)) {
			el.remove();
			return;
		}
		const data = extractCardData(el);
		if (!data) return;
		managed.set(el, data);
		hardenAnchorsIn(el);
		decorateCard(el, data.id, isWatched(data.id));
		autoplay?.observe(el);
	}
	function scanCards() {
		const container = findVideosContainer();
		if (!container) return;
		for (const el of container.querySelectorAll(".item.thumb")) adopt(el);
		for (const el of [...managed.keys()]) {
			if (el.isConnected) continue;
			managed.delete(el);
			autoplay?.unobserve(el);
		}
	}
	function applyFilter() {
		if (!currentFilter) return;
		let visible = 0;
		for (const [el, data] of managed) {
			const ok = matchesClientFilter(data, currentFilter);
			el.dataset.br34Hidden = ok ? "false" : "true";
			if (ok) visible++;
		}
		filterBar?.setCount(visible, managed.size);
	}
	function syncWatchState() {
		for (const [el, data] of managed) paintCard(el, isWatched(data.id));
		autoplay?.refresh();
	}
	function syncUrlSort(sortBy) {
		try {
			const url = new URL(window.location.href);
			if (sortBy) url.searchParams.set("sort_by", sortBy);
			else url.searchParams.delete("sort_by");
			for (const k of [...url.searchParams.keys()]) if (isPaginationKey(k)) url.searchParams.delete(k);
			url.pathname = stripPageSegment(url.pathname);
			window.history.replaceState(window.history.state, "", url.toString());
		} catch {}
	}
	function firstCardId() {
		for (const el of findVideosContainer()?.querySelectorAll(".item.thumb") ?? []) {
			const id = cardIdOf(el);
			if (id) return id;
		}
		return "";
	}
	function currentListKey() {
		const params = new URLSearchParams(window.location.search);
		for (const k of [...params.keys()]) if (isPaginationKey(k) || k === "sort_by") params.delete(k);
		return `${window.location.pathname}?${params}|${readActiveSort(document) ?? ""}|${firstCardId()}`;
	}
	function mountSheetControls() {
		if (!filterBar) return;
		for (const body of document.querySelectorAll(".fs-sheet__body")) if (body.querySelector(SHEET_MARK)) {
			filterBar.mount(body);
			return;
		}
	}
	function refresh() {
		unclipBodyOverflow();
		cleanAds();
		mountSheetControls();
		scanCards();
		applyFilter();
	}
	function reloadList() {
		syncUrlSort(readActiveSort(document));
		managed.clear();
		autoplay?.reset();
		emptyPages = 0;
		refresh();
		autoPager?.reset();
		lastListKey = currentListKey();
	}
	function onFilterChange(filter) {
		currentFilter = filter;
		emptyPages = 0;
		applyFilter();
		autoPager?.nudge();
	}
	function onNewCards(els) {
		for (const el of els) adopt(el);
		applyFilter();
		emptyPages = els.some((el) => el.dataset.br34Hidden !== "true") ? 0 : emptyPages + 1;
		if (emptyPages < MAX_EMPTY_PAGES) autoPager?.nudge();
	}
	function boot() {
		injectStyles();
		unclipBodyOverflow();
		cleanAds();
		initNewTab(document);
		if (!isListingPage()) {
			attachWatchTracker();
			mountWatchToggle();
			return;
		}
		if (!findVideosContainer()) return;
		filterBar ??= new SheetFilter(onFilterChange);
		currentFilter = filterBar.getFilter();
		autoplay ??= new AutoplayController({
			maxActive: MAX_ACTIVE_PREVIEWS,
			minRatio: MIN_VISIBLE_RATIO,
			enabled: !saveDataOn(),
			isEligible: (card) => !card.classList.contains("br34-watched")
		});
		if (!watchSubscribed) {
			watchSubscribed = true;
			onWatchChange(syncWatchState);
		}
		if (!autoPager) {
			refresh();
			autoPager = new AutoPager({ onNewCards });
			autoPager.init();
			lastListKey = currentListKey();
			return;
		}
		if (currentListKey() !== lastListKey) reloadList();
		else refresh();
	}
	function scheduleScan() {
		window.clearTimeout(scanTimer);
		scanTimer = window.setTimeout(() => {
			if (!isListingPage()) return;
			if (!filterBar) {
				boot();
				return;
			}
			if (currentListKey() !== lastListKey) reloadList();
			else refresh();
		}, SCAN_DELAY_MS);
	}
	document.addEventListener("click", (e) => {
		if (e.target instanceof Element && e.target.closest(SHEET_RESET)) filterBar?.reset();
	});
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
	else boot();
	window.addEventListener("load", boot);
	new MutationObserver((mutations) => {
		if (autoPager?.getIsAppending()) return;
		let cards = false;
		let sheet = false;
		for (const m of mutations) for (const node of m.addedNodes) {
			if (!(node instanceof HTMLElement)) continue;
			cards ||= node.matches(".item.thumb") || !!node.querySelector(".item.thumb");
			sheet ||= node.matches(SHEET_MARK) || !!node.querySelector(SHEET_MARK);
		}
		if (sheet) mountSheetControls();
		if (cards) scheduleScan();
	}).observe(document.body || document.documentElement, {
		childList: true,
		subtree: true
	});
})();
