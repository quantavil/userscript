# Project: google-ai-brave
Generated on: Fri Apr  3 02:36:20 PM IST 2026

This file contains the full source code and metadata for the google-ai-brave project, aggregated for review or context.


## File: meta.txt

```text
// ==UserScript==
// @name         Google AI Mode for Brave
// @namespace    quantavil
// @version      3.3.2
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
// @grant        GM_getResourceText
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/katex@0.16.43/dist/katex.min.js
// @resource     katexCSS https://cdn.jsdelivr.net/npm/katex@0.16.43/dist/katex.min.css
// @connect      *
// @run-at       document-idle
// ==/UserScript==
```

## File: src/brave.ts

```typescript
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
  SETTINGS_KEY,
  googleUrl,
  aiUrl,
} from "./constants";
import type { Cache, CacheEntry } from "./types";
import {
  normalizeQ,
  parseQuery,
  isAIEnabled,
  getSettings,
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
  // ── Menu commands ─────────────────────────────────────────────────────

  const registerToggle = (): void => {
    const settings = getSettings();
    const label = `Toggle AI by Default (Currently: ${
      settings.aiByDefault ? "ON" : "OFF"
    })`;
    GM_registerMenuCommand(label, () => {
      settings.aiByDefault = !settings.aiByDefault;
      GM_setValue(SETTINGS_KEY, settings);
      location.reload();
    });

    GM_registerMenuCommand(`Set AI Flag (Current: ${settings.aiFlag})`, () => {
      const val = prompt("Enter new AI activation flag:", settings.aiFlag);
      if (val && val.trim()) {
        settings.aiFlag = val.trim();
        GM_setValue(SETTINGS_KEY, settings);
        location.reload();
      }
    });

    GM_registerMenuCommand(
      `Set No-AI Flag (Current: ${settings.noaiFlag})`,
      () => {
        const val = prompt("Enter new No-AI bypass flag:", settings.noaiFlag);
        if (val && val.trim()) {
          settings.noaiFlag = val.trim();
          GM_setValue(SETTINGS_KEY, settings);
          location.reload();
        }
      },
    );
  };
  registerToggle();

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
    if (!raw || injected) return;

    const { enabled, clean: q } = parseQuery(raw);
    if (!enabled || !q) return;

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
    if (!raw || !isAIEnabled(raw)) return;

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

    const { enabled, clean: cleanQ } = parseQuery(raw);

    // No AI trigger → tear down if active
    if (!enabled) {
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
      startSidebarPoll(100);
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
    const observeTarget =
      document.querySelector("main") ??
      document.querySelector("#root") ??
      document.body;
    let debounce: number | null = null;
    domObserver = new MutationObserver((mutations) => {
      // Skip mutations caused by our own panel insertion/removal
      const selfOnly = mutations.every((m) => {
        for (const n of [...m.addedNodes, ...m.removedNodes]) {
          if (n instanceof HTMLElement && (n.id === ID || n.closest?.(`#${ID}`)))
            continue;
          return false;
        }
        return true;
      });
      if (selfOnly && mutations.length > 0) return;

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

  if (isAIEnabled(getQ())) startSidebarPoll(0);
}
```

## File: src/constants.ts

```typescript
// ── Origins & storage keys ──────────────────────────────────────────────

export const GOOGLE_ORIGIN = "https://www.google.com";
export const CACHE_KEY = "gai_cache";

// ── Tuning ──────────────────────────────────────────────────────────────

/** How long a "fetching" lock is considered valid (ms). */
export const FETCH_LOCK_TTL = 62_000;

/** How long a cached result is considered fresh (ms). */
export const CACHE_TTL = 900_000;

/** Maximum number of entries kept in the cross-tab cache. */
export const MAX_CACHE_ENTRIES = 10;

/** CSS id / class prefix used for the Brave-side sidebar panel. */
export const PANEL_ID = "gai";

// ── URL builders ────────────────────────────────────────────────────────

export const googleSearchUrl = (q: string): string =>
  `${GOOGLE_ORIGIN}/search?q=${encodeURIComponent(q)}`;

export const googleUrl = (q: string): string =>
  `${googleSearchUrl(q)}&udm=50`;

export const aiUrl = (q: string): string => `${googleUrl(q)}#gai`;

// ── Regex ───────────────────────────────────────────────────────────────

export const SETTINGS_KEY = "gai_settings";

// ── Selector lists ─────────────────────────────────────────────────────

/** AI Mode content containers (tried in order). */
export const CONTENT_SELS: readonly string[] = [
  '[data-container-id="main-col"]',
  ".pWvJNd",
];

/** Elements whose presence signals a complete AI response. */
export const COMPLETE_SELS: readonly string[] = [
  'button[aria-label="Copy text"]',
  'button[aria-label="Good response"]',
  'button[aria-label="Bad response"]',
  ".bKxaof",
  ".ya9Iof",
];

/** Elements whose presence signals an error page (CAPTCHA / sign-in). */
export const ERROR_SELS: readonly string[] = [
  "#captcha-form",
  'form[action*="signin"]',
  '#infoDiv[class*="captcha"]',
  "#consent-bump",
  "#recaptcha",
];

/** Elements removed from the cloned content DOM during extraction. */
export const STRIP_SELS: readonly string[] = [
  // Standard web noise
  "script", "noscript", "style", "link", "iframe", "header", "footer",
  "#gb", "#fbar", "#searchform", "#top_nav", '[role="navigation"]',
  // Media & interactive
  "svg",
  // AI Mode: feedback / tracking
  ".JuoeAb", "[data-crb-el]",
  // AI Mode: UI chrome
  ".VlQBpc", ".zkL70c", ".DwkS",
  ".IBZVef",   // show more / less toggle
  ".Fsg96",    // spacer divs
  ".alk4p",    // loading animation
  ".kwdzO",    // timestamp
  ".sNRHic",   // bottom spacer
  // Source / citation panels
  ".ofHStc", ".jKhXsc", ".SGF5Lb",
  ".wDa0n", ".hpw4G", ".qacuz",
  // Toolbar rows (copy / edit bar)
  ".ilZyRc", ".UYpEO", ".dcCF7d",
];

/** Attributes preserved during the attribute-strip pass. */
export const KEEP_ATTRS: ReadonlySet<string> = new Set([
  "colspan",
  "rowspan",
  "href",
  "src",
  "srcset",
  "alt",
  "aria-label",
  "target",
  "rel",
  "width",
  "height",
]);

/** Tags considered inline (used to detect mis-nested block-in-inline). */
export const INLINE_TAGS: ReadonlySet<string> = new Set([
  "strong", "b", "em", "i", "a", "span",
]);

/** Brave Search sidebar container selectors (tried in order). */
export const SIDEBAR_SELS: readonly string[] = [
  "aside.sidebar > .sidebar-content",
  "aside.side > .sidebar-content",
  "aside.sidebar",
  "aside.side",
];
```

## File: src/gm.d.ts

```typescript
/**
 * Ambient declarations for Tampermonkey APIs, KaTeX (loaded via @require),
 * and third-party modules without bundled types.
 */

// ── Tampermonkey ────────────────────────────────────────────────────────

declare function GM_addStyle(css: string): HTMLStyleElement;

declare function GM_setValue(key: string, value: unknown): void;
declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;

declare function GM_getResourceText(name: string): string;
declare function GM_registerMenuCommand(
  name: string,
  fn: () => void,
  accessKey?: string,
): number;

declare function GM_addValueChangeListener(
  key: string,
  callback: (
    key: string,
    oldValue: unknown,
    newValue: unknown,
    remote: boolean,
  ) => void,
): number;

declare function GM_removeValueChangeListener(listenerId: number): void;

interface GMTab {
  close(): void;
  closed: boolean;
  onclose: (() => void) | null;
}

declare function GM_openInTab(
  url: string,
  options?: { active?: boolean; insert?: boolean; setParent?: boolean },
): GMTab;

// ── KaTeX (loaded via @require from CDN) ────────────────────────────────

declare namespace katex {
  interface KatexOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    output?: "html" | "mathml" | "htmlAndMathml";
  }
  function render(
    latex: string,
    element: HTMLElement,
    options?: KatexOptions,
  ): void;
  function renderToString(latex: string, options?: KatexOptions): string;
}

// ── turndown-plugin-gfm (no @types package) ─────────────────────────────

declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export function gfm(service: TurndownService): void;
  export function tables(service: TurndownService): void;
  export function strikethrough(service: TurndownService): void;
  export function taskListItems(service: TurndownService): void;
}
```

## File: src/google.ts

```typescript
/**
 * Google-side logic — runs on www.google.com/search?udm=50#gai
 *
 * Waits for the AI Mode response to finish streaming, extracts and cleans
 * the HTML, then writes it into the cross-tab GM cache so the Brave-side
 * can pick it up.
 */

import {
  CONTENT_SELS,
  COMPLETE_SELS,
  ERROR_SELS,
  GOOGLE_ORIGIN,
  STRIP_SELS,
  KEEP_ATTRS,
  INLINE_TAGS,
  googleSearchUrl,
} from "./constants";
import { normalizeQ, getCache, setCache, findBySelectors } from "./utils";

// ── Completion detection constants ──────────────────────────────────────

/** Polling interval for content length stability check (ms). */
const POLL_MS = 500;

/** Number of stable-length ticks required when completion selectors exist. */
const STABLE_WITH_SIGNAL = 1;

/** Fallback: number of stable-length ticks before we send anyway. */
const STABLE_FALLBACK = 10;

/** Hard timeout — send whatever we have (ms). */
const HARD_TIMEOUT = 60_000;

// ── Entry point ─────────────────────────────────────────────────────────

export function googleSide(): void {
  const params = new URLSearchParams(location.search);
  if (params.get("udm") !== "50") return;
  if (!location.hash.includes("gai")) return;

  const rawQ = params.get("q") ?? "";
  const normQ = normalizeQ(rawQ);

  // Strip the #gai fragment so the page looks normal
  history.replaceState(null, "", location.href.replace(/#gai.*/, ""));
  console.log("[GAI] Google-side activated");

  let sent = false;
  let lastLen = -1;
  let stableCount = 0;
  const startTime = Date.now();

  // ── Helpers ─────────────────────────────────────────────────────────

  const hasCompletionSignal = (): boolean =>
    COMPLETE_SELS.some((s) => document.querySelector(s) !== null);

  const isErrorPage = (): boolean => {
    if (ERROR_SELS.some((s) => document.querySelector(s) !== null)) return true;
    const t = document.title.toLowerCase();
    return t.includes("unusual traffic") || t.includes("captcha");
  };

  function send(error: string | null = null): void {
    if (sent) return;
    sent = true;
    clearInterval(pollTimer);

    const html = error ? "" : extractContent();
    const finalError = error || (html ? null : "no_content");
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[GAI] Sending ${html.length} chars for "${normQ}" (${elapsed}s)` +
        (finalError ? ` [error: ${finalError}]` : ""),
    );

    const cache = getCache();
    cache[normQ] = {
      html,
      ts: Date.now(),
      error: finalError,
      status: finalError ? "error" : "done",
      resultUrl: finalError ? null : location.href,
    };

    setCache(cache);
  }

  // ── Polling loop ────────────────────────────────────────────────────

  const pollTimer = setInterval(() => {
    if (sent) return;

    if (isErrorPage()) {
      send("error_page");
      return;
    }

    const el = findBySelectors(CONTENT_SELS, true);
    if (!el) {
      lastLen = -1;
      stableCount = 0;
      return;
    }

    const len = el.textContent?.length ?? 0;
    if (len > 0 && len === lastLen) {
      stableCount++;
      if (hasCompletionSignal() && stableCount >= STABLE_WITH_SIGNAL) {
        send();
        return;
      }
      if (stableCount >= STABLE_FALLBACK) {
        send();
        return;
      }
    } else {
      lastLen = len;
      stableCount = 0;
    }
  }, POLL_MS);

  // Hard timeout safety net
  setTimeout(() => {
    if (!sent) send();
  }, HARD_TIMEOUT);
}

// ── Content extraction ──────────────────────────────────────────────────

function extractContent(): string {
  const params = new URLSearchParams(location.search);
  const container = findBySelectors(CONTENT_SELS);
  if (!container) return "";
  const clone = container.cloneNode(true) as HTMLElement;

  // 0.  LaTeX: convert data-xpm-latex attrs to $…$ / $$…$$ text nodes
  //     before anything else is stripped.
  clone.querySelectorAll("[data-xpm-latex]").forEach((el) => {
    const latex = el.getAttribute("data-xpm-latex");
    if (!latex) return;

    const isInline = (el.getAttribute("style") ?? "").includes("inline");
    const wrap = isInline ? "$" : "$$";

    // data-xpm-copy-root marks the top-level math container
    if (el.hasAttribute("data-xpm-copy-root")) {
      el.textContent = `${wrap}${latex}${wrap}`;
    } else if (!el.closest("[data-xpm-copy-root]")) {
      // Standalone math fragment
      el.textContent = `${wrap}${latex}${wrap}`;
    }
  });

  // 1b. Replace citation badges with clickable Google Search links
  clone.querySelectorAll("button.rBl3me").forEach((btn) => {
    const label = btn.getAttribute("aria-label") ?? "";
    const text = label
      .replace(/\s+[–—-]\s+View related links.*$/i, "")
      .trim();

    if (!text || /^view related links$/i.test(text)) {
      btn.remove();
      return;
    }

    // Build a contextual Google Search query like:
    // "<original query> Reddit"
    const source = text
      .replace(/\s*(?:\(\+\d+\)|\+\d+)\s*$/i, "")
      .trim();

    const query = [params.get("q") ?? "", source].filter(Boolean).join(" ");

    const a = document.createElement("a");
    a.textContent = `[${text}]`;
    a.setAttribute("href", googleSearchUrl(query));
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");

    btn.replaceWith(a);
  });

  // 1.  Strip unwanted elements
  for (const sel of STRIP_SELS) {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // 2.  Remove display:none elements
  clone.querySelectorAll("*").forEach((el) => {
    const style = (el.getAttribute("style") ?? "")
      .replace(/\s/g, "")
      .toLowerCase();
    if (style.includes("display:none")) el.remove();
  });

  // 2b. Strip any remaining buttons (already handled 1b, but just in case)
  clone.querySelectorAll("button").forEach((btn) => btn.remove());

  // 3.  role="heading" → semantic <hN>
  clone.querySelectorAll('[role="heading"]').forEach((el) => {
    const rawLevel = Number.parseInt(el.getAttribute("aria-level") ?? "3", 10);
    const level = Number.isFinite(rawLevel)
      ? Math.min(6, Math.max(1, rawLevel))
      : 3;
    const h = document.createElement(`h${level}`);
    h.innerHTML = el.innerHTML;
    el.replaceWith(h);
  });

  // 4.  Unwrap <strong>/<b> inside headings (avoids ### **text** in MD)
  for (let i = 1; i <= 6; i++) {
    clone
      .querySelectorAll(`h${i} strong, h${i} b`)
      .forEach((s) => s.replaceWith(...Array.from(s.childNodes)));
  }

  // 5.  Unwrap block elements mis-nested inside inline parents
  clone.querySelectorAll("div, p, section").forEach((block) => {
    const parent = block.parentElement;
    if (parent && INLINE_TAGS.has(parent.tagName.toLowerCase())) {
      block.replaceWith(...Array.from(block.childNodes));
    }
  });

  // 6.  Remove empty <a> tags (left over from citation stripping)
  clone.querySelectorAll("a").forEach((a) => {
    if (!a.textContent?.trim() && !a.querySelector("img")) a.remove();
  });

  // 6b. Remove duplicate a.NoAaxc anchors that carry no image
  //     (Google repeats these 3× per entity; only the img-wrapper is useful)
  clone.querySelectorAll("a.NoAaxc").forEach((a) => {
    if (!a.querySelector("img")) a.remove();
  });

  // 7. Relative → absolute URLs (must run before attr stripping)
  clone.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    try {
      a.setAttribute("href", new URL(href, GOOGLE_ORIGIN).toString());
    } catch {
      a.removeAttribute("href");
    }
  });

  clone.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    try {
      img.setAttribute("src", new URL(src, GOOGLE_ORIGIN).toString());
    } catch {
      img.remove();
    }
  });

  clone.querySelectorAll("img[srcset], source[srcset]").forEach((el) => {
    const srcset = el.getAttribute("srcset");
    if (!srcset) return;

    const normalized = srcset
      .split(",")
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed) return "";

        const m = trimmed.match(/^(\S+)(?:\s+(.+))?$/);
        if (!m) return "";

        const [, url, descriptor] = m;
        try {
          const abs = new URL(url, GOOGLE_ORIGIN).toString();
          return descriptor ? `${abs} ${descriptor}` : abs;
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join(", ");

    if (normalized) el.setAttribute("srcset", normalized);
    else el.removeAttribute("srcset");
  });

  // 8.  Strip all attributes except the ones in KEEP_ATTRS
  for (const el of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
    for (const attr of [...el.attributes]) {
      if (!KEEP_ATTRS.has(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // 9.  Normalise whitespace text nodes (collapse newlines → space)
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  for (const tn of textNodes) {
    if (!tn.parentElement?.closest("pre, code")) {
      tn.data = tn.data.replace(/[ \t]*\n[ \t]*/g, " ");
    }
  }

  // 10. Cascade-remove empty leaf elements
  let changed: boolean;
  do {
    changed = false;
    clone.querySelectorAll("*").forEach((el) => {
      // Exclude void/content-bearing elements from recursive stripping
      const tag = el.tagName.toLowerCase();
      if (tag === "img" || tag === "br" || tag === "hr" || tag === "source") return;

      if (!el.textContent?.trim() && el.children.length === 0) {
        el.remove();
        changed = true;
      }
    });
  } while (changed);

  return clone.innerHTML.trim() || clone.textContent?.trim() || "";
}
```

## File: src/icons.ts

```typescript
/** SVG icon strings used in the Brave-side toolbar. */
export const ICONS = {
  google: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`,

  copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,

  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34A853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,

  fail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA4335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  reload: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 2.81-6.57L21 8"/></svg>`,

  open: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
} as const;
```

## File: src/index.ts

```typescript
/**
 * Entry point — routes to the correct side based on the current hostname.
 * esbuild bundles everything into a single IIFE; the userscript header
 * is prepended from meta.txt via the `banner` option.
 */

import { googleSide } from "./google";
import { braveSide } from "./brave";

const host = location.hostname;

if (host === "search.brave.com") {
  braveSide();
} else if (host === "www.google.com") {
  googleSide();
}
```

## File: src/katex-render.ts

```typescript
/**
 * KaTeX rendering for the Brave-side panel.
 *
 * Walks text nodes inside the content container, finds $…$ (inline) and
 * $$…$$ (display) delimiters, and replaces them with KaTeX-rendered HTML.
 *
 * Each rendered wrapper gets a `data-latex` attribute holding the original
 * delimited string so Turndown can recover it when copying as Markdown.
 *
 * Gracefully no-ops when KaTeX fails to load from the CDN.
 */

const KATEX_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.43/dist";

/**
 * Matches $$…$$ (display, group 1) first, then $…$ (inline, group 2).
 * Inline allows escaped dollars (\$) but forbids unescaped $ and newlines.
 */
const LATEX_RE = /\$\$(.+?)\$\$|\$(?!\$)((?:\\.|[^$\n])+?)\$/g;

let cssInjected = false;

/** Load KaTeX CSS from the @resource, rewriting relative font paths. */
function injectKatexCSS(): void {
    if (cssInjected) return;
    cssInjected = true;
    try {
        let css = GM_getResourceText("katexCSS");
        css = css.replace(
            /url\((?:['"]?)fonts\//g,
            `url(${KATEX_CDN}/fonts/`,
        );
        GM_addStyle(css);
    } catch (e) {
        console.warn("[GAI] Failed to load KaTeX CSS:", e);
    }
}

/**
 * Render all LaTeX strings inside `container` using KaTeX.
 * Safe to call unconditionally — returns immediately if KaTeX isn't loaded.
 */
export function renderLatex(container: HTMLElement): void {
    if (typeof katex === "undefined") return;
    injectKatexCSS();

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);

    for (const tn of nodes) {
        if (tn.parentElement?.closest("pre, code")) continue;

        const text = tn.data;
        LATEX_RE.lastIndex = 0;
        if (!LATEX_RE.test(text)) continue;
        LATEX_RE.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match: RegExpExecArray | null;

        while ((match = LATEX_RE.exec(text)) !== null) {
            // Text before this match
            if (match.index > lastIdx) {
                frag.appendChild(
                    document.createTextNode(text.slice(lastIdx, match.index)),
                );
            }

            const isDisplay = match[1] !== undefined;
            const latex = (isDisplay ? match[1] : match[2]).trim();
            const original = match[0]; // full "$…$" or "$$…$$"

            const wrapper = document.createElement(isDisplay ? "div" : "span");
            wrapper.setAttribute("data-latex", original);

            try {
                katex.render(latex, wrapper, {
                    displayMode: isDisplay,
                    throwOnError: false,
                });
            } catch {
                // Fallback: show the raw delimited string
                wrapper.textContent = original;
            }

            frag.appendChild(wrapper);
            lastIdx = match.index + match[0].length;
        }

        // Remaining text after last match
        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        tn.replaceWith(frag);
    }
}
```

## File: src/markdown.ts

```typescript
/**
 * HTML → Markdown conversion using Turndown + GFM tables.
 *
 * Replaces the hand-written recursive walker from the original script.
 * Custom rules preserve non-standard behaviours documented in context.md.
 */

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// ── Configure ───────────────────────────────────────────────────────────

const td = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  hr: "---",
});

td.use(gfm); // tables, strikethrough, task lists

// ── Custom rules ────────────────────────────────────────────────────────

// <mark> → ==highlight== (Obsidian / extended-MD syntax)
td.addRule("mark", {
  filter: "mark",
  replacement(content) {
    const text = content.trim();
    return text ? `==${text}==` : "";
  },
});

// KaTeX-rendered elements → original $…$ / $$…$$ string (round-trip copy)
td.addRule("katex", {
  filter(node) {
    return node instanceof HTMLElement && node.hasAttribute("data-latex");
  },
  replacement(_content, node) {
    return (node as HTMLElement).getAttribute("data-latex") ?? "";
  },
});

// Drop empty links (left over after citation stripping)
td.addRule("emptyLink", {
  filter(node) {
    return node.nodeName === "A" && !node.textContent?.trim();
  },
  replacement() {
    return "";
  },
});

// ── Public API ──────────────────────────────────────────────────────────

/** Convert an HTML element's content to Markdown. */
export function htmlToMarkdown(element: HTMLElement): string {
  return td.turndown(element);
}

/**
 * Post-processing cleanup on raw Markdown output:
 * - Collapse whitespace before punctuation inside **bold** markers.
 * - Collapse excessive blank lines.
 * - Trim trailing whitespace per line.
 */
export function cleanMarkdown(raw: string): string {
  return raw
    .replace(/\*\*([^*]+)\*\*/g, (_, inner: string) => {
      const cleaned = inner.trim().replace(/\s+(?=[:;,.!?])/g, "");
      return cleaned ? `**${cleaned}**` : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
```

## File: src/styles.ts

```typescript
import { PANEL_ID as ID } from "./constants";

/** CSS injected via GM_addStyle on the Brave side. */
export const PANEL_CSS = `
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
  .${ID}-spin{width:22px;height:22px;border:2.5px solid rgba(255,255,255,.06);border-top-color:#6366f1;border-radius:50%;animation:${ID}-spin-anim .65s linear infinite}
  @keyframes ${ID}-spin-anim{to{transform:rotate(360deg)}}

  .${ID}-msg{font-size:12px;color:#707078;line-height:1.5}
  .${ID}-msg b{color:#a5a8ff}
  .${ID}-step{font-size:11px;color:#505058;margin-top:2px}

  .${ID}-err{padding:20px 14px;text-align:center;font-size:12px;color:#808088;line-height:1.5}
  .${ID}-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;margin-top:10px;border-radius:7px;background:#6366f1;color:#fff;font-size:13px;font-weight:600;text-decoration:none}
  .${ID}-cta:hover{opacity:.85}

  /* KaTeX overflow guard */
  .${ID}-content [data-latex]{overflow-x:auto;overflow-y:hidden}
  .${ID}-content div[data-latex]{text-align:center;margin:1em 0}
`;
```

## File: src/types.ts

```typescript
/** A single cross-tab cache entry stored via GM_setValue / GM_getValue. */
export interface CacheEntry {
  html: string;
  ts: number;
  error: string | null;
  status: "fetching" | "done" | "error";
  resultUrl: string | null;
}

/** The full cache object — keys are normalised queries. */
export type Cache = Record<string, CacheEntry>;
```

## File: src/utils.ts

```typescript
import { CACHE_KEY, CACHE_TTL, SETTINGS_KEY, MAX_CACHE_ENTRIES } from "./constants";
import type { Cache } from "./types";

// ── Query normalisation ─────────────────────────────────────────────────

/** Lowercase, collapse whitespace, trim. */
export const normalizeQ = (q: string): string =>
  q.trim().toLowerCase().replace(/\s+/g, " ");

// ── Settings ────────────────────────────────────────────────────────────

export interface Settings {
  aiByDefault: boolean;
  aiFlag: string;
  noaiFlag: string;
}

export function getSettings(): Settings {
  return GM_getValue(SETTINGS_KEY, {
    aiByDefault: false,
    aiFlag: "--ai",
    noaiFlag: "--noai",
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Combined query parser (single settings read) ───────────────────────

export interface ParsedQuery {
  enabled: boolean;
  clean: string;
}

/**
 * Parse a raw query string: determine if AI is enabled and produce the
 * cleaned query (flags stripped). Reads settings exactly once.
 */
export function parseQuery(q: string): ParsedQuery {
  const settings = getSettings();
  const ai = escapeRegex(settings.aiFlag);
  const noai = escapeRegex(settings.noaiFlag);

  const hasAI = new RegExp(`(?:^|\\s)${ai}(?=\\s|$)`).test(q);
  const hasNoAI = new RegExp(`(?:^|\\s)${noai}(?=\\s|$)`).test(q);
  const enabled = settings.aiByDefault ? !hasNoAI : hasAI;

  const re = new RegExp(`(?:^|\\s)(?:${ai}|${noai})(?=\\s|$)`, "g");
  const clean = normalizeQ(q.replace(re, " "));

  return { enabled, clean };
}

/** Determine if AI should be triggered (delegates to parseQuery). */
export function isAIEnabled(q: string): boolean {
  return parseQuery(q).enabled;
}

/** Strip both --ai and --noai flags and re-normalise (delegates to parseQuery). */
export function stripFlags(q: string): string {
  return parseQuery(q).clean;
}

// ── GM cache helpers ────────────────────────────────────────────────────

export function getCache(): Cache {
  try {
    const raw = GM_getValue(CACHE_KEY, null);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Cache;
    }
  } catch { /* ignore corrupt / missing */ }
  return {};
}

export function setCache(obj: Cache): void {
  try {
    const now = Date.now();

    // 1. Evict expired entries (beyond CACHE_TTL) — skip active fetches
    for (const k of Object.keys(obj)) {
      const e = obj[k];
      if (e.status !== "fetching" && now - (e.ts ?? 0) > CACHE_TTL) {
        delete obj[k];
      }
    }

    // 2. FIFO eviction if still over the cap
    const keys = Object.keys(obj);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const sorted = keys.sort((a, b) => (obj[a].ts ?? 0) - (obj[b].ts ?? 0));
      const toRemove = sorted.slice(0, keys.length - MAX_CACHE_ENTRIES);
      for (const k of toRemove) delete obj[k];
    }

    GM_setValue(CACHE_KEY, obj);
  } catch { /* best-effort */ }
}

// ── DOM helpers ─────────────────────────────────────────────────────────

/**
 * Return the first element matched by any selector in `sels`.
 * Optionally require the element to contain non-empty text.
 */
export function findBySelectors(
  sels: readonly string[],
  requireText = false,
): Element | null {
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (el && (!requireText || el.textContent?.trim())) return el;
  }
  return null;
}

// ── Clipboard ───────────────────────────────────────────────────────────

/**
 * Write text to the system clipboard.
 * Falls back to `document.execCommand("copy")` when the async Clipboard API
 * is unavailable (sandboxed iframes, older browsers, some extensions).
 */
export function writeClipboard(text: string): Promise<void> {
  const fallback = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        const ok = document.execCommand("copy");
        ta.remove();
        ok ? resolve() : reject(new Error("execCommand returned false"));
      } catch (e) {
        ta.remove();
        reject(e);
      }
    });

  return navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(text).catch(fallback)
    : fallback();
}
```
