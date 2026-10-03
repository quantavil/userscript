// Universal Captcha Solver 2.5.0. Copyright (C) quantavil.
// Licensed under GPL-3.0-or-later: https://github.com/quantavil/userscript/blob/main/universal-captcha-solver/LICENSE
// This program comes with ABSOLUTELY NO WARRANTY.
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
  function b(n) {
    n && n.parentNode && n.remove();
  }
  function M(i, r, u, f, o) {
    var e = { type: i, props: r, key: u, ref: f, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: o || ++t, __i: -1, __u: 0 };
    return !o && n.vnode && n.vnode(e), e;
  }
  function x(n) {
    return n.children;
  }
  function S(n, t) {
    this.props = n, this.context = t, this.__g = 0;
  }
  function C(n, t) {
    if (t == null)
      return n.__ ? C(n.__, n.__i + 1) : null;
    for (var i;t < n.__k.length; t++)
      if ((i = n.__k[t]) && i.__e)
        return i.__e;
    return typeof n.type != "function" || n.props.__P ? null : C(n);
  }
  function j(n) {
    if ((n = n.__) && n.__c && !n.props.__P)
      return n.__e = null, n.__k.some(function(t) {
        return t && (n.__e = t.__e);
      }), j(n);
  }
  function L(t) {
    (8 & t.__g || !(t.__g |= 8) || !r.push(t) || f++) && u == n.debounceRendering || ((u = n.debounceRendering) || queueMicrotask)(H);
  }
  function H() {
    var t, i, u, e, l, c, a, s, h;
    try {
      for (i = 1;r.length; )
        r.length > i && r.sort(o), t = r.shift(), i = r.length, 8 & t.__g && (e = undefined, l = undefined, c = (l = (u = t).__v).__e, a = [], s = [], (h = u.__P) && ((e = g({ constructor: undefined }, l)).__v = l.__v + 1, n.vnode && n.vnode(e), z(h, e, l, u.__n, h.namespaceURI, 32 & l.__u ? [c] : null, a, c || C(l), 32 & l.__u, s), e.__v = l.__v, e.__.__k[e.__i] = e, D(a, e, s), l.__ = l.__e = null, e.__e != c && j(e)));
    } finally {
      r.length = f = 0;
    }
  }
  function I(n, t, i, r, u, f, o, e, l, c, a) {
    var s, h, p, w, d, _, g = r.__k || y, b = t.length;
    for (l = A(i, t, g, l, b), s = 0;s < b; s++)
      (p = i.__k[s]) != null && (h = ~p.__i && g[p.__i] || v, p.__i = s, _ = z(n, p, h, u, f, o, e, l, c, a), w = p.__e, p.ref && (h.ref != p.ref || 8 & h.__u) && (h.ref != p.ref && h.ref && F(h.ref, null, p), a.push(p.ref, p.__c || w, p)), d = d || w, 4 & p.__u ? (l = O(p, l, n, !h.__v), h.__e && (h.__e = null)) : typeof p.type == "function" && _ !== undefined ? l = _ : w && (l = w.nextSibling), p.__u &= -7);
    return i.__e = d, l;
  }
  function A(n, t, i, r, u) {
    var f, o, e, l, c, a, s, h, p, v, y = i.length, w = y, _ = 0, g = false, b = n.__k = Array(u);
    for (f = 0;f < u; f++)
      (o = t[f]) != null && typeof o != "boolean" && typeof o != "function" ? (typeof o != "object" || o.constructor == String ? o = b[f] = M(null, o) : d(o) ? o = b[f] = M(x, { children: o }) : o.constructor === undefined && o.__b ? o = b[f] = M(o.type, o.props, o.key, o.ref, o.__v) : b[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = T(o, i, l, w)) && (w--, (e = i[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 2, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = true)) : (~c || (u > y ? _-- : u < y && _++), typeof o.type != "function" && (o.__u |= 4))) : b[f] = null;
    if (g) {
      for (a = [], s = [], f = 0;f < u; f++)
        if ((o = b[f]) && 2 & o.__u) {
          for (h = 0, p = a.length;h < p; )
            a[v = h + p >> 1] < o.__i ? h = v + 1 : p = v;
          a[h] = o.__i, s[f] = h + 1;
        }
      for (_ = a.length;f--; )
        s[f] && (s[f] == _ ? _-- : b[f].__u |= 4);
    }
    if (w)
      for (f = 0;f < y; f++)
        !(e = i[f]) || 2 & e.__u || (e.__e == r && (r = C(e)), G(e, e));
    return r;
  }
  function O(n, t, i, r) {
    var u, f;
    if (typeof n.type == "function") {
      if (n.props.__P)
        return t;
      if (u = n.__k)
        for (f = 0;f < u.length; f++)
          u[f] && (u[f].__ = n, t = O(u[f], t, i, false));
      return t;
    }
    for (t && !t.parentNode && (t = C(n)) && !t.parentNode && (t = null), n.__e != t && (!r && i.moveBefore && n.__e.parentNode ? i.moveBefore(n.__e, t) : i.insertBefore(n.__e, t || null)), t = n.__e;(t = t && t.nextSibling) && t.nodeType == 8; )
      ;
    return t;
  }
  function T(n, t, i, r) {
    var u, f, o, { key: e, type: l } = n, c = t[i], a = c && !(2 & c.__u);
    if (c === null && e == null || a && e == c.key && l == c.type)
      return i;
    if (r > (a ? 1 : 0)) {
      for (u = i - 1, f = i + 1;u >= 0 || f < t.length; )
        if ((c = t[o = u >= 0 ? u-- : f++]) && !(2 & c.__u) && e == c.key && l == c.type)
          return o;
    }
    return -1;
  }
  function q(n, t, i) {
    i == null && (i = ""), t[0] == "-" ? n.setProperty(t, i) : n[t] = i;
  }
  function N(n, t, i, r, u) {
    var f;
    n:
      if (t == "style")
        if (typeof i == "string")
          n.style.cssText = i;
        else {
          if (typeof r == "string" && (n.style.cssText = r = ""), r)
            for (t in r)
              i && t in i || q(n.style, t, "");
          if (i)
            for (t in i)
              r && i[t] == r[t] || q(n.style, t, i[t]);
        }
      else if (t[0] == "o" && t[1] == "n")
        f = t != (t = t.replace(c, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), (n.__e || (n.__e = {}))[t + f] = i, i ? r ? i[l] = r[l] : (i[l] = a, n.addEventListener(t, f ? h : s, f)) : n.removeEventListener(t, f ? h : s, f);
      else {
        if (u == "http://www.w3.org/2000/svg")
          t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if (t != "width" && t != "height" && t != "href" && t != "list" && t != "form" && t != "tabIndex" && t != "download" && t != "rowSpan" && t != "colSpan" && t != "role" && t != "popover" && t in n)
          try {
            n[t] = i == null ? "" : i;
            break n;
          } catch (n) {}
        typeof i == "function" || (i == null || i === false && t[4] != "-" ? n.removeAttribute(t) : n.setAttribute(t, t == "popover" && i == 1 ? "" : i));
      }
  }
  function V(t) {
    return function(i) {
      if (this.__e) {
        var r = this.__e[i.type + t];
        if (i[e] == null)
          i[e] = a++;
        else if (i[e] < r[l])
          return;
        return r(n.event ? n.event(i) : i);
      }
    };
  }
  function z(t, i, r, u, f, o, e, l, c, a) {
    var s, h, p, v, w, _, k, m, M, $, j, L, H, A, O, P, T, q, N, V, z = i.type;
    if (i.constructor !== undefined)
      return null;
    if (128 & r.__u && (c = 32 & r.__u, s = r.__c.__z)) {
      if (i.__u |= c, h = o = [], s.nodeType == 8)
        for (p = 1, v = s.nextSibling;v; v = v.nextSibling) {
          if (v.nodeType == 8) {
            if (v.data.startsWith("$s"))
              p++;
            else if (v.data.startsWith("/$s") && !--p)
              break;
          }
          o.push(v);
        }
      else
        o.push(s);
      l = o[0];
    }
    (s = n.__b) && s(i);
    n:
      if (typeof z == "function") {
        w = e.length;
        try {
          if ($ = i.props, j = (s = z.prototype) && s.render, L = (s = z.contextType) && u[s.__c], H = s ? L ? L.props.value : s.__ : u, r.__c ? 2 & (_ = i.__c = r.__c).__g && (_.__g |= 1) : (j ? i.__c = _ = new z($, H) : (i.__c = _ = new S($, H), _.constructor = z, _.render = J), L && L.sub(_), _.state || (_.state = {}), _.__n = u, _.__g |= 8, _.__h = [], _.__k = []), j && (_.__s || (_.__s = _.state), z.getDerivedStateFromProps && (_.__s == _.state && (_.__s = g({}, _.__s)), g(_.__s, z.getDerivedStateFromProps($, _.__s)))), k = _.props, m = _.state, _.__v = i, r.__c) {
            if (j && !z.getDerivedStateFromProps && $ !== k && _.componentWillReceiveProps && _.componentWillReceiveProps($, H), i.__v == r.__v && !(8 & _.__g) || !(4 & _.__g) && _.shouldComponentUpdate && _.shouldComponentUpdate($, _.__s, H) === false) {
              i.__v != r.__v && (_.props = $, _.state = _.__s, _.__g &= -9), i.__e = r.__e, i.__k = r.__k, i.__k.some(function(n) {
                n && (n.__ = i);
              }), y.push.apply(_.__h, _.__k), _.__k = [], _.__h.length && e.push(_), l = C(r);
              break n;
            }
            _.componentWillUpdate && _.componentWillUpdate($, _.__s, H), j && _.componentDidUpdate && _.__h.push(function() {
              _.componentDidUpdate(k, m, M);
            });
          } else
            j && !z.getDerivedStateFromProps && _.componentWillMount && _.componentWillMount(), j && _.componentDidMount && _.__h.push(_.componentDidMount);
          if (_.context = H, _.props = $, _.__P = t, _.__g &= -5, A = n.__r, O = 0, j)
            _.state = _.__s, _.__g &= -9, A && A(i), s = _.render(_.props, _.state, _.context), y.push.apply(_.__h, _.__k), _.__k = [];
          else
            do {
              _.__g &= -9, A && A(i), s = _.render(_.props, _.state, _.context), _.state = _.__s;
            } while (8 & _.__g && ++O < 25);
          _.state = _.__s, _.getChildContext && (u = g({}, u, _.getChildContext())), j && r.__c && _.getSnapshotBeforeUpdate && (M = _.getSnapshotBeforeUpdate(k, m)), P = s && s.type === x && s.key == null ? s.props.children : s, $.__P && (s = l, f = (t = $.__P).namespaceURI, c = o = null, r.props && r.props.__P != t && (r.__k.some(function(n) {
            n && G(n, n);
          }), r.__k = null), l = r.__k ? C(r, 0) : null), l = I(t, d(P) ? P : [P], i, r, u, f, o, e, l, c, a), $.__P && (i.__e = null, l = s), i.__u &= -161, 128 & r.__u && (_.__z = null), h && h.some(b), _.__h.length && e.push(_), 1 & _.__g && (_.__g &= -4);
        } catch (t) {
          if (e.length = w, i.__v = null, c || o)
            if (t.then) {
              if (T = 0, i.__u |= c ? 160 : 128, o) {
                for (N = 0;N < o.length; N++)
                  if (V = o[N])
                    if (V.nodeType == 8) {
                      if (o[N] = null, V.data.startsWith("$s"))
                        T++ || (q = V);
                      else if (V.data.startsWith("/$s") && !--T) {
                        l = V;
                        break;
                      }
                    } else
                      T && (o[N] = null);
              }
              if (!q) {
                for (;l && l.nodeType == 8 && l.nextSibling; )
                  l = l.nextSibling;
                o && (o[o.indexOf(l)] = null), q = l;
              }
              i.__c.__z || (i.__c.__z = q), i.__e = l;
            } else
              o && o.some(b);
          else
            i.__e = r.__e;
          i.__k || (i.__k = r.__k || []), t.then || B(i), n.__e(t, i, r);
        }
      } else
        l = i.__e = E(r.__e, i, r, u, f, o, e, c, a, t);
    return (s = n.diffed) && s(i), 128 & i.__u ? undefined : l;
  }
  function B(n) {
    n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(B));
  }
  function D(t, i, r) {
    for (var u = 0;u < r.length; )
      F(r[u++], r[u++], r[u++]);
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
  function E(t, i, r, u, f, o, e, l, c, a) {
    var s, h, p, y, g, k, m, M, $, x = r.props || v, { props: S, type: j } = i;
    if (j == "svg" ? f = "http://www.w3.org/2000/svg" : j == "math" ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), o) {
      for (s = 0;s < o.length; s++)
        if ((g = o[s]) && (j ? g.localName == j : g.nodeType == 3)) {
          t = g, o[s] = null;
          break;
        }
    }
    if (!t) {
      if (M = a.ownerDocument || document, !j)
        return M.createTextNode(S);
      t = M.createElementNS(f, j, S.is && S), l && (n.__m && n.__m(i, o), l = false), o = null;
    }
    if (j) {
      if (a = j == "template" ? t.content : t, o = j == "textarea" && S.defaultValue != null ? null : o && _.call(a.childNodes), !l && o)
        for (x = {}, s = 0;s < t.attributes.length; s++)
          x[(g = t.attributes[s]).name] = g.value;
      for (s in x)
        g = x[s], s == "dangerouslySetInnerHTML" ? p = g : s == "children" || (s in S) || s == "value" && ("defaultValue" in S) || s == "checked" && ("defaultChecked" in S) || N(t, s, null, g, f);
      for (s in $ = 1 & r.__u, S)
        g = S[s], s == "children" ? y = g : s == "dangerouslySetInnerHTML" ? h = g : s == "value" ? k = g : s == "checked" ? m = g : l && typeof g != "function" || !(x[s] !== g || $ && g != null) || N(t, s, g, x[s], f);
      h ? (l || p && (h.__html == p.__html || h.__html == t.innerHTML) || (t.textContent = h.__html), i.__k = []) : (p && (t.textContent = ""), (j == "foreignObject" || f == "http://www.w3.org/1998/Math/MathML" && w.test(j)) && (f = "http://www.w3.org/1999/xhtml"), I(a, d(y) ? y : [y], i, r, u, f, o, e, o ? o[0] : r.__k && C(r, 0), l, c), o && o.some(b)), l && j != "textarea" || (s = "value", j == "progress" && k == null ? t.removeAttribute(s) : k == null || k === t[s] && (j != "progress" || k) || N(t, s, k, x[s], f), s = "checked", m != null && m != t[s] && N(t, s, m, x[s], f));
    } else
      x === S || l && t.data == S || (t.data = S);
    return t;
  }
  function F(t, i, r) {
    try {
      typeof t == "function" ? (typeof t.__u == "function" && t.__u(), (typeof t.__u != "function" || i) && (t.__u = t(i))) : t.current = i;
    } catch (t) {
      n.__e(t, r);
    }
  }
  function G(t, i, r) {
    var u, f;
    if (n.unmount && n.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || F(u, null, i), u = t.__c) {
      if (u.componentWillUnmount)
        try {
          u.componentWillUnmount();
        } catch (t) {
          n.__e(t, i);
        }
      u.__P = u.__n = null;
    }
    if (u = t.__k)
      for (f = 0;f < u.length; f++)
        u[f] && G(u[f], i, typeof t.type != "function" || r && !t.props.__P);
    (u = t.__e) && (r || b(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
  }
  function J(n, t, i) {
    return this.constructor(n, i);
  }
  function K(t, i) {
    var r, u, f, o;
    n.__ && n.__(t, i), i.nodeType == 9 && (i = i.documentElement), u = (r = t && 32 & t.__u) ? null : i.__k, i.__k = M(x, { children: [t] }), f = [], o = [], z(i, i.__k, u || v, v, i.namespaceURI, u ? null : i.firstChild ? _.call(i.childNodes) : null, f, u ? u.__e : i.firstChild, r, o), D(f, i.__k, o), i.__k.props.children = null;
  }
  n = { __e: function(n, t, i, r) {
    for (var u, o, e;t = t.__; )
      if ((u = t.__c) && !(1 & u.__g)) {
        u.__g |= 4;
        try {
          if ((o = u.constructor) && o.getDerivedStateFromError && (u.setState(o.getDerivedStateFromError(n)), e = 8 & u.__g), u.componentDidCatch && (u.componentDidCatch(n, r || {}), e = 8 & u.__g), e)
            return void (u.__g |= 2);
        } catch (t) {
          n = t, e = 0;
        }
      }
    throw f = 0, n;
  } }, t = 0, i = function(n) {
    return n != null && n.constructor === undefined;
  }, S.prototype.setState = function(n, t) {
    var i = this.__s;
    i && i != this.state || (i = this.__s = g({}, this.state)), typeof n == "function" && (n = n(g({}, i), this.props)), n && (g(i, n), this.__v && (t && this.__k.push(t), L(this)));
  }, S.prototype.forceUpdate = function(n) {
    this.__v && (this.__g |= 4, n && this.__h.push(n), L(this));
  }, S.prototype.render = x, r = [], f = 0, o = function(n, t) {
    return n.__v.__b - t.__v.__b;
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
  function y2(n, t) {
    a2.__h && a2.__h(r2, n, f2 || t), f2 = 0;
    var u = r2.__H || (r2.__H = { __: [], __h: [] });
    return n >= u.__.length && u.__.push({}), u.__[n];
  }
  function A2(n, u) {
    var i = y2(t2++, 3);
    !a2.__s && E2(i.__H, u) && (i.__P = true, i.__ = n, i.u = u, r2.__H.__h.push(i));
  }
  function F2(n, u) {
    var i = y2(t2++, 4);
    !a2.__s && E2(i.__H, u) && (i.__P = false, i.__ = n, i.u = u, r2.__h.push(i));
  }
  function T2(n) {
    return f2 = 5, b2(function() {
      return { current: n };
    }, []);
  }
  function b2(n, r) {
    var u = y2(t2++, 7);
    return E2(u.__H, r) && (u.__ = n(), u.__H = r), u.__;
  }
  function g2() {
    var n;
    do {
      for (;n = e2.shift(); )
        try {
          C2(n);
        } catch (t) {
          a2.__e(t, { __: (n = n.__P) && n.__v });
        }
      for (;n = c2.shift(); ) {
        var t = n.__H;
        if (n.__P && t)
          try {
            t.__h.some(C2), t.__h.some(D2), t.__h = [];
          } catch (r) {
            t.__h = [], a2.__e(r, n.__v);
          }
      }
    } while (e2.length);
  }
  a2.__b = function(n) {
    r2 = null, v2 && v2(n);
  }, a2.__ = function(n, t) {
    n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p2 && p2(n, t);
  }, a2.__r = function(n) {
    l2 && l2(n), t2 = 0;
    var i = (r2 = n.__c).__H;
    i && (u2 == r2 ? r2.__h = [] : (i.__h.some(C2), i.__h.some(D2), t2 = 0), i.__h = [], i.__.some(function(n) {
      n.__N && (n.__ = n.__N), n.u = n.__N = undefined;
    })), u2 = r2;
  }, a2.diffed = function(n) {
    m && m(n);
    var t = n.__c;
    t && t.__H && (t.__H.__h.length && B2(c2.push(t)), t.__H.__.some(function(n) {
      n.u && (n.__H = n.u);
    })), u2 = r2 = null;
  }, a2.__c = function(n, t) {
    t.some(function(n) {
      try {
        n.__h.some(C2), n.__h = n.__h.filter(function(n) {
          return !n.__ || D2(n);
        });
      } catch (r) {
        t.some(function(n) {
          n.__h && (n.__h = []);
        }), t = [], a2.__e(r, n.__v);
      }
    }), s2 && s2(n, t);
  }, a2.unmount = function(n) {
    h2 && h2(n);
    var t, r, u = n.__c;
    u && u.__H && (u.__H.__.some(function(u) {
      try {
        if (u.__P && u.__c) {
          if (r === undefined) {
            for (r = n.__;r && (!r.__c || !r.__c.__P); )
              r = r.__;
            r = r && r.__c;
          }
          u.__P = r, B2(e2.push(u));
        } else
          C2(u);
      } catch (n) {
        t = n;
      }
    }), u.__H = undefined, t && a2.__e(t, u.__v));
  };
  var k = typeof requestAnimationFrame == "function";
  function z2(n) {
    var t, r = function() {
      clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
    }, u = setTimeout(r, 35);
    k && (t = requestAnimationFrame(r));
  }
  function B2(n) {
    n != 1 && i2 == a2.requestAnimationFrame || ((i2 = a2.requestAnimationFrame) || z2)(g2);
  }
  function C2(n) {
    var t = r2, u = n.__c;
    typeof u == "function" && (n.__c = undefined, u()), r2 = t;
  }
  function D2(n) {
    var t = r2;
    n.__c = n.__(), r2 = t;
  }
  function E2(n, t) {
    return !n || n.length != t.length || t.some(function(t, r) {
      return !o2(t, n[r]);
    });
  }

  // node_modules/@preact/signals-core/dist/signals-core.module.js
  var i3 = Symbol.for("preact-signals");
  function t3() {
    if (!(v3 > 1)) {
      var i, t = false;
      (function() {
        var i = c3;
        c3 = undefined;
        while (i !== undefined) {
          var t = i.S;
          if (t.v === i.v) {
            for (var n = t.t;n !== undefined; n = n.x)
              if (n.i === i.i)
                n.i = t.i;
          }
          i = i.o;
        }
      })();
      while (h3 !== undefined) {
        var n = h3;
        h3 = undefined;
        s3++;
        while (n !== undefined) {
          var r = n.u;
          n.u = undefined;
          n.f &= -3;
          if (!(8 & n.f) && w2(n))
            try {
              n.c();
            } catch (n) {
              if (!t) {
                i = n;
                t = true;
              }
            }
          n = r;
        }
      }
      s3 = 0;
      v3--;
      if (t)
        throw i;
    } else
      v3--;
  }
  function n2(i) {
    if (v3 > 0)
      return i();
    e3 = ++u3;
    v3++;
    try {
      return i();
    } finally {
      t3();
    }
  }
  var r3;
  var o3 = undefined;
  function f3(i) {
    var t = o3, n = r3;
    o3 = undefined;
    r3 = undefined;
    try {
      return i();
    } finally {
      o3 = t;
      r3 = n;
    }
  }
  var h3 = undefined;
  var v3 = 0;
  var s3 = 0;
  var u3 = 0;
  var e3 = 0;
  var c3 = undefined;
  var d2 = 0;
  function a3(i) {
    if (o3 !== undefined) {
      var t = i.n;
      if (t === undefined || t.t !== o3) {
        t = { i: 0, S: i, p: o3.s, n: undefined, t: o3, e: undefined, x: undefined, r: t };
        if (o3.s !== undefined)
          o3.s.n = t;
        o3.s = t;
        i.n = t;
        if (32 & o3.f)
          i.S(t);
        return t;
      } else if (t.i === -1) {
        t.i = 0;
        if (t.n !== undefined) {
          t.n.p = t.p;
          if (t.p !== undefined)
            t.p.n = t.n;
          t.p = o3.s;
          t.n = undefined;
          o3.s.n = t;
          o3.s = t;
        }
        return t;
      }
    }
  }
  function l3(i, t) {
    this.v = i;
    this.i = 0;
    this.n = undefined;
    this.t = undefined;
    this.l = 0;
    this.W = t == null ? undefined : t.watched;
    this.Z = t == null ? undefined : t.unwatched;
    this.name = t == null ? undefined : t.name;
  }
  l3.prototype.brand = i3;
  l3.prototype.h = function() {
    return true;
  };
  l3.prototype.S = function(i) {
    var t = this, n = this.t;
    if (n !== i && i.e === undefined) {
      i.x = n;
      this.t = i;
      if (n !== undefined)
        n.e = i;
      else
        f3(function() {
          var i;
          (i = t.W) == null || i.call(t);
        });
    }
  };
  l3.prototype.U = function(i) {
    var t = this;
    if (this.t !== undefined) {
      var { e: n, x: r } = i;
      if (n !== undefined) {
        n.x = r;
        i.e = undefined;
      }
      if (r !== undefined) {
        r.e = n;
        i.x = undefined;
      }
      if (i === this.t) {
        this.t = r;
        if (r === undefined)
          f3(function() {
            var i;
            (i = t.Z) == null || i.call(t);
          });
      }
    }
  };
  l3.prototype.subscribe = function(i) {
    var t = this;
    return j2(function() {
      var n = t.value;
      f3(function() {
        return i(n);
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
    var i = this;
    return f3(function() {
      return i.value;
    });
  };
  Object.defineProperty(l3.prototype, "value", { get: function() {
    var i = a3(this);
    if (i !== undefined)
      i.i = this.i;
    return this.v;
  }, set: function(i) {
    if (i !== this.v) {
      if (s3 > 100)
        throw new Error("Cycle detected");
      (function(i) {
        if (v3 !== 0 && s3 === 0) {
          if (i.l !== e3) {
            i.l = e3;
            c3 = { S: i, v: i.v, i: i.i, o: c3 };
          }
        }
      })(this);
      this.v = i;
      this.i++;
      d2++;
      v3++;
      try {
        for (var n = this.t;n !== undefined; n = n.x)
          n.t.N();
      } finally {
        t3();
      }
    }
  } });
  function y3(i, t) {
    return new l3(i, t);
  }
  function w2(i) {
    for (var t = i.s;t !== undefined; t = t.n)
      if (t.S.i !== t.i || !t.S.h() || t.S.i !== t.i)
        return true;
    return false;
  }
  function _2(i) {
    for (var t = i.s;t !== undefined; t = t.n) {
      var n = t.S.n;
      if (n !== undefined)
        t.r = n;
      t.S.n = t;
      t.i = -1;
      if (t.n === undefined) {
        i.s = t;
        break;
      }
    }
  }
  function b3(i) {
    var t = i.s, n = undefined;
    while (t !== undefined) {
      var r = t.p;
      if (t.i === -1) {
        t.S.U(t);
        if (r !== undefined)
          r.n = t.n;
        if (t.n !== undefined)
          t.n.p = r;
      } else
        n = t;
      t.S.n = t.r;
      if (t.r !== undefined)
        t.r = undefined;
      t = r;
    }
    i.s = n;
  }
  function p3(i, t) {
    l3.call(this, undefined, t);
    this.x = i;
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
    var i = o3;
    try {
      _2(this);
      o3 = this;
      var t = this.x();
      if (16 & this.f || this.v !== t || this.i === 0) {
        this.v = t;
        this.f &= -17;
        this.i++;
      }
    } catch (i) {
      this.v = i;
      this.f |= 16;
      this.i++;
    }
    o3 = i;
    b3(this);
    this.f &= -2;
    return true;
  };
  p3.prototype.S = function(i) {
    if (this.t === undefined) {
      this.f |= 36;
      for (var t = this.s;t !== undefined; t = t.n)
        t.S.S(t);
    }
    l3.prototype.S.call(this, i);
  };
  p3.prototype.U = function(i) {
    if (this.t !== undefined) {
      l3.prototype.U.call(this, i);
      if (this.t === undefined) {
        this.f &= -33;
        for (var t = this.s;t !== undefined; t = t.n)
          t.S.U(t);
      }
    }
  };
  p3.prototype.N = function() {
    if (!(2 & this.f)) {
      this.f |= 6;
      for (var i = this.t;i !== undefined; i = i.x)
        i.t.N();
    }
  };
  Object.defineProperty(p3.prototype, "value", { get: function() {
    if (1 & this.f)
      throw new Error("Cycle detected");
    var i = a3(this);
    this.h();
    if (i !== undefined)
      i.i = this.i;
    if (16 & this.f)
      throw this.v;
    return this.v;
  } });
  function g3(i, t) {
    return new p3(i, t);
  }
  function S2(i) {
    var n = i.m;
    i.m = undefined;
    if (typeof n == "function") {
      v3++;
      var r = o3;
      o3 = undefined;
      try {
        n();
      } catch (t) {
        i.f &= -2;
        i.f |= 8;
        m2(i);
        throw t;
      } finally {
        o3 = r;
        t3();
      }
    }
  }
  function m2(i) {
    for (var t = i.s;t !== undefined; t = t.n)
      t.S.U(t);
    i.x = undefined;
    i.s = undefined;
    S2(i);
  }
  function x2(i) {
    if (o3 !== this)
      throw new Error("Out-of-order effect");
    b3(this);
    o3 = i;
    this.f &= -2;
    if (8 & this.f)
      m2(this);
    t3();
  }
  function E3(i, t) {
    this.x = i;
    this.m = undefined;
    this.s = undefined;
    this.u = undefined;
    this.f = 32;
    this.name = t == null ? undefined : t.name;
    if (r3)
      r3.push(this);
  }
  E3.prototype.c = function() {
    var i = this.S();
    try {
      if (8 & this.f)
        return;
      if (this.x === undefined)
        return;
      var t = this.x();
      if (typeof t == "function")
        this.m = t;
    } finally {
      i();
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
    var i = o3;
    o3 = this;
    return x2.bind(this, i);
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
  function j2(i, t) {
    var n = new E3(i, t);
    try {
      n.c();
    } catch (i) {
      n.d();
      throw i;
    }
    var r = n.d.bind(n);
    r[Symbol.dispose] = r;
    return r;
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
  function g4(i, r) {
    n[i] = r.bind(null, n[i] || function() {});
  }
  function b4(i) {
    if (d3) {
      var n2 = d3;
      d3 = undefined;
      n2();
    }
    d3 = i && i.S();
  }
  function y4(i2) {
    var n2 = this, t = i2.data, f = useSignal(t);
    f.name = "ReactiveDom";
    f.value = t;
    var e = b2(function() {
      var i2 = n2, t = n2.__v;
      while (t = t.__)
        if (t.__c) {
          t.__c.__$f |= 4;
          break;
        }
      var o = g3(function() {
        var i2 = f.value.value;
        return i2 === 0 ? 0 : i2 === true ? "" : i2 || "";
      }), e = g3(function() {
        return !Array.isArray(o.value) && !i(o.value);
      }), a = j2(function() {
        this.N = F3;
        if (e.value) {
          var n2 = o.value;
          if (i2.__v && i2.__v.__e && i2.__v.__e.nodeType === 3)
            i2.__v.__e.data = n2;
        }
      }), v = n2.__$u.d;
      n2.__$u.d = function() {
        a();
        v.call(this);
      };
      return [e, o];
    }, []), a = e[0], v = e[1];
    return a.value ? v.peek() : v.value;
  }
  y4.displayName = "ReactiveTextNode";
  Object.defineProperties(l3.prototype, { constructor: { configurable: true, value: undefined }, type: { configurable: true, value: y4 }, props: { configurable: true, get: function() {
    var i = this;
    return { data: { get value() {
      return i.value;
    } } };
  } }, __b: { configurable: true, value: 1 } });
  g4("__b", function(i, n2) {
    b4();
    h4 = undefined;
    if (typeof n2.type == "string") {
      var r, t = n2.props;
      for (var o in t)
        if (o !== "children") {
          var f = t[o];
          if (f instanceof l3) {
            if (!r)
              n2.__np = r = {};
            r[o] = f;
            t[o] = f.peek();
          }
        }
    }
    i(n2);
  });
  g4("__r", function(i, n2) {
    i(n2);
    if (n2.type !== x) {
      b4();
      var r, o = n2.__c;
      if (o) {
        o.__$f &= -2;
        if ((r = o.__$u) === undefined)
          o.__$u = r = function(i, n2) {
            var r;
            j2(function() {
              r = this;
            }, { name: n2 });
            r.c = i;
            return r;
          }(function(i) {
            return function() {
              var n2;
              if (p4)
                (n2 = this.y) == null || n2.call(this);
              i.__$f |= 1;
              i.setState({});
            };
          }(o), typeof n2.type == "function" ? n2.type.displayName || n2.type.name : "");
      }
      h4 = o;
      b4(r);
    }
  });
  g4("__e", function(i, n2, r, t) {
    b4();
    h4 = undefined;
    i(n2, r, t);
  });
  g4("diffed", function(i, n2) {
    b4();
    h4 = undefined;
    var r;
    if (typeof n2.type == "string" && (r = n2.__e)) {
      var { __np: t, props: o } = n2, f = r.U;
      if (f)
        for (var e in f) {
          var u = f[e];
          if (!(u === undefined || t && (e in t))) {
            u.d();
            f[e] = undefined;
          }
        }
      if (t) {
        if (!f) {
          f = {};
          r.U = f;
        }
        for (var a in t) {
          var c = f[a], v = t[a];
          if (c === undefined) {
            c = w3(r, a, v, o);
            f[a] = c;
          } else
            c.o(v, o);
        }
      }
    }
    i(n2);
  });
  function w3(i, n2, r, t) {
    var o = n2 in i && i.ownerSVGElement === undefined, f = y3(r);
    return { o: function(i, n2) {
      f.value = i;
      t = n2;
    }, d: j2(function() {
      this.N = F3;
      var r = f.value.value;
      if (t[n2] !== r) {
        t[n2] = r;
        if (o)
          i[n2] = r;
        else if (r != null && (r !== false || n2[4] === "-"))
          i.setAttribute(n2, r);
        else
          i.removeAttribute(n2);
      }
    }) };
  }
  g4("unmount", function(i, n2) {
    if (typeof n2.type == "string") {
      var r = n2.__e;
      if (r) {
        var t = r.U;
        if (t) {
          r.U = undefined;
          for (var o in t) {
            var f = t[o];
            if (f)
              f.d();
          }
        }
      }
      var e = n2.__np;
      if (e) {
        var u = n2.props;
        for (var a in e)
          u[a] = e[a];
      }
      n2.__np = undefined;
    } else {
      var c = n2.__c;
      if (c) {
        c.__$f |= 8;
        var v = c.__$u;
        if (v) {
          c.__$u = undefined;
          v.d();
        }
      }
    }
    i(n2);
  });
  g4("__h", function(i, n2, r, t) {
    if (t < 3)
      n2.__$f |= 2;
    i(n2, r, t);
  });
  S.prototype.shouldComponentUpdate = function(i, n2) {
    if (this.__R)
      return true;
    var r = this.__$u, t = r && r.s !== undefined;
    for (var o in n2)
      return true;
    if (this.__f || typeof this.u == "boolean" && this.u === true) {
      var f = 2 & this.__$f;
      if (!(t || f || 4 & this.__$f))
        return true;
      if (1 & this.__$f)
        return true;
    } else {
      if (!(t || 4 & this.__$f))
        return true;
      if (3 & this.__$f)
        return true;
    }
    for (var e in i)
      if (e !== "__source" && i[e] !== this.props[e])
        return true;
    for (var u in this.props)
      if (!(u in i))
        return true;
    return false;
  };
  function useSignal(i, n2) {
    return b2(function() {
      return y3(i, n2);
    }, []);
  }
  var q2 = function(i) {
    queueMicrotask(function() {
      queueMicrotask(i);
    });
  };
  function x3() {
    n2(function() {
      var i;
      while (i = _3.shift())
        l4.call(i);
    });
  }
  function F3() {
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
  var PROVIDER_IDS = ["gemini", "groq", "openrouter", "openai"];
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
  var optionalSelector = optional(pipe(string(), trim(), check((s) => !s || isValidSelector(s), "Invalid CSS selector")), "");
  var CAPTCHA_KINDS = ["text", "math", "grid"];
  var SiteRuleSchema = pipe(object({
    captcha: selector,
    input: optionalSelector,
    submit: optionalSelector,
    kind: optional(picklist(CAPTCHA_KINDS), "text"),
    tiles: optionalSelector,
    instruction: optionalSelector,
    gridSize: optional(pipe(number(), integer(), minValue(0), maxValue(8)), 0),
    compose: optional(boolean(), false),
    solveBy: optional(picklist(["image", "audio"]), "image"),
    audioButton: optionalSelector,
    imageButton: optionalSelector,
    audioSource: optionalSelector,
    audioInput: optionalSelector,
    checkbox: optionalSelector,
    autoCheckbox: optional(boolean(), false),
    charset: optional(picklist(["alnum", "alpha", "digits", "any"]), "alnum"),
    caseMode: optional(picklist(["keep", "upper", "lower"]), "keep"),
    minLength: optional(pipe(number(), integer(), minValue(1), maxValue(32)), 3),
    maxLength: optional(pipe(number(), integer(), minValue(0), maxValue(64)), 0),
    hint: optional(pipe(string(), maxLength(200)), ""),
    auto: optional(boolean(), true),
    enabled: optional(boolean(), true)
  }), forward(partialCheck([["kind"], ["input"]], (r) => r.kind === "grid" || Boolean(r.input), "Required"), ["input"]), forward(partialCheck([["kind"], ["solveBy"], ["audioSource"]], (r) => r.kind !== "grid" || r.solveBy !== "audio" || Boolean(r.audioSource), "Required for audio"), ["audioSource"]), forward(partialCheck([["kind"], ["solveBy"], ["audioInput"]], (r) => r.kind !== "grid" || r.solveBy !== "audio" || Boolean(r.audioInput), "Required for audio"), ["audioInput"]));
  var providerId = picklist(PROVIDER_IDS);
  var position = {
    x: optional(number()),
    y: optional(number())
  };
  var SettingsSchema = object({
    provider: optional(providerId, "gemini"),
    keys: optional(record(providerId, string()), {}),
    models: optional(record(providerId, string()), {}),
    audioModels: optional(record(providerId, string()), {}),
    openaiBaseUrl: optional(string(), ""),
    autoSolve: optional(boolean(), true),
    ui: optional(object({
      minimized: optional(boolean(), false),
      ...position,
      frame: optional(object({ minimized: optional(boolean(), true), ...position }), {})
    }), {})
  });
  var ExportSchema = object({
    app: literal("universal-captcha-solver"),
    version: literal(2),
    sites: record(string(), unknown())
  });
  var defaultSettings = () => parse(SettingsSchema, {});
  var count = optional(pipe(number(), minValue(0)), 0);
  var StatSchema = object({
    tries: count,
    answered: count,
    errors: count,
    passes: count,
    ms: count
  });
  var StatsSchema = record(string(), record(string(), StatSchema));

  // src/config/store.ts
  var KEYS = {
    settings: "ucs:v2:settings",
    sites: "ucs:v2:sites",
    migrated: "ucs:v2:migrated-v1",
    stats: "ucs:v2:stats"
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
  function parseStats(raw) {
    const res = safeParse(StatsSchema, raw ?? {});
    return res.success ? res.output : {};
  }
  function createStore(kv) {
    const settings = y3(parseSettings(kv.get(KEYS.settings, null)));
    const sites = y3(parseSites(kv.get(KEYS.sites, null)));
    const stats = y3(parseStats(kv.get(KEYS.stats, null)));
    const persistSites = (next) => {
      kv.set(KEYS.sites, next);
      sites.value = next;
    };
    return {
      kv,
      settings,
      sites,
      stats,
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
      setAudioModel(provider, model) {
        this.patchSettings({ audioModels: { ...settings.value.audioModels, [provider]: model.trim() } });
      },
      patchUi(patch) {
        this.patchSettings({ ui: { ...settings.value.ui, ...patch } });
      },
      widgetUi(inFrame) {
        return inFrame ? settings.value.ui.frame : settings.value.ui;
      },
      patchWidgetUi(inFrame, patch) {
        if (inFrame)
          this.patchUi({ frame: { ...settings.value.ui.frame, ...patch } });
        else
          this.patchUi(patch);
      },
      recordStat(pattern, model, event, ms = 0) {
        const all = parseStats(kv.get(KEYS.stats, null));
        const perModel = { ...all[pattern] };
        const key = model || "?";
        const s = { ...parse(StatSchema, {}), ...perModel[key] };
        if (event === "try")
          s.tries++;
        else if (event === "answered") {
          s.answered++;
          s.ms += ms;
        } else if (event === "error")
          s.errors++;
        else
          s.passes++;
        perModel[key] = s;
        const next = { ...all, [pattern]: perModel };
        kv.set(KEYS.stats, next);
        stats.value = next;
      },
      resetStats(pattern) {
        const { [pattern]: _gone, ...rest } = parseStats(kv.get(KEYS.stats, null));
        kv.set(KEYS.stats, rest);
        stats.value = rest;
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
        stats.value = parseStats(kv.get(KEYS.stats, null));
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
  var isAbort = (e) => e instanceof DOMException && e.name === "AbortError";
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
    const m = headers?.match(/^retry-after:\s*(\d+)/im);
    return m?.[1] ? Number(m[1]) * 1000 : undefined;
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
      onload: (r) => finish(() => {
        let text = "";
        try {
          text = typeof r.responseText === "string" ? r.responseText : "";
        } catch {}
        if (r.status >= 200 && r.status < 300) {
          resolve({ status: r.status, text, blob: r.response instanceof Blob ? r.response : undefined });
        } else {
          reject(new HttpError(errorMessageFromBody(text, r.status), r.status, retryAfter(r.responseHeaders)));
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
`).map((l) => l.trim()).filter(Boolean);
    const last = (lines.at(-1) ?? "").split(/[:：]/).at(-1)?.trim() ?? "";
    if (!last)
      throw new AnswerError("Empty answer");
    if (rule.kind === "math") {
      const nums = last.match(/-?\d+(?:\.\d+)?/g);
      const n = nums?.at(-1);
      if (!n)
        throw new AnswerError(`Could not read a number from "${last.slice(0, 40)}"`);
      return n;
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

  // src/solver/audio.ts
  var AUDIO_PROMPT = "This is an audio CAPTCHA. Transcribe exactly the words or digits that are spoken. " + "Reply with ONLY those words in lowercase: no punctuation, quotes or explanation.";
  function normalizeSpoken(raw) {
    let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
    if (/<think>/i.test(text))
      throw new AnswerError("Model returned reasoning instead of an answer");
    text = text.replace(/```[a-z]*/gi, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    if (!text)
      throw new AnswerError("Nothing was heard in the audio");
    return text;
  }
  function audioFormat(mime) {
    const sub = (mime.split("/")[1] ?? "").split(";")[0] ?? "";
    return { mpeg: "mp3", "x-wav": "wav", wave: "wav", "x-m4a": "m4a", mp4: "m4a" }[sub] ?? (sub || "mp3");
  }

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
    const text = (cand?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
    if (!text) {
      throw new Error(cand?.finishReason === "MAX_TOKENS" ? "Model ran out of tokens before answering" : "Empty response from Gemini");
    }
    return text;
  }
  var TILES_SCHEMA = {
    type: "OBJECT",
    properties: { tiles: { type: "ARRAY", items: { type: "INTEGER" } } },
    required: ["tiles"]
  };
  async function generate(http, cfg, prompt, media, signal, json = false) {
    const model = cfg.model.replace(/^models\//, "");
    const opts = { thinking: true, json };
    const body = () => JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: media }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256,
        ...opts.thinking ? thinkingConfigFor(model) : {},
        ...opts.json ? { responseMimeType: "application/json", responseSchema: TILES_SCHEMA } : {}
      }
    });
    const call = () => http({
      method: "POST",
      url: `${BASE}/models/${encodeURIComponent(model)}:generateContent`,
      headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
      body: body(),
      timeout: 20000,
      signal
    });
    for (;; ) {
      try {
        return parseGeminiReply((await call()).text);
      } catch (e) {
        const msg = e instanceof HttpError && e.status === 400 ? e.message : "";
        if (opts.thinking && /thinking/i.test(msg))
          opts.thinking = false;
        else if (opts.json && /schema|mime|json/i.test(msg))
          opts.json = false;
        else
          throw e;
      }
    }
  }
  var NOT_CHAT = /embedding|image|tts|live|audio|robotics|veo|imagen|aqa|computer-use|deep-research/;
  var createGemini = (http = gmHttp) => ({
    id: "gemini",
    label: "Google Gemini",
    keyHelpUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-3.5-flash-lite",
    suggestedModels: ["gemini-3.5-flash-lite", "gemini-3.5-flash"],
    defaultBaseUrl: BASE,
    defaultAudioModel: "",
    suggestedAudioModels: [],
    complete(cfg, { image, prompt, json, signal }) {
      return generate(http, cfg, prompt, { mime_type: image.mime, data: image.base64 }, signal, json);
    },
    async transcribe(cfg, { audio, signal }) {
      return generate(http, cfg, AUDIO_PROMPT, { mime_type: audio.mime, data: audio.base64 }, signal);
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
        for (const m of data.models ?? []) {
          const id = m.name.replace(/^models\//, "");
          if (/^(gemini|gemma)-/.test(id) && !NOT_CHAT.test(id) && m.supportedGenerationMethods?.includes("generateContent")) {
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
    const text = Array.isArray(content) ? content.map((p) => p.text ?? "").join("") : content ?? "";
    if (!text.trim())
      throw new Error("Empty response from model");
    return text;
  }
  function parseTranscription(body) {
    const text = JSON.parse(body).text ?? "";
    if (!text.trim())
      throw new Error("Empty transcription");
    return text;
  }
  var createOpenAICompat = (opts) => (http = gmHttp) => {
    const working = new Map;
    const root = (baseUrl) => (baseUrl || opts.defaultBaseUrl).replace(/\/+$/, "");
    const auth = (key) => key ? { authorization: `Bearer ${key}` } : {};
    return {
      id: opts.id,
      label: opts.label,
      keyHelpUrl: opts.keyHelpUrl,
      defaultModel: opts.defaultModel,
      suggestedModels: opts.suggestedModels,
      defaultBaseUrl: opts.defaultBaseUrl,
      keyOptional: opts.keyOptional,
      defaultAudioModel: opts.defaultAudioModel ?? "",
      suggestedAudioModels: opts.suggestedAudioModels ?? [],
      async transcribe(cfg, { audio, signal }) {
        const url = `${root(cfg.baseUrl)}/audio/transcriptions`;
        if (opts.sttBody === "json") {
          const res = await http({
            method: "POST",
            url,
            headers: { "content-type": "application/json", ...auth(cfg.apiKey) },
            body: JSON.stringify({
              model: cfg.model,
              input_audio: { data: audio.base64, format: audioFormat(audio.mime) }
            }),
            timeout: 30000,
            signal
          });
          return parseTranscription(res.text);
        }
        const form = new FormData;
        form.append("file", audio.blob, `captcha.${audioFormat(audio.mime)}`);
        form.append("model", cfg.model);
        form.append("response_format", "json");
        form.append("temperature", "0");
        const res = await http({ method: "POST", url, headers: auth(cfg.apiKey), body: form, timeout: 30000, signal });
        return parseTranscription(res.text);
      },
      async complete(cfg, { image, prompt, json, signal }) {
        const extras = opts.extraBody?.(cfg.model) ?? {};
        const levels = [json ? { ...extras, response_format: { type: "json_object" } } : extras, extras, {}].filter((v, i, all) => i === 0 || Object.keys(v).length < Object.keys(all[i - 1] ?? {}).length);
        const memo = `${root(cfg.baseUrl)} ${cfg.model} ${json ? "json" : "text"}`;
        const call = (fields) => http({
          method: "POST",
          url: `${root(cfg.baseUrl)}/chat/completions`,
          headers: { "content-type": "application/json", ...auth(cfg.apiKey) },
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
            ...fields
          }),
          timeout: 25000,
          signal
        });
        for (let i = Math.min(working.get(memo) ?? 0, levels.length - 1);; i++) {
          try {
            const reply = parseChatReply((await call(levels[i] ?? {})).text);
            working.set(memo, i);
            return reply;
          } catch (e) {
            const rejected = e instanceof HttpError && (e.status === 400 || e.status === 422);
            if (!rejected || i >= levels.length - 1)
              throw e;
          }
        }
      },
      async listModels(cfg, signal) {
        const res = await http({
          method: "GET",
          url: `${root(cfg.baseUrl)}/models`,
          headers: auth(cfg.apiKey),
          signal
        });
        const data = JSON.parse(res.text);
        const keep = opts.keepModel ?? (() => true);
        const sees = (m) => {
          const mods = m.architecture?.input_modalities;
          return !Array.isArray(mods) || mods.includes("image");
        };
        return (data.data ?? []).filter(sees).map((m) => m.id).filter(keep).sort();
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
    defaultAudioModel: "whisper-large-v3-turbo",
    suggestedAudioModels: ["whisper-large-v3-turbo", "whisper-large-v3"],
    extraBody: (model) => /^qwen\//.test(model) ? { reasoning_effort: "none" } : {},
    keepModel: (id) => !NON_VISION.test(id)
  });

  // src/providers/index.ts
  var createOpenRouter = createOpenAICompat({
    id: "openrouter",
    label: "OpenRouter",
    keyHelpUrl: "https://openrouter.ai/keys",
    defaultModel: "",
    suggestedModels: [],
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultAudioModel: "openai/whisper-large-v3",
    suggestedAudioModels: ["openai/whisper-large-v3", "openai/whisper-1"],
    sttBody: "json"
  });
  var createCustomEndpoint = createOpenAICompat({
    id: "openai",
    label: "Custom endpoint",
    keyHelpUrl: "",
    defaultModel: "",
    suggestedModels: [],
    defaultBaseUrl: "",
    keyOptional: true,
    defaultAudioModel: "whisper-1",
    suggestedAudioModels: ["whisper-1", "gpt-4o-mini-transcribe"]
  });
  function createProviders(http) {
    return {
      gemini: createGemini(http),
      groq: createGroq(http),
      openrouter: createOpenRouter(http),
      openai: createCustomEndpoint(http)
    };
  }
  var providers = createProviders();

  // src/config/match.ts
  function parsePattern(raw) {
    const s = raw.trim().replace(/^(\*|https?):\/\//i, "").replace(/\?.*$/, "");
    if (!s)
      return null;
    const slash = s.indexOf("/");
    const hostPart = (slash === -1 ? s : s.slice(0, slash)).toLowerCase();
    const pathPart = slash === -1 ? "" : s.slice(slash);
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
  var trimSlash = (p) => p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  function scorePattern(pattern, loc) {
    const p = parsePattern(pattern);
    if (!p)
      return null;
    const hosts = [loc.hostname.toLowerCase(), loc.host.toLowerCase()];
    const exactHost = hosts.includes(p.host);
    const subHost = p.subdomains && hosts.some((h) => h.endsWith(`.${p.host}`));
    if (!exactHost && !subHost)
      return null;
    const hostScore = p.subdomains ? 1 : 2;
    const path = trimSlash(loc.pathname || "/");
    let pathScore;
    if (p.mode === "any")
      pathScore = 0;
    else if (p.mode === "exact") {
      if (path !== p.path)
        return null;
      pathScore = 100;
    } else {
      const base = p.path ?? "";
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

  // src/solver/errors.ts
  function explainError(e) {
    if (e instanceof HttpError) {
      switch (e.status) {
        case 0:
          return e.message === "Request timed out" ? "Request timed out" : "Network error. Check your connection";
        case 400:
          return `Bad request: ${e.message}`;
        case 401:
        case 403:
          return "API key rejected. Check it in Settings";
        case 404:
          return "Model not found; it may have been retired. Pick another in Settings";
        case 429:
          return "Rate limited. Wait a moment and retry";
        default:
          return e.status >= 500 ? `Provider error (${e.status}). Try again` : e.message;
      }
    }
    if (e instanceof AnswerError)
      return e.message;
    if (e instanceof SyntaxError)
      return "Unexpected response from provider";
    return e instanceof Error ? e.message : String(e);
  }
  var retryable = (e) => e instanceof HttpError && (e.status === 0 || e.status === 429 || e.status >= 500);
  var sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
  async function withRetry(fn, opts = {}) {
    const { retries = 2, baseMs = 500, signal } = opts;
    for (let attempt = 0;; attempt++) {
      try {
        return await fn();
      } catch (e) {
        if (isAbort(e) || attempt >= retries || !retryable(e))
          throw e;
        const wait = e instanceof HttpError && e.retryAfterMs ? e.retryAfterMs : baseMs * 2 ** attempt;
        await sleep(Math.min(wait, 4000), signal);
      }
    }
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
    let i = 0;
    while (current && current !== rootDocument) {
      const level = tie(current, config);
      for (const node of level) {
        node.level = i;
      }
      stack.push(level);
      current = current.parentElement;
      i++;
      paths.push(...combinations(stack));
      if (i >= config.seedMinLength) {
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
    for (let i = 0;i < element.classList.length; i++) {
      const name = element.classList[i];
      if (config.className(name)) {
        level.push({
          name: "." + CSS.escape(name),
          penalty: 1
        });
      }
    }
    for (let i = 0;i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (config.attr(attr.name, attr.value)) {
        level.push({
          name: `[${CSS.escape(attr.name)}="${CSS.escape(attr.value)}"]`,
          penalty: 2
        });
      }
    }
    const tagName = element.tagName.toLowerCase();
    if (config.tagName(tagName)) {
      level.push({
        name: tagName,
        penalty: 5
      });
      const index = indexOf(element, tagName);
      if (index !== undefined) {
        level.push({
          name: nthOfType(tagName, index),
          penalty: 10
        });
      }
    }
    const nth = indexOf(element);
    if (nth !== undefined) {
      level.push({
        name: nthChild(tagName, nth),
        penalty: 50
      });
    }
    return level;
  }
  function selector2(path) {
    let node = path[0];
    let query = node.name;
    for (let i = 1;i < path.length; i++) {
      const level = path[i].level || 0;
      if (node.level === level - 1) {
        query = `${path[i].name} > ${query}`;
      } else {
        query = `${path[i].name} ${query}`;
      }
      node = path[i];
    }
    return query;
  }
  function penalty(path) {
    return path.map((node) => node.penalty).reduce((acc, i) => acc + i, 0);
  }
  function byPenalty(a, b) {
    return penalty(a) - penalty(b);
  }
  function indexOf(input, tagName) {
    const parent = input.parentNode;
    if (!parent) {
      return;
    }
    let child = parent.firstChild;
    if (!child) {
      return;
    }
    let i = 0;
    while (child) {
      if (child.nodeType === Node.ELEMENT_NODE && (tagName === undefined || child.tagName.toLowerCase() === tagName)) {
        i++;
      }
      if (child === input) {
        break;
      }
      child = child.nextSibling;
    }
    return i;
  }
  function fallback(input, rootDocument) {
    let i = 0;
    let current = input;
    const path = [];
    while (current && current !== rootDocument) {
      const tagName = current.tagName.toLowerCase();
      const index = indexOf(current, tagName);
      if (index === undefined) {
        return;
      }
      path.push({
        name: nthOfType(tagName, index),
        penalty: NaN,
        level: i
      });
      current = current.parentElement;
      i++;
    }
    if (unique(path, rootDocument)) {
      return path;
    }
  }
  function nthChild(tagName, index) {
    if (tagName === "html") {
      return "html";
    }
    return `${tagName}:nth-child(${index})`;
  }
  function nthOfType(tagName, index) {
    if (tagName === "html") {
      return "html";
    }
    return `${tagName}:nth-of-type(${index})`;
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
      for (let i = 1;i < path.length - 1; i++) {
        const elapsedTimeMs = new Date().getTime() - startTime.getTime();
        if (elapsedTimeMs > config.timeoutMs) {
          return;
        }
        const newPath = [...path];
        newPath.splice(i, 1);
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
    for (let n = el;n && n !== document.documentElement; n = n.parentElement) {
      const same = n.parentElement ? [...n.parentElement.children].filter((c) => c.localName === n?.localName) : [n];
      parts.unshift(same.length > 1 ? `${n.localName}:nth-of-type(${same.indexOf(n) + 1})` : n.localName);
    }
    return parts.join(" > ");
  }
  function selectorFor(el) {
    try {
      const s = finder(el, {
        root: document.documentElement,
        idName: (n) => idName(n) && !/\d{3,}/.test(n) && !n.startsWith("ucs-"),
        className: (n) => className(n) && !n.startsWith("ucs-"),
        timeoutMs: 400
      });
      if (document.querySelector(s) === el)
        return s;
    } catch {}
    return pathSelector(el);
  }
  function pickElement(prompt, accept = () => null) {
    return new Promise((resolve) => {
      let target = null;
      const widened = [];
      let raf = 0;
      const isOurs = (e) => e.composedPath().some((n) => n instanceof Element && n.localName === UI_HOST_TAG);
      const problem = (el) => el.getRootNode() instanceof ShadowRoot ? "Elements inside shadow DOM are not supported" : accept(el);
      const render = () => {
        raf = 0;
        if (!target) {
          pickerView.value = { prompt, rect: null, tag: "", selector: "", matches: 0, warning: "" };
          return;
        }
        const r = target.getBoundingClientRect();
        const selector = selectorFor(target);
        pickerView.value = {
          prompt,
          rect: { x: r.left, y: r.top, w: r.width, h: r.height },
          tag: target.localName,
          selector,
          matches: document.querySelectorAll(selector).length,
          warning: problem(target) ?? ""
        };
      };
      const schedule = () => {
        if (!raf)
          raf = requestAnimationFrame(render);
      };
      const swallow = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      const track = (e) => {
        if (isOurs(e))
          return;
        const t = e.composedPath()[0];
        if (t instanceof Element && t !== target) {
          target = t;
          widened.length = 0;
          schedule();
        }
      };
      const block = (e) => {
        if (!isOurs(e))
          swallow(e);
      };
      const click = (e) => {
        if (isOurs(e))
          return;
        swallow(e);
        if (target && !problem(target))
          finish({ el: target, selector: selectorFor(target) });
      };
      const key = (e) => {
        if (isOurs(e))
          return;
        if (e.key === "Escape") {
          swallow(e);
          finish(null);
        } else if (e.key === "ArrowUp" && target?.parentElement && target.parentElement !== document.documentElement) {
          swallow(e);
          widened.push(target);
          target = target.parentElement;
          schedule();
        } else if (e.key === "ArrowDown" && widened.length) {
          swallow(e);
          target = widened.pop() ?? target;
          schedule();
        }
      };
      const listeners = [
        ["pointermove", track],
        [
          "pointerdown",
          (e) => {
            track(e);
            block(e);
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
  var timing = { scale: 1 };
  var rand = (lo, hi) => lo + Math.random() * (hi - lo);
  var wait = (ms, signal) => timing.scale ? sleep(ms * timing.scale, signal) : Promise.resolve();
  function pointIn(r, rnd = Math.random) {
    const j = () => (rnd() - 0.5) * 0.4;
    return { x: r.left + r.width * (0.5 + j()), y: r.top + r.height * (0.5 + j()) };
  }
  function pageElementAt({ x, y }) {
    const all = document.elementsFromPoint?.(x, y) ?? [document.elementFromPoint(x, y)];
    return all.find((el) => el && el.localName !== UI_HOST_TAG) ?? null;
  }
  var cursor = null;
  function entryPoint() {
    const w = innerWidth || 300;
    const h = innerHeight || 300;
    const side = Math.floor(Math.random() * 4);
    if (side === 0)
      return { x: rand(0, w), y: 0 };
    if (side === 1)
      return { x: w - 1, y: rand(0, h) };
    if (side === 2)
      return { x: rand(0, w), y: h - 1 };
    return { x: 0, y: rand(0, h) };
  }
  function pathBetween(from, to, rnd = Math.random) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(6, Math.min(30, Math.round(dist / 14)));
    const bow = (rnd() - 0.5) * Math.min(dist * 0.35, 80);
    const cx = (from.x + to.x) / 2 - dy / (dist || 1) * bow;
    const cy = (from.y + to.y) / 2 + dx / (dist || 1) * bow;
    const pts = [];
    for (let i = 1;i <= steps; i++) {
      const lin = i / steps;
      const t = lin < 0.5 ? 2 * lin * lin : 1 - (-2 * lin + 2) ** 2 / 2;
      const u = 1 - t;
      pts.push({ x: u * u * from.x + 2 * u * t * cx + t * t * to.x, y: u * u * from.y + 2 * u * t * cy + t * t * to.y });
    }
    return pts;
  }
  function fire(target, type, at, buttons) {
    const init = { bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y, button: 0, buttons };
    if (type.startsWith("pointer")) {
      if (typeof PointerEvent !== "function")
        return;
      target.dispatchEvent(new PointerEvent(type, { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true }));
    } else {
      target.dispatchEvent(new MouseEvent(type, init));
    }
  }
  async function moveTo(to, fallback, signal) {
    const from = cursor ?? entryPoint();
    let over = null;
    for (const p of pathBetween(from, to)) {
      const el = (timing.scale ? pageElementAt(p) : null) ?? fallback;
      if (el !== over) {
        if (over) {
          fire(over, "pointerout", p, 0);
          fire(over, "mouseout", p, 0);
        }
        fire(el, "pointerover", p, 0);
        fire(el, "mouseover", p, 0);
        over = el;
      }
      fire(el, "pointermove", p, 0);
      fire(el, "mousemove", p, 0);
      cursor = p;
      await wait(rand(6, 16), signal);
    }
    cursor = to;
  }
  async function humanClick(target, opts = {}) {
    const at = opts.at ?? pointIn(target.getBoundingClientRect());
    await moveTo(at, target, opts.signal);
    await wait(rand(40, 140), opts.signal);
    fire(target, "pointerdown", at, 1);
    fire(target, "mousedown", at, 1);
    if (target instanceof HTMLElement)
      target.focus({ preventScroll: true });
    await wait(rand(55, 130), opts.signal);
    fire(target, "pointerup", at, 0);
    fire(target, "mouseup", at, 0);
    fire(target, "click", at, 0);
  }
  async function typeInto(field, text, signal) {
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setValue = (value) => {
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter)
        setter.call(field, value);
      else
        field.value = value;
    };
    await humanClick(field, { signal });
    setValue("");
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    let value = "";
    for (const ch of text) {
      const key = { key: ch, bubbles: true, cancelable: true, composed: true };
      field.dispatchEvent(new KeyboardEvent("keydown", key));
      field.dispatchEvent(new KeyboardEvent("keypress", key));
      value += ch;
      setValue(value);
      field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ch }));
      field.dispatchEvent(new KeyboardEvent("keyup", key));
      await wait(ch === " " ? rand(120, 260) : rand(45, 150), signal);
    }
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
  async function waitFor(fn, ms, signal, step = 100) {
    const end = performance.now() + ms * timing.scale;
    for (;; ) {
      const v = fn();
      if (v)
        return v;
      if (performance.now() >= end)
        return null;
      await sleep(step, signal);
    }
  }
  function whenOnScreen(el, signal, ratio = 0.6) {
    return new Promise((resolve, reject) => {
      if (typeof IntersectionObserver !== "function" || !timing.scale)
        return resolve();
      let inView = false;
      const check = () => {
        if (inView && document.visibilityState === "visible")
          done();
      };
      const io = new IntersectionObserver((entries) => {
        inView = entries.some((e) => e.intersectionRatio >= ratio);
        check();
      }, { threshold: [0, ratio, 1] });
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };
      function cleanup() {
        io.disconnect();
        document.removeEventListener("visibilitychange", check);
        signal?.removeEventListener("abort", onAbort);
      }
      function done() {
        cleanup();
        resolve();
      }
      io.observe(el);
      document.addEventListener("visibilitychange", check);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  var pause = (lo, hi, signal) => wait(rand(lo, hi), signal);

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
  function clickElement(selector) {
    const el = document.querySelector(selector);
    if (!el)
      return false;
    el.click();
    return true;
  }

  // src/dom/tiles.ts
  var bgUrl = (el) => {
    const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return m?.[1] ? new URL(m[1], location.href).href : null;
  };
  function tileSources(tile) {
    const out = [];
    for (const el of [tile, ...tile.querySelectorAll("*")]) {
      if (el instanceof HTMLImageElement) {
        const url = el.currentSrc || el.src;
        if (url)
          out.push({ el, url, kind: "img" });
        continue;
      }
      const url = bgUrl(el);
      if (url)
        out.push({ el, url, kind: "bg" });
    }
    return out;
  }
  var tileSignature = (tile) => tileSources(tile).map((s) => s.url).join("|");
  function tileOpacity(tile) {
    let min = 1;
    for (const { el } of tileSources(tile)) {
      for (let n = el;n && n !== tile.parentElement; n = n.parentElement) {
        const o = Number.parseFloat(getComputedStyle(n).opacity);
        if (!Number.isNaN(o))
          min = Math.min(min, o);
      }
    }
    return min;
  }
  var tilesLoaded = (tiles) => tiles.every((t) => tileSources(t).every(({ el }) => !(el instanceof HTMLImageElement) || el.complete && el.naturalWidth > 0));

  // src/dom/watch.ts
  var elementSignature = (el) => [el.localName, el.getAttribute("src"), el.currentSrc, el.width].join("|");
  function watchCaptcha(getSelector, onChange, debounceMs = 120, signature = elementSignature) {
    let current = null;
    let lastSig = "";
    let timer;
    let forced = false;
    const check = () => {
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
      timer = setTimeout(check, debounceMs);
    };
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset", "style"]
    });
    const onLoad = (e) => {
      if (e.target === current)
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
  function fitWithin(w, h, max = MAX_SIDE) {
    const scale = Math.min(1, max / Math.max(w, h));
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
  }
  var uniformCells = (width, height, size) => Array.from({ length: size * size }, (_, n) => ({
    x: n % size * (width / size),
    y: Math.floor(n / size) * (height / size),
    w: width / size,
    h: height / size
  }));
  function annotateCells(ctx, cells) {
    const side = Math.min(...cells.map((c) => Math.min(c.w, c.h)));
    const font = Math.max(10, Math.round(side * 0.16));
    ctx.save();
    ctx.lineWidth = Math.max(1, Math.round(font / 8));
    ctx.strokeStyle = "#fff";
    ctx.font = `bold ${font}px sans-serif`;
    ctx.textBaseline = "top";
    cells.forEach((c, i) => {
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      const label = String(i + 1);
      ctx.fillStyle = "#000c";
      ctx.fillRect(c.x + 2, c.y + 2, ctx.measureText(label).width + font * 0.5, font * 1.2);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, c.x + 2 + font * 0.25, c.y + 2 + font * 0.1);
    });
    ctx.restore();
  }
  var encode = (canvas) => {
    const mime = canvas.width * canvas.height <= PNG_PIXEL_BUDGET ? "image/png" : "image/jpeg";
    return { mime, base64: canvas.toDataURL(mime, 0.92).split(",")[1] ?? "" };
  };
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
      annotateCells(ctx, uniformCells(width, height, grid));
    return { ...encode(canvas), width, height };
  }
  async function imageReady(img, timeoutMs) {
    if (img.complete && img.naturalWidth > 0)
      return;
    await Promise.race([
      img.decode(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Captcha image did not load")), timeoutMs))
    ]);
  }
  async function download(url, http, signal) {
    if (url.startsWith("blob:") || url.startsWith("data:"))
      return (await fetch(url, { signal })).blob();
    const res = await http({ method: "GET", url, responseType: "blob", timeout: 1e4, signal });
    if (!res.blob)
      throw new Error("Download returned no data");
    return res.blob;
  }
  async function refetch(url, http, signal, grid = 0) {
    const bmp = await createImageBitmap(await download(url, http, signal));
    try {
      return rasterize(bmp, bmp.width, bmp.height, grid);
    } finally {
      bmp.close();
    }
  }
  function backgroundUrl(el) {
    const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return m?.[1] ? new URL(m[1], location.href).href : null;
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
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "SecurityError"))
          throw e;
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
  var drawableInPlace = (url) => url.startsWith("data:") || url.startsWith("blob:") || new URL(url, location.href).origin === location.origin;
  async function captureTiles(tiles, opts = {}) {
    const { http = gmHttp, signal } = opts;
    if (!tiles.length)
      throw new Error("No tiles to capture");
    const rects = tiles.map((t) => t.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const w = Math.max(...rects.map((r) => r.right)) - left || 1;
    const h = Math.max(...rects.map((r) => r.bottom)) - top || 1;
    const smallest = Math.min(...rects.map((r) => Math.min(r.width, r.height))) || 1;
    const scale = Math.max(1, Math.min(120 / smallest, MAX_SIDE / Math.max(w, h)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Canvas unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const downloaded = new Map;
    const sourceFor = async (url, el) => {
      if (el instanceof HTMLImageElement && drawableInPlace(url))
        return el;
      let bmp = downloaded.get(url);
      if (!bmp) {
        bmp = download(url, http, signal).then((b) => createImageBitmap(b));
        downloaded.set(url, bmp);
      }
      return bmp;
    };
    const cells = rects.map((r) => ({
      x: (r.left - left) * scale,
      y: (r.top - top) * scale,
      w: r.width * scale,
      h: r.height * scale
    }));
    try {
      for (const [i, tile] of tiles.entries()) {
        const cell = cells[i];
        ctx.save();
        ctx.beginPath();
        ctx.rect(cell.x, cell.y, cell.w, cell.h);
        ctx.clip();
        for (const { el, url } of tileSources(tile)) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height)
            continue;
          ctx.drawImage(await sourceFor(url, el), (r.left - left) * scale, (r.top - top) * scale, r.width * scale, r.height * scale);
        }
        ctx.restore();
      }
    } finally {
      for (const p of downloaded.values())
        p.then((b) => b.close?.(), () => {});
    }
    annotateCells(ctx, cells);
    return { ...encode(canvas), width: canvas.width, height: canvas.height, refetched: false };
  }
  async function captureAudio(url, opts = {}) {
    const { http = gmHttp, signal } = opts;
    let blob;
    try {
      if (!drawableInPlace(url))
        throw new Error("cross-origin");
      const res = await fetch(url, { signal, credentials: "include" });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch (e) {
      if (signal?.aborted)
        throw e;
      blob = await download(url, http, signal);
    }
    if (!blob.size)
      throw new Error("Audio clip was empty");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0;i < bytes.length; i += 32768)
      bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return {
      mime: blob.type && blob.type !== "application/octet-stream" ? blob.type : "audio/mpeg",
      base64: btoa(bin),
      blob
    };
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
      const t = this.now();
      this.hits = this.hits.filter((h) => t - h < this.windowMs);
      if (this.hits.length >= this.max)
        return false;
      this.hits.push(t);
      return true;
    }
    reset() {
      this.hits = [];
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
      const n = typeof item === "string" ? Number(item.trim()) : item;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > total) {
        throw new AnswerError(`Tile "${String(item)}" is not between 1 and ${total}`);
      }
      out.add(n);
    }
    return [...out].sort((a, b) => a - b);
  }

  // src/solver/runs.ts
  var MAX_DYNAMIC_PASSES = 6;
  var DYNAMIC_WORDING = /none left|no more|until there are none/i;
  var superseded = () => new DOMException("Superseded", "AbortError");
  var q3 = (sel) => sel ? document.querySelector(sel) : null;
  var textOf = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  async function pressSubmit(ctx) {
    if (!ctx.rule.submit)
      return;
    await pause(250, 650, ctx.signal);
    if (!ctx.current())
      throw superseded();
    const button = q3(ctx.rule.submit);
    if (button)
      await humanClick(button, { signal: ctx.signal });
  }
  async function waitForReplacement(clicked, before, expectDynamic, signal) {
    const changed = (t, i) => !t.isConnected || tileSignature(t) !== before[i];
    const started = await waitFor(() => clicked.some((t, i) => changed(t, i) || t.isConnected && tileOpacity(t) < 0.95), expectDynamic ? 3000 : 1200, signal);
    if (!started)
      return false;
    await waitFor(() => clicked.every((t, i) => changed(t, i)) && tilesLoaded(clicked.filter((t) => t.isConnected)) && clicked.every((t) => !t.isConnected || tileOpacity(t) >= 0.95), 9000, signal);
    await pause(250, 450, signal);
    return true;
  }
  async function runGrid(ctx, el) {
    const { rule, provider, cfg, signal } = ctx;
    const check = () => {
      if (!ctx.current())
        throw superseded();
    };
    const queryTiles = () => rule.tiles ? [...document.querySelectorAll(rule.tiles)] : [];
    let tiles = queryTiles();
    const size = resolveGridSize(rule.gridSize, tiles.length);
    const total = size * size;
    if (rule.tiles && tiles.length !== total) {
      throw new Error(`Found ${tiles.length} tiles, expected ${total} (${size}x${size}). Check the tiles selector`);
    }
    if (rule.compose && !tiles.length)
      throw new Error("Building the picture from tiles needs a tiles selector");
    const instruction = textOf(q3(rule.instruction));
    if (!instruction && !rule.hint)
      throw new Error("No challenge text: set the instruction selector or a hint");
    const prompt = buildGridPrompt(size, instruction, rule.hint);
    const ask = async (image) => {
      ctx.onRequest();
      const raw = await withRetry(() => provider.complete(cfg, { image, prompt, json: true, signal }), { signal });
      check();
      return parseGridAnswer(raw, total);
    };
    const first = rule.compose ? await ctx.captureTiles(tiles, { signal }) : await ctx.capture(el, { signal, grid: size });
    let picks = await ask(first);
    const cell = (n) => {
      const r = el.getBoundingClientRect();
      const w = r.width / size;
      const h = r.height / size;
      return { left: r.left + (n - 1) % size * w, top: r.top + Math.floor((n - 1) / size) * h, width: w, height: h };
    };
    const expectDynamic = DYNAMIC_WORDING.test(instruction);
    const clickedAll = new Set;
    let passes = 0;
    await pause(300, 800, signal);
    for (;; ) {
      passes++;
      const before = picks.map((n) => tiles[n - 1] ? tileSignature(tiles[n - 1]) : "");
      for (const [i, n] of picks.entries()) {
        if (i > 0)
          await pause(ctx.clickDelay(), ctx.clickDelay() * 1.4, signal);
        check();
        const tile = tiles[n - 1];
        if (tile) {
          await humanClick(tile, { signal });
        } else {
          const at = pointIn(cell(n));
          const target = pageElementAt(at);
          if (!target)
            throw new Error(`Nothing clickable at tile ${n}`);
          await humanClick(target, { at, signal });
        }
        clickedAll.add(n);
      }
      if (!picks.length || !tiles.length || passes >= MAX_DYNAMIC_PASSES)
        break;
      const clicked = picks.map((n) => tiles[n - 1]);
      if (!await waitForReplacement(clicked, before, expectDynamic, signal))
        break;
      check();
      tiles = queryTiles();
      if (tiles.length !== total)
        break;
      picks = await ask(await ctx.captureTiles(tiles, { signal }));
    }
    await pressSubmit(ctx);
    const list = [...clickedAll].sort((a, b) => a - b);
    const answer = list.length ? `Tiles ${list.join(", ")}` : "No matching tiles";
    return {
      answer: passes > 1 ? `${answer} (${passes} passes)` : answer,
      warning: first.refetched ? "Image was re-downloaded; it may differ from the one shown" : undefined
    };
  }
  function audioUrl(el) {
    if (el instanceof HTMLAudioElement)
      return el.currentSrc || el.src || el.querySelector("source")?.src || "";
    if (el instanceof HTMLSourceElement)
      return el.src;
    if (el instanceof HTMLAnchorElement)
      return el.href;
    const raw = el.getAttribute("src") ?? el.getAttribute("href") ?? "";
    return raw ? new URL(raw, location.href).href : "";
  }
  async function runAudio(ctx) {
    const { rule, provider, cfg, signal } = ctx;
    const findClip = () => {
      const el = q3(rule.audioSource);
      const url = el ? audioUrl(el) : "";
      return url ? url : null;
    };
    let url = findClip();
    if (!url) {
      const button = q3(rule.audioButton);
      if (!button)
        throw new Error("Audio button not found. Check the audio button selector");
      await pause(300, 800, signal);
      await humanClick(button, { signal });
      url = await waitFor(findClip, 8000, signal);
      if (!url)
        throw new Error("No audio challenge appeared. The site may be refusing audio for your network");
    }
    if (!ctx.current())
      throw superseded();
    const audio = await ctx.captureAudio(url, { signal });
    ctx.onRequest();
    const raw = await withRetry(() => provider.transcribe(cfg, { audio, signal }), { signal });
    if (!ctx.current())
      throw superseded();
    const answer = normalizeSpoken(raw);
    const input = q3(rule.audioInput);
    if (!isTextField(input))
      throw new Error("Audio answer box not found");
    await pause(400, 1100, signal);
    await typeInto(input, answer, signal);
    await pressSubmit(ctx);
    return { answer };
  }
  async function switchToImages(rule, signal) {
    const button = q3(rule.imageButton);
    if (!button)
      return null;
    await humanClick(button, { signal });
    return waitFor(() => q3(rule.captcha), 8000, signal);
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
  function resolveAudio(settings, registry) {
    const { provider, cfg } = resolveProvider(settings, registry);
    return {
      provider,
      cfg: { ...cfg, model: settings.audioModels[provider.id] || provider.defaultAudioModel || cfg.model }
    };
  }
  function configProblem(provider, cfg) {
    if (!cfg.baseUrl)
      return "Enter the endpoint URL";
    if (!cfg.apiKey && !provider.keyOptional)
      return `Add a ${provider.label} API key`;
    if (!cfg.model)
      return "Choose a model";
    return null;
  }
  var MAX_GRID_ROUNDS = 3;
  var ROUND_GAP_MS = 30000;
  var humanDelay = () => 180 + Math.random() * 220;
  var isGrid = (rule) => rule.kind === "grid";
  var isChecked = (el) => el.getAttribute("aria-checked") === "true" || el instanceof HTMLInputElement && el.checked;
  var watchSelector = (rule) => isGrid(rule) && rule.solveBy === "audio" && rule.audioSource ? `${rule.captcha}, ${rule.audioSource}` : rule.captcha;
  function challengeSignature(rule) {
    const parts = [];
    const el = document.querySelector(rule.captcha);
    if (el)
      parts.push(elementSignature(el));
    if (rule.tiles)
      for (const t of document.querySelectorAll(rule.tiles))
        parts.push(tileSignature(t));
    if (rule.solveBy === "audio" && rule.audioSource) {
      const a = document.querySelector(rule.audioSource);
      if (a)
        parts.push(audioUrl(a));
    }
    return parts.join("#");
  }
  function createController({
    store,
    registry,
    capture = captureImage,
    captureTiles: composeTiles = captureTiles,
    captureAudio: fetchAudio = captureAudio,
    location: getLoc = () => window.location,
    clickDelay = humanDelay,
    now = Date.now
  }) {
    const status = y3({ phase: "idle", text: "Idle" });
    const match = y3(null);
    const present = y3(false);
    const guard = new RateGuard(5, 60000);
    let rounds = 0;
    let lastRound = 0;
    let runId = 0;
    let busy = false;
    let lastSolved = "";
    let abort = null;
    let watch = null;
    let boxWatch = null;
    let boxObserver = null;
    let boxAbort = null;
    let watched = "";
    const set = (s) => {
      status.value = s;
    };
    const statModel = (rule) => {
      const s = store.settings.value;
      return (isGrid(rule) && rule.solveBy === "audio" ? resolveAudio(s, registry) : resolveProvider(s, registry)).cfg.model;
    };
    async function solve(trigger) {
      const current = match.value;
      if (!current?.rule.enabled)
        return;
      const { rule, pattern } = current;
      const grid = isGrid(rule);
      if (trigger === "auto") {
        if (grid) {
          if (busy)
            return;
          const sig = challengeSignature(rule);
          if (sig && sig === lastSolved)
            return;
          const t = now();
          if (t - lastRound > ROUND_GAP_MS)
            rounds = 0;
          lastRound = t;
          if (++rounds > MAX_GRID_ROUNDS) {
            set({ phase: "paused", text: `Gave up after ${MAX_GRID_ROUNDS} rounds. Finish by hand or click Solve` });
            return;
          }
        }
        if (!guard.allow()) {
          set({ phase: "paused", text: "Auto-solve paused (too many attempts). Click Solve" });
          return;
        }
      } else {
        guard.reset();
        rounds = 0;
      }
      const audio = grid && rule.solveBy === "audio";
      const { provider, cfg } = (audio ? resolveAudio : resolveProvider)(store.settings.value, registry);
      const problem = configProblem(provider, cfg);
      if (problem) {
        set({ phase: "error", text: audio ? `Audio: ${problem.toLowerCase()}` : problem, action: "settings" });
        return;
      }
      abort?.abort();
      const ac = new AbortController;
      abort = ac;
      const id = ++runId;
      const started = performance.now();
      busy = grid;
      set({ phase: "solving", text: audio ? "Listening…" : "Solving…" });
      const stat = (event, ms = 0) => store.recordStat(pattern, cfg.model, event, ms);
      try {
        const ctx = {
          rule,
          provider,
          cfg,
          signal: ac.signal,
          current: () => id === runId,
          capture,
          captureTiles: composeTiles,
          captureAudio: fetchAudio,
          clickDelay,
          onRequest: () => stat("try")
        };
        let result;
        if (audio) {
          result = await runAudio(ctx);
        } else {
          let el = document.querySelector(rule.captcha);
          if (!el && grid && rule.imageButton)
            el = await switchToImages(rule, ac.signal);
          if (!el) {
            set({ phase: "missing", text: "Captcha not found on this page" });
            return;
          }
          result = grid ? await runGrid(ctx, el) : await solveText(ctx, el);
        }
        if (id !== runId)
          return;
        const ms = Math.round(performance.now() - started);
        stat("answered", ms);
        set({ phase: "solved", text: result.answer, answer: result.answer, ms, warning: result.warning });
      } catch (e) {
        if (isAbort(e) || id !== runId)
          return;
        console.warn("[ucs]", e);
        stat("error");
        set({ phase: "error", text: explainError(e) });
      } finally {
        if (id === runId) {
          busy = false;
          if (grid)
            lastSolved = challengeSignature(rule);
        }
      }
    }
    async function solveText(ctx, el) {
      const { rule, provider, cfg, signal } = ctx;
      const image = await capture(el, { signal });
      ctx.onRequest();
      const raw = await withRetry(() => provider.complete(cfg, { image, prompt: buildPrompt(rule), signal }), {
        signal
      });
      if (!ctx.current())
        throw new DOMException("Superseded", "AbortError");
      const answer = normalizeAnswer(raw, rule);
      const input = document.querySelector(rule.input);
      if (!isTextField(input))
        throw new Error("Answer field not found");
      fillInput(input, answer);
      if (rule.submit)
        setTimeout(() => clickElement(rule.submit), 80);
      return {
        answer,
        warning: image.refetched ? "Image was re-downloaded; it may differ from the one shown" : undefined
      };
    }
    function watchCheckbox(rule, pattern) {
      const ticked = new WeakSet;
      boxAbort = new AbortController;
      const signal = boxAbort.signal;
      boxWatch = watchCaptcha(() => rule.checkbox, (el) => {
        boxObserver?.disconnect();
        if (!el)
          return;
        let was = isChecked(el);
        boxObserver = new MutationObserver(() => {
          const now = isChecked(el);
          if (now && !was)
            store.recordStat(pattern, statModel(rule), "pass");
          was = now;
        });
        boxObserver.observe(el, { attributes: true, attributeFilter: ["aria-checked", "checked", "class"] });
        const wanted = rule.autoCheckbox && rule.auto && store.settings.value.autoSolve;
        if (!wanted || was || ticked.has(el))
          return;
        ticked.add(el);
        (async () => {
          await whenOnScreen(el, signal);
          await pause(900, 2600, signal);
          if (!el.isConnected || isChecked(el))
            return;
          await humanClick(el, { signal });
        })().catch((e) => {
          if (!isAbort(e))
            console.warn("[ucs] checkbox", e);
        });
      });
    }
    function stopCheckbox() {
      boxAbort?.abort();
      boxWatch?.stop();
      boxObserver?.disconnect();
      boxWatch = null;
      boxObserver = null;
    }
    function rematch() {
      const next = findBestRule(store.sites.value, getLoc());
      match.value = next;
      const rule = next?.rule.enabled ? next.rule : null;
      const active = rule ? JSON.stringify([next?.pattern, rule]) : "";
      if (active === watched)
        return;
      watch?.stop();
      watch = null;
      stopCheckbox();
      watched = active;
      present.value = false;
      rounds = 0;
      lastSolved = "";
      abort?.abort();
      if (!rule || !next) {
        set({ phase: "idle", text: "Idle" });
        return;
      }
      if (rule.checkbox)
        watchCheckbox(rule, next.pattern);
      set({ phase: "idle", text: "Waiting for captcha…" });
      watch = watchCaptcha(() => watchSelector(rule), (el) => {
        present.value = Boolean(el);
        if (!el) {
          rounds = 0;
          set({ phase: "idle", text: "Waiting for captcha…" });
          return;
        }
        if (match.value?.rule.auto && store.settings.value.autoSolve)
          solve("auto");
      }, 120, isGrid(rule) ? () => challengeSignature(rule) : undefined);
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
        for (const d of disposers.splice(0))
          d();
        watch?.stop();
        stopCheckbox();
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
  var OPENROUTER = "openrouter.ai";
  function migrateOpenRouter(kv) {
    const raw = kv.get(KEYS.settings, null);
    if (!raw || typeof raw !== "object")
      return false;
    const url = raw.openaiBaseUrl;
    if (!(url === undefined || typeof url === "string" && url.includes(OPENROUTER)))
      return false;
    const keys = { ...raw.keys };
    const models = { ...raw.models };
    const moved = Boolean(keys.openai || raw.provider === "openai");
    if (keys.openai && !keys.openrouter)
      keys.openrouter = keys.openai;
    if (models.openai && !models.openrouter)
      models.openrouter = models.openai;
    delete keys.openai;
    delete models.openai;
    kv.set(KEYS.settings, {
      ...raw,
      provider: raw.provider === "openai" ? "openrouter" : raw.provider,
      keys,
      models,
      openaiBaseUrl: ""
    });
    return moved;
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
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  // src/flows/setup.ts
  var imageProblem = (el) => el instanceof HTMLImageElement || el instanceof HTMLCanvasElement || el instanceof SVGSVGElement || getComputedStyle(el).backgroundImage !== "none" ? null : "Pick the captcha picture itself (an image, canvas or svg). ↑ selects the parent";
  var gridProblem = (el) => imageProblem(el) === null || tileSources(el).length > 0 ? null : "Pick the grid picture, or the box holding the tile pictures. ↑ selects the parent";
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
    const classes = [...el.classList].filter((c) => !c.startsWith("ucs-")).map((c) => `.${CSS.escape(c)}`);
    const candidates = [el.localName + classes.join(""), ...classes.map((c) => el.localName + c)];
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
    const captcha = await pickElement("Step 1 of 4: click the grid image", gridProblem);
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
        compose: imageProblem(captcha.el) !== null,
        input: "",
        tiles: tile ? tilesSelector(tile.el) : "",
        instruction: instruction?.selector ?? "",
        submit: submit?.selector ?? ""
      }
    };
  }
  var audioProblem = (el) => el instanceof HTMLAudioElement || el instanceof HTMLSourceElement || el instanceof HTMLAnchorElement && Boolean(el.href) ? null : "Pick the <audio> element or the download link. ↑ selects the parent";
  async function repick(field) {
    const labels = {
      captcha: "Click the captcha image",
      input: "Click the answer box",
      submit: "Click the submit button",
      tiles: "Click any one tile",
      instruction: "Click the challenge text",
      audioButton: "Click the audio (headphones) button",
      imageButton: "Click the back-to-pictures button",
      audioSource: "Click the audio download link",
      audioInput: "Click the audio answer box",
      checkbox: "Click the checkbox (inside its frame)"
    };
    const checks = {
      captcha: editor.value?.rule.kind === "grid" ? gridProblem : imageProblem,
      input: fieldProblem,
      audioInput: fieldProblem,
      audioSource: audioProblem,
      instruction: textProblem
    };
    const picked = await pickElement(labels[field], checks[field]);
    const current = editor.value;
    if (!picked || !current)
      return;
    const selector = field === "tiles" ? tilesSelector(picked.el) : picked.selector;
    editor.value = { ...current, rule: { ...current.rule, [field]: selector } };
  }
  // node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
  var o4 = 0;
  function u4(t, e, n2, f, u, i) {
    e || (e = {});
    var a, c, l = e;
    if ("ref" in l && typeof t != "function")
      for (c in l = {}, e)
        c == "ref" ? a = e[c] : l[c] = e[c];
    var p = { type: t, props: l, key: n2, ref: a, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: undefined, __v: --o4, __i: -1, __u: 0 };
    return (u || i) && (p.__source = u, p.__self = i), n.vnode && n.vnode(p), p;
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
      children: list.map((t) => /* @__PURE__ */ u4("div", {
        class: `toast ${t.kind}`,
        children: [
          /* @__PURE__ */ u4("span", {
            children: t.text
          }, undefined, false, undefined, this),
          t.action && /* @__PURE__ */ u4("button", {
            type: "button",
            onClick: () => {
              t.action?.run();
              dismissToast(t.id);
            },
            children: t.action.label
          }, undefined, false, undefined, this)
        ]
      }, t.id, true, undefined, this))
    }, undefined, false, undefined, this);
  }

  // src/config/presets.ts
  var recaptchaV2 = parse(SiteRuleSchema, {
    kind: "grid",
    captcha: 'img[class^="rc-image-tile-"]',
    tiles: "td.rc-imageselect-tile",
    instruction: ".rc-imageselect-desc-wrapper",
    submit: "#recaptcha-verify-button",
    gridSize: 0,
    audioButton: "#recaptcha-audio-button",
    imageButton: "#recaptcha-image-button",
    audioSource: "#audio-source",
    audioInput: "#audio-response",
    checkbox: "#recaptcha-anchor"
  });
  var hcaptcha = parse(SiteRuleSchema, {
    kind: "grid",
    captcha: ".task-grid",
    tiles: ".task-image",
    compose: true,
    instruction: ".prompt-text",
    submit: ".button-submit",
    gridSize: 0,
    checkbox: "#checkbox"
  });
  var PRESETS = [
    {
      id: "recaptcha-v2",
      label: "reCAPTCHA v2",
      sites: { "www.google.com/recaptcha/*": recaptchaV2, "www.recaptcha.net/recaptcha/*": recaptchaV2 }
    },
    {
      id: "hcaptcha",
      label: "hCaptcha",
      experimental: true,
      sites: { "newassets.hcaptcha.com": hcaptcha }
    }
  ];
  var USER_FIELDS = ["enabled", "auto", "solveBy", "autoCheckbox", "hint"];
  var comparable = (r) => {
    const copy = { ...r };
    for (const k of USER_FIELDS)
      delete copy[k];
    return JSON.stringify(copy);
  };
  function presetState(preset, sites) {
    const entries = Object.entries(preset.sites);
    if (entries.some(([k]) => !sites[k]))
      return "missing";
    return entries.every(([k, r]) => comparable(sites[k]) === comparable(r)) ? "current" : "outdated";
  }
  function presetRules(preset, sites) {
    const out = {};
    for (const [k, r] of Object.entries(preset.sites)) {
      const mine = sites[k];
      const kept = mine ? Object.fromEntries(USER_FIELDS.map((f) => [f, mine[f]])) : {};
      out[k] = { ...r, ...kept };
    }
    return out;
  }

  // src/flows/data.ts
  function exportSites(store) {
    const payload = { app: "universal-captcha-solver", version: 2, sites: store.sites.value };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `captcha-solver-sites-${new Date().toISOString().slice(0, 10)}.json`
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importSites(store, json) {
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
    store.mergeSites(sites);
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
    for (let i = 0;i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 160, Math.random() * 56);
      ctx.lineTo(Math.random() * 160, Math.random() * 56);
      ctx.stroke();
    }
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#222";
    ctx.textBaseline = "middle";
    [...answer].forEach((ch, i) => {
      ctx.save();
      ctx.translate(22 + i * 33, 28 + (Math.random() - 0.5) * 8);
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
    const problem = configProblem(provider, cfg);
    if (problem)
      return { ok: false, text: problem };
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
    } catch (e) {
      return { ok: false, text: explainError(e) };
    }
  }

  // src/ui/icons.tsx
  var PATHS = {
    sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    minus: "M5 12h14",
    x: "M18 6 6 18M6 6l12 12",
    plus: "M12 5v14M5 12h14",
    check: "M20 6 9 17l-5-5",
    pencil: "M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    target: "M22 12h-4M6 12H2M12 6V2M12 22v-4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
    image: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM21 15l-5-5L5 21M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    audio: "M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"
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
      const d = ref.current;
      if (!d)
        return;
      if (open && !d.open)
        d.showModal();
      else if (!open && d.open)
        d.close();
    }, [open]);
    return /* @__PURE__ */ u4("dialog", {
      ref,
      class: "modal",
      "aria-label": title,
      onClose: () => openRef.current && onClose(),
      onClick: (e) => e.target === ref.current && onClose(),
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

  // src/ui/model-picker.tsx
  var OTHER = "\x00other";
  function ModelPicker(p) {
    const custom = useSignal(false);
    A2(() => {
      custom.value = false;
    }, [p.resetKey]);
    const known = p.value && !p.options.includes(p.value) ? [p.value, ...p.options] : [...p.options];
    const typing = custom.value || known.length === 0 && p.emptyLabel === undefined;
    return /* @__PURE__ */ u4("div", {
      class: "field",
      children: [
        /* @__PURE__ */ u4("label", {
          for: p.id,
          children: p.label
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "row",
          children: [
            typing ? /* @__PURE__ */ u4("input", {
              id: p.id,
              class: "grow mono",
              type: "text",
              autocomplete: "off",
              spellcheck: false,
              value: p.value,
              placeholder: p.placeholder,
              onInput: (e) => p.onChange(e.currentTarget.value)
            }, undefined, false, undefined, this) : /* @__PURE__ */ u4("select", {
              id: p.id,
              class: "grow mono",
              value: p.value,
              onChange: (e) => {
                const v = e.currentTarget.value;
                if (v === OTHER)
                  custom.value = true;
                else
                  p.onChange(v);
              },
              children: [
                p.emptyLabel !== undefined && /* @__PURE__ */ u4("option", {
                  value: "",
                  children: p.emptyLabel
                }, undefined, false, undefined, this),
                known.map((m) => /* @__PURE__ */ u4("option", {
                  value: m,
                  children: [
                    m,
                    m === p.defaultModel ? " (default)" : ""
                  ]
                }, m, true, undefined, this)),
                /* @__PURE__ */ u4("option", {
                  value: OTHER,
                  children: "Other…"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            p.fetch && /* @__PURE__ */ u4("button", {
              type: "button",
              class: "btn sm",
              disabled: p.fetch.disabled || p.fetch.busy,
              title: p.fetch.title,
              onClick: () => {
                custom.value = false;
                p.fetch?.run();
              },
              children: p.fetch.busy ? "…" : "Fetch list"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("p", {
          class: "hint",
          children: p.hint
        }, undefined, false, undefined, this)
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
      } catch (e) {
        toast(explainError(e), "error");
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
    const canQuery = Boolean(cfg.baseUrl) && (Boolean(cfg.apiKey) || provider.keyOptional === true);
    return /* @__PURE__ */ u4(x, {
      children: [
        /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-provider",
              children: "Provider"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("select", {
              id: "ucs-provider",
              value: id,
              onChange: (e) => store.patchSettings({ provider: e.currentTarget.value }),
              children: PROVIDER_IDS.map((p) => /* @__PURE__ */ u4("option", {
                value: p,
                children: providers[p].label
              }, p, false, undefined, this))
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        id === "openai" && /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-base",
              children: "Endpoint URL"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("input", {
              id: "ucs-base",
              type: "url",
              class: "mono",
              placeholder: "http://localhost:11434/v1",
              value: settings.openaiBaseUrl,
              onInput: (e) => store.patchSettings({ openaiBaseUrl: e.currentTarget.value.trim() })
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("p", {
              class: "hint",
              children: [
                "Any OpenAI-compatible ",
                /* @__PURE__ */ u4("code", {
                  children: "/v1"
                }, undefined, false, undefined, this),
                " base: OpenAI (https://api.openai.com/v1), Ollama, LM Studio, vLLM… Your userscript manager may ask once to allow the host."
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("div", {
          class: "field",
          children: [
            /* @__PURE__ */ u4("label", {
              for: "ucs-key",
              children: [
                "API key",
                provider.keyOptional && " (optional)"
              ]
            }, undefined, true, undefined, this),
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
                  placeholder: provider.keyOptional ? "Not needed for local servers" : "Paste your key",
                  onInput: (e) => store.setApiKey(id, e.currentTarget.value)
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
                provider.keyHelpUrl && /* @__PURE__ */ u4(x, {
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
                    ".",
                    " "
                  ]
                }, undefined, true, undefined, this),
                "Stored by your userscript manager; sent only to the provider."
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4(ModelPicker, {
          id: "ucs-model",
          label: "Vision model",
          value: cfg.model,
          options: models.value,
          defaultModel: provider.defaultModel,
          placeholder: provider.defaultModel || "model id, e.g. gpt-4o-mini",
          onChange: (m) => store.setModel(id, m),
          resetKey: id,
          fetch: {
            run: () => void refreshModels(),
            busy: busy.value === "models",
            disabled: !canQuery || busy.value !== "",
            title: canQuery ? "Load the models this account can use" : "Fill in the key / URL first"
          },
          hint: "Reads text captchas and picture grids. Providers retire models often: on “model not found”, fetch the list and choose another."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ u4(ModelPicker, {
          id: "ucs-audio-model",
          label: "Speech-to-text model (audio captchas)",
          value: settings.audioModels[id] ?? "",
          options: provider.suggestedAudioModels.filter((m) => m !== provider.defaultAudioModel),
          defaultModel: "",
          emptyLabel: provider.defaultAudioModel ? `${provider.defaultAudioModel} (default)` : "Same as the vision model",
          placeholder: provider.defaultAudioModel || "e.g. whisper-1",
          onChange: (m) => store.setAudioModel(id, m),
          resetKey: id,
          hint: id === "gemini" ? "Gemini listens to audio itself, so the vision model works here. Used only for rules set to solve by audio." : "A transcription model (Whisper-style), not text-to-speech. Used only for rules set to solve by audio."
        }, undefined, false, undefined, this),
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
              onChange: (e) => store.patchSettings({ autoSolve: e.currentTarget.checked })
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
          class: "row wrap",
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
        /* @__PURE__ */ u4("section", {
          class: "group",
          "aria-labelledby": "ucs-presets",
          children: [
            /* @__PURE__ */ u4("h3", {
              id: "ucs-presets",
              class: "sub",
              children: "Image-grid captchas"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "row wrap",
              children: [
                PRESETS.map((p) => {
                  const state = presetState(p, store.sites.value);
                  return /* @__PURE__ */ u4("button", {
                    type: "button",
                    class: "btn sm",
                    disabled: state === "current",
                    title: state === "outdated" ? "Newer selectors available; your on/off, auto and audio choices are kept" : p.experimental ? "Selectors not yet verified against the live widget" : "",
                    onClick: () => {
                      store.mergeSites(presetRules(p, store.sites.value));
                      toast(state === "outdated" ? `Updated ${p.label}` : `Added ${p.label}. Tick the checkbox yourself; the challenge is solved for you`);
                    },
                    children: [
                      /* @__PURE__ */ u4(Icon, {
                        name: state === "current" ? "check" : "plus"
                      }, undefined, false, undefined, this),
                      state === "outdated" ? `Update ${p.label}` : p.label,
                      p.experimental && /* @__PURE__ */ u4("span", {
                        class: "chip warn",
                        children: "beta"
                      }, undefined, false, undefined, this)
                    ]
                  }, p.id, true, undefined, this);
                }),
                /* @__PURE__ */ u4("button", {
                  type: "button",
                  class: "btn sm",
                  onClick: () => void configureGridPage(),
                  children: [
                    /* @__PURE__ */ u4(Icon, {
                      name: "target"
                    }, undefined, false, undefined, this),
                    " Other grid…"
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ u4("p", {
          class: "hint",
          children: "Solves distorted-text, math, image-grid and audio captchas. Not Turnstile, invisible reCAPTCHA scoring, sliders or puzzles."
        }, undefined, false, undefined, this),
        sites.length === 0 ? /* @__PURE__ */ u4("p", {
          class: "empty",
          children: "No sites yet. For a text captcha, open its page and choose “Configure this page”. For reCAPTCHA, add it above."
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
                rule.kind !== "grid" ? `${rule.captcha} → ${rule.input}` : rule.solveBy === "audio" ? `audio: ${rule.audioSource} → ${rule.audioInput}` : `grid: ${rule.captcha}${rule.tiles ? ` · tiles ${rule.tiles}` : ""}`,
                rule.autoCheckbox && " · ticks the checkbox"
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4(StatsLine, {
              pattern
            }, undefined, false, undefined, this),
            /* @__PURE__ */ u4("div", {
              class: "acts",
              children: [
                /* @__PURE__ */ u4("input", {
                  type: "checkbox",
                  "aria-label": `Enable ${pattern}`,
                  checked: rule.enabled,
                  onChange: (e) => store.saveSite(pattern, { ...rule, enabled: e.currentTarget.checked })
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
  function StatsLine({ pattern }) {
    const perModel = store.stats.value[pattern];
    if (!perModel || !Object.keys(perModel).length)
      return null;
    return /* @__PURE__ */ u4("div", {
      class: "stats",
      children: [
        Object.entries(perModel).map(([model, s]) => /* @__PURE__ */ u4("div", {
          children: [
            /* @__PURE__ */ u4("span", {
              class: "mono",
              children: model
            }, undefined, false, undefined, this),
            ": ",
            s.tries,
            " tries · ",
            s.answered,
            " answered · ",
            s.errors,
            " errors",
            s.passes > 0 && /* @__PURE__ */ u4("span", {
              title: "Checkbox turned green. Includes times Google passed you without a challenge",
              children: [
                " ",
                "· ",
                s.passes,
                " passes"
              ]
            }, undefined, true, undefined, this),
            s.answered > 0 && /* @__PURE__ */ u4(x, {
              children: [
                " · ",
                (s.ms / s.answered / 1000).toFixed(1),
                " s avg"
              ]
            }, undefined, true, undefined, this)
          ]
        }, model, true, undefined, this)),
        /* @__PURE__ */ u4("button", {
          type: "button",
          class: "link",
          onClick: () => store.resetStats(pattern),
          children: "Reset stats"
        }, undefined, false, undefined, this)
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
      } catch (e) {
        toast(e.message, "error");
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
            "configure this page · ",
            /* @__PURE__ */ u4("kbd", {
              children: "Alt"
            }, undefined, false, undefined, this),
            "+",
            /* @__PURE__ */ u4("kbd", {
              children: "Shift"
            }, undefined, false, undefined, this),
            "+",
            /* @__PURE__ */ u4("kbd", {
              children: "G"
            }, undefined, false, undefined, this),
            " configure an image grid (inside its frame)."
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }

  // src/ui/site-editor.tsx
  function matchChip(selector, many = false) {
    if (!selector?.trim())
      return null;
    try {
      const n = document.querySelectorAll(selector).length;
      if (many)
        return /* @__PURE__ */ u4("span", {
          class: `chip ${n ? "ok" : "warn"}`,
          children: n ? `${n} tiles` : "not on this page"
        }, undefined, false, undefined, this);
      if (n === 1)
        return /* @__PURE__ */ u4("span", {
          class: "chip ok",
          children: "1 match on this page"
        }, undefined, false, undefined, this);
      if (n === 0)
        return /* @__PURE__ */ u4("span", {
          class: "chip warn",
          children: "not on this page"
        }, undefined, false, undefined, this);
      return /* @__PURE__ */ u4("span", {
        class: "chip warn",
        children: [
          n,
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
    const setPattern = (p) => editor.value = { ...state, pattern: p };
    const err = (k) => errors.value[k] && /* @__PURE__ */ u4("p", {
      class: "err",
      children: errors.value[k]
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
      toast(matchesHere ? "Saved. Active on this page" : "Saved");
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
              onInput: (e) => set({ [key]: e.currentTarget.value })
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
    const n = (value) => value === "" ? Number.NaN : Number(value);
    const kind = rule.kind ?? "text";
    const grid = kind === "grid";
    const audio = grid && rule.solveBy === "audio";
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
              onInput: (e) => setPattern(e.currentTarget.value)
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
              onChange: (e) => set({ kind: e.currentTarget.value }),
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
            /* @__PURE__ */ u4("div", {
              class: "field",
              children: [
                /* @__PURE__ */ u4("label", {
                  for: "ucs-solveby",
                  children: "Solve by"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("select", {
                  id: "ucs-solveby",
                  value: audio ? "audio" : "image",
                  onChange: (e) => set({ solveBy: e.currentTarget.value }),
                  children: [
                    /* @__PURE__ */ u4("option", {
                      value: "image",
                      children: "Pictures: click the matching tiles"
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ u4("option", {
                      value: "audio",
                      children: "Audio: switch to the audio version, transcribe, type"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ u4("p", {
                  class: "hint",
                  children: "Your choice per site; the widget has a one-click switch too."
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            selectorField("captcha", "Grid image", "The picture sent to the model, with tile numbers drawn on."),
            selectorField("tiles", "Tiles (optional)", 'Pick one tile; it widens to all of them. Needed for "click until none left" grids. Empty = click by position.'),
            /* @__PURE__ */ u4("label", {
              class: "check",
              children: [
                /* @__PURE__ */ u4("input", {
                  type: "checkbox",
                  checked: rule.compose ?? false,
                  onChange: (e) => set({ compose: e.currentTarget.checked })
                }, undefined, false, undefined, this),
                "Each tile is its own picture (build the grid from the tiles, e.g. hCaptcha)"
              ]
            }, undefined, true, undefined, this),
            selectorField("instruction", "Challenge text", 'The "Select all images with…" text. Or put it in the hint.'),
            selectorField("submit", "Verify / Next button (optional)", "Clicked after the tiles or the typed audio answer. Leave empty to press it yourself."),
            /* @__PURE__ */ u4("details", {
              open: audio,
              children: [
                /* @__PURE__ */ u4("summary", {
                  children: "Audio version"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("div", {
                  class: "body",
                  style: { padding: 0 },
                  children: [
                    selectorField("audioButton", "Audio button", "Switches the challenge to audio (headphones icon)."),
                    selectorField("audioSource", "Audio clip", "The <audio> element or the download link."),
                    selectorField("audioInput", "Audio answer box"),
                    selectorField("imageButton", "Back-to-pictures button (optional)")
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ u4("details", {
              open: Boolean(rule.autoCheckbox),
              children: [
                /* @__PURE__ */ u4("summary", {
                  children: `"I'm not a robot" checkbox`
                }, undefined, false, undefined, this),
                /* @__PURE__ */ u4("div", {
                  class: "body",
                  style: { padding: 0 },
                  children: [
                    selectorField("checkbox", "Checkbox", "Used to count passes (it turns green). Lives in its own frame."),
                    /* @__PURE__ */ u4("label", {
                      class: "check",
                      children: [
                        /* @__PURE__ */ u4("input", {
                          type: "checkbox",
                          checked: rule.autoCheckbox ?? false,
                          disabled: !rule.checkbox,
                          onChange: (e) => set({ autoCheckbox: e.currentTarget.checked })
                        }, undefined, false, undefined, this),
                        "Tick it for me"
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ u4("p", {
                      class: "hint",
                      children: "Waits until the checkbox is on screen in a visible tab, pauses 1–2.5 s, then moves to it along a curve and presses. The click is still synthetic, so the site may serve more challenges than when you tick it yourself."
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this),
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
                    onInput: (e) => set({ gridSize: n(e.currentTarget.value) })
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
                  onInput: (e) => set({ hint: e.currentTarget.value })
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
              onChange: (e) => set({ auto: e.currentTarget.checked })
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
                          onChange: (e) => set({ charset: e.currentTarget.value }),
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
                          onChange: (e) => set({ caseMode: e.currentTarget.value }),
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
                              onInput: (e) => set({ minLength: n(e.currentTarget.value) })
                            }, undefined, false, undefined, this),
                            /* @__PURE__ */ u4("input", {
                              "aria-label": "Maximum length",
                              type: "number",
                              min: 0,
                              max: 64,
                              value: rule.maxLength ?? 0,
                              onInput: (e) => set({ maxLength: n(e.currentTarget.value) })
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
                      onInput: (e) => set({ hint: e.currentTarget.value })
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
/* Challenge popups are small and keep their buttons at the bottom: start in the top-right corner. */
.widget.framed { top: 6px; right: 6px; bottom: auto; }
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
.row.wrap { flex-wrap: wrap; }
.group { display: flex; flex-direction: column; gap: 8px; }
.sub { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--fg-dim); }
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

.stats { font-size: 11.5px; color: var(--fg-dim); display: grid; gap: 2px; grid-column: 1 / -1; }
.stats .mono { font-family: var(--mono); }
.link { border: 0; background: none; padding: 0; color: var(--accent); font-size: 11.5px; cursor: pointer; justify-self: start; }
`;

  // src/ui/widget.tsx
  var clamp = (n, lo, hi) => Math.max(lo, Math.min(n, Math.max(lo, hi)));
  function Widget() {
    const ref = T2(null);
    const drag = T2(null);
    const match = controller.match.value;
    const ui = store.widgetUi(IN_FRAME);
    const hidden = !match || IN_FRAME && !controller.present.value;
    F2(() => {
      const el = ref.current;
      if (!el || ui.x === undefined)
        return;
      const r = el.getBoundingClientRect();
      const x = clamp(r.left, 4, innerWidth - r.width - 4);
      const y = clamp(r.top, 4, innerHeight - r.height - 4);
      if (x !== r.left || y !== r.top)
        Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
    });
    if (hidden)
      return null;
    const { status } = controller;
    const st = status.value;
    const patchUi = (patch) => store.patchWidgetUi(IN_FRAME, patch);
    const { rule } = match;
    const disabled = !rule.enabled;
    const canSwitch = rule.kind === "grid" && Boolean(rule.audioSource && rule.audioInput);
    const switchMode = () => {
      const solveBy = rule.solveBy === "audio" ? "image" : "audio";
      store.saveSite(match.pattern, { ...rule, solveBy });
      toast(solveBy === "audio" ? "Audio mode: the clip is transcribed and typed" : "Picture mode: tiles are clicked");
    };
    const onDown = (e) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r)
        return;
      drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onMove = (e) => {
      const el = ref.current;
      const d = drag.current;
      if (!el || !d)
        return;
      d.moved ||= Math.hypot(e.movementX, e.movementY) > 0;
      const x = clamp(e.clientX - d.dx, 4, innerWidth - el.offsetWidth - 4);
      const y = clamp(e.clientY - d.dy, 4, innerHeight - el.offsetHeight - 4);
      Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto" });
    };
    const onUp = () => {
      const el = ref.current;
      const d = drag.current;
      drag.current = null;
      if (!el || !d)
        return;
      if (d.moved) {
        const r = el.getBoundingClientRect();
        patchUi({ x: Math.round(r.left), y: Math.round(r.top) });
      } else if (ui.minimized) {
        patchUi({ minimized: false });
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
        class: `widget min${IN_FRAME ? " framed" : ""}`,
        "data-phase": st.phase,
        style: pos,
        children: grip
      }, undefined, false, undefined, this);
    }
    return /* @__PURE__ */ u4("div", {
      ref,
      class: `widget${IN_FRAME ? " framed" : ""}`,
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
          onClick: () => store.saveSite(match.pattern, { ...rule, enabled: true }),
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
        canSwitch && !disabled && /* @__PURE__ */ u4("button", {
          type: "button",
          class: "icon",
          "aria-label": rule.solveBy === "audio" ? "Switch to solving by pictures" : "Switch to solving by audio",
          title: rule.solveBy === "audio" ? "Solving by audio. Click for pictures" : "Solving by pictures. Click for audio",
          onClick: switchMode,
          children: /* @__PURE__ */ u4(Icon, {
            name: rule.solveBy === "audio" ? "audio" : "image"
          }, undefined, false, undefined, this)
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
          onClick: () => patchUi({ minimized: true }),
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
  function solveNow() {
    const m = controller.match.value;
    if (!m)
      toast("No captcha rule for this site yet. Use “Configure this page” first", "error");
    else if (!m.rule.enabled)
      toast("The solver is turned off for this site. Enable it in Settings → Sites", "error");
    else
      controller.solve("manual");
  }
  function main() {
    const migrated = migrateV1(gmKV);
    const movedToOpenRouter = migrateOpenRouter(gmKV);
    if (migrated.sites || migrated.apiKey || movedToOpenRouter)
      store.reload();
    const open = (fn) => () => {
      mountUI();
      fn();
    };
    if (!IN_FRAME) {
      GM_registerMenuCommand("⚙ Settings", open(() => settingsTab.value = "provider"), "s");
      GM_registerMenuCommand("\uD83C\uDFAF Configure captcha on this page", open(() => void configureCurrentPage()), "c");
      GM_registerMenuCommand("\uD83E\uDDE9 Configure image-grid captcha on this page", open(() => void configureGridPage()), "g");
      GM_registerMenuCommand("▶ Solve now", open(solveNow), "r");
    }
    for (const key of [KEYS.settings, KEYS.sites, KEYS.stats]) {
      GM_addValueChangeListener(key, (_name, _old, _new, remote) => remote && store.reload());
    }
    window.addEventListener("keydown", (e) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey)
        return;
      if (e.code === "KeyS")
        open(solveNow)();
      else if (e.code === "KeyC")
        open(() => void configureCurrentPage())();
      else if (e.code === "KeyG")
        open(() => void configureGridPage())();
      else
        return;
      e.preventDefault();
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

  // src/ext/content.ts
  var ready = globalThis.__ucsReady;
  (ready ?? Promise.reject(new Error("[ucs] gm-shim.js did not load"))).then(() => {
    store.reload();
    main();
  });
})();
