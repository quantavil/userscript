// ==UserScript==
// @name         GitHub Advanced Search
// @namespace    https://github.com/quantavil/userscript/github-filter
// @version      8.2.2
// @author       quantavil (https://github.com/quantavil)
// @description  Build GitHub search queries without memorising qualifier syntax, save them as presets, and hide results you never want to see.
// @license      MIT
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
	var NUMERIC = new Set([
		"stars",
		"forks",
		"size"
	]);
	var SECTIONS = [
		{
			title: "Search",
			fields: [{
				id: "type",
				label: "Type",
				kind: "select",
				options: [
					{
						value: "repositories",
						label: "Repositories"
					},
					{
						value: "code",
						label: "Code"
					},
					{
						value: "issues",
						label: "Issues"
					},
					{
						value: "pullrequests",
						label: "Pull requests"
					},
					{
						value: "discussions",
						label: "Discussions"
					},
					{
						value: "users",
						label: "Users"
					}
				]
			}, {
				id: "sort",
				label: "Sort by",
				kind: "select",
				options: [
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
				]
			}]
		},
		{
			title: "Terms",
			fields: [
				{
					id: "and",
					label: "All of these",
					kind: "text",
					placeholder: "rust async"
				},
				{
					id: "or",
					label: "Any of these",
					kind: "text",
					placeholder: "react, vue"
				},
				{
					id: "hide",
					label: "Hide results containing",
					kind: "text",
					placeholder: "spam, bot",
					full: true
				}
			]
		},
		{
			title: "Qualifiers",
			fields: [
				{
					id: "repo",
					label: "Repo",
					kind: "text",
					placeholder: "facebook/react",
					qualifier: "repo"
				},
				{
					id: "lang",
					label: "Language",
					kind: "text",
					placeholder: "python, -html",
					qualifier: "language",
					aliases: ["lang"]
				},
				{
					id: "ext",
					label: "Extension",
					kind: "text",
					placeholder: "md",
					qualifier: "extension",
					aliases: ["ext"]
				},
				{
					id: "stars",
					label: "Stars",
					kind: "text",
					placeholder: ">500",
					qualifier: "stars"
				},
				{
					id: "forks",
					label: "Forks",
					kind: "text",
					placeholder: ">100",
					qualifier: "forks"
				},
				{
					id: "size",
					label: "Size (KB)",
					kind: "text",
					placeholder: "<5000",
					qualifier: "size"
				},
				{
					id: "created",
					label: "Created",
					kind: "text",
					placeholder: ">2023-01",
					qualifier: "created"
				},
				{
					id: "pushed",
					label: "Pushed",
					kind: "text",
					placeholder: ">2024-01-01",
					qualifier: "pushed"
				}
			]
		}
	];
	var QUALIFIERS = SECTIONS.flatMap((s) => s.fields).filter((f) => f.kind === "text" && !!f.qualifier);
	var emptyState = () => ({
		type: "repositories",
		sort: "",
		and: "",
		or: "",
		hide: "",
		q: {}
	});
	var tokenize = (input) => input.match(/-?"[^"]*"|[^\s,]+/g) ?? [];
	var splitNegation = (token) => token.startsWith("-") ? [token.slice(1), "-"] : [token, ""];
	function buildUrl(state) {
		const terms = tokenize(state.and);
		const anyOf = tokenize(state.or);
		if (anyOf.length) terms.push(anyOf.length === 1 ? anyOf[0] : `(${anyOf.join(" OR ")})`);
		for (const field of QUALIFIERS) for (const token of tokenize(state.q[field.id] ?? "")) {
			const [bare, negate] = splitNegation(token);
			if (!bare) continue;
			const value = NUMERIC.has(field.qualifier) && /^\d+$/.test(bare) ? `>=${bare}` : bare;
			terms.push(`${negate}${field.qualifier}:${value}`);
		}
		const url = new URL("https://github.com/search");
		url.searchParams.set("q", terms.join(" "));
		url.searchParams.set("type", state.type);
		if (state.sort) {
			url.searchParams.set("s", state.sort);
			url.searchParams.set("o", "desc");
		}
		if (state.hide.trim()) url.searchParams.set(PARAM.hide, state.hide.trim());
		return url.toString();
	}
	function parseUrl(search) {
		const params = new URLSearchParams(search);
		const state = emptyState();
		state.type = (params.get("type") || "repositories").toLowerCase();
		state.sort = params.get("s") ?? "";
		state.hide = params.get(PARAM.hide) ?? "";
		let q = params.get("q") ?? "";
		for (const field of QUALIFIERS) {
			const keys = [field.qualifier, ...field.aliases ?? []].sort((a, b) => b.length - a.length).join("|");
			const found = [];
			q = q.replace(new RegExp(`(^|\\s)(-?)(?:${keys}):("[^"]*"|\\S+)`, "gi"), (_m, _sp, negate, raw) => {
				let value = raw.replace(/^"|"$/g, "");
				if (NUMERIC.has(field.qualifier) && /^>=\d+$/.test(value)) value = value.slice(2);
				found.push(negate + value);
				return " ";
			});
			if (found.length) state.q[field.id] = found.join(", ");
		}
		const group = q.match(/\(([^()]+)\)/);
		if (group?.[1]?.includes(" OR ")) {
			state.or = group[1].split(" OR ").map((s) => s.trim()).filter(Boolean).join(", ");
			q = q.replace(group[0], " ");
		}
		state.and = q.replace(/\s+/g, " ").trim();
		return state;
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
	var getPresets = () => read(STORE.presets, []).filter((p) => p?.id && p?.name);
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
				state: {
					...emptyState(),
					type: p.fields?.type ?? "repositories",
					sort: p.fields?.sort ?? "",
					and: p.fields?.and ?? "",
					or: p.fields?.or ?? "",
					hide: p.fields?.hideKeys ?? "",
					q: p.fields?.meta ?? {}
				}
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
	var P = `#${IDS.panel}`;
	var F = `#${IDS.fab}`;
	var CSS = `
${P}, ${F} {
  --ghf-canvas: var(--overlay-bgColor, var(--bgColor-default, var(--color-canvas-default, #ffffff)));
  --ghf-subtle: var(--bgColor-muted, var(--color-canvas-subtle, #f6f8fa));
  --ghf-inset: var(--bgColor-inset, var(--color-canvas-inset, #f6f8fa));
  --ghf-fg: var(--fgColor-default, var(--color-fg-default, #1f2328));
  --ghf-fg-muted: var(--fgColor-muted, var(--color-fg-muted, #59636e));
  --ghf-accent: var(--fgColor-accent, var(--color-accent-fg, #0969da));
  --ghf-danger: var(--fgColor-danger, var(--color-danger-fg, #d1242f));
  --ghf-border: var(--borderColor-default, var(--color-border-default, #d1d9e0));
  --ghf-border-muted: var(--borderColor-muted, var(--color-border-muted, #d8dee4));
  --ghf-btn-bg: var(--button-default-bgColor-rest, var(--color-btn-bg, #f6f8fa));
  --ghf-btn-hover: var(--button-default-bgColor-hover, var(--color-btn-hover-bg, #eef1f4));
  --ghf-primary: var(--button-primary-bgColor-rest, var(--color-btn-primary-bg, #1f883d));
  --ghf-primary-hover: var(--button-primary-bgColor-hover, var(--color-btn-primary-hover-bg, #1a7f37));
  --ghf-shadow: var(--shadow-floating-large, 0 8px 24px rgba(31, 35, 40, 0.16));
  --ghf-radius: 6px;
  --ghf-font: var(--fontStack-sansSerif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace);
}

${P}[data-theme="light"], ${F}[data-theme="light"] {
  color-scheme: light;
  /* Three deliberate steps: body → header/footer → inset controls. */
  --ghf-canvas: #ffffff; --ghf-subtle: #f6f8fa; --ghf-inset: #eaeef2;
  --ghf-fg: #1f2328; --ghf-fg-muted: #59636e; --ghf-accent: #0969da; --ghf-danger: #d1242f;
  --ghf-border: #d1d9e0; --ghf-border-muted: #d8dee4;
  --ghf-btn-bg: #f6f8fa; --ghf-btn-hover: #eef1f4;
  --ghf-primary: #1f883d; --ghf-primary-hover: #1a7f37;
  --ghf-shadow: 0 8px 24px rgba(31, 35, 40, 0.16);
}

${P}[data-theme="dark"], ${F}[data-theme="dark"] {
  color-scheme: dark;
  /* Header sits above the body, matching light mode's direction of elevation.
     #010409 against #151b23 was a hard black band. */
  --ghf-canvas: #151b23; --ghf-subtle: #1c2128; --ghf-inset: #0d1117;
  --ghf-fg: #f0f6fc; --ghf-fg-muted: #9198a1; --ghf-accent: #4493f8; --ghf-danger: #f85149;
  --ghf-border: #3d444d; --ghf-border-muted: #2f353d;
  --ghf-btn-bg: #212830; --ghf-btn-hover: #262c36;
  --ghf-primary: #238636; --ghf-primary-hover: #29903b;
  /* No 1px ring — the panel already has a border, and the two drew a double line. */
  --ghf-shadow: 0 16px 32px rgba(1, 4, 9, 0.85);
}

/* ---------- panel ---------- */

${P} {
  width: min(400px, 100vw);
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
  font-size: 14px;
  line-height: 1.5;
  box-shadow: var(--ghf-shadow);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(100%);
  opacity: 0;
  transition: transform .22s cubic-bezier(.2, 0, 0, 1), opacity .22s ease,
              display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P}[open] { transform: translateX(100%); opacity: 0; } }

${P}::backdrop {
  background: rgba(1, 4, 9, .45);
  opacity: 0;
  transition: opacity .22s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

@media (max-width: 767px) {
  ${P} {
    width: 100vw;
    height: auto;
    max-height: 88dvh;
    margin: auto 0 0;
    border-left: none;
    border-top: 1px solid var(--ghf-border);
    border-radius: 12px 12px 0 0;
    transform: translateY(100%);
  }
  ${P}[open] { transform: translateY(0); }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }
}

@media (prefers-reduced-motion: reduce) {
  ${P}, ${P}::backdrop, ${F}, ${P} * { transition-duration: .01ms !important; }
}

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

/* ---------- header ---------- */

${P} header {
  display: flex; flex-direction: column; gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ghf-border);
  background: var(--ghf-subtle);
}
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
${P} h2 {
  display: flex; align-items: center; gap: 8px; margin: 0;
  font-size: 14px; font-weight: 600; letter-spacing: -.005em;
}
${P} h2 svg { fill: var(--ghf-fg-muted); }
${P} .ghf-titlebar nav { display: flex; gap: 2px; }

${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0;
  border: 1px solid transparent; border-radius: var(--ghf-radius);
  background: transparent; color: var(--ghf-fg-muted); cursor: pointer;
  transition: background .12s ease, color .12s ease, transform .06s ease;
}
${P} .ghf-icon-btn svg { fill: currentColor; }
${P} .ghf-icon-btn:hover { background: var(--ghf-btn-hover); color: var(--ghf-fg); }
${P} .ghf-icon-btn:active { transform: scale(.94); }
${P} .ghf-icon-btn.ghf-danger:hover { background: var(--ghf-danger); color: #fff; }

${P} .ghf-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
  padding: 2px; border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius); background: var(--ghf-inset);
}
${P} .ghf-tabs button {
  padding: 5px 8px; border: none; border-radius: 4px;
  background: transparent; color: var(--ghf-fg-muted);
  font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
${P} .ghf-tabs button:hover { color: var(--ghf-fg); }
${P} .ghf-tabs button[aria-selected="true"] {
  background: var(--ghf-canvas); color: var(--ghf-fg); font-weight: 600;
}

/* ---------- body ---------- */

${P} .ghf-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px 16px 16px; }
${P} [role="tabpanel"][hidden] { display: none; }

${P} fieldset { margin: 16px 0 0; padding: 0; border: none; }
${P} legend {
  padding: 0; margin-bottom: 8px;
  font-size: 12px; font-weight: 600; color: var(--ghf-fg-muted);
}
${P} .ghf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; }
${P} .ghf-grid > .ghf-wide { grid-column: 1 / -1; }

${P} .ghf-field label { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 500; }
${P} .ghf-input {
  width: 100%; padding: 5px 10px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-canvas); color: var(--ghf-fg);
  font: inherit; font-size: 13px; box-sizing: border-box;
  transition: border-color .12s ease, box-shadow .12s ease;
}
${P} .ghf-input::placeholder { color: var(--ghf-fg-muted); opacity: .7; }
${P} .ghf-input:hover { border-color: var(--ghf-fg-muted); }
${P} select.ghf-input { padding-right: 6px; cursor: pointer; }

${P} :is(.ghf-input, button, [role="tab"]):focus-visible {
  outline: 2px solid var(--ghf-accent); outline-offset: -1px; border-color: var(--ghf-accent);
}

/* ---------- footer ---------- */

${P} footer {
  display: flex; gap: 8px; padding: 12px 16px;
  border-top: 1px solid var(--ghf-border); background: var(--ghf-subtle);
}
${P} .ghf-btn {
  flex: 1; padding: 5px 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .12s ease, transform .06s ease;
}
${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
${P} .ghf-btn:active { transform: translateY(1px); }
${P} .ghf-btn.ghf-primary {
  border-color: transparent; background: var(--ghf-primary); color: #fff;
}
${P} .ghf-btn.ghf-primary:hover { background: var(--ghf-primary-hover); }
${P} .ghf-btn.ghf-compact { flex: 0 0 auto; }

/* ---------- presets ---------- */

${P} .ghf-save { display: flex; gap: 8px; margin: 16px 0 20px; }
${P} .ghf-save .ghf-input { flex: 1; }
${P} .ghf-error { margin: -14px 0 16px; font-size: 12px; color: var(--ghf-danger); }
${P} .ghf-input[aria-invalid="true"] { border-color: var(--ghf-danger); }

${P} .ghf-presets { display: flex; flex-direction: column; gap: 8px; list-style: none; margin: 0; padding: 0; }
${P} .ghf-preset {
  padding: 10px 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius);
  background: var(--ghf-canvas);
  transition: border-color .12s ease;
}
${P} .ghf-preset:hover { border-color: var(--ghf-fg-muted); }
${P} .ghf-preset-head { display: flex; align-items: start; justify-content: space-between; gap: 8px; }
${P} .ghf-preset-name { font-weight: 600; font-size: 13px; overflow-wrap: anywhere; }
${P} .ghf-chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 10px; }
${P} .ghf-chip {
  padding: 0 6px; border: 1px solid var(--ghf-border-muted); border-radius: 20px;
  background: var(--ghf-subtle); color: var(--ghf-fg-muted);
  font-family: var(--ghf-mono); font-size: 10px; line-height: 18px;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
${P} .ghf-preset-actions { display: flex; gap: 6px; }
${P} .ghf-preset-actions .ghf-btn { padding: 3px 10px; font-size: 12px; }
${P} .ghf-empty {
  padding: 28px 16px; border: 1px dashed var(--ghf-border); border-radius: var(--ghf-radius);
  text-align: center; color: var(--ghf-fg-muted); font-size: 13px;
}
${P} .ghf-empty strong { display: block; margin-bottom: 2px; color: var(--ghf-fg); font-size: 13px; }

/* ---------- launcher ---------- */

${F} {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0;
  border: 1px solid var(--ghf-border); border-radius: 50%;
  background: var(--ghf-canvas); color: var(--ghf-fg-muted);
  box-shadow: var(--ghf-shadow); cursor: pointer;
  z-index: 9999;
  transition: color .12s ease, border-color .12s ease, transform .12s cubic-bezier(.2, 0, 0, 1);
}
${F} svg { fill: currentColor; }
${F}:hover { color: var(--ghf-accent); border-color: var(--ghf-accent); transform: scale(1.06); }
${F}:active { transform: scale(.96); }
${F}:focus-visible { outline: 2px solid var(--ghf-accent); outline-offset: 2px; }

/* 40px is fine for a mouse, but touch needs ~44px+ (WCAG 2.5.8, Apple HIG). */
@media (max-width: 767px), (pointer: coarse) {
  ${F} { width: 48px; height: 48px; }
}

@media print {
  ${F} { display: none !important; }
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
	function el(tag, props = {}, ...children) {
		const node = document.createElement(tag);
		for (const [key, value] of Object.entries(props)) {
			if (value == null) continue;
			if (key === "class") node.className = String(value);
			else if (key === "dataset") Object.assign(node.dataset, value);
			else if (key === "role" || key.includes("-")) node.setAttribute(key, String(value));
			else node[key] = value;
		}
		node.append(...children.filter((c) => c != null));
		return node;
	}
	var svg = (paths, size = 16) => {
		const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		node.setAttribute("viewBox", "0 0 16 16");
		node.setAttribute("width", String(size));
		node.setAttribute("height", String(size));
		node.setAttribute("aria-hidden", "true");
		for (const d of paths) {
			const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
			path.setAttribute("d", d);
			node.appendChild(path);
		}
		return node;
	};
	var ICON = {
		search: "M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z",
		x: "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z",
		trash: "M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.576l-.66-6.6a.75.75 0 1 1 1.492-.149ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z",
		sun: "M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Zm9.193 9.193a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Z",
		moon: "M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z",
		desktop: "M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 14.25 12h-3.727c.099 1.041.52 1.872 1.292 2.757A.752.752 0 0 1 11.25 16h-6.5a.752.752 0 0 1-.565-1.243c.772-.885 1.192-1.716 1.292-2.757H1.75A1.75 1.75 0 0 1 0 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
	};
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
		auto: ICON.desktop,
		light: ICON.sun,
		dark: ICON.moon
	};
	function getTheme() {
		const stored = getStoredTheme();
		return CYCLE.includes(stored) ? stored : "auto";
	}
	function applyTheme(theme) {
		setStoredTheme(theme);
		for (const id of [IDS.panel, IDS.fab]) {
			const node = document.getElementById(id);
			if (node) node.dataset.theme = theme;
		}
	}
	var nextTheme = (theme) => CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
	var panel = null;
	var inputs = new Map();
	var field = (id) => inputs.get(id);
	var textOf = (id) => field(id)?.value ?? "";
	function readForm() {
		const q = {};
		for (const f of QUALIFIERS) {
			const value = textOf(f.id).trim();
			if (value) q[f.id] = value;
		}
		return {
			type: textOf("type") || "repositories",
			sort: textOf("sort"),
			and: textOf("and"),
			or: textOf("or"),
			hide: textOf("hide"),
			q
		};
	}
	function writeForm(state) {
		for (const [id, input] of inputs) input.value = id in state ? String(state[id] ?? "") : state.q[id] ?? "";
	}
	var search = (state) => location.assign(buildUrl(state));
	function buildField(f) {
		const input = f.kind === "select" ? el("select", {
			class: "ghf-input",
			id: `ghf-${f.id}`
		}, ...f.options.map((o) => el("option", { value: o.value }, o.label))) : el("input", {
			type: "text",
			class: "ghf-input",
			id: `ghf-${f.id}`,
			placeholder: f.placeholder ?? "",
			autocomplete: "off",
			spellcheck: false
		});
		inputs.set(f.id, input);
		return el("div", { class: `ghf-field${f.kind === "text" && f.full ? " ghf-wide" : ""}` }, el("label", { htmlFor: `ghf-${f.id}` }, f.label), input);
	}
	function chipsFor(state) {
		const chips = [state.type];
		if (state.sort) chips.push(`sort:${state.sort}`);
		if (state.and) chips.push(state.and);
		if (state.or) chips.push(`any: ${state.or}`);
		for (const f of QUALIFIERS) if (state.q[f.id]) chips.push(`${f.qualifier}:${state.q[f.id]}`);
		if (state.hide) chips.push(`hide: ${state.hide}`);
		return chips;
	}
	function renderPresets(list, presets, toBuilder) {
		if (!presets.length) {
			list.replaceChildren(el("li", { class: "ghf-empty" }, el("strong", {}, "No presets yet"), "Set up a search in the builder, then name and save it here."));
			return;
		}
		list.replaceChildren(...presets.map((preset) => {
			const remove = el("button", {
				type: "button",
				class: "ghf-icon-btn ghf-danger",
				title: `Delete "${preset.name}"`,
				"aria-label": `Delete preset ${preset.name}`,
				onclick: () => renderPresets(list, removePreset(preset.id), toBuilder)
			});
			remove.append(svg([ICON.trash], 14));
			return el("li", { class: "ghf-preset" }, el("div", { class: "ghf-preset-head" }, el("div", { class: "ghf-preset-name" }, preset.name), remove), el("div", { class: "ghf-chips" }, ...chipsFor(preset.state).map((c) => el("span", { class: "ghf-chip" }, c))), el("div", { class: "ghf-preset-actions" }, el("button", {
				type: "button",
				class: "ghf-btn ghf-primary",
				onclick: () => search(preset.state)
			}, "Search"), el("button", {
				type: "button",
				class: "ghf-btn",
				onclick: () => {
					writeForm(preset.state);
					toBuilder();
				}
			}, "Edit")));
		}));
	}
	function build() {
		const dialog = el("dialog", {
			id: IDS.panel,
			"aria-label": "GitHub advanced search"
		});
		dialog.dataset.theme = getTheme();
		const themeBtn = el("button", {
			type: "button",
			class: "ghf-icon-btn"
		});
		const paintTheme = () => {
			const theme = getTheme();
			themeBtn.title = LABEL[theme];
			themeBtn.setAttribute("aria-label", LABEL[theme]);
			themeBtn.replaceChildren(svg([THEME_ICON[theme]], 15));
		};
		themeBtn.onclick = () => {
			applyTheme(nextTheme(getTheme()));
			paintTheme();
		};
		paintTheme();
		const closeBtn = el("button", {
			type: "button",
			class: "ghf-icon-btn",
			title: "Close",
			"aria-label": "Close",
			onclick: () => dialog.close()
		});
		closeBtn.append(svg([ICON.x], 16));
		const title = el("h2", {}, "Advanced search");
		title.prepend(svg([ICON.search], 15));
		const tabs = {
			builder: el("button", { type: "button" }, "Builder"),
			presets: el("button", { type: "button" }, "Presets")
		};
		const panels = {
			builder: el("div", { role: "tabpanel" }),
			presets: el("div", { role: "tabpanel" })
		};
		const showTab = (name) => {
			for (const key of ["builder", "presets"]) {
				const on = key === name;
				tabs[key].setAttribute("aria-selected", String(on));
				tabs[key].tabIndex = on ? 0 : -1;
				panels[key].hidden = !on;
			}
			footer.hidden = name !== "builder";
		};
		for (const [name, btn] of Object.entries(tabs)) {
			btn.setAttribute("role", "tab");
			btn.onclick = () => showTab(name);
		}
		for (const section of SECTIONS) panels.builder.append(el("fieldset", {}, el("legend", {}, section.title), el("div", { class: "ghf-grid" }, ...section.fields.map(buildField))));
		const nameInput = el("input", {
			type: "text",
			class: "ghf-input",
			placeholder: "Preset name",
			"aria-label": "Preset name",
			maxLength: 60
		});
		const error = el("p", {
			class: "ghf-error",
			role: "alert",
			hidden: true
		});
		const list = el("ul", { class: "ghf-presets" });
		const toBuilder = () => showTab("builder");
		const saveBtn = el("button", {
			type: "button",
			class: "ghf-btn ghf-primary ghf-compact",
			onclick: () => {
				const name = nameInput.value.trim();
				if (!name) {
					error.textContent = "Give the preset a name first.";
					error.hidden = false;
					nameInput.setAttribute("aria-invalid", "true");
					nameInput.focus();
					return;
				}
				error.hidden = true;
				nameInput.removeAttribute("aria-invalid");
				renderPresets(list, addPreset(name, readForm()), toBuilder);
				nameInput.value = "";
			}
		}, "Save");
		nameInput.oninput = () => {
			error.hidden = true;
			nameInput.removeAttribute("aria-invalid");
		};
		nameInput.onkeydown = (event) => {
			if (event.key !== "Enter") return;
			event.preventDefault();
			saveBtn.click();
		};
		panels.presets.append(el("div", { class: "ghf-save" }, nameInput, saveBtn), error, list);
		const footer = el("footer", {}, el("button", {
			type: "button",
			class: "ghf-btn",
			onclick: () => writeForm(emptyState())
		}, "Reset"), el("button", {
			type: "submit",
			class: "ghf-btn ghf-primary"
		}, "Search"));
		const form = el("form", {
			class: "ghf-form",
			method: "dialog"
		}, el("header", {}, el("div", { class: "ghf-titlebar" }, title, el("nav", {}, themeBtn, closeBtn)), el("div", {
			class: "ghf-tabs",
			role: "tablist",
			"aria-label": "Search panel sections"
		}, tabs.builder, tabs.presets)), el("div", { class: "ghf-body" }, panels.builder, panels.presets), footer);
		form.onsubmit = (event) => {
			event.preventDefault();
			search(readForm());
		};
		dialog.append(form);
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) dialog.close();
		});
		dialog.addEventListener("close", () => setExpanded(false));
		showTab("builder");
		renderPresets(list, getPresets(), toBuilder);
		document.body.append(dialog);
		return dialog;
	}
	var setExpanded = (open) => document.getElementById(IDS.fab)?.setAttribute("aria-expanded", String(open));
	function openPanel() {
		panel ??= build();
		if (panel.open) {
			panel.close();
			return;
		}
		writeForm(parseUrl(location.search));
		panel.showModal();
		setExpanded(true);
		field("and")?.focus();
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
		const btn = el("button", {
			id: IDS.fab,
			type: "button",
			title: "Advanced search",
			"aria-label": "Open advanced search",
			"aria-haspopup": "dialog",
			"aria-expanded": String(panel?.open ?? false),
			dataset: { theme: getTheme() },
			onclick: openPanel
		});
		btn.append(svg([ICON.search], 18));
		document.body.append(btn);
		observeLauncher();
	}
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
	GM_registerMenuCommand("Advanced search", openPanel);
})();
