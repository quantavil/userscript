// ==UserScript==
// @name         YouTube Video Filter
// @namespace    https://github.com/quantavil/userscript/youtube-filter
// @version      3.3.0
// @author       quantavil
// @description  Filter YouTube videos by views, upload date, duration, keywords, and channels, with watched video dimming and customizable profiles.
// @license      GPL-3.0-or-later
// @homepage     https://github.com/quantavil/userscript
// @homepageURL  https://github.com/quantavil/userscript
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
	"use strict";
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var qs = (root, sel) => root.querySelector(sel);
	var qsa = (root, sel) => root.querySelectorAll(sel);
	var byText = (nodes, pred) => {
		for (const n of nodes) {
			const t = (n.textContent || "").trim();
			if (t && pred(t)) return t;
		}
		return "";
	};
	function injectCSS(css) {
		try {
			if (typeof GM_addStyle === "function") {
				GM_addStyle(css);
				return;
			}
		} catch {}
		const style = document.createElement("style");
		style.id = "yt-filter-styles";
		style.textContent = css;
		(document.head || document.documentElement).appendChild(style);
	}
	var showInputError = (input, message) => {
		input.classList.add("error");
		const wrapper = input.closest(".ytf-input-wrapper");
		if (!wrapper) return;
		let errorMsg = wrapper.querySelector(".ytf-error-msg");
		if (!errorMsg) {
			errorMsg = document.createElement("div");
			errorMsg.className = "ytf-error-msg";
			wrapper.appendChild(errorMsg);
		}
		errorMsg.textContent = message;
		errorMsg.classList.add("show");
	};
	var clearInputError = (input) => {
		input.classList.remove("error");
		const errorMsg = input.closest(".ytf-input-wrapper")?.querySelector(".ytf-error-msg");
		if (errorMsg) errorMsg.classList.remove("show");
	};
	var STORAGE_KEY = "ytVideoFilter:v3";
	var PROFILES_STORAGE_KEY = "ytVideoFilter:profiles:v1";
	var VIDEO_HOST_SELECTORS = [
		"ytd-rich-item-renderer",
		"ytd-video-renderer",
		"ytd-grid-video-renderer",
		"ytd-compact-video-renderer",
		"yt-lockup-view-model",
		"ytd-reel-item-renderer",
		"ytm-video-with-context-renderer",
		"ytm-compact-video-renderer",
		"ytm-reel-item-renderer",
		"ytm-rich-item-renderer",
		"ytd-reel-shelf-renderer",
		"ytd-rich-shelf-renderer",
		"ytd-rich-section-renderer",
		"ytd-post-renderer",
		"ytd-backstage-post-renderer",
		"yt-post-item-view-model"
	];
	var DEFAULT_FILTERS = Object.freeze({
		minViews: 0,
		maxViews: Infinity,
		minDays: 0,
		maxDays: Infinity,
		minDuration: 0,
		maxDuration: Infinity,
		keywordBlacklist: [],
		channelBlacklist: [],
		channelWhitelist: [],
		watchedMode: "dim",
		hideShorts: false,
		hidePosts: false,
		enabled: false,
		activeProfile: "Default"
	});
	var DEFAULT_PROFILES = [{
		name: "Default",
		minViews: 0,
		maxViews: Infinity,
		minDays: 0,
		maxDays: Infinity,
		minDuration: 0,
		maxDuration: Infinity,
		keywordBlacklist: [],
		channelBlacklist: [],
		channelWhitelist: [],
		watchedMode: "dim",
		hideShorts: false,
		hidePosts: false
	}];
	var parseNumberWithSuffix = (txt) => {
		if (!txt) return 0;
		const cleaned = txt.replace(/[\s\u00A0,]/g, "");
		const m = cleaned.match(/^([\d.]+)([KMBkmb])?$/i);
		if (m) {
			let n = parseFloat(m[1]) || 0;
			const s = (m[2] || "").toUpperCase();
			if (s === "K") n *= 1e3;
			else if (s === "M") n *= 1e6;
			else if (s === "B") n *= 1e9;
			return Math.floor(n);
		}
		const digitsOnly = cleaned.replace(/[^\d]/g, "");
		const num = parseInt(digitsOnly, 10);
		return Number.isFinite(num) ? num : 0;
	};
	var parseViews = (txt) => {
		if (!txt) return 0;
		const m = txt.match(/([\d.,\s\u00A0]+)\s*([KMBkmb])?\s*views?/i);
		if (m) {
			const numPart = m[1].replace(/[\s\u00A0,]/g, "");
			let n = parseFloat(numPart) || 0;
			const s = (m[2] || "").toUpperCase();
			if (s === "K") n *= 1e3;
			else if (s === "M") n *= 1e6;
			else if (s === "B") n *= 1e9;
			return Math.floor(n);
		}
		return parseNumberWithSuffix((txt || "").replace(/views?/i, "").trim());
	};
	var parseDaysAgo = (txt) => {
		if (!txt) return Infinity;
		const s = txt.toLowerCase().replace(/[\u00A0]/g, " ").replace(/\s+/g, " ").trim();
		if (/(just now|moments? ago|right now)/i.test(s)) return 0;
		const m = s.replace(/streamed/g, "").replace(/premiered/g, "").replace(/live/g, "").trim().match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?/);
		if (!m) return Infinity;
		return parseInt(m[1], 10) * ({
			second: 1 / 86400,
			minute: 1 / 1440,
			hour: 1 / 24,
			day: 1,
			week: 7,
			month: 30,
			year: 365
		}[m[2]] || 1);
	};
	var parseDuration = (txt) => {
		if (!txt) return NaN;
		const t = txt.trim();
		if (!/^(\d+:)?\d+:\d+$/.test(t)) return NaN;
		const parts = t.split(":").map((x) => parseInt(x, 10) || 0);
		let seconds = 0;
		if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
		else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
		else seconds = parts[0] || 0;
		return Math.floor(seconds / 60);
	};
	var toLocalISODate = (d) => {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	};
	var daysAgoToDate = (days) => {
		if (!Number.isFinite(days) || days === Infinity) return "";
		const d = new Date();
		d.setHours(12, 0, 0, 0);
		d.setDate(d.getDate() - Math.floor(days));
		return toLocalISODate(d);
	};
	var dateToDaysAgo = (dateStr) => {
		if (!dateStr) return Infinity;
		const d = new Date(`${dateStr}T12:00:00`);
		if (Number.isNaN(d.getTime())) return Infinity;
		const now = new Date();
		now.setHours(12, 0, 0, 0);
		return Math.round((now.getTime() - d.getTime()) / 864e5);
	};
	var validateNumberInput = (value, allowSuffix = false) => {
		if (value === "" || value == null) return {
			valid: true,
			value: null
		};
		const cleaned = value.replace(/[,\s]/g, "");
		if (allowSuffix) {
			if (!/^[\d.]+[KMB]?$/i.test(cleaned)) return {
				valid: false,
				error: "Use format: 1.5K, 10M, or 1,234"
			};
			return {
				valid: true,
				value: parseNumberWithSuffix(value)
			};
		}
		const num = parseInt(cleaned, 10);
		if (!Number.isFinite(num) || num < 0) return {
			valid: false,
			error: "Must be a positive number"
		};
		return {
			valid: true,
			value: num
		};
	};
	var validateDateInput = (value) => {
		if (value === "" || value == null) return {
			valid: true,
			value: null
		};
		const d = new Date(`${value}T00:00:00`);
		if (Number.isNaN(d.getTime())) return {
			valid: false,
			error: "Invalid date format"
		};
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		if (new Date(`${value}T00:00:00`) > now) return {
			valid: false,
			error: "Date cannot be in the future"
		};
		return {
			valid: true,
			value
		};
	};
	var validateFormValues = (inputs) => {
		const minViewsVal = validateNumberInput(inputs.minViews.trim(), true);
		const maxViewsVal = validateNumberInput(inputs.maxViews.trim(), true);
		const minDateVal = validateDateInput(inputs.minDate.trim());
		const maxDateVal = validateDateInput(inputs.maxDate.trim());
		const minDurVal = validateNumberInput(inputs.minDur.trim(), false);
		const maxDurVal = validateNumberInput(inputs.maxDur.trim(), false);
		const errors = {};
		let hasError = false;
		if (!minViewsVal.valid) {
			errors.minViews = minViewsVal.error;
			hasError = true;
		}
		if (!maxViewsVal.valid) {
			errors.maxViews = maxViewsVal.error;
			hasError = true;
		}
		if (!minDateVal.valid) {
			errors.minDate = minDateVal.error;
			hasError = true;
		}
		if (!maxDateVal.valid) {
			errors.maxDate = maxDateVal.error;
			hasError = true;
		}
		if (!minDurVal.valid) {
			errors.minDur = minDurVal.error;
			hasError = true;
		}
		if (!maxDurVal.valid) {
			errors.maxDur = maxDurVal.error;
			hasError = true;
		}
		if (minViewsVal.valid && maxViewsVal.valid && minViewsVal.value != null && maxViewsVal.value != null) {
			if (minViewsVal.value > maxViewsVal.value) {
				errors.minViews = "Min views cannot exceed Max views";
				hasError = true;
			}
		}
		if (minDurVal.valid && maxDurVal.valid && minDurVal.value != null && maxDurVal.value != null) {
			if (minDurVal.value > maxDurVal.value) {
				errors.minDur = "Min duration cannot exceed Max duration";
				hasError = true;
			}
		}
		if (minDateVal.valid && maxDateVal.valid && minDateVal.value && maxDateVal.value) {
			if (new Date(minDateVal.value) > new Date(maxDateVal.value)) {
				errors.minDate = "From date must be before To date";
				hasError = true;
			}
		}
		return {
			result: {
				valid: !hasError,
				minViews: minViewsVal.value,
				maxViews: maxViewsVal.value,
				minDate: minDateVal.value,
				maxDate: maxDateVal.value,
				minDur: minDurVal.value,
				maxDur: maxDurVal.value
			},
			errors
		};
	};
	var isShorts = (host) => {
		if (host.hasAttribute("is-shorts")) return true;
		const tag = host.tagName.toLowerCase();
		if (tag === "ytd-reel-item-renderer" || tag === "ytm-reel-item-renderer" || tag === "ytd-reel-shelf-renderer") return true;
		if (host.hasAttribute("overlay-style") && host.getAttribute("overlay-style") === "SHORTS") return true;
		if (qs(host, "a[href*=\"/shorts/\"], a[href^=\"/shorts/\"], [is-shorts], [overlay-style=\"SHORTS\"], ytd-reel-item-renderer, ytd-reel-shelf-renderer, yt-reel-item-view-model")) return true;
		return false;
	};
	var isPost = (host) => {
		const tag = host.tagName.toLowerCase();
		if (tag === "ytd-post-renderer" || tag === "ytd-backstage-post-renderer" || tag === "yt-post-item-view-model" || tag === "ytd-shared-post-renderer") return true;
		if (host.hasAttribute("is-posts-shelf")) return true;
		if (qs(host, "ytd-post-renderer, ytd-backstage-post-renderer, yt-post-item-view-model, ytd-shared-post-renderer, a[href*=\"/post/\"], a[href*=\"/community/\"]")) return true;
		return false;
	};
	var isVideoWatched = (host) => {
		const progressBar = qs(host, "ytd-thumbnail-overlay-resume-playback-renderer #progress") || qs(host, ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment") || qs(host, "yt-thumbnail-overlay-progress-bar-view-model [style*=\"width\"]") || qs(host, "yt-thumbnail-overlay-progress-bar-view-model");
		if (progressBar) {
			const match = `${progressBar.style?.width || ""} ${progressBar.getAttribute("style") || ""}`.match(/(\d+)%/);
			if (match) return parseInt(match[1], 10) >= 70;
			const childWithWidth = qs(progressBar, "[style*=\"width\"]");
			if (childWithWidth) {
				const childMatch = (childWithWidth.getAttribute("style") || "").match(/(\d+)%/);
				if (childMatch) return parseInt(childMatch[1], 10) >= 70;
			}
			return false;
		}
		return false;
	};
	var getVideoMeta = (host) => {
		const metaLineSpans = qsa(host, "#metadata-line span, .inline-metadata-item, .yt-content-metadata-view-model__metadata-row span, .yt-core-attributed-string, .badge-shape-wiz__text, [class*=\"metadata-text\"]");
		const viewsTxt = byText(metaLineSpans, (t) => /view/i.test(t) && !/watching/i.test(t));
		const timeTxt = byText(metaLineSpans, (t) => /(ago|streamed|premiered|just now|moments? ago)/i.test(t));
		let durationTxt = (qs(host, "ytd-thumbnail-overlay-time-status-renderer #text")?.textContent || "").trim() || (qs(host, "ytd-thumbnail-overlay-time-status-renderer [id=\"text\"]")?.textContent || "").trim() || (qs(host, ".yt-thumbnail-overlay-badge-view-model .yt-badge-shape__text")?.textContent || "").trim() || (qs(host, "badge-shape-wiz .badge-shape-wiz__text")?.textContent || "").trim() || (qs(host, "yt-badge-shape .yt-badge-shape__text")?.textContent || "").trim() || "";
		if (!durationTxt) {
			const match = ((qs(host, "ytd-thumbnail[aria-label]") || qs(host, "a#thumbnail[aria-label]") || qs(host, "a[aria-label*=\"views\"]"))?.getAttribute("aria-label") || "").match(/(\d+:\d+(?::\d+)?)/);
			if (match) durationTxt = match[1];
		}
		const titleEl = qs(host, "#video-title") || qs(host, "yt-formatted-string#video-title") || qs(host, ".yt-lockup-metadata-view-model__heading-reset") || qs(host, "a#video-title-link") || qs(host, "h3 a");
		const title = (titleEl?.getAttribute("title") || titleEl?.textContent || "").trim();
		const channel = ((qs(host, "ytd-channel-name #text") || qs(host, "ytd-channel-name a") || qs(host, "a[href^=\"/@\"]") || qs(host, "a[href*=\"/channel/\"]") || qs(host, "a[href*=\"/user/\"]") || qs(host, "a[href*=\"/c/\"]") || qs(host, ".yt-content-metadata-view-model__metadata-row .yt-core-attributed-string") || qs(host, "#channel-name a") || qs(host, "#byline a") || qs(host, ".ytd-channel-name"))?.textContent || "").trim();
		return {
			views: parseViews(viewsTxt),
			daysAgo: parseDaysAgo(timeTxt),
			duration: parseDuration(durationTxt),
			title,
			channel,
			isWatched: isVideoWatched(host)
		};
	};
	var normalize = (str) => str.toLowerCase().trim();
	var matchesKeywordBlacklist = (title, keywords) => {
		if (!title || keywords.length === 0) return false;
		const normTitle = normalize(title);
		for (const kw of keywords) {
			const trimmed = (kw || "").trim();
			if (!trimmed) continue;
			if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) try {
				const lastSlash = trimmed.lastIndexOf("/");
				const pattern = trimmed.slice(1, lastSlash);
				const flags = trimmed.slice(lastSlash + 1);
				if (new RegExp(pattern, flags).test(title)) return true;
			} catch {
				if (normTitle.includes(normalize(trimmed))) return true;
			}
			else if (normTitle.includes(normalize(trimmed))) return true;
		}
		return false;
	};
	var matchesChannelList = (channel, list) => {
		if (!channel || list.length === 0) return false;
		const normChannel = normalize(channel);
		return list.some((item) => {
			const normItem = normalize(item);
			return normItem && (normChannel === normItem || normChannel.includes(normItem));
		});
	};
	var evaluateVideo = (host, filters) => {
		if (!filters.enabled) return "show";
		if (isShorts(host)) return filters.hideShorts ? "hide" : "show";
		if (isPost(host)) return filters.hidePosts ? "hide" : "show";
		const meta = getVideoMeta(host);
		if (!matchesChannelList(meta.channel, filters.channelWhitelist)) {
			if (matchesChannelList(meta.channel, filters.channelBlacklist)) return "hide";
			if (matchesKeywordBlacklist(meta.title, filters.keywordBlacklist)) return "hide";
			const dateFilterActive = filters.minDays > 0 || filters.maxDays < Infinity;
			if (meta.daysAgo === Infinity && dateFilterActive) return "hide";
			if (meta.views < filters.minViews || meta.views > filters.maxViews) return "hide";
			if (meta.daysAgo < filters.minDays || meta.daysAgo > filters.maxDays) return "hide";
			if (Number.isFinite(meta.duration) && meta.duration >= 0 && (meta.duration < filters.minDuration || meta.duration > filters.maxDuration)) return "hide";
		}
		if (meta.isWatched) {
			if (filters.watchedMode === "hide") return "hide";
			if (filters.watchedMode === "dim") return "dim";
		}
		return "show";
	};
	var applyFiltersToDOM = (filters) => {
		const nodes = Array.from(document.querySelectorAll(VIDEO_HOST_SELECTORS.join(","))).filter((el) => {
			return !el.parentElement?.closest(VIDEO_HOST_SELECTORS.join(","));
		});
		if (!filters.enabled) {
			for (const n of nodes) n.classList.remove("ytf-hidden", "ytf-dimmed");
			return {
				visible: nodes.length,
				total: nodes.length,
				dimmed: 0
			};
		}
		let total = 0;
		let hidden = 0;
		let dimmed = 0;
		for (const host of nodes) {
			total++;
			const decision = evaluateVideo(host, filters);
			if (decision === "hide") {
				host.classList.add("ytf-hidden");
				host.classList.remove("ytf-dimmed");
				hidden++;
			} else if (decision === "dim") {
				host.classList.remove("ytf-hidden");
				host.classList.add("ytf-dimmed");
				dimmed++;
			} else host.classList.remove("ytf-hidden", "ytf-dimmed");
		}
		return {
			visible: total - hidden,
			total,
			dimmed
		};
	};
	var createScanner = (onScan) => {
		let raf = 0;
		let debounceTimer = 0;
		const schedule = () => {
			if (raf) cancelAnimationFrame(raf);
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				raf = requestAnimationFrame(() => {
					onScan();
					raf = 0;
				});
			}, 100);
		};
		const root = document.querySelector("ytd-app") || document.body;
		const observer = new MutationObserver(() => schedule());
		if (root) observer.observe(root, {
			childList: true,
			subtree: true
		});
		const onNavStart = () => schedule();
		const onNavFinish = () => {
			requestAnimationFrame(() => schedule());
		};
		const onGenericNav = () => schedule();
		window.addEventListener("yt-navigate-start", onNavStart, true);
		window.addEventListener("yt-navigate-finish", onNavFinish, true);
		window.addEventListener("yt-page-data-updated", onGenericNav, true);
		window.addEventListener("load", onGenericNav, true);
		window.addEventListener("popstate", onGenericNav, true);
		window.addEventListener("hashchange", onGenericNav, true);
		const destroy = () => {
			if (raf) cancelAnimationFrame(raf);
			if (debounceTimer) clearTimeout(debounceTimer);
			observer.disconnect();
			window.removeEventListener("yt-navigate-start", onNavStart, true);
			window.removeEventListener("yt-navigate-finish", onNavFinish, true);
			window.removeEventListener("yt-page-data-updated", onGenericNav, true);
			window.removeEventListener("load", onGenericNav, true);
			window.removeEventListener("popstate", onGenericNav, true);
			window.removeEventListener("hashchange", onGenericNav, true);
		};
		return {
			schedule,
			destroy
		};
	};
	var getDefaultFilters = () => ({
		...DEFAULT_FILTERS,
		keywordBlacklist: [...DEFAULT_FILTERS.keywordBlacklist],
		channelBlacklist: [...DEFAULT_FILTERS.channelBlacklist],
		channelWhitelist: [...DEFAULT_FILTERS.channelWhitelist]
	});
	var saveFilters = (filters) => {
		const raw = {
			minViews: filters.minViews || 0,
			maxViews: Number.isFinite(filters.maxViews) ? filters.maxViews : null,
			minDays: filters.minDays || 0,
			maxDays: Number.isFinite(filters.maxDays) ? filters.maxDays : null,
			minDuration: filters.minDuration || 0,
			maxDuration: Number.isFinite(filters.maxDuration) ? filters.maxDuration : null,
			keywordBlacklist: Array.isArray(filters.keywordBlacklist) ? filters.keywordBlacklist : [],
			channelBlacklist: Array.isArray(filters.channelBlacklist) ? filters.channelBlacklist : [],
			channelWhitelist: Array.isArray(filters.channelWhitelist) ? filters.channelWhitelist : [],
			watchedMode: filters.watchedMode || "dim",
			hideShorts: Boolean(filters.hideShorts),
			hidePosts: Boolean(filters.hidePosts),
			enabled: Boolean(filters.enabled),
			activeProfile: filters.activeProfile || "Default"
		};
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
		} catch (err) {
			console.warn("[youtube-filter] Failed to save filters to localStorage", err);
		}
	};
	var loadFilters = () => {
		try {
			const rawStr = localStorage.getItem(STORAGE_KEY);
			if (!rawStr) return getDefaultFilters();
			const d = JSON.parse(rawStr);
			const watchedMode = d.watchedMode && [
				"dim",
				"hide",
				"off"
			].includes(d.watchedMode) ? d.watchedMode : "dim";
			return {
				minViews: Math.max(0, d.minViews ?? 0),
				maxViews: d.maxViews != null && Number.isFinite(d.maxViews) ? d.maxViews : Infinity,
				minDays: Math.max(0, d.minDays ?? 0),
				maxDays: d.maxDays != null && Number.isFinite(d.maxDays) ? d.maxDays : Infinity,
				minDuration: Math.max(0, d.minDuration ?? 0),
				maxDuration: d.maxDuration != null && Number.isFinite(d.maxDuration) ? d.maxDuration : Infinity,
				keywordBlacklist: Array.isArray(d.keywordBlacklist) ? d.keywordBlacklist : [],
				channelBlacklist: Array.isArray(d.channelBlacklist) ? d.channelBlacklist : [],
				channelWhitelist: Array.isArray(d.channelWhitelist) ? d.channelWhitelist : [],
				watchedMode,
				hideShorts: Boolean(d.hideShorts),
				hidePosts: Boolean(d.hidePosts),
				enabled: Boolean(d.enabled),
				activeProfile: d.activeProfile || "Default"
			};
		} catch (err) {
			console.warn("[youtube-filter] Failed to load filters from localStorage, using defaults", err);
			return getDefaultFilters();
		}
	};
	var loadProfiles = () => {
		try {
			const rawStr = localStorage.getItem(PROFILES_STORAGE_KEY);
			if (!rawStr) return [...DEFAULT_PROFILES];
			const saved = JSON.parse(rawStr);
			if (!Array.isArray(saved) || saved.length === 0) return [...DEFAULT_PROFILES];
			return saved;
		} catch (err) {
			console.warn("[youtube-filter] Failed to load profiles from localStorage", err);
			return [...DEFAULT_PROFILES];
		}
	};
	var saveProfiles = (profiles) => {
		try {
			localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
		} catch (err) {
			console.warn("[youtube-filter] Failed to save profiles to localStorage", err);
		}
	};
	var STYLES = `
/* YouTube Theme: Left-edge Bookmark Tab */
#yt-filter-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 99999;
  background: #212121;
  color: #f1f1f1;
  border: 1px solid #383838;
  border-left: none;
  border-radius: 0 10px 10px 0;
  padding: 14px 8px;
  cursor: pointer;
  font: 500 12px/1 'YouTube Sans', 'Roboto', Arial, sans-serif;
  letter-spacing: 1.2px;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.5);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s, border-color 0.2s, opacity 0.2s, padding 0.2s;
  writing-mode: vertical-rl;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  touch-action: manipulation;
}
#yt-filter-toggle:hover,
#yt-filter-toggle:active {
  background: #2a2a2a;
  border-color: #ff0000;
  box-shadow: 3px 0 16px rgba(255, 0, 0, 0.25);
  padding-right: 11px;
  color: #fff;
}
#yt-filter-toggle.active {
  border-color: #ff0000;
  color: #fff;
  background: #261616;
  box-shadow: 3px 0 16px rgba(255, 0, 0, 0.35);
}
#yt-filter-toggle.panel-open {
  transform: translateY(-50%) translateX(-100%);
  opacity: 0;
  pointer-events: none;
}
.ytf-toggle-icon {
  width: 15px;
  height: 15px;
  writing-mode: horizontal-tb;
  display: flex;
  align-items: center;
  justify-content: center;
  fill: currentColor;
}
.ytf-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff0000;
  box-shadow: 0 0 6px #ff0000;
  display: none;
}
#yt-filter-toggle.active .ytf-active-dot {
  display: block;
}

/* Dimmed / Greyed-out Watched Videos */
.ytf-dimmed {
  opacity: 0.25 !important;
  filter: grayscale(90%) !important;
  transition: opacity 0.2s ease, filter 0.2s ease !important;
}
.ytf-dimmed:hover {
  opacity: 0.95 !important;
  filter: grayscale(0%) !important;
}

/* YouTube Theme: Left-side Drawer Panel */
#yt-filter-panel {
  position: fixed;
  top: 50%;
  left: -380px;
  transform: translateY(-50%);
  z-index: 100000;
  width: 350px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0f0f0f;
  color: #f1f1f1;
  border: 1px solid #282828;
  border-left: none;
  border-radius: 0 14px 14px 0;
  box-shadow: 6px 0 32px rgba(0, 0, 0, 0.85);
  padding: 18px;
  font: 13px/1.4 'YouTube Sans', 'Roboto', Arial, sans-serif;
  transition: left 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}
#yt-filter-panel.visible {
  left: 0;
}

#yt-filter-panel::-webkit-scrollbar {
  width: 5px;
}
#yt-filter-panel::-webkit-scrollbar-track {
  background: #141414;
}
#yt-filter-panel::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
#yt-filter-panel::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}

#yt-filter-panel h3 {
  margin: 0 0 14px;
  font: 500 16px/1.2 'YouTube Sans', 'Roboto', Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #272727;
  padding-bottom: 12px;
  user-select: none;
}

.ytf-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ytf-title-icon {
  width: 18px;
  height: 18px;
  fill: #ff0000;
}

/* Red Close Button */
.ytf-close {
  cursor: pointer;
  font-size: 20px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  color: #ff4d4d;
}
.ytf-close:hover,
.ytf-close:active {
  background: rgba(255, 77, 77, 0.18);
  color: #ff2222;
  transform: scale(1.1);
}

/* Profile Selector Bar */
.ytf-profile-section {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #222;
}
.ytf-profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ytf-profile-header label {
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}
.ytf-profile-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ytf-profile-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 14px;
  background: #1e1e1e;
  border: 1px solid #333;
  color: #aaa;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}
.ytf-profile-pill:hover,
.ytf-profile-pill:active {
  background: #2a2a2a;
  color: #fff;
  border-color: #555;
}
.ytf-profile-pill.active {
  background: #f1f1f1;
  color: #0f0f0f;
  border-color: #fff;
  font-weight: 600;
}
.ytf-profile-delete {
  margin-left: 6px;
  color: #888;
  font-size: 13px;
  line-height: 1;
  transition: color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ytf-profile-delete:hover,
.ytf-profile-delete:active {
  color: #ff4d4d;
}

.ytf-save-profile-btn {
  padding: 4px 8px;
  border-radius: 14px;
  background: transparent;
  border: 1px dashed #444;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.ytf-save-profile-btn:hover,
.ytf-save-profile-btn:active {
  border-color: #888;
  color: #fff;
}

/* Watched Videos Segmented Control */
.ytf-segmented-control {
  display: flex;
  background: #181818;
  border: 1px solid #303030;
  border-radius: 16px;
  padding: 2px;
  margin-top: 4px;
}
.ytf-segment-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 14px;
  padding: 6px 10px;
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}
.ytf-segment-btn:hover,
.ytf-segment-btn:active {
  color: #fff;
}
.ytf-segment-btn.active {
  background: #2e2e2e;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

/* Content Toggles: Hide Shorts & Hide Posts */
.ytf-toggle-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.ytf-switch-label {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #181818;
  border: 1px solid #303030;
  border-radius: 8px;
  padding: 7px 10px;
  color: #ccc;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all 0.18s ease;
}
.ytf-switch-label:hover {
  background: #222;
  color: #fff;
  border-color: #444;
}
.ytf-switch-label.active {
  background: #261616;
  border-color: #ff0000;
  color: #fff;
}
.ytf-checkbox {
  accent-color: #ff0000;
  cursor: pointer;
  width: 14px;
  height: 14px;
  margin: 0;
}

/* Header Row with Inline Label & Quick Chips */
.ytf-group {
  margin-bottom: 14px;
}
.ytf-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ytf-header-row label {
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
  user-select: none;
}

.ytf-inline-chips {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.ytf-chip {
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #aaa;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
  line-height: 1.2;
}
.ytf-chip:hover,
.ytf-chip:active {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.28);
}
.ytf-chip:active {
  transform: scale(0.94);
}

.ytf-row {
  display: flex;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.ytf-input-wrapper {
  flex: 1;
  position: relative;
}

/* Custom Inputs - Clean YouTube Dark Style */
.ytf-input {
  width: 100%;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid #303030;
  background: #181818;
  color: #fff;
  font-size: 13px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
}

/* Remove number input spin up/down buttons completely */
.ytf-input::-webkit-outer-spin-button,
.ytf-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.ytf-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.ytf-input:focus {
  outline: none;
  border-color: #f1f1f1;
  background: #202020;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
  z-index: 3;
}
.ytf-input.error {
  border-color: #ff4d4d;
  background: rgba(255, 77, 77, 0.1);
  box-shadow: 0 0 0 2px rgba(255, 77, 77, 0.2);
}
.ytf-input::placeholder {
  color: #717171;
}

.ytf-input[type="date"] {
  position: relative;
  z-index: 2;
}
.ytf-input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  cursor: pointer;
  position: relative;
  z-index: 4;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}
.ytf-input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
.ytf-input[type="date"]::-webkit-datetime-edit {
  color: #fff;
}
.ytf-input[type="date"]::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}
.ytf-input[type="date"]::-webkit-inner-spin-button {
  display: none;
}

/* Tag Chips Input Container (Keywords & Channels) */
.ytf-tag-input-box {
  background: #181818;
  border: 1px solid #303030;
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  transition: border-color 0.2s;
}
.ytf-tag-input-box:focus-within {
  border-color: #f1f1f1;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
}
.ytf-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #282828;
  border: 1px solid #3c3c3c;
  border-radius: 12px;
  padding: 2px 7px;
  font-size: 11px;
  color: #eee;
  user-select: none;
}
.ytf-tag-chip.vip {
  background: #1e281e;
  border-color: #2e4d2e;
  color: #4ade80;
}
.ytf-tag-chip.blacklist {
  background: #2c1a1a;
  border-color: #4d2e2e;
  color: #f87171;
}
.ytf-tag-remove {
  cursor: pointer;
  color: #888;
  font-size: 13px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.ytf-tag-remove:hover,
.ytf-tag-remove:active {
  color: #ff4d4d;
}
.ytf-tag-field {
  flex: 1;
  min-width: 90px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 12px;
  padding: 3px 5px;
  outline: none;
}
.ytf-tag-field::placeholder {
  color: #666;
}

.ytf-error-msg {
  color: #ff4d4d;
  font-size: 11px;
  margin-top: 4px;
  display: none;
  animation: ytfFadeIn 0.2s ease;
}
.ytf-error-msg.show {
  display: block;
}

@keyframes ytfFadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ytf-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.ytf-btn {
  flex: 1;
  padding: 10px 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.1);
  color: #f1f1f1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.18s ease;
}
.ytf-btn:hover:not(:disabled),
.ytf-btn:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}
.ytf-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* YouTube Style Primary CTA */
.ytf-btn.primary {
  background: #f1f1f1;
  border: none;
  color: #0f0f0f;
  font-weight: 600;
}
.ytf-btn.primary:hover:not(:disabled),
.ytf-btn.primary:active:not(:disabled) {
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
}
.ytf-btn.primary.active {
  background: #cc0000;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(204, 0, 0, 0.4);
}
.ytf-btn.primary.active:hover:not(:disabled),
.ytf-btn.primary.active:active:not(:disabled) {
  background: #ff0000;
  box-shadow: 0 3px 14px rgba(255, 0, 0, 0.5);
}

.ytf-stats {
  margin-top: 14px;
  padding: 10px;
  background: #181818;
  border-radius: 8px;
  border: 1px solid #282828;
  color: #aaa;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
}
.ytf-hidden {
  display: none !important;
}

/* Mobile Responsiveness (Phones & Small Screens) */
@media (max-width: 480px) {
  #yt-filter-panel {
    width: min(320px, 92vw);
    max-height: 85vh;
    padding: 14px;
    border-radius: 0 12px 12px 0;
  }
  #yt-filter-toggle {
    padding: 10px 5px;
    font-size: 10px;
    letter-spacing: 0.8px;
  }
  .ytf-row {
    flex-direction: column;
    gap: 6px;
  }
  .ytf-tag-input-box {
    padding: 4px;
  }
}
`;
	var createFilterSvg = (size) => {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("width", String(size));
		svg.setAttribute("height", String(size));
		svg.setAttribute("fill", "currentColor");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z");
		svg.appendChild(path);
		return svg;
	};
	var createUI = (state, onFiltersChange) => {
		const oldToggle = document.getElementById("yt-filter-toggle");
		const oldPanel = document.getElementById("yt-filter-panel");
		if (oldToggle) oldToggle.remove();
		if (oldPanel) oldPanel.remove();
		let profiles = loadProfiles();
		const toggleBtn = document.createElement("button");
		toggleBtn.id = "yt-filter-toggle";
		toggleBtn.type = "button";
		toggleBtn.title = "Filter YouTube Videos (Alt+F)";
		const iconSpan = document.createElement("span");
		iconSpan.className = "ytf-toggle-icon";
		iconSpan.appendChild(createFilterSvg(15));
		const textSpan = document.createElement("span");
		textSpan.textContent = "FILTER";
		const dotSpan = document.createElement("span");
		dotSpan.className = "ytf-active-dot";
		toggleBtn.appendChild(iconSpan);
		toggleBtn.appendChild(textSpan);
		toggleBtn.appendChild(dotSpan);
		if (state.enabled) toggleBtn.classList.add("active");
		const panel = document.createElement("div");
		panel.id = "yt-filter-panel";
		const header = document.createElement("h3");
		const titleWrap = document.createElement("span");
		titleWrap.className = "ytf-title-wrap";
		const titleIcon = createFilterSvg(17);
		titleIcon.classList.add("ytf-title-icon");
		titleWrap.appendChild(titleIcon);
		const titleText = document.createElement("span");
		titleText.textContent = "Video Filters";
		titleWrap.appendChild(titleText);
		const closeBtn = document.createElement("span");
		closeBtn.className = "ytf-close";
		closeBtn.title = "Close";
		closeBtn.textContent = "×";
		header.appendChild(titleWrap);
		header.appendChild(closeBtn);
		panel.appendChild(header);
		const mount = () => {
			const root = document.body || document.documentElement;
			if (!document.getElementById("yt-filter-toggle") && root) root.appendChild(toggleBtn);
			if (!document.getElementById("yt-filter-panel") && root) root.appendChild(panel);
		};
		mount();
		const openPanel = () => {
			panel.classList.add("visible");
			toggleBtn.classList.add("panel-open");
		};
		const closePanel = () => {
			panel.classList.remove("visible");
			toggleBtn.classList.remove("panel-open");
		};
		const togglePanel = () => {
			if (panel.classList.contains("visible")) closePanel();
			else openPanel();
		};
		toggleBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			openPanel();
		});
		closeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			closePanel();
		});
		document.addEventListener("click", (e) => {
			if (panel.classList.contains("visible") && !panel.contains(e.target) && !toggleBtn.contains(e.target)) closePanel();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && panel.classList.contains("visible")) closePanel();
			else if (e.altKey && (e.key === "f" || e.key === "F")) {
				e.preventDefault();
				togglePanel();
			}
		});
		const profileSection = document.createElement("div");
		profileSection.className = "ytf-profile-section";
		const profileHeader = document.createElement("div");
		profileHeader.className = "ytf-profile-header";
		const profileLabel = document.createElement("label");
		profileLabel.textContent = "Presets / Profiles";
		profileHeader.appendChild(profileLabel);
		const saveProfileBtn = document.createElement("button");
		saveProfileBtn.type = "button";
		saveProfileBtn.className = "ytf-save-profile-btn";
		saveProfileBtn.textContent = "+ Save Profile";
		profileHeader.appendChild(saveProfileBtn);
		profileSection.appendChild(profileHeader);
		const profilePills = document.createElement("div");
		profilePills.className = "ytf-profile-pills";
		profileSection.appendChild(profilePills);
		panel.appendChild(profileSection);
		const createTextInput = (id, placeholder) => {
			const input = document.createElement("input");
			input.className = "ytf-input";
			input.id = id;
			input.placeholder = placeholder;
			input.type = "text";
			return input;
		};
		const createDateInput = (id, placeholder) => {
			const input = document.createElement("input");
			input.className = "ytf-input";
			input.id = id;
			input.placeholder = placeholder;
			input.type = "date";
			return input;
		};
		const createNumberInput = (id, placeholder) => {
			const input = document.createElement("input");
			input.className = "ytf-input";
			input.id = id;
			input.placeholder = placeholder;
			input.type = "number";
			input.min = "0";
			input.step = "1";
			return input;
		};
		const minViewsInput = createTextInput("minViews", "Min (e.g., 10K)");
		const maxViewsInput = createTextInput("maxViews", "Max (e.g., 10M)");
		const minDateInput = createDateInput("minDate", "From");
		const maxDateInput = createDateInput("maxDate", "To");
		const minDurInput = createNumberInput("minDuration", "Min (mins)");
		const maxDurInput = createNumberInput("maxDuration", "Max (mins)");
		const allNumberInputs = [
			minViewsInput,
			maxViewsInput,
			minDateInput,
			maxDateInput,
			minDurInput,
			maxDurInput
		];
		for (const input of allNumberInputs) {
			input.addEventListener("input", () => clearInputError(input));
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					applyFilterAction();
				}
			});
		}
		const createGroup = (labelTxt, inputs, chips = []) => {
			const group = document.createElement("div");
			group.className = "ytf-group";
			const headerRow = document.createElement("div");
			headerRow.className = "ytf-header-row";
			const label = document.createElement("label");
			label.textContent = labelTxt;
			headerRow.appendChild(label);
			if (chips.length > 0) {
				const chipsContainer = document.createElement("div");
				chipsContainer.className = "ytf-inline-chips";
				for (const chip of chips) {
					const chipBtn = document.createElement("button");
					chipBtn.type = "button";
					chipBtn.className = "ytf-chip";
					chipBtn.textContent = chip.label;
					chipBtn.addEventListener("click", (e) => {
						e.preventDefault();
						chip.onClick();
					});
					chipsContainer.appendChild(chipBtn);
				}
				headerRow.appendChild(chipsContainer);
			}
			const row = document.createElement("div");
			row.className = "ytf-row";
			for (const input of inputs) {
				const wrapper = document.createElement("div");
				wrapper.className = "ytf-input-wrapper";
				wrapper.appendChild(input);
				row.appendChild(wrapper);
			}
			group.appendChild(headerRow);
			group.appendChild(row);
			return group;
		};
		const contentSection = document.createElement("div");
		contentSection.className = "ytf-group";
		const contentLabel = document.createElement("label");
		contentLabel.textContent = "Watched & Content Filters";
		contentSection.appendChild(contentLabel);
		const segmentedBox = document.createElement("div");
		segmentedBox.className = "ytf-segmented-control";
		const modes = [
			{
				mode: "dim",
				label: "Dim (Greyout)"
			},
			{
				mode: "hide",
				label: "Hide"
			},
			{
				mode: "off",
				label: "Off"
			}
		];
		const segmentBtns = {};
		for (const { mode, label } of modes) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = `ytf-segment-btn ${state.watchedMode === mode ? "active" : ""}`;
			btn.textContent = label;
			btn.addEventListener("click", () => {
				state.watchedMode = mode;
				for (const m of Object.keys(segmentBtns)) segmentBtns[m].classList.toggle("active", m === mode);
				if (state.enabled) {
					saveFilters(state);
					onFiltersChange();
				}
			});
			segmentBtns[mode] = btn;
			segmentedBox.appendChild(btn);
		}
		contentSection.appendChild(segmentedBox);
		const toggleRow = document.createElement("div");
		toggleRow.className = "ytf-toggle-row";
		const createToggleCheckbox = (id, labelTxt, initialChecked, onChange) => {
			const label = document.createElement("label");
			label.className = `ytf-switch-label ${initialChecked ? "active" : ""}`;
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.id = id;
			cb.className = "ytf-checkbox";
			cb.checked = initialChecked;
			const span = document.createElement("span");
			span.textContent = labelTxt;
			cb.addEventListener("change", () => {
				label.classList.toggle("active", cb.checked);
				onChange(cb.checked);
				if (state.enabled) {
					saveFilters(state);
					onFiltersChange();
				}
			});
			label.appendChild(cb);
			label.appendChild(span);
			return {
				label,
				cb
			};
		};
		const shortsToggle = createToggleCheckbox("ytf-hide-shorts", "Hide Shorts", Boolean(state.hideShorts), (checked) => {
			state.hideShorts = checked;
		});
		const postsToggle = createToggleCheckbox("ytf-hide-posts", "Hide Posts", Boolean(state.hidePosts), (checked) => {
			state.hidePosts = checked;
		});
		toggleRow.appendChild(shortsToggle.label);
		toggleRow.appendChild(postsToggle.label);
		contentSection.appendChild(toggleRow);
		panel.appendChild(contentSection);
		panel.appendChild(createGroup("Views", [minViewsInput, maxViewsInput], [{
			label: "> 100K",
			onClick: () => {
				minViewsInput.value = "100K";
				clearInputError(minViewsInput);
			}
		}, {
			label: "> 1M",
			onClick: () => {
				minViewsInput.value = "1M";
				clearInputError(minViewsInput);
			}
		}]));
		panel.appendChild(createGroup("Date Range", [minDateInput, maxDateInput]));
		panel.appendChild(createGroup("Duration (mins)", [minDurInput, maxDurInput], [{
			label: "< 15m",
			onClick: () => {
				maxDurInput.value = "15";
				clearInputError(maxDurInput);
			}
		}, {
			label: "> 20m",
			onClick: () => {
				minDurInput.value = "20";
				clearInputError(minDurInput);
			}
		}]));
		const createTagInputGroup = (labelTxt, tagList, placeholder, chipType = "keyword") => {
			const group = document.createElement("div");
			group.className = "ytf-group";
			const label = document.createElement("label");
			label.textContent = labelTxt;
			group.appendChild(label);
			const box = document.createElement("div");
			box.className = "ytf-tag-input-box";
			const renderChips = () => {
				const existingChips = box.querySelectorAll(".ytf-tag-chip");
				for (const c of existingChips) c.remove();
				for (let i = 0; i < tagList.length; i++) {
					const val = tagList[i];
					const chip = document.createElement("span");
					chip.className = `ytf-tag-chip ${chipType}`;
					const txt = document.createElement("span");
					txt.textContent = val;
					const removeBtn = document.createElement("span");
					removeBtn.className = "ytf-tag-remove";
					removeBtn.textContent = "×";
					removeBtn.addEventListener("click", (e) => {
						e.stopPropagation();
						tagList.splice(i, 1);
						renderChips();
						if (state.enabled) {
							saveFilters(state);
							onFiltersChange();
						}
					});
					chip.appendChild(txt);
					chip.appendChild(removeBtn);
					box.insertBefore(chip, field);
				}
			};
			const field = document.createElement("input");
			field.type = "text";
			field.className = "ytf-tag-field";
			field.placeholder = placeholder;
			const commit = () => {
				const v = field.value.trim().replace(/^,|,$/g, "");
				if (v && !tagList.includes(v)) {
					tagList.push(v);
					field.value = "";
					renderChips();
					if (state.enabled) {
						saveFilters(state);
						onFiltersChange();
					}
				}
			};
			field.addEventListener("blur", commit);
			field.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === ",") {
					e.preventDefault();
					commit();
				} else if (e.key === "Backspace" && field.value === "" && tagList.length > 0) {
					tagList.pop();
					renderChips();
					if (state.enabled) {
						saveFilters(state);
						onFiltersChange();
					}
				}
			});
			box.appendChild(field);
			group.appendChild(box);
			renderChips();
			return {
				group,
				renderChips,
				commit
			};
		};
		const keywordsTagInput = createTagInputGroup("Keyword Blacklist", state.keywordBlacklist, "Add keyword (e.g. prank)...", "keyword");
		panel.appendChild(keywordsTagInput.group);
		const channelBlacklistInput = createTagInputGroup("Channel Blacklist", state.channelBlacklist, "Block channel name...", "blacklist");
		panel.appendChild(channelBlacklistInput.group);
		const channelWhitelistInput = createTagInputGroup("VIP Channels", state.channelWhitelist, "VIP creator name...", "vip");
		panel.appendChild(channelWhitelistInput.group);
		const hydrateForm = () => {
			const setInputVal = (el, val) => {
				el.value = val === Infinity || val === 0 ? "" : String(val);
			};
			setInputVal(minViewsInput, state.minViews);
			setInputVal(maxViewsInput, state.maxViews);
			minDateInput.value = state.maxDays !== Infinity ? daysAgoToDate(state.maxDays) : "";
			maxDateInput.value = state.minDays !== 0 ? daysAgoToDate(state.minDays) : "";
			setInputVal(minDurInput, state.minDuration);
			setInputVal(maxDurInput, state.maxDuration);
			for (const m of Object.keys(segmentBtns)) segmentBtns[m]?.classList.toggle("active", m === state.watchedMode);
			shortsToggle.cb.checked = Boolean(state.hideShorts);
			shortsToggle.label.classList.toggle("active", Boolean(state.hideShorts));
			postsToggle.cb.checked = Boolean(state.hidePosts);
			postsToggle.label.classList.toggle("active", Boolean(state.hidePosts));
			keywordsTagInput.renderChips();
			channelBlacklistInput.renderChips();
			channelWhitelistInput.renderChips();
			renderProfiles();
		};
		const renderProfiles = () => {
			profilePills.replaceChildren();
			for (let i = 0; i < profiles.length; i++) {
				const prof = profiles[i];
				const pill = document.createElement("button");
				pill.type = "button";
				pill.className = `ytf-profile-pill ${state.activeProfile === prof.name ? "active" : ""}`;
				const nameSpan = document.createElement("span");
				nameSpan.textContent = prof.name;
				pill.appendChild(nameSpan);
				if (prof.name.toLowerCase() !== "default") {
					const delBtn = document.createElement("span");
					delBtn.className = "ytf-profile-delete";
					delBtn.title = `Delete profile "${prof.name}"`;
					delBtn.textContent = "×";
					delBtn.addEventListener("click", (e) => {
						e.stopPropagation();
						profiles.splice(i, 1);
						if (state.activeProfile === prof.name) {
							state.activeProfile = "Default";
							const defaultFilters = getDefaultFilters();
							state.minViews = defaultFilters.minViews;
							state.maxViews = defaultFilters.maxViews;
							state.minDays = defaultFilters.minDays;
							state.maxDays = defaultFilters.maxDays;
							state.minDuration = defaultFilters.minDuration;
							state.maxDuration = defaultFilters.maxDuration;
							state.keywordBlacklist = [...defaultFilters.keywordBlacklist];
							state.channelBlacklist = [...defaultFilters.channelBlacklist];
							state.channelWhitelist = [...defaultFilters.channelWhitelist];
							state.watchedMode = defaultFilters.watchedMode;
							state.hideShorts = defaultFilters.hideShorts;
							state.hidePosts = defaultFilters.hidePosts;
							hydrateForm();
							saveFilters(state);
							if (state.enabled) onFiltersChange();
						}
						saveProfiles(profiles);
						renderProfiles();
					});
					pill.appendChild(delBtn);
				}
				pill.addEventListener("click", () => {
					state.activeProfile = prof.name;
					state.minViews = prof.minViews;
					state.maxViews = prof.maxViews;
					state.minDays = prof.minDays;
					state.maxDays = prof.maxDays;
					state.minDuration = prof.minDuration;
					state.maxDuration = prof.maxDuration;
					state.keywordBlacklist = [...prof.keywordBlacklist];
					state.channelBlacklist = [...prof.channelBlacklist];
					state.channelWhitelist = [...prof.channelWhitelist];
					state.watchedMode = prof.watchedMode;
					state.hideShorts = Boolean(prof.hideShorts);
					state.hidePosts = Boolean(prof.hidePosts);
					hydrateForm();
					saveFilters(state);
					if (state.enabled) onFiltersChange();
				});
				profilePills.appendChild(pill);
			}
		};
		saveProfileBtn.addEventListener("click", () => {
			const profileName = prompt("Enter a name for this custom profile:");
			if (!profileName || !profileName.trim()) return;
			const name = profileName.trim();
			const newProf = {
				name,
				minViews: state.minViews,
				maxViews: state.maxViews,
				minDays: state.minDays,
				maxDays: state.maxDays,
				minDuration: state.minDuration,
				maxDuration: state.maxDuration,
				keywordBlacklist: [...state.keywordBlacklist],
				channelBlacklist: [...state.channelBlacklist],
				channelWhitelist: [...state.channelWhitelist],
				watchedMode: state.watchedMode,
				hideShorts: Boolean(state.hideShorts),
				hidePosts: Boolean(state.hidePosts)
			};
			const existingIdx = profiles.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
			if (existingIdx >= 0) profiles[existingIdx] = newProf;
			else profiles.push(newProf);
			state.activeProfile = name;
			saveProfiles(profiles);
			saveFilters(state);
			renderProfiles();
		});
		renderProfiles();
		hydrateForm();
		const actions = document.createElement("div");
		actions.className = "ytf-actions";
		const applyBtn = document.createElement("button");
		applyBtn.className = "ytf-btn primary";
		applyBtn.id = "ytf-apply";
		applyBtn.type = "button";
		applyBtn.textContent = state.enabled ? "Disable Filter" : "Apply Filter";
		if (state.enabled) applyBtn.classList.add("active");
		const applyFilterAction = () => {
			if (state.enabled) {
				state.enabled = false;
				applyBtn.textContent = "Apply Filter";
				applyBtn.classList.remove("active");
				toggleBtn.classList.remove("active");
				saveFilters(state);
				onFiltersChange();
			} else {
				keywordsTagInput.commit();
				channelBlacklistInput.commit();
				channelWhitelistInput.commit();
				const { result, errors } = validateFormValues({
					minViews: minViewsInput.value,
					maxViews: maxViewsInput.value,
					minDate: minDateInput.value,
					maxDate: maxDateInput.value,
					minDur: minDurInput.value,
					maxDur: maxDurInput.value
				});
				for (const input of allNumberInputs) clearInputError(input);
				if (!result.valid) {
					if (errors.minViews) showInputError(minViewsInput, errors.minViews);
					if (errors.maxViews) showInputError(maxViewsInput, errors.maxViews);
					if (errors.minDate) showInputError(minDateInput, errors.minDate);
					if (errors.maxDate) showInputError(maxDateInput, errors.maxDate);
					if (errors.minDur) showInputError(minDurInput, errors.minDur);
					if (errors.maxDur) showInputError(maxDurInput, errors.maxDur);
					return;
				}
				state.minViews = result.minViews ?? 0;
				state.maxViews = result.maxViews ?? Infinity;
				state.maxDays = result.minDate ? dateToDaysAgo(result.minDate) : Infinity;
				state.minDays = result.maxDate ? dateToDaysAgo(result.maxDate) : 0;
				state.minDuration = result.minDur ?? 0;
				state.maxDuration = result.maxDur ?? Infinity;
				state.enabled = true;
				applyBtn.textContent = "Disable Filter";
				applyBtn.classList.add("active");
				toggleBtn.classList.add("active");
				saveFilters(state);
				onFiltersChange();
			}
		};
		applyBtn.addEventListener("click", applyFilterAction);
		const resetBtn = document.createElement("button");
		resetBtn.className = "ytf-btn";
		resetBtn.type = "button";
		resetBtn.textContent = "Reset";
		resetBtn.addEventListener("click", () => {
			for (const input of allNumberInputs) {
				input.value = "";
				clearInputError(input);
			}
			const fresh = getDefaultFilters();
			state.minViews = fresh.minViews;
			state.maxViews = fresh.maxViews;
			state.minDays = fresh.minDays;
			state.maxDays = fresh.maxDays;
			state.minDuration = fresh.minDuration;
			state.maxDuration = fresh.maxDuration;
			state.keywordBlacklist = [];
			state.channelBlacklist = [];
			state.channelWhitelist = [];
			state.watchedMode = "dim";
			state.hideShorts = fresh.hideShorts;
			state.hidePosts = fresh.hidePosts;
			state.activeProfile = "Default";
			state.enabled = false;
			applyBtn.textContent = "Apply Filter";
			applyBtn.classList.remove("active");
			toggleBtn.classList.remove("active");
			hydrateForm();
			saveFilters(state);
			onFiltersChange();
		});
		actions.appendChild(applyBtn);
		actions.appendChild(resetBtn);
		panel.appendChild(actions);
		const stats = document.createElement("div");
		stats.className = "ytf-stats";
		stats.id = "ytf-stats";
		stats.textContent = state.enabled ? "Applying…" : "Filter disabled";
		panel.appendChild(stats);
		const updateStats = (visible, total, dimmed = 0) => {
			if (state.enabled) {
				const dimmedTxt = dimmed > 0 ? ` (${dimmed} dimmed)` : "";
				stats.textContent = `Showing ${visible} of ${total} videos${dimmedTxt}`;
			} else stats.textContent = "Filter disabled";
		};
		const syncUI = () => {
			mount();
		};
		const destroy = () => {
			toggleBtn.remove();
			panel.remove();
		};
		return {
			togglePanel,
			openPanel,
			closePanel,
			updateStats,
			syncUI,
			destroy
		};
	};
	var init = () => {
		injectCSS(STYLES);
		const filters = loadFilters();
		let ui;
		const apply = () => {
			if (ui) ui.syncUI();
			const stats = applyFiltersToDOM(filters);
			if (ui) ui.updateStats(stats.visible, stats.total, stats.dimmed);
		};
		ui = createUI(filters, apply);
		if (typeof _GM_registerMenuCommand === "function") try {
			_GM_registerMenuCommand("Toggle Filter Panel", () => {
				ui.togglePanel();
			});
		} catch {}
		const scanner = createScanner(apply);
		setTimeout(() => {
			scanner.schedule();
		}, 400);
	};
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
	else init();
})();
