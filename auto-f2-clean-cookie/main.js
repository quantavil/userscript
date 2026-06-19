// ==UserScript==
// @name         Auto CleanCookie - for AI
// @namespace    https://github.com/quantavil/userscript
// @version      1.0.1
// @description  Best-effort one-click reset for Arena.ai + Auto Text Splitter for AI sites.
// @match        http://x.ai/*
// @match        https://ai.01.ai/*
// @match        https://ai.baidu.com/
// @match        https://aistudio.google.com/*
// @match        https://alexa.amazon.com/*
// @match        https://amazon.com/alexa/*
// @match        https://anthropic.com/*
// @match        https://api.openai.com/*
// @match        https://arena.ai/*
// @match        https://aws.amazon.com/ai/*
// @match        https://aws.amazon.com/bedrock/*
// @match        https://aws.amazon.com/codewhisperer/*
// @match        https://azure.com/*
// @match        https://azure.microsoft.com/ai/*
// @match        https://beta.character.ai/*
// @match        https://beta.openai.com/*
// @match        https://bing.com/chat/*
// @match        https://bing.com/create/*
// @match        https://character.ai/*
// @match        https://chat.baidu.com/*
// @match        https://chat.deepseek.com/*
// @match        https://chat.kimi.ai/*
// @match        https://chat.mistral.ai/*
// @match        https://chat.openai.com/*
// @match        https://chat.qwen.ai/*
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @match        https://console.aws.amazon.com/*
// @match        https://copilot.github.com/*
// @match        https://copilot.microsoft.com/*
// @match        https://coze.com/*
// @match        https://developer.amazon.com/alexa/*
// @match        https://ernie.baidu.com/*
// @match        https://gemini.google.com/*
// @match        https://grok.com/*
// @match        https://hailuoai.com/*
// @match        https://hunyuan.tencent.com/*
// @match        https://jan.ai/*
// @match        https://kimi.ai/*
// @match        https://lmstudio.ai/*
// @match        https://meta.ai/*
// @match        https://minimax.com/*
// @match        https://moonshot.cn/*
// @match        https://ollama.com/*
// @match        https://open.bigmodel.cn/*
// @match        https://openai.com/*
// @match        https://perplexity.ai/*
// @match        https://pi.ai/*
// @match        https://platform.openai.com/*
// @match        https://playground.openai.com/*
// @match        https://qianwen.aliyun.com/*
// @match        https://qwen.alibaba.com/*
// @match        https://replit.com/*
// @match        https://sillytavern.app/*
// @match        https://stepfun.ai/*
// @match        https://teams.microsoft.com/*
// @match        https://tongyi.aliyun.com/*
// @match        https://tongyi.aliyun.com/qwen/*
// @match        https://wenxin.baidu.com/*
// @match        https://www.01.ai/*
// @match        https://www.deepseek.com/*
// @match        https://www.doubao.com/*
// @match        https://www.lingyiwanwu.com/*
// @match        https://yiyan.baidu.com/*
// @match        https://yuanbao.tencent.com/*
// @match        https://chat.z.ai/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     §0  Module Toggles
     ═══════════════════════════════════════════════════════════ */
  const MODS = {
    reset: { key: 'mod_reset', label: '🗑️ Session Reset' },
    splitter: { key: 'mod_splitter', label: '✂️ Auto Splitter Lite' },
  };
  const modOn = id => GM_getValue(MODS[id].key, true);

  for (const [id, { key, label }] of Object.entries(MODS)) {
    GM_registerMenuCommand(
      `${modOn(id) ? '✅' : '❌'} ${label}`,
      () => {
        const v = !modOn(id);
        GM_setValue(key, v);
        alert(`${label}: ${v ? 'ON' : 'OFF'}\nRefresh to apply.`);
      },
      id[0]
    );
  }

  const RESET_ON = modOn('reset');
  const SPLITTER_ON = modOn('splitter');
  if (!RESET_ON && !SPLITTER_ON) return;

  /* ═══════════════════════════════════════════════════════════
     §1  Shared Utilities
     ═══════════════════════════════════════════════════════════ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const escHtml = s => Object.assign(document.createElement('div'), { textContent: s }).innerHTML;
  const clip = text => navigator.clipboard.writeText(text).catch(() => {
    const t = Object.assign(document.createElement('textarea'), { value: text });
    t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  });
  const isVis = el => {
    if (!el?.isConnected) return false;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const onReady = fn => document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true });
  const HOST = location.hostname.replace(/^www\./, '');
  const IS_ARENA = ['lmarena.ai', 'arena.ai'].some(d => HOST === d || HOST.endsWith('.' + d));
  const inFab = el => !!el?.closest('#uc-fab-dock, #sp-panel-outer');

  /* ═══════════════════════════════════════════════════════════
     §1b  Cookie helper (shared)
     ═══════════════════════════════════════════════════════════ */
  function getDomains() {
    const h = location.hostname;
    const parts = h.split('.').filter(Boolean);
    const ds = new Set(['', h, '.' + h]);
    for (let i = 1; i < parts.length - 1; i++) {
      const p = parts.slice(i).join('.');
      if (p.split('.').length < 2) continue;
      ds.add(p);
      ds.add('.' + p);
    }
    return [...ds];
  }

  function getPaths() {
    const parts = location.pathname.split('/').filter(Boolean);
    const ps = new Set(['/']);
    let cur = '';
    for (const part of parts) {
      cur += '/' + part;
      ps.add(cur);
    }
    return [...ps];
  }

  const PATHS = getPaths();
  const DOMAINS = getDomains();

  function nukeCookie(name) {
    const exp = '=;expires=Thu,01 Jan 1970 00:00:00 GMT';
    for (const p of PATHS) for (const d of DOMAINS) {
      const base = `${name}${exp};path=${p}${d ? ';domain=' + d : ''}`;
      for (const extra of ['', ';Secure', ';SameSite=None;Secure', ';SameSite=Lax', ';SameSite=Strict']) {
        document.cookie = base + extra;
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     §2  Arena-only: fetch intercept & webdriver spoof
     ═══════════════════════════════════════════════════════════ */
  if (IS_ARENA && RESET_ON) {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
    } catch (_) {}

    const secLog = [];
    const SEC_PATTERNS = ['challenges.cloudflare.com', 'turnstile', 'recaptcha', 'siteverify', 'cdn-cgi/challenge'];
    const origFetch = window.fetch;
    window.fetch = async function (...a) {
      const url = typeof a[0] === 'string' ? a[0] : a[0]?.url || '';
      if (SEC_PATTERNS.some(p => url.includes(p))) {
        if (secLog.length >= 50) secLog.shift();
        secLog.push({ t: Date.now(), url: url.slice(0, 160) });
      }
      return origFetch.apply(this, a);
    };
  }

  /* ═══════════════════════════════════════════════════════════
     §3  Styles (single injection)
     ═══════════════════════════════════════════════════════════ */
  GM_addStyle(`
:root{
  --uc-font:'Geist','Outfit','Plus Jakarta Sans',system-ui,-apple-system,sans-serif;
  --uc-ease:cubic-bezier(.32,.72,0,1);
  --uc-pop:cubic-bezier(.34,1.56,.64,1);
  --uc-glass:rgba(10,10,10,.65);
  --uc-glass2:rgba(15,15,15,.85);
  --uc-border:rgba(255,255,255,.06);
  --uc-border2:rgba(255,255,255,.1);
}
/* ── 2-in-1 FAB dock ── */
#uc-fab-dock{
  position:fixed;bottom:24px;right:24px;z-index:2147483647;
  display:flex;gap:0;border-radius:9999px;overflow:hidden;
  background:var(--uc-glass);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1px rgba(255,255,255,.05),0 8px 32px rgba(0,0,0,.45);
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  transition:transform 300ms var(--uc-ease);
  user-select:none;
}
#uc-fab-dock:hover{transform:scale(.98)}
.uc-fab{
  border:none;background:transparent;color:#fff;cursor:pointer;
  padding:10px 18px;font:600 13px/1.4 var(--uc-font);
  letter-spacing:-.01em;white-space:nowrap;
  transition:background 200ms,opacity 200ms;position:relative;
}
.uc-fab:hover{background:rgba(255,255,255,.08)}
.uc-fab:active{background:rgba(255,255,255,.04)}
.uc-fab:disabled{opacity:.45;cursor:wait}
.uc-fab+.uc-fab::before{
  content:'';position:absolute;left:0;top:20%;height:60%;width:1px;
  background:rgba(255,255,255,.12);
}

/* ── Reset status float ── */
#rs-float{
  position:fixed;bottom:80px;right:24px;z-index:2147483646;
  padding:6px;background:rgba(10,10,10,.4);
  border:1px solid var(--uc-border);border-radius:2rem;
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 20px 40px -15px rgba(0,0,0,.5);
  pointer-events:none;opacity:0;transform:translateY(12px) scale(.97);
  transition:opacity 300ms var(--uc-ease),transform 300ms var(--uc-ease);
}
#rs-float.vis{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}
#rs-float-inner{
  background:var(--uc-glass2);border-radius:calc(2rem - 6px);
  padding:14px 18px;max-width:320px;max-height:280px;overflow-y:auto;
  color:#d1d5db;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;
}
#rs-float-inner::-webkit-scrollbar{width:3px}
#rs-float-inner::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
#rs-float-inner .e{margin:4px 0;opacity:0;animation:uc-up .5s var(--uc-pop) forwards}
#rs-float-inner .e.ok{color:#34d399}
#rs-float-inner .e.w{color:#fbbf24}
#rs-float-inner .e.er{color:#f87171}
#rs-float-inner .e.sc{color:#a78bfa}
@keyframes uc-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* ── Splitter panel ── */
#sp-panel-outer{
  position:fixed;bottom:80px;right:24px;z-index:2147483645;
  width:400px;max-height:82vh;display:flex;flex-direction:column;
  padding:6px;background:rgba(10,10,10,.4);
  border:1px solid var(--uc-border);border-radius:2rem;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 30px 60px -15px rgba(0,0,0,.55);
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  transition:opacity 250ms var(--uc-ease),transform 250ms var(--uc-ease);
  transform-origin:bottom right;
  pointer-events:none;opacity:0;transform:translateY(8px) scale(.96);
}
#sp-panel-outer.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}
#sp-inner{
  display:flex;flex-direction:column;background:var(--uc-glass2);
  border-radius:calc(2rem - 6px);overflow:hidden;
  font:14px/1.6 var(--uc-font);color:#e5e7eb;
}
#sp-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.03);font-weight:600;font-size:14px;
}
#sp-head button{
  background:rgba(255,255,255,.05);border:none;color:#9ca3af;cursor:pointer;
  width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;
  transition:all 200ms;
}
#sp-head button:hover{color:#f3f4f6;background:rgba(255,255,255,.1);transform:scale(.9)}
#sp-body{padding:20px;display:flex;flex-direction:column;gap:14px;overflow-y:auto}
#sp-body::-webkit-scrollbar{width:3px}
#sp-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
#sp-text{
  width:100%;min-height:100px;max-height:220px;resize:vertical;
  background:rgba(5,5,5,.5);color:#f3f4f6;
  border:1px solid var(--uc-border);border-radius:.8rem;
  padding:14px;box-sizing:border-box;outline:none;
  font:13px ui-monospace,monospace;transition:border 200ms;
}
#sp-text:focus{border-color:var(--uc-border2)}
.sp-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.sp-row label{display:flex;align-items:center;gap:6px;color:#a1a1aa;font-size:12px;cursor:pointer}
.sp-row input[type=number],.sp-row select{
  background:rgba(5,5,5,.5);color:#e5e7eb;border:1px solid var(--uc-border);
  border-radius:6px;padding:6px 10px;outline:none;font:inherit;
}
.sp-row input[type=checkbox]{accent-color:#fff;width:15px;height:15px}
.sp-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.sp-btns button{
  flex:1;padding:10px 14px;border:1px solid var(--uc-border);border-radius:9999px;
  cursor:pointer;font:600 13px var(--uc-font);transition:all 250ms var(--uc-ease);
  background:rgba(20,20,20,.8);color:#eee;display:flex;justify-content:center;align-items:center;gap:6px;
}
.sp-btns button:hover{transform:scale(.97);background:rgba(40,40,40,.8)}
.sp-btns button.pri{background:#fafafa;color:#0a0a0a;border-color:transparent}
.sp-btns button.pri:hover{background:#e5e5e5}
#sp-status{
  padding:10px 14px;border-radius:10px;background:rgba(0,0,0,.3);color:#a1a1aa;
  font-size:12px;white-space:pre-wrap;border:1px solid rgba(255,255,255,.03);
}
#sp-stats{font-size:11px;color:#71717a;text-align:center}
#sp-list{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.sp-item{
  border:1px solid var(--uc-border);border-radius:1.2rem;
  background:rgba(5,5,5,.4);overflow:hidden;
  animation:uc-up .3s var(--uc-pop) forwards;opacity:0;
}
.sp-item.sent{border-color:var(--uc-border2);background:rgba(20,20,20,.6)}
.sp-item-hd{
  display:flex;justify-content:space-between;gap:10px;padding:12px 16px;
  background:rgba(255,255,255,.02);align-items:center;border-bottom:1px solid rgba(255,255,255,.03);
}
.sp-item-meta{font-size:10px;color:#a1a1aa;margin-top:2px;text-transform:uppercase;letter-spacing:.04em}
.sp-item-acts{display:flex;gap:6px}
.sp-item-acts button{
  border:1px solid var(--uc-border2);background:rgba(255,255,255,.05);
  color:#d1d5db;border-radius:9999px;padding:5px 12px;cursor:pointer;font-size:11px;
  font-weight:500;transition:all 200ms;
}
.sp-item-acts button:hover{background:#fafafa;color:#000;transform:scale(.95)}
.sp-item pre{
  margin:0;padding:12px 16px;max-height:140px;overflow:auto;white-space:pre-wrap;
  word-break:break-all;color:#d1d5db;font:12px ui-monospace,Menlo,monospace;
}
.sp-item pre::-webkit-scrollbar{width:3px}
.sp-item pre::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
.sp-empty{text-align:center;color:#71717a;padding:30px 16px;border:1px dashed var(--uc-border2);border-radius:.8rem;font-size:13px}
  `);

  /* ═══════════════════════════════════════════════════════════
     §4  Reset Module
     ═══════════════════════════════════════════════════════════ */
  let resetSession = null;
  let initResetDOM = null;

  if (RESET_ON) {
    const REDIRECT = `${location.origin}/text/side-by-side`;
    const KNOWN_COOKIES = [
      'cf_clearance', '__cf_bm', '_cfuvid', '__cflb',
      'arena-auth-prod-v1',
      '_ga', '_ga_L5C4D55WJJ', '_ga_DB32ZN1WHB', '_gid',
      'ph_phc_LG7IJbVJqBsk584rbcKca0D5lV2vHguiijDrVji7yDM_posthog',
      'user_country_code', 'sidebar_state',
    ];

    let rsFloat = null;
    let rsInner = null;
    let resetBtn = null;
    let resetting = false;

    initResetDOM = ({ button, float, inner }) => {
      resetBtn = button;
      rsFloat = float;
      rsInner = inner;
    };

    function addLog(text, cls = 'ok') {
      const inner = rsInner;
      const outer = rsFloat;
      if (!inner || !outer) return;
      const d = document.createElement('div');
      d.className = 'e ' + cls;
      d.textContent = `${new Date().toLocaleTimeString()} ${text}`;
      inner.append(d);
      requestAnimationFrame(() => {
        inner.scrollTop = inner.scrollHeight;
      });
      outer.classList.add('vis');
    }

    function hideLog(ms = 3500) {
      const outer = rsFloat;
      setTimeout(() => outer?.classList.remove('vis'), ms);
    }

    function setBtnState(label, disabled, bg) {
      const btn = resetBtn;
      if (!btn) return;
      btn.textContent = label;
      btn.disabled = disabled;
      if (bg) btn.style.background = bg;
    }

    function clearAllCookies() {
      const visible = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean);
      const all = [...new Set([...visible, ...KNOWN_COOKIES])];
      all.forEach(nukeCookie);
      addLog(`Attempted cookie clear for ${all.length} keys (${visible.length} visible; HttpOnly cookies cannot be cleared by JS)`, 'ok');
      return visible.length;
    }

    function clearStorage() {
      let n = 0;
      try {
        n += localStorage.length;
        localStorage.clear();
      } catch (_) {}
      try {
        n += sessionStorage.length;
        sessionStorage.clear();
      } catch (_) {}
      addLog(`Cleared storage (${n} entries)`, 'ok');
    }

    async function clearIDB() {
      if (typeof indexedDB?.databases !== 'function') return;
      try {
        const names = (await indexedDB.databases()).map(d => d?.name).filter(Boolean);
        let deleted = 0;
        let blocked = 0;
        let failed = 0;

        await Promise.all(names.map(name => new Promise(ok => {
          const r = indexedDB.deleteDatabase(name);
          r.onsuccess = () => {
            deleted++;
            ok();
          };
          r.onblocked = () => {
            blocked++;
            ok();
          };
          r.onerror = () => {
            failed++;
            ok();
          };
        })));

        addLog(
          `IndexedDB: deleted ${deleted}${blocked ? `, blocked ${blocked}` : ''}${failed ? `, failed ${failed}` : ''}`,
          blocked || failed ? 'w' : 'ok'
        );
      } catch (_) {
        addLog('IndexedDB clear failed', 'er');
      }
    }

    async function clearCaches() {
      if (!('caches' in self)) return;
      try {
        const k = await caches.keys();
        await Promise.all(k.map(c => caches.delete(c)));
        addLog(`Deleted ${k.length} caches`, 'ok');
      } catch (_) {
        addLog('Cache clear failed', 'er');
      }
    }

    async function unregSW() {
      if (!('serviceWorker' in navigator)) return;
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        if (regs.length) addLog(`Unregistered ${regs.length} SWs`, 'ok');
      } catch (_) {}
    }

    function resetCaptchas() {
      try {
        window.turnstile?.reset?.();
      } catch (_) {}
      try {
        window.grecaptcha?.enterprise?.reset?.();
      } catch (_) {}
      $$('iframe').forEach(f => {
        if (/cloudflare|turnstile|recaptcha|cdn-cgi/.test(f.src || '')) f.remove();
      });
      addLog('Captcha state reset', 'sc');
    }

    function clearTrackers() {
      ['__cfBeacon', '__cfRay', 'posthog'].forEach(key => {
        if (window[key] === undefined) return;
        try {
          window[key]?.reset?.();
        } catch (_) {}
        try {
          delete window[key];
        } catch (_) {
          try {
            window[key] = undefined;
          } catch (__) {}
        }
      });

      try {
        const rm = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && /posthog|ph_/i.test(k)) rm.push(k);
        }
        rm.forEach(k => localStorage.removeItem(k));
      } catch (_) {}
    }

    resetSession = async function () {
      if (resetting) return;
      resetting = true;

      if (rsInner) rsInner.innerHTML = '';
      addLog('Starting best-effort session reset…', 'ok');

      setBtnState('🔍 Scanning…', true, 'rgba(33,150,243,.7)');
      await sleep(200);

      setBtnState('⏳ Clearing…', true, 'rgba(255,152,0,.7)');
      resetCaptchas();
      clearTrackers();
      clearStorage();
      clearAllCookies();
      await Promise.allSettled([clearIDB(), clearCaches(), unregSW()]);

      const left = document.cookie.split(';').filter(c => c.trim()).length;
      if (left > 0) {
        clearAllCookies();
        addLog(`Second pass (${left} remaining)`, 'w');
      }

      setBtnState('✅ Done!', true, 'rgba(76,175,80,.7)');
      addLog('Best-effort session reset complete!', 'ok');

      if (IS_ARENA) {
        addLog(`Redirecting → ${REDIRECT}`, 'ok');
        setTimeout(() => {
          location.href = REDIRECT;
        }, 700);
      } else {
        addLog('Reloading…', 'ok');
        setTimeout(() => location.reload(), 800);
      }

      hideLog(4000);
    };

    if (IS_ARENA) {
      onReady(() => {
        const tryAccept = () => {
          for (const xpath of [
            '//div[@role="dialog"]//button[contains(.,"Accept")]',
            '//div[@role="dialog"]//button[contains(.,"Agree")]',
            '//div[@role="dialog"]//button[contains(.,"OK")]',
          ]) {
            try {
              const n = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (n?.offsetParent !== null) {
                n.click();
                return;
              }
            } catch (_) {}
          }
          const d = $('button[aria-label="Dismiss banner"]');
          if (d?.offsetParent !== null) d.click();
        };

        tryAccept();
        const iv = setInterval(tryAccept, 600);
        setTimeout(() => clearInterval(iv), 25000);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     §5  Splitter Module
     ═══════════════════════════════════════════════════════════ */
  let initSplitterDOM = null;

  if (SPLITTER_ON) {
    const CHUNK = 120000;
    const POLL = 500;
    const DEBOUNCE = 350;
    const WAIT_READY_TIMEOUT = 45000;
    const AUTO_SEND_HOSTS = new Set([
      'chat.openai.com',
      'chatgpt.com',
      'claude.ai',
      'gemini.google.com',
      'chat.deepseek.com',
      'chat.kimi.ai',
      'kimi.ai',
      'chat.mistral.ai',
      'copilot.microsoft.com',
      'grok.com',
      'perplexity.ai',
    ]);
    const AUTO_SEND_SAFE = AUTO_SEND_HOSTS.has(HOST);

    const WAIT_PRE = `Here is the data I want to provide (Part {{C}} of {{T}}), please read and remember it fully, do not reply or analyze yet. Once I say "OK", output the content according to my instructions.\n\n---\n\n`;
    const WAIT_SUF = `\n\n---\n\nThis is part {{C}} of {{T}} data, please remember this first, do not output anything. Start replying once I say "OK".`;
    const tpl = (s, c, t) => s.replace(/\{\{C\}\}/g, c).replace(/\{\{T\}\}/g, t);

    const st = { chunks: [], finals: [], sent: [], sending: false, abort: false };
    let autoTimer = 0;
    const ui = {};

    const SEND_W = ['send', 'submit', '發送', '发送', '送出'];
    const STOP_W = ['stop', '停止', 'stop generating'];
    const hasW = (t, ws) => ws.some(w => t.includes(w));
    const textOf = el => [el?.textContent, el?.getAttribute?.('aria-label'), el?.getAttribute?.('title'), el?.id, el?.className].join(' ').toLowerCase();

    function pick(sels, test = () => true) {
      for (const s of sels) {
        for (const el of $$(s)) {
          if (!inFab(el) && isVis(el) && test(el)) return el;
        }
      }
      return null;
    }

    function findInput() {
      return pick(
        ['textarea', '[contenteditable="true"]', 'div[role="textbox"]', 'input[type="text"]'],
        el => el.id !== 'sp-text'
      );
    }

    function findStop() {
      return pick(['button[aria-label*="Stop"]', 'button[aria-label*="stop"]', 'button[data-testid*="stop"]']) ||
        $$('button').find(b => !inFab(b) && isVis(b) && hasW(textOf(b), STOP_W)) ||
        null;
    }

    function findSend() {
      const d = pick(
        ['button[aria-label*="Send"]', 'button[aria-label*="send"]', 'button[data-testid*="send"]', 'button[type="submit"]'],
        b => !b.disabled
      );
      if (d) return d;

      const inp = findInput();
      const cs = $$('button').filter(
        b => !inFab(b) && isVis(b) && !b.disabled && (hasW(textOf(b), SEND_W) || b.type === 'submit')
      );
      if (!cs.length) return null;
      if (!inp) return cs[0];

      const dist = b => {
        const br = b.getBoundingClientRect();
        const ir = inp.getBoundingClientRect();
        return Math.abs(br.left - ir.right) + Math.abs(br.top - ir.top);
      };
      return cs.sort((a, b) => dist(a) - dist(b))[0];
    }

    function readInp(el) {
      return el ? ('value' in el ? el.value : el.textContent || '') : '';
    }

    function fireInput(el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setInp(el, text) {
      if (!el) return false;
      el.focus();

      if ('value' in el) {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        set ? set.call(el, text) : (el.value = text);
      } else {
        try {
          document.execCommand('selectAll');
          document.execCommand('insertText', false, text) || (el.textContent = text);
        } catch (_) {
          el.textContent = text;
        }
      }

      fireInput(el);
      return true;
    }

    function pressEnter(el) {
      if (!el) return;
      for (const t of ['keydown', 'keypress', 'keyup']) {
        el.dispatchEvent(new KeyboardEvent(t, {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
        }));
      }
    }

    function needWrap(i) {
      return ui.wait?.checked && (ui.mode?.value === 'all' || i === 0);
    }

    function pre(i, t) {
      return tpl(WAIT_PRE, i + 1, t);
    }

    function suf(i, t) {
      return tpl(WAIT_SUF, i + 1, t);
    }

    function maxContent(i, t) {
      return needWrap(i) ? Math.max(1000, CHUNK - pre(i, t).length - suf(i, t).length) : CHUNK;
    }

    function buildChunks(text, total) {
      const lines = text.split('\n').map((l, i) => i ? '\n' + l : l);
      const chunks = [];
      let cur = '';

      for (const piece of lines) {
        let p = piece;
        while (p.length) {
          const lim = maxContent(chunks.length, total);
          if (!cur) {
            if (p.length <= lim) {
              cur = p;
              p = '';
            } else {
              chunks.push(p.slice(0, lim));
              p = p.slice(lim);
            }
            continue;
          }
          if (cur.length + p.length <= lim) {
            cur += p;
            p = '';
          } else {
            chunks.push(cur);
            cur = '';
          }
        }
      }

      if (cur) chunks.push(cur);
      return chunks;
    }

    function doSplit(raw) {
      const text = (raw || '').replace(/\r\n?/g, '\n').trim();
      if (!text) {
        st.chunks = [];
        st.finals = [];
        st.sent = [];
        render();
        return;
      }

      let t = 1;
      let c;
      while (true) {
        c = buildChunks(text, t);
        if (c.length === t) break;
        t = c.length;
      }

      st.chunks = c;
      st.finals = c.map((ch, i) => needWrap(i) ? pre(i, t) + ch + suf(i, t) : ch);
      st.sent = Array(st.finals.length).fill(false);
      render();
    }

    function autoSplit(showStatus = true) {
      clearTimeout(autoTimer);
      if (st.sending) return;

      if (!ui.text?.value.trim()) {
        st.chunks = [];
        st.finals = [];
        st.sent = [];
        render();
        if (showStatus) setStatus('Standby');
        return;
      }

      doSplit(ui.text.value);
      if (showStatus) setStatus(`✂️ Split into ${st.finals.length} parts`);
    }

    function schedSplit() {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => autoSplit(true), DEBOUNCE);
    }

    function render() {
      if (!ui.list) return;

      const raw = (ui.text?.value || '').replace(/\r\n?/g, '\n').trim();
      const mx = st.finals.reduce((m, s) => Math.max(m, s.length), 0);

      ui.stats.textContent = st.finals.length
        ? `${raw.length.toLocaleString()} chars → ${st.finals.length} parts (max ${mx.toLocaleString()}/${CHUNK.toLocaleString()})`
        : '';

      if (!st.finals.length) {
        ui.list.innerHTML = '<div class="sp-empty">Paste text to split</div>';
        return;
      }

      ui.list.innerHTML = st.finals.map((ch, i) => {
        const r = st.chunks[i];
        const wrap = ch.length - r.length;
        const prev = ch.slice(0, 280) + (ch.length > 280 ? '\n…' : '');
        return `<div class="sp-item${st.sent[i] ? ' sent' : ''}" data-i="${i}">
          <div class="sp-item-hd"><div>
            <div>📦 Part ${i + 1} ${needWrap(i) ? '⏳' : ''} ${st.sent[i] ? '✅' : ''}</div>
            <div class="sp-item-meta">${ch.length.toLocaleString()} chars${needWrap(i) ? ` · content ${r.length.toLocaleString()} + prompt ${wrap.toLocaleString()}` : ''}</div>
          </div><div class="sp-item-acts">
            <button data-act="copy">Copy</button><button data-act="paste">Paste</button>
          </div></div>
          <pre>${escHtml(prev)}</pre></div>`;
      }).join('');
    }

    function setStatus(msg) {
      if (ui.status) ui.status.textContent = msg;
    }

    function setBusy(b) {
      [ui.text, ui.wait, ui.mode, ui.finalOk, ui.gap].forEach(e => {
        if (e) e.disabled = b;
      });
    }

    function canSendNow() {
      const inp = findInput();
      if (!inp || inp.disabled || inp.readOnly) return false;
      if (findStop()) return false;
      const sb = findSend();
      return sb ? !sb.disabled : true;
    }

    async function waitReady(i, total, timeout = WAIT_READY_TIMEOUT) {
      const t0 = Date.now();
      while (!st.abort && Date.now() - t0 < timeout) {
        if (canSendNow()) return true;
        setStatus(`⏳ Part ${i + 1}/${total}: waiting…`);
        await sleep(POLL);
      }
      if (!st.abort) setStatus(`⚠️ Part ${i + 1}/${total}: timed out waiting for input`);
      return false;
    }

    async function confirmSent(snap, timeout = 7000) {
      const t0 = Date.now();
      while (!st.abort && Date.now() - t0 < timeout) {
        const cur = readInp(findInput());
        if (findStop() || cur === '' || (cur !== snap && cur.length < snap.length)) return true;
        const sb = findSend();
        if (sb?.disabled && snap.trim()) return true;
        await sleep(150);
      }
      return false;
    }

    async function trySend(text) {
      const inp = findInput();
      if (!inp) return false;

      setInp(inp, text);
      await sleep(250);

      const btn = findSend();
      if (btn && !btn.disabled) {
        btn.click();
        return confirmSent(text, 10000);
      }

      pressEnter(inp);
      return confirmSent(text, 10000);
    }

    async function sendOne(text, i, total) {
      for (let attempt = 1; attempt <= 2 && !st.abort; attempt++) {
        if (!(await waitReady(i, total))) return false;
        setStatus(`🚀 Sending part ${i + 1}/${total}…`);
        if (await trySend(text)) return true;
        if (attempt < 2) {
          setStatus(`⚠️ Part ${i + 1} unconfirmed, retrying once…`);
          await sleep(1000);
        }
      }
      return false;
    }

    async function autoSendAll() {
      if (!st.finals.length || st.sending) return;

      st.sending = true;
      st.abort = false;
      ui.send.disabled = true;
      setBusy(true);

      const gap = Math.max(1, parseInt(ui.gap.value, 10) || 3) * 1000;
      let ok = true;

      for (let i = 0; i < st.finals.length; i++) {
        if (st.abort) {
          ok = false;
          break;
        }

        if (!(await sendOne(st.finals[i], i, st.finals.length))) {
          ok = false;
          break;
        }

        st.sent[i] = true;
        render();

        if (i < st.finals.length - 1 && !st.abort) {
          const end = Date.now() + gap;
          while (!st.abort && Date.now() < end) {
            setStatus(`✅ Part ${i + 1} sent, wait ${Math.ceil((end - Date.now()) / 1000)}s…`);
            await sleep(200);
          }
        }
      }

      if (ok && !st.abort && ui.finalOk.checked) {
        setStatus('Sending final "OK"…');
        if (!(await sendOne('OK', st.finals.length, st.finals.length + 1))) ok = false;
      }

      setStatus(st.abort ? '⏹ Stopped' : ok ? '✅ All sent!' : '⚠️ Incomplete');
      st.sending = false;
      ui.send.disabled = false;
      setBusy(false);
    }

    initSplitterDOM = function () {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="sp-panel-outer">
          <div id="sp-inner">
            <div id="sp-head"><span>✂️ Splitter</span><button id="sp-close">✕</button></div>
            <div id="sp-body">
              <textarea id="sp-text" placeholder="Paste large text here — auto-splits on input"></textarea>
              <div class="sp-row">
                <label><input type="checkbox" id="sp-wait" checked> "Wait for OK" prompt</label>
                <select id="sp-mode"><option value="first-only">First Only</option><option value="all">All Parts</option></select>
              </div>
              <div class="sp-row"><label><input type="checkbox" id="sp-ok"> Auto-send "OK" after all</label></div>
              <div class="sp-row"><label>Gap <input type="number" id="sp-gap" value="3" min="1" max="60" style="width:56px"> sec</label></div>
              <div class="sp-btns">
                <button id="sp-send" class="pri">🚀 Send</button>
                <button id="sp-copy">📋 Copy</button>
                <button id="sp-clear">🗑️ Clear</button>
              </div>
              <div id="sp-status">Standby</div>
              <div id="sp-stats"></div>
              <div id="sp-list"></div>
            </div>
          </div>
        </div>`);

      ui.panel = $('#sp-panel-outer');
      ui.text = $('#sp-text');
      ui.wait = $('#sp-wait');
      ui.mode = $('#sp-mode');
      ui.finalOk = $('#sp-ok');
      ui.gap = $('#sp-gap');
      ui.send = $('#sp-send');
      ui.copy = $('#sp-copy');
      ui.clear = $('#sp-clear');
      ui.status = $('#sp-status');
      ui.stats = $('#sp-stats');
      ui.list = $('#sp-list');

      if (!AUTO_SEND_SAFE) {
        ui.send.disabled = true;
        ui.send.title = `Auto-send disabled on ${HOST}`;
        setStatus(`Manual mode only on ${HOST}`);
      }

      $('#sp-close').addEventListener('click', () => ui.panel.classList.remove('open'));
      ui.text.addEventListener('input', schedSplit);
      ui.wait.addEventListener('change', () => {
        if (!st.sending) autoSplit();
      });
      ui.mode.addEventListener('change', () => {
        if (!st.sending) autoSplit();
      });

      ui.copy.addEventListener('click', () => {
        if (!ui.text.value) {
          setStatus('Nothing to copy');
          return;
        }
        clip(ui.text.value);
        setStatus('📋 Copied textarea content');
      });

      ui.clear.addEventListener('click', () => {
        if (st.sending) st.abort = true;
        clearTimeout(autoTimer);
        ui.text.value = '';
        st.chunks = [];
        st.finals = [];
        st.sent = [];
        render();
        setStatus('Cleared');
      });

      ui.send.addEventListener('click', async () => {
        if (!AUTO_SEND_SAFE) {
          setStatus(`Manual mode only on ${HOST}`);
          return;
        }
        if (!st.finals.length && ui.text.value.trim()) autoSplit(false);
        if (!st.finals.length) {
          setStatus('Paste text first');
          return;
        }
        if (!st.sending) await autoSendAll();
      });

      ui.list.addEventListener('click', e => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;

        const i = Number(btn.closest('.sp-item')?.dataset.i);
        if (Number.isNaN(i)) return;

        if (btn.dataset.act === 'copy') {
          clip(st.finals[i]);
          setStatus(`Copied part ${i + 1}`);
        }
        if (btn.dataset.act === 'paste') {
          const inp = findInput();
          if (inp) {
            setInp(inp, st.finals[i]);
            inp.focus();
            setStatus(`Pasted part ${i + 1}`);
          } else {
            clip(st.finals[i]);
            setStatus('No input found — copied instead');
          }
        }
      });

      render();

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && st.sending) {
          st.abort = true;
          setStatus('⏹ Stopped');
        }
      }, { capture: true });
    };
  }

  /* ═══════════════════════════════════════════════════════════
     §6  Keyboard Shortcuts
     ═══════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's' && SPLITTER_ON) {
      e.preventDefault();
      $('#sp-panel-outer')?.classList.toggle('open');
    }
  }, { capture: true });

  /* ═══════════════════════════════════════════════════════════
     §7  Boot — build FAB dock & panels
     ═══════════════════════════════════════════════════════════ */
  onReady(() => {
    const dock = document.createElement('div');
    dock.id = 'uc-fab-dock';
    document.body.append(dock);

    if (RESET_ON) {
      const rb = document.createElement('button');
      rb.className = 'uc-fab';
      rb.textContent = '🗑️ Reset';
      rb.title = 'Clear session & cookies';
      rb.addEventListener('click', () => resetSession?.());
      dock.append(rb);

      const fl = document.createElement('div');
      fl.id = 'rs-float';
      fl.innerHTML = '<div id="rs-float-inner"></div>';
      document.body.append(fl);

      initResetDOM?.({
        button: rb,
        float: fl,
        inner: fl.querySelector('#rs-float-inner'),
      });
    }

    if (SPLITTER_ON) {
      const sb = document.createElement('button');
      sb.className = 'uc-fab';
      sb.textContent = '✂️ Split';
      sb.title = 'Text Splitter (Ctrl+Shift+S)';
      sb.addEventListener('click', () => $('#sp-panel-outer')?.classList.toggle('open'));
      dock.append(sb);

      initSplitterDOM?.();
    }
  });
})();