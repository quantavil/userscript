// ==UserScript==
// @name         Omarchy Plugins Enhancer
// @namespace    https://github.com/quantavil/userscript/
// @version      1.2.0
// @author       quantavil
// @description  Auto pager next (infinite scroll), direct GitHub links on cards, and grey out or collapse seen plugins on plugins.omarchy.org
// @license      GPL-3.0-or-later
// @match        https://plugins.omarchy.org/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
	"use strict";
	var CatalogService = class {
		pluginsMap = new Map();
		loadPromise = null;
		async getCatalog() {
			if (this.pluginsMap.size > 0) return this.pluginsMap;
			if (this.loadPromise) return this.loadPromise;
			this.loadPromise = this.fetchCatalog();
			return this.loadPromise;
		}
		getPlugin(id) {
			return this.pluginsMap.get(id);
		}
		getPluginRepo(id) {
			const plugin = this.pluginsMap.get(id);
			if (!plugin) return void 0;
			return plugin.repo || plugin.sourceUrl;
		}
		setCatalogData(plugins) {
			this.pluginsMap.clear();
			for (const plugin of plugins) if (plugin && plugin.id) this.pluginsMap.set(plugin.id, plugin);
		}
		async fetchCatalog() {
			try {
				const url = typeof window !== "undefined" && window.location?.origin ? `${window.location.origin}/catalog.json` : "https://plugins.omarchy.org/catalog.json";
				const res = await fetch(url, { cache: "no-store" });
				if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status}`);
				const data = await res.json();
				if (Array.isArray(data.plugins)) this.setCatalogData(data.plugins);
			} catch (err) {
				console.warn("[Omarchy Enhancer] Failed to fetch catalog:", err);
			}
			return this.pluginsMap;
		}
	};
	var catalogService = new CatalogService();
	var SETTINGS_KEY = "ope_settings";
	var SEEN_PLUGINS_KEY = "ope_seen_plugins";
	var DEFAULT_SETTINGS = {
		autoPagerEnabled: true,
		seenMode: "collapse",
		markSeenOnScroll: true,
		seenPluginIds: []
	};
	function storageGet(key, defaultValue) {
		try {
			if (typeof GM_getValue === "function") return GM_getValue(key, defaultValue);
		} catch {}
		try {
			if (typeof localStorage !== "undefined") {
				const item = localStorage.getItem(key);
				if (item !== null) return JSON.parse(item);
			}
		} catch {}
		return defaultValue;
	}
	function storageSet(key, value) {
		try {
			if (typeof GM_setValue === "function") {
				GM_setValue(key, value);
				return;
			}
		} catch {}
		try {
			if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(value));
		} catch {}
	}
	var StorageManager = class {
		settings;
		seenSet;
		listeners = new Set();
		constructor() {
			const rawSettings = storageGet(SETTINGS_KEY, {});
			let seenMode = "collapse";
			if (rawSettings.seenMode === "dim" || rawSettings.seenMode === "collapse" || rawSettings.seenMode === "off") seenMode = rawSettings.seenMode;
			else if (rawSettings.dimSeenEnabled === false) seenMode = "off";
			this.settings = {
				autoPagerEnabled: typeof rawSettings.autoPagerEnabled === "boolean" ? rawSettings.autoPagerEnabled : DEFAULT_SETTINGS.autoPagerEnabled,
				seenMode,
				markSeenOnScroll: typeof rawSettings.markSeenOnScroll === "boolean" ? rawSettings.markSeenOnScroll : DEFAULT_SETTINGS.markSeenOnScroll,
				seenPluginIds: []
			};
			const storedSeen = storageGet(SEEN_PLUGINS_KEY, []);
			this.seenSet = new Set(storedSeen);
		}
		getSettings() {
			return {
				...this.settings,
				seenPluginIds: Array.from(this.seenSet)
			};
		}
		updateSettings(partial) {
			this.settings = {
				...this.settings,
				...partial
			};
			storageSet(SETTINGS_KEY, {
				autoPagerEnabled: this.settings.autoPagerEnabled,
				seenMode: this.settings.seenMode,
				markSeenOnScroll: this.settings.markSeenOnScroll
			});
			this.notify();
		}
		isPluginSeen(id) {
			return this.seenSet.has(id);
		}
		markPluginSeen(id) {
			if (!id || this.seenSet.has(id)) return false;
			this.seenSet.add(id);
			this.persistSeen();
			return true;
		}
		unmarkPluginSeen(id) {
			if (!id || !this.seenSet.has(id)) return false;
			this.seenSet.delete(id);
			this.persistSeen();
			return true;
		}
		clearSeenPlugins() {
			this.seenSet.clear();
			this.persistSeen();
		}
		getSeenCount() {
			return this.seenSet.size;
		}
		onSettingsChange(callback) {
			this.listeners.add(callback);
			return () => this.listeners.delete(callback);
		}
		persistSeen() {
			storageSet(SEEN_PLUGINS_KEY, Array.from(this.seenSet));
			this.notify();
		}
		notify() {
			const current = this.getSettings();
			for (const listener of this.listeners) try {
				listener(current);
			} catch (err) {
				console.error("[Omarchy Enhancer] Listener error:", err);
			}
		}
	};
	var storage = new StorageManager();
	var ICONS = {
		github: `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
  </svg>`,
		eye: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`,
		eyeOff: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>`,
		strip: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="4" rx="1"></rect>
    <rect x="3" y="10" width="18" height="4" rx="1"></rect>
    <rect x="3" y="16" width="18" height="4" rx="1"></rect>
  </svg>`,
		bolt: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="m13 2-9 13h7l-1 7 9-13h-7l1-7z"></path>
  </svg>`,
		check: `<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
  </svg>`,
		trash: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>`,
		settings: `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>`,
		close: `<svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`
	};
	function enhanceCard(card) {
		const pluginId = card.getAttribute("data-card-plugin");
		if (!pluginId) return;
		const isSeen = storage.isPluginSeen(pluginId);
		if (card.hasAttribute("data-ope-enhanced")) {
			updateCardSeenVisuals(card, isSeen);
			return;
		}
		card.setAttribute("data-ope-enhanced", "true");
		card.classList.add("ope-enhanced");
		const actionsContainer = card.querySelector(".plugin-card-actions");
		if (actionsContainer && !actionsContainer.querySelector(".ope-github-btn")) {
			const repoUrl = catalogService.getPluginRepo(pluginId);
			if (repoUrl) {
				const ghBtn = document.createElement("a");
				ghBtn.className = "ope-github-btn";
				ghBtn.href = repoUrl;
				ghBtn.target = "_blank";
				ghBtn.rel = "noopener noreferrer";
				ghBtn.title = `GitHub: ${repoUrl}`;
				ghBtn.setAttribute("aria-label", `View GitHub repository for ${pluginId}`);
				ghBtn.innerHTML = ICONS.github;
				ghBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					storage.markPluginSeen(pluginId);
					updateCardSeenVisuals(card, true);
				});
				actionsContainer.appendChild(ghBtn);
			}
		}
		const titleLine = card.querySelector(".plugin-title-line");
		if (titleLine && !titleLine.querySelector(".ope-seen-badge")) {
			const seenBadge = document.createElement("button");
			seenBadge.type = "button";
			seenBadge.className = "ope-seen-badge";
			seenBadge.setAttribute("aria-label", `Toggle seen state for ${pluginId}`);
			seenBadge.addEventListener("click", (e) => {
				e.stopPropagation();
				e.preventDefault();
				if (storage.isPluginSeen(pluginId)) {
					storage.unmarkPluginSeen(pluginId);
					updateCardSeenVisuals(card, false);
				} else {
					storage.markPluginSeen(pluginId);
					updateCardSeenVisuals(card, true);
				}
			});
			titleLine.appendChild(seenBadge);
		}
		const cardLink = card.querySelector(".plugin-card-link");
		if (cardLink && !cardLink.hasAttribute("data-ope-listener")) {
			cardLink.setAttribute("data-ope-listener", "true");
			cardLink.addEventListener("click", () => {
				storage.markPluginSeen(pluginId);
				updateCardSeenVisuals(card, true);
			});
		}
		const installBtn = card.querySelector(".card-install");
		if (installBtn && !installBtn.hasAttribute("data-ope-listener")) {
			installBtn.setAttribute("data-ope-listener", "true");
			installBtn.addEventListener("click", () => {
				storage.markPluginSeen(pluginId);
				updateCardSeenVisuals(card, true);
			});
		}
		updateCardSeenVisuals(card, isSeen);
	}
	function updateCardSeenVisuals(card, isSeen) {
		card.classList.toggle("ope-seen", isSeen);
		card.setAttribute("data-ope-seen", isSeen ? "true" : "false");
		const badge = card.querySelector(".ope-seen-badge");
		if (badge) {
			badge.classList.toggle("is-seen", isSeen);
			badge.title = isSeen ? "Seen (click to unmark)" : "Mark as seen";
			badge.innerHTML = isSeen ? ICONS.check : ICONS.eye;
		}
	}
	function enhanceAllCards() {
		const cards = document.querySelectorAll(".plugin-card");
		for (const card of cards) enhanceCard(card);
	}
	var SeenObserver = class {
		observer = null;
		scrollListener = null;
		scrollRaf = 0;
		constructor() {
			this.initObserver();
			storage.onSettingsChange((settings) => {
				if (!settings.markSeenOnScroll) this.disconnect();
				else if (!this.observer) {
					this.initObserver();
					this.observeAll();
				}
			});
		}
		initObserver() {
			if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
			const enteredViewport = new WeakSet();
			this.observer = new IntersectionObserver((entries) => {
				if (!storage.getSettings().markSeenOnScroll) return;
				for (const entry of entries) {
					const card = entry.target;
					const pluginId = card.getAttribute("data-card-plugin");
					if (!pluginId || storage.isPluginSeen(pluginId)) {
						if (this.observer) this.observer.unobserve(card);
						continue;
					}
					if (entry.isIntersecting) enteredViewport.add(card);
					else if (enteredViewport.has(card) && entry.boundingClientRect.top < 0) {
						storage.markPluginSeen(pluginId);
						updateCardSeenVisuals(card, true);
						enteredViewport.delete(card);
						if (this.observer) this.observer.unobserve(card);
					}
				}
			}, {
				rootMargin: "160px 0px 0px 0px",
				threshold: 0
			});
			this.setupScrollCheck(enteredViewport);
		}
		setupScrollCheck(enteredViewport) {
			if (typeof window === "undefined") return;
			this.scrollListener = () => {
				if (this.scrollRaf) return;
				this.scrollRaf = window.requestAnimationFrame(() => {
					this.scrollRaf = 0;
					if (!storage.getSettings().markSeenOnScroll) return;
					const cards = document.querySelectorAll(".plugin-card:not(.ope-seen)");
					for (const card of cards) {
						const pluginId = card.getAttribute("data-card-plugin");
						if (!pluginId || storage.isPluginSeen(pluginId)) continue;
						const rect = card.getBoundingClientRect();
						if (enteredViewport.has(card) && rect.bottom < -120) {
							storage.markPluginSeen(pluginId);
							updateCardSeenVisuals(card, true);
							enteredViewport.delete(card);
							if (this.observer) this.observer.unobserve(card);
						}
					}
				});
			};
			window.addEventListener("scroll", this.scrollListener, { passive: true });
		}
		observe(card) {
			if (!this.observer) return;
			const pluginId = card.getAttribute("data-card-plugin");
			if (!pluginId || storage.isPluginSeen(pluginId)) return;
			this.observer.observe(card);
		}
		observeAll() {
			if (!this.observer) return;
			const cards = document.querySelectorAll(".plugin-card:not(.ope-seen)");
			for (const card of cards) this.observe(card);
		}
		disconnect() {
			if (this.scrollListener) {
				window.removeEventListener("scroll", this.scrollListener);
				this.scrollListener = null;
			}
			if (this.scrollRaf) {
				window.cancelAnimationFrame(this.scrollRaf);
				this.scrollRaf = 0;
			}
			if (this.observer) {
				this.observer.disconnect();
				this.observer = null;
			}
		}
	};
	var seenObserver = new SeenObserver();
	var AutoPager = class {
		sentinel = null;
		observer = null;
		isAutoPaging = false;
		cooldownTimer = 0;
		constructor() {
			this.setupSentinel();
			this.initObserver();
			storage.onSettingsChange((settings) => {
				if (settings.autoPagerEnabled) this.reobserve();
				else this.unobserve();
			});
		}
		setupSentinel() {
			if (typeof document === "undefined") return;
			const pagination = document.querySelector("#catalog-pagination");
			if (!pagination) return;
			let sentinel = document.querySelector("#ope-sentinel");
			if (!sentinel) {
				sentinel = document.createElement("div");
				sentinel.id = "ope-sentinel";
				pagination.before(sentinel);
			}
			this.sentinel = sentinel;
		}
		initObserver() {
			if (typeof IntersectionObserver === "undefined") return;
			if (this.observer) this.observer.disconnect();
			this.observer = new IntersectionObserver((entries) => {
				if (!storage.getSettings().autoPagerEnabled) return;
				for (const entry of entries) if (entry.isIntersecting) this.triggerNextPage();
			}, {
				root: null,
				rootMargin: "450px",
				threshold: 0
			});
			if (this.sentinel) this.observer.observe(this.sentinel);
		}
		triggerNextPage() {
			if (this.isAutoPaging) return;
			const nextBtn = document.querySelector("#page-next");
			const grid = document.querySelector("#plugin-grid");
			if (!nextBtn || nextBtn.disabled || !grid) return;
			this.isAutoPaging = true;
			try {
				const existingCards = Array.from(grid.querySelectorAll(":scope > .plugin-card"));
				const originalScrollIntoView = grid.scrollIntoView;
				grid.scrollIntoView = () => {};
				nextBtn.click();
				const newCardIds = new Set(Array.from(grid.querySelectorAll(":scope > .plugin-card")).map((c) => c.getAttribute("data-card-plugin")).filter(Boolean));
				const cardsToPrepend = existingCards.filter((c) => !newCardIds.has(c.getAttribute("data-card-plugin")));
				if (cardsToPrepend.length > 0) grid.prepend(...cardsToPrepend);
				grid.scrollIntoView = originalScrollIntoView;
				enhanceAllCards();
				seenObserver.observeAll();
			} catch (err) {
				console.error("[Omarchy Enhancer] Error in AutoPager:", err);
			} finally {
				if (this.cooldownTimer) window.clearTimeout(this.cooldownTimer);
				this.cooldownTimer = window.setTimeout(() => {
					this.isAutoPaging = false;
				}, 350);
			}
		}
		reobserve() {
			this.setupSentinel();
			if (this.observer && this.sentinel) {
				this.observer.unobserve(this.sentinel);
				this.observer.observe(this.sentinel);
			}
		}
		unobserve() {
			if (this.observer && this.sentinel) this.observer.unobserve(this.sentinel);
		}
		destroy() {
			this.unobserve();
			if (this.observer) {
				this.observer.disconnect();
				this.observer = null;
			}
			if (this.sentinel) {
				this.sentinel.remove();
				this.sentinel = null;
			}
		}
	};
	var autoPager = new AutoPager();
	var STYLES = `
/* Omarchy Plugins Enhancer — Brutalist Architecture */

/* GitHub Button on Card (Sharp, Icon-only, Zero Radius, Technical Border) */
.ope-github-btn {
  position: relative;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 25px;
  height: 25px;
  width: 25px;
  padding: 0;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  box-sizing: border-box;
  cursor: pointer;
  text-decoration: none;
  transition: color 100ms ease, border-color 100ms ease, background-color 100ms ease;
}

.ope-github-btn:hover,
.ope-github-btn:focus-visible {
  color: var(--text, #fff);
  border-color: var(--card-accent, var(--accent, #a78bfa));
  background: var(--panel-2, #101012);
}

.ope-github-btn svg {
  width: 13px;
  height: 13px;
  fill: currentColor;
  flex-shrink: 0;
}

/* Seen Toggle Badge on Card (Sharp Square Technical Tag) */
.ope-seen-badge {
  position: relative;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--bg, #000);
  color: var(--faint, #64748b);
  cursor: pointer;
  transition: all 100ms ease;
}

.ope-seen-badge:hover {
  color: var(--accent, #a78bfa);
  border-color: var(--accent, #a78bfa);
  background: var(--panel, #0b0b0d);
}

.ope-seen-badge.is-seen {
  color: var(--accent, #a78bfa);
  border-color: var(--line-strong, #3a3a3f);
  background: var(--panel, #0b0b0d);
}

/* MODE 1: GREY OUT (DIM) */
.ope-mode-dim .plugin-card.ope-seen {
  opacity: 0.35;
  filter: grayscale(0.9);
  transition: opacity 150ms ease, filter 150ms ease, border-color 100ms ease;
}

.ope-mode-dim .plugin-card.ope-seen:hover,
.ope-mode-dim .plugin-card.ope-seen:focus-within {
  opacity: 1;
  filter: none;
  border-color: var(--line-strong, #3a3a3f);
}

/* MODE 2: HIDE (COMPACT BRUTALIST CARD SHOWING TITLE, FULL DESCRIPTION IN MICRO MONOSPACE, STATS & GITHUB) */
.ope-mode-collapse .plugin-card.ope-seen {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  min-height: 0 !important;
  height: auto !important;
  align-self: start !important;
  padding: 10px 12px !important;
  box-sizing: border-box !important;
  background: var(--panel, #0b0b0d) !important;
  border: 1px solid var(--line, #28282c) !important;
  border-radius: 0 !important;
  gap: 6px !important;
  opacity: 0.75 !important;
  transition: opacity 120ms ease, border-color 120ms ease, background-color 120ms ease !important;
}

.ope-mode-collapse .plugin-card.ope-seen:hover,
.ope-mode-collapse .plugin-card.ope-seen:focus-within {
  opacity: 1 !important;
  border-color: var(--card-accent, var(--accent, #a78bfa)) !important;
  background: var(--panel-2, #101012) !important;
}

/* In collapsed mode: hide large preview, status lines, tags, author, install copy button, and extra cards */
.ope-mode-collapse .plugin-card.ope-seen .plugin-preview,
.ope-mode-collapse .plugin-card.ope-seen .card-status-line,
.ope-mode-collapse .plugin-card.ope-seen .plugin-tags,
.ope-mode-collapse .plugin-card.ope-seen .plugin-author,
.ope-mode-collapse .plugin-card.ope-seen .card-install,
.ope-mode-collapse .plugin-card.ope-seen .card-states,
.ope-mode-collapse .plugin-card.ope-seen .card-verification {
  display: none !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-body {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  gap: 6px !important;
  min-width: 0 !important;
  min-height: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-content {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  width: 100% !important;
  min-width: 0 !important;
}

/* Single Header Row: Title on left, [Social Stars/Hearts] + [Seen Badge] on right */
.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line {
  position: relative !important;
  z-index: 4 !important;
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 100% !important;
  padding: 0 !important;
  padding-right: 0 !important;
  margin: 0 !important;
  gap: 6px !important;
  min-height: 24px !important;
  flex-wrap: nowrap !important;
}

.ope-mode-collapse .plugin-card.ope-seen.built-in-card .plugin-title-line {
  padding-right: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line h3 {
  font-family: var(--mono, monospace) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  margin: 0 !important;
  color: var(--text, #fff) !important;
  flex: 0 1 auto !important;
  min-width: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line .status-badge,
.ope-mode-collapse .plugin-card.ope-seen .plugin-title-line .builtin-badge {
  flex-shrink: 0 !important;
  margin: 0 !important;
}

/* De-absolute .card-social so it flows naturally in header without overlapping description */
.ope-mode-collapse .plugin-card.ope-seen .card-social {
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  z-index: 4 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  height: 22px !important;
  margin: 0 !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .card-stars,
.ope-mode-collapse .plugin-card.ope-seen .plugin-heart {
  height: 22px !important;
  min-height: 22px !important;
  width: auto !important;
  min-width: 44px !important;
  padding: 0 5px !important;
  border: 1px solid var(--line-strong, #3a3a3f) !important;
  border-radius: 0 !important;
  font-family: var(--mono, monospace) !important;
  font-size: 10px !important;
  font-weight: 650 !important;
  line-height: 1 !important;
  box-sizing: border-box !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
}

/* Seen toggle badge in header: right-aligned if alone, adjacent if next to social */
.ope-mode-collapse .plugin-card.ope-seen .ope-seen-badge {
  position: relative !important;
  z-index: 4 !important;
  height: 22px !important;
  width: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.ope-mode-collapse .plugin-card.ope-seen .card-social ~ .ope-seen-badge {
  margin-left: 0 !important;
}

/* Full description in smaller monospace font (8.5px), completely visible, no truncation */
.ope-mode-collapse .plugin-card.ope-seen .plugin-description,
.ope-mode-collapse .plugin-card.ope-seen .plugin-card-body .plugin-description {
  display: block !important;
  position: relative !important;
  z-index: 2 !important;
  font-family: var(--mono, monospace) !important;
  font-size: 8.5px !important;
  line-height: 1.4 !important;
  letter-spacing: 0.01em !important;
  color: var(--muted, #94a3b8) !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  min-height: 0 !important;
  max-height: none !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  text-wrap: pretty !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-bottom {
  position: relative !important;
  z-index: 4 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  margin-top: 2px !important;
  padding-top: 6px !important;
  border-top: 1px solid var(--line-soft, #1c1c20) !important;
  width: 100% !important;
}

.ope-mode-collapse .plugin-card.ope-seen .plugin-card-actions {
  min-height: 25px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

/* Auto Pager Sentinel */
#ope-sentinel {
  display: block;
  width: 100%;
  height: 2px;
  margin: 0;
  padding: 0;
  pointer-events: none;
  visibility: hidden;
}

/* Brutalist Floating HUD / Control Unit (Single Sharp Border, No Double Shadow) */
.ope-toolbar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 0 !important;
  background: var(--bg, #000);
  border: 1px solid var(--line-strong, #3a3a3f);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
  font-family: var(--mono, ui-monospace, SFMono-Regular, monospace);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text, #e2e8f0);
  user-select: none;
  box-sizing: border-box;
}

/* When collapsed by default, only show the trigger button cleanly */
.ope-toolbar.collapsed {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.ope-toolbar.collapsed .ope-toolbar-body {
  display: none;
}

.ope-toolbar-body {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ope-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 100ms ease;
}

.ope-btn:hover {
  color: var(--text, #fff);
  border-color: var(--muted, #94a3b8);
  background: var(--panel-2, #101012);
}

.ope-btn.active {
  background: var(--panel-2, #101012);
  color: var(--accent, #a78bfa);
  border-color: var(--accent, #a78bfa);
}

.ope-mode-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  overflow: hidden;
  height: 28px;
}

.ope-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 100%;
  padding: 0 8px;
  border: none;
  border-right: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 100ms ease;
}

.ope-mode-btn:last-child {
  border-right: none;
}

.ope-mode-btn:hover {
  color: var(--text, #fff);
  background: var(--panel-2, #101012);
}

.ope-mode-btn.active {
  background: #15131f;
  color: var(--accent, #a78bfa);
}

.ope-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line, #28282c);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--faint, #64748b);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 100ms ease;
}

.ope-clear-btn:hover {
  color: #ff5c57;
  border-color: #ff5c57;
  background: #1c0f11;
}

.ope-collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line-strong, #3a3a3f);
  border-radius: 0 !important;
  background: var(--panel, #0b0b0d);
  color: var(--muted, #94a3b8);
  cursor: pointer;
  padding: 0;
  box-sizing: border-box;
  transition: all 100ms ease;
}

.ope-collapse-btn:hover {
  color: var(--text, #fff);
  border-color: var(--muted, #94a3b8);
  background: var(--panel-2, #101012);
}
`;
	var Toolbar = class {
		container = null;
		isCollapsed = true;
		constructor() {
			this.createToolbar();
			this.syncWithSettings();
			storage.onSettingsChange(() => {
				this.syncWithSettings();
			});
		}
		createToolbar() {
			if (typeof document === "undefined") return;
			if (document.querySelector(".ope-toolbar")) return;
			const toolbar = document.createElement("div");
			toolbar.className = "ope-toolbar collapsed";
			toolbar.setAttribute("role", "region");
			toolbar.setAttribute("aria-label", "Catalog Enhancer Controls");
			toolbar.innerHTML = `
      <div class="ope-toolbar-body">
        <button type="button" class="ope-btn" id="ope-toggle-autopager" title="Toggle Auto Pager">
          ${ICONS.bolt} <span class="ope-label">Auto Pager</span>
        </button>

        <div class="ope-mode-group" role="group" aria-label="Seen Mode">
          <button type="button" class="ope-mode-btn" data-mode="dim" title="Grey out seen plugins">
            ${ICONS.eye} <span>Dim</span>
          </button>
          <button type="button" class="ope-mode-btn" data-mode="collapse" title="Collapse seen plugins to strip">
            ${ICONS.strip} <span>Hide</span>
          </button>
          <button type="button" class="ope-mode-btn" data-mode="off" title="Do not alter seen plugins">
            ${ICONS.eyeOff} <span>Off</span>
          </button>
        </div>

        <button type="button" class="ope-clear-btn" id="ope-clear-seen" title="Reset seen plugins history">
          ${ICONS.trash} <span id="ope-seen-count">0</span>
        </button>
      </div>

      <button type="button" class="ope-collapse-btn" id="ope-collapse-toggle" title="Expand Controls">
        ${ICONS.settings}
      </button>
    `;
			document.body.appendChild(toolbar);
			this.container = toolbar;
			toolbar.querySelector("#ope-toggle-autopager")?.addEventListener("click", () => {
				const current = storage.getSettings().autoPagerEnabled;
				storage.updateSettings({ autoPagerEnabled: !current });
			});
			const modeButtons = toolbar.querySelectorAll(".ope-mode-btn");
			for (const btn of modeButtons) btn.addEventListener("click", () => {
				const mode = btn.dataset.mode;
				if (mode) storage.updateSettings({ seenMode: mode });
			});
			toolbar.querySelector("#ope-clear-seen")?.addEventListener("click", () => {
				const count = storage.getSeenCount();
				if (count === 0) return;
				if (window.confirm(`Reset ${count} seen plugin${count > 1 ? "s" : ""}?`)) {
					storage.clearSeenPlugins();
					const cards = document.querySelectorAll(".plugin-card.ope-seen");
					for (const card of cards) {
						card.classList.remove("ope-seen");
						card.removeAttribute("data-ope-seen");
						const badge = card.querySelector(".ope-seen-badge");
						if (badge) {
							badge.classList.remove("is-seen");
							badge.innerHTML = ICONS.eye;
						}
					}
				}
			});
			const collapseBtn = toolbar.querySelector("#ope-collapse-toggle");
			collapseBtn?.addEventListener("click", () => {
				this.isCollapsed = !this.isCollapsed;
				toolbar.classList.toggle("collapsed", this.isCollapsed);
				collapseBtn.title = this.isCollapsed ? "Expand Controls" : "Collapse Controls";
			});
		}
		syncWithSettings() {
			if (!this.container) return;
			const settings = storage.getSettings();
			document.documentElement.classList.toggle("ope-mode-dim", settings.seenMode === "dim");
			document.documentElement.classList.toggle("ope-mode-collapse", settings.seenMode === "collapse");
			const autoPagerBtn = this.container.querySelector("#ope-toggle-autopager");
			if (autoPagerBtn) autoPagerBtn.classList.toggle("active", settings.autoPagerEnabled);
			const modeButtons = this.container.querySelectorAll(".ope-mode-btn");
			for (const btn of modeButtons) btn.classList.toggle("active", btn.dataset.mode === settings.seenMode);
			const countSpan = this.container.querySelector("#ope-seen-count");
			if (countSpan) {
				const count = storage.getSeenCount();
				countSpan.textContent = String(count);
			}
		}
		destroy() {
			if (this.container) {
				this.container.remove();
				this.container = null;
			}
		}
	};
	function injectStyles() {
		try {
			if (typeof GM_addStyle === "function") {
				GM_addStyle(STYLES);
				return;
			}
		} catch {}
		const styleEl = document.createElement("style");
		styleEl.id = "ope-custom-styles";
		styleEl.textContent = STYLES;
		(document.head || document.documentElement).appendChild(styleEl);
	}
	function handleDetailPage() {
		try {
			const pluginId = new URLSearchParams(window.location.search).get("id");
			if (pluginId) storage.markPluginSeen(pluginId);
		} catch {}
	}
	function setupMutationObserver() {
		let debounceTimer = 0;
		new MutationObserver((mutations) => {
			let hasCardChanges = false;
			for (const mutation of mutations) {
				if (mutation.type === "childList") {
					for (const node of mutation.addedNodes) if (node instanceof HTMLElement) {
						if (node.classList.contains("plugin-card") || node.querySelector(".plugin-card")) {
							hasCardChanges = true;
							break;
						}
					}
				}
				if (hasCardChanges) break;
			}
			if (hasCardChanges) {
				if (debounceTimer) window.clearTimeout(debounceTimer);
				debounceTimer = window.setTimeout(() => {
					enhanceAllCards();
					seenObserver.observeAll();
					autoPager.setupSentinel();
				}, 50);
			}
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	function init() {
		injectStyles();
		const settings = storage.getSettings();
		document.documentElement.classList.toggle("ope-mode-dim", settings.seenMode === "dim");
		document.documentElement.classList.toggle("ope-mode-collapse", settings.seenMode === "collapse");
		handleDetailPage();
		setupMutationObserver();
		enhanceAllCards();
		seenObserver.observeAll();
		autoPager.setupSentinel();
		autoPager.initObserver();
		new Toolbar();
		catalogService.getCatalog().then(() => {
			enhanceAllCards();
		}).catch((err) => {
			console.warn("[Omarchy Enhancer] Catalog resolution error:", err);
		});
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init());
	else init();
})();
