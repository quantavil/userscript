// ==UserScript==
// @name         Better AlternativeTo
// @namespace    https://github.com/quantavil/userscript/
// @version      1.1.0
// @author       quantavil
// @description  Shows website/GitHub/app-store/social links straight on the cards, pins a compact filter bar with search + likes range, and puts dark mode in the header.
// @license      MIT
// @match        *://*.alternativeto.net/*
// ==/UserScript==

(function() {
	"use strict";
	var EXTERNAL_LINKS = /"externalLinks":(\[[^\]]*\])/;
	function extractLinks(rsc) {
		const m = rsc.match(EXTERNAL_LINKS);
		if (!m) return [];
		try {
			return JSON.parse(m[1]).filter((l) => Boolean(l && l.url && l.type));
		} catch {
			return [];
		}
	}
	function slugFromHref(href) {
		const m = /\/software\/([^/?#]+)/.exec(href ?? "");
		return m ? m[1] : null;
	}
	function parseLikes(text) {
		const m = /(\d[\d,]*)/.exec(text ?? "");
		return m ? Number(m[1].replace(/,/g, "")) : 0;
	}
	var EMPTY_FILTER = {
		query: "",
		minLikes: 0,
		maxLikes: NaN,
		needsSource: false,
		needsOfficial: false
	};
	function isFilterActive(f) {
		return f.query !== "" || f.minLikes > 0 || !Number.isNaN(f.maxLikes) || f.needsSource || f.needsOfficial;
	}
	function matchesFilter(card, f) {
		if (f.query) {
			const hay = `${card.title} ${card.description}`.toLowerCase();
			for (const term of f.query.toLowerCase().split(/\s+/)) if (term && !hay.includes(term)) return false;
		}
		if (card.likes < f.minLikes) return false;
		if (!Number.isNaN(f.maxLikes) && card.likes > f.maxLikes) return false;
		if (f.needsSource || f.needsOfficial) {
			if (!card.links) return true;
			if (f.needsSource && !card.links.some((l) => l.type === "Source")) return false;
			if (f.needsOfficial && !card.links.some((l) => l.type === "Official")) return false;
		}
		return true;
	}
	var FACET_LABELS = {
		category: "Category",
		platform: "Platform",
		license: "License",
		"license-opensource": "Licensing",
		cost: "Cost",
		feature: "Feature",
		"feature-app-types": "App Type",
		"feature-properties": "Property",
		property: "Property",
		origin: "Origin",
		tag: "Tag",
		sort: "Sort",
		other: "Other",
		q: "Search"
	};
	function activeFacets(search) {
		const out = [];
		for (const [key, value] of new URLSearchParams(search)) {
			if (key === "p" || key === "page" || !value) continue;
			out.push({
				key,
				value,
				label: FACET_LABELS[key] ?? key
			});
		}
		return out;
	}
	function urlWithoutFacet(href, key, value) {
		const url = new URL(href);
		const kept = [...url.searchParams.entries()].filter(([k, v]) => !(k === key && v === value));
		url.search = new URLSearchParams(kept).toString();
		url.searchParams.delete("p");
		url.searchParams.delete("page");
		return url.toString();
	}
	var CACHE_PREFIX = "bat:links:";
	var CACHE_TTL_MS = 6048e5;
	var MAX_CONCURRENT = 4;
	function readCache(slug) {
		try {
			const raw = localStorage.getItem(CACHE_PREFIX + slug);
			if (!raw) return null;
			const entry = JSON.parse(raw);
			if (Date.now() - entry.t > CACHE_TTL_MS) {
				localStorage.removeItem(CACHE_PREFIX + slug);
				return null;
			}
			return entry.l;
		} catch {
			return null;
		}
	}
	function writeCache(slug, links) {
		try {
			localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({
				t: Date.now(),
				l: links
			}));
		} catch {}
	}
	var inflight = new Map();
	var queue = [];
	var running = 0;
	function pump() {
		while (running < MAX_CONCURRENT && queue.length) {
			running++;
			queue.shift()();
		}
	}
	async function fetchLinks(slug) {
		const res = await fetch(`/software/${slug}/about/`, {
			headers: { RSC: "1" },
			credentials: "same-origin"
		});
		if (!res.ok) throw new Error(`${res.status} for ${slug}`);
		return extractLinks(await res.text());
	}
	function getLinks(slug) {
		const cached = readCache(slug);
		if (cached) return Promise.resolve(cached);
		const existing = inflight.get(slug);
		if (existing) return existing;
		const promise = new Promise((resolve) => {
			queue.push(() => {
				fetchLinks(slug).then((links) => {
					writeCache(slug, links);
					resolve(links);
				}).catch(() => resolve([])).finally(() => {
					running--;
					inflight.delete(slug);
					pump();
				});
			});
			pump();
		});
		inflight.set(slug, promise);
		return promise;
	}
	var TYPE_ORDER = [
		"Official",
		"Source",
		"Appstore",
		"Social"
	];
	function shortLabel(link) {
		if (link.type === "Official") return "Website";
		return link.name.replace(/\s*(App\s*)?Store\b/i, "").replace(/\s*Repository\b/i, "").replace(/\s*Platform\b/i, "").trim() || link.name;
	}
	function renderLinkRow(links) {
		const row = document.createElement("div");
		row.className = "bat-links";
		if (!links.length) {
			row.classList.add("bat-links-empty");
			row.textContent = "No external links listed";
			return row;
		}
		const sorted = [...links].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
		for (const link of sorted) {
			const a = document.createElement("a");
			a.className = `bat-chip bat-chip-${link.type.toLowerCase()}`;
			a.href = link.url;
			a.target = "_blank";
			a.rel = "nofollow noopener noreferrer";
			a.title = `${link.name} — ${link.url}`;
			a.textContent = shortLabel(link);
			row.append(a);
		}
		return row;
	}
	function el(tag, props = {}, children = []) {
		const node = Object.assign(document.createElement(tag), props);
		node.append(...children);
		return node;
	}
	function panelExists() {
		return Boolean(document.querySelector("[data-testid=\"app-filter-bar\"]"));
	}
	function expandSitePanel() {
		const btn = document.querySelector("[data-testid=\"popular-filters\"] button[aria-label=\"Show all filters\"]") ?? document.querySelector("[data-testid=\"popular-filters\"] button") ?? document.querySelector("button[aria-label=\"Show all filters\"]");
		if (btn) {
			btn.click();
			return;
		}
		document.querySelector("[data-testid=\"app-filter-bar-wrapper\"] span.cursor-pointer")?.click();
	}
	var STORE = "bat:filter";
	function loadFilter() {
		try {
			const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "");
			return {
				...EMPTY_FILTER,
				...saved,
				maxLikes: saved.maxLikes ?? NaN
			};
		} catch {
			return { ...EMPTY_FILTER };
		}
	}
	function saveFilter(filter) {
		try {
			sessionStorage.setItem(STORE, JSON.stringify(filter));
		} catch {}
	}
	var currentBar = null;
	var currentFiltersBtn = null;
	function closePanel() {
		document.documentElement.classList.remove("bat-panel-open");
		currentFiltersBtn?.setAttribute("aria-expanded", "false");
	}
	document.addEventListener("click", (event) => {
		if (!document.documentElement.classList.contains("bat-panel-open")) return;
		const target = event.target;
		if (currentBar?.contains(target)) return;
		if ((document.querySelector("[data-testid=\"app-filter-bar-wrapper\"]")?.closest("nav"))?.contains(target)) {
			if (target.closest?.("button[aria-label=\"Hide all filters\"], [role=\"button\"][aria-label=\"Hide all filters\"], span.cursor-pointer")) closePanel();
			return;
		}
		closePanel();
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closePanel();
	});
	function measure() {
		const header = document.querySelector("header");
		const top = header && getComputedStyle(header).position === "sticky" ? header.offsetHeight : 0;
		document.documentElement.style.setProperty("--bat-top", `${top}px`);
	}
	window.addEventListener("resize", measure, { passive: true });
	function mountFilterBar(nav, hooks) {
		const filter = loadFilter();
		const search = el("input", {
			type: "search",
			className: "bat-search",
			placeholder: "Filter these apps by name or description…"
		});
		const minLikes = el("input", {
			type: "number",
			min: "0",
			placeholder: "min"
		});
		const maxLikes = el("input", {
			type: "number",
			min: "0",
			placeholder: "max"
		});
		search.setAttribute("aria-label", "Filter apps on this page");
		minLikes.setAttribute("aria-label", "Minimum likes");
		maxLikes.setAttribute("aria-label", "Maximum likes");
		search.value = filter.query;
		minLikes.value = filter.minLikes ? String(filter.minLikes) : "";
		maxLikes.value = Number.isNaN(filter.maxLikes) ? "" : String(filter.maxLikes);
		const srcToggle = el("button", {
			type: "button",
			className: "bat-toggle",
			textContent: "Has source"
		});
		const siteToggle = el("button", {
			type: "button",
			className: "bat-toggle",
			textContent: "Has website"
		});
		srcToggle.setAttribute("aria-pressed", String(filter.needsSource));
		siteToggle.setAttribute("aria-pressed", String(filter.needsOfficial));
		const filtersBtn = el("button", {
			type: "button",
			className: "bat-filters-btn",
			textContent: "Filters"
		});
		filtersBtn.setAttribute("aria-expanded", "false");
		filtersBtn.setAttribute("aria-label", "Toggle site filters panel");
		currentFiltersBtn = filtersBtn;
		const reset = el("button", {
			type: "button",
			className: "bat-reset",
			textContent: "Reset",
			hidden: true
		});
		const count = el("span", { className: "bat-count" });
		const chips = el("div", { className: "bat-chips" });
		const bar = el("div", { className: "bat-bar" }, [
			search,
			el("span", { className: "bat-likes" }, [
				minLikes,
				el("span", { textContent: "–" }),
				maxLikes
			]),
			siteToggle,
			srcToggle,
			filtersBtn,
			reset,
			count,
			chips
		]);
		function sync() {
			reset.hidden = !isFilterActive(filter);
			saveFilter(filter);
			hooks.apply(filter);
		}
		let debounce = 0;
		search.addEventListener("input", () => {
			clearTimeout(debounce);
			debounce = window.setTimeout(() => {
				filter.query = search.value.trim();
				sync();
			}, 140);
		});
		const readLikes = () => {
			filter.minLikes = Number(minLikes.value) || 0;
			filter.maxLikes = maxLikes.value === "" ? NaN : Number(maxLikes.value);
			sync();
		};
		minLikes.addEventListener("input", readLikes);
		maxLikes.addEventListener("input", readLikes);
		function wireToggle(button, key) {
			button.addEventListener("click", () => {
				filter[key] = !filter[key];
				button.setAttribute("aria-pressed", String(filter[key]));
				if (filter[key]) hooks.requestAllLinks();
				sync();
			});
		}
		wireToggle(srcToggle, "needsSource");
		wireToggle(siteToggle, "needsOfficial");
		reset.addEventListener("click", () => {
			Object.assign(filter, EMPTY_FILTER);
			search.value = "";
			minLikes.value = "";
			maxLikes.value = "";
			for (const [button, key] of [[srcToggle, "needsSource"], [siteToggle, "needsOfficial"]]) {
				filter[key] = false;
				button.setAttribute("aria-pressed", "false");
			}
			sync();
		});
		function revealPanel() {
			document.documentElement.classList.add("bat-panel-open");
			filtersBtn.setAttribute("aria-expanded", "true");
			const panel = document.querySelector("[data-testid=\"app-filter-bar\"]");
			if (!panel) return;
			const offset = (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bat-top")) || 0) + bar.offsetHeight + 10;
			const rect = panel.getBoundingClientRect();
			if (rect.top < offset || rect.top > window.innerHeight) {
				panel.scrollIntoView({
					block: "start",
					behavior: "smooth"
				});
				window.scrollBy({
					top: -offset,
					behavior: "smooth"
				});
			}
		}
		filtersBtn.addEventListener("click", (event) => {
			event.stopPropagation();
			if (document.documentElement.classList.contains("bat-panel-open") && panelExists()) {
				closePanel();
				return;
			}
			if (panelExists()) {
				revealPanel();
				return;
			}
			expandSitePanel();
			let tries = 0;
			const timer = window.setInterval(() => {
				if (panelExists() || ++tries > 20) {
					clearInterval(timer);
					if (panelExists()) revealPanel();
				}
			}, 50);
		});
		for (const facet of activeFacets(location.search)) chips.append(el("a", {
			className: "bat-facet",
			href: urlWithoutFacet(location.href, facet.key, facet.value),
			title: `Remove ${facet.label}: ${facet.value}`
		}, [el("b", { textContent: facet.label }), document.createTextNode(facet.value)]));
		nav.parentElement?.insertBefore(bar, nav);
		currentBar = bar;
		measure();
		sync();
		return {
			element: bar,
			setCount: (text) => {
				count.textContent = text;
			}
		};
	}
	var CSS = `
:root { --bat-top: 58px; }

/* ---------- links on cards ---------- */
.bat-links {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  margin-top: 6px;
  grid-column: 1 / -1;
}
.bat-links-empty {
  font-size: 0.78em;
  color: var(--meta, #888);
  font-style: italic;
}
.bat-links-pending {
  height: 20px;
  border-radius: 5px;
  width: 190px;
  background: var(--gray150, #eee);
  opacity: 0.6;
}
.bat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 0.76em;
  font-weight: 500;
  line-height: 1;
  text-decoration: none !important;
  white-space: nowrap;
  border: 1px solid transparent;
  transition: filter 0.12s ease, transform 0.12s ease;
}
.bat-chip:hover { filter: brightness(1.12); transform: translateY(-1px); }
.bat-chip::before { font-size: 1.05em; line-height: 1; }
.bat-chip-official {
  background: var(--positiveGreenerLight, #e3f6ee);
  color: var(--positiveGreenerDark, #04724d) !important;
  border-color: color-mix(in srgb, var(--positiveGreener, #0a8) 35%, transparent);
}
.bat-chip-official::before { content: "\\1F310"; }
.bat-chip-source {
  background: var(--gray200, #22252b);
  color: var(--mainFg, #eee) !important;
  border-color: var(--gray300, #2c2f35);
}
.bat-chip-source::before { content: "\\276F"; font-weight: 700; }
.bat-chip-appstore {
  background: var(--brandLight3, #e7f2fb);
  color: var(--linkColor, #0b6fb8) !important;
}
.bat-chip-appstore::before { content: "\\2B07"; }
.bat-chip-social {
  background: transparent;
  color: var(--meta, #888) !important;
  border-color: var(--gray300, #ccc);
}
.bat-chip-social::before { content: "\\1F4AC"; }

/* ----------- pinned compact filter bar -----------
   Everything below is keyed off the site's own data-testid attributes rather
   than classes added from JS: React owns className on these nodes and wipes
   anything this script adds on its next re-render. */
html.bat-on:not(.bat-panel-open) nav:has(> [data-testid="app-filter-bar-wrapper"]) {
  display: none !important;
}
html.bat-on.bat-panel-open nav:has(> [data-testid="app-filter-bar-wrapper"]) {
  position: static !important;
  z-index: auto !important;
  margin-bottom: 12px;
}
html.bat-on [data-testid="app-filter-bar-wrapper"] { display: none !important; }

.bat-bar {
  position: sticky;
  top: var(--bat-top);
  z-index: 12;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: var(--mainBg, #fff);
  border: 1px solid var(--gray300, #d8dde3);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--mainFg, #222);
}
.bat-bar input,
.bat-bar button {
  font: inherit;
  color: inherit;
  background: var(--gray50, #f6f8fa);
  border: 1px solid var(--gray300, #d8dde3);
  border-radius: 8px;
  height: 30px;
  padding: 0 9px;
  box-sizing: border-box;
}
.bat-bar input:focus-visible,
.bat-bar button:focus-visible { outline: 2px solid var(--linkColor, #0b6fb8); outline-offset: 1px; }
.bat-search { flex: 1 1 190px; min-width: 130px; }
.bat-likes { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.bat-likes::before { content: "\\2665"; color: #e0245e; }
.bat-likes input { width: 62px; text-align: center; padding: 0 4px; }
.bat-likes span { color: var(--meta, #888); }

.bat-toggle { cursor: pointer; white-space: nowrap; }
/* Fixed colours on purpose: --linkColor is a pale blue in dark mode, so white
   text on it was unreadable. This pair works against either theme. */
.bat-toggle[aria-pressed="true"] {
  background: #1665a8;
  border-color: #1665a8;
  color: #fff !important;
}
.bat-filters-btn { cursor: pointer; font-weight: 600; white-space: nowrap; }
.bat-filters-btn::after { content: " \\25BE"; }
html.bat-panel-open .bat-filters-btn::after { content: " \\25B4"; }
.bat-count { margin-left: auto; color: var(--meta, #888); white-space: nowrap; font-size: 0.9em; }
.bat-reset { cursor: pointer; }

.bat-chips { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
.bat-chips:empty { display: none; }
.bat-facet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 6px 0 9px;
  border-radius: 7px;
  font-size: 0.8em;
  background: var(--brandLight3, #e7f2fb);
  color: var(--linkColor, #0b6fb8);
  text-decoration: none !important;
}
.bat-facet b { font-weight: 600; }
.bat-facet::after { content: "\\2715"; opacity: 0.6; font-size: 1.05em; }
.bat-facet:hover::after { opacity: 1; }

/* The site's own facet panel, hidden at rest and shown untouched when opened —
   no box, no cap, no scroller: its native multi-column layout is the one that
   reads well, and constraining it only ever made it worse. */
html.bat-on:not(.bat-panel-open) [data-testid="app-filter-bar"] { display: none !important; }

/* An attribute, not a class — React rewrites className on the cards. */
[data-bat-hide] { display: none !important; }
.bat-empty-note {
  padding: 26px 14px;
  text-align: center;
  color: var(--meta, #888);
}

/* ---------- dark mode button in the header ---------- */
.bat-theme {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 0 4px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-size: 15px;
  line-height: 1;
  padding: 0;
}
.bat-theme:hover { background: rgba(255, 255, 255, 0.16); }

@media (max-width: 640px) {
  .bat-bar { gap: 6px; padding: 6px 10px; border-radius: 10px; }
  /* 16px or iOS zooms the whole page in when the field is focused. */
  .bat-bar input { font-size: 16px; }
  .bat-bar input, .bat-bar button { height: 34px; }
  .bat-search { flex-basis: 100%; min-width: 0; }
  .bat-likes { flex: 1 1 130px; }
  .bat-likes input { width: 100%; min-width: 0; }
  .bat-toggle, .bat-filters-btn { flex: 1 1 auto; }
  .bat-count { margin-left: 0; width: 100%; text-align: right; }
}
`;
	var bar = null;
	var cards = [];
	var filter = { ...EMPTY_FILTER };
	var lastUrl = location.href;
	function injectStyles() {
		if (document.getElementById("bat-style")) return;
		const style = document.createElement("style");
		style.id = "bat-style";
		style.textContent = CSS;
		(document.head ?? document.documentElement).append(style);
	}
	function currentTheme() {
		return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
	}
	function mountThemeButton() {
		const menuButton = document.querySelector("button[aria-label=\"Open page menu\"]");
		if (!menuButton || document.querySelector(".bat-theme")) return;
		const button = document.createElement("button");
		button.type = "button";
		button.className = "bat-theme";
		const paint = () => {
			const dark = currentTheme() === "dark";
			button.textContent = dark ? "☀" : "☾";
			button.title = dark ? "Switch to light mode" : "Switch to dark mode";
			button.setAttribute("aria-label", button.title);
		};
		paint();
		button.addEventListener("click", () => {
			const next = currentTheme() === "dark" ? "light" : "dark";
			document.documentElement.dataset.theme = next;
			try {
				localStorage.setItem("theme", next);
			} catch {}
			paint();
		});
		new MutationObserver(paint).observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"]
		});
		(menuButton.parentElement ?? menuButton).before(button);
	}
	var observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			observer.unobserve(entry.target);
			const card = cards.find((c) => c.el === entry.target);
			if (card) loadLinks(card);
		}
	}, { rootMargin: "300px 0px" });
	async function loadLinks(card) {
		const host = card.el.querySelector("[data-testid=\"main-app-info\"]") ?? card.el;
		if (card.data.links) {
			if (!card.el.querySelector(".bat-links")) host.append(renderLinkRow(card.data.links));
			return;
		}
		let placeholder = card.el.querySelector(".bat-links");
		if (!placeholder) {
			placeholder = document.createElement("div");
			placeholder.className = "bat-links bat-links-pending";
			host.append(placeholder);
		}
		const links = await getLinks(card.slug);
		card.data.links = links;
		if (placeholder.isConnected) placeholder.replaceWith(renderLinkRow(links));
		else host.append(renderLinkRow(links));
		applyFilter();
	}
	function cardSlug(el) {
		return slugFromHref(el.querySelector("a[href*=\"/software/\"]")?.getAttribute("href"));
	}
	function isStale(el) {
		const slug = cardSlug(el);
		return Boolean(slug) && el.dataset.bat !== slug;
	}
	function readCard(el) {
		const slug = cardSlug(el);
		if (!slug) return null;
		const info = el.querySelector("[data-testid=\"main-app-info\"]");
		const platforms = el.querySelector("[data-testid=\"platform-row\"]");
		const likesText = el.querySelector("#like-button-container")?.textContent ?? /\d[\d,]*\s+likes?/.exec(info?.textContent ?? "")?.[0];
		return {
			el,
			slug,
			data: {
				title: el.querySelector("h2")?.textContent?.trim() ?? "",
				description: `${info?.textContent ?? ""} ${platforms?.textContent ?? ""}`,
				likes: parseLikes(likesText)
			}
		};
	}
	function scanCards() {
		const previous = cards;
		cards = [];
		for (const el of document.querySelectorAll("[data-testid^=\"item-\"]")) {
			const card = readCard(el);
			if (!card) continue;
			if (el.dataset.bat === card.slug) {
				cards.push(previous.find((c) => c.el === el) ?? card);
				continue;
			}
			el.querySelector(".bat-links")?.remove();
			el.dataset.bat = card.slug;
			cards.push(card);
			observer.observe(el);
		}
	}
	function requestAllLinks() {
		for (const card of cards) loadLinks(card);
	}
	function siteCount() {
		const wrapper = document.querySelector("[data-testid=\"app-filter-bar-wrapper\"]");
		if (!wrapper) return "";
		for (const span of wrapper.querySelectorAll("span")) {
			if (span.children.length) continue;
			const text = span.textContent?.trim() ?? "";
			const m = /^(\d[\d,]*(\s*\/\s*\d[\d,]*)*)(\s+apps?)?$/.exec(text);
			if (m) return m[3] ? text.replace(/\s+/g, " ") : `${m[1]} apps`;
		}
		return "";
	}
	function applyFilter() {
		let visible = 0;
		for (const card of cards) {
			const show = matchesFilter(card.data, filter);
			card.el.toggleAttribute("data-bat-hide", !show);
			if (show) visible++;
		}
		const filtering = isFilterActive(filter);
		bar?.setCount(filtering ? `${visible} of ${cards.length} on this page` : siteCount());
		let note = document.querySelector(".bat-empty-note");
		if (filtering && visible === 0 && cards.length) {
			if (!note) {
				note = document.createElement("div");
				note.className = "bat-empty-note";
				note.textContent = "No app on this page matches — try the Filters panel to search the whole site.";
				bar?.element.after(note);
			}
		} else note?.remove();
	}
	function boot() {
		mountThemeButton();
		const nav = document.querySelector("[data-testid=\"app-filter-bar-wrapper\"]")?.closest("nav");
		if (nav && (!bar || !bar.element.isConnected)) {
			filter = { ...EMPTY_FILTER };
			bar = mountFilterBar(nav, {
				apply: (next) => {
					filter = next;
					applyFilter();
				},
				requestAllLinks
			});
			document.documentElement.classList.add("bat-on");
		}
		scanCards();
		if (filter.needsSource || filter.needsOfficial) requestAllLinks();
		applyFilter();
	}
	function teardown() {
		bar?.element.remove();
		bar = null;
		filter = { ...EMPTY_FILTER };
		document.documentElement.classList.remove("bat-panel-open");
		document.querySelector(".bat-empty-note")?.remove();
	}
	function needsWork() {
		if (location.href !== lastUrl) return true;
		if (!bar || !bar.element.isConnected) return Boolean(document.querySelector("[data-testid=\"app-filter-bar-wrapper\"]"));
		if (!document.querySelector(".bat-theme")) return Boolean(document.querySelector("button[aria-label=\"Open page menu\"]"));
		return [...document.querySelectorAll("[data-testid^=\"item-\"]")].some(isStale);
	}
	var scheduled = 0;
	function schedule() {
		clearTimeout(scheduled);
		scheduled = window.setTimeout(() => {
			if (!needsWork()) return;
			if (location.href !== lastUrl) {
				lastUrl = location.href;
				teardown();
			}
			boot();
		}, 120);
	}
	injectStyles();
	schedule();
	new MutationObserver(schedule).observe(document.documentElement, {
		childList: true,
		subtree: true
	});
})();
