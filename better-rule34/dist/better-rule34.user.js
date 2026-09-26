// ==UserScript==
// @name         Better Rule34Video
// @namespace    https://github.com/quantavil/userscript/
// @version      1.5.0
// @author       quantavil
// @description  Streamlined filter bar, instant client search & filtering, ad cleaner, and seamless auto next page infinite scroll for Rule34Video.
// @license      MIT
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
	var BASE_YEAR = 2018;
	var DEFAULT_FILTER = {
		query: "",
		soundOnly: false,
		hdOnly: false,
		futaFilter: "all",
		hideWatched: false,
		minRating: 0,
		minViews: 0,
		minYear: BASE_YEAR,
		durationMinSeconds: null
	};
	function parseDuration(timeStr) {
		if (!timeStr) return 0;
		const cleaned = timeStr.trim().replace(/[^\d:]/g, "");
		if (!cleaned) return 0;
		const parts = cleaned.split(":").map((p) => parseInt(p, 10));
		if (parts.some(isNaN)) return 0;
		if (parts.length === 1) return parts[0];
		if (parts.length === 2) return parts[0] * 60 + parts[1];
		if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
		return 0;
	}
	function parseViews(viewStr) {
		if (!viewStr) return 0;
		const match = /([\d.]+)\s*([KkMmBb])?/.exec(viewStr.replace(/,/g, "").trim());
		if (!match) return 0;
		const num = parseFloat(match[1]);
		if (isNaN(num)) return 0;
		const unit = match[2]?.toUpperCase();
		if (unit === "K") return Math.round(num * 1e3);
		if (unit === "M") return Math.round(num * 1e6);
		if (unit === "B") return Math.round(num * 1e9);
		return Math.round(num);
	}
	function parseRating(ratingStr) {
		if (!ratingStr) return {
			percent: 0,
			count: 0
		};
		const percentMatch = /(\d+)%/.exec(ratingStr);
		const countMatch = /\(([\d,]+)\)/.exec(ratingStr);
		return {
			percent: percentMatch ? parseInt(percentMatch[1], 10) : 0,
			count: countMatch ? parseInt(countMatch[1].replace(/,/g, ""), 10) : 0
		};
	}
	function parseSubmittedYear(dateStr, currentYear = new Date().getFullYear()) {
		if (!dateStr) return currentYear;
		const text = dateStr.toLowerCase().trim();
		const explicitYearMatch = /\b(20[12]\d)\b/.exec(text);
		if (explicitYearMatch) return parseInt(explicitYearMatch[1], 10);
		const yearsAgoMatch = /(\d+)\s+years?\s+ago/.exec(text);
		if (yearsAgoMatch) {
			const diff = parseInt(yearsAgoMatch[1], 10);
			return Math.max(BASE_YEAR, currentYear - diff);
		}
		const monthsAgoMatch = /(\d+)\s+months?\s+ago/.exec(text);
		if (monthsAgoMatch) {
			const months = parseInt(monthsAgoMatch[1], 10);
			const d = new Date();
			d.setMonth(d.getMonth() - months);
			return d.getFullYear();
		}
		return currentYear;
	}
	function isAdCard(el) {
		if (el.classList.contains("spot-thumb") || el.closest(".spots")) return true;
		if (el.querySelector("iframe")) return true;
		const header = el.querySelector("header");
		if (header && /AD/i.test(header.textContent ?? "")) return true;
		const link = el.querySelector("a.th, a");
		if (link) {
			const href = link.getAttribute("href") || "";
			if (href.includes("/v1/d.php") || href.includes("sadbaguette") || href.includes("ku34bh9la09")) return true;
		}
		const hasVideoCardId = Boolean(el.dataset.videoCardId);
		const hasVideoHref = Boolean(el.querySelector("a[href*=\"/video/\"]"));
		return !hasVideoCardId && !hasVideoHref;
	}
	function extractCardData(el) {
		if (isAdCard(el)) return null;
		const cardLink = el.querySelector("a.th, a[href*=\"/video/\"]");
		const href = cardLink?.getAttribute("href") || "";
		const id = el.dataset.videoCardId || videoIdFromHref(href) || "";
		if (!id || !href) return null;
		const title = el.querySelector(".thumb_title")?.textContent?.trim() || cardLink?.getAttribute("title")?.trim() || "";
		const imgEl = el.querySelector("img.thumb, img");
		const thumbUrl = imgEl?.getAttribute("data-webp") || imgEl?.getAttribute("data-original") || imgEl?.src || "";
		const previewWrap = el.querySelector(".wrap_image");
		const previewUrl = previewWrap?.dataset.preview || previewWrap?.getAttribute("data-preview") || null;
		const durationFormatted = el.querySelector(".time")?.textContent?.trim() || "";
		const durationSeconds = parseDuration(durationFormatted);
		const { percent: ratingPercent, count: votesCount } = parseRating((el.querySelector(".video-card-meta__rating") || el.querySelector(".rating"))?.textContent ?? "");
		const viewsFormatted = (el.querySelector(".video-views-count") || el.querySelector(".views"))?.textContent?.trim() || "";
		const viewsCount = parseViews(viewsFormatted);
		const commentsEl = el.querySelector(".video-comments-count");
		const commentsCount = parseInt(commentsEl?.textContent?.trim() || "0", 10) || 0;
		const hasSound = el.querySelector(".sound") !== null;
		const isHd = el.querySelector(".quality") !== null || el.querySelector(".custom-hd") !== null;
		const isFuta = el.querySelector(".futa") !== null;
		const isWatched = previewWrap?.classList.contains("watched") || el.classList.contains("watched") || Boolean(el.querySelector(".watched"));
		const dateEl = el.querySelector(".video-card-meta__date") || el.querySelector(".added");
		const submittedAgo = dateEl?.getAttribute("title") || dateEl?.textContent?.trim() || "";
		const submittedYear = parseSubmittedYear(submittedAgo);
		return {
			id,
			title,
			url: href.startsWith("http") ? href : new URL(href, "https://rule34video.com").href,
			previewUrl,
			thumbUrl,
			durationSeconds,
			durationFormatted,
			ratingPercent,
			votesCount,
			viewsCount,
			viewsFormatted,
			commentsCount,
			hasSound,
			isHd,
			isFuta,
			isWatched,
			submittedAgo,
			submittedYear
		};
	}
	function videoIdFromHref(href) {
		if (!href) return "";
		return /video\/(\d+)/.exec(href)?.[1] || "";
	}
	function viewsToNearestStep(views, steps) {
		if (!steps.length) return 0;
		let best = 0;
		let bestDist = Math.abs(views - steps[0]);
		for (let i = 1; i < steps.length; i++) {
			const d = Math.abs(views - steps[i]);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		return best;
	}
	function matchesClientFilter(card, filter) {
		if (filter.query.trim()) {
			const keywords = filter.query.toLowerCase().trim().split(/\s+/);
			const titleLower = card.title.toLowerCase();
			for (const kw of keywords) if (!titleLower.includes(kw)) return false;
		}
		if (filter.soundOnly && !card.hasSound) return false;
		if (filter.hdOnly && !card.isHd) return false;
		if (filter.futaFilter === "hide" && card.isFuta) return false;
		if (filter.futaFilter === "only" && !card.isFuta) return false;
		if (filter.hideWatched && card.isWatched) return false;
		if (filter.minRating > 0 && card.ratingPercent < filter.minRating) return false;
		if (filter.minViews > 0 && card.viewsCount < filter.minViews) return false;
		if (filter.minYear > 2018 && card.submittedYear < filter.minYear) return false;
		if (filter.durationMinSeconds !== null && card.durationSeconds < filter.durationMinSeconds) return false;
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
	function parseCurrentUrlFilters(urlStr) {
		try {
			const params = new URL(urlStr).searchParams;
			const result = {};
			const fromDate = params.get("post_date_from");
			if (fromDate) {
				const yrMatch = /^(\d{4})/.exec(fromDate);
				if (yrMatch) result.minYear = Math.max(BASE_YEAR, parseInt(yrMatch[1], 10));
			}
			const fromDur = params.get("duration_from");
			if (fromDur && !isNaN(parseInt(fromDur, 10))) result.durationMinSeconds = parseInt(fromDur, 10);
			return result;
		} catch {
			return {};
		}
	}
	function parseKvsParameters(dataParams) {
		const raw = {};
		if (!dataParams) return {
			fromParam: null,
			sortBy: null,
			query: null,
			tagIds: null,
			raw
		};
		const parts = dataParams.split(";");
		for (const part of parts) {
			const colonIdx = part.indexOf(":");
			if (colonIdx !== -1) {
				const key = part.slice(0, colonIdx).trim();
				const val = part.slice(colonIdx + 1).trim();
				if (key) raw[key] = val;
			}
		}
		let fromParam = null;
		for (const k of Object.keys(raw)) if (/(?:from_videos(?:\+| )from_albums|from_videos|from_albums|from)/i.test(k)) {
			const parsed = parseInt(raw[k], 10);
			if (!isNaN(parsed) && parsed > 0) {
				fromParam = parsed;
				break;
			}
		}
		const sortBy = raw["sort_by"] !== void 0 && raw["sort_by"] !== "" ? raw["sort_by"] : null;
		const query = raw["q"] !== void 0 && raw["q"] !== "" ? raw["q"] : null;
		const tagIds = raw["tag_ids"] !== void 0 && raw["tag_ids"] !== "" ? raw["tag_ids"] : null;
		return {
			fromParam,
			sortBy,
			query,
			tagIds,
			raw
		};
	}
	var AD_SELECTORS = [
		".spot-thumb",
		".spots",
		".sidebar_ad_buttons",
		".footer_spots",
		"ins.adsbyjuicy",
		"iframe[src*=\"sadbaguette\"]",
		"iframe[src*=\"traffic\"]",
		"iframe[src*=\"ads\"]",
		"iframe[src*=\"adserver\"]",
		"iframe[src*=\"/ads/\"]",
		"iframe[src*=\"juicy\"]",
		".item.thumb:has(header)",
		".item.thumb:has(iframe)",
		".item.thumb a[href*=\"/v1/d.php\"]"
	];
	function cleanAds(root = document) {
		for (const selector of AD_SELECTORS) try {
			const elements = root.querySelectorAll(selector);
			for (const el of elements) (el.closest(".item.thumb") ?? el).remove();
		} catch {}
		const thumbs = root.querySelectorAll(".item.thumb");
		for (const thumb of thumbs) if (isAdCard(thumb)) thumb.remove();
	}
	var WATCHED_KEY = "better_rule34_watched_v1";
	var MAX_WATCHED = 2e3;
	function readWatchedIds() {
		try {
			const raw = localStorage.getItem(WATCHED_KEY);
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((v) => typeof v === "string");
		} catch {
			return [];
		}
	}
	var cachedIds = null;
	function getWatchedIds() {
		if (!cachedIds) cachedIds = new Set(readWatchedIds());
		return cachedIds;
	}
	function isWatchedId(id) {
		if (!id) return false;
		return getWatchedIds().has(id);
	}
	function markWatched(id) {
		if (!id) return;
		try {
			const ids = readWatchedIds().filter((v) => v !== id);
			ids.push(id);
			while (ids.length > MAX_WATCHED) ids.shift();
			localStorage.setItem(WATCHED_KEY, JSON.stringify(ids));
			if (cachedIds) {
				cachedIds.delete(id);
				cachedIds.add(id);
				while (cachedIds.size > MAX_WATCHED) {
					const oldest = cachedIds.values().next();
					if (oldest.done) break;
					cachedIds.delete(oldest.value);
				}
			}
		} catch {}
	}
	function findVideoAnchor(from) {
		if (!from) return null;
		const anchor = from.closest?.("a[href*=\"/video/\"]");
		if (!(anchor instanceof HTMLAnchorElement)) return null;
		if (!/\/video\//.test(anchor.getAttribute("href") || "")) return null;
		return anchor;
	}
	function hardenAnchor(a) {
		if (a.target !== "_blank") a.target = "_blank";
		const rel = (a.getAttribute("rel") || "").toLowerCase();
		if (!rel.includes("noopener")) a.setAttribute("rel", (rel ? `${rel} ` : "") + "noopener");
	}
	function hardenAnchorsIn(root) {
		const anchors = root.querySelectorAll("a[href*=\"/video/\"]");
		for (const a of anchors) hardenAnchor(a);
	}
	function shouldNewTabClick(e) {
		return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
	}
	var newTabWired = false;
	function initNewTab(scope = document) {
		hardenAnchorsIn(scope);
		if (newTabWired) return () => {};
		newTabWired = true;
		const onClick = (e) => {
			const target = e.target;
			if (!target || !(target instanceof Element)) return;
			const anchor = findVideoAnchor(target);
			if (!anchor) return;
			hardenAnchor(anchor);
			if (!shouldNewTabClick(e)) return;
			const href = anchor.getAttribute("href") || anchor.href;
			if (!href) return;
			e.preventDefault();
			e.stopPropagation();
			markWatched(videoIdFromHref(href));
			window.open(anchor.href, "_blank", "noopener");
		};
		const onAuxClick = (e) => {
			if (e.button !== 1) return;
			const target = e.target;
			if (!target || !(target instanceof Element)) return;
			const anchor = findVideoAnchor(target);
			if (!anchor) return;
			const href = anchor.getAttribute("href") || anchor.href;
			if (!href) return;
			markWatched(videoIdFromHref(href));
		};
		document.addEventListener("click", onClick, true);
		document.addEventListener("auxclick", onAuxClick, true);
		return () => {
			document.removeEventListener("click", onClick, true);
			document.removeEventListener("auxclick", onAuxClick, true);
		};
	}
	function isListingPage(urlStr = window.location.href) {
		try {
			const url = new URL(urlStr);
			if (/\/video(\/|$)/.test(url.pathname)) return false;
			if (/^\/(login|signup|invite|premium|static|info|feedback)/.test(url.pathname)) return false;
			return true;
		} catch {
			return true;
		}
	}
	function findVideosContainer() {
		return document.querySelector(".content_general .thumbs") || document.querySelector("[id^=\"custom_list_videos_\"][id$=\"_items\"].thumbs") || document.querySelector(".twocolumns .thumbs") || document.querySelector(".thumbs") || document.querySelector("[id$=\"_items\"]");
	}
	function unclipBodyOverflow() {
		const wrappers = document.querySelectorAll("body > div");
		for (const w of wrappers) if (w.style.overflow === "hidden") w.style.overflow = "visible";
	}
	function readActiveSort(root = document) {
		const activeBtn = root.querySelector(".filters-panel__section--sort .btn.active, .filters-panel .btn.active[data-parameters*=\"sort_by\"]");
		if (activeBtn) {
			const dataParams = activeBtn.getAttribute("data-parameters") || "";
			const match = /(?:^|;)sort_by:([^;]*)(?:;|$)/.exec(dataParams);
			if (match && match[1]) return match[1];
		}
		return null;
	}
	function computeNextPageUrl(currentUrlStr, nextPageNum, sortBy) {
		try {
			const url = new URL(currentUrlStr);
			const pathname = url.pathname;
			if (sortBy !== void 0) {
				if (sortBy) url.searchParams.set("sort_by", sortBy);
				else url.searchParams.delete("sort_by");
			}
			if (pathname.includes("/search/")) {
				url.searchParams.set("from_videos", String(nextPageNum));
				url.searchParams.delete("from_videos+from_albums");
				url.searchParams.delete("from_videos from_albums");
				return url.toString();
			}
			url.pathname = appendPageToPath(pathname, nextPageNum);
			for (const k of [...url.searchParams.keys()]) if (isPaginationKey(k)) url.searchParams.delete(k);
			return url.toString();
		} catch {
			return null;
		}
	}
	function parseNextLink(root, baseUrl, fallbackSortBy) {
		const nextLink = root.querySelector(".pagination .item.pager.next a, .pagination .item.active + .item a, .pagination a.next");
		if (!nextLink) return {
			url: null,
			fromParam: null,
			sortBy: null
		};
		const raw = nextLink.getAttribute("href") || "";
		const dataParams = nextLink.getAttribute("data-parameters") || "";
		if (raw && !raw.startsWith("#") && !raw.startsWith("javascript:")) return {
			url: resolveNextPageUrl(baseUrl, raw) || null,
			fromParam: null,
			sortBy: null
		};
		if (dataParams) {
			const parsed = parseKvsParameters(dataParams);
			const effectiveSort = parsed.sortBy !== null ? parsed.sortBy : fallbackSortBy ?? null;
			if (parsed.fromParam !== null && !isNaN(parsed.fromParam)) return {
				url: computeNextPageUrl(baseUrl, parsed.fromParam, effectiveSort),
				fromParam: parsed.fromParam,
				sortBy: effectiveSort
			};
		}
		return {
			url: null,
			fromParam: null,
			sortBy: null
		};
	}
	var AutoPager = class {
		container = null;
		statusContainer = null;
		sentinel = null;
		observer = null;
		nextUrl = null;
		currentPage = 1;
		initialPage = 1;
		lastPageUrl = window.location.href;
		isLoading = false;
		isAppending = false;
		seenCardIds = new Set();
		onNewCards;
		onPageLoaded;
		scrollHandler = null;
		constructor(options) {
			this.onNewCards = options.onNewCards;
			this.onPageLoaded = options.onPageLoaded;
		}
		init() {
			unclipBodyOverflow();
			if (!isListingPage()) return;
			this.container = findVideosContainer();
			if (!this.container) return;
			this.currentPage = this.detectCurrentPageNumber();
			this.initialPage = this.currentPage;
			this.lastPageUrl = window.location.href;
			const initialCards = this.container.querySelectorAll(".item.thumb");
			for (const card of initialCards) {
				if (isAdCard(card)) {
					card.remove();
					continue;
				}
				const id = card.dataset.videoCardId || card.querySelector("a[href*=\"/video/\"]")?.getAttribute("href");
				if (id) this.seenCardIds.add(id);
			}
			this.detectNextPageUrl(document);
			this.mountStatusElements();
			this.setupObserver();
			this.setupScrollListener();
		}
		getIsAppending() {
			return this.isAppending;
		}
		getNextUrl() {
			return this.nextUrl;
		}
		getCurrentPage() {
			return this.currentPage;
		}
		getTotalLoadedCount() {
			return this.seenCardIds.size;
		}
		getPagesLoaded() {
			return Math.max(1, this.currentPage - this.initialPage + 1);
		}
		getCurrentPageUrl() {
			return this.lastPageUrl;
		}
		detectCurrentPageNumber() {
			try {
				const url = new URL(window.location.href);
				const fromParam = url.searchParams.get("from_videos") || url.searchParams.get("from_videos+from_albums") || url.searchParams.get("from_videos from_albums") || url.searchParams.get("from") || url.searchParams.get("page") || url.searchParams.get("p");
				if (fromParam) {
					const p = parseInt(fromParam, 10);
					if (!isNaN(p) && p > 0) return p;
				}
				const pageFromPath = pageNumberFromPath(url.pathname);
				if (pageFromPath !== null) return pageFromPath;
			} catch {}
			return 1;
		}
		reset(nextUrl, newPageNumber = 1) {
			if (this.container) for (const sep of this.container.querySelectorAll(".br34-page-sep")) sep.remove();
			this.seenCardIds.clear();
			this.container = findVideosContainer();
			if (this.container) {
				const currentCards = this.container.querySelectorAll(".item.thumb");
				for (const card of currentCards) {
					if (isAdCard(card)) {
						card.remove();
						continue;
					}
					const id = card.dataset.videoCardId || card.querySelector("a[href*=\"/video/\"]")?.getAttribute("href");
					if (id) this.seenCardIds.add(id);
				}
			}
			this.currentPage = newPageNumber;
			this.initialPage = newPageNumber;
			this.lastPageUrl = window.location.href;
			this.isLoading = false;
			this.isAppending = false;
			if (nextUrl !== void 0) this.nextUrl = nextUrl;
			else this.detectNextPageUrl(document);
			this.mountStatusElements();
			this.setupObserver();
		}
		detectNextPageUrl(root) {
			const activeSort = readActiveSort(root);
			const { url, fromParam, sortBy } = parseNextLink(root, window.location.href, activeSort);
			this.nextUrl = null;
			if (url) this.nextUrl = url;
			else if (fromParam !== null && !isNaN(fromParam)) this.nextUrl = computeNextPageUrl(window.location.href, fromParam, sortBy || activeSort);
			if (!this.nextUrl) try {
				if (!new URL(window.location.href).pathname.includes("/search/")) this.nextUrl = computeNextPageUrl(window.location.href, this.currentPage + 1, activeSort);
			} catch {
				this.nextUrl = null;
			}
			const nativePagination = document.querySelector(".pagination");
			if (nativePagination) nativePagination.style.display = "none";
		}
		mountStatusElements() {
			if (!this.container) return;
			if (!this.statusContainer) {
				this.statusContainer = document.createElement("div");
				this.statusContainer.className = "br34-autopager-container";
				this.container.after(this.statusContainer);
			}
			if (!this.sentinel) {
				this.sentinel = document.createElement("div");
				this.sentinel.className = "br34-sentinel";
				this.sentinel.style.height = "1px";
				this.statusContainer.before(this.sentinel);
			}
			this.updateStatusDisplay();
		}
		setupObserver() {
			if (typeof IntersectionObserver === "undefined") return;
			this.observer?.disconnect();
			this.observer = new IntersectionObserver((entries) => {
				if (this.isLoading || !this.nextUrl) return;
				for (const entry of entries) if (entry.isIntersecting) {
					this.loadNextPage();
					break;
				}
			}, {
				rootMargin: "1000px 0px",
				threshold: 0
			});
			if (this.sentinel) this.observer.observe(this.sentinel);
		}
		setupScrollListener() {
			if (this.scrollHandler) return;
			let ticking = false;
			this.scrollHandler = () => {
				if (ticking) return;
				ticking = true;
				requestAnimationFrame(() => {
					ticking = false;
					if (this.isLoading || !this.nextUrl) return;
					const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
					const winHeight = window.innerHeight || document.documentElement.clientHeight;
					const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
					if (scrollY + winHeight >= docHeight - 1200) this.loadNextPage();
				});
			};
			window.addEventListener("scroll", this.scrollHandler, { passive: true });
			window.addEventListener("touchmove", this.scrollHandler, { passive: true });
			window.addEventListener("resize", this.scrollHandler, { passive: true });
		}
		updateStatusDisplay() {
			if (!this.statusContainer) return;
			if (this.isLoading) this.statusContainer.innerHTML = `
        <div class="br34-autopager-loading">
          <div class="br34-spinner"></div>
          <span>ACQUIRING SECTOR // PAGE ${this.currentPage + 1}...</span>
        </div>
      `;
			else if (!this.nextUrl) this.statusContainer.innerHTML = `
        <div class="br34-autopager-end">
          [ ARCHIVE EXHAUSTED // ${this.seenCardIds.size} UNITS INDEXED ]
        </div>
      `;
			else this.statusContainer.innerHTML = "";
		}
		async loadNextPage() {
			if (this.isLoading || !this.nextUrl) return;
			this.container = findVideosContainer();
			if (!this.container) return;
			this.isLoading = true;
			this.updateStatusDisplay();
			const fetchUrl = this.nextUrl;
			let hasError = false;
			try {
				const response = await fetch(fetchUrl, {
					credentials: "include",
					headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
				});
				if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${fetchUrl}`);
				const htmlText = await response.text();
				const doc = new DOMParser().parseFromString(htmlText, "text/html");
				cleanAds(doc);
				const newCardElements = Array.from(doc.querySelectorAll(".thumbs .item.thumb, .item.thumb"));
				const cardsToAppend = [];
				for (const card of newCardElements) {
					if (isAdCard(card)) continue;
					const anchor = card.querySelector("a[href*=\"/video/\"]");
					const href = anchor?.getAttribute("href") || "";
					const id = card.dataset.videoCardId || href;
					if (id && this.seenCardIds.has(id)) continue;
					if (id) this.seenCardIds.add(id);
					if (anchor) hardenAnchor(anchor);
					const img = card.querySelector("img");
					if (img) {
						const webp = img.getAttribute("data-webp") || img.dataset.webp;
						const original = img.getAttribute("data-original") || img.dataset.original;
						const resolvedSrc = webp || original;
						if (resolvedSrc) img.src = resolvedSrc;
						img.removeAttribute("data-original");
						img.removeAttribute("data-webp");
						img.classList.remove("lazy-load");
						img.loading = "lazy";
					}
					cardsToAppend.push(card);
				}
				if (cardsToAppend.length > 0) {
					this.isAppending = true;
					try {
						const sep = document.createElement("div");
						sep.className = "br34-page-sep";
						sep.dataset.page = String(this.currentPage + 1);
						sep.textContent = `[ PAGE ${this.currentPage + 1} ]`;
						this.container.append(sep, ...cardsToAppend);
					} finally {
						setTimeout(() => {
							this.isAppending = false;
						}, 50);
					}
					this.onNewCards(cardsToAppend);
				}
				this.currentPage++;
				this.lastPageUrl = fetchUrl;
				this.onPageLoaded?.(this.currentPage);
				const activeSort = readActiveSort(document);
				const parsed = parseNextLink(doc, fetchUrl, activeSort);
				this.nextUrl = null;
				if (parsed.url) this.nextUrl = parsed.url;
				else if (parsed.fromParam !== null && !isNaN(parsed.fromParam)) this.nextUrl = computeNextPageUrl(fetchUrl, parsed.fromParam, parsed.sortBy || activeSort);
				if (!this.nextUrl && cardsToAppend.length > 0) try {
					if (!new URL(fetchUrl).pathname.includes("/search/")) this.nextUrl = computeNextPageUrl(fetchUrl, this.currentPage + 1, activeSort);
				} catch {
					this.nextUrl = null;
				}
			} catch (err) {
				hasError = true;
				console.error("[Better Rule34] AutoPager error:", err);
				if (this.statusContainer) {
					this.statusContainer.innerHTML = `
          <div class="br34-autopager-end" style="border-color: #ff0055; color: #ff0055;">
            [ ERROR FETCHING SECTOR // <button type="button" class="br34-load-more-btn" style="padding: 4px 10px; font-size: 10px; margin-left: 6px;">RETRY</button> ]
          </div>
        `;
					this.statusContainer.querySelector("button")?.addEventListener("click", () => {
						this.loadNextPage();
					});
				}
			} finally {
				this.isLoading = false;
				if (!hasError) this.updateStatusDisplay();
				unclipBodyOverflow();
			}
		}
		destroy() {
			if (this.scrollHandler) {
				window.removeEventListener("scroll", this.scrollHandler);
				window.removeEventListener("touchmove", this.scrollHandler);
				window.removeEventListener("resize", this.scrollHandler);
				this.scrollHandler = null;
			}
			this.observer?.disconnect();
			this.observer = null;
			this.statusContainer?.remove();
			this.sentinel?.remove();
			this.statusContainer = null;
			this.sentinel = null;
		}
	};
	var BOOKMARK_ARCHIVE_KEY = "better_rule34_bookmarks_v2";
	var LEGACY_BOOKMARK_KEY = "better_rule34_bookmarks_v1";
	function canonicalListKey(urlStr) {
		try {
			const url = new URL(urlStr);
			for (const k of [...url.searchParams.keys()]) if (isPaginationKey(k)) url.searchParams.delete(k);
			let pathname = url.pathname;
			if (!pathname || pathname === "/") pathname = "/latest-updates/";
			else pathname = stripPageSegment(pathname);
			if (pathname.length > 1 && !pathname.endsWith("/")) pathname += "/";
			const qs = [...url.searchParams.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${v}`).join("&");
			return qs ? `${pathname}?${qs}` : pathname;
		} catch {
			return urlStr;
		}
	}
	function formatSectorTitleFromUrl(urlStr) {
		try {
			const url = new URL(urlStr);
			const parts = url.pathname.split("/").filter(Boolean);
			const sortBy = url.searchParams.get("sort_by");
			const sortSuffix = sortBy ? ` [${sortBy.toUpperCase()}]` : "";
			if (parts.length === 0 || parts.length === 1 && parts[0] === "latest-updates") return `FEED // LATEST${sortSuffix}`;
			if (parts[0] === "search") {
				const q = parts[1] || url.searchParams.get("q") || "ALL";
				return `SEARCH // ${decodeURIComponent(q).toUpperCase()}${sortSuffix}`;
			}
			if (parts[0] === "tags" && parts[1]) return `TAG // ${decodeURIComponent(parts[1]).replace(/-/g, " ").toUpperCase()}${sortSuffix}`;
			if (parts[0] === "categories" && parts[1]) return `CATEGORY // ${decodeURIComponent(parts[1]).replace(/-/g, " ").toUpperCase()}${sortSuffix}`;
			if (parts[0] === "models" && parts[1]) return `MODEL // ${decodeURIComponent(parts[1]).replace(/-/g, " ").toUpperCase()}${sortSuffix}`;
			if (parts[0] === "channels" && parts[1]) return `CHANNEL // ${decodeURIComponent(parts[1]).replace(/-/g, " ").toUpperCase()}${sortSuffix}`;
			if (parts[0] === "playlists" && parts[1]) return `PLAYLIST // ${decodeURIComponent(parts[1]).replace(/-/g, " ").toUpperCase()}${sortSuffix}`;
			return `SECTOR // ${parts.slice(0, 2).join(" / ").toUpperCase()}${sortSuffix}`;
		} catch {
			return "SECTOR // ARCHIVE";
		}
	}
	function resolveStore$1(store) {
		if (store) return store;
		try {
			if (typeof localStorage !== "undefined") return localStorage;
		} catch {}
		return null;
	}
	function readArchive(store) {
		const s = resolveStore$1(store);
		if (!s) return {
			version: 2,
			sectors: [],
			videos: []
		};
		try {
			const rawV2 = s.getItem(BOOKMARK_ARCHIVE_KEY);
			if (rawV2) {
				const parsed = JSON.parse(rawV2);
				if (parsed && parsed.version === 2 && Array.isArray(parsed.sectors) && Array.isArray(parsed.videos)) return parsed;
			}
			const rawV1 = s.getItem(LEGACY_BOOKMARK_KEY);
			if (rawV1) {
				const legacy = JSON.parse(rawV1);
				if (legacy && typeof legacy === "object") {
					const sectors = [];
					let i = 0;
					for (const [key, val] of Object.entries(legacy)) if (val && typeof val.page === "number" && typeof val.url === "string") sectors.push({
						id: `sec_legacy_${Date.now()}_${i++}`,
						listKey: key,
						title: formatSectorTitleFromUrl(val.url),
						url: val.url,
						page: val.page,
						createdAt: Date.now()
					});
					const data = {
						version: 2,
						sectors,
						videos: []
					};
					s.setItem(BOOKMARK_ARCHIVE_KEY, JSON.stringify(data));
					return data;
				}
			}
		} catch {}
		return {
			version: 2,
			sectors: [],
			videos: []
		};
	}
	function writeArchive(data, store) {
		const s = resolveStore$1(store);
		if (!s) return;
		try {
			s.setItem(BOOKMARK_ARCHIVE_KEY, JSON.stringify(data));
		} catch {}
	}
	function getSectors(store) {
		return readArchive(store).sectors;
	}
	function findSector(listKey, page, store) {
		if (!listKey) return null;
		return getSectors(store).find((s) => s.listKey === listKey && s.page === page) || null;
	}
	function saveSector(bm, store) {
		const archive = readArchive(store);
		const existingIdx = archive.sectors.findIndex((s) => s.listKey === bm.listKey && s.page === bm.page);
		const now = Date.now();
		if (existingIdx !== -1) {
			archive.sectors[existingIdx] = {
				...archive.sectors[existingIdx],
				...bm,
				createdAt: now
			};
			writeArchive(archive, store);
			return archive.sectors[existingIdx];
		}
		const created = {
			...bm,
			id: `sec_${now}_${Math.random().toString(36).slice(2, 7)}`,
			createdAt: now
		};
		archive.sectors.unshift(created);
		writeArchive(archive, store);
		return created;
	}
	function deleteSector(id, store) {
		if (!id) return;
		const archive = readArchive(store);
		archive.sectors = archive.sectors.filter((s) => s.id !== id);
		writeArchive(archive, store);
	}
	function clearAllSectors(store) {
		const archive = readArchive(store);
		archive.sectors = [];
		writeArchive(archive, store);
	}
	function getVideos(store) {
		return readArchive(store).videos;
	}
	function isVideoSaved(id, store) {
		if (!id) return false;
		return getVideos(store).some((v) => v.id === id);
	}
	function saveVideo(video, store) {
		const archive = readArchive(store);
		const existingIdx = archive.videos.findIndex((v) => v.id === video.id);
		const now = Date.now();
		if (existingIdx !== -1) {
			archive.videos[existingIdx] = {
				...archive.videos[existingIdx],
				...video,
				createdAt: now
			};
			writeArchive(archive, store);
			return archive.videos[existingIdx];
		}
		const created = {
			...video,
			createdAt: now
		};
		archive.videos.unshift(created);
		writeArchive(archive, store);
		return created;
	}
	function deleteVideo(id, store) {
		if (!id) return;
		const archive = readArchive(store);
		archive.videos = archive.videos.filter((v) => v.id !== id);
		writeArchive(archive, store);
	}
	function clearAllVideos(store) {
		const archive = readArchive(store);
		archive.videos = [];
		writeArchive(archive, store);
	}
	function getTotalBookmarkCount(store) {
		const archive = readArchive(store);
		return archive.sectors.length + archive.videos.length;
	}
	function exportArchiveJson(store) {
		const archive = readArchive(store);
		return JSON.stringify(archive, null, 2);
	}
	function importArchiveJson(jsonStr, store) {
		try {
			const parsed = JSON.parse(jsonStr);
			if (!parsed || typeof parsed !== "object") return {
				success: false,
				sectorsAdded: 0,
				videosAdded: 0
			};
			const archive = readArchive(store);
			let sectorsAdded = 0;
			let videosAdded = 0;
			if (Array.isArray(parsed.sectors)) {
				for (const s of parsed.sectors) if (s && typeof s.listKey === "string" && typeof s.page === "number" && typeof s.url === "string") {
					if (!archive.sectors.some((item) => item.listKey === s.listKey && item.page === s.page)) {
						archive.sectors.push({
							id: s.id || `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
							listKey: s.listKey,
							title: s.title || formatSectorTitleFromUrl(s.url),
							url: s.url,
							page: s.page,
							sortBy: s.sortBy || null,
							createdAt: s.createdAt || Date.now()
						});
						sectorsAdded++;
					}
				}
			}
			if (Array.isArray(parsed.videos)) {
				for (const v of parsed.videos) if (v && typeof v.id === "string" && typeof v.url === "string") {
					if (!archive.videos.some((item) => item.id === v.id)) {
						archive.videos.push({
							id: v.id,
							title: v.title || "Untitled Video",
							url: v.url,
							thumbUrl: v.thumbUrl || "",
							durationFormatted: v.durationFormatted || "",
							ratingPercent: v.ratingPercent || 0,
							viewsFormatted: v.viewsFormatted || "",
							createdAt: v.createdAt || Date.now()
						});
						videosAdded++;
					}
				}
			}
			writeArchive(archive, store);
			return {
				success: true,
				sectorsAdded,
				videosAdded
			};
		} catch {
			return {
				success: false,
				sectorsAdded: 0,
				videosAdded: 0
			};
		}
	}
	var RIBBON_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h8v12l-4-3-4 3z"/></svg>`;
	function escapeHtml(str) {
		return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	}
	function showToast(message) {
		let toast = document.querySelector(".br34-toast");
		if (!toast) {
			toast = document.createElement("div");
			toast.className = "br34-toast";
			document.body.append(toast);
		}
		toast.textContent = message;
		toast.classList.add("visible");
		window.clearTimeout(toast._timer);
		toast._timer = window.setTimeout(() => {
			toast?.classList.remove("visible");
		}, 2200);
	}
	var ArchiveModal = class {
		modal;
		activeTab = "sectors";
		isOpen = false;
		videoSearchQuery = "";
		getPage;
		getUrl;
		getListKey;
		onDataChanged;
		constructor(opts) {
			this.getPage = opts.getPage;
			this.getUrl = opts.getUrl;
			this.getListKey = opts.getListKey;
			this.onDataChanged = opts.onDataChanged;
			this.modal = this.buildModal();
			document.body.append(this.modal);
			this.bindEvents();
		}
		toggle(open) {
			this.isOpen = open !== void 0 ? open : !this.isOpen;
			this.modal.classList.toggle("open", this.isOpen);
			if (this.isOpen) this.render();
		}
		getIsOpen() {
			return this.isOpen;
		}
		buildModal() {
			const el = document.createElement("div");
			el.className = "br34-archive-modal";
			el.innerHTML = `
      <div class="br34-panel-header">
        <div class="br34-title-row">
          <span class="br34-title">[ EROS // ARCHIVE ]</span>
          <span class="br34-title-sub" id="br34-archive-counter">INDEX: 0 UNITS</span>
        </div>
        <button type="button" class="br34-panel-close" id="br34-archive-close" title="Close" aria-label="Close">[ X ]</button>
      </div>

      <div class="br34-archive-tabs">
        <button type="button" class="br34-archive-tab active" data-tab="sectors">SECTORS (0)</button>
        <button type="button" class="br34-archive-tab" data-tab="videos">SAVED VIDEOS (0)</button>
      </div>

      <div class="br34-archive-body" id="br34-archive-body">
        <!-- Rendered dynamically -->
      </div>

      <div class="br34-archive-footer">
        <button type="button" class="br34-archive-action-btn" id="br34-archive-export">EXPORT JSON</button>
        <button type="button" class="br34-archive-action-btn" id="br34-archive-import">IMPORT JSON</button>
        <button type="button" class="br34-archive-action-btn danger" id="br34-archive-clear">CLEAR TAB</button>
        <input type="file" id="br34-archive-file-input" accept=".json,application/json" style="display:none;" />
      </div>
    `;
			return el;
		}
		bindEvents() {
			this.modal.querySelector("#br34-archive-close")?.addEventListener("click", () => {
				this.toggle(false);
			});
			const tabBtns = this.modal.querySelectorAll(".br34-archive-tab");
			for (const btn of tabBtns) btn.addEventListener("click", () => {
				const tab = btn.dataset.tab;
				if (tab && tab !== this.activeTab) {
					this.activeTab = tab;
					for (const b of tabBtns) b.classList.toggle("active", b.dataset.tab === tab);
					this.render();
				}
			});
			this.modal.querySelector("#br34-archive-export")?.addEventListener("click", () => {
				const json = exportArchiveJson();
				const blob = new Blob([json], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `eros-archive-${new Date().toISOString().slice(0, 10)}.json`;
				a.click();
				URL.revokeObjectURL(url);
				showToast("[ ARCHIVE EXPORTED ]");
			});
			const fileInput = this.modal.querySelector("#br34-archive-file-input");
			this.modal.querySelector("#br34-archive-import")?.addEventListener("click", () => {
				fileInput?.click();
			});
			fileInput?.addEventListener("change", () => {
				const file = fileInput.files?.[0];
				if (!file) return;
				const reader = new FileReader();
				reader.onload = (e) => {
					const res = importArchiveJson(String(e.target?.result || ""));
					if (res.success) {
						showToast(`[ IMPORTED: ${res.sectorsAdded} SECTORS, ${res.videosAdded} VIDEOS ]`);
						this.render();
						this.onDataChanged?.();
					} else showToast("[ ERROR: INVALID ARCHIVE JSON ]");
				};
				reader.readAsText(file);
				fileInput.value = "";
			});
			this.modal.querySelector("#br34-archive-clear")?.addEventListener("click", () => {
				if (this.activeTab === "sectors") {
					clearAllSectors();
					showToast("[ ALL SECTORS CLEARED ]");
				} else {
					clearAllVideos();
					showToast("[ ALL SAVED VIDEOS CLEARED ]");
				}
				this.render();
				this.onDataChanged?.();
			});
		}
		render() {
			const sectors = getSectors();
			const videos = getVideos();
			const total = sectors.length + videos.length;
			const counter = this.modal.querySelector("#br34-archive-counter");
			if (counter) counter.textContent = `INDEX: ${total} UNITS`;
			const sectorsTab = this.modal.querySelector("[data-tab=\"sectors\"]");
			if (sectorsTab) sectorsTab.textContent = `SECTORS (${sectors.length})`;
			const videosTab = this.modal.querySelector("[data-tab=\"videos\"]");
			if (videosTab) videosTab.textContent = `SAVED VIDEOS (${videos.length})`;
			const body = this.modal.querySelector("#br34-archive-body");
			if (!body) return;
			if (this.activeTab === "sectors") this.renderSectors(body, sectors);
			else this.renderVideos(body, videos);
		}
		renderSectors(container, sectors) {
			const curPage = this.getPage();
			const curUrl = this.getUrl();
			const listKey = this.getListKey();
			const isCurrentSaved = Boolean(findSector(listKey, curPage));
			let html = `
      <div class="br34-archive-toolbar">
        <button type="button" class="br34-btn-mark-sector ${isCurrentSaved ? "saved" : ""}" id="br34-mark-sector-btn">
          ${isCurrentSaved ? `[ ✓ SECTOR P.${curPage} SAVED (CLICK TO REMOVE) ]` : `[ + BOOKMARK CURRENT SECTOR // P.${curPage} ]`}
        </button>
      </div>
    `;
			if (sectors.length === 0) html += `
        <div class="br34-archive-empty">
          <div class="br34-archive-empty-title">[ NO SECTORS ARCHIVED ]</div>
          <div class="br34-archive-empty-sub">Browse any catalog, tag, or search and click '+ Bookmark Current Sector'.</div>
        </div>
      `;
			else {
				html += `<div class="br34-archive-list">`;
				for (const s of sectors) {
					const isThisCurrent = s.listKey === listKey && s.page === curPage;
					html += `
          <div class="br34-archive-item ${isThisCurrent ? "is-current" : ""}">
            <div class="br34-archive-item-main">
              <div class="br34-archive-item-title">${escapeHtml(s.title || "SECTOR")}</div>
              <div class="br34-archive-item-meta">
                <span class="br34-tag-page">PAGE ${s.page}</span>
                <span class="br34-tag-date">${new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="br34-archive-item-actions">
              <a href="${escapeHtml(s.url)}" class="br34-btn-jump" title="Jump to page depth">[ JUMP ]</a>
              <button type="button" class="br34-btn-del" data-del-sector="${escapeHtml(s.id)}" title="Delete sector" aria-label="Delete sector">[ ✕ ]</button>
            </div>
          </div>
        `;
				}
				html += `</div>`;
			}
			container.innerHTML = html;
			container.querySelector("#br34-mark-sector-btn")?.addEventListener("click", () => {
				const existing = findSector(listKey, curPage);
				if (existing) {
					deleteSector(existing.id);
					showToast(`[ REMOVED SECTOR // P.${curPage} ]`);
				} else {
					saveSector({
						listKey,
						title: formatSectorTitleFromUrl(curUrl),
						url: curUrl,
						page: curPage
					});
					showToast(`[ SAVED SECTOR // P.${curPage} ]`);
				}
				this.render();
				this.onDataChanged?.();
			});
			const delBtns = container.querySelectorAll("[data-del-sector]");
			for (const btn of delBtns) btn.addEventListener("click", () => {
				const id = btn.dataset.delSector;
				if (id) {
					deleteSector(id);
					this.render();
					this.onDataChanged?.();
				}
			});
		}
		renderVideos(container, videos) {
			const filtered = this.videoSearchQuery.trim() ? videos.filter((v) => v.title.toLowerCase().includes(this.videoSearchQuery.toLowerCase())) : videos;
			let html = `
      <div class="br34-archive-toolbar">
        <input type="text" class="br34-search-input" id="br34-archive-video-search" placeholder="SEARCH SAVED VIDEOS..." value="${escapeHtml(this.videoSearchQuery)}" />
      </div>
    `;
			if (videos.length === 0) html += `
        <div class="br34-archive-empty">
          <div class="br34-archive-empty-title">[ ARCHIVE EMPTY ]</div>
          <div class="br34-archive-empty-sub">Hover any video thumbnail and click the ribbon icon to save videos for later.</div>
        </div>
      `;
			else if (filtered.length === 0) html += `
        <div class="br34-archive-empty">
          <div class="br34-archive-empty-title">[ NO MATCHING VIDEOS ]</div>
        </div>
      `;
			else {
				html += `<div class="br34-video-archive-list">`;
				for (const v of filtered) html += `
          <div class="br34-video-archive-card">
            ${v.thumbUrl ? `<div class="br34-video-archive-thumb-wrap">
                    <img class="br34-video-archive-thumb" src="${escapeHtml(v.thumbUrl)}" alt="" loading="lazy" />
                    ${v.durationFormatted ? `<span class="br34-video-archive-dur">${escapeHtml(v.durationFormatted)}</span>` : ""}
                   </div>` : ""}
            <div class="br34-video-archive-info">
              <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener" class="br34-video-archive-title">${escapeHtml(v.title || "Untitled Video")}</a>
              <div class="br34-video-archive-meta">
                ${v.ratingPercent > 0 ? `<span class="br34-video-archive-rating">${v.ratingPercent}%</span>` : ""}
                ${v.viewsFormatted ? `<span class="br34-video-archive-views">${escapeHtml(v.viewsFormatted)}</span>` : ""}
              </div>
            </div>
            <div class="br34-video-archive-actions">
              <a href="${escapeHtml(v.url)}" target="_blank" rel="noopener" class="br34-btn-jump">[ WATCH ]</a>
              <button type="button" class="br34-btn-del" data-del-video="${escapeHtml(v.id)}" title="Remove" aria-label="Remove">[ ✕ ]</button>
            </div>
          </div>
        `;
				html += `</div>`;
			}
			container.innerHTML = html;
			const searchInput = container.querySelector("#br34-archive-video-search");
			searchInput?.addEventListener("input", () => {
				this.videoSearchQuery = searchInput.value;
				this.render();
			});
			const delBtns = container.querySelectorAll("[data-del-video]");
			for (const btn of delBtns) btn.addEventListener("click", () => {
				const id = btn.dataset.delVideo;
				if (id) {
					deleteVideo(id);
					this.render();
					this.onDataChanged?.();
				}
			});
		}
		destroy() {
			this.modal.remove();
		}
	};
	function attachCardBookmarkButtons(cards, onUpdate) {
		for (const card of cards) {
			if (card.dataset.br34BmWired === "true") continue;
			card.dataset.br34BmWired = "true";
			const wrap = card.querySelector(".wrap_image, .img.wrap_image");
			if (!wrap) continue;
			const data = extractCardData(card);
			if (!data || !data.id) continue;
			const ribbon = document.createElement("button");
			ribbon.type = "button";
			ribbon.className = `br34-card-bookmark ${isVideoSaved(data.id) ? "saved" : ""}`;
			ribbon.title = isVideoSaved(data.id) ? "Saved in Archive (Click to remove)" : "Save to Archive";
			ribbon.setAttribute("aria-label", ribbon.title);
			ribbon.innerHTML = RIBBON_SVG;
			ribbon.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (isVideoSaved(data.id)) {
					deleteVideo(data.id);
					ribbon.classList.remove("saved");
					ribbon.title = "Save to Archive";
					ribbon.setAttribute("aria-label", ribbon.title);
					showToast("[ REMOVED FROM ARCHIVE ]");
				} else {
					saveVideo({
						id: data.id,
						title: data.title,
						url: data.url,
						thumbUrl: data.thumbUrl,
						durationFormatted: data.durationFormatted,
						ratingPercent: data.ratingPercent,
						viewsFormatted: data.viewsFormatted
					});
					ribbon.classList.add("saved");
					ribbon.title = "Saved in Archive (Click to remove)";
					ribbon.setAttribute("aria-label", ribbon.title);
					showToast("[ SAVED TO ARCHIVE ]");
				}
				onUpdate?.();
			});
			wrap.append(ribbon);
		}
	}
	function mountBookmarkButton(opts) {
		let dock = document.querySelector(".br34-dock");
		if (!dock) {
			dock = document.createElement("div");
			dock.className = "br34-dock";
			document.body.append(dock);
		}
		dock.append(opts.fab);
		let btn = dock.querySelector(".br34-bookmark-btn");
		if (!btn) {
			btn = document.createElement("button");
			btn.type = "button";
			btn.className = "br34-bookmark-btn";
			btn.innerHTML = `${RIBBON_SVG}<span class="br34-bookmark-badge">0</span>`;
			dock.prepend(btn);
		}
		const button = btn;
		const modal = new ArchiveModal({
			getPage: opts.getPage,
			getUrl: opts.getUrl,
			getListKey: () => opts.listKey,
			onDataChanged: () => {
				updateBadge();
			}
		});
		const updateBadge = () => {
			const count = getTotalBookmarkCount();
			const isCurrentSectorSaved = Boolean(findSector(opts.listKey, opts.getPage()));
			button.classList.toggle("saved", isCurrentSectorSaved || count > 0);
			let badge = button.querySelector(".br34-bookmark-badge");
			if (count > 0) {
				if (!badge) {
					badge = document.createElement("span");
					badge.className = "br34-bookmark-badge";
					button.append(badge);
				}
				badge.textContent = String(count);
			} else badge?.remove();
			button.title = `EROS Archive (${count} saved items) — Click to open`;
			button.setAttribute("aria-label", button.title);
		};
		updateBadge();
		if (button.dataset.br34Wired !== "true") {
			button.dataset.br34Wired = "true";
			button.addEventListener("click", (e) => {
				e.stopPropagation();
				modal.toggle();
			});
		}
		const outsideClickListener = (e) => {
			if (modal.getIsOpen() && !modal["modal"].contains(e.target) && !button.contains(e.target)) modal.toggle(false);
		};
		document.addEventListener("click", outsideClickListener);
		return {
			cleanup: () => {
				document.removeEventListener("click", outsideClickListener);
				modal.destroy();
				button.remove();
			},
			refresh: () => {
				updateBadge();
				if (modal.getIsOpen()) modal.render();
			}
		};
	}
	var STORAGE_KEY = "better_rule34_settings";
	var VIEWS_STEPS = [
		0,
		1e3,
		5e3,
		1e4,
		25e3,
		5e4,
		1e5
	];
	var DEBOUNCE_MS = 80;
	var FilterBar = class {
		state;
		callbacks;
		fabElement;
		panelElement;
		isOpen = false;
		outsideClickHandler = null;
		sliderDebounce = 0;
		constructor(callbacks) {
			this.callbacks = callbacks;
			this.state = this.loadInitialState();
			this.fabElement = this.buildFab();
			this.panelElement = this.buildPanel();
			const searchInput = this.panelElement.querySelector(".br34-search-input");
			if (searchInput) searchInput.value = this.state.query;
			this.mount();
		}
		loadInitialState() {
			const urlFilters = parseCurrentUrlFilters(window.location.href);
			let savedSettings = {};
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw) savedSettings = JSON.parse(raw);
			} catch {}
			return {
				...DEFAULT_FILTER,
				...savedSettings,
				...urlFilters
			};
		}
		saveSettings() {
			try {
				const toSave = {
					soundOnly: this.state.soundOnly,
					hdOnly: this.state.hdOnly,
					futaFilter: this.state.futaFilter,
					hideWatched: this.state.hideWatched,
					minRating: this.state.minRating,
					minViews: this.state.minViews,
					minYear: this.state.minYear,
					durationMinSeconds: this.state.durationMinSeconds
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
			} catch {}
		}
		getState() {
			return this.state;
		}
		mount() {
			document.body.append(this.fabElement, this.panelElement);
			this.bindEvents();
			this.updateBadge();
		}
		countActiveFilters() {
			let count = 0;
			if (this.state.query.trim()) count++;
			if (this.state.soundOnly) count++;
			if (this.state.hdOnly) count++;
			if (this.state.futaFilter !== "all") count++;
			if (this.state.hideWatched) count++;
			if (this.state.minRating > 0) count++;
			if (this.state.minViews > 0) count++;
			if (this.state.minYear > 2018) count++;
			if (this.state.durationMinSeconds !== null && this.state.durationMinSeconds > 0) count++;
			return count;
		}
		updateBadge() {
			const count = this.countActiveFilters();
			let badge = this.fabElement.querySelector(".br34-fab-badge");
			if (count > 0) {
				if (!badge) {
					badge = document.createElement("span");
					badge.className = "br34-fab-badge";
					this.fabElement.append(badge);
				}
				badge.textContent = `[${count}]`;
			} else badge?.remove();
		}
		setCount(visible, total) {
			const counter = this.panelElement.querySelector(".br34-title-sub");
			if (counter) counter.textContent = `UNITS: ${visible} / ${total}`;
		}
		buildFab() {
			const fab = document.createElement("button");
			fab.type = "button";
			fab.className = "br34-fab";
			fab.title = "Open EROS Telemetry Filter";
			fab.setAttribute("aria-label", "Open EROS Telemetry Filter");
			fab.innerHTML = `
      <span class="br34-fab-dot"></span>
      <span>CTRL</span>
    `;
			return fab;
		}
		buildPanel() {
			const panel = document.createElement("div");
			panel.className = "br34-panel";
			const currentYear = new Date().getFullYear();
			const durMins = this.state.durationMinSeconds ? Math.round(this.state.durationMinSeconds / 60) : 0;
			panel.innerHTML = `
      <!-- Header: Title, Units & Close -->
      <div class="br34-panel-header">
        <div class="br34-title-row">
          <span class="br34-title">[ EROS // TELEMETRY ]</span>
          <span class="br34-title-sub">UNITS: LOADING...</span>
        </div>
        <button type="button" class="br34-panel-close" title="Close" aria-label="Close">[ X ]</button>
      </div>

      <!-- Body -->
      <div class="br34-panel-body">
        <!-- Live Keyword Search -->
        <div class="br34-search-box">
          <input type="text" class="br34-search-input" placeholder="SEARCH // TITLE KEYWORD" value="" />
        </div>

        <!-- Tactile Sliders (Vertical Stack) -->
        <div class="br34-sliders-vertical">
          <!-- 1. Rating Slider -->
          <div class="br34-slider-card">
            <div class="br34-sect-title">
              <span>MIN RATING</span>
              <span class="br34-sect-val" id="br34-val-rating">${this.state.minRating > 0 ? `≥ ${this.state.minRating}%` : "ANY"}</span>
            </div>
            <input type="range" class="br34-range-slider" id="br34-slider-rating" min="0" max="100" step="5" value="${this.state.minRating}" />
          </div>

          <!-- 2. Views Slider -->
          <div class="br34-slider-card">
            <div class="br34-sect-title">
              <span>MIN VIEWS</span>
              <span class="br34-sect-val" id="br34-val-views">${this.formatViewsLabel(this.state.minViews)}</span>
            </div>
            <input type="range" class="br34-range-slider" id="br34-slider-views" min="0" max="6" step="1" value="${viewsToNearestStep(this.state.minViews, VIEWS_STEPS)}" />
          </div>

          <!-- 3. Duration Slider -->
          <div class="br34-slider-card">
            <div class="br34-sect-title">
              <span>MIN DURATION</span>
              <span class="br34-sect-val" id="br34-val-dur">${durMins > 0 ? `≥ ${durMins}M` : "ANY"}</span>
            </div>
            <input type="range" class="br34-range-slider" id="br34-slider-dur" min="0" max="45" step="1" value="${durMins}" />
          </div>

          <!-- 4. Vintage Slider -->
          <div class="br34-slider-card">
            <div class="br34-sect-title">
              <span>MIN VINTAGE</span>
              <span class="br34-sect-val" id="br34-val-year">${this.state.minYear > 2018 ? `≥ ${this.state.minYear}` : "ALL"}</span>
            </div>
            <input type="range" class="br34-range-slider" id="br34-slider-year" min="${BASE_YEAR}" max="${currentYear}" step="1" value="${this.state.minYear}" />
          </div>
        </div>

        <!-- Tactile Toggles (Compact 2x2 grid) -->
        <div class="br34-grid-2x2">
          <button type="button" class="br34-chip ${this.state.soundOnly ? "active" : ""}" data-toggle="sound">
            SOUND
          </button>
          <button type="button" class="br34-chip ${this.state.hdOnly ? "active" : ""}" data-toggle="hd">
            HD ONLY
          </button>
          <button type="button" class="br34-chip ${this.state.futaFilter !== "all" ? "active-purple" : ""}" data-toggle="futa">
            ${this.getFutaLabel()}
          </button>
          <button type="button" class="br34-chip ${this.state.hideWatched ? "active" : ""}" data-toggle="watched">
            UNWATCHED
          </button>
        </div>
      </div>

      <!-- Footer: Reset -->
      <div class="br34-panel-footer">
        <button type="button" class="br34-btn-reset" id="br34-btn-reset">
          RESET ALL FILTERS
        </button>
      </div>
    `;
			return panel;
		}
		formatViewsLabel(views) {
			if (views <= 0) return "ANY";
			if (views >= 1e6) return `≥ ${views / 1e6}M`;
			if (views >= 1e3) return `≥ ${views / 1e3}K`;
			return `≥ ${views}`;
		}
		getFutaLabel() {
			switch (this.state.futaFilter) {
				case "hide": return "NO FUTA";
				case "only": return "FUTA ONLY";
				default: return "FUTA: ALL";
			}
		}
		cycleFuta() {
			if (this.state.futaFilter === "all") this.state.futaFilter = "hide";
			else if (this.state.futaFilter === "hide") this.state.futaFilter = "only";
			else this.state.futaFilter = "all";
			const btn = this.panelElement.querySelector("[data-toggle=\"futa\"]");
			if (btn) {
				btn.textContent = this.getFutaLabel();
				btn.classList.toggle("active-purple", this.state.futaFilter !== "all");
			}
			this.saveSettings();
			this.updateBadge();
			this.callbacks.onFilterChange(this.state);
		}
		togglePanel(open) {
			this.isOpen = open !== void 0 ? open : !this.isOpen;
			this.panelElement.classList.toggle("open", this.isOpen);
			this.fabElement.classList.toggle("active", this.isOpen);
		}
		commitSliderChange() {
			window.clearTimeout(this.sliderDebounce);
			this.sliderDebounce = window.setTimeout(() => {
				this.saveSettings();
				this.updateBadge();
				this.callbacks.onFilterChange(this.state);
			}, DEBOUNCE_MS);
		}
		bindToggle(selector, isActive, onToggle) {
			const btn = this.panelElement.querySelector(selector);
			btn?.addEventListener("click", () => {
				onToggle();
				btn.classList.toggle("active", isActive());
				this.saveSettings();
				this.updateBadge();
				this.callbacks.onFilterChange(this.state);
			});
		}
		bindEvents() {
			this.fabElement.addEventListener("click", (e) => {
				e.stopPropagation();
				this.togglePanel();
			});
			this.panelElement.querySelector(".br34-panel-close")?.addEventListener("click", () => {
				this.togglePanel(false);
			});
			this.outsideClickHandler = (e) => {
				if (this.isOpen && !this.panelElement.contains(e.target) && !this.fabElement.contains(e.target)) this.togglePanel(false);
			};
			document.addEventListener("click", this.outsideClickHandler);
			let searchDebounce = 0;
			const searchInput = this.panelElement.querySelector(".br34-search-input");
			searchInput?.addEventListener("input", () => {
				window.clearTimeout(searchDebounce);
				searchDebounce = window.setTimeout(() => {
					this.state.query = searchInput.value;
					this.updateBadge();
					this.callbacks.onFilterChange(this.state);
				}, DEBOUNCE_MS);
			});
			const ratingSlider = this.panelElement.querySelector("#br34-slider-rating");
			const ratingVal = this.panelElement.querySelector("#br34-val-rating");
			ratingSlider?.addEventListener("input", () => {
				const val = parseInt(ratingSlider.value, 10);
				this.state.minRating = val;
				if (ratingVal) ratingVal.textContent = val > 0 ? `≥ ${val}%` : "ANY";
				this.commitSliderChange();
			});
			const viewsSlider = this.panelElement.querySelector("#br34-slider-views");
			const viewsVal = this.panelElement.querySelector("#br34-val-views");
			viewsSlider?.addEventListener("input", () => {
				const val = VIEWS_STEPS[parseInt(viewsSlider.value, 10)] || 0;
				this.state.minViews = val;
				if (viewsVal) viewsVal.textContent = this.formatViewsLabel(val);
				this.commitSliderChange();
			});
			const durSlider = this.panelElement.querySelector("#br34-slider-dur");
			const durVal = this.panelElement.querySelector("#br34-val-dur");
			durSlider?.addEventListener("input", () => {
				const mins = parseInt(durSlider.value, 10);
				this.state.durationMinSeconds = mins > 0 ? mins * 60 : null;
				if (durVal) durVal.textContent = mins > 0 ? `≥ ${mins}M` : "ANY";
				this.commitSliderChange();
			});
			const yearSlider = this.panelElement.querySelector("#br34-slider-year");
			const yearVal = this.panelElement.querySelector("#br34-val-year");
			yearSlider?.addEventListener("input", () => {
				const yr = parseInt(yearSlider.value, 10);
				this.state.minYear = yr;
				if (yearVal) yearVal.textContent = yr > 2018 ? `≥ ${yr}` : "ALL";
				this.commitSliderChange();
			});
			this.bindToggle("[data-toggle=\"sound\"]", () => this.state.soundOnly, () => {
				this.state.soundOnly = !this.state.soundOnly;
			});
			this.bindToggle("[data-toggle=\"hd\"]", () => this.state.hdOnly, () => {
				this.state.hdOnly = !this.state.hdOnly;
			});
			this.panelElement.querySelector("[data-toggle=\"futa\"]")?.addEventListener("click", () => {
				this.cycleFuta();
			});
			this.bindToggle("[data-toggle=\"watched\"]", () => this.state.hideWatched, () => {
				this.state.hideWatched = !this.state.hideWatched;
			});
			this.panelElement.querySelector("#br34-btn-reset")?.addEventListener("click", () => {
				this.state = { ...DEFAULT_FILTER };
				this.saveSettings();
				this.syncInputsWithState();
				this.updateBadge();
				this.callbacks.onFilterChange(this.state);
			});
		}
		syncInputsWithState() {
			const searchInput = this.panelElement.querySelector(".br34-search-input");
			if (searchInput) searchInput.value = this.state.query;
			const ratingSlider = this.panelElement.querySelector("#br34-slider-rating");
			const ratingVal = this.panelElement.querySelector("#br34-val-rating");
			if (ratingSlider) ratingSlider.value = String(this.state.minRating);
			if (ratingVal) ratingVal.textContent = this.state.minRating > 0 ? `≥ ${this.state.minRating}%` : "ANY";
			const viewsSlider = this.panelElement.querySelector("#br34-slider-views");
			const viewsVal = this.panelElement.querySelector("#br34-val-views");
			if (viewsSlider) viewsSlider.value = String(viewsToNearestStep(this.state.minViews, VIEWS_STEPS));
			if (viewsVal) viewsVal.textContent = this.formatViewsLabel(this.state.minViews);
			const durSlider = this.panelElement.querySelector("#br34-slider-dur");
			const durVal = this.panelElement.querySelector("#br34-val-dur");
			const durMins = this.state.durationMinSeconds ? Math.round(this.state.durationMinSeconds / 60) : 0;
			if (durSlider) durSlider.value = String(durMins);
			if (durVal) durVal.textContent = durMins > 0 ? `≥ ${durMins}M` : "ANY";
			const yearSlider = this.panelElement.querySelector("#br34-slider-year");
			const yearVal = this.panelElement.querySelector("#br34-val-year");
			if (yearSlider) yearSlider.value = String(this.state.minYear);
			if (yearVal) yearVal.textContent = this.state.minYear > 2018 ? `≥ ${this.state.minYear}` : "ALL";
			this.panelElement.querySelector("[data-toggle=\"sound\"]")?.classList.toggle("active", this.state.soundOnly);
			this.panelElement.querySelector("[data-toggle=\"hd\"]")?.classList.toggle("active", this.state.hdOnly);
			const futaBtn = this.panelElement.querySelector("[data-toggle=\"futa\"]");
			if (futaBtn) {
				futaBtn.textContent = this.getFutaLabel();
				futaBtn.classList.toggle("active-purple", this.state.futaFilter !== "all");
			}
			this.panelElement.querySelector("[data-toggle=\"watched\"]")?.classList.toggle("active", this.state.hideWatched);
		}
		destroy() {
			if (this.outsideClickHandler) {
				document.removeEventListener("click", this.outsideClickHandler);
				this.outsideClickHandler = null;
			}
			window.clearTimeout(this.sliderDebounce);
			this.fabElement.remove();
			this.panelElement.remove();
		}
	};
	var COLLAPSE_KEY = "better_rule34_native_filters_collapsed_v1";
	var TOGGLE_LABEL = "<span>[ SITE FILTERS ]</span>";
	var TOGGLE_ICON = "<svg class=\"filters-panel__toggle-icon\" viewBox=\"0 0 12 12\" width=\"12\" height=\"12\" aria-hidden=\"true\"><path d=\"M2 4l4 4 4-4\"/></svg>";
	function resolveStore(store) {
		if (store) return store;
		try {
			if (typeof localStorage !== "undefined") return localStorage;
		} catch {}
		return null;
	}
	function shouldCollapseNativeFilters(store) {
		const s = resolveStore(store);
		if (!s) return true;
		try {
			const raw = s.getItem(COLLAPSE_KEY);
			if (raw === null) return true;
			return raw !== "0";
		} catch {
			return true;
		}
	}
	function setNativeFiltersCollapsed(collapsed, store) {
		const s = resolveStore(store);
		if (!s) return;
		try {
			s.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
		} catch {}
	}
	function setCollapsed(panel, toggle, collapsed) {
		toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
		panel.classList.toggle("br34-collapsed", collapsed);
		setNativeFiltersCollapsed(collapsed);
	}
	function wirePanel(panel, collapsed) {
		let toggle = panel.querySelector(".filters-panel__toggle");
		let body = panel.querySelector(".filters-panel__body");
		if (!body) {
			body = document.createElement("div");
			body.className = "filters-panel__body";
			for (const child of Array.from(panel.childNodes)) if (child !== toggle) body.append(child);
			panel.append(body);
		}
		if (!toggle) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "filters-panel__toggle";
			btn.innerHTML = `${TOGGLE_LABEL}${TOGGLE_ICON}`;
			panel.prepend(btn);
			toggle = btn;
		} else if (!toggle.querySelector(".filters-panel__toggle-icon")) {
			const icon = document.createElement("span");
			icon.className = "filters-panel__toggle-icon";
			icon.setAttribute("aria-hidden", "true");
			toggle.append(icon);
		}
		if (!toggle.hasAttribute("aria-expanded")) toggle.setAttribute("aria-expanded", "true");
		if (toggle instanceof HTMLButtonElement && !toggle.hasAttribute("type")) toggle.setAttribute("type", "button");
		if (toggle.dataset.br34FilterToggleWired !== "true") {
			toggle.dataset.br34FilterToggleWired = "true";
			const btn = toggle;
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				const isExpanded = btn.getAttribute("aria-expanded") !== "false";
				setCollapsed(panel, btn, isExpanded);
			});
		}
		setCollapsed(panel, toggle, collapsed);
	}
	function initNativeFilterPanel() {
		const collapsed = shouldCollapseNativeFilters();
		const panels = document.querySelectorAll(".filters-panel");
		for (const panel of panels) try {
			wirePanel(panel, collapsed);
		} catch {}
	}
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

/* Base substrate texture */
body::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(255, 0, 85, 0.015) 3px,
    rgba(255, 0, 85, 0.015) 6px
  );
  opacity: 0.6;
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

/* HIDE comments on cards only (scoped: watch-page #comments_box untouched) */
.item.thumb .video-comments-count,
.item.thumb .video-card-meta__comments,
.item.thumb .comments,
.item.thumb .comments-count,
.item.thumb [class*="comment" i],
.item.thumb [title*="comment" i],
.item.thumb [aria-label*="comment" i],
.item.thumb .thumb_info .comments {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  pointer-events: none !important;
}

/* Suppress ads */
.spot-thumb,
.spots,
.sidebar_ad_buttons,
.footer_spots,
ins.adsbyjuicy,
.item.thumb:has(header),
.item.thumb:has(iframe) {
  display: none !important;
}

.item.thumb[data-br34-hidden="true"] {
  display: none !important;
}

/* ==========================================================================
   Rethemed Native Filters & Sorting Panel (Industrial Brutalist)
   ========================================================================== */
.filters-panel {
  display: block !important;
  background: #0e0a14 !important;
  border: 1px solid rgba(255, 0, 85, 0.35) !important;
  border-radius: 6px !important;
  margin: 14px 0 20px 0 !important;
  padding: 0 !important;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 0, 85, 0.1) !important;
  overflow: hidden !important;
  font-family: 'JetBrains Mono', monospace !important;
}

.filters-panel__toggle {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 10px 16px !important;
  background: rgba(16, 10, 22, 0.95) !important;
  border: none !important;
  border-bottom: 1px solid rgba(255, 0, 85, 0.25) !important;
  color: #ff0055 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 11.5px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  outline: none !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}

.filters-panel__toggle:hover {
  background: rgba(255, 0, 85, 0.12) !important;
  color: #ffffff !important;
}

.filters-panel__toggle-icon {
  fill: #ff0055 !important;
  width: 12px !important;
  height: 12px !important;
  transition: transform 0.2s ease !important;
}

.filters-panel__toggle[aria-expanded="false"] .filters-panel__toggle-icon {
  transform: rotate(-90deg) !important;
}

/* Collapsed state (wired by nativefilter.ts): hide the body, flatten toggle */
.filters-panel.br34-collapsed .filters-panel__body {
  display: none !important;
}

.filters-panel__toggle[aria-expanded="false"] {
  border-bottom: none !important;
}

.filters-panel__body {
  padding: 14px 16px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  background: #0a070e !important;
}

.filters-panel__section {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  border-bottom: 1px dashed rgba(255, 0, 85, 0.15) !important;
  padding-bottom: 10px !important;
}

.filters-panel__section:last-child {
  border-bottom: none !important;
  padding-bottom: 0 !important;
}

.filters-panel__label,
.filters-group__label {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: #9893a6 !important;
  margin-bottom: 2px !important;
}

.filters-panel__label svg,
.filters-group__label svg {
  fill: #ff0055 !important;
  width: 12px !important;
  height: 12px !important;
}

.filters-panel .btn,
.filters-panel__controls--chips .btn,
.filters-group__controls .btn {
  background: #0f0b17 !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 4px !important;
  color: #a39eb0 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  padding: 5px 10px !important;
  text-decoration: none !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  transition: all 0.14s ease !important;
  line-height: 1.3 !important;
}

.filters-panel .btn:hover,
.filters-panel__controls--chips .btn:hover,
.filters-group__controls .btn:hover {
  border-color: #ff0055 !important;
  color: #ffffff !important;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.3) !important;
}

.filters-panel .btn.active,
.filters-panel__controls--chips .btn.active,
.filters-group__controls .btn.active {
  background: #ff0055 !important;
  border-color: #ff0055 !important;
  color: #000000 !important;
  font-weight: 900 !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.55) !important;
}

.filters-panel .btn_custom {
  position: relative !important;
  background: #0f0b17 !important;
  border: 1px solid rgba(255, 0, 85, 0.35) !important;
  color: #ffffff !important;
}

.filters-panel .date-filter-dropdown,
.filters-panel .filter-custom {
  background: #0e0a14 !important;
  border: 1px solid #ff0055 !important;
  border-radius: 4px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9), 0 0 15px rgba(255, 0, 85, 0.25) !important;
  padding: 4px 0 !important;
  z-index: 1000 !important;
}

.filters-panel .date-filter-dropdown li a,
.filters-panel .filter-custom li a {
  color: #c5c2d3 !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  padding: 5px 12px !important;
  display: block !important;
  text-decoration: none !important;
  transition: background 0.12s ease, color 0.12s ease !important;
}

.filters-panel .date-filter-dropdown li a:hover,
.filters-panel .filter-custom li a:hover {
  background: rgba(255, 0, 85, 0.15) !important;
  color: #ff0055 !important;
}

.filters-panel .date-filter-dropdown li a.active,
.filters-panel .filter-custom li a.active {
  background: #ff0055 !important;
  color: #000000 !important;
  font-weight: 800 !important;
}

.filters-panel input[type="date"],
.filters-panel input[type="number"],
.filters-panel .duration-filter__input {
  background: #050307 !important;
  border: 1px solid rgba(255, 0, 85, 0.35) !important;
  border-radius: 4px !important;
  color: #ffffff !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  padding: 4px 8px !important;
  outline: none !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
}

.filters-panel input[type="date"]:focus,
.filters-panel input[type="number"]:focus,
.filters-panel .duration-filter__input:focus {
  border-color: #ff0055 !important;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.4) !important;
}

.filters-panel .duration-filter__label {
  color: #9893a6 !important;
  font-size: 9.5px !important;
  font-weight: 700 !important;
  margin-right: 4px !important;
}

.filters-panel .duration-filter__apply {
  background: rgba(18, 12, 24, 0.9) !important;
  border: 1px solid rgba(255, 0, 85, 0.4) !important;
  border-radius: 4px !important;
  color: #e5e5eb !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  padding: 4px 10px !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}

.filters-panel .duration-filter__apply:hover {
  background: #ff0055 !important;
  color: #000000 !important;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.6) !important;
}

/* ==========================================================================
   Floating Brutalist FAB Button
   ========================================================================== */
.br34-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid #ff0055;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 0, 85, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  outline: none;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-fab:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.8);
  transform: translateY(-2px);
}

.br34-fab:active {
  transform: translateY(0);
}

.br34-fab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff0055;
  box-shadow: 0 0 8px #ff0055;
  display: inline-block;
  animation: br34-dot-blink 1.4s infinite ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .br34-fab-dot,
  .br34-spinner {
    animation: none;
  }
}

.br34-fab:hover .br34-fab-dot {
  background: #000000;
  box-shadow: none;
}

@keyframes br34-dot-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.7); }
}

.br34-fab-badge {
  background: #ff0055;
  color: #000000;
  font-size: 10px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 2px;
}

/* ==========================================================================
   Floating Brutalist Telemetry Modal (Vertical Console)
   ========================================================================== */
.br34-panel {
  position: fixed;
  bottom: 74px;
  right: 24px;
  z-index: 2147483646;
  width: 290px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 90px);
  background: rgba(10, 7, 14, 0.97);
  border: 1px solid rgba(255, 0, 85, 0.45);
  border-radius: 8px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 0, 85, 0.22);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  flex-direction: column;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Header */
.br34-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 0, 85, 0.25);
  background: rgba(16, 10, 22, 0.95);
}

.br34-title-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.br34-title {
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #ff0055;
  text-transform: uppercase;
}

.br34-title-sub {
  font-size: 9.5px;
  font-weight: 700;
  color: #9c97a8;
  letter-spacing: 0.05em;
}

.br34-panel-close {
  background: transparent;
  border: 1px solid rgba(255, 0, 85, 0.4);
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.br34-panel-close:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.7);
}

/* Body */
.br34-panel-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  overflow-y: auto;
  max-height: calc(100vh - 165px);
}

/* Search input */
.br34-search-box {
  width: 100%;
  margin: 0;
}

.br34-search-input {
  width: 100%;
  height: 32px;
  background: rgba(5, 3, 7, 0.95);
  border: 1px solid rgba(255, 0, 85, 0.35);
  border-radius: 5px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  padding: 6px 10px;
  outline: none;
  box-sizing: border-box;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.br34-search-input:focus {
  border-color: #ff0055;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.4);
}

/* Sliders Stack (Vertical orientation) */
.br34-sliders-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
}

.br34-slider-card {
  display: flex;
  flex-direction: column;
}

.br34-sect-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9893a6;
  margin-bottom: 2px;
}

.br34-sect-val {
  color: #ffffff;
  font-weight: 800;
  font-size: 9.5px;
  background: rgba(255, 0, 85, 0.15);
  border: 1px solid rgba(255, 0, 85, 0.6);
  border-radius: 3px;
  padding: 1px 6px;
}

.br34-range-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #1c1322;
  outline: none;
  cursor: pointer;
  margin: 3px 0;
  accent-color: #ff0055;
}

.br34-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff0055;
  border: 1px solid #ffffff;
  box-shadow: 0 0 8px #ff0055;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.br34-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  background: #ffffff;
  border-color: #ff0055;
}

.br34-range-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ff0055;
  border: 1px solid #ffffff;
  box-shadow: 0 0 8px #ff0055;
  cursor: pointer;
}

/* Grid 2x2 for Tactile Toggles */
.br34-grid-2x2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  width: 100%;
  margin: 0;
}

/* Chips in grid */
.br34-chip {
  background: #0f0b17;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  color: #a39eb0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 7px 4px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.14s ease;
  line-height: 1.2;
}

.br34-chip:hover {
  border-color: #ff0055;
  color: #ffffff;
}

.br34-chip.active {
  background: #ff0055;
  border-color: #ff0055;
  color: #000000;
  font-weight: 900;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.55);
}

.br34-chip.active-purple {
  background: #bf00ff;
  border-color: #bf00ff;
  color: #000000;
  font-weight: 900;
  box-shadow: 0 0 10px rgba(191, 0, 255, 0.55);
}

/* Footer Actions */
.br34-panel-footer {
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 0, 85, 0.25);
  display: flex;
  background: rgba(16, 10, 22, 0.95);
}

.br34-btn-reset {
  width: 100%;
  background: rgba(18, 12, 24, 0.9);
  border: 1px solid rgba(255, 0, 85, 0.4);
  border-radius: 5px;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.br34-btn-reset:hover {
  background: #ff0055;
  border-color: #ff0055;
  color: #000000;
  box-shadow: 0 0 14px rgba(255, 0, 85, 0.6);
}

/* ==========================================================================
   Auto-Pager Telemetry Status
   ========================================================================== */
.br34-autopager-container {
  width: 100%;
  margin: 30px 0 50px;
  text-align: center;
  clear: both;
}

.br34-autopager-loading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid #ff0055;
  border-radius: 6px;
  padding: 8px 18px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.35);
}

.br34-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 0, 85, 0.2);
  border-top-color: #ff0055;
  border-radius: 50%;
  animation: br34-spin 0.6s linear infinite;
}

@keyframes br34-spin {
  to { transform: rotate(360deg); }
}

.br34-autopager-end {
  display: inline-block;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 6px;
  color: #8c8998;
  font-family: 'JetBrains Mono', monospace;
  padding: 8px 18px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.br34-load-more-btn {
  background: #ff0055;
  border: 1px solid #ff0055;
  border-radius: 6px;
  color: #000000;
  font-family: 'JetBrains Mono', monospace;
  padding: 8px 20px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(255, 0, 85, 0.4);
  transition: all 0.15s ease;
}

.br34-load-more-btn:hover {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
}

/* ==========================================================================
    Page separator (auto-pager batch boundary: [ PAGE N ])
    ========================================================================== */
.br34-page-sep {
  width: 100%;
  flex-basis: 100%;
  grid-column: 1 / -1;
  clear: both;
  text-align: center;
  margin: 18px 0 22px;
  padding: 7px 0;
  border-top: 1px dashed rgba(255, 0, 85, 0.4);
  border-bottom: 1px dashed rgba(255, 0, 85, 0.4);
  color: #ff0055;
  background: rgba(255, 0, 85, 0.05);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  user-select: none;
}

/* ==========================================================================
    Dock (bookmark button + CTRL fab, bottom-right)
    ========================================================================== */
.br34-dock {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 8px;
}

.br34-dock .br34-fab {
  position: static;
}

.br34-bookmark-btn {
  height: 40px;
  width: 40px;
  padding: 0;
  border-radius: 8px;
  background: rgba(9, 6, 13, 0.95);
  border: 1px solid #ff0055;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), 0 0 14px rgba(255, 0, 85, 0.35);
  color: #ff0055;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-bookmark-btn:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.8);
  transform: translateY(-2px);
}

.br34-bookmark-btn.saved {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 25px rgba(255, 0, 85, 0.8);
}

.br34-bookmark-btn.saved svg {
  fill: currentColor;
}

/* Card Bookmark Ribbon */
.br34-card-bookmark {
  position: absolute !important;
  top: 6px !important;
  right: 6px !important;
  z-index: 15 !important;
  width: 26px !important;
  height: 26px !important;
  padding: 0 !important;
  background: rgba(10, 7, 14, 0.85) !important;
  border: 1px solid rgba(255, 0, 85, 0.45) !important;
  border-radius: 4px !important;
  color: #ff0055 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  opacity: 0 !important;
  transform: scale(0.9) !important;
  transition: all 0.15s ease !important;
  outline: none !important;
}

.item.thumb:hover .br34-card-bookmark {
  opacity: 1 !important;
  transform: scale(1) !important;
}

.br34-card-bookmark:hover {
  background: #ff0055 !important;
  color: #000000 !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.8) !important;
}

.br34-card-bookmark.saved {
  opacity: 1 !important;
  transform: scale(1) !important;
  background: #ff0055 !important;
  color: #000000 !important;
  box-shadow: 0 0 10px rgba(255, 0, 85, 0.6) !important;
}

.br34-card-bookmark.saved svg {
  fill: currentColor !important;
}

/* Dock Bookmark Badge */
.br34-bookmark-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff0055;
  color: #000000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 4px;
  box-shadow: 0 0 8px rgba(255, 0, 85, 0.7);
  line-height: 1.1;
}

/* Micro Toast */
.br34-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  z-index: 2147483647;
  background: rgba(10, 7, 14, 0.96);
  border: 1px solid #ff0055;
  border-radius: 6px;
  color: #ffffff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 8px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.9), 0 0 16px rgba(255, 0, 85, 0.4);
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-transform: uppercase;
}

.br34-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* EROS Archive Modal */
.br34-archive-modal {
  position: fixed;
  bottom: 74px;
  right: 24px;
  z-index: 2147483646;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 90px);
  background: rgba(10, 7, 14, 0.97);
  border: 1px solid rgba(255, 0, 85, 0.45);
  border-radius: 8px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.95), 0 0 25px rgba(255, 0, 85, 0.22);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  display: flex;
  flex-direction: column;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.br34-archive-modal.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.br34-archive-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgba(16, 10, 22, 0.95);
  border-bottom: 1px solid rgba(255, 0, 85, 0.25);
}

.br34-archive-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #9c97a8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 8px 10px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
}

.br34-archive-tab:hover {
  color: #ffffff;
  background: rgba(255, 0, 85, 0.08);
}

.br34-archive-tab.active {
  color: #ff0055;
  border-bottom-color: #ff0055;
  background: rgba(255, 0, 85, 0.12);
}

.br34-archive-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.br34-archive-toolbar {
  width: 100%;
  margin-bottom: 4px;
}

.br34-btn-mark-sector {
  width: 100%;
  background: rgba(18, 12, 24, 0.9);
  border: 1px solid rgba(255, 0, 85, 0.45);
  border-radius: 5px;
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.br34-btn-mark-sector:hover {
  background: #ff0055;
  color: #000000;
  box-shadow: 0 0 12px rgba(255, 0, 85, 0.6);
}

.br34-btn-mark-sector.saved {
  background: rgba(255, 0, 85, 0.2);
  border-color: #ff0055;
  color: #ffffff;
}

.br34-archive-empty {
  text-align: center;
  padding: 30px 15px;
  color: #7d798a;
  font-size: 10.5px;
  line-height: 1.5;
}

.br34-archive-empty-title {
  color: #ff0055;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 0.08em;
}

.br34-archive-empty-sub {
  font-size: 9.5px;
}

.br34-archive-list,
.br34-video-archive-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.br34-archive-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0e0a14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid #ff0055;
  border-radius: 4px;
  padding: 7px 10px;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.br34-archive-item:hover {
  border-color: rgba(255, 0, 85, 0.4);
  border-left-color: #ff0055;
}

.br34-archive-item.is-current {
  border-color: #ff0055;
  background: rgba(255, 0, 85, 0.08);
}

.br34-archive-item-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.br34-archive-item-title {
  font-size: 11px;
  font-weight: 800;
  color: #f1f1f5;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.br34-archive-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9.5px;
  color: #8c8998;
}

.br34-tag-page {
  color: #ff0055;
  font-weight: 800;
}

.br34-archive-item-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.br34-btn-jump {
  background: #ff0055;
  border: 1px solid #ff0055;
  border-radius: 3px;
  color: #000000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 900;
  padding: 3px 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.12s ease;
}

.br34-btn-jump:hover {
  background: #ffffff;
  border-color: #ffffff;
  color: #000000;
}

.br34-btn-del {
  background: transparent;
  border: 1px solid rgba(255, 0, 85, 0.3);
  border-radius: 3px;
  color: #ff0055;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 800;
  padding: 3px 6px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.br34-btn-del:hover {
  background: #ff0055;
  color: #000000;
}

.br34-video-archive-card {
  display: flex;
  align-items: center;
  background: #0e0a14;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 6px;
  gap: 8px;
  transition: border-color 0.15s ease;
}

.br34-video-archive-card:hover {
  border-color: rgba(255, 0, 85, 0.45);
}

.br34-video-archive-thumb-wrap {
  position: relative;
  width: 58px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 2px;
  overflow: hidden;
  background: #050307;
}

.br34-video-archive-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.br34-video-archive-dur {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
  font-size: 8px;
  font-weight: 700;
  padding: 1px 3px;
  border-radius: 2px;
  line-height: 1;
}

.br34-video-archive-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.br34-video-archive-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #e5e5eb;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.br34-video-archive-title:hover {
  color: #ff0055;
}

.br34-video-archive-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: #8c8998;
}

.br34-video-archive-rating {
  color: #00e676;
  font-weight: 700;
}

.br34-video-archive-views {
  color: #a5a2b3;
}

.br34-video-archive-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.br34-archive-footer {
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 0, 85, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: rgba(16, 10, 22, 0.95);
}

.br34-archive-action-btn {
  flex: 1;
  background: rgba(18, 12, 24, 0.9);
  border: 1px solid rgba(255, 0, 85, 0.35);
  border-radius: 4px;
  color: #e5e5eb;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 800;
  padding: 5px 4px;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.br34-archive-action-btn:hover {
  background: #ff0055;
  color: #000000;
}

.br34-archive-action-btn.danger {
  border-color: rgba(255, 0, 85, 0.6);
  color: #ff0055;
}

.br34-archive-action-btn.danger:hover {
  background: #ff0055;
  color: #000000;
}

/* ==========================================================================
    Mobile Specific
    ========================================================================== */
@media (max-width: 480px) {
  .br34-dock {
    bottom: 16px;
    right: 16px;
  }

  .br34-bookmark-btn {
    height: 38px;
    width: 38px;
  }

  .br34-fab {
    bottom: 16px;
    right: 16px;
    height: 38px;
    padding: 0 12px;
    font-size: 11px;
  }

  .br34-panel,
  .br34-archive-modal {
    right: 10px;
    bottom: 60px;
    width: calc(100vw - 20px);
    max-width: 340px;
  }

  .br34-panel-header {
    padding: 8px 12px;
  }

  .br34-panel-body,
  .br34-archive-body {
    padding: 10px 12px;
    gap: 10px;
  }

  .br34-sliders-vertical {
    gap: 7px;
  }

  .br34-chip {
    font-size: 9.5px;
    padding: 6px 2px;
  }

  .br34-panel-footer,
  .br34-archive-footer {
    padding: 8px 12px;
  }
}
`;
	var managedCards = [];
	var filterBar = null;
	var autoPager = null;
	var currentFilter = null;
	var bookmarkHandle = null;
	var lastActiveSort = null;
	var awaitingAjaxReload = false;
	function injectStyles() {
		if (document.getElementById("br34-styles")) return;
		const style = document.createElement("style");
		style.id = "br34-styles";
		style.textContent = CSS;
		(document.head || document.documentElement).append(style);
	}
	function applyOwnWatched(el, data) {
		if (data.id && isWatchedId(data.id)) {
			data.isWatched = true;
			el.classList.add("watched");
		}
	}
	function scanCards() {
		const container = findVideosContainer();
		if (!container) return;
		cleanAds(container);
		const existingMap = new Map();
		for (const c of managedCards) existingMap.set(c.el, c);
		const updatedCards = [];
		const cardElements = Array.from(container.querySelectorAll(".item.thumb"));
		attachCardBookmarkButtons(cardElements, () => {
			bookmarkHandle?.refresh();
		});
		for (const el of cardElements) {
			if (isAdCard(el)) {
				el.remove();
				continue;
			}
			const existing = existingMap.get(el);
			if (existing) {
				applyOwnWatched(existing.el, existing.data);
				updatedCards.push(existing);
				continue;
			}
			const data = extractCardData(el);
			if (data) {
				applyOwnWatched(el, data);
				updatedCards.push({
					el,
					data
				});
			}
		}
		managedCards = updatedCards;
	}
	function applyFilter() {
		if (!currentFilter) return;
		let visibleCount = 0;
		for (const card of managedCards) {
			const isVisible = matchesClientFilter(card.data, currentFilter);
			card.el.dataset.br34Hidden = isVisible ? "false" : "true";
			if (isVisible) visibleCount++;
		}
		filterBar?.setCount(visibleCount, managedCards.length);
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
	function handleSortOrFilterReload() {
		const currentSort = readActiveSort(document);
		syncUrlSort(currentSort);
		lastActiveSort = currentSort;
		unclipBodyOverflow();
		cleanAds();
		initNativeFilterPanel();
		managedCards = [];
		scanCards();
		applyFilter();
		autoPager?.reset();
		bookmarkHandle?.refresh();
	}
	function boot() {
		injectStyles();
		unclipBodyOverflow();
		cleanAds();
		hardenAnchorsIn(document);
		initNewTab(document);
		if (!isListingPage()) {
			let dock = document.querySelector(".br34-dock");
			if (!dock) {
				dock = document.createElement("div");
				dock.className = "br34-dock";
				document.body.append(dock);
			}
			const dummyFab = document.createElement("div");
			dummyFab.style.display = "none";
			bookmarkHandle = mountBookmarkButton({
				fab: dummyFab,
				listKey: canonicalListKey(window.location.href),
				getPage: () => 1,
				getUrl: () => window.location.href
			});
			return;
		}
		if (!findVideosContainer()) return;
		initNativeFilterPanel();
		lastActiveSort = readActiveSort(document);
		const listKey = canonicalListKey(window.location.href);
		if (!filterBar || !filterBar.fabElement.isConnected) {
			filterBar?.destroy();
			filterBar = new FilterBar({ onFilterChange: (state) => {
				currentFilter = state;
				applyFilter();
			} });
			currentFilter = filterBar.getState();
		}
		scanCards();
		if (!autoPager) {
			autoPager = new AutoPager({
				onNewCards: (newEls) => {
					attachCardBookmarkButtons(newEls, () => {
						bookmarkHandle?.refresh();
					});
					for (const el of newEls) {
						for (const a of el.querySelectorAll("a[href*=\"/video/\"]")) hardenAnchor(a);
						const data = extractCardData(el);
						if (data) {
							applyOwnWatched(el, data);
							managedCards.push({
								el,
								data
							});
						} else el.remove();
					}
					applyFilter();
				},
				onPageLoaded: () => {
					cleanAds();
					unclipBodyOverflow();
					initNativeFilterPanel();
					bookmarkHandle?.refresh();
				}
			});
			autoPager.init();
		}
		applyFilter();
		if (filterBar && autoPager) {
			const pager = autoPager;
			bookmarkHandle = mountBookmarkButton({
				fab: filterBar.fabElement,
				listKey,
				getPage: () => pager.getCurrentPage(),
				getUrl: () => pager.getCurrentPageUrl()
			});
		}
	}
	var scheduledTimer = 0;
	function scheduleScan() {
		window.clearTimeout(scheduledTimer);
		scheduledTimer = window.setTimeout(() => {
			const sortChanged = readActiveSort(document) !== lastActiveSort;
			if (awaitingAjaxReload || sortChanged) {
				awaitingAjaxReload = false;
				handleSortOrFilterReload();
				return;
			}
			unclipBodyOverflow();
			cleanAds();
			initNativeFilterPanel();
			scanCards();
			applyFilter();
		}, 100);
	}
	document.addEventListener("click", (e) => {
		const target = e.target;
		if (!target) return;
		if (target.closest(".filters-panel a[data-action=\"ajax\"], .filters-panel .duration-filter__apply, [data-container-id*=\"sort_list\"], #js-ajax_sort, #js-ajax_sort_custom")) awaitingAjaxReload = true;
	}, true);
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => {
		boot();
	});
	else boot();
	window.addEventListener("load", () => {
		unclipBodyOverflow();
		boot();
	});
	new MutationObserver((mutations) => {
		if (autoPager?.getIsAppending()) return;
		let shouldScan = false;
		for (const m of mutations) {
			for (const node of m.addedNodes) if (node instanceof HTMLElement) {
				if (node.classList.contains("item") || node.querySelector?.(".item.thumb")) {
					shouldScan = true;
					break;
				}
			}
			if (shouldScan) break;
		}
		if (shouldScan) scheduleScan();
	}).observe(document.body || document.documentElement, {
		childList: true,
		subtree: true
	});
})();
