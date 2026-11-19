// ==UserScript==
// @name         GitHub Filter
// @namespace    https://github.com/quantavil/userscript/github-filter
// @version      10.1.0
// @author       quantavil (https://github.com/quantavil)
// @description  Filter GitHub repository search with sliders for stars and forks, date pickers, saved presets and a local hide list.
// @license      GPL-3.0-or-later
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @homepage     https://github.com/quantavil/userscript
// @homepageURL  https://github.com/quantavil/userscript
// @match        https://github.com/*
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var NAME = "GitHub Filter";
	var IDS = {
		panel: "ghf-panel",
		style: "ghf-style",
		fab: "ghf-fab"
	};
	var STORE = {
		presets: "ghf:presets",
		theme: "ghf:theme"
	};
	var PARAM = { hide: "ghf_hide" };
	var RESULTS_LIST = "[data-testid=\"results-list\"]";
	var LEGACY_ROW = ".repo-list-item, .Box-row";
	var NAV_EVENTS = [
		"turbo:render",
		"turbo:load",
		"pjax:end"
	];
	var SEARCH_TYPE = "repositories";
	var SHORTCUT_LABEL = "Alt+F";
	var SORTS = [
		{
			value: "",
			label: "Best match"
		},
		{
			value: "stars",
			label: "Most stars"
		},
		{
			value: "forks",
			label: "Most forks"
		},
		{
			value: "updated",
			label: "Recently updated"
		}
	];
	var KEYWORDS = [
		{
			id: "and",
			key: "all",
			label: "All of these words",
			placeholder: "e.g. rust async engine"
		},
		{
			id: "or",
			key: "any",
			label: "Any of these words",
			placeholder: "e.g. react, vue, svelte"
		},
		{
			id: "hide",
			key: "hide",
			label: "Hide results containing",
			placeholder: "e.g. spam, tutorial, homework"
		}
	];
	var POPULAR_LANGUAGES = [
		"TypeScript",
		"JavaScript",
		"Python",
		"Rust",
		"Go",
		"C++",
		"Java",
		"Ruby"
	];
	var STAR_PRESETS = [
		100,
		500,
		1e3,
		5e3,
		1e4
	];
	var QUALIFIERS = [
		{
			kind: "text",
			id: "repo",
			label: "Repo",
			qualifier: "repo",
			placeholder: "e.g. facebook/react"
		},
		{
			kind: "text",
			id: "lang",
			label: "Language",
			qualifier: "language",
			aliases: ["lang"],
			placeholder: "e.g. python, -html"
		},
		{
			kind: "number",
			id: "stars",
			label: "Stars",
			qualifier: "stars",
			stops: [
				0,
				10,
				25,
				50,
				100,
				250,
				500,
				1e3,
				2e3,
				5e3,
				1e4,
				2e4,
				5e4,
				1e5
			]
		},
		{
			kind: "number",
			id: "forks",
			label: "Forks",
			qualifier: "forks",
			stops: [
				0,
				5,
				10,
				25,
				50,
				100,
				250,
				500,
				1e3,
				2e3,
				5e3,
				1e4
			]
		},
		{
			kind: "date",
			id: "created",
			label: "Created",
			qualifier: "created"
		},
		{
			kind: "date",
			id: "pushed",
			label: "Pushed",
			qualifier: "pushed"
		}
	];
	var emptyState = () => ({
		and: "",
		or: "",
		hide: "",
		sort: "",
		repo: "",
		lang: "",
		stars: {
			min: 0,
			max: 0
		},
		forks: {
			min: 0,
			max: 0
		},
		created: {
			from: "",
			to: ""
		},
		pushed: {
			from: "",
			to: ""
		}
	});
	var tokenize = (input) => input.match(/-?"[^"]*"|[^\s,]+/g) ?? [];
	var splitTerms = (input) => input.match(/-?(?:[\w-]+:)?(?:"[^"]*"|\S+)/g) ?? [];
	var splitNegation = (token) => token.startsWith("-") ? [token.slice(1), "-"] : [token, ""];
	function numberRange(range) {
		if (range.min > 0 && range.max > 0) return `${Math.min(range.min, range.max)}..${Math.max(range.min, range.max)}`;
		if (range.min > 0) return `>=${range.min}`;
		if (range.max > 0) return `<=${range.max}`;
		return null;
	}
	function dateRange(range) {
		if (range.from && range.to) {
			if (range.from === range.to) return range.from;
			const [from, to] = range.from <= range.to ? [range.from, range.to] : [range.to, range.from];
			return `${from}..${to}`;
		}
		if (range.from) return `>=${range.from}`;
		if (range.to) return `<=${range.to}`;
		return null;
	}
	function queryParts(state) {
		const parts = tokenize(state.and).map((token) => ({
			text: token,
			kind: "term",
			fieldId: "and",
			token
		}));
		const anyOf = tokenize(state.or);
		if (anyOf.length) parts.push({
			text: anyOf.length === 1 ? anyOf[0] : `(${anyOf.join(" OR ")})`,
			kind: "term",
			fieldId: "or"
		});
		for (const field of QUALIFIERS) {
			if (field.kind === "text") {
				for (const token of tokenize(state[field.id])) {
					const [bare, negate] = splitNegation(token);
					if (!bare) continue;
					parts.push({
						text: `${negate}${field.qualifier}:${bare}`,
						kind: "qualifier",
						fieldId: field.id,
						token
					});
				}
				continue;
			}
			const value = field.kind === "number" ? numberRange(state[field.id]) : dateRange(state[field.id]);
			if (value) parts.push({
				text: `${field.qualifier}:${value}`,
				kind: "qualifier",
				fieldId: field.id
			});
		}
		return parts;
	}
	var buildQuery = (state) => queryParts(state).map((part) => part.text).join(" ");
	function buildUrl(state) {
		const url = new URL("https://github.com/search");
		const query = buildQuery(state);
		if (query) url.searchParams.set("q", query);
		url.searchParams.set("type", SEARCH_TYPE);
		if (state.sort) {
			url.searchParams.set("s", state.sort);
			url.searchParams.set("o", "desc");
		}
		if (state.hide.trim()) url.searchParams.set(PARAM.hide, state.hide.trim());
		return url.toString();
	}
	function removeQueryPart(state, part) {
		if (!part.fieldId) return state;
		const next = { ...state };
		if (part.fieldId === "stars" || part.fieldId === "forks") next[part.fieldId] = {
			min: 0,
			max: 0
		};
		else if (part.fieldId === "created" || part.fieldId === "pushed") next[part.fieldId] = {
			from: "",
			to: ""
		};
		else if (part.fieldId === "or") next.or = "";
		else if (part.token && (part.fieldId === "and" || part.fieldId === "repo" || part.fieldId === "lang")) {
			const filtered = tokenize(state[part.fieldId]).filter((t) => t !== part.token);
			next[part.fieldId] = filtered.join(part.fieldId === "and" ? " " : ", ");
		}
		return next;
	}
	function countActiveFilters(state) {
		let count = 0;
		if (state.and.trim()) count += 1;
		if (state.or.trim()) count += 1;
		if (state.hide.trim()) count += 1;
		if (state.sort) count += 1;
		if (state.repo.trim()) count += 1;
		if (state.lang.trim()) count += 1;
		if (state.stars.min > 0 || state.stars.max > 0) count += 1;
		if (state.forks.min > 0 || state.forks.max > 0) count += 1;
		if (state.created.from || state.created.to) count += 1;
		if (state.pushed.from || state.pushed.to) count += 1;
		return count;
	}
	var NUMBER = /^(>=|<=|>|<)?(\d+)(?:\.\.(\d+))?$/;
	var DATE = /^(>=|<=|>|<)?(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/;
	function parseNumberRange(value) {
		const match = value.match(NUMBER);
		if (!match) return null;
		const [, operator = "", lower = "", upper] = match;
		if (upper) return {
			min: Number(lower),
			max: Number(upper)
		};
		const count = Number(lower);
		if (operator === ">") return {
			min: count + 1,
			max: 0
		};
		if (operator === "<") return {
			min: 0,
			max: Math.max(count - 1, 0)
		};
		if (operator === "<=") return {
			min: 0,
			max: count
		};
		return {
			min: count,
			max: 0
		};
	}
	function shiftDays(date, days) {
		const parsed = new Date(`${date}T00:00:00Z`);
		if (Number.isNaN(parsed.getTime())) return date;
		parsed.setUTCDate(parsed.getUTCDate() + days);
		return parsed.toISOString().slice(0, 10);
	}
	function parseDateRange(value) {
		const match = value.match(DATE);
		if (!match) return null;
		const [, operator = "", lower = "", upper] = match;
		if (upper) return {
			from: lower,
			to: upper
		};
		if (operator === ">") return {
			from: shiftDays(lower, 1),
			to: ""
		};
		if (operator === "<") return {
			from: "",
			to: shiftDays(lower, -1)
		};
		if (operator === "<=") return {
			from: "",
			to: lower
		};
		return {
			from: lower,
			to: ""
		};
	}
	function readQuery(state, query) {
		const free = [];
		for (const term of splitTerms(query)) {
			const keyword = term.match(/^(-?)([\w-]+):(.*)$/);
			const [, negate = "", key = "", raw = ""] = keyword ?? [];
			const lowered = key.toLowerCase();
			const field = keyword && QUALIFIERS.find((f) => f.qualifier === lowered || "aliases" in f && f.aliases?.includes(lowered));
			if (!field) {
				free.push(term);
				continue;
			}
			if (field.kind === "text") {
				const isQuoted = raw.startsWith("\"") && raw.endsWith("\"");
				const cleanRaw = isQuoted ? raw.slice(1, -1) : raw;
				const values = isQuoted ? [`${negate}"${cleanRaw}"`] : tokenize(cleanRaw).map((value) => `${negate}${value}`);
				if (values.length) state[field.id] = [...tokenize(state[field.id]), ...values].join(", ");
				continue;
			}
			if (negate) {
				free.push(term);
				continue;
			}
			if (field.kind === "number") {
				const range = parseNumberRange(raw);
				if (range) state[field.id] = range;
				else free.push(term);
				continue;
			}
			const range = parseDateRange(raw);
			if (range) state[field.id] = range;
			else free.push(term);
		}
		return free.join(" ");
	}
	function stateFromQuery(query, sort = "", hide = "") {
		const state = emptyState();
		state.sort = sort;
		state.hide = hide;
		let rest = query;
		const group = rest.match(/\(([^()]+)\)/);
		if (group?.[1]?.includes(" OR ")) {
			state.or = group[1].split(" OR ").map((term) => term.trim()).filter(Boolean).join(", ");
			rest = rest.replace(group[0], " ");
		}
		state.and = readQuery(state, rest).replace(/\s+/g, " ").trim();
		return state;
	}
	var parseUrl = (search) => {
		const params = new URLSearchParams(search);
		return stateFromQuery(params.get("q") ?? "", params.get("s") ?? "", params.get(PARAM.hide) ?? "");
	};
	function legacyQuery(q) {
		if (!q || typeof q !== "object") return "";
		const source = q;
		const terms = [];
		for (const field of QUALIFIERS) {
			const value = source[field.id];
			if (typeof value !== "string") continue;
			for (const token of tokenize(value)) {
				const [bare, negate] = splitNegation(token);
				if (!bare) continue;
				const numeric = field.kind === "number" && /^\d+$/.test(bare) ? `>=${bare}` : bare;
				terms.push(`${negate}${field.qualifier}:${numeric}`);
			}
		}
		return terms.join(" ");
	}
	var isNumberRange = (value) => typeof value === "object" && value !== null && Number.isFinite(value.min) && Number.isFinite(value.max);
	var isDateRange = (value) => typeof value === "object" && value !== null && typeof value.from === "string" && typeof value.to === "string";
	function normalizeState(raw) {
		if (!raw || typeof raw !== "object") return emptyState();
		const input = raw;
		const text = (key) => typeof input[key] === "string" ? input[key] : "";
		const state = stateFromQuery(legacyQuery(input.q), text("sort"), text("hide"));
		state.and = text("and");
		state.or = text("or");
		for (const field of QUALIFIERS) {
			const value = input[field.id];
			if (field.kind === "text" && typeof value === "string") state[field.id] = value;
			else if (field.kind === "number" && isNumberRange(value)) state[field.id] = value;
			else if (field.kind === "date" && isDateRange(value)) state[field.id] = value;
		}
		return state;
	}
	function toIndex(stops, value, end) {
		const last = stops.length - 1;
		if (value <= 0) return end === "min" ? 0 : last;
		let best = 1;
		for (let i = 1; i <= last; i += 1) if (Math.abs((stops[i] ?? 0) - value) < Math.abs((stops[best] ?? 0) - value)) best = i;
		return best;
	}
	function fromIndex(stops, index, end) {
		if (end === "min") return index <= 0 ? 0 : stops[index] ?? 0;
		return index >= stops.length - 1 ? 0 : stops[index] ?? 0;
	}
	var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	function buildHideMatcher(input) {
		const words = tokenize(input).map((w) => w.replace(/^-?"|"$/g, "").trim()).filter(Boolean);
		if (!words.length) return null;
		const alt = words.sort((a, b) => b.length - a.length).map(escapeRe).join("|");
		return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, "iu");
	}
	var resultRows = () => {
		const list = document.querySelector(RESULTS_LIST);
		return list ? Array.from(list.children) : Array.from(document.querySelectorAll(LEGACY_ROW));
	};
	function rowText(row) {
		const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
		let text = "";
		while (walker.nextNode()) text += `${walker.currentNode.nodeValue} `;
		return text;
	}
	function scanResults() {
		if (location.pathname !== "/search") return;
		const matcher = buildHideMatcher(new URLSearchParams(location.search).get(PARAM.hide) ?? "");
		for (const row of resultRows()) {
			const shouldHide = Boolean(matcher?.test(rowText(row)));
			row.classList.toggle("ghf-hidden", shouldHide);
		}
	}
	function watchResults() {
		scanResults();
		if (!document.body) return;
		let debounce;
		new MutationObserver(() => {
			if (location.pathname !== "/search") return;
			clearTimeout(debounce);
			debounce = setTimeout(scanResults, 150);
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
		for (const event of NAV_EVENTS) document.addEventListener(event, () => scanResults());
	}
	var read = (key, fallback) => {
		try {
			const raw = localStorage.getItem(key);
			return raw === null ? fallback : JSON.parse(raw);
		} catch {
			return fallback;
		}
	};
	var write = (key, value) => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {}
	};
	var getPresets = () => read(STORE.presets, []).filter((p) => p?.id && p?.name).map((p) => ({
		...p,
		state: normalizeState(p.state)
	}));
	var addPreset = (name, state) => {
		const presets = [...getPresets(), {
			id: `p${Date.now().toString(36)}`,
			name,
			state
		}];
		write(STORE.presets, presets);
		return presets;
	};
	var removePreset = (id) => {
		const presets = getPresets().filter((p) => p.id !== id);
		write(STORE.presets, presets);
		return presets;
	};
	var getStoredTheme = () => {
		try {
			return localStorage.getItem(STORE.theme);
		} catch {
			return null;
		}
	};
	var setStoredTheme = (theme) => {
		try {
			localStorage.setItem(STORE.theme, theme);
		} catch {}
	};
	function migrateLegacyStorage() {
		try {
			migrateLegacyStorageUnsafe();
		} catch {}
	}
	function migrateLegacyStorageUnsafe() {
		const legacyPresets = localStorage.getItem("gh-adv-presets");
		if (legacyPresets && !localStorage.getItem(STORE.presets)) try {
			const migrated = JSON.parse(legacyPresets).filter((p) => p?.name).map((p, i) => ({
				id: p.id ?? `p${i}`,
				name: p.name,
				state: normalizeState({
					sort: p.fields?.sort ?? "",
					and: p.fields?.and ?? "",
					or: p.fields?.or ?? "",
					hide: p.fields?.hideKeys ?? "",
					q: p.fields?.meta ?? {}
				})
			}));
			write(STORE.presets, migrated);
		} catch {}
		localStorage.removeItem("gh-adv-presets");
		const legacyTheme = localStorage.getItem("gh-adv-theme");
		if (legacyTheme && !getStoredTheme()) setStoredTheme(legacyTheme);
		localStorage.removeItem("gh-adv-theme");
		for (const key of Object.keys(localStorage)) if (key.startsWith("gh-rel-")) localStorage.removeItem(key);
		localStorage.removeItem("gh-adv-scan");
		localStorage.removeItem("ghf:scan");
		localStorage.removeItem("ghf:releases");
	}
	var P$1 = `#${IDS.panel}`;
	var F$2 = `#${IDS.fab}`;
	var CSS = `
${P$1}, ${F$2} {
  --ghf-canvas: var(--overlay-bgColor, var(--bgColor-default, var(--color-canvas-default, #ffffff)));
  --ghf-sunken: var(--bgColor-inset, var(--color-canvas-inset, #f6f8fa));
  --ghf-raised: var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa));
  --ghf-card: var(--bgColor-default, var(--color-canvas-default, #ffffff));
  --ghf-fg: var(--fgColor-default, var(--color-fg-default, #1f2328));
  --ghf-muted: var(--fgColor-muted, var(--color-fg-muted, #59636e));
  --ghf-accent: var(--fgColor-accent, var(--color-accent-fg, #0969da));
  --ghf-accent-subtle: rgba(9, 105, 218, 0.12);
  --ghf-accent-border: rgba(9, 105, 218, 0.35);
  --ghf-danger: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
  --ghf-danger-subtle: rgba(209, 36, 47, 0.12);
  --ghf-border: var(--borderColor-default, var(--color-border-default, #d1d9e0));
  --ghf-hairline: var(--borderColor-muted, var(--color-border-muted, #eaeef2));
  --ghf-hover: var(--control-transparent-bgColor-hover, rgba(175, 184, 193, 0.15));
  --ghf-selected: var(--bgColor-neutral-muted, rgba(175, 184, 193, 0.22));
  --ghf-btn-bg: var(--button-default-bgColor-rest, #f6f8fa);
  --ghf-btn-hover: var(--button-default-bgColor-hover, #eef1f4);
  --ghf-primary: var(--button-primary-bgColor-rest, #1f883d);
  --ghf-primary-hover: var(--button-primary-bgColor-hover, #1a7f37);
  --ghf-shadow: 0 16px 36px rgba(31, 35, 40, 0.18), 0 4px 12px rgba(31, 35, 40, 0.08);
  --ghf-shadow-drawer: -8px 0 32px rgba(31, 35, 40, 0.2);
  --ghf-radius: 8px;
  --ghf-radius-sm: 6px;
  --ghf-radius-pill: 999px;
  --ghf-font: var(--fontStack-sansSerif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
}

${P$1}[data-theme="light"], ${F$2}[data-theme="light"] {
  color-scheme: light;
  --ghf-canvas: #ffffff;
  --ghf-sunken: #f6f8fa;
  --ghf-raised: #f8fafc;
  --ghf-card: #ffffff;
  --ghf-fg: #1f2328;
  --ghf-muted: #59636e;
  --ghf-accent: #0969da;
  --ghf-accent-subtle: rgba(9, 105, 218, 0.1);
  --ghf-accent-border: rgba(9, 105, 218, 0.35);
  --ghf-danger: #d1242f;
  --ghf-danger-subtle: rgba(209, 36, 47, 0.1);
  --ghf-border: #d0d7de;
  --ghf-hairline: #e8ecf0;
  --ghf-hover: #f3f5f8;
  --ghf-selected: #e5ebf1;
  --ghf-btn-bg: #f6f8fa;
  --ghf-btn-hover: #eaedf1;
  --ghf-primary: #1f883d;
  --ghf-primary-hover: #1a7f37;
  --ghf-shadow: 0 16px 36px rgba(31, 35, 40, 0.16);
  --ghf-shadow-drawer: -8px 0 32px rgba(31, 35, 40, 0.16);
}

${P$1}[data-theme="dark"], ${F$2}[data-theme="dark"] {
  color-scheme: dark;
  --ghf-canvas: #0d1117;
  --ghf-sunken: #090d13;
  --ghf-raised: #161b22;
  --ghf-card: #161b22;
  --ghf-fg: #f0f6fc;
  --ghf-muted: #8b949e;
  --ghf-accent: #2f81f7;
  --ghf-accent-subtle: rgba(47, 129, 247, 0.15);
  --ghf-accent-border: rgba(47, 129, 247, 0.4);
  --ghf-danger: #f85149;
  --ghf-danger-subtle: rgba(248, 81, 73, 0.15);
  --ghf-border: #30363d;
  --ghf-hairline: #21262d;
  --ghf-hover: #1f242c;
  --ghf-selected: #282e37;
  --ghf-btn-bg: #21262d;
  --ghf-btn-hover: #292e36;
  --ghf-primary: #238636;
  --ghf-primary-hover: #2ea043;
  --ghf-shadow: 0 20px 48px rgba(1, 4, 9, 0.7);
  --ghf-shadow-drawer: -12px 0 40px rgba(1, 4, 9, 0.7);
}

/* ==========================================================================
   Panel Container & Backdrop
   ========================================================================== */

${P$1} {
  top: 0;
  right: 0;
  bottom: 0;
  left: auto;
  width: min(460px, 100vw);
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0 0 0 auto;
  padding: 0;
  border: none;
  border-left: 1px solid var(--ghf-border);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  font-family: var(--ghf-font);
  font-size: 13px;
  line-height: 1.5;
  box-shadow: var(--ghf-shadow-drawer);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .25s cubic-bezier(0.16, 1, 0.3, 1), opacity .2s ease,
              display .25s allow-discrete, overlay .25s allow-discrete;
}

${P$1}[open] {
  transform: translateX(0);
  opacity: 1;
}

@starting-style {
  ${P$1}[open] {
    transform: translateX(100%);
    opacity: 0;
  }
}

${P$1}::backdrop {
  background: rgba(1, 4, 9, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity .22s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}

${P$1}[open]::backdrop {
  opacity: 1;
}

@starting-style {
  ${P$1}[open]::backdrop {
    opacity: 0;
  }
}

${P$1} *, ${P$1} *::before, ${P$1} *::after {
  box-sizing: border-box;
}

${P$1} ::selection {
  background: var(--ghf-selected);
  color: var(--ghf-fg);
}

${P$1} .ghf-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

@media (max-width: 767px) {
  ${P$1} {
    top: auto;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: auto;
    max-height: 90dvh;
    margin: auto 0 0;
    border-left: none;
    border-top: 1px solid var(--ghf-border);
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
  }
  ${P$1}[open] { transform: translateY(0); }
  @starting-style { ${P$1}[open] { transform: translateY(100%); opacity: 0; } }
}

/* ==========================================================================
   Header & Tabs
   ========================================================================== */

${P$1} .ghf-head {
  flex: 0 0 auto;
  padding: 14px 18px 0;
  border-bottom: 1px solid var(--ghf-hairline);
  background: var(--ghf-canvas);
}

${P$1} .ghf-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
}

${P$1} .ghf-brand {
  display: flex;
  align-items: center;
  gap: 9px;
}

${P$1} .ghf-brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-accent-subtle);
  color: var(--ghf-accent);
}

${P$1} h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ghf-fg);
}

${P$1} .ghf-badge-shortcut {
  padding: 1px 6px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken);
  color: var(--ghf-muted);
  font-family: var(--ghf-mono);
  font-size: 10px;
  font-weight: 500;
}

${P$1} .ghf-titlebar nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

${P$1} .ghf-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--ghf-radius-sm);
  background: transparent;
  color: var(--ghf-muted);
  cursor: pointer;
  font: inherit;
  transition: background .12s ease, color .12s ease, transform .08s ease;
}

${P$1} .ghf-icon-btn svg { fill: currentColor; }
${P$1} .ghf-icon-btn:hover {
  background: var(--ghf-btn-hover);
  color: var(--ghf-fg);
}
${P$1} .ghf-icon-btn:active { transform: scale(0.95); }

${P$1} .ghf-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

${P$1} .ghf-tab-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px 9px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ghf-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color .12s ease;
}

${P$1} .ghf-tab-btn:hover { color: var(--ghf-fg); }

${P$1} .ghf-tab-btn[aria-selected="true"] {
  color: var(--ghf-fg);
  font-weight: 600;
  border-bottom-color: var(--ghf-accent);
}

${P$1} .ghf-pill-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent-subtle);
  color: var(--ghf-accent);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ==========================================================================
   Body & Cards
   ========================================================================== */

${P$1} .ghf-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 18px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--ghf-border) transparent;
}

${P$1} [role="tabpanel"][hidden] { display: none; }

${P$1} .ghf-card {
  margin-bottom: 14px;
  padding: 12px 14px 14px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-card);
  box-shadow: 0 1px 3px rgba(31, 35, 40, 0.04);
}

${P$1} .ghf-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

${P$1} .ghf-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--ghf-fg);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

${P$1} .ghf-card-title svg { color: var(--ghf-muted); }

/* ==========================================================================
   Fields & Inputs
   ========================================================================== */

${P$1} .ghf-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

${P$1} .ghf-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

${P$1} .ghf-field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

${P$1} .ghf-label {
  color: var(--ghf-muted);
  font-size: 11.5px;
  font-weight: 500;
}

${P$1} .ghf-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-canvas);
  transition: border-color .12s ease, box-shadow .12s ease;
}

${P$1} .ghf-input-wrap:focus-within {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 2px var(--ghf-accent-subtle);
}

${P$1} .ghf-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ghf-fg);
  font: inherit;
  font-size: 12.5px;
}

${P$1} .ghf-input::placeholder {
  color: var(--ghf-muted);
  opacity: 0.8;
}

${P$1} .ghf-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: 6px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--ghf-muted);
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
}

${P$1} .ghf-clear-btn svg { fill: currentColor; }
${P$1} .ghf-clear-btn:hover {
  background: var(--ghf-selected);
  color: var(--ghf-fg);
}

${P$1} .ghf-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

${P$1} .ghf-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken);
  color: var(--ghf-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}

${P$1} .ghf-chip:hover {
  border-color: var(--ghf-accent-border);
  color: var(--ghf-fg);
}

${P$1} .ghf-chip.ghf-chip-active {
  border-color: var(--ghf-accent);
  background: var(--ghf-accent-subtle);
  color: var(--ghf-accent);
  font-weight: 600;
}

/* ==========================================================================
   Dual Sliders
   ========================================================================== */

${P$1} .ghf-slider-row {
  margin-top: 8px;
}

${P$1} .ghf-slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

${P$1} .ghf-slider-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ghf-fg);
  font-size: 12px;
  font-weight: 500;
}

${P$1} .ghf-slider-title svg { color: var(--ghf-muted); }

${P$1} .ghf-readout-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken);
  color: var(--ghf-fg);
  font-family: var(--ghf-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

${P$1} .ghf-slider {
  position: relative;
  height: 28px;
  cursor: pointer;
  touch-action: none;
}

${P$1} .ghf-slider-track {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 11px;
  height: 6px;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-border);
  pointer-events: none;
}

${P$1} .ghf-slider-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent);
}

${P$1} .ghf-slider input {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  width: 100%;
  height: 28px;
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
  background: none;
  pointer-events: none;
}

${P$1} .ghf-slider input::-webkit-slider-runnable-track {
  height: 28px;
  background: none;
}
${P$1} .ghf-slider input::-moz-range-track {
  height: 28px;
  background: none;
}

${P$1} .ghf-slider input::-webkit-slider-thumb {
  -webkit-appearance: none;
  pointer-events: auto;
  width: 16px;
  height: 16px;
  margin-top: 6px;
  border: 2px solid var(--ghf-accent);
  border-radius: 50%;
  background: var(--ghf-card);
  cursor: grab;
  box-shadow: 0 1px 4px rgba(31, 35, 40, 0.35);
  transition: transform .1s ease, box-shadow .1s ease;
}

${P$1} .ghf-slider input::-webkit-slider-thumb:hover {
  transform: scale(1.18);
  box-shadow: 0 0 0 3px var(--ghf-accent-subtle), 0 2px 6px rgba(31, 35, 40, 0.4);
}

${P$1} .ghf-slider input:active::-webkit-slider-thumb {
  cursor: grabbing;
  transform: scale(1.22);
}

${P$1} .ghf-slider input::-moz-range-thumb {
  pointer-events: auto;
  width: 12px;
  height: 12px;
  border: 2px solid var(--ghf-accent);
  border-radius: 50%;
  background: var(--ghf-card);
  cursor: grab;
  box-shadow: 0 1px 4px rgba(31, 35, 40, 0.35);
}

/* ==========================================================================
   Date Pickers
   ========================================================================== */

${P$1} .ghf-date-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

${P$1} .ghf-date-input {
  width: 100%;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  font: inherit;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  outline: 0;
  transition: border-color .12s ease, box-shadow .12s ease;
}

${P$1} .ghf-date-input:focus {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 2px var(--ghf-accent-subtle);
}

${P$1} .ghf-date-sep {
  text-align: center;
  color: var(--ghf-muted);
  font-size: 12px;
}

/* ==========================================================================
   Sort Selection
   ========================================================================== */

${P$1} .ghf-sort-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

${P$1} .ghf-sort-select {
  appearance: none;
  height: 28px;
  padding: 0 24px 0 10px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  outline: 0;
}

${P$1} .ghf-sort-select:focus {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 2px var(--ghf-accent-subtle);
}

${P$1} .ghf-sort-wrap svg {
  position: absolute;
  right: 7px;
  color: var(--ghf-muted);
  pointer-events: none;
  fill: currentColor;
}

/* ==========================================================================
   Footer & Live Query Tape
   ========================================================================== */

${P$1} .ghf-foot {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ghf-border);
  background: var(--ghf-raised);
}

${P$1} .ghf-tape-card {
  padding: 8px 10px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-sunken);
}

${P$1} .ghf-tape-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

${P$1} .ghf-tape-title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ghf-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

${P$1} .ghf-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card);
  color: var(--ghf-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}

${P$1} .ghf-copy-btn svg { fill: currentColor; }
${P$1} .ghf-copy-btn:hover:not(:disabled) {
  border-color: var(--ghf-accent-border);
  color: var(--ghf-fg);
}
${P$1} .ghf-copy-btn:disabled {
  opacity: .5;
  cursor: default;
}

${P$1} .ghf-tape-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 72px;
  overflow-y: auto;
  padding: 2px 0;
  scrollbar-width: thin;
}

${P$1} .ghf-tape-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card);
  color: var(--ghf-fg);
  font-family: var(--ghf-mono);
  font-size: 11px;
  line-height: 1.4;
}

${P$1} .ghf-tape-chip-key {
  color: var(--ghf-accent);
  font-weight: 600;
}

${P$1} .ghf-tape-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ghf-muted);
  cursor: pointer;
  transition: background .1s ease, color .1s ease;
}

${P$1} .ghf-tape-chip-remove:hover {
  background: var(--ghf-danger-subtle);
  color: var(--ghf-danger);
}

${P$1} .ghf-tape-empty {
  color: var(--ghf-muted);
  font-size: 12px;
  font-style: italic;
  padding: 2px 0;
}

${P$1} .ghf-tape-hide {
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px dashed var(--ghf-border);
  color: var(--ghf-muted);
  font-size: 11px;
}

${P$1} .ghf-tape-hide b {
  color: var(--ghf-fg);
  font-family: var(--ghf-mono);
}

${P$1} .ghf-actions-bar {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px;
}

${P$1} .ghf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg);
  color: var(--ghf-fg);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease, transform .08s ease;
}

${P$1} .ghf-btn svg { fill: currentColor; }
${P$1} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P$1} .ghf-btn:active { transform: translateY(1px); }

${P$1} .ghf-btn.ghf-btn-primary {
  border-color: var(--ghf-primary);
  background: var(--ghf-primary);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(31, 35, 40, 0.2);
}

${P$1} .ghf-btn.ghf-btn-primary:hover {
  border-color: var(--ghf-primary-hover);
  background: var(--ghf-primary-hover);
}

${P$1} .ghf-btn:disabled, ${P$1} .ghf-btn.ghf-btn-primary:disabled {
  border-color: var(--ghf-border);
  background: var(--ghf-btn-bg);
  color: var(--ghf-muted);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
  opacity: 0.6;
}

/* ==========================================================================
   Presets Tab
   ========================================================================== */

${P$1} .ghf-save-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

${P$1} .ghf-preset-list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

${P$1} .ghf-preset-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-card);
  transition: border-color .12s ease, box-shadow .12s ease;
}

${P$1} .ghf-preset-card:hover {
  border-color: var(--ghf-accent-border);
  box-shadow: 0 2px 6px rgba(31, 35, 40, 0.06);
}

${P$1} .ghf-preset-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

${P$1} .ghf-preset-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ghf-fg);
}

${P$1} .ghf-preset-query {
  color: var(--ghf-muted);
  font-family: var(--ghf-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

${P$1} .ghf-preset-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

${P$1} .ghf-error-msg {
  min-height: 16px;
  margin: 4px 0 0;
  color: var(--ghf-danger);
  font-size: 11.5px;
}

${P$1} .ghf-empty-presets {
  padding: 36px 20px;
  border: 1px dashed var(--ghf-border);
  border-radius: var(--ghf-radius);
  color: var(--ghf-muted);
  text-align: center;
}

${P$1} .ghf-empty-presets svg {
  margin-bottom: 8px;
  color: var(--ghf-accent);
  opacity: 0.8;
}

${P$1} .ghf-empty-title {
  margin: 0 0 6px;
  color: var(--ghf-fg);
  font-size: 14px;
  font-weight: 600;
}

${P$1} .ghf-empty-text {
  margin: 0 auto 16px;
  max-width: 32ch;
  font-size: 12px;
  line-height: 1.5;
}

/* ==========================================================================
   Focus & Accessibility
   ========================================================================== */

${P$1} :is(button, select, input):focus-visible {
  outline: 2px solid var(--ghf-accent);
  outline-offset: 1px;
}

${P$1} .ghf-slider input:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--ghf-canvas), 0 0 0 4px var(--ghf-accent);
}

/* ==========================================================================
   Floating Launcher Button (FAB)
   ========================================================================== */

${F$2} {
  position: fixed;
  right: calc(20px + env(safe-area-inset-right, 0px));
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 42px;
  min-width: 42px;
  padding: 0 14px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-canvas);
  color: var(--ghf-fg);
  box-shadow: var(--ghf-shadow);
  cursor: pointer;
  z-index: 9999;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease, color .15s ease;
}

${F$2}:hover {
  transform: translateY(-2px);
  border-color: var(--ghf-accent);
  box-shadow: 0 8px 24px rgba(31, 35, 40, 0.22);
}

${F$2}:active { transform: translateY(0) scale(0.97); }

${F$2} svg {
  flex: 0 0 auto;
  fill: currentColor;
  color: var(--ghf-accent);
}

${F$2} .ghf-fab-text {
  font-family: var(--ghf-font);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}

${F$2} .ghf-fab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

@media (pointer: coarse) {
  ${F$2} { height: 48px; min-width: 48px; }
}

@media print {
  ${F$2}, ${P$1} { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  ${P$1}, ${P$1}::backdrop, ${F$2}, ${P$1} * {
    transition-duration: 0.01ms !important;
  }
}

.ghf-hidden { display: none !important; }
`;
	function injectStyles() {
		if (document.getElementById(IDS.style)) return;
		const style = document.createElement("style");
		style.id = IDS.style;
		style.textContent = CSS;
		document.head.append(style);
	}
	var n;
	var t$1;
	var u$2;
	var i$1;
	var f$2;
	var o$2;
	var e$1;
	var l$1;
	var c$1;
	var a$2;
	var h$1 = Symbol.for("pv");
	var p$1 = {};
	var y$1 = [];
	var v$1 = /^m(i|n|o|s|text|space)$/;
	var w$1 = Array.isArray;
	var d$1 = y$1.slice;
	var _$1 = Object.assign;
	function g$1(n) {
		n && n.parentNode && n.remove();
	}
	function m$1(r, u, i, f, o) {
		var e = {
			type: r,
			props: u,
			key: i,
			ref: f,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: h$1,
			__v: o || ++t$1,
			__i: -1,
			__u: 0
		};
		return !o && n.vnode && n.vnode(e), e;
	}
	function $(n) {
		return n.children;
	}
	function x(n, t) {
		this.props = n, this.context = t, this.__g = 0;
	}
	function S(n, t) {
		if (null == t) return n.__ && S(n.__, n.__i + 1);
		for (var r; t < n.__k.length; t++) if ((r = n.__k[t]) && r.__e) return r.__e;
		return "function" != typeof n.type || n.props.__P ? null : S(n);
	}
	function C$1(t) {
		var r, u = t.__v, i = u.__e, f = [], o = [], e = t.__P;
		e && ((r = _$1({ constructor: h$1 }, u)).__v = u.__v + 1, n.vnode && n.vnode(r), z$1(e, r, u, t.__n, e.namespaceURI, 32 & u.__u ? [i] : null, f, i || S(u), 32 & u.__u, o), r.__v = u.__v, r.__.__k[r.__i] = r, E$1(f, r, o), u.__ = u.__e = null, r.__e != i && j(r));
	}
	function j(n) {
		if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
			return t && (n.__e = t.__e);
		}), j(n);
	}
	function L(t) {
		(8 & t.__g || (t.__g |= 8, u$2.push(t), f$2++)) && i$1 == n.debounceRendering || ((i$1 = n.debounceRendering) || queueMicrotask)(H);
	}
	function H() {
		try {
			for (var n, t = 1; u$2.length;) u$2.length > t && u$2.sort(o$2), n = u$2.shift(), t = u$2.length, 8 & n.__g && C$1(n);
		} finally {
			(f$2 = u$2.length) && (i$1 || queueMicrotask)(H);
		}
	}
	function I(n, t, r, u, i, f, o, e, l, c, a) {
		var s, h, v, w, d, _, g = u.__k || y$1, k = t.length;
		for (l = q(r, t, g, l, k), s = 0; s < k; s++) null != (v = r.__k[s]) && (h = ~v.__i && g[v.__i] || p$1, v.__i = s, _ = z$1(n, v, h, i, f, o, e, l, c, a), w = v.__e, (h.ref != v.ref || 8 & h.__u) && (h.ref && G$1(h.ref, null, v, h), v.ref && a.push(v.ref, v.__c || w, v)), d = d || w, 4 & v.__u ? (l = A$1(v, l, n, !h.__v), h.__e && (h.__e = null)) : "function" == typeof v.type && void 0 !== _ ? l = _ : w && (l = w.nextSibling), v.__u &= -21);
		return r.__e = d, l;
	}
	function q(n, t, r, u, i) {
		var f, o, e, l, c, a, s, p, y, v = r.length, d = v, _ = 0, g = 0, k = n.__k = Array(i);
		for (f = 0; f < i; f++) null != (o = t[f]) && "boolean" != typeof o && "function" != typeof o ? ("object" != typeof o || o.constructor === String ? o = k[f] = m$1(null, o) : w$1(o) ? o = k[f] = m$1($, { children: o }) : o.constructor === h$1 && o.__b ? o = k[f] = m$1(o.type, o.props, o.key, o.ref, o.__v) : k[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = P(o, r, l, d)) && (d--, (e = r[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 16, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = 1)) : (~c || (i > v ? _-- : i < v && _++), "function" != typeof o.type && (o.__u |= 4))) : k[f] = null;
		if (g) {
			for (a = [], s = [], f = 0; f < i; f++) if ((o = k[f]) && 16 & o.__u) {
				for (_ = 0, p = a.length; _ < p;) a[y = _ + p >> 1] < o.__i ? _ = y + 1 : p = y;
				a[_] = o.__i, s[f] = _ + 1;
			}
			for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
		}
		if (d) for (f = 0; f < v; f++) !(e = r[f]) || 2 & e.__u || (e.__e == u && (u = S(e)), J(e, e));
		return u;
	}
	function A$1(n, t, r, u) {
		var i, f, o, e;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (i = n.__k) for (f = 0; f < i.length; f++) i[f] && (i[f].__ = n, t = A$1(i[f], t, r, !1));
			return t;
		}
		for (t && !t.parentNode && (t = S(n)) && !t.parentNode && (t = null), o = n.__e, e = t; e && 8 == e.nodeType;) e = e.nextSibling;
		for (o != e && (!u && r.moveBefore && o.parentNode ? r.moveBefore(o, t) : r.insertBefore(o, t || null)), t = o; (t = t && t.nextSibling) && 8 == t.nodeType && !t.data.startsWith("$s"););
		return t;
	}
	function P(n, t, r, u) {
		var i, f = n.key, o = n.type, e = t[r], l = e && !(2 & e.__u);
		if (null === e && null == f || l && f == e.key && o == e.type) return r;
		if (u > (l ? 1 : 0)) {
			for (i = r - 1; i >= 0; i--) if ((e = t[i]) && !(2 & e.__u) && f == e.key && o == e.type) return i;
			for (i = r + 1; i < t.length; i++) if ((e = t[i]) && !(2 & e.__u) && f == e.key && o == e.type) return i;
		}
		return -1;
	}
	function T$1(n, t, r) {
		r ??= "", "-" == t[0] ? n.setProperty(t, r) : n[t] = r;
	}
	function N(n, t, r, u, i) {
		var f, o;
		if ("style" == t) if ("string" == typeof r) n.style.cssText = r;
		else {
			if ("string" == typeof u && (n.style.cssText = u = ""), u) for (t in u) r && t in r || T$1(n.style, t);
			if (r) for (t in r) u && r[t] == u[t] || T$1(n.style, t, r[t]);
		}
		else if ("o" == t[0] && "n" == t[1]) "function" != typeof r && (r = null), "function" != typeof u && (u = null), (n.__e || (n.__e = {}))[t] = r, r && u || (o = a$2[t] || (a$2[t] = V(t)), (n.__a || (n.__a = {}))[t] = c$1, f = t != (t = t.replace(l$1, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), r ? n.addEventListener(t, o, f) : n.removeEventListener(t, o, f));
		else {
			if ("http://www.w3.org/2000/svg" == i) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
			else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
				n[t] = null == r ? "" : r;
				return;
			} catch (n) {}
			if ("function" == typeof r) return;
			null == r || !1 === r && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == r ? "" : r);
		}
	}
	function V(t) {
		return function(r) {
			var u = this.__e;
			if (u) {
				if (u = u[t], null == r[e$1]) r[e$1] = c$1++;
				else if (r[e$1] < this.__a[t]) return;
				return u(n.event ? n.event(r) : r);
			}
		};
	}
	function z$1(t, r, u, i, f, o, e, l, c, a) {
		var s, p, v, d, k, b, m, M, C, j, L, H, q, A, O, P, T, N, V = r.type;
		if (r.constructor !== h$1) return null;
		128 & u.__u && (c = 32 & u.__u, s = u.__c.__z) && (r.__u |= c, p = o = [], 8 == s.nodeType ? l = B$1(s, o) : o.push(s), l = o[0] || l), (s = n.__b) && s(r);
		n: if ("function" == typeof V) {
			v = e.length;
			try {
				if (M = r.props, C = (s = V.prototype) && s.render, j = (s = V.contextType) && i[s.__c], L = s ? j ? j.props.value : s.__ : i, (d = u.__c) ? (r.__c = d, 2 & d.__g && (d.__g |= 1)) : (C ? r.__c = d = new V(M, L) : (r.__c = d = new x(M, L), d.constructor = V, d.render = K), j && j.sub(d), d.state || (d.state = {}), d.__n = i, d.__g |= 8, d.__h = [], d.__k = []), C && (d.__s || (d.__s = d.state), V.getDerivedStateFromProps && (d.__s == d.state && (d.__s = _$1({}, d.__s)), _$1(d.__s, V.getDerivedStateFromProps(M, d.__s)))), k = d.props, b = d.state, d.__v = r, u.__c) {
					if (M !== k && C && !V.getDerivedStateFromProps && d.componentWillReceiveProps && d.componentWillReceiveProps(M, L), r.__v == u.__v && !(8 & d.__g) || !(4 & d.__g) && d.shouldComponentUpdate && !1 === d.shouldComponentUpdate(M, d.__s, L)) {
						r.__v != u.__v && (d.props = M, d.state = d.__s, d.__g &= -9), r.__e = u.__e, r.__k = u.__k, r.__k.some(function(n) {
							n && (n.__ = r);
						}), y$1.push.apply(d.__h, d.__k), d.__k = [], d.__h.length && e.push(d), l = S(u);
						break n;
					}
					d.componentWillUpdate && d.componentWillUpdate(M, d.__s, L), C && d.componentDidUpdate && d.__h.push(function() {
						d.componentDidUpdate(k, b, m);
					});
				} else C && !V.getDerivedStateFromProps && d.componentWillMount && d.componentWillMount(), C && d.componentDidMount && d.__h.push(d.componentDidMount);
				d.context = L, d.props = M, d.__P = t, d.__g &= -5, H = n.__r, q = C ? 25 : 0;
				do
					d.__g &= -9, H && H(r), s = d.render(d.props, d.state = d.__s, d.context);
				while (8 & d.__g && ++q < 25);
				C && (y$1.push.apply(d.__h, d.__k), d.__k = []), d.state = d.__s, d.getChildContext && (i = _$1({}, i, d.getChildContext())), C && u.__c && d.getSnapshotBeforeUpdate && (m = d.getSnapshotBeforeUpdate(k, b)), A = s && s.type === $ && null == s.key ? s.props.children : s, M.__P && (s = l, f = (t = M.__P).namespaceURI, c = o = null, u.props && u.props.__P != t && (u.__k.some(function(n) {
					n && J(n, n);
				}), u.__k = null), l = u.__k ? S(u, 0) : null), l = I(t, w$1(A) ? A : [A], r, u, i, f, o, e, l, c, a), M.__P && (r.__e = null, l = s), r.__u &= -161, p && p.some(g$1), d.__h.length && e.push(d), 1 & d.__g && (d.__g &= -4);
			} catch (t) {
				if (e.length = v, r.__v = null, c || o) if (t && t.then) {
					if (r.__u |= 128 | c, o) {
						for (~(T = o.indexOf(l || void 0)) || (T = o.length); (N = o[T - 1]) && 8 == N.nodeType;) T--;
						for (; T < o.length; T++) if (N = o[T]) if (o[T] = null, O) {
							if (N == P) break;
						} else {
							if (8 != N.nodeType) break;
							N.data.startsWith("$s") && (P = B$1(O = N));
						}
					}
					if (!O) {
						for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
						O = l;
					}
					(s = B$1(O = r.__c.__z || (r.__c.__z = O))) ? (r.__e = O, l = s) : r.__e = l, l = l && l.nextSibling;
				} else o && o.some(g$1);
				else r.__e = u.__e;
				r.__k || (r.__k = u.__k || []), t && t.then || D$1(r), n.__e(t, r, u);
			}
		} else l = r.__e = F$1(u.__e, r, u, i, f, o, e, c, a, t);
		return (s = n.diffed) && s(r), l;
	}
	function B$1(n, t) {
		if (n && 8 == n.nodeType && n.data.startsWith("$s")) for (var r = 1; n = n.nextSibling;) {
			if (8 == n.nodeType) {
				if (n.data.startsWith("$s")) r++;
				else if (n.data.startsWith("/$s") && !--r) return n;
			}
			t && t.push(n);
		}
	}
	function D$1(n) {
		n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(D$1));
	}
	function E$1(t, r, u) {
		for (var i = 0; i < u.length;) G$1(u[i++], u[i++], u[i++]);
		n.__c && n.__c(r, t), t.some(function(r) {
			try {
				t = r.__h, r.__h = [], t.some(function(n) {
					n.call(r);
				});
			} catch (t) {
				n.__e(t, r.__v);
			}
		});
	}
	function F$1(t, r, u, i, f, o, e, l, c, a) {
		var s, h, y, _, k, b, m, M, $ = u.props || p$1, x = r.props, C = r.type;
		if ("svg" == C ? f = "http://www.w3.org/2000/svg" : "math" == C ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), o) {
			for (s = 0; s < o.length; s++) if ((k = o[s]) && (C ? k.localName == C : 3 == k.nodeType)) {
				t = k, o[s] = null;
				break;
			}
		}
		if (!t) {
			if (M = a.ownerDocument || document, !C) return M.createTextNode(x);
			t = M.createElementNS(f, C, x.is ? x : a), l && (n.__m && n.__m(r, o), l = !1), o = null;
		}
		if (C) {
			if (a = "template" == C && t.content || t, o = "textarea" == C && null != x.defaultValue ? null : o && d$1.call(a.childNodes), !l && o) for ($ = {}, s = 0; s < t.attributes.length; s++) $[(k = t.attributes[s]).name] = k.value;
			for (s in $) k = $[s], "dangerouslySetInnerHTML" == s ? y = k : "children" == s || s in x || "value" == s && "defaultValue" in x || "checked" == s && "defaultChecked" in x || N(t, s, null, k, f);
			for (s in x) k = x[s], "children" == s ? _ = k : "dangerouslySetInnerHTML" == s ? h = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || $[s] === k || N(t, s, k, $[s], f);
			h ? (l || y && (h.__html == y.__html || h.__html == t.innerHTML) || (t.innerHTML = h.__html), r.__k = []) : (y && (t.textContent = ""), ("foreignObject" == C || "http://www.w3.org/1998/Math/MathML" == f && v$1.test(C)) && (f = "http://www.w3.org/1999/xhtml"), I(a, w$1(_) ? _ : [_], r, u, i, f, o, e, o ? o[0] : u.__k && S(u, 0), l, c), o && o.some(g$1)), l && "textarea" != C || (s = "value", "progress" == C && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != C || b) || N(t, s, b, $[s], f), s = "checked", null != m && m != t[s] && N(t, s, m, $[s], f));
		} else $ === x || l && t.data == x || (t.data = x);
		return t;
	}
	function G$1(t, r, u, i) {
		try {
			"function" == typeof t ? r ? r.__x = t(r) || 1 : i && (i = i.__c || i.__e) && (r = i.__x) && (i.__x = null, "function" == typeof r ? r() : t(null)) : t.current = r;
		} catch (t) {
			n.__e(t, u);
		}
	}
	function J(t, r, u) {
		var i, f, o, e;
		if (n.unmount && n.unmount(t), !(i = t.ref) || i.current && i.current != t.__e || G$1(i, null, r, t), i = t.__c) {
			if (i.componentWillUnmount) try {
				i.componentWillUnmount();
			} catch (t) {
				n.__e(t, r);
			}
			i.__P = i.__n = null;
		}
		if (i = t.__k) for (e = 0; e < i.length; e++) i[e] && J(i[e], r, "function" != typeof t.type || u && !t.props.__P);
		!u && (i = t.__c) && (i = i.__z) && (f = B$1(i, o = [])) && (i == t.__e && o.some(g$1), g$1(f), g$1(i)), u || g$1(t.__e), t.__e = t.__c = t.__ = null;
	}
	function K(n, t, r) {
		return this.constructor(n, r);
	}
	function Q(t, r) {
		var u, i, f, o;
		n.__ && n.__(t, r), 9 == r.nodeType && (r = r.documentElement), i = (u = t && 32 & t.__u) ? null : r.__k, r.__k = m$1($, { children: [t] }), f = [], o = [], z$1(r, r.__k, i || p$1, p$1, r.namespaceURI, i ? null : r.firstChild ? d$1.call(r.childNodes) : null, f, i ? i.__e : r.firstChild, u, o), E$1(f, r.__k, o), r.__k.props.children = null;
	}
	n = { __e: function(n, t, r, u) {
		for (var i, o, e; t = t.__;) if ((i = t.__c) && !(1 & i.__g)) {
			i.__g |= 4;
			try {
				if ((e = (o = i.constructor) && o.getDerivedStateFromError) && i.setState(o.getDerivedStateFromError(n)), i.componentDidCatch && (i.componentDidCatch(n, u || {}), e = 1), e && 8 & i.__g) return void (i.__g |= 2);
			} catch (t) {
				n = t;
			}
		}
		throw f$2 = 0, n;
	} }, t$1 = 0, x.prototype.setState = function(n, t) {
		var r = this.__s;
		r && r != this.state || (r = this.__s = _$1({}, this.state)), "function" == typeof n && (n = n(_$1({}, r), this.props)), n && (_$1(r, n), this.__v && (t && this.__k.push(t), L(this)));
	}, x.prototype.forceUpdate = function(n) {
		this.__v && (this.__g |= 4, n && this.__h.push(n), L(this));
	}, x.prototype.render = $, u$2 = [], f$2 = 0, o$2 = function(n, t) {
		return n.__v.__b - t.__v.__b;
	}, e$1 = Symbol(), l$1 = /(PointerCapture)$|Capture$/i, c$1 = 0, a$2 = {};
	var t;
	var r;
	var u$1;
	var i;
	var o$1 = Object.is;
	var f$1 = 0;
	var c = [];
	var e = [];
	var a$1 = n;
	var v = a$1.__b;
	var l = a$1.__r;
	var m = a$1.diffed;
	var h = a$1.__c;
	var s = a$1.unmount;
	var p = a$1.__;
	function y(n, t) {
		a$1.__h && a$1.__h(r, n, f$1 || t), f$1 = 0;
		var u = r.__H || (r.__H = {
			__: [],
			__h: []
		});
		return n >= u.__.length && u.__.push({}), u.__[n];
	}
	function d(n) {
		return f$1 = 1, _(G, n);
	}
	function _(n, u, i) {
		var f = y(t++, 2);
		if (f.t = n, !f.__c && (f.__ = [i ? i(u) : G(void 0, u), function(n) {
			var t = (f.__N || f.__)[0], r = f.t(t, n);
			o$1(t, r) || (f.__N = [r, f.__[1]], f.__c.setState({}));
		}], f.__c = r, !r.__f)) {
			r.__f = !0;
			var c = r.shouldComponentUpdate;
			r.shouldComponentUpdate = function(n, t, r) {
				var u = this.__H;
				if (!u) return !0;
				var i = !1, f = this.props != n;
				if (u.__.some(function(n) {
					n.__N && (i = !0, o$1(n.__[0], n.__N[0]) || (f = !0));
				}), c) {
					var e = c.call(this, n, t, r);
					return i ? e || f : e;
				}
				return !i || f;
			};
		}
		return f.__;
	}
	function A(n, u) {
		var i = y(t++, 3);
		!a$1.__s && E(i.__H, u) && (i.__P = !0, i.__ = n, i.u = u, r.__H.__h.push(i));
	}
	function F(n, u) {
		var i = y(t++, 4);
		!a$1.__s && E(i.__H, u) && (i.__P = !1, i.__ = n, i.u = u, r.__h.push(i));
	}
	function T(n) {
		return f$1 = 5, w(function() {
			return { current: n };
		}, []);
	}
	function w(n, r) {
		var u = y(t++, 7);
		return E(u.__H, r) && (u.__ = n(), u.__H = r), u.__;
	}
	function g() {
		var n;
		do {
			for (; n = e.shift();) try {
				C(n);
			} catch (t) {
				a$1.__e(t, { __: (n = n.__P) && n.__v });
			}
			for (; n = c.shift();) {
				var t = n.__H;
				if (n.__P && t) try {
					t.__h.some(C), t.__h.some(D), t.__h = [];
				} catch (r) {
					t.__h = [], a$1.__e(r, n.__v);
				}
			}
		} while (e.length);
	}
	a$1.__b = function(n) {
		r = null, v && v(n);
	}, a$1.__ = function(n, t) {
		n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p && p(n, t);
	}, a$1.__r = function(n) {
		l && l(n), t = 0;
		var i = (r = n.__c).__H;
		i && (u$1 == r ? r.__h = [] : (i.__h.some(C), i.__h.some(D), t = 0), i.__h = [], i.__.some(function(n) {
			n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
		})), u$1 = r;
	}, a$1.diffed = function(n) {
		m && m(n);
		var t = n.__c;
		t && t.__H && (t.__H.__h.length && B(c.push(t)), t.__H.__.some(function(n) {
			n.u && (n.__H = n.u);
		})), u$1 = r = null;
	}, a$1.__c = function(n, t) {
		t.some(function(n) {
			try {
				n.__h.some(C), n.__h = n.__h.filter(function(n) {
					return !n.__ || D(n);
				});
			} catch (t) {
				n.__h = [function() {
					throw t;
				}];
			}
		}), h && h(n, t);
	}, a$1.unmount = function(n) {
		s && s(n);
		var t, r, u = n.__c;
		u && u.__H && (u.__H.__.some(function(u) {
			try {
				if (u.__P && u.__c) {
					if (void 0 === r) {
						for (r = n.__; r && (!r.__c || !r.__c.__P);) r = r.__;
						r = r && r.__c;
					}
					u.__P = r, B(e.push(u));
				} else C(u);
			} catch (n) {
				t = n;
			}
		}), u.__H = void 0, t && a$1.__e(t, u.__v));
	};
	var k = "function" == typeof requestAnimationFrame;
	function z(n) {
		var t, r = function() {
			clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
		}, u = setTimeout(r, 35);
		k && (t = requestAnimationFrame(r));
	}
	function B(n) {
		1 != n && i == a$1.requestAnimationFrame || ((i = a$1.requestAnimationFrame) || z)(g);
	}
	function C(n) {
		var t = r, u = n.__c;
		"function" == typeof u && (n.__c = void 0, u()), r = t;
	}
	function D(n) {
		var t = r;
		n.__c = n.__(), r = t;
	}
	function E(n, t) {
		return !n || n.length != t.length || t.some(function(t, r) {
			return !o$1(t, n[r]);
		});
	}
	function G(n, t) {
		return "function" == typeof t ? t(n) : t;
	}
	var f = Symbol.for("pv");
	var o = 0;
	Array.isArray;
	function a(t, e, n$1, u, a, i) {
		e || (e = {});
		var c, l, p = e;
		if ("ref" in p && "function" != typeof t) for (l in p = {}, e) "ref" == l ? c = e[l] : p[l] = e[l];
		var s = {
			type: t,
			props: p,
			key: n$1,
			ref: c,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: f,
			__v: --o,
			__i: -1,
			__u: 0
		};
		return (a || i) && (s.__source = a, s.__self = i), n.vnode && n.vnode(s), s;
	}
	var ICON = {
		search: "M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z",
		filter: "M.75 3h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1 0-1.5ZM3 7.75A.75.75 0 0 1 3.75 7h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 7.75Zm3 4a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z",
		x: "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z",
		trash: "M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.576l-.66-6.6a.75.75 0 1 1 1.492-.149ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z",
		sun: "M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Zm9.193 9.193a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Z",
		moon: "M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z",
		desktop: "M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 14.25 12h-3.727c.099 1.041.52 1.872 1.292 2.757A.752.752 0 0 1 11.25 16h-6.5a.752.752 0 0 1-.565-1.243c.772-.885 1.192-1.716 1.292-2.757H1.75A1.75 1.75 0 0 1 0 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z",
		copy: "M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z",
		check: "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z",
		arrowRight: "M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z",
		chevronDown: "M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z",
		star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
		gitFork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
		calendar: "M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-2a.25.25 0 0 0-.25-.25H2.75a.25.25 0 0 0-.25.25V6h10.5Z",
		code: "M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25Zm6.56 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L13.94 8l-3.72-3.72a.75.75 0 0 1 0-1.06Z"
	};
	function Icon({ name, size = 16, className }) {
		return a("svg", {
			viewBox: "0 0 16 16",
			width: size,
			height: size,
			class: className,
			"aria-hidden": "true",
			focusable: "false",
			children: a("path", { d: ICON[name] })
		});
	}
	function iconSvg(name, size = 16) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 16 16");
		svg.setAttribute("width", String(size));
		svg.setAttribute("height", String(size));
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", ICON[name]);
		svg.append(path);
		return svg;
	}
	var CYCLE = [
		"auto",
		"light",
		"dark"
	];
	var LABEL = {
		auto: "Theme: matches GitHub",
		light: "Theme: light",
		dark: "Theme: dark"
	};
	var THEME_ICON = {
		auto: "desktop",
		light: "sun",
		dark: "moon"
	};
	function getTheme() {
		const stored = getStoredTheme();
		return CYCLE.includes(stored) ? stored : "auto";
	}
	var setTheme = setStoredTheme;
	var nextTheme = (theme) => CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
	var panelControl = null;
	var host = null;
	var setExpanded = (open) => document.getElementById(IDS.fab)?.setAttribute("aria-expanded", String(open));
	var search = (state) => location.assign(buildUrl(state));
	var THUMB = 16;
	var formatCount = (value) => {
		if (value < 1e3) return String(value);
		const thousands = Math.round(value / 100) / 10;
		return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
	};
	function rangeReadout(range) {
		if (range.min > 0 && range.max > 0) return `${formatCount(range.min)} – ${formatCount(range.max)}`;
		if (range.min > 0) return `${formatCount(range.min)}+`;
		if (range.max > 0) return `≤ ${formatCount(range.max)}`;
		return "Any";
	}
	function dateReadout(range) {
		if (range.from && range.to) return range.from === range.to ? range.from : `${range.from} – ${range.to}`;
		if (range.from) return `From ${range.from}`;
		if (range.to) return `Until ${range.to}`;
		return "Any time";
	}
	function KeywordRow({ id, label, placeholder, value, onChange }) {
		const inputId = `ghf-${id}`;
		return a("div", {
			class: "ghf-field",
			children: [a("label", {
				class: "ghf-label",
				for: inputId,
				children: label
			}), a("div", {
				class: "ghf-input-wrap",
				children: [a("input", {
					id: inputId,
					class: "ghf-input",
					type: "text",
					value,
					placeholder,
					autocomplete: "off",
					spellcheck: false,
					onInput: (event) => onChange(event.currentTarget.value)
				}), value ? a("button", {
					type: "button",
					class: "ghf-clear-btn",
					"aria-label": `Clear ${label}`,
					onClick: () => onChange(""),
					children: a(Icon, {
						name: "x",
						size: 12
					})
				}) : null]
			})]
		});
	}
	function LanguageRow({ value, onChange }) {
		const currentTokens = tokenize(value);
		const toggleLang = (langName) => {
			onChange((currentTokens.some((t) => t.toLowerCase() === langName.toLowerCase()) ? currentTokens.filter((t) => t.toLowerCase() !== langName.toLowerCase()) : [...currentTokens, langName]).join(", "));
		};
		return a("div", {
			class: "ghf-field",
			children: [
				a("div", {
					class: "ghf-field-label-row",
					children: [a("label", {
						class: "ghf-label",
						for: "ghf-lang",
						children: "Language"
					}), value && a("button", {
						type: "button",
						class: "ghf-clear-btn",
						"aria-label": "Clear language",
						onClick: () => onChange(""),
						children: a(Icon, {
							name: "x",
							size: 12
						})
					})]
				}),
				a("div", {
					class: "ghf-input-wrap",
					children: a("input", {
						id: "ghf-lang",
						class: "ghf-input",
						type: "text",
						value,
						placeholder: "e.g. python, -html",
						autocomplete: "off",
						spellcheck: false,
						onInput: (event) => onChange(event.currentTarget.value)
					})
				}),
				a("div", {
					class: "ghf-chips",
					children: POPULAR_LANGUAGES.map((lang) => {
						return a("button", {
							type: "button",
							class: currentTokens.some((t) => t.toLowerCase() === lang.toLowerCase()) ? "ghf-chip ghf-chip-active" : "ghf-chip",
							onClick: () => toggleLang(lang),
							children: lang
						}, lang);
					})
				})
			]
		});
	}
	function RepoRow({ value, onChange }) {
		return a("div", {
			class: "ghf-field",
			children: [a("label", {
				class: "ghf-label",
				for: "ghf-repo",
				children: "Target Repository"
			}), a("div", {
				class: "ghf-input-wrap",
				children: [a("input", {
					id: "ghf-repo",
					class: "ghf-input",
					type: "text",
					value,
					placeholder: "e.g. facebook/react",
					autocomplete: "off",
					spellcheck: false,
					onInput: (event) => onChange(event.currentTarget.value)
				}), value ? a("button", {
					type: "button",
					class: "ghf-clear-btn",
					"aria-label": "Clear repo",
					onClick: () => onChange(""),
					children: a(Icon, {
						name: "x",
						size: 12
					})
				}) : null]
			})]
		});
	}
	function RangeRow({ field, value, onChange }) {
		const { stops } = field;
		const last = stops.length - 1;
		const [lead, setLead] = d("max");
		const lo = value.min > 0 ? toIndex(stops, value.min, "min") : 0;
		const hi = value.max > 0 ? toIndex(stops, value.max, "max") : last;
		const filtered = value.min > 0 || value.max > 0;
		const setLo = (index) => onChange({
			min: fromIndex(stops, Math.min(index, hi), "min"),
			max: value.max
		});
		const setHi = (index) => onChange({
			min: value.min,
			max: fromIndex(stops, Math.max(index, lo, 1), "max")
		});
		const jump = (event) => {
			if (event.target !== event.currentTarget) return;
			const rect = event.currentTarget.getBoundingClientRect();
			const usable = Math.max(rect.width - THUMB, 1);
			const ratio = Math.min(Math.max((event.clientX - rect.left - THUMB / 2) / usable, 0), 1);
			const index = Math.round(ratio * last);
			if (index < lo) {
				setLead("min");
				setLo(index);
			} else if (index > hi) {
				setLead("max");
				setHi(index);
			} else if (index - lo < hi - index) {
				setLead("min");
				setLo(index);
			} else {
				setLead("max");
				setHi(index);
			}
		};
		return a("div", {
			class: "ghf-slider-row",
			children: [
				a("div", {
					class: "ghf-slider-header",
					children: [a("span", {
						class: "ghf-slider-title",
						children: [a(Icon, {
							name: field.id === "stars" ? "star" : "gitFork",
							size: 14
						}), field.label]
					}), a("div", {
						class: "ghf-field-label-row",
						children: [a("span", {
							class: "ghf-readout-badge",
							children: rangeReadout(value)
						}), filtered && a("button", {
							type: "button",
							class: "ghf-clear-btn",
							"aria-label": `Clear ${field.label}`,
							onClick: () => onChange({
								min: 0,
								max: 0
							}),
							children: a(Icon, {
								name: "x",
								size: 12
							})
						})]
					})]
				}),
				a("div", {
					class: "ghf-slider",
					onPointerDown: jump,
					children: [
						a("div", {
							class: "ghf-slider-track",
							children: filtered && a("div", {
								class: "ghf-slider-fill",
								style: {
									left: `${lo / last * 100}%`,
									right: `${(1 - hi / last) * 100}%`
								}
							})
						}),
						a("input", {
							type: "range",
							min: 0,
							max: last,
							step: 1,
							value: lo,
							"aria-label": `Minimum ${field.label.toLowerCase()}`,
							"aria-valuetext": value.min > 0 ? `${formatCount(value.min)} or more` : "No minimum",
							style: { zIndex: lead === "min" ? 3 : 2 },
							onFocus: () => setLead("min"),
							onPointerDown: () => setLead("min"),
							onInput: (event) => {
								setLead("min");
								setLo(Number(event.currentTarget.value));
							}
						}),
						a("input", {
							type: "range",
							min: 0,
							max: last,
							step: 1,
							value: hi,
							"aria-label": `Maximum ${field.label.toLowerCase()}`,
							"aria-valuetext": value.max > 0 ? `Up to ${formatCount(value.max)}` : "No maximum",
							style: { zIndex: lead === "max" ? 3 : 2 },
							onFocus: () => setLead("max"),
							onPointerDown: () => setLead("max"),
							onInput: (event) => {
								setLead("max");
								setHi(Number(event.currentTarget.value));
							}
						})
					]
				}),
				field.id === "stars" && a("div", {
					class: "ghf-chips",
					children: STAR_PRESETS.map((preset) => {
						const active = value.min === preset && value.max === 0;
						return a("button", {
							type: "button",
							class: active ? "ghf-chip ghf-chip-active" : "ghf-chip",
							onClick: () => onChange({
								min: active ? 0 : preset,
								max: 0
							}),
							children: [formatCount(preset), "+"]
						}, preset);
					})
				})
			]
		});
	}
	function DateRow({ field, value, onChange }) {
		const filtered = Boolean(value.from || value.to);
		const applyPreset = (days) => {
			onChange({
				from: shiftDays(new Date().toISOString().slice(0, 10), -days),
				to: ""
			});
		};
		return a("div", {
			class: "ghf-slider-row",
			children: [
				a("div", {
					class: "ghf-slider-header",
					children: [a("span", {
						class: "ghf-slider-title",
						children: [a(Icon, {
							name: "calendar",
							size: 14
						}), field.label]
					}), a("div", {
						class: "ghf-field-label-row",
						children: [a("span", {
							class: "ghf-readout-badge",
							children: dateReadout(value)
						}), filtered && a("button", {
							type: "button",
							class: "ghf-clear-btn",
							"aria-label": `Clear ${field.label}`,
							onClick: () => onChange({
								from: "",
								to: ""
							}),
							children: a(Icon, {
								name: "x",
								size: 12
							})
						})]
					})]
				}),
				a("div", {
					class: "ghf-date-grid",
					children: [
						a("input", {
							class: "ghf-date-input",
							type: "date",
							value: value.from,
							max: value.to || void 0,
							"aria-label": `${field.label} on or after`,
							onInput: (event) => onChange({
								...value,
								from: event.currentTarget.value
							})
						}),
						a("span", {
							class: "ghf-date-sep",
							"aria-hidden": "true",
							children: "→"
						}),
						a("input", {
							class: "ghf-date-input",
							type: "date",
							value: value.to,
							min: value.from || void 0,
							"aria-label": `${field.label} on or before`,
							onInput: (event) => onChange({
								...value,
								to: event.currentTarget.value
							})
						})
					]
				}),
				a("div", {
					class: "ghf-chips",
					children: [
						{
							label: "Past 7 days",
							days: 7
						},
						{
							label: "Past 30 days",
							days: 30
						},
						{
							label: "Past year",
							days: 365
						}
					].map((p) => a("button", {
						type: "button",
						class: "ghf-chip",
						onClick: () => applyPreset(p.days),
						children: p.label
					}, p.days))
				})
			]
		});
	}
	function PresetCard({ preset, pending, onLoad, onRun, onDelete }) {
		const parts = queryParts(preset.state);
		const summary = buildQuery(preset.state) || "All repositories";
		return a("li", {
			class: "ghf-preset-card",
			children: [a("div", {
				class: "ghf-preset-top",
				children: [a("span", {
					class: "ghf-preset-name",
					children: preset.name
				}), a("div", {
					class: "ghf-preset-actions",
					children: [
						a("button", {
							type: "button",
							class: "ghf-btn",
							onClick: onLoad,
							title: "Load into builder",
							children: "Load"
						}),
						a("button", {
							type: "button",
							class: "ghf-btn ghf-btn-primary",
							onClick: onRun,
							title: "Run search",
							children: ["Run", a(Icon, {
								name: "arrowRight",
								size: 12
							})]
						}),
						a("button", {
							type: "button",
							class: "ghf-icon-btn",
							style: { color: pending ? "var(--ghf-danger)" : void 0 },
							title: pending ? "Click again to confirm delete" : "Delete preset",
							onClick: onDelete,
							children: pending ? a("span", {
								style: {
									fontSize: "11px",
									fontWeight: 600
								},
								children: "Sure?"
							}) : a(Icon, {
								name: "trash",
								size: 13
							})
						})
					]
				})]
			}), a("div", {
				class: "ghf-preset-query",
				title: summary,
				children: parts.length ? parts.map((p) => a("span", {
					class: "ghf-tape-chip",
					style: { marginRight: "4px" },
					children: p.text
				}, p.text)) : a("span", { children: summary })
			})]
		});
	}
	function App() {
		const dialogRef = T(null);
		const bodyRef = T(null);
		const nameRef = T(null);
		const copyTimer = T(void 0);
		const [state, setState] = d(emptyState);
		const [tab, setTab] = d("builder");
		const [theme, setTheme$1] = d(getTheme);
		const [presets, setPresets] = d(getPresets);
		const [name, setName] = d("");
		const [error, setError] = d("");
		const [pendingDelete, setPendingDelete] = d(null);
		const [copied, setCopied] = d(false);
		const [openRequest, setOpenRequest] = d(0);
		const parts = w(() => queryParts(state), [state]);
		const activeCount = w(() => countActiveFilters(state), [state]);
		const setField = (key, value) => setState((current) => ({
			...current,
			[key]: value
		}));
		const reset = () => {
			setState(emptyState());
			setError("");
		};
		const handleRemovePart = (part) => {
			setState((current) => removeQueryPart(current, part));
		};
		const loadPreset = (preset) => {
			setState(preset.state);
			setTab("builder");
		};
		const savePreset = () => {
			if (!parts.length) {
				setError("Add at least one search term or filter to save.");
				return;
			}
			const trimmed = name.trim();
			if (!trimmed) {
				setError("Please give this preset a name.");
				nameRef.current?.focus();
				return;
			}
			setPresets(addPreset(trimmed, state));
			setName("");
			setError("");
		};
		const deletePreset = (id) => {
			if (pendingDelete !== id) {
				setPendingDelete(id);
				return;
			}
			setPresets(removePreset(id));
			setPendingDelete(null);
		};
		const copyQuery = () => {
			const text = buildQuery(state);
			if (!text) return;
			navigator.clipboard?.writeText(text).then(() => {
				setCopied(true);
				window.clearTimeout(copyTimer.current);
				copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
			}).catch(() => {});
		};
		const cycleTheme = () => {
			const next = nextTheme(theme);
			setTheme$1(next);
			setTheme(next);
		};
		F(() => {
			panelControl = { toggle(next) {
				const dialog = dialogRef.current;
				if (!dialog) return;
				if (dialog.open) {
					dialog.close();
					return;
				}
				setState(next);
				setTab("builder");
				setPresets(getPresets());
				setOpenRequest((request) => request + 1);
			} };
			return () => {
				panelControl = null;
			};
		}, []);
		F(() => {
			if (!openRequest) return;
			const dialog = dialogRef.current;
			if (!dialog || dialog.open) return;
			dialog.showModal();
			setExpanded(true);
			dialog.querySelector(".ghf-input")?.focus();
		}, [openRequest]);
		A(() => {
			dialogRef.current?.setAttribute("data-theme", theme);
			document.getElementById(IDS.fab)?.setAttribute("data-theme", theme);
		}, [theme]);
		A(() => {
			bodyRef.current?.scrollTo({ top: 0 });
			setPendingDelete(null);
		}, [tab]);
		A(() => {
			setPendingDelete(null);
		}, [presets.length]);
		A(() => () => window.clearTimeout(copyTimer.current), []);
		const close = () => dialogRef.current?.close();
		const tabKeyDown = (event) => {
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
			event.preventDefault();
			const next = tab === "builder" ? "presets" : "builder";
			setTab(next);
			document.getElementById(`ghf-tab-${next}`)?.focus();
		};
		const hideWords = tokenize(state.hide).map((word) => word.replace(/^-?"|"$/g, ""));
		return a("dialog", {
			id: IDS.panel,
			ref: dialogRef,
			"aria-labelledby": "ghf-panel-title",
			onClose: () => {
				setExpanded(false);
				setPendingDelete(null);
			},
			onClick: (event) => {
				if (event.target === dialogRef.current) close();
			},
			onKeyDown: (event) => {
				if (event.key === "Escape") close();
			},
			children: a("form", {
				class: "ghf-form",
				onSubmit: (event) => {
					event.preventDefault();
					search(state);
				},
				children: [
					a("header", {
						class: "ghf-head",
						children: [a("div", {
							class: "ghf-titlebar",
							children: [a("div", {
								class: "ghf-brand",
								children: [
									a("span", {
										class: "ghf-brand-icon",
										children: a(Icon, {
											name: "filter",
											size: 15
										})
									}),
									a("h2", {
										id: "ghf-panel-title",
										children: NAME
									}),
									a("span", {
										class: "ghf-badge-shortcut",
										title: "Keyboard shortcut",
										children: SHORTCUT_LABEL
									})
								]
							}), a("nav", { children: [a("button", {
								type: "button",
								class: "ghf-icon-btn",
								title: LABEL[theme],
								"aria-label": LABEL[theme],
								onClick: cycleTheme,
								children: a(Icon, {
									name: THEME_ICON[theme],
									size: 15
								})
							}), a("button", {
								type: "button",
								class: "ghf-icon-btn",
								title: "Close",
								"aria-label": "Close",
								onClick: close,
								children: a(Icon, {
									name: "x",
									size: 16
								})
							})] })]
						}), a("div", {
							class: "ghf-tabs",
							role: "tablist",
							"aria-label": "Search sections",
							onKeyDown: tabKeyDown,
							children: [a("button", {
								type: "button",
								role: "tab",
								id: "ghf-tab-builder",
								class: "ghf-tab-btn",
								"aria-selected": tab === "builder",
								"aria-controls": "ghf-panel-builder",
								tabIndex: tab === "builder" ? 0 : -1,
								onClick: () => setTab("builder"),
								children: ["Builder", activeCount > 0 && a("span", {
									class: "ghf-pill-badge",
									children: activeCount
								})]
							}), a("button", {
								type: "button",
								role: "tab",
								id: "ghf-tab-presets",
								class: "ghf-tab-btn",
								"aria-selected": tab === "presets",
								"aria-controls": "ghf-panel-presets",
								tabIndex: tab === "presets" ? 0 : -1,
								onClick: () => setTab("presets"),
								children: ["Saved Presets", presets.length > 0 && a("span", {
									class: "ghf-pill-badge",
									children: presets.length
								})]
							})]
						})]
					}),
					a("div", {
						class: "ghf-body",
						ref: bodyRef,
						children: [a("div", {
							id: "ghf-panel-builder",
							role: "tabpanel",
							"aria-labelledby": "ghf-tab-builder",
							hidden: tab !== "builder",
							children: [
								a("div", {
									class: "ghf-card",
									children: [a("div", {
										class: "ghf-card-head",
										children: a("h3", {
											class: "ghf-card-title",
											children: [a(Icon, {
												name: "search",
												size: 14
											}), "Keywords & Search Terms"]
										})
									}), a("div", {
										class: "ghf-field-group",
										children: KEYWORDS.map((field) => a(KeywordRow, {
											id: field.id,
											label: field.label,
											placeholder: field.placeholder,
											value: state[field.id],
											onChange: (value) => setField(field.id, value)
										}, field.id))
									})]
								}),
								a("div", {
									class: "ghf-card",
									children: [a("div", {
										class: "ghf-card-head",
										children: [a("h3", {
											class: "ghf-card-title",
											children: [a(Icon, {
												name: "code",
												size: 14
											}), "Repository & Language"]
										}), a("div", {
											class: "ghf-sort-wrap",
											children: [a("select", {
												class: "ghf-sort-select",
												value: state.sort,
												"aria-label": "Sort repositories",
												onChange: (event) => setField("sort", event.currentTarget.value),
												children: SORTS.map((sort) => a("option", {
													value: sort.value,
													children: sort.label
												}, sort.value))
											}), a(Icon, {
												name: "chevronDown",
												size: 12
											})]
										})]
									}), a("div", {
										class: "ghf-field-group",
										children: [a(RepoRow, {
											value: state.repo,
											onChange: (val) => setField("repo", val)
										}), a(LanguageRow, {
											value: state.lang,
											onChange: (val) => setField("lang", val)
										})]
									})]
								}),
								a("div", {
									class: "ghf-card",
									children: [a("div", {
										class: "ghf-card-head",
										children: a("h3", {
											class: "ghf-card-title",
											children: [a(Icon, {
												name: "star",
												size: 14
											}), "Metrics & Popularity"]
										})
									}), a("div", {
										class: "ghf-field-group",
										children: QUALIFIERS.filter((f) => f.kind === "number").map((field) => a(RangeRow, {
											field,
											value: state[field.id],
											onChange: (next) => setField(field.id, next)
										}, field.id))
									})]
								}),
								a("div", {
									class: "ghf-card",
									children: [a("div", {
										class: "ghf-card-head",
										children: a("h3", {
											class: "ghf-card-title",
											children: [a(Icon, {
												name: "calendar",
												size: 14
											}), "Activity & Dates"]
										})
									}), a("div", {
										class: "ghf-field-group",
										children: QUALIFIERS.filter((f) => f.kind === "date").map((field) => a(DateRow, {
											field,
											value: state[field.id],
											onChange: (next) => setField(field.id, next)
										}, field.id))
									})]
								})
							]
						}), a("div", {
							id: "ghf-panel-presets",
							role: "tabpanel",
							"aria-labelledby": "ghf-tab-presets",
							hidden: tab !== "presets",
							children: [a("div", {
								class: "ghf-card",
								children: [
									a("div", {
										class: "ghf-card-head",
										children: a("h3", {
											class: "ghf-card-title",
											children: "Save Current Search"
										})
									}),
									a("div", {
										class: "ghf-save-bar",
										children: [a("div", {
											class: "ghf-input-wrap",
											style: { flex: 1 },
											children: a("input", {
												ref: nameRef,
												class: "ghf-input",
												type: "text",
												placeholder: "e.g. Active Rust Projects",
												"aria-label": "Preset name",
												maxLength: 60,
												value: name,
												onInput: (event) => {
													setName(event.currentTarget.value);
													setError("");
												},
												onKeyDown: (event) => {
													if (event.key === "Enter") {
														event.preventDefault();
														savePreset();
													}
												}
											})
										}), a("button", {
											type: "button",
											class: "ghf-btn ghf-btn-primary",
											disabled: !parts.length || !name.trim(),
											onClick: savePreset,
											children: "Save"
										})]
									}),
									error && a("p", {
										class: "ghf-error-msg",
										children: error
									})
								]
							}), presets.length ? a("ul", {
								class: "ghf-preset-list",
								children: presets.map((preset) => a(PresetCard, {
									preset,
									pending: pendingDelete === preset.id,
									onLoad: () => loadPreset(preset),
									onRun: () => search(preset.state),
									onDelete: () => deletePreset(preset.id)
								}, preset.id))
							}) : a("div", {
								class: "ghf-empty-presets",
								children: [
									a(Icon, {
										name: "filter",
										size: 24
									}),
									a("h4", {
										class: "ghf-empty-title",
										children: "No saved presets yet"
									}),
									a("p", {
										class: "ghf-empty-text",
										children: "Configure filters in the Builder tab and name them above to quickly re-run queries later."
									}),
									a("button", {
										type: "button",
										class: "ghf-btn",
										onClick: () => setTab("builder"),
										children: "Open Builder"
									})
								]
							})]
						})]
					}),
					tab === "builder" && a("footer", {
						class: "ghf-foot",
						children: [a("div", {
							class: "ghf-tape-card",
							children: [
								a("div", {
									class: "ghf-tape-head",
									children: [a("span", {
										class: "ghf-tape-title",
										children: "Live GitHub Query"
									}), a("button", {
										type: "button",
										class: "ghf-copy-btn",
										disabled: !parts.length,
										onClick: copyQuery,
										"aria-live": "polite",
										children: [a(Icon, {
											name: copied ? "check" : "copy",
											size: 12
										}), copied ? "Copied!" : "Copy"]
									})]
								}),
								a("div", {
									class: "ghf-tape-chips",
									children: parts.length ? parts.map((part, index) => {
										const colonIdx = part.text.indexOf(":");
										return a("span", {
											class: "ghf-tape-chip",
											children: [colonIdx !== -1 && part.kind === "qualifier" ? a($, { children: [a("span", {
												class: "ghf-tape-chip-key",
												children: part.text.slice(0, colonIdx + 1)
											}), a("span", { children: part.text.slice(colonIdx + 1) })] }) : a("span", { children: part.text }), a("button", {
												type: "button",
												class: "ghf-tape-chip-remove",
												title: `Remove ${part.text}`,
												"aria-label": `Remove ${part.text}`,
												onClick: () => handleRemovePart(part),
												children: a(Icon, {
													name: "x",
													size: 10
												})
											})]
										}, `${index}:${part.text}`);
									}) : a("span", {
										class: "ghf-tape-empty",
										children: "No active filters — add keywords or qualifiers above."
									})
								}),
								hideWords.length > 0 && a("div", {
									class: "ghf-tape-hide",
									children: ["🚫 Hiding results matching: ", a("b", { children: hideWords.join(", ") })]
								})
							]
						}), a("div", {
							class: "ghf-actions-bar",
							children: [a("button", {
								type: "button",
								class: "ghf-btn",
								disabled: activeCount === 0,
								onClick: reset,
								children: "Reset"
							}), a("button", {
								type: "submit",
								class: "ghf-btn ghf-btn-primary",
								title: "Search GitHub (Enter)",
								children: ["Search GitHub", a(Icon, {
									name: "arrowRight",
									size: 14
								})]
							})]
						})]
					})
				]
			})
		});
	}
	function mount() {
		if (!document.body) return;
		if (!host) {
			host = document.createElement("div");
			host.id = "ghf-root";
			Q(a(App, {}), host);
		}
		if (!host.isConnected) document.body.append(host);
	}
	function openPanel() {
		syncLauncher();
		mount();
		panelControl?.toggle(parseUrl(location.search));
	}
	function updateFabBadge(button, count) {
		let badge = button.querySelector(".ghf-fab-badge");
		if (!badge) {
			badge = document.createElement("span");
			badge.className = "ghf-fab-badge";
			button.append(badge);
		}
		badge.textContent = String(count);
		badge.style.display = count > 0 ? "inline-flex" : "none";
	}
	function syncLauncher() {
		try {
			if (window.self !== window.top) return;
		} catch {
			return;
		}
		if (!document.body) return;
		const activeCount = countActiveFilters(parseUrl(location.search));
		const existing = document.getElementById(IDS.fab);
		if (existing) {
			if (!existing.isConnected) document.body.append(existing);
			updateFabBadge(existing, activeCount);
			return;
		}
		const button = document.createElement("button");
		button.id = IDS.fab;
		button.type = "button";
		button.title = `${NAME} (${SHORTCUT_LABEL})`;
		button.setAttribute("aria-label", `${NAME} (${SHORTCUT_LABEL})`);
		button.setAttribute("aria-haspopup", "dialog");
		button.setAttribute("aria-expanded", String(dialogRefOpen()));
		button.dataset.theme = getTheme();
		button.append(iconSvg("filter", 16));
		const text = document.createElement("span");
		text.className = "ghf-fab-text";
		text.textContent = "Filter";
		button.append(text);
		const badge = document.createElement("span");
		badge.className = "ghf-fab-badge";
		badge.textContent = String(activeCount);
		badge.style.display = activeCount > 0 ? "inline-flex" : "none";
		button.append(badge);
		button.addEventListener("click", openPanel);
		document.body.append(button);
		observeLauncher();
	}
	var dialogRefOpen = () => document.getElementById(IDS.panel)?.hasAttribute("open") ?? false;
	var launcherObserved = false;
	function observeLauncher() {
		if (launcherObserved) return;
		launcherObserved = true;
		new MutationObserver(() => syncLauncher()).observe(document.documentElement, { childList: true });
	}
	var safe = (step) => {
		try {
			step();
		} catch {}
	};
	var init = () => {
		safe(migrateLegacyStorage);
		safe(injectStyles);
		safe(syncLauncher);
		safe(watchResults);
	};
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
	else init();
	var recheck = () => requestAnimationFrame(() => safe(syncLauncher));
	for (const event of NAV_EVENTS) document.addEventListener(event, recheck);
	window.addEventListener("popstate", recheck);
	window.addEventListener("pageshow", recheck);
	window.addEventListener("keydown", (event) => {
		if (event.altKey && event.code === "KeyF" || (event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "KeyF") {
			event.preventDefault();
			openPanel();
		}
	});
	GM_registerMenuCommand("GitHub Filter", openPanel);
})();
