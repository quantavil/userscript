// ==UserScript==
// @name         Google AI Mode for Brave Sidebar
// @namespace    quantavil
// @version      2.4.0
// @description  Extracts Google AI Mode results and displays them in the Brave Search sidebar
// @match        https://search.brave.com/search*
// @match        https://www.google.com/search*
// @license      MIT
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

  // ═══════════════════════════════════════════════════════════════════════
  //  SHARED CONSTANTS & UTILITIES
  // ═══════════════════════════════════════════════════════════════════════

  const GOOGLE_ORIGIN = "https://www.google.com";
  const CACHE_KEY = "gai_cache";
  const FETCH_LOCK_TTL = 70_000;

  const normalizeQ = (q) =>
    (q || "").trim().toLowerCase().replace(/\s+/g, " ");

  const googleUrl = (q) =>
    `${GOOGLE_ORIGIN}/search?q=${encodeURIComponent(q)}&udm=50`;

  const aiUrl = (q) => `${googleUrl(q)}#gai`;

  const CONTENT_SELS = ['[data-container-id="main-col"]', ".pWvJNd"];

  const COMPLETE_SELS = [
    'button[aria-label="Copy text"]',
    'button[aria-label="Good response"]',
    'button[aria-label="Bad response"]',
    ".bKxaof",
    ".ya9Iof",
  ];

  const ERROR_SELS = [
    "#captcha-form",
    'form[action*="signin"]',
    '#infoDiv[class*="captcha"]',
    "#consent-bump",
    "#recaptcha",
  ];

  // Selectors to strip during content extraction
  const STRIP_SELS = [
    // Standard web noise
    "script","noscript","style","link","iframe","header","footer",
    "#gb","#fbar","#searchform","#top_nav",'[role="navigation"]',
    // Media & interactive
    "button","svg","img",
    // AI Mode: inline citation / source badges
    "a.rBl3me","a.NoAaxc",
    ".uJ19be",".txxDge",
    // AI Mode: feedback / tracking
    ".JuoeAb","[data-crb-el]",
    // AI Mode: UI chrome
    ".VlQBpc",".zkL70c",".DwkS",
    ".IBZVef",   // show more / less toggle
    ".Fsg96",    // spacer divs
    ".alk4p",    // loading animation
    ".kwdzO",    // "a few seconds ago" timestamp
    ".sNRHic",   // bottom spacer
    // Source / citation panels
    ".ofHStc",".jKhXsc",".SGF5Lb",
    ".wDa0n",".hpw4G",".qacuz",
    // Toolbar rows (copy/edit bar above content)
    ".ilZyRc",".UYpEO",".dcCF7d",
  ];

  const KEEP_ATTRS = new Set(["colspan", "rowspan", "href"]);
  const INLINE_TAGS = new Set(["strong", "b", "em", "i", "a", "span"]);

  function getCache() {
    try {
      const c = GM_getValue(CACHE_KEY, null);
      if (c && typeof c === "object") return c;
    } catch (_) {}
    return {};
  }

  function setCache(obj) {
    try { GM_setValue(CACHE_KEY, obj); } catch (_) {}
  }

  function findBySelectors(sels) {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  /** Find content element that has actual text */
  function findContentEl() {
    for (const sel of CONTENT_SELS) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el;
    }
    return null;
  }

  if (IS_BRAVE) braveSide();
  else if (IS_GOOGLE) googleSide();

  // ═══════════════════════════════════════════════════════════════════════
  //  GOOGLE SIDE — content extraction with real completion detection
  // ═══════════════════════════════════════════════════════════════════════
  function googleSide() {
    const params = new URLSearchParams(location.search);
    if (params.get("udm") !== "50") return;
    if (!location.hash.includes("gai")) return;

    history.replaceState(null, "", location.href.replace(/#gai.*/, ""));
    console.log("[GAI] Google-side activated");

    let sent = false;
    let lastLen = -1;
    let stableCount = 0;
    const startTime = Date.now();
    const rawQ = params.get("q") || "";
    const normQ = normalizeQ(rawQ);

    function isResponseComplete() {
      return COMPLETE_SELS.some((s) => document.querySelector(s));
    }

    function isErrorPage() {
      if (ERROR_SELS.some((s) => document.querySelector(s))) return true;
      const t = document.title.toLowerCase();
      return t.includes("unusual traffic") || t.includes("captcha");
    }

    function send(error = null) {
      if (sent) return;
      sent = true;
      clearInterval(timer);

      const html = error ? "" : extractContent();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[GAI] Sending ${html.length} chars for "${normQ}" (${elapsed}s)` +
          (error ? ` [error: ${error}]` : "")
      );

      const resultUrl = error ? null : location.href;
      const ts = Date.now();
      const cache = getCache();
      cache[normQ] = {
        html,
        ts,
        error: error || null,
        status: error ? "error" : "done",
        resultUrl: resultUrl || null,
      };

      // Limit cache to 10 entries
      const keys = Object.keys(cache);
      if (keys.length > 10) {
        const oldest = keys
          .filter((k) => cache[k].ts)
          .sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0))[0];
        if (oldest) delete cache[oldest];
      }
      setCache(cache);
    }

    const timer = setInterval(() => {
      if (sent) return;
      if (isErrorPage()) { send("error_page"); return; }

      const el = findContentEl();
      if (!el) { lastLen = -1; stableCount = 0; return; }

      const len = el.textContent.length;
      if (len > 0 && len === lastLen) {
        stableCount++;
        if (isResponseComplete() && stableCount >= 1) { send(); return; }
        if (stableCount >= 10) { send(); return; }
      } else {
        lastLen = len;
        stableCount = 0;
      }
    }, 500);

    setTimeout(() => { if (!sent) send(); }, 60000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CONTENT EXTRACTION (runs on Google side)
  // ═══════════════════════════════════════════════════════════════════════
  function extractContent() {
    const container = findBySelectors(CONTENT_SELS) || document.body;
    const clone = container.cloneNode(true);

    // 1. Strip unwanted elements
    for (const sel of STRIP_SELS) {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // 2. Remove display:none elements
    clone.querySelectorAll("*").forEach((el) => {
      const s = (el.getAttribute("style") || "").replace(/\s/g, "");
      if (s.includes("display:none")) el.remove();
    });

    // 3. Convert role="heading" → real <hN>
    clone.querySelectorAll('[role="heading"]').forEach((el) => {
      const level = el.getAttribute("aria-level") || "3";
      const h = document.createElement(`h${level}`);
      h.innerHTML = el.innerHTML;
      el.replaceWith(h);
    });

    // 4. Unwrap <strong>/<b> inside headings (avoid ### **text**)
    for (let i = 1; i <= 6; i++) {
      clone
        .querySelectorAll(`h${i} strong, h${i} b`)
        .forEach((s) => s.replaceWith(...s.childNodes));
    }

    // 5. Unwrap block elements nested inside inline elements
    //    (e.g. <strong><div class="Mat90e">…</div></strong>)
    clone.querySelectorAll("div, p, section").forEach((block) => {
      const parent = block.parentElement;
      if (parent && INLINE_TAGS.has(parent.tagName.toLowerCase())) {
        block.replaceWith(...block.childNodes);
      }
    });

    // 6. Remove empty <a> tags (leftover from overlay link stripping)
    clone.querySelectorAll("a").forEach((a) => {
      if (!a.textContent.trim()) a.remove();
    });

    // 7. Convert relative URLs → absolute google.com URLs
    clone.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("/")) {
        a.setAttribute("href", GOOGLE_ORIGIN + href);
      }
    });

    // 8. Strip non-essential attributes
    [clone, ...clone.querySelectorAll("*")].forEach((el) => {
      [...el.attributes].forEach((a) => {
        if (!KEEP_ATTRS.has(a.name.toLowerCase())) el.removeAttribute(a.name);
      });
    });

    // 9. Normalize whitespace text nodes (collapse newlines → space)
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const tn of textNodes) {
      if (!tn.parentElement?.closest("pre, code")) {
        tn.data = tn.data.replace(/[ \t]*\n[ \t]*/g, " ");
      }
    }

    // 10. Cascade-remove empty leaf elements
    let changed;
    do {
      changed = false;
      clone.querySelectorAll("*").forEach((el) => {
        if (!el.textContent.trim() && el.children.length === 0) {
          el.remove();
          changed = true;
        }
      });
    } while (changed);

    return clone.innerHTML.trim() || clone.textContent.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BRAVE SIDE — sidebar panel + background tab orchestration
  // ═══════════════════════════════════════════════════════════════════════
  function braveSide() {
    const ID = "gai";
    const CACHE_TTL = 900_000;

    const ICONS = {
      google: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`,
      copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
      check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34A853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      fail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA4335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
      reload: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 2.81-6.57L21 8"/></svg>`,
      open: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    };

    const SIDEBAR_SEL = [
      "aside.sidebar > .sidebar-content",
      "aside.side > .sidebar-content",
      "aside.sidebar",
      "aside.side",
      "aside",
    ];

    const $ = (s) => document.querySelector(s);
    const getQ = () =>
      normalizeQ(new URLSearchParams(location.search).get("q"));
    const findSidebar = () => findBySelectors(SIDEBAR_SEL);

    GM_addStyle(`
      #${ID}{margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.07);background:#161618;font-family:system-ui,-apple-system,sans-serif}
      #${ID}.float{position:fixed;right:16px;top:68px;width:400px;max-height:calc(100vh - 84px);overflow-y:auto;z-index:9999;box-shadow:0 8px 40px rgba(0,0,0,.55)}
      .${ID}-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:linear-gradient(135deg,rgba(66,133,244,.06),rgba(99,102,241,.04));border-bottom:1px solid rgba(255,255,255,.05);position:relative}
      .${ID}-tag{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:#8e8e96;text-transform:uppercase;letter-spacing:.05em}
      .${ID}-acts{display:flex;gap:4px}
      .${ID}-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 6px;border-radius:6px;font-size:13px;color:#707078;border:1px solid rgba(255,255,255,.07);transition:all .15s;text-decoration:none}
      .${ID}-btn:hover{color:#e0e0e4;border-color:rgba(255,255,255,.14)}
      .${ID}-toast{position:absolute;right:8px;top:calc(100% + 4px);background:#1e1e22;color:#e0e0e4;font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);opacity:0;transform:translateY(-4px);transition:all .2s;pointer-events:none;white-space:nowrap;z-index:10}
      .${ID}-toast.show{opacity:1;transform:translateY(0)}
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
    let lastHTML = null;
    let lastResultUrl = null;
    let activePollTimer = null;
    let activePollTimeout = null;
    let domObserver = null;

    // ── DRY: Markdown converter ──
    function htmlToMarkdown(element) {
      let md = "";
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          md += node.textContent;
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const tag = node.tagName.toLowerCase();
        const inner = htmlToMarkdown(node);

        // Headings h1–h6 (consolidated)
        if (/^h[1-6]$/.test(tag)) {
          const lvl = parseInt(tag[1]);
          md += `\n\n${"#".repeat(lvl)} ${inner.trim()}\n\n`;
          continue;
        }

        switch (tag) {
          case "p":
            md += `\n\n${inner.trim()}\n\n`;
            break;
          case "div": {
            const t = inner.trim();
            if (t) md += `\n${t}\n`;
            break;
          }
          case "strong":
          case "b": {
            // Trim and collapse whitespace before punctuation
            const c = inner.trim().replace(/\s+(?=[:;,.!?])/g, "");
            if (c) md += `**${c}**`;
            break;
          }
          case "em":
          case "i": {
            const c = inner.trim();
            if (c) md += `*${c}*`;
            break;
          }
          case "mark": {
            const c = inner.trim();
            if (c) md += `==${c}==`;
            break;
          }
          case "a": {
            const href = node.getAttribute("href") || "";
            const text = inner.trim();
            if (!text) break; // skip empty links
            md += `[${text}](${href})`;
            break;
          }
          case "ul":
          case "ol":
            md += `\n${inner}\n`;
            break;
          case "li": {
            const parent = node.parentElement;
            const isOl =
              parent && parent.tagName.toLowerCase() === "ol";
            const cleaned = inner
              .replace(/^\n+/, "")
              .replace(/\n+$/, "")
              .replace(/\n{2,}/g, "\n  ");
            if (isOl) {
              const idx =
                Array.from(parent.children).indexOf(node) + 1;
              md += `\n${idx}. ${cleaned}`;
            } else {
              md += `\n- ${cleaned}`;
            }
            break;
          }
          case "code":
            md += `\`${inner}\``;
            break;
          case "pre":
            md += `\n\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
            break;
          case "table":
            md += `\n\n${inner}\n\n`;
            break;
          case "thead":
          case "tbody":
            md += inner;
            break;
          case "tr": {
            md += `\n| ${inner}`;
            if (node.querySelector("th")) {
              const cols = node.querySelectorAll("th, td").length;
              md += `\n| ${"--- | ".repeat(cols)}`;
            }
            break;
          }
          case "th":
          case "td":
            md += `${inner
              .replace(/\n/g, " ")
              .replace(/\s+/g, " ")
              .trim()} | `;
            break;
          case "br":
            md += "\n";
            break;
          case "span":
          default:
            md += inner;
        }
      }
      return md;
    }

    /** Final cleanup pass on markdown output */
    function cleanMarkdown(raw) {
      return raw
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+$/gm, "")
        .replace(/^\n+/, "")
        .replace(/\n+$/, "")
        .trim();
    }

    // ── DRY: Clipboard with fallback ──
    function writeClipboard(text) {
      const fallback = () =>
        new Promise((resolve, reject) => {
          const ta = Object.assign(document.createElement("textarea"), {
            value: text,
          });
          ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            ta.remove();
            resolve();
          } catch (e) {
            ta.remove();
            reject(e);
          }
        });

      return navigator.clipboard?.writeText
        ? navigator.clipboard.writeText(text).catch(fallback)
        : fallback();
    }

    // ── DRY: Button feedback + toast ──
    function showToast(panel, message, success) {
      let toast = panel.querySelector(`.${ID}-toast`);
      if (!toast) {
        toast = document.createElement("div");
        toast.className = `${ID}-toast`;
        const bar = panel.querySelector(`.${ID}-bar`);
        (bar || panel).appendChild(toast);
      }
      toast.textContent = message;
      toast.style.color = success ? "#34A853" : "#EA4335";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1800);
    }

    function showBtnFeedback(btn, panel, success) {
      btn.innerHTML = success ? ICONS.check : ICONS.fail;
      btn.style.color = success ? "#34A853" : "#EA4335";
      btn.style.borderColor = success
        ? "rgba(52,168,83,.3)"
        : "rgba(234,67,53,.3)";
      showToast(panel, success ? "Copied to clipboard!" : "Copy failed", success);
      setTimeout(() => {
        btn.innerHTML = ICONS.copy;
        btn.style.color = "";
        btn.style.borderColor = "";
      }, 1800);
    }

    // ── DRY: Handle a cache entry (render result or error) ──
    function handleCacheEntry(entry, q) {
      if (entry.error) {
        renderError(
          entry.error === "error_page"
            ? "⚠️ Google blocked the request (CAPTCHA / sign-in)."
            : `⚠️ Error: ${entry.error}`,
          q
        );
      } else if (entry.html) {
        renderContent(entry.html, entry.resultUrl);
      } else {
        renderError("⚠️ Empty response received.", q);
      }
    }

    // ── UI helpers ──
    function loadingHTML(step = "Opening background tab…") {
      return `<div class="${ID}-load">
        <div class="${ID}-spin"></div>
        <div class="${ID}-msg">Fetching <b>Google AI Mode</b> response…</div>
        <div class="${ID}-step" id="${ID}-step">${step}</div>
      </div>`;
    }

    function setStep(text) {
      const el = $(`#${ID}-step`);
      if (el) el.textContent = text;
    }

    // ── Tab & listener management ──
    function clearListener() {
      if (listenerId !== null) {
        try { GM_removeValueChangeListener(listenerId); } catch (_) {}
        listenerId = null;
      }
    }

    function closeTab() {
      if (googleTab && !googleTab.closed) {
        try { googleTab.close(); } catch (_) {}
      }
      googleTab = null;
    }

    function cleanupFetch() {
      closeTab();
      clearListener();
    }

    function clearFetchLock(q) {
      const cache = getCache();
      if (cache[q] && cache[q].status === "fetching") {
        delete cache[q];
        setCache(cache);
      }
    }

    function getOpenUrl(q) {
      if (lastResultUrl) return lastResultUrl;
      const entry = getCache()[q];
      if (entry && entry.resultUrl) return entry.resultUrl;
      return googleUrl(q);
    }

    function updateOpenLink(q) {
      const link = document.querySelector(
        `#${ID} a.${ID}-btn[title="Open in tab"]`
      );
      if (link) link.href = getOpenUrl(q);
    }

    function renderContent(html, resultUrl) {
      lastHTML = html;
      if (resultUrl) lastResultUrl = resultUrl;
      const bodyEl = $(`#${ID}-body`);
      if (!bodyEl) return;
      bodyEl.innerHTML = `<div class="${ID}-content">${html}</div>`;
      updateOpenLink(currentQuery || lastQuery);
    }

    function renderError(msg, q) {
      lastHTML = null;
      lastResultUrl = null;
      const bodyEl = $(`#${ID}-body`);
      if (!bodyEl) return;
      bodyEl.innerHTML = `<div class="${ID}-err">
        ${msg}<br>
        <a class="${ID}-cta" href="${googleUrl(q)}" target="_blank">
          ✨ Open Manually →
        </a>
      </div>`;
    }

    // ── Build panel ──
    function buildPanel(q) {
      const panel = document.createElement("div");
      panel.id = ID;
      panel.innerHTML = `
        <div class="${ID}-bar">
          <span class="${ID}-tag">${ICONS.google} Google AI Mode</span>
          <span class="${ID}-acts">
            <button class="${ID}-btn" data-act="copy" title="Copy text">${ICONS.copy}</button>
            <button class="${ID}-btn" data-act="reload" title="Reload">${ICONS.reload}</button>
            <a class="${ID}-btn" href="${getOpenUrl(q)}" target="_blank" title="Open in tab">${ICONS.open}</a>
          </span>
        </div>
        <div id="${ID}-body">${loadingHTML()}</div>`;

      panel
        .querySelector('[data-act="reload"]')
        .addEventListener("click", () => {
          lastHTML = null;
          lastResultUrl = null;
          const q = getQ();
          const cache = getCache();
          if (cache[q]) { delete cache[q]; setCache(cache); }
          startFetch(q, true);
        });

      panel
        .querySelector('[data-act="copy"]')
        .addEventListener("click", (e) => {
          const content = panel.querySelector(`.${ID}-content`);
          if (!content) {
            showToast(panel, "Nothing to copy", false);
            return;
          }
          const text = cleanMarkdown(htmlToMarkdown(content));
          const btn = e.currentTarget;
          writeClipboard(text)
            .then(() => showBtnFeedback(btn, panel, true))
            .catch(() => showBtnFeedback(btn, panel, false));
        });

      return panel;
    }

    // ── Insert panel DOM ──
    function insertPanel(q) {
      const panel = buildPanel(q);
      const sidebar = findSidebar();
      if (sidebar) {
        sidebar.prepend(panel);
      } else {
        panel.classList.add("float");
        document.body.appendChild(panel);
      }
      startDOMObserver();
      return panel;
    }

    // ── Start fetch with global lock ──
    function startFetch(q, forceBypass = false) {
      const gen = ++fetchGen;
      const fetchStartTime = Date.now();
      currentQuery = q;
      const bodyEl = $(`#${ID}-body`);
      if (!bodyEl) return;

      // Check if another tab is already fetching
      if (!forceBypass) {
        const entry = getCache()[q];
        if (
          entry &&
          entry.status === "fetching" &&
          entry.ts &&
          Date.now() - entry.ts < FETCH_LOCK_TTL
        ) {
          console.log("[GAI-Brave] Another tab is fetching, waiting…");
          bodyEl.innerHTML = loadingHTML("Another tab is fetching…");

          listenerId = GM_addValueChangeListener(
            CACHE_KEY,
            (_k, _o, newVal, _r) => {
              if (gen !== fetchGen || !newVal?.[q]) return;
              const u = newVal[q];
              if (u.status === "fetching") {
                setStep("Still waiting for other tab…");
                return;
              }
              clearListener();
              handleCacheEntry(u, q);
            }
          );

          setTimeout(() => {
            if (gen !== fetchGen || lastHTML) return;
            const body = $(`#${ID}-body`);
            if (body?.querySelector(`.${ID}-load`)) {
              clearListener();
              startFetch(q, true);
            }
          }, FETCH_LOCK_TTL);

          return;
        }
      }

      // Set fetch lock
      const cache = getCache();
      cache[q] = {
        status: "fetching",
        ts: fetchStartTime,
        html: "",
        error: null,
        resultUrl: null,
      };
      setCache(cache);

      bodyEl.innerHTML = loadingHTML("Opening background tab…");
      cleanupFetch();

      // Listen for result from Google tab
      listenerId = GM_addValueChangeListener(
        CACHE_KEY,
        (_k, _o, newVal, _r) => {
          if (!newVal?.[currentQuery]) return;
          const entry = newVal[currentQuery];
          if (entry.status === "fetching") return;
          if (!entry.ts || entry.ts < fetchStartTime) return;
          if (gen !== fetchGen) return;

          clearListener();
          handleCacheEntry(entry, currentQuery);
          closeTab();
        }
      );

      // Open background tab
      const url = aiUrl(q);
      try {
        googleTab = GM_openInTab(url, {
          active: false,
          insert: true,
          setParent: true,
        });
        console.log("[GAI-Brave] Background tab opened");
        setStep("Waiting for AI response…");

        // Detect premature tab close
        if (googleTab?.onclose !== undefined) {
          googleTab.onclose = () => {
            if (gen !== fetchGen) return;
            setStep("Processing…");
            setTimeout(() => {
              if (gen !== fetchGen || lastHTML) return;
              const entry = getCache()[currentQuery];
              if (!entry || entry.status === "fetching") {
                clearListener();
                clearFetchLock(currentQuery);
                renderError(
                  "⚠️ Background tab closed before completing.",
                  currentQuery
                );
              }
            }, 2000);
          };
        }
      } catch (e) {
        console.error("[GAI-Brave] Failed to open tab:", e);
        clearFetchLock(q);
        renderError("⚠️ Could not open background tab.", q);
        return;
      }

      // Hard timeout
      setTimeout(() => {
        if (gen !== fetchGen || lastHTML) return;
        cleanupFetch();
        clearFetchLock(q);
        if ($(`#${ID}-body`)?.querySelector(`.${ID}-load`)) {
          renderError("⚠️ Timed out waiting for response.", q);
        }
      }, 60000);
    }

    // ── Inject (first time) ──
    function inject() {
      const q = getQ();
      if (!q || injected) return;
      injected = true;
      lastQuery = q;
      currentQuery = q;
      insertPanel(q);

      const cached = getCache()[q];
      if (
        cached &&
        cached.status === "done" &&
        !cached.error &&
        cached.html &&
        Date.now() - cached.ts < CACHE_TTL
      ) {
        console.log("[GAI-Brave] Using cached result");
        renderContent(cached.html, cached.resultUrl);
        return;
      }

      startFetch(q);
    }

    // ── Reinject (SPA destroyed panel) ──
    function reinject() {
      const q = getQ();
      if (!q) return;
      console.log("[GAI-Brave] Panel removed by SPA, re-inserting");
      insertPanel(q);
      if (lastHTML) renderContent(lastHTML, lastResultUrl);
    }

    // ── Sidebar poll (brief, for initial sidebar detection) ──
    function startSidebarPoll(delay) {
      if (activePollTimeout) clearTimeout(activePollTimeout);
      if (activePollTimer) clearInterval(activePollTimer);
      activePollTimeout = null;
      activePollTimer = null;

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

      delay > 0
        ? (activePollTimeout = setTimeout(run, delay))
        : run();
    }

    // ── MutationObserver replaces permanent setInterval ──
    function startDOMObserver() {
      if (domObserver) return;
      let debounceTimer = null;
      domObserver = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleDOMChange, 300);
      });
      domObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    function handleDOMChange() {
      const currentQ = getQ();
      if (!currentQ) return;

      // Query changed → full reinit
      if (currentQ !== lastQuery) {
        console.log("[GAI-Brave] Query changed:", currentQ);
        lastQuery = currentQ;
        injected = false;
        lastHTML = null;
        lastResultUrl = null;
        $(`#${ID}`)?.remove();
        cleanupFetch();
        startSidebarPoll(300);
        return;
      }

      // Float → sidebar migration
      const floatPanel = $(`#${ID}.float`);
      if (floatPanel) {
        const sidebar = findSidebar();
        if (sidebar) {
          floatPanel.classList.remove("float");
          sidebar.prepend(floatPanel);
        }
        return;
      }

      // Panel removed by SPA → re-insert
      if (injected && !$(`#${ID}`)) reinject();
    }

    // ── Navigation hooks ──
    function hookHistory(method) {
      const orig = history[method].bind(history);
      history[method] = function (...args) {
        orig(...args);
        setTimeout(handleDOMChange, 100);
      };
    }
    hookHistory("pushState");
    hookHistory("replaceState");
    window.addEventListener("popstate", () =>
      setTimeout(handleDOMChange, 100)
    );

    // ── Kick off ──
    startSidebarPoll(0);
  }
})();