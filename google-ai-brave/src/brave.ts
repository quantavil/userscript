/**
 * Brave-side logic.
 *
 * Renders a sidebar panel on search.brave.com, orchestrates a background-tab
 * fetch of the Google AI Mode response, and displays the result with KaTeX-
 * rendered LaTeX.
 */

import {
  PANEL_ID as ID,
  CACHE_KEY,
  CACHE_TTL,
  FETCH_LOCK_TTL,
  SIDEBAR_SELS,
  AI_RE,
  googleUrl,
  aiUrl,
} from "./constants";
import type { Cache, CacheEntry } from "./types";
import {
  normalizeQ,
  stripAIFlag,
  getCache,
  setCache,
  findBySelectors,
  writeClipboard,
} from "./utils";
import { ICONS } from "./icons";
import { PANEL_CSS } from "./styles";
import { htmlToMarkdown, cleanMarkdown } from "./markdown";
import { renderLatex } from "./katex-render";

export function braveSide(): void {
  // ── Shortcuts ─────────────────────────────────────────────────────────

  const $ = (sel: string) => document.querySelector(sel);

  const getQ = (): string =>
    normalizeQ(new URLSearchParams(location.search).get("q") ?? "");

  const findSidebar = (): Element | null => findBySelectors(SIDEBAR_SELS);

  // ── Inject styles ─────────────────────────────────────────────────────

  GM_addStyle(PANEL_CSS);

  // ── Mutable state ─────────────────────────────────────────────────────

  let googleTab: GMTab | null = null;
  let listenerId: number | null = null;
  let activeQuery = getQ();
  let injected = false;
  let fetchGen = 0;
  let lastHTML: string | null = null;
  let lastResultUrl: string | null = null;
  let activePollTimer: number | null = null;
  let activePollTimeout: number | null = null;
  let domObserver: MutationObserver | null = null;

  // ═════════════════════════════════════════════════════════════════════
  //  UI FEEDBACK
  // ═════════════════════════════════════════════════════════════════════

  function showToast(
    panel: Element,
    message: string,
    success: boolean,
  ): void {
    let toast = panel.querySelector(`.${ID}-toast`) as HTMLElement | null;
    if (!toast) {
      toast = document.createElement("div");
      toast.className = `${ID}-toast`;
      const bar = panel.querySelector(`.${ID}-bar`);
      (bar ?? panel).appendChild(toast);
    }
    toast.textContent = message;
    toast.style.color = success ? "#34A853" : "#EA4335";
    toast.classList.add("show");
    setTimeout(() => toast!.classList.remove("show"), 1800);
  }

  function showBtnFeedback(
    btn: HTMLElement,
    panel: Element,
    success: boolean,
  ): void {
    btn.innerHTML = success ? ICONS.check : ICONS.fail;
    btn.style.color = success ? "#34A853" : "#EA4335";
    btn.style.borderColor = success
      ? "rgba(52,168,83,.3)"
      : "rgba(234,67,53,.3)";

    showToast(
      panel,
      success ? "Copied to clipboard!" : "Copy failed",
      success,
    );

    setTimeout(() => {
      btn.innerHTML = ICONS.copy;
      btn.style.color = "";
      btn.style.borderColor = "";
    }, 1800);
  }

  // ═════════════════════════════════════════════════════════════════════
  //  TAB & LISTENER MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════

  function clearListener(): void {
    if (listenerId !== null) {
      try {
        GM_removeValueChangeListener(listenerId);
      } catch {
        /* noop */
      }
      listenerId = null;
    }
  }

  function closeTab(): void {
    if (googleTab && !googleTab.closed) {
      try {
        googleTab.close();
      } catch {
        /* noop */
      }
    }
    googleTab = null;
  }

  function cleanupFetch(): void {
    closeTab();
    clearListener();
  }

  function clearFetchLock(q: string): void {
    const cache = getCache();
    if (cache[q]?.status === "fetching") {
      delete cache[q];
      setCache(cache);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  RENDERING
  // ═════════════════════════════════════════════════════════════════════

  function loadingHTML(step = "Opening background tab…"): string {
    return `<div class="${ID}-load">
      <div class="${ID}-spin"></div>
      <div class="${ID}-msg">Fetching <b>Google AI Mode</b> response…</div>
      <div class="${ID}-step" id="${ID}-step">${step}</div>
    </div>`;
  }

  function setStep(text: string): void {
    const el = $(`#${ID}-step`);
    if (el) el.textContent = text;
  }

  function getOpenUrl(q: string): string {
    if (lastResultUrl) return lastResultUrl;
    const entry = getCache()[q];
    if (entry?.resultUrl) return entry.resultUrl;
    return googleUrl(q);
  }

  function updateOpenLink(q: string): void {
    const link = document.querySelector(
      `#${ID} a.${ID}-btn[title="Open in tab"]`,
    ) as HTMLAnchorElement | null;
    if (link) link.href = getOpenUrl(q);
  }

  function renderContent(html: string, resultUrl: string | null): void {
    lastHTML = html;
    if (resultUrl) lastResultUrl = resultUrl;
    const body = $(`#${ID}-body`);
    if (!body) return;
    body.innerHTML = `<div class="${ID}-content">${html}</div>`;

    // Render LaTeX via KaTeX (no-ops if KaTeX didn't load)
    const content = body.querySelector(`.${ID}-content`) as HTMLElement | null;
    if (content) renderLatex(content);

    updateOpenLink(activeQuery);
  }

  function renderError(msg: string, q: string): void {
    lastHTML = null;
    lastResultUrl = null;
    const body = $(`#${ID}-body`);
    if (!body) return;
    body.innerHTML = `<div class="${ID}-err">
      ${msg}<br>
      <a class="${ID}-cta" href="${googleUrl(q)}" target="_blank">
        ✨ Open Manually →
      </a>
    </div>`;
  }

  function handleCacheEntry(entry: CacheEntry, q: string): void {
    if (entry.error) {
      renderError(
        entry.error === "error_page"
          ? "⚠️ Google blocked the request (CAPTCHA / sign-in)."
          : entry.error === "no_content"
            ? "⚠️ Google AI content was not detected."
            : `⚠️ Error: ${entry.error}`,
        q,
      );
    } else if (entry.html) {
      renderContent(entry.html, entry.resultUrl);
    } else {
      renderError("⚠️ Empty response received.", q);
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  PANEL CONSTRUCTION
  // ═════════════════════════════════════════════════════════════════════

  function buildPanel(q: string): HTMLDivElement {
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

    // Reload
    panel
      .querySelector('[data-act="reload"]')!
      .addEventListener("click", () => {
        lastHTML = null;
        lastResultUrl = null;
        const cache = getCache();
        if (cache[activeQuery]) {
          delete cache[activeQuery];
          setCache(cache);
        }
        startFetch(activeQuery, true);
      });

    // Copy as Markdown
    panel
      .querySelector('[data-act="copy"]')!
      .addEventListener("click", (e) => {
        const content = panel.querySelector(`.${ID}-content`);
        if (!content) {
          showToast(panel, "Nothing to copy", false);
          return;
        }
        const text = cleanMarkdown(
          htmlToMarkdown(content as HTMLElement),
        );
        const btn = e.currentTarget as HTMLElement;
        writeClipboard(text)
          .then(() => showBtnFeedback(btn, panel, true))
          .catch(() => showBtnFeedback(btn, panel, false));
      });

    return panel;
  }

  function insertPanel(q: string): HTMLDivElement {
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

  // ═════════════════════════════════════════════════════════════════════
  //  FETCH ORCHESTRATION
  // ═════════════════════════════════════════════════════════════════════

  function startFetch(q: string, forceBypass = false): void {
    clearListener();
    const gen = ++fetchGen;
    const fetchStart = Date.now();
    activeQuery = q;

    const body = $(`#${ID}-body`);
    if (!body) return;

    const cache = getCache();

    // ── Another tab already fetching? Wait for it. ────────────────────
    if (!forceBypass) {
      const existing = cache[q];
      if (
        existing?.status === "fetching" &&
        existing.ts &&
        Date.now() - existing.ts < FETCH_LOCK_TTL
      ) {
        console.log("[GAI-Brave] Another tab is fetching, waiting…");
        body.innerHTML = loadingHTML("Another tab is fetching…");

        listenerId = GM_addValueChangeListener(
          CACHE_KEY,
          (_key, _old, newVal) => {
            const updated = (newVal as Cache | null)?.[q];
            if (gen !== fetchGen || !updated) return;
            if (updated.status === "fetching") {
              setStep("Still waiting for other tab…");
              return;
            }
            clearListener();
            handleCacheEntry(updated, q);
          },
        );

        // Safety: if the other tab never finishes, take over
        setTimeout(() => {
          if (gen !== fetchGen || lastHTML) return;
          if ($(`#${ID}-body`)?.querySelector(`.${ID}-load`)) {
            clearListener();
            startFetch(q, true);
          }
        }, FETCH_LOCK_TTL);

        return;
      }
    }

    // ── Acquire fetch lock ────────────────────────────────────────────
    cache[q] = {
      status: "fetching",
      ts: fetchStart,
      html: "",
      error: null,
      resultUrl: null,
    };
    setCache(cache);

    body.innerHTML = loadingHTML("Opening background tab…");
    cleanupFetch();

    // ── Listen for Google-side result ─────────────────────────────────
    listenerId = GM_addValueChangeListener(
      CACHE_KEY,
      (_key, _old, newVal) => {
        const entry = (newVal as Cache | null)?.[activeQuery];
        if (!entry || entry.status === "fetching") return;
        if (!entry.ts || entry.ts < fetchStart) return;
        if (gen !== fetchGen) return;

        clearListener();
        handleCacheEntry(entry, activeQuery);
        closeTab();
      },
    );

    // ── Open background tab ──────────────────────────────────────────
    const url = aiUrl(q);
    try {
      googleTab = GM_openInTab(url, {
        active: false,
        insert: true,
        setParent: true,
      });
      console.log("[GAI-Brave] Background tab opened");
      setStep("Waiting for AI response…");

      if (googleTab.onclose !== undefined) {
        googleTab.onclose = () => {
          if (gen !== fetchGen) return;
          setStep("Processing…");
          setTimeout(() => {
            if (gen !== fetchGen || lastHTML) return;
            const entry = getCache()[activeQuery];
            if (!entry || entry.status === "fetching") {
              clearListener();
              clearFetchLock(activeQuery);
              renderError(
                "⚠️ Background tab closed before completing.",
                activeQuery,
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

    // ── Hard timeout ─────────────────────────────────────────────────
    setTimeout(() => {
      if (gen !== fetchGen || lastHTML) return;
      cleanupFetch();
      clearFetchLock(q);
      if ($(`#${ID}-body`)?.querySelector(`.${ID}-load`)) {
        renderError("⚠️ Timed out waiting for response.", q);
      }
    }, 60_000);
  }

  // ═════════════════════════════════════════════════════════════════════
  //  INJECT / REINJECT
  // ═════════════════════════════════════════════════════════════════════

  function inject(): void {
    const raw = getQ();
    if (!raw || injected || !AI_RE.test(raw)) return;
    const q = stripAIFlag(raw);
    if (!q) return;

    injected = true;
    activeQuery = q;
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

  function reinject(): void {
    const raw = getQ();
    if (!raw || !AI_RE.test(raw)) return;

    console.log("[GAI-Brave] Panel removed by SPA, re-inserting");
    insertPanel(activeQuery);
    if (lastHTML) renderContent(lastHTML, lastResultUrl);
  }

  // ═════════════════════════════════════════════════════════════════════
  //  SIDEBAR POLL (initial detection)
  // ═════════════════════════════════════════════════════════════════════

  function stopSidebarPoll(): void {
    if (activePollTimeout !== null) clearTimeout(activePollTimeout);
    if (activePollTimer !== null) clearInterval(activePollTimer);
    activePollTimeout = null;
    activePollTimer = null;
  }

  function startSidebarPoll(delay: number): void {
    stopSidebarPoll();

    const run = (): void => {
      activePollTimeout = null;
      let ticks = 0;
      activePollTimer = window.setInterval(() => {
        if (++ticks >= 16 || findSidebar()) {
          clearInterval(activePollTimer!);
          activePollTimer = null;
          inject();
        }
      }, 250);
    };

    delay > 0
      ? (activePollTimeout = window.setTimeout(run, delay))
      : run();
  }

  // ═════════════════════════════════════════════════════════════════════
  //  SPA NAVIGATION DETECTION
  // ═════════════════════════════════════════════════════════════════════

  function handleDOMChange(): void {
    const raw = getQ();
    if (!raw) return;

    const hasAI = AI_RE.test(raw);

    // No --ai flag → tear down if active
    if (!hasAI) {
      stopSidebarPoll();
      if (injected) {
        $(`#${ID}`)?.remove();
        injected = false;
        cleanupFetch();
        lastHTML = null;
        lastResultUrl = null;
      }
      activeQuery = normalizeQ(raw);
      return;
    }

    const cleanQ = stripAIFlag(raw);
    if (!cleanQ) return;

    // Query changed OR flag just added → (re)inject
    if (cleanQ !== activeQuery || !injected) {
      console.log("[GAI-Brave] Query changed:", cleanQ);
      activeQuery = cleanQ;
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

    if (injected && !$(`#${ID}`)) reinject();
  }

  function startDOMObserver(): void {
    if (domObserver) return;
    // Prefer the narrowest layout ancestor to reduce mutation noise.
    // `main` covers Brave Search's content column; `#root` is the SPA mount.
    // Only fall back to `document.body` if neither is present.
    const observeTarget =
      document.querySelector("main") ??
      document.querySelector("#root") ??
      document.body;
    let debounce: number | null = null;
    domObserver = new MutationObserver(() => {
      if (debounce !== null) clearTimeout(debounce);
      debounce = window.setTimeout(handleDOMChange, 300);
    });
    domObserver.observe(observeTarget, { childList: true, subtree: true });
  }

  function hookHistory(method: "pushState" | "replaceState"): void {
    const orig = history[method];
    history[method] = function (
      data: unknown,
      unused: string,
      url?: string | URL | null,
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orig.call(this, data, unused as any, url);
      window.setTimeout(handleDOMChange, 100);
    };
  }
  hookHistory("pushState");
  hookHistory("replaceState");
  window.addEventListener("popstate", () =>
    window.setTimeout(handleDOMChange, 100),
  );

  // ═════════════════════════════════════════════════════════════════════
  //  KICK OFF
  // ═════════════════════════════════════════════════════════════════════

  if (AI_RE.test(getQ())) startSidebarPoll(0);
}