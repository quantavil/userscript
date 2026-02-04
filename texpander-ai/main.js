// ==UserScript==
// @name         texpander-ai
// @namespace    https://github.com/quantavil/texpander-ai
// @version      2.2
// @description  AI-powered text expander: Expand abbreviations, polish with Gemini AI actions, dynamic templates anywhere.
// @author       quantavil
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

  // ─────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────
  const CONFIG = {
    trigger: { shift: true, alt: false, ctrl: false, meta: false },
    palette: { code: 'KeyP', alt: true, shift: false, ctrl: false, meta: false },
    aiMenu: { code: 'KeyG', alt: true, shift: false, ctrl: false, meta: false },
    maxAbbrevLen: 80,
    styleId: 'sae-styles',
    aiMenuInlineCount: 4,
    storeKeys: {
      dict: 'sae.dict.v1',
      keys: 'sae.keys.v1',
      apiKey: 'sae.gemini.apiKey.v1',
      customPrompts: 'sae.prompts.v1',
      disabledBuiltins: 'sae.disabledBuiltins.v1',
      settings: 'sae.settings.v1',
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
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Built-in AI Prompts (immutable structure)
  // ─────────────────────────────────────────────────────────────
  const BUILTIN_PROMPTS = [
    {
      id: 'grammar',
      icon: '✨',
      label: 'Fix Grammar',
      prompt: 'Fix grammar, spelling, and punctuation. Improve clarity. Preserve meaning and original language. Return only the corrected text, no explanations.',
    },
    {
      id: 'expand',
      icon: '📝',
      label: 'Expand',
      prompt: 'Expand this text with more detail, examples, and depth. Maintain the original tone. Return only the expanded text.',
    },
    {
      id: 'summarize',
      icon: '📋',
      label: 'Summarize',
      prompt: 'Summarize this text concisely in 2-3 sentences. Capture key points. Return only the summary.',
    },
    {
      id: 'formal',
      icon: '💼',
      label: 'Formal',
      prompt: 'Rewrite in a formal, professional tone suitable for business communication. Return only the rewritten text.',
    },
    {
      id: 'friendly',
      icon: '😊',
      label: 'Friendly',
      prompt: 'Rewrite in a warm, friendly, conversational tone. Return only the rewritten text.',
    },
    {
      id: 'concise',
      icon: '🎯',
      label: 'Concise',
      prompt: 'Make this shorter and more direct. Remove unnecessary words. Return only the concise text.',
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // Default Dictionary
  // ─────────────────────────────────────────────────────────────
  const DEFAULT_DICT = {
    brb: 'Be right back.',
    ty: 'Thank you!',
    hth: 'Hope this helps!',
    opt: 'Optional: {{cursor}}',
    log: 'Log Entry - {{date:iso}} {{time}}: {{cursor}}',
    track: 'The tracking number for your order is {{clipboard}}. {{cursor}}',
    dt: 'Today is {{day}}, {{date:long}} at {{time}}.',
  };

  // ─────────────────────────────────────────────────────────────
  // GM Abstraction Layer
  // ─────────────────────────────────────────────────────────────
  const GMX = {
    getValue: (k, d) => typeof GM_getValue === 'function' ? GM_getValue(k, d) : JSON.parse(localStorage.getItem(k) || JSON.stringify(d)),
    setValue: (k, v) => typeof GM_setValue === 'function' ? GM_setValue(k, v) : localStorage.setItem(k, JSON.stringify(v)),
    registerMenuCommand: (t, fn) => typeof GM_registerMenuCommand === 'function' && GM_registerMenuCommand(t, fn),
    request: (opts) => new Promise((resolve, reject) => {
      const { method = 'GET', url, headers = {}, data, timeout = CONFIG.gemini.timeoutMs } = opts;
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method, url, headers, data, timeout,
          onload: (r) => resolve({ status: r.status, text: r.responseText }),
          onerror: () => reject(new Error('Network error')),
          ontimeout: () => reject(new Error('Timeout')),
        });
      } else {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), timeout);
        fetch(url, { method, headers, body: data, signal: ctrl.signal })
          .then(async r => { clearTimeout(tid); resolve({ status: r.status, text: await r.text() }); })
          .catch(e => { clearTimeout(tid); reject(e); });
      }
    }),
  };

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pad2 = n => String(n).padStart(2, '0');
  const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const genId = () => 'c' + Math.random().toString(36).slice(2, 9);

  // Smart text truncation: "First words ... last words"
  function smartTruncate(text, maxLen = 100) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    const halfLen = Math.floor((maxLen - 5) / 2);
    const start = cleaned.slice(0, halfLen).trim();
    const end = cleaned.slice(-halfLen).trim();
    return `${start} ... ${end}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Notifier
  // ─────────────────────────────────────────────────────────────
  const notify = (() => {
    let el = null, timer = null;
    const place = () => {
      if (!el) return;
      el.style.left = `${Math.max(8, innerWidth - 320)}px`;
      el.style.top = `${Math.max(8, innerHeight - 80)}px`;
    };
    return {
      toast(msg, ms = 2200) {
        this.close();
        el = document.createElement('div');
        el.className = 'sae-toast';
        el.textContent = msg;
        document.documentElement.appendChild(el);
        place();
        timer = setTimeout(() => this.close(), ms);
      },
      close() { clearTimeout(timer); el?.remove(); el = timer = null; }
    };
  })();

  const throttledToast = (() => {
    let last = 0;
    return (msg, ms) => {
      if (Date.now() - last < CONFIG.toast.throttleMs) return;
      last = Date.now();
      notify.toast(msg, ms);
    };
  })();

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  const state = {
    dict: {},
    apiKey: '',
    apiKeyIndex: 0,
    customPrompts: [],
    disabledBuiltins: [], // IDs of disabled builtin prompts
    settings: { aiMenuInlineCount: 4 },
    lastEditable: null,
    _lastFocusedEditable: null,
    activeIndex: 0,
  };

  let paletteEl = null;
  let aiMenuEl = null;
  let prevOverflow = '';

  // ─────────────────────────────────────────────────────────────
  // Prompt Helpers
  // ─────────────────────────────────────────────────────────────
  function isBuiltinEnabled(id) {
    return !state.disabledBuiltins.includes(id);
  }

  function isCustomEnabled(prompt) {
    return prompt.enabled !== false;
  }

  function getEnabledPrompts() {
    const builtins = BUILTIN_PROMPTS.filter(p => isBuiltinEnabled(p.id));
    const customs = state.customPrompts.filter(isCustomEnabled);
    return [...builtins, ...customs];
  }

  function getAllPromptsForExecution() {
    return [...BUILTIN_PROMPTS, ...state.customPrompts];
  }

  // ─────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────
  const STYLES = `
    /* Reset box-sizing */
    .sae-palette *,.sae-ai-menu *,.sae-toast{box-sizing:border-box}

    /* Toast */
    .sae-toast{position:fixed;z-index:2147483647;max-width:min(480px,85vw);box-shadow:0 8px 32px rgba(0,0,0,.28);border-radius:12px;background:rgba(17,17,17,.95);backdrop-filter:blur(12px);color:#fff;padding:12px 16px;font:13px/1.4 system-ui,-apple-system,sans-serif;white-space:pre-wrap;border:1px solid rgba(255,255,255,.08)}

    /* Palette Overlay */
    .sae-palette{all:initial;position:fixed;z-index:2147483647;inset:0;display:none;align-items:center;justify-content:center;backdrop-filter:blur(3px);background:rgba(0,0,0,.4);font-family:system-ui,-apple-system,sans-serif}
    .sae-palette.open{display:flex}
    
    /* Panel */
    .sae-panel{width:min(680px,94vw);max-height:80vh;overflow:hidden;background:#0d0d0d;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.5);display:flex;flex-direction:column;font-size:13px;line-height:1.4}
    .sae-panel-header{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid rgba(255,255,255,.06)}
    .sae-search{flex:1;background:#1a1a1a;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;outline:none;font:inherit}
    .sae-search:focus{border-color:#4a9eff;box-shadow:0 0 0 3px rgba(74,158,255,.15)}
    
    /* Icon Buttons */
    .sae-icon-btn{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#1a1a1a;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
    .sae-icon-btn:hover{background:#252525;border-color:#4a9eff}
    .sae-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    
    /* List */
    .sae-list{flex:1;overflow:auto;padding:8px}
    .sae-item{display:grid;grid-template-columns:140px 1fr auto;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid transparent;cursor:pointer;align-items:center;transition:all .1s}
    .sae-item:hover,.sae-item.active{background:#1a1a1a;border-color:rgba(255,255,255,.06)}
    .sae-key{font-weight:600;color:#4a9eff;word-break:break-all}
    .sae-val{color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sae-item-actions{display:flex;gap:4px}
    .sae-item-actions button{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:#1a1a1a;color:#fff;cursor:pointer;font-size:11px;transition:all .1s}
    .sae-item-actions button:hover{background:#2a2a2a;border-color:#4a9eff}
    
    /* Editing state */
    .sae-item.editing{background:#0f1a2a;border-color:#2563eb;display:flex;flex-wrap:wrap;gap:8px}
    .sae-item.editing input{background:#0a0a0a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:6px 8px;font:inherit;flex:1;min-width:100px}
    .sae-item.editing input:focus{border-color:#4a9eff;outline:none}
    
    /* Add new & Footer */
    .sae-add-new{padding:12px;text-align:center;border-top:1px solid rgba(255,255,255,.06)}
    .sae-add-new button{padding:10px 20px;border-radius:8px;border:1px solid #4a9eff;background:rgba(74,158,255,.1);color:#4a9eff;cursor:pointer;font-weight:600;transition:all .15s}
    .sae-add-new button:hover{background:rgba(74,158,255,.2)}
    .sae-footer{padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);color:#666;font-size:12px}
    
    /* Settings View */
    .sae-panel.settings-open .sae-list,.sae-panel.settings-open .sae-add-new,.sae-panel.settings-open .sae-search{display:none}
    .sae-settings{display:none;flex:1;overflow:auto;padding:16px}
    .sae-panel.settings-open .sae-settings{display:block}
    
    /* Settings rows */
    .sae-hrow{padding:16px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .sae-hrow:last-child{border-bottom:none}
    .sae-hrow-label{color:#fff;font-weight:600;font-size:14px;margin-bottom:10px}
    .sae-hrow-content{display:flex;flex-direction:column;gap:10px}
    
    /* Form elements */
    .sae-input,.sae-textarea{background:#1a1a1a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:10px 12px;font:inherit;width:100%;max-width:100%}
    .sae-input:focus,.sae-textarea:focus{border-color:#4a9eff;outline:none;box-shadow:0 0 0 3px rgba(74,158,255,.15)}
    .sae-textarea{min-height:80px;resize:vertical;font-family:inherit}
    .sae-help{font-size:11px;color:#666;margin-top:4px}
    
    /* Buttons */
    .sae-btn{padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#1a1a1a;color:#fff;cursor:pointer;font-size:13px;transition:all .15s;white-space:nowrap;flex-shrink:0}
    .sae-btn:hover{background:#252525;border-color:#4a9eff}
    .sae-btn.primary{background:#1d4ed8;border-color:#3b82f6;color:#fff}
    .sae-btn.primary:hover{background:#2563eb;border-color:#60a5fa}
    .sae-btn.success{background:#166534;border-color:#22c55e}
    .sae-btn.danger{background:#7f1d1d;border-color:#ef4444}
    .sae-btn.danger:hover{background:#991b1b;border-color:#f87171}
    .sae-btn.sm{padding:6px 10px;font-size:12px}
    
    .sae-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;background:#1a1a1a;border:1px solid rgba(255,255,255,.15);color:#ddd;font-size:13px;flex-shrink:0}
    .sae-btn-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    
    /* Hotkeys - inline layout */
    .sae-hk-row{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
    .sae-hk-item{display:flex;align-items:center;gap:8px}
    .sae-hk-item .sae-chip{border-color:#4a9eff;min-width:140px;justify-content:center}
    
    /* Inline count setting */
    .sae-inline-row{display:flex;align-items:center;gap:12px}
    .sae-inline-row input[type="number"]{width:80px;text-align:center}
    .sae-inline-row label{color:#aaa}
    
    /* Prompts section */
    .sae-prompt-section{margin-top:8px}
    .sae-prompt-section-title{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.06)}
    .sae-prompt-list{display:flex;flex-direction:column;gap:6px}
    .sae-prompt-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#1a1a1a;border-radius:8px;border:1px solid rgba(255,255,255,.08)}
    .sae-prompt-item .icon{font-size:18px;width:28px;text-align:center;flex-shrink:0}
    .sae-prompt-item .label{font-weight:500;min-width:100px;color:#fff}
    .sae-prompt-item .prompt-text{flex:1;color:#666;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sae-prompt-item .actions{display:flex;gap:6px;align-items:center;flex-shrink:0;margin-left:auto}
    .sae-prompt-item.disabled{opacity:.5}
    .sae-prompt-item.disabled .label{color:#888}
    .sae-prompt-item.builtin{border-color:rgba(74,158,255,.2)}
    .sae-prompt-item.builtin .label::after{content:'Built-in';font-size:9px;background:#1d4ed8;color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:400}
    
    /* Prompt editing */
    .sae-prompt-item.editing{flex-direction:column;align-items:stretch;gap:10px;border-color:#3b82f6}
    .sae-prompt-edit-form{display:flex;flex-direction:column;gap:10px;width:100%}
    .sae-prompt-edit-row{display:flex;gap:8px;align-items:center}
    .sae-prompt-edit-row .icon-input{width:60px;flex-shrink:0;text-align:center;font-size:16px}
    .sae-prompt-edit-row .label-input{flex:1}
    .sae-prompt-edit-actions{display:flex;gap:8px;justify-content:flex-end}
    
    /* Toggle switch */
    .sae-toggle{position:relative;width:44px;height:24px;background:#333;border-radius:12px;cursor:pointer;transition:background .2s;flex-shrink:0;border:1px solid rgba(255,255,255,.1)}
    .sae-toggle.on{background:#22c55e;border-color:#22c55e}
    .sae-toggle::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
    .sae-toggle.on::after{transform:translateX(20px)}
    
    /* Empty state */
    .sae-empty{color:#666;padding:16px;text-align:center;background:#1a1a1a;border-radius:8px;border:1px dashed rgba(255,255,255,.1)}
    
    /* AI Action Menu */
    .sae-ai-menu{position:fixed;z-index:2147483647;background:#0d0d0d;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 16px 64px rgba(0,0,0,.5);padding:10px;font:13px/1.4 system-ui,-apple-system,sans-serif;min-width:320px;max-width:440px;opacity:0;transform:scale(.96) translateY(-4px);transition:opacity .15s,transform .15s}
    .sae-ai-menu.open{opacity:1;transform:scale(1) translateY(0)}
    .sae-ai-menu.above{transform-origin:bottom center}
    .sae-ai-menu.below{transform-origin:top center}
    
    /* Preview text */
    .sae-ai-preview{padding:10px 12px;margin-bottom:8px;background:#1a1a1a;border-radius:10px;color:#999;font-size:12px;line-height:1.5;border:1px solid rgba(255,255,255,.06);word-break:break-word}
    
    /* Pills - larger boxes */
    .sae-ai-pills{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:8px}
    .sae-ai-pill{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;background:#1a1a1a;border:1px solid rgba(255,255,255,.1);color:#fff;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;text-align:center}
    .sae-ai-pill:hover,.sae-ai-pill.active{background:#252525;border-color:#4a9eff;transform:translateY(-1px)}
    .sae-ai-pill .icon{font-size:16px}
    .sae-ai-pill .key{color:#4a9eff;font-size:11px;font-weight:600;margin-left:4px;opacity:.8}
    
    /* Divider */
    .sae-ai-divider{height:1px;background:rgba(255,255,255,.08);margin:8px 0}
    
    /* More/Less toggle */
    .sae-ai-toggle{display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;color:#888;cursor:pointer;font-size:12px;border-radius:8px;transition:all .15s;border:1px solid transparent}
    .sae-ai-toggle:hover{color:#fff;background:#1a1a1a;border-color:rgba(255,255,255,.1)}
    
    /* Custom section label */
    .sae-ai-custom-label{font-size:10px;color:#666;padding:4px 8px;text-transform:uppercase;letter-spacing:.5px}
    
    /* Loading state */
    .sae-ai-menu.loading .sae-ai-pills{opacity:.5;pointer-events:none}
    .sae-ai-loading{display:none;align-items:center;gap:8px;padding:12px;color:#4a9eff;justify-content:center}
    .sae-ai-menu.loading .sae-ai-loading{display:flex}
    .sae-ai-spinner{width:16px;height:16px;border:2px solid rgba(74,158,255,.3);border-top-color:#4a9eff;border-radius:50%;animation:sae-spin 1s linear infinite}
    @keyframes sae-spin{to{transform:rotate(360deg)}}
  `;

  // ─────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────
  init().catch(console.error);

  async function init() {
    const styleEl = document.getElementById(CONFIG.styleId) || (() => {
      const s = document.createElement('style');
      s.id = CONFIG.styleId;
      (document.head || document.documentElement).appendChild(s);
      return s;
    })();
    styleEl.textContent = STYLES;

    // Load state
    state.dict = normalizeDict(await GMX.getValue(CONFIG.storeKeys.dict, DEFAULT_DICT));
    if (!Object.keys(state.dict).length) state.dict = normalizeDict(DEFAULT_DICT);
    
    state.apiKey = await GMX.getValue(CONFIG.storeKeys.apiKey, '');
    state.customPrompts = (await GMX.getValue(CONFIG.storeKeys.customPrompts, [])).map(p => ({
      ...p,
      enabled: p.enabled !== false
    }));
    state.disabledBuiltins = await GMX.getValue(CONFIG.storeKeys.disabledBuiltins, []);
    state.settings = await GMX.getValue(CONFIG.storeKeys.settings, { aiMenuInlineCount: 4 });
    CONFIG.aiMenuInlineCount = state.settings.aiMenuInlineCount || 4;
    
    const savedKeys = await GMX.getValue(CONFIG.storeKeys.keys, {});
    if (savedKeys.palette) Object.assign(CONFIG.palette, savedKeys.palette);
    if (savedKeys.aiMenu) Object.assign(CONFIG.aiMenu, savedKeys.aiMenu);

    // Track focus
    window.addEventListener('focusin', e => {
      const t = e.composedPath?.()?.[0] || e.target;
      if (t?.closest?.('.sae-palette, .sae-ai-menu')) return;
      const el = getEditable(t);
      if (el) state._lastFocusedEditable = el;
    }, true);

    GMX.registerMenuCommand('Open Palette (Alt+P)', () => { state.lastEditable = captureContext(); openPalette(); });
    GMX.registerMenuCommand('AI Actions (Alt+G)', () => triggerAIMenu());

    window.addEventListener('keydown', handleGlobalKey, true);
  }

  // ─────────────────────────────────────────────────────────────
  // Hotkey Handling
  // ─────────────────────────────────────────────────────────────
  function matchHotkey(e, spec) {
    return e.shiftKey === !!spec.shift && 
           e.altKey === !!spec.alt && 
           e.ctrlKey === !!spec.ctrl && 
           e.metaKey === !!spec.meta &&
           (spec.code ? e.code === spec.code : e.code === 'Space');
  }

  function handleGlobalKey(e) {
    if (e.isComposing) return;
    const target = e.composedPath?.()?.[0] || e.target;

    if (e.key === 'Escape') {
      if (aiMenuEl?.classList.contains('open')) {
        e.preventDefault(); e.stopPropagation();
        closeAIMenu();
        return;
      }
      if (paletteEl?.classList.contains('open')) {
        e.preventDefault(); e.stopPropagation();
        closePalette();
        return;
      }
      return;
    }

    if (aiMenuEl?.classList.contains('open')) return;
    if (paletteEl?.classList.contains('open') && paletteEl.contains(target)) return;

    if (matchHotkey(e, CONFIG.palette)) {
      e.preventDefault(); e.stopPropagation();
      state.lastEditable = captureContext();
      openPalette();
      return;
    }

    if (matchHotkey(e, CONFIG.aiMenu) && getEditable(target)) {
      e.preventDefault(); e.stopPropagation();
      triggerAIMenu();
      return;
    }

    if (matchHotkey(e, CONFIG.trigger) && getEditable(target)) {
      e.preventDefault(); e.stopPropagation();
      doExpansion();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Editable Detection & Context
  // ─────────────────────────────────────────────────────────────
  function getEditable(el) {
    if (!el) return null;
    if (el instanceof HTMLTextAreaElement) return el;
    if (el instanceof HTMLInputElement) {
      const t = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'url', 'email', 'tel'].includes(t) ? el : null;
    }
    let curr = el;
    while (curr) {
      if (curr.nodeType === 1 && curr.isContentEditable) return curr;
      curr = curr.parentElement || (curr.parentNode instanceof ShadowRoot ? curr.parentNode.host : null);
      if (!curr || curr === document.documentElement) break;
    }
    return null;
  }

  function captureContext() {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    
    const el = getEditable(active);
    if (!el) return null;

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      return { kind: 'input', el, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
    }
    
    const sel = window.getSelection?.();
    if (!sel?.rangeCount) return null;
    return { kind: 'ce', root: el, range: sel.getRangeAt(0).cloneRange() };
  }

  function getContextOrFallback() {
    let ctx = captureContext();
    if (ctx) return ctx;

    if (state.lastEditable) {
      const el = state.lastEditable.kind === 'input' ? state.lastEditable.el : state.lastEditable.root;
      if (el?.isConnected) {
        try { el.focus({ preventScroll: true }); } catch {}
        ctx = captureContext();
        if (ctx) return ctx;
      }
    }

    if (state._lastFocusedEditable?.isConnected) {
      try { state._lastFocusedEditable.focus({ preventScroll: true }); } catch {}
      return captureContext();
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // Editor Abstraction
  // ─────────────────────────────────────────────────────────────
  function makeEditor(ctx) {
    if (!ctx) return null;
    
    if (ctx.kind === 'input') {
      const el = ctx.el;
      return {
        getText() {
          const s = el.selectionStart, e = el.selectionEnd;
          return s !== e ? el.value.slice(s, e) : el.value;
        },
        replace(text) {
          const s = el.selectionStart, e = el.selectionEnd;
          const start = s !== e ? s : 0;
          const end = s !== e ? e : el.value.length;
          el.setRangeText(text, start, end, 'end');
          dispatchInput(el, text);
        }
      };
    }
    
    const root = ctx.root;
    return {
      getText() {
        const sel = window.getSelection?.();
        if (sel?.rangeCount && !sel.isCollapsed) return sel.toString();
        const r = document.createRange();
        r.selectNodeContents(root);
        return r.toString();
      },
      replace(text) {
        const sel = window.getSelection?.();
        if (!sel) return;
        
        if (sel.isCollapsed) {
          const r = document.createRange();
          r.selectNodeContents(root);
          sel.removeAllRanges();
          sel.addRange(r);
        }
        
        if (!document.execCommand('insertText', false, text)) {
          if (!document.execCommand('insertHTML', false, escHtml(text).replace(/\n/g, '<br>'))) {
            const r = sel.getRangeAt(0);
            r.deleteContents();
            r.insertNode(document.createTextNode(text));
          }
        }
        dispatchInput(root, text);
      }
    };
  }

  function dispatchInput(el, data) {
    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data })); }
    catch { el.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  // ─────────────────────────────────────────────────────────────
  // Template System
  // ─────────────────────────────────────────────────────────────
  const TAGS = {
    cursor: async () => ({ text: '', cursor: true }),
    date: async (arg, now) => ({ text: formatDate(now, arg) }),
    time: async (arg, now) => ({ text: formatTime(now, arg) }),
    day: async (arg, now) => ({ text: formatDay(now, arg) }),
    clipboard: async () => ({ text: await readClipboard() }),
  };

  async function renderTemplate(tmpl) {
    const now = new Date();
    let out = '', cursor = -1, idx = 0;
    const re = /\{\{\s*(\w+)(?::([^}]+))?\s*\}\}/g;
    let m;
    while ((m = re.exec(tmpl))) {
      out += tmpl.slice(idx, m.index);
      idx = m.index + m[0].length;
      const handler = TAGS[m[1].toLowerCase()];
      if (!handler) { out += m[0]; continue; }
      const res = await handler((m[2] || '').trim(), now);
      if (res.cursor && cursor < 0) cursor = out.length;
      out += res.text ?? '';
    }
    out += tmpl.slice(idx);
    return { text: out, cursor: cursor >= 0 ? cursor : out.length };
  }

  function formatDate(d, arg = 'iso') {
    const a = arg.toLowerCase();
    if (a === 'long') return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (a === 'short') return d.toLocaleDateString();
    if (a === 'mdy' || a === 'us') return `${pad2(d.getMonth()+1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
    if (a === 'dmy') return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  function formatTime(d, arg = '12') {
    if (arg === '24' || arg === '24h') return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${pad2(h)}:${pad2(d.getMinutes())} ${ampm}`;
  }

  function formatDay(d, arg = 'long') {
    return d.toLocaleDateString(undefined, { weekday: arg.toLowerCase() === 'short' ? 'short' : 'long' });
  }

  async function readClipboard() {
    try {
      if (!navigator.clipboard?.readText) return '';
      const result = await Promise.race([
        navigator.clipboard.readText(),
        new Promise(r => setTimeout(() => r(''), CONFIG.clipboardReadTimeoutMs))
      ]);
      return result || '';
    } catch {
      throttledToast('Clipboard access blocked');
      return '';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Abbreviation Expansion
  // ─────────────────────────────────────────────────────────────
  const isWordChar = (() => {
    try { const re = new RegExp('[\\p{L}\\p{N}_-]', 'u'); return c => re.test(c); }
    catch { return c => /[\w-]/.test(c); }
  })();

  async function doExpansion() {
    const ctx = captureContext();
    if (!ctx) return;

    let token = '', tokenStart = 0, tokenEnd = 0, tokenRange = null;

    if (ctx.kind === 'input') {
      const el = ctx.el;
      if (ctx.start !== ctx.end) return;
      const text = el.value.slice(0, ctx.start);
      let i = text.length;
      while (i > 0 && isWordChar(text[i-1]) && text.length - i < CONFIG.maxAbbrevLen) i--;
      token = text.slice(i);
      tokenStart = i;
      tokenEnd = ctx.start;
    } else {
      const sel = window.getSelection?.();
      if (!sel?.rangeCount || !sel.isCollapsed) return;
      const r = sel.getRangeAt(0);
      const prefixRange = document.createRange();
      prefixRange.selectNodeContents(ctx.root);
      try { prefixRange.setEnd(r.startContainer, r.startOffset); } catch { return; }
      const prefix = prefixRange.toString();
      let i = prefix.length;
      while (i > 0 && isWordChar(prefix[i-1]) && prefix.length - i < CONFIG.maxAbbrevLen) i--;
      token = prefix.slice(i);
      tokenRange = r.cloneRange();
      moveRangeBack(tokenRange, token.length, ctx.root);
    }

    if (!token || token.length > CONFIG.maxAbbrevLen) return;
    const tmpl = state.dict[token.toLowerCase()];
    if (!tmpl) return;

    try {
      const rendered = await renderTemplate(tmpl);
      if (ctx.kind === 'input') {
        ctx.el.setRangeText(rendered.text, tokenStart, tokenEnd, 'end');
        ctx.el.selectionStart = ctx.el.selectionEnd = tokenStart + rendered.cursor;
        dispatchInput(ctx.el, rendered.text);
      } else {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(tokenRange);
        document.execCommand('insertText', false, rendered.text);
        dispatchInput(ctx.root, rendered.text);
      }
    } catch (err) { console.warn('Expand error:', err); }
  }

  function moveRangeBack(range, n, root) {
    let remaining = n;
    while (remaining > 0) {
      const sc = range.startContainer, so = range.startOffset;
      if (sc.nodeType === 3) {
        const move = Math.min(so, remaining);
        range.setStart(sc, so - move);
        remaining -= move;
        if (remaining === 0) break;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let prev = null, node;
        while ((node = walker.nextNode())) { if (node === sc) break; prev = node; }
        if (!prev) break;
        range.setStart(prev, prev.nodeValue.length);
      } else {
        if (so > 0) {
          const child = sc.childNodes[so - 1];
          const textNode = lastTextIn(child);
          if (textNode) range.setStart(textNode, textNode.nodeValue.length);
          else break;
        } else break;
      }
    }
  }

  function lastTextIn(node) {
    if (!node) return null;
    if (node.nodeType === 3) return node;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let last = null, n;
    while ((n = walker.nextNode())) last = n;
    return last;
  }

  // ─────────────────────────────────────────────────────────────
  // AI Menu
  // ─────────────────────────────────────────────────────────────
  function triggerAIMenu() {
    const ctx = captureContext();
    if (!ctx) return notify.toast('No editable field focused');
    openAIMenu(ctx);
  }

  function ensureAIMenu() {
    if (aiMenuEl) return aiMenuEl;

    aiMenuEl = document.createElement('div');
    aiMenuEl.className = 'sae-ai-menu';
    aiMenuEl.innerHTML = `
      <div class="sae-ai-preview"></div>
      <div class="sae-ai-pills primary"></div>
      <div class="sae-ai-more" style="display:none">
        <div class="sae-ai-divider"></div>
        <div class="sae-ai-pills secondary"></div>
        <div class="sae-ai-custom" style="display:none">
          <div class="sae-ai-divider"></div>
          <div class="sae-ai-custom-label">My Prompts</div>
          <div class="sae-ai-pills custom"></div>
        </div>
      </div>
      <div class="sae-ai-toggle">▾ More</div>
      <div class="sae-ai-loading"><div class="sae-ai-spinner"></div><span>Processing...</span></div>
    `;
    document.documentElement.appendChild(aiMenuEl);

    document.addEventListener('mousedown', e => {
      if (aiMenuEl.classList.contains('open') && !aiMenuEl.contains(e.target)) {
        closeAIMenu();
      }
    }, true);

    return aiMenuEl;
  }

  function openAIMenu(ctx) {
    const menu = ensureAIMenu();
    const editor = makeEditor(ctx);
    if (!editor) return;

    const text = editor.getText().trim();
    if (!text) return notify.toast('No text to transform');

    menu._ctx = ctx;
    menu._text = text;
    menu._expanded = false;
    menu._activeIndex = 0;

    // Smart preview with first/last words
    const preview = menu.querySelector('.sae-ai-preview');
    preview.textContent = smartTruncate(text, 120);

    renderAIMenuPills(menu);
    positionAIMenu(menu, ctx);

    menu.classList.add('open');
    menu.classList.remove('loading');

    menu._keyHandler = e => handleAIMenuKey(e, menu);
    document.addEventListener('keydown', menu._keyHandler, true);
  }

  function renderAIMenuPills(menu) {
    const primaryContainer = menu.querySelector('.sae-ai-pills.primary');
    const secondaryContainer = menu.querySelector('.sae-ai-pills.secondary');
    const customContainer = menu.querySelector('.sae-ai-custom');
    const customPillsContainer = menu.querySelector('.sae-ai-pills.custom');
    const moreSection = menu.querySelector('.sae-ai-more');
    const toggle = menu.querySelector('.sae-ai-toggle');

    // Get enabled prompts
    const enabledBuiltins = BUILTIN_PROMPTS.filter(p => isBuiltinEnabled(p.id));
    const enabledCustoms = state.customPrompts.filter(isCustomEnabled);
    
    const inlineCount = CONFIG.aiMenuInlineCount;
    const primaryPrompts = enabledBuiltins.slice(0, inlineCount);
    const secondaryPrompts = enabledBuiltins.slice(inlineCount);

    let idx = 1;
    
    const renderPill = p => `
      <button class="sae-ai-pill" data-id="${p.id}">
        <span class="icon">${p.icon}</span>
        <span>${p.label}</span>
        <span class="key">${idx++}</span>
      </button>
    `;

    primaryContainer.innerHTML = primaryPrompts.map(renderPill).join('');
    secondaryContainer.innerHTML = secondaryPrompts.map(renderPill).join('');

    if (enabledCustoms.length) {
      customPillsContainer.innerHTML = enabledCustoms.map(p => `
        <button class="sae-ai-pill" data-id="${p.id}">
          <span class="icon">${p.icon || '⚡'}</span>
          <span>${escHtml(p.label)}</span>
          <span class="key">${idx++}</span>
        </button>
      `).join('');
      customContainer.style.display = 'block';
    } else {
      customContainer.style.display = 'none';
    }

    const moreCount = secondaryPrompts.length + enabledCustoms.length;
    toggle.style.display = moreCount ? 'flex' : 'none';
    moreSection.style.display = menu._expanded ? 'block' : 'none';
    toggle.textContent = menu._expanded ? '▴ Less' : `▾ More (${moreCount})`;

    // Bind click handlers
    menu.querySelectorAll('.sae-ai-pill').forEach(pill => {
      pill.onclick = () => executeAIAction(menu, pill.dataset.id);
    });

    toggle.onclick = () => {
      menu._expanded = !menu._expanded;
      moreSection.style.display = menu._expanded ? 'block' : 'none';
      toggle.textContent = menu._expanded ? '▴ Less' : `▾ More (${moreCount})`;
      updateActivePill(menu);
    };

    updateActivePill(menu);
  }

  function updateActivePill(menu) {
    const pills = menu.querySelectorAll('.sae-ai-pill');
    pills.forEach((p, i) => p.classList.toggle('active', i === menu._activeIndex));
  }

  function handleAIMenuKey(e, menu) {
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      closeAIMenu();
      return;
    }

    const visiblePills = [...menu.querySelectorAll('.sae-ai-pill')].filter(p => p.offsetParent !== null);

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && visiblePills[num - 1]) {
      e.preventDefault(); e.stopPropagation();
      executeAIAction(menu, visiblePills[num - 1].dataset.id);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      menu._activeIndex = Math.min(visiblePills.length - 1, menu._activeIndex + 1);
      updateActivePill(menu);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      menu._activeIndex = Math.max(0, menu._activeIndex - 1);
      updateActivePill(menu);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (visiblePills[menu._activeIndex]) {
        executeAIAction(menu, visiblePills[menu._activeIndex].dataset.id);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      menu._expanded = !menu._expanded;
      renderAIMenuPills(menu);
    }
  }

  function positionAIMenu(menu, ctx) {
    let rect;
    
    if (ctx.kind === 'input') {
      rect = ctx.el.getBoundingClientRect();
    } else {
      const sel = window.getSelection?.();
      rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : ctx.root.getBoundingClientRect();
    }

    const menuHeight = 260;
    const menuWidth = 360;

    let top = rect.bottom + 8;
    let left = Math.max(8, rect.left);

    if (top + menuHeight > innerHeight - 16) {
      top = Math.max(8, rect.top - menuHeight - 8);
      menu.classList.add('above');
      menu.classList.remove('below');
    } else {
      menu.classList.add('below');
      menu.classList.remove('above');
    }

    if (left + menuWidth > innerWidth - 16) {
      left = innerWidth - menuWidth - 16;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  async function executeAIAction(menu, promptId) {
    const prompt = getAllPromptsForExecution().find(p => p.id === promptId);
    if (!prompt) return;

    const ctx = menu._ctx;
    const text = menu._text;

    menu.classList.add('loading');
    menu.querySelector('.sae-ai-loading span').textContent = `${prompt.label}...`;

    try {
      const result = await callGemini(prompt.prompt, text);
      if (result) {
        closeAIMenu();
        
        try {
          const el = ctx.kind === 'input' ? ctx.el : ctx.root;
          el.focus({ preventScroll: true });
        } catch {}
        
        const editor = makeEditor(captureContext() || ctx);
        if (editor) {
          editor.replace(result);
          notify.toast(`${prompt.icon} Applied!`, 1200);
        }
      }
    } catch (err) {
      console.warn('AI action error:', err);
      menu.classList.remove('loading');
      notify.toast('AI request failed');
    }
  }

  function closeAIMenu() {
    if (!aiMenuEl) return;
    aiMenuEl.classList.remove('open', 'loading');
    if (aiMenuEl._keyHandler) {
      document.removeEventListener('keydown', aiMenuEl._keyHandler, true);
      aiMenuEl._keyHandler = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Gemini API
  // ─────────────────────────────────────────────────────────────
  async function callGemini(systemPrompt, userText) {
    const keys = (state.apiKey || '').split(';').map(k => k.trim()).filter(Boolean);
    if (!keys.length) {
      notify.toast('Set API key in Settings (Alt+P → ⚙️)');
      return null;
    }

    const truncated = userText.slice(0, CONFIG.gemini.maxInputChars);
    const prompt = `${systemPrompt}\n\nText:\n${truncated}`;

    for (let i = 0; i < keys.length; i++) {
      const idx = (state.apiKeyIndex + i) % keys.length;
      const key = keys[idx];
      
      try {
        const res = await GMX.request({
          method: 'POST',
          url: `${CONFIG.gemini.endpoint}/${CONFIG.gemini.model}:generateContent?key=${encodeURIComponent(key)}`,
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: CONFIG.gemini.temperature }
          })
        });

        if (res.status >= 200 && res.status < 300) {
          const json = JSON.parse(res.text);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            state.apiKeyIndex = idx;
            return cleanAIResponse(text);
          }
        }
      } catch { continue; }
    }

    notify.toast('All API keys failed');
    return null;
  }

  function cleanAIResponse(s) {
    if (!s) return s;
    let out = s.trim();
    const m = out.match(/^```\w*\n?([\s\S]*?)\n?```$/);
    if (m) out = m[1].trim();
    if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
      out = out.slice(1, -1);
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────────
  // Palette UI
  // ─────────────────────────────────────────────────────────────
  function ensurePalette() {
    if (paletteEl) return paletteEl;

    paletteEl = document.createElement('div');
    paletteEl.className = 'sae-palette';
    paletteEl.innerHTML = `
      <div class="sae-panel" role="dialog">
        <div class="sae-panel-header">
          <input class="sae-search" type="search" placeholder="Search abbreviations..." />
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
        <div class="sae-list"></div>
        <div class="sae-settings"></div>
        <div class="sae-add-new"><button data-action="add">+ Add Abbreviation</button></div>
        <div class="sae-footer">Shift+Space to expand · Alt+G for AI actions</div>
      </div>
    `;
    document.documentElement.appendChild(paletteEl);

    const panel = $('.sae-panel', paletteEl);
    const search = $('.sae-search', paletteEl);
    const list = $('.sae-list', paletteEl);
    const settings = $('.sae-settings', paletteEl);
    const backBtn = $('[data-action="back"]', paletteEl);

    paletteEl.addEventListener('click', e => { if (e.target === paletteEl) closePalette(); });
    $('[data-action="close"]', paletteEl).onclick = closePalette;
    $('[data-action="settings"]', paletteEl).onclick = () => showSettings(true);
    backBtn.onclick = () => showSettings(false);
    $('[data-action="add"]', paletteEl).onclick = addNewAbbrev;

    const renderDebounced = debounce(() => renderList(search.value), CONFIG.searchDebounceMs);
    search.addEventListener('input', renderDebounced);

    paletteEl.addEventListener('keydown', e => {
      if (panel.classList.contains('settings-open')) {
        if (e.key === 'Escape') { e.preventDefault(); showSettings(false); }
        return;
      }
      if (e.target.closest('.sae-item.editing')) return;

      if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const active = list.querySelector('.sae-item.active:not(.editing)');
        if (active) insertAbbrev(active.dataset.key);
        return;
      }

      const items = $$('.sae-item:not(.editing)', list);
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.activeIndex = Math.min(items.length - 1, state.activeIndex + 1);
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.activeIndex = Math.max(0, state.activeIndex - 1);
        updateActiveItem(items);
      }
    });

    list.addEventListener('click', e => {
      const item = e.target.closest('.sae-item');
      if (!item || item.classList.contains('editing')) return;
      
      const action = e.target.closest('[data-action]')?.dataset.action;
      const key = item.dataset.key;

      if (action === 'edit') editAbbrev(item, key);
      else if (action === 'delete') deleteAbbrev(key);
      else insertAbbrev(key);
    });

    function showSettings(show) {
      panel.classList.toggle('settings-open', show);
      backBtn.style.display = show ? 'flex' : 'none';
      if (show) renderSettings();
      else search.focus();
    }

    function renderList(filter = '') {
      const q = filter.toLowerCase();
      const keys = Object.keys(state.dict).sort();
      const items = q ? keys.filter(k => k.includes(q) || state.dict[k].toLowerCase().includes(q)) : keys;
      state.activeIndex = clamp(state.activeIndex, 0, Math.max(0, items.length - 1));

      list.innerHTML = items.length ? items.map((k, i) => `
        <div class="sae-item${i === state.activeIndex ? ' active' : ''}" data-key="${escHtml(k)}">
          <div class="sae-key">${escHtml(k)}</div>
          <div class="sae-val">${escHtml(state.dict[k])}</div>
          <div class="sae-item-actions">
            <button data-action="edit">Edit</button>
            <button data-action="delete">Del</button>
          </div>
        </div>
      `).join('') : '<div class="sae-empty">No abbreviations found</div>';
    }

    function updateActiveItem(items) {
      items.forEach((item, i) => item.classList.toggle('active', i === state.activeIndex));
      items[state.activeIndex]?.scrollIntoView({ block: 'nearest' });
    }

    function addNewAbbrev() {
      search.value = '';
      renderList();
      const temp = document.createElement('div');
      temp.className = 'sae-item editing';
      list.insertBefore(temp, list.firstChild);
      mountEditor(temp, '', '', async (k, v) => {
        if (!k || !v) return notify.toast('Both fields required');
        state.dict[k] = v;
        await saveDict('Added');
      }, () => { temp.remove(); renderList(); });
    }

    function editAbbrev(item, key) {
      item.classList.add('editing');
      mountEditor(item, key, state.dict[key], async (newKey, newVal) => {
        if (!newKey || !newVal) return notify.toast('Both fields required');
        const updated = { ...state.dict };
        if (newKey !== key) delete updated[key];
        updated[newKey] = newVal;
        state.dict = updated;
        await saveDict('Saved');
      }, () => renderList(search.value));
    }

    function deleteAbbrev(key) {
      if (!confirm(`Delete "${key}"?`)) return;
      delete state.dict[key];
      saveDict('Deleted');
    }

    async function insertAbbrev(key) {
      closePalette();
      const tmpl = state.dict[key];
      if (!tmpl) return;

      let ctx = state.lastEditable;
      if (!ctx || !(ctx.kind === 'input' ? ctx.el?.isConnected : ctx.root?.isConnected)) {
        ctx = getContextOrFallback();
      }
      if (!ctx) return notify.toast('No editable field');

      try {
        (ctx.kind === 'input' ? ctx.el : ctx.root).focus({ preventScroll: true });
      } catch {}

      const rendered = await renderTemplate(tmpl);
      const editor = makeEditor(captureContext() || ctx);
      if (editor) editor.replace(rendered.text);
    }

    function renderSettings() {
      settings.innerHTML = `
        <div class="sae-hrow">
          <div class="sae-hrow-label">API Key(s)</div>
          <div class="sae-hrow-content">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <input class="sae-input" id="sae-api-key" type="password" placeholder="Enter key(s) separated by ;" value="${escHtml(state.apiKey)}" style="flex:1" />
              <button class="sae-btn primary" id="sae-verify-key">Verify</button>
            </div>
            <div class="sae-help">Multiple keys supported (separated by ;) — rotates on rate limits</div>
          </div>
        </div>
        
        <div class="sae-hrow">
          <div class="sae-hrow-label">Hotkeys</div>
          <div class="sae-hrow-content">
            <div class="sae-hk-row">
              <div class="sae-hk-item">
                <span style="color:#888;min-width:60px">Palette:</span>
                <span class="sae-chip">${hotkeyStr(CONFIG.palette)}</span>
                <button class="sae-btn sm" data-hk="palette">Change</button>
              </div>
              <div class="sae-hk-item">
                <span style="color:#888;min-width:60px">AI Menu:</span>
                <span class="sae-chip">${hotkeyStr(CONFIG.aiMenu)}</span>
                <button class="sae-btn sm" data-hk="aiMenu">Change</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="sae-hrow">
          <div class="sae-hrow-label">AI Menu Display</div>
          <div class="sae-hrow-content">
            <div class="sae-inline-row">
              <label>Show inline:</label>
              <input class="sae-input" type="number" id="sae-inline-count" min="1" max="9" value="${CONFIG.aiMenuInlineCount}" />
              <span class="sae-help" style="margin:0">prompts (1-9), rest in "More"</span>
            </div>
          </div>
        </div>
        
        <div class="sae-hrow">
          <div class="sae-hrow-label">AI Prompts</div>
          <div class="sae-hrow-content">
            <div class="sae-prompt-section">
              <div class="sae-prompt-section-title">Built-in Prompts</div>
              <div class="sae-prompt-list" id="sae-builtin-prompts"></div>
            </div>
            <div class="sae-prompt-section" style="margin-top:16px">
              <div class="sae-prompt-section-title">Custom Prompts</div>
              <div class="sae-prompt-list" id="sae-custom-prompts"></div>
              <button class="sae-btn primary" id="sae-add-prompt" style="margin-top:10px">+ Add Custom Prompt</button>
            </div>
          </div>
        </div>
        
        <div class="sae-hrow">
          <div class="sae-hrow-label">Dictionary</div>
          <div class="sae-hrow-content">
            <div class="sae-btn-row">
              <button class="sae-btn" id="sae-export">Export JSON</button>
              <button class="sae-btn" id="sae-import">Import JSON</button>
              <button class="sae-btn danger" id="sae-reset">Reset Defaults</button>
            </div>
          </div>
        </div>
      `;

      // API key
      const keyInput = $('#sae-api-key', settings);
      keyInput.addEventListener('change', async () => {
        state.apiKey = keyInput.value.trim();
        await GMX.setValue(CONFIG.storeKeys.apiKey, state.apiKey);
      });
      
      $('#sae-verify-key', settings).onclick = async function() {
        const keys = keyInput.value.split(';').filter(k => k.trim());
        if (!keys.length) return notify.toast('Enter API key first');
        this.textContent = '...';
        try {
          const res = await GMX.request({ 
            method: 'GET', 
            url: `${CONFIG.gemini.endpoint}?key=${encodeURIComponent(keys[0].trim())}`, 
            timeout: 5000 
          });
          if (res.status < 300) {
            this.textContent = '✓ Valid';
            this.classList.add('success');
            state.apiKey = keyInput.value.trim();
            await GMX.setValue(CONFIG.storeKeys.apiKey, state.apiKey);
            notify.toast('API key verified');
          } else {
            this.textContent = '✗ Invalid';
            notify.toast('Invalid API key');
          }
        } catch {
          this.textContent = '✗ Failed';
          notify.toast('Verification failed');
        }
        setTimeout(() => { this.textContent = 'Verify'; this.classList.remove('success'); }, 2000);
      };

      // Hotkeys
      $$('[data-hk]', settings).forEach(btn => {
        btn.onclick = async () => {
          const name = btn.dataset.hk;
          notify.toast('Press new hotkey...');
          const spec = await captureHotkey();
          if (!spec) return;
          CONFIG[name] = spec;
          const keys = await GMX.getValue(CONFIG.storeKeys.keys, {});
          keys[name] = spec;
          await GMX.setValue(CONFIG.storeKeys.keys, keys);
          renderSettings();
          notify.toast(`Hotkey: ${hotkeyStr(spec)}`);
        };
      });

      // Inline count
      $('#sae-inline-count', settings).addEventListener('change', async function() {
        const val = clamp(parseInt(this.value) || 4, 1, 9);
        this.value = val;
        CONFIG.aiMenuInlineCount = val;
        state.settings.aiMenuInlineCount = val;
        await GMX.setValue(CONFIG.storeKeys.settings, state.settings);
      });

      // Prompts
      renderBuiltinPrompts();
      renderCustomPrompts();
      $('#sae-add-prompt', settings).onclick = addCustomPrompt;

      // Dict actions
      $('#sae-export', settings).onclick = exportDict;
      $('#sae-import', settings).onclick = importDict;
      $('#sae-reset', settings).onclick = async () => {
        if (!confirm('Reset dictionary to defaults?')) return;
        state.dict = normalizeDict(DEFAULT_DICT);
        await saveDict('Reset to defaults');
      };
    }

    function renderBuiltinPrompts() {
      const container = $('#sae-builtin-prompts', settings);
      if (!container) return;
      
      container.innerHTML = BUILTIN_PROMPTS.map(p => {
        const enabled = isBuiltinEnabled(p.id);
        return `
          <div class="sae-prompt-item builtin${enabled ? '' : ' disabled'}" data-id="${p.id}">
            <span class="icon">${p.icon}</span>
            <span class="label">${p.label}</span>
            <span class="prompt-text">${escHtml(p.prompt)}</span>
            <div class="actions">
              <div class="sae-toggle${enabled ? ' on' : ''}" data-action="toggle-builtin" title="${enabled ? 'Disable' : 'Enable'}"></div>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('[data-action="toggle-builtin"]').forEach(toggle => {
        toggle.onclick = async () => {
          const id = toggle.closest('.sae-prompt-item').dataset.id;
          const idx = state.disabledBuiltins.indexOf(id);
          if (idx >= 0) {
            state.disabledBuiltins.splice(idx, 1);
          } else {
            state.disabledBuiltins.push(id);
          }
          await GMX.setValue(CONFIG.storeKeys.disabledBuiltins, state.disabledBuiltins);
          renderBuiltinPrompts();
        };
      });
    }

    function renderCustomPrompts() {
      const container = $('#sae-custom-prompts', settings);
      if (!container) return;
      
      if (state.customPrompts.length) {
        container.innerHTML = state.customPrompts.map((p, i) => `
          <div class="sae-prompt-item${p.enabled === false ? ' disabled' : ''}" data-index="${i}">
            <span class="icon">${p.icon || '⚡'}</span>
            <span class="label">${escHtml(p.label)}</span>
            <span class="prompt-text">${escHtml(p.prompt)}</span>
            <div class="actions">
              <div class="sae-toggle${p.enabled !== false ? ' on' : ''}" data-action="toggle-custom" title="Enable/Disable"></div>
              <button class="sae-btn sm" data-action="edit-prompt">Edit</button>
              <button class="sae-btn sm danger" data-action="del-prompt">Del</button>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<div class="sae-empty">No custom prompts yet</div>';
      }

      container.querySelectorAll('[data-action="toggle-custom"]').forEach(toggle => {
        toggle.onclick = async () => {
          const idx = parseInt(toggle.closest('.sae-prompt-item').dataset.index);
          state.customPrompts[idx].enabled = !state.customPrompts[idx].enabled;
          await GMX.setValue(CONFIG.storeKeys.customPrompts, state.customPrompts);
          renderCustomPrompts();
        };
      });

      container.querySelectorAll('[data-action="edit-prompt"]').forEach(btn => {
        btn.onclick = () => editCustomPrompt(parseInt(btn.closest('.sae-prompt-item').dataset.index));
      });

      container.querySelectorAll('[data-action="del-prompt"]').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.closest('.sae-prompt-item').dataset.index);
          if (!confirm(`Delete "${state.customPrompts[idx].label}"?`)) return;
          state.customPrompts.splice(idx, 1);
          await GMX.setValue(CONFIG.storeKeys.customPrompts, state.customPrompts);
          renderCustomPrompts();
          notify.toast('Deleted');
        };
      });
    }

    function addCustomPrompt() {
      const container = $('#sae-custom-prompts', settings);
      const empty = container.querySelector('.sae-empty');
      if (empty) empty.remove();
      
      const item = document.createElement('div');
      item.className = 'sae-prompt-item editing';
      item.innerHTML = `
        <div class="sae-prompt-edit-form">
          <div class="sae-prompt-edit-row">
            <input class="sae-input icon-input" placeholder="⚡" id="p-icon" value="⚡" maxlength="2" />
            <input class="sae-input label-input" placeholder="Prompt name..." id="p-label" />
          </div>
          <textarea class="sae-textarea" placeholder="Instructions for the AI..." id="p-prompt"></textarea>
          <div class="sae-prompt-edit-actions">
            <button class="sae-btn" id="p-cancel">Cancel</button>
            <button class="sae-btn primary" id="p-save">Save</button>
          </div>
        </div>
      `;
      container.insertBefore(item, container.firstChild);

      $('#p-save', item).onclick = async () => {
        const icon = $('#p-icon', item).value.trim() || '⚡';
        const label = $('#p-label', item).value.trim();
        const prompt = $('#p-prompt', item).value.trim();
        if (!label || !prompt) return notify.toast('Name and prompt required');
        state.customPrompts.push({ id: genId(), icon, label, prompt, enabled: true });
        await GMX.setValue(CONFIG.storeKeys.customPrompts, state.customPrompts);
        renderCustomPrompts();
        notify.toast('Added');
      };
      $('#p-cancel', item).onclick = () => renderCustomPrompts();
      $('#p-label', item).focus();
    }

    function editCustomPrompt(idx) {
      const p = state.customPrompts[idx];
      if (!p) return;
      const container = $('#sae-custom-prompts', settings);
      const item = container.querySelector(`[data-index="${idx}"]`);
      if (!item) return;

      item.className = 'sae-prompt-item editing';
      item.innerHTML = `
        <div class="sae-prompt-edit-form">
          <div class="sae-prompt-edit-row">
            <input class="sae-input icon-input" id="p-icon" value="${escHtml(p.icon || '⚡')}" maxlength="2" />
            <input class="sae-input label-input" id="p-label" value="${escHtml(p.label)}" />
          </div>
          <textarea class="sae-textarea" id="p-prompt">${escHtml(p.prompt)}</textarea>
          <div class="sae-prompt-edit-actions">
            <button class="sae-btn" id="p-cancel">Cancel</button>
            <button class="sae-btn primary" id="p-save">Save</button>
          </div>
        </div>
      `;

      $('#p-save', item).onclick = async () => {
        const icon = $('#p-icon', item).value.trim() || '⚡';
        const label = $('#p-label', item).value.trim();
        const prompt = $('#p-prompt', item).value.trim();
        if (!label || !prompt) return notify.toast('Name and prompt required');
        Object.assign(p, { icon, label, prompt });
        await GMX.setValue(CONFIG.storeKeys.customPrompts, state.customPrompts);
        renderCustomPrompts();
        notify.toast('Saved');
      };
      $('#p-cancel', item).onclick = () => renderCustomPrompts();
    }

    async function saveDict(msg) {
      await GMX.setValue(CONFIG.storeKeys.dict, state.dict);
      renderList(search.value);
      notify.toast(msg);
    }

    paletteEl._render = () => renderList(search.value);
    return paletteEl;
  }

  function mountEditor(container, key, val, onSave, onCancel) {
    container.innerHTML = `
      <input class="sae-input" placeholder="abbreviation" value="${escHtml(key)}" data-field="key" style="max-width:140px" />
      <input class="sae-input" placeholder="expansion (supports {{templates}})" value="${escHtml(val)}" data-field="val" />
      <div class="sae-item-actions">
        <button data-action="save">Save</button>
        <button data-action="cancel">Cancel</button>
      </div>
    `;

    const keyIn = container.querySelector('[data-field="key"]');
    const valIn = container.querySelector('[data-field="val"]');

    const save = () => {
      const k = keyIn.value.trim().toLowerCase();
      if (!/^[\w-]+$/i.test(k)) return notify.toast('Invalid: use letters, numbers, -, _');
      onSave(k, valIn.value);
    };

    container.querySelector('[data-action="save"]').onclick = save;
    container.querySelector('[data-action="cancel"]').onclick = onCancel;

    [keyIn, valIn].forEach(inp => inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); inp === keyIn ? valIn.focus() : save(); }
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    }));

    keyIn.focus();
    keyIn.select?.();
  }

  function openPalette() {
    const p = ensurePalette();
    p.classList.add('open');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = p.querySelector('.sae-panel');
    panel.classList.remove('settings-open');
    p.querySelector('[data-action="back"]').style.display = 'none';
    const search = p.querySelector('.sae-search');
    search.value = '';
    state.activeIndex = 0;
    p._render?.();
    search.focus();
  }

  function closePalette() {
    if (!paletteEl) return;
    paletteEl.classList.remove('open');
    document.body.style.overflow = prevOverflow;
    prevOverflow = '';
  }

  // ─────────────────────────────────────────────────────────────
  // Hotkey Capture
  // ─────────────────────────────────────────────────────────────
  function captureHotkey() {
    return new Promise(resolve => {
      const handler = e => {
        if (e.key === 'Escape') { cleanup(); resolve(null); return; }
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
        e.preventDefault();
        cleanup();
        resolve({ code: e.code, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey });
      };
      const cleanup = () => document.removeEventListener('keydown', handler, true);
      document.addEventListener('keydown', handler, true);
    });
  }

  function hotkeyStr(spec) {
    const parts = [];
    if (spec.ctrl) parts.push('Ctrl');
    if (spec.meta) parts.push('Cmd');
    if (spec.alt) parts.push('Alt');
    if (spec.shift) parts.push('Shift');
    parts.push(spec.code?.replace(/^Key/, '').replace(/^Digit/, '') || 'Space');
    return parts.join('+');
  }

  // ─────────────────────────────────────────────────────────────
  // Dict Import/Export
  // ─────────────────────────────────────────────────────────────
  function exportDict() {
    const blob = new Blob([JSON.stringify(state.dict, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `texpander-dict-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify.toast('Exported');
  }

  async function importDict() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let obj = JSON.parse(text);
        if (obj.dict) obj = obj.dict;
        const imported = normalizeDict(obj);
        const count = Object.keys(imported).length;
        if (!count) return notify.toast('No valid entries');
        Object.assign(state.dict, imported);
        await GMX.setValue(CONFIG.storeKeys.dict, state.dict);
        paletteEl?._render?.();
        notify.toast(`Imported ${count} entries`);
      } catch { notify.toast('Invalid JSON'); }
    };
    input.click();
  }

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