// ==UserScript==
// @name         GitHub Filter
// @namespace    https://github.com/quantavil/userscript/github-filter
// @version      11.0.0
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
	var LAUNCHER_LABEL = "Advanced filters";
	var IDS = {
		panel: "ghf-panel",
		style: "ghf-style",
		fab: "ghf-fab"
	};
	var STORE = { presets: "ghf:presets" };
	var PARAM = { hide: "ghf_hide" };
	var RESULTS_LIST = "[data-testid=\"results-list\"]";
	var LEGACY_ROW = ".repo-list-item, .Box-row";
	var NAV_EVENTS = [
		"turbo:render",
		"turbo:load",
		"pjax:end"
	];
	var SEARCH_PATH = "/search";
	var SEARCH_TYPE = "repositories";
	var isSearchPath = (pathname) => pathname.replace(/\/+$/, "") === SEARCH_PATH;
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
			label: "All of these words",
			placeholder: "e.g. rust async engine"
		},
		{
			id: "or",
			label: "Any of these words",
			placeholder: "e.g. react, vue, svelte"
		},
		{
			id: "hide",
			label: "Hide results containing",
			placeholder: "e.g. spam, tutorial, bot"
		}
	];
	var POPULAR_LANGUAGES = [
		"TypeScript",
		"Python",
		"Rust",
		"Go",
		"Zig",
		"Swift",
		"Kotlin",
		"Dart",
		"C++",
		"C"
	];
	var STAR_PRESETS = [
		1,
		10,
		100,
		1e3,
		1e4
	];
	var FORK_PRESETS = [
		1,
		10,
		100,
		1e3
	];
	var STARS_MAX = 1e5;
	var FORKS_MAX = 25e3;
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
				1,
				5,
				10,
				25,
				50,
				100,
				250,
				500,
				1e3,
				2500,
				5e3,
				1e4,
				25e3,
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
				1,
				5,
				10,
				25,
				50,
				100,
				250,
				500,
				1e3,
				2500,
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
		for (l = q(r, t, g, l, k), s = 0; s < k; s++) null != (v = r.__k[s]) && (h = ~v.__i && g[v.__i] || p$1, v.__i = s, _ = z$1(n, v, h, i, f, o, e, l, c, a), w = v.__e, (h.ref != v.ref || 8 & h.__u) && (h.ref && G$1(h.ref, null, v, h), v.ref && a.push(v.ref, v.__c || w, v)), d = d || w, 4 & v.__u ? (l = A(v, l, n, !h.__v), h.__e && (h.__e = null)) : "function" == typeof v.type && void 0 !== _ ? l = _ : w && (l = w.nextSibling), v.__u &= -21);
		return r.__e = d, l;
	}
	function q(n, t, r, u, i) {
		var f, o, e, l, c, a, s, p, y, v = r.length, d = v, _ = 0, g = 0, k = n.__k = Array(i);
		for (f = 0; f < i; f++) null != (o = t[f]) && "boolean" != typeof o && "function" != typeof o ? ("object" != typeof o || o.constructor === String ? o = k[f] = m$1(null, o) : w$1(o) ? o = k[f] = m$1($, { children: o }) : o.constructor === h$1 && o.__b ? o = k[f] = m$1(o.type, o.props, o.key, o.ref, o.__v) : k[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = P$1(o, r, l, d)) && (d--, (e = r[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 16, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = 1)) : (~c || (i > v ? _-- : i < v && _++), "function" != typeof o.type && (o.__u |= 4))) : k[f] = null;
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
	function A(n, t, r, u) {
		var i, f, o, e;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (i = n.__k) for (f = 0; f < i.length; f++) i[f] && (i[f].__ = n, t = A(i[f], t, r, !1));
			return t;
		}
		for (t && !t.parentNode && (t = S(n)) && !t.parentNode && (t = null), o = n.__e, e = t; e && 8 == e.nodeType;) e = e.nextSibling;
		for (o != e && (!u && r.moveBefore && o.parentNode ? r.moveBefore(o, t) : r.insertBefore(o, t || null)), t = o; (t = t && t.nextSibling) && 8 == t.nodeType && !t.data.startsWith("$s"););
		return t;
	}
	function P$1(n, t, r, u) {
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
		} else l = r.__e = F$2(u.__e, r, u, i, f, o, e, c, a, t);
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
	function F$2(t, r, u, i, f, o, e, l, c, a) {
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
	var f$1 = Symbol.for("pv");
	var o$1 = 0;
	Array.isArray;
	function a$1(t, e, n$1, u, a, i) {
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
			constructor: f$1,
			__v: --o$1,
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
		copy: "M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25ZM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z",
		check: "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z",
		arrowRight: "M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z",
		chevronDown: "M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z",
		star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
		gitFork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
		calendar: "M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-2a.25.25 0 0 0-.25-.25H2.75a.25.25 0 0 0-.25.25V6h10.5Z",
		code: "M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25Zm6.56 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L13.94 8l-3.72-3.72a.75.75 0 0 1 0-1.06Z",
		bookmark: "M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.751.751 0 0 1 3 14.25ZM4.75 2.5a.25.25 0 0 0-.25.25v9.91l3.023-2.489a.751.751 0 0 1 .954 0l3.023 2.49V2.75a.25.25 0 0 0-.25-.25Z"
	};
	function Icon({ name, size = 16, className }) {
		return a$1("svg", {
			viewBox: "0 0 16 16",
			width: size,
			height: size,
			fill: "currentColor",
			class: className,
			"aria-hidden": "true",
			focusable: "false",
			children: a$1("path", { d: ICON[name] })
		});
	}
	function iconSvg(name, size = 16) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 16 16");
		svg.setAttribute("width", String(size));
		svg.setAttribute("height", String(size));
		svg.setAttribute("fill", "currentColor");
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", ICON[name]);
		svg.append(path);
		return svg;
	}
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
	function todayLocal(now = new Date()) {
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
	}
	var isCalendarDate = (value) => {
		const parsed = new Date(`${value}T00:00:00Z`);
		return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
	};
	function parseDateRange(value) {
		const match = value.match(DATE);
		if (!match) return null;
		const [, operator = "", lower = "", upper] = match;
		if (!isCalendarDate(lower)) return null;
		if (upper && !isCalendarDate(upper)) return null;
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
	var normalizeSort = (value) => typeof value === "string" && SORTS.some((sort) => sort.value === value) ? value : "";
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
		state.sort = normalizeSort(sort);
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
	function valToRatio(val, max, end) {
		if (val <= 0) return end === "min" ? 0 : 1;
		if (val <= 1) return .02;
		if (val >= max) return 1;
		return .02 + .98 * (Math.log10(val) / Math.log10(max));
	}
	function quantizeVal(raw, max) {
		if (raw <= 1.5) return 1;
		if (raw < 10) return Math.round(raw);
		if (raw < 50) return Math.round(raw / 5) * 5;
		if (raw < 200) return Math.round(raw / 10) * 10;
		if (raw < 1e3) return Math.round(raw / 50) * 50;
		if (raw < 5e3) return Math.round(raw / 250) * 250;
		if (raw < 2e4) return Math.round(raw / 1e3) * 1e3;
		const rounded = Math.round(raw / 5e3) * 5e3;
		return Math.min(rounded, max);
	}
	function ratioToVal(ratio, max, end) {
		if (end === "min" && ratio <= .015) return 0;
		if (end === "max" && ratio >= .985) return 0;
		if (ratio <= .025) return 1;
		if (ratio >= .975 && end === "min") return max;
		const logMax = Math.log10(max);
		return quantizeVal(10 ** (Math.max(0, Math.min(1, (ratio - .02) / .98)) * logMax), max);
	}
	function stepValue(value, max, end, direction) {
		if (end === "min") {
			if (direction > 0) {
				if (value <= 0) return 1;
				if (value >= max) return max;
				return Math.min(max, Math.max(value + 1, quantizeVal(value * 1.25, max)));
			}
			if (value <= 1) return 0;
			return Math.max(1, Math.min(value - 1, quantizeVal(value / 1.25, max)));
		}
		if (direction > 0) {
			if (value <= 0) return 0;
			if (value >= max) return 0;
			return Math.min(max, Math.max(value + 1, quantizeVal(value * 1.25, max)));
		}
		if (value <= 0) return max;
		if (value <= 1) return 1;
		return Math.max(1, Math.min(value - 1, quantizeVal(value / 1.25, max)));
	}
	var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	function buildHideMatcher(input) {
		const words = tokenize(input).map((w) => w.replace(/^-?"|"$/g, "").trim()).filter(Boolean);
		if (!words.length) return null;
		const alt = words.sort((a, b) => b.length - a.length).map(escapeRe).join("|");
		return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alt})(?![\\p{L}\\p{N}])`, "iu");
	}
	var openHandler = null;
	var launcherObserved = false;
	var launcherQueued = false;
	var launcherItem = null;
	var launcherRow = null;
	var retryTimer;
	var retryAttempts = 0;
	var isVisible = (element) => {
		if (!(element instanceof HTMLElement)) return false;
		const rect = element.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	};
	function findLauncherTarget(doc = document) {
		const filterButton = doc.querySelector("[data-testid=\"filter-button\"]");
		const filterWrapper = filterButton?.parentElement ?? null;
		const toolbar = filterWrapper?.parentElement ?? null;
		if (isVisible(filterButton)) {
			const subHeader = doc.querySelector("[data-testid=\"search-sub-header\"]");
			if (isVisible(subHeader)) return {
				placement: "row",
				parent: subHeader,
				before: null
			};
			if (toolbar) return {
				placement: "toolbar",
				parent: toolbar,
				before: filterWrapper
			};
		}
		const pane = doc.querySelector("[role=\"region\"][aria-labelledby=\"search-filters-title\"]");
		if (isVisible(pane)) {
			const list = pane.querySelector("ul");
			return {
				placement: "sidebar",
				parent: list?.parentElement ?? pane,
				before: list
			};
		}
		return null;
	}
	function placeLauncher(button, target) {
		if (!target) {
			launcherItem?.remove();
			launcherItem = null;
			launcherRow?.remove();
			launcherRow = null;
			button.dataset.placement = "floating";
			if (button.parentElement !== document.body) document.body.append(button);
			return;
		}
		button.dataset.placement = target.placement;
		if (target.placement === "sidebar" || target.placement === "row") {
			let slot;
			if (target.placement === "sidebar") {
				launcherItem ??= createSlot("ghf-launcher-item");
				slot = launcherItem;
			} else {
				launcherRow ??= createSlot("ghf-launcher-row");
				slot = launcherRow;
			}
			if (button.parentElement !== slot) slot.append(button);
			if (slot.parentElement !== target.parent || slot.nextElementSibling !== target.before) target.parent.insertBefore(slot, target.before);
			(target.placement === "sidebar" ? launcherRow : launcherItem)?.remove();
			if (target.placement === "sidebar") launcherRow = null;
			else launcherItem = null;
			return;
		}
		launcherItem?.remove();
		launcherItem = null;
		launcherRow?.remove();
		launcherRow = null;
		if (button.parentElement !== target.parent || button.nextElementSibling !== target.before) target.parent.insertBefore(button, target.before);
	}
	function createSlot(className) {
		const slot = document.createElement("div");
		slot.className = className;
		return slot;
	}
	function updateBadge(button, count) {
		let badge = button.querySelector(".ghf-fab-badge");
		if (!badge) {
			badge = document.createElement("span");
			badge.className = "ghf-fab-badge";
			badge.setAttribute("aria-hidden", "true");
			button.append(badge);
		}
		const text = String(count);
		if (badge.textContent !== text) badge.textContent = text;
		const display = count > 0 ? "inline-flex" : "none";
		if (badge.style.display !== display) badge.style.display = display;
	}
	function createLauncher() {
		const button = document.createElement("button");
		button.id = IDS.fab;
		button.type = "button";
		button.className = "ghf-launcher";
		button.dataset.placement = "floating";
		button.setAttribute("aria-haspopup", "dialog");
		button.append(iconSvg("filter", 16));
		const text = document.createElement("span");
		text.className = "ghf-fab-text";
		text.textContent = LAUNCHER_LABEL;
		button.append(text);
		button.addEventListener("click", () => openHandler?.());
		return button;
	}
	function syncLauncher(open) {
		openHandler = open;
		try {
			if (window.self !== window.top) return;
		} catch {
			return;
		}
		if (!document.body) return;
		if (!isSearchPath(location.pathname)) {
			document.getElementById(IDS.fab)?.remove();
			launcherItem?.remove();
			launcherItem = null;
			launcherRow?.remove();
			launcherRow = null;
			retryAttempts = 0;
			if (retryTimer !== void 0) {
				clearTimeout(retryTimer);
				retryTimer = void 0;
			}
			return;
		}
		let button = document.getElementById(IDS.fab);
		if (!button) {
			launcherItem?.remove();
			launcherItem = null;
			button = createLauncher();
		}
		const count = countActiveFilters(parseUrl(location.search));
		updateBadge(button, count);
		const label = count > 0 ? `${LAUNCHER_LABEL}, ${count} active filters` : LAUNCHER_LABEL;
		button.setAttribute("aria-label", label);
		button.title = `${NAME} — ${LAUNCHER_LABEL}`;
		const panel = document.getElementById(IDS.panel);
		button.setAttribute("aria-expanded", String(panel?.open ?? false));
		const target = findLauncherTarget();
		if (!target && document.querySelector("[data-testid=\"results-list\"]")) {
			button.remove();
			launcherItem?.remove();
			launcherItem = null;
			launcherRow?.remove();
			launcherRow = null;
			if (retryAttempts < 5 && retryTimer === void 0) {
				retryAttempts += 1;
				retryTimer = setTimeout(() => {
					retryTimer = void 0;
					if (openHandler) syncLauncher(openHandler);
				}, 400);
			}
			observeLauncher();
			return;
		}
		retryAttempts = 0;
		if (retryTimer !== void 0) {
			clearTimeout(retryTimer);
			retryTimer = void 0;
		}
		placeLauncher(button, target);
		observeLauncher();
	}
	function observeLauncher() {
		if (launcherObserved) return;
		launcherObserved = true;
		new MutationObserver(scheduleLauncherSync).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		window.addEventListener("resize", scheduleLauncherSync, { passive: true });
	}
	function scheduleLauncherSync() {
		if (launcherQueued) return;
		launcherQueued = true;
		requestAnimationFrame(() => {
			launcherQueued = false;
			if (openHandler) syncLauncher(openHandler);
		});
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
		if (!isSearchPath(location.pathname)) return;
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
		let navTimers = [];
		const rescanSoon = () => {
			for (const timer of navTimers) clearTimeout(timer);
			navTimers = [150, 700].map((ms) => setTimeout(scanResults, ms));
		};
		new MutationObserver((mutations) => {
			if (!isSearchPath(location.pathname)) return;
			if (mutations.every((mutation) => {
				const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
				return Boolean(target?.closest(`#${IDS.panel}, #${IDS.fab}, #ghf-root`));
			})) return;
			clearTimeout(debounce);
			debounce = setTimeout(scanResults, 150);
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		for (const event of NAV_EVENTS) document.addEventListener(event, rescanSoon);
		window.addEventListener("popstate", rescanSoon);
		window.addEventListener("pageshow", rescanSoon);
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
	var getPresets = () => {
		const raw = read(STORE.presets, []);
		if (!Array.isArray(raw)) return [];
		return raw.filter((p) => {
			if (!p || typeof p !== "object") return false;
			const candidate = p;
			return typeof candidate.id === "string" && typeof candidate.name === "string" && Boolean(candidate.id && candidate.name);
		}).map((p) => ({
			...p,
			state: normalizeState(p.state)
		}));
	};
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
	function migrateLegacyStorage() {
		try {
			const legacyPresets = localStorage.getItem("gh-adv-presets");
			if (legacyPresets && !localStorage.getItem(STORE.presets)) {
				const parsed = JSON.parse(legacyPresets);
				const migrated = (Array.isArray(parsed) ? parsed : []).filter((p) => p?.name).map((p, i) => ({
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
			}
			localStorage.removeItem("gh-adv-presets");
			localStorage.removeItem("gh-adv-theme");
			localStorage.removeItem("ghf:theme");
			localStorage.removeItem("gh-adv-scan");
			localStorage.removeItem("ghf:scan");
			localStorage.removeItem("ghf:releases");
			for (const key of Object.keys(localStorage)) if (key.startsWith("gh-rel-")) localStorage.removeItem(key);
		} catch {}
	}
	var P = `#${IDS.panel}`;
	var F$1 = `#${IDS.fab}`;
	var CSS = `
/* GitHub Primer tokens keep the panel native in light, dark and auto themes. */
${P} {
  --ghf-bg: var(--bgColor-default, #0d1117);
  --ghf-card: var(--bgColor-muted, #151b23);
  --ghf-sunken: var(--bgColor-inset, #010409);
  --ghf-fg: var(--fgColor-default, #f0f6fc);
  --ghf-muted: var(--fgColor-muted, #9198a1);
  --ghf-accent: var(--fgColor-accent, #4493f8);
  --ghf-accent-subtle: var(--bgColor-accent-muted, rgba(56, 139, 253, 0.1));
  --ghf-danger: var(--fgColor-danger, #f85149);
  --ghf-danger-subtle: var(--bgColor-danger-muted, rgba(248, 81, 73, 0.1));
  --ghf-border: var(--borderColor-default, #3d444d);
  --ghf-hairline: var(--borderColor-muted, rgba(61, 68, 77, 0.7));
  --ghf-control-border: var(--control-borderColor-rest, #3d444d);
  --ghf-btn-bg: var(--button-default-bgColor-rest, #212830);
  --ghf-btn-hover: var(--button-default-bgColor-hover, #262c36);
  --ghf-primary: var(--button-primary-bgColor-rest, #238636);
  --ghf-primary-hover: var(--button-primary-bgColor-hover, #29903b);
  --ghf-primary-fg: var(--button-primary-fgColor-rest, #ffffff);
  --ghf-neutral: var(--bgColor-neutral-muted, rgba(101, 108, 118, 0.2));
  --ghf-focus: var(--focus-outlineColor, #1f6feb);
  --ghf-font: var(--fontStack-system, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
  --ghf-mono: var(--fontStack-monospace, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
  --ghf-shadow: var(--shadow-floating-large, 0 0 0 1px #3d444d, 0 24px 48px 0 #010409);
  --ghf-radius: 8px;
  --ghf-radius-sm: 6px;
  --ghf-radius-pill: 999px;
}

${F$1}, .ghf-launcher-item {
  font-family: var(--fontStack-system, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif);
}

${P}, ${P} *, ${P} *::before, ${P} *::after,
${F$1}, ${F$1} * { box-sizing: border-box; }

${P} svg, ${F$1} svg { fill: currentColor; color: inherit; flex-shrink: 0; }

/* Panel: a right drawer on desktop, a bottom sheet on phones. */
${P} {
  position: fixed;
  top: 0; right: 0; bottom: 0; left: auto;
  width: min(440px, 100vw);
  height: 100dvh;
  max-height: 100dvh;
  margin: 0; padding: 0;
  border: 0; border-left: 1px solid var(--ghf-border);
  background: var(--ghf-bg);
  color: var(--ghf-fg);
  font-family: var(--ghf-font);
  font-size: 14px; line-height: 1.5;
  accent-color: var(--ghf-accent);
  box-shadow: var(--ghf-shadow);
  overflow: hidden;
  overscroll-behavior: contain;
  transform: translateX(100%);
  opacity: 0;
  transition:
    transform .22s cubic-bezier(0.16, 1, 0.3, 1),
    opacity .18s ease,
    display .22s allow-discrete,
    overlay .22s allow-discrete;
}
${P}[open] { transform: translateX(0); opacity: 1; }
@starting-style { ${P}[open] { transform: translateX(100%); opacity: 0; } }

${P}::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
  background: var(--overlay-backdrop-bgColor, rgba(1, 4, 9, 0.5));
  opacity: 0;
  cursor: pointer;
  pointer-events: auto;
  transition: opacity .2s ease, display .22s allow-discrete, overlay .22s allow-discrete;
}
${P}[open]::backdrop { opacity: 1; }
@starting-style { ${P}[open]::backdrop { opacity: 0; } }

/* Prevent the GitHub page from scrolling behind the modal. */
html:has(${P}[open]) { overflow: hidden; }

${P} .ghf-drag-handle { display: none; }

@media (max-width: 767px) {
  ${P} {
    top: auto; bottom: 0; left: 0; right: 0;
    width: 100%; max-width: 100vw;
    height: 85dvh; max-height: 88dvh;
    margin: 0;
    border-left: none; border-top: 1px solid var(--ghf-border);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 32px rgba(1, 4, 9, 0.28);
    transform: translateY(100%);
    opacity: 0;
  }
  ${P}[open] { transform: translateY(0); opacity: 1; }
  @starting-style { ${P}[open] { transform: translateY(100%); opacity: 0; } }

  ${P} .ghf-drag-handle {
    display: block;
    width: 36px; height: 4px;
    margin: 2px auto 6px;
    border-radius: 999px;
    background: var(--ghf-border);
  }

  /* 16px stops iOS Safari from zooming the viewport on focus. */
  ${P} .ghf-input,
  ${P} .ghf-date,
  ${P} .ghf-sort-select {
    font-size: 16px;
  }

  ${P} .ghf-head { padding: 6px 16px 8px; }
  ${P} .ghf-body {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  ${P} .ghf-foot {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
}

/* Coarse pointers (tablets and touch laptops) get real touch targets regardless of width. */
@media (pointer: coarse) {
  ${P} .ghf-input,
  ${P} .ghf-date,
  ${P} .ghf-sort-select { height: 36px; }
  ${P} .ghf-clear-btn { width: 30px; height: 30px; }
  ${P} .ghf-icon-btn { width: 36px; height: 36px; }
  ${P} .ghf-chip { height: 30px; padding: 0 11px; font-size: 12px; }
  ${P} .ghf-mini-chip { height: 28px; padding: 0 8px; font-size: 11.5px; }
  ${P} .ghf-btn { height: 38px; font-size: 13.5px; }
  ${P} .ghf-preset-chip-item,
  ${P} .ghf-preset-apply-btn,
  ${P} .ghf-preset-run-btn,
  ${P} .ghf-preset-del-btn { height: 36px; }
  ${P} .ghf-preset-run-btn { width: 34px; }
  ${P} .ghf-preset-del-btn { width: 30px; padding: 0 7px; }
  ${P} .ghf-slider { height: 38px; }
  ${P} .ghf-slider-track { top: 16px; height: 6px; }
  ${P} .ghf-slider-thumb {
    top: 6px; width: 20px; height: 20px; margin-left: -10px;
  }
  ${P} .ghf-slider-thumb::before {
    content: '';
    position: absolute;
    top: -12px; left: -12px; right: -12px; bottom: -12px;
    border-radius: 50%;
  }
  ${P} .ghf-tape-chip { min-height: 26px; }
  ${P} .ghf-tape-chip-x { width: 18px; height: 18px; }
  ${P} .ghf-tape-copy { height: 28px; }
}

/* ------------------------------- shell ---------------------------------- */

${P} .ghf-form { display: flex; flex-direction: column; height: 100%; min-height: 0; }

${P} .ghf-head {
  flex: 0 0 auto;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ghf-hairline);
}
${P} .ghf-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
${P} .ghf-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
${P} .ghf-brand h2 {
  margin: 0; color: var(--ghf-fg);
  font-size: 14px; font-weight: 600; line-height: 21px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
${P} .ghf-brand-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: var(--ghf-radius-sm);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent);
}
${P} .ghf-pill {
  min-width: 18px; height: 18px; padding: 0 6px; border-radius: var(--ghf-radius-pill);
  background: var(--ghf-accent-subtle); color: var(--ghf-accent);
  font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: center; justify-content: center;
}
${P} .ghf-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0;
  border: 1px solid transparent; border-radius: var(--ghf-radius-sm);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
  transition: background .12s, color .12s;
}
@media (hover: hover) {
  ${P} .ghf-icon-btn:hover { background: var(--ghf-neutral); color: var(--ghf-fg); }
}

/* Scrollable body and Primer-style cards. */
${P} .ghf-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto; overscroll-behavior: contain;
  padding: 12px 16px 16px;
  display: flex; flex-direction: column; gap: 10px;
  scrollbar-width: thin; scrollbar-color: var(--ghf-border) transparent;
  -webkit-overflow-scrolling: touch;
}
${P} .ghf-card {
  padding: 12px;
  border: 1px solid var(--ghf-border);
  border-radius: var(--ghf-radius);
  background: var(--ghf-card);
}
${P} .ghf-card-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 8px;
}
${P} .ghf-card-title {
  display: flex; align-items: center; gap: 6px; margin: 0;
  color: var(--ghf-fg); font-size: 12px; font-weight: 600; line-height: 18px;
}
${P} .ghf-card-title svg { color: var(--ghf-muted); }

/* ------------------------------- fields --------------------------------- */

${P} .ghf-fields { display: flex; flex-direction: column; gap: 10px; }
${P} .ghf-field { display: flex; flex-direction: column; gap: 4px; }
${P} .ghf-label { color: var(--ghf-fg); font-size: 12px; font-weight: 500; line-height: 18px; }
${P} .ghf-input-wrap {
  display: flex; align-items: center; width: 100%;
  border: 1px solid var(--ghf-control-border);
  border-radius: var(--ghf-radius-sm);
  background: var(--ghf-bg);
  transition: border-color .12s, box-shadow .12s;
}
${P} .ghf-input-wrap:focus-within {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 3px var(--ghf-accent-subtle);
}
${P} .ghf-input {
  flex: 1; min-width: 0; height: 32px;
  padding: 0 10px; border: 0; outline: 0;
  background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 14px;
}
${P} .ghf-input::placeholder { color: var(--ghf-muted); opacity: 1; }
${P} .ghf-clear-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; margin-right: 4px; padding: 0;
  border: 0; border-radius: 4px;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
@media (hover: hover) {
  ${P} .ghf-clear-btn:hover { background: var(--ghf-neutral); color: var(--ghf-fg); }
}

/* Quick chips */
${P} .ghf-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
${P} .ghf-chip {
  display: inline-flex; align-items: center;
  height: 24px; padding: 0 9px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); color: var(--ghf-muted);
  font: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: border-color .1s, color .1s, background .1s;
}
${P} .ghf-chip.ghf-chip-active {
  border-color: var(--ghf-accent); background: var(--ghf-accent-subtle);
  color: var(--ghf-accent); font-weight: 600;
}
@media (hover: hover) {
  ${P} .ghf-chip:hover { border-color: var(--ghf-accent); color: var(--ghf-fg); }
}

/* ------------------------------- sliders -------------------------------- */

${P} .ghf-slider-row { margin-top: 8px; }
${P} .ghf-slider-row:first-of-type { margin-top: 0; }
${P} .ghf-slider-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 2px;
}
${P} .ghf-slider-title-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
${P} .ghf-slider-title {
  display: flex; align-items: center; gap: 5px;
  color: var(--ghf-fg); font-size: 12px; font-weight: 600;
}
${P} .ghf-slider-title svg { color: var(--ghf-muted); }
${P} .ghf-mini-chips { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
${P} .ghf-mini-chip {
  display: inline-flex; align-items: center;
  height: 22px; padding: 0 7px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); color: var(--ghf-muted);
  font: inherit; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: border-color .1s, color .1s, background .1s;
}
${P} .ghf-mini-chip.ghf-mini-chip-active {
  border-color: var(--ghf-accent); background: var(--ghf-accent-subtle);
  color: var(--ghf-accent); font-weight: 600;
}
@media (hover: hover) {
  ${P} .ghf-mini-chip:hover { border-color: var(--ghf-accent); color: var(--ghf-fg); }
}
${P} .ghf-slider-readout-group { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
${P} .ghf-readout {
  padding: 1px 6px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken); color: var(--ghf-fg);
  font-family: var(--ghf-mono); font-size: 11px; line-height: 18px;
  white-space: nowrap;
}
${P} .ghf-slider {
  position: relative; height: 28px;
  cursor: pointer; touch-action: none; user-select: none;
}
${P} .ghf-slider-track {
  position: absolute; left: 8px; right: 8px; top: 11px; height: 6px;
  border-radius: 999px;
  background: var(--ghf-hairline);
  border: 1px solid var(--ghf-border);
  pointer-events: none;
}
${P} .ghf-slider-fill {
  position: absolute; top: 0; bottom: 0;
  border-radius: 999px; background: var(--ghf-accent); pointer-events: none;
}
${P} .ghf-slider-thumb {
  position: absolute; top: 6px;
  width: 16px; height: 16px; margin-left: -8px;
  border-radius: 50%;
  background: #ffffff; border: 2px solid var(--ghf-accent);
  box-shadow: 0 1px 4px rgba(1, 4, 9, 0.45);
  cursor: grab; outline: none; touch-action: none;
  transition: transform .1s, box-shadow .1s, border-color .1s;
}
${P} .ghf-slider-thumb:focus-visible,
${P} .ghf-slider-thumb.ghf-thumb-active {
  cursor: grabbing; transform: scale(1.2);
  border-color: var(--ghf-accent); background: #ffffff;
  box-shadow: 0 0 0 4px var(--ghf-accent-subtle), 0 2px 8px rgba(1, 4, 9, 0.5);
  outline: 2px solid var(--ghf-focus); outline-offset: 2px;
}
@media (hover: hover) {
  ${P} .ghf-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px var(--ghf-accent-subtle), 0 2px 6px rgba(1, 4, 9, 0.5);
  }
}

/* -------------------------------- dates --------------------------------- */

${P} .ghf-dates {
  display: grid; grid-template-columns: 1fr 14px 1fr; align-items: center;
  gap: 6px; margin-top: 4px;
}
${P} .ghf-date {
  width: 100%; height: 32px; padding: 0 8px;
  border: 1px solid var(--ghf-control-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-bg); color: var(--ghf-fg);
  font: inherit; font-size: 13px; outline: 0;
}
${P} .ghf-date:focus {
  border-color: var(--ghf-accent);
  box-shadow: 0 0 0 3px var(--ghf-accent-subtle);
}
${P} .ghf-date-sep { text-align: center; color: var(--ghf-muted); font-size: 11px; }

/* -------------------------------- sort ---------------------------------- */

${P} .ghf-sort-wrap { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; }
${P} .ghf-sort-select {
  appearance: none; height: 28px; padding: 0 24px 0 8px;
  border: 1px solid var(--ghf-control-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 12px; cursor: pointer; outline: 0;
}
${P} .ghf-sort-wrap svg { position: absolute; right: 7px; color: var(--ghf-muted); pointer-events: none; }

/* ------------------------------- presets -------------------------------- */

${P} .ghf-preset-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
${P} .ghf-preset-chip-item {
  display: inline-flex; align-items: center; max-width: 100%;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-pill);
  background: var(--ghf-sunken); overflow: hidden;
  transition: border-color .1s;
}
@media (hover: hover) {
  ${P} .ghf-preset-chip-item:hover { border-color: var(--ghf-accent); }
}
${P} .ghf-preset-apply-btn {
  display: inline-flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 9px;
  border: 0; background: transparent; color: var(--ghf-fg);
  font: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
@media (hover: hover) {
  ${P} .ghf-preset-apply-btn:hover { color: var(--ghf-accent); }
}
${P} .ghf-preset-run-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 28px; border: 0; border-left: 1px solid var(--ghf-border);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
${P} .ghf-preset-del-btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 7px; height: 28px;
  border: 0; border-left: 1px solid var(--ghf-border);
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
@media (hover: hover) {
  ${P} .ghf-preset-run-btn:hover { color: var(--ghf-accent); background: var(--ghf-accent-subtle); }
  ${P} .ghf-preset-del-btn:hover { color: var(--ghf-danger); background: var(--ghf-danger-subtle); }
}
${P} .ghf-del-confirm { font-size: 9px; font-weight: 700; color: var(--ghf-danger); text-transform: uppercase; }
${P} .ghf-preset-save-row { display: flex; gap: 8px; align-items: center; }
${P} .ghf-error-msg { margin: 6px 0 0; color: var(--ghf-danger); font-size: 12px; }

/* --------------------------- footer & query ------------------------------ */

${P} .ghf-foot {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--ghf-border);
  background: var(--ghf-card);
}
${P} .ghf-tape-box {
  padding: 7px 9px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-sunken);
}
${P} .ghf-tape-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-bottom: 4px;
}
${P} .ghf-tape-label {
  color: var(--ghf-muted); font-size: 10px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase;
}
${P} .ghf-tape-copy { height: 22px; padding: 0 7px; font-size: 10.5px; }
${P} .ghf-tape-chips {
  display: flex; flex-wrap: wrap; gap: 4px;
  max-height: 54px; overflow-y: auto; scrollbar-width: thin;
}
${P} .ghf-tape-chip {
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 20px; padding: 0 4px 0 6px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-card); color: var(--ghf-fg);
  font-family: var(--ghf-mono); font-size: 10.5px;
}
${P} .ghf-tape-chip-key { color: var(--ghf-accent); font-weight: 600; }
${P} .ghf-tape-chip-x {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; padding: 0;
  border: 0; border-radius: 50%;
  background: transparent; color: var(--ghf-muted); cursor: pointer;
}
@media (hover: hover) {
  ${P} .ghf-tape-chip-x:hover { background: var(--ghf-danger-subtle); color: var(--ghf-danger); }
}
${P} .ghf-tape-empty { color: var(--ghf-muted); font-size: 12px; font-style: italic; }
${P} .ghf-tape-hide {
  display: flex; align-items: center; gap: 5px;
  margin-top: 5px; padding-top: 5px;
  border-top: 1px dashed var(--ghf-border);
  color: var(--ghf-muted); font-size: 11px;
}
${P} .ghf-tape-hide svg { color: var(--ghf-muted); }
${P} .ghf-tape-hide b { color: var(--ghf-fg); font-weight: 600; }

/* ------------------------------- actions -------------------------------- */

${P} .ghf-actions { display: grid; grid-template-columns: 96px 1fr; gap: 8px; }
${P} .ghf-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  height: 32px; padding: 0 12px;
  border: 1px solid var(--ghf-border); border-radius: var(--ghf-radius-sm);
  background: var(--ghf-btn-bg); color: var(--ghf-fg);
  font: inherit; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background .1s, border-color .1s;
}
@media (hover: hover) {
  ${P} .ghf-btn:hover { background: var(--ghf-btn-hover); }
}
${P} .ghf-btn-primary {
  border-color: var(--ghf-primary); background: var(--ghf-primary);
  color: var(--ghf-primary-fg); font-weight: 600;
}
@media (hover: hover) {
  ${P} .ghf-btn-primary:hover { border-color: var(--ghf-primary-hover); background: var(--ghf-primary-hover); }
}
${P} .ghf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Focus rings for every interactive control, not just inputs. */
${P} :focus-visible, ${F$1}:focus-visible {
  outline: 2px solid var(--ghf-focus, var(--focus-outlineColor, #1f6feb));
  outline-offset: 2px;
}
${P} .ghf-input:focus-visible,
${P} .ghf-date:focus-visible,
${P} .ghf-sort-select:focus-visible { outline: none; }

/* ------------------------------ launcher -------------------------------- */

${F$1} {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0;
  border: 1px solid var(--borderColor-default, #3d444d);
  border-radius: var(--ghf-radius-pill, 999px);
  background: var(--button-default-bgColor-rest, #212830);
  color: var(--fgColor-default, #f0f6fc);
  box-shadow: var(--shadow-resting-medium, 0 3px 6px rgba(1, 4, 9, 0.6));
  cursor: pointer; z-index: 9999;
  transition: transform .12s, border-color .12s, background .12s;
}
${F$1} svg { color: var(--fgColor-accent, #4493f8); }
${F$1} .ghf-fab-text { display: none; }
${F$1} .ghf-fab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: var(--ghf-radius-pill, 999px);
  background: var(--fgColor-accent, #4493f8); color: var(--fgColor-onEmphasis, #ffffff);
  font-size: 9px; font-weight: 700;
}
${F$1}[data-placement="floating"] .ghf-fab-badge {
  position: absolute; top: -5px; right: -5px;
  border: 2px solid var(--bgColor-default, #0d1117);
}

/* Desktop/tablet: a native ActionList row under the “Filter by” heading. */
.ghf-launcher-item { margin: 0 0 4px; }
.ghf-launcher-row { display: flex; padding: 8px 0 0; }
${F$1}[data-placement="sidebar"] {
  position: static;
  display: flex; align-items: center; justify-content: flex-start;
  gap: 8px; width: 100%; height: 32px;
  padding: 6px 8px; margin: 0;
  border: 0; border-radius: var(--ghf-radius-sm, 6px);
  background: transparent; color: var(--fgColor-default, #f0f6fc);
  box-shadow: none;
  font-size: 14px; font-weight: 400; line-height: 21px; text-align: left;
  cursor: pointer;
}
${F$1}[data-placement="sidebar"] svg { color: var(--fgColor-accent, #4493f8); }
${F$1}[data-placement="sidebar"] .ghf-fab-text {
  display: inline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
${F$1}[data-placement="sidebar"] .ghf-fab-badge {
  margin-left: auto;
  background: var(--bgColor-accent-muted, rgba(56, 139, 253, 0.1));
  color: var(--fgColor-accent, #4493f8);
}
@media (hover: hover) {
  ${F$1}[data-placement="sidebar"]:hover {
    background: var(--bgColor-neutral-muted, rgba(101, 108, 118, 0.2));
  }
  ${F$1}[data-placement="sidebar"]:hover .ghf-fab-text { color: var(--fgColor-accent, #4493f8); }
}

/* Phone: a native-looking filter pill on its own row below the toolbar. */
${F$1}[data-placement="row"] {
  position: static;
  display: inline-flex; align-items: center; justify-content: flex-start;
  gap: 7px; width: auto; height: 32px;
  padding: 0 12px; margin: 0;
  border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, #3d444d));
  border-radius: var(--ghf-radius-sm, 6px);
  background: var(--button-default-bgColor-rest, #212830);
  color: var(--fgColor-default, #f0f6fc);
  box-shadow: none;
  font-size: 14px; font-weight: 500; line-height: 20px;
  cursor: pointer;
}
${F$1}[data-placement="row"] .ghf-fab-text { display: inline; }
${F$1}[data-placement="row"] .ghf-fab-badge {
  margin-left: 1px;
  background: var(--bgColor-accent-muted, rgba(56, 139, 253, 0.1));
  color: var(--fgColor-accent, #4493f8);
}
@media (hover: hover) {
  ${F$1}[data-placement="row"]:hover { background: var(--button-default-bgColor-hover, #262c36); }
}

/* Tablet/phone: a square button beside GitHub's native Filter trigger. */
${F$1}[data-placement="toolbar"] {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 28px; padding: 0;
  border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, #3d444d));
  border-radius: var(--ghf-radius-sm, 6px);
  background: var(--button-default-bgColor-rest, #212830);
  color: var(--fgColor-default, #f0f6fc);
  box-shadow: none;
  cursor: pointer;
}
${F$1}[data-placement="toolbar"] .ghf-fab-text { display: none; }
${F$1}[data-placement="toolbar"] .ghf-fab-badge {
  position: absolute; top: -7px; right: -7px;
  border: 2px solid var(--bgColor-default, #0d1117);
}
@media (hover: hover) {
  ${F$1}[data-placement="toolbar"]:hover { background: var(--button-default-bgColor-hover, #262c36); }
}

${F$1}[data-placement="floating"]:hover { transform: translateY(-2px); border-color: var(--fgColor-accent, #4493f8); }

/* Hide the launcher while the modal is open. */
${F$1}[aria-expanded="true"],
body:has(${P}[open]) ${F$1},
body:has(${P}[open]) .ghf-launcher-item,
body:has(${P}[open]) .ghf-launcher-row { display: none !important; }

.ghf-hidden { display: none !important; }

.ghf-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

@media (forced-colors: active) {
  ${P}, ${P} .ghf-card, ${P} .ghf-input-wrap, ${P} .ghf-tape-box { border-color: CanvasText; }
  ${P} .ghf-btn, ${P} .ghf-chip, ${P} .ghf-mini-chip { border-color: ButtonText; }
}

@media print { ${F$1}, ${P}, .ghf-launcher-item { display: none !important; } }
@media (prefers-reduced-motion: reduce) {
  ${P}, ${P}::backdrop, ${F$1}, ${P} * { transition-duration: 0.01ms !important; }
}
`;
	function injectStyles() {
		if (document.getElementById(IDS.style)) return;
		const style = document.createElement("style");
		style.id = IDS.style;
		style.textContent = CSS;
		document.head.append(style);
	}
	var t;
	var r;
	var u;
	var i;
	var o = Object.is;
	var f = 0;
	var c = [];
	var e = [];
	var a = n;
	var v = a.__b;
	var l = a.__r;
	var m = a.diffed;
	var h = a.__c;
	var s = a.unmount;
	var p = a.__;
	function y(n, t) {
		a.__h && a.__h(r, n, f || t), f = 0;
		var u = r.__H || (r.__H = {
			__: [],
			__h: []
		});
		return n >= u.__.length && u.__.push({}), u.__[n];
	}
	function d(n) {
		return f = 1, _(G, n);
	}
	function _(n, u, i) {
		var f = y(t++, 2);
		if (f.t = n, !f.__c && (f.__ = [i ? i(u) : G(void 0, u), function(n) {
			var t = (f.__N || f.__)[0], r = f.t(t, n);
			o(t, r) || (f.__N = [r, f.__[1]], f.__c.setState({}));
		}], f.__c = r, !r.__f)) {
			r.__f = !0;
			var c = r.shouldComponentUpdate;
			r.shouldComponentUpdate = function(n, t, r) {
				var u = this.__H;
				if (!u) return !0;
				var i = !1, f = this.props != n;
				if (u.__.some(function(n) {
					n.__N && (i = !0, o(n.__[0], n.__N[0]) || (f = !0));
				}), c) {
					var e = c.call(this, n, t, r);
					return i ? e || f : e;
				}
				return !i || f;
			};
		}
		return f.__;
	}
	function F(n, u) {
		var i = y(t++, 4);
		!a.__s && E(i.__H, u) && (i.__P = !1, i.__ = n, i.u = u, r.__h.push(i));
	}
	function T(n) {
		return f = 5, w(function() {
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
		i && (u == r ? r.__h = [] : (i.__h.some(C), i.__h.some(D), t = 0), i.__h = [], i.__.some(function(n) {
			n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
		})), u = r;
	}, a.diffed = function(n) {
		m && m(n);
		var t = n.__c;
		t && t.__H && (t.__H.__h.length && B(c.push(t)), t.__H.__.some(function(n) {
			n.u && (n.__H = n.u);
		})), u = r = null;
	}, a.__c = function(n, t) {
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
	}, a.unmount = function(n) {
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
			return !o(t, n[r]);
		});
	}
	function G(n, t) {
		return "function" == typeof t ? t(n) : t;
	}
	var panelControl = null;
	var host = null;
	var setExpanded = (open) => document.getElementById(IDS.fab)?.setAttribute("aria-expanded", String(open));
	var closePanel = () => panelControl?.close();
	var formatCount = (value) => {
		if (value < 1e3) return String(value);
		const k = Math.round(value / 100) / 10;
		return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
	};
	function rangeReadout(r) {
		if (r.min > 0 && r.max > 0) return `${formatCount(r.min)} – ${formatCount(r.max)}`;
		if (r.min > 0) return `${formatCount(r.min)}+`;
		if (r.max > 0) return `≤ ${formatCount(r.max)}`;
		return "Any";
	}
	function dateReadout(d) {
		if (d.from && d.to) return d.from === d.to ? d.from : `${d.from} – ${d.to}`;
		if (d.from) return `From ${d.from}`;
		if (d.to) return `Until ${d.to}`;
		return "Any";
	}
	var search = (state) => {
		const url = buildUrl(state);
		closePanel();
		const turbo = window.Turbo;
		if (typeof turbo?.visit === "function") turbo.visit(url);
		else location.assign(url);
	};
	function Field({ id, label, value, placeholder, onChange }) {
		return a$1("div", {
			class: "ghf-field",
			children: [a$1("label", {
				class: "ghf-label",
				for: `ghf-${id}`,
				children: label
			}), a$1("div", {
				class: "ghf-input-wrap",
				children: [a$1("input", {
					id: `ghf-${id}`,
					class: "ghf-input",
					type: "text",
					value,
					placeholder,
					autocomplete: "off",
					spellcheck: false,
					onInput: (e) => onChange(e.currentTarget.value)
				}), value && a$1("button", {
					type: "button",
					class: "ghf-clear-btn",
					title: `Clear ${label}`,
					"aria-label": `Clear ${label}`,
					onClick: () => onChange(""),
					children: a$1(Icon, {
						name: "x",
						size: 11
					})
				})]
			})]
		});
	}
	function SmoothSlider({ label, icon, maxCap, value, presets, onChange }) {
		const trackRef = T(null);
		const activeThumbRef = T(null);
		const [activeThumb, setActiveThumb] = d(null);
		const [lead, setLead] = d("max");
		const loRatio = valToRatio(value.min, maxCap, "min");
		const hiRatio = valToRatio(value.max, maxCap, "max");
		const filtered = value.min > 0 || value.max > 0;
		const getRatioFromPointer = (clientX) => {
			if (!trackRef.current) return 0;
			const rect = trackRef.current.getBoundingClientRect();
			if (rect.width <= 0) return 0;
			return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		};
		const activate = (thumb) => {
			activeThumbRef.current = thumb;
			setLead(thumb);
			setActiveThumb(thumb);
		};
		const handlePointerDown = (e) => {
			if (e.pointerType === "mouse" && e.button !== 0) return;
			const ratio = getRatioFromPointer(e.clientX);
			const distToLo = Math.abs(ratio - loRatio);
			const distToHi = Math.abs(ratio - hiRatio);
			const target = distToLo === distToHi ? ratio < loRatio ? "min" : "max" : distToLo < distToHi ? "min" : "max";
			activate(target);
			if (target === "min") onChange({
				min: ratioToVal(Math.min(ratio, hiRatio), maxCap, "min"),
				max: value.max
			});
			else {
				const clampedRatio = Math.max(ratio, loRatio);
				onChange({
					min: value.min,
					max: ratioToVal(clampedRatio, maxCap, "max")
				});
			}
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		};
		const handlePointerMove = (e) => {
			const thumb = activeThumbRef.current;
			if (!thumb) return;
			const ratio = getRatioFromPointer(e.clientX);
			if (thumb === "min") {
				const newMin = ratioToVal(Math.min(ratio, hiRatio), maxCap, "min");
				if (newMin !== value.min) onChange({
					min: newMin,
					max: value.max
				});
			} else {
				const newMax = ratioToVal(Math.max(ratio, loRatio), maxCap, "max");
				if (newMax !== value.max) onChange({
					min: value.min,
					max: newMax
				});
			}
		};
		const endDrag = (e) => {
			if (!activeThumbRef.current) return;
			try {
				e.currentTarget.releasePointerCapture(e.pointerId);
			} catch {}
			activeThumbRef.current = null;
			setActiveThumb(null);
		};
		const handleKey = (thumb, e) => {
			const key = e.key;
			if (key !== "ArrowRight" && key !== "ArrowUp" && key !== "ArrowLeft" && key !== "ArrowDown" && key !== "Home" && key !== "End") return;
			e.preventDefault();
			setLead(thumb);
			const current = thumb === "min" ? value.min : value.max;
			let next;
			if (key === "Home") next = thumb === "min" ? 0 : 1;
			else if (key === "End") next = thumb === "min" ? maxCap : 0;
			else next = stepValue(current, maxCap, thumb, key === "ArrowRight" || key === "ArrowUp" ? 1 : -1);
			if (thumb === "min") onChange({
				min: value.max > 0 ? Math.min(next, value.max) : next,
				max: value.max
			});
			else onChange({
				min: value.min,
				max: next > 0 ? Math.max(next, value.min) : 0
			});
		};
		const minText = value.min > 0 ? `${formatCount(value.min)}+` : "Any";
		const maxText = value.max > 0 ? `Up to ${formatCount(value.max)}` : "Any";
		return a$1("div", {
			class: "ghf-slider-row",
			children: [a$1("div", {
				class: "ghf-slider-header",
				children: [a$1("div", {
					class: "ghf-slider-title-group",
					children: [a$1("span", {
						class: "ghf-slider-title",
						children: [a$1(Icon, {
							name: icon,
							size: 13
						}), label]
					}), a$1("div", {
						class: "ghf-mini-chips",
						children: presets.map((p) => {
							const active = value.min === p && value.max === 0;
							return a$1("button", {
								type: "button",
								class: `ghf-mini-chip ${active ? "ghf-mini-chip-active" : ""}`,
								"aria-pressed": active,
								"aria-label": `${label} at least ${formatCount(p)}`,
								onClick: () => onChange({
									min: active ? 0 : p,
									max: 0
								}),
								children: [formatCount(p), "+"]
							}, p);
						})
					})]
				}), a$1("div", {
					class: "ghf-slider-readout-group",
					children: [a$1("span", {
						class: "ghf-readout",
						children: rangeReadout(value)
					}), filtered && a$1("button", {
						type: "button",
						class: "ghf-clear-btn",
						title: `Clear ${label}`,
						"aria-label": `Clear ${label}`,
						onClick: () => onChange({
							min: 0,
							max: 0
						}),
						children: a$1(Icon, {
							name: "x",
							size: 11
						})
					})]
				})]
			}), a$1("div", {
				ref: trackRef,
				class: "ghf-slider",
				onPointerDown: handlePointerDown,
				onPointerMove: handlePointerMove,
				onPointerUp: endDrag,
				onPointerCancel: endDrag,
				onLostPointerCapture: endDrag,
				children: [
					a$1("div", {
						class: "ghf-slider-track",
						children: filtered && a$1("div", {
							class: "ghf-slider-fill",
							style: {
								left: `${loRatio * 100}%`,
								width: `${Math.max(0, hiRatio - loRatio) * 100}%`
							}
						})
					}),
					a$1("div", {
						class: `ghf-slider-thumb ${activeThumb === "min" ? "ghf-thumb-active" : ""}`,
						style: {
							left: `${loRatio * 100}%`,
							zIndex: lead === "min" ? 4 : 2
						},
						tabIndex: 0,
						role: "slider",
						"aria-label": `Minimum ${label}`,
						"aria-orientation": "horizontal",
						"aria-valuenow": value.min,
						"aria-valuemin": 0,
						"aria-valuemax": maxCap,
						"aria-valuetext": minText,
						onKeyDown: (e) => handleKey("min", e),
						onFocus: () => setLead("min")
					}),
					a$1("div", {
						class: `ghf-slider-thumb ${activeThumb === "max" ? "ghf-thumb-active" : ""}`,
						style: {
							left: `${hiRatio * 100}%`,
							zIndex: lead === "max" ? 4 : 2
						},
						tabIndex: 0,
						role: "slider",
						"aria-label": `Maximum ${label}`,
						"aria-orientation": "horizontal",
						"aria-valuenow": value.max,
						"aria-valuemin": 0,
						"aria-valuemax": maxCap,
						"aria-valuetext": maxText,
						onKeyDown: (e) => handleKey("max", e),
						onFocus: () => setLead("max")
					})
				]
			})]
		});
	}
	function DatePicker({ label, value, onChange }) {
		const filtered = Boolean(value.from || value.to);
		const today = todayLocal();
		return a$1("div", {
			class: "ghf-slider-row",
			children: [a$1("div", {
				class: "ghf-slider-header",
				children: [a$1("div", {
					class: "ghf-slider-title-group",
					children: [a$1("span", {
						class: "ghf-slider-title",
						children: [a$1(Icon, {
							name: "calendar",
							size: 13
						}), label]
					}), a$1("div", {
						class: "ghf-mini-chips",
						children: [
							{
								label: "7d",
								days: 7
							},
							{
								label: "30d",
								days: 30
							},
							{
								label: "1y",
								days: 365
							}
						].map((p) => {
							const active = value.to === "" && value.from === shiftDays(today, -p.days);
							return a$1("button", {
								type: "button",
								class: `ghf-mini-chip ${active ? "ghf-mini-chip-active" : ""}`,
								"aria-pressed": active,
								"aria-label": `${label} in the last ${p.days} days`,
								onClick: () => onChange({
									from: shiftDays(today, -p.days),
									to: ""
								}),
								children: p.label
							}, p.days);
						})
					})]
				}), a$1("div", {
					class: "ghf-slider-readout-group",
					children: [a$1("span", {
						class: "ghf-readout",
						children: dateReadout(value)
					}), filtered && a$1("button", {
						type: "button",
						class: "ghf-clear-btn",
						title: `Clear ${label}`,
						"aria-label": `Clear ${label}`,
						onClick: () => onChange({
							from: "",
							to: ""
						}),
						children: a$1(Icon, {
							name: "x",
							size: 11
						})
					})]
				})]
			}), a$1("div", {
				class: "ghf-dates",
				children: [
					a$1("input", {
						class: "ghf-date",
						type: "date",
						value: value.from,
						max: value.to || void 0,
						"aria-label": `${label} from`,
						onInput: (e) => onChange({
							...value,
							from: e.currentTarget.value
						})
					}),
					a$1("span", {
						class: "ghf-date-sep",
						"aria-hidden": "true",
						children: "→"
					}),
					a$1("input", {
						class: "ghf-date",
						type: "date",
						value: value.to,
						min: value.from || void 0,
						"aria-label": `${label} to`,
						onInput: (e) => onChange({
							...value,
							to: e.currentTarget.value
						})
					})
				]
			})]
		});
	}
	function App() {
		const dialogRef = T(null);
		const nameRef = T(null);
		const copyTimer = T(void 0);
		const [state, setState] = d(emptyState);
		const [presets, setPresets] = d(getPresets);
		const [name, setName] = d("");
		const [error, setError] = d("");
		const [pendingDelete, setPendingDelete] = d(null);
		const [copyState, setCopyState] = d("idle");
		const [openRequest, setOpenRequest] = d(0);
		const parts = w(() => queryParts(state), [state]);
		const activeCount = w(() => countActiveFilters(state), [state]);
		const setField = (key, val) => setState((cur) => ({
			...cur,
			[key]: val
		}));
		const toggleLang = (langName) => {
			const cur = tokenize(state.lang);
			const next = cur.some((t) => t.toLowerCase() === langName.toLowerCase()) ? cur.filter((t) => t.toLowerCase() !== langName.toLowerCase()) : [...cur, langName];
			setField("lang", next.join(", "));
		};
		const savePreset = () => {
			if (!parts.length) {
				setError("Add filters first.");
				return;
			}
			const trimmed = name.trim();
			if (!trimmed) {
				setError("Name required.");
				nameRef.current?.focus();
				return;
			}
			setPresets(addPreset(trimmed, state));
			setName("");
			setError("");
		};
		const copyQuery = () => {
			const text = buildQuery(state);
			if (!text) return;
			const markResult = (result) => {
				setCopyState(result);
				window.clearTimeout(copyTimer.current);
				copyTimer.current = window.setTimeout(() => setCopyState("idle"), 1600);
			};
			if (!navigator.clipboard?.writeText) {
				markResult("failed");
				return;
			}
			navigator.clipboard.writeText(text).then(() => markResult("copied")).catch(() => markResult("failed"));
		};
		F(() => {
			panelControl = {
				toggle(next) {
					const d = dialogRef.current;
					if (!d) return;
					if (d.open) {
						d.close();
						return;
					}
					setState(next);
					setPresets(getPresets());
					setOpenRequest((r) => r + 1);
				},
				close() {
					dialogRef.current?.close();
				}
			};
			return () => {
				panelControl = null;
			};
		}, []);
		F(() => {
			if (!openRequest) return;
			const d = dialogRef.current;
			if (!d || d.open) return;
			d.showModal();
			setExpanded(true);
			if (window.innerWidth > 767) d.querySelector(".ghf-input")?.focus();
		}, [openRequest]);
		F(() => () => window.clearTimeout(copyTimer.current), []);
		const close = () => dialogRef.current?.close();
		const hideWords = tokenize(state.hide).map((w) => w.replace(/^-?"|"$/g, ""));
		return a$1("dialog", {
			id: IDS.panel,
			ref: dialogRef,
			closedby: "any",
			"aria-labelledby": "ghf-panel-title",
			onClose: () => {
				setExpanded(false);
				setPendingDelete(null);
				setCopyState("idle");
			},
			onClick: (e) => {
				const d = dialogRef.current;
				if (!d) return;
				if (e.target === d) {
					const rect = d.getBoundingClientRect();
					if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) close();
				}
			},
			onKeyDown: (e) => {
				if (e.key === "Escape" && !e.defaultPrevented) close();
			},
			children: a$1("form", {
				class: "ghf-form",
				onSubmit: (e) => {
					e.preventDefault();
					search(state);
				},
				children: [
					a$1("header", {
						class: "ghf-head",
						children: [a$1("div", {
							class: "ghf-drag-handle",
							"aria-hidden": "true"
						}), a$1("div", {
							class: "ghf-titlebar",
							children: [a$1("div", {
								class: "ghf-brand",
								children: [
									a$1("span", {
										class: "ghf-brand-icon",
										children: a$1(Icon, {
											name: "filter",
											size: 14
										})
									}),
									a$1("h2", {
										id: "ghf-panel-title",
										children: "Filter repositories"
									}),
									activeCount > 0 && a$1("span", {
										class: "ghf-pill",
										children: [activeCount, a$1("span", {
											class: "ghf-sr-only",
											children: " active filters"
										})]
									})
								]
							}), a$1("button", {
								type: "button",
								class: "ghf-icon-btn",
								title: "Close",
								"aria-label": "Close",
								onClick: close,
								children: a$1(Icon, {
									name: "x",
									size: 14
								})
							})]
						})]
					}),
					a$1("div", {
						class: "ghf-body",
						children: [
							a$1("div", {
								class: "ghf-card",
								children: [a$1("div", {
									class: "ghf-card-head",
									children: a$1("h3", {
										class: "ghf-card-title",
										children: [a$1(Icon, {
											name: "search",
											size: 13
										}), "Keywords"]
									})
								}), a$1("div", {
									class: "ghf-fields",
									children: KEYWORDS.map((k) => a$1(Field, {
										id: k.id,
										label: k.label,
										placeholder: k.placeholder,
										value: state[k.id],
										onChange: (v) => setField(k.id, v)
									}, k.id))
								})]
							}),
							a$1("div", {
								class: "ghf-card",
								children: [a$1("div", {
									class: "ghf-card-head",
									children: [a$1("h3", {
										class: "ghf-card-title",
										children: [a$1(Icon, {
											name: "code",
											size: 13
										}), "Repository & Language"]
									}), a$1("div", {
										class: "ghf-sort-wrap",
										children: [a$1("select", {
											id: "ghf-sort",
											class: "ghf-sort-select",
											"aria-label": "Sort repositories by",
											value: state.sort,
											onChange: (e) => setField("sort", e.currentTarget.value),
											children: SORTS.map((s) => a$1("option", {
												value: s.value,
												children: s.label
											}, s.value))
										}), a$1(Icon, {
											name: "chevronDown",
											size: 11
										})]
									})]
								}), a$1("div", {
									class: "ghf-fields",
									children: [a$1(Field, {
										id: "repo",
										label: "Target Repository",
										placeholder: "e.g. facebook/react",
										value: state.repo,
										onChange: (v) => setField("repo", v)
									}), a$1("div", {
										class: "ghf-field",
										children: [a$1(Field, {
											id: "lang",
											label: "Language",
											placeholder: "e.g. python, -html",
											value: state.lang,
											onChange: (v) => setField("lang", v)
										}), a$1("div", {
											class: "ghf-chips",
											children: POPULAR_LANGUAGES.map((lang) => {
												const active = tokenize(state.lang).some((t) => t.toLowerCase() === lang.toLowerCase());
												return a$1("button", {
													type: "button",
													class: `ghf-chip ${active ? "ghf-chip-active" : ""}`,
													"aria-pressed": active,
													onClick: () => toggleLang(lang),
													children: lang
												}, lang);
											})
										})]
									})]
								})]
							}),
							a$1("div", {
								class: "ghf-card",
								children: [
									a$1("div", {
										class: "ghf-card-head",
										children: a$1("h3", {
											class: "ghf-card-title",
											children: [a$1(Icon, {
												name: "star",
												size: 13
											}), "Metrics"]
										})
									}),
									a$1(SmoothSlider, {
										label: "Stars",
										icon: "star",
										maxCap: STARS_MAX,
										value: state.stars,
										presets: STAR_PRESETS,
										onChange: (v) => setField("stars", v)
									}),
									a$1(SmoothSlider, {
										label: "Forks",
										icon: "gitFork",
										maxCap: FORKS_MAX,
										value: state.forks,
										presets: FORK_PRESETS,
										onChange: (v) => setField("forks", v)
									})
								]
							}),
							a$1("div", {
								class: "ghf-card",
								children: [
									a$1("div", {
										class: "ghf-card-head",
										children: a$1("h3", {
											class: "ghf-card-title",
											children: [a$1(Icon, {
												name: "calendar",
												size: 13
											}), "Activity"]
										})
									}),
									a$1(DatePicker, {
										label: "Created",
										value: state.created,
										onChange: (v) => setField("created", v)
									}),
									a$1(DatePicker, {
										label: "Pushed",
										value: state.pushed,
										onChange: (v) => setField("pushed", v)
									})
								]
							}),
							a$1("div", {
								class: "ghf-card",
								children: [
									a$1("div", {
										class: "ghf-card-head",
										children: a$1("h3", {
											class: "ghf-card-title",
											children: [
												a$1(Icon, {
													name: "bookmark",
													size: 13
												}),
												"Presets",
												presets.length > 0 && a$1("span", {
													class: "ghf-pill",
													children: presets.length
												})
											]
										})
									}),
									presets.length > 0 && a$1("div", {
										class: "ghf-preset-chips",
										children: presets.map((p) => a$1("div", {
											class: "ghf-preset-chip-item",
											children: [
												a$1("button", {
													type: "button",
													class: "ghf-preset-apply-btn",
													title: `Load: ${buildQuery(p.state) || "All repos"}`,
													"aria-label": `Load preset ${p.name}`,
													onClick: () => setState(p.state),
													children: a$1("span", {
														class: "ghf-preset-chip-name",
														children: p.name
													})
												}),
												a$1("button", {
													type: "button",
													class: "ghf-preset-run-btn",
													title: "Run search",
													"aria-label": `Run preset ${p.name}`,
													onClick: () => search(p.state),
													children: a$1(Icon, {
														name: "arrowRight",
														size: 10
													})
												}),
												a$1("button", {
													type: "button",
													class: "ghf-preset-del-btn",
													title: pendingDelete === p.id ? "Confirm delete" : "Delete preset",
													"aria-label": pendingDelete === p.id ? `Confirm delete preset ${p.name}` : `Delete preset ${p.name}`,
													onClick: () => {
														if (pendingDelete === p.id) {
															setPresets(removePreset(p.id));
															setPendingDelete(null);
														} else setPendingDelete(p.id);
													},
													children: pendingDelete === p.id ? a$1("span", {
														class: "ghf-del-confirm",
														children: "del?"
													}) : a$1(Icon, {
														name: "x",
														size: 10
													})
												})
											]
										}, p.id))
									}),
									a$1("div", {
										class: "ghf-preset-save-row",
										children: [a$1("div", {
											class: "ghf-input-wrap",
											children: a$1("input", {
												ref: nameRef,
												class: "ghf-input",
												type: "text",
												placeholder: "Save current filters as preset...",
												maxLength: 60,
												value: name,
												onInput: (e) => {
													setName(e.currentTarget.value);
													setError("");
												},
												onKeyDown: (e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														savePreset();
													}
												}
											})
										}), a$1("button", {
											type: "button",
											class: "ghf-btn ghf-btn-primary",
											disabled: !parts.length || !name.trim(),
											onClick: savePreset,
											children: "Save"
										})]
									}),
									error && a$1("p", {
										class: "ghf-error-msg",
										role: "alert",
										children: error
									})
								]
							})
						]
					}),
					a$1("footer", {
						class: "ghf-foot",
						children: [
							a$1("div", {
								class: "ghf-tape-box",
								children: [
									a$1("div", {
										class: "ghf-tape-head",
										children: [a$1("span", {
											class: "ghf-tape-label",
											children: "Live Query"
										}), a$1("button", {
											type: "button",
											class: "ghf-btn ghf-tape-copy",
											disabled: !parts.length,
											onClick: copyQuery,
											children: [a$1(Icon, {
												name: copyState === "copied" ? "check" : "copy",
												size: 10
											}), copyState === "copied" ? "Copied" : copyState === "failed" ? "Failed" : "Copy"]
										})]
									}),
									a$1("div", {
										class: "ghf-tape-chips",
										children: parts.length ? parts.map((p, i) => {
											const colon = p.text.indexOf(":");
											return a$1("span", {
												class: "ghf-tape-chip",
												children: [colon !== -1 && p.kind === "qualifier" ? a$1($, { children: [a$1("span", {
													class: "ghf-tape-chip-key",
													children: p.text.slice(0, colon + 1)
												}), a$1("span", { children: p.text.slice(colon + 1) })] }) : a$1("span", { children: p.text }), a$1("button", {
													type: "button",
													class: "ghf-tape-chip-x",
													"aria-label": `Remove ${p.text}`,
													onClick: () => setState((cur) => removeQueryPart(cur, p)),
													children: a$1(Icon, {
														name: "x",
														size: 9
													})
												})]
											}, `${i}:${p.text}`);
										}) : a$1("span", {
											class: "ghf-tape-empty",
											children: "No active filters"
										})
									}),
									hideWords.length > 0 && a$1("div", {
										class: "ghf-tape-hide",
										children: [a$1(Icon, {
											name: "filter",
											size: 11
										}), a$1("span", { children: ["Hiding ", a$1("b", { children: hideWords.join(", ") })] })]
									})
								]
							}),
							a$1("span", {
								class: "ghf-sr-only",
								role: "status",
								"aria-live": "polite",
								children: copyState === "copied" ? "Query copied" : copyState === "failed" ? "Copy failed" : ""
							}),
							a$1("div", {
								class: "ghf-actions",
								children: [a$1("button", {
									type: "button",
									class: "ghf-btn",
									disabled: activeCount === 0,
									onClick: () => setState(emptyState()),
									children: "Reset"
								}), a$1("button", {
									type: "submit",
									class: "ghf-btn ghf-btn-primary",
									children: ["Search ", a$1(Icon, {
										name: "arrowRight",
										size: 12
									})]
								})]
							})
						]
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
			Q(a$1(App, {}), host);
		}
		if (!host.isConnected) document.body.append(host);
	}
	function openPanel() {
		syncLauncher(openPanel);
		mount();
		const initial = isSearchPath(location.pathname) ? parseUrl(location.search) : emptyState();
		panelControl?.toggle(initial);
	}
	var safe = (step) => {
		try {
			step();
		} catch {}
	};
	var refreshLauncher = () => safe(() => syncLauncher(openPanel));
	var init = () => {
		safe(migrateLegacyStorage);
		safe(injectStyles);
		refreshLauncher();
		safe(watchResults);
	};
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
	else init();
	var recheck = () => requestAnimationFrame(refreshLauncher);
	for (const event of NAV_EVENTS) document.addEventListener(event, recheck);
	window.addEventListener("popstate", recheck);
	window.addEventListener("pageshow", recheck);
	if (typeof GM_registerMenuCommand === "function") GM_registerMenuCommand(NAME, openPanel);
})();
