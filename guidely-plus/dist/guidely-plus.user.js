// ==UserScript==
// @name         Guidely Plus
// @namespace    guidely-enhancer
// @version      1.0.0
// @author       quantavil
// @description  Enhance Guidely UI and extract markdown.
// @license      GPL-3.0-or-later
// @match        *://*.guidely.in/*
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
			if (!document.getElementById("tb-css")) document.head.insertAdjacentHTML("beforeend", `<style id="tb-css">${STYLES}</style>`);
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
	var instance = null;
	function getTurndownService() {
		if (!instance) {
			instance = new TurndownService({
				headingStyle: "atx",
				bulletListMarker: "-",
				codeBlockStyle: "fenced"
			});
			instance.use(gfm);
		}
		return instance;
	}
	function collectPrecedingSiblings(refNode) {
		let node = refNode.previousSibling;
		let html = "";
		while (node) {
			html = (node.outerHTML || node.textContent || "") + html;
			node = node.previousSibling;
		}
		return html;
	}
	function extractQuestionHtmlFromBox(container) {
		const firstRadio = container.querySelector(".radio-item");
		if (firstRadio) return collectPrecedingSiblings(firstRadio);
		const span = container.querySelector("span");
		return span ? span.innerHTML : "";
	}
	function extractCurrentQuestion(fallbackIndex) {
		try {
			const headerSpan = Array.from(document.querySelectorAll("span")).find((s) => s.textContent?.includes("Q: "));
			let index = fallbackIndex;
			if (headerSpan?.textContent) {
				const match = headerSpan.textContent.match(/Q:\s*(\d+)/);
				if (match) index = parseInt(match[1], 10);
			}
			const qboxes = Array.from(document.querySelectorAll(".Qbox"));
			if (qboxes.length === 0) return null;
			let directionsHtml = "";
			let questionBaseHtml = "";
			let optionsContainer;
			if (qboxes.length >= 2) {
				directionsHtml = qboxes[0].innerHTML.trim() + "<br><br>";
				optionsContainer = qboxes[1];
				questionBaseHtml = extractQuestionHtmlFromBox(qboxes[1]);
			} else {
				optionsContainer = qboxes[0];
				questionBaseHtml = extractQuestionHtmlFromBox(qboxes[0]);
			}
			const questionHtml = directionsHtml + questionBaseHtml;
			const options = [];
			optionsContainer.querySelectorAll(".radio-item").forEach((item, idx) => {
				const isCorrect = item.classList.contains("correct-answer");
				const labelEl = item.querySelector("label");
				const html = labelEl ? labelEl.innerHTML.trim() : "";
				const label = String.fromCharCode(65 + idx);
				if (html) options.push({
					label,
					html,
					isCorrect
				});
			});
			const solblock = document.querySelector(".SltnsAnswrHld .answrCntnr");
			let solutionHtml = "";
			if (solblock) {
				const solClone = solblock.cloneNode(true);
				solClone.querySelectorAll("button").forEach((b) => b.remove());
				solutionHtml = solClone.innerHTML.trim();
			}
			const testName = document.querySelector(".nav-item.nav-link[aria-selected=\"true\"] span, .subject_name")?.textContent?.trim() || void 0;
			return {
				index,
				questionHtml,
				options,
				solutionHtml,
				testName
			};
		} catch (err) {
			console.error("[Guidely+] Error parsing question block", err);
			return null;
		}
	}
	function formatQuestion(q) {
		const td = getTurndownService();
		let md = `### Q${q.index}\n\n`;
		md += `${td.turndown(q.questionHtml)}\n\n`;
		for (const opt of q.options) {
			const mark = opt.isCorrect ? `**[Correct]** ` : "";
			const text = td.turndown(opt.html).replace(/\n/g, " ");
			md += `- **${opt.label}**: ${mark}${text}\n`;
		}
		md += "\n";
		if (q.solutionHtml) {
			md += `**Solution:**\n\n`;
			md += `${td.turndown(q.solutionHtml)}\n\n`;
		}
		return md;
	}
	var Crawler = class {
		onUpdate;
		onComplete;
		onError;
		isCancelled = false;
		questionsData = new Map();
		constructor(onUpdate, onComplete, onError) {
			this.onUpdate = onUpdate;
			this.onComplete = onComplete;
			this.onError = onError;
		}
		sleep(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms));
		}
		cancel() {
			this.isCancelled = true;
		}
		hashString(str) {
			let hash = 5381;
			for (let i = 0; i < str.length; i++) hash = (hash << 5) + hash + str.charCodeAt(i) | 0;
			return hash.toString(36);
		}
		async start() {
			this.isCancelled = false;
			this.questionsData.clear();
			await this.linearCrawl();
		}
		async linearCrawl() {
			let sameQuestionCount = 0;
			let consecutiveNulls = 0;
			let lastSignature = "";
			while (!this.isCancelled) {
				const displayIndex = this.questionsData.size + 1;
				this.onUpdate(`Extracting Q${displayIndex}...`);
				await this.sleep(10);
				if (this.isCancelled) break;
				const qData = extractCurrentQuestion(displayIndex);
				if (!qData) {
					consecutiveNulls++;
					if (consecutiveNulls > 3) {
						this.onUpdate("No questions found on page.");
						break;
					}
					if (!await this.clickNext()) break;
					continue;
				}
				consecutiveNulls = 0;
				const textContent = qData.questionHtml.replace(/<[^>]*>/g, "").trim();
				const signature = this.hashString(textContent);
				if (signature === lastSignature) {
					sameQuestionCount++;
					if (sameQuestionCount > 3) {
						this.onUpdate("Reached the end or stuck.");
						break;
					}
				} else {
					sameQuestionCount = 0;
					lastSignature = signature;
					if (!this.questionsData.has(signature)) this.questionsData.set(signature, qData);
					else break;
				}
				if (!await this.clickNext()) break;
			}
			if (this.isCancelled) {
				this.onUpdate("Cancelled.");
				return;
			}
			if (this.questionsData.size === 0) {
				this.onError("No questions found.");
				return;
			}
			this.onUpdate("Generating Markdown...");
			const md = this.generateMarkdown();
			this.onComplete(md);
		}
		async clickNext() {
			const nextBtn = Array.from(document.querySelectorAll(".maindivfooter button")).find((btn) => btn.textContent?.includes("Next"));
			if (nextBtn && !nextBtn.disabled && nextBtn.style.display !== "none") {
				nextBtn.click();
				await this.sleep(50);
				return true;
			}
			return false;
		}
		generateMarkdown() {
			const questions = Array.from(this.questionsData.values()).sort((a, b) => a.index - b.index);
			let md = `# ${questions[0]?.testName || "Guidely Test"}\n\n`;
			for (const q of questions) md += formatQuestion(q) + `---\n\n`;
			return md;
		}
	};
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
		(document.head || document.documentElement).appendChild(style);
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
	function onReady(fn) {
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
		else fn();
	}
	var COPY_SVG = "<rect x=\"9\" y=\"9\" width=\"13\" height=\"13\" rx=\"2\" ry=\"2\"></rect><path d=\"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\"></path>";
	var CHECK_SVG = "<path d=\"M20 6L9 17l-5-5\"></path>";
	function ensureCopyButton() {
		const headerCols = document.querySelectorAll(".maindivheader .row .text-right");
		if (headerCols.length === 0) return;
		const headerCol = headerCols[headerCols.length - 1];
		if (headerCol.querySelector(".copy-md-btn")) return;
		const btn = document.createElement("span");
		btn.className = "copy-md-btn";
		btn.title = "Copy Markdown";
		btn.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-left:10px;cursor:pointer;";
		btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${COPY_SVG}</svg>`;
		btn.onclick = async () => {
			const q = extractCurrentQuestion(1);
			if (!q) return;
			const md = formatQuestion(q);
			try {
				await navigator.clipboard.writeText(md);
				const svg = btn.querySelector("svg");
				if (svg) {
					svg.innerHTML = CHECK_SVG;
					setTimeout(() => {
						svg.innerHTML = COPY_SVG;
					}, 2e3);
				}
			} catch (err) {
				console.error("[Guidely+] Clipboard write failed:", err);
			}
		};
		headerCol.appendChild(btn);
	}
	function initDownloader() {
		let activeCrawler = null;
		const ui = new DownloaderUI(() => {
			activeCrawler = new Crawler((msg) => ui.updateStatus(msg), (md) => {
				ui.finish();
				downloadFile(md, `${(md.match(/^# (.+)/m)?.[1] || "Guidely_Questions").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_")}.md`);
			}, (errMsg) => ui.error(errMsg));
			activeCrawler.start();
		}, () => activeCrawler?.cancel());
		onReady(() => ui.mount());
	}
	function runMutationHandlers() {
		ensureCopyButton();
	}
	function init() {
		try {
			enableCopyAndRightClick();
		} catch (e) {
			console.error("[Guidely+]", e);
		}
		try {
			initDownloader();
		} catch (e) {
			console.error("[Guidely+]", e);
		}
		onReady(runMutationHandlers);
		let pending = false;
		new MutationObserver(() => {
			if (pending) return;
			pending = true;
			requestAnimationFrame(() => {
				runMutationHandlers();
				pending = false;
			});
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
	init();
})();
