// ==UserScript==
// @name         texpander-ai
// @namespace    https://github.com/quantavil/texpander-ai
// @version      3.0.0
// @author       quantavil
// @description  AI-powered text expander with Gemini integration
// @license      GPL-3.0-or-later
// @match        *://*/*
// @connect      generativelanguage.googleapis.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var _GM_addStyle = (() => typeof GM_addStyle != "undefined" ? GM_addStyle : void 0)();
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
	var STORE_KEYS = {
		dict: "sae.dict.v1",
		keys: "sae.keys.v1",
		apiKey: "sae.gemini.apiKey.v1",
		customPrompts: "sae.prompts.v1",
		disabledBuiltins: "sae.disabledBuiltins.v1"
	};
	var CONFIG = {
		trigger: {
			code: "Space",
			shift: true
		},
		palette: {
			code: "KeyP",
			alt: true
		},
		aiMenu: {
			code: "KeyG",
			alt: true
		},
		maxAbbrevLen: 80,
		styleId: "sae-styles",
		clipboardReadTimeoutMs: 350,
		searchDebounceMs: 50,
		toast: {
			defaultMs: 2200,
			shortMs: 1200
		},
		ui: {
			menuWidth: 360,
			menuHeight: 260,
			previewMaxChars: 120,
			spacing: {
				sm: 8,
				md: 16
			},
			inlinePrompts: 4
		},
		gemini: {
			endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
			model: "gemini-2.5-flash-lite",
			temperature: .15,
			timeoutMs: 2e4,
			maxInputChars: 32e3
		}
	};
	var BUILTIN_PROMPTS = [
		{
			id: "grammar",
			label: "Fix Grammar",
			prompt: "Fix grammar, spelling, and punctuation. Improve clarity. Preserve meaning and original language. Return only the corrected text, no explanations."
		},
		{
			id: "expand",
			label: "Expand",
			prompt: "Expand this text with more detail, examples, and depth. Maintain the original tone. Return only the expanded text."
		},
		{
			id: "summarize",
			label: "Summarize",
			prompt: "Summarize this text concisely in 2-3 sentences. Capture key points. Return only the summary."
		},
		{
			id: "formal",
			label: "Formal",
			prompt: "Rewrite in a formal, professional tone suitable for business communication. Return only the rewritten text."
		},
		{
			id: "friendly",
			label: "Friendly",
			prompt: "Rewrite in a warm, friendly, conversational tone. Return only the rewritten text."
		},
		{
			id: "concise",
			label: "Concise",
			prompt: "Make this shorter and more direct. Remove unnecessary words. Return only the concise text."
		}
	];
	var DEFAULT_DICT = {
		brb: "Be right back.",
		ty: "Thank you!",
		hth: "Hope this helps!",
		opt: "Optional: {{cursor}}",
		log: "Log Entry - {{date:iso}} {{time}}: {{cursor}}",
		track: "The tracking number for your order is {{clipboard}}. {{cursor}}",
		dt: "Today is {{day}}, {{date:long}} at {{time}}."
	};
	var GMX = {
		get: (key, def) => _GM_getValue(key, def),
		set: (key, val) => _GM_setValue(key, val),
		menu: (title, fn) => _GM_registerMenuCommand(title, fn),
		request: (opts) => new Promise((resolve, reject) => {
			_GM_xmlhttpRequest({
				method: opts.method ?? "GET",
				url: opts.url,
				headers: opts.headers ?? {},
				data: opts.data,
				timeout: opts.timeout ?? CONFIG.gemini.timeoutMs,
				onload: (r) => resolve({
					status: r.status,
					text: r.responseText
				}),
				onerror: () => reject(new Error("Network error")),
				ontimeout: () => reject(new Error("Timeout"))
			});
		})
	};
	var state = {
		dict: {},
		apiKey: "",
		apiKeyIndex: 0,
		customPrompts: [],
		disabledBuiltins: [],
		lastEditableEl: null,
		paletteIndex: 0,
		aiMenuIndex: 0,
		hotkeys: {
			palette: { ...CONFIG.palette },
			aiMenu: { ...CONFIG.aiMenu }
		}
	};
	var isBuiltinEnabled = (id) => !state.disabledBuiltins.includes(id);
	var isCustomEnabled = (p) => p.enabled !== false;
	var getAllPrompts = () => [...BUILTIN_PROMPTS, ...state.customPrompts];
	function normalizeDict(obj) {
		if (!obj || typeof obj !== "object") return {};
		return Object.fromEntries(Object.entries(obj).filter(([k, v]) => typeof k === "string" && typeof v === "string" && k.trim()).map(([k, v]) => [k.trim().toLowerCase(), v]));
	}
	function loadState() {
		state.dict = normalizeDict(GMX.get(STORE_KEYS.dict, DEFAULT_DICT));
		if (!Object.keys(state.dict).length) state.dict = normalizeDict(DEFAULT_DICT);
		state.apiKey = GMX.get(STORE_KEYS.apiKey, "");
		state.customPrompts = GMX.get(STORE_KEYS.customPrompts, []).map((p) => ({
			...p,
			enabled: p.enabled !== false
		}));
		state.disabledBuiltins = GMX.get(STORE_KEYS.disabledBuiltins, []);
		const saved = GMX.get(STORE_KEYS.keys, {});
		if (saved.palette) state.hotkeys.palette = saved.palette;
		if (saved.aiMenu) state.hotkeys.aiMenu = saved.aiMenu;
	}
	var $ = (s, r = document) => r.querySelector(s);
	var $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
	var debounce = (fn, ms) => {
		let t;
		return (...a) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...a), ms);
		};
	};
	var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
	var genId = () => "c" + Math.random().toString(36).slice(2, 9);
	var p2 = (n) => String(n).padStart(2, "0");
	var ESC = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	};
	var escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c] ?? c);
	var isWord = (c) => /[\p{L}\p{N}_-]/u.test(c);
	var safeFocus = (el) => {
		if (!el) return false;
		try {
			el.focus({ preventScroll: true });
			return true;
		} catch {
			return false;
		}
	};
	function dispatchInput(el, data) {
		el.dispatchEvent(new InputEvent("input", {
			bubbles: true,
			inputType: "insertReplacementText",
			data
		}));
	}
	var EDITABLE_TYPES = new Set([
		"text",
		"search",
		"url",
		"email",
		"tel"
	]);
	function getEditable(el) {
		if (!el || !(el instanceof HTMLElement)) return null;
		if (el instanceof HTMLTextAreaElement) return el;
		if (el instanceof HTMLInputElement) return EDITABLE_TYPES.has((el.type || "text").toLowerCase()) ? el : null;
		let curr = el;
		while (curr && curr !== document.documentElement) {
			if (curr.nodeType === 1 && curr.isContentEditable) return curr;
			curr = curr.parentElement ?? (curr.parentNode instanceof ShadowRoot ? curr.parentNode.host : null);
		}
		return null;
	}
	function captureContext() {
		let active = document.activeElement;
		while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
		const el = getEditable(active);
		if (!el) return null;
		if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return {
			kind: "input",
			el,
			start: el.selectionStart ?? 0,
			end: el.selectionEnd ?? 0
		};
		const sel = window.getSelection();
		if (!sel?.rangeCount) return null;
		return {
			kind: "ce",
			root: el,
			range: sel.getRangeAt(0).cloneRange()
		};
	}
	function getContextOrFallback() {
		const ctx = captureContext();
		if (ctx) return ctx;
		if (state.lastEditableEl?.isConnected) {
			safeFocus(state.lastEditableEl);
			return captureContext();
		}
		return null;
	}
	function makeEditor(ctx) {
		if (!ctx) return null;
		if (ctx.kind === "input") {
			const el = ctx.el;
			return {
				getText() {
					const { selectionStart: s, selectionEnd: e } = el;
					return s !== e ? el.value.slice(s, e) : el.value;
				},
				replace(text) {
					const s = el.selectionStart ?? 0, e = el.selectionEnd ?? 0;
					const [start, end] = s !== e ? [s, e] : [0, el.value.length];
					el.setRangeText(text, start, end, "end");
					dispatchInput(el, text);
				}
			};
		}
		const root = ctx.root;
		return {
			getText() {
				const sel = window.getSelection();
				if (sel?.rangeCount && !sel.isCollapsed) return sel.toString();
				const r = document.createRange();
				r.selectNodeContents(root);
				return r.toString();
			},
			replace(text) {
				const sel = window.getSelection();
				if (!sel) return;
				if (sel.isCollapsed) {
					const r = document.createRange();
					r.selectNodeContents(root);
					sel.removeAllRanges();
					sel.addRange(r);
				}
				document.execCommand("insertText", false, text);
				dispatchInput(root, text);
			}
		};
	}
	var fmtDate = (d, a = "iso") => {
		const f = a.toLowerCase();
		if (f === "long") return d.toLocaleDateString(void 0, {
			year: "numeric",
			month: "long",
			day: "numeric"
		});
		if (f === "short") return d.toLocaleDateString();
		if (f === "mdy" || f === "us") return `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()}`;
		if (f === "dmy") return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
		return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
	};
	var fmtTime = (d, a = "12") => {
		if (a === "24" || a === "24h") return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
		let h = d.getHours();
		const ap = h >= 12 ? "PM" : "AM";
		h = h % 12 || 12;
		return `${p2(h)}:${p2(d.getMinutes())} ${ap}`;
	};
	async function readClip() {
		try {
			return await Promise.race([navigator.clipboard?.readText() ?? Promise.resolve(""), new Promise((r) => setTimeout(() => r(""), CONFIG.clipboardReadTimeoutMs))]);
		} catch {
			return "";
		}
	}
	var TAGS = {
		cursor: async () => ({
			text: "",
			cursor: true
		}),
		date: async (a, n) => ({ text: fmtDate(n, a) }),
		time: async (a, n) => ({ text: fmtTime(n, a) }),
		day: async (a, n) => ({ text: n.toLocaleDateString(void 0, { weekday: a === "short" ? "short" : "long" }) }),
		clipboard: async () => ({ text: await readClip() })
	};
	async function renderTemplate(tmpl) {
		const matches = [...tmpl.matchAll(/\{\{\s*(\w+)(?::([^}]+))?\s*\}\}/g)];
		if (!matches.length) return {
			text: tmpl,
			cursor: tmpl.length
		};
		const now = new Date();
		const results = await Promise.all(matches.map((m) => {
			const handler = TAGS[m[1].toLowerCase()];
			return handler ? handler((m[2] || "").trim(), now) : null;
		}));
		let out = "", cursor = -1, idx = 0;
		for (let i = 0; i < matches.length; i++) {
			const m = matches[i];
			out += tmpl.slice(idx, m.index);
			idx = m.index + m[0].length;
			const res = results[i];
			if (!res) {
				out += m[0];
				continue;
			}
			if (res.cursor && cursor < 0) cursor = out.length;
			out += res.text;
		}
		out += tmpl.slice(idx);
		return {
			text: out,
			cursor: cursor >= 0 ? cursor : out.length
		};
	}
	function getTextBefore(root, range, max) {
		const r = document.createRange();
		r.setStart(root, 0);
		r.setEnd(range.startContainer, range.startOffset);
		return r.toString().slice(-max);
	}
	function scanToken(text, maxLen) {
		let i = text.length;
		while (i > 0 && isWord(text[i - 1]) && text.length - i < maxLen) i--;
		return text.slice(i);
	}
	function textPosToNode(root, pos) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let remaining = pos;
		let node;
		while (node = walker.nextNode()) {
			const len = node.nodeValue.length;
			if (remaining <= len) return {
				node,
				offset: remaining
			};
			remaining -= len;
		}
		return null;
	}
	function findToken(ctx) {
		if (ctx.kind === "input") {
			if (ctx.start !== ctx.end) return null;
			const token = scanToken(ctx.el.value.slice(0, ctx.start), CONFIG.maxAbbrevLen);
			return token ? {
				token,
				tokenStart: ctx.start - token.length
			} : null;
		}
		const sel = window.getSelection();
		if (!sel?.rangeCount || !sel.isCollapsed) return null;
		const r = sel.getRangeAt(0);
		const token = scanToken(getTextBefore(ctx.root, r, CONFIG.maxAbbrevLen), CONFIG.maxAbbrevLen);
		if (!token) return null;
		const fullText = getTextBefore(ctx.root, r, Infinity);
		const tokenStartPos = fullText.length - token.length;
		const tokenEndPos = fullText.length;
		const start = textPosToNode(ctx.root, tokenStartPos);
		const end = textPosToNode(ctx.root, tokenEndPos);
		if (!start || !end) return null;
		const tokenRange = document.createRange();
		tokenRange.setStart(start.node, start.offset);
		tokenRange.setEnd(end.node, end.offset);
		return {
			token,
			tokenRange
		};
	}
	function peekToken(ctx) {
		const m = findToken(ctx);
		return m?.token && m.token.length <= CONFIG.maxAbbrevLen ? m.token : null;
	}
	async function doExpansion(preCtx) {
		const ctx = preCtx ?? captureContext();
		if (!ctx) return;
		const match = findToken(ctx);
		if (!match) return;
		const { token } = match;
		const tmpl = state.dict[token.toLowerCase()];
		if (!tmpl) return;
		const snapshot = ctx.kind === "input" ? ctx.el.value : null;
		const rendered = await renderTemplate(tmpl);
		if (ctx.kind === "input") {
			if (ctx.el.value !== snapshot) return;
			const start = match.tokenStart;
			ctx.el.setRangeText(rendered.text, start, ctx.start, "end");
			ctx.el.selectionStart = ctx.el.selectionEnd = start + rendered.cursor;
			dispatchInput(ctx.el, rendered.text);
		} else if (match.tokenRange) {
			const sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(match.tokenRange);
			document.execCommand("insertText", false, rendered.text);
			if (rendered.cursor < rendered.text.length) {
				const curSel = window.getSelection();
				if (curSel?.rangeCount) {
					const r = curSel.getRangeAt(0);
					const targetPos = getTextBefore(ctx.root, r, Infinity).length - (rendered.text.length - rendered.cursor);
					const pos = textPosToNode(ctx.root, targetPos);
					if (pos) {
						r.setStart(pos.node, pos.offset);
						r.collapse(true);
						curSel.removeAllRanges();
						curSel.addRange(r);
					}
				}
			}
			dispatchInput(ctx.root, rendered.text);
		}
	}
	var matchHotkey = (e, spec) => e.code === (spec.code || "Space") && e.shiftKey === !!spec.shift && e.altKey === !!spec.alt && e.ctrlKey === !!spec.ctrl && e.metaKey === !!spec.meta;
	var hotkeyStr = (spec) => [
		spec.ctrl && "Ctrl",
		spec.meta && "Cmd",
		spec.alt && "Alt",
		spec.shift && "Shift",
		spec.code?.replace(/^Key/, "").replace(/^Digit/, "") || "Space"
	].filter(Boolean).join("+");
	function captureHotkey() {
		return new Promise((resolve) => {
			const ac = new AbortController();
			document.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					ac.abort();
					resolve(null);
					return;
				}
				if ([
					"Shift",
					"Control",
					"Alt",
					"Meta"
				].includes(e.key)) return;
				e.preventDefault();
				ac.abort();
				resolve({
					code: e.code,
					shift: e.shiftKey,
					alt: e.altKey,
					ctrl: e.ctrlKey,
					meta: e.metaKey
				});
			}, {
				capture: true,
				signal: ac.signal
			});
		});
	}
	var cssVars = `
  --sae-bg: #151517;
  --sae-bg-light: #18181a;
  --sae-bg-hover: rgba(255, 255, 255, 0.04);
  --sae-border: rgba(255, 255, 255, 0.04);
  --sae-border-light: rgba(255, 255, 255, 0.02);
  --sae-border-focus: #84a59d;
  --sae-text: #d4d4d8;
  --sae-text-muted: #a1a1aa;
  --sae-text-dim: #71717a;
  --sae-accent: #84a59d;
  --sae-accent-bg: rgba(132, 165, 157, 0.1);
  --sae-success: #84a59d;
  --sae-danger: #e28484;
  --sae-r: 10px;
  --sae-r-sm: 6px;
  --sae-z: 2147483647;
`;
	var scroll = `scrollbar-width:none;`;
	var field = `
  background: rgba(255, 255, 255, 0.03);
  color: var(--sae-text);
  border: 1px solid transparent;
  border-radius: var(--sae-r);
  font: inherit;
  padding: 10px 14px;
`;
	var STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,500&display=swap');
  
  .sae-palette *,.sae-ai-menu *,.sae-toast{box-sizing:border-box}
  :root{${cssVars}}

  /* Toast */
  .sae-toast{
    position:fixed;z-index:var(--sae-z);right:24px;bottom:24px;
    max-width:min(400px,85vw);border-radius:12px;
    background:rgba(21, 21, 23, 0.95);backdrop-filter:blur(24px);
    color:var(--sae-text);padding:14px 20px;
    font:14px/1.5 'Inter',system-ui,sans-serif;
    border:1px solid var(--sae-border);
    box-shadow:0 10px 40px -10px rgba(0,0,0,0.5);
    white-space:pre-wrap;font-weight:400;letter-spacing:0.3px;
  }

  /* Overlay */
  .sae-palette{
    all:initial;position:fixed;z-index:var(--sae-z);inset:0;
    display:none;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.5);backdrop-filter:blur(5px);
    font-family:'Inter',system-ui,sans-serif;
  }
  .sae-palette.open{display:flex}

  /* Panel */
  .sae-panel{
    width:min(640px,94vw);max-height:85vh;overflow:hidden;
    background:rgba(21, 21, 23, 0.95);backdrop-filter:blur(20px);
    color:var(--sae-text);border:1px solid var(--sae-border);
    border-radius:16px;box-shadow:0 30px 80px -20px rgba(0,0,0,0.7);
    display:flex;flex-direction:column;font-size:14px;line-height:1.5;
  }
  .sae-panel-header{
    display:flex;align-items:center;gap:12px;
    padding:16px 20px;border-bottom:1px solid var(--sae-border-light);
  }
  .sae-icon-btn[data-action="settings"],
  .sae-icon-btn[data-action="back"] {
    margin-left: auto;
  }

  /* Hide scrollbars globally for custom scroll areas */
  .sae-list::-webkit-scrollbar, .sae-settings::-webkit-scrollbar, .sae-ai-menu::-webkit-scrollbar { display: none; }

  /* Fields */
  .sae-search,.sae-input,.sae-textarea,.sae-item.editing input{${field}}
  .sae-search:focus,.sae-input:focus,.sae-textarea:focus,.sae-item.editing input:focus{border-color:var(--sae-border-focus);outline:none;background:rgba(255,255,255,0.05)}
  .sae-search{flex:1;width:auto;font-size:15px}
  .sae-textarea{min-height:90px;resize:vertical;width:100%;max-width:100%}
  .sae-item.editing input{padding:8px 12px;flex:1;min-width:80px;border-radius:var(--sae-r-sm)}

  /* Icon Btn */
  .sae-icon-btn{
    padding:8px;border-radius:var(--sae-r);
    border:none;background:transparent;
    color:var(--sae-text-dim);cursor:pointer;display:flex;
    align-items:center;justify-content:center;
    transition:all .2s;flex-shrink:0;
  }
  .sae-icon-btn:hover{background:var(--sae-bg-hover);color:var(--sae-text)}
  .sae-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}

  /* List */
  .sae-list{flex:1;overflow:auto;padding:12px;${scroll}}

  /* Item */
  .sae-item{
    display:grid;grid-template-columns:140px 1fr auto;gap:16px;
    padding:14px 16px;border-radius:var(--sae-r);
    border:1px solid transparent;cursor:pointer;
    align-items:center;
    margin-bottom:4px;
  }
  .sae-item.active{background:var(--sae-bg-hover)}
  .sae-key{font-weight:500;color:var(--sae-text);word-break:break-all;font-size:13px;letter-spacing:0.2px;}
  .sae-item.active .sae-key{font-weight:600;color:#fff}
  .sae-val{color:var(--sae-text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
  .sae-item-actions{display:flex;gap:8px;opacity:0;transition:opacity .05s}
  .sae-item.active .sae-item-actions{opacity:1}
  .sae-item-actions button{
    padding:4px 10px;border-radius:var(--sae-r-sm);
    border:none;background:var(--sae-bg-light);
    color:var(--sae-text-dim);cursor:pointer;font-size:12px;transition:all .05s;
  }
  .sae-item-actions button:hover{background:var(--sae-bg-hover);color:var(--sae-text)}
  
  .sae-item.editing{
    background:rgba(255,255,255,0.02);border-color:var(--sae-border-light);
    display:flex;flex-wrap:wrap;gap:12px;padding:16px;
  }

  .sae-add-new{padding:16px;text-align:center}
  .sae-add-new button{
    padding:10px 24px;border-radius:var(--sae-r);
    border:1px solid transparent;background:var(--sae-accent-bg);
    color:var(--sae-accent);cursor:pointer;font-weight:500;font-size:13px;
    letter-spacing:0.3px;transition:all .2s;
  }
  .sae-add-new button:hover{background:rgba(132, 165, 157, 0.15)}

  .sae-footer{
    padding:16px 20px;
    color:var(--sae-text-dim);font-size:11px;letter-spacing:1px;
    text-transform:uppercase;text-align:center;
  }

  /* Settings toggle */
  .sae-panel.settings-open .sae-list,
  .sae-panel.settings-open .sae-add-new,
  .sae-panel.settings-open .sae-search{display:none}
  .sae-settings{display:none;flex:1;overflow:auto;padding:24px;${scroll}}
  .sae-panel.settings-open .sae-settings{display:block}

  /* Settings — Neo Zen unboxed sections */
  .sae-s-card{
    background:transparent;border:none;
    padding:0 0 32px 0;margin:0;
  }
  .sae-s-title{
    font-size:10px;color:var(--sae-text-dim);text-transform:uppercase;
    letter-spacing:2px;margin-bottom:16px;font-weight:600;
  }
  .sae-s-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  .sae-s-row+.sae-s-row{margin-top:16px}
  .sae-s-row input{flex:1}
  .sae-s-label{color:var(--sae-text-muted);font-size:13px;min-width:80px}
  .sae-s-hint{font-size:12px;color:var(--sae-text-dim);margin-top:10px;font-style:italic}
  .sae-s-sep{height:1px;background:var(--sae-border-light);margin:32px 0}
  .sae-chip{
    display:inline-flex;align-items:center;padding:8px 16px;
    border-radius:var(--sae-r);${field}
    color:var(--sae-text);font-size:13px;font-family:monospace;letter-spacing:0.5px;
    min-width:120px;justify-content:center;
  }

  /* Button */
  .sae-btn{
    padding:10px 16px;border-radius:var(--sae-r);
    border:none;background:var(--sae-bg-light);
    color:var(--sae-text);cursor:pointer;font-size:13px;font-weight:500;
    transition:all .2s;white-space:nowrap;flex-shrink:0;letter-spacing:0.3px;
  }
  .sae-btn:hover{background:var(--sae-bg-hover)}
  .sae-btn.primary{background:var(--sae-accent-bg);color:var(--sae-accent)}
  .sae-btn.primary:hover{background:rgba(132,165,157,0.2)}
  .sae-btn.danger{background:rgba(226,132,132,0.1);color:var(--sae-danger)}
  .sae-btn.danger:hover{background:rgba(226,132,132,0.2)}
  .sae-btn.sm{padding:6px 12px;font-size:12px}
  .sae-btn:disabled{opacity:.4;cursor:not-allowed}

  /* Prompt list */
  .sae-p-list{display:flex;flex-direction:column;gap:8px}
  .sae-p-item{
    display:flex;align-items:center;gap:16px;padding:12px 16px;
    border-radius:var(--sae-r);border:none;background:rgba(255,255,255,0.015);
    transition:background .2s;
  }
  .sae-p-item:hover{background:var(--sae-bg-hover)}
  .sae-p-item .p-icon{display:none}
  .sae-p-item .p-name{font-size:13px;font-weight:500;min-width:100px;color:var(--sae-text);letter-spacing:0.3px}
  .sae-p-item .p-text{
    flex:1;color:var(--sae-text-dim);font-size:12px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  }
  .sae-p-item .p-acts{display:flex;gap:12px;align-items:center;margin-left:auto}
  .sae-p-item.disabled{opacity:.4}
  .sae-p-item.editing{flex-direction:column;align-items:stretch;gap:16px;background:rgba(255,255,255,0.03)}

  .sae-p-edit{display:flex;flex-direction:column;gap:12px;width:100%}
  .sae-p-edit-r{display:flex;gap:12px;align-items:center}
  .sae-p-edit-r .icon-input{display:none}
  .sae-p-edit-r .label-input{flex:1}
  .sae-p-edit-a{display:flex;gap:12px;justify-content:flex-end}

  /* Toggle (Neo Zen) */
  .sae-toggle{
    position:relative;width:34px;height:20px;background:rgba(255,255,255,0.1);
    border-radius:10px;cursor:pointer;transition:background .3s;
    flex-shrink:0;border:none;
  }
  .sae-toggle.on{background:var(--sae-success)}
  .sae-toggle::after{
    content:'';position:absolute;top:3px;left:3px;
    width:14px;height:14px;background:var(--sae-bg);
    border-radius:50%;transition:transform .3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  .sae-toggle.on::after{transform:translateX(14px);background:var(--sae-bg)}

  .sae-empty{
    color:var(--sae-text-dim);padding:24px;text-align:center;font-size:13px;
    border:none;font-style:italic;
  }

  /* ── AI Menu ── */
  .sae-ai-menu{
    position:fixed;z-index:var(--sae-z);
    background:rgba(24, 24, 26, 0.85);backdrop-filter:blur(24px);
    border:1px solid var(--sae-border-light);
    border-radius:16px;box-shadow:0 24px 60px -10px rgba(0,0,0,0.7);
    padding:12px;font:14px/1.5 'Inter',system-ui,sans-serif;
    width:360px;max-width:90vw;max-height:80vh;overflow-y:auto;
    opacity:0;pointer-events:none;
    transform:scale(.98) translateY(-4px);
    transition:opacity .2s ease-out,transform .2s ease-out;
    ${scroll}
  }
  .sae-ai-menu.open{opacity:1;pointer-events:auto;transform:scale(1) translateY(0)}
  .sae-ai-menu.above{transform-origin:bottom center}
  .sae-ai-menu.below{transform-origin:top center}

  .sae-ai-preview{
    padding:16px 20px;margin:0 -12px 12px -12px;
    background:transparent;
    color:var(--sae-text);font-size:15px;line-height:1.6;
    border-bottom:1px solid var(--sae-border-light);
    word-break:break-word;font-family:'Newsreader',serif;font-style:italic;
    letter-spacing:0.2px;
  }

  .sae-ai-pills{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}
  .sae-ai-pill{
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 14px;border-radius:var(--sae-r);
    background:transparent;border:none;
    color:var(--sae-text);cursor:pointer;font-size:13px;
    font-weight:400;
  }
  .sae-ai-pill.active{
    background:rgba(255,255,255,0.03);
  }
  .sae-ai-pill .icon{display:none} /* Hide emojis */
  .sae-ai-pill .label-text{letter-spacing:0.4px;}
  .sae-ai-pill.active .label-text{font-weight:600;color:#fff;}
  .sae-ai-pill .key{
    color:var(--sae-text-dim);font-size:10px;font-family:monospace;
    font-weight:500;opacity:0;transition:opacity .05s;
  }
  .sae-ai-pill.active .key{opacity:1;color:var(--sae-text-muted)}

  .sae-ai-divider{height:1px;background:var(--sae-border-light);margin:12px 0}
  .sae-ai-toggle{
    display:flex;align-items:center;justify-content:center;
    padding:10px;color:var(--sae-text-dim);cursor:pointer;font-size:11px;
    border-radius:var(--sae-r);transition:all .2s;border:none;
    text-transform:uppercase;letter-spacing:1px;
  }
  .sae-ai-toggle:hover{color:var(--sae-text)}
  .sae-ai-custom-label{font-size:9px;color:var(--sae-text-dim);padding:0 14px 8px 14px;text-transform:uppercase;letter-spacing:2px}

  .sae-ai-menu.loading .sae-ai-pills{opacity:.4;pointer-events:none}
  .sae-ai-loading{display:none;align-items:center;gap:12px;padding:16px;color:var(--sae-text-muted);justify-content:center;font-size:13px;letter-spacing:0.5px}
  .sae-ai-menu.loading .sae-ai-loading{display:flex}
  .sae-ai-spinner{
    width:16px;height:16px;
    border:2px solid transparent;border-top-color:var(--sae-text-muted);border-left-color:var(--sae-text-muted);
    border-radius:50%;animation:sae-spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  }
`;
	var toastEl = null;
	var toastTimer = null;
	function close() {
		if (toastTimer) clearTimeout(toastTimer);
		toastEl?.remove();
		toastEl = toastTimer = null;
	}
	function toast(msg, ms = CONFIG.toast.defaultMs) {
		close();
		toastEl = document.createElement("div");
		toastEl.className = "sae-toast";
		toastEl.setAttribute("role", "alert");
		toastEl.setAttribute("aria-live", "polite");
		toastEl.textContent = msg;
		document.documentElement.appendChild(toastEl);
		toastTimer = setTimeout(close, ms);
	}
	var notify = {
		toast,
		close
	};
	function cleanResponse(s) {
		let out = s.trim();
		const m = out.match(/^```\w*\n?([\s\S]*?)\n?```$/);
		if (m) out = m[1].trim();
		if (out[0] === "\"" && out.at(-1) === "\"" || out[0] === "'" && out.at(-1) === "'") out = out.slice(1, -1);
		return out;
	}
	async function callGemini(systemPrompt, userText) {
		const keys = state.apiKey.split(";").map((k) => k.trim()).filter(Boolean);
		if (!keys.length) return null;
		const prompt = `${systemPrompt}\n\nText:\n${userText.slice(0, CONFIG.gemini.maxInputChars)}`;
		const { endpoint, model, temperature } = CONFIG.gemini;
		for (let i = 0; i < keys.length; i++) {
			const idx = (state.apiKeyIndex + i) % keys.length;
			try {
				const res = await GMX.request({
					method: "POST",
					url: `${endpoint}/${model}:generateContent?key=${encodeURIComponent(keys[idx])}`,
					headers: { "Content-Type": "application/json" },
					data: JSON.stringify({
						contents: [{
							role: "user",
							parts: [{ text: prompt }]
						}],
						generationConfig: { temperature }
					})
				});
				if (res.status >= 200 && res.status < 300) {
					const text = JSON.parse(res.text).candidates?.[0]?.content?.parts?.[0]?.text?.trim();
					if (text) {
						state.apiKeyIndex = (idx + 1) % keys.length;
						return cleanResponse(text);
					}
				}
			} catch {
				continue;
			}
		}
		return null;
	}
	async function verifyApiKey(key) {
		try {
			return (await GMX.request({
				method: "GET",
				url: `${CONFIG.gemini.endpoint}?key=${encodeURIComponent(key)}`,
				timeout: 5e3
			})).status < 300;
		} catch {
			return false;
		}
	}
	var VALID_KEY = /^[\w-]+$/i;
	function mountAbbrevEditor(container, key, val, onSave, onCancel) {
		container.innerHTML = "";
		const ki = Object.assign(document.createElement("input"), {
			className: "sae-input",
			placeholder: "abbreviation",
			value: key,
			ariaLabel: "Abbreviation"
		});
		ki.style.maxWidth = "140px";
		const vi = Object.assign(document.createElement("input"), {
			className: "sae-input",
			placeholder: "expansion (supports {{templates}})",
			value: val,
			ariaLabel: "Expansion"
		});
		const acts = document.createElement("div");
		acts.className = "sae-item-actions";
		const sBtn = Object.assign(document.createElement("button"), { textContent: "Save" });
		const cBtn = Object.assign(document.createElement("button"), { textContent: "Cancel" });
		acts.append(sBtn, cBtn);
		container.append(ki, vi, acts);
		const save = () => {
			const k = ki.value.trim().toLowerCase();
			if (!VALID_KEY.test(k)) {
				notify.toast("Invalid: letters, numbers, -, _ only");
				return;
			}
			onSave(k, vi.value);
		};
		sBtn.onclick = save;
		cBtn.onclick = onCancel;
		const onKey = (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				e.target === ki ? vi.focus() : save();
			}
			if (e.key === "Escape") {
				e.preventDefault();
				onCancel();
			}
		};
		ki.addEventListener("keydown", onKey);
		vi.addEventListener("keydown", onKey);
		requestAnimationFrame(() => {
			ki.focus();
			ki.select?.();
		});
	}
	var settingsHTML = (apiKey, paletteHk, aiMenuHk) => `
  <div class="sae-s-card">
    <div class="sae-s-title">API Key</div>
    <div class="sae-s-row">
      <input class="sae-input" id="sae-api" type="password" placeholder="key1;key2..." value="${escHtml(apiKey)}" />
      <button class="sae-btn primary" id="sae-verify">Verify</button>
    </div>
    <div class="sae-s-hint">Semicolon-separated keys rotate on rate limits</div>
  </div>
  <div class="sae-s-card">
    <div class="sae-s-title">Hotkeys</div>
    <div class="sae-s-row">
      <span class="sae-s-label">Palette</span>
      <span class="sae-chip">${paletteHk}</span>
      <button class="sae-btn sm" data-hk="palette">Change</button>
    </div>
    <div class="sae-s-row">
      <span class="sae-s-label">AI Menu</span>
      <span class="sae-chip">${aiMenuHk}</span>
      <button class="sae-btn sm" data-hk="aiMenu">Change</button>
    </div>
  </div>
  <div class="sae-s-card">
    <div class="sae-s-title">Prompts</div>
    <div class="sae-p-list" id="sae-builtins"></div>
    <div class="sae-s-sep"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:10px;color:var(--sae-text-dim);text-transform:uppercase;letter-spacing:.4px">Custom</span>
      <button class="sae-btn sm primary" id="sae-add-prompt">+ Add</button>
    </div>
    <div class="sae-p-list" id="sae-customs"></div>
  </div>
  <div class="sae-s-card">
    <div class="sae-s-title">Dictionary</div>
    <div class="sae-s-row">
      <button class="sae-btn" id="sae-export">Export</button>
      <button class="sae-btn" id="sae-import">Import</button>
      <button class="sae-btn danger" id="sae-reset">Reset</button>
    </div>
  </div>`;
	var promptItemHTML = (p, idx, builtin, on) => `
  <div class="sae-p-item${builtin ? " bi" : ""}${on ? "" : " disabled"}" ${builtin ? `data-id="${escHtml(p.id)}"` : `data-idx="${idx}"`}>
    <span class="p-name">${escHtml(p.label)}</span>
    <span class="p-text">${escHtml(p.prompt)}</span>
    <div class="p-acts">
      <div class="sae-toggle${on ? " on" : ""}" data-toggle role="switch" tabindex="0"></div>
      ${builtin ? "" : "<button class=\"sae-btn sm\" data-edit>Edit</button><button class=\"sae-btn sm danger\" data-del>×</button>"}
    </div>
  </div>`;
	var promptEditFormHTML = (label, prompt) => `
  <div class="sae-p-edit">
    <div class="sae-p-edit-r">
      <input class="sae-input label-input" placeholder="Name" value="${escHtml(label)}" id="pl"/>
    </div>
    <textarea class="sae-textarea" placeholder="Prompt..." id="pp">${escHtml(prompt)}</textarea>
    <div class="sae-p-edit-a">
      <button class="sae-btn" id="pc">Cancel</button>
      <button class="sae-btn primary" id="ps">Save</button>
    </div>
  </div>`;
	var paletteHTML = () => `
  <div class="sae-panel" role="dialog" aria-label="Text Expander Palette">
    <div class="sae-panel-header">
      <input class="sae-search" type="search" placeholder="Search..." aria-label="Search"/>
      <button class="sae-icon-btn" data-action="settings" title="Settings">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <button class="sae-icon-btn" data-action="back" title="Back" style="display:none">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="sae-icon-btn" data-action="close" title="Close">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sae-list" role="listbox"></div>
    <div class="sae-settings"></div>
    <div class="sae-add-new"><button data-action="add">+ Add Abbreviation</button></div>
    <div class="sae-footer">Shift+Space expand · Alt+G AI</div>
  </div>`;
	var aiMenuHTML = () => `
  <div class="sae-ai-preview"></div>
  <div class="sae-ai-pills primary" role="menu"></div>
  <div class="sae-ai-more" style="display:none">
    <div class="sae-ai-divider"></div>
    <div class="sae-ai-pills secondary" role="menu"></div>
    <div class="sae-ai-custom" style="display:none">
      <div class="sae-ai-divider"></div>
      <div class="sae-ai-custom-label">Custom</div>
      <div class="sae-ai-pills custom" role="menu"></div>
    </div>
  </div>
  <div class="sae-ai-toggle" role="button" tabindex="0">▾ More</div>
  <div class="sae-ai-loading"><div class="sae-ai-spinner"></div><span>Processing...</span></div>`;
	var paletteEl = null;
	var prevOverflow = "";
	var listEl;
	var settingsEl;
	var searchEl;
	var panelEl;
	var backBtn;
	var settingsBtn;
	function renderList(filter = "") {
		const q = filter.toLowerCase();
		const keys = Object.keys(state.dict).sort();
		const items = q ? keys.filter((k) => k.includes(q) || state.dict[k].toLowerCase().includes(q)) : keys;
		state.paletteIndex = clamp(state.paletteIndex, 0, Math.max(0, items.length - 1));
		if (!items.length) {
			listEl.innerHTML = "<div class=\"sae-empty\">No abbreviations found</div>";
			return;
		}
		listEl.innerHTML = items.map((k, i) => `
    <div class="sae-item${i === state.paletteIndex ? " active" : ""}" data-key="${escHtml(k)}" role="option">
      <div class="sae-key">${escHtml(k)}</div>
      <div class="sae-val">${escHtml(state.dict[k])}</div>
      <div class="sae-item-actions">
        <button data-action="edit">Edit</button>
        <button data-action="delete">Del</button>
      </div>
    </div>`).join("");
	}
	function updateActive(items, scroll = true) {
		items.forEach((el, i) => el.classList.toggle("active", i === state.paletteIndex));
		if (scroll) items[state.paletteIndex]?.scrollIntoView({ block: "nearest" });
	}
	function save(msg) {
		GMX.set(STORE_KEYS.dict, state.dict);
		renderList(searchEl.value);
		notify.toast(msg);
	}
	function addNew() {
		searchEl.value = "";
		renderList();
		const t = document.createElement("div");
		t.className = "sae-item editing";
		listEl.insertBefore(t, listEl.firstChild);
		mountAbbrevEditor(t, "", "", (k, v) => {
			if (!k || !v) {
				notify.toast("Both fields required");
				return;
			}
			state.dict[k] = v;
			save("Added");
		}, () => {
			t.remove();
			renderList();
		});
	}
	function editAbbrev(item, key) {
		item.classList.add("editing");
		mountAbbrevEditor(item, key, state.dict[key], (nk, nv) => {
			if (!nk || !nv) {
				notify.toast("Both fields required");
				return;
			}
			if (nk !== key) delete state.dict[key];
			state.dict[nk] = nv;
			save("Saved");
		}, () => renderList(searchEl.value));
	}
	function deleteAbbrev(key) {
		if (!confirm(`Delete "${key}"?`)) return;
		delete state.dict[key];
		save("Deleted");
	}
	async function insertAbbrev(key) {
		closePalette();
		const tmpl = state.dict[key];
		if (!tmpl) return;
		const ctx = getContextOrFallback();
		if (!ctx) {
			notify.toast("No editable field");
			return;
		}
		makeEditor(captureContext() || ctx)?.replace((await renderTemplate(tmpl)).text);
	}
	function showSettings(show) {
		panelEl.classList.toggle("settings-open", show);
		backBtn.style.display = show ? "flex" : "none";
		settingsBtn.style.display = show ? "none" : "flex";
		show ? renderSettings() : searchEl.focus();
	}
	function renderSettings() {
		settingsEl.innerHTML = settingsHTML(state.apiKey, hotkeyStr(state.hotkeys.palette), hotkeyStr(state.hotkeys.aiMenu));
		const apiIn = $("#sae-api", settingsEl);
		const verBtn = $("#sae-verify", settingsEl);
		apiIn.onchange = () => {
			state.apiKey = apiIn.value.trim();
			GMX.set(STORE_KEYS.apiKey, state.apiKey);
		};
		verBtn.onclick = async () => {
			const k = apiIn.value.split(";")[0]?.trim();
			if (!k) {
				notify.toast("Enter key first");
				return;
			}
			verBtn.disabled = true;
			verBtn.textContent = "...";
			const ok = await verifyApiKey(k);
			verBtn.textContent = ok ? "✓" : "✗";
			if (ok) {
				state.apiKey = apiIn.value.trim();
				GMX.set(STORE_KEYS.apiKey, state.apiKey);
				notify.toast("Valid");
			} else notify.toast("Invalid");
			setTimeout(() => {
				verBtn.textContent = "Verify";
				verBtn.disabled = false;
			}, 1800);
		};
		$$("[data-hk]", settingsEl).forEach((btn) => {
			btn.onclick = async () => {
				notify.toast("Press new hotkey...");
				const spec = await captureHotkey();
				if (!spec) return;
				const name = btn.dataset.hk;
				state.hotkeys[name] = spec;
				const keys = GMX.get(STORE_KEYS.keys, {});
				keys[name] = spec;
				GMX.set(STORE_KEYS.keys, keys);
				renderSettings();
				notify.toast(`Set: ${hotkeyStr(spec)}`);
			};
		});
		renderBuiltins();
		renderCustoms();
		$("#sae-add-prompt", settingsEl).onclick = addPrompt;
		$("#sae-export", settingsEl).onclick = exportDict;
		$("#sae-import", settingsEl).onclick = importDict;
		$("#sae-reset", settingsEl).onclick = resetDict;
	}
	function wireToggles(container, getIdx, toggle) {
		container.querySelectorAll("[data-toggle]").forEach((t) => {
			t.onclick = () => {
				toggle(getIdx(t.closest(".sae-p-item")));
			};
		});
	}
	function renderBuiltins() {
		const c = $("#sae-builtins", settingsEl);
		c.innerHTML = BUILTIN_PROMPTS.map((p) => promptItemHTML(p, 0, true, isBuiltinEnabled(p.id))).join("");
		wireToggles(c, (el) => el.dataset.id, (id) => {
			const i = state.disabledBuiltins.indexOf(id);
			i >= 0 ? state.disabledBuiltins.splice(i, 1) : state.disabledBuiltins.push(id);
			GMX.set(STORE_KEYS.disabledBuiltins, state.disabledBuiltins);
			renderBuiltins();
		});
	}
	function renderCustoms() {
		const c = $("#sae-customs", settingsEl);
		if (!state.customPrompts.length) {
			c.innerHTML = "<div class=\"sae-empty\">No custom prompts</div>";
			return;
		}
		c.innerHTML = state.customPrompts.map((p, i) => promptItemHTML(p, i, false, p.enabled !== false)).join("");
		wireToggles(c, (el) => el.dataset.idx, (idx) => {
			state.customPrompts[+idx].enabled = !state.customPrompts[+idx].enabled;
			GMX.set(STORE_KEYS.customPrompts, state.customPrompts);
			renderCustoms();
		});
		c.querySelectorAll("[data-edit]").forEach((b) => {
			b.onclick = () => editPrompt(+b.closest(".sae-p-item").dataset.idx);
		});
		c.querySelectorAll("[data-del]").forEach((b) => {
			b.onclick = () => {
				const i = +b.closest(".sae-p-item").dataset.idx;
				if (!confirm(`Delete "${state.customPrompts[i].label}"?`)) return;
				state.customPrompts.splice(i, 1);
				GMX.set(STORE_KEYS.customPrompts, state.customPrompts);
				renderCustoms();
				notify.toast("Deleted");
			};
		});
	}
	function addPrompt() {
		const c = $("#sae-customs", settingsEl);
		c.querySelector(".sae-empty")?.remove();
		const el = document.createElement("div");
		el.className = "sae-p-item editing";
		el.innerHTML = promptEditFormHTML("", "");
		c.insertBefore(el, c.firstChild);
		setupPromptForm(el, (label, prompt) => {
			state.customPrompts.push({
				id: genId(),
				label,
				prompt,
				enabled: true
			});
			GMX.set(STORE_KEYS.customPrompts, state.customPrompts);
			renderCustoms();
			notify.toast("Added");
		});
	}
	function editPrompt(idx) {
		const p = state.customPrompts[idx];
		if (!p) return;
		const el = $(`[data-idx="${idx}"]`, settingsEl);
		el.className = "sae-p-item editing";
		el.innerHTML = promptEditFormHTML(p.label, p.prompt);
		setupPromptForm(el, (label, prompt) => {
			Object.assign(p, {
				label,
				prompt
			});
			GMX.set(STORE_KEYS.customPrompts, state.customPrompts);
			renderCustoms();
			notify.toast("Saved");
		});
	}
	function setupPromptForm(el, onSave) {
		const [lb, pr] = [$("#pl", el), $("#pp", el)];
		$("#ps", el).onclick = () => {
			const l = lb.value.trim(), p = pr.value.trim();
			if (!l || !p) {
				notify.toast("Required");
				return;
			}
			onSave(l, p);
		};
		$("#pc", el).onclick = () => renderCustoms();
		requestAnimationFrame(() => lb.focus());
	}
	function exportDict() {
		const a = document.createElement("a");
		a.href = URL.createObjectURL(new Blob([JSON.stringify(state.dict, null, 2)], { type: "application/json" }));
		a.download = `texpander-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		notify.toast("Exported");
	}
	async function importDict() {
		const inp = Object.assign(document.createElement("input"), {
			type: "file",
			accept: ".json"
		});
		inp.onchange = async () => {
			try {
				let o = JSON.parse(await inp.files[0].text());
				if (o.dict) o = o.dict;
				const imp = normalizeDict(o);
				if (!Object.keys(imp).length) {
					notify.toast("No entries");
					return;
				}
				Object.assign(state.dict, imp);
				GMX.set(STORE_KEYS.dict, state.dict);
				renderList();
				notify.toast(`Imported ${Object.keys(imp).length}`);
			} catch {
				notify.toast("Invalid JSON");
			}
		};
		inp.click();
	}
	function resetDict() {
		if (!confirm("Reset to defaults?")) return;
		state.dict = normalizeDict(DEFAULT_DICT);
		GMX.set(STORE_KEYS.dict, state.dict);
		renderList();
		notify.toast("Reset");
	}
	function ensurePalette() {
		if (paletteEl) return paletteEl;
		paletteEl = document.createElement("div");
		paletteEl.className = "sae-palette";
		paletteEl.innerHTML = paletteHTML();
		document.documentElement.appendChild(paletteEl);
		panelEl = $(".sae-panel", paletteEl);
		searchEl = $(".sae-search", paletteEl);
		listEl = $(".sae-list", paletteEl);
		settingsEl = $(".sae-settings", paletteEl);
		backBtn = $("[data-action=\"back\"]", paletteEl);
		settingsBtn = $("[data-action=\"settings\"]", paletteEl);
		paletteEl.addEventListener("click", (e) => {
			if (e.target === paletteEl) closePalette();
		});
		$("[data-action=\"close\"]", paletteEl).onclick = closePalette;
		settingsBtn.onclick = () => showSettings(true);
		backBtn.onclick = () => showSettings(false);
		$("[data-action=\"add\"]", paletteEl).onclick = addNew;
		searchEl.addEventListener("input", debounce(() => renderList(searchEl.value), CONFIG.searchDebounceMs));
		paletteEl.addEventListener("keydown", handlePaletteKey);
		listEl.addEventListener("click", handleListClick);
		listEl.addEventListener("pointermove", (e) => {
			if (e.movementX === 0 && e.movementY === 0) return;
			const item = e.target.closest(".sae-item:not(.editing)");
			if (!item || item.classList.contains("active")) return;
			const items = $$(".sae-item:not(.editing)", listEl);
			const idx = items.indexOf(item);
			if (idx >= 0 && state.paletteIndex !== idx) {
				state.paletteIndex = idx;
				updateActive(items, false);
			}
		});
		return paletteEl;
	}
	function handlePaletteKey(e) {
		if (panelEl.classList.contains("settings-open")) {
			if (e.key === "Escape") {
				e.preventDefault();
				showSettings(false);
			}
			return;
		}
		if (e.target.closest(".sae-item.editing")) return;
		if (e.key === "Escape") {
			e.preventDefault();
			closePalette();
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			const a = listEl.querySelector(".sae-item.active:not(.editing)");
			if (a?.dataset.key) insertAbbrev(a.dataset.key);
			return;
		}
		const items = $$(".sae-item:not(.editing)", listEl);
		if (!items.length) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			state.paletteIndex = Math.min(items.length - 1, state.paletteIndex + 1);
			updateActive(items);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			state.paletteIndex = Math.max(0, state.paletteIndex - 1);
			updateActive(items);
		}
	}
	function handleListClick(e) {
		const item = e.target.closest(".sae-item");
		if (!item || item.classList.contains("editing")) return;
		const action = e.target.closest("[data-action]")?.dataset.action;
		const key = item.dataset.key;
		if (action === "edit") editAbbrev(item, key);
		else if (action === "delete") deleteAbbrev(key);
		else insertAbbrev(key);
	}
	function openPalette() {
		ensurePalette().classList.add("open");
		prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		showSettings(false);
		searchEl.value = "";
		state.paletteIndex = 0;
		renderList();
		searchEl.focus();
	}
	function closePalette() {
		if (!paletteEl) return;
		paletteEl.classList.remove("open");
		document.body.style.overflow = prevOverflow;
		prevOverflow = "";
	}
	var isPaletteOpen = () => paletteEl?.classList.contains("open") ?? false;
	var menuEl = null;
	var menuState = null;
	var keyH = null;
	var clickH = null;
	var scrollH = null;
	function truncMid(s, max) {
		if (s.length <= max) return s;
		const h = max * .6 | 0, t = max - h - 3;
		return s.slice(0, h) + " … " + s.slice(-t);
	}
	function ensureMenu() {
		if (menuEl) return menuEl;
		menuEl = document.createElement("div");
		menuEl.className = "sae-ai-menu";
		menuEl.setAttribute("role", "menu");
		menuEl.innerHTML = aiMenuHTML();
		document.documentElement.appendChild(menuEl);
		clickH = (e) => {
			if (menuEl?.classList.contains("open") && !menuEl.contains(e.target)) closeAIMenu();
		};
		document.addEventListener("mousedown", clickH, true);
		menuEl.addEventListener("pointermove", (e) => {
			if (e.movementX === 0 && e.movementY === 0) return;
			const pill = e.target.closest(".sae-ai-pill");
			if (!pill || pill.classList.contains("active")) return;
			const idx = pills().indexOf(pill);
			if (idx >= 0 && state.aiMenuIndex !== idx) {
				state.aiMenuIndex = idx;
				markActive(false);
			}
		});
		return menuEl;
	}
	function pills() {
		if (!menuEl || !menuState) return [];
		const p = [...menuEl.querySelectorAll(".sae-ai-pills.primary .sae-ai-pill")];
		if (!menuState.expanded) return p;
		return [
			...p,
			...menuEl.querySelectorAll(".sae-ai-pills.secondary .sae-ai-pill"),
			...menuEl.querySelectorAll(".sae-ai-pills.custom .sae-ai-pill")
		];
	}
	function mkPill(p, i) {
		const b = document.createElement("button");
		b.className = "sae-ai-pill";
		b.dataset.id = p.id;
		b.setAttribute("role", "menuitem");
		b.innerHTML = `<span class="label-text">${p.label}</span><span class="key">${i}</span>`;
		b.onclick = () => exec(p.id);
		return b;
	}
	function render() {
		if (!menuEl || !menuState) return;
		$(".sae-ai-preview", menuEl).textContent = truncMid(menuState.text, CONFIG.ui.previewMaxChars);
		const pri = $(".sae-ai-pills.primary", menuEl);
		const sec = $(".sae-ai-pills.secondary", menuEl);
		const cw = $(".sae-ai-custom", menuEl);
		const cp = $(".sae-ai-pills.custom", menuEl);
		const more = $(".sae-ai-more", menuEl);
		const tog = $(".sae-ai-toggle", menuEl);
		const bi = BUILTIN_PROMPTS.filter((p) => isBuiltinEnabled(p.id));
		const cu = state.customPrompts.filter(isCustomEnabled);
		const n = CONFIG.ui.inlinePrompts;
		let idx = 1;
		pri.replaceChildren(...bi.slice(0, n).map((p) => mkPill(p, idx++)));
		sec.replaceChildren(...bi.slice(n).map((p) => mkPill(p, idx++)));
		if (cu.length) {
			cp.replaceChildren(...cu.map((p) => mkPill(p, idx++)));
			cw.style.display = "block";
		} else {
			cp.innerHTML = "";
			cw.style.display = "none";
		}
		const mc = bi.length - n + cu.length;
		tog.style.display = mc > 0 ? "flex" : "none";
		more.style.display = menuState.expanded ? "block" : "none";
		tog.textContent = menuState.expanded ? "▴ Less" : `▾ More (${mc})`;
		tog.onclick = () => {
			if (!menuState) return;
			menuState.expanded = !menuState.expanded;
			more.style.display = menuState.expanded ? "block" : "none";
			tog.textContent = menuState.expanded ? "▴ Less" : `▾ More (${mc})`;
			markActive();
		};
		markActive();
	}
	function markActive(scroll = true) {
		if (!menuEl) return;
		const v = pills();
		menuEl.querySelectorAll(".sae-ai-pill").forEach((p) => p.classList.remove("active"));
		const activePill = v[state.aiMenuIndex];
		if (activePill) {
			activePill.classList.add("active");
			if (scroll) activePill.scrollIntoView({ block: "nearest" });
		}
	}
	function handleKey(e) {
		if (!menuEl || !menuState) return;
		if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			closeAIMenu();
			return;
		}
		const v = pills(), num = +e.key;
		if (num >= 1 && num <= 9 && v[num - 1]) {
			e.preventDefault();
			e.stopPropagation();
			exec(v[num - 1].dataset.id);
			return;
		}
		if (e.key === "ArrowDown" || e.key === "ArrowRight") {
			e.preventDefault();
			e.stopPropagation();
			state.aiMenuIndex = Math.min(v.length - 1, state.aiMenuIndex + 1);
			markActive();
		} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
			e.preventDefault();
			e.stopPropagation();
			state.aiMenuIndex = Math.max(0, state.aiMenuIndex - 1);
			markActive();
		} else if (e.key === "Enter") {
			e.preventDefault();
			e.stopPropagation();
			if (v[state.aiMenuIndex]) exec(v[state.aiMenuIndex].dataset.id);
		} else if (e.key === "Tab") {
			e.preventDefault();
			e.stopPropagation();
			menuState.expanded = !menuState.expanded;
			render();
		}
	}
	function position(ctx) {
		if (!menuEl) return;
		const rect = ctx.kind === "input" ? ctx.el.getBoundingClientRect() : window.getSelection?.()?.rangeCount ? window.getSelection().getRangeAt(0).getBoundingClientRect() : ctx.root.getBoundingClientRect();
		const { menuWidth: w, menuHeight: h, spacing: sp } = CONFIG.ui;
		let top = rect.bottom + sp.sm, left = Math.max(sp.sm, rect.left);
		if (top + h > innerHeight - sp.md) {
			top = Math.max(sp.sm, rect.top - h - sp.sm);
			menuEl.classList.add("above");
			menuEl.classList.remove("below");
		} else {
			menuEl.classList.add("below");
			menuEl.classList.remove("above");
		}
		if (left + w > innerWidth - sp.md) left = innerWidth - w - sp.md;
		menuEl.style.top = `${top}px`;
		menuEl.style.left = `${left}px`;
	}
	async function exec(id) {
		if (!menuEl || !menuState) return;
		const p = getAllPrompts().find((x) => x.id === id);
		if (!p) return;
		const { ctx, text } = menuState;
		menuEl.classList.add("loading");
		$(".sae-ai-loading span", menuEl).textContent = `${p.label}...`;
		try {
			const r = await callGemini(p.prompt, text);
			if (r) {
				closeAIMenu();
				safeFocus(ctx.kind === "input" ? ctx.el : ctx.root);
				makeEditor(captureContext() || ctx)?.replace(r);
				notify.toast(`Done`, CONFIG.toast.shortMs);
			} else {
				menuEl?.classList.remove("loading");
				notify.toast("Set API key in Settings");
			}
		} catch (err) {
			console.warn("[texpander] AI err:", err);
			menuEl?.classList.remove("loading");
			notify.toast("AI failed");
		}
	}
	function openAIMenu(ctx) {
		const m = ensureMenu(), ed = makeEditor(ctx);
		if (!ed) return;
		const text = ed.getText().trim();
		if (!text) {
			notify.toast("No text");
			return;
		}
		state.aiMenuIndex = 0;
		menuState = {
			ctx,
			text,
			expanded: false
		};
		render();
		position(ctx);
		m.classList.add("open");
		m.classList.remove("loading");
		keyH = handleKey;
		document.addEventListener("keydown", keyH, true);
		scrollH = (e) => {
			if (!menuEl?.contains(e.target)) closeAIMenu();
		};
		window.addEventListener("scroll", scrollH, true);
	}
	function closeAIMenu() {
		if (!menuEl) return;
		menuEl.classList.remove("open", "loading");
		if (keyH) {
			document.removeEventListener("keydown", keyH, true);
			keyH = null;
		}
		if (scrollH) {
			window.removeEventListener("scroll", scrollH, true);
			scrollH = null;
		}
		menuState = null;
	}
	var isAIMenuOpen = () => menuEl?.classList.contains("open") ?? false;
	function handleGlobalKey(e) {
		if (e.isComposing) return;
		const target = e.composedPath()[0] ?? e.target;
		if (e.key === "Escape") {
			if (isAIMenuOpen()) {
				e.preventDefault();
				e.stopPropagation();
				closeAIMenu();
			} else if (isPaletteOpen()) {
				e.preventDefault();
				e.stopPropagation();
				closePalette();
			}
			return;
		}
		if (isAIMenuOpen() || isPaletteOpen()) return;
		if (matchHotkey(e, state.hotkeys.palette)) {
			e.preventDefault();
			e.stopPropagation();
			openPalette();
			return;
		}
		if (matchHotkey(e, state.hotkeys.aiMenu) && getEditable(target)) {
			e.preventDefault();
			e.stopPropagation();
			const ctx = captureContext();
			ctx ? openAIMenu(ctx) : notify.toast("No editable field");
			return;
		}
		if (matchHotkey(e, CONFIG.trigger) && getEditable(target)) {
			const ctx = captureContext();
			if (!ctx) return;
			const token = peekToken(ctx);
			if (!token || !state.dict[token.toLowerCase()]) return;
			e.preventDefault();
			e.stopPropagation();
			doExpansion(ctx);
		}
	}
	function init() {
		_GM_addStyle(STYLES);
		loadState();
		window.addEventListener("focusin", (e) => {
			const t = e.composedPath()[0] ?? e.target;
			if (t?.closest?.(".sae-palette, .sae-ai-menu")) return;
			const el = getEditable(t);
			if (el) state.lastEditableEl = el;
		}, true);
		GMX.menu("Open Palette", openPalette);
		GMX.menu("AI Actions", () => {
			const ctx = getContextOrFallback();
			ctx ? openAIMenu(ctx) : notify.toast("No editable field");
		});
		window.addEventListener("keydown", handleGlobalKey, true);
		console.log("[texpander-ai] loaded");
	}
	init();
})();
