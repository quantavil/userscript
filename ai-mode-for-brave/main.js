// ==UserScript==
// @name         Google AI Mode for Brave Sidebar
// @namespace    http://github.com/quantavil/userscripts
// @version      1.3.0
// @description  Extracts Google AI Mode results and displays them in the Brave Search sidebar
// @match        https://search.brave.com/search*
// @match        https://www.google.com/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_openInTab
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const IS_BRAVE = location.hostname === "search.brave.com";
  const IS_GOOGLE = location.hostname === "www.google.com";

  if (IS_BRAVE) braveSide();
  else if (IS_GOOGLE) googleSide();

  // ═══════════════════════════════════════════════════════════════════════
  //  GOOGLE SIDE — extracts rendered AI content and sends to Brave tab
  // ═══════════════════════════════════════════════════════════════════════
  function googleSide() {
    const params = new URLSearchParams(location.search);
    if (params.get("udm") !== "50") return;
    if (!location.hash.includes("gai")) return;

    history.replaceState(null, "", location.href.replace(/#gai.*/, ""));
    console.log("[GAI] Google-side activated. Waiting for AI content…");

    const onReady = () => {
      console.log("[GAI] Page loaded. Starting content watch…");

      const minWait = new Promise((r) => setTimeout(r, 8000));

      const settled = new Promise((resolve) => {
        let timer;
        const done = () => {
          obs.disconnect();
          resolve();
        };
        const bump = () => {
          clearTimeout(timer);
          timer = setTimeout(done, 4000);
        };
        const obs = new MutationObserver(bump);
        obs.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        setTimeout(done, 45000);
        bump();
      });

      Promise.all([minWait, settled]).then(() => {
        console.log("[GAI] Content settled. Extracting…");

        const html = extractContent();
        const q = params.get("q") || "";

        console.log(`[GAI] Extracted ${html.length} chars for "${q}"`);

        GM_setValue("gai_response", {
          html,
          query: q,
          ts: Date.now(),
        });

        console.log("[GAI] Response sent. This tab can be closed.");
      });
    };

    if (document.readyState === "complete") {
      onReady();
    } else {
      window.addEventListener("load", onReady, { once: true });
    }
  }

  function extractContent() {
    const container =
      document.querySelector('[data-container-id="main-col"]') ||
      document.querySelector(".pWvJNd") ||
      document.body;
    if (!container) return "";

    const clone = container.cloneNode(true);

    const stripSel = [
      "script","noscript","style","link","iframe","header","footer",
      "#gb","#fbar","#searchform","#top_nav",'[role="navigation"]',
      ".uJ19be",".txxDge",".VlQBpc",".zkL70c","a.rBl3me","button","svg","img",
    ];
    for (const sel of stripSel) {
      for (const el of clone.querySelectorAll(sel)) el.remove();
    }

    for (const el of clone.querySelectorAll("*")) {
      if ((el.getAttribute("style") || "").replace(/\s/g, "").includes("display:none")) {
        el.remove();
      }
    }

    for (const el of clone.querySelectorAll('[role="heading"]')) {
      const level = el.getAttribute("aria-level") || "3";
      const h = document.createElement(`h${level}`);
      h.innerHTML = el.innerHTML;
      el.replaceWith(h);
    }

    for (const el of [clone, ...clone.querySelectorAll("*")]) {
      const attrs = [...el.attributes];
      for (const attr of attrs) {
        const n = attr.name.toLowerCase();
        if (n !== "colspan" && n !== "rowspan" && n !== "href") {
          el.removeAttribute(n);
        }
      }
    }

    let changed;
    do {
      changed = false;
      for (const el of clone.querySelectorAll("*")) {
        if (!el.textContent.trim() && el.children.length === 0) {
          el.remove();
          changed = true;
        }
      }
    } while (changed);

    return clone.innerHTML.trim() || clone.textContent.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BRAVE SIDE — sidebar panel + background tab orchestration
  // ═══════════════════════════════════════════════════════════════════════
  function braveSide() {
    const ID = "gai";
    const ICON = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
    const SIDEBAR_SEL = [
      "aside.sidebar > .sidebar-content",
      "aside.side > .sidebar-content",
      "aside.sidebar",
      "aside.side",
      "aside",
    ];

    const $ = (s) => document.querySelector(s);
    const getQ = () => new URLSearchParams(location.search).get("q") || "";
    const aiUrl = (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(q)}&udm=50#gai`;

    GM_addStyle(`
      #${ID}{margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.07);background:#161618;font-family:system-ui,-apple-system,sans-serif}
      #${ID}.float{position:fixed;right:16px;top:68px;width:400px;max-height:calc(100vh - 84px);overflow-y:auto;z-index:9999;box-shadow:0 8px 40px rgba(0,0,0,.55)}
      .${ID}-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:linear-gradient(135deg,rgba(66,133,244,.06),rgba(99,102,241,.04));border-bottom:1px solid rgba(255,255,255,.05)}
      .${ID}-tag{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:#8e8e96;text-transform:uppercase;letter-spacing:.05em}
      .${ID}-acts{display:flex;gap:4px}
      .${ID}-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 6px;border-radius:6px;font-size:13px;color:#707078;border:1px solid rgba(255,255,255,.07);transition:all .12s;text-decoration:none}
      .${ID}-btn:hover{color:#e0e0e4;border-color:rgba(255,255,255,.14)}
      .${ID}-content{padding:16px;font-size:14px;line-height:1.6;color:#e0e0e4}
      .${ID}-content p,.${ID}-content div{margin-bottom:8px}
      .${ID}-content ul{margin:0 0 12px 20px;padding:0}
      .${ID}-content li{margin-bottom:6px}
      .${ID}-content strong,.${ID}-content b{color:#fff;font-weight:600}
      .${ID}-content mark{background:rgba(99,102,241,0.15);color:#a5a8ff;padding:0 3px;border-radius:4px;box-shadow:0 0 0 1px rgba(99,102,241,0.3)}
      .${ID}-content h3{font-size:15px;color:#fff;margin:16px 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
      .${ID}-content table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;border-radius:6px;overflow:hidden}
      .${ID}-content th,.${ID}-content td{border:1px solid rgba(255,255,255,0.06);padding:10px;text-align:left}
      .${ID}-content th{background:rgba(255,255,255,0.03);font-weight:600;color:#fff}
      .${ID}-content tr:nth-child(even){background:rgba(255,255,255,0.015)}
      .${ID}-load{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 16px;text-align:center}
      .${ID}-spin{width:22px;height:22px;border:2.5px solid rgba(255,255,255,.06);border-top-color:#6366f1;border-radius:50%;animation:${ID}s .65s linear infinite}
      @keyframes ${ID}s{to{transform:rotate(360deg)}}
      .${ID}-msg{font-size:12px;color:#707078;line-height:1.5}
      .${ID}-msg b{color:#a5a8ff}
      .${ID}-step{font-size:11px;color:#505058;margin-top:2px}
      .${ID}-err{padding:20px 14px;text-align:center;font-size:12px;color:#808088;line-height:1.5}
      .${ID}-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;margin-top:10px;border-radius:7px;background:#6366f1;color:#fff;font-size:13px;font-weight:600;text-decoration:none}
      .${ID}-cta:hover{opacity:.85}
    `);

    // ── State ──
    let googleTab = null;
    let listenerId = null;
    let currentQuery = "";
    let injected = false;
    let fetchGen = 0;
    let lastQuery = getQ();
    let lastHTML = null;        // NEW: cached rendered content
    let activePollTimer = null;
    let activePollTimeout = null;

    // ── Helpers ──
    function loadingHTML(step = "Opening background tab…") {
      return `
        <div class="${ID}-load">
          <div class="${ID}-spin"></div>
          <div class="${ID}-msg">Fetching <b>Google AI Mode</b> response…</div>
          <div class="${ID}-step" id="${ID}-step">${step}</div>
        </div>`;
    }

    function setStep(text) {
      const el = $(`#${ID}-step`);
      if (el) el.textContent = text;
    }

    function cleanupFetch() {
      if (googleTab && !googleTab.closed) {
        try { googleTab.close(); } catch (_) {}
      }
      googleTab = null;
      if (listenerId !== null) {
        try { GM_removeValueChangeListener(listenerId); } catch (_) {}
        listenerId = null;
      }
    }

    // ── Render (always caches) ──
    function renderContent(html) {
      lastHTML = html;
      const bodyEl = $(`#${ID}-body`);
      if (!bodyEl) return;
      bodyEl.innerHTML = `<div class="${ID}-content">${html}</div>`;
    }

    // ── Build panel ──
    function buildPanel(q) {
      const panel = document.createElement("div");
      panel.id = ID;
      panel.innerHTML = `
        <div class="${ID}-bar">
          <span class="${ID}-tag">${ICON} Google AI Mode</span>
          <span class="${ID}-acts">
            <button class="${ID}-btn" data-act="copy" title="Copy text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
            <button class="${ID}-btn" data-act="reload" title="Reload"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 2.81-6.57L21 8"></path></svg></button>
            <a class="${ID}-btn" href="${aiUrl(q).replace("#gai","")}" target="_blank" title="Open in tab"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
          </span>
        </div>
        <div id="${ID}-body">${loadingHTML()}</div>`;

      panel.querySelector('[data-act="reload"]').addEventListener("click", () => {
        lastHTML = null;
        startFetch(getQ());
      });
      panel.querySelector('[data-act="copy"]').addEventListener("click", (e) => {
        const content = panel.querySelector(`.${ID}-content`);
        if (content) {
          navigator.clipboard.writeText(content.innerText).then(() => {
            const btn = e.currentTarget;
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34A853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
              btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            }, 1500);
          });
        }
      });

      return panel;
    }

    // ── Sidebar detection ──
    function findSidebar() {
      for (const s of SIDEBAR_SEL) {
        const el = $(s);
        if (el) return el;
      }
      return null;
    }

    // ── Insert panel into page (does NOT start fetch) ──
    function insertPanel(q) {
      const panel = buildPanel(q);
      const sidebar = findSidebar();
      if (sidebar) {
        sidebar.prepend(panel);
      } else {
        panel.classList.add("float");
        document.body.appendChild(panel);
      }
      return panel;
    }

    // ── Start the fetch-via-tab process ──
    function startFetch(q) {
      const gen = ++fetchGen;
      currentQuery = q;
      const bodyEl = $(`#${ID}-body`);
      if (!bodyEl) return;

      bodyEl.innerHTML = loadingHTML("Opening background tab…");

      cleanupFetch();

      listenerId = GM_addValueChangeListener(
        "gai_response",
        (_key, _oldVal, newVal, _remote) => {
          if (!newVal || !newVal.html || !newVal.ts) return;
          if (Date.now() - newVal.ts > 120000) return;
          if (gen !== fetchGen) return;
          if (newVal.query && newVal.query !== currentQuery) return;

          console.log(`[GAI-Brave] Received ${newVal.html.length} chars`);

          // Cache IMMEDIATELY so panel re-inserts during the 300ms delay get content
          lastHTML = newVal.html;

          // Remove listener — we got what we needed
          if (listenerId !== null) {
            try { GM_removeValueChangeListener(listenerId); } catch (_) {}
            listenerId = null;
          }

          setStep("Content received! Rendering…");

          setTimeout(() => {
            if (gen !== fetchGen) return;
            renderContent(newVal.html);
            if (googleTab && !googleTab.closed) {
              try { googleTab.close(); } catch (_) {}
            }
            googleTab = null;
          }, 300);
        }
      );

      const url = aiUrl(q);
      try {
        googleTab = GM_openInTab(url, { active: false, insert: true, setParent: true });
        console.log("[GAI-Brave] Background tab opened");
        setStep("Background tab opened. Waiting for AI response…");

        if (googleTab && googleTab.onclose !== undefined) {
          googleTab.onclose = () => {
            if (gen === fetchGen) {
              console.log("[GAI-Brave] Google tab closed");
              setStep("Google tab closed. Waiting for data…");
            }
          };
        }
      } catch (e) {
        console.error("[GAI-Brave] Failed to open tab:", e);
        bodyEl.innerHTML = `
          <div class="${ID}-err">
            ⚠️ Could not open background tab. Allow popups for search.brave.com.<br>
            <a class="${ID}-cta" href="${url.replace("#gai","")}" target="_blank">✨ Open Manually →</a>
          </div>`;
        return;
      }

      // Timeout — 50s
      setTimeout(() => {
        if (gen !== fetchGen) return;
        if (lastHTML) return; // content arrived, all good
        cleanupFetch();
        const body = $(`#${ID}-body`);
        if (body && body.querySelector(`.${ID}-load`)) {
          body.innerHTML = `
            <div class="${ID}-err">
              ⚠️ Timed out waiting for Google AI response.<br>
              <a class="${ID}-cta" href="${url.replace("#gai","")}" target="_blank">✨ Open Manually →</a>
            </div>`;
        }
      }, 50000);
    }

    // ── Inject: build panel + start fetch (first time only) ──
    function inject() {
      const q = getQ();
      if (!q || injected) return;

      injected = true;
      lastQuery = q;

      insertPanel(q);
      startFetch(q);
    }

    // ── Re-inject: panel was removed by SPA, put it back WITHOUT re-fetching ──
    function reinject() {
      const q = getQ();
      if (!q) return;

      console.log("[GAI-Brave] Panel removed by SPA, re-inserting…");
      injected = true;

      insertPanel(q);

      // Show cached content if we already have it, otherwise keep loading spinner
      if (lastHTML) {
        renderContent(lastHTML);
      }
      // If fetch is still in progress, the loading spinner from buildPanel is correct.
      // When the listener fires, it will find #gai-body and render into it.
    }

    // ── Centralized sidebar poll ──
    function startSidebarPoll(delay) {
      if (activePollTimeout) { clearTimeout(activePollTimeout); activePollTimeout = null; }
      if (activePollTimer) { clearInterval(activePollTimer); activePollTimer = null; }

      const run = () => {
        activePollTimeout = null;
        let n = 0;
        activePollTimer = setInterval(() => {
          if (++n >= 16 || findSidebar()) {
            clearInterval(activePollTimer);
            activePollTimer = null;
            inject();
          }
        }, 250);
      };

      if (delay > 0) {
        activePollTimeout = setTimeout(run, delay);
      } else {
        run();
      }
    }

    // ── SPA navigation + panel-removal watcher ──
    function checkNavigation() {
      const currentQ = getQ();
      if (!currentQ) return;

      // ① Query actually changed → full reset + re-fetch
      if (currentQ !== lastQuery) {
        console.log("[GAI-Brave] Query changed:", currentQ);
        lastQuery = currentQ;
        injected = false;
        lastHTML = null;
        const old = $(`#${ID}`);
        if (old) old.remove();
        cleanupFetch();
        startSidebarPoll(500);
        return;
      }

      // ② Same query but panel disappeared (Brave SPA re-rendered sidebar)
      //    → re-insert panel WITHOUT opening a new Google tab
      if (injected && !$(`#${ID}`)) {
        reinject();
      }
    }

    window.addEventListener("popstate", checkNavigation);
    setInterval(checkNavigation, 500);

    // ── Initial boot ──
    startSidebarPoll(0);
  }
})();