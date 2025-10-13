// ==UserScript==
// @name         Smart Abbreviation Expander (Shift+Space) — No Preview, Alt+P Palette
// @namespace    https://github.com/your-namespace
// @version      1.2.0
// @description  Expand abbreviations with Shift+Space, open palette with Alt+P. Supports {{date}}, {{time}}, {{day}}, {{clipboard}}, and {{cursor}}. Works in inputs, textareas, and contenteditable with robust insertion.
// @author       You
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';

  // ----------------------
  // Config
  // ----------------------
  const CONFIG = {
    trigger: { shift: true, alt: false, ctrl: false, meta: false },      // Shift+Space
    palette: { code: 'KeyP', alt: true, shift: false, ctrl: false, meta: false }, // Alt+P
    maxAbbrevLen: 80,
    styleId: 'sae-styles',
    storeKeys: { dict: 'sae.dict.v1' },
    toast: { throttleMs: 3000 },
    clipboardReadTimeoutMs: 350,
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
      if (typeof window.GM_addStyle === 'function') {
        window.GM_addStyle(css);
      } else {
        const s = document.createElement('style');
        s.id = CONFIG.styleId;
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
      }
    },
    registerMenuCommand: (title, fn) => {
      if (typeof window.GM_registerMenuCommand === 'function') window.GM_registerMenuCommand(title, fn);
    },
  };

  // ----------------------
  // State
  // ----------------------
  const state = {
    dict: null,
    lastEditable: null,
    _lastToastAt: 0,
  };

  // ----------------------
  // Styles
  // ----------------------
  GMX.addStyle(`
    .sae-bubble {
      position: fixed;
      z-index: 2147483647;
      max-width: min(560px, 80vw);
      box-shadow: 0 8px 24px rgba(0,0,0,.18);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      background: #111;
      color: #fff;
      padding: 10px 12px;
      font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      white-space: pre-wrap;
      pointer-events: auto;
    }
    .sae-palette {
      position: fixed;
      z-index: 2147483647;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
      background: rgba(0,0,0,.25);
    }
    .sae-palette.open { display: flex; }
    .sae-panel {
      width: min(720px, 92vw);
      max-height: 78vh;
      overflow: hidden;
      background: #111;
      color: #fff;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0,0,0,.35);
      display: flex;
      flex-direction: column;
      font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    }
    .sae-panel-header {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 6px;
      padding: 10px;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .sae-search {
      width: 100%;
      background: #1b1b1b;
      color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      padding: 8px 10px;
      outline: none;
    }
    .sae-header-actions button {
      margin-left: 6px; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12); background: #1b1b1b; color: #fff; cursor: pointer;
    }
    .sae-list { overflow: auto; padding: 6px; }
    .sae-item {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 10px;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      align-items: start;
    }
    .sae-item:hover, .sae-item.active {
      background: #1b1b1b;
      border-color: rgba(255,255,255,.08);
    }
    .sae-key { opacity: .85; font-weight: 600; color: #86b7ff; }
    .sae-val { color: #ddd; white-space: pre-wrap; }
    .sae-footer { padding: 8px 10px; border-top: 1px solid rgba(255,255,255,.06); opacity: .8; }
    .sae-editor {
      width: calc(100% - 20px);
      height: 42vh;
      margin: 10px;
      background: #0c0c0c;
      color: #fff;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 10px;
      display: none;
    }
    .sae-editor.open { display: block; }
  `);

  // ----------------------
  // Boot
  // ----------------------
  init().catch(console.error);

  async function init() {
    state.dict = normalizeDict(await GMX.getValue(CONFIG.storeKeys.dict, DEFAULT_DICT)) || normalizeDict(DEFAULT_DICT);

    GMX.registerMenuCommand('Open Abbreviation Palette', openPalette);
    GMX.registerMenuCommand('Edit Dictionary (JSON)', openPaletteEditor);
    GMX.registerMenuCommand('Reset Dictionary to Defaults', async () => {
      state.dict = normalizeDict(DEFAULT_DICT);
      await GMX.setValue(CONFIG.storeKeys.dict, state.dict);
      toast('Dictionary reset to defaults.');
      if (paletteEl && paletteEl.__render) paletteEl.__render();
    });

    document.addEventListener('keydown', onKeyDownCapture, true);
  }

  // ----------------------
  // Key handling
  // ----------------------
  function matchSpaceHotkey(e, spec) {
    return (e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar')
      && !!e.shiftKey === !!spec.shift
      && !!e.altKey === !!spec.alt
      && !!e.ctrlKey === !!spec.ctrl
      && !!e.metaKey === !!spec.meta;
  }
  function matchCodeHotkey(e, spec) {
    return e.code === spec.code
      && !!e.shiftKey === !!spec.shift
      && !!e.altKey === !!spec.alt
      && !!e.ctrlKey === !!spec.ctrl
      && !!e.metaKey === !!spec.meta;
  }

  function isEditable(el) {
    if (!el) return null;
    if (el instanceof HTMLTextAreaElement) return el;
    if (el instanceof HTMLInputElement) {
      const type = (el.type || 'text').toLowerCase();
      const allow = new Set(['text', 'search', 'url', 'email', 'tel']); // exclude password/number
      if (type === 'password' || !allow.has(type)) return null;
      return el;
    }
    let node = el;
    while (node && node !== document.documentElement) {
      if (node.nodeType === 1 && node.isContentEditable) return node;
      node = node.parentElement;
    }
    return null;
  }

  async function onKeyDownCapture(e) {
    if (e.defaultPrevented || e.isComposing) return;

    // Ignore events inside palette UI
    if (paletteEl && paletteEl.classList.contains('open') && paletteEl.contains(e.target)) return;

    // Palette (Alt+P)
    if (matchCodeHotkey(e, CONFIG.palette)) {
      const target = isEditable(e.target);
      if (!target) return; // only open when an editable is focused
      e.preventDefault(); e.stopPropagation();
      state.lastEditable = captureEditableContext();
      openPalette();
      return;
    }

    // Expand (Shift+Space)
    if (matchSpaceHotkey(e, CONFIG.trigger)) {
      const target = isEditable(e.target);
      if (!target) return;
      e.preventDefault(); e.stopPropagation(); // prevent page up

      const ctx = captureEditableContext();
      if (!ctx || !ctx.collapsed) return;

      const tokenInfo = extractAbbrevBeforeCaret(ctx);
      if (!tokenInfo || !tokenInfo.token) return;
      if (tokenInfo.token.length > CONFIG.maxAbbrevLen) return;

      const key = tokenInfo.token.toLowerCase();
      const tmpl = state.dict[key];
      if (!tmpl) return;

      try {
        const rendered = await renderTemplate(tmpl); // {text, cursorIndex}
        await performExpansion(ctx, tokenInfo, rendered);
      } catch (err) {
        console.warn('SAE expand error:', err);
      }
    }
  }

  // ----------------------
  // Context extraction
  // ----------------------
  function captureEditableContext() {
    const active = document.activeElement;
    const el = isEditable(active);
    if (!el) return null;

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return {
        kind: 'input',
        el,
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0,
        collapsed: (el.selectionStart === el.selectionEnd),
      };
    } else {
      const root = el;
      const sel = getSafeSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      return { kind: 'ce', root, range: range.cloneRange(), collapsed: range.collapsed };
    }
  }

  // Unicode-aware word-char matcher (letters/numbers/_/-)
  const isWordChar = (() => {
    try {
      const re = new RegExp('[\\p{L}\\p{N}_-]', 'u');
      return ch => re.test(ch);
    } catch {
      return ch => /[A-Za-z0-9_-]/.test(ch);
    }
  })();

  function extractAbbrevBeforeCaret(ctx) {
    if (ctx.kind === 'input') {
      const { el, start, end } = ctx;
      if (start !== end) return null;
      const text = el.value.slice(0, start);
      let i = text.length - 1;
      let count = 0;
      for (; i >= 0; i--) {
        const ch = text[i];
        if (!isWordChar(ch)) break;
        if (++count > CONFIG.maxAbbrevLen) break;
      }
      const tokenStart = Math.max(0, i + 1);
      const token = text.slice(tokenStart);
      return { token, tokenStart, tokenEnd: start };
    } else {
      const sel = getSafeSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const caretRange = sel.getRangeAt(0);
      if (!caretRange.collapsed) return null;

      const prefixRange = document.createRange();
      prefixRange.selectNodeContents(ctx.root);
      try {
        prefixRange.setEnd(caretRange.startContainer, caretRange.startOffset);
      } catch { return null; }
      const prefix = prefixRange.toString();
      let i = prefix.length - 1;
      let count = 0;
      for (; i >= 0; i--) {
        const ch = prefix[i];
        if (!isWordChar(ch)) break;
        if (++count > CONFIG.maxAbbrevLen) break;
      }
      const token = prefix.slice(Math.max(0, i + 1));
      const tokenRange = caretRange.cloneRange();
      moveRangeStartByChars(tokenRange, token.length, ctx.root);
      return { token, tokenRange };
    }
  }

  function moveRangeStartByChars(range, n, root) {
    let remaining = n;
    while (remaining > 0) {
      let sc = range.startContainer;
      let so = range.startOffset;

      if (sc.nodeType === Node.TEXT_NODE) {
        const move = Math.min(so, remaining);
        so -= move;
        remaining -= move;
        range.setStart(sc, so);
        if (remaining === 0) break;
        const prev = previousTextNode(root, sc);
        if (!prev) break;
        range.setStart(prev, prev.nodeValue.length);
      } else {
        let candidate = null;
        if (so > 0) candidate = lastTextDescendant(sc.childNodes[so - 1]);
        else candidate = previousTextNode(root, sc);
        if (!candidate) break;
        range.setStart(candidate, candidate.nodeValue.length);
      }
    }
  }
  function previousTextNode(root, node) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let prev = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n === node) return prev;
      prev = n;
    }
    return null;
  }
  function lastTextDescendant(start) {
    if (!start) return null;
    if (start.nodeType === Node.TEXT_NODE) return start;
    let walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT);
    let last = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) last = n;
    return last;
  }
  function getSafeSelection() {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return null;
    return sel;
  }

  // ----------------------
  // Template rendering
  // ----------------------
  async function renderTemplate(template) {
    const now = new Date();
    let out = '';
    let cursorIndex = -1;

    const re = /{{\s*([a-zA-Z]+)(?::([^}]+))?\s*}}/g;
    let idx = 0;
    for (;;) {
      const m = re.exec(template);
      if (!m) {
        out += template.slice(idx);
        break;
      }
      out += template.slice(idx, m.index);
      idx = m.index + m[0].length;

      const tag = m[1].toLowerCase();
      const arg = (m[2] || '').trim();

      if (tag === 'cursor') {
        if (cursorIndex === -1) cursorIndex = out.length;
        continue;
      }
      if (tag === 'date') { out += formatDate(now, arg); continue; }
      if (tag === 'time') { out += formatTime(now, arg); continue; }
      if (tag === 'day')  { out += formatDay(now, arg); continue; }
      if (tag === 'clipboard') {
        const clip = await readClipboardSafe();
        out += clip ?? '';
        continue;
      }
      out += m[0];
    }
    return { text: out, cursorIndex: cursorIndex >= 0 ? cursorIndex : out.length };
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function formatDate(d, arg) {
    const a = (arg || 'iso').toLowerCase();
    switch (a) {
      case 'iso':
      case 'ymd': return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      case 'mdy': return `${pad2(d.getMonth()+1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
      case 'dmy': return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
      case 'us':  return `${pad2(d.getMonth()+1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
      case 'long': return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      case 'short': return d.toLocaleDateString();
      default: return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    }
  }
  function formatTime(d, arg) {
    const mode = (arg || '12').toLowerCase();
    if (mode === '24' || mode === '24h') return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    let h = d.getHours();
    const m = pad2(d.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${pad2(h)}:${m} ${ampm}`;
  }
  function formatDay(d, arg) {
    const opts = (!arg || arg.toLowerCase() === 'long') ? { weekday: 'long' } : { weekday: 'short' };
    return d.toLocaleDateString(undefined, opts);
  }

  async function readClipboardSafe() {
    let timedOut = false;
    const timeout = new Promise(resolve => setTimeout(() => { timedOut = true; resolve(''); }, CONFIG.clipboardReadTimeoutMs));
    const read = (async () => {
      try {
        if (!navigator.clipboard?.readText) return '';
        const t = await navigator.clipboard.readText();
        return t ?? '';
      } catch {
        if (!timedOut) throttledToast('Clipboard read blocked — allow permission to use {{clipboard}}.');
        return '';
      }
    })();
    return await Promise.race([read, timeout]);
  }

  // ----------------------
  // Perform expansion
  // ----------------------
  async function performExpansion(ctx, tokenInfo, rendered) {
    if (ctx.kind === 'input') {
      const { el } = ctx;
      const start = tokenInfo.tokenStart;
      const end = tokenInfo.tokenEnd;
      el.setRangeText(rendered.text, start, end, 'end');
      const caret = start + (rendered.cursorIndex ?? rendered.text.length);
      el.selectionStart = el.selectionEnd = caret;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: rendered.text }));
    } else {
      const sel = getSafeSelection();
      if (!sel) return;
      const r = tokenInfo.tokenRange.cloneRange();
      r.deleteContents();
      const { fragment, cursorNode, cursorOffset, lastNode } = buildFragment(rendered.text, rendered.cursorIndex);
      r.insertNode(fragment);

      const newRange = document.createRange();
      if (cursorNode) newRange.setStart(cursorNode, cursorOffset);
      else if (lastNode) newRange.setStartAfter(lastNode);
      else newRange.setStart(r.startContainer, r.startOffset);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      try {
        ctx.root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: rendered.text }));
      } catch {
        ctx.root.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function buildFragment(text, cursorIndex) {
    const frag = document.createDocumentFragment();
    let pos = 0;
    let cursorNode = null;
    let cursorOffset = 0;
    const parts = String(text).split('\n');
    let lastNode = null;

    parts.forEach((part, idx) => {
      const t = document.createTextNode(part);
      frag.appendChild(t);
      lastNode = t;

      if (cursorNode == null && cursorIndex <= pos + part.length) {
        cursorNode = t;
        cursorOffset = clamp(cursorIndex - pos, 0, t.nodeValue.length);
      }
      pos += part.length;

      if (idx < parts.length - 1) {
        frag.appendChild(document.createElement('br'));
        pos += 1;
      }
    });

    if (!cursorNode && lastNode) {
      cursorNode = lastNode;
      cursorOffset = lastNode.nodeValue.length;
    }
    return { fragment: frag, cursorNode, cursorOffset, lastNode };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // ----------------------
  // Palette UI
  // ----------------------
  let paletteEl = null;

  function ensurePalette() {
    if (paletteEl) return paletteEl;
    const wrap = document.createElement('div');
    wrap.className = 'sae-palette';
    wrap.innerHTML = `
      <div class="sae-panel" role="dialog" aria-label="Abbreviation Palette">
        <div class="sae-panel-header">
          <input class="sae-search" type="search" placeholder="Search abbreviations…" />
          <div class="sae-header-actions">
            <button data-action="edit">Edit JSON</button>
            <button data-action="reset">Reset</button>
            <button data-action="close">Close</button>
          </div>
        </div>
        <textarea class="sae-editor" spellcheck="false"></textarea>
        <div class="sae-list" tabindex="0"></div>
        <div class="sae-footer">Alt+P to open · Enter to insert · Esc to close</div>
      </div>
    `;
    document.documentElement.appendChild(wrap);

    const search = wrap.querySelector('.sae-search');
    const list = wrap.querySelector('.sae-list');
    const editor = wrap.querySelector('.sae-editor');
    const actions = wrap.querySelector('.sae-header-actions');

    actions.addEventListener('click', async (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'close') closePalette();
      if (act === 'edit') {
        if (editor.classList.contains('open')) {
          try {
            const obj = JSON.parse(editor.value);
            state.dict = normalizeDict(obj);
            await GMX.setValue(CONFIG.storeKeys.dict, state.dict);
            renderList();
            editor.classList.remove('open');
            toast('Dictionary saved.');
          } catch (err) {
            alert('Invalid JSON: ' + err.message);
          }
        } else {
          editor.value = JSON.stringify(state.dict, null, 2);
          editor.classList.add('open');
        }
      }
      if (act === 'reset') {
        if (confirm('Reset dictionary to defaults?')) {
          state.dict = normalizeDict(DEFAULT_DICT);
          await GMX.setValue(CONFIG.storeKeys.dict, state.dict);
          renderList();
          editor.classList.remove('open');
          toast('Dictionary reset.');
        }
      }
    });

    function renderList(filter = '') {
      const q = filter.trim().toLowerCase();
      const keys = Object.keys(state.dict).sort();
      const items = q ? keys.filter(k => k.includes(q) || state.dict[k].toLowerCase().includes(q)) : keys;
      list.innerHTML = '';
      items.forEach((k, i) => {
        const div = document.createElement('div');
        div.className = 'sae-item' + (i === 0 ? ' active' : '');
        div.dataset.key = k;
        div.innerHTML = `<div class="sae-key">${escapeHtml(k)}</div><div class="sae-val">${escapeHtml(state.dict[k])}</div>`;
        div.addEventListener('click', () => selectAndInsert(k));
        list.appendChild(div);
      });
    }

    async function selectAndInsert(key) {
      if (!state.lastEditable) state.lastEditable = captureEditableContext();
      closePalette();
      const tmpl = state.dict[key];
      if (!tmpl) return;
      const ctx = state.lastEditable || captureEditableContext();
      if (!ctx || !ctx.collapsed) return;
      const rendered = await renderTemplate(tmpl);
      if (ctx.kind === 'input') {
        const { el } = ctx;
        const pos = el.selectionStart ?? 0;
        el.setRangeText(rendered.text, pos, pos, 'end');
        const caret = pos + (rendered.cursorIndex ?? rendered.text.length);
        el.selectionStart = el.selectionEnd = caret;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: rendered.text }));
      } else {
        const sel = getSafeSelection();
        if (!sel) return;
        const r = ctx.range.cloneRange();
        r.deleteContents();
        const { fragment, cursorNode, cursorOffset, lastNode } = buildFragment(rendered.text, rendered.cursorIndex);
        r.insertNode(fragment);
        const newRange = document.createRange();
        if (cursorNode) newRange.setStart(cursorNode, cursorOffset);
        else if (lastNode) newRange.setStartAfter(lastNode);
        else newRange.setStart(r.startContainer, r.startOffset);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        try {
          ctx.root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: rendered.text }));
        } catch {
          ctx.root.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }

    search.addEventListener('input', () => renderList(search.value));
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const active = wrap.querySelector('.sae-item.active');
        if (active) selectAndInsert(active.dataset.key);
        return;
      }
      const items = [...wrap.querySelectorAll('.sae-item')];
      if (!items.length) return;
      let idx = Math.max(0, items.findIndex(n => n.classList.contains('active')));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[idx].classList.remove('active');
        idx = Math.min(items.length - 1, idx + 1);
        items[idx].classList.add('active');
        items[idx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[idx].classList.remove('active');
        idx = Math.max(0, idx - 1);
        items[idx].classList.add('active');
        items[idx].scrollIntoView({ block: 'nearest' });
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
    const input = p.querySelector('.sae-search');
    input.value = '';
    p.querySelector('.sae-editor').classList.remove('open');
    p.querySelector('.sae-list').focus({ preventScroll: true });
    p.querySelector('.sae-search').focus({ preventScroll: true });
    if (p.__render) p.__render();
  }
  function openPaletteEditor() {
    const p = ensurePalette();
    p.classList.add('open');
    const editor = p.querySelector('.sae-editor');
    editor.value = JSON.stringify(state.dict, null, 2);
    editor.classList.add('open');
    editor.focus({ preventScroll: true });
  }
  function closePalette() {
    if (paletteEl) paletteEl.classList.remove('open');
  }

  // ----------------------
  // Toast helper
  // ----------------------
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const el = document.createElement('div');
    el.className = 'sae-bubble';
    el.textContent = msg;
    document.documentElement.appendChild(el);
    const r = { left: Math.max(8, window.innerWidth - 320), top: Math.max(8, window.innerHeight - 80) };
    el.style.left = `${r.left}px`; el.style.top = `${r.top}px`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), ms);
  }
  function throttledToast(msg, ms = 2200) {
    const now = Date.now();
    if (now - state._lastToastAt < CONFIG.toast.throttleMs) return;
    state._lastToastAt = now;
    toast(msg, ms);
  }

  // ----------------------
  // Utils
  // ----------------------
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function normalizeDict(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (typeof k === 'string' && typeof v === 'string' && k.trim()) {
        out[k.trim().toLowerCase()] = v;
      }
    }
    return out;
  }
})();
