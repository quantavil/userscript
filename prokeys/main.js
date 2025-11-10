// ==UserScript==
// @name         Smart Abbreviation Expander (AI)
// @namespace    https://github.com/your-namespace
// @version      1.9.1
// @description  Expand abbreviations with Shift+Space, open palette with Alt+P. Gemini grammar/tone correction with Alt+G. Supports {{date}}, {{time}}, {{day}}, {{clipboard}}, and {{cursor}}. Works in inputs, textareas, and contenteditable with robust insertion. Inline editing, in-panel settings screen, top-right FAB toggle, and hotkey customization. Fallback: if no caret, insert at end-of-line in a reasonable field.
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';

  // ----------------------
  // Config
  // ----------------------
  const CONFIG = {
    trigger: { shift: true, alt: false, ctrl: false, meta: false },      // Shift+Space (Space-based)
    palette: { code: 'KeyP', alt: true, shift: false, ctrl: false, meta: false }, // Alt+P
    correct: { code: 'KeyG', alt: true, shift: false, ctrl: false, meta: false }, // Alt+G
    maxAbbrevLen: 80,
    styleId: 'sae-styles',
    storeKeys: {
      dict: 'sae.dict.v1',
      tone: 'sae.gemini.tone.v1',
      keys: 'sae.keys.v1',
      fab: 'sae.ui.fabEnabled.v1',
    },
    toast: { throttleMs: 3000 },
    clipboardReadTimeoutMs: 350,
    searchDebounceMs: 150,
    gemini: {
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      model: 'gemini-2.5-flash-lite',
      temperature: 0.15,
      timeoutMs: 20000,
      maxInputChars: 32000,
      apiKey: 'AIzaSyBkbDlwdw4xUB9_wiwcNvXYnEGrLSlJcwU'
    },
  };

  // ----------------------
  // Default dictionary
  // ----------------------
  const DEFAULT_DICT = {
    brb: 'Be right back.',
    ty: 'Thank you!',
    hth: 'Hope this helps!',
    opt: 'Optional: {{cursor}}',
    log: 'Log Entry - {{date:iso}} {{time}}: {{cursor}}',
    track: 'The tracking number for your order is {{clipboard}}. {{cursor}}',
    dt: 'Today is {{day}}, {{date:long}} at {{time}}.',
  };

  // ----------------------
  // GM-safe helpers
  // ----------------------
  const GMX = {
    getValue: (k, d) => (typeof window.GM_getValue === 'function' ? window.GM_getValue(k, d) : JSON.parse(localStorage.getItem(k) || JSON.stringify(d))),
    setValue: (k, v) => (typeof window.GM_setValue === 'function' ? window.GM_setValue(k, v) : localStorage.setItem(k, JSON.stringify(v))),
    addStyle: (css) => {
      if (typeof window.GM_addStyle === 'function') return window.GM_addStyle(css);
      const s = document.createElement('style'); s.id = CONFIG.styleId; s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    },
    registerMenuCommand: (title, fn) => typeof window.GM_registerMenuCommand === 'function' && window.GM_registerMenuCommand(title, fn),
    request: (opts) => new Promise((resolve, reject) => {
      const { method = 'GET', url, headers = {}, data, timeout = CONFIG.gemini.timeoutMs } = opts;
      if (typeof window.GM_xmlhttpRequest === 'function') {
        window.GM_xmlhttpRequest({
          method, url, headers, data, timeout,
          onload: (res) => resolve({ status: res.status, text: res.responseText }),
          onerror: () => reject(new Error('Network error')),
          ontimeout: () => reject(new Error('Request timed out')),
        });
      } else {
        const controller = new AbortController(); const t = setTimeout(() => controller.abort(), timeout);
        fetch(url, { method, headers, body: data, signal: controller.signal })
          .then(async res => { clearTimeout(t); resolve({ status: res.status, text: await res.text() }); })
          .catch(err => { clearTimeout(t); reject(err); });
      }
    }),
  };

  // ----------------------
  // State
  // ----------------------
  const state = {
    dict: null,
    lastEditable: null,
    _lastToastAt: 0,
    tone: 'neutral',
    fabEnabled: true,
    _lastFocusedEditable: null,
    activeIndex: 0,
  };
  let paletteEl = null;
  let fabEl = null;
  let hotkeyCapture = null; // { kind: 'spaceOnly' | 'code', resolve, bubble }
  let toastEl = null;
  let toastTimer = null;
  let searchTimeout = null;

  // ----------------------
  // Styles
  // ----------------------
  const STYLES = `
    .sae-bubble{position:fixed;z-index:2147483647;max-width:min(560px,80vw);box-shadow:0 8px 24px rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#111;color:#fff;padding:10px 12px;font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;white-space:pre-wrap;pointer-events:auto}
    .sae-palette{position:fixed;z-index:2147483647;inset:0;display:none;align-items:center;justify-content:center;backdrop-filter:blur(2px);background:rgba(0,0,0,.25)}
    .sae-palette.open{display:flex}
    .sae-panel{width:min(720px,92vw);max-height:78vh;overflow:hidden;background:#111;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:10px;box-shadow:0 12px 36px rgba(0,0,0,.35);display:flex;flex-direction:column;font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .sae-panel-header{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:8px;padding:10px;border-bottom:1px solid rgba(255,255,255,.06)}
    .sae-search{width:100%;background:#1b1b1b;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:8px 10px;outline:none}
    .sae-icon-btn{padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:#1b1b1b;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s ease}
    .sae-icon-btn:hover{background:#252525;border-color:rgba(255,255,255,.2)}
    .sae-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .sae-list{overflow:auto;padding:6px}
    .sae-item{display:grid;grid-template-columns:160px 1fr auto;gap:10px;padding:8px;border-radius:6px;border:1px solid transparent;cursor:pointer;align-items:center}
    .sae-item:hover,.sae-item.active{background:#1b1b1b;border-color:rgba(255,255,255,.08)}
    .sae-key{opacity:.85;font-weight:600;color:#86b7ff}
    .sae-val{color:#ddd;white-space:pre-wrap}
    .sae-item-actions{display:flex;gap:4px;margin-left:auto}
    .sae-item-actions button{padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.12);background:#1b1b1b;color:#fff;cursor:pointer;font-size:11px}
    .sae-item-actions button:hover{background:#252525}
    .sae-item.editing{background:#1a1a2e;border-color:#4a4aff}
    .sae-item.editing input{background:#0c0c0c;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:4px;padding:4px 6px;width:100%;font:inherit}
    .sae-item.editing .sae-key{padding:0}
    .sae-item.editing .sae-val{padding:0}
    .sae-add-new{padding:10px;text-align:center;border-top:1px solid rgba(255,255,255,.06)}
    .sae-add-new button{padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:#1b1b1b;color:#86b7ff;cursor:pointer;font-weight:600}
    .sae-add-new button:hover{background:#252525}
    .sae-footer{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);opacity:.8}

    /* Settings screen inside palette */
    .sae-panel.settings-open .sae-list,
    .sae-panel.settings-open .sae-add-new,
    .sae-panel.settings-open .sae-search { display: none; }
    .sae-settings-view{display:none;padding:8px 10px;overflow:auto;max-height:78vh}
    .sae-panel.settings-open .sae-settings-view{display:block}
    .sae-hrow{display:grid;grid-template-columns:180px 1fr auto;align-items:center;gap:10px;padding:8px;border-bottom:1px solid rgba(255,255,255,.06)}
    .sae-hrow:last-child{border-bottom:none}
    .sae-select{background:#1b1b1b;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:6px 8px;font:inherit}
    .sae-btn{padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:#1b1b1b;color:#fff;cursor:pointer}
    .sae-btn:hover{background:#252525}
    .sae-chip{display:inline-block;padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:#1b1b1b;color:#ddd;margin-right:8px}
    .sae-settings-actions{display:flex;gap:8px;flex-wrap:wrap}
    .sae-settings-footer{padding-top:8px;display:flex;justify-content:flex-end}

    /* Minimal FAB at top-right edge */
    .sae-fab{
      position:fixed;
      top:0;
      right:0;
      width:40px;height:40px;
      display:flex;align-items:center;justify-content:center;
      border:1px solid rgba(255,255,255,.12);
      border-right:none;
      border-radius:6px 0 0 6px;
      background:#111;color:#fff;
      box-shadow:0 6px 18px rgba(0,0,0,.35);
      cursor:pointer;z-index:2147483647;
      user-select:none
    }
    .sae-fab:hover{background:#1b1b1b}
  `;

  // ----------------------
  // Boot
  // ----------------------
  init().catch(console.error);

  async function init() {
    state.dict = normalizeDict(await GMX.getValue(CONFIG.storeKeys.dict, DEFAULT_DICT)) || normalizeDict(DEFAULT_DICT);
    state.tone = await GMX.getValue(CONFIG.storeKeys.tone, 'neutral');

    // Load saved hotkeys
    const savedKeys = await GMX.getValue(CONFIG.storeKeys.keys, null);
    if (savedKeys?.trigger) Object.assign(CONFIG.trigger, savedKeys.trigger);
    if (savedKeys?.palette) Object.assign(CONFIG.palette, savedKeys.palette);
    if (savedKeys?.correct) Object.assign(CONFIG.correct, savedKeys.correct);

    // Load FAB enable flag
    state.fabEnabled = await GMX.getValue(CONFIG.storeKeys.fab, true);

    // Wait for DOM before adding styles and FAB
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDOM);
    } else {
      initDOM();
    }

    // Remember last focused editable (but ignore palette UI)
    document.addEventListener('focusin', (e) => {
      // Don't track focus inside the palette or FAB
      if (e.target.closest('.sae-palette, .sae-fab')) return;
      const el = isEditable(e.target);
      if (el) state._lastFocusedEditable = el;
    }, true);

    // Menu commands
    GMX.registerMenuCommand('Open Abbreviation Palette', () => {
      state.lastEditable = captureEditableContext();
      openPalette();
    });
    GMX.registerMenuCommand(`Toggle FAB (${state.fabEnabled ? 'on' : 'off'})`, async () => {
      await toggleFabSetting();
    });
    GMX.registerMenuCommand('Export Dictionary (.json)', exportDict);
    GMX.registerMenuCommand('Import Dictionary', () => importDict());
    GMX.registerMenuCommand('Reset Dictionary to Defaults', async () => {
      if (confirm('Reset dictionary to defaults?')) {
        await setDict(DEFAULT_DICT, 'Dictionary reset to defaults.');
      }
    });
    GMX.registerMenuCommand('Gemini: Correct Selection/Field (Alt+G)', triggerGeminiCorrection);
    GMX.registerMenuCommand('Gemini: Set Tone (neutral/friendly/formal/casual/concise)', async () => {
      const val = prompt('Tone (neutral, friendly, formal, casual, concise):', state.tone || 'neutral');
      if (val == null) return;
      const t = (val || '').trim().toLowerCase();
      const allowed = ['neutral', 'friendly', 'formal', 'casual', 'concise'];
      if (!allowed.includes(t)) return toast('Invalid tone.');
      state.tone = t;
      await GMX.setValue(CONFIG.storeKeys.tone, state.tone);
      toast(`Tone set to ${state.tone}.`);
    });

    document.addEventListener('keydown', onKeyDownCapture, true);
  }

  function initDOM() {
    GMX.addStyle(STYLES);
    if (state.fabEnabled) ensureFab();
  }

  // ----------------------
  // Key handling
  // ----------------------
  function matchSpaceHotkey(e, spec) {
    return (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar')
      && !!e.shiftKey === !!spec.shift && !!e.altKey === !!spec.alt && !!e.ctrlKey === !!spec.ctrl && !!e.metaKey === !!spec.meta;
  }
  function matchCodeHotkey(e, spec) {
    return e.code === spec.code
      && !!e.shiftKey === !!spec.shift && !!e.altKey === !!spec.alt && !!e.ctrlKey === !!spec.ctrl && !!e.metaKey === !!spec.meta;
  }
  function isEditable(el) {
    if (!el) return null;
    if (el instanceof HTMLTextAreaElement) return el;
    if (el instanceof HTMLInputElement) {
      const type = (el.type || 'text').toLowerCase();
      if (type === 'password') return null;
      if (['text', 'search', 'url', 'email', 'tel'].includes(type)) return el;
      return null;
    }
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) if (n.nodeType === 1 && n.isContentEditable) return n;
    return null;
  }

  async function onKeyDownCapture(e) {
    if (e.defaultPrevented || e.isComposing) return;

    // Intercept for hotkey capture (Settings → Hotkeys)
    if (hotkeyCapture) {
      // Don't block typing in normal inputs outside the capture flow
      if (e.target.matches('input, textarea, [contenteditable]') && !e.target.closest('.sae-bubble')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        hotkeyCapture.bubble?.update('Canceled.');
        setTimeout(() => hotkeyCapture.bubble?.close(), 600);
        hotkeyCapture.resolve(null);
        hotkeyCapture = null;
        return;
      }
      if (hotkeyCapture.kind === 'spaceOnly') {
        if (e.code !== 'Space') {
          hotkeyCapture.bubble?.update('Expand hotkey must include Space (e.g., Shift+Space). Esc to cancel.');
          return;
        }
        const spec = { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey };
        hotkeyCapture.bubble?.update(`Set: ${hotkeyToString(spec, true)}`);
        setTimeout(() => hotkeyCapture.bubble?.close(), 600);
        hotkeyCapture.resolve(spec);
        hotkeyCapture = null;
        return;
      } else {
        if (/^Shift|Alt|Control|Meta$/.test(e.key)) {
          hotkeyCapture.bubble?.update('Press a non-modifier key (with modifiers if you want).');
          return;
        }
        const spec = { code: e.code, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey };
        hotkeyCapture.bubble?.update(`Set: ${hotkeyToString(spec, false)}`);
        setTimeout(() => hotkeyCapture.bubble?.close(), 600);
        hotkeyCapture.resolve(spec);
        hotkeyCapture = null;
        return;
      }
    }

    if (paletteEl && paletteEl.classList.contains('open') && paletteEl.contains(e.target)) return;

    // Palette (Alt+P)
    if (matchCodeHotkey(e, CONFIG.palette)) {
      e.preventDefault(); e.stopPropagation();
      state.lastEditable = captureEditableContext();
      openPalette(); return;
    }
    // Gemini Correct (Alt+G)
    if (matchCodeHotkey(e, CONFIG.correct)) {
      const target = isEditable(e.target); if (!target) return;
      e.preventDefault(); e.stopPropagation();
      triggerGeminiCorrection(); return;
    }
    // Expand (Shift+Space or changed via settings)
    if (matchSpaceHotkey(e, CONFIG.trigger)) {
      const target = isEditable(e.target); if (!target) return;
      e.preventDefault(); e.stopPropagation();
      const ctx = captureEditableContext(); if (!ctx || !ctx.collapsed) return;
      const tokenInfo = extractAbbrevBeforeCaret(ctx); if (!tokenInfo || !tokenInfo.token) return;
      if (tokenInfo.token.length > CONFIG.maxAbbrevLen) return;
      const tmpl = state.dict[tokenInfo.token.toLowerCase()]; if (!tmpl) return;
      try { const rendered = await renderTemplate(tmpl); await performExpansion(ctx, tokenInfo, rendered); }
      catch (err) { console.warn('SAE expand error:', err); }
    }
  }

  // ----------------------
  // Context extraction
  // ----------------------
  function captureEditableContext() {
    const active = document.activeElement; const el = isEditable(active); if (!el) return null;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return { kind: 'input', el, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0, collapsed: (el.selectionStart === el.selectionEnd) };
    } else {
      const root = el; const sel = getSafeSelection(); if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      return { kind: 'ce', root, range: range.cloneRange(), collapsed: range.collapsed };
    }
  }

  const isWordChar = (() => { try { const re = new RegExp('[\\p{L}\\p{N}_-]', 'u'); return ch => re.test(ch); } catch { return ch => /[A-Za-z0-9_-]/.test(ch); } })();

  function extractAbbrevBeforeCaret(ctx) {
    if (ctx.kind === 'input') {
      const { el, start, end } = ctx; if (start !== end) return null;
      const text = el.value.slice(0, start);
      let i = text.length - 1, count = 0;
      for (; i >= 0; i--) { const ch = text[i]; if (!isWordChar(ch)) break; if (++count > CONFIG.maxAbbrevLen) break; }
      const tokenStart = Math.max(0, i + 1);
      return { token: text.slice(tokenStart), tokenStart, tokenEnd: start };
    } else {
      const sel = getSafeSelection(); if (!sel || sel.rangeCount === 0) return null;
      const caretRange = sel.getRangeAt(0); if (!caretRange.collapsed) return null;
      const prefixRange = document.createRange(); prefixRange.selectNodeContents(ctx.root);
      try { prefixRange.setEnd(caretRange.startContainer, caretRange.startOffset); } catch { return null; }
      const prefix = prefixRange.toString();
      let i = prefix.length - 1, count = 0;
      for (; i >= 0; i--) { const ch = prefix[i]; if (!isWordChar(ch)) break; if (++count > CONFIG.maxAbbrevLen) break; }
      const token = prefix.slice(Math.max(0, i + 1));
      const tokenRange = caretRange.cloneRange(); moveRangeStartByChars(tokenRange, token.length, ctx.root);
      return { token, tokenRange };
    }
  }

  function moveRangeStartByChars(range, n, root) {
    let remaining = n;
    while (remaining > 0) {
      let sc = range.startContainer, so = range.startOffset;
      if (sc.nodeType === Node.TEXT_NODE) {
        const move = Math.min(so, remaining);
        so -= move; remaining -= move; range.setStart(sc, so);
        if (remaining === 0) break;
        const prev = previousTextNode(root, sc); if (!prev) break; range.setStart(prev, prev.nodeValue.length);
      } else {
        const candidate = so > 0 ? lastTextDescendant(sc.childNodes[so - 1]) : previousTextNode(root, sc);
        if (!candidate) break; range.setStart(candidate, candidate.nodeValue.length);
      }
    }
  }
  function previousTextNode(root, node) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let prev = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (n === node) return prev; prev = n; }
    return null;
  }
  function lastTextDescendant(start) {
    if (!start) return null; if (start.nodeType === Node.TEXT_NODE) return start;
    let walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT), last = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) last = n;
    return last;
  }
  function getSafeSelection() { const sel = window.getSelection?.(); return (!sel || sel.rangeCount === 0) ? null : sel; }

  // ----------------------
  // Template rendering
  // ----------------------
  async function renderTemplate(template) {
    const now = new Date(); let out = '', cursorIndex = -1;
    const re = /{{\s*([a-zA-Z]+)(?::([^}]+))?\s*}}/g; let idx = 0;
    for (; ;) {
      const m = re.exec(template); if (!m) { out += template.slice(idx); break; }
      out += template.slice(idx, m.index); idx = m.index + m[0].length;
      const tag = m[1].toLowerCase(), arg = (m[2] || '').trim();
      if (tag === 'cursor') { if (cursorIndex === -1) cursorIndex = out.length; continue; }
      if (tag === 'date') { out += formatDate(now, arg); continue; }
      if (tag === 'time') { out += formatTime(now, arg); continue; }
      if (tag === 'day') { out += formatDay(now, arg); continue; }
      if (tag === 'clipboard') { out += await readClipboardSafe() ?? ''; continue; }
      out += m[0];
    }
    return { text: out, cursorIndex: cursorIndex >= 0 ? cursorIndex : out.length };
  }
  const pad2 = n => String(n).padStart(2, '0');
  function formatDate(d, arg) {
    const a = (arg || 'iso').toLowerCase();
    switch (a) {
      case 'iso': case 'ymd': return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      case 'mdy': case 'us': return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
      case 'dmy': return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
      case 'long': return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      case 'short': return d.toLocaleDateString();
      default: return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }
  }
  function formatTime(d, arg) {
    const mode = (arg || '12').toLowerCase();
    if (mode === '24' || mode === '24h') return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    let h = d.getHours(); const m = pad2(d.getMinutes()), ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${pad2(h)}:${m} ${ampm}`;
  }
  function formatDay(d, arg) { return d.toLocaleDateString(undefined, (!arg || arg.toLowerCase() === 'long') ? { weekday: 'long' } : { weekday: 'short' }); }

  async function readClipboardSafe() {
    let resolved = false;
    const timeout = new Promise(r => setTimeout(() => {
      if (!resolved) {
        resolved = true;
        r('');
      }
    }, CONFIG.clipboardReadTimeoutMs));

    const read = (async () => {
      try {
        if (!navigator.clipboard?.readText) return '';
        const t = await navigator.clipboard.readText();
        if (!resolved) {
          resolved = true;
          return t ?? '';
        }
        return '';
      } catch {
        if (!resolved) {
          resolved = true;
          throttledToast('Clipboard read blocked — allow permission to use {{clipboard}}.');
        }
        return '';
      }
    })();

    return await Promise.race([read, timeout]);
  }

  // ----------------------
  // Perform abbreviation expansion
  // ----------------------
  async function performExpansion(ctx, tokenInfo, rendered) {
    if (ctx.kind === 'input') {
      const { el } = ctx, start = tokenInfo.tokenStart, end = tokenInfo.tokenEnd;
      el.setRangeText(rendered.text, start, end, 'end');
      const caret = start + (rendered.cursorIndex ?? rendered.text.length);
      el.selectionStart = el.selectionEnd = caret;
      dispatchInput(el, 'insertText', rendered.text);
    } else {
      const sel = getSafeSelection(); if (!sel) return;
      const r = tokenInfo.tokenRange.cloneRange(); r.deleteContents();
      const { fragment, cursorNode, cursorOffset, lastNode } = buildFragment(rendered.text, rendered.cursorIndex);
      r.insertNode(fragment);
      placeCaretAfterInsertion(sel, r, cursorNode, cursorOffset, lastNode);
      dispatchInput(ctx.root, 'insertText', rendered.text);
    }
  }
  function buildFragment(text, cursorIndex) {
    const frag = document.createDocumentFragment(); let pos = 0, cursorNode = null, cursorOffset = 0;
    const parts = String(text).split('\n'); let lastNode = null;
    parts.forEach((part, idx) => {
      const t = document.createTextNode(part); frag.appendChild(t); lastNode = t;
      if (cursorNode == null && cursorIndex <= pos + part.length) { cursorNode = t; cursorOffset = clamp(cursorIndex - pos, 0, t.nodeValue.length); }
      pos += part.length;
      if (idx < parts.length - 1) { frag.appendChild(document.createElement('br')); pos += 1; }
    });
    if (!cursorNode && lastNode) { cursorNode = lastNode; cursorOffset = lastNode.nodeValue.length; }
    return { fragment: frag, cursorNode, cursorOffset, lastNode };
  }
  function placeCaretAfterInsertion(sel, refRange, cursorNode, cursorOffset, lastNode) {
    const newRange = document.createRange();
    if (cursorNode) newRange.setStart(cursorNode, cursorOffset);
    else if (lastNode) newRange.setStartAfter(lastNode);
    else newRange.setStart(refRange.startContainer, refRange.startOffset);
    newRange.collapse(true); sel.removeAllRanges(); sel.addRange(newRange);
  }
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function dispatchInput(node, inputType, data) {
    try { node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data })); }
    catch { node.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  // ----------------------
  // Gemini correction
  // ----------------------
  async function triggerGeminiCorrection() {
    const ctx = captureEditableContext(); if (!ctx) return;
    const bubble = showBubble('Polishing text with Gemini…');
    try {
      if (ctx.kind === 'input') {
        const el = ctx.el; let { selectionStart: start = 0, selectionEnd: end = 0 } = el;
        if (start === end) { start = 0; end = el.value.length; }
        const srcText = el.value.slice(start, end); if (!srcText) return done('Nothing to rewrite.', 1200);
        const truncated = maybeTruncate(srcText, CONFIG.gemini.maxInputChars); if (truncated.truncated) throttledToast(`Note: input truncated to ${CONFIG.gemini.maxInputChars} chars for correction.`);
        const correctedRaw = await correctWithGemini(truncated.text, bubble); if (correctedRaw == null) return;
        const corrected = stripModelArtifacts(correctedRaw);
        el.setRangeText(corrected, start, end, 'end');
        el.selectionStart = el.selectionEnd = start + corrected.length;
        dispatchInput(el, 'insertReplacementText', corrected);
        return done('Rewritten ✓', 900);
      } else {
        const root = ctx.root, sel = getSafeSelection(); if (!sel || sel.rangeCount === 0) return done('', 0);
        let range = sel.getRangeAt(0).cloneRange(); if (range.collapsed) { range = document.createRange(); range.selectNodeContents(root); }
        const srcText = range.toString(); if (!srcText) return done('Nothing to rewrite.', 1200);
        const truncated = maybeTruncate(srcText, CONFIG.gemini.maxInputChars); if (truncated.truncated) throttledToast(`Note: input truncated to ${CONFIG.gemini.maxInputChars} chars for correction.`);
        const correctedRaw = await correctWithGemini(truncated.text, bubble); if (correctedRaw == null) return;
        const corrected = stripModelArtifacts(correctedRaw);
        range.deleteContents();
        const { fragment, lastNode } = buildFragment(corrected, corrected.length);
        range.insertNode(fragment);
        const newRange = document.createRange(); if (lastNode) newRange.setStartAfter(lastNode); else newRange.setStart(range.startContainer, range.startOffset);
        newRange.collapse(true); sel.removeAllRanges(); sel.addRange(newRange);
        dispatchInput(root, 'insertReplacementText', corrected);
        return done('Rewritten ✓', 900);
      }
    } catch (err) {
      console.warn('Gemini correction error:', err); return done('AI Fix failed — check console.', 1400);
    }
    function done(msg, ms) { if (msg) bubble.update(msg); setTimeout(() => bubble.close(), ms || 0); }
  }
  function maybeTruncate(text, max) { return text.length <= max ? { text, truncated: false } : { text: text.slice(0, max), truncated: true }; }
  async function correctWithGemini(text, bubble) {
    const key = (CONFIG.gemini.apiKey || '').trim();
    if (!key) { bubble?.update('Add your Gemini API key in CONFIG.gemini.apiKey (userscript).'); throttledToast('No Gemini API key set in script (CONFIG.gemini.apiKey).'); setTimeout(() => bubble && bubble.close(), 1400); return null; }
    const url = `${CONFIG.gemini.endpoint}/${encodeURIComponent(CONFIG.gemini.model)}:generateContent?key=${encodeURIComponent(key)}`;
    const tone = (state.tone || 'neutral').toLowerCase();
    const prompt = [
      `You are a writing assistant.`,
      `Task: Correct grammar, spelling, punctuation; improve clarity and flow.`,
      `Tone: ${tone}. Preserve meaning. Keep the language and details.`,
      `Do not add explanations or quotes. Return only the corrected text.`,
      `Keep line breaks where reasonable.`,
      ``, `Text:`, text
    ].join('\n');
    try {
      const res = await GMX.request({
        method: 'POST', url, headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: CONFIG.gemini.temperature } }),
        timeout: CONFIG.gemini.timeoutMs,
      });
      if (res.status < 200 || res.status >= 300) { console.warn('Gemini error HTTP', res.status, res.text); bubble?.update(`Gemini error: HTTP ${res.status}`); throttledToast(`Gemini error: HTTP ${res.status}`); setTimeout(() => bubble && bubble.close(), 1400); return null; }
      let json; try { json = JSON.parse(res.text); } catch { bubble?.update('Gemini: Parse error.'); throttledToast('Gemini: Failed to parse response.'); setTimeout(() => bubble && bubble.close(), 1400); return null; }
      const cand = json.candidates && json.candidates[0]; const parts = (cand && cand.content && cand.content.parts) || []; const out = parts.map(p => p.text || '').join('').trim();
      if (!out) { bubble?.update('Gemini: Empty response.'); throttledToast('Gemini: Empty response.'); setTimeout(() => bubble && bubble.close(), 1400); return null; }
      return out;
    } catch (err) {
      console.warn('Gemini request failed:', err); bubble?.update('Gemini request failed.'); throttledToast('Gemini request failed. Check connection.'); setTimeout(() => bubble && bubble.close(), 1400); return null;
    }
  }
  function stripModelArtifacts(s) {
    if (!s) return s; let out = String(s).trim();
    const m = out.match(/^\s*```(?:\w+)?\s*([\s\S]*?)\s*```\s*$/); if (m) out = m[1].trim();
    if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) out = out.slice(1, -1);
    return out;
  }

  // ----------------------
  // Palette UI + dict management (Export/Import) + FAB + Hotkeys
  // ----------------------
  async function setDict(obj, msg) {
    state.dict = normalizeDict(obj);
    await GMX.setValue(CONFIG.storeKeys.dict, state.dict);
    paletteEl?.__render?.(); toast(msg || 'Dictionary updated.');
  }
  function pickFile(accept = '.json') {
    return new Promise(resolve => { const input = document.createElement('input'); input.type = 'file'; input.accept = accept; input.onchange = () => resolve(input.files?.[0] || null); input.click(); });
  }
  function exportDict() {
    const data = JSON.stringify(state.dict, null, 2);
    const name = `sae-dict-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
    document.documentElement.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Dictionary exported.');
  }
  async function importDict() {
    const file = await pickFile('.json'); if (!file) return;
    try {
      const text = await file.text(); let obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && obj.dict && typeof obj.dict === 'object') obj = obj.dict;
      const imported = normalizeDict(obj); const count = Object.keys(imported).length;
      if (!count) return toast('Import failed: no entries detected.');
      const next = { ...state.dict, ...imported };
      await setDict(next, `Imported ${count} entr${count === 1 ? 'y' : 'ies'}.`);
    } catch (err) { console.warn('Import failed:', err); toast('Import failed: invalid JSON.'); }
  }

  function ensurePalette() {
    if (paletteEl) return paletteEl;

    const wrap = document.createElement('div');
    wrap.className = 'sae-palette';
    wrap.innerHTML = `
      <div class="sae-panel" role="dialog" aria-label="Abbreviation Palette">
        <div class="sae-panel-header">
          <input class="sae-search" type="search" placeholder="Search abbreviations…" />
          <button class="sae-icon-btn" data-action="settings" title="Settings">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v10M1 12h6m6 0h10"></path>
              <path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24M19.07 4.93l-4.24 4.24m-5.66 5.66-4.24 4.24"></path>
            </svg>
          </button>
          <button class="sae-icon-btn" data-action="back" title="Back" style="display:none">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button class="sae-icon-btn" data-action="close" title="Close">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="sae-settings-view"></div>
        <div class="sae-list" tabindex="0"></div>
        <div class="sae-add-new">
          <button data-action="add">+ Add New Abbreviation</button>
        </div>
        <div class="sae-footer">Alt+P to open · Shift+Space to expand · Alt+G to correct grammar/tone</div>
      </div>
    `;
    document.documentElement.appendChild(wrap);

    const panel = wrap.querySelector('.sae-panel');
    const search = wrap.querySelector('.sae-search');
    const list = wrap.querySelector('.sae-list');
    const settingsBtn = wrap.querySelector('[data-action="settings"]');
    const backBtn = wrap.querySelector('[data-action="back"]');
    const closeBtn = wrap.querySelector('[data-action="close"]');
    const addNewBtn = wrap.querySelector('.sae-add-new button');
    const settingsView = wrap.querySelector('.sae-settings-view');

    function renderList(filter = '') {
      const q = filter.trim().toLowerCase();
      const keys = Object.keys(state.dict).sort();
      const items = q ? keys.filter(k => k.includes(q) || state.dict[k].toLowerCase().includes(q)) : keys;

      // Clamp active index
      if (state.activeIndex >= items.length) state.activeIndex = Math.max(0, items.length - 1);

      list.innerHTML = items.map((k, i) => `
        <div class="sae-item${i === state.activeIndex ? ' active' : ''}" data-key="${escapeHtml(k)}" data-index="${i}">
          <div class="sae-key">${escapeHtml(k)}</div>
          <div class="sae-val">${escapeHtml(state.dict[k])}</div>
          <div class="sae-item-actions">
            <button data-action="edit">Edit</button>
            <button data-action="delete">Delete</button>
          </div>
        </div>`).join('');
    }

    // Event delegation for list items
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.sae-item:not(.editing)');
      if (!item) return;

      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'edit') {
        e.stopPropagation();
        editItem(item);
      } else if (action === 'delete') {
        e.stopPropagation();
        deleteItem(item.dataset.key);
      } else if (e.target.closest('.sae-key, .sae-val')) {
        selectAndInsert(item.dataset.key);
      }
    });

    function editItem(itemDiv) {
      const key = itemDiv.dataset.key;
      const value = state.dict[key];
      itemDiv.classList.add('editing');
      itemDiv.innerHTML = `
        <div class="sae-key"><input type="text" class="edit-key" value="${escapeHtml(key)}" /></div>
        <div class="sae-val"><input type="text" class="edit-val" value="${escapeHtml(value)}" /></div>
        <div class="sae-item-actions">
          <button data-action="save">Save</button>
          <button data-action="cancel">Cancel</button>
        </div>
      `;
      const keyInput = itemDiv.querySelector('.edit-key');
      const valInput = itemDiv.querySelector('.edit-val');
      const saveBtn = itemDiv.querySelector('[data-action="save"]');
      const cancelBtn = itemDiv.querySelector('[data-action="cancel"]');

      keyInput.focus();
      keyInput.select();

      const save = async () => {
        const newKey = keyInput.value.trim().toLowerCase();
        const newVal = valInput.value.trim();
        if (!newKey || !newVal) return toast('Key and value cannot be empty.');
        const updated = { ...state.dict };
        if (newKey !== key) delete updated[key];
        updated[newKey] = newVal;
        await setDict(updated, 'Abbreviation saved.');
      };
      const cancel = () => renderList(search.value);

      saveBtn.addEventListener('click', save);
      cancelBtn.addEventListener('click', cancel);
      keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); valInput.focus(); } if (e.key === 'Escape') { e.preventDefault(); cancel(); } });
      valInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { e.preventDefault(); cancel(); } });
    }

    function deleteItem(key) {
      if (!confirm(`Delete abbreviation "${key}"?`)) return;
      const updated = { ...state.dict };
      delete updated[key];
      setDict(updated, 'Abbreviation deleted.');
    }

    function addNewItem() {
      const tempDiv = document.createElement('div');
      tempDiv.className = 'sae-item editing';
      tempDiv.innerHTML = `
        <div class="sae-key"><input type="text" class="edit-key" placeholder="abbreviation" /></div>
        <div class="sae-val"><input type="text" class="edit-val" placeholder="Expansion text..." /></div>
        <div class="sae-item-actions">
          <button data-action="save">Save</button>
          <button data-action="cancel">Cancel</button>
        </div>
      `;
      list.insertBefore(tempDiv, list.firstChild);
      const keyInput = tempDiv.querySelector('.edit-key');
      const valInput = tempDiv.querySelector('.edit-val');
      const saveBtn = tempDiv.querySelector('[data-action="save"]');
      const cancelBtn = tempDiv.querySelector('[data-action="cancel"]');
      keyInput.focus();

      const save = async () => {
        const newKey = keyInput.value.trim().toLowerCase();
        const newVal = valInput.value.trim();
        if (!newKey || !newVal) return toast('Key and value cannot be empty.');
        const updated = { ...state.dict, [newKey]: newVal };
        await setDict(updated, 'Abbreviation added.');
      };
      const cancel = () => { tempDiv.remove(); renderList(search.value); };

      saveBtn.addEventListener('click', save);
      cancelBtn.addEventListener('click', cancel);
      keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); valInput.focus(); } if (e.key === 'Escape') { e.preventDefault(); cancel(); } });
      valInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') { e.preventDefault(); cancel(); } });
    }

    async function selectAndInsert(key) {
      const ctx = getBestInsertionContext();
      closePalette();

      const tmpl = state.dict[key];
      if (!tmpl || !ctx) { if (!ctx) toast('No editable field found.'); return; }
      const rendered = await renderTemplate(tmpl);

      if (ctx.kind === 'input') {
        const { el } = ctx;
        const posStart = el.selectionStart ?? ctx.start ?? el.value.length;
        const posEnd = el.selectionEnd ?? ctx.end ?? posStart;
        const start = (posStart === undefined ? el.value.length : posStart);
        const end = (posEnd === undefined ? el.value.length : posEnd);
        el.setRangeText(rendered.text, start, end, 'end');
        const caret = start + (rendered.cursorIndex ?? rendered.text.length);
        el.selectionStart = el.selectionEnd = caret;
        dispatchInput(el, (end > start ? 'insertReplacementText' : 'insertText'), rendered.text);
      } else {
        const r = ctx.range.cloneRange();
        r.deleteContents();
        const { fragment, cursorNode, cursorOffset, lastNode } = buildFragment(rendered.text, rendered.cursorIndex);
        r.insertNode(fragment);
        const sel = window.getSelection();
        placeCaretAfterInsertion(sel, r, cursorNode, cursorOffset, lastNode);
        dispatchInput(ctx.root, 'insertText', rendered.text);
      }
    }

    function openSettingsView() {
      panel.classList.add('settings-open');
      backBtn.style.display = 'flex';
      renderSettingsView();
    }
    function closeSettingsView() {
      panel.classList.remove('settings-open');
      backBtn.style.display = 'none';
      search.focus({ preventScroll: true });
    }

    function renderSettingsView() {
      const hkExpand = hotkeyToString(CONFIG.trigger, true);
      const hkPalette = hotkeyToString(CONFIG.palette, false);
      const hkCorrect = hotkeyToString(CONFIG.correct, false);
      const tones = ['neutral', 'friendly', 'formal', 'casual', 'concise'];

      settingsView.innerHTML = `
        <div class="sae-hrow">
          <div>FAB (top-right)</div>
          <div><label><input type="checkbox" class="fab-toggle"${state.fabEnabled ? ' checked' : ''}/> Show floating button</label></div>
          <div></div>
        </div>
        <div class="sae-hrow">
          <div>Tone (Gemini)</div>
          <div><select class="sae-select tone-select">
            ${tones.map(t => `<option value="${t}" ${t === state.tone ? 'selected' : ''}>${t}</option>`).join('')}
          </select></div>
          <div></div>
        </div>
        <div class="sae-hrow">
          <div>Hotkeys</div>
          <div>
            <div style="margin-bottom:6px">
              <span class="sae-chip">Expand: ${hkExpand}</span>
              <button class="sae-btn" data-hk="expand">Change</button>
            </div>
            <div style="margin-bottom:6px">
              <span class="sae-chip">Palette: ${hkPalette}</span>
              <button class="sae-btn" data-hk="palette">Change</button>
            </div>
            <div>
              <span class="sae-chip">Correct: ${hkCorrect}</span>
              <button class="sae-btn" data-hk="correct">Change</button>
            </div>
          </div>
          <div></div>
        </div>
        <div class="sae-hrow">
          <div>Dictionary</div>
          <div class="sae-settings-actions">
            <button class="sae-btn" data-action="export">Export JSON</button>
            <button class="sae-btn" data-action="import">Import JSON</button>
            <button class="sae-btn" data-action="reset">Reset to Defaults</button>
          </div>
          <div></div>
        </div>
        <div class="sae-settings-footer">
          <button class="sae-btn" data-action="done">Done</button>
        </div>
      `;

      settingsView.querySelector('.fab-toggle').addEventListener('change', () => toggleFabSetting());
      settingsView.querySelector('.tone-select').addEventListener('change', async (e) => {
        state.tone = e.target.value;
        await GMX.setValue(CONFIG.storeKeys.tone, state.tone);
        toast(`Tone set to ${state.tone}.`);
      });

      const hkMap = {
        expand: async () => { await setExpandHotkey(); renderSettingsView(); },
        palette: async () => { await setPaletteHotkey(); renderSettingsView(); },
        correct: async () => { await setCorrectHotkey(); renderSettingsView(); },
      };
      settingsView.querySelectorAll('[data-hk]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const kind = btn.getAttribute('data-hk');
          await hkMap[kind]?.();
        });
      });

      settingsView.querySelector('[data-action="export"]').addEventListener('click', () => exportDict());
      settingsView.querySelector('[data-action="import"]').addEventListener('click', () => importDict());
      settingsView.querySelector('[data-action="reset"]').addEventListener('click', () => {
        if (confirm('Reset dictionary to defaults?')) setDict(DEFAULT_DICT, 'Dictionary reset.');
      });
      settingsView.querySelector('[data-action="done"]').addEventListener('click', () => closeSettingsView());
    }

    settingsBtn.addEventListener('click', () => openSettingsView());
    backBtn.addEventListener('click', () => closeSettingsView());
    closeBtn.addEventListener('click', closePalette);
    addNewBtn.addEventListener('click', addNewItem);

    // Search with debouncing
    search.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.activeIndex = 0;
        renderList(search.value);
      }, CONFIG.searchDebounceMs);
    });

    // Keyboard handling (list view only)
    wrap.addEventListener('keydown', (e) => {
      if (panel.classList.contains('settings-open')) return;
      if (e.target.closest('.sae-item.editing')) return;
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const active = wrap.querySelector('.sae-item.active:not(.editing)');
        if (active) selectAndInsert(active.dataset.key);
        return;
      }
      const items = [...wrap.querySelectorAll('.sae-item:not(.editing)')];
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[state.activeIndex]?.classList.remove('active');
        state.activeIndex = Math.min(items.length - 1, state.activeIndex + 1);
        items[state.activeIndex]?.classList.add('active');
        items[state.activeIndex]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[state.activeIndex]?.classList.remove('active');
        state.activeIndex = Math.max(0, state.activeIndex - 1);
        items[state.activeIndex]?.classList.add('active');
        items[state.activeIndex]?.scrollIntoView({ block: 'nearest' });
      }
    });

    renderList();
    wrap.__render = () => renderList(search.value);
    paletteEl = wrap;
    return wrap;
  }

  function openPalette() {
    const p = ensurePalette();
    p.classList.add('open');
    document.body.style.overflow = 'hidden';
    const panel = p.querySelector('.sae-panel');
    panel.classList.remove('settings-open');
    const backBtn = p.querySelector('[data-action="back"]');
    if (backBtn) backBtn.style.display = 'none';
    const search = p.querySelector('.sae-search');
    search.value = '';
    state.activeIndex = 0;
    p.__render?.();
    search.focus({ preventScroll: true });
  }

  function closePalette() {
    if (!paletteEl) return;
    document.body.style.overflow = '';
    const panel = paletteEl.querySelector('.sae-panel');
    if (panel) panel.classList.remove('settings-open');
    const backBtn = paletteEl.querySelector('[data-action="back"]');
    if (backBtn) backBtn.style.display = 'none';
    paletteEl.classList.remove('open');
  }

  // ----------------------
  // FAB helpers
  // ----------------------
  function ensureFab() {
    if (fabEl) return;
    fabEl = document.createElement('button');
    fabEl.className = 'sae-fab';
    fabEl.type = 'button';
    fabEl.title = 'Abbreviation Palette';
    fabEl.textContent = '⋯';

    fabEl.addEventListener('click', (e) => {
      e.stopPropagation();
      // Capture context from last focused editable before palette opens
      if (state._lastFocusedEditable && state._lastFocusedEditable.isConnected) {
        state.lastEditable = buildEndContextForEl(state._lastFocusedEditable);
      } else {
        state.lastEditable = captureEditableContext();
      }
      openPalette();
    });

    document.documentElement.appendChild(fabEl);
  }

  function updateFabVisibility() {
    if (!fabEl) {
      if (state.fabEnabled) ensureFab();
      return;
    }
    fabEl.style.display = state.fabEnabled ? 'flex' : 'none';
  }

  async function toggleFabSetting() {
    state.fabEnabled = !state.fabEnabled;
    await GMX.setValue(CONFIG.storeKeys.fab, state.fabEnabled);
    updateFabVisibility();
    toast(`FAB ${state.fabEnabled ? 'enabled' : 'disabled'}.`);
  }

  // ----------------------
  // Hotkey helpers (Settings)
  // ----------------------
  function captureHotkey(kind) {
    return new Promise((resolve) => {
      const bubble = showBubble(kind === 'spaceOnly'
        ? 'Press new Expand hotkey (must include Space). Esc to cancel.'
        : 'Press new hotkey. Use modifiers if you want. Esc to cancel.');
      hotkeyCapture = { kind, resolve, bubble };
    });
  }

  async function setExpandHotkey() {
    const spec = await captureHotkey('spaceOnly');
    if (!spec) return;
    CONFIG.trigger = spec;
    const keys = await GMX.getValue(CONFIG.storeKeys.keys, {});
    keys.trigger = spec;
    await GMX.setValue(CONFIG.storeKeys.keys, keys);
    toast(`Expand hotkey set to ${hotkeyToString(spec, true)}`);
  }

  async function setPaletteHotkey() {
    const spec = await captureHotkey('code');
    if (!spec) return;
    CONFIG.palette = spec;
    const keys = await GMX.getValue(CONFIG.storeKeys.keys, {});
    keys.palette = spec;
    await GMX.setValue(CONFIG.storeKeys.keys, keys);
    toast(`Palette hotkey set to ${hotkeyToString(spec, false)}`);
  }

  async function setCorrectHotkey() {
    const spec = await captureHotkey('code');
    if (!spec) return;
    CONFIG.correct = spec;
    const keys = await GMX.getValue(CONFIG.storeKeys.keys, {});
    keys.correct = spec;
    await GMX.setValue(CONFIG.storeKeys.keys, keys);
    toast(`Correct hotkey set to ${hotkeyToString(spec, false)}`);
  }

  // ----------------------
  // Toast/bubble helpers
  // ----------------------
  function toast(msg, ms = 2200) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.className = 'sae-bubble';
    toastEl.textContent = msg;
    document.documentElement.appendChild(toastEl);
    const left = Math.max(8, window.innerWidth - 320), top = Math.max(8, window.innerHeight - 80);
    toastEl.style.left = `${left}px`;
    toastEl.style.top = `${top}px`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl?.remove();
      toastEl = null;
    }, ms);
  }

  function throttledToast(msg, ms = 2200) {
    const now = Date.now();
    if (now - state._lastToastAt < CONFIG.toast.throttleMs) return;
    state._lastToastAt = now;
    toast(msg, ms);
  }

  function showBubble(msg) {
    const el = document.createElement('div');
    el.className = 'sae-bubble';
    el.textContent = msg;
    document.documentElement.appendChild(el);
    const left = Math.max(8, window.innerWidth - 320), top = Math.max(8, window.innerHeight - 80);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    return {
      update: (m) => { el.textContent = m; },
      close: () => el.remove()
    };
  }

  // ----------------------
  // Fallback helpers (paste at end-of-line if no caret)
  // ----------------------
  function elementIsVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    if ((r.width === 0 && r.height === 0) || (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth)) return false;
    return true;
  }

  function fallbackFindEditable() {
    const lf = state._lastFocusedEditable && isEditable(state._lastFocusedEditable);
    if (lf && elementIsVisible(lf)) return lf;

    const ae = isEditable(document.activeElement);
    if (ae && elementIsVisible(ae)) return ae;

    const sel = 'textarea, input[type="text"], input[type="search"], input[type="url"], input[type="email"], input[type="tel"], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
    const nodes = Array.from(document.querySelectorAll(sel));
    for (const n of nodes) {
      const ed = isEditable(n);
      if (ed && elementIsVisible(ed) && !(ed instanceof HTMLInputElement && ed.disabled)) {
        return ed;
      }
    }
    return null;
  }

  function buildEndContextForEl(el) {
    if (!el) return null;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const pos = el.value.length;
      try { el.focus({ preventScroll: true }); } catch { }
      return { kind: 'input', el, start: pos, end: pos, collapsed: true };
    }
    let root = el;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n.isContentEditable) { root = n; break; }
    }
    try { root.focus({ preventScroll: true }); } catch { }
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    return { kind: 'ce', root, range, collapsed: true };
  }

  function getBestInsertionContext() {
    const ctx = captureEditableContext();
    if (ctx) return ctx;

    if (state.lastEditable && ((state.lastEditable.kind === 'input' && state.lastEditable.el?.isConnected) ||
      (state.lastEditable.kind === 'ce' && state.lastEditable.root?.isConnected))) {
      const el = (state.lastEditable.kind === 'input') ? state.lastEditable.el : state.lastEditable.root;
      return buildEndContextForEl(el);
    }

    const el = fallbackFindEditable();
    if (!el) return null;
    return buildEndContextForEl(el);
  }

  // ----------------------
  // Utils
  // ----------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function normalizeDict(obj) {
    const out = {};
    let dropped = 0;
    for (const [k, v] of Object.entries(obj || {})) {
      if (typeof k === 'string' && typeof v === 'string' && k.trim()) {
        out[k.trim().toLowerCase()] = v;
      } else {
        dropped++;
      }
    }
    if (dropped > 0) {
      console.warn(`SAE: Dropped ${dropped} invalid dictionary entries during normalization.`);
    }
    return out;
  }

  function hotkeyToString(spec, isSpace) {
    const parts = [];
    if (spec.ctrl) parts.push('Ctrl');
    if (spec.meta) parts.push('Meta');
    if (spec.alt) parts.push('Alt');
    if (spec.shift) parts.push('Shift');
    if (isSpace) parts.push('Space');
    else parts.push(codeToHuman(spec.code));
    return parts.join('+');
  }

  function codeToHuman(code) {
    if (!code) return '';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'Space') return 'Space';
    return code;
  }
})();