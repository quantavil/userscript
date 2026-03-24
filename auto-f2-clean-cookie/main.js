    // ==UserScript==
    // @name         Auto F2 CleanCookie — AI FREE! Claude Opus 4.6 | Beginner Friendly | 2-Min Setup
    // @namespace    https://greasyfork.org/
    // @version      7.7.8
    // @description  Add super convenient F2 one-click reset to Arena.ai (LMArena), auto-accept cookies. Designed for beginners! Get started with top-tier AI in just 2 minutes. Super easy, loved by beginners globally! Supports: Claude Opus 4.6, Gemini, Grok, GPT, etc.
    //
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
    // @match        https://bard.google.com/*
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
    // @match        https://chatglm.cn/*
    // @match        https://chatgpt.com/*
    // @match        https://claude.ai/*
    // @match        https://console.aws.amazon.com/*
    // @match        https://copilot.github.com/*
    // @match        https://copilot.microsoft.com/*
    // @match        https://coze.com/*
    // @match        https://cursor.com/*
    // @match        https://developer.amazon.com/alexa/*
    // @match        https://ernie.baidu.com/*
    // @match        https://gemini.google.com/*
    // @match        https://github.com/copilot/*
    // @match        https://github.com/features/copilot/*
    // @match        https://github.com/oobabooga/*
    // @match        https://grok.com/*
    // @match        https://hailuoai.com/*
    // @match        https://huggingface.co/*
    // @match        https://hunyuan.tencent.com/*
    // @match        https://hunyuan.tencent.com/bot/*
    // @match        https://jan.ai/*
    // @match        https://kimi.ai/*
    // @match        https://kimi.moonshot.ai/*
    // @match        https://kimi.moonshot.cn/*
    // @match        https://labs.openai.com/*
    // @match        https://lechat.mistral.ai/*
    // @match        https://lmarena.ai/*
    // @match        https://lmstudio.ai/*
    // @match        https://meta.ai/*
    // @match        https://microsoft.com/ai/*
    // @match        https://minimax.com/*
    // @match        https://mistral.ai/*
    // @match        https://moonshot.cn/*
    // @match        https://ollama.com/*
    // @match        https://open.bigmodel.cn/*
    // @match        https://openai.com/*
    // @match        https://perplexity.ai/*
    // @match        https://pi.ai/*
    // @match        https://platform.openai.com/*
    // @match        https://playground.openai.com/*
    // @match        https://poe.com/*
    // @match        https://qianwen.aliyun.com/*
    // @match        https://qwen.alibaba.com/*
    // @match        https://replit.com/*
    // @match        https://sillytavern.app/*
    // @match        https://step.ai/*
    // @match        https://step.fun/*
    // @match        https://stepfun.ai/*
    // @match        https://teams.microsoft.com/*
    // @match        https://tongyi.aliyun.com/*
    // @match        https://tongyi.aliyun.com/qwen/*
    // @match        https://wenku.baidu.com/*
    // @match        https://wenxin.baidu.com/*
    // @match        https://www.01.ai/*
    // @match        https://www.coze.cn/*
    // @match        https://www.deepseek.com/*
    // @match        https://www.doubao.com/*
    // @match        https://www.lingyiwanwu.com/*
    // @match        https://yiyan.baidu.com/*
    // @match        https://yiyan.baidu.com/welcome/*
    // @match        https://you.com/*
    // @match        https://yuanbao.tencent.com/*
    // @match        https://zhipuai.cn/*
    //
    // @run-at       document-start
    // @grant        GM_getValue
    // @grant        GM_setValue
    // @grant        GM_deleteValue
    // @grant        GM_registerMenuCommand
    // @grant        GM_addStyle
    // ==/UserScript==


(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  //  §0  Module Toggle System
  // ═══════════════════════════════════════════════════════════════
  const MODULE_KEYS = {
    reset:   'module_session_reset',
    splitter:'module_text_splitter',
  };

  const MODULE_LABELS = {
    reset:   '🗑️ Session Reset (F2)',
    splitter:'✂️ Auto Splitter Lite',
  };

  function isModuleEnabled(key) {
    return GM_getValue(MODULE_KEYS[key], true);
  }

  function toggleModule(key) {
    const current = isModuleEnabled(key);
    GM_setValue(MODULE_KEYS[key], !current);
    const state = !current ? '✅ Enabled' : '❌ Disabled';
    if (typeof alert !== 'undefined') {
      alert(`${MODULE_LABELS[key]}\n${state}\n\nPlease refresh the page to apply changes.`);
    }
  }

  // Register toggle in Tampermonkey / Greasemonkey menu
  for (const key of Object.keys(MODULE_KEYS)) {
    const enabled = isModuleEnabled(key);
    const prefix = enabled ? '✅' : '❌';
    GM_registerMenuCommand(
      `${prefix} ${MODULE_LABELS[key]}`,
      () => toggleModule(key),
      key.charAt(0)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  §1  Session Reset Module
  // ═══════════════════════════════════════════════════════════════
  if (isModuleEnabled('reset')) {
    (function initSessionReset() {

      const CONFIG = {
        BTN_ID: 'lm-rst',
        REDIRECT_URL: 'https://arena.ai/text/side-by-side',
        WHITELIST: ['lmarena.ai', 'arena.ai'],
        RECAPTCHA_SITEKEY: '6Led_uYrAAAAAKjxDIF58fgFtX3t8loNAK85bW9I',
        TURNSTILE_SITEKEY: '0x4AAAAAAA65vWDmG-O_lPtT',
        CF_PATTERNS: [
          'challenges.cloudflare.com',
          'static.cloudflareinsights.com',
          'cdn-cgi/challenge-platform',
          'turnstile/v0/api.js',
        ],
        RECAPTCHA_PATTERNS: [
          'google.com/recaptcha',
          'gstatic.com/recaptcha',
          'recaptcha/enterprise',
        ],
        SECURITY_COOKIE_PATTERNS: [
          'cf_clearance', '__cf_bm', '_cf_', 'cf-',
          '__cflb', '__cfuid', 'cf_ob_info', 'cf_use_ob',
          '_ga', '_gid', '_gat',
          'ph_',
          'arena-auth',
        ],
        POPUP_CHECK_INTERVAL: 500,
        POPUP_TIMEOUT: 30000,
        DEBUG: true,
      };

      const host = location.hostname.replace(/^www\./, '');
      const isHome = CONFIG.WHITELIST.some(d => host === d || host.endsWith('.' + d));

      const log = {
        _prefix: '[ArenaReset]',
        _styles: {
          info:     'color: #2196F3; font-weight: bold;',
          success:  'color: #4CAF50; font-weight: bold;',
          warn:     'color: #FF9800; font-weight: bold;',
          error:    'color: #F44336; font-weight: bold;',
          security: 'color: #E91E63; font-weight: bold;',
        },
        info:     (...a) => CONFIG.DEBUG && console.log(`%c${log._prefix} ℹ️`, log._styles.info, ...a),
        success:  (...a) => CONFIG.DEBUG && console.log(`%c${log._prefix} ✅`, log._styles.success, ...a),
        warn:     (...a) => CONFIG.DEBUG && console.warn(`%c${log._prefix} ⚠️`, log._styles.warn, ...a),
        error:    (...a) => console.error(`%c${log._prefix} ❌`, log._styles.error, ...a),
        security: (...a) => CONFIG.DEBUG && console.log(`%c${log._prefix} 🛡️`, log._styles.security, ...a),
      };

      const S = Object.freeze({
        IDLE:      { t: '🗑️ (F2) <<<<<<<🐥💙',  d: false, c: '#E48900' },
        SCANNING:  { t: '🔍 Scanning...',      d: true,  c: '#2196F3' },
        WORKING:   { t: '⏳ Clearing...',         d: true,  c: '#FF9800' },
        BYPASSING: { t: '🛡️ Bypassing...',      d: true,  c: '#9C27B0' },
        SUCCESS:   { t: '✅ Cleared! Redirecting...', d: true,  c: '#4CAF50' },
        FAILURE:   { t: '❌ Failed. Press F2 to retry.',    d: false, c: '#F44336' },
      });

      // Anti-fingerprinting
      try {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false, configurable: true,
        });
        log.info('navigator.webdriver set to false');
      } catch (e) {
        log.warn('Failed to override navigator.webdriver:', e.message);
      }

      // Network Request Monitoring
      const securityRequestLog = [];
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const isSecurityReq =
          CONFIG.CF_PATTERNS.some(p => url.includes(p)) ||
          CONFIG.RECAPTCHA_PATTERNS.some(p => url.includes(p)) ||
          url.includes('siteverify') || url.includes('challenge');

        if (isSecurityReq) {
          const entry = {
            time: new Date().toISOString(),
            type: 'fetch',
            url: url.substring(0, 200),
            method: args[1]?.method || 'GET',
          };
          securityRequestLog.push(entry);
          log.security('Intercepted FETCH:', entry.method, url.substring(0, 120));
        }

        try {
          const response = await originalFetch.apply(this, args);
          if (isSecurityReq) {
            const clone = response.clone();
            try {
              const text = await clone.text();
              log.security('FETCH Response:', response.status, text.substring(0, 200));
            } catch (_) {}
          }
          return response;
        } catch (err) {
          if (isSecurityReq) log.error('FETCH Failed:', url.substring(0, 80), err.message);
          throw err;
        }
      };

      // Styles
      function injectResetStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
          #${CONFIG.BTN_ID} {
            position: fixed; top: 10px; right: 10px; z-index: 2147483647;
            padding: 10px 18px;
            background: linear-gradient(135deg, #E48900, #ff6b00);
            color: #fff; border: none; border-radius: 10px;
            cursor: pointer;
            font: bold 13px/1.2 system-ui, -apple-system, sans-serif;
            box-shadow: 0 4px 15px rgba(228,137,0,.4);
            transition: all .2s ease;
            user-select: none;
            backdrop-filter: blur(10px);
          }
          #${CONFIG.BTN_ID}:hover:not(:disabled) {
            transform: scale(1.05) translateY(-1px);
            box-shadow: 0 6px 25px rgba(228,137,0,.6);
          }
          #${CONFIG.BTN_ID}:active:not(:disabled) { transform: scale(.97); }
          #${CONFIG.BTN_ID}:disabled { opacity: .55; cursor: wait; }
          .lm-rst-status {
            position: fixed; top: 50px; right: 10px; z-index: 2147483646;
            padding: 8px 14px;
            background: rgba(0,0,0,.85);
            color: #fff; border-radius: 8px;
            font: 11px/1.4 monospace;
            max-width: 350px; max-height: 300px;
            overflow-y: auto; pointer-events: none;
            opacity: 0; transition: opacity .3s;
            backdrop-filter: blur(10px);
          }
          .lm-rst-status.visible { opacity: 1; pointer-events: auto; }
          .lm-rst-status .entry { margin: 2px 0; }
          .lm-rst-status .entry.ok { color: #4CAF50; }
          .lm-rst-status .entry.warn { color: #FF9800; }
          .lm-rst-status .entry.err { color: #F44336; }
          .lm-rst-status .entry.sec { color: #E91E63; }
        `);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }

      let statusPanel = null;

      function createStatusPanel() {
        statusPanel = document.createElement('div');
        statusPanel.className = 'lm-rst-status';
        document.body.appendChild(statusPanel);
        return statusPanel;
      }

      function addStatus(text, type = 'ok') {
        if (!statusPanel) createStatusPanel();
        const div = document.createElement('div');
        div.className = `entry ${type}`;
        div.textContent = `${new Date().toLocaleTimeString()} ${text}`;
        statusPanel.appendChild(div);
        statusPanel.scrollTop = statusPanel.scrollHeight;
        statusPanel.classList.add('visible');
      }

      function hideStatusPanel(delay = 3000) {
        setTimeout(() => {
          if (statusPanel) statusPanel.classList.remove('visible');
        }, delay);
      }

      // Cookie Cleanup
      function clearAllCookies() {
        const hostname = location.hostname;
        const expiry = '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        const paths = ['/', '/text', '/search', '/image', '/video', '/code'];
        const domains = ['', hostname, '.' + hostname];
        const parts = hostname.split('.');
        for (let i = 1; i < parts.length; i++) {
          const parent = parts.slice(i).join('.');
          domains.push(parent, '.' + parent);
        }

        let cleared = 0;
        const cookieList = document.cookie.split(';');
        for (const pair of cookieList) {
          const name = pair.split('=', 1)[0].trim();
          if (!name) continue;
          for (const path of paths) {
            for (const domain of domains) {
              const domainStr = domain ? `;domain=${domain}` : '';
              const base = `${name}${expiry};path=${path}${domainStr}`;
              document.cookie = base;
              document.cookie = `${base};Secure`;
              document.cookie = `${base};SameSite=None;Secure`;
              document.cookie = `${base};SameSite=Lax`;
              document.cookie = `${base};SameSite=Strict`;
            }
          }
          cleared++;
        }

        const securityCookies = [
          'cf_clearance', '__cf_bm', '_cfuvid', '__cflb',
          'arena-auth-prod-v1',
          '_ga', '_ga_L5C4D55WJJ', '_ga_DB32ZN1WHB', '_gid',
          'ph_phc_LG7IJbVJqBsk584rbcKca0D5lV2vHguiijDrVji7yDM_posthog',
          'user_country_code', 'sidebar_state',
        ];
        for (const name of securityCookies) {
          for (const path of paths) {
            for (const domain of domains) {
              const domainStr = domain ? `;domain=${domain}` : '';
              document.cookie = `${name}${expiry};path=${path}${domainStr}`;
              document.cookie = `${name}${expiry};path=${path}${domainStr};Secure`;
              document.cookie = `${name}${expiry};path=${path}${domainStr};SameSite=None;Secure`;
            }
          }
        }

        log.info(`Attempted to clear ${cleared}  cookies + ${securityCookies.length}  known security cookies`);
        addStatus(`Cleared ${cleared}  cookies + ${securityCookies.length}  security cookies`, 'ok');
        return cleared;
      }

      function clearStorage() {
        let lsCount = 0, ssCount = 0;
        try { lsCount = localStorage.length; localStorage.clear(); } catch (e) { log.warn('localStorage Cleared失敗:', e.message); }
        try { ssCount = sessionStorage.length; sessionStorage.clear(); } catch (e) { log.warn('sessionStorage Cleared失敗:', e.message); }
        addStatus(`Cleared localStorage(${lsCount}) + sessionStorage(${ssCount})`, 'ok');
        return lsCount + ssCount;
      }

      async function clearIDB() {
        if (typeof indexedDB?.databases !== 'function') {
          addStatus('IndexedDB.databases() is unavailable', 'warn');
          return 0;
        }
        try {
          const dbs = await indexedDB.databases();
          await Promise.allSettled(dbs.map(db => new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = resolve;
            req.onerror = () => reject(req.error);
            req.onblocked = resolve;
          })));
          addStatus(`Cleared ${dbs.length}  IndexedDBs`, 'ok');
          return dbs.length;
        } catch (e) {
          log.error('IndexedDB Cleared異常:', e);
          addStatus('IndexedDB Cleared失敗', 'err');
          return 0;
        }
      }

      async function clearCaches() {
        if (!('caches' in self)) { addStatus('Cache API is unavailable', 'warn'); return 0; }
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
          addStatus(`Cleared ${keys.length}  Cache Storages`, 'ok');
          return keys.length;
        } catch (e) {
          addStatus('Cache Storage Cleared失敗', 'err');
          return 0;
        }
      }

      async function unregisterServiceWorkers() {
        if (!('serviceWorker' in navigator)) { addStatus('Service Worker API is unavailable', 'warn'); return 0; }
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
          addStatus(`Unregistered ${registrations.length}  Service Workers`, 'ok');
          return registrations.length;
        } catch (e) {
          addStatus('Service Worker Unregistered失敗', 'warn');
          return 0;
        }
      }

      function resetTurnstile() {
        try {
          if (window.turnstile) {
            document.querySelectorAll('[class*="turnstile"], [id*="turnstile"], [data-sitekey*="0x"]')
              .forEach(el => { try { window.turnstile.remove(el); } catch (_) {} });
            try { window.turnstile.reset(); } catch (_) {}
            addStatus('Turnstile state reset', 'sec');
            return true;
          }
        } catch (e) { log.warn('Turnstile reset error:', e.message); }
        addStatus('Turnstile not loaded or reset failed', 'warn');
        return false;
      }

      function resetRecaptcha() {
        try {
          if (window.grecaptcha?.enterprise) {
            try { window.grecaptcha.enterprise.reset(); } catch (_) {}
            try {
              if (window.___grecaptcha_cfg?.clients) {
                Object.keys(window.___grecaptcha_cfg.clients).forEach(key => {
                  delete window.___grecaptcha_cfg.clients[key];
                });
                window.___grecaptcha_cfg.count = 0;
              }
            } catch (_) {}
            addStatus('reCAPTCHA Enterprise reset', 'sec');
            return true;
          }
        } catch (e) { log.warn('reCAPTCHA reset error:', e.message); }
        addStatus('reCAPTCHA not loaded or reset failed', 'warn');
        return false;
      }

      function cleanSecurityIframes() {
        let removed = 0;
        document.querySelectorAll('iframe').forEach(iframe => {
          const src = iframe.src || '';
          if (src.includes('cloudflare') || src.includes('turnstile') ||
              src.includes('challenges') || src.includes('recaptcha') || src.includes('cdn-cgi')) {
            iframe.remove();
            removed++;
          }
        });
        if (removed > 0) addStatus(`Removed ${removed}  security iframes`, 'sec');
        return removed;
      }

      function clearCFBeaconData() {
        ['__cfBeacon', '__cfRay', '__cf_', '_cf_'].forEach(key => {
          if (window[key] !== undefined) { try { delete window[key]; } catch (_) { try { window[key] = undefined; } catch (__) {} } }
        });
        Object.keys(window).forEach(key => {
          const lk = key.toLowerCase();
          if ((lk.startsWith('cf') || lk.startsWith('__cf') || lk.startsWith('_cf')) &&
              !['chrome','confirm','close','cleartimeout','clearinterval','constructor','console','customelements']
                .some(safe => lk.startsWith(safe))) {
            try { delete window[key]; } catch (_) {}
          }
        });
        addStatus('CF Beacon 追蹤資料已Cleared', 'sec');
      }

      function clearPostHog() {
        Object.keys(window).filter(k => k.includes('posthog') || k.includes('ph_')).forEach(key => {
          try { if (window[key]?.reset) window[key].reset(); delete window[key]; } catch (_) {}
        });
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('posthog') || key.includes('ph_'))) keysToRemove.push(key);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          if (keysToRemove.length > 0) addStatus(`Cleared ${keysToRemove.length}  PostHog entries`, 'ok');
        } catch (_) {}
      }

      function autoHandleSecurityPopups() {
        const handleAttempt = () => {
          let handled = 0;
          const cookieSelectors = [
            '//div[@role="dialog"]//button[contains(.,"Accept")]',
            '//div[@role="dialog"]//button[contains(.,"Agree")]',
            '//div[@role="dialog"]//button[contains(.,"OK")]',
          ];
          for (const xpath of cookieSelectors) {
            try {
              const node = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (node && node.offsetParent !== null) { node.click(); handled++; break; }
            } catch (_) {}
          }

          const bannerBtn = document.querySelector('button[aria-label="Dismiss banner"]');
          if (bannerBtn && bannerBtn.offsetParent !== null) { bannerBtn.click(); handled++; }

          document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="overlay"], [class*="popup"]').forEach(dialog => {
            const text = dialog.textContent || '';
            if (text.includes('Security Verification') || text.includes('security check') || text.includes('Protected by reCAPTCHA')) {
              log.security('Security popup detected');
              addStatus('Security popup detected', 'sec');
              const recapInDialog = dialog.querySelector('.grecaptcha-badge, [data-sitekey]');
              if (recapInDialog && window.grecaptcha?.enterprise?.execute) {
                try {
                  window.grecaptcha.enterprise.execute(CONFIG.RECAPTCHA_SITEKEY, { action: 'submit' })
                    .then(token => { addStatus('reCAPTCHA token acquired', 'sec'); })
                    .catch(() => { addStatus('reCAPTCHA execute failed', 'err'); });
                } catch (e) {}
              }
              const turnstileInDialog = dialog.querySelector('[class*="turnstile"]');
              if (turnstileInDialog && window.turnstile?.execute) {
                try { window.turnstile.execute(turnstileInDialog); } catch (e) {}
              }
              handled++;
            }
          });
          return handled;
        };

        handleAttempt();
        let attempts = 0;
        const maxAttempts = CONFIG.POPUP_TIMEOUT / CONFIG.POPUP_CHECK_INTERVAL;
        const interval = setInterval(() => {
          attempts++;
          if (handleAttempt() > 0 || attempts >= maxAttempts) clearInterval(interval);
        }, CONFIG.POPUP_CHECK_INTERVAL);

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== 1) continue;
              const html = node.outerHTML || '';
              if (html.includes('Security Verification') || html.includes('captcha') ||
                  (node.tagName === 'IFRAME' && ((node.src || '').includes('turnstile') ||
                   (node.src || '').includes('recaptcha') || (node.src || '').includes('cloudflare')))) {
                setTimeout(handleAttempt, 200);
              }
            }
          }
        });

        const startObserver = () => {
          if (document.body) observer.observe(document.body, { childList: true, subtree: true });
        };
        if (document.body) startObserver();
        else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
        setTimeout(() => { observer.disconnect(); clearInterval(interval); }, CONFIG.POPUP_TIMEOUT);
      }

      function interceptTurnstileCallback() {
        const originalCallback = window.onloadTurnstileCallback;
        window.onloadTurnstileCallback = function (...args) {
          log.security('Turnstile onload callback triggered!');
          addStatus('Turnstile API loaded', 'sec');
          if (typeof originalCallback === 'function') return originalCallback.apply(this, args);
        };
      }
      interceptTurnstileCallback();

      function scanProtectionStatus() {
        return {
          turnstile: {
            loaded: !!window.turnstile,
            widgetCount: document.querySelectorAll('[class*="turnstile"]').length,
          },
          recaptcha: {
            loaded: !!window.grecaptcha,
            isEnterprise: !!window.grecaptcha?.enterprise,
          },
          cloudflare: {
            cfClearance: document.cookie.includes('cf_clearance'),
            cfBm: document.cookie.includes('__cf_bm'),
          },
          networkLog: securityRequestLog.slice(-10),
        };
      }

      let resetting = false;
      let btn = null;

      function applyState(state) {
        if (!btn) return;
        btn.textContent = state.t;
        btn.disabled = state.d;
        btn.style.background = `linear-gradient(135deg, ${state.c}, ${state.c}dd)`;
      }

      function sleepReset(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

      async function resetSession() {
        if (resetting) return;
        resetting = true;
        if (statusPanel) statusPanel.innerHTML = '';
        log.info('═══ Session Reset Started ═══');
        addStatus('Starting session reset...', 'ok');

        applyState(S.SCANNING);
        const protectionStatus = scanProtectionStatus();
        addStatus(`Found: Turnstile=${protectionStatus.turnstile.loaded}, reCAPTCHA=${protectionStatus.recaptcha.loaded}`, 'sec');
        await sleepReset(300);

        applyState(S.WORKING);
        try {
          addStatus('── Cleared安全驗證狀態 ──', 'sec');
          resetTurnstile();
          resetRecaptcha();
          cleanSecurityIframes();
          clearCFBeaconData();
          clearPostHog();
          await sleepReset(200);

          addStatus('── Cleared儲存資料 ──', 'ok');
          clearStorage();
          addStatus('── Cleared Cookies ──', 'ok');
          clearAllCookies();

          addStatus('── Cleared IndexedDB 和 Cache ──', 'ok');
          await Promise.allSettled([clearIDB(), clearCaches(), unregisterServiceWorkers()]);
          await sleepReset(200);

          applyState(S.BYPASSING);
          const remainingCookies = document.cookie.split(';').filter(c => c.trim()).length;
          addStatus(`Cleared後剩餘 ${remainingCookies} cookies`, remainingCookies > 0 ? 'warn' : 'ok');
          if (remainingCookies > 0) {
            clearAllCookies();
            const finalCookies = document.cookie.split(';').filter(c => c.trim()).length;
            addStatus(`二次Cleared後剩餘 ${finalCookies} cookies`, finalCookies > 0 ? 'warn' : 'ok');
          }

          applyState(S.SUCCESS);
          addStatus('Session reset total success!', 'ok');
          log.success('═══ Session Reset Complete ═══');

          if (isHome) {
            addStatus(`Redirecting to: ${CONFIG.REDIRECT_URL}`, 'ok');
            setTimeout(() => { location.href = CONFIG.REDIRECT_URL; }, 800);
          } else {
            addStatus('Refreshing page soon...', 'ok');
            setTimeout(() => { location.reload(); }, 1000);
          }
          hideStatusPanel(5000);
        } catch (e) {
          log.error('Session reset exception:', e);
          applyState(S.FAILURE);
          addStatus(`Error: ${e.message}`, 'err');
          resetting = false;
        }
      }

      // Shortcuts
      document.addEventListener('keydown', (e) => {
        if ((e.key === 'F2' || e.keyCode === 113) && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          e.preventDefault(); e.stopPropagation(); resetSession();
        }
        if ((e.key === 'F4' || e.keyCode === 115) && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          e.preventDefault();
          if (statusPanel) statusPanel.classList.toggle('visible');
        }
        if ((e.key === 'F6' || e.keyCode === 117) && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          e.preventDefault();
          console.log('%c📊 Current Protection Status', 'color: #673AB7; font-size: 14px; font-weight: bold;');
          console.log(JSON.stringify(scanProtectionStatus(), null, 2));
        }
      }, { capture: true });

      function initReset() {
        if (document.getElementById(CONFIG.BTN_ID)) return;
        injectResetStyles();
        btn = document.createElement('button');
        btn.id = CONFIG.BTN_ID;
        applyState(S.IDLE);
        btn.addEventListener('click', resetSession);
        document.body.appendChild(btn);
        createStatusPanel();
        autoHandleSecurityPopups();
        scanProtectionStatus();
        log.success('Arena Reset Initialized');
      }

      if (document.body) initReset();
      else document.addEventListener('DOMContentLoaded', initReset, { once: true });

      window.__arenaReset = {
        scan: scanProtectionStatus,
        reset: resetSession,
        clearCookies: clearAllCookies,
        clearStorage,
        clearIDB,
        clearCaches,
        resetTurnstile,
        resetRecaptcha,
        cleanIframes: cleanSecurityIframes,
        getSecurityLog: () => securityRequestLog,
        config: CONFIG,
      };

    })();
  } // end reset module


  // ═══════════════════════════════════════════════════════════════
  //  §2  Auto Splitter Lite 模組
  // ═══════════════════════════════════════════════════════════════
  if (isModuleEnabled('splitter')) {

    // Needs to execute at document-idle equivalent timing
    const initSplitter = () => {

      const CHUNK_SIZE = 120000;
      const POLL_MS = 500;
      const AUTO_SPLIT_DEBOUNCE = 350;
      const FINAL_OK_TEXT = 'OK';

      const WAIT_PREFIX =
`Here is the data I want to provide (Part {{CURRENT}} of {{TOTAL}}), please read and remember it fully, do not reply or analyze yet. Once I say "OK", output the content according to my instructions.

---

`;

      const WAIT_SUFFIX =
`

---

This is part {{CURRENT}} of {{TOTAL}} data, please remember this first, do not output anything. Start replying once I say "OK".`;

      const state = {
        chunks: [],
        finals: [],
        sent: [],
        sending: false,
        abort: false,
      };

      let autoSplitTimer = 0;

      const $s = (sel, root = document) => root.querySelector(sel);
      const $$s = (sel, root = document) => [...root.querySelectorAll(sel)];
      const sleepS = ms => new Promise(r => setTimeout(r, ms));

      const tpl = (s, current, total) =>
        s.replace(/\{\{CURRENT\}\}/g, current).replace(/\{\{TOTAL\}\}/g, total);

      const escapeHtml = s => {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      };

      const visible = el => {
        if (!el || !el.isConnected) return false;
        const st = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return st.display !== 'none' && st.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };

      const insidePanel = el => !!el?.closest('#aa-lite-panel');

      const textOf = el =>
        [el?.textContent || '', el?.getAttribute?.('aria-label') || '',
         el?.getAttribute?.('title') || '', el?.id || '', el?.className || '']
        .join(' ').toLowerCase();

      const hasWord = (text, words) => words.some(w => text.includes(w));
      const SEND_WORDS = ['send', 'submit', '發送', '发送', '送出', '傳送'];
      const STOP_WORDS = ['stop', '停止', '中止', 'stop generating'];

      GM_addStyle(`
        #aa-lite-toggle{
          position:fixed;right:20px;bottom:20px;z-index:999999;
          width:52px;height:52px;border:none;border-radius:50%;
          background:#5b6cff;color:#fff;font-size:22px;cursor:pointer;
          box-shadow:0 6px 18px rgba(0,0,0,.25);
        }
        #aa-lite-panel{
          position:fixed;right:20px;bottom:84px;z-index:999998;
          width:420px;max-height:80vh;display:flex;flex-direction:column;
          background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:14px;
          overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.35);
          font:13px/1.5 system-ui,-apple-system,Segoe UI,Microsoft JhengHei,sans-serif;
        }
        #aa-lite-panel.hide{display:none}
        #aa-lite-head{
          display:flex;align-items:center;justify-content:space-between;
          padding:12px 14px;background:#1f2937;font-weight:700;
        }
        #aa-lite-head button{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:18px}
        #aa-lite-body{padding:12px;display:flex;flex-direction:column;gap:10px;overflow:auto}
        #aa-lite-text{
          width:100%;min-height:120px;max-height:260px;resize:vertical;
          background:#0b1220;color:#e5e7eb;border:1px solid #374151;border-radius:10px;
          padding:10px;box-sizing:border-box;outline:none;
        }
        .aa-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .aa-row input[type="number"],.aa-row select{
          background:#0b1220;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:6px 8px;
        }
        .aa-row label{display:flex;align-items:center;gap:6px;color:#d1d5db}
        .aa-btns{display:flex;gap:8px;flex-wrap:wrap}
        .aa-btns button{flex:1;padding:8px 10px;border:none;border-radius:8px;cursor:pointer;font-weight:600}
        .aa-warn{background:#f59e0b;color:#111827}
        .aa-good{background:#10b981;color:#fff}
        .aa-bad{background:#ef4444;color:#fff}
        #aa-lite-status{padding:8px 10px;border-radius:8px;background:#0b1220;color:#93c5fd;white-space:pre-wrap}
        #aa-lite-stats{font-size:12px;color:#9ca3af}
        #aa-lite-list{display:flex;flex-direction:column;gap:8px}
        .aa-item{border:1px solid #374151;border-radius:10px;background:#0b1220;overflow:hidden}
        .aa-item.sent{border-color:#10b981}
        .aa-item-head{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;background:#111827;align-items:center}
        .aa-item-meta{font-size:12px;color:#9ca3af}
        .aa-item-actions{display:flex;gap:6px}
        .aa-item-actions button{border:1px solid #374151;background:#1f2937;color:#e5e7eb;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px}
        .aa-item pre{margin:0;padding:10px;max-height:140px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:#d1d5db;font-size:12px}
        .aa-empty{text-align:center;color:#6b7280;padding:18px 8px;border:1px dashed #374151;border-radius:10px}
      `);

      document.body.insertAdjacentHTML('beforeend', `
        <button id="aa-lite-toggle" title="Toggle Splitter">✂️</button>
        <div id="aa-lite-panel" class="hide">
          <div id="aa-lite-head">
            <span>📋 Splitter Lite</span>
            <button id="aa-lite-close">✕</button>
          </div>
          <div id="aa-lite-body">
            <textarea id="aa-lite-text" placeholder="Auto splits large text upon paste"></textarea>
            <div class="aa-row">
              <label><input type="checkbox" id="aa-wait" checked> Insert "Wait for OK" prompt</label>
              <select id="aa-mode">
                <option value="first-only">First Part Only</option>
                <option value="all">All Parts</option>
              </select>
            </div>
            <div class="aa-row">
              <label><input type="checkbox" id="aa-final-ok"> Auto-send "OK" after all parts</label>
            </div>
            <div class="aa-row">
              <label>Send Gap <input type="number" id="aa-gap" value="3" min="1" max="60" style="width:64px"> secs</label>
            </div>
            <div class="aa-btns">
              <button id="aa-send" class="aa-warn">🚀 Auto Send</button>
              <button id="aa-copy" class="aa-good">📋 Copy All</button>
              <button id="aa-clear" class="aa-bad">🗑️ Clear</button>
            </div>
            <div id="aa-lite-status">Standby</div>
            <div id="aa-lite-stats"></div>
            <div id="aa-lite-list"></div>
          </div>
        </div>
      `);

      const ui = {
        toggle: $s('#aa-lite-toggle'),
        panel:  $s('#aa-lite-panel'),
        close:  $s('#aa-lite-close'),
        text:   $s('#aa-lite-text'),
        wait:   $s('#aa-wait'),
        mode:   $s('#aa-mode'),
        finalOk:$s('#aa-final-ok'),
        gap:    $s('#aa-gap'),
        send:   $s('#aa-send'),
        copy:   $s('#aa-copy'),
        clear:  $s('#aa-clear'),
        status: $s('#aa-lite-status'),
        stats:  $s('#aa-lite-stats'),
        list:   $s('#aa-lite-list'),
      };

      function setStatus(msg) { ui.status.textContent = msg; }

      function setBusyControls(busy) {
        [ui.text, ui.wait, ui.mode, ui.finalOk, ui.gap].forEach(el => { if (el) el.disabled = busy; });
      }

      function normalizeText(text) { return (text || '').replace(/\r\n?/g, '\n').trim(); }

      function needWrap(i) {
        if (!ui.wait.checked) return false;
        return ui.mode.value === 'all' || i === 0;
      }

      function prefix(i, total) { return tpl(WAIT_PREFIX, i + 1, total); }
      function suffix(i, total) { return tpl(WAIT_SUFFIX, i + 1, total); }

      function maxContentSize(i, total) {
        if (!needWrap(i)) return CHUNK_SIZE;
        return Math.max(1000, CHUNK_SIZE - prefix(i, total).length - suffix(i, total).length);
      }

      function resetSegments() { state.chunks = []; state.finals = []; state.sent = []; }

      function buildChunksByLines(text, total) {
        const pieces = text.split('\n').map((line, idx) => idx === 0 ? line : '\n' + line);
        const chunks = [];
        let current = '';
        for (const originalPiece of pieces) {
          let piece = originalPiece;
          while (piece.length) {
            const chunkIndex = chunks.length;
            const limit = maxContentSize(chunkIndex, total);
            if (!current) {
              if (piece.length <= limit) { current = piece; piece = ''; }
              else { chunks.push(piece.slice(0, limit)); piece = piece.slice(limit); }
              continue;
            }
            if (current.length + piece.length <= limit) { current += piece; piece = ''; }
            else { chunks.push(current); current = ''; }
          }
        }
        if (current) chunks.push(current);
        return chunks;
      }

      function splitText(raw) {
        const text = normalizeText(raw);
        if (!text) { resetSegments(); render(); return; }
        let total = 1, chunks = [];
        while (true) {
          chunks = buildChunksByLines(text, total);
          if (chunks.length === total) break;
          total = chunks.length;
        }
        state.chunks = chunks;
        state.finals = chunks.map((chunk, i) =>
          needWrap(i) ? prefix(i, total) + chunk + suffix(i, total) : chunk
        );
        state.sent = Array(state.finals.length).fill(false);
        render();
      }

      function autoSplitNow(showStatus = true) {
        clearTimeout(autoSplitTimer);
        if (state.sending) return;
        if (!ui.text.value.trim()) { resetSegments(); render(); if (showStatus) setStatus('Standby'); return; }
        splitText(ui.text.value);
        if (showStatus) setStatus(`✂️ Automatically split into ${state.finals.length} parts`);
      }

      function scheduleAutoSplit() {
        clearTimeout(autoSplitTimer);
        autoSplitTimer = setTimeout(() => autoSplitNow(true), AUTO_SPLIT_DEBOUNCE);
      }

      function render() {
        const rawText = normalizeText(ui.text.value);
        const maxLen = state.finals.reduce((m, s) => Math.max(m, s.length), 0);
        ui.stats.textContent = state.finals.length
          ? `Original ${rawText.length.toLocaleString()} chars | ${state.finals.length} parts | Max Part ${maxLen.toLocaleString()} / ${CHUNK_SIZE.toLocaleString()}`
          : '';
        if (!state.finals.length) { ui.list.innerHTML = `<div class="aa-empty">Not split yet</div>`; return; }
        ui.list.innerHTML = state.finals.map((chunk, i) => {
          const raw = state.chunks[i];
          const wrapLen = chunk.length - raw.length;
          const preview = chunk.slice(0, 300) + (chunk.length > 300 ? '\n\n...' : '');
          return `
            <div class="aa-item ${state.sent[i] ? 'sent' : ''}" data-i="${i}">
              <div class="aa-item-head">
                <div>
                  <div>📦 Part ${i + 1} parts ${needWrap(i) ? '⏳' : ''} ${state.sent[i] ? '✅' : ''}</div>
                  <div class="aa-item-meta">
                    ${chunk.length.toLocaleString()} 字
                    ${needWrap(i) ? `｜Content ${raw.length.toLocaleString()} + Prompt ${wrapLen.toLocaleString()}` : ''}
                  </div>
                </div>
                <div class="aa-item-actions">
                  <button data-act="copy">Copy</button>
                  <button data-act="paste">Paste</button>
                </div>
              </div>
              <pre>${escapeHtml(preview)}</pre>
            </div>`;
        }).join('');
      }

      function copyText(text) {
        navigator.clipboard.writeText(text).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove();
        });
      }

      function pick(selectors, test = () => true) {
        for (const sel of selectors) {
          for (const el of $$s(sel)) {
            if (insidePanel(el) || !visible(el)) continue;
            if (test(el)) return el;
          }
        }
        return null;
      }

      function findInput() {
        return pick([
          'textarea', '[contenteditable="true"]', 'div[role="textbox"]', 'input[type="text"]'
        ], el => el.id !== 'aa-lite-text' && !el.closest('#aa-lite-panel'));
      }

      function findStopButton() {
        const direct = pick([
          'button[aria-label*="Stop"]', 'button[aria-label*="stop"]',
          'button[aria-label*="停止"]', 'button[data-testid*="stop"]'
        ]);
        if (direct) return direct;
        return $$s('button').find(btn => !insidePanel(btn) && visible(btn) && hasWord(textOf(btn), STOP_WORDS)) || null;
      }

      function distanceToInput(btn, input) {
        if (!btn || !input) return Number.MAX_SAFE_INTEGER;
        const b = btn.getBoundingClientRect(), i = input.getBoundingClientRect();
        return Math.abs(b.left - i.right) + Math.abs(b.top - i.top);
      }

      function findSendButton() {
        const direct = pick([
          'button[aria-label*="Send"]', 'button[aria-label*="send"]',
          'button[aria-label*="發送"]', 'button[aria-label*="发送"]',
          'button[data-testid*="send"]', 'button[type="submit"]'
        ], btn => !btn.disabled);
        if (direct) return direct;
        const input = findInput();
        const cands = $$s('button').filter(btn => {
          if (insidePanel(btn) || !visible(btn) || btn.disabled) return false;
          const t = textOf(btn);
          return hasWord(t, SEND_WORDS) || btn.type === 'submit';
        });
        if (!cands.length) return null;
        if (!input) return cands[0];
        return cands.sort((a, b) => distanceToInput(a, input) - distanceToInput(b, input))[0];
      }

      function readInput(el) {
        if (!el) return '';
        return 'value' in el ? el.value : (el.textContent || '');
      }

      function dispatchInput(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      function setInputVal(el, text) {
        if (!el) return false;
        el.focus();
        if ('value' in el) {
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          setter ? setter.call(el, text) : (el.value = text);
          dispatchInput(el);
          return true;
        }
        try {
          document.execCommand('selectAll', false, null);
          const ok = document.execCommand('insertText', false, text);
          if (!ok) el.textContent = text;
        } catch { el.textContent = text; }
        dispatchInput(el);
        return true;
      }

      function pressEnter(el) {
        if (!el) return;
        ['keydown', 'keypress', 'keyup'].forEach(type => {
          el.dispatchEvent(new KeyboardEvent(type, {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
          }));
        });
      }

      function canSendNow() {
        const input = findInput();
        if (!input || input.disabled || input.readOnly || input.getAttribute('aria-disabled') === 'true') return false;
        if (findStopButton()) return false;
        const sendBtn = findSendButton();
        return sendBtn ? !sendBtn.disabled : true;
      }

      async function waitUntilReady(index, total) {
        while (!state.abort) {
          if (canSendNow()) return true;
          setStatus(`⏳ Part ${index + 1}/${total} parts waiting: previous response incomplete`);
          await sleepS(POLL_MS);
        }
        return false;
      }

      async function confirmSent(snapshot, timeout = 8000) {
        const start = Date.now();
        while (!state.abort && Date.now() - start < timeout) {
          const input = findInput();
          const current = readInput(input);
          if (findStopButton()) return true;
          if (current !== snapshot && current.length < snapshot.length) return true;
          if (current === '') return true;
          const sendBtn = findSendButton();
          if (sendBtn && sendBtn.disabled && snapshot.trim()) return true;
          await sleepS(150);
        }
        return false;
      }

      async function trySend(text) {
        const input = findInput();
        if (!input) return false;
        setInputVal(input, text);
        await sleepS(250);
        const btn = findSendButton();
        if (btn && !btn.disabled) { btn.click(); if (await confirmSent(text)) return true; }
        pressEnter(input);
        return await confirmSent(text);
      }

      async function sendOne(text, index, total) {
        while (!state.abort) {
          if (!(await waitUntilReady(index, total))) return false;
          setStatus(`🚀 正在發送Part ${index + 1}/${total} parts...`);
          if (await trySend(text)) return true;
          setStatus(`⚠️ Part ${index + 1} parts not verified as sent, waiting to retry...`);
          await sleepS(1000);
        }
        return false;
      }

      async function autoSendAll() {
        if (!state.finals.length || state.sending) return;
        state.sending = true; state.abort = false;
        ui.send.disabled = true; setBusyControls(true);
        const gap = Math.max(1, parseInt(ui.gap.value, 10) || 3) * 1000;
        let completedAll = true;

        for (let i = 0; i < state.finals.length; i++) {
          if (state.abort) { completedAll = false; break; }
          if (!(await sendOne(state.finals[i], i, state.finals.length))) { completedAll = false; break; }
          state.sent[i] = true; render();
          if (i < state.finals.length - 1 && !state.abort) {
            const end = Date.now() + gap;
            while (!state.abort && Date.now() < end) {
              const left = Math.ceil((end - Date.now()) / 1000);
              setStatus(`✅ Part ${i + 1} parts sent, waiting ${left} secs`);
              await sleepS(200);
            }
          }
        }

        if (completedAll && !state.abort && ui.finalOk.checked) {
          setStatus('🟦 All parts sent, waiting to send "OK"...');
          if (!(await sendOne(FINAL_OK_TEXT, state.finals.length, state.finals.length + 1))) completedAll = false;
        }

        if (state.abort) setStatus('⏹️ Auto-send stopped');
        else if (!completedAll) setStatus('⚠️ Auto-send incomplete');
        else setStatus(ui.finalOk.checked ? '✅ All sent, "OK" sent' : '✅ All sent');

        state.sending = false; ui.send.disabled = false; setBusyControls(false);
      }

      function pasteToChat(text) {
        const input = findInput();
        if (!input) { copyText(text); setStatus('⚠️ 找不到聊天輸入框，已Copy到剪貼板'); return; }
        setInputVal(input, text); input.focus(); setStatus('📤 已Paste聊天輸入框');
      }

      // Event Bindings
      ui.toggle.addEventListener('click', () => ui.panel.classList.toggle('hide'));
      ui.close.addEventListener('click', () => ui.panel.classList.add('hide'));
      ui.text.addEventListener('input', scheduleAutoSplit);

      ui.copy.addEventListener('click', () => {
        if (!state.chunks.length && ui.text.value.trim()) autoSplitNow(false);
        if (!state.chunks.length) { setStatus('⚠️ 沒有可CopyContent'); return; }
        copyText(state.chunks.join('')); setStatus('📋 已合併CopyOriginal（不含Prompt）');
      });

      ui.clear.addEventListener('click', () => {
        if (state.sending) state.abort = true;
        clearTimeout(autoSplitTimer);
        ui.text.value = ''; resetSegments(); render(); setStatus('🗑️ Cleared');
      });

      ui.send.addEventListener('click', async () => {
        if (!state.finals.length && ui.text.value.trim()) autoSplitNow(false);
        if (!state.finals.length) { setStatus('⚠️ Please paste text first'); return; }
        if (state.sending) return;
        await autoSendAll();
      });

      ui.wait.addEventListener('change', () => { if (!state.sending && ui.text.value.trim()) autoSplitNow(true); });
      ui.mode.addEventListener('change', () => { if (!state.sending && ui.text.value.trim()) autoSplitNow(true); });

      ui.list.addEventListener('click', e => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const item = btn.closest('.aa-item');
        const i = Number(item?.dataset.i);
        if (Number.isNaN(i)) return;
        if (btn.dataset.act === 'copy') { copyText(state.finals[i]); setStatus(`📋 Part ${i + 1} parts已Copy`); }
        if (btn.dataset.act === 'paste') pasteToChat(state.finals[i]);
      });

      document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault(); ui.panel.classList.toggle('hide');
          if (!ui.panel.classList.contains('hide')) ui.text.focus();
        }
        if (state.sending && e.key === 'Escape') {
          state.abort = true; setStatus('⏹️ Stop command received, aborting...');
        }
      });

      render();
      console.log('✂️ Arena.ai Splitter Lite loaded');
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSplitter);
    } else {
      // Small delay to ensure DOM is ready
      setTimeout(initSplitter, 0);
    }

  } // end splitter module

})();