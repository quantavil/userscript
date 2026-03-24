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
          :root {
            --ui-font: 'Geist', 'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            --cb-fluid: cubic-bezier(0.32, 0.72, 0, 1);
            --cb-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          #${CONFIG.BTN_ID} {
            position: fixed; bottom: 24px; left: 24px; z-index: 2147483647;
            padding: 8px 16px;
            background: rgba(10, 10, 10, 0.6);
            color: #ffffff;
            border: none;
            border-radius: 9999px;
            cursor: pointer;
            font: 600 13px/1.5 var(--ui-font);
            letter-spacing: -0.01em;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.4);
            transition: all 300ms var(--cb-fluid);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            user-select: none;
            transform-origin: center;
          }
          #${CONFIG.BTN_ID}:hover:not(:disabled) {
            background: rgba(15, 15, 15, 0.8);
            transform: scale(0.98);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 48px rgba(0, 0, 0, 0.5);
          }
          #${CONFIG.BTN_ID}:active:not(:disabled) { transform: scale(0.95); }
          #${CONFIG.BTN_ID}:disabled { opacity: 0.5; cursor: wait; transform: scale(0.98); }
          
          .lm-rst-status-outer {
            position: fixed; bottom: 80px; left: 24px; z-index: 2147483646;
            padding: 6px;
            background: rgba(10, 10, 10, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 2rem;
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 20px 40px -15px rgba(0, 0, 0, 0.5);
            pointer-events: none;
            opacity: 0;
            transform: translateY(16px) scale(0.98);
            transition: opacity 300ms var(--cb-fluid), transform 300ms var(--cb-fluid);
            will-change: transform, opacity;
          }
          .lm-rst-status-outer.visible { 

            opacity: 1; 
            pointer-events: auto; 
            transform: translateY(0) scale(1); 
          }
          .lm-rst-status-inner {
            background: rgba(15, 15, 15, 0.8);
            border-radius: calc(2rem - 6px);
            padding: 16px 20px;
            max-width: 340px; 
            max-height: 320px;
            overflow-y: auto;
            color: #e5e7eb;
            font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
          }
          .lm-rst-status-inner::-webkit-scrollbar { width: 4px; }
          .lm-rst-status-inner::-webkit-scrollbar-track { background: transparent; }
          .lm-rst-status-inner::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
          .lm-rst-status-inner .entry { margin: 6px 0; opacity: 0; animation: fadeUpEntry 600ms var(--cb-bounce) forwards; }
          @keyframes fadeUpEntry {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .lm-rst-status-inner .entry.ok { color: #34d399; }
          .lm-rst-status-inner .entry.warn { color: #fbbf24; }
          .lm-rst-status-inner .entry.err { color: #f87171; }
          .lm-rst-status-inner .entry.sec { color: #a78bfa; }
        `);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }

      let statusOuter = null;
      let statusPanel = null;

      function createStatusPanel() {
        statusOuter = document.createElement('div');
        statusOuter.className = 'lm-rst-status-outer';
        statusPanel = document.createElement('div');
        statusPanel.className = 'lm-rst-status-inner';
        statusOuter.appendChild(statusPanel);
        document.body.appendChild(statusOuter);
        return statusOuter;
      }

      function addStatus(text, type = 'ok') {
        if (!statusOuter) createStatusPanel();
        const div = document.createElement('div');
        div.className = `entry ${type}`;
        div.textContent = `${new Date().toLocaleTimeString()} ${text}`;
        statusPanel.appendChild(div);
        
        requestAnimationFrame(() => {
          statusPanel.scrollTop = statusPanel.scrollHeight;
        });
        statusOuter.classList.add('visible');
      }

      function hideStatusPanel(delay = 3000) {
        setTimeout(() => {
          if (statusOuter) statusOuter.classList.remove('visible');
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
          if (statusOuter) statusOuter.classList.toggle('visible');
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

      const insidePanel = el => !!el?.closest('#aa-lite-panel-outer');

      const textOf = el =>
        [el?.textContent || '', el?.getAttribute?.('aria-label') || '',
         el?.getAttribute?.('title') || '', el?.id || '', el?.className || '']
        .join(' ').toLowerCase();

      const hasWord = (text, words) => words.some(w => text.includes(w));
      const SEND_WORDS = ['send', 'submit', '發送', '发送', '送出', '傳送'];
      const STOP_WORDS = ['stop', '停止', '中止', 'stop generating'];

      GM_addStyle(`
        :root {
            --ui-font: 'Geist', 'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            --cb-fluid: cubic-bezier(0.32, 0.72, 0, 1);
            --cb-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        #aa-lite-toggle {
          position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 999999;
          width: 40px; height: 48px; border: none;
          border-radius: 12px 0 0 12px; background: rgba(10,10,10,0.6); color: #fff;
          font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          transition: all 300ms var(--cb-fluid);
        }
        #aa-lite-toggle:hover {
          transform: translateY(-50%) translateX(-4px);
          background: rgba(15,15,15,0.8);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 48px rgba(0, 0, 0, 0.5);
        }
        #aa-lite-panel-outer {
          position: fixed; right: 56px; top: 50%; z-index: 999998;
          width: 420px; max-height: 85vh; display: flex; flex-direction: column;
          padding: 8px;
          background: rgba(10, 10, 10, 0.4);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 2.5rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 30px 60px -15px rgba(0,0,0,0.6);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          transition: opacity 300ms var(--cb-fluid), transform 300ms var(--cb-fluid);
          transform-origin: right center;
          pointer-events: none; opacity: 0; transform: translateY(-50%) scale(0.95);
        }
        #aa-lite-panel-outer:not(.hide) { opacity: 1; pointer-events: auto; transform: translateY(-50%) scale(1); }
        #aa-lite-panel-inner {
          display: flex; flex-direction: column;
          background: rgba(15, 15, 15, 0.85);
          border-radius: calc(2.5rem - 8px);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
          font: 14px/1.6 var(--ui-font);
          color: #e5e7eb;
        }
        #aa-lite-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px; background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.03); 
          font-weight: 600; font-size: 15px; letter-spacing: -0.01em;
        }
        #aa-lite-head button {
          background: rgba(255,255,255,0.05); border: none; color: #9ca3af; cursor: pointer;
          width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center;
          transition: all 250ms var(--cb-fluid);
        }
        #aa-lite-head button:hover { color: #f3f4f6; background: rgba(255,255,255,0.1); transform: scale(0.9); }
        #aa-lite-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; }
        #aa-lite-text {
          width: 100%; min-height: 120px; max-height: 260px; resize: vertical;
          background: rgba(5,5,5,0.5); color: #f3f4f6;
          border: 1px solid rgba(255,255,255,0.06); border-radius: 1rem;
          padding: 16px; box-sizing: border-box; outline: none;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);
          transition: all 250ms var(--cb-fluid); font-family: ui-monospace, monospace; font-size: 13px;
        }
        #aa-lite-text:focus { border-color: rgba(255, 255, 255, 0.2); background: rgba(10,10,10,0.8); }
        .aa-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .aa-row input[type="number"], .aa-row select {
          background: rgba(5,5,5,0.5); color: #e5e7eb; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px; padding: 8px 12px; outline: none; font-family: inherit; transition: all 200ms;
        }
        .aa-row input[type="number"]:focus, .aa-row select:focus { border-color: rgba(255,255,255,0.2); }
        .aa-row input[type="checkbox"] { accent-color: #ffffff; width: 16px; height: 16px; border-radius: 4px; }
        .aa-row label { display: flex; align-items: center; gap: 8px; color: #a1a1aa; font-size: 13px; cursor: pointer; }
        .aa-btns { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
        .aa-btns button {
          flex: 1; padding: 12px 16px; border: 1px solid rgba(255,255,255,0.05); border-radius: 9999px;
          cursor: pointer; font-weight: 600; font-size: 14px; transition: all 300ms var(--cb-fluid);
          display: flex; justify-content: center; align-items: center; gap: 8px;
          background: rgba(20,20,20,0.8); color: #eee;
        }
        .aa-btns button:hover { transform: scale(0.97); background: rgba(40,40,40,0.8); }
        .aa-btns button.aa-primary { background: #fafafa; color: #0a0a0a; border-color: transparent; }
        .aa-btns button.aa-primary:hover { background: #e5e5e5; }
        
        #aa-lite-status {
          padding: 12px 16px; border-radius: 12px; background: rgba(0,0,0,0.3); color: #a1a1aa;
          font-size: 13px; white-space: pre-wrap; margin-top: 8px; border: 1px solid rgba(255,255,255,0.03);
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.2);
        }
        #aa-lite-stats { font-size: 12px; color: #71717a; text-align: center; }
        #aa-lite-list { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
        .aa-item {
          border: 1px solid rgba(255,255,255,0.05); border-radius: 1.5rem;
          background: rgba(5,5,5,0.4); overflow: hidden; transition: all 300ms var(--cb-fluid);
          animation: fadeUpEntry 300ms var(--cb-bounce) forwards; opacity: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .aa-item.sent { border-color: rgba(255,255,255,0.15); background: rgba(20,20,20,0.6); }
        .aa-item-head {
          display: flex; justify-content: space-between; gap: 12px; padding: 14px 20px;
          background: rgba(255,255,255,0.02); align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .aa-item-meta { font-size: 11px; color: #a1a1aa; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .aa-item-actions { display: flex; gap: 8px; }
        .aa-item-actions button {
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
          color: #d1d5db; border-radius: 9999px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 200ms var(--cb-fluid);
        }
        .aa-item-actions button:hover { background: #fafafa; color: #000; transform: scale(0.95); }
        .aa-item pre {
          margin: 0; padding: 16px 20px; max-height: 160px; overflow: auto; white-space: pre-wrap;
          word-break: break-all; color: #d1d5db; font-size: 13px; font-family: ui-monospace, Menlo, monospace;
        }
        .aa-empty { text-align: center; color: #71717a; padding: 40px 20px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 1rem; font-size: 14px; }
        
        #aa-lite-body::-webkit-scrollbar { width: 4px; }
        #aa-lite-body::-webkit-scrollbar-track { background: transparent; }
        #aa-lite-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .aa-item pre::-webkit-scrollbar { width: 4px; }
        .aa-item pre::-webkit-scrollbar-track { background: transparent; }
        .aa-item pre::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `);

      document.body.insertAdjacentHTML('beforeend', `
        <button id="aa-lite-toggle" title="Toggle Splitter">✂️</button>
        <div id="aa-lite-panel-outer" class="hide">
          <div id="aa-lite-panel-inner">
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
                <button id="aa-send" class="aa-primary">🚀 Auto Send</button>
                <button id="aa-copy">📋 Copy All</button>
                <button id="aa-clear">🗑️ Clear</button>
              </div>
              <div id="aa-lite-status">Standby</div>
              <div id="aa-lite-stats"></div>
              <div id="aa-lite-list"></div>
            </div>
          </div>
        </div>
      `);

      const ui = {
        toggle: $s('#aa-lite-toggle'),
        panelOuter: $s('#aa-lite-panel-outer'),
        panelInner: $s('#aa-lite-panel-inner'),
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
      ui.toggle.addEventListener('click', () => ui.panelOuter.classList.toggle('hide'));
      ui.close.addEventListener('click', () => ui.panelOuter.classList.add('hide'));
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
          e.preventDefault(); ui.panelOuter.classList.toggle('hide');
          if (!ui.panelOuter.classList.contains('hide')) ui.text.focus();
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