// ==UserScript==
// @name         GitHub Filter
// @namespace    https://github.com/quantavil/userscript/github-filter
// @version      10.0.0
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
			placeholder: "rust async"
		},
		{
			id: "or",
			key: "any",
			label: "Any of these words",
			placeholder: "react, vue"
		},
		{
			id: "hide",
			key: "hide",
			label: "Hide results containing",
			placeholder: "spam, bot"
		}
	];
	var QUALIFIERS = [
		{
			kind: "text",
			id: "repo",
			label: "Repo",
			qualifier: "repo",
			placeholder: "facebook/react"
		},
		{
			kind: "text",
			id: "lang",
			label: "Language",
			qualifier: "language",
			aliases: ["lang"],
			placeholder: "python, -html"
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
	var splitTerms = (input) => input.match(/-?"[^"]*"|\S+/g) ?? [];
	var splitNegation = (token) => token.startsWith("-") ? [token.slice(1), "-"] : [token, ""];
	function numberRange(range) {
		if (range.min > 0 && range.max > 0) return `${range.min}..${range.max}`;
		if (range.min > 0) return `>=${range.min}`;
		if (range.max > 0) return `<${range.max}`;
		return null;
	}
	function dateRange(range) {
		if (range.from && range.to) return `${range.from}..${range.to}`;
		if (range.from) return `>=${range.from}`;
		if (range.to) return `<=${range.to}`;
		return null;
	}
	function queryParts(state) {
		const parts = tokenize(state.and).map((text) => ({
			text,
			kind: "term"
		}));
		const anyOf = tokenize(state.or);
		if (anyOf.length) parts.push({
			text: anyOf.length === 1 ? anyOf[0] : `(${anyOf.join(" OR ")})`,
			kind: "term"
		});
		for (const field of QUALIFIERS) {
			if (field.kind === "text") {
				for (const token of tokenize(state[field.id])) {
					const [bare, negate] = splitNegation(token);
					if (!bare) continue;
					parts.push({
						text: `${negate}${field.qualifier}:${bare}`,
						kind: "qualifier"
					});
				}
				continue;
			}
			const value = field.kind === "number" ? numberRange(state[field.id]) : dateRange(state[field.id]);
			if (value) parts.push({
				text: `${field.qualifier}:${value}`,
				kind: "qualifier"
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
				const values = tokenize(raw.replace(/^"|"$/g, "")).map((value) => `${negate}${value}`);
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
		if (!matcher) return;
		for (const row of resultRows()) if (matcher.test(rowText(row))) row.classList.add("ghf-hidden");
	}
	function watchResults() {
		scanResults();
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
  --ghf-fg: var(--fgColor-default, var(--color-fg-default, #1f2328));
  --ghf-muted: var(--fgColor-muted, var(--color-fg-muted, #59636e));
  --ghf-accent: var(--fgColor-accent, var(--color-accent-fg, #0969da));
  --ghf-danger: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
  --ghf-border: var(--borderColor-default, var(--color-border-default, #d1d9e0));
  --ghf-hairline: var(--borderColor-muted, var(--color-border-muted, #eaeef2));
  --ghf-hover: var(--control-transparent-bgColor-hover, var(--color-neutral-muted, rgba(175, 184, 193, .16)));
  --ghf-selected: var(--bgColor-neutral-muted, var(--color-neutral-muted, rgba(175, 184, 193, .22)));
  --ghf-btn-bg: var(--button-default-bgColor-rest, var(--color-btn-bg, #f6f8fa));
  --ghf-btn-hover: var(--button-default-bgColor-hover, var(--color-btn-hover-bg, #eef1f4));
  --ghf-primary: var(--button-primary-bgColor-rest, var(--color-btn-primary-bg, #1f883d));
  --ghf-primary-hover: var(--button-primary-bgColor-hover, var(--color-btn-primary-hover-bg, #1a7f37));
  --ghf-shadow: var(--shadow-floating-large, 0 12px 28px rgba(31, 35, 40, .18));
  --ghf-radius: 6px;
  --ghf-font: var(--fontStack-sansSerif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
}

${P$1}[data-theme="light"], ${F$2}[data-theme="light"] {
  color-scheme: light;
  --ghf-canvas: #ffffff; --ghf-sunken: #f6f8fa; --ghf-raised: #f6f8fa;
  --ghf-fg: #1f2328; --ghf-muted: #59636e; --ghf-accent: #0969da; --ghf-danger: #d1242f;
  --ghf-border: #d1d9e0; --ghf-hairline: #eaeef2;
  --ghf-hover: #f6f8fa; --ghf-selected: #eaeef2;
  --ghf-btn-bg: #f6f8fa; --ghf-btn-hover: #eef1f4;
  --ghf-primary: #1f883d; --ghf-primary-hover: #1a7f37;
  --ghf-shadow: 0 12px 28px rgba(31, 35, 40, .18);
}

${P$1}[data-theme="dark"], ${F$2}[data-theme="dark"] {
  color-scheme: dark;
  --ghf-canvas: #151b23; --ghf-sunken: #0d1117; --ghf-raised: #1c2128;
  --ghf-fg: #f0f6fc; --ghf-muted: #9198a1; --ghf-accent: #4493f8; --ghf-danger: #f85149;
  --ghf-border: #3d444d; --ghf-hairline: #262c36;
  --ghf-hover: #1c2128; --ghf-selected: #262c36;
  --ghf-btn-bg: #212830; --ghf-btn-hover: #262c36;
  --ghf-primary: #238636; --ghf-primary-hover: #29903b;
  --ghf-shadow: 0 18px 40px rgba(1, 4, 9, .7);
}

/* ---------- panel ---------- */

${P$1} {
  width: min(440px, 100vw);
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
  box-shadow: var(--ghf-shadow);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .24s cubic-bezier(.2, 0, 0, 1), opacity .2s ease,
              display .24s allow-discrete, overlay .24s allow-discrete;
}
${P$1}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P$1}[open] { transform: translateX(100%); opacity: 0; } }

${P$1}::backdrop {
  background: rgba(1, 4, 9, .45);
  opacity: 0;
  transition: opacity .2s ease, display .24s allow-discrete, overlay .24s allow-discrete;
}
${P$1}[open]::backdrop { opacity: 1; }
@starting-style { ${P$1}[open]::backdrop { opacity: 0; } }

${P$1} *, ${P$1} *::before, ${P$1} *::after { box-sizing: border-box; }
${P$1} ::selection { background: var(--ghf-selected); color: var(--ghf-fg); }

${P$1} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

@media (max-width: 767px) {
  ${P$1} {
    width: 100vw;
    height: auto;
    max-height: 88dvh;
    margin: auto 0 0;
    border-left: none;
    border-top: 1px solid var(--ghf-border);
    border-radius: 14px 14px 0 0;
    transform: translateY(100%);
  }
  ${P$1}[open] { transform: translateY(0); }
  @starting-style { ${P$1}[open] { transform: translateY(100%); opacity: 0; } }
}

/* ---------- header ---------- */

${P$1} .ghf-head {
  flex: 0 0 auto;
  padding: 14px 18px 0;
  border-bottom: 1px solid var(--ghf-hairline);
}
${P$1} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 28px; }
${P$1} h2 {
  display: flex; align-items: center; gap: 8px; margin: 0;
  font-size: 14px; font-weight: 600; letter-spacing: -.003em;
}
${P$1} h2 svg { color: var(--ghf-muted); }
${P$1} .ghf-titlebar nav { display: flex; gap: 2px; }

${P$1} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid transparent; border-radius: var(--ghf-radius);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 600;
  transition: background .12s ease, color .12s ease, transform .08s ease;
}
${P$1} .ghf-icon-btn svg { fill: currentColor; }
${P$1} .ghf-icon-btn:hover { background: var(--ghf-btn-hover); color: var(--ghf-fg); }
${P$1} .ghf-icon-btn:active { transform: scale(.94); }
${P$1} .ghf-icon-btn.ghf-danger { width: 26px; height: 26px; }
${P$1} .ghf-icon-btn.ghf-danger:hover { background: var(--ghf-danger); color: #fff; }
${P$1} .ghf-icon-btn.ghf-confirm { width: auto; padding: 0 6px; color: var(--ghf-danger); }
${P$1} .ghf-icon-btn.ghf-confirm:hover { background: var(--ghf-danger); color: #fff; }

${P$1} .ghf-tabs { display: flex; gap: 20px; margin-top: 10px; }
${P$1} .ghf-tabs button {
  position: relative; display: inline-flex; align-items: center;
  padding: 8px 1px 10px; border: 0; background: none;
  color: var(--ghf-muted); font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
  transition: color .12s ease;
}
${P$1} .ghf-tabs button:hover { color: var(--ghf-fg); }
${P$1} .ghf-tabs button[aria-selected="true"] { color: var(--ghf-fg); font-weight: 600; }
${P$1} .ghf-tabs button[aria-selected="true"]::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -1px;
  height: 2px; border-radius: 2px 2px 0 0; background: var(--ghf-accent);
}
${P$1} .ghf-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 17px; height: 17px; margin-left: 6px; padding: 0 5px;
  border-radius: 999px; background: var(--ghf-selected); color: var(--ghf-muted);
  font-size: 10.5px; font-weight: 600; font-variant-numeric: tabular-nums;
}

/* ---------- body ---------- */

${P$1} .ghf-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  padding: 2px 18px 22px;
  scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
}
${P$1} [role="tabpanel"][hidden] { display: none; }

${P$1} .ghf-sec { padding-top: 16px; }
${P$1} .ghf-sec-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 22px; margin-bottom: 5px;
}
${P$1} .ghf-sec-title {
  margin: 0; color: var(--ghf-muted);
  font-size: 10.5px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
}

/* ---------- query rows ---------- */

${P$1} .ghf-rows { border-top: 1px solid var(--ghf-hairline); }
${P$1} .ghf-row {
  display: grid; grid-template-columns: 70px minmax(0, 1fr) 24px; align-items: center;
  min-inline-size: 0; min-height: 38px; margin: 0 -6px; padding: 0 6px;
  border: 0; border-bottom: 1px solid var(--ghf-hairline); border-radius: 5px;
  transition: background .12s ease, box-shadow .12s ease;
}
${P$1} .ghf-row:hover { background: var(--ghf-hover); }
${P$1} .ghf-row:focus-within { background: var(--ghf-hover); box-shadow: inset 0 0 0 2px var(--ghf-accent); }
${P$1} .ghf-row--lg { min-height: 46px; }

/* Sliders and date pickers need the full width, so their value sits on a header line. */
${P$1} .ghf-row--stack {
  grid-template-columns: 70px minmax(0, 1fr);
  grid-template-rows: auto auto;
  min-height: 0; padding: 7px 6px 9px;
}
${P$1} .ghf-row-head {
  display: flex; align-items: center; justify-content: flex-end; gap: 4px;
  min-height: 18px; margin-left: auto;
}
${P$1} .ghf-value {
  color: var(--ghf-fg); font-family: var(--ghf-mono);
  font-size: 10.5px; font-variant-numeric: tabular-nums; white-space: nowrap;
}
${P$1} .ghf-key {
  overflow: hidden; padding: 0 10px 0 0;
  color: var(--ghf-muted); font-family: var(--ghf-mono); font-size: 10.5px; line-height: 1;
  text-align: right; text-overflow: ellipsis; white-space: nowrap;
  cursor: text; user-select: none;
  transition: color .12s ease;
}
${P$1} .ghf-row:hover .ghf-key, ${P$1} .ghf-row:focus-within .ghf-key { color: var(--ghf-fg); }
${P$1} .ghf-colon { opacity: .4; }
${P$1} .ghf-input {
  width: 100%; min-width: 0; padding: 9px 0;
  border: 0; outline: 0; background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 13px; line-height: 20px;
}
${P$1} .ghf-row--lg .ghf-input { padding: 12px 0; font-size: 14px; }
${P$1} .ghf-input::placeholder { color: var(--ghf-muted); opacity: 1; }
${P$1} .ghf-clear {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; padding: 0;
  border: 0; border-radius: 4px; background: transparent; color: var(--ghf-muted); cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P$1} .ghf-clear svg { fill: currentColor; }
${P$1} .ghf-clear:hover { background: var(--ghf-selected); color: var(--ghf-fg); }

/* ---------- dual range slider ---------- */

${P$1} .ghf-slider {
  position: relative; grid-column: 1 / -1;
  height: 26px; margin-top: 1px;
  cursor: pointer; touch-action: none;
}
${P$1} .ghf-slider-track {
  position: absolute; left: 7px; right: 7px; top: 11px; height: 4px;
  border-radius: 2px; background: var(--ghf-border); pointer-events: none;
}
${P$1} .ghf-slider-fill {
  position: absolute; top: 0; bottom: 0;
  border-radius: 2px; background: var(--ghf-accent);
}
/* Transparent, stacked ranges: only the thumbs take pointer events, so the
   container underneath can handle a press anywhere on the track. */
${P$1} .ghf-slider input {
  position: absolute; left: 0; right: 0; top: 0;
  width: 100%; height: 26px; margin: 0;
  -webkit-appearance: none; appearance: none;
  background: none; pointer-events: none;
}
${P$1} .ghf-slider input::-webkit-slider-runnable-track { height: 26px; background: none; }
${P$1} .ghf-slider input::-moz-range-track { height: 26px; background: none; }
${P$1} .ghf-slider input::-webkit-slider-thumb {
  -webkit-appearance: none; pointer-events: auto;
  width: 14px; height: 14px; margin-top: 6px;
  border: 2px solid var(--ghf-accent); border-radius: 50%;
  background: var(--ghf-canvas); cursor: grab;
  box-shadow: 0 1px 2px rgba(31, 35, 40, .25);
}
${P$1} .ghf-slider input::-moz-range-thumb {
  pointer-events: auto;
  width: 10px; height: 10px;
  border: 2px solid var(--ghf-accent); border-radius: 50%;
  background: var(--ghf-canvas); cursor: grab;
  box-shadow: 0 1px 2px rgba(31, 35, 40, .25);
}
${P$1} .ghf-slider input:active::-webkit-slider-thumb { cursor: grabbing; }

/* ---------- date ranges ---------- */

${P$1} .ghf-dates {
  display: grid; grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr);
  align-items: center; gap: 6px; margin-top: 3px;
}
${P$1} .ghf-date {
  width: 100%; min-width: 0; height: 30px; padding: 0 7px;
  border: 1px solid var(--ghf-border); border-radius: 5px;
  background: var(--ghf-canvas); color: var(--ghf-fg);
  font: inherit; font-size: 11.5px; font-variant-numeric: tabular-nums;
  outline: 0; transition: border-color .12s ease, box-shadow .12s ease;
}
${P$1} .ghf-date::-webkit-calendar-picker-indicator {
  opacity: .55; cursor: pointer; transition: opacity .12s ease;
}
${P$1} .ghf-date::-webkit-calendar-picker-indicator:hover { opacity: 1; }
${P$1} .ghf-date:focus { border-color: var(--ghf-accent); box-shadow: inset 0 0 0 1px var(--ghf-accent); }
${P$1} .ghf-dash { color: var(--ghf-muted); font-family: var(--ghf-mono); font-size: 11px; text-align: center; }

${P$1} .ghf-hint {
  margin: 7px 0 0; color: var(--ghf-muted);
  font-size: 10.5px; line-height: 1.5;
}
${P$1} .ghf-hint code {
  padding: 0 3px; border: 1px solid var(--ghf-hairline); border-radius: 3px;
  background: var(--ghf-sunken); font-family: var(--ghf-mono); font-size: 10px;
}

/* ---------- sort ---------- */

${P$1} .ghf-sort { position: relative; display: inline-flex; align-items: center; gap: 5px; }
${P$1} .ghf-sort-label { color: var(--ghf-muted); font-size: 10.5px; }
${P$1} .ghf-sort select {
  appearance: none; padding: 3px 16px 3px 3px;
  border: 0; border-radius: 4px; outline: 0; background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer;
}
${P$1} .ghf-sort svg { position: absolute; right: 1px; color: var(--ghf-muted); pointer-events: none; fill: currentColor; }

/* ---------- footer ---------- */

${P$1} .ghf-foot {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 10px;
  padding: 10px 18px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--ghf-border); background: var(--ghf-raised);
}

${P$1} .ghf-tape {
  padding: 7px 9px 8px;
  border: 1px solid var(--ghf-hairline); border-radius: 8px; background: var(--ghf-sunken);
}
${P$1} .ghf-tape-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
${P$1} .ghf-tape-label {
  color: var(--ghf-muted);
  font-size: 9.5px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase;
}
${P$1} .ghf-copy {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px;
  border: 0; border-radius: 4px; background: none; color: var(--ghf-muted);
  font: inherit; font-size: 10.5px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P$1} .ghf-copy svg { fill: currentColor; }
${P$1} .ghf-copy:hover:not(:disabled) { background: var(--ghf-selected); color: var(--ghf-fg); }
${P$1} .ghf-copy:disabled { opacity: .55; cursor: default; }

${P$1} .ghf-tape-body {
  max-height: 54px; margin: 0; overflow-y: auto; overflow-wrap: anywhere;
  color: var(--ghf-fg); font-family: var(--ghf-mono); font-size: 11.5px; line-height: 1.6;
  scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
}
${P$1} .ghf-tape-empty { color: var(--ghf-muted); font-family: var(--ghf-font); font-size: 11.5px; }
${P$1} .ghf-tok-key { color: var(--ghf-accent); }
${P$1} .ghf-tok-neg { color: var(--ghf-muted); }
${P$1} .ghf-tape-hide {
  margin: 5px 0 0; padding-top: 5px;
  border-top: 1px dashed var(--ghf-hairline); color: var(--ghf-muted);
  font-size: 10.5px; line-height: 1.4;
}
${P$1} .ghf-tape-hide b { color: var(--ghf-fg); font-family: var(--ghf-mono); font-weight: 500; }

${P$1} .ghf-actions { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 8px; }
${P$1} .ghf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 34px; padding: 0 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease, transform .08s ease;
}
${P$1} .ghf-btn svg { fill: currentColor; }
${P$1} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P$1} .ghf-btn:active { transform: translateY(1px); }
${P$1} .ghf-btn.ghf-primary {
  border-color: var(--ghf-primary); background: var(--ghf-primary); color: #fff; font-weight: 600;
  box-shadow: 0 1px 2px rgba(31, 35, 40, .18);
}
${P$1} .ghf-btn.ghf-primary:hover { border-color: var(--ghf-primary-hover); background: var(--ghf-primary-hover); }
${P$1} .ghf-btn:disabled, ${P$1} .ghf-btn.ghf-primary:disabled {
  border-color: var(--ghf-border); background: var(--ghf-btn-bg); color: var(--ghf-muted);
  box-shadow: none; cursor: not-allowed; transform: none;
}
${P$1} .ghf-btn.ghf-compact { flex: 0 0 auto; }

/* ---------- presets ---------- */

${P$1} .ghf-save { display: flex; gap: 8px; }
${P$1} .ghf-name {
  flex: 1 1 auto; min-width: 0; height: 34px; padding: 0 10px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-canvas); color: var(--ghf-fg);
  font: inherit; font-size: 12.5px; outline: 0;
  transition: border-color .12s ease, box-shadow .12s ease;
}
${P$1} .ghf-name::placeholder { color: var(--ghf-muted); opacity: 1; }
${P$1} .ghf-name:focus { border-color: var(--ghf-accent); box-shadow: inset 0 0 0 1px var(--ghf-accent); }
${P$1} .ghf-name:focus-visible { outline: none; }
${P$1} .ghf-name[aria-invalid="true"] { border-color: var(--ghf-danger); box-shadow: inset 0 0 0 1px var(--ghf-danger); }
${P$1} .ghf-error { min-height: 17px; margin: 5px 1px 4px; color: var(--ghf-danger); font-size: 11px; line-height: 1.4; }

${P$1} .ghf-presets { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--ghf-hairline); }
${P$1} .ghf-preset {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px;
  margin: 0 -6px; padding: 9px 6px;
  border-bottom: 1px solid var(--ghf-hairline); border-radius: 5px;
  transition: background .12s ease;
}
${P$1} .ghf-preset:hover { background: var(--ghf-hover); }
${P$1} .ghf-preset-main {
  display: flex; flex-direction: column; gap: 3px; min-width: 0;
  padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
${P$1} .ghf-preset-name {
  overflow: hidden; color: var(--ghf-fg);
  font-size: 12.5px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap;
  transition: color .12s ease;
}
${P$1} .ghf-preset-main:hover .ghf-preset-name { color: var(--ghf-accent); }
${P$1} .ghf-preset-query {
  overflow: hidden; color: var(--ghf-muted);
  font-family: var(--ghf-mono); font-size: 10.5px; line-height: 1.4;
  text-overflow: ellipsis; white-space: nowrap;
}
${P$1} .ghf-preset-side { display: flex; align-items: center; gap: 1px; }
${P$1} .ghf-run {
  display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 8px;
  border: 1px solid transparent; border-radius: 5px; background: transparent; color: var(--ghf-muted);
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}
${P$1} .ghf-run svg { fill: currentColor; }
${P$1} .ghf-run:hover { border-color: var(--ghf-border); background: var(--ghf-canvas); color: var(--ghf-fg); }

${P$1} .ghf-empty {
  margin-top: 10px; padding: 28px 20px;
  border: 1px dashed var(--ghf-border); border-radius: 10px;
  color: var(--ghf-muted); font-size: 12px; line-height: 1.55; text-align: center;
}
${P$1} .ghf-empty > svg { margin-bottom: 6px; color: var(--ghf-muted); fill: currentColor; opacity: .8; }
${P$1} .ghf-empty-title { margin: 4px 0 3px; color: var(--ghf-fg); font-size: 13px; font-weight: 600; }
${P$1} .ghf-empty p { margin: 0 auto 13px; max-width: 30ch; }
${P$1} .ghf-empty .ghf-btn { height: 30px; font-size: 12px; }

/* ---------- focus ---------- */

${P$1} :is(button, select, input):focus-visible {
  outline: 2px solid var(--ghf-accent); outline-offset: 1px;
}
${P$1} .ghf-row input:focus-visible { outline: none; }
/* The range input is a transparent overlay, so the ring belongs on the thumb. */
${P$1} .ghf-slider input:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--ghf-canvas), 0 0 0 4px var(--ghf-accent);
}
${P$1} .ghf-slider input:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 2px var(--ghf-canvas), 0 0 0 4px var(--ghf-accent);
}

/* ---------- launcher ---------- */

${F$2} {
  position: fixed;
  right: calc(18px + env(safe-area-inset-right, 0px));
  bottom: calc(18px + env(safe-area-inset-bottom, 0px));
  display: inline-flex; align-items: center; justify-content: center;
  height: 44px; min-width: 44px; padding: 0 13px;
  border: 1px solid var(--ghf-border); border-radius: 999px;
  background: var(--ghf-canvas); color: var(--ghf-muted);
  box-shadow: var(--ghf-shadow); cursor: pointer;
  z-index: 9999;
  transition: color .15s ease, border-color .15s ease, box-shadow .15s ease;
}
${F$2} svg { flex: 0 0 auto; fill: currentColor; transition: color .15s ease; }
${F$2}:hover { color: var(--ghf-fg); border-color: var(--ghf-muted); }
${F$2}:hover svg { color: var(--ghf-accent); }
${F$2}:active { transform: scale(.97); }
${F$2}:focus-visible { outline: 2px solid var(--ghf-accent); outline-offset: 2px; }

${F$2} .ghf-fab-label {
  max-width: 0; margin-left: 0; padding-right: 0;
  overflow: hidden; opacity: 0; white-space: nowrap;
  font-family: var(--ghf-font); font-size: 12px; font-weight: 600; line-height: 1;
  transition: max-width .2s cubic-bezier(.2, 0, 0, 1), margin-left .2s cubic-bezier(.2, 0, 0, 1),
              padding-right .2s cubic-bezier(.2, 0, 0, 1), opacity .12s ease;
}
${F$2}:hover .ghf-fab-label, ${F$2}:focus-visible .ghf-fab-label {
  max-width: 150px; margin-left: 7px; padding-right: 3px; opacity: 1;
}

/* 44px is the touch minimum; the label expansion is pointer-only. */
@media (pointer: coarse) {
  ${F$2} { height: 48px; min-width: 48px; }
  ${F$2} .ghf-fab-label { display: none; }
}

@media print {
  ${F$2} { display: none !important; }
  ${P$1} { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  ${P$1}, ${P$1}::backdrop, ${F$2}, ${F$2} .ghf-fab-label, ${P$1} * { transition-duration: .01ms !important; }
}

/* Applied to result rows in GitHub's own DOM, hence no panel prefix. */
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
		chevronDown: "M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"
	};
	function Icon({ name, size = 16 }) {
		return a("svg", {
			viewBox: "0 0 16 16",
			width: size,
			height: size,
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
	var THUMB = 14;
	var formatCount = (value) => {
		if (value < 1e3) return String(value);
		const thousands = Math.round(value / 100) / 10;
		return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
	};
	function rangeReadout(range) {
		if (range.min > 0 && range.max > 0) return `${formatCount(range.min)} – ${formatCount(range.max)}`;
		if (range.min > 0) return `${formatCount(range.min)}+`;
		if (range.max > 0) return `Under ${formatCount(range.max)}`;
		return "Any";
	}
	function dateReadout(range) {
		if (range.from && range.to) return `${range.from} – ${range.to}`;
		if (range.from) return `From ${range.from}`;
		if (range.to) return `Until ${range.to}`;
		return "Any";
	}
	function QualifierToken({ text }) {
		const negated = text.startsWith("-");
		const body = negated ? text.slice(1) : text;
		const colon = body.indexOf(":");
		return a("span", {
			class: "ghf-tok",
			children: [
				negated && a("span", {
					class: "ghf-tok-neg",
					children: "-"
				}),
				a("span", {
					class: "ghf-tok-key",
					children: body.slice(0, colon + 1)
				}),
				a("span", {
					class: "ghf-tok-val",
					children: body.slice(colon + 1)
				})
			]
		});
	}
	function QueryRow({ id, label, gutter, placeholder, value, large, colon, onChange }) {
		const inputId = `ghf-${id}`;
		return a("div", {
			class: large ? "ghf-row ghf-row--lg" : "ghf-row",
			children: [
				a("label", {
					class: "ghf-key",
					for: inputId,
					"aria-hidden": "true",
					children: [gutter, colon && a("span", {
						class: "ghf-colon",
						children: ":"
					})]
				}),
				a("input", {
					id: inputId,
					class: "ghf-input",
					type: "text",
					value,
					placeholder,
					autocomplete: "off",
					spellcheck: false,
					"aria-label": label,
					onInput: (event) => onChange(event.currentTarget.value)
				}),
				value ? a("button", {
					type: "button",
					class: "ghf-clear",
					"aria-label": `Clear ${label}`,
					onClick: () => onChange(""),
					children: a(Icon, {
						name: "x",
						size: 12
					})
				}) : null
			]
		});
	}
	function TextRow({ field, value, onChange }) {
		return a(QueryRow, {
			id: field.id,
			label: field.label,
			gutter: field.qualifier,
			colon: true,
			placeholder: field.placeholder,
			value,
			onChange
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
			if (Math.abs(index - lo) <= Math.abs(index - hi)) setLo(index);
			else setHi(index);
		};
		return a("div", {
			class: "ghf-row ghf-row--stack",
			children: [
				a("span", {
					class: "ghf-key",
					"aria-hidden": "true",
					children: field.qualifier
				}),
				a("div", {
					class: "ghf-row-head",
					children: [a("output", {
						class: "ghf-value",
						children: rangeReadout(value)
					}), filtered && a("button", {
						type: "button",
						class: "ghf-clear",
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
							onPointerDown: () => setLead("max"),
							onInput: (event) => {
								setLead("max");
								setHi(Number(event.currentTarget.value));
							}
						})
					]
				})
			]
		});
	}
	function DateRow({ field, value, onChange }) {
		const filtered = Boolean(value.from || value.to);
		return a("div", {
			class: "ghf-row ghf-row--stack",
			children: [
				a("span", {
					class: "ghf-key",
					"aria-hidden": "true",
					children: field.qualifier
				}),
				a("div", {
					class: "ghf-row-head",
					children: [a("output", {
						class: "ghf-value",
						children: dateReadout(value)
					}), filtered && a("button", {
						type: "button",
						class: "ghf-clear",
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
				}),
				a("div", {
					class: "ghf-dates",
					children: [
						a("input", {
							class: "ghf-date",
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
							class: "ghf-dash",
							"aria-hidden": "true",
							children: "→"
						}),
						a("input", {
							class: "ghf-date",
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
				})
			]
		});
	}
	function PresetRow({ preset, pending, onLoad, onRun, onDelete }) {
		const summary = buildQuery(preset.state) || "All repositories";
		return a("li", {
			class: "ghf-preset",
			children: [a("button", {
				type: "button",
				class: "ghf-preset-main",
				onClick: onLoad,
				"aria-label": `Load ${preset.name} into the builder`,
				title: `Load ${preset.name} into the builder`,
				children: [a("span", {
					class: "ghf-preset-name",
					children: preset.name
				}), a("span", {
					class: "ghf-preset-query",
					children: summary
				})]
			}), a("div", {
				class: "ghf-preset-side",
				children: [a("button", {
					type: "button",
					class: "ghf-run",
					onClick: onRun,
					title: `Run ${preset.name}`,
					children: ["Run", a(Icon, {
						name: "arrowRight",
						size: 12
					})]
				}), a("button", {
					type: "button",
					class: pending ? "ghf-icon-btn ghf-danger ghf-confirm" : "ghf-icon-btn ghf-danger",
					"aria-label": pending ? `Confirm delete ${preset.name}` : `Delete ${preset.name}`,
					title: pending ? "Click again to delete" : "Delete preset",
					onClick: onDelete,
					children: pending ? "Delete?" : a(Icon, {
						name: "trash",
						size: 13
					})
				})]
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
		const setField = (key, value) => setState((current) => ({
			...current,
			[key]: value
		}));
		const reset = () => {
			setState(emptyState());
			setError("");
		};
		const loadPreset = (preset) => {
			setState(preset.state);
			setTab("builder");
			requestAnimationFrame(() => document.getElementById("ghf-and")?.focus());
		};
		const savePreset = () => {
			if (!parts.length) {
				setError("Add a term or filter to save.");
				return;
			}
			const trimmed = name.trim();
			if (!trimmed) {
				setError("Give the preset a name first.");
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
							children: [a("h2", {
								id: "ghf-panel-title",
								children: [a(Icon, {
									name: "filter",
									size: 15
								}), NAME]
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
							"aria-label": "Search panel sections",
							onKeyDown: tabKeyDown,
							children: [a("button", {
								type: "button",
								role: "tab",
								id: "ghf-tab-builder",
								"aria-selected": tab === "builder",
								"aria-controls": "ghf-panel-builder",
								tabIndex: tab === "builder" ? 0 : -1,
								onClick: () => setTab("builder"),
								children: "Builder"
							}), a("button", {
								type: "button",
								role: "tab",
								id: "ghf-tab-presets",
								"aria-selected": tab === "presets",
								"aria-controls": "ghf-panel-presets",
								tabIndex: tab === "presets" ? 0 : -1,
								onClick: () => setTab("presets"),
								children: ["Presets", presets.length > 0 && a("span", {
									class: "ghf-count",
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
							children: [a("section", {
								class: "ghf-sec",
								children: [
									a("div", {
										class: "ghf-sec-head",
										children: a("h3", {
											class: "ghf-sec-title",
											children: "Terms"
										})
									}),
									a("div", {
										class: "ghf-rows",
										children: KEYWORDS.map((field) => a(QueryRow, {
											id: field.id,
											label: field.label,
											gutter: field.key,
											placeholder: field.placeholder,
											value: state[field.id],
											large: true,
											onChange: (value) => setField(field.id, value)
										}, field.id))
									}),
									a("p", {
										class: "ghf-hint",
										children: [
											"Commas or spaces separate values · ",
											a("code", { children: "-" }),
											" excludes · quotes keep phrases"
										]
									})
								]
							}), a("section", {
								class: "ghf-sec",
								children: [a("div", {
									class: "ghf-sec-head",
									children: [a("h3", {
										class: "ghf-sec-title",
										children: "Filters"
									}), a("div", {
										class: "ghf-sort",
										children: [
											a("span", {
												class: "ghf-sort-label",
												"aria-hidden": "true",
												children: "Sort"
											}),
											a("select", {
												value: state.sort,
												"aria-label": "Sort results",
												onChange: (event) => setField("sort", event.currentTarget.value),
												children: SORTS.map((sort) => a("option", {
													value: sort.value,
													children: sort.label
												}, sort.value))
											}),
											a(Icon, {
												name: "chevronDown",
												size: 12
											})
										]
									})]
								}), a("div", {
									class: "ghf-rows",
									children: QUALIFIERS.map((field) => {
										if (field.kind === "number") return a(RangeRow, {
											field,
											value: state[field.id],
											onChange: (next) => setField(field.id, next)
										}, field.id);
										if (field.kind === "date") return a(DateRow, {
											field,
											value: state[field.id],
											onChange: (next) => setField(field.id, next)
										}, field.id);
										return a(TextRow, {
											field,
											value: state[field.id],
											onChange: (next) => setField(field.id, next)
										}, field.id);
									})
								})]
							})]
						}), a("div", {
							id: "ghf-panel-presets",
							role: "tabpanel",
							"aria-labelledby": "ghf-tab-presets",
							hidden: tab !== "presets",
							children: a("section", {
								class: "ghf-sec",
								children: [
									a("div", {
										class: "ghf-save",
										children: [a("input", {
											ref: nameRef,
											class: "ghf-name",
											type: "text",
											placeholder: "Name this search",
											"aria-label": "Preset name",
											maxLength: 60,
											value: name,
											"aria-invalid": error ? "true" : void 0,
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
										}), a("button", {
											type: "button",
											class: "ghf-btn ghf-primary ghf-compact",
											disabled: !parts.length || !name.trim(),
											onClick: savePreset,
											children: "Save"
										})]
									}),
									a("p", {
										class: "ghf-error",
										role: "alert",
										children: error
									}),
									presets.length ? a("ul", {
										class: "ghf-presets",
										children: presets.map((preset) => a(PresetRow, {
											preset,
											pending: pendingDelete === preset.id,
											onLoad: () => loadPreset(preset),
											onRun: () => search(preset.state),
											onDelete: () => deletePreset(preset.id)
										}, preset.id))
									}) : a("div", {
										class: "ghf-empty",
										children: [
											a(Icon, {
												name: "filter",
												size: 20
											}),
											a("p", {
												class: "ghf-empty-title",
												children: "No saved searches yet"
											}),
											a("p", { children: "Build a query, then name it above. A preset keeps its terms, filters and local hide list." }),
											a("button", {
												type: "button",
												class: "ghf-btn ghf-compact",
												onClick: () => setTab("builder"),
												children: "Open the builder"
											})
										]
									})
								]
							})
						})]
					}),
					tab === "builder" && a("footer", {
						class: "ghf-foot",
						children: [a("div", {
							class: "ghf-tape",
							children: [
								a("div", {
									class: "ghf-tape-head",
									children: [a("span", {
										class: "ghf-tape-label",
										children: "Query"
									}), a("button", {
										type: "button",
										class: "ghf-copy",
										disabled: !parts.length,
										onClick: copyQuery,
										"aria-live": "polite",
										children: [a(Icon, {
											name: copied ? "check" : "copy",
											size: 12
										}), copied ? "Copied" : "Copy"]
									})]
								}),
								a("p", {
									class: "ghf-tape-body",
									children: parts.length ? parts.map((part, index) => a($, { children: [index > 0 ? " " : null, part.kind === "qualifier" ? a(QualifierToken, { text: part.text }) : a("span", {
										class: "ghf-tok",
										children: part.text
									})] }, `${index}:${part.text}`)) : a("span", {
										class: "ghf-tape-empty",
										children: "Nothing yet — add a term or a filter."
									})
								}),
								hideWords.length > 0 && a("p", {
									class: "ghf-tape-hide",
									children: ["Hiding results with ", a("b", { children: hideWords.join(" · ") })]
								})
							]
						}), a("div", {
							class: "ghf-actions",
							children: [a("button", {
								type: "button",
								class: "ghf-btn",
								onClick: reset,
								children: "Reset"
							}), a("button", {
								type: "submit",
								class: "ghf-btn ghf-primary",
								title: "Search GitHub (Enter)",
								children: ["Search", a(Icon, {
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
	function syncLauncher() {
		try {
			if (window.self !== window.top) return;
		} catch {
			return;
		}
		if (!document.body) return;
		const existing = document.getElementById(IDS.fab);
		if (existing) {
			if (existing.isConnected) return;
			document.body.append(existing);
			return;
		}
		const button = document.createElement("button");
		button.id = IDS.fab;
		button.type = "button";
		button.title = NAME;
		button.setAttribute("aria-label", NAME);
		button.setAttribute("aria-haspopup", "dialog");
		button.setAttribute("aria-expanded", String(dialogRefOpen()));
		button.dataset.theme = getTheme();
		button.append(iconSvg("filter", 18));
		const label = document.createElement("span");
		label.className = "ghf-fab-label";
		label.textContent = NAME;
		button.append(label);
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
	safe(migrateLegacyStorage);
	safe(injectStyles);
	safe(syncLauncher);
	safe(watchResults);
	var recheck = () => requestAnimationFrame(() => safe(syncLauncher));
	for (const event of NAV_EVENTS) document.addEventListener(event, recheck);
	window.addEventListener("popstate", recheck);
	window.addEventListener("pageshow", recheck);
	if (!document.body) document.addEventListener("DOMContentLoaded", () => safe(syncLauncher), { once: true });
	GM_registerMenuCommand("GitHub Filter", openPanel);
})();
