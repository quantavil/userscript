// ==UserScript==
// @name         Universal Captcha Solver
// @namespace    https://github.com/quantavil/userscript
// @version      2.1.0
// @description  Solve text, math and image-grid captchas on any site using AI vision models
// @author       quantavil
// @license      MIT
// @homepageURL  https://github.com/quantavil/userscript/tree/main/universal-solver
// @downloadURL  https://github.com/quantavil/userscript/raw/main/universal-solver/dist/universal-solver.user.js
// @updateURL    https://github.com/quantavil/userscript/raw/main/universal-solver/dist/universal-solver.user.js
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// @connect      generativelanguage.googleapis.com
// @connect      api.groq.com
// @connect      openrouter.ai
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==

(() => {
  // node_modules/preact/dist/preact.mjs
  var n;
  var t;
  var i;
  var r;
  var u;
  var f;
  var o;
  var e;
  var l;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v = {};
  var y = [];
  var w = /^m(i|n|o|s|text|space)$/;
  var d = Array.isArray;
  var _ = y.slice;
  var g = Object.assign;
  function b(n2) {
    n2 && n2.parentNode && n2.remove();
  }
  function M(i2, r2, u2, f2, o2) {
    var e2 = { type: i2, props: r2, key: u2, ref: f2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: o2 || ++t, __i: -1, __u: 0 };
    return !o2 && n.vnode && n.vnode(e2), e2;
  }
  function x(n2) {
    return n2.children;
  }
  function S(n2, t2) {
    this.props = n2, this.context = t2, this.__g = 0;
  }
  function C(n2, t2) {
    if (t2 == null)
      return n2.__ ? C(n2.__, n2.__i + 1) : null;
    for (var i2;t2 < n2.__k.length; t2++)
      if ((i2 = n2.__k[t2]) && i2.__e)
        return i2.__e;
    return typeof n2.type != "function" || n2.props.__P ? null : C(n2);
  }
  function j(n2) {
    if ((n2 = n2.__) && n2.__c && !n2.props.__P)
      return n2.__e = null, n2.__k.some(function(t2) {
        return t2 && (n2.__e = t2.__e);
      }), j(n2);
  }
  function L(t2) {
    (8 & t2.__g || !(t2.__g |= 8) || !r.push(t2) || f++) && u == n.debounceRendering || ((u = n.debounceRendering) || queueMicrotask)(H);
  }
  function H() {
    var t2, i2, u2, e2, l2, c2, a2, s2, h2;
    try {
      for (i2 = 1;r.length; )
        r.length > i2 && r.sort(o), t2 = r.shift(), i2 = r.length, 8 & t2.__g && (e2 = undefined, l2 = undefined, c2 = (l2 = (u2 = t2).__v).__e, a2 = [], s2 = [], (h2 = u2.__P) && ((e2 = g({ constructor: undefined }, l2)).__v = l2.__v + 1, n.vnode && n.vnode(e2), z(h2, e2, l2, u2.__n, h2.namespaceURI, 32 & l2.__u ? [c2] : null, a2, c2 || C(l2), 32 & l2.__u, s2), e2.__v = l2.__v, e2.__.__k[e2.__i] = e2, D(a2, e2, s2), l2.__ = l2.__e = null, e2.__e != c2 && j(e2)));
    } finally {
      r.length = f = 0;
    }
  }
  function I(n2, t2, i2, r2, u2, f2, o2, e2, l2, c2, a2) {
    var s2, h2, p2, w2, d2, _2, g2 = r2.__k || y, b2 = t2.length;
    for (l2 = A(i2, t2, g2, l2, b2), s2 = 0;s2 < b2; s2++)
      (p2 = i2.__k[s2]) != null && (h2 = ~p2.__i && g2[p2.__i] || v, p2.__i = s2, _2 = z(n2, p2, h2, u2, f2, o2, e2, l2, c2, a2), w2 = p2.__e, p2.ref && (h2.ref != p2.ref || 8 & h2.__u) && (h2.ref != p2.ref && h2.ref && F(h2.ref, null, p2), a2.push(p2.ref, p2.__c || w2, p2)), d2 = d2 || w2, 4 & p2.__u ? (l2 = O(p2, l2, n2, !h2.__v), h2.__e && (h2.__e = null)) : typeof p2.type == "function" && _2 !== undefined ? l2 = _2 : w2 && (l2 = w2.nextSibling), p2.__u &= -7);
    return i2.__e = d2, l2;
  }
  function A(n2, t2, i2, r2, u2) {
    var f2, o2, e2, l2, c2, a2, s2, h2, p2, v2, y2 = i2.length, w2 = y2, _2 = 0, g2 = false, b2 = n2.__k = Array(u2);
    for (f2 = 0;f2 < u2; f2++)
      (o2 = t2[f2]) != null && typeof o2 != "boolean" && typeof o2 != "function" ? (typeof o2 != "object" || o2.constructor == String ? o2 = b2[f2] = M(null, o2) : d(o2) ? o2 = b2[f2] = M(x, { children: o2 }) : o2.constructor === undefined && o2.__b ? o2 = b2[f2] = M(o2.type, o2.props, o2.key, o2.ref, o2.__v) : b2[f2] = o2, l2 = f2 + _2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, ~(c2 = o2.__i = T(o2, i2, l2, w2)) && (w2--, (e2 = i2[c2]) && (e2.__u |= 2)), e2 && e2.__v ? (o2.__u |= 2, c2 == l2 - 1 ? _2-- : c2 == l2 + 1 ? _2++ : c2 != l2 && (c2 > l2 ? _2-- : _2++, g2 = true)) : (~c2 || (u2 > y2 ? _2-- : u2 < y2 && _2++), typeof o2.type != "function" && (o2.__u |= 4))) : b2[f2] = null;
    if (g2) {
      for (a2 = [], s2 = [], f2 = 0;f2 < u2; f2++)
        if ((o2 = b2[f2]) && 2 & o2.__u) {
          for (h2 = 0, p2 = a2.length;h2 < p2; )
            a2[v2 = h2 + p2 >> 1] < o2.__i ? h2 = v2 + 1 : p2 = v2;
          a2[h2] = o2.__i, s2[f2] = h2 + 1;
        }
      for (_2 = a2.length;f2--; )
        s2[f2] && (s2[f2] == _2 ? _2-- : b2[f2].__u |= 4);
    }
    if (w2)
      for (f2 = 0;f2 < y2; f2++)
        !(e2 = i2[f2]) || 2 & e2.__u || (e2.__e == r2 && (r2 = C(e2)), G(e2, e2));
    return r2;
  }
  function O(n2, t2, i2, r2) {
    var u2, f2;
    if (typeof n2.type == "function") {
      if (n2.props.__P)
        return t2;
      if (u2 = n2.__k)
        for (f2 = 0;f2 < u2.length; f2++)
          u2[f2] && (u2[f2].__ = n2, t2 = O(u2[f2], t2, i2, false));
      return t2;
    }
    for (t2 && !t2.parentNode && (t2 = C(n2)) && !t2.parentNode && (t2 = null), n2.__e != t2 && (!r2 && i2.moveBefore && n2.__e.parentNode ? i2.moveBefore(n2.__e, t2) : i2.insertBefore(n2.__e, t2 || null)), t2 = n2.__e;(t2 = t2 && t2.nextSibling) && t2.nodeType == 8; )
      ;
    return t2;
  }
  function T(n2, t2, i2, r2) {
    var u2, f2, o2, e2 = n2.key, l2 = n2.type, c2 = t2[i2], a2 = c2 && !(2 & c2.__u);
    if (c2 === null && e2 == null || a2 && e2 == c2.key && l2 == c2.type)
      return i2;
    if (r2 > (a2 ? 1 : 0)) {
      for (u2 = i2 - 1, f2 = i2 + 1;u2 >= 0 || f2 < t2.length; )
        if ((c2 = t2[o2 = u2 >= 0 ? u2-- : f2++]) && !(2 & c2.__u) && e2 == c2.key && l2 == c2.type)
          return o2;
    }
    return -1;
  }
  function q(n2, t2, i2) {
    i2 == null && (i2 = ""), t2[0] == "-" ? n2.setProperty(t2, i2) : n2[t2] = i2;
  }
  function N(n2, t2, i2, r2, u2) {
    var f2;
    n:
      if (t2 == "style")
        if (typeof i2 == "string")
          n2.style.cssText = i2;
        else {
          if (typeof r2 == "string" && (n2.style.cssText = r2 = ""), r2)
            for (t2 in r2)
              i2 && t2 in i2 || q(n2.style, t2, "");
          if (i2)
            for (t2 in i2)
              r2 && i2[t2] == r2[t2] || q(n2.style, t2, i2[t2]);
        }
      else if (t2[0] == "o" && t2[1] == "n")
        f2 = t2 != (t2 = t2.replace(c, "$1")), (t2 = t2.slice(2))[0] < "a" && (t2 = t2.toLowerCase()), (n2.__e || (n2.__e = {}))[t2 + f2] = i2, i2 ? r2 ? i2[l] = r2[l] : (i2[l] = a, n2.addEventListener(t2, f2 ? h : s, f2)) : n2.removeEventListener(t2, f2 ? h : s, f2);
      else {
        if (u2 == "http://www.w3.org/2000/svg")
          t2 = t2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if (t2 != "width" && t2 != "height" && t2 != "href" && t2 != "list" && t2 != "form" && t2 != "tabIndex" && t2 != "download" && t2 != "rowSpan" && t2 != "colSpan" && t2 != "role" && t2 != "popover" && t2 in n2)
          try {
            n2[t2] = i2 == null ? "" : i2;
            break n;
          } catch (n3) {}
        typeof i2 == "function" || (i2 == null || i2 === false && t2[4] != "-" ? n2.removeAttribute(t2) : n2.setAttribute(t2, t2 == "popover" && i2 == 1 ? "" : i2));
      }
  }
  function V(t2) {
    return function(i2) {
      if (this.__e) {
        var r2 = this.__e[i2.type + t2];
        if (i2[e] == null)
          i2[e] = a++;
        else if (i2[e] < r2[l])
          return;
        return r2(n.event ? n.event(i2) : i2);
      }
    };
  }
  function z(t2, i2, r2, u2, f2, o2, e2, l2, c2, a2) {
    var s2, h2, p2, v2, w2, _2, k, m, M2, $, j2, L2, H2, A2, O2, P, T2, q2, N2, V2, z2 = i2.type;
    if (i2.constructor !== undefined)
      return null;
    if (128 & r2.__u && (c2 = 32 & r2.__u, s2 = r2.__c.__z)) {
      if (i2.__u |= c2, h2 = o2 = [], s2.nodeType == 8)
        for (p2 = 1, v2 = s2.nextSibling;v2; v2 = v2.nextSibling) {
          if (v2.nodeType == 8) {
            if (v2.data.startsWith("$s"))
              p2++;
            else if (v2.data.startsWith("/$s") && !--p2)
              break;
          }
          o2.push(v2);
        }
      else
        o2.push(s2);
      l2 = o2[0];
    }
    (s2 = n.__b) && s2(i2);
    n:
      if (typeof z2 == "function") {
        w2 = e2.length;
        try {
          if ($ = i2.props, j2 = (s2 = z2.prototype) && s2.render, L2 = (s2 = z2.contextType) && u2[s2.__c], H2 = s2 ? L2 ? L2.props.value : s2.__ : u2, r2.__c ? 2 & (_2 = i2.__c = r2.__c).__g && (_2.__g |= 1) : (j2 ? i2.__c = _2 = new z2($, H2) : (i2.__c = _2 = new S($, H2), _2.constructor = z2, _2.render = J), L2 && L2.sub(_2), _2.state || (_2.state = {}), _2.__n = u2, _2.__g |= 8, _2.__h = [], _2.__k = []), j2 && (_2.__s || (_2.__s = _2.state), z2.getDerivedStateFromProps && (_2.__s == _2.state && (_2.__s = g({}, _2.__s)), g(_2.__s, z2.getDerivedStateFromProps($, _2.__s)))), k = _2.props, m = _2.state, _2.__v = i2, r2.__c) {
            if (j2 && !z2.getDerivedStateFromProps && $ !== k && _2.componentWillReceiveProps && _2.componentWillReceiveProps($, H2), i2.__v == r2.__v && !(8 & _2.__g) || !(4 & _2.__g) && _2.shouldComponentUpdate && _2.shouldComponentUpdate($, _2.__s, H2) === false) {
              i2.__v != r2.__v && (_2.props = $, _2.state = _2.__s, _2.__g &= -9), i2.__e = r2.__e, i2.__k = r2.__k, i2.__k.some(function(n2) {
                n2 && (n2.__ = i2);
              }), y.push.apply(_2.__h, _2.__k), _2.__k = [], _2.__h.length && e2.push(_2), l2 = C(r2);
              break n;
            }
            _2.componentWillUpdate && _2.componentWillUpdate($, _2.__s, H2), j2 && _2.componentDidUpdate && _2.__h.push(function() {
              _2.componentDidUpdate(k, m, M2);
            });
          } else
            j2 && !z2.getDerivedStateFromProps && _2.componentWillMount && _2.componentWillMount(), j2 && _2.componentDidMount && _2.__h.push(_2.componentDidMount);
          if (_2.context = H2, _2.props = $, _2.__P = t2, _2.__g &= -5, A2 = n.__r, O2 = 0, j2)
            _2.state = _2.__s, _2.__g &= -9, A2 && A2(i2), s2 = _2.render(_2.props, _2.state, _2.context), y.push.apply(_2.__h, _2.__k), _2.__k = [];
          else
            do {
              _2.__g &= -9, A2 && A2(i2), s2 = _2.render(_2.props, _2.state, _2.context), _2.state = _2.__s;
            } while (8 & _2.__g && ++O2 < 25);
          _2.state = _2.__s, _2.getChildContext && (u2 = g({}, u2, _2.getChildContext())), j2 && r2.__c && _2.getSnapshotBeforeUpdate && (M2 = _2.getSnapshotBeforeUpdate(k, m)), P = s2 && s2.type === x && s2.key == null ? s2.props.children : s2, $.__P && (s2 = l2, f2 = (t2 = $.__P).namespaceURI, c2 = o2 = null, r2.props && r2.props.__P != t2 && (r2.__k.some(function(n2) {
            n2 && G(n2, n2);
          }), r2.__k = null), l2 = r2.__k ? C(r2, 0) : null), l2 = I(t2, d(P) ? P : [P], i2, r2, u2, f2, o2, e2, l2, c2, a2), $.__P && (i2.__e = null, l2 = s2), i2.__u &= -161, 128 & r2.__u && (_2.__z = null), h2 && h2.some(b), _2.__h.length && e2.push(_2), 1 & _2.__g && (_2.__g &= -4);
        } catch (t3) {
          if (e2.length = w2, i2.__v = null, c2 || o2)
            if (t3.then) {
              if (T2 = 0, i2.__u |= c2 ? 160 : 128, o2) {
                for (N2 = 0;N2 < o2.length; N2++)
                  if (V2 = o2[N2])
                    if (V2.nodeType == 8) {
                      if (o2[N2] = null, V2.data.startsWith("$s"))
                        T2++ || (q2 = V2);
                      else if (V2.data.startsWith("/$s") && !--T2) {
                        l2 = V2;
                        break;
                      }
                    } else
                      T2 && (o2[N2] = null);
              }
              if (!q2) {
                for (;l2 && l2.nodeType == 8 && l2.nextSibling; )
                  l2 = l2.nextSibling;
                o2 && (o2[o2.indexOf(l2)] = null), q2 = l2;
              }
              i2.__c.__z || (i2.__c.__z = q2), i2.__e = l2;
            } else
              o2 && o2.some(b);
          else
            i2.__e = r2.__e;
          i2.__k || (i2.__k = r2.__k || []), t3.then || B(i2), n.__e(t3, i2, r2);
        }
      } else
        l2 = i2.__e = E(r2.__e, i2, r2, u2, f2, o2, e2, c2, a2, t2);
    return (s2 = n.diffed) && s2(i2), 128 & i2.__u ? undefined : l2;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__g |= 4), n2.__k && n2.__k.some(B));
  }
  function D(t2, i2, r2) {
    for (var u2 = 0;u2 < r2.length; )
      F(r2[u2++], r2[u2++], r2[u2++]);
    n.__c && n.__c(i2, t2), t2.some(function(i3) {
      try {
        t2 = i3.__h, i3.__h = [], t2.some(function(n2) {
          n2.call(i3);
        });
      } catch (t3) {
        n.__e(t3, i3.__v);
      }
    });
  }
  function E(t2, i2, r2, u2, f2, o2, e2, l2, c2, a2) {
    var s2, h2, p2, y2, g2, k, m, M2, $, x2 = r2.props || v, S2 = i2.props, j2 = i2.type;
    if (j2 == "svg" ? f2 = "http://www.w3.org/2000/svg" : j2 == "math" ? f2 = "http://www.w3.org/1998/Math/MathML" : f2 || (f2 = "http://www.w3.org/1999/xhtml"), o2) {
      for (s2 = 0;s2 < o2.length; s2++)
        if ((g2 = o2[s2]) && (j2 ? g2.localName == j2 : g2.nodeType == 3)) {
          t2 = g2, o2[s2] = null;
          break;
        }
    }
    if (!t2) {
      if (M2 = a2.ownerDocument || document, !j2)
        return M2.createTextNode(S2);
      t2 = M2.createElementNS(f2, j2, S2.is && S2), l2 && (n.__m && n.__m(i2, o2), l2 = false), o2 = null;
    }
    if (j2) {
      if (a2 = j2 == "template" ? t2.content : t2, o2 = j2 == "textarea" && S2.defaultValue != null ? null : o2 && _.call(a2.childNodes), !l2 && o2)
        for (x2 = {}, s2 = 0;s2 < t2.attributes.length; s2++)
          x2[(g2 = t2.attributes[s2]).name] = g2.value;
      for (s2 in x2)
        g2 = x2[s2], s2 == "dangerouslySetInnerHTML" ? p2 = g2 : s2 == "children" || (s2 in S2) || s2 == "value" && ("defaultValue" in S2) || s2 == "checked" && ("defaultChecked" in S2) || N(t2, s2, null, g2, f2);
      for (s2 in $ = 1 & r2.__u, S2)
        g2 = S2[s2], s2 == "children" ? y2 = g2 : s2 == "dangerouslySetInnerHTML" ? h2 = g2 : s2 == "value" ? k = g2 : s2 == "checked" ? m = g2 : l2 && typeof g2 != "function" || !(x2[s2] !== g2 || $ && g2 != null) || N(t2, s2, g2, x2[s2], f2);
      h2 ? (l2 || p2 && (h2.__html == p2.__html || h2.__html == t2.innerHTML) || (t2.innerHTML = h2.__html), i2.__k = []) : (p2 && (t2.textContent = ""), (j2 == "foreignObject" || f2 == "http://www.w3.org/1998/Math/MathML" && w.test(j2)) && (f2 = "http://www.w3.org/1999/xhtml"), I(a2, d(y2) ? y2 : [y2], i2, r2, u2, f2, o2, e2, o2 ? o2[0] : r2.__k && C(r2, 0), l2, c2), o2 && o2.some(b)), l2 && j2 != "textarea" || (s2 = "value", j2 == "progress" && k == null ? t2.removeAttribute(s2) : k == null || k === t2[s2] && (j2 != "progress" || k) || N(t2, s2, k, x2[s2], f2), s2 = "checked", m != null && m != t2[s2] && N(t2, s2, m, x2[s2], f2));
    } else
      x2 === S2 || l2 && t2.data == S2 || (t2.data = S2);
    return t2;
  }
  function F(t2, i2, r2) {
    try {
      typeof t2 == "function" ? (typeof t2.__u == "function" && t2.__u(), (typeof t2.__u != "function" || i2) && (t2.__u = t2(i2))) : t2.current = i2;
    } catch (t3) {
      n.__e(t3, r2);
    }
  }
  function G(t2, i2, r2) {
    var u2, f2;
    if (n.unmount && n.unmount(t2), !(u2 = t2.ref) || u2.current && u2.current != t2.__e || F(u2, null, i2), u2 = t2.__c) {
      if (u2.componentWillUnmount)
        try {
          u2.componentWillUnmount();
        } catch (t3) {
          n.__e(t3, i2);
        }
      u2.__P = u2.__n = null;
    }
    if (u2 = t2.__k)
      for (f2 = 0;f2 < u2.length; f2++)
        u2[f2] && G(u2[f2], i2, typeof t2.type != "function" || r2 && !t2.props.__P);
    (u2 = t2.__e) && (r2 || b(u2), u2.__e && (u2.__e = null)), t2.__e = t2.__c = t2.__ = null;
  }
  function J(n2, t2, i2) {
    return this.constructor(n2, i2);
  }
  function K(t2, i2) {
    var r2, u2, f2, o2;
    n.__ && n.__(t2, i2), i2.nodeType == 9 && (i2 = i2.documentElement), u2 = (r2 = t2 && 32 & t2.__u) ? null : i2.__k, i2.__k = M(x, { children: [t2] }), f2 = [], o2 = [], z(i2, i2.__k, u2 || v, v, i2.namespaceURI, u2 ? null : i2.firstChild ? _.call(i2.childNodes) : null, f2, u2 ? u2.__e : i2.firstChild, r2, o2), D(f2, i2.__k, o2), i2.__k.props.children = null;
  }
  n = { __e: function(n2, t2, i2, r2) {
    for (var u2, o2, e2;t2 = t2.__; )
      if ((u2 = t2.__c) && !(1 & u2.__g)) {
        u2.__g |= 4;
        try {
          if ((o2 = u2.constructor) && o2.getDerivedStateFromError && (u2.setState(o2.getDerivedStateFromError(n2)), e2 = 8 & u2.__g), u2.componentDidCatch && (u2.componentDidCatch(n2, r2 || {}), e2 = 8 & u2.__g), e2)
            return void (u2.__g |= 2);
        } catch (t3) {
          n2 = t3, e2 = 0;
        }
      }
    throw f = 0, n2;
  } }, t = 0, i = function(n2) {
    return n2 != null && n2.constructor === undefined;
  }, S.prototype.setState = function(n2, t2) {
    var i2 = this.__s;
    i2 && i2 != this.state || (i2 = this.__s = g({}, this.state)), typeof n2 == "function" && (n2 = n2(g({}, i2), this.props)), n2 && (g(i2, n2), this.__v && (t2 && this.__k.push(t2), L(this)));
  }, S.prototype.forceUpdate = function(n2) {
    this.__v && (this.__g |= 4, n2 && this.__h.push(n2), L(this));
  }, S.prototype.render = x, r = [], f = 0, o = function(n2, t2) {
    return n2.__v.__b - t2.__v.__b;
  }, e = Symbol(), l = Symbol(), c = /(PointerCapture)$|Capture$/i, a = 0, s = V(false), h = V(true), p = 0;

  // node_modules/preact/hooks/dist/hooks.mjs
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = Object.is;
  var f2 = 0;
  var c2 = [];
  var e2 = [];
  var a2 = n;
  var v2 = a2.__b;
  var l2 = a2.__r;
  var m = a2.diffed;
  var s2 = a2.__c;
  var h2 = a2.unmount;
  var p2 = a2.__;
  function y2(n2, t3) {
    a2.__h && a2.__h(r2, n2, f2 || t3), f2 = 0;
    var u3 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u3.__.length && u3.__.push({}), u3.__[n2];
  }
  function A2(n2, u3) {
    var i3 = y2(t2++, 3);
    !a2.__s && E2(i3.__H, u3) && (i3.__P = true, i3.__ = n2, i3.u = u3, r2.__H.__h.push(i3));
  }
  function T2(n2) {
    return f2 = 5, b2(function() {
      return { current: n2 };
    }, []);
  }
  function b2(n2, r3) {
    var u3 = y2(t2++, 7);
    return E2(u3.__H, r3) && (u3.__ = n2(), u3.__H = r3), u3.__;
  }
  function g2() {
    var n2;
    do {
      for (;n2 = e2.shift(); )
        try {
          C2(n2);
        } catch (t4) {
          a2.__e(t4, { __: (n2 = n2.__P) && n2.__v });
        }
      for (;n2 = c2.shift(); ) {
        var t3 = n2.__H;
        if (n2.__P && t3)
          try {
            t3.__h.some(C2), t3.__h.some(D2), t3.__h = [];
          } catch (r3) {
            t3.__h = [], a2.__e(r3, n2.__v);
          }
      }
    } while (e2.length);
  }
  a2.__b = function(n2) {
    r2 = null, v2 && v2(n2);
  }, a2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
  }, a2.__r = function(n2) {
    l2 && l2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 == r2 ? r2.__h = [] : (i3.__h.some(C2), i3.__h.some(D2), t2 = 0), i3.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = undefined;
    })), u2 = r2;
  }, a2.diffed = function(n2) {
    m && m(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && B2(c2.push(t3)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u);
    })), u2 = r2 = null;
  }, a2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(C2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || D2(n4);
        });
      } catch (r3) {
        t3.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t3 = [], a2.__e(r3, n3.__v);
      }
    }), s2 && s2(n2, t3);
  }, a2.unmount = function(n2) {
    h2 && h2(n2);
    var t3, r3, u3 = n2.__c;
    u3 && u3.__H && (u3.__H.__.some(function(u4) {
      try {
        if (u4.__P && u4.__c) {
          if (r3 === undefined) {
            for (r3 = n2.__;r3 && (!r3.__c || !r3.__c.__P); )
              r3 = r3.__;
            r3 = r3 && r3.__c;
          }
          u4.__P = r3, B2(e2.push(u4));
        } else
          C2(u4);
      } catch (n3) {
        t3 = n3;
      }
    }), u3.__H = undefined, t3 && a2.__e(t3, u3.__v));
  };
  var k = typeof requestAnimationFrame == "function";
  function z2(n2) {
    var t3, r3 = function() {
      clearTimeout(u3), k && cancelAnimationFrame(t3), setTimeout(n2);
    }, u3 = setTimeout(r3, 35);
    k && (t3 = requestAnimationFrame(r3));
  }
  function B2(n2) {
    n2 != 1 && i2 == a2.requestAnimationFrame || ((i2 = a2.requestAnimationFrame) || z2)(g2);
  }
  function C2(n2) {
    var t3 = r2, u3 = n2.__c;
    typeof u3 == "function" && (n2.__c = undefined, u3()), r2 = t3;
  }
  function D2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function E2(n2, t3) {
    return !n2 || n2.length != t3.length || t3.some(function(t4, r3) {
      return !o2(t4, n2[r3]);
    });
  }

  // node_modules/@preact/signals-core/dist/signals-core.module.js
  var i3 = Symbol.for("preact-signals");
  function t3() {
    if (!(v3 > 1)) {
      var i4, t4 = false;
      (function() {
        var i5 = c3;
        c3 = undefined;
        while (i5 !== undefined) {
          var t5 = i5.S;
          if (t5.v === i5.v) {
            for (var n3 = t5.t;n3 !== undefined; n3 = n3.x)
              if (n3.i === i5.i)
                n3.i = t5.i;
          }
          i5 = i5.o;
        }
      })();
      while (h3 !== undefined) {
        var n2 = h3;
        h3 = undefined;
        s3++;
        while (n2 !== undefined) {
          var r3 = n2.u;
          n2.u = undefined;
          n2.f &= -3;
          if (!(8 & n2.f) && w2(n2))
            try {
              n2.c();
            } catch (n3) {
              if (!t4) {
                i4 = n3;
                t4 = true;
              }
            }
          n2 = r3;
        }
      }
      s3 = 0;
      v3--;
      if (t4)
        throw i4;
    } else
      v3--;
  }
  function n2(i4) {
    if (v3 > 0)
      return i4();
    e3 = ++u3;
    v3++;
    try {
      return i4();
    } finally {
      t3();
    }
  }
  var r3;
  var o3 = undefined;
  function f3(i4) {
    var t4 = o3, n3 = r3;
    o3 = undefined;
    r3 = undefined;
    try {
      return i4();
    } finally {
      o3 = t4;
      r3 = n3;
    }
  }
  var h3 = undefined;
  var v3 = 0;
  var s3 = 0;
  var u3 = 0;
  var e3 = 0;
  var c3 = undefined;
  var d2 = 0;
  function a3(i4) {
    if (o3 !== undefined) {
      var t4 = i4.n;
      if (t4 === undefined || t4.t !== o3) {
        t4 = { i: 0, S: i4, p: o3.s, n: undefined, t: o3, e: undefined, x: undefined, r: t4 };
        if (o3.s !== undefined)
          o3.s.n = t4;
        o3.s = t4;
        i4.n = t4;
        if (32 & o3.f)
          i4.S(t4);
        return t4;
      } else if (t4.i === -1) {
        t4.i = 0;
        if (t4.n !== undefined) {
          t4.n.p = t4.p;
          if (t4.p !== undefined)
            t4.p.n = t4.n;
          t4.p = o3.s;
          t4.n = undefined;
          o3.s.n = t4;
          o3.s = t4;
        }
        return t4;
      }
    }
  }
  function l3(i4, t4) {
    this.v = i4;
    this.i = 0;
    this.n = undefined;
    this.t = undefined;
    this.l = 0;
    this.W = t4 == null ? undefined : t4.watched;
    this.Z = t4 == null ? undefined : t4.unwatched;
    this.name = t4 == null ? undefined : t4.name;
  }
  l3.prototype.brand = i3;
  l3.prototype.h = function() {
    return true;
  };
  l3.prototype.S = function(i4) {
    var t4 = this, n3 = this.t;
    if (n3 !== i4 && i4.e === undefined) {
      i4.x = n3;
      this.t = i4;
      if (n3 !== undefined)
        n3.e = i4;
      else
        f3(function() {
          var i5;
          (i5 = t4.W) == null || i5.call(t4);
        });
    }
  };
  l3.prototype.U = function(i4) {
    var t4 = this;
    if (this.t !== undefined) {
      var { e: n3, x: r4 } = i4;
      if (n3 !== undefined) {
        n3.x = r4;
        i4.e = undefined;
      }
      if (r4 !== undefined) {
        r4.e = n3;
        i4.x = undefined;
      }
      if (i4 === this.t) {
        this.t = r4;
        if (r4 === undefined)
          f3(function() {
            var i5;
            (i5 = t4.Z) == null || i5.call(t4);
          });
      }
    }
  };
  l3.prototype.subscribe = function(i4) {
    var t4 = this;
    return j2(function() {
      var n3 = t4.value;
      f3(function() {
        return i4(n3);
      });
    }, { name: "sub" });
  };
  l3.prototype.valueOf = function() {
    return this.value;
  };
  l3.prototype.toString = function() {
    return this.value + "";
  };
  l3.prototype.toJSON = function() {
    return this.value;
  };
  l3.prototype.peek = function() {
    var i4 = this;
    return f3(function() {
      return i4.value;
    });
  };
  Object.defineProperty(l3.prototype, "value", { get: function() {
    var i4 = a3(this);
    if (i4 !== undefined)
      i4.i = this.i;
    return this.v;
  }, set: function(i4) {
    if (i4 !== this.v) {
      if (s3 > 100)
        throw new Error("Cycle detected");
      (function(i5) {
        if (v3 !== 0 && s3 === 0) {
          if (i5.l !== e3) {
            i5.l = e3;
            c3 = { S: i5, v: i5.v, i: i5.i, o: c3 };
          }
        }
      })(this);
      this.v = i4;
      this.i++;
      d2++;
      v3++;
      try {
        for (var n3 = this.t;n3 !== undefined; n3 = n3.x)
          n3.t.N();
      } finally {
        t3();
      }
    }
  } });
  function y3(i4, t4) {
    return new l3(i4, t4);
  }
  function w2(i4) {
    for (var t4 = i4.s;t4 !== undefined; t4 = t4.n)
      if (t4.S.i !== t4.i || !t4.S.h() || t4.S.i !== t4.i)
        return true;
    return false;
  }
  function _2(i4) {
    for (var t4 = i4.s;t4 !== undefined; t4 = t4.n) {
      var n3 = t4.S.n;
      if (n3 !== undefined)
        t4.r = n3;
      t4.S.n = t4;
      t4.i = -1;
      if (t4.n === undefined) {
        i4.s = t4;
        break;
      }
    }
  }
  function b3(i4) {
    var t4 = i4.s, n3 = undefined;
    while (t4 !== undefined) {
      var r4 = t4.p;
      if (t4.i === -1) {
        t4.S.U(t4);
        if (r4 !== undefined)
          r4.n = t4.n;
        if (t4.n !== undefined)
          t4.n.p = r4;
      } else
        n3 = t4;
      t4.S.n = t4.r;
      if (t4.r !== undefined)
        t4.r = undefined;
      t4 = r4;
    }
    i4.s = n3;
  }
  function p3(i4, t4) {
    l3.call(this, undefined, t4);
    this.x = i4;
    this.s = undefined;
    this.g = d2 - 1;
    this.f = 4;
  }
  p3.prototype = new l3;
  p3.prototype.h = function() {
    this.f &= -3;
    if (1 & this.f)
      return false;
    if ((36 & this.f) == 32)
      return true;
    this.f &= -5;
    if (this.g === d2)
      return true;
    this.g = d2;
    this.f |= 1;
    if (this.i > 0 && !w2(this)) {
      this.f &= -2;
      return true;
    }
    var i4 = o3;
    try {
      _2(this);
      o3 = this;
      var t4 = this.x();
      if (16 & this.f || this.v !== t4 || this.i === 0) {
        this.v = t4;
        this.f &= -17;
        this.i++;
      }
    } catch (i5) {
      this.v = i5;
      this.f |= 16;
      this.i++;
    }
    o3 = i4;
    b3(this);
    this.f &= -2;
    return true;
  };
  p3.prototype.S = function(i4) {
    if (this.t === undefined) {
      this.f |= 36;
      for (var t4 = this.s;t4 !== undefined; t4 = t4.n)
        t4.S.S(t4);
    }
    l3.prototype.S.call(this, i4);
  };
  p3.prototype.U = function(i4) {
    if (this.t !== undefined) {
      l3.prototype.U.call(this, i4);
      if (this.t === undefined) {
        this.f &= -33;
        for (var t4 = this.s;t4 !== undefined; t4 = t4.n)
          t4.S.U(t4);
      }
    }
  };
  p3.prototype.N = function() {
    if (!(2 & this.f)) {
      this.f |= 6;
      for (var i4 = this.t;i4 !== undefined; i4 = i4.x)
        i4.t.N();
    }
  };
  Object.defineProperty(p3.prototype, "value", { get: function() {
    if (1 & this.f)
      throw new Error("Cycle detected");
    var i4 = a3(this);
    this.h();
    if (i4 !== undefined)
      i4.i = this.i;
    if (16 & this.f)
      throw this.v;
    return this.v;
  } });
  function g3(i4, t4) {
    return new p3(i4, t4);
  }
  function S2(i4) {
    var n3 = i4.m;
    i4.m = undefined;
    if (typeof n3 == "function") {
      v3++;
      var r4 = o3;
      o3 = undefined;
      try {
        n3();
      } catch (t4) {
        i4.f &= -2;
        i4.f |= 8;
        m2(i4);
        throw t4;
      } finally {
        o3 = r4;
        t3();
      }
    }
  }
  function m2(i4) {
    for (var t4 = i4.s;t4 !== undefined; t4 = t4.n)
      t4.S.U(t4);
    i4.x = undefined;
    i4.s = undefined;
    S2(i4);
  }
  function x2(i4) {
    if (o3 !== this)
      throw new Error("Out-of-order effect");
    b3(this);
    o3 = i4;
    this.f &= -2;
    if (8 & this.f)
      m2(this);
    t3();
  }
  function E3(i4, t4) {
    this.x = i4;
    this.m = undefined;
    this.s = undefined;
    this.u = undefined;
    this.f = 32;
    this.name = t4 == null ? undefined : t4.name;
    if (r3)
      r3.push(this);
  }
  E3.prototype.c = function() {
    var i4 = this.S();
    try {
      if (8 & this.f)
        return;
      if (this.x === undefined)
        return;
      var t4 = this.x();
      if (typeof t4 == "function")
        this.m = t4;
    } finally {
      i4();
    }
  };
  E3.prototype.S = function() {
    if (1 & this.f)
      throw new Error("Cycle detected");
    this.f |= 1;
    this.f &= -9;
    S2(this);
    _2(this);
    v3++;
    var i4 = o3;
    o3 = this;
    return x2.bind(this, i4);
  };
  E3.prototype.N = function() {
    if (!(2 & this.f)) {
      this.f |= 2;
      this.u = h3;
      h3 = this;
    }
  };
  E3.prototype.d = function() {
    this.f |= 8;
    if (!(1 & this.f))
      m2(this);
  };
  E3.prototype.dispose = function() {
    this.d();
  };
  function j2(i4, t4) {
    var n3 = new E3(i4, t4);
    try {
      n3.c();
    } catch (i5) {
      n3.d();
      throw i5;
    }
    var r4 = n3.d.bind(n3);
    r4[Symbol.dispose] = r4;
    return r4;
  }

  // node_modules/@preact/signals/dist/signals.module.js
  var l4;
  var h4;
  var d3;
  var p4 = typeof window != "undefined" && !!window.__PREACT_SIGNALS_DEVTOOLS__;
  var _3 = [];
  j2(function() {
    l4 = this.N;
  })();
  function g4(i4, r4) {
    n[i4] = r4.bind(null, n[i4] || function() {});
  }
  function b4(i4) {
    if (d3) {
      var n3 = d3;
      d3 = undefined;
      n3();
    }
    d3 = i4 && i4.S();
  }
  function y4(i4) {
    var n3 = this, t4 = i4.data, f4 = useSignal(t4);
    f4.name = "ReactiveDom";
    f4.value = t4;
    var e4 = b2(function() {
      var i5 = n3, t5 = n3.__v;
      while (t5 = t5.__)
        if (t5.__c) {
          t5.__c.__$f |= 4;
          break;
        }
      var o4 = g3(function() {
        var i6 = f4.value.value;
        return i6 === 0 ? 0 : i6 === true ? "" : i6 || "";
      }), e5 = g3(function() {
        return !Array.isArray(o4.value) && !i(o4.value);
      }), a5 = j2(function() {
        this.N = F2;
        if (e5.value) {
          var n4 = o4.value;
          if (i5.__v && i5.__v.__e && i5.__v.__e.nodeType === 3)
            i5.__v.__e.data = n4;
        }
      }), v5 = n3.__$u.d;
      n3.__$u.d = function() {
        a5();
        v5.call(this);
      };
      return [e5, o4];
    }, []), a4 = e4[0], v4 = e4[1];
    return a4.value ? v4.peek() : v4.value;
  }
  y4.displayName = "ReactiveTextNode";
  Object.defineProperties(l3.prototype, { constructor: { configurable: true, value: undefined }, type: { configurable: true, value: y4 }, props: { configurable: true, get: function() {
    var i4 = this;
    return { data: { get value() {
      return i4.value;
    } } };
  } }, __b: { configurable: true, value: 1 } });
  g4("__b", function(i4, n3) {
    b4();
    h4 = undefined;
    if (typeof n3.type == "string") {
      var r4, t4 = n3.props;
      for (var o4 in t4)
        if (o4 !== "children") {
          var f4 = t4[o4];
          if (f4 instanceof l3) {
            if (!r4)
              n3.__np = r4 = {};
            r4[o4] = f4;
            t4[o4] = f4.peek();
          }
        }
    }
    i4(n3);
  });
  g4("__r", function(i4, n3) {
    i4(n3);
    if (n3.type !== x) {
      b4();
      var r4, o4 = n3.__c;
      if (o4) {
        o4.__$f &= -2;
        if ((r4 = o4.__$u) === undefined)
          o4.__$u = r4 = function(i5, n4) {
            var r5;
            j2(function() {
              r5 = this;
            }, { name: n4 });
            r5.c = i5;
            return r5;
          }(function(i5) {
            return function() {
              var n4;
              if (p4)
                (n4 = this.y) == null || n4.call(this);
              i5.__$f |= 1;
              i5.setState({});
            };
          }(o4), typeof n3.type == "function" ? n3.type.displayName || n3.type.name : "");
      }
      h4 = o4;
      b4(r4);
    }
  });
  g4("__e", function(i4, n3, r4, t4) {
    b4();
    h4 = undefined;
    i4(n3, r4, t4);
  });
  g4("diffed", function(i4, n3) {
    b4();
    h4 = undefined;
    var r4;
    if (typeof n3.type == "string" && (r4 = n3.__e)) {
      var { __np: t4, props: o4 } = n3, f4 = r4.U;
      if (f4)
        for (var e4 in f4) {
          var u4 = f4[e4];
          if (!(u4 === undefined || t4 && (e4 in t4))) {
            u4.d();
            f4[e4] = undefined;
          }
        }
      if (t4) {
        if (!f4) {
          f4 = {};
          r4.U = f4;
        }
        for (var a4 in t4) {
          var c4 = f4[a4], v4 = t4[a4];
          if (c4 === undefined) {
            c4 = w3(r4, a4, v4, o4);
            f4[a4] = c4;
          } else
            c4.o(v4, o4);
        }
      }
    }
    i4(n3);
  });
  function w3(i4, n3, r4, t4) {
    var o4 = n3 in i4 && i4.ownerSVGElement === undefined, f4 = y3(r4);
    return { o: function(i5, n4) {
      f4.value = i5;
      t4 = n4;
    }, d: j2(function() {
      this.N = F2;
      var r5 = f4.value.value;
      if (t4[n3] !== r5) {
        t4[n3] = r5;
        if (o4)
          i4[n3] = r5;
        else if (r5 != null && (r5 !== false || n3[4] === "-"))
          i4.setAttribute(n3, r5);
        else
          i4.removeAttribute(n3);
      }
    }) };
  }
  g4("unmount", function(i4, n3) {
    if (typeof n3.type == "string") {
      var r4 = n3.__e;
      if (r4) {
        var t4 = r4.U;
        if (t4) {
          r4.U = undefined;
          for (var o4 in t4) {
            var f4 = t4[o4];
            if (f4)
              f4.d();
          }
        }
      }
      var e4 = n3.__np;
      if (e4) {
        var u4 = n3.props;
        for (var a4 in e4)
          u4[a4] = e4[a4];
      }
      n3.__np = undefined;
    } else {
      var c4 = n3.__c;
      if (c4) {
        c4.__$f |= 8;
        var v4 = c4.__$u;
        if (v4) {
          c4.__$u = undefined;
          v4.d();
        }
      }
    }
    i4(n3);
  });
  g4("__h", function(i4, n3, r4, t4) {
    if (t4 < 3)
      n3.__$f |= 2;
    i4(n3, r4, t4);
  });
  S.prototype.shouldComponentUpdate = function(i4, n3) {
    if (this.__R)
      return true;
    var r4 = this.__$u, t4 = r4 && r4.s !== undefined;
    for (var o4 in n3)
      return true;
    if (this.__f || typeof this.u == "boolean" && this.u === true) {
      var f4 = 2 & this.__$f;
      if (!(t4 || f4 || 4 & this.__$f))
        return true;
      if (1 & this.__$f)
        return true;
    } else {
      if (!(t4 || 4 & this.__$f))
        return true;
      if (3 & this.__$f)
        return true;
    }
    for (var e4 in i4)
      if (e4 !== "__source" && i4[e4] !== this.props[e4])
        return true;
    for (var u4 in this.props)
      if (!(u4 in i4))
        return true;
    return false;
  };
  function useSignal(i4, n3) {
    return b2(function() {
      return y3(i4, n3);
    }, []);
  }
  var q2 = function(i4) {
    queueMicrotask(function() {
      queueMicrotask(i4);
    });
  };
  function x3() {
    n2(function() {
      var i4;
      while (i4 = _3.shift())
        l4.call(i4);
    });
  }
  function F2() {
    if (_3.push(this) === 1)
      (n.requestAnimationFrame || q2)(x3);
  }

  // node_modules/valibot/dist/index.mjs
  var store$4;
  var DEFAULT_CONFIG = {
    lang: undefined,
    message: undefined,
    abortEarly: undefined,
    abortPipeEarly: undefined
  };
  function getGlobalConfig(config$1) {
    if (!config$1 && !store$4)
      return DEFAULT_CONFIG;
    return {
      lang: config$1?.lang ?? store$4?.lang,
      message: config$1?.message,
      abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
      abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
    };
  }
  var store$3;
  function getGlobalMessage(lang) {
    return store$3?.get(lang);
  }
  var store$2;
  function getSchemaMessage(lang) {
    return store$2?.get(lang);
  }
  var store$1;
  function getSpecificMessage(reference, lang) {
    return store$1?.get(reference)?.get(lang);
  }
  function _stringify(input) {
    const type = typeof input;
    if (type === "string")
      return `"${input}"`;
    if (type === "number" || type === "bigint" || type === "boolean")
      return `${input}`;
    if (type === "object" || type === "function")
      return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
    return type;
  }
  function _addIssue(context, label, dataset, config$1, other) {
    const input = other && "input" in other ? other.input : dataset.value;
    const expected = other?.expected ?? context.expects ?? null;
    const received = other?.received ?? /* @__PURE__ */ _stringify(input);
    const issue = {
      kind: context.kind,
      type: context.type,
      input,
      expected,
      received,
      message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
      requirement: context.requirement,
      path: other?.path,
      issues: other?.issues,
      lang: config$1.lang,
      abortEarly: config$1.abortEarly,
      abortPipeEarly: config$1.abortPipeEarly
    };
    const isSchema = context.kind === "schema";
    const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
    if (message$1 !== undefined)
      issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
    if (isSchema)
      dataset.typed = false;
    if (dataset.issues)
      dataset.issues.push(issue);
    else
      dataset.issues = [issue];
  }
  function _isSameValueZero(value1, value2) {
    return value1 === value2 || Number.isNaN(value1) && Number.isNaN(value2);
  }
  function _isValidObjectKey(object$1, key) {
    return Object.prototype.hasOwnProperty.call(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
  }
  function _joinExpects(values$1, separator) {
    const list = [...new Set(values$1)];
    if (list.length > 1)
      return `(${list.join(` ${separator} `)})`;
    return list[0] ?? "never";
  }
  function _standardSchema(schema) {
    schema["~standard"] = {
      version: 1,
      vendor: "valibot",
      validate: (value$1) => schema["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig())
    };
    return schema;
  }
  var ValiError = class extends Error {
    constructor(issues) {
      super(issues[0].message);
      this.name = "ValiError";
      this.issues = issues;
    }
  };
  function check(requirement, message$1) {
    return {
      kind: "validation",
      type: "check",
      reference: check,
      async: false,
      expects: null,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !this.requirement(dataset.value))
          _addIssue(this, "input", dataset, config$1);
        return dataset;
      }
    };
  }
  function integer(message$1) {
    return {
      kind: "validation",
      type: "integer",
      reference: integer,
      async: false,
      expects: null,
      requirement: Number.isInteger,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !this.requirement(dataset.value))
          _addIssue(this, "integer", dataset, config$1);
        return dataset;
      }
    };
  }
  function maxLength(requirement, message$1) {
    return {
      kind: "validation",
      type: "max_length",
      reference: maxLength,
      async: false,
      expects: `<=${requirement}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && dataset.value.length > this.requirement)
          _addIssue(this, "length", dataset, config$1, { received: `${dataset.value.length}` });
        return dataset;
      }
    };
  }
  function maxValue(requirement, message$1) {
    return {
      kind: "validation",
      type: "max_value",
      reference: maxValue,
      async: false,
      expects: `<=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !(dataset.value <= this.requirement))
          _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
        return dataset;
      }
    };
  }
  function minValue(requirement, message$1) {
    return {
      kind: "validation",
      type: "min_value",
      reference: minValue,
      async: false,
      expects: `>=${requirement instanceof Date ? requirement.toJSON() : /* @__PURE__ */ _stringify(requirement)}`,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && !(dataset.value >= this.requirement))
          _addIssue(this, "value", dataset, config$1, { received: dataset.value instanceof Date ? dataset.value.toJSON() : /* @__PURE__ */ _stringify(dataset.value) });
        return dataset;
      }
    };
  }
  function nonEmpty(message$1) {
    return {
      kind: "validation",
      type: "non_empty",
      reference: nonEmpty,
      async: false,
      expects: "!0",
      message: message$1,
      "~run"(dataset, config$1) {
        if (dataset.typed && dataset.value.length === 0)
          _addIssue(this, "length", dataset, config$1, { received: "0" });
        return dataset;
      }
    };
  }
  function _isPartiallyTyped(dataset, paths) {
    if (dataset.issues)
      for (const path of paths)
        for (const issue of dataset.issues) {
          let typed = false;
          const bound = Math.min(path.length, issue.path?.length ?? 0);
          for (let index = 0;index < bound; index++)
            if (path[index] !== issue.path[index].key && (path[index] !== "$" || issue.path[index].type !== "array")) {
              typed = true;
              break;
            }
          if (!typed)
            return false;
        }
    return true;
  }
  function partialCheck(paths, requirement, message$1) {
    return {
      kind: "validation",
      type: "partial_check",
      reference: partialCheck,
      async: false,
      expects: null,
      paths,
      requirement,
      message: message$1,
      "~run"(dataset, config$1) {
        if ((dataset.typed || /* @__PURE__ */ _isPartiallyTyped(dataset, paths)) && !this.requirement(dataset.value))
          _addIssue(this, "input", dataset, config$1);
        return dataset;
      }
    };
  }
  function trim() {
    return {
      kind: "transformation",
      type: "trim",
      reference: trim,
      async: false,
      "~run"(dataset) {
        dataset.value = dataset.value.trim();
        return dataset;
      }
    };
  }
  function getFallback(schema, dataset, config$1) {
    return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
  }
  function forward(action, path) {
    return {
      ...action,
      "~run"(dataset, config$1) {
        const prevIssues = dataset.issues && [...dataset.issues];
        dataset = action["~run"](dataset, config$1);
        if (dataset.issues) {
          for (const issue of dataset.issues)
            if (!prevIssues?.includes(issue)) {
              let pathInput = dataset.value;
              for (const key of path) {
                const pathValue = pathInput[key];
                const pathItem = {
                  type: "unknown",
                  origin: "value",
                  input: pathInput,
                  key,
                  value: pathValue
                };
                if (issue.path)
                  issue.path.push(pathItem);
                else
                  issue.path = [pathItem];
                if (!pathValue)
                  break;
                pathInput = pathValue;
              }
            }
        }
        return dataset;
      }
    };
  }
  function getDefault(schema, dataset, config$1) {
    return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
  }
  function boolean(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "boolean",
      reference: boolean,
      expects: "boolean",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "boolean")
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function literal(literal_, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "literal",
      reference: literal,
      expects: /* @__PURE__ */ _stringify(literal_),
      async: false,
      literal: literal_,
      message: message$1,
      "~run"(dataset, config$1) {
        if (/* @__PURE__ */ _isSameValueZero(dataset.value, this.literal))
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function number(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "number",
      reference: number,
      expects: "number",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "number" && !isNaN(dataset.value))
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function object(entries$1, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "object",
      reference: object,
      expects: "Object",
      async: false,
      entries: entries$1,
      message: message$1,
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const key in this.entries) {
            const valueSchema = this.entries[key];
            if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== undefined) {
              const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
              const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
              if (valueDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "value",
                  input,
                  key,
                  value: value$1
                };
                for (const issue of valueDataset.issues) {
                  if (issue.path)
                    issue.path.unshift(pathItem);
                  else
                    issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues)
                  dataset.issues = valueDataset.issues;
                if (config$1.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              if (!valueDataset.typed)
                dataset.typed = false;
              dataset.value[key] = valueDataset.value;
            } else if (valueSchema.fallback !== undefined)
              dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
            else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
              _addIssue(this, "key", dataset, config$1, {
                input: undefined,
                expected: `"${key}"`,
                path: [{
                  type: "object",
                  origin: "key",
                  input,
                  key,
                  value: input[key]
                }]
              });
              if (config$1.abortEarly)
                break;
            }
          }
        } else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function optional(wrapped, default_) {
    return _standardSchema({
      kind: "schema",
      type: "optional",
      reference: optional,
      expects: `(${wrapped.expects} | undefined)`,
      async: false,
      wrapped,
      default: default_,
      "~run"(dataset, config$1) {
        if (dataset.value === undefined) {
          if (this.default !== undefined)
            dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
          if (dataset.value === undefined) {
            dataset.typed = true;
            return dataset;
          }
        }
        return this.wrapped["~run"](dataset, config$1);
      }
    });
  }
  function picklist(options, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "picklist",
      reference: picklist,
      expects: /* @__PURE__ */ _joinExpects(options.map(_stringify), "|"),
      async: false,
      options,
      message: message$1,
      "~run"(dataset, config$1) {
        if (this.options.includes(dataset.value))
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function record(key, value$1, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "record",
      reference: record,
      expects: "Object",
      async: false,
      key,
      value: value$1,
      message: message$1,
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const entryKey in input)
            if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
              const entryValue = input[entryKey];
              const keyDataset = this.key["~run"]({ value: entryKey }, config$1);
              if (keyDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "key",
                  input,
                  key: entryKey,
                  value: entryValue
                };
                for (const issue of keyDataset.issues) {
                  issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues)
                  dataset.issues = keyDataset.issues;
                if (config$1.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              const valueDataset = this.value["~run"]({ value: entryValue }, config$1);
              if (valueDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "value",
                  input,
                  key: entryKey,
                  value: entryValue
                };
                for (const issue of valueDataset.issues) {
                  if (issue.path)
                    issue.path.unshift(pathItem);
                  else
                    issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues)
                  dataset.issues = valueDataset.issues;
                if (config$1.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              if (!keyDataset.typed || !valueDataset.typed)
                dataset.typed = false;
              if (keyDataset.typed)
                dataset.value[keyDataset.value] = valueDataset.value;
            }
        } else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function string(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "string",
      reference: string,
      expects: "string",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "string")
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function unknown() {
    return _standardSchema({
      kind: "schema",
      type: "unknown",
      reference: unknown,
      expects: "unknown",
      async: false,
      "~run"(dataset) {
        dataset.typed = true;
        return dataset;
      }
    });
  }
  function parse(schema, input, config$1) {
    const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
    if (dataset.issues)
      throw new ValiError(dataset.issues);
    return dataset.value;
  }
  function pipe(...pipe$1) {
    return _standardSchema({
      ...pipe$1[0],
      pipe: pipe$1,
      "~run"(dataset, config$1) {
        for (const item of pipe$1)
          if (item.kind !== "metadata") {
            if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
              dataset.typed = false;
              break;
            }
            if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly)
              dataset = item["~run"](dataset, config$1);
          }
        return dataset;
      }
    });
  }
  function safeParse(schema, input, config$1) {
    const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config$1));
    return {
      typed: dataset.typed,
      success: !dataset.issues,
      output: dataset.value,
      issues: dataset.issues
    };
  }

  // src/config/schema.ts
  var PROVIDER_IDS = ["gemini", "groq", "openai"];
  function isValidSelector(selector) {
    if (typeof document === "undefined")
      return true;
    try {
      document.createDocumentFragment().querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }
  var selector = pipe(string(), trim(), nonEmpty("Required"), check(isValidSelector, "Invalid CSS selector"));
  var optionalSelector = optional(pipe(string(), trim(), check((s4) => !s4 || isValidSelector(s4), "Invalid CSS selector")), "");
  var CAPTCHA_KINDS = ["text", "math", "grid"];
  var SiteRuleSchema = pipe(object({
    captcha: selector,
    input: optionalSelector,
    submit: optionalSelector,
    kind: optional(picklist(CAPTCHA_KINDS), "text"),
    tiles: optionalSelector,
    instruction: optionalSelector,
    gridSize: optional(pipe(number(), integer(), minValue(0), maxValue(8)), 0),
    charset: optional(picklist(["alnum", "alpha", "digits", "any"]), "alnum"),
    caseMode: optional(picklist(["keep", "upper", "lower"]), "keep"),
    minLength: optional(pipe(number(), integer(), minValue(1), maxValue(32)), 3),
    maxLength: optional(pipe(number(), integer(), minValue(0), maxValue(64)), 0),
    hint: optional(pipe(string(), maxLength(200)), ""),
    auto: optional(boolean(), true),
    enabled: optional(boolean(), true)
  }), forward(partialCheck([["kind"], ["input"]], (r4) => r4.kind === "grid" || Boolean(r4.input), "Required"), ["input"]));
  var providerId = picklist(PROVIDER_IDS);
  var SettingsSchema = object({
    provider: optional(providerId, "gemini"),
    keys: optional(record(providerId, string()), {}),
    models: optional(record(providerId, string()), {}),
    openaiBaseUrl: optional(string(), "https://openrouter.ai/api/v1"),
    autoSolve: optional(boolean(), true),
    ui: optional(object({
      minimized: optional(boolean(), false),
      x: optional(number()),
      y: optional(number())
    }), {})
  });
  var ExportSchema = object({
    app: literal("universal-captcha-solver"),
    version: literal(2),
    sites: record(string(), unknown())
  });
  var defaultSettings = () => parse(SettingsSchema, {});

  // src/config/store.ts
  var KEYS = {
    settings: "ucs:v2:settings",
    sites: "ucs:v2:sites",
    migrated: "ucs:v2:migrated-v1"
  };
  var gmKV = {
    get: (key, fallback) => GM_getValue(key, fallback),
    set: (key, value) => GM_setValue(key, value),
    keys: () => GM_listValues()
  };
  function parseSettings(raw) {
    const res = safeParse(SettingsSchema, raw ?? {});
    return res.success ? res.output : defaultSettings();
  }
  function parseSites(raw) {
    const out = {};
    if (!raw || typeof raw !== "object")
      return out;
    for (const [pattern, value] of Object.entries(raw)) {
      const res = safeParse(SiteRuleSchema, value);
      if (res.success)
        out[pattern] = res.output;
      else
        console.warn(`[ucs] dropped invalid rule "${pattern}"`);
    }
    return out;
  }
  function createStore(kv) {
    const settings = y3(parseSettings(kv.get(KEYS.settings, null)));
    const sites = y3(parseSites(kv.get(KEYS.sites, null)));
    const persistSites = (next) => {
      kv.set(KEYS.sites, next);
      sites.value = next;
    };
    return {
      kv,
      settings,
      sites,
      patchSettings(patch) {
        const next = { ...settings.value, ...patch };
        kv.set(KEYS.settings, next);
        settings.value = next;
      },
      setApiKey(provider, key) {
        this.patchSettings({ keys: { ...settings.value.keys, [provider]: key.trim() } });
      },
      setModel(provider, model) {
        this.patchSettings({ models: { ...settings.value.models, [provider]: model.trim() } });
      },
      patchUi(patch) {
        this.patchSettings({ ui: { ...settings.value.ui, ...patch } });
      },
      saveSite(pattern, rule, replaces) {
        const next = { ...sites.value, [pattern]: rule };
        if (replaces && replaces !== pattern)
          delete next[replaces];
        persistSites(next);
      },
      removeSite(pattern) {
        const { [pattern]: _gone, ...rest } = sites.value;
        persistSites(rest);
      },
      mergeSites(incoming) {
        persistSites({ ...sites.value, ...incoming });
      },
      reload() {
        settings.value = parseSettings(kv.get(KEYS.settings, null));
        sites.value = parseSites(kv.get(KEYS.sites, null));
      }
    };
  }

  // src/net/http.ts
  class HttpError extends Error {
    status;
    retryAfterMs;
    constructor(message, status, retryAfterMs) {
      super(message);
      this.status = status;
      this.retryAfterMs = retryAfterMs;
      this.name = "HttpError";
    }
  }
  var abortError = () => new DOMException("Aborted", "AbortError");
  var isAbort = (e4) => e4 instanceof DOMException && e4.name === "AbortError";
  function errorMessageFromBody(text, status) {
    try {
      const json = JSON.parse(text);
      const msg = typeof json.error === "string" ? json.error : json.error?.message;
      if (msg)
        return msg.slice(0, 300);
    } catch {}
    return `HTTP ${status}`;
  }
  function retryAfter(headers) {
    const m3 = headers?.match(/^retry-after:\s*(\d+)/im);
    return m3?.[1] ? Number(m3[1]) * 1000 : undefined;
  }
  var gmHttp = (req) => new Promise((resolve, reject) => {
    if (req.signal?.aborted)
      return reject(abortError());
    let settled = false;
    const finish = (fn) => {
      if (settled)
        return;
      settled = true;
      req.signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const handle = GM_xmlhttpRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      data: req.body,
      responseType: req.responseType === "blob" ? "blob" : undefined,
      timeout: req.timeout ?? 15000,
      onload: (r4) => finish(() => {
        let text = "";
        try {
          text = typeof r4.responseText === "string" ? r4.responseText : "";
        } catch {}
        if (r4.status >= 200 && r4.status < 300) {
          resolve({ status: r4.status, text, blob: r4.response instanceof Blob ? r4.response : undefined });
        } else {
          reject(new HttpError(errorMessageFromBody(text, r4.status), r4.status, retryAfter(r4.responseHeaders)));
        }
      }),
      onerror: () => finish(() => reject(new HttpError("Network error", 0))),
      ontimeout: () => finish(() => reject(new HttpError("Request timed out", 0))),
      onabort: () => finish(() => reject(abortError()))
    });
    function onAbort() {
      handle.abort();
      finish(() => reject(abortError()));
    }
    req.signal?.addEventListener("abort", onAbort, { once: true });
  });

  // src/providers/gemini.ts
  var BASE = "https://generativelanguage.googleapis.com/v1beta";
  function thinkingConfigFor(model) {
    return /^gemini-3/.test(model) && !/pro/.test(model) ? { thinkingConfig: { thinkingLevel: "minimal" } } : {};
  }
  function parseGeminiReply(body) {
    const data = JSON.parse(body);
    if (data.promptFeedback?.blockReason)
      throw new Error(`Blocked by Gemini: ${data.promptFeedback.blockReason}`);
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts ?? []).filter((p5) => !p5.thought && p5.text).map((p5) => p5.text).join("");
    if (!text) {
      throw new Error(cand?.finishReason === "MAX_TOKENS" ? "Model ran out of tokens before answering" : "Empty response from Gemini");
    }
    return text;
  }
  var NOT_CHAT = /embedding|image|tts|live|audio|robotics|veo|imagen|aqa|computer-use|deep-research/;
  var createGemini = (http = gmHttp) => ({
    id: "gemini",
    label: "Google Gemini",
    keyHelpUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-3.1-flash-lite",
    suggestedModels: ["gemini-3.1-flash-lite", "gemini-3.5-flash"],
    defaultBaseUrl: BASE,
    async complete(cfg, { image, prompt, signal }) {
      const model = cfg.model.replace(/^models\//, "");
      const body = (withThinking) => JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: image.mime, data: image.base64 } }] }
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 256, ...withThinking ? thinkingConfigFor(model) : {} }
      });
      const call = (b5) => http({
        method: "POST",
        url: `${BASE}/models/${encodeURIComponent(model)}:generateContent`,
        headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
        body: b5,
        timeout: 20000,
        signal
      });
      try {
        return parseGeminiReply((await call(body(true))).text);
      } catch (e4) {
        if (e4 instanceof HttpError && e4.status === 400 && /thinking/i.test(e4.message)) {
          return parseGeminiReply((await call(body(false))).text);
        }
        throw e4;
      }
    },
    async listModels(cfg, signal) {
      const out = [];
      let pageToken = "";
      for (let page = 0;page < 3; page++) {
        const res = await http({
          method: "GET",
          url: `${BASE}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
          headers: { "x-goog-api-key": cfg.apiKey },
          signal
        });
        const data = JSON.parse(res.text);
        for (const m3 of data.models ?? []) {
          const id = m3.name.replace(/^models\//, "");
          if (/^(gemini|gemma)-/.test(id) && !NOT_CHAT.test(id) && m3.supportedGenerationMethods?.includes("generateContent")) {
            out.push(id);
          }
        }
        if (!data.nextPageToken)
          break;
        pageToken = data.nextPageToken;
      }
      return out.sort().reverse();
    }
  });

  // src/providers/openai-compat.ts
  function parseChatReply(body) {
    const content = JSON.parse(body).choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map((p5) => p5.text ?? "").join("") : content ?? "";
    if (!text.trim())
      throw new Error("Empty response from model");
    return text;
  }
  var createOpenAICompat = (opts) => (http = gmHttp) => {
    const root = (baseUrl) => (baseUrl || opts.defaultBaseUrl).replace(/\/+$/, "");
    return {
      id: opts.id,
      label: opts.label,
      keyHelpUrl: opts.keyHelpUrl,
      defaultModel: opts.defaultModel,
      suggestedModels: opts.suggestedModels,
      defaultBaseUrl: opts.defaultBaseUrl,
      async complete(cfg, { image, prompt, signal }) {
        const extras = opts.extraBody?.(cfg.model) ?? {};
        const call = (withExtras) => http({
          method: "POST",
          url: `${root(cfg.baseUrl)}/chat/completions`,
          headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
          body: JSON.stringify({
            model: cfg.model,
            temperature: 0,
            max_tokens: 256,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.base64}` } }
                ]
              }
            ],
            ...withExtras ? extras : {}
          }),
          timeout: 25000,
          signal
        });
        try {
          return parseChatReply((await call(true)).text);
        } catch (e4) {
          const rejected = e4 instanceof HttpError && (e4.status === 400 || e4.status === 422);
          if (rejected && Object.keys(extras).length > 0)
            return parseChatReply((await call(false)).text);
          throw e4;
        }
      },
      async listModels(cfg, signal) {
        const res = await http({
          method: "GET",
          url: `${root(cfg.baseUrl)}/models`,
          headers: { authorization: `Bearer ${cfg.apiKey}` },
          signal
        });
        const data = JSON.parse(res.text);
        const keep = opts.keepModel ?? (() => true);
        return (data.data ?? []).map((m3) => m3.id).filter(keep).sort();
      }
    };
  };

  // src/providers/groq.ts
  var NON_VISION = /whisper|orpheus|tts|guard|safeguard|embed|compound/i;
  var createGroq = createOpenAICompat({
    id: "groq",
    label: "Groq",
    keyHelpUrl: "https://console.groq.com/keys",
    defaultModel: "qwen/qwen3.8-27b",
    suggestedModels: ["qwen/qwen3.8-27b"],
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    extraBody: (model) => /^qwen\//.test(model) ? { reasoning_effort: "none" } : {},
    keepModel: (id) => !NON_VISION.test(id)
  });

  // src/providers/index.ts
  var createGenericOpenAI = createOpenAICompat({
    id: "openai",
    label: "OpenAI-compatible",
    keyHelpUrl: "https://openrouter.ai/keys",
    defaultModel: "",
    suggestedModels: [],
    defaultBaseUrl: "https://openrouter.ai/api/v1"
  });
  function createProviders(http) {
    return { gemini: createGemini(http), groq: createGroq(http), openai: createGenericOpenAI(http) };
  }
  var providers = createProviders();

  // src/config/match.ts
  function parsePattern(raw) {
    const s4 = raw.trim().replace(/^(\*|https?):\/\//i, "").replace(/\?.*$/, "");
    if (!s4)
      return null;
    const slash = s4.indexOf("/");
    const hostPart = (slash === -1 ? s4 : s4.slice(0, slash)).toLowerCase();
    const pathPart = slash === -1 ? "" : s4.slice(slash);
    const subdomains = hostPart.startsWith("*.");
    const host = subdomains ? hostPart.slice(2) : hostPart;
    if (!host || host.includes("*"))
      return null;
    if (!pathPart || pathPart === "/*")
      return { host, subdomains, path: null, mode: "any" };
    if (pathPart.endsWith("/*"))
      return { host, subdomains, path: pathPart.slice(0, -2), mode: "prefix" };
    return { host, subdomains, path: trimSlash(pathPart), mode: "exact" };
  }
  var trimSlash = (p5) => p5.length > 1 && p5.endsWith("/") ? p5.slice(0, -1) : p5;
  function scorePattern(pattern, loc) {
    const p5 = parsePattern(pattern);
    if (!p5)
      return null;
    const hosts = [loc.hostname.toLowerCase(), loc.host.toLowerCase()];
    const exactHost = hosts.includes(p5.host);
    const subHost = p5.subdomains && hosts.some((h5) => h5.endsWith(`.${p5.host}`));
    if (!exactHost && !subHost)
      return null;
    const hostScore = p5.subdomains ? 1 : 2;
    const path = trimSlash(loc.pathname || "/");
    let pathScore;
    if (p5.mode === "any")
      pathScore = 0;
    else if (p5.mode === "exact") {
      if (path !== p5.path)
        return null;
      pathScore = 100;
    } else {
      const base = p5.path ?? "";
      if (!(path === base || path.startsWith(`${base}/`)))
        return null;
      pathScore = 1 + base.split("/").filter(Boolean).length;
    }
    return hostScore * 1000 + pathScore;
  }
  function findBestRule(sites, loc) {
    let best = null;
    for (const [pattern, rule] of Object.entries(sites)) {
      const score = scorePattern(pattern, loc);
      if (score !== null && (!best || score > best.score))
        best = { pattern, rule, score };
    }
    return best ? { pattern: best.pattern, rule: best.rule } : null;
  }

  // node_modules/@medv/finder/finder.js
  var acceptedAttrNames = new Set(["role", "name", "aria-label", "rel", "href"]);
  function attr(name, value) {
    let nameIsOk = acceptedAttrNames.has(name);
    nameIsOk ||= name.startsWith("data-") && wordLike(name);
    let valueIsOk = wordLike(value) && value.length < 100;
    valueIsOk ||= value.startsWith("#") && wordLike(value.slice(1));
    return nameIsOk && valueIsOk;
  }
  function idName(name) {
    return wordLike(name);
  }
  function className(name) {
    return wordLike(name);
  }
  function tagName(name) {
    return true;
  }
  function finder(input, options) {
    if (input.nodeType !== Node.ELEMENT_NODE) {
      throw new Error(`Can't generate CSS selector for non-element node type.`);
    }
    if (input.tagName.toLowerCase() === "html") {
      return "html";
    }
    const defaults = {
      root: document.body,
      idName,
      className,
      tagName,
      attr,
      timeoutMs: 1000,
      seedMinLength: 3,
      optimizedMinLength: 2,
      maxNumberOfPathChecks: Infinity
    };
    const startTime = new Date;
    const config = { ...defaults, ...options };
    const rootDocument = findRootDocument(config.root, defaults);
    let foundPath;
    let count = 0;
    for (const candidate of search(input, config, rootDocument)) {
      const elapsedTimeMs = new Date().getTime() - startTime.getTime();
      if (elapsedTimeMs > config.timeoutMs || count >= config.maxNumberOfPathChecks) {
        const fPath = fallback(input, rootDocument);
        if (!fPath) {
          throw new Error(`Timeout: Can't find a unique selector after ${config.timeoutMs}ms`);
        }
        return selector2(fPath);
      }
      count++;
      if (unique(candidate, rootDocument)) {
        foundPath = candidate;
        break;
      }
    }
    if (!foundPath) {
      throw new Error(`Selector was not found.`);
    }
    const optimized = [
      ...optimize(foundPath, input, config, rootDocument, startTime)
    ];
    optimized.sort(byPenalty);
    if (optimized.length > 0) {
      return selector2(optimized[0]);
    }
    return selector2(foundPath);
  }
  function* search(input, config, rootDocument) {
    const stack = [];
    let paths = [];
    let current = input;
    let i4 = 0;
    while (current && current !== rootDocument) {
      const level = tie(current, config);
      for (const node of level) {
        node.level = i4;
      }
      stack.push(level);
      current = current.parentElement;
      i4++;
      paths.push(...combinations(stack));
      if (i4 >= config.seedMinLength) {
        paths.sort(byPenalty);
        for (const candidate of paths) {
          yield candidate;
        }
        paths = [];
      }
    }
    paths.sort(byPenalty);
    for (const candidate of paths) {
      yield candidate;
    }
  }
  function wordLike(name) {
    if (/^[a-z\-]{3,}$/i.test(name)) {
      const words = name.split(/-|[A-Z]/);
      for (const word of words) {
        if (word.length <= 2) {
          return false;
        }
        if (/[^aeiou]{4,}/i.test(word)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  function tie(element, config) {
    const level = [];
    const elementId = element.getAttribute("id");
    if (elementId && config.idName(elementId)) {
      level.push({
        name: "#" + CSS.escape(elementId),
        penalty: 0
      });
    }
    for (let i4 = 0;i4 < element.classList.length; i4++) {
      const name = element.classList[i4];
      if (config.className(name)) {
        level.push({
          name: "." + CSS.escape(name),
          penalty: 1
        });
      }
    }
    for (let i4 = 0;i4 < element.attributes.length; i4++) {
      const attr2 = element.attributes[i4];
      if (config.attr(attr2.name, attr2.value)) {
        level.push({
          name: `[${CSS.escape(attr2.name)}="${CSS.escape(attr2.value)}"]`,
          penalty: 2
        });
      }
    }
    const tagName2 = element.tagName.toLowerCase();
    if (config.tagName(tagName2)) {
      level.push({
        name: tagName2,
        penalty: 5
      });
      const index = indexOf(element, tagName2);
      if (index !== undefined) {
        level.push({
          name: nthOfType(tagName2, index),
          penalty: 10
        });
      }
    }
    const nth = indexOf(element);
    if (nth !== undefined) {
      level.push({
        name: nthChild(tagName2, nth),
        penalty: 50
      });
    }
    return level;
  }
  function selector2(path) {
    let node = path[0];
    let query = node.name;
    for (let i4 = 1;i4 < path.length; i4++) {
      const level = path[i4].level || 0;
      if (node.level === level - 1) {
        query = `${path[i4].name} > ${query}`;
      } else {
        query = `${path[i4].name} ${query}`;
      }
      node = path[i4];
    }
    return query;
  }
  function penalty(path) {
    return path.map((node) => node.penalty).reduce((acc, i4) => acc + i4, 0);
  }
  function byPenalty(a4, b5) {
    return penalty(a4) - penalty(b5);
  }
  function indexOf(input, tagName2) {
    const parent = input.parentNode;
    if (!parent) {
      return;
    }
    let child = parent.firstChild;
    if (!child) {
      return;
    }
    let i4 = 0;
    while (child) {
      if (child.nodeType === Node.ELEMENT_NODE && (tagName2 === undefined || child.tagName.toLowerCase() === tagName2)) {
        i4++;
      }
      if (child === input) {
        break;
      }
      child = child.nextSibling;
    }
    return i4;
  }
  function fallback(input, rootDocument) {
    let i4 = 0;
    let current = input;
    const path = [];
    while (current && current !== rootDocument) {
      const tagName2 = current.tagName.toLowerCase();
      const index = indexOf(current, tagName2);
      if (index === undefined) {
        return;
      }
      path.push({
        name: nthOfType(tagName2, index),
        penalty: NaN,
        level: i4
      });
      current = current.parentElement;
      i4++;
    }
    if (unique(path, rootDocument)) {
      return path;
    }
  }
  function nthChild(tagName2, index) {
    if (tagName2 === "html") {
      return "html";
    }
    return `${tagName2}:nth-child(${index})`;
  }
  function nthOfType(tagName2, index) {
    if (tagName2 === "html") {
      return "html";
    }
    return `${tagName2}:nth-of-type(${index})`;
  }
  function* combinations(stack, path = []) {
    if (stack.length > 0) {
      for (let node of stack[0]) {
        yield* combinations(stack.slice(1, stack.length), path.concat(node));
      }
    } else {
      yield path;
    }
  }
  function findRootDocument(rootNode, defaults) {
    if (rootNode.nodeType === Node.DOCUMENT_NODE) {
      return rootNode;
    }
    if (rootNode === defaults.root) {
      return rootNode.ownerDocument;
    }
    return rootNode;
  }
  function unique(path, rootDocument) {
    const css = selector2(path);
    switch (rootDocument.querySelectorAll(css).length) {
      case 0:
        throw new Error(`Can't select any node with this selector: ${css}`);
      case 1:
        return true;
      default:
        return false;
    }
  }
  function* optimize(path, input, config, rootDocument, startTime) {
    if (path.length > 2 && path.length > config.optimizedMinLength) {
      for (let i4 = 1;i4 < path.length - 1; i4++) {
        const elapsedTimeMs = new Date().getTime() - startTime.getTime();
        if (elapsedTimeMs > config.timeoutMs) {
          return;
        }
        const newPath = [...path];
        newPath.splice(i4, 1);
        if (unique(newPath, rootDocument) && rootDocument.querySelector(selector2(newPath)) === input) {
          yield newPath;
          yield* optimize(newPath, input, config, rootDocument, startTime);
        }
      }
    }
  }

  // src/dom/picker.ts
  var UI_HOST_TAG = "ucs-root";
  var pickerView = y3(null);
  var cancelCurrent = null;
  var cancelPick = () => cancelCurrent?.();
  function pathSelector(el) {
    const parts = [];
    for (let n3 = el;n3 && n3 !== document.documentElement; n3 = n3.parentElement) {
      const same = n3.parentElement ? [...n3.parentElement.children].filter((c4) => c4.localName === n3?.localName) : [n3];
      parts.unshift(same.length > 1 ? `${n3.localName}:nth-of-type(${same.indexOf(n3) + 1})` : n3.localName);
    }
    return parts.join(" > ");
  }
  function selectorFor(el) {
    try {
      const s4 = finder(el, {
        root: document.documentElement,
        idName: (n3) => idName(n3) && !/\d{3,}/.test(n3) && !n3.startsWith("ucs-"),
        className: (n3) => className(n3) && !n3.startsWith("ucs-"),
        timeoutMs: 400
      });
      if (document.querySelector(s4) === el)
        return s4;
    } catch {}
    return pathSelector(el);
  }
  function pickElement(prompt, accept = () => null) {
    return new Promise((resolve) => {
      let target = null;
      const widened = [];
      let raf = 0;
      const isOurs = (e4) => e4.composedPath().some((n3) => n3 instanceof Element && n3.localName === UI_HOST_TAG);
      const problem = (el) => el.getRootNode() instanceof ShadowRoot ? "Elements inside shadow DOM are not supported" : accept(el);
      const render = () => {
        raf = 0;
        if (!target) {
          pickerView.value = { prompt, rect: null, tag: "", selector: "", matches: 0, warning: "" };
          return;
        }
        const r4 = target.getBoundingClientRect();
        const selector3 = selectorFor(target);
        pickerView.value = {
          prompt,
          rect: { x: r4.left, y: r4.top, w: r4.width, h: r4.height },
          tag: target.localName,
          selector: selector3,
          matches: document.querySelectorAll(selector3).length,
          warning: problem(target) ?? ""
        };
      };
      const schedule = () => {
        if (!raf)
          raf = requestAnimationFrame(render);
      };
      const swallow = (e4) => {
        e4.preventDefault();
        e4.stopImmediatePropagation();
      };
      const track = (e4) => {
        if (isOurs(e4))
          return;
        const t4 = e4.composedPath()[0];
        if (t4 instanceof Element && t4 !== target) {
          target = t4;
          widened.length = 0;
          schedule();
        }
      };
      const block = (e4) => {
        if (!isOurs(e4))
          swallow(e4);
      };
      const click = (e4) => {
        if (isOurs(e4))
          return;
        swallow(e4);
        if (target && !problem(target))
          finish({ el: target, selector: selectorFor(target) });
      };
      const key = (e4) => {
        if (isOurs(e4))
          return;
        if (e4.key === "Escape") {
          swallow(e4);
          finish(null);
        } else if (e4.key === "ArrowUp" && target?.parentElement && target.parentElement !== document.documentElement) {
          swallow(e4);
          widened.push(target);
          target = target.parentElement;
          schedule();
        } else if (e4.key === "ArrowDown" && widened.length) {
          swallow(e4);
          target = widened.pop() ?? target;
          schedule();
        }
      };
      const listeners = [
        ["pointermove", track],
        [
          "pointerdown",
          (e4) => {
            track(e4);
            block(e4);
          }
        ],
        ["pointerup", block],
        ["mousedown", block],
        ["mouseup", block],
        ["click", click],
        ["keydown", key],
        ["scroll", schedule]
      ];
      for (const [type, fn] of listeners)
        window.addEventListener(type, fn, { capture: true, passive: false });
      cancelCurrent = () => finish(null);
      const prevCursor = document.documentElement.style.cursor;
      document.documentElement.style.cursor = "crosshair";
      render();
      function finish(result) {
        for (const [type, fn] of listeners)
          window.removeEventListener(type, fn, { capture: true });
        cancelAnimationFrame(raf);
        cancelCurrent = null;
        document.documentElement.style.cursor = prevCursor;
        pickerView.value = null;
        resolve(result);
      }
    });
  }

  // src/dom/click.ts
  function pointIn(r4, rand = Math.random) {
    const j3 = () => (rand() - 0.5) * 0.4;
    return { x: r4.left + r4.width * (0.5 + j3()), y: r4.top + r4.height * (0.5 + j3()) };
  }
  function pageElementAt({ x: x4, y: y5 }) {
    const all = document.elementsFromPoint?.(x4, y5) ?? [document.elementFromPoint(x4, y5)];
    return all.find((el) => el && el.localName !== UI_HOST_TAG) ?? null;
  }
  function simulateClick(target, at = pointIn(target.getBoundingClientRect())) {
    const base = { bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y, button: 0 };
    const hasPointer = typeof PointerEvent === "function";
    const pointer = (type, buttons) => hasPointer && target.dispatchEvent(new PointerEvent(type, { ...base, buttons, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    const mouse = (type, buttons) => target.dispatchEvent(new MouseEvent(type, { ...base, buttons }));
    pointer("pointerover", 0);
    mouse("mouseover", 0);
    pointer("pointermove", 0);
    mouse("mousemove", 0);
    pointer("pointerdown", 1);
    mouse("mousedown", 1);
    if (target instanceof HTMLElement)
      target.focus({ preventScroll: true });
    pointer("pointerup", 0);
    mouse("mouseup", 0);
    mouse("click", 0);
  }

  // src/dom/fill.ts
  var isTextField = (el) => el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "file", "image", "hidden"].includes(el.type);
  function fillInput(field, value) {
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter)
      setter.call(field, value);
    else
      field.value = value;
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function clickElement(selector3) {
    const el = document.querySelector(selector3);
    if (!el)
      return false;
    el.click();
    return true;
  }

  // src/dom/watch.ts
  var signature = (el) => [el.localName, el.getAttribute("src"), el.currentSrc, el.width].join("|");
  function watchCaptcha(getSelector, onChange, debounceMs = 120) {
    let current = null;
    let lastSig = "";
    let timer;
    let forced = false;
    const check2 = () => {
      timer = undefined;
      const force = forced;
      forced = false;
      const el = document.querySelector(getSelector());
      if (!el) {
        if (current)
          onChange(null, "lost");
        current = null;
        lastSig = "";
        return;
      }
      const sig = signature(el);
      if (el !== current) {
        const reason = current ? "changed" : "found";
        current = el;
        lastSig = sig;
        onChange(el, reason);
      } else if (force || sig !== lastSig) {
        lastSig = sig;
        onChange(el, "changed");
      }
    };
    const schedule = (force = false) => {
      forced ||= force;
      clearTimeout(timer);
      timer = setTimeout(check2, debounceMs);
    };
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"]
    });
    const onLoad = (e4) => {
      if (e4.target === current)
        schedule(true);
    };
    document.addEventListener("load", onLoad, true);
    schedule();
    return {
      stop() {
        clearTimeout(timer);
        observer.disconnect();
        document.removeEventListener("load", onLoad, true);
      }
    };
  }
  function onUrlChange(cb) {
    const nav = window.navigation;
    if (nav) {
      nav.addEventListener("navigatesuccess", cb);
      return () => nav.removeEventListener("navigatesuccess", cb);
    }
    window.addEventListener("popstate", cb);
    window.addEventListener("hashchange", cb);
    return () => {
      window.removeEventListener("popstate", cb);
      window.removeEventListener("hashchange", cb);
    };
  }

  // src/image/capture.ts
  var MAX_SIDE = 1024;
  var PNG_PIXEL_BUDGET = 400 * 400;
  function fitWithin(w4, h5, max = MAX_SIDE) {
    const scale = Math.min(1, max / Math.max(w4, h5));
    return { width: Math.max(1, Math.round(w4 * scale)), height: Math.max(1, Math.round(h5 * scale)) };
  }
  function annotateGrid(ctx, width, height, size) {
    const cw = width / size;
    const ch = height / size;
    const font = Math.max(10, Math.round(Math.min(cw, ch) * 0.16));
    ctx.save();
    ctx.lineWidth = Math.max(1, Math.round(font / 8));
    ctx.strokeStyle = "#fff";
    for (let i4 = 1;i4 < size; i4++) {
      ctx.beginPath();
      ctx.moveTo(i4 * cw, 0);
      ctx.lineTo(i4 * cw, height);
      ctx.moveTo(0, i4 * ch);
      ctx.lineTo(width, i4 * ch);
      ctx.stroke();
    }
    ctx.font = `bold ${font}px sans-serif`;
    ctx.textBaseline = "top";
    for (let n3 = 0;n3 < size * size; n3++) {
      const x4 = n3 % size * cw + 2;
      const y5 = Math.floor(n3 / size) * ch + 2;
      const label = String(n3 + 1);
      ctx.fillStyle = "#000c";
      ctx.fillRect(x4, y5, ctx.measureText(label).width + font * 0.5, font * 1.2);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x4 + font * 0.25, y5 + font * 0.1);
    }
    ctx.restore();
  }
  function rasterize(source, srcW, srcH, grid = 0) {
    const { width, height } = fitWithin(srcW, srcH);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Canvas unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    if (grid > 1)
      annotateGrid(ctx, width, height, grid);
    const png = width * height <= PNG_PIXEL_BUDGET;
    const mime = png ? "image/png" : "image/jpeg";
    const base64 = canvas.toDataURL(mime, 0.92).split(",")[1] ?? "";
    return { mime, base64, width, height };
  }
  async function imageReady(img, timeoutMs) {
    if (img.complete && img.naturalWidth > 0)
      return;
    await Promise.race([
      img.decode(),
      new Promise((_4, rej) => setTimeout(() => rej(new Error("Captcha image did not load")), timeoutMs))
    ]);
  }
  async function refetch(url, http, signal, grid = 0) {
    let blob;
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      blob = await (await fetch(url, { signal })).blob();
    } else {
      const res = await http({ method: "GET", url, responseType: "blob", timeout: 1e4, signal });
      if (!res.blob)
        throw new Error("Image download returned no data");
      blob = res.blob;
    }
    const bmp = await createImageBitmap(blob);
    try {
      return rasterize(bmp, bmp.width, bmp.height, grid);
    } finally {
      bmp.close();
    }
  }
  function backgroundUrl(el) {
    const m3 = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return m3?.[1] ? new URL(m3[1], location.href).href : null;
  }
  async function captureImage(el, opts = {}) {
    const { http = gmHttp, signal, loadTimeoutMs = 5000, grid = 0 } = opts;
    if (el instanceof HTMLCanvasElement) {
      return { ...rasterize(el, el.width, el.height, grid), refetched: false };
    }
    if (el instanceof HTMLImageElement) {
      await imageReady(el, loadTimeoutMs);
      try {
        return { ...rasterize(el, el.naturalWidth, el.naturalHeight, grid), refetched: false };
      } catch (e4) {
        if (!(e4 instanceof DOMException && e4.name === "SecurityError"))
          throw e4;
        const url = el.currentSrc || el.src;
        return { ...await refetch(url, http, signal, grid), refetched: true };
      }
    }
    if (el instanceof SVGSVGElement) {
      const rect = el.getBoundingClientRect();
      const xml = new XMLSerializer().serializeToString(el);
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      const img = new Image;
      img.src = url;
      await imageReady(img, loadTimeoutMs);
      return { ...rasterize(img, rect.width || 200, rect.height || 80, grid), refetched: false };
    }
    const bg = backgroundUrl(el);
    if (bg)
      return { ...await refetch(bg, http, signal, grid), refetched: true };
    throw new Error(`Unsupported captcha element <${el.tagName.toLowerCase()}>. Pick an <img>, <canvas> or <svg>`);
  }

  // src/solver/answer.ts
  class AnswerError extends Error {
    name = "AnswerError";
  }
  var CHARSET_NAME = {
    alnum: "letters and digits only",
    alpha: "letters only",
    digits: "digits only",
    any: ""
  };
  function buildPrompt(rule) {
    if (rule.kind === "math") {
      return [
        "The image shows a simple arithmetic CAPTCHA.",
        "Compute it and reply with ONLY the final number: no words, no equals sign, no explanation.",
        rule.hint
      ].filter(Boolean).join(" ");
    }
    const parts = [
      "You are an OCR engine reading a distorted-text CAPTCHA.",
      "Transcribe the characters exactly as they appear. Reply with ONLY those characters: no spaces, quotes, punctuation or explanation."
    ];
    if (CHARSET_NAME[rule.charset])
      parts.push(`The answer contains ${CHARSET_NAME[rule.charset]}.`);
    if (rule.maxLength && rule.maxLength === rule.minLength)
      parts.push(`It is exactly ${rule.maxLength} characters long.`);
    else if (rule.maxLength)
      parts.push(`It is ${rule.minLength} to ${rule.maxLength} characters long.`);
    if (rule.hint)
      parts.push(rule.hint);
    return parts.join(" ");
  }
  var ALLOWED = {
    alnum: /[^A-Za-z0-9]/g,
    alpha: /[^A-Za-z]/g,
    digits: /[^0-9]/g,
    any: /\s/g
  };
  function normalizeAnswer(raw, rule) {
    let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
    if (/<think>/i.test(text))
      throw new AnswerError("Model returned reasoning instead of an answer");
    text = text.replace(/```[a-z]*/gi, "").trim();
    const lines = text.split(`
`).map((l5) => l5.trim()).filter(Boolean);
    const last = lines.at(-1) ?? "";
    if (!last)
      throw new AnswerError("Empty answer");
    if (rule.kind === "math") {
      const nums = last.match(/-?\d+(?:\.\d+)?/g);
      const n3 = nums?.at(-1);
      if (!n3)
        throw new AnswerError(`Could not read a number from "${last.slice(0, 40)}"`);
      return n3;
    }
    let answer = last.replace(ALLOWED[rule.charset], "");
    if (rule.caseMode === "upper")
      answer = answer.toUpperCase();
    else if (rule.caseMode === "lower")
      answer = answer.toLowerCase();
    if (answer.length < rule.minLength) {
      throw new AnswerError(`Answer "${answer}" is shorter than ${rule.minLength} characters`);
    }
    if (rule.maxLength && answer.length > rule.maxLength) {
      throw new AnswerError(`Answer "${answer}" is longer than ${rule.maxLength} characters`);
    }
    return answer;
  }

  // src/solver/errors.ts
  function explainError(e4) {
    if (e4 instanceof HttpError) {
      switch (e4.status) {
        case 0:
          return e4.message === "Request timed out" ? "Request timed out" : "Network error. Check your connection";
        case 400:
          return `Bad request: ${e4.message}`;
        case 401:
        case 403:
          return "API key rejected. Check it in Settings";
        case 404:
          return "Model not found; it may have been retired. Pick another in Settings";
        case 429:
          return "Rate limited. Wait a moment and retry";
        default:
          return e4.status >= 500 ? `Provider error (${e4.status}). Try again` : e4.message;
      }
    }
    if (e4 instanceof AnswerError)
      return e4.message;
    if (e4 instanceof SyntaxError)
      return "Unexpected response from provider";
    return e4 instanceof Error ? e4.message : String(e4);
  }
  var retryable = (e4) => e4 instanceof HttpError && (e4.status === 0 || e4.status === 429 || e4.status >= 500);
  var sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const t4 = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t4);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
  async function withRetry(fn, opts = {}) {
    const { retries = 2, baseMs = 500, signal } = opts;
    for (let attempt = 0;; attempt++) {
      try {
        return await fn();
      } catch (e4) {
        if (isAbort(e4) || attempt >= retries || !retryable(e4))
          throw e4;
        const wait = e4 instanceof HttpError && e4.retryAfterMs ? e4.retryAfterMs : baseMs * 2 ** attempt;
        await sleep(Math.min(wait, 4000), signal);
      }
    }
  }

  // src/solver/grid.ts
  var DEFAULT_SIZE = 3;
  function resolveGridSize(configured, tileCount) {
    if (configured > 0)
      return configured;
    const side = Math.round(Math.sqrt(tileCount));
    return side >= 2 && side * side === tileCount ? side : DEFAULT_SIZE;
  }
  function buildGridPrompt(size, instruction, hint = "") {
    const last = size * size;
    return [
      `The image is a CAPTCHA laid out as a ${size}x${size} grid of tiles.`,
      `Tiles are numbered 1 to ${last} left-to-right, top-to-bottom: 1 is top-left, ${size} is top-right, ${last} is bottom-right. Each tile shows its number in its top-left corner.`,
      instruction ? `Task: ${instruction}` : "",
      "Select every tile that matches the task. If the grid is one picture split into tiles, select every tile containing any part of the object.",
      `Reply with ONLY JSON, no explanation: {"tiles":[...]} listing the matching tile numbers, or {"tiles":[]} if none match.`,
      hint
    ].filter(Boolean).join(" ");
  }
  function parseGridAnswer(raw, total) {
    let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
    if (/<think>/i.test(text))
      throw new AnswerError("Model returned reasoning instead of an answer");
    text = text.replace(/```[a-z]*/gi, "").trim();
    const json = text.match(/\{[^{}]*\}|\[[^[\]]*\]/g)?.at(-1);
    if (!json)
      throw new AnswerError(`Expected JSON tile list, got "${text.slice(0, 40)}"`);
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      throw new AnswerError(`Could not parse "${json.slice(0, 40)}"`);
    }
    const list = Array.isArray(data) ? data : data?.tiles;
    if (!Array.isArray(list))
      throw new AnswerError('Reply has no "tiles" list');
    const out = new Set;
    for (const item of list) {
      const n3 = typeof item === "string" ? Number(item.trim()) : item;
      if (typeof n3 !== "number" || !Number.isInteger(n3) || n3 < 1 || n3 > total) {
        throw new AnswerError(`Tile "${String(item)}" is not between 1 and ${total}`);
      }
      out.add(n3);
    }
    return [...out].sort((a4, b5) => a4 - b5);
  }

  // src/solver/guard.ts
  class RateGuard {
    max;
    windowMs;
    now;
    hits = [];
    constructor(max, windowMs, now = Date.now) {
      this.max = max;
      this.windowMs = windowMs;
      this.now = now;
    }
    allow() {
      const t4 = this.now();
      this.hits = this.hits.filter((h5) => t4 - h5 < this.windowMs);
      if (this.hits.length >= this.max)
        return false;
      this.hits.push(t4);
      return true;
    }
    reset() {
      this.hits = [];
    }
  }

  // src/solver/controller.ts
  function resolveProvider(settings, registry, id = settings.provider) {
    const provider = registry[id];
    return {
      provider,
      cfg: {
        apiKey: settings.keys[id] ?? "",
        model: settings.models[id] || provider.defaultModel,
        baseUrl: id === "openai" ? settings.openaiBaseUrl : provider.defaultBaseUrl
      }
    };
  }
  var humanDelay = () => 180 + Math.random() * 220;
  var textOf = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  function createController({
    store,
    registry,
    capture = captureImage,
    location: getLoc = () => window.location,
    clickDelay = humanDelay
  }) {
    const status = y3({ phase: "idle", text: "Idle" });
    const match = y3(null);
    const present = y3(false);
    const guard = new RateGuard(5, 60000);
    let runId = 0;
    let abort = null;
    let watch = null;
    let watched = "";
    const set = (s4) => {
      status.value = s4;
    };
    async function solve(trigger) {
      const current = match.value;
      if (!current?.rule.enabled)
        return;
      const { rule } = current;
      if (trigger === "auto") {
        if (!guard.allow()) {
          set({ phase: "paused", text: "Auto-solve paused (too many attempts). Click Solve" });
          return;
        }
      } else {
        guard.reset();
      }
      const { provider, cfg } = resolveProvider(store.settings.value, registry);
      if (!cfg.apiKey) {
        set({ phase: "error", text: `Add a ${provider.label} API key`, action: "settings" });
        return;
      }
      if (!cfg.model) {
        set({ phase: "error", text: "Choose a model", action: "settings" });
        return;
      }
      abort?.abort();
      const ac = new AbortController;
      abort = ac;
      const id = ++runId;
      const started = performance.now();
      set({ phase: "solving", text: "Solving…" });
      try {
        const el = document.querySelector(rule.captcha);
        if (!el) {
          set({ phase: "missing", text: "Captcha not found on this page" });
          return;
        }
        if (rule.kind === "grid") {
          await solveGrid(rule, el, provider, cfg, ac.signal, () => id === runId, started);
          return;
        }
        const image = await capture(el, { signal: ac.signal });
        const raw = await withRetry(() => provider.complete(cfg, { image, prompt: buildPrompt(rule), signal: ac.signal }), { signal: ac.signal });
        if (id !== runId)
          return;
        const answer = normalizeAnswer(raw, rule);
        const input = document.querySelector(rule.input);
        if (!isTextField(input))
          throw new Error("Answer field not found");
        fillInput(input, answer);
        if (rule.submit)
          setTimeout(() => clickElement(rule.submit), 80);
        set({
          phase: "solved",
          text: answer,
          answer,
          ms: Math.round(performance.now() - started),
          warning: image.refetched ? "Image was re-downloaded; it may differ from the one shown" : undefined
        });
      } catch (e4) {
        if (isAbort(e4) || id !== runId)
          return;
        console.warn("[ucs]", e4);
        set({ phase: "error", text: explainError(e4) });
      }
    }
    async function solveGrid(rule, el, provider, cfg, signal, current, started) {
      const tiles = rule.tiles ? [...document.querySelectorAll(rule.tiles)] : [];
      const size = resolveGridSize(rule.gridSize, tiles.length);
      const total = size * size;
      if (rule.tiles && tiles.length !== total) {
        throw new Error(`Found ${tiles.length} tiles, expected ${total} (${size}x${size}). Check the tiles selector`);
      }
      const instruction = rule.instruction ? textOf(document.querySelector(rule.instruction)) : "";
      if (!instruction && !rule.hint)
        throw new Error("No challenge text: set the instruction selector or a hint");
      const image = await capture(el, { signal, grid: size });
      const raw = await withRetry(() => provider.complete(cfg, { image, prompt: buildGridPrompt(size, instruction, rule.hint), signal }), { signal });
      if (!current())
        return;
      const picks = parseGridAnswer(raw, total);
      const cell = (n3) => {
        const r4 = el.getBoundingClientRect();
        const w4 = r4.width / size;
        const h5 = r4.height / size;
        return { left: r4.left + (n3 - 1) % size * w4, top: r4.top + Math.floor((n3 - 1) / size) * h5, width: w4, height: h5 };
      };
      for (const [i4, n3] of picks.entries()) {
        if (i4 > 0)
          await sleep(clickDelay(), signal);
        if (!current())
          return;
        const tile = tiles[n3 - 1];
        if (tile) {
          simulateClick(tile);
        } else {
          const at = pointIn(cell(n3));
          const target = pageElementAt(at);
          if (!target)
            throw new Error(`Nothing clickable at tile ${n3}`);
          simulateClick(target, at);
        }
      }
      if (rule.submit) {
        await sleep(clickDelay() + 200, signal);
        if (!current())
          return;
        const button = document.querySelector(rule.submit);
        if (button)
          simulateClick(button);
      }
      const answer = picks.length ? `Tiles ${picks.join(", ")}` : "No matching tiles";
      set({
        phase: "solved",
        text: answer,
        answer,
        ms: Math.round(performance.now() - started),
        warning: image.refetched ? "Image was re-downloaded; it may differ from the one shown" : undefined
      });
    }
    function rematch() {
      const next = findBestRule(store.sites.value, getLoc());
      match.value = next;
      const active = next?.rule.enabled ? next.rule.captcha : "";
      if (active === watched)
        return;
      watch?.stop();
      watch = null;
      watched = active;
      present.value = false;
      abort?.abort();
      if (!active) {
        set({ phase: "idle", text: "Idle" });
        return;
      }
      set({ phase: "idle", text: "Waiting for captcha…" });
      watch = watchCaptcha(() => watched, (el) => {
        present.value = Boolean(el);
        if (!el) {
          set({ phase: "idle", text: "Waiting for captcha…" });
          return;
        }
        if (match.value?.rule.auto && store.settings.value.autoSolve)
          solve("auto");
      });
    }
    const disposers = [];
    return {
      status,
      match,
      present,
      solve,
      rematch,
      start() {
        disposers.push(j2(() => {
          store.sites.value;
          f3(rematch);
        }), onUrlChange(rematch));
      },
      stop() {
        for (const d4 of disposers.splice(0))
          d4();
        watch?.stop();
        abort?.abort();
      }
    };
  }

  // src/app.ts
  var store = createStore(gmKV);
  var controller = createController({ store, registry: providers });

  // src/config/migrate.ts
  var V1_KEY = "gemini_api_key";
  var V1_MODEL = "gemini_model";
  var V1_DEFAULT_MODEL = "gemma-3-27b-it";
  function migrateV1(kv) {
    if (kv.get(KEYS.migrated, false))
      return { sites: 0, apiKey: false };
    const settings = parseSettings(kv.get(KEYS.settings, null));
    const apiKey = kv.get(V1_KEY, "");
    const model = kv.get(V1_MODEL, "");
    if (apiKey && !settings.keys.gemini)
      settings.keys.gemini = apiKey;
    if (model && model !== V1_DEFAULT_MODEL && !settings.models.gemini)
      settings.models.gemini = model;
    const legacy = {};
    for (const key of kv.keys()) {
      if (key.startsWith("ucs:") || key === V1_KEY || key === V1_MODEL)
        continue;
      const raw = kv.get(key, null);
      if (typeof raw !== "string" || !raw.startsWith("{"))
        continue;
      try {
        const old = JSON.parse(raw);
        if (old.captchaSelector && old.inputSelector) {
          legacy[key] = { captcha: old.captchaSelector, input: old.inputSelector };
        }
      } catch {}
    }
    const sites = { ...parseSites(kv.get(KEYS.sites, null)), ...parseSites(legacy) };
    kv.set(KEYS.settings, settings);
    kv.set(KEYS.sites, sites);
    kv.set(KEYS.migrated, true);
    return { sites: Object.keys(legacy).length, apiKey: Boolean(apiKey) };
  }

  // src/dom/frame.ts
  var IN_FRAME = (() => {
    try {
      return window.top !== window.self;
    } catch {
      return true;
    }
  })();

  // src/ui/state.ts
  var settingsTab = y3(null);
  var editor = y3(null);
  var toasts = y3([]);
  var nextId = 0;
  function toast(text, kind = "ok", action) {
    const id = ++nextId;
    toasts.value = [...toasts.value, { id, text, kind, action }];
    setTimeout(() => dismissToast(id), kind === "error" ? 6000 : action ? 6000 : 2800);
  }
  var dismissToast = (id) => {
    toasts.value = toasts.value.filter((t4) => t4.id !== id);
  };

  // src/flows/setup.ts
  var imageProblem = (el) => el instanceof HTMLImageElement || el instanceof HTMLCanvasElement || el instanceof SVGSVGElement || getComputedStyle(el).backgroundImage !== "none" ? null : "Pick the captcha picture itself (an image, canvas or svg). ↑ selects the parent";
  var fieldProblem = (el) => isTextField(el) ? null : "Pick the text box where the answer is typed";
  async function configureCurrentPage() {
    settingsTab.value = null;
    const captcha = await pickElement("Step 1 of 2: click the captcha image", imageProblem);
    if (!captcha)
      return toast("Setup cancelled");
    const input = await pickElement("Step 2 of 2: click the answer box", fieldProblem);
    if (!input)
      return toast("Setup cancelled");
    editor.value = {
      pattern: location.hostname,
      rule: { captcha: captcha.selector, input: input.selector }
    };
  }
  var textProblem = (el) => el.textContent?.trim() ? null : "Pick the text that says what to select. ↑ selects the parent";
  function tilesSelector(el) {
    const classes = [...el.classList].filter((c4) => !c4.startsWith("ucs-")).map((c4) => `.${CSS.escape(c4)}`);
    const candidates = [el.localName + classes.join(""), ...classes.map((c4) => el.localName + c4)];
    for (const sel of candidates) {
      const all = [...document.querySelectorAll(sel)];
      const side = Math.round(Math.sqrt(all.length));
      if (side >= 2 && side * side === all.length && all.includes(el))
        return sel;
    }
    return selectorFor(el);
  }
  async function configureGridPage() {
    settingsTab.value = null;
    const captcha = await pickElement("Step 1 of 4: click the grid image", imageProblem);
    if (!captcha)
      return toast("Setup cancelled");
    const tile = await pickElement("Step 2 of 4: click any one tile (Esc: click by position instead)");
    const instruction = await pickElement('Step 3 of 4: click the "Select all…" text (Esc to skip)', textProblem);
    const submit = await pickElement("Step 4 of 4: click the Verify button (Esc to skip)");
    editor.value = {
      pattern: `${location.hostname}${location.pathname}`,
      rule: {
        kind: "grid",
        captcha: captcha.selector,
        input: "",
        tiles: tile ? tilesSelector(tile.el) : "",
        instruction: instruction?.selector ?? "",
        submit: submit?.selector ?? ""
      }
    };
  }
  async function repick(field) {
    const labels = {
      captcha: "Click the captcha image",
      input: "Click the answer box",
      submit: "Click the submit button",
      tiles: "Click any one tile",
      instruction: "Click the challenge text"
    };
    const checks = {
      captcha: imageProblem,
      input: fieldProblem,
      instruction: textProblem
    };
    const picked = await pickElement(labels[field], checks[field]);
    const current = editor.value;
    if (!picked || !current)
      return;
    const selector3 = field === "tiles" ? tilesSelector(picked.el) : picked.selector;
    editor.value = { ...current, rule: { ...current.rule, [field]: selector3 } };
  }
  // node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
  var o4 = 0;
  function u4(t4, e4, n3, f4, u5, i4) {
    e4 || (e4 = {});
    var a4, c4, l5 = e4;
    if ("ref" in l5 && typeof t4 != "function")
      for (c4 in l5 = {}, e4)
        c4 == "ref" ? a4 = e4[c4] : l5[c4] = e4[c4];
    var p5 = { type: t4, props: l5, key: n3, ref: a4, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: --o4, __i: -1, __u: 0 };
    return (u5 || i4) && (p5.__source = u5, p5.__self = i4), n.vnode && n.vnode(p5), p5;
  }

  // src/ui/overlays.tsx
  function PickerOverlay() {
    const view = pickerView.value;
    if (!view)
      return null;
    const { rect } = view;
    return /* @__PURE__ */ u4(x, {
      children: [
        rect && /* @__PURE__ */ u4("div", {
          class: "pk-box",
          style: { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "pk-bar",
          role: "status",
          children: [
            /* @__PURE__ */ u4("div", {
              class: "top",
              children: [
                /* @__PURE__ */ u4("span", {
                  children: view.prompt
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  class: "btn sm",
                  onClick: cancelPick,
                  children: "Cancel"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            view.selector ? /* @__PURE__ */ u4("div", {
              children: [
                /* @__PURE__ */ u4("code", {
                  children: view.selector
                }, undefined, false, undefined, this),
                " ",
                /* @__PURE__ */ u4("span", {
                  class: `chip ${view.matches === 1 ? "ok" : "warn"}`,
                  children: view.matches === 1 ? "unique" : `${view.matches} matches`
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this) : /* @__PURE__ */ u4("span", {
              class: "hint",
              children: "Hover the page, then click"
            }, undefined, false, undefined, this),
            view.warning ? /* @__PURE__ */ u4("p", {
              class: "err",
              children: view.warning
            }, undefined, false, undefined, this) : /* @__PURE__ */ u4("p", {
              class: "hint",
              children: "↑ / ↓ widen or narrow the target · Esc cancels"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  function Toasts() {
    const list = toasts.value;
    const ref = T2(null);
    A2(() => {
      const el = ref.current;
      if (!el)
        return;
      const open = el.matches(":popover-open");
      if (open)
        el.hidePopover();
      if (list.length)
        el.showPopover();
    }, [list.length]);
    return /* @__PURE__ */ u4("div", {
      ref,
      class: "toasts",
      popover: "manual",
      "aria-live": "polite",
      children: list.map((t4) => /* @__PURE__ */ u4("div", {
        class: `toast ${t4.kind}`,
        children: [
          /* @__PURE__ */ u4("span", {
            children: t4.text
          }, undefined, false, undefined, this),
          t4.action && /* @__PURE__ */ u4("button", {
            type: "button",
            onClick: () => {
              t4.action?.run();
              dismissToast(t4.id);
            },
            children: t4.action.label
          }, undefined, false, undefined, this)
        ]
      }, t4.id, true, undefined, this))
    }, undefined, false, undefined, this);
  }

  // src/flows/data.ts
  function exportSites(store2) {
    const payload = { app: "universal-captcha-solver", version: 2, sites: store2.sites.value };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a4 = Object.assign(document.createElement("a"), {
      href: url,
      download: `captcha-solver-sites-${new Date().toISOString().slice(0, 10)}.json`
    });
    a4.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importSites(store2, json) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error("Not a valid JSON file");
    }
    const parsed = safeParse(ExportSchema, data);
    if (!parsed.success)
      throw new Error("Not a Universal Captcha Solver export");
    const sites = parseSites(parsed.output.sites);
    const count = Object.keys(sites).length;
    if (!count)
      throw new Error("No valid rules found in file");
    store2.mergeSites(sites);
    return count;
  }
  function pickJsonFile() {
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement("input"), { type: "file", accept: "application/json,.json" });
      input.onchange = () => input.files?.[0] ? void input.files[0].text().then(resolve) : resolve(null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // src/solver/selftest.ts
  var ALPHABET = "ACDEFGHJKLMNPRTUVWXY34679";
  function renderTestCard() {
    const answer = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 56;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Canvas unavailable");
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, 160, 56);
    ctx.strokeStyle = "#8884";
    for (let i4 = 0;i4 < 4; i4++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 160, Math.random() * 56);
      ctx.lineTo(Math.random() * 160, Math.random() * 56);
      ctx.stroke();
    }
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#222";
    ctx.textBaseline = "middle";
    [...answer].forEach((ch, i4) => {
      ctx.save();
      ctx.translate(22 + i4 * 33, 28 + (Math.random() - 0.5) * 8);
      ctx.rotate((Math.random() - 0.5) * 0.5);
      ctx.fillText(ch, -10, 0);
      ctx.restore();
    });
    return { base64: canvas.toDataURL("image/png").split(",")[1] ?? "", answer };
  }
  var RULE = {
    kind: "text",
    charset: "alnum",
    caseMode: "upper",
    minLength: 4,
    maxLength: 4,
    hint: ""
  };
  async function testProvider(provider, cfg) {
    if (!cfg.apiKey)
      return { ok: false, text: "Enter an API key first" };
    if (!cfg.model)
      return { ok: false, text: "Choose a model first" };
    const card = renderTestCard();
    const started = performance.now();
    try {
      const raw = await provider.complete(cfg, {
        image: { mime: "image/png", base64: card.base64 },
        prompt: buildPrompt(RULE)
      });
      const ms = Math.round(performance.now() - started);
      const read = normalizeAnswer(raw, RULE);
      return read === card.answer ? { ok: true, text: `Works: read "${read}" in ${ms} ms` } : { ok: true, text: `Connected (${ms} ms), but read "${read}" for "${card.answer}". Accuracy varies by model` };
    } catch (e4) {
      return { ok: false, text: explainError(e4) };
    }
  }

  // src/ui/icons.tsx
  var PATHS = {
    sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    minus: "M5 12h14",
    x: "M18 6 6 18M6 6l12 12",
    plus: "M12 5v14M5 12h14",
    pencil: "M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    target: "M22 12h-4M6 12H2M12 6V2M12 22v-4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01"
  };
  function Icon({ name, size = 16 }) {
    return /* @__PURE__ */ u4("svg", {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      children: /* @__PURE__ */ u4("path", {
        d: PATHS[name]
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }

  // src/ui/modal.tsx
  function Modal({ open, title, onClose, children }) {
    const ref = T2(null);
    const openRef = T2(open);
    openRef.current = open;
    A2(() => {
      const d4 = ref.current;
      if (!d4)
        return;
      if (open && !d4.open)
        d4.showModal();
      else if (!open && d4.open)
        d4.close();
    }, [open]);
    return /* @__PURE__ */ u4("dialog", {
      ref,
      class: "modal",
      "aria-label": title,
      onClose: () => openRef.current && onClose(),
      onClick: (e4) => e4.target === ref.current && onClose(),
      children: [
        /* @__PURE__ */ u4("header", {
          children: [
            /* @__PURE__ */ u4("h2", {
              children: title
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "icon",
              "aria-label": "Close",
              onClick: onClose,
              children: /* @__PURE__ */ u4(Icon, {
                name: "x"
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        open && children
      ]
    }, undefined, true, undefined, this);
  }

  // src/ui/settings.tsx
  var TABS = [
    ["provider", "AI provider"],
    ["sites", "Sites"],
    ["data", "Backup"]
  ];
  function SettingsDialog() {
    const tab = settingsTab.value;
    return /* @__PURE__ */ u4(Modal, {
      open: tab !== null && !editor.value,
      title: "Captcha Solver",
      onClose: () => settingsTab.value = null,
      children: [
        /* @__PURE__ */ u4("div", {
          class: "tabs",
          role: "tablist",
          children: TABS.map(([id, label]) => /* @__PURE__ */ u4("button", {
            type: "button",
            role: "tab",
            class: "tab",
            "aria-selected": tab === id,
            onClick: () => settingsTab.value = id,
            children: label
          }, id, false, undefined, this))
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "body",
          children: [
            tab === "provider" && /* @__PURE__ */ u4(ProviderTab, {}, undefined, false, undefined, this),
            tab === "sites" && /* @__PURE__ */ u4(SitesTab, {}, undefined, false, undefined, this),
            tab === "data" && /* @__PURE__ */ u4(DataTab, {}, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  function ProviderTab() {
    const settings = store.settings.value;
    const id = settings.provider;
    const provider = providers[id];
    const { cfg } = resolveProvider(settings, providers);
    const models = useSignal([...provider.suggestedModels]);
    const busy = useSignal("");
    const result = useSignal(null);
    const reveal = useSignal(false);
    A2(() => {
      models.value = [...provider.suggestedModels];
      result.value = null;
    }, [id]);
    const refreshModels = async () => {
      busy.value = "models";
      try {
        const list = await provider.listModels(cfg);
        models.value = list.length ? list : [...provider.suggestedModels];
        toast(`${list.length} models available`);
      } catch (e4) {
        toast(explainError(e4), "error");
      } finally {
        busy.value = "";
      }
    };
    const runTest = async () => {
      busy.value = "test";
      result.value = null;
      result.value = await testProvider(provider, cfg);
      busy.value = "";
    };
    return /* @__PURE__ */ u4(x, {
      children: [
        /* @__PURE__ */ u4("fieldset", {
          class: "seg",
          "aria-label": "Provider",
          children: PROVIDER_IDS.map((p5) => /* @__PURE__ */ u4("button", {
            type: "button",
            "aria-pressed": p5 === id,
            onClick: () => store.patchSettings({ provider: p5 }),
            children: providers[p5].label
          }, p5, false, undefined, this))
        }, undefined, false, undefined, this),
        id === "openai" && /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-base",
              children: "Base URL"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("input", {
              id: "ucs-base",
              type: "url",
              class: "mono",
              value: settings.openaiBaseUrl,
              onInput: (e4) => store.patchSettings({ openaiBaseUrl: e4.currentTarget.value.trim() })
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("p", {
              class: "hint",
              children: "Any OpenAI-compatible endpoint: OpenRouter, OpenAI, Ollama (http://localhost:11434/v1), LM Studio…"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-key",
              children: "API key"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "row",
              children: [
                /* @__PURE__ */ u4("input", {
                  id: "ucs-key",
                  class: "grow mono",
                  type: reveal.value ? "text" : "password",
                  autocomplete: "off",
                  spellcheck: false,
                  value: cfg.apiKey,
                  placeholder: "Paste your key",
                  onInput: (e4) => store.setApiKey(id, e4.currentTarget.value)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  class: "btn sm",
                  onClick: () => reveal.value = !reveal.value,
                  children: reveal.value ? "Hide" : "Show"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("p", {
              class: "hint",
              children: [
                /* @__PURE__ */ u4("a", {
                  href: provider.keyHelpUrl,
                  target: "_blank",
                  rel: "noreferrer noopener",
                  children: [
                    "Get a ",
                    provider.label,
                    " key"
                  ]
                }, undefined, true, undefined, this),
                ". Stored by your userscript manager; sent only to the provider."
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-model",
              children: "Model"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "row",
              children: [
                /* @__PURE__ */ u4("input", {
                  id: "ucs-model",
                  class: "grow mono",
                  type: "text",
                  list: "ucs-models",
                  autocomplete: "off",
                  spellcheck: false,
                  value: cfg.model,
                  placeholder: provider.defaultModel || "model id",
                  onInput: (e4) => store.setModel(id, e4.currentTarget.value)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("datalist", {
                  id: "ucs-models",
                  children: models.value.map((m3) => /* @__PURE__ */ u4("option", {
                    value: m3
                  }, m3, false, undefined, this))
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  class: "btn sm",
                  disabled: !cfg.apiKey || busy.value !== "",
                  onClick: () => void refreshModels(),
                  children: busy.value === "models" ? "…" : "Fetch list"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("p", {
              class: "hint",
              children: "Providers retire models often. If solving starts failing with “model not found”, fetch the list and pick a current vision model."
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "row",
          children: /* @__PURE__ */ u4("button", {
            type: "button",
            class: "btn primary",
            disabled: busy.value !== "",
            onClick: () => void runTest(),
            children: busy.value === "test" ? "Testing…" : "Test with a sample captcha"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this),
        result.value && /* @__PURE__ */ u4("div", {
          class: `result ${result.value.ok ? "ok" : "bad"}`,
          role: "status",
          children: result.value.text
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("label", {
          class: "check",
          children: [
            /* @__PURE__ */ u4("input", {
              type: "checkbox",
              checked: settings.autoSolve,
              onChange: (e4) => store.patchSettings({ autoSolve: e4.currentTarget.checked })
            }, undefined, false, undefined, this),
            "Auto-solve when a captcha appears or refreshes"
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  function SitesTab() {
    const sites = Object.entries(store.sites.value);
    const here = controller.match.value?.pattern;
    const remove = (pattern) => {
      const rule = store.sites.value[pattern];
      store.removeSite(pattern);
      if (rule)
        toast(`Removed ${pattern}`, "ok", { label: "Undo", run: () => store.saveSite(pattern, rule) });
    };
    return /* @__PURE__ */ u4(x, {
      children: [
        /* @__PURE__ */ u4("div", {
          class: "row",
          children: [
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn primary",
              onClick: () => void configureCurrentPage(),
              children: [
                /* @__PURE__ */ u4(Icon, {
                  name: "target"
                }, undefined, false, undefined, this),
                " Configure this page"
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn",
              onClick: () => editor.value = { pattern: location.hostname, rule: { captcha: "", input: "" }, fromSettings: true },
              children: [
                /* @__PURE__ */ u4(Icon, {
                  name: "plus"
                }, undefined, false, undefined, this),
                " Add manually"
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("p", {
          class: "hint",
          children: "Note: Currently solves text and math captchas only (images, canvas, SVG). Puzzle, slider, and Turnstile/reCAPTCHA challenges are not supported."
        }, undefined, false, undefined, this),
        sites.length === 0 ? /* @__PURE__ */ u4("p", {
          class: "empty",
          children: "No sites yet. Open a page with a text captcha and choose “Configure this page”; it takes two clicks."
        }, undefined, false, undefined, this) : sites.map(([pattern, rule]) => /* @__PURE__ */ u4("div", {
          class: `site${rule.enabled ? "" : " off"}`,
          children: [
            /* @__PURE__ */ u4("div", {
              class: "pat",
              children: [
                pattern,
                " ",
                pattern === here && /* @__PURE__ */ u4("span", {
                  class: "chip ok",
                  children: "active here"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "sel",
              children: [
                rule.captcha,
                " → ",
                rule.input
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "acts",
              children: [
                /* @__PURE__ */ u4("input", {
                  type: "checkbox",
                  "aria-label": `Enable ${pattern}`,
                  checked: rule.enabled,
                  onChange: (e4) => store.saveSite(pattern, { ...rule, enabled: e4.currentTarget.checked })
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  class: "icon",
                  "aria-label": `Edit ${pattern}`,
                  onClick: () => editor.value = { original: pattern, pattern, rule, fromSettings: true },
                  children: /* @__PURE__ */ u4(Icon, {
                    name: "pencil"
                  }, undefined, false, undefined, this)
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  class: "icon",
                  "aria-label": `Remove ${pattern}`,
                  onClick: () => remove(pattern),
                  children: /* @__PURE__ */ u4(Icon, {
                    name: "trash"
                  }, undefined, false, undefined, this)
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, pattern, true, undefined, this))
      ]
    }, undefined, true, undefined, this);
  }
  function DataTab() {
    const doImport = async () => {
      const text = await pickJsonFile();
      if (text === null)
        return;
      try {
        toast(`Imported ${importSites(store, text)} rule(s)`);
      } catch (e4) {
        toast(e4.message, "error");
      }
    };
    return /* @__PURE__ */ u4(x, {
      children: [
        /* @__PURE__ */ u4("p", {
          class: "hint",
          children: "Back up or share your site rules. API keys are never included in exports."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "row",
          children: [
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn",
              onClick: () => exportSites(store),
              children: "Export rules"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn",
              onClick: () => void doImport(),
              children: "Import rules"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("p", {
          class: "hint",
          children: [
            "Shortcuts: ",
            /* @__PURE__ */ u4("kbd", {
              children: "Alt"
            }, undefined, false, undefined, this),
            "+",
            /* @__PURE__ */ u4("kbd", {
              children: "Shift"
            }, undefined, false, undefined, this),
            "+",
            /* @__PURE__ */ u4("kbd", {
              children: "S"
            }, undefined, false, undefined, this),
            " solve now · ",
            /* @__PURE__ */ u4("kbd", {
              children: "Alt"
            }, undefined, false, undefined, this),
            "+",
            /* @__PURE__ */ u4("kbd", {
              children: "Shift"
            }, undefined, false, undefined, this),
            "+",
            /* @__PURE__ */ u4("kbd", {
              children: "C"
            }, undefined, false, undefined, this),
            " ",
            "configure this page."
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }

  // src/ui/site-editor.tsx
  function matchChip(selector3, many = false) {
    if (!selector3?.trim())
      return null;
    try {
      const n3 = document.querySelectorAll(selector3).length;
      if (many)
        return /* @__PURE__ */ u4("span", {
          class: `chip ${n3 ? "ok" : "warn"}`,
          children: n3 ? `${n3} tiles` : "not on this page"
        }, undefined, false, undefined, this);
      if (n3 === 1)
        return /* @__PURE__ */ u4("span", {
          class: "chip ok",
          children: "1 match on this page"
        }, undefined, false, undefined, this);
      if (n3 === 0)
        return /* @__PURE__ */ u4("span", {
          class: "chip warn",
          children: "not on this page"
        }, undefined, false, undefined, this);
      return /* @__PURE__ */ u4("span", {
        class: "chip warn",
        children: [
          n3,
          " matches (first is used)"
        ]
      }, undefined, true, undefined, this);
    } catch {
      return /* @__PURE__ */ u4("span", {
        class: "chip bad",
        children: "invalid selector"
      }, undefined, false, undefined, this);
    }
  }
  function SiteEditorDialog() {
    const state = editor.value;
    const errors = useSignal({});
    const close = () => {
      const back = editor.value?.fromSettings;
      editor.value = null;
      if (back)
        settingsTab.value = "sites";
    };
    return /* @__PURE__ */ u4(Modal, {
      open: state !== null && !pickerView.value,
      title: state?.original ? "Edit site rule" : "New site rule",
      onClose: close,
      children: state && /* @__PURE__ */ u4(EditorBody, {
        state,
        errors,
        close
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  function EditorBody({
    state,
    errors,
    close
  }) {
    const { rule, pattern } = state;
    const set = (patch) => editor.value = { ...state, rule: { ...rule, ...patch } };
    const setPattern = (p5) => editor.value = { ...state, pattern: p5 };
    const err = (k2) => errors.value[k2] && /* @__PURE__ */ u4("p", {
      class: "err",
      children: errors.value[k2]
    }, undefined, false, undefined, this);
    const patternOk = parsePattern(pattern) !== null;
    const matchesHere = patternOk && scorePattern(pattern, location) !== null;
    const save = () => {
      const parsed = safeParse(SiteRuleSchema, rule);
      const next = {};
      if (!parsed.success) {
        for (const issue of parsed.issues)
          next[String(issue.path?.[0]?.key ?? "_")] = issue.message;
      }
      if (!patternOk)
        next.pattern = "Use a domain such as example.com or *.example.com/login";
      errors.value = next;
      if (!parsed.success || !patternOk)
        return;
      store.saveSite(pattern.trim(), parsed.output, state.original);
      toast("Saved. Solving now…");
      close();
    };
    const selectorField = (key, label, help) => /* @__PURE__ */ u4("div", {
      class: "field",
      children: [
        /* @__PURE__ */ u4("label", {
          for: `ucs-${key}`,
          children: [
            label,
            " ",
            matchChip(rule[key], key === "tiles")
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "row",
          children: [
            /* @__PURE__ */ u4("input", {
              id: `ucs-${key}`,
              class: "grow mono",
              type: "text",
              spellcheck: false,
              value: rule[key] ?? "",
              onInput: (e4) => set({ [key]: e4.currentTarget.value })
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn sm",
              onClick: () => void repick(key),
              children: [
                /* @__PURE__ */ u4(Icon, {
                  name: "target",
                  size: 14
                }, undefined, false, undefined, this),
                " Pick"
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        help && /* @__PURE__ */ u4("p", {
          class: "hint",
          children: help
        }, undefined, false, undefined, this),
        err(key)
      ]
    }, undefined, true, undefined, this);
    const n3 = (value) => value === "" ? Number.NaN : Number(value);
    const kind = rule.kind ?? "text";
    const grid = kind === "grid";
    return /* @__PURE__ */ u4("div", {
      class: "body",
      children: [
        /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-pattern",
              children: [
                "Applies to ",
                matchesHere && /* @__PURE__ */ u4("span", {
                  class: "chip ok",
                  children: "this page"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("input", {
              id: "ucs-pattern",
              class: "mono",
              type: "text",
              spellcheck: false,
              value: pattern,
              onInput: (e4) => setPattern(e4.currentTarget.value)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "chips",
              children: [
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  onClick: () => setPattern(location.hostname),
                  children: "Whole site"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  onClick: () => setPattern(`${location.hostname}${location.pathname}`),
                  children: "This page only"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  onClick: () => setPattern(`*.${location.hostname.replace(/^www\./, "")}`),
                  children: "All subdomains"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            err("pattern")
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-kind",
              children: "Captcha type"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("select", {
              id: "ucs-kind",
              value: kind,
              onChange: (e4) => set({ kind: e4.currentTarget.value }),
              children: [
                /* @__PURE__ */ u4("option", {
                  value: "text",
                  children: "Distorted text"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("option", {
                  value: "math",
                  children: "Arithmetic (3 + 4)"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("option", {
                  value: "grid",
                  children: "Image grid (click the matching tiles)"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        grid ? /* @__PURE__ */ u4(x, {
          children: [
            selectorField("captcha", "Grid image", "The whole picture sent to the model, with tile numbers drawn on."),
            selectorField("tiles", "Tiles (optional)", "Pick one tile; it widens to all of them. Empty = click by position over the image."),
            selectorField("instruction", "Challenge text", 'The "Select all images with…" text. Or put it in the hint.'),
            selectorField("submit", "Verify button (optional)", "Clicked after the tiles. Leave empty to verify yourself."),
            /* @__PURE__ */ u4("div", {
              class: "grid2",
              children: /* @__PURE__ */ u4("div", {
                class: "field",
                children: [
                  /* @__PURE__ */ u4("label", {
                    for: "ucs-grid",
                    children: "Tiles per side (0 = auto)"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ u4("input", {
                    id: "ucs-grid",
                    type: "number",
                    min: 0,
                    max: 8,
                    value: rule.gridSize ?? 0,
                    onInput: (e4) => set({ gridSize: n3(e4.currentTarget.value) })
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            }, undefined, false, undefined, this),
            err("gridSize"),
            /* @__PURE__ */ u4("div", {
              class: "field",
              children: [
                /* @__PURE__ */ u4("label", {
                  for: "ucs-hint",
                  children: "Extra hint for the model"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("input", {
                  id: "ucs-hint",
                  type: "text",
                  maxLength: 200,
                  placeholder: "e.g. Count bicycles even when partly hidden",
                  value: rule.hint ?? "",
                  onInput: (e4) => set({ hint: e4.currentTarget.value })
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ u4(x, {
          children: [
            selectorField("captcha", "Captcha image"),
            selectorField("input", "Answer box"),
            selectorField("submit", "Submit button (optional)", "Clicked after a successful fill. Leave empty to submit yourself.")
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("label", {
          class: "check",
          children: [
            /* @__PURE__ */ u4("input", {
              type: "checkbox",
              checked: rule.auto ?? true,
              onChange: (e4) => set({ auto: e4.currentTarget.checked })
            }, undefined, false, undefined, this),
            "Solve automatically on this site"
          ]
        }, undefined, true, undefined, this),
        !grid && /* @__PURE__ */ u4("details", {
          children: [
            /* @__PURE__ */ u4("summary", {
              children: "Advanced: accuracy tuning"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "body",
              style: { padding: 0 },
              children: [
                /* @__PURE__ */ u4("div", {
                  class: "grid2",
                  children: [
                    /* @__PURE__ */ u4("div", {
                      class: "field",
                      children: [
                        /* @__PURE__ */ u4("label", {
                          for: "ucs-charset",
                          children: "Characters"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ u4("select", {
                          id: "ucs-charset",
                          value: rule.charset ?? "alnum",
                          onChange: (e4) => set({ charset: e4.currentTarget.value }),
                          children: [
                            /* @__PURE__ */ u4("option", {
                              value: "alnum",
                              children: "Letters + digits"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("option", {
                              value: "alpha",
                              children: "Letters only"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("option", {
                              value: "digits",
                              children: "Digits only"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("option", {
                              value: "any",
                              children: "Anything"
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u4("div", {
                      class: "field",
                      children: [
                        /* @__PURE__ */ u4("label", {
                          for: "ucs-case",
                          children: "Letter case"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ u4("select", {
                          id: "ucs-case",
                          value: rule.caseMode ?? "keep",
                          onChange: (e4) => set({ caseMode: e4.currentTarget.value }),
                          children: [
                            /* @__PURE__ */ u4("option", {
                              value: "keep",
                              children: "As read"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("option", {
                              value: "upper",
                              children: "UPPERCASE"
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("option", {
                              value: "lower",
                              children: "lowercase"
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u4("div", {
                      class: "field",
                      children: [
                        /* @__PURE__ */ u4("label", {
                          for: "ucs-min",
                          children: "Length (min – max, 0 = any)"
                        }, undefined, false, undefined, this),
                        /* @__PURE__ */ u4("div", {
                          class: "row",
                          children: [
                            /* @__PURE__ */ u4("input", {
                              id: "ucs-min",
                              type: "number",
                              min: 1,
                              max: 32,
                              value: rule.minLength ?? 3,
                              onInput: (e4) => set({ minLength: n3(e4.currentTarget.value) })
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("input", {
                              "aria-label": "Maximum length",
                              type: "number",
                              min: 0,
                              max: 64,
                              value: rule.maxLength ?? 0,
                              onInput: (e4) => set({ maxLength: n3(e4.currentTarget.value) })
                            }, undefined, false, undefined, this)
                          ]
                        }, undefined, true, undefined, this)
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                err("minLength"),
                err("maxLength"),
                /* @__PURE__ */ u4("div", {
                  class: "field",
                  children: [
                    /* @__PURE__ */ u4("label", {
                      for: "ucs-hint",
                      children: "Extra hint for the model"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u4("input", {
                      id: "ucs-hint",
                      type: "text",
                      maxLength: 200,
                      placeholder: "e.g. Ignore the strike-through line",
                      value: rule.hint ?? "",
                      onInput: (e4) => set({ hint: e4.currentTarget.value })
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "footer",
          children: [
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn",
              onClick: close,
              children: "Cancel"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn primary",
              onClick: save,
              children: "Save"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }

  // src/ui/styles.css
  var styles_default = `:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  --bg: #fff; --bg-sub: #f5f5f4; --fg: #1c1917; --fg-dim: #78716c; --line: #e7e5e4;
  --accent: #2563eb; --accent-fg: #fff; --ok: #16a34a; --warn: #d97706; --err: #dc2626;
  --shadow: 0 6px 24px rgb(0 0 0 / .14), 0 1px 3px rgb(0 0 0 / .1);
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--fg);
}
@media (prefers-color-scheme: dark) {
  :host {
    --bg: #1c1917; --bg-sub: #292524; --fg: #f5f5f4; --fg-dim: #a8a29e; --line: #44403c;
    --accent: #60a5fa; --accent-fg: #0c0a09; --shadow: 0 6px 24px rgb(0 0 0 / .5);
  }
}
*, *::before, *::after { box-sizing: border-box; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
a { color: var(--accent); }

/* ── Widget ───────────────────────────── */
.widget {
  position: fixed; right: 20px; bottom: 20px; pointer-events: auto;
  display: flex; align-items: center; gap: 8px; max-width: min(92vw, 420px);
  padding: 6px 6px 6px 8px; background: var(--bg); border: 1px solid var(--line);
  border-radius: 999px; box-shadow: var(--shadow); user-select: none; touch-action: none;
}
.widget.min { padding: 6px; }
.grip { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; background: none; cursor: grab; }
.grip:active { cursor: grabbing; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--fg-dim); transition: background .2s; }
[data-phase='solving'] .dot { background: var(--warn); animation: pulse 1s ease-in-out infinite; }
[data-phase='solved'] .dot { background: var(--ok); }
[data-phase='error'] .dot, [data-phase='paused'] .dot { background: var(--err); }
@keyframes pulse { 50% { opacity: .35; transform: scale(.8); } }
@media (prefers-reduced-motion: reduce) { [data-phase='solving'] .dot { animation: none; } }
.status { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fg-dim); }
.status.answer { font-family: var(--mono); font-weight: 600; font-size: 14px; letter-spacing: .06em; color: var(--fg); background: none; border: 0; padding: 0 2px; cursor: copy; }
.status small { font: 11px var(--mono); color: var(--fg-dim); margin-left: 6px; letter-spacing: 0; }
.status .warn { color: var(--warn); margin-left: 4px; }

/* ── Controls ─────────────────────────── */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg); font-weight: 500; white-space: nowrap; }
.btn:hover { background: var(--bg-sub); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
.btn.primary:hover { filter: brightness(1.08); }
.btn.danger { color: var(--err); }
.btn:disabled { opacity: .5; cursor: default; }
.btn.sm { height: 26px; padding: 0 10px; font-size: 12px; }
.icon { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 50%; background: none; color: var(--fg-dim); }
.icon:hover { background: var(--bg-sub); color: var(--fg); }

/* ── Dialog ───────────────────────────── */
dialog.modal { pointer-events: auto; padding: 0; width: min(560px, calc(100vw - 24px)); max-height: min(720px, calc(100vh - 24px)); border: 1px solid var(--line); border-radius: 14px; background: var(--bg); color: var(--fg); box-shadow: var(--shadow); overflow: hidden; }
dialog.modal[open] { display: flex; flex-direction: column; }
dialog.modal::backdrop { background: rgb(0 0 0 / .4); backdrop-filter: blur(2px); }
.modal header { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--line); }
.modal h2 { margin: 0; font-size: 14px; font-weight: 600; }
.body { padding: 16px 18px 18px; overflow: auto; display: flex; flex-direction: column; gap: 14px; }
.tabs { display: flex; gap: 2px; padding: 0 12px; border-bottom: 1px solid var(--line); }
.tab { padding: 9px 10px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--fg-dim); font-weight: 500; }
.tab[aria-selected='true'] { color: var(--fg); border-bottom-color: var(--accent); }
.footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

/* ── Forms ────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 5px; }
.field > label, .label { font-size: 12px; font-weight: 500; color: var(--fg-dim); }
.row { display: flex; gap: 8px; align-items: center; }
.row > .grow { flex: 1; min-width: 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
input[type='text'], input[type='password'], input[type='number'], input[type='url'], select {
  width: 100%; height: 34px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg-sub);
}
input.mono { font-family: var(--mono); font-size: 12px; }
input:focus, select:focus { background: var(--bg); border-color: var(--accent); outline: none; }
.hint { font-size: 12px; color: var(--fg-dim); margin: 0; }
.err { font-size: 12px; color: var(--err); margin: 0; }
.chip { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; background: var(--bg-sub); color: var(--fg-dim); white-space: nowrap; }
.chip.ok { color: var(--ok); } .chip.bad { color: var(--err); } .chip.warn { color: var(--warn); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { border: 1px solid var(--line); background: var(--bg); border-radius: 999px; padding: 2px 10px; font-size: 12px; }
.chips button:hover { background: var(--bg-sub); }
.seg { border: 0; margin: 0; min-width: 0; display: grid; grid-auto-flow: column; gap: 4px; padding: 3px; border-radius: 10px; background: var(--bg-sub); }
.seg button { height: 28px; border: 0; border-radius: 8px; background: none; font-weight: 500; color: var(--fg-dim); }
.seg button[aria-pressed='true'] { background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgb(0 0 0 / .12); }
.check { display: flex; gap: 8px; align-items: center; }
.check input { width: 16px; height: 16px; accent-color: var(--accent); }
details summary { cursor: pointer; font-weight: 500; color: var(--fg-dim); }
details[open] summary { margin-bottom: 10px; }
.result { padding: 8px 10px; border-radius: 8px; background: var(--bg-sub); font-size: 12px; }
.result.ok { color: var(--ok); } .result.bad { color: var(--err); }

/* ── Site list ────────────────────────── */
.site { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; }
.site.off { opacity: .55; }
.site .pat { font: 600 12px var(--mono); overflow-wrap: anywhere; }
.site .sel { grid-column: 1; font: 11px var(--mono); color: var(--fg-dim); overflow-wrap: anywhere; }
.site .acts { grid-row: 1 / span 2; grid-column: 2; display: flex; align-items: center; gap: 2px; }
.empty { text-align: center; padding: 22px 8px; color: var(--fg-dim); }

/* ── Picker ───────────────────────────── */
.pk-box { position: fixed; pointer-events: none; border: 2px solid var(--accent); background: color-mix(in srgb, var(--accent) 16%, transparent); border-radius: 3px; transition: all .06s linear; }
.pk-bar { position: fixed; top: 12px; left: 50%; translate: -50% 0; pointer-events: auto; display: flex; flex-direction: column; gap: 4px; width: min(560px, calc(100vw - 24px)); padding: 10px 12px; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); }
.pk-bar .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-weight: 600; }
.pk-bar code { font: 12px var(--mono); overflow-wrap: anywhere; color: var(--fg-dim); }

/* ── Toasts ───────────────────────────── */
.toasts { position: fixed; inset: auto 16px 76px auto; margin: 0; padding: 0; border: 0; background: none; overflow: visible; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; pointer-events: none; }
.toasts:not(:popover-open) { display: none; }
.toast { pointer-events: auto; display: flex; align-items: center; gap: 10px; max-width: min(92vw, 380px); padding: 9px 14px; border-radius: 10px; background: #1c1917; color: #fafaf9; box-shadow: var(--shadow); }
.toast.error { background: var(--err); color: #fff; }
.toast button { border: 0; background: none; color: #93c5fd; font-weight: 600; padding: 0; }
`;

  // src/ui/widget.tsx
  var clamp = (n3, lo, hi) => Math.max(lo, Math.min(n3, Math.max(lo, hi)));
  function Widget() {
    const ref = T2(null);
    const drag = T2(null);
    const match = controller.match.value;
    if (!match || IN_FRAME && !controller.present.value)
      return null;
    const { status } = controller;
    const st = status.value;
    const ui = store.settings.value.ui;
    const disabled = !match.rule.enabled;
    const onDown = (e4) => {
      const r4 = ref.current?.getBoundingClientRect();
      if (!r4)
        return;
      drag.current = { dx: e4.clientX - r4.left, dy: e4.clientY - r4.top, moved: false };
      e4.currentTarget.setPointerCapture(e4.pointerId);
    };
    const onMove = (e4) => {
      const el = ref.current;
      const d4 = drag.current;
      if (!el || !d4)
        return;
      d4.moved ||= Math.hypot(e4.movementX, e4.movementY) > 0;
      const x4 = clamp(e4.clientX - d4.dx, 4, innerWidth - el.offsetWidth - 4);
      const y5 = clamp(e4.clientY - d4.dy, 4, innerHeight - el.offsetHeight - 4);
      Object.assign(el.style, { left: `${x4}px`, top: `${y5}px`, right: "auto", bottom: "auto" });
    };
    const onUp = () => {
      const el = ref.current;
      const d4 = drag.current;
      drag.current = null;
      if (!el || !d4)
        return;
      if (d4.moved) {
        const r4 = el.getBoundingClientRect();
        store.patchUi({ x: Math.round(r4.left), y: Math.round(r4.top) });
      } else if (ui.minimized) {
        store.patchUi({ minimized: false });
      }
    };
    const copy = () => st.answer && navigator.clipboard?.writeText(st.answer).then(() => toast("Copied"), () => toast("Copy failed", "error"));
    const pos = ui.x !== undefined && ui.y !== undefined ? {
      left: `${clamp(ui.x, 4, innerWidth - 60)}px`,
      top: `${clamp(ui.y, 4, innerHeight - 44)}px`,
      right: "auto",
      bottom: "auto"
    } : undefined;
    const grip = /* @__PURE__ */ u4("button", {
      type: "button",
      class: "grip",
      "aria-label": ui.minimized ? `Captcha solver: ${st.text}. Click to expand` : "Drag to move",
      onPointerDown: onDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      children: /* @__PURE__ */ u4("span", {
        class: "dot"
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
    if (ui.minimized) {
      return /* @__PURE__ */ u4("div", {
        ref,
        class: "widget min",
        "data-phase": st.phase,
        style: pos,
        children: grip
      }, undefined, false, undefined, this);
    }
    return /* @__PURE__ */ u4("div", {
      ref,
      class: "widget",
      "data-phase": disabled ? "idle" : st.phase,
      style: pos,
      children: [
        grip,
        disabled ? /* @__PURE__ */ u4("span", {
          class: "status",
          children: "Off on this site"
        }, undefined, false, undefined, this) : st.phase === "solved" ? /* @__PURE__ */ u4("button", {
          type: "button",
          class: "status answer",
          title: "Click to copy",
          onClick: copy,
          children: [
            st.answer,
            /* @__PURE__ */ u4("small", {
              children: [
                st.ms,
                " ms"
              ]
            }, undefined, true, undefined, this),
            st.warning && /* @__PURE__ */ u4("span", {
              class: "warn",
              title: st.warning,
              children: "⚠"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ u4("span", {
          class: "status",
          role: "status",
          "aria-live": "polite",
          title: st.text,
          children: st.text
        }, undefined, false, undefined, this),
        disabled ? /* @__PURE__ */ u4("button", {
          type: "button",
          class: "btn sm",
          onClick: () => store.saveSite(match.pattern, { ...match.rule, enabled: true }),
          children: "Enable"
        }, undefined, false, undefined, this) : st.action === "settings" ? /* @__PURE__ */ u4("button", {
          type: "button",
          class: "btn primary sm",
          onClick: () => settingsTab.value = "provider",
          children: "Fix"
        }, undefined, false, undefined, this) : /* @__PURE__ */ u4("button", {
          type: "button",
          class: "btn primary sm",
          disabled: st.phase === "solving",
          onClick: () => void controller.solve("manual"),
          children: st.phase === "error" || st.phase === "paused" ? "Retry" : "Solve"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("button", {
          type: "button",
          class: "icon",
          "aria-label": "Settings",
          onClick: () => settingsTab.value = "sites",
          children: /* @__PURE__ */ u4(Icon, {
            name: "sliders"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("button", {
          type: "button",
          class: "icon",
          "aria-label": "Minimize",
          onClick: () => store.patchUi({ minimized: true }),
          children: /* @__PURE__ */ u4(Icon, {
            name: "minus"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }

  // src/ui/mount.tsx
  var mounted = false;
  function App() {
    return /* @__PURE__ */ u4(x, {
      children: [
        /* @__PURE__ */ u4(Widget, {}, undefined, false, undefined, this),
        /* @__PURE__ */ u4(SettingsDialog, {}, undefined, false, undefined, this),
        /* @__PURE__ */ u4(SiteEditorDialog, {}, undefined, false, undefined, this),
        /* @__PURE__ */ u4(PickerOverlay, {}, undefined, false, undefined, this),
        /* @__PURE__ */ u4(Toasts, {}, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  function mountUI() {
    if (mounted)
      return;
    mounted = true;
    const host = document.createElement(UI_HOST_TAG);
    const root = host.attachShadow({ mode: "open" });
    try {
      const sheet = new CSSStyleSheet;
      sheet.replaceSync(styles_default);
      root.adoptedStyleSheets = [sheet];
    } catch {
      root.append(Object.assign(document.createElement("style"), { textContent: styles_default }));
    }
    document.documentElement.append(host);
    K(/* @__PURE__ */ u4(App, {}, undefined, false, undefined, this), root);
  }

  // src/main.ts
  function main() {
    const migrated = migrateV1(gmKV);
    if (migrated.sites || migrated.apiKey)
      store.reload();
    const open = (fn) => () => {
      mountUI();
      fn();
    };
    if (!IN_FRAME) {
      GM_registerMenuCommand("⚙ Settings", open(() => settingsTab.value = "provider"), "s");
      GM_registerMenuCommand("\uD83C\uDFAF Configure captcha on this page", open(() => void configureCurrentPage()), "c");
      GM_registerMenuCommand("\uD83E\uDDE9 Configure image-grid captcha on this page", open(() => void configureGridPage()), "g");
      GM_registerMenuCommand("▶ Solve now", open(() => void controller.solve("manual")), "r");
    }
    for (const key of [KEYS.settings, KEYS.sites]) {
      GM_addValueChangeListener(key, (_name, _old, _new, remote) => remote && store.reload());
    }
    window.addEventListener("keydown", (e4) => {
      if (!e4.altKey || !e4.shiftKey || e4.ctrlKey || e4.metaKey)
        return;
      if (e4.code === "KeyS")
        open(() => void controller.solve("manual"))();
      else if (e4.code === "KeyC")
        open(() => void configureCurrentPage())();
      else if (e4.code === "KeyG")
        open(() => void configureGridPage())();
      else
        return;
      e4.preventDefault();
    });
    j2(() => {
      if (controller.match.value && (!IN_FRAME || controller.present.value))
        mountUI();
    });
    controller.start();
    if (migrated.sites || migrated.apiKey) {
      mountUI();
      toast(`Upgraded from v1: imported ${migrated.sites} site rule(s). Pick a model in Settings.`);
    }
  }
  main();
})();
