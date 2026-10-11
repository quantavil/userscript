// ==UserScript==
// @name         Testbook Plus
// @namespace    tb-plus
// @version      2.2.0
// @author       quantavil
// @description  Enhances Testbook UI, blocks tracking, and auto-crawls & downloads question papers as clean Markdown.
// @license      GPL-3.0-or-later
// @match        https://testbook.com/*
// @match        https://*.testbook.com/*
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var ICONS = {
		idle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/></svg>`,
		loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle class="tb-sp" cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/><path class="tb-x" d="M9 9l6 6M15 9l-6 6"/></svg>`,
		success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path class="tb-chk" d="M5 13l4 4L19 7"/></svg>`,
		error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`
	};
	var STYLES = `
#tb-fab { position:fixed; bottom:24px; right:24px; width:44px; height:44px; border-radius:22px; background:#000; color:#fff; display:grid; place-items:center; cursor:pointer; transition:all .3s cubic-bezier(.25,.8,.25,1); box-shadow:0 4px 12px rgba(0,0,0,.15); z-index:99999; border:1px solid transparent; }
#tb-fab svg { width:20px; height:20px; transition:all .3s; }
#tb-fab[data-s="idle"] { opacity:0.3; }
#tb-fab[data-s="idle"]:hover { opacity:1; box-shadow:0 6px 16px rgba(0,0,0,.25); }
#tb-fab[data-s="idle"]:active { transform:scale(.92); }
#tb-fab[data-s="success"] { background:#fff; color:#000; border-color:#e5e5e5; pointer-events:none; transform:scale(1.1); }
#tb-fab[data-s="error"] { background:#fff; color:#000; border-color:#000; animation:sh .4s; }
#tb-fab::after { content:attr(data-t); position:absolute; right:56px; background:#000; color:#fff; padding:6px 12px; border-radius:6px; font:500 12px/1.2 -apple-system,sans-serif; opacity:0; pointer-events:none; transition:opacity .2s; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,.2); }
#tb-fab:hover::after, #tb-fab[data-s="loading"]::after, #tb-fab[data-s="error"]::after { opacity:1; }
#tb-fab[data-s="idle"]:not(:hover)::after { opacity:0; }
#tb-fab .tb-x { opacity:0; transition:opacity .2s; }
#tb-fab[data-s="loading"]:hover .tb-sp { opacity:0; }
#tb-fab[data-s="loading"]:hover .tb-x { opacity:1; }
#tb-fab[data-s="loading"]:hover::after { content:"Cancel"; }
@keyframes sh { 25%,75%{transform:translateX(-4px)} 50%{transform:translateX(4px)} }
#tb-fab .tb-chk { stroke-dasharray:24; stroke-dashoffset:24; animation:tb-draw .4s forwards .1s; }
@keyframes tb-draw { to { stroke-dashoffset:0; } }
`;
	var DownloaderUI = class {
		onStart;
		onCancel;
		el = document.createElement("div");
		state = "idle";
		spinRAF = null;
		timer = null;
		constructor(onStart, onCancel) {
			this.onStart = onStart;
			this.onCancel = onCancel;
			if (!document.getElementById("tb-css")) document.head.insertAdjacentHTML("beforeend", `<style id="tb-css">${STYLES}</style>`);
			this.el.id = "tb-fab";
			this.el.onclick = () => {
				if (this.state === "idle" || this.state === "error") {
					this.setState("loading");
					return this.onStart();
				}
				if (this.state === "loading") {
					this.setState("idle");
					return this.onCancel();
				}
			};
			this.setState("idle");
		}
		startSpin() {
			const el = this.el.querySelector(".tb-sp");
			if (!el) return;
			let last = null;
			let angle = 0;
			const tick = (now) => {
				if (last !== null) angle = (angle + (now - last) * .36) % 360;
				last = now;
				el.setAttribute("transform", `rotate(${angle} 12 12)`);
				this.spinRAF = requestAnimationFrame(tick);
			};
			this.spinRAF = requestAnimationFrame(tick);
		}
		stopSpin() {
			if (this.spinRAF !== null) {
				cancelAnimationFrame(this.spinRAF);
				this.spinRAF = null;
			}
		}
		setState(s) {
			this.stopSpin();
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			this.state = s;
			this.el.dataset.s = s;
			this.el.innerHTML = ICONS[s];
			this.el.dataset.t = {
				idle: "Download",
				loading: "Crawling…",
				success: "Done!",
				error: "Failed — retry"
			}[s];
			if (s === "loading") this.startSpin();
		}
		mount() {
			document.body.appendChild(this.el);
		}
		updateStatus(m) {
			if (this.state === "loading") this.el.dataset.t = m;
		}
		error(m) {
			this.setState("error");
			if (m) this.el.dataset.t = `Error: ${m}`;
			this.timer = window.setTimeout(() => {
				if (this.state === "error") this.setState("idle");
				this.timer = null;
			}, 5e3);
		}
		finish() {
			this.setState("success");
			this.timer = window.setTimeout(() => {
				if (this.state === "success") this.setState("idle");
				this.timer = null;
			}, 2500);
		}
	};
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
	var rules$1 = {};
	rules$1.paragraph = {
		filter: "p",
		replacement: function(content) {
			return "\n\n" + content + "\n\n";
		}
	};
	rules$1.lineBreak = {
		filter: "br",
		replacement: function(content, node, options) {
			return options.br + "\n";
		}
	};
	rules$1.heading = {
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
	rules$1.blockquote = {
		filter: "blockquote",
		replacement: function(content) {
			content = trimNewlines(content).replace(/^/gm, "> ");
			return "\n\n" + content + "\n\n";
		}
	};
	rules$1.list = {
		filter: ["ul", "ol"],
		replacement: function(content, node) {
			var parent = node.parentNode;
			if (parent.nodeName === "LI" && parent.lastElementChild === node) return "\n" + content;
			else return "\n\n" + content + "\n\n";
		}
	};
	rules$1.listItem = {
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
	rules$1.indentedCodeBlock = {
		filter: function(node, options) {
			return options.codeBlockStyle === "indented" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
		},
		replacement: function(content, node, options) {
			return "\n\n    " + node.firstChild.textContent.replace(/\n/g, "\n    ") + "\n\n";
		}
	};
	rules$1.fencedCodeBlock = {
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
	rules$1.horizontalRule = {
		filter: "hr",
		replacement: function(content, node, options) {
			return "\n\n" + options.hr + "\n\n";
		}
	};
	rules$1.inlineLink = {
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
	rules$1.referenceLink = {
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
	rules$1.emphasis = {
		filter: ["em", "i"],
		replacement: function(content, node, options) {
			if (!content.trim()) return "";
			return options.emDelimiter + content + options.emDelimiter;
		}
	};
	rules$1.strong = {
		filter: ["strong", "b"],
		replacement: function(content, node, options) {
			if (!content.trim()) return "";
			return options.strongDelimiter + content + options.strongDelimiter;
		}
	};
	rules$1.code = {
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
	rules$1.image = {
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
			rules: rules$1,
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
	var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;
	function highlightedCodeBlock(turndownService) {
		turndownService.addRule("highlightedCodeBlock", {
			filter: function(node) {
				var firstChild = node.firstChild;
				return node.nodeName === "DIV" && highlightRegExp.test(node.className) && firstChild && firstChild.nodeName === "PRE";
			},
			replacement: function(content, node, options) {
				var language = ((node.className || "").match(highlightRegExp) || [null, ""])[1];
				return "\n\n" + options.fence + language + "\n" + node.firstChild.textContent + "\n" + options.fence + "\n\n";
			}
		});
	}
	function strikethrough(turndownService) {
		turndownService.addRule("strikethrough", {
			filter: [
				"del",
				"s",
				"strike"
			],
			replacement: function(content) {
				return "~" + content + "~";
			}
		});
	}
	var indexOf = Array.prototype.indexOf;
	var every = Array.prototype.every;
	var rules = {};
	rules.tableCell = {
		filter: ["th", "td"],
		replacement: function(content, node) {
			return cell(content, node);
		}
	};
	rules.tableRow = {
		filter: "tr",
		replacement: function(content, node) {
			var borderCells = "";
			var alignMap = {
				left: ":--",
				right: "--:",
				center: ":-:"
			};
			if (isHeadingRow(node)) for (var i = 0; i < node.childNodes.length; i++) {
				var border = "---";
				var align = (node.childNodes[i].getAttribute("align") || "").toLowerCase();
				if (align) border = alignMap[align] || border;
				borderCells += cell(border, node.childNodes[i]);
			}
			return "\n" + content + (borderCells ? "\n" + borderCells : "");
		}
	};
	rules.table = {
		filter: function(node) {
			return node.nodeName === "TABLE" && isHeadingRow(node.rows[0]);
		},
		replacement: function(content) {
			content = content.replace("\n\n", "\n");
			return "\n\n" + content + "\n\n";
		}
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
	function cell(content, node) {
		var index = indexOf.call(node.parentNode.childNodes, node);
		var prefix = " ";
		if (index === 0) prefix = "| ";
		return prefix + content + " |";
	}
	function tables(turndownService) {
		turndownService.keep(function(node) {
			return node.nodeName === "TABLE" && !isHeadingRow(node.rows[0]);
		});
		for (var key in rules) turndownService.addRule(key, rules[key]);
	}
	function taskListItems(turndownService) {
		turndownService.addRule("taskListItems", {
			filter: function(node) {
				return node.type === "checkbox" && node.parentNode.nodeName === "LI";
			},
			replacement: function(content, node) {
				return (node.checked ? "[x]" : "[ ]") + " ";
			}
		});
	}
	function gfm(turndownService) {
		turndownService.use([
			highlightedCodeBlock,
			strikethrough,
			tables,
			taskListItems
		]);
	}
	var turndownService = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced"
	});
	turndownService.use(gfm);
	turndownService.addRule("mathBlock", {
		filter: "math-tb",
		replacement: (_content, node) => node.getAttribute("data-math") || _content
	});
	function htmlToMarkdown(root) {
		if (!root) return "";
		const clone = root.cloneNode(true);
		clone.querySelectorAll("img[src*=\"lms_creative_elements\"], img[src*=\"tb-avatar\"], img.avatar, img.icon").forEach((img) => img.remove());
		clone.querySelectorAll("img").forEach((img) => {
			const src = img.getAttribute("src") || "";
			if (src.includes("quesImage37.png")) {
				const b = document.createElement("b");
				b.textContent = "ALTERNATE METHOD";
				img.parentNode?.replaceChild(b, img);
			} else if (src.includes("60c6e105dc004150078ccd08_16298247021121.png")) {
				const b = document.createElement("b");
				b.textContent = "💡IMPORTANT POINT";
				img.parentNode?.replaceChild(b, img);
			} else if (src.includes("z65abjZdgDuGx4tuXXlusQDIeyCCmOiNCJWG3XiTuSsddAprFHSwW4HR2TdTYnMe73n5kgaTcUZYR9G38EcnxmPnK0SZgvEsGj6zGluwSjH8O1Xs0F-Un9IoZifdXgHRAmTPhFpV")) {
				const span = document.createElement("span");
				span.textContent = "✅";
				img.parentNode?.replaceChild(span, img);
			}
		});
		clone.querySelectorAll("button, bookmarks, report-cta, .tp-pos-neg-marks, .tb-report-component, .dropdown-menu, .help-note, .action-text, .tb-text-grey, .tb-more-dot").forEach((el) => el.remove());
		clone.querySelectorAll("script[type^=\"math/tex\"]").forEach((script) => {
			const isBlock = script.getAttribute("type")?.includes("mode=display");
			const math = script.textContent || "";
			const mathStr = isBlock ? `\n$$\n${math}\n$$\n` : `$${math}$`;
			const wrapper = document.createElement("math-tb");
			wrapper.setAttribute("data-math", mathStr);
			wrapper.textContent = mathStr;
			script.parentNode?.replaceChild(wrapper, script);
		});
		clone.querySelectorAll(".MathJax_Preview, .MathJax, [id^=\"MathJax\"]").forEach((span) => span.remove());
		clone.querySelectorAll("img").forEach((img) => {
			let src = img.getAttribute("src") || "";
			if (src && !src.startsWith("data:") && !src.startsWith("http")) {
				src = src.startsWith("//") ? "https:" + src : "https://testbook.com" + (src.startsWith("/") ? src : "/" + src);
				img.setAttribute("src", src);
			}
		});
		clone.querySelectorAll("table").forEach((table) => {
			table.querySelectorAll("th, td").forEach((cell) => {
				cell.querySelectorAll("p, div").forEach((p) => {
					const span = document.createElement("span");
					span.innerHTML = p.innerHTML + " ";
					p.parentNode?.replaceChild(span, p);
				});
			});
			table.querySelectorAll("th, td").forEach((cell) => {
				const colspan = parseInt(cell.getAttribute("colspan") || "1");
				if (colspan > 1) {
					cell.removeAttribute("colspan");
					for (let i = 1; i < colspan; i++) {
						const empty = document.createElement(cell.tagName);
						empty.innerHTML = " ";
						cell.parentNode?.insertBefore(empty, cell.nextSibling);
					}
				}
			});
			let maxCols = 0;
			const rows = Array.from(table.querySelectorAll("tr"));
			rows.forEach((row) => {
				maxCols = Math.max(maxCols, row.querySelectorAll("th, td").length);
			});
			rows.forEach((row) => {
				const cells = Array.from(row.querySelectorAll("th, td"));
				if (cells.length < maxCols) {
					const diff = maxCols - cells.length;
					const type = cells[0]?.tagName || "td";
					for (let i = 0; i < diff; i++) {
						const empty = document.createElement(type);
						empty.innerHTML = " ";
						row.appendChild(empty);
					}
				}
			});
			if (!table.querySelector("th")) {
				const firstRow = table.querySelector("tr");
				if (firstRow) Array.from(firstRow.querySelectorAll("td")).forEach((td) => {
					const th = document.createElement("th");
					th.innerHTML = td.innerHTML;
					td.parentNode?.replaceChild(th, td);
				});
			}
		});
		return turndownService.turndown(clone.innerHTML).trim();
	}
	function beautifyMarkdown(markdown) {
		const blocks = [];
		let result = markdown.replace(/```[\s\S]*?```/g, (m) => {
			blocks.push(m);
			return `\x00TB_CODE_${blocks.length - 1}\x00`;
		});
		result = result.replace(/(\*\*ALTERNATE METHOD\*\*)\s*\n\s*\1/g, "$1");
		result = result.replace(/(\*\*💡IMPORTANT POINT\*\*)\s*\n\s*\1/g, "$1");
		result = result.replace(/(✅)\s*\n\s*\1/g, "$1");
		result = result.replace(/\u00A0/g, " ");
		result = result.replace(/\u200B/g, "");
		result = result.replace(/^[ \t]+(?![*\-+] |\d+\. |[A-E]\. |> )/gm, "");
		[
			"Given",
			"Concept",
			"Formula Used",
			"Calculation",
			"Calculations",
			"Solution",
			"Given Series"
		].forEach((heading) => {
			const regex = new RegExp(`^(?:\\*\\*)?\\s*${heading}\\s*:(?:\\*\\*)?\\s*$`, "gmi");
			result = result.replace(regex, `**${heading}:**`);
		});
		result = result.replace(/^([A-E]\. .+)\n+(?=[A-E]\. )/gm, "$1\n");
		result = result.replace(/\\=/g, "=");
		result = result.replace(/\\\[/g, "[");
		result = result.replace(/\\\]/g, "]");
		result = result.replace(/\n{3,}/g, "\n\n");
		result = result.replace(/\x00TB_CODE_(\d+)\x00/g, (_, i) => blocks[parseInt(i)]);
		return result.trim();
	}
	var OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	function extractBox(qaBox, fallbackQNum, lastCompHtml = "") {
		const parts = [];
		let qNumEl = qaBox.querySelector(".tp-ques-number");
		if (!qNumEl) qNumEl = Array.from(document.querySelectorAll(".tp-ques-number, .language-sub-header span, .question-header-tittle span")).find((el) => {
			if (!el.classList.contains("tp-ques-number") && el.textContent && !el.textContent.toLowerCase().includes("question no")) return false;
			const cs = getComputedStyle(el);
			return cs.display !== "none" && cs.visibility !== "hidden" && !el.closest(".ng-hide");
		}) || null;
		let qNumStr = fallbackQNum.toString();
		if (qNumEl) {
			const text = qNumEl.textContent || "";
			const match = text.match(/\d+/);
			qNumStr = match ? match[0] : text.replace(/Question No\./i, "").trim() || qNumStr;
		}
		parts.push(`## Q${qNumStr}.`);
		let currentCompHtml = "";
		let comp = qaBox.querySelector(".aei-comprehension [ng-bind-html]");
		if (!comp) {
			const globalComp = document.querySelector(".aei-comprehension [ng-bind-html]");
			if (globalComp && !globalComp.closest(".ng-hide")) {
				const cs = getComputedStyle(globalComp);
				if (cs.display !== "none" && cs.visibility !== "hidden") comp = globalComp;
			}
		}
		if (comp) {
			currentCompHtml = comp.innerHTML.trim();
			if (currentCompHtml && currentCompHtml !== lastCompHtml) parts.push("### Comprehension\n\n" + htmlToMarkdown(comp));
		}
		const qEls = qaBox.querySelectorAll(".qns-view-box");
		let qEl = null;
		for (const el of Array.from(qEls)) {
			if (el.closest("li.option, li.new-ssc-question-option-box") || el.closest("[ng-bind-html*=\"getSolutionDesc\"]")) continue;
			qEl = el;
			break;
		}
		if (qEl) parts.push(htmlToMarkdown(qEl));
		const list = Array.from(qaBox.querySelectorAll("ul")).find((u) => u.querySelector("li.option, li.new-ssc-question-option-box"));
		let correctIdx = -1;
		let selectedIdx = -1;
		if (list) {
			const items = Array.from(list.querySelectorAll("li.option, li.new-ssc-question-option-box")).filter((li) => li.querySelector(".qns-view-box"));
			if (items.length > 0) {
				parts.push("### Options");
				items.forEach((li, idx) => {
					const md = htmlToMarkdown(li.querySelector(".qns-view-box"));
					parts.push(`${OPTION_LETTERS[idx] || idx}. ${md}`);
					if (li.classList.contains("correct-option") || li.classList.contains("reattempt-correct-option") || li.querySelector(".text-success")) correctIdx = idx;
					if (li.classList.contains("wrong-option") || li.classList.contains("reattempt-wrong-option") || li.querySelector(".text-danger")) selectedIdx = idx;
					if (li.classList.contains("correct-option") && li.querySelector(".fa-check")) selectedIdx = idx;
				});
			}
		}
		if (correctIdx >= 0) parts.push(`**Correct Answer:** ${OPTION_LETTERS[correctIdx] || correctIdx}`);
		if (selectedIdx >= 0) parts.push(`**Your Answer:** ${OPTION_LETTERS[selectedIdx] || selectedIdx}`);
		const solEl = qaBox.querySelector("[ng-bind-html*=\"getSolutionDesc\"]") || qaBox.querySelector(".solution-desc");
		if (solEl) parts.push("### Solution\n\n" + htmlToMarkdown(solEl));
		return {
			md: beautifyMarkdown(parts.filter(Boolean).join("\n\n")) + "\n\n---\n\n",
			compHtml: currentCompHtml,
			qNum: qNumStr
		};
	}
	function extractCurrentQuestion(fallbackQNum, lastCompHtml = "") {
		const boxes = Array.from(document.querySelectorAll(".que-ans-box"));
		if (!boxes.length) return {
			md: "",
			compHtml: "",
			qNum: ""
		};
		const qaBox = boxes.find((b) => {
			if (b.closest(".ng-hide")) return false;
			const cs = getComputedStyle(b);
			return cs.display !== "none" && cs.visibility !== "hidden";
		});
		if (!qaBox) return {
			md: "",
			compHtml: "",
			qNum: ""
		};
		return extractBox(qaBox, fallbackQNum, lastCompHtml);
	}
	var MAX_QUESTIONS_PER_SECTION = 300;
	var Crawler = class {
		onProgress;
		onFinish;
		onError;
		markdown = "";
		isRunning = false;
		constructor(onProgress, onFinish, onError) {
			this.onProgress = onProgress;
			this.onFinish = onFinish;
			this.onError = onError;
		}
		cancel() {
			this.isRunning = false;
			this.onProgress("Cancelling...");
		}
		wait(ms) {
			return new Promise((res) => setTimeout(res, ms));
		}
		getSections() {
			return Array.from(document.querySelectorAll([
				".tp-test-sections .nav-tabs > li",
				".sections-tabs > li",
				".section-list > li",
				"#sectionNavTabs > li",
				".sections-list > li",
				".newInterface-sections .section-box"
			].join(", "))).filter((el) => {
				if (el.classList.contains("dropdown-menu") || el.closest(".dropdown-menu")) return false;
				const t = el.textContent?.trim().toLowerCase() || "";
				return t.length > 0 && !t.includes("instruction");
			});
		}
		getSectionName(sec, index) {
			const hiddenXs = sec.querySelector(".hidden-xs");
			if (hiddenXs && hiddenXs.textContent?.trim()) return hiddenXs.textContent.trim();
			if (sec.querySelector(".visible-xs")) {
				const clone = sec.cloneNode(true);
				clone.querySelectorAll(".visible-xs").forEach((el) => el.remove());
				return clone.textContent?.trim() || `Section ${index + 1}`;
			}
			return sec.textContent?.trim() || `Section ${index + 1}`;
		}
		getActiveSectionName() {
			const sections = this.getSections();
			const activeSec = sections.find((sec) => sec.classList.contains("active") || sec.classList.contains("selected") || sec.classList.contains("section-box-current") || sec.getAttribute("aria-selected") === "true" || sec.querySelector(".active") !== null);
			if (activeSec) return this.getSectionName(activeSec, sections.indexOf(activeSec));
			return null;
		}
		async start() {
			if (this.isRunning) return;
			this.isRunning = true;
			this.markdown = "# Testbook Paper\n\n";
			try {
				const sections = this.getSections();
				let lastCompHtml = "";
				let currentSectionName = "";
				if (sections.length > 0) {
					this.onProgress(`Starting crawler (${sections.length} Sections)...`);
					for (let i = 0; i < sections.length; i++) {
						if (!this.isRunning) break;
						const sec = sections[i];
						const secName = this.getSectionName(sec, i);
						this.onProgress(`Switching to ${secName}...`);
						const link = sec.querySelector("a");
						if (link) link.click();
						else sec.click();
						for (let w = 0; w < 100; w++) {
							await this.wait(50);
							if (this.getActiveSectionName() === secName) break;
						}
						await this.wait(150);
						if (secName !== currentSectionName) {
							this.markdown += `# ${secName}\n\n`;
							currentSectionName = secName;
						}
						lastCompHtml = await this.crawlCurrentSectionQuestions(secName, lastCompHtml);
					}
				} else {
					this.onProgress("Starting crawler (Single section mode)...");
					await this.crawlCurrentSectionQuestions("Paper", lastCompHtml);
				}
				if (this.isRunning) this.onFinish(this.markdown);
			} catch (e) {
				console.error("[TB-MD] Crawl error:", e);
				this.onError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				this.isRunning = false;
			}
		}
		async crawlCurrentSectionQuestions(sectionName, startComp) {
			let qIdxInSec = 1;
			let lastMd = "";
			let currentComp = startComp;
			let current = extractCurrentQuestion(qIdxInSec, currentComp);
			while (qIdxInSec <= MAX_QUESTIONS_PER_SECTION) {
				const { md, compHtml, qNum } = current;
				if (compHtml) currentComp = compHtml;
				if (md && md !== lastMd) {
					this.markdown += md;
					lastMd = md;
				}
				this.onProgress(`Extracting ${sectionName}: Q${qNum}`);
				const popup = Array.from(document.querySelectorAll(".modal, .modal-dialog, .popup, .alert, .bootbox")).find((el) => {
					const txt = (el.textContent || "").toLowerCase();
					return el.style.display !== "none" && !el.classList.contains("ng-hide") && (txt.includes("last question") || txt.includes("first question") || txt.includes("end of"));
				});
				if (popup) {
					const closeBtn = popup.querySelector("button[data-bb-handler=\"cancel\"], button[data-dismiss=\"modal\"], .close");
					if (closeBtn) closeBtn.click();
					return currentComp;
				}
				const nextBtn = this.findNextButton();
				if (!nextBtn || nextBtn.disabled || nextBtn.classList.contains("disabled")) return currentComp;
				nextBtn.click();
				let nextCheck = current;
				let changed = false;
				for (let i = 0; i < 100; i++) {
					await this.wait(50);
					if (!this.isRunning) return currentComp;
					const activeSecName = this.getActiveSectionName();
					if (activeSecName && activeSecName !== sectionName) return currentComp;
					nextCheck = extractCurrentQuestion(qIdxInSec + 1, currentComp);
					if (nextCheck.md !== md) {
						changed = true;
						break;
					}
				}
				if (!changed) return currentComp;
				qIdxInSec++;
				current = nextCheck;
			}
			return currentComp;
		}
		findNextButton() {
			const container = document.querySelector(".tp-test-area, .test-interface, .que-ans-box")?.closest(".tp-left-box, #questions, #mainBox, .test-interface") || document;
			const els = Array.from(container.querySelectorAll("button, a, div[role=\"button\"]"));
			for (const el of els) {
				const cs = getComputedStyle(el);
				if (el.classList.contains("ng-hide") || cs.display === "none" || cs.visibility === "hidden") continue;
				const txt = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
				if (txt === "next" || txt === "save & next" || txt.includes("next question") || txt === "nextquestion") return el;
				if (el.querySelector(".fa-chevron-right") || el.querySelector(".fa-angle-right")) {
					const parent = el.parentElement;
					if (parent && (parent.className.includes("pagination") || parent.className.includes("palette"))) continue;
					return el;
				}
			}
			return container.querySelector(".next-btn:not(.ng-hide), .btn-next:not(.ng-hide), [ng-click*=\"nextQuestion\"]:not(.ng-hide)");
		}
	};
	function injectPageScript(fn, ...args) {
		const s = document.createElement("script");
		s.textContent = `(${fn})(...${JSON.stringify(args)})`;
		(document.documentElement || document.head || document.body).appendChild(s);
		s.remove();
	}
	function injectCSS(id, css) {
		if (document.getElementById(id)) return;
		const style = document.createElement("style");
		style.id = id;
		style.textContent = css;
		(document.head || document.documentElement).appendChild(style);
	}
	function onPageChange(callback) {
		if (document.readyState === "complete" || document.readyState === "interactive") callback();
		else document.addEventListener("DOMContentLoaded", callback, { once: true });
		let timer = null;
		const trigger = () => {
			if (timer) clearTimeout(timer);
			timer = window.setTimeout(() => {
				callback();
				timer = null;
			}, 50);
		};
		new MutationObserver(trigger).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		const pushState = history.pushState;
		const replaceState = history.replaceState;
		history.pushState = function(...args) {
			const r = pushState.apply(this, args);
			trigger();
			return r;
		};
		history.replaceState = function(...args) {
			const r = replaceState.apply(this, args);
			trigger();
			return r;
		};
		window.addEventListener("popstate", trigger);
	}
	async function copyToClipboard(text) {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch {}
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.top = "-9999px";
		document.body.appendChild(ta);
		ta.select();
		let ok = false;
		try {
			ok = document.execCommand("copy");
		} catch {}
		ta.remove();
		return ok;
	}
	var BLOCK_PATTERNS = [
		/googletagmanager\.com/i,
		/google-analytics\.com/i,
		/g\.(?:doubleclick|google)\.net/i,
		/doubleclick\.net/i,
		/google\.com\/ccm\/collect/i,
		/unpkg\.com\/web-vitals/i,
		/connect\.facebook\.net/i,
		/facebook\.com\/tr/i,
		/bat\.bing\.com/i,
		/clarity\.ms/i,
		/c\.bing\.com\/c\.gif/i,
		/static\.ads-twitter\.com/i,
		/analytics\.twitter\.com/i,
		/t\.co\/1\/i\/adsct/i,
		/a\.quora\.com/i,
		/q\.quora\.com/i,
		/criteo\.com|static\.criteo\.net|sslwidget\.criteo\.com|gum\.criteo\.com|gumi\.criteo\.com/i,
		/cm\.g\.doubleclick\.net/i,
		/x\.bidswitch\.net|contextual\.media\.net|r\.casalemedia\.com|ad\.360yield\.com|idsync\.rlcdn\.com|rubiconproject\.com|smartadserver\.com|taboola\.com|outbrain\.com|3lift\.com|agkn\.com|adnxs\.com|dmxleo\.com/i,
		/cloudflareinsights\.com/i,
		/amplitude\.com/i,
		/openfpcdn\.io/i,
		/webengage\.com|webengage\.co|wsdk-files\.webengage\.com|c\.webengage\.com|ssl\.widgets\.webengage\.com|survey\.webengage\.com|z\d+.*\.webengage\.co/i,
		/intercom\.io|intercomcdn\.com|widget\.intercom\.io|api-iam\.intercom\.io|nexus-websocket-a\.intercom\.io/i,
		/onesignal\.com/i,
		/hotjar\.com/i,
		/sentry\.io/i,
		/checkout\.razorpay\.com|checkout-static-next\.razorpay\.com|api\.razorpay\.com/i,
		/\/wcapi\/live-panel\.js/i,
		/\/js\/live-panel\.js/i,
		/live-panel\.template\.html/i,
		/live-panel\.styles\.css/i,
		/\/cdn-cgi\/rum/i,
		/coldboot\/dist\/coldboot\.min\.js/i,
		/sourcebuster\/dist\/sourcebuster\.min\.js/i,
		/\/service-worker\.js$/i
	];
	function initNetworkBlocker() {
		injectPageScript((patternSources) => {
			window.__tbBlockerActive = true;
			const BLOCK_PATTERNS = patternSources.map((s) => new RegExp(s, "i"));
			const shouldBlock = (rawUrl) => {
				try {
					const str = (typeof rawUrl === "string" ? new URL(rawUrl, location.href) : rawUrl).toString();
					return BLOCK_PATTERNS.some((re) => re.test(str));
				} catch {
					return false;
				}
			};
			const origFetch = window.fetch;
			if (origFetch) window.fetch = function(input, _init) {
				const url = typeof input === "string" ? input : input && input.url;
				if (url && shouldBlock(url)) return Promise.reject(new Error("Blocked by userscript: " + url));
				return origFetch.apply(this, arguments);
			};
			const XHR = window.XMLHttpRequest;
			if (XHR && XHR.prototype) {
				const origOpen = XHR.prototype.open;
				const origSend = XHR.prototype.send;
				XHR.prototype.open = function(method, url, _async, _user, _password) {
					this.__tbBlocked = url && shouldBlock(url);
					if (!this.__tbBlocked) return origOpen.apply(this, arguments);
					return origOpen.call(this, method, "data:application/json,{}", true);
				};
				XHR.prototype.send = function(_body) {
					if (this.__tbBlocked) {
						try {
							this.abort();
						} catch {}
						return;
					}
					return origSend.apply(this, arguments);
				};
			}
			if (navigator && "sendBeacon" in navigator) {
				const origBeacon = navigator.sendBeacon.bind(navigator);
				navigator.sendBeacon = function(url, data) {
					if (shouldBlock(url)) return false;
					return origBeacon(url, data);
				};
			}
			if ("WebSocket" in window) {
				const OrigWS = window.WebSocket;
				window.WebSocket = function(url, protocols) {
					if (shouldBlock(url)) throw new Error("WebSocket blocked: " + url);
					return new OrigWS(url, protocols);
				};
				window.WebSocket.prototype = OrigWS.prototype;
				window.WebSocket.CLOSING = OrigWS.CLOSING;
				window.WebSocket.CLOSED = OrigWS.CLOSED;
				window.WebSocket.CONNECTING = OrigWS.CONNECTING;
				window.WebSocket.OPEN = OrigWS.OPEN;
			}
			if ("EventSource" in window) {
				const OrigES = window.EventSource;
				window.EventSource = function(url, conf) {
					if (shouldBlock(url)) throw new Error("EventSource blocked: " + url);
					return new OrigES(url, conf);
				};
				window.EventSource.prototype = OrigES.prototype;
				window.EventSource.CLOSED = OrigES.CLOSED;
				window.EventSource.CONNECTING = OrigES.CONNECTING;
				window.EventSource.OPEN = OrigES.OPEN;
			}
			const patchSrcHref = (proto, prop) => {
				const desc = Object.getOwnPropertyDescriptor(proto, prop);
				if (!desc || !desc.set) return;
				Object.defineProperty(proto, prop, {
					configurable: true,
					enumerable: desc.enumerable,
					get: desc.get ? function() {
						return desc.get.call(this);
					} : void 0,
					set: function(v) {
						if (typeof v === "string" && shouldBlock(v)) {
							this.setAttribute("data-blocked-" + prop, v);
							return;
						}
						return desc.set.call(this, v);
					}
				});
			};
			const patchSetAttribute = (proto) => {
				const orig = proto.setAttribute;
				proto.setAttribute = function(name, value) {
					if ((name === "src" || name === "href") && typeof value === "string" && shouldBlock(value)) {
						this.setAttribute("data-blocked-" + name, value);
						return;
					}
					return orig.call(this, name, value);
				};
			};
			[
				HTMLScriptElement.prototype,
				HTMLLinkElement.prototype,
				HTMLImageElement.prototype,
				HTMLIFrameElement.prototype
			].forEach((p) => p && patchSetAttribute(p));
			patchSrcHref(HTMLScriptElement.prototype, "src");
			patchSrcHref(HTMLLinkElement.prototype, "href");
			patchSrcHref(HTMLImageElement.prototype, "src");
			patchSrcHref(HTMLIFrameElement.prototype, "src");
			document.write = () => {};
			document.writeln = () => {};
			window.dataLayer = window.dataLayer || [];
			try {
				Object.defineProperty(window, "dataLayer", {
					get: () => [],
					set: () => {}
				});
			} catch {}
			window.gtag = function() {};
			window.ga = function() {};
			window.fbq = function() {};
			window.clarity = function() {};
			window.Intercom = function() {};
			window.amplitude = { getInstance: () => ({
				init() {},
				logEvent() {},
				setUserId() {},
				setUserProperties() {},
				identify() {}
			}) };
			window.OneSignal = {
				push() {},
				init() {},
				on() {},
				off() {}
			};
			if ("serviceWorker" in navigator) {
				navigator.serviceWorker.register = function() {
					return Promise.reject(new Error("ServiceWorker registration blocked by userscript"));
				};
				navigator.serviceWorker.getRegistrations?.().then((list) => {
					list.forEach((reg) => reg.unregister().catch(() => {}));
				}).catch(() => {});
			}
			try {
				if (window.Notification) {
					window.Notification.requestPermission = function() {
						return Promise.resolve("denied");
					};
					Object.defineProperty(window.Notification, "permission", { get: () => "denied" });
				}
				const origPerms = navigator.permissions?.query?.bind(navigator.permissions);
				if (origPerms) navigator.permissions.query = function(q) {
					if (q && (q.name === "notifications" || q.name === "push")) return Promise.resolve({ state: "denied" });
					return origPerms(q);
				};
			} catch {}
		}, BLOCK_PATTERNS.map((re) => re.source));
		if (!window.__tbBlockerActive) {
			const patterns = BLOCK_PATTERNS.map((re) => new RegExp(re.source, "i"));
			const shouldBlock = (url) => patterns.some((re) => re.test(url));
			const origFetch = window.fetch;
			if (origFetch) window.fetch = function(input, init) {
				const url = typeof input === "string" ? input : input && input.url;
				if (url && shouldBlock(url)) return Promise.reject(new Error("Blocked (CSP Fallback): " + url));
				return origFetch.apply(this, arguments);
			};
			const XHR = window.XMLHttpRequest;
			if (XHR && XHR.prototype) {
				const origOpen = XHR.prototype.open;
				XHR.prototype.open = function(method, url) {
					if (url && shouldBlock(url)) {
						this.__tbBlocked = true;
						return origOpen.call(this, method, "data:application/json,{}", true);
					}
					return origOpen.apply(this, arguments);
				};
				const origSend = XHR.prototype.send;
				XHR.prototype.send = function() {
					if (this.__tbBlocked) {
						try {
							this.abort();
						} catch (e) {}
						return;
					}
					return origSend.apply(this, arguments);
				};
			}
		}
	}
	var CSS$1 = `
/* System font and minimal look */
:root { --tb-fm-maxw: 1180px; --tb-fg: #0b0d10; --tb-bg: #ffffff; }
html, body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important; }
body { background: var(--tb-bg) !important; color: var(--tb-fg) !important; }
/* Disable most animations/transitions */
*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }

/* Keep content centered/wider */
main, [role="main"], .main, .content, .container, .wrapper, .dashboard, .page-wrapper, #content, #site-content {
  max-width: var(--tb-fm-maxw);
  margin-left: auto; margin-right: auto;
}

/* Hide live panel and promo components */
promotion-homepage-banner, refer-earn, goal-pitch-wrapper, goal-features-pitch, goal-combo-cards,
master-class-cards, why-testbook-ts, testimonials-ts, faqs { display: none !important; }
.promotional-banner,
[class*="live-panel"], #livePanel, .lp-tabs, .lp-badge-live, .lp-icon,
[onclick*="livePanel"], [src*="/live-panel/"], link[href*="live-panel"],
.tab-area.pav-class-livePanelTabShrunk { display: none !important; }

/* Hide common cookie bars/popups/newsletters/chats */
[id*="cookie"], [class*="cookie"], [aria-label*="cookie"],
[class*="newsletter"], [id*="newsletter"],
[id^="intercom-"], [class*="intercom"], iframe[src*="intercom"],
.we-popup, .we-survey, .we-banner, [class*="webengage"] { display: none !important; }
`;
	var REMOVE_SELECTORS = [
		"promotion-homepage-banner",
		"refer-earn",
		"goal-pitch-wrapper",
		"goal-features-pitch",
		"goal-combo-cards",
		"master-class-cards",
		"why-testbook-ts",
		"testimonials-ts",
		"faqs",
		".promotional-banner",
		"#masterClassCards",
		".tab-area.pav-class-livePanelTabShrunk",
		"[class*=\"live-panel\"]",
		"#livePanel",
		".lp-tabs",
		".lp-badge-live",
		".lp-icon",
		"[onclick*=\"livePanel\"]",
		"[src*=\"/live-panel/\"]",
		"link[href*=\"live-panel\"]",
		"[id*=\"cookie\"]",
		"[class*=\"cookie\"]",
		"[aria-label*=\"cookie\"]",
		"[class*=\"newsletter\"]",
		"[id*=\"newsletter\"]",
		"[id^=\"intercom-\"]",
		"[class*=\"intercom\"]",
		"iframe[src*=\"intercom\"]",
		".we-popup",
		".we-survey",
		".we-banner",
		"[class*=\"webengage\"]"
	];
	var NAV_REGEXES = [
		/^\/super-coaching/i,
		/^\/free-live-classes/i,
		/^\/skill-academy/i,
		/^\/pass$/i,
		/^\/pass-pro$/i,
		/^\/pass-elite$/i,
		/^\/reported-questions$/i,
		/^\/doubts$/i,
		/^\/current-affairs\/current-affairs-quiz$/i,
		/^\/e-cards$/i,
		/^\/teachers-training-program$/i,
		/^\/referrals$/i,
		/^\/success-stories$/i
	];
	function pruneNav() {
		document.querySelectorAll("ul.header__sidebar__nav a[href]").forEach((a) => {
			try {
				const href = a.getAttribute("href") || "";
				const u = new URL(href, location.origin);
				if (NAV_REGEXES.some((re) => re.test(u.pathname))) (a.closest("li") || a).remove();
			} catch {}
		});
		document.querySelectorAll("ul.header__sidebar__nav .header__divider").forEach((div) => {
			const t = (div.textContent || "").trim().toLowerCase();
			if (t === "learn" || t === "more") div.remove();
		});
	}
	function blockAutoPlay() {
		try {
			const proto = HTMLMediaElement.prototype;
			if (proto.__tbBlocked) return;
			proto.__tbBlocked = true;
			const origPlay = proto.play;
			proto.play = function() {
				if (this.autoplay || this.getAttribute("autoplay") !== null) return Promise.reject(new DOMException("Autoplay blocked by userscript", "NotAllowedError"));
				return origPlay.apply(this, arguments);
			};
		} catch {}
	}
	function cleanUI() {
		injectCSS("tb-clean-style", CSS$1);
		REMOVE_SELECTORS.forEach((sel) => {
			document.querySelectorAll(sel).forEach((n) => n.remove());
		});
		document.querySelectorAll(".lp-title").forEach((n) => {
			if ((n.textContent || "").trim().toLowerCase() === "classes") (n.closest(".tab-area, .lp-tabs, .live, .pav-class") || n).remove();
		});
		pruneNav();
		blockAutoPlay();
	}
	var CSS = `
#tb-copy-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  margin-left: 8px;
  border: none;
  background: transparent;
  color: #86A1AE;
  cursor: pointer;
  font-size: 13px;
  outline: none;
  position: relative;
  vertical-align: middle;
}
#tb-copy-md-btn:hover {
  color: #0AD0F4;
}
#tb-copy-md-btn svg {
  width: 15px;
  height: 15px;
  fill: currentColor;
}
#tb-copy-md-toast {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #1a7f37;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
#tb-copy-md-toast.show {
  opacity: 1;
}
#tb-copy-md-toast::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #1a7f37;
}
`;
	function ensureCopyButton() {
		injectCSS("tb-copy-md-style", CSS);
		const toolbar = document.querySelector(".tp-pos-neg-marks") || document.querySelector(".language-sub-header p") || document.querySelector(".language-sub-header");
		if (!toolbar) return;
		if (toolbar.querySelector("#tb-copy-md-btn")) return;
		const btn = document.createElement("button");
		btn.id = "tb-copy-md-btn";
		btn.type = "button";
		btn.title = "Copy question to Markdown";
		btn.innerHTML = `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
      </svg>
    `;
		const toast = document.createElement("span");
		toast.id = "tb-copy-md-toast";
		toast.textContent = "Copied!";
		btn.appendChild(toast);
		if (toolbar.firstChild) toolbar.insertBefore(btn, toolbar.firstChild);
		else toolbar.appendChild(btn);
		btn.addEventListener("click", async (e) => {
			e.preventDefault();
			e.stopPropagation();
			try {
				const { md } = extractCurrentQuestion(1, "");
				const ok = await copyToClipboard(md || "No content found.");
				toast.textContent = ok ? "Copied!" : "Failed";
			} catch {
				toast.textContent = "Error";
			}
			toast.classList.add("show");
			setTimeout(() => toast.classList.remove("show"), 1500);
		});
	}
	initNetworkBlocker();
	blockAutoPlay();
	function downloadFile(content, filename) {
		const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
	function enableCopyAndRightClick() {
		const style = document.createElement("style");
		style.textContent = `
        * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
		document.documentElement.appendChild(style);
		[
			"contextmenu",
			"copy",
			"cut",
			"paste",
			"selectstart"
		].forEach((evt) => {
			window.addEventListener(evt, (e) => {
				e.stopPropagation();
			}, true);
		});
	}
	function initDownloader() {
		enableCopyAndRightClick();
		let activeCrawler = null;
		const ui = new DownloaderUI(() => {
			activeCrawler = new Crawler((msg) => ui.updateStatus(msg), (md) => {
				ui.finish();
				downloadFile(beautifyMarkdown(md), "Testbook_Paper.md");
			}, (errMsg) => ui.error(errMsg));
			activeCrawler.start();
		}, () => activeCrawler?.cancel());
		ui.mount();
	}
	if (document.readyState === "complete" || document.readyState === "interactive") initDownloader();
	else document.addEventListener("DOMContentLoaded", initDownloader);
	onPageChange(() => {
		cleanUI();
		ensureCopyButton();
	});
})();
