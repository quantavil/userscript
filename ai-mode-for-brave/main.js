// ==UserScript==
// @name         Google AI Mode for Brave Search (fixed)
// @namespace    brave-google-ai-mode
// @version      1.5
// @description  Fetch Google AI Mode / Google Search answers and show them in the Brave Search sidebar
// @author       You
// @match        https://search.brave.com/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      google.com
// @connect      www.google.com
// @connect      consent.google.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const query = new URLSearchParams(location.search).get("q");
  if (!query) return;

  const GOOGLE_AI_URL =
    "https://www.google.com/search?udm=50&hl=en&q=" + encodeURIComponent(query);

  const GOOGLE_SEARCH_URL =
    "https://www.google.com/search?hl=en&q=" + encodeURIComponent(query);

  const LOG = (...args) => console.log("[GAI]", ...args);
  const WARN = (...args) => console.warn("[GAI]", ...args);

  // Remove previous widget if Brave/Svelte rehydrates strangely
  const prev = document.getElementById("gai-widget");
  if (prev) prev.remove();

  GM_addStyle(`
    #gai-widget{
      display:block !important;
      width:100%;
      box-sizing:border-box;
      background:var(--color-card-bg,#fff);
      border:1px solid var(--color-divider-subtle,#dadce0);
      border-radius:16px;
      padding:16px;
      margin:0 0 16px 0;
      font-family:inherit;
      color:var(--color-text-main,#202124);
      overflow:hidden;
    }

    [data-theme="dark"] #gai-widget,
    .dark #gai-widget{
      background:var(--color-card-bg,#303134);
      border-color:var(--color-divider-subtle,#5f6368);
    }

    .gai-hdr{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:12px;
    }

    .gai-hdr-left{
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
    }

    .gai-hdr-title{
      font-size:15px;
      font-weight:700;
      color:var(--color-text-main,#202124);
      white-space:nowrap;
    }

    .gai-badge{
      font-size:11px;
      font-weight:600;
      white-space:nowrap;
      padding:4px 8px;
      border-radius:999px;
      background:rgba(66,133,244,.12);
      color:#1a73e8;
    }

    .gai-status{
      display:flex;
      align-items:center;
      gap:10px;
      font-size:13px;
      color:var(--color-text-secondary,#70757a);
    }

    .gai-spinner{
      width:18px;
      height:18px;
      border:2.5px solid var(--color-divider-subtle,#dadce0);
      border-top-color:#4285f4;
      border-radius:50%;
      animation:gaispin .7s linear infinite;
      flex:0 0 auto;
    }

    @keyframes gaispin{
      to{transform:rotate(360deg)}
    }

    .gai-main[hidden],
    .gai-status[hidden]{
      display:none !important;
    }

    .gai-note{
      font-size:12px;
      color:var(--color-text-secondary,#70757a);
      margin-bottom:10px;
    }

    .gai-body{
      font-size:14px;
      line-height:1.7;
      color:var(--color-text-main,#3c4043);
      overflow-wrap:anywhere;
    }

    .gai-body p{
      margin:0 0 10px 0;
    }

    .gai-body.gai-collapsed{
      max-height:300px;
      overflow:hidden;
      -webkit-mask-image:linear-gradient(180deg,#000 65%,transparent);
      mask-image:linear-gradient(180deg,#000 65%,transparent);
    }

    .gai-toggle{
      appearance:none;
      border:0;
      background:none;
      padding:0;
      margin-top:6px;
      cursor:pointer;
      color:var(--color-link,#1a0dab);
      font-size:13px;
    }

    .gai-toggle:hover{
      text-decoration:underline;
    }

    .gai-sources{
      margin-top:14px;
      padding-top:10px;
      border-top:1px solid var(--color-divider-subtle,#dadce0);
    }

    .gai-src-title{
      font-size:11px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:.5px;
      color:var(--color-text-secondary,#70757a);
      margin-bottom:8px;
    }

    .gai-src{
      display:block;
      text-decoration:none;
      padding:6px 0;
      color:var(--color-link,#1a0dab);
    }

    .gai-src:hover .gai-src-name{
      text-decoration:underline;
    }

    .gai-src-name{
      display:block;
      font-size:13px;
      line-height:1.35;
    }

    .gai-src-domain{
      display:block;
      font-size:11px;
      margin-top:2px;
      color:var(--color-text-secondary,#70757a);
    }

    .gai-actions{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:12px;
    }

    .gai-btn,
    .gai-open{
      appearance:none;
      border:1px solid var(--color-divider-subtle,#dadce0);
      background:transparent;
      color:var(--color-text-main,#202124);
      border-radius:999px;
      padding:7px 12px;
      font-size:12px;
      line-height:1;
      cursor:pointer;
      text-decoration:none;
    }

    .gai-btn:hover,
    .gai-open:hover{
      background:rgba(0,0,0,.04);
      text-decoration:none;
    }

    .gai-error{
      font-size:13px;
      color:var(--color-text-secondary,#70757a);
      line-height:1.6;
    }
  `);

  const W = buildWidget();
  ensureMounted();

  const mountObserver = new MutationObserver(() => {
    ensureMounted();
  });

  mountObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const keepAlive = setInterval(() => {
    if (!W.isConnected) ensureMounted();
  }, 1500);

  window.addEventListener("beforeunload", () => {
    mountObserver.disconnect();
    clearInterval(keepAlive);
  });

  run().catch((err) => {
    console.error("[GAI] fatal", err);
    showError("Unexpected error.");
  });

  async function run() {
    LOG("query =", query);

    showLoading("Fetching Google AI Mode…");

    let aiData = null;
    try {
      const aiHTML = await fetchHTML(GOOGLE_AI_URL);
      aiData = extractAI(aiHTML);
      if (aiData) {
        LOG("✓ AI Mode content found");
        render(aiData);
        return;
      }
    } catch (e) {
      WARN("AI Mode fetch failed:", e && e.message ? e.message : e);
    }

    LOG("AI Mode empty, trying regular search…");
    showLoading("AI Mode unavailable, trying Google Search…");

    let regularData = null;
    try {
      const regHTML = await fetchHTML(GOOGLE_SEARCH_URL);
      regularData = extractRegular(regHTML);
      if (regularData) {
        LOG("✓ Regular search content found");
        render(regularData);
        return;
      }
    } catch (e) {
      WARN("Regular search fetch failed:", e && e.message ? e.message : e);
    }

    showError("No extractable answer found for this query.");
  }

  function buildWidget() {
    const el = document.createElement("section");
    el.id = "gai-widget";
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `
      <div class="gai-hdr">
        <div class="gai-hdr-left">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"></path>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
          </svg>
          <div class="gai-hdr-title">Google AI Mode</div>
        </div>
        <div class="gai-badge">loading</div>
      </div>

      <div class="gai-status">
        <span class="gai-spinner" aria-hidden="true"></span>
        <span class="gai-status-text">Fetching Google AI Mode…</span>
      </div>

      <div class="gai-main" hidden></div>
    `;
    return el;
  }

  function ensureMounted() {
    const sidebarContent =
      document.querySelector("aside.sidebar .sidebar-content") ||
      document.querySelector(".sidebar-content");

    if (sidebarContent) {
      if (W.parentElement !== sidebarContent) {
        sidebarContent.prepend(W);
        LOG("mounted in sidebar-content");
      }
      return true;
    }

    const fallback =
      document.querySelector("#results") || document.querySelector("main");

    if (fallback) {
      if (W.parentElement !== fallback) {
        fallback.prepend(W);
        LOG("mounted in fallback results/main");
      }
      return true;
    }

    return false;
  }

  function showLoading(text) {
    const badge = W.querySelector(".gai-badge");
    const status = W.querySelector(".gai-status");
    const statusText = W.querySelector(".gai-status-text");
    const main = W.querySelector(".gai-main");

    badge.textContent = "loading";
    status.hidden = false;
    statusText.textContent = text;
    main.hidden = true;
    main.textContent = "";
  }

  function showError(text) {
    const badge = W.querySelector(".gai-badge");
    const status = W.querySelector(".gai-status");
    const main = W.querySelector(".gai-main");

    badge.textContent = "error";
    status.hidden = true;
    main.hidden = false;
    main.textContent = "";

    const err = document.createElement("div");
    err.className = "gai-error";
    err.textContent = text;

    const actions = document.createElement("div");
    actions.className = "gai-actions";

    const openAI = makeLinkButton("Open AI Mode", GOOGLE_AI_URL);
    const openSearch = makeLinkButton("Open Google Search", GOOGLE_SEARCH_URL);

    actions.appendChild(openAI);
    actions.appendChild(openSearch);

    main.appendChild(err);
    main.appendChild(actions);
  }

  function render(data) {
    const badge = W.querySelector(".gai-badge");
    const status = W.querySelector(".gai-status");
    const main = W.querySelector(".gai-main");

    badge.textContent = data.from === "ai" ? "AI mode" : "search fallback";
    status.hidden = true;
    main.hidden = false;
    main.textContent = "";

    const note = document.createElement("div");
    note.className = "gai-note";
    note.textContent =
      data.from === "ai"
        ? "Extracted from Google AI Mode."
        : "Google AI Mode was unavailable, so this was extracted from normal Google results.";

    const body = document.createElement("div");
    body.className = "gai-body";

    const blocks = Array.isArray(data.blocks) ? data.blocks : [data.text];
    blocks.forEach((block) => {
      const p = document.createElement("p");
      p.textContent = block;
      body.appendChild(p);
    });

    main.appendChild(note);
    main.appendChild(body);

    requestAnimationFrame(() => {
      if (body.scrollHeight > 300) {
        body.classList.add("gai-collapsed");
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "gai-toggle";
        toggle.textContent = "▼ Show more";
        toggle.addEventListener("click", () => {
          const collapsed = body.classList.toggle("gai-collapsed");
          toggle.textContent = collapsed ? "▼ Show more" : "▲ Show less";
        });
        body.after(toggle);
      }
    });

    if (data.sources && data.sources.length) {
      const srcWrap = document.createElement("div");
      srcWrap.className = "gai-sources";

      const srcTitle = document.createElement("div");
      srcTitle.className = "gai-src-title";
      srcTitle.textContent = "Sources";
      srcWrap.appendChild(srcTitle);

      data.sources.forEach((s) => {
        const a = document.createElement("a");
        a.className = "gai-src";
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const name = document.createElement("span");
        name.className = "gai-src-name";
        name.textContent = s.text || s.domain || s.url;

        const domain = document.createElement("span");
        domain.className = "gai-src-domain";
        domain.textContent = s.domain || safeDomain(s.url);

        a.appendChild(name);
        a.appendChild(domain);
        srcWrap.appendChild(a);
      });

      main.appendChild(srcWrap);
    }

    const actions = document.createElement("div");
    actions.className = "gai-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "gai-btn";
    copyBtn.textContent = "Copy";

    copyBtn.addEventListener("click", async () => {
      const ok = await copyText(data.text || blocks.join("\n\n"));
      const old = copyBtn.textContent;
      copyBtn.textContent = ok ? "Copied!" : "Copy failed";
      setTimeout(() => {
        copyBtn.textContent = old;
      }, 1200);
    });

    actions.appendChild(copyBtn);
    actions.appendChild(makeLinkButton("Open AI Mode", GOOGLE_AI_URL));
    actions.appendChild(makeLinkButton("Open Google Search", GOOGLE_SEARCH_URL));

    main.appendChild(actions);
  }

  function makeLinkButton(label, url) {
    const a = document.createElement("a");
    a.className = "gai-open";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    return a;
  }

  function fetchHTML(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 20000,
        onload(r) {
          LOG("Fetch", url, "→", r.status, "|", (r.responseText || "").length, "bytes");
          if (r.status >= 200 && r.status < 300) {
            resolve(r.responseText || "");
          } else {
            reject(new Error("HTTP " + r.status));
          }
        },
        onerror() {
          reject(new Error("Network error"));
        },
        ontimeout() {
          reject(new Error("Timed out"));
        },
      });
    });
  }

  function extractAI(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    LOG("page title:", doc.title || "(no title)");

    const copyButtons = Array.from(
      doc.querySelectorAll('button[aria-label="Copy text"]')
    );

    if (!copyButtons.length) {
      LOG("AI marker not found");
      return null;
    }

    LOG("AI copy buttons found:", copyButtons.length);

    let best = null;

    for (const btn of copyButtons) {
      let p = btn.parentElement;
      let depth = 0;

      while (p && depth < 12) {
        const clone = p.cloneNode(true);
        pruneNode(clone);

        const blocks = dedupeBlocks(extractBlocksFromNode(clone)).slice(0, 12);
        const text = blocks.join("\n\n").trim();
        const sources = collectSources(clone, 10);

        let score = Math.min(text.length, 2500) + blocks.length * 80 + sources.length * 120;
        if (text.length > 5500) score -= 900;
        if (blocks.length < 2) score -= 250;

        if (!best || score > best.score) {
          best = {
            score,
            blocks,
            text,
            sources,
          };
        }

        p = p.parentElement;
        depth++;
      }
    }

    if (best) {
      LOG(
        "AI candidate:",
        best.blocks.length,
        "blocks,",
        best.text.length,
        "chars,",
        best.sources.length,
        "sources"
      );
    }

    if (best && best.text.length >= 35) {
      return {
        from: "ai",
        blocks: best.blocks,
        text: best.text,
        sources: best.sources,
      };
    }

    return null;
  }

  function extractRegular(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    LOG("page title:", doc.title || "(no title)");

    const root =
      doc.querySelector("#search") ||
      doc.querySelector("#center_col") ||
      doc.body;

    LOG(
      "fallback container:",
      root.id || root.className || root.tagName.toLowerCase()
    );

    let blocks = pickBlocksBySelectors(
      root,
      [
        ".M8OgIe",
        ".hgKElc",
        ".IZ6rdc",
        ".kno-rdesc span",
        '[data-attrid="description"] span',
        ".yDYNvb",
        ".VwiC3b",
        ".s3v9rd",
        ".wDYxhc",
        ".X5LH0c"
      ],
      25,
      4
    );

    if (!blocks.length) {
      const clone = root.cloneNode(true);
      pruneNode(clone);
      blocks = dedupeBlocks(extractBlocksFromNode(clone)).slice(0, 4);
    }

    const text = dedupeBlocks(blocks).join("\n\n").trim();
    const sources = collectSources(root, 10);

    if (text.length < 25) {
      LOG("container text too short");
      return null;
    }

    LOG("extracted", blocks.length, "blocks (" + text.length + " chars),", sources.length, "sources");

    return {
      from: "search",
      blocks: dedupeBlocks(blocks),
      text,
      sources,
    };
  }

  function pickBlocksBySelectors(root, selectors, minLen, maxBlocks) {
    const out = [];
    const seen = new Set();

    for (const sel of selectors) {
      const nodes = root.querySelectorAll(sel);
      for (const el of nodes) {
        const t = cleanText(el.textContent || "");
        if (t.length < minLen) continue;

        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        LOG("hit selector", sel, "→", t.length, "chars");
        out.push(t);

        if (out.length >= maxBlocks) return out;
      }
    }

    return out;
  }

  function pruneNode(root) {
    const removeSelector = [
      "script",
      "style",
      "noscript",
      "iframe",
      "img",
      "svg",
      "video",
      "audio",
      "canvas",
      "form",
      "button",
      "input",
      "textarea",
      "select",
      "label",
      "[role='dialog']",
      "[hidden]",
      "[aria-hidden='true']",
      "[style*='display: none']",
      "[style*='visibility: hidden']",
      "#searchform",
      "#top_nav",
      "#appbar",
      "#botstuff",
      "#footcnt",
      "#tophf",
      "#sfooter",
      "#rhs",
      "#rhsads"
    ].join(",");

    root.querySelectorAll(removeSelector).forEach((el) => el.remove());

    root
      .querySelectorAll(".tHaXU,.eksFZe,.qacuz,[id^='shrproxy'],[id^='fbproxy']")
      .forEach((el) => el.remove());

    root.querySelectorAll("*").forEach((el) => {
      const t = cleanText(el.textContent || "");
      if (!t || t.length > 30) return;
      if (
        /^(copy|share|good response|bad response|feedback|close|thank you|creating a public link…|create a public link…)$/.test(
          t.toLowerCase()
        )
      ) {
        el.remove();
      }
    });
  }

  function extractBlocksFromNode(root) {
    const out = [];
    const seen = new Set();

    function add(t, bullet) {
      t = cleanText(t);
      if (!t || t.length < 25) return;
      if (bullet && !t.startsWith("• ")) t = "• " + t;
      const key = t.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(t);
    }

    root.querySelectorAll("p,li,h1,h2,h3,h4,h5,h6,blockquote,pre").forEach((el) => {
      add(el.textContent || "", el.tagName.toLowerCase() === "li");
    });

    if (!out.length) {
      root.querySelectorAll("div,section,article").forEach((el) => {
        if (el.querySelector("p,li,h1,h2,h3,h4,h5,h6,blockquote,pre")) return;
        if (el.children.length > 6) return;
        add(el.textContent || "", false);
      });
    }

    if (!out.length) {
      add(root.textContent || "", false);
    }

    return out;
  }

  function collectSources(root, max) {
    const out = [];
    const seen = new Set();

    root.querySelectorAll("a[href]").forEach((a) => {
      if (out.length >= max) return;

      let href = a.getAttribute("href") || "";
      href = unwrapGoogleUrl(href);

      if (!/^https?:\/\//i.test(href)) return;

      let u;
      try {
        u = new URL(href);
      } catch {
        return;
      }

      const host = u.hostname.replace(/^www\./i, "");
      if (/google\./i.test(host)) return;

      const finalURL = u.href;
      if (seen.has(finalURL)) return;
      seen.add(finalURL);

      let text = cleanText(a.textContent || "");
      if (!text) text = host;
      if (text.length > 120) text = text.slice(0, 117) + "…";

      out.push({
        url: finalURL,
        text,
        domain: host,
      });
    });

    return out;
  }

  function unwrapGoogleUrl(href) {
    if (!href) return "";

    try {
      let full = href;
      if (href.startsWith("/")) full = "https://www.google.com" + href;

      const url = new URL(full);

      if (/google\./i.test(url.hostname)) {
        const q =
          url.searchParams.get("q") ||
          url.searchParams.get("url") ||
          url.searchParams.get("imgurl");
        if (q && /^https?:\/\//i.test(q)) return q;
      }

      return url.href;
    } catch {
      return href;
    }
  }

  function dedupeBlocks(arr) {
    const out = [];
    const seen = [];

    for (let t of arr || []) {
      t = cleanText(t);
      if (!t) continue;

      const key = t.toLowerCase();

      if (
        seen.some((s) => s === key || s.includes(key) || key.includes(s))
      ) {
        continue;
      }

      seen.push(key);
      out.push(t);
    }

    return out;
  }

  function cleanText(s) {
    return String(s || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeDomain(u) {
    try {
      return new URL(u).hostname.replace(/^www\./i, "");
    } catch {
      return "";
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (_) {
      return false;
    }
  }
})();