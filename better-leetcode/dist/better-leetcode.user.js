// ==UserScript==
// @name         Better LeetCode
// @namespace    https://github.com/quantavil/userscript/tree/main/better-leetcode
// @version      1.0.0
// @author       quantavil
// @description  Export LeetCode problems to clean Markdown with test cases, failed submission traces, code templates, comments, and customizable LLM prompts.
// @license      GPL-3.0-or-later
// @homepage     https://github.com/quantavil/userscript/tree/main/better-leetcode
// @homepageURL  https://github.com/quantavil/userscript/tree/main/better-leetcode
// @source       https://github.com/quantavil/userscript.git
// @supportURL   https://github.com/quantavil/userscript/issues
// @match        https://leetcode.com/*
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	var _GM_deleteValue = (() => typeof GM_deleteValue != "undefined" ? GM_deleteValue : void 0)();
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setClipboard = (() => typeof GM_setClipboard != "undefined" ? GM_setClipboard : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _unsafeWindow = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
	var Q_DATA = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    content
    difficulty
    hints
    isPaidOnly
    topicTags { name }
    codeSnippets { lang langSlug code }
  }
}`;
	var Q_TOPIC = `query questionDiscussionTopic($questionSlug: String!) {
  questionDiscussionTopic(questionSlug: $questionSlug) { id commentCount }
}`;
	var Q_COMMENTS = `query discussComments($topicId: Int!, $orderBy: String, $pageNo: Int, $numPerPage: Int) {
  topicComments(topicId: $topicId, orderBy: $orderBy, pageNo: $pageNo, numPerPage: $numPerPage) {
    data { id post { content voteCount author { username } } }
  }
}`;
	var TIMEOUT_MS = 15e3;
	var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
	var asStr = (v) => typeof v === "string" ? v : "";
	var asArr = (v) => Array.isArray(v) ? v : [];
	async function gql(operationName, query, variables) {
		const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? "";
		let res;
		try {
			res = await fetch("/graphql/", {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"content-type": "application/json",
					"x-csrftoken": csrf
				},
				body: JSON.stringify({
					operationName,
					query,
					variables
				}),
				signal: AbortSignal.timeout(TIMEOUT_MS)
			});
		} catch (err) {
			const timedOut = err instanceof DOMException && err.name === "TimeoutError";
			throw new Error(timedOut ? "LeetCode did not respond in time" : "Network error talking to LeetCode");
		}
		if (res.status === 403 || res.status === 429) throw new Error(`LeetCode blocked the request (HTTP ${res.status}). Reload the page and try again`);
		if (!res.ok) throw new Error(`LeetCode returned HTTP ${res.status}`);
		const json = await res.json();
		if (!isObj(json)) throw new Error("Unexpected response from LeetCode");
		const first = asArr(json.errors)[0];
		if (first) throw new Error(isObj(first) && asStr(first.message) ? asStr(first.message) : "GraphQL error");
		return isObj(json.data) ? json.data : {};
	}
	function parseQuestion(raw) {
		if (!isObj(raw)) throw new Error("Problem not found");
		const questionId = asStr(raw.questionId);
		const title = asStr(raw.title);
		if (!questionId || !title) throw new Error("Unexpected question response (LeetCode API changed?)");
		const isPaidOnly = raw.isPaidOnly === true;
		const content = typeof raw.content === "string" && raw.content ? raw.content : null;
		if (content == null) throw new Error(isPaidOnly ? "Premium-only problem: content unavailable" : "Question content unavailable");
		const codeSnippets = [];
		for (const s of asArr(raw.codeSnippets)) if (isObj(s) && asStr(s.lang) && asStr(s.langSlug)) codeSnippets.push({
			lang: asStr(s.lang),
			langSlug: asStr(s.langSlug),
			code: asStr(s.code)
		});
		return {
			questionId,
			frontendId: asStr(raw.questionFrontendId) || questionId,
			title,
			titleSlug: asStr(raw.titleSlug),
			content,
			difficulty: asStr(raw.difficulty),
			hints: asArr(raw.hints).filter((h) => typeof h === "string" && h.trim() !== ""),
			topicTags: asArr(raw.topicTags).flatMap((t) => isObj(t) && asStr(t.name) ? [{ name: asStr(t.name) }] : []),
			codeSnippets,
			isPaidOnly
		};
	}
	var TTL = 3e5;
	var cache = new Map();
	async function getQuestion(slug) {
		const hit = cache.get(slug);
		if (hit && Date.now() - hit.at < TTL) return hit.q;
		const q = parseQuestion((await gql("questionData", Q_DATA, { titleSlug: slug })).question);
		cache.set(slug, {
			at: Date.now(),
			q
		});
		return q;
	}
	async function getComments(slug, count) {
		const topic = (await gql("questionDiscussionTopic", Q_TOPIC, { questionSlug: slug })).questionDiscussionTopic;
		const topicId = isObj(topic) && typeof topic.id === "number" ? topic.id : null;
		if (topicId == null) return [];
		const data = await gql("discussComments", Q_COMMENTS, {
			topicId,
			orderBy: "most_votes",
			pageNo: 1,
			numPerPage: count
		});
		const list = isObj(data.topicComments) ? data.topicComments.data : null;
		if (!Array.isArray(list)) throw new Error("Unexpected comments response");
		return list.flatMap((item) => {
			const post = isObj(item) && isObj(item.post) ? item.post : null;
			const content = post ? asStr(post.content).trim() : "";
			if (!post || !content) return [];
			return [{
				author: isObj(post.author) && asStr(post.author.username) ? asStr(post.author.username) : "anonymous",
				votes: typeof post.voteCount === "number" ? post.voteCount : 0,
				content
			}];
		});
	}
	var CHECK_RE = /\/submissions\/detail\/\d+\/check\/?(?:\?|$)/;
	var ANSI_RE = /\u001b\[[0-9;]*[A-Za-z]/g;
	var text = (v) => {
		if (Array.isArray(v)) return v.map(text).join("\n");
		return v == null ? "" : String(v).replace(ANSI_RE, "");
	};
	function parseCheck(slug, data, now = Date.now()) {
		if (typeof data !== "object" || data === null) return null;
		const d = data;
		if (d.state !== "SUCCESS") return null;
		const status = text(d.status_msg).trim();
		if (!status) return null;
		if (status === "Accepted") return { kind: "accepted" };
		const input = text(d.last_testcase);
		const error = text(d.full_compile_error || d.full_runtime_error || d.compile_error || d.runtime_error);
		if (!input && !error) return null;
		const correct = d.total_correct;
		const total = d.total_testcases;
		return {
			kind: "fail",
			record: {
				slug,
				status,
				input,
				expected: text(d.expected_output),
				output: text(d.code_output),
				stdout: text(d.std_output),
				error,
				passed: typeof correct === "number" && typeof total === "number" ? `${correct} / ${total}` : "",
				time: now
			}
		};
	}
	var DEFAULT_SETTINGS = {
		title: true,
		tags: false,
		statement: true,
		examples: true,
		constraints: true,
		hints: true,
		codeTemplate: true,
		currentCode: true,
		failingTest: true,
		comments: false,
		commentCount: 10,
		prompt: ""
	};
	var clampCommentCount = (n) => {
		const v = Math.round(Number(n));
		return Number.isFinite(v) ? Math.min(30, Math.max(1, v)) : DEFAULT_SETTINGS.commentCount;
	};
	function sanitizeSettings(raw) {
		let src = raw;
		if (typeof src === "string") try {
			src = JSON.parse(src);
		} catch {
			src = null;
		}
		const out = { ...DEFAULT_SETTINGS };
		if (typeof src !== "object" || src === null) return out;
		const rec = src;
		for (const key of Object.keys(DEFAULT_SETTINGS)) {
			const v = rec[key];
			if (key === "prompt") {
				if (typeof v === "string") out.prompt = v;
			} else if (key === "commentCount") {
				if (v !== void 0) out.commentCount = clampCommentCount(v);
			} else if (typeof v === "boolean") out[key] = v;
		}
		return out;
	}
	var SETTINGS_KEY = "bl_settings";
	var failKey = (slug) => `bl_fail_${slug}`;
	var FAIL_MAX_AGE = 2592e6;
	function loadSettings() {
		try {
			return sanitizeSettings(_GM_getValue(SETTINGS_KEY, null));
		} catch {
			return sanitizeSettings(null);
		}
	}
	function saveSettings(s) {
		_GM_setValue(SETTINGS_KEY, s);
	}
	function getFailure(slug) {
		try {
			const raw = _GM_getValue(failKey(slug), null);
			const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
			if (!rec || typeof rec.time !== "number") return null;
			if (Date.now() - rec.time > FAIL_MAX_AGE) {
				_GM_deleteValue(failKey(slug));
				return null;
			}
			return rec;
		} catch {
			return null;
		}
	}
	var setFailure = (rec) => _GM_setValue(failKey(rec.slug), rec);
	var clearFailure = (slug) => _GM_deleteValue(failKey(slug));
	function currentSlug() {
		return location.pathname.match(/^\/problems\/([^/]+)/)?.[1] ?? null;
	}
	function record(slug, data) {
		if (!slug) return;
		const result = parseCheck(slug, data);
		if (result?.kind === "fail") setFailure(result.record);
		else if (result?.kind === "accepted") clearFailure(slug);
	}
	function installCapture() {
		const w = _unsafeWindow;
		if (w.__blCapture) return;
		w.__blCapture = true;
		const origFetch = w.fetch;
		const patchedFetch = function(...args) {
			const promise = origFetch.apply(this, args);
			try {
				const a0 = args[0];
				const url = typeof a0 === "string" ? a0 : a0 instanceof Request ? a0.url : String(a0);
				if (CHECK_RE.test(url)) {
					const slug = currentSlug();
					promise.then((res) => res.clone().json().then((d) => record(slug, d))).catch(() => {});
				}
			} catch {}
			return promise;
		};
		w.fetch = patchedFetch;
		const proto = w.XMLHttpRequest.prototype;
		const origOpen = proto.open;
		proto.open = function(method, url, ...rest) {
			try {
				if (CHECK_RE.test(String(url))) {
					const slug = currentSlug();
					this.addEventListener("load", () => {
						try {
							record(slug, JSON.parse(this.responseText));
						} catch {}
					});
				}
			} catch {}
			return origOpen.call(this, method, url, ...rest);
		};
	}
	function languageLabel() {
		return document.querySelector("#editor button[aria-haspopup=\"dialog\"]")?.textContent?.trim() || null;
	}
	function readCode() {
		try {
			const model = (_unsafeWindow.monaco?.editor?.getEditors?.() ?? []).find((e) => e.getContainerDomNode?.()?.closest("#editor"))?.getModel?.();
			if (model) return {
				code: model.getValue(),
				monacoLang: model.getLanguageId?.() ?? null,
				partial: false
			};
		} catch {}
		const lines = Array.from(document.querySelectorAll("#editor .view-line"));
		if (!lines.length) return null;
		return {
			code: lines.sort((a, b) => Number.parseFloat(a.style.top) - Number.parseFloat(b.style.top)).map((l) => (l.textContent ?? "").replace(/\u00a0/g, " ")).join("\n"),
			monacoLang: null,
			partial: true
		};
	}
	var wrap$1 = (inner, size = 18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
	var iconCopy = (size) => wrap$1("<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>", size);
	var iconCheck = (size) => wrap$1("<path d=\"M20 6 9 17l-5-5\"/>", size);
	var iconAlert = (size) => wrap$1("<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"/><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"/>", size);
	var iconSettings = (size) => wrap$1("<path d=\"M20 7h-9\"/><path d=\"M14 17H5\"/><circle cx=\"17\" cy=\"17\" r=\"3\"/><circle cx=\"7\" cy=\"7\" r=\"3\"/>", size);
	var iconClose = (size) => wrap$1("<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>", size);
	var CSS = `
:host{all:initial}
.wrap{
  --bg:#ffffff; --layer:#f7f8fa; --border:#e6e8eb; --text:#262626; --muted:#6b7280;
  --accent:#ffa116; --green:#2cbb5d; --red:#ef4743; --hover:rgba(0,0,0,.06); --shadow:0 12px 40px rgba(0,0,0,.25);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:14px; line-height:1.45; color:var(--text); text-align:left;
}
.wrap[data-theme="dark"]{
  --bg:#282828; --layer:#333333; --border:#3e3e3e; --text:#eff1f6; --muted:#9a9a9a;
  --hover:rgba(255,255,255,.08); --shadow:0 12px 40px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
svg{display:block}

dialog.modal{width:min(460px,calc(100vw - 24px));max-height:calc(100dvh - 24px);margin:auto;padding:0;overflow:hidden;
  color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow)}
dialog.modal[open]{display:flex;flex-direction:column}
dialog.modal::backdrop{background:rgba(0,0,0,.5)}
.head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border)}
.head h2{margin:0;font-size:15px;font-weight:600}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:0;border-radius:5px;background:transparent;color:var(--muted);cursor:pointer}
.icon-btn:hover{background:var(--hover);color:var(--text)}
.body{padding:8px 14px 12px;overflow:auto}
.section-title{display:block;margin:8px 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
.card{background:var(--layer);border-radius:6px;border:1px solid var(--border);overflow:hidden}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;cursor:pointer}
.row:hover{background:var(--hover)}
.row + .row{border-top:1px solid var(--border)}
.row .txt{display:flex;flex-direction:column;min-width:0}
.row .label{font-size:13px;font-weight:500}
.row .desc{font-size:11px;color:var(--muted)}
.switch{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:30px;height:18px;margin:0;border:0;border-radius:999px;background:#8a8a8a66;cursor:pointer;transition:background .15s}
.switch::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}
.switch:checked{background:var(--green)}
.switch:checked::after{transform:translateX(12px)}
.switch:focus-visible,.icon-btn:focus-visible,.btn:focus-visible,.num:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.num::-webkit-inner-spin-button,.num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.num{-moz-appearance:textfield;appearance:textfield;width:44px;text-align:center;padding:3px 6px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);font:inherit;font-size:12px}
.num:disabled{opacity:.45;cursor:not-allowed}
textarea{display:block;width:100%;min-height:64px;resize:vertical;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--layer);color:var(--text);font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.hint{margin-top:4px;font-size:11px;color:var(--muted)}
.hint code{background:var(--layer);border:1px solid var(--border);border-radius:4px;padding:0 4px}
.foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 14px;border-top:1px solid var(--border)}
.btn{padding:5px 14px;border-radius:6px;border:1px solid var(--border);background:var(--layer);color:var(--text);font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.btn:hover{background:var(--hover)}
.btn.primary{background:var(--green);border-color:var(--green);color:#fff}
.btn.primary:hover{filter:brightness(1.08)}

.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:10px 14px;border-radius:10px;background:var(--layer);color:var(--text);border:1px solid var(--border);box-shadow:var(--shadow);animation:in .18s ease-out}
.toast.ok svg{color:var(--green)}
.toast.warn svg{color:var(--accent)}
.toast.error svg{color:var(--red)}
@keyframes in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;
	var PAGE_CSS = `
.bl-copy{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin-left:8px;border:0;border-radius:6px;background:transparent;color:inherit;opacity:.55;cursor:pointer;vertical-align:middle;position:relative;top:-2px;transition:opacity .15s,background .15s,color .15s}
.bl-copy:hover{opacity:1;background:rgba(127,127,127,.2)}
.bl-copy:focus-visible{opacity:1;outline:2px solid #ffa116;outline-offset:1px}
.bl-copy[data-state="busy"]{opacity:.5;cursor:progress}
.bl-copy[data-state="done"]{opacity:1;color:#2cbb5d}
.bl-copy[data-state="error"]{opacity:1;color:#ef4743}
.bl-gear{display:inline-flex;align-items:center;justify-content:center}
@media (prefers-reduced-motion:reduce){.bl-copy{transition:none}}
`;
	var TITLE_LINK = ".text-title-large a[href^=\"/problems/\"]";
	var HELP_ICON = "svg.fa-circle-question";
	var timers = new WeakMap();
	function setCopyState(btn, state) {
		btn.dataset.state = state;
		btn.setAttribute("aria-busy", String(state === "busy"));
		btn.innerHTML = state === "done" ? iconCheck(18) : state === "error" ? iconAlert(18) : iconCopy(18);
		window.clearTimeout(timers.get(btn));
		if (state === "done" || state === "error") timers.set(btn, window.setTimeout(() => btn.isConnected && setCopyState(btn, "idle"), 1800));
	}
	function ensureStyle() {
		if (document.getElementById("bl-page-style")) return;
		const style = document.createElement("style");
		style.id = "bl-page-style";
		style.textContent = PAGE_CSS;
		(document.head ?? document.documentElement).append(style);
	}
	function makeButton(className, label) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = className;
		btn.title = label;
		btn.setAttribute("aria-label", label);
		return btn;
	}
	function createCopyButton(onCopy) {
		const btn = makeButton("bl-copy", "Copy problem as Markdown");
		setCopyState(btn, "idle");
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (btn.dataset.state !== "busy") onCopy(btn);
		});
		return btn;
	}
	function createGearButton(onSettings, className) {
		const btn = makeButton(className, "Better LeetCode settings");
		btn.innerHTML = `<span class="bl-gear">${iconSettings(16)}</span>`;
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			onSettings();
		});
		return btn;
	}
	function startInjection(onCopy, onSettings) {
		let copyBtn = null;
		let gearBtn = null;
		let queued = false;
		const run = () => {
			queued = false;
			if (!location.pathname.startsWith("/problems/")) return;
			if (copyBtn?.isConnected && gearBtn?.isConnected) return;
			ensureStyle();
			if (!copyBtn?.isConnected) {
				const anchor = document.querySelector(TITLE_LINK);
				if (anchor) {
					copyBtn = createCopyButton(onCopy);
					anchor.after(copyBtn);
				}
			}
			if (!gearBtn?.isConnected) {
				const help = (document.querySelector("[data-track-load=\"description_content\"]")?.closest(".flexlayout__tab"))?.querySelector(HELP_ICON)?.closest("button");
				if (help) {
					gearBtn = createGearButton(onSettings, help.className);
					help.after(gearBtn);
				} else if (copyBtn?.isConnected) {
					gearBtn = createGearButton(onSettings, "bl-copy");
					copyBtn.after(gearBtn);
				}
			}
		};
		new MutationObserver(() => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(run);
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		run();
	}
	var import_turndown_plugin_gfm_cjs = __commonJSMin(((exports) => {
		Object.defineProperty(exports, "__esModule", { value: true });
		var indexOf = Array.prototype.indexOf;
		var every = Array.prototype.every;
		var rules = {};
		var alignMap = {
			left: ":---",
			right: "---:",
			center: ":---:"
		};
		var isCodeBlock_ = null;
		var options_ = null;
		var tableShouldBeSkippedCache_ = new WeakMap();
		function getAlignment(node) {
			return node ? (node.getAttribute("align") || node.style.textAlign || "").toLowerCase() : "";
		}
		function getBorder(alignment) {
			return alignment ? alignMap[alignment] : "---";
		}
		function getColumnAlignment(table, columnIndex) {
			var votes = {
				left: 0,
				right: 0,
				center: 0,
				"": 0
			};
			var align = "";
			for (var i = 0; i < table.rows.length; ++i) {
				var row = table.rows[i];
				if (columnIndex < row.childNodes.length) {
					var cellAlignment = getAlignment(row.childNodes[columnIndex]);
					++votes[cellAlignment];
					if (votes[cellAlignment] > votes[align]) align = cellAlignment;
				}
			}
			return align;
		}
		rules.tableCell = {
			filter: ["th", "td"],
			replacement: function(content, node) {
				if (tableShouldBeSkipped(nodeParentTable(node))) return content;
				return cell(content, node);
			}
		};
		rules.tableRow = {
			filter: "tr",
			replacement: function(content, node) {
				const parentTable = nodeParentTable(node);
				if (tableShouldBeSkipped(parentTable)) return content;
				var borderCells = "";
				if (isHeadingRow(node)) {
					const colCount = tableColCount(parentTable);
					for (var i = 0; i < colCount; i++) {
						const childNode = i < node.childNodes.length ? node.childNodes[i] : null;
						var border = getBorder(getColumnAlignment(parentTable, i));
						borderCells += cell(border, childNode, i);
					}
				}
				return "\n" + content + (borderCells ? "\n" + borderCells : "");
			}
		};
		rules.table = {
			filter: function(node, options) {
				return node.nodeName === "TABLE";
			},
			replacement: function(content, node) {
				if (tableShouldBeHtml(node, options_)) {
					let html = node.outerHTML;
					let divParent = nodeParentDiv(node);
					if (divParent === null || !divParent.classList.contains("joplin-table-wrapper")) return `\n\n<div class="joplin-table-wrapper">${html}</div>\n\n`;
					else return html;
				} else {
					if (tableShouldBeSkipped(node)) return content;
					content = content.replace(/\n+/g, "\n");
					var secondLine = content.trim().split("\n");
					if (secondLine.length >= 2) secondLine = secondLine[1];
					var secondLineIsDivider = /\| :?---/.test(secondLine);
					var columnCount = tableColCount(node);
					var emptyHeader = "";
					if (columnCount && !secondLineIsDivider) {
						emptyHeader = "|" + "     |".repeat(columnCount) + "\n|";
						for (var columnIndex = 0; columnIndex < columnCount; ++columnIndex) emptyHeader += " " + getBorder(getColumnAlignment(node, columnIndex)) + " |";
					}
					const captionNode = node.querySelector ? node.querySelector("caption") : node.caption;
					const captionContent = captionNode ? captionNode.textContent || "" : "";
					return `\n\n${captionContent ? `${captionContent}\n\n` : ""}${`${emptyHeader}${content}`.trimStart()}\n\n`;
				}
			}
		};
		rules.tableCaption = {
			filter: ["caption"],
			replacement: () => ""
		};
		rules.tableColgroup = {
			filter: ["colgroup", "col"],
			replacement: () => ""
		};
		rules.tableSection = {
			filter: [
				"thead",
				"tbody",
				"tfoot"
			],
			replacement: function(content) {
				return content;
			}
		};
		function isHeadingRow(tr) {
			var parentNode = tr.parentNode;
			return parentNode.nodeName === "THEAD" || parentNode.firstChild === tr && (parentNode.nodeName === "TABLE" || isFirstTbody(parentNode)) && every.call(tr.childNodes, function(n) {
				return n.nodeName === "TH";
			});
		}
		function isFirstTbody(element) {
			var previousSibling = element.previousSibling;
			return element.nodeName === "TBODY" && (!previousSibling || previousSibling.nodeName === "THEAD" && /^\s*$/i.test(previousSibling.textContent));
		}
		function cell(content, node = null, index = null) {
			if (index === null) index = indexOf.call(node.parentNode.childNodes, node);
			var prefix = " ";
			if (index === 0) prefix = "| ";
			let filteredContent = content.trim().replace(/\n\r/g, "<br>").replace(/\n/g, "<br>");
			filteredContent = filteredContent.replace(/\|+/g, "\\|");
			while (filteredContent.length < 3) filteredContent += " ";
			if (node) filteredContent = handleColSpan(filteredContent, node, " ");
			return prefix + filteredContent + " |";
		}
		function nodeContainsTable(node) {
			if (!node.childNodes) return false;
			for (let i = 0; i < node.childNodes.length; i++) {
				const child = node.childNodes[i];
				if (child.nodeName === "TABLE") return true;
				if (nodeContainsTable(child)) return true;
			}
			return false;
		}
		var nodeContains = (node, types) => {
			if (!node.childNodes) return false;
			for (let i = 0; i < node.childNodes.length; i++) {
				const child = node.childNodes[i];
				if (types === "code" && isCodeBlock_ && isCodeBlock_(child)) return true;
				if (types.includes(child.nodeName)) return true;
				if (nodeContains(child, types)) return true;
			}
			return false;
		};
		var customStyleProperties = [
			"background-color",
			"background",
			"border-color",
			"border",
			"border-top",
			"border-right",
			"border-bottom",
			"border-left",
			"border-style",
			"border-width",
			"padding",
			"padding-top",
			"padding-right",
			"padding-bottom",
			"padding-left",
			"float",
			"margin-left",
			"margin-right"
		];
		var customAttributeNames = [
			"bgcolor",
			"bordercolor",
			"background"
		];
		var nodeHasCustomStyle = (node) => {
			if (!node || !node.getAttribute) return false;
			const styleAttr = node.getAttribute("style");
			if (!styleAttr) return false;
			const properties = styleAttr.split(";").map((s) => s.split(":")[0].trim().toLowerCase()).filter((s) => s.length > 0);
			for (let i = 0; i < properties.length; i++) if (customStyleProperties.includes(properties[i])) return true;
			return false;
		};
		var hasNonDefaultSpacingAttribute = (node, name) => {
			if (!node || !node.getAttribute) return false;
			const value = node.getAttribute(name);
			if (value === null) return false;
			const normalisedValue = `${value}`.trim().toLowerCase();
			if (!normalisedValue) return false;
			if (normalisedValue === "0" || normalisedValue === "0px") return false;
			return true;
		};
		var nodeHasCustomAttributes = (node) => {
			if (!node || !node.getAttribute) return false;
			for (let i = 0; i < customAttributeNames.length; i++) {
				const value = node.getAttribute(customAttributeNames[i]);
				if (value !== null && `${value}`.trim() !== "") return true;
			}
			if (node.nodeName === "TABLE") {
				if (hasNonDefaultSpacingAttribute(node, "cellpadding")) return true;
				if (hasNonDefaultSpacingAttribute(node, "cellspacing")) return true;
			}
			return false;
		};
		var nodeHasCustomFormatting = (node) => {
			return nodeHasCustomStyle(node) || nodeHasCustomAttributes(node);
		};
		var tableHasCustomStyles = (tableNode) => {
			if (nodeHasCustomFormatting(tableNode)) return true;
			const rows = tableNode.rows;
			if (!rows) return false;
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i];
				if (nodeHasCustomFormatting(row)) return true;
				for (let j = 0; j < row.childNodes.length; j++) {
					const cell = row.childNodes[j];
					if ((cell.nodeName === "TD" || cell.nodeName === "TH") && nodeHasCustomFormatting(cell)) return true;
				}
			}
			return false;
		};
		var tableShouldBeHtml = (tableNode, options) => {
			const possibleTags = [
				"UL",
				"OL",
				"H1",
				"H2",
				"H3",
				"H4",
				"H5",
				"H6",
				"HR",
				"BLOCKQUOTE"
			];
			if (options.preserveNestedTables) possibleTags.push("TABLE");
			return nodeContains(tableNode, "code") || nodeContains(tableNode, possibleTags) || options.preserveTableStyles && tableHasCustomStyles(tableNode);
		};
		function tableShouldBeSkipped(tableNode) {
			const cached = tableShouldBeSkippedCache_.get(tableNode);
			if (cached !== void 0) return cached;
			const result = tableShouldBeSkipped_(tableNode);
			tableShouldBeSkippedCache_.set(tableNode, result);
			return result;
		}
		function tableShouldBeSkipped_(tableNode) {
			if (!tableNode) return true;
			if (!tableNode.rows) return true;
			if (tableNode.rows.length === 1 && tableNode.rows[0].childNodes.length <= 1) return true;
			if (nodeContainsTable(tableNode)) return true;
			return false;
		}
		function nodeParentDiv(node) {
			let parent = node.parentNode;
			while (parent.nodeName !== "DIV") {
				parent = parent.parentNode;
				if (!parent) return null;
			}
			return parent;
		}
		function nodeParentTable(node) {
			let parent = node.parentNode;
			while (parent.nodeName !== "TABLE") {
				parent = parent.parentNode;
				if (!parent) return null;
			}
			return parent;
		}
		function handleColSpan(content, node, emptyChar) {
			const colspan = node.getAttribute("colspan") || 1;
			for (let i = 1; i < colspan; i++) content += " | " + emptyChar.repeat(3);
			return content;
		}
		function tableColCount(node) {
			let maxColCount = 0;
			for (let i = 0; i < node.rows.length; i++) {
				const colCount = node.rows[i].childNodes.length;
				if (colCount > maxColCount) maxColCount = colCount;
			}
			return maxColCount;
		}
		function tables(turndownService) {
			isCodeBlock_ = turndownService.isCodeBlock;
			options_ = turndownService.options;
			turndownService.keep(function(node) {
				if (node.nodeName === "TABLE" && tableShouldBeHtml(node, turndownService.options)) return true;
				return false;
			});
			for (var key in rules) turndownService.addRule(key, rules[key]);
		}
		exports.tables = tables;
	}))();
	function extend(destination) {
		for (var i = 1; i < arguments.length; i++) {
			var source = arguments[i];
			for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key];
		}
		return destination;
	}
	function repeat(character, count) {
		return Array(count + 1).join(character);
	}
	function trimLeadingNewlines(string) {
		return string.replace(/^\n*/, "");
	}
	function trimTrailingNewlines(string) {
		var indexEnd = string.length;
		while (indexEnd > 0 && string[indexEnd - 1] === "\n") indexEnd--;
		return string.substring(0, indexEnd);
	}
	function trimNewlines(string) {
		return trimTrailingNewlines(trimLeadingNewlines(string));
	}
	var blockElements = [
		"ADDRESS",
		"ARTICLE",
		"ASIDE",
		"AUDIO",
		"BLOCKQUOTE",
		"BODY",
		"CANVAS",
		"CENTER",
		"DD",
		"DIR",
		"DIV",
		"DL",
		"DT",
		"FIELDSET",
		"FIGCAPTION",
		"FIGURE",
		"FOOTER",
		"FORM",
		"FRAMESET",
		"H1",
		"H2",
		"H3",
		"H4",
		"H5",
		"H6",
		"HEADER",
		"HGROUP",
		"HR",
		"HTML",
		"ISINDEX",
		"LI",
		"MAIN",
		"MENU",
		"NAV",
		"NOFRAMES",
		"NOSCRIPT",
		"OL",
		"OUTPUT",
		"P",
		"PRE",
		"SECTION",
		"TABLE",
		"TBODY",
		"TD",
		"TFOOT",
		"TH",
		"THEAD",
		"TR",
		"UL"
	];
	function isBlock(node) {
		return is(node, blockElements);
	}
	var voidElements = [
		"AREA",
		"BASE",
		"BR",
		"COL",
		"COMMAND",
		"EMBED",
		"HR",
		"IMG",
		"INPUT",
		"KEYGEN",
		"LINK",
		"META",
		"PARAM",
		"SOURCE",
		"TRACK",
		"WBR"
	];
	function isVoid(node) {
		return is(node, voidElements);
	}
	function hasVoid(node) {
		return has(node, voidElements);
	}
	var meaningfulWhenBlankElements = [
		"A",
		"TABLE",
		"THEAD",
		"TBODY",
		"TFOOT",
		"TH",
		"TD",
		"IFRAME",
		"SCRIPT",
		"AUDIO",
		"VIDEO"
	];
	function isMeaningfulWhenBlank(node) {
		return is(node, meaningfulWhenBlankElements);
	}
	function hasMeaningfulWhenBlank(node) {
		return has(node, meaningfulWhenBlankElements);
	}
	function is(node, tagNames) {
		return tagNames.indexOf(node.nodeName) >= 0;
	}
	function has(node, tagNames) {
		return node.getElementsByTagName && tagNames.some(function(tagName) {
			return node.getElementsByTagName(tagName).length;
		});
	}
	var markdownEscapes = [
		[/\\/g, "\\\\"],
		[/\*/g, "\\*"],
		[/^-/g, "\\-"],
		[/^\+ /g, "\\+ "],
		[/^(=+)/g, "\\$1"],
		[/^(#{1,6}) /g, "\\$1 "],
		[/`/g, "\\`"],
		[/^~~~/g, "\\~~~"],
		[/\[/g, "\\["],
		[/\]/g, "\\]"],
		[/^>/g, "\\>"],
		[/_/g, "\\_"],
		[/^(\d+)\. /g, "$1\\. "]
	];
	function escapeMarkdown(string) {
		return markdownEscapes.reduce(function(accumulator, escape) {
			return accumulator.replace(escape[0], escape[1]);
		}, string);
	}
	var rules = {};
	rules.paragraph = {
		filter: "p",
		replacement: function(content) {
			return "\n\n" + content + "\n\n";
		}
	};
	rules.lineBreak = {
		filter: "br",
		replacement: function(content, node, options) {
			return options.br + "\n";
		}
	};
	rules.heading = {
		filter: [
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6"
		],
		replacement: function(content, node, options) {
			var hLevel = Number(node.nodeName.charAt(1));
			if (options.headingStyle === "setext" && hLevel < 3) {
				var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
				return "\n\n" + content + "\n" + underline + "\n\n";
			} else return "\n\n" + repeat("#", hLevel) + " " + content + "\n\n";
		}
	};
	rules.blockquote = {
		filter: "blockquote",
		replacement: function(content) {
			content = trimNewlines(content).replace(/^/gm, "> ");
			return "\n\n" + content + "\n\n";
		}
	};
	rules.list = {
		filter: ["ul", "ol"],
		replacement: function(content, node) {
			var parent = node.parentNode;
			if (parent.nodeName === "LI" && parent.lastElementChild === node) return "\n" + content;
			else return "\n\n" + content + "\n\n";
		}
	};
	rules.listItem = {
		filter: "li",
		replacement: function(content, node, options) {
			var prefix = options.bulletListMarker + "   ";
			var parent = node.parentNode;
			if (parent.nodeName === "OL") {
				var start = parent.getAttribute("start");
				var index = Array.prototype.indexOf.call(parent.children, node);
				prefix = (start ? Number(start) + index : index + 1) + ".  ";
			}
			var isParagraph = /\n$/.test(content);
			content = trimNewlines(content) + (isParagraph ? "\n" : "");
			content = content.replace(/\n/gm, "\n" + " ".repeat(prefix.length));
			return prefix + content + (node.nextSibling ? "\n" : "");
		}
	};
	rules.indentedCodeBlock = {
		filter: function(node, options) {
			return options.codeBlockStyle === "indented" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
		},
		replacement: function(content, node, options) {
			return "\n\n    " + node.firstChild.textContent.replace(/\n/g, "\n    ") + "\n\n";
		}
	};
	rules.fencedCodeBlock = {
		filter: function(node, options) {
			return options.codeBlockStyle === "fenced" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
		},
		replacement: function(content, node, options) {
			var language = ((node.firstChild.getAttribute("class") || "").match(/language-(\S+)/) || [null, ""])[1];
			var code = node.firstChild.textContent;
			var fenceChar = options.fence.charAt(0);
			var fenceSize = 3;
			var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");
			var match;
			while (match = fenceInCodeRegex.exec(code)) if (match[0].length >= fenceSize) fenceSize = match[0].length + 1;
			var fence = repeat(fenceChar, fenceSize);
			return "\n\n" + fence + language + "\n" + code.replace(/\n$/, "") + "\n" + fence + "\n\n";
		}
	};
	rules.horizontalRule = {
		filter: "hr",
		replacement: function(content, node, options) {
			return "\n\n" + options.hr + "\n\n";
		}
	};
	rules.inlineLink = {
		filter: function(node, options) {
			return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href");
		},
		replacement: function(content, node) {
			var href = escapeLinkDestination(node.getAttribute("href"));
			var title = escapeLinkTitle(cleanAttribute(node.getAttribute("title")));
			var titlePart = title ? " \"" + title + "\"" : "";
			return "[" + content + "](" + href + titlePart + ")";
		}
	};
	rules.referenceLink = {
		filter: function(node, options) {
			return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
		},
		replacement: function(content, node, options) {
			var href = escapeLinkDestination(node.getAttribute("href"));
			var title = cleanAttribute(node.getAttribute("title"));
			if (title) title = " \"" + escapeLinkTitle(title) + "\"";
			var replacement;
			var reference;
			switch (options.linkReferenceStyle) {
				case "collapsed":
					replacement = "[" + content + "][]";
					reference = "[" + content + "]: " + href + title;
					break;
				case "shortcut":
					replacement = "[" + content + "]";
					reference = "[" + content + "]: " + href + title;
					break;
				default:
					var id = this.references.length + 1;
					replacement = "[" + content + "][" + id + "]";
					reference = "[" + id + "]: " + href + title;
			}
			this.references.push(reference);
			return replacement;
		},
		references: [],
		append: function(options) {
			var references = "";
			if (this.references.length) {
				references = "\n\n" + this.references.join("\n") + "\n\n";
				this.references = [];
			}
			return references;
		}
	};
	rules.emphasis = {
		filter: ["em", "i"],
		replacement: function(content, node, options) {
			if (!content.trim()) return "";
			return options.emDelimiter + content + options.emDelimiter;
		}
	};
	rules.strong = {
		filter: ["strong", "b"],
		replacement: function(content, node, options) {
			if (!content.trim()) return "";
			return options.strongDelimiter + content + options.strongDelimiter;
		}
	};
	rules.code = {
		filter: function(node) {
			var hasSiblings = node.previousSibling || node.nextSibling;
			var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
			return node.nodeName === "CODE" && !isCodeBlock;
		},
		replacement: function(content) {
			if (!content) return "";
			content = content.replace(/\r?\n|\r/g, " ");
			var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
			var delimiter = "`";
			var matches = content.match(/`+/gm) || [];
			while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + "`";
			return delimiter + extraSpace + content + extraSpace + delimiter;
		}
	};
	rules.image = {
		filter: "img",
		replacement: function(content, node) {
			var alt = escapeMarkdown(cleanAttribute(node.getAttribute("alt")));
			var src = escapeLinkDestination(node.getAttribute("src") || "");
			var title = cleanAttribute(node.getAttribute("title"));
			var titlePart = title ? " \"" + escapeLinkTitle(title) + "\"" : "";
			return src ? "![" + alt + "](" + src + titlePart + ")" : "";
		}
	};
	function cleanAttribute(attribute) {
		return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
	}
	function escapeLinkDestination(destination) {
		var escaped = destination.replace(/([<>()])/g, "\\$1");
		return escaped.indexOf(" ") >= 0 ? "<" + escaped + ">" : escaped;
	}
	function escapeLinkTitle(title) {
		return title.replace(/"/g, "\\\"");
	}
	function Rules(options) {
		this.options = options;
		this._keep = [];
		this._remove = [];
		this.blankRule = { replacement: options.blankReplacement };
		this.keepReplacement = options.keepReplacement;
		this.defaultRule = { replacement: options.defaultReplacement };
		this.array = [];
		for (var key in options.rules) this.array.push(options.rules[key]);
	}
	Rules.prototype = {
		add: function(key, rule) {
			this.array.unshift(rule);
		},
		keep: function(filter) {
			this._keep.unshift({
				filter,
				replacement: this.keepReplacement
			});
		},
		remove: function(filter) {
			this._remove.unshift({
				filter,
				replacement: function() {
					return "";
				}
			});
		},
		forNode: function(node) {
			if (node.isBlank) return this.blankRule;
			var rule;
			if (rule = findRule(this.array, node, this.options)) return rule;
			if (rule = findRule(this._keep, node, this.options)) return rule;
			if (rule = findRule(this._remove, node, this.options)) return rule;
			return this.defaultRule;
		},
		forEach: function(fn) {
			for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
		}
	};
	function findRule(rules, node, options) {
		for (var i = 0; i < rules.length; i++) {
			var rule = rules[i];
			if (filterValue(rule, node, options)) return rule;
		}
	}
	function filterValue(rule, node, options) {
		var filter = rule.filter;
		if (typeof filter === "string") {
			if (filter === node.nodeName.toLowerCase()) return true;
		} else if (Array.isArray(filter)) {
			if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
		} else if (typeof filter === "function") {
			if (filter.call(rule, node, options)) return true;
		} else throw new TypeError("`filter` needs to be a string, array, or function");
	}
	function collapseWhitespace(options) {
		var element = options.element;
		var isBlock = options.isBlock;
		var isVoid = options.isVoid;
		var isPre = options.isPre || function(node) {
			return node.nodeName === "PRE";
		};
		if (!element.firstChild || isPre(element)) return;
		var prevText = null;
		var keepLeadingWs = false;
		var prev = null;
		var node = next(prev, element, isPre);
		while (node !== element) {
			if (node.nodeType === 3 || node.nodeType === 4) {
				var text = node.data.replace(/[ \r\n\t]+/g, " ");
				if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === " ") text = text.substr(1);
				if (!text) {
					node = remove(node);
					continue;
				}
				node.data = text;
				prevText = node;
			} else if (node.nodeType === 1) {
				if (isBlock(node) || node.nodeName === "BR") {
					if (prevText) prevText.data = prevText.data.replace(/ $/, "");
					prevText = null;
					keepLeadingWs = false;
				} else if (isVoid(node) || isPre(node)) {
					prevText = null;
					keepLeadingWs = true;
				} else if (prevText) keepLeadingWs = false;
			} else {
				node = remove(node);
				continue;
			}
			var nextNode = next(prev, node, isPre);
			prev = node;
			node = nextNode;
		}
		if (prevText) {
			prevText.data = prevText.data.replace(/ $/, "");
			if (!prevText.data) remove(prevText);
		}
	}
	function remove(node) {
		var next = node.nextSibling || node.parentNode;
		node.parentNode.removeChild(node);
		return next;
	}
	function next(prev, current, isPre) {
		if (prev && prev.parentNode === current || isPre(current)) return current.nextSibling || current.parentNode;
		return current.firstChild || current.nextSibling || current.parentNode;
	}
	var root = typeof window !== "undefined" ? window : {};
	function canParseHTMLNatively() {
		var Parser = root.DOMParser;
		var canParse = false;
		try {
			if (new Parser().parseFromString("", "text/html")) canParse = true;
		} catch (e) {}
		return canParse;
	}
	function createHTMLParser() {
		var Parser = function() {};
		if (shouldUseActiveX()) Parser.prototype.parseFromString = function(string) {
			var doc = new window.ActiveXObject("htmlfile");
			doc.designMode = "on";
			doc.open();
			doc.write(string);
			doc.close();
			return doc;
		};
		else Parser.prototype.parseFromString = function(string) {
			var doc = document.implementation.createHTMLDocument("");
			doc.open();
			doc.write(string);
			doc.close();
			return doc;
		};
		return Parser;
	}
	function shouldUseActiveX() {
		var useActiveX = false;
		try {
			document.implementation.createHTMLDocument("").open();
		} catch (e) {
			if (root.ActiveXObject) useActiveX = true;
		}
		return useActiveX;
	}
	var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();
	function RootNode(input, options) {
		var root;
		if (typeof input === "string") root = htmlParser().parseFromString("<x-turndown id=\"turndown-root\">" + input + "</x-turndown>", "text/html").getElementById("turndown-root");
		else root = input.cloneNode(true);
		collapseWhitespace({
			element: root,
			isBlock,
			isVoid,
			isPre: options.preformattedCode ? isPreOrCode : null
		});
		return root;
	}
	var _htmlParser;
	function htmlParser() {
		_htmlParser = _htmlParser || new HTMLParser();
		return _htmlParser;
	}
	function isPreOrCode(node) {
		return node.nodeName === "PRE" || node.nodeName === "CODE";
	}
	function Node(node, options) {
		node.isBlock = isBlock(node);
		node.isCode = node.nodeName === "CODE" || node.parentNode.isCode;
		node.isBlank = isBlank(node);
		node.flankingWhitespace = flankingWhitespace(node, options);
		return node;
	}
	function isBlank(node) {
		return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
	}
	function flankingWhitespace(node, options) {
		if (node.isBlock || options.preformattedCode && node.isCode) return {
			leading: "",
			trailing: ""
		};
		var edges = edgeWhitespace(node.textContent);
		if (edges.leadingAscii && isFlankedByWhitespace("left", node, options)) edges.leading = edges.leadingNonAscii;
		if (edges.trailingAscii && isFlankedByWhitespace("right", node, options)) edges.trailing = edges.trailingNonAscii;
		return {
			leading: edges.leading,
			trailing: edges.trailing
		};
	}
	function edgeWhitespace(string) {
		var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
		return {
			leading: m[1],
			leadingAscii: m[2],
			leadingNonAscii: m[3],
			trailing: m[4],
			trailingNonAscii: m[5],
			trailingAscii: m[6]
		};
	}
	function isFlankedByWhitespace(side, node, options) {
		var sibling;
		var regExp;
		var isFlanked;
		if (side === "left") {
			sibling = node.previousSibling;
			regExp = / $/;
		} else {
			sibling = node.nextSibling;
			regExp = /^ /;
		}
		if (sibling) {
			if (sibling.nodeType === 3) isFlanked = regExp.test(sibling.nodeValue);
			else if (options.preformattedCode && sibling.nodeName === "CODE") isFlanked = false;
			else if (sibling.nodeType === 1 && !isBlock(sibling)) isFlanked = regExp.test(sibling.textContent);
		}
		return isFlanked;
	}
	var reduce = Array.prototype.reduce;
	function TurndownService(options) {
		if (!(this instanceof TurndownService)) return new TurndownService(options);
		var defaults = {
			rules,
			headingStyle: "setext",
			hr: "* * *",
			bulletListMarker: "*",
			codeBlockStyle: "indented",
			fence: "```",
			emDelimiter: "_",
			strongDelimiter: "**",
			linkStyle: "inlined",
			linkReferenceStyle: "full",
			br: "  ",
			preformattedCode: false,
			blankReplacement: function(content, node) {
				return node.isBlock ? "\n\n" : "";
			},
			keepReplacement: function(content, node) {
				return node.isBlock ? "\n\n" + node.outerHTML + "\n\n" : node.outerHTML;
			},
			defaultReplacement: function(content, node) {
				return node.isBlock ? "\n\n" + content + "\n\n" : content;
			}
		};
		this.options = extend({}, defaults, options);
		this.rules = new Rules(this.options);
	}
	TurndownService.prototype = {
		turndown: function(input) {
			if (!canConvert(input)) throw new TypeError(input + " is not a string, or an element/document/fragment node.");
			if (input === "") return "";
			var output = process.call(this, new RootNode(input, this.options));
			return postProcess.call(this, output);
		},
		use: function(plugin) {
			if (Array.isArray(plugin)) for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
			else if (typeof plugin === "function") plugin(this);
			else throw new TypeError("plugin must be a Function or an Array of Functions");
			return this;
		},
		addRule: function(key, rule) {
			this.rules.add(key, rule);
			return this;
		},
		keep: function(filter) {
			this.rules.keep(filter);
			return this;
		},
		remove: function(filter) {
			this.rules.remove(filter);
			return this;
		},
		escape: function(string) {
			return escapeMarkdown(string);
		}
	};
	function process(parentNode) {
		var self = this;
		return reduce.call(parentNode.childNodes, function(output, node) {
			node = new Node(node, self.options);
			var replacement = "";
			if (node.nodeType === 3) replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
			else if (node.nodeType === 1) replacement = replacementForNode.call(self, node);
			return join(output, replacement);
		}, "");
	}
	function postProcess(output) {
		var self = this;
		this.rules.forEach(function(rule) {
			if (typeof rule.append === "function") output = join(output, rule.append(self.options));
		});
		return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
	}
	function replacementForNode(node) {
		var rule = this.rules.forNode(node);
		var content = process.call(this, node);
		var whitespace = node.flankingWhitespace;
		if (whitespace.leading || whitespace.trailing) content = content.trim();
		return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
	}
	function join(output, replacement) {
		var s1 = trimTrailingNewlines(output);
		var s2 = trimLeadingNewlines(replacement);
		var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
		return s1 + "\n\n".substring(0, nls) + s2;
	}
	function canConvert(input) {
		return input != null && (typeof input === "string" || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
	}
	function fence(code, lang = "") {
		const runs = code.match(/`+/g) ?? [];
		const len = Math.max(3, ...runs.map((r) => r.length + 1));
		const f = "`".repeat(len);
		return `${f}${lang}\n${code.trimEnd()}\n${f}`;
	}
	var clean = (s) => (s ?? "").replace(/\u00a0/g, " ").trim();
	var script = (mark, s) => /^\w+$/.test(s) ? `${mark}${s}` : `${mark}(${s})`;
	function timeAgo(then, now = Date.now()) {
		const s = Math.max(0, Math.floor((now - then) / 1e3));
		if (s < 60) return "just now";
		const m = Math.floor(s / 60);
		if (m < 60) return `${m} min ago`;
		const h = Math.floor(m / 60);
		return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
	}
	function formatTokens(text) {
		const n = Math.ceil(text.length / 4);
		return n < 1e3 ? `~${n} tokens` : `~${(n / 1e3).toFixed(1)}k tokens`;
	}
	function preText(pre) {
		const copy = pre.cloneNode(true);
		for (const br of copy.querySelectorAll("br")) br.replaceWith("\n");
		for (const el of copy.querySelectorAll("sup")) el.replaceWith(script("^", clean(el.textContent)));
		for (const el of copy.querySelectorAll("sub")) el.replaceWith(script("_", clean(el.textContent)));
		return (copy.textContent ?? "").replace(/\u00a0/g, " ");
	}
	function createTurndown() {
		const t = new TurndownService({
			headingStyle: "atx",
			codeBlockStyle: "fenced",
			bulletListMarker: "-",
			emDelimiter: "*"
		});
		t.escape = (s) => s;
		t.use(import_turndown_plugin_gfm_cjs.tables);
		t.addRule("sup", {
			filter: "sup",
			replacement: (c) => script("^", c)
		});
		t.addRule("sub", {
			filter: "sub",
			replacement: (c) => script("_", c)
		});
		t.addRule("pre", {
			filter: "pre",
			replacement: (_c, node) => `\n\n${fence(preText(node).replace(/^\n+/, ""))}\n\n`
		});
		t.addRule("listItem", {
			filter: "li",
			replacement(content, node) {
				const parent = node.parentNode;
				let prefix = "- ";
				if (parent.nodeName === "OL") {
					const startAttr = parent.getAttribute("start");
					prefix = `${(startAttr === null ? 1 : Number(startAttr)) + Array.prototype.indexOf.call(parent.children, node)}. `;
				}
				const body = content.replace(/^\n+/, "").replace(/\n+$/, "").replace(/\n/g, `\n${" ".repeat(prefix.length)}`);
				return prefix + body + (node.nextSibling ? "\n" : "");
			}
		});
		return t;
	}
	var td;
	var BLANK_WRAPPERS = "font,span,strong,em,b,i,u";
	function prepare(input) {
		const root = typeof input === "string" ? new DOMParser().parseFromString(input, "text/html").body : input;
		for (const el of root.querySelectorAll(BLANK_WRAPPERS)) if (!el.textContent?.trim() && !el.querySelector("img,br")) el.replaceWith(" ");
		const walker = root.ownerDocument.createTreeWalker(root, 4);
		for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue?.includes("\xA0")) n.nodeValue = n.nodeValue.replace(/\u00a0/g, " ");
		return root;
	}
	function htmlToMarkdown(input) {
		td ??= createTurndown();
		return td.turndown(prepare(input)).trim();
	}
	var EXAMPLE_RE = /^examples?\s*\d*\s*:?$/i;
	var CONSTRAINTS_RE = /^constraints?\s*:?$/i;
	var MEDIA = "img,table,hr,svg";
	var SPACER = new Set([
		"P",
		"DIV",
		"BR"
	]);
	var isHeading = (el, re) => el.tagName === "P" && el.children.length === 1 && (el.firstElementChild?.tagName === "STRONG" || el.firstElementChild?.tagName === "B") && re.test(clean(el.textContent));
	function splitContent(html) {
		const doc = new DOMParser().parseFromString(html, "text/html");
		const buckets = {
			statement: doc.createElement("div"),
			examples: doc.createElement("div"),
			constraints: doc.createElement("div")
		};
		let cur = "statement";
		for (const node of Array.from(doc.body.childNodes)) {
			if (node.nodeType === 1) {
				const el = node;
				if (SPACER.has(el.tagName) && !clean(el.textContent) && !el.matches(MEDIA) && !el.querySelector(MEDIA)) continue;
				if (isHeading(el, EXAMPLE_RE) && cur !== "constraints") cur = "examples";
				else if (isHeading(el, CONSTRAINTS_RE)) cur = "constraints";
			} else if (node.nodeType !== 3) continue;
			buckets[cur].append(node);
		}
		return {
			statement: htmlToMarkdown(buckets.statement),
			examples: htmlToMarkdown(buckets.examples),
			constraints: htmlToMarkdown(buckets.constraints)
		};
	}
	var FENCE_LANG = {
		python3: "python",
		pythondata: "python",
		golang: "go",
		mysql: "sql",
		mssql: "sql",
		oraclesql: "sql",
		postgresql: "sql",
		racket: "scheme"
	};
	var fenceLang = (slug) => FENCE_LANG[slug] ?? slug;
	var MONACO_TO_SLUG = {
		python: "python3",
		go: "golang",
		shell: "bash"
	};
	function pickSnippet(q, label, monacoLang) {
		const snippets = q.codeSnippets;
		if (!snippets.length) return null;
		const l = label?.toLowerCase();
		const slug = monacoLang ? MONACO_TO_SLUG[monacoLang] ?? monacoLang : null;
		return l && snippets.find((s) => s.lang.toLowerCase() === l || s.langSlug.toLowerCase() === l) || slug && snippets.find((s) => s.langSlug === slug) || snippets[0] || null;
	}
	var PROMPT_VARS = /\{\{\s*(title|id|difficulty|language)\s*\}\}/gi;
	function applyVars(prompt, q, language) {
		const vars = {
			title: q.title,
			id: q.frontendId,
			difficulty: q.difficulty,
			language
		};
		return prompt.replace(PROMPT_VARS, (_m, name) => vars[name.toLowerCase()] ?? "");
	}
	var norm = (code) => code.replace(/\r\n/g, "\n").trim();
	function failureSection(f, now) {
		const parts = [`## Last Failed Submission (${[
			f.status,
			f.passed && `${f.passed} passed`,
			timeAgo(f.time, now)
		].filter(Boolean).join(", ")})`];
		if (f.input) parts.push(`**Input**\n\n${fence(f.input)}`);
		if (f.expected) parts.push(`**Expected**\n\n${fence(f.expected)}`);
		if (f.output) parts.push(`**Actual**\n\n${fence(f.output)}`);
		if (f.stdout) parts.push(`**Stdout**\n\n${fence(f.stdout)}`);
		if (f.error) parts.push(`**Error**\n\n${fence(f.error)}`);
		return parts.join("\n\n");
	}
	function buildMarkdown(q, s, x) {
		const out = [];
		const language = x.editor?.label || x.template?.lang || "";
		if (s.prompt.trim()) out.push(applyVars(s.prompt.trim(), q, language));
		if (s.title) {
			const meta = [`**Difficulty:** ${q.difficulty}`, `**Link:** https://leetcode.com/problems/${q.titleSlug}/`];
			if (s.tags && q.topicTags.length) meta.push(`**Topics:** ${q.topicTags.map((t) => t.name).join(", ")}`);
			out.push(`# ${q.frontendId}. ${q.title}\n\n${meta.join("  \n")}`);
		}
		if (s.statement || s.examples || s.constraints) {
			const parts = splitContent(q.content ?? "");
			if (s.statement && parts.statement) out.push(`## Problem\n\n${parts.statement}`);
			if (s.examples && parts.examples) out.push(`## Examples\n\n${parts.examples}`);
			if (s.constraints && parts.constraints) out.push(`## Constraints\n\n${parts.constraints.replace(/^\*\*Constraints?:?\*\*\s*/i, "")}`);
		}
		if (s.hints && q.hints.length) {
			const items = q.hints.map((h, i) => {
				const n = `${i + 1}. `;
				return n + htmlToMarkdown(h).replace(/\n/g, `\n${" ".repeat(n.length)}`);
			});
			out.push(`## Hints\n\n${items.join("\n")}`);
		}
		const untouched = !!(x.template && x.editor && norm(x.template.code) === norm(x.editor.code));
		if (s.codeTemplate && x.template) {
			const note = untouched && s.currentCode ? "\n\n_My editor still contains only this template (nothing written yet)._" : "";
			out.push(`## Code Template (${x.template.lang})\n\n${fence(x.template.code, fenceLang(x.template.langSlug))}${note}`);
		}
		if (s.currentCode && x.editor?.code.trim() && !(untouched && s.codeTemplate)) {
			const note = x.editor.partial ? "_Partial: only the lines currently rendered in the editor could be read._\n\n" : "";
			out.push(`## My Current Code (${x.editor.label})\n\n${note}${fence(x.editor.code, fenceLang(x.editor.langSlug))}`);
		}
		if (s.failingTest && x.fail) out.push(failureSection(x.fail, x.now ?? Date.now()));
		if (s.comments && x.comments.length) {
			const body = x.comments.map((c, i) => {
				const text = c.content.length > 2e3 ? `${c.content.slice(0, 2e3)}...` : c.content;
				return `### ${i + 1}. @${c.author} (${c.votes} votes)\n\n${text}`;
			}).join("\n\n");
			out.push(`## Top Comments\n\n${body}`);
		}
		return `${out.join("\n\n")}\n`;
	}
	var n;
	var t$1;
	var r$1;
	var u$2;
	var f$2;
	var o$2;
	var e$1;
	var l$1;
	var c$1;
	var a$1;
	var h$1 = {};
	var p$1 = [];
	var v$1 = /^m(i|n|o|s|text|space)$/;
	var y$1 = Array.isArray;
	var d$1 = p$1.slice;
	var w = Object.assign;
	function _$1(n) {
		n && n.parentNode && n.remove();
	}
	function b$1(i, r, u, f, o) {
		var e = {
			type: i,
			props: r,
			key: u,
			ref: f,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: o || ++t$1,
			__i: -1,
			__u: 0
		};
		return !o && n.vnode && n.vnode(e), e;
	}
	function M(n) {
		return n.children;
	}
	function $(n, t) {
		this.props = n, this.context = t, this.__g = 0;
	}
	function x(n, t) {
		if (null == t) return n.__ ? x(n.__, n.__i + 1) : null;
		for (var i; t < n.__k.length; t++) if ((i = n.__k[t]) && i.__e) return i.__e;
		return "function" != typeof n.type || n.props.__P ? null : x(n);
	}
	function S(n) {
		if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
			return t && (n.__e = t.__e);
		}), S(n);
	}
	function C$1(t) {
		(8 & t.__g || !(t.__g |= 8) || !r$1.push(t) || f$2++) && u$2 == n.debounceRendering || ((u$2 = n.debounceRendering) || queueMicrotask)(j);
	}
	function j() {
		var t, i, u, e, l, c, a, s, h;
		try {
			for (i = 1; r$1.length;) r$1.length > i && r$1.sort(o$2), t = r$1.shift(), i = r$1.length, 8 & t.__g && (e = void 0, l = void 0, c = (l = (u = t).__v).__e, a = [], s = [], (h = u.__P) && ((e = w({ constructor: void 0 }, l)).__v = l.__v + 1, n.vnode && n.vnode(e), N(h, e, l, u.__n, h.namespaceURI, 32 & l.__u ? [c] : null, a, c || x(l), 32 & l.__u, s), e.__v = l.__v, e.__.__k[e.__i] = e, z$1(a, e, s), l.__ = l.__e = null, e.__e != c && S(e)));
		} finally {
			r$1.length = f$2 = 0;
		}
	}
	function L(n, t, i, r, u, f, o, e, l, c, a) {
		var s, v, y, d, w, _, g = r.__k || p$1, k = t.length;
		for (l = H(i, t, g, l, k), s = 0; s < k; s++) null != (y = i.__k[s]) && (v = ~y.__i && g[y.__i] || h$1, y.__i = s, _ = N(n, y, v, u, f, o, e, l, c, a), d = y.__e, (v.ref != y.ref || 8 & v.__u) && (v.ref && D$1(v.ref, null, y, v), y.ref && a.push(y.ref, y.__c || d, y)), w = w || d, 4 & y.__u ? (l = I(y, l, n, !v.__v), v.__e && (v.__e = null)) : "function" == typeof y.type && void 0 !== _ ? l = _ : d && (l = d.nextSibling), y.__u &= -7);
		return i.__e = w, l;
	}
	function H(n, t, i, r, u) {
		var f, o, e, l, c, a, s, h, p, v, d = i.length, w = d, _ = 0, g = !1, k = n.__k = Array(u);
		for (f = 0; f < u; f++) null != (o = t[f]) && "boolean" != typeof o && "function" != typeof o ? ("object" != typeof o || o.constructor == String ? o = k[f] = b$1(null, o) : y$1(o) ? o = k[f] = b$1(M, { children: o }) : void 0 === o.constructor && o.__b ? o = k[f] = b$1(o.type, o.props, o.key, o.ref, o.__v) : k[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = O(o, i, l, w)) && (w--, (e = i[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 2, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = !0)) : (~c || (u > d ? _-- : u < d && _++), "function" != typeof o.type && (o.__u |= 4))) : k[f] = null;
		if (g) {
			for (a = [], s = [], f = 0; f < u; f++) if ((o = k[f]) && 2 & o.__u) {
				for (h = 0, p = a.length; h < p;) a[v = h + p >> 1] < o.__i ? h = v + 1 : p = v;
				a[h] = o.__i, s[f] = h + 1;
			}
			for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
		}
		if (w) for (f = 0; f < d; f++) !(e = i[f]) || 2 & e.__u || (e.__e == r && (r = x(e)), E$1(e, e));
		return r;
	}
	function I(n, t, i, r) {
		var u, f, o;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (u = n.__k) for (f = 0; f < u.length; f++) u[f] && (u[f].__ = n, t = I(u[f], t, i, !1));
			return t;
		}
		for (t && !t.parentNode && (t = x(n)) && !t.parentNode && (t = null), o = t; o && 8 == o.nodeType;) o = o.nextSibling;
		for (n.__e != o && (!r && i.moveBefore && n.__e.parentNode ? i.moveBefore(n.__e, t) : i.insertBefore(n.__e, t || null)), t = n.__e; (t = t && t.nextSibling) && 8 == t.nodeType;);
		return t;
	}
	function O(n, t, i, r) {
		var u, f, o, e = n.key, l = n.type, c = t[i], a = c && !(2 & c.__u);
		if (null === c && null == e || a && e == c.key && l == c.type) return i;
		if (r > (a ? 1 : 0)) {
			for (u = i - 1, f = i + 1; u >= 0 || f < t.length;) if ((c = t[o = u >= 0 ? u-- : f++]) && !(2 & c.__u) && e == c.key && l == c.type) return o;
		}
		return -1;
	}
	function P(n, t, i) {
		i ??= "", "-" == t[0] ? n.setProperty(t, i) : n[t] = i;
	}
	function T$1(n, t, i, r, u) {
		var f, o;
		n: if ("style" == t) if ("string" == typeof i) n.style.cssText = i;
		else {
			if ("string" == typeof r && (n.style.cssText = r = ""), r) for (t in r) i && t in i || P(n.style, t, "");
			if (i) for (t in i) r && i[t] == r[t] || P(n.style, t, i[t]);
		}
		else if ("o" == t[0] && "n" == t[1]) (n.__e || (n.__e = {}))[t] = i, i && r || (o = a$1[t] || (a$1[t] = q(t)), (n.__a || (n.__a = {}))[t] = c$1, f = t != (t = t.replace(l$1, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), i ? n.addEventListener(t, o, f) : n.removeEventListener(t, o, f));
		else {
			if ("http://www.w3.org/2000/svg" == u) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
			else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
				n[t] = null == i ? "" : i;
				break n;
			} catch (n) {}
			"function" == typeof i || (null == i || !1 === i && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == i ? "" : i));
		}
	}
	function q(t) {
		return function(i) {
			if (this.__e) {
				var r = this.__e[t];
				if (null == i[e$1]) i[e$1] = c$1++;
				else if (i[e$1] < this.__a[t]) return;
				return r(n.event ? n.event(i) : i);
			}
		};
	}
	function N(t, i, r, u, f, o, e, l, c, a) {
		var s, h, v, d, g, k, b, m, S, C, j, H, I, A, O, P, T, q, N, z, D = i.type;
		if (void 0 !== i.constructor) return null;
		if (128 & r.__u && (c = 32 & r.__u, s = r.__c.__z)) {
			if (i.__u |= c, h = o = [], 8 == s.nodeType) for (v = 1, d = s.nextSibling; d; d = d.nextSibling) {
				if (8 == d.nodeType) {
					if (d.data.startsWith("$s")) v++;
					else if (d.data.startsWith("/$s") && !--v) break;
				}
				o.push(d);
			}
			else o.push(s);
			l = o[0];
		}
		(s = n.__b) && s(i);
		n: if ("function" == typeof D) {
			g = e.length;
			try {
				if (C = i.props, j = (s = D.prototype) && s.render, H = (s = D.contextType) && u[s.__c], I = s ? H ? H.props.value : s.__ : u, r.__c ? 2 & (k = i.__c = r.__c).__g && (k.__g |= 1) : (j ? i.__c = k = new D(C, I) : (i.__c = k = new $(C, I), k.constructor = D, k.render = F), H && H.sub(k), k.state || (k.state = {}), k.__n = u, k.__g |= 8, k.__h = [], k.__k = []), j && (k.__s || (k.__s = k.state), D.getDerivedStateFromProps && (k.__s == k.state && (k.__s = w({}, k.__s)), w(k.__s, D.getDerivedStateFromProps(C, k.__s)))), b = k.props, m = k.state, k.__v = i, r.__c) {
					if (j && !D.getDerivedStateFromProps && C !== b && k.componentWillReceiveProps && k.componentWillReceiveProps(C, I), i.__v == r.__v && !(8 & k.__g) || !(4 & k.__g) && k.shouldComponentUpdate && !1 === k.shouldComponentUpdate(C, k.__s, I)) {
						i.__v != r.__v && (k.props = C, k.state = k.__s, k.__g &= -9), i.__e = r.__e, i.__k = r.__k, i.__k.some(function(n) {
							n && (n.__ = i);
						}), p$1.push.apply(k.__h, k.__k), k.__k = [], k.__h.length && e.push(k), l = x(r);
						break n;
					}
					k.componentWillUpdate && k.componentWillUpdate(C, k.__s, I), j && k.componentDidUpdate && k.__h.push(function() {
						k.componentDidUpdate(b, m, S);
					});
				} else j && !D.getDerivedStateFromProps && k.componentWillMount && k.componentWillMount(), j && k.componentDidMount && k.__h.push(k.componentDidMount);
				if (k.context = I, k.props = C, k.__P = t, k.__g &= -5, A = n.__r, O = 0, j) k.state = k.__s, k.__g &= -9, A && A(i), s = k.render(k.props, k.state, k.context), p$1.push.apply(k.__h, k.__k), k.__k = [];
				else do
					k.__g &= -9, A && A(i), s = k.render(k.props, k.state, k.context), k.state = k.__s;
				while (8 & k.__g && ++O < 25);
				k.state = k.__s, k.getChildContext && (u = w({}, u, k.getChildContext())), j && r.__c && k.getSnapshotBeforeUpdate && (S = k.getSnapshotBeforeUpdate(b, m)), P = s && s.type === M && null == s.key ? s.props.children : s, C.__P && (s = l, f = (t = C.__P).namespaceURI, c = o = null, r.props && r.props.__P != t && (r.__k.some(function(n) {
					n && E$1(n, n);
				}), r.__k = null), l = r.__k ? x(r, 0) : null), l = L(t, y$1(P) ? P : [P], i, r, u, f, o, e, l, c, a), C.__P && (i.__e = null, l = s), i.__u &= -161, 128 & r.__u && (k.__z = null), h && h.some(_$1), k.__h.length && e.push(k), 1 & k.__g && (k.__g &= -4);
			} catch (t) {
				if (e.length = g, i.__v = null, c || o) if (t.then) {
					if (T = 0, i.__u |= c ? 160 : 128, o) {
						for (~(N = o.indexOf(l || void 0)) || (N = o.length); (z = o[N - 1]) && 8 == z.nodeType;) N--;
						for (; N < o.length; N++) if (z = o[N]) {
							if (o[N] = null, 8 == z.nodeType) {
								if (z.data.startsWith("$s")) T++ || (q = z);
								else if (T && z.data.startsWith("/$s") && !--T) {
									l = z;
									break;
								}
							} else if (!T) break;
						}
					}
					if (!q) {
						for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
						q = l;
					}
					i.__c.__z || (i.__c.__z = q), i.__e = l;
				} else o && o.some(_$1);
				else i.__e = r.__e;
				i.__k || (i.__k = r.__k || []), t.then || V(i), n.__e(t, i, r);
			}
		} else l = i.__e = B$1(r.__e, i, r, u, f, o, e, c, a, t);
		return (s = n.diffed) && s(i), 128 & i.__u ? void 0 : l;
	}
	function V(n) {
		n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(V));
	}
	function z$1(t, i, r) {
		for (var u = 0; u < r.length;) D$1(r[u++], r[u++], r[u++]);
		n.__c && n.__c(i, t), t.some(function(i) {
			try {
				t = i.__h, i.__h = [], t.some(function(n) {
					n.call(i);
				});
			} catch (t) {
				n.__e(t, i.__v);
			}
		});
	}
	function B$1(t, i, r, u, f, o, e, l, c, a) {
		var s, p, w, g, k, b, m, M, $, S = r.props || h$1, C = i.props, j = i.type;
		if ("svg" == j ? f = "http://www.w3.org/2000/svg" : "math" == j ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), o) {
			for (s = 0; s < o.length; s++) if ((k = o[s]) && (j ? k.localName == j : 3 == k.nodeType)) {
				t = k, o[s] = null;
				break;
			}
		}
		if (!t) {
			if (M = a.ownerDocument || document, !j) return M.createTextNode(C);
			t = M.createElementNS(f, j, C.is && C), l && (n.__m && n.__m(i, o), l = !1), o = null;
		}
		if (j) {
			if (a = "template" == j ? t.content : t, o = "textarea" == j && null != C.defaultValue ? null : o && d$1.call(a.childNodes), !l && o) for (S = {}, s = 0; s < t.attributes.length; s++) S[(k = t.attributes[s]).name] = k.value;
			for (s in S) k = S[s], "dangerouslySetInnerHTML" == s ? w = k : "children" == s || s in C || "value" == s && "defaultValue" in C || "checked" == s && "defaultChecked" in C || T$1(t, s, null, k, f);
			for (s in $ = 1 & r.__u, C) k = C[s], "children" == s ? g = k : "dangerouslySetInnerHTML" == s ? p = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || !(S[s] !== k || $ && null != k) || T$1(t, s, k, S[s], f);
			p ? (l || w && (p.__html == w.__html || p.__html == t.innerHTML) || (t.innerHTML = p.__html), i.__k = []) : (w && (t.textContent = ""), ("foreignObject" == j || "http://www.w3.org/1998/Math/MathML" == f && v$1.test(j)) && (f = "http://www.w3.org/1999/xhtml"), L(a, y$1(g) ? g : [g], i, r, u, f, o, e, o ? o[0] : r.__k && x(r, 0), l, c), o && o.some(_$1)), l && "textarea" != j || (s = "value", "progress" == j && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != j || b) || T$1(t, s, b, S[s], f), s = "checked", null != m && m != t[s] && T$1(t, s, m, S[s], f));
		} else S === C || l && t.data == C || (t.data = C);
		return t;
	}
	function D$1(t, i, r, u) {
		try {
			"function" == typeof t ? i ? i.__x = t(i) || 1 : u && (u = u.__c || u.__e) && (i = u.__x) && (u.__x = null, "function" == typeof i ? i() : t(null)) : t.current = i;
		} catch (t) {
			n.__e(t, r);
		}
	}
	function E$1(t, i, r) {
		var u, f;
		if (n.unmount && n.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || D$1(u, null, i, t), u = t.__c) {
			if (u.componentWillUnmount) try {
				u.componentWillUnmount();
			} catch (t) {
				n.__e(t, i);
			}
			u.__P = u.__n = null;
		}
		if (u = t.__k) for (f = 0; f < u.length; f++) u[f] && E$1(u[f], i, "function" != typeof t.type || r && !t.props.__P);
		(u = t.__e) && (r || _$1(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
	}
	function F(n, t, i) {
		return this.constructor(n, i);
	}
	function G$1(t, i) {
		var r, u, f, o;
		n.__ && n.__(t, i), 9 == i.nodeType && (i = i.documentElement), u = (r = t && 32 & t.__u) ? null : i.__k, i.__k = b$1(M, { children: [t] }), f = [], o = [], N(i, i.__k, u || h$1, h$1, i.namespaceURI, u ? null : i.firstChild ? d$1.call(i.childNodes) : null, f, u ? u.__e : i.firstChild, r, o), z$1(f, i.__k, o), i.__k.props.children = null;
	}
	n = { __e: function(n, t, i, r) {
		for (var u, o, e; t = t.__;) if ((u = t.__c) && !(1 & u.__g)) {
			u.__g |= 4;
			try {
				if ((o = u.constructor) && o.getDerivedStateFromError && (u.setState(o.getDerivedStateFromError(n)), e = 8 & u.__g), u.componentDidCatch && (u.componentDidCatch(n, r || {}), e = 8 & u.__g), e) return void (u.__g |= 2);
			} catch (t) {
				n = t, e = 0;
			}
		}
		throw f$2 = 0, n;
	} }, t$1 = 0, $.prototype.setState = function(n, t) {
		var i = this.__s;
		i && i != this.state || (i = this.__s = w({}, this.state)), "function" == typeof n && (n = n(w({}, i), this.props)), n && (w(i, n), this.__v && (t && this.__k.push(t), C$1(this)));
	}, $.prototype.forceUpdate = function(n) {
		this.__v && (this.__g |= 4, n && this.__h.push(n), C$1(this));
	}, $.prototype.render = M, r$1 = [], f$2 = 0, o$2 = function(n, t) {
		return n.__v.__b - t.__v.__b;
	}, e$1 = Symbol(), l$1 = /(PointerCapture)$|Capture$/i, c$1 = 0, a$1 = {};
	var t;
	var r;
	var u$1;
	var i;
	var o$1 = Object.is;
	var f$1 = 0;
	var c = [];
	var e = [];
	var a = n;
	var v = a.__b;
	var l = a.__r;
	var m = a.diffed;
	var s = a.__c;
	var h = a.unmount;
	var p = a.__;
	function y(n, t) {
		a.__h && a.__h(r, n, f$1 || t), f$1 = 0;
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
			var t = f.__N ? f.__N[0] : f.__[0], r = f.t(t, n);
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
		!a.__s && E(i.__H, u) && (i.__P = !0, i.__ = n, i.u = u, r.__H.__h.push(i));
	}
	function T(n) {
		return f$1 = 5, b(function() {
			return { current: n };
		}, []);
	}
	function b(n, r) {
		var u = y(t++, 7);
		return E(u.__H, r) && (u.__ = n(), u.__H = r), u.__;
	}
	function g() {
		var n;
		do {
			for (; n = e.shift();) try {
				C(n);
			} catch (t) {
				a.__e(t, { __: (n = n.__P) && n.__v });
			}
			for (; n = c.shift();) {
				var t = n.__H;
				if (n.__P && t) try {
					t.__h.some(C), t.__h.some(D), t.__h = [];
				} catch (r) {
					t.__h = [], a.__e(r, n.__v);
				}
			}
		} while (e.length);
	}
	a.__b = function(n) {
		r = null, v && v(n);
	}, a.__ = function(n, t) {
		n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p && p(n, t);
	}, a.__r = function(n) {
		l && l(n), t = 0;
		var i = (r = n.__c).__H;
		i && (u$1 == r ? r.__h = [] : (i.__h.some(C), i.__h.some(D), t = 0), i.__h = [], i.__.some(function(n) {
			n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
		})), u$1 = r;
	}, a.diffed = function(n) {
		m && m(n);
		var t = n.__c;
		t && t.__H && (t.__H.__h.length && B(c.push(t)), t.__H.__.some(function(n) {
			n.u && (n.__H = n.u);
		})), u$1 = r = null;
	}, a.__c = function(n, t) {
		t.some(function(n) {
			try {
				n.__h.some(C), n.__h = n.__h.filter(function(n) {
					return !n.__ || D(n);
				});
			} catch (r) {
				t.some(function(n) {
					n.__h && (n.__h = []);
				}), t = [], a.__e(r, n.__v);
			}
		}), s && s(n, t);
	}, a.unmount = function(n) {
		h && h(n);
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
		}), u.__H = void 0, t && a.__e(t, u.__v));
	};
	var k = "function" == typeof requestAnimationFrame;
	function z(n) {
		var t, r = function() {
			clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
		}, u = setTimeout(r, 35);
		k && (t = requestAnimationFrame(r));
	}
	function B(n) {
		1 != n && i == a.requestAnimationFrame || ((i = a.requestAnimationFrame) || z)(g);
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
	var o = 0;
	Array.isArray;
	function u(t, e, n$1, f, u, i) {
		e || (e = {});
		var a, c, l = e;
		if ("ref" in l && "function" != typeof t) for (c in l = {}, e) "ref" == c ? a = e[c] : l[c] = e[c];
		var p = {
			type: t,
			props: l,
			key: n$1,
			ref: a,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: --o,
			__i: -1,
			__u: 0
		};
		return (u || i) && (p.__source = u, p.__self = i), n.vnode && n.vnode(p), p;
	}
	var ITEMS = [
		{
			key: "title",
			label: "Title & link",
			desc: "Problem number, title, difficulty, URL"
		},
		{
			key: "statement",
			label: "Problem statement",
			desc: "Description text"
		},
		{
			key: "examples",
			label: "Examples",
			desc: "Example inputs, outputs, explanations"
		},
		{
			key: "constraints",
			label: "Constraints",
			desc: "Limits and follow-ups"
		},
		{
			key: "hints",
			label: "Hints",
			desc: "All hints, even the collapsed ones"
		},
		{
			key: "codeTemplate",
			label: "Code template",
			desc: "Starter code for the selected language"
		},
		{
			key: "currentCode",
			label: "My current code",
			desc: "What is in the editor right now"
		},
		{
			key: "failingTest",
			label: "Last failed submission",
			desc: "Test case, output and errors from your last non-accepted Submit"
		},
		{
			key: "tags",
			label: "Topic tags",
			desc: "Array, Math, DP, ..."
		},
		{
			key: "comments",
			label: "Top comments",
			desc: "Most-voted discussion comments"
		}
	];
	var stop = (e) => e.stopPropagation();
	function SettingsModal({ initial, onChange, onClose }) {
		const dialog = T(null);
		const downOnBackdrop = T(false);
		const [s, setS] = d(initial);
		const update = (patch) => {
			const next = {
				...s,
				...patch
			};
			setS(next);
			onChange(next);
		};
		const close = () => dialog.current?.close();
		A(() => {
			dialog.current?.showModal();
			return () => dialog.current?.close();
		}, []);
		return u("dialog", {
			ref: dialog,
			class: "modal",
			"aria-labelledby": "bl-title",
			onClose,
			onMouseDown: (e) => {
				downOnBackdrop.current = e.target === e.currentTarget;
			},
			onClick: (e) => {
				if (downOnBackdrop.current && e.target === e.currentTarget) close();
			},
			onKeyDown: stop,
			onKeyUp: stop,
			onKeyPress: stop,
			children: [
				u("div", {
					class: "head",
					children: [u("h2", {
						id: "bl-title",
						children: "Better LeetCode"
					}), u("button", {
						type: "button",
						class: "icon-btn",
						"aria-label": "Close",
						onClick: close,
						dangerouslySetInnerHTML: { __html: iconClose(18) }
					})]
				}),
				u("div", {
					class: "body",
					children: [
						u("div", {
							class: "section-title",
							children: "Include when copying"
						}),
						u("div", {
							class: "card",
							children: [ITEMS.map((it) => u("label", {
								class: "row",
								children: [u("span", {
									class: "txt",
									children: [u("span", {
										class: "label",
										children: it.label
									}), u("span", {
										class: "desc",
										children: it.desc
									})]
								}), u("input", {
									class: "switch",
									type: "checkbox",
									role: "switch",
									checked: s[it.key],
									onChange: (e) => update({ [it.key]: e.currentTarget.checked })
								})]
							}, it.key)), u("label", {
								class: "row",
								children: [u("span", {
									class: "txt",
									children: [u("span", {
										class: "label",
										children: "Number of comments"
									}), u("span", {
										class: "desc",
										children: [
											"Used when \"Top comments\" is on (",
											1,
											"-",
											30,
											")"
										]
									})]
								}), u("input", {
									class: "num",
									type: "number",
									min: 1,
									max: 30,
									disabled: !s.comments,
									value: s.commentCount,
									onChange: (e) => {
										const el = e.currentTarget;
										const v = el.value.trim() === "" ? s.commentCount : clampCommentCount(el.value);
										el.value = String(v);
										update({ commentCount: v });
									}
								})]
							})]
						}),
						u("label", {
							class: "section-title",
							for: "bl-prompt",
							children: "Custom prompt"
						}),
						u("textarea", {
							id: "bl-prompt",
							placeholder: "e.g. Explain the approach step by step, then give an optimal {{language}} solution.",
							value: s.prompt,
							onInput: (e) => update({ prompt: e.currentTarget.value })
						}),
						u("div", {
							class: "hint",
							children: [
								"Added at the top of the copied Markdown. Variables: ",
								u("code", { children: "{{title}}" }),
								" ",
								u("code", { children: "{{id}}" }),
								" ",
								u("code", { children: "{{difficulty}}" }),
								" ",
								u("code", { children: "{{language}}" })
							]
						})
					]
				}),
				u("div", {
					class: "foot",
					children: u("button", {
						type: "button",
						class: "btn primary",
						onClick: close,
						children: "Done"
					})
				})
			]
		});
	}
	var wrap;
	var modalMount;
	var toastMount;
	function isDark() {
		const h = document.documentElement;
		if (h.classList.contains("dark") || h.dataset.theme === "dark") return true;
		if (h.classList.contains("light") || h.dataset.theme === "light") return false;
		const rgba = getComputedStyle(document.body ?? h).backgroundColor.match(/[\d.]+/g)?.map(Number);
		if (rgba && rgba.length >= 3 && rgba[3] !== 0) {
			const [r = 0, g = 0, b = 0] = rgba;
			return .299 * r + .587 * g + .114 * b < 128;
		}
		return matchMedia("(prefers-color-scheme: dark)").matches;
	}
	function ensureHost() {
		if (wrap) return;
		const host = document.createElement("div");
		host.id = "better-leetcode-host";
		const root = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = CSS;
		const el = document.createElement("div");
		el.className = "wrap";
		modalMount = document.createElement("div");
		toastMount = document.createElement("div");
		toastMount.setAttribute("role", "status");
		toastMount.setAttribute("aria-live", "polite");
		el.append(modalMount, toastMount);
		root.append(style, el);
		(document.body ?? document.documentElement).append(host);
		wrap = el;
		const apply = () => el.setAttribute("data-theme", isDark() ? "dark" : "light");
		apply();
		new MutationObserver(apply).observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"]
		});
	}
	var pending = null;
	var saveTimer;
	function flushSave() {
		window.clearTimeout(saveTimer);
		if (pending) saveSettings(pending);
		pending = null;
	}
	function queueSave(s) {
		pending = s;
		window.clearTimeout(saveTimer);
		saveTimer = window.setTimeout(flushSave, 300);
	}
	function openSettings() {
		ensureHost();
		window.addEventListener("pagehide", flushSave, { once: true });
		G$1(u(SettingsModal, {
			initial: loadSettings(),
			onChange: queueSave,
			onClose: () => {
				flushSave();
				G$1(null, modalMount);
			}
		}), modalMount);
	}
	var toastTimer;
	function toast(message, kind = "ok") {
		ensureHost();
		const el = document.createElement("div");
		el.className = `toast ${kind}`;
		el.innerHTML = kind === "ok" ? iconCheck(16) : iconAlert(16);
		const span = document.createElement("span");
		span.textContent = message;
		el.append(span);
		toastMount.replaceChildren(el);
		window.clearTimeout(toastTimer);
		toastTimer = window.setTimeout(() => el.remove(), kind === "error" ? 4500 : kind === "warn" ? 3500 : 2400);
	}
	installCapture();
	async function copyText(text) {
		try {
			_GM_setClipboard(text, "text");
		} catch {
			await navigator.clipboard.writeText(text);
		}
	}
	async function copyProblem(btn) {
		setCopyState(btn, "busy");
		try {
			const slug = currentSlug();
			if (!slug) throw new Error("Not on a problem page");
			const s = loadSettings();
			const q = await getQuestion(slug);
			let comments = [];
			let commentsFailed = false;
			if (s.comments) try {
				comments = await getComments(slug, s.commentCount);
			} catch (err) {
				commentsFailed = true;
				console.warn("[Better LeetCode] comments failed:", err);
			}
			const ed = s.currentCode || s.codeTemplate ? readCode() : null;
			const snippet = pickSnippet(q, languageLabel(), ed?.monacoLang ?? null);
			const md = buildMarkdown(q, s, {
				comments,
				template: s.codeTemplate ? snippet : null,
				editor: s.currentCode && ed ? {
					code: ed.code,
					label: snippet?.lang ?? "",
					langSlug: snippet?.langSlug ?? "",
					partial: ed.partial
				} : null,
				fail: s.failingTest ? getFailure(slug) : null
			});
			await copyText(md);
			setCopyState(btn, "done");
			const suffix = [commentsFailed && "comments unavailable", ed?.partial && s.currentCode && "code may be incomplete"].filter(Boolean).join(", ");
			toast(`Copied (${formatTokens(md)})${suffix ? ` - ${suffix}` : ""}`, suffix ? "warn" : "ok");
		} catch (err) {
			console.warn("[Better LeetCode] copy failed:", err);
			setCopyState(btn, "error");
			toast(err instanceof Error ? err.message : "Copy failed", "error");
		}
	}
	function boot() {
		startInjection((btn) => void copyProblem(btn), openSettings);
		_GM_registerMenuCommand("Better LeetCode settings", openSettings);
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
	else boot();
})();
